import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { CalendarSearch, Check, ChevronLeft, ChevronRight, Download, History, Plus, Search, SprayCan } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Callout, Card, CardTitle, IconButton, Input, PageHeader, Segmented, Stat } from '../components/ui'
import { SimpleBarChart } from '../components/charts'
import { addDaysISO, capitalize, daysBetween, fmtDate, todayISO, uid, weekStartISO } from '../lib/format'
import { choreCounts, choreYears, choresCsv, choresPerDay, frequentChores, monthCounts, monthGrid, searchChores, splitChores } from '../lib/chores'
import { downloadText } from '../lib/importers'
import { inClaude } from '../lib/claude'
import type { ChoreEntry, ISODate } from '../types'

const plural = (n: number) => `${n} tâche${n > 1 ? 's' : ''}`
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function diffText(now: number, before: number, label: string): string {
  if (!before && !now) return `${label} : 0`
  const d = now - before
  return `${label} : ${before}${d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)})` : ''}`
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function ago(date: ISODate, today: ISODate): string {
  const d = daysBetween(date, today)
  if (d === 0) return 'aujourd’hui'
  if (d === 1) return 'hier'
  if (d < 30) return `il y a ${d} jours`
  if (d < 365) return `il y a ${Math.round(d / 30.4)} mois`
  const y = Math.floor(d / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}

/** Liste des tâches d'une journée (touche une tâche pour la modifier) */
function DayList({ items }: { items: ChoreEntry[] }) {
  const openForm = useUi((s) => s.openForm)
  if (!items.length) return <p className="px-1.5 py-1 text-xs text-ink-3">Aucune tâche</p>
  return (
    <ul className="space-y-1">
      {[...items]
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        .map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => openForm('chore', c)} className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-surface-2">
              <Check size={14} className="mt-0.5 shrink-0 text-chore" />
              <span className="min-w-0 flex-1 leading-snug">
                {c.name}
                {c.note && <span className="block text-xs text-ink-3">{c.note}</span>}
              </span>
              {c.time && <span className="shrink-0 text-[11px] text-ink-3 tabular">{c.time}</span>}
            </button>
          </li>
        ))}
    </ul>
  )
}

export default function Chores() {
  const { chores, upsertMany } = useStore()
  const { notify } = useUi()
  const today = todayISO()
  const [view, setView] = useState<'semaine' | 'historique' | 'recherche'>('semaine')
  const [ws, setWs] = useState(weekStartISO(today))
  const [focus, setFocus] = useState<ISODate | null>(null)
  const [jump, setJump] = useState(0)
  const [day, setDay] = useState<ISODate>(today)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  // Historique
  const years = useMemo(() => choreYears(chores, today), [chores, today])
  const [histYear, setHistYear] = useState(today.slice(0, 4))
  const [histMonth, setHistMonth] = useState<number>(Number(today.slice(5, 7)))
  const [histDay, setHistDay] = useState<ISODate | null>(null)
  // Recherche
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchChores(chores, query), [chores, query])

  const counts = choreCounts(chores)
  const frequent = useMemo(() => frequentChores(chores), [chores])
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i))
  const we = days[6]
  const isCurrentWeek = ws === weekStartISO(today)
  const shownWeekCount = chores.filter((c) => c.date >= ws && c.date <= we).length
  const oldest = chores.reduce<ISODate | null>((a, c) => (!a || c.date < a ? c.date : a), null)

  // Récap du mois en cours
  const monthStart = today.slice(0, 8) + '01'
  const perDay = choresPerDay(chores, monthStart, today)
  const monthDays = Array.from({ length: Number(today.slice(8, 10)) }, (_, i) => addDaysISO(monthStart, i))
  const monthTop = frequentChores(chores.filter((c) => c.date.startsWith(today.slice(0, 7))), 5)

  /** Ouvre la semaine qui contient cette date et met le jour en évidence */
  const goTo = (date: ISODate) => {
    setView('semaine')
    setWs(weekStartISO(date))
    setFocus(date)
    setJump((n) => n + 1)
  }
  // Après un saut de date, amène le jour ciblé à l'écran
  useEffect(() => {
    if (!jump || !focus) return
    const t = setTimeout(() => document.getElementById(`jour-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  const pickYear = (year: string) => {
    const mc = monthCounts(chores, year)
    let m = year === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12
    // Une année passée s'ouvre sur son dernier mois rempli
    if (year !== today.slice(0, 4)) while (m > 1 && !mc[m - 1]) m--
    setHistYear(year)
    setHistMonth(m)
    setHistDay(null)
  }
  const pickHistDay = (d: ISODate) => {
    setHistDay(d)
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

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

  const exportCsv = async () => {
    const r = await downloadText(choresCsv(chores), `taches-menageres-${today}.csv`, 'text/csv')
    if (r === 'error') notify('L’export a échoué', 'error')
  }

  // Calendrier du mois choisi dans l'historique
  const grid = monthGrid(Number(histYear), histMonth)
  const histCounts = monthCounts(chores, histYear)
  const histMonthKey = `${histYear}-${String(histMonth).padStart(2, '0')}`
  const histPerDay = choresPerDay(chores, `${histMonthKey}-01`, `${histMonthKey}-31`)
  const histMax = Math.max(1, ...histPerDay.values())
  const histDayItems = histDay ? chores.filter((c) => c.date === histDay) : []

  return (
    <div>
      <PageHeader
        title="Tâches ménagères"
        subtitle="Ce que tu as fait à la maison, jour après jour"
        icon={<SprayCan size={22} />}
        accent="chore"
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'semaine', label: 'Semaine' },
              { value: 'historique', label: 'Historique' },
              { value: 'recherche', label: 'Recherche' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Aujourd’hui" icon={<Check size={15} />} accent="chore" value={counts.today} unit={counts.today > 1 ? 'tâches' : 'tâche'} sub={diffText(counts.today, counts.yesterday, 'Hier')} />
        <Stat label="Cette semaine" icon={<Check size={15} />} accent="chore" value={counts.week} unit={counts.week > 1 ? 'tâches' : 'tâche'} sub={diffText(counts.week, counts.prevWeek, 'Semaine passée')} />
        <Stat label="Ce mois-ci" icon={<Check size={15} />} accent="chore" value={counts.month} unit={counts.month > 1 ? 'tâches' : 'tâche'} sub={diffText(counts.month, counts.prevMonth, 'Mois dernier')} />
      </div>

      {view === 'semaine' && (
        <>
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
              {day !== today && day !== addDaysISO(today, -1) && <span className="text-xs text-ink-3">{capitalize(fmtDate(day, 'EEEE d MMMM yyyy'))}</span>}
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
              <p className="font-semibold">{isCurrentWeek ? 'Cette semaine' : `Semaine du ${fmtDate(ws, 'd MMMM yyyy')}`}</p>
              <p className="text-xs text-ink-3">
                {fmtDate(ws, 'd MMM')} – {fmtDate(we, 'd MMM')} · {plural(shownWeekCount)}
                {!isCurrentWeek && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => {
                        setWs(weekStartISO(today))
                        setFocus(null)
                      }}
                      className="font-medium text-brand hover:underline"
                    >
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
          <label className="mb-3 flex items-center justify-center gap-2 text-sm text-ink-2">
            <CalendarSearch size={16} className="text-chore" />
            Aller au
            <Input type="date" className="!w-auto !py-1 text-sm" max={today} value={focus && focus >= ws && focus <= we ? focus : ws} onChange={(e) => e.target.value && goTo(e.target.value)} aria-label="Aller à une date" />
          </label>

          <div className="grid gap-3 lg:grid-cols-7">
            {days.map((d) => {
              const items = chores.filter((c) => c.date === d)
              const isToday = d === today
              const future = d > today
              return (
                <div
                  key={d}
                  id={`jour-${d}`}
                  className={clsx('flex scroll-mt-20 flex-col rounded-2xl border bg-surface p-3', focus === d ? 'border-chore ring-4 ring-chore/25' : isToday ? 'border-chore/60 ring-2 ring-chore/15' : 'border-line', future && 'opacity-60')}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className={clsx('text-sm font-semibold', isToday && 'text-chore')}>
                      {capitalize(fmtDate(d, isCurrentWeek ? 'EEEE d' : 'EEEE d MMM'))}
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
                  {future ? <p className="px-1.5 py-1 text-xs text-ink-3">—</p> : <DayList items={items} />}
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
        </>
      )}

      {view === 'historique' && (
        <>
          <Card className="mt-4">
            <CardTitle icon={<History size={16} />} accent="chore" title="Tout ton historique" subtitle={oldest ? `${plural(chores.length)} depuis le ${fmtDate(oldest, 'd MMMM yyyy')}` : 'Les tâches que tu notes restent ici pour toujours'} />
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <button key={y.year} type="button" onClick={() => pickYear(y.year)} className={clsx('rounded-lg px-3 py-1.5 text-sm font-medium', histYear === y.year ? 'bg-ink text-bg' : 'bg-surface-3 text-ink-2')}>
                  {y.year} <span className="opacity-70">· {y.count}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
              {histCounts.map((n, i) => {
                const future = `${histYear}-${String(i + 1).padStart(2, '0')}` > today.slice(0, 7)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={future}
                    onClick={() => {
                      setHistMonth(i + 1)
                      setHistDay(null)
                    }}
                    className={clsx('rounded-xl px-2 py-2 text-center text-xs transition disabled:opacity-30', histMonth === i + 1 ? 'bg-chore/20 ring-2 ring-chore/50' : 'bg-surface-2 hover:bg-surface-3')}
                  >
                    <span className="block font-medium">{MONTHS[i]}</span>
                    <span className="block text-ink-3 tabular">{n}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardTitle icon={<CalendarSearch size={16} />} accent="chore" title={capitalize(fmtDate(`${histMonthKey}-01`, 'MMMM yyyy'))} subtitle={`${plural(histCounts[histMonth - 1])} · touche un jour pour voir le détail`} />
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-3">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {grid.map((d, i) => {
                  if (!d) return <span key={`v${i}`} />
                  const n = histPerDay.get(d) ?? 0
                  const future = d > today
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={future}
                      onClick={() => pickHistDay(d)}
                      className={clsx('flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition disabled:opacity-30', histDay === d && 'ring-2 ring-chore', n ? 'text-ink' : 'bg-surface-2 text-ink-3')}
                      style={n ? { background: `color-mix(in oklab, var(--chore) ${Math.round(18 + (n / histMax) * 52)}%, var(--surface-2))` } : undefined}
                      aria-label={`${fmtDate(d, 'EEEE d MMMM yyyy')} : ${plural(n)}`}
                    >
                      <span className="font-medium">{Number(d.slice(8, 10))}</span>
                      {n > 0 && <span className="text-[10px] font-semibold">{n}</span>}
                    </button>
                  )
                })}
              </div>
            </Card>
            <div ref={detailRef} className="scroll-mt-20 lg:col-span-2">
              <Card className="h-full">
                {histDay ? (
                  <>
                    <CardTitle icon={<Check size={16} />} accent="chore" title={capitalize(fmtDate(histDay, 'EEEE d MMMM yyyy'))} subtitle={plural(histDayItems.length)} />
                    <DayList items={histDayItems} />
                    <Button size="sm" variant="soft" className="mt-3" onClick={() => goTo(histDay)}>
                      Voir cette semaine
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-ink-2">Choisis une année, un mois puis un jour dans le calendrier pour revoir exactement ce que tu avais fait ce jour-là.</p>
                )}
              </Card>
            </div>
          </div>

          <div className="mt-4">
            <Callout icon="🗄️" title="Rien n’est jamais effacé">
              {inClaude()
                ? 'Toutes tes tâches sont gardées sans limite de durée dans ta sauvegarde en ligne privée, mois par mois, et se retrouvent sur tous tes appareils. Tu peux aussi en garder une copie à toi.'
                : 'Toutes tes tâches restent gardées dans ce navigateur, sans limite de durée. Exporte-les de temps en temps pour ne rien perdre si tu changes d’appareil ou effaces les données du navigateur.'}
              <span className="mt-2 block">
                <Button size="sm" icon={<Download size={14} />} onClick={exportCsv} disabled={!chores.length}>
                  Exporter toutes mes tâches (tableur)
                </Button>
              </span>
            </Callout>
          </div>
        </>
      )}

      {view === 'recherche' && (
        <Card className="mt-4">
          <CardTitle icon={<Search size={16} />} accent="chore" title="Retrouver une tâche" subtitle="Quand ai-je fait les vitres pour la dernière fois ?" />
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input id="chore-search" className="!pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ex. vitres, frigo, draps…" />
          </div>
          {query.trim() && !results.length && <p className="mt-3 text-sm text-ink-2">Aucune tâche trouvée dans ton historique.</p>}
          <ul className="mt-3 space-y-3">
            {results.map((g) => (
              <li key={g.name} className="rounded-xl bg-surface-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{g.name}</p>
                  <span className="shrink-0 text-xs text-ink-3">{g.count} fois</span>
                </div>
                <p className="text-sm text-ink-2">
                  Dernière fois : {fmtDate(g.last, 'EEEE d MMMM yyyy')} ({ago(g.last, today)})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.dates.slice(0, 24).map((d, i) => (
                    <button key={`${d}-${i}`} type="button" onClick={() => goTo(d)} className="rounded-md bg-surface px-2 py-0.5 text-xs text-ink-2 hover:text-ink">
                      {fmtDate(d, 'd MMM yyyy')}
                    </button>
                  ))}
                  {g.dates.length > 24 && <span className="px-1 text-xs text-ink-3">+ {g.dates.length - 24} autres</span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
