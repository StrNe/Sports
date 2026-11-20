import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppData, DayType, ISODate, PlannedWorkout, Profile, Run, SyncState, Theme } from '../types'
import { BUILTIN_RENFO } from '../data/training'

export const DATA_VERSION = 1
export const STORAGE_KEY = 'foulee-data'

export type CollectionKey = 'runs' | 'renfo' | 'muscu' | 'races' | 'records' | 'sleep' | 'shoes' | 'planned' | 'renfoTemplates' | 'food' | 'activity' | 'weights' | 'products'
export const COLLECTIONS: CollectionKey[] = ['runs', 'renfo', 'muscu', 'races', 'records', 'sleep', 'shoes', 'planned', 'renfoTemplates', 'food', 'activity', 'weights', 'products']

type Item<K extends CollectionKey> = AppData[K][number]

export const DEFAULT_PROFILE: Profile = {
  name: '',
  sleepGoalMin: 480,
  diet: 'omnivore',
  weeklySessionsGoal: 4,
}

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    profile: { ...DEFAULT_PROFILE },
    runs: [],
    renfo: [],
    muscu: [],
    races: [],
    records: [],
    sleep: [],
    shoes: [],
    planned: [],
    renfoTemplates: BUILTIN_RENFO,
    food: [],
    activity: [],
    weights: [],
    products: [],
    dayTypeOverrides: {},
    theme: 'system',
    sync: { corosAuto: true },
  }
}

interface Actions {
  upsert: <K extends CollectionKey>(key: K, item: Item<K>) => void
  upsertMany: <K extends CollectionKey>(key: K, items: Item<K>[]) => void
  remove: (key: CollectionKey, id: string) => void
  removeMany: (key: CollectionKey, ids: string[]) => void
  setSync: (patch: Partial<SyncState>) => void
  setProfile: (p: Partial<Profile>) => void
  setTheme: (t: Theme) => void
  setDayTypeOverride: (date: ISODate, t: DayType | undefined) => void
  replaceAll: (data: AppData) => void
  mergeAll: (data: Partial<AppData>) => { added: number }
  resetAll: () => void
}

export type Store = AppData & Actions

function sortByDateDesc<T extends { date?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

/** Même sortie déjà présente (importée depuis une autre source : .fit, COROS…) */
export function isDuplicateRun(r: Run, existing: Run[]): boolean {
  return existing.some((x) => x.id !== r.id && x.date === r.date && Math.abs(x.distanceKm - r.distanceKm) < 0.1 && Math.abs(x.durationSec - r.durationSec) < 90)
}

/** Complète un objet importé avec les valeurs par défaut (robustesse aux anciennes sauvegardes) */
export function normalizeData(input: Partial<AppData>): AppData {
  const base = emptyData()
  const out: AppData = {
    ...base,
    ...input,
    version: DATA_VERSION,
    profile: { ...base.profile, ...(input.profile ?? {}) },
    dayTypeOverrides: input.dayTypeOverrides ?? {},
    theme: input.theme ?? 'system',
    sync: { corosAuto: true, ...(input.sync ?? {}) },
  } as AppData
  for (const k of COLLECTIONS) {
    const v = (input as Record<string, unknown>)[k]
    ;(out as unknown as Record<string, unknown>)[k] = Array.isArray(v) ? v : (base as unknown as Record<string, unknown>)[k]
  }
  // Toujours garder les modèles de renfo intégrés
  const ids = new Set(out.renfoTemplates.map((t) => t.id))
  out.renfoTemplates = [...BUILTIN_RENFO.filter((t) => !ids.has(t.id)), ...out.renfoTemplates]
  return out
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),

      upsert: (key, item) =>
        set((s) => {
          const list = s[key] as Item<typeof key>[]
          const idx = list.findIndex((x) => x.id === item.id)
          const next = idx >= 0 ? list.map((x, i) => (i === idx ? item : x)) : [...list, item]
          return { [key]: key === 'renfoTemplates' || key === 'shoes' || key === 'products' ? next : sortByDateDesc(next as { date?: string }[]) } as Partial<Store>
        }),

      upsertMany: (key, items) =>
        set((s) => {
          const map = new Map((s[key] as Item<typeof key>[]).map((x) => [x.id, x]))
          items.forEach((it) => map.set(it.id, it))
          const next = [...map.values()]
          return { [key]: key === 'renfoTemplates' || key === 'shoes' || key === 'products' ? next : sortByDateDesc(next as { date?: string }[]) } as Partial<Store>
        }),

      remove: (key, id) => set((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<Store>),

      removeMany: (key, ids) => {
        const set_ = new Set(ids)
        set((s) => ({ [key]: (s[key] as { id: string }[]).filter((x) => !set_.has(x.id)) }) as Partial<Store>)
      },
      setSync: (patch) => set((s) => ({ sync: { ...(s.sync ?? {}), ...patch } })),

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setTheme: (theme) => set({ theme }),

      setDayTypeOverride: (date, t) =>
        set((s) => {
          const next = { ...s.dayTypeOverrides }
          if (t) next[date] = t
          else delete next[date]
          return { dayTypeOverrides: next }
        }),

      replaceAll: (data) => set(normalizeData(data)),

      mergeAll: (data) => {
        const s = get()
        let added = 0
        const patch: Partial<AppData> = {}
        for (const k of COLLECTIONS) {
          const incoming = (data as Record<string, unknown>)[k]
          if (!Array.isArray(incoming)) continue
          const current = s[k] as { id: string; externalId?: string }[]
          const map = new Map(current.map((x) => [x.id, x]))
          const ext = new Set(current.map((x) => x.externalId).filter(Boolean))
          for (const it of incoming as { id: string; externalId?: string }[]) {
            if (it.externalId && ext.has(it.externalId) && !map.has(it.id)) continue
            const prev = map.get(it.id)
            if (!prev) {
              if (k === 'runs' && isDuplicateRun(it as unknown as Run, current as unknown as Run[])) continue
              added++
              map.set(it.id, it)
            } else if (k === 'activity') {
              // Les pas et calories du jour évoluent : la mesure la plus récente gagne
              map.set(it.id, { ...prev, ...it })
            } else if (k === 'planned') {
              // Le plan peut évoluer côté montre, mais une séance validée dans l'appli le reste
              map.set(it.id, { ...prev, ...it, done: (prev as PlannedWorkout).done || (it as PlannedWorkout).done } as typeof it)
            } else {
              // Mise à jour : ce que tu as modifié dans l'appli (RPE, notes, type…) est conservé
              map.set(it.id, { ...it, ...prev })
            }
          }
          const next = [...map.values()]
          ;(patch as Record<string, unknown>)[k] = k === 'renfoTemplates' || k === 'shoes' || k === 'products' ? next : sortByDateDesc(next as { date?: string }[])
        }
        if (data.profile) {
          // On complète seulement les champs vides : le profil saisi dans l'appli fait foi
          const profile = { ...s.profile } as Record<string, unknown>
          for (const [key, v] of Object.entries(data.profile)) if (profile[key] === undefined || profile[key] === '') profile[key] = v
          patch.profile = profile as unknown as Profile
        }
        if (data.dayTypeOverrides) patch.dayTypeOverrides = { ...s.dayTypeOverrides, ...data.dayTypeOverrides }
        set(patch)
        return { added }
      },

      resetAll: () => set(emptyData()),
    }),
    {
      name: STORAGE_KEY,
      version: DATA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') out[k] = v
        return out as unknown as AppData
      },
      merge: (persisted, current) => ({ ...current, ...normalizeData((persisted ?? {}) as Partial<AppData>) }),
    },
  ),
)

