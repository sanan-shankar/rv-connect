# shell-b — adversarial verification (refactor audit 2)

HEAD at verification: `74cc61a fix(retention): notifications are kept 30 days, everywhere`.
Working tree clean except the untracked audit folder itself (`git status --short` → only
`?? docs/audit-fix/2026-09-03-refactor-audit-2/`). Note: the findings were written against
`72b5a1d`; two commits have landed since and neither touches my files.

Read-only throughout: grep/sed/wc/ls/python over the tree, `gzip -c | wc -c` over the
read-only build at `.scratch/audit2-build/.next/`, and `route-bundle-stats.json`. No build,
no tsc, no browser, no database.

16 findings checked. **14 confirmed, 2 confirmed-with-correction, 0 refuted.** This finder
set is unusually accurate — every number I re-derived (828 lines, 2,477 lines, 283 KB of
webp, 28,691-byte chunk, 46-of-52 routes, 38 `as object` casts) matched to the digit. The
corrections below are about *scope*, not about whether the thing is real.

---

## duplication-11 — StepFooter for the onboarding steps → **confirmed-with-correction**

Verified at HEAD:
- `houses-step.tsx:135-150` and `register-step.tsx:196-211` are the same footer: outer
  `<div className="flex items-center justify-between gap-2">`, ghost Back with `<ArrowLeft>`,
  inner `<div className="flex items-center gap-2">`, ghost "Skip for now" `disabled={saving}`,
  then the primary.
- `ls src/components/onboarding/steps/` → `done-step.tsx houses-step.tsx photo-step.tsx
  register-step.tsx welcome-step.tsx`. **No StepFooter exists**, so audit-1's dup-24 item 3
  is genuinely still open.

Corrections:
1. **The quoted line ranges stop two lines short.** The clone's outer `</div>` is at
   `houses-step.tsx:150` and `register-step.tsx:211`; the finding says `:135-147` and
   `:196-208`, which ends mid-`<Button>`. A fixer following the ranges literally would leave
   an unbalanced tag. Use 135-150 / 196-211.
2. **The primaries differ in one more way than the finding states.** Not only
   `type="button" onClick={handleSave}` vs `type="submit"`, but also
   `disabled={saving || loading}` (houses) vs `disabled={saving}` (register). Harmless for
   the proposed shape — the primary is `children` — but worth knowing so nobody "unifies" it.
3. `photo-step.tsx:103-117` shares the *Back* half of the block (same three lines) but has no
   Skip and a single conditional primary; the finding already says to leave photo/done alone,
   which I agree with.

## duplication-13 — the filters kit's pill trigger, four times → **confirmed**

