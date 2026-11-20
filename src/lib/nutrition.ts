import type { AppData, DayType, ISODate, MealSlot, Profile } from '../types'
import { addDaysISO } from './format'
import { RUN_TYPES } from './running'

export interface DayTypeMeta {
  label: string
  emoji: string
  carbsPerKg: [number, number]
  activityFactor: number
  summary: string
  tips: string[]
}

export const DAY_TYPES: Record<DayType, DayTypeMeta> = {
  repos: {
    label: 'Jour de repos',
    emoji: '🛋️',
    carbsPerKg: [3, 4],
    activityFactor: 1.45,
    summary: 'Moins de glucides, beaucoup de légumes et de protéines pour réparer.',
    tips: ['Fais le plein de légumes et de fruits (vitamines, antioxydants)', 'Protéines à chaque repas pour la reconstruction musculaire', 'Hydrate-toi même sans entraînement'],
  },
  facile: {
    label: 'Séance facile',
    emoji: '🚶',
    carbsPerKg: [4, 5],
    activityFactor: 1.6,
    summary: 'Alimentation équilibrée, pas besoin de surcharger en glucides.',
    tips: ['Un fruit ou une tartine 1 h avant si tu cours à jeun le matin', 'Une collation protéinée après le renfo'],
  },
  intense: {
    label: 'Séance intense',
    emoji: '⚡',
    carbsPerKg: [6, 7],
    activityFactor: 1.75,
    summary: 'Des glucides avant et après la séance pour la performance et la récup.',
    tips: ['Repas riche en glucides 3 h avant la séance', 'Collation glucides + protéines dans les 30 min après', 'Évite les repas trop gras ou fibreux avant de courir'],
  },
  long: {
    label: 'Sortie longue',
    emoji: '🏞️',
    carbsPerKg: [7, 8],
    activityFactor: 1.9,
    summary: 'Grosse dépense : recharge bien avant, pendant (> 1 h 15) et après.',
    tips: ['Pendant l’effort : 30–60 g de glucides/h au-delà de 1 h 15', 'Bois 400–600 ml/h selon la chaleur', 'Teste ici ta stratégie de ravitaillement de course'],
  },
  veille_course: {
    label: 'Veille de course',
    emoji: '🍝',
    carbsPerKg: [8, 10],
    activityFactor: 1.55,
    summary: 'Recharge en glucides, peu de fibres et de graisses, rien de nouveau.',
    tips: ['Privilégie pâtes/riz blancs, pommes de terre, pain blanc', 'Limite crudités, légumineuses et plats épicés', 'Dîner tôt (19 h) et léger en volume', 'Prépare ton petit-déjeuner de course'],
  },
  jour_course: {
    label: 'Jour de course',
    emoji: '🏁',
    carbsPerKg: [8, 10],
    activityFactor: 2,
    summary: 'Petit-déjeuner testé 3 h avant, ravitaillement régulier, récup après.',
    tips: ['Petit-déjeuner 3 h avant le départ', 'Encas digeste 1 h avant (compote, biscuits)', 'Pendant : glucides toutes les 20–30 min', 'Après : boisson de récup + vrai repas'],
  },
}

// ── Détection du type de journée ───────────────────────────
const INTENSE_PLAN = /(seuil|fraction|vma|côte|cote|test|tempo|allure|interval|\dx|\d ?× ?\d)/i

