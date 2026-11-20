import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Camera, Minus, Plus, Search, Sparkles, X } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import type { ActivityLevel, CalorieGoal, FoodEntry, MealSlot } from '../types'
import { Button, Callout, Field, IconButton, Input, Meter, NumberInput, ProgressRing, Segmented, Textarea } from './ui'
import { FormShell, Row } from './formShell'
import { fmtDate, fmtNum, todayISO, uid } from '../lib/format'
import { FOODS, portionValues, searchFoods, type FoodItem } from '../data/foods'
import { aiAvailable, aiErrorMessage, estimateFood } from '../lib/foodAi'
import type { SampleError } from '../lib/claude'
import { ACTIVITY_LEVELS, CALORIE_GOALS, dayEnergy, dayIntake } from '../lib/energy'
import { DAY_TYPES, MEAL_SLOTS, dailyTargets, detectDayType, slotForNow } from '../lib/nutrition'

const fmtKcal = (n: number) => `${fmtNum(Math.round(n))} kcal`

interface CartItem {
  key: string
  name: string
  quantity?: string
  kcal: number
  carbs?: number
  protein?: number
  fat?: number
  source: FoodEntry['source']
}

const QUICK_PICKS = ['Pâtes cuites', 'Riz blanc cuit', 'Baguette', 'Banane', 'Œuf', 'Poulet (blanc cuit)', 'Yaourt nature', 'Pomme', 'Lait demi-écrémé', 'Pizza']

