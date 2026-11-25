import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { clusterPoints, compactPinWidth, COMPACT_PIN, overlaps, PILE_SIZE, type ScreenPoint } from "./cluster.ts"

const gap = { x: 4, y: 2 }
// a 100 × 37 pin unless told otherwise
const pt = (id: string, x: number, y: number, priority = 1, w = 100, h = 37): ScreenPoint => ({
  id,
  x,
  y,
  w,
  h,
  priority,
})

describe("clusterPoints", () => {
  test("pins far apart stay on their own", () => {
    const groups = clusterPoints([pt("a", 0, 0), pt("b", 500, 0), pt("c", 0, 300)], gap)
    assert.deepEqual(groups.map((g) => g.members.length), [1, 1, 1])
  })

  test("overlapping pins join one group", () => {
    const groups = clusterPoints([pt("a", 0, 0), pt("b", 60, 20), pt("c", -50, -30)], gap)
    assert.equal(groups.length, 1)
    assert.deepEqual([...groups[0].members].sort(), ["a", "b", "c"])
  })

  test("the group sits on its most important member", () => {
    const groups = clusterPoints([pt("closed", 0, 0, 1), pt("open", 30, 10, 3), pt("soon", 20, 5, 2)], gap)
    assert.equal(groups[0].seed, "open")
    assert.deepEqual(groups[0].members, ["open", "soon", "closed"])
  })

  test("pins just clear of each other stay apart", () => {
    // 100 wide + 4 air: 104 apart across is clear, 103 is not
    assert.equal(clusterPoints([pt("a", 0, 0), pt("b", 104, 0)], gap).length, 2)
    assert.equal(clusterPoints([pt("a", 0, 0), pt("b", 103, 0)], gap).length, 1)
    // 37 tall + 2 air: stacked 39 apart is clear
    assert.equal(clusterPoints([pt("a", 0, 0), pt("b", 0, 39)], gap).length, 2)
    assert.equal(clusterPoints([pt("a", 0, 0), pt("b", 0, 38)], gap).length, 1)
  })

  test("short names can sit closer than long ones", () => {
    const short = [pt("a", 0, 0, 1, 72), pt("b", 80, 0, 1, 72)]
    const long = [pt("a", 0, 0, 1, 136), pt("b", 80, 0, 1, 136)]
    assert.equal(clusterPoints(short, gap).length, 2)
    assert.equal(clusterPoints(long, gap).length, 1)
  })

  test("what is drawn never overlaps: a pile counts as big as it looks", () => {
    const pts = Array.from({ length: 40 }, (_, i) =>
      pt(`p${i}`, (i * 37) % 400, (i * 53) % 300, i % 3, 72 + ((i * 17) % 64)),
    )
    const groups = clusterPoints(pts, gap)
    const drawn = groups.map((g) => {
      const seed = pts.find((p) => p.id === g.seed)!
      return g.members.length > 1 ? { ...seed, w: PILE_SIZE.w, h: PILE_SIZE.h } : seed
    })
    for (const a of drawn) {
      for (const b of drawn) {
        if (a !== b) assert.ok(!overlaps(a, b, gap))
      }
    }
    // and every pin is in exactly one group
    assert.equal(groups.flatMap((g) => g.members).length, pts.length)
  })

  test("a pile that would cover a neighbour takes it in", () => {
    // a and b overlap (a pile). c is 48 below: clear of a 37 px pin (39 needed),
    // but within the 60 px pile (51 needed: half of 60 and half of 37, plus the gap), so it joins.
    const joined = clusterPoints([pt("a", 0, 0, 3), pt("b", 20, 10, 2), pt("c", 0, 48, 1)], gap)
    assert.equal(joined.length, 1)
    assert.deepEqual([...joined[0].members].sort(), ["a", "b", "c"])
    // far enough below the pile, c stays alone
    assert.equal(clusterPoints([pt("a", 0, 0, 3), pt("b", 20, 10, 2), pt("c", 0, 70, 1)], gap).length, 2)
  })

  test("same input, same groups", () => {
    const pts = [pt("b", 10, 0), pt("a", 0, 0), pt("c", 200, 0)]
    assert.deepEqual(clusterPoints(pts, gap), clusterPoints([...pts].reverse(), gap))
  })
})

describe("compactPinWidth", () => {
  test("short names get the minimum width", () => {
    assert.equal(compactPinWidth("Soto"), COMPACT_PIN.minW)
  })

  test("grows with the name", () => {
    assert.equal(compactPinWidth("Nasi Goreng Pak"), Math.ceil(22 + 5.85 * 15))
  })

  test("long names are cut at the maximum width", () => {
    assert.equal(compactPinWidth("A very long restaurant name that goes on"), COMPACT_PIN.maxW)
  })
})
