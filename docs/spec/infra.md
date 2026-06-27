# Spec: infra

I now have full grounding. Here is the complete spec for my assigned area.

---

# Infrastructure, Performance, and the Support Page

This section covers three connected things: why the current Turso plus Vercel setup feels sluggish, a prioritized and cost-aware plan to make RV Alumni snappy on Render, and the design and data model for a Support page that funds the owner's hosting. Every recommendation below is grounded in the real code as it exists today, with the bottleneck named and the fix scoped so the owner can decide what is worth paying for.

## 0. What the code actually does today (the baseline)

Before any plan, here is the truth of the current setup, read from the repo:

- **Database access** (`src/lib/prisma.ts`): Prisma 7 talking to Turso through `@prisma/adapter-libsql`. The client reads `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, falling back to `file:dev.db` locally. This is an **HTTP/libSQL remote connection**, not a long-lived TCP pool. Every query is an HTTP round trip to Turso's edge.
- **Image upload** (`src/app/api/upload/route.ts`): `sharp` resizes to a max of 1920x1920 (fit inside, no enlargement) and encodes a **single** WebP at quality 80, then `put`s it to Vercel Blob under `uploads/YYYY/MM/<cuid>.webp`. There is exactly one rendition per image. No thumbnail, no responsive set.
- **Image rendering**: post images (`src/components/posts/post-card.tsx`), group images (`src/components/groups/group-feed.tsx`), the composer preview (`src/components/posts/create-post-form.tsx`), and the **full-screen fixed background** on every authenticated page (`src/app/(main)/layout.tsx`) all use raw `<img>` tags. They do **not** go through `next/image`. `loading="lazy"` is set on post images but nothing else.
- **`next.config.ts`**: declares `images.remotePatterns` for `*.public.blob.vercel-storage.com`, but since nothing uses `next/image` for blob images, **that config is currently dead**. `serverExternalPackages: ["sharp"]` is correctly set.
- **Feed query** (`src/app/(main)/feed/actions.ts`): offset pagination, `take: 21, skip: page * 20`, with `_count` aggregates, the viewer's own like, poll options, and poll votes all included per page. Other lists: directory `take: 100`, group page posts `take: 50`, profile `take: 20`, user search `take: 8`.

This baseline tells us exactly where the slowness is coming from. The fixes below are ordered by impact-per-rupee, not by how interesting they are.

---

## 1. Diagnosis: why it feels slow

The owner's complaint is two-part, "pages and especially images load sluggishly." These have different causes. Ranking the likely contributors by how much they hurt a real user on this codebase:

### 1.1 Images are the headline problem (highest impact)

Three compounding issues:

1. **No CDN-cached, size-appropriate delivery.** Every post image is a single 1920px WebP served straight from Vercel Blob's origin. A user scrolling the feed on a 390px phone downloads a 1920px-wide image to paint it into a box that is at most `max-h-48` / `max-h-96`. That is roughly 4x to 25x more pixels than needed, multiplied across every image in a 600-posts-a-month feed. This alone can dominate page weight.
2. **The fixed full-screen background image is on every authenticated page.** `landing.jpeg` is loaded as a raw `<img>` covering the viewport in `(main)/layout.tsx`. If that file is a large JPEG, it is a guaranteed render-blocking-feel cost on first paint of *every* page after login, and it is never resized or served responsively. This is very likely a big part of "pages load sluggishly" even on pages with no post images.
3. **No `next/image`, so no automatic responsive `srcset`, no width/height to reserve layout, no lazy strategy beyond the one manual `loading="lazy"`.** The dead `remotePatterns` config confirms this was intended at some point but never wired up.

### 1.2 Database latency and round trips (second highest)

- libSQL over HTTP means **every Prisma query is a network hop**. If the Turso database region and the Vercel function region are not the same continent, you pay tens to over a hundred milliseconds per query. The feed action issues a query that fans out into several includes; even as one Prisma call it is one hop, but cold paths (layout's notification count + the feed fetch + session lookup) stack multiple hops per navigation.
- **Database-backed sessions** (NextAuth v5 Prisma adapter, per `AGENTS.md`) mean **every authenticated request does a session lookup against the DB** before rendering. On a remote HTTP database that is a round trip on the critical path of literally every page. This is a quiet, constant tax.
- **Offset pagination** (`skip: page * 20`) is fine at page 0 to 2 but degrades as people deep-scroll; SQLite must walk and discard skipped rows. Not the current pain, but it will not "stay useful at scale" as the owner explicitly worried.

### 1.3 Cold starts and serverless function spin-up (real but smaller)

- On Vercel's serverless model, infrequently-hit routes cold-start. The owner says people "check infrequently," which is the exact usage pattern that maximizes cold starts: the first visitor each day eats the spin-up. `sharp` is a heavy native dependency that inflates the cold-start of the upload route specifically.
- Moving to **Render changes the cold-start calculus entirely** (see 2.1). On a Render Web Service that is always-on (paid) there are effectively no cold starts; on Render's free tier the service sleeps and the cold start is *worse* than Vercel (tens of seconds to wake). This is a key decision the owner must make consciously.

### 1.4 Caching: there is essentially none configured

Next 16 defaults are largely uncached for dynamic, auth-gated content. Because every `(main)` page is behind auth and reads the session, none of it is statically cached today, and nothing sets explicit cache headers on the Blob image responses beyond Blob's defaults. There is headroom here that costs nothing.

---

## 2. The plan, prioritized and cost-aware

The owner will pay only for high-impact things. So each item below is tagged **FREE** (code or config only), **CHEAP** (a few dollars a month), or **PAY** (a real line item), with a clear verdict on whether to spend.

### TIER 1 — Do these first. Mostly free, biggest felt improvement.

#### 2.1 Pick the Render service type deliberately (this is the cold-start decision) — **PAY, worth it**

Render's free Web Service **sleeps after 15 minutes of inactivity** and takes a long, visible cold start to wake. For a site people "check infrequently," the free tier would make the *first* visit of every session feel broken. That directly contradicts "snappy UX."

**Verdict:** Run the app on Render's **Starter Web Service (currently around 7 USD per month)** so it is always warm. This single line item removes the entire cold-start class of slowness, which on the current infrequent-usage pattern is one of the top three problems. This is the one piece of compute spend that is unambiguously worth it. Do not deploy the user-facing app on Render free.

Set the service region to match the database region (see 2.3). Use `next start` (already the `start` script) behind Render's managed TLS.

#### 2.2 Resize the background image and stop shipping a hero JPEG on every page — **FREE**

The `landing.jpeg` background in `(main)/layout.tsx` is the cheapest big win.

Concrete actions:
- Generate **pre-sized, pre-compressed renditions** of the background (e.g. a 1600px-wide WebP for desktop, an 800px-wide WebP for mobile) as static assets in `/public/images/`. This is a one-time `sharp` script, not a runtime cost.
- Serve them via `next/image` with `fill`, `priority` only if it is genuinely above the fold (it is the background, so actually the opposite, give it low priority and a tiny blurred placeholder), and a `sizes="100vw"`.
- Better still for a *fixed background that never changes*: ship a **small (under 30KB) blurred/low-detail WebP** as the actual layer and accept that a background does not need to be sharp. The frosted-glass design (`backdrop-blur`, the `#F5F0E8]/50` scrim) already softens it, so a low-resolution background is visually indistinguishable. This can cut hundreds of KB off the first paint of every authenticated page for zero dollars.
- Add explicit width/height or use `fill` to avoid any layout shift.

