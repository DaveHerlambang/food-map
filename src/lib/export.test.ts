import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { buildExport, exportFileName } from "./export.ts"
import type { Place } from "./places/types"

const DAY = 1440

const place = (over: Partial<Place> = {}): Place => ({
  id: "p1",
  googlePlaceId: "g1",
  name: "Soto Ayam",
  address: "Jl. Somewhere 1",
  lat: -7.26,
  lng: 112.75,
  category: "Restaurant",
  kind: "food",
  timeZone: "Asia/Jakarta",
  status: "visited",
  hoursSource: "manual",
  // every day 18:00–02:00
  hours: Array.from({ length: 7 }, (_, d) => ({ open: d * DAY + 18 * 60, close: d * DAY + 26 * 60 })),
  businessStatus: "OPERATIONAL",
  googleSyncedAt: null,
  priceLevel: 2,
  priceGoogleLevel: 1,
  priceManual: 2,
  priceRange: { min: 25000, max: 50000, currency: "IDR" },
  tags: [{ id: 1, name: "soto", emoji: null, category: "type", tintsPin: false }],
  reviews: [
    { userId: "u1", rating: 5, note: "Get the extra egg" },
    { userId: "u2", rating: null, note: null },
  ],
  ...over,
})

const base = {
  tags: [{ id: 1, name: "soto", emoji: null, category: "type" as const, tintsPin: false }],
  anchors: [{ id: 1, name: "Home", lat: -7.3, lng: 112.7, icon: "home" as const }],
  people: [{ id: "u1", name: "Member One" }],
  version: "0.8.0",
  exportedAt: new Date("2026-11-25T15:00:00Z"),
}

describe("buildExport", () => {
  test("header and counts", () => {
    const out = buildExport({ ...base, places: [place()] })
    assert.equal(out.app, "food-map")
    assert.equal(out.version, "0.8.0")
    assert.equal(out.exportedAt, "2026-11-25T15:00:00.000Z")
    assert.deepEqual(out.counts, { places: 1, tags: 1, savedLocations: 1 })
  })

  test("hours are spelled out and kept raw", () => {
    const [p] = buildExport({ ...base, places: [place()] }).places
    assert.deepEqual(p.hours.week, ["MON–SUN 18:00–02:00"])
    assert.equal(p.hours.intervals?.length, 7)
    assert.equal(p.hours.source, "manual")
  })

  test("unknown hours stay null", () => {
    const [p] = buildExport({ ...base, places: [place({ hours: null, hoursSource: "unknown" })] }).places
    assert.equal(p.hours.week, null)
    assert.equal(p.hours.intervals, null)
  })

  test("reviews name their author when known", () => {
    const [p] = buildExport({ ...base, places: [place()] }).places
    assert.deepEqual(p.reviews[0], { by: "Member One", userId: "u1", rating: 5, note: "Get the extra egg" })
    assert.equal(p.reviews[1].by, null)
  })

  test("tags by name, price with its source", () => {
    const [p] = buildExport({ ...base, places: [place()] }).places
    assert.deepEqual(p.tags, ["soto"])
    assert.deepEqual(p.price, { level: 2, setByHand: true, google: 1, range: { min: 25000, max: 50000, currency: "IDR" } })
  })

  test("it is plain JSON", () => {
    const out = buildExport({ ...base, places: [place()] })
    assert.deepEqual(JSON.parse(JSON.stringify(out)), out)
  })
})

describe("exportFileName", () => {
  test("dated in Surabaya, not UTC", () => {
    // 20:00 UTC is 03:00 the next day in Jakarta
    assert.equal(exportFileName(new Date("2026-11-25T20:00:00Z")), "food-map-2026-11-26.json")
  })
})
