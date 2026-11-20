import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlarmClock, Activity, BedDouble, CalendarDays, HeartPulse, Moon, Plus, RefreshCw, Star, Timer } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Badge, Button, Callout, Card, CardTitle, EmptyState, ListRow, PageHeader, Segmented, Stat } from '../components/ui'
import { MiniBars, SegmentedBar, StackedBarChart, TrendChart } from '../components/charts'
import { runCorosSync } from '../components/sync'
import { addDaysISO, avg, capitalize, fmtDate, fmtMinutes, hhmmToMinutes, minutesToHHMM, relativeDay, todayISO } from '../lib/format'
import { sleepByWeekday, sleepStats } from '../lib/insights'
import type { SleepEntry } from '../types'

const QUALITY = ['Très mauvaise', 'Mauvaise', 'Moyenne', 'Bonne', 'Excellente']

const SLEEP_TIPS = [
  { emoji: '🕙', title: 'Heures régulières', text: 'Couche-toi et lève-toi à heure fixe, même le week-end : ton horloge interne règle la qualité du sommeil profond.' },
  { emoji: '📵', title: 'Écrans coupés 1 h avant', text: 'La lumière bleue retarde la sécrétion de mélatonine. Lecture, étirements doux ou respiration à la place.' },
  { emoji: '☕', title: 'Caféine avant 14 h', text: 'Sa demi-vie est de 5 à 6 h : un café à 17 h agit encore au moment du coucher.' },
  { emoji: '🌡️', title: 'Chambre fraîche', text: 'Vise 17–19 °C, dans le noir complet et au calme.' },
  { emoji: '🏃', title: 'Séance intense le soir ?', text: 'Termine-la au moins 2–3 h avant le coucher et prends une douche tiède.' },
  { emoji: '😴', title: 'Sieste flash', text: '15 à 20 min en début d’après-midi aident à récupérer sans perturber la nuit. Évite après 16 h.' },
  { emoji: '🍽️', title: 'Dîner léger', text: 'Des glucides le soir (riz, pâtes) favorisent l’endormissement ; évite les repas lourds et l’alcool.' },
]

const HRV_LABEL = { normal: 'Normale', bas: 'Basse', haut: 'Haute' } as const

function nightLabel(date: string): string {
  return `Nuit du ${fmtDate(addDaysISO(date, -1), 'EEE d')} au ${fmtDate(date, 'EEE d MMM')}`
}