This addresses 1.1.2 directly and is the highest free win.

#### 2.3 Choose the database for Render and put it in the same region — **decision; FREE to CHEAP**

This is the central infra decision. Two viable paths:

**Option A — Render Postgres (recommended).**
- Keeps everything inside one provider, one region, one network. The app's Web Service and the database live in the same Render region, so DB round trips drop to single-digit milliseconds instead of cross-continent HTTP hops. This directly fixes 1.2.
- Render Postgres has a free tier (good for launch/MVP, with the caveat that free Postgres instances expire after a set period and have storage limits) and cheap paid tiers (around 6 to 7 USD per month for a small persistent instance). **Verdict: start free for the MVP launch, move to the cheapest paid instance the moment real data lands**, because a Postgres database that funds the school community should not be on an expiring free tier.
- Migration cost: the schema (`prisma/schema.prisma`) currently declares `provider = "sqlite"`. Moving to Postgres means switching the datasource provider to `postgresql`, swapping `@prisma/adapter-libsql` for the standard Prisma Postgres driver (or `@prisma/adapter-pg` with `pg`), updating `src/lib/prisma.ts`, and running a fresh `prisma migrate`. The schema itself is portable; there are no SQLite-specific column types in use. The libSQL-specific `createPrismaClient()` in `prisma.ts` is the only code that changes.

