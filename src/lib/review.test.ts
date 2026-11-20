import { describe, expect, it } from 'vitest'
import { pendingReview, weekReview } from './review'
import { emptyData } from '../store/useStore'
import type { AppData } from '../types'

// Semaine du lundi 9 au dimanche 15 mars 2026 ; « aujourd'hui » = lundi 16
function sample(): AppData {
  const d = emptyData()
  d.profile = { ...d.profile, sleepGoalMin: 480, weightKg: 70, heightCm: 178, birthYear: 1995, sex: 'M' }
  d.runs = [
    { id: 'r1', date: '2026-03-10', type: 'ef', distanceKm: 8, durationSec: 2880 },
    { id: 'r2', date: '2026-03-12', type: 'seuil', distanceKm: 10, durationSec: 3300 },
    { id: 'r3', date: '2026-03-15', type: 'sortie_longue', distanceKm: 16, durationSec: 6000 },
    { id: 'p1', date: '2026-03-03', type: 'ef', distanceKm: 12, durationSec: 4300 },
    { id: 'p2', date: '2026-03-07', type: 'sortie_longue', distanceKm: 14, durationSec: 5200 },
  ]
  d.planned = [
    { id: 'pl1', date: '2026-03-10', kind: 'run', title: 'EF' },
    { id: 'pl2', date: '2026-03-12', kind: 'run', title: 'Seuil' },
    { id: 'pl3', date: '2026-03-14', kind: 'renfo', title: 'Renfo A' },
    { id: 'pl4', date: '2026-03-15', kind: 'run', title: 'Sortie longue' },
  ]
  d.sleep = ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'].map((date, i) => ({ id: `s${i}`, date, durationMin: i < 3 ? 400 : 470, quality: 3, score: 70 + i }))
  d.chores = [
    { id: 'c1', date: '2026-03-09', name: 'Vaisselle' },
    { id: 'c2', date: '2026-03-11', name: 'Vaisselle' },
    { id: 'c3', date: '2026-03-14', name: 'Lessive' },
    { id: 'c4', date: '2026-03-04', name: 'Vaisselle' },
  ]
  d.weights = [
    { id: 'w0', date: '2026-03-02', kg: 70.4 },
    { id: 'w1', date: '2026-03-15', kg: 69.8 },
  ]
  return d
}

describe('bilan de la semaine', () => {
  it('chiffres clés et comparaison avec la semaine d’avant', () => {
    const r = weekReview(sample(), '2026-03-11', '2026-03-16')
    expect(r.weekStart).toBe('2026-03-09')
    expect(r.complete).toBe(true)
    expect(r.run).toMatchObject({ km: 34, count: 3, prevKm: 26, longest: { km: 16, date: '2026-03-15' } })
    // 3 sorties prévues faites, renfo du samedi non fait
    expect(r.sessions).toMatchObject({ planned: 4, plannedDone: 3, total: 3 })
    expect(r.sleep).toMatchObject({ nights: 4, under: 3 })
    expect(r.chores).toMatchObject({ count: 3, prevCount: 1 })
    expect(r.chores.top[0]).toEqual({ name: 'Vaisselle', count: 2 })
    expect(r.weight.delta).toBe(-0.6)
    expect(r.days.map((x) => x.km)).toEqual([0, 8, 0, 10, 0, 0, 16])
  })

  it('phrases de synthèse', () => {
    const h = weekReview(sample(), '2026-03-09', '2026-03-16').highlights
    const byTopic = Object.fromEntries(h.map((x) => [x.topic, x]))
    expect(byTopic.run.text).toBe('34 km en 3 sorties, en hausse de 31 %. Plus longue sortie : 16 km dimanche. Hausse marquée : garde les prochains footings bien faciles.')
    expect(byTopic.run.tone).toBe('warning')
    expect(byTopic.plan.text).toBe('Plan suivi à 75 % : 3 séances faites sur 4 prévues.')
    expect(byTopic.sleep.tone).toBe('warning')
    expect(byTopic.sleep.text).toContain('3 nuits trop courtes')
    expect(byTopic.weight.text).toBe('Poids : −0,6 kg (69,8 kg à la dernière pesée).')
    expect(byTopic.chores.text).toBe('3 tâches ménagères (+2 par rapport à la semaine d’avant), surtout vaisselle, lessive.')
    expect(byTopic.food).toBeUndefined()
  })

  it('rappel de l’accueil : la semaine passée tant qu’elle n’est pas ouverte', () => {
    const d = sample()
    expect(pendingReview(d, '2026-03-16')).toBe('2026-03-09')
    expect(pendingReview(d, '2026-03-19')).toBe('2026-03-09')
    expect(pendingReview({ ...d, sync: { reviewSeen: '2026-03-09' } }, '2026-03-16')).toBeUndefined()
    // Rien d'enregistré la semaine passée : pas de rappel
    expect(pendingReview(emptyData(), '2026-03-16')).toBeUndefined()
  })
})
