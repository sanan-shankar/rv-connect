# misc-a — adversarial verification (refactor audit 2)

Cluster: findings whose evidence names no single file — repo-wide counts, cross-cutting
patterns, build-output claims. Charter: recompute every number.

HEAD checked: `72b5a1d` lineage; working tree has one uncommitted file from another session
(`src/components/common/image-viewer.tsx`), which touches none of these findings.
Everything below was recomputed from the tree, the lockfile, `node_modules/`, the read-only
production build at `.scratch/audit2-build/.next/`, its analyzer dump at
`.next/diagnostics/analyze/data/` and the raw tool output in `work/raw/`.
No builds, no browser, no database, no writes outside this file.

Verdict tally: 6 confirmed, 7 confirmed-with-correction, 0 refuted.
Nothing in this cluster is fabricated. The corrections are all of one kind: a headline
number that is a different number than the one the evidence actually supports.

---

## bundle-build-04 — duplicate modules across chunks — **confirmed-with-correction**

**What holds.**
- `experimental.turbopackChunking` is genuinely not set. `next.config.ts:229-230` has only
  `optimizePackageImports: ["@phosphor-icons/react", "motion"]`.
- The flagship pair is real and is the strongest single fact in the finding:
  `static/chunks/0o8o--shg75rg.js` (34,665 B) and `3310zq7p7go82.js` (34,758 B), token
  Jaccard **1.0000** (676 identifiers each, 676 shared). `0o8o--shg75rg.js` is in the
  first-load set of **45 non-lab routes** (64 including lab) — exactly as claimed. Recomputed
  from `raw/route-bundle-stats.json`.
- The per-route duplicated-module list is exact. On /login, counting client chunk parts from
  the analyzer: `ui/button.tsx` ×3, `floating-ui.utils.dom.mjs` ×3, `sequence/create.mjs` ×3,
  `next/app-dir/link.js` ×2. 121 modules appear three or more times.

**Corrections.**
1. The title says "23 **byte-identical** production chunk pairs". No pair is byte-identical:
   `md5 -q static/chunks/*.js | sort | uniq -d` over all 224 chunks returns **zero**
   duplicates. The body's own phrasing ("near-duplicate … Jaccard >= 0.96") is the correct
   one; the title should be reworded before a fix session quotes it.
2. Re-running the pair scan (size within 2 %, token Jaccard ≥ 0.96) I get **20–22 pairs and
   254–285 KB** depending on the minimum token length (minLen 2–3 → 20 pairs / 253.6 KB;
   minLen 1 or 4 → 22 / 285.2 KB). The claimed 23 / 305 KB is a little high; the order of
   magnitude is right.
3. The per-route "repeated module bytes" figures do not reproduce except for /privacy.
   Summing, per route, the largest copy of every module that lands in more than one client
   chunk:

   | route | finding | recomputed (one copy each) | recomputed (redundant copies only) |
   |---|---|---|---|
   | /privacy | 68.1 | **68.4** | 67.9 |
   | /login | 99.2 | **73.9** | 132.7 |
   | / , /about, /welcome, /catchups/[catchupId] | 98.6 | **73.3** | 132.1 |
   | /directory | 99.5 | **74.2** | 133.0 |
   | /feed | 136.8 | **110.0** | 170.1 |
   | /collection | 137.3 | **103.8** | 170.8 |

   So the finding overstates the "one copy each" reading by ~25 KB on every route but
   /privacy — and *understates* the "how many bytes are downloaded twice" reading, which is
   the one that matters for the navigation argument (132–171 KB, not 99–137). The direction
   of the finding survives either way; the numbers should be restated with the definition
   attached.
4. `motion-dom` JSAnimation / spring / AsyncMotionValueAnimation are ×3 on /login, not ×2.

**Not re-litigated.** Whether `generateComponentChunks: true` or `requestCost: 100000` pays is
an experiment; the finding already writes it as one with a revert condition. That is the
right shape.

