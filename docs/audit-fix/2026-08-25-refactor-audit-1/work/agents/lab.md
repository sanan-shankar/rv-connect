# lab - simplification audit report

Territory reader for `/lab`: the 43-room design-history tree at `src/app/lab/**` (102 files,
32,196 code lines + 6,580 comment lines per cloc), its registry, its Prisma model
(`LabRoomState`), and its gate (`scripts/qa/lab-audit.mjs`). The charter was explicitly NOT
"which rooms to delete" - the rooms are owner-approved history - but: leakage into shipped
code, measured production-build cost, archived-room inventory, duplication of shipped
primitives, the lab-only lib and model, and the registry itself. Date: 2026-08-25.
Files in territory: 102; read fully: 14; header/structure-sampled: every `page.tsx` (42) plus
the biggest file of each room family (see Coverage).

## Coverage

- **Read fully**: `_registry.ts` (388), `layout.tsx` (19), `page.tsx` (52), `actions.ts` (68),
  `_archive-state.ts` (60), `_lab-client.tsx` (325), `[dir]/page.tsx` + `[dir]/auth/page.tsx`
  (26), `houses/demo/page.tsx` (27), `scripts/qa/lab-audit.mjs` (153), the `LabRoomState`
  model in `prisma/schema.prisma:977-981`.
- **Read in large part** (structure + every region a tool pointed at): `_kit.tsx`,
  `_second-look-kit.tsx` (shell, Controls, ROOMS, useToggles, type scale), `_shared.tsx`
  (DIRECTIONS, PreviewStyles), `_birds.tsx`, `directory/_maps.tsx`, `directory/_room.tsx`,
  `profiles/page.tsx`, `profiles/_chain-stepped.tsx`, `everything/_findings.ts`,
  `components/profile/letterhead-profile.tsx` (props block, for the dedupe question),
  `components/support/wood.tsx` (header), `src/proxy.ts` lab regions,
  `src/app/(main)/support/page.tsx` wood region.
- **Sampled (first ~22 lines, i.e. the header comment and imports, of every one)**: all 42
  `page.tsx` files. This repo front-loads the reason a file exists into its header comment,
  so this pass classifies every room reliably: what it mocks, what it imports, whether it
  touches live code.
- **Not read line-by-line**: the interior JSX of the variant files (`profiles/_variant-*`,
  `landings/_variant-*`, `support-ideas/_variant-*`, `tiles/_specimens.tsx`,
  `feed-canvas/page.tsx`, `feedback/page.tsx`, `v2/page.tsx` bodies, ~20k lines). The charter
  said classify, not line-audit; jscpd/knip/comment-density leads for those files were each
  chased into the file and resolved. Nothing in the skipped JSX can change the structural
  findings below, because none of it is imported by anything outside its own room (verified
  by grep, see lab-01 evidence).
- **Uncommitted edits seen**: none in my territory. At read time `git status --short` showed
  only this audit's own untracked files (`docs/audit-fix/2026-08-25-refactor-audit-1/report.md`,
  `docs/audit-fix/2026-08-25-refactor-audit-1/work/`). The WIP files named in my charter
  (`next.config.ts`, `src/lib/admin.ts`, etc.) had been committed by the other session before
  I started (HEAD `c74d99f`); every file I judged was HEAD's version.

## Summary

This territory is in better shape than its size suggests. The two fears the charter named -
lab code leaking into shipped bundles, and lab rooms holding drifting copies of shipped
primitives - mostly do not hold: **zero shipped files import lab code** (the only non-lab
"app/lab" hits are a comment in `src/proxy.ts` and the generated Prisma client's inline
schema string), lab-only client chunks are never loaded by member-facing routes, and jscpd
shows the shipped composer/landing/directory were rebuilt rather than copied (largest
lab-to-shipped clone: 39 lines). The lab has no TODOs, no commented-out code, and its heavy
comment ratios are the owner's argued-for "why" comments, verified by sampling. What the lab
DOES cost is the production build: 42 of 92 routes, ~35% of the repo's TypeScript, 3.6MB of
the 11MB server app bundle, 47 client chunks (1,665KB) built and deployed on every push that
only an admin can ever download, and an estimated 10-15s of the 45.6s build - all duplicated
again on the demo deployment, where `/lab` is proxy-blocked for everyone and the routes are
pure waste. That build question (lab-01) is the one big item, and it is an owner call. The
autonomous wins are small and clean: ~110 lines of verified-dead kit exports (lab-02) and
four stale self-descriptions that would mislead a future session (lab-03). Structural vs
cheap: one T4 architecture item, one T1 dead-code item, one T1 hygiene item; this territory
is deliberately not a lines-of-code hunting ground and I have not padded it into one.

