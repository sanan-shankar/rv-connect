# dead-code - refactor audit 2 report

Cross-cutting lens: everything with no live reference, verified. Charter: turn every line of
knip (repo config and `--production`), madge, and tsc-unused into a verdict (dead /
used-via-convention / test-only / in-progress / false positive), then hunt what the tools
cannot see: env flags, hard-wired props and flags, unrendered variants, dead CSS tokens,
unreferenced public assets, unlinked routes, uncalled API routes, unread Prisma models, and
test pins that pass vacuously. Date: 2026-09-03, at HEAD `72b5a1d`. Files in territory: the
whole repo through the tool outputs (~110 symbol/file sites plus `globals.css`, `public/`,
14 API routes, 52 non-lab routes, 44 env keys, 102 test files); read fully: 31 files, plus
the defining range and every reference of each flagged symbol (listed under Coverage).

## Coverage

- Read fully: `docs/audit-fix/2026-09-03-refactor-audit-2/work/brief-common.md`, `CLAUDE.md`,
  `AGENTS.md`, `docs/OPERATIONS.md`, `docs/spec/demo.md`, the audit-1 dead-code agent report
  (`docs/audit-fix/2026-08-25-refactor-audit-1/work/agents/dead-code.md`, 926 lines), audit-1
  report §4-§5, the audit-1 `fix-prompt.md` outcome sections; every raw tool file named in
  the charter (`knip-repo-config.txt`, `knip-repo-config-production.txt`,
  `madge-orphans-filtered.txt`, `tsc-unused.txt`, `env-flags.txt`, `commented-out-code.txt`,
  `console-log.txt`, `todos.txt`, `route-js.txt`, `files-added-since-audit1.txt`,
  `diff-since-audit1.txt`, `barrels.txt`, `check-baseline.txt`), `scripts/qa/knip.jsonc`,
  `package.json`, `vercel.json`, `src/app/globals.css` (726 lines), `src/app/page.tsx`,
  `src/components/common/filters/active-filter-chips.tsx`, `result-count.tsx`,
  `facet-select.tsx`, `src/lib/directory-facets.ts`, `src/lib/upload-ownership.ts` (header),
  `src/components/landing/showcase.tsx` (header, lines 1-70), `node_modules/shadcn/dist/tailwind.css`.
- Read at ranges (the defining site plus every reference): `src/components/posts/post-feed.tsx`
  (23-105, 255-400), `src/components/posts/feed-column.tsx`, `src/app/(main)/feed/page.tsx`
  (78-90), `src/app/(main)/feed/actions.ts` (1040-1075, 1140-1150, 1210-1275),
  `src/components/landing/landing-hero.tsx` (112-124, 410-440), `src/lib/rate-limit.ts`
  (150-200), `src/lib/email.ts` (25-70), `src/lib/turnstile.ts` (20-80),
  `src/instrumentation.ts` (25-85), `scripts/ops/snapshot.mjs` (175-215),
  `.github/workflows/snapshot.yml` (55-95), `scripts/qa/protocol-audit.mjs` (140-150),
  `src/app/(main)/notice/[id]/page.tsx` (1-30), and the five rule tests whose `indexOf`
  needles the sweep could not auto-resolve (`river-query.test.mjs`, `group-succession.test.mjs`,
  `catchups-core.test.mjs`, `normalize.test.mjs`, `auth-flow-rule.test.mjs`,
  `unattended-rule.test.mjs`, `mail-queue-rule.test.mjs`), each needle then checked against
  its real target by hand.
- Skimmed (why): the 48 lab-internal exports and 9 lab types (charter: list them, do not read
  each room); the 29 `commented-out-code.txt` candidates were read at one line of context
  each, which is enough to tell prose from code.
- Not read (why): the bodies of the 102 `*.test.mjs` beyond their import blocks and the
  slices above (a lib-tests-shaped lens owns them); the interiors of `email-queue.ts`,
  `hoopoe-geometry.ts`, `photo-river.tsx`, `collection-client.tsx` beyond the flagged symbols'
  reference sites (territory agents own them).
