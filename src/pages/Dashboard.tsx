import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { BatteryCharging, CalendarDays, Check, ChevronRight, Footprints, Gauge, Moon, Plus, SprayCan, Utensils } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { ACCENT_BG_SOFT, ACCENT_TEXT, Button, Card, type Accent } from '../components/ui'
import { MiniBars } from '../components/charts'
import { KIND_ICON } from '../components/activity'
import { Bar, StatusPill, TONE_COLOR } from '../components/readiness'
import { addDaysISO, capitalize, fmtDate, fmtDateLong, fmtDuration, fmtKm, fmtMinutes, fmtNum, fmtPace, relativeDay, todayISO, weekStartISO } from '../lib/format'
import { RUN_TYPES, runsInRange, weeklyRunSummary } from '../lib/running'
import { lastSleep, readiness, recoveryView, sleepStats } from '../lib/insights'
import { dayEnergy, dayIntake } from '../lib/energy'
import { choreCounts, choresPerDay } from '../lib/chores'
import type { PlannedWorkout } from '../types'

const KIND_COLOR: Record<string, string> = { run: 'var(--run)', renfo: 'var(--renfo)', muscu: 'var(--muscu)', repos: 'var(--sleep)', autre: 'var(--brand)' }
const KIND_LABEL: Record<string, string> = { run: 'Course', renfo: 'Renforcement', muscu: 'Musculation', repos: 'Repos', autre: 'Séance' }

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

/** 480 → « 8 h », 450 → « 7 h 30 » */
function fmtGoal(min: number): string {
  return min % 60 === 0 ? `${min / 60} h` : fmtMinutes(min)
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-surface-3/80 px-2.5 py-1 text-xs font-medium text-ink-2">{children}</span>
}