---

## bundle-build-06 — Phosphor ships six weights per glyph — **confirmed-with-correction**

**What holds, and one thing I proved that the finding only inferred.**
- Each `dist/defs/<Icon>.es.js` is a `Map` of all six weights to path data. `Bell.es.js`
  contains `thin, light, regular, bold, fill, duotone`, one each.
- **The unused weights genuinely ship.** I took the `thin` path string out of
  `defs/Tree.es.js` and searched every production chunk: it is present in
  `static/chunks/1pzph7teog9_8.js` — the (main) sidebar chunk that is in the first-load set of
  **39 non-lab routes**. The app never renders `weight="thin"`. This is the proof the finding
  needed and the reason it outranks dependency-diet-13 (below).
- Per-file def sizes are exact: Sparkle 4,734 B, UsersThree 4,601, Tree 4,557, Bird 3,855,
  Images 3,661, Buildings 3,583, Heart 3,428, ShareFat 3,328, Feather 3,321, Bell 3,045.
- The weight census is exact: `weight="bold"` ×9, `"duotone"` ×6, `"regular"` ×5, `"fill"` ×3.
- Analyzer per-route phosphor totals are exact: /feed **25.7 KB**, /profile/[id] **21.8**,
  /catchups/[catchupId] **21.4**, /lab/profiles **20.0**.

**Corrections.**
1. **20 distinct glyphs, not 23.** Extracted from all 17 non-lab import sites: Bell, Bird,
   BookmarkSimple, Buildings, CaretDown, CaretLeft, CaretRight, ChatCircle, Check, Feather,
   Heart, Images, MagnifyingGlass, MusicNotes, ShareFat, SlidersHorizontal, Sparkle, Tree,
   UsersThree, X. Including the lab it is still 20. The "23" is almost certainly the number of
   `weight=` props (9+6+5+3 = 23) mis-carried into the glyph count.
2. **17 non-lab import sites, not 14.** The finding's own grep (`from "@phosphor-icons/react"`)
   misses three `/dist/ssr` importers: `src/app/(main)/support/page.tsx:3`,
   `src/components/feed/rail/letters-module.tsx:6`,
   `src/components/catchups/round/spotify-card.tsx:19`. A fix session that edits "the 14
   imports" will leave three behind.
3. The 57 KB total is right *for the corrected count*: those 20 defs are 58,522 B = **57.2 KB**.
   Pleasingly self-consistent once 23 → 20.
4. The heaviest route is missed: **/collection and /collection/[id] carry 58.5 KB** of phosphor
   module bytes (42 chunk parts), more than twice /feed. `admin/review` is 27.7 KB, not the
   "8.5 on the admin pages" the finding gives.

---

## bundle-build-07 — build time explained — **confirmed-with-correction**

**What holds (all exact).**
- `raw/build.txt`: "Compiled successfully in 20.3s", "Completed runAfterProductionCompile in
  631ms", "Finished TypeScript in 14.6s", "Generating static pages … (105/105) in 682ms",
  wall `42.304 total`.
- `app-path-routes-manifest.json`: **121 entries, 14 API, 48 lab** — all three exact.
- `prerender-manifest.json`: **7** routes — `_global-error` plus six metadata files, exactly
  as described.
- `.next/cache/turbopack` = **617 MB**, written by that build (claim: 618).
- `tsconfig.json:37-45` includes `**/*.ts`, `**/*.tsx`, excludes only `node_modules` ✓.
- Audit 1's warm compile figure is real: `2026-08-25-refactor-audit-1/work/raw/analyze-build.txt:33`
  "✓ Compiled successfully in 4.1s".
- The TypeScript decision is owner-declined, verbatim, at
  `2026-08-25-refactor-audit-1/fix-prompt.md:936`: "duplicate TS check on deploys **stays**
  (so bundle-build-05 is closed as owner-declined, not skipped)".