## Findings

### lab-01 - Decide where the 42 lab routes ship: quantified cost, four options
- **Where**: `src/app/lab/**` (all 102 files); `next.config.ts` (no `pageExtensions` set
  today); `scripts/qa/lab-audit.mjs:45` (hardcodes the name `page.tsx`); `src/proxy.ts:32`
  (demo blocks `/lab` outright); `src/app/lab/layout.tsx:15-18` (admin gate).
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: measured against the orchestrator's build artifacts, nothing re-run:
  - **Routes**: 42 of 92 in the build route table (`raw/build.txt:84-125`), all dynamic (`ƒ`),
    so the cost is compile/bundle, not prerender.
  - **Source**: 32,196 code lines of the repo's 92,414 TypeScript lines (35%); 69% of
    `src/app`'s code lines (`raw/cloc-lab.txt`).
  - **Server bundle**: `du .next/server/app/lab` = **3.6MB of 11MB** (33% of the server app
    output).
  - **Client chunks**: from `raw/route-bundle-stats.json` + on-disk chunk sizes: lab routes
    reference 75 chunks, of which **47 chunks (1,665KB uncompressed) are referenced by no
    non-lab route**. The 28 remaining are shared shipped chunks that exist regardless.
    **Member-facing cost is therefore 0 KB** - no shipped route's first-load includes a
    lab-only chunk, and the 430KB every-page baseline (`raw/route-js.txt` head) contains no
    lab code.
  - **Build time**: build baseline 45.6s wall (compile 16.9s, TypeScript 19.4s,
    `raw/build.txt`). Lab is 35% of TS lines (≈6-7s of the typecheck) and 42/92 route graphs
    of mostly self-contained client code (≈5-8s of compile). Estimate, clearly an estimate:
    **~10-15s of the 45.6s build** is lab.
  - **Analyzer noise**: `.next/diagnostics/analyze/data/lab` = **18MB of 48MB**, which makes
    every future bundle investigation heavier to read.
  - **Reachability**: `/lab` requires a session (`src/proxy.ts:197-200`, audit M19) AND the
    admin role (`src/app/lab/layout.tsx`, non-admin gets `notFound()`). On the demo
    deployment `/lab` is in `DEMO_CLOSED_PATHS` (`src/proxy.ts:32`), so the demo compiles and
    deploys all 42 routes that **no visitor can ever reach**.
  - **The owner's stake**: the whole LabRoomState mechanism exists because he curates `/lab`
    *on the deployed domain* (`actions.ts` header: "the owner's actual ask, the deployed
    domain"; `_archive-state.ts` header). Any option that removes `/lab` from the production
    domain undoes a decision he made on 2026-07-30.
- **What to do**: present these four options to the owner; do not execute any without him.
  1. **Status quo** (my recommendation for the main site): the cost is ~10-15s of build, ~5MB
     of deploy artifact, and zero member-facing bytes. That is a fair price for a design
     archive he actively uses on the domain.
  2. **Exclude lab from the DEMO build only** (my recommendation to actually do): rename the
     lab tree's special files `page.tsx` -> `page.lab.tsx` (42 files; also `layout.tsx` ->
     `layout.lab.tsx`, `loading.tsx` -> `loading.lab.tsx`) and set in `next.config.ts`:
     `pageExtensions: IS_DEMO ? ["tsx","ts"] : ["lab.tsx","lab.ts","tsx","ts"]` (the flag is
     already server-side: `DEMO_MODE === "1"`, `src/lib/demo.ts:21`). The demo build then
     contains no lab route at all - nothing lost, because the demo proxy already blocks
     `/lab` for everyone - and the main production site is untouched. Same change must teach
     `scripts/qa/lab-audit.mjs:45` the new filename (it matches `entry === "page.tsx"`;
     without the edit every registry href becomes a "dead link" and `npm run check` fails).
     Non-page modules (`_registry.ts`, `_kit.tsx`, variants) need no rename: with no page
     importing them they never enter the demo graph.
  3. **Exclude from the main production build too** (same mechanism keyed on a new env var):
     saves the 10-15s and ~5MB on every deploy, but `/lab` 404s on the owner's domain and
     the LabRoomState archiving UI becomes local-only. Against his recorded ask; only if he
     has changed his mind.
  4. **Move rooms out of `src/app`** into a dev-only harness: rejected. It breaks
     URL-per-room (screenshot deep links like `?v=letterhead-3&chain=stave` are load-bearing
     for the QA tooling), requires a catch-all dynamic-import shim, and rewrites
     `lab-audit.mjs` wholesale for the same saving as option 3.
