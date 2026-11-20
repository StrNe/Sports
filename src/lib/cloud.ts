// Sauvegarde durable dans la base de l'artifact claude.ai (capacité `db`) :
// les données suivent l'utilisateur sur tous ses appareils.
// Découpage : un document « meta » + un document par collection datée et par année
// (une base limite chaque document à 256 Kio).

import type { AppData } from '../types'
import { normalizeData } from '../store/useStore'
import type { DbNamespace } from './claude'

export const CLOUD_COLLECTION = 'foulee'
const DATED = ['runs', 'renfo', 'muscu', 'sleep', 'planned'] as const

/** JSON à clés triées, pour comparer des documents quel que soit l'ordre des champs */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v ?? null)
}

/** Supprime les `undefined` (refusés par certains stockages) */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function toDocs(d: AppData): Record<string, Record<string, unknown>> {
  const docs: Record<string, Record<string, unknown>> = {
    meta: clean({
      version: d.version,
      profile: d.profile,
      theme: d.theme,
      mealPicks: d.mealPicks,
      favoriteMeals: d.favoriteMeals,
      dayTypeOverrides: d.dayTypeOverrides,
      races: d.races,
      records: d.records,
      shoes: d.shoes,
      renfoTemplates: d.renfoTemplates.filter((t) => !t.builtin),
      sync: d.sync ?? {},
    }),
  }
  for (const k of DATED) {
    const byYear = new Map<string, unknown[]>()
    for (const it of d[k] as { date: string }[]) {
      const y = it.date?.slice(0, 4) || '0000'
      byYear.set(y, [...(byYear.get(y) ?? []), it])
    }
    byYear.forEach((items, y) => (docs[`${k}-${y}`] = clean({ items })))
  }
  return docs
}

export function fromDocs(docs: { id: string; data: Record<string, unknown> }[]): AppData {
  const meta = docs.find((x) => x.id === 'meta')?.data ?? {}
  const out: Record<string, unknown> = { ...meta }
  for (const k of DATED) {
    out[k] = docs.filter((x) => x.id.startsWith(`${k}-`)).flatMap((x) => (x.data.items as unknown[]) ?? [])
  }
  const d = normalizeData(out as Partial<AppData>)
  for (const k of DATED) (d[k] as { date: string }[]).sort((a, b) => b.date.localeCompare(a.date))
  return d
}

export type CloudState = 'off' | 'loading' | 'saved' | 'saving' | 'error'

interface Store {
  getState(): AppData & { replaceAll(d: AppData): void }
  subscribe(fn: (s: AppData) => void): () => void
}

/**
 * Charge les données depuis la base, puis y enregistre chaque modification (regroupées toutes les 1,2 s).
 * Les modifications faites sur un autre appareil arrivent en direct.
 */
export async function startCloud(db: DbNamespace, store: Store, onState: (s: CloudState, detail?: string) => void): Promise<void> {
  const coll = db.collection(CLOUD_COLLECTION)
  const written = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let applyingRemote = false
  let writing = false

  onState('loading')
  const first = await Promise.race([coll.get(), new Promise<null>((r) => setTimeout(() => r(null), 10000))])
  if (!first) {
    onState('error', 'La sauvegarde en ligne ne répond pas : tes données restent sur cet appareil pour le moment.')
    return
  }
  const remote = first.docs.filter((x) => x.exists).map((x) => ({ id: x.id, data: x.data() ?? {} }))
  if (remote.length) {
    remote.forEach((x) => written.set(x.id, stableStringify(x.data)))
    applyingRemote = true
    store.getState().replaceAll(fromDocs(remote))
    applyingRemote = false
  }

  const flush = async () => {
    if (writing) {
      timer = setTimeout(flush, 600)
      return
    }
    writing = true
    timer = undefined
    onState('saving')
    try {
      const docs = toDocs(store.getState())
      for (const [id, body] of Object.entries(docs)) {
        const s = stableStringify(body)
        if (written.get(id) === s) continue
        await db.doc(`${CLOUD_COLLECTION}/${id}`).set(body)
        written.set(id, s)
      }
      for (const id of [...written.keys()]) {
        if (!(id in docs)) {
          await db.doc(`${CLOUD_COLLECTION}/${id}`).delete()
          written.delete(id)
        }
      }
      onState('saved')
    } catch (e) {
      const code = (e as { code?: string }).code
      onState('error', code === 'quota_exceeded' ? 'Espace de sauvegarde plein.' : 'Échec de la sauvegarde en ligne, nouvel essai à la prochaine modification.')
    } finally {
      writing = false
    }
  }
  const schedule = () => {
    if (applyingRemote) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, 1200)
  }

  store.subscribe(schedule)
  // Première sauvegarde : envoie les données locales si la base était vide
  if (!remote.length) await flush()
  else onState('saved')

  // Modifications venant d'un autre appareil
  coll.onSnapshot(
    (snap) => {
      if (snap.metadata.hasPendingWrites || snap.metadata.fromCache || timer || writing) return
      const docs = snap.docs.filter((x) => x.exists).map((x) => ({ id: x.id, data: x.data() ?? {} }))
      const changed = docs.some((x) => written.get(x.id) !== stableStringify(x.data)) || [...written.keys()].some((id) => !docs.find((x) => x.id === id))
      if (!changed) return
      written.clear()
      docs.forEach((x) => written.set(x.id, stableStringify(x.data)))
      applyingRemote = true
      store.getState().replaceAll(fromDocs(docs))
      applyingRemote = false
    },
    () => onState('error', 'Synchronisation entre appareils interrompue. Recharge la page pour la relancer.'),
  )
}
