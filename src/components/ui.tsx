import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'

// ── Couleurs d'activité ─────────────────────────────────────
export type Accent = 'run' | 'renfo' | 'muscu' | 'sleep' | 'food' | 'race' | 'brand' | 'neutral'

export const ACCENT_TEXT: Record<Accent, string> = {
  run: 'text-run',
  renfo: 'text-renfo',
  muscu: 'text-muscu',
  sleep: 'text-sleep',
  food: 'text-food',
  race: 'text-race',
  brand: 'text-brand',
  neutral: 'text-ink-2',
}
export const ACCENT_BG_SOFT: Record<Accent, string> = {
  run: 'bg-run/12',
  renfo: 'bg-renfo/12',
  muscu: 'bg-muscu/12',
  sleep: 'bg-sleep/12',
  food: 'bg-food/15',
  race: 'bg-race/12',
  brand: 'bg-brand/12',
  neutral: 'bg-surface-3',
}
export const ACCENT_BG: Record<Accent, string> = {
  run: 'bg-run',
  renfo: 'bg-renfo',
  muscu: 'bg-muscu',
  sleep: 'bg-sleep',
  food: 'bg-food',
  race: 'bg-race',
  brand: 'bg-brand',
  neutral: 'bg-ink-3',
}

// ── Carte ───────────────────────────────────────────────────
export function Card({ children, className, as: As = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As className={clsx('rounded-2xl border border-line bg-surface p-4 sm:p-5', className)} {...rest}>
      {children}
    </As>
  )
}

export function CardTitle({ icon, title, subtitle, action, accent = 'neutral' }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; action?: ReactNode; accent?: Accent }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className={clsx('grid size-8 shrink-0 place-items-center rounded-lg', ACCENT_BG_SOFT[accent], ACCENT_TEXT[accent])}>{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ── Boutons ─────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
export function Button({ variant = 'secondary', size = 'md', className, children, icon, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; icon?: ReactNode }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-brand text-white hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-3 hover:text-ink',
        variant === 'danger' && 'bg-critical/10 text-critical hover:bg-critical/20',
        variant === 'soft' && 'bg-surface-3 text-ink hover:brightness-95 dark:hover:brightness-125',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx('grid size-9 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand', className)}
      {...rest}
    >
      {children}
    </button>
  )
}

// ── Formulaires ─────────────────────────────────────────────
export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx('field', props.className)} />
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx('field', props.className)} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx('field resize-y', props.className)} />
}

export function NumberInput({ value, onChange, step = 'any', ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value.replace(',', '.')
        onChange(v === '' ? undefined : Number(v))
      }}
      {...rest}
    />
  )
}

/** Note de 1 à N sous forme de pastilles */
export function Rating({ value, onChange, max = 5, labels, accent = 'brand' }: { value?: number; onChange: (v: number | undefined) => void; max?: number; labels?: string[]; accent?: Accent }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          title={labels?.[n - 1]}
          onClick={() => onChange(value === n ? undefined : n)}
          className={clsx(
            'h-9 min-w-9 rounded-lg border px-2 text-sm font-medium tabular transition-colors',
            value != null && n <= value ? clsx(ACCENT_BG[accent], 'border-transparent text-white') : 'border-line bg-surface-2 text-ink-2 hover:bg-surface-3',
          )}
        >
          {n}
        </button>
      ))}
      {labels && value && <span className="self-center pl-1 text-xs text-ink-3">{labels[value - 1]}</span>}
    </div>
  )
}

// ── Contrôle segmenté ───────────────────────────────────────
export function Segmented<T extends string>({ value, onChange, options, size = 'md', className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={clsx('inline-flex rounded-xl bg-surface-3 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 whitespace-nowrap rounded-lg font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Badges & pastilles ──────────────────────────────────────
export function Badge({ children, accent = 'neutral', className }: { children: ReactNode; accent?: Accent; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', ACCENT_BG_SOFT[accent], accent === 'neutral' ? 'text-ink-2' : 'text-ink', className)}>{children}</span>
}

export function Dot({ accent, className }: { accent: Accent; className?: string }) {
  return <span className={clsx('inline-block size-2 shrink-0 rounded-full', ACCENT_BG[accent], className)} />
}

// ── Indicateurs ─────────────────────────────────────────────
export function Stat({ label, value, unit, sub, accent, icon, className }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; accent?: Accent; icon?: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-line bg-surface p-4', className)}>
      <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
        {icon && <span className={clsx(accent ? ACCENT_TEXT[accent] : 'text-ink-3')}>{icon}</span>}
        <span className="leading-tight">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-3">{sub}</div>}
    </div>
  )
}

/** Jauge horizontale : le remplissage porte la couleur, la piste est une teinte claire du même ton */
export function Meter({ value, max, accent = 'brand', className, label }: { value: number; max: number; accent?: Accent; className?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full', ACCENT_BG_SOFT[accent], className)} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className={clsx('h-full rounded-full transition-[width] duration-500', ACCENT_BG[accent])} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ProgressRing({ value, size = 64, stroke = 6, color = 'var(--brand)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

// ── Mise en page ────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, accent, icon }: { title: string; subtitle?: ReactNode; actions?: ReactNode; accent?: Accent; icon?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className={clsx('hidden size-11 shrink-0 place-items-center rounded-2xl sm:grid', accent ? ACCENT_BG_SOFT[accent] : 'bg-surface-3', accent ? ACCENT_TEXT[accent] : 'text-ink')}>{icon}</span>}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">{children}</h2>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-surface-3 text-ink-2">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-2">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Fenêtre modale ──────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => panelRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} className={clsx('animate-pop relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Fermer" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

// ── Liste ───────────────────────────────────────────────────
export function ListRow({ icon, accent = 'neutral', title, meta, right, onClick }: { icon?: ReactNode; accent?: Accent; title: ReactNode; meta?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left', onClick && 'transition-colors hover:bg-surface-2')}
    >
      {icon && <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl', ACCENT_BG_SOFT[accent], ACCENT_TEXT[accent])}>{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {meta && <div className="mt-0.5 truncate text-xs text-ink-3">{meta}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </Comp>
  )
}

export function Callout({ tone = 'info', icon, title, children }: { tone?: 'info' | 'warning' | 'good'; icon?: ReactNode; title?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={clsx(
        'flex gap-3 rounded-xl border p-3 text-sm',
        tone === 'info' && 'border-line bg-surface-2',
        tone === 'warning' && 'border-warn/40 bg-warn/10',
        tone === 'good' && 'border-good/30 bg-good/10',
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-base leading-none">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-ink-2">{children}</div>
      </div>
    </div>
  )
}
