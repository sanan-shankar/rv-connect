# feed-posts - simplification audit report

Territory reader for the feed, posts, comments, polls, mentions, images/uploads and the
post-shaped lib: `src/app/(main)/feed/**`, `src/app/api/upload/**`, `src/components/feed/**`,
`src/components/posts/**`, and 20 named `src/lib/*` files. Charter: read the two giant files
line by line (`feed/actions.ts` 1,648 lines, `create-post-form.tsx` 1,683 lines), map their
responsibilities, and check the ROADMAP's "one Composer, one Feed, one PostCard, parameterized
by scope" against what shipped. Date: 2026-08-25. Files in territory: 44; read fully: 44.

## Coverage

- Read fully: all 3 files in `src/app/(main)/feed/`, all 3 routes in `src/app/api/upload/`,
  all 7 in `src/components/feed/` (incl. `rail/*`), all 11 in `src/components/posts/`, and all
  20 lib files named in the charter (`heart`, `keyset`, `append-page`, `draft-rule`,
  `draft-images`, `image`, `image-downscale`, `upload-client`, `upload-ownership`,
  `upload-ownership-rule`, `upload-shared`, `content-view`, `post-visibility`,
  `post-visibility-rule`, `post-caps`, `post-notifications`, `posts`, `city-scope`,
  `rich-text-editing`, `rich-truncate`).
- Also read (boundary evidence, not my territory): `components/profile/profile-author-feed.tsx`,
  `components/profile/saved-posts-feed.tsx`, `components/letters/letter-engagement.tsx`,
  `components/letters/letter-desk.tsx`, `app/(main)/letters/page.tsx` (first 140 lines),
  `app/(main)/letters/[id]/page.tsx` (tail), `components/posts/edit-post-dialog.tsx`'s partner
  `common/rich-text-area.tsx` (import surface only), `lib/db-text.ts` (the `insensitive`
  definition), `lib/utils.ts` (`parseJsonArray`, `plainExcerpt`, `letterTitle`), and the rule
  tests that pin this territory (`feed-write-rule`, `composer-rule`, `gate-coverage`,
  `image-purge-rule`, `upload-size-rule`, `image-fit`, `upload-shared`, `upload-ownership-rule`,
  `post-visibility-rule` `.test.mjs`).
- Skimmed: `docs/spec/media.md` (full), `docs/spec/letters.md` (sections 0-2.5), ROADMAP
  Composer/Feed/PostCard lines.
- Not read: none of the territory. Letters pages beyond the excerpts above belong to
  member-surfaces.
- Uncommitted edits seen: none in this territory. `git status --short` over all 44 files is
  clean; the WIP the orchestrator flagged (next.config.ts, admin.ts, phase7-probe.mjs,
  manual-tour-entry.test.mjs, forbidden.tsx) is all outside my paths and was not touched.

## Summary

This territory is in unusually good shape for its size: the ROADMAP's "one Composer, one Feed,
one PostCard" decision is genuinely honoured (the letters desk wraps `CreatePostForm`, Saved
re-renders `PostCard`, rail modules share `RailCard`, keyset pagination is written once in
`lib/keyset.ts`), and the enormous comment load (561 comment lines in the composer, 474 in
actions) is almost entirely the owner's "every constant argued for" standard - audit IDs,
dates, owner quotes - which the brief explicitly protects. The real weight is elsewhere:
(1) a whole stratum of **Groups plumbing for a feature that was removed** - props, branches,
`revalidatePath("/groups/...")` calls and payload fields that provably never fire, kept alive
by a comment that itself says removing them is "a bigger, separate change" (this audit is that
change's brief); (2) **the serializer/include block of `loadPosts` written twice** inside
actions.ts; (3) **the feed pager machinery written twice** (PostFeed vs ProfileAuthorFeed)
and the optimistic heart written three times (PostCard, LetterEngagement, CommentItem);
(4) four inline copies of the read-time formula, two of which also hand-roll a
markdown-stripping excerpt that `plainExcerpt` already does *better* (they miss its image-bang
fix - a latent visible bug); (5) a set of one-line-of-benefit dedupe wins where a shared lib
helper already exists and the call site re-implements it (`applyFormatShortcut`,
`parseJsonArray`, `insensitive`, `appendUnseen`). Structural-vs-cheap split: roughly 10
structural findings to 6 cheap. What surprised me: how many of the "duplicates" have a shared
helper *already in the tree* that one side forgot to adopt - the codebase's own R6 lesson
("security logic pasted into several files and then quietly diverging") applies to its
conveniences too. One warning that colours every finding here: this territory is the most
rule-test-pinned code in the repo - `composer-rule`, `feed-write-rule`, `gate-coverage` and
`image-purge-rule` all read these files as text by path - so any file split or rename must
update those test paths in the same commit, or `npm run check` fails honestly.

## Findings

### feed-posts-01 - Strip the dead Groups plumbing from the feed write/read/render paths
- **Where**: `src/app/(main)/feed/actions.ts:215-233` (the refusal comment + guard, KEEP),
  `:361` `:396` `:505` `:540` `:730` (five `revalidatePath(post.groupId ? \`/groups/...\` : ...)`
  branches), `:491-500` (deletePost's group-admin lookup), `:1109` `:1122-1132` `:1183-1194`
  (loadPosts `groupId` option, membership gate, where-branch), `:1285` `:1330-1334` `:1350`
  `:1403` (loadSavedPosts membership query + OR arm + payload field);
  `src/components/posts/create-post-form.tsx:55` (`ComposerScope "group"`), `:68-75`
  (`SCOPE_PLACEHOLDER.group`), `:136,153,186,190,902,1003-1004` (groupId prop, scope inference,
  formData set, "Posted to the group" toast);
  `src/components/posts/post-feed.tsx:27,30,39,112` (FeedScope `"group"`, groupId prop);
  `src/components/posts/feed-column.tsx:14,26` (groupId prop);
  `src/components/posts/post-card.tsx:45` (`PostData.groupId`, read by no component);
  `src/components/letters/letter-engagement.tsx:18,26,93,97` (groupId prop and two
  `/groups/${groupId}` fallbacks) and `src/app/(main)/letters/[id]/page.tsx:214` (passes it).
- **Phase**: placeholder (dead-by-invariant code kept "for later")
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (code); owner (schema, see Owner decisions)
- **Evidence**: There is no `/groups` route under `(main)` (verified by `ls`). `createPost`
  refuses any groupId outright (actions.ts:230-232, "Group posts are not available.") and its
  own comment records "Verified live before writing this: zero rows in Post carry a groupId"
  and "every read path in this file forces groupId: null". The only caller of `FeedColumn` is
  `feed/page.tsx`, which passes no groupId; `PostFeed` is used only by `FeedColumn`. So
  `loadPosts({groupId})`'s membership gate, deletePost's group-admin branch, the five
  revalidate branches, loadSavedPosts' `groupMember.findMany` + `groupId: { in: groupIds }`
  arm, and every `"group"` scope string are code that cannot execute against any row or any
  caller. `post-card.tsx:237-239` already deleted its own groups branch with the comment "The
  Groups feature was removed and no route renders a group post, so the old `/groups/<id>#<id>`
  branch could only ever have produced a 404 link" - `letter-engagement.tsx:93,97` still
  carries the exact branch post-card deleted (a moderation redirect and a share href to a
  route that 404s). The in-file comment at actions.ts:226-229 defends leaving the read side
  only because "tearing the whole group-feed plumbing out is a bigger, separate change" - i.e.
  scope, not intent.
- **What to do**: (1) actions.ts: drop the `groupId` option from loadPosts (and its membership
  gate and where-branch; keep `groupId: null` in the main-feed where, which is what protects
  against any legacy row); drop deletePost's group-admin lookup (authorized = author or
  admin); collapse the five `revalidatePath(post.groupId ? ... : ...)` ternaries to their
  else-arms; in loadSavedPosts drop the memberships query and replace the
  `OR: [{groupId: null}, {groupId: {in: groupIds}}]` arm with `groupId: null`; drop `groupId`
  from both serializers' payloads. Keep the createPost refusal and its comment (that is the
  guard). (2) create-post-form.tsx: delete the `groupId` prop, the `"group"` member of
  `ComposerScope`, `SCOPE_PLACEHOLDER.group`, the `formData.set("groupId", ...)` line and the
  "Posted to the group" toast arm. (3) post-feed.tsx/feed-column.tsx: delete the groupId props
  and `"group"` from `FeedScope`. (4) letter-engagement.tsx: delete the groupId prop and both
  `/groups/` fallbacks (moderation redirect goes to `/letters`, shareHref is always
  `/letters/${postId}`); update `letters/[id]/page.tsx:214` to stop passing it. (5) Leave
  `decidePostVisibility`'s group branch and `canViewPost`'s `isMemberOf` ALONE - the pure rule
  is pinned by `post-visibility-rule.test.mjs` and is the cheap defensive floor if a groupId
  row ever appears. (6) Update `gate-coverage.test.mjs:230`'s prose for deletePost ("author,
  site admin or the group's admin") to match.