`grep -rn data-facet-trigger src/ (non-lab)` returns exactly four render sites:
`facet-select.tsx:97` (FacetSelect) and `:136` (SortPill), `facet-search-select.tsx:91`,
`range-facet-pill.tsx:66`. Each is the same 9-10 line shell: `facetPillClass(set, className)`
div → trigger with `data-facet-trigger="" className="flex min-w-0 flex-1 items-center gap-1.5
py-2 outline-none"` → truncating span → `{!set && <ChevronDown className="size-3.5 shrink-0
opacity-70" aria-hidden />}` → `{set && <FacetClearButton …/>}`. The finding's ranges are
right on the nose (I re-derived SortPill's 134-142 line by line). `pill-shell.tsx` already
owns `PILL_BASE`, `PILL_SET`, `facetPillClass`, `FacetClearButton`, `FacetPanel`,
`FACET_ITEM_CLASS`, `FACET_POPUP_CLASS`, so the residue really is only the JSX shell.

The finder's own hedge is the right one and I would keep it in the plan verbatim: SortPill
has no clear button and always shows the chevron, so a shared `FacetPill` needs either a
component-as-prop `Trigger` or Base UI's `render` prop, and that may read worse than four
copies. ~30 lines is the optimistic end; 20-24 is more likely once the wrapper's own props
and docblock are paid for (audit 1's dedupe lesson).

## duplication-17 — `clamp` defined six times → **confirmed-with-correction**

`grep -rn 'const clamp\|function clamp' src/` at HEAD:
- exported: `hoopoe-kit.ts:285` (`export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))`)
- local copies: `hoopoe-playground.tsx:90`, `mascot-flight-layer.tsx:70`,
  `common/pinch-zoom.ts:64`, `settings/avatar-crop-dialog.tsx:82` (function form),
  `lib/photo-layout.ts:203` (`Math.min(hi, Math.max(lo, v))` — same result, arguments swapped)
- **plus one the finding missed: `src/app/lab/_hoopoe.tsx:26`**, character-identical to the kit's.

Corrections:
1. `src/app/not-found.tsx:92` is **not** a sixth definition. That file does
   `import { clamp, rand } from "@/components/mascot/hoopoe-kit"` at line 10 and its
   `clamp01 = (t) => clamp(t, 0, 1)` is a partial application of the shared one. The finding's
   parenthetical ("check where that one comes from") is answered: it already uses the export.
   So the census is 6 definitions (1 exported + 5 local) plus 1 in lab, not 6 duplicates.
2. **Do not resolve this by importing from `hoopoe-kit`.** `hoopoe-kit.ts:21` does
   `import { useMotionGovernor } from "@/components/common/motion"`, so pulling `clamp` into
   `src/lib/photo-layout.ts` and `src/components/common/pinch-zoom.ts` would wire two
   generic modules into the mascot/motion graph. Given finding
   landing-mascot-avatars-02 is about keeping the mascot rig *out* of route graphs, that is a
   real hazard, not a hypothetical. Put `clamp` in `src/lib/utils.ts` (or a two-export
   `src/lib/math.ts`) and have `hoopoe-kit` re-export or import it.
3. Worth telling the fixer: `motion-utils` (already installed, transitively via `motion`)
   exports its own `clamp`. Not a reason to depend on it, just a reason not to be surprised.

Saving stands at "0 lines, one name" — this is a cheap/hygiene item exactly as tiered.

## feed-posts-11 — the bell hand-rolls the id-dedupe → **confirmed**

`notification-bell.tsx:202-205`:
```
setNotifications((prev) => {
  const seen = new Set(prev.map((n) => n.id));
  return [...prev, ...data.notifications.filter((n) => !seen.has(n.id))];
});
```
`append-page.ts:15-18` is `appendUnseen(shown, arriving)` with an identical body, so
`appendUnseen(prev, data.notifications)` is behaviourally byte-for-byte the same, including
the "keep the mounted copy" rule the docblock defends. `append-page.test.mjs:88-105` is the
C-071 sweep; its `LISTS` array holds four paths (`post-feed`, `comments-section`,
`profile-author-feed`, `collection-client`) and asserts `doesNotMatch(/new Set\(\w+\.map\(\(\w+\)
=> \w+\.id\)\)/)`. The bell's line matches that regex exactly, so adding
`"../components/layout/notification-bell.tsx"` to `LISTS` in the same commit is both the fix's
proof and the finding's claim. 3 lines, trivial.

## fresh-code-10 — photo-carousel hand-rolls a cubic-bezier solver → **confirmed-with-correction**

`photo-carousel.tsx:69-85` is a 17-line `ease` (12-round bisection over the Bernstein form of
`EASE_OUT_SMOOTH`), comment included. `motion` is a dependency (`package.json:51`,
`"motion": "^12.38.0"`).

Correction on the import path — this is the one thing that would make the fix worse:
- `node_modules/motion/dist/index.d.ts` is `export * from 'framer-motion/dom'`, i.e. the
  **vanilla DOM** entry. `cubicBezier` actually lives in `motion-utils`
  (`node_modules/motion-utils/dist/index.d.ts:89`, `declare function cubicBezier(mX1, mY1,
  mX2, mY2): (t: number) => number`), and is re-exported by BOTH entries
  (`framer-motion/dist/types/index.d.ts:12` `export * from 'motion-utils'`, and
  `motion/dist/react.d.ts` `export * from 'framer-motion'`).
- This repo imports from **`motion/react`** everywhere (`src/components/common/motion.tsx:13`).
  Import `cubicBezier` from `"motion/react"`, not `"motion"`, so the carousel does not pull a
  second package entry point into a chunk that today has none.
- `photo-carousel.tsx` currently imports no motion package at all (only `EASE_OUT_SMOOTH` from
  the local `@/components/common/motion`). The cleanest shape is to export a ready-made
  `easeOutSmooth = cubicBezier(...EASE_OUT_SMOOTH)` from `common/motion.tsx` — one place, and
  the carousel's import list does not grow a package.

`EASE_OUT_SMOOTH = [0.16, 1, 0.3, 1] as const` (`common/motion.tsx:41`) spreads into
`cubicBezier` fine. Saving ~15 lines is honest.

## fresh-code-11 — every `SpringPress` caller casts to `object` → **confirmed**

Cause verified at `common/motion.tsx:150-161`: the prop type is
`{ children; className?; onClick?; as?: "button"|"div"|"a"|"span" } & MotionProps` — no HTML
attributes anywhere, and `MotionProps` does not carry them.

Census re-run: `grep -rn "as object" src/` → **40 hits**; two are unrelated
(`lib/prisma.ts:156` `Object.keys(value as object)`, and `image-viewer.tsx:34` is the word
"objected" inside a comment, not a cast). So **38 real casts**, exactly as claimed:
**12 non-lab** — `contribute-room.tsx:976`, `comments-section.tsx:472`,
`create-post-form.tsx:866` and `:891`, `attach-image-dialog.tsx:188`,
`location-picker.tsx:319,362`, `tag-input.tsx:91`, `photo-attachments.tsx:151,165`,
`progress-rail.tsx:94,158` — and **26 in `src/app/lab/`**.

Useful for the fixer: **every** non-lab `<SpringPress>` that carries a cast also passes
`as="button"` explicitly (I checked all nine `as=` sites). So
`& Omit<React.ComponentPropsWithoutRef<"button">, keyof MotionProps | "onClick">` on the prop
type covers all 12 shipped sites; the polymorphic `as="a"|"div"|"span"` cases are lab-only and
can keep a looser union. The claim that a typo compiles is correct: spreading a value typed
`object` gives TypeScript no known properties, so excess-property checking never runs.

## fresh-code-18 — `syncGuideFromHistory` and `resetGuide` are the same function → **confirmed**

`guide-open.ts:73-77` and `:80-84` — both bodies are literally
`if (current === null) return; current = null; emit();`. Only callers, both in
`guide-layer.tsx`: `:33` (`const onPop = () => syncGuideFromHistory()`) and `:45`
(`resetGuide()`), imported together at `:18`. Nothing else in `src/`, `scripts/` or `e2e/`
references either name. 5 lines, and the two names' meanings survive as call-site comments
exactly as the finding proposes. (Aside for the fixer: `closeGuide():66-68` repeats the same
three lines a third time before its `history.back()`, so the merged helper has three callers,
not two.)

## lab-07 — three shipping-path files exist only for a lab room → **confirmed**

Every importer enumerated at HEAD:
- `src/components/support/wood.tsx` (246 lines, `"use client"`): the only import in the repo is
  `src/app/lab/support-ideas/_variant-aviary.tsx:23`. `src/app/lab/_registry.ts:226` says so in
  writing ("which is lab-only: nothing on /support mounts it").
- `src/components/landing/showcase-shot.tsx` (119): imported by
  `src/app/lab/landings/_variant-clarity.tsx:38` and by
  `src/components/landing/showcase.tsx:26` — and `showcase.tsx` is itself in knip's
  "Unused files (7)" list, i.e. dead.
- `src/components/landing/shots.ts` (56): re-exported by `src/app/lab/landings/_shared.ts:20`
  (and typed at `:58`), imported by `showcase.tsx:32`. Same story.

So the claim "their only live importers are lab" holds for all three. Overlaps with
landing-mascot-avatars-03 (below): they agree, and **-03 is the safer set of steps** because it
notices that `section-reveal.tsx` is imported by *five* lab variants and must move rather than
die, and that `ambient-leaves.tsx`/`perching-birds.tsx` are named in
`scripts/qa/protocol-audit.mjs:120-121`. Do lab-07 and -03 as one owner decision, not two.

## landing-mascot-avatars-02 — the 28 KB hoopoe rig on 46 of 52 non-lab routes → **confirmed-with-correction**

Every number re-derived independently:
- `.scratch/audit2-build/.next/static/chunks/0qa8au6zlhx7_.js` is **28,691 bytes** and is the
  only chunk containing the rig path `M42 84 Q30 88 31 106`. My `gzip -9` gives 7,891 (the
  finding's 7,874 is the same figure from a different gzip build; immaterial).
- From `raw/route-bundle-stats.json`: 52 non-lab routes, **46** carry that chunk. The six that
  do not are exactly `/_not-found`, `/catchups/join`, `/catchups/join/[token]`, `/guidelines`,
  `/privacy`, `/terms` — the finding's list, verbatim.
- The two shell importers are real: `sidebar-hoopoe.tsx:37` (`import { Hoopoe } from
  "./hoopoe"`) and `moments/logo-easter-egg-hoopoe.tsx:36`, mounted by `sidebar.tsx:43,44` at
  `:627-629` (`<LogoEasterEgg>`) and `:652` (`<SidebarHoopoe />`). `mascot-flight-layer.tsx:44-48`
  states the intent the shell defeats, in writing.
- Full static-importer census of `import { Hoopoe }` outside lab (16 lines): the two shell
  files, five auth/landing files, `hoopoe-playground.tsx`, `hoopoe-warmup.tsx`, plus six
  per-page files.

**Correction: the "~32 routes freed by step 1" is over-counted by roughly seven.** I traced
each per-page static importer to its route:
- `catchups/almost-ready.tsx` is statically imported by four catchups pages
  (`catchups/new`, `catchups/(index)`, `catchups/[catchupId]/answer`,
  `catchups/[catchupId]/(home)`), `completion-card.tsx` by `answer-experience.tsx`, and
  `group-first-guidance.tsx` by `catchups/(index)`. So the six `/catchups*` routes in the
  finding's own list keep the rig regardless of the shell conversion.
- `/welcome` renders `<CelebrationSignals>` (`welcome/page.tsx:5,82`) →
  `celebration-detector.tsx:20` → `celebration-hoopoe.tsx:22` → static `Hoopoe`. Same for
  `/feed` (`feed/page.tsx:11`), which the finding did not claim.
So step 1 alone frees roughly **23-25** routes — `/admin/*` (13), `/letters*` (4), `/about`,
`/guide`, `/guide/[area]`, `/notice/[id]`, `/support`, `/pick-bird`, `/birds`, and (I checked)
`/collection` + `/collection/[id]`, because `contribute-room.tsx` is already behind
`dynamic()` at `collection-client.tsx:79`. That is still ~660-720 KB of raw JS removed across
the app and the finding's headline (28.7 KB × ~30 routes) is not materially wrong — but the
fix session should expect the before/after diff to show ~24 routes moving, not 32, and should
not conclude the conversion failed when `/welcome` and `/catchups` do not budge. Converting
`moment-hoopoe.tsx` and `celebration-hoopoe.tsx` in the same pass is what buys those back, and
the finding already flags them as the natural second pass.

Everything else in the finding — `ssr: false` being free because both files render `null`
until a timer/click, `onReady` not `ref`, keeping the deferred `setTimeout(fn, 0)`, and not
touching the auth pages / `/hoopoe` / `landing-hero.tsx` — checked out against the files.

## landing-mascot-avatars-03 — the switched-off landing showcase → **confirmed**

Line counts re-run with `wc -l`, and they are exact:
- knip-unused five: `showcase.tsx` 255, `feature-section.tsx` 104, `trust-section.tsx` 71,
  `landing-footer.tsx` 81, `footer-hoopoe.tsx` 317 = **828**. `raw/knip-repo-config.txt`'s
  "Unused files (7)" is those five plus `common/filters/active-filter-chips.tsx` and
  `common/filters/result-count.tsx`, as claimed.
- the six reachable only from `showcase.tsx` + lab: `ambient-leaves.tsx` 676,
  `perching-birds.tsx` 664, `showcase-shot.tsx` 119, `landing-nav.tsx` 74,
  `section-reveal.tsx` 60, `shots.ts` 56 = **1,649**. 828 + 1,649 = **2,477**. I enumerated
  every importer of all six: `section-reveal` → five lab variants + trust-section +
  feature-section + showcase; `landing-nav` → `_variant-postcard.tsx:34` + showcase;
  `ambient-leaves`/`perching-birds` → `_variant-postcard.tsx:32,33` + showcase (+
  `scripts/qa/protocol-audit.mjs:120-121`). No shipped route touches any of them.
- assets: `public/images/landing/` holds exactly 5 webp totalling **283,284 bytes** (283 KB).
- `src/app/page.tsx` is 39 lines, imports only `LandingHero`, and the `SHOW_SHOWCASE` constant
  is gone (three prose mentions remain, no declaration).

This is audit-1 §4 #1 still open, correctly labelled owner-decides. Two things the fix session
must not lose: `ambient-leaves.tsx` and `perching-birds.tsx` are in `protocol-audit.mjs`'s
allow-list, so a delete must remove those two lines or `npm run check` goes red; and
`section-reveal.tsx` has five lab consumers, so "retire" means *move into
`src/app/lab/landings/`*, not `rm`. Overlaps lab-07 — same family, and -03 is the fuller,
safer write-up.

## landing-mascot-avatars-04 — `point()`'s `label` option is never read → **confirmed**

`grep -n label src/components/mascot/hoopoe.tsx` returns **exactly one line**, `:507`
(`const point = (target: Target | Dir, opts?: { label?: string; hold?: number }) =>`). The
declaration is mirrored in the public interface at `hoopoe-kit.ts:149` and documented at
`docs/spec/mascot.md:51` (`point(target | "left" | "right", { label, hold })`). Two callers
actually pass it: `hoopoe-playground.tsx:59` — the "the tour guide" routine,
`["point", "right", { label: "over here" }]` — and `src/app/lab/hoopoe/page.tsx:80`
(`{ label: "this" }`). `src/app/hoopoe/page.tsx` exists, so the playground really is a public
route a stranger can press. Placeholder, T1, ~6 lines.

## landing-mascot-avatars-05 — `initialExpression` is a dead prop → **confirmed**

`grep -rn initialExpression src/ scripts/ e2e/ docs/spec/` returns **one hit**:
`hoopoe.tsx:1182`, inside the exported `HoopoeProps`. The component's destructured parameter
list at `:1196` does not contain it (`{ size = 160, variant = "full", className = "", onReady,
idle = true, tail = false, headScale = 1, eyeScale = 1, eyeY = 0, eyeSpread = 0, billLength = 1 }`).
1 line, and it is on the prop surface of a component the flight layer types with
`dynamic<HoopoeProps>`.

## landing-mascot-avatars-07 — four "one hoopoe at a time" wait loops → **confirmed**

Census re-run and it is right:
- `grep -rn "BLOCKED_RETRY_MS\|MAX_BLOCKED_RETRIES" src/` → three constants, three values:
  `footer-hoopoe.tsx:89` = 4000, `sidebar-hoopoe.tsx:47` = 8_000,
  `celebration-detector.tsx:35-36` = 3000 with `MAX_BLOCKED_RETRIES = 10`. No comment relates
  any of them to the others.
- the fourth waiter is the one-shot at `logo-easter-egg-hoopoe.tsx:88`
  (`if (anotherHoopoeOnScreen()) return; // stage owned elsewhere; stay quiet this time`) —
  confirmed, and it genuinely has no retry.
- the second copy of the DOM query is real: `footer-hoopoe.tsx:150-156`
  `anotherHoopoeVisible(self)` re-implements `one-hoopoe-guard.ts:15-18` with a
  self-exclusion.
- the sub-claim in Notes is also true: `celebration-hoopoe.tsx:71-73` is
  `function handleReady(api) { void playCelebration(api, kind).then(...) }` — no
  `setTimeout(fn, 0)`, unlike `mascot-flight-layer.tsx`, `sidebar-hoopoe.tsx` and
  `logo-easter-egg-hoopoe.tsx`, which all defer with a long Strict-Mode comment.

One thing to say to the owner alongside it: waiter #4 lives in `footer-hoopoe.tsx`, which is
inside the switched-off showcase (finding 03) and has not mounted since 2026-08-04. If the
owner retires the showcase, this becomes three waiters and the self-exclusion argument for the
shared `except` parameter weakens. Sequence -03's decision before doing -07, or the work gets
redone. The finding's own "0 lines, quality only, medium confidence it is worth doing" framing
is honest and should survive into the plan.

## landing-mascot-avatars-08 — `hoopoe-geometry.ts` + `edge-light.ts` are lab/build-time tooling in `src/lib/` → **confirmed**

`wc -l`: 361 and 145 = **506 lines**. Full consumer census at HEAD:
- `hoopoe-geometry.ts` ← `lab/hoopoe-marks/_parts.tsx:23,25`, `lab/hoopoe-marks/page.tsx:16`,
  `lab/glass-edges/page.tsx:48`, `src/lib/mark-centring.test.mjs:23`,
  `scripts/dev/build-app-icon.mjs:15`.
- `edge-light.ts` ← `lab/glass-edges/page.tsx:47`, `scripts/dev/generate-icons.mjs:31`.
- No shipped route imports either; nothing outside those files references them.
The gate the finding names is real and I confirmed it: both files are in
`scripts/qa/protocol-audit.mjs`'s allow-list at `:117` and `:118`, so the allow-list paths must
move in the same commit or `npm run check` fails. Also move `src/lib/mark-centring.test.mjs`'s
relative import with it.

## landing-mascot-avatars-12 — stale comments → **confirmed**

All three grep-verified at HEAD:
- `mascot-flight-layer.tsx:46-47` still reads "on the landing — the only place flights launch —
  the scroll companion has already loaded it". The scroll companion is `footer-hoopoe.tsx`,
  which no shipped route mounts.
- `landing-hero.tsx:412-413` still points at "SHOW_SHOWCASE in src/app/page.tsx".
  `grep -rn SHOW_SHOWCASE src/` returns three prose mentions (`page.tsx:21`,
  `landing-hero.tsx:413`, `showcase.tsx:7`) and **no declaration**.
- `moment-hoopoe.tsx:4-11` frames all its consumers as empty states, while
  `contributed-hoopoe.tsx` (via `contribute-room.tsx:66`) is a celebration.

Half-correction on that third one, for honesty rather than to knock it down: the banner reads
"empty search results, empty saved posts, **and friends**", which is an open-ended idiom, so
"written when there were three callers" is an inference, not a fact. The wrong statement is
the *empty-state framing*, not the count. Fix the framing; there are four consumers
(`no-results-hoopoe`, `no-saved-hoopoe`, `messages-empty-hoopoe`, `contributed-hoopoe`), which
I enumerated.

## landing-mascot-avatars-13 — six `export` keywords with no consumer → **confirmed**

Each symbol grepped across `src/ scripts/ e2e/ docs/spec/`:
- `useMomentAutoplay` — declared `moment-hoopoe.tsx:43`, used `:101`, same file. Dead export.
- `BIRD_POSE_COUNT` — `avatar.ts:47`, used `:164`, same file. Dead export.
- `BIRD_SPECIES_COUNT` — `avatar.ts:44`, used `:162`, same file. Mentioned in prose at
  `bird-avatar-v2.tsx:199,1584`, `avatar.test.mjs:150` and `docs/spec/avatars.md:41,46,48` but
  **never imported**. Dead export; keep the name and the docs, they are the "never raise this"
  warning.
- `PEEK_CREST` — `hoopoe-geometry.ts:331`, used `:336`, same file. Dead export.
- `ARCHETYPES` — `bird-avatar-v2.tsx:1613`, imported by exactly four lab rooms
  (`lab/centroid/page.tsx:3`, `lab/feedback/page.tsx:19`, `lab/profiles/_profile-avatar.tsx:29`,
  `lab/birds-bg/page.tsx:3`). Lab-only, keep exported + relabel, as the finding says.
- `H` — one correction: the dead thing is the **re-export at
  `src/app/lab/hoopoe-marks/_parts.tsx:25`** (`export { H, G } from "@/lib/hoopoe-geometry"`),
  which is what knip flags. `H` itself is used **13 times inside `hoopoe-geometry.ts`**
  (`:117,160,167,203,240,244,245,266,271,294,…`), so it is not an unused constant; only its
  onward re-export is unused (`G` on that same line IS consumed, by
  `lab/hoopoe-marks/page.tsx:15`). The finding's prescription (leave exported, relabel) is
  still the right move; its wording just implies `H` is idle, and it is not.
Confidence high. Everything else in the entry, including the two knip lines it declines to
propose, holds.

---

## Cross-finding notes for the compiler

- **lab-07 and landing-mascot-avatars-03 are the same decision.** They agree on the facts.
  -03 is the safer procedure (it catches `protocol-audit.mjs:120-121` and the five lab
  consumers of `section-reveal.tsx`). Merge, do not schedule twice.
- **landing-mascot-avatars-07 depends on -03.** One of its four waiters is in the
  switched-off showcase. Decide -03 first.
- **duplication-17 must not be resolved via `hoopoe-kit`** — see above; that would work
  directly against -02.
- **-02's savings should be quoted as ~24 routes, not ~32**, unless the per-page importers
  (`moment-hoopoe`, `celebration-hoopoe`, `almost-ready`, `completion-card`,
  `group-first-guidance`, `dark-gauntlet`) are converted in the same campaign.
