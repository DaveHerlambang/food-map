/**
 * The "usual hours" editor model and its conversion to and from the stored
 * minute-of-week intervals (see hours.ts).
 *
 * The form is: usual hours (one or more shifts, or 24 hours), the days the
 * place opens, and a few days that differ. A shift closing at or before it
 * opens (18:00 → 02:00) closes the next day.
 *
 * Only imports ./hours.ts so it can be unit-tested with `node --test`.
 */
import { DAY, WEEK, formatClock, mergeIntervals, type Interval } from "./hours.ts"

/** Minutes of the day. `close <= open` means it closes the next day. */
export type Shift = { open: number; close: number }
export type HoursGroup = { allDay: boolean; shifts: Shift[] }
/** Some open days with different hours. */
export type HoursException = HoursGroup & { days: number[] }
export type HoursDraft = {
  usual: HoursGroup
  /** 0 = Sunday … 6 = Saturday */
  openDays: number[]
  exceptions: HoursException[]
}

/** Monday first, the way people read a week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
export const DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const
export const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const
export const MAX_SHIFTS = 3

export const crossesMidnight = (s: Shift) => s.close <= s.open

export function emptyDraft(): HoursDraft {
  return {
    usual: { allDay: false, shifts: [{ open: 10 * 60, close: 22 * 60 }] },
    openDays: [0, 1, 2, 3, 4, 5, 6],
    exceptions: [],
  }
}

/** "18:30" → 1110; anything else → null. */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

const groupFor = (draft: HoursDraft, day: number): HoursGroup =>
  draft.exceptions.find((e) => e.days.includes(day)) ?? draft.usual

/** Why this draft can't be saved, or null if it can. */
export function validateDraft(draft: HoursDraft): string | null {
  if (draft.openDays.length === 0) return "Pick at least one day it opens."
  const seen = new Set<number>()
  for (const e of draft.exceptions) {
    if (e.days.length === 0) return "Pick the days for each different-hours row, or remove it."
    for (const d of e.days) {
      if (!draft.openDays.includes(d)) return "A different-hours day is not an open day."
      if (seen.has(d)) return `${DAY_SHORT[d]} is in two different-hours rows.`
      seen.add(d)
    }
  }
  for (const g of [draft.usual, ...draft.exceptions]) {
    if (g.allDay) continue
    if (g.shifts.length === 0) return "Add the opening hours."
    const shifts = [...g.shifts].sort((a, b) => a.open - b.open)
    for (const s of shifts) {
      if (s.open === s.close) return "Opening and closing time can't be the same. Use 24 hours instead."
    }
    for (let i = 0; i < shifts.length - 1; i++) {
      if (crossesMidnight(shifts[i]) || shifts[i].close > shifts[i + 1].open) {
        return "Shifts overlap: each shift must start after the one before it ends."
      }
    }
  }
  return null
}

/** The draft as stored intervals. Assumes a valid draft. */
export function draftToIntervals(draft: HoursDraft): Interval[] {
  const out: Interval[] = []
  for (const d of draft.openDays) {
    const g = groupFor(draft, d)
    const start = d * DAY
    if (g.allDay) {
      out.push({ open: start, close: start + DAY })
      continue
    }
    for (const s of g.shifts) {
      out.push({ open: start + s.open, close: start + s.close + (crossesMidnight(s) ? DAY : 0) })
    }
  }
  return mergeIntervals(out)
}

type DayHours = { allDay: boolean; shifts: Shift[] }

/** Splits stored intervals into what each weekday shows (periods that START on it). */
function perDay(hours: Interval[]): (DayHours | null)[] {
  const days: (DayHours | null)[] = Array(7).fill(null)
  const add = (start: number, piece: Partial<DayHours> & { shift?: Shift }) => {
    const d = Math.floor(start / DAY) % 7
    const cur = days[d] ?? { allDay: false, shifts: [] }
    if (piece.allDay) cur.allDay = true
    if (piece.shift) cur.shifts.push(piece.shift)
    days[d] = cur
  }
  for (const { open, close } of hours) {
    let start = open
    // A run longer than a day (e.g. 24 hours on several days in a row).
    while (close - start > DAY) {
      if (start % DAY === 0) add(start, { allDay: true })
      else add(start, { shift: { open: start % DAY, close: 0 } }) // until midnight
      start = (Math.floor(start / DAY) + 1) * DAY
    }
    if (close - start === DAY) add(start, { allDay: true })
    else add(start, { shift: { open: start % DAY, close: close % DAY } })
  }
  for (const d of days) {
    if (!d) continue
    if (d.allDay) d.shifts = []
    d.shifts.sort((a, b) => a.open - b.open)
  }
  return days
}

const signature = (d: DayHours) =>
  d.allDay ? "24H" : d.shifts.map((s) => `${s.open}-${s.close}`).join(",")

/**
 * Stored intervals → the form: the most common daily hours become the usual
 * hours, the rest become different-hours rows. Unknown hours → a blank form.
 */
export function intervalsToDraft(hours: Interval[] | null): HoursDraft {
  if (!hours || hours.length === 0) return emptyDraft()
  if (hours.length === 1 && hours[0].open === 0 && hours[0].close === WEEK) {
    return { usual: { allDay: true, shifts: [] }, openDays: [0, 1, 2, 3, 4, 5, 6], exceptions: [] }
  }
  const days = perDay(hours)
  const bySig = new Map<string, { hours: DayHours; days: number[] }>()
  for (const d of WEEK_ORDER) {
    const h = days[d]
    if (!h) continue
    const key = signature(h)
    const entry = bySig.get(key) ?? { hours: h, days: [] }
    entry.days.push(d)
    bySig.set(key, entry)
  }
  const groups = [...bySig.values()]
  if (groups.length === 0) return emptyDraft()
  // Most days wins; ties go to the one that comes first in the week.
  const usual = groups.reduce((a, b) => (b.days.length > a.days.length ? b : a))
  return {
    usual: { allDay: usual.hours.allDay, shifts: usual.hours.shifts.map((s) => ({ ...s })) },
    openDays: groups.flatMap((g) => g.days),
    exceptions: groups
      .filter((g) => g !== usual)
      .map((g) => ({ allDay: g.hours.allDay, shifts: g.hours.shifts.map((s) => ({ ...s })), days: g.days })),
  }
}

const groupText = (g: HoursGroup) =>
  g.allDay ? "24 HOURS" : g.shifts.map((s) => `${formatClock(s.open)}–${formatClock(s.close)}`).join(", ")

/**
 * The week as receipt lines, Monday first, joining neighbouring days with the
 * same hours: [{ days: "MON–THU", hours: "18:00–02:00" }, { days: "SUN", hours: "CLOSED" }].
 */
export function summarizeDraft(draft: HoursDraft): { days: string; hours: string; closed: boolean }[] {
  const lines: { from: number; to: number; hours: string; closed: boolean }[] = []
  for (const d of WEEK_ORDER) {
    const closed = !draft.openDays.includes(d)
    const hours = closed ? "CLOSED" : groupText(groupFor(draft, d))
    const last = lines[lines.length - 1]
    if (last && last.hours === hours) last.to = d
    else lines.push({ from: d, to: d, hours, closed })
  }
  return lines.map((l) => ({
    days: l.from === l.to ? DAY_SHORT[l.from] : `${DAY_SHORT[l.from]}–${DAY_SHORT[l.to]}`,
    hours: l.hours,
    closed: l.closed,
  }))
}
