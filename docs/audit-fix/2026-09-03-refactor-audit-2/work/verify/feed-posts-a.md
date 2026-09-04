# feed-posts-a — adversarial verification notes

Verifier: feed-posts-a. Date: 2026-09-04. Tree state: HEAD `74cc61a` ("fix(retention):
notifications are kept 30 days, everywhere"), one commit past the audit baseline `72b5a1d`.
That commit touched only `src/lib/post-notifications.ts` (1 line) inside this territory, so
every line number in the reports was written against effectively the same tree I read.
Uncommitted work in the tree: `docs/audit-fix/README.md`, `progress.md` (someone else's WIP);
no source file in my territory is dirty.

Cluster: data-layer-09, data-layer-17, dead-code-02, duplication-08, duplication-16,
feed-posts-01, -02, -03, -04, -05, -07, -08, -09.

Method: every claim re-derived from the files at HEAD; every "no other caller" claim
re-enumerated with a repo-wide grep including `src/app/lab`, `e2e/`, `scripts/` and the
`*.test.mjs` suite; two claims checked against the read-only production build at
`.scratch/audit2-build/.next/`.

---

## feed-posts-01 / dead-code-02 — the unreachable sort + time filters (same finding, two reports)

**Verdict: confirmed (both), with corrections to dead-code-02's cause and line count.**

Caller enumeration, whole repo:

- `grep -rn "PostFeed" src e2e scripts docs/spec` → the only *render* site is
  `feed-column.tsx:40`. Everything else is prose in comments, `notification-reach.test.mjs`
  and `e2e/deeplink.spec.ts` (both about the hash-scroll code, not the controls).
- `grep -rn "FeedColumn|feed-column" src e2e scripts` → the only render site is
  `src/app/(main)/feed/page.tsx:84`.
- `feed/page.tsx:85` is `showControls={false}` — read at HEAD, quoted.
- Lab: the only lab importers of `components/posts/` are `lab/crop/page.tsx:31`,
  `lab/profiles/_variant-letterhead-2.tsx:92` and `_variant-letterhead-3.tsx:103`, all
  `PostCard` only. feed-posts-01's "three lab importers take PostCard only" is exact.
- `setSortBy` / `setTimeFilter` occur only at `post-feed.tsx:319` and `:329`, inside the
  block. `loadPosts`'s other caller, `profile-author-feed.tsx:77,103`, passes
  `{ authorId, kind, cursor }` only.

So `sortBy === "recent"` and `timeFilter === "all"` on every render the app can produce.
Exact ranges at HEAD:

| piece | lines | count |
|---|---|---|
| `showControls &&` block | `post-feed.tsx:281-344` | 64 (feed-posts-01 exact; dead-code-02's "281-343 / 63" is one short) |
| types / state | `:23-24`, `:59-61` | 5 |
| branch-only imports | `:6` (MagnifyingGlass, SlidersHorizontal — `X` at `:275` stays), `:10` Input, `:11-17` Select* | ~9 |
| `getTimeFilterDate` | `actions.ts:1040-1069` (docblock 1041-1049, body 1050-1069) | 30 |
| offset arm | `actions.ts:1234-1270` | 37 (feed-posts-01 exact; dead-code-02's "1234-1265 / ~32" is short) |
| options + defaults | `actions.ts:1140-1141`, `:1147-1149` | 5 |

Honest total ≈ 150 lines, i.e. dead-code-02's number, not feed-posts-01's ~135.
`Button` (`:401`) and `X` (`:275`) must stay — feed-posts-01's import list omits the two
phosphor icons that go; dead-code-02's includes them. Use dead-code-02's import list and
feed-posts-01's step list.

**Correction to dead-code-02's Notes.** It blames the header search pill,
`8a10763` (2026-08-30). Wrong: `git log -S'showControls={false}' -- src/app/(main)/feed/page.tsx`
returns exactly one commit, `096a034` (2026-06-28 19:14, "AppShell rightRail + Sidebar +
PageHeader to match contract"). feed-posts-01 attributes it to `e5fc121` (2026-06-28 19:39),
which is the next commit that same evening — the date is right, the sha is one off. The block
has been unreachable since 2026-06-28, two months before the pill landed.

**Hard evidence that the dead UI ships.** In the production build,
`grep -rl "Most discussed" .scratch/audit2-build/.next/static/chunks` →
`18g21h3c5zp5v.js` (38,732 bytes), and that file is in `/feed`'s `firstLoadChunkPaths`
(`raw/route-bundle-stats.json`). Caveat for the bundle lens: that chunk also carries phosphor
icon glyph maps, so the saving is a slice of it, not the whole 38 KB.

**One nuance neither report states.** `loadPosts` is a *server action*, so a hand-crafted
call can still pass `sortBy: "liked"` today; deleting the option makes such a call fall
through to the keyset arm instead of erroring. No security consequence (the where-clause is
unchanged), but it is a public-contract change, not merely a UI deletion.

Pins checked: `grep -rn "showControls|sortBy|timeFilter|getTimeFilterDate|offset:"` over
`src/lib/*.test.mjs`, `scripts/qa/*.test.mjs`, `e2e/*.ts` returns only
`river-cursor.test.mjs`'s own offsets. dead-code-02's "no rule test pins any of it" holds.

Still an owner call (ROADMAP:59 and :99 both name "filters behind disclosure" as a Phase 4
DoD item — verified verbatim).

## feed-posts-02 — five `revalidatePath("/feed")` on a tree that holds none of it

**Verdict: confirmed, and stronger than the report claims.**

All five call sites exist at the stated lines: 449 `votePoll`, 697 `editPost`, 958
`createComment`, 1006 `deleteComment`, 1035 `adminRemoveComment` (`grep -n revalidatePath`).

`feed/page.tsx` (105 lines, read in full) renders `CelebrationSignals`, `PageHeader`,
`FeedColumn` and `FeedRail`; its own queries are the unread count, `userPlace.findMany` and
`feedSeenAt`. `FeedRail` mounts four modules whose only queries are
`user.findMany` (directory), `post.findFirst` (letters), `photo.findMany` (collection) and
`post.findMany({select:{authorId}})` (pulse). **No comment, poll or like is read anywhere in
the /feed server tree** — I read `pulse-module.tsx` in full to be sure it counts posts and
distinct authors, not comments.

Client-side application verified line by line: `poll-display.tsx:99-121` (optimistic set +
revert in the error arm), `comments-section.tsx:252-271` `removeLocally` called from
`handleDelete` (`:273-277`) and `handleModerationConfirm` (`:279-286`),
`letter-engagement.tsx:88-89` bumps its own count.

Two things the report guessed at, now settled:
- `content-list.tsx` (the admin's other caller of `adminRemoveComment`) calls
  `router.refresh()` at `:422` right after `removeItem`. It never depended on the `/feed`
  revalidate. The report's "check this" is answered: no `revalidatePath("/admin/content")`
  is needed.
- No `experimental.staleTimes` override in `next.config.ts` (read `:229-260`), so dynamic
  segments keep the default 0-second client-router stale time and the purge half of
  `revalidatePath` buys nothing either.
- No test pins any of the five: `grep -rn revalidatePath src/lib/*.test.mjs` returns
  `composer-rule.test.mjs:58` (prose inside a B-041 message about `setRemoved`) and
  `image-purge-rule.test.mjs:250` (the `/collection` one).

The letter-page fear is unfounded: `LetterEngagement` holds `commentCount` in client state
and these actions never revalidated `/letters/<id>` anyway.

## feed-posts-03 — latch and defer `ReportDialog`

**Verdict: confirmed.** Line numbers exact: static import `post-card.tsx:36`, the "NOT here
on purpose … 137 lines is not worth restructuring" paragraph `:45-62`, `showReport` `:196`,
the unconditional mount `:649-656`; the `viewerMounted` latch it should copy is `:201-210`.
`report-dialog.tsx` is exactly 137 lines and statically imports `Dialog`, the five `Select*`
symbols and `Textarea`.

Bundle evidence: `grep -rl "Inappropriate content"` in the build hits
`0l7jfuve0b6zb.js` (58,389 bytes), which **is** in `/feed`'s first-load chunk list. That chunk
also holds base-ui list internals, so again the saving is a slice, not the file size.

Import-graph claim checked: outside lab, `ui/textarea` is imported by
`message-composer`, `report-dialog`, `moderation-dialog`, `person-detail`,
`admin-profile-tools`, `flag-person-dialog`, `console-collecting` — of those only
`report-dialog` is on /feed's *static* path (`moderation-dialog` is already `dynamic`).
`ui/select` outside lab: `post-feed.tsx`, `report-dialog.tsx`, `filters/pill-shell.tsx`. So
"Select leaves /feed too once feed-posts-01 lands" is correct.

PAGE_SIZE is 20 (`actions.ts:1072`), so "20 cards → 20 mounted dialogs" is right. Note the
three lab rooms that render `PostCard` inherit the latch; harmless.

## feed-posts-04 — the M33 one-per-unread rule written twice

**Verdict: confirmed.** Line numbers are exact, including the ones I first mis-counted:
`769` link, `770` message, `771-774` findFirst, `775-779` create; `1373` link, `1374` message,
`1375` the comment "Same one-per-unread rule as toggleLike (audit M33).", `1376-1384` the
twin. The two `createComment` writes are at `924-931` and `947-954` (the report's `923-932`
and `947-955` include the enclosing `if`/brace, so they are inclusive rather than wrong).

Pin checked: `notification-links.test.mjs:36-44` asserts the *absence* of a
``link: `/feed#${`` literal in `feed/actions.ts`, so moving the writes behind a helper in
`post-notifications.ts` (which already imports `postNotificationLink`) keeps it green.
`clearPostNotifications` is the only export of that module today (34 lines), so the proposed
home is real and small.

## feed-posts-05 — the comment payload written three times

**Verdict: confirmed-with-correction (field count and two line ranges).**

The three literals exist: `createComment`'s return `962-977` (exact), `loadComments`'s stubs
`1469-1480` (report says `1466-1479` — off by three; `1466` is `const visibleIds`), and the
rows map `1484-1495` (report says `1483-1494`). Each object carries **ten** fields — id,
content, parentId, createdAt, author, likeCount, liked, deleted, isOwn, viewerIsAdmin — not
eleven as the report says. `isOwn` really is `true` / `c.author?.id === userId` / `false`
across the three.

The stale-comment half is confirmed and is the sharpest part of the finding:
`COMMENT_AUTHOR_SELECT`'s docblock at `:37-39` says "three queries reference it"; `grep -n`
shows two (`:897`, `:908`), while `:1086` and `:1457` spread `AUTHOR_CARD_SELECT` directly.

## feed-posts-07 — the poll parse

**Verdict: confirmed-with-correction. The "single space is stored as empty" hole is NOT
reachable, and the proposed fix quietly changes a refusal.**

The 14-line hand-rolled parse is at `148-161` (exact). The third filter is at `235-238`
(the report says `236-238`; `235` is `const wantedPollOptions =`). `validators.ts:236` is
`z.array(z.string().min(1).max(200)).min(2).max(4).optional()` — exact.

Correction 1: the report says an option of a single space "passes the schema and is stored as
`""` — reachable only from a hand-made call". It is reachable from *nothing*: `raw.pollOptions`
is built only by the pre-parse at `:155`, which is `parsed.filter(o => o.trim().length > 0)`
and drops whitespace-only strings before Zod ever sees them. (The composer filters again at
`create-post-form.tsx:454`.) The dedupe case stands on its own; the hole does not.

Correction 2 (the fix session must know): today a 1-option array folds to `undefined` and the
post is created *without* a poll. Under the proposed
`pollOptions: pollOptions.length ? pollOptions : undefined`, one option reaches Zod's
`.min(2)` and the **whole `createPost` is refused**. The composer never sends one
(`create-post-form.tsx:453-457` requires `validOptions.length >= 2`), so this is only a
hand-made-call behaviour change — but it is a change, and it is not in the report.

## feed-posts-08 — one city question, three queries

**Verdict: confirmed.** `createPost` `214-221` (the report's `213-223` spans the enclosing
`if` and the `cityScope = ownPlace?.city ?? null` fold), `editPost` `615-621` (exact),
`canViewCityScope` `city-scope.ts:33-44` (exact, `select: { id: true }`). `editPost`'s comment
at `:604-605` really does say "Re-validated against the author's own UserPlace list exactly as
createPost does". Keeping the local name `ownPlace` keeps the C-017 slice green
(`feed-write-rule.test.mjs` asserts `if (!ownPlace) {\n      return { error:` and the absence
of `cityScope: ownPlace?.city ?? null` inside that slice).

## feed-posts-09 — the composer's dead `placeholder`

**Verdict: confirmed.** `ComposerScope` `:73-74`, `SCOPE_PLACEHOLDER` `:85-91`,
`placeholder?` in the params `:94` and the type `:109`, `resolvedScope`/`collapsedPlaceholder`
`:140-141`, the retyped letter sentence at `:217` (identical to `:90`) — all exact. Only two
callers render it: `feed-column.tsx:35-39` (currentUser, userPlaces, onPosted) and
`letter-desk.tsx:102-117` (defaultLetter, immersive, currentUser, userPlaces, postId,
initial*, onDraftSaved/onAutosaveState). Neither passes `placeholder`. knip agrees:
`raw/knip-repo-config.txt:93 ComposerScope type src/components/posts/create-post-form.tsx:74:13`.
`grep -rn ComposerScope src` returns three hits, all inside the file.

## duplication-08 — one EmptyCard for five cards

**Verdict: confirmed-with-correction. The shell is identical five times; the contents have
drifted, so the extraction is a small visual normalisation, not a pure refactor.**

`grep -rn "p-12 text-center" src --include='*.tsx' | grep -v lab` returns exactly five, at the
claimed lines: `letters/(index)/page.tsx:155`, `post-feed.tsx:363`,
`directory-client.tsx:651`, `:660`, `:719`. The outer class string is byte-identical in all
five.

But the report's "each followed by `<p className="font-heading text-lg tracking-tight
text-foreground">`" is not true of two of them:
- `directory-client.tsx:670` is `font-heading text-lg text-foreground` — **no
  `tracking-tight`**.
- `letters/(index)/page.tsx:157` is `mt-3 font-heading text-lg tracking-tight` (it follows a
  `Feather` icon, so it carries a top margin the others do not).
- `leading-relaxed` is on the body paragraph in `post-feed` and `letters` and absent in all
  three directory copies.

A shared `EmptyCard` will therefore *change pixels* at `directory-client.tsx:660` (letter
spacing) unless the component takes a title className, and the letters card needs its `mt-3`
preserved. `npm run visual` masks /directory past the header, so this will not be caught by
the baselines — it has to be eyeballed.

## duplication-16 — two date stragglers

**Verdict: confirmed.** Both spell the identical bag:
`letters/[id]/(read)/page.tsx:195-200` and `settings/actions.ts:232-237` (both exact), and
`formatDisplayDateLong` (`utils.ts:237-244`) is the same four options on `"en-GB"`. Extra
detail for the fix session: each file's *only* use of `VALLEY_TIME_ZONE` is that call
(`page.tsx:15,196` and `actions.ts:16,233`), so both imports must be trimmed in the same edit
or ESLint's unused-import rule fails `npm run check`.

## data-layer-09 — the feed page re-runs two of the layout's reads

**Verdict: confirmed.** `feed/page.tsx:39-56` is one `Promise.all` of
`notification.count({ userId, read: false })`, `userPlace.findMany({ orderBy: { position:
"asc" }, select: { city: true } })` and `user.findUnique({ select: { feedSeenAt: true } })`.
`layout.tsx:56-62` runs the identical `notification.count`. `city-scope.ts:6-12`
`getViewerCities` is the same `userPlace.findMany` minus the `orderBy`, and `loadPosts`
calls it at `actions.ts:1155` for the first page the client asks for.

Two corrections/additions:
- The duplicate cities read only happens for **non-admin** viewers
  (`const viewerCities = isAdmin ? [] : await getViewerCities(...)`), so it is 1 query per
  /feed render + 1 per first `loadPosts` for ordinary members, 0 for admins.
- The count cannot simply be "read where the layout has it" — the layout passes it to
  `AppShell` and the page is `children`. The `cache()`d-helper half of the recommendation is
  the only executable one.
- **Bonus, free with this fix:** `letters/(index)/page.tsx:54-55` says "getViewerCities
  already returns it in position order" and passes that list to the composer's audience
  control. `getViewerCities` has **no `orderBy`** (`city-scope.ts:7-10`), so that comment is
  false and the letters composer's city order is whatever Postgres returns. Adding
  `orderBy: { position: "asc" }` to the shared helper — which data-layer-09 already proposes —
  fixes a real (if quiet) bug, and the stale comment should go with it.

## data-layer-17 — measure Prisma 7.10's relation-load strategy

**Verdict: confirmed-with-correction. The strategy question is answerable statically, and the
answer is "query", not "join".**

`@prisma/client` is 7.10.0. `grep -rl relationLoadStrategy` over `src/generated` returns
nothing (the report is right about that), but `node_modules/prisma/build/cli.js` contains it
twice, both times inside the same codegen guard:

    this.context.isPreviewFeatureOn("relationJoins") && f.push("relationLoadStrategy")

So the symbol is missing from the generated client because `relationJoins` is **still a
preview feature and is not enabled** — `prisma/schema.prisma:1-4` has no `previewFeatures`
line. The report's benign branch ("if the symbol is genuinely gone in 7.x, the joins are
already the default and there is nothing to do") is therefore ruled out: this client is on
the classic query strategy, one statement per relation level.

What remains genuinely unmeasured is the *count* per action — `postInclude` at
`actions.ts:1206-1230` has author, two `_count`s, two viewer-scoped relation reads and poll
options with their own counts — and that needs a live client with `log: ["query"]`, i.e. a
database. So: the premise is confirmed and sharpened; the number is still
unverifiable-needs-db.

---

## Overlaps and which steps to take

- **feed-posts-01 vs dead-code-02** — the same finding, and they agree on everything material.
  Take **feed-posts-01's step list** (it alone remembers that the `!showControls && search`
  banner at `:261-279` must become `search &&`, that the `offset:` guard on the cursor decode
  should stay so an old client's cursor still reads as "first page", and that
  `ProfileAuthorFeed` is unaffected), but take **dead-code-02's import list** (it catches
  `MagnifyingGlass` and `SlidersHorizontal`) and **dead-code-02's ~150-line saving**. Ignore
  dead-code-02's causal note about `8a10763`. Tier: dead-code-02's T4 is the honest one for
  the decision, feed-posts-01's T3 for the execution once the owner has chosen.
- **feed-posts-01 and feed-posts-03 compound**: `Select` only leaves /feed's static graph when
  both land.
- **feed-posts-04 and feed-posts-05** touch adjacent lines of the same two functions; do them
  in one sitting or the second will re-read a moved file.
- **data-layer-09 and feed-posts-02** are the two "stop doing work /feed does not need" items
  and do not conflict.

## Nothing I could refute outright

I tried to break each one: every "no other caller" claim survived a repo-wide grep that
included lab, e2e and the test suite; every quoted line number was within one or two lines of
where I found it. The three real corrections are (a) feed-posts-07's whitespace hole does not
exist and its fix changes a refusal, (b) duplication-08's five cards are not identical inside,
(c) data-layer-17's "possibly 0" outcome is ruled out by the preview-feature gate.
