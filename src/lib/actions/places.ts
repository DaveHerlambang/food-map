"use server"

import { refresh } from "next/cache"
import { getMember } from "@/lib/auth"
import { isUuid, type LatLng } from "@/lib/geo"
import { getPlaceDetails } from "@/lib/google/places"
import { refreshPlaceFromGoogle } from "@/lib/google/refresh"
import { fromGooglePeriods, mergeIntervals, WEEK, type Interval } from "@/lib/hours"
import { TAG_SELECT, toTag, type RawTag } from "@/lib/places/queries"
import type { HoursSource, PlaceStatus, Tag } from "@/lib/places/types"
import { levelFromGoogle, parseGoogleRange } from "@/lib/price"
import { cooldownRemainingMin } from "@/lib/refresh-policy"
import { isTagCategory, normalizeTagName, type TagCategory } from "@/lib/tag-categories"

export type AddPlaceResult =
  | ({ ok: true; placeId: string; existed: boolean } & LatLng)
  | { ok: false; error: string }

/**
 * Pins a Google place: one Place Details call (ending the autocomplete
 * session), then insert the place + its hours. Re-adding an existing place
 * is free — we check the database before calling Google.
 */
export async function addPlaceFromGoogle(
  googlePlaceId: string,
  sessionToken: string,
): Promise<AddPlaceResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  const { supabase } = member

  if (typeof googlePlaceId !== "string" || !/^[\w-]{10,300}$/.test(googlePlaceId)) {
    return { ok: false, error: "Invalid place." }
  }

  const findExisting = async () => {
    const { data } = await supabase
      .from("places")
      .select("id, lat, lng")
      .eq("google_place_id", googlePlaceId)
      .maybeSingle()
    return data as ({ id: string } & LatLng) | null
  }

  const existing = await findExisting()
  if (existing) {
    return { ok: true, placeId: existing.id, existed: true, lat: existing.lat, lng: existing.lng }
  }

  let details
  try {
    details = await getPlaceDetails(googlePlaceId, isUuid(sessionToken) ? sessionToken : undefined)
  } catch (err) {
    console.error("[addPlaceFromGoogle] details", err)
    return { ok: false, error: "Couldn't load this place from Google. Try again." }
  }

  const periods = details.regularOpeningHours?.periods
  const intervals = periods?.length ? fromGooglePeriods(periods) : null
  const lat = details.location.latitude
  const lng = details.location.longitude
  const range = parseGoogleRange(details.priceRange)

  const { data: inserted, error } = await supabase
    .from("places")
    .insert({
      google_place_id: googlePlaceId,
      name: details.displayName?.text ?? "Unnamed place",
      address: details.formattedAddress ?? null,
      lat,
      lng,
      category: details.primaryType ?? null,
      business_status: details.businessStatus ?? null,
      hours_source: intervals ? "google" : "unknown",
      price_level: levelFromGoogle(details.priceLevel),
      price_min: range?.min ?? null,
      price_max: range?.max ?? null,
      price_currency: range?.currency ?? null,
      google_synced_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    // Both of you added the same place at the same moment.
    if (error.code === "23505") {
      const again = await findExisting()
      if (again) return { ok: true, placeId: again.id, existed: true, lat: again.lat, lng: again.lng }
    }
    console.error("[addPlaceFromGoogle] insert", error)
    return { ok: false, error: "Couldn't save the place." }
  }

  if (intervals?.length) {
    const { error: hoursError } = await supabase.from("place_hours").insert(
      intervals.map((i) => ({ place_id: inserted.id, open_min: i.open, close_min: i.close })),
    )
    if (hoursError) {
      // No transactions over the REST API: undo the place so we never keep a
      // place that claims Google hours but has none.
      await supabase.from("places").delete().eq("id", inserted.id)
      console.error("[addPlaceFromGoogle] hours", hoursError)
      return { ok: false, error: "Couldn't save the opening hours." }
    }
  }

  refresh()
  return { ok: true, placeId: inserted.id, existed: false, lat, lng }
}

export type ActionResult = { ok: true } | { ok: false; error: string }

export type PlaceEdit = {
  status: PlaceStatus
  tagIds: number[]
  /** Your own rating; null removes it. */
  rating: number | null
  /** Your own note; empty removes it. */
  note: string
  /** Price level you set by hand ($ = 1 … $$$$ = 4); null = use Google's. */
  price: number | null
}

