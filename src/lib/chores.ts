// Tâches ménagères : décomptes et suggestions à partir de ce que tu as déjà noté.

import type { ChoreEntry, ISODate } from '../types'
import { addDaysISO, todayISO, weekStartISO } from './format'

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
