# lab - adversarial verification notes (refactor audit 2)

Verifier: cluster `lab`. Charter: `src/app/lab` and `public/lab`; `check.mjs` fails on an
unregistered room, so a delete must take its registry line with it.

Tree state when I verified: HEAD `74cc61a` ("fix(retention): notifications are kept 30 days,
everywhere") — **the find phase measured `72b5a1d`, so HEAD has moved two commits**. Nothing in
that delta touches `src/app/lab`, `public/lab`, `package.json` or the font files (checked:
`git log --oneline 72b5a1d..HEAD -- src/app/lab public/lab package.json` is empty), so every
line number and byte figure below is valid at HEAD.

Uncommitted work in the tree that is not mine: `docs/audit-fix/README.md`, `progress.md`
(modified), `docs/audit-fix/2026-09-03-refactor-audit-2/` (untracked). No lab file has
uncommitted edits.

Read-only throughout. No build, no tsc, no knip, no browser, no database, no git state change.

---

## Verdict table

| id | verdict | one-line |
|---|---|---|
| dead-code-06 | confirmed-with-correction | every byte and reference count reproduces; c3-thumb's delete is DB-gated by the finding's own SELECT |
| media-viewer-08 | confirmed | 332,668 B exact; narrowest, safest steps of the two overlapping crop findings |
| dependency-diet-02 | confirmed | 4 hits, 7.9 MB, chunk 203,112 B on exactly one route; its byte figure is the accurate one |
| lab-13 | confirmed-with-correction | same fact, two wrong numbers: the saving is 198.3 KB not 105 KB, and the lab has 3 `any` occurrences not 4 |
| lab-01 | confirmed-with-correction | every build/artifact measurement reproduces; the per-route delta paragraph is wrong and must not be cited as the leak proof |
| lab-03 | confirmed-with-correction | eager imports and line counts exact; landings/support-ideas line ranges are off by one |
| lab-04 | confirmed-with-correction | 2.75 MB / 63 woff2 exact, CSS-manifest proof exact; three cite errors |
| lab-06 | confirmed | three wrappers dead; plus a pin the finding missed (`H` at :25 is dead too) |
| lab-08 | confirmed | contradiction is real; I supplied the `du` the finder declined to take |
| lab-09 | confirmed-with-correction | all three drifts real; one registry line number wrong |
| lab-11 | confirmed-with-correction | facts hold; the "dead twin" is live, and the two twins have drifted by 0.01deg |

---

## dead-code-06 — public/: three crop leftovers, one June thumbnail, audit 1's untracked 6 MB

Verified at HEAD:

- `stat -f %z`: `phone-9x16.webp` **141,394**, `pano-21x9.webp` **153,150**,
  `grainy-420.webp` **38,124**, `c3-thumb.webp` **87,682**. All four exact.
  `landing-original.jpeg` is **6,202,334 B** (the finding's "6.0 MB" is the decimal-MB
  rounding; 5.9 MiB).
- `git ls-files public | wc -l` = **58**. Matches the finding's "58 tracked public files".
- `git ls-files` confirms all four are tracked.
- `comm -13 <(git ls-files public|sort) <(find public -type f|sort)` returns **exactly three**
  paths: `public/.DS_Store`, `public/images/.DS_Store`, `public/images/landing-original.jpeg`.
  Audit 1's dead-code-07 is indeed still unexecuted, and its two WhatsApp originals and
  `public/uploads` leftovers are genuinely gone.
- `.DS_Store` is covered by `.gitignore:10` (`git check-ignore -v` confirms), so the finding's
  "no config change needed" is right.
- Reference check: `grep -rn "pano-21x9\|phone-9x16\|grainy-420"` over `src scripts e2e docs
  public .claude next.config.ts` = **0 hits**. `grep -rn "c3-thumb"` over every `.ts/.tsx/.mjs/
  .json/.md` outside `node_modules` and the audit folder = **0 hits**.
- `src/app/lab/crop/_specimens.ts:36-126` names exactly the eleven `shape-*.webp` and nothing
  else. `public/lab/crop/` holds 14 webp. 11 + 3 = 14, so the three are the whole remainder.
- `c3.webp` itself is alive (`src/lib/demo-seed/content.ts:115`,
  `lab/profiles/_variant-letterhead-2.tsx:117`, `_variant-letterhead-3.tsx:135`) — the finding
  is right that the parent survives the `-thumb` dying.

**Corrections (both cosmetic):**
1. The finding says `lab/viewer/page.tsx:81-87` "lists `c1-thumb`, `c4-thumb`, `c2-thumb`". The
   actual arrays at `:79-90` are `THUMBS = [v1-thumb, c1-thumb, v3-thumb]` and
   `POST_THUMBS = [v2-thumb, c4-thumb, c2-thumb]`. Six names, not three; the conclusion
   (no `c3-thumb`) is unaffected.
2. "~421 KB tracked" is 420,350 B across the four files = 410 KiB / 420 kB. Fine either way.

**Sub-claim split.** The three crop files and the three untracked files are settled here and
need nothing further. `c3-thumb.webp` is settled *statically* (0 code references, unreferenced
since `c559d3e`, 2026-06-28) but the finding writes its own DB gate, and I may not run it, so
I have filed that half as `unverifiable-needs-db`. The SELECT the fix session must run, on
**both** databases, is the one in the finding:

```sql
SELECT id, url, "thumbUrl" FROM "Photo"
WHERE "thumbUrl" LIKE '%/images/collection/c3-thumb%'
   OR url LIKE '%/images/collection/c3%';
```

## media-viewer-08 — three orphan crop specimens (overlaps dead-code-06)

Confirmed exactly. 38,124 + 153,150 + 141,394 = **332,668 B**, the finding's figure to the byte.
Both commits check out: `26dc483` added them (2026-08-27), `6fb0780` rewrote the room around
the eleven shapes the next day without `git rm`-ing the old set.

**Overlap ruling (dead-code-06 vs media-viewer-08).** They agree on the facts and neither
contradicts the other. **media-viewer-08's steps are the safer ones to execute**: it is exactly
three `git rm`s with no gate beyond `/lab/crop` still rendering. dead-code-06 bundles the same
three files with `c3-thumb.webp`, which cannot move until somebody runs a SELECT against the
live database, and with three untracked deletions that must be re-checked against
`git status` at fix time under the shared-tree rule. A fix session should take
media-viewer-08's three files first (zero-risk, immediate) and treat dead-code-06 as the
superset that carries the DB-gated remainder.

## dependency-diet-02 and lab-13 — `world-atlas`

Both findings are about the same fact. I verified it once and judged them separately.

Facts, all confirmed at HEAD:
- `grep -rIn "world-atlas" src scripts e2e public next.config.ts package.json` returns exactly
  **four** lines: `src/app/lab/directory/_maps.tsx:28` (the import),
  `src/app/lab/directory/_maps.tsx:798` (prose), `src/components/directory/alumni-map.tsx:85`
  (the comment naming the import it removed), `package.json:64`. Excluding `package.json`,
  three — so dependency-diet-02's "exactly three lines" and lab-13's "four hits" are both
  right, they just counted different sets.
- `package.json:64` is `"world-atlas": "^2.0.2",` and it sits inside the `"dependencies"`
  block (which opens at `:32`), not `devDependencies` (which opens at `:67`).
- `du -sh node_modules/world-atlas` = **7.9M**. Small correction to dependency-diet-02's
  "five TopoJSON files": there are **six** (`countries-10m` 3.66 MB, `countries-50m` 756 KB,
  `countries-110m` 107,761 B, `land-10m` 3.09 MB, `land-50m` 545 KB, `land-110m` 55 KB), plus
  LICENSE/README/package.json. Only `countries-110m` is used, as the finding says.
- `public/geo/countries-110m.json` is **107,761 B**, byte-for-byte the same size as the copy
  inside the package.
- `_maps.tsx:45-48` is verbatim:
  ```
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const land = feature(worldData as any, (worldData as any).objects.countries) as unknown as {
  ```
- `alumni-map.tsx:82-101` is the fetch-not-import comment, and `:104-113` is
  `loadLandPaths(signal)`. The finding quotes it accurately.

**The byte figure — this is where the two findings disagree, and lab-13 is wrong.**
`.scratch/audit2-build/.next/static/chunks/163zhp5dmrn-k.js` is **203,112 B on disk =
198.3 KB raw**, and `gzip -c | wc -c` gives **66,373 B = 64.8 KB gz**. Grepping the chunk shows
it contains exactly one Turbopack module and that module is
`t.exports=JSON.parse('{"type":"Topology","objects":{"countries":…')` — i.e. the whole chunk is
the atlas, escaped into a JS string literal, which is why 107,761 B of JSON becomes 203,112 B
of JavaScript. Walking `route-bundle-stats.json`, that chunk is in the first-load set of
**exactly one route, `/lab/directory`** (988,578 B first load).

So the saving is **198.3 KB raw / ~64.8 KB gz**, not lab-13's "−105 KB", and not
dependency-diet-02's 64.2 KB gz either (it is 64.8; a 1 % gzip-level difference, immaterial).
dependency-diet-02's number is the one to carry into the plan.

**lab-13's second wrong number.** It claims option 1 removes "2 of the lab's 4 `any` sites".
`grep -rno "as any" src/app/lab` returns three hits, one of which
(`groups-rethink/batches-interest/page.tsx:178`, "the same as any other") is English prose.
`grep -rn "no-explicit-any" src/app/lab` returns two disables, both in `_maps.tsx` (`:45` for
the atlas cast, `:87` for `const zb = useRef<any>(null)`). So the lab has **three real `any`
occurrences across two sites, both in `_maps.tsx`**, and the fix removes two of three. Not four.

**Which steps are safer.** dependency-diet-02 offers (a) move the dep to `devDependencies`,
one line, near-zero risk, and (b) repoint the lab room and delete the dep. lab-13 offers the
same (b) plus a worse (2) that imports the public JSON by relative path. Ruling:
**dependency-diet-02's (a) then (b)** is the safest ladder — (a) is a correct standalone change
that cannot break a member surface, and (b) is the same rewrite lab-13 asks for but with the
right byte figure attached. lab-13's option 2 (`import worldData from
"../../../../../public/geo/countries-110m.json"`) should be **rejected outright**: it needs
`resolveJsonModule` across a four-level relative climb out of `src/`, and it keeps the 198 KB
in the chunk while adding a fragile path — it buys only the dependency removal that option (a)
already buys for one line.

One caveat neither finding raises: knip is currently honest about `world-atlas` *because* the
lab import exists. If a session does (a) without (b), the package stays installed and the lab
keeps importing it from `devDependencies` — which is correct on Vercel (devDeps are installed
before `next build`) but means the 198 KB chunk survives. (a) and (b) are complements, not
alternatives.

## lab-01 — the lab's build and artifact cost

I re-measured every number in the table against the two builds on disk. All of them reproduce:

| claim | measured at HEAD | verdict |
|---|---|---|
| Compile 20.3 s vs 13.7 s | `build.txt:14` "Compiled successfully in 20.3s"; `build-nolab.txt:14` 13.7s; `build-nolab-run3.txt:14` 13.6s | exact |
| TypeScript 14.6 s vs 9.1 s | `build.txt:18` / `build-nolab.txt:18` | exact |
| 105 static pages in 682 ms vs 62 in 568/492 ms | `build.txt:24`, `build-nolab.txt:24`, `-run3:24` | exact |
| `.next/server/app` 12 MB (lab 4.0 MB) vs 7.5 MB | `du -sh` | exact |
| `.next/static/chunks` 6.5 MB vs 4.0 MB | `du -sh` | exact |
| `.next/static/media` 3.0 MB/75 files/72 woff2 vs 256 KB/12/9 | `du`, `ls | wc -l`, `ls | grep -c woff2` | exact |
| tsc: 6,320→6,207 files; 230,730→186,367 lines; 275,662→215,785 types; 926,641→787,561 inst.; 9.02→5.00 s | `tsc-diag-full2.txt` / `tsc-diag-nolab2.txt` | exact |
| 48 rooms | `find src/app/lab -name page.tsx | wc -l` = 48 | exact |
| `public/lab` 14 webp, 1.9 MB | `ls`, `du -sh` (only subdir is `crop/`) | exact |
| `/lab` admin-only | `src/app/lab/layout.tsx:15-18` `if (session?.user?.role !== "admin") notFound();` | exact |
| `/lab` no longer public in proxy | `src/proxy.ts:207-210` is the NOTE explaining audit M19; `:32` is `"/lab"` inside `DEMO_CLOSED_PATHS` | exact |

**Correction 1 — the file count.** "112 files". `find src/app/lab -type f | wc -l` = **113**.
The 113th is `src/app/lab/.DS_Store` (gitignored, untracked). cloc counted 112 code files, so
the finding is right about code and wrong about the tree. Minor, but it is a second stray
`.DS_Store` the dead-code lens did not catch because its sweep was scoped to `public/` —
worth folding into dead-code-06's untracked-junk step.

**Correction 2 — the `lab-audit.mjs` cite.** The finding says the filename is hardcoded at
`scripts/qa/lab-audit.mjs:47`. It is at **line 45**: `} else if (entry === "page.tsx") {`
(line 47 is the closing `}`). The instruction itself is right and load-bearing — a
`pageExtensions` rename dies unless this line learns the new name in the same commit.

**Correction 3 — and this is the one that matters.** The finding writes: *"Every non-lab route
moves by −36 to −620 bytes except `/welcome` (−4,044) and `/verify-email` (−23,163); four
routes get bigger by 78 bytes."* I recomputed the full 52-route diff from
`route-bundle-stats.json` against `route-bundle-stats-nolab.json`:

- **14** routes move by more than −620 B, not two: `/verify-email` −23,163, `/welcome` −4,044,
  `/collection` −1,790, `/collection/[id]` −1,790, `/profile/[id]` −1,326,
  `/admin/review` −1,136, `/directory` −1,030, `/letters/[id]` −921, `/feed` −908,
  `/catchups/[catchupId]` −879, `/catchups/round/[editionId]` −698, `/letters/[id]/edit` −695,
  `/letters/new` −695, `/admin/people` −623.
- **three** routes get bigger, not four: `/`, `/reset-password`, `/signup`, each by +78 B.
- 26 routes sit at exactly −620, which is the signature of one shared chunk shrinking.

The finding's *argument* — "if lab were leaking, the deltas would be one-directional and would
cluster on the routes that share components with lab rooms, and they do neither" — **does not
survive the real numbers**. 49 of 52 deltas are negative (that is one-directional), and the
largest of them land on `/collection`, `/profile/[id]`, `/directory`, `/feed`, `/letters` —
precisely the surfaces the lab rooms prototype. So the paragraph proves less than it says.

The conclusion (0 lab JS in member bundles) is still the right one, but it rests on two other
things, and the fix-prompt should cite those instead: (i) audit 1's chunk-by-chunk proof, which
this audit did not re-run; (ii) chunk-count parity — `/verify-email` carries **20 chunks in
both builds** and is still 23 KB smaller, and `/welcome` *gains* a chunk (35→36) while getting
smaller, which is Turbopack module-id renumbering and chunk-boundary reshuffling, not code
removal. If a fix session ever wants this settled rather than argued, the cheap proof is to
diff the *module lists* inside `/feed`'s chunks between the two builds; nobody has done that.

Everything else in lab-01 (the `pageExtensions` mechanism, the Turbopack multi-dot caveat, the
lab-10 constraint that Playwright specs and dev scripts drive lab routes) I checked and it is
sound. `e2e/collection-seek.spec.ts` and `e2e/collection-journeys.spec.ts` both `page.goto
("/lab/collection")`, so any freeze must exempt the main build, as the finding says.

## lab-03 — three concept harnesses import every variant eagerly

Confirmed, with two off-by-one line ranges.

- `profiles/page.tsx:33-41` — nine `import …Variant from "./_variant-…"` lines. **Exact.**
  `CONCEPTS` at `:43-53`. **Exact.**
- `landings/page.tsx` — the five variant imports are at **`:28-32`**, not `:29-33`; `CONCEPTS`
  is `:34-40`.
- `support-ideas/page.tsx` — the four variant imports are at **`:27-30`**, not `:28-31`;
  `CONCEPTS` is `:32-61`.
- Line counts, `wc -l`: `profiles/_variant-*.tsx` = **6,669** (exact);
  the six `_chain-*` treatments (rail 269, route 523, serpentine 489, stave 661, stepped 442,
  zigzag 461) = **2,845** (exact — and correctly excludes `_chain-kit.tsx`'s 368, which the
  harness genuinely needs); `landings/_variant-*.tsx` = **3,668** (exact);
  `support-ideas/_variant-*.tsx` = **611** (exact). This finder counted carefully.
- Bundle table: `/lab/profiles` 1,363 KB / 34 chunks and `/profile/[id]` 1,258 / 37 in
  `route-js.txt`; `/lab/crop` 1,130 / 28; `/lab/landings` 926 / 20; `/lab/support-ideas`
  818 / 19; `/lab` baseline 639 / 15. **Every figure exact.** `/lab/profiles` really is the
  heaviest route in the app.
- "No `next/dynamic` or `import()` anywhere in the lab": `raw/dynamic-imports.txt` has 52 lines
  and `grep -c "app/lab"` = **0**. My own grep found one `import(` under `src/app/lab` —
  `landings/_shared.ts:58`, `keyof typeof import("@/components/landing/shots").SHOTS` — which
  is a type-only import expression and erases at compile time. The claim stands.
- The six `_chain-*` modules are all eagerly imported by
  `profiles/_variant-letterhead-3.tsx:110-115`, so the "second nine-into-one" is real.
- All three harnesses and their variants are `"use client"` (checked `head -1`), so the
  finding's "`ssr: false` is not needed" advice is right.
- The `loading.tsx` quote is accurate (`src/app/lab/loading.tsx:5-9`, "before this boundary
  existed a first click on a heavy room painted NOTHING for seconds and read as 'the lab
  doesn't load' (the owner's 60% complaint)").

## lab-04 — 63 Google font files, 2.75 MB, for two archived rooms

Confirmed, three cite errors.

- `.next/static/media`: full build **3.0 MB, 75 files, 72 woff2**; nolab **256 KB, 12 files,
  9 woff2**. Delta 63 woff2 / 2.75 MB. **Exact.**
- The two extra CSS chunks exist only in the full build and are exactly the claimed sizes:
  `3m6mr8e1jtg_9.css` **23,686 B**, `2n0wc4xou_xzc.css` **5,824 B**.
- The "no member downloads a byte of this" proof holds: `1vjuupxoge4ny.css` is **9,453 B in
  both builds and md5-identical** (`ae5f191a4000cc806bf6e37456ceab29`). That is a stronger
  check than the finding ran (it compared sizes) and it passes.
- knip cite `raw/knip-repo-config.txt:49-58` — **exact**, those are the ten `_fonts.ts` lines.
- Both rooms are `status: "archived"`, last touched by `45531f9` (2026-08-03,
  "feat(a11y): one focus outline, everywhere") — confirmed by `git log -1 --date=short`.
- `src/app/layout.tsx:12-22` loads Libre Baskerville with `weight: ["400","700"]` and
  Source Sans 3 with `weight: ["400","500","600","700"]` and no `style`, so the room's argument
  (that the app opted out of the variable files and ships six statics) is intact and unshipped.
- Nine families, all with `style: ["normal","italic"]`, three with explicit `axes` (fraunces
  `["opsz","SOFT","WONK"]`, newsreader `["opsz"]`, literata `["opsz"]`). **Exact.**

**Corrections:**
1. `/lab/type`'s `status: "archived"` is at **`_registry.ts:260`**, not `:279` (its `href` row
   opens at `:257`). `/lab/craft`'s is at `:197`.
2. The font declarations run **`_fonts.ts:46-117`** (the `next/font/google` import list is
   `:32-42`); the finding's `:36-116` straddles both. `ALL_FONT_VARS` is **`:119-129`**, not
   `:118-128`.
3. "knip lists **nine** of the ten exports in `_fonts.ts` as unused" — knip lists **ten**
   (`libre, sourceSans, fraunces, newsreader, instrument, literata, publicSans, inter, figtree,
   SHIPPED_SET_WIDTH`), which is the same ten the finding then names. The word "nine" is a slip;
   nothing downstream depends on it.

The three options and the recommendation to keep `_fonts.ts`'s trap header even if the room is
frozen are judgement, not fact, and I do not re-litigate them. I agree the header is worth
promoting to `docs/TRAPS.md`.

## lab-06 — three dead wrappers in `hoopoe-marks/_parts.tsx`

Confirmed, and I found one thing the finding missed.

- `_parts.tsx` is 113 lines. `Feather` at **:75-77**, `Eye` at **:83-88**, `Bill` at
  **:90-95**. Imports `eyePrims` `:16`, `featherPrims` `:18`, `billPrims` `:19`,
  `type FeatherOptions` `:21`. **Every cite exact.**
- Exactly two importers repo-wide: `hoopoe-marks/page.tsx:15`
  (`import { Body, Crest, Face, G } from "./_parts";`) and `glass-edges/page.tsx:46`
  (`import { Crest, Face } from "../hoopoe-marks/_parts";`). No third.
- `grep -rn "<Feather\|<Eye\|<Bill" src/app/lab` finds no JSX use of any of the three (the hits
  are `<Eyebrow>` in `groups-rethink`, a different component).
- knip confirms at `raw/knip-repo-config.txt:32-34`.
- The non-consequence is right: `featherPrims`, `eyePrims`, `billPrims` stay alive in
  `src/lib/hoopoe-geometry.ts` because `crestPrims` and `facePrims` call them internally.

**Pin the finding missed.** `raw/knip-repo-config.txt:31` also flags **`H` at
`_parts.tsx:25:10`** — the line is `export { H, G } from "@/lib/hoopoe-geometry";` and `G` is
imported by `hoopoe-marks/page.tsx` while `H` is imported by nobody. The same delete should
narrow that re-export to `export { G } …`, or lab-05's de-export list will still be carrying
`H` afterwards. One extra token, same commit.

## lab-08 — `/lab/crop` calls itself throwaway while `/lab/collection` depends on it

Confirmed, every cite exact, and I took the measurement the finder declined to take.

- `crop/page.tsx:22-24`: *"Throwaway. Delete this room, public/lab/crop/ and its registry row /
  once the rules are settled -- it is on the close-out list in
  docs/planning/collection-rework/handover.md."* **Exact.**
- `crop/_specimens.ts:17-18`: *"Throwaway, with the room. Delete these files, public/lab/crop/
  and the registry row once the layout rules are settled."* (`:19` is the comment close.)
- `_registry.ts:166`: the note ends *"Throwaway: delete it, public/lab/crop/ and this row once
  the rules are settled."* **Exact.**
- `collection/_archive.ts:3`: `import { SPECIMENS } from "../crop/_specimens";` and `:25-27`:
  *"When /lab/crop is retired, its specimens and their eleven webp files / move somewhere
  shared rather than going with it -- spec sec. 12 has / been asking for exactly this fixture
  set since the campaign opened."* **Exact.** The contradiction is real and self-documented.
- Commit counts: `git log --since=2026-08-01 --oneline -- src/app/lab/collection` = **17**;
  `… src/app/lab/collection/swap` = **4**. **Exact.**
- Both Playwright specs really do drive the room: `e2e/collection-seek.spec.ts` calls
  `page.goto("/lab/collection")` eight times; `e2e/collection-journeys.spec.ts:8` says it
  "drives /lab/collection".

**The `du` the finder honestly refused to guess at.** The three orphans are **332,668 B**; the
eleven live `shape-*.webp` are **1,583,430 B** (119,788 + 182,708 + 91,128 + 100,374 + 173,828
+ 104,598 + 185,082 + 178,560 + 181,026 + 185,750 + 80,588). Total `public/lab/crop` =
1,916,098 B, which is the 1.9 MB the finding reports. So step 2 of its plan (delete the three)
is a 325 KiB win and step 1 (move the eleven to a shared fixture folder) moves 1.5 MB without
deleting it.

## lab-09 — the registry describes rooms that no longer exist

All three drifts confirmed; one line number wrong.

1. `_registry.ts:233` — note reads *"76 findings from one read-through across nine surfaces…"*.
   `grep -c 'id: "' src/app/lab/everything/_findings.ts` = **68**. Confirmed.
2. `spine-marker/page.tsx:6-7` — *"Not linked from anywhere (including `_kit.tsx`'s `ROOMS`
   registry) on purpose."* Confirmed, and confirmed triply wrong: `grep -rn "ROOMS" src`
   returns **only this comment**, so the symbol does not exist anywhere in the repo
   (`09f5ebe` = "refactor(lab): delete the kit exports no room imports").
   **Correction:** the spine-marker registry row is at **`_registry.ts:271`**, not `:296`.
3. `_registry.ts:360` — *"Ten identity directions … crest, profile head, face, feather,
   roundel, wing bars, monogram, extreme crop."* The room's `MARKS` array has **seven** keys
   (`fan`, `fan-bled`, `peek`, `rising`, `portrait`, `shoulder`, `onecolour`) and
   `hoopoe-marks/page.tsx:4` opens *"Seven marks built out of the mascot's own parts"*.
   `273c969` ("fix(brand): every mark sits dead centre…") is the most recent rebuild.
   Confirmed. The `href` row is `:356`; `:360` is the note line, as cited.

The gate reasoning is right: `scripts/qa/lab-audit.mjs` reads `href:` values and page files
only, so note prose is free to change without touching `npm run check`.

## lab-11 — two lab rooms load the app's own families under the real family names

The facts hold; the characterisation of one file does not.

- `_fonts.ts:46-56` declares `libre` and `sourceSans` with `style: ["normal","italic"]` and
  **no `preload: false`**, while all seven other families set `preload: false` (`:65`, `:73`,
  `:81`, `:89`, `:98`, `:109`, `:116`). `_italic-fonts.ts:25-35` re-declares the same two
  families and sets `preload: false` on **neither**. The drift the finding describes is real
  and I reproduce it exactly.
- The quoted header at `_italic-fonts.ts:8-13` is **verbatim**.
- `craft/page.tsx:21-25` implements the workaround with
  `[transform:skewX(-11.3deg)]`. Confirmed.

**Corrections:**
1. The finding calls `type/_specimens.tsx:38`'s `Sheared` a *"dead twin"*. It is **not dead** —
   it is used three times inside its own file (`:101`, `:118`, `:144`). knip flags only the
   `export` keyword (`raw/knip-repo-config.txt` lists it as an unused export, which is lab-05's
   de-export bucket). Calling it dead would send a fix session to delete a live component.
2. The two twins have **drifted**: `craft/page.tsx:23` skews `-11.3deg`,
   `type/_specimens.tsx:40` skews `-11.31deg`, and their comments disagree about the same
   arithmetic (`atan(0.2) = 11.3` vs `= 11.31`). Anyone merging them has to pick one, and
   `11.31` is the correct value of `atan(0.2)` in degrees (11.3099°).
3. `_fonts.ts:46-58` should read **`:46-56`** (`:57` is blank, `:58` is the
   `/* --- display candidates --- */` comment).
4. A cost of option B the finding does not mention: `craft/page.tsx:419` and `:425` read
   `var(--sl-true-body)` / `var(--sl-true-head)`, which are `_italic-fonts.ts`'s variable
   names. Importing `libre`/`sourceSans` from `type/_fonts.ts` instead means renaming those two
   CSS custom properties to `--f-libre` / `--f-source` at the same time, or the specimen
   silently falls back to the page face. That makes option B a four-line-site change, not a
   one-import change, and pushes me further toward the finding's own preference (option A).

---

## Things I checked that nobody filed

- `src/app/lab/.DS_Store` exists on disk, gitignored and untracked. dead-code-06's sweep was
  scoped to `public/`, so it is not in anyone's list. Same one-command cleanup.
- Knip's `H` re-export in `_parts.tsx:25` (see lab-06).
- HEAD has moved from `72b5a1d` to `74cc61a` since the find phase.
  `git log 72b5a1d..HEAD -- src/app/lab public/lab package.json` is empty, so nothing in this
  cluster is stale.

## Things this cluster cannot settle without a browser or a database

- The `c3-thumb.webp` deletion (needs the SELECT above, on production and demo).
- lab-03's actual byte saving from `next/dynamic` (needs a build; a build is out of scope for
  the whole audit, and the finding correctly refuses to claim a number).
- Whether Turbopack in Next 16.3.3 honours multi-dot `pageExtensions` (lab-01's mechanism).
  This is a docs/experiment question, not a browser one, and the finding already flags it as
  the thing that kills its option.