**Option B — Keep Turso, but co-locate.**
- If the owner wants to avoid a migration, Turso can stay, but the **single most important Turso fix is to place a Turso replica/primary in the same region as the Render service** so the HTTP hop is local. Turso's embedded-replica feature can even keep a local SQLite replica next to the app and sync, which would make reads near-instant. This is more moving parts than Option A.
- **Verdict:** Option B is only worth it if the owner is attached to Turso. For a clean Render migration, Option A (Render Postgres, co-located) is simpler, removes the HTTP-per-query tax, and uses the boring well-trodden Prisma + Postgres path.

**Connection pooling note (important for Render).** On Render, the app is a long-running Node process (`next start`), not per-request serverless functions, so you do **not** have the "thousands of short-lived connections" problem that forces serverless apps onto PgBouncer. A single Prisma client with a modest `connection_limit` is correct here. Keep the existing singleton pattern in `prisma.ts` (the `globalForPrisma` guard) so you do not open a new pool on every hot reload. If you later add background workers or scale to multiple instances, *then* add Render's connection pooler. **Do not over-engineer pooling for MVP.** This is a case where the serverless-era advice (always use a pooler) does not apply to the Render deployment model.

#### 2.4 Switch session strategy or accept the DB session tax — **FREE, decision**

Database-backed sessions cost a DB round trip on every authenticated request (1.2). Two options:
- **Keep DB sessions** (simplest, already working, and once the DB is co-located in 2.3 the round trip is cheap). For MVP this is fine.
- **Switch to JWT sessions** to eliminate the per-request session DB hit entirely. This is a meaningful latency win on every page but changes how session invalidation and the existing admin-bypass (`/api/auth/admin-login`, which creates a DB session) work.

**Verdict:** For MVP, **keep DB sessions but co-locate the DB (2.3)**, which makes the round trip cheap. Revisit JWT only if profiling after launch shows the session lookup is still a top cost. Do not do the JWT migration now; it touches the known-fragile admin-login path.

#### 2.5 Add caching where it is safe and free — **FREE**

- **Static and rarely-changing pages** (the Support page itself, any About/FAQ): mark them static or with a long `revalidate`. They do not need per-request rendering.
- **Blob image cache headers:** Vercel Blob serves images with long cache lifetimes by default; once on Render the images can still live on Blob (see 2.6) and be cached at the browser/CDN. Ensure `Cache-Control: public, max-age=31536000, immutable` on uploaded renditions, which is safe because filenames are content-unique cuids that never change.
- **`next/image` for blob images:** wiring post/group images through `next/image` (2.7) gives automatic caching of optimized renditions, which is free leverage on the already-declared `remotePatterns`.

### TIER 2 — High value, small effort. Do soon after launch.

#### 2.6 Image storage on Render: keep Vercel Blob, do NOT use Render disk — **CHEAP, keep what works**

A natural instinct when moving to Render is to also move image storage. **Resist it.**
- Render Web Services have **ephemeral filesystems**; the local-dev `writeFile` path in the upload route would lose all images on every deploy. Render Persistent Disks exist but force the service to a single instance and are not a CDN.
- **Verdict:** **Keep Vercel Blob** for image storage even though compute moves to Render. Blob is an object store with CDN delivery; it does not care that the app runs on Render. The `put` call in the upload route works unchanged from Render as long as `BLOB_READ_WRITE_TOKEN` is set. This decouples "where the app runs" from "where images live," which is the right architecture. The alternative (Cloudflare R2, Backblaze B2) is cheaper at large scale but not worth the migration for MVP volumes. Reconsider object-store provider only if Blob bandwidth costs become a real line item, which at this community's scale they will not for a long time.

