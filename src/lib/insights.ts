import type { AppData, ISODate, Race, SleepEntry } from '../types'
import { addDaysISO, avg, clamp, daysBetween, hashString, todayISO, weekStartISO } from './format'
import { dailyLoads, intensitySplit, loadStatus, prepPhase, runsInRange, volumeIncrease, weeklyRunSummary, type LoadStatus } from './running'

// ── Sommeil ─────────────────────────────────────────────────
export function sleepStats(sleep: SleepEntry[], goalMin: number, days: number, today = todayISO()) {
  const from = addDaysISO(today, -(days - 1))
  const entries = sleep.filter((s) => s.date >= from && s.date <= today)
  const durations = entries.map((s) => s.durationMin)
  const avgMin = avg(durations)
  const debt = entries.reduce((acc, s) => acc + Math.max(0, goalMin - s.durationMin), 0)
  const quality = avg(entries.map((s) => s.quality))
  // Régularité : écart-type de l'heure de coucher (en minutes)
  const beds = entries
    .map((s) => s.bedtime)
    .filter(Boolean)
    .map((b) => {
      const [h, m] = b!.split(':').map(Number)
      let min = h * 60 + m
      if (min < 12 * 60) min += 1440 // après minuit → on prolonge la soirée
      return min
    })
  let regularity: number | undefined
  if (beds.length >= 3) {
    const mean = beds.reduce((a, b) => a + b, 0) / beds.length
    regularity = Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length)
  }
  const avgBed = beds.length ? beds.reduce((a, b) => a + b, 0) / beds.length : undefined
  return { count: entries.length, avgMin, debt, quality, regularity, avgBed, entries }
}

export function lastSleep(sleep: SleepEntry[], today = todayISO()): SleepEntry | undefined {
  return sleep.find((s) => s.date === today) ?? sleep.find((s) => s.date === addDaysISO(today, -1))
}

// ── Forme du jour ───────────────────────────────────────────
export interface Readiness {
  score: number
  label: string
  advice: string
  tone: 'good' | 'warning' | 'critical'
  factors: { label: string; value: string; impact: 'up' | 'down' | 'neutral' }[]
}

export function readiness(data: Pick<AppData, 'sleep' | 'runs' | 'renfo' | 'muscu' | 'profile'>, today = todayISO()): Readiness | undefined {
  const s = lastSleep(data.sleep, today)
  if (!s) return undefined
  const factors: Readiness['factors'] = []
  let score = 0

  const ratio = s.durationMin / (data.profile.sleepGoalMin || 480)
  const sleepPts = clamp(ratio, 0, 1.05) * 35
  score += sleepPts
  factors.push({ label: 'Durée de sommeil', value: `${Math.floor(s.durationMin / 60)} h ${String(Math.round(s.durationMin % 60)).padStart(2, '0')}`, impact: ratio >= 0.95 ? 'up' : ratio < 0.8 ? 'down' : 'neutral' })

  score += ((s.quality - 1) / 4) * 20
  factors.push({ label: 'Qualité ressentie', value: `${s.quality}/5`, impact: s.quality >= 4 ? 'up' : s.quality <= 2 ? 'down' : 'neutral' })

  const baselineHr = avg(data.sleep.filter((x) => x.restingHr && x.date < s.date && daysBetween(x.date, s.date) <= 21).map((x) => x.restingHr!))
  if (s.restingHr && baselineHr) {
    const delta = s.restingHr - baselineHr
    score += clamp(20 - Math.max(0, delta) * 3.3, 0, 20)
    factors.push({ label: 'FC de repos', value: `${s.restingHr} bpm (${delta >= 0 ? '+' : ''}${delta.toFixed(0)})`, impact: delta <= 1 ? 'up' : delta >= 4 ? 'down' : 'neutral' })
  } else score += 14

  const load: LoadStatus = loadStatus(dailyLoads(data.runs, data.renfo, data.muscu), today)
  const loadPts = { optimal: 15, sous: 14, vigilance: 8, risque: 2, inconnu: 12 }[load.zone]
  score += loadPts
  if (load.ratio) factors.push({ label: 'Ratio de charge', value: load.ratio.toFixed(2).replace('.', ','), impact: load.zone === 'optimal' || load.zone === 'sous' ? 'up' : 'down' })

  if (s.energy) {
    score += ((s.energy - 3) / 2) * 5 + 5
    factors.push({ label: 'Énergie au réveil', value: `${s.energy}/5`, impact: s.energy >= 4 ? 'up' : s.energy <= 2 ? 'down' : 'neutral' })
  } else score += 5
  if (s.soreness && s.soreness >= 4) {
    score -= (s.soreness - 3) * 6
    factors.push({ label: 'Courbatures', value: `${s.soreness}/5`, impact: 'down' })
  }
  score += 5
  score = Math.round(clamp(score, 0, 100))

  if (score >= 75) return { score, label: 'En pleine forme', advice: 'Feu vert pour une séance de qualité.', tone: 'good', factors }
  if (score >= 55) return { score, label: 'Forme correcte', advice: 'Séance prévue OK, mais reste à l’écoute des sensations.', tone: 'warning', factors }
  return { score, label: 'Récupération conseillée', advice: 'Privilégie un footing très facile, du renfo léger ou du repos.', tone: 'critical', factors }
}

