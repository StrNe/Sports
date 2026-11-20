import { describe, expect, it } from 'vitest'
import { attachCourses, compareSession, expandSteps, fmtStepAmount, fmtTarget, isStructured, judgeWholeRun, needsLapCheck, parseLaps, parsePlanCourses, parseScheduledCourse, plannedForRun } from './workout'
import { fetchCoros } from './coros'
import type { PlannedWorkout, Run } from '../types'

// Exemples fictifs reproduisant le format renvoyé par le connecteur COROS
const PLAN = `Training Plan Detail
========================
Plan ID: 111
Name: Bloc test

Days (dayNo 0-2)
------------------------
Day 0 - 2026-03-02
Rest day
Day 1 - 2026-03-03
Course 1 [Not started, score 0.0]
Course: Footing 40 min
Course JSON: {"dayNo":1,"courseName":"Footing 40 min","courseDescription":"Tout en aisance, FC sous 160.","sportType":1,"sections":[{"sectionType":2,"targetType":2,"targetValue":2400,"intensityType":1,"intensityValueStart":120,"intensityValueEnd":160}]}
Day 2 - 2026-03-04
Course 1 [Not started, score 0.0]
Course: Seuil 3 x 1 km
Course JSON: {"dayNo":2,"courseName":"Seuil 3 x 1 km","courseDescription":"Récup en trottinant.","sportType":1,"sections":[{"sectionType":1,"targetType":2,"targetValue":600,"intensityType":1,"intensityValueStart":110,"intensityValueEnd":150},{"intervalGroup":true,"repeats":3,"sets":[{"sectionType":2,"targetType":1,"targetValue":1000,"intensityType":2,"intensityValueStart":290,"intensityValueEnd":300},{"sectionType":3,"targetType":2,"targetValue":90}]},{"sectionType":4,"targetType":4}]}
`

const STANDALONE = `Scheduled Workout Detail
========================
Date: 2026-03-05
idInPlan: 7
Name: Lignes droites
Course JSON: {"courseName":"Lignes droites","sections":[{"sectionType":2,"targetType":2,"targetValue":1200}]}
`

const LAPS = JSON.stringify({
  lapGroups: [
    { type: 10, laps: [{ distance: 100000, time: 300, avgHr: 150 }] },
    {
      type: 2,
      laps: [
        { distance: 160000, time: 600, avgHr: 140 },
        { distance: 100000, time: 280, avgHr: 172 }, // 4:40 : trop rapide (au-delà des 5 s de marge)
        { distance: 30000, time: 90, avgHr: 150 },
        { distance: 100000, time: 296, avgHr: 175 }, // 4:56 : dans la cible
        { distance: 30000, time: 90, avgHr: 152 },
        { distance: 100000, time: 312, avgHr: 176 }, // 5:12 : trop lent
        { distance: 30000, time: 90, avgHr: 150 },
        { distance: 120000, time: 700, avgHr: 138 },
      ],
    },
    { type: -1, laps: [{ distance: 800000, time: 2963 }] },
  ],
})

