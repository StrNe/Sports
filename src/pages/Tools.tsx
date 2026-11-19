import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Calculator, Droplets, Gauge, HeartPulse, Repeat, Sparkles, Timer } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Callout, Card, CardTitle, Field, Input, NumberInput, PageHeader, Segmented, Select } from '../components/ui'
import { fmtDuration, fmtNum, fmtPace, parseDuration, parsePace, speedKmh, todayISO } from '../lib/format'
import { BACKYARD_LOOP_KM, STANDARD_DISTANCES, VMA_ZONES, bestVdot, karvonenZones, loopKmOf, paceAtVo2Pct, referencePerformances, riegel, timeFromVdot, trainingPaces, vdotFromPerformance } from '../lib/running'
import { nextGoalRace } from '../lib/insights'

type Tab = 'allure' | 'prediction' | 'zones' | 'ravito' | 'backyard'

function TimeInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="numeric" />
}

const PRESETS = [
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
  { label: 'Semi', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

// ── Calculateur d'allure ────────────────────────────────────
function PaceCalculator() {
  const [mode, setMode] = useState<'allure' | 'temps' | 'distance'>('allure')
  const [dist, setDist] = useState<number | undefined>(10)
  const [time, setTime] = useState('55:00')
  const [pace, setPace] = useState('5:30')

  const t = parseDuration(time)
  const p = parsePace(pace)
  let rDist = dist
  let rTime = t
  let rPace = p
  if (mode === 'allure' && dist && t) rPace = t / dist
  if (mode === 'temps' && dist && p) rTime = p * dist
  if (mode === 'distance' && t && p) rDist = t / p

  const splits = useMemo(() => {
    if (!rDist || !rPace) return []
    const step = rDist <= 12 ? 1 : 5
    const out: { km: number; t: number }[] = []
    for (let k = step; k < rDist; k += step) out.push({ km: k, t: k * rPace })
    out.push({ km: rDist, t: rDist * rPace })
    return out
  }, [rDist, rPace])

  return (
    <Card>
      <CardTitle icon={<Calculator size={16} />} title="Calculateur d’allure" subtitle="Choisis ce que tu veux calculer, renseigne les deux autres valeurs" />
      <Segmented
        className="mb-4"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'allure', label: 'Allure' },
          { value: 'temps', label: 'Temps' },
          { value: 'distance', label: 'Distance' },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Distance (km)">
          {mode === 'distance' ? <div className="field bg-surface-3 font-semibold">{rDist ? fmtNum(rDist, 2) : '—'}</div> : <NumberInput value={dist} onChange={setDist} />}
        </Field>
        <Field label="Temps">{mode === 'temps' ? <div className="field bg-surface-3 font-semibold tabular">{rTime ? fmtDuration(rTime) : '—'}</div> : <TimeInput value={time} onChange={setTime} placeholder="h:mm:ss" />}</Field>
        <Field label="Allure (min/km)">{mode === 'allure' ? <div className="field bg-surface-3 font-semibold tabular">{rPace ? fmtPace(rPace) : '—'}</div> : <TimeInput value={pace} onChange={setPace} placeholder="5:30" />}</Field>
      </div>
      {mode !== 'distance' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((x) => (
            <button key={x.label} type="button" onClick={() => setDist(x.km)} className={clsx('rounded-lg px-2.5 py-1 text-xs font-medium', dist === x.km ? 'bg-ink text-bg' : 'bg-surface-3 text-ink-2 hover:text-ink')}>
              {x.label}
            </button>
          ))}
        </div>
      )}
      {rPace && (
        <p className="mt-4 text-sm text-ink-2">
          Vitesse : <span className="font-semibold text-ink">{fmtNum(speedKmh(rPace), 1)} km/h</span>
        </p>
      )}
      {splits.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Temps de passage</p>
          <div className="grid grid-cols-3 gap-1.5 text-sm sm:grid-cols-5">
            {splits.map((s) => (
              <div key={s.km} className="rounded-lg bg-surface-2 px-2.5 py-1.5">
                <p className="text-[11px] text-ink-3">km {fmtNum(s.km, 1)}</p>
                <p className="font-semibold tabular">{fmtDuration(s.t)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Prédiction & VDOT ───────────────────────────────────────
function Predictor() {
  const { runs, races, records } = useStore()
  const best = bestVdot(referencePerformances(runs, races, records))
  const [dist, setDist] = useState<number | undefined>(best?.perf.distanceKm ? Math.round(best.perf.distanceKm * 1000) / 1000 : 5)
  const [time, setTime] = useState(best ? fmtDuration(best.perf.timeSec) : '25:00')
  const t = parseDuration(time)
  const vdot = dist && t ? vdotFromPerformance(dist, t) : undefined
  const paces = vdot ? trainingPaces(vdot) : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle icon={<Sparkles size={16} />} accent="race" title="Prédiction de performances" subtitle="À partir d’une course ou d’un test récent" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Distance de référence (km)">
            <NumberInput value={dist} onChange={setDist} />
          </Field>
          <Field label="Temps réalisé">
            <TimeInput value={time} onChange={setTime} placeholder="25:00" />
          </Field>
        </div>
        {best && <p className="mt-2 text-xs text-ink-3">Pré-rempli avec ta meilleure performance récente : {best.perf.source}.</p>}
        {vdot && t && dist ? (
          <>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th className="pb-2 font-medium">Distance</th>
                  <th className="pb-2 text-right font-medium">Riegel</th>
                  <th className="pb-2 text-right font-medium">VDOT</th>
                  <th className="pb-2 text-right font-medium">Allure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {STANDARD_DISTANCES.map((s) => {
                  const r = riegel(t, dist, s.km)
                  const v = timeFromVdot(vdot, s.km)
                  return (
                    <tr key={s.key}>
                      <td className="py-2">{s.label}</td>
                      <td className="py-2 text-right font-semibold tabular">{fmtDuration(r)}</td>
                      <td className="py-2 text-right tabular text-ink-2">{fmtDuration(v)}</td>
                      <td className="py-2 text-right tabular text-ink-2">{fmtPace(r / s.km)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-ink-3">Les prédictions supposent un entraînement adapté à la distance : sur semi et marathon, l’endurance compte autant que la vitesse.</p>
          </>
        ) : null}
      </Card>

      <Card>
        <CardTitle icon={<Gauge size={16} />} accent="run" title="Tes allures d’entraînement" subtitle={vdot ? `VDOT ${fmtNum(vdot, 1)} (méthode Jack Daniels)` : 'Renseigne une performance'} />
        {paces && (
          <div className="space-y-2">
            {[
              { k: 'E', label: 'Endurance (footing, sortie longue)', v: `${fmtPace(paces.easy[0])} – ${fmtPace(paces.easy[1])}`, d: '70–80 % de ton volume' },
              { k: 'M', label: 'Allure marathon', v: fmtPace(paces.marathon), d: 'Blocs longs en fin de sortie longue' },
              { k: 'T', label: 'Seuil', v: fmtPace(paces.threshold), d: '3 × 8 min, 20 min continu' },
              { k: 'I', label: 'Intervalles (VO2max)', v: fmtPace(paces.interval), d: '5 × 1000 m, 6 × 3 min' },
              { k: 'R', label: 'Répétitions (vitesse)', v: fmtPace(paces.repetition), d: '8 × 200 m, 6 × 400 m' },
            ].map((z) => (
              <div key={z.k} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-run/12 text-sm font-bold text-run">{z.k}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{z.label}</p>
                  <p className="text-xs text-ink-3">{z.d}</p>
                </div>
                <span className="text-sm font-semibold tabular">{z.v} /km</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Zones ───────────────────────────────────────────────────
function Zones() {
  const { profile, runs, races, records } = useStore()
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : 30
  const [hrMax, setHrMax] = useState<number | undefined>(profile.hrMax ?? Math.round(208 - 0.7 * age))
  const [hrRest, setHrRest] = useState<number | undefined>(profile.hrRest ?? 60)
  const best = bestVdot(referencePerformances(runs, races, records))
  const estVma = best ? Math.round(speedKmh(paceAtVo2Pct(best.vdot, 1)) * 10) / 10 : undefined
  const [vma, setVma] = useState<number | undefined>(profile.vma ?? estVma ?? 14)
  const zones = hrMax && hrRest ? karvonenZones(hrMax, hrRest) : []
  const colors = ['var(--sleep)', 'var(--renfo)', 'var(--food)', 'var(--run)', 'var(--race)']

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle icon={<HeartPulse size={16} />} accent="race" title="Zones cardiaques" subtitle="Méthode de Karvonen (FC de réserve)" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="FC max" hint={!profile.hrMax ? `Estimée (208 − 0,7 × âge)` : undefined}>
            <NumberInput value={hrMax} onChange={setHrMax} />
          </Field>
          <Field label="FC de repos">
            <NumberInput value={hrRest} onChange={setHrRest} />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          {zones.map((z, i) => (
            <div key={z.name} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: colors[i] }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {z.name} · {z.label}
                </p>
                <p className="text-xs text-ink-3">{z.desc}</p>
              </div>
              <span className="text-sm font-semibold tabular">
                {z.min}–{z.max}
              </span>
            </div>
          ))}
        </div>
        {profile.efHrLimit && <p className="mt-3 text-xs text-ink-3">Ta limite d’endurance fondamentale (profil) : {profile.efHrLimit} bpm.</p>}
      </Card>
      <Card>
        <CardTitle icon={<Gauge size={16} />} accent="run" title="Allures selon ta VMA" subtitle="Vitesse maximale aérobie" />
        <Field label="VMA (km/h)" hint={!profile.vma && estVma ? `Estimée à partir de ${best?.perf.source}` : 'Mesurée lors d’un test (demi-Cooper, VAMEVAL…)'}>
          <NumberInput value={vma} onChange={setVma} />
        </Field>
        {vma ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th className="pb-2 font-medium">Zone</th>
                <th className="pb-2 text-right font-medium">% VMA</th>
                <th className="pb-2 text-right font-medium">Allure /km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {VMA_ZONES.map((z) => (
                <tr key={z.label}>
                  <td className="py-2">
                    {z.label}
                    <span className="block text-xs text-ink-3">{z.use}</span>
                  </td>
                  <td className="py-2 text-right tabular text-ink-2">
                    {z.pctMin}–{z.pctMax} %
                  </td>
                  <td className="py-2 text-right font-semibold tabular">
                    {fmtPace(3600 / ((vma * z.pctMax) / 100))} – {fmtPace(3600 / ((vma * z.pctMin) / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Card>
    </div>
  )
}

// ── Ravitaillement ──────────────────────────────────────────
function Fueling() {
  const [duration, setDuration] = useState('2:30')
  const [heat, setHeat] = useState<'frais' | 'tempere' | 'chaud'>('tempere')
  const [gutTrained, setGutTrained] = useState<'non' | 'oui'>('non')
  const sec = parseDuration(duration.includes(':') && duration.split(':').length === 2 ? duration + ':00' : duration) ?? 0
  const hours = sec / 3600
  const carbsPerH = hours < 1.25 ? 0 : hours < 2.5 ? (gutTrained === 'oui' ? 60 : 45) : gutTrained === 'oui' ? 80 : 60
  const waterPerH = heat === 'frais' ? 400 : heat === 'tempere' ? 550 : 750
  const sodiumPerH = heat === 'chaud' ? 700 : 450
  const effectiveHours = Math.max(0, hours - 0.25)
  const totalCarbs = Math.round(carbsPerH * effectiveHours)
  const gels = Math.ceil(totalCarbs / 25)

  return (
    <Card>
      <CardTitle icon={<Droplets size={16} />} accent="food" title="Plan de ravitaillement" subtitle="Glucides, eau et sel pendant l’effort" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Durée estimée (h:mm)">
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="2:30" />
        </Field>
        <Field label="Conditions">
          <Select value={heat} onChange={(e) => setHeat(e.target.value as typeof heat)}>
            <option value="frais">Frais (&lt; 12 °C)</option>
            <option value="tempere">Tempéré</option>
            <option value="chaud">Chaud (&gt; 22 °C)</option>
          </Select>
        </Field>
        <Field label="Estomac entraîné ?">
          <Select value={gutTrained} onChange={(e) => setGutTrained(e.target.value as typeof gutTrained)}>
            <option value="non">Pas encore</option>
            <option value="oui">Oui, je teste à l’entraînement</option>
          </Select>
        </Field>
      </div>
      {hours > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { l: 'Glucides / h', v: carbsPerH ? `${carbsPerH} g` : 'Inutile' },
              { l: 'Total glucides', v: `${totalCarbs} g`, s: totalCarbs ? `≈ ${gels} gels de 25 g` : undefined },
              { l: 'Eau / h', v: `${waterPerH} ml`, s: `${fmtNum((waterPerH * hours) / 1000, 1)} L au total` },
              { l: 'Sodium / h', v: `${sodiumPerH} mg`, s: 'Pastilles ou boisson iso' },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-surface-2 p-3">
                <p className="text-xs text-ink-3">{x.l}</p>
                <p className="mt-0.5 font-semibold">{x.v}</p>
                {x.s && <p className="text-xs text-ink-3">{x.s}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Callout icon="⏱️" title="En pratique">
              {carbsPerH === 0
                ? 'Moins d’1 h 15 d’effort : de l’eau suffit si tu as bien mangé avant. Un gel peut aider sur la fin d’une course rapide.'
                : `Commence à 20–30 min, puis toutes les 20 min : ≈ ${Math.round(carbsPerH / 3)} g de glucides (½ à 1 gel, une compote, quelques pâtes de fruits) avec 150–200 ml d’eau. Ne bois pas plus que ta soif.`}
            </Callout>
          </div>
        </>
      )}
    </Card>
  )
}

// ── Backyard ────────────────────────────────────────────────
function BackyardPlanner() {
  const { races } = useStore()
  const race = nextGoalRace(races.filter((r) => r.kind === 'backyard'))
  const [loops, setLoops] = useState<number | undefined>(race?.goalLoops ?? 4)
  const [loopKmIn, setLoopKm] = useState<number | undefined>(race ? loopKmOf(race) : BACKYARD_LOOP_KM)
  const loopKm = loopKmIn && loopKmIn > 0 ? loopKmIn : BACKYARD_LOOP_KM
  const [runPace, setRunPace] = useState('7:30')
  const [walkPace, setWalkPace] = useState('11:00')
  const [runMin, setRunMin] = useState<number | undefined>(9)
  const [walkMin, setWalkMin] = useState<number | undefined>(1)
  const [start, setStart] = useState('09:00')

  const rp = parsePace(runPace)
  const wp = parsePace(walkPace)
  const r = runMin ?? 0
  const w = walkMin ?? 0
  const avgSpeed = rp && wp && r + w > 0 ? (r * (60 / rp) + w * (60 / wp)) / (r + w) : undefined // km/min
  const loopSec = avgSpeed ? (loopKm / avgSpeed) * 60 : undefined
  const restSec = loopSec ? 3600 - loopSec : undefined
  const [sh, sm] = start.split(':').map(Number)

  return (
    <Card>
      <CardTitle icon={<Repeat size={16} />} accent="race" title="Planificateur Backyard" subtitle="Une boucle toutes les heures, jusqu’au dernier debout" />
      {race && (
        <p className="-mt-2 mb-3 text-xs text-ink-3">
          Pré-rempli avec ta course : {race.name} ({race.goalLoops} boucles visées, {fmtNum((race.goalLoops ?? 0) * loopKmOf(race), 1)} km).
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Boucles visées">
          <NumberInput value={loops} onChange={setLoops} min={1} />
        </Field>
        <Field label="Longueur de boucle (km)">
          <NumberInput value={loopKmIn} onChange={setLoopKm} />
        </Field>
        <Field label="Allure de course">
          <Input value={runPace} onChange={(e) => setRunPace(e.target.value)} placeholder="7:30" />
        </Field>
        <Field label="Allure de marche">
          <Input value={walkPace} onChange={(e) => setWalkPace(e.target.value)} placeholder="11:00" />
        </Field>
        <Field label="Minutes de course">
          <NumberInput value={runMin} onChange={setRunMin} />
        </Field>
        <Field label="Minutes de marche">
          <NumberInput value={walkMin} onChange={setWalkMin} />
        </Field>
        <Field label="Heure de départ">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
      </div>

      {loopSec && restSec != null && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-ink-3">Temps par boucle</p>
              <p className="mt-0.5 text-lg font-semibold tabular">{fmtDuration(loopSec)}</p>
            </div>
            <div className={clsx('rounded-xl p-3', restSec < 5 * 60 ? 'bg-critical/10' : restSec < 10 * 60 ? 'bg-warn/15' : 'bg-good/10')}>
              <p className="text-xs text-ink-3">Repos par boucle</p>
              <p className="mt-0.5 text-lg font-semibold tabular">{restSec > 0 ? fmtDuration(restSec) : 'Hors délai !'}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-ink-3">Distance totale</p>
              <p className="mt-0.5 text-lg font-semibold tabular">{fmtNum((loops ?? 0) * loopKm, 1)} km</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-3">Allure moyenne marche comprise : {fmtPace(60 / avgSpeed!)} /km. Idéal : 8 à 12 min de marge pour manger, boire et t’asseoir 2 minutes.</p>

          {loops && loops <= 30 && (
            <div className="mt-4 overflow-x-auto scroll-thin">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th className="pb-2 font-medium">Boucle</th>
                    <th className="pb-2 font-medium">Départ</th>
                    <th className="pb-2 font-medium">Arrivée</th>
                    <th className="pb-2 text-right font-medium">Cumul</th>
                    <th className="pb-2 text-right font-medium">À faire pendant la pause</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Array.from({ length: loops }, (_, i) => {
                    const startMin = (sh || 0) * 60 + (sm || 0) + i * 60
                    const endMin = startMin + loopSec / 60
                    const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`
                    const todo = i === loops - 1 ? 'Dernière ! Tout donner 🎉' : i % 2 === 0 ? 'Boire 300 ml + 1 gel ou compote' : 'Boire 300 ml + salé (chips, bouillon) + pâte de fruits'
                    return (
                      <tr key={i}>
                        <td className="py-2 font-medium">{i + 1}</td>
                        <td className="py-2 tabular">{fmt(startMin)}</td>
                        <td className="py-2 tabular text-ink-2">{fmt(endMin)}</td>
                        <td className="py-2 text-right tabular">{fmtNum((i + 1) * loopKm, 1)} km</td>
                        <td className="py-2 text-right text-xs text-ink-2">{todo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Callout icon="🐢" title="Pars (très) lentement">
              En Backyard, la vitesse ne sert à rien : finir chaque boucle en 45–50 min suffit. Marche dès le début dans les montées.
            </Callout>
            <Callout icon="🎒" title="Ta base de vie">
              Chaise, vêtements de rechange, frontale, crème anti-frottement, nourriture salée et sucrée, une liste des tâches par pause.
            </Callout>
          </div>
        </>
      )}
    </Card>
  )
}

export default function Tools() {
  const { races } = useStore()
  const hasBackyard = races.some((r) => r.kind === 'backyard' && r.date >= todayISO())
  const [tab, setTab] = useState<Tab>(hasBackyard ? 'backyard' : 'allure')
  const tabs: { value: Tab; label: string }[] = [
    { value: 'allure', label: 'Allure' },
    { value: 'prediction', label: 'Prédictions' },
    { value: 'zones', label: 'Zones' },
    { value: 'ravito', label: 'Ravitaillement' },
    { value: 'backyard', label: 'Backyard' },
  ]
  return (
    <div>
      <PageHeader title="Outils coureur" subtitle="Calculs d’allure, prédictions, zones d’entraînement et stratégie de course" icon={<Timer size={22} />} />
      <Segmented className="mb-5 !flex w-full flex-wrap sm:!inline-flex sm:w-auto" value={tab} onChange={setTab} options={tabs} />
      {tab === 'allure' && <PaceCalculator />}
      {tab === 'prediction' && <Predictor />}
      {tab === 'zones' && <Zones />}
      {tab === 'ravito' && <Fueling />}
      {tab === 'backyard' && <BackyardPlanner />}
    </div>
  )
}
