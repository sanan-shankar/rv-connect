# feed-posts-comments - refactor audit 3 report

Territory T01 (`feed-posts-comments`): the feed page and its rail, the post card, the comment
section, the composer and its two hooks, polls, reports, the notifications actions, the photo aim
action, the post-visibility pair, rich text, link previews, the heart/bookmark toggle queue and
`normalize.ts`, plus `entry-comment-actions.ts` for comparison with the feed's pair. Audit-only;
nothing in the tree was changed. Date 2026-09-24, HEAD `70570bcd`. Files in territory: 44 source
files (10,600 lines); read fully: 44. Related tests read as the behavioural spec where a proposal
touches a pin (list under Coverage).

## Coverage
- Read fully (every line): `src/app/(main)/feed/page.tsx`, `loading.tsx`, `actions.ts` (1,315);
  `src/app/(main)/notifications/actions.ts`; `src/app/(main)/image-aim.ts`;
  `src/components/posts/*` (16 files: comments-section 1,156, create-post-form 1,308,
  edit-post-dialog, feed-column, feed-comment-actions, mention-dropdown, poll-creator,
  poll-display, post-card 772, post-card-skeleton, post-feed, report-action, report-dialog,
  use-composer-uploads, use-engagement, use-letter-persistence);
  `src/components/feed/*` (10 files incl. `rail/*`);
  `src/lib/{posts,post-visibility,post-visibility-rule,post-notifications,post-caps,rich-text,
  rich-text-editing,link-preview,link-preview-core,comment-thread,toggle-queue,normalize}.ts`;
  `src/components/catchups/edition/entry-comment-actions.ts` (comparison only).
- Read in full as spec: `src/lib/feed-write-rule.test.mjs` (351). Read the parts a proposal touches:
  `composer-rule.test.mjs` (every assertion, 323), `rich-truncate.test.mjs:1-60`,
  `append-page.test.mjs:85-105`, `notification-reach.test.mjs:20-60`, `post-visibility-rule.test.mjs`
  (test list + `:325-351`), `heart.test.mjs` (the paths it reads), `gate-coverage.test.mjs:183-212`.
- Also read, outside the territory, to judge it: `src/components/common/rich-text-area.tsx`,
  `src/lib/upload-client.ts:95-160`, `src/lib/keyset.ts:54-82`, `src/lib/notification-count.ts`,
  `src/lib/auth.ts:366-380,500-528`, `src/lib/validators.ts:209-282`, `src/lib/people-select.ts:30-58`,
  `src/lib/photo-visibility-rule.ts` (the jscpd pair), `src/components/profile/profile-author-feed.tsx:20-118`
  (the B13 precedent), `src/components/letters/letter-desk.tsx:95-125`,
  `src/components/letters/letter-engagement.tsx:70-95`, `src/components/catchups/edition/reader-parts.tsx:505-575`,
  `src/components/guide/chapters/feed.tsx:1-60`, `src/app/(main)/letters/[id]/(read)/page.tsx:27-120`,
  `src/app/(main)/letters/(index)/page.tsx:176-200`, `scripts/qa/hover-probe.mjs:55-80`, `scripts/qa/drive.mjs:360-370,640-670`;
  specs `DESIGN-SYSTEM.md` (§1-§2 table, §3 menus and dialogs, §4-§10), `letters.md` (whole),
  `media.md` (banner, §1-§4.2b, grep of the rest); audit-2 `report.md` and `fix-prompt.md` rows for
  this territory; the seven landed reports' "For other lenses" sections.
- Skimmed (why): none of the territory.
- Not read (why): the remaining related tests in full (`link-preview-core.test.mjs`, `rich-text*.test.mjs`,
  `normalize.test.mjs`, `post-caps.test.mjs`, `comment-target-rule.test.mjs`, `draft-rule.test.mjs`,
  `read-more-fold.test.mjs`, `heart.test.mjs` bodies) - T14 audits them as tests; I read only the
  assertions my proposals would move.
