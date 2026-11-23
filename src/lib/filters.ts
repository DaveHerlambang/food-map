/**
 * Map filters: target time, stay duration, open-only, status, tags.
 * Pure functions (no imports) so they can be unit-tested with `node --test`.
 * Times are interpreted in the device's local time zone (you're in Surabaya),
 * then each place converts the resulting instant into its own time zone.
 */

/** Quick-pick times, based on when her shifts end. */
export const TIME_PRESETS = ["18:00", "22:00", "00:00"] as const
export const STAY_OPTIONS = [0, 30, 45, 60, 90] as const

export type TimeChoice =
  | { kind: "now" }
  /** next occurrence of HH:MM — "00:30" picked at 21:00 means tonight after midnight */
  | { kind: "next"; hhmm: string }
  /** a specific local date + time, e.g. planning Saturday night */
  | { kind: "on"; date: string; hhmm: string }

export type StatusFilter = "all" | "wishlist" | "visited"

export type Filters = {
  time: TimeChoice
  /** where distances are measured from: GPS, or a saved location (anchor id) */
  from: "here" | number
  stay: number
  openOnly: boolean
  status: StatusFilter
  tags: number[]
  /** price levels to show ($ = 1 … $$$$ = 4); empty = any */
  price: number[]
}

export const PRICE_LEVELS = [1, 2, 3, 4] as const

export const DEFAULT_FILTERS: Filters = {
  time: { kind: "now" },
  from: "here",
  stay: 45,
  openOnly: false,
  status: "all",
  tags: [],
  price: [],
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const pad = (n: number) => String(n).padStart(2, "0")
export const toDateString = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function withTime(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

/** The instant the filter refers to. */
export function resolveTarget(choice: TimeChoice, now: number): Date {
  if (choice.kind === "now") return new Date(now)

  if (choice.kind === "next") {
    const d = withTime(new Date(now), choice.hhmm)
    if (d.getTime() <= now) d.setDate(d.getDate() + 1)
    return d
  }

  const [y, mo, day] = choice.date.split("-").map(Number)
  const d = withTime(new Date(y, mo - 1, day), choice.hhmm)
  // A stale link pointing at the past means "now", not yesterday.
  return d.getTime() < now ? new Date(now) : d
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** "Now", "Today 22:00", "Tonight 00:30", "Tomorrow 18:00", "Sat 22:00". */
export function targetLabel(choice: TimeChoice, target: Date, now: number): string {
  if (choice.kind === "now") return "Now"
  const time = `${pad(target.getHours())}:${pad(target.getMinutes())}`

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const targetDay = new Date(target)
  targetDay.setHours(0, 0, 0, 0)
  const days = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000)

  if (days === 0) return `Today ${time}`
  if (days === 1) return target.getHours() < 5 ? `Tonight ${time}` : `Tomorrow ${time}`
  return `${DAY_NAMES[target.getDay()]} ${time}`
}

export function parseFilters(params: URLSearchParams): Filters {
  const f: Filters = { ...DEFAULT_FILTERS, tags: [] }

  const at = params.get("at")
  if (at && HHMM.test(at)) f.time = { kind: "next", hhmm: at }
  else if (at && at.includes("T")) {
    const [date, hhmm] = at.split("T")
    if (DATE.test(date) && HHMM.test(hhmm)) f.time = { kind: "on", date, hhmm }
  }

  const from = Number(params.get("from"))
  if (Number.isInteger(from) && from > 0) f.from = from

  // Careful: Number(null) is 0, which is a valid option — only parse if present.
  const stayParam = params.get("stay")
  const stay = stayParam === null ? NaN : Number(stayParam)
  if ((STAY_OPTIONS as readonly number[]).includes(stay)) f.stay = stay

  f.openOnly = params.get("open") === "1"

  const status = params.get("status")
  if (status === "wishlist" || status === "visited") f.status = status

  f.tags = (params.get("tags") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

  f.price = [
    ...new Set(
      (params.get("price") ?? "")
        .split(",")
        .map(Number)
        .filter((n) => (PRICE_LEVELS as readonly number[]).includes(n)),
    ),
  ].sort((a, b) => a - b)

  return f
}

/** Query string without defaults, so a plain URL means default filters. */
export function serializeFilters(f: Filters): string {
  const p = new URLSearchParams()
  if (f.time.kind === "next") p.set("at", f.time.hhmm)
  if (f.time.kind === "on") p.set("at", `${f.time.date}T${f.time.hhmm}`)
  if (f.from !== "here") p.set("from", String(f.from))
  if (f.stay !== DEFAULT_FILTERS.stay) p.set("stay", String(f.stay))
  if (f.openOnly) p.set("open", "1")
  if (f.status !== "all") p.set("status", f.status)
  if (f.tags.length) p.set("tags", f.tags.join(","))
  if (f.price.length) p.set("price", f.price.join(","))
  return p.toString()
}

/** How many non-default filters are active (for the Filters button badge). Time and origin excluded. */
export function activeFilterCount(f: Filters): number {
  return (
    Number(f.stay !== DEFAULT_FILTERS.stay) +
    Number(f.openOnly) +
    Number(f.status !== "all") +
    Number(f.tags.length > 0) +
    Number(f.price.length > 0)
  )
}
