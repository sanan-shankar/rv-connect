# member-surfaces - refactor audit 2 report

Territory reader for the member-facing surfaces outside the feed, directory, collection and
catch-ups: letters (index, read, new, edit, the desk, the drafts strip), messages (member <->
admin threads), notices, support (contribute, costs card, wood, bird plate and picker),
settings' theme cluster (dark gauntlet, nightfall, lights-on, theme actions), about, the guide
(door, layer, overlay, kit, the chapters barrel), the PWA install tile and prompt, the demo
bar, the policies group, the account export, the Razorpay and Resend webhooks, and the small
libs behind them (razorpay, contribution-state, account-purge, theme, guide-areas,
guide-open, local-storage, wordle). Date: 2026-09-03, at HEAD `72b5a1d`. Files in territory:
73 (30 app route/loading files, 3 API routes, 30 components, 10 lib files) plus 7 test files;
read fully: 80 of 80. Neighbours read for the pairing questions (not audited): the admin
messages half (4 files), `admin-threads.ts` / `admin-threads-server.ts`, `page-header.tsx`,
`(main)/layout.tsx`, `use-engagement.ts`, the letter branch of `post-card.tsx`, the rail's
`letters-module.tsx`, `manifest.ts`, `post-visibility.ts` (guard half), `docs/spec/guide.md`.

## Coverage

- Read fully: `src/app/(main)/{letters,messages,notice,support,about,dark-mode,guide}/**`,
  `src/app/(policies)/**`, `src/app/api/{account/export,razorpay/webhook,resend/webhook}/route.ts`,
  `src/components/{letters,messages,support,guide,pwa}/**`, `src/components/settings/{actions.ts,
  dark-gauntlet.tsx,lights-on.tsx,nightfall.tsx,theme-actions.ts}`, `src/components/demo/demo-bar.tsx`,
  `src/lib/{razorpay,contribution-state,account-purge,theme,guide-areas,guide-open,local-storage,
  wordle}.ts`, and the seven tests (`contribution-state`, `valley-day`, `valley-year`,
  `purge-rule`, `cascade-rule`, `loading-boundary-rule`, plus `image-purge-rule` skimmed for its
  subject). Specs: `docs/spec/letters.md`, `docs/spec/demo.md`, `docs/spec/guide.md`,
  `docs/spec/profile.md` (export section). Audit 1: `work/agents/member-surfaces.md` in full,
  the fix-prompt rows that touch this territory, report.md's owner-decision list.
