# media — adversarial verification (refactor audit 2)

Verifier charter: image pipeline, storage, the viewer, photo layout, avatars. Byte and
dimension numbers ARE the claim.

**Tree state at verification**: HEAD = `72b5a1d`, working tree clean except the untracked
audit folder itself. `src/components/common/image-viewer.tsx` was shown modified in the
session-start snapshot; that work has since been committed as `72b5a1d`, so every line
number below is read against committed HEAD, not against somebody's WIP.

Method: read every named file at HEAD, re-ran every grep, re-measured every byte figure
against `.scratch/audit2-build/.next/static/chunks/` with `wc -c` / `gzip -9` / `brotli -q 11`,
and re-derived the route counts from `raw/route-bundle-stats.json` with a Python one-liner.
No builds, no browser, no database, no writes outside this file.

---

## collection-15 — photo-layout.ts version history — **confirmed**

- `cloc-by-file.csv`: `TypeScript,./src/lib/photo-layout.ts,33,460,126` — 460 comment / 126 code
  exactly as claimed. File is 619 lines.
- `:305-341` `carouselWidth`: the docblock runs 304-340 with the function at 341. "Version one
  let the tallest photograph pick the shape… Version two picked the MEDIAN" is verbatim at
  313-316. Confirmed (docblock actually opens at 304, one line earlier than cited).
- `:90-96` — the docblock opens at 90, the "There used to be a horizontal band beside this one
  … a case that no longer exists" sentence is at 93-96. Confirmed.
- `:258-281` the 4:5 floor story: confirmed, exact range.
- `:403-448` flexbox block header: confirmed, exact range (`/* ====` opens 403, closes 448).
- `:455-480` `drawnRatio` docblock: confirmed, opens at 455.
- The three docblocks it says to KEEP are as described: `PHOTO_MAX_HEIGHT` at 88 with its
  docblock above, `AIM_Y` docblock 90-121, `PHOTO_ROW_TARGET` docblock 486-503 with the
  const at 504 (finding says `:486-504`, i.e. it includes the const line — fine).
