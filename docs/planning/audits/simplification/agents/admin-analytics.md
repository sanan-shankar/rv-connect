# admin-analytics - simplification audit report

Territory reader for the admin area and analytics/telemetry: `src/app/(main)/admin/**` (29 files,
3,647 lines), `src/components/admin/**` (20 files, ~3,330 lines), `src/components/analytics/**`
(2 files, 189 lines), and twelve lib files (`admin.ts`, `admin-analytics.ts`, the four
non-query/query pairs, `admin-note.ts`, `last-seen.ts`), ~2,940 lib lines. Date: 2026-08-25.
Files in territory: 63. Read fully: 63.

## Coverage

- Read fully: every file in `src/app/(main)/admin/**` (all 16 page/layout/action files and all 13
  `loading.tsx`), every file in `src/components/admin/**` (22 including subfolders), both files in
  `src/components/analytics/`, and all twelve lib files (`admin.ts`, `admin-analytics.ts`,
  `admin-content.ts`, `admin-content-query.ts`, `admin-note.ts`, `admin-people.ts`,
  `admin-people-query.ts`, `admin-threads.ts`, `admin-threads-server.ts`, `admin-worklist.ts`,
  `admin-worklist-query.ts`, `last-seen.ts`).
- Skimmed (context only, not judged): `scripts/ops/snapshot.mjs` (to verify MetricSnapshot keys),
  `src/lib/admin-rule.test.mjs`, `src/lib/admin-guard-rule.test.mjs`,
  `src/lib/gate-coverage.test.mjs` (to identify pins), `docs/spec/admin.md`, `docs/OPERATIONS.md`,
  bug-report-2 admin sections.
