import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, ComposedChart } from 'recharts'
import type { ReactNode } from 'react'
import clsx from 'clsx'

const AXIS_TICK = { fill: 'var(--ink-3)', fontSize: 11 }

interface TooltipPayload {
  value?: number
  payload?: Record<string, unknown>
}

function ChartTooltip({ active, payload, format, labelKey }: { active?: boolean; payload?: TooltipPayload[]; format: (v: number, row: Record<string, unknown>) => ReactNode; labelKey: string }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload ?? {}
  const v = payload[0].value
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-ink-3">{String(row[labelKey] ?? '')}</div>
      <div className="mt-0.5 font-semibold text-ink">{v == null ? '—' : format(v, row)}</div>
    </div>
  )
}

export interface BarDatum {
  label: string
  value: number
  highlight?: boolean
  [k: string]: unknown
}

/** Histogramme simple : barres fines arrondies en haut, objectif en ligne de référence. */
export function SimpleBarChart({
  data,
  color,
  height = 200,
  goal,
  goalLabel,
  format = (v) => String(v),
  tickFormat,
  tooltipLabelKey = 'tooltipLabel',
  ariaLabel,
  fill,
}: {
  data: BarDatum[]
  color: string
  height?: number
  goal?: number
  goalLabel?: string
  format?: (v: number, row: Record<string, unknown>) => ReactNode
  tickFormat?: (v: number) => string
  tooltipLabelKey?: string
  ariaLabel: string
  /** Remplit la hauteur disponible du parent (flex) */
  fill?: boolean
}) {
  const rows = data.map((d) => ({ ...d, tooltipLabel: d[tooltipLabelKey] ?? d.label }))
  return (
    <div style={fill ? { minHeight: height } : { height }} className={fill ? 'flex-1' : undefined} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        <BarChart data={rows} margin={{ top: 12, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={tickFormat} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'var(--surface-3)', opacity: 0.6 }} content={<ChartTooltip format={format} labelKey="tooltipLabel" />} />
          {goal ? <ReferenceLine y={goal} stroke="var(--ink-3)" strokeDasharray="0" strokeWidth={1} label={{ value: goalLabel ?? 'Objectif', position: 'insideTopRight', fill: 'var(--ink-3)', fontSize: 10 }} /> : null}
          <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]} fill={color} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface PointDatum {
  label: string
  value: number | null
  [k: string]: unknown
}

/** Courbe de tendance : ligne 2 px, voile à 10 %, info-bulle au survol. */
export function TrendChart({
  data,
  color,
  height = 200,
  format = (v) => String(v),
  tickFormat,
  reference,
  referenceLabel,
  domain,
  reversed,
  ariaLabel,
}: {
  data: PointDatum[]
  color: string
  height?: number
  format?: (v: number, row: Record<string, unknown>) => ReactNode
  tickFormat?: (v: number) => string
  reference?: number
  referenceLabel?: string
  domain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax']
  reversed?: boolean
  ariaLabel: string
}) {
  const gid = `g-${ariaLabel.replace(/\W/g, '')}`
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.14} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={tickFormat} domain={domain ?? ['auto', 'auto']} reversed={reversed} />
          <Tooltip cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} content={<ChartTooltip format={format} labelKey="tooltipLabel" />} />
          {reference != null && <ReferenceLine y={reference} stroke="var(--ink-3)" strokeWidth={1} label={{ value: referenceLabel, position: 'insideTopRight', fill: 'var(--ink-3)', fontSize: 10 }} />}
          <Area type="monotone" dataKey="value" stroke="none" fill={`url(#${gid})`} isAnimationActive={false} connectNulls />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 3, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Mini graphique sans axes pour les cartes */
export function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const rows = data.map((v, i) => ({ i, v }))
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Barre segmentée (un tout découpé en parties), avec légende. */
export function SegmentedBar({ parts, className }: { parts: { label: string; value: number; color: string; display: string; textColor?: string }[]; className?: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  if (!total) return null
  return (
    <div className={className}>
      <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label} ${p.display}`).join(', ')}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const pct = (p.value / total) * 100
            return (
              <div key={p.label} className="flex items-center rounded-[4px] px-2 text-xs font-semibold" style={{ width: `${pct}%`, background: p.color, color: p.textColor ?? '#fff' }} title={`${p.label} : ${p.display}`}>
                {pct >= 14 && <span className="truncate">{Math.round(pct)} %</span>}
              </div>
            )
          })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <span className="text-ink-3">· {p.display}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Calendrier d'activité (style "heatmap") des N dernières semaines */
export function ActivityGrid({ weeks, cells, className }: { weeks: number; cells: { date: string; level: number; title: string }[]; className?: string }) {
  const colors = ['var(--surface-3)', 'color-mix(in oklab, var(--run) 35%, var(--surface-3))', 'color-mix(in oklab, var(--run) 65%, var(--surface-3))', 'var(--run)']
  return (
    <div className={clsx('grid grid-flow-col gap-[3px]', className)} style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
      {cells.map((c) => (
        <div key={c.date} title={c.title} className="aspect-square rounded-[3px]" style={{ background: colors[c.level] }} />
      ))}
    </div>
  )
}

export interface StackSeries {
  key: string
  label: string
  color: string
}

/** Barres empilées (ex. nuit + sieste), légende au-dessus, info-bulle détaillée. */
export function StackedBarChart({
  data,
  series,
  height = 220,
  goal,
  goalLabel,
  tickFormat,
  format,
  ariaLabel,
}: {
  data: ({ label: string; tooltipLabel?: string } & Record<string, unknown>)[]
  series: StackSeries[]
  height?: number
  goal?: number
  goalLabel?: string
  tickFormat?: (v: number) => string
  format: (v: number) => string
  ariaLabel: string
}) {
  const Tip = ({ active, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload ?? {}
    const total = series.reduce((a, s) => a + (Number(row[s.key]) || 0), 0)
    return (
      <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg">
        <div className="text-ink-3">{String(row.tooltipLabel ?? row.label)}</div>
        {series.map((s) => (
          <div key={s.key} className="mt-0.5 flex items-center gap-1.5 text-ink-2">
            <span className="size-2 rounded-sm" style={{ background: s.color }} />
            {s.label} : <span className="font-semibold text-ink">{format(Number(row[s.key]) || 0)}</span>
          </div>
        ))}
        {series.length > 1 && <div className="mt-0.5 font-semibold text-ink">Total : {format(total)}</div>}
      </div>
    )
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ height }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={tickFormat} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--surface-3)', opacity: 0.6 }} content={<Tip />} />
            {goal ? <ReferenceLine y={goal} stroke="var(--ink-3)" strokeWidth={1} label={{ value: goalLabel ?? 'Objectif', position: 'insideTopRight', fill: 'var(--ink-3)', fontSize: 10 }} /> : null}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="a" maxBarSize={24} fill={s.color} stroke="var(--surface)" strokeWidth={series.length > 1 ? 1 : 0} radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Mini-histogramme sans axes (7 derniers jours dans une tuile) */
export function MiniBars({ values, color, max, labels }: { values: (number | null)[]; color: string; max?: number; labels?: string[] }) {
  const top = max ?? Math.max(1, ...values.map((v) => v ?? 0))
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-[3px]" style={{ height: v ? `${Math.max(10, (v / top) * 100)}%` : '3px', background: v ? color : 'var(--surface-3)' }} title={labels?.[i]} />
      ))}
    </div>
  )
}
