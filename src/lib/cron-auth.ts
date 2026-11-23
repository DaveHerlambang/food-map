import { timingSafeEqual } from "node:crypto"

/**
 * Checks the `Authorization: Bearer <CRON_SECRET>` header Vercel adds to cron
 * requests. Compared in constant time. A missing or short secret (< 16 chars,
 * Vercel's own recommendation) refuses everything instead of letting it through.
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