- Uncommitted edits seen (someone else's WIP): none at audit time. The system snapshot
  showed `M src/components/common/image-viewer.tsx`, but by the time I ran `git status` HEAD
  `72b5a1d` ("fix(viewer): the chrome stays under a resting cursor") had absorbed it and the
  tree held only this audit's own untracked folder.

## Summary

The tools found 7 unused files, 70 unused exports, 11 unused types, 4 tsc-unused locals and
1 flagged dependency. After verification the picture is: **two genuinely dead files** (the
old filter-row chrome, 80 lines, orphaned by the 2026-08-28 sentence-line migrations and the
same day's Collection river rewrite, which also makes audit-1 owner decision 17 moot), **one
fully-plumbed subsystem nobody can reach** (the feed's sort and time-filter controls: ~150
lines end to end, client state through server action through two Prisma orderings, behind a
`showControls` prop whose only caller passes `false`), **two dead symbols and two dead
re-export lines** among the 22 non-lab exports (the rest are de-export hygiene or pins),
**~17 dead lines in globals.css** (the login-hoopoe wing rules that no shipped markup ever
carried, and two shadcn token pairs no class uses), **~421 KB of tracked public assets**
nothing references (three leftovers of a lab-room rewrite plus one thumbnail unreferenced
since June), and **the showcase family exactly where audit 1 left it** (off, decoupled,
2,477 lines and 283 KB of webp riding the owner's ship-vs-retire call, with the H12
Privacy/Terms front-door links still homeless).

Everything else the tools flagged is a false positive with a named reason: `@prisma/client`
is imported by the generated client that knip is told to ignore; `photo-suggest.ts` is
imported by a hand-run pass script (a knip entry, invisible to `--production`); the madge
orphans are framework files; 48 of the 70 exports are `/lab`. The hunts that came back clean
are worth recording so nobody repeats them: no always-set or never-set env flag with a dead
branch (44 keys, every one read, the questionable ones carry in-code defaults); no API route
without a caller (the two webhooks and the NextAuth handler are called from outside by
design); no Prisma model without a call site (audit 1's four drops are done); no vacuous test
pin (17 guarded `indexOf` sites, 14 kit slices, every unguarded needle I checked resolves);
zero commented-out code (all 29 candidates are prose, again); every script is ledgered.

Structural vs cheap: findings 01, 02, 03, 06 are structural (files, a subsystem, tracked
bytes); 04, 05, 07, 08, 09, 10 are cheap hygiene that keeps knip and tsc quiet. What surprised
me: how much of this list is dated 2026-08-28. Four chrome changes landed that day (directory
sentence line, Profession-for-House, the Collection river, the crop room rewrite) and each
left one orphan behind. That is the pattern to watch for at fix time: a rewrite commits the
new thing and forgets to `git rm` the old.

Honest totals: **~280 lines of code** (80 dead files + ~150 unreachable feed controls if the
owner cuts them + ~40 SortPill/HOUSE_OPTIONS + ~10 small), **~17 lines of CSS**, **~421 KB
tracked + ~6 MB untracked public bytes**, **20 exports narrowed**, **0 dependencies** (both
flagged deps are needed), and one moot audit-1 owner decision closed.

---

## Findings

### dead-code-01 - Delete the two orphaned filter-kit files (`active-filter-chips.tsx`, `result-count.tsx`)
- **Where**: `src/components/common/filters/active-filter-chips.tsx:1-61` (whole file),
  `src/components/common/filters/result-count.tsx:1-19` (whole file); two comments that name
  the first as a "twin": `src/components/common/filters/sentence-line.tsx:121` and
  `src/components/common/filters/filter-sheet.tsx:58`
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip lists both as unused files under both configs; madge lists both as
  orphans. Import-aware grep across `src`, `scripts`, `e2e`: zero importers of either path
  (the only textual matches are the two "twin" comments above and audit-1 documents).
  `git log --follow`: `active-filter-chips.tsx` last touched 2026-08-03 (`b5760cb`),
  `result-count.tsx` untouched since its creation on 2026-07-18 (`180968d`). Who used to
  consume them: the two-piece filter chrome that Directory and Collection ran before the
  sentence line. Today `sentence-line.tsx` is imported by `admin-filter-bar.tsx`,
  `people/people-list.tsx`, `content/content-list.tsx` and `directory-client.tsx`, and the
  Collection's chrome is `river-controls.tsx` ("the controls are one line of words",
  `8a0ba37`, 2026-08-28). The mobile chip strip and the "42 people" line have no caller left.
  `docs/OPERATIONS.md` §8 still says knip's unused-file list "is now 5, and all five are the
  landing showcase" -- it is 7 because of these two, which is exactly the tool doing its job.
- **What to do**: `git rm` both files. Edit the two comments so they no longer point at a
  file that is gone (sentence-line.tsx:121 "Matches its twins in active-filter-chips.tsx and
  filter-sheet.tsx" becomes "Matches its twin in filter-sheet.tsx"; filter-sheet.tsx:58
  "Kept identical to the Clear all in active-filter-chips.tsx, its desktop twin" becomes a
  pointer to sentence-line.tsx). Update the OPERATIONS.md §8 sentence in the same commit
  (the count goes back to 5). Record in the audit-1 carry-over that owner decision 17 is
  closed by the 2026-08-28 work rather than by a decision.
- **Saving**: 80 lines, 2 files, one `X` Lucide import and one `PILL_SET` consumer fewer
- **Risk & gate**: near-zero. `npm run check` (tsc proves no importer); `npm run visual`
  (directory and collection are in the suite, and neither can change because neither
  renders these).
- **Confidence**: high. What would change my mind: a mobile Collection chip strip that some
  other session is mid-way through re-adding -- `git log` shows no such work, and the river
  controls were designed as one line for both viewports.
- **Notes**: This closes audit-1 owner decision 17 ("Collection's filter row vs the sentence
  line ... keeping both systems alive (~80 lines)") without the owner having had to decide:
  the Collection rework replaced the old chrome, and the ~80 lines the audit estimated are
  exactly these two files. The third copy of the "Clear all" text-button class string
  (sentence-line, filter-sheet, active-filter-chips) shrinks to two with this delete --
  noted for the duplication lens.

### dead-code-02 - The feed's sort and time-filter controls are fully plumbed and unreachable
- **Where**: `src/components/posts/post-feed.tsx:281-343` (the `{showControls && (...)}`
  block: search `Input`, the Filters disclosure, two `Select`s), `:23-24` (`SortBy`,
  `TimeFilter` types), `:59-61` (`sortBy`, `timeFilter`, `filtersOpen` state), `:6,10-12`
  (the `MagnifyingGlass`, `SlidersHorizontal`, `Input`, `Select*` imports that only the
  block uses), `:102-105,139,149,208,308` (the state threaded into `fetchPosts` and the
  divider logic); `src/components/posts/feed-column.tsx:40-41` and `:14-19` (the
  `showControls` prop, default `true`, passed through); `src/app/(main)/feed/page.tsx:85`
  (the ONLY caller, `showControls={false}`); `src/app/(main)/feed/actions.ts:1041-1070`
  (`getTimeFilterDate`, ~30 lines), `:1140-1149` (the `sortBy`/`timeFilter` options and
  defaults), `:1234-1265` (the count-sort offset-paging arm, ~32 lines)
- **Phase**: placeholder (a prop every caller sets away from its default; a subsystem with
  no visible control)
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: `grep '<FeedColumn'` finds one site, feed/page.tsx:84-90, which passes
  `showControls={false}`. `grep '<PostFeed'` finds one site, feed-column.tsx:40, which passes
  `showControls={showControls}`. So `showControls` is `false` on every render the app can
  produce, and the `{showControls && (...)}` block at post-feed.tsx:281 has never rendered
  since the header search pill took over the feed's search (the banner at :261 documents
  this: "the Feed page's own search now lives in the header pill"). The two `Select`s inside
  the block are the only UI that sets `sortBy` or `timeFilter`; nothing else in `src` writes
  them (grep: `setSortBy`/`setTimeFilter` occur only at :319 and :329). Their defaults
  (`"recent"`, `"all"`) are therefore the only values the server action ever receives.
  Server side, `getTimeFilterDate` and the `sortBy !== "recent"` offset-paging arm exist only
  to serve those values -- and both carry audit-fixed bugs (Low 48: valley-day boundaries;
  Low 79: negative offset clamp; B-122: total ordering on ties), i.e. three audits fixed code
  no member can reach. No rule test pins any of it (`grep getTimeFilterDate|sortBy|offset:`
  across `*.test.mjs` returns only river-cursor's own offsets).
- **What to do**: this is a product call, written up in Owner decisions. If the answer is
  "cut": delete post-feed.tsx:281-343 and the branch-only imports/state (`filtersOpen`,
  `sortBy`, `timeFilter`, `SortBy`, `TimeFilter`, `MagnifyingGlass`, `SlidersHorizontal`,
  `Input`, the `Select*` imports if nothing else in the file uses them), simplify :139 and
  :208 (drop the `sortBy === "recent" && timeFilter === "all"` guards, which become
  constant-true), remove the `showControls` prop from both `PostFeed` and `FeedColumn` and
  the `showControls={false}` at feed/page.tsx:85 (KEEP the `search &&` banner at :261-279,
  which is live: it is what shows "Showing posts for ..." when the header pill searches);
  in feed/actions.ts delete `getTimeFilterDate`, the `sortBy`/`timeFilter` option fields and
  the whole `else` arm at :1234-1265 so `loadPosts` keeps only keyset paging; then
  `npm run check` will name any `valleyDayStart`/`valleyMidnight` import that became
  unused. If the answer is "keep and surface": the block needs a home (the header pill's
  line has none today) and a design session; nothing to delete.
- **Saving**: ~150 lines if cut (63 client block + ~15 state/imports/types + ~30
  `getTimeFilterDate` + ~32 offset arm + ~10 prop plumbing), one fewer query shape in the
  busiest action file, and the `Select` kit leaves the feed route's client graph (it is
  still used elsewhere, so no chunk disappears app-wide)
- **Risk & gate**: medium -- feed/actions.ts is the busiest actions file and
  `feed-write-rule.test.mjs` / `security-regressions.test.mjs` slice it (neither touches
  these arms, verified by grep, but run the full suite). `npm run check`; open `/feed`, then
  `/feed?q=valley` and confirm the "Showing posts for" banner and its Clear still work;
  scroll two pages to prove keyset paging is untouched; `npm run visual` (feed is masked
  under the header, so a red run here is real).
- **Confidence**: high that it is unreachable; the decision is the owner's.
- **Notes**: This is the answer to the charter's "is there a second showcase-like
  switched-off subsystem" question. It is not a flag; it is a prop hard-wired one way, which
  is why the `false &&` / `ENABLED = false` greps found nothing. The `showControls` default
  of `true` is the tell: a default nobody takes. Fear: the "Most liked / Most discussed"
  sorts might be something the owner remembers asking for and expects to find; if so the
  fix is surfacing, not deleting, and this finding becomes a UI task. Related: the header
  search pill (`8a10763`, 2026-08-30) is what made the block unreachable.

### dead-code-03 - Delete `SortPill` and `HOUSE_OPTIONS`, the leftovers of the 2026-08-28 chrome changes
- **Where**: `src/components/common/filters/facet-select.tsx:110-149` (`SortPill` and its
  doc comment, 40 lines), `:28-31` and `:35-37` (`FacetOptionsPopup`'s `anyItem?` optionality
  exists only for SortPill), `src/components/common/filters/pill-shell.tsx:10` and
  `facet-select.tsx:29` (comments naming SortPill); `src/lib/directory-facets.ts:11,14`
  (`HOUSE_OPTIONS` and the `HOUSES` import it alone uses)
- **Phase**: dead
- **Tier**: T1     **Class**: structural (small)     **Decides**: autonomous
- **Evidence**: knip flags both. `SortPill`: zero JSX renders anywhere in `src` (lab
  included); the only matches are its definition and two comments. `git log -S SortPill`:
  last consumer removed in `8a0ba37` (2026-08-28, the Collection river), and the owner had
  already removed sorting from the directory on 2026-08-03 (`directory-facets.ts:8-9`: "the
  owner removed the control on 2026-08-03 ('I think we just remove sorting')"). `HOUSE_OPTIONS`:
  self=1; `directory-client.tsx:18` imports only `TYPE_OPTIONS`; `git log -S HOUSE_OPTIONS`
  shows the consumer left in `37e6f32` (2026-08-28, "Profession for House"). Both are one-day
  orphans of rewrites that committed the new thing and left the old.
- **What to do**: delete `SortPill` (facet-select.tsx:110-149); make `anyItem` a required
  prop of `FacetOptionsPopup` and drop the `{anyItem && ...}` guard (2 lines simpler); fix
  the two comments; delete `HOUSE_OPTIONS` and the `HOUSES` import in directory-facets.ts
  (the file keeps `TYPE_OPTIONS`; if the House facet ever returns it is one line against
  `HOUSES`, which stays in `houses.ts`).
- **Saving**: ~43 lines
- **Risk & gate**: low. `npm run check`; `npm run visual` (directory and both admin lists
  render FacetSelect, which is untouched).
- **Confidence**: high.
- **Notes**: SortPill's doc comment is a good design note ("canopy means narrowing your
  results, and sort never narrows"); if a sort control ever comes back, `git log -p` has it.

### dead-code-04 - globals.css: the login-hoopoe wing rules and two shadcn token pairs have no consumer
- **Where**: `src/app/globals.css:672-681` (`.hoopoe .wing`, `.hoopoe:not(.covered) .wing-l`,
  `.wing-r`, `.hoopoe .eye`, `.hoopoe.covered .eye`, with the comment "Hoopoe (login
  password delight)"); `:33` (`--color-primary-foreground`), `:107` and `:281`
  (`--primary-foreground`); `:27` (`--color-accent-foreground`), `:146` and `:294`
  (`--accent-foreground`); optionally `:44` (`--radius-3xl`)
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: token-by-token sweep of every custom property, `@utility`, `@layer`
  class and keyframe in the file against `src` (raw `var(--x)` uses plus the Tailwind class
  each `@theme` token binds: `bg-/text-/border-/ring-/outline-/fill-/stroke-/from-/to-` for
  colours, `rounded-` for radii, `ease-` for eases, `z-` for stacking, `font-` for fonts,
  `-xxs..-xxl` for the LiftKit steps). Results: `primary-foreground` 0 occurrences in `src`
  outside globals.css (the canopy CTA uses `text-white`, `CANOPY_FILL` at button.tsx:22-23);
  `accent-foreground` 0 occurrences that are not `sidebar-accent-foreground` (a different,
  live token); `rounded-3xl` 1 occurrence, a specimen row in `src/app/lab/craft/page.tsx:500`.
  `node_modules/shadcn/dist/tailwind.css` (the `@import "shadcn/tailwind.css"` at line 2)
  contains only two accordion keyframes and eleven `data-*` variants -- it does not consume
  these tokens either. The wing rules: no element in shipped `src` carries `className`
  `hoopoe`, `wing`, `wing-l`, `wing-r` or `covered` (grep across `src` and `public`, all
  file types); the login bird is `src/components/mascot/hoopoe.tsx`, animated by Motion.
  `git log -S wing-l` over `src/components` and `src/app/(auth)` returns nothing: no shipped
  component ever rendered this markup. The one place that does, `src/app/lab/v2/page.tsx:54-55`
  and `:787-789`, carries its own inline `<style>` copy of the same rules, so even the lab
  room does not depend on the globals copy. Everything else in the 726 lines is alive,
  including every LiftKit step (`--space-xxs` 16 uses, `--space-xxl` 7), every ease, all
  three `--z-*`, `--shadow-ink`, `--state-press` (consumed inside the `state-layer` utility
  at :532), `.glass` (support page), `.valley-tree`, `.deeplink-flash`, `.bell-trigger`,
  `.dotsep`, `.skeleton-warm` (222 uses), `.card-elevated` (114) and `html.has-scrubber`
  (the phone scrubber). Audit 1's four dead items (`--z-base`, `--space-3xl`, `--chart-*`,
  `.animate-bell`) are gone -- that list was executed.
- **What to do**: delete lines 672-681 and their header comment; delete the six
  `primary-foreground` / `accent-foreground` lines (light, dark, `@theme` binding for each).
  `--radius-3xl` is the lab lens's call (one lab specimen table names it; deleting the token
  would make that row show `rounded-3xl`'s Tailwind default instead of the calc, which is
  probably fine, but it is inside a room).
- **Saving**: ~17 lines of CSS source; a few dozen bytes in the 233 KB stylesheet every
  route ships (the `:root`/`.dark` declarations are emitted verbatim)
- **Risk & gate**: `npm run visual` (the whole point of the suite); open `/login` and type in
  the password field to confirm the hoopoe still covers its eyes (it animates from
  hoopoe.tsx, not from these rules); the shape+colour protocol audit in `npm run check`
  reads globals.css and must stay green.
- **Confidence**: high. What would change my mind on the wing rules: a `class="hoopoe"`
  string built dynamically -- I grepped for `hoopoe` as a className fragment and found only
  the mascot's own classes (`hoopoe-*` hyphenated names, not `.hoopoe .wing`).
- **Notes**: the two shadcn token pairs are the same class of thing as audit 1's
  `--chart-1..5`: scaffold tokens the design system never adopted (the CTA is Canopy with
  white ink, the hover ladder is `state-layer`). Re-adding a pair costs three lines if a
  future component wants it. I looked hard at the `@theme inline` block as a whole
  (34 colour bindings) because the shadcn import might have made it redundant; it has not --
  shadcn v4's stylesheet no longer maps tokens, so ours is the only mapping. Not bloat.

### dead-code-05 - The non-lab knip exports: sixteen de-exports, two re-export-line deletes, two pins kept
- **Where** (each with its in-file references):
  - `src/components/collection/photo-river.tsx:27` `preloadViewer` (used :97-98), `:202`
    `bandsOf` (used :403; named in comments by `river-query.test.mjs:80,107` and
    `e2e/collection-journeys.spec.ts:100`, neither imports it -- a `.mjs` cannot import a
    `"use client"` `.tsx`), `:258` `READING_LINE` (used :286, :329)
  - `src/components/collection/river-controls.tsx:63` `RIVER_ORDERS` (used :71, :246), `:70`
    `orderLabel` (used :240, :242)
  - `src/components/mascot/moments/moment-hoopoe.tsx:43` `useMomentAutoplay` (used :101)
  - `src/lib/auth-tokens.ts:77` `hashToken` (used :121, :183, :275; `email-actions.ts:175`
    names it in a comment only)
  - `src/lib/avatar.ts:44` `BIRD_SPECIES_COUNT` (used :162; `avatar.test.mjs:150` names it in
    a comment and defines its own `SPECIES_COUNT = 50` at :27), `:47` `BIRD_POSE_COUNT` (used
    :164)
  - `src/lib/collection-photo.ts:26` `THUMB_PX` (used :212)
  - `src/lib/hoopoe-geometry.ts:32` `H` (used :117-271, eleven sites), `:331` `PEEK_CREST`
    (used :336). Importers of the module -- `mark-centring.test.mjs:23`,
    `scripts/dev/build-app-icon.mjs:15`, `lab/hoopoe-marks/*`, `lab/glass-edges` -- import
    `PEEK_AXIS`, `PEEK_VIEW`, `PEEK_VIEW_BOX`, `G`, `crestPrims`, `facePrims`, `featherPrims`,
    `billPrims`, `peekPrims`, `primsToSvg`; none imports `H` or `PEEK_CREST`
  - `src/lib/map-cluster.ts:66` `TAP_MIN_PX` (used :121-122; `scripts/qa/map-cluster-verify.mjs:40`
    defines its OWN `const TAP_MIN_PX = 44` rather than importing -- audit 1 recorded this as
    "K-used", which was wrong: it is a copy, not a consumer)
  - `src/lib/rich-text-editing.ts:89` `FORMAT_SHORTCUTS` (used :99)
  - `src/lib/photo-visibility-rule.ts:23` `PHOTO_SCOPES` (only derives `PhotoScope` at :24,
    which IS imported elsewhere)
  - `src/lib/email.ts:77` `SEND_TIMEOUT_MS` (used :217, :220; `mail-queue-rule.test.mjs:73,127`
    read it by REGEX over the file text -- `/SEND_TIMEOUT_MS = ([\d_]+)/` -- which matches
    with or without `export`)
  - `src/components/admin/admin-nav.ts:32` `AdminSectionDef` (type; used :44 --
    audit 1's "used at :43" meant this in-file use)
  - `src/components/posts/create-post-form.tsx:74` `ComposerScope` (type; used :85, :140)
  - **Re-export lines**: `src/lib/upload-ownership.ts:3,5` -- `MAX_IMAGES` and `MAX_IMAGE_URL`
    are imported from `upload-ownership-rule.ts` and immediately re-exported; every consumer
    (the rule test at `upload-ownership-rule.test.mjs:7-8`, `image-aim.ts:55` in a comment)
    reaches the rule file directly. Audit 1 marked these "K-used, upload-ownership-rule.ts
    consumes" -- the direction was backwards; the rule file DEFINES them.
  - **Pins kept**: `src/lib/email-queue.ts:394` `dailyBudget` (used :773, :793, :995;
    `mail-queue-rule.test.mjs:44` slices the file at the literal string
    `"export async function dailyBudget"` to pin B-071 -- a rule worth keeping: a bounce
    webhook flipping a delivered row to `failed` must not hand back a budget slot). Audit 1
    said "admin mail actions import it"; they do not (`admin/mail/actions.ts:88` names it in
    a comment). `src/lib/last-seen.ts:18` `SESSION_GAP_MIN` -- audit-1 not-finding, kept as
    documentation of a window enforced in proxy.ts.
- **Phase**: hygiene (de-export) / dead (the two re-export lines)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: per-symbol word-boundary grep across `src`, `scripts`, `e2e` with the
  import-path check (counts above). knip is right that nothing imports any of them; my
  addition is that sixteen are used inside their own file (de-export, not delete), two are
  pure pass-throughs (delete the line), and two are read by a test that pins a real rule.
- **What to do**: remove the `export` keyword on the sixteen; in `upload-ownership.ts` change
  line 3 to `import { decideOwnedUploads } from "@/lib/upload-ownership-rule";` and delete
  line 5. Leave `dailyBudget` exported (or, if the fixer prefers a clean knip run, de-export
  it AND change the needle at `mail-queue-rule.test.mjs:44` to `"async function dailyBudget"`
  in the same commit -- note that test's slice has no `-1` guard, and its first assertion is
  an absence check that would pass vacuously on a missed needle; only its second assertion
  would fail loudly). Leave `SESSION_GAP_MIN`. Run the FULL unit suite, not just tsc: three of
  these files are sliced as text by rule tests (`email.ts`, `email-queue.ts`,
  `photo-visibility-rule.ts` via `photo-visibility-rule.test.mjs`, which imports
  `classYearsOf` etc. -- unaffected by `PHOTO_SCOPES` losing `export`, but run it).
- **Saving**: 0 lines for the de-exports (API narrowing: 16 accidental public symbols
  fewer), 2 lines for the re-export; knip's non-lab export list goes from 22 to 2 (the two
  documented keeps), which is what makes the next audit an hour
- **Risk & gate**: low. `npm run check` end to end.
- **Confidence**: high per symbol; every count above is post-verification.
- **Notes**: `THUMB_PX` and `TAP_MIN_PX` each have a hand-copied twin in a script
  (`scripts/demo/add-photos.mjs:36`, `scripts/qa/map-cluster-verify.mjs:40`). Importing the
  real constant would be the dedupe; whether a QA script should import from `src/lib` is the
  scripts lens's call (the hand-run passes already do: `tag-photos-apply.mjs:39` imports
  `photo-suggest.ts`). `preloadViewer` is the same one-liner in four files -- see For other
  lenses.

