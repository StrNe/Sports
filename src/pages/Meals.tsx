import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Clock, Droplets, Flame, Heart, RotateCcw, ShoppingCart, Shuffle, Utensils, Wheat, Beef } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Button, Callout, Card, IconButton, PageHeader, Segmented, Select } from '../components/ui'
import { addDaysISO, capitalize, fmtDate, fmtDateLong, fmtNum, todayISO, weekStartISO } from '../lib/format'
import { DAY_TYPES, DIET_LABEL, dailyTargets, detectDayType, mealFor, nextMeal, shoppingList } from '../lib/nutrition'
import { MEAL_SLOTS, type Meal } from '../data/meals'
import type { DayType, MealSlot } from '../types'

const DAY_TYPE_ORDER: DayType[] = ['repos', 'facile', 'intense', 'long', 'veille_course', 'jour_course']

function MealCard({ date, slot, label, time, meal, dayType, overridden }: { date: string; slot: MealSlot; label: string; time: string; meal?: Meal; dayType: DayType; overridden: boolean }) {
  const { profile, favoriteMeals, setMealPick, toggleFavoriteMeal } = useStore()
  if (!meal) return null
  const fav = favoriteMeals.includes(meal.id)
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          {label} <span className="font-normal normal-case tracking-normal">· {time}</span>
        </p>
        <div className="flex items-center">
          {overridden && (
            <IconButton label="Revenir à la suggestion automatique" onClick={() => setMealPick(date, slot, undefined)}>
              <RotateCcw size={15} />
            </IconButton>
          )}
          <IconButton label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => toggleFavoriteMeal(meal.id)}>
            <Heart size={16} className={clsx(fav && 'fill-race text-race')} />
          </IconButton>
          <IconButton label="Proposer une autre idée" onClick={() => setMealPick(date, slot, nextMeal(meal, slot, dayType, profile)?.id)}>
            <Shuffle size={16} />
          </IconButton>
        </div>
      </div>
      <div className="mt-2 flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-food/15 text-2xl">{meal.emoji}</span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{meal.name}</h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3 tabular">
            <span>{meal.kcal} kcal</span>
            <span>G {meal.carbs} g</span>
            <span>P {meal.protein} g</span>
            <span>L {meal.fat} g</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock size={11} /> {meal.prepMin} min
            </span>
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink-2">
        {meal.ingredients.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-3" />
            {i}
          </li>
        ))}
      </ul>
      {meal.why && <p className="mt-3 rounded-lg bg-food/10 px-2.5 py-1.5 text-xs text-ink-2">💡 {meal.why}</p>}
    </Card>
  )
}

function useChecked(key: string) {
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]')
    } catch {
      return []
    }
  })
  const toggle = (item: string) =>
    setChecked((c) => {
      const next = c.includes(item) ? c.filter((x) => x !== item) : [...c, item]
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* stockage indisponible */
      }
      return next
    })
  return { checked, toggle }
}

