import type { SupabaseClient } from "@supabase/supabase-js"
import { fromGooglePeriods } from "@/lib/hours"
import type { HoursSource } from "@/lib/places/types"
import { isGone, refreshesHours } from "@/lib/refresh-policy"
import { getPlaceDetails, GooglePlacesError } from "./places"

export type RefreshResult =
  | { ok: true; hoursUpdated: boolean }
  | { ok: false; gone: boolean; error: string }

/**
 * Re-fetches one place from Google (one Place Details call) and applies it in a
 * single database transaction (migration 0003). Shared by the daily cron (admin
 * client) and the "Refresh" button (the signed-in member's client).
 *
 * Never touches notes, tags, ratings or status. Hours are only replaced when
 * Google is their source (see refreshesHours), and only when Google actually
 * returned some: a place that comes back without hours keeps the ones it had.
 */
export async function refreshPlaceFromGoogle(
  supabase: SupabaseClient,
  place: { id: string; googlePlaceId: string; hoursSource: HoursSource },
): Promise<RefreshResult> {
  let details
  try {
    details = await getPlaceDetails(place.googlePlaceId)
  } catch (err) {
    if (err instanceof GooglePlacesError && isGone(err.status)) {
      // Google no longer knows this place_id. Record it and count the place as
      // synced, so it moves to the back of the queue instead of being retried daily.
      await supabase
        .from("places")
        .update({ business_status: "NOT_FOUND", google_synced_at: new Date().toISOString() })
        .eq("id", place.id)
      return { ok: false, gone: true, error: "Google no longer has this place" }
    }
    // Key, quota or network trouble: leave the place alone, it will be retried.
    return { ok: false, gone: false, error: err instanceof Error ? err.message : "Google request failed" }
  }

  const periods = details.regularOpeningHours?.periods
  const intervals = periods?.length ? fromGooglePeriods(periods) : null
  const hours = refreshesHours(place.hoursSource) ? intervals : null // null = leave hours alone

  const { error } = await supabase.rpc("apply_google_refresh", {
    p_place_id: place.id,
    p_lat: details.location.latitude,
    p_lng: details.location.longitude,
    p_name: details.displayName?.text ?? null,
    p_address: details.formattedAddress ?? null,
    p_category: details.primaryType ?? null,
    p_business_status: details.businessStatus ?? null,
    p_hours: hours ? hours.map((i) => ({ open: i.open, close: i.close })) : null,
    p_hours_source: hours ? "google" : null,
  })
  if (error) return { ok: false, gone: false, error: `database: ${error.message}` }

  return { ok: true, hoursUpdated: hours !== null }
}
