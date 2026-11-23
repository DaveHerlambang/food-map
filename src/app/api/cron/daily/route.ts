import { isAuthorizedCron } from "@/lib/cron-auth"
import { refreshPlaceFromGoogle } from "@/lib/google/refresh"
import type { HoursSource } from "@/lib/places/types"
import { DAILY_BATCH, staleCutoff } from "@/lib/refresh-policy"
import { createAdminClient } from "@/lib/supabase/admin"

// 60 s is allowed on every Vercel plan and ample for 10 places (≈1 s each).
export const maxDuration = 60
const TIME_BUDGET_MS = 45_000

type StaleRow = {
  id: string
  name: string
  google_place_id: string
  hours_source: HoursSource
  google_synced_at: string | null
}

/**
 * Daily job (vercel.json → crons, 03:00 WIB). Vercel calls it with
 * `Authorization: Bearer <CRON_SECRET>`. It
 *  1. touches the database, which keeps the free Supabase project from pausing, and
 *  2. refreshes the Google data of places not synced for 25+ days, oldest first,
 *     at most DAILY_BATCH per run.
 *
 * Safe to run twice (Vercel may deliver twice and never retries): a refreshed
 * place is no longer stale. `?dry=1` lists what would be refreshed and calls
 * neither Google nor the write path.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const started = Date.now()
  const dryRun = new URL(request.url).searchParams.get("dry") === "1"
  const supabase = createAdminClient()
  const stale = `google_synced_at.is.null,google_synced_at.lt.${staleCutoff(started).toISOString()}`

  const [counted, listed] = await Promise.all([
    supabase
      .from("places")
      .select("id", { count: "exact", head: true })
      .not("google_place_id", "is", null)
      .or(stale),
    supabase
      .from("places")
      .select("id, name, google_place_id, hours_source, google_synced_at")
      .not("google_place_id", "is", null)
      .or(stale)
      .order("google_synced_at", { ascending: true, nullsFirst: true })
      .limit(DAILY_BATCH),
  ])
  if (counted.error || listed.error) {
    console.error("[cron/daily] query failed", counted.error ?? listed.error)
    return Response.json({ ok: false, error: "database query failed" }, { status: 500 })
  }

  const batch = (listed.data ?? []) as StaleRow[]
  const stillStale = counted.count ?? batch.length

  if (dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      stale: stillStale,
      wouldRefresh: batch.map((p) => ({ name: p.name, lastSynced: p.google_synced_at })),
    })
  }

  let refreshed = 0
  let skipped = 0
  const failed: { name: string; reason: string }[] = []
  for (const [i, place] of batch.entries()) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      skipped = batch.length - i
      break
    }
    const result = await refreshPlaceFromGoogle(supabase, {
      id: place.id,
      googlePlaceId: place.google_place_id,
      hoursSource: place.hours_source,
    })
    if (result.ok) refreshed++
    else failed.push({ name: place.name, reason: result.gone ? "no longer on Google" : result.error.slice(0, 120) })
  }

  const summary = {
    ok: true,
    dryRun: false,
    stale: stillStale,
    processed: refreshed + failed.length,
    refreshed,
    failed,
    skipped,
    ms: Date.now() - started,
  }
  console.log("[cron/daily]", JSON.stringify(summary))
  return Response.json(summary)
}
