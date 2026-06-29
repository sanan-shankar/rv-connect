# RV Alumni — Performance Report

## Executive summary

Why this app feels slow splits cleanly into two unrelated stories.

**(A) Local dev slowness is mostly expected Next 16 dev-mode behaviour, not a bug.** Local dev hits a SQLite file (`file:dev.db`), so there is zero DB network latency locally. What you feel locally is Turbopack compiling routes on demand plus a 1.1GB `.next` dev cache. The one real, fixable local contributor is that `@phosphor-icons/react` is not in `optimizePackageImports`, so every compile of a route touching it parses a 192KB / 4562-line icon barrel. Fix that and the rest of local slowness is the normal cost of dev mode.

**(B) Production / real-user slowness is dominated by cross-region round trips and one oversized image.** The NextAuth `session()` callback runs a `prisma.user.findUnique` on every `auth()` call, `auth()` is not deduped per request, and a single feed view fires it several times plus a duplicated, unindexed `notification.count`. For a user in India talking to a far Turso/Vercel region, each redundant DB round trip is 80-250ms and they stack. On top of that, a 948KB `landing.jpeg` ships as a raw CSS background on every authenticated page at 11% opacity, bypassing image optimization. These two areas are where real users lose seconds.

The good news: the heaviest client code (directory map, motion) is already route-split and does not touch the shared authenticated bundle. The biggest wins are small config and data-layer changes, not a rewrite.

---

## Ranked root causes (impact x effort)