### dead-code-06 - public/: three crop-room leftovers, one June thumbnail, and audit 1's untracked 6 MB
- **Where**: `public/lab/crop/phone-9x16.webp` (141,394 B), `public/lab/crop/pano-21x9.webp`
  (153,150 B), `public/lab/crop/grainy-420.webp` (38,124 B) -- tracked;
  `public/images/collection/c3-thumb.webp` (87,682 B) -- tracked;
  `public/images/landing-original.jpeg` (6.0 MB), `public/.DS_Store`,
  `public/images/.DS_Store` -- untracked, on disk
- **Phase**: dead
- **Tier**: T1     **Class**: structural (bytes)     **Decides**: autonomous (c3-thumb needs
  one SELECT first)
- **Evidence**: every one of the 58 tracked `public/` files was grepped by basename and by
  extensionless stem across `src`, `scripts`, `e2e`, `docs`, `.claude`, `next.config.ts`
  (the extensionless pass is what keeps the `demo-*` Collection images alive: `content.ts:699-787`
  uses `file: "demo-banyan-benches"` keys and `seed.ts:320` appends `-thumb.webp`). The
  three crop files have 0/0 references; the room's own `_specimens.ts:36-95` names only the
  eleven `shape-*.webp`, and `lab/collection/_archive.ts:25` says "its specimens and their
  eleven webp files". `git log`: all three added in `26dc483` (2026-08-27, "six ways to hold
  a photograph") and orphaned the next day by `6fb0780` ("the crop room shows what we do,
  not what we might do"), which rewrote the room around the eleven shapes and did not
  `git rm` the previous set. `c3-thumb.webp`: 0/0 references; `c3.webp` itself is used
  (`demo-seed/content.ts:115`, two lab letterhead variants) but nothing builds its `-thumb`
  path (the lab viewer at `lab/viewer/page.tsx:81-87` lists `c1-thumb`, `c4-thumb`,
  `c2-thumb` and not `c3-thumb`); unreferenced since `c559d3e` (2026-06-28). The untracked
  trio is audit-1 dead-code-07, never executed (`comm -13 <(git ls-files public) <(find
  public -type f)` still lists exactly these three; the two WhatsApp originals and the
  `public/uploads` leftovers from that finding are gone).
