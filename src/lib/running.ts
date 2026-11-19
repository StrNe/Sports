import type { ISODate, MuscuSession, PersonalRecord, Race, RenfoSession, Run, RunType } from '../types'
import { addDaysISO, daysBetween, fmtDate, sum, todayISO, weekStartISO } from './format'

// ── Types de séances de course ──────────────────────────────
export interface RunTypeMeta {
  label: string
  short: string
  intensity: 'facile' | 'intense'
  /** RPE par défaut si non renseigné (pour la charge d'entraînement) */
  defaultRpe: number
  hint: string
}

export const RUN_TYPES: Record<RunType, RunTypeMeta> = {
  ef: { label: 'Endurance fondamentale', short: 'EF', intensity: 'facile', defaultRpe: 3, hint: 'Aisance respiratoire, tu peux parler.' },
  recup: { label: 'Footing de récupération', short: 'Récup', intensity: 'facile', defaultRpe: 2, hint: 'Très lent, pour relancer la circulation.' },
  sortie_longue: { label: 'Sortie longue', short: 'SL', intensity: 'facile', defaultRpe: 4, hint: "La séance clé de l'endurance." },
  marche_course: { label: 'Marche-course', short: 'M-C', intensity: 'facile', defaultRpe: 3, hint: 'Alternance course / marche, idéal en ultra et Backyard.' },
  tempo: { label: 'Tempo / allure spécifique', short: 'Tempo', intensity: 'intense', defaultRpe: 6, hint: 'Allure semi ou marathon.' },
  seuil: { label: 'Seuil', short: 'Seuil', intensity: 'intense', defaultRpe: 7, hint: '“Confortablement difficile”, ~1 h de course possible.' },
  fractionne: { label: 'Fractionné', short: 'Frac.', intensity: 'intense', defaultRpe: 8, hint: 'Répétitions avec récupération.' },
  vma: { label: 'VMA', short: 'VMA', intensity: 'intense', defaultRpe: 9, hint: 'Intervalles courts très rapides.' },
  cotes: { label: 'Côtes', short: 'Côtes', intensity: 'intense', defaultRpe: 8, hint: 'Force spécifique en montée.' },
  test: { label: 'Test / évaluation', short: 'Test', intensity: 'intense', defaultRpe: 9, hint: 'Test VMA, 5 km chrono, test aérobie…' },
  competition: { label: 'Compétition', short: 'Course', intensity: 'intense', defaultRpe: 9, hint: 'Jour J !' },
  trail: { label: 'Trail', short: 'Trail', intensity: 'facile', defaultRpe: 5, hint: 'Terrain varié, dénivelé.' },
  tapis: { label: 'Tapis', short: 'Tapis', intensity: 'facile', defaultRpe: 4, hint: 'Course ou marche inclinée sur tapis.' },
}

export const RUN_TYPE_ORDER: RunType[] = ['ef', 'recup', 'sortie_longue', 'marche_course', 'tempo', 'seuil', 'fractionne', 'vma', 'cotes', 'test', 'competition', 'trail', 'tapis']

// ── Charge d'entraînement (méthode sRPE de Foster) ─────────
export function runLoad(r: Run): number {
  const rpe = r.rpe ?? RUN_TYPES[r.type]?.defaultRpe ?? 4
  return (r.durationSec / 60) * rpe
}
export function renfoLoad(s: RenfoSession): number {
  return s.durationMin * (s.rpe ?? 5)
}
export function muscuLoad(s: MuscuSession): number {
  return s.durationMin * (s.rpe ?? 6)
}

export interface DailyLoad {
  date: ISODate
  load: number
}

export function dailyLoads(runs: Run[], renfo: RenfoSession[], muscu: MuscuSession[]): Map<ISODate, number> {
  const m = new Map<ISODate, number>()
  const add = (d: ISODate, v: number) => m.set(d, (m.get(d) ?? 0) + v)
  runs.forEach((r) => add(r.date, runLoad(r)))
  renfo.forEach((s) => add(s.date, renfoLoad(s)))
  muscu.forEach((s) => add(s.date, muscuLoad(s)))
  return m
}

export interface LoadStatus {
  acute: number
  chronicWeekly: number
  ratio: number | undefined
  zone: 'sous' | 'optimal' | 'vigilance' | 'risque' | 'inconnu'
  label: string
  advice: string
}

