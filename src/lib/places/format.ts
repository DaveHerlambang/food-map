import { formatKm, type Trip } from "@/lib/geo"
import { DAY, formatClock, type OpenState } from "@/lib/hours"
import type { Place } from "./types"

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

/** Visual treatment of a status on the receipt. */
export type Tone = "open" | "soon" | "closed" | "unknown"

/** "SAT " when the next opening isn't today, else "". */
function opensDay(state: Extract<OpenState, { status: "closed" }>, t: number): string {
  if (state.opensAt === null || state.opensIn === null) return ""
  const minutesLeftToday = DAY - (t % DAY)
  return state.opensIn < minutesLeftToday ? "" : `${DAY_NAMES[Math.floor(state.opensAt / DAY)]} `
}

/**
 * Receipt status line, e.g. "OPEN TIL 02:00", "CLOSES 22:45 · TOO SHORT",
 * "VOID · OPENS 06:00". `fits` = open for the whole stay after arrival.
 */
export function receiptStatus(state: OpenState, t: number, fits: boolean): { tone: Tone; text: string } {
  switch (state.status) {
    case "unknown":
      return { tone: "unknown", text: "HOURS UNKNOWN" }
    case "closed":
      return state.opensAt === null
        ? { tone: "closed", text: "VOID · CLOSED ALL WEEK" }
        : { tone: "closed", text: `VOID · OPENS ${opensDay(state, t)}${formatClock(state.opensAt)}` }
    case "open":
      if (state.closesAt === null) return { tone: "open", text: "OPEN 24 HOURS" }
      return fits
        ? { tone: "open", text: `OPEN TIL ${formatClock(state.closesAt)}` }
        : { tone: "soon", text: `CLOSES ${formatClock(state.closesAt)} · TOO SHORT` }
    case "closing":
      return {
        tone: "soon",
        text: `CLOSES ${formatClock(state.closesAt ?? 0)}${fits ? "" : " · TOO SHORT"}`,
      }
  }
}

/** Short label on a map pin: distance when open, closing time when soon. */
export function pinLabel(state: OpenState, trip: Trip | null): string {
  if (state.status === "unknown") return "?"
  if (state.status === "closed") return "VOID"
  if (state.status === "closing") return formatClock(state.closesAt ?? 0)
  if (trip) return receiptKm(trip.km)
  return state.closesAt === null ? "24H" : formatClock(state.closesAt)
}

/** "1.2KM", "350M" */
export const receiptKm = (km: number) => formatKm(km).replace(" ", "").toUpperCase()

/** "TUE 24 NOV · 22:00" in the device's time zone. */
export function receiptDate(d: Date): string {
  const date = d
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .replace(",", "")
    .toUpperCase()
  return `${date} · ${clock(d)}`
}

/** "22:04" for a Date in the device's time zone. */
export const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

/** Google Maps deep link: opens turn-by-turn in the Maps app, no Directions API cost. */
export function mapsDirectionsUrl(place: Pick<Place, "lat" | "lng" | "googlePlaceId">): string {
  const params = new URLSearchParams({ api: "1", destination: `${place.lat},${place.lng}` })
  if (place.googlePlaceId) params.set("destination_place_id", place.googlePlaceId)
  return `https://www.google.com/maps/dir/?${params}`
}