**Corrections.**
1. "107 pages" is `121 − 14`. Only **101** manifest entries end in `/page`; the rest are
   error boundaries, `not-found` and metadata routes.
2. **The lab-exclusion estimate did not need to be a guess, and it is low.** The orchestrator's
   lab-free build is on disk (`raw/build-nolab.txt` 17:07, `build-nolab-run3.txt` 17:10 — both
   *before* this report was written at 17:38) and it measures the thing directly:

   | phase | with lab | without lab (run 1 / run 3) | measured saving |
   |---|---|---|---|
   | compile | 20.3 s | 13.7 / 13.6 s | **−6.6 s** |
   | TypeScript | 14.6 s | 9.1 / 10.2 s | **−4.4 to −5.5 s** |
   | static gen | 0.682 s (105) | 0.568 / 0.492 s (62) | −0.11 to −0.19 s |
   | wall | 42.30 s | 30.15 / 30.01 s | **−12.2 s** |

   So: compile saving is **6.6 s**, above the finding's "~4-6 s"; static saving is ~0.15 s, below
   its "~0.3 s"; and the total cold saving is **~12.2 s**, above its "~8-11 s". The nolab runs
   started at load 15.44 and 11.61 against the full build's 10.15 (`build-nolab-setup.txt`,
   `build-setup.txt`), so 12.2 s is a floor, not a ceiling. The finding's confidence note ("I
   could not run a build, per the rules, so they are proportional guesses") should be replaced
   by this table. Nothing about the recommendation changes — it is still an owner call and the
   recommendation is still "don't" — but the owner should be shown 12 s, not 8-11 s.

---

## bundle-build-08 — the (main) shell tier — **confirmed** (exactly, to the decimal)

Recomputed from scratch: chunks present on 39–46 of the 52 non-lab routes = **16 chunks**,
**434.4 KB raw / 147.4 KB gz** at gzip level 6. Every per-chunk pair matches the finding:

```
0jlq6l4f8yx9k 59.1/19.4 on 45   42nji2hh4aeuo 46.3/13.5 on 39   30j3xf_e9guai 37.1/11.7 on 39
1pzph7teog9_8 34.3/11.1 on 39   0mmkcfgfeodk3 34.2/12.0 on 44   0o8o--shg75rg 33.9/12.8 on 45
0qa8au6zlhx7_ 28.0/ 7.7 on 46   2ubf39t7y-ouz 24.9/ 9.0 on 39   3lg6rokqb517_ 24.9/ 8.9 on 45
3g_schw6o0b02 23.8/ 8.8 on 39   3hd4ups9q-ds3 23.0/ 8.2 on 39   0xndweaykjp80 22.5/ 7.8 on 44
2_0scenai75_p 22.5/ 9.0 on 39   3-fo1nn435yes 18.6/ 6.7 on 39   2qidg9di5lejj  1.0 on 39
26rz0vjjbjgec  0.4 on 39
```

String spot-checks all land: `42nji2hh4aeuo` contains "bird", `0qa8au6zlhx7_` "hoopoe" ×21,
`1pzph7teog9_8` "Sign out", `2_0scenai75_p` "notification", `3hd4ups9q-ds3` "konami".

The floor claim also holds: 621.1 (common) + 434.4 (shell) = **1,055.5 KB**, and /admin,
/guide and /birds each report **1,064 KB** first-load. This finding is the denominator the
rest of the bundle work should be quoted against, and it is trustworthy as written.

---

## bundle-build-09 — Sentry's `runAfterProductionCompile` — **confirmed**

`node_modules/@sentry/nextjs/build/cjs/config/handleRunAfterProductionCompile.js` runs, in
order, exactly the seven steps described: `core.loadModule("@sentry/bundler-plugin-core")`,
`createSentryBuildPluginManager`, `await …telemetry.emitBundlerPluginExecutionSignal()`,
`await …createRelease()`, `injectDebugIds` guarded by `sourcemaps?.disable !== true` (so
skipped here), `uploadSourcemaps`, `deleteArtifacts`.

