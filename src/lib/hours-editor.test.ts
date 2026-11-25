import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { DAY, WEEK, getOpenState } from "./hours.ts"
import {
  draftToIntervals,
  emptyDraft,
  intervalsToDraft,
  parseClock,
  summarizeDraft,
  validateDraft,
  type HoursDraft,
} from "./hours-editor.ts"

const h = (hh: number, mm = 0) => hh * 60 + mm
const at = (day: number, hh: number, mm = 0) => day * DAY + h(hh, mm)

/** The warung from the design: 18–02 Mon–Thu, 18–03 Fri–Sat, closed Sunday. */
const warung: HoursDraft = {
  usual: { allDay: false, shifts: [{ open: h(18), close: h(2) }] },
  openDays: [1, 2, 3, 4, 5, 6],
  exceptions: [{ days: [5, 6], allDay: false, shifts: [{ open: h(18), close: h(3) }] }],
}

describe("parseClock", () => {
  test("HH:MM within a day", () => {
    assert.equal(parseClock("18:30"), 1110)
    assert.equal(parseClock("00:00"), 0)
    assert.equal(parseClock("9:05"), 545)
  })
  test("anything else is null", () => {
    for (const v of ["24:00", "12:60", "", "18", "aa:bb"]) assert.equal(parseClock(v), null)
  })
})

describe("draftToIntervals", () => {
  test("hours past midnight close the next day, Saturday wraps into Sunday", () => {
    const iv = draftToIntervals(warung)
    assert.deepEqual(iv[0], { open: at(1, 18), close: at(2, 2) })
    // Saturday 18:00 → Sunday 03:00 runs past the end of the week
    assert.deepEqual(iv[iv.length - 1], { open: at(6, 18), close: WEEK + h(3) })
    assert.equal(iv.length, 6)
  })

  test("the result answers 'open?' the way the form reads", () => {
    const iv = draftToIntervals(warung)
    assert.equal(getOpenState(iv, at(2, 1, 30)).status, "closing") // Tue 01:30, from Monday night
    assert.equal(getOpenState(iv, at(0, 1, 30)).status, "open") // Sun 01:30, from Saturday night
    assert.equal(getOpenState(iv, at(0, 2, 30)).status, "closing") // 30 min before 03:00
    assert.equal(getOpenState(iv, at(0, 20)).status, "closed") // Sunday evening
    assert.equal(getOpenState(iv, at(1, 2, 30)).status, "closed") // Mon 02:30: Sunday was closed
  })

  test("24 hours every day is 24/7", () => {
    const iv = draftToIntervals({ usual: { allDay: true, shifts: [] }, openDays: [0, 1, 2, 3, 4, 5, 6], exceptions: [] })
    assert.deepEqual(iv, [{ open: 0, close: WEEK }])
  })

  test("a lunch break gives two periods a day", () => {
    const iv = draftToIntervals({
      usual: { allDay: false, shifts: [{ open: h(10), close: h(14) }, { open: h(17), close: h(22) }] },
      openDays: [3],
      exceptions: [],
    })
    assert.deepEqual(iv, [
      { open: at(3, 10), close: at(3, 14) },
      { open: at(3, 17), close: at(3, 22) },
    ])
  })
})

describe("intervalsToDraft", () => {
  test("round-trips the warung: usual hours, open days and the different days", () => {
    const back = intervalsToDraft(draftToIntervals(warung))
    assert.deepEqual(back.usual, warung.usual)
    assert.deepEqual([...back.openDays].sort(), [1, 2, 3, 4, 5, 6])
    assert.deepEqual(back.exceptions, warung.exceptions)
  })

  test("24/7 becomes '24 hours, every day'", () => {
    const d = intervalsToDraft([{ open: 0, close: WEEK }])
    assert.equal(d.usual.allDay, true)
    assert.equal(d.openDays.length, 7)
  })

  test("24 hours on Saturday and Sunday (merged across the week) splits back per day", () => {
    const iv = draftToIntervals({ usual: { allDay: true, shifts: [] }, openDays: [6, 0], exceptions: [] })
    const d = intervalsToDraft(iv)
    assert.equal(d.usual.allDay, true)
    assert.deepEqual([...d.openDays].sort(), [0, 6])
    assert.deepEqual(d.exceptions, [])
  })

  test("unknown or no hours start from a blank form", () => {
    assert.deepEqual(intervalsToDraft(null), emptyDraft())
    assert.deepEqual(intervalsToDraft([]), emptyDraft())
  })
})

describe("validateDraft", () => {
  test("the warung is fine", () => assert.equal(validateDraft(warung), null))

  test("needs at least one open day", () => {
    assert.match(validateDraft({ ...warung, openDays: [], exceptions: [] }) ?? "", /at least one day/)
  })

  test("same opening and closing time is rejected", () => {
    const d = { ...warung, usual: { allDay: false, shifts: [{ open: h(9), close: h(9) }] } }
    assert.match(validateDraft(d) ?? "", /can't be the same/)
  })

  test("overlapping shifts are rejected", () => {
    const d = {
      ...warung,
      usual: { allDay: false, shifts: [{ open: h(10), close: h(15) }, { open: h(14), close: h(22) }] },
    }
    assert.match(validateDraft(d) ?? "", /overlap/)
  })

  test("a different-hours row needs days, each day once, and only open days", () => {
    assert.match(validateDraft({ ...warung, exceptions: [{ ...warung.exceptions[0], days: [] }] }) ?? "", /Pick the days/)
    assert.match(
      validateDraft({ ...warung, exceptions: [warung.exceptions[0], { ...warung.exceptions[0], days: [5] }] }) ?? "",
      /two different-hours rows/,
    )
    assert.match(validateDraft({ ...warung, exceptions: [{ ...warung.exceptions[0], days: [0] }] }) ?? "", /not an open day/)
  })
})

describe("summarizeDraft", () => {
  test("reads like the sign on the door, Monday first", () => {
    assert.deepEqual(summarizeDraft(warung), [
      { days: "MON–THU", hours: "18:00–02:00", closed: false },
      { days: "FRI–SAT", hours: "18:00–03:00", closed: false },
      { days: "SUN", hours: "CLOSED", closed: true },
    ])
  })
})
