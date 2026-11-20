// Synchronisation avec COROS via le connecteur claude.ai (capacité `mcp` des artifacts).
// Les outils COROS répondent en texte formaté : on le convertit en données Foulée.

import type { AppData, ISODate, PlannedWorkout, Profile, RenfoSession, Run, RunType, SleepEntry } from '../types'
import { addDaysISO, daysBetween, parseDuration, todayISO } from './format'

export const COROS_SERVER = 'COROS'
export const COROS_TOOLS = ['querySportRecords', 'querySleepOverview', 'queryRestingHeartRate', 'queryTrainingSchedule', 'queryUserInfo', 'queryFitnessAssessmentOverview'] as const
export type CorosTool = (typeof COROS_TOOLS)[number]

const RUN_SPORTS = new Set([100, 101, 102, 103])
const STRENGTH_SPORTS = new Set([402, 9901, 1200])

// ── Lecture des textes COROS ────────────────────────────────
/** "9h 51min", "52 min", "2h 0min" → minutes */
export function parseHm(s?: string): number | undefined {
  if (!s) return undefined
  const m = s.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?/)
  if (!m || (!m[1] && !m[2])) return undefined
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)
}

export interface CorosActivity {
  date: ISODate
  sport: string
  title?: string
  durationSec: number
  distanceKm?: number
  avgHr?: number
  calories?: number
  labelId: string
  sportType: number
}

export function parseSportRecords(text: string): { total: number; items: CorosActivity[] } {
  const total = Number(text.match(/\((\d+) records?\)/)?.[1] ?? 0)
  const items: CorosActivity[] = []
  for (const block of text.split(/\n(?=\d+\.\s)/)) {
    const head = block.match(/^\d+\.\s+(.+?)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/m)
    const labelId = block.match(/LabelId:\s*(\d+)/)?.[1]
    const sportType = Number(block.match(/SportType:\s*(\d+)/)?.[1])
    if (!head || !labelId || !sportType) continue
    const dist = block.match(/Distance:\s*([\d.,]+)\s*(km|m)\b/)
    const distanceKm = dist ? Number(dist[1].replace(',', '.')) / (dist[2] === 'm' ? 1000 : 1) : undefined
    items.push({
      date: head[2],
      sport: head[1],
      title: block.match(/Location:\s*(.+)/)?.[1]?.trim(),
      durationSec: parseDuration(block.match(/Duration:\s*([\d:]+)/)?.[1] ?? '') ?? 0,
      distanceKm,
      avgHr: Number(block.match(/Avg HR:\s*(\d+)/)?.[1]) || undefined,
      calories: Number(block.match(/Calories:\s*(\d+)/)?.[1]) || undefined,
      labelId,
      sportType,
    })
  }
  return { total, items }
}

