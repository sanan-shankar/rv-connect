# feed-posts - refactor audit 2 report

Territory reader for the feed, posts, comments, polls, mentions, notifications, the composer and
the three upload routes: `src/app/(main)/feed/**`, `src/app/(main)/notifications/**`,
`src/app/api/upload/**`, `src/components/feed/**` (incl. `rail/`), `src/components/posts/**`
(14 files), 23 named `src/lib/*` modules and the 16 `.test.mjs` files that pin them. Charter:
map `feed/actions.ts` by responsibility, count the action preamble and say whether it has
drifted (the action-gate wrapper is refuted and is not re-proposed), check the ROADMAP's one
Composer / one Feed / one PostCard against the letters desk and the Catch-up composers, decide
which of the three upload paths is live, and answer whether keyset, post-visibility, the
notification path and the rich-text pipeline exist once. Date: 2026-09-03. Files in territory:
49 source + 16 tests = 65; read fully: 65.

## Coverage

- Read fully: `src/app/(main)/feed/{actions,page,loading}.tsx|ts` (3), `src/app/(main)/notifications/actions.ts`
  (1), `src/app/api/upload/{route,presign/route,finalize/route}.ts` (3), all 8 files in
  `src/components/feed/` and `rail/`, all 14 in `src/components/posts/`, and the 23 lib files
  named in the charter (`heart`, `keyset`, `append-page`, `draft-rule`, `draft-images`,
  `content-view`, `post-visibility`, `post-visibility-rule`, `post-caps`, `post-notifications`,
  `posts`, `city-scope`, `rich-text-editing`, `rich-truncate`, `rich-text`, `upload-client`,
  `upload-ownership`, `upload-ownership-rule`, `upload-shared`, `notification-links`) plus
  `src/lib/api-gate.ts` (the upload door the routes call).
- Tests read in full: `heart`, `keyset`, `append-page`, `draft-rule`, `post-caps`,
  `rich-text-editing`, `rich-text`, `rich-truncate`, `upload-ownership-rule`, `upload-shared`,
  `upload-size-rule`, `notification-links`, `notification-reach`, `feed-write-rule`,
  `composer-rule` (`.test.mjs`); `post-visibility-rule.test.mjs` header + every test name;
  the `feed/actions.ts` block of `gate-coverage.test.mjs`; the lines of `security-regressions`,
  `image-purge-rule`, `image-facts`, `unattended-rule`, `catchup-lifecycle`,
  `profile-editor-rule` that read files in this territory (by grep, to know which pin moves
  with which finding).
- Boundary evidence (not my territory, read to answer the charter): `components/letters/letter-desk.tsx`,
  `letter-engagement.tsx`, `components/profile/profile-author-feed.tsx`, `saved-posts-feed.tsx`,
  `components/layout/notification-bell.tsx` (the bell, which the charter names),
  `components/common/rich-text-area.tsx`, `app/(main)/layout.tsx:30-70`, the post queries in
  `letters/(index)/page.tsx`, `letters/[id]/(read)/page.tsx`, `profile/[id]/page.tsx`,
  `app/(main)/image-aim.ts` (head), `lib/image-record.ts` (`withPhotoFacts`), the upload
  call sites in `messages/message-composer.tsx`, `catchups/answer/photo-attachments.tsx`,
  `collection/contribute-room.tsx`, and `catchups/answer/answer-card.tsx`'s editor import.
- Specs read: `docs/ROADMAP.md` (Composer/Feed/PostCard lines, phases 3/4/7/8), `docs/spec/media.md`
  in full, `docs/spec/letters.md` sections 0-2.6, the audit-1 feed-posts report in full, and
  the fix-prompt's session 4, 5, 6 and 10 logs plus the close-out verdict.
- Skimmed: `docs/planning/FEATURES.md` and `bugs.md` (grep for feed/poll/upload/notification).
- Not read: nothing in the territory.
- Uncommitted edits seen: none in the territory. `git status --short` over every path above
  is clean; the one modified file in the tree (`src/components/common/image-viewer.tsx`) is
  media-viewer's and was not opened beyond its import surface.

## Summary

Audit 1 did most of what a line count could do here: the composer is split (1,287 + 468 +
308), `loadPosts`/`loadSavedPosts` share one include and one serializer, every heart goes
through `useHeartToggle`, `appendUnseen` is adopted, the three upload routes share
`vetUploadRequest` + `toDisplayWebp`, and the four behind-interaction pieces of the card are
dynamic imports (/feed 1,530 KB -> 1,225 KB first load). `feed/actions.ts` is still 1,550 lines
(927 code / 484 comment) and the honest answer to "what comes out first" is not a file split:
**about 100 of its lines and ~65 of `post-feed.tsx`'s serve a sort/time-filter UI that has been
switched off since 2026-06-28** (`feed/page.tsx:85` passes `showControls={false}` and is the
only caller), which drags the count-sort offset paging path and `getTimeFilterDate` along as
unreachable code (feed-posts-01, owner call). The second structural item is **efficiency, not
lines**: five `revalidatePath("/feed")` calls sit on actions whose effect is already applied in
client state, and each one re-renders the feed's whole server tree (page + four rail modules,
roughly ten queries) when fired from /feed, which is the same mechanism this file's own toggleLike
comment blames for the heart scroll-jump (feed-posts-02). After those two, the well is
dedupe-shaped and small: notification writes and the M33 dedupe written twice, the comment
payload written three times, "three photos" written six times while `MAX_IMAGES` sits exported
and (per knip) unused, the own-city lookup written three times, and a hand-rolled poll parse
that audit 1's `parseJsonArray` sweep missed. Structural-vs-cheap: 9 structural, 8 cheap.

What surprised me: the preamble question has a clean answer (11 member preambles, byte-
identical; 2 admin preambles, byte-identical; no drift) and the ROADMAP question too (no
parallel composer anywhere: the desk wraps `CreatePostForm`, Catch-ups and the edit dialog use
`RichTextArea`, and both editors sit on the same `rich-text-editing.ts` helpers). The upload
question is also settled: **none of the three routes is dead**; `/api/upload` is the fallback
for every direct upload and the primary path for messages and Catch-up answers, presign+finalize
is the composer's path, presign+`contributePhotoDirect` is the Collection's. The spec
(`docs/spec/media.md`) still does not know presign exists, unchanged since audit 1 flagged it.
Polls: one of the demo's 29 seeded posts carries a poll; the feature is ~450 lines across two
components, three action blocks, two tables and two indexes; whether that is proportionate is
the fix session's SELECT to run and the owner's call (Owner decisions §B).

## Findings

### feed-posts-01 - The feed's sort and time filters have been unreachable since June; delete the UI branch and the query paths behind it, or put the disclosure back
- **Where**: `src/components/posts/post-feed.tsx:23-24` (`SortBy`, `TimeFilter` types), `:59-61`
  (`sortBy`, `timeFilter`, `filtersOpen` state), `:97-106` (`fetchPosts` passes both),
  `:139` (`markFeedSeen` guard reads both), `:207-210` (`dividerIndex` reads `sortBy`),
  `:281-344` (the whole `showControls &&` block: search `Input`, "Filters" disclosure and the two
  `Select`s, ~64 lines), `:9-17` (the `Button`/`Input`/`Select*` imports, of which `Input` and
  the five `Select*` symbols serve only this block); `src/app/(main)/feed/actions.ts:1041-1070`
  (`getTimeFilterDate`, 30 lines), `:1140-1141` (`sortBy`/`timeFilter` options), `:1147-1149`,
  `:1197` (`createdAt: { gte: timeDate }`), `:1216` + `:1234-1270` (the `else` offset-paging
  branch for count sorts, 37 lines, with its Low 79 clamp and B-122 tie-break comments);
  `src/components/posts/feed-column.tsx:14,20,41` (`showControls` pass-through);
  `src/app/(main)/feed/page.tsx:85` (`showControls={false}`).
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: owner
- **Evidence**: `PostFeed` is rendered exactly once in shipped code, by `FeedColumn`
  (`grep -rn "posts/post-feed\|posts/feed-column" src` outside `lab/` and tests -> only
  `feed/page.tsx`), and `FeedColumn` is rendered exactly once, with `showControls={false}`. No lab
  room renders `PostFeed` or `FeedColumn` (the three lab importers of this folder take
  `PostCard` only). `ProfileAuthorFeed` calls `loadPosts({ authorId, kind, cursor })` and never
  passes `sortBy` or `timeFilter`. So `sortBy` is always `"recent"`, `timeFilter` always `"all"`,
  and everything conditioned on them is unreachable: the `else` arm of `loadPosts` (offset
  paging for count sorts), `getTimeFilterDate`, the `Select`s, the disclosure, and the
  `sortBy === "recent" && timeFilter === "all"` halves of two guards.
  `git log -L85,85 -- 'src/app/(main)/feed/page.tsx'` puts `showControls={false}` at `e5fc121`
  (2026-06-28, "feed surface matches the v2 contract") when search moved to the header pill;
  the sort/time controls have not been on screen since. ROADMAP Phase 4 says "filters behind
  disclosure" as a DoD item, so this was a product intention, not an accident -- which is why it
  is the owner's call and not a delete.
