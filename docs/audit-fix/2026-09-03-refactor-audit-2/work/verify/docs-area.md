# docs-area — adversarial verification notes (refactor audit 2)

Verifier: docs-area. Date: 2026-09-04. Read-only throughout: no builds, no tsc, no knip, no
browser, no database, no npm. Everything below was re-read at today's HEAD.

**HEAD has moved since the audit baseline.** The reports were written against `72b5a1d`; HEAD is
now `74cc61a` (`fix(retention): notifications are kept 30 days, everywhere`), with `72b5a1d`
(`fix(viewer): ...`) in between. Nothing in this cluster's territory was touched by either, but
`a13a8a9` is now HEAD~2, not HEAD~1 as `scripts-e2e-ci-19` says. Working tree at read time:
`M docs/audit-fix/README.md`, `M progress.md`, `?? docs/audit-fix/2026-09-03-refactor-audit-2/`
(the audit's own files). No source file in this cluster has uncommitted edits.

Cluster: 11 findings, all documentation claims. **Headline: every one of the eleven is true in
substance. Not one is refuted.** What breaks under pressure is line numbers: six of the eleven
cite ranges that are off by 2 to 100 lines, and one (`scripts-e2e-ci-19`) points at the wrong
section entirely. A fix session that opens the cited line and edits what it finds there will
edit the wrong paragraph in at least two cases. Corrections are spelled out per finding.

---

## data-layer-05 — schema/TRAPS undercount the SQL-only database objects

**Verdict: confirmed-with-correction.**

Substance, all re-checked:

- `docs/TRAPS.md:41-43` (the finding says 33-35): *"**Two expression indexes exist that Prisma
  cannot see** — `lower(email)` on User and `lower(city)`/`lower(asciiName)` on Place/UserPlace."*
  That sentence names three objects while saying "two", and misses `Place_name_idx`
  (`lower("name")`) entirely.
- All eleven objects the finding lists exist in `prisma/migrations-manual/`, each as an
  idempotent `CREATE INDEX IF NOT EXISTS`:
  `User_email_lower_key` (2026-08-21-email-canonical.sql), `Place_asciiName_idx`,
  `Place_name_idx`, `UserPlace_city_idx` (2026-07-18-round6.sql), `Place_altNames_trgm_idx`
  (2026-08-21-gazetteer-trigram.sql), `Photo_caption_trgm_idx`, `Photo_area_trgm_idx`,
  `Photo_freeTags_trgm_idx`, `User_name_trgm_idx` (2026-08-28-collection-river.sql),
  `Report_open_post_per_reporter_key` (2026-08-25-report-one-open-per-post.sql),
  `User_lastSeenAt_idx` (2026-08-19-analytics.sql). That is **eleven**, not "ten".
- `model User` (schema.prisma:10-264) carries exactly **one** `@@index` — the GIN on
  `professionTags` at **line 188** — and no mention of `lastSeenAt` or `email_lower` anywhere.
- The three reads the finding says justify `@@index([lastSeenAt])` are real:
  `src/lib/admin-analytics.ts:94-95` (two `user.count` range predicates) and `:650`
  (`WHERE u."lastSeenAt" IS NOT NULL` in loadFaces). Also `:708-709` and `:1083` use it.

Corrections the fixer needs:

| Finding cites | Actual at HEAD |
|---|---|
| `docs/TRAPS.md:33-35` | 41-43 |
| `prisma/schema.prisma:158` (User's GIN) | 188 |
| Place note `:774-781` | 879-883 |
| UserPlace note `:812-813` | 919 |
| Report note `:660-667` | ~710-718 (inside `model Report`, which starts at 689) |
| "ten places" | eleven objects listed |

Caveat: I cannot confirm the objects exist **on the live database** (read-only, no DB). The
migration files are idempotent and dated, which is strong but not the same thing. The finding's
own step 1 ("no DDL: the index already exists — verify with SELECT E") is the right shape; the
fix session must run that SELECT before believing `@@index([lastSeenAt])` is a no-op.

---

## dependency-diet-04 / scripts-e2e-ci-19 / lib-core-config-08 — the overrides trio

These three findings are the same drift seen by three lenses. **They agree on every fact.**
`lib-core-config-08` is the safest to execute: it is the only one that read `package-lock.json`,
and its removal step is gated on regenerating the lock and diffing it rather than on reasoning.

Facts verified at HEAD:

- `package.json:25-31` holds **five** overrides: `browserslist ^4.28.8`, `deepmerge-ts ^8.0.2`,
  `mysql2 ^3.24.3`, `postcss-selector-parser ^7.1.5`, `fast-uri ^3.1.7`.
- `docs/OPERATIONS.md:224-229` still opens *"**One `overrides` entry lives in `package.json`, and
  it is not permanent.**"* and documents `deepmerge-ts` alone, closing with *"an override that
  outlives its reason is a pin nobody remembers making."*
- `5dbb402` (2026-09-02) added browserslist + mysql2 + postcss-selector-parser; `a13a8a9`
  (2026-09-02) added fast-uri. Both diffs read directly.
- I reconstructed `lib-core-config-08`'s table from `package-lock.json` with a node one-liner.
  **It is exactly right**, every cell:

  | override | lock version | who asks | range |
  |---|---|---|---|
  | deepmerge-ts | 8.0.2 | `@prisma/config` | exact `7.1.5` |
  | mysql2 | 3.24.3 | `prisma` | exact `3.15.3` |
  | browserslist | 4.28.8 | `@babel/helper-compilation-targets` `^4.24.0`, `shadcn` `^4.26.2`, `webpack` `^4.28.1`, `update-browserslist-db` peer `>=4.21.0` | all caret-in-major-4 |
  | postcss-selector-parser | 7.1.5 | `shadcn` `^7.1.0` | caret |
  | fast-uri | 3.1.7 | four nested `ajv` copies (`@modelcontextprotocol/sdk`, `@prisma/streams-local`, `ajv-formats`, `schema-utils`) | all `^3.0.1` |

- `dependency-diet-04`'s side claim that nothing pins the override count is true:
  `grep -rIln overrides scripts src` finds only unrelated uses (`_probe-kit.mjs:13` is prose in a
  comment). No rule test reads `package.json`'s overrides block.

Corrections:

- `dependency-diet-04` cites `docs/OPERATIONS.md:222-227`; the paragraph is **224-229**.
- `scripts-e2e-ci-19` cites `docs/OPERATIONS.md:238-247` — **wrong section**. 238-247 is §5
  (Bundle analyzer). The overrides paragraph is 224-229. A fixer following that citation edits
  the analyzer prose.
- `scripts-e2e-ci-19` calls `a13a8a9` "HEAD~1"; it is HEAD~2 now.
- `lib-core-config-08`'s "up to 3 overrides" is a *candidate* count, not a saving: caret ranges
  resolve at install time and I could not run npm either. Its own confidence line already says
  so. The lock diff is the arbiter; keep that step.

**Extra fact none of the three noticed, and the fixer should:** `scripts/qa/npm-audit-gate.mjs:23-32`
still allowlists `GHSA-ggr8-5vv4-36mx` (deepmerge-ts) with `clearsWhen: "prisma ships a 7.x release
that bumps deepmerge-ts to >=8"`. The `deepmerge-ts` **override** already forces 8.0.2, so that
allowlist entry is very likely inert — the same "pin nobody remembers making" one step further in.
It is the gate's only entry. Worth checking in the same commit; do not delete it without a green
`npm run check` (the gate is `both-directions` tested).

---

## dependency-diet-10 — optimizePackageImports / phosphor

**Verdict: confirmed-with-correction** (line numbers only; the measurement holds).

- `next.config.ts:230`: `optimizePackageImports: ["@phosphor-icons/react", "motion"]`. Confirmed.
- The hedge is at `next.config.ts:331-332` (*"optimizePackageImports above is a bet about
  @phosphor-icons/react tree-shaking that nothing has ever confirmed"*) — the finding's `:330-332`
  is one line early, harmless.
- `docs/OPERATIONS.md` repeats the doubt at **238-239**, not 236-237.
- Import census re-run with a python regex over every `@phosphor-icons/react` import: **21 files,
  17 outside `/lab`**, 23 named bindings of which one is `type Icon` → **22 icon bindings**;
  `MagnifyingGlassIcon`/`XIcon` alias `MagnifyingGlass`/`X` → **20 distinct glyphs**. The
  finding's numbers are exact.
- Re-ran the negative grep over the production build, recursively across all **224** `.js` files
  under `.scratch/audit2-build/.next/static/chunks/` (the finding only grepped top level):
  Acorn / Airplane / Bandaids / Cactus / Confetti / Dogsuit / Eyeglasses → **0 files each**.
  Positive control: MusicNotes 2, ShareFat 10, Feather 26. No unused icon reaches a chunk.
- `lucide-react` is in Next's own default list at
  `node_modules/next/dist/server/config.js:**1125**` (finding says 1124).
- All 11 `@base-ui/react` import sites use subpaths (`/button`, `/combobox`, `/dialog` ×2,
  `/input`, `/menu`, `/popover` ×2, `/select` ×2, `/separator`). Confirmed.
- Attribution caveat is the finding's own: nothing here separates `optimizePackageImports` from
  Turbopack tree-shaking without a counterfactual build. Its recommended wording ("confirmed empty
  of unused icons in the 2026-09-03 build") is the honest one and should be kept verbatim.

**Conflict to resolve before either lands:** `lib-core-config-12` deletes `next.config.ts:322-332`
outright — the very block `dependency-diet-10` wants to rewrite. If 12 ships first, 10's code edit
evaporates and only the `OPERATIONS.md:238-239` sentence remains to fix. Sequence them, or fold
both into one edit: delete the essay, and let OPERATIONS §5 carry the (now measured) answer.

---

## lib-core-config-12 — delete the `npm run analyze` essay from next.config.ts

**Verdict: confirmed.**

- `next.config.ts:322-332` is exactly the eleven-line free-floating comment described, sitting
  between the closing `};` of the config object (line 320) and the Sentry comment at 334.
- Every one of its three arguments is already in `docs/OPERATIONS.md` §5 (232-240): "Runs Next's
  own analyzer", the *"parked code should not ride in bundles it is not used by"* principle, the
  webpack-only wrapper with the same *"no report will be generated"* quote and the same
  2026-08-26 date, and the `optimizePackageImports` doubt. This is a true duplicate, not a
  summary.
- Ratio arithmetic checks out: `raw/comment-density.txt:8` reads `1.81  239 cmt  132 code
  next.config.ts`; 228/132 = 1.727 ≈ 1.73.
- The named collision risk is real and clear of the edit: `scripts/qa/audit-status.mjs` probe H7
  reads `next.config.ts` at ~221-226 looking for `headers(` and five header names — 190 lines
  away from this block.

---

## lib-core-config-17 — four stale numbers

**Verdict: confirmed-with-correction.**

- `git ls-files | grep -c '\.test\.mjs$'` → **102**. Verified myself.
- `docs/OPERATIONS.md:328` — *"the unit gate discovers its 74 test files by glob"*. False.
- `docs/SECURITY.md:**128**` — *"all 25+ unit test files"*. The finding says `:121`; line 121 is
  unrelated prose about the demo. Correct the citation.
- `CLAUDE.md:133` — *"the unit-test suite (75 files as of 2026-08-25)"*. False. (The finding
  mentions this but does not list CLAUDE.md in its **Where**; it should, since CLAUDE.md is read
  by every session.)
- `docs/OPERATIONS.md:337` — *"The list is now **5**, and all five are the landing showcase"* vs
  `raw/knip-repo-config.txt` line 1 *"Unused files (7)"*, the two extras being
  `src/components/common/filters/active-filter-chips.tsx` and `result-count.tsx`. Confirmed.
- The finding's parenthetical about where the real number lives is right:
  `scripts/qa/check.mjs:69` sets `MIN_TEST_FILES = 60`, a deliberate floor ("well below the real
  count, so it never nags on an ordinary day", audit C-195), plus a per-file rename check at :72.
  So no gate pins the doc numbers, and the doc edit is safe.

---

## directory-profile-25 — the two specs' superseded banners

**Verdict: confirmed-with-correction.** The banners are stale, but not uniformly, and one
sub-claim is weaker than written.

Verified true:

- `docs/spec/directory.md:14-19` still says the `City` / `HouseYear` / `ProfileTag` deltas
  *"remain a live, unimplemented plan, not a stale fact"*. `grep '^model' prisma/schema.prisma`
  has **no** `City`, `HouseYear`, `ProfileTag`, `UserLink`, `UserMemory` or `UserHouse`. What
  exists instead: `model Place` (865), `model UserPlace` (892), `User.houses` (schema:21, JSON
  string), `User.professionTags` (:45, `String[]`), `User.links` (:58, JSON string). So the plan
  did not stay unimplemented — it shipped in a different shape, which is exactly the finding's
  claim.
- `directory.md:186-190` (§3.4 Profession) is already correctly superseded, as the finding says.
- `MEMORY_PROMPTS` and *"Memory prompts are coming to your settings"* appear **nowhere** in `src`
  (grep). No `memories` field in the schema. `docs/spec/profile.md:290-292` describes that
  placeholder as present-tense fact. That sentence is the clearly-false one.

The correction:

- `profile.md:285` opens *"**Still the target 2026-07-02 (owner decision): build toward this
  richer model.**"* The `UserHouse` / `UserLink` / `UserMemory` **tables** are still unbuilt — the
  data shipped as JSON columns on `User` instead, which is a different design, not the specced
  one. So "Still to build ... the tables" is not simply false; it is an owner-held target that a
  cheaper shape currently satisfies. The fix session must not silently convert an open owner
  decision into "shipped". Rewrite as: houses and links ship today as JSON columns on `User`
  (`houses`, `links`); the relational tables remain the owner's stated target; the memory-prompt
  placeholder no longer exists at all.
- The sub-claim about `profile.md:29-31` is weak. It names
  `src/app/lab/profiles/_houses-trail.tsx` as the chain's *reference implementation* — that file
  **still exists**, and calling a lab room a reference implementation is this repo's normal
  convention (CLAUDE.md: "/lab is the approved look"). Nothing is broken there. Adding a pointer
  to the shipped `src/components/profile/houses-chain.tsx` is an improvement, not a correction.

---

## landing-mascot-avatars-10 — docs/spec/mascot.md

**Verdict: confirmed.** Every one of the four faults re-verified; this is the best-evidenced
finding in the cluster and its line numbers are right.

1. **The sign-in fly-in is built.** `docs/spec/mascot.md:205-207` still lists it under *"Open
   follow-ups"* as *"an app-level orchestration to build when wiring the real sign-in
   transition"*. On disk: `src/components/mascot/mascot-flight.ts` (**138** lines),
   `mascot-flight-layer.tsx` (**595**), `use-flight-arrival.ts` (**350**) — the exact counts the
   finding gives — plus `perch-report.test.mjs` in the same folder.
   `src/components/landing/landing-hero.tsx:20` imports from `mascot-flight`, `:213` declares
   `function startExit(e, target: FlightTarget)`, and `:386` / `:401` fire it from the signup and
   login CTAs. Built, from both CTAs, as claimed.
2. **`## Files` names five files; the folder holds 22.** `find src/components/mascot -type f | wc
   -l` → **22**. The `## Files` block is lines 14-18 (heading at 13). Unmentioned:
   `mascot-flight.ts`, `mascot-flight-layer.tsx`, `use-flight-arrival.ts`, `sidebar-hoopoe.tsx`,
   `hoopoe-warmup.tsx`, `perch-report.test.mjs`, and all twelve of `moments/`.
3. **Four moments and their engine are undocumented.** `grep -n
   "contributed\|no-results\|no-saved\|messages-empty\|MomentStage\|moment-hoopoe"
   docs/spec/mascot.md` → **exit 1, no output**. `MomentStage` is exported from
   `moments/moment-hoopoe.tsx:88` and consumed by `no-results-hoopoe.tsx:23`,
   `no-saved-hoopoe.tsx:33`, `contributed-hoopoe.tsx:34`, `messages-empty-hoopoe.tsx:24`. Every
   mount-site line number the finding gives is **exact**: `posts/post-feed.tsx:366`,
   `directory/directory-client.tsx:662`, `profile/saved-posts-feed.tsx:188`,
   `messages/(index)/page.tsx:130`, `collection/contribute-room.tsx:1038`.
4. **The last follow-up names two files that moved or died.**
   `src/components/auth/hoopoe.tsx` does not exist. `src/app/lab/_hoopoe.tsx` does, and is still
   imported by `src/app/lab/feed-canvas/page.tsx:28` (`import { HoopoeMascot } from
   "../_hoopoe"`), so that half of the follow-up is answered "no, it stays".
   Line 18's `src/app/preview/delight/hoopoe/page.tsx` path with *"Now at
   `src/app/lab/hoopoe/page.tsx`"* bolted on is exactly as described.

Keep the "Proportions" follow-up, as the finding says — nothing on disk closes it.

---

## member-surfaces-08 — docs/spec/guide.md vs the shipped guide

**Verdict: confirmed** (and the finding **understates** it by one line).

- `find src/app -name "@modal" -o -name "(..)*"` → **nothing**. No intercepting route exists.
- `820762a` (2026-08-27, *"perf(guide): take the route out of the press, and the address with
  it"*) is the commit. `src/lib/guide-open.ts:1-27` is the header the finding quotes, and it
  records both measured failures verbatim ("404-444ms of nothing after the press"; "Next's router
  watches history ... the chapter closed itself on open"). `GuideLayer` is mounted at
  `src/app/(main)/layout.tsx:153`.
- The stale spec text is at: **`:46`** ("Next 16 does this with intercepting routes"),
  **`:75-80`** ("**The interception.** `@modal/(..)guide/[area]` ... budget a round of fighting
  it"), **`:232`** ("The interception, so a press from inside the app opens the chapter over the
  page"), and **`:187`** (the §6 table's Letters row, "That a letter goes to one person and is
  private"). No superseded banner sits above any of them.
- The internal contradiction is real: `guide.md:244-246` says the letters assumption "is the
  opposite of true", while `:187` still states it; `src/components/guide/chapters/letters.tsx:27`
  reads *"Every member. Letters are not addressed to one person"*.
- **The extra line the finding missed**, and the worst one, because it is dressed as evidence:
  `guide.md:236-238`, under *"Verified in a browser rather than claimed"*, asserts *"a press opens
  the overlay with the address bar at `/guide/birds`"*. `guide-open.ts` deliberately does not
  touch the address ("the chapter is plain UI state and does not touch the address"). A false
  claim inside a "verified in a browser" list is the most misleading sentence in the file; fold it
  into the same rewrite.

---

## Cross-cutting notes for the report writer

1. **Three findings, one edit.** `dependency-diet-04`, `scripts-e2e-ci-19` and
   `lib-core-config-08` all rewrite the same OPERATIONS §4 paragraph (224-229). Merge them;
   execute `lib-core-config-08`'s version (it has the lockfile table and a gated removal step),
   fold in `scripts-e2e-ci-19`'s good idea that an override should carry a `clearsWhen` the way
   `npm-audit-gate.mjs`'s allowlist does, and drop `dependency-diet-04` and `scripts-e2e-ci-19` as
   separate items. Use **224-229**, not either finding's citation.
2. **Two findings collide on `next.config.ts:322-332`** (`lib-core-config-12` deletes it,
   `dependency-diet-10` rewrites its last two lines). Deleting wins; the measurement then lands in
   `OPERATIONS.md` §5 only.
3. **Nothing in this cluster is gated by a test.** No rule test reads OPERATIONS.md, SECURITY.md,
   mascot.md, guide.md, directory.md, profile.md or the overrides block; I checked. The only
   items with a real gate are `lib-core-config-08`'s package.json half (`npm run check`, both
   security gates, `ci-parity.test.mjs`) and `data-layer-05`'s `@@index` (`npx prisma generate`
   plus a live `pg_indexes` SELECT first).
4. **CLAUDE.md is a fifth stale doc** and is named only in passing (`lib-core-config-17`'s
   evidence, `scripts-e2e-ci-11`'s Where). Two false numbers in it today: line 133 ("75 files as
   of 2026-08-25", really 102) and lines 237-238/245 ("11 routes", "Takes 50s", "Feed, directory,
   letters and catchups ... A red run on those four is real", really 12 routes and six live). It
   is the one file every session reads first; give it its own line in the plan.
5. **Per the one-commit-per-change rule**, none of these should become a standalone `docs:`
   commit. Several findings say so themselves. But eleven doc corrections across seven files with
   no code to ride along is a genuine tension with that rule — the orchestrator should decide
   whether "the docs correction pass" is itself one coherent revertable change. My read: it is,
   and one `docs:` commit for the whole cluster is defensible in a way that eleven scattered ones
   are not.

## scripts-e2e-ci-11 — the visual suite's counts (full notes)

**Verdict: confirmed-with-correction.**

- `e2e/visual.spec.ts` `ROUTES` holds **12** entries: landing, login, feed, directory, letters,
  catchups, collection, collection-class, support, birds, about, privacy. Not 11.
- **Six** carry `live:`, not four: feed (`live: "band"`), directory (`live: "map"`), letters,
  catchups, **collection** (`:44`, with a 2026-08-29 comment block at `:35-43` explaining the
  archive going from four photographs to twelve mid-session), **collection-class** (`:63`, with a
  2026-09-02 block at `:46-62`: the owner's album import added 1,719 photographs to the admin's
  class and both viewports went red).
- `docs/OPERATIONS.md:52-54` therefore states the exact opposite of the code: *"`/collection` is
  deliberately not in that list: photos arrive rarely enough that its picture still means
  something, and it is the one that catches image-sizing regressions."* It is in the list, twice,
  and the grid it was added to watch is masked. This is the sharpest item in the finding and the
  fixer should lead with it.
- `docs/OPERATIONS.md:38` — *"**Four routes photograph a live database**"*. False.
- `CLAUDE.md:245` repeats the same four-route claim; `CLAUDE.md:237-238` says "11 routes" and
  "Takes 50s" while `OPERATIONS.md:15` says "~80 seconds" for the same command. The two docs
  disagree with each other as well as with the suite. I cannot time the run (no Playwright), so
  the duration is **unverifiable** either way; only the route and mask counts are settled here.

Citation corrections: the finding's `docs/OPERATIONS.md:16-18` is really **14-15**; its `:31-36`
(the masked list) is **32-36**; `:38-56` is right; the `/collection` sentence is **52-54**.
