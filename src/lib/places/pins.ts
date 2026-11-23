import type { Filters } from "@/lib/filters"
import { estimateTrip, type LatLng, type Trip } from "@/lib/geo"
import { getOpenState, minuteOfWeek, type OpenState } from "@/lib/hours"
import type { Place } from "./types"

/** A place plus everything derived for the current time/origin/filters. */
export type Pin = {
  place: Place
  /** minute-of-week of the estimated arrival (in the place's time zone) */
  t: number
  /** open state at arrival */
  state: OpenState
  /** open for the whole stay after arrival */
  fits: boolean
  /** passes the status + tag filters */
  matches: boolean
  trip: Trip | null
  arrival: Date
  /** Google says it is closed for good / for now: overrides the opening hours */
  closure: "permanent" | "temporary" | null
  /** has a tag that tints the pin (drink, dessert) */
  tinted: boolean
}

function closureOf(businessStatus: string | null): Pin["closure"] {
  if (businessStatus === "CLOSED_PERMANENTLY") return "permanent"
  if (businessStatus === "CLOSED_TEMPORARILY") return "temporary"
  return null
}

/**
 * Open state of every food place *when you'd arrive*: target time + rough
 * travel time from the origin (when known).
 */
export function computePins(
  places: Place[],
  targetMs: number,
  origin: LatLng | null,
  filters: Pick<Filters, "stay" | "status" | "tags" | "price">,
): Pin[] {
  const soon = Math.max(60, filters.stay) // amber = closes within the hour or before you'd finish
  return places
    .filter((p) => p.kind === "food")
    .map((place) => {
      const trip = origin ? estimateTrip(origin, place) : null
      const arrival = new Date(targetMs + (trip ? trip.minutes * 60_000 : 0))
      const t = minuteOfWeek(arrival, place.timeZone)
      const closure = closureOf(place.businessStatus)
      const state: OpenState = closure
        ? { status: "closed", opensIn: null, opensAt: null }
        : getOpenState(place.hours, t, soon)
      const fits =
        (state.status === "open" || state.status === "closing") &&
        state.minutesLeft >= Math.max(filters.stay, 1)
      const matches =
        (filters.status === "all" || place.status === filters.status) &&
        (filters.tags.length === 0 || place.tags.some((tag) => filters.tags.includes(tag.id))) &&
        // places with no price at all can't match a price filter
        (filters.price.length === 0 ||
          (place.priceLevel !== null && filters.price.includes(place.priceLevel)))
      const tinted = place.tags.some((tag) => tag.tintsPin)
      return { place, t, state, fits, matches, trip, arrival, closure, tinted }
    })
}

export type SortKey = "nearest" | "latest" | "name"

export const SORT_LABELS: Record<SortKey, string> = {
  nearest: "Nearest",
  latest: "Open latest",
  name: "A–Z",
}

/** Places you can actually go to come first; within each group, by `key`. */
export function sortPins(pins: Pin[], key: SortKey): Pin[] {
  const minutesLeft = (p: Pin) =>
    p.state.status === "open" || p.state.status === "closing" ? p.state.minutesLeft : -1
  const opensIn = (p: Pin) =>
    p.state.status === "closed" && p.state.opensIn !== null ? p.state.opensIn : Infinity

  const byKey = (a: Pin, b: Pin): number => {
    if (key === "nearest") return (a.trip?.km ?? Infinity) - (b.trip?.km ?? Infinity)
    if (key === "latest") {
      // open: closes latest first; closed: opens soonest first
      return minutesLeft(b) - minutesLeft(a) || opensIn(a) - opensIn(b)
    }
    return a.place.name.localeCompare(b.place.name)
  }

  return [...pins].sort(
    (a, b) => Number(b.fits) - Number(a.fits) || byKey(a, b) || a.place.name.localeCompare(b.place.name),
  )
}