#### 2.7 Generate responsive image renditions at upload time — **FREE (code), the real image fix**

This is the structural fix for 1.1.1. The upload route already runs `sharp`; extend it to emit **a small set of widths** instead of one 1920px file. Concretely, for each uploaded image produce, say, three WebP renditions:
- a **thumbnail** (around 400px wide) for feed cards and grid layouts,
- a **medium** (around 1080px) for single-image posts and the lightbox default,
- the existing **full** (1920px) for full-screen view.

Store all three in Blob under the same cuid prefix (e.g. `<cuid>-400.webp`, `<cuid>-1080.webp`, `<cuid>-1920.webp`). Then either:
- render with `next/image` pointing at the medium and let Next build the `srcset` from the optimizer, **or**
- (lighter, no Next optimizer compute) hand-build a `srcset` from the three renditions and a sensible `sizes` so the browser picks the right one. For an app moving off Vercel's image optimizer, the **hand-built srcset from pre-generated renditions is actually the leaner choice**: no per-request optimization compute on Render, just static files off Blob's CDN.

**Verdict:** generate renditions at upload and serve a hand-built `srcset`. This is the change that makes the feed feel fast on phones, and it costs only a slightly larger upload (a few hundred extra KB written once) and zero per-view compute. It does require a one-time backfill script for already-uploaded images (re-fetch each blob, regenerate renditions). Worth it.

Data-model note: the `Post.images` and `GroupPost.images` fields are currently a single `String?` (a serialized list of URLs). To support renditions cleanly, either (a) store the cuid base and derive rendition URLs by suffix convention (no schema change, simplest), or (b) store a small JSON array of `{ base, widths }` objects. **Recommend (a): convention over storage.** No Prisma migration needed; the rendition URLs are derived from the stored base URL by string manipulation in a shared helper.

#### 2.8 Move the feed off offset pagination to cursor pagination — **FREE, scalability**

The owner explicitly worried the feed "will get cluttered (600 posts a month)" and must "stay useful at scale." `skip: page * 20` degrades with depth. Switch to **cursor pagination** keyed on `(createdAt, id)`. This is a `take` plus `cursor` plus `where` change in `feed/actions.ts`, and it keeps deep scrolls O(1) instead of O(n). It pairs naturally with the shared feed component (the reusable ruled-sheet feed) so the cursor logic lives in one place and every group feed inherits it. No schema change; `createdAt` is already indexed-adjacent and we can add an explicit composite index if needed.

**Verdict:** do this as part of the shared-feed work. It is free and it is the thing that keeps the app from feeling slow a year from now.

#### 2.9 Add the indexes the query patterns need — **FREE**

The schema currently declares only the unique constraints, no secondary indexes. The hot query paths imply these:
- `Post`: index on `(createdAt)` for feed ordering, and on `authorId` for profile feeds.
- `Notification`: composite index on `(userId, read)` — the layout runs `notification.count({ where: { userId, read: false } })` on **every** authenticated page render. Without an index this is a scan.
- `GroupPost`: index on `(groupId, createdAt)`.
- `Comment`: index on `(postId)`.

On SQLite these matter less at small row counts but on Postgres (post-migration) they are the difference between index seeks and sequential scans as data grows. Add them in the same migration that moves to Postgres.

**Verdict:** free, do it with the Postgres migration. The `(userId, read)` notification index is the highest priority because it is on the critical path of every page.

### TIER 3 — Nice, lower priority. Do when convenient.

#### 2.10 Lazy-load and reserve space for all media — **FREE**
Add `loading="lazy"` and `decoding="async"` consistently (post images already lazy; group images and composer previews are not). Always set width/height (or aspect-ratio) to prevent layout shift. Free polish.