/** Saves the edit form: status, price, tag set, and the caller's own rating and note. */
export async function updatePlace(placeId: string, edit: PlaceEdit): Promise<ActionResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  const { supabase, userId } = member

  if (!isUuid(placeId)) return { ok: false, error: "Invalid place." }
  if (edit.status !== "wishlist" && edit.status !== "visited") {
    return { ok: false, error: "Invalid status." }
  }
  const note = typeof edit.note === "string" ? edit.note.trim().slice(0, 2000) : ""
  const tagIds = Array.isArray(edit.tagIds)
    ? [...new Set(edit.tagIds.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 50)
    : []
  const rating = edit.rating
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return { ok: false, error: "Rating must be 1–5." }
  }
  const price = edit.price
  if (price !== null && !(Number.isInteger(price) && price >= 1 && price <= 4)) {
    return { ok: false, error: "Price must be $ to $$$$." }
  }

  const { data: updated, error } = await supabase
    .from("places")
    .update({ status: edit.status, price_manual: price })
    .eq("id", placeId)
    .select("id")
  if (error) return fail("update place", error)
  if (!updated?.length) return { ok: false, error: "This place no longer exists." }

  // Tags: remove the ones that were unticked, add the new ones.
  let removeTags = supabase.from("place_tags").delete().eq("place_id", placeId)
  if (tagIds.length) removeTags = removeTags.not("tag_id", "in", `(${tagIds.join(",")})`)
  const { error: removeError } = await removeTags
  if (removeError) return fail("remove tags", removeError)

  if (tagIds.length) {
    const { error: addError } = await supabase
      .from("place_tags")
      .upsert(
        tagIds.map((tag_id) => ({ place_id: placeId, tag_id })),
        { onConflict: "place_id,tag_id", ignoreDuplicates: true },
      )
    if (addError) return fail("add tags", addError)
  }

  // Rating and note: per person, in one row, so only ever touch the caller's
  // own row. No stars and no note = no row.
  const { error: reviewError } =
    rating === null && !note
      ? await supabase.from("place_ratings").delete().eq("place_id", placeId).eq("user_id", userId)
      : await supabase
          .from("place_ratings")
          .upsert(
            { place_id: placeId, user_id: userId, rating, comment: note || null },
            { onConflict: "place_id,user_id" },
          )
  if (reviewError) return fail("rating and note", reviewError)

  refresh()
  return { ok: true }
}

export type CreateTagResult = { ok: true; tag: Tag } | { ok: false; error: string }

/**
 * Creates a tag in a category, or returns the existing one if the name matches
 * (ignoring case, spaces and hyphens: "Street Food" is "street-food").
 */
export async function createTag(rawName: string, category: TagCategory): Promise<CreateTagResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  const { supabase } = member

  const name = typeof rawName === "string" ? rawName.trim().replace(/\s+/g, " ") : ""
  if (!name || name.length > 30) return { ok: false, error: "Tag names are 1–30 characters." }
  if (!isTagCategory(category)) return { ok: false, error: "Pick a category." }

  // A few dozen tags at most, so comparing in JS is simpler than escaping ILIKE.
  const { data: all, error: listError } = await supabase.from("tags").select(TAG_SELECT)
  if (listError) return fail("list tags", listError)
  const existing = (all as RawTag[]).find((t) => normalizeTagName(t.name) === normalizeTagName(name))
  if (existing) return { ok: true, tag: toTag(existing) }

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({ name, category })
    .select(TAG_SELECT)
    .single()
  if (error) return fail("create tag", error)
  return { ok: true, tag: toTag(tag as RawTag) }
}

export async function deletePlace(placeId: string): Promise<ActionResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  if (!isUuid(placeId)) return { ok: false, error: "Invalid place." }

  // Hours, tags and ratings go with it (ON DELETE CASCADE).
  const { error } = await member.supabase.from("places").delete().eq("id", placeId)
  if (error) return fail("delete place", error)

  refresh()
  return { ok: true }
}

/**
 * "Refresh" button: re-fetch one place from Google right now (one billable
 * Place Details call). Same code path as the daily cron.
 */
export async function refreshPlace(placeId: string): Promise<ActionResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  if (!isUuid(placeId)) return { ok: false, error: "Invalid place." }

  const { data: row, error } = await member.supabase
    .from("places")
    .select("id, google_place_id, hours_source, google_synced_at")
    .eq("id", placeId)
    .maybeSingle()
  if (error) return fail("load place to refresh", error)
  if (!row) return { ok: false, error: "This place no longer exists." }
  if (!row.google_place_id) return { ok: false, error: "This place isn't linked to Google." }

  // One tap is one billable call: ignore accidental repeats.
  const wait = cooldownRemainingMin(row.google_synced_at, Date.now())
  if (wait > 0) return { ok: false, error: `Already refreshed. Try again in ${wait} min.` }

  const result = await refreshPlaceFromGoogle(member.supabase, {
    id: row.id,
    googlePlaceId: row.google_place_id,
    hoursSource: row.hours_source as HoursSource,
  })
  if (!result.ok) {
    console.error("[places] refresh", result.error)
    return {
      ok: false,
      error: result.gone ? "Google no longer lists this place." : "Couldn't reach Google. Try again.",
    }
  }

  refresh()
  return { ok: true }
}

