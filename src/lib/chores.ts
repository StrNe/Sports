// Tâches ménagères : décomptes et suggestions à partir de ce que tu as déjà noté.

import type { ChoreEntry, ChoreRhythmSetting, ISODate } from '../types'
import { addDaysISO, daysBetween, todayISO, weekStartISO } from './format'

export interface ChoreCounts {
  today: number
  yesterday: number
  week: number
  prevWeek: number
  month: number
  prevMonth: number
}

function prevMonthPrefix(today: ISODate): string {
  const [y, m] = today.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export function choreCounts(chores: ChoreEntry[], today = todayISO()): ChoreCounts {
  const ws = weekStartISO(today)
  const we = addDaysISO(ws, 6)
  const pws = addDaysISO(ws, -7)
  const pwe = addDaysISO(ws, -1)
  const month = today.slice(0, 7)
  const prev = prevMonthPrefix(today)
  const yesterday = addDaysISO(today, -1)
  let c: ChoreCounts = { today: 0, yesterday: 0, week: 0, prevWeek: 0, month: 0, prevMonth: 0 }
  for (const x of chores) {
    if (x.date === today) c.today++
    if (x.date === yesterday) c.yesterday++
    if (x.date >= ws && x.date <= we) c.week++
    if (x.date >= pws && x.date <= pwe) c.prevWeek++
    if (x.date.startsWith(month)) c.month++
    if (x.date.startsWith(prev)) c.prevMonth++
  }
  return c
}

/** Nom de tâche normalisé (casse et accents ignorés) */
export const choreKey = (s: string) => key(s)

const key = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Tes tâches les plus fréquentes, pour les rajouter en un geste */
export function frequentChores(chores: ChoreEntry[], limit = 8): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number; last: string }>()
  for (const c of chores) {
    const k = key(c.name)
    const cur = map.get(k)
    if (cur) {
      cur.count++
      if (c.date > cur.last) {
        cur.last = c.date
        cur.name = c.name
      }
    } else map.set(k, { name: c.name, count: 1, last: c.date })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit).map(({ name, count }) => ({ name, count }))
}

/** « vaisselle, poubelles et lessive » → ['Vaisselle', 'Poubelles', 'Lessive'] */
export function splitChores(text: string): string[] {
  return text
    .split(/,|;|\n|\s+et\s+|\s*\+\s*/i)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 20)
}

export function choresPerDay(chores: ChoreEntry[], from: ISODate, to: ISODate): Map<ISODate, number> {
  const m = new Map<ISODate, number>()
  for (const c of chores) if (c.date >= from && c.date <= to) m.set(c.date, (m.get(c.date) ?? 0) + 1)
  return m
}

/** Années pour lesquelles des tâches existent (la plus récente d'abord), avec leur total */
export function choreYears(chores: ChoreEntry[], today = todayISO()): { year: string; count: number }[] {
  const m = new Map<string, number>()
  for (const c of chores) m.set(c.date.slice(0, 4), (m.get(c.date.slice(0, 4)) ?? 0) + 1)
  if (!m.has(today.slice(0, 4))) m.set(today.slice(0, 4), 0)
  return [...m.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year.localeCompare(a.year))
}

/** Nombre de tâches par mois d'une année (index 0 = janvier) */
export function monthCounts(chores: ChoreEntry[], year: string): number[] {
  const out = Array.from({ length: 12 }, () => 0)
  for (const c of chores) if (c.date.startsWith(year)) out[Number(c.date.slice(5, 7)) - 1]++
  return out
}

/** Cases d'un calendrier mensuel commençant le lundi (null = case vide avant le 1er) */
export function monthGrid(year: number, month: number): (ISODate | null)[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const lead = (new Date(first + 'T12:00:00').getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  return [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => addDaysISO(first, i))]
}

export interface ChoreSearchGroup {
  name: string
  count: number
  last: ISODate
  dates: ISODate[]
}

/** Recherche dans tout l'historique, regroupée par tâche (la plus récente d'abord) */
export function searchChores(chores: ChoreEntry[], query: string): ChoreSearchGroup[] {
  const q = key(query)
  if (!q) return []
  const groups = new Map<string, ChoreSearchGroup>()
  for (const c of chores) {
    const k = key(c.name)
    if (!k.includes(q) && !key(c.note ?? '').includes(q)) continue
    const g = groups.get(k) ?? { name: c.name, count: 0, last: c.date, dates: [] }
    g.count++
    g.dates.push(c.date)
    if (c.date >= g.last) {
      g.last = c.date
      g.name = c.name
    }
    groups.set(k, g)
  }
  return [...groups.values()].map((g) => ({ ...g, dates: [...g.dates].sort((a, b) => b.localeCompare(a)) })).sort((a, b) => b.last.localeCompare(a.last))
}

