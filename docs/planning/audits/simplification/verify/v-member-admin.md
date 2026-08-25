# Verifier notes: v-member-admin (2026-08-25, HEAD c74d99f+)

Cluster: member-surfaces-05/12/14/15, admin-analytics-03..06/08..13,
directory-profile-01..03/05/08..14, catchups-08..12/14, feed-posts-04/09..12/14/15.
All 38 checked at today's HEAD. Every quote below was read from the tree in this
session, not copied from the finder reports.

## MUST-verify items

### directory-profile-05 - CONFIRMED-WITH-CORRECTION
- `git log --diff-filter=D -- 'src/app/(auth)/onboarding*'` -> commit `c994c02`
  deleted `src/app/(auth)/onboarding/{actions,layout,page}.tsx`. Confirmed deleted.
- `src/lib/professions.ts:1-8` header still says the list "is what the onboarding
  'Industry' select already writes into User.workplace (src/app/(auth)/onboarding/page.tsx)"
  -- a file that no longer exists.
- Live writers of `workplace` are free text:
  1. `register-step.tsx:184-192`: `<Label htmlFor="workplace">Organisation</Label>` +
     `<Input ... placeholder="e.g. Apple">`.
  2. `letterhead-profile.tsx:1106-1108`: `value={form.workplace}` /
     `commitField("workplace")` pen hole.
  3. **CORRECTION: there is a third writer the finder missed** --
     `src/app/(main)/admin/people/actions.ts:144,184`: `const workplace = titleCase(edit.workplace)`
     then `workplace: workplace || null`. Also free text (title-cased), so the
     conclusion (nothing writes the PROFESSIONS vocabulary) is unchanged.
- Filter matches by equality: `where.ts:141` `if (filters.profession) where.workplace = filters.profession;`
  Whether any old rows still hold a vocabulary value is a DB question, but the
  structural claim stands.

### directory-profile-01 - CONFIRMED
- `letterhead-profile.tsx` module head statically imports `LocationPicker` (:54),
  `HouseChainEditor`, `ContactsEditor`, `AvatarCropDialog` (settings/avatar-crop-dialog),
  `AttachImageDialog`, `updateUserPlaces/requestAccountDeletion/updateAvatar/removeAvatar`
  from settings/actions -- all in one `"use client"` module.
- `profile/[id]/page.tsx` quote: `draft={ isOwnProfile ? { startEditing: edit === "1", ... } : undefined }`
  (verbatim, lines ~423-459). Edit machinery reachable only when `draft` present.
- `raw/route-js.txt` line 11: `/profile/[id]  page  1206  1636` -- #2 route, as claimed.

### directory-profile-08 - CONFIRMED
- Local `src/app/api/places/search/route.ts:55-57`:
  `function escapeLike(value: string) { return value.replace(/[\\%_]/g, (ch) => `\\${ch}`); }`
  -- no clamp. `raw` is taken at `req.nextUrl.searchParams.get("q")?.trim() ?? ""` with only
  a `< 1` minimum-length check, no max.
- Shared `src/lib/db-text.ts:56`: `return value.slice(0, SEARCH_TERM_MAX).replace(/[\\%_]/g, ...)`
  with `SEARCH_TERM_MAX = 100` and the C-015 docblock (clamp BEFORE escaping so a
  truncation cannot strand a lone backslash).

### admin-analytics-03 - CONFIRMED-WITH-CORRECTION
- `loadPeople` (`admin-analytics.ts:74-107`): Promise.all of exactly 13 queries
  (10 counts + userPlace findMany + 3 groupBy... counted: total, verified, blocked,
  dark, withPhoto, placed, active7, active30, neverSeen, joined30, byType, byBatch,
  byHouse = 13). Confirmed.
- ContentView (`page.tsx:301-`) calls `loadPeople()` and the ONLY `people.` read in
  its body is line 428: `${((catchups.people / Math.max(people.total, 1)) * 100).toFixed(0)}% of members`.
  **CORRECTION: `people.total` is used ONCE in ContentView, not "twice (427-428)".**
- FacesView: `people.total` once at :498. Confirmed.
- `loadPresence` (`admin-analytics.ts:387-448`): 7 queries -- live findMany
  (take 40, include user), recent findMany (take 25, include user), sessionAgg
  $queryRaw, byDevice/byOs/byPath groupBys, returning $queryRaw. RhythmsView
  (:459-479) renders only `presence.byDevice/byOs/byPath`. Confirmed.