/** Nettoie le nom donné par la montre ("21KM-S6-3-Allure 21" → "Allure 21", "Toulouse Course" → aucun) */
export function cleanTitle(raw?: string): string | undefined {
  if (!raw) return undefined
  let t = raw.trim().replace(/^[A-Z0-9]+-S\d+(?:\.\d+)?-\d+-/, '')
  if (/^tapis\/salle$/i.test(t)) return undefined
  if (/^[\p{L}' -]+ (course|run|course à pied|trail)$/iu.test(t) && t.split(/\s+/).length <= 3) return undefined
  t = t.replace(/Fondamenta(l)?$/, 'Fondamentale')
  return t || undefined
}

export function runTypeFromTitle(title: string | undefined, sportType: number, km: number, sec: number): RunType {
  const t = (title ?? '').toLowerCase()
  if (sportType === 101) return 'tapis'
  if (sportType === 102) return 'trail'
  if (/marche[- ]course|backyard/.test(t)) return 'marche_course'
  if (/test/.test(t)) return 'test'
  if (/vma|vitesse maximale/.test(t)) return 'vma'
  if (/seuil/.test(t)) return 'seuil'
  if (/c[ôo]tes?\b/.test(t)) return 'cotes'
  if (/fraction|\d+\s*[x×]\s*\d/.test(t)) return 'fractionne'
  if (/allure|tempo|force/.test(t)) return 'tempo'
  if (/sortie longue/.test(t)) return 'sortie_longue'
  if (/r[ée]cup/.test(t)) return 'recup'
  if (/(semi|marathon|\bcourse \d+ ?km\b)/.test(t) && !/avant|footing|s[ée]ance/.test(t)) return 'competition'
  if (sec >= 75 * 60 || km >= 15) return 'sortie_longue'
  return 'ef'
}

export function activitiesToData(items: CorosActivity[]): { runs: Run[]; renfo: RenfoSession[] } {
  const runs: Run[] = []
  const renfo: RenfoSession[] = []
  for (const a of items) {
    const id = `coros-${a.labelId}`
    if (RUN_SPORTS.has(a.sportType)) {
      const km = Math.round((a.distanceKm ?? 0) * 100) / 100
      if (km < 1 || !a.durationSec) continue
      const title = cleanTitle(a.title)
      runs.push({ id, externalId: id, source: 'coros', date: a.date, type: runTypeFromTitle(title, a.sportType, km, a.durationSec), title, distanceKm: km, durationSec: a.durationSec, avgHr: a.avgHr, calories: a.calories })
    } else if (STRENGTH_SPORTS.has(a.sportType) && a.durationSec >= 5 * 60) {
      renfo.push({ id, date: a.date, title: cleanTitle(a.title) ?? 'Renforcement', focus: 'complet', durationMin: Math.round(a.durationSec / 60), exercises: [], notes: 'Séance enregistrée sur la montre' })
    }
  }
  return { runs, renfo }
}

function qualityFromScore(score?: number): number {
  if (!score || score < 0) return 3
  return score >= 85 ? 5 : score >= 75 ? 4 : score >= 65 ? 3 : score >= 55 ? 2 : 1
}

export function parseSleep(text: string): SleepEntry[] {
  const out: SleepEntry[] = []
  for (const block of text.split(/\n(?=\d{4}-\d{2}-\d{2}\s*\n)/)) {
    const date = block.match(/^(\d{4}-\d{2}-\d{2})\s*$/m)?.[1]
    const main = parseHm(block.match(/Main Sleep \(asleep\):\s*([^\n]+)/)?.[1])
    if (!date || !main) continue
    const win = block.match(/Main Sleep Window:\s*\S+\s+(\d{2}:\d{2})\s*-\s*\S+\s+(\d{2}:\d{2})/)
    const score = Number(block.match(/Sleep Score:\s*(-?\d+)/)?.[1])
    const nap = parseHm(block.match(/Naps Total(?: \(asleep\))?:\s*([^\n]+)/)?.[1])
    out.push({
      id: `coros-sleep-${date}`,
      date,
      bedtime: win?.[1],
      wakeTime: win?.[2],
      durationMin: main,
      quality: qualityFromScore(score),
      score: score > 0 ? score : undefined,
      deepPct: Number(block.match(/Deep Sleep Ratio:\s*(\d+)%/)?.[1]) || undefined,
      remPct: Number(block.match(/REM Ratio:\s*(\d+)%/)?.[1]) || undefined,
      awakeMin: parseHm(block.match(/Awake Time:\s*([^\n]+)/)?.[1]),
      napMin: nap || undefined,
    })
  }
  return out
}

export function parseRestingHr(text: string): Record<ISODate, number> {
  const out: Record<ISODate, number> = {}
  for (const m of text.matchAll(/^(\d{4}-\d{2}-\d{2}):\s*(\d+)\s*bpm/gm)) out[m[1]] = Number(m[2])
  return out
}

export interface CorosScheduled {
  date: ISODate
  title: string
  planId?: string
  distanceKm?: number
  durationMin?: number
}

export function parseSchedule(text: string): CorosScheduled[] {
  const out: CorosScheduled[] = []
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.trim().split('\n').map((l) => l.trim())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? '') || !lines[1]) continue
    const est = block.match(/Estimated Time:\s*([\d:]+)/)?.[1]
    out.push({
      date: lines[0],
      title: lines[1],
      planId: block.match(/Plan ID:\s*(\d+)/)?.[1],
      distanceKm: Number(block.match(/Distance:\s*([\d.]+)\s*km/)?.[1]) || undefined,
      durationMin: est ? Math.round((parseDuration(est) ?? 0) / 60) || undefined : undefined,
    })
  }
  return out
}

/** Deux plans actifs en même temps créent des doublons : par jour, on garde le plan le plus récent. */
export function scheduleToPlanned(items: CorosScheduled[], raceDates: Set<ISODate>): PlannedWorkout[] {
  const byDate = new Map<ISODate, CorosScheduled[]>()
  items.forEach((it) => byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]))
  const out: PlannedWorkout[] = []
  const newer = (a: string, b: string) => (a.length !== b.length ? a.length > b.length : a > b)
  for (const [date, list] of byDate) {
    if (raceDates.has(date)) continue
    const planIds = [...new Set(list.map((x) => x.planId).filter((x): x is string => !!x))]
    const keepPlan = planIds.reduce<string | undefined>((best, id) => (!best || newer(id, best) ? id : best), undefined)
    const kept = list.filter((x) => !x.planId || x.planId === keepPlan)
    kept.forEach((it, i) => {
      const t = it.title.toLowerCase()
      const runType: RunType = /simulation|marche[- ]course/.test(t) ? 'marche_course' : /marche inclin|tapis/.test(t) ? 'tapis' : /sortie longue/.test(t) ? 'sortie_longue' : /test/.test(t) ? 'test' : /c[ôo]tes?\b/.test(t) ? 'cotes' : /seuil/.test(t) ? 'seuil' : /vma/.test(t) ? 'vma' : 'ef'
      out.push({
        id: `coros-plan-${date}-run${i ? `-${i + 1}` : ''}`,
        date,
        kind: 'run',
        title: it.title,
        runType,
        targetDistanceKm: it.distanceKm,
        targetDurationMin: it.durationMin,
        description: 'Plan COROS',
      })
      const renfo = it.title.match(/renfo\s*([AB])?(\s*léger)?/i)
      if (renfo)
        out.push({
          id: `coros-plan-${date}-renfo${i ? `-${i + 1}` : ''}`,
          date,
          kind: 'renfo',
          title: `Renfo${renfo[1] ? ` ${renfo[1].toUpperCase()}` : ''}${renfo[2] ? ' léger' : ''}`,
          description: 'Après la course',
        })
    })
  }
  return out
}

