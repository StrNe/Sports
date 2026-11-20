// Bilan de la semaine : les chiffres clés d'une semaine (lundi → dimanche),
// comparés à la semaine précédente, et quelques phrases de synthèse.

import type { AppData, ISODate } from '../types'
import { addDaysISO, avg, fmtDate, fmtKm, fmtMinutes, fmtNum, sum, todayISO, weekStartISO } from './format'
import { energyHistory } from './energy'
import { frequentChores } from './chores'

export interface ReviewDay {
  date: ISODate
  future: boolean
  km: number
  renfo: number
  muscu: number
  sleepMin?: number
  kcal?: number
  chores: number
}

export interface Highlight {
  topic: 'run' | 'plan' | 'sleep' | 'food' | 'chores' | 'weight'
  tone: 'good' | 'warning' | 'info'
  text: string
}

export interface WeekReview {
  weekStart: ISODate
  weekEnd: ISODate
  /** Semaine terminée (sinon : en cours) */
  complete: boolean
  run: { km: number; count: number; durationSec: number; elevation: number; prevKm: number; avg4Km: number; longest?: { km: number; date: ISODate } }
  sessions: { total: number; prevTotal: number; renfo: number; muscu: number; planned: number; plannedDone: number }
  sleep: { nights: number; avgMin?: number; prevAvgMin?: number; under: number; avgScore?: number; restingHr?: number; hrv?: number }
  food: { days: number; avgIntake?: number; avgTarget?: number }
  weight: { last?: number; delta?: number }
  chores: { count: number; prevCount: number; top: { name: string; count: number }[] }
  days: ReviewDay[]
  highlights: Highlight[]
}

