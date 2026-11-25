import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { clusterPoints, type ScreenPoint } from "./cluster.ts"

const box = { width: 120, height: 48 }
const pt = (id: string, x: number, y: number, priority = 1): ScreenPoint => ({ id, x, y, priority })

describe("clusterPoints", () => {
  test("pins far apart stay on their own", () => {
    const groups = clusterPoints([pt("a", 0, 0), pt("b", 500, 0), pt("c", 0, 300)], box)
    assert.deepEqual(groups.map((g) => g.members.length), [1, 1, 1])
  })

  test("overlapping pins join one group", () => {
    const groups = clusterPoints([pt("a", 0, 0), pt("b", 60, 20), pt("c", -50, -30)], box)
    assert.equal(groups.length, 1)
    assert.deepEqual([...groups[0].members].sort(), ["a", "b", "c"])
  })

  test("the group sits on its most important member", () => {
    const groups = clusterPoints([pt("closed", 0, 0, 1), pt("open", 30, 10, 3), pt("soon", 20, 5, 2)], box)
    assert.equal(groups[0].seed, "open")
    assert.deepEqual(groups[0].members, ["open", "soon", "closed"])
  })

  test("width and height are separate: side by side needs more room than stacked", () => {
    // 100 px apart across is inside the 120 px box; 100 px apart down is not
    assert.equal(clusterPoints([pt("a", 0, 0), pt("b", 100, 0)], box).length, 1)
    assert.equal(clusterPoints([pt("a", 0, 0), pt("b", 0, 100)], box).length, 2)
  })

  test("seeds never overlap, so groups never sit on top of each other", () => {
    const pts = Array.from({ length: 40 }, (_, i) => pt(`p${i}`, (i * 37) % 400, (i * 53) % 300, i % 3))
    const groups = clusterPoints(pts, box)
    const seeds = groups.map((g) => pts.find((p) => p.id === g.seed)!)
    for (const a of seeds) {
      for (const b of seeds) {
        if (a === b) continue
        assert.ok(Math.abs(a.x - b.x) >= box.width || Math.abs(a.y - b.y) >= box.height)
      }
    }
    // and every pin is in exactly one group
    assert.equal(groups.flatMap((g) => g.members).length, pts.length)
  })

  test("same input, same groups", () => {
    const pts = [pt("b", 10, 0), pt("a", 0, 0), pt("c", 200, 0)]
    assert.deepEqual(clusterPoints(pts, box), clusterPoints([...pts].reverse(), box))
  })
})
