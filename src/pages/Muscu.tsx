import { useMemo, useState } from 'react'
import { Dumbbell, Medal, Plus, Repeat, TrendingUp, Weight } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Card, CardTitle, EmptyState, PageHeader, Select, Stat } from '../components/ui'
import { SimpleBarChart, TrendChart } from '../components/charts'
import { TrainingTabs } from '../components/layout'
import { MuscuRow, muscuTonnage } from '../components/activity'
import { addDaysISO, fmtDate, fmtNum, sum, todayISO, weekStartISO } from '../lib/format'
import type { MuscuSession } from '../types'

/** 1RM estimé (formule d'Epley) */
export function oneRm(weight: number, reps: number): number {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

interface ExerciseStat {
  name: string
  bestWeight: number
  bestWeightReps: number
  best1rm: number
  date: string
  sessions: number
}

function exerciseStats(sessions: MuscuSession[]): ExerciseStat[] {
  const map = new Map<string, ExerciseStat>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      const key = e.name.trim()
      if (!key) continue
      const st = map.get(key) ?? { name: key, bestWeight: 0, bestWeightReps: 0, best1rm: 0, date: s.date, sessions: 0 }
      st.sessions++
      for (const set of e.sets) {
        if (set.weightKg > st.bestWeight || (set.weightKg === st.bestWeight && set.reps > st.bestWeightReps)) {
          st.bestWeight = set.weightKg
          st.bestWeightReps = set.reps
        }
        const rm = oneRm(set.weightKg, set.reps)
        if (rm > st.best1rm) {
          st.best1rm = rm
          st.date = s.date
        }
      }
      map.set(key, st)
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions)
}

export default function Muscu() {
  const { muscu } = useStore()
  const openForm = useUi((s) => s.openForm)
  const today = todayISO()
  const ws = weekStartISO(today)
  const monthStart = today.slice(0, 8) + '01'
  const month = muscu.filter((s) => s.date >= monthStart)
  const stats = useMemo(() => exerciseStats(muscu), [muscu])
  const [selected, setSelected] = useState<string>('')
  const exercise = selected || stats[0]?.name || ''

  const progression = useMemo(() => {
    return [...muscu]
      .reverse()
      .map((s) => {
        const e = s.exercises.find((x) => x.name.trim() === exercise)
        if (!e) return null
        const best = e.sets.reduce((a, st) => Math.max(a, oneRm(st.weightKg, st.reps)), 0)
        const top = e.sets.reduce((a, st) => (st.weightKg > a.weightKg ? st : a), e.sets[0])
        return { label: fmtDate(s.date, 'd MMM'), value: Math.round(best * 10) / 10, tooltipLabel: fmtDate(s.date), top: top ? `${top.reps} × ${top.weightKg} kg` : '' }
      })
      .filter(Boolean) as { label: string; value: number; tooltipLabel: string; top: string }[]
  }, [muscu, exercise])

  const weeks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const start = addDaysISO(ws, -7 * (11 - i))
        const end = addDaysISO(start, 6)
        const items = muscu.filter((s) => s.date >= start && s.date <= end)
        return { label: fmtDate(start, 'd MMM'), value: Math.round(sum(items, muscuTonnage)), tooltipLabel: `Semaine du ${fmtDate(start, 'd MMM')}`, n: items.length }
      }),
    [muscu, ws],
  )

  const repeat = (s: MuscuSession) => openForm('muscu', { title: s.title, durationMin: s.durationMin, exercises: s.exercises.map((e) => ({ name: e.name, sets: e.sets.map((x) => ({ ...x })) })), date: today })

  return (
    <div>
      <PageHeader
        title="Musculation"
        subtitle="Charges, progression et records par exercice"
        icon={<Dumbbell size={22} />}
        accent="muscu"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('muscu')}>
            Séance
          </Button>
        }
      />
      <TrainingTabs />

      {!muscu.length ? (
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="Aucune séance de musculation"
          text="Enregistre tes séries (répétitions × charge) : Foulée calcule ton tonnage, ton 1RM estimé et tes records par exercice. Des programmes pensés pour les coureurs sont proposés dans le formulaire."
          action={
            <Button variant="primary" onClick={() => openForm('muscu')}>
              Ajouter une séance
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Cette semaine" icon={<Dumbbell size={15} />} accent="muscu" value={muscu.filter((s) => s.date >= ws).length} unit="séances" />
            <Stat label="Ce mois-ci" icon={<Dumbbell size={15} />} accent="muscu" value={month.length} unit="séances" sub={`${sum(month, (s) => s.durationMin)} min`} />
            <Stat label="Tonnage du mois" icon={<Weight size={15} />} accent="muscu" value={fmtNum(sum(month, muscuTonnage) / 1000, 1)} unit="tonnes" />
            <Stat label="Exercices suivis" icon={<TrendingUp size={15} />} accent="muscu" value={stats.length} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardTitle
                icon={<TrendingUp size={16} />}
                accent="muscu"
                title="Progression"
                subtitle="1RM estimé (formule d’Epley) à chaque séance"
                action={
                  <Select className="!w-auto max-w-44 !py-1.5 text-sm" value={exercise} onChange={(e) => setSelected(e.target.value)}>
                    {stats.map((s) => (
                      <option key={s.name}>{s.name}</option>
                    ))}
                  </Select>
                }
              />
              {progression.length >= 2 ? (
                <TrendChart
                  ariaLabel={`Progression ${exercise}`}
                  data={progression}
                  color="var(--muscu)"
                  format={(v, row) => (
                    <>
                      {fmtNum(v, 1)} kg <span className="font-normal text-ink-3">· meilleure série {String(row.top)}</span>
                    </>
                  )}
                  tickFormat={(v) => `${Math.round(v)}`}
                />
              ) : (
                <p className="text-sm text-ink-2">Il faut au moins deux séances avec cet exercice pour tracer la courbe.</p>
              )}
            </Card>
            <Card className="lg:col-span-2">
              <CardTitle icon={<Medal size={16} />} accent="muscu" title="Records par exercice" />
              <div className="-mx-1 max-h-72 overflow-y-auto scroll-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-3">
                      <th className="px-1 pb-2 font-medium">Exercice</th>
                      <th className="px-1 pb-2 text-right font-medium">Max</th>
                      <th className="px-1 pb-2 text-right font-medium">1RM est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {stats.map((s) => (
                      <tr key={s.name}>
                        <td className="px-1 py-2">
                          <button type="button" onClick={() => setSelected(s.name)} className="text-left hover:underline">
                            {s.name}
                          </button>
                        </td>
                        <td className="px-1 py-2 text-right tabular">
                          {fmtNum(s.bestWeight, 1)} kg <span className="text-xs text-ink-3">× {s.bestWeightReps}</span>
                        </td>
                        <td className="px-1 py-2 text-right font-semibold tabular">{fmtNum(s.best1rm, 0)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <CardTitle icon={<Weight size={16} />} accent="muscu" title="Tonnage par semaine" subtitle="Somme répétitions × charge" />
            <SimpleBarChart
              ariaLabel="Tonnage hebdomadaire"
              data={weeks}
              color="var(--muscu)"
              height={180}
              tickFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)} t` : String(v))}
              format={(v, row) => (
                <>
                  {fmtNum(v)} kg <span className="font-normal text-ink-3">· {String(row.n)} séance(s)</span>
                </>
              )}
            />
          </Card>

          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Historique</h2>
          <Card className="!p-3 sm:!p-4">
            <div className="divide-y divide-line">
              {muscu.slice(0, 40).map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <MuscuRow s={s} />
                  </div>
                  <Button size="sm" variant="ghost" icon={<Repeat size={14} />} onClick={() => repeat(s)} title="Refaire cette séance aujourd’hui">
                    <span className="hidden sm:inline">Refaire</span>
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