- **Saving**: option 2: ~10-15s build + ~5MB artifact **on the demo deployment only**, 0
  source lines; option 3: the same on every deploy. Member-facing JS: 0 either way (already 0).
- **Risk & gate**: medium (build-config change). Proof: `npm run check` (lab-audit gate must
  stay green), a local `next build` with and without `DEMO_MODE=1` comparing the route table,
  `npm run verify:crawl` against the non-demo build, and the demo smoke checks in
  `demo.test.mjs` stay green. The fixer must verify Next 16/Turbopack honours multi-dot
  `pageExtensions` before renaming anything - if it does not, this whole option dies, which
  is the one thing that would change my recommendation.
- **Confidence**: high on every number (all measured); medium on the build-seconds estimate
  (reasoned from line/route share, not profiled) and on the `pageExtensions` mechanics in
  this exact Next version.
- **Notes**: I looked hard for a cheaper lever and there is none: the routes are already
  dynamic, already admin-gated, already outside the visual suite, and contribute nothing to
  shared chunks. The only remaining costs are compile-time and artifact-size, and only a
  build-level exclusion touches those. Fear: a future room adds a static export or gets
  linked from shipped chrome; the leakage grep in this report is the check to re-run. Related:
  owner decision 1 (deleting superseded archived rooms) would shave ~1,700 of the 32,196
  lines by a different, complementary route.

