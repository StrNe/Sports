import { useEffect, useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Activity, BedDouble, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, ClipboardCheck, Footprints, ListChecks, Scale, SprayCan, Utensils } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Card, CardTitle, IconButton, PageHeader, Stat } from '../components/ui'
import { addDaysISO, fmtDate, fmtDurationShort, fmtKm, fmtMinutes, fmtNum, todayISO, weekStartISO } from '../lib/format'
import { fmtHours, weekReview, type Highlight } from '../lib/review'

const TOPIC_ICON: Record<Highlight['topic'], ReactNode> = {
  run: <Footprints size={16} className="text-run" />,
  plan: <ListChecks size={16} className="text-brand" />,
  sleep: <BedDouble size={16} className="text-sleep" />,
  food: <Utensils size={16} className="text-food" />,
  chores: <SprayCan size={16} className="text-chore" />,
  weight: <Scale size={16} className="text-ink-2" />,
}

/** Écart signé avec la semaine précédente, en texte (jamais la couleur seule) */
function delta(now: number, before: number, unit: string, digits = 0): string | undefined {
  if (!before && !now) return undefined
  const d = now - before
  if (Math.abs(d) < (digits ? 0.05 : 0.5)) return 'comme la semaine d’avant'
  return `${d > 0 ? '↑ +' : '↓ −'}${fmtNum(Math.abs(d), digits)}${unit} vs semaine d’avant`
}