### admin-analytics-06 - CONFIRMED
- Importers of `@/lib/admin-worklist`: only `src/app/(main)/admin/page.tsx` and
  `src/lib/admin-worklist-query.ts` (grep -rln whole of src).
- `admin/page.tsx` has NO `"use client"` (grep confirms); it imports
  `loadWorklist` from the query file and defines `WorkRow`/`QUEUE_ICON` itself
  (lines 39, 183-184) -- it is a server component.
- `admin-worklist-query.ts:4-5` banner: "Split from admin-worklist.ts for the
  usual reason: that one is imported by a client component and this one imports
  `prisma`." That justification is false at HEAD. Merge is safe for a server page.

### member-surfaces-05 - CONFIRMED
- `notice/[id]/page.tsx:7-8` header: "kept only so links already sitting in
  people's notification lists still work."
- Every remaining `/notice/` reference in src is a comment (messages/[id]/page.tsx:23,
  feed/actions.ts:512, moderation-dialog.tsx:20, admin-note.ts:13-14,
  admin-threads-server.ts:109). No live writer mints a `/notice/` link.
- `src/lib/retention.ts:41-42`: `/** Notifications: 1 year. Purely transient by design. */ notifications: 365,`
  -- so the shim's audience ages out; the retirement can be dated. Whether any
  legacy rows remain right now is a DB question, but "schedule the retirement" is sound.

### member-surfaces-12 - CONFIRMED
- Writers pin the columns, quoted: `collection/actions.ts:231-237`
  `// Subject tagging and the bird/species free-tag field were removed from the
  form (2026-07-18 rework); kept as empty/null ... subject: "", ... freeTags: null,`
  -- same shape again at :465-468 and `collection-intake.ts:147-150`.
- Whether older rows carry non-empty values (which decides whether the reader
  chips/search OR can go) is live-data -- the finding already frames it as a decide.

### catchups-08 - CONFIRMED
- Shared `answer/not-available.tsx`: `max-w-3xl`, `p-12`, `mt-2`, `mt-5`; docblock
  claims it mirrors the home's card "copy and shape exactly".
- Local copy `[catchupId]/page.tsx:486-511`: `max-w-2xl`, `p-[var(--space-l)]`,
  `mt-[var(--space-xs)]`, `mt-[var(--space-m)]`, carrying the comment "It was
  `p-12`: an arbitrary step ... (owner review 2026-07-25)". Same props/JSX shape,
  drift confirmed; the shared one missed the owner fix.

### feed-posts-09 - CONFIRMED
- `create-post-form.tsx:689-700` `handleEditorKeyDown` = `applyFormatShortcut`
  (`rich-text-editing.ts:84-99`) body-for-body (same metaKey/ctrlKey/altKey gate,
  FORMAT_SHORTCUTS lookup, preventDefault, execCommand try/catch) plus `handleRichInput()`.
- `:705-714` `handlePaste` = `insertPlainTextPaste` (:104-112) plus `handleRichInput()`.
- Composer imports from rich-text-editing only FORMAT_SHORTCUTS etc.; grep for
  `applyFormatShortcut|insertPlainTextPaste` in the composer: NOT_IMPORTED.

### feed-posts-04 - CONFIRMED-WITH-CORRECTION
- Static imports at `post-card.tsx:23-27` (CommentsSection, ReportDialog,
  EditPostDialog, ModerationDialog; ImageViewer via common) confirmed.
- Gates quoted: `{showComments && (` :495; `{showEdit && (` :526;
  `{post.viewerIsAdmin && ( <ModerationDialog ...` :538.
- **CORRECTIONS the fix session must respect:**
  1. `ReportDialog` is ALWAYS mounted, deliberately -- comment at :517-519:
     "Always mounted (not gated on showReport) so ReportDialog's own
     AnimatePresence can play the close animation". A naive `dynamic()` +
     conditional render would break that; `dynamic()` with the same always-mounted
     placement is fine but loads on render, not on interaction.
  2. `ImageViewer` is mounted whenever `images.length > 0` with `open={viewerAt !== null}`
     (:508-514) -- open-gated, not render-gated. Same nuance.
