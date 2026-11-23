import type { Interval } from "@/lib/hours"

export type PlaceStatus = "wishlist" | "visited"
export type HoursSource = "google" | "manual" | "inherit" | "unknown"

export type Tag = { id: number; name: string; emoji: string | null }

/** A member of the couple, for showing ratings by name. */
export type Person = { id: string; name: string }

/** A saved starting point, e.g. "Her office" or "Home". */
export type Anchor = { id: number; name: string; lat: number; lng: number }

/** A place as the client sees it, with hours already resolved. */
export type Place = {
  id: string
  googlePlaceId: string | null
  name: string
  address: string | null
  lat: number
  lng: number
  category: string | null
  kind: "food" | "venue"
  parentId: string | null
  timeZone: string
  status: PlaceStatus
  notes: string | null
  hoursSource: HoursSource
  /** Effective hours (own, or the mall's when inherited). null = unknown. */
  hours: Interval[] | null
  businessStatus: string | null
  /** When the Google data was last refreshed; null = never (or not from Google). */
  googleSyncedAt: string | null
  tags: Tag[]
  ratings: { userId: string; rating: number }[]
}