/** Hours from the client, checked and merged; null if anything is off. */
function cleanIntervals(input: unknown): Interval[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) return null
  const valid = input.every(
    (i) =>
      i !== null &&
      typeof i === "object" &&
      Number.isInteger(i.open) &&
      Number.isInteger(i.close) &&
      i.open >= 0 &&
      i.open < WEEK &&
      i.close > i.open &&
      i.close - i.open <= WEEK,
  )
  return valid ? mergeIntervals((input as Interval[]).map(({ open, close }) => ({ open, close }))) : null
}

type Supabase = NonNullable<Awaited<ReturnType<typeof getMember>>>["supabase"]

/** Replaces a place's hours. No transactions over the REST API: delete, then insert. */
async function writeHours(supabase: Supabase, placeId: string, intervals: Interval[]) {
  const { error: deleteError } = await supabase.from("place_hours").delete().eq("place_id", placeId)
  if (deleteError) return deleteError
  const { error } = await supabase
    .from("place_hours")
    .insert(intervals.map((i) => ({ place_id: placeId, open_min: i.open, close_min: i.close })))
  return error
}

/**
 * Sets a place's hours by hand. They are yours from then on: Google's
 * refreshes (manual or the daily cron) never overwrite manual hours.
 */
export async function setPlaceHours(placeId: string, intervals: Interval[]): Promise<ActionResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  const { supabase } = member
  if (!isUuid(placeId)) return { ok: false, error: "Invalid place." }
  const clean = cleanIntervals(intervals)
  if (!clean) return { ok: false, error: "These hours don't look right." }

  const { data: updated, error } = await supabase
    .from("places")
    .update({ hours_source: "manual" })
    .eq("id", placeId)
    .select("id")
  if (error) return fail("set hours source", error)
  if (!updated?.length) return { ok: false, error: "This place no longer exists." }

  const hoursError = await writeHours(supabase, placeId, clean)
  if (hoursError) {
    // Never claim hours we don't have.
    await supabase.from("places").update({ hours_source: "unknown" }).eq("id", placeId)
    return fail("write hours", hoursError)
  }

  refresh()
  return { ok: true }
}

/** Hands a Google place's hours back to Google and fetches them right away. */
export async function followGoogleHours(placeId: string): Promise<ActionResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  const { supabase } = member
  if (!isUuid(placeId)) return { ok: false, error: "Invalid place." }

  const { data: row, error } = await supabase
    .from("places")
    .select("id, google_place_id")
    .eq("id", placeId)
    .maybeSingle()
  if (error) return fail("load place", error)
  if (!row) return { ok: false, error: "This place no longer exists." }
  if (!row.google_place_id) return { ok: false, error: "This place isn't on Google." }

  const { error: sourceError } = await supabase.from("places").update({ hours_source: "google" }).eq("id", placeId)
  if (sourceError) return fail("set hours source", sourceError)

  const result = await refreshPlaceFromGoogle(supabase, {
    id: row.id,
    googlePlaceId: row.google_place_id,
    hoursSource: "google",
  })
  refresh()
  if (!result.ok) {
    console.error("[places] follow google hours", result.error)
    return { ok: false, error: "Back on Google's hours, but Google couldn't be reached. They'll update on the next refresh." }
  }
  return { ok: true }
}

export type AddManualResult = ({ ok: true; placeId: string } & LatLng) | { ok: false; error: string }

/**
 * Adds a place that isn't on Google (or is on Google in the wrong spot): a
 * name, a pin, and hours if you know them. Google never refreshes it.
 */
export async function addManualPlace(input: {
  name: string
  lat: number
  lng: number
  hours: Interval[] | null
}): Promise<AddManualResult> {
  const member = await getMember()
  if (!member) return { ok: false, error: "Not signed in." }
  const { supabase } = member

  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : ""
  if (!name || name.length > 80) return { ok: false, error: "Give it a name (up to 80 characters)." }
  const { lat, lng } = input
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, error: "Invalid location." }
  }
  const hours = input.hours === null ? null : cleanIntervals(input.hours)
  if (input.hours !== null && !hours) return { ok: false, error: "These hours don't look right." }

  const { data: inserted, error } = await supabase
    .from("places")
    .insert({ google_place_id: null, name, lat, lng, hours_source: hours ? "manual" : "unknown" })
    .select("id")
    .single()
  if (error) return fail("insert manual place", error)

  if (hours) {
    const hoursError = await writeHours(supabase, inserted.id, hours)
    if (hoursError) {
      await supabase.from("places").delete().eq("id", inserted.id)
      return fail("manual place hours", hoursError)
    }
  }

  refresh()
  return { ok: true, placeId: inserted.id, lat, lng }
}

function fail(step: string, error: { message: string }): { ok: false; error: string } {
  console.error(`[places] ${step}:`, error)
  return { ok: false, error: "Couldn't save. Try again." }
}