Both cited lines in `@sentry/bundler-plugin-core/dist/cjs/index.js` are exact:
`:5127  telemetry: userOptions.telemetry ?? true` and `:5387  if (telemetry === false) return false`.
Because `url === "https://sentry.io"` returns `true` immediately after that check, the signal
really is sent today. `telemetry?: boolean` is a documented `withSentryConfig` option
(`build/types/config/types.d.ts:194`, "Defaults to `true`") and it is forwarded to the plugin
at `getBuildPluginOptions.js:209`. The "will effectively no-op under Turbopack" note in that
types file belongs to `excludeServerRoutes`, not to `telemetry` — I checked, because it would
have killed the finding.

Nit: `sourcemaps: { disable: … }` is `next.config.ts:347`, not `:348`.

---

## catchups-17 — the tile string, the B-042 comment, `roundLabel` — **confirmed-with-correction**

**Exact.** The full class string
`card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]`
occurs **10 times in 10 files**, and every file and line number in the finding is right:
console-collecting:34, console-answering:32, console-published:29, people-panel:79,
archive-shelf:27, extend-deadline-card:96, reminder-pref-control:53, filed-away:76,
fresh-off-the-press:37, answer-card:74.

`grep -rn "audit B-042" src/components/catchups` → **11 hits in 10 files** ✓. The canonical
explanation is in `src/lib/call-action.ts:10-20` and includes both the audit id and the
"pair it with try/finally" rule ✓.

The four `Round {n}` bypasses are all there: archive-shelf:44, console-published:49,
catchup-home-shell:74 (`eyebrow={\`Round ${edition.number}\`}`), answer/page.tsx:272
(`title={\`Round ${edition.number}\`}`), against `roundLabel` at `src/lib/catchups-core.ts:308`.