- **What to do**: `git rm` the three crop files (no gate beyond `/lab/crop` still rendering
  its eleven shapes). For `c3-thumb.webp`, run audit 1's read-only check first on BOTH
  databases: `SELECT id, url, "thumbUrl" FROM "Photo" WHERE "thumbUrl" LIKE '%/images/collection/c3-thumb%' OR url LIKE '%/images/collection/c3%';`
  -- an empty result means delete; a row means the file is data-referenced and stays until
  the row is repointed. Delete `landing-original.jpeg` and the two `.DS_Store` files
  (untracked; re-run `git status` at fix time per the shared-tree rule -- if the original
  photograph is wanted as an archive it belongs outside the repo folder, per the owner's
  root-directory rule). `.gitignore` already covers `.DS_Store` (they are untracked, not
  staged), so no config change.
- **Saving**: ~421 KB tracked (cloned into every Vercel build and every `git clone`) + ~6 MB
  local; 4 tracked files, 3 untracked
- **Risk & gate**: near-zero for the crop files and the untracked junk; the SELECT above is
  the whole gate for c3-thumb. `npm run verify:crawl` after (collection and the lab crop room
  render).
- **Confidence**: high on all seven. The only thing that would change my mind on c3-thumb is
  a Photo row, which is why the SELECT is written into the step.
- **Notes**: the `/lab/crop` room is self-declared throwaway ("Delete this room,
  public/lab/crop/ and its registry row once the rules are settled", `page.tsx:22`,
  `_specimens.ts:17`, `_registry.ts:166`). Retiring the room and its eleven shapes
  (1,582 KB) is the lab lens's item and the owner's call; the three files here are dead
  whichever way that goes. Also in this folder, alive but worth naming so nobody "cleans"
  them: `rishi-valley-mountain-mark-dark.svg` and `-white.svg` (0 refs, 1.7 KB total) are
  the master vectors audit 1 recommended keeping; `landing/*-v2.webp` and
  `landing/collection.webp` (283 KB) are referenced only by `shots.ts` inside the showcase
  and follow its fate (Owner decisions).

### dead-code-07 - The landing hero's scroll cue is a placeholder that rides the showcase decision
- **Where**: `src/components/landing/landing-hero.tsx:124` (`showScrollCue = true` default),
  `:412-424` (the cue block), `:112-122` (`nudgeVariants`, only the cue uses it), `:8`
  (`ChevronDown` import, only the cue uses it); `src/app/page.tsx:36` (the ONLY caller,
  `showScrollCue={false}`)
