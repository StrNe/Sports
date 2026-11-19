import type { AppData, MuscuSession, PlannedWorkout, RenfoSession, Run, RunType, SleepEntry } from '../types'
import { addDaysISO, todayISO, weekStartISO } from '../lib/format'
import { BUILTIN_RENFO } from './training'

/** Générateur pseudo-aléatoire déterministe (mulberry32) */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Jeu de données fictif pour découvrir l'application (profil « Alex »). */
export function demoData(): Partial<AppData> {
  const r = rng(42)
  const today = todayISO()
  const ws = weekStartISO(today)
  const runs: Run[] = []
  const renfo: RenfoSession[] = []
  const muscu: MuscuSession[] = []
  const sleep: SleepEntry[] = []
  const planned: PlannedWorkout[] = []
  const shoeA = 'demo-shoe-a'
  const shoeB = 'demo-shoe-b'

  const run = (date: string, type: RunType, km: number, pace: number, hr: number, title?: string, rpe?: number) => {
    if (date > today) return
    runs.push({
      id: `demo-run-${date}-${type}`,
      date,
      type,
      title,
      distanceKm: Math.round(km * 100) / 100,
      durationSec: Math.round(km * pace),
      avgHr: hr,
      elevationM: Math.round(km * (5 + r() * 12)),
      rpe,
      shoeId: r() > 0.3 ? shoeA : shoeB,
      source: 'manuel',
    })
  }

  for (let w = 11; w >= 0; w--) {
    const mon = addDaysISO(ws, -7 * w)
    const prog = (11 - w) / 11 // progression sur 12 semaines
    const deload = w === 4 || w === 8
    const f = deload ? 0.75 : 1
    run(addDaysISO(mon, 1), 'ef', (7 + prog * 2) * f, 372 - prog * 12 + r() * 10, 146 + Math.round(r() * 6), 'Footing EF', 3)
    run(addDaysISO(mon, 3), w % 2 ? 'seuil' : 'fractionne', 9 * f, 318 - prog * 10 + r() * 6, 165 + Math.round(r() * 5), w % 2 ? '3 × 10 min au seuil' : '8 × 400 m', 7)
    run(addDaysISO(mon, 4), 'recup', 5, 395 + r() * 10, 138 + Math.round(r() * 4), 'Footing récup', 2)
    run(addDaysISO(mon, 6), 'sortie_longue', (13 + prog * 7) * f, 380 - prog * 8 + r() * 10, 150 + Math.round(r() * 6), 'Sortie longue', 4)

    const tue = addDaysISO(mon, 1)
    const thu = addDaysISO(mon, 3)
    if (tue <= today) renfo.push({ id: `demo-renfo-a-${tue}`, date: tue, title: BUILTIN_RENFO[0].title, focus: 'bas_du_corps', durationMin: 25, exercises: BUILTIN_RENFO[0].exercises, rpe: 5 })
    if (thu <= today && w % 2 === 0) renfo.push({ id: `demo-renfo-b-${thu}`, date: thu, title: BUILTIN_RENFO[2].title, focus: 'gainage', durationMin: 10, exercises: BUILTIN_RENFO[2].exercises, rpe: 4 })

    const fri = addDaysISO(mon, 4)
    if (fri <= today) {
      const k = 1 + prog * 0.15
      muscu.push({
        id: `demo-muscu-${fri}`,
        date: fri,
        title: 'Full body coureur — A',
        durationMin: 55,
        rpe: 6,
        exercises: [
          { name: 'Squat', sets: [0, 1, 2].map(() => ({ reps: 6, weightKg: Math.round(70 * k / 2.5) * 2.5 })) },
          { name: 'Soulevé de terre roumain', sets: [0, 1, 2].map(() => ({ reps: 8, weightKg: Math.round(60 * k / 2.5) * 2.5 })) },
          { name: 'Fentes bulgares', sets: [0, 1, 2].map(() => ({ reps: 8, weightKg: Math.round(14 * k) })) },
          { name: 'Tractions', sets: [0, 1, 2].map(() => ({ reps: 6 + Math.round(prog * 2), weightKg: 0 })) },
        ],
      })
    }
  }

  for (let i = 0; i < 45; i++) {
    const date = addDaysISO(today, -i)
    if (r() < 0.12) continue
    const bed = 22 * 60 + 30 + Math.round((r() - 0.4) * 90)
    const dur = 400 + Math.round(r() * 110)
    const wake = (bed + dur + 15) % 1440
    const fmt = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    sleep.push({
      id: `demo-sleep-${date}`,
      date,
      bedtime: fmt(bed),
      wakeTime: fmt(wake),
      durationMin: dur,
      quality: Math.min(5, Math.max(1, Math.round(2 + (dur - 400) / 40 + r()))),
      restingHr: 50 + Math.round(r() * 5) + (dur < 420 ? 2 : 0),
      energy: Math.min(5, Math.max(1, Math.round(2.5 + r() * 2.5))),
    })
  }

  // Semaine prochaine planifiée
  const next = addDaysISO(ws, 7)
  const thisWeekPlan: [number, PlannedWorkout['kind'], string, RunType | undefined, number | undefined, number | undefined][] = [
    [1, 'run', 'Footing EF + lignes droites', 'ef', 9, 55],
    [1, 'renfo', 'Renfo A — Force & gainage', undefined, undefined, 25],
    [3, 'run', '3 × 10 min au seuil', 'seuil', 10, 60],
    [4, 'muscu', 'Full body coureur — A', undefined, undefined, 55],
    [6, 'run', 'Sortie longue 22 km', 'sortie_longue', 22, 140],
  ]
  for (const base of [ws, next]) {
    thisWeekPlan.forEach(([d, kind, title, runType, km, min]) => {
      const date = addDaysISO(base, d)
      planned.push({ id: `demo-plan-${date}-${kind}`, date, kind, title, runType, targetDistanceKm: km, targetDurationMin: min, done: date < today })
    })
  }

  return {
    profile: {
      name: 'Alex',
      sex: 'M',
      birthYear: 1994,
      heightCm: 178,
      weightKg: 70,
      hrMax: 190,
      hrRest: 52,
      efHrLimit: 152,
      vma: 15.5,
      weeklyKmGoal: 40,
      weeklySessionsGoal: 6,
      sleepGoalMin: 480,
      mainGoal: 'Semi-marathon sous 1 h 45',
      diet: 'omnivore',
    },
    runs,
    renfo,
    muscu,
    sleep,
    planned,
    shoes: [
      { id: shoeA, name: 'Chaussures route (démo)', startKm: 380, limitKm: 700 },
      { id: shoeB, name: 'Chaussures trail (démo)', startKm: 120, limitKm: 800 },
    ],
    races: [
      { id: 'demo-race-1', name: 'Semi-marathon (démo)', date: addDaysISO(today, 46), kind: 'route', distanceKm: 21.0975, priority: 'A', goalTimeSec: 6300, location: 'Ma ville' },
      { id: 'demo-race-2', name: '10 km de préparation (démo)', date: addDaysISO(today, 18), kind: 'route', distanceKm: 10, priority: 'C', goalTimeSec: 2880 },
      { id: 'demo-race-0', name: '10 km d’automne (démo)', date: addDaysISO(today, -40), kind: 'route', distanceKm: 10, priority: 'B', result: { timeSec: 2952, rank: '154 / 870' } },
    ],
    records: [{ id: 'demo-rec-5k', label: '5 km', distanceKm: 5, timeSec: 1395, date: addDaysISO(today, -70), where: 'Parkrun' }],
  }
}