- `/feed` = 1100 KB route JS / 1530 first load, 4th heaviest (route-js.txt line 13,
  behind directory 1212, profile 1206, lab/profiles 1174). Confirmed.
- Composer: PollCreator behind `{!isLetter && pollOptions && (` :1162; MentionDropdown
  rendered at :1124 (behind mentionQuery logic); AttachImageDialog imported :14. Confirmed.

## Remaining findings (one load-bearing check each)

### member-surfaces-14 - CONFIRMED
bird-picker.tsx:19-21 "re-picking is allowed forever: the perk is standing, so
there is nothing to meter" vs support/actions.ts:232-240 "ONE PICK PER CONTRIBUTION
(owner, 2026-08-18) ... it is the comment that was wrong" (C-049). "fourteen-bird
plate" at bird-picker:10 and :101 and support/page.tsx:24 vs plate-data.ts:1-3
"The twelve birds ... Down from fourteen (owner, 2026-08-22)".

### member-surfaces-15 - CONFIRMED
dark-mode/loading.tsx exports `SettingsLoading` drawing 3 sections x 3 labelled
field rows of a settings card; the real page renders `<LightsOn />` or
`<DarkGauntlet word=...>` (page.tsx:26-29). letters/messages/collection loading
files each hold a `skeleton-warm h-4 w-80/96` subtitle bar while the pages carry
"No subtitle (owner, 2026-08-22)" comments (collection/page.tsx:36,
letters/page.tsx:118, messages/page.tsx:84).

### admin-analytics-04 - CONFIRMED-WITH-CORRECTION
content-list.tsx:100-119 and report-list.tsx:52-76 quoted; same
setBusy/callAction/toast/refresh/finally shape, same B-042 finally comment
(present in 6 admin component files, 8 occurrences). **Correction: the copies are
NOT verbatim-identical -- report-list also `router.refresh()` on the error branch
(audit M01 comment). The shared hook needs a refreshOnError variant or it loses M01.**

### admin-analytics-05 - CONFIRMED-WITH-CORRECTION
setParam duplicated (content-list:67-72 vs people-list:77-82) with the same
URLSearchParams body; **correction: not identical -- people-list wraps the
navigation in `startTransition`, content-list calls `router.replace` directly.
The shared toolbar must reconcile that difference deliberately.**

### admin-analytics-08 - CONFIRMED-WITH-CORRECTION
`STATUS` byte-identical in both files (5 states, same labels/tones). **Correction:
`SERIES_STATUS` differs by more than "omits active": the list page's is
`Record<string, string>` (labels only, no tones), the reading room's is
`Record<string, {label, tone}>` including active. Merging needs a shape decision.**

### admin-analytics-09 - CONFIRMED
13 loading.tsx files under admin (find count). 12 import AdminSkeleton (incl. the
root admin/loading.tsx, grep -c 2); the single exception is audit/loading.tsx --
17 lines of bespoke skeleton-warm title bar + 8 two-line rows.

### admin-analytics-10 - CONFIRMED
The 8-field `{id,name,email,photoUrl,birdOverride,accountType,batchType,batchYear}`
member select is byte-identical in messages/page.tsx:71-82 and messages/[id]/page.tsx:47-58,
and the matching interface is byte-identical in thread-list.tsx:15-24 and
thread-view.tsx:26-35. Four copies, verified by eye.

### admin-analytics-11 - CONFIRMED
person-detail.tsx:110-115 `MAIL_TONE` and mail-rows.tsx:26-31 `TONE` are the identical
`Record<string, ChipTone>` (sent good/queued warn/sending warn/failed bad), and
person-detail already imports `mailKindLabel, mailStatusLabel` from mail-rows (:45),
using MAIL_TONE at :759.

### admin-analytics-12 - CONFIRMED (all four sub-claims)
(a) page.tsx:52 "SEVEN VIEWS", tabs.tsx:5 "The room's six views", VIEWS has nine
entries (live, people, content, rhythms, faces, reach, journey, compare, health).
(b) mail/page.tsx:19 `priority: true` in ROW_SELECT for all three findMany;
only the queued query's `orderBy: [{ priority: "asc" }, ...]` uses it; mail-rows.tsx
never references priority.
(c) messages/page.tsx:135-148 shows two of the four repeats of the long link
className for Show older/Show fewer.
(d) people/actions.ts:58-61 hand-rolls `if (!session?.user || session.user.role !== "admin")`
while the same file uses requireAdminAction/requireAdminActor 7 times.