### lab-02 - Delete seven verified-dead exports from the two lab kits (~110 lines)
- **Where**: `src/app/lab/_second-look-kit.tsx:20-47` (the `T` scale + its 15-line comment,
  `PROSE`, `CODE`), `:49-112` (`Room` type + `ROOMS` array), `:607-613` (`useToggles`);
  `src/app/lab/_kit.tsx:122-133` (`AmbientLayer`), `:244-252` (`RouteLink`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags all seven (`raw/knip.txt:148-155`); I confirmed each by grep, both
  across all of `src/app/lab` and inside the defining file:
  - `T`, `PROSE`, `CODE`, `ROOMS`, `useToggles`: the import lists of all nine
    `_second-look-kit` consumers are
    `LabShell, Rule, Tell, Ledger, Mount, Bench, Verdict, Pick, Switches, Controls` in
    varying subsets - never these five. No internal use either. The one page that wanted
    `CODE` re-declared it locally (`src/app/lab/type/page.tsx:18-19`, byte-identical class
    string), which is the drift proving the export is dead.
  - `ROOMS` is a second, older room index (six entries with `looked`/`tell` copy) that
    `_registry.ts` superseded; nothing renders it. Its `everything` entry still says "76
    findings" where the data file now holds 68 - dead AND stale.
  - `AmbientLayer` and `RouteLink` in `_kit.tsx`: definitions only; no JSX usage in any of
    the 13 `_kit` consumers or in `_kit.tsx` itself (`BASE_CSS` and `Seg`, flagged nearby,
    ARE used - `BASE_CSS` at `_kit.tsx:211`, `Seg` by `transitions/page.tsx` - do not touch
    those).
- **What to do**: delete the seven declarations and their attached comments. In
  `type/page.tsx` leave the local `CODE` as is (it is the only consumer and now the only
  copy). Separately, drop the `export` keyword from `PreviewStyles`
  (`src/app/lab/_shared.tsx:124`) - used three times inside its own file, never outside
  (knip line 156); keyword-only change, no line saved.
- **Saving**: ~110 lines (77 in `_second-look-kit.tsx`, ~27 in `_kit.tsx`, plus blank lines).
- **Risk & gate**: low. `npm run check` (TypeScript + ESLint would catch a missed consumer);
  open `/lab/craft` and `/lab/transitions` once, since they are the heaviest users of the two
  kits.
- **Confidence**: high. The one thing that would change my mind: a room added between this
  audit and the fix that imports one of the seven - re-run the grep first.
- **Notes**: this is exactly LLM-bloat signature 5 (a registry with no caller) plus the
  natural residue of the 2026-07-30 `/preview` -> `/lab` migration: `ROOMS` was the
  second-look group's own index before `_registry.ts` became the one index; nobody deleted
  it because it stopped being rendered rather than being removed.

### lab-03 - Correct the four stale claims lab makes about itself
- **Where**: `src/app/lab/actions.ts:24-28`; `src/app/lab/spine-marker/page.tsx:6-7`;
  `src/app/lab/_registry.ts:198` (support-ideas note); `src/app/lab/_registry.ts:205`
  (everything note).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**, one per site:
  1. `actions.ts:24`: "`/lab` is public in production (src/proxy.ts publicPaths), so this
     write must be gated on the session role". False since audit M19: `src/proxy.ts:197`
     says, in capitals, "/lab is NO LONGER public". The gate itself is still correct and
     still needed (a server action does not run the layout's admin check), but the comment
     teaches a future session the wrong security posture - the kind of wrongness that
     survives into a decision.
  2. `spine-marker/page.tsx:6-7`: "Not linked from anywhere (including _kit.tsx's ROOMS
     registry) on purpose." Doubly stale: the room IS linked - it has a registry row
     (`_registry.ts:243-248`, "Visit directly") - and `ROOMS` lives in `_second-look-kit.tsx`,
     not `_kit.tsx` (and is dead, lab-02).
  3. `_registry.ts:198`: "one boolean in wood-mount.tsx puts it back on /support" -
     `wood-mount.tsx` was deleted by the very commit that wrote this note (`2937fc4`, which
     removed `src/components/support/wood-mount.tsx`, 54 lines). The real revival recipe is
     the header of `src/components/support/wood.tsx` (mount `<SupportWood />` from
     `app-shell.tsx`); the note should point there.
  4. `_registry.ts:205`: "76 findings" - `everything/_findings.ts` holds 68 (`grep -c 'id: "'`
     = 68; its own header explains the eight Groups findings were dropped 2026-08-04).
- **What to do**: four comment/string edits; no behaviour changes. (1) rewrite to "the /lab
  layout's admin gate does not run for a server action invocation, so this action carries its
  own" and drop the publicPaths claim; (2) delete the sentence or replace with "registered in
  _registry.ts; visit directly"; (3) point at `wood.tsx`'s header recipe; (4) "68 findings".
- **Saving**: 0 lines; correctness of the record. In this repo, where comments are the
  institutional memory the owner pays for, a wrong comment is a real defect.
- **Risk & gate**: low; `npm run check`. None of these files is pinned by a rule test (I
  checked: `security-regressions.test.mjs` does not quote them).
- **Confidence**: high on all four; each verified against the current file and the commit
  that made it stale.
- **Notes**: a fifth instance sits outside my territory:
  `src/app/(main)/support/page.tsx:61` also names the deleted `wood-mount.tsx` - listed under
  "For other lenses". I considered adding `_archive-state.ts`'s "pre-migration" framing here
  (the LabRoomState migration ran 2026-07-30, so "the table does not exist yet" is no longer
  the expected state on the shared database) but the guard also covers a fresh database
  (e.g. a second Supabase project) and is scoped, cheap and documented - keep it, see
  Not-findings.

## Owner decisions

1. **Two archived rooms the registry itself calls superseded.** Of the eight archived rooms
   (12 routes, ~6,444 lines: transitions 640, composer 1,153, viewer 147, craft 814, spine
   482, type 1,516, logos 121, groups-rethink 1,571), two are described by the registry as
   having no remaining purpose: **groups-rethink** ("The Groups feature was removed from the
   app entirely, so this whole tree is superseded", 1,571 lines, 5 routes) and **logos**
   ("Valley + hills won and is now PeaksMark, documented live at /lab/logo", 121 lines).
   Deleting the two would remove ~1,700 lines and 6 routes; git history keeps them
   recoverable forever. Against that: the registry's own header says retiring a room means
   flipping status to "archived", *not* deleting the file, "so history stays visible instead
   of silently vanishing again" - a rule you set after rooms went stranded. My
   recommendation: keep them archived (the designed retirement path), and only revisit if
   you take option 3 of lab-01, where every retained line has a per-deploy cost. Whatever
   you choose, it should be your word, not an audit's.

2. **Where the lab ships** (lab-01, in plain terms). Today every visitor-facing build -
   yours AND the public demo's - spends roughly a quarter to a third of its build work
   compiling the 42 lab rooms, and ships about 5MB of them to the server, even though only
   you (as admin) can ever open them, and on the demo literally nobody can. Members never
   download any of it, so this costs them nothing; it costs build minutes and deploy size.
   Recommendation: keep `/lab` on your domain exactly as it is, and exclude it from the
   demo's build only (option 2), which loses nothing anyone can see.

3. **The Letterhead III lab copy will keep drifting from the real profile.** The profiles
   room's biggest file (`_variant-letterhead-3.tsx`, 1,333 lines) was the prototype of the
   shipped profile sheet (`letterhead-profile.tsx`, transplanted in commit `22b4b6c`), which
   has since grown to 1,981 lines. The registry note calls the lab version "the current
   one", which is already ~650 lines of evolution behind. Re-pointing the room at the real
   shipped component would end the drift but break the room's six-way house-chain switcher
   (`?chain=`), which hangs off the lab copy, and would erase the frozen record of the
   2026-08-02 pick. Recommendation: leave the code as a frozen exhibit, and soften the
   registry note from "the current one" to "the direction that shipped (the live profile has
   since evolved)" so nobody treats the room as the source of truth. One sentence, no code.

## Not-findings

- **The comment-heavy `_chain-*` files (ratios 1.0-1.56, top of `raw/comment-density.txt`)
  are not bloat.** Sampled `_chain-stepped.tsx:1-45`: the comments are measured design
  arguments with the owner's verbatim quotes and the numbers behind each choice ("seven rows
  (217.5px of chain) and five (152.5px)"). This is the "every constant argued for in a
  comment" standard doing exactly its job.
- **`LabRoomState` + `actions.ts` + `_archive-state.ts` earn their keep.** The model is 5
  lines, the write path is role-gated and self-cleaning (an override equal to the registry
  default is deleted, not stored), and it exists because file-based archive state was a
  hard no-op on Vercel's read-only filesystem (`_archive-state.ts:4-11`). The
  "pre-migration" `isMissingLabTable` guard stays too: scoped to P2021/42P01/our table name,
  and it is what keeps `/lab` rendering against any fresh database.
- **No shipped file imports lab code.** `grep -rn "app/lab"` and `"@/app/lab"` over `src`
  minus `src/app/lab`: only `src/proxy.ts:200` (a comment) and `src/generated/prisma`'s
  inline schema string. Relative-path and `import(...)` variants: zero. The charter's
  leakage question closes clean.
- **The picked rooms did not leave verbatim copies behind (except letterhead).** jscpd's
  lab-to-shipped clone list tops out at 39 lines (`_variant-letterhead-2.tsx` vs
  `letterhead-profile.tsx`); composer vs `create-post-form.tsx` is 9 lines, landings vs
  `components/landing` is 9 lines, directory room vs `components/directory` shares only the
  d3 boilerplate. The shipped versions were rebuilt, not transplanted-and-abandoned.
- **`components/support/wood.tsx` (246 lines, only consumer is a lab room) is not dead.**
  Deliberately parked by commit `2937fc4` ("park the aviary in the lab ... costs the app
  bundles nothing"), with the revival recipe in its header. Do not relocate it either: the
  header's mount instructions are written relative to `app-shell.tsx` and the owner wants it
  revivable without re-tuning.
- **Three `?v=` harness pages (profiles 152, landings 110, support-ideas 202 lines) repeat
  one tab-switcher pattern; leave them.** Cross-room coupling is exactly what the rooms'
  header comments promise not to have ("building a concept never requires touching this
  file"), and the three differ in real ways (prop threading, extra query params).
- **The lab is absent from `e2e/visual.spec.ts` and carries zero entries in
  `todos.txt`, `commented-out-code.txt`, and the type-sludge scan** (though note the scan
  excludes lab by construction - see Metrics).
- **Two loading rooms (`loading`, `loading-ideas`) and two chain rooms (`profiles?chain=`,
  `chain-lines`) are not accidental duplicates**: each pair is two rounds of a decision the
  registry narrates (chain-lines: "Kept as the record ... the owner reversed it on
  2026-08-21").

## For other lenses

- `src/app/(main)/support/page.tsx:61` - comment names `wood-mount.tsx`, deleted in
  `2937fc4`; same fix as lab-03 item 3. (feed/support territory)
- `package.json` - knip: `d3-scale` + `supercluster` + `@types/d3-scale` +
  `@types/supercluster` unused (`raw/knip.txt:126-131`); `d3-selection` and `geojson` are
  used by BOTH `lab/directory/_maps.tsx` and shipped `components/directory/alumni-map.tsx`
  but unlisted (transitive). Dependency lens should pin or prune; nothing here is lab-only.
- `world-atlas/countries-110m.json` static import in shipped `alumni-map.tsx` - part of why
  `/directory` is the heaviest route (1,212KB, `raw/route-js.txt`); bundle lens.
- `raw/type-sludge.txt` header reads "excl lab" - the orchestrator should know the lab was
  never scanned for `any`/suppressions (I saw one `eslint-disable` + `as any` pair in
  `lab/directory/_maps.tsx:46-47`, harmless world-atlas typing).
- `scripts/qa/lab-audit.mjs` hardcodes `page.tsx` at line 45 - any fixer doing lab-01
  option 2 must update it in the same commit; scripts lens should not "simplify" that name
  matching away in the meantime.

## Metrics

- Territory: 102 TypeScript files, 41,269 raw lines; cloc: 32,196 code / 6,580 comment /
  2,493 blank. 81 of the app's 258 `"use client"` files are lab.
- Routes: 42 in the production build (`/lab` + 41 rooms/children; `[dir]` and `[dir]/auth`
  each serve 3 keys). 8 registry entries archived (12 routes incl. children), 26 active.
- Build cost (measured): server `.next/server/app/lab` 3.6MB / 11MB; lab-only client chunks
  47 / 1,665KB uncompressed; analyzer data 18MB / 48MB; heaviest lab route `/lab/profiles`
  1,174KB route-KB (3rd heaviest in the app, behind `/directory` and `/profile/[id]`).
- Biggest files: `profiles/_variant-letterhead-3.tsx` 1,333; `tiles/_specimens.tsx` 1,161;
  `composer/_variants.tsx` 987; `feedback/page.tsx` 960; `directory/_chrome.tsx` 907;
  `directory/_maps.tsx` 903; `feed-canvas/page.tsx` 897. Room families: profiles 10,297
  lines; directory ~3,317; landings 3,904; support-ideas ~2,349; archived rooms 6,444.
- Comment-heaviest: the seven `profiles/_chain-*` files, ratio 0.86-1.56 - verified
  intentional (Not-findings).
- Dead code found: ~110 lines (lab-02). Stale self-descriptions: 4 (lab-03).
- Lines personally read: ~3,500 in full + ~1,000 of sampled headers + every tool lead chased.
