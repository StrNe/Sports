import { describe, expect, it } from 'vitest'
import { activitiesToData, cleanTitle, fetchCoros, parseHm, parseRestingHr, parseSchedule, parseSleep, parseSportRecords, parseThresholdPace, parseUserInfo, scheduleToPlanned } from './coros'
import { fromDocs, stableStringify, toDocs } from './cloud'
import { emptyData } from '../store/useStore'

// Exemples fictifs reproduisant le format texte renvoyé par le connecteur COROS
const RECORDS = `Sport Records — 2026-03-01 to 2026-03-10 (4 records)
========================

1. Outdoor Run — 2026-03-09
   Location: PLAN-S2-3-Seuil 3 × 8 min
   Start Coordinates: 45.0, 5.0
   Time Window: startTimestamp=1 | endTimestamp=2
   Duration: 52:10 | Distance: 9.12 km
   Average Pace: 5:43 /km | Avg HR: 165 bpm | Calories: 700 kcal
   LabelId: 111 | SportType: 100

2. Outdoor Run — 2026-03-08
   Location: Grenoble Course
   Duration: 1:31:00 | Distance: 16.40 km
   Average Pace: 5:33 /km | Avg HR: 150 bpm | Calories: 1200 kcal
   LabelId: 112 | SportType: 100

3. Outdoor Run — 2026-03-07
   Location: Grenoble Course
   Duration: 5:02 | Distance: 812 m
   LabelId: 113 | SportType: 100

4. Strength — 2026-03-06
   Location: Gainage
   Duration: 25:00 | Sets: 12
   LabelId: 114 | SportType: 402`

const SLEEP = `Sleep Overview
========================
Note: each record below is dated by its wake-up day.

2026-03-09
Sleep Score: 78
Daily Sleep: 8h 20min (incl. naps)
Main Sleep (asleep): 7h 50min
Deep Sleep Ratio: 14%
REM Ratio: 22%
Awake Time: 1h 5min
Main Sleep Window: 2026-03-08 23:10 - 2026-03-09 07:15
Naps Total (asleep): 30 min

2026-03-10
Sleep Score: 0
Sleep detail for this day is not available yet.

2026-03-11
Sleep Score: -1
Daily Sleep: 40min (incl. naps)
Naps Total (asleep): 40 min`

const SCHEDULE = `Training Schedule
========================

2026-03-12
EF 40 min + renfo A
Plan ID: 900000000000000001
idInPlan: 3
Distance: 6.10 km
Estimated Time: 40:00
Load: 40 TL

2026-03-12
Fartlek 30 min
Plan ID: 800000000000000001
idInPlan: 9
Distance: 5.00 km
Estimated Time: 30:00

2026-03-14
Sortie longue 18 km
Standalone workout (scheduled from the workout library)
idInPlan: 4
Distance: 18.00 km
Estimated Time: 1:50:00

Use Plan ID with queryTrainingPlanDetails before updateTrainingPlan.`

describe('lecture COROS', () => {
  it('durées au format COROS', () => {
    expect(parseHm('9h 51min')).toBe(591)
    expect(parseHm('52 min')).toBe(52)
    expect(parseHm('2h 0min')).toBe(120)
  })
  it('séances : course, distance en mètres, renforcement', () => {
    const { total, items } = parseSportRecords(RECORDS)
    expect(total).toBe(4)
    expect(items).toHaveLength(4)
    expect(items[2].distanceKm).toBeCloseTo(0.812)
    const { runs, renfo } = activitiesToData(items)
    expect(runs).toHaveLength(2) // < 1 km ignoré
    expect(runs[0]).toMatchObject({ id: 'coros-111', type: 'seuil', title: 'Seuil 3 × 8 min', distanceKm: 9.12, durationSec: 3130, avgHr: 165 })
    expect(runs[1]).toMatchObject({ type: 'sortie_longue', title: undefined })
    expect(renfo[0]).toMatchObject({ id: 'coros-114', durationMin: 25, title: 'Gainage' })
  })
  it('noms de séance', () => {
    expect(cleanTitle('21KM-S6-2-Endurance Fondamenta')).toBe('Endurance Fondamentale')
    expect(cleanTitle('Paris Course')).toBeUndefined()
    expect(cleanTitle('Tapis/Salle')).toBeUndefined()
  })
  it('sommeil : nuits complètes seulement', () => {
    const s = parseSleep(SLEEP)
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ date: '2026-03-09', bedtime: '23:10', wakeTime: '07:15', durationMin: 470, score: 78, quality: 4, deepPct: 14, awakeMin: 65, napMin: 30 })
  })
  it('FC de repos', () => {
    expect(parseRestingHr('2026-03-09: 52 bpm\n2026-03-08: No data\n2026-03-07: 50 bpm')).toEqual({ '2026-03-09': 52, '2026-03-07': 50 })
  })
  it('plan : un seul plan par jour (le plus récent) et renfo séparé', () => {
    const items = parseSchedule(SCHEDULE)
    expect(items).toHaveLength(3)
    const planned = scheduleToPlanned(items, new Set())
    expect(planned.map((p) => p.title)).toEqual(['EF 40 min + renfo A', 'Renfo A', 'Sortie longue 18 km'])
    expect(planned[0]).toMatchObject({ id: 'coros-plan-2026-03-12-run', targetDistanceKm: 6.1, targetDurationMin: 40, runType: 'ef' })
    expect(planned[2].runType).toBe('sortie_longue')
    expect(scheduleToPlanned(items, new Set(['2026-03-14'])).some((p) => p.date === '2026-03-14')).toBe(false)
  })
  it('profil', () => {
    expect(parseUserInfo('Height: 180.0 cm\nWeight: 70.5 kg\nBirthday: 1990-01-01 (Age: 36)\nGender: Female\nNickname: Sam')).toEqual({ heightCm: 180, weightKg: 70.5, birthYear: 1990, sex: 'F', name: 'Sam' })
    expect(parseThresholdPace('Threshold Pace: 4:58 /km')).toBe(298)
  })
  it('synchronisation complète avec un connecteur simulé', async () => {
    const calls: string[] = []
    const res = await fetchCoros(
      async (tool) => {
        calls.push(tool)
        if (tool === 'querySportRecords') return RECORDS
        if (tool === 'querySleepOverview') return SLEEP
        if (tool === 'queryRestingHeartRate') return '2026-03-09: 52 bpm'
        if (tool === 'queryTrainingSchedule') return SCHEDULE
        if (tool === 'queryUserInfo') return 'Weight: 70 kg'
        return 'Threshold Pace: 5:00 /km'
      },
      { lastDate: '2026-03-08', raceDates: new Set(), today: '2026-03-11' },
    )
    expect(calls.filter((c) => c === 'querySportRecords')).toHaveLength(1)
    expect(res.data.sleep?.[0].restingHr).toBe(52)
    expect(res.counts).toEqual({ runs: 2, renfo: 1, nights: 1, planned: 3 })
    expect(res.data.profile).toMatchObject({ weightKg: 70, thresholdPaceSec: 300 })
  })
})

