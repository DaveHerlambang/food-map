/**
 * Server-side Google Places API (New) client. Uses GOOGLE_PLACES_SERVER_KEY,
 * which must never reach the browser — only import this from Route Handlers
 * and Server Actions.
 *
 * Cost notes:
 * - Autocomplete + Details share one `sessionToken`, so the keystroke requests
 *   are free when the session ends in a Details call.
 * - Details is billed at the highest tier of the requested fields.
 *   `regularOpeningHours`, `priceLevel` and `priceRange` all sit in "Place Details
 *   Enterprise" (1,000 free/month), so asking for prices costs nothing extra.
 *   Do NOT add Atmosphere fields (reviews, photos, servesBeer…) or use "*".
 */
import type { GooglePeriod } from "@/lib/hours"
import type { LatLng } from "@/lib/geo"
import type { GoogleMoney } from "@/lib/price"

const BASE = "https://places.googleapis.com/v1"

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "primaryType",
  "businessStatus",
  "regularOpeningHours",
  "priceLevel",
  "priceRange",
].join(",")

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_SERVER_KEY
  if (!key) throw new Error("Missing environment variable: GOOGLE_PLACES_SERVER_KEY")
  return key
}

async function googleFetch<T>(url: string, init: RequestInit & { fieldMask: string }) {
  const { fieldMask, headers, ...rest } = init
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": fieldMask,
      ...headers,
    },
  })
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500)
    throw new GooglePlacesError(res.status, `Google Places ${res.status}: ${body}`)
  }
  return (await res.json()) as T
}

/** A non-2xx answer from Google, with its HTTP status (404 = unknown place_id). */
export class GooglePlacesError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "GooglePlacesError"
  }
}

export type Suggestion = { placeId: string; main: string; secondary: string }

export async function autocomplete(
  input: string,
  sessionToken: string,
  bias: LatLng,
): Promise<Suggestion[]> {
  type Response = {
    suggestions?: {
      placePrediction?: {
        placeId: string
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }
      }
    }[]
  }

  const data = await googleFetch<Response>(`${BASE}/places:autocomplete`, {
    method: "POST",
    fieldMask:
      "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["id"],
      languageCode: "id",
      locationBias: {
        circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 30_000 },
      },
    }),
  })

  return (data.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction
    if (!p) return []
    return [
      {
        placeId: p.placeId,
        main: p.structuredFormat?.mainText?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
      },
    ]
  })
}

export type PlaceDetails = {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  location: { latitude: number; longitude: number }
  primaryType?: string
  businessStatus?: string
  regularOpeningHours?: { periods?: GooglePeriod[] }
  /** e.g. "PRICE_LEVEL_MODERATE" */
  priceLevel?: string
  priceRange?: { startPrice?: GoogleMoney; endPrice?: GoogleMoney }
}

/**
 * Coordinates + address only — "Place Details Essentials" (10,000 free/month),
 * much cheaper than getPlaceDetails. Used for saved locations like "Her office".
 */
export async function getPlaceLocation(placeId: string, sessionToken?: string) {
  const params = new URLSearchParams({ languageCode: "id" })
  if (sessionToken) params.set("sessionToken", sessionToken)
  return googleFetch<Pick<PlaceDetails, "location" | "formattedAddress">>(
    `${BASE}/places/${encodeURIComponent(placeId)}?${params}`,
    { method: "GET", fieldMask: "location,formattedAddress" },
  )
}

export async function getPlaceDetails(placeId: string, sessionToken?: string) {
  const params = new URLSearchParams({ languageCode: "id" })
  if (sessionToken) params.set("sessionToken", sessionToken)
  return googleFetch<PlaceDetails>(
    `${BASE}/places/${encodeURIComponent(placeId)}?${params}`,
    { method: "GET", fieldMask: DETAILS_FIELD_MASK },
  )
}