### admin-analytics-13 - CONFIRMED-WITH-CORRECTION
`grep -rln "The role, re-established on this page"` = 12 files under admin;
admin/page.tsx calls `requireAdminPage()` (:63) with zero copies of the paragraph.
Canonical statement confirmed in gate-coverage.test.mjs (~:277, B-024).
**Correction: lib/admin.ts's banner carries the layout-guard-vs-mutation argument
(lines 7-20) but does NOT mention B-024 by name -- the finder's "TWO canonical
places" is right in spirit, one of them untagged.**

### directory-profile-02 - CONFIRMED
directory-client.tsx:28 static `import { AlumniMap ... } from "./alumni-map"`;
alumni-map.tsx:7-12 imports d3-geo, d3-selection, d3-zoom, topojson-client,
`world-atlas/countries-110m.json`, geojson types. Default view:
`useState<"map"|"batches"|"people">(hasFilter ? "people" : "map")` (:116-118) --
map is default only when no filter, as claimed. /directory = 1212/1642, route #1.

### directory-profile-03 - CONFIRMED
package.json declares d3-scale (:47), supercluster (:64), @types/d3-scale (:37),
@types/supercluster (:39); `grep -rn 'from "supercluster"|from "d3-scale"' src scripts e2e`
= 0 hits. `d3-selection` IS imported (alumni-map.tsx:8, lab/directory/_maps.tsx:25)
and is NOT declared in package.json (transitive today); same for geojson types.

### directory-profile-09 - CONFIRMED
PERSON_SELECT byte-identical in directory/actions.ts:9-22 and directory/page.tsx:22-35
(13 fields incl. workplace). The `interface User` (directory-client.tsx:33-45) and
profile-card.tsx inline props (:44-58) are byte-identical 12-field types (no workplace).
Four type copies + two select copies, verified by eye.

### directory-profile-10 - CONFIRMED
directory-client.tsx:510-515: the comment "Sort rides in the sheet too below sm..."
sits above an EMPTY `<div className="sm:hidden"></div>`. Tiles :619-647: batch
button and faculty button differ only in key/onClick value/label/count-noun
(both carry the identical long className).

### directory-profile-11 - CONFIRMED
directory/loading.tsx draws `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` cards with
a centred `h-16 w-16 rounded-full` avatar over stacked bars -- the pre-redesign
card grid. profile/[id]/loading.tsx:30-31: `{/* the engraved rule */}` + 3px
full-width bar; letterhead-profile.tsx:~1153-1163: "The engraved rule that used
to sit here is DELETED (owner handed the call over, 2026-08-02)".

### directory-profile-12 - CONFIRMED
Both files: same `new FormData()` -> `callAction(() => updateAvatar(fd))`, same
`isImageFile` + `15 * 1024 * 1024` checks. photo-step additionally runs
`shrinkForUpload` (B-030) on the decode-error path; the letterhead does not --
the edge differences the finder listed are real and must be kept.

### directory-profile-13 - CONFIRMED
All three step files: `import type { OnboardingUser } from "../onboarding-flow"`.
madge-circular.txt: 48 cycles total; excluding generated/ and lab/, exactly 5
remain (44 lib/catchups>catchups-notify, 45 feed-rail>letters-module, 46-48
onboarding-flow>steps). So "3 of the 5 real cycles" is accurate.

