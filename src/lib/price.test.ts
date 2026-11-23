import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { dollars, formatPriceRange, levelFromGoogle, moneyToNumber, parseGoogleRange } from "./price.ts"

describe("levelFromGoogle", () => {
  test("maps Google's four paid levels to 1–4", () => {
    assert.equal(levelFromGoogle("PRICE_LEVEL_INEXPENSIVE"), 1)
    assert.equal(levelFromGoogle("PRICE_LEVEL_MODERATE"), 2)
    assert.equal(levelFromGoogle("PRICE_LEVEL_EXPENSIVE"), 3)
    assert.equal(levelFromGoogle("PRICE_LEVEL_VERY_EXPENSIVE"), 4)
  })

  test("free, unspecified and missing are unknown", () => {
    assert.equal(levelFromGoogle("PRICE_LEVEL_FREE"), null)
    assert.equal(levelFromGoogle("PRICE_LEVEL_UNSPECIFIED"), null)
    assert.equal(levelFromGoogle(undefined), null)
    assert.equal(levelFromGoogle(null), null)
    assert.equal(levelFromGoogle("something new"), null)
  })
})

describe("moneyToNumber", () => {
  test("units as a string (how Google sends int64) or a number", () => {
    assert.equal(moneyToNumber({ currencyCode: "IDR", units: "25000" }), 25000)
    assert.equal(moneyToNumber({ units: 25000 }), 25000)
  })

  test("nanos are added", () => {
    assert.equal(moneyToNumber({ units: "1", nanos: 500_000_000 }), 1.5)
    assert.equal(moneyToNumber({ nanos: 250_000_000 }), 0.25)
  })

  test("nothing usable is null", () => {
    assert.equal(moneyToNumber(undefined), null)
    assert.equal(moneyToNumber(null), null)
    assert.equal(moneyToNumber({}), null)
    assert.equal(moneyToNumber({ units: "abc" }), null)
  })
})

describe("parseGoogleRange", () => {
  test("a real response for an Indonesian place", () => {
    assert.deepEqual(
      parseGoogleRange({
        startPrice: { currencyCode: "IDR", units: "25000" },
        endPrice: { currencyCode: "IDR", units: "150000" },
      }),
      { min: 25000, max: 150000, currency: "IDR" },
    )
  })

  test("an open-ended range keeps only the start", () => {
    assert.deepEqual(parseGoogleRange({ startPrice: { currencyCode: "IDR", units: "200000" } }), {
      min: 200000,
      max: null,
      currency: "IDR",
    })
  })

  test("no usable prices or no currency means no range", () => {
    assert.equal(parseGoogleRange(undefined), null)
    assert.equal(parseGoogleRange({}), null)
    assert.equal(parseGoogleRange({ startPrice: { units: "5000" } }), null)
  })
})

describe("dollars", () => {
  test("1–4 dollar signs, anything else is nothing", () => {
    assert.equal(dollars(1), "$")
    assert.equal(dollars(4), "$$$$")
    for (const v of [0, 5, -1, 2.5, null, undefined]) assert.equal(dollars(v), null)
  })
})

describe("formatPriceRange", () => {
  test("rupiah with dots", () => {
    assert.equal(formatPriceRange({ min: 25000, max: 150000, currency: "IDR" }), "RP 25.000–150.000")
    assert.equal(formatPriceRange({ min: 1500000, max: 2500000, currency: "IDR" }), "RP 1.500.000–2.500.000")
  })

  test("open-ended ranges", () => {
    assert.equal(formatPriceRange({ min: 75000, max: null, currency: "IDR" }), "RP 75.000+")
    assert.equal(formatPriceRange({ min: null, max: 100000, currency: "IDR" }), "UP TO RP 100.000")
  })

  test("other currencies use their code and commas", () => {
    assert.equal(formatPriceRange({ min: 10, max: 20, currency: "USD" }), "USD 10–20")
    assert.equal(formatPriceRange({ min: 1500, max: 3000, currency: "USD" }), "USD 1,500–3,000")
  })
})
