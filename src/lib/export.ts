/**
 * Everything on the map as one JSON document, for a backup you keep yourself.
 * Readable on its own (names instead of ids where it helps, hours spelled out)
 * and complete enough to rebuild the data from (raw hour intervals, ids).
 *
 * Only imports pure modules so it can be unit-tested with `node --test`.
 */
import { intervalsToDraft, summarizeDraft } from "./hours-editor.ts"
import type { Anchor, Person, Place, Tag } from "./places/types"

export const EXPORT_FORMAT = 1

export type ExportInput = {
  places: Place[]
  tags: Tag[]
  anchors: Anchor[]
  people: Person[]
  version: string
  exportedAt: Date
}

export function buildExport({ places, tags, anchors, people, version, exportedAt }: ExportInput) {
  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  return {
    app: "food-map",
    format: EXPORT_FORMAT,
    version,
    exportedAt: exportedAt.toISOString(),
    counts: { places: places.length, tags: tags.length, savedLocations: anchors.length },
    people: people.map((p) => ({ id: p.id, name: p.name })),
    places: places.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      googlePlaceId: p.googlePlaceId,
      businessStatus: p.businessStatus,
      googleSyncedAt: p.googleSyncedAt,
      hours: {
        source: p.hoursSource,
        timeZone: p.timeZone,
        // "MON–THU 18:00–02:00"; null when the hours aren't known
        week: p.hours
          ? summarizeDraft(intervalsToDraft(p.hours)).map((l) => `${l.days} ${l.hours}`)
          : null,
        // minute of the week, 0 = Sunday 00:00 (see hours.ts)
        intervals: p.hours?.map((i) => ({ open: i.open, close: i.close })) ?? null,
      },
      price: {
        level: p.priceLevel,
        setByHand: p.priceManual !== null,
        google: p.priceGoogleLevel,
        range: p.priceRange,
      },
      tags: p.tags.map((t) => t.name),
      reviews: p.reviews.map((r) => ({
        by: nameOf.get(r.userId) ?? null,
        userId: r.userId,
        rating: r.rating,
        note: r.note,
      })),
    })),
    tags: tags.map((t) => ({ name: t.name, emoji: t.emoji, category: t.category, tintsPin: t.tintsPin })),
    savedLocations: anchors.map((a) => ({ name: a.name, lat: a.lat, lng: a.lng, icon: a.icon })),
  }
}

/** food-map-2026-11-25.json, dated where the map is (Surabaya). */
export function exportFileName(at: Date, timeZone = "Asia/Jakarta"): string {
  // en-CA formats a date as YYYY-MM-DD
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at)
  return `food-map-${day}.json`
}