/** Ratio charge aiguë (7 j) / charge chronique (moyenne hebdo sur 28 j) */
export function loadStatus(loads: Map<ISODate, number>, today = todayISO()): LoadStatus {
  let acute = 0
  let chronic = 0
  for (let i = 0; i < 28; i++) {
    const d = addDaysISO(today, -i)
    const v = loads.get(d) ?? 0
    if (i < 7) acute += v
    chronic += v
  }
  const chronicWeekly = chronic / 4
  // Il faut au moins 3 semaines d'historique pour que le ratio ait un sens
  let earliest: ISODate | undefined
  loads.forEach((v, d) => {
    if (v > 0 && (!earliest || d < earliest)) earliest = d
  })
  if (chronicWeekly < 30 || !earliest || daysBetween(earliest, today) < 21) {
    return { acute, chronicWeekly, ratio: undefined, zone: 'inconnu', label: 'Pas assez de données', advice: "Enregistre tes séances pendant 3–4 semaines pour obtenir ton ratio de charge." }
  }
  const ratio = acute / chronicWeekly
  if (ratio < 0.8)
    return { acute, chronicWeekly, ratio, zone: 'sous', label: 'Charge en baisse', advice: 'Semaine allégée : parfait pour récupérer, mais ne laisse pas la forme retomber trop longtemps.' }
  if (ratio <= 1.3)
    return { acute, chronicWeekly, ratio, zone: 'optimal', label: 'Charge optimale', advice: 'Tu progresses dans la zone idéale. Continue comme ça !' }
  if (ratio <= 1.5)
    return { acute, chronicWeekly, ratio, zone: 'vigilance', label: 'Charge élevée', advice: 'Hausse rapide de la charge : soigne le sommeil et garde les footings vraiment faciles.' }
  return { acute, chronicWeekly, ratio, zone: 'risque', label: 'Risque de surcharge', advice: 'Charge très supérieure à ton habitude : allège les prochains jours pour éviter la blessure.' }
}

// ── Agrégats hebdomadaires ─────────────────────────────────
export interface WeekSummary {
  weekStart: ISODate
  label: string
  km: number
  durationSec: number
  runs: number
  elevation: number
}

export function weeklyRunSummary(runs: Run[], weeks: number, today = todayISO()): WeekSummary[] {
  const currentStart = weekStartISO(today)
  const out: WeekSummary[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDaysISO(currentStart, -7 * i)
    const we = addDaysISO(ws, 6)
    const inWeek = runs.filter((r) => r.date >= ws && r.date <= we)
    out.push({
      weekStart: ws,
      label: fmtDate(ws, 'd MMM'),
      km: sum(inWeek, (r) => r.distanceKm),
      durationSec: sum(inWeek, (r) => r.durationSec),
      runs: inWeek.length,
      elevation: sum(inWeek, (r) => r.elevationM ?? 0),
    })
  }
  return out
}

export function runsInRange(runs: Run[], from: ISODate, to: ISODate): Run[] {
  return runs.filter((r) => r.date >= from && r.date <= to)
}

// ── Répartition des intensités (règle du 80/20) ────────────
export interface IntensitySplit {
  easySec: number
  hardSec: number
  easyPct: number
  basis: 'fc' | 'type'
}

export function intensitySplit(runs: Run[], efHrLimit?: number): IntensitySplit | undefined {
  if (!runs.length) return undefined
  const withHr = runs.filter((r) => r.avgHr)
  const useHr = !!efHrLimit && withHr.length >= runs.length * 0.6
  let easy = 0
  let hard = 0
  for (const r of runs) {
    let isEasy: boolean
    if (useHr && r.avgHr) isEasy = r.avgHr <= efHrLimit! + 2
    else isEasy = RUN_TYPES[r.type]?.intensity === 'facile'
    if (isEasy) easy += r.durationSec
    else hard += r.durationSec
  }
  const total = easy + hard
  if (!total) return undefined
  return { easySec: easy, hardSec: hard, easyPct: (easy / total) * 100, basis: useHr ? 'fc' : 'type' }
}

/** Mètres parcourus par battement cardiaque (efficacité aérobie). */
export function metersPerBeat(r: Run): number | undefined {
  if (!r.avgHr || !r.durationSec || !r.distanceKm) return undefined
  return (r.distanceKm * 1000) / (r.avgHr * (r.durationSec / 60))
}

