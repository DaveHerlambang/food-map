// No imports: unit-tested with `node --test`.

/**
 * A pin on screen: world pixels at the current zoom (its center), the size of
 * what you actually see of it, and how much it matters.
 */
export type ScreenPoint = { id: string; x: number; y: number; w: number; h: number; priority: number }
export type Cluster = { seed: string; members: string[] }

/** How much air two pins need between them before they count as apart. */
export type Gap = { x: number; y: number }

/**
 * Greedy screen-space grouping. Points are taken most important first (ties
 * by id, so the result is stable); each one joins the first group whose seed
 * it would overlap (their boxes, plus `gap`, touch across AND down), or starts
 * a group of its own. Seeds therefore never overlap each other, and a group
 * sits on its most important member, so it doesn't jump around as others join.
 *
 * Sizes are per pin: two short names can sit closer together than two long
 * ones before they're piled up.
 */
export function clusterPoints(
  points: readonly ScreenPoint[],
  gap: Gap,
  pile: { w: number; h: number } = PILE_SIZE,
): Cluster[] {
  const ordered = [...points].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
  const groups: { seed: ScreenPoint; members: string[] }[] = []
  for (const p of ordered) {
    const home = groups.find((g) => overlaps(g.seed, p, gap))
    if (home) home.members.push(p.id)
    else groups.push({ seed: p, members: [p.id] })
  }

  // A pile is drawn bigger than a lone pin is tall (it's a stack of receipts),
  // so it can cover a neighbour the pins alone would clear. Join any groups
  // whose drawn boxes touch, until none do. Groups are in priority order, so
  // the lower index keeps the seed.
  const drawn = (g: { seed: ScreenPoint; members: string[] }): ScreenPoint =>
    g.members.length > 1 ? { ...g.seed, w: pile.w, h: pile.h } : g.seed
  let merged = true
  while (merged) {
    merged = false
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (overlaps(drawn(groups[i]), drawn(groups[j]), gap)) {
          groups[i].members.push(...groups[j].members)
          groups.splice(j, 1)
          merged = true
          break outer
        }
      }
    }
  }
  return groups.map((g) => ({ seed: g.seed.id, members: g.members }))
}

/**
 * The drawn size of a pile (ClusterMarker): 60 px of paper plus the two
 * sheets peeking out 4 and 8 px, 60 px tall. Keep in step with cluster-marker.tsx.
 */
export const PILE_SIZE = { w: 68, h: 60 }

export function overlaps(a: ScreenPoint, b: ScreenPoint, gap: Gap): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap.x && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap.y
  )
}

/**
 * The visible size of a compact (phone) pin, from PlaceMarker's compact
 * classes: 9 px IBM Plex Mono with 0.05em tracking is 5.85 px a character; the
 * name row adds the visited icon, a gap and padding (22 px); the receipt is
 * 72–136 px wide (min-w-[4.5rem] / max-w-[8.5rem]) and 37 px tall (two 15 px
 * lines, 2 px top padding, 5 px of torn edge). Keep in step with that file.
 */
export const COMPACT_PIN = { minW: 72, maxW: 136, h: 37, perChar: 5.85, extra: 22 }

export function compactPinWidth(name: string): number {
  const raw = COMPACT_PIN.extra + COMPACT_PIN.perChar * name.trim().length
  return Math.min(COMPACT_PIN.maxW, Math.max(COMPACT_PIN.minW, Math.ceil(raw)))
}
