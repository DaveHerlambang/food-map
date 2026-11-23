import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  DAY,
  WEEK,
  formatClock,
  fromGooglePeriods,
  getOpenState,
  hoursForDay,
  isOpenFor,
  mergeIntervals,
  minuteOfWeek,
  type GooglePeriod,
} from "./hours.ts"

// Helpers: build minute-of-week values and Google periods readably.
const SUN = 0, MON = 1, TUE = 2, SAT = 6
const at = (day: number, hh: number, mm = 0) => day * DAY + hh * 60 + mm
const p = (od: number, oh: number, cd: number, ch: number, om = 0, cm = 0): GooglePeriod => ({
  open: { day: od, hour: oh, minute: om },
  close: { day: cd, hour: ch, minute: cm },
})

describe("fromGooglePeriods", () => {
  test("same-day period", () => {
    assert.deepEqual(fromGooglePeriods([p(MON, 10, MON, 22)]), [
      { open: at(MON, 10), close: at(MON, 22) },
    ])
  })

  test("overnight period (Mon 18:00 → Tue 02:00)", () => {
    assert.deepEqual(fromGooglePeriods([p(MON, 18, TUE, 2)]), [
      { open: at(MON, 18), close: at(TUE, 2) },
    ])
  })

  test("Saturday night wrapping into Sunday gets close > WEEK", () => {
    assert.deepEqual(fromGooglePeriods([p(SAT, 20, SUN, 3)]), [
      { open: at(SAT, 20), close: WEEK + at(SUN, 3) },
    ])
  })

  test("closing at midnight", () => {
    assert.deepEqual(fromGooglePeriods([p(MON, 17, TUE, 0)]), [
      { open: at(MON, 17), close: at(TUE, 0) },
    ])
  })

  test("24/7 is a single period with no close", () => {
    assert.deepEqual(fromGooglePeriods([{ open: { day: 0, hour: 0, minute: 0 } }]), [
      { open: 0, close: WEEK },
    ])
  })

  test("seven back-to-back full days collapse to 24/7", () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((d) => p(d, 0, (d + 1) % 7, 0))
    assert.deepEqual(fromGooglePeriods(days), [{ open: 0, close: WEEK }])
  })
})

describe("mergeIntervals", () => {
  test("merges touching split shifts", () => {
    assert.deepEqual(
      mergeIntervals([
        { open: at(MON, 15), close: at(MON, 22) },
        { open: at(MON, 10), close: at(MON, 15) },
      ]),
      [{ open: at(MON, 10), close: at(MON, 22) }],
    )
  })

  test("keeps a real gap", () => {
    assert.equal(
      mergeIntervals([
        { open: at(MON, 10), close: at(MON, 14) },
        { open: at(MON, 17), close: at(MON, 22) },
      ]).length,
      2,
    )
  })

  test("folds Sat-night interval into Sunday-morning interval across the wrap", () => {
    assert.deepEqual(
      mergeIntervals([
        { open: at(SUN, 0), close: at(SUN, 2) },
        { open: at(SAT, 18), close: WEEK },
      ]),
      [{ open: at(SAT, 18), close: WEEK + at(SUN, 2) }],
    )
  })
})

describe("getOpenState / isOpenFor", () => {
  const overnight = fromGooglePeriods([p(MON, 18, TUE, 2)])
  const satNight = fromGooglePeriods([p(SAT, 20, SUN, 3)])

  test("open in the evening", () => {
    assert.equal(getOpenState(overnight, at(MON, 20)).status, "open")
  })

  test("still open after midnight (Tue 01:00)", () => {
    const s = getOpenState(overnight, at(TUE, 1))
    assert.equal(s.status, "closing") // 60 minutes left
    if (s.status === "closing") assert.equal(s.minutesLeft, 60)
  })

  test("closed exactly at closing time", () => {
    assert.equal(getOpenState(overnight, at(TUE, 2)).status, "closed")
  })

  test("open exactly at opening time", () => {
    assert.equal(getOpenState(overnight, at(MON, 18)).status, "open")
  })

  test("Sunday 02:00 is inside the Saturday-night period", () => {
    const s = getOpenState(satNight, at(SUN, 2))
    assert.equal(s.status, "closing")
    if (s.status === "closing") assert.equal(s.closesAt, at(SUN, 3))
  })

  test("closed state reports the next opening, wrapping the week", () => {
    const s = getOpenState(satNight, at(SUN, 12))
    assert.equal(s.status, "closed")
    if (s.status === "closed") {
      assert.equal(s.opensAt, at(SAT, 20))
      assert.equal(s.opensIn, at(SAT, 20) - at(SUN, 12))
    }
  })

  test("unknown hours", () => {
    assert.equal(getOpenState(null, at(MON, 12)).status, "unknown")
    assert.equal(isOpenFor(null, at(MON, 12)), false)
  })

  test("no periods at all = always closed", () => {
    const s = getOpenState([], at(MON, 12))
    assert.equal(s.status, "closed")
    if (s.status === "closed") assert.equal(s.opensAt, null)
  })

  test("stay window: arriving 30 min before close fails a 45 min stay", () => {
    assert.equal(isOpenFor(overnight, at(TUE, 1, 30), 45), false)
    assert.equal(isOpenFor(overnight, at(TUE, 1, 0), 45), true)
  })

  test("24/7 is always open", () => {
    const always = fromGooglePeriods([{ open: { day: 0, hour: 0, minute: 0 } }])
    assert.equal(getOpenState(always, at(SAT, 23, 59)).status, "open")
    assert.equal(isOpenFor(always, at(SAT, 23, 59), 120), true)
  })
})

describe("minuteOfWeek", () => {
  test("uses the place's time zone, not the machine's", () => {
    // 2026-11-23 is a Monday. 15:30 UTC = 22:30 in Asia/Jakarta (UTC+7).
    const d = new Date("2026-11-23T15:30:00Z")
    assert.equal(minuteOfWeek(d, "Asia/Jakarta"), at(MON, 22, 30))
  })

  test("crosses into the next day in Jakarta", () => {
    // Monday 18:00 UTC = Tuesday 01:00 WIB
    const d = new Date("2026-11-23T18:00:00Z")
    assert.equal(minuteOfWeek(d, "Asia/Jakarta"), at(TUE, 1))
  })
})

describe("formatting", () => {
  test("formatClock wraps past midnight", () => {
    assert.equal(formatClock(at(TUE, 2)), "02:00")
    assert.equal(formatClock(WEEK + at(SUN, 3)), "03:00")
  })

  test("hoursForDay lists overnight periods once, on the opening day", () => {
    const h = fromGooglePeriods([p(MON, 18, TUE, 2)])
    assert.deepEqual(hoursForDay(h, MON), ["18:00–02:00"])
    assert.deepEqual(hoursForDay(h, TUE), [])
  })

  test("hoursForDay for 24/7", () => {
    assert.deepEqual(hoursForDay([{ open: 0, close: WEEK }], MON), ["Open 24 hours"])
  })
})
