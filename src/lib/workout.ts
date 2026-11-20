// Séances structurées : lecture du « Course JSON » COROS, des tours d'une sortie,
// et comparaison étape par étape entre le prévu et le réalisé.

import type { ISODate, PlannedWorkout, Run, SessionCheck, StepResult, WorkoutBlock, WorkoutRepeat, WorkoutStep } from '../types'
import { fmtKm, fmtPace } from './format'

// ── Course JSON COROS ───────────────────────────────────────
interface CourseSection {
  sectionType?: number
  targetType?: number
  targetValue?: number
  intensityType?: number
  intensityValueStart?: number
  intensityValueEnd?: number
  intervalGroup?: boolean
  repeats?: number
  sets?: CourseSection[]
}

interface CourseJson {
  courseName?: string
  courseDescription?: string
  sections?: CourseSection[]
}

export interface CorosCourse {
  date: ISODate
  name: string
  description?: string
  steps: WorkoutBlock[]
}

// sectionType : 1 échauffement, 2 effort, 3 récupération, 4 retour au calme
const SECTION_KIND: Record<number, WorkoutStep['kind']> = { 1: 'warmup', 2: 'work', 3: 'recovery', 4: 'cooldown' }

function toStep(s: CourseSection): WorkoutStep {
  const step: WorkoutStep = { kind: SECTION_KIND[s.sectionType ?? 0] ?? 'other' }
  // targetType : 1 distance (m), 2 durée (s), 4 libre (bouton tour)
  if (s.targetType === 2 && s.targetValue) step.durationSec = s.targetValue
  else if (s.targetType === 1 && s.targetValue) step.distanceM = s.targetValue
  // intensityType : 1 FC (bpm), 2 allure (s/km) ; les autres cibles ne sont pas reprises
  const type = s.intensityType === 1 ? 'hr' : s.intensityType === 2 ? 'pace' : undefined
  const a = s.intensityValueStart
  const b = s.intensityValueEnd
  if (type && a && b) step.target = { type, min: Math.min(a, b), max: Math.max(a, b) }
  return step
}

export function courseToSteps(c: CourseJson): WorkoutBlock[] {
  return (c.sections ?? []).map((s) => (s.intervalGroup && s.sets?.length ? { repeat: Math.max(1, s.repeats ?? 1), steps: s.sets.map(toStep) } : toStep(s)))
}

function readCourse(json: string, date: ISODate): CorosCourse | undefined {
  try {
    const c = JSON.parse(json) as CourseJson
    return { date, name: (c.courseName ?? '').trim(), description: c.courseDescription?.trim() || undefined, steps: courseToSteps(c) }
  } catch {
    return undefined
  }
}

/** Détail d'un plan (queryTrainingPlanDetails) : les séances de chaque jour */
export function parsePlanCourses(text: string): CorosCourse[] {
  const out: CorosCourse[] = []
  let date: ISODate | undefined
  for (const line of text.split('\n')) {
    const d = line.match(/^\s*Day\s+\d+\s+-\s+(\d{4}-\d{2}-\d{2})/)
    if (d) {
      date = d[1]
      continue
    }
    const j = line.match(/^\s*Course JSON:\s*(\{.*\})\s*$/)
    if (j && date) {
      const c = readCourse(j[1], date)
      if (c) out.push(c)
    }
  }
  return out
}

/** Détail d'une séance autonome (queryScheduledWorkoutDetails) */
export function parseScheduledCourse(text: string): CorosCourse | undefined {
  const date = text.match(/^\s*Date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1]
  const j = text.match(/^\s*Course JSON:\s*(\{.*\})\s*$/m)?.[1]
  return date && j ? readCourse(j, date) : undefined
}

const norm = (s?: string) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Ajoute la structure et les consignes aux séances prévues correspondantes (même jour, même nom) */
export function attachCourses(planned: PlannedWorkout[], courses: CorosCourse[]): PlannedWorkout[] {
  return planned.map((p) => {
    if (p.kind !== 'run') return p
    const sameDay = courses.filter((c) => c.date === p.date)
    const c = sameDay.find((x) => norm(x.name) === norm(p.title)) ?? (sameDay.length === 1 ? sameDay[0] : undefined)
    if (!c || !c.steps.length) return p
    return { ...p, steps: c.steps, notes: c.description }
  })
}

// ── Lecture des étapes ──────────────────────────────────────
export const isRepeat = (b: WorkoutBlock): b is WorkoutRepeat => 'repeat' in b

export function expandSteps(blocks: WorkoutBlock[]): (WorkoutStep & { rep?: number })[] {
  const out: (WorkoutStep & { rep?: number })[] = []
  for (const b of blocks) {
    if (isRepeat(b)) for (let r = 1; r <= b.repeat; r++) b.steps.forEach((s) => out.push({ ...s, rep: r }))
    else out.push(b)
  }
  return out
}

/** Une séance « structurée » : plusieurs étapes à enchaîner (fractionné, test, seuil…) */
export function isStructured(blocks?: WorkoutBlock[]): boolean {
  return !!blocks && expandSteps(blocks).length > 1
}

export const STEP_LABEL: Record<WorkoutStep['kind'], string> = { warmup: 'Échauffement', work: 'Effort', recovery: 'Récup', cooldown: 'Retour au calme', other: 'Étape' }

/** 900 → « 15 min », 90 → « 1 min 30 », 20 → « 20 s » */
export function fmtStepTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m >= 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
  return s ? `${m} min ${String(s).padStart(2, '0')}` : `${m} min`
}

