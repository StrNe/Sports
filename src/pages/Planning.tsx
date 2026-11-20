import { useState } from 'react'
import clsx from 'clsx'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Flag, Lightbulb, Plus } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { ACCENT_BG_SOFT, ACCENT_TEXT, Button, Card, CardTitle, IconButton, Meter, PageHeader } from '../components/ui'
import { KIND_ICON } from '../components/activity'
import { addDaysISO, capitalize, fmtDate, fmtDurationShort, fmtKm, fmtMinutes, sum, todayISO, weekStartISO } from '../lib/format'
import { RUN_TYPES } from '../lib/running'
import { coachTips } from '../lib/insights'
import type { PlannedWorkout } from '../types'

export default function Planning() {
  const data = useStore()
  const { planned, runs, renfo, muscu, races, upsert } = data
  const tips = coachTips(data).slice(0, 4)
  const openForm = useUi((s) => s.openForm)
  const today = todayISO()
  const [ws, setWs] = useState(weekStartISO(today))
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i))
  const we = days[6]

  const weekPlanned = planned.filter((p) => p.date >= ws && p.date <= we)
  const weekRuns = runs.filter((r) => r.date >= ws && r.date <= we)
  const plannedKm = sum(weekPlanned.filter((p) => p.kind === 'run'), (p) => p.targetDistanceKm ?? 0)
  const doneKm = sum(weekRuns, (r) => r.distanceKm)
  const plannedCount = weekPlanned.filter((p) => p.kind !== 'repos').length
  const doneCount = weekPlanned.filter((p) => p.done).length

  const complete = (p: PlannedWorkout) => {
    if (p.kind === 'run') openForm('run', { date: p.date, type: p.runType ?? 'ef', title: p.title, distanceKm: p.targetDistanceKm, durationSec: p.targetDurationMin ? p.targetDurationMin * 60 : undefined, plannedId: p.id })
    else if (p.kind === 'renfo') {
      upsert('planned', { ...p, done: true })
      openForm('renfo', { date: p.date, title: p.title })
    } else if (p.kind === 'muscu') {
      upsert('planned', { ...p, done: true })
      openForm('muscu', { date: p.date, title: p.title })
    } else upsert('planned', { ...p, done: true })
  }

  return (
    <div>
      <PageHeader
        title="Planning"
        subtitle="Ta semaine d’entraînement : prévu et réalisé"
        icon={<CalendarDays size={22} />}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('planned', { date: today >= ws && today <= we ? today : ws })}>
            Planifier
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <IconButton label="Semaine précédente" onClick={() => setWs(addDaysISO(ws, -7))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold">
            {fmtDate(ws, 'd MMM')} – {fmtDate(we, 'd MMM yyyy')}
          </p>
          {ws !== weekStartISO(today) && (
            <button type="button" onClick={() => setWs(weekStartISO(today))} className="text-xs font-medium text-brand hover:underline">
              Cette semaine
            </button>
          )}
        </div>
        <IconButton label="Semaine suivante" onClick={() => setWs(addDaysISO(ws, 7))}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="!p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">Kilomètres</span>
            <span className="font-semibold tabular">
              {fmtKm(doneKm)} <span className="font-normal text-ink-3">/ {fmtKm(plannedKm)} km prévus</span>
            </span>
          </div>
          <Meter className="mt-2" value={doneKm} max={Math.max(plannedKm, doneKm, 1)} accent="run" label="Kilomètres réalisés" />
        </Card>
        <Card className="!p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">Séances validées</span>
            <span className="font-semibold tabular">
              {doneCount} <span className="font-normal text-ink-3">/ {plannedCount} prévues</span>
            </span>
          </div>
          <Meter className="mt-2" value={doneCount} max={Math.max(plannedCount, 1)} accent="renfo" label="Séances validées" />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((d) => {
          const isToday = d === today
          const dayPlanned = planned.filter((p) => p.date === d)
          const dayRuns = runs.filter((r) => r.date === d)
          const dayRenfo = renfo.filter((s) => s.date === d)
          const dayMuscu = muscu.filter((s) => s.date === d)
          const dayRaces = races.filter((r) => r.date === d)
          const empty = !dayPlanned.length && !dayRuns.length && !dayRenfo.length && !dayMuscu.length && !dayRaces.length
          return (
            <div key={d} className={clsx('flex flex-col rounded-2xl border bg-surface p-3 lg:min-h-64', isToday ? 'border-brand/60 ring-2 ring-brand/15' : 'border-line', d < today && 'lg:opacity-90')}>
              <div className="mb-2 flex items-center justify-between">
                <p className={clsx('text-sm font-semibold', isToday && 'text-brand')}>
                  {capitalize(fmtDate(d, 'EEE d'))}
                  {isToday && <span className="ml-1.5 text-[11px] font-medium">· aujourd’hui</span>}
                </p>
                <IconButton label="Planifier ce jour" className="size-7" onClick={() => openForm('planned', { date: d })}>
                  <Plus size={15} />
                </IconButton>
              </div>
              <div className="space-y-1.5">
                {dayRaces.map((r) => (
                  <button key={r.id} type="button" onClick={() => openForm('race', r)} className="flex w-full items-center gap-2 rounded-lg bg-race/12 px-2 py-1.5 text-left text-xs font-semibold">
                    <Flag size={13} className="shrink-0 text-race" />
                    <span className="truncate">{r.name}</span>
                  </button>
                ))}
                {dayPlanned.map((p) => {
                  const k = KIND_ICON[p.kind]
                  return (
                    <div key={p.id} className={clsx('group rounded-lg border px-2 py-1.5', p.done ? 'border-transparent bg-surface-2' : 'border-dashed border-line')}>
                      <button type="button" onClick={() => openForm('planned', p)} className="flex w-full items-start gap-1.5 text-left">
                        <span className={clsx('mt-0.5 shrink-0', ACCENT_TEXT[k.accent])}>{k.icon}</span>
                        <span className={clsx('min-w-0 text-xs leading-snug', p.done && 'text-ink-3 line-through')}>
                          <span className="font-medium">{p.title}</span>
                          {(p.targetDistanceKm || p.targetDurationMin) && (
                            <span className="block text-ink-3">{[p.targetDistanceKm && `${fmtKm(p.targetDistanceKm)} km`, p.targetDurationMin && fmtMinutes(p.targetDurationMin)].filter(Boolean).join(' · ')}</span>
                          )}
                        </span>
                      </button>
                      {!p.done && d <= today && (
                        <button type="button" onClick={() => complete(p)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-renfo hover:underline">
                          <Check size={12} /> C’est fait
                        </button>
                      )}
                    </div>
                  )
                })}
                {dayRuns.map((r) => (
                  <button key={r.id} type="button" onClick={() => openForm('run', r)} className={clsx('flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs', ACCENT_BG_SOFT.run)}>
                    <span className="shrink-0 text-run">{KIND_ICON.run.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{r.title || RUN_TYPES[r.type].label}</span>
                    <span className="shrink-0 tabular">{fmtKm(r.distanceKm)} km</span>
                  </button>
                ))}
                {dayRenfo.map((s) => (
                  <button key={s.id} type="button" onClick={() => openForm('renfo', s)} className={clsx('flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs', ACCENT_BG_SOFT.renfo)}>
                    <span className="shrink-0 text-renfo">{KIND_ICON.renfo.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                    <span className="shrink-0">{s.durationMin}′</span>
                  </button>
                ))}
                {dayMuscu.map((s) => (
                  <button key={s.id} type="button" onClick={() => openForm('muscu', s)} className={clsx('flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs', ACCENT_BG_SOFT.muscu)}>
                    <span className="shrink-0 text-muscu">{KIND_ICON.muscu.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                    <span className="shrink-0">{fmtDurationShort(s.durationMin * 60)}</span>
                  </button>
                ))}
                {empty && <p className="py-2 text-xs text-ink-3">Repos</p>}
              </div>
            </div>
          )
        })}
      </div>
      <Card className="mt-6">
        <CardTitle icon={<Lightbulb size={16} />} accent="food" title="Conseils du coach" subtitle="D’après ta charge, ton sommeil et ta prochaine course" />
        <ul className="grid gap-3 md:grid-cols-2">
          {tips.map((t) => (
            <li key={t.id} className={clsx('rounded-xl p-3', t.tone === 'warning' ? 'bg-warn/10' : 'bg-surface-2')}>
              <p className="text-sm font-semibold">
                <span className="mr-1">{t.emoji}</span>
                {t.title}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{t.text}</p>
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-4 text-xs text-ink-3">Astuce : les séances en pointillés sont prévues, les blocs colorés sont réalisés. Clique sur « C’est fait » pour enregistrer la séance avec les infos déjà remplies.</p>
    </div>
  )
}
