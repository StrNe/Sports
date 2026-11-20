import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Activity, BedDouble, Calculator, CalendarDays, CalendarPlus, CircleCheck, Dumbbell, Ellipsis, FileUp, Flag, Footprints, House, ListChecks, Moon, Plus, Settings, TriangleAlert, Trophy, Utensils, X } from 'lucide-react'
import { useStore, useUi, type FormKind } from '../store/useStore'
import { ACCENT_BG_SOFT, ACCENT_TEXT, type Accent } from './ui'
import { importActivityFiles } from '../lib/importers'
import { SyncIndicator } from './sync'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  accent?: Accent
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Au quotidien',
    items: [
      { to: '/', label: 'Accueil', icon: <House size={18} /> },
      { to: '/planning', label: 'Planning', icon: <CalendarDays size={18} /> },
    ],
  },
  {
    group: 'Entraînement',
    items: [
      { to: '/seances', label: 'Mes séances', icon: <ListChecks size={18} />, accent: 'brand' },
      { to: '/course', label: 'Course à pied', icon: <Footprints size={18} />, accent: 'run' },
      { to: '/renfo', label: 'Renforcement', icon: <Activity size={18} />, accent: 'renfo' },
      { to: '/muscu', label: 'Musculation', icon: <Dumbbell size={18} />, accent: 'muscu' },
    ],
  },
  {
    group: 'Objectifs',
    items: [
      { to: '/objectifs', label: 'Courses & records', icon: <Trophy size={18} />, accent: 'race' },
      { to: '/outils', label: 'Outils coureur', icon: <Calculator size={18} /> },
    ],
  },
  {
    group: 'Récupération',
    items: [
      { to: '/sommeil', label: 'Sommeil', icon: <Moon size={18} />, accent: 'sleep' },
      { to: '/repas', label: 'Repas', icon: <Utensils size={18} />, accent: 'food' },
    ],
  },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 512 512" className="size-8" aria-hidden="true">
        <rect width="512" height="512" rx="112" fill="#eb6834" />
        <path d="M150 346c40-6 70-28 92-62l30-48c18-28 44-44 80-48" fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="350" cy="150" r="30" fill="#fff" />
        <path d="M120 400h272" stroke="#fff" strokeOpacity=".55" strokeWidth="28" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-bold tracking-tight">Foulée</span>
    </div>
  )
}

export function Sidebar() {
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  const name = useStore((s) => s.profile.name)
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <div className="mt-3">
        <SyncIndicator />
      </div>
      <button
        type="button"
        onClick={() => setQuickAdd(true)}
        className="mx-1 mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition hover:brightness-110"
      >
        <Plus size={18} /> Ajouter
      </button>
      <nav className="scroll-thin mt-5 flex-1 space-y-5 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g.group}</p>
            {g.items.map((it) => (
              <SideLink key={it.to} item={it} />
            ))}
          </div>
        ))}
      </nav>
      <SideLink item={{ to: '/reglages', label: name ? `Profil · ${name}` : 'Profil & données', icon: <Settings size={18} /> }} />
    </aside>
  )
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        clsx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')
      }
    >
      {({ isActive }) => (
        <>
          <span className={clsx(isActive && item.accent ? ACCENT_TEXT[item.accent] : '')}>{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function MobileTopBar() {
  return (
    <div className="mobile-topbar sticky z-30 flex items-center justify-between border-b border-line bg-bg px-4 py-3 lg:hidden">
      <Logo />
      <div className="flex items-center gap-2">
        <SyncIndicator compact />
        <NavLink to="/reglages" aria-label="Profil et données" className="grid size-9 place-items-center rounded-full bg-surface-3 text-ink-2">
          <Settings size={18} />
        </NavLink>
      </div>
    </div>
  )
}

/** Vrai quand le clavier virtuel occupe l'écran (on masque alors la barre du bas) */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const el = document.activeElement
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      setOpen(typing && window.innerHeight - vv.height > 140)
    }
    vv.addEventListener('resize', update)
    window.addEventListener('focusout', update)
    return () => {
      vv.removeEventListener('resize', update)
      window.removeEventListener('focusout', update)
    }
  }, [])
  return open
}