### directory-profile-14 - CONFIRMED
welcome/page.tsx:13-18 still claims "(auth)/onboarding" exists ("dead code today
... its URL cannot be reused without deleting someone else's file") -- `ls src/app/(auth)/`
has no onboarding (deleted in c994c02). `find src/app -type d -name settings` -> none.
profile/[id]/page.tsx:418-421 still says "`?edit=1` is how /settings hands you one:
that route redirects here" -- no such route; no app code sends `?edit=1`.

### catchups-09 - CONFIRMED
console-answering.tsx:76-107 vs console-collecting.tsx:371-413: identical
avatar-or-"?" markup (`grid h-7 w-7 ... bg-muted text-[10px]`, BirdAvatar size 28,
same Link className), identical text classes; label logic written twice with
different vocabularies ("asked by you"/"asked anonymously" vs "You"/"You (anonymous)"/
"Someone in the group"). Note collecting's version also honours `showAsker`.

### catchups-10 - CONFIRMED
actions.ts:187-190 local `isUniqueConstraintError` (`code === "P2002"`), used :417
and :1733; the same file imports `isUniqueViolation` from @/lib/prisma-errors (:85)
and uses it at :1601. prisma-errors.ts:21-23 is the same P2002 check, whose own
banner says it exists because "there were four hand-written `code === "P2002"` checks".

### catchups-11 - CONFIRMED
Quoted all four: homeTitle ([catchupId]/page.tsx:56-58, bare group name),
surfaceTitle (answer/page.tsx:58-60, "{group} catch-up"), roundTitle
(round/[editionId]/page.tsx:67-69, identical, with the TODO naming this exact
finding), catchupTitle (lib/catchups.ts:354-356, "{group} Catch-ups"). catchupTitle's
only callers are its own test (catchups.test.mjs:40,534-536); knip.txt:280 flags it.

### catchups-12 - CONFIRMED
- `keeperName` in home/types.ts:90: one write ([catchupId]/page.tsx:470), zero reads
  in components/catchups (grep). CAUTION for the fixer: a DIFFERENT live `keeperName`
  exists in the notify ctx (actions.ts:2181, catchups-notify.ts:201,
  catchups-types.ts:256) -- delete only the home-view field and its write.
- `initialPeople`: sole caller passes `[]` (new/page.tsx:97); default param `= []`
  (create-catchup-form.tsx:41).
- ArchiveShelf: `({ rows }: { rows: HomeArchiveRow[]; groupName?: string })` --
  typed, not destructured, dead.
- (MemberStrip comment sub-claim not individually re-read; three of four verified.)

### catchups-14 - CONFIRMED-WITH-CORRECTION
The :911-918 `const [{ _max, _count }] = [await tx.catchupPrompt.aggregate(...)]`
array-of-one destructure is verbatim as claimed. **Correction on the double select
(:226-266): the two selects share the same 9 scalar fields but are NOT identical --
the first also nests `catchup: { select: { createdById, cadence, status, group } }`,
the re-read after advanceEdition selects only the 9 scalars. A shared
EDITION_SELECT constant covers the scalar core; the nested part stays with the
first query.**

### feed-posts-10 - CONFIRMED
feed/actions.ts:50-58 parseImageUrls vs utils.ts:90-98 parseJsonArray: same
null->[]y, JSON.parse in try, Array.isArray gate, string filter, catch->[]. utils'
has the `(v): v is string` predicate form. Semantically byte-equivalent.

### feed-posts-11 - CONFIRMED
feed/actions.ts:129-134 re-derives `IS_POSTGRES` + `searchInsensitive` with the
same rationale comment; db-text.ts:12-14 exports `insensitive` ("The one definition
... (audit R6)" per city-scope.ts:2 import comment); city-scope.ts:3 and
directory/where.ts already import it. Neighbour confirmed too:
collection/actions.ts:491-494 re-derives the same pair.

### feed-posts-12 - CONFIRMED
feed-rail.tsx:22-29 defines `RailViewer` (and the file imports LettersModule);
letters-module.tsx:12 `import type { RailViewer } from "../feed-rail"` -- the
back-edge is type-only. madge cycle 45 (raw file line 50). One of the 5 real cycles.

### feed-posts-14 - CONFIRMED
report-action.ts:77-104 vs :221-249: same six gates in the same order (auth,
IS_DEMO refusal with identical string, requireVerifiedMember, rateLimit("reports"),
isThreadRateLimited with identical user-facing string, C-174 typeof/trim/length
block verbatim). flagPerson adds a self-flag check; comments differ; bodies match.

### feed-posts-15 - CONFIRMED
feed/actions.ts:60: orphaned one-liner `/** Best-effort cleanup of a post's stored
image files, in parallel. */` immediately above the real M17 docblock for deletePost.
content-view.ts:11 `ViewKind = "profile" | "letter" | "post" | "photo" | "round"`;
grep of recordView callers: photo (collection/[id]:76), letter (letters/[id]:109),
profile (profile/[id]:133), round (round/[editionId]:197) -- "post" unreachable.

## Uncommitted-tree note
`git status` at session start showed only the audit's own untracked files
(docs/planning/audits/...). None of the files quoted above carried uncommitted
edits that I observed; I did not re-check per-file.