- **What to do**: Either (a) **delete**: remove the `showControls` prop from `PostFeed` and
  `FeedColumn` (the `!showControls && search` banner at `:261-279` becomes `search &&`), the
  `SortBy`/`TimeFilter` types, the three state hooks, the `Input`/`Select*` imports, the
  `showControls &&` block; in `actions.ts` drop `sortBy`/`timeFilter` from `loadPosts`'s options,
  delete `getTimeFilterDate` and the `timeDate` spread, and collapse `if (sortBy === "recent")
  {...} else {...}` to the keyset arm (keep the `offset:` guard on the cursor decode so an old
  client's cursor still reads as "first page"); simplify the `markFeedSeen` guard to
  `data.posts.length > 0 && !search` and `dividerIndex` to `lastSeen !== null && !search`. Or
  (b) **expose**: pass `showControls` (or a new `showFilters`) as true from the page and accept
  the design work of putting a disclosure beside the header pill. Do not do (c), which is what
  exists today.
- **Saving**: ~135 lines (post-feed ~70, actions ~65) of code nobody can reach; one dead
  query path (offset paging with `skip`) out of the feed; `Input` and the `Select` family out of
  `post-feed.tsx`'s static imports (they stay in the /feed bundle through `ReportDialog` unless
  feed-posts-03 lands too -- then both leave, KB for the bundle lens to measure).
- **Risk & gate**: medium (touches `loadPosts`'s where composition and the pinned file).
  `npm run check`: `feed-write-rule.test.mjs` pins `escapeLike(opts.search)`, the C-003 count
  of 3, and `...VISIBLE_COMMENT` -- none in the deleted lines; `keyset.test.mjs`'s
  "no time-ordered query pages by naming a row" sweep is unaffected; `notification-reach`
  pins the hash-scroll code in post-feed, untouched. `npm run visual` (/feed is baselined; the
  controls are hidden today so the pixels must not move). Open `/feed`, `/feed?q=valley`, Load
  more twice, a profile's Posts and Letters tabs.
- **Confidence**: high that it is unreachable; the owner's choice between (a) and (b) is the
  only open question.
- **Notes**: The offset arm is the one with the scars (Low 79's negative-skip throw, B-122's
  tie-break) and the keyset arm is the one four audits made correct; if the filters ever come
  back, "Most liked / Most discussed" should be rebuilt on a keyset over `(likeCount, createdAt,
  id)` rather than resurrected from git. Search stays either way -- it is live through the header
  pill and `initialSearch`. Related: feed-posts-03 (bundle), feed-posts-17 (the stale
  "Re-arms the skeleton whenever the filters, group or reload trigger change" comment at
  `post-feed.tsx:112` mentions a group that no longer exists).

### feed-posts-02 - Five `revalidatePath("/feed")` calls refresh a server tree that holds none of what they changed
- **Where**: `src/app/(main)/feed/actions.ts:449` (`votePoll`), `:697` (`editPost`, the `/feed`
  call only; keep `:699-700`), `:958` (`createComment`), `:1006` (`deleteComment`), `:1035`
  (`adminRemoveComment`).
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The feed's server tree (`feed/page.tsx`) renders no post, comment or poll: it
  fetches the unread count, the member's cities and the `feedSeenAt` marker, then the four rail
  modules (a letter, up to 24 Collection candidates, six members, a week of post authors) and
  `CelebrationSignals` (a user row + two counts). Posts arrive through the `loadPosts` server
  action into client state. Every one of the five actions above already applies its result in
  that client state: `PollDisplay` updates optimistically (`:99-111`) and reverts on error;
  `CommentsSection` slots the returned comment in (`:230`) and bumps the card's count through
  `onCommentAdded`; `removeLocally` (`:252-272`) handles both comment removals; `EditPostDialog`
  hands the new words back through `onSaved` (B-041). What `revalidatePath` does on a fully
  dynamic route is purge the client router cache entry (already stale-time 0 for dynamic
  segments) and make the action's response carry a fresh RSC render of the current route -- the
  effect this file itself documents at `:783-788`: "A revalidatePath forces Next to refresh the
  current route's server tree right after this action resolves, and that refresh was landing
  as an occasional scroll-to-top on the heart click". `toggleLike`, `toggleBookmark` and
  `toggleCommentLike` were fixed by removing the call; the five above were not.
- **What to do**: Delete the five calls. Keep `createPost`'s (the rail's "Signs of life" and
  "This week in Letters" can change), `publishDraft`'s, `deletePost`'s (a deleted post changes
  the pulse count; cheap to keep), `adminRemovePost`'s three, and `editPost`'s two `/letters`
  calls (the letter reading page is server-rendered). Add one sentence beside `toggleLike`'s
  existing note saying the comment and poll actions follow the same rule, so the next writer
  does not put one back. Check `adminRemoveComment`'s other caller
  (`components/admin/content/content-list.tsx`) removes the row locally -- if it relies on a
  refresh it would need `revalidatePath("/admin/content")`, which the `/feed` call never
  provided anyway.
- **Saving**: 5 lines; per comment, reply, poll vote or comment removal made from /feed, one
  full server render of the route avoided -- the page's three queries, the rail's four modules
  (five queries, one of which fetches every post of the week) and the celebration check's
  three, ~11 queries and one RSC payload per interaction.
- **Risk & gate**: low-medium. `npm run check` (`feed-write-rule`'s C-016 slice of
  `createComment` asserts on `repliedToId` and the `findUnique`, not on revalidate;
  `notification-reach`'s takedown sweep counts `clearPostNotifications`, unaffected). Then on a
  dev server: comment on a post from /feed and confirm the thread and count update; vote on the
  demo poll; delete your own comment; with `next-devtools` `get_logs` open, confirm no second
  render of `/feed` follows the action.
- **Confidence**: medium-high. The one thing that would change my mind: a surface that reads
  comment counts from the server tree on /feed -- I found none; the letter reading page has
  its own `_count` and is not `/feed`.
- **Notes**: `editPost:697`'s `/feed` call also covers the immersive draft desk's autosave --
  every 2.5-second autosave of a draft letter currently revalidates `/feed` (and `/letters`,
  and `/letters/<id>`) while the writer is on `/letters/<id>/edit`. A draft is on no feed, so the
  `/feed` half is pure cost on every keystroke pause; the `/letters` halves are arguable (the
  drafts strip) and I leave them. Related: feed-posts-16 (the other per-interaction query cost
  in this territory).

### feed-posts-03 - `ReportDialog` is mounted on every card and statically imported; latch it like the viewer and defer it
- **Where**: `src/components/posts/post-card.tsx:36` (static import), `:45-62` (the block
  explaining why it is not dynamic), `:196` (`showReport`), `:649-656` (mounted unconditionally
  "so ReportDialog's own AnimatePresence can play the close animation"); the latch pattern
  already in the same file at `:201-210` (`viewerMounted`, "True once, then true forever").
- **Phase**: architecture (Next.js lever)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: A feed page renders 20 cards, so 20 `ReportDialog` trees (a `Dialog`, a `Select`
  with four items, a `Textarea`, two `Button`s and their state) are mounted closed on every
  load, and `report-dialog.tsx` plus the `Select`/`Textarea` primitives it imports ride in the
  card's static graph. The file's own comment declines the change at "137 lines is not worth
  restructuring", but the restructuring is two lines: the exact `mounted` latch the viewer
  and the attach dialog already use in this file and in the composer (`attachMounted`,
  `create-post-form.tsx:191`). Latched, the dialog mounts on first "Report", stays mounted after
  (so its close animation still plays), and can be a `dynamic(...)` import like its four
  siblings.
- **What to do**: Add `const [reportMounted, setReportMounted] = useState(false)`; the menu
  item does `setReportMounted(true); setShowReport(true)`; render `{reportMounted && <ReportDialog
  .../>}`; convert the import to `dynamic(() => import("./report-dialog").then(m =>
  m.ReportDialog), { ssr: false })`; rewrite the `:53-57` paragraph to say it IS latched now.
  `LetterEngagement` does not render `ReportDialog`, so nothing else moves.
- **Saving**: 0 lines; 19 fewer mounted dialog trees per feed page; `report-dialog.tsx` +
  `report-action.ts`'s client stub + `Textarea` out of /feed's initial JS, and `Select` too once
  feed-posts-01 removes the other static importer. Exact KB is the bundle lens's (the
  `route-bundle-stats.json` chunk list for /feed is in raw/); on component weight alone it is
  the smallest of the five deferred pieces, which is why audit 1 left it.
