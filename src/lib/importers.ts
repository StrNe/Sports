import type { AppData, Run, RunType } from '../types'
import { toISO, uid } from './format'
import { inClaude, useCapability } from './claude'

export interface ImportResult {
  runs: Run[]
  skipped: string[]
}

function guessRunType(distanceKm: number, durationSec: number, sport?: string, subSport?: string): RunType {
  if (subSport === 'treadmill' || subSport === 'indoorRunning') return 'tapis'
  if (subSport === 'trail' || sport === 'trailRunning') return 'trail'
  if (durationSec >= 75 * 60 || distanceKm >= 15) return 'sortie_longue'
  return 'ef'
}

// ── FIT (montres COROS, Garmin, Suunto, Polar…) ────────────
async function parseFit(file: File): Promise<Run | string> {
  const { Decoder, Stream } = await import('@garmin/fitsdk')
  const buf = await file.arrayBuffer()
  const stream = Stream.fromArrayBuffer(buf)
  if (!Decoder.isFIT(stream)) return `${file.name} : fichier FIT invalide`
  const decoder = new Decoder(stream)
  const { messages } = decoder.read({ convertDateTimesToDates: true })
  const s = messages.sessionMesgs?.[0]
  if (!s) return `${file.name} : aucune session trouvée`
  const sport = String(s.sport ?? '')
  const subSport = String(s.subSport ?? '')
  if (!/run|walk|hik/i.test(sport)) return `${file.name} : activité « ${sport || 'inconnue'} » ignorée (seule la course est importée)`
  const start = s.startTime instanceof Date ? s.startTime : new Date()
  const distanceKm = Math.round(((Number(s.totalDistance) || 0) / 1000) * 100) / 100
  const durationSec = Math.round(Number(s.totalTimerTime ?? s.totalElapsedTime) || 0)
  if (!durationSec) return `${file.name} : durée nulle`
  const cad = Number((s as Record<string, unknown>).avgRunningCadence ?? s.avgCadence)
  return {
    id: uid(),
    date: toISO(start),
    type: guessRunType(distanceKm, durationSec, sport, subSport),
    title: file.name.replace(/\.fit$/i, ''),
    distanceKm,
    durationSec,
    avgHr: Number(s.avgHeartRate) || undefined,
    maxHr: Number(s.maxHeartRate) || undefined,
    elevationM: Number(s.totalAscent) || undefined,
    cadence: cad ? Math.round(cad * 2) : undefined,
    calories: Number(s.totalCalories) || undefined,
    source: 'fit',
    externalId: `fit-${start.getTime()}`,
  }
}

// ── GPX / TCX ───────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

async function parseGpx(file: File): Promise<Run | string> {
  const xml = new DOMParser().parseFromString(await file.text(), 'application/xml')
  const pts = [...xml.getElementsByTagName('trkpt')]
  if (pts.length < 2) return `${file.name} : trace GPX vide`
  let dist = 0
  let gain = 0
  const hrs: number[] = []
  let prev: { lat: number; lon: number; ele?: number } | undefined
  for (const p of pts) {
    const lat = Number(p.getAttribute('lat'))
    const lon = Number(p.getAttribute('lon'))
    const eleTxt = p.getElementsByTagName('ele')[0]?.textContent
    const ele = eleTxt != null ? Number(eleTxt) : undefined
    const hrEl = [...p.getElementsByTagName('*')].find((e) => e.localName === 'hr')
    if (hrEl?.textContent) hrs.push(Number(hrEl.textContent))
    if (prev) {
      dist += haversine(prev.lat, prev.lon, lat, lon)
      if (ele != null && prev.ele != null && ele > prev.ele) gain += ele - prev.ele
    }
    prev = { lat, lon, ele }
  }
  const t0 = pts[0].getElementsByTagName('time')[0]?.textContent
  const t1 = pts[pts.length - 1].getElementsByTagName('time')[0]?.textContent
  if (!t0 || !t1) return `${file.name} : pas d’horodatage dans la trace`
  const start = new Date(t0)
  const durationSec = Math.round((new Date(t1).getTime() - start.getTime()) / 1000)
  const distanceKm = Math.round((dist / 1000) * 100) / 100
  const name = xml.getElementsByTagName('name')[0]?.textContent?.trim()
  return {
    id: uid(),
    date: toISO(start),
    type: guessRunType(distanceKm, durationSec),
    title: name || file.name.replace(/\.gpx$/i, ''),
    distanceKm,
    durationSec,
    avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : undefined,
    maxHr: hrs.length ? Math.max(...hrs) : undefined,
    elevationM: Math.round(gain) || undefined,
    source: 'gpx',
    externalId: `gpx-${start.getTime()}`,
  }
}

