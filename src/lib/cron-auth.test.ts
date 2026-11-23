import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { isAuthorizedCron } from "./cron-auth.ts"

const SECRET = "0123456789abcdef0123456789abcdef"

describe("isAuthorizedCron", () => {
  test("accepts the exact Bearer header", () => {
    assert.equal(isAuthorizedCron(`Bearer ${SECRET}`, SECRET), true)
  })

  test("rejects a missing header", () => {
    assert.equal(isAuthorizedCron(null, SECRET), false)
    assert.equal(isAuthorizedCron("", SECRET), false)
  })

  test("rejects a wrong secret, wrong scheme, and wrong length without throwing", () => {
    assert.equal(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET), false)
    assert.equal(isAuthorizedCron(`Bearer ${SECRET.slice(1)}`, SECRET), false)
    assert.equal(isAuthorizedCron(`Bearer ${"f".repeat(SECRET.length)}`, SECRET), false)
    assert.equal(isAuthorizedCron(SECRET, SECRET), false)
    assert.equal(isAuthorizedCron(`bearer ${SECRET}`, SECRET), false)
  })

  test("refuses everything when no secret is configured, or it is too short", () => {
    assert.equal(isAuthorizedCron("Bearer ", undefined), false)
    assert.equal(isAuthorizedCron("Bearer ", ""), false)
    assert.equal(isAuthorizedCron("Bearer short", "short"), false)
  })
})