// ── Ajout de ce qu'on a mangé ──────────────────────────────
export function FoodForm({ initial }: { initial?: { date?: string; slot?: MealSlot } }) {
  const { food, profile, upsertMany } = useStore()
  const { closeForm, notify } = useUi()
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [slot, setSlot] = useState<MealSlot>(initial?.slot ?? slotForNow())
  const [ai, setAi] = useState<{ text: boolean; images: boolean; mediaTypes: string[] } | null>(null)
  const [tab, setTab] = useState<'decrire' | 'chercher' | 'recents' | 'manuel'>('chercher')
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    let alive = true
    aiAvailable().then((a) => {
      if (!alive) return
      setAi(a)
      if (a.text) setTab('decrire')
    })
    return () => {
      alive = false
    }
  }, [])

  const add = (items: Omit<CartItem, 'key'>[]) => setCart((c) => [...c, ...items.map((it) => ({ ...it, key: uid() }))])
  const total = cart.reduce((a, c) => a + c.kcal, 0)

  const save = () => {
    const entries: FoodEntry[] = cart.map((c) => ({ id: uid(), date, slot, name: c.name, quantity: c.quantity, kcal: Math.round(c.kcal), carbs: c.carbs, protein: c.protein, fat: c.fat, source: c.source }))
    upsertMany('food', entries)
    notify(`${entries.length} aliment${entries.length > 1 ? 's' : ''} ajouté${entries.length > 1 ? 's' : ''} · ${fmtKcal(total)}`)
    closeForm()
  }

  const tabs = [
    ...(ai?.text ? [{ value: 'decrire' as const, label: 'Décrire' }] : []),
    { value: 'chercher' as const, label: 'Chercher' },
    { value: 'recents' as const, label: 'Récents' },
    { value: 'manuel' as const, label: 'À la main' },
  ]

  return (
    <FormShell title="Qu’as-tu mangé ?" onSave={save} canSave={cart.length > 0} saveLabel={cart.length ? `Ajouter (${fmtKcal(total)})` : 'Ajouter'} wide>
      <div className="flex flex-wrap items-end gap-3">
        <Segmented size="sm" value={slot} onChange={setSlot} options={MEAL_SLOTS.map((s) => ({ value: s.key, label: s.short }))} />
        <Input type="date" className="!w-auto !py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value || todayISO())} aria-label="Date du repas" />
      </div>

      <Segmented className="!flex w-full" value={tab} onChange={setTab} options={tabs} />

      {tab === 'decrire' && ai?.text && <DescribeTab slot={slot} weightKg={profile.weightKg} ai={ai} onAdd={add} onUnavailable={() => setAi({ text: false, images: false, mediaTypes: [] })} />}
      {tab === 'chercher' && <SearchTab onAdd={add} onManual={() => setTab('manuel')} />}
      {tab === 'recents' && <RecentTab food={food} slot={slot} beforeDate={date} onAdd={add} />}
      {tab === 'manuel' && <ManualTab onAdd={add} />}

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">À ajouter</p>
          <p className="text-sm font-semibold tabular">{fmtKcal(total)}</p>
        </div>
        {cart.length ? (
          <ul className="mt-2 divide-y divide-line">
            {cart.map((c) => (
              <li key={c.key} className="flex items-center gap-2 py-1.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-ink-3">
                    {[c.quantity, c.source === 'ia' && 'estimé par Claude', c.protein != null && `${c.protein} g prot.`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <NumberInput
                  className="!w-20 !bg-surface !py-1 text-right text-sm"
                  value={c.kcal}
                  onChange={(v) => setCart((all) => all.map((x) => (x.key === c.key ? { ...x, kcal: v ?? 0 } : x)))}
                  aria-label={`Calories de ${c.name}`}
                />
                <span className="text-xs text-ink-3">kcal</span>
                <IconButton label={`Retirer ${c.name}`} className="size-7" onClick={() => setCart((all) => all.filter((x) => x.key !== c.key))}>
                  <X size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-ink-3">Rien pour l’instant. Les aliments trouvés apparaissent ici : tu peux corriger les calories avant d’ajouter.</p>
        )}
      </div>
    </FormShell>
  )
}

function DescribeTab({ slot, weightKg, ai, onAdd, onUnavailable }: { slot: MealSlot; weightKg?: number; ai: { images: boolean; mediaTypes: string[] }; onAdd: (items: Omit<CartItem, 'key'>[]) => void; onUnavailable: () => void }) {
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState<File | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | undefined>()
  const ctl = useRef<AbortController | null>(null)

  const run = async () => {
    setError(null)
    setNote(undefined)
    setBusy(true)
    ctl.current = new AbortController()
    try {
      const r = await estimateFood(desc, { slot, weightKg, image: photo, signal: ctl.current.signal })
      if (!r.items.length) setError('Aucun aliment reconnu. Précise ce que tu as mangé et en quelle quantité.')
      else {
        onAdd(r.items.map((it) => ({ ...it, source: 'ia' })))
        setDesc('')
        setPhoto(undefined)
        setNote(r.note)
      }
    } catch (e) {
      const err = e as SampleError
      const msg = aiErrorMessage(err)
      if (msg) setError(msg)
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(err.code)) onUnavailable()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Décris ton repas, Claude estime les calories">
        <Textarea id="food-describe" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex. : une assiette de pâtes au thon avec du râpé, un yaourt aux fruits et une pomme" />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" icon={<Sparkles size={16} />} disabled={busy || (!desc.trim() && !photo)} onClick={run}>
          {busy ? 'Claude calcule…' : 'Estimer les calories'}
        </Button>
        {busy && (
          <Button variant="ghost" onClick={() => ctl.current?.abort()}>
            Arrêter
          </Button>
        )}
        {ai.images && !busy && (
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2">
            <Camera size={16} /> {photo ? 'Changer la photo' : 'Photo du repas'}
            <input id="food-photo" type="file" accept={ai.mediaTypes.join(',') || 'image/*'} className="hidden" onChange={(e) => setPhoto(e.target.files?.[0])} />
          </label>
        )}
      </div>
      {photo && (
        <p className="flex items-center gap-2 text-xs text-ink-2">
          📷 {photo.name}
          <button type="button" className="text-ink-3 underline" onClick={() => setPhoto(undefined)}>
            retirer
          </button>
        </p>
      )}
      {error && <Callout tone="warning">{error}</Callout>}
      {note && <p className="text-xs text-ink-3">💡 {note}</p>}
      <p className="text-xs text-ink-3">Estimation à ±15 % environ. Plus tu donnes de détails (quantités, sauce, boisson), plus elle est juste.</p>
    </div>
  )
}

function FoodPicker({ food, onAdd }: { food: FoodItem; onAdd: (items: Omit<CartItem, 'key'>[]) => void }) {
  const [portion, setPortion] = useState(0)
  const [qty, setQty] = useState(1)
  const p = food.portions[portion]
  const v = portionValues(food, p.g * qty)
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-surface p-3">
      <div className="flex flex-wrap gap-1.5">
        {food.portions.map((x, i) => (
          <button key={x.label} type="button" onClick={() => setPortion(i)} className={clsx('rounded-lg px-2.5 py-1 text-xs font-medium', i === portion ? 'bg-ink text-bg' : 'bg-surface-3 text-ink-2')}>
            {x.label} <span className="opacity-70">({x.g} g)</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton label="Moins" className="size-8 bg-surface-3" onClick={() => setQty((q) => Math.max(0.5, q - 0.5))}>
            <Minus size={14} />
          </IconButton>
          <span className="w-10 text-center text-sm font-semibold tabular">× {fmtNum(qty, 1)}</span>
          <IconButton label="Plus" className="size-8 bg-surface-3" onClick={() => setQty((q) => q + 0.5)}>
            <Plus size={14} />
          </IconButton>
        </div>
        <span className="text-sm text-ink-2">
          {fmtKcal(v.kcal)} · {v.carbs} g gluc. · {v.protein} g prot.
        </span>
        <Button size="sm" variant="primary" className="ml-auto" onClick={() => onAdd([{ name: food.name, quantity: `${qty !== 1 ? `${fmtNum(qty, 1)} × ` : ''}${p.label}`, ...v, source: 'base' }])}>
          Ajouter
        </Button>
      </div>
    </div>
  )
}

function SearchTab({ onAdd, onManual }: { onAdd: (items: Omit<CartItem, 'key'>[]) => void; onManual: () => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const results = useMemo(() => (q.trim() ? searchFoods(q) : FOODS.filter((f) => QUICK_PICKS.includes(f.name))), [q])
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input id="food-search" className="!pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pâtes, banane, kebab, pain au chocolat…" />
      </div>
      {!q.trim() && <p className="text-xs text-ink-3">Les plus courants :</p>}
      <ul className="max-h-72 space-y-1 overflow-y-auto scroll-thin">
        {results.map((f) => (
          <li key={f.id} className="rounded-xl bg-surface-2 px-3 py-2">
            <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpen(open === f.id ? null : f.id)}>
              <span className="text-lg">{f.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
              <span className="shrink-0 text-xs text-ink-3">{f.kcal} kcal / 100 g</span>
            </button>
            {open === f.id && <FoodPicker food={f} onAdd={(items) => (onAdd(items), setOpen(null))} />}
          </li>
        ))}
      </ul>
      {q.trim() && !results.length && (
        <p className="text-sm text-ink-2">
          Aucun aliment trouvé.{' '}
          <button type="button" className="font-medium text-brand underline" onClick={onManual}>
            Le saisir à la main
          </button>
        </p>
      )}
    </div>
  )
}

function RecentTab({ food, slot, beforeDate, onAdd }: { food: FoodEntry[]; slot: MealSlot; beforeDate: string; onAdd: (items: Omit<CartItem, 'key'>[]) => void }) {
  const lastMeal = useMemo(() => {
    const past = food.filter((f) => f.slot === slot && f.date < beforeDate)
    if (!past.length) return null
    const d = past.reduce((a, f) => (f.date > a ? f.date : a), past[0].date)
    return { date: d, items: past.filter((f) => f.date === d) }
  }, [food, slot, beforeDate])
  const recents = useMemo(() => {
    const seen = new Set<string>()
    const out: FoodEntry[] = []
    for (const f of [...food].sort((a, b) => b.date.localeCompare(a.date))) {
      const k = `${f.name}|${f.quantity ?? ''}`.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(f)
      if (out.length >= 30) break
    }
    return out
  }, [food])
  const toCart = (f: FoodEntry) => ({ name: f.name, quantity: f.quantity, kcal: f.kcal, carbs: f.carbs, protein: f.protein, fat: f.fat, source: f.source })
  if (!recents.length) return <p className="text-sm text-ink-2">Tes aliments déjà notés apparaîtront ici pour les ajouter en un geste.</p>
  return (
    <div className="space-y-3">
      {lastMeal && (
        <button type="button" onClick={() => onAdd(lastMeal.items.map(toCart))} className="w-full rounded-xl border border-dashed border-food/60 bg-food/10 p-3 text-left">
          <p className="text-sm font-semibold">Reprendre le même repas que {fmtDate(lastMeal.date, 'EEEE d')}</p>
          <p className="text-xs text-ink-2">
            {lastMeal.items.map((i) => i.name).join(', ')} · {fmtKcal(lastMeal.items.reduce((a, i) => a + i.kcal, 0))}
          </p>
        </button>
      )}
      <ul className="max-h-64 space-y-1 overflow-y-auto scroll-thin">
        {recents.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onAdd([toCart(f)])} className="flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left hover:bg-surface-3">
              <Plus size={14} className="shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {f.name}
                {f.quantity && <span className="text-ink-3"> · {f.quantity}</span>}
              </span>
              <span className="shrink-0 text-xs font-medium tabular">{fmtKcal(f.kcal)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ManualTab({ onAdd }: { onAdd: (items: Omit<CartItem, 'key'>[]) => void }) {
  const [d, setD] = useState<{ name: string; quantity?: string; kcal?: number; carbs?: number; protein?: number; fat?: number }>({ name: '' })
  const ok = d.name.trim() && d.kcal != null && d.kcal >= 0
  return (
    <div className="space-y-3">
      <Row>
        <Field label="Aliment ou plat">
          <Input id="food-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="ex. Menu du RU" />
        </Field>
        <Field label="Quantité (optionnel)">
          <Input id="food-qty" value={d.quantity ?? ''} onChange={(e) => setD({ ...d, quantity: e.target.value || undefined })} placeholder="ex. 1 plateau" />
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="Calories">
          <NumberInput value={d.kcal} onChange={(v) => setD({ ...d, kcal: v })} placeholder="kcal" />
        </Field>
        <Field label="Glucides">
          <NumberInput value={d.carbs} onChange={(v) => setD({ ...d, carbs: v })} placeholder="g" />
        </Field>
        <Field label="Protéines">
          <NumberInput value={d.protein} onChange={(v) => setD({ ...d, protein: v })} placeholder="g" />
        </Field>
      </Row>
      <Button
        disabled={!ok}
        icon={<Plus size={16} />}
        onClick={() => {
          onAdd([{ name: d.name.trim(), quantity: d.quantity, kcal: Math.round(d.kcal ?? 0), carbs: d.carbs, protein: d.protein, fat: d.fat, source: 'manuel' }])
          setD({ name: '' })
        }}
      >
        Ajouter à la liste
      </Button>
    </div>
  )
}

// ── Modifier un aliment déjà noté ───────────────────────────
export function FoodEntryForm({ initial }: { initial: FoodEntry }) {
  const { upsert, remove } = useStore()
  const { closeForm } = useUi()
  const [d, setD] = useState<FoodEntry>(initial)
  return (
    <FormShell
      title="Modifier l’aliment"
      onSave={() => {
        upsert('food', { ...d, name: d.name.trim() || 'Aliment', kcal: Math.round(d.kcal) })
        closeForm()
      }}
      onDelete={() => remove('food', d.id)}
      canSave={d.kcal >= 0}
    >
      <Row>
        <Field label="Aliment">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field label="Quantité">
          <Input value={d.quantity ?? ''} onChange={(e) => setD({ ...d, quantity: e.target.value || undefined })} />
        </Field>
      </Row>
      <Row>
        <Field label="Repas">
          <Segmented size="sm" className="!flex w-full" value={d.slot} onChange={(slot) => setD({ ...d, slot })} options={MEAL_SLOTS.map((s) => ({ value: s.key, label: s.short }))} />
        </Field>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value || d.date })} />
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="Calories">
          <NumberInput value={d.kcal} onChange={(v) => setD({ ...d, kcal: v ?? 0 })} />
        </Field>
        <Field label="Glucides (g)">
          <NumberInput value={d.carbs} onChange={(v) => setD({ ...d, carbs: v })} />
        </Field>
        <Field label="Protéines (g)">
          <NumberInput value={d.protein} onChange={(v) => setD({ ...d, protein: v })} />
        </Field>
      </Row>
    </FormShell>
  )
}

// ── Réglages des besoins ───────────────────────────────────
export function CaloriesForm() {
  const data = useStore()
  const { closeForm, notify } = useUi()
  const p = data.profile
  const [goal, setGoal] = useState<CalorieGoal>(p.calorieGoal ?? 'maintien')
  const [level, setLevel] = useState<ActivityLevel>(p.activityLevel ?? 'sedentaire')
  const [weight, setWeight] = useState<number | undefined>(p.weightKg)
  const [manual, setManual] = useState<number | undefined>(p.kcalTarget)
  const preview = dayEnergy({ ...data, profile: { ...p, calorieGoal: goal, activityLevel: level, weightKg: weight, kcalTarget: manual } }, todayISO())
  return (
    <FormShell
      title="Mes besoins en calories"
      onSave={() => {
        data.setProfile({ calorieGoal: goal, activityLevel: level, weightKg: weight, kcalTarget: manual })
        notify('Besoins mis à jour')
        closeForm()
      }}
    >
      <Field label="Mon objectif">
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(CALORIE_GOALS) as CalorieGoal[]).map((g) => (
            <button key={g} type="button" onClick={() => setGoal(g)} className={clsx('rounded-xl border p-3 text-left text-sm', goal === g ? 'border-brand bg-brand/10' : 'border-line bg-surface-2')}>
              <span className="block font-semibold">{CALORIE_GOALS[g].label}</span>
              <span className="block text-xs text-ink-3">{CALORIE_GOALS[g].hint}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Ma journée, en dehors du sport">
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((l) => (
            <button key={l} type="button" onClick={() => setLevel(l)} className={clsx('rounded-xl border p-3 text-left text-sm', level === l ? 'border-brand bg-brand/10' : 'border-line bg-surface-2')}>
              <span className="block font-semibold">{ACTIVITY_LEVELS[l].label}</span>
              <span className="block text-xs text-ink-3">{ACTIVITY_LEVELS[l].hint}</span>
            </button>
          ))}
        </div>
      </Field>
      <Row>
        <Field label="Poids (kg)">
          <NumberInput value={weight} onChange={setWeight} />
        </Field>
        <Field label="Objectif fixé à la main" hint="Laisse vide pour le calcul automatique">
          <NumberInput value={manual} onChange={setManual} placeholder="kcal / jour" />
        </Field>
      </Row>
      <Callout icon="🧮" title={`Objectif aujourd’hui : ${fmtKcal(preview.target)}`}>
        {manual ? 'Objectif fixé à la main.' : `Dépense estimée ${fmtKcal(preview.expenditure)}${preview.goalDelta ? ` ${preview.goalDelta > 0 ? '+' : '−'} ${Math.abs(preview.goalDelta)} kcal pour ton objectif` : ''}. Le sport du jour et les pas mesurés par ta montre sont ajoutés automatiquement.`}
      </Callout>
    </FormShell>
  )
}

// ── Résumé calorique d'une journée ──────────────────────────
export function CalorieSummary({ date, compact }: { date: string; compact?: boolean }) {
  const data = useStore()
  const openForm = useUi((s) => s.openForm)
  const e = dayEnergy(data, date)
  const intake = dayIntake(data.food, date)
  const pct = e.target ? (intake.kcal / e.target) * 100 : 0
  const left = e.target - intake.kcal
  const over = left < 0
  const dt = detectDayType(date, data)
  const macros = dailyTargets(data.profile, dt.type)
  const ringColor = over ? (pct > 110 ? 'var(--race)' : 'var(--warn)') : 'var(--food)'

  return (
    <div>
      <div className="flex items-center gap-4">
        <ProgressRing value={Math.min(pct, 100)} size={compact ? 88 : 112} stroke={compact ? 8 : 10} color={ringColor}>
          <div className="text-center leading-tight">
            <p className={clsx('font-bold tracking-tight', compact ? 'text-lg' : 'text-2xl')}>{fmtNum(intake.kcal)}</p>
            <p className="text-[10px] text-ink-3">kcal mangées</p>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className={clsx('font-semibold', compact ? 'text-base' : 'text-lg')}>
            {intake.count === 0 ? 'Rien de noté pour l’instant' : over ? `${fmtKcal(-left)} au-dessus` : `Il reste ${fmtKcal(left)}`}
          </p>
          <p className="text-sm text-ink-2">
            Objectif {fmtKcal(e.target)}
            {e.manualTarget ? ' (fixé à la main)' : ''}
          </p>
          {!compact && (
            <button type="button" onClick={() => openForm('calories')} className="mt-1 text-xs font-medium text-brand hover:underline">
              Modifier mes besoins
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Glucides', v: intake.carbs, target: macros.carbs[0], hint: `${macros.carbs[0]}–${macros.carbs[1]} g` },
              { label: 'Protéines', v: intake.protein, target: macros.protein, hint: `${macros.protein} g` },
              { label: 'Lipides', v: intake.fat, target: macros.fat, hint: `≈ ${macros.fat} g` },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-2">{m.label}</span>
                  <span className="font-semibold tabular">{m.v} g</span>
                </div>
                <Meter className="mt-1" value={m.v} max={m.target} accent="food" label={m.label} />
                <p className="mt-0.5 text-[11px] text-ink-3">repère {m.hint}</p>
              </div>
            ))}
          </div>
          <details className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
            <summary className="cursor-pointer font-medium">D’où vient l’objectif de {fmtKcal(e.target)} ?</summary>
            <ul className="mt-2 space-y-1 text-ink-2">
              <li className="flex justify-between gap-3">
                <span>Métabolisme de base</span>
                <span className="tabular">{fmtKcal(e.bmr)}</span>
              </li>
              {e.source === 'montre' ? (
                <li className="flex justify-between gap-3">
                  <span>Activité mesurée par ta montre ({fmtNum(e.steps)} pas, sport compris)</span>
                  <span className="tabular">{fmtKcal(Math.max(e.measuredActive ?? 0, e.sport))}</span>
                </li>
              ) : (
                <>
                  <li className="flex justify-between gap-3">
                    <span>Vie quotidienne ({ACTIVITY_LEVELS[data.profile.activityLevel ?? 'sedentaire'].label.toLowerCase()})</span>
                    <span className="tabular">{fmtKcal(e.daily)}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Sport enregistré</span>
                    <span className="tabular">{fmtKcal(e.sport)}</span>
                  </li>
                  {e.planned > 0 && (
                    <li className="flex justify-between gap-3">
                      <span>Séance prévue pas encore faite</span>
                      <span className="tabular">{fmtKcal(e.planned)}</span>
                    </li>
                  )}
                </>
              )}
              <li className="flex justify-between gap-3">
                <span>Digestion (≈ 10 %)</span>
                <span className="tabular">{fmtKcal(e.tef)}</span>
              </li>
              {e.goalDelta !== 0 && !e.manualTarget && (
                <li className="flex justify-between gap-3">
                  <span>{CALORIE_GOALS[data.profile.calorieGoal ?? 'maintien'].label}</span>
                  <span className="tabular">
                    {e.goalDelta > 0 ? '+' : '−'}
                    {fmtKcal(Math.abs(e.goalDelta))}
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-ink-3">
              {DAY_TYPES[dt.type].emoji} {DAY_TYPES[dt.type].label} : {DAY_TYPES[dt.type].summary}
            </p>
          </details>
        </>
      )}
    </div>
  )
}
