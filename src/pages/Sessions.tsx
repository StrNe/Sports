import { useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, ListChecks, Plus } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { ACCENT_BG, ACCENT_BG_SOFT, ACCENT_TEXT, Button, Card, IconButton, Meter, PageHeader, Segmented, type Accent } from '../components/ui'
import { TrainingTabs } from '../components/layout'
import { KIND_ICON, MuscuRow, RenfoRow, RunRow } from '../components/activity'
import { addDaysISO, capitalize, fmtDate, fmtDurationShort, fmtKm, fmtMinutes, sum, todayISO, weekStartISO } from '../lib/format'
import type { PlannedWorkout } from '../types'

type Filter = 'all' | 'run' | 'renfo' | 'muscu'

export default function Sessions() {
  const { runs, renfo, muscu, planned, profile, upsert } = useStore()
  const openForm = useUi((s) => s.openForm)
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  const today = todayISO()
  const [ws, setWs] = useState(weekStartISO(today))
  const [filter, setFilter] = useState<Filter>('all')
  const we = addDaysISO(ws, 6)
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i))
  const inWeek = <T extends { date: string }>(arr: T[]) => arr.filter((x) => x.date >= ws && x.date <= we)

  const wRuns = inWeek(runs)
  const wRenfo = inWeek(renfo)
  const wMuscu = inWeek(muscu)
  const wPlanned = inWeek(planned).filter((p) => !p.done && p.kind !== 'repos')
  const count = wRuns.length + wRenfo.length + wMuscu.length
  const durationSec = sum(wRuns, (r) => r.durationSec) + sum(wRenfo, (s) => s.durationMin * 60) + sum(wMuscu, (s) => s.durationMin * 60)
  const isCurrent = ws === weekStartISO(today)

  const complete = (p: PlannedWorkout) => {
    if (p.kind === 'run') openForm('run', { date: p.date, type: p.runType ?? 'ef', title: p.title, distanceKm: p.targetDistanceKm, durationSec: p.targetDurationMin ? p.targetDurationMin * 60 : undefined, plannedId: p.id })
    else {
      upsert('planned', { ...p, done: true })
      if (p.kind === 'renfo') openForm('renfo', { date: p.date, title: p.title })
      if (p.kind === 'muscu') openForm('muscu', { date: p.date, title: p.title })
    }
  }

  const show = (k: Exclude<Filter, 'all'>) => filter === 'all' || filter === k

  return (
    <div>
      <PageHeader
        title="Mes séances"
        subtitle="Tout ce que tu as fait, semaine par semaine"
        icon={<ListChecks size={22} />}
        accent="brand"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setQuickAdd(true)}>
            Ajouter
          </Button>
        }
      />
      <TrainingTabs />

      <div className="mb-4 flex items-center justify-between gap-2">
        <IconButton label="Semaine précédente" onClick={() => setWs(addDaysISO(ws, -7))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold">{isCurrent ? 'Cette semaine' : `Semaine du ${fmtDate(ws, 'd MMMM')}`}</p>
          <p className="text-xs text-ink-3">
            {fmtDate(ws, 'd MMM')} – {fmtDate(we, 'd MMM yyyy')}
            {!isCurrent && (
              <>
                {' · '}
                <button type="button" onClick={() => setWs(weekStartISO(today))} className="font-medium text-brand hover:underline">
                  revenir à cette semaine
                </button>
              </>
            )}
          </p>
        </div>
        <IconButton label="Semaine suivante" onClick={() => setWs(addDaysISO(ws, 7))}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="!p-4">
          <p className="text-[13px] text-ink-2">Séances faites</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {count}
            {profile.weeklySessionsGoal ? <span className="text-sm font-normal text-ink-3"> / {profile.weeklySessionsGoal}</span> : null}
          </p>
          {profile.weeklySessionsGoal ? <Meter className="mt-2" value={count} max={profile.weeklySessionsGoal} accent="brand" label="Objectif de séances" /> : null}
        </Card>
        <Card className="!p-4">
          <p className="text-[13px] text-ink-2">Kilomètres</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {fmtKm(sum(wRuns, (r) => r.distanceKm))} <span className="text-sm font-normal text-ink-3">km</span>
          </p>
          <p className="mt-1 text-xs text-ink-3">{wRuns.length} sortie{wRuns.length > 1 ? 's' : ''}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-[13px] text-ink-2">Temps d’entraînement</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{fmtDurationShort(durationSec)}</p>
          <p className="mt-1 text-xs text-ink-3">
            {wRenfo.length} renfo · {wMuscu.length} muscu
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-[13px] text-ink-2">Encore prévu</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{wPlanned.filter((p) => p.date >= today).length}</p>
          <p className="mt-1 text-xs text-ink-3">{wPlanned.some((p) => p.date < today) ? `${wPlanned.filter((p) => p.date < today).length} non validée(s)` : 'séance(s) à venir'}</p>
        </Card>
      </div>

      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Jour par jour</h2>
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tout' },
            { value: 'run', label: 'Course' },
            { value: 'renfo', label: 'Renfo' },
            { value: 'muscu', label: 'Muscu' },
          ]}
        />
      </div>

      <div className="space-y-3">
        {days.map((d) => {
          const dr = show('run') ? wRuns.filter((r) => r.date === d) : []
          const dre = show('renfo') ? wRenfo.filter((s) => s.date === d) : []
          const dm = show('muscu') ? wMuscu.filter((s) => s.date === d) : []
          const dp = wPlanned.filter((p) => p.date === d && (filter === 'all' || p.kind === filter))
          const empty = !dr.length && !dre.length && !dm.length && !dp.length
          const isToday = d === today
          return (
            <Card key={d} className={clsx('!p-3 sm:!p-4', isToday && 'border-brand/50')}>
              <div className="mb-1 flex items-center justify-between px-2">
                <h3 className={clsx('text-sm font-semibold', isToday && 'text-brand')}>
                  {capitalize(fmtDate(d, 'EEEE d MMMM'))}
                  {isToday && <span className="ml-1.5 text-xs font-medium">· aujourd’hui</span>}
                </h3>
                {empty && <span className="text-xs text-ink-3">{d > today ? 'Rien de prévu' : 'Repos'}</span>}
              </div>
              {!empty && (
                <div className="divide-y divide-line">
                  {dr.map((r) => (
                    <RunRow key={r.id} run={r} showDate={false} />
                  ))}
                  {dre.map((s) => (
                    <RenfoRow key={s.id} s={s} showDate={false} />
                  ))}
                  {dm.map((s) => (
                    <MuscuRow key={s.id} s={s} showDate={false} />
                  ))}
                  {dp.map((p) => {
                    const k = KIND_ICON[p.kind] as { icon: React.ReactNode; accent: Accent }
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-2 py-2.5">
                        <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl border border-dashed border-line', ACCENT_TEXT[k.accent])}>{k.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-2">{p.title}</p>
                          <p className="truncate text-xs text-ink-3">Prévu{[p.targetDistanceKm && ` · ${fmtKm(p.targetDistanceKm)} km`, p.targetDurationMin && ` · ${fmtMinutes(p.targetDurationMin)}`].filter(Boolean).join('')}</p>
                        </div>
                        {p.date <= today ? (
                          <Button size="sm" variant="soft" icon={<Check size={14} />} onClick={() => complete(p)}>
                            C’est fait
                          </Button>
                        ) : (
                          <span className={clsx('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', ACCENT_BG_SOFT[k.accent])}>à venir</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-ink-3">
        <span className={clsx('size-2 rounded-full', ACCENT_BG.brand)} /> Touche une séance pour la modifier ou la supprimer.
      </p>
    </div>
  )
}