async function parseTcx(file: File): Promise<Run | string> {
  const xml = new DOMParser().parseFromString(await file.text(), 'application/xml')
  const act = xml.getElementsByTagName('Activity')[0]
  if (!act) return `${file.name} : aucune activité TCX`
  const sport = act.getAttribute('Sport') ?? ''
  if (sport && !/run/i.test(sport)) return `${file.name} : activité « ${sport} » ignorée`
  const laps = [...act.getElementsByTagName('Lap')]
  let dist = 0
  let time = 0
  let hrWeighted = 0
  let maxHr = 0
  for (const lap of laps) {
    const t = Number(lap.getElementsByTagName('TotalTimeSeconds')[0]?.textContent ?? 0)
    time += t
    dist += Number(lap.getElementsByTagName('DistanceMeters')[0]?.textContent ?? 0)
    const avg = Number(lap.getElementsByTagName('AverageHeartRateBpm')[0]?.getElementsByTagName('Value')[0]?.textContent ?? 0)
    hrWeighted += avg * t
    maxHr = Math.max(maxHr, Number(lap.getElementsByTagName('MaximumHeartRateBpm')[0]?.getElementsByTagName('Value')[0]?.textContent ?? 0))
  }
  const id = act.getElementsByTagName('Id')[0]?.textContent
  const start = id ? new Date(id) : new Date()
  const distanceKm = Math.round((dist / 1000) * 100) / 100
  const durationSec = Math.round(time)
  return {
    id: uid(),
    date: toISO(start),
    type: guessRunType(distanceKm, durationSec),
    title: file.name.replace(/\.tcx$/i, ''),
    distanceKm,
    durationSec,
    avgHr: hrWeighted && time ? Math.round(hrWeighted / time) : undefined,
    maxHr: maxHr || undefined,
    source: 'tcx',
    externalId: `tcx-${start.getTime()}`,
  }
}

export async function importActivityFiles(files: FileList | File[]): Promise<ImportResult> {
  const runs: Run[] = []
  const skipped: string[] = []
  for (const file of Array.from(files)) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const res = ext === 'fit' ? await parseFit(file) : ext === 'gpx' ? await parseGpx(file) : ext === 'tcx' ? await parseTcx(file) : `${file.name} : format non pris en charge`
      if (typeof res === 'string') skipped.push(res)
      else runs.push(res)
    } catch (e) {
      skipped.push(`${file.name} : ${(e as Error).message}`)
    }
  }
  return { runs, skipped }
}

// ── Sauvegarde JSON ─────────────────────────────────────────
export async function downloadJson(data: unknown, filename: string): Promise<'ok' | 'declined' | 'error'> {
  return downloadText(JSON.stringify(data, null, 2), filename, 'application/json')
}

export async function downloadText(json: string, filename: string, type = 'text/plain'): Promise<'ok' | 'declined' | 'error'> {
  if (inClaude()) {
    // Dans claude.ai, les liens de téléchargement sont bloqués : on passe par la fonction dédiée
    const downloads = await useCapability('downloads')
    if (!downloads) return 'error'
    try {
      await downloads.save({ filename, data: json })
      return 'ok'
    } catch (e) {
      return (e as { code?: string }).code === 'declined' ? 'declined' : 'error'
    }
  }
  const blob = new Blob([json], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'ok'
}

export async function readBackup(file: File): Promise<Partial<AppData>> {
  const json = JSON.parse(await file.text())
  if (!json || typeof json !== 'object') throw new Error('Fichier de sauvegarde invalide')
  return json as Partial<AppData>
}