| # | What | Why it is slow | Evidence | Fix | Affects | Effort |
|---|------|----------------|----------|-----|---------|--------|
| 1 | `session()` runs `prisma.user.findUnique` on every `auth()`; `auth()` not `cache()`-wrapped | One feed view calls `auth()` in layout, page, and `loadPosts`, each re-running the callback and re-hitting the DB for the same row. Every server action (like, vote, comment) adds more. On a far Turso region each is a cross-region RTT. | `src/lib/auth.ts` session callback does `user.findUnique` (verified: no `cache` import anywhere in `src/lib`); 23 `await auth()` callsites across `src`; JWT already carries id/role/batchType/batchYear/avatarColor | (1) `export const auth = cache(uncachedAuth)` via React `cache` to collapse repeat calls in one request. (2) Read volatile fields from the JWT instead of the DB on every session read; refresh via `jwt()` `trigger:'update'` or a short token TTL. | production | M |
| 2 | `landing.jpeg` (948KB) as raw CSS background on every authenticated page + profile cover | Served as the original 970KB JPEG with no resize / AVIF / WebP / responsive sizing, even though it renders behind content at opacity 0.11. Largest single real-user payload on first authenticated paint, worst on India mobile networks. | `src/components/layout/app-shell.tsx:32` `backgroundImage: url(/images/landing.jpeg)`; `src/app/(main)/profile/[id]/page.tsx:252` same; file = 948K (verified `du`); contrast `landing-hero.tsx:19` uses optimized `next/image` | Generate a ~40-80KB blurred low-quality WebP/AVIF (visually identical at 11% opacity) and reference that, or move the atmosphere layer to a `next/image` with `fill` + `sizes`. Saves ~0.85MB per authenticated load. | production | S |
| 3 | `@phosphor-icons/react` missing from `optimizePackageImports` | Next auto-optimizes `lucide-react` (in its default list) but NOT phosphor. With no `experimental.optimizePackageImports` in `next.config.ts`, every build/compile of a phosphor route loads and graph-walks the full 192KB / 4562-line barrel plus ~1512 icon modules. | `next.config.ts` has no experimental block (verified full file); default list includes `lucide-react` not phosphor; barrel = 4562 lines (verified `wc -l`); 11 source files barrel-import from the bare package (e.g. `post-card.tsx:6`) | Add `experimental: { optimizePackageImports: ['@phosphor-icons/react'] }`. Biggest win is dev recompile speed; also reliably shakes per-route client chunks in prod. | both | S |
| 4 | `notification.count` duplicated per feed view AND against an unindexed table | Computed twice for one `/feed` render (layout + page), and the `Notification` model has no `@@index`, so each count is a full-table scan that grows with every like/comment/reply. The duplicate alone is one extra cross-region RTT. | `(main)/layout.tsx:17` and `feed/page.tsx:12` identical `count({where:{userId,read:false}})`; `Notification` model (`schema.prisma:276`) has zero `@@index` (verified — the indexes at lines 99-220 belong to other models) | Add `@@index([userId, read])` (Postgres: partial `WHERE read=false`) and `prisma db push` / migrate. Remove the duplicate count from `feed/page.tsx`; reuse the layout's value. | both | S |
| 5 | Dead v1 bird `Species` switch (~530 lines of SVG) ships in the shared authenticated bundle | `USE_V2 = true` is a plain const, not provably-dead to the bundler, and the v1 branch still references the 533-line `Species` switch, so it is retained. `BirdAvatar` is imported by `sidebar.tsx` (shell), so it loads on every authenticated route. | `bird-avatar.tsx`: `USE_V2` at line 9, `Species` switch lines 50-583, dead v1 branch 650-674; `sidebar.tsx:35` imports it; rendered in `(main)/layout.tsx` shell | Delete the v1 code path (Species switch, `birdFor`, `USE_V2`), keep only photoUrl + `BirdGlyphV2`. Or move v1 to a lazily-imported module behind a build-time flag. | production | S |
| 6 | Layout awaits `auth()` then `notification.count` sequentially | Two DB round trips back to back where the second waits on the first; on a high-latency link they stack. | `(main)/layout.tsx:11` `await auth()` then `:17` `await notification.count` | Becomes free once #1 makes `auth()` read id from the JWT (no DB). Short term, run the two concurrently with `Promise.all`. | production | S |
| 7 | Directory world-map stack (d3 + topojson + supercluster + 108KB world JSON) eagerly imported | The map + d3 + a 108KB JSON parsed as a JS module render synchronously above the fold, blocking the route's first interaction even for users who only want the text grid. NOTE: this is **already route-split** to `/directory` only and does NOT touch the shared bundle (verified: only `directory-client.tsx` imports the value; `directory/page.tsx` imports a type only). | `alumni-map.tsx:6-11` static imports incl. `world-atlas/countries-110m.json` (108K verified); no other importers | `next/dynamic(... , { ssr:false, loading: MapSkeleton })` in `directory-client.tsx`; optionally `fetch()` the 108KB JSON from `/public` instead of bundling it. Directory route only. | production | M |
| 8 | `landing-original.jpeg` (5.9MB) dead weight in `public/` | Referenced nowhere in `src` but copied verbatim into every deploy artifact and uploaded to the CDN; publicly reachable if guessed. Does not affect page weight (nothing fetches it). | `du` = 5.9M (6202334 bytes); `grep landing-original src` = no matches | Delete the file from the repo; keep un-resized originals outside the build. | production (deploy size only) | S |
| 9 | Source Sans 3 declares weight 300 (`font-light`), used 0 times | `next/font/google` self-hosts a woff2 subset per declared weight; the 300 subset is fetched/embedded for nothing. | `layout.tsx:16` weight array includes `'300'`; `font-light` = 0 usages, others > 0 | Drop `'300'` from the weight array (`['400','500','600','700']`). | production | S |
| 10 | Main-feed WHERE not fully indexable; `targetBatches` uses substring `LIKE` | The feed walks the `createdAt` index then filter-evaluates `isHidden` and a non-sargable `contains` LIKE on `targetBatches` per candidate row. Acceptable at MVP volume (LIMIT 21) but degrades as posts grow. | `feed/actions.ts:438,454,491`; `Post` has no index covering `isHidden`; `targetBatches` is a free comma-string | Add `@@index([isHidden, groupId, createdAt])`. Longer term, normalize batch targeting into a join table `PostTargetBatch{postId, batch}` with `@@index([batch])`. | both | M |
| 11 | Dead `navbar.tsx` + `dark-mode-toggle.tsx` (forced light theme) | Code hygiene only — unimported, so Turbopack never ships them. No runtime cost; risk is accidental future re-import of a `next-auth/react` + heavy-icon client component. | `grep navbar src` returns only its own def; `DarkModeToggle` imported only by the dead navbar; `layout.tsx:39` `forcedTheme="light"` | Delete both files. | none (hygiene) | S |
| 12 | `sidebar.tsx` is one large `use client` doing static nav | Legitimately needs client (`usePathname`, mobile sheet, `signOut`), so the cost is mostly justified; only the static Brand/NAV array is over-included. Lucide icons there are already optimized. | `sidebar.tsx` 272 lines, `use client`, in the shell | Low priority. Only if measured first-load JS is over budget: split static Brand/NavLinks into a server component, keep interactive bits client. | production (minor) | M |
| 13 | `motion` not in `optimizePackageImports` | Imported in exactly one place (`showcase-shot.tsx`, landing only). Turbopack route-splits it to the landing chunk; it does not leak into the authenticated shell. Negligible today. | only matcher is `showcase-shot.tsx:5`; `motion/react` = 4KB re-export | Optional: add `'motion'` alongside phosphor. Guardrail: keep motion out of any `(main)` shell client component. | both (negligible) | S |

