import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowRight, Flag, MapPin, Timer } from 'lucide-react'
import type { Race } from '../types'
import { daysBetween, fmtDateLong, fmtDuration, fmtNum, fmtPace, capitalize, todayISO } from '../lib/format'
import { RACE_KIND_LABEL, loopKmOf, predictTime, prepPhase, raceDistanceKm, type Performance } from '../lib/running'
import { Badge, Button, Card, EmptyState } from './ui'
import { useUi } from '../store/useStore'

export interface RacePrediction {
  timeSec: number
  pace: number
  from: Performance
  loopSec?: number
  restSec?: number
}

export function racePrediction(race: Race, perfs: Performance[]): RacePrediction | undefined {
  const dist = raceDistanceKm(race)
  if (!dist) return undefined
  const p = predictTime(perfs, dist)
  if (!p) return undefined
  const pace = p.timeSec / dist
  if (race.kind === 'backyard') {
    const loopSec = pace * loopKmOf(race)
    return { timeSec: p.timeSec, pace, from: p.from, loopSec, restSec: 3600 - loopSec }
  }
  return { timeSec: p.timeSec, pace, from: p.from }
}

const PHASES = [
  { key: 'base', label: 'Base', from: Infinity, to: 85 },
  { key: 'developpement', label: 'Développement', from: 84, to: 43 },
  { key: 'specifique', label: 'Spécifique', from: 42, to: 15 },
  { key: 'affutage', label: 'Affûtage', from: 14, to: 0 },
]

export function PhaseStepper({ days }: { days: number }) {
  const idx = PHASES.findIndex((p) => days <= p.from && days >= p.to)
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label="Phases de préparation">
      {PHASES.map((p, i) => (
        <div key={p.key}>
          <div className={clsx('h-1.5 rounded-full', i < idx ? 'bg-race/45' : i === idx ? 'bg-race' : 'bg-surface-3')} />
          <p className={clsx('mt-1.5 truncate text-[11px]', i === idx ? 'font-semibold text-ink' : 'text-ink-3')}>{p.label}</p>
        </div>
      ))}
    </div>
  )
}

export function NextRaceCard({ race, perfs, compact }: { race?: Race; perfs: Performance[]; compact?: boolean }) {
  const openForm = useUi((s) => s.openForm)
  if (!race)
    return (
      <Card className="h-full">
        <EmptyState
          icon={<Flag size={22} />}
          title="Aucune course au programme"
          text="Ajoute ta prochaine course : compte à rebours, phase de préparation et prédiction de temps s’afficheront ici."
          action={
            <Button variant="primary" onClick={() => openForm('race')}>
              Ajouter une course
            </Button>
          }
        />
      </Card>
    )
  const days = daysBetween(todayISO(), race.date)
  const phase = prepPhase(days, race)
  const pred = racePrediction(race, perfs)
  const dist = raceDistanceKm(race)
  const goalPace = race.goalTimeSec && race.distanceKm ? race.goalTimeSec / race.distanceKm : undefined

  return (
    <Card className="relative h-full overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-race/10 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-race">Prochain objectif</span>
            <Badge accent="race">Priorité {race.priority}</Badge>
            <Badge>{RACE_KIND_LABEL[race.kind]}</Badge>
          </div>
          <h2 className="mt-1.5 text-xl font-bold leading-tight sm:text-2xl">{race.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>{capitalize(fmtDateLong(race.date))}</span>
            {race.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {race.location}
              </span>
            )}
            <span>
              {race.kind === 'backyard' ? `${race.goalLoops ?? '?'} boucles · ${fmtNum(dist, 1)} km` : `${fmtNum(dist, 1)} km`}
              {race.elevationM ? ` · ${race.elevationM} m D+` : ''}
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold leading-none tracking-tight">{days}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-3">{days > 1 ? 'jours' : 'jour'}</div>
        </div>
      </div>

      <div className="relative mt-5">
        <PhaseStepper days={days} />
      </div>

      <div className={clsx('relative mt-4 grid gap-3', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Phase actuelle</p>
          <p className="mt-0.5 text-sm font-semibold">{phase.label}</p>
          <p className="mt-0.5 text-xs text-ink-2">{phase.advice}</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Objectif</p>
          {race.kind === 'backyard' ? (
            <>
              <p className="mt-0.5 text-sm font-semibold">{race.goalLoops ?? '?'} boucles en 1 h max</p>
              <p className="mt-0.5 text-xs text-ink-2">
                Boucle de {fmtNum(loopKmOf(race), 2)} km · plafond {fmtPace(3600 / loopKmOf(race))} /km
              </p>
            </>
          ) : race.goalTimeSec ? (
            <>
              <p className="mt-0.5 text-sm font-semibold tabular">{fmtDuration(race.goalTimeSec)}</p>
              <p className="mt-0.5 text-xs text-ink-2">Allure cible {fmtPace(goalPace)} /km</p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-ink-2">Finir avec le sourire 😄</p>
          )}
        </div>
        {!compact && (
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="flex items-center gap-1 text-xs text-ink-3">
              <Timer size={12} /> Estimation actuelle
            </p>
            {pred ? (
              race.kind === 'backyard' && pred.loopSec ? (
                <>
                  <p className="mt-0.5 text-sm font-semibold tabular">
                    {fmtDuration(pred.loopSec)} / boucle · {fmtPace(pred.pace)} /km
                  </p>
                  <p className="mt-0.5 text-xs text-ink-2">{pred.restSec && pred.restSec > 0 ? `≈ ${Math.round(pred.restSec / 60)} min de marge par boucle` : 'Pas de marge : travaille l’endurance'}</p>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-sm font-semibold tabular">
                    {fmtDuration(pred.timeSec)} · {fmtPace(pred.pace)} /km
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-2">D’après : {pred.from.source}</p>
                </>
              )
            ) : (
              <p className="mt-0.5 text-xs text-ink-2">Ajoute un record ou un résultat de course pour obtenir une estimation.</p>
            )}
          </div>
        )}
      </div>
      {compact && (
        <Link to="/objectifs" className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-race hover:underline">
          Voir toutes mes courses <ArrowRight size={15} />
        </Link>
      )}
    </Card>
  )
}