- **Phase**: placeholder
- **Tier**: T4     **Class**: cheap     **Decides**: owner (with the showcase)
- **Evidence**: `grep showScrollCue src` -- one caller, which passes `false`; the block's
  own comment says why ("Suppressed while the showcase below the hero is held back ...
  pointing down at a page that does not scroll is worse than pointing at nothing"). It is a
  ~20-line branch whose only enabling condition is the showcase coming back
  (`page.tsx:27`: "flip `showScrollCue` to true so the hero points at something again").
- **What to do**: nothing on its own. It dies with "retire the showcase" and lives with
  "ship it". Recorded so the showcase decision's cost list is complete.
- **Saving**: ~20 lines and one Lucide glyph off the landing route's client graph, only if
  the showcase is retired
- **Risk & gate**: n/a until the owner decides; then `npm run visual` (landing is in the
  suite).
- **Confidence**: high.
- **Notes**: this is the same shape as dead-code-02 (a prop with a default no caller takes)
  at a smaller scale, and the pattern is worth a line in the fix session's notes: when a
  prop's default is never used, the default is the placeholder.

### dead-code-08 - Button: the `link` variant and the `icon-xs` / `icon-lg` sizes render nowhere
- **Where**: `src/components/ui/button.tsx:113` (`link`), `:130` (`icon-xs`), `:132`
  (`icon-lg`)
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `variant="link"` 0 sites in `src` (lab included), and no computed
  `variant: "link"`; `size="icon-xs"` and `size="icon-lg"` 0 sites; by contrast
  `icon-sm` has 8 non-lab sites and `icon` 2, `xs` 2, `sm` 23, `lg` 9, `primary` 64,
  `outline` 62, `ghost` 17, `destructive` 12, `secondary` 3. `variant="default"` is used once
  (a lab room) and is also the `defaultVariants` target, so it stays.
- **What to do**: delete the three cva entries. `npm run check` will catch any string-typed
  caller tsc can see; there are none.
- **Saving**: 3 lines; ~200 bytes out of a chunk that rides all 52 non-lab routes
- **Risk & gate**: low. `npm run check`; `npm run visual`.
- **Confidence**: high.
- **Notes**: audit-1 dead-code-12 kept the shadcn kit's unused SUB-COMPONENT exports as a
  class because regenerating a hand-tuned kit is risky. These are cva strings in a file that
  is already hand-tuned past regeneration (the `CANOPY_FILL` constant, the icon-child
  detection), so that argument does not apply; re-adding a size is one line. If the fixer
  prefers to keep the kit's shape untouched on principle, that is defensible too -- the
  saving is tiny.

### dead-code-09 - The four tsc-unused locals
- **Where**: `src/components/catchups/round/answer-photos.tsx:149` and
  `src/components/posts/post-card.tsx:553` (the `photo` parameter of a `PhotoRows` render
  prop, unused), `src/components/collection/photo-river.tsx:472` (the `i` parameter of a
  `PhotoStream` render prop, unused); `scripts/dev/merge-cities.ts:22`
  (`const CANONICAL_PLACE_ID = null as number | null; // resolved below by lookup` -- never
  assigned, never read; its only other mention is the header comment at :10 telling the
  next user to "edit VARIANTS/CANONICAL_PLACE_ID below per merge")
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `tsc --noUnusedLocals --noUnusedParameters` (raw/tsc-unused.txt); read each
  site. The three render-prop params are positional (`(photo, i, cell) =>`) so the first
  two must be named to reach `cell`.
- **What to do**: rename to `_photo` / `_i` (the repo's tsconfig does not run
  `noUnusedParameters`, so this is for the next audit's tool run and for readers); in
  merge-cities.ts delete line 22 and the word in the :10 comment, or make it real -- the
  script's own header promises a lookup that does not exist (scripts lens owns the file;
  flagged here because it is the one genuinely dead declaration of the four).
- **Saving**: 1 line; three clearer signatures
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: the three React sites are not bloat, just positional parameters; they are here
  so the next `tsc --noUnusedLocals` run is empty and a real unused local stands out. The
  merge-cities constant is the interesting one: a script header that documents a knob the
  script does not have is the kind of "excellent and wrong" comment audit 1 warned about.

### dead-code-10 - knip: record the two false positives and close the configuration hints
- **Where**: `scripts/qa/knip.jsonc`; `docs/OPERATIONS.md:§8` (the "list is now 5" sentence)
- **Phase**: architecture (tooling)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: (1) `@prisma/client` -- knip says unused; nothing in `src`, `scripts`,
  `prisma.config.ts` or `next.config.ts` imports it by name, BUT the generated client does:
  `src/generated/prisma/client.ts:18` `import * as runtime from "@prisma/client/runtime/client"`
  and `commonInputTypes.ts:12` likewise (generator `prisma-client`, `schema.prisma:1-4`).
  knip cannot see it because `src/generated/**` is in `ignore`. It is a runtime dependency;
  removing it would break every Prisma call at boot. (2) `prisma` under `--production` --
  the CLI, run by `package.json` `postinstall: prisma generate` and loaded for
  `prisma.config.ts`; a convention knip's production mode does not model (whether it belongs
  in `dependencies` or `devDependencies` is the dependency lens's question -- Vercel installs
  devDependencies for the build, so either works). (3) knip's two "Configuration hints":
  `src/generated/**` "Remove from ignore" and `prisma.config.ts` "Remove redundant entry
  pattern" (knip's Prisma plugin already registers it). (4) `photo-suggest.ts` under
  `--production` -- imported by `scripts/dev/tag-photos-apply.mjs:39` via
  `../../src/lib/photo-suggest.ts`, plus its 19-test file; scripts are entries in the repo
  config, so the authoritative run does not flag it. Used via the hand-run-pass convention
  (`docs/spec/hand-run-passes.md`, the rules live beside their tests in `src/lib`). Not dead.
  (5) the madge orphans `forbidden.tsx`, `instrumentation.ts`, `proxy.ts`,
  `generated/prisma/browser.ts` are Next/Prisma conventions (brief §5c).
- **What to do**: add `"ignoreDependencies": ["@prisma/client"]` to knip.jsonc with a
  one-line reason ("imported only by the generated client under src/generated, which is
  ignored"); try the two hints (`npx knip --config scripts/qa/knip.jsonc` after each --
  if removing `src/generated/**` from `ignore` floods the report, put it back and note why);
  fix the OPERATIONS.md sentence when dead-code-01 lands.
- **Saving**: 0 lines; a knip run whose every line is a real question
- **Risk & gate**: none (tool config; knip is not in `npm run check`).
- **Confidence**: high.
- **Notes**: the point of recording false positives in the config rather than in a report is
  that the next person to run knip sees a list where every line is a question. Today two of
  its lines (`@prisma/client`, the seven files) need this document to interpret; after
  dead-code-01 and this item, none do. I did not run knip myself (brief rule 3); the hints
  are knip's own words from `raw/knip-repo-config.txt`.

---

## The floor deliverables (the charter's explicit questions)

### A. The 70 unused exports and 11 types, triaged

| Bucket | Count | Symbols |
|---|---|---|
| Lab-internal (lab lens; listed in section B) | 48 exports + 9 types | see table B |
| De-export (keep the symbol, drop `export`) | 16 exports + 2 types | preloadViewer, bandsOf, READING_LINE, RIVER_ORDERS, orderLabel, useMomentAutoplay, hashToken, BIRD_SPECIES_COUNT, BIRD_POSE_COUNT, THUMB_PX, H, PEEK_CREST, TAP_MIN_PX, PHOTO_SCOPES, FORMAT_SHORTCUTS, SEND_TIMEOUT_MS; AdminSectionDef, ComposerScope (dead-code-05) |
| Delete outright | 2 | SortPill (40 lines), HOUSE_OPTIONS (dead-code-03) |
| Delete the re-export line only | 2 | MAX_IMAGES, MAX_IMAGE_URL in upload-ownership.ts (dead-code-05) |
| Test-only pin, worth keeping | 1 | dailyBudget -- B-071 (the budget counts what Resend accepted, not row status); the test slices on the exported declaration string |
| Documented keep | 1 | SESSION_GAP_MIN (audit-1 not-finding) |

22 non-lab exports accounted for: 16 + 2 + 2 + 1 + 1. Both non-lab types de-export. So the
answer to "how many de-export / delete / test-only": **16 de-export, 2 delete, 2 re-export
lines, 1 test-only pin (kept), 1 documented keep**, among the 22 that are not `/lab`.

Of the `--production` extras (66 more exports, 1 more type, 1 more file, 1 more dep):
every one is test-consumed (`FIRST_BATCH_YEAR`, `dailyBucket`, `computeStatus`, `ERAS`,
`storedPixelFit`, `classYearsOf`, `firstGrapheme` ...), script-consumed (`stripRosterInitials`
by import-roster, `photo-suggest.ts` by tag-photos-apply, `PEEK_AXIS`/`PEEK_VIEW` by
mark-centring and build-app-icon) or a documented honesty check (`DEMO_CLOSED_PATHS`,
`ACTION_FAILED`). That run excludes the unit suite and scripts by definition, so its extra
lines are the config gap audit 1 closed, not findings. `BandCount`
(`collection/actions.ts:761`) is the one type it adds: exported for a test, kept.

