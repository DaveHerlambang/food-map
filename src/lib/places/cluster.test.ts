import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { clusterPoints, compactPinWidth, COMPACT_PIN, overlaps, type ScreenPoint } from "./cluster.ts"

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

  test("seeds never overlap, so groups never sit on top of each other", () => {
    const pts = Array.from({ length: 40 }, (_, i) =>
      pt(`p${i}`, (i * 37) % 400, (i * 53) % 300, i % 3, 72 + ((i * 17) % 64)),
    )
    const groups = clusterPoints(pts, gap)
    const seeds = groups.map((g) => pts.find((p) => p.id === g.seed)!)
    for (const a of seeds) {
      for (const b of seeds) {
        if (a !== b) assert.ok(!overlaps(a, b, gap))
      }
    }
    // and every pin is in exactly one group
    assert.equal(groups.flatMap((g) => g.members).length, pts.length)
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
