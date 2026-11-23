import type { Interval } from "@/lib/hours"
import { createClient } from "@/lib/supabase/server"
import { tagCategoryOf } from "@/lib/tag-categories"
import type { Anchor, HoursSource, Person, Place, PlaceStatus, Tag } from "./types"

/** A tag row as the database returns it. */
export type RawTag = {
  id: number
  name: string
  emoji: string | null
  category: string | null
  tints_pin: boolean | null
}

export const TAG_SELECT = "id, name, emoji, category, tints_pin"

export const toTag = (r: RawTag): Tag => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji,
  category: tagCategoryOf(r.category),
  tintsPin: r.tints_pin === true,
})

type Row = {
  id: string
  google_place_id: string | null
  name: string
  address: string | null
  lat: number
  lng: number
  category: string | null
  kind: "food" | "venue"
  parent_id: string | null
  time_zone: string
  status: PlaceStatus
  notes: string | null
  hours_source: HoursSource
  business_status: string | null
  google_synced_at: string | null
  price_level: number | null
  price_min: number | string | null
  price_max: number | string | null
  price_currency: string | null
  price_manual: number | null
  place_hours: { open_min: number; close_min: number }[]
  place_tags: { tags: RawTag | null }[]
  place_ratings: { user_id: string; rating: number }[]
}

const SELECT = `
  id, google_place_id, name, address, lat, lng, category, kind, parent_id,
  time_zone, status, notes, hours_source, business_status, google_synced_at,
  price_level, price_min, price_max, price_currency, price_manual,
  place_hours ( open_min, close_min ),
  place_tags ( tags ( ${TAG_SELECT} ) ),
  place_ratings ( user_id, rating )
`

/**
 * Members' display names, for showing ratings by name.
 * Needs migration 0002; before it, RLS only returns your own row.
 */
export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("members").select("user_id, display_name")
  if (error) throw new Error(`Failed to load members: ${error.message}`)
  return (data as { user_id: string; display_name: string }[]).map((m) => ({
    id: m.user_id,
    name: m.display_name,
  }))
}

export async function getAnchors(): Promise<Anchor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("anchors").select("id, name, lat, lng").order("name")
  if (error) throw new Error(`Failed to load saved locations: ${error.message}`)
  return data as Anchor[]
}

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tags").select(TAG_SELECT).order("name")
  if (error) throw new Error(`Failed to load tags: ${error.message}`)
  return (data as RawTag[]).map(toTag)
}

/** All places (≈ a few hundred rows at most) — filtering happens in memory on the client. */
export async function getPlaces(): Promise<Place[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("places").select(SELECT).order("name")
  if (error) throw new Error(`Failed to load places: ${error.message}`)

  const rows = data as unknown as Row[]
  const byId = new Map(rows.map((r) => [r.id, r]))

  // Own hours, or null when we don't know them.
  const ownHours = (r: Row): Interval[] | null =>
    r.hours_source === "google" || r.hours_source === "manual"
      ? r.place_hours
          .map((h) => ({ open: h.open_min, close: h.close_min }))
          .sort((a, b) => a.open - b.open)
      : null

  // Mall tenants inherit their mall's hours (one level deep).
  const effectiveHours = (r: Row): Interval[] | null => {
    if (r.hours_source !== "inherit") return ownHours(r)
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined
    return parent ? ownHours(parent) : null
  }

  return rows.map((r) => ({
    id: r.id,
    googlePlaceId: r.google_place_id,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    category: r.category,
    kind: r.kind,
    parentId: r.parent_id,
    timeZone: r.time_zone,
    status: r.status,
    notes: r.notes,
    hoursSource: r.hours_source,
    hours: effectiveHours(r),
    businessStatus: r.business_status,
    googleSyncedAt: r.google_synced_at,
    priceLevel: r.price_manual ?? r.price_level,
    priceGoogleLevel: r.price_level,
    priceManual: r.price_manual,
    // numeric columns may arrive as strings
    priceRange:
      r.price_currency && (r.price_min !== null || r.price_max !== null)
        ? {
            min: r.price_min === null ? null : Number(r.price_min),
            max: r.price_max === null ? null : Number(r.price_max),
            currency: r.price_currency,
          }
        : null,
    tags: r.place_tags.flatMap((t) => (t.tags ? [toTag(t.tags)] : [])),
    ratings: r.place_ratings.map((x) => ({ userId: x.user_id, rating: x.rating })),
  }))
}