const between = (d: ISODate, a: ISODate, b: ISODate) => d >= a && d <= b
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`

/** 480 → « 8 h », 450 → « 7 h 30 » */
export function fmtHours(min: number): string {
  return min % 60 === 0 ? `${min / 60} h` : fmtMinutes(min)
}

export function weekReview(data: AppData, weekStart: ISODate, today = todayISO()): WeekReview {
  const ws = weekStartISO(weekStart)
  const we = addDaysISO(ws, 6)
  const end = we < today ? we : today
  const pws = addDaysISO(ws, -7)
  const pwe = addDaysISO(ws, -1)
  const goal = data.profile.sleepGoalMin || 480

  // Course
  const runs = data.runs.filter((r) => between(r.date, ws, we))
  const km = sum(runs, (r) => r.distanceKm)
  const prevKm = sum(
    data.runs.filter((r) => between(r.date, pws, pwe)),
    (r) => r.distanceKm,
  )
  const avg4Km = sum([1, 2, 3, 4], (i) => sum(data.runs.filter((r) => between(r.date, addDaysISO(ws, -7 * i), addDaysISO(ws, -7 * i + 6))), (r) => r.distanceKm)) / 4
  const longestRun = [...runs].sort((a, b) => b.distanceKm - a.distanceKm)[0]

  // Séances et plan
  const renfo = data.renfo.filter((s) => between(s.date, ws, we))
  const muscu = data.muscu.filter((s) => between(s.date, ws, we))
  const prevTotal = data.runs.filter((r) => between(r.date, pws, pwe)).length + data.renfo.filter((s) => between(s.date, pws, pwe)).length + data.muscu.filter((s) => between(s.date, pws, pwe)).length
  const planned = data.planned.filter((p) => between(p.date, ws, end) && p.kind !== 'repos')
  const plannedDone = planned.filter(
    (p) => p.done || (p.kind === 'run' && runs.some((r) => r.date === p.date)) || (p.kind === 'renfo' && renfo.some((s) => s.date === p.date)) || (p.kind === 'muscu' && muscu.some((s) => s.date === p.date)),
  ).length

  // Sommeil (nuits datées du jour du réveil)
  const nights = data.sleep.filter((s) => between(s.date, ws, we))
  const prevNights = data.sleep.filter((s) => between(s.date, pws, pwe))
  const avgMin = avg(nights.map((s) => s.durationMin))
  const sleep = {
    nights: nights.length,
    avgMin,
    prevAvgMin: avg(prevNights.map((s) => s.durationMin)),
    under: nights.filter((s) => s.durationMin < goal - 30).length,
    avgScore: avg(nights.filter((s) => s.score).map((s) => s.score!)),
    restingHr: avg(nights.filter((s) => s.restingHr).map((s) => s.restingHr!)),
    hrv: avg(nights.filter((s) => s.hrv).map((s) => s.hrv!)),
  }

  // Calories : seulement les journées terminées et assez renseignées
  const span = Math.max(1, Math.round((Date.parse(end) - Date.parse(ws)) / 86400000) + 1)
  const hist = energyHistory(data, span + 1, addDaysISO(end, 1)).slice(0, -1).filter((d) => between(d.date, ws, we))
  const complete = hist.filter((d) => d.complete)
  const food = { days: complete.length, avgIntake: avg(complete.map((d) => d.intake ?? 0)), avgTarget: avg(complete.map((d) => d.target)) }

  // Poids : dernière pesée de la semaine comparée à la précédente
  const weights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date))
  const inWeek = weights.filter((w) => between(w.date, ws, we))
  const lastW = inWeek[inWeek.length - 1]
  const before = weights.filter((w) => w.date < ws).pop() ?? (inWeek.length > 1 ? inWeek[0] : undefined)
  const weight = { last: lastW?.kg, delta: lastW && before ? Math.round((lastW.kg - before.kg) * 10) / 10 : undefined }

  // Tâches ménagères
  const chores = data.chores.filter((c) => between(c.date, ws, we))
  const prevChores = data.chores.filter((c) => between(c.date, pws, pwe))

  // Jour par jour
  const days: ReviewDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(ws, i)
    const night = nights.find((s) => s.date === date)
    const h = hist.find((d) => d.date === date)
    return {
      date,
      future: date > today,
      km: sum(
        runs.filter((r) => r.date === date),
        (r) => r.distanceKm,
      ),
      renfo: renfo.filter((s) => s.date === date).length,
      muscu: muscu.filter((s) => s.date === date).length,
      sleepMin: night ? night.durationMin + (night.napMin ?? 0) : undefined,
      kcal: h?.intake,
      chores: chores.filter((c) => c.date === date).length,
    }
  })

  const review: WeekReview = {
    weekStart: ws,
    weekEnd: we,
    complete: we < today,
    run: { km, count: runs.length, durationSec: sum(runs, (r) => r.durationSec), elevation: sum(runs, (r) => r.elevationM ?? 0), prevKm, avg4Km, longest: longestRun ? { km: longestRun.distanceKm, date: longestRun.date } : undefined },
    sessions: { total: runs.length + renfo.length + muscu.length, prevTotal, renfo: renfo.length, muscu: muscu.length, planned: planned.length, plannedDone },
    sleep,
    food,
    weight,
    chores: { count: chores.length, prevCount: prevChores.length, top: frequentChores(chores, 3) },
    days,
    highlights: [],
  }
  review.highlights = highlights(review, goal)
  return review
}

/** Les phrases de synthèse, par ordre d'importance */
export function highlights(r: WeekReview, sleepGoal: number): Highlight[] {
  const out: Highlight[] = []

  // Course
  if (r.run.km > 0) {
    const change = r.run.prevKm > 0 ? ((r.run.km - r.run.prevKm) / r.run.prevKm) * 100 : undefined
    const trend = change == null ? '' : Math.abs(change) < 5 ? ', comme la semaine d’avant' : change > 0 ? `, en hausse de ${Math.round(change)} %` : `, en baisse de ${Math.round(-change)} %`
    const longest = r.run.longest && r.run.count > 1 ? ` Plus longue sortie : ${fmtKm(r.run.longest.km)} km ${fmtDate(r.run.longest.date, 'EEEE')}.` : ''
    const big = change != null && change > 15 && r.run.km > r.run.avg4Km * 1.15
    out.push({ topic: 'run', tone: big ? 'warning' : 'good', text: `${fmtKm(r.run.km)} km en ${plural(r.run.count, 'sortie')}${trend}.${longest}${big ? ' Hausse marquée : garde les prochains footings bien faciles.' : ''}` })
  } else if (r.run.prevKm > 0) out.push({ topic: 'run', tone: 'info', text: 'Pas de course cette semaine.' })

  // Plan
  if (r.sessions.planned > 0) {
    const { planned, plannedDone } = r.sessions
    if (plannedDone >= planned) out.push({ topic: 'plan', tone: 'good', text: `Plan respecté : ${plural(plannedDone, 'séance')} prévue${plannedDone > 1 ? 's' : ''} sur ${planned}, toutes faites.` })
    else out.push({ topic: 'plan', tone: plannedDone >= planned * 0.7 ? 'info' : 'warning', text: `Plan suivi à ${Math.round((plannedDone / planned) * 100)} % : ${plannedDone} séance${plannedDone > 1 ? 's' : ''} faite${plannedDone > 1 ? 's' : ''} sur ${planned} prévue${planned > 1 ? 's' : ''}.` })
  }

  // Sommeil
  if (r.sleep.nights >= 3 && r.sleep.avgMin) {
    if (r.sleep.avgMin >= sleepGoal - 15) out.push({ topic: 'sleep', tone: 'good', text: `Sommeil au rendez-vous : ${fmtMinutes(r.sleep.avgMin)} par nuit en moyenne.` })
    else out.push({ topic: 'sleep', tone: 'warning', text: `Sommeil moyen ${fmtMinutes(r.sleep.avgMin)}, sous ton objectif de ${fmtHours(sleepGoal)} : ${plural(r.sleep.under, 'nuit')} trop courte${r.sleep.under > 1 ? 's' : ''}.` })
  }

  // Calories
  if (r.food.days >= 3 && r.food.avgIntake && r.food.avgTarget) {
    const diff = Math.round(r.food.avgIntake - r.food.avgTarget)
    const where = Math.abs(diff) <= 150 ? 'dans ton objectif' : diff < 0 ? `${fmtNum(-diff)} kcal sous ton objectif` : `${fmtNum(diff)} kcal au-dessus de ton objectif`
    out.push({ topic: 'food', tone: Math.abs(diff) <= 150 ? 'good' : Math.abs(diff) <= 400 ? 'info' : 'warning', text: `Calories : ${fmtNum(r.food.avgIntake)} kcal par jour en moyenne, ${where} (${plural(r.food.days, 'jour')} noté${r.food.days > 1 ? 's' : ''}).` })
  }

  // Poids
  if (r.weight.delta != null && Math.abs(r.weight.delta) >= 0.2) out.push({ topic: 'weight', tone: 'info', text: `Poids : ${r.weight.delta > 0 ? '+' : '−'}${fmtNum(Math.abs(r.weight.delta), 1)} kg (${fmtNum(r.weight.last, 1)} kg à la dernière pesée).` })

  // Tâches
  if (r.chores.count > 0) {
    const d = r.chores.count - r.chores.prevCount
    const delta = r.chores.prevCount ? ` (${d >= 0 ? '+' : '−'}${Math.abs(d)} par rapport à la semaine d’avant)` : ''
    const top = r.chores.top.length ? `, surtout ${r.chores.top.map((t) => t.name.toLowerCase()).join(', ')}` : ''
    out.push({ topic: 'chores', tone: 'info', text: `${plural(r.chores.count, 'tâche')} ménagère${r.chores.count > 1 ? 's' : ''}${delta}${top}.` })
  }
  return out
}

/** Semaine dont le bilan attend d'être ouvert : la précédente, tant qu'elle n'a pas été vue */
export function pendingReview(data: Pick<AppData, 'sync' | 'runs' | 'sleep' | 'food' | 'chores' | 'renfo' | 'muscu'>, today = todayISO()): ISODate | undefined {
  const ws = addDaysISO(weekStartISO(today), -7)
  if (data.sync?.reviewSeen === ws) return undefined
  const we = addDaysISO(ws, 6)
  const has = [data.runs, data.sleep, data.food, data.chores, data.renfo, data.muscu].some((arr) => (arr as { date: ISODate }[]).some((x) => between(x.date, ws, we)))
  return has ? ws : undefined
}