// ── Course objectif ────────────────────────────────────────
export function upcomingRaces(races: Race[], today = todayISO()): Race[] {
  return races.filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date))
}

export function nextGoalRace(races: Race[], today = todayISO()): Race | undefined {
  const up = upcomingRaces(races, today)
  return up.find((r) => r.priority === 'A') ?? up[0]
}

// ── Conseils contextuels ───────────────────────────────────
export interface Tip {
  id: string
  emoji: string
  title: string
  text: string
  tone?: 'info' | 'warning'
}

const GENERIC_TIPS: Omit<Tip, 'id'>[] = [
  { emoji: '🐢', title: 'Ralentis pour progresser', text: '80 % de ton temps de course devrait se faire en endurance fondamentale : tu dois pouvoir parler en phrases complètes.' },
  { emoji: '📈', title: 'Règle des 10 %', text: 'N’augmente pas ton volume hebdomadaire de plus de 10 % d’une semaine à l’autre, et prévois une semaine allégée toutes les 3–4 semaines.' },
  { emoji: '🦶', title: 'Change de chaussures à temps', text: 'L’amorti d’une chaussure de course diminue nettement après 600 à 800 km.' },
  { emoji: '💤', title: 'Le sommeil, ton meilleur dopant', text: 'C’est pendant le sommeil profond que l’hormone de croissance répare tes muscles. Vise 7 h 30 à 9 h.' },
  { emoji: '🏋️', title: 'Renfo = moins de blessures', text: 'Deux séances de renforcement par semaine réduisent nettement le risque de blessure chez le coureur.' },
  { emoji: '🍌', title: 'Fenêtre de récupération', text: 'Dans les 30 minutes après une séance dure : des glucides et 20 g de protéines (ex. lait chocolaté + banane).' },
  { emoji: '💧', title: 'Hydratation', text: 'Pèse-toi avant et après une sortie : chaque kilo perdu correspond à environ 1 L d’eau à recompenser.' },
  { emoji: '🧘', title: 'Mobilité', text: '10 minutes de mobilité après la course améliorent l’amplitude de ta foulée sur le long terme.' },
  { emoji: '🎯', title: 'Rien de nouveau le jour J', text: 'Chaussures, tenue, petit-déjeuner, gels : tout doit avoir été testé à l’entraînement.' },
  { emoji: '⛰️', title: 'Les côtes, du renfo déguisé', text: 'Des montées courtes (30–60 s) développent la force et la puissance sans le stress du fractionné sur plat.' },
  { emoji: '🫀', title: 'Surveille ta FC de repos', text: 'Une FC de repos supérieure de 5+ bpm à ta moyenne peut signaler fatigue, stress ou maladie.' },
  { emoji: '🚶', title: 'La marche est une arme', text: 'En ultra et en Backyard, marcher dans les montées et quelques minutes par boucle économise beaucoup d’énergie.' },
]

