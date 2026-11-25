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
- Ratings and notes are per person: each of the two has their own stars and their own note on a place, can read the other's, and can only change their own. A note can be written before rating (e.g. for a wishlist place). Wishlist/visited status is shared.
- Data from Google stays fresh without spending the free quota: a daily cron (`/api/cron/daily`, scheduled in `vercel.json`) refreshes places not synced for 25 days (Google allows keeping coordinates for 30), oldest first, at most 10 per run. The same run touches the database so the free Supabase project never pauses for inactivity. A place can also be refreshed by hand from its detail. Hours typed in by hand and a mall's hours are never overwritten; places Google reports as closed (permanently or temporarily) show as closed whatever their hours.
- Tags are grouped by category (type, cuisine, ambient, other) in the pickers. A place with a drink or dessert tag gets a pink pin body; closed or unknown ones stay muted. Tag names ignore case, spaces and hyphens, so "Street Food" and `street-food` are the same tag.
- Prices follow Google: `$` to `$$$$` (Google's four paid levels) plus Google's price range in rupiah. A level can be set by hand per place and Google's refreshes never overwrite it; the list can be filtered by level.
- A place that isn't on Google (or is in the wrong spot there) can be added by hand: a name and a pin placed on the map, then its hours. Google never refreshes it.
- Hours can be set by hand for any place with the "usual hours" editor: one set of hours, the days it opens, and the days that differ; a closing time at or before the opening time closes the next day. Hours set by hand are never overwritten by Google; a Google place can be handed back to Google's hours.
- A place is one Google place: adding one that is already on the list saves nothing, shows the existing one and says "Already on your list". Another branch of the same restaurant is a different Google place, so it is a different place.
- UI language is English. Design is **Struk v2**: a cashier's receipt on a map (IBM Plex Mono, paper and ink, lime highlighter for open, Barbados red for closing soon). Controls on the map are borderless paper tiles (starting point, locate, and a menu holding light/dark and sign out). Map pins are tiny receipts: a header with the closing time, the name on paper, a footer line saying visited or wishlist, a torn bottom edge.

## Configuration

Environment variables (names only; the values live in `.env.local` and in Vercel, never in the repo):

| Name | Used for |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` | the map in the browser |
| `GOOGLE_PLACES_SERVER_KEY` | Places API calls from the server |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | database and login |
| `SUPABASE_SECRET_KEY` | the daily cron only (bypasses row-level security) |
| `CRON_SECRET` | authenticates the cron request that Vercel sends |

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
| 0.1.2 | 2026-11-23 | Pins are rectangles with the closing time and the place name (time part lime when open, Barbados when closing soon, muted when closed; closed pins hide when they overlap); one sheet model for list and place: the header is always the drag handle, a selected place gets its own header with × and its actions, and selecting no longer resizes the sheet |
| 0.2.0 | 2026-11-23 | Daily cron: keeps the free Supabase project awake and refreshes stale Google data (25 days, max 10 per run); "Refresh" button per place; places Google reports as closed show as closed |
| 0.3.0 | 2026-11-23 | Tag categories (type, cuisine, ambient, other) with a larger starter set and Coffee merged into cafe; drink and dessert tags tint the pin pink; prices from Google (`$`–`$$$$` and the rupiah range) with a manual override and a price filter |
| 0.4.0 | 2026-11-25 | A note per person next to their own rating (stars optional, so a wishlist place can have a note); the old shared notes move to the owner; map pins restyled as mini receipts (time header, name, visited/wishlist footer, torn bottom); a visited/wishlist badge in the place header; "Already on your list" when adding a place that is already there |
| 0.4.1 | 2026-11-25 | Map controls restyled as quiet paper tiles: the starting point shows a lime dot while your location is live, and light/dark and sign out move into a menu, leaving only the starting point, locate and the menu on the map |
| 0.5.0 | 2026-11-25 | Add a place by hand (not on Google, or in the wrong spot): name it, place the pin, set its hours or skip; an hours editor for every place (usual hours, open days, days that differ, past midnight, 24 hours, a second shift) whose hours Google never overwrites, with a way back to Google's hours |