function BottomItem({ to, end, label, icon, active }: { to: string; end?: boolean; label: string; icon: ReactNode; active?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => clsx('flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium', active ?? isActive ? 'text-ink' : 'text-ink-3')}>
      {({ isActive }) => (
        <>
          <span className={clsx('grid h-7 w-12 place-items-center rounded-full transition-colors', (active ?? isActive) && 'bg-surface-3')}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const { setQuickAdd, setMore } = useUi()
  const loc = useLocation()
  const keyboard = useKeyboardOpen()
  const trainingActive = ['/seances', '/course', '/renfo', '/muscu'].includes(loc.pathname)
  const moreActive = ['/planning', '/objectifs', '/sommeil', '/outils', '/reglages'].includes(loc.pathname)
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-[45] border-t border-line bg-surface lg:hidden" style={{ transform: keyboard ? 'translateY(110%)' : 'translateZ(0)' }} aria-label="Navigation principale">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
        <BottomItem to="/" end label="Accueil" icon={<House size={21} />} />
        <BottomItem to="/seances" label="Séances" icon={<ListChecks size={21} />} active={trainingActive} />
        <div className="flex justify-center">
          <button type="button" aria-label="Ajouter une séance, une nuit ou une course" onClick={() => setQuickAdd(true)} className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-brand/25 transition active:scale-95">
            <Plus size={24} />
          </button>
        </div>
        <BottomItem to="/repas" label="Repas" icon={<Utensils size={21} />} />
        <button type="button" onClick={() => setMore(true)} className={clsx('flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium', moreActive ? 'text-ink' : 'text-ink-3')}>
          <span className={clsx('grid h-7 w-12 place-items-center rounded-full', moreActive && 'bg-surface-3')}>
            <Ellipsis size={21} />
          </span>
          Plus
        </button>
      </div>
    </nav>
  )
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-pop safe-bottom relative w-full rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-3">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function useActivityImport() {
  const ref = useRef<HTMLInputElement>(null)
  const { mergeAll } = useStore()
  const notify = useUi((s) => s.notify)
  const input = (
    <input
      ref={ref}
      type="file"
      accept=".fit,.gpx,.tcx"
      multiple
      className="hidden"
      onChange={async (e) => {
        const files = e.target.files
        if (!files?.length) return
        const { runs, skipped } = await importActivityFiles(files)
        const { added } = mergeAll({ runs })
        if (added) notify(`${added} séance${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''} ✅`)
        else if (runs.length) notify('Ces séances étaient déjà enregistrées')
        if (skipped.length) setTimeout(() => notify(skipped[0] + (skipped.length > 1 ? ` (+${skipped.length - 1})` : ''), 'error'), runs.length ? 1500 : 0)
        e.target.value = ''
      }}
    />
  )
  return { input, open: () => ref.current?.click() }
}

const QUICK: { kind: FormKind; label: string; desc: string; icon: ReactNode; accent: Accent }[] = [
  { kind: 'run', label: 'Course', desc: 'Footing, fractionné…', icon: <Footprints size={20} />, accent: 'run' },
  { kind: 'food', label: 'Repas', desc: 'Ce que j’ai mangé', icon: <Utensils size={20} />, accent: 'food' },
  { kind: 'renfo', label: 'Renfo', desc: 'Gainage, PPG, mobilité', icon: <Activity size={20} />, accent: 'renfo' },
  { kind: 'muscu', label: 'Muscu', desc: 'Séries, charges', icon: <Dumbbell size={20} />, accent: 'muscu' },
  { kind: 'sleep', label: 'Sommeil', desc: 'Ma nuit, ma forme', icon: <BedDouble size={20} />, accent: 'sleep' },
  { kind: 'race', label: 'Course à venir', desc: 'Objectif, dossard', icon: <Flag size={20} />, accent: 'race' },
  { kind: 'planned', label: 'Séance prévue', desc: 'Planning', icon: <CalendarPlus size={20} />, accent: 'neutral' },
]

export function QuickAddSheet() {
  const { quickAddOpen, setQuickAdd, openForm } = useUi()
  const imp = useActivityImport()
  return (
    <>
      {imp.input}
      <Sheet open={quickAddOpen} onClose={() => setQuickAdd(false)} title="Que veux-tu enregistrer ?">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {QUICK.map((q) => (
            <button key={q.kind} type="button" onClick={() => openForm(q.kind)} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface-2 p-3.5 text-left transition hover:bg-surface-3">
              <span className={clsx('grid size-10 place-items-center rounded-xl', ACCENT_BG_SOFT[q.accent], ACCENT_TEXT[q.accent])}>{q.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{q.label}</span>
                <span className="block text-xs text-ink-3">{q.desc}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setQuickAdd(false)
              imp.open()
            }}
            className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-line p-3.5 text-left transition hover:bg-surface-2"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-surface-3 text-ink-2">
              <FileUp size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold">Fichier de montre</span>
              <span className="block text-xs text-ink-3">.fit, .gpx, .tcx</span>
            </span>
          </button>
        </div>
      </Sheet>
    </>
  )
}

export function MoreSheet() {
  const { moreOpen, setMore } = useUi()
  const navigate = useNavigate()
  const items: NavItem[] = [
    { to: '/planning', label: 'Planning', icon: <CalendarDays size={20} /> },
    { to: '/objectifs', label: 'Courses & records', icon: <Trophy size={20} />, accent: 'race' },
    { to: '/sommeil', label: 'Sommeil', icon: <Moon size={20} />, accent: 'sleep' },
    { to: '/outils', label: 'Outils coureur', icon: <Calculator size={20} /> },
    { to: '/renfo', label: 'Renforcement', icon: <Activity size={20} />, accent: 'renfo' },
    { to: '/muscu', label: 'Musculation', icon: <Dumbbell size={20} />, accent: 'muscu' },
    { to: '/reglages', label: 'Profil & données', icon: <Settings size={20} /> },
  ]
  return (
    <Sheet open={moreOpen} onClose={() => setMore(false)} title="Menu">
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <button
            key={it.to}
            type="button"
            onClick={() => {
              setMore(false)
              navigate(it.to)
            }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-left text-sm font-semibold transition hover:bg-surface-3"
          >
            <span className={clsx('grid size-9 place-items-center rounded-xl', ACCENT_BG_SOFT[it.accent ?? 'neutral'], ACCENT_TEXT[it.accent ?? 'neutral'])}>{it.icon}</span>
            {it.label}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export function Toast() {
  const toast = useUi((s) => s.toast)
  if (!toast) return null
  return (
    <div className="toast-pos pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div className="animate-pop flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-xl">
        {toast.tone === 'error' ? <TriangleAlert size={16} className="text-warn" /> : <CircleCheck size={16} className="text-good" />}
        {toast.text}
      </div>
    </div>
  )
}

/** Onglets partagés entre Course / Renfo / Muscu */
export function TrainingTabs() {
  const tabs = [
    { to: '/seances', label: 'Semaine', icon: <ListChecks size={15} />, accent: 'brand' as Accent },
    { to: '/course', label: 'Course', icon: <Footprints size={15} />, accent: 'run' as Accent },
    { to: '/renfo', label: 'Renfo', icon: <Activity size={15} />, accent: 'renfo' as Accent },
    { to: '/muscu', label: 'Muscu', icon: <Dumbbell size={15} />, accent: 'muscu' as Accent },
  ]
  return (
    <div className="mb-5 flex rounded-xl bg-surface-3 p-1 lg:hidden">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => clsx('flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[13px] font-medium transition sm:gap-1.5 sm:text-sm', isActive ? 'bg-surface shadow-sm' : 'text-ink-2')}>
          {({ isActive }) => (
            <>
              <span className={isActive ? ACCENT_TEXT[t.accent] : ''}>{t.icon}</span>
              {t.label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}
