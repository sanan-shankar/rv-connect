# shell-a — adversarial verification notes (refactor audit 2)

Verifier: shell-a. Charter: app shell, common primitives, layout, mascot, landing, onboarding,
guide, support, settings. Tree state at verification: HEAD `72b5a1d`, `git status --short`
clean except the untracked audit folder itself (no peer WIP in any file I touched).

Method: read-only. Source read at HEAD; byte attribution taken from the read-only production
build at `.scratch/audit2-build/.next/` (chunk `stat` sizes, `gzip -c | wc -c`, string greps
into minified chunks) cross-referenced with `raw/route-bundle-stats.json`. No build, no tsc,
no browser, no database.

16 findings checked. Result: 8 confirmed, 8 confirmed-with-correction, 0 refuted.
Nothing in this cluster is fabricated; the corrections are line-number drift, one
component-name mix-up, and three savings numbers that need restating.

---

## dead-code-01 — delete `active-filter-chips.tsx` and `result-count.tsx`  → CONFIRMED

- `wc -l`: 61 + 19 = **80 lines**, exactly as claimed.
- Import-aware grep across `src`, `scripts`, `e2e` for `active-filter-chips|ActiveFilterChips|
  result-count|ResultCount`: four hits total, all inside the kit — the two definitions
  (`active-filter-chips.tsx:19`, `result-count.tsx:2`) and the two "twin" comments
  (`sentence-line.tsx:121`, `filter-sheet.tsx:58`). Zero importers.
- `raw/knip-repo-config.txt` lines 2-3 list both as unused files.
- `PILL_SET` claim holds: `grep -rn PILL_SET src` → 7 hits, of which
  `active-filter-chips.tsx:5,36,39` go with the file; the remaining consumers are
  `pill-shell.tsx:70,132` (the definition and `facetPillClass`) and `sentence-line.tsx:6,46`,
  which stay. The `X` lucide import is `active-filter-chips.tsx:2`.
- Freshness (5c): `git log --follow` → `active-filter-chips.tsx` last touched `b5760cb`
  2026-08-03; `result-count.tsx` untouched since `180968d` 2026-07-18. Not in-progress work.
- Consumers of the rest of the kit still exist (so this is a two-file amputation, not a kit
  retirement): facet-select → admin content-list, admin people-list, directory-client;
  filter-popover / filter-sheet → admin-filter-bar, directory-client; sentence-line → four
  files; range-facet-pill and facet-search-select → directory-client.

## dead-code-03 — delete `SortPill` and `HOUSE_OPTIONS`  → CONFIRMED WITH CORRECTION

Substance holds; two line ranges are wrong and would mislead a fixer.

- `SortPill`: `grep -rn SortPill src scripts e2e` → 4 hits, all in the kit: its docblock and
  definition (`facet-select.tsx:110-146`) plus two comments naming it
  (`pill-shell.tsx:10`, `facet-select.tsx:29`). Zero JSX renders anywhere, lab included.
  knip line 65: `SortPill  function  src/components/common/filters/facet-select.tsx:116:17`.
- **Correction 1**: the finding writes `facet-select.tsx:110-149`. The file is **146 lines
  long**; SortPill's docblock starts at 110 and its closing `}` is at **146**. The range is
  `110-146`, i.e. 37 lines, not 40.
- **Correction 2**: the finding places `FacetOptionsPopup`'s `anyItem?` optionality at
  ":28-31 and :35-37". Actually `:28-31` is the docblock; the optional prop is at **`:35`**
  (destructure) and **`:38`** (type), and the conditional it enables is **`:50-52`**
  (`{anyItem && <FacetOptionRow …/>}`). A fixer following the printed ranges would edit the
  comment and miss the conditional.