// ── 1. Séance du jour ───────────────────────────────────────
function TodaySession() {
  const data = useStore()
  const { openForm, setQuickAdd } = useUi()
  const today = todayISO()
  const sessions = data.planned.filter((p) => p.date === today && p.kind !== 'repos')
  const runsToday = runsInRange(data.runs, today, today)
  const renfoToday = data.renfo.filter((s) => s.date === today)
  const muscuToday = data.muscu.filter((s) => s.date === today)
  const isDone = (p: PlannedWorkout) => !!p.done || (p.kind === 'run' && runsToday.length > 0) || (p.kind === 'renfo' && renfoToday.length > 0) || (p.kind === 'muscu' && muscuToday.length > 0)
  const main = sessions.find((p) => !isDone(p)) ?? sessions[0]
  const others = sessions.filter((p) => p !== main)
  const upcoming = data.planned.filter((p) => p.date > today && p.kind !== 'repos').sort((a, b) => a.date.localeCompare(b.date))
  const next = upcoming[0]
  const tomorrow = upcoming.filter((p) => p.date === addDaysISO(today, 1))

  // Ce qui a été fait aujourd'hui, sans séance prévue
  const run = [...runsToday].sort((a, b) => b.distanceKm - a.distanceKm)[0]
  const freeDone = !main && (run || renfoToday[0] || muscuToday[0])
  const kind = main?.kind ?? (run ? 'run' : renfoToday[0] ? 'renfo' : muscuToday[0] ? 'muscu' : 'repos')
  const color = KIND_COLOR[kind] ?? 'var(--brand)'
  const done = main ? isDone(main) : !!freeDone

  const complete = (p: PlannedWorkout) => {
    if (p.kind === 'run') openForm('run', { date: p.date, type: p.runType ?? 'ef', title: p.title, distanceKm: p.targetDistanceKm, durationSec: p.targetDurationMin ? p.targetDurationMin * 60 : undefined, plannedId: p.id })
    else if (p.kind === 'renfo') {
      data.upsert('planned', { ...p, done: true })
      openForm('renfo', { date: p.date, title: p.title })
    } else if (p.kind === 'muscu') {
      data.upsert('planned', { ...p, done: true })
      openForm('muscu', { date: p.date, title: p.title })
    } else data.upsert('planned', { ...p, done: true })
  }

  const title = main ? main.title : run ? run.title || RUN_TYPES[run.type].label : renfoToday[0]?.title ?? muscuToday[0]?.title ?? 'Repos'
  // « Plan COROS » indique la source de la séance : affiché en pastille, pas en description
  const fromCoros = main?.description === 'Plan COROS'
  const chips: string[] = main
    ? [main.kind === 'run' && main.runType ? RUN_TYPES[main.runType].label : '', main.targetDistanceKm ? `${fmtKm(main.targetDistanceKm)} km` : '', main.targetDurationMin ? fmtMinutes(main.targetDurationMin) : '', fromCoros ? 'Plan COROS' : ''].filter(Boolean)
    : []
  const doneStats = run ? [`${fmtKm(run.distanceKm)} km`, fmtDuration(run.durationSec), `${fmtPace(run.durationSec / run.distanceKm)} /km`, run.avgHr ? `${run.avgHr} bpm` : ''].filter(Boolean) : renfoToday[0] ? [`${renfoToday[0].durationMin} min`] : muscuToday[0] ? [`${muscuToday[0].durationMin} min`] : []

  return (
    <section
      aria-label="Séance du jour"
      className="relative overflow-hidden rounded-3xl border border-line p-5 sm:p-6"
      style={{ background: `radial-gradient(120% 130% at 100% 0%, color-mix(in oklab, ${color} 30%, transparent) 0%, transparent 58%), var(--surface)` }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-2">
        <span className="grid size-6 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 22%, transparent)`, color }}>
          {KIND_ICON[kind]?.icon ?? <CalendarDays size={14} />}
        </span>
        Séance du jour
        {main && <span className="font-medium normal-case tracking-normal text-ink-3">· {KIND_LABEL[main.kind]}</span>}
      </div>

      <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{main || freeDone ? title : 'Repos aujourd’hui'}</h2>

      {main || freeDone ? (
        <>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          )}
          {main?.description && !fromCoros && <p className="mt-3 line-clamp-2 text-sm text-ink-2">{main.description}</p>}
          {done ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill tone="good">Séance faite</StatusPill>
              {doneStats.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {main && !isDone(main) && (
              <Button variant="primary" icon={<Check size={16} />} onClick={() => complete(main)}>
                C’est fait
              </Button>
            )}
            <Link to="/planning" className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink-2 transition hover:bg-surface-3/60 hover:text-ink">
              Voir le planning <ChevronRight size={15} />
            </Link>
          </div>
          {others.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              {others.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className={clsx('shrink-0', ACCENT_TEXT[KIND_ICON[p.kind]?.accent ?? 'neutral'])}>{KIND_ICON[p.kind]?.icon}</span>
                  <span className={clsx('min-w-0 flex-1 truncate', isDone(p) && 'text-ink-3 line-through')}>Aussi : {p.title}</span>
                  {!isDone(p) && (
                    <button type="button" onClick={() => complete(p)} className="shrink-0 text-xs font-semibold text-renfo hover:underline">
                      C’est fait
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-2">Aucune séance prévue. Récupération active si tu en as envie : marche, mobilité, étirements.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button icon={<Plus size={16} />} onClick={() => setQuickAdd(true)}>
              Noter une séance
            </Button>
            <Link to="/planning" className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink-2 transition hover:bg-surface-3/60 hover:text-ink">
              Voir le planning <ChevronRight size={15} />
            </Link>
          </div>
        </>
      )}

      {(tomorrow.length > 0 || (!main && next)) && (
        <p className="mt-4 text-xs text-ink-3">
          {tomorrow.length > 0 ? (
            <>
              Demain : <span className="text-ink-2">{tomorrow.map((p) => p.title).join(' + ')}</span>
            </>
          ) : (
            next && (
              <>
                Prochaine séance : <span className="text-ink-2">{relativeDay(next.date, today).toLowerCase()} · {next.title}</span>
              </>
            )
          )}
        </p>
      )}
    </section>
  )
}

// ── 2. Sommeil, forme et récupération ───────────────────────
function Metric({ icon, label, value, unit, bar, sub }: { icon: ReactNode; label: string; value: string; unit?: string; bar?: { pct: number; color: string; label: string }; sub: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
        {icon}
        {label}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-xs text-ink-3">{unit}</span>}
      </p>
      {bar ? <Bar className="mt-2" pct={bar.pct} color={bar.color} label={bar.label} /> : <div className="mt-2 h-1.5 rounded-full bg-surface-3" />}
      <p className="mt-1.5 text-xs leading-snug text-ink-3">{sub}</p>
    </div>
  )
}

function FormPanel() {
  const data = useStore()
  const today = todayISO()
  const r = readiness(data, today)
  const rec = recoveryView(data.sync)
  const night = lastSleep(data.sleep, today)
  const goal = data.profile.sleepGoalMin || 480
  const ratio = night ? night.durationMin / goal : 0
  const sleepColor = ratio >= 0.9 ? 'var(--sleep)' : ratio >= 0.75 ? TONE_COLOR.warning : TONE_COLOR.critical

  return (
    <Link to="/sommeil" className="group mt-4 block rounded-3xl border border-line bg-surface p-5 transition hover:border-ink-3/40 focus-visible:outline-2 focus-visible:outline-brand sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Ma forme du jour</h2>
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-ink-3 transition group-hover:text-ink-2">
          Détails <ChevronRight size={14} />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 sm:gap-x-6">
        <div className="col-span-2 sm:col-span-1 sm:border-r sm:border-line sm:pr-6">
          <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
            <Gauge size={15} className="text-brand" /> Forme
          </p>
          {r ? (
            <>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tracking-tight">{r.score}</span>
                <span className="text-sm text-ink-3">/ 100</span>
              </p>
              <StatusPill tone={r.tone} className="mt-2">
                {r.label}
              </StatusPill>
              <p className="mt-2 text-[13px] leading-snug text-ink-2">{r.advice}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-2">Ta nuit n’est pas encore là : ta forme s’affichera dès qu’elle sera synchronisée ou notée.</p>
          )}
        </div>
        <div className="border-t border-line pt-4 sm:border-t-0 sm:pt-0">
          <Metric
            icon={<Moon size={15} className="text-sleep" />}
            label="Sommeil"
            value={night ? fmtMinutes(night.durationMin) : '—'}
            unit={night?.score ? `score ${night.score}` : undefined}
            bar={night ? { pct: ratio * 100, color: sleepColor, label: 'Sommeil de la nuit par rapport à ton objectif' } : undefined}
            sub={night ? `${night.bedtime && night.wakeTime ? `${night.bedtime} → ${night.wakeTime} · ` : ''}objectif ${fmtGoal(goal)}` : 'Pas encore de nuit'}
          />
        </div>
        <div className="border-t border-line pt-4 sm:border-t-0 sm:pt-0">
          <Metric
            icon={<BatteryCharging size={15} className="text-good" />}
            label="Récupération"
            value={rec ? `${rec.pct} %` : '—'}
            bar={rec ? { pct: rec.pct, color: TONE_COLOR[rec.tone], label: 'Récupération mesurée par la montre' } : undefined}
            sub={rec ? `${rec.label}${rec.remainingH > 0 ? ` · complète dans ~${rec.remainingH} h` : ''}` : 'Mesurée par ta montre COROS'}
          />
        </div>
      </div>
    </Link>
  )
}

// ── 3. Chiffres clés : chaque tuile ouvre sa page ───────────
function Tile({ to, icon, accent, label, value, unit, children, sub }: { to: string; icon: ReactNode; accent: Accent; label: string; value: string; unit?: string; children?: ReactNode; sub?: ReactNode }) {
  return (
    <Link to={to} className="group flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-ink-3/40 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand">
      <div className="flex items-center gap-2 text-[13px] text-ink-2">
        <span className={clsx('grid size-7 shrink-0 place-items-center rounded-lg', ACCENT_BG_SOFT[accent], ACCENT_TEXT[accent])}>{icon}</span>
        <span className="min-w-0 leading-tight">{label}</span>
        <ChevronRight size={15} className="ml-auto shrink-0 text-ink-3 transition group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1">
        <span className="text-[26px] font-semibold leading-none tracking-tight">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </p>
      <div className="mt-auto pt-3">{children}</div>
      {sub && <p className="mt-1.5 text-xs leading-snug text-ink-3">{sub}</p>}
    </Link>
  )
}

function KeyFigures() {
  const data = useStore()
  const today = todayISO()
  const { profile } = data
  const weeks = weeklyRunSummary(data.runs, 2)
  const week = weeks[weeks.length - 1]
  const lastWeek = weeks[weeks.length - 2]
  const ws = weekStartISO(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i))
  const todayIdx = weekDays.indexOf(today)

  // Course
  const kmByDay = weekDays.map((d) => (d > today ? null : runsInRange(data.runs, d, d).reduce((a, r) => a + r.distanceKm, 0)))
  // Calories
  const energy = dayEnergy(data, today)
  const intake = dayIntake(data.food, today)
  const left = energy.target - intake.kcal
  const over = intake.count > 0 && left < 0
  // Tâches
  const chores = choreCounts(data.chores, today)
  const perDay = choresPerDay(data.chores, ws, today)
  // Sommeil
  const goal = profile.sleepGoalMin || 480
  const ss = sleepStats(data.sleep, goal, 7, today)
  const nights = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(today, i - 6)
    const e = data.sleep.find((x) => x.date === date)
    return { date, total: e ? e.durationMin + (e.napMin ?? 0) : null }
  })

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile to="/course" icon={<Footprints size={16} />} accent="run" label="Km de la semaine" value={fmtKm(week.km)} unit="km" sub={`${profile.weeklyKmGoal ? `Objectif ${fmtNum(profile.weeklyKmGoal)} km · ` : ''}${lastWeek ? `semaine passée ${fmtKm(lastWeek.km)} km` : ''}`}>
        {profile.weeklyKmGoal ? (
          <Bar pct={(week.km / profile.weeklyKmGoal) * 100} color="var(--run)" label="Kilomètres de la semaine par rapport à l’objectif" />
        ) : (
          <MiniBars values={kmByDay} color="var(--run)" highlight={todayIdx} labels={weekDays.map((d, i) => `${capitalize(fmtDate(d, 'EEEE d'))} : ${kmByDay[i] ? `${fmtKm(kmByDay[i]!)} km` : 'repos'}`)} />
        )}
      </Tile>

      <Tile
        to="/repas"
        icon={<Utensils size={16} />}
        accent="food"
        label="Calories du jour"
        value={fmtNum(intake.kcal)}
        unit="kcal"
        sub={intake.count === 0 ? `Objectif ${fmtNum(energy.target)} kcal · rien de noté` : over ? `${fmtNum(-left)} kcal au-dessus de l’objectif` : `Reste ${fmtNum(left)} kcal sur ${fmtNum(energy.target)}`}
      >
        <Bar pct={energy.target ? (intake.kcal / energy.target) * 100 : 0} color={over && -left > energy.target * 0.1 ? TONE_COLOR.warning : 'var(--food)'} label="Calories mangées par rapport à l’objectif du jour" />
      </Tile>

      <Tile to="/menage" icon={<SprayCan size={16} />} accent="chore" label="Tâches ménagères" value={String(chores.today)} unit={`aujourd’hui`} sub={`${chores.week} cette semaine · ${chores.month} ce mois-ci`}>
        <MiniBars
          values={weekDays.map((d) => (d > today ? null : (perDay.get(d) ?? 0)))}
          color="var(--chore)"
          highlight={todayIdx}
          labels={weekDays.map((d) => `${capitalize(fmtDate(d, 'EEEE d'))} : ${perDay.get(d) ?? 0} tâche${(perDay.get(d) ?? 0) > 1 ? 's' : ''}`)}
        />
      </Tile>

      <Tile to="/sommeil" icon={<Moon size={16} />} accent="sleep" label="Sommeil moyen" value={ss.avgDailyMin ? fmtMinutes(ss.avgDailyMin) : '—'} unit="par jour" sub={ss.avgDailyMin ? `7 derniers jours · objectif ${fmtGoal(goal)}` : 'Aucune nuit ces 7 derniers jours'}>
        <MiniBars values={nights.map((n) => n.total)} color="var(--sleep)" highlight={6} max={Math.max(goal, ...nights.map((n) => n.total ?? 0))} labels={nights.map((n) => `${capitalize(fmtDate(n.date, 'EEEE d'))} : ${n.total ? fmtMinutes(n.total) : 'pas de données'}`)} />
      </Tile>
    </div>
  )
}

export default function Dashboard() {
  const data = useStore()
  const today = todayISO()
  const { runs, renfo, muscu, sleep, races, profile } = data
  const empty = !runs.length && !renfo.length && !muscu.length && !sleep.length && !races.length

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm text-ink-3">{capitalize(fmtDateLong(today))}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting()}
          {profile.name ? `, ${profile.name}` : ''}
        </h1>
      </header>

      {empty && (
        <Card className="mb-4 border-brand/30 bg-brand/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Bienvenue sur Life !</p>
              <p className="mt-1 text-sm text-ink-2">Commence par remplir ton profil (poids, FC max, objectif), puis enregistre tes séances, tes nuits et tes repas. Tu peux aussi importer une sauvegarde ou des fichiers de ta montre.</p>
            </div>
            <Link to="/reglages">
              <Button variant="primary">Compléter mon profil</Button>
            </Link>
          </div>
        </Card>
      )}

      <TodaySession />
      <FormPanel />
      <KeyFigures />
    </div>
  )
}
