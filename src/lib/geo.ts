// No imports: unit-tested with `node --test`.

export type LatLng = { lat: number; lng: number }

/** Default viewport and search bias: central Surabaya. */
export const SURABAYA: LatLng = { lat: -7.2575, lng: 112.7521 }

export const isUuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export const isLatLng = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180

/** Straight-line ("as the crow flies") distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Rough trip estimate without the (paid) Routes API: roads are ~30% longer
 * than a straight line in a city grid, and ~25 km/h is a realistic night-time
 * average on a motorbike in Surabaya. Always shown with a "~".
 */
export const ROAD_FACTOR = 1.3
export const AVG_SPEED_KMH = 25

export type Trip = { km: number; minutes: number }

export function estimateTrip(from: LatLng, to: LatLng): Trip {
  const km = haversineKm(from, to) * ROAD_FACTOR
  return { km, minutes: Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60)) }
}

/** "350 m", "2.4 km", "12 km". */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
