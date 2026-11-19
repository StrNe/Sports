import { useMemo, useState } from 'react'
import { Activity, CalendarRange, FileUp, Footprints, HeartPulse, Mountain, Plus, Route } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { Button, Callout, Card, CardTitle, EmptyState, Meter, PageHeader, Segmented, Select, Stat } from '../components/ui'
import { ActivityGrid, SegmentedBar, SimpleBarChart, TrendChart } from '../components/charts'
import { TrainingTabs, useActivityImport } from '../components/layout'
import { RunRow } from '../components/activity'
import { addDaysISO, capitalize, fmtDate, fmtDuration, fmtDurationShort, fmtKm, fmtNum, fmtPace, sum, todayISO, weekStartISO } from '../lib/format'
import { RUN_TYPES, RUN_TYPE_ORDER, intensitySplit, longestRun, metersPerBeat, runsInRange, shoeKm, volumeIncrease, weeklyRunSummary } from '../lib/running'
import type { RunType } from '../types'

export default function Running() {
  const { runs, shoes, profile } = useStore()
  const openForm = useUi((s) => s.openForm)
  const imp = useActivityImport()
  const today = todayISO()
  const [metric, setMetric] = useState<'km' | 'temps'>('km')
  const [filter, setFilter] = useState<RunType | 'all'>('all')
  const [limit, setLimit] = useState(25)

  const weeks = useMemo(() => weeklyRunSummary(runs, 12), [runs])
  const thisWeek = weeks[weeks.length - 1]
  const monthStart = today.slice(0, 8) + '01'
  const monthRuns = runsInRange(runs, monthStart, today)
  const avg4 = sum(weeks.slice(-5, -1), (w) => w.km) / 4
  const longest = longestRun(runs)
  const inc = volumeIncrease(weeks)

  const last28 = runsInRange(runs, addDaysISO(today, -27), today)
  const split = intensitySplit(last28, profile.efHrLimit)

  const efficiency = useMemo(
    () =>
      runs
        .filter((r) => RUN_TYPES[r.type].intensity === 'facile' && r.type !== 'tapis' && r.type !== 'marche_course' && r.durationSec >= 15 * 60 && metersPerBeat(r))
        .slice(0, 24)
        .reverse()
        .map((r) => ({ label: fmtDate(r.date, 'd MMM'), value: Math.round(metersPerBeat(r)! * 100) / 100, tooltipLabel: `${fmtDate(r.date)} · ${r.title || RUN_TYPES[r.type].label}`, pace: fmtPace(r.durationSec / r.distanceKm), hr: r.avgHr })),
    [runs],
  )

  // Régularité : 20 semaines
  const gridWeeks = 20
  const gridStart = addDaysISO(weekStartISO(today), -7 * (gridWeeks - 1))
  const kmByDay = useMemo(() => {
    const m = new Map<string, number>()
    runs.forEach((r) => m.set(r.date, (m.get(r.date) ?? 0) + r.distanceKm))
    return m
  }, [runs])
  const cells = Array.from({ length: gridWeeks * 7 }, (_, i) => {
    const date = addDaysISO(gridStart, i)
    const km = kmByDay.get(date) ?? 0
    const level = date > today ? 0 : km === 0 ? 0 : km < 6 ? 1 : km < 12 ? 2 : 3
    return { date, level, title: `${fmtDate(date)} : ${km ? fmtKm(km) + ' km' : 'repos'}` }
  })
  const activeDays = cells.filter((c) => c.level > 0).length

  const filtered = filter === 'all' ? runs : runs.filter((r) => r.type === filter)
  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; km: number; items: typeof runs }[] = []
    for (const r of filtered.slice(0, limit)) {
      const key = r.date.slice(0, 7)
      let g = groups.find((x) => x.key === key)
      if (!g) {
        g = { key, label: capitalize(fmtDate(key + '-01', 'MMMM yyyy')), km: sum(filtered.filter((x) => x.date.startsWith(key)), (x) => x.distanceKm), items: [] }
        groups.push(g)
      }
      g.items.push(r)
    }
    return groups
  }, [filtered, limit])

  const activeShoes = shoes.filter((s) => !s.retired)

  return (
    <div>
      {imp.input}
      <PageHeader
        title="Course à pied"
        subtitle="Volume, intensité, efficacité et historique de tes sorties"
        icon={<Footprints size={22} />}
        accent="run"
        actions={
          <>
            <Button icon={<FileUp size={16} />} onClick={imp.open}>
              Importer
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => openForm('run')}>
              Ajouter
            </Button>
          </>
        }
      />
      <TrainingTabs />

      {!runs.length ? (
        <EmptyState
          icon={<Footprints size={22} />}
          title="Aucune sortie enregistrée"
          text="Ajoute ta première course à la main ou importe des fichiers .fit / .gpx exportés depuis l’application de ta montre."
          action={
            <div className="flex gap-2">
              <Button icon={<FileUp size={16} />} onClick={imp.open}>
                Importer
              </Button>
              <Button variant="primary" onClick={() => openForm('run')}>
                Ajouter une course
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Cette semaine" icon={<Footprints size={15} />} accent="run" value={fmtKm(thisWeek.km)} unit="km" sub={`${thisWeek.runs} sortie${thisWeek.runs > 1 ? 's' : ''} · ${fmtDurationShort(thisWeek.durationSec)}`} />
            <Stat label="Ce mois-ci" icon={<CalendarRange size={15} />} accent="run" value={fmtKm(sum(monthRuns, (r) => r.distanceKm))} unit="km" sub={`${monthRuns.length} sorties · D+ ${fmtNum(sum(monthRuns, (r) => r.elevationM ?? 0))} m`} />
            <Stat label="Moyenne 4 sem." icon={<Activity size={15} />} accent="run" value={fmtKm(avg4)} unit="km/sem" sub="4 dernières semaines complètes" />
            <Stat label="Plus longue sortie" icon={<Route size={15} />} accent="run" value={fmtKm(longest?.distanceKm)} unit="km" sub={longest ? `${fmtDate(longest.date, 'd MMM yyyy')} · ${fmtDuration(longest.durationSec)}` : undefined} />
          </div>

          {inc != null && inc > 15 && (
            <div className="mt-4">
              <Callout tone="warning" icon="⚠️" title="Hausse de volume rapide">
                Ta semaine dépasse de {Math.round(inc)} % ta moyenne des 3 précédentes. Au-delà de 10–15 %, le risque de blessure augmente : garde les prochaines sorties faciles.
              </Callout>
            </div>
          )}

          <Card className="mt-4">
            <CardTitle
              icon={<Footprints size={16} />}
              accent="run"
              title={metric === 'km' ? 'Kilomètres par semaine' : 'Temps de course par semaine'}
              subtitle="12 dernières semaines"
              action={<Segmented size="sm" value={metric} onChange={setMetric} options={[{ value: 'km', label: 'Km' }, { value: 'temps', label: 'Durée' }]} />}
            />
            <SimpleBarChart
              ariaLabel="Volume hebdomadaire de course"
              data={weeks.map((w) => ({
                label: w.label,
                value: metric === 'km' ? Math.round(w.km * 10) / 10 : Math.round(w.durationSec / 60),
                tooltipLabel: `Semaine du ${w.label}`,
                sub: `${w.runs} sortie${w.runs > 1 ? 's' : ''}`,
              }))}
              color="var(--run)"
              height={220}
              goal={metric === 'km' ? profile.weeklyKmGoal : undefined}
              tickFormat={metric === 'temps' ? (v) => `${Math.round(v / 60)} h` : undefined}
              format={(v, row) => (
                <>
                  {metric === 'km' ? `${fmtKm(v)} km` : fmtDurationShort(v * 60)} <span className="font-normal text-ink-3">· {String(row.sub)}</span>
                </>
              )}
            />
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle icon={<HeartPulse size={16} />} accent="run" title="Répartition des intensités" subtitle="28 derniers jours · objectif 80 % facile" />
              {split ? (
                <>
                  <SegmentedBar
                    parts={[
                      { label: 'Facile', value: split.easySec, color: 'var(--sleep)', display: fmtDurationShort(split.easySec) },
                      { label: 'Intense', value: split.hardSec, color: 'var(--run)', display: fmtDurationShort(split.hardSec) },
                    ]}
                  />
                  <p className="mt-3 text-sm text-ink-2">
                    {split.easyPct >= 75
                      ? '✅ Belle polarisation : la majorité de ton volume est en endurance, c’est ce qui construit le moteur aérobie.'
                      : `⚠️ Seulement ${Math.round(split.easyPct)} % en facile. Ralentis tes footings pour mieux récupérer et progresser.`}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    {split.basis === 'fc' ? `Calcul basé sur ta FC moyenne (facile si ≤ ${profile.efHrLimit} bpm).` : 'Calcul basé sur le type de séance. Renseigne ta limite de FC d’endurance dans ton profil pour un calcul plus juste.'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-2">Pas de sortie ces 28 derniers jours.</p>
              )}
            </Card>

            <Card>
              <CardTitle icon={<Mountain size={16} />} accent="run" title="Régularité" subtitle={`${activeDays} jours de course sur ${gridWeeks} semaines`} />
              <div className="flex gap-2">
                <div className="grid grid-rows-7 gap-[3px] pt-px text-[9px] leading-none text-ink-3">
                  {['L', '', 'M', '', 'V', '', 'D'].map((d, i) => (
                    <span key={i} className="flex items-center">
                      {d}
                    </span>
                  ))}
                </div>
                <ActivityGrid weeks={gridWeeks} cells={cells} className="flex-1" />
              </div>
              <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink-3">
                Repos
                {['var(--surface-3)', 'color-mix(in oklab, var(--run) 35%, var(--surface-3))', 'color-mix(in oklab, var(--run) 65%, var(--surface-3))', 'var(--run)'].map((c) => (
                  <span key={c} className="size-2.5 rounded-[3px]" style={{ background: c }} />
                ))}
                12 km +
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <CardTitle icon={<HeartPulse size={16} />} accent="run" title="Efficacité aérobie" subtitle="Mètres parcourus par battement cardiaque sur tes sorties faciles — plus c’est haut, mieux c’est" />
            {efficiency.length >= 3 ? (
              <TrendChart
                ariaLabel="Efficacité aérobie"
                data={efficiency}
                color="var(--run)"
                format={(v, row) => (
                  <>
                    {fmtNum(v, 2)} m/batt. <span className="font-normal text-ink-3">· {String(row.pace)} /km à {String(row.hr)} bpm</span>
                  </>
                )}
                tickFormat={(v) => fmtNum(v, 2)}
              />
            ) : (
              <p className="text-sm text-ink-2">Enregistre au moins 3 sorties faciles avec ta FC moyenne pour suivre l’évolution de ton endurance : à FC égale, tu iras de plus en plus vite.</p>
            )}
          </Card>

          <Card className="mt-4">
            <CardTitle
              title="Mes chaussures"
              subtitle="Kilométrage cumulé · à changer vers 600–800 km"
              icon={<Footprints size={16} />}
              accent="run"
              action={
                <Button size="sm" icon={<Plus size={15} />} onClick={() => openForm('shoe')}>
                  Paire
                </Button>
              }
            />
            {activeShoes.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeShoes.map((s) => {
                  const km = shoeKm(s.id, s.startKm, runs)
                  const pct = km / s.limitKm
                  return (
                    <button key={s.id} type="button" onClick={() => openForm('shoe', s)} className="rounded-xl bg-surface-2 p-3 text-left transition hover:bg-surface-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{s.name}</span>
                        <span className="text-sm font-semibold tabular">
                          {fmtNum(km)} <span className="text-xs font-normal text-ink-3">/ {s.limitKm} km</span>
                        </span>
                      </div>
                      <Meter className="mt-2" value={km} max={s.limitKm} accent={pct > 0.9 ? 'race' : 'run'} label={s.name} />
                      {pct > 0.9 && <p className="mt-1.5 text-xs text-critical">Fin de vie proche : prévois une nouvelle paire.</p>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-2">Ajoute tes paires pour suivre leur usure : le kilométrage se calcule tout seul à chaque sortie.</p>
            )}
          </Card>

          <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Historique</h2>
            <Select className="!w-auto !py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as RunType | 'all')}>
              <option value="all">Tous les types</option>
              {RUN_TYPE_ORDER.filter((t) => runs.some((r) => r.type === t)).map((t) => (
                <option key={t} value={t}>
                  {RUN_TYPES[t].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-4">
            {byMonth.map((g) => (
              <Card key={g.key} className="!p-3 sm:!p-4">
                <div className="mb-1 flex items-baseline justify-between px-2">
                  <h3 className="text-sm font-semibold">{g.label}</h3>
                  <span className="text-xs text-ink-3">{fmtKm(g.km)} km</span>
                </div>
                <div className="divide-y divide-line">
                  {g.items.map((r) => (
                    <RunRow key={r.id} run={r} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
          {filtered.length > limit && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setLimit((l) => l + 25)}>Afficher plus</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
