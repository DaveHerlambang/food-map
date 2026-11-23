// No imports: unit-tested with `node --test`.

/** Tags are grouped in the pickers, in this order. */
export const TAG_CATEGORIES = ["type", "cuisine", "ambient", "other"] as const
export type TagCategory = (typeof TAG_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<TagCategory, string> = {
  type: "TYPE",
  cuisine: "CUISINE",
  ambient: "AMBIENT",
  other: "OTHER",
}

export function isTagCategory(value: unknown): value is TagCategory {
  return typeof value === "string" && (TAG_CATEGORIES as readonly string[]).includes(value)
}

/** Unknown or missing categories fall back to "other". */
export function tagCategoryOf(value: unknown): TagCategory {
  return isTagCategory(value) ? value : "other"
}

/** "Late Night", "late-night" and "latenight" are the same tag. */
export function normalizeTagName(name: string): string {
  return name.toLowerCase().replace(/[\s-]+/g, "")
}

/** Non-empty groups in category order; tags sorted by name within each. */
export function groupTags<T extends { name: string; category: TagCategory }>(tags: readonly T[]) {
  return TAG_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    tags: tags.filter((t) => t.category === category).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.tags.length > 0)
}
