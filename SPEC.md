# Food Map — Spec

## What it is

A private, mobile-first web app for two people to answer one question late at night:
**which of the places we curated are open (now, or at a chosen time) and closest to us?**
The map shows only our own pins, centered on Surabaya. Not a native app: it runs in the browser on iPhone and Android.

## Stack

- Next.js 16 (App Router, Cache Components), TypeScript, Tailwind v4, shadcn/ui on Base UI
- Supabase: Postgres + Auth (email + password, sign-ups off), row-level security so only members can read or write
- Google Maps JavaScript API and Places API (New), kept inside the free tiers
- Hosting: Vercel (Hobby)

## Product rules

- Open state is evaluated at **arrival time** (chosen time + estimated travel time), and a place counts as open only if it stays open for the **whole stay** (default 45 min).
- Opening hours are stored as minute-of-week intervals `[open, close)`; `close` may exceed 10080 for hours that wrap past Saturday night. Mall tenants without hours of their own inherit the mall's.
- Ratings are per person; wishlist/visited status is shared.
- UI language is English. Design is **Struk v2**: a cashier's receipt on a map (IBM Plex Mono, paper and ink, lime highlighter for open, Barbados red for closing soon).

## Versioning

The app follows [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Part | Format | Bump when | Examples |
|---|---|---|---|
| **Major** | `x.0.0` | Breaking change: a database change that needs a manual migration or can lose data, or a rework of the core flow | new schema that existing data cannot be migrated to; replacing the time/arrival model |
| **Minor** | `0.x.0` | New feature, backwards compatible | manual hours editor, daily Google refresh, mall tenants |
| **Patch** | `0.0.x` | Bug fix or small tweak, no new behavior | wrong status line, spacing, copy, a color |

Rules:

- Bumping a part resets the parts to its right to zero (`0.2.3` → minor → `0.3.0`).
- `0.x.y` means initial development, where anything may still change. `1.0.0` is the first version deployed to Vercel and used for real with the core features in place.
- **`package.json` → `version` is the only place to edit the version.** `next.config.ts` exposes it to the UI as `NEXT_PUBLIC_APP_VERSION`.
- The version is printed at the **bottom-left of the receipt** (`V0.1.0`): pinned to the bottom of the side panel on web, and at the end of the receipt on mobile.

## Releases

- Each version that gets pushed lives on its own branch named `release/x.y.z`, matching `package.json`.
- Create the branch first, then set the version, then push.
- `master` is the main branch. A release branch is merged into it once the version is verified (fast-forward when possible), and `master` is what gets deployed to production.

| Version | Date | Contents |
|---|---|---|
| 0.1.0 | 2026-11-23 | First pushed version: login, curated map, add places from Google, edit (status, per-person rating, tags, notes), time and filter controls, GPS distance and saved starting points, Struk v2 design for web and mobile, light/dark map |
| 0.1.1 | 2026-11-23 | Mobile sheet fixes: swipe down to collapse it to a small stub, more of the map visible, and the place actions (Open in Google Maps, Edit) always reachable above the iPhone browser bar |
