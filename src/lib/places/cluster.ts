// No imports: unit-tested with `node --test`.

/** A pin on screen: world pixels at the current zoom, and how much it matters. */
export type ScreenPoint = { id: string; x: number; y: number; priority: number }
export type Cluster = { seed: string; members: string[] }

/**
 * Greedy screen-space grouping. Points are taken most important first (ties
 * by id, so the result is stable); each one joins the first group whose seed
 * it would overlap (closer than `width` across and `height` down), or starts a
 * group of its own. Seeds therefore never overlap each other, and a group sits
 * on its most important member, so it doesn't jump around as others join.
 */
export function clusterPoints(
  points: readonly ScreenPoint[],
  box: { width: number; height: number },
): Cluster[] {
  const ordered = [...points].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  const groups: { seed: ScreenPoint; members: string[] }[] = []
  for (const p of ordered) {
    const home = groups.find(
      (g) => Math.abs(g.seed.x - p.x) < box.width && Math.abs(g.seed.y - p.y) < box.height,
    )
    if (home) home.members.push(p.id)
    else groups.push({ seed: p, members: [p.id] })
  }
  return groups.map((g) => ({ seed: g.seed.id, members: g.members }))
}
