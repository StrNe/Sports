import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Cloud, CloudOff, RefreshCw, TriangleAlert, Watch } from 'lucide-react'
import { useStore, useUi } from '../store/useStore'
import { inClaude, resultText, useCapability, type McpError } from '../lib/claude'
import { COROS_SERVER, fetchCoros, type CorosCall } from '../lib/coros'
import { startCloud } from '../lib/cloud'
import { fmtDate, todayISO } from '../lib/format'
import { Button, Callout, Card, CardTitle, Modal } from './ui'

// ── Messages d'erreur COROS, un par situation ──────────────
export function corosErrorMessage(e: McpError): string {
  switch (e.code) {
    case 'needs_reauth':
      return 'Ta connexion à COROS a expiré. Reconnecte COROS dans claude.ai → Paramètres → Connecteurs, puis relance la synchronisation.'
    case 'server_not_connected':
    case 'server_not_found':
      return 'Le connecteur COROS n’est pas ajouté à ton compte claude.ai. Ajoute-le dans Paramètres → Connecteurs.'
    case 'selection_required':
      return 'Tu as plusieurs connecteurs COROS : choisis celui à utiliser dans la fenêtre proposée par claude.ai, puis relance.'
    case 'not_in_manifest':
    case 'approval_required':
    case 'consent_required':
      return 'Foulée a besoin de ton accord pour lire tes données COROS. Clique sur « Autoriser et synchroniser ».'
    case 'blocked_by_policy':
      return 'L’accès à COROS est bloqué par les règles de ton organisation.'
    case 'server_unavailable':
    case 'rate_limited':
      return 'COROS ne répond pas pour le moment. Réessaie dans quelques minutes.'
    case 'not_granted':
    case 'capability_disabled':
    case 'capability_removed':
      return 'La synchronisation COROS n’est pas disponible dans cette vue.'
    default:
      return e.message ? `La synchronisation a échoué : ${e.message}` : 'La synchronisation a échoué. Réessaie plus tard.'
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let running: Promise<void> | null = null

/** Lance une synchronisation COROS (une seule à la fois). `full` réimporte tout l'historique. */
export function runCorosSync(opts: { manual?: boolean; full?: boolean } = {}): Promise<void> {
  if (running) return running
  running = (async () => {
    const ui = useUi.getState()
    const mcp = await useCapability('mcp')
    if (!mcp) {
      ui.setCoros({ state: 'unavailable' })
      return
    }
    ui.setCoros({ state: 'syncing' })
    const call: CorosCall = async (tool, input) => {
      try {
        return resultText(await mcp.callTool(COROS_SERVER, tool, input, { cache: false }))
      } catch (e) {
        const err = e as McpError
        if (!err.retryable) throw err
        await sleep(err.retryAfterMs ?? 1500 + Math.random() * 1500)
        return resultText(await mcp.callTool(COROS_SERVER, tool, input, { cache: false }))
      }
    }
    try {
      const st = useStore.getState()
      const today = todayISO()
      const res = await fetchCoros(call, {
        lastDate: opts.full ? undefined : st.sync?.corosLastDate,
        raceDates: new Set(st.races.map((r) => r.date)),
        hasHrv: st.sleep.some((s) => s.hrv != null),
        onStep: (step) => useUi.getState().setCoros({ state: 'syncing', step }),
      })
      // Une sortie enregistrée le jour d'une séance prévue la valide automatiquement
      const runDates = new Set([...st.runs, ...(res.data.runs ?? [])].map((r) => r.date))
      res.data.planned = res.data.planned?.map((p) => (p.kind === 'run' && p.date <= today && runDates.has(p.date) ? { ...p, done: true } : p))
      const { added } = useStore.getState().mergeAll(res.data)
      // Séances retirées du plan côté COROS (à partir d'aujourd'hui)
      const fresh = new Set(res.data.planned?.map((p) => p.id))
      const stale = useStore
        .getState()
        .planned.filter((p) => p.id.startsWith('coros-plan-') && p.date >= today && p.date <= res.plannedRange[1] && !p.done && !fresh.has(p.id))
        .map((p) => p.id)
      if (stale.length) useStore.getState().removeMany('planned', stale)
      useStore.getState().setSync({ corosLastDate: today, corosAt: Date.now() })
      useUi.getState().setCoros({ state: 'ok', added })
      if (opts.manual || added) useUi.getState().notify(added ? `COROS : ${added} nouveauté${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''}` : 'COROS : tout est à jour')
    } catch (e) {
      const err = e as McpError
      useUi.getState().setCoros({ state: 'error', code: err.code ?? 'upstream_error', message: corosErrorMessage(err) })
    }
  })().finally(() => {
    running = null
  })
  return running
}

let booted = false

/** Au démarrage dans claude.ai : charge la sauvegarde en ligne, puis synchronise COROS si besoin. */
export function SyncBoot() {
  useEffect(() => {
    if (booted || !inClaude()) return
    booted = true
    ;(async () => {
      const db = await useCapability('db')
      if (db) {
        try {
          await startCloud(db, useStore as never, (state, detail) => useUi.getState().setCloud({ state, detail }))
        } catch {
          useUi.getState().setCloud({ state: 'error', detail: 'La sauvegarde en ligne est indisponible : tes données restent sur cet appareil.' })
        }
      }
      const mcp = await useCapability('mcp')
      if (!mcp) return
      useUi.getState().setCoros({ state: 'idle' })
      const s = useStore.getState().sync
      if (s?.corosAuto !== false && (!s?.corosAt || Date.now() - s.corosAt > 30 * 60 * 1000)) runCorosSync()
    })()
  }, [])
  return null
}

export function fmtAgo(ms?: number): string {
  if (!ms) return 'jamais'
  const min = Math.round((Date.now() - ms) / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `le ${fmtDate(new Date(ms).toISOString().slice(0, 10), 'd MMM')}`
}

/** Petit indicateur cliquable (barre latérale, en-tête mobile) */
export function SyncIndicator({ compact }: { compact?: boolean }) {
  const coros = useUi((s) => s.coros)
  const at = useStore((s) => s.sync?.corosAt)
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60000)
    return () => clearInterval(t)
  }, [])
  if (coros.state === 'unavailable') return null
  const syncing = coros.state === 'syncing'
  const error = coros.state === 'error'
  const label = syncing ? `Synchro COROS${coros.step ? ` · ${coros.step.toLowerCase()}` : '…'}` : error ? 'Synchro COROS à vérifier' : `COROS · ${fmtAgo(at)}`
  return (
    <button
      type="button"
      onClick={() => runCorosSync({ manual: true })}
      disabled={syncing}
      title={error ? coros.message : 'Synchroniser maintenant avec COROS'}
      aria-label={label}
      className={clsx(
        'flex items-center gap-2 rounded-xl text-xs font-medium transition-colors',
        compact ? 'size-9 justify-center bg-surface-3' : 'w-full px-3 py-2 hover:bg-surface-2',
        error ? 'text-critical' : 'text-ink-2',
      )}
    >
      {error ? <TriangleAlert size={15} /> : <RefreshCw size={15} className={clsx(syncing && 'animate-spin')} />}
      {!compact && <span className="truncate">{label}</span>}
    </button>
  )
}

