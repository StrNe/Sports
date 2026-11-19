import { format, parseISO, differenceInCalendarDays, startOfWeek, addDays, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ISODate } from '../types'

// ── Identifiants ────────────────────────────────────────────
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Dates ───────────────────────────────────────────────────
export function todayISO(): ISODate {
  return toISO(new Date())
}

export function toISO(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

export function fromISO(s: ISODate): Date {
  return parseISO(s)
}

export function addDaysISO(s: ISODate, n: number): ISODate {
  return toISO(addDays(parseISO(s), n))
}

export function weekStartISO(s: ISODate): ISODate {
  return toISO(startOfWeek(parseISO(s), { weekStartsOn: 1 }))
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}

export function fmtDate(s: ISODate, pattern = 'EEE d MMM'): string {
  const d = parseISO(s)
  if (!isValid(d)) return s
  return format(d, pattern, { locale: fr })
}

export function fmtDateLong(s: ISODate): string {
  return fmtDate(s, 'EEEE d MMMM yyyy')
}

export function relativeDay(s: ISODate, today = todayISO()): string {
  const diff = daysBetween(today, s)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff > 1 && diff < 7) return fmtDate(s, 'EEEE')
  return fmtDate(s)
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Durées ──────────────────────────────────────────────────
/** 3725 → "1:02:05", 605 → "10:05" */
export function fmtDuration(sec: number | undefined, opts: { forceHours?: boolean } = {}): string {
  if (sec == null || !isFinite(sec)) return '—'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0 || opts.forceHours) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}`
}

/** 3725 → "1 h 02", 600 → "10 min" */
export function fmtDurationShort(sec: number | undefined): string {
  if (sec == null || !isFinite(sec)) return '—'
  const totalMin = Math.round(sec / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export function fmtMinutes(min: number | undefined): string {
  if (min == null || !isFinite(min)) return '—'
  return fmtDurationShort(min * 60)
}

/** Accepte "45", "45:30", "1:02:15", "1h02", "1h02m15" → secondes */
export function parseDuration(input: string): number | undefined {
  const s = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return undefined
  const hm = s.match(/^(\d+)h(\d{1,2})?(?:m(?:in)?)?(\d{1,2})?s?$/)
  if (hm) return Number(hm[1]) * 3600 + Number(hm[2] ?? 0) * 60 + Number(hm[3] ?? 0)
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 60) // minutes
  const parts = s.split(':').map(Number)
  if (parts.some((p) => isNaN(p))) return undefined
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return undefined
}

// ── Allure ──────────────────────────────────────────────────
export function paceSecPerKm(distanceKm: number, durationSec: number): number | undefined {
  if (!distanceKm || !durationSec) return undefined
  return durationSec / distanceKm
}

/** 330 → "5:30" */
export function fmtPace(secPerKm: number | undefined): string {
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm <= 0) return '—'
  const s = Math.round(secPerKm)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function parsePace(input: string): number | undefined {
  const m = input.trim().match(/^(\d{1,2})[:'’](\d{1,2})"?$/)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  if (/^\d+(\.\d+)?$/.test(input.trim())) return Math.round(Number(input) * 60)
  return undefined
}

export function speedKmh(secPerKm: number): number {
  return 3600 / secPerKm
}

// ── Nombres ─────────────────────────────────────────────────
export function fmtKm(km: number | undefined, digits = 1): string {
  if (km == null || !isFinite(km)) return '—'
  return km.toLocaleString('fr-FR', { minimumFractionDigits: km < 10 && digits ? digits : 0, maximumFractionDigits: digits })
}

export function fmtNum(n: number | undefined, digits = 0): string {
  if (n == null || !isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  let t = 0
  for (const x of arr) t += f(x) || 0
  return t
}

export function avg(arr: number[]): number | undefined {
  const v = arr.filter((x) => x != null && isFinite(x))
  if (!v.length) return undefined
  return v.reduce((a, b) => a + b, 0) / v.length
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${Math.abs(n) >= 2 ? many : one}`
}

/** Petite fonction de hachage déterministe (choix des repas du jour, astuce du jour…) */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function minutesToHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function hhmmToMinutes(s?: string): number | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return undefined
  return Number(m[1]) * 60 + Number(m[2])
}

/** Durée entre coucher et lever, en gérant le passage de minuit */
export function sleepDurationMin(bed?: string, wake?: string): number | undefined {
  const b = hhmmToMinutes(bed)
  const w = hhmmToMinutes(wake)
  if (b == null || w == null) return undefined
  let d = w - b
  if (d <= 0) d += 1440
  return d
}