### B. The 48 lab-internal exports and 9 lab types (one table, not read room by room)

| File | Symbols |
|---|---|
| `lab/_kit.tsx` | BASE_CSS |
| `lab/directory/_chrome.tsx` | FilterPanel, describeFilters, SentenceLine |
| `lab/directory/_data.ts` | PLACES, makeMembers; types Place, ScaleKey |
| `lab/directory/_maps.tsx` | WorldCanvas, usePoints |
| `lab/directory/_people.tsx` | ShippedCard, PersonRow, CompactCard, RuledRow |
| `lab/directory/_profession.tsx` | LIVE_ROWS, LIVE_TOTAL, TAGGED, FIELDS, STAGES |
| `lab/groups-rethink/_data.ts` | PEOPLE; type Person |
| `lab/groups-rethink/_shell.tsx` | BirdAvatar (a lab local, not the shipped one) |
| `lab/hoopoe-marks/_parts.tsx` | H, Feather, Eye, Bill |
| `lab/landings/_shared.ts` | type Shot |
| `lab/profiles/_chain-kit.tsx` | yearRange; type ChainMetrics |
| `lab/profiles/_data.ts` | type MockLinkKind |
| `lab/spine/_columns.tsx` | VIEWPORT, SIDEBAR, UNI_LEFT |
| `lab/support-ideas/_shared.tsx` | PLEDGE, SEGMENTS, MONTHLY, BUILD_COST, BUILD_RECOVERED |
| `lab/support/_bars.tsx` | BUILD_COST |
| `lab/tiles/_specimens.tsx` | LETTERS, GATES, SURFACES, verdictFor; type SurfaceScore |
| `lab/type/_fonts.ts` | libre, sourceSans, fraunces, newsreader, instrument, literata, publicSans, inter, figtree, SHIPPED_SET_WIDTH (nine `next/font` loaders with no importer -- audit-1 dead-code-17's build-weight note still stands) |
| `lab/type/_specimens.tsx` | Sheared |
| `lab/_registry.ts` | types LabStatus, LabChildEntry |

Same 48 + 9 as audit 1 minus the ones that audit's fixes removed; unchanged verdict: the
lab lens's, with `_fonts.ts` the only piece with real build cost.

### C. Env keys: which does no deployment set?

Every one of the 44 keys in `env-flags.txt` has a reading site, and none guards a branch
that is dead in every environment (the `IS_POSTGRES` case audit 1 found is fixed). There is
no `.env.example`, and `docs/OPERATIONS.md` has no env table, so the cross-check is against
`docs/spec/demo.md` §2 (the demo's env list and its explicit "do not set"), `vercel.json`,
the three workflows, `next.config.ts`, and each reader's fallback:

| Key | Reader | Verdict |
|---|---|---|
| `SENTRY_ORG`, `SENTRY_PROJECT` | `scripts/ops/snapshot.mjs:185-186` | never set by `snapshot.yml` (it passes only `SENTRY_AUTH_TOKEN`); both have in-code defaults (`"sanan-l0"`, `"javascript-nextjs"`), so the Sentry source still runs. Optional overrides, not flags. |
| `APP_URL` | `src/lib/email.ts:58` | optional override of the canonical origin; documented in README.md:41. Keep. |
| `EMAIL_FROM` | `src/lib/email.ts:30` | optional override with a default. Keep. |
| `SENTRY_DSN` | `src/instrumentation.ts:32` | optional override; the DSN is inlined on purpose (comment at :27-31). Keep. |
| `NEXTAUTH_SECRET` | `src/lib/app-secret.ts:11`, `dev-login/route.ts:68` | the fallback name for `AUTH_SECRET`. Keep. |
| `UPSTASH_REDIS_REST_URL/TOKEN` | `src/lib/rate-limit.ts:166-167` | fail-open with a boot warning ("every limit is OPEN") when unset; the demo omits them on purpose. I cannot read the Vercel dashboard, so whether production sets them is unverifiable here. `docs/planning/bugs.md:259` treats Upstash as real infrastructure; `docs/OPERATIONS.md` has no Upstash section (docs gap, For other lenses). If production does NOT set them, this is a never-set flag carrying two dependencies -- an owner question, not a finding. |
| `TURNSTILE_DEV_CHALLENGE`, `TURNSTILE_DEV_REAL`, `SENTRY_DEV`, `NEXT_PUBLIC_POSTHOG_DEV`, `EMAIL_DEV_SEND` | as in audit 1 §F | real dev switches with incident history. Keep. |
| `VERCEL`, `VERCEL_ENV`, `NEXT_RUNTIME`, `CI`, `GITHUB_*`, `PLAYWRIGHT_BASE_URL`, `PUPPETEER_EXECUTABLE_PATH` | platform / tooling | conventions. Keep. |
| `CRON_SECRET` | `api-gate.ts:127`, `retention.yml:38` | set on Vercel and as a repo secret (OPERATIONS §2); audit-1 said the repo secret was still owed -- `retention.yml` references it, so the workflow is wired; whether the secret exists is the owner's dashboard. |
| everything else (`DATABASE_URL`, `DIRECT_URL`, `R2_*`, `RAZORPAY_*`, `RESEND_*`, `TURNSTILE_*`, `POSTHOG_*`, `ADMIN_EMAIL`, `DEV_LOGIN_SECRET`, `DEMO_MODE`, `NODE_ENV`) | live | required or documented. |

### D. public/ files nothing references

Tracked: `lab/crop/phone-9x16.webp`, `lab/crop/pano-21x9.webp`, `lab/crop/grainy-420.webp`,
`images/collection/c3-thumb.webp` (dead-code-06). Untracked: `images/landing-original.jpeg`,
two `.DS_Store`. Alive-but-looks-dead: `images/brand/rishi-valley-mountain-mark-dark.svg`
and `-white.svg` (master vectors, audit-1 owner call: keep); every `demo-*-thumb.webp`
(derived by `seed.ts:320`); `landing/*.webp` (showcase-only, follow its fate).

### E. globals.css tokens nothing uses

`--primary-foreground` (+ `--color-primary-foreground`), `--accent-foreground`
(+ `--color-accent-foreground`), the `.hoopoe .wing` / `.wing-l` / `.wing-r` / `.eye` /
`.covered` rule block; `--radius-3xl` used by one lab specimen only (dead-code-04). Nothing
else: every other token, utility, layer class and keyframe has a consumer.

### F. Routes with zero inbound links, and their cost

Every non-lab route in `route-js.txt` has an inbound `href`/`Link`/`redirect` except:
- `/notice/[id]` -- 0 static links BY DESIGN (data-linked from pre-2026-07-24 notification
  rows; header dated "RETIRE AFTER 2027-08-01", which is audit-1's carry-over done). Cost:
  one route at the (main) floor (1,055 KB first-load, i.e. no unique JS). Not a finding
  until 2027-08.
- `/hoopoe` -- 0 in-app links; public in `proxy.ts:292`, `robots.ts:34`, `sitemap.ts:30`;
  "a link handed to people" (proxy.ts:218). Owner-sanctioned delight (audit-1 §5). Cost:
  754 KB first-load, its own chunk. Keep.
- `/guide` (the index) -- 1 inbound link, and it is the back link from its own child
  (`guide/[area]/page.tsx:44`). Members reach guide chapters through `GuideDoor` on page
  titles (`page-header.tsx:126`), which opens a sheet (`guide-open.ts:53`) with
  `/guide/${area}` as the fallback href. The index page is reachable only by typing the URL
  or from an area page. Cost: one route at the floor (1,064 KB). Owner question, not a
  delete: it may be intended as the help hub. See Owner decisions.
- `/donate` -- no route any more (audit-1 §18: a proxy redirect to /support, `9714b09`).
- The suspects the charter named (`/dark-mode` 1 link from the profile theme tile, `/birds` 5,
  `/pick-bird` 5, `/about` 2 incl. the sidebar, `/welcome` 5) are all linked.

### G. API routes callable by nothing

None. Of the 14: `/api/resend/webhook` (0 in-repo callers) and `/api/razorpay/webhook` are
called by Resend and Razorpay (OPERATIONS §6, `support/actions.ts:11`); `/api/auth/[...nextauth]`
is NextAuth's handler, hit by `next-auth/react`'s `signIn`; `/api/catchups/tick` and
`/api/demo/reset` are `vercel.json` crons; `/api/retention/sweep` is `retention.yml`; the
other eight have `fetch` callers in `src` (`/api/upload*` 59+17+14 references,
`/api/users/search` 16, `/api/places/search` 8, `/api/users-by-batch` 6,
`/api/account/export` from the profile's export link, `/api/dev-login` from every probe and
`e2e/auth.setup.ts`).

### H. Prisma models/columns nothing selects (for data-layer; not judged here)

No model with zero call sites: the lowest are `ContentView` (1), `MetricSnapshot` (1),
`PollOption` (1 + demo seed), `RosterEntry` (2). Audit 1's drops (`VerificationToken`,
`GroupInvite`, `Account`, `Session`, `User.openTo`, `Post.tag`) are gone from the schema.
One column-level note: `User.phone` (schema:53-54, "the first one is mirrored into legacy
`phone`") still has readers (`admin-analytics.ts:741,768` counts it; `validators.ts:102,163`
accept it), so it is a mirror, not dead -- whether the mirror is still needed is the
data-layer lens's question.

### I. Test pins whose subject no longer exists

None found. Method: a node sweep over all 102 `*.test.mjs` collecting every `indexOf("...")`
needle and every file the test reads, then checking each needle against those files; the
fifteen needles the sweep could not resolve automatically were resolved by hand (they read
their targets through a variable) and every one exists. 17 sites guard with
`assert.notEqual(start, -1, ...)`; 14 use the kit's `balancedBody`/`fnBody` (which carry the
anti-vacuity guards lib-tests-08 asked for); the unguarded slices I read
(`normalize.test.mjs:69-79`, `auth-flow-rule.test.mjs:112`, `catchups-core.test.mjs:857`,
`unattended-rule.test.mjs:188`, `mail-queue-rule.test.mjs:44`) are each followed by a
positive `assert.match` that would fail loudly on a missed needle, except the one noted in
dead-code-05 (`dailyBudget`, whose FIRST assertion is an absence check). The 86 absence
assertions in the suite all sit behind needles that resolve today.

### J. A second switched-off subsystem?

Yes, one, and it is not a flag: the feed's sort and time-filter controls (dead-code-02),
switched off by a prop no caller leaves at its default. The pattern greps (`false &&`,
`if (false`, `ENABLED = false`, `const X = false;`, `return null; //`) find nothing in
non-lab `src`; the only module-scope boolean is `SETTLE_PILE = true` in
`ambient-leaves.tsx:95`, a flourish that is ON, inside the showcase. In `/lab`,
`_kit.tsx:86` `export const staggerChild = {}` is a documented no-op "kept for API
compatibility" (lab lens). The scroll cue (dead-code-07) is the showcase's own rider.

---

## Owner decisions

**1. The feed's sort and time filters (dead-code-02).** The feed can sort by "Most liked"
and "Most discussed" and narrow to "Today / This week / This month / This year" -- the code
for all of it is finished, tested by three past audits, and wired from the button to the
database. But the row of controls that would let a member use it is hidden on the only page
that shows the feed, because when search moved into the header pill the whole row went with
it. So today nobody can sort or filter the feed at all. Two honest options: bring the
controls back somewhere (the header line has no room, so this is a small design job), or
remove the feature and the ~150 lines behind it. My recommendation: **remove it for
launch**. A community feed of this size reads best newest-first, the "Most liked" ordering
needs offset paging that the rest of the feed deliberately moved away from, and if members
ask for it later the code is one `git revert` away.

**2. The landing showcase (audit-1 decision 1, still open).** Current state, no re-arguing:
it was decoupled on 2026-08-26 (`a808af8`) into `showcase.tsx`, the landing route imports
none of it, and 0 bytes reach the public landing's client bundle. What is riding the call:
the 5 files knip lists (828 lines, 36 KB of source: showcase 255, footer-hoopoe 317,
feature-section 104, landing-footer 81, trust-section 71), the six files only they and the
lab's landing variants reach (landing-nav 74, perching-birds 664, section-reveal 60, shots 56,
showcase-shot 119, ambient-leaves 676 -- 1,649 lines), the hero's scroll cue (~20 lines,
dead-code-07), and five `public/images/landing/*.webp` (283 KB, tracked and publicly
served). Total: ~2,500 lines and 283 KB, all dormant. The two things `showcase.tsx`'s own
header says must be settled before it ships are unchanged: the trust card's five invented
names, and the fact that the public landing links to **no Privacy / Terms / Guidelines**
(those links live in `landing-footer.tsx:67`, which is off; a signed-out visitor finds them
only on the signup form, `signup-form.tsx:683`, or by URL). Recommendation, same as audit 1:
decide ship-vs-retire before launch, and give the three policy links a home in the hero now
regardless -- security audit H12 called them the front door.

