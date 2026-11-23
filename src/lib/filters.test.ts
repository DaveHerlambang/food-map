import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  parseFilters,
  resolveTarget,
  serializeFilters,
  targetLabel,
  type Filters,
} from "./filters.ts"

// Local-time helper (tests run in whatever zone the machine is in; all
// assertions are relative to local time, so they hold everywhere).
const local = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime() // Nov 2026
const MON_21 = local(23, 21) // Monday 23 Nov 2026, 21:00

describe("resolveTarget", () => {
  test("now", () => {
    assert.equal(resolveTarget({ kind: "now" }, MON_21).getTime(), MON_21)
  })

  test("later today", () => {
    assert.equal(resolveTarget({ kind: "next", hhmm: "22:00" }, MON_21).getTime(), local(23, 22))
  })

  test("after midnight rolls to tonight (next calendar day)", () => {
    assert.equal(
      resolveTarget({ kind: "next", hhmm: "00:30" }, MON_21).getTime(),
      local(24, 0, 30),
    )
  })

  test("a time that already passed today means tomorrow", () => {
    assert.equal(resolveTarget({ kind: "next", hhmm: "18:00" }, MON_21).getTime(), local(24, 18))
  })

  test("specific date in the future", () => {
    assert.equal(
      resolveTarget({ kind: "on", date: "2026-11-28", hhmm: "22:00" }, MON_21).getTime(),
      local(28, 22),
    )
  })

  test("stale date in the past falls back to now", () => {
    assert.equal(
      resolveTarget({ kind: "on", date: "2026-11-20", hhmm: "22:00" }, MON_21).getTime(),
      MON_21,
    )
  })
})

describe("targetLabel", () => {
  const label = (hhmm: string) => {
    const choice = { kind: "next", hhmm } as const
    return targetLabel(choice, resolveTarget(choice, MON_21), MON_21)
  }

  test("labels", () => {
    assert.equal(targetLabel({ kind: "now" }, new Date(MON_21), MON_21), "Now")
    assert.equal(label("22:00"), "Today 22:00")
    assert.equal(label("00:30"), "Tonight 00:30")
    assert.equal(label("18:00"), "Tomorrow 18:00")
    const sat = { kind: "on", date: "2026-11-28", hhmm: "22:00" } as const
    assert.equal(targetLabel(sat, resolveTarget(sat, MON_21), MON_21), "Sat 22:00")
  })
})

describe("URL round-trip", () => {
  test("defaults serialize to an empty string", () => {
    assert.equal(serializeFilters(DEFAULT_FILTERS), "")
    assert.deepEqual(parseFilters(new URLSearchParams("")), DEFAULT_FILTERS)
  })

  test("everything set survives a round-trip", () => {
    const f: Filters = {
      time: { kind: "on", date: "2026-11-28", hhmm: "22:00" },
      from: 3,
      stay: 90,
      openOnly: true,
      status: "visited",
      tags: [1, 4],
      price: [2, 3],
    }
    assert.deepEqual(parseFilters(new URLSearchParams(serializeFilters(f))), f)
    assert.equal(activeFilterCount(f), 5)
  })

  test("garbage in the URL is ignored", () => {
    const f = parseFilters(
      new URLSearchParams("at=25:99&from=x&stay=7&status=nope&tags=a,-1,3&price=0,5,x,2"),
    )
    assert.deepEqual(f, { ...DEFAULT_FILTERS, tags: [3], price: [2] })
  })

  test("price levels are deduplicated and sorted", () => {
    assert.deepEqual(parseFilters(new URLSearchParams("price=3,1,3,2")).price, [1, 2, 3])
    assert.equal(serializeFilters({ ...DEFAULT_FILTERS, price: [1, 4] }), "price=1%2C4")
  })
})
