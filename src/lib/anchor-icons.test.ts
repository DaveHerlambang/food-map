import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { anchorIconOf, guessAnchorIcon, isAnchorIcon } from "./anchor-icons.ts"

describe("anchor icons", () => {
  test("only known icons are valid; anything else shows as the pin", () => {
    assert.equal(isAnchorIcon("home"), true)
    assert.equal(isAnchorIcon("House"), false)
    assert.equal(anchorIconOf("gym"), "gym")
    assert.equal(anchorIconOf("rocket"), "pin")
    assert.equal(anchorIconOf(null), "pin")
  })
})

describe("guessAnchorIcon", () => {
  test("English and Indonesian names", () => {
    assert.equal(guessAnchorIcon("Her office"), "work")
    assert.equal(guessAnchorIcon("Kantor Pusat"), "work")
    assert.equal(guessAnchorIcon("Rumah"), "home")
    assert.equal(guessAnchorIcon("My house"), "home")
    assert.equal(guessAnchorIcon("Kampus ITS"), "campus")
    assert.equal(guessAnchorIcon("University"), "campus")
    assert.equal(guessAnchorIcon("Gym"), "gym")
    assert.equal(guessAnchorIcon("Rumah Mama"), "home") // the first match wins
    assert.equal(guessAnchorIcon("Mama & Papa"), "family")
    assert.equal(guessAnchorIcon("Kopi Kenangan"), "cafe")
  })

  test("whole words only, and nothing for names that don't say", () => {
    assert.equal(guessAnchorIcon("Homestead"), null)
    assert.equal(guessAnchorIcon("Tunjungan Plaza"), null)
    assert.equal(guessAnchorIcon(""), null)
  })
})
