/**
 * Opening-hours engine.
 *
 * Hours are stored as minute-of-week intervals [open, close):
 *   - minute 0 = Sunday 00:00 (same day numbering as Google, JS getDay(), Postgres dow)
 *   - open is 0..10079
 *   - close > open, and may exceed 10080 when a period wraps past Saturday night
 *   - 24/7 is [0, 10080)
 *
 * "Is it open at t?" is then: does some interval contain t OR t + WEEK.
 * That single rule covers overnight hours, the Sat→Sun wrap, and 24/7.
 *
 * This file has no imports so it can be unit-tested with `node --test`.
 */

export const DAY = 1440
export const WEEK = 7 * DAY

export type Interval = { open: number; close: number }

export type GooglePoint = { day: number; hour: number; minute: number }
export type GooglePeriod = { open: GooglePoint; close?: GooglePoint }

const toMinute = (p: GooglePoint) => p.day * DAY + p.hour * 60 + p.minute

/** Converts Google `regularOpeningHours.periods` into normalized intervals. */
export function fromGooglePeriods(periods: GooglePeriod[]): Interval[] {
  const intervals = periods.map((p): Interval => {
    // Google's way of saying "open 24 hours, every day": one period, no close.
    if (!p.close) return { open: 0, close: WEEK }
    const open = toMinute(p.open)
    let close = toMinute(p.close)
    if (close <= open) close += WEEK // wraps past Saturday into Sunday
    return { open, close }
  })
  return mergeIntervals(intervals)
}

/**
 * Sorts and merges overlapping or touching intervals, including across the
 * Saturday→Sunday boundary. Without this, a stay that spans two back-to-back
 * periods (e.g. 10:00–15:00 then 15:00–22:00) would wrongly fail.
 */
export function mergeIntervals(input: Interval[]): Interval[] {
  const sorted = input
    .filter((i) => i.close > i.open)
    .map((i) => ({ ...i }))
    .sort((a, b) => a.open - b.open)

  const merged: Interval[] = []
  for (const cur of sorted) {
    const last = merged[merged.length - 1]
    if (last && cur.open <= last.close) last.close = Math.max(last.close, cur.close)
    else merged.push(cur)
  }

  // Wrap-around: an interval running past the end of the week can touch or
  // overlap the first interval of the week (shifted by WEEK). Fold those in.
  while (merged.length > 1) {
    const first = merged[0]
    const last = merged[merged.length - 1]
    if (last.close < first.open + WEEK) break
    last.close = Math.max(last.close, first.close + WEEK)
    merged.shift()
  }

  // Anything covering a full week is simply 24/7.
  if (merged.some((i) => i.close - i.open >= WEEK)) return [{ open: 0, close: WEEK }]
  return merged
}

// Creating Intl formatters is slow; reuse one per time zone.
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
    formatters.set(timeZone, f)
  }
  return f
}

/** Minute of the week for `date` as seen in `timeZone` (e.g. "Asia/Jakarta"). */
export function minuteOfWeek(date: Date, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))
  return day * DAY + Number(get("hour")) * 60 + Number(get("minute"))
}

export type OpenState =
  | { status: "unknown" }
  | { status: "closed"; opensIn: number | null; opensAt: number | null }
  // closesAt is null (and minutesLeft Infinity) for places open 24/7
  | { status: "open" | "closing"; minutesLeft: number; closesAt: number | null }

const is24x7 = (hours: Interval[]) =>
  hours.length === 1 && hours[0].open === 0 && hours[0].close === WEEK

/**
 * Open/closed state at minute-of-week `t`.
 * - `hours === null` means we don't know the hours.
 * - "closing" = open, but closes within `soonMinutes`.
 * - `closesAt` / `opensAt` are minute-of-week values (0..10079).
 */
export function getOpenState(
  hours: Interval[] | null,
  t: number,
  soonMinutes = 60,
): OpenState {
  if (hours === null) return { status: "unknown" }
  // [0, WEEK) "ends" at Saturday 24:00 only on paper; it never actually closes.
  if (is24x7(hours)) return { status: "open", minutesLeft: Infinity, closesAt: null }

  for (const { open, close } of hours) {
    for (const x of [t, t + WEEK]) {
      if (open <= x && x < close) {
        const minutesLeft = close - x
        return {
          status: minutesLeft <= soonMinutes ? "closing" : "open",
          minutesLeft,
          closesAt: close % WEEK,
        }
      }
    }
  }

  // Closed: find the next opening, looking up to a week ahead.
  let opensIn: number | null = null
  for (const { open } of hours) {
    const delta = (open - t + WEEK) % WEEK || WEEK
    if (opensIn === null || delta < opensIn) opensIn = delta
  }
  return {
    status: "closed",
    opensIn,
    opensAt: opensIn === null ? null : (t + opensIn) % WEEK,
  }
}

/** True if open for the whole window [t, t + stayMinutes). */
export function isOpenFor(hours: Interval[] | null, t: number, stayMinutes = 0): boolean {
  const state = getOpenState(hours, t)
  return (
    (state.status === "open" || state.status === "closing") &&
    state.minutesLeft >= Math.max(stayMinutes, 1)
  )
}

/** "HH:MM" for a minute-of-week (or minute-of-day) value. */
export function formatClock(minute: number): string {
  const m = ((minute % DAY) + DAY) % DAY
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/**
 * Human-readable hours for one weekday (0 = Sunday), e.g. ["17:00–02:00"].
 * Lists the periods that START on that day, so overnight hours show once.
 */
export function hoursForDay(hours: Interval[], day: number): string[] {
  if (is24x7(hours)) return ["Open 24 hours"]
  return hours
    .filter((i) => Math.floor(i.open / DAY) === day)
    .map((i) => `${formatClock(i.open)}–${formatClock(i.close)}`)
}