export function parseUserInfo(text: string): Partial<Profile> {
  const p: Partial<Profile> = {}
  const h = Number(text.match(/Height:\s*([\d.]+)/)?.[1])
  const w = Number(text.match(/Weight:\s*([\d.]+)/)?.[1])
  const y = Number(text.match(/Birthday:\s*(\d{4})/)?.[1])
  const g = text.match(/Gender:\s*(\w+)/)?.[1]
  const n = text.match(/Nickname:\s*(.+)/)?.[1]?.trim()
  if (h) p.heightCm = h
  if (w) p.weightKg = w
  if (y) p.birthYear = y
  if (g) p.sex = /^f/i.test(g) ? 'F' : 'M'
  if (n) p.name = n
  return p
}

export function parseThresholdPace(text: string): number | undefined {
  const m = text.match(/Threshold Pace:\s*(\d+):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined
}

// ── Synchronisation ─────────────────────────────────────────
export type CorosCall = (tool: CorosTool, input: Record<string, unknown>) => Promise<string>

export interface CorosFetchResult {
  data: Partial<AppData>
  plannedRange: [ISODate, ISODate]
  counts: { runs: number; renfo: number; nights: number; planned: number }
}

const compact = (d: ISODate) => d.replace(/-/g, '')

async function fetchActivities(call: CorosCall, from: ISODate, to: ISODate, depth = 0): Promise<CorosActivity[]> {
  const text = await call('querySportRecords', { startDate: compact(from), endDate: compact(to), limit: 200 })
  const { total, items } = parseSportRecords(text)
  // Trop d'activités pour une seule réponse : on coupe la période en deux
  if ((total > items.length || items.length >= 200) && depth < 6 && daysBetween(from, to) > 14) {
    const mid = addDaysISO(from, Math.floor(daysBetween(from, to) / 2))
    return [...(await fetchActivities(call, from, mid, depth + 1)), ...(await fetchActivities(call, addDaysISO(mid, 1), to, depth + 1))]
  }
  return items
}

export async function fetchCoros(call: CorosCall, opts: { lastDate?: ISODate; raceDates: Set<ISODate>; today?: ISODate; onStep?: (label: string) => void }): Promise<CorosFetchResult> {
  const today = opts.today ?? todayISO()
  const step = opts.onStep ?? (() => {})

  // 1. Séances : tout l'historique la première fois, puis seulement les nouveautés
  step('Séances')
  const from = opts.lastDate ? addDaysISO(opts.lastDate, -3) : '2018-01-01'
  const activities: CorosActivity[] = []
  for (let start = from; start <= today; ) {
    const yearEnd = `${start.slice(0, 4)}-12-31`
    const end = yearEnd < today ? yearEnd : today
    activities.push(...(await fetchActivities(call, start, end)))
    start = addDaysISO(end, 1)
  }
  const { runs, renfo } = activitiesToData(activities)

  // 2. Sommeil (par tranches de 60 jours) et FC de repos
  step('Sommeil')
  const sleepFrom = opts.lastDate ? addDaysISO(opts.lastDate, -3) : addDaysISO(today, -365)
  const sleep: SleepEntry[] = []
  for (let start = sleepFrom; start <= today; start = addDaysISO(start, 60)) {
    const end = addDaysISO(start, 59) < today ? addDaysISO(start, 59) : today
    sleep.push(...parseSleep(await call('querySleepOverview', { startDate: compact(start), endDate: compact(end) })))
  }
  const rhrDays = Math.min(365, Math.max(7, daysBetween(sleepFrom, today) + 1))
  const rhr = parseRestingHr(await call('queryRestingHeartRate', { days: rhrDays }))
  sleep.forEach((s) => {
    if (rhr[s.date]) s.restingHr = rhr[s.date]
  })

  // 3. Plan d'entraînement : 2 semaines en arrière, 4 mois devant
  step('Plan')
  const planStart = addDaysISO(today, -14)
  const planEnd = addDaysISO(today, 120)
  const planned = scheduleToPlanned(parseSchedule(await call('queryTrainingSchedule', { startDate: compact(planStart), endDate: compact(planEnd) })), opts.raceDates)

  // 4. Profil (ne complète que les champs vides côté appli)
  step('Profil')
  const profile: Partial<Profile> = parseUserInfo(await call('queryUserInfo', {}))
  try {
    const tp = parseThresholdPace(await call('queryFitnessAssessmentOverview', {}))
    if (tp) profile.thresholdPaceSec = tp
  } catch {
    /* évaluation indisponible : sans importance */
  }

  return {
    data: { runs, renfo, sleep, planned, profile: profile as Profile },
    plannedRange: [planStart, planEnd],
    counts: { runs: runs.length, renfo: renfo.length, nights: sleep.length, planned: planned.length },
  }
}