**3. The `/guide` index page.** The guide opens as a side sheet from any page title
(`GuideDoor`), and each chapter has its own URL (`/guide/<area>`) that the sheet links to.
The index page at `/guide`, which lists the chapters, is linked from nowhere except the
"back" link on a chapter page. It costs one route and 52 lines
(`src/app/(main)/guide/page.tsx`; the chapter page beside it is 53 and stays). Either it is the help
hub and deserves a link (sidebar or account menu), or it is a leftover from before the sheet
existed and can go, with the chapter's back link pointing at `/feed` or the sheet.
Recommendation: **link it from the account menu** (a "Guide" row costs one line and gives
the chapters a home for the member who closes the sheet and wants to browse).

**4. Upstash, if it is not configured in production.** `rate-limit.ts` fails OPEN with a
console warning when the two Upstash keys are absent; the demo omits them on purpose. I
cannot see the Vercel dashboard. If production has them, nothing to do. If it does not,
every rate limit in the app is a no-op today and the two `@upstash/*` dependencies are a
never-set flag -- and that is a security fact before it is a bloat fact. A one-line check:
the Vercel project's environment variables page, or `/admin` logs showing the
"[rate-limit] Upstash env missing" line on boot. Recommendation: **confirm it is set**, and
add an Upstash entry to `docs/OPERATIONS.md` either way.

**5. The `/lab/crop` room** is self-declared throwaway ("delete it, public/lab/crop/ and
this row once the rules are settled"). Its eleven shape images are 1.58 MB of tracked
bytes, the largest single asset group in `public/`. Whether the rules are settled is the
lab lens's and yours; the three orphaned files beside them (dead-code-06) go regardless.

## Not-findings

(verified intentional; do not re-litigate)

- **`@prisma/client` in package.json** -- imported by the generated client under
  `src/generated/prisma` (`client.ts:18`); knip cannot see past its own `ignore`. Runtime
  dependency (dead-code-10).
- **`prisma` (the CLI) in dependencies** -- `postinstall: prisma generate` and
  `prisma.config.ts`. Placement (deps vs devDeps) is the dependency lens's.
- **`src/lib/photo-suggest.ts`** -- imported by `scripts/dev/tag-photos-apply.mjs:39` and
  its own 19-test file; the hand-run-pass protocol keeps the rules in `src/lib` beside the
  tests (`docs/spec/hand-run-passes.md`). Only `--production` flags it. Alive.
- **The madge orphans** `forbidden.tsx`, `instrumentation.ts`, `proxy.ts`,
  `generated/prisma/browser.ts` -- Next.js and Prisma conventions.
- **`dailyBudget` and `SEND_TIMEOUT_MS` exports** -- read by `mail-queue-rule.test.mjs`
  (B-071, C-108); the pins are worth their exports (dead-code-05 explains the one safe
  de-export).
- **`SESSION_GAP_MIN`, `DEMO_CLOSED_PATHS`** -- audit-1 honesty checks, unchanged.
- **`/notice/[id]`** -- data-linked shim, dated to retire after 2027-08-01 in its header
  (`4219a1d`). **`/hoopoe`** -- owner-sanctioned, public by design.
- **`/api/resend/webhook`, `/api/razorpay/webhook`, `/api/auth/[...nextauth]`** -- called
  from outside the repo by design.
- **All 44 env keys** -- each read; the questionable ones carry in-code defaults (section C).
- **`commented-out-code.txt`'s 29 candidates** -- all prose (comment continuations whose
  first word happens to be `return`, `variable`, `<Button>`, `import`...). Zero commented-out
  code in `src` or `scripts`, for the second audit running.
- **`console-log.txt`'s 4 hits** -- all four are comments describing an incident ("marked a
  real member's mail sent off a console.log"). No stray `console.log` in `src`.