- **Saving**: ~90-110 lines across 7 files, one dead concept ("group scope") out of the
  composer/feed type surface, one query (groupMember.findMany) off every Saved load, one
  query off every group... none - the membership gate never ran. Real DB win is the Saved
  page's memberships query on every load.
- **Risk & gate**: medium (touches loadPosts' where composition and two pinned files).
  Gates: `npm run check` (feed-write-rule.test.mjs asserts against actions.ts source -
  confirm its fragments still match; gate-coverage.test.mjs's per-file config includes
  deletePost), `npm run visual`, open `/feed`, `/letters/<id>`, a profile Saved tab.
- **Confidence**: high. The one thing that would change my mind: a decision to revive group
  feeds for Catch-ups - but Catch-ups shipped with their own models (catchups.md), and the
  hidden-container groups are membership objects, not post feeds.
- **Notes**: I deliberately did NOT propose touching `prisma/schema.prisma` (Post.groupId,
  GroupPost, GroupMember) - GroupMember is live as the Catch-up privacy container, and column
  drops are an owner call routed through the manual-migrations rule; see Owner decisions.
  Related: feed-posts-13 (the props that remain on PostFeed/FeedColumn after this).

### feed-posts-02 - Decompose create-post-form.tsx: extract the letter-persistence engine and the upload pipeline into hooks
- **Where**: `src/components/posts/create-post-form.tsx` - responsibility map by line range:
  77-133 local-draft helpers (57); 135-263 props + state block (129); 285-435 hydration,
  crash-net write/flush, restore-offer effects (151); 437-528 the autosave engine (92);
  530-598 the exit-save (69); 600-662 collapse/measure/outside-click (63); 664-734 rich-input,
  shortcuts, paste, mention insert (71); 736-870 upload pipeline (135); 872-1021 submit (150);
  1023-1545 `editorBody` JSX (523); 1547-1683 the two shells (137).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: 1,683 lines, 1,041 code / 561 comment (cloc). It is the app's biggest client
  file (`use-client.txt` row 1 outside lab). It is genuinely ONE composer - scope post/letter,
  inline and immersive, fresh and resumed-draft - so the ROADMAP decision is honoured and no
  split should reintroduce a second editor. But three of its subsystems are self-contained
  machines that read/write only their own refs and a handful of state setters: (a) the
  letter-persistence engine - localStorage crash net (103-133, 297-435), autosave (437-528),
  exit-save (530-598) - about 310 lines that interlock through `savedSnapshotRef`,
  `baseUpdatedAtRef`, `autosaveRunRef`, `submittingRef` and nothing else; (b) the upload
  pipeline - `uploadViaPresign`, `uploadOneFile`, `handleImageFiles`, `removeImage`,
  `revokeBlobPreviews` (94-107, 736-870) - about 150 lines whose only contract with the rest
  is `images`/`previews`/`uploading`/`uploadProgress`; (c) the editor-body JSX (1041-1545),
  half of which is design-history comments that must move with their lines.
- **What to do**: Extract (a) as `src/components/posts/use-letter-persistence.ts` - takes
  `{userId, postId, defaultLetter, content, title, images, audienceCity, initialContent,
  initialTitle, initialImages, initialCityScope, initialUpdatedAt, onAutosaveState}` and
  returns `{baseUpdatedAtRef, savedSnapshotRef, autosaveRunRef, disarmAutosave,
  markSaved(snapshot), clearLocalDraft, restoreToast}` - moving the four effects and the two
  module-level helpers verbatim, comments included. Extract (b) as
  `use-composer-uploads.ts` returning `{images, previews, uploading, uploadProgress,
  handleImageFiles, removeImage, resetImages}`. The component drops to roughly 1,100 lines
  (state + submit + JSX), and the two machines become independently readable and testable.
  MANDATORY in the same commit: `composer-rule.test.mjs` reads
  `src/components/posts/create-post-form.tsx` by path and asserts on
  `onAutosaveState?.("failed")`, `localStorage`, `clearLocalDraft`, `revokeObjectURL`,
  `pagehide` etc. - point the relevant reads at the new hook files (the test already reads
  six different files, so adding two paths is its normal shape).
- **Saving**: ~0 net lines (this is a move, not a cut - honest answer); the win is that the
  biggest client file in the app stops being a single 1,683-line closure, and the
  letter-persistence machine (the most audit-scarred code in the repo: C-014, C-175, C-176,
  C-177, B-043, M66 all live here) becomes a unit with a namable API.
- **Risk & gate**: medium-high - this is the exact code five audits bled on, and the refs
  interlock. Gates: `npm run check` (composer-rule.test.mjs is the pin), then manual: write a
  letter at `/letters/new`, kill the tab mid-sentence, reopen (crash-net); resume a draft on
  two tabs (version guard); post with photos on the feed.
- **Confidence**: medium. The thing that would change my mind: if the fixer finds the ref
  interlock cannot be passed across a hook boundary without widening the API to 15 params -
  at that point stop and keep the file whole; a 1,683-line file that is correct beats an
  elegant split that reintroduces C-175.
- **Notes**: I considered and rejected splitting `editorBody` into a separate component: it
  closes over 20+ pieces of state, and prop-drilling them is worse than the length. I also
  rejected "convert to RichTextArea": the composer needs mentions, placeholder-as-attr and
  immersive styling that RichTextArea (103 lines, used by the edit dialog and catch-ups)
  does not carry, and merging them would grow the shared primitive for one caller. The
  comments are load-bearing history; do not trim them in this pass (brief 4d).

### feed-posts-03 - One include-builder and one serializer for loadPosts / loadSavedPosts
- **Where**: `src/app/(main)/feed/actions.ts:1196-1217` vs `:1362-1387` (the `include` object,
  written twice); `:1279-1310` vs `:1397-1425` (the row -> payload mapping, written twice);
  `:1197-1207` vs `:1365-1375` (the author select, written twice - a third sibling constant,
  `COMMENT_AUTHOR_SELECT`, already exists at :35-45 for comments).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd flags all three pairs (1196:19-1210:29 = 1364:18-1378:35,
  1279:23-1292:18 = 1397:33-1410:18, 1293:44-1303:49 = 1411:35-1421:49). The two copies have
  already sprouted deliberate-looking accidental differences: loadPosts writes
  `bookmarked: p.bookmarks.length > 0` where loadSavedPosts hardcodes `bookmarked: true`, and
  the poll reducers differ only in variable naming (`sum` vs `s`). This is the exact drift
  shape audit C-004 fixed one level up (count vs list answering different questions).
- **What to do**: Above the two loaders add `const POST_AUTHOR_SELECT = {...} as const`
  (mirroring COMMENT_AUTHOR_SELECT), `function postInclude(userId: string)` returning the
  include object, and `function serializePost(p, viewer: { userId, isAdmin },
  overrides?: { bookmarked?: true })` returning the payload; call them from both loaders
  (loadSavedPosts passes `{ bookmarked: true }`). Keep the return shapes byte-identical -
  PostData on the client is the contract.
- **Saving**: ~55-65 lines in actions.ts, and the two feeds can no longer disagree about what
  a post payload is.
- **Risk & gate**: low. `npm run check` (feed-write-rule.test.mjs pins fragments of this file
  with comments stripped - its assertions are on the keyset/clamp/audience code, not the
  serializer, but re-run to be sure); open `/feed` and a profile's Saved tab; TypeScript will
  catch any payload-shape slip because PostFeed/SavedPostsFeed type against PostData.
- **Confidence**: high. Nothing would change my mind short of a hidden consumer of the small
  payload differences, and I checked: `bookmarked` is the only one, and it is intentional.
- **Notes**: If feed-posts-01 lands first, `groupId` drops out of both serializers and this
  helper is smaller still. Optional follow-on (same concept, bigger move): lift loadPosts,
  loadSavedPosts, loadComments and their helpers (~540 lines) into
  `src/app/(main)/feed/queries.ts` so actions.ts holds only writes - SLOC-neutral, clarifies
  the gate-coverage story (its config at gate-coverage.test.mjs:225 lists write actions in
  this file), but requires updating feed-write-rule.test.mjs's `read()` path and the
  gate-coverage file map in the same commit. I rank the dedupe as the value and the file
  split as optional taste; do the dedupe even if the split is declined.

### feed-posts-04 - Dynamic-import the behind-interaction weight in the post stack
- **Where**: `src/components/posts/post-card.tsx:23-27` (static imports of `CommentsSection`
  718 lines, `ReportDialog` 137, `EditPostDialog` 121 + `RichTextArea`, `ModerationDialog`,
  `ImageViewer` 444 via `common/image-viewer`); `src/components/posts/create-post-form.tsx:24-25,14`
  (`PollCreator` 107, `MentionDropdown` 125, `AttachImageDialog` 184).
- **Phase**: architecture (Next.js lever)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/feed` is 1,100 KB route JS / 1,530 KB first load (route-js.txt), the
  4th-heaviest page in the app, and there is exactly ONE `next/dynamic` in the whole codebase
  (brief 4f). Every one of the named components renders only after an interaction: comments
  after the toggle (post-card.tsx:495 gates on `showComments`), the viewer after a photo tap
  (`viewerAt !== null`), edit after the menu (`showEdit &&`), moderation behind
  `viewerIsAdmin`, the poll creator behind `pollOptions !== null`, the mention dropdown
  behind `mentionQuery !== null`, the attach dialog behind its trigger. Yet all are in the
  feed's initial bundle because the imports are static. ReportDialog alone is deliberately
  always-mounted (post-card.tsx:517-519, for its close animation) - a dynamic import with
  `loading: () => null` preserves that once loaded.
- **What to do**: In post-card.tsx: `const CommentsSection = dynamic(() =>
  import("./comments-section").then(m => m.CommentsSection), { ssr: false })` and likewise
  for ImageViewer, EditPostDialog, ModerationDialog; in create-post-form.tsx the same for
  PollCreator, MentionDropdown, AttachImageDialog. Keep ReportDialog static OR dynamic with
  its mount semantics unchanged (it must stay rendered once `showReport` has ever been true,
  which the current always-mounted pattern already does). Watch two traps: CommentsSection
  sits inside `AnimatePresence` (post-card.tsx:494) - a dynamic child that resolves late will
  skip its open animation on the very first toggle, which is acceptable, but verify the exit
  animation still runs; and MentionDropdown appearing on first "@" will have a one-network-
  round-trip delay - acceptable, it already debounces 200ms.
- **Saving**: 0 source lines; a real cut to `/feed`'s initial client JS - the moved components
  total ~1,850 component lines plus their private deps (auto-animate in comments, the viewer's
  gesture code). Exact KB is the bundle lens's to measure; on line-weight alone this is
  plausibly 10-15% of the route's non-shared JS.
- **Risk & gate**: low-medium. `npm run visual` (10 routes), open `/feed`, open comments, open
  a photo, edit a post, report a post; `composer-rule.test.mjs` asserts `onSaved=\{` in
  post-card - a dynamic wrapper keeps the JSX so it still matches.
- **Confidence**: high on the mechanics, medium on the exact KB (the shared chunks may
  already contain motion/auto-animate via other routes).
- **Notes**: The bundle lens owns the app-wide sweep; I flag these because I can see the
  interaction gates from inside the files. The composer itself must stay static: its
  collapsed pill is above-the-fold UI.

### feed-posts-05 - One pager: fold ProfileAuthorFeed's machinery into a shared hook and use appendUnseen everywhere
- **Where**: `src/components/posts/post-feed.tsx:56-66,108-162,226-267` (state block, first-page
  effect, handleLoadMore) vs `src/components/profile/profile-author-feed.tsx:42-105` (the same
  three, minus generation tracking); inline id-dedupe copies at `post-feed.tsx:255-258`,
  `profile-author-feed.tsx:93-96`, `comments-section.tsx:139-144` while `src/lib/append-page.ts`
  exports `appendUnseen` (written for exactly this, audit C-071) with ONE caller
  (`collection-client.tsx:200`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: post-feed 60:34-68:10 = profile-author-feed 42:52-49:10 (9 lines),
  131:58-141:25 = 63:71-73:25 (11), 245:56-269:8 = 88:81-107:8 (25). ProfileAuthorFeed's own
  comments admit the copying: "Synchronous guard and an id-dedupe, the same pair PostFeed
  carries and for the same reason (audit C-180)". Meanwhile post-feed.tsx:26-27 carries a
  STALE comment - "`author` is reserved for a later batch (needs loadPosts support)" - but
  loadPosts has taken `authorId` for some time (actions.ts:1110), and ProfileAuthorFeed uses
  it; the "later batch" happened and the note never came down.
- **What to do**: Two options; I recommend (a). (a) Extract
  `src/components/posts/use-paged-posts.ts`: takes `fetchPage(cursor)` and returns `{posts,
  loading, loadingMore, hasMore, loadMore, resetOn}` carrying the generation counter, the
  synchronous re-entry ref, the callAction error handling, the finally-resets and the
  appendUnseen dedupe once; PostFeed and ProfileAuthorFeed keep their own chrome
  (filters/divider vs sheet/cards) on top. (b) The full ROADMAP shape - ProfileAuthorFeed
  becomes `<PostFeed scope="author">` - is larger and fights the layout="sheet|cards"
  variants; not worth it. Independently and trivially: replace the three inline Set+filter
  blocks with `appendUnseen` from lib (comments-section's `mergeComments` becomes
  `setComments(prev => appendUnseen(prev, incoming))`). Delete the stale FeedScope comment.
- **Saving**: ~60-75 lines net, and the C-180/B-042/Low-75 machinery exists once instead of
  2.5 times (comments-section shares the ref-guard shape too).
- **Risk & gate**: low-medium. `npm run check`; open `/feed` (load more, change filter
  mid-flight), a profile Posts tab, a comment thread past its first page.
- **Confidence**: high for appendUnseen adoption and the stale comment; medium for the hook
  (the generation/reset semantics differ slightly - PostFeed resets on filter change,
  ProfileAuthorFeed remounts by key - the hook must serve both without inventing options,
  else keep two copies and accept the duplication as boundary cost, per brief 4a.4).
- **Notes**: saved-posts-feed.tsx is single-page (no pager) and stays out. Related:
  feed-posts-13 strips PostFeed's dead props first, which shrinks what the hook must carry.

### feed-posts-06 - One optimistic heart/bookmark handler instead of three
- **Where**: `src/components/posts/post-card.tsx:167-235` (`likeBusy`/`bookmarkBusy` refs,
  `handleLike`, `handleBookmark`, ~69 lines) vs `src/components/letters/letter-engagement.tsx:41-89`
  (the same two, near-verbatim, ~49 lines) vs `src/components/posts/comments-section.tsx:591-612`
  (CommentItem's `handleLike`, same pattern against `toggleCommentLike`, ~22 lines).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: letter-engagement 53:62-73:17 = post-card 178:63-194:17 (21 lines).
  letter-engagement.tsx:41-42's comment says it out loud: "the same refs the feed card
  carries (audit C-010/C-178)". All three funnel through `settledHeart` (lib/heart.ts) - the
  settle rule is already shared; only the busy-ref + optimistic-flip + revert + settle
  choreography is copied.
- **What to do**: Add `src/lib/use-heart.ts` (or components/common):
  `useOptimisticToggle({ current, count?, action, onSettle })` returning `{busy, fire}` that
  owns the ref-guard, the optimistic flip, the error revert + toast, and the
  `settledHeart`-based adoption. PostCard's like + bookmark, LetterEngagement's like +
  bookmark, and CommentItem's like become one-line calls. Keep the `demo` early-return in
  PostCard outside the hook (it is PostCard-specific).
- **Saving**: ~50-60 lines across three files; every future heart (Collection already has
  PhotoLove) gets C-010/C-133 behaviour for free instead of by copying.
- **Risk & gate**: low. `npm run check` (heart.test.mjs pins settledHeart, untouched); tap a
  heart on `/feed`, on a letter page, on a comment; double-tap each.
- **Confidence**: high. CommentItem's variant updates parent state via `onLikeToggle` rather
  than local state - the hook's `onSettle` callback shape covers it, but if it contorts, do
  just the post-card/letter-engagement pair and leave the comment one.
- **Notes**: The Collection detail page likely has a fourth copy for PhotoLove
  (outside my territory - collection agent should check `collection/[id]`).

### feed-posts-07 - Share the upload-route preamble and the display-WebP recipe across the three /api/upload routes
- **Where**: `src/app/api/upload/route.ts:21-48`, `src/app/api/upload/presign/route.ts:28-53`,
  `src/app/api/upload/finalize/route.ts:43-69` (origin check + auth + verified-member gate +
  uploads rate limit, ~26 lines each, byte-similar); `route.ts:148-155` vs
  `finalize/route.ts:140-144` (the `.rotate().resize(1920,1920,{fit:"inside",
  withoutEnlargement:true}).webp({quality:80})` recipe + `putImage(...ownerPrefix("uploads"...)`,
  the pair jscpd flags at 32 lines / 172-175 tokens).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: finalize 40:93-71:14 = presign 8:50-55:14 (32 lines, 175 tokens);
  finalize 40:93-71:6 = upload/route 19:20-50:6 (32 lines, 172 tokens). The three preambles
  differ only in one comment per file. The recipe comment in finalize says "same recipe as
  the classic /api/upload proxy route" - stated sameness maintained by hand is drift waiting
  (the repo's own C-073 lesson: M15 was fixed on one upload path and missed on three).
- **What to do**: (1) Add `vetUploadRequest(request)` to a small
  `src/app/api/upload/_shared.ts` (or lib/upload-server.ts): runs originAllowed -> auth ->
  requireVerifiedMember -> rateLimit("uploads") and returns
  `{ ok: true, userId } | { ok: false, response: NextResponse }`; each route becomes
  `const vet = await vetUploadRequest(request); if (!vet.ok) return vet.response;`. Keep each
  route's one distinguishing comment (e.g. presign's "the most important of the three
  gates...") above the call. (2) Add `toDisplayWebp(buffer)` beside it wrapping the
  sharpImage recipe; both processing routes call it, so "same recipe" becomes true by
  construction.
- **Saving**: ~55-65 lines across the three routes.
- **Risk & gate**: medium - these are security-pinned files. `upload-size-rule.test.mjs` and
  `image-purge-rule.test.mjs` read `api/upload/route.ts` and `finalize/route.ts` as text
  (image-purge-rule:111-112); confirm their matched fragments (the purge calls, the abort
  shapes, MAX_UPLOAD_BYTES usage) survive, and update the tests' expectations in the same
  commit if a matched line moves into `_shared.ts`. Also `security-regressions.test.mjs` must
  stay green. Gate: `npm run check`, then upload a photo via composer on a dev server with
  and without R2 env (both paths).
- **Confidence**: medium-high. The thing that would change my mind: if the rule tests pin the
  gate ORDER inside each route file by text - then the helper hides the order from the pin
  and weakens the regression net; in that case extract only `toDisplayWebp` and leave the
  preambles as accepted boundary duplication.
- **Notes**: On the charter's "are there three upload paths where one would do": no - the
  classic proxied `/api/upload` is the live fallback (dev without R2; presign CORS failure)
  and the live path for `message-composer.tsx:74` and catch-up `photo-attachments.tsx:85`,
  while presign+finalize is the composer/Collection path. Both must stay; docs/spec/media.md
  predates the presign pair (it documents only the proxy route + the old 5MB cap) and is
  marked superseded at the top already. The consolidation question that IS open - should
  messages/catch-up attachments adopt `directUploadPut` - belongs to their territories; noted
  under "For other lenses".

### feed-posts-08 - One read-time + one excerpt helper; two surfaces currently miss the image-bang fix
- **Where**: read-time formula inline 4x: `src/components/posts/post-card.tsx:154-157`,
  `src/app/(main)/letters/page.tsx:35-37`, `src/app/(main)/letters/[id]/page.tsx:113`,
  `src/components/feed/rail/letters-module.tsx:61-64`. Hand-rolled markdown-stripping
  excerpt 2x: `post-card.tsx:147-153` (`letterPlain`/`letterExcerpt`),
  `letters/page.tsx:39-45` (`excerpt`) - while `lib/utils.ts:616-628` `plainExcerpt` is the
  shared one (letters-module already uses it).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: All four read-time copies are the identical
  `Math.max(1, Math.round(words / 200))` (grep transcript in audit session). The two
  hand-rolled excerpts use `/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g` WITHOUT the preceding
  image rule `/!\[[^\]]*\]\([^)]*\)/g` that `plainExcerpt` carries - utils.ts:618-623
  documents the exact bug ("leave a stray '!' in front of the alt ('!banyan')", audit
  Low 88): a letter that OPENS with a photo shows `!<alt text>` in its feed-card excerpt
  today and in the letters-index excerpt today. So this dedupe deletes a latent visible bug
  twice.
- **What to do**: Add `export function readMinutes(content: string): number` to lib/utils.ts
  (beside plainExcerpt); replace the four inline copies. Replace post-card's
  letterPlain/letterExcerpt with `plainExcerpt(content, 200)` and letters/page's `excerpt`
  with `plainExcerpt(content, 240)` (both callers' local caps map to the maxLen param;
  plainExcerpt truncates by graphemes, which is strictly better than the callers'
  `.slice()`+`"..."` - keep the callers' trailing "..." behaviour by checking length, or add
  it inside plainExcerpt's existing truncateGraphemes if it already appends an ellipsis -
  verify against a long letter).
- **Saving**: ~20-25 lines, minus ~5 for the new helper; plus two visible-bug fixes for free.
- **Risk & gate**: low. `npm run visual` (feed + letters are baselined routes); eyeball a
  letter card whose content starts with `![...](...)`.
- **Confidence**: high.
- **Notes**: letters/page.tsx is member-surfaces' file; the finding spans the boundary
  because the fix is one shared helper - flagged for the orchestrator to merge rather than
  double-fix.

### feed-posts-09 - The composer re-implements two rich-text helpers the lib already exports
- **Where**: `src/components/posts/create-post-form.tsx:689-700` (`handleEditorKeyDown`)
  duplicates `src/lib/rich-text-editing.ts:84-99` (`applyFormatShortcut`);
  `create-post-form.tsx:705-714` (`handlePaste`) duplicates `rich-text-editing.ts:104-112`
  (`insertPlainTextPaste`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: The composer's own header comment (lines 50-52) says the helpers "moved to
  src/lib/rich-text-editing.ts (2026-08-13) so every writing surface ... shares one story" -
  but the composer only imports `FORMAT_SHORTCUTS`, `computeMentionRange`,
  `serializeEditableToMarkdown`; the two handler bodies stayed behind as copies.
  `rich-text-area.tsx:82-85` shows the intended call shape:
  `if (applyFormatShortcut(e)) mirror();` / `insertPlainTextPaste(e); mirror();`.
- **What to do**: Replace `handleEditorKeyDown`'s body with
  `if (applyFormatShortcut(e)) handleRichInput();` and `handlePaste`'s with
  `insertPlainTextPaste(e); handleRichInput();`; import both; drop the now-unused
  `FORMAT_SHORTCUTS` import. The duplicated execCommand comments live in the lib copy
  already, so nothing is lost.
- **Saving**: ~16 lines and one less place for the keyboard story to drift.
- **Risk & gate**: low. `npm run check`; Cmd+B/I/U and a formatted paste in the composer.
- **Confidence**: high. The bodies are semantically identical (same guard, same
  preventDefault, same try/catch no-op).

### feed-posts-10 - parseImageUrls is parseJsonArray, written again
- **Where**: `src/app/(main)/feed/actions.ts:47-58` vs `src/lib/utils.ts:90-98`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Byte-equivalent semantics: null/undefined -> [], JSON.parse in try,
  Array.isArray gate, `filter(typeof === "string")`, catch -> []. utils' version even has the
  type-predicate form. actions.ts uses its copy 5 times (:107, :211, :602, and via
  deletePostWithImages).
- **What to do**: Delete `parseImageUrls` (and its 4-line doc comment, whose "bad JSON reads
  as no images, never as a throw" sentence should move onto the first call site or the utils
  doc), import `parseJsonArray` from `@/lib/utils`, rename the 5 call sites.
- **Saving**: ~12 lines.
- **Risk & gate**: low; utils is dependency-free of client-only code (rail server components
  already import it). `npm run check`.
- **Confidence**: high.

### feed-posts-11 - Import the one `insensitive` gate instead of re-deriving it
- **Where**: `src/app/(main)/feed/actions.ts:129-134`; same pattern in
  `src/app/(main)/collection/actions.ts:491-494` (neighbour, named for the merge).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `lib/db-text.ts:12-14` defines `export const insensitive` under the comment
  "The one definition of the Postgres-only `mode: "insensitive"` gate (audit R6)";
  `city-scope.ts:3` and `directory/where.ts:2` already import it. feed/actions.ts re-derives
  `IS_POSTGRES` + `searchInsensitive` locally with the same 4-line comment - the exact
  paste-and-drift shape R6 is about.
- **What to do**: `import { insensitive as searchInsensitive } from "@/lib/db-text";` and
  delete lines 129-134. Same one-liner in collection/actions.ts.
- **Saving**: ~10 lines across the two files.
- **Risk & gate**: low. `npm run check`; feed search still case-insensitive on `/feed?q=`.
- **Confidence**: high.

### feed-posts-12 - Type-only import cycle: move RailViewer out of feed-rail.tsx
- **Where**: `src/components/feed/feed-rail.tsx:22-29` (defines `RailViewer`, imports
  `LettersModule`) <-> `src/components/feed/rail/letters-module.tsx:12`
  (`import type { RailViewer } from "../feed-rail"`).
- **Phase**: hygiene (architecture-adjacent)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: madge-circular.txt line 50: `components/feed/feed-rail.tsx >
  components/feed/rail/letters-module.tsx` - one of the 5 real cycles in the app. It is
  type-only (erased at runtime) so it is harmless today, but it is a fifth of the app's real
  cycle count and one `import type` away from zero.
- **What to do**: Move the `RailViewer` type (with its B-045 doc comment) into
  `src/components/feed/rail/rail-viewer.ts` (or into letters-module.tsx and re-export);
  update the two importers (feed-rail, letters-module) and `feed/page.tsx`'s usage is via
  FeedRail's props so unchanged.
- **Saving**: 0 lines; one real madge cycle gone.
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.

### feed-posts-13 - Strip PostFeed/FeedColumn props no caller can reach
- **Where**: `src/components/posts/post-feed.tsx:26-27` (stale FeedScope comment + unused
  `"author"`/`"letters"`/`"group"` values), `:43-44` (`emptyTitle`/`emptyHint` - no caller of
  PostFeed or FeedColumn passes them; only ProfileAuthorFeed has its own, used by
  letterhead-profile), `src/components/posts/feed-column.tsx:16-17,20-22,28-29,34-35`
  (`scope`, `composerScope`, `placeholder`, `emptyTitle`, `emptyHint` - `feed/page.tsx:83-89`
  is the ONLY caller and passes none of them).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep across src (lab excluded): FeedColumn rendered once (feed/page.tsx:83);
  PostFeed rendered once (feed-column.tsx:55). No `scope=`, `composerScope=`, `emptyTitle=`,
  `emptyHint=`, `placeholder=` at either site. The `scope === "letters"` branch in
  post-feed.tsx:113 maps to `kind: "letter"` for a scope nothing sets. The `"author"` value
  carries a comment claiming loadPosts support is missing, which is false (actions.ts:1110).
- **What to do**: If feed-posts-01 lands, do this in the same commit: reduce `FeedScope` to
  what is used (or delete the type and the `scope` prop entirely - the one live value is
  "all"), drop `emptyTitle`/`emptyHint`/`placeholder`/`composerScope` from both components,
  and delete the stale comment. If the owner wants `/saved` as a route later (ROADMAP Phase
  13 "reusing <Feed>"), the props are one commit away in git history - dead code is not a
  feature reservation (goal-sloc).
- **Saving**: ~25-30 lines.
- **Risk & gate**: low. `npm run check`; `/feed` renders, empty-state copy unchanged (the
  defaults inline).
- **Confidence**: high.

### feed-posts-14 - Share the report-action preamble within the file
- **Where**: `src/components/posts/report-action.ts:77-104` vs `:221-247` (auth, IS_DEMO
  refusal, verified gate, reports rate limit, thread rate limit, reason typeof/trim/length -
  six identical gates, ~28 lines each).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: jscpd: 79:106-112:8 = 224:85-250:8 (34 lines, 122 tokens) and 180:17-202:27 =
  284:25-303:27 (23 lines). The file itself argues for parallelism ("The two report paths are
  kept the same shape on purpose: half-fixing one of a matched pair is how this codebase has
  drifted before", :277) - which is an argument FOR a shared helper, not against: one
  `vetReport(reason)` returning `{ ok: true, session, trimmed } | { ok: false, error }`
  makes the pairing structural instead of visual.
- **What to do**: Extract the six-gate preamble into a file-local `async function vetReport(
  reason: string)` used by both exports; keep each export's distinguishing comment (reportUser's
  "doubly so here" H5 note) at its call site.
- **Saving**: ~30-35 lines.
- **Risk & gate**: low-medium: both actions appear in rate-limit/demo pins - check
  `security-regressions.test.mjs` and `gate-coverage.test.mjs` fragments still match (the
  gates remain in-file, so text pins on `requireVerifiedMember()` per-file still hit).
  `npm run check`.
- **Confidence**: medium-high; downgrade to "leave it" if gate-coverage matches per-export
  rather than per-file (its exportedActions scan at :155 works per file, so a shared helper
  inside the same file should still satisfy it - verify).

### feed-posts-15 - Micro-hygiene sweep in territory
- **Where**: `src/app/(main)/feed/actions.ts:60` (an orphaned one-line docstring "Best-effort
  cleanup of a post's stored image files, in parallel." immediately above the real M17
  docstring - a leftover from the pre-M17 version); `src/lib/content-view.ts:11` (`ViewKind`
  includes `"post"`, but `recordView` is called with profile/letter/photo/round only - posts
  have no detail route, so the value is unreachable); `src/app/api/upload/route.ts:7-14` (a
  mangled import block: blank line inside the braces, `stillPictureNotice,}` - formatting
  scar).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: quoted above; each verified by grep (recordView callers listed in session:
  collection/[id], letters/[id], profile/[id], catchups/round).
- **What to do**: Delete the stale docstring line; drop `"post"` from ViewKind (or leave with
  a one-line "reserved: posts have no detail route" comment if the owner expects one - my
  read is drop, git remembers); let the next edit of upload/route.ts tidy the import block
  (not worth its own commit).
- **Saving**: ~4 lines.
- **Risk & gate**: trivial. `npm run check`.
- **Confidence**: high.

## Owner decisions

1. **The Groups residue in the database.** The Groups feature is gone from the product: no
   route, the composer refuses group posts, and zero rows in Post carry a groupId. Finding
   feed-posts-01 removes the dead code, but the schema still holds `Post.groupId` and the
   groups tables, and `GroupMember` is genuinely still in use as the invisible privacy
   container behind people-started Catch-ups. My recommendation: take the code cleanup now
   (it is safe and reversible), keep the schema exactly as it is (dropping columns on the
   one live database is not worth any amount of tidiness before launch), and record in the
   schema comment that Post.groupId is retired. If you ever want group feeds back, they
   should be rebuilt on the shared Composer/Feed/PostCard anyway (ROADMAP Phase 7's plan),
   so nothing real is lost.

2. **Two upload doors on purpose.** Photos travel to storage two ways: the modern direct
   path (browser to storage, full 20MB originals - used by the post composer and the
   Collection) and the older through-the-server path (capped ~4.5MB by Vercel, photos
   shrunk in the browser first - used by messages and Catch-up answers, and as the automatic
   fallback everywhere). Both are live and needed today. The open question is whether
   messages and Catch-up attachments should move to the direct path too, so attachment
   quality matches posts and one door could eventually close. That is a small UX improvement
   with real testing cost. Recommendation: not before launch; park it in FEATURES.md.

3. **The media spec is stale where it matters.** `docs/spec/media.md` still describes only
   the old upload route and a 5MB cap; the presign/finalize path that actually carries
   post photos exists nowhere in the specs. The docs lens owns doc bloat, but this one is a
   correctness gap a future session will trip on. Recommendation: a short "how uploads work
   now" section, or a pointer from media.md to the route files' own header comments.

## Not-findings

- **The comment density of `upload-shared.ts` (175 comment / 104 code) and of the whole
  territory.** Sampled line by line: the comments carry audit IDs (M10, M13-M17, C-064,
  C-066, C-072, C-073, C-158, C-169...), owner quotes and dates. This is the owner's
  documented standard ("every constant argued for in a comment") and brief 4d protects it.
  Do not send a comment-trimming pass through this territory.
- **`post-visibility.ts` vs `post-visibility-rule.ts` are NOT the same rule twice.** The
  split is pure-decision (no imports, unit-testable by node, pinned by
  post-visibility-rule.test.mjs) vs database-plumbing (`cache()`d fetches), and the rule
  file's header explains it against audit H17. Same verdict for
  `upload-ownership.ts`/`upload-ownership-rule.ts` (the rule file's header names the exact
  runner constraint: "a -rule file that imports a sibling .ts cannot be executed by the
  test runner") and for `draft-rule.ts`/`post-caps.ts`/`rich-truncate.ts` being tiny
  standalone modules - each header names the import-resolution reason.
- **Keyset pagination is implemented once**, in `lib/keyset.ts`, consumed by loadPosts,
  loadComments and (per its header) the bell; count-sorts fall back to clamped offset with
  the reason argued at actions.ts:1241-1249. The charter's floor question is answered: no
  per-surface copies.
- **`edit-post-dialog.tsx` vs the composer is not a parallel path.** The dialog is the
  owner's explicit register decision (file header: "the dialog register is for things that
  take seconds, never for writing", owner 2026-07-30), is 121 lines, and builds on the
  shared `RichTextArea`/`editPost`. The letters desk likewise wraps `CreatePostForm`
  ("extracted nothing, forked nothing", letter-desk.tsx:16-17). The ROADMAP's one-Composer
  decision is honoured.
- **Rail modules do not re-implement cards.** All four sit on `RailCard`; letters-module
  uses the shared `plainExcerpt`/`letterTitle`/`metaLine`; directory-module uses
  `IdentityRow`. The only shared-code slip is the read-time inline copy (feed-posts-08).
- **knip's "unused exports" in this territory are test-consumed.** `storedPixelFit`,
  `WEBP_MAX_DIM`, `MAX_STORED_PIXELS`, `MAX_INPUT_PIXELS`, `UPLOAD_BODY_LIMIT`,
  `MAX_IMAGES`, `MAX_IMAGE_URL`, `ownUploadsPrefix`, `batchTargetsInclude` are all imported
  by sibling `.test.mjs` files (verified by grep; e.g. image-fit.test.mjs imports four of
  them from `./image.ts`). Knip has no test entry configured (brief 3). Do not de-export.
- **The 17 repetitions of the two-line auth preamble in feed/actions.ts** (`const session =
  await auth(); if (!session?.user?.id) return {error}`) are left alone deliberately: a
  helper cannot early-return for its caller, the repo idiom is explicit gates that
  gate-coverage.test.mjs scans per-export, and the saving is ~2 lines a site. Anti-gaming
  rule 4b: not worth the churn.
- **`markFeedSeen`'s silent-in-production failure** looks like swallowed error handling but
  is argued (actions.ts:1615-1619) and mirrors the CLAUDE.md `touchLastSeen` doctrine.
- **`loadSavedPosts` having no keyset** is deliberate: "a keepsake shelf rather than a
  feed" (actions.ts:1320-1321, audit Low 76 added the `capped` honesty).

## For other lenses

- `src/app/(main)/letters/[id]/edit/loading.tsx` and `letters/new/loading.tsx` are
  byte-identical 18-line files (jscpd) - member-surfaces can share one component.
- `src/components/messages/message-composer.tsx:74` and
  `src/components/catchups/answer/photo-attachments.tsx:85` each hand-roll a `/api/upload`
  fetch + notices loop the composer also has (`uploadOneFile`); a shared client helper
  (or adoption of `directUploadPut`) is their territories' version of feed-posts-07.
- `src/components/common/rich-text-area.tsx` (shell-primitives): healthy; it is the proof
  of the composer's duplicated handlers (feed-posts-09).
- `src/components/common/image-viewer.tsx` (444 lines, client): loaded in the feed bundle
  though it opens only on tap - covered by feed-posts-04, flagged for the bundle lens.
- `/feed` at 1,530 KB first-load and `/letters/*` at ~1,400 KB (route-js.txt) - bundle
  lens headline numbers.
- `src/components/profile/profile-author-feed.tsx` and `saved-posts-feed.tsx` (profile
  territory) are the counterparties of feed-posts-05; saved-posts-feed is clean.
- `src/app/(main)/collection/actions.ts:491-494` re-derives `insensitive` (feed-posts-11's
  twin) and `collection/[id]` likely holds a fourth optimistic-heart copy (feed-posts-06).
- `docs/spec/media.md` staleness - see Owner decision 3 (docs lens).

## Metrics

- Lines read: ~7,120 in-territory (3 feed app files 1,784; 3 upload routes 440; 7 feed
  components 405; 11 posts components 4,484; 20 lib files 1,771 per wc -l) plus ~1,600
  boundary lines (profile feeds, letters components/pages, rule tests).
- Biggest files: create-post-form.tsx 1,683 (1,041 code / 561 comment); feed/actions.ts
  1,648 (1,035 / 474); comments-section.tsx 718 (546 / 140); post-card.tsx 548 (434 / 84);
  post-feed.tsx 431 (318 / 91).
- Comment-heaviest (ratio): upload-shared.ts 1.68 (175/104), image.ts 1.63 (83/51),
  keyset.ts 1.96 (51/26), post-visibility-rule.ts 1.04 - all verified why-comments.
- Duplication: 11 jscpd clone pairs inside the territory (6 internal to actions.ts /
  report-action.ts, 3 post-feed<->profile-author-feed, 2 across the upload routes) plus 4
  read-time copies and 3 optimistic-heart copies found by hand.
- Estimated honest line saving if every autonomous finding lands: ~330-390 lines
  (01: ~100, 03: ~60, 05: ~65, 06: ~55, 07: ~60, 08: ~20, 09: ~16, 10: ~12, 11: ~10,
  13: ~27, 14: ~32, 15: ~4, minus ~60 of new shared-helper lines), plus a material cut to
  /feed's client JS from feed-posts-04 (KB, not lines) and two latent visible bugs fixed
  (feed-posts-08).
- Rule tests that pin this territory and must ride along with any change here:
  feed-write-rule, composer-rule, gate-coverage, image-purge-rule, upload-size-rule,
  upload-shared, upload-ownership-rule, post-visibility-rule, image-fit, heart, keyset,
  rich-truncate, draft-rule, post-caps `.test.mjs` (all under src/lib/).
