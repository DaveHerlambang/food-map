import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  COOLDOWN_MIN,
  STALE_DAYS,
  cooldownRemainingMin,
  isGone,
  isStale,
  refreshesHours,
  staleCutoff,
  syncedAgoLabel,
} from "./refresh-policy.ts"

const NOW = Date.parse("2026-11-23T12:00:00Z")
const DAY = 86_400_000
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe("staleness (Google allows 30 days; we refresh at 25)", () => {
  test("cutoff is 25 days back", () => {
    assert.equal(staleCutoff(NOW).getTime(), NOW - STALE_DAYS * DAY)
    assert.ok(STALE_DAYS < 30)
  })

  test("never synced is stale", () => {
    assert.equal(isStale(null, NOW), true)
  })

  test("fresh vs stale around the 25-day line", () => {
    assert.equal(isStale(ago(24 * DAY), NOW), false)
    assert.equal(isStale(ago(25 * DAY + 1000), NOW), true)
  })

  test("an unreadable date counts as stale, not as fresh", () => {
    assert.equal(isStale("not a date", NOW), true)
  })
})

describe("which hours may be overwritten", () => {
  test("only Google-sourced or unknown hours", () => {
    assert.equal(refreshesHours("google"), true)
    assert.equal(refreshesHours("unknown"), true)
    assert.equal(refreshesHours("manual"), false)
    assert.equal(refreshesHours("inherit"), false)
  })
})

describe("refresh button cooldown", () => {
  test("no cooldown when never synced", () => {
    assert.equal(cooldownRemainingMin(null, NOW), 0)
  })

  test("blocks right after a sync and reports minutes left", () => {
    assert.equal(cooldownRemainingMin(ago(60_000), NOW), COOLDOWN_MIN - 1)
    assert.equal(cooldownRemainingMin(ago(0), NOW), COOLDOWN_MIN)
  })

  test("allowed again after the cooldown", () => {
    assert.equal(cooldownRemainingMin(ago(COOLDOWN_MIN * 60_000), NOW), 0)
    assert.equal(cooldownRemainingMin(ago(2 * DAY), NOW), 0)
  })
})

describe("Google errors", () => {
  test("only 404 marks a place as gone", () => {
    assert.equal(isGone(404), true)
    for (const status of [400, 401, 403, 429, 500, 503]) assert.equal(isGone(status), false)
  })
})

describe("syncedAgoLabel", () => {
  test("labels", () => {
    assert.equal(syncedAgoLabel(null, NOW), "NEVER SYNCED")
    assert.equal(syncedAgoLabel(ago(3600_000), NOW), "SYNCED TODAY")
    assert.equal(syncedAgoLabel(ago(DAY + 1000), NOW), "SYNCED YESTERDAY")
    assert.equal(syncedAgoLabel(ago(9 * DAY + 1000), NOW), "SYNCED 9 DAYS AGO")
    assert.equal(syncedAgoLabel("garbage", NOW), "NEVER SYNCED")
  })
})