export default function Review() {
  const data = useStore()
  const setSync = useStore((s) => s.setSync)
  const today = todayISO()
  const thisWeek = weekStartISO(today)
  const lastWeek = addDaysISO(thisWeek, -7)
  const [ws, setWs] = useState(lastWeek)
  const r = useMemo(() => weekReview(data, ws, today), [data, ws, today])
  const goal = data.profile.sleepGoalMin || 480

  // Le bilan de la semaine passée est marqué comme lu (le rappel de l'accueil disparaît)
  useEffect(() => {
    if (ws === lastWeek && data.sync?.reviewSeen !== lastWeek) setSync({ reviewSeen: lastWeek })
  }, [ws, lastWeek, data.sync?.reviewSeen, setSync])

  const label = `${fmtDate(r.weekStart, 'd')}${r.weekStart.slice(5, 7) !== r.weekEnd.slice(5, 7) ? ` ${fmtDate(r.weekStart, 'MMMM')}` : ''} au ${fmtDate(r.weekEnd, 'd MMMM yyyy')}`
  const empty = !r.run.count && !r.sessions.total && !r.sleep.nights && !r.food.days && !r.chores.count

  return (
    <div>
      <PageHeader title="Bilan de la semaine" subtitle={`Du ${label}`} icon={<ClipboardCheck size={22} />} accent="brand" />

      <div className="mb-4 flex items-center justify-between gap-2">
        <IconButton label="Semaine précédente" onClick={() => setWs(addDaysISO(ws, -7))}>
          <ChevronLeft size={20} />
        </IconButton>
        <div className="text-center">
          <p className="font-semibold">{ws === thisWeek ? 'Cette semaine (en cours)' : ws === lastWeek ? 'La semaine dernière' : `Semaine du ${fmtDate(ws, 'd MMMM yyyy')}`}</p>
          {ws !== lastWeek && (
            <button type="button" onClick={() => setWs(lastWeek)} className="text-xs font-medium text-brand hover:underline">
              Revenir à la semaine dernière
            </button>
          )}
        </div>
        <IconButton label="Semaine suivante" onClick={() => setWs(addDaysISO(ws, 7))} disabled={ws >= thisWeek} className={clsx(ws >= thisWeek && 'opacity-30')}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      {empty ? (
        <Card>
          <p className="text-sm text-ink-2">Rien d’enregistré cette semaine-là.</p>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle icon={<ClipboardCheck size={16} />} accent="brand" title="En bref" subtitle={r.complete ? undefined : 'Semaine en cours : le bilan se complète jour après jour'} />
            <ul className="space-y-2.5">
              {r.highlights.map((h) => (
                <li key={h.topic} className="flex gap-2.5 text-sm leading-snug">
                  <span className="mt-0.5 shrink-0">{TOPIC_ICON[h.topic]}</span>
                  <span className="min-w-0 flex-1">{h.text}</span>
                  {h.tone !== 'info' && (
                    <span className="mt-0.5 shrink-0" aria-label={h.tone === 'good' ? 'Bon point' : 'À surveiller'}>
                      {h.tone === 'good' ? <CircleCheck size={16} className="text-good" /> : <CircleAlert size={16} className="text-warn" />}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Course" icon={<Footprints size={15} />} accent="run" value={fmtKm(r.run.km)} unit="km" sub={delta(r.run.km, r.run.prevKm, ' km', 1) ?? `${r.run.count} sortie${r.run.count > 1 ? 's' : ''}`} />
            <Stat label="Séances" icon={<Activity size={15} />} accent="renfo" value={r.sessions.total} unit={r.sessions.planned ? `/ ${r.sessions.planned} prévues` : undefined} sub={[r.run.count && `${r.run.count} course`, r.sessions.renfo && `${r.sessions.renfo} renfo`, r.sessions.muscu && `${r.sessions.muscu} muscu`].filter(Boolean).join(' · ') || 'Aucune séance'} />
            <Stat label="Sommeil par nuit" icon={<BedDouble size={15} />} accent="sleep" value={r.sleep.avgMin ? fmtMinutes(r.sleep.avgMin) : '—'} sub={r.sleep.avgMin ? [r.sleep.avgScore ? `score ${Math.round(r.sleep.avgScore)}` : '', r.sleep.restingHr ? `FC repos ${Math.round(r.sleep.restingHr)}` : '', `objectif ${fmtHours(goal)}`].filter(Boolean).join(' · ') : 'Aucune nuit'} />
            <Stat label="Calories par jour" icon={<Utensils size={15} />} accent="food" value={r.food.avgIntake ? fmtNum(r.food.avgIntake) : '—'} unit={r.food.avgIntake ? 'kcal' : undefined} sub={r.food.days ? `objectif ${fmtNum(r.food.avgTarget)} · ${r.food.days} jour${r.food.days > 1 ? 's' : ''} noté${r.food.days > 1 ? 's' : ''}` : 'Pas assez de repas notés'} />
            <Stat label="Tâches ménagères" icon={<SprayCan size={15} />} accent="chore" value={r.chores.count} sub={delta(r.chores.count, r.chores.prevCount, '') ?? 'Aucune tâche'} />
            {r.weight.last != null && <Stat label="Poids" icon={<Scale size={15} />} value={fmtNum(r.weight.last, 1)} unit="kg" sub={r.weight.delta != null ? `${r.weight.delta > 0 ? '↑ +' : r.weight.delta < 0 ? '↓ −' : ''}${fmtNum(Math.abs(r.weight.delta), 1)} kg sur la semaine` : undefined} />}
          </div>

          <Card className="mt-4">
            <CardTitle title="Jour par jour" subtitle={r.run.durationSec ? `${fmtDurationShort(r.run.durationSec)} de course${r.run.elevation ? ` · D+ ${fmtNum(r.run.elevation)} m` : ''}` : undefined} />
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th className="px-1 py-1.5 font-medium">Jour</th>
                    <th className="px-1 py-1.5 text-right font-medium">Course</th>
                    <th className="px-1 py-1.5 text-right font-medium">Renfo</th>
                    <th className="px-1 py-1.5 text-right font-medium">Sommeil</th>
                    <th className="px-1 py-1.5 text-right font-medium">Kcal</th>
                    <th className="px-1 py-1.5 text-right font-medium">Tâches</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {r.days.map((d) => (
                    <tr key={d.date} className={clsx('border-t border-line', d.future && 'text-ink-3')}>
                      <td className="px-1 py-2 font-medium capitalize">{fmtDate(d.date, 'EEE d')}</td>
                      <td className="px-1 py-2 text-right">{d.km ? `${fmtKm(d.km)} km` : <span className="text-ink-3">—</span>}</td>
                      <td className="px-1 py-2 text-right">{d.renfo + d.muscu ? [d.renfo && 'renfo', d.muscu && 'muscu'].filter(Boolean).join(' + ') : <span className="text-ink-3">—</span>}</td>
                      <td className="px-1 py-2 text-right">{d.sleepMin ? fmtMinutes(d.sleepMin) : <span className="text-ink-3">—</span>}</td>
                      <td className="px-1 py-2 text-right">{d.kcal ? fmtNum(d.kcal) : <span className="text-ink-3">—</span>}</td>
                      <td className="px-1 py-2 text-right">{d.chores || <span className="text-ink-3">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
