// Besoins énergétiques et bilan calorique.
// Dépense = métabolisme de base + activité (mesurée par la montre ou estimée) + digestion (~10 %).

import type { ActivityLevel, AppData, CalorieGoal, FoodEntry, ISODate, MuscuSession, PlannedWorkout, Profile, RenfoSession, Run } from '../types'
import { addDaysISO, sum, todayISO } from './format'
import { bmr } from './nutrition'

export const ACTIVITY_LEVELS: Record<ActivityLevel, { label: string; hint: string; pct: number }> = {
  sedentaire: { label: 'Plutôt assis', hint: 'Cours, bureau, peu de marche en dehors du sport', pct: 0.25 },
  modere: { label: 'Modérément actif', hint: 'Je marche ou je reste debout une bonne partie de la journée', pct: 0.4 },
  actif: { label: 'Très actif', hint: 'Job debout ou physique, beaucoup de marche', pct: 0.55 },
}

export const CALORIE_GOALS: Record<CalorieGoal, { label: string; delta: number; hint: string }> = {
  maintien: { label: 'Garder mon poids', delta: 0, hint: 'Manger autant que je dépense' },
  perte: { label: 'Perdre doucement', delta: -350, hint: '≈ −0,3 kg par semaine, sans gêner l’entraînement' },
  prise: { label: 'Prendre du poids', delta: 300, hint: '≈ +0,25 kg par semaine' },
}

/** 1 kg de masse grasse ≈ 7 700 kcal */
export const KCAL_PER_KG = 7700

const weight = (p: Profile) => p.weightKg ?? 70
const restPerMin = (p: Profile) => bmr(p) / 1440

/** Calories dépensées au-dessus du repos pendant une sortie */
export function runKcal(r: Run, p: Profile): number {
  const min = r.durationSec / 60
  const gross = r.calories ?? r.distanceKm * weight(p) * (r.type === 'tapis' || r.type === 'marche_course' ? 0.85 : 1.03)
  return Math.max(0, gross - restPerMin(p) * min)
}

/** Renfo ≈ 4 MET, musculation ≈ 5 MET (au-dessus du repos : MET − 1) */
export function renfoKcal(s: RenfoSession, p: Profile): number {
  return 3 * weight(p) * (s.durationMin / 60)
}
export function muscuKcal(s: MuscuSession, p: Profile): number {
  return 4 * weight(p) * (s.durationMin / 60)
}

export function plannedKcal(pl: PlannedWorkout, p: Profile): number {
  if (pl.done || pl.kind === 'repos') return 0
  if (pl.kind === 'run') {
    if (pl.targetDistanceKm) return pl.targetDistanceKm * weight(p) * 1.03 - restPerMin(p) * (pl.targetDurationMin ?? pl.targetDistanceKm * 7)
    return (pl.targetDurationMin ?? 40) * weight(p) * 0.13
  }
  const met = pl.kind === 'muscu' ? 4 : 3
  return met * weight(p) * ((pl.targetDurationMin ?? 30) / 60)
}

export function sessionsKcal(data: Pick<AppData, 'runs' | 'renfo' | 'muscu' | 'profile'>, date: ISODate): number {
  const p = data.profile
  return (
    sum(data.runs.filter((r) => r.date === date), (r) => runKcal(r, p)) +
    sum(data.renfo.filter((s) => s.date === date), (s) => renfoKcal(s, p)) +
    sum(data.muscu.filter((s) => s.date === date), (s) => muscuKcal(s, p))
  )
}

export interface DayEnergy {
  date: ISODate
  bmr: number
  /** Vie quotidienne hors sport (estimation, 0 quand la montre mesure) */
  daily: number
  /** Séances enregistrées */
  sport: number
  /** Séances prévues pas encore faites (aujourd'hui et à venir) */
  planned: number
  /** Calories actives mesurées par la montre (pas + sport) */
  measuredActive?: number
  steps?: number
  /** Digestion (~10 %) */
  tef: number
  /** Dépense totale de la journée */
  expenditure: number
  goalDelta: number
  /** Ce qu'il faudrait manger pour atteindre l'objectif */
  target: number
  source: 'montre' | 'estimation'
  manualTarget: boolean
}

export function dayEnergy(data: Pick<AppData, 'runs' | 'renfo' | 'muscu' | 'planned' | 'activity' | 'profile'>, date: ISODate, today = todayISO()): DayEnergy {
  const p = data.profile
  const b = Math.round(bmr(p))
  const sport = Math.round(sessionsKcal(data, date))
  const planned = date >= today ? Math.round(sum(data.planned.filter((x) => x.date === date), (x) => plannedKcal(x, p))) : 0
  const act = data.activity.find((a) => a.date === date)
  // La journée en cours n'est pas finie : on ne se fie à la montre que pour les jours passés où elle a été portée
  const measured = act && date < today && act.steps >= 3000 ? act : undefined
  const daily = measured ? 0 : Math.round(b * ACTIVITY_LEVELS[p.activityLevel ?? 'sedentaire'].pct)
  const active = measured ? Math.max(measured.activeKcal, sport) : daily + sport + planned
  const tef = Math.round(0.1 * (b + active))
  const expenditure = b + active + tef
  const goalDelta = CALORIE_GOALS[p.calorieGoal ?? 'maintien'].delta
  const target = p.kcalTarget ?? Math.round((expenditure + goalDelta) / 10) * 10
  return {
    date,
    bmr: b,
    daily,
    sport,
    planned,
    measuredActive: measured?.activeKcal,
    steps: act?.steps,
    tef,
    expenditure,
    goalDelta,
    target,
    source: measured ? 'montre' : 'estimation',
    manualTarget: p.kcalTarget != null,
  }
}

