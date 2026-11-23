// No imports: unit-tested with `node --test`.

/** Google lets us keep Places coordinates for at most 30 days: refresh well before. */
export const STALE_DAYS = 25
/** Cron budget per run (Place Details Enterprise: 1,000 free calls per month). */
export const DAILY_BATCH = 10
/** "Refresh" button: minimum minutes between two refreshes of the same place. */
export const COOLDOWN_MIN = 10

const DAY_MS = 86_400_000

/** Places last synced before this moment are due for a refresh. */
export function staleCutoff(now: number): Date {
  return new Date(now - STALE_DAYS * DAY_MS)
}

export function isStale(syncedAt: string | null, now: number): boolean {
  if (!syncedAt) return true
  const t = Date.parse(syncedAt)
  return Number.isNaN(t) || t < staleCutoff(now).getTime()
}

/**
 * Opening hours are only overwritten when Google is their source. Hours typed
 * in by hand ("manual") and a mall's hours ("inherit") are never replaced.
 */
export function refreshesHours(source: string): boolean {
  return source === "google" || source === "unknown"
}

/** Minutes until the refresh button may be used again for this place (0 = now). */
export function cooldownRemainingMin(syncedAt: string | null, now: number): number {
  if (!syncedAt) return 0
  const t = Date.parse(syncedAt)
  if (Number.isNaN(t)) return 0
  const left = COOLDOWN_MIN * 60_000 - (now - t)
  return left > 0 ? Math.ceil(left / 60_000) : 0
}

/**
 * 404 means Google no longer knows this place_id. Anything else (403 for a key
 * or quota problem, 429, 5xx) is not the place's fault and must not mark it.
 */
export function isGone(status: number): boolean {
  return status === 404
}

/** "SYNCED TODAY", "SYNCED 3 DAYS AGO", "NEVER SYNCED". */
export function syncedAgoLabel(syncedAt: string | null, now: number): string {
  if (!syncedAt) return "NEVER SYNCED"
  const t = Date.parse(syncedAt)
  if (Number.isNaN(t)) return "NEVER SYNCED"
  const days = Math.floor((now - t) / DAY_MS)
  if (days <= 0) return "SYNCED TODAY"
  if (days === 1) return "SYNCED YESTERDAY"
  return `SYNCED ${days} DAYS AGO`
}