// ── VDOT (formules de Jack Daniels) ───────────────────────
export function vdotFromPerformance(distanceKm: number, timeSec: number): number | undefined {
  if (!distanceKm || !timeSec) return undefined
  const t = timeSec / 60
  const v = (distanceKm * 1000) / t
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t)
  const vdot = vo2 / pct
  return isFinite(vdot) && vdot > 0 ? vdot : undefined
}

/** Temps prédit (s) sur une distance pour un VDOT donné (recherche dichotomique) */
export function timeFromVdot(vdot: number, distanceKm: number): number {
  let lo = 60
  let hi = 60 * 60 * 30
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const v = vdotFromPerformance(distanceKm, mid) ?? 0
    if (v > vdot) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Vitesse (m/min) correspondant à une consommation d'O2 */
function velocityFromVo2(vo2: number): number {
  const a = 0.000104
  const b = 0.182258
  const c = -4.6 - vo2
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
}

/** Allure (s/km) à un pourcentage de VO2max */
export function paceAtVo2Pct(vdot: number, pct: number): number {
  const v = velocityFromVo2(vdot * pct)
  return 1000 / v * 60
}

export interface TrainingPaces {
  easy: [number, number]
  marathon: number
  threshold: number
  interval: number
  repetition: number
}

export function trainingPaces(vdot: number): TrainingPaces {
  return {
    easy: [paceAtVo2Pct(vdot, 0.74), paceAtVo2Pct(vdot, 0.62)],
    marathon: timeFromVdot(vdot, 42.195) / 42.195,
    threshold: paceAtVo2Pct(vdot, 0.88),
    interval: paceAtVo2Pct(vdot, 0.975),
    repetition: paceAtVo2Pct(vdot, 1.07),
  }
}

/** Formule de Riegel : t2 = t1 × (d2/d1)^1.06 */
export function riegel(timeSec: number, fromKm: number, toKm: number, exponent = 1.06): number {
  return timeSec * Math.pow(toKm / fromKm, exponent)
}

// ── Performances de référence & records ───────────────────
export interface Performance {
  distanceKm: number
  timeSec: number
  date: ISODate
  source: string
  exact: boolean
}

export const STANDARD_DISTANCES: { key: string; label: string; km: number }[] = [
  { key: '5k', label: '5 km', km: 5 },
  { key: '10k', label: '10 km', km: 10 },
  { key: 'semi', label: 'Semi-marathon', km: 21.0975 },
  { key: 'marathon', label: 'Marathon', km: 42.195 },
]

export const BACKYARD_LOOP_KM = 6.706

export function racePerformances(races: Race[]): Performance[] {
  return races
    .filter((r) => r.result?.timeSec && r.kind !== 'backyard' && r.distanceKm > 0)
    .map((r) => ({ distanceKm: r.distanceKm, timeSec: r.result!.timeSec!, date: r.date, source: r.name, exact: true }))
}

export function recordPerformances(records: PersonalRecord[]): Performance[] {
  return records.map((r) => ({ distanceKm: r.distanceKm, timeSec: r.timeSec, date: r.date, source: r.where || r.label, exact: true }))
}

export interface BestEffort {
  key: string
  label: string
  km: number
  timeSec: number
  date: ISODate
  source: string
  estimated: boolean
}

/** Meilleure performance par distance standard (records saisis, courses, puis séances couvrant la distance) */
export function bestEfforts(runs: Run[], races: Race[], records: PersonalRecord[]): BestEffort[] {
  const exact = [...recordPerformances(records), ...racePerformances(races)]
  return STANDARD_DISTANCES.flatMap((d) => {
    const candidates: BestEffort[] = []
    for (const p of exact) {
      if (Math.abs(p.distanceKm - d.km) / d.km <= 0.03)
        candidates.push({ key: d.key, label: d.label, km: d.km, timeSec: p.timeSec * (d.km / p.distanceKm), date: p.date, source: p.source, estimated: false })
    }
    // Une séance le même jour qu'un résultat officiel correspond à la même course : on garde le résultat officiel
    const exactDates = new Set(candidates.map((c) => c.date))
    for (const r of runs) {
      if (exactDates.has(r.date)) continue
      if (r.distanceKm >= d.km * 0.995 && r.distanceKm <= d.km * 1.06 && r.type !== 'marche_course' && r.type !== 'tapis')
        candidates.push({ key: d.key, label: d.label, km: d.km, timeSec: r.durationSec * (d.km / r.distanceKm), date: r.date, source: r.title || RUN_TYPES[r.type].label, estimated: true })
    }
    if (!candidates.length) return []
    candidates.sort((a, b) => a.timeSec - b.timeSec || Number(a.estimated) - Number(b.estimated))
    return [candidates[0]]
  })
}

/** Performances récentes utilisables pour prédire (≤ 180 jours) */
export function referencePerformances(runs: Run[], races: Race[], records: PersonalRecord[], today = todayISO()): Performance[] {
  const recent = (p: Performance) => daysBetween(p.date, today) <= 180 && daysBetween(p.date, today) >= 0
  const exact = [...recordPerformances(records), ...racePerformances(races)].filter(recent)
  const fromRuns: Performance[] = runs
    .filter((r) => (r.type === 'competition' || r.type === 'test') && r.distanceKm >= 3)
    .map((r) => ({ distanceKm: r.distanceKm, timeSec: r.durationSec, date: r.date, source: r.title || RUN_TYPES[r.type].label, exact: false }))
    .filter(recent)
  return [...exact, ...fromRuns]
}

export function bestVdot(perfs: Performance[]): { vdot: number; perf: Performance } | undefined {
  let best: { vdot: number; perf: Performance } | undefined
  for (const p of perfs) {
    const v = vdotFromPerformance(p.distanceKm, p.timeSec)
    if (v && (!best || v > best.vdot)) best = { vdot: v, perf: p }
  }
  return best
}

/** Prédit un temps en partant de la performance de référence la plus proche en distance */
export function predictTime(perfs: Performance[], distanceKm: number): { timeSec: number; from: Performance } | undefined {
  if (!perfs.length) return undefined
  let best: Performance | undefined
  let bestScore = Infinity
  for (const p of perfs) {
    // Proximité en distance, avec un léger bonus pour les performances exactes et récentes
    const score = Math.abs(Math.log(distanceKm / p.distanceKm)) - (p.exact ? 0.15 : 0)
    if (score < bestScore || (score === bestScore && best && p.date > best.date)) {
      best = p
      bestScore = score
    }
  }
  if (!best) return undefined
  return { timeSec: riegel(best.timeSec, best.distanceKm, distanceKm), from: best }
}

// ── Zones ──────────────────────────────────────────────────
export interface HrZone {
  name: string
  label: string
  min: number
  max: number
  desc: string
}

export function karvonenZones(hrMax: number, hrRest: number): HrZone[] {
  const r = hrMax - hrRest
  const z = (p: number) => Math.round(hrRest + r * p)
  return [
    { name: 'Z1', label: 'Récupération', min: z(0.5), max: z(0.6), desc: 'Footing de récup, échauffement' },
    { name: 'Z2', label: 'Endurance fondamentale', min: z(0.6), max: z(0.7), desc: '80 % de ton volume doit être ici' },
    { name: 'Z3', label: 'Endurance active / tempo', min: z(0.7), max: z(0.8), desc: 'Allure marathon' },
    { name: 'Z4', label: 'Seuil', min: z(0.8), max: z(0.9), desc: 'Allure semi / 10 km' },
    { name: 'Z5', label: 'VMA', min: z(0.9), max: hrMax, desc: 'Intervalles courts' },
  ]
}

export interface VmaZone {
  label: string
  pctMin: number
  pctMax: number
  use: string
}

export const VMA_ZONES: VmaZone[] = [
  { label: 'Récupération', pctMin: 55, pctMax: 62, use: 'Footing de récup' },
  { label: 'Endurance fondamentale', pctMin: 62, pctMax: 70, use: 'Footings, sortie longue' },
  { label: 'Allure marathon', pctMin: 75, pctMax: 80, use: 'Tempo long' },
  { label: 'Seuil / allure semi', pctMin: 80, pctMax: 85, use: 'Blocs de 8–20 min' },
  { label: 'Allure 10 km', pctMin: 85, pctMax: 90, use: 'Fractionné long' },
  { label: 'VMA longue', pctMin: 90, pctMax: 95, use: '800 m – 1000 m' },
  { label: 'VMA courte', pctMin: 95, pctMax: 105, use: '200 m – 400 m, 30/30' },
]

// ── Phase de préparation ───────────────────────────────────
export interface PrepPhase {
  key: 'recuperation' | 'base' | 'developpement' | 'specifique' | 'affutage' | 'semaine_course'
  label: string
  advice: string
  bullets: string[]
}

export function prepPhase(daysToRace: number, race?: Race): PrepPhase {
  const isUltra = race && (race.kind === 'backyard' || race.kind === 'trail' || race.distanceKm > 42.2)
  if (daysToRace < 0)
    return {
      key: 'recuperation',
      label: 'Récupération',
      advice: 'Laisse ton corps assimiler. Quelques jours sans intensité.',
      bullets: ['Footings très faciles ou vélo', 'Sommeil et alimentation riches', 'Fixe ton prochain objectif'],
    }
  if (daysToRace <= 6)
    return {
      key: 'semaine_course',
      label: 'Semaine de course',
      advice: 'Peu de volume, un rappel d’allure, beaucoup de sommeil.',
      bullets: ['Volume réduit de 50–60 %', '2–3 jours avant : recharge en glucides', 'Prépare ton matériel et ton ravitaillement', 'Rien de nouveau le jour J'],
    }
  if (daysToRace <= 14)
    return {
      key: 'affutage',
      label: 'Affûtage',
      advice: 'Réduis le volume de 30–40 % en gardant un peu d’intensité.',
      bullets: ['Dernière sortie longue 10–14 jours avant', 'Garde des rappels courts à allure course', 'Priorité au sommeil'],
    }
  if (daysToRace <= 42)
    return {
      key: 'specifique',
      label: 'Phase spécifique',
      advice: isUltra ? 'Simule la course : sorties longues en marche-course, ravitaillement, matériel.' : 'Travaille l’allure cible et les sorties longues spécifiques.',
      bullets: isUltra
        ? ['Sorties longues à l’allure de course', 'Teste ta nutrition (40–60 g de glucides/h)', 'Entraîne-toi aux enchaînements (ex. boucles de 6,7 km)']
        : ['Blocs à allure cible', 'Sortie longue avec portions à allure course', '1–2 séances de qualité par semaine'],
    }
  if (daysToRace <= 84)
    return {
      key: 'developpement',
      label: 'Développement',
      advice: 'Augmente progressivement le volume (≤ 10 %/semaine) et ajoute une séance de qualité.',
      bullets: ['1 séance de qualité par semaine (seuil, côtes)', 'Sortie longue qui progresse', 'Renfo 2×/semaine'],
    }
  return {
    key: 'base',
    label: 'Construction de la base',
    advice: 'Beaucoup d’endurance fondamentale, régularité avant tout.',
    bullets: ['80 % du temps en EF', 'Lignes droites pour la foulée', 'Renfo et gainage 2×/semaine'],
  }
}

export function loopKmOf(r: Pick<Race, 'loopKm'>): number {
  return r.loopKm && r.loopKm > 0 ? r.loopKm : BACKYARD_LOOP_KM
}

export function raceDistanceKm(r: Race): number {
  if (r.kind === 'backyard') return (r.goalLoops ?? 1) * loopKmOf(r)
  return r.distanceKm
}

export const RACE_KIND_LABEL: Record<Race['kind'], string> = {
  route: 'Route',
  trail: 'Trail',
  backyard: 'Backyard',
  cross: 'Cross',
  piste: 'Piste',
  autre: 'Autre',
}

/** Augmentation de volume semaine courante vs moyenne des 3 précédentes */
export function volumeIncrease(weeks: WeekSummary[]): number | undefined {
  if (weeks.length < 4) return undefined
  const last = weeks[weeks.length - 1].km
  const prev = weeks.slice(-4, -1).map((w) => w.km)
  const avgPrev = prev.reduce((a, b) => a + b, 0) / prev.length
  if (avgPrev < 3) return undefined
  return ((last - avgPrev) / avgPrev) * 100
}

export function longestRun(runs: Run[]): Run | undefined {
  return runs.reduce<Run | undefined>((best, r) => (!best || r.distanceKm > best.distanceKm ? r : best), undefined)
}

export function biggestWeek(runs: Run[]): { weekStart: ISODate; km: number } | undefined {
  const m = new Map<ISODate, number>()
  runs.forEach((r) => {
    const ws = weekStartISO(r.date)
    m.set(ws, (m.get(ws) ?? 0) + r.distanceKm)
  })
  let best: { weekStart: ISODate; km: number } | undefined
  m.forEach((km, weekStart) => {
    if (!best || km > best.km) best = { weekStart, km }
  })
  return best
}

/** Kilométrage total d'une paire de chaussures */
export function shoeKm(shoeId: string, startKm: number, runs: Run[]): number {
  return startKm + sum(runs.filter((r) => r.shoeId === shoeId), (r) => r.distanceKm)
}