- Not read: nothing in territory.
- Uncommitted edits seen: **none remaining in my territory.** The charter warned of WIP in
  `src/lib/admin.ts` / `src/app/(main)/forbidden.tsx` (the `forbidden()` work); that session
  committed it before I started, as `c74d99f` ("a non-admin who asks for /admin is told 'nice
  try'") and `c3f5782`. I read and judged the committed state. `git status` during my run showed
  only the audit's own untracked files.

## Summary

This territory is the **newest, most audited code in the repo** - the whole admin wing was rebuilt
2026-08-18..25 against a written spec, and nearly every constant carries an audit ID. The result
is the opposite of typical LLM bloat: components are small, primitives are shared (`AdminPersonRow`,
`Chip`, `AdminSection`, `AdminSkeleton`), pages are lean, and most of what looks like duplication
turned out to be pinned by a rule test or defended in a comment. The floor questions mostly resolve
to not-findings: the 13 loading files already share one skeleton, the per-page role check is pinned
by `gate-coverage.test.mjs` (B-024), the tile/list pairs were reconciled in `45d00ba`, and three of
the four lib pairs are a real, load-bearing client/server seam (the `pg`-in-the-browser failure is
documented in three separate file banners).

The real dead weight is concentrated in **`src/lib/admin-analytics.ts`**: one whole loader
(`loadSupport`, superseded when the funnel moved to /admin/support) and eight computed-but-never-
rendered fields, together ~106 lines and 9 DB round trips that run on real page loads. The second
theme is **repeated client-side wiring**: the same busy/callAction/toast/refresh handler exists six
times, and the same URL-filter toolbar is built twice. Structural findings dominate; the cheap ones
are a short export-hygiene list. Estimated honest savings: ~390 lines and ~20 wasted queries per
affected analytics view open. What surprised me: how little there was to cut in 7,000 lines of
UI - the discipline here is genuinely unusual.

## Findings

### admin-analytics-01 - Delete `loadSupport` and the unused `Metric`/`Slice` types from admin-analytics.ts
- **Where**: `src/lib/admin-analytics.ts:275-319` (the banner + `loadSupport`), `:26-37`
  (`Metric`, `Slice` type exports)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip: `loadSupport function src/lib/admin-analytics.ts:279:23` unused, plus
  `Metric` (:27) and `Slice` (:37). Confirmed by grep: the only importer of value exports from
  `admin-analytics` is `src/app/(main)/admin/analytics/page.tsx`, whose import list (lines 4-24)
  names 18 loaders and not `loadSupport`; a whole-src grep for `loadSupport` outside the lib
  returns nothing. The page's own header comment (analytics/page.tsx:61-63) records why: "The
  contribution funnel deliberately does NOT live here: it moved to /admin/support". That page
  (`admin/support/page.tsx:75-151`) computes its own funnel from the ledger window. `Metric` and
  `Slice` are consumed by nothing; the components define their own `Stat` in
  `components/admin/analytics/stat.tsx:37` (only `Trend`, `Presence`, `MemberRow`, `JourneyRow`
  are imported as types).
- **What to do**: Delete lines 275-319 (the "Support: the funnel the owner asked about first"
  banner and the function) and the `Metric`/`Slice` type declarations at 26-37 (keep `Trend`,
  which stat.tsx imports). Nothing else changes; `CONTRIBUTION_SUM`/`netPaise` imports at the top
  stay (used by nothing else in this file after the delete - remove the import too if so; check:
  they are used only inside loadSupport, so drop the `@/lib/contribution-state` import).
- **Saving**: ~56 lines, 8 DB queries that would run if anyone ever called it (currently 0 at
  runtime), 1 import edge.
- **Risk & gate**: low. `npm run check` (tsc catches a missed import), and
  `src/lib/admin-rule.test.mjs` must stay green - it greps this file but pins `loadFaces`/
  `personList`/`GROUP BY u."name"`, none of which this touches. Open `/admin/analytics` and
  `/admin/support` once.
- **Confidence**: high. The one thing that would change my mind: a plan to re-add a money view to
  the analytics room - but the owner explicitly moved it out (comment cites him, 2026-08-19).
- **Notes**: This is the classic superseded-loader shape: the function was written for the room,
  the owner moved the concern to the ledger page, the page got its own (window-scoped, differently
  correct) queries, and the original was never deleted. The two are NOT equivalent - loadSupport
  computes whole-history aggregates, support/page.tsx computes a 100-row window plus separate
  whole-history tiles - so no consolidation is possible or wanted; the dead one just goes.

### admin-analytics-02 - Strip the eight computed-but-never-rendered fields from the analytics loaders
- **Where**: `src/lib/admin-analytics.ts:107` + `:134` (loadPeople `byHouse` groupBy and mapping),
  `:191` + `:217` (loadContent `photoLoves` count and return), `:233-251` + `:259-271` (loadCatchups
  `series`/`editions` counts, `byEdition` groupBy + `editionRows` follow-up + label map + returns),
  `:326-348` (loadMail `failed` count and return), `:515-529` (loadSearches `recent` findMany and
  return)
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Grep across `admin/analytics/page.tsx` and `components/admin/analytics/` for
  `byHouse`, `photoLoves`, `catchups.series`, `catchups.editions`, `catchups.byEdition`,
  `searches.recent`, `mail.failed`: zero hits (positive control `catchups.people` hits at
  page.tsx:427). The nine analytics views destructure these loaders and render every other field;
  these eight are fetched from Postgres in Mumbai and dropped on the floor:
  - `byHouse`: a `user.groupBy` per PeopleView load;
  - `photoLoves`: a `photoLove.count()` per ContentView load (the rendered "who hearts photos"
    list comes from `loadInteractions`, not this);
  - `series`, `editions`: two counts per ContentView load;
  - `byEdition`: a groupBy **plus** a `catchupEdition.findMany` follow-up plus a label map
    (~20 lines) per ContentView load;
  - `failed`: an `outboundEmail.count()` per HealthView load (the page renders sent / delivered /
    bounced / queued / complained; "failed" appears only on /admin/mail, which has its own query);
  - `recent`: a 10-row `searchLog.findMany` per ReachView load.
- **What to do**: In each loader, delete the query from the `Promise.all`, the destructured name,
  and the return-object field. In `loadCatchups`, keep the `prompts` count (feeds
  `answersPerPrompt`) but stop returning it, and delete the whole `byEdition`/`editionRows`/`label`
  block (:239-251, :268-271). Do NOT touch `loadCatchups().loves`/`people` (rendered at
  page.tsx:427-433) or `loadSearches().top/byScope/empty/total` (all rendered).
- **Saving**: ~50 lines; 5 queries off ContentView, 1 off PeopleView, 1 off HealthView, 1 off
  ReachView - per open of each view, on a force-dynamic page.
- **Risk & gate**: low. `npm run check` (tsc will flag any missed consumer); open
  `/admin/analytics?view=people|content|reach|health` and eyeball each. `admin-rule.test.mjs`
  untouched (it pins loadFaces and the support tile).
- **Confidence**: high for all eight (each grep-confirmed with a control). The one thing that would
  change my mind: an uncommitted view in another session consuming them - none exists in HEAD and
  the tree is clean.
- **Notes**: These are the residue of the room's single-page era (the page comment says it once ran
  ~40 queries per load); when it was split into lazy views the loaders were reused wholesale and
  nobody re-checked which fields each view still ate. Related: finding 03 is the same era's residue
  at the call-site level. If the owner ever wants a "by house" chart back it is one groupBy to
  re-add; deleting it now is cheaper than the query on every load forever.

