import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Flame, Plus, Scale, Utensils, TrendingDown, TrendingUp, Equal } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Callout, Card, CardTitle, IconButton, NumberInput, PageHeader, Segmented, Stat } from '../components/ui'
import { BalanceChart, IntakeChart, TrendChart } from '../components/charts'
import { CalorieSummary } from '../components/food'
import { addDaysISO, capitalize, fmtDate, fmtDateLong, fmtNum, todayISO } from '../lib/format'
import { CALORIE_GOALS, KCAL_PER_KG, balanceStats, dayIntake, energyHistory } from '../lib/energy'
import { MEAL_SLOTS, slotForNow } from '../lib/nutrition'

const fmtKcal = (n: number) => `${fmtNum(Math.round(n))} kcal`
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(Math.round(n)))}`

function Journal() {
  const { food } = useStore()
  const openForm = useUi((s) => s.openForm)
  const today = todayISO()
  const [date, setDate] = useState(today)
  const intake = dayIntake(food, date)

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <IconButton label="Jour précédent" onClick={() => setDate(addDaysISO(date, -1))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold">{date === today ? 'Aujourd’hui' : capitalize(fmtDateLong(date))}</p>
          {date !== today && (
            <button type="button" onClick={() => setDate(today)} className="text-xs font-medium text-brand hover:underline">
              Revenir à aujourd’hui
            </button>
          )}
        </div>
        <IconButton label="Jour suivant" onClick={() => setDate(addDaysISO(date, 1))} disabled={date >= today} className={clsx(date >= today && 'opacity-30')}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle icon={<Flame size={16} />} accent="food" title="Mes calories" subtitle={date === today ? 'Mangé aujourd’hui face à ton objectif' : 'Mangé ce jour-là face à l’objectif'} />
          <CalorieSummary date={date} />
        </Card>

        <div className="space-y-3 lg:col-span-3">
          <Button variant="primary" className="w-full !h-12" icon={<Plus size={18} />} onClick={() => openForm('food', { date, slot: date === today ? slotForNow() : 'dejeuner' })}>
            Noter ce que j’ai mangé
          </Button>
          {MEAL_SLOTS.map((s) => {
            const items = intake.items.filter((f) => f.slot === s.key)
            const total = items.reduce((a, f) => a + f.kcal, 0)
            return (
              <Card key={s.key} className="!p-3 sm:!p-4">
                <div className="flex items-center justify-between gap-2 px-1">
                  <p className="font-semibold">
                    <span className="mr-1.5">{s.emoji}</span>
                    {s.label}
                  </p>
                  <div className="flex items-center gap-2">
                    {items.length > 0 && <span className="text-sm font-semibold tabular">{fmtKcal(total)}</span>}
                    <Button size="sm" variant="soft" icon={<Plus size={14} />} onClick={() => openForm('food', { date, slot: s.key })}>
                      Ajouter
                    </Button>
                  </div>
                </div>
                {items.length > 0 ? (
                  <ul className="mt-2 divide-y divide-line">
                    {items.map((f) => (
                      <li key={f.id}>
                        <button type="button" onClick={() => openForm('foodEntry', f)} className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-surface-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{f.name}</p>
                            <p className="truncate text-xs text-ink-3">{[f.quantity, f.protein != null && `${f.protein} g de protéines`, f.source === 'ia' && 'estimé par Claude'].filter(Boolean).join(' · ')}</p>
                          </div>
                          <span className="shrink-0 text-sm tabular text-ink-2">{fmtKcal(f.kcal)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 px-1 text-xs text-ink-3">Rien de noté.</p>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}

function WeightCard() {
  const { weights, profile, upsert, setProfile } = useStore()
  const notify = useUi((s) => s.notify)
  const today = todayISO()
  const [kg, setKg] = useState<number | undefined>()
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const series = sorted.slice(-60).map((w) => ({ label: fmtDate(w.date, 'd/MM'), value: w.kg, tooltipLabel: fmtDate(w.date, 'EEEE d MMM') }))
  const first = sorted.find((w) => w.date >= addDaysISO(today, -29))
  const last = sorted[sorted.length - 1]
  return (
    <Card>
      <CardTitle icon={<Scale size={16} />} accent="food" title="Mon poids" subtitle="Pour vérifier si l’estimation se confirme sur la balance" />
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <NumberInput value={kg} onChange={setKg} placeholder={profile.weightKg ? String(profile.weightKg) : 'kg'} aria-label="Poids du jour en kg" />
        </div>
        <Button
          disabled={!kg || kg < 30 || kg > 250}
          onClick={() => {
            upsert('weights', { id: `w-${today}`, date: today, kg: kg! })
            setProfile({ weightKg: kg })
            setKg(undefined)
            notify('Pesée enregistrée')
          }}
        >
          Enregistrer ma pesée
        </Button>
      </div>
      {series.length >= 2 ? (
        <div className="mt-4">
          <TrendChart ariaLabel="Évolution du poids" data={series} color="var(--food)" format={(v) => `${fmtNum(v, 1)} kg`} tickFormat={(v) => fmtNum(v, 1)} height={170} />
          {first && last && first !== last && (
            <p className="mt-2 text-sm text-ink-2">
              Sur 30 jours : <b>{`${last.kg - first.kg > 0 ? '+' : ''}${fmtNum(last.kg - first.kg, 1)} kg`}</b> sur la balance.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-2">Pèse-toi une fois par semaine, le matin à jeun : la courbe apparaîtra dès la deuxième pesée.</p>
      )}
    </Card>
  )
}

function Tracking() {
  const data = useStore()
  const openForm = useUi((s) => s.openForm)
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const n = Number(range)
  const hist = useMemo(() => energyHistory(data, n), [data, n])
  const goal = data.profile.calorieGoal ?? 'maintien'
  const st = balanceStats(hist, goal)
  const chart = hist.map((d) => ({ label: fmtDate(d.date, 'd/MM'), tooltipLabel: capitalize(fmtDate(d.date, 'EEEE d MMMM')), intake: d.intake ?? null, expenditure: d.expenditure, balance: d.balance ?? null, complete: d.complete }))
  const logged = hist.filter((d) => d.intake != null && !d.isToday).length
  const ToneIcon = st.avgBalance == null ? Equal : st.avgBalance > 150 ? TrendingUp : st.avgBalance < -150 ? TrendingDown : Equal

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 jours' },
            { value: '30', label: '30 jours' },
            { value: '90', label: '90 jours' },
          ]}
        />
        <Button size="sm" variant="ghost" onClick={() => openForm('calories')}>
          Objectif : {CALORIE_GOALS[goal].label.toLowerCase()}
        </Button>
      </div>

      <Callout tone={st.verdict.tone === 'good' ? 'good' : st.verdict.tone === 'warning' ? 'warning' : 'info'} icon={<ToneIcon size={18} />} title={st.verdict.title}>
        {st.verdict.text}
      </Callout>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Mangé en moyenne" icon={<Utensils size={15} />} accent="food" value={st.avgIntake != null ? fmtNum(Math.round(st.avgIntake)) : '—'} unit="kcal / jour" sub={`${st.daysCounted} journée${st.daysCounted > 1 ? 's' : ''} complète${st.daysCounted > 1 ? 's' : ''}`} />
        <Stat label="Dépensé en moyenne" icon={<Flame size={15} />} accent="food" value={st.avgExpenditure != null ? fmtNum(Math.round(st.avgExpenditure)) : '—'} unit="kcal / jour" sub="métabolisme + activité + sport" />
        <Stat label="Écart moyen" icon={<ToneIcon size={15} />} accent="food" value={st.avgBalance != null ? signed(st.avgBalance) : '—'} unit="kcal / jour" sub={st.avgBalance == null ? undefined : st.avgBalance < 0 ? 'en dessous de tes besoins' : 'au-dessus de tes besoins'} />
        <Stat
          label="Effet estimé sur le poids"
          icon={<Scale size={15} />}
          accent="food"
          value={st.daysCounted ? `${st.kgTotal > 0 ? '+' : st.kgTotal < 0 ? '−' : ''}${fmtNum(Math.abs(st.kgTotal), 1)}` : '—'}
          unit="kg"
          sub={st.kgPerWeek != null ? `≈ ${st.kgPerWeek > 0 ? '+' : '−'}${fmtNum(Math.abs(st.kgPerWeek), 2)} kg / semaine` : `1 kg ≈ ${fmtNum(KCAL_PER_KG)} kcal`}
        />
      </div>

      <Card className="mt-4">
        <CardTitle icon={<Flame size={16} />} accent="food" title="Mangé et dépensé, jour par jour" subtitle={`${logged} jour${logged > 1 ? 's' : ''} renseigné${logged > 1 ? 's' : ''} sur ${n - 1} · barres pâles = journée incomplète (moins de 1 000 kcal notées)`} />
        <IntakeChart data={chart} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<ToneIcon size={16} />} accent="food" title="Au-dessus ou en dessous ?" subtitle="Écart entre ce que tu manges et ce que tu dépenses, journées complètes" />
          {st.daysCounted ? <BalanceChart data={chart} /> : <p className="text-sm text-ink-2">Note tes repas sur une journée entière pour voir ton écart.</p>}
        </Card>
        <WeightCard />
      </div>

      <details className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Comment sont calculés tes besoins ?</summary>
        <div className="mt-2 space-y-1.5 text-ink-2">
          <p>
            <b>Métabolisme de base</b> : l’énergie que ton corps brûle au repos, calculée avec ton poids, ta taille, ton âge et ton sexe (formule de Mifflin-St Jeor).
          </p>
          <p>
            <b>Activité</b> : les jours où ta montre COROS a été portée (plus de 3 000 pas), on utilise ses calories actives mesurées (marche et sport). Sinon, on estime ta vie quotidienne selon ton profil et on ajoute tes séances enregistrées.
          </p>
          <p>
            <b>Digestion</b> : environ 10 % de l’énergie part dans la digestion des aliments.
          </p>
          <p>Une journée compte dans les moyennes si tu y as noté au moins 1 000 kcal : un oubli de repas fausserait la tendance. Toutes ces valeurs sont des estimations à ±10 %, la balance reste le juge final.</p>
        </div>
      </details>
    </>
  )
}

export default function Meals() {
  const [view, setView] = useState<'journal' | 'suivi'>('journal')
  return (
    <div>
      <PageHeader
        title="Repas & calories"
        subtitle="Note ce que tu manges, compare à tes besoins"
        icon={<Utensils size={22} />}
        accent="food"
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'journal', label: 'Journal' },
              { value: 'suivi', label: 'Suivi' },
            ]}
          />
        }
      />
      {view === 'journal' ? <Journal /> : <Tracking />}
    </div>
  )
}

