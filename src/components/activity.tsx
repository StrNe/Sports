import { Activity, BedDouble, Dumbbell, Flag, Footprints } from 'lucide-react'
import type { MuscuSession, RenfoSession, Run } from '../types'
import { fmtDurationShort, fmtKm, fmtNum, fmtPace, paceSecPerKm, relativeDay } from '../lib/format'
import { RUN_TYPES } from '../lib/running'
import { RENFO_FOCUS_LABEL } from '../data/training'
import { useUi } from '../store/useStore'
import { Badge, ListRow, type Accent } from './ui'

export function muscuTonnage(s: MuscuSession): number {
  return s.exercises.reduce((a, e) => a + e.sets.reduce((b, st) => b + st.reps * st.weightKg, 0), 0)
}

export function RunRow({ run, showDate = true }: { run: Run; showDate?: boolean }) {
  const openForm = useUi((s) => s.openForm)
  const pace = paceSecPerKm(run.distanceKm, run.durationSec)
  return (
    <ListRow
      onClick={() => openForm('run', run)}
      icon={<Footprints size={18} />}
      accent="run"
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{run.title || RUN_TYPES[run.type].label}</span>
          <Badge accent="run">{RUN_TYPES[run.type].short}</Badge>
        </span>
      }
      meta={[showDate && relativeDay(run.date), fmtDurationShort(run.durationSec), pace && `${fmtPace(pace)} /km`, run.avgHr && `${run.avgHr} bpm`].filter(Boolean).join(' · ')}
      right={
        <span className="text-sm font-semibold tabular">
          {fmtKm(run.distanceKm, 2)} <span className="text-xs font-normal text-ink-3">km</span>
        </span>
      }
    />
  )
}

export function RenfoRow({ s, showDate = true }: { s: RenfoSession; showDate?: boolean }) {
  const openForm = useUi((x) => x.openForm)
  return (
    <ListRow
      onClick={() => openForm('renfo', s)}
      icon={<Activity size={18} />}
      accent="renfo"
      title={s.title}
      meta={[showDate && relativeDay(s.date), RENFO_FOCUS_LABEL[s.focus], `${s.exercises.length} exercices`].filter(Boolean).join(' · ')}
      right={<span className="text-sm font-semibold tabular">{s.durationMin} <span className="text-xs font-normal text-ink-3">min</span></span>}
    />
  )
}

export function MuscuRow({ s, showDate = true }: { s: MuscuSession; showDate?: boolean }) {
  const openForm = useUi((x) => x.openForm)
  const t = muscuTonnage(s)
  return (
    <ListRow
      onClick={() => openForm('muscu', s)}
      icon={<Dumbbell size={18} />}
      accent="muscu"
      title={s.title}
      meta={[showDate && relativeDay(s.date), `${s.exercises.length} exercices`, `${s.durationMin} min`].filter(Boolean).join(' · ')}
      right={
        <span className="text-sm font-semibold tabular">
          {t >= 1000 ? fmtNum(t / 1000, 1) : fmtNum(t)} <span className="text-xs font-normal text-ink-3">{t >= 1000 ? 't' : 'kg'}</span>
        </span>
      }
    />
  )
}

export type FeedItem = { kind: 'run'; date: string; item: Run } | { kind: 'renfo'; date: string; item: RenfoSession } | { kind: 'muscu'; date: string; item: MuscuSession }

export function buildFeed(runs: Run[], renfo: RenfoSession[], muscu: MuscuSession[]): FeedItem[] {
  return [
    ...runs.map((item) => ({ kind: 'run' as const, date: item.date, item })),
    ...renfo.map((item) => ({ kind: 'renfo' as const, date: item.date, item })),
    ...muscu.map((item) => ({ kind: 'muscu' as const, date: item.date, item })),
  ].sort((a, b) => b.date.localeCompare(a.date))
}

export function FeedRow({ f }: { f: FeedItem }) {
  if (f.kind === 'run') return <RunRow run={f.item} />
  if (f.kind === 'renfo') return <RenfoRow s={f.item} />
  return <MuscuRow s={f.item} />
}

export const KIND_ICON: Record<string, { icon: React.ReactNode; accent: Accent }> = {
  run: { icon: <Footprints size={16} />, accent: 'run' },
  renfo: { icon: <Activity size={16} />, accent: 'renfo' },
  muscu: { icon: <Dumbbell size={16} />, accent: 'muscu' },
  sleep: { icon: <BedDouble size={16} />, accent: 'sleep' },
  race: { icon: <Flag size={16} />, accent: 'race' },
  repos: { icon: <BedDouble size={16} />, accent: 'neutral' },
  autre: { icon: <Activity size={16} />, accent: 'neutral' },
}