### admin-analytics-03 - Stop ContentView/FacesView paying 13 queries for one number, and RhythmsView paying for the live-presence lists
- **Where**: `src/app/(main)/admin/analytics/page.tsx:302-308` (ContentView's `loadPeople()`),
  `:489` (FacesView's `loadPeople()`), `:460` (RhythmsView's `loadPresence()`);
  `src/lib/admin-analytics.ts:74-136` (loadPeople, 13 queries), `:383-448` (loadPresence, 7 queries
  incl. two `findMany ... include: { user }` of 40+25 rows and two raw aggregates)
- **Phase**: architecture (efficiency)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: ContentView uses `people.total` twice (page.tsx:427-428, a percentage hint) and
  nothing else from loadPeople's 13 concurrent queries; FacesView uses `people.total` once
  (:498) - so each open of those views runs 12 unread queries. RhythmsView renders only
  `presence.byDevice/byOs/byPath` (:472-479), three of loadPresence's seven queries; the two
  user-joined findMany lists and the two raw SQL aggregates (~4 queries, the heaviest in the
  loader) are fetched and dropped.
- **What to do**: (a) Add a one-liner `export async function countMembers() { return
  prisma.user.count(); }` to admin-analytics.ts (or reuse an existing count if one is exported
  elsewhere) and have ContentView/FacesView call it instead of `loadPeople()`. (b) Split
  loadPresence into `loadPresenceLists()` (live/recent/aggregates - LiveView keeps calling the
  combined fn) and `loadUsageBreakdowns()` (the three groupBys), with RhythmsView calling only the
  latter; or simply give loadPresence a `{ listsToo = true }` arg defaulted on - one param, two
  call sites.
- **Saving**: ~0 net lines (maybe +8); ~24 queries per ContentView+FacesView open and ~4 heavier
  ones per RhythmsView open, on a `force-dynamic` page hitting Mumbai.
- **Risk & gate**: low. `npm run check`; open all three views and compare the numbers against the
  live tab.
- **Confidence**: high. This page is owner-only, so the win is latency of his own page, not scale;
  it is still 24 round trips for two copies of one integer.
- **Notes**: I considered leaving this as "admin is the least performance-sensitive surface" - but
  the room advertises itself as getting FASTER as it grows (tabs.tsx:14-15), and this is the one
  place that claim is currently untrue. Option (a) is two lines; do at least that.

### admin-analytics-04 - One hook for the six copies of the busy/callAction/toast/refresh handler
- **Where**: `src/components/admin/content/content-list.tsx:100-119` (`act`),
  `src/components/admin/reports/report-list.tsx:52-76` (`act`),
  `src/components/admin/mail/mail-rows.tsx:72-87` (`act`),
  `src/components/admin/people/person-detail.tsx:138-155` (`run`), `:500-524` + `:619-632` +
  `:667-680` (DetailsCard/PlacesCard/NoteCard `save`), `:723-739` (MailCard `retry`),
  `src/components/admin/messages/thread-view.tsx:47-60` (`setStatus`),
  `src/components/admin/people/people-list.tsx:107-125` (`showMore`, partially)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd flags content-list 98:38-109:35 = report-list 50:67-61:35 and person-detail
  511:10-527:25 = 622:80-635:25. Reading them: nine functions across six files share the exact
  shape `setBusy -> callAction(fn) -> if error toast.error -> toast.success(done) ->
  router.refresh() -> finally setBusy(null)`, six of them carrying the same verbatim
  "finally, not a trailing statement ... (audit B-042)" comment. ~150 lines total for one idea.
- **What to do**: Add `src/components/admin/use-admin-act.ts` (~30 lines): a hook returning
  `{ busy, act }` where `act(key, fn, done, opts?)` implements the shape once, takes an optional
  `onError` (report-list refreshes on error too - M01) and returns the result for callers that
  branch (person-detail's ConfirmDialogs keep their own flow; do not force them in). Port the six
  plain call sites; keep the B-042 comment once, in the hook. people-list's `verify` (per-row
  in-flight Set) and `showMore` (pagination state) are different shapes - leave them.
- **Saving**: ~70 lines net (~150 replaced by ~30 hook + ~50 call sites), and B-042 becomes
  unregressable in one place instead of six.
- **Risk & gate**: medium-low. `npm run check`; exercise one action per surface (approve a photo,
  dismiss a report, retry a mail, save a note, mark a thread sorted). No rule test greps these
  bodies for the pattern (checked admin-rule/admin-guard-rule/security-regressions).
- **Confidence**: high on the duplication, medium on the exact hook shape - the report-list
  variant's refresh-on-error and mail-rows' `(id) => Promise` signature need the small options
  bag; if that bag grows past two options, stop and keep two variants instead.
- **Notes**: This is the one place the admin wing shows its age-in-reverse: each surface was built
  in sequence over a week and each re-derived the handler. The B-042 comment riding along six
  times is the tell. Related: finding 05 is the same story for the toolbar.

### admin-analytics-05 - Shared URL-filter toolbar wiring for people-list and content-list
- **Where**: `src/components/admin/people/people-list.tsx:69-105, 154-239` and
  `src/components/admin/content/content-list.tsx:62-98, 132-242`
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd flags content-list 64:52-71:29 = people-list 71:46-81:29, 163:59-175:27 =
  181:49-193:27, 184:32-205:9 = 197:17-218:9. Reading both: each hand-builds the same ~110-line
  assembly on top of the shared kit - `setParam` (URLSearchParams -> router.replace, identical),
  `draftQ` search input with the same Enter/blur commit and the same absolute Search icon, the
  same desktop `FilterPopover` + mobile `FilterButton`/`FilterSheet` pair around a `facets(fullWidth,
  compact)` closure, the same `SentenceLine` + clearAll wiring. The kit
  (`components/common/filters/`) shares the *controls*; the *assembly* is copied.
- **What to do**: Add `src/components/admin/admin-filter-bar.tsx` (~80 lines): props
  `{ basePath, searchPlaceholder, searchAriaLabel, facets: (fullWidth, compact) => ReactNode,
  tokens, activeCount, count, singular, plural, sheetShowLabel, onClearDrafts }`, owning
  setParam/draftQ/panelOpen/sheetOpen and rendering input + popover + sheet + SentenceLine.
  people-list keeps its rows/verify logic; content-list keeps its pending-photos pill (slot it as
  `children` between the toolbar and the sentence, or a `banner` prop). Alternatively a
  `useUrlFilterParams(basePath)` hook alone (setParam/clearAll/draftQ) is the low-coupling half at
  ~40% of the saving.
- **Saving**: ~90 lines net across the two files (2x ~110 replaced by ~80 shared + 2x ~25 config).
- **Risk & gate**: medium. `npm run visual` (both routes are UI), `npm run check`; drive both
  filters at desktop and 390px. This is behaviour-preserving but touches two live moderation
  surfaces.
- **Confidence**: medium-high. The thing that would change my mind: if the Directory/Collection
  callers of the same kit (outside my territory) are about to converge on such a component
  app-wide - then this should be built once at `components/common/filters/` level, not under
  admin. Flagged under "For other lenses".
- **Notes**: The coupling caveat from the brief applies: two consumers is the minimum for an
  abstraction, and the facets closure keeps each page's facet content its own. I would not go
  further (e.g. config-driven facet definitions) - see the generic-table verdict in the
  Not-findings.

### admin-analytics-06 - Merge `admin-worklist.ts` into `admin-worklist-query.ts`: the seam it claims is not there
- **Where**: `src/lib/admin-worklist.ts:1-39` (whole file),
  `src/lib/admin-worklist-query.ts:1-17` (banner + imports)
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The query file's banner says "Split from admin-worklist.ts for the usual reason:
  that one is imported by a client component and this one imports `prisma`." Grep: the only
  importers of `@/lib/admin-worklist` are `src/app/(main)/admin/page.tsx` - a **server**
  component (no "use client"; it runs `loadWorklist()` inline) - and the query file itself. No
  client component imports it; `WorkRow`/`QUEUE_ICON` live inside the server page. The stated
  justification is false today, so the pair is a habit copied from the three pairs where it is
  real (admin-people, admin-content, admin-threads - each verified real, see Not-findings).
- **What to do**: Move `WorkItem`, `QUEUE_LABEL`, `QUEUE_TONE` to the top of
  admin-worklist-query.ts, delete admin-worklist.ts, update the two import sites
  (admin/page.tsx:21-22 collapse into one import). If instead a future client component wants the
  vocabulary, the split is one `git revert` away.
- **Saving**: ~10 lines + 1 file; mostly a false-comment removal (the banner's claim would
  otherwise mislead the next reader into preserving the split).
- **Risk & gate**: low. `npm run check`; open `/admin`. Nothing greps these paths in the rule
  tests (checked).
- **Confidence**: high. Would change my mind: a WIP client worklist component - none in HEAD.
- **Notes**: Charter question answered here and in Not-findings: the pairs are 3 real seams + 1
  habit. Do not merge the other three - each one's banner records the exact runtime failure
  (`Module not found: Can't resolve 'dns'` while tsc stays green) that created it, and
  admin-people-query.ts:4 literally says "do not merge it back".

### admin-analytics-07 - Dead exports batch across the admin libs
- **Where**: `src/components/admin/admin-nav.ts:128-129` (`ADMIN_SECTIONS`),
  `src/lib/admin-threads.ts:15-17` (`THREAD_KINDS`, `ThreadKind`), `:21` (`ComposerKind` type),
  `:24` (`export` on `MAX_SUBJECT_LENGTH`), `src/lib/admin-threads-server.ts:9-11` (the
  `isUploadedImageUrl` re-export + its comment), `src/lib/admin.ts:240` (`export` on
  `worklistCounts`), `src/lib/admin-worklist-query.ts:19` (`export` on `PER_QUEUE`),
  `src/lib/last-seen.ts:17` (`export` on `SESSION_GAP_MIN`)
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: knip lines 200, 253-257, 361-368; each verified by grep:
  - `ADMIN_SECTIONS`: zero references anywhere (the two consumers both use `ADMIN_NAV.flatMap`
    themselves - admin/page.tsx:160 and presumably the sidebar). Delete the two lines.
  - `THREAD_KINDS`/`ThreadKind`: zero references outside the file; the composer uses
    `COMPOSER_KINDS` (message-composer.tsx:16) and nothing consumes the five-kind list - the
    thread `kind` columns are compared as plain strings everywhere. Delete lines 15-17;
    `ComposerKind` type likewise unused (keep `COMPOSER_KINDS` the value).
  - `isUploadedImageUrl` re-export: every real consumer imports from `@/lib/upload-shared` or
    `upload-ownership` (grep confirms); nobody imports it from admin-threads-server. Delete
    lines 9-11.
  - `worklistCounts`, `PER_QUEUE`, `MAX_SUBJECT_LENGTH`, `SESSION_GAP_MIN`: used only inside
    their own modules; drop the `export` keyword (keeps knip's production report clean).
- **What to do**: as per-item above; one commit.
- **Saving**: ~12 lines, and a cleaner knip baseline for the next audit.
- **Risk & gate**: low. `npm run check` (tsc + the 75-file test suite; none of the rule tests
  reference these names - checked `security-regressions.test.mjs` and both admin rule tests).
- **Confidence**: high. `SESSION_GAP_MIN` is the only judgement call: its comment says "kept as
  documentation of the window" (the real window now lives in proxy.ts's cookie max-age) - keep
  the constant and comment, just un-export.
- **Notes**: THREAD_KINDS looks like it should be the source of truth for the `kind` column; it
  is not wired to anything (no zod enum, no validator). If a fixer prefers, wiring it into the
  validators instead of deleting would also be defensible - but that is new surface, and the
  audit's job is to shrink, so I recommend delete.

### admin-analytics-08 - The two catchup admin pages each define the same Round-status maps
- **Where**: `src/app/(main)/admin/catchups/page.tsx:15-29` and
  `src/app/(main)/admin/catchups/[catchupId]/page.tsx:52-66`
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: jscpd 164-165 (13 lines, 88 tokens). `STATUS` (five Round states -> label+tone) is
  byte-identical in both files; `SERIES_STATUS` differs trivially (the list page omits "active"
  because it only chips non-active, the reading room includes it). Same five-state vocabulary,
  two copies, one drift already visible.
- **What to do**: Move both maps (the reading room's fuller `SERIES_STATUS`) into a tiny
  `src/components/admin/catchup-status.ts` (or the bottom of `admin-chip.tsx`'s neighbourhood -
  NOT into lib/catchups.ts, which is member-facing and big). List page renders the "active" entry
  never (its render site already guards `c.status !== "active"`), so the fuller map is safe for
  both.
- **Saving**: ~13 lines.
- **Risk & gate**: low. `npm run check`; open `/admin/catchups` and one reading room.
- **Confidence**: high.
- **Notes**: These pages are 6 days old and already share everything else (Chip, AdminSection,
  metaLine); this is just the one map that got copied when the reading room shipped (6d5609e).

### admin-analytics-09 - `audit/loading.tsx` hand-rolls what `AdminSkeleton` exists to prevent
- **Where**: `src/app/(main)/admin/audit/loading.tsx:1-17`
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: 12 of the 13 admin loading files are 5-line wrappers over `AdminSkeleton`
  (`components/admin/admin-skeleton.tsx`, whose own banner says "in one place so nine routes
  cannot each invent their own"). The audit one is the invented-own: 17 lines of bespoke
  `skeleton-warm` markup drawing a title bar and 8 rows - which is exactly
  `<AdminSkeleton rows={8} columns={1} toolbar={false} />` minus the avatar circle.
- **What to do**: Replace the body with the one-line AdminSkeleton call (rows={8} columns={1}
  toolbar={false}); keep the M06 comment line if wanted. The avatar circle in the shared skeleton
  is a cosmetic mismatch for a log page and does not matter for a sub-second shimmer.
- **Saving**: ~12 lines.
- **Risk & gate**: low; `npm run check`. The visual suite does not baseline loading states.
- **Confidence**: high.
- **Notes**: This answers the floor question about the loading files: they are already one shared
  skeleton with per-route 5-line wrappers, which is the **minimum Next.js allows** - `loading.tsx`
  is a per-segment framework convention, so "one shared file" is impossible and the current shape
  is correct. This is the single straggler.

### admin-analytics-10 - The 8-field thread-member shape is written four times
- **Where**: `src/app/(main)/admin/messages/page.tsx:71-82` (select),
  `src/app/(main)/admin/messages/[id]/page.tsx:47-58` (select),
  `src/components/admin/messages/thread-list.tsx:15-24` (`ThreadRow.member` type),
  `src/components/admin/messages/thread-view.tsx:26-35` (`AdminThreadDetail.member` type)
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: jscpd 167-171 (26 lines messages/[id] = messages/page; 12 lines thread-list =
  thread-view). The identical `{ id, name, email, photoUrl, birdOverride, accountType, batchType,
  batchYear }` select object appears in both pages and the matching interface in both components.
  Four copies of the AdminPersonRow person contract; adding a field means four edits today.
- **What to do**: In `thread-list.tsx`, export `interface ThreadMember { ... }` once and a
  `THREAD_MEMBER_SELECT = { select: { ... } } satisfies` const from a server-safe location - the
  select constant must NOT live in a client-imported module with a prisma type import that drags
  values; a plain object literal with `as const` in `admin-threads-server.ts` (or repeated select
  extracted to a local const shared by the two page files via a small
  `src/app/(main)/admin/messages/select.ts`) is fine. Both component interfaces then reference
  `ThreadMember`.
- **Saving**: ~20 lines, plus four-edits-becomes-one on the person contract.
- **Risk & gate**: low; `npm run check`; open both messages routes.
- **Confidence**: medium-high. The one caution: keep types (importable anywhere) separate from
  the select value (server files only), or you re-create the dns-in-the-bundle failure the
  admin-threads banner warns about.
- **Notes**: `AdminPerson` in admin-person-row.tsx is the natural home for the *type* - it is
  already the contract these members satisfy (email required there; these all carry it).

### admin-analytics-11 - `MAIL_TONE` in person-detail duplicates `TONE` in mail-rows
- **Where**: `src/components/admin/people/person-detail.tsx:110-115` vs
  `src/components/admin/mail/mail-rows.tsx:26-31`
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Identical `Record<string, ChipTone>` (sent good / queued warn / sending warn /
  failed bad). person-detail already imports `mailKindLabel`/`mailStatusLabel` from mail-rows
  (line 45), so the seam exists; only the tone map got copied.
- **What to do**: Export the map from mail-rows (`export const MAIL_STATUS_TONE`), delete the
  person-detail copy, import beside the two label fns.
- **Saving**: ~6 lines.
- **Risk & gate**: low; `npm run check`; open a person with mail history.
- **Confidence**: high.

### admin-analytics-12 - Cheap hygiene batch: stale counts, unused select field, repeated link, hand-rolled auth check
- **Where**: (a) `src/app/(main)/admin/analytics/page.tsx:52` says "SEVEN VIEWS" and
  `src/components/admin/analytics/tabs.tsx:5` says "The room's six views" - `VIEWS` has nine;
  (b) `src/app/(main)/admin/mail/page.tsx:19` selects `priority` in `ROW_SELECT` for all three
  queries but only the queued query's `orderBy` uses the column, and nothing renders it;
  (c) `src/app/(main)/admin/messages/page.tsx:135-148` and `:166-181` repeat one long link
  className four times for Show older/Show fewer;
  (d) `src/app/(main)/admin/people/actions.ts:58-61` hand-rolls the session+role check that
  `requireAdminAction()` exists to centralise (its own doc: "Centralised so the check and its
  copy cannot drift").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: read directly; for (d), every other action in the same file opens with
  `requireAdminAction()`/`requireAdminActor()`.
- **What to do**: (a) fix both numbers or say "The views" and stop counting; (b) drop
  `priority: true` from ROW_SELECT (orderBy does not need the select); (c) extract a 6-line
  `MoreLink({ href, children })` local component in messages/page.tsx; (d) replace lines 58-61
  with `const denied = await requireAdminAction(); if (denied) return denied;`.
- **Saving**: ~20 lines total.
- **Risk & gate**: low; `npm run check`. For (d): `gate-coverage.test.mjs` greps *pages* for
  `requireAdminPage`, not actions, and `admin-guard-rule.test.mjs` pins other functions - both
  stay green.
- **Confidence**: high.

### admin-analytics-13 - Shrink the B-024 comment from four lines x12 pages to one
- **Where**: every `src/app/(main)/admin/**/page.tsx` (12 files), e.g. admin/page.tsx has the
  guard without the comment, analytics/page.tsx:71-75, support/page.tsx:62-66, etc.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `grep -c "The role, re-established on this page"` hits 12 files; the identical
  4-line paragraph (soft navigation / segments / demotion window / B-024) precedes each
  `await requireAdminPage()`. The full argument already lives in TWO canonical places: the
  docblock in `gate-coverage.test.mjs:265-280` (which enforces the rule) and `lib/admin.ts`'s
  banner. Twelve copies of the whole paragraph is the repeat-the-code comment shape, just at the
  paragraph level.
- **What to do**: Reduce each to one line:
  `// Re-checked per page, not only in the layout: soft navigation skips layouts (B-024).`
  Keep the audit ID so the reason survives. The `[catchupId]` page's variant ("reads the most
  private writing on the site") earns its extra clause; keep that one fuller.
- **Saving**: ~34 lines.
- **Risk & gate**: low; `gate-coverage.test.mjs` greps for the *call*, not the comment - stays
  green. `npm run check`.
- **Confidence**: high on safety; medium on worth - this repo's standard is reason-comments, and
  these DO carry a reason. I am recommending it only because the reason is identical, pinned by
  a test, and already written twice elsewhere; a one-line pointer preserves it. A fixer who
  prefers to skip this loses ~34 lines of the estimate and nothing else.

## Owner decisions

**The Compare tab and the per-member metrics table.** The analytics room's "Compare" view is the
most machinery for the least-asked question in your admin panel: a 282-line component
(`compare.tsx`, with a hand-written Pearson correlation grid) fed by a ~120-line SQL query that
builds a 26-number row for every member (`loadMemberMetrics`). It works, it is honest about what
correlation means, and you asked for a room that can answer questions nobody has thought to ask
yet - so my recommendation is **keep it**. But it is the single biggest removable block in this
territory (~400 lines and the heaviest query in the room) if you ever decide the room should slim
down, and I want it on the record that cutting it would lose no other feature. Nothing else in
admin depends on it.

**Four kinds of telemetry.** The site currently records member activity four ways: your own Visit
table (powers the Live/Rhythms/Faces views), PostHog (funnels and paths, viewed on posthog.com),
Vercel Analytics (page views, viewed on vercel.com), and the nightly MetricSnapshot (the
sparklines). Each one has a written justification in the code and they genuinely answer different
questions, so my recommendation is **keep all four for launch**. The overlap worth revisiting in a
quieter month is PostHog vs Vercel Analytics - the PostHog comment itself argues Vercel Analytics
"answers 34% India, 22% iOS and nothing else", which is an argument that you could drop Vercel
Analytics, not one for keeping both. That decision lives outside this territory (root layout), so
I have flagged it to the other lens rather than counted it.

## Not-findings

Things that look like bloat and are verified intentional - do not re-litigate:

- **The per-page `requireAdminPage()` on all 12 admin pages, on top of the layout's.** Pinned by
  `src/lib/gate-coverage.test.mjs` ("every /admin page checks the role itself"), reason B-024:
  App Router soft navigation re-renders only changed segments, so the layout guard alone leaves a
  demoted admin reading member data until a hard reload. The layout keeps its own guard for
  navigation. The floor question "could a layout own it once" is answered: it did, that was a bug,
  and the fix is 6 days old (c3f5782). Only the comment length is a finding (13).
- **The 13 `loading.tsx` files.** Framework convention - one per route segment is the minimum.
  Twelve already delegate to `AdminSkeleton` at 5 lines each. Only the audit one strays (09).
- **The tile/list "two code paths" on /admin/support.** Deliberately two *measurements* now:
  the "Did not go through" tile counts whole-history live-mode rows
  (`notIn: ["paid", ...REVERSED_STATUSES]`), the list below shows the 100-row window, and the page
  says so in rendered copy at lines 193-196 and 236-239. Reconciled in commit 45d00ba and pinned
  by `admin-rule.test.mjs` ("the 'Did not go through' tile excludes every reversed status").
- **The admin-people / admin-content / admin-threads pair splits.** Real client/server seams:
  `people-list.tsx`, `content-list.tsx`, `message-composer.tsx` (all "use client") import the
  non-query halves, and each query file's banner records the actual production failure
  (`Can't resolve 'dns'`, invisible to tsc - CLAUDE.md gotcha 3) that created the split.
  admin-people-query.ts:4: "do not merge it back". Only the worklist pair lacks the client
  importer (finding 06).
- **`worklistCounts()` vs `loadWorklist()` querying the same six predicates twice on /admin.**
  Argued in `lib/admin.ts:227-239`: the alternative is every admin route fetching rows so the rail
  can report a length. The count/list contract ("Change one, change the other") is stated in both
  files and enforced socially plus by `worklistIsCapped` for the drift case (audit Low 7).
- **`AdminCountsSync`'s module-level store** (admin-counts.tsx). Looks like a hand-rolled state
  library; the banner enumerates and rejects the three simpler options (rail renders above the
  admin layout in the tree; context cannot flow upward). Correct as built.
- **The reading room attributing anonymous askers** (catchups/[catchupId]). An owner-decided
  exception (2026-08-25), marked in the UI itself ("Only you see this") and fenced in the docblock.
- **The 1.03 comment ratio in admin-chrome.tsx** and the 0.74 in people/actions.ts
  (comment-density.txt lines 18, 35). Read in full: they are dated owner quotes, audit IDs and
  measured numbers - the repo's "every constant argued for" standard, not narration. Exempt per
  brief 4d.
- **The hardcoded PostHog key fallback in posthog-provider.tsx.** Write-only key, argued inline
  (same class as a Sentry DSN); removing it would recreate the silent-no-analytics failure the
  comment describes.
- **`parseAgent` hand-rolled instead of a UA-parsing dependency** (last-seen.ts:148-184).
  Deliberate (brief phase 8 in reverse - the comment says exactly why three buckets is the whole
  requirement). Keep.
- **The one generic-table question (floor).** Verdict: do NOT collapse the five admin list
  surfaces into one table-with-config. Their row anatomies differ in kind, not in styling: a
  person row with one bulk action; a content row with a thumbnail, a moderation dropdown and an
  approve/decline pair; a report card whose body is a prose sentence with three inline verbs; a
  mail row with retry/clear; a thread card with a stretched-overlay link. A config object rich
  enough to express all five is the over-abstraction signature (brief 4e-5) with one consumer per
  config. The right-sized shared pieces are exactly the ones extracted in findings 04, 05, 10, 11.
  The wing already shares its true primitives (AdminPersonRow, Chip, AdminSection, AdminSkeleton,
  the filters kit).
- **`ADMIN_MEASURE` vs full width vs `max-w-3xl` differing per page.** Argued per-surface in
  admin-chrome.tsx:184-229 with owner quotes and measured pixel numbers.

## For other lenses

- `src/app/(main)/settings` (or wherever `updateUserPlaces` lives): `adminUpdatePlaces`
  (admin/people/actions.ts:209-250) mirrors its transaction shape by prose contract ("Same
  transaction shape, so the two cannot disagree"). A shared `writePlaces(tx, userId, cleaned)`
  helper would enforce what the comment promises. jscpd flags the clone at people/actions.ts
  221:87-245:6.
- `components/common/filters/` callers in Directory and Collection: if they repeat the same
  toolbar assembly people-list/content-list do (finding 05), the shared bar belongs in
  `components/common/filters/`, not under admin. Merge with my 05 before executing either.
- Root layout / lib-core-config: the PostHog vs `@vercel/analytics` overlap (see Owner decisions);
  both mount in `src/app/layout.tsx`.
- scripts lens: `scripts/ops/snapshot.mjs` writes ~10 metric keys no page reads yet
  (`db.photos.loves`, `db.catchups.prompts`, `db.contributions.*`, `db.mail.failed`,
  `db.members.blocked`). Probably deliberate history-accumulation (rows are cheap and
  unbackfillable) - flagging so the scripts reader confirms rather than assumes.
- data-layer: the `Visit` table's columns are all read by admin-analytics EXCEPT none I found
  unread (lastPath/entryPath/referrer/language/region/timezone/lat/lng all consumed; `timezone`,
  `lat`, `lng` - check: `timezone`/`lat`/`lng` are written by last-seen.ts and I found NO reader
  in my territory; loadPresence selects city/country but not timezone/lat/lng, loadArrivals groups
  region/language. Three written-never-read columns worth the data-layer's judgement.)
- messages territory: `admin-threads-server.ts` consumers (`messages/actions.ts`,
  `notice/[id]`, `report-action.ts`) - the seam holds from my side; C-053/C-061 fix territory.
- bundle lens: all 13 admin routes carry the ~930KB shared first-load baseline (route-js.txt);
  admin-specific weight above baseline is modest (people pages +~90KB: auto-animate, filters kit,
  location-picker). Owner-only surface - deprioritise behind member routes.

## Metrics

- Lines read: ~10,100 in territory (3,647 app + ~3,330 components/admin + 189
  components/analytics + ~2,940 lib) plus ~600 of tests/specs/tools for verification.
- Biggest files: admin-analytics.ts 1,226 (916 code / 231 comment); person-detail.tsx 911;
  analytics/page.tsx 877; content-list.tsx 392; support/page.tsx 342; people-list.tsx 334.
- Comment-heaviest (comment/code): admin-chrome.tsx 1.03 (110/107 - verified reason-comments);
  people/actions.ts 0.74 (178/242); last-seen.ts 0.62 (99/160); admin.ts 0.62 (88/142). All
  verified as the repo's argued-constant idiom, not narration.
- Dead weight found: ~106 lines + 9 queries in admin-analytics.ts (findings 01-02); ~150 lines of
  repeated handler (04); ~220 lines of repeated toolbar (05); ~12 lines dead exports (07).
- Client/server split: 9 "use client" files in components/admin+analytics, 13 server - the
  analytics room renders fully on the server (correct for an owner-only, data-dense page).
- Admin routes in build: 13 of 92; route-KB 932-1,028; all within ~100KB of the app baseline.
- Estimated total honest saving if all findings execute: **~390 lines, 1 file, ~24 queries per
  affected analytics view open, ~9 queries per dead-field view open.**