- Skimmed (why): `src/components/posts/post-card.tsx` (only the letter branch, the engagement
  state block and the admin-remove menu, lines 236-310 and 385-450: feed-posts territory, read
  to answer the "parallel path" question); `src/components/posts/comments-section.tsx` (grep for
  `alwaysOpen`/`expectedCount` only); `src/lib/retention.ts` (the `KEEP_DAYS` table only, to check
  the privacy page's numbers).
- Not read: nothing in the charter left unread. The avatar crop, the composer itself, the email
  templates and the bird glyph renderer were outside the charter and were not opened beyond the
  lines named above.
- Uncommitted edits seen (someone else's WIP): none in my territory (`git status --short` over
  every path above is empty). `src/components/common/image-viewer.tsx` is modified in the tree
  (media-viewer territory); `letter-images.tsx` dynamic-imports it, so a fix session on
  member-surfaces-02 should re-check that file's export name at the time.
- Build evidence: `raw/route-bundle-stats.json` (diffed per route against `/about`, the
  smallest `(main)` page), `.scratch/audit2-build/.next/static/chunks/*.js` grepped read-only for
  string markers to attribute bytes. No build, no browser, no database was run.

## Summary

The shape: a dozen small, well-argued surfaces, all of which were already audited once, and a
money path that is as tight as it was a month ago. The territory's biggest cost is not in any of
its own routes but in what one of them hangs on every route: the guide's sheet, six chapters and
their kit are imported statically by `GuideLayer`, which the `(main)` layout mounts on every
authenticated page, so roughly **11-13 KB of raw JS** (about a third of the 23.6 KB layout chunk
`3hd4ups9q-ds3.js`, whose other tenants are the demo bar and the install-prompt capture) rides
on every page for a panel almost nobody opens (finding 01). Second, `/letters/[id]` is the
heaviest route in the territory (1,144 KB, +54 KB over `/about`) because `LetterEngagement`
imports `CommentsSection` and `ModerationDialog` statically where `PostCard` lazy-loads both
(02). Third, a query on the letters index fetches every draft's full body and drops it (03).
After those it is carry-overs and hygiene: the parked `wood.tsx` still sits in the shipped
component tree with a stale revival note (04), three comments still describe a fourteen-bird
plate that has been twelve since 2026-08-22 (05), `theme-actions.ts` still carries the alias
wrapper audit 1 asked to collapse (06), two comments and a `generateStaticParams` claim static
rendering that the root layout's cookie read makes impossible for every route in the app (07),
the guide spec still describes an intercepting route that was replaced on 2026-08-27 (08), and
the privacy policy's "Last updated" predates its last edit (09). Structural-vs-cheap: 5
structural (01, 02, 03, 04, 13), 12 cheap. The surprise: how many audit-1 rows landed only
half. What audit 1 left that is now moot: the `/donate` stub, the QR pipeline,
`updateUserProfile`, the hoopoe trio, the loading twins, the excerpt/read-time hand-rolls and the
`/groups` branches are all gone; `/notice` has its dated ledger line. The answers to the seven
charter questions are given inline and collected at the end of the Not-findings section.

## Findings

### member-surfaces-01 - Load the guide's sheet and chapters on first press, not on every page
- **Where**: `src/components/guide/guide-layer.tsx:16-17` (static `import { CHAPTERS } from
  "./chapters"` and `import { GuideOverlay }`), `src/components/guide/guide-door.tsx:93-110`
  (the press handler, where the preload belongs), `src/app/(main)/layout.tsx:16,153`
  (the mount), `src/components/guide/chapters/index.tsx` (the registry)
- **Phase**: architecture (bundle placement); the barrel itself stays
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (with a measured gate; the
  owner tuned this interaction's latency and should be told the result)
- **Evidence**: `GuideLayer` is a `"use client"` component mounted once in `(main)/layout.tsx`
  and returns `null` until `openGuide()` is called, but its imports are static, so the six
  chapters (`chapters/*.tsx`, 14 KB of source), `guide-kit.tsx` (6.7 KB), `guide-overlay.tsx`
  (5.4 KB) and `guide-layer.tsx` land in the `(main)` layout's client chunk. That chunk is
  `.next/static/chunks/3hd4ups9q-ds3.js`, 23,588 bytes, present in `firstLoadChunkPaths` of
  every `(main)` route in `raw/route-bundle-stats.json` (I diffed `/letters`, `/support`,
  `/messages`, `/dark-mode`, `/feed`, `/guide/[area]` against `/about`: it is in all of them and
  absent from `/privacy`, which has no `(main)` layout). Grepping that chunk for markers: the
  feed chapter's lede "Where the everyday things go" sits at byte 7,914, the catch-ups chapter
  at 16,726, "See all fifty" (birds) at 18,309 and "Close the guide" (the overlay) at 19,115;
  the demo bar's "Have a look around" is at 2,440 and `beforeinstallprompt` at 22,418. So the
  guide occupies roughly bytes 7,900-19,200 of the chunk: about 11-13 KB raw (roughly 4 KB
  gzipped) on every authenticated route, for a sheet that opens only when a page title is
  pressed. `docs/spec/guide.md` section 4 says the door is deliberately invisible and
  discoverable by nobody browsing, which is exactly the profile of code that should not be in
  first load. The two consumers of the `CHAPTERS` registry (`guide/[area]/page.tsx`, a server
  page, and `GuideLayer`) both genuinely need all six entries, so the barrel does not "defeat
  tree-shaking"; it is a registry, and the cost is where it is imported from, not that it
  exists.
- **What to do**: (1) Create `src/components/guide/guide-sheet.tsx` (client) that owns what
  `GuideLayer` renders today once `found` is known: `import { CHAPTERS } from "./chapters"`,
  `import { GuideOverlay } from "./guide-overlay"`, and `export function GuideSheet({ slug,
  title })` returning `<GuideOverlay title={title}><Chapter /></GuideOverlay>`. (2) In
  `guide-layer.tsx` replace the two static imports with `const GuideSheet = dynamic(() =>
  import("./guide-sheet").then((m) => m.GuideSheet), { ssr: false })` and render `<GuideSheet
  slug={found.slug} title={found.title} />`; keep the store subscription, `usePathname` reset
  and popstate wiring exactly as they are (they are tiny and must be mounted early). (3) In
  `guide-door.tsx`, warm the chunk before the press lands the way `letter-images.tsx:51`
  already does for the viewer: `onPointerEnter={() => void import("./guide-sheet")}` on the
  anchor, and the same call inside the touch branch when the first tap ARMS (`setArmed(true)`),
  so on a phone the chunk is fetched during the two-step and the second tap opens instantly.
  (4) `guide-open.ts`'s header should gain one sentence saying the sheet is code-split and
  preloaded on hover/arm, so the next session does not read "no network in the path" and undo
  this. (5) `guide/[area]/page.tsx` keeps its static `CHAPTERS` import (server; not in the
  client bundle).
- **Saving**: ~11-13 KB raw client JS (~4 KB gzipped) off the first load of every authenticated
  route (52 non-lab routes); the `(main)` layout chunk drops from 23.6 KB to ~11 KB. 0 lines.
- **Risk & gate**: medium (the owner's smoothness demand: `guide-open.ts` records that a
  400-444 ms ROUTE navigation "no easing curve survives"; a 4 KB chunk fetch is a different
  order of magnitude, and preloaded on hover it is zero). Gate: `npm run check`; then in
  `chrome-devtools`, cold-load `/feed`, hover the title, click, and confirm via
  `list_network_requests` that the sheet chunk was fetched on hover and the overlay animated
  in; repeat at 390x844 with a touch tap-tap; confirm `/guide/birds` still renders standalone
  on a cold load. `npm run visual` (no route photographs the open sheet, so expect green).
  Measure the layout chunk before and after with `route-js` numbers, at the browser, per the
  audit-1 fix-prompt's warning that `route-js.mjs` alone could not see the DemoBar result.
- **Confidence**: high on the bytes (string offsets in the built chunk); medium on whether the
  owner accepts any first-press fetch at all for a keyboard user who never hovered. The one
  thing that would change my mind: if the `Sheet` primitive is NOT already in the layout chunk
  (the sidebar's mobile drawer imports `ui/sheet`, so I believe it is) the moved bytes would be
  larger, which only strengthens the case.
- **Notes**: This is the one place audit 1's "dynamic in the `(main)` layout did nothing"
  refutation does NOT apply: that attempt used `next/dynamic` in a SERVER component where
  `ssr: false` is illegal and Turbopack did not split. `GuideLayer` is a client component, and
  the fix-prompt itself (line 1120) says the outcome "may genuinely differ" for client
  components. Related: 08 (the spec that still describes the old mechanism). Alternative
  rejected: dynamic-importing each chapter individually (six chunks for six 1-3 KB files is
  worse than one). The chunk's other tenants (DemoBar, InstallPromptCapture) were measured and
  refuted at audit-1 fix time and are not re-proposed here.

### member-surfaces-02 - Lazy-load the moderation dialog (and measure the comments block) on the letter page
- **Where**: `src/components/letters/letter-engagement.tsx:8-9` (static `CommentsSection` and
  `ModerationDialog` imports), `:86-101` (their render sites); compare
  `src/components/posts/post-card.tsx:63-76` (both `dynamic()`)
- **Phase**: architecture (bundle placement)
- **Tier**: T2 for the dialog, T3 for the comments block     **Class**: structural
  **Decides**: autonomous for the dialog; the comments half needs a measurement, then is autonomous
- **Evidence**: `raw/route-js.txt` puts `/letters/[id]` at 1,117 KB, the heaviest route in the
  territory and 34 chunks against `/about`'s 31. The per-route diff against `/about` shows its
  extra first-load chunks are `15cj6lz1ay0c8.js` (21,434 B), `1fxjfjfygzry5.js` (22,615 B),
  `3evj1hvsedjp7.js` (18,411 B, shared with `/feed`) and a 353 B stub. Grepping the built
  chunks: "Like this letter" (letter-engagement) is in `15cj6lz1ay0c8.js`, and both
  `15cj6lz1ay0c8.js` and `1fxjfjfygzry5.js` carry `alwaysOpen`/`onCommentRemoved`
  (comments-section) and `itemLabel` (moderation-dialog) markers, while neither appears in
  `/feed`'s first load, where `post-card.tsx` declares `const CommentsSection = dynamic(...)`
  and `const ModerationDialog = dynamic(...)`. So on a letter the comments stack (700 lines) and
  the admin dialog (104 lines) are in first load; on the feed they are not. The comments are
  `alwaysOpen` on a letter, so they render on every view, but they sit below a full-length
  letter body and `CommentsSection` already paints skeleton rows (`expectedCount`) while it
  fetches, so a lazy chunk changes nothing the reader sees at the top of the page.
  `ModerationDialog` is admin-only (`viewerIsAdmin &&`) and needed by one member.
- **What to do**: (1) In `letter-engagement.tsx`, mirror `post-card.tsx:75-78`: `const
  ModerationDialog = dynamic(() => import("@/components/admin/moderation-dialog").then((m) =>
  m.ModerationDialog), { ssr: false })`; the existing `viewerIsAdmin &&` guard already keeps it
  unmounted for members. (2) Same shape for `CommentsSection` with a `loading` fallback of the
  two skeleton rows it draws itself (or simply reuse its own skeleton by passing
  `expectedCount` as today), and warm it with `void import("@/components/posts/
  comments-section")` from the page's `LetterTitle` mount or on first scroll: measure first
  (below). (3) No test to move; `letter-engagement.tsx` has no pin.
- **Saving**: ~4 KB raw JS off `/letters/[id]` now (the dialog); up to ~40 KB more if the
  comments stack measures as a separate chunk the way it does on `/feed`. 0 lines.
- **Risk & gate**: low for the dialog (admin-only, same pattern as the feed). Medium for the
  comments: gate at the browser with `chrome-devtools` on a letter with comments, at 1440 and
  390, confirming no layout jump at the comments boundary and that the comment count in the
  engagement row is unaffected. `npm run check`; `npm run visual` (`/letters` index only is
  photographed; the reading page is not).
- **Confidence**: high on the dialog; medium on the comments (Turbopack may merge the chunk
  back if the letter page is the only consumer of a shared piece; the measurement decides).
- **Notes**: This is the concrete form of the charter's "letters-only parallel path" question.
  The engagement row is NOT a fork of `PostCard`: it composes the same `LoveButton`,
  `BookmarkButton`, `ShareButton`, `useHeartToggle`/`useBookmarkToggle`, `CommentsSection` and
  `ModerationDialog`, and `use-engagement.ts:19-23` says in so many words that the state stays
  the caller's business. The only drift between the two sites is this loading decision, and the
  copy on the share/bookmark labels. See Not-findings for why I did not propose a further
  `usePostEngagement` hook.

### member-surfaces-03 - Stop fetching every draft's body on the letters index
- **Where**: `src/app/(main)/letters/(index)/page.tsx:98-103` (the drafts query's `select`),
  `:144-151` (the mapping), `src/components/letters/drafts-strip.tsx:12-16` (`DraftSummary`)
- **Phase**: dead (a column fetched and dropped)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the query selects `{ id, title, content, updatedAt }` for up to 20 drafts;
  `DraftSummary` is `{ id, title, updatedAt }`; the page maps only those three (`drafts.map((d)
  => ({ id: d.id, title: d.title, updatedAt: d.updatedAt.toISOString() }))`); `DraftsStrip`
  renders `d.title?.trim() || "Untitled letter"` and never reads a body. `content` is never
  used. A letter body is capped at 20,000 characters (`docs/spec/letters.md` section 2.2), so a
  member with twenty drafts pulls up to 400 KB through the pooler on every visit to `/letters`
  for nothing.
- **What to do**: delete `content: true` from the select on line 100. Nothing else changes;
  the strip's props are unaffected.
- **Saving**: up to ~400 KB of database transfer per index load for a prolific drafter, 0 for
  most; 1 line.
- **Risk & gate**: none beyond `npm run check` (TypeScript will not even notice). Open
  `/letters` signed in as Jerry with a draft and see the strip.
- **Confidence**: high. Would change my mind: a future "Untitled letter" fallback that derives
  a title from the first line of the body, which is what `letterTitle()` does for published
  letters; if that is wanted, select `content` and call `letterTitle` in the mapping, but do it
  then, not now.
- **Notes**: `git blame` shows the select has carried `content` since the strip was a
  quick-edit dialog (2026-07) that opened the body in place; the desk replaced that on
  2026-07-30 and the column stayed.

### member-surfaces-04 - Move the parked aviary out of the shipped component tree and fix its stale revival note
- **Where**: `src/components/support/wood.tsx` (246 lines, one importer:
  `src/app/lab/support-ideas/_variant-aviary.tsx`), `src/app/(main)/support/page.tsx:60-64`
  (a comment that says the bird field mounts "from the APP SHELL (wood-mount.tsx)"; no such file
  exists anywhere in `src/`)
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: audit 1's member-surfaces-04, filed as "optional" at fix time (fix-prompt line
  313-314: "each had one agent for and one against") and not done. State today: `grep -rn
  "SupportWood\|support/wood" src` finds the definition and the lab variant only; nothing under
  `(main)` mounts it, and the chunk grep confirms no `/support` first-load chunk carries its
  strings. `src/app/lab/_registry.ts:226` was corrected by the audit-1 stale-comment batch and
  now says "lab-only: nothing on /support mounts it", but `support/page.tsx:60-64` still tells
  the next reader the field mounts from `wood-mount.tsx`, a file that does not exist, and
  `wood.tsx:9-14` still gives revival instructions that reference mounting from
  `app-shell.tsx`, which is accurate but lives in a file whose folder says "shipped".
- **What to do**: `git mv src/components/support/wood.tsx src/app/lab/support-ideas/_wood.tsx`;
  update the one import in `_variant-aviary.tsx`; rewrite `support/page.tsx:60-64` to keep the
  true and useful half (the transform-containing-block warning about `(main)/template.tsx`) and
  drop the `wood-mount.tsx` sentence; leave `wood.tsx`'s own header and its 127 comment lines
  untouched (they are the tuning history the parking exists to preserve).
- **Saving**: 246 lines leave `src/components` (0 lines net); one false comment corrected; the
  shipped component tree stops claiming a member surface it does not have.
- **Risk & gate**: low. `npm run check` (the lab registry audit runs in it); open
  `/lab/support-ideas?v=aviary`.
- **Confidence**: high. Would change my mind: the owner preferring the parked design to sit in
  the prod tree as a statement of intent; memory records it as "aviary parked in wood.tsx
  (lab-only)", which is a location fact, not a preference.
- **Notes**: the lab lens should take `src/app/lab/support-ideas/_shared.tsx:374-382`, which
  jscpd pairs with `bird-plate.tsx:123-131` (the caption span), and the knip-dead lab exports
  `PLEDGE/SEGMENTS/MONTHLY/BUILD_COST/BUILD_RECOVERED` in the same file; those are lab history
  and only their `export` keywords are dead.

### member-surfaces-05 - Correct the comments that state a fourteen-bird plate, a composer that left, a sidebar that never imported, and a wedged await
- **Where**: `src/app/(main)/support/page.tsx:24` ("everyone else sees the fourteen-bird
  plate"); `src/components/support/bird-picker.tsx:10` ("on the fourteen-bird plate") and
  `:105` ("The fourteen-bird plate on /support keeps its spotlight");
  `src/app/(main)/letters/(index)/page.tsx:54-55` ("Reused below for the composer's 'Show to'
  audience control (same list, no second query...)"); `src/components/guide/chapters/index.tsx:1-3`
  ("so that the area list stays a plain data module the sidebar and the door can import");
  `src/lib/account-purge.ts:409-415` (a nine-line comment placed between `await` and
  `prisma.pendingImagePurge.updateMany(`)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `plate-data.ts:1-8`: "The twelve birds on /support ... Down from fourteen (owner,
  2026-08-22)". Audit 1's member-surfaces-14 named `support/page.tsx:24` and the picker; the
  fix session corrected the picker's re-picking paragraph (`bird-picker.tsx:20-25` now states
  the one-pick-per-contribution rule) but all three "fourteen" mentions survived. The letters
  index has had no composer since 2026-07-30 (`new/page.tsx:10-12`: "A whole page for
  writing"); `viewerCities` has exactly one use on that page, `audienceWhere(session.user,
  viewerCities)` at line 73, so the comment describes a reuse that no longer exists. Nothing in
  `src/components/layout/sidebar.tsx` imports `guide-areas` (the sidebar Guide row was reverted
  per `docs/spec/guide.md` section 4), and `guide-door.tsx` imports only `guide-open`, so
  neither half of the barrel comment's rationale is true; the true reason the registry is a
  separate module is that `/guide` (the index page) needs the area list without six components.
  The `await /* ... */ prisma...` shape in `account-purge.ts` is legal and the comment (audit
  C-118) is worth keeping; it just reads as a syntax error at first glance.
- **What to do**: "fourteen-bird" -> "twelve-bird" at the three sites. Delete the two-line
  comment at `letters/(index)/page.tsx:54-55`. Rewrite `chapters/index.tsx:1-3` to: "slug ->
  chapter. Kept beside the chapters rather than in guide-areas.ts so /guide's index can list
  the areas without importing six React components." Move the C-118 comment in
  `account-purge.ts` to the line above the `await`.
- **Saving**: 2 lines; four comments that stop misleading the next session (this repo treats a
  wrong comment as a bug: C-049's whole write-up is one).
- **Risk & gate**: none beyond `npm run check` (comment-only plus one deleted comment).
- **Confidence**: high.
- **Notes**: I looked for the reverse case too, a comment that is dated and reason-carrying but
  reads like narration; the money path's "Conditional, not check-then-write" blocks
  (`webhook/route.ts:199-208`) are the model of the kind to keep, and nothing in this territory
  restates its next line.

### member-surfaces-06 - Collapse the `setTheme` / `setThemePreference` alias that audit 1 asked to collapse
- **Where**: `src/components/settings/theme-actions.ts:31` (`async function setTheme`),
  `:67-75` (the exported wrapper and its eleven-line comment "One implementation, two names;
  collapse to one when the flow ships")
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: audit 1's member-surfaces-11 said "rename `setTheme` to `setThemePreference`,
  delete the alias and its 11-line comment". The fix session instead de-exported `setTheme` as
  part of the ~55-symbol de-export sweep (commit `2f43a3d`) and widened
  `gate-coverage.test.mjs` to read every async function so the private one kept its inherited
  gate (fix-prompt lines 210-215). The wrapper and its comment are still there, now describing
  a private function and a public one that does nothing but call it. Both callers
  (`lights-on.tsx:11`, `dark-gauntlet.tsx:29`) import `setThemePreference`; the shadowing
  collision the comment cites (next-themes' client `setTheme` in the same scope) is real and is
  exactly why the SURVIVING name should be `setThemePreference`. `gate-coverage.test.mjs`
  contains no mention of `setTheme` (grep), so the rename does not touch a pin.
- **What to do**: rename the function on line 31 to `setThemePreference`, add `export`, delete
  lines 67-75. The `"use server"` file then exports one async function with its `auth()` gate
  inline, which is the shape `gate-coverage` asserts over exported actions.
- **Saving**: ~12 lines; one fewer indirection in the dark-mode write path.
- **Risk & gate**: low. `npm run check` (`gate-coverage.test.mjs` and `security-regressions
  .test.mjs` run in it); walk `/dark-mode` to the regrets step and press "No regrets", then
  `/dark-mode` again and press "Turn off dark mode".
- **Confidence**: high.
- **Notes**: the charter asked whether "four theme components" are one feature. They are:
  `dark-gauntlet.tsx` (504) is the ceremony, `nightfall.tsx` (160) its payoff scene,
  `lights-on.tsx` (43) the asymmetric exit, `theme-actions.ts` (75) the one server write,
  with `lib/theme.ts` (38), `lib/wordle.ts` (60) and the route (50) behind them: ~930 lines
  for one toggle, owner-scripted ("insanely well"), kept per audit 1's not-finding. This alias
  is the only leftover in the cluster; see also the copy note in 10.

### member-surfaces-07 - Stop claiming static rendering that the root layout makes impossible
- **Where**: `src/app/(main)/guide/[area]/page.tsx:8-13` (`generateStaticParams` and "Static, so
  a chapter costs nothing to serve and nothing to render"); `src/app/(policies)/layout.tsx:5-7`
  ("Public and static — no auth() call")
- **Phase**: hygiene (in this territory); the root cause is a bundle-build item, see For other lenses
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/build.txt` marks every page route in the app `ƒ (Dynamic)`; the only `○`
  entries are `/apple-icon.png`, `/icon.svg`, `/manifest.webmanifest`, `/robots.txt` and
  `/sitemap.xml`. `/guide/[area]`, `/privacy`, `/terms` and `/guidelines` are all `ƒ`. The
  cause is `src/app/layout.tsx:65` and `:83`: `getThemeCookie()` (which calls `cookies()`) in
  both `generateViewport` and the root layout body, which opts every route into dynamic
  rendering. Under `(main)` there is a second, independent reason (`auth()` and `headers()` in
  the layout), so `generateStaticParams` on the chapter page can never prerender anything and
  is dead weight; the comment above it is false. The policies layout's "static" is false at the
  framework level (the page IS static in the sense of no data fetch; it is not prerendered).
- **What to do**: delete `generateStaticParams` (lines 11-13) and rewrite lines 8-10 to say
  the chapter is a plain page with no per-member state (which is the true and useful half);
  rewrite `(policies)/layout.tsx:6` to "Public: no auth() call, so a stranger reading the
  privacy policy costs one render and sees no chrome that assumes an account" (drop "static").
  Do NOT try to make the policy pages static from inside this territory: the cookie read is in
  the root layout for the SSR-consistent theme class, and only the bundle-build lens should
  weigh moving it (see For other lenses).
- **Saving**: 5 lines; two comments stop promising a build behaviour the app does not have.
- **Risk & gate**: none. `npm run check`; `npm run verify:crawl` (the chapter routes still 200).
- **Confidence**: high (the build log is unambiguous).
- **Notes**: the route-JS table shows `/privacy` at 645 KB first load for three pages of prose,
  because the root layout's client tree (motion, next-themes, PostHog proxy, fonts) is under
  every route. That is the bundle lens's, not mine, but the policies group is the cheapest
  place to see it.

### member-surfaces-08 - Bring `docs/spec/guide.md` back in line with the shipped guide
- **Where**: `docs/spec/guide.md` section 2.2 ("Next 16 does this with intercepting routes"),
  section 3 "The interception" (the `@modal/(..)guide/[area]` paragraph and its "budget a round
  of fighting it" advice), section 9 ("The interception, so a press from inside the app opens
  the chapter over the page"), and the section 6 table's Letters row ("That a letter goes to
  one person and is private")
- **Phase**: hygiene (docs)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `find src/app -name "@modal" -o -name "(..)*"` finds nothing. Commit `820762a`
  (2026-08-27, "perf(guide): take the route out of the press, and the address with it")
  replaced the intercepting route with the `guide-open.ts` external store and the
  `GuideLayer` in the `(main)` layout; `guide-open.ts:1-27` records the two measured failures
  that led there (404-444 ms before the sheet existed; `history.pushState` fighting Next's
  router). The spec's section 6 table still says a letter "goes to one person and is
  private", while its own section 9 says that assumption "is the opposite of true" and the
  shipped `chapters/letters.tsx` says "Every member" reads it. A session started from this spec
  would rebuild the intercepting route the code deliberately removed.
- **What to do**: rewrite 2.2's last two sentences and section 3's "The interception"
  paragraph to describe the shipped mechanism (client state in `src/lib/guide-open.ts`, a
  same-URL history entry so back closes the sheet, `/guide/[area]` kept as a real page for cold
  loads and shared links, the measurement that decided it). Replace section 9's "The
  interception..." bullet with the same. Fix the section 6 Letters row to "Every member reads
  it; it keeps its own index so it does not compete with the feed". Leave the 2026-08-26/27
  decision history intact; the spec's value is the reasons.
- **Saving**: 0 lines; a spec that stops contradicting the code it governs.
- **Risk & gate**: none (docs). No test reads the guide spec.
- **Confidence**: high.
- **Notes**: `docs/spec/guide.md` is the newest spec in the repo (nine days old) and already
  carries two reversals in its own text; that is fine, but the reversals need to reach the
  sections that still state the earlier plan.

### member-surfaces-09 - The privacy policy's "Last updated" predates its last edit
- **Where**: `src/app/(policies)/privacy/page.tsx:21` (`<DocTitle updated="20 August 2026">`),
  `:133` (the PostHog row)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: owner (it is a legal document's date; the
  edit itself is trivially autonomous)
- **Evidence**: `git log -- "src/app/(policies)/privacy/page.tsx"` shows `bd7da7d` on
  2026-08-26 ("refactor(analytics): one analytics tool, not two") changed the processors table
  row from "PostHog and Vercel Analytics" to "PostHog". The document still says "Last updated
  20 August 2026", and its own "Changes" section promises "the date at the top always says
  when it was last touched". `terms` and `guidelines` have not changed since 20 August, so
  their dates are right. While here I checked the retention table against
  `src/lib/retention.ts:32-41`: messages 730 days = "2 years", reports 1095 = "3 years",
  contributions 3650 = "10 years", notifications 365 = "1 year", security logs 365 = "1 year",
  email log 180 = "180 days", deletion `DELETION_GRACE_DAYS` 60 = "60 days". All seven match
  today; nothing pins them (audit 1's FOL suggested a rule test and it was not written).
- **What to do**: set `updated="26 August 2026"` (or the date of the fix commit, since the
  fix itself is an edit). Optionally add a `(policies)` rule test that reads the privacy page
  and asserts each `KEEP_DAYS` value appears in its row, so the next retention change fails the
  gate instead of the policy; that is an addition, listed here only because the drift is the
  kind a member could hold the owner to.
- **Saving**: 0 lines; a true date on a document members are asked to rely on.
- **Risk & gate**: none. `npm run visual` photographs `/privacy` and will show the one-word
  diff; accept it with `visual:update` in the same commit.
- **Confidence**: high.
- **Notes**: the owner should be told, because a policy date is his statement, not a code
  fact. If he would rather the analytics row change not count as a material edit, the
  alternative is to say so in the "Changes" paragraph; either way the page should not
  contradict itself.

### member-surfaces-10 - Rename the two "Back to settings" controls on a page that has no settings to go back to
- **Where**: `src/components/settings/dark-gauntlet.tsx:137-140` (intro step, an outline button
  that calls `router.back()`), `:314-320` (relief step, a link to `/feed`)
- **Phase**: hygiene (member-visible copy)
- **Tier**: T1     **Class**: cheap     **Decides**: owner (copy) but trivially autonomous
- **Evidence**: there is no `/settings` route (`ls src/app/(main)/settings` fails;
  `src/lib/auth.ts:228` says so in a comment: "Not '/settings': that route does not exist. The
  profile ..."). The gauntlet is reached from the profile's dark-mode tile
  (`letterhead-profile.tsx:1391`), so the intro button's `router.back()` lands on the profile
  and the relief link lands on `/feed`; neither is "settings". Two different destinations
  under the same label.
- **What to do**: intro: "Back" (it is `router.back()`); relief: "Back to the feed" (it is
  `/feed`), or point both at the profile. One-word decisions; the owner may have a line he
  prefers.
- **Saving**: 0 lines; two labels that stop naming a page that was retired on 2026-08-07.
- **Risk & gate**: none beyond `npm run check`. Walk `/dark-mode` once.
- **Confidence**: high.
- **Notes**: `lights-on.tsx` avoids the problem (its copy names no destination and uses
  `router.back()`).

### member-surfaces-11 - Share the messages index's "Show older / Show fewer" link with the admin inbox
- **Where**: `src/app/(main)/messages/(index)/page.tsx:110-124` (two inline `<Link>`s with an
  identical 160-character className), `src/app/(main)/admin/messages/(index)/page.tsx:51-62`
  (`MoreLink`, the same className extracted once, with the comment "written out at each one,
  which is three chances for one of them to drift")
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -c` of the className string: 2 in the member page, 1 (the helper) in the
  admin page. The admin page's own comment explains why it extracted the helper; the member
  page, which the same audit (C-058) gave the same escape, did not get it.
- **What to do**: move `MoreLink` to `src/components/messages/more-link.tsx` (a server
  component; 12 lines) or, since both pages are server components under `(main)`, export it
  from `src/components/admin/admin-chrome.tsx` beside `AdminSection` if the admin lens prefers;
  import it in both index pages and delete the two inline copies.
- **Saving**: ~10 lines; one place for the escape link's look.
- **Risk & gate**: low. `npm run check`; open `/messages` as Jerry (with fewer than 60 threads
  the link does not render; a `?all=1` visit exercises the "Show fewer" branch only when
  `total > THREAD_PAGE`, so the gate is the diff plus the admin inbox, which does render it).
- **Confidence**: high.
- **Notes**: this is the whole of the messages/admin-messages duplication. The thread UI itself
  is shared (see Not-findings: the pair is named there).

### member-surfaces-12 - One `LetterKicker` for the three letter teasers, one `DocLink` for the policy pages
- **Where**: the kicker: `src/app/(main)/letters/(index)/page.tsx:182-192`,
  `src/app/(main)/letters/[id]/(read)/page.tsx:166-170`, `src/components/posts/post-card.tsx:424-428`
  (feed territory; named for the merge); the link: `src/app/(policies)/privacy/page.tsx:209,213`,
  `terms/page.tsx:28,32,105`, `guidelines/page.tsx:73` (six copies of `"font-medium text-canopy
  underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy"`), plus three more
  in `src/components/auth/signup-form.tsx` (auth territory)
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -rn "text-\[10.5px\] font-bold uppercase tracking-\[0.13em\] text-cinnamon"
  src` finds exactly the three kicker sites, each `<Feather/> Letter <span>· N min read</span>`
  with the same classes (the index adds an optional city chip). `grep -c` of the link class
  gives 2/3/1 across the three policy pages. Neither is a large clone (jscpd's 50-token floor
  did not catch them); both are the "N copies of one look" kind that a house rule about one
  look for one thing exists for.
- **What to do**: (1) `src/components/letters/letter-kicker.tsx`: a server component `LetterKicker({
  minutes, children })` rendering the kicker row, `children` for the index's city chip; use it in
  the two letters pages; hand the `post-card.tsx` site to the feed lens (it uses phosphor's
  `Feather weight="fill"` where the pages use lucide's; pick one). (2) `DocLink` in
  `(policies)/_shared.tsx` wrapping `next/link` (and an `href="mailto:"` variant, or accept an
  `<a>` for the two mailtos) with that className; replace the six sites. The signup form's
  three copies are auth-edge's call.
- **Saving**: ~0 lines net (two ~12-line components replace ~20 lines of repeated classes);
  one place each for the kicker and the policy link.
- **Risk & gate**: low. `npm run check`; `npm run visual` (`/letters` and `/privacy` are
  photographed; expect green if the classes are moved verbatim).
- **Confidence**: high on the duplication; medium on whether the owner wants the post-card's
  phosphor feather unified with the pages' lucide one (a visible one-glyph change).
- **Notes**: honest about the unit: this is "one fewer place for the bug", not lines. Skip it
  if the fix session is short on time; do it if it is already touching these pages for 03/05.

### member-surfaces-13 - Replace the costs card's hand-rolled count-up with the motion primitives already loaded
- **Where**: `src/components/support/costs-card.tsx:43-101` (`useCountUpOnView`: a manual
  `requestAnimationFrame` loop with ease-out cubic, an `IntersectionObserver`, a `pausedRef`
  mirror of `useMotionGovernor().paused`, and the cleanup), `:104` (its one use)
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (no visible change if the
  curve and duration are kept; the owner should be shown the result)
- **Evidence**: the file already imports `m` from `motion/react` and the app ships motion's
  `animate`/`useInView` in the same package (`/support`'s first load includes the motion
  core). The hook re-implements three things motion owns: an in-view trigger (`useInView(ref,
  { amount: 0.4, once: true })`), a tweened number (`animate(0, target, { duration: 0.95,
  ease: "easeOut", onUpdate })`), and cancellation on unmount (the returned controls'
  `.stop()`). The one custom part, pausing while `useMotionGovernor().paused` is true, is
  already what browsers do to `requestAnimationFrame` in a hidden tab; the governor's other
  consumers pause loops that are NOT rAF-driven, which is not the case here. The comment at
  `:43-46` records the standing decision "never by the OS reduced-motion setting", which
  `animate()` honours by default (motion does not read `prefers-reduced-motion` unless
  `MotionConfig reducedMotion` is set; verify the app's `MotionConfig` in `common/motion.tsx`
  before relying on this).
- **What to do**: replace lines 43-101 with `const ref = useRef<HTMLDivElement>(null); const
  inView = useInView(ref, { amount: 0.4, once: true }); const [value, setValue] = useState(0);
  useEffect(() => { if (!inView) return; const c = animate(0, MONTHLY_TOTAL, { duration: 0.95,
  ease: [0.33, 1, 0.68, 1] /* the same ease-out cubic */, onUpdate: (v) => setValue(Math.round(v))
  }); return () => c.stop(); }, [inView]);` and keep `shown = inView` for the bar's `scaleX`.
  Keep the "never reduced-motion" sentence as a comment on the effect. If `useMotionGovernor`
  must stay in the loop (a house rule I could not find written down), keep the hook as is and
  close this as a not-finding with that reason.
- **Saving**: ~40 lines; one fewer hand-rolled animation loop in a file that already has the
  library for it.
- **Risk & gate**: low-medium (a visible number counts up on the owner's most-tuned page).
  `npm run check`; open `/support` at 1440 and 390 and watch the count-up once; `npm run
  visual` (`/support` is photographed after the count settles, so expect green).
- **Confidence**: medium. The one thing that would change my mind: a written rule that every
  timed animation must route through `useMotionGovernor` (the audit-1 bundle session
  introduced `LazyMotion` and a namespace rule test; I found no governor rule).
- **Notes**: `support-contribute.tsx`'s `useMemo(buildSuggestions)` and `useCallback(warm)` are
  the React signatures the brief lists but are one line each and harmless; not worth a finding.

### member-surfaces-14 - Fold `valley-year.test.mjs` into `valley-day.test.mjs`
- **Where**: `src/lib/valley-year.test.mjs` (27 lines, three tests), `src/lib/valley-day.test.mjs:55-59`
  (the same IST-midnight assertion on `valleyYear`)
- **Phase**: dedupe (tests)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: both files import `valleyYear` from `./utils.ts`. `valley-year.test.mjs`'s
  third test ("an IST date late on 31 December still reads as that year", 18:30 UTC) is the
  same boundary `valley-day.test.mjs`'s fourth test pins with three assertions. Its second test
  (a runtime whose `toLocaleDateString` ignores `en-CA` must still not return `NaN`) is unique
  and worth keeping. `scripts/qa/check.mjs:69` sets `MIN_TEST_FILES = 60`; the suite has 102,
  so one fewer file is nowhere near the floor.
- **What to do**: move the NaN test (lines 13-22) into `valley-day.test.mjs` under the
  `valleyYear` test with its header comment ("valleyYear is the CEILING `yearGiven` compares
  ... If it ever returns NaN, every year is rejected"); `git rm src/lib/valley-year.test.mjs`.
- **Saving**: 1 test file, ~15 lines.
- **Risk & gate**: none. `npm run check` (the test gate counts files and runs them).
- **Confidence**: high.
- **Notes**: the other five tests in the charter (`contribution-state`, `purge-rule`,
  `cascade-rule`, `loading-boundary-rule`, `valley-day`) all pin live subjects I re-read; none
  is stale. `contribution-state.test.mjs:161` shells out to `git grep` at test time, which is
  the same device `hand-run-passes.test.mjs` uses; fine on CI, worth knowing.

### member-surfaces-15 - Import the letter title's easing instead of hand-typing it
- **Where**: `src/components/letters/letter-title.tsx:34` (`ease: [0.34, 1.56, 0.64, 1]`)
- **Phase**: hygiene (design protocol)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `src/components/common/motion.tsx:32` exports `EASE_POP = [0.34, 1.56, 0.64, 1]`,
  the identical curve, and the file already imports `SPRINGS` from that module. CLAUDE.md:
  "no hand-typed `cubic-bezier(...)`"; `protocol-audit.mjs` checks CSS, not motion arrays, which
  is how this one survived.
- **What to do**: `import { EASE_POP, SPRINGS } from "@/components/common/motion"` and `ease:
  EASE_POP`.
- **Saving**: 0 lines; one fewer place a curve can drift.
- **Risk & gate**: none. Open a letter and watch the underline draw.
- **Confidence**: high.
- **Notes**: none.

### member-surfaces-16 - One post read for the letter page's metadata and body
- **Where**: `src/app/(main)/letters/[id]/(read)/page.tsx:29-35` (`generateMetadata`'s
  `findUnique` selecting `title, content, kind`), `:59-77` (the page's `findUnique` with the
  full include), `:44` and `:108` (`canViewPost`, whose row fetch IS `cache()`d in
  `post-visibility.ts:59`)
- **Phase**: architecture (queries per load)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: audit Low 14 (quoted in `post-visibility.ts:47-56`) cached the GUARD fetch so
  metadata and page share it. The two CONTENT fetches are not cached and differ in shape, so
  one letter view is three post reads (guard once, thanks to the cache; title/content/kind for
  the tab; the full include for the body) where two would do. `generateMetadata` needs only
  what the page's include already returns.
- **What to do**: in the page file, `const loadLetter = cache((id: string) =>
  prisma.post.findUnique({ where: { id }, include: { ...the existing include... } }))`, but
  the include selects `likes`/`bookmarks` by the viewer, so key it on `(id, viewerId)`: `cache`
  memoises on argument identity and both calls pass the same two strings in one request. Use
  it in both `generateMetadata` and the page; metadata reads `letter.title`, `letter.content`,
  `letter.kind` off the same row. Delete the metadata-only select.
- **Saving**: 1 query per letter view (3 -> 2); ~8 lines.
- **Risk & gate**: low. `npm run check`; open a letter and confirm the tab title and the page
  agree; `post-visibility` tests stay untouched.
- **Confidence**: high on the count; medium on whether the fix session judges one query worth
  a `cache()` wrapper (audit 1's lesson: the wrapper costs a comment).
- **Notes**: the collection's `[id]/page.tsx:15-42` has the same metadata/page preamble (jscpd
  pairs it with this file's 18-27); if the collection lens takes the same approach, the two
  can share nothing but the idea.

## Owner decisions

**The About page still says "indefinitely procrastinated", and it is a month later and closer
to release.** `src/app/(main)/about/page.tsx` is unchanged since 2026-08-03 (`1d7294b`, "removed
about section slop"), the sidebar's seventh row (`sidebar.tsx:72`) still points at it, and
`docs/spec/guide.md` section 9 flags it independently: "It needs something to say, or it needs
deleting." Audit 1 filed this as owner decision 3 and recommended three short paragraphs; that
recommendation stands, and the guide's own `chapters/*.tsx` show the register the owner
approved for talking about the place ("the house saying what it hopes for"). If the joke stays,
it should be recorded as a decision in the page's own comment so the third audit does not raise
it. A fourth option the guide created since audit 1: point the About row at `/guide`, which
already answers "what is this place for" in six chapters and which nothing in the navigation
links to; the owner explicitly reverted that swap on 2026-08-27 ("Don't replace about with
guide"), so it is listed only for completeness.

**The "Add it to your phone" tile is finished plumbing with an audience of one.**
`install-app-tile.tsx` and `install-prompt.tsx` (278 lines, an `appinstalled`/
`beforeinstallprompt` capture evaluated on every authenticated page) are gated in
`profile/[id]/page.tsx:428` to `isAdmin && isOwnProfile`, per the owner's "for now only show it
for admins" (2026-08-22). Twelve days on, "for now" is still the state. The charter's question,
answered: the flow is reachable on both platforms and is not a placeholder. On Android/Chromium
it is a real one-press install driven by the captured event; on iOS it is, by Apple's design,
a sentence telling the member where Safari's own button is (`install-app-tile.tsx:21-24` says
so honestly, and the manifest at `src/app/manifest.ts` carries the icons both need). The
decision is whether to open the tile to every member on a phone before release (it is one
condition in one line) or to keep it admin-only, in which case the capture in the layout is
serving a feature nobody else can reach and the honest move is to say so in the tile's header.
Recommendation: open it; the code is done and the only risk is a member seeing a tile that says
what their browser can do.

**The costs card's numbers are constants in code, in three copies.** `costs-card.tsx:27-36`
hard-codes Hosting ₹1,950, Photos ₹90, Domain ₹250 and a ₹4,00,000 build cost; only the
recovery fill is live (summed from paid contributions on every view, `support/page.tsx:39-45`).
`src/app/lab/support-ideas/_shared.tsx:45-54` and `src/app/lab/support/_bars.tsx:15` carry
their own copies (knip lists those exports as unused; the lab lens owns them). This is fine as
a design: the bill changes a few times a year and a commit is the right ceremony for a number
members read as a promise. The owner should simply know that changing the monthly figure means
editing `costs-card.tsx:28-30` and nothing else, and that the lab copies are frozen history
that will disagree with it from the first edit.

**The letter reading page has no report, edit or delete; the feed's letter card has all
three.** `letter-engagement.tsx` renders heart, comment count, bookmark, share and (admin only)
remove; `post-card.tsx:385-405` gives every viewer Report and the author Edit/Delete through a
menu. A member who finds a letter through `/letters` and wants to report it must go and find its
compact card in the feed. `docs/spec/letters.md` section 2.6 says reporting is "unchanged" from
posts, which the reading page does not deliver. Not a simplification, so not a finding: it is
the one place where "should PostCard own the letters path" has a product answer rather than a
code one. If parity is wanted, the right shape is a shared actions menu used by both surfaces,
and that is when a `usePostEngagement` extraction would earn itself. Recommendation: decide
whether a letter page needs Report before release; Edit and Delete can stay on the feed card
(the desk owns drafts; a published letter's quick fix is documented as the small dialog).

**The dark-mode cluster stays whole.** ~930 lines across seven files for one toggle, walked
again in full: every step is the owner's script (dated quotes at `dark-gauntlet.tsx:3-16,
197-202`, `nightfall.tsx:3-14`, `lights-on.tsx:3-5`), the Wordle gate is real homework by
design (`wordle.ts:1-14`, with the C-116 timeout), and the asymmetry is the joke. Audit 1 filed
it as a not-finding and nothing has changed except the alias (06) and two labels (10). No cut
proposed; recorded so the question is not asked a third time.

**`/notice/[id]` needs no decision.** It is a dated shim (`page.tsx:16-26`), on the ledger in
`docs/planning/bugs.md:462` ("After 2027-08-01: delete `/notice/[id]`"), reached only by
`Notification` rows minted before 2026-07-24; nothing mints a `/notice/` link any more
(`admin-note.ts` links new notes at `/messages/`). The charter's "who creates notices" answer:
`openAdminNoticeThread` (moderation, via `admin-note.ts`) creates notice THREADS at
`/messages/[id]`; the `/notice` route creates nothing new, it converts old links. It costs one
8.5 KB-lighter route (no `PageHeader`) and 130 lines until its date.

## Not-findings

- **The money path's comment mass is the product, re-verified.** `support/actions.ts` (150 code
  / 120 comment), `razorpay/webhook/route.ts` (225 / 162), `razorpay.ts` (80 / 63),
  `contribution-state.ts` (54 / 86), `resend/webhook/route.ts` (102 / 64). I read every block
  again looking for the "restates the next line" kind and found none; each carries an audit id
  (C-084/085/086/087/088/151, M27/56/57/58/59/60, B-080/081, Low 116), a race, or an owner
  date. The one restate-adjacent block, `webhook/route.ts:237-250`, explains why the second
  `updateMany` exists at all (C-088), which is exactly the thing a reader would delete without it.
- **No Razorpay SDK, no Svix package: deliberate.** `razorpay.ts:3-6` and
  `resend/webhook/route.ts:23-25` each say why; both verifications are one HMAC and a
  constant-time compare. Library phase: the reverse direction is right here.
- **The letter desk does not fork the composer (charter question 1, composer half).**
  `letter-desk.tsx:102-126` renders `<CreatePostForm defaultLetter immersive .../>`; the
  autosave, the crash-net draft key (C-014), the row-version guard (M66) and the city-scope
  chip (B-048) all live in `create-post-form.tsx` and `use-letter-persistence.ts` (468 lines,
  feed territory), reached through props. `letter-title.tsx` (38 lines) and `letter-images.tsx`
  (81) are reading-page presentation with no composer equivalent. The only letters-only code
  outside the composer is the reading page's engagement row, addressed in 02 and the owner note.
- **`LetterEngagement`'s state block is not a clone worth a third layer.**
  `use-engagement.ts:19-23`: "Where the state LIVES is deliberately still the caller's
  business ... which is what lets one shape serve all three" (card, letter, comment row). The
  ~25 lines of `useState` + three handlers in `letter-engagement.tsx:31-55` and
  `post-card.tsx:276-312` are that deliberate remainder; `post-card`'s copy also carries
  `skipAction: demo`, `onBookmarkChange` and `setRemoved`, so a shared hook would need three
  options to serve two callers. Audit 1's arithmetic (65 commits for -90 lines) applies.
- **Messages and admin messages share their thread UI (charter question 2).** The pair, named:
  `src/components/messages/conversation.tsx` (`Conversation`, `AdminMark`) and
  `src/components/messages/message-composer.tsx` (`mode: "new" | "reply" | "admin-reply"`) are
  imported by BOTH `src/app/(main)/messages/[id]/page.tsx` and
  `src/components/admin/messages/thread-view.tsx`; the window and its off-by-one live once in
  `admin-threads-server.ts:51-77` (`THREAD_MESSAGE_WINDOW`, `splitThreadWindow`), which closed
  audit 1's FOL about `loadThreadWindow`. What is NOT shared, by design: the two thread LISTS
  (`components/messages/thread-list.tsx`, 97 lines, keyed on `memberUnread` with a kind glyph;
  `components/admin/messages/thread-list.tsx`, 83 lines, keyed on `adminUnread` with
  `AdminPersonRow`/`Chip`/`ADMIN_GRID`), which read different columns for different people.
  The only true duplication left is finding 11.
- **`messages/actions.ts`'s internal clones are the pinned shape.** jscpd pairs `88-95` with
  `147-155` and `153-163` with `225-233`: `auth()` -> `IS_DEMO` -> `parsePayload` -> the
  thread `findUnique`. `gate-coverage.test.mjs` scans every exported action for its own gate,
  and the file's header (`:19-25`) states the rule per action on purpose. A `loadOwnThread()`
  helper would save eight lines and hide the ownership check the pin exists to see.
- **The policy pages stay JSX (binding from audit 1), and the two prose kits are two on
  purpose.** `(policies)/_shared.tsx` (`DocTitle/Section/P/Bullets/FactTable`, 82 lines) and
  `components/guide/guide-kit.tsx` (`Chapter/Section/P/Doorway/Scale/Compare`, 182 lines) differ
  by half a pixel and a leading, and the difference is the owner's: `docs/spec/guide.md` 2.1,
  "this is so boring", on a chapter built in the policy shell. `guide-kit.tsx:9-13` keeps the
  policy VOICE while rejecting the policy LOOK. Merging `P`/`Section` would save ~15 lines and
  put one owner decision at the mercy of the next edit to the other.
- **The chapters barrel earns its keep (charter question 3, the barrel half).**
  `chapters/index.tsx` is 19 lines: a `Record<string, () => ReactElement>` of six imports.
  It is a registry, not `export * from`; both importers (`guide/[area]/page.tsx`, server;
  `guide-layer.tsx`, client) need all six entries because the slug is chosen at request or
  press time. Nothing is un-shaken by it. The cost is finding 01's, and the fix leaves the
  barrel exactly as it is.
- **`/dark-mode` is a member page, not a lab room (charter question 5).** Linked from the
  profile's dark-mode tile (`letterhead-profile.tsx:1391`), gated on the device cookie with a
  documented reason (`lib/theme.ts:6-23`, C-138), photographed by nothing in `visual.spec.ts`
  but crawled. Its skeleton was rewritten by audit 1's 15 (`dark-mode/loading.tsx` now mirrors
  the centred ceremony).
- **`DemoBar` and `InstallPromptCapture` in the layout chunk: measured and refuted at audit-1
  fix time** (fix-prompt 979-985: `next/dynamic` in the server layout split nothing). Not
  re-proposed. `InstallPromptCapture` is a null component whose only job is module evaluation
  order (`install-prompt.tsx:12-19`); 104 lines is what the reasoning costs and it is all reason.
- **`MIN_RUPEES` duplicated client-side is deliberate** (`support-contribute.tsx:47-50`).
- **`support/page.tsx`'s inline `<style>` keyframe** (`support-sway`, 6 lines) is neutral:
  moving it to `globals.css` adds to the 233 KB stylesheet every page loads. Left.
- **`local-storage.ts` is the written-once version of three copies** (`7b1ba04`); two consumers
  today (`use-letter-persistence.ts`, `mascot/moments/one-shot.ts`). Kept.
- **The `(read)` route group under `letters/[id]` exists for `loading-boundary-rule.test.mjs`:**
  without it `[id]/loading.tsx` would shadow `[id]/edit/loading.tsx`. Not a stray group.
- **`THREAD_PAGE`'s `?all=1` escape loads every thread unbounded** by design (C-058: "no
  conversation is silently unreachable"); the admin inbox has the same escape.
- **The account export is one hand-listed select on purpose (charter question 7).** There is
  no shared "profile select" it duplicates: `grep -rln "taughtFrom: true"` finds only the
  export and `profile-actions.ts`'s per-field save whitelist, a different thing. The export's
  docblock (`route.ts:8-31`) argues for an explicit list and for streaming (M48); both hold.
  What the list does NOT contain is a completeness question for another lens (see below).
- **`wordle.ts`'s fallback words** are the C-116 safety net, not a placeholder.
- **The `(main)` layout's `after(drainMailQueue)`** and the rest of that file are lib-core-config's.

The seven charter questions, collected: (1) letters-only path: the composer, no; the reading
page's engagement row is a composition of shared primitives with one loading-decision drift (02);
(2) messages share `Conversation` + `MessageComposer` + the window helpers with the admin half;
the lists differ by design; (3) the barrel costs nothing itself; its importer costs ~12 KB on
every route (01); (4) the four theme components are one owner-scripted feature, kept, with one
alias leftover (06); (5) `/dark-mode` is a member page; (6) `/notice` is a dated shim that
creates nothing new; (7) the PWA flow is real on Android and honest text on iOS, and
admin-only "for now" (owner decision).

## Audit-1 carry-overs in this territory

- **member-surfaces-01** (`updateUserProfile`): done; `settings/actions.ts` holds four actions,
  none of them a whole-form save.
- **member-surfaces-02** (QR pipeline): done; no `support-qr*` in `public/images`, no
  `jsqr`/`qrcode` in `package.json`, no generator script.
- **member-surfaces-03** (photo-intake halves): collection territory; not re-checked here.
- **member-surfaces-04** (`wood.tsx` relocation): NOT done (filed optional); re-raised as
  finding 04 with the stale `wood-mount.tsx` comment still in `support/page.tsx`.
- **member-surfaces-05** (`/notice` dated retirement): done; ledger line in
  `docs/planning/bugs.md:462` and the route header's "RETIRE AFTER 2027-08-01".
- **member-surfaces-06** (hoopoe trio): done; `messages-empty-hoopoe.tsx` is a 30-line wrapper
  over `MomentStage`.
- **member-surfaces-07/10** (`plainExcerpt`/`readMinutes`): done; `utils.ts:404,428`, used by
  all three letter renderers.
- **member-surfaces-08** (`/donate`): done; `src/proxy.ts:202` redirects, the page is gone.
- **member-surfaces-09** (loading twins): done; `desk-skeleton.tsx` with two five-line wrappers.
- **member-surfaces-11**: `razorpayConfigured` gone; `SUBJECT_VALUES/AREA_VALUES` are
  collection's; the `setTheme` alias was de-exported rather than collapsed: finding 06.
- **member-surfaces-12** (collection taxonomy SELECT): collection territory; still listed as an
  open owner decision in the brief.
- **member-surfaces-13** (`/groups` branches on letters): done; the read page hard-codes
  `/letters` and `LetterEngagement` has no `groupId` prop.
- **member-surfaces-14** (stale bird-pick / fourteen comments): half done; the re-picking
  paragraph is corrected, the three "fourteen" sites are not: finding 05.
- **member-surfaces-15** (skeletons mocking retired pages): done; `dark-mode/loading.tsx`
  rewritten, the letters/messages skeletons carry no subtitle bar.
- **Owner decision, About page**: still open; re-raised above with the guide spec's own flag.
- **FOL, `loadThreadWindow`**: done as `THREAD_MESSAGE_WINDOW` + `splitThreadWindow`.
- **FOL, `transition-[colors,...]`**: done; `protocol-audit.mjs` refuses the form and the files
  in this territory spell real properties.
- **FOL, privacy retention drift test**: not written; the seven numbers still match (finding 09).
- **Refuted rows touching my files**: the DemoBar/VerifyEmailBanner dynamic split (not
  re-proposed; 01 is a different mechanism and says why).

## For other lenses

- **bundle-build**: `src/app/layout.tsx:65,83` reads the theme cookie in `generateViewport` and
  the root layout, which makes every page route in the app `ƒ` (`raw/build.txt`: only five
  asset routes are `○`). The three policy pages, the landing, `/login` and `/hoopoe` could be
  prerendered if the theme class were applied another way for the public group (dark is earned
  per device after sign-in, so a light default there is nearly always right). Owner call; my
  territory only corrects the two comments that claim static (07).
- **bundle-build**: the `(main)` layout chunk `3hd4ups9q-ds3.js` (23.6 KB) holds, in order,
  the demo bar (bytes ~2,400-5,000), the guide (~7,900-19,200) and the install-prompt capture
  (~22,400). Finding 01 takes the middle third out.
- **bundle-build**: `/about` alone carries `2khgj6qcobwi-.js` (8.5 KB, a phosphor icon weight
  map) that no other route has; probably a chunking artefact of a 19-line page, worth a look
  when the chunk graph is next drawn.
- **feed-posts**: `post-card.tsx:424-428` is the third copy of the letter kicker (12), with
  phosphor's `Feather weight="fill"` where the letters pages use lucide's; and `post-card.tsx`
  has Report/Edit/Delete for letters that the reading page lacks (owner note above).
- **landing-mascot-avatars**: `src/app/(main)/birds/page.tsx:31` and
  `src/components/support/bird-picker.tsx:78` carry the identical grid class string, and the
  picker's comment says "If the grid classes change in birds/page.tsx, change them here". One
  exported `BIRD_GRID` constant (from `bird-avatar-v2.tsx` or `plate-data.ts`) ends the
  copy-by-hand instruction. Support does NOT re-implement the picker: `bird-picker.tsx` is the
  one picker (used by `/pick-bird` only) and `bird-plate.tsx` is a twelve-bird preview.
- **auth-edge**: `src/components/auth/signup-form.tsx` carries three copies of the policy
  link class that 12 folds into `DocLink`.
- **lab**: `src/app/lab/support-ideas/_shared.tsx:39-54` exports five knip-dead constants
  (frozen copies of the costs card's numbers) and `:374-382` clones `bird-plate.tsx:123-131`.
- **security / GDPR (whichever lens owns Art. 20 completeness)**: the export's profile select
  (`account/export/route.ts:89-122`) omits `User` columns that are the person's own choices or
  are about them: `birdOverride` (the bird they paid to pick), `showEmail`, `theme`,
  `professionTags` + `professionTagSource` (derived from their job title by a hand-run pass),
  `birdPickedAt`, `verifyMethod`, `photoTrusted`, `lastSeenAt`/`feedSeenAt`. The docblock's
  exclusion rule ("operational columns ... about the account rather than the person") does not
  obviously cover `birdOverride` or `showEmail`. Not a simplification; a completeness note.
- **design-protocol**: `demo-bar.tsx:123,131,141,156` use `hover:scale-[1.03]`/`1.04`/`110`
  on controls (the house rule is that hover never moves a control); `guide/page.tsx:32` and
  `guide-kit.tsx:77` use `hover:-translate-y-px`. Protocol, not simplification.
- **docs**: finding 08 (the guide spec) is a docs edit; listed here so the docs lens does not
  double-file it.
- **lib-core-config**: `retention.ts`'s `KEEP_DAYS` is quoted in prose by
  `privacy/page.tsx:144-155`; a rule test would pin the two (finding 09's optional half).

## Metrics

- Lines read: ~9,200 code+comment lines in territory (app routes 2,431; components 3,665; libs
  1,096; API routes 932; tests 1,185) plus ~1,300 lines of neighbours and ~1,900 lines of specs
  and audit-1 material.
- Comment-heaviest files in territory (`raw/comment-density.txt`): `contribution-state.ts` 1.59
  (86/54), `guide-overlay.tsx` 1.19 (56/47), `wood.tsx` 1.15 (127/110); directory ratios:
  `components/support` 0.58, `components/guide` 0.35, `components/settings` 0.34,
  `components/letters` 0.34, `components/messages` 0.12, `(policies)` 0.08. All verified
  reason-carrying except the six comments named in 05 and 07, which are wrong rather than long.
- Biggest files: `dark-gauntlet.tsx` 504, `support-contribute.tsx` 429, `account-purge.ts` 423,
  `razorpay/webhook/route.ts` 421, `account/export/route.ts` 327, `messages/actions.ts` 316.
- Route first-load (raw, `route-js.txt`): `/letters/[id]` 1,117 KB (heaviest here),
  `/letters/new` 1,101, `/letters` 1,087, `/dark-mode` 1,087, `/messages` 1,080, `/support`
  1,069, `/about` 1,064 (the `(main)` floor), `/guide/[area]` and `/notice/[id]` 1,055 (no
  `PageHeader`), the three policy pages 630.
- Deltas over `/about` from `route-bundle-stats.json`: `/letters/[id]` +54 KB (02), `/letters/new`
  +38 KB (the desk and composer, earned), `/letters` +24 KB (drafts strip + confirm dialog),
  `/dark-mode` +23 KB (the ceremony, earned), `/messages` +17 KB, `/support` +5 KB.
- Honest totals if everything lands: ~12 KB raw JS off every authenticated route (01), ~4-44 KB
  off `/letters/[id]` (02), up to ~400 KB of database transfer per `/letters` load for a
  drafter (03), 246 lines out of the shipped tree (04), 1 query per letter view (16), 1 test
  file (14), ~70 lines of code (05, 06, 07, 13, 14, 16), eight wrong comments and two wrong
  labels corrected (05, 07, 08, 10), one legal date (09). The structural well here is shallow
  and mostly about placement, not size; the territory was already lean.