/** Carte de réglages : synchronisation COROS et sauvegarde en ligne */
export function SyncSettingsCard() {
  const coros = useUi((s) => s.coros)
  const cloud = useUi((s) => s.cloud)
  const sync = useStore((s) => s.sync)
  const setSync = useStore((s) => s.setSync)
  const ask = useUi((s) => s.ask)

  if (!inClaude())
    return (
      <Card>
        <CardTitle icon={<Watch size={16} />} title="Synchronisation COROS" subtitle="Disponible dans la version claude.ai de Foulée" />
        <p className="text-sm text-ink-2">
          Ouverte depuis claude.ai, Foulée lit directement ton compte COROS : tout ton historique, chaque nouvelle sortie, tes nuits et ton plan d’entraînement arrivent automatiquement, et tes données sont sauvegardées en ligne pour tous tes appareils. Ici, tu peux importer des fichiers .fit ou une sauvegarde.
        </p>
      </Card>
    )

  const syncing = coros.state === 'syncing'
  const needsConsent = coros.state === 'error' && ['not_in_manifest', 'approval_required', 'consent_required'].includes(coros.code)
  return (
    <Card>
      <CardTitle icon={<Watch size={16} />} accent="run" title="Synchronisation COROS" subtitle="Séances, nuits, FC de repos et plan d’entraînement" />
      <div className="space-y-4">
        {coros.state === 'unavailable' ? (
          <Callout icon="🔌">Le connecteur COROS n’est pas accessible depuis cette page. Vérifie qu’il est ajouté dans claude.ai → Paramètres → Connecteurs, puis recharge la page.</Callout>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{syncing ? `Synchronisation en cours${coros.step ? ` : ${coros.step.toLowerCase()}` : '…'}` : `Dernière synchronisation : ${fmtAgo(sync?.corosAt)}`}</p>
                {sync?.corosLastDate && !syncing && <p className="text-xs text-ink-3">Données à jour jusqu’au {fmtDate(sync.corosLastDate, 'd MMMM yyyy')}</p>}
              </div>
              <Button variant="primary" disabled={syncing} icon={<RefreshCw size={16} className={clsx(syncing && 'animate-spin')} />} onClick={() => runCorosSync({ manual: true })}>
                {needsConsent ? 'Autoriser et synchroniser' : 'Synchroniser maintenant'}
              </Button>
            </div>
            {coros.state === 'error' && (
              <Callout tone="warning" icon="⚠️">
                {coros.message}
              </Callout>
            )}
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" className="size-4" checked={sync?.corosAuto !== false} onChange={(e) => setSync({ corosAuto: e.target.checked })} />
              Synchroniser automatiquement à l’ouverture (au plus toutes les 30 min)
            </label>
            <div>
              <Button
                size="sm"
                variant="ghost"
                disabled={syncing}
                onClick={async () => {
                  if (await ask({ title: 'Tout réimporter depuis COROS ?', text: 'Toutes tes séances, nuits et ton plan sont relus depuis le début. Rien n’est supprimé et tes modifications sont conservées.', confirmLabel: 'Réimporter' }))
                    runCorosSync({ manual: true, full: true })
                }}
              >
                Tout réimporter depuis le début
              </Button>
            </div>
          </>
        )}
        <div className="flex items-start gap-2 border-t border-line pt-3 text-sm">
          {cloud.state === 'error' || cloud.state === 'off' ? <CloudOff size={16} className="mt-0.5 shrink-0 text-ink-3" /> : <Cloud size={16} className="mt-0.5 shrink-0 text-sleep" />}
          <p className="text-ink-2">
            {cloud.state === 'saved' && 'Sauvegarde en ligne à jour : tes données sont les mêmes sur ton téléphone et ton ordinateur.'}
            {cloud.state === 'saving' && 'Enregistrement en ligne…'}
            {cloud.state === 'loading' && 'Chargement de ta sauvegarde en ligne…'}
            {cloud.state === 'off' && 'Sauvegarde en ligne indisponible : les données restent dans ce navigateur.'}
            {cloud.state === 'error' && cloud.detail}
          </p>
        </div>
      </div>
    </Card>
  )
}

/** Fenêtre de confirmation intégrée (les boîtes confirm() du navigateur sont bloquées dans claude.ai) */
export function ConfirmHost() {
  const req = useUi((s) => s.confirmReq)
  if (!req) return null
  return (
    <div className="relative z-[70]">
      <Modal
        open
        onClose={() => req.resolve(false)}
        title={req.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => req.resolve(false)}>
              Annuler
            </Button>
            <Button variant={req.danger ? 'danger' : 'primary'} onClick={() => req.resolve(true)}>
              {req.confirmLabel ?? 'Confirmer'}
            </Button>
          </>
        }
      >
        {req.text ? <p className="text-sm text-ink-2">{req.text}</p> : <span />}
      </Modal>
    </div>
  )
}