- Its own open question ("the media-viewer lens should confirm `photo-rows.tsx` does not carry
  the same flexbox header verbatim"): **it does not.** `photo-rows.tsx` (236 lines) has its own header describing the two components and what each
  wants from the algorithm; it never restates the flex-line arithmetic (its only near-mention is
  the last-row comment at :216); the flexbox arithmetic argument lives only in
  `photo-layout.ts:403-448`. No duplicate to remove.

Verdict: confirmed. The ~110-line saving is a judgement about which paragraphs are history,
which I did not re-count line by line, but every cited range exists and says what it is said
to say.

## duplication-01 — one kit for argv / connection URL / demo guard — **confirmed-with-correction**

Everything structural checks out:
- `const flag = (name) => argv.includes(name);` byte-identical in exactly **6** files:
  tag-photos-apply, backfill-image-dimensions, tag-professions-apply, tag-professions-pick,
  tag-photos-pick, import-album. ✓
- `const DEMO_REF = "cbvlzptghkuxhygyaezq"` in exactly **7** files: sweep-stranded-originals:56,
  tag-photos-pick:63, backfill-image-dimensions:51, run-sql:52, tag-professions-pick:71,
  tag-photos-apply:59, tag-professions-apply:65. ✓
- The comment split is right: **3** carry "The same destination check run-sql.mjs makes"
  (backfill:49, tag-photos-pick:61, tag-professions-pick:68 — the last reworded to "run-sql.mjs
  and tag-photos-pick.mjs make"), **4** do not. ✓
- `run-sql.mjs:54`'s message has drifted: it alone says "the connection **host** does not carry
  the demo ref **${DEMO_REF}**"; the other six say "the connection does not carry the demo ref".
  ✓ Exactly as claimed.
- `import-album.mjs:74-79` is the argv helper, `:104-107` is `readEnv` → `DIRECT_URL ||
  DATABASE_URL` → `if (!url)` and then straight into the five R2 checks. **No DEMO_REF guard.**
  ✓ The one script that writes photographs into the archive is the one with no destination guard.
- Gate advice is accurate: `scripts/qa/hand-run-passes.test.mjs` greps for
  `const OUT = path\.join\((.*)\);` (:57), `/database:\s*envFile/` (:70), `--apply`/`--undo`/
  `applied-` (:83-85) — none of which move. `scripts/README.md:88` really is `_env.mjs`'s row,
  so the `_cli.mjs` precedent holds.

**Correction — the duplicated-line total is 161, not 171.** Summing jscpd's own line counts for
the twelve clones the finding names (its census numbering 6-14, 16, 18, 19, which maps onto
jscpd.txt in file order):
10 + 11 + 10 + 14 + 14 + 16 + 20 + 11 + 6 (the nine backfill-anchored clones) + 17 + 10 + 22
= **161**. 171 would require also counting clone 17 (tag-photos-apply[219:3-230:38] ↔
tag-professions-apply[235:3-242:38], 12 lines), which is a different block (the apply loop
scaffold) and is NOT part of this finding. The "12 clones" count and the "-60 SLOC net"
projection stand.

## fresh-code-08 — viewer keyboard effect re-subscribes every render — **confirmed-with-correction**

Mechanism confirmed at HEAD:
- `usePinchZoom` ends with a bare object literal, `pinch-zoom.ts:488-506`, containing a nested
  `handlers: { … }` literal. Nothing is memoised at the object level, so the identity changes
  every render.
- `image-viewer.tsx:388` — `}, [open, onClose, step, expanded, zoom]);` — the keydown effect
  takes `zoom` whole. So yes: `window.addEventListener("keydown", …)` is torn down and re-added
  on **every render of the viewer**. Confirmed.
- The proposed fix is viable: the three members read are `zoom.zoomed` (state, `pinch-zoom.ts:134`),
  `zoom.settleToFit` and `zoom.zoomByStep` (both `useCallback`, :274 and :266). `step` is itself
  `useCallback(…, [count])` so it is stable.

**Correction to the frequency claim.** "several times a second while it is open" is not
supported. The 400 ms idle interval does **not** re-render: `image-viewer.tsx:400` sets chrome
through a functional updater (`setChrome((c) => (c === "idle" ? "shown" : c))`) and
`:437` only calls `setChrome("idle")` once, on the transition. The comment at 390-395 says so
explicitly ("the functional updater below bails out when the value has not changed, so a mouse
moving over already-visible chrome costs nothing at all"). Renders come from `chrome`/`expanded`/
`overflows`/`index` and from pinch-zoom's `zoomed` state — i.e. per interaction, not per tick.
The churn is real and worth removing; it is one listener swap per render, not a hundred a second.

## fresh-code-14 — backfill-image-dimensions.mjs — **unverifiable-needs-db** (facts confirmed)

Every structural fact checks out: the file is exactly **128 lines**; its header (lines 10-11)
says "This is the one-off that fills them in"; `scripts/README.md:71` is its ledger row and
calls it "the one-off for everything that predates the table (2026-08-27). Safe to re-run and
safe to interrupt"; `bytesFor` is at `:91-96` and jscpd confirms the clone
`dev/backfill-image-dimensions.mjs [91:1 - 96:2] (6 lines, 81 tokens)` ↔
`dev/tag-photos-pick.mjs [122:1 - 127:2]`, which I read side by side and they are byte-identical
including the two-line docblock. `git log` shows one commit (`a9e0c5c`), i.e. it has never been
touched since it landed.

But **whether its job is done is a live-database question** and cannot be settled here — the
finding says so itself and writes the SELECT. Marking it unverifiable-needs-db.

One counter-argument the fix session should weigh, which the finding does not mention: the same
README ledger keeps `import-places.mjs` explicitly as a one-off — *"Run once; keep for a
rebuild."* So "delete the one-off once it has run" is not this repo's established habit for
scripts that can rebuild a table from scratch. If the count comes back 0, the honest choice is
between deleting it and giving it the `import-places` treatment; that is an owner call, as the
finding already tags it.

## fresh-code-19 — stale comments and unused locals (media half only) — **confirmed**

I verified the sub-claims inside my territory; the collection/create-post-form ones belong to
other clusters.
- `photo-layout.ts:383-391` — the docblock is at 382-391, the sentence "so nothing in the app
  calls this. It exists so the rule can be ASSERTED" is at 386-387, and `drawnSize` is called at
  **`photo-carousel.tsx:236`** (`heights.current = frames.map((f) => drawnSize(f, w).height)`)
  and **`lab/crop/page.tsx:49`**. The comment is false. Confirmed, exact line numbers.
- `photo-layout.ts:93-96` — confirmed verbatim (see collection-15).
- `image.ts:33-49` docblock separated from `MAX_STORED_PIXELS` at :71 by `toDisplayWebp`'s
  docblock (50-62) and body (63-69). Confirmed to the line. Same as media-viewer-05.
- `photo-river.tsx:29-38` — confirmed: two docblocks are stacked, 29-38 describes `warmThumbs`
  ("Decode the first screenful BEFORE the river swaps…") and 39-48 describes `landAt`, which is
  the function that actually follows at 49. `warmThumbs` is at 74 with no docblock.
- `raw/tsc-unused.txt` at HEAD lists exactly the three: `answer-photos.tsx(149,11) 'photo'`,
  `photo-river.tsx(472,18) 'i'`, `post-card.tsx(553,23) 'photo'` (plus
  `merge-cities.ts(22,7) 'CANONICAL_PLACE_ID'`, which is outside this finding). Confirmed.

## landing-mascot-avatars-01 — 51 bird glyphs in 39 non-lab bundles — **confirmed** (best-evidenced finding in the cluster)

I re-measured everything off the build on disk and it is right to the byte:

| claim | finding | my measurement |
|---|---|---|
| chunk holding `Q46.4 26 48.6 18` | `42nji2hh4aeuo.js` | same, sole match |
| chunk raw | 47,415 | **47,415** |
| chunk gzip | 13,610 | 13,627 (`gzip -9`; 17 B apart, different level/impl) |
| chunk brotli | 11,174 | **11,173** |
| glyph code from byte 2,987, raw | 44,428 | **44,428** (`tail -c +2988 \| wc -c`) |
| glyph code gzip | 12,182 | **12,182** |
| routes carrying the chunk | 66 of 100 | **66 of 100** |
| non-lab routes | 39 of 52 | **39 of 52** |

The 13 non-lab routes that do NOT carry it: `/`, `/_not-found`, `/catchups/join`,
`/catchups/join/[token]`, `/forgot-password`, `/guidelines`, `/hoopoe`, `/login`, `/privacy`,
`/reset-password`, `/signup`, `/terms`, `/verify-email`.

Structural claims also confirmed:
- `bird-avatar-v2.tsx:102` `const ARCHES: Arche[] = [`, `:1613` `export const ARCHETYPES = ARCHES;`,
  `:1779` `export function BirdGlyphV2({`, file 1,839 lines. All exact.
- `bird-avatar.tsx`, `bird-avatar-v2.tsx`, `identity-row.tsx` and `app-shell.tsx` all have **no**
  `"use client"`; `sidebar.tsx:1` and `konami-eggs.tsx:1` do. `sidebar.tsx:32` imports
  `IdentityRow`, `:536` renders it; `konami-eggs.tsx:16` imports `BirdAvatar`, `:121` renders
  `<BirdAvatar user={{ id, name: "Flush" }} size={30} />`; `app-shell.tsx:1-2` imports both,
  `:64` renders `<KonamiEggs />`. Every line reference is exact.
- `docs/spec/avatars.md:350` really does say "No external SVG assets … Everything is inline JSX,
  so it tree-shakes and ships in the JS/HTML, with zero extra network requests" and `:356`
  really does estimate "~8-9 KB source". Both are stale against a 51-species array literal.

**Two corrections to the fixer's map, neither touching the numbers:**
1. `letters/letter-images.tsx:12` and `posts/feed-column.tsx:6` are `import type { AvatarUser }`
   — type-only, erased at compile, so they do **not** put the glyph module in any client graph.
   They should not be on a list headed "the other twelve client importers".
2. That list is also incomplete. The real non-lab client-component importers of `BirdAvatar` are
   twelve: create-post-form, comments-section, message-composer, konami-eggs, person-detail,
   image-viewer, letterhead-profile, people-panel, answer-experience, people-picker, answer-card,
   photo-step. Six further non-lab files import it from **server** components (conversation,
   presence, profile-card, question-row, your-catchups-card, masthead, plus three page files and
   guide/trust-section), which is exactly the finding's own point — those cost nothing.

The step-1 saving ("44 KB off at least 7 routes") remains a **prediction that only a rebuild can
settle**, which the finding says at medium confidence. Everything measured is confirmed.

## landing-mascot-avatars-06 — `ring` does nothing for bird avatars — **confirmed-with-correction**

Mechanism confirmed to the line:
- `bird-avatar.tsx:41` `ring = false,`; `:47` `ring?: boolean;`; `:50`
  `const ringStyle = ring ? { boxShadow: "0 0 0 4px var(--card)" } : undefined;`
- `:58` applies `...ringStyle` on the **photo** branch.
- `:97` `const clipped = BG_MODE === "inset";` and `:104`
  `style={{ width: px, height: px, ...(clipped ? ringStyle : undefined) }}` on the bird branch.
- `your-catchups-card.tsx:76` and `:100` both pass `ring`, inside `-space-x-2` (:74) and
  `-space-x-1.5` (:98) overlap stacks, and the `+N` chip at `:78-85` hand-writes
  `style={{ boxShadow: "0 0 0 4px var(--card)" }}` at `:81` — byte-for-byte the value
  `ringStyle` builds and discards. Every one of these line numbers is exact.

**Correction 1 — `BG_MODE` is at `bird-avatar-v2.tsx:1768`, not 1,766.** The line is
`export const BG_MODE: "none" | "outline" | "inset" = "none";`, so the typing claim (no
narrowing, no fold) is right.

**Correction 2 — there are six lab call sites, not four.** The finding names
`lab/tiles/_specimens.tsx:149`, `lab/feed-canvas/page.tsx:228`,
`lab/profiles/_profile-avatar.tsx:180`, `lab/profiles/_variant-dossier.tsx:262` — all four
correct — but misses `lab/profiles/_variant-editorial.tsx:203` and `:257`, which pass `ring`
directly to `<BirdAvatar>`. Note also that `_profile-avatar.tsx` has a `ring` prop **of its
own** (`:51`, `:57`) which it applies itself at `:167` on its wrapper and *also* forwards at
`:180`; deleting `BirdAvatar.ring` means deciding what happens to that forward. TypeScript will
surface all of this on `npm run check`, so the risk assessment ("low") stands.

## lib-tests-11 — stale test-count sentence — **confirmed**

`CLAUDE.md:133` reads "the unit-test suite (75 files as of 2026-08-25)". `find src scripts e2e
-name '*.test.mjs' | wc -l` → **102**, and `raw/check-baseline.txt` reports
"ok Unit tests 102/102 passing". Confirmed.

## lib-tests-12 — five slowest tests — **confirmed** (media half re-derived)

Timings match `raw/test-timings.txt` line for line: 1592.6 / 1123.9 / 1064.0 / 220.5 / 218.1 ms,
against a stated total of "top-level entries: 1004; sum 8304 ms". Their sum is 4,219.1 ms =
**50.8 %**, so "4,219 ms … 51%" is right.

Source claims verified:
- `avatar.test.mjs` is indeed not `node:test` — line 2: "run: `node src/lib/avatar.test.mjs`",
  lines 4-5: "The one file in the suite that is not written against `node:test`". The
  `for (let i = 0; i < 200000; i++)` is at **line 153**, under the comment at 149-150 ("the
  assertion that would catch someone 'helpfully' raising BIRD_SPECIES_COUNT"), inside the cited
  151-163 block. `const N = 16000;` is at **line 68** with its loop at 74-80 ✓. The 2,000-seed
  mirror comparison is at **line 118**, inside the cited 116-127 ✓.
- The statistics are right: (50/51)^5000 = e^(-5000 · 0.019803) ≈ 1e-43, so 200,000 is ~40× past
  certainty and the proposed 20,000 is still ~4×.
- `image-purge-rule.test.mjs`: `sources()` at **191** with its `files.length > 300` guard at 194,
  and the C-069 test at **199-214** calling `sources()` then `decomment(src)` per file. The
  `includes("delImage(")` pre-filter is sound — the regex it feeds is
  `/(?<![A-Za-z])delImage\(/`, so a plain substring pre-filter cannot drop a true positive.
- `identity-row-overflow-rule.test.mjs`: the test is at **44-59** (finding says 45-60, off by
  one), it walks all of `src` and decomments every file, and lives at `src/lib/`, not
  `src/components/`.

## media-viewer-05 — `toDisplayWebp` / `MAX_STORED_PIXELS` — **confirmed**

Read `image.ts` top-down: `/**` at **33** opens "The most pixels this app will STORE in a
re-encoded image", closes ` */` at **49**; `toDisplayWebp`'s docblock opens at **50** ("The
display copy of an uploaded photograph: uprighted, boxed to 1920, WebP at 80") and its body runs
**63-69**; `export const MAX_STORED_PIXELS = 40_000_000;` is at **71**. Exactly the juxtaposition
described. `git log -1 60e8ee0` → "2026-08-26 refactor(api): one door per kind of route, and a
test that they use it" ✓.

The proposed replacement sentence is factually right: `grep -rn toDisplayWebp src` (excluding
`src/generated`) returns exactly two callers — `src/app/api/upload/route.ts:133` and
`src/app/api/upload/finalize/route.ts:128` — plus the pin at `image-facts.test.mjs:127`
(`/toDisplayWebp\(/`) and the cross-reference at `image-cdn.ts:32`.

`docs/TRAPS.md:161-176` carries the incident, and it names `src/lib/image.ts:63` — which is
`toDisplayWebp`'s signature line at HEAD, so the TRAPS pointer is still accurate today and will
break silently if the fix session moves the function without updating it. **The fix session must
update `docs/TRAPS.md:163`'s line reference in the same commit** — the finding does not say so.

## media-viewer-07 — options nobody passes — **confirmed**

Every prop re-grepped over all of `src` at HEAD:
- `ViewerImage.downloadName` — declared `image-viewer.tsx:114`, read once at `:471`
  (`current.downloadName ?? basename(current.src)`). **Zero call sites anywhere**, lab included.
- `PhotoFrame.eager` — `:85` default, `:121` type, `:123` use. Zero callers. The other `eager`
  hits are `bird-avatar.tsx:84` (`loading="eager"`), `hoopoe-warmup.tsx:23` (prose) and
  `lab/profiles/_profile-avatar.tsx:58` (prose). Confirmed.
- `PhotoRows.gap` — `:83` default, `:90-91` type. The only `gap={…}` in the app is
  `photo-wall.tsx:49` on **`PhotoStream`** (`gap={16}`), plus two `Stagger gap=` in lab. Confirmed.
- `PhotoRows.keyOf` — `:86`, `:95-97`. Every `keyOf=` caller (collection-client:1252,
  photo-river:471, photo-wall:49) is on `PhotoStream`. Confirmed.
- `PhotoStream.targetHeight` — `:161`, `:170-171`; `PhotoStream.maxScale` — `:162`, `:172-179`.
  Neither ever passed. Confirmed.
- `CarouselArrow.size` — `:58` default `16`, `:70` type. Three call sites
  (contribute-stage:328, :341, photo-carousel:362); none passes `size`. Confirmed.
- `AttachImageWell` — exported at `:102`, used only at `:231` inside the same file, and
  `className` (`:106`, `:116`) is never passed there or anywhere. Confirmed.
- `PhotoFrame.alt` — `:82` `alt = ""`, `:109` type. No caller in `letter-images`, `post-card`,
  `photo-rows`, `photo-carousel` or `answer-photos` passes it, so every photograph really does
  render `alt=""`. Confirmed; whether the caption is the right alt text is the design call the
  finding already flags as medium confidence.
- Gate note is right: `attach-well.test.mjs:32` pins `/export function wellClass/`, not
  `AttachImageWell`, and `:43-47` counts `border-dashed` occurrences. Dropping the export on
  `AttachImageWell` keeps both green.

## media-viewer-09 — the chrome-idle mechanism — **confirmed-with-correction** (one sub-claim refuted)

Diagnosis and every location confirmed at HEAD:
- tri-state comment 227-232 with `useState<"shown" | "idle" | "off">` at 233; `lastNudge` ref at
  **244**; `onTapPhoto` toggle at **279-282**; nudge listeners **396-416**; the 400 ms interval
  **418-440** with the focus check (423-425), the `matchMedia("(hover: hover)")` gate (421) and
  the `[data-viewer-chrome]:hover` poll (436); `data-viewer-chrome` attributes at 625, 639, 651,
  695 (a fifth textual occurrence is the querySelector at 436, which is how the test's `>= 5`
  count is met); `data-viewer-scroll` at 742; scroll lock **321-342**. File is **804** lines.
- Part (a) — the page-behind fix as root cause — is right: `:324` `const root =
  document.documentElement;`, `:326` `root.style.overflow = "hidden"`, and
  `image-viewer-chrome.test.mjs` pins it four ways including `!/document\.body\.style\.overflow/`
  and a check that `globals.css` still has `overflow-x: clip`.
- Part (b) — accretion — is a fair reading; the mechanism really is one state, one ref, two
  effects, an interval, a media query and a `:hover` poll spread over ~60 lines mid-file.
- The gate is right: the test reads `image-viewer.tsx` for `[data-viewer-chrome]:hover`,
  `matchMedia("(hover: hover)")`, `addEventListener("wheel", nudge` and the ABSENCE of
  `addEventListener("pointerdown", nudge`. Extracting the hook breaks all four unless the
  regexes move in the same commit, exactly as the finding says.

**REFUTED sub-claim: `IDLE_MS` did not change in `72b5a1d`, and has never been 2,600.**
`git log --oneline -S"IDLE_MS = " -- src/components/common/image-viewer.tsx` returns a single
commit, `d84b34c` (2026-08-28, "feat(viewer): the photograph takes the screen, and the caption is
not a panel"), and `git log -L150,150` shows that commit introducing `+const IDLE_MS = 3600;`.
`git log -S"2600" -- src/components/common/image-viewer.tsx` returns **nothing**, and `grep -rn
"2600"` over `progress.md`, `docs/spec/` and `src/components/common/` returns nothing. The
`72b5a1d` diff touches `IDLE_MS` only at its single read site (`:437`). So the paragraph
beginning "Separately, `IDLE_MS` moved from 2.6 s to 3.6 s in the same commit" is wrong, and the
instruction "add one line to `IDLE_MS`'s comment saying when and why it became 3.6 s (or put it
back to 2.6 s)" must be dropped from the fix — putting it "back" to 2,600 would be a regression
to a value the file never held. The rest of the finding stands.

## media-viewer-10 — SSR portal guard exists for three lab rooms — **confirmed**

- `image-viewer.tsx:235-237` is the comment ("this component is imported directly by
  /lab/viewer, which renders it on the server"), `:238` the state, `:239` the effect;
  `:467` `}, [open, at, expanded, current?.caption, portal]);` on the `useLayoutEffect` opened at
  463 with its explanatory comment at 459-462; `:528` `if (!portal) return null;`.
- All **five** shipped callers load it lazily with `{ ssr: false }`: `collection-client.tsx:71-73`,
  `letter-images.tsx:19-21`, `post-card.tsx:68-70`, `answer-photos.tsx:37-39`,
  `photo-wall.tsx:30-32`. So on production routes the component genuinely never renders on the
  server. Confirmed.
- The only static importers are the three lab rooms: `lab/viewer/page.tsx:22`,
  `lab/collection/page.tsx:36` (the finding cites `:7`, which is inside the header comment — the
  import is at 36), `lab/collection/swap/page.tsx:57` ✓.

One line-number correction: `lab/collection/page.tsx` imports at **:36**, not `:7`.

## media-viewer-12 — cross-dissolve and arrow-key clones — **confirmed-with-correction**

- Arrow-key clone confirmed by jscpd itself: `dev`-free entry reads
  `components/collection/contribute-stage.tsx [203:63 - 213:11] (11 lines, 57 tokens)` ↔
  `components/common/photo-carousel.tsx [282:51 - 292:11]`. The finding cites photo-carousel
  283-292; jscpd's own range opens at 282. Reading the two: `onKeyDown` opens at
  photo-carousel:283 and contribute-stage:204, and the bodies are identical
  (`ArrowRight → preventDefault + go(at + 1)`, `ArrowLeft → go(at - 1)`).
- Variants clone confirmed by reading: `image-viewer.tsx:173` `const STEP_SECONDS = 0.22;`,
  `:174-184` `FRAME_VARIANTS`; `contribute-stage.tsx:145` `const STEP_SECONDS = 0.22;`,
  `:146-164` `CARD`. Both files carry "motion.tsx has no ease-IN twin to import; if one is ever
  added…" (`image-viewer.tsx:171-172`, `contribute-stage.tsx:159-161`). The argument is written
  out at image-viewer.tsx:152-172 and re-told at contribute-stage.tsx:43-60.

**Correction to "What to do".** The two variant objects are **not** interchangeable, and a single
exported `CROSS_DISSOLVE = { seconds, enter, center, exit }` will not drop in:
1. The variant KEYS differ. The viewer uses `enter/center/exit` (`image-viewer.tsx:585-587`:
   `initial="enter" animate="center" exit="exit"`); the stage uses `enter/here/leave`
   (`contribute-stage.tsx:251-253`). One of the two call sites has to be renamed as part of the fix.
2. The stage's `leave` carries `pointerEvents: "none"` with a nine-line comment
   (`contribute-stage.tsx:156-161`) explaining that without it a fast press on the remove button
   lands on the photograph you just left. The viewer has no such control and no such line. The
   shared export must either carry it (harmless in the viewer, but then the comment has to move
   and generalise) or the stage must spread-and-extend.
So: real clone, real saving, but budget for a rename plus a spread rather than two clean imports.

## media-viewer-13 — small hygiene and three stale comments — **confirmed**

- `basename` at `:196-203`: `try { const clean = src.split("?")[0]; return clean.slice(...) ||
  "photo"; } catch { return "photo"; }`. With `src: string` neither `.split` nor `.slice` can
  throw — LLM-bloat signature 3. Confirmed.
- `hasMore = overflows` at `:503` under a nine-line comment (495-503) that is about the CAPTION
  and carries the owner quote. Confirmed; the alias adds nothing.
- The two arrow class strings are at `:627` and `:641` and differ in exactly one token
  (`left-4` / `right-4`); `ICON_BUTTON` at `:193` is the house pattern for hoisting. Confirmed.
  The test's `data-viewer-chrome` count (≥ 5) is unaffected: the attributes are at 625/639/651/695
  and the fifth textual hit is the querySelector at 436, none of which move.
- `letter-images.tsx:14-17`: "The viewer opens on a press and is 444 lines carrying the app's only
  drag gesture". At HEAD the viewer is **804** lines, and the gesture is in `pinch-zoom.ts` —
  which `pinch-zoom.test.mjs:30-39` pins ("Motion's one-finger drag never comes back",
  `!/\bdrag=|dragConstraints|dragElastic|onDragEnd/`). Confirmed stale on both halves.
- `avatar-crop-dialog.tsx:296-297`: "Drag precedent: image-viewer.tsx (dragElastic 0.14, the
  house rubber-band)". `grep dragElastic src/components/common/image-viewer.tsx` → nothing; the
  only surviving `dragElastic` mention is prose in `pinch-zoom.ts:80`. Confirmed stale.
- `attach-image-dialog.tsx:4-8` lists "the Collection" among the surfaces, while `:22-29` says
  in capitals that the Collection's contribute room does NOT embed the well and that "this
  comment used to claim it did; it never had". Confirmed — the header contradicts its own
  correction eighteen lines later.

## media-viewer-14 — `headObjectSize`'s redundant dynamic import — **confirmed**

`src/lib/storage.ts:9` is `import { writeFile, mkdir, unlink, readFile } from "fs/promises";`.
`export async function headObjectSize` is at `:199`, and `:201` is
`const { stat } = await import("fs/promises");` inside the `if (!useR2)` branch. Nothing else in
the file uses `stat`. The proposed rewrite is correct and the gate note is right —
`security-regressions.test.mjs` and `purge-rule.test.mjs` read this file for `keyForUrl` /
`KNOWN_ROOTS`, not for this function.

## media-viewer-15 — constants declared twice — **confirmed-with-correction**

- `WEBP_QUALITY = 0.82` at `avatar-crop-dialog.tsx:56` (with the comment at `:54-55` "Same
  quality the pre-upload downscaler uses (src/lib/image-downscale.ts)") and at
  `image-downscale.ts:25`. Both used once each (`:243` and `:68`). Confirmed.
- `clamp` at `pinch-zoom.ts:64`, `avatar-crop-dialog.tsx:82`, `photo-layout.ts:203`. Confirmed —
  and note `photo-layout.ts:203`'s is written the other way round
  (`Math.min(hi, Math.max(lo, v))` vs the others' `Math.max(lo, Math.min(hi, v))`), same result.
- "three more in the mascot files" is **four**: `mascot/hoopoe-kit.ts:285` (this one is
  `export`ed), `mascot/hoopoe-playground.tsx:90`, `mascot/mascot-flight-layer.tsx:70`, and
  `lab/_hoopoe.tsx:26`. Plus `lab/profiles/_chain-route.tsx:319` `clampToPill`.
- `quantise` at `photo-aim.tsx:63` is a clamp with rounding ✓.
- "`motion-utils` also exports `clamp`" is true of the **npm package** `motion-utils` in
  `node_modules` (a Motion internal); nothing in `src` imports it, and there is no
  `src/lib/motion-utils.ts`. Worth stating plainly so a fix session does not go looking for a
  local module that does not exist.

**Caveat on the proposed fix.** "the constant is a number, so it costs no bundle" is an
assumption about tree-shaking, not a measurement. `image-downscale.ts` is 135 lines, and
`settings/avatar-upload.ts:103` deliberately reaches it through `await
import("@/lib/image-downscale")` — i.e. somebody chose to defer that module. A new *static*
import from `avatar-crop-dialog.tsx` is only free if the bundler drops the rest; the module has
no top-level side effects so it very likely will, but the finding's own advice ("do it only
alongside 07 or 13") should be extended to "and diff `route-bundle-stats.json` if you do".

---

## Cross-finding overlaps

- **media-viewer-05 ↔ fresh-code-19 (image.ts bullet)** — the same defect, seen twice. They
  agree. **media-viewer-05's steps are the safer ones**: fresh-code-19 says only "Move
  `toDisplayWebp` above it", which fixes the adjacency but leaves the function undocumented as
  the feed's; media-viewer-05 adds the naming sentence that is the actual guard against the
  third hallucination, and it identifies the duplicate explanation at `image-cdn.ts:32-34`.
  Neither of them notices that `docs/TRAPS.md:163` hard-codes `src/lib/image.ts:63` — whichever
  is executed must update that line number.
- **collection-15 ↔ fresh-code-19 (photo-layout.ts:93-96)** — same paragraph, same verdict.
  Merge; collection-15 has the fuller list.
- **fresh-code-14 ↔ duplication-01** — both want `bytesFor` in a shared `_cli.mjs`/`_env.mjs`.
  They do not conflict, but the ORDER matters: if fresh-code-14's SELECT comes back 0 and the
  script is deleted, duplication-01's clone 14 disappears with it and its "12 clones / 161 lines"
  drops to 11 clones / 155 lines. Run fresh-code-14's SELECT first.
- **media-viewer-09 ↔ media-viewer-10 ↔ media-viewer-13** all edit `image-viewer.tsx` and all
  interact with `image-viewer-chrome.test.mjs`. Doing 13 (pure hygiene, no pinned string moves)
  first, then 10, then 09 (which must carry the test's regexes to a new file) is the ordering
  with the fewest test rewrites.
- **landing-mascot-avatars-01 ↔ -06** touch the same two files. -06 is a prerequisite in spirit:
  deleting a dead prop before rewiring the avatar's delivery keeps the -01 diff honest.