#### 2.11 Trim the per-page work in the layout — **FREE**
The notification count query runs on every navigation. Once 2.9's index exists this is cheap, but consider folding it into the same data pass as the session or caching it briefly per request. Minor.

#### 2.12 Profile before paying for bigger compute — **FREE discipline**
After 2.1 to 2.9, measure (Render metrics, a few real-device loads). Only scale the Render instance up if the numbers demand it. The owner pays for impact; the impact items are the always-on instance (2.1), the co-located DB (2.3), and the image renditions (2.7). Everything else is free engineering.

### What is NOT worth paying for (explicit "do not spend" list)
- A dedicated CDN product in front of Render. Blob already CDN-delivers images; HTML is dynamic and auth-gated so a CDN buys little. **Skip.**
- A managed connection-pooler service for MVP. The Render long-process model does not need it (2.3). **Skip until multi-instance.**
- Vercel's image optimizer post-migration. Pre-generated renditions (2.7) replace it for free. **Skip.**
- A larger database tier at launch. The cheapest persistent Postgres is plenty for a community of this size. **Skip until data demands it.**
- Object-store migration off Blob. No payoff at this scale (2.6). **Skip.**

### Migration checklist (Vercel + Turso to Render)
1. Provision Render Postgres in the chosen region; provision the Starter Web Service in the **same** region (2.1, 2.3).
2. Change `schema.prisma` datasource to `postgresql`; replace libSQL adapter in `prisma.ts` with the Postgres driver; keep the singleton.
3. Add indexes (2.9). Run `prisma migrate deploy` against Render Postgres.
4. Migrate existing data (export from Turso/SQLite, import to Postgres) if any production data exists; for a pre-launch MVP this may be a clean start.
5. Set env on Render: `DATABASE_URL` (Render Postgres internal URL), `BLOB_READ_WRITE_TOKEN` (unchanged, Blob stays), `AUTH_*`, `RESEND_*`, `ADMIN_EMAIL`. Note: the email+password auth is now primary per project direction (magic links being removed), so Resend is only for transactional mail.
6. Keep Vercel Blob; verify `put` works from Render with the token.
7. Pre-size the background image (2.2) and add the rendition pipeline + backfill (2.7).
8. Verify the admin-login bypass works on Render (it had a known Vercel-specific bug; the move may actually fix it since Render uses normal Node cookie handling, but test it explicitly).

---

## 3. The Support page

### 3.1 Purpose and framing

This page exists to **fund the owner's hosting and running costs**, and it is **explicitly distinct from school donations** (those are dropped from the product). The emotional frame is *not* charity and *not* a slick fundraising CTA. It is a small, honest "here is what it costs to keep our valley's network alive, chip in if you can, no pressure." The tone matches the rest of the site: warm, plain, a little of the valley in it. **No em dashes in any copy** (project rule).

Naming: call it **"Keep the lights on"** as a section heading inside a page titled **Support**, or simply **Support**. Avoid "Donate" (reserved feeling, and school donations are dropped) and avoid "Pricing" (it is not a paid product).

### 3.2 Information architecture and route

- **Route:** `/(main)/support` (sits inside the authenticated `(main)` group, since this is a members-only network; the page should also be reachable from the footer `src/components/layout/footer.tsx` and possibly a quiet link in the nav, not a loud button).
- **Page is mostly static.** It reads no per-user data except optionally "you have supported, thank you" state (Tier 2). So it can be a cached/static server component with a small client island for the copy-to-clipboard UPI interaction. This keeps it off the hot path and free to serve.

### 3.3 Page content and sections (top to bottom)

1. **Header / hero.** A short warm line and a sub-line. Example copy (no em dashes): heading "Keep the network in the valley alive." Sub: "RV Alumni runs on a small monthly bill. If it has helped you find an old friend or a lost batchmate, you can help keep it going." A restrained hoopoe or banyan motif here is appropriate (decorative duotone Phosphor icon), one of the 2 to 3 places for a small delight, but it must not be cartoonish.