- `HOUSE_OPTIONS`: single occurrence in the whole tree, its own definition at
  `directory-facets.ts:14`; `HOUSES` is imported at `:11` and used nowhere else in that file,
  so both lines and the import go together. knip line 71 agrees.
  `git log -S SortPill` → last consumer removed in `8a0ba37` 2026-08-28 (the Collection
  river), exactly as claimed.
- "~43 lines" is fair: 37 (SortPill) + ~4 (anyItem plumbing) + 2 (`HOUSE_OPTIONS` + `HOUSES`).

## directory-profile-06 — filters kit: two dead files, one dead component, stale comments
   → CONFIRMED WITH CORRECTION (and it OVERLAPS dead-code-01 + dead-code-03)

- Same two files and same dead `SortPill` as above, all re-verified. The stale comments check
  out verbatim: `pill-shell.tsx:10` (" * RangeFacetPill, SortPill). Idle sits on…"),
  `filter-sheet.tsx:10-11` ("Same shell for Directory and Collection"), `filter-sheet.tsx:58`
  ("Kept identical to the Clear all in active-filter-chips.tsx, its desktop twin"),
  `sentence-line.tsx:121` ("twins in active-filter-chips.tsx and filter-sheet.tsx").
- "the kit no longer has a Collection consumer" is true: a per-file grep of every kit module's
  importers returns only `src/components/directory/*` and `src/components/admin/*` (plus
  `ui/menu-material.ts` importing `pill-shell`). No `src/components/collection/*` importer.
- **Correction**: the line arithmetic. "~115 lines (61 + 19 + 37 SortPill + …)" — 61+19+37 is
  117, and SortPill is 37 only under the corrected 110-146 range. Call it **~117 lines,
  2 files**, or keep dead-code-01's honest **80 lines / 2 files** for the file deletion alone.
- **Overlap ruling**: dead-code-01 ⊂ directory-profile-06, and dead-code-03 ⊂
  directory-profile-06. All three agree on the facts. **directory-profile-06 is the safer set
  of steps to execute** because it is the only one that also removes the four stale comments
  that name the deleted files, so the fix does not leave dangling cross-references. Do it as
  one commit; do not run all three as three commits.

## directory-profile-05 — `HousePicker` has no shipped caller  → CONFIRMED WITH CORRECTION
   (the finding UNDERSTATES its own payoff)

- `grep -rn HousePicker src scripts e2e` → 8 hits. Exactly one JSX render:
  `src/app/lab/houses/_houses.tsx:59`. The others are the definition
  (`house-picker.tsx:52`), the lab room's prose (`lab/houses/page.tsx:35`,
  `lab/houses/demo/page.tsx:8`), the registry note (`_registry.ts:392` — for the room, not the
  component), and two comments (`use-wide-viewport.ts:19`, `houses-step.tsx:23`).
- The only shipped import from that module is `HouseOptions`
  (`house-chain-editor.tsx:36`). `TRIGGER_CLASS` is used at `:169` and `:200`, both inside
  HousePicker, and defined at `:241-242` (finding said `:237-242`; `237-240` is its comment,
  which does go with it, so the range is defensible).
- **It is genuinely shipped today, not tree-shaken.** `"Pick a house"` occurs in exactly one
  non-lab source file — `house-picker.tsx:56,213` — and that string is present in built
  chunks `3-rm-aar02utb.js` (30,174 B, first load of **/welcome**) and `1cr-203ygb8s-.js`
  (24,216 B, first load of **/profile/[id]**), plus two lazy chunks and two lab chunks.
- **Correction (in the finding's favour)**: it says the picker rides "`/welcome`'s 29 KB
  houses chunk and the profile's editor chunk". It also rides **/profile/[id]'s first load**
  (`1cr-203ygb8s-.js`), not merely a lazy editor chunk. The ~4-5 KB estimate I cannot check
  without a build, but the two-route reach is now proven rather than assumed.
- The proposed move keeps `npm run check`'s lab-registry audit green (no new room, only a new
  private `_house-picker.tsx` inside an existing room).

