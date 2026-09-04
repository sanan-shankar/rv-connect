# lib-misc — adversarial verification (refactor audit 2)

Verifier for cluster `lib-misc` (17 findings from seven reports). Read-only; no builds, no
browser, no database. Every line number below was re-read at the tree state described next.

## HEAD moved under me — read this first

The session started at `72b5a1d`. Partway through, another session (the orchestrator's own
ORCH-04 fix) committed **`2b70ece` "fix(retention): notifications are kept 30 days,
everywhere"** (2026-09-04 15:24 IST). Two findings in this cluster are dated by it:

- `feed-posts-16` — the nightly sweep it leans on now deletes notifications at **30 days**,
  not 365, and every line number it cites in `retention.ts` has moved.
- `member-surfaces-09` — the privacy page was edited AGAIN by that commit (the Notifications
  retention row, `1 year` → `30 days`), so "Last updated 20 August 2026" is now two material
  edits stale, and the finding's suggested new date (26 August) is already wrong.

Working tree at time of writing: only `?? docs/audit-fix/2026-09-03-refactor-audit-2/`
untracked. No uncommitted edits in any file I judged.

---

## admin-analytics-07 — move `touchLastSeen` behind the response with `after()`
**Verdict: confirmed-with-correction — the proposed fix, as written, silently kills presence
telemetry in production.**

Facts confirmed: `(main)/layout.tsx:56-79` awaits four things; `touchLastSeen(session.user.id,
await currentPath())` is at `:78`; the `after()` drain is at `:92-98`; the comment naming
`after()` as the tool is at `:53-55`; `touchLastSeen` is `last-seen.ts:185-246`.

The correction is the whole of the finding's own stated risk, and Next's docs settle it against
the finding. `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md:120`:

> [Server Components] (including pages, layouts, and `generateMetadata`) **cannot** use
> `cookies`, `headers`, or other Request-time APIs inside `after`.

and `:166`: "Calling `cookies()` or `headers()` inside the `after` callback in a Server
Component will throw a runtime error." `touchLastSeen` calls `await headers()` at
`last-seen.ts:189` and reads six headers from it (`user-agent`, `x-vercel-ip-*`, `referer`,
`accept-language`, `x-visit-id`). A naive `after(() => touchLastSeen(...))` in this layout
therefore throws — inside `touchLastSeen`'s own try, which logs only when
`NODE_ENV !== "production"` — so presence would break **in production only**, silently. That
is the exact failure mode `report-error.ts` exists to prevent, and it is what
`admin-analytics-08` is about.

The executable version: read the headers during render in the layout (or keep a small
`presenceFactsFromHeaders()` called before `after`), pass the plain values into a
`touchLastSeen(userId, path, facts)` whose signature no longer reads `headers()`, then
`after(() => touchLastSeen(...))`. That is a signature change in `last-seen.ts`, not the
"0 lines" the finding claims — call it ~15 moved lines, still 0 net. `presence-rule.test.mjs`
only greps `recordVisit` (`visit.upsert` absence, the `{id, userId}` scope, `MAX_VISITS_PER_DAY`
before `visit.create`, `throw err`, and the 90-day window against `admin-analytics.ts`), so the
move is not pinned — but the fixer must keep `recordVisit` intact.

Also worth the fixer's eye: today `await currentPath()` sits *inside* the `Promise.all` array
literal (`:78`), so evaluation of the array suspends there; the first three promises are
already started, so it costs nothing, but the `:75-77` comment's "must never add a serial
round trip" is doing less work than it thinks.

## admin-analytics-08 — `last-seen.ts` / `audit.ts` swallow to a dev-only console line
**Verdict: confirmed** (one count off).

- `last-seen.ts:236-245`: `} catch (err) {` at `:236`, the four-line comment, then
  `if (process.env.NODE_ENV !== "production") { console.error("[presence] touchLastSeen failed:", err); }`
  at `:242-244`. Exactly as described.
- `audit.ts:79-83`: same shape, `console.error("[audit] could not record", entry.action, err)`
  at `:81`. `writeAudit`'s own docblock at `:53` says "the same contract touchLastSeen keeps".
- `report-error.ts:5-11` names presence telemetry as one of the three reasons it exists; the
  reporter is `:25-46` and keeps the console line in every environment (`:35`) plus a Sentry
  capture.
