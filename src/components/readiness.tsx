import type { ReactNode } from 'react'
import clsx from 'clsx'
import { BatteryCharging, CircleAlert, CircleCheck, Gauge, Minus, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Card, CardTitle } from './ui'
import { corosLoadStatus, readiness, recoveryView } from '../lib/insights'
import { fmtNum } from '../lib/format'

export type Tone = 'good' | 'warning' | 'critical'

export const TONE_COLOR: Record<Tone, string> = { good: 'var(--good)', warning: 'var(--warn)', critical: 'var(--critical)' }

/** État (bon / moyen / mauvais) : toujours une icône + un libellé, jamais la couleur seule */
export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const Icon = tone === 'good' ? CircleCheck : tone === 'warning' ? CircleAlert : TriangleAlert
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink', className)} style={{ background: `color-mix(in oklab, ${TONE_COLOR[tone]} 18%, transparent)` }}>
      <Icon size={13} style={{ color: TONE_COLOR[tone] }} aria-hidden />
      {children}
    </span>
  )
}

/** Jauge : le remplissage porte la couleur, la piste est une teinte atténuée de la même couleur */
export function Bar({ pct, color, label, className }: { pct: number; color: string; label: string; className?: string }) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full', className)} style={{ background: `color-mix(in oklab, ${color} 20%, var(--surface-3))` }} role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${w}%`, background: color }} />
    </div>
  )
}

/** Détail de la forme du jour (page Sommeil & récupération) */
export function ReadinessDetail() {
  const data = useStore()
  const r = readiness(data)
  const rec = recoveryView(data.sync)
  const load = corosLoadStatus(data.sync)
  if (!r && !rec) return null
  return (
    <Card className="mb-4">
      <CardTitle icon={<Gauge size={16} />} accent="sleep" title="Forme du jour" subtitle="Sommeil, VFC, FC de repos, charge et récupération mesurées par ta montre" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          {r ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tracking-tight">{r.score}</span>
                <span className="text-sm text-ink-3">/ 100</span>
              </div>
              <StatusPill tone={r.tone} className="mt-2">
                {r.label}
              </StatusPill>
              <p className="mt-2 text-sm text-ink-2">{r.advice}</p>
            </>
          ) : (
            <p className="text-sm text-ink-2">Il manque ta nuit pour calculer la forme du jour.</p>
          )}
        </div>
        {r && (
          <ul className="space-y-1.5 lg:col-span-1">
            {r.factors.map((f) => (
              <li key={f.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-ink-2">
                  {f.impact === 'up' ? <TrendingUp size={14} className="text-good" /> : f.impact === 'down' ? <TrendingDown size={14} className="text-critical" /> : <Minus size={14} className="text-ink-3" />}
                  {f.label}
                </span>
                <span className="font-medium tabular">{f.value}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-3 rounded-xl bg-surface-2 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <BatteryCharging size={15} className="text-sleep" /> Mesures COROS
          </p>
          {rec ? (
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-2">Récupération</span>
                <span className="font-semibold">{rec.pct} %</span>
              </div>
              <Bar className="mt-1.5" pct={rec.pct} color={TONE_COLOR[rec.tone]} label="Récupération" />
              <p className="mt-1 text-xs text-ink-3">
                {rec.label}
                {rec.remainingH > 0 ? ` · complète dans ~${rec.remainingH} h` : ''}
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-3">Récupération pas encore lue : elle arrive à la prochaine synchronisation.</p>
          )}
          {load && (
            <div className="text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-2">Charge</span>
                <span className="font-semibold">
                  {load.comment ?? load.label}
                  {load.ratio ? <span className="font-normal text-ink-3"> · ratio {fmtNum(load.ratio, 2)}</span> : null}
                </span>
              </div>
              {load.acute || load.chronicWeekly ? (
                <p className="mt-0.5 text-xs text-ink-3">
                  Court terme {fmtNum(load.acute)} · long terme {fmtNum(load.chronicWeekly)}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