## directory-profile-03 — /welcome downloads all five wizard steps  → CONFIRMED

- Five static step imports at `onboarding-flow.tsx:43-47` (verified by `grep -n 'from "./steps/'`
  — 43 welcome, 44 register, 45 houses, 46 photo, 47 done). One step rendered at a time at
  `:193-203`. Both ranges exact.
- Sub-imports exact: `register-step.tsx:10` LocationPicker, `:11` TagInput;
  `houses-step.tsx:8` HouseChainEditor; `photo-step.tsx:8-10` AttachImageDialog /
  AvatarCropDialog / useAvatarUpload.
- Byte claims, checked against the build:
  - `/welcome` first load **1,218,963 B = 1,190.4 KB** ✓, and it is the **fourth-heaviest
    shipped route** ✓ (/profile/[id] 1,288,392 → /directory 1,260,200 → /feed 1,253,979 →
    /welcome).
  - `0_mmjokhy1byo.js` **54,378 B (53.1 KB)**, first load of /welcome,
    /admin/people/[id], /lab/location-picker; contains "Search for a city or town" ✓.
  - `3pjjd0j35m8w1.js` **33,671 B (32.9 KB)**, /welcome only; contains "A few details for the
    register", "Which houses were you in", "Add a photo, or keep your bird" ✓.
  - `3-rm-aar02utb.js` **30,174 B (29.5 KB)**, /welcome only ✓.
  - Route-specific total = **118,440 B (115.7 KB)**, so "~115 KB" is right to the kilobyte.
- One caveat for the fixer, which the finding half-anticipates by keeping WelcomeStep static:
  `3pjjd0j35m8w1.js` also carries WelcomeStep's copy ("get your page ready", "old friends can
  find you"). Deferring register/houses/photo therefore **splits** that chunk rather than
  removing it; the honest realised saving is ~53 + ~30 + most of ~33 ≈ **105-113 KB**, not the
  full 115.

## bundle-build-05 — defer the base-ui Combobox behind LocationPicker  → CONFIRMED WITH CORRECTION
   (OVERLAPS directory-profile-03)

- The chunk claim is exact: `0_mmjokhy1byo.js` 54,378 B (53.1 KB) is in the first load of
  **those three routes only** — /welcome, /admin/people/[id], /lab/location-picker.
- `letterhead-profile.tsx:127-128` already does exactly this
  (`const LocationPicker = dynamic(() => import("@/components/common/location-picker")…)`),
  which is why /profile/[id] does not carry that chunk. The idiom exists in-territory ✓.
- Static imports confirmed: `register-step.tsx:10`, `person-detail.tsx:25`,
  `photo-step.tsx:8-9`.
- **Correction**: "126 KB of that is route-specific" is wrong; the measured figure is
  **118,440 B = 115.7 KB** (53.1 + 32.9 + 29.5 + a 217 B stub). Its own component list
  (53.1 + 32.9 + 29.5 = 115.5) contradicts its 126.
- **Overlap ruling**: directory-profile-03 supersedes this. Both want the same three step
  modules deferred; directory-profile-03 does it at the one place that governs all of them
  (`onboarding-flow.tsx`) and keeps the deep-link `ready` latch in view, whereas
  bundle-build-05 proposes per-component `dynamic()` inside each step, which leaves the step
  modules themselves eager. **Execute directory-profile-03 for /welcome; keep only
  bundle-build-05's `/admin/people/[id]` half** (`person-detail.tsx:25` → dynamic), which
  directory-profile-03 does not cover.

## directory-profile-10 — the houses step refetches a column the page already loaded → CONFIRMED

- `welcome/page.tsx:29-48` `select`: id, name, photoUrl, birdOverride, accountType,
  admissionNumber, subjects, workplace, jobTitle, yearJoined, yearLeft, places. **No
  `houses`** ✓. (It is twelve keys, not "eleven fields", if anyone counts.)