export interface Intake {
  kcal: number
  carbs: number
  protein: number
  fat: number
  count: number
  items: FoodEntry[]
}

export function dayIntake(food: FoodEntry[], date: ISODate): Intake {
  const items = food.filter((f) => f.date === date)
  return {
    kcal: Math.round(sum(items, (f) => f.kcal)),
    carbs: Math.round(sum(items, (f) => f.carbs ?? 0)),
    protein: Math.round(sum(items, (f) => f.protein ?? 0)),
    fat: Math.round(sum(items, (f) => f.fat ?? 0)),
    count: items.length,
    items,
  }
}

export interface BalanceDay {
  date: ISODate
  intake?: number
  expenditure: number
  target: number
  balance?: number
  /** Journée suffisamment renseignée pour compter dans les moyennes */
  complete: boolean
  isToday: boolean
}

/** Une journée compte si elle est terminée et contient au moins 1 000 kcal notées */
export const COMPLETE_DAY_KCAL = 1000

export function energyHistory(data: Pick<AppData, 'runs' | 'renfo' | 'muscu' | 'planned' | 'activity' | 'profile' | 'food'>, days: number, today = todayISO()): BalanceDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(today, -(days - 1 - i))
    const e = dayEnergy(data, date, today)
    const intake = dayIntake(data.food, date)
    const logged = intake.count > 0
    return {
      date,
      intake: logged ? intake.kcal : undefined,
      expenditure: e.expenditure,
      target: e.target,
      balance: logged ? intake.kcal - e.expenditure : undefined,
      complete: logged && date < today && intake.kcal >= COMPLETE_DAY_KCAL,
      isToday: date === today,
    }
  })
}

export interface BalanceStats {
  daysCounted: number
  avgIntake?: number
  avgExpenditure?: number
  avgBalance?: number
  totalBalance: number
  kgPerWeek?: number
  kgTotal: number
  verdict: { tone: 'good' | 'warning' | 'info'; title: string; text: string }
}

export function balanceStats(hist: BalanceDay[], goal: CalorieGoal = 'maintien'): BalanceStats {
  const days = hist.filter((d) => d.complete)
  const n = days.length
  const totalBalance = sum(days, (d) => d.balance ?? 0)
  const kgTotal = totalBalance / KCAL_PER_KG
  if (n < 3)
    return {
      daysCounted: n,
      totalBalance,
      kgTotal,
      verdict: { tone: 'info', title: 'Pas encore assez de données', text: 'Note tout ce que tu manges pendant au moins 3 journées complètes pour voir si tu es au-dessus ou en dessous de tes besoins.' },
    }
  const avgIntake = sum(days, (d) => d.intake ?? 0) / n
  const avgExpenditure = sum(days, (d) => d.expenditure) / n
  const avgBalance = avgIntake - avgExpenditure
  const kgPerWeek = (avgBalance * 7) / KCAL_PER_KG
  const fmt = (x: number) => Math.abs(Math.round(x)).toLocaleString('fr-FR')
  const kg = (x: number) => `${x > 0 ? '+' : '−'}${Math.abs(x).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} kg`
  let verdict: BalanceStats['verdict']
  if (avgBalance < -500)
    verdict = {
      tone: 'warning',
      title: `Gros déficit : −${fmt(avgBalance)} kcal par jour`,
      text: `Tu manges nettement moins que tu ne dépenses (≈ ${kg(kgPerWeek)} par semaine). Avec ton volume d’entraînement, ça augmente la fatigue et le risque de blessure : ajoute une collation les jours de séance et un féculent au dîner.`,
    }
  else if (avgBalance < -150)
    verdict = {
      tone: goal === 'perte' ? 'good' : 'warning',
      title: `En dessous de tes besoins : −${fmt(avgBalance)} kcal par jour`,
      text: goal === 'perte' ? `C’est un déficit raisonnable pour perdre doucement (≈ ${kg(kgPerWeek)} par semaine).` : `Tu manges un peu moins que tu ne dépenses (≈ ${kg(kgPerWeek)} par semaine). Si ton but est de garder ton poids, ajoute environ ${fmt(avgBalance)} kcal par jour.`,
    }
  else if (avgBalance > 150)
    verdict = {
      tone: goal === 'prise' ? 'good' : 'warning',
      title: `Au-dessus de tes besoins : +${fmt(avgBalance)} kcal par jour`,
      text: goal === 'prise' ? `Bon rythme pour prendre du poids (≈ ${kg(kgPerWeek)} par semaine).` : `Tu manges un peu plus que tu ne dépenses (≈ ${kg(kgPerWeek)} par semaine). Les jours sans séance, réduis les grignotages et les boissons sucrées.`,
    }
  else
    verdict = {
      tone: goal === 'maintien' ? 'good' : 'info',
      title: 'À l’équilibre',
      text: goal === 'maintien' ? 'Tu manges à peu près ce que tu dépenses : ton poids devrait rester stable.' : `Tu es à l’équilibre (±150 kcal). Pour ${goal === 'perte' ? 'perdre' : 'prendre'} du poids, il faut ${goal === 'perte' ? 'réduire' : 'augmenter'} d’environ 300 kcal par jour.`,
    }
  return { daysCounted: n, avgIntake, avgExpenditure, avgBalance, totalBalance, kgPerWeek, kgTotal, verdict }
}
