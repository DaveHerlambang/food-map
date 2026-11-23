import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { groupTags, isTagCategory, normalizeTagName, tagCategoryOf } from "./tag-categories.ts"

describe("tag categories", () => {
  test("only the four known categories are valid", () => {
    for (const c of ["type", "cuisine", "ambient", "other"]) assert.equal(isTagCategory(c), true)
    for (const c of ["Type", "ethnic", "", null, undefined, 3]) assert.equal(isTagCategory(c), false)
  })

  test("unknown or missing falls back to other", () => {
    assert.equal(tagCategoryOf("cuisine"), "cuisine")
    assert.equal(tagCategoryOf("ethnic"), "other")
    assert.equal(tagCategoryOf(null), "other")
  })
})

describe("normalizeTagName", () => {
  test("spaces, hyphens and case do not make a different tag", () => {
    assert.equal(normalizeTagName("Late Night"), "latenight")
    assert.equal(normalizeTagName("late-night"), "latenight")
    assert.equal(normalizeTagName("  Street  Food "), "streetfood")
    assert.equal(normalizeTagName("street-food"), normalizeTagName("Street Food"))
  })
})

describe("groupTags", () => {
  const tag = (name: string, category: "type" | "cuisine" | "ambient" | "other") => ({ name, category })

  test("groups in category order and sorts by name inside a group", () => {
    const groups = groupTags([
      tag("spicy", "other"),
      tag("noodles", "type"),
      tag("japanese", "cuisine"),
      tag("cafe", "type"),
      tag("cozy", "ambient"),
    ])
    assert.deepEqual(
      groups.map((g) => [g.category, g.label, g.tags.map((t) => t.name)]),
      [
        ["type", "TYPE", ["cafe", "noodles"]],
        ["cuisine", "CUISINE", ["japanese"]],
        ["ambient", "AMBIENT", ["cozy"]],
        ["other", "OTHER", ["spicy"]],
      ],
    )
  })

  test("empty categories are left out", () => {
    assert.deepEqual(
      groupTags([tag("fancy", "other")]).map((g) => g.category),
      ["other"],
    )
    assert.deepEqual(groupTags([]), [])
  })

  test("does not mutate its input", () => {
    const input = [tag("b", "type"), tag("a", "type")]
    groupTags(input)
    assert.deepEqual(input.map((t) => t.name), ["b", "a"])
  })
})
