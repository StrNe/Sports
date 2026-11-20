import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, BedDouble, CalendarDays, Check, ChevronRight, Flame, Footprints, Gauge, Lightbulb, Moon, Plus, TrendingDown, TrendingUp, Minus, Trophy, Utensils } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { ACCENT_BG, ACCENT_BG_SOFT, ACCENT_TEXT, Badge, Button, Card, CardTitle, EmptyState, Meter, ProgressRing, type Accent } from '../components/ui'
import { MiniBars, SimpleBarChart } from '../components/charts'
import { NextRaceCard } from '../components/race'
import { FeedRow, KIND_ICON, buildFeed } from '../components/activity'
import { addDaysISO, capitalize, fmtDate, fmtDateLong, fmtDuration, fmtKm, fmtMinutes, fmtNum, todayISO, weekStartISO } from '../lib/format'
import { bestEfforts, dailyLoads, loadStatus, referencePerformances, runsInRange, weeklyRunSummary } from '../lib/running'
import { coachTips, nextGoalRace, readiness, sleepStats } from '../lib/insights'
import { slotForNow } from '../lib/nutrition'
import { CalorieSummary } from '../components/food'
import type { PlannedWorkout } from '../types'

const TILE = 'block rounded-2xl border border-line bg-surface p-4 transition hover:border-ink-3/40 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function Dashboard() {
  const data = useStore()
  const { openForm } = useUi()
  const today = todayISO()
  const { runs, renfo, muscu, races, records, sleep, planned, profile } = data

  const perfs = useMemo(() => referencePerformances(runs, races, records), [runs, races, records])
  const race = nextGoalRace(races)
  const ready = readiness(data)
  const weeks = useMemo(() => weeklyRunSummary(runs, 10), [runs])
  const thisWeek = weeks[weeks.length - 1]
  const lastWeek = weeks[weeks.length - 2]
  const ws = weekStartISO(today)
  const renfoWeek = renfo.filter((s) => s.date >= ws).length
  const muscuWeek = muscu.filter((s) => s.date >= ws).length
  const sessionsWeek = thisWeek.runs + renfoWeek + muscuWeek
  const ss = sleepStats(sleep, profile.sleepGoalMin, 7)
  const sleepDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(today, -(6 - i))
    const e = sleep.find((x) => x.date === date)
    return { date, total: e ? e.durationMin + (e.napMin ?? 0) : null }
  })
  const load = loadStatus(dailyLoads(runs, renfo, muscu))
  const tips = coachTips(data).slice(0, 3)
  const feed = buildFeed(runs, renfo, muscu).slice(0, 6)
  const best = bestEfforts(runs, races, records)
  const empty = !runs.length && !renfo.length && !muscu.length && !sleep.length && !races.length

  const todayPlanned = planned.filter((p) => p.date === today)
  const tomorrowPlanned = planned.filter((p) => p.date === addDaysISO(today, 1))
  const todayDone = buildFeed(runsInRange(runs, today, today), renfo.filter((s) => s.date === today), muscu.filter((s) => s.date === today))


  const completePlanned = (p: PlannedWorkout) => {
    if (p.kind === 'run') openForm('run', { date: p.date, type: p.runType ?? 'ef', title: p.title, distanceKm: p.targetDistanceKm, durationSec: p.targetDurationMin ? p.targetDurationMin * 60 : undefined, plannedId: p.id })
    else if (p.kind === 'renfo') openForm('renfo', { date: p.date, title: p.title })
    else if (p.kind === 'muscu') openForm('muscu', { date: p.date, title: p.title })
    else data.upsert('planned', { ...p, done: true })
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-sm text-ink-3">{capitalize(fmtDateLong(today))}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting()}
          {profile.name ? `, ${profile.name}` : ''} 👋
        </h1>
      </header>

      {empty && (
        <Card className="mb-5 border-brand/30 bg-brand/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Bienvenue sur Foulée !</p>
              <p className="mt-1 text-sm text-ink-2">Commence par remplir ton profil (poids, FC max, objectif), ajoute ta prochaine course puis enregistre tes séances. Tu peux aussi importer une sauvegarde ou des fichiers de ta montre.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/reglages">
                <Button variant="primary">Compléter mon profil</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Objectif + forme du jour */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NextRaceCard race={race} perfs={perfs} />
        </div>
        <Card>
          <CardTitle icon={<Gauge size={16} />} title="Forme du jour" subtitle="Sommeil, FC de repos et charge" accent="sleep" />
          {ready ? (
            <div>
              <div className="flex items-center gap-4">
                <ProgressRing value={ready.score} size={84} stroke={8} color={ready.tone === 'good' ? 'var(--good)' : ready.tone === 'warning' ? 'var(--warn)' : 'var(--critical)'}>
                  <span className="text-2xl font-bold">{ready.score}</span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="font-semibold">{ready.label}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{ready.advice}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {ready.factors.map((f) => (
                  <li key={f.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      {f.impact === 'up' ? <TrendingUp size={14} className="text-good" /> : f.impact === 'down' ? <TrendingDown size={14} className="text-critical" /> : <Minus size={14} className="text-ink-3" />}
                      {f.label}
                    </span>
                    <span className="font-medium tabular">{f.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-ink-2">Enregistre ta nuit pour connaître ta forme du jour et savoir si tu peux enchaîner une séance intense.</p>
              <Button variant="primary" icon={<BedDouble size={16} />} onClick={() => openForm('sleep')}>
                Enregistrer ma nuit
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Aujourd'hui */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle
            icon={<CalendarDays size={16} />}
            title="Au programme aujourd’hui"
            subtitle={todayPlanned.length || todayDone.length ? undefined : 'Rien de prévu'}
            action={
              <Link to="/planning" className="text-sm font-medium text-ink-2 hover:text-ink">
                Planning →
              </Link>
            }
          />
          <div className="space-y-2">
            {todayPlanned.map((p) => {
              const k = KIND_ICON[p.kind]
              return (
                <div key={p.id} className={clsx('flex items-center gap-3 rounded-xl border p-3', p.done ? 'border-line bg-surface-2' : 'border-dashed border-line')}>
                  <span className={clsx('grid size-9 shrink-0 place-items-center rounded-lg', ACCENT_BG_SOFT[k.accent], ACCENT_TEXT[k.accent])}>{k.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={clsx('truncate text-sm font-medium', p.done && 'text-ink-3 line-through')}>{p.title}</p>
                    <p className="truncate text-xs text-ink-3">{[p.targetDistanceKm && `${fmtKm(p.targetDistanceKm)} km`, p.targetDurationMin && fmtMinutes(p.targetDurationMin), p.description].filter(Boolean).join(' · ') || 'Séance prévue'}</p>
                  </div>
                  {p.done ? (
                    <Badge accent="renfo">
                      <Check size={12} /> Fait
                    </Badge>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => completePlanned(p)}>
                      C’est fait
                    </Button>
                  )}
                </div>
              )
            })}
            {todayDone.map((f) => (
              <FeedRow key={f.item.id} f={f} />
            ))}
            {!todayPlanned.length && !todayDone.length && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
                <p className="text-sm text-ink-2">{race ? 'Jour off ou séance libre ? Pense à la récupération active : marche, mobilité.' : 'Planifie tes séances de la semaine pour les voir ici.'}</p>
                <Button size="sm" icon={<Plus size={15} />} onClick={() => openForm('run')}>
                  Séance
                </Button>
              </div>
            )}
            {tomorrowPlanned.length > 0 && (
              <p className="pt-1 text-xs text-ink-3">
                Demain : <span className="text-ink-2">{tomorrowPlanned.map((p) => p.title).join(' + ')}</span>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle
            icon={<Utensils size={16} />}
            accent="food"
            title="Calories du jour"
            subtitle="Mangé face à ton objectif"
            action={
              <Link to="/repas" className="text-sm font-medium text-ink-2 hover:text-ink">
                Suivi →
              </Link>
            }
          />
          <CalorieSummary date={today} compact />
          <Button variant="soft" className="mt-4 w-full" icon={<Plus size={16} />} onClick={() => openForm('food', { date: today, slot: slotForNow() })}>
            Noter un repas
          </Button>
        </Card>
      </div>

      {/* Chiffres clés : chaque tuile mène au détail */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link to="/course" className={TILE}>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
            <Footprints size={15} className="text-run" /> Km cette semaine
            <ChevronRight size={14} className="ml-auto text-ink-3" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tracking-tight">{fmtKm(thisWeek.km)}</span>
            <span className="text-sm text-ink-3">{profile.weeklyKmGoal ? `/ ${profile.weeklyKmGoal} km` : 'km'}</span>
          </div>
          {profile.weeklyKmGoal ? <Meter className="mt-2" value={thisWeek.km} max={profile.weeklyKmGoal} accent="run" label="Objectif hebdomadaire" /> : null}
          {lastWeek && <p className="mt-1.5 text-xs text-ink-3">Semaine passée : {fmtKm(lastWeek.km)} km</p>}
        </Link>
        <Link to="/seances" className={TILE}>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
            <Flame size={15} className="text-brand" /> Séances cette semaine
            <ChevronRight size={14} className="ml-auto text-ink-3" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tracking-tight">{sessionsWeek}</span>
            {profile.weeklySessionsGoal ? <span className="text-sm text-ink-3">/ {profile.weeklySessionsGoal}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
            {(
              [
                ['run', thisWeek.runs, 'course'],
                ['renfo', renfoWeek, 'renfo'],
                ['muscu', muscuWeek, 'muscu'],
              ] as [Accent, number, string][]
            ).map(([a, n, l]) => (
              <span key={l} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span className={clsx('size-2 rounded-full', ACCENT_BG[a])} />
                {n} {l}
              </span>
            ))}
          </div>
        </Link>
        <Link to="/sommeil" className={TILE}>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
            <Moon size={15} className="text-sleep" /> Sommeil moyen par jour
            <ChevronRight size={14} className="ml-auto text-ink-3" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tracking-tight">{ss.avgDailyMin ? fmtMinutes(ss.avgDailyMin) : '—'}</span>
            <span className="text-sm text-ink-3">/ {fmtMinutes(profile.sleepGoalMin)}</span>
          </div>
          <div className="mt-2">
            <MiniBars values={sleepDays.map((d) => d.total)} color="var(--sleep)" max={Math.max(profile.sleepGoalMin, ...sleepDays.map((d) => d.total ?? 0))} labels={sleepDays.map((d) => `${fmtDate(d.date, 'EEE d')} : ${d.total ? fmtMinutes(d.total) : 'pas de données'}`)} />
          </div>
          <p className="mt-1.5 text-xs text-ink-3">{ss.avgDailyMin ? `7 derniers jours${ss.avgNapMin && ss.avgNapMin >= 5 ? `, dont ${fmtMinutes(ss.avgNapMin)} de sieste` : ''}` : 'Aucune nuit enregistrée'}</p>
        </Link>
        <Link to="/course" className={TILE}>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
            <Gauge size={15} className="text-brand" /> Charge
            <ChevronRight size={14} className="ml-auto text-ink-3" />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">{load.ratio ? fmtNum(load.ratio, 2) : '—'}</div>
          <div className="mt-1 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1">
              <span className={clsx('size-2 rounded-full', load.zone === 'optimal' ? 'bg-good' : load.zone === 'vigilance' ? 'bg-warn' : load.zone === 'risque' ? 'bg-critical' : 'bg-ink-3')} />
              {load.label}
            </span>
          </div>
        </Link>
      </div>

      {/* Volume + conseils */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <CardTitle
            icon={<Footprints size={16} />}
            accent="run"
            title="Kilomètres par semaine"
            subtitle="10 dernières semaines"
            action={
              <Link to="/course" className="text-sm font-medium text-ink-2 hover:text-ink">
                Analyse →
              </Link>
            }
          />
          {runs.length ? (
            <SimpleBarChart
              ariaLabel="Kilomètres de course par semaine"
              data={weeks.map((w) => ({ label: w.label, value: Math.round(w.km * 10) / 10, tooltipLabel: `Semaine du ${w.label}`, sub: `${w.runs} sorties · ${fmtDuration(w.durationSec)}` }))}
              color="var(--run)"
              goal={profile.weeklyKmGoal}
              height={220}
              fill
              format={(v, row) => (
                <>
                  {fmtKm(v)} km <span className="font-normal text-ink-3">· {String(row.sub)}</span>
                </>
              )}
            />
          ) : (
            <EmptyState icon={<Footprints size={20} />} title="Pas encore de course" text="Tes kilomètres hebdomadaires apparaîtront ici." />
          )}
        </Card>
        <Card>
          <CardTitle icon={<Lightbulb size={16} />} accent="food" title="Conseils du coach" />
          <ul className="space-y-3">
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
      </div>

      {/* Activités récentes + records */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Dernières séances" icon={<Flame size={16} />} accent="brand" />
          {feed.length ? (
            <div className="-mx-2 divide-y divide-line">
              {feed.map((f) => (
                <FeedRow key={f.item.id} f={f} />
              ))}
            </div>
          ) : (
            <EmptyState title="Aucune séance enregistrée" text="Utilise le bouton + pour ajouter ta première séance." />
          )}
        </Card>
        <Card>
          <CardTitle
            icon={<Trophy size={16} />}
            accent="race"
            title="Mes records"
            action={
              <Link to="/objectifs" className="text-sm font-medium text-ink-2 hover:text-ink">
                Tout voir →
              </Link>
            }
          />
          {best.length ? (
            <ul className="space-y-2">
              {best.map((b) => (
                <li key={b.key} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                  <span className="text-sm text-ink-2">{b.label}</span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular">{fmtDuration(b.timeSec)}</span>
                    {b.estimated && <span className="block text-[10px] text-ink-3">estimé sur séance</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Ajoute tes records (5 km, 10 km, semi…) ou tes résultats de course pour suivre ta progression.</p>
          )}
          <Link to="/outils" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
            Calculer mes allures <ArrowRight size={14} />
          </Link>
        </Card>
      </div>
    </div>
  )
}
