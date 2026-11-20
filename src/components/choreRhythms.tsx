import { useMemo, useState } from 'react'
import { Check, CircleAlert, Clock, Repeat } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Card, CardTitle, Input, Select } from './ui'
import { addDaysISO, capitalize, daysBetween, fmtDate, todayISO, uid } from '../lib/format'
import { RHYTHM_CHOICES, choreKey, choreRhythms, dueSoon, fmtDue, fmtEvery, type ChoreRhythm } from '../lib/chores'

function sinceText(date: string, today: string): string {
  const d = daysBetween(date, today)
  return d === 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} jours`
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Tâches régulières : ce qui est à faire bientôt, et le réglage du rythme de chaque tâche */
export function RecurringChores() {
  const { chores, choreRhythms: settings, upsertMany, setChoreRhythm } = useStore()
  const notify = useUi((s) => s.notify)
  const today = todayISO()
  const rhythms = useMemo(() => choreRhythms(chores, settings, today), [chores, settings, today])
  const soon = dueSoon(rhythms)
  const [manage, setManage] = useState(false)
  const [name, setName] = useState('')
  const [every, setEvery] = useState(14)

  // Toutes les tâches connues, pour régler leur rythme (même sans rythme détecté)
  const known = useMemo(() => {
    const m = new Map<string, { key: string; name: string; last: string }>()
    for (const c of chores) {
      const k = choreKey(c.name)
      const cur = m.get(k)
      if (!cur || c.date > cur.last) m.set(k, { key: k, name: c.name, last: c.date })
    }
    for (const [k, s] of Object.entries(settings)) if (!m.has(k)) m.set(k, { key: k, name: s.name, last: '' })
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [chores, settings])

  const done = (r: ChoreRhythm) => {
    upsertMany('chores', [{ id: uid(), date: today, name: r.name, time: nowHHMM() }])
    notify(`« ${r.name} » faite ✅ · prochaine fois vers le ${fmtDate(addDaysISO(today, r.everyDays), 'd MMMM')}`)
  }

  const setRhythm = (k: { key: string; name: string }, value: string) => {
    if (value === 'auto') setChoreRhythm(k.key, undefined)
    else if (value === 'off') setChoreRhythm(k.key, { name: k.name, off: true })
    else setChoreRhythm(k.key, { name: k.name, everyDays: Number(value) })
  }

  const add = () => {
    const n = name.trim()
    if (!n) return
    const label = n.charAt(0).toUpperCase() + n.slice(1)
    setChoreRhythm(choreKey(label), { name: label, everyDays: every })
    setName('')
    notify(`« ${label} » ajoutée aux tâches régulières (${fmtEvery(every)})`)
  }

  return (
    <Card className="mt-4">
      <CardTitle
        icon={<Repeat size={16} />}
        accent="chore"
        title="À faire bientôt"
        subtitle={soon.length ? `${soon.length} tâche${soon.length > 1 ? 's' : ''} régulière${soon.length > 1 ? 's' : ''} à prévoir` : 'Tes tâches régulières sont à jour'}
        action={
          <button type="button" onClick={() => setManage((m) => !m)} className="text-sm font-medium text-ink-2 hover:text-ink" aria-expanded={manage}>
            {manage ? 'Fermer' : 'Gérer'}
          </button>
        }
      />
      {soon.length > 0 ? (
        <ul className="space-y-2">
          {soon.map((r) => (
            <li key={r.key} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</p>
                <Button size="sm" variant="soft" icon={<Check size={14} />} onClick={() => done(r)}>
                  Fait
                </Button>
              </div>
              <p className="mt-0.5 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1 font-medium text-ink-2">
                  {r.inDays < 0 ? <CircleAlert size={13} className="text-warn" aria-hidden /> : <Clock size={13} aria-hidden />}
                  {capitalize(fmtDue(r.inDays))}
                </span>
                {' · '}
                {fmtEvery(r.everyDays)}
                {r.source === 'auto' ? ' d’après tes habitudes' : ''}
                {r.last ? ` · dernière fois ${sinceText(r.last, today)}` : ' · jamais notée'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">
          {rhythms.length
            ? `Prochaine : ${rhythms[0].name.toLowerCase()}, ${fmtDue(rhythms[0].inDays)}.`
            : 'Les tâches que tu fais régulièrement (vitres, draps, frigo…) apparaîtront ici avec leur prochaine échéance, dès qu’elles auront été notées 3 fois. Tu peux aussi régler leur rythme toi-même avec « Gérer ».'}
        </p>
      )}

      {manage && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs text-ink-3">Rythme de chaque tâche. « Auto » le déduit de ton historique ; les tâches faites presque tous les jours ne sont pas rappelées.</p>
          {known.length > 0 && (
            <ul className="space-y-1.5">
              {known.map((k) => {
                const s = settings[k.key]
                const r = rhythms.find((x) => x.key === k.key)
                const value = s?.off ? 'off' : s?.everyDays ? String(s.everyDays) : 'auto'
                return (
                  <li key={k.key} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{k.name}</span>
                    <Select className="!w-auto !py-1.5 text-sm" value={value} onChange={(e) => setRhythm(k, e.target.value)} aria-label={`Rythme de ${k.name}`}>
                      <option value="auto">Auto{r?.source === 'auto' ? ` (${fmtEvery(r.everyDays)})` : ''}</option>
                      {RHYTHM_CHOICES.map((c) => (
                        <option key={c.days} value={String(c.days)}>
                          {c.label}
                        </option>
                      ))}
                      {s?.everyDays && !RHYTHM_CHOICES.some((c) => c.days === s.everyDays) && <option value={String(s.everyDays)}>{capitalize(fmtEvery(s.everyDays))}</option>}
                      <option value="off">Ne pas rappeler</option>
                    </Select>
                  </li>
                )
              })}
            </ul>
          )}
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <Input className="min-w-0 flex-1 basis-48" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle tâche régulière, ex. détartrer la bouilloire" aria-label="Nouvelle tâche régulière" />
            <Select className="!w-auto" value={String(every)} onChange={(e) => setEvery(Number(e.target.value))} aria-label="Rythme de la nouvelle tâche">
              {RHYTHM_CHOICES.map((c) => (
                <option key={c.days} value={String(c.days)}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={!name.trim()}>
              Ajouter
            </Button>
          </form>
        </div>
      )}
    </Card>
  )
}