**Corrections.**
1. Two more bypasses the finding missed, both admin:
   `src/app/(main)/admin/catchups/[catchupId]/page.tsx:185` and
   `src/app/(main)/admin/catchups/(index)/page.tsx:145`. Six sites, not four. (Whether admin
   should import the member-side helper is the fixer's call, but they should see them.)
2. "nowhere else in `src`" is true only of the *full* string. The prefix
   `card-elevated rounded-[var(--radius)] border border-border bg-card` (different or absent
   padding) is spelled in **21 further files** — letters, posts, profile, directory, feed rail,
   collection, and three lab rooms. That matters for the finding's own open question about
   whether this wants to be a `globals.css` utility instead of a catchups-local constant: the
   answer leans "wider than catchups".

---

## dependency-diet-05 — the five overrides — **confirmed**

Resolved every override against `package-lock.json` independently. The finding's table is
correct in every cell:

| override | resolved | parents (declared range) |
|---|---|---|
| `deepmerge-ts` | 8.0.2 (prod) | `@prisma/config` → exact **7.1.5** — the override is load-bearing |
| `mysql2` | 3.24.3 (prod) | `prisma` → exact **3.15.3** — load-bearing |
| `fast-uri` | 3.1.7 (prod) | four nested `ajv` copies, all `^3.0.1` (incl. `@prisma/streams-local/node_modules/ajv`) — floor only |
| `browserslist` | 4.28.8 (prod) | `@babel/helper-compilation-targets ^4.24.0`, `webpack ^4.28.1`, `shadcn ^4.26.2` — floor only |
| `postcss-selector-parser` | 7.1.5 (**dev**) | `shadcn ^7.1.0`, **sole parent** — weakest of the five |

`package.json:25-31` is the right range for the block.

Additions, not corrections: `browserslist` has a **fourth** parent,
`update-browserslist-db` as a peerDependency `>= 4.21.0` — it does not change the "floor only"
verdict. And the gate reference is one line off: the high/critical filter is
`scripts/qa/npm-audit-gate.mjs:65`, `gateVerdict` starts at `:45`. The substance — only
`high`/`critical` are considered, and the run is `npm audit --omit=dev` (`:79`) — is right, so
a **low**-severity dev-only advisory has indeed never touched the gate.

The postcss-selector-parser deletion is contingent on dependency-diet-01 (dropping `shadcn`),
which is not in my cluster. Its exclusive subtree measures 236 packages / 92.5 MB, consistent
with that finding's "234 lockfile entries, 92.3 MB".

---

## dependency-diet-06 — `@sentry/cli`'s approved install script — **confirmed-with-correction**

**Exact.** `package.json:93` is `"@sentry/cli@2.58.6": true` ✓.
`next.config.ts:368` is `release: { create: false, deploy: undefined }` ✓, and the owner quote
is verbatim at `:353-355`: *"don't let sentry send me emails for each commit or deployment… I
don't need an email from them and blow up my inbox."* `@sentry/cli-darwin` is **34.6 MB** and
is the largest package in the subtree ✓. `widenClientFileUpload: false` with the comment "No
browser SDK is initialised (server-only)" ✓ — and the only `Sentry.init` in `src` is
`src/instrumentation.ts:80`.

The truthfulness point — the load-bearing part of this finding — checks out verbatim. `cf6b482`
("chore(deps): the install scripts are answered for before npm asks") justifies the approval
"so a future npm cannot quietly drop prisma generate or **Sentry's source-map upload**", and
that upload is switched off by `sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN }`.

The "0 bytes to the client" claim also survives an independent check: the only production
chunk containing the string "Sentry" is `24740q0lmcv1n.js`, and the hit is posthog's own
`this.SentryIntegration = …` / `sentryIntegration` API.

**Correction.** The subtree is smaller than stated. Computing packages reachable from
`@sentry/nextjs` and from no other root dependency: **99 installed packages / 125.9 MB**
(131 lockfile entries once the 32 uninstalled non-darwin platform binaries are counted), not
137 packages / 147.5 MB. `node_modules/@sentry/` alone is 85.6 MB. Nothing in the finding's
argument depends on the difference.

Fix line for the location: `sourcemaps` is `next.config.ts:347`, not `:348`.

---

## dependency-diet-12 — two browser-automation stacks — **confirmed-with-correction**

**puppeteer is exactly right.** Exclusive subtree: **18 packages / 34.3 MB**, and the
breakdown matches item for item — `chromium-bidi` 14.9, `puppeteer-core` 7.9, a second
`zod` copy 5.0 (at `chromium-bidi/node_modules/zod`), `devtools-protocol` 3.7,
`@puppeteer/browsers` 1.3. **26 script files** reference puppeteer (27 paths including
`scripts/README.md`) ✓. `package.json:87-89` is `"puppeteer": { "skipDownload": true }` ✓ and
`cb3709d` is "chore(qa): stop downloading a Chrome that cannot launch" ✓.

**Two corrections, both on the Playwright half.**
1. **Playwright is 18.1 MB, not 31.2 MB.** Its exclusive subtree is 3 packages:
   `playwright-core` 13.1 + `playwright` 5.0 + `@playwright/test` 0.1 = **18.1 MB**. The
   finding's own sentence — "`@playwright/test` is 3 packages / 18.1 MB **on top of**
   `playwright-core` 13.1 MB" — adds `playwright-core` twice, and the title's 31.2 MB is that
   double count. The real comparison for the owner is 34.3 (puppeteer) vs 18.1 (Playwright),
   which strengthens rather than weakens the "consolidate on Playwright" direction.
2. **9 files import `@playwright/test`, not 5**: `auth.setup.ts`, `playwright.config.ts`,
   `visual.spec.ts`, `sidebar.spec.ts`, `deeplink.spec.ts`, `loading-fallbacks.spec.ts`,
   `collection-journeys.spec.ts`, `collection-permalink.spec.ts`, `collection-seek.spec.ts`.

The deferral itself (T4, owner, "not now") is not disturbed by either correction.

---

## dependency-diet-13 — `@phosphor-icons/react` at 56.7 MB — **confirmed-with-correction**

**Exact.** `du -sk` gives **56.7 MB**. **17 non-lab import sites + 4 lab** ✓ (this is the
correct count; bundle-build-06's 14 is the wrong one). The 20 glyph names listed in the
finding match my extraction one for one, including the `MagnifyingGlassIcon` / `XIcon`
aliases.

**Two corrections.**
1. **The ranking sentence is self-contradictory.** At 56.7 MB it is the **second-largest single
   npm package** in the tree after `next` (198.5 MB) — `posthog-js` (45.7) and `lucide-react`
   (45.1) are both *smaller* than it, so it cannot be "fourth-largest after" them. Only the
   `@prisma` (171.3), `@sentry` (85.6) and `@next` (85.1) **scopes** — several packages each —
   outweigh it.
2. **"its client cost is already near-optimal" is wrong.** Per-icon tree-shaking does work
   (one analyzer module per icon, confirmed), but every def carries all six weights and they
   ship: I found `Tree`'s unused `thin` path string sitting in `static/chunks/1pzph7teog9_8.js`,
   the shell chunk on 39 non-lab routes. **Where this finding and bundle-build-06 disagree,
   bundle-build-06 is right.** dependency-diet-13's own step (vendor 20 glyph files, drop the
   package) is install-weight only; bundle-build-06's step (a local `phosphor-glyphs.tsx`
   carrying only the used weight, package kept for the lab) is the safer and strictly more
   valuable one, because it is the only one of the two that removes client bytes. A fix session
   should treat bundle-build-06 as the parent item and this one as its install-weight footnote.

