import type { Interval } from "@/lib/hours"
import type { AnchorIcon } from "@/lib/anchor-icons"
import type { PriceRange } from "@/lib/price"
import type { TagCategory } from "@/lib/tag-categories"

export type PlaceStatus = "wishlist" | "visited"
export type HoursSource = "google" | "manual" | "unknown"

export type Tag = {
  id: number
  name: string
  emoji: string | null
  /** how the pickers group it */
  category: TagCategory
  /** places with this tag get a tinted pin (drink, dessert) */
  tintsPin: boolean
}

/** A person's own stars and note on a place. At least one of the two is set. */
export type Review = { userId: string; rating: number | null; note: string | null }

/** A member of the couple, for showing ratings by name. */
export type Person = { id: string; name: string }

/** A saved starting point, e.g. "Her office" or "Home". */
export type Anchor = { id: number; name: string; lat: number; lng: number; icon: AnchorIcon }

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
  timeZone: string
  status: PlaceStatus
  hoursSource: HoursSource
  /** Opening hours; null = unknown. */
  hours: Interval[] | null
  businessStatus: string | null
  /** When the Google data was last refreshed; null = never (or not from Google). */
  googleSyncedAt: string | null
  /** Price level shown ($ = 1 … $$$$ = 4): what you set by hand, else Google's. null = unknown. */
  priceLevel: number | null
  /** Google's own level: what "AUTO" resolves to when editing */
  priceGoogleLevel: number | null
  /** The level you set by hand; null = following Google */
  priceManual: number | null
  /** Google's price range, e.g. Rp 25.000–50.000 */
  priceRange: PriceRange | null
  tags: Tag[]
  /** One per person who rated it or wrote a note; each person edits only their own. */
  reviews: Review[]
}
