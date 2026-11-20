import { describe, expect, it } from 'vitest'
import { choreRhythms, dueSoon, fmtDue, fmtEvery } from './chores'
import type { ChoreEntry } from '../types'

const entry = (date: string, name: string, i = 0): ChoreEntry => ({ id: `${name}-${date}-${i}`, date, name })

describe('tâches régulières', () => {
  const chores: ChoreEntry[] = [
    // Draps environ toutes les 2 semaines, dernière fois il y a 16 jours
    ...['2026-09-28', '2026-10-12', '2026-10-27', '2026-11-04'].map((d) => entry(d, 'Draps')),
    // Vaisselle presque tous les jours : pas de rappel
    ...['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'].map((d) => entry(d, 'Vaisselle')),
    // Vitres : seulement 2 fois, pas encore de rythme déduit
    entry('2026-06-01', 'Vitres'),
    entry('2026-08-01', 'vitres'),
  ]

  it('déduit le rythme de l’historique', () => {
    const r = choreRhythms(chores, {}, '2026-11-20')
    expect(r.map((x) => x.name)).toEqual(['Draps'])
    // Intervalles 14, 15, 8 → médiane 14 ; dernière fois le 4 novembre → échéance le 18
    expect(r[0]).toMatchObject({ everyDays: 14, source: 'auto', last: '2026-11-04', due: '2026-11-18', inDays: -2, count: 4 })
    expect(dueSoon(r)).toHaveLength(1)
  })

  it('applique les réglages : rythme choisi, pause, tâche jamais faite', () => {
    const r = choreRhythms(chores, { vitres: { name: 'Vitres', everyDays: 61 }, draps: { name: 'Draps', off: true }, 'detartrer la bouilloire': { name: 'Détartrer la bouilloire', everyDays: 91 } }, '2026-11-20')
    expect(r.map((x) => `${x.name} ${x.inDays}`)).toEqual(['Vitres -50', 'Détartrer la bouilloire 0'])
    expect(r[1]).toMatchObject({ source: 'manuel', count: 0, due: '2026-11-20' })
  })

  it('formate rythmes et échéances', () => {
    expect(fmtEvery(7)).toBe('chaque semaine')
    expect(fmtEvery(13)).toBe('toutes les 2 semaines')
    expect(fmtEvery(30)).toBe('chaque mois')
    expect(fmtEvery(61)).toBe('tous les 2 mois')
    expect(fmtEvery(365)).toBe('chaque année')
    expect(fmtEvery(10)).toBe('tous les 10 jours')
    expect(fmtDue(-3)).toBe('en retard de 3 jours')
    expect(fmtDue(0)).toBe('aujourd’hui')
    expect(fmtDue(2)).toBe('dans 2 jours')
  })
})