export function fmtStepAmount(s: Pick<WorkoutStep, 'durationSec' | 'distanceM'>): string {
  if (s.distanceM) return s.distanceM >= 1000 ? `${fmtKm(s.distanceM / 1000)} km` : `${Math.round(s.distanceM)} m`
  if (s.durationSec) return fmtStepTime(s.durationSec)
  return 'libre'
}

export function fmtTarget(t?: WorkoutStep['target']): string | undefined {
  if (!t) return undefined
  if (t.type === 'pace') return `${fmtPace(t.min)}–${fmtPace(t.max)} /km`
  return `FC ${t.min}–${t.max}`
}

// ── Tours d'une sortie (queryActivityLapData) ──────────────
export interface Lap {
  sec: number
  m: number
  hr?: number
}

/**
 * Les tours de la séance structurée (groupe de type 2 : un tour par étape enchaînée).
 * Distances en centimètres, durées en secondes.
 */
export function parseLaps(text: string): Lap[] | undefined {
  try {
    const j = JSON.parse(text) as { lapGroups?: { type: number; laps?: { distance?: number; time?: number; avgHr?: number }[] }[] }
    const g = j.lapGroups?.find((x) => x.type === 2)
    if (!g?.laps?.length) return undefined
    return g.laps.map((l) => ({ sec: Math.round((l.time ?? 0) * 10) / 10, m: Math.round((l.distance ?? 0) / 100), hr: l.avgHr || undefined }))
  } catch {
    return undefined
  }
}

// ── Comparaison prévu / réalisé ─────────────────────────────
const PACE_TOL = 5 // s/km de marge autour de la plage d'allure
const HR_TOL = 3 // bpm

export function judge(target: WorkoutStep['target'] | undefined, sec: number, m: number, hr?: number): StepResult['verdict'] {
  if (!target) return undefined
  if (target.type === 'pace') {
    // Allure GPS peu fiable sur moins de 45 s ou 150 m
    if (m < 150 || sec < 45) return undefined
    const pace = sec / (m / 1000)
    if (pace < target.min - PACE_TOL) return 'fast'
    if (pace > target.max + PACE_TOL) return 'slow'
    return 'in'
  }
  if (!hr || sec < 60) return undefined
  if (hr > target.max + HR_TOL) return 'high'
  if (hr < target.min - HR_TOL) return 'low'
  return 'in'
}

/** Compare une séance structurée aux tours de la montre (un tour par étape) */
export function compareSession(blocks: WorkoutBlock[], laps: Lap[] | undefined, now = Date.now()): SessionCheck {
  const steps = expandSteps(blocks)
  if (!laps || laps.length !== steps.length) return { aligned: false, results: [], at: now }
  const results: StepResult[] = steps.map((s, i) => {
    const l = laps[i]
    const r: StepResult = { kind: s.kind, sec: l.sec, m: l.m }
    if (s.rep) r.rep = s.rep
    if (s.target) r.target = s.target
    if (s.durationSec) r.plannedSec = s.durationSec
    if (s.distanceM) r.plannedM = s.distanceM
    if (l.hr) r.hr = l.hr
    const v = judge(s.target, l.sec, l.m, l.hr)
    if (v) r.verdict = v
    return r
  })
  return { aligned: true, results, at: now }
}

/** Séance d'un seul bloc (ex. footing « FC sous 165 ») : on juge la sortie entière, sans relire les tours */
export function judgeWholeRun(blocks: WorkoutBlock[] | undefined, run: Pick<Run, 'durationSec' | 'distanceKm' | 'avgHr'>): StepResult | undefined {
  if (!blocks) return undefined
  const steps = expandSteps(blocks)
  if (steps.length !== 1 || !steps[0].target) return undefined
  const s = steps[0]
  const r: StepResult = { kind: s.kind, target: s.target, sec: run.durationSec, m: Math.round(run.distanceKm * 1000), hr: run.avgHr }
  if (s.durationSec) r.plannedSec = s.durationSec
  if (s.distanceM) r.plannedM = s.distanceM
  const v = judge(s.target, run.durationSec, run.distanceKm * 1000, run.avgHr)
  if (v) r.verdict = v
  return r
}

export const VERDICT_LABEL: Record<NonNullable<StepResult['verdict']>, string> = { in: 'dans la cible', fast: 'trop rapide', slow: 'trop lent', high: 'FC trop haute', low: 'FC trop basse' }

/** La séance prévue qui correspond à une sortie (même jour, même nom, sinon seule séance course du jour) */
export function plannedForRun(run: Pick<Run, 'date' | 'title'>, planned: PlannedWorkout[]): PlannedWorkout | undefined {
  const sameDay = planned.filter((p) => p.kind === 'run' && p.date === run.date)
  return sameDay.find((p) => norm(p.title) === norm(run.title)) ?? (sameDay.length === 1 ? sameDay[0] : undefined)
}

/** Sortie à comparer : les tours ne sont relus que pour une séance structurée encore jamais comparée */
export function needsLapCheck(run: Run, planned: PlannedWorkout[]): boolean {
  if (run.check || run.source !== 'coros') return false
  return isStructured(plannedForRun(run, planned)?.steps)
}

/** Résumé : étapes « effort » jugées et dans la cible */
export function checkSummary(results: StepResult[]): { judged: number; inTarget: number } {
  const work = results.filter((r) => r.kind === 'work' && r.verdict)
  return { judged: work.length, inTarget: work.filter((r) => r.verdict === 'in').length }
}
