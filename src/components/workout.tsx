import { useState } from 'react'
import clsx from 'clsx'
import { CircleAlert, CircleCheck, Repeat } from 'lucide-react'
import type { PlannedWorkout, Run, StepResult, WorkoutBlock, WorkoutStep } from '../types'
import { fmtKm, fmtPace } from '../lib/format'
import { STEP_LABEL, VERDICT_LABEL, checkSummary, fmtStepAmount, fmtStepTime, fmtTarget, isRepeat, judgeWholeRun } from '../lib/workout'

const KIND_DOT: Record<WorkoutStep['kind'], string> = { work: 'var(--run)', recovery: 'var(--sleep)', warmup: 'var(--ink-3)', cooldown: 'var(--ink-3)', other: 'var(--ink-3)' }

function StepRow({ s }: { s: WorkoutStep }) {
  const target = fmtTarget(s.target)
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span className="size-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: KIND_DOT[s.kind] }} aria-hidden />
      <span className={clsx('font-medium', s.kind !== 'work' && 'text-ink-2')}>{STEP_LABEL[s.kind]}</span>
      <span className="text-ink-2">{fmtStepAmount(s)}</span>
      {target && <span className="ml-auto shrink-0 pl-2 text-xs text-ink-3 tabular">{target}</span>}
    </li>
  )
}

/** Structure d'une séance : échauffement, blocs répétés, cibles d'allure ou de FC */
export function WorkoutSteps({ blocks, className }: { blocks: WorkoutBlock[]; className?: string }) {
  return (
    <ol className={clsx('space-y-1.5', className)} aria-label="Déroulé de la séance">
      {blocks.map((b, i) =>
        isRepeat(b) ? (
          <li key={i} className="rounded-xl border border-line bg-surface-2/60 px-2.5 py-2">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink-2">
              <Repeat size={12} aria-hidden /> {b.repeat} fois
            </p>
            <ol className="space-y-1">
              {b.steps.map((s, j) => (
                <StepRow key={j} s={s} />
              ))}
            </ol>
          </li>
        ) : (
          <StepRow key={i} s={b} />
        ),
      )}
    </ol>
  )
}

/** Consignes du plan, repliées au-delà de 3 lignes */
export function WorkoutNotes({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 160
  return (
    <div className="text-sm text-ink-2">
      <p className={clsx('whitespace-pre-line', !open && long && 'line-clamp-3')}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          className="mt-1 text-xs font-medium text-brand hover:underline"
        >
          {open ? 'Réduire' : 'Lire toutes les consignes'}
        </button>
      )}
    </div>
  )
}

function actualText(r: StepResult): string {
  if (r.target?.type === 'pace' && r.m > 0) return `${fmtPace(r.sec / (r.m / 1000))} /km`
  if (r.target?.type === 'hr' && r.hr) return `${r.hr} bpm`
  return [fmtStepTime(r.sec), r.m >= 100 ? `${fmtKm(r.m / 1000)} km` : ''].filter(Boolean).join(' · ')
}

function Verdict({ r }: { r: StepResult }) {
  if (!r.verdict) return <span className="text-xs text-ink-3">{r.target ? 'trop court pour juger' : ''}</span>
  const ok = r.verdict === 'in'
  const Icon = ok ? CircleCheck : CircleAlert
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
      <Icon size={13} style={{ color: ok ? 'var(--good)' : 'var(--warn)' }} aria-hidden />
      {VERDICT_LABEL[r.verdict]}
    </span>
  )
}

/** Prévu / réalisé d'une sortie, étape par étape (ou sur la sortie entière pour une séance d'un seul bloc) */
export function SessionCheckView({ run, planned, onlyWork }: { run: Run; planned?: PlannedWorkout; onlyWork?: boolean }) {
  const whole = !run.check ? judgeWholeRun(planned?.steps, run) : undefined
  if (run.check?.aligned) {
    const { judged, inTarget } = checkSummary(run.check.results)
    const rows = run.check.results.filter((r) => !onlyWork || r.kind === 'work')
    return (
      <div>
        <p className="text-sm font-semibold">
          Prévu / réalisé :{' '}
          {judged ? (
            <>
              {inTarget} effort{inTarget > 1 ? 's' : ''} sur {judged} dans la cible
            </>
          ) : (
            'toutes les étapes faites'
          )}
        </p>
        <ol className="mt-2 space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 text-sm">
              <span className={clsx('min-w-0', r.kind !== 'work' && 'text-ink-2')}>
                {STEP_LABEL[r.kind]}
                {r.rep ? ` ${r.rep}` : ''} <span className="text-ink-3">· {fmtStepAmount({ durationSec: r.plannedSec, distanceM: r.plannedM })}</span>
              </span>
              <span className="text-right font-medium tabular">{actualText(r)}</span>
              <span className="text-xs text-ink-3">{fmtTarget(r.target) ? `cible ${fmtTarget(r.target)}` : ''}</span>
              <span className="text-right">
                <Verdict r={r} />
              </span>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (run.check && !run.check.aligned)
    return <p className="text-xs text-ink-3">Les tours de ta montre ne correspondent pas aux étapes prévues (un tour en plus ou en moins) : pas de comparaison détaillée pour cette sortie.</p>
  if (whole)
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span>
          <span className="font-semibold">Prévu / réalisé :</span> {actualText(whole)} <span className="text-ink-3">· cible {fmtTarget(whole.target)}</span>
        </span>
        <Verdict r={whole} />
      </div>
    )
  return null
}