- **Risk & gate**: low. `npm run check` (`security-regressions.test.mjs:265` reads
  `report-dialog.tsx` for the derived `DETAILS_MAX` -- the file does not change; `composer-rule`
  pins `onSaved={` in the card, untouched). Open /feed, report a post, cancel, report it again
  (second open must not refetch a chunk), submit one against Jerry's post, then dismiss it in
  `/admin`.
- **Confidence**: high.
- **Notes**: The same latch would let `ConfirmDialog` (`:679-686`, also always mounted) go
  behind the menu, but it is shared chrome already in the initial bundle through the composer
  and comments; not worth a second latch.

### feed-posts-04 - Notification writes: four inline creates and the M33 "one per unread" rule written twice
- **Where**: `src/app/(main)/feed/actions.ts:769-779` (`toggleLike`: build link + message,
  `findFirst` for an unread twin, `create`), `:1373-1384` (`toggleCommentLike`: the same 12
  lines with a different message), `:923-932` (`createComment` -> post author), `:947-955`
  (`createComment` -> replied-to author); `src/lib/post-notifications.ts` (the module that
  already owns "bell rows about a post").
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The two like paths are the same choreography: `postNotificationLink`, a
  templated message, `notification.findFirst({ userId, type: "like", link, message, read:
  false })`, and `create` only if absent. The comment at `:1375` says so ("Same one-per-unread
  rule as toggleLike (audit M33)"). jscpd does not flag it because the two blocks differ in
  variable names and the message string, which is exactly the shape the fix-prompt calls "a
  sameness maintained by hand". App-wide there are 15 inline `prisma.notification.create` /
  `createMany` sites in 12 files (`git grep -n "notification.create"`); the four in this file
  are the ones in my territory and the only ones with a dedupe rule attached.
- **What to do**: In `src/lib/post-notifications.ts` (rename to `notifications.ts` is optional
  and costs three import edits) add `notifyOnceUnread({ userId, type, message, link })` -- the
  findFirst-then-create -- and a plain `notify(...)` for the two comment writes. `toggleLike`
  and `toggleCommentLike` become one call each; `createComment`'s two writes become two calls.
  Keep the M33 paragraph on the helper and a one-line pointer at each call site.
- **Saving**: ~20 lines in `actions.ts`; 1 clone; the M33 rule exists once, and the next
  writer of a "liked your photograph" gets it by calling the helper rather than by copying.
- **Risk & gate**: low. `npm run check`: `notification-links.test.mjs` asserts no ``link:
  `/feed#${`` literal in `feed/actions.ts` (the helper takes a link built by
  `postNotificationLink`, so it stays green); `notification-reach` pins `clearPostNotifications`
  calls per takedown, untouched. Like a post twice, unlike, like again as Jerry against the
  owner's post and read the bell: one row, then a second only after the first is read.
- **Confidence**: high.
- **Notes**: The shared-lib lens should decide whether the other 11 sites want the same helper;
  most (`catchups-notify`, `admin-threads-server`) already have their own wrappers and I would
  not force them. Related: feed-posts-05 (the same file, the same shape for comments).

### feed-posts-05 - The comment payload is written three times; one `serializeComment` beside `serializePost`
- **Where**: `src/app/(main)/feed/actions.ts:962-977` (`createComment`'s return), `:1466-1479`
  (`loadComments`'s deleted-parent stubs), `:1483-1494` (`loadComments`'s rows); plus
  `:37-40` (`COMMENT_AUTHOR_SELECT = { ...AUTHOR_CARD_SELECT }`, used at `:897` and `:908`
  while `:1456-1458` spreads `AUTHOR_CARD_SELECT` directly -- three spellings of one select).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: All three build the same eleven-field object the client types as `CommentData`
  (`comments-section.tsx:48-60`). Audit 1's feed-posts-03 did exactly this for posts
  (`postInclude` + `serializePost`, `:1084-1133`) and its docblock records why: "They had
  already begun to disagree in ways that looked deliberate but were not". The comment trio has
  not drifted yet; `isOwn` is computed as `true` in one, `c.author?.id === userId` in another
  and `false` in the stub, which is correct today and the kind of thing that stops being
  correct the day somebody adds a field to one of the three. `COMMENT_AUTHOR_SELECT`'s docblock
  says "three queries reference it"; two do.
- **What to do**: Add `function serializeComment(c, viewer: { userId; isAdmin })` returning the
  eleven fields (stubs pass a synthetic row with `author: null`, `deleted: true`), call it from
  all three places; delete `COMMENT_AUTHOR_SELECT` and use `AUTHOR_CARD_SELECT` at the three
  sites (the alias is a one-line wrapper with a stale count in its comment).
- **Saving**: ~15 lines; the `CommentData` contract exists once on the server.
- **Risk & gate**: low. `npm run check` (`feed-write-rule` C-016 asserts inside
  `createComment`'s body on `repliedToId` and the `findUnique({ where: { id: repliedToId }`;
  both survive). TypeScript catches any field slip because `CommentsSection` types against
  the action's return. Open a thread past its first page (a post with 6+ comments), delete a
  parent with replies, reply to a reply.
- **Confidence**: high.

### feed-posts-06 - "Three photos per post" is written six times; `MAX_IMAGES` is exported for it and knip says nobody uses the export
- **Where**: `src/app/api/upload/route.ts:22` (`const MAX_FILES = 3`), `src/app/api/upload/finalize/route.ts:36`
  (`const MAX_FILES = 3`), `src/components/posts/use-composer-uploads.ts:219` (`3 - shots.length`),
  `src/components/posts/create-post-form.tsx:859` (`previews.length >= 3`),
  `src/app/(main)/feed/actions.ts:582-583` (`allowed.length > 3` / `"Up to 3 photos."`),
  `src/lib/upload-ownership-rule.ts:15` (`export const MAX_IMAGES = 3`, the one that is
  argued for and tested), `src/lib/upload-ownership.ts:5` (`export { MAX_IMAGES, MAX_IMAGE_URL }`,
  the re-export `raw/knip-repo-config.txt:80-81` lists as unused).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep transcript above. `upload-ownership-rule.ts` is import-free and pure, so
  every one of the five call sites -- two route handlers, one client hook, one client component,
  one server action -- can import `MAX_IMAGES` from it without pulling anything into a browser
  bundle. `editPost`'s `"Up to 3 photos."` at `:583` is the same sentence
  `decideOwnedUploads` already produces (`` `Up to ${MAX_IMAGES} photos.` ``), reached three
  lines earlier by `ownedUploadUrls(added, ...)` -- so the cap is enforced twice in one
  function, once on the added URLs and once on the merged list, with the constant typed by
  hand the second time.
- **What to do**: Replace the five literals with `MAX_IMAGES` imported from
  `@/lib/upload-ownership-rule`; delete the two `MAX_FILES` declarations (keep each route's
  one-line "up to MAX_IMAGES images" doc); delete the re-export line in `upload-ownership.ts`
  (or keep it and import from there -- pick one; knip wants one home). The `editPost` cap
  check at `:582` stays (it guards the merged list), just with the constant.
- **Saving**: ~3 lines; two knip rows closed; one cap. 0 KB.
- **Risk & gate**: low. `npm run check`: `image-purge-rule.test.mjs:104-109` reads both route
  files for their abort shapes (`purgeImageUrls(...)`, not the count message);
  `upload-ownership-rule.test.mjs` imports `MAX_IMAGES` from the rule file, unchanged. Attach
  four photos in the composer (refused at the picker), then finalize four keys by hand from a
  console (refused by the route).
- **Confidence**: high.

### feed-posts-07 - `createPost`'s poll parse is `parseJsonArray` written by hand, and the options are filtered three times
- **Where**: `src/app/(main)/feed/actions.ts:148-161` (14 lines: `JSON.parse` in a try,
  `Array.isArray`, `filter(o => o.trim().length > 0)`, `< 2 -> undefined`), `:236-238`
  (`parsed.data.pollOptions.length >= 2 ? map(trim) : []`), `src/lib/validators.ts:236`
  (`z.array(z.string().min(1).max(200)).min(2).max(4)` -- the same two rules, as the schema).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: Audit 1's feed-posts-10 replaced `parseImageUrls` with `parseJsonArray` in this
  file (`fd47d70`); the poll block has the identical shape (JSON.parse, Array.isArray, string
  filter, catch -> nothing) and was not in the finding. The pre-parse then decides "fewer than
  two -> no poll", the Zod schema decides `.min(2)` again, and `:236` decides `>= 2` a third
  time. The `.trim()` at `:237` runs AFTER Zod's `.min(1)`, so an option of a single space
  passes the schema and is stored as `""` -- reachable only from a hand-made call (the composer
  filters `o.trim()` at `create-post-form.tsx:454`), but a third filter that is the one with the
  hole is a reason to have one.
- **What to do**: `const pollOptions = parseJsonArray(pollOptionsRaw).map(o => o.trim()).filter(Boolean);`
  then `pollOptions: pollOptions.length ? pollOptions : undefined` in `raw`, and let the schema
  be the only judge of 2..4; `:235-238` becomes `const wantedPollOptions = !isDraft ? parsed.data.pollOptions ?? [] : [];`.
- **Saving**: ~12 lines; one rule for "what is a poll option".
- **Risk & gate**: low. `npm run check` (`feed-write-rule` C-009 slices from `const candidates`
  to `const post = await prisma.post.create` and forbids an id-only select there; the poll
  lines are above the slice). Post a poll from the composer, vote on it, confirm `isPostTwin`
  still refuses a same-caption second poll (C-009 test covers the pure function).
- **Confidence**: high.

### feed-posts-08 - "Does this member list this city" is queried three ways in two files
- **Where**: `src/app/(main)/feed/actions.ts:213-223` (`createPost`: `userPlace.findFirst({
  where: { userId, city: { equals, ...insensitive } }, select: { city: true } })`, miss folds to
  null), `:615-621` (`editPost`: the same query, miss refused -- C-017), `src/lib/city-scope.ts:33-44`
  (`canViewCityScope`: the same query with `select: { id: true }`, boolean result).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `editPost`'s comment says "Re-validated against the author's own UserPlace list
  exactly as createPost does" -- sameness by prose. All three ask the database the same
  question; only what they do with "no" differs, and that belongs at the call site.
- **What to do**: In `city-scope.ts` add `export async function ownCity(userId: string, city:
  string): Promise<string | null>` (the stored spelling, or null) and implement
  `canViewCityScope` as `!!(await ownCity(viewer.id, cityScope))` behind its admin/null guards.
  `createPost`: `cityScope = await ownCity(session.user.id, parsed.data.cityScope)` (null =
  ignored, as today). `editPost`: `const ownPlace = await ownCity(...)`; keep the `if
  (!ownPlace) { return { error: ... } }` shape byte-for-byte.
- **Saving**: ~10 lines; one query shape for the audience rule.
- **Risk & gate**: low. `npm run check`: `feed-write-rule` C-017 slices 1,200 chars from
  `const cityScopeRaw = formData.get("cityScope")` and asserts `if (!ownPlace) {\n return {
  error:` and the ABSENCE of `cityScope: ownPlace?.city ?? null` -- keep the variable name
  `ownPlace` and both hold. Set a city audience on a draft, remove that city from your
  profile in another tab, type one character: the refusal sentence must appear.
- **Confidence**: high.

### feed-posts-09 - The composer's `placeholder` prop, `ComposerScope` type and `SCOPE_PLACEHOLDER` map have no caller and one duplicated string
- **Where**: `src/components/posts/create-post-form.tsx:73-74` (`export type ComposerScope`,
  `raw/knip-repo-config.txt:93`), `:85-91` (`SCOPE_PLACEHOLDER`), `:94,109` (`placeholder`
  prop), `:140-141` (`resolvedScope`, `collapsedPlaceholder`), `:216-217` (the letter
  placeholder retyped as a literal identical to `SCOPE_PLACEHOLDER.letter`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "<CreatePostForm" src -A6 | grep placeholder` -> nothing; the two
  callers (`feed-column.tsx:35`, `letter-desk.tsx:102`) pass no placeholder. `ComposerScope`
  is used only inside this file, and the file already says "there is no third composer any
  more" (`:138-139`). The letter sentence appears at `:90` and again at `:217`.
- **What to do**: Delete the prop, the type, `resolvedScope`; keep two named consts
  (`POST_PLACEHOLDER`, `LETTER_PLACEHOLDER`) with the owner's 2026-08-04 wording note;
  `collapsedPlaceholder = defaultLetter ? LETTER_PLACEHOLDER : POST_PLACEHOLDER`;
  `effectivePlaceholder = isLetter ? LETTER_PLACEHOLDER : hasPoll ? "Ask your question" :
  collapsedPlaceholder`.
- **Saving**: ~12 lines; one knip row; one fewer prop on the app's biggest client component.
- **Risk & gate**: low. `npm run check` (`composer-rule` reads the composer for
  `disabled={!content.trim()...}` x2, `initialCityScope`, `formData.set("cityScope", audienceCity
  ?? "")`, `disarmAutosave()` ordering -- none touched). `npm run visual` (/feed and
  /letters/new baselines).
- **Confidence**: high.

### feed-posts-10 - `revalidatePath("/")` on every mark-read purges the landing page and refreshes nothing the bell reads
- **Where**: `src/app/(main)/notifications/actions.ts:123` (`markNotificationRead`), `:136`
  (`markAllNotificationsRead`).
- **Phase**: placeholder
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Next's own docs in `node_modules/next/dist/docs` (mutating-data.md:25-31): a
  literal path revalidates that one page; only `revalidatePath("/", "layout")` means "everything".
  `/` is the signed-out landing hero (`src/app/page.tsx`, no dynamic API), so this purges its
  cache entry each time a member taps a notification, and does nothing for `/feed` or the bell
  -- which holds its list and count in client state and corrects both from the action's own
  return (`notification-bell.tsx:225-228, 242-243`).
- **What to do**: Delete both lines and the `revalidatePath` import.
- **Saving**: 3 lines; one pointless cache purge of the landing page per notification tap.
- **Risk & gate**: trivial. `npm run check`; tap a notification and a "Mark all read".
- **Confidence**: high. What would change my mind: a page that renders unread counts server-side
  and relies on the refresh -- `(main)/layout.tsx` does, but a literal `/` does not reach it.

### feed-posts-11 - The bell hand-rolls the id-dedupe that `append-page.test.mjs` forbids in every other paged list
- **Where**: `src/components/layout/notification-bell.tsx:202-205` (`const seen = new
  Set(prev.map((n) => n.id)); return [...prev, ...data.notifications.filter(...)]`);
  `src/lib/append-page.test.mjs:90-95` (`LISTS`, four files, sweep asserts no `new
  Set(x.map((y) => y.id))`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The bell pages by keyset (`getNotifications`) and appends; it is the fifth
  paged list and the one not in the C-071 sweep. Its filter would trip the sweep's regex if the
  file were listed.
- **What to do**: `setNotifications((prev) => appendUnseen(prev, data.notifications))`; add
  `"../components/layout/notification-bell.tsx"` to `LISTS`.
- **Saving**: 3 lines; the sweep covers all five lists.
- **Risk & gate**: trivial. `npm run check`; scroll the bell past 20 notifications.
- **Confidence**: high.

### feed-posts-12 - `feed/loading.tsx` holds a composer card that no longer exists
- **Where**: `src/app/(main)/feed/loading.tsx:7-10` ("Create post skeleton": a bordered
  `bg-card p-6` tile with an 80px shimmer); the composer at rest is a bare 44px pill with
  no tile (`create-post-form.tsx:1194-1197`, owner 2026-08-04: "get rid of the tile ... just
  have an icon and a pill"); `loading.tsx` last touched 2026-07-30 (`d8149a5`), the pill
  landed after.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: owner
- **Evidence**: The skeleton draws a 128px bordered box where a 44px pill arrives, and no
  header or rail placeholder where a header and a 318px rail arrive; the fix-prompt's
  session-6 re-refutation of admin-analytics-09 states the rule: a skeleton must "hold the
  shape of what is arriving".
- **What to do**: Replace the tile with a `flex items-start gap-3` row of a 32px round
  shimmer and an `h-11 rounded-full` shimmer; optionally add a `PageHeader`-height bar above
  and, at `lg:`, the `RAIL_ASIDE` column with two `RailCard`-shaped shimmers. Then `npm run
  visual:update` for the /feed loading frame if one is baselined (`e2e/loading-fallbacks.spec.ts`
  only asserts that something streamed).
- **Saving**: ~0 lines; one honest skeleton.
- **Risk & gate**: low; owner-visible for ~300 ms per cold load, which is why it is his.
  Screenshot at 1440 and 390 before and after.
- **Confidence**: high.

### feed-posts-13 - `PollDisplay`'s hand-rolled rAF count-up is what `motion` already ships
- **Where**: `src/components/posts/poll-display.tsx:27-66` (`CountUp`: `useState`, two refs,
  a `requestAnimationFrame` loop with an inline ease-out cubic, 37 lines).
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The same file imports `m` from `motion/react` and springs the bars; `motion`
  exports `useMotionValue`, `useTransform` and `animate` (framer-motion's API, which `motion`
  v12 is), so the count-up is `const v = useMotionValue(0); const text = useTransform(v, n =>
  `${Math.round(n)}%`); useEffect(() => animate(v, value, { duration: 0.56, delay, ease:
  "easeOut" }), [value, delay]); return <m.span>{text}</m.span>` -- eight lines, cancelled on
  unmount by the returned controls, no `fromRef` bookkeeping because the motion value IS the
  last shown number. This is the one rAF sampler in the territory; the other nine
  `requestAnimationFrame` sites in `src/` are scrubbers, flights and leaves and are somebody
  else's.
- **What to do**: As above; keep the `ROW_STAGGER` delay pairing with the bar's spring so the
  figure still lands with its bar; delete the `CountUp` component.
- **Saving**: ~25 lines; one fewer hand-rolled animation loop.
- **Risk & gate**: low-medium (owner-visible motion, though the intent is "same"). `npm run
  check`; vote on the demo poll and watch the percentages sweep with the bars; switch your
  vote and watch the counts move from their last value rather than from zero.
- **Confidence**: medium. What would change my mind: if `useTransform`'s string output
  re-renders the row per frame in a way the rAF loop's `setShown` did not (it should be the
  reverse: motion values bypass React renders).

### feed-posts-14 - `report-action.ts`: the report-plus-thread transaction is still written twice, and the file is a `"use server"` module living in `components/`
- **Where**: `src/components/posts/report-action.ts:205-233` vs `:288-314` (jscpd: 210:17-232:27
  = 294:25-313:27, 23 lines: `$transaction(tx => tx.report.create(...) then
  openReportThread({ db: tx, ... }))` + the `isUniqueViolation` catch); the file's location
  (the only `"use server"` file under `src/components/`; `git grep -l '"use server"' -- src`).
- **Phase**: dedupe (a); relocate (b)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Session 5 shared the six-gate preamble (`vetReport`, `c5025c5`) and left the
  transaction. The two copies differ only in the `report.create` data and the catch's return
  key (`alreadyReported` vs `alreadyFlagged`). On location: every other action lives in a
  route's `actions.ts` or in `app/(main)/*.ts` beside the routes (`image-aim.ts`'s header
  explains that convention: "A file that is not page, layout or route is not a route, so this
  sits in the group beside them"); `reportUser` is imported from `components/profile/`, so
  the file serves two surfaces and belongs with the actions.
- **What to do**: (a) `async function fileReport(data: Prisma.ReportCreateInput-ish, subject,
  opening): Promise<{ id: string } | "duplicate">` wrapping the transaction and the unique
  catch; both exports call it and map `"duplicate"` to their own success shape. (b) Optional:
  `git mv` to `src/app/(main)/report-actions.ts` and update the four test paths
  (`security-regressions.test.mjs:221,274`, `profile-editor-rule.test.mjs:80,93`) and two
  importers.
- **Saving**: (a) ~18 lines, 1 clone; (b) 0 lines, one convention kept.
- **Risk & gate**: low for (a): `npm run check` (`security-regressions:221` reads the file for
  the IS_DEMO refusal and `:274` for `500`-shaped refusals; `gate-coverage` scans `"use
  server"` files by glob so a move is picked up automatically; `profile-editor-rule:80` asserts
  `typeof reason !== "string"` is in the file). Report a post twice; flag a person twice.
- **Confidence**: high for (a); (b) is taste, decline freely.

### feed-posts-15 - The composer's "+" menu and its attachment strip are the two regions of `editorBody` with narrow seams
- **Where**: `src/components/posts/create-post-form.tsx:871-1041` (the plus button and its
  `role="menu"` popover: poll toggle, letter toggle, Collection offer, audience radios, ~170
  lines incl. comments), `:694-792` (the preview strip: thumbnail, shimmer veil, aim button,
  remove button, ~100 lines); the file is 1,287 lines of which `editorBody` (`:578-1151`) is 574.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: Audit 1 rejected splitting `editorBody` wholesale ("it closes over 20+ pieces
  of state, and prop-drilling them is worse than the length") and session 10 agreed. These two
  regions are narrower than the whole: the menu reads `pollOptions/setPollOptions`,
  `isLetter/setKind`, `toCollection/setToCollection`, `audienceCity/setAudienceCity`,
  `audienceOptions`, the three `can*` booleans and `more/setMore` -- eight concerns, of which
  four are `[value, setter]` pairs; the strip reads `previews`, `pending`, `urls`, `facts`,
  `removeImage` -- five, all already produced by `useComposerUploads`. Neither touches the
  contentEditable, the refs or the persistence machine.
- **What to do**: `posts/composer-more-menu.tsx` (`<ComposerMoreMenu open onOpenChange
  poll={{ value, set, allowed }} letter={{ isLetter, setKind, allowed }} collection={{ value,
  set, allowed }} audience={{ options, value, set }} />`) and `posts/attachment-strip.tsx`
  (`<AttachmentStrip previews pending urls facts onRemove />`), each carrying its comments
  verbatim. The composer drops to roughly 1,000 lines with `editorBody` around 300.
- **Saving**: ~0 net lines (a move); the biggest client component in the app loses two
  self-contained UIs that can be read, and eventually visually tested, on their own.
- **Risk & gate**: medium (the C-183 blob-preview pin counts `revokeBlobPreviews` calls in
  the HOOK, not the JSX, so it holds; `composer-rule`'s B-044 pin counts the two
  `disabled={!content.trim()...}` buttons, which stay in the composer). `npm run check`, `npm
  run visual`, then the menu on /feed and on /letters/new at 390px (the popover's left-anchor
  and max-width comments are about phones), attach three photos, remove the middle one, aim one.
- **Confidence**: medium. What would change my mind: the fixer finding that the popover's
  `AnimatePresence` exit needs the parent's `more` in the same render tree (it does not -- the
  child owns the presence), or the owner preferring the single-file composer he can read
  top-to-bottom. This is the one taste item in the list; do it last or not at all.

### feed-posts-16 - The bell's KEEP=100 prune runs two queries on every first-page open while a nightly sweep already prunes the same table
- **Where**: `src/app/(main)/notifications/actions.ts:8-12` (`KEEP`), `:47-69` (the prune:
  `findMany skip: 99 take: 1` then `deleteMany`, "no scheduled job does either");
  `src/lib/retention.ts:41-42,176-179` (the nightly sweep that deletes notifications older than
  365 days, behind `requireCronSecret`, pinned by `proxy-rule.test.mjs`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The action's comment predates `retention.ts` ("no scheduled job does either")
  and is now false: a scheduled job does the age half. The count half could join it as one
  statement -- `DELETE FROM "Notification" WHERE read AND id IN (SELECT id FROM (SELECT id,
  row_number() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC, id DESC) AS rn FROM
  "Notification" WHERE read) t WHERE rn > 100)` -- keeping Low 85's `read = true` guard, and
  the open path drops to one `findMany` + one `count`.
- **What to do**: Add the statement as a `step("notification-cap", ...)` in `retention.ts`
  (raw SQL through `prisma.$executeRaw`; the file already reports per-step counts), delete
  the prune block and `KEEP` from the action, and rewrite the comment on `getNotifications`
  to point at retention.
- **Saving**: ~22 lines in the action; -2 queries per bell open (every open is a first-page
  open); one place where notification retention is decided.
- **Risk & gate**: medium (raw SQL on the live shared database; `unattended-rule.test.mjs`
  pins the cron routes' shape). Gate: `npm run check`; the fix session runs the SELECT half of
  the statement first (`SELECT count(*) FROM (...) t WHERE rn > 100`) to see how many rows it
  would take, then the cron once by hand. The audit-1 not-finding that `email-queue.ts` is
  "not an outbox candidate (no cron)" is about a different mechanism; this one is a plain
  DELETE that already has a nightly home.
- **Confidence**: medium. What would change my mind: the owner preferring the bell to
  self-clean on open so the table never grows between nights (it grows by one day's
  likes either way).

### feed-posts-17 - Hygiene sweep across the territory
- **Where / what**:
  1. `src/app/(main)/feed/page.tsx:35` -- `const s = await auth()` inside `if (q)` re-reads the
     session already held in `session` (cache()d, so free, but it reads as a second sign-in
     check). Use `session.user.id`.
  2. `src/app/(main)/feed/actions.ts:1284-1293` -- `loadSavedPosts`'s docblock sits above the
     `SAVED_POSTS_LIMIT` const (two stacked docblocks) and its last sentence, "Group posts
     only surface while the member still belongs to that group", describes plumbing removed in
     phase 2. Merge into one docblock above the function, drop the sentence.
  3. `actions.ts:739` -- "The four sibling toggles below use the same shape": two are below
     (`toggleBookmark`, `toggleCommentLike`); the others live in `collection/actions.ts` and
     `catchups/actions.ts`. Say "the two below, and the Collection's and Catch-ups' loves".
  4. `actions.ts:464-465` -- "which is why this was a `let`" narrates a removed line; drop.
  5. `src/app/api/upload/route.ts:7-14` -- the import block still carries the blank line inside
     the braces and `stillPictureNotice,}` (audit-1 feed-posts-15, never tidied); same scar at
     `collection/actions.ts:38` (`isImageFile,}`) and `settings/actions.ts:15` (no spaces).
  6. `src/components/posts/post-card.tsx:553` -- `(photo, i, cell)`: `photo` unused
     (`raw/tsc-unused.txt`). Rename `_photo`, or use it: `photoSrc(images[i])` is what the
     render-prop already knows as `photo`'s source only if `PhotoRows` passes the url -- it
     passes `StoredPhoto`, so `_photo`.
  7. `post-card.tsx:236-245` -- `viewerImages`' memo re-parses `post.images` that `:225` already
     parsed into `images`; use `images` and put it in the deps.
  8. `src/components/posts/use-letter-persistence.ts:51-56,160-164` -- `stashLocalDraft`/
     `dropLocalDraft` are one-line wrappers over `safeSet`/`safeRemove`, and
     `writeLocalDraft`/`clearLocalDraft` are `useCallback` wrappers over those: two layers for
     one call. Keep the callbacks (they carry the key), inline the two functions.
  9. `src/lib/rich-text-editing.ts:89` -- `FORMAT_SHORTCUTS` is exported and used only inside
     the file (`raw/knip-repo-config.txt:79`, `git log -S` shows the composer stopped importing it
     in `04133c1`). Drop the `export`.
  10. `src/components/layout/notification-bell.tsx:56-58` -- the icon map's docblock names
      `groups/actions.ts`, which no longer exists.
  11. `src/app/(main)/notifications/actions.ts:47-48` -- "no scheduled job does either" is false
      since `retention.ts` (folds into feed-posts-16 if that lands).
  12. `src/components/posts/post-feed.tsx:112` -- "whenever the filters, group or reload trigger
      change": no group (folds into feed-posts-01).
  13. `src/components/feed/rail/directory-module.tsx:25-39` -- a hand-typed seven-field member
      select with a comment saying it matches "the post-card author select"; session 4 made
      that select `AUTHOR_CARD_SELECT` in `lib/people-select.ts`. `{ ...IDENTITY_SELECT,
      accountType: true, batchYear: true, currentCity: true }` says the same thing without a
      prose promise (people-select lens to confirm which constant).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Saving**: ~15 lines; four stale sentences; two knip/tsc rows.
- **Risk & gate**: trivial. `npm run check`.
- **Confidence**: high.

## Owner decisions

**A. The feed's hidden sort and time filters (feed-posts-01).** Since the end of June the
feed has carried a "Most recent / Most liked / Most discussed" sort and a "Today / This week /
This month / This year" filter that nobody can see: the page that renders the feed switches
them off, and search moved to the pill in the header. The code behind them -- about 135 lines,
including a second way of paging through posts that four earlier audits patched for bugs -- is
still shipped and still maintained. The roadmap said "filters behind a disclosure", so this was
a plan, not an accident. My recommendation is to delete them: two months of use without them
have not produced a request, the header search covers the thing people actually do, and if
"Most liked" is ever wanted it should be rebuilt on the safe paging path rather than
resurrected. If you would rather have them, the alternative is one design decision (where the
disclosure sits beside the header pill) and then the code is already there.

**B. Polls.** A post can carry a two-to-four option poll. The feature is a poll builder in the
composer, a results display with animated bars, a vote action, two database tables, a line in
the admin analytics and a mention in the guide -- roughly 450 lines and two tables for one
affordance. One of the demo's 29 seeded posts has a poll. I cannot see the live database from
this audit; the fix session should run
`SELECT count(*) AS polls, count(DISTINCT p."authorId") AS authors, max(p."createdAt") AS last
 FROM "PollOption" o JOIN "Post" p ON p.id = o."postId";`
and `SELECT count(*) FROM "PollVote";` and put the numbers here. My recommendation is to keep
it regardless: it is small, contained, correct (B-040, Low 74, M32 all closed), the guide
advertises it, and removing a working feature to save 450 lines is the cut the brief says
never to make silently. If the numbers come back at zero polls after launch plus a few months,
that is the moment to ask again.

**C. The loading frame of the feed (feed-posts-12).** For a third of a second on a cold load the
feed shows a placeholder of a big bordered box where the composer used to be; the composer is
now a slim pill. Redrawing the placeholder to match is a five-line change and it is yours only
because it is something a member sees. Recommendation: yes.

**D. The upload spec (carried from audit 1, decision 3).** `docs/spec/media.md` still describes
one upload route and a 5 MB cap. The composer has uploaded straight to storage through a
presign step for weeks, the cap is 20 MB, and the spec's banner (updated 2026-08-28 for the
Collection rework) still says nothing about it. The docs lens owns the edit; I record that it
is still open and still the one place a future session will read first and be misled.

## Not-findings

- **The action preamble is uniform, and the wrapper stays refuted.** `feed/actions.ts` exports
  17 actions. Eleven open with the byte-identical two lines `const session = await auth(); if
  (!session?.user?.id) return { error: "Not authenticated" };` (createPost, publishDraft,
  deleteDraft, votePoll, deletePost, editPost, toggleLike, toggleBookmark, createComment,
  deleteComment, toggleCommentLike). Two admin actions open with the byte-identical `if
  (!session?.user?.id || session.user.role !== "admin") return { error: "Not authorized" };`
  (adminRemovePost, adminRemoveComment). The four reads (loadPosts, loadSavedPosts,
  loadComments, markFeedSeen) each return their own empty shape, necessarily. Below the session
  line: `requireVerifiedMember()` 7 times (createPost's is conditional on `isLetterDraft`, C-122),
  `rateLimit` twice (posts, comments), `canViewPost`/`canViewPostOfComment` 6 times, and
  authorship checks in 5 (two spellings of "author or admin" -- `deletePost:466-468` positive,
  `deleteComment:998` De Morgan'd -- same rule, not worth a helper). No `IS_DEMO` guard anywhere
  in the file: the demo's three layers (`proxy.ts`, the Prisma extension, `call-action`) cover
  it, and `report-action.ts` carries one only because reporting pages a human. Verdict: no drift
  since audit 1; nothing to consolidate; `gate-coverage.test.mjs` scans each export by body and
  that is the mechanism that keeps it so.
- **There is one rich-text pipeline, in three files, on purpose.** `rich-text.ts` renders the
  wire format (the XSS-sensitive half, 12 attack tests), `rich-text-editing.ts` turns a
  contentEditable back into it and owns the three formatting shortcuts, `rich-truncate.ts`
  finds a safe cut. Both editors -- the composer and `RichTextArea` (used by the edit dialog and
  the Catch-up answer card) -- import the same `serializeEditableToMarkdown`,
  `applyFormatShortcut`, `insertPlainTextPaste`. Each file's header names its
  import-resolution reason (`rich-text.ts:3-13`; `rich-truncate.ts:17`). Not two pipelines.
- **`post-visibility.ts` vs `post-visibility-rule.ts` is not the same rule twice** (carried from
  audit 1, unchanged): pure decision + 28 attack tests on one side, `cache()`d fetches on the
  other. Same for `upload-ownership.ts` / `upload-ownership-rule.ts`.
- **Keyset pagination is implemented once** (`lib/keyset.ts`) and consumed by `loadPosts`,
  `loadComments` and `getNotifications`. `loadSavedPosts` is a one-page shelf (Low 76), the
  letters index pages by `createdAt < before` in a URL param (member-surfaces; a simpler shape
  for a server-rendered page), the directory pages by offset with M39 recovery. No per-surface
  copy of the keyset itself.
- **All three upload routes are live; none is legacy.** `/api/upload/presign` +
  `/api/upload/finalize` is the composer's path (`use-composer-uploads.ts:156-176`);
  presign + `contributePhotoDirect` is the Collection's (`contribute-room.tsx:504,623`);
  `/api/upload` is (1) the automatic fallback when presign answers `direct: false` (no R2 locally)
  or the PUT is blocked (CORS, CSP, timeout -- `upload-client.ts:54-63,87-94`), (2) the only path
  for `message-composer.tsx:74` and `catchups/answer/photo-attachments.tsx:90`, and (3) the
  Collection's own fallback (`contributePhoto`, `:644`). The "server-action" path the charter
  names is the avatar (`settings/actions.ts`, bytes through `sniffImageType`), outside this
  territory. `upload-shared.test.mjs:132` derives the route list from the directory and pins
  `vetUploadRequest` on each. Whether messages and Catch-ups should adopt `directUploadPut` is
  audit-1 owner decision 2, still parked (FEATURES.md does not list it either).
- **The ROADMAP's one Composer / one Feed / one PostCard is honoured.** `LetterDesk` wraps
  `CreatePostForm` (`letter-desk.tsx:102-126`, "extracted nothing, forked nothing"); `/letters/new`
  and `/letters/[id]/edit` render the desk; `EditPostDialog` is the owner's dialog register
  (2026-07-30) on `RichTextArea`; `catchups/answer/answer-card.tsx:110` uses `RichTextArea`,
  not a second contentEditable. `ProfileAuthorFeed` and `SavedPostsFeed` render `PostCard`
  (`variant="sheet"|"card"`, `column="centered"`); they carry their own pager/masonry, which
  session 5 examined and refused to share ("not variants of one thing").
- **Rail modules sit on `RailCard`** and re-implement no card; `directory-module` uses
  `IdentityRow`, `letters-module` uses `plainExcerpt`/`letterTitle`/`readMinutes`/`metaLine`.
- **Which of the 14 posts components are client for a leaf reason only: none.** `feed-column`
  exists to hold one `useState` (the reload key) between a client composer and a client feed
  under a server page -- an honest 48-line seam. `new-post-cta` IS the leaf (one click handler).
  `poll-creator` has no hooks but has handlers and is only ever rendered inside the client
  composer through `dynamic()`, so its directive is the chunk boundary, not a mistake. All
  others hold state or effects. The four rail modules and `feed-rail` are server components.
- **`markFeedSeen`'s silent production failure, `loadSavedPosts`'s single page, the
  `after()` on the Collection copy** -- all argued in place; unchanged since audit 1.
- **The unread count is computed three times on a /feed load, and each has a reason.**
  `(main)/layout.tsx:57` counts for the sidebar bell (which `sidebar.tsx:765` then skips on
  /feed, so that count is discarded there -- layouts cannot see the pathname, so this is the
  price of one layout); `feed/page.tsx:40` counts for the header bell; `notification-bell.tsx:154-159`
  refreshes on mount. The mount refresh looks redundant with a fresh SSR prop, but it is the
  one thing that corrects a bell remounted from a cached router payload on browser Back (the
  C-133 shape `heart.ts` documents). Left alone; recorded so nobody re-derives it.
- **`editPost`'s image branch cannot adopt `parseJsonArray`** although it has the shape:
  `parseJsonArray` answers `[]` to malformed JSON, and here `[]` would mean "remove every
  photograph from the draft" where the current `try/catch` means "keep them". The difference
  is the C-064 purge queue. Do not "simplify" it.
- **The Groups residue is a decided floor, not bloat:** `createPost`'s refusal (`:189-207`),
  the `groupId: null` filters, `GUARD_SELECT.groupId`, `isMemberOf`, the group branch of
  `decidePostVisibility` and its three attack tests. Audit-1 feed-posts-01 kept these on purpose
  and session 10's Groups removal left them. One new caution for whoever revisits the schema:
  `@@index([groupId, createdAt])` on Post is plausibly the index the feed's `groupId IS NULL
  ORDER BY createdAt DESC` query walks; run `EXPLAIN` before dropping it.
- **The 7 jscpd clone pairs between `collection/actions.ts:1009-1021` and `feed/actions.ts`
  (`:344`, `:404`, `:513`, `:1341`)** are the two-line session preamble plus
  `requireVerifiedMember`; see the first not-finding.
- **The comment mass** (484 comment lines in `actions.ts`, 428 in the composer, 218/106 in
  `upload-shared.ts`): sampled line by line; audit ids, owner quotes, dates, measured numbers.
  The only restate-the-code comments I found are the four in feed-posts-17.

## Audit-1 carry-overs in this territory

- feed-posts-01 (Groups plumbing): code done (phase 2); schema `Post.groupId` + relation + index
  still present; owner decision 1 still open. Recommend closing it as "keep" formally, with
  the `EXPLAIN` note above.
- feed-posts-02 (composer split): done, `3527e55`; hooks are 468 + 308 lines. Nothing to redo.
- feed-posts-03 (one include/serializer): done; the comment trio (feed-posts-05 here) is the
  same shape one level down.
- feed-posts-04 (dynamic imports): done; `ReportDialog` deliberately left static, revisited in
  feed-posts-03 here.
- feed-posts-05 / duplication-12 (shared pager): refuted at fix time; unchanged; not re-proposed.
- feed-posts-06 (hearts): done; `heart.test.mjs` pins five hearts on one hook.
- feed-posts-07 (upload preamble + WebP recipe): done (`api-gate.ts`, `toDisplayWebp`);
  `upload-shared.test.mjs:132` derives the route sweep.
- feed-posts-08/09/10/11/12/13/14: done. feed-posts-15's `upload/route.ts` import scar: still
  there (feed-posts-17 item 5).
- duplication-02 (action-gate wrapper): refuted; the preamble is uniform (not-findings).
- Owner decision 2 (two upload doors): both live, unchanged. Owner decision 3 (media.md stale):
  still stale (Owner decisions §D).

## For other lenses

- `src/lib/validators.ts:214-215` -- "The Post.tag column survives for a future cleanup
  migration" is stale: `prisma/migrations-manual/2026-08-27-drop-dead-columns.sql:48` dropped
  it. (lib-core)
- 15 inline `prisma.notification.create` / `createMany` sites in 12 files (`git grep -n
  "notification.create"`); feed-posts-04 shares the four in this territory. (shared-lib)
- `src/components/messages/message-composer.tsx:74` and
  `src/components/catchups/answer/photo-attachments.tsx:90` still hand-roll the `/api/upload`
  fetch the composer's `uploadOneFile` also carries (`use-composer-uploads.ts:178-212`); a
  shared client helper is a three-site dedupe, or adopt `directUploadPut` (audit-1 owner
  decision 2). (messages, catchups)
- `src/components/feed/rail/directory-module.tsx:25-39` hand-types a member select; see
  feed-posts-17 item 13. (people-select / directory-profile)
- `src/lib/gate-coverage.test.mjs:213` -- the `deletePost` exemption reads "author, site admin
  or the group's admin"; the group admin went in phase 2. (lib-tests)
- `src/app/(main)/collection/actions.ts:38` and `src/components/settings/actions.ts:15` carry
  the same import-block formatting scar as `api/upload/route.ts:7-14`. (collection, directory-profile)
- `src/components/feed/rail/pulse-module.tsx:24-31` fetches every post of the trailing week to
  count posts and distinct authors; a `groupBy({ by: ["authorId"], _count })` returns one row
  per author instead of one per post. Same query count, fewer rows; the bundle/DB lens can
  decide if it matters at 2k users. (feed rail is mine; flagged as a not-worth-its-own-finding.)
- `src/app/(main)/feed/page.tsx:39-56` runs three queries the `(main)` layout partly repeats
  (the unread count); see the not-finding on the bell. (layout)
- /feed's `firstLoadChunkPaths` (raw/route-bundle-stats.json) lists 36 chunks incl.
  `3xzx8bth_5wax.js` (224 KB) and `1wzeccabdjyp3.js` (126 KB); which of them `Select`/`Textarea`
  live in is the bundle lens's to attribute for feed-posts-01/03. (bundle)

## Metrics

- Lines read: 9,539 in-territory source (feed app 1,825; upload routes 415; feed components 481;
  posts components 5,065; lib 1,753) + 2,299 test lines + ~1,500 boundary lines.
- Biggest files (cloc code/comment): `feed/actions.ts` 927/484; `create-post-form.tsx` 809/428;
  `comments-section.tsx` 529/139; `post-card.tsx` 506/149; `post-feed.tsx` 303/91;
  `use-letter-persistence.ts` 244/191; `report-action.ts` 208/111; `use-composer-uploads.ts` 175/110.
- Comment-heaviest (ratio): `upload-shared.ts` 2.06 (218/106, #2 in the repo), `rich-text.ts`
  1.56, `posts.ts` 2.97 (89/30), `notification-links.ts` 2.56, `keyset.ts` 1.96,
  `post-visibility-rule.ts` 1.04 -- every one sampled, all why-comments.
- `feed/actions.ts` responsibility map (line ranges): imports 1-35; `COMMENT_AUTHOR_SELECT` 37-40;
  `deletePostWithImages` 42-107; **writes** `createPost` 113-337 (225), `publishDraft` 339-373,
  `deleteDraft` 375-402, `votePoll` 404-451, `deletePost` 453-474, `adminRemovePost` 476-511,
  `editPost` 513-710 (198), `toggleLike` 712-790, `toggleBookmark` 792-814, `createComment`
  818-978 (161), `deleteComment` 980-1008, `adminRemoveComment` 1010-1037; **reads**
  `getTimeFilterDate` 1041-1070, `PAGE_SIZE` 1072, `postInclude`/`serializePost` 1074-1133,
  `loadPosts` 1135-1282 (148), `loadSavedPosts` 1284-1339, `toggleCommentLike` 1341-1392 (a
  write filed among the reads), `loadComments` 1394-1500 (107), `markFeedSeen` 1502-1550.
  Writes ~930 lines, reads ~510, helpers ~110. Preamble counts: `await auth()` 17,
  member-refusal 11, admin-refusal 2, `requireVerifiedMember` 7, `rateLimit` 2, visibility 6,
  `revalidatePath` 20 (5 of them feed-posts-02). What comes out first: feed-posts-01 (~65
  lines of unreachable read path), then 04/05/07/08 (~57 lines of dedupe); the file lands
  near 1,400. A `queries.ts` split is line-neutral and would move the read side under eight
  rule tests that read `actions.ts` by path (`feed-write-rule`, `composer-rule`, `draft-rule`,
  `post-caps`, `image-purge-rule`, `catchup-lifecycle`, `notification-reach`, `gate-coverage`);
  I do not recommend it.
- Duplication in territory (raw/jscpd.txt): 12 clone pairs touch these files -- 4 collection<->feed
  preambles, 2 intra-feed preambles, 1 upload/route<->finalize (the `urls/images/notices`
  declarations + abort), 3 post-feed<->profile-author-feed (the refused pager), 1 report-action
  internal (feed-posts-14), 1 post-card<->profile-card (an `IdentityRow` call), 1
  create-post-form<->lab/composer (the lab keeps its copy by design), 1
  post-visibility-rule<->photo-visibility-rule (the admin/author/hidden ladder; the two rules
  are pinned separately and I would not merge them). Hand-found, not in jscpd: the M33 dedupe
  x2, the comment payload x3, the own-city query x3, "three" x6, the letter placeholder x2.
- Honest saving if every autonomous finding lands: ~180-200 lines (01 ~135 if the owner says
  delete, 04 ~20, 05 ~15, 07 ~12, 08 ~10, 09 ~12, 13 ~25, 14 ~18, 16 ~22, 17 ~15, 10/11 ~6,
  minus ~60 of new helpers), 4 clones, 4 knip/tsc rows, ~11 queries per comment/vote from
  /feed, 2 queries per bell open, 19 dialog trees per feed page, and `Select`/`Textarea`/
  `report-dialog` out of /feed's first load (KB for the bundle lens).
- Rule tests that read this territory by path and must ride along with any change here:
  `feed-write-rule`, `composer-rule`, `draft-rule`, `post-caps`, `rich-truncate`, `heart`,
  `append-page`, `notification-links`, `notification-reach`, `upload-shared`,
  `upload-size-rule`, `image-purge-rule`, `image-facts`, `unattended-rule`,
  `catchup-lifecycle`, `gate-coverage`, `security-regressions`, `profile-editor-rule`
  (all `src/lib/*.test.mjs`), plus `e2e/deeplink.spec.ts` for the feed's hash scroll.
