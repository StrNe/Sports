import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Activity, ChevronDown, Clock, Flame, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Badge, Button, Callout, Card, CardTitle, EmptyState, IconButton, PageHeader, Stat } from '../components/ui'
import { SimpleBarChart } from '../components/charts'
import { TrainingTabs } from '../components/layout'
import { RenfoRow } from '../components/activity'
import { addDaysISO, fmtDate, fmtDurationShort, sum, todayISO, weekStartISO } from '../lib/format'
import { RENFO_FOCUS_LABEL } from '../data/training'
import type { RenfoExercise, RenfoTemplate } from '../types'

function exerciseLine(e: RenfoExercise): string {
  const amount = e.durationSec != null ? `${e.durationSec} s` : `${e.reps ?? '?'}`
  return `${e.sets} × ${amount}${e.note ? ` (${e.note})` : ''}`
}

function TemplateCard({ t }: { t: RenfoTemplate }) {
  const [open, setOpen] = useState(false)
  const { openForm } = useUi()
  const remove = useStore((s) => s.remove)
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{t.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge accent="renfo">{RENFO_FOCUS_LABEL[t.focus]}</Badge>
            <Badge>
              <Clock size={11} /> {t.durationMin} min
            </Badge>
            {!t.builtin && <Badge>Perso</Badge>}
          </div>
        </div>
        {!t.builtin && (
          <IconButton label="Supprimer le modèle" onClick={() => confirm(`Supprimer le modèle « ${t.title} » ?`) && remove('renfoTemplates', t.id)}>
            <Trash2 size={15} />
          </IconButton>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-2">{t.description}</p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 inline-flex items-center gap-1 self-start text-xs font-medium text-ink-3 hover:text-ink">
        {t.exercises.length} exercices <ChevronDown size={14} className={clsx('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
          {t.exercises.map((e, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{e.name}</span>
              <span className="shrink-0 text-right text-ink-3 tabular">{exerciseLine(e)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-3">
        <Button
          size="sm"
          variant="soft"
          className="w-full"
          icon={<Play size={14} />}
          onClick={() => openForm('renfo', { title: t.title, focus: t.focus, durationMin: t.durationMin, exercises: t.exercises.map((e) => ({ ...e })), date: todayISO() })}
        >
          Faire cette séance
        </Button>
      </div>
    </div>
  )
}

export default function Renfo() {
  const { renfo, renfoTemplates } = useStore()
  const openForm = useUi((s) => s.openForm)
  const today = todayISO()
  const ws = weekStartISO(today)
  const monthStart = today.slice(0, 8) + '01'
  const month = renfo.filter((s) => s.date >= monthStart)
  const week = renfo.filter((s) => s.date >= ws)

  const weeks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const start = addDaysISO(ws, -7 * (11 - i))
        const end = addDaysISO(start, 6)
        const items = renfo.filter((s) => s.date >= start && s.date <= end)
        return { label: fmtDate(start, 'd MMM'), value: items.length, tooltipLabel: `Semaine du ${fmtDate(start, 'd MMM')}`, minutes: sum(items, (s) => s.durationMin) }
      }),
    [renfo, ws],
  )

  // Semaines consécutives avec au moins une séance
  let streak = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].value > 0) streak++
    else if (i !== weeks.length - 1) break
  }

  return (
    <div>
      <PageHeader
        title="Renforcement"
        subtitle="Gainage, PPG, pliométrie et mobilité : ta meilleure assurance anti-blessure"
        icon={<Activity size={22} />}
        accent="renfo"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('renfo')}>
            Séance
          </Button>
        }
      />
      <TrainingTabs />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Cette semaine" icon={<Activity size={15} />} accent="renfo" value={week.length} unit="/ 2 séances" sub={week.length >= 2 ? 'Objectif atteint 🎉' : 'Vise 2 séances par semaine'} />
        <Stat label="Ce mois-ci" icon={<Flame size={15} />} accent="renfo" value={month.length} unit="séances" sub={fmtDurationShort(sum(month, (s) => s.durationMin) * 60)} />
        <Stat label="Série en cours" icon={<Repeat size={15} />} accent="renfo" value={streak} unit={streak > 1 ? 'semaines' : 'semaine'} sub="avec au moins un renfo" />
        <Stat label="Total" icon={<Clock size={15} />} accent="renfo" value={renfo.length} unit="séances" sub={fmtDurationShort(sum(renfo, (s) => s.durationMin) * 60)} />
      </div>

      <div className="mt-4">
        <Callout icon="💡" title="Pourquoi le renfo pour un coureur ?">
          Des muscles et tendons plus solides encaissent mieux les impacts (2 à 3 fois ton poids à chaque foulée). Deux séances courtes par semaine, juste après un footing facile, suffisent à réduire le risque de blessure et à améliorer ton économie de course.
        </Callout>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Programmes</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {renfoTemplates.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle icon={<Activity size={16} />} accent="renfo" title="Séances par semaine" subtitle="12 dernières semaines · objectif 2" />
        <SimpleBarChart
          ariaLabel="Séances de renforcement par semaine"
          data={weeks}
          color="var(--renfo)"
          goal={2}
          height={180}
          format={(v, row) => (
            <>
              {v} séance{v > 1 ? 's' : ''} <span className="font-normal text-ink-3">· {String(row.minutes)} min</span>
            </>
          )}
        />
      </Card>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Historique</h2>
      {renfo.length ? (
        <Card className="!p-3 sm:!p-4">
          <div className="divide-y divide-line">
            {renfo.slice(0, 40).map((s) => (
              <RenfoRow key={s.id} s={s} />
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState icon={<Activity size={22} />} title="Aucune séance de renfo" text="Choisis un programme ci-dessus et clique sur « Faire cette séance »." />
      )}
    </div>
  )
}