---

## dependency-diet-14 — the floor of the vendor tier — **confirmed**

Recomputed independently. The chunks common to all **52** non-lab routes number **14** and
total **621.1 KB raw / 192.5 KB gz**. Composition matches: `react-dom` 223.7 (70.0 gz), the
Next runtime 125.9 (33.9), motion `3-zzbce_v74kh.js` **49.1 / 16.9**, sonner
`1454vpw-cvghc.js` **36.0 / 10.1**, plus nine app chunks and the turbopack runtime. Both the
sonner and motion chunks are in the first-load set of all 52. `sonner` has **57** import sites
in `src` (55 non-lab). Non-lab median first load **1,068.9 KB**.

Every number is within rounding of the finding. Recording a floor is a legitimate finding and
this one is measured, not asserted.

---

## duplication-09 — within-file micro-clones in shipped code — **confirmed**

Every jscpd id resolves to the claimed place (ids counted against `raw/jscpd.txt`, 232 clones
total, matching the brief):

| id | location |
|---|---|
| 78 | `collection/actions.ts [1204-1212]` = `[1304-1312]` |
| 85 | `messages/actions.ts [88-95]` = `[147-155]` |
| 86 | `messages/actions.ts [153-163]` = `[225-233]` |
| 212 | `year-rail.tsx [228-235]` = `[253-260]` |
| 214 | `range-facet-pill.tsx [88-98]` = `[103-113]` |
| 231 | `lib/catchups.ts [173-178]` = `[200-205]` |

9+8+11+8+11+6 = **53 lines**, exactly the finding's "~53". Both jscpd-blind twins verified by
hand: the `baseUpdatedAt` guard is `feed/actions.ts:651-654` and `catchups/actions.ts:1307-1310`
with the identical sentence "That save could not be checked. Reload and try again."; and
"This is the only admin. Make somebody else one first." is at `admin-actions.ts:92` and
`lib/admin.ts:160`.

Copy census is exact: "That photo is no longer here." ×4 (`collection/actions.ts:1031, 1051,
1149, 1337`); "This Round already moved on." ×4 in `catchups/actions.ts`; "We couldn't find
that conversation" ×3; "Not signed in" ×2 (`messages/actions.ts:90, 150`) against "Not
authenticated" ×60 — so "take the majority" is well founded.