/** Détail d'une nuit : phases, score, VFC, FC de repos */
function LastNight({ s }: { s: SleepEntry }) {
  const openForm = useUi((x) => x.openForm)
  const asleep = s.durationMin
  const hasPhases = s.deepPct != null || s.remPct != null || s.lightPct != null
  const awakePct = hasPhases ? Math.max(0, 100 - (s.deepPct ?? 0) - (s.lightPct ?? 0) - (s.remPct ?? 0)) : 0
  const total = asleep + (s.awakeMin ?? 0)
  const part = (pct?: number) => (pct != null ? Math.round((pct / 100) * total) : 0)
  return (
    <Card className="h-full">
      <CardTitle
        icon={<Moon size={16} />}
        accent="sleep"
        title={capitalize(nightLabel(s.date))}
        subtitle={s.id.startsWith('coros-') ? 'Mesurée par ta montre COROS' : 'Saisie manuelle'}
        action={
          <Button size="sm" variant="ghost" onClick={() => openForm('sleep', s)}>
            Modifier
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-4xl font-bold tracking-tight">{fmtMinutes(asleep)}</p>
          <p className="text-sm text-ink-3">de sommeil{s.bedtime && s.wakeTime ? ` · ${s.bedtime} → ${s.wakeTime}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 pb-1">
          {s.score ? <Badge accent="sleep">Score {s.score}/100</Badge> : null}
          <Badge>Qualité : {QUALITY[s.quality - 1].toLowerCase()}</Badge>
          {s.napMin ? <Badge>+ {fmtMinutes(s.napMin)} de sieste</Badge> : null}
        </div>
      </div>

      {hasPhases && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Phases de sommeil</p>
          <SegmentedBar
            parts={[
              { label: 'Profond', value: s.deepPct ?? 0, color: 'var(--st-deep)', display: `${s.deepPct ?? 0} % · ${fmtMinutes(part(s.deepPct))}` },
              { label: 'Paradoxal', value: s.remPct ?? 0, color: 'var(--st-rem)', display: `${s.remPct ?? 0} % · ${fmtMinutes(part(s.remPct))}` },
              { label: 'Léger', value: s.lightPct ?? 0, color: 'var(--st-light)', display: `${s.lightPct ?? 0} % · ${fmtMinutes(part(s.lightPct))}`, textColor: '#0b0b0b' },
              { label: 'Éveillé', value: awakePct, color: 'var(--st-awake)', display: `${Math.round(awakePct)} % · ${fmtMinutes(s.awakeMin ?? part(awakePct))}`, textColor: 'var(--ink)' },
            ]}
          />
          <p className="mt-2 text-xs text-ink-3">Le sommeil profond répare les muscles, le paradoxal consolide les apprentissages. Repère : 13–23 % de profond, 20–25 % de paradoxal.</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">FC de repos</p>
          <p className="mt-0.5 font-semibold">{s.restingHr ? `${s.restingHr} bpm` : '—'}</p>
        </div>
        <div className={clsx('rounded-xl p-3', s.hrvStatus === 'bas' ? 'bg-warn/15' : 'bg-surface-2')}>
          <p className="text-xs text-ink-3">VFC nocturne</p>
          <p className="mt-0.5 font-semibold">{s.hrv ? `${s.hrv} ms` : '—'}</p>
          {s.hrvStatus && (
            <p className="text-xs text-ink-3">
              {HRV_LABEL[s.hrvStatus]}
              {s.hrvLow && s.hrvHigh ? ` (${s.hrvLow}–${s.hrvHigh})` : ''}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Réveils</p>
          <p className="mt-0.5 font-semibold">{s.awakeCount != null ? s.awakeCount : '—'}</p>
          {s.awakeMin ? <p className="text-xs text-ink-3">{fmtMinutes(s.awakeMin)} éveillé</p> : null}
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Total du jour</p>
          <p className="mt-0.5 font-semibold">{fmtMinutes(asleep + (s.napMin ?? 0))}</p>
          <p className="text-xs text-ink-3">nuit + siestes</p>
        </div>
      </div>
    </Card>
  )
}

export default function Sleep() {
  const { sleep, profile } = useStore()
  const openForm = useUi((s) => s.openForm)
  const coros = useUi((s) => s.coros)
  const today = todayISO()
  const [range, setRange] = useState<'14' | '30' | '90'>('30')
  const goal = profile.sleepGoalMin
  const s7 = sleepStats(sleep, goal, 7)
  const s30 = sleepStats(sleep, goal, 30)
  const last = sleep[0]
  const corosOn = coros.state !== 'unavailable'
  const syncing = coros.state === 'syncing'
  const missingLastNight = !last || last.date < today

  const n = Number(range)
  const nights = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const date = addDaysISO(today, -(n - 1 - i))
        const e = sleep.find((x) => x.date === date)
        return { label: fmtDate(date, 'd/MM'), tooltipLabel: capitalize(nightLabel(date)), nuit: e ? Math.round((e.durationMin / 60) * 100) / 100 : 0, sieste: e?.napMin ? Math.round((e.napMin / 60) * 100) / 100 : 0 }
      }),
    [sleep, n, today],
  )

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysISO(today, -(6 - i))
    const e = sleep.find((x) => x.date === date)
    return { date, total: e ? e.durationMin + (e.napMin ?? 0) : null }
  })

  const weekdays = useMemo(() => sleepByWeekday(sleep, 8), [sleep])
  const hasNaps = sleep.some((s) => s.napMin)

  const hrSeries = useMemo(
    () =>
      sleep
        .filter((x) => x.restingHr && x.date >= addDaysISO(today, -(n - 1)))
        .slice()
        .reverse()
        .map((x) => ({ label: fmtDate(x.date, 'd/MM'), value: x.restingHr!, tooltipLabel: fmtDate(x.date, 'EEEE d MMM') })),
    [sleep, n, today],
  )
  const hrAvg = avg(hrSeries.map((x) => x.value))
  const hrvSeries = useMemo(
    () =>
      sleep
        .filter((x) => x.hrv && x.date >= addDaysISO(today, -(n - 1)))
        .slice()
        .reverse()
        .map((x) => ({ label: fmtDate(x.date, 'd/MM'), value: x.hrv!, tooltipLabel: fmtDate(x.date, 'EEEE d MMM'), status: x.hrvStatus ? HRV_LABEL[x.hrvStatus] : '' })),
    [sleep, n, today],
  )
  const hrvBaseline = sleep.find((x) => x.hrvBaseline)?.hrvBaseline

  // Heure de coucher conseillée
  const wakes = s30.entries.map((e) => hhmmToMinutes(e.wakeTime)).filter((x): x is number => x != null)
  const avgWake = avg(wakes)
  const idealBed = avgWake != null ? minutesToHHMM(avgWake - goal - 15) : undefined

  return (
    <div>
      <PageHeader
        title="Sommeil & récupération"
        subtitle="Le sommeil est le moment où ton corps assimile l’entraînement"
        icon={<Moon size={22} />}
        accent="sleep"
        actions={
          <>
            {corosOn && (
              <Button disabled={syncing} icon={<RefreshCw size={16} className={clsx(syncing && 'animate-spin')} />} onClick={() => runCorosSync({ manual: true })}>
                {syncing ? 'Récupération…' : 'Récupérer de COROS'}
              </Button>
            )}
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('sleep')}>
              Ma nuit
            </Button>
          </>
        }
      />

      {missingLastNight && sleep.length > 0 && (
        <div className="mb-4">
          <Callout icon="⌚" title={`Pas encore de données pour la ${nightLabel(today).toLowerCase()}`}>
            {corosOn
              ? `Ta dernière nuit connue de COROS est celle du ${fmtDate(last.date, 'EEEE d MMMM')}. Si tu as dormi avec ta montre, ouvre l’app COROS pour qu’elle transmette ta nuit, puis appuie sur « Récupérer de COROS ». Sinon, tu peux la saisir à la main.`
              : 'Saisis ta nuit à la main avec le bouton « Ma nuit », ou importe une sauvegarde.'}
          </Callout>
        </div>
      )}

      {!sleep.length ? (
        <EmptyState
          icon={<BedDouble size={22} />}
          title="Aucune nuit enregistrée"
          text={corosOn ? 'Récupère tes nuits depuis COROS, ou saisis-les chaque matin : Foulée calcule ta forme du jour.' : 'Note chaque matin tes heures de coucher et de lever, ta qualité de sommeil et ta FC de repos : Foulée calcule ta forme du jour.'}
          action={
            <Button variant="primary" onClick={() => (corosOn ? runCorosSync({ manual: true }) : openForm('sleep'))}>
              {corosOn ? 'Récupérer de COROS' : 'Enregistrer ma nuit'}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LastNight s={last} />
            </div>
            <Card>
              <CardTitle icon={<CalendarDays size={16} />} accent="sleep" title="Sommeil moyen par jour" subtitle="7 derniers jours, siestes comprises" />
              <p className="text-4xl font-bold tracking-tight">{s7.avgDailyMin ? fmtMinutes(s7.avgDailyMin) : '—'}</p>
              <p className="mt-1 text-sm text-ink-2">
                {s7.avgMin ? `${fmtMinutes(s7.avgMin)} la nuit` : ''}
                {s7.avgNapMin && s7.avgNapMin >= 5 ? ` + ${fmtMinutes(s7.avgNapMin)} de sieste` : ''}
              </p>
              <div className="mt-4">
                <MiniBars values={last7.map((d) => d.total)} color="var(--sleep)" max={Math.max(goal, ...last7.map((d) => d.total ?? 0))} labels={last7.map((d) => `${fmtDate(d.date, 'EEE d')} : ${d.total ? fmtMinutes(d.total) : 'pas de données'}`)} />
                <div className="mt-1 flex gap-1 text-center text-[10px] text-ink-3">
                  {last7.map((d) => (
                    <span key={d.date} className="flex-1">
                      {fmtDate(d.date, 'EEEEE')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3 text-sm">
                <span className="text-ink-2">Sur 30 jours</span>
                <span className="font-semibold">{s30.avgDailyMin ? fmtMinutes(s30.avgDailyMin) : '—'} / jour</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-sm">
                <span className="text-ink-2">Objectif</span>
                <span className="font-semibold">{fmtMinutes(goal)}</span>
              </div>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Moyenne par nuit (30 j)" icon={<Moon size={15} />} accent="sleep" value={s30.avgMin ? fmtMinutes(s30.avgMin) : '—'} sub={`${s30.count} nuit(s) enregistrée(s)`} />
            <Stat label="Dette de sommeil (7 j)" icon={<Timer size={15} />} accent="sleep" value={fmtMinutes(s7.debt)} sub={s7.debt > 120 ? 'À rattraper : couche-toi plus tôt' : 'Sous contrôle 👍'} />
            <Stat label="Régularité du coucher" icon={<AlarmClock size={15} />} accent="sleep" value={s30.regularity != null ? `± ${Math.round(s30.regularity)} min` : '—'} sub={s30.avgBed != null ? `Coucher moyen ${minutesToHHMM(s30.avgBed)}` : undefined} />
            <Stat label="Score moyen (30 j)" icon={<Star size={15} />} accent="sleep" value={avg(s30.entries.map((e) => e.score ?? NaN).filter((x) => !isNaN(x)))?.toFixed(0) ?? '—'} unit="/100" sub={s30.quality ? `Qualité ressentie ${s30.quality.toFixed(1).replace('.', ',')}/5` : undefined} />
          </div>

          <Card className="mt-4">
            <CardTitle
              icon={<Moon size={16} />}
              accent="sleep"
              title="Sommeil par jour"
              subtitle={`En heures, objectif ${fmtMinutes(goal)}`}
              action={
                <Segmented
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: '14', label: '14 j' },
                    { value: '30', label: '30 j' },
                    { value: '90', label: '90 j' },
                  ]}
                />
              }
            />
            <StackedBarChart
              ariaLabel="Sommeil par jour, nuit et siestes"
              data={nights}
              series={hasNaps ? [{ key: 'nuit', label: 'Nuit', color: 'var(--sleep)' }, { key: 'sieste', label: 'Siestes', color: 'var(--food)' }] : [{ key: 'nuit', label: 'Nuit', color: 'var(--sleep)' }]}
              goal={goal / 60}
              tickFormat={(v) => `${v} h`}
              format={(v) => (v ? fmtMinutes(v * 60) : '—')}
            />
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle icon={<CalendarDays size={16} />} accent="sleep" title="Moyenne par jour de la semaine" subtitle="8 dernières semaines, selon le jour du réveil" />
              {weekdays.some((w) => w.count) ? (
                <>
                  <StackedBarChart
                    ariaLabel="Sommeil moyen par jour de la semaine"
                    height={190}
                    data={weekdays.map((w) => ({ label: w.label, tooltipLabel: `Le ${w.long} (${w.count} nuit${w.count > 1 ? 's' : ''})`, nuit: w.nightMin ? Math.round((w.nightMin / 60) * 100) / 100 : 0, sieste: w.napMin ? Math.round((w.napMin / 60) * 100) / 100 : 0 }))}
                    series={hasNaps ? [{ key: 'nuit', label: 'Nuit', color: 'var(--sleep)' }, { key: 'sieste', label: 'Siestes', color: 'var(--food)' }] : [{ key: 'nuit', label: 'Nuit', color: 'var(--sleep)' }]}
                    goal={goal / 60}
                    tickFormat={(v) => `${v} h`}
                    format={(v) => (v ? fmtMinutes(v * 60) : '—')}
                  />
                  {(() => {
                    const withData = weekdays.filter((w) => w.count && w.nightMin)
                    if (withData.length < 3) return null
                    const min = withData.reduce((a, b) => (b.nightMin! < a.nightMin! ? b : a))
                    const max = withData.reduce((a, b) => (b.nightMin! > a.nightMin! ? b : a))
                    return (
                      <p className="mt-2 text-sm text-ink-2">
                        Tu dors le moins la nuit précédant le <b>{min.long}</b> ({fmtMinutes(min.nightMin)}) et le plus avant le <b>{max.long}</b> ({fmtMinutes(max.nightMin)}).
                      </p>
                    )
                  })()}
                </>
              ) : (
                <p className="text-sm text-ink-2">Pas encore assez de nuits enregistrées.</p>
              )}
            </Card>
            <Card>
              <CardTitle icon={<AlarmClock size={16} />} accent="sleep" title="Ton heure de coucher idéale" />
              {idealBed ? (
                <div>
                  <p className="text-4xl font-bold tracking-tight">{idealBed}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    Pour dormir {fmtMinutes(goal)} avec un lever moyen à {minutesToHHMM(avgWake!)} (+15 min d’endormissement). Tu peux changer ton objectif de sommeil dans Courses & records → Mes objectifs.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-2">Renseigne tes heures de lever pour obtenir une heure de coucher conseillée.</p>
              )}
              <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
                <p className="font-medium text-ink">Avant une course</p>
                <p className="mt-0.5">La nuit qui compte le plus est l’avant-veille : le stress perturbe souvent la dernière nuit, et ce n’est pas grave.</p>
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle icon={<Activity size={16} />} accent="sleep" title="VFC nocturne" subtitle={hrvBaseline ? `Ta référence : ${hrvBaseline} ms — une VFC basse signale fatigue ou stress` : 'Variabilité de la fréquence cardiaque pendant le sommeil'} />
              {hrvSeries.length >= 3 ? (
                <TrendChart ariaLabel="VFC nocturne" data={hrvSeries} color="var(--sleep)" reference={hrvBaseline} referenceLabel="Référence" format={(v, row) => `${v} ms${row.status ? ` · ${String(row.status).toLowerCase()}` : ''}`} height={180} />
              ) : (
                <p className="text-sm text-ink-2">{corosOn ? 'La VFC arrive avec la synchronisation COROS (il faut au moins 3 nuits).' : 'Il faut au moins 3 mesures pour afficher la tendance.'}</p>
              )}
            </Card>
            <Card>
              <CardTitle icon={<HeartPulse size={16} />} accent="sleep" title="FC de repos" subtitle={hrAvg ? `Moyenne ${Math.round(hrAvg)} bpm — une hausse de 5+ bpm signale de la fatigue` : 'Renseigne-la chaque matin'} />
              {hrSeries.length >= 3 ? (
                <TrendChart ariaLabel="FC de repos" data={hrSeries} color="var(--sleep)" reference={hrAvg ? Math.round(hrAvg) : undefined} referenceLabel="Moyenne" format={(v) => `${v} bpm`} height={180} />
              ) : (
                <p className="text-sm text-ink-2">Il faut au moins 3 mesures pour afficher la tendance.</p>
              )}
            </Card>
          </div>

          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Mieux dormir pour mieux courir</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SLEEP_TIPS.map((t) => (
              <div key={t.title} className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-sm font-semibold">
                  <span className="mr-1.5">{t.emoji}</span>
                  {t.title}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-ink-2">{t.text}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Historique</h2>
          <Card className="!p-3 sm:!p-4">
            <div className="divide-y divide-line">
              {sleep.slice(0, 60).map((e) => (
                <ListRow
                  key={e.id}
                  onClick={() => openForm('sleep', e)}
                  icon={<BedDouble size={18} />}
                  accent="sleep"
                  title={relativeDay(e.date)}
                  meta={[e.bedtime && e.wakeTime && `${e.bedtime} → ${e.wakeTime}`, e.score && `score ${e.score}`, e.deepPct != null && `profond ${e.deepPct} %`, e.hrv && `VFC ${e.hrv} ms`, e.restingHr && `FC ${e.restingHr}`, e.napMin && `sieste ${fmtMinutes(e.napMin)}`].filter(Boolean).join(' · ')}
                  right={
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular">{fmtMinutes(e.durationMin)}</span>
                      <span className="inline-flex items-center gap-0.5 text-xs text-ink-3">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={10} className={i < e.quality ? 'fill-sleep text-sleep' : 'text-line'} />
                        ))}
                      </span>
                    </span>
                  }
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
