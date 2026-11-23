import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { estimateTrip, formatKm, haversineKm, isLatLng } from "./geo.ts"

const TUNJUNGAN_PLAZA = { lat: -7.2626, lng: 112.739 }
const GALAXY_MALL = { lat: -7.2754, lng: 112.7826 }

describe("haversineKm", () => {
  test("zero for the same point", () => {
    assert.equal(haversineKm(TUNJUNGAN_PLAZA, TUNJUNGAN_PLAZA), 0)
  })

  test("Tunjungan Plaza → Galaxy Mall is about 5 km straight-line", () => {
    const km = haversineKm(TUNJUNGAN_PLAZA, GALAXY_MALL)
    assert.ok(km > 4.9 && km < 5.15, `got ${km}`)
  })

  test("symmetric", () => {
    assert.equal(haversineKm(TUNJUNGAN_PLAZA, GALAXY_MALL), haversineKm(GALAXY_MALL, TUNJUNGAN_PLAZA))
  })
})

describe("estimateTrip", () => {
  test("applies road factor and night-time speed", () => {
    const trip = estimateTrip(TUNJUNGAN_PLAZA, GALAXY_MALL)
    assert.ok(trip.km > 6.3 && trip.km < 6.7, `got ${trip.km}`) // ≈ 5.0 × 1.3
    assert.ok(trip.minutes >= 15 && trip.minutes <= 17, `got ${trip.minutes}`) // ≈ 6.5 km @ 25 km/h
  })

  test("never less than a minute", () => {
    assert.equal(estimateTrip(GALAXY_MALL, GALAXY_MALL).minutes, 1)
  })
})

describe("formatKm", () => {
  test("formats by magnitude", () => {
    assert.equal(formatKm(0.004), "10 m")
    assert.equal(formatKm(0.347), "350 m")
    assert.equal(formatKm(2.44), "2.4 km")
    assert.equal(formatKm(12.6), "13 km")
  })
})

describe("isLatLng", () => {
  test("validates ranges and types", () => {
    assert.equal(isLatLng(-7.2, 112.7), true)
    assert.equal(isLatLng(91, 0), false)
    assert.equal(isLatLng("1", 2), false)
    assert.equal(isLatLng(NaN, 2), false)
  })
})