describe('sauvegarde en ligne', () => {
  it('découpe et reconstitue les données', () => {
    const d = { ...emptyData(), runs: [{ id: 'a', date: '2025-12-30', type: 'ef' as const, distanceKm: 5, durationSec: 1800 }, { id: 'b', date: '2026-01-02', type: 'ef' as const, distanceKm: 6, durationSec: 2000 }] }
    const docs = toDocs(d)
    expect(Object.keys(docs).sort()).toEqual(['meta', 'runs-2025', 'runs-2026'])
    const back = fromDocs(Object.entries(docs).map(([id, data]) => ({ id, data })))
    expect(back.runs.map((r) => r.id)).toEqual(['b', 'a'])
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe(stableStringify({ a: [1, { c: 3, d: 2 }], b: 1 }))
  })
})

describe('sommeil enrichi', () => {
  it('lit le bilan VFC et ignore la série détaillée', async () => {
    const { parseSleepHrv } = await import('./coros')
    const text = `Sleep HRV — 2026-03-01 to 2026-03-07
========================

HRV Assessment — Last 7 days
========================

2026-03-07:
  HRV Avg: 41 ms — Normal
  Normal Range: 36 - 48 ms
  Baseline: 42 ms
2026-03-06:
  HRV Avg: 30 ms — Below normal
  Normal Range: 36 - 48 ms
  Baseline: 42 ms
2026-03-05:
  No data

Sleep HRV Time Series — Last 7 days
========================

2026-03-07:
  timestamp=1, timezone=4, hrv=22 ms, status=4, confidence=100000`
    expect(parseSleepHrv(text)).toEqual({
      '2026-03-07': { avg: 41, status: 'normal', low: 36, high: 48, baseline: 42 },
      '2026-03-06': { avg: 30, status: 'bas', low: 36, high: 48, baseline: 42 },
    })
  })
  it('phases et réveils', () => {
    const s = parseSleep(`2026-03-09\nSleep Score: 70\nMain Sleep (asleep): 7h 0min\nDeep Sleep Ratio: 12%\nLight Sleep Ratio: 60%\nREM Ratio: 20%\nAwake Time: 30 min\nAwake Count (>5 min): 2\nMain Sleep Window: 2026-03-08 23:30 - 2026-03-09 07:00\nNaps Total: 0 min`)
    expect(s[0]).toMatchObject({ lightPct: 60, awakeCount: 2, durationMin: 420 })
  })
  it('moyennes par jour (siestes comprises) et par jour de la semaine', async () => {
    const { sleepStats, sleepByWeekday } = await import('./insights')
    const nights = [
      { id: 'a', date: '2026-03-09', durationMin: 420, quality: 3, napMin: 60 }, // lundi
      { id: 'b', date: '2026-03-08', durationMin: 540, quality: 4 }, // dimanche
    ]
    const st = sleepStats(nights, 480, 7, '2026-03-09')
    expect(st.avgDailyMin).toBe(510)
    expect(st.avgMin).toBe(480)
    const wd = sleepByWeekday(nights, 8, '2026-03-09')
    expect(wd[0]).toMatchObject({ label: 'Lun', count: 1, nightMin: 420, napMin: 60 })
    expect(wd[6]).toMatchObject({ label: 'Dim', count: 1, nightMin: 540 })
  })
})