- Correction: "twelve call sites" is **13 calls across 7 files** at HEAD (`actions.ts:198`,
  `email-actions.ts:434`, `collection-intake.ts:75,152`, `retention.ts:119`,
  `catchups.ts:331,429,439`, `email-queue.ts:367,526,550,677`, `rate-limit.ts:229`).
- Gate claim verified: no test pins either catch. `presence-rule.test.mjs` pins `recordVisit`
  only; `unattended-rule.test.mjs:83` pins `reportSwallowed("email", …)` shapes;
  `auth-flow-rule.test.mjs:80,114` pins the auth ones; `catchup-lifecycle.test.mjs:390,396` the
  catchups ones. Adding two more call sites breaks none of them.
- `search-log.ts:44-46` really does carry the same dev-only idiom ("Silent for the same reason
  touchLastSeen is"), so a complete fix is three files, not two.

## data-layer-07 — 7 queries before the page's own
**Verdict: confirmed-with-correction** (line drift; wrong pin named; (b) is riskier than "medium").

The seven-query floor is real and I counted it myself at HEAD:
1. `auth()` → session callback `prisma.user.findUnique` — `auth.ts:314-330`, selecting
   **twelve** columns (role, accountType, verifyState, isBlocked, credentialVersion,
   emailVerified, email, batchType, batchYear, name, photoUrl, birdOverride) and **not**
   `lastSeenAt`. `auth` is `cache()`d at `auth.ts:459`, so once per request.
2. `notification.count` — `layout.tsx:57-62`.
3/4. `advanceDueCatchups` — `catchupEdition.findMany` at `catchups.ts:397` **and**
   `catchup.findMany` at `:414` (the finding says `391-413`; the block is `:392-441`).
5/6. `visit.updateMany` (`last-seen.ts:60`) + `user.updateMany` (`last-seen.ts:228-234`, whose
   WHERE is `lastSeenAt IS NULL OR lastSeenAt < now-15min`).
7. `outboundEmail.count` in `after()` — `email-queue.ts:727`.
`verificationMailState` is skipped for confirmed accounts (`layout.tsx:71-73`), as claimed.

Corrections:
- The select is pinned by **`auth-flow-rule.test.mjs:42`** (`/isBlocked: true/`) and
  `session-revocation.test.mjs`, **not** by `security-regressions.test.mjs` — that file does
  not mention `credentialVersion` at all. Adding `lastSeenAt: true` breaks neither.
- (a) also needs `next-auth.d.ts` and means the member's own `lastSeenAt` is serialised into the
  session payload the client can read. It is their own timestamp, so no privacy issue, but say it.
- (b) merits more than "medium": `advanceEdition` is fed `ed.catchup.{cadence,status,group}`
  and the loop at `:411-413` runs **before** the second read, so the two reads are sequential
  today (the second sees the first's writes). Collapsing them into one query changes that
  ordering. The catchups lens must co-sign, as the finding says.

## data-layer-13 — the demo seed writes dead bucket vocabulary
**Verdict: confirmed-with-correction — one of the six replacement values is wrong.**

`demo-seed/content.ts` lines **702, 720, 739, 756, 773, 790** are exactly the six `subject:`
strings quoted. `collection.ts:40-70` is the six-bucket list; `LEGACY_BUCKETS` starts at `:84`;
the migration's CASE is `2026-08-28-collection-river.sql:28-69`.

The finding's replacement list is `(campus, nature,campus, campus, school-life,nature,
campus,nature, campus,other)`. Row 1 is wrong: `"assembly-dining,campus"` maps
`assembly-dining → school-life` and `campus → campus`, i.e. **`school-life,campus`**, not
`campus`. Applying the finding verbatim would drop a bucket from that photograph. Rows 2-6 are
right (row 2's order differs, which `bucketsOf` de-duplicates into a Set anyway).

Verified safe: `demo-seed/content.test.mjs` (259 lines) contains **zero** occurrences of
`subject`, `bucket` or `BUCKET`, so it cannot go red either way. The finding's hedge ("may pin
the vocabulary — read it first") can be dropped.

## directory-profile-22 — onboarding small dedupes
**Verdict: confirmed-with-correction — the footer is duplicated twice, not three times.**

- `STEP_IDS` at `welcome/page.tsx:19` vs `STEP_ORDER` at `onboarding-flow.tsx:49`: identical
  five strings `["welcome","register","houses","photo","done"]`. Confirmed.
- The guard reasoning: the page's copy is at **`:59-71`** (13 lines), not `:55-66`; the flow's
  is `:85-103`. They are not literally the same twelve lines — they are two prose arguments for
  the same decision, each naming the other file; the page's already ends "See onboarding-flow.tsx
  for the actual guard." The reduction is still right.
- The footer: `register-step.tsx:196-211` and `houses-step.tsx:134-150` are the same
  Back / Skip for now / Save & continue block (jscpd's pair). **`photo-step.tsx:103-116` is a
  different footer**: no "Skip for now", no `Loader2` in the primary, and a conditional label
  (`photoUrl ? "Continue" : "Proudly keep my <bird>"`) defended by a four-line comment at
  `:105-108` ("One primary action… never a confusing pair of buttons"). A `StepFrame` with
  three callers is really a `StepFrame` with two; the finding's own Confidence line half-admits
  this. Recommend: extract the footer for two callers or skip it, and keep the centred header
  (`register:112-121`, `houses:106-115`, `photo:47-55`) as the genuinely three-way one.
- `firstNameOf`: `welcome-step.tsx:13` and `done-step.tsx:17` are byte-identical
  `name.trim().split(/\s+/)[0] || "there"`, and the private copy is `email-templates.ts:219-221`.
  Confirmed. The eight other `.split(" ")[0]` sites in non-lab `src` are a weaker variant (no
  trim, no fallback) — `profile/[id]/page.tsx:146`, `admin/messages/thread-view.tsx:33`,
  `admin/reports/report-list.tsx:170`, `admin/content/content-list.tsx:387`,
  `profile/get-in-touch.tsx:67`, `catchups/home/console-collecting.tsx:90` — do not sweep them
  in without deciding whether the fallback is wanted there.

## feed-posts-10 — `revalidatePath("/")` on every mark-read
**Verdict: confirmed-with-correction — right call, wrong citation, and one side effect it misses.**

`notifications/actions.ts:123` and `:136` are exactly the two calls; the import is `:6`.
The bell's own docblock (`notification-bell.tsx:130-146`) confirms the substance: "a shared
layout is not re-rendered on soft navigation", and the two handlers correct their state locally
(`setUnreadCount((c) => Math.max(0, c-1))` at `:227`, `setUnreadCount(0)` at `:243`) — note that
is a local decrement, not "from the action's own return"; `markNotificationRead` returns only
`{ success: true }`.

Corrections:
- `mutating-data.md:25-31` does not discuss `revalidatePath` (it is about Server Functions;
  the `revalidatePath` example is at `:425-500`). The line that settles it is
  `01-app/03-api-reference/04-functions/revalidatePath.md:19`.
- That same "Good to know" adds a fact the finding does not: from a **Server Function**,
  `revalidatePath` "currently also causes all previously visited pages to refresh when
  navigated to again. This behavior is temporary." So deleting the two calls also drops a
  blanket client-router-cache invalidation. Nothing here should depend on it (dynamic pages
  have staleTime 0 and `next.config.ts` sets no `experimental.staleTimes`), but the fixer
  should tap a notification, navigate back to a previously visited page, and check the badge —
  that is the one behaviour change, and it is not zero.

## feed-posts-16 — the KEEP=100 prune vs the nightly sweep
**Verdict: confirmed-with-correction — the code is as described, but three of its citations
went stale two hours ago and the proposed SQL changes the cap's meaning.**

Confirmed at HEAD: `KEEP = 100` at `notifications/actions.ts:8-12`; the prune (a
`findMany skip: KEEP-1 take: 1` then a `deleteMany`, guarded `read: true` per Low 85) at
`:47-69`, comment included ("no scheduled job does either").

Corrections:
1. **`retention.ts:41-42,176-179` no longer exists.** After `2b70ece`, `KEEP_DAYS.notifications`
   is `retention.ts:54` and the sweep step is `:188-192`. And the window is **30 days**, not
   365. The finding's premise gets *stronger* (the age half is now aggressive), but every
   quoted line must be re-derived.
2. **The pin is `unattended-rule.test.mjs`, not `proxy-rule.test.mjs`.** `/api/retention/sweep`
   is not a Vercel cron (`vercel.json` has only `/api/catchups/tick` and `/api/demo/reset`); it
   is fired by `.github/workflows/retention.yml`. `unattended-rule.test.mjs:146-147` pins its
   `maxDuration`, `:129-146` pins sweep behaviour. `proxy-rule.test.mjs` pins vercel.json's
   crons and `publicPaths` only.
3. There are **two** nightly pruners of this table now: `retention.ts`'s step and
   `scripts/ops/prune.mjs` (snapshot.yml). Adding a third mechanism to `retention.ts` without
   looking at `prune.mjs` would be a fourth place the policy lives.
4. **The proposed SQL is not equivalent to today's cap.** Today: find the 100th-newest row of
   *any* read state, delete read rows older than it. The proposal partitions
   `WHERE read` first, so it keeps the newest 100 **read** rows per member and deletes read
   rows beyond that — a member with 90 unread would keep 190 rows where today they keep ~100.
   Both are bounded; the fixer must choose deliberately and say which.
5. Bonus: `prune.mjs:8` names the cap's function `loadNotifications`; it is `getNotifications`.

## landing-mascot-avatars-11 — `/pick-bird`'s shimmer lies about the page
**Verdict: confirmed.** `pick-bird/loading.tsx:9` is a second skeleton bar
(`skeleton-warm mt-2 h-4 w-80 max-w-full`) under the title bar, and `pick-bird/page.tsx:87`
renders `<PageHeader title="Pick your bird" />` with the comment at `:84-86` ("Title only,
matching /birds (owner: one layout for both pages, no subtitles)") — the finding's `:84-86` is
exact. The grids differ as claimed: `loading.tsx:11` is
`grid-cols-3 … sm:grid-cols-4 md:grid-cols-5`, `bird-picker.tsx:78` is
`grid-cols-2 … sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`. `src/app/(main)/birds/` contains
only `page.tsx`, so `/birds` really has no `loading.tsx`. Deleting `:9` and fixing `:11` is
correct and cannot break a test (nothing greps this file;
`loading-boundary-rule.test.mjs` only requires the file to exist — worth a glance at fix time).

## landing-mascot-avatars-14 — one grid class, three copies
**Verdict: confirmed.** `birds/page.tsx:31` and `bird-picker.tsx:78` hold the identical string
`grid grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`;
the two comments that "enforce" the sameness are `birds/page.tsx:26-28` and
`bird-picker.tsx:70-75`, each naming the other file. `pick-bird/loading.tsx:11` is the third
copy and is already wrong at three breakpoints, which is the proof the comment mechanism failed.
The "0 net lines" honesty and the audit-1 dedupe lesson are correctly applied. One note for the
fixer: `bird-picker.tsx` is a client component and `birds/page.tsx` a server one, so the shared
constant belongs in a plain module (a `const BIRD_GRID` in `plate-data.ts`, or a new
`src/lib/bird-grid.ts`), not in either file. Overlaps landing-mascot-avatars-11: fix them in
one commit, since 11 rewrites the same line 14 wants to replace.

## member-surfaces-05 — four wrong comments
**Verdict: confirmed-with-correction — all four are real; a fifth belongs in the batch.**

- `support/page.tsx:24` "everyone else sees the fourteen-bird plate" ✓;
  `bird-picker.tsx:10` "on the fourteen-bird plate" ✓; `bird-picker.tsx:105-106` "The
  fourteen-bird plate on /support keeps its spotlight" ✓. `plate-data.ts:1-8` is unambiguous:
  "The twelve birds on /support… Down from fourteen (owner, 2026-08-22)".
- `letters/(index)/page.tsx:54-55` ✓, and `viewerCities` has exactly two lines in the file
  (`:53` assignment, `:73` use), so the "reused below for the composer" claim is dead.
- `guide/chapters/index.tsx:1-3` ✓: nothing in `src/components/layout/sidebar.tsx` mentions
  the guide at all (grep: zero hits), and `guide-door.tsx` imports only `guide-open`.
  `docs/spec/guide.md:87-96` records the revert in the owner's words.
- `account-purge.ts:409-415`: the comment really does sit between `await` and
  `prisma.pendingImagePurge.updateMany(` ✓.
- **Fifth site the finding missed**: `guide-door.tsx:6-10` still says "the guide has two doors:
  the Guide row in the sidebar, which is the findable one, and this" and cites guide.md §4 —
  the section that now says the opposite ("One door: the page title… the sidebar's `/about` row
  is back to pointing at `/about`"). Same batch, same phase. `member-surfaces-08` (the guide
  spec item) does not cover it.

## member-surfaces-07 — comments claiming static rendering
**Verdict: confirmed.** `raw/build.txt` has exactly five `○` rows (`/apple-icon.png`,
`/icon.svg`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`); `/guide` (`:74`),
`/guide/[area]` (`:75`), `/guidelines` (`:76`) and `/privacy` (`:137`) are all `ƒ`. The cause is
as named: `getThemeCookie()` at `layout.tsx:65` (`generateViewport`) and `:83` (the body).
`guide/[area]/page.tsx:8-10` is the false comment and `:11-13` the inert
`generateStaticParams`; `(policies)/layout.tsx:6` is "Public and static — no auth() call".
One caution the finding does not state: deleting `generateStaticParams` is safe **because**
`dynamicParams` defaults to true and the page 404s unknown slugs itself — say that in the
commit so a later reader does not think prerendering was thrown away.

## member-surfaces-09 — the privacy policy's "Last updated"
**Verdict: confirmed-with-correction — now worse than the finding says, and one sub-claim is
dead.**

`DocTitle updated="20 August 2026"` at `:21` ✓; the PostHog processors row at `:133` ✓;
`bd7da7d` (2026-08-26) is the edit the finding names ✓; `terms` and `guidelines` have not been
touched since `f69ce21` (2026-08-20), so their dates are right ✓.

Corrections: (1) `2b70ece` (2026-09-04) changed the retention table's Notifications row from
"1 year" to "30 days" — a change to what the document *promises members*, far more material
than a processor rename. The date should be **4 September 2026**, not 26 August. (2) The
finding's aside that "all seven [retention rows] match today" was true against `retention.ts`
but false against reality: `snapshot.yml` had been pruning notifications at 30 days while the
policy said a year (that is exactly what ORCH-04 found). The proposed rule test — assert each
`KEEP_DAYS` value appears in its policy row — would still have missed it, because the
divergence was in a workflow flag; if it is written, it must read `prune.mjs`/`snapshot.yml`
too.

## member-surfaces-11 — share the "Show older / Show fewer" link
**Verdict: confirmed.** The className
`rounded-sm text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80`
occurs exactly **3** times in non-generated `src`: twice inline at
`messages/(index)/page.tsx:111-116` and `:118-123` (the finding's `110-124` brackets them), once
as `MoreLink` at `admin/messages/(index)/page.tsx:51-61` with the comment at `:50-52`. Both
pages are server components, so a plain shared component works.

## shell-primitives-03 — three unread counts per /feed load
**Verdict: confirmed.** All three queries are literally
`prisma.notification.count({ where: { userId, read: false } })`: `layout.tsx:57-62`,
`feed/page.tsx:39-41`, `notifications/actions.ts:100-102` via `refreshCount` fired from the
mount effect at `notification-bell.tsx:153-159`. The count of three-on-/feed and two-elsewhere
is right for a subtle reason the finding gets right: `sidebar.tsx:765-773` suppresses the
mobile-top-bar bell on `/feed` (`!isActive(pathname, "/feed")`), while `page-header.tsx:145-151`
renders a header bell whenever `unreadCount !== undefined` — and **`/feed` is the only page
that passes it** (grep: `unreadCount` appears in `layout.tsx`, `feed/page.tsx` and the bell
plumbing, nowhere else). So exactly one bell mounts per page either way.

(a) is safe and idiomatic: `cache()` from React is already used at `auth.ts:459` and
`post-visibility.ts:1`. (b) is sound too — the sidebar bell mounts once per hard load, when its
prop is milliseconds old, and thereafter only `focus` and panel-open refresh it; that is
unchanged by dropping the mount call, and the B-120 argument in the docblock (`:130-146`) is
about *staleness later*, which the focus listener owns. The fixer must not also delete the
focus listener or B-120 reopens.

## shell-primitives-07 — `not-found.tsx` rides all 52 routes
**Verdict: confirmed.** I re-ran the attribution myself against
`raw/route-bundle-stats.json`: `.next/static/chunks/0uxgeqj6j_wg1.js` is **6,116 bytes** on
disk and appears in `firstLoadChunkPaths` for **52 of 52** non-lab routes (zero misses). The
chunk contains `"wandered off the path"`, `useSoloHoopoe` ×2 and a `dynamic(…, ssr:!1)` stub
for the Hoopoe — i.e. it is this module and the puppet is already split out, exactly as
claimed. Source line ranges check out: `dynamic` at `:28-31`, the token kit `:112-155`, the
director effect `:171-360`, the `{solo && …}` stage `:396-411`; the file is 413 lines and
starts with `"use client"` (so a `dynamic(..., { ssr: false })` split is legal from it).
Risks the fixer should hold: `useSoloHoopoe()` at `:153` is what gates the stage, and moving
the guard's call site into the lazy child changes *when* this page claims the hoopoe against
any other on screen; and the 404 is not in `e2e/visual.spec.ts`, so this is hand-verified only.

## shell-primitives-13 — the 404 gates a flight on `prefers-reduced-motion`
**Verdict: confirmed-with-correction — the contradiction is real; "the only such site" is not.**

`DESIGN-SYSTEM.md` §7 starts at `:395`, and `:397` reads "**Animations always play.** Never
gate motion on the OS `prefers-reduced-motion` setting, anywhere in the app." `motion.tsx:103`
says `ambientReduced` "must NEVER be wired to `window.matchMedia("(prefers-reduced-motion)")`".
`not-found.tsx` does exactly that — but at **`:184`**, not `:181` (`:180-183` is the comment
arguing for itself), and the teleport branch is **`:241-244`**, not `:242-245`. globals.css's
restatement is at `:456-460`.

The refuted half: `not-found.tsx` is **not** the only live site. `landing/footer-hoopoe.tsx:176`
also does `window.matchMedia("(prefers-reduced-motion: reduce)")`, with a listener, and
declares itself a "Scoped exception to the app's 'never gate on prefers-reduced-motion' rule"
in its docblock at `:59-66` and again at `:172-173`. So the owner is being asked about a rule
that already has one self-declared carve-out in shipped code; the honest resolution is a named
carve-out list in §7 covering both, or deletion of both. Either way this is two files.

## shell-primitives-15 — `utils.ts` census + the module-scope segmenter
**Verdict: confirmed.** `src/lib/utils.ts` is **447 lines with exactly 24 `export`s**. I
re-counted the two zero-caller claims by grep over `src`, `e2e`, `scripts` (excluding
`src/generated` and the file itself): `firstGrapheme` → only `text-shape.test.mjs`;
`truncateGraphemes` → only `text-shape.test.mjs`; `graphemes` → only `admin-threads.ts`;
`getInitials` → `bird-avatar.tsx` (+ the test); `fullNameFits` → `validators.ts` (+ test);
`valleyDaysBetween` → `catchups-core.ts` (+ test); `valleyDayStart` → `feed/actions.ts` (+
test); `formatPaise` → `admin/support/page.tsx`, `admin/(index)/page.tsx`. The census holds and
the "keep both exported for the test" judgement is right.

The one actionable item is confirmed and I strengthened it with a byte measurement the finding
did not have: `GRAPHEME_SEGMENTER = new Intl.Segmenter(...)` is at `utils.ts:133`, module
scope, comment `:121-132`. In the production build exactly one chunk contains `Intl.Segmenter`
— `.next/static/chunks/3c53_63m9ek3x.js`, 29,009 bytes — and that chunk is in the first-load
set of **52 of 52** non-lab routes. So the ICU segmenter is constructed at import time on every
page in the app, for a function two files call. The lazy getter is right; the saving is runtime
work, not bytes (the module ships either way).

---

## Cross-finding notes for the fix sessions

1. **`(main)/layout.tsx` is touched by three findings** — `admin-analytics-07` (move presence
   to `after()`), `data-layer-07(a)` (skip the `lastSeenAt` UPDATE), `shell-primitives-03(a)`
   (`cache()` the unread count). Safest order: `shell-primitives-03(a)` (pure, no framework
   trap) → `data-layer-07(a)` (needs the session select + `next-auth.d.ts`) →
   `admin-analytics-07` last, because it is the one that must refactor `touchLastSeen`'s header
   reads first. Doing 07 before 07(a) would move a query behind the response and then remove it.
2. **`notifications/actions.ts` is touched by `feed-posts-10` and `feed-posts-16`** — one file,
   one commit. `shell-primitives-03(b)` touches the bell that reads it; keep them separable.
3. **`data-layer-07` calls the layout's `notification.count` a not-finding; `shell-primitives-03`
   does not contradict it** — 03 never proposes removing it, only deduping the /feed repeat with
   `cache()`. Both can be applied. 03's steps are the safer ones (no schema/session change).
4. **`landing-mascot-avatars-11` and `-14` overlap on `pick-bird/loading.tsx:11`.** Do 14 first
   (introduce the shared constant), then 11's deletion of the subtitle bar, or the second will
   re-touch the same line.
5. `member-surfaces-05` and `member-surfaces-08` are both "the guide's comments/spec lie"; the
   fifth site I found (`guide-door.tsx:6-10`) belongs with 05.