Item 4's CAS is three copies, not two: `lib/catchups.ts:173-177` (extend), `:183-187`
(extend-questions), `:200-204` (reminder), differing only in `status:` and the notify call.

Two notes for the fixer, neither a correction to substance:
- `year-rail.tsx`'s two `rows.push({…})` blocks are at **230-238** and **254-262**, a line or
  two off the finding's 228-238 / 253-263. They differ only in `group: -1` vs `group: g` and
  `head: true` vs `false`, so the proposed `rowFor(y, group, head)` is right.
- The finding asks the fixer to "confirm `catchup-lifecycle.test.mjs` does not pin the inline
  `updateMany`". **It does not** — that file reads `src/app/(main)/catchups/actions.ts`
  (`:140`, `:230`), never `src/lib/catchups.ts`. Item 4 is clear. Item 6 is adjacent to a pin
  worth naming: `catchup-lifecycle.test.mjs:148` requires `updateMany({ where: {… updatedAt:
  base …}` to survive inside `submitEntry`, so a `parseBaseVersion` helper must keep a local
  binding named `base`.

---

## duplication-10 — within-file micro-clones in scripts — **confirmed**

Clone ids resolve exactly: 27 → `qa/drive.mjs [107-118]` = `[243-252]` (12 lines);
40 → `qa/protocol-audit.mjs [151-156]` = `[227-232]` (6); 41 → `[151-156]` = `[271-276]` (6);
45 → `qa/tour-mobile-verify.mjs [197-204]` = `[214-221]` (8). 12+6+6+8 = **32 lines**, exactly
as claimed.

The three protocol-audit sweeps at 150-159, 226-236 and 270-280 really are the same five
moves — `if (ALLOW.has(f)) continue; readSource; split; codeLines().forEach; regex; push` —
with only the allowlist, the regex and the message differing, so `sweep({ allow, test,
message })` is the correct shape. The safety proof the finding names (protocol-audit's
violation count identical before and after) is the right one, because the differing
combined loop at :193-220 and middle-dot loop at :241-262 must be left alone.

`tour-mobile-verify.test.mjs` pins four things — `requireLoopbackBaseUrl(process.argv[2]`,
`assertSameOriginAfterNavigation(baseUrl, page.url())`, `await fetch(\`${baseUrl}/api/dev-login\``,
and `doesNotMatch(/page\.evaluate\(async \(email\)/)` — none of which touches lines 197-203 or
214-220. The finding's parenthetical is correct.

---

## Cross-finding overlaps

- **bundle-build-06 vs dependency-diet-13** (Phosphor) agree that the package is 56.7 MB and
  that per-icon tree-shaking works. They disagree on whether the client cost is optimal.
  bundle-build-06 is right and I proved it (unused `thin` weight in a 39-route chunk).
  bundle-build-06's steps are the safer and the more valuable ones; dependency-diet-13 should
  be demoted to its install-weight footnote. They also disagree on counts: 17 non-lab import
  sites (dependency-diet-13, correct) and 20 glyphs (dependency-diet-13, correct) versus
  14 / 23 (bundle-build-06, both wrong).
- **bundle-build-04 and bundle-build-08** are consistent with each other: the 434.4 KB shell
  and the 621.1 KB common tier are disjoint chunk sets, and `0o8o--shg75rg.js` appears in both
  findings with the same size and the same 45-route count.
- **bundle-build-07 and dependency-diet-14** both quote the 52 non-lab / 100 total route split;
  both check out.
- **bundle-build-09 and dependency-diet-06** both concern Sentry and do not collide:
  09 proposes `telemetry: false` in the build options, 06 discusses the `allowScripts` entry.
  Both can land in one commit; neither touches `src/instrumentation.ts`.