2. **An honest cost breakdown.** This is the heart of the page and the thing that builds trust. Show the *real* recurring costs in plain language, as a small ruled list (reuse the ruled-sheet visual language from the feed so it feels native). Example structure:
   - "Server (Render): about X per month"
   - "Database: about Y per month"
   - "Image storage and delivery: usage-based, a few dollars"
   - "Email (sign-in and invites): a small monthly amount"
   - "Domain: once a year"
   - A single honest total line: "All in, this is roughly Z a month to run."
   The numbers should be the owner's *actual* costs from the plan above (the Starter Web Service at ~7 USD, the cheap Postgres at ~6 to 7 USD, Blob usage, Resend, domain). Honesty is the entire point; do not inflate.

3. **The contribution mechanism (UPI first).**
   - **Phase one: UPI.** Display the owner's **UPI ID** as copyable text and a **UPI QR code** image (a static asset the owner provides). Most of the alumni are in India; UPI is the zero-friction, zero-fee, no-account-needed path, and it costs the owner nothing in processing fees. Provide a "Copy UPI ID" button (the one small client interaction) with a Sonner toast confirmation, and the QR for phone-camera scanning. Optionally a `upi://pay?...` deep link button for mobile that opens the user's UPI app prefilled.
   - **Suggested amounts as gentle chips, not a paywall:** a few preset chips (for example "Cover a month," "Cover a quarter," "Whatever feels right") that, on a UPI deep link, prefill the amount. These are suggestions, never required. Always include an explicit "any amount is genuinely appreciated" line so it never reads as a fee.
   - **Note nicer options as coming.** A small line: "Card and international options are coming for those abroad." This sets expectations honestly without building Stripe/Razorpay now. **Do not integrate a payment processor for MVP**; that is real engineering and fees for a use case UPI already covers. Add a hosted checkout (Razorpay for India + card, or a simple Stripe Payment Link for international) only once volume or overseas alumni demand justify it.

4. **A "what your support pays for" reassurance.** One short paragraph: support keeps the directory, feed, groups, and archive running and ad-free, and it is never a requirement to use the site. Reinforce invite-only and no-ads as the values being protected.

5. **Optional: a quiet acknowledgement.** "Thank you to everyone keeping this going." Could later become a supporters wall (Tier 2, opt-in only, see parked features).

### 3.4 Visual and component reuse

- Reuse the **ruled-sheet surface** for the cost breakdown so it reads as part of the same world as the feed.
- Reuse the existing **card / surface tokens** (`src/components/ui/card.tsx`) and the **`.glass`** utility for the contribution panel sitting over the fixed background.
- Use the **alumni-office blue `#3F7CA6`** accent for the single primary contribution action (this is exactly the "pop" the design system reserves the blue for, and it differentiates "support" from the green-primary everyday actions). Note this blue is in the v2 design intent but **not yet a token in `globals.css`**; it needs to be added as `--color-office-blue` (and a foreground) before this page uses it, so the page does not hardcode a hex.
- Buttons: reuse the established pill button styling seen in the v2 preview (`.v2-btn`), with proper `hover`, `focus-visible`, and `active` states per the project's interactive-states rule.
- LiftKit golden-ratio spacing for all padding/gaps; no arbitrary Tailwind steps.
- One **small delight**: a subtle motion on the hoopoe/banyan motif or a gentle scale on the contribution button press (`transform`/`opacity` only, spring easing, never `transition-all`). This is one of the 2 to 3 sanctioned easter-egg spots. Keep it quiet.
- Mobile (390x844) must be verified: the QR code and copy button stack vertically, the cost list stays readable, amounts chips wrap.

### 3.5 Data model deltas for Support

For the **UPI-first MVP, none.** The page is static content plus an owner-provided UPI ID and QR image. There is no payment capture, so no transactions to store. This keeps MVP truly minimal.

If/when the owner wants to record contributions (only meaningful once a real processor with webhooks exists, Tier 2+), add a `Contribution` model:

