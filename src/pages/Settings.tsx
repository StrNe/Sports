import { useRef, useState, type ReactNode } from 'react'
import { Database, Download, FileUp, HeartPulse, Moon, Palette, Smartphone, Trash2, Upload, User, Utensils } from 'lucide-react'
import { useStore, useUi, snapshot } from '../store/useStore'
import { Button, Callout, Card, CardTitle, Field, Input, NumberInput, PageHeader, Segmented, Select } from '../components/ui'
import { useActivityImport } from '../components/layout'
import { SyncSettingsCard } from '../components/sync'
import { downloadJson, readBackup } from '../lib/importers'
import { fmtPace, parsePace, todayISO } from '../lib/format'
import { DIET_LABEL } from '../lib/nutrition'
import { demoData } from '../data/demo'
import type { Diet, Theme } from '../types'

function Section({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <CardTitle icon={icon} title={title} subtitle={subtitle} />
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

export default function Settings() {
  const s = useStore()
  const { profile, setProfile, theme, setTheme } = s
  const notify = useUi((x) => x.notify)
  const ask = useUi((x) => x.ask)
  const cloudState = useUi((x) => x.cloud.state)
  const imp = useActivityImport()
  const backupRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'fusion' | 'remplacer'>('fusion')
  const [threshold, setThreshold] = useState(profile.thresholdPaceSec ? fmtPace(profile.thresholdPaceSec) : '')
  const counts = [
    ['séances de course', s.runs.length],
    ['séances de renfo', s.renfo.length],
    ['séances de muscu', s.muscu.length],
    ['nuits', s.sleep.length],
    ['courses', s.races.length],
    ['séances planifiées', s.planned.length],
  ] as const

  return (
    <div>
      {imp.input}
      <input
        ref={backupRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try {
            const data = await readBackup(f)
            if (importMode === 'remplacer') {
              if (!(await ask({ title: 'Remplacer toutes tes données ?', text: 'Les données actuelles seront remplacées par celles du fichier.', confirmLabel: 'Remplacer', danger: true }))) return
              s.replaceAll(data as never)
              notify('Sauvegarde restaurée ✅')
            } else {
              const { added } = s.mergeAll(data)
              notify(added ? `${added} nouvel${added > 1 ? 's' : ''} élément${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} ✅` : 'Tout est déjà à jour ✅')
            }
          } catch (err) {
            notify(`Import impossible : ${(err as Error).message}`, 'error')
          } finally {
            e.target.value = ''
          }
        }}
      />
      <PageHeader title="Profil & données" subtitle="Ces informations personnalisent tes zones, tes prédictions et tes repas" icon={<User size={22} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={<User size={16} />} title="Mon profil">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <Input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
            </Field>
            <Field label="Sexe">
              <Select value={profile.sex ?? ''} onChange={(e) => setProfile({ sex: (e.target.value || undefined) as 'M' | 'F' | undefined })}>
                <option value="">—</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </Select>
            </Field>
            <Field label="Année de naissance">
              <NumberInput value={profile.birthYear} onChange={(v) => setProfile({ birthYear: v })} />
            </Field>
            <Field label="Taille (cm)">
              <NumberInput value={profile.heightCm} onChange={(v) => setProfile({ heightCm: v })} />
            </Field>
            <Field label="Poids (kg)" hint="Sert aux besoins nutritionnels">
              <NumberInput value={profile.weightKg} onChange={(v) => setProfile({ weightKg: v })} />
            </Field>
            <Field label="Objectif principal">
              <Input value={profile.mainGoal ?? ''} placeholder="ex. Finir la Backyard" onChange={(e) => setProfile({ mainGoal: e.target.value || undefined })} />
            </Field>
          </div>
        </Section>

        <Section icon={<HeartPulse size={16} />} title="Course à pied" subtitle="Utilisé pour les zones, l’analyse 80/20 et la forme du jour">
          <div className="grid grid-cols-2 gap-3">
            <Field label="FC max (bpm)">
              <NumberInput value={profile.hrMax} onChange={(v) => setProfile({ hrMax: v })} />
            </Field>
            <Field label="FC de repos (bpm)">
              <NumberInput value={profile.hrRest} onChange={(v) => setProfile({ hrRest: v })} />
            </Field>
            <Field label="Limite FC endurance" hint="FC max de tes footings faciles">
              <NumberInput value={profile.efHrLimit} onChange={(v) => setProfile({ efHrLimit: v })} />
            </Field>
            <Field label="VMA (km/h)">
              <NumberInput value={profile.vma} onChange={(v) => setProfile({ vma: v })} />
            </Field>
            <Field label="Allure seuil (/km)">
              <Input
                value={threshold}
                placeholder="5:34"
                onChange={(e) => {
                  setThreshold(e.target.value)
                  setProfile({ thresholdPaceSec: parsePace(e.target.value) })
                }}
              />
            </Field>
            <Field label="Objectif km / semaine">
              <NumberInput value={profile.weeklyKmGoal} onChange={(v) => setProfile({ weeklyKmGoal: v })} />
            </Field>
            <Field label="Séances / semaine" hint="Course + renfo + muscu">
              <NumberInput value={profile.weeklySessionsGoal} onChange={(v) => setProfile({ weeklySessionsGoal: v })} />
            </Field>
          </div>
        </Section>

        <Section icon={<Moon size={16} />} title="Sommeil">
          <Field label="Objectif de sommeil par nuit">
            <Select value={profile.sleepGoalMin} onChange={(e) => setProfile({ sleepGoalMin: Number(e.target.value) })}>
              {Array.from({ length: 11 }, (_, i) => 420 + i * 15).map((m) => (
                <option key={m} value={m}>
                  {Math.floor(m / 60)} h {String(m % 60).padStart(2, '0')}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section icon={<Utensils size={16} />} title="Alimentation">
          <Field label="Régime">
            <Select value={profile.diet} onChange={(e) => setProfile({ diet: e.target.value as Diet })}>
              {Object.entries(DIET_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={!!profile.noGluten} onChange={(e) => setProfile({ noGluten: e.target.checked })} />
              Sans gluten
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={!!profile.noLactose} onChange={(e) => setProfile({ noLactose: e.target.checked })} />
              Sans lactose
            </label>
          </div>
        </Section>

        <Section icon={<Palette size={16} />} title="Apparence">
          <Segmented
            value={theme}
            onChange={(t: Theme) => setTheme(t)}
            options={[
              { value: 'system', label: 'Automatique' },
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
            ]}
          />
        </Section>

        <Section icon={<Smartphone size={16} />} title="Installer sur ton téléphone">
          <p className="text-sm text-ink-2">
            Foulée fonctionne comme une application : sur iPhone, ouvre-la dans Safari puis <b>Partager → Sur l’écran d’accueil</b>. Sur Android, dans Chrome : <b>⋮ → Installer l’application</b>. Elle marche aussi hors connexion.
          </p>
        </Section>
      </div>

      <div className="mt-4">
        <SyncSettingsCard />
      </div>

      <div className="mt-4">
        <Section icon={<Database size={16} />} title="Mes données" subtitle="Sauvegarde, import et réinitialisation">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {counts.map(([label, n]) => (
              <div key={label} className="rounded-xl bg-surface-2 p-3">
                <p className="text-lg font-semibold">{n}</p>
                <p className="text-xs text-ink-3">{label}</p>
              </div>
            ))}
          </div>
          {cloudState !== 'saved' && (
            <Callout icon="💾" title="Pense à exporter régulièrement">
              Ici, tes données restent dans ce navigateur. Exporte une sauvegarde de temps en temps (ou pour passer de l’ordinateur au téléphone) et réimporte-la de l’autre côté.
            </Callout>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<Download size={16} />} onClick={async () => {
                const r = await downloadJson(snapshot(), `foulee-sauvegarde-${todayISO()}.json`)
                if (r === 'error') notify('Le téléchargement a échoué', 'error')
              }}>
              Exporter une sauvegarde
            </Button>
            <div className="flex items-center gap-2">
              <Button icon={<Upload size={16} />} onClick={() => backupRef.current?.click()}>
                Importer une sauvegarde
              </Button>
              <Select className="!w-auto !py-1.5 text-sm" value={importMode} onChange={(e) => setImportMode(e.target.value as 'fusion' | 'remplacer')} aria-label="Mode d’import">
                <option value="fusion">en fusionnant</option>
                <option value="remplacer">en remplaçant tout</option>
              </Select>
            </div>
            <Button icon={<FileUp size={16} />} onClick={imp.open}>
              Importer des activités (.fit, .gpx, .tcx)
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button
              variant="soft"
              onClick={async () => {
                if (s.runs.length && !(await ask({ title: 'Ajouter les données de démo ?', text: 'Des séances fictives seront mélangées à tes vraies données.', confirmLabel: 'Ajouter' }))) return
                const { added } = s.mergeAll(demoData())
                if (!profile.name) setProfile(demoData().profile!)
                notify(`Démo chargée (${added} éléments)`)
              }}
            >
              Charger des données de démo
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={async () => {
                if (await ask({ title: 'Effacer toutes tes données ?', text: 'Séances, nuits, courses, records et réglages seront supprimés définitivement. Exporte une sauvegarde avant si besoin.', confirmLabel: 'Tout effacer', danger: true })) {
                  s.resetAll()
                  notify('Toutes les données ont été effacées')
                }
              }}
            >
              Tout effacer
            </Button>
          </div>
        </Section>
      </div>
      <p className="mt-6 text-center text-xs text-ink-3">Foulée · v1.0 · données 100 % locales</p>
    </div>
  )
}
