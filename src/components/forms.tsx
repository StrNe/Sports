import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import type { ChoreEntry, MuscuExercise, MuscuSession, PersonalRecord, PlannedKind, PlannedWorkout, Race, RaceKind, RenfoExercise, RenfoFocus, RenfoSession, Run, RunType, Shoe, SleepEntry } from '../types'
import { Button, Field, IconButton, Input, NumberInput, Rating, Select, Textarea } from './ui'
import { FormShell, Row } from './formShell'
import { SessionCheckView, WorkoutNotes, WorkoutSteps } from './workout'
import { judgeWholeRun, plannedForRun } from '../lib/workout'
import { CaloriesForm, FoodEntryForm, FoodForm } from './food'
import { fmtDuration, fmtPace, fmtNum, paceSecPerKm, parseDuration, sleepDurationMin, todayISO, uid } from '../lib/format'
import { BACKYARD_LOOP_KM, RACE_KIND_LABEL, RUN_TYPES, RUN_TYPE_ORDER, STANDARD_DISTANCES, loopKmOf } from '../lib/running'
import { MUSCU_EXERCISES, MUSCU_TEMPLATES, RENFO_FOCUS_LABEL } from '../data/training'

/** Champ durée tolérant : "45", "45:30", "1:02:15", "1h02". En mode "hm", "7:45" = 7 h 45. */
function DurationInput({ value, onChange, placeholder = 'ex. 45:30', mode = 'auto' }: { value: number | undefined; onChange: (s: number | undefined) => void; placeholder?: string; mode?: 'auto' | 'hm' }) {
  const fmt = (v: number | undefined) => (!v ? '' : mode === 'hm' ? `${Math.floor(v / 3600)}:${String(Math.round((v % 3600) / 60)).padStart(2, '0')}` : fmtDuration(v))
  const parse = (t: string) => {
    if (mode !== 'hm') return parseDuration(t)
    const m = t.trim().match(/^(\d{1,2})(?:[:h](\d{1,2}))?$/i)
    return m ? Number(m[1]) * 3600 + Number(m[2] ?? 0) * 60 : undefined
  }
  const [text, setText] = useState(fmt(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <Input
      value={text}
      inputMode="numeric"
      placeholder={placeholder}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
      onBlur={() => {
        focused.current = false
        if (value) setText(fmt(value))
      }}
    />
  )
}

const RPE_LABELS = ['Très facile', 'Facile', 'Modéré', 'Un peu dur', 'Dur', 'Dur+', 'Très dur', 'Très dur+', 'Extrême', 'Maximal']
const FEELING_LABELS = ['Mauvaises', 'Moyennes', 'Correctes', 'Bonnes', 'Excellentes']

// ── Course ──────────────────────────────────────────────────
export function RunForm({ initial }: { initial?: Partial<Run> & { plannedId?: string } }) {
  const { upsert, remove, shoes, planned } = useStore()
  const { closeForm, notify } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<Run>({
    id: initial?.id ?? uid(),
    date: initial?.date ?? todayISO(),
    type: initial?.type ?? 'ef',
    distanceKm: initial?.distanceKm ?? 0,
    durationSec: initial?.durationSec ?? 0,
    source: initial?.source ?? 'manuel',
    ...initial,
  } as Run)
  const set = <K extends keyof Run>(k: K, v: Run[K]) => setD((x) => ({ ...x, [k]: v }))
  const pace = paceSecPerKm(d.distanceKm, d.durationSec)
  const activeShoes = shoes.filter((s) => !s.retired || s.id === d.shoeId)
  const plannedRun = editing ? plannedForRun(d, planned) : undefined

  const save = () => {
    const { plannedId, ...run } = d as Run & { plannedId?: string }
    upsert('runs', run)
    const p = planned.find((x) => x.id === initial?.plannedId)
    if (p) upsert('planned', { ...p, done: true })
    notify(editing ? 'Séance mise à jour' : 'Séance de course enregistrée 🏃')
    closeForm()
  }

  return (
    <FormShell title={editing ? 'Modifier la course' : 'Nouvelle course'} onSave={save} onDelete={editing ? () => remove('runs', d.id) : undefined} canSave={d.distanceKm > 0 && d.durationSec > 0}>
      {editing && plannedRun?.steps && (
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="mb-2 text-xs text-ink-3">Séance prévue : {plannedRun.title}</p>
          <SessionCheckView run={d} planned={plannedRun} />
          {/* Pas encore de comparaison : on montre au moins le déroulé prévu */}
          {!d.check && !judgeWholeRun(plannedRun.steps, d) && <WorkoutSteps blocks={plannedRun.steps} />}
        </div>
      )}
      <Row>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label="Type de séance" hint={RUN_TYPES[d.type].hint}>
          <Select value={d.type} onChange={(e) => set('type', e.target.value as RunType)}>
            {RUN_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {RUN_TYPES[t].label}
              </option>
            ))}
          </Select>
        </Field>
      </Row>
      <Field label="Titre (optionnel)">
        <Input value={d.title ?? ''} placeholder="ex. 3 × 8 min au seuil" onChange={(e) => set('title', e.target.value || undefined)} />
      </Field>
      <Row cols={3}>
        <Field label="Distance (km)">
          <NumberInput value={d.distanceKm || undefined} min={0} onChange={(v) => set('distanceKm', v ?? 0)} placeholder="10" />
        </Field>
        <Field label="Durée">
          <DurationInput value={d.durationSec || undefined} onChange={(v) => set('durationSec', v ?? 0)} />
        </Field>
        <Field label="Allure">
          <div className="field tabular flex items-center bg-surface-3 text-ink-2">{pace ? `${fmtPace(pace)} /km` : '—'}</div>
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="FC moyenne">
          <NumberInput value={d.avgHr} onChange={(v) => set('avgHr', v)} placeholder="bpm" />
        </Field>
        <Field label="FC max">
          <NumberInput value={d.maxHr} onChange={(v) => set('maxHr', v)} placeholder="bpm" />
        </Field>
        <Field label="Dénivelé +">
          <NumberInput value={d.elevationM} onChange={(v) => set('elevationM', v)} placeholder="m" />
        </Field>
      </Row>
      <Field label="Effort perçu (RPE)" hint="Sert à calculer ta charge d’entraînement.">
        <Rating value={d.rpe} onChange={(v) => set('rpe', v)} max={10} labels={RPE_LABELS} accent="run" />
      </Field>
      <Field label="Sensations">
        <Rating value={d.feeling} onChange={(v) => set('feeling', v)} labels={FEELING_LABELS} accent="run" />
      </Field>
      {activeShoes.length > 0 && (
        <Field label="Chaussures">
          <Select value={d.shoeId ?? ''} onChange={(e) => set('shoeId', e.target.value || undefined)}>
            <option value="">—</option>
            {activeShoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Notes">
        <Textarea value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} placeholder="Météo, parcours, douleurs…" />
      </Field>
    </FormShell>
  )
}

// ── Renfo ───────────────────────────────────────────────────
function RenfoExerciseEditor({ exercises, onChange }: { exercises: RenfoExercise[]; onChange: (e: RenfoExercise[]) => void }) {
  const upd = (i: number, patch: Partial<RenfoExercise>) => onChange(exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  return (
    <div className="space-y-2">
      {exercises.map((ex, i) => {
        const timed = ex.durationSec != null
        return (
          <div key={i} className="rounded-xl border border-line bg-surface-2 p-2.5">
            <div className="flex items-center gap-2">
              <Input className="!bg-surface" value={ex.name} placeholder="Exercice" onChange={(e) => upd(i, { name: e.target.value })} />
              <IconButton label="Retirer l’exercice" onClick={() => onChange(exercises.filter((_, j) => j !== i))}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <NumberInput className="!w-16 !bg-surface" value={ex.sets} onChange={(v) => upd(i, { sets: v ?? 1 })} aria-label="Séries" />
              <span className="text-ink-3">×</span>
              <NumberInput
                className="!w-20 !bg-surface"
                value={timed ? ex.durationSec : ex.reps}
                onChange={(v) => upd(i, timed ? { durationSec: v } : { reps: v })}
                aria-label={timed ? 'Durée en secondes' : 'Répétitions'}
              />
              <Select className="!w-auto !bg-surface !py-2" value={timed ? 's' : 'reps'} onChange={(e) => (e.target.value === 's' ? upd(i, { durationSec: ex.reps ?? 30, reps: undefined }) : upd(i, { reps: ex.durationSec ?? 10, durationSec: undefined }))}>
                <option value="reps">répét.</option>
                <option value="s">secondes</option>
              </Select>
              {ex.note && <span className="text-xs text-ink-3">{ex.note}</span>}
            </div>
          </div>
        )
      })}
      <Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={() => onChange([...exercises, { name: '', sets: 3, reps: 12 }])}>
        Ajouter un exercice
      </Button>
    </div>
  )
}

export function RenfoForm({ initial }: { initial?: Partial<RenfoSession> }) {
  const { upsert, remove, renfoTemplates } = useStore()
  const { closeForm, notify } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<RenfoSession>({
    id: initial?.id ?? uid(),
    date: initial?.date ?? todayISO(),
    title: initial?.title ?? '',
    focus: initial?.focus ?? 'complet',
    durationMin: initial?.durationMin ?? 25,
    exercises: initial?.exercises ?? [],
    rpe: initial?.rpe,
    notes: initial?.notes,
  })
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const set = <K extends keyof RenfoSession>(k: K, v: RenfoSession[K]) => setD((x) => ({ ...x, [k]: v }))

  const applyTemplate = (id: string) => {
    const t = renfoTemplates.find((x) => x.id === id)
    if (!t) return
    setD((x) => ({ ...x, title: t.title, focus: t.focus, durationMin: t.durationMin, exercises: t.exercises.map((e) => ({ ...e })) }))
  }

  const save = () => {
    const session = { ...d, title: d.title || RENFO_FOCUS_LABEL[d.focus], exercises: d.exercises.filter((e) => e.name.trim()) }
    upsert('renfo', session)
    if (saveAsTemplate) upsert('renfoTemplates', { id: uid(), title: session.title, focus: session.focus, durationMin: session.durationMin, description: 'Modèle personnel', exercises: session.exercises })
    notify(editing ? 'Séance mise à jour' : 'Séance de renfo enregistrée 💪')
    closeForm()
  }

  return (
    <FormShell title={editing ? 'Modifier le renfo' : 'Nouvelle séance de renfo'} onSave={save} onDelete={editing ? () => remove('renfo', d.id) : undefined} wide>
      {!editing && (
        <Field label="Partir d’un modèle">
          <Select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">— Séance libre —</option>
            {renfoTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} · {t.durationMin} min
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Row>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Focus">
          <Select value={d.focus} onChange={(e) => set('focus', e.target.value as RenfoFocus)}>
            {Object.entries(RENFO_FOCUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </Row>
      <Row>
        <Field label="Titre">
          <Input value={d.title} placeholder="ex. Renfo A" onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Durée (min)">
          <NumberInput value={d.durationMin} onChange={(v) => set('durationMin', v ?? 0)} />
        </Field>
      </Row>
      <Field label="Exercices">
        <RenfoExerciseEditor exercises={d.exercises} onChange={(e) => set('exercises', e)} />
      </Field>
      <Field label="Effort perçu (RPE)">
        <Rating value={d.rpe} onChange={(v) => set('rpe', v)} max={10} labels={RPE_LABELS} accent="renfo" />
      </Field>
      <Field label="Notes">
        <Textarea value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
        Enregistrer aussi comme modèle réutilisable
      </label>
    </FormShell>
  )
}

// ── Musculation ─────────────────────────────────────────────
export function MuscuForm({ initial }: { initial?: Partial<MuscuSession> }) {
  const { upsert, remove, muscu } = useStore()
  const { closeForm, notify } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<MuscuSession>({
    id: initial?.id ?? uid(),
    date: initial?.date ?? todayISO(),
    title: initial?.title ?? '',
    durationMin: initial?.durationMin ?? 60,
    exercises: initial?.exercises ?? [{ name: '', sets: [{ reps: 8, weightKg: 0 }] }],
    rpe: initial?.rpe,
    notes: initial?.notes,
  })
  const set = <K extends keyof MuscuSession>(k: K, v: MuscuSession[K]) => setD((x) => ({ ...x, [k]: v }))
  const setEx = (i: number, ex: MuscuExercise) => set('exercises', d.exercises.map((e, j) => (j === i ? ex : e)))
  const tonnage = d.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps * s.weightKg, 0), 0)

  const pastTitles = useMemo(() => {
    const seen = new Set<string>()
    return muscu.filter((s) => !seen.has(s.title) && seen.add(s.title)).slice(0, 6)
  }, [muscu])

  const applyTemplate = (v: string) => {
    if (v.startsWith('past:')) {
      const s = muscu.find((x) => x.id === v.slice(5))
      if (s) setD((x) => ({ ...x, title: s.title, durationMin: s.durationMin, exercises: s.exercises.map((e) => ({ name: e.name, sets: e.sets.map((st) => ({ ...st })) })) }))
    } else if (v.startsWith('tpl:')) {
      const t = MUSCU_TEMPLATES[Number(v.slice(4))]
      if (t) setD((x) => ({ ...x, title: t.title, durationMin: t.durationMin, exercises: t.exercises.map((e) => ({ name: e.name, sets: e.sets.map((st) => ({ ...st })) })) }))
    }
  }

  const save = () => {
    upsert('muscu', { ...d, title: d.title || 'Musculation', exercises: d.exercises.filter((e) => e.name.trim() && e.sets.length) })
    notify(editing ? 'Séance mise à jour' : 'Séance de muscu enregistrée 🏋️')
    closeForm()
  }

  return (
    <FormShell title={editing ? 'Modifier la séance de muscu' : 'Nouvelle séance de muscu'} onSave={save} onDelete={editing ? () => remove('muscu', d.id) : undefined} wide>
      {!editing && (
        <Field label="Partir d’une séance">
          <Select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">— Séance libre —</option>
            {pastTitles.length > 0 && (
              <optgroup label="Répéter une séance récente">
                {pastTitles.map((s) => (
                  <option key={s.id} value={`past:${s.id}`}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Programmes pour coureurs">
              {MUSCU_TEMPLATES.map((t, i) => (
                <option key={t.title} value={`tpl:${i}`}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
      )}
      <Row cols={3}>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Titre">
          <Input value={d.title} placeholder="ex. Jambes" onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Durée (min)">
          <NumberInput value={d.durationMin} onChange={(v) => set('durationMin', v ?? 0)} />
        </Field>
      </Row>

      <datalist id="muscu-exercises">
        {MUSCU_EXERCISES.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>
      <div className="space-y-3">
        {d.exercises.map((ex, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <Input className="!bg-surface" list="muscu-exercises" value={ex.name} placeholder="Exercice (ex. Squat)" onChange={(e) => setEx(i, { ...ex, name: e.target.value })} />
              <IconButton label="Retirer l’exercice" onClick={() => set('exercises', d.exercises.filter((_, j) => j !== i))}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="mt-2 space-y-1.5">
              {ex.sets.map((s, k) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-xs text-ink-3">Série {k + 1}</span>
                  <NumberInput className="!w-20 !bg-surface !py-1.5" value={s.reps} onChange={(v) => setEx(i, { ...ex, sets: ex.sets.map((x, j) => (j === k ? { ...x, reps: v ?? 0 } : x)) })} aria-label="Répétitions" />
                  <span className="text-ink-3">rép. ×</span>
                  <NumberInput className="!w-24 !bg-surface !py-1.5" value={s.weightKg} onChange={(v) => setEx(i, { ...ex, sets: ex.sets.map((x, j) => (j === k ? { ...x, weightKg: v ?? 0 } : x)) })} aria-label="Charge en kg" />
                  <span className="text-ink-3">kg</span>
                  <IconButton label="Retirer la série" className="ml-auto size-7" onClick={() => setEx(i, { ...ex, sets: ex.sets.filter((_, j) => j !== k) })}>
                    <X size={14} />
                  </IconButton>
                </div>
              ))}
              <button type="button" className="text-xs font-medium text-muscu hover:underline" onClick={() => setEx(i, { ...ex, sets: [...ex.sets, { ...(ex.sets[ex.sets.length - 1] ?? { reps: 8, weightKg: 0 }) }] })}>
                + Ajouter une série
              </button>
            </div>
          </div>
        ))}
        <Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={() => set('exercises', [...d.exercises, { name: '', sets: [{ reps: 8, weightKg: 0 }] }])}>
          Ajouter un exercice
        </Button>
      </div>
      <p className="text-xs text-ink-3">Tonnage total : {fmtNum(tonnage)} kg</p>
      <Field label="Effort perçu (RPE)">
        <Rating value={d.rpe} onChange={(v) => set('rpe', v)} max={10} labels={RPE_LABELS} accent="muscu" />
      </Field>
      <Field label="Notes">
        <Textarea value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </Field>
    </FormShell>
  )
}

// ── Sommeil ─────────────────────────────────────────────────
export function SleepForm({ initial }: { initial?: Partial<SleepEntry> }) {
  const { upsert, remove, sleep } = useStore()
  const { closeForm, notify } = useUi()
  const editing = !!initial?.id
  const last = sleep[0]
  const bed0 = initial?.bedtime ?? last?.bedtime ?? '23:00'
  const wake0 = initial?.wakeTime ?? last?.wakeTime ?? '07:00'
  const [d, setD] = useState<SleepEntry>({
    id: initial?.id ?? uid(),
    date: initial?.date ?? todayISO(),
    bedtime: bed0,
    wakeTime: wake0,
    durationMin: initial?.durationMin ?? sleepDurationMin(bed0, wake0) ?? 480,
    quality: initial?.quality ?? 3,
    ...initial,
  } as SleepEntry)
  const [manualDuration, setManualDuration] = useState(editing)
  const set = <K extends keyof SleepEntry>(k: K, v: SleepEntry[K]) =>
    setD((x) => {
      const next = { ...x, [k]: v }
      if (!manualDuration && (k === 'bedtime' || k === 'wakeTime')) {
        const dur = sleepDurationMin(next.bedtime, next.wakeTime)
        if (dur) next.durationMin = Math.max(0, dur - (next.awakeMin ?? 0))
      }
      return next
    })

  const save = () => {
    // Une seule nuit par date
    const existing = sleep.find((s) => s.date === d.date && s.id !== d.id)
    if (existing) remove('sleep', existing.id)
    upsert('sleep', d)
    notify('Nuit enregistrée 😴')
    closeForm()
  }

  return (
    <FormShell title={editing ? 'Modifier la nuit' : 'Enregistrer ma nuit'} onSave={save} onDelete={editing ? () => remove('sleep', d.id) : undefined}>
      <Field label="Date du réveil">
        <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
      </Field>
      <Row cols={3}>
        <Field label="Coucher">
          <Input type="time" value={d.bedtime ?? ''} onChange={(e) => set('bedtime', e.target.value)} />
        </Field>
        <Field label="Lever">
          <Input type="time" value={d.wakeTime ?? ''} onChange={(e) => set('wakeTime', e.target.value)} />
        </Field>
        <Field label="Temps endormi">
          <DurationInput
            mode="hm"
            value={d.durationMin * 60}
            placeholder="7:45"
            onChange={(v) => {
              setManualDuration(true)
              if (v) setD((x) => ({ ...x, durationMin: Math.round(v / 60) }))
            }}
          />
        </Field>
      </Row>
      <p className="-mt-2 text-xs text-ink-3">Format h:mm. Calculé automatiquement à partir des heures, modifiable si ta montre donne le temps de sommeil réel.</p>
      <Field label="Qualité du sommeil">
        <Rating value={d.quality} onChange={(v) => set('quality', v ?? 3)} labels={['Très mauvaise', 'Mauvaise', 'Moyenne', 'Bonne', 'Excellente']} accent="sleep" />
      </Field>
      <Row>
        <Field label="Énergie au réveil">
          <Rating value={d.energy} onChange={(v) => set('energy', v)} accent="sleep" />
        </Field>
        <Field label="Courbatures / douleurs">
          <Rating value={d.soreness} onChange={(v) => set('soreness', v)} accent="sleep" />
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="FC de repos">
          <NumberInput value={d.restingHr} onChange={(v) => set('restingHr', v)} placeholder="bpm" />
        </Field>
        <Field label="VFC (HRV)">
          <NumberInput value={d.hrv} onChange={(v) => set('hrv', v)} placeholder="ms" />
        </Field>
        <Field label="Score montre">
          <NumberInput value={d.score} onChange={(v) => set('score', v)} placeholder="/100" />
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="Sommeil profond">
          <NumberInput value={d.deepPct} onChange={(v) => set('deepPct', v)} placeholder="%" />
        </Field>
        <Field label="Éveillé">
          <NumberInput value={d.awakeMin} onChange={(v) => set('awakeMin', v)} placeholder="min" />
        </Field>
        <Field label="Sieste">
          <NumberInput value={d.napMin} onChange={(v) => set('napMin', v)} placeholder="min" />
        </Field>
      </Row>
      <Field label="Notes">
        <Textarea value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} placeholder="Écrans tard, café, stress, réveils…" />
      </Field>
    </FormShell>
  )
}

// ── Course à venir / résultat ───────────────────────────────
export function RaceForm({ initial }: { initial?: Partial<Race> }) {
  const { upsert, remove } = useStore()
  const { closeForm, notify } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<Race>({
    id: initial?.id ?? uid(),
    name: initial?.name ?? '',
    date: initial?.date ?? todayISO(),
    kind: initial?.kind ?? 'route',
    distanceKm: initial?.distanceKm ?? 10,
    priority: initial?.priority ?? 'A',
    ...initial,
  } as Race)
  const set = <K extends keyof Race>(k: K, v: Race[K]) => setD((x) => ({ ...x, [k]: v }))
  const past = d.date <= todayISO()
  const backyard = d.kind === 'backyard'

  const save = () => {
    const race = { ...d, distanceKm: backyard ? (d.goalLoops ?? 1) * loopKmOf(d) : d.distanceKm }
    upsert('races', race)
    notify(editing ? 'Course mise à jour' : 'Course ajoutée à ton calendrier 🏁')
    closeForm()
  }

  return (
    <FormShell title={editing ? 'Modifier la course' : 'Ajouter une course'} onSave={save} onDelete={editing ? () => remove('races', d.id) : undefined} canSave={!!d.name.trim()}>
      <Field label="Nom de la course">
        <Input value={d.name} placeholder="ex. Marathon de Toulouse" onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Row>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={d.kind} onChange={(e) => set('kind', e.target.value as RaceKind)}>
            {Object.entries(RACE_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </Row>
      {backyard ? (
        <Row cols={3}>
          <Field label="Boucles visées" hint="1 boucle par heure">
            <NumberInput value={d.goalLoops} min={1} onChange={(v) => set('goalLoops', v)} />
          </Field>
          <Field label="Boucle (km)" hint={`Standard : ${BACKYARD_LOOP_KM} km`}>
            <NumberInput value={d.loopKm} placeholder={String(BACKYARD_LOOP_KM)} onChange={(v) => set('loopKm', v)} />
          </Field>
          <Field label="Distance totale">
            <div className="field bg-surface-3 text-ink-2">{fmtNum((d.goalLoops ?? 1) * loopKmOf(d), 1)} km</div>
          </Field>
        </Row>
      ) : (
        <Row cols={3}>
          <Field label="Distance (km)">
            <Select
              value={STANDARD_DISTANCES.find((s) => Math.abs(s.km - d.distanceKm) < 0.01)?.key ?? 'autre'}
              onChange={(e) => {
                const s = STANDARD_DISTANCES.find((x) => x.key === e.target.value)
                if (s) set('distanceKm', s.km)
              }}
            >
              {STANDARD_DISTANCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
              <option value="autre">Autre…</option>
            </Select>
          </Field>
          <Field label="Km exacts">
            <NumberInput value={d.distanceKm} onChange={(v) => set('distanceKm', v ?? 0)} />
          </Field>
          <Field label="Dénivelé +">
            <NumberInput value={d.elevationM} onChange={(v) => set('elevationM', v)} placeholder="m" />
          </Field>
        </Row>
      )}
      <Row>
        <Field label="Lieu">
          <Input value={d.location ?? ''} onChange={(e) => set('location', e.target.value || undefined)} placeholder="Ville" />
        </Field>
        <Field label="Priorité" hint="A = objectif principal, C = course de préparation">
          <Select value={d.priority} onChange={(e) => set('priority', e.target.value as Race['priority'])}>
            <option value="A">A — Objectif principal</option>
            <option value="B">B — Important</option>
            <option value="C">C — Préparation</option>
          </Select>
        </Field>
      </Row>
      {!backyard && (
        <Field label="Temps visé" hint={d.goalTimeSec && d.distanceKm ? `Allure cible : ${fmtPace(d.goalTimeSec / d.distanceKm)} /km` : 'ex. 1:55:00'}>
          <DurationInput value={d.goalTimeSec} onChange={(v) => set('goalTimeSec', v)} placeholder="1:55:00" />
        </Field>
      )}
      <Field label="Notes">
        <Textarea value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} placeholder="Dossard, logistique, stratégie…" />
      </Field>
      {past && (
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-sm font-semibold">Résultat</p>
          <Row>
            {backyard ? (
              <Field label="Boucles bouclées">
                <NumberInput value={d.result?.loops} onChange={(v) => set('result', { ...d.result, loops: v })} />
              </Field>
            ) : (
              <Field label="Temps officiel">
                <DurationInput value={d.result?.timeSec} onChange={(v) => set('result', { ...d.result, timeSec: v })} placeholder="1:52:30" />
              </Field>
            )}
            <Field label="Classement">
              <Input value={d.result?.rank ?? ''} onChange={(e) => set('result', { ...d.result, rank: e.target.value || undefined })} placeholder="ex. 312 / 2400" />
            </Field>
          </Row>
        </div>
      )}
    </FormShell>
  )
}

// ── Record personnel ────────────────────────────────────────
export function RecordForm({ initial }: { initial?: Partial<PersonalRecord> }) {
  const { upsert, remove } = useStore()
  const { closeForm, notify } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<PersonalRecord>({ id: initial?.id ?? uid(), label: '5 km', distanceKm: 5, timeSec: 0, date: todayISO(), ...initial } as PersonalRecord)
  const set = <K extends keyof PersonalRecord>(k: K, v: PersonalRecord[K]) => setD((x) => ({ ...x, [k]: v }))
  const presets = [{ label: '1 km', km: 1 }, ...STANDARD_DISTANCES.map((s) => ({ label: s.label, km: s.km }))]
  return (
    <FormShell
      title={editing ? 'Modifier le record' : 'Ajouter un record'}
      onSave={() => {
        upsert('records', d)
        notify('Record enregistré 🏆')
        closeForm()
      }}
      onDelete={editing ? () => remove('records', d.id) : undefined}
      canSave={d.timeSec > 0 && d.distanceKm > 0}
    >
      <Row>
        <Field label="Distance">
          <Select
            value={presets.find((p) => p.label === d.label)?.label ?? 'autre'}
            onChange={(e) => {
              const p = presets.find((x) => x.label === e.target.value)
              if (p) setD((x) => ({ ...x, label: p.label, distanceKm: p.km }))
              else setD((x) => ({ ...x, label: 'Autre' }))
            }}
          >
            {presets.map((p) => (
              <option key={p.label}>{p.label}</option>
            ))}
            <option value="autre">Autre…</option>
          </Select>
        </Field>
        <Field label="Km">
          <NumberInput value={d.distanceKm} onChange={(v) => set('distanceKm', v ?? 0)} />
        </Field>
      </Row>
      <Row>
        <Field label="Temps" hint={d.timeSec ? `${fmtPace(d.timeSec / d.distanceKm)} /km` : undefined}>
          <DurationInput value={d.timeSec || undefined} onChange={(v) => set('timeSec', v ?? 0)} placeholder="25:30" />
        </Field>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </Row>
      <Field label="Où / quelle course">
        <Input value={d.where ?? ''} onChange={(e) => set('where', e.target.value || undefined)} />
      </Field>
    </FormShell>
  )
}

// ── Chaussures ──────────────────────────────────────────────
export function ShoeForm({ initial }: { initial?: Partial<Shoe> }) {
  const { upsert, remove } = useStore()
  const { closeForm } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<Shoe>({ id: initial?.id ?? uid(), name: '', startKm: 0, limitKm: 700, since: todayISO(), ...initial } as Shoe)
  const set = <K extends keyof Shoe>(k: K, v: Shoe[K]) => setD((x) => ({ ...x, [k]: v }))
  return (
    <FormShell
      title={editing ? 'Modifier la paire' : 'Nouvelle paire de chaussures'}
      onSave={() => {
        upsert('shoes', d)
        closeForm()
      }}
      onDelete={editing ? () => remove('shoes', d.id) : undefined}
      canSave={!!d.name.trim()}
    >
      <Field label="Modèle">
        <Input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="ex. Kiprun KD900" />
      </Field>
      <Row cols={3}>
        <Field label="Km de départ" hint="Déjà parcourus">
          <NumberInput value={d.startKm} onChange={(v) => set('startKm', v ?? 0)} />
        </Field>
        <Field label="Limite (km)">
          <NumberInput value={d.limitKm} onChange={(v) => set('limitKm', v ?? 700)} />
        </Field>
        <Field label="Depuis le">
          <Input type="date" value={d.since ?? ''} onChange={(e) => set('since', e.target.value)} />
        </Field>
      </Row>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" className="size-4" checked={!!d.retired} onChange={(e) => set('retired', e.target.checked)} />
        Paire retirée (n’apparaît plus dans les choix)
      </label>
    </FormShell>
  )
}

// ── Séance planifiée ───────────────────────────────────────
export const PLANNED_KIND_LABEL: Record<PlannedKind, string> = { run: 'Course', renfo: 'Renfo', muscu: 'Muscu', repos: 'Repos', autre: 'Autre' }

export function PlannedForm({ initial }: { initial?: Partial<PlannedWorkout> }) {
  const { upsert, remove } = useStore()
  const { closeForm } = useUi()
  const editing = !!initial?.id
  const [d, setD] = useState<PlannedWorkout>({ id: initial?.id ?? uid(), date: todayISO(), kind: 'run', title: '', runType: 'ef', ...initial } as PlannedWorkout)
  const set = <K extends keyof PlannedWorkout>(k: K, v: PlannedWorkout[K]) => setD((x) => ({ ...x, [k]: v }))
  return (
    <FormShell
      title={editing ? 'Modifier la séance prévue' : 'Planifier une séance'}
      onSave={() => {
        upsert('planned', { ...d, title: d.title || (d.kind === 'run' && d.runType ? RUN_TYPES[d.runType].label : PLANNED_KIND_LABEL[d.kind]) })
        closeForm()
      }}
      onDelete={editing ? () => remove('planned', d.id) : undefined}
    >
      {d.steps && d.steps.length > 0 && (
        <div className="space-y-3 rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Déroulé prévu par ton plan COROS</p>
          <WorkoutSteps blocks={d.steps} />
          {d.notes && <WorkoutNotes text={d.notes} />}
        </div>
      )}
      <Row>
        <Field label="Date">
          <Input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={d.kind} onChange={(e) => set('kind', e.target.value as PlannedKind)}>
            {Object.entries(PLANNED_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </Row>
      {d.kind === 'run' && (
        <Field label="Type de course">
          <Select value={d.runType ?? 'ef'} onChange={(e) => set('runType', e.target.value as RunType)}>
            {RUN_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {RUN_TYPES[t].label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Intitulé">
        <Input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="ex. EF 45 min + 6 lignes droites" />
      </Field>
      <Row>
        <Field label="Distance prévue (km)">
          <NumberInput value={d.targetDistanceKm} onChange={(v) => set('targetDistanceKm', v)} />
        </Field>
        <Field label="Durée prévue (min)">
          <NumberInput value={d.targetDurationMin} onChange={(v) => set('targetDurationMin', v)} />
        </Field>
      </Row>
      <Field label="Détails">
        <Textarea value={d.description ?? ''} onChange={(e) => set('description', e.target.value || undefined)} placeholder="Échauffement, blocs, récupération…" />
      </Field>
    </FormShell>
  )
}

// ── Objectifs personnels ────────────────────────────────────
export function GoalsForm() {
  const { profile, setProfile } = useStore()
  const { closeForm, notify } = useUi()
  const [d, setD] = useState({
    mainGoal: profile.mainGoal,
    weeklyKmGoal: profile.weeklyKmGoal,
    weeklySessionsGoal: profile.weeklySessionsGoal,
    sleepGoalMin: profile.sleepGoalMin,
    efHrLimit: profile.efHrLimit,
  })
  return (
    <FormShell
      title="Mes objectifs"
      onSave={() => {
        setProfile(d)
        notify('Objectifs mis à jour 🎯')
        closeForm()
      }}
    >
      <Field label="Objectif principal" hint="Affiché dans ton profil, ex. « Finir la Backyard : 4 boucles »">
        <Input value={d.mainGoal ?? ''} onChange={(e) => setD({ ...d, mainGoal: e.target.value || undefined })} placeholder="ex. Semi sous 2 h" />
      </Field>
      <Row>
        <Field label="Kilomètres par semaine">
          <NumberInput value={d.weeklyKmGoal} onChange={(v) => setD({ ...d, weeklyKmGoal: v })} placeholder="ex. 30" />
        </Field>
        <Field label="Séances par semaine" hint="Course + renfo + muscu">
          <NumberInput value={d.weeklySessionsGoal} onChange={(v) => setD({ ...d, weeklySessionsGoal: v })} placeholder="ex. 5" />
        </Field>
      </Row>
      <Row>
        <Field label="Sommeil par nuit">
          <Select value={d.sleepGoalMin} onChange={(e) => setD({ ...d, sleepGoalMin: Number(e.target.value) })}>
            {Array.from({ length: 13 }, (_, i) => 390 + i * 15).map((m) => (
              <option key={m} value={m}>
                {Math.floor(m / 60)} h {String(m % 60).padStart(2, '0')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Limite FC en endurance" hint="Tes footings faciles restent sous cette FC">
          <NumberInput value={d.efHrLimit} onChange={(v) => setD({ ...d, efHrLimit: v })} placeholder="bpm" />
        </Field>
      </Row>
      <p className="text-xs text-ink-3">Pour changer ta course objectif (date, distance, temps ou nombre de boucles), utilise le bouton « Modifier » de la carte « Prochain objectif ».</p>
    </FormShell>
  )
}

// ── Tâche ménagère ─────────────────────────────────────────
export function ChoreForm({ initial }: { initial: ChoreEntry }) {
  const { upsert, remove } = useStore()
  const { closeForm } = useUi()
  const [d, setD] = useState<ChoreEntry>(initial)
  return (
    <FormShell
      title="Modifier la tâche"
      onSave={() => {
        upsert('chores', { ...d, name: d.name.trim() || initial.name })
        closeForm()
      }}
      onDelete={() => remove('chores', d.id)}
      canSave={!!d.name.trim()}
    >
      <Field label="Tâche">
        <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <Row>
        <Field label="Jour">
          <Input type="date" value={d.date} max={todayISO()} onChange={(e) => setD({ ...d, date: e.target.value || d.date })} />
        </Field>
        <Field label="Heure (optionnel)">
          <Input type="time" value={d.time ?? ''} onChange={(e) => setD({ ...d, time: e.target.value || undefined })} />
        </Field>
      </Row>
      <Field label="Note">
        <Textarea value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value || undefined })} placeholder="ex. salle de bain à fond" />
      </Field>
    </FormShell>
  )
}

// ── Hôte des formulaires ───────────────────────────────────
export function FormHost() {
  const form = useUi((s) => s.form)
  if (!form) return null
  const key = JSON.stringify(form.initial ?? {}).slice(0, 80) + form.kind
  const init = form.initial as never
  switch (form.kind) {
    case 'run':
      return <RunForm key={key} initial={init} />
    case 'renfo':
      return <RenfoForm key={key} initial={init} />
    case 'muscu':
      return <MuscuForm key={key} initial={init} />
    case 'sleep':
      return <SleepForm key={key} initial={init} />
    case 'race':
      return <RaceForm key={key} initial={init} />
    case 'record':
      return <RecordForm key={key} initial={init} />
    case 'shoe':
      return <ShoeForm key={key} initial={init} />
    case 'planned':
      return <PlannedForm key={key} initial={init} />
    case 'goals':
      return <GoalsForm key={key} />
    case 'food':
      return <FoodForm key={key} initial={init} />
    case 'foodEntry':
      return <FoodEntryForm key={key} initial={init} />
    case 'calories':
      return <CaloriesForm key={key} />
    case 'chore':
      return <ChoreForm key={key} initial={init} />
  }
}
