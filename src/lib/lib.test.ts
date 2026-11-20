import { describe, expect, it } from 'vitest'
import { fmtDuration, fmtPace, parseDuration, parsePace, sleepDurationMin, addDaysISO, weekStartISO } from './format'
import { bestEfforts, dailyLoads, intensitySplit, karvonenZones, loadStatus, predictTime, prepPhase, riegel, timeFromVdot, vdotFromPerformance } from './running'
import { candidateMeals, dailyTargets, detectDayType, mealFitsProfile } from './nutrition'
import { MEALS } from '../data/meals'
import { emptyData, normalizeData } from '../store/useStore'
import type { Run } from '../types'

const run = (date: string, km: number, sec: number, extra: Partial<Run> = {}): Run => ({ id: `${date}-${km}`, date, type: 'ef', distanceKm: km, durationSec: sec, ...extra })

describe('format', () => {
  it('parse les durées', () => {
    expect(parseDuration('45')).toBe(2700)
    expect(parseDuration('45:30')).toBe(2730)
    expect(parseDuration('1:02:15')).toBe(3735)
    expect(parseDuration('1h02')).toBe(3720)
    expect(parseDuration('abc')).toBeUndefined()
  })
  it('formate durées et allures', () => {
    expect(fmtDuration(3735)).toBe('1:02:15')
    expect(fmtDuration(605)).toBe('10:05')
    expect(fmtPace(330)).toBe('5:30')
    expect(parsePace('5:30')).toBe(330)
  })
  it('calcule la durée de sommeil en passant minuit', () => {
    expect(sleepDurationMin('23:30', '07:15')).toBe(465)
    expect(sleepDurationMin('01:00', '09:00')).toBe(480)
  })
  it('gère les semaines du lundi au dimanche', () => {
    expect(weekStartISO('2026-11-19')).toBe('2026-11-16')
    expect(weekStartISO('2026-11-22')).toBe('2026-11-16')
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('course', () => {
  it('VDOT cohérent avec les tables de Daniels', () => {
    // 5 km en 20:00 ≈ VDOT 49,8 ; 10 km en 40:00 ≈ VDOT 51,9
    expect(vdotFromPerformance(5, 1200)!).toBeCloseTo(49.8, 0)
    expect(vdotFromPerformance(10, 2400)!).toBeCloseTo(51.9, 0)
    const v = vdotFromPerformance(5, 1200)!
    expect(Math.abs(timeFromVdot(v, 5) - 1200)).toBeLessThan(2)
  })
  it('formule de Riegel', () => {
    expect(Math.round(riegel(1200, 5, 10))).toBe(2502)
  })
  it('prédit depuis la performance la plus proche', () => {
    const p = predictTime(
      [
        { distanceKm: 5, timeSec: 1587, date: '2026-11-17', source: '5 km', exact: true },
        { distanceKm: 21.0975, timeSec: 9338, date: '2026-11-01', source: 'Semi', exact: true },
      ],
      26.8,
    )
    expect(p?.from.source).toBe('Semi')
  })
  it('ne calcule pas de ratio de charge sans historique suffisant', () => {
    const loads = dailyLoads([run('2026-11-19', 10, 3600)], [], [])
    expect(loadStatus(loads, '2026-11-19').zone).toBe('inconnu')
  })
  it('détecte une hausse brutale de charge', () => {
    const runs: Run[] = []
    for (let i = 7; i < 35; i += 2) runs.push(run(addDaysISO('2026-11-19', -i), 6, 2400))
    for (let i = 0; i < 7; i++) runs.push(run(addDaysISO('2026-11-19', -i), 12, 4800, { id: `big${i}` }))
    expect(loadStatus(dailyLoads(runs, [], []), '2026-11-19').zone).toBe('risque')
  })
  it('répartition 80/20 basée sur la FC', () => {
    const s = intensitySplit([run('2026-11-10', 8, 3000, { avgHr: 150 }), run('2026-11-12', 8, 1000, { avgHr: 175 })], 160)
    expect(s?.basis).toBe('fc')
    expect(Math.round(s!.easyPct)).toBe(75)
  })
  it('meilleures performances estimées', () => {
    const b = bestEfforts([run('2026-11-01', 21.3, 9338)], [], [])
    expect(b.find((x) => x.key === 'semi')?.estimated).toBe(true)
  })
  it('phases de préparation', () => {
    expect(prepPhase(100).key).toBe('base')
    expect(prepPhase(60).key).toBe('developpement')
    expect(prepPhase(20).key).toBe('specifique')
    expect(prepPhase(10).key).toBe('affutage')
    expect(prepPhase(3).key).toBe('semaine_course')
  })
  it('zones de Karvonen', () => {
    const z = karvonenZones(195, 55)
    expect(z[1].min).toBe(139)
    expect(z[4].max).toBe(195)
  })
})

describe('nutrition', () => {
  it('respecte le régime', () => {
    const p = { ...emptyData().profile, diet: 'vegan' as const }
    for (const slot of ['petit_dej', 'dejeuner', 'collation', 'diner'] as const) {
      const list = candidateMeals(slot, 'repos', p)
      expect(list.length).toBeGreaterThan(0)
      expect(list.every((m) => m.diet === 'vegan')).toBe(true)
    }
    const pesce = { ...p, diet: 'pescetarien' as const }
    expect(MEALS.filter((m) => mealFitsProfile(m, pesce)).some((m) => m.diet === 'omnivore')).toBe(false)
  })
  it('chaque créneau a des idées pour chaque type de journée', () => {
    const p = emptyData().profile
    for (const slot of ['petit_dej', 'dejeuner', 'collation', 'diner'] as const)
      for (const t of ['repos', 'facile', 'intense', 'long', 'veille_course', 'jour_course'] as const) expect(candidateMeals(slot, t, p).length).toBeGreaterThan(0)
  })
  it('identifiants de repas uniques', () => {
    expect(new Set(MEALS.map((m) => m.id)).size).toBe(MEALS.length)
  })
  it('détecte veille et jour de course', () => {
    const d = { ...emptyData(), races: [{ id: 'r', name: 'Semi', date: '2026-12-06', kind: 'route' as const, distanceKm: 21.1, priority: 'A' as const }] }
    expect(detectDayType('2026-12-05', d).type).toBe('veille_course')
    expect(detectDayType('2026-12-06', d).type).toBe('jour_course')
    expect(detectDayType('2026-12-01', d).type).toBe('repos')
  })
  it('détecte une sortie longue planifiée', () => {
    const d = { ...emptyData(), planned: [{ id: 'p', date: '2026-11-22', kind: 'run' as const, title: 'Sortie longue 11,5 km' }] }
    expect(detectDayType('2026-11-22', d).type).toBe('long')
  })
  it('besoins plus élevés les jours de sortie longue', () => {
    const p = { ...emptyData().profile, weightKg: 77 }
    expect(dailyTargets(p, 'long').carbs[0]).toBeGreaterThan(dailyTargets(p, 'repos').carbs[1])
  })
})

describe('données', () => {
  it('normalise une sauvegarde partielle', () => {
    const d = normalizeData({ runs: [run('2026-11-19', 5, 1800)] })
    expect(d.runs).toHaveLength(1)
    expect(d.sleep).toEqual([])
    expect(d.renfoTemplates.length).toBeGreaterThan(0)
    expect(d.profile.sleepGoalMin).toBe(480)
  })
})

describe('records', () => {
  it('privilégie le résultat officiel à la séance du même jour', () => {
    const races = [{ id: 's', name: 'Semi', date: '2026-11-01', kind: 'route' as const, distanceKm: 21.0975, priority: 'A' as const, result: { timeSec: 9338 } }]
    const b = bestEfforts([run('2026-11-01', 21.3, 9338)], races, [])
    const semi = b.find((x) => x.key === 'semi')!
    expect(semi.estimated).toBe(false)
    expect(semi.timeSec).toBe(9338)
  })
})

describe('import répété', () => {
  it('met à jour sans doublon et conserve les modifications', async () => {
    const { useStore } = await import('../store/useStore')
    const st = useStore.getState()
    st.resetAll()
    st.mergeAll({ runs: [run('2026-11-19', 5.08, 2400, { id: 'coros-1', title: 'EF' })], planned: [{ id: 'p1', date: '2026-11-19', kind: 'run', title: 'EF 40' }], profile: { ...emptyData().profile, name: 'Lucas', weightKg: 77 } })
    useStore.getState().upsert('runs', { ...useStore.getState().runs[0], rpe: 4, notes: 'bien' })
    useStore.getState().upsert('planned', { ...useStore.getState().planned[0], done: true })
    useStore.getState().setProfile({ weightKg: 76 })
    const { added } = useStore.getState().mergeAll({
      runs: [run('2026-11-19', 5.08, 2400, { id: 'coros-1', title: 'EF' }), run('2026-11-19', 5.1, 2410, { id: 'fit-x' }), run('2026-11-20', 6, 2600, { id: 'coros-2' })],
      planned: [{ id: 'p1', date: '2026-11-19', kind: 'run', title: 'EF 45' }],
      profile: { ...emptyData().profile, name: 'Lucas', weightKg: 77.3 },
    })
    const s = useStore.getState()
    expect(added).toBe(1)
    expect(s.runs).toHaveLength(2)
    expect(s.runs.find((r) => r.id === 'coros-1')?.rpe).toBe(4)
    expect(s.planned[0].title).toBe('EF 45')
    expect(s.planned[0].done).toBe(true)
    expect(s.profile.weightKg).toBe(76)
  })
})