- `houses-step.tsx`: state `:53-55`, effect `:60-79` (`}, []);` at 79), skeleton `:122-123`.
  The finding's `:53-79` and `:120-124` are right to within the enclosing JSX lines.
- `getOnboardingHouses` is `actions.ts:165-181` and its **only** caller in the whole tree is
  `houses-step.tsx:66` (`grep -rn getOnboardingHouses src scripts e2e` → 3 hits: definition,
  import, call). Dead once the column is passed down ✓.
- The precedent it cites is real: the profile does `houses: parseHouseYearEntries(user.houses)`
  server-side.
- The re-fetch-after-action reasoning at `welcome/page.tsx:55-66` is present and says exactly
  what the finding says it says, so adding `houses` to the select is safe: the page re-runs
  after `saveOnboardingHouses`, so a Back → Houses shows fresh data.

## directory-profile-11 — onboarding is the third places writer  → CONFIRMED

- `onboarding/actions.ts:78-108` is the hand-rolled `$transaction` (line 78 is
  `await prisma.$transaction(async (tx) => {`, line 108 its `});`), containing `tx.user.update`
  + `tx.userPlace.deleteMany` + `tx.userPlace.createMany` ✓ — and `createMany`, where the
  shared helper uses `create` per row ✓.
- `place-write.ts:7-9` reads verbatim "There are exactly two writers -- a member editing their
  own in /settings, and an admin editing someone's on the person page" ✓. Both halves of the
  sentence are false: there are three writers, and **there is no `/settings` route**
  (`find src/app -type d -name settings` → nothing; `src/app/(main)/` has no settings dir).
- The other two writers delegate: `settings/actions.ts:21,46` and
  `admin/people/actions.ts:18,221` both `await replaceUserPlaces(userId, cleaned)` ✓.
- The pin is `place-input.test.mjs:174-217`; `const delegates = /replaceUserPlaces\(/` is at
  `:197` and `assert.ok(writers.length >= 3)` at `:213`. Delegation counts as a writer, so the
  proposed change keeps the count at 3 and the test green ✓.
- The proposed API (`replaceUserPlaces(userId, cleaned, userData?)`) is the right shape
  **because** it preserves atomicity: naively calling the existing two-arg helper would split
  the user update and the place replacement into two transactions. The finding says so; a
  fixer must not shortcut it.

## directory-profile-18 — `LocationPicker`'s `mode="single"` is lab-only  → CONFIRMED

Every line reference is exact, which is unusual enough to record:
- props union `:62-74`; `initialQuery` `:192`, `lastAppliedRef` `:196`; sync effect `:200-206`
  (`if (props.mode !== "single") return;` at 201); `handlePick`'s single branch `:254-255`;
  `clearSingle` `:288-294`, `showClear` `:295`; clear button `:352-356`. Plus two more the
  finding did not list that also collapse: the placeholder ternary `:348` and the aria-label
  ternary `:350`.
- Call sites, every one enumerated: `grep -rn "mode=\"single\"" src` → **two**, both in
  `src/app/lab/location-picker/page.tsx:41` (and its prose at `:8`). The three shipped callers
  all pass `mode="multi"`: `register-step.tsx:132`, `letterhead-profile.tsx:2019`,
  `person-detail.tsx:604`.
