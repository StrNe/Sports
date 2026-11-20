import { useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, Plus, SprayCan } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Card, CardTitle, IconButton, Input, PageHeader, Stat } from '../components/ui'
import { SimpleBarChart } from '../components/charts'
import { addDaysISO, capitalize, fmtDate, todayISO, uid, weekStartISO } from '../lib/format'
import { choreCounts, choresPerDay, frequentChores, splitChores } from '../lib/chores'
import type { ISODate } from '../types'

const plural = (n: number) => `${n} tâche${n > 1 ? 's' : ''}`

function diffText(now: number, before: number, label: string): string {
  if (!before && !now) return `${label} : 0`
  const d = now - before
  return `${label} : ${before}${d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)})` : ''}`
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Chores() {
  const { chores, upsertMany } = useStore()
  const { openForm, notify } = useUi()
  const today = todayISO()
  const [ws, setWs] = useState(weekStartISO(today))
  const [day, setDay] = useState<ISODate>(today)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const counts = choreCounts(chores)
  const frequent = useMemo(() => frequentChores(chores), [chores])
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i))
  const we = days[6]
  const isCurrentWeek = ws === weekStartISO(today)
  const shownWeekCount = chores.filter((c) => c.date >= ws && c.date <= we).length

  // Récap du mois : une barre par jour
  const monthStart = today.slice(0, 8) + '01'
  const perDay = choresPerDay(chores, monthStart, today)
  const monthDays = Array.from({ length: Number(today.slice(8, 10)) }, (_, i) => addDaysISO(monthStart, i))
  const monthTop = frequentChores(chores.filter((c) => c.date.startsWith(today.slice(0, 7))), 5)

  const add = (names: string[], date: ISODate = day) => {
    if (!names.length) return
    const time = date === today ? nowHHMM() : undefined
    upsertMany(
      'chores',
      names.map((name) => ({ id: uid(), date, name, time })),
    )
    notify(`${names.length > 1 ? `${names.length} tâches ajoutées` : `« ${names[0]} » ajoutée`} · ${date === today ? 'aujourd’hui' : fmtDate(date, 'EEEE d')} ✅`)
  }

  const submit = () => {
    const names = splitChores(text)
    if (!names.length) return
    add(names)
    setText('')
    inputRef.current?.focus()
  }

  const pickDay = (d: ISODate) => {
    setDay(d)
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div>
      <PageHeader title="Tâches ménagères" subtitle="Ce que tu as fait à la maison, jour après jour" icon={<SprayCan size={22} />} accent="chore" />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Aujourd’hui" icon={<Check size={15} />} accent="chore" value={counts.today} unit={counts.today > 1 ? 'tâches' : 'tâche'} sub={diffText(counts.today, counts.yesterday, 'Hier')} />
        <Stat label="Cette semaine" icon={<Check size={15} />} accent="chore" value={counts.week} unit={counts.week > 1 ? 'tâches' : 'tâche'} sub={diffText(counts.week, counts.prevWeek, 'Semaine passée')} />
        <Stat label="Ce mois-ci" icon={<Check size={15} />} accent="chore" value={counts.month} unit={counts.month > 1 ? 'tâches' : 'tâche'} sub={diffText(counts.month, counts.prevMonth, 'Mois dernier')} />
      </div>

      <Card className="mt-4">
        <CardTitle icon={<Plus size={16} />} accent="chore" title="Noter une tâche faite" subtitle="Plusieurs d’un coup : sépare-les par des virgules" />
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {[
            { d: today, label: 'Aujourd’hui' },
            { d: addDaysISO(today, -1), label: 'Hier' },
          ].map((o) => (
            <button key={o.d} type="button" onClick={() => setDay(o.d)} className={clsx('rounded-lg px-2.5 py-1 text-xs font-medium', day === o.d ? 'bg-ink text-bg' : 'bg-surface-3 text-ink-2')}>
              {o.label}
            </button>
          ))}
          <Input type="date" className="!w-auto !py-1 text-xs" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} aria-label="Jour de la tâche" />
          {day !== today && day !== addDaysISO(today, -1) && <span className="text-xs text-ink-3">{capitalize(fmtDate(day, 'EEEE d MMMM'))}</span>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Input ref={inputRef} id="chore-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Qu’as-tu fait ? ex. vaisselle, lessive" enterKeyHint="done" />
          <Button type="submit" variant="primary" disabled={!text.trim()} icon={<Plus size={16} />}>
            Ajouter
          </Button>
        </form>
        {frequent.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-ink-3">Tes tâches habituelles, en un geste :</p>
            <div className="flex flex-wrap gap-1.5">
              {frequent.map((f) => (
                <button key={f.name} type="button" onClick={() => add([f.name])} className="inline-flex items-center gap-1 rounded-full bg-chore/12 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-chore/20">
                  <Plus size={12} /> {f.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="mb-3 mt-6 flex items-center justify-between gap-2">
        <IconButton label="Semaine précédente" onClick={() => setWs(addDaysISO(ws, -7))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold">{isCurrentWeek ? 'Cette semaine' : `Semaine du ${fmtDate(ws, 'd MMMM')}`}</p>
          <p className="text-xs text-ink-3">
            {fmtDate(ws, 'd MMM')} – {fmtDate(we, 'd MMM')} · {plural(shownWeekCount)}
            {!isCurrentWeek && (
              <>
                {' · '}
                <button type="button" onClick={() => setWs(weekStartISO(today))} className="font-medium text-brand hover:underline">
                  revenir à cette semaine
                </button>
              </>
            )}
          </p>
        </div>
        <IconButton label="Semaine suivante" onClick={() => setWs(addDaysISO(ws, 7))} disabled={isCurrentWeek} className={clsx(isCurrentWeek && 'opacity-30')}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((d) => {
          const items = chores.filter((c) => c.date === d).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
          const isToday = d === today
          const future = d > today
          return (
            <div key={d} className={clsx('flex flex-col rounded-2xl border bg-surface p-3', isToday ? 'border-chore/60 ring-2 ring-chore/15' : 'border-line', future && 'opacity-60')}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className={clsx('text-sm font-semibold', isToday && 'text-chore')}>
                  {capitalize(fmtDate(d, 'EEEE d'))}
                  {isToday && <span className="ml-1 text-[11px] font-medium">· aujourd’hui</span>}
                </p>
                <div className="flex items-center gap-1">
                  {items.length > 0 && <span className="rounded-md bg-chore/12 px-1.5 py-0.5 text-[11px] font-semibold">{items.length}</span>}
                  {!future && (
                    <IconButton label={`Ajouter une tâche le ${fmtDate(d, 'EEEE d')}`} className="size-7" onClick={() => pickDay(d)}>
                      <Plus size={15} />
                    </IconButton>
                  )}
                </div>
              </div>
              {items.length ? (
                <ul className="space-y-1">
                  {items.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => openForm('chore', c)} className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-surface-2">
                        <Check size={14} className="mt-0.5 shrink-0 text-chore" />
                        <span className="min-w-0 flex-1 leading-snug">{c.name}</span>
                        {c.time && <span className="shrink-0 text-[11px] text-ink-3 tabular">{c.time}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1.5 py-1 text-xs text-ink-3">{future ? '—' : 'Aucune tâche'}</p>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-ink-3">Touche une tâche pour la modifier ou la supprimer.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<SprayCan size={16} />} accent="chore" title={`Ce mois-ci : ${plural(counts.month)}`} subtitle="Nombre de tâches par jour" />
          {counts.month ? (
            <SimpleBarChart
              ariaLabel="Tâches ménagères par jour ce mois-ci"
              data={monthDays.map((d) => ({ label: fmtDate(d, 'd'), value: perDay.get(d) ?? 0, tooltipLabel: capitalize(fmtDate(d, 'EEEE d MMMM')) }))}
              color="var(--chore)"
              height={180}
              format={(v) => plural(v)}
            />
          ) : (
            <p className="text-sm text-ink-2">Aucune tâche notée ce mois-ci pour l’instant.</p>
          )}
        </Card>
        <Card>
          <CardTitle icon={<Check size={16} />} accent="chore" title="Les plus faites ce mois-ci" />
          {monthTop.length ? (
            <ul className="space-y-2">
              {monthTop.map((t) => (
                <li key={t.name} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <span className="truncate">{t.name}</span>
                  <span className="shrink-0 font-semibold tabular">× {t.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Tes tâches les plus fréquentes apparaîtront ici.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