/** Export tableur (séparateur « ; » pour Excel en français) */
export function choresCsv(chores: ChoreEntry[]): string {
  const esc = (s?: string) => (s && /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : (s ?? ''))
  const rows = [...chores].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')).map((c) => [c.date, c.time ?? '', esc(c.name), esc(c.note)].join(';'))
  return ['date;heure;tâche;note', ...rows].join('\n')
}

// ── Tâches régulières ───────────────────────────────────────
export interface ChoreRhythm {
  key: string
  name: string
  /** Intervalle visé, en jours */
  everyDays: number
  /** Déduit de l'historique, ou réglé à la main */
  source: 'auto' | 'manuel'
  last?: ISODate
  due: ISODate
  /** Jours avant l'échéance (négatif : en retard) */
  inDays: number
  count: number
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/**
 * Rythme de chaque tâche : réglé à la main, sinon déduit des 6 derniers intervalles
 * (au moins 3 fois, et pas les tâches quasi quotidiennes comme la vaisselle).
 */
export function choreRhythms(chores: ChoreEntry[], settings: Record<string, ChoreRhythmSetting> = {}, today = todayISO()): ChoreRhythm[] {
  const groups = new Map<string, { name: string; dates: Set<ISODate> }>()
  for (const c of chores) {
    const k = key(c.name)
    const g = groups.get(k) ?? { name: c.name, dates: new Set<ISODate>() }
    g.dates.add(c.date)
    groups.set(k, g)
  }
  const out: ChoreRhythm[] = []
  for (const [k, g] of groups) {
    const s = settings[k]
    if (s?.off) continue
    const dates = [...g.dates].filter((d) => d <= today).sort()
    if (!dates.length) continue
    let every = s?.everyDays
    let source: ChoreRhythm['source'] = 'manuel'
    if (!every) {
      if (dates.length < 3) continue
      const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d)).slice(-6)
      const m = median(gaps)
      if (m < 3) continue
      every = m
      source = 'auto'
    }
    const last = dates[dates.length - 1]
    const due = addDaysISO(last, every)
    out.push({ key: k, name: s?.name ?? g.name, everyDays: every, source, last, due, inDays: daysBetween(today, due), count: dates.length })
  }
  // Tâches régulières ajoutées à la main mais jamais faites : à faire dès maintenant
  for (const [k, s] of Object.entries(settings)) {
    if (s.off || !s.everyDays || groups.has(k)) continue
    out.push({ key: k, name: s.name, everyDays: s.everyDays, source: 'manuel', due: today, inDays: 0, count: 0 })
  }
  return out.sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name))
}

/** En retard ou à faire dans les prochains jours */
export function dueSoon(rhythms: ChoreRhythm[], horizon = 2): ChoreRhythm[] {
  return rhythms.filter((r) => r.inDays <= horizon)
}

/** 7 → « chaque semaine », 13 → « toutes les 2 semaines », 61 → « tous les 2 mois » */
export function fmtEvery(days: number): string {
  if (days === 1) return 'chaque jour'
  const w = Math.round(days / 7)
  if (days >= 6 && w <= 8 && Math.abs(days - 7 * w) <= 1) return w === 1 ? 'chaque semaine' : `toutes les ${w} semaines`
  const m = Math.round(days / 30.4)
  if (days >= 27 && Math.abs(days - 30.4 * m) <= 4) return m === 1 ? 'chaque mois' : m === 12 ? 'chaque année' : `tous les ${m} mois`
  return `tous les ${days} jours`
}

export function fmtDue(inDays: number): string {
  if (inDays < -1) return `en retard de ${-inDays} jours`
  if (inDays === -1) return 'en retard d’un jour'
  if (inDays === 0) return 'aujourd’hui'
  if (inDays === 1) return 'demain'
  return `dans ${inDays} jours`
}

/** Rythmes proposés dans les réglages */
export const RHYTHM_CHOICES: { days: number; label: string }[] = [
  { days: 7, label: 'Chaque semaine' },
  { days: 14, label: 'Toutes les 2 semaines' },
  { days: 30, label: 'Chaque mois' },
  { days: 61, label: 'Tous les 2 mois' },
  { days: 91, label: 'Tous les 3 mois' },
  { days: 182, label: 'Tous les 6 mois' },
  { days: 365, label: 'Chaque année' },
]
