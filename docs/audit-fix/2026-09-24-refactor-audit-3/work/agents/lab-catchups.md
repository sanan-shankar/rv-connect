# lab-catchups - refactor audit 3 report

Charter T15, at classification depth: classify, measure and trace the Catch-ups half of `/lab`
(`src/app/lab/catchups/**`: 8 registered rooms, 59 tracked files, 32,715 lines, of which 18,632 are
JSON fixtures), plus `src/app/lab/actions.ts`, `src/app/lab/_archive-state.ts` and the `LabRoomState`
table. For each room: what it is, when it was made, which shipped surface its verdict became, whether
the shipped copy diverged (history) or is the same code (a clone, and which way the import should go),
whether shipped code imports it, what its fixtures weigh, what knip says, and what the lab costs.
Archive candidates go to the owner as questions with "keep" as the default. Audit-only; nothing in
the tree was changed. Date: 2026-09-24, HEAD `70570bcd`.
Files in territory: 61 (59 under `src/app/lab/catchups/` + 2 lab files) plus the table and two
planning docs; read fully: 17; read at classification depth: the other 44 (see Coverage).

## Coverage

- **Read fully**: `sketches/page.lab.tsx`, `sketches/_harness.tsx`, `sketches/_cover.tsx`,
  `sketches/_media.ts`, `settings/page.lab.tsx`, `settings/_room.tsx`, `wall/page.lab.tsx`,
  `voice/page.lab.tsx`, `vote/page.lab.tsx`, `capsule/page.lab.tsx`, `magazine/page.lab.tsx`,
  `magazine/_live.ts`, `swipe/page.lab.tsx`, `_fixtures/magazine/corpus.ts`, `src/app/lab/actions.ts`,
  `src/app/lab/_archive-state.ts`; plus, outside the territory as comparators: `src/lib/magazine/
  magazine.test.mjs` (all 296 lines), `src/components/common/flush-avatar.tsx`, `src/app/lab/
  page.lab.tsx`, `src/app/lab/layout.tsx`, `src/lib/prisma-errors.ts` (the helper) and its test.
  Planning: `docs/spec/lab-voice.md`, `docs/planning/catchups-rework/review-2026-09-06.md` (all 51
  paragraphs), `handover.md` lines 1-205 (start, sessions, the status board) and 3949-4035 (closing
  report, what to paste next), plus targeted greps.
- **Read at classification depth** (the file's docblock header, its full declaration outline, every
  import, and the ranges each finding below names): `_settings.tsx` (1-57, 121-180, 690-866,
  1140-1173), `sketches/_reader.tsx`, `_navigator.tsx`, `_parts.tsx` (1-140), `_home.tsx`, `_list.tsx`
  (1-60, 86-292), `_rail.tsx`, `_shelf.ts` (1-40, 110-140, 345-404), `_shell.tsx` (1-60), `_types.ts`,
  `_data.ts` (1-240), `_pressure.ts`, `_fixtures/pressure.ts` (1-60 + outline), `wall/_room.tsx`,
  `wall/_shapes.tsx` (1-110, 245-262), `wall/_corpus.ts` (196-275), `voice/_room.tsx`,
  `voice/_recorder.tsx` (1-300 by eye), `voice/_players.tsx`, `voice/_clip.ts`, `vote/_ask.tsx`,
  `vote/_ballot.tsx`, `vote/_cases.ts`, `vote/_results.tsx`, `vote/_room.tsx`, `capsule/_room.tsx`
  (1-160), `capsule/_sealed.tsx`, `capsule/_mark.tsx`, `capsule/_cases.ts`, `magazine/_room.tsx`,
  `magazine/_measure.ts` (1-30), `magazine/_pages.tsx` (1-60, 600-611), `swipe/_trace.tsx` (1-60).
- **JSON fixtures**: all twelve parsed and measured programmatically (members, answers, bodies,
  distinct bodies, photographs, distinct photographs, irreducible text); by eye only `wall-300.json`
  lines 1-80 and 1020-1110.