- The header comment it quotes ("Wiring to onboarding / settings / directory happens in a
  later phase") is at `:40-41` exactly.
- Correctly filed **owner**, because removing it deletes a demonstrated capability from a
  registered lab room (`_registry.ts:392` sells the room as "both single and multi mode").

## directory-profile-21 — `onboarding-local.ts` duplicates `one-shot.ts`'s latch → CONFIRMED

- `onboarding-local.ts` is 28 lines; 16 are the header, 2 the import + prefix, and the two
  functions are one line of body each over `safeGet`/`safeSet` ✓.
- `one-shot.ts:27-33` is `hasFired`/`markFired` over the same two helpers with a
  `storageKey()` of `rv:moment:<moment>:<userId>` ✓ (finding said `:26-34`; the two functions
  with their JSDoc are `:26-33`).
- Callers exact: `onboarding-flow.tsx:41,109,116,119,139` and `demo/demo-bar.tsx:35,57` ✓.
  The only other textual hit in the tree is a console line in
  `scripts/qa/tour-mobile-verify.mjs:236`.
- The finding **does** name the behaviour change (the storage key moves, so one class of
  half-onboarded member is re-greeted once) and argues for accepting it. That is the whole
  risk, correctly stated. I agree with accepting it: anyone with an `admissionNumber` is
  bounced at `onboarding-flow.tsx:110-113` before the flag is ever read.
- Layering note for the fixer, not in the finding: this makes `src/lib/onboarding-local.ts`'s
  callers import from `@/components/mascot/moments/one-shot`, i.e. `lib`-shaped persistence
  moves under `components/mascot`. If that direction is unwanted, the alternative is moving
  `one-shot.ts` to `src/lib/`, which is a bigger diff than the 28 lines saved.

## auth-edge-01 — FloatField ships the base-ui Popover stack to every auth page
   → CONFIRMED WITH CORRECTION (the mechanism is proven; the component name is wrong)

**The correction that matters:** `FloatField` has no `hint` prop. `hint` and the `InfoTooltip`
render belong to **`FloatArea`** (the textarea sibling, `float-field.tsx:141-270`);
`FloatField` (`:58-…`) takes `trailing` instead (`:62,73,96,113-114`). The finding's framing —
"consumers of FloatField that never pass `hint`" — is therefore misleading, and its
**alternative** fix ("have `photo-questions.tsx` compose the tooltip through the existing
`trailing` prop") **does not work as written**: `FloatArea` has no `trailing` prop, only
`FloatField` does. The primary fix (a `next/dynamic` InfoTooltip at `:5`) is unaffected,
because the cost is the **module-level import at `float-field.tsx:5`**, which every importer of
either export pays.

Everything else stands, and I could attribute it in the built bytes:
- The InfoTooltip chunk is **`2154mzuydk5m6.js`, 17,014 B (16.6 KB)**. Proof: it is the only
  chunk carrying both `"More info"` (InfoTooltip's default `label`, `info-tooltip.tsx:25`) and
  `"w-72 p-3 text-[14px] … text-balance text-foreground"` (`info-tooltip.tsx:75`) that lands on
  an auth route. Its first-load route list is **exactly** the five routes the finding names:
  `/signup, /login, /reset-password, /, /forgot-password`. Nothing else.
- The causation test the finding proposes actually works, and I ran it against the build:
  `/verify-email` **uses `Button`** (`verify-client.tsx:5,129,149,160`, so it uses
  `@base-ui/react/button`) yet carries **none** of `0jlq6l4f8yx9k` (60,552 B),
  `0mmkcfgfeodk3` (35,021), `0o8o--shg75rg` (34,665), `3lg6rokqb517_` (25,513),
  `0xndweaykjp80` (23,006). So those chunks are **not** dragged in by `Button`; on an auth page
  the only other base-ui consumer is `ui/popover.tsx`, reached solely through
  `float-field.tsx:5`. `/forgot-password` 920,819 B − `/verify-email` 762,499 B and an
  eight-chunk set difference both reproduce exactly.
- **Second correction, on the savings**: the eight-chunk diff the finding leans on includes
  two chunks that are `/forgot-password`-only and have nothing to do with FloatField
  (`2bdwsx32hwep2` 20,758 B, `0dz8uf-s-b0k7` 12,244 B). Net the arithmetic out and the
  Popover-attributable set is 16.6 + 59.1 + 34.2 + 33.9 + 24.9 + 22.5 KB ≈ **up to 191 KB
  raw**, of which 16.6 KB is certain and the rest depends on Turbopack re-splitting base-ui's
  shared internals. The finding's "~100-135 KB" is a reasonable middle, not an over-claim.
- **Third correction, minor**: `trivia-gate.tsx:9` is listed as a FloatField consumer; it
  imports `FIELD_SHELL` (a class string), not `FloatField`. It still pays the module cost, so
  the point survives. `signup-form.tsx`'s existing `trailing` InfoTip is at `:533` and `:567`,
  not `:538,568`.
- Only one caller in the whole tree passes `hint` to a float field: `photo-questions.tsx:171`
  (a `FloatArea`). The five other `hint=` hits are `person-detail.tsx`'s admin `Field`, a
  different component.
- No `*-rule.test.mjs` pins `float-field.tsx`'s imports — I grepped; the claim holds.

## bundle-build-01 — load only `domMax`, not the whole `motion/react` barrel
   → CONFIRMED WITH CORRECTION

Numbers verified byte for byte against the build:
| chunk | raw | gz | finding |
|---|---|---|---|
| `02l-4doqbe4qr.js` | 72,472 (70.8 KB) | 17,381 (17.0 KB) | 70.8 / 17.0 ✓ |
| `0i3ir-6v25wb4.js` | 60,008 (58.6 KB) | 18,550 (18.1 KB) | 58.6 / 18.1 ✓ |
| `3310zq7p7go82.js` | 34,758 (33.9 KB) | 13,191 (12.9 KB) | 33.9 / 12.9 ✓ |

- The barrel-fallout claim is **directly visible in the bytes**: `02l-4doqbe4qr.js` contains
  `LayoutGroup` (14×), `MotionConfig` (13×), `Reorder` (2×), `useInvertedScale` (2×),
  `useVelocity` (2×), `useCycle` (2×) — none of which any non-lab source file imports. The
  non-lab import census over `motion/react` (63 import statements) is `m`, `AnimatePresence`,
  `useMotionValue`, `useTransform`, `useSpring`, `useScroll`, `useReducedMotion`,
  `useAnimationControls`, `animate`, `LazyMotion`, `MotionProps`, `Variants`, `MotionValue`.
  No Reorder, no LayoutGroup, no MotionConfig, no view transitions.
- **Correction 1**: `<MotionFeatures>` is mounted at **`src/app/layout.tsx:94`** (closing at
  `:109`), not `:99`. `motion-features.tsx:31` (`const loadDomMax = …`) is exact.
- **Correction 2**: "all referenced by all 100 routes and **none in any shipped route's first
  load**" is not quite true. `02l-4doqbe4qr` is in 0 routes' first load ✓, but
  `0i3ir-6v25wb4` is in the first load of **15 routes** (all `/lab/*`) and `3310zq7p7go82` is
  in the first load of **/verify-email**, a shipped auth route. The headline — that the 70.8 KB
  of dead barrel is post-hydration weight on every page — survives intact.
- The one thing I cannot settle read-only is whether Turbopack will actually tree-shake
  `import { domMax } from "motion/react"` in a dedicated module. The finding says so and
  frames a failed attempt as a no-op revert, which is the right posture.
- Related: `dependency-diet-15` (below) is the comment eight lines above the line this finding
  changes; ship them together.

## bundle-build-03 — defer the guide's chapters and overlay  → CONFIRMED WITH CORRECTION

- The chunk is **`3hd4ups9q-ds3.js`, 23,588 B raw / 8,381 B gz**, found by grepping the build
  for `FeedChapter`'s lede ("Where the everyday things go"). It is in the first load of
  **exactly 39 routes, every one of them non-lab** — /feed, /directory, /profile/[id],
  /collection, /letters, /catchups, /messages, /support, /about, /birds, /guide, all of
  /admin, etc. The finding's "23.1 KB on 39 routes" is exact.
- It also contains `Konami` and `install` markers, confirming the demo-bar / konami /
  install-prompt remainder the finding says stays behind.
- **Correction 1**: `<GuideLayer />` is mounted at **`src/app/(main)/layout.tsx:153`**
  (imported at `:16`), not `:167`. `:167` is a `currentTarget()` comment.
- **Correction 2**: the two static imports are at **`guide-layer.tsx:16`** (`CHAPTERS`) and
  **`:17`** (`GuideOverlay`), not `:15-16`.
- `src/components/guide/chapters/index.tsx` is confirmed as the repo's one internal barrel,
  six chapter components, and its own header says it is kept separate from `guide-areas.ts`
  precisely so the area list stays React-free — which is the seam this finding widens.
- The "~14 KB raw / ~5 KB gz" split of the 23 KB chunk rests on analyzer per-module figures I
  cannot re-derive read-only. The chunk total, gz total and route count are all verified; the
  split is plausible (the guide half is 6 chapters + kit + overlay + index ≈ 15 KB of the 23).

## dead-code-07 — the landing hero's scroll cue is a placeholder  → CONFIRMED WITH CORRECTION

- `grep -rn showScrollCue src` → **three** hits, exactly as claimed: the default
  `landing-hero.tsx:124`, the guard `:416`, and the one caller `app/page.tsx:36`, which passes
  `false`. `page.tsx:27` explains the condition for turning it back on ("flip `showScrollCue`
  to true so the hero points at something again"), and `:33-35` repeats it as a JSX comment.
- The cue block with its comment is `:412-424` ✓. `ChevronDown` at `:8` is used only at `:422` ✓.
- **Correction, and it is a foot-gun**: the finding gives `nudgeVariants` as **`:112-122`**.
  `nudgeVariants` is `:112-116`; **`:118-122` is `sectionVariants`, which is live** — it is
  applied at `:249`. A fixer deleting 112-122 breaks the hero's stagger. The correct range is
  `:112-116` (plus the blank line at 117).
- Correctly filed T4/owner: it is coupled to the showcase decision carried over from audit 1,
  and `page.tsx:11-30` is the record of why the whole showcase module graph was cut. Nothing
  here should be touched until that decision lands.

## dependency-diet-15 — `motion-features.tsx` names a test file that never existed → CONFIRMED

- `motion-features.tsx:23` reads: ``no-motion-namespace.test.mjs`` and `:24` "is what keeps the
  app side honest instead." Line number exact.
- `find . -name "*no-motion-namespace*"` (excluding node_modules) → nothing. The real pin is
  `src/components/common/motion-namespace-rule.test.mjs`, which exists.
- Zero-line, zero-risk, and it sits eight lines above the line `bundle-build-01` edits. Ship
  them in the same commit.

## directory-profile-24 — stale-comment batch  → CONFIRMED WITH CORRECTION

Fifteen sub-claims. I checked all of the ones inside this charter and spot-checked the rest.
Every one is real; **one parenthetical is wrong** and two line numbers drift by one.

Verified exactly as written:
- `photo-step.tsx:52-53` — member-facing: "Upload a photo any time you like, from here or from
  settings." There is **no** `/settings` route (`find src/app -type d -name settings` → empty;
  `src/app/(main)/` lists about, admin, birds, catchups, collection, dark-mode, directory,
  feed, guide, letters, messages, notice, notifications, pick-bird, profile, support, welcome).
  This is the one item in the batch a member can see. Worth doing on its own.
- `city-coords.ts:188` — "the map's existing supercluster merges them at low zoom"; there is no
  supercluster dependency and `map-cluster.ts:6` says so in the past tense.
- `city-coords.ts:129-135` — orphaned `cityNameVariants` docblock stacked above
  `cityFilterTargets`'s own (`:136-150`); `cityNameVariants` really is at `:157`.
- `houses-chain.tsx:41-43` — "exported because the PICKER uses it too" sits on
  `const HOUSE_TINTS` at `:43`, which is not exported.
- `letterhead-profile.tsx:206-210` (orphan identity-geometry doc immediately above the COLOPHON
  banner at `:211`), `:322-324` (a JSDoc for a removed `contactsLocked` stacked on the live one
  for `contactsLock` at `:328`), `:635-637` ("`hasBody` used to gate…"), `:50` and `:84` (two
  separate `lucide-react` imports).
- `profile-actions.ts:254-259` + `:260-270` + `updateContactMethods` at `:282` — as described;
  note the two helpers `text()`/`asArray()` at `:272-280` sit between them, so this is a
  *move*, not just a delete.
- `where.ts:31-37` — `buildDirectoryWhere`'s docblock above `parseDirectoryYears`'s;
  `buildDirectoryWhere` really is at `:67`; the "case-insensitive where the provider allows it"
  clause is at `:36`.
- `directory-client.tsx:169` — the restate-the-code comment above
  `setResults(users); setCursor(nextCursor)` ✓. `:503-512` and `:514-523` are indeed two
  comment blocks making the same 68vw argument.
- `alumni-map.tsx:481` — "// on click, which runs after pointerdown, so tapping one still
  works." is a dangling half-sentence inside a `<svg>` prop list ✓; blank-line runs at
  `:403-405` and `:600-601` ✓.
- `location-picker.tsx:40-41` — "Wiring to onboarding / settings / directory happens in a later
  phase" ✓ (it is now wired to onboarding and admin, and there is no /settings).
- `place-write.ts:7-9` ✓ (see directory-profile-11).
- `directory-rule.test.mjs:208` — "the Profession facet: rendered now, tag owed later" (finding
  said `:209`); `:252-268` — the "the plan is still to run every workplace + jobTitle pair
  through an LLM" test ✓, and it is a live pin (`professionTags` is in the schema so
  `tagShipped` is true and the `doesNotMatch` assertion is armed). Comment stale, assertion
  keep — exactly as the finding says.

**Correction**: `directory-client.tsx:394-395` — the finding says of "Primary = the facets that
stay visible on the desktop toolbar row (City, Batch); secondary stays behind 'More filters'"
that "**neither exists**". Half wrong. `renderSecondaryFacets` is alive at `:423` and called at
`:547` and `:614`; the primary/secondary split is real. What no longer exists is the **"More
filters" disclosure** and the idea that primary facets "stay visible on the desktop toolbar
row" — every facet now lives inside the one Filters popover
(`filter-popover.tsx:17-20`: "Every facet lives in here now, rather than three on the toolbar
and two behind a 'More filters' disclosure"). The comment is still stale and still wants
rewriting; a fixer must not go looking to delete `renderSecondaryFacets`.

---

## Cross-cluster notes for the compiler

1. **Three findings describe the same filters-kit deletion.** dead-code-01 (files only),
   dead-code-03 (SortPill + HOUSE_OPTIONS), directory-profile-06 (all of the above + the four
   stale comments). Merge into one item, take directory-profile-06's steps, take
   dead-code-01's honest line count (80) for the file half.
2. **Two findings describe the /welcome deferral.** directory-profile-03 (defer the steps in
   `onboarding-flow.tsx`) supersedes bundle-build-05's /welcome half; keep bundle-build-05
   only for `/admin/people/[id]` (`person-detail.tsx:25`).
3. **directory-profile-03, -05 and -10 compound** on the same route and should be sequenced
   -05 (shrink the houses chunk) → -10 (drop the fetch) → -03 (defer what is left), so the
   final measurement is taken once.
4. **bundle-build-01 and dependency-diet-15 touch the same eight lines** of
   `motion-features.tsx`. One commit.
5. Two findings I could not fully settle read-only, both flagged in place: whether Turbopack
   tree-shakes the static `domMax` import (bundle-build-01), and the guide half's exact share
   of a verified 23,588 B chunk (bundle-build-03). Both need the post-fix build, not a browser.