- **`todos.txt`'s 5 hits** -- one cluster, the song-attachment column migration,
  explicitly deliberate (audit-1 not-finding, unchanged).
- **Every `--color-*` binding, every LiftKit step, all three `--z-*`, `--state-press`,
  `.glass`, `.valley-tree`, `.deeplink-flash`, `.bell-trigger`, `html.has-scrubber`** in
  globals.css -- consumers counted (dead-code-04 lists the only dead items).
- **`SETTLE_PILE = true`** (ambient-leaves.tsx:95) -- a flourish that is on, inside the
  showcase; not a switched-off subsystem.
- **The `Select` kit's unused sub-parts, `DropdownMenu*`, `Sheet*`, `Card*`** -- audit-1
  dead-code-12 class decision (keep), unchanged; not re-counted.
- **`scripts/qa/*.test.mjs` absent from `scripts/README.md`** (five files) -- exempt by
  design (`scripts-ledger.test.mjs:48-51`: "a `*.test.mjs` is a gate, not a tool").
- **Every non-test `src` file added since audit 1** has at least one importer (counted:
  the lowest are single-importer leaf components, which is what a leaf is).
- **`BirdAvatar ring`, `LoveButton showCount/label/size/onDark`, `ConfirmDialog
  confirmWord/destructive`, `PhotoCarousel sizes/onPreload`, `ImageViewer
  showCount/onToggleLove/onEdit/initialIndex`, `FeedColumn initialSearch/lastSeenAt`** --
  every optional prop of the shared primitives has at least one caller that passes it
  (counted). The two exceptions ARE findings 02 and 07.

## Audit-1 carry-overs in this territory

- **Owner decision 1 (showcase)**: still open; decoupled 2026-08-26; state and byte weight
  in Owner decisions 2 above; the H12 policy links still have no public home.
- **Owner decision 16 (legacy Collection taxonomy SELECT)**: not in my files; the taxonomy
  lib gained a legacy map on 2026-08-28 (`collection.ts` per hand-run-passes.md:115), which
  suggests the data-layer lens should re-check whether the SELECT ever ran.
- **Owner decision 17 (Collection filter row vs sentence line)**: **moot** -- the 2026-08-28
  river rewrite replaced the old chrome; its two leftover files are dead-code-01.
- **Owner decision 18 (/donate)**: done as a proxy redirect (`9714b09`); no route remains.
- **dead-code-07 (untracked public junk)**: partly done -- the WhatsApp originals and
  `public/uploads` leftovers are gone; `landing-original.jpeg` (6 MB) and two `.DS_Store`
  remain (dead-code-06 here).
- **dead-code-13 (four dead CSS items)**: done, all four gone.
- **dead-code-14 (schema drops)**: done -- `VerificationToken`, `GroupInvite`, `Account`,
  `Session`, `openTo`, `tag` are out of the schema.
- **dead-code-18 (knip config)**: done (`scripts/qa/knip.jsonc`); two hints and one
  false-positive dependency remain (dead-code-10).
- **Audit-1 triage rows re-refuted with new evidence**: `MAX_IMAGES`/`MAX_IMAGE_URL`
  ("K-used") are a pure re-export line; `TAP_MIN_PX` ("K-used, scripts/qa/map-cluster-verify.mjs")
  is a hand-copied constant there, not an import; `dailyBudget` ("admin mail actions import
  it") is named in a comment there, not imported; `AdminSectionDef` ("D, with ADMIN_SECTIONS")
  survived because it is used in-file at admin-nav.ts:44 -- de-export, not delete.
- **Refuted rows** (`withMember/withAdmin`, tsconfig exclude, conditional Sentry, dynamic
  DemoBar, paged-list hook, audit-log skeleton, cuid2): none touches this lens; not
  re-proposed.

## For other lenses

- **duplication**: `preloadViewer = () => void import("@/components/common/image-viewer")`
  is defined verbatim in `photo-river.tsx:27`, `post-card.tsx:80`,
  `catchups/round/answer-photos.tsx:40`, `catchups/round/photo-wall.tsx:33` (4 copies of one
  line; image-viewer.tsx could export it). `THUMB_PX = 480` in `collection-photo.ts:26` and
  `scripts/demo/add-photos.mjs:36` (with the same `.resize(..., { fit: "inside" })` call).
  `TAP_MIN_PX = 44` in `map-cluster.ts:66` and `scripts/qa/map-cluster-verify.mjs:40`. The
  "Clear all" text-button class string in `sentence-line.tsx:122`, `filter-sheet.tsx:59` (and
  `active-filter-chips.tsx:50`, which dead-code-01 removes).
- **dependency**: `prisma` sits in `dependencies` for `postinstall`; `@prisma/client` is
  needed (dead-code-10); `@upstash/ratelimit` + `@upstash/redis` are live only if production
  sets the keys (Owner decision 4).
- **data-layer**: `User.phone` legacy mirror (schema:53-54) still read by
  `admin-analytics.ts:741` and accepted by `validators.ts:102,163`; audit-1 owner decision 16's
  SELECT status.
- **docs**: `docs/OPERATIONS.md` §8 says knip's file list "is now 5" (it is 7 until
  dead-code-01); no Upstash section in OPERATIONS.md; no `.env.example` anywhere (44 keys,
  learned only by reading code and demo.md §2).
- **scripts**: `scripts/dev/merge-cities.ts:22` `CANONICAL_PLACE_ID` is a dead const whose
  header promises a lookup that does not exist (dead-code-09).
- **lab**: the 48 + 9 lab symbols (section B); `lab/type/_fonts.ts` nine unused `next/font`
  loaders (build cost); `/lab/crop` self-declared throwaway with 1.58 MB of shapes;
  `_kit.tsx:86` `staggerChild = {}` no-op; `lab/v2/page.tsx:787-789` carries its own copy of
  the login-hoopoe wing CSS that dead-code-04 deletes from globals.css (the room does not
  depend on the global copy); `--radius-3xl` has one lab consumer (`lab/craft/page.tsx:500`).
- **bundle**: button.tsx's three dead cva strings ride all 52 routes (dead-code-08); the
  `Select` kit reaches the feed route only through the unreachable controls block
  (dead-code-02); `--primary-foreground`/`--accent-foreground` declarations sit in the
  233 KB stylesheet (dead-code-04).
- **feed-posts territory**: dead-code-02 is theirs to execute if the owner says cut; the
  `search &&` banner at post-feed.tsx:261-279 must survive.
- **security / write-path**: none of the dead code found this time is an exported server
  action (audit 1's `updateUserProfile`/`createCatchup` pattern did not recur -- checked:
  every `"use server"` export knip would flag is in the lab or is test-pinned).

## Metrics

- Lines read in full: ~4,900 (brief 390, OPERATIONS 350, demo.md 314, audit-1 dead-code
  report 926, audit-1 report §4-5 ~200, globals.css 726, page.tsx 39, the two dead files 80,
  facet-select 149, directory-facets 20, showcase header 70, plus ~1,600 across the ranged
  reads listed under Coverage).
- Tool lines triaged: knip repo-config 7 files + 70 exports + 11 types + 1 dep + 2 hints =
  91/91; knip production extras 1 file + 1 dep + 66 exports + 1 type = 69/69 (all
  convention/test); madge 8/8; tsc-unused 4/4; env keys 44/44; commented-out 29/29;
  console-log 4/4; todos 5/5.
- Routes swept: 52 non-lab; unlinked: 0 real (1 dated shim, 1 public-by-design, 1 owner
  question). API routes: 14/14 have a caller or an external caller by design.
- globals.css: 726 lines; ~80 tokens/classes/keyframes counted; dead: 1 rule block (10
  lines) + 2 token pairs (6 lines) + 1 lab-only radius.
- public/: 58 tracked files, every basename and stem grepped; 4 tracked orphans (421 KB),
  3 untracked (6 MB).
- Prisma: 41 models call-site-counted; 0 with zero readers.
- Tests: 102 files swept for `indexOf` needles; 0 vacuous pins found; 17 guarded sites,
  14 kit slices, 86 absence assertions all behind resolving needles.
- Biggest single items: the unreachable feed controls ~150 lines (owner); the two dead
  filter files 80 lines; SortPill 40 lines; the crop orphans 333 KB.
- Honest total: ~280 lines of code (of which ~150 need the owner), ~17 lines CSS, ~421 KB
  tracked + ~6 MB untracked, 20 exports narrowed, 0 dependencies, 1 audit-1 owner decision
  closed as moot.