- **Not read**: the bodies of the room components past the ranges above (render code of history rooms;
  classification depth, per the charter); `handover.md` lines 206-3948 except by grep (the session log
  and ledger; the board at the top is the charter's named source). Nothing in the territory was left
  unclassified.
- **Uncommitted edits seen**: none in the territory or in any shipped file cited here
  (`git status --short` clean for all of them; the only untracked paths are the two 2026-09-24 audit
  folders).
- **One rule slip, reported rather than hidden**: one comparison command redirected ~34 lines of
  `_settings.tsx` into `/tmp/.pd-lab.txt` and deleted it in the same command (brief section 2.7 says
  write nowhere but this report). Verified gone (`ls` reports no such file). Nothing else was written.
- The charter lists `src/app/lab/catchups/page.lab.tsx`; it does not exist. There is no Catch-ups index
  room: each subfolder is its own registered room (8 rows, `_registry.ts:208-263`).

## Summary

The Catch-ups lab is eight rooms made between 2026-09-05 and 2026-09-14 by the Catch-ups rework, and
nothing in it has changed since 09-14. Three rooms did their job and what they drew is live
(sketches: the list, home and reader; settings; the wall's run); every shipped copy diverged from its
room (3 to 28 % of each room file is still verbatim), so those rooms are history, not clones. Three
rooms (voice, vote, capsule) are active and waiting on the owner's pick since 09-14, with their
plumbing already live in production. The magazine room is the M1 design, waiting on him to read a
printed PDF. The swipe room is an instrument for an open viewer bug. No shipped app file imports lab
code, members download none of this JavaScript (29 lab-only chunks, 1,205 KB, re-proved) and none of
its CSS.

The one big lever is the fixtures: the twelve magazine fixtures are 18,632 lines of hand-expanded JSON
(716 KB, 65 % of the territory's code lines, 43 % of the whole repo's JSON lines) carrying about 83 KB
of actual text, in the same shape `_fixtures/pressure.ts` already builds in 407 lines of TypeScript.
Rebuilding them as typed builders is roughly -16,000 lines and -580 KB, proved by deep equality. Two
measured surprises: the magazine room's production trace lists 156 files / 22.9 MB from the gitignored
member-data export (because the room imports the module that reads it), and two rooms ship a 429 KB
Node crypto polyfill to the browser because a client file imports `catchups-core.ts`, which is also a
live warning for audit 2's open row `catchups-02`. Structural vs cheap: 12 structural findings, 3
cheap. The rest of the well is small (dead exports, copies of three shipped primitives, a stale
dev-mode bypass, a pre-migration guard, a redundant link resolver, repeated room chrome). The biggest
remaining weight (about 7,700 lines in the three finished rooms, and 22,600 lines of magazine) is the
owner's call, put to him below with "keep" as the default.

## Findings

### lab-catchups-01 - Rebuild the twelve magazine fixtures as typed TypeScript builders and delete the JSON
- **Where**: `src/app/lab/catchups/_fixtures/magazine/*.json` (twelve files: `wall-300` 5,631 lines,
  `no-photos` 3,637, `photo-heavy` 2,248, `voice-votes` 1,908, `forty-notes` 1,418, `songs` 1,145,
  `hostile` 896, `all-portraits` 639, `capsule` 467, `one-writer` 400, `one-essay` 160,
  `nobody-wrote` 83); the loader `_fixtures/magazine/corpus.ts:38-48` (`inventedCorpus`,
  `readdirSync(HERE).filter((f) => f.endsWith(".json"))`); consumers `src/lib/magazine/
  magazine.test.mjs:3,29-38,138-265` (`wholeCorpus`, `byKey("wall-300")` etc.) and
  `src/app/lab/catchups/magazine/page.lab.tsx:35-47` (`fixtureSources`, run on every request at `:58`).
- **Phase**: rewrite
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Size: 733,268 tracked bytes (`raw/tracked-bytes.txt`), 18,632 code lines (cloc), which is 65 % of
    this territory's code lines and 43 % of the repo's 43,491 JSON lines. Minified the same data is
    372 KB, so half of the bytes are indentation; most of the rest is scaffolding.
  - Irreducible content, measured per file (names, question text, choices, distinct answer bodies):
    ~83 KB in total across 520 answers and 353 photographs. `wall-300`: 100 members, 109 answers,
    300 photographs but only **11 distinct images and 10 distinct bodies**. `forty-notes`: 41 answers,
    7 distinct bodies. `voice-votes`: 58 answers, 12 distinct bodies. The prose-heavy four (`no-photos`
    22.8 KB, `one-essay` 15.3 KB, `hostile` 14.9 KB, `photo-heavy` 12.6 KB) are where the real text is.
  - 1,560 of the lines are `"songUrl"`, `"songTitle"`, `"songArt"` keys (mostly `null`), for columns
    phase 11 of the rework is scheduled to drop (handover board row "Build phase 11, the cleanup").
  - Nothing type-checks the JSON: `isCatchupExportFile` (`src/lib/catchups-export.ts:197-206`) checks
    `version`, `takenAt`, `source` and `Array.isArray(catchups)` and nothing below that.
  - The repo's own idiom already does this: `_fixtures/pressure.ts` builds a 100-person Catch-up with
    a 40-answer question, a 24-photograph wall and over-cap answers in 407 lines of TS (`personOf`,
    `answer`, `question`, `words`, `img`), and `wall/_corpus.ts:210-230` builds a 200-photograph wall
    with a 20-line `wall(count, people)`.
  - The fixtures cost **zero build seconds** today (read with `fs`, never imported; not in tsc's
    program), so this is a repo-weight and lines finding, not a build-time one.
- **What to do**:
  1. Lift `pressure.ts`'s helpers into one builder module beside the fixtures (keep them boring; the
     pressure file is the model). Keep `pressure.ts` itself as is, importing the helpers.
  2. For each key write `<key>.ts` exporting a `CatchupExportFile`: patterns as loops (`wall-300`,
     `forty-notes`, `songs`, `voice-votes`), prose as string literals with every default (nulls, empty
     arrays, timestamps) supplied by the helper. Carry each file's `note` into the module docblock.
  3. Prove before deleting, per key, with a throwaway inline one-liner (not committed, per the
     CLAUDE.md scratch rule): `assert.deepStrictEqual(built, JSON.parse(readFileSync(oldJson)))`.
     Where reproducing a value exactly would take more lines than listing it, list it literally.
  4. `corpus.ts` imports the twelve modules explicitly instead of `readdirSync` (the keys must stay
     exactly the thirteen `magazine.test.mjs:35` asserts). Relative imports with `.ts` extensions,
     no `@/` alias (the node test cannot resolve it; `corpus.ts:21-22` says so).
  5. Delete the twelve JSON files. Do this in the same change as lab-catchups-02 and -03 (write the
     builders in their new home).
- **Saving**: ~16,000 lines (18,632 JSON -> an estimated 2,000-2,500 lines of TS, measured from the
  irreducible content plus one structural line per answer); ~580 KB tracked (733 KB -> ~150 KB); the
  magazine room stops reading and parsing ~720 KB of JSON on every request; phase 11's song-column drop
  becomes one line in a helper instead of 1,560 lines of JSON edits; the fixtures become type-checked.
  Build: 0 s today, and a few thousand lines of plain object literals afterwards (negligible).
- **Risk & gate**: medium-low. Gate: the per-key deep-equality proof, then `node --test
  src/lib/magazine/magazine.test.mjs` (178 checks over 16 Editions), then `npm run check`; open
  `/lab/catchups/magazine?data=wall-300` and `?data=hostile` and check page counts against
  `magazine.md`'s "The corpus, printed" (wall-300 about 12 pages, hostile 10).
- **Confidence**: high on the direction and the byte saving; medium on the exact TS line count (it
  depends on how regular the original generator was). A fixture full of one-off exceptions would move
  the estimate toward 3,500.
- **Notes**: Rejected alternatives, each for a reason. *Minify the JSON*: that is gaming (18,632 lines
  become 12 without anything getting simpler). *Generate on demand with `scripts/dev/export-catchups.
  mjs`*: that script exports real members' words, which must never be committed (campaign D33), and it
  cannot produce invented failure cases; the on-demand half already exists (`liveCorpus()` reads the
  local export when present). *Cut `wall-300` to 30 rows*: no; its failure family (A14, B19, D32, G32)
  is a 300-photograph wall paginating across about twelve pages, and `magazine.test.mjs:188-201`
  asserts "`<= 24` pages for a wall of 300"; generated, 300 costs nothing. `hostile.json` holds
  deliberate hostile strings (markup, zero-width bodies, homonyms, shouting, anonymity cases): copy them
  byte-exact; the equality proof is what makes that safe. My fear: a builder that gets clever. The
  pressure file shows the right amount of cleverness.

### lab-catchups-02 - Keep the member-data export reader out of the magazine room's module graph
- **Where**: `src/app/lab/catchups/_fixtures/magazine/corpus.ts:36`
  (`const EXPORTS = path.join(process.cwd(), "scripts", "dev", ".exports", "catchups")`), `:50-66`
  (`liveCorpus`, `wholeCorpus`); the room imports the same module at `magazine/page.lab.tsx:26`
  (`import { inventedCorpus } from "../_fixtures/magazine/corpus"`); evidence file
  `.next/server/app/lab/catchups/magazine/page.js.nft.json` (the orchestrator's 2026-09-24 build).
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the production trace for `/lab/catchups/magazine` lists 889 files; **156 of them
  (22.9 MB) are under `scripts/dev/.exports`**, the gitignored export of members' words and photograph
  bytes (D33). No other route's trace contains any (checked every `*.nft.json` under
  `.next/server/app`). Against the sketches route, which shares the database loader, the only
  additions are those 156 files and the 13 fixture files. The room never calls `liveCorpus()`; only the
  test does, through `wholeCorpus()`. `.gitignore:110` (`scripts/dev/.*/`) keeps the folder out of git
  (0 tracked files), so a Vercel build from git sees nothing: the hazard is a build made on this
  machine and shipped prebuilt (CLAUDE.md forbids that) or any tool that copies `.next` somewhere.
- **What to do**: move `liveCorpus`, `wholeCorpus` and the `EXPORTS` constant into
  `magazine.test.mjs` (or a test-only helper beside it); `corpus.ts` keeps only the invented corpus.
  Confirm with the next build (bundle lens): the magazine route's `.nft.json` has zero
  `scripts/dev/.exports` entries.
- **Saving**: 156 files / 22.9 MB out of the local production trace; ~0 lines (about 20 move).
- **Risk & gate**: low. Gate: `node --test src/lib/magazine/magazine.test.mjs` still runs the live
  Edition on a machine that has an export (its tests are labelled `live ...`); the build trace check.
- **Confidence**: high (measured from the trace file).
- **Notes**: This is also a privacy-adjacent note the orchestrator may pass to the bug-audit session;
  I did not open their folder. It is independent of -01 and can land first.

### lab-catchups-03 - Move the magazine corpus beside the engine whose test depends on it
- **Where**: `src/lib/magazine/magazine.test.mjs:3`
  (`import { wholeCorpus } from "../../app/lab/catchups/_fixtures/magazine/corpus.ts"`) and its
  docblock `:19`; `corpus.ts:35` (`HERE` hard-codes `src/app/lab/catchups/_fixtures/magazine`);
  `corpus.ts:24` imports `../pressure.ts`, which is also imported by `sketches/_pressure.ts:37` and
  `vote/_cases.ts:13`; `src/lib/magazine/types.ts:15` names the lab path.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: it is the only place in the repo where `src/lib` imports from `src/app/lab` (grep of
  every `.ts/.tsx/.mjs/.js` under `src`, `scripts`, `e2e`). The test is the fixtures' main consumer
  (178 checks over all of them); the room draws one at a time. So `npm run check` depends on a lab
  folder, and the magazine room can never be archived (owner decision 3) without breaking the gate.
- **What to do**: move `_fixtures/magazine/` (or its TS builders after -01) and `_fixtures/pressure.ts`
  to a folder beside the engine, e.g. `src/lib/magazine/corpus/`; the test imports it relatively; the
  magazine room, `sketches/_pressure.ts` and `vote/_cases.ts` import it from there (the normal
  lab -> lib direction). Update the three docblocks that name the old path (`types.ts:15`,
  `magazine.test.mjs:19`, `pressure.ts:11-14`).
- **Saving**: 0 lines; removes the only lib -> lab import, and makes the room's future a free choice.
- **Risk & gate**: low. `npm run check`; open the magazine and sketches rooms (`?data=pressure`).
- **Confidence**: high.
- **Notes**: if `src/lib` feels wrong for test data, `scripts/qa/fixtures/` would also fix the
  direction, but the room would then import from `scripts/`; beside the engine is cleaner.

### lab-catchups-04 - Take the 429 KB Node crypto polyfill out of two rooms (and defuse catchups-02)
- **Where**: `src/lib/catchups-core.ts:25` (`import { randomUUID } from "node:crypto";`, used once at
  `:96`, the invite token); client importers `src/app/lab/catchups/sketches/_home.tsx:74`
  (`CATCHUP_PROMPT_SETS`, used at `:389`), `capsule/_cases.ts:11` (`capsuleOpensAt`,
  `valleyDaysLeft`) and `capsule/_mark.tsx:15,27` (`capsuleOpensAt`, `WOULD_OPEN`); the chunk
  `.next/static/chunks/1h284jke63n28.js` (439,213 bytes).
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/route-bundle-stats.json`: `/lab/catchups/sketches` first-loads 1,380 KB and
  `/lab/catchups/capsule` 1,323 KB, against 640-863 KB for the other six Catch-ups rooms. The
  difference is that chunk, which is Next's compiled `crypto-browserify`, `buffer`,
  `stream-browserify`, `string_decoder`, `util` and `vm-browserify`, and exactly those two routes carry
  it. No shipped route does, because shipped code is careful: the home page imports
  `CATCHUP_PROMPT_SETS` on the server and threads it down
  (`src/app/(main)/catchups/[catchupId]/(home)/page.tsx:22,476`, `promptLibrary: CATCHUP_PROMPT_SETS`;
  `home/types.ts:137`), and `home/collecting.tsx:54` imports only a type. `node:crypto` is the only
  server-side import in `catchups-core.ts` (the rest: `./utils.ts`, which imports only `clsx` and
  `tailwind-merge`; `./prisma-errors.ts`, which imports nothing; and type-only imports), and the file
  has no dynamic `import()` left (grep: none; its header at `:16-21` says the old lazy imports moved
  out).
- **What to do**: Option B is better and belongs to catchups-lib: delete `catchups-core.ts:25` and call
  `globalThis.crypto.randomUUID()` at `:96` (Web Crypto is global in Node 19+ and every browser), which
  makes the whole module client-safe. Option A is lab-only: the sketches page passes
  `CATCHUP_PROMPT_SETS` down through `SketchHarness` -> `Home`, and the capsule page computes
  `OPENS_AT`, `WOULD_OPEN` and each case's days-left on the server.
- **Saving**: 429 KB of uncompressed JS (about a third of each route's first load) on two admin-only
  routes; 0 for members today.
- **Risk & gate**: low. Rebuild and re-derive `route-bundle-stats.json`; `catchups-core.test.mjs` for
  option B.
- **Confidence**: high.
- **Notes**: **Warning for audit 2's open row `catchups-02`** (E12, catchups-ui's): it proposes moving
  `CATCHUP_PROMPT_SETS` off the server-to-client prop drill into a direct client import. Done while
  `catchups-core.ts` still imports `node:crypto`, that would put this 429 KB chunk on
  `/catchups/[catchupId]` for every member. Do option B first, or move `CATCHUP_PROMPT_SETS` into a
  client-safe module (`catchups-types.ts` has only type imports). These two lab rooms are the proof.

### lab-catchups-05 - Point the lab's copies of three shipped primitives at the shipped ones
- **Where**: `src/app/lab/catchups/sketches/_parts.tsx:71-135` (`FlushAvatar`, from the "An avatar
  whose LEFT EDGE is where you think it is" docblock to the function's end); `wall/_shapes.tsx:62-103`
  (`FlushBird`, "This is `FlushAvatar` from `../sketches/_parts.tsx` at a smaller size");
  `_settings.tsx:1144-1168` (`PictureDoor`). Shipped: `src/components/common/flush-avatar.tsx:41-106`,
  `src/components/catchups/settings/settings-surface.tsx:782-805` (`PictureDoor`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd `wall/_shapes.tsx:88-103 <-> common/flush-avatar.tsx:94-106`,
  `wall/_shapes.tsx:75-84 <-> flush-avatar.tsx:45-59`, `sketches/_parts.tsx:97-119 <->
  wall/_shapes.tsx:77-90`. The shipped primitive exists because of these two copies
  (`flush-avatar.tsx:32-35`: "The lab drew it twice and said in the second copy that a third caller
  should make it shared; the shipped reader is that moment"), yet neither copy was re-pointed, and
  the shipped one has since gained the right-hand gap fix (2026-09-10, "the names are a bit too
  separated from the bird icons"). `PictureDoor`: the lab and shipped functions are identical except
  the icon prop's type (`typeof SlidersHorizontal` vs `LucideIcon`); `capsule/_room.tsx:24` already
  imports the shipped one.
- **What to do**: delete the local `FlushAvatar` and `FlushBird`; import
  `{ FlushAvatar } from "@/components/common/flush-avatar"` in both files (its `person` prop takes
  `{ id, name, photoUrl, birdOverride }`, which `SketchPerson` and `AvatarUser` satisfy). For
  `PictureDoor`, `_rail.tsx` imports the shipped one as capsule does; skip that part if owner decision
  2 keeps `_settings.tsx` frozen as the signed-off record.
- **Saving**: ~110 lines and 2 of the lab's 10 `as unknown as` casts.
- **Risk & gate**: low. Room-visible: in the sketches and wall rooms a bird now sits up to 8 px closer
  to its name, which is what ships. `npm run check`; open `/lab/catchups/sketches?at=reader` and
  `/lab/catchups/wall` at 390 and 1440.
- **Confidence**: high.
- **Notes**: I judged this autonomous because the byline is not the subject of either room; if the
  owner wants history rooms frozen to the pixel (decision 1, "keep as they are"), skip it. Importing
  `PictureDoor` from `settings-surface.tsx` costs a room ~36 KB of lab-only JS (the capsule room pays
  it today) unless catchups-ui splits `PictureDoor` into its own file (For other lenses).

### lab-catchups-06 - Delete the dead exports in the sketches room, tsc's unused `g`, and the code tombstones
- **Where**: `sketches/_cover.tsx:104-107` (`Own`), `:109-141` (the contents banner, `COVER_CAP` with
  its docblock, `Contents`), `:47` (`import { QuestionList } from "./_navigator"`, orphaned with
  `Contents`), `:263-324` (the "The Catch-up's picture" docblock and `Picture`);
  `sketches/_shelf.ts:359-363` (`shelfOf`); `sketches/_types.ts:21-23` (`VIEWPORT_WIDTH`,
  `PHONE_HEIGHT`); `magazine/_pages.tsx:611` (`export type { MagPhoto };`); `wall/_shapes.tsx:255`
  (`groups.reduce<number[]>((acc, g, i) =>`). Cheap tail, tombstones for deleted code:
  `_harness.tsx:51-58` ("THE SCREENS TAB IS GONE ... `_frames.tsx` went with it"), `_cover.tsx:143-148`
  ("`RoundLine` used to live here"), `_cover.tsx:170-173` ("COVER_SHOTS and the tiling MOVED OUT"),
  `_navigator.tsx:521-526` ("`BottomSheet` and `ContentsPage` used to live here").
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-plus-lab.txt` lines 34-36, 48-50, 211. Each symbol occurs once in its
  own file (the declaration) and nowhere in `src`, `scripts` or `e2e` (the `<Contents b={b} />` at
  `_pages.tsx:540` is that file's own local component). History: `git log -G"<Contents[ />]"` last
  touched 677d177d (2026-09-07); `VIEWPORT_WIDTH` lost its last reader in 98175b44 (2026-09-07, the
  Screens tab's deletion); `<Picture` and `<Own` were never rendered. `raw/tsc-unused.txt`:
  `wall/_shapes.tsx(255,48): 'g' is declared but its value is never read`.
- **What to do**: delete the listed ranges and the orphaned import; rename the reduce parameter to
  `_g` (or write the running sum as a loop); delete the four tombstones. Keep the two comments that
  explain a live re-export (`_cover.tsx:51-57`, `_shelf.ts:117-124`): they carry a reason. Leave the
  other 33 knip flags in this territory alone: each is an `export` on a symbol used inside its own
  file (listed in Metrics), harmless room API.
- **Saving**: ~110 lines of dead code, ~25 lines of tombstones (the tombstones are the cheap part).
- **Risk & gate**: none; nothing renders them. `npm run check` (tsc + lab registry).
- **Confidence**: high.
- **Notes**: deleting these changes no pixel in any room, which is why it is autonomous even though
  the room is design history. `Picture`'s docblock (`_cover.tsx:263-286`) carries his 2026-09-07
  diagnosis ("Catch-ups is the only one that has like nothing, no images") and the circle-versus-
  rounded-rectangle reasoning; that argument already lives on in `src/lib/catchup-pictures.ts` and the
  shipped cards, so nothing is lost, but a fixer who wants it kept can move the paragraph above
  `Door`. Related: -05 (the `FlushAvatar` copy in `_parts.tsx`), -14 (stale headers in these files).

### lab-catchups-07 - Give the Catch-ups rooms a kit folder instead of borrowing the sketches room's files
- **Where**: `sketches/_shell.tsx` (imported by `wall/_room.tsx:36`, `voice/_room.tsx:24`,
  `vote/_room.tsx:27`, `capsule/_room.tsx:27`); `sketches/_shell.tsx:26` -> `_parts.tsx:56-69`
  (`ValleyWash`, whose only consumer is the shell); `sketches/_data.ts` (-> `settings/page.lab.tsx:14`,
  `magazine/_live.ts:15`); `sketches/_types.ts` (-> `magazine/_live.ts:16`); `sketches/_media.ts`;
  `sketches/_shelf.ts` (-> `_settings.tsx:91`, `settings/_room.tsx:26`, `settings/page.lab.tsx:15`).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: seven cross-room import edges (Metrics). Because the shell imports one 14-line function
  from the reader's answer parts, the wall, voice, vote and capsule rooms each compile and bundle
  `_parts.tsx` (595 lines), `_media.ts` and `_types.ts` they never use. The magazine room's live data
  path runs through the sketches room's loader. So "the sketches room" is really a room plus the kit
  for six others.
- **What to do**: move `ValleyWash` into `_shell.tsx` (removes the edge to `_parts.tsx`); move
  `_shell.tsx`, `_data.ts`, `_types.ts`, `_media.ts` into `src/app/lab/catchups/_kit/` and update the
  ~10 import lines. `_shelf.ts` stays with sketches unless owner decision 1 archives that room, in
  which case it moves with the settings room (it is also pinned by `catchup-pictures.test.mjs:296-305`).
- **Saving**: 0 lines; four rooms stop compiling the reader's parts, the graph reads truthfully, and
  owner decision 1 becomes a clean folder delete.
- **Risk & gate**: low. `npm run check` (tsc and `lab-audit.mjs`).
- **Confidence**: high.
- **Notes**: this is the prerequisite for owner decision 1: without it, moving the sketches room to
  history breaks six other rooms. Considered and not taken: folding these files into the lab-wide kit
  (`src/app/lab/_kit.tsx`, lab-rest's): they are Catch-ups-specific (the phone bar carries a Catch-up's
  name, the loader reads Editions), so a Catch-ups kit folder is the honest home. Do it before -12,
  which puts the shared room chrome in the same folder.

### lab-catchups-08 - Let shipped Catch-ups components take their server actions as props, at the next transplant
- **Where**: shipped: `src/components/catchups/home/collecting.tsx:53`
  (`import { curatePrompt, submitPrompt } from "@/app/(main)/catchups/actions"`, bound inside
  `AskBox` at `:62`); `src/components/catchups/settings/settings-surface.tsx:93-107` (about a dozen
  actions bound in `useSettings`, `:825`). Lab redraws they force: `vote/_ask.tsx:6-8` ("redrawn here
  rather than imported because the real one calls `submitPrompt`"), `sketches/_home.tsx:254-565`
  (`AskBox`, `AskedPanel`, `RowButton`), the whole of `_settings.tsx`. Precedent:
  `src/components/posts/comments-section.tsx:75,148` (`actions: CommentActions`).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: 45 lab<->shipped clones, 1,028 lines (jscpd); every one exists because the shipped side
  binds its actions at import, so a room cannot mount it without really writing. Where a shipped
  component is props-driven the rooms already mount it "wired to nothing" (`LoveButton` at
  `wall/_shapes.tsx:105-128`, the shared viewer in the swipe room, `PictureDoor` in capsule).
- **What to do**: not as a standalone refactor. When the owner's picks unblock the voice, vote and
  capsule transplants (owner decision 4), give `AskBox` an `onSubmit`/`onCurate` pair and the settings
  surface an `actions` object, wired by the page, exactly as comments-section does. The rooms then
  mount the real components with inert actions.
- **Saving**: 0 lines now; it removes the reason for ~1,300 lines of lab redraws the next time a room
  is drawn over these components, and the vote room's `AskVote` becomes ~120 lines lighter at
  transplant.
- **Risk & gate**: medium (shipped components). `npm run check`, `npm run visual`, drive the home's
  ask box and settings in a browser.
- **Confidence**: medium: the payoff depends on the lab staying the design surface, which is how this
  campaign worked.
- **Notes**: considered and not taken: letting rooms call the real actions against a throwaway
  Catch-up (there is one database, and it is production's); aliasing `@/app/(main)/catchups/actions` to
  a mock for lab builds (too clever, and the lab compiles inside the owner's production build). The
  prop seam is the repo's own precedent, proved twice (comments, letters). Audit 2 refuted a
  `withMember`/`withAdmin` wrapper for actions; this is not that: the actions and their gates stay
  exactly as they are, only who hands them to the component changes.

### lab-catchups-09 - Remove the dev-mode auth bypass from the lab's archive action
- **Where**: `src/app/lab/actions.ts:24-31` (`if (process.env.NODE_ENV !== "development") { const
  denied = await requireAdminAction(); ... }` and the comment "Local dev keeps the old frictionless
  behaviour with no sign-in"). The page half is lab-rest's: `src/app/lab/page.lab.tsx:42-45`
  (`editable = process.env.NODE_ENV === "development" || session?.user?.role === "admin"`) and the
  `editable` prop and read-only branch in `_lab-client.tsx:38,194,220,244-248,306-309`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the bypass is from 84f64abe (2026-07-30), when `/lab` was open to anyone. Since
  b64e44aa (2026-08-20, security Phase 6) the lab layout returns `notFound()` for any non-admin in
  every environment (`src/app/lab/layout.tsx:16-19`). So the page-side check can never be false for
  anyone who renders `/lab`, and the action-side bypass is now the one path that writes
  `LabRoomState` without a session, on a dev server whose database is production's.
- **What to do**: `setArchived` always calls `requireAdminAction()`; delete the `NODE_ENV` branch and
  its stale comment. (lab-rest: drop `editable` and the read-only banner.)
- **Saving**: ~7 lines here and ~15 in lab-rest's files; one rule instead of two.
- **Risk & gate**: low; the owner's dev sessions sign in as admin (dev-login). This file is in the
  `gate-coverage.test.mjs` sweep (`serverActionFiles()`); the `requireAdminAction` marker stays, now
  unconditional. Also run `security-regressions.test.mjs`.
- **Confidence**: high.
- **Notes**: also a small hardening, which the orchestrator may mention to the bug-audit session.

### lab-catchups-10 - Drop the "LabRoomState table not created yet" guard
- **Where**: `src/app/lab/_archive-state.ts:23-33` (`isMissingLabTable` and its docblock), `:48-50`
  (the conditional log in `readOverrides`); `src/app/lab/actions.ts:7` (the import) and `:54-60` (the
  "Run prisma/migrations-manual/2026-07-30-lab-archive.sql once." branch).
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the table exists in production (`raw/db-tables-live.json`: 31 rows) and in the demo
  (`prisma/migrations-manual/2026-08-03-demo-purge-and-drift.sql:22-29` altered it there); local dev
  uses production's database; the demo build has no lab at all. No environment runs the lab without
  the table. The guard defended the days before the 2026-07-30 migration ran.
- **What to do**: delete `isMissingLabTable`; `readOverrides` keeps its catch (log, return `{}`), which
  already degrades; `setArchived` keeps its generic "Could not save.". `prisma-errors.test.mjs:30,34,44`
  use `/LabRoomState/` only as an example regex for the shared `isMissingTable` and can stay.
- **Saving**: ~18 lines.
- **Risk & gate**: very low. `npm run check`, `prisma-errors.test.mjs`.
- **Confidence**: high.
- **Notes**: the same pattern, `isMissingCatchupTable`, has ten shipped call sites (For other lenses).

### lab-catchups-11 - Retire the sketches room's own link resolver; phase 10 shipped the real one
- **Where**: `src/app/lab/catchups/sketches/_media.ts` (187 lines: `SPOTIFY_RE`/`YOUTUBE_RE` at
  `:55-56`, `findLinks` `:61-83`, `stripLinks` `:98-111`, the network half `cache`/`oembed`/
  `resolveOne` `:113-176`, `resolveMedia` `:178-186`); its callers `sketches/_data.ts:140-155` (the
  "Resolve every pasted link in the Edition up front" wave) and `:195-213` (the merge after `e.links`,
  and `text: stripLinks(e.body)`), and `sketches/_pressure.ts:44,95,106`. The shipped successors:
  `src/lib/link-preview-core.ts:75` (`findLinks`), `:114` (`classifyLink`), `:184`
  (`oembedEndpoint`), `:193` (`youtubeStill`), and `src/lib/link-preview.ts`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `_media.ts:30-35` calls itself "a lab-side stand-in for work the rooms will do
  properly"; that work shipped as phase 10 (286820f7, 2026-09-14: a pure link grammar in
  `link-preview-core.ts`, the resolver with its `LinkPreview` table and re-hosted images). Two things
  follow. (1) On the live path the lab resolver is inert or wrong: `_data.ts:195-199` records that "a
  link the real loader resolved is now taken OUT of `e.body`", so the wave scans bodies that no longer
  hold the links it knows, and where it does find one the shipped resolver has not reached yet, it
  fetches Spotify or YouTube oembed from the admin page and draws a card where members see a plain
  link. (2) On the pressure path the magazine engine already does the same job offline with the
  shipped grammar: `src/lib/magazine/from-export.ts:20,33-55` (`linksOf`: `findLinks` +
  `classifyLink` from `link-preview-core`, a placeholder title, `youtubeStill`, the link removed from
  the body). So the repo holds two Spotify/YouTube grammars that can drift (the lab's regexes accept
  `track|album|playlist` and an `intl-xx` segment; the shipped one decides for itself).
- **What to do**: in `_data.ts`, delete the `resolveMedia` wave and the second spread, so `media` is
  `e.links.map(...)` and `text` is `e.body` (the loader has already taken resolved links out). In
  `_pressure.ts`, derive cards the way `from-export.ts`'s `linksOf` does (export that helper from
  `from-export.ts`, or call `findLinks`/`classifyLink` directly). Delete `_media.ts`, keeping the
  4-line `SketchMedia` type in `_types.ts`.
- **Saving**: ~190 lines (most of `_media.ts` plus ~20 in `_data.ts`); one duplicated link grammar;
  no network calls from the sketches, settings and magazine rooms' loaders.
- **Risk & gate**: low. Room-visible in one place: with `?data=pressure`, a pasted Spotify or YouTube
  link's card shows the placeholder title the magazine already shows ("A song on Spotify") instead of
  a live oembed title. Open `/lab/catchups/sketches?at=reader` against `/catchups/edition/<id>` for the
  same Edition (the song question's cards must match), then `?data=pressure`.
- **Confidence**: medium-high (the "taken out of `e.body`" behaviour is documented at the lab call
  site; I did not trace `loadPublishedEditionView` itself).
- **Notes**: `_media.ts`'s header (brief paragraphs 16, 49 and 50) is the history of why link previews
  exist; the shipped `link-preview-core.ts` should already carry that reasoning, so nothing is lost,
  but the fixer should check before deleting. Related: lab-catchups-01 (the magazine fixtures use the
  same offline derivation).

### lab-catchups-12 - Write the Catch-ups rooms' chrome once
- **Where**: `voice/_room.tsx:92-163` (`PILL`, `ON`, `OFF`, `CINNAMON_ON`, `Pills`, `Frame`, `Says`),
  `vote/_room.tsx:78-147`, `capsule/_room.tsx:80-141`; the header rows `capsule/_room.tsx:288-318`,
  `voice/_room.tsx:304-334`, `vote/_room.tsx:221-251`, `wall/_room.tsx:154-169`; variants at
  `wall/_room.tsx:97-101` and `sketches/_harness.tsx:60-66,190-201`.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd, seven clones among these files, 222 lines: capsule:77-116 <-> vote:75-118 (40),
  capsule:84-116 <-> voice:98-134 (33), voice:124-156 <-> vote:108-140 (33), capsule:288-318 <->
  voice:304-334 (31) and <-> vote:221-251 (31), capsule:127-144 <-> vote:133-150 (18),
  capsule:291-306 <-> wall:154-169 (16). Of the lab-wide kit (`src/app/lab/_kit.tsx`), the Catch-ups
  rooms use only `DelightShell`, and only in the magazine room; its `Seg` control goes unused here.
- **What to do**: one `_kit/room-chrome.tsx` (with -07) exporting `Pills`, `Frame` (with the optional
  `title` only capsule uses), `Says` and a `RoomHeader` (back-to-lab link plus the view pills); the
  three rooms import it.
- **Saving**: ~150 lines, 7 clones.
- **Risk & gate**: low, lab-only, room chrome only; open the four rooms at 390 and 1440.
- **Confidence**: medium on the net line count (the variants differ slightly).
- **Notes**: lowest priority here. Only worth doing if owner decision 1 keeps the rooms, and best done
  after the owner-gated rooms get their picks, since their transplant sessions touch them anyway.

### lab-catchups-13 - Correct the shipped comment that says the settings room "cannot drift"
- **Where**: `src/components/catchups/home/catchup-home.tsx:299-302` ("the panel inside them is the same
  component the /lab/catchups/settings room draws -- so the room he signed off and the shipped surface
  cannot drift").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `settings/_room.tsx:16-25` imports everything from `../_settings` (the lab's own
  1,226-line file). b94677ce (2026-09-09 12:41) created `settings-surface.tsx` (1,191 lines at birth)
  as a transplant and never touched the room, whose last commit is b49a0552 (02:17 the same day). They
  have diverged since: d422de66 (2026-09-15) moved the shipped surface to the shared `BottomSheet`;
  334d7907 (back closes overlays); the shipped surface offers three rhythms and the room four
  (`settings-surface.tsx:52-58` says so itself). 346 of `_settings.tsx`'s 1,227 lines are verbatim
  clones of the shipped file (28 %). The lab's own claims (`settings/page.lab.tsx:8-10`,
  `_rail.tsx:23-28`) are about the lab spine and the lab room sharing `_settings.tsx`, and are true.
- **What to do**: say what is true: transplanted from the room on 2026-09-09; the room is the record of
  what he signed off and has not followed later changes. Or make it true through owner decision 2.
- **Saving**: 0 lines; one false invariant gone (a session trusting it would edit the room expecting
  production to change).
- **Risk & gate**: none; `npm run check`.
- **Confidence**: high; only a new commit that re-points the room at the shipped surface would make
  the comment true.
- **Notes**: catchups-ui's file; reported here because it is a claim about this room.

### lab-catchups-14 - Fix the registry note and room headers that describe features the rooms no longer have
- **Where**: `src/app/lab/_registry.ts:213` (sketches: "Five stills of moments deep in the page, the
  navigator drawn three ways, and the same page at 1512. ?w=reader|screens|laptop."); `sketches/
  _home.tsx:16` ("the rail People / Reminders / Running this (_rail.tsx)"), against `_rail.tsx:23-28`
  ("WHAT IS LEFT IN THIS FILE, since 2026-09-09: the two doors on the photograph and the roster");
  `sketches/_list.tsx:33-38` ("a panel is a heading, a state line and the Edition's own contents").
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `_harness.tsx:51-58` says the stills and the Screens tab are gone (98175b44,
  2026-09-07); the views are `phone|laptop` (`_harness.tsx:44-49`); navigators B and C are deleted
  (`_navigator.tsx:37-38`); the list draws photograph cards (`_list.tsx:93-160`). The other seven
  Catch-ups registry notes match their rooms (checked each against its page).
- **What to do**: note -> "The Catch-ups front runner, live: the list, a Catch-up's home in every
  state and the reader, joined up, on the real Edition or the pressure corpus.
  ?w=phone|laptop&at=list|home|reader&data=pressure". Trim the two stale header sentences.
- **Saving**: 0 lines; the index stops advertising things that are not there.
- **Risk & gate**: none; `npm run check` (the lab registry audit reads `_registry.ts`).
- **Confidence**: high.
- **Notes**: `_registry.ts` is lab-rest's file.

### lab-catchups-15 - Copy the owner's 31 archive choices into the committed registry
- **Where**: the `LabRoomState` table (31 rows) and the `status:` fields of `src/app/lab/_registry.ts`
  (45 "active", 8 "archived" among top-level rooms).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous (the copy); the optional row delete is
  his (owner decision 5)
- **Evidence**: `raw/db-tables-live.json`: 31 live rows, 31 index scans since the 2026-05-22 stats
  reset (the table dates from 2026-07-30), which fits about 31 toggles. The registry's own comment
  (`_registry.ts:85-89`) says this fold was done once before, on 2026-07-30. Without it, anyone
  reading the code (this audit included) cannot tell which rooms he has already put away; for this
  report I could not tell whether any Catch-ups room is among them.
- **What to do**: first run `SELECT href, archived, "updatedAt" FROM "LabRoomState" ORDER BY href;`
  and set each listed room's `status` in `_registry.ts` to match. Then, only if he agrees (it deletes
  production rows), `DELETE FROM "LabRoomState";` so the table goes back to "one row per room whose flag
  differs from its default" (`actions.ts:41-45` keeps that invariant for later toggles). Leaving the
  rows in place is harmless; they would merely restate the defaults.
- **Saving**: 0 lines; the committed list becomes the truth.
- **Risk & gate**: low; `npm run check` (lab registry); `/lab` shows the same active and archived
  counts before and after.
- **Confidence**: high.
- **Notes**: run this before owner decision 1 is put to him: if he has already archived the sketches,
  settings or wall room from `/lab`, the question can say so ("you have already hidden this one; shall
  its code go too?"). The rows also answer which of the 45 "active" rooms are really in use, which the
  lab-rest lens needs for its own archive list.

## Owner decisions

**1. Three Catch-ups rooms whose designs are now live: keep them, or move their code to history?**
- *What I'd change*: nothing unless you say so. These are the room where you walked the whole
  Catch-ups shape (the list, a Catch-up's home, the reader), the settings you signed off, and the photo
  wall you picked "a run" from. What they drew went live on 8, 9 and 10 September, and the live
  versions have moved on since, so each room is now a record of what you approved. Moving them to
  history would take about 7,700 lines out of the project; they also get touched every time the live
  Catch-ups change (8 of the 36 commits that touched these rooms were that).
- *What you'd notice*: three fewer rooms in the lab (you may already have archived some there).
  Members notice nothing. Every room stays in the project's history and can come back in minutes.
- *If I guess wrong*: we bring the room back from history exactly as it was.
- *Options*: (a) keep all three; (b) move the Catch-ups walkthrough to history, keep settings and the
  wall (about 4,200 lines); (c) keep the wall, which the Catch-ups plan says stays "as the record of
  why" you picked the run, and move the other two (about 6,050 lines); (d) move all three (about
  7,700 lines).
- *If you don't reply*: (a), keep all three.
  `[sketches -> 5e688bb4, b94677ce, 5eccd80d; settings -> b94677ce; wall -> 14c1b096, 5eccd80d;
  do lab-catchups-07 first; lab-catchups-05 and -12 apply only if kept]`

**2. The settings room: the record of what you signed off, or a window onto the real settings?**
- *What I'd change*: the settings room still shows its own copy of the settings from 9 September. The
  real settings have changed since (the new shared bottom sheet, three rhythm choices instead of four).
  I could rebuild the room from the real settings' own parts, so it always shows what members get, and
  remove about 900 lines of copy.
- *What you'd notice*: the room would look like the real settings as they ship, still with the three
  people side by side and the confirmations together. The version you signed off would live in history.
- *If I guess wrong*: the room stops matching the drawing you remember approving; we restore it.
- *Options*: (a) keep it as the record, and fix the one wrong note in the code that says the two
  cannot drift; (b) rebuild it on the real settings.
- *If you don't reply*: (a). `[lab-catchups-13, -08; _settings.tsx 1,226 lines]`

**3. The magazine: keep it ready, or put it away until you want it?**
- *What I'd change*: the magazine design is finished and has been waiting since 14 September for you
  to look at the printed pages (the live Edition's pages 5, 7 and 18). Nothing a member uses depends
  on it. Everything behind it, the layout rules, the room, the printer and the test examples, is about
  22,600 lines, the biggest block in the Catch-ups area, and its test runs in every check.
- *What you'd notice*: nothing either way until you want the magazine. If it is put away, its lab
  room disappears until it comes back.
- *If I guess wrong*: it comes back from history exactly as it was.
- *Options*: (a) keep it, and shrink its test examples from about 18,600 lines to about 2,500 without
  changing what they test; (b) put the whole magazine away until you ask for it.
- *If you don't reply*: (a). `[lab-catchups-01, -02, -03; M2 gate in handover.md]`

**4. Three features waiting on your pick: answering out loud, voting, and time capsules.**
- *What I'd change*: nothing in this audit. All three are built underneath and already live on the
  server, and each has a lab room with two or three drawings to choose from. They have waited ten days.
  Until you pick, the code behind them does nothing.
- *What you'd notice*: nothing until you pick; then each becomes a real feature.
- *If I guess wrong*: nothing is lost either way.
- *Options*: (a) pick when you are ready, in one line (the plan's example: "voice: mic in the box +
  the tape. vote: piles. capsule: the year line"); (b) shelve one or more, and a later session takes
  its unused plumbing out of the app and moves its room to history.
- *If you don't reply*: (a); nothing changes. `[voice/vote/capsule rooms; handover rows 192-194;
  owner question 55; lab-catchups-08]`

**5. The archive button on the lab's index.**
- *What I'd change*: nothing to the button. It saves your choice in the live database (31 choices so
  far), because the website cannot save files. The alternative is recording archiving in the code,
  which means asking a session each time. What I would do is copy your 31 choices into the code's own
  list of rooms, so anyone reading the code sees what you see.
- *What you'd notice*: nothing.
- *If I guess wrong*: n/a.
- *Options*: (a) keep the button and copy your choices into the list, leaving the saved choices where
  they are; (b) the same, and also clear the 31 saved choices once they are copied, so the database
  only holds changes you make from now on; (c) drop the button and archive through the code.
- *If you don't reply*: (a). Copying is harmless; clearing the saved rows waits for your yes.
  `[LabRoomState; lab-catchups-15, -09, -10]`

**6. The swipe tester.**
- *What I'd change*: nothing. That room exists so you can reproduce, on your own phone, the photo
  viewer jumping back two pictures, which never happened on a computer. You said you would try it
  later. The viewer has been changed four times since (16, 17 and 23 September), so the fault may
  already be gone.
- *What you'd notice*: nothing.
- *If I guess wrong*: n/a.
- *Options*: (a) keep it until you have tried it; (b) try it once, and if the fault is gone the room
  goes to history.
- *If you don't reply*: (a). `[/lab/catchups/swipe; handover X row, V2/V3]`

## Not-findings

- **The lab ships no JavaScript to a member**, re-proved for these eight routes: their first loads use
  47 distinct chunks, 29 of which (1,205 KB uncompressed) appear in no shipped route's first load;
  no shipped app file imports `src/app/lab/**` (only `magazine.test.mjs` imports lab code, and
  `catchup-pictures.test.mjs:301` reads `_shelf.ts` as text).
- **No CSS from these rooms reaches members**: `globals.css:21` `@source not "./lab"`; `lab.css`
  compiles lab utilities for the lab layout only; the magazine's `PAGE_CSS` (including a global
  `@page { size: A4 }`) is injected by `<style>` only on its own page (`_pages.tsx:600`).
- **The fixture JSON costs no build seconds** (read by `fs` at request or test time, never imported).
  Lab-catchups-01 is about weight and lines, not build time.
- **The long docblocks with his words** (`_reader.tsx:3-41`, `_navigator.tsx:3-39`, `_settings.tsx:
  3-57`, `_home.tsx:3-63` and the rest): reasons, dates and quotes, the standing audit 1 and 2 rule;
  they are also the provenance the shipped files cite. The territory's comment ratio is 0.32.
- **`_fixtures/pressure.ts`** (a 407-line generator used by the sketches room, the vote room and the
  magazine test) and **`wall/_corpus.ts`** (a deterministic wall generator up to 200 photographs):
  already the right shape, and the model for lab-catchups-01.
- **The rooms' mock app shell** (`sketches/_shell.tsx`) instead of the real `Sidebar`: necessary, the
  real one reads the pathname and session and positions itself `fixed` (`_shell.tsx:8-10`), and the
  rooms draw a phone inside a laptop window.
- **The vote, voice and capsule rooms import the real rule modules** (`decideVoteChoices`,
  `VOICE_MAX_SECONDS`, `capsuleOpensAt`): the right direction and one source of truth. The capsule
  import's bundle cost is lab-catchups-04's, not the direction's.
- **The swipe room** imports the real shared viewer and patches nothing: an instrument, not a clone.
- **The three drawings per owner-gated room** (vote's flocks/piles/roll call, capsule's
  year line/asleep/morning, voice's two recorders and three players): the rooms exist for him to pick
  between them; after the pick, two of three become history, as with the wall.
- **`scripts/dev/print-magazine.mjs` and its poppler binaries**: `pdffonts`, `pdfinfo`, `pdftoppm` are
  optional, each behind a try/catch ("when `pdftoppm` is installed"), and are installed on this Mac
  (Homebrew). knip's "Unlisted binaries (3)" is a false positive for system tools. The printer is used:
  it is the M2 gate's tool ("What he should open first"), last run 2026-09-14 17:03 (the timestamp of
  its gitignored output folder; nothing inside was opened).
- **The rooms that read the production database** (sketches, settings, magazine, swipe) do so
  read-only and admin-only, as he approved (handover, owner question 5).
- **`LabRoomState`'s runtime cost**: 31 rows, 32 KB with its index, 917 sequential scans since
  2026-05-22 (one per `/lab` view), not among the top-120 statements by time. Why it is a table and
  not a file still holds: a deployed Vercel filesystem is read-only (`_archive-state.ts:4-11`).
- **The magazine room's two-pass layout** (estimate, then canvas-measured with the real fonts) and its
  `?print=1` / `data-magazine-ready` hooks: the design (`_room.tsx:3-17`) and load-bearing for the
  printer.
- **Every lab<->shipped pair has diverged** (3 to 28 % of each lab file still verbatim, Metrics), so no
  room is "the same code" as what shipped; each is history. The only true older copies of a shipped
  primitive are the three in lab-catchups-05.
- **Could `export-catchups.mjs` generate the fixtures on demand?** No: it exports real members' words,
  which must never be committed; the invented fixtures are hand-designed failure cases.

## Audit carry-overs in this territory

- **Audit 2 G1/G7** (the lab leaves the demo's build via `page.lab.tsx`): DONE. All eight Catch-ups
  rooms are `page.lab.tsx` and appear in the owner's production route table (`raw/build.txt`).
- **Audit 2's "lab CSS share of the shared stylesheet" (-73 KB)**: addressed by `@source not "./lab"`
  plus `lab.css`; these rooms add nothing to the member stylesheet by construction (bytes not
  re-measured by me; the bundle lens has the analyze data).
- **Audit 2 `catchups-02`** (E12, open, catchups-ui's): not in this territory, but see the warning in
  lab-catchups-04 before anyone executes its prompt-library half.
- **"The lab ships no JavaScript to a member"** (audits 1 and 2): still true for these routes,
  re-proved above.
- **Audit 2 G4** (parked, `FEATURES.md` item 4, "small building blocks kept alive for one lab room"):
  concerns the `location-picker` and `everything` rooms, lab-rest's, not these.
- No refuted row from audits 1 or 2 touches these files.

## For other lenses

- **catchups-lib**: `src/lib/catchups-core.ts:25` `node:crypto` -> global `crypto.randomUUID()` makes
  the module client-safe (lab-catchups-04). `isMissingCatchupTable` (`catchups-core.ts:1400`) guards
  ten shipped call sites against Catch-up tables being absent (`(index)/page.tsx:257`,
  `new/page.tsx:70`, `join/[token]/page.tsx:76`, `edition/[editionId]/page.tsx:156`,
  `[catchupId]/(home)/page.tsx:495`, `actions.ts:233`, `catchups.ts:324,519,527`,
  `batch-catchups.ts:310`); the tables exist in both databases, same shape as lab-catchups-10, so
  probably a placeholder, but check the demo reset path before calling it. `isCatchupExportFile`
  (`catchups-export.ts:197-206`) validates four top-level fields only. `src/lib/magazine/**` has no
  consumer but the lab room and its own test (their lead confirmed from this side). And a stale,
  unterminated comment: `catchups-core.ts:37-50` ("Why the runtime deps (prisma, the notify builders)
  load via dynamic import ... Do NOT convert these back to static imports") describes dynamic imports
  the file's own header says are gone (`:16-21`, "That workaround is gone") and the file contains none;
  its `/*` at `:37` has no closing `*/` until `:70`, so it is fused into `askerVisible`'s docblock.
- **catchups-ui**: `catchup-home.tsx:299-302`'s false claim (lab-catchups-13). `PictureDoor` lives in
  `settings/settings-surface.tsx:789` while `index/picture-door.tsx` holds `Door`, `CardCaption` and
  `CardScrim` but not `PictureDoor`; giving `PictureDoor` its own small file would let `home-head.tsx`
  and lab rooms use it without the 1,010-line settings surface. The actions-as-props seam
  (lab-catchups-08). The `catchups-02` warning (lab-catchups-04).
- **lab-rest**: `src/app/lab/page.lab.tsx:42-45` and `_lab-client.tsx`'s `editable` flag are always
  true since the layout's admin gate (lab-catchups-09); `_registry.ts:213` (lab-catchups-14); the
  registry's statuses versus the 31 `LabRoomState` rows (lab-catchups-15).
- **bundle-build**: many routes' server traces, shipped ones included (`feed`, `profile/[id]`,
  `catchups/*`, `api/upload/*`, `letters/*`...), list `public/images/birds/*` (102 files) and other
  `public/` trees; some `process.cwd()`-joined path in a shared server module drags `public/` into
  function traces, which is worth measuring for function size. The magazine route's `.exports` entry
  is lab-catchups-02. My estimate of these eight rooms' build share, from audit 2's G1 measurement
  (47 lab routes = 12.3 s of cold compile) scaled by routes or by lines: roughly 1.5-3.5 s of cold
  compile and a proportional slice of `tsc` (they are 11.5 % of the repo's TS). An estimate, not a
  measurement; please measure.
- **scripts-e2e-ci**: knip `ignoreBinaries: ["pdffonts", "pdfinfo", "pdftoppm"]` for
  `print-magazine.mjs` (optional Homebrew tools; the report's "unlisted binaries" is noise).
- **lib-tests**: `catchup-pictures.test.mjs:296-305` ("the pool lives here, and the lab room only
  borrows it") pins a lab room file's import line; if owner decision 1 moves the sketches room to
  history, that half of the test goes with it or follows `_shelf.ts`. `magazine.test.mjs:3` imports
  lab code (lab-catchups-03).
- **tracked-weight**: the fixtures, 716 KB (lab-catchups-01).
- **For the orchestrator to relay to the bug audit, at its discretion**: the `.exports` folder in the
  magazine route's trace (lab-catchups-02) and the unauthenticated dev path that writes production's
  `LabRoomState` (lab-catchups-09).

## Metrics

- **Territory**: 61 files (59 in `src/app/lab/catchups/` + `src/app/lab/actions.ts` +
  `_archive-state.ts`); 32,835 lines (32,715 + 120). cloc code lines: TypeScript 10,076 (comment
  3,216, ratio 0.32) in 47 files; JSON 18,632 in 12 files. Tracked bytes 1,318,629 (1.29 MB, 37 % of
  the lab's 3.52 MB); JSON 733,268.
- **Per room** (lines, all files in the folder): sketches 5,288 (room-only 3,624 + the kit it hosts
  1,664); settings 1,451 incl. `_settings.tsx` 1,226; wall 1,669; voice 1,688; vote 1,213; capsule
  1,043; magazine 981 (+ fixtures 18,698 incl. `corpus.ts`, + engine `src/lib/magazine` 2,692,
  + printer 215, + `magazine.md` 783); swipe 277; shared fixture `pressure.ts` 407.
- **Made / last touched / shipped as**: sketches 2026-09-06 / 09-14 / list 5e688bb4 (09-08), home
  b94677ce (09-09), reader 5eccd80d (09-10). settings 09-09 / 09-09 / b94677ce (09-09). wall 09-09 /
  09-14 / run 14c1b096 (09-09) + `photo-run.tsx` 5eccd80d (09-10). swipe 09-09 / 09-09 / instrument,
  V2/V3 open. voice, vote, capsule 09-14 / 09-14 / owner-gated (plumbing a8f4ea6f, 6e663ba5,
  76aac5ac, all on origin/main). magazine 09-14 / 09-14 / M1 done, M2 waiting on him.
- **Commits** touching `src/app/lab/catchups/`: 36; last 2026-09-14; 8 were shipped changes rippling
  into the lab (d81a7db9 the Round -> Edition rename touched 12 lab files; 782d9f7b, 02f9302f,
  5e688bb4, 41a73a73, 40791570, 286820f7, 6e663ba5).
- **Biggest files**: `_settings.tsx` 1,226; `sketches/_home.tsx` 970; `wall/_shapes.tsx` 938;
  `sketches/_reader.tsx` 760; `voice/_recorder.tsx` 728; `magazine/_pages.tsx` 611;
  `sketches/_parts.tsx` 595; `sketches/_navigator.tsx` 526. Fixtures: `wall-300.json` 5,631;
  `no-photos.json` 3,637; `photo-heavy.json` 2,248.
- **Comment-heaviest code files** (comment/code): `sketches/_cover.tsx` 0.89, `_list.tsx` 0.77,
  `_media.ts` 0.76, `_rail.tsx` 0.74, `_types.ts` 0.69; lightest: `capsule/_room.tsx` 0.04,
  `voice/_room.tsx` 0.04, `magazine/_pages.tsx` 0.06, `vote/_room.tsx` 0.06.
- **Clones** (jscpd, 50 tokens / 5 lines) touching the territory: 62 clones, 1,348 lines. Lab<->shipped
  45 / 1,028; lab<->lab 16 / 313; lab<->other lab 1 / 7. Share of each lab file that is still verbatim
  shipped code: `_settings.tsx` 346/1,227 (28 %), `_reader.tsx` 164/761 (22 %), `_parts.tsx` 131/596
  (22 %), `_navigator.tsx` 123/527 (23 %), `wall/_shapes.tsx` 102/939 (11 %), `_home.tsx` 99/971
  (10 %), `_list.tsx` 22/293 (8 %), `wall/_corpus.ts` 8/276 (3 %).
- **knip** in the territory: 29 unused exports + 10 unused exported types. Dead: 6 exports (`Own`,
  `Contents`, `Picture` in `_cover.tsx`; `shelfOf`; `VIEWPORT_WIDTH`; `PHONE_HEIGHT`) + 1 type
  re-export (`MagPhoto`). In-file use, harmless `export`: `liveCorpus`, `REMINDERS`, `RHYTHMS`,
  `LONGER`, `CHOICES`, `settingsGroups`, `Head`, `EditBody`, `isOpen`, `PAGE_CSS`, `PageView`,
  `HOME_RAIL`, `HOME_GAP`, `Panel`, `findLinks`, `Person` (`_rail.tsx`), `RAIL`, `RAIL_GAP`, `Tile`,
  `Section`, `PICTURES`, `paused`, `peaksOf`, `WALL_CAP`; types `Person` x2, `CaseKey`, `Size`,
  `EditionState`, `Picture`, `SketchSong`, `Ended`, `WallPerson`. tsc unused: 1 (`g`). Type sludge:
  5 of the lab's 10 `as unknown as` are here (two `getBBox` casts in the `FlushAvatar` copies, three
  `window` casts for `webkitAudioContext` / `SpeechRecognition` in the voice room); 1 `eslint-disable`
  (`voice/_clip.ts:115`, argued); 0 `any`, 0 `@ts-expect-error`, 0 `as object`.
- **Cross-room import edges** (importer -> imported): capsule, voice, vote, wall -> `sketches/_shell`;
  settings (page, room), `_settings.tsx` -> `sketches/_shelf`; settings page, `magazine/_live` ->
  `sketches/_data`; `magazine/_live` -> `sketches/_types`; `sketches/_pressure`, `vote/_cases` ->
  `_fixtures/pressure`; settings room, `sketches/_rail` -> `_settings.tsx`; `_shell.tsx` ->
  `_parts.tsx` (for `ValleyWash` only).
- **Routes**: 8 of 118 in the owner's build (66 lab). First-load JS: sketches 1,380 KB, capsule 1,323,
  magazine 863, settings 811, vote 803, voice 793, wall 755, swipe 640 (uncompressed). Lab-only chunks
  for these routes: 29, 1,205 KB. The Node polyfill chunk: 429 KB on 2 routes.
- **Server trace** of `/lab/catchups/magazine`: 889 files, 156 of them (22.9 MB) under
  `scripts/dev/.exports`.
- **Fixture content**: 520 answers, 353 photographs, ~83 KB of irreducible text in 720 KB of JSON;
  1,560 lines are song-column keys due to be dropped.
- **LabRoomState**: 31 rows, 32 KB including its 16 KB primary key, 917 seq scans, 31 index scans
  since 2026-05-22; written only by `setArchived`, read only by `/lab`'s `readOverrides`.
- **Findings**: 15 (T1 5, T2 7, T3 3, T4 0; structural 12, cheap 3; autonomous 15, owner 0 as
  findings, with 6 owner decisions below; the one step that needs his yes, deleting the 31 rows in
  lab-catchups-15, is marked inside that finding).
  Honest projected savings if every autonomous finding lands: ~16,600 lines (of which ~16,000 are
  fixture JSON), ~580 KB tracked, 429 KB of lab JS on two routes, 156 files / 22.9 MB out of a local
  trace, 7 + 3 clones, one duplicated link grammar, and no network calls from the rooms' loaders. Owner decisions 1 and 3, if taken as "move to history", add ~7,700 and
  ~22,600 lines respectively.
- **Lines read**: ~6,800 lines of territory TypeScript by eye (17 files in full, the rest at the ranges
  listed), all 18,632 JSON lines parsed and measured by script, ~1,100 lines of shipped comparators,
  ~1,000 lines of planning docs.