describe('séances structurées COROS', () => {
  it('lit les séances d’un plan, jour par jour', () => {
    const c = parsePlanCourses(PLAN)
    expect(c.map((x) => `${x.date} ${x.name}`)).toEqual(['2026-03-03 Footing 40 min', '2026-03-04 Seuil 3 x 1 km'])
    expect(c[0].description).toBe('Tout en aisance, FC sous 160.')
    expect(c[0].steps).toEqual([{ kind: 'work', durationSec: 2400, target: { type: 'hr', min: 120, max: 160 } }])
    const seuil = c[1].steps
    expect(seuil[1]).toEqual({ repeat: 3, steps: [{ kind: 'work', distanceM: 1000, target: { type: 'pace', min: 290, max: 300 } }, { kind: 'recovery', durationSec: 90 }] })
    expect(seuil[2]).toEqual({ kind: 'cooldown' })
    expect(expandSteps(seuil)).toHaveLength(8)
    expect(isStructured(seuil)).toBe(true)
    expect(isStructured(c[0].steps)).toBe(false)
  })

  it('lit une séance autonome', () => {
    expect(parseScheduledCourse(STANDALONE)).toEqual({ date: '2026-03-05', name: 'Lignes droites', description: undefined, steps: [{ kind: 'work', durationSec: 1200 }] })
    expect(parseScheduledCourse('rien')).toBeUndefined()
  })

  it('rattache le déroulé à la bonne séance prévue', () => {
    const planned: PlannedWorkout[] = [
      { id: 'a', date: '2026-03-04', kind: 'run', title: 'Seuil 3 x 1 km' },
      { id: 'b', date: '2026-03-04', kind: 'renfo', title: 'Renfo A' },
    ]
    const out = attachCourses(planned, parsePlanCourses(PLAN))
    expect(out[0].steps).toHaveLength(3)
    expect(out[0].notes).toBe('Récup en trottinant.')
    expect(out[1].steps).toBeUndefined()
  })

  it('formate étapes et cibles', () => {
    expect(fmtStepAmount({ distanceM: 1000 })).toBe('1,0 km')
    expect(fmtStepAmount({ durationSec: 90 })).toBe('1 min 30')
    expect(fmtStepAmount({})).toBe('libre')
    expect(fmtTarget({ type: 'pace', min: 290, max: 300 })).toBe('4:50–5:00 /km')
    expect(fmtTarget({ type: 'hr', min: 120, max: 160 })).toBe('FC 120–160')
  })

  it('compare chaque étape à sa cible', () => {
    const steps = parsePlanCourses(PLAN)[1].steps
    const check = compareSession(steps, parseLaps(LAPS), 1)
    expect(check.aligned).toBe(true)
    const work = check.results.filter((r) => r.kind === 'work')
    expect(work.map((r) => r.verdict)).toEqual(['fast', 'in', 'slow'])
    expect(work.map((r) => r.rep)).toEqual([1, 2, 3])
    expect(check.results[0]).toMatchObject({ kind: 'warmup', sec: 600, m: 1600, hr: 140, verdict: 'in' })
    // Un tour en plus ou en moins : pas de comparaison détaillée
    expect(compareSession(steps, parseLaps(LAPS)?.slice(1), 1)).toEqual({ aligned: false, results: [], at: 1 })
  })

  it('juge une séance d’un seul bloc sur la sortie entière', () => {
    const steps = parsePlanCourses(PLAN)[0].steps
    expect(judgeWholeRun(steps, { durationSec: 2400, distanceKm: 6.2, avgHr: 152 })?.verdict).toBe('in')
    expect(judgeWholeRun(steps, { durationSec: 2400, distanceKm: 6.2, avgHr: 171 })?.verdict).toBe('high')
  })

  it('ne relit les tours que pour une séance structurée pas encore comparée', () => {
    const planned: PlannedWorkout[] = [{ id: 'p', date: '2026-03-04', kind: 'run', title: 'Seuil 3 x 1 km', steps: parsePlanCourses(PLAN)[1].steps }]
    const run: Run = { id: 'coros-9', date: '2026-03-04', type: 'seuil', title: 'Seuil 3 x 1 km', distanceKm: 8, durationSec: 2963, source: 'coros' }
    expect(plannedForRun(run, planned)?.id).toBe('p')
    expect(needsLapCheck(run, planned)).toBe(true)
    expect(needsLapCheck({ ...run, check: { aligned: true, results: [], at: 1 } }, planned)).toBe(false)
    expect(needsLapCheck({ ...run, source: 'manuel' }, planned)).toBe(false)
  })

  it('la synchro ajoute le déroulé et le prévu / réalisé', async () => {
    const SCHEDULE = 'Training Schedule\n\n2026-03-04\nSeuil 3 x 1 km\nPlan ID: 111\nidInPlan: 2\nDistance: 8.00 km\nEstimated Time: 45:00\n\n2026-03-05\nLignes droites\nStandalone workout (scheduled from the workout library)\nidInPlan: 7\nDistance: 4.00 km\nEstimated Time: 20:00'
    const RECORDS = 'Sport Records — (1 records)\n\n1. Outdoor Run — 2026-03-04\n   Location: Seuil 3 x 1 km\n   Duration: 49:23 | Distance: 8.00 km\n   Average Pace: 6:10 /km | Avg HR: 160 bpm | Calories: 600 kcal\n   LabelId: 9 | SportType: 100'
    const calls: string[] = []
    const call = async (tool: string, input: Record<string, unknown>) => {
      calls.push(`${tool} ${JSON.stringify(input)}`)
      if (tool === 'querySportRecords') return RECORDS
      if (tool === 'queryTrainingSchedule') return SCHEDULE
      if (tool === 'queryTrainingPlanDetails') return PLAN
      if (tool === 'queryScheduledWorkoutDetails') return STANDALONE
      if (tool === 'queryActivityLapData') return LAPS
      return ''
    }
    const res = await fetchCoros(call, { lastDate: '2026-03-03', raceDates: new Set(), today: '2026-03-05', hasHrv: true })
    const seuil = res.data.planned?.find((p) => p.title === 'Seuil 3 x 1 km')
    expect(seuil?.steps).toHaveLength(3)
    expect(res.data.planned?.find((p) => p.title === 'Lignes droites')?.steps).toEqual([{ kind: 'work', durationSec: 1200 }])
    expect(res.checks['coros-9']?.aligned).toBe(true)
    expect(calls.some((c) => c.startsWith('queryActivityLapData {"labelId":"9","sportType":100}'))).toBe(true)
    // Un seul appel pour tout le plan
    expect(calls.filter((c) => c.startsWith('queryTrainingPlanDetails'))).toHaveLength(1)
  })
})