- Uncommitted edits seen (someone else's WIP): none. `git status --short` was clean for every
  territory path at session start (only the two untracked audit folders exist in the tree).

## Summary
This territory is the product's busiest surface and most of it is sound: one comment thread
implementation (`lib/comment-thread.ts`) serves posts and Catch-up answers, one toggle queue serves
all five hearts, one visibility rule guards every post path, and the security-heavy files (rich text,
link previews, the visibility pair) are earned. The structural well is not dry, though, and the
biggest wins are about requests and reachability rather than lines:

- **`/feed` still fetches its first page after hydration** (the shape audit 2 closed on the profile
  as B13): two server-action POSTs and three avoidable queries per visit, and the member watches
  skeletons for one extra round trip to Mumbai (01).
- **Two whole subsystems have no live use.** Post batch targeting is plumbed end to end - schema
  column, validator, visibility rule arm, a LIKE arm on every feed query, nine tests - and no
  component has ever been able to set it, while the in-app guide tells members they can (02).
  Polls have zero live rows six months after shipping (03). Both are owner calls.
- **The write actions take FormData that every caller builds by hand** (six builders; the B-048
  audience rule restated at three of them) (04); **`canViewPost` returns the row and every caller
  fetches it again** (05); the composer re-implements `RichTextArea` (06) and hand-rolls the app's
  last non-shared menu (07).
- Placeholders a member can never reach: `PostCard variant="sheet"` (08), the composer's
  `defaultLetter`/`immersive` split (09), `PostFeed`'s debounce (10), the `offset:` cursor guard (11).
- About 90 lines of comments describe code that was deleted or changed (16) - the cheap lever, not
  the headline, but real: several would mislead the next session (a "layout effect" that is a
  `useEffect`, a 21px padding that is 28, a scroll that never shipped).

Split: 17 structural, 7 cheap. In the right units: -2 POSTs and -3 queries per `/feed` visit (01),
-1 query per like, comment and report (05), ~24 KB raw off `/feed`'s hydration path (15), a few KB
off the Catch-up reader (12), ~60 lines from the FormData ceremony (04), ~30 from the editor fork
(06), ~250 lines + a column + a LIKE arm per feed query if batch targeting goes (02), ~600 lines + 2
tables if polls go (03). What surprised me: the guide promising a feature that does not exist, and
two QA scripts (four probes) still driving the composer pill deleted on 2026-09-14 and the comment
input it replaced. What earlier audits left
that is now moot: audit 2's D1 (sort filters, done), B11, C7, E11's feed half, feed-posts-12 and
-02 are all done; G11 (extract the composer's "+" menu) is parked and 07 is a different lever.

## Findings

### feed-posts-comments-01 - Seed `/feed`'s first page on the server and advance the "new since" marker there, the way B13 already does for a profile's Writing tab
- **Where**: `src/app/(main)/feed/page.tsx:42-53` (the page's `Promise.all`) and `:91-96`
  (`<FeedColumn initialSearch={q} ...>`); `src/components/posts/feed-column.tsx:100-107` (hands the
  props to `PostFeed`); `src/components/posts/post-feed.tsx:106-155` (anchor: `// First page whenever
  the search or an external reload trigger changes.`), inside it `:135-150` (the `markFeedSeen`
  stamp); `src/app/(main)/feed/actions.ts:1288-1315` (`markFeedSeen`), `:770-779` (the "THE RULE"
  paragraph that says the server tree renders no post). Precedent to copy:
  `src/components/profile/profile-author-feed.tsx:54-104` (`initialPosts`, `const seeded`) and
  `src/app/(main)/profile/[id]/page.tsx:193-202` (the page calling `loadPosts` directly).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/feed` is where every signed-in member lands. The page renders the header, the
  rail and an empty `PostFeed`; `PostFeed` mounts with `loading = true`, draws `PostListSkeleton`
  (the same three cards `loading.tsx` drew a moment earlier), and only after hydration calls
  `loadPosts` as a server action (`post-feed.tsx:121`). One `loadPosts` invocation is a POST, a
  function invocation and four queries: `auth()` (the session callback's
  `prisma.user.findUnique`, `auth.ts:372`), `getViewerCities` (non-admins), `post.findMany` with
  `postInclude`, and `withPhotoFacts`. The page has already run `auth()` and `getViewerCities` in
  the same request (`page.tsx:27`, `:44`) and both are React-`cache()`d (`auth.ts:526`,
  `city-scope.ts:15`), so a server seed re-runs neither - which is exactly the check audit 2's
  fix-prompt lesson 5 demands of a seed ("check what a server-side seed re-runs"). Then
  `markFeedSeen` is a second POST: `auth()` again plus one `updateMany`. Audit 2 row B13
  (`directory-profile-14`) closed this shape on `/profile/[id]`; `/collection` was closed in audit 1.
  `/feed` is the last and the busiest.
- **What to do**:
  1. In `feed/page.tsx` start `loadPosts({ search: q })` in the page (do not await it before the
     header renders) and pass the promise down: `FeedColumn` -> `PostFeed` as `firstPage`. In
     `PostFeed`, read it with React 19's `use()` inside a `<Suspense fallback={<PostListSkeleton />}>`
     around the list only, so the header, the New post badge, the composer and the rail paint
     exactly as early as today and the posts stream in with the HTML. (Do NOT wrap `FeedColumn` in
     the boundary: the composer lives there and must open before the posts arrive.)
  2. Copy `ProfileAuthorFeed`'s `seeded` pattern for the state: initial `posts`, `cursor`,
     `hasMore` from the seed, `loading = false`, and skip only the FIRST run of the fetch effect
     (`reloadKey === 0` and `search === (initialSearch ?? "")`). The publish path (`reloadKey`
     bump) and a new `?q=` must still fetch client-side and still call `onReloadedRef.current?.()`,
     which is what closes the composer into the feed (`feed-column.tsx:56-60`).
  3. Move the marker write into the page: after reading `marker.feedSeenAt` (`page.tsx:49-52`, read
     BEFORE any write, so the divider keeps its "captured once" meaning), and only when `!q`,
     schedule `after(() => ...)` with the same monotonic `updateMany` `markFeedSeen` runs today
     (`actions.ts:1302-1314`, including the future-date refusal and the dev-only log). Then either
     delete the client stamp at `post-feed.tsx:135-150` or keep it only for the `reloadKey` path;
     advancing past a post the member just published is harmless either way - pick one and say so
     in the comment. `markFeedSeen` can go if nothing else calls it (`grep markFeedSeen` - today
     only `post-feed.tsx`).
  4. Rewrite `actions.ts:770-779`: the rule it states (an action whose result the client already
     holds does not revalidate `/feed`) still holds, because the list stays client state after the
     seed; what changes is that `/feed`'s server tree now does fetch the first page, so the four
     actions that still `revalidatePath("/feed")` (createPost, publishDraft, deletePost,
     adminRemovePost) will re-run the seed query on their refresh. `PostFeed`'s state is
     initialised once, so nothing on screen moves - the same as the profile today.
- **Saving**: per `/feed` visit: -2 server-action POSTs and function invocations (`loadPosts`,
  `markFeedSeen`), -3 queries (their two `auth()` reads and `loadPosts`' `getViewerCities`); the
  first posts arrive in the streamed HTML instead of after hydration plus one round trip, and the
  member sees one skeleton phase instead of two. Lines: about neutral (+10 for the seeded branch,
  -15 for the client stamp if step 3 removes it).
- **Risk & gate**: medium. The effect is the composer's landing handshake as well as the list's
  loader. Gates: `npm run check` (pins that must stay green: `rich-truncate.test.mjs:18-42` C-180 on
  `loadingMoreRef`; `append-page.test.mjs:90-104`; `notification-reach.test.mjs:27-60` for the
  fragment scroll and `deeplink-flash`; `composer-rule.test.mjs`), `npm run visual` (`/feed` is a
  baseline route; its body is masked, the frame is not), and by hand on a production build with the
  network panel open: arriving at `/feed` sends no `loadPosts` POST; publishing a post keeps the
  composer on "Posting..." and closes it into the new first post; `/feed?q=monsoon` shows the
  banner and results with no POST; tapping a bell notification to `/feed#<id>` scrolls and flashes;
  the "New since you were last here" divider appears once and not on a second device; and the demo
  build (`DEMO_MODE=1`), where the marker write is denied by the Prisma extension and must stay
  silent.
- **Confidence**: high on the mechanism and the POST/query counts (read from `auth.ts`,
  `city-scope.ts` and `actions.ts`); medium on the perceived gain, which I did not time. What would
  change my mind: the owner wanting the skeleton-then-posts arrival for its own sake; nothing in
  DESIGN-SYSTEM §7's loading rules says so, and they say the loading state should be "the page it
  stands in for".
- **Notes**: the fear is a slow database making the first byte of posts later than the skeleton
  used to appear. Streaming through a Suspense boundary around the list only (step 1) is what
  removes that fear; do not simply `await` the seed in the page body. Search is seeded too (the
  page already has `q`). `withPhotoFacts` runs in the page render instead of the action; same
  query count. Related: 10 (the dead debounce lives in the same component and should go first,
  it simplifies the effect this finding edits), 11 (`loadPosts`' cursor guard).

### feed-posts-comments-02 - Post batch targeting is plumbed end to end, no member can ever set it, and the in-app guide says they can (owner decision A)
- **Where**: write path `src/app/(main)/feed/actions.ts:174` (`targetBatches: (formData.get("targetBatches")
  as string) || undefined`) and `:276-280` (`storedBatchTargets(...)`); `src/lib/validators.ts:217-233`
  (the field, its cap and its `parseBatchTargets` refine); the rule `src/lib/post-visibility-rule.ts:62-167`
  (`BATCH_TYPES`, `MAX_BATCH_TARGETS`, `batchTargetKey`, `parseBatchTargets`, `storedBatchTargets`,
  `batchTargetsInclude`) and `:223-231` (the batch arm of `decidePostVisibility`); the SQL
  pre-filter `src/lib/posts.ts:14-41` (`batchScopeWhere`) and `:119-122` (the batch `OR` in
  `audienceWhere`); `src/app/(main)/feed/page.tsx:16,103` and `src/components/feed/rail/rail-viewer.ts:14-15`
  (the viewer's batch key); `src/components/feed/rail/letters-module.tsx:43`; the guard select
  `src/lib/post-visibility.ts:39`; member-facing copy `src/components/guide/chapters/feed.tsx:3-5,26-43`;
  tests `src/lib/post-visibility-rule.test.mjs:77-85,198-272` (nine batch tests) and
  `src/lib/composer-rule.test.mjs:118-133`; the column `Post.targetBatches` (`prisma/schema.prisma:708`).
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: no component writes the field and none ever did. `grep -rn targetBatches
  src/components` finds only comments; `git log --all -S'"targetBatches"' -- src/components src/app`
  returns one commit, `8a73497f` (2026-03-20), which is the server action reading it;
  `git log --all -S'targetBatches' -- src/components/posts/create-post-form.tsx` returns nothing, so
  the composer never had a batch picker. The composer's only audience control is "Show to" with the
  member's own cities (`create-post-form.tsx:1047-1090`). Nothing in `scripts/`, `prisma/` or `e2e/`
  writes it either. Yet `audienceWhere` puts `OR: [{ targetBatches: null }, { targetBatches: "" },
  { targetBatches: { contains: key } }, { authorId }]` on every `loadPosts` page, the letters index
  (`letters/(index)/page.tsx:70`), the profile counts (`profile/[id]/page.tsx:181`) and the
  letters rail; and the guide tells members, word for word, "A post reaches everyone unless you
  narrow it, and you can narrow it by batch" with a "Chosen batches only" row
  (`guide/chapters/feed.tsx:27-41`), while saying nothing about the city narrowing that does exist.
- **What to do**: the owner picks (see Owner decision A). If **remove**: (1) run the SELECT below
  first; (2) delete the batch half of `post-visibility-rule.ts` (`:62-167` except anything
  `photo-visibility-rule.ts` cites in comments only) and the `:223-231` arm; (3) `audienceWhere`
  returns the city arm alone, so `loadPosts` (`actions.ts:1090-1098`), the letters index and the
  profile stop spreading `OR: audience.OR` (keep the author's self-exemption, which lives in the
  city arm's `OR` already); (4) delete `batchScopeWhere`, `RailViewer.batch`, the page's
  `batchTargetKey` call, the letters-module arm; (5) delete `targetBatches` from `postSchema` and
  createPost; (6) delete the nine batch tests and narrow `composer-rule.test.mjs:118-133` to the
  city half; (7) rewrite the guide's "Who sees it" around cities; (8) hand the column drop to the
  data layer as a dated `prisma/migrations-manual/` file (never `db push`). If **build it**: a
  batch picker beside "Show to" in the composer's "+" menu (and in the letters desk), writing the
  field the rule already enforces - the plumbing is ready and security-reviewed (audit M43). If
  **keep it dormant**: at minimum fix the guide copy, which is wrong today.
- **Saving**: removal: ~250 lines (~120 code: rule ~50, posts.ts ~15, validators ~12, actions ~5,
  page/rail/letters ~6, tests ~70, comments ~60), one DB column, and one `OR` arm with a `LIKE
  '%key%'` off every feed page, letters-index, letters-rail and profile-count query.
- **Risk & gate**: medium. Live SELECT the fix session must run first, read-only:
  `SELECT count(*) FROM "Post" WHERE "targetBatches" IS NOT NULL AND "targetBatches" <> '';`
  - if it is not 0, removing the arm WIDENS those posts' audience; stop and ask. Gates: `npm run check`
  (`post-visibility-rule.test.mjs` - its `:385` "every audience-filtered surface composes its arms
  from one builder" must stay; `gate-coverage.test.mjs`; `security-regressions.test.mjs`),
  `npm run verify:crawl`, the write-path-reviewer agent.
- **Confidence**: high that nothing can set the field (three independent greps plus history); medium
  on zero live rows until the SELECT runs.
- **Notes**: the guide inaccuracy is member-facing and should be fixed whatever he answers. letters.md
  §6 still lists "Letter audience (cross-batch) | existing `targetBatches` field + filter - no new
  feature", which reads as if it were reachable. `batchTargetKey` has no other consumer (checked:
  admin-rule.test.mjs mentions it only in a comment; the batch Catch-ups use `batchType`/`batchYear`
  directly). If polls (03) and this both go, `audienceWhere` becomes a one-arm helper that could
  be inlined into `cityScopeWhere` callers; decide after. One comment elsewhere argues from this
  machinery: `admin/people/actions.ts:146-157` explains re-deriving `batchType` partly because
  `batchTargetKey` would otherwise send "a batch-targeted post ... to the wrong set of people"; the
  re-derivation stays (the batch Catch-ups and the byline need the right board), only that clause
  of its reasoning goes.

### feed-posts-comments-03 - Polls have no live rows six months after they shipped (owner decision B)
- **Where**: `src/components/posts/poll-creator.tsx` (107), `poll-display.tsx` (207); the composer's
  poll code `create-post-form.tsx:43-45` (lazy import), `:196`, `:215-225` (question placeholder),
  `:319`, `:466-471` (payload), `:583`, `:733-739`, `:972-987` (menu item), `:995`, `:550`;
  `src/app/(main)/feed/actions.ts:155-168` and `:208-225` (createPost's poll parse and nested
  create), `:254` (twin select), `:396-445` (`votePoll`), `:987-991` (`postInclude`'s `pollOptions`
  + `pollVotes`), `:1017-1028` (`serializePost`); `post-card.tsx:41,157-161,525-533`;
  `src/lib/validators.ts:235`; `src/lib/double-submit.ts:41-51`; outside the territory:
  `src/lib/demo-seed/seed.ts:103-104,283-300` (the demo seeds polls), `src/lib/admin-analytics.ts:912-941`
  and `src/app/(main)/admin/analytics/page.tsx:463` ("Poll votes cast"),
  `src/app/api/account/export/route.ts:229`, `src/lib/demo.ts:69-70`; schema `PollOption`, `PollVote`
  (+ `@@unique([userId, postId])`, `@@index([pollOptionId])`, `@@index([postId])`); tests
  `feed-write-rule.test.mjs:64-87` (C-009 poll cases), `cascade-rule.test.mjs`, `index-coverage.test.mjs`.
- **Phase**: placeholder
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `raw/db-tables-live.json`: `PollOption` `n_live_tup 0`, `n_dead_tup 6`; `PollVote`
  `n_live_tup 0`, `n_dead_tup 4` - somebody tried it and deleted it; counters since 2026-05-22
  (`db-stats-reset.json`). Polls shipped 2026-03-22 (`13f73937`). `PollVote_pollOptionId_idx` has 0
  scans. Every `loadPosts` and `loadSavedPosts` page still joins `pollOptions` (with a per-option
  vote `_count`) and the viewer's `pollVotes` for every row.
- **What to do**: owner picks. If **remove**: delete the two components, the composer's poll state,
  menu item and placeholder branch, `votePoll`, the poll half of createPost and of the twin check,
  `postInclude`'s two relations and `serializePost`'s `poll`, `PostData.poll`, the schema field,
  the demo seed's polls, the analytics tile and the export's poll lines; the tables go through a
  dated `migrations-manual` file. If **keep**: do 13.
- **Saving**: removal: ~600 lines across ~15 files (components 314, composer ~45, actions ~95,
  card/type ~20, validators/double-submit ~15, demo seed ~25, analytics/export ~10, tests ~60),
  2 tables and 4 indexes, 2 relation subqueries per feed page query, the poll chunk, and
  `PollDisplay` out of `post-card`'s eager chunk.
- **Risk & gate**: medium (touches the demo seed and the account export). SELECT first:
  `SELECT (SELECT count(*) FROM "PollOption") AS options, (SELECT count(*) FROM "PollVote") AS votes;`
  Gates: `npm run check`, the demo seed test (`demo-seed/content.test.mjs`), `npm run visual`.
- **Confidence**: high on "unused on production"; the demo DOES show polls, which is the one place a
  visitor meets them.
- **Notes**: the guide mentions polls ("a poll if you want a count", `guide/chapters/feed.tsx:53`).
  Not the same thing as the Catch-up vote question (`vote-question-rule.ts`, `CatchupPromptOption`),
  which is its own owner-gated feature in `catchups-*` reports.

### feed-posts-comments-04 - Let the post and comment write actions take arguments instead of FormData that every caller builds by hand
- **Where**: server `src/app/(main)/feed/actions.ts:120-183` (createPost: `formData.get(...)` casts at
  `:142-145`, `:156-180`, the `pollOptions` JSON.parse in a try/catch at `:156-168`),
  `:506-699` (editPost: `:524-525`, the `images` JSON.parse in a try/catch at `:551-585`, `:602`,
  `:638-639`), `:809-829` (createComment `:822-826`); clients `src/components/posts/create-post-form.tsx:452-477`
  and `:510-514`, `src/components/posts/use-letter-persistence.ts:313-320` (autosave) and `:402-434`
  (exit save), `src/components/posts/edit-post-dialog.tsx:47-52`, `src/components/posts/feed-comment-actions.ts:26-32`;
  schema `src/lib/validators.ts:234` (`images: z.string().optional()`, a JSON string).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: six call sites build a `FormData` field by field; none is a `<form action>`, so the
  progressive-enhancement reason for FormData does not apply anywhere. The server then casts every
  field (`formData.get("content") as string`), re-parses two arrays out of JSON strings inside
  try/catch blocks, and the B-048 audience rule ("set `cityScope` unconditionally when resuming,
  empty string means Everyone") is restated at three client sites (`create-post-form.tsx:456-461`,
  `use-letter-persistence.ts:317-319`, `:428-432`) - three places for the next B-048.
  `feed-comment-actions.ts:3-8` says the comment shim exists only because createComment "was written
  for a form, while the Catch-up side takes plain arguments" (`createEntryComment(entryId, content,
  parentId)`).
- **What to do**:
  1. `createPost(input)`, `editPost(postId, input)` and `createComment(postId, content, parentId?)`
     (the Catch-up shape). `postSchema.safeParse(input)` as today; `images` becomes
     `z.array(z.string()).max(MAX_IMAGES)` and `parseJsonArray` goes; keep createPost's pre-parse
     poll filter on the array (audit 2 refuted removing it, `feed-posts-07`: a one-option array must
     drop the poll, not fail the post). The C-122 draft gate (`isLetterDraft`) must read the same
     values the create uses.
  2. One client helper for the letter payload (content, title, images, audience with the B-048
     rule, base version, draft flag) called by the composer's submit, the autosave and the exit save.
  3. `FEED_COMMENT_ACTIONS.create` becomes `createComment` and the adapter's docblock goes (see 22).
  4. Move the pins: `feed-write-rule.test.mjs:198` anchors C-017 on the literal
     `const cityScopeRaw = formData.get("cityScope")`; `composer-rule.test.mjs:155` pins
     `formData.set("cityScope", audienceCity ?? "")` in the composer; `composer-rule.test.mjs:216-250`
     extracts what `runAutosave` sends and checks each is a dependency of its effect - re-point it at
     the helper's arguments; `draft-rule.test.mjs:29` reads `actions.ts` for the draft gate.
- **Saving**: ~60 lines net (server ~25: casts, two JSON.parse try/catch blocks, the raw-object
  assembly; client ~35: six builders become object literals plus one helper; the comment shim),
  and the payload becomes a type the compiler checks instead of string keys it cannot.
- **Risk & gate**: medium-high by touch count: these are the security-pinned write paths. Server
  actions are public endpoints and arguments arrive as arbitrary JSON; the object goes through the
  same zod schema, which is stricter than today's unchecked `as string` casts. Gates: `npm run check`
  (`feed-write-rule`, `composer-rule`, `draft-rule`, `gate-coverage`, `security-regressions`),
  the write-path-reviewer agent, and by hand: a post with photos and a poll, a letter saved,
  resumed, autosaved from two tabs (the M66 version refusal), published, and published as a post;
  navigating away mid-letter (exit save); the edit dialog; a comment and a reply; the demo build
  refusing all of them.
- **Confidence**: high that the FormData layer is pure ceremony; medium on the exact line count.
- **Notes**: if the fix session wants a smaller step, do only (2): one letter-payload builder kills
  the triple B-048 restatement at zero risk to the server. Rejected: keeping FormData and adding a
  shared `toFormData(obj)` - it keeps both halves of the ceremony and only moves the typing.

### feed-posts-comments-05 - `canViewPost` already returns the post row; stop fetching it again right after
- **Where**: `src/lib/post-visibility.ts:35-45` (`GUARD_SELECT`), `:61-66` (`shaped`), `:77-85`
  (`canViewPost`); `src/lib/post-visibility-rule.ts:31-46` (`GuardedPost`; `PostVisibility`'s ok arm
  is `{ ok: true; post }`); the re-reads: `src/app/(main)/feed/actions.ts:744-748` (toggleLike:
  `post.findUnique({ select: { authorId, kind } })`), `:851-854` (createComment, same select),
  `src/components/posts/report-action.ts:196-200` (`select: { id, author: { select: { name } } }`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "visible\.post" src` returns nothing: every caller discards the row the
  guard fetched and then asks the database for the same row. `GUARD_SELECT` already carries
  `authorId`; it lacks only `kind` (and, for the report, the author's name, which is the same join
  as the `isBlocked` it already reads).
- **What to do**: add `kind: true` to `GUARD_SELECT` and `kind?: string | null` to `GuardedPost`
  (optional, so the pure rule's test fixtures need nothing); add `name: true` to the author select
  and carry it through `shaped()` as `authorName`. In toggleLike and createComment use
  `visible.post.authorId` / `visible.post.kind` (after `if (!visible.ok) return`, TypeScript narrows
  it). In reportPost use `visible.post.authorName` and delete the `findUnique` and its
  "That post is already gone" branch (`canViewPost` already answers not-found for a missing row).
- **Saving**: -1 query per like that creates a row, -1 per comment, -1 per report; ~15 lines.
- **Risk & gate**: low. `gate-coverage.test.mjs:183` and `post-visibility-rule.test.mjs:325-351`
  pin the `canViewPost(` CALL, which stays. `npm run check`; like, comment, reply and report on a
  city-scoped post as a member of that city and as an outsider.
- **Confidence**: high.
- **Notes**: the same double read exists on the letter page (`loadLetter`'s include plus the
  guard's select, the same row twice per view; statement #84 in `db-statements-live.json`, 2,263
  calls). That page is another territory; see For other lenses.

### feed-posts-comments-06 - The composer's editor is a second copy of `<RichTextArea>`; the reasons given for the fork are two-thirds gone
- **Where**: `src/components/posts/create-post-form.tsx:622-665` (the contentEditable and its
  wrapper), `:370-386` (`handleRichInput`), `:388-397` (`handleEditorKeyDown`), `:399-402`
  (`handlePaste`), `:251-261` (the mount hydration effect), `:263-272` (`applyRestoredDraft`
  writing `innerHTML`), `:304-312` and `:539-541` (two more `innerHTML = ""` writes); the shared one
  `src/components/common/rich-text-area.tsx:1-108`, already used by `edit-post-dialog.tsx:97-104`
  and `catchups/answer/answer-card.tsx:114`.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `rich-text-area.tsx:4-7` says it is the writing surface "for everything that is not
  the full feed/letter composer (which keeps its own contentEditable for mentions, polls and the
  expand choreography, on the same primitives)". Polls never lived in the editor (`PollCreator` is a
  sibling block), and the expand choreography was the pill, deleted on 2026-09-14 (`d632b8f3`).
  Mentions are the one real difference. The two editors call the same three helpers from
  `rich-text-editing.ts` and carry byte-identical class strings (`create-post-form.tsx:653-659` and
  `rich-text-area.tsx:100-103`: the tap-highlight suppression and the `data-[empty=true]:before`
  placeholder).
- **What to do**: give `RichTextArea` a `ref` (React 19 ref-as-prop) and let its `onChange` fire
  after the DOM is serialised, then in the composer: `onChange={(md) => { setContent(md); ...computeMentionRange() }}`,
  `ref={richRef}` for the mention insert and the focus-on-open; reset, dismiss and draft-restore
  by remounting with a `key` and `initialValue` (RichTextArea's own documented reset, "Remount (key)
  to reset"), which deletes the three `innerHTML` writes and the hydration effect. `data-placeholder`,
  `aria-label`, `minHeight` and the class are props it already takes; its `data-empty` is computed
  from the DOM, which is what the composer's `content.trim()` computes from state.
- **Saving**: ~30 lines net, one contentEditable implementation instead of two, and the three
  writing surfaces behave identically by construction.
- **Risk & gate**: medium: this is the most-used writing surface. Gates: `npm run check`
  (`composer-rule.test.mjs` pins on handleSubmit and the persistence hook; `rich-text-editing.test.mjs`);
  by hand on desktop and on a 390px phone: Cmd+B/I/U, the phone's selection bar, a pasted rich
  document arriving as plain text, "@" opening the mention list and inserting `@[Name](id)`, a
  resumed draft hydrating, the device-copy "Use it" restore, dismissing an empty composer, posting
  and the composer closing into the feed. The New post badge focuses `[data-composer] [contenteditable]`
  (`new-post-cta.tsx:34-36`) - that selector must still match.
- **Confidence**: medium-high; the one thing that would change my mind is a caret or IME behaviour
  the composer handles that RichTextArea does not (I found none: both use `execCommand` and the same
  serialiser).
- **Notes**: do 09 first (it removes a branch this edit would otherwise have to thread through).

### feed-posts-comments-07 - The composer's "+" menu is the last hand-rolled menu in the product (owner decision C)
- **Where**: `src/components/posts/create-post-form.tsx:924-1093` (trigger at `:928-953`, the
  `m.div role="menu"` at `:957-1091`), `:203` (`more` state), `:344-368` (its share of the
  outside-click/Escape handler), `:1108-1134` (the two chips that reopen it with `setMore(true)`);
  also `src/components/posts/mention-dropdown.tsx:73` (the mention list's own popover surface).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: `grep -rn 'role="menu"' src` outside the lab returns this one site. It predates the
  rule: built 2026-07-24 (`2d5fd948`), while DESIGN-SYSTEM §3 "Menus & dropdowns: one material"
  landed 2026-07-30 and says every dropdown "is the same object" - Float `--popover` surface,
  `--radius-md` 12px, the layered shadow, rows highlighted by `state-layer`, opening below the
  trigger's leading edge, `EASE_POP` ~140ms, and "a page may not override radius, colour, offset or
  animation". This menu is `bg-card`, `rounded-[var(--radius)]` (16px), `shadow-lg` (§4: "Never a
  flat `shadow-md`"), positioned `absolute left-0 top-11` by hand, animated on `SPRINGS.snappy`, and
  as a hand-made `role="menu"` it has no arrow-key roving focus, which the ARIA menu pattern
  requires. The mention list is the same story at `mention-dropdown.tsx:73`
  (`rounded-lg border bg-card shadow-lg`).
- **What to do**: `DropdownMenu` with `DropdownMenuItem`s for poll and letter, a
  `DropdownMenuCheckboxItem` for "Add to the Collection", and a `DropdownMenuRadioGroup` for "Show
  to"; keep `more` as the controlled `open` so the two chips can still open it. Add `[role="menu"]`
  to the composer's outside-click exemption (`:348`), or a click on a menu item would read as a
  click outside an empty composer and dismiss it (the menu portals out of `rootRef`, the same trap
  the attach dialog hit on 2026-08-06, `:328-343`).
- **Saving**: ~40 lines (the hand motion wrapper, three copies of the row class string, the role
  plumbing, `more`'s Escape branch), one `{...({...} as object)}` spread, and the last menu off the
  shared material.
- **Risk & gate**: medium; member-visible. The city chips in a flex-wrap become radio rows with a
  check, and the menu takes the Float surface, 12px corners and the shared pop. Gates:
  `npm run visual`, screenshots of the open menu at 1440 and 390, keyboard: arrow keys move, Escape
  closes the menu without dismissing a composer that has text.
- **Confidence**: high on the facts; the owner call is whether the chip row is worth keeping as an
  exception ("If a surface needs something a menu primitive can't do, it isn't a menu").
- **Notes**: audit 2's G11 (`feed-posts-15`, extract this menu and the attachment strip into their
  own components) was parked by the owner and sits in `docs/planning/FEATURES.md` item 3. This is a
  different lever (replace, not extract) and it changes pixels, so it goes to him rather than
  re-opening G11. If he says yes, the extraction mostly happens by itself.

### feed-posts-comments-08 - Delete `PostCard`'s `variant` prop: nothing, lab included, has ever passed "sheet" since the v2 design went to the lab
- **Where**: `src/components/posts/post-card.tsx:166` (`variant = "card"`), `:172`
  (`variant?: "card" | "sheet"`), `:376-379` (`wrapClass`, anchor `variant === "sheet"`), `:547`
  (`variant === "sheet" ? "-mx-5 mt-3" : "-mx-4 mt-3"`); call sites passing the default explicitly:
  `src/components/posts/post-feed.tsx:323`, `src/components/profile/profile-author-feed.tsx:168`,
  `src/components/profile/saved-posts-feed.tsx:81`, lab `src/app/lab/crop/page.lab.tsx:194`,
  `src/app/lab/new-post/_room.tsx:278`, `src/app/lab/profiles/_variant-letterhead-2.tsx:828`,
  `src/app/lab/profiles/_variant-letterhead-3.tsx:1328`.
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn 'variant="sheet"\|variant: "sheet"' src` finds no PostCard caller;
  every one of the seven callers passes `"card"` or nothing. The sheet mode arrived with the v2
  ruled-sheet feed on 2026-06-27 (`21eb32f2`, per `git log -S'variant === "sheet"'`) and that
  design now lives only in `/lab/v2`, which draws its own list (`lab/v2/page.lab.tsx:489`).
- **What to do**: drop the prop and its type; `wrapClass` becomes the card string; `:547` becomes
  `"-mx-4 mt-3"`; delete `variant="card"` at the seven call sites (the four lab rooms must be edited
  in the same commit or the owner's build fails to typecheck).
- **Saving**: ~8 lines, 1 prop, 7 call-site attributes.
- **Risk & gate**: low. `npm run check` (tsc covers the lab), `npm run visual` (no pixel should move).
- **Confidence**: high.
- **Notes**: the `demo` prop on the same component is lab-only too, but four rooms use it and its
  docblock (`:180-186`) defends it as the way a preview shows the real card: keep (Not-findings).

### feed-posts-comments-09 - `CreatePostForm`'s `defaultLetter` and `immersive` are one fact; delete the letter shell no caller can reach and merge the two returns
- **Where**: `src/components/posts/create-post-form.tsx:84,90,100,116-119` (the two props),
  `:138-140` (`collapsedPlaceholder`), `:1249-1283` (the letters return, with `!immersive && "card-elevated ..."`
  at `:1264` and `currentUser && !immersive && <BirdAvatar .../>` at `:1268-1270`), `:1285-1307` (the
  feed return); callers `src/components/letters/letter-desk.tsx:102-104` (passes both) and
  `src/components/posts/feed-column.tsx:77-86` (passes neither); the desk's comment
  `letter-desk.tsx:105-107` ("see the `!immersive` guard in CreatePostForm").
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "<CreatePostForm" src` returns exactly those two callers (none in the
  lab). So `defaultLetter && !immersive` and `!defaultLetter && immersive` never happen: the
  bordered-card letter shell and its avatar are unreachable, and `collapsedPlaceholder` is
  `POST_PLACEHOLDER` whenever it is read (on the desk `isLetter` is always true, because
  `canToggleLetter = !defaultLetter` at `:584` and `offerLetter` requires `!defaultLetter` at `:230`).
  "Collapsed" and `collapse` (`:304`) are names from the pill that was deleted on 2026-09-14.
- **What to do**: keep one prop (`desk`, or keep `defaultLetter` and derive the rest); delete the
  `!immersive` branches; replace `collapsedPlaceholder` with `POST_PLACEHOLDER`; merge the two
  returns into one `<div ref={rootRef} data-composer className={desk ? undefined : CARD_SHELL}>`
  whose avatar slot renders only off the desk and whose editor gets the opacity arrival only on the
  desk; rename `collapse` to `dismiss`; update `letter-desk.tsx:105-107`.
- **Saving**: ~25 lines, 1 prop.
- **Risk & gate**: low. `npm run check` (`composer-rule.test.mjs` pins the short-letter dialog and
  the handoff, not these branches), `npm run visual` (`/feed`), a screenshot of `/letters/new` at
  1440 and 390 before and after.
- **Confidence**: high.
- **Notes**: one composer for posts and letters is the spec (letters.md §2.1), so this merges
  branches inside it; it does not split it.

### feed-posts-comments-10 - Delete `PostFeed`'s `searchInput` state and its 300 ms debounce: nothing has typed into it since the header pill took search
- **Where**: `src/components/posts/post-feed.tsx:50-51` (`searchInput`, `search`), `:59-66` (the
  render-time reset, which sets both), `:77-85` (the debounce effect, anchor `debounceRef`),
  `:272-278` (Clear, which sets both).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the only writers of `searchInput` are `:63` and `:275`, and each is paired with
  `setSearch` of the same value in the same breath (`:64`, `:276`); the in-feed search box the
  debounce served is gone (`:27-29`: "this component draws no search box of its own"). So the
  effect's only work is to schedule `setSearch(search)` 300 ms later on every mount and every query
  change, a render bail-out.
- **What to do**: delete `searchInput`, `debounceRef` and the effect; the render-time reset and
  Clear set `search` alone.
- **Saving**: ~13 lines, one timer per mount.
- **Risk & gate**: low. `npm run check`; by hand: `/feed?q=word` from the header pill, then Clear,
  then a second search while on `/feed`.
- **Confidence**: high.
- **Notes**: while there, a behaviour the bug lens should see: the reset at `:62` ignores
  `initialSearch === undefined`, so going from `/feed?q=x` to `/feed` through the sidebar keeps the
  old search on screen. The simplification is the natural moment to decide `setSearch(initialSearch ?? "")`.

### feed-posts-comments-11 - `loadPosts`' `offset:` cursor guard is already what `decodeKeyset` does; delete it and its paragraph
- **Where**: `src/app/(main)/feed/actions.ts:1110-1116` (anchor `opts?.cursor?.startsWith("offset:")`),
  the parameter comment `:1033` (`// opaque: a post id (keyset) or "offset:N"`); `src/lib/keyset.ts:54-61`.
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `decodeKeyset` returns null for any string whose `|` is missing or first
  (`keyset.ts:56-57`), so `"offset:20"` already decodes to null, which is "start from the first
  page" - exactly what the guard's own comment says the guard exists to do. The offset arm it
  protected was deleted on 2026-09-07 (`c4bf886c`). The cursor has not been "a post id" since the
  value keyset landed (`d6c61dd4`, 2026-08-24).
- **What to do**: `const from = decodeKeyset(opts?.cursor);` (renamed: `after` shadows the
  `after` import from `next/server` at `:8` inside this function), delete `:1110-1115`, rewrite
  `:1033` as `// opaque keyset cursor from encodeKeyset`. While there, `:1123` computes `hasMore`
  and `:1134` re-derives it as `nextCursor !== null`: return the one already computed.
- **Saving**: ~9 lines.
- **Risk & gate**: low. `npm run check`; scroll the feed past two pages.
- **Confidence**: high.
- **Notes**: do this before or with 01, which edits the same function's callers. The residue of
  audit 2's D1 (see carry-overs).

### feed-posts-comments-12 - The Catch-up reader ships the SSRF classifier to the browser because `linkRanges` goes through `findLinks`
- **Where**: `src/lib/link-preview-core.ts:74-86` (`findLinks`, which calls `classifyLink` per
  link), `:513-518` (`linkRanges`), the machinery it drags along: `:88-180` (classification,
  `urlRefused`, `youtubeId`) and `:195-319` (the address refusal: `V4_REFUSED`, a top-level
  `.map(...)` at `:211-227`, `parseV4`, `parseV6`, `isRefusedAddress`); the client consumer
  `src/components/catchups/edition/reader-parts.tsx:1` (`"use client"`), `:61`, `:173-176`
  (`renderRichText(text, { linkRanges })`); also `src/app/lab/catchups/magazine/_pages.tsx:25`.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `linkRanges` only needs `start`/`end`, but `findLinks` computes `url:
  classifyLink(raw)?.url` for every link, and `classifyLink` reaches `urlRefused` ->
  `isRefusedAddress` -> the IPv4/IPv6 parsers. A module-level `[...].map(...)` call is not provably
  pure, so a bundler keeps it (and `parseV4`) even when nothing reachable uses it.
- **What to do**: split the scan from the classification inside the same file: a `scanLinks(body)`
  returning `{ raw, start, end }` (the `LINK_IN_TEXT` loop plus `trimTail`); `findLinks` =
  `scanLinks` + `classifyLink`; `linkRanges` = `scanLinks` only. Make `V4_REFUSED` droppable
  (`/*#__PURE__*/` on the map call, or build it lazily inside `v4Refused`). The file must keep "no
  relative VALUE imports" (`:21-22`), so the split stays within it rather than moving to a second
  module. Then confirm with the analyzer that the reader's chunk no longer contains a refusal-table
  literal such as `198.51.100.0` or `64:ff9b`.
- **Saving**: estimated 2-4 KB raw (~1-1.5 KB gz) off the client chunks that carry `reader-parts`
  (the Catch-up edition reader); not measured. The "one matcher" guarantee `rich-text.ts:80-84`
  relies on is kept (both still come from `LINK_IN_TEXT` + `trimTail`).
- **Risk & gate**: low. `npm run check` (`link-preview-core.test.mjs` holds every rule and should
  stay green untouched), a Catch-up edition with a pasted link that did not become a card still
  prints it as a link.
- **Confidence**: high on the reachability; medium-low on the byte figure until the analyzer runs.
- **Notes**: the rest of the pair (934 lines) is earned; see Not-findings. `fresh-code-12` already
  covers the four exports only their own file uses (`MAX_URL_LENGTH`, `decodeEntities`, `LinkKind`,
  `ensureLinkPreviews`); do both in one commit.

### feed-posts-comments-13 - If polls stay: defer `PollDisplay` behind `post.poll`, and let motion drive its count-up
- **Where**: `src/components/posts/post-card.tsx:41` (static import), `:525-533` (the render gate);
  `src/components/posts/poll-display.tsx:27-66` (`CountUp`: a hand-rolled `requestAnimationFrame`
  loop with its own ease `1 - Math.pow(1 - t, 3)` at `:51`), `:179` (the bar's hand-typed
  `{ type: "spring", stiffness: 150, damping: 20, delay }`).
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `PollDisplay` (207 lines) is eager in `post-card`'s chunk, which sits in the first
  load of `/feed` and `/profile/[id]` (bundle-build: "post-card 50.7" KB on both), and there are 0
  polls on production (03). `CountUp` re-implements what `motion`'s `animate(from, to, { onUpdate })`
  does - the card already imports `animate` from `motion/react` (`post-card.tsx:45`) - and
  DESIGN-SYSTEM §7 says curves come from `motion.tsx` (`EASE_OUT_SMOOTH`, `SPRINGS`), not by hand.
  The same hand-rolled count-up and the same cubic exist in `src/components/support/costs-card.tsx:58-79`.
- **What to do**: `const PollDisplay = dynamic(() => import("./poll-display").then((m) => m.PollDisplay))`
  (SSR can stay on); replace `CountUp`'s loop with `animate(fromRef.current, value, { duration: 0.56,
  delay, ease: EASE_OUT_SMOOTH, onUpdate: (v) => setShown(Math.round(v)) })` and its stop in the
  cleanup; use a `SPRINGS` entry for the bar.
- **Saving**: an estimated ~3-4 KB raw off the first load of `/feed` and `/profile/[id]` (not
  measured), ~15 lines.
- **Risk & gate**: low. `npm run check`; vote on a demo-seeded poll (the demo has polls), switch
  the vote, watch the bars and numbers land together.
- **Confidence**: medium on the bytes; high on the rest.
- **Notes**: moot if the owner removes polls (03). The `costs-card.tsx` twin belongs to the support
  territory; see For other lenses.

### feed-posts-comments-14 - The composer re-writes `uploadOneImage`'s ceremony, and the reason the helper gives for that does not hold
- **Where**: `src/components/posts/use-composer-uploads.ts:141-180` (`uploadViaPresign` and
  `uploadOneFile`); `src/lib/upload-client.ts:103-139` (`uploadOneImage`), whose docblock defends the
  copy at `:114-119`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/jscpd.txt`: `use-composer-uploads.ts [154:50 - 164:45]` = `upload-client.ts
  [123:44 - 132:43]` (11 lines, 93 tokens); collection-media's report flagged the same pair for this
  territory. The docblock says the composer keeps its own copy because "it uploads a BATCH, it keeps
  the facts each response carries so its crop handle opens where the card draws, and it reports '3
  of 5'". The batch loop and the "3 of 5" live in `handleImageFiles` (`:182-241`) and would not
  move; the per-file function differs from `uploadOneImage` only in keeping the facts and in the
  wording of its error.
- **What to do**: have `uploadOneImage(file, subject)` return `{ url, facts }` (`factsByUrl(data.images)`
  on the direct path, `postImages`' `facts` on the fallback); single-picture callers destructure
  `url`. The composer calls it per file and `keep(facts)`. Delete `uploadViaPresign`,
  `uploadOneFile` and the defence paragraph; keep the composer's "3 of 5" loop.
- **Saving**: ~30 lines, 1 clone.
- **Risk & gate**: low. `upload-size-rule.test.mjs:32,45` lists the composer hook as a sending
  file and accepts `uploadOneImage` as its shrinking call (`SHRINKS`), and `:80-81` pins
  `uploadOneImage`'s own `downscaleImage`, so both stay green; `upload-shared.test.mjs`; by hand, attach three photographs,
  one over the direct-path limit, and check the crop handle opens on the machine's aim.
- **Confidence**: medium-high; the one visible change is the failure toast wording ("... failed to
  upload" becomes "... did not upload. Try again.").
- **Notes**: the other `uploadOneImage` caller, `catchups/home/picture-picker-dialog.tsx:151`, is
  the orphan `catchups-ui-01` wants mounted; it keeps working with a destructure.

### feed-posts-comments-15 - Take the composer out of `/feed`'s first load and preload it while the member reads
- **Where**: `src/components/posts/feed-column.tsx:5` (static `import { CreatePostForm }`),
  `:64-89` (rendered only while the dock is open); `src/components/posts/create-post-form.tsx:36-42`
  (the comment that keeps it static); `src/components/feed/new-post-dock.tsx:52-55` (`openComposer`);
  `src/components/feed/new-post-cta.tsx:26-50` (the badge).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: the dock starts shut (`new-post-dock.tsx:49`) and the composer mounts only when the
  badge is pressed, but its code is in `/feed`'s first-load JS: bundle-build measured "composer
  23.9" KB raw inside `/feed`'s 1,188 KB. The comment at `create-post-form.tsx:36-38` keeps it static
  because "deferring it would put a chunk fetch between the press and the first keystroke" - true of
  a bare `dynamic()`, not of a preload that has finished long before anyone presses.
- **What to do**: `const loadComposer = () => import("./create-post-form")`, a module-level promise
  started from `requestIdleCallback` (with a `setTimeout` fallback) once `FeedColumn` mounts, and
  also on the badge's `pointerenter`/`focus`/`pointerdown`; render through `dynamic(loadComposer)`;
  and make `openComposer` await the promise before `setOpen(true)` if it has not settled, so the
  shared-`layoutId` bird flight (badge -> `OwnBirdSlot`) always has its destination on the same
  commit. Rewrite the comment at `:36-42`.
- **Saving**: ~24 KB raw (~7 KB gz, estimated) out of `/feed`'s hydration path. Total transfer is
  unchanged (the chunk still loads, after idle); this is a time-to-interactive win, not a bytes win.
- **Risk & gate**: medium: the bird flight is an owner-approved interaction (`/lab/new-post`).
  Gate: a production build, DevTools "Slow 4G", press the badge within one second of the page
  loading, on desktop and on a phone: the bird must still fly and the caret must land in the editor;
  if it ever misses, revert. `npm run visual`.
- **Confidence**: medium; the win is modest and I would rank it below 01.
- **Notes**: the letters desk imports the composer statically and should keep doing so (the editor
  IS that page). The three pieces the composer already defers (poll creator, mention list, attach
  dialog, `:43-53`) keep their own preload at `:318-322`.

### feed-posts-comments-16 - About ninety comment lines describe code that was deleted or changed; delete or correct them
- **Where** (each verified against the code beside it and, where named, the commit that changed it):
  - `src/components/posts/comments-section.tsx:251-260` - "The move itself runs in an effect ... The
    scroll is skipped when the composer is already in view": no such scroll exists or ever shipped
    (`0f869b26`'s own message: scrolling to the composer "cannot be made to work"), and `:304-317`
    says "There is no scroll here".
  - `comments-section.tsx:531-549` - a stray "The measured content: divider, the thread, and the
    composer" (the divider was deleted in `97d9bb61`) followed by a second telling of the
    Reply-scroll "treadmill" already told at `:304-317`; `:550-558` says what `renderComposer` is.
  - `comments-section.tsx:442-444` - "Cleared on a timer rather than on the animation ending,
    because ... posting a reply moves the composer back to the foot": there is no timer
    (`setSent((n) => n + 1)` is a counter used as a key) and since `9ec2ea79` the reply box never moves.
  - `comments-section.tsx:699-704` - "pt-[21px] on the accordion ... 12 + 9 = 21": 21px was the
    deleted `look === "rule"` branch (`git show 0f869b26` shows it beside `pt-[28px]`); the code is
    `pt-[28px]` and `:709-720` explains 26 + 2.
  - `comments-section.tsx:215-219` - "Run as a layout effect so the browser never paints the
    intermediate height" above a `useEffect` (`git log -S'useLayoutEffect'` on the file: never). Either
    the comment or the hook is wrong; see For other lenses (bug).
  - `comments-section.tsx:1054-1057` - "The input stays a plain single-line field": it is the growing
    textarea since `0f869b26`.
  - `comments-section.tsx:134-135`, `:912-914` - "Feed/group cards", "Feed / groups", "(rows,
    divider, input)": no groups, no divider.
  - `src/components/posts/post-card.tsx:49-56` - "the comment thread (718 lines), the full-screen
    viewer (444) ... which five surfaces share": 1,156 and 1,113 lines today, and
    `lazy-image-viewer` has 15 importing files. Drop the numbers or date them.
  - `post-card.tsx:212-221` - "the feed, a group feed, the profile tabs, Saved".
  - `post-card.tsx:324-331` - "One like in flight at a time ... A ref rather than state": describes
    the in-flight guard that `lib/toggle-queue.ts` replaced (its own header, `:4-14`, "WHAT THIS
    REPLACED"); the next two lines are the `useHeartToggle` calls.
  - `post-card.tsx:647-648` ("Only when the row is the card's last child", made unconditional by
    `bee6f8cd`) and `:669-671` ("(see `pt-[21px]` there), so the divider ...": 28px, no divider).
  - `src/components/posts/create-post-form.tsx:853-860` - "The icon cluster wears self-end
    -mb-[9px] -ml-[9px] ... self-end, not items-center": superseded on 2026-08-02 (`c2a7e511`), whose
    own paragraph at `:868-880` says the old approach was replaced; the code is `-ml-[9px] flex
    items-center`.
  - `create-post-form.tsx:622-629` with the `peer` class at `:645` and `group ... rounded-[var(--radius-input)]`
    on the wrapper at `:630` - "The field, with ONE clean focus ring overlay ... Wrapper, field and
    ring overlay share the value": the overlay (`peer-focus:opacity-100`) was deleted on 2026-08-29
    (`d9b7d3f9`); no `peer-*` or `group-*` consumer remains. Keep `relative` (the mention list is
    positioned against it).
  - `create-post-form.tsx:1249-1251` ("they skip the pill + height machinery") and `:601-602`
    ("Shared by the collapsible feed composer"): the pill went on 2026-09-14 (`d632b8f3`).
  - `src/app/(main)/feed/actions.ts:938-944` - adminRemoveComment calls deleteComment "an author's
    or admin's hard delete, already wired to nothing in the UI": it is soft (its own docblock,
    `:907-914`) and wired (the comment's menu -> Delete -> ConfirmDialog -> `actions.remove`).
  - `src/app/(main)/notifications/actions.ts:8-13` - "Keyset on the row id ... resolved by Prisma":
    the function is a value keyset (`d6c61dd4`), as its inline comment `:25-30` says.
  - `src/lib/post-caps.ts:9-15` - "docs/spec/letters.md:253" (that file has 183 lines since
    2026-09-08) and "the composer nudges toward a Letter at 600 characters" (300 WORDS since
    2026-09-17, `LETTER_MIN_WORDS`, `utils.ts:528`).
  - `src/components/posts/poll-display.tsx:41-42` - "first mount, where shown was seeded to value":
    it is seeded to 0 (`:34`).
  - `src/components/posts/poll-creator.tsx:14` - "relabels itself to 'Ask a question'": the
    placeholder is "Ask your question" (`create-post-form.tsx:224`).
  - `src/components/feed/rail/pulse-module.tsx:18` ("main feed + groups"); `collection-module.tsx:39-41`
    ("it currently has none" - `Photo` holds 1,960 live rows) and `:29-35` ("24 is more than the
    whole approved archive today").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each item above names the line that contradicts it. The brief's standard (from
  audits 1 and 2): a comment that carries a reason, a measured number, an owner quote or an audit id
  stays; one that describes deleted code goes. Keep example: `comments-section.tsx:1060-1073`
  ("-mt-1.5 (rejected, "cramped") measured ~3.5px of true gap ...") - measured, owner verdicts, still
  true. Cut example: `comments-section.tsx:442-444`, quoted above - it describes a timer that does
  not exist.
- **What to do**: delete the blocks that only describe removed code (251-260, 531-549 keeping the
  `:550-558` docblock, 442-444, 622-629 with `peer`/`group`, 853-860, 1249-1251's clause); correct
  the numbers and words in the rest (699-704 to 28px or fold into 709-720; 215-219 once the bug lens
  decides the hook; post-card 49-56, 647-648, 669-671; post-caps 9-15; poll-display 41-42; poll-creator
  14; notifications 8-13; actions 938-944; the four "group" mentions; collection-module 29-41).
- **Saving**: ~80 lines deleted, ~20 rewritten; two dead classes.
- **Risk & gate**: low. `npm run check` (several tests `decomment` source before matching, so
  comments are invisible to them; `notification-reach.test.mjs:58-70` pins a comment's wording, but in
  `notification-links.ts` - not touched here).
- **Confidence**: high, item by item.
- **Notes**: the cheapest lever in this report and never the headline, but four of these would send
  a future session the wrong way (the "layout effect", the 21px, the scroll that never shipped, the
  600 characters).

### feed-posts-comments-17 - One `LetterEyebrow` and one "city only" chip instead of three and two hand-written copies, with the middle dot the design system requires
- **Where**: eyebrow ("Feather · Letter · N min read"): `src/components/posts/post-card.tsx:477-481`
  (Phosphor `Feather size={13} weight="fill"`), `src/app/(main)/letters/(index)/page.tsx:185-188`
  and `src/app/(main)/letters/[id]/(read)/page.tsx:176-180` (lucide `Feather h-3.5 w-3.5`); chip
  ("MapPin X only"): `post-card.tsx:464-469`, `letters/(index)/page.tsx:189-194`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: all three eyebrows hand-type `· {minutes} min read`; DESIGN-SYSTEM §5: "Never
  hand-write ` · ` in a template string: use `metaLine()` ... or `<MetaDots>`". The feed card's
  feather is a different icon set and weight from the two letter pages' - the kind of drift a
  shared component prevents.
- **What to do**: `src/components/letters/letter-eyebrow.tsx` exporting `<LetterEyebrow minutes>`
  (MetaDots inside) and `<CityOnlyChip city>`; use them at the five sites; pick one feather (the
  card is the one members see most).
- **Saving**: ~12 lines, 5 copies -> 2 definitions, one design-rule violation gone.
- **Risk & gate**: low; the icon unification is a one-pixel visible change on one of the three
  surfaces. `npm run visual` (`/feed`, `/letters`), a screenshot of `/letters/[id]`.
- **Confidence**: high.
- **Notes**: the composer's own audience chip (`create-post-form.tsx:1125-1134`) is a button that
  reopens the menu; share the classes only if 07 does not replace it.

### feed-posts-comments-18 - Fold the comment section's internal repeats and use `<Button>` for its send control
- **Where**: `src/components/posts/comments-section.tsx`: the skeleton row twice (`:729-738`,
  `:865-871`); the row variants twice (`:784-787`, `:818-821`); the `<CommentItem ...>` call twice
  with nine props (`:792-803`, `:823-847`); `mergeComments` (`:343-347`), a `useCallback` around one
  setter call used at `:394` and `:432`; the send control `:612-641` (a hand-rolled canopy circle
  on `SpringPress` with a `{...({...} as object)}` spread, `type-sludge.txt:92`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the repeats are side by side in one file; `Button` has `variant="primary"` (canopy)
  and `size="icon-sm"` (36px) (`ui/button.tsx:114-134`), which is this control; the comment at
  `:613-615` says it was hand-rolled and "had no hover at all before" - Button carries hover,
  focus-visible and press.
- **What to do**: a `CommentRowSkeleton({ second })`; a module constant `ROW_RISE` for the variants;
  a local `renderRow(c, nested)`; inline `setComments((prev) => appendUnseen(prev, …))` at the two
  sites and drop `mergeComments` from the observer effect's dependencies; `<Button variant="primary"
  size="icon-sm" type="submit" aria-label=… disabled=…>` around the arrow's clipping span.
- **Saving**: ~35 lines, one `as object` spread, one `useCallback`.
- **Risk & gate**: low; visible deltas on the send button: disabled opacity .40 -> .50 and Button's
  CSS press instead of SpringPress's spring. `append-page.test.mjs:90-104` pins `appendUnseen(` in
  this file (still there); `feed-write-rule.test.mjs:190-193` pins the reply target literal
  `id: reply.id,\n name: reply.author!.name,` - keep that text if the call is folded;
  `e2e/comments-close.spec.ts`; `npm run visual`.
- **Confidence**: high.
- **Notes**: the comment toggle this panel opens is written twice across territories (post card and
  the Catch-up reader); see For other lenses.

### feed-posts-comments-19 - The comment section re-declares the serializer's type by hand
- **Where**: `src/components/posts/comments-section.tsx:30-53` (`CommentAuthor`, `CommentData`);
  `src/lib/comment-thread.ts:62-93` (`CommentRow`, `serializeComment`, `export type SerializedComment`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-plus-lab.txt:230` lists `SerializedComment` as an unused exported
  type: the server exports the shape and the client, instead of using it, writes 24 lines that
  restate it.
- **What to do**: move the serialized shape into an import-free types module (for example
  `src/lib/comment-types.ts`) that both `comment-thread.ts` and the client import - a type-only
  import from `comment-thread.ts` itself would be erased, but it carries `import "server-only"` and
  nothing in this repo type-imports a server-only module from a client file today, so do not set
  the precedent here.
- **Saving**: ~20 lines, one knip line.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.
- **Notes**: `PostData` (`post-card.tsx:126-162`) looks like the same case and is not: four lab rooms
  build mock posts against it (`lab/comments/_room.tsx`, `lab/new-post/_room.tsx`,
  `lab/profiles/_variant-letterhead-2.tsx`, `-3.tsx`), and TypeScript already checks it against
  `serializePost` where `post-feed.tsx` stores the page. Leave it.

### feed-posts-comments-20 - The rail: one week helper instead of two constants and two lint disables; share the card shell with its skeleton
- **Where**: `src/components/feed/rail/letters-module.tsx:1-4` (`eslint-disable react-hooks/purity`),
  `:14` (`WEEK_MS`), `:38`; `pulse-module.tsx:1-3`, `:9`, `:28`; `rail-card.tsx:13,16,21-24`
  (the shell class and a `className` prop no caller passes); `rail-skeleton.tsx:47-56`
  (`RailCardSkeleton` repeats the shell string).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: two identical `const WEEK_MS = 7 * 24 * 60 * 60 * 1000;` and two file-wide purity
  disables whose only purpose is `Date.now()` inside an async server component; the four modules
  call `<RailCard label=…>` without `className` (grep); the lab's feed-canvas has its own local
  `RailCard`.
- **What to do**: a `weekAgo()` in a lib module (the purity rule inspects component bodies, not a
  helper's), used by both modules, and the two disables go; export the shell string from
  `rail-card.tsx` (or let `RailCard` take a `label: ReactNode` so the skeleton renders it with a
  bar); drop the unused `className`.
- **Saving**: ~12 lines, 2 lint disables (`type-sludge.txt:75-76`).
- **Risk & gate**: low. `npm run check` (lint); `composer-rule.test.mjs:118-133` reads the letters
  module for `cityScopeWhere` and `batchScopeWhere(viewer.batch)` - untouched.
- **Confidence**: high.
- **Notes**: DESIGN-SYSTEM §9 still says the rail-card kit is "still missing"; it exists (docs lens).

### feed-posts-comments-21 - Notifications: count unread through the cached helper, and fix the docblock that describes the old cursor
- **Where**: `src/app/(main)/notifications/actions.ts:53` (`prisma.notification.count({ where: { userId,
  read: false } })`), `:74-78` (the sibling that calls `unreadNotificationCount`), `:8-13` (docblock);
  `src/lib/notification-count.ts:14-18`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: two spellings of "unread" in one file, one of them the named helper the layout and
  the page share.
- **What to do**: `const unreadCount = await unreadNotificationCount(userId);` and the docblock rewritten
  to say value keyset (see 16).
- **Saving**: 0 queries (a server action does not share React's cache), 0 lines; one definition of
  "unread".
- **Risk & gate**: low. `npm run check`; open the bell.
- **Confidence**: high.
- **Notes**: the count itself is the retention-bounded, indexed query (`Notification_userId_read_idx`,
  92,742 scans); nothing to tune.

### feed-posts-comments-22 - Drop the pass-through arrows in the two comment-action bundles
- **Where**: `src/components/posts/feed-comment-actions.ts:25` (`load: (targetId, opts) => loadComments(targetId, opts)`);
  `src/components/catchups/edition/entry-comment-actions.ts:27-28` (`load` and `create` arrows).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the signatures match `CommentActions` exactly (`loadEntryComments(entryId, opts?)`,
  `createEntryComment(entryId, content, parentId?)`, `catchups/actions.ts:2108-2134`); `remove`,
  `toggleLike` and `adminRemove` are already passed bare in both files.
- **What to do**: `load: loadComments`, `load: loadEntryComments`, `create: createEntryComment`.
  With 04 the feed's `create` becomes `createComment` too and `feed-comment-actions.ts:1-13`'s
  FormData explanation goes, leaving two six-line objects.
- **Saving**: 3 lines now, ~15 with 04.
- **Risk & gate**: low. `npm run check`; post a comment on a post, a letter and a Catch-up answer.
- **Confidence**: high.
- **Notes**: keep the two files (each bundle has two consumers); merging them is the not-finding
  below.

### feed-posts-comments-23 - Move `use-engagement.ts` to `components/common/`: it is every heart's hook, not the post card's
- **Where**: `src/components/posts/use-engagement.ts`; importers `post-card.tsx:17`,
  `comments-section.tsx:25`, `letters/letter-engagement.tsx:5`,
  `catchups/edition/entry-love-button.tsx:14`, `collection/collection-client.tsx:40`; pin
  `src/lib/heart.test.mjs:66-67` (reads the hook by path).
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: its own header says it serves "the feed card, the letter page and a comment row", and
  its body says five hearts including the Collection's and the Catch-up answer's
  (`use-engagement.ts:15-19,38-44`); `LoveButton`, the component it drives, already lives in
  `components/common/`.
- **What to do**: `git mv` to `src/components/common/use-engagement.ts`, update the five imports and
  `heart.test.mjs:66-67`.
- **Saving**: 0 lines; the next person looking for the heart's logic finds it beside the heart.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.
- **Notes**: `heart.test.mjs:40-41` reads `post-card.tsx` and `comments-section.tsx` by path too;
  those files do not move.

### feed-posts-comments-24 - The small leftovers: an unreachable guard, two intermediates, two defensive try/catches, a redundant re-check
- **Where** and what:
  - `src/components/posts/report-dialog.tsx:65-69` - `if (!reason) { toast.error("Please select a
    reason"); return; }` cannot run: Submit is `disabled={!reason || submitting}` (`:136`).
  - `src/components/posts/report-action.ts:261`, `:320` - `const thread = filed;` (use `filed.id`);
    `:322-333` two consecutive comments that both say standing changes only by an admin's hand.
  - `src/components/posts/use-letter-persistence.ts:232-235` - `const restore = onRestore;` and its
    comment; `:54-56` `dropLocalDraft`, a one-line wrapper over `safeRemove` with two callers.
  - `src/components/posts/mention-dropdown.tsx:35,43` - `debounceRef`: the effect's cleanup already
    clears the timer, so a local `const t = setTimeout(...)` / `clearTimeout(t)` does the same.
  - `src/app/(main)/image-aim.ts:61-74` - `update` in a blanket try/catch to absorb P2025; `updateMany`
    plus a count check is the idiom `notifications/actions.ts:84-95` argues for, and it stops
    swallowing connection errors under a "could not be re-aimed" message.
  - `src/lib/rich-text-editing.ts:102-110`, `:120-124` - try/catch around `document.execCommand`,
    which returns false rather than throwing in the browsers this app supports.
  - `src/components/posts/post-card.tsx:320-322` - `plainExcerpt` and `readMinutes` run for every
    card on every render; only the letter branch reads them.
  - `src/app/(main)/feed/actions.ts:214-215` - `parsed.data.pollOptions.length >= 2` re-checks the
    schema's `.min(2)` (`validators.ts:235`). Only this re-check is redundant: the pre-parse filter at
    `:155-168` is deliberate (audit 2 refuted removing it, `feed-posts-07`).
  - `src/lib/comment-thread.ts:158` - `select: { ...AUTHOR_CARD_SELECT }` where the other two sites
    pass the constant.
  - `src/app/(main)/feed/actions.ts:115-117` (three blank lines), `src/app/(main)/feed/page.tsx:81`
    (misindented `guide="feed"`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: as listed; each is one screen of code with its contradiction beside it.
- **What to do**: as listed.
- **Saving**: ~35 lines.
- **Risk & gate**: low. `npm run check`; report a post; aim a photograph in the composer.
- **Confidence**: high, except the execCommand pair (medium: keep them if the owner's members use
  anything exotic).
- **Notes**: the three hook files carry `"use client"` (`use-engagement.ts`, `use-composer-uploads.ts`,
  `use-letter-persistence.ts`); harmless and not worth a change (no bytes move; bundle-build agrees).

## Owner decisions

**A. Letting a post be seen only by certain school years**
- *What I'd change*: the site contains all the machinery for "only these years can see this post",
  but there is no button anywhere that lets a member use it, and there never has been. The help
  guide nevertheless tells members "you can narrow it by batch". I would remove the unused machinery
  and correct the guide to describe what does exist: limiting a post to one of your cities.
- *What you'd notice*: nothing in how posting works. The guide's "Who sees it" section would stop
  promising a choice nobody can find, and the feed would load a touch less.
- *If I guess wrong*: if you wanted year-only posts, we would add the button instead, and the
  machinery is in the history to bring back. Year groups already have their own batch Catch-ups.
- *Options*: (1) remove it and fix the guide; (2) build the missing "these years only" choice next to
  the city choice; (3) leave the machinery switched off and only fix the guide.
- *Answer to take if you don't reply*: (1), but only after a database check confirms no existing post
  uses it; the guide gets fixed either way. [feed-posts-comments-02]

**B. Polls on posts**
- *What I'd change*: polls have been available since March and there is not a single poll on the
  live site (the few ever made were deleted). They do appear in the public demo's sample posts. I
  would keep them but stop every feed visit from loading the poll code when no post on screen has
  a poll.
- *What you'd notice*: nothing, if kept. If you chose removal instead: "Add a poll" leaves the
  composer's "+" menu, the demo's sample polls go, and the admin "Poll votes cast" number goes.
- *If I guess wrong*: removal would take away something members might have started using;
  bringing it back means restoring it from history.
- *Options*: (1) keep polls, lighter; (2) remove polls entirely.
- *Answer to take if you don't reply*: (1). [feed-posts-comments-03, -13]

**C. The "+" menu in the post composer**
- *What I'd change*: the small "+" menu in the post composer (add a poll, write as a letter, add to
  the Collection, show to) is the only menu on the site built by hand instead of using the site's one
  standard menu; the list of people that appears when you type "@" is the same. I would switch both
  to the standard one.
- *What you'd notice*: the menu would look and move like every other menu on the site (white panel,
  slightly tighter corners, the shared shadow and pop), arrow keys would work in it, and the "Show
  to" cities would become a short list with a tick instead of small rounded chips side by side.
- *If I guess wrong*: if you like the chips, the city picker gets plainer; they could stay as a
  one-off exception.
- *Options*: (1) switch the menu and the "@" list to the standard menu; (2) switch them but keep the
  city chips as an exception; (3) leave them as they are.
- *Answer to take if you don't reply*: (1). [feed-posts-comments-07; relates to parked audit-2 G11]

## Not-findings
- **The two comment-action files (lead: "one module with a `target`?")**: they are that module's
  seam already. The paging, stubs, double-submit guard and serializer are one target-parameterised
  implementation in `lib/comment-thread.ts`, whose header (`:14-21`) says why the gate and the bell
  stay with each owner: one module holding both features' gates would be "deciding access for a
  feature it cannot see". The two adapters are 36 and 32 lines, mostly comment; merging them would
  put the feed's and the Catch-ups' actions into one client module imported by both surfaces. Only
  the pass-through arrows and the FormData shim are waste (22, 04).
- **The heart (lead: "a LoveButton path and a separate heart path?")**: one path. `LoveButton`
  (common) draws it and `useHeartToggle` -> `createToggleQueue` drives it for all five hearts (post,
  comment, letter, Catch-up answer, Collection photo); `heart.test.mjs:53-71` pins that every one of
  them goes through the hook and the hook through the queue.
- **"The second comment look" (lead)**: gone. `97d9bb61` deleted the `look` prop and every branch
  behind it; `grep -n 'look ===\|"rule"\|"space"'` on the file and on `post-card.tsx` finds nothing.
  What survives is one comment still quoting the deleted look's 21px (16).
- **The composer pill (lead)**: gone since `d632b8f3`; what survives is naming (`collapse`,
  `collapsedPlaceholder`, 09), two comments (16), the RichTextArea docblock (06), DESIGN-SYSTEM §2's
  mention and four stale QA probes (For other lenses). No `create-post-form` variants exist: two callers,
  one component.
- **`Like` seq_scan 30,802 on 75 rows (lead)**: the planner's choice for a table that fits in a page
  or two; the indexes are used when they win (`Like_postId_idx` 2,737 scans, `Like_userId_postId_key`
  1,889). The same holds for `Comment` (28 rows) and `Bookmark` (4). The scans come from `postInclude`'s
  `_count.likes` and viewer-`likes` on every feed page and from `toggleLike`'s delete-first. No index
  work is warranted at this size.
- **"`Post` SELECT has at least three statement shapes" (lead)**: one `postInclude` under different
  WHERE combinations (admin or member, search on or off, first page or keyset page: `$6` to `$14`
  parameters) plus two historical shapes that select the since-dropped `groupId` (#47) and `tag` (#82);
  `pg_stat_statements` has not been reset since 2026-05-22. #84 (2,263 calls, 2,262 rows) is the
  letter page's single-row `loadLetter`.
- **`link-preview-core.ts` + `link-preview.ts`, 934 lines (lead: "earned?")**: earned. It is a
  server fetching URLs members typed, so it carries the full SSRF defence (connect-time DNS check
  against every address, manual redirects with the check per hop, decompressed-byte caps, content-type
  allow-lists), re-hosts preview images for the CSP and for readers' privacy, and fails soft. Its
  comment density is security reasoning. I weighed a library: `request-filtering-agent` or
  `ssrf-req-filter` would replace ~60-80 lines of `guardedLookup` and address parsing at the price of
  a dependency on a security path already held by 250 lines of tests; Node's `net.BlockList` does not
  cover the mapped / NAT64 / 6to4 embedding rules (`link-preview-core.ts:300-308`). Rejected. The one
  structural item is 12; the export trims are `fresh-code-12`.
- **`comment-thread.ts`, `toggle-queue.ts`, `rich-text.ts`, `rich-text-editing.ts`, `posts.ts`,
  `post-notifications.ts`, `normalize.ts`**: clean. Each consolidates a rule that used to be written
  twice or more and says which audit found it.
- **`feed/actions.ts`'s jscpd clones** (`raw/jscpd.txt` lines 132-237, eleven pairs within the file
  and with the Catch-ups and Collection actions): all are the `auth()` -> `requireVerifiedMember()`
  -> `canViewPost()` preamble, which is the C-189 contract `gate-coverage.test.mjs` reads; the wrapper
  was refuted twice (brief §4).
- **`post-visibility-rule.ts:111-120` = `photo-visibility-rule.ts:96-105`** (jscpd): two token-list
  parsers in two security rule files that must have no imports at all (each file's header says so);
  a shared helper would need one. Keep. If 02 removes `parseBatchTargets`, the pair disappears.
- **`post-feed.tsx:238-258` = `profile-author-feed.tsx:118-132`** (jscpd): the load-more handler;
  audit 2 refuted a shared paged-list hook.
- **One composer for posts and letters**: letters.md §2.1 requires it; 09 merges branches inside it
  and does not split it.
- **`report-action.ts` as a `"use server"` file under `components/posts/`, hosting `reportUser`**:
  audit 2 refuted the move (`feed-posts-14(b)`).
- **createPost's pre-parse poll filter (`actions.ts:155-168`)**: deliberate (audit 2, `feed-posts-07`).
- **`PostCard`'s `demo` prop**: lab-only by design; four rooms use it and its docblock defends it.
- **The measured comments** (`comments-section.tsx:1022-1027`, `:1060-1073`, `post-card.tsx:640-662`,
  `create-post-form.tsx:1145-1149`): measured numbers and owner verdicts, still true. Not bloat by the
  standard audits 1 and 2 set.
- **`"use client"`**: all 15 client files in the territory need the boundary at file level (state,
  effects, handlers) or are hooks only client code imports; `post-card-skeleton.tsx`, `feed-rail.tsx`
  and the rail modules are already server components. No boundary move saves a byte.
- **`feed-column.tsx:90-107`** (the feed kept outside `AnimatePresence`): load-bearing; its comment
  records the owner bug of 2026-09-17 it fixed.
- **`NewPostDock`'s `useCallback`/`useMemo`**: they keep a context value stable; legitimate.
- **`deletePostWithImages`, `clearPostNotifications`, the M66 version guard, the double-submit
  twins**: each pinned (C-018, C-054, M66, M35/C-009) and each argued in place.

## Audit carry-overs in this territory
- **Audit 2 G11 (`feed-posts-15`, extract the composer's "+" menu and attachment strip)**: parked by
  the owner (Q27), recorded as `docs/planning/FEATURES.md` item 3; still accurate (both regions are
  still inline in `editorBody`). 07 is a different lever and goes to him as decision C.
- **D1 (`feed-posts-01` = `dead-code-02`, the unreachable sort and time filters)**: done, `c4bf886c`
  (2026-09-07). Residue: the `offset:` guard and a stale cursor comment (11).
- **B11 (`feed-posts-03`, latch and defer ReportDialog)**: done (`post-card.tsx:198-206`, `:729-739`).
- **B13 (`directory-profile-14`, seed the profile's first page)**: done; 01 applies the same shape to
  `/feed`.
- **C7 (revalidatePath removals)**: done (`actions.ts:763-779`, `notifications/actions.ts:97-101`).
- **E11's feed half (`feed-posts-04` the M33 rule, `-05` the comment payload)**: done
  (`lib/post-notifications.ts`; `serializeComment` defined once, pinned at `feed-write-rule.test.mjs:234-275`).
- **C9 (`feed-posts-17.13`, avatar selects)**: done (`AUTHOR_CARD_SELECT`).
- **`feed-posts-12` (the feed skeleton drew a deleted composer card)**: done (the 2026-09-21 loading
  pass, `feed/loading.tsx:6-22`).
- **`feed-posts-02` (split the composer)**: done (`use-composer-uploads.ts`, `use-letter-persistence.ts`).
- **D11's composer half (the `placeholder` prop, `ComposerScope`, `SCOPE_PLACEHOLDER`)**: done.
- **`feed-posts-07` and `feed-posts-14(b)`**: refuted then; still refuted now.

## For other lenses
- **letters**: `letters/[id]/(read)/page.tsx:27-47,67,113` reads the same Post row twice per view
  (`loadLetter`'s include and `canViewPost`'s guard select; statement #84, 2,263 calls). A
  `canViewPost` variant that takes the already-loaded row (keeping `await canViewPost(` for
  `post-visibility-rule.test.mjs:325-351`) would save a query per letter view; 05 already adds the
  missing fields to the guard. `letter-engagement.tsx:70-82` repeats the post card's action row.
- **catchups-ui (T02)**: `reader-parts.tsx:531-568` (`Reactions`) repeats `post-card.tsx:677-717`'s
  comment toggle line for line (`m.button`, `ChatCircle`, count, preload on pointerenter/focus,
  `AnimatePresence` + `CommentsSection`); one shared `CommentsToggle` would serve both.
- **lab-catchups**: `src/app/lab/catchups/sketches/_media.ts:62` re-implements `findLinks`.
- **common-primitives**: `rich-text-area.tsx:4-7` names fork reasons that no longer exist (06);
  `SpringPress`'s typing forces `{...({...} as object)}` at `create-post-form.tsx:910-919,938-944` and
  `comments-section.tsx:617-621` (`type-sludge.txt:90-92`; collection-media reported the same);
  two hand-rolled rAF count-ups with the same cubic ease (`posts/poll-display.tsx:30-66`,
  `support/costs-card.tsx:58-79`) that motion's `animate()` replaces.
- **directory-profile**: `/profile/[id]` counts a member's posts and letters with two COUNT queries
  (statements #42 and #44, 17,445 and 17,444 calls); one `groupBy` on `kind` answers both.
- **docs**: DESIGN-SYSTEM §9 says the rail-card kit "is still missing" (it exists,
  `feed/rail/rail-card.tsx`); §2's Secondary row cites "the composer's trigger pill" (deleted
  2026-09-14); letters.md §5.3 says `Post.groupId` "still exists" (`raw/db-columns-live.json` shows no
  such column); letters.md §6 lists "Letter audience (cross-batch) | existing `targetBatches` field"
  as if reachable (02); `src/lib/validators.ts:214-215` says "The Post.tag column survives" (gone from
  the schema and the live table).
- **scripts**: `scripts/qa/hover-probe.mjs:66-69`'s first target is the deleted composer pill
  (`button[class*="rounded-full"][class*="h-11"]`) and reports SKIP forever; `scripts/qa/drive.mjs:366`
  opens the composer by clicking `/share a memory/i` (the pill's text), `:367` selects
  `input[placeholder^="Write a comment"]` (the comment box is a textarea since 2026-09-16), and the
  poll scenario `:643-665` expects an editor on `/feed` at rest and clicks "Poll" (the item reads
  "Add a poll").
- **guide**: `components/guide/chapters/feed.tsx:26-43` promises batch narrowing and never mentions
  city narrowing (02).
- **data-layer**: `PollVote_pollOptionId_idx` has 0 scans (0 polls); `Comment_postId_isHidden_idx`
  (112 scans) shares its leading column with `Comment_postId_createdAt_idx` (1,096) - check whether
  anything needs `(postId, isHidden)`; `PollOption` has no index on `postId` although every feed page
  joins it (irrelevant at 0 rows; relevant if polls grow).
- **bug audit (not simplification, noticed)**: `comments-section.tsx:215-230` grows the textarea in a
  `useEffect` while its comment promises a layout effect, so one frame at the stale height can paint;
  `post-feed.tsx:59-66` ignores `initialSearch` becoming undefined, so a search survives navigating to
  `/feed` from the sidebar; `feed/rail/pulse-module.tsx:24-31` counts blocked members' posts (no
  `AUTHOR_IN_GOOD_STANDING`), aggregate only.
- **lib-tests (T14)**: `rich-truncate.test.mjs` is named for a file deleted on 2026-09-12 (its header
  says the name stays because audit documents cite it); `heart.test.mjs:66-67` reads
  `components/posts/use-engagement.ts` by path (23 moves it).

## Metrics
- Territory: 44 source files, 10,600 lines (cloc: 6,302 code, 3,593 comment, 705 blank; comment/code
  0.57). All 44 read in full. Tests read in full or in the part a proposal touches: ~1,400 lines.
  Outside files read to judge the territory: ~1,000 lines. Specs: ~900 lines.
- Biggest files: `feed/actions.ts` 1,315; `create-post-form.tsx` 1,308; `comments-section.tsx` 1,156;
  `post-card.tsx` 772; `link-preview-core.ts` 518; `use-letter-persistence.ts` 468; `link-preview.ts` 416.
- Comment-heaviest (cloc comment/code): `post-caps.ts` 21/5; `posts.ts` 89/30; `post-notifications.ts`
  56/30; `image-aim.ts` 60/40; `rich-text.ts` 85/73; `post-visibility-rule.ts` 111/98;
  `collection-module.tsx` 58/58; `use-letter-persistence.ts` 191/244; `use-composer-uploads.ts`
  111/146; `comments-section.tsx` 450/660; `feed/actions.ts` 449/737; `create-post-form.tsx` 425/840.
- `"use client"` files: 15 of 26 component files (13 in `posts/`, 2 in `feed/`).
- Live tables (`raw/db-tables-live.json`): Post 25 rows, Comment 28, Like 75, CommentLike 13,
  Bookmark 4, Report 4, Notification 430, LinkPreview 7, PollOption 0, PollVote 0.
- jscpd clones touching the territory: 11 involving `feed/actions.ts` (all the C-189 preamble) and 5
  others (`use-composer-uploads` = `upload-client`, `post-feed` = `profile-author-feed`,
  `post-visibility-rule` = `photo-visibility-rule`, `post-card` = `letter-menu` dynamic imports,
  `feed-column` = the lab's new-post room).
- Per-visit request cost of `/feed` today: the page render plus 2 server-action POSTs (`loadPosts`,
  `markFeedSeen`); after 01, the page render alone.
- Findings: 24. By tier: T1 8 (08, 10, 11, 16, 20, 21, 22, 24), T2 9 (05, 09, 12, 13, 14, 17, 18, 19,
  23), T3 5 (01, 04, 06, 07, 15), T4 2 (02, 03). By class: structural 17, cheap 7 (16, 18, 19, 20,
  21, 22, 24). Decides: owner 3 (02, 03, 07), autonomous 21.
- Estimated savings if every autonomous finding lands: ~400 lines (~80 of them comments that
  describe deleted code); -2 POSTs and -3 queries per `/feed` visit; -1 query per like, comment and
  report; ~24 KB raw off `/feed`'s hydration path and a few KB off the Catch-up reader; 2 lint
  disables, 1 `as object` spread and 1 clone gone. With the owner's yes on 02 and 03: a further ~850
  lines, 1 column, 2 tables, 4 indexes, and a LIKE arm plus two relation joins off every feed page
  query; decision C adds ~40 lines and a second spread.