export default function Meals() {
  const data = useStore()
  const { profile, mealPicks, setDayTypeOverride } = data
  const today = todayISO()
  const [date, setDate] = useState(today)
  const [view, setView] = useState<'jour' | 'semaine' | 'courses'>('jour')

  const dt = detectDayType(date, data)
  const meta = DAY_TYPES[dt.type]
  const targets = dailyTargets(profile, dt.type)
  const meals = MEAL_SLOTS.map((s) => ({ ...s, meal: mealFor(date, s.key, dt.type, data) }))
  const total = meals.reduce((a, m) => ({ kcal: a.kcal + (m.meal?.kcal ?? 0), carbs: a.carbs + (m.meal?.carbs ?? 0), protein: a.protein + (m.meal?.protein ?? 0) }), { kcal: 0, carbs: 0, protein: 0 })

  const ws = weekStartISO(date)
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDaysISO(ws, i)
        const t = detectDayType(d, data).type
        return { date: d, type: t, meals: MEAL_SLOTS.map((s) => ({ slot: s, meal: mealFor(d, s.key, t, data) })) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ws, data.runs, data.planned, data.races, data.renfo, data.muscu, data.mealPicks, data.dayTypeOverrides, data.profile, data.favoriteMeals],
  )
  const list = shoppingList(week.flatMap((d) => d.meals.map((m) => m.meal).filter((m): m is Meal => !!m)))
  const { checked, toggle } = useChecked(`foulee-courses-${ws}`)

  const carbGap = targets.carbs[0] - total.carbs

  return (
    <div>
      <PageHeader
        title="Repas"
        subtitle={
          <>
            Idées adaptées à ton entraînement · {DIET_LABEL[profile.diet]}
            {profile.noGluten ? ', sans gluten' : ''}
            {profile.noLactose ? ', sans lactose' : ''} ·{' '}
            <Link to="/reglages" className="underline decoration-line underline-offset-2 hover:text-ink">
              préférences
            </Link>
          </>
        }
        icon={<Utensils size={22} />}
        accent="food"
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'jour', label: 'Jour' },
              { value: 'semaine', label: 'Semaine' },
              { value: 'courses', label: 'Courses' },
            ]}
          />
        }
      />

      {/* Navigation de date */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <IconButton label={view === 'jour' ? 'Jour précédent' : 'Semaine précédente'} onClick={() => setDate(addDaysISO(date, view === 'jour' ? -1 : -7))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold">{view === 'jour' ? capitalize(fmtDateLong(date)) : `Semaine du ${fmtDate(ws, 'd MMMM')}`}</p>
          {date !== today && (
            <button type="button" onClick={() => setDate(today)} className="text-xs font-medium text-brand hover:underline">
              Revenir à aujourd’hui
            </button>
          )}
        </div>
        <IconButton label={view === 'jour' ? 'Jour suivant' : 'Semaine suivante'} onClick={() => setDate(addDaysISO(date, view === 'jour' ? 1 : 7))}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      {view === 'jour' && (
        <>
          <Card className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-food/15 text-2xl">{meta.emoji}</span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight">{meta.label}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{meta.summary}</p>
                  <p className="mt-1 text-xs text-ink-3">{dt.auto ? `Détecté automatiquement : ${dt.reason}` : 'Choisi manuellement'}</p>
                </div>
              </div>
              <Select className="!w-auto !py-1.5 text-sm" value={dt.auto ? '' : dt.type} onChange={(e) => setDayTypeOverride(date, (e.target.value || undefined) as DayType | undefined)} aria-label="Type de journée">
                <option value="">Automatique</option>
                {DAY_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {DAY_TYPES[t].emoji} {DAY_TYPES[t].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: <Flame size={14} />, label: 'Énergie', value: `≈ ${fmtNum(targets.kcal)}`, unit: 'kcal' },
                { icon: <Wheat size={14} />, label: 'Glucides', value: `${targets.carbs[0]}–${targets.carbs[1]}`, unit: 'g' },
                { icon: <Beef size={14} />, label: 'Protéines', value: `${targets.protein}`, unit: 'g' },
                { icon: <Droplets size={14} />, label: 'Eau', value: fmtNum(targets.waterL, 1), unit: 'L' },
              ].map((t) => (
                <div key={t.label} className="rounded-xl bg-surface-2 p-3">
                  <p className="flex items-center gap-1 text-xs text-ink-3">
                    <span className="text-food">{t.icon}</span> {t.label}
                  </p>
                  <p className="mt-0.5 font-semibold tabular">
                    {t.value} <span className="text-xs font-normal text-ink-3">{t.unit}</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">
              Repères calculés pour {targets.weightUsed} kg{targets.estimated ? ' (poids par défaut — renseigne le tien dans le profil)' : ''}. Ce sont des ordres de grandeur, pas une prescription médicale.
            </p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {meals.map((m) => (
              <MealCard key={m.key} date={date} slot={m.key} label={m.label} time={m.time} meal={m.meal} dayType={dt.type} overridden={!!mealPicks[date]?.[m.key]} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Callout icon="📊" title={`Total des idées : ${fmtNum(total.kcal)} kcal · ${total.carbs} g de glucides · ${total.protein} g de protéines`}>
              {carbGap > 40
                ? `Il manque environ ${Math.round(carbGap)} g de glucides pour atteindre ton repère du jour : ajoute une portion de féculents, du pain ou un fruit à un repas.`
                : 'Ces 4 repas couvrent bien tes besoins en glucides du jour. Ajuste les portions à ta faim.'}
            </Callout>
            <Callout icon={meta.emoji} title="Conseils du jour">
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {meta.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Callout>
          </div>
        </>
      )}

      {view === 'semaine' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {week.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => {
                setDate(d.date)
                setView('jour')
              }}
              className={clsx('rounded-2xl border bg-surface p-4 text-left transition hover:bg-surface-2', d.date === today ? 'border-brand/50' : 'border-line')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{capitalize(fmtDate(d.date, 'EEEE d'))}</p>
                <Badge accent="food">
                  {DAY_TYPES[d.type].emoji} {DAY_TYPES[d.type].label}
                </Badge>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {d.meals.map(({ slot, meal }) => (
                  <li key={slot.key} className="flex items-center gap-2">
                    <span className="w-5 text-center">{meal?.emoji}</span>
                    <span className="truncate text-ink-2">{meal?.name}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}

      {view === 'courses' && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-food" />
              <h3 className="font-semibold">Liste de courses de la semaine</h3>
            </div>
            <span className="text-xs text-ink-3">
              {checked.filter((c) => list.some((l) => l.item === c)).length} / {list.length} cochés
            </span>
          </div>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {list.map(({ item, count }) => {
              const done = checked.includes(item)
              return (
                <li key={item}>
                  <label className="flex cursor-pointer items-start gap-3 border-b border-line py-2 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--food)]" checked={done} onChange={() => toggle(item)} />
                    <span className={clsx('flex-1', done && 'text-ink-3 line-through')}>{item}</span>
                    {count > 1 && <span className="text-xs text-ink-3">×{count}</span>}
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-ink-3">Liste générée à partir des 28 repas proposés cette semaine. Change un repas dans la vue « Jour » et la liste se met à jour.</p>
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => setView('semaine')}>
              Voir le menu de la semaine
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