```
model Contribution {
  id        String   @id @default(cuid())
  userId    String?            // null for anonymous / off-platform UPI
  amount    Int                // in paise/cents, integer to avoid float money
  currency  String   @default("INR")
  method    String             // "upi" | "card" | "manual"
  status    String   @default("pending") // "pending" | "succeeded" | "failed"
  reference String?            // processor txn id; unique when present
  note      String?            // optional message from supporter
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

and a back-relation `contributions Contribution[]` on `User`. **Do not add this for the UPI-only MVP**; UPI payments land in the owner's bank, not the app, so there is nothing reliable to record without a processor webhook. Adding the model prematurely creates an empty table and a false sense of tracking. Introduce it the same day a processor webhook does.

### 3.6 Edge cases for the Support page

- **User has no UPI app / is abroad.** The "nicer options coming" line and the copyable UPI ID cover this; the QR is useless to them but the page must not feel broken. Make the international note visible, not buried.
- **Copy-to-clipboard unsupported / fails.** Fall back to showing the UPI ID as selectable text with a "select and copy manually" affordance; toast on success only.
- **QR image missing or slow.** It is a static asset; pre-size it (small WebP/PNG) and give it explicit dimensions so there is no layout shift, and an `alt` describing the UPI ID.
- **Page must work logged-out?** Decision: keep it inside `(main)` (members-only), since the whole network is invite-only and there is no public marketing surface. If the owner later wants to let lapsed/curious visitors support, move it to a public route, but that is not MVP.
- **No pressure invariant.** Every revision of the copy must preserve "this is optional, the site is free to use." Guard against drift toward dark-pattern fundraising language.

### 3.7 Parked future feature: campaign cards with progress

Note explicitly, as the owner flagged: a future **"campaign" concept** where a specific goal (for example "raise the year's hosting," or a one-off like "fund the photo archive scanning") is shown as a **card with a progress bar** toward a target amount. This is a genuinely nice motivator and fits the warm, transparent framing.

- **Parked, not MVP.** It only becomes real once contributions are actually captured (3.5's `Contribution` model + a processor webhook), because a progress bar needs a trustworthy running total. A progress bar fed by manual hand-edited numbers would undermine the honesty that makes the page work.
- **When built:** a `Campaign` model (`id`, `title`, `description`, `goalAmount`, `raisedAmount` derived or cached, `startsAt`, `endsAt`, `status`), rendered as a reusable card with an animated progress fill (`transform: scaleX` for the fill, spring easing, `transform`/`opacity` only). The Support page would show the active campaign at the top and fall back to the evergreen "keep the lights on" cost breakdown when no campaign is live.
- Keep it as one card, not a Kickstarter clone. No tiers/rewards; this is a school community, not a crowdfunding platform.

---

## 4. One-paragraph summary of the verdicts

Spend money on exactly three things: an always-on Render Starter Web Service (kills cold starts, ~7 USD/mo), a co-located cheap Postgres instance once data is real (kills DB round-trip latency), and the engineering time to add image renditions (kills the image-weight problem). Keep Vercel Blob for storage even after moving compute to Render. Do everything else for free: pre-size the full-screen background image, wire a hand-built responsive `srcset` from pre-generated WebP renditions, move the feed to cursor pagination, add the `(userId, read)` notification index and the feed `createdAt` index, and keep DB sessions but co-located rather than doing a risky JWT migration now. Do not buy a CDN, a connection pooler, Vercel image optimization, or a bigger DB tier for MVP. The Support page is static UPI-first content with an honest cost breakdown and the alumni-office blue reserved for its single primary action, no payment processor and no `Contribution` table until a real webhook exists, with campaign-cards-with-progress explicitly parked behind that same prerequisite.

**Files grounding this spec (no edits made):** `/Users/sanan/Documents/rv-alumni/src/lib/prisma.ts`, `/Users/sanan/Documents/rv-alumni/src/app/api/upload/route.ts`, `/Users/sanan/Documents/rv-alumni/next.config.ts`, `/Users/sanan/Documents/rv-alumni/src/app/(main)/layout.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/posts/post-card.tsx`, `/Users/sanan/Documents/rv-alumni/src/app/(main)/feed/actions.ts`, `/Users/sanan/Documents/rv-alumni/prisma/schema.prisma`, `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx`, `/Users/sanan/Documents/rv-alumni/src/app/globals.css`.