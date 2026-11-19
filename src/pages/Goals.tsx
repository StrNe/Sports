import { useMemo } from 'react'
import { Flag, Medal, Plus, Sparkles, Trophy } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Badge, Button, Card, CardTitle, EmptyState, ListRow, PageHeader } from '../components/ui'
import { NextRaceCard } from '../components/race'
import { daysBetween, fmtDate, fmtDuration, fmtKm, fmtNum, fmtPace, todayISO } from '../lib/format'
import { RACE_KIND_LABEL, loopKmOf, STANDARD_DISTANCES, bestEfforts, bestVdot, biggestWeek, longestRun, predictTime, raceDistanceKm, referencePerformances } from '../lib/running'
import { nextGoalRace, upcomingRaces } from '../lib/insights'

export default function Goals() {
  const { races, records, runs } = useStore()
  const openForm = useUi((s) => s.openForm)
  const today = todayISO()
  const perfs = useMemo(() => referencePerformances(runs, races, records), [runs, races, records])
  const goal = nextGoalRace(races)
  const upcoming = upcomingRaces(races)
  const past = races.filter((r) => r.date < today).sort((a, b) => b.date.localeCompare(a.date))
  const best = bestEfforts(runs, races, records)
  const vdot = bestVdot(perfs)
  const longest = longestRun(runs)
  const bigWeek = biggestWeek(runs)
  const otherRecords = records.filter((r) => !STANDARD_DISTANCES.some((s) => Math.abs(s.km - r.distanceKm) / s.km <= 0.03))

  return (
    <div>
      <PageHeader
        title="Courses & records"
        subtitle="Tes objectifs, tes meilleures performances et ce dont tu es capable aujourd’hui"
        icon={<Trophy size={22} />}
        accent="race"
        actions={
          <>
            <Button icon={<Medal size={16} />} onClick={() => openForm('record')}>
              Record
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('race')}>
              Course
            </Button>
          </>
        }
      />

      <NextRaceCard race={goal} perfs={perfs} />

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Calendrier des courses</h2>
          <Card className="!p-3 sm:!p-4">
            <div className="divide-y divide-line">
              {upcoming.map((r) => {
                const d = daysBetween(today, r.date)
                return (
                  <ListRow
                    key={r.id}
                    onClick={() => openForm('race', r)}
                    icon={<Flag size={18} />}
                    accent="race"
                    title={
                      <span className="flex items-center gap-2">
                        <span className="truncate">{r.name}</span>
                        <Badge accent={r.priority === 'A' ? 'race' : 'neutral'}>{r.priority}</Badge>
                      </span>
                    }
                    meta={[fmtDate(r.date, 'EEE d MMM yyyy'), RACE_KIND_LABEL[r.kind], r.kind === 'backyard' ? `${r.goalLoops ?? '?'} boucles` : `${fmtNum(r.distanceKm, 1)} km`, r.goalTimeSec && `objectif ${fmtDuration(r.goalTimeSec)}`, r.location].filter(Boolean).join(' · ')}
                    right={
                      <span className="text-sm font-semibold tabular">
                        J-{d}
                      </span>
                    }
                  />
                )
              })}
            </div>
          </Card>
        </>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<Medal size={16} />} accent="race" title="Records personnels" subtitle="Records saisis, résultats de course et meilleures séances" />
          <div className="space-y-2">
            {STANDARD_DISTANCES.map((sd) => {
              const b = best.find((x) => x.key === sd.key)
              const manual = records.find((r) => Math.abs(r.distanceKm - sd.km) / sd.km <= 0.03)
              return (
                <button
                  key={sd.key}
                  type="button"
                  onClick={() => openForm('record', manual ?? { label: sd.label, distanceKm: sd.km })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left transition hover:bg-surface-3"
                >
                  <span>
                    <span className="block text-sm font-medium">{sd.label}</span>
                    {b && (
                      <span className="block text-xs text-ink-3">
                        {fmtDate(b.date, 'd MMM yyyy')} · {b.source}
                        {b.estimated ? ' (estimé)' : ''}
                      </span>
                    )}
                  </span>
                  {b ? (
                    <span className="text-right">
                      <span className="block font-semibold tabular">{fmtDuration(b.timeSec)}</span>
                      <span className="block text-xs text-ink-3 tabular">{fmtPace(b.timeSec / b.km)} /km</span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-3">+ Ajouter</span>
                  )}
                </button>
              )
            })}
            {otherRecords.map((r) => (
              <button key={r.id} type="button" onClick={() => openForm('record', r)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left transition hover:bg-surface-3">
                <span>
                  <span className="block text-sm font-medium">{r.label === 'Autre' ? `${fmtNum(r.distanceKm, 2)} km` : r.label}</span>
                  <span className="block text-xs text-ink-3">
                    {fmtDate(r.date, 'd MMM yyyy')}
                    {r.where ? ` · ${r.where}` : ''}
                  </span>
                </span>
                <span className="font-semibold tabular">{fmtDuration(r.timeSec)}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-3">Plus longue sortie</p>
              <p className="mt-0.5 font-semibold">{longest ? `${fmtKm(longest.distanceKm)} km` : '—'}</p>
              {longest && <p className="text-xs text-ink-3">{fmtDate(longest.date, 'd MMM yyyy')}</p>}
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-3">Plus grosse semaine</p>
              <p className="mt-0.5 font-semibold">{bigWeek ? `${fmtKm(bigWeek.km)} km` : '—'}</p>
              {bigWeek && <p className="text-xs text-ink-3">Semaine du {fmtDate(bigWeek.weekStart, 'd MMM yyyy')}</p>}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Sparkles size={16} />} accent="race" title="Ce dont tu es capable aujourd’hui" subtitle="Prédictions à partir de ta performance récente la plus proche (Riegel)" />
          {perfs.length ? (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th className="pb-2 font-medium">Distance</th>
                    <th className="pb-2 text-right font-medium">Temps</th>
                    <th className="pb-2 text-right font-medium">Allure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...STANDARD_DISTANCES, ...(goal && !STANDARD_DISTANCES.some((s) => Math.abs(s.km - raceDistanceKm(goal)) < 0.5) ? [{ key: 'goal', label: goal.kind === 'backyard' ? `${goal.goalLoops} boucles Backyard` : goal.name, km: raceDistanceKm(goal) }] : [])].map((sd) => {
                    const p = predictTime(perfs, sd.km)
                    if (!p) return null
                    return (
                      <tr key={sd.key}>
                        <td className="py-2.5">
                          {sd.label}
                          {sd.key === 'goal' && <span className="block text-xs text-ink-3">{fmtNum(sd.km, 1)} km</span>}
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular">{fmtDuration(p.timeSec)}</td>
                        <td className="py-2.5 text-right tabular text-ink-2">{fmtPace(p.timeSec / sd.km)} /km</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {vdot && (
                <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
                  <p>
                    VDOT estimé : <span className="font-semibold">{fmtNum(vdot.vdot, 1)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    D’après {vdot.perf.source} ({fmtNum(vdot.perf.distanceKm, 1)} km en {fmtDuration(vdot.perf.timeSec)}). Retrouve tes allures d’entraînement dans les Outils.
                  </p>
                </div>
              )}
              {goal?.kind === 'backyard' && (
                <p className="mt-3 text-xs text-ink-3">
                  Backyard : chaque boucle de {fmtNum(loopKmOf(goal), 2)} km doit être bouclée en moins d’1 h. La marge restante sert à manger, boire et se reposer.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-2">Ajoute un record ou le résultat d’une course récente (moins de 6 mois) pour obtenir tes prédictions.</p>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Résultats passés</h2>
      {past.length ? (
        <Card className="!p-3 sm:!p-4">
          <div className="divide-y divide-line">
            {past.map((r) => (
              <ListRow
                key={r.id}
                onClick={() => openForm('race', r)}
                icon={<Trophy size={18} />}
                accent="race"
                title={r.name}
                meta={[fmtDate(r.date, 'd MMM yyyy'), r.kind === 'backyard' ? 'Backyard' : `${fmtNum(r.distanceKm, 1)} km`, r.result?.rank && `Classement ${r.result.rank}`].filter(Boolean).join(' · ')}
                right={
                  r.kind === 'backyard' ? (
                    <span className="text-sm font-semibold">{r.result?.loops ?? '—'} boucles</span>
                  ) : r.result?.timeSec ? (
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular">{fmtDuration(r.result.timeSec)}</span>
                      <span className="block text-xs text-ink-3 tabular">{fmtPace(r.result.timeSec / r.distanceKm)} /km</span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-3">Ajouter le temps</span>
                  )
                }
              />
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState icon={<Trophy size={22} />} title="Pas encore de résultat" text="Tes courses passées et leurs résultats apparaîtront ici." />
      )}
    </div>
  )
}