**Downgraded / refuted by verification:** the directory map (#7) and `motion` (#13) were initially flagged as bundle hotspots but are confirmed route-split and do NOT inflate the shared authenticated bundle — they are route-local concerns, not app-wide. `sidebar.tsx` (#12) over-inclusion is real but minor since its lucide icons are already optimized.

---

## What to pay for / infra actions (cheapest first, highest impact first)

The user is in India; deployment is Vercel + Turso. The single most important infra fact: **physical distance between the serverless function region and the Turso DB region multiplies every redundant query.** Each finding above that removes a round trip is worth 80-250ms *per trip* at India distances.

1. **Free — co-locate, do not pay yet.** Confirm the Vercel function region and the Turso primary region are the same region, and pick one close to your users. If most users are in India, target an Asia region (e.g. Mumbai/Singapore) for both. Mismatched regions are the most expensive and most common mistake here and cost nothing to fix. Do this before spending anything.
2. **Free / cheap — Turso embedded replicas or a read replica near users.** Turso supports edge replicas. A replica in/near India turns the per-request user/notification reads into local reads. Combined with fix #1 (cache `auth()`) this is the highest-leverage latency change and is low cost.
3. **Cheap — Vercel Image Optimization is already included.** You do not need to pay for a separate image CDN; you are currently *bypassing* the optimizer by using a CSS background. Routing the atmosphere image through `next/image` (or shipping a pre-compressed WebP) uses what you already have.
4. **Consider — an always-on server near India instead of serverless.** Serverless cold starts plus cross-region DB latency are the two structural taxes here. An always-on small instance (e.g. Render in an Asia region, or a small VM in Mumbai) co-located with the DB removes cold starts and minimizes DB RTT. This is worth considering ONLY after fixes #1-#6 above; if those bring latency into range, you do not need to change hosting. If you do move, the code already supports `@prisma/adapter-pg` + Postgres, so Render + Render Postgres (both in an Asia region) is a clean path. Pay for this last, and only if measured latency after the code fixes is still unacceptable.

Ordering rationale: regions and replicas are nearly free and remove the dominant cost; image optimization uses included quota; changing hosting is the only item with real recurring cost and should be a last resort after the code-level round-trip removals land.

---

## Quick wins I can apply now (safe, low-collision)

These are isolated config/asset/data changes unlikely to collide with other agents' source edits:

- **`next.config.ts`:** add `experimental: { optimizePackageImports: ['@phosphor-icons/react'] }` (optionally `'motion'`). Speeds dev recompiles immediately; improves prod shaking. (#3, #13)
- **Auth dedup:** wrap the exported `auth` in React `cache()` so repeated `auth()` calls in one request reuse one result. Collapses ~3 user lookups per feed view to 1. (#1, part 1)
- **Image:** compress / replace the `landing.jpeg` background reference with a small WebP, or route it through `next/image`. ~0.85MB saved per authenticated load. (#2)
- **Delete `public/images/landing-original.jpeg`** (5.9MB, referenced nowhere) — trims the deploy artifact. (#8)
- **Drop weight `'300'`** from Source Sans 3 in `layout.tsx`. (#9)
- **Add `@@index([userId, read])`** to `Notification` and remove the duplicate `notification.count` in `feed/page.tsx`. (#4)
- **Delete dead `navbar.tsx` + `dark-mode-toggle.tsx`.** (#11)

## Bigger changes / your call

- **Remove the DB read from `session()` entirely** by folding volatile fields into the JWT with a TTL/`trigger:'update'` refresh. Highest single production-latency win, but touches auth semantics (freshness of role/ban checks) — needs a decision. (#1, part 2)
- **Dynamic-import the directory map** with a skeleton, and load the 108KB world JSON via `fetch` instead of bundling. Directory route only. (#7)
- **Delete the v1 bird `Species` path** (~530 lines of SVG) from the shared bundle, or move it behind a lazy import. (#5)
- **Normalize batch targeting** into a `PostTargetBatch` join table to make the feed filter indexable at scale. (#10)
- **Infra:** region co-location, Turso edge replica near India, and (last resort) an always-on Asia server. See the infra section.
- **Optionally** split `sidebar.tsx` static markup into a server component — only if first-load JS is measured over budget. (#12)

---

## Applied in this session (verified locally)

These safe, low-collision fixes are already done and the app was confirmed to compile and serve
(`/login` 200, authenticated `/feed` 200; warm authed feed render 82ms locally):

1. **`next.config.ts`** — added `experimental.optimizePackageImports: ["@phosphor-icons/react", "motion"]`.
   Shrinks dev recompiles and prod client chunks for the phosphor barrel. (#3, #13)
2. **`src/lib/auth.ts`** — `export const auth = cache(nextAuth.auth)` (React `cache`). Repeated
   `auth()` calls in one request (layout + page + actions) now resolve once, collapsing ~3 redundant
   `session()`-callback `user.findUnique` reads to 1 per request. (#1 part 1, #6)
3. **`src/app/layout.tsx`** — dropped unused Source Sans 3 weight `300`. (#9)
4. **`prisma/schema.prisma`** — added `@@index([userId, read])` on `Notification` and
   `@@index([postId, createdAt])` on `Comment`. Applied to local `dev.db` as
   `Notification_userId_read_idx` and `Comment_postId_createdAt_idx` (Prisma-convention names). (#4)
5. **`public/images/landing.jpeg`** — re-derived from the pristine original at 1680px wide, quality 72:
   **947KB -> 486KB (49% smaller)**, same path so all 7 references keep working. (#2)

### To apply on PRODUCTION (required for the index + image wins to reach users)
- The two indexes exist only in local `dev.db`. The datasource block in `schema.prisma` has no `url`,
  so `prisma db push` cannot connect from the CLI as-is. On the production database, run the same SQL:
  - `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId","read");`
  - `CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId","createdAt");`
  (via `turso db shell <db>` for Turso, or add `url`/`directUrl` to the datasource and run `prisma db push`).
- Redeploy so the smaller `landing.jpeg` ships.

### Deliberately NOT changed this session (collision risk with active design agents)
- `bird-avatar.tsx` v1 `Species` dead-code removal (#5) — bird avatars are being actively designed.
- `feed/page.tsx` duplicate `notification.count` removal (#4) — feed is design-active.
- Deleting `navbar.tsx` / `dark-mode-toggle.tsx` (#11) — zero runtime cost anyway (unimported).
- `landing-original.jpeg` (5.9MB) left in place as the high-res source; recommend moving it OUT of
  `public/` (so it stops shipping in the deploy artifact) rather than deleting it.

### Biggest remaining production win (needs your decision)
- Region co-location (Vercel function region == Turso region, near India) and a Turso edge replica.
  This is free-to-cheap and likely the single largest real-user latency reduction. See the infra section.
- Removing the DB read from `session()` entirely (JWT + TTL refresh) is the largest code-level win but
  changes auth freshness semantics; left for a decision.