export function coachTips(data: AppData, today = todayISO()): Tip[] {
  const tips: Tip[] = []
  const weeks = weeklyRunSummary(data.runs, 5, today)
  const inc = volumeIncrease(weeks)
  if (inc != null && inc > 15)
    tips.push({ id: 'volume', emoji: '⚠️', tone: 'warning', title: 'Volume en forte hausse', text: `Ton kilométrage de la semaine dépasse de ${Math.round(inc)} % ta moyenne récente. Garde les prochains footings très faciles.` })

  const load = loadStatus(dailyLoads(data.runs, data.renfo, data.muscu), today)
  if (load.zone === 'risque' || load.zone === 'vigilance') tips.push({ id: 'load', emoji: '🔥', tone: 'warning', title: load.label, text: load.advice })

  const last28 = runsInRange(data.runs, addDaysISO(today, -27), today)
  const split = intensitySplit(last28, data.profile.efHrLimit)
  if (split && last28.length >= 4 && split.easyPct < 70)
    tips.push({
      id: 'polar',
      emoji: '🐢',
      tone: 'warning',
      title: 'Trop d’intensité',
      text: `Seulement ${Math.round(split.easyPct)} % de ton temps de course est en endurance facile ces 4 dernières semaines${split.basis === 'fc' ? ` (FC ≤ ${data.profile.efHrLimit} bpm)` : ''}. Vise 80 % : ralentis tes footings.`,
    })

  const ss = sleepStats(data.sleep, data.profile.sleepGoalMin, 7, today)
  if (ss.count >= 3 && ss.avgMin && ss.avgMin < data.profile.sleepGoalMin - 30)
    tips.push({ id: 'sleep', emoji: '😴', tone: 'warning', title: 'Dette de sommeil', text: `Tu dors en moyenne ${Math.floor(ss.avgMin / 60)} h ${String(Math.round(ss.avgMin % 60)).padStart(2, '0')} cette semaine, sous ton objectif. Essaie de te coucher 30 min plus tôt.` })
  if (ss.regularity && ss.regularity > 60)
    tips.push({ id: 'regularity', emoji: '🕰️', title: 'Horaires irréguliers', text: 'Tes heures de coucher varient de plus d’une heure. Un rythme régulier améliore la qualité du sommeil et la récupération.' })

  const ws = weekStartISO(today)
  const renfoWeek = data.renfo.filter((s) => s.date >= ws).length
  if (renfoWeek === 0 && daysBetween(ws, today) >= 3)
    tips.push({ id: 'renfo', emoji: '💪', title: 'Pense au renfo', text: 'Pas encore de renforcement cette semaine : 20 minutes de gainage et de squats suffisent.' })

  const race = nextGoalRace(data.races, today)
  if (race) {
    const d = daysBetween(today, race.date)
    const phase = prepPhase(d, race)
    tips.push({ id: 'phase', emoji: '🎯', title: `${phase.label} — J-${d}`, text: phase.advice })
  }

  const shoesWorn = data.shoes.filter((s) => !s.retired).find((s) => {
    const km = s.startKm + data.runs.filter((r) => r.shoeId === s.id).reduce((a, r) => a + r.distanceKm, 0)
    return km >= s.limitKm * 0.9
  })
  if (shoesWorn) tips.push({ id: 'shoes', emoji: '👟', title: 'Chaussures en fin de vie', text: `Tes ${shoesWorn.name} approchent de leur limite kilométrique. Pense à les remplacer.` })

  const g = GENERIC_TIPS[hashString(today) % GENERIC_TIPS.length]
  tips.push({ id: 'daily', ...g })
  return tips
}

export function dayLabelCount(n: number): string {
  return n === 0 ? 'Aucune' : String(n)
}

export function isSameWeek(a: ISODate, b: ISODate): boolean {
  return weekStartISO(a) === weekStartISO(b)
}