/** Instantané des données (sans les actions) pour l'export */
export function snapshot(): AppData {
  const s = useStore.getState()
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') out[k] = v
  return out as unknown as AppData
}

// ── État d'interface (non persisté) ─────────────────────────
export type FormKind = 'run' | 'renfo' | 'muscu' | 'sleep' | 'race' | 'record' | 'shoe' | 'planned' | 'goals' | 'food' | 'foodEntry' | 'calories'

export type CorosStatus =
  | { state: 'unavailable' }
  | { state: 'idle' }
  | { state: 'syncing'; step?: string }
  | { state: 'ok'; added: number }
  | { state: 'error'; code: string; message: string }

export interface ConfirmRequest {
  title: string
  text?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

interface UiState {
  coros: CorosStatus
  cloud: { state: 'off' | 'loading' | 'saved' | 'saving' | 'error'; detail?: string }
  confirmReq: ConfirmRequest | null
  setCoros: (s: CorosStatus) => void
  setCloud: (s: UiState['cloud']) => void
  ask: (req: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>
  form: { kind: FormKind; initial?: unknown } | null
  quickAddOpen: boolean
  moreOpen: boolean
  toast: { id: number; text: string; tone?: 'ok' | 'error' } | null
  openForm: (kind: FormKind, initial?: unknown) => void
  closeForm: () => void
  setQuickAdd: (v: boolean) => void
  setMore: (v: boolean) => void
  notify: (text: string, tone?: 'ok' | 'error') => void
}

export const useUi = create<UiState>()((set) => ({
  coros: { state: 'unavailable' },
  cloud: { state: 'off' },
  confirmReq: null,
  setCoros: (coros) => set({ coros }),
  setCloud: (cloud) => set({ cloud }),
  ask: (req) =>
    new Promise<boolean>((resolve) =>
      set({
        confirmReq: {
          ...req,
          resolve: (ok) => {
            set({ confirmReq: null })
            resolve(ok)
          },
        },
      }),
    ),
  form: null,
  quickAddOpen: false,
  moreOpen: false,
  toast: null,
  openForm: (kind, initial) => set({ form: { kind, initial }, quickAddOpen: false }),
  closeForm: () => set({ form: null }),
  setQuickAdd: (quickAddOpen) => set({ quickAddOpen }),
  setMore: (moreOpen) => set({ moreOpen }),
  notify: (text, tone = 'ok') => {
    const id = Date.now()
    set({ toast: { id, text, tone } })
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 3200)
  },
}))
