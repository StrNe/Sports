import { useMemo, useState } from 'react'
import { AlarmClock, BedDouble, HeartPulse, Moon, Plus, Star, Timer } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Card, CardTitle, EmptyState, ListRow, PageHeader, Segmented, Stat } from '../components/ui'
import { SimpleBarChart, TrendChart } from '../components/charts'
import { addDaysISO, avg, fmtDate, fmtMinutes, hhmmToMinutes, minutesToHHMM, relativeDay, todayISO } from '../lib/format'
import { sleepStats } from '../lib/insights'

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

export default function Sleep() {
  const { sleep, profile } = useStore()
  const openForm = useUi((s) => s.openForm)
  const today = todayISO()
  const [range, setRange] = useState<'14' | '30' | '90'>('30')
  const goal = profile.sleepGoalMin
  const s7 = sleepStats(sleep, goal, 7)
  const s30 = sleepStats(sleep, goal, 30)
  const last = sleep[0]

  const n = Number(range)
  const nights = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const date = addDaysISO(today, -(n - 1 - i))
        const e = sleep.find((x) => x.date === date)
        return {
          label: fmtDate(date, 'd/MM'),
          value: e ? Math.round((e.durationMin / 60) * 10) / 10 : 0,
          tooltipLabel: fmtDate(date, 'EEEE d MMM'),
          detail: e ? `${e.bedtime ?? '?'} → ${e.wakeTime ?? '?'} · qualité ${e.quality}/5` : 'Non renseignée',
        }
      }),
    [sleep, n, today],
  )

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
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('sleep')}>
            Ma nuit
          </Button>
        }
      />

      {!sleep.length ? (
        <EmptyState
          icon={<BedDouble size={22} />}
          title="Aucune nuit enregistrée"
          text="Note chaque matin tes heures de coucher et de lever, ta qualité de sommeil et ta FC de repos : Foulée calcule ta forme du jour."
          action={
            <Button variant="primary" onClick={() => openForm('sleep')}>
              Enregistrer ma nuit
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label={last ? `Dernière nuit · ${relativeDay(last.date).toLowerCase()}` : 'Dernière nuit'}
              icon={<BedDouble size={15} />}
              accent="sleep"
              value={last ? fmtMinutes(last.durationMin) : '—'}
              sub={last ? `Qualité : ${QUALITY[last.quality - 1].toLowerCase()}${last.score ? ` · score ${last.score}` : ''}` : undefined}
            />
            <Stat label="Moyenne 7 jours" icon={<Moon size={15} />} accent="sleep" value={s7.avgMin ? fmtMinutes(s7.avgMin) : '—'} sub={`Objectif ${fmtMinutes(goal)} · ${s7.count} nuit(s)`} />
            <Stat label="Dette de sommeil (7 j)" icon={<Timer size={15} />} accent="sleep" value={fmtMinutes(s7.debt)} sub={s7.debt > 120 ? 'À rattraper : couche-toi plus tôt' : 'Sous contrôle 👍'} />
            <Stat
              label="Régularité du coucher"
              icon={<AlarmClock size={15} />}
              accent="sleep"
              value={s30.regularity != null ? `± ${Math.round(s30.regularity)} min` : '—'}
              sub={s30.avgBed != null ? `Coucher moyen ${minutesToHHMM(s30.avgBed)}` : undefined}
            />
          </div>

          <Card className="mt-4">
            <CardTitle
              icon={<Moon size={16} />}
              accent="sleep"
              title="Durée de sommeil"
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
            <SimpleBarChart
              ariaLabel="Durée de sommeil par nuit"
              data={nights}
              color="var(--sleep)"
              goal={goal / 60}
              height={220}
              format={(v, row) => (
                <>
                  {v ? fmtMinutes(v * 60) : '—'} <span className="font-normal text-ink-3">· {String(row.detail)}</span>
                </>
              )}
              tickFormat={(v) => `${v} h`}
            />
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle icon={<HeartPulse size={16} />} accent="sleep" title="FC de repos" subtitle={hrAvg ? `Moyenne ${Math.round(hrAvg)} bpm — une hausse de 5+ bpm signale de la fatigue` : 'Renseigne-la chaque matin'} />
              {hrSeries.length >= 3 ? (
                <TrendChart ariaLabel="FC de repos" data={hrSeries} color="var(--sleep)" reference={hrAvg ? Math.round(hrAvg) : undefined} referenceLabel="Moyenne" format={(v) => `${v} bpm`} height={180} />
              ) : (
                <p className="text-sm text-ink-2">Il faut au moins 3 mesures pour afficher la tendance.</p>
              )}
            </Card>
            <Card>
              <CardTitle icon={<AlarmClock size={16} />} accent="sleep" title="Ton heure de coucher idéale" />
              {idealBed ? (
                <div>
                  <p className="text-4xl font-bold tracking-tight">{idealBed}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    Pour dormir {fmtMinutes(goal)} avec un lever moyen à {minutesToHHMM(avgWake!)} (+15 min d’endormissement). Tu peux changer ton objectif de sommeil dans le profil.
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
              {sleep.slice(0, 40).map((e) => (
                <ListRow
                  key={e.id}
                  onClick={() => openForm('sleep', e)}
                  icon={<BedDouble size={18} />}
                  accent="sleep"
                  title={relativeDay(e.date)}
                  meta={[e.bedtime && e.wakeTime && `${e.bedtime} → ${e.wakeTime}`, e.restingHr && `FC repos ${e.restingHr}`, e.napMin && `sieste ${e.napMin} min`, e.notes].filter(Boolean).join(' · ')}
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