export function detectDayType(date: ISODate, data: Pick<AppData, 'races' | 'runs' | 'planned' | 'renfo' | 'muscu' | 'dayTypeOverrides'>): { type: DayType; reason: string; auto: boolean } {
  const override = data.dayTypeOverrides[date]
  if (override) return { type: override, reason: 'Choisi manuellement', auto: false }

  const race = data.races.find((r) => r.date === date)
  if (race) return { type: 'jour_course', reason: race.name, auto: true }
  const tomorrow = addDaysISO(date, 1)
  const raceTomorrow = data.races.find((r) => r.date === tomorrow && (r.priority !== 'C' || r.distanceKm >= 15))
  if (raceTomorrow) return { type: 'veille_course', reason: `${raceTomorrow.name} demain`, auto: true }

  const runs = data.runs.filter((r) => r.date === date)
  if (runs.length) {
    const totalMin = runs.reduce((a, r) => a + r.durationSec / 60, 0)
    if (runs.some((r) => r.type === 'sortie_longue') || totalMin >= 80) return { type: 'long', reason: 'Sortie longue enregistrée', auto: true }
    if (runs.some((r) => RUN_TYPES[r.type].intensity === 'intense')) return { type: 'intense', reason: 'Séance intense enregistrée', auto: true }
    return { type: 'facile', reason: 'Footing enregistré', auto: true }
  }

  const planned = data.planned.filter((p) => p.date === date && p.kind !== 'repos')
  const plannedRuns = planned.filter((p) => p.kind === 'run')
  if (plannedRuns.length) {
    const long = plannedRuns.some((p) => p.runType === 'sortie_longue' || /sortie longue/i.test(p.title) || (p.targetDurationMin ?? 0) >= 80)
    if (long) return { type: 'long', reason: plannedRuns[0].title, auto: true }
    const intense = plannedRuns.some((p) => (p.runType && RUN_TYPES[p.runType].intensity === 'intense') || INTENSE_PLAN.test(p.title))
    if (intense) return { type: 'intense', reason: plannedRuns[0].title, auto: true }
    return { type: 'facile', reason: plannedRuns[0].title, auto: true }
  }
  if (planned.length || data.renfo.some((s) => s.date === date) || data.muscu.some((s) => s.date === date))
    return { type: 'facile', reason: planned[0]?.title ?? 'Renforcement', auto: true }
  return { type: 'repos', reason: 'Aucune séance prévue', auto: true }
}

// ── Besoins du jour ────────────────────────────────────────
export interface DailyTargets {
  kcal: number
  carbs: [number, number]
  protein: number
  fat: number
  waterL: number
  weightUsed: number
  estimated: boolean
}

export function bmr(p: Profile, year = new Date().getFullYear()): number {
  const w = p.weightKg ?? 70
  const h = p.heightCm ?? 175
  const age = p.birthYear ? year - p.birthYear : 30
  return 10 * w + 6.25 * h - 5 * age + (p.sex === 'F' ? -161 : 5)
}

export function dailyTargets(p: Profile, dayType: DayType): DailyTargets {
  const w = p.weightKg ?? 70
  const meta = DAY_TYPES[dayType]
  const kcal = Math.round((bmr(p) * meta.activityFactor) / 50) * 50
  const carbs: [number, number] = [Math.round(meta.carbsPerKg[0] * w), Math.round(meta.carbsPerKg[1] * w)]
  const protein = Math.round(w * (dayType === 'repos' ? 1.6 : 1.7))
  const fat = Math.round(w * 1)
  const exerciseL = { repos: 0, facile: 0.5, intense: 0.8, long: 1.2, veille_course: 0.2, jour_course: 1.5 }[dayType]
  const waterL = Math.round((w * 0.035 + exerciseL) * 10) / 10
  return { kcal, carbs, protein, fat, waterL, weightUsed: w, estimated: !p.weightKg }
}

export const MEAL_SLOTS: { key: MealSlot; label: string; short: string; emoji: string; until: number }[] = [
  { key: 'petit_dej', label: 'Petit-déjeuner', short: 'Petit-déj', emoji: '☕', until: 11 },
  { key: 'dejeuner', label: 'Déjeuner', short: 'Déjeuner', emoji: '🍽️', until: 15 },
  { key: 'collation', label: 'Collation', short: 'Collation', emoji: '🍌', until: 18 },
  { key: 'diner', label: 'Dîner', short: 'Dîner', emoji: '🌙', until: 24 },
]

/** Le repas le plus probable selon l'heure */
export function slotForNow(d = new Date()): MealSlot {
  const h = d.getHours()
  return (MEAL_SLOTS.find((x) => h < x.until) ?? MEAL_SLOTS[3]).key
}
