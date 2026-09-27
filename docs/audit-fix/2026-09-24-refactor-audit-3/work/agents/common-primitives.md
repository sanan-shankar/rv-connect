# common-primitives - refactor audit 3 report

Charter T08: the shared UI primitives in `src/components/common/**`, minus the media primitives whose
names contain `image`, `photo`, `viewer` or `carousel` (T04) and `bird-avatar-v2.tsx` (T10); plus,
because the charter names them, the primitives that physically live in T09's and T01's folders
(`ui/button.tsx`, `ui/sheet.tsx` (the shared bottom sheet), `ui/sonner.tsx` (the toast wiring),
`layout/content-column.tsx`, `posts/feed-column.tsx`), which I audited from the primitive angle only:
callers, props, adoption, and who hand-rolls them instead. For every primitive I counted callers across
`src/`, lab included, with a JSX-tag parser (a `node -e` over the files, not a line grep, so
multi-line tags count) and re-grepped the lab before calling any prop unused. Date 2026-09-24, HEAD
`70570bcd`. Files in territory: 50 (45 under `common/`, 5,299 lines; 5 named primitives elsewhere,
787 lines). Read fully: 50.

## Coverage
- Read fully: every file under `src/components/common/` except T04's and T10's, i.e.
  `bird-avatar.tsx`, `bird-adjust.json` (data: structure and all four readers verified),
  `bookmark-button.tsx`, `confirm-dialog.tsx`, `confirm-dialog.test.mjs`, `control-geometry.ts`,
  `filters/{facet-search-select,facet-select,filter-popover,filter-sheet,pill-shell,range-facet-pill,sentence-line}.tsx`,
  `filters/types.ts`, `float-field.tsx`, `flush-avatar.tsx`, `focus-modality.tsx`,
  `house-options.tsx`, `identity-row.tsx`, `info-tooltip.tsx`, `location-picker.tsx`,
  `love-button.tsx`, `meta-dots.tsx`, `motion.tsx`, `motion-features.tsx`,
  `motion-features-max.ts`, `motion-namespace-rule.test.mjs`, `person-name.tsx`, `pinch-zoom.ts`
  (collection-media explicitly left it to T08), `pinch-zoom.test.mjs`, `rich-text-area.tsx`,
  `segmented-pills.tsx`, `share-button.tsx`, `skeleton.tsx`, `tag-input.tsx`,
  `use-closing-dialog.ts`, `use-coarse-pointer.ts`, `use-deferred-autofocus.ts`,
  `use-leave-guard.ts`, `use-user-search.ts`, `use-wide-viewport.ts`, `verified-mark.tsx`,
  `verified-mark.test.mjs`, `year-input.tsx`, `attach-well.test.mjs`; and `ui/button.tsx`,
  `ui/sheet.tsx`, `ui/sonner.tsx`, `layout/content-column.tsx`, `posts/feed-column.tsx`.
- Read for evidence outside the territory (the parts I cite): `docs/spec/DESIGN-SYSTEM.md` (all),
  `.claude/skills/liftkit-spacing/SKILL.md`, `auth/signup-form.tsx:25-145`, `posts/mention-dropdown.tsx:1-90`,
  `catchups/create/cadence-control.tsx` (all), `catchups/create/people-picker.tsx:80-200`,
  `catchups/home/people-door.tsx:180-350`, `catchups/home/catchup-home.tsx:240-326`,
  `catchups/settings/settings-surface.tsx:600-720`, `catchups/edition/reader.tsx:115-145,430-434`,
  `catchups/edition/reader-parts.tsx:540-554`, `(main)/catchups/new/loading.tsx:50-66`,
  `profile/house-chain-editor.tsx:15-40,86-100,155-170,222-320`, `profile/letterhead-profile.tsx:705-725`,
  `posts/post-card.tsx:665-705`, `letters/letter-engagement.tsx`, `letters/drafts-strip.tsx:110-135`,
  `collection/photo-river.tsx:188-215` (the Tailwind v4 `scale` trap), the six other matchMedia sites,
  `ui/focus-recipe.test.mjs`, `lib/identity-row-overflow-rule.test.mjs:1-80`,
  `lab/location-picker/page.lab.tsx`, `lab/_kit.tsx:1-60`, `lab/profiles/_profile-avatar.tsx:160-185`,
  `node_modules/@base-ui/react/use-button/useButton.js:70-100`, audit 2's `report.md` rows and
  `fix-prompt.md` board, questions and ledger, and audit 2's `shell-primitives`, `duplication` and
  `fresh-code` reports for the rows that touch these files; the seven landed audit-3 reports' "For
  other lenses" sections.
- Skimmed (why): `pinch-zoom.ts`'s gesture arithmetic was read for structure and duplication, not
  re-derived (it is a single-owner state machine whose tests pin the load-bearing parts);
  `bird-adjust.json`'s 51 entries (generated data).
- Not read (why): T04's media primitives, `bird-avatar-v2.tsx` (T10), the rest of `ui/` and
  `layout/` beyond the five named files (T09), and `.next/` (the brief says ignore it; for bytes I rely
  on bundle-build's measured chunk contents and say so where I do).
- Uncommitted edits seen (someone else's WIP): none. `git status --short` on every territory path is
  empty; the tree shows only the two audit folders untracked.

## Summary
The primitives are in good shape as source, and audit 2's cuts held: the filter kit's two orphan files,
`SortPill`, `HOUSE_OPTIONS`, `HousePicker` and the three dead Button rows are gone; the 09-15 bottom
sheet consolidation is complete (no hand-rolled rising panel survives in shipped code); the motion
foundation (LazyMotion, the `domMax` module, the `m.` rule and its test) holds. The waste that is left
is of three kinds. (1) **Primitives that exist but get bypassed** because they are awkward or unknown:
`SpringPress`'s prop type forces 36 `as object` casts and six hand-copied presses (-03); the mention
dropdown re-implements `useUserSearch` and the two have drifted (-04); `CadenceControl` re-draws
`SegmentedPills` (-06); nine hand-rolled `matchMedia` subscriptions sit beside a correct
`useSyncExternalStore` one (-01); the post-row action pill is written five times (-05). (2) **Options
kept for callers that are gone**: 13 props no caller passes (-08), `BirdAvatar`'s `ring` (-09),
`LocationPicker`'s single mode (-07, owner), a zero "nudge" transform on every identity row (-11),
`HouseOptions`' fallback and home (-10). (3) **Audit-2 owner answers that were never executed**:
Q7 "one help-bubble machine" (-02) and row #13 (never even asked, -07). Biggest wins in the right units:
~−120 lines and the whole `@base-ui/react/tooltip` module off two routes (-02), ~−90 lines and two files
(-01), ~−74 (-07), ~−63 (-06); about −570 source lines in total, 36 type casts, 13 dead options, 50
restated Button defaults. Structural 12, cheap 4. What surprised me: how many audit-2 items in these
files fell through without a decision or a ledger line (G2/Q7, row #13, fresh-code-11,
shell-primitives-14), and that the shared `Button`'s press has not animated since Tailwind v4 (a bug,
handed to that lens below).

## Findings

### common-primitives-01 - Replace nine hand-rolled media-query subscriptions with one `useMediaQuery`
- **Where**:
  - `src/components/common/use-coarse-pointer.ts:23-33` (`useCoarsePointer`: `useState(false)` + effect over `matchMedia("(pointer: coarse)")`); one caller, `catchups/index/catchup-card.tsx`.
  - `src/components/common/use-wide-viewport.ts:22-32` (`useWideViewport`: the same body, `"(min-width: 1024px)"`); callers `profile/house-chain-editor.tsx:94` and `catchups/home/catchup-home.tsx:243` (`const phone = !useWideViewport();`).
  - `src/components/common/attach-image-dialog.tsx:75-85` (`usePointerFine`, the same body, `"(hover: hover) and (pointer: fine)"`; T04's file); callers `attach-image-dialog.tsx:154`, `collection/contribute-room.tsx:1204`.
  - `src/components/catchups/edition/reader.tsx:125-144` (`useMedia(query, serverValue)`, already `useSyncExternalStore`: the correct version; T02's file); callers `:432-433`.
  - Inline copies of the same effect: `landing/perching-birds.tsx:138-146` and `landing/ambient-leaves.tsx:118-126` (`"(max-width: 639px)"`, byte-identical blocks, each under an "SSR-safe responsive ..." comment), `mascot/sidebar-hoopoe.tsx:99-107` (`"(min-width: 768px)"`, with an eslint-disable for set-state-in-effect), `mascot/moments/not-found-stage.tsx:145-151` (`"(min-width: 768px)"`, picks a rig), `directory/alumni-map.tsx:385-391` (`"(pointer: coarse)"`: an exact inline copy of `useCoarsePointer`).
  - Out of scope on purpose: one-shot reads (`landing-hero.tsx:220`, `use-flight-arrival.ts:128`, `image-viewer.tsx:524`, `use-deferred-autofocus.ts:43`, `install-app-tile.tsx:75,101`) and `install-app-tile.tsx:88-92` (its own `useSyncExternalStore` store for display-mode, already right).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "matchMedia(" src --include=*.ts --include=*.tsx | grep -v src/app/lab` gives 20 hits. Ten are live subscriptions, and nine of them are one six-line body: `const [v, setV] = useState(false); useEffect(() => { const mq = window.matchMedia(Q); const sync = () => setV(mq.matches); sync(); mq.addEventListener("change", sync); return () => mq.removeEventListener("change", sync); }, []);`. The tenth, `reader.tsx`'s `useMedia`, is the right version, and its docblock (`:127-130`) says why: "`useSyncExternalStore` rather than `useState` + an effect, because React reads `getServerSnapshot` on the server and during hydration -- so nothing mismatches -- and reads `getSnapshot` directly on a client mount, so a client-side navigation gets the right number on its first render." The `useState` copies always render the server default first and flip one frame later, on client-side navigations as well as on first load. catchups-ui reported the visible consequence: `catchup-home.tsx:243`'s `phone` renders the sheet branch for one frame on every laptop mount.
- **What to do**:
  1. Create `src/components/common/use-media-query.ts` exporting `useMediaQuery(query: string, serverValue = false): boolean` with `reader.tsx:131-144`'s body (stable `subscribe` and `getSnapshot` via `useCallback([query])`). Carry over, as one short comment, the reasoning worth keeping from `use-coarse-pointer.ts:5-21` (the primary pointer rather than any pointer; the pointer rather than the viewport width). Optionally export the named queries `COARSE_POINTER`, `WIDE_VIEWPORT = "(min-width: 1024px)"`, `FINE_HOVER`.
  2. Delete `use-coarse-pointer.ts` and `use-wide-viewport.ts`. Callers call `useMediaQuery(COARSE_POINTER)` and `!useMediaQuery(WIDE_VIEWPORT)`, or keep the two names as one-line aliases in the new file if the diff should stay small.
  3. `usePointerFine` (T04 file) becomes a one-line alias, or its two callers call the hook directly.
  4. `reader.tsx` deletes its local `useMedia` and imports the shared hook; `IS_PHONE`/`RAIL_FITS` stay where they are.
  5. Replace the five inline blocks with one line each. Pass as `serverValue` the value each renders first today, so SSR and hydration output stay byte-identical: perching-birds and ambient-leaves `false` (isMobile), sidebar-hoopoe `false`, not-found-stage `true` (it starts on `RIG_DESKTOP`), alumni-map `false`.
  6. Optional, same shape: `useMotionGovernor` (`motion.tsx:105-114`) could read `document.hidden` through `useSyncExternalStore` (server `false`), keeping its `ambientReduced: false` seam as the spec requires.
- **Saving**: ~−90 lines (two files, 65 lines, deleted; five inline blocks at −8 each; `usePointerFine` −10; `reader.tsx` −20; +~25 for the new hook), −2 files, one render fewer per mounting component on client navigations, and the Catch-up home's one-frame shell flip gone.
- **Risk & gate**: medium-low. First-load behaviour is unchanged when each site passes today's default as `serverValue`; client navigations now start correct instead of flipping. Gates: `npm run check`; `npm run visual`; `/` at 390 (3 perching birds, 16 leaves) and 1440; `/directory`'s map under touch emulation (coarse-pointer targets); the Catch-up home at 1440 and 390 (People and Settings open as dialog and as sheet); a 404 at 390 and 1440 (the rig); the sidebar hoopoe at 1440. No test names the two deleted files (`grep -rn "use-coarse-pointer\|use-wide-viewport" src scripts --include=*.mjs` finds none).
- **Confidence**: high on the duplication and the saving. Medium on "zero visible change": a component that renders differently on its first client frame after a navigation (the sidebar hoopoe arming, the not-found rig) will now be right one frame earlier. The change only ever moves towards correct.
- **Notes**: Do not route `prefers-reduced-motion` through this hook anywhere (DESIGN-SYSTEM §7; the rule is enforced by grep count). `signup-form.tsx:34-41`'s `useHoverCapable` is a one-shot read that disappears with -02. I considered a hooks library and rejected it for 15 lines of native code. If the fixer wants the smallest diff, steps 1-4 alone already remove the two files and the reader copy.

### common-primitives-02 - Finish audit 2's Q7: one help-bubble machine instead of three, and the only `@base-ui/react/tooltip` import goes
- **Where**:
  - `src/components/common/info-tooltip.tsx:23-83` (`InfoTooltip`: base-ui Popover with hand-wired hover and tap). It has one caller in the whole tree, `float-field.tsx:283` inside `FloatArea`, and `FloatArea` has one caller, `collection/photo-questions.tsx:159`.
  - `src/components/auth/signup-form.tsx:31-145` (`useHoverCapable` + `InfoTip`: a hand-rolled bubble with its own matchMedia, a `useLayoutEffect` repositioner, outside-click and Escape listeners, and an `m.div role="tooltip"`), used at `:538` ("Still at Rishi Valley?", `fit`) and `:568` ("What does batch mean?").
  - `src/components/common/verified-mark.tsx:50-114` (`VerifiedMarkInner`: base-ui **Tooltip**, portalled since `9430ab96`, 2026-09-15). It is the only file in the repo importing `@base-ui/react/tooltip` (`grep -rln "@base-ui/react/tooltip" src` returns 1).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous (the owner already answered: audit-2 `fix-prompt.md:361`, Q7, "(a) — all three help bubbles onto one piece of machinery, **look unchanged**. Not the plain browser box.")
- **Evidence**: Q7 is at `fix-prompt.md:153-158` (rows G2 and #7). The board (`:90`) lists G1 and G7 shipped and G3-G6/G10/G11 parked; G2 appears nowhere, and no commit touched it (`git log -S"function InfoTip" -- src/components/auth/signup-form.tsx` shows only the 2026-07-04 creation and a 2026-07-18 edit). So today there are still three machines: base-ui Popover (InfoTooltip), base-ui Tooltip (VerifiedMark, which replaced its hand-rolled label on 09-15 to stop clipping) and signup's hand-rolled InfoTip. On bytes, bundle-build-07 measured the Tooltip stack at ~10 KB raw / ~3.5 KB gz eager on `/profile/[id]` and `/directory`. VerifiedMark renders only there: `directory/profile-card.tsx:110` (through `directory-grid.tsx`, inside `directory-client.tsx`) and `profile/letterhead-profile.tsx:974,995`. Both routes already import base-ui Popover statically (`directory-client.tsx:13` imports FilterPopover; `letterhead-profile.tsx:57-61` imports `ui/popover`).
- **What to do**:
  1. Generalise `InfoTooltip` into the one bubble. Add `trigger?: ReactElement` (default: today's (i) button), add `"right"` to `side`, and add `popupClassName`, so each surface keeps its own look (Q7's condition). It already opens on hover, tap and focus.
  2. VerifiedMark: pass the Leaf glyph (keeping `role="img"` and its `aria-label`) as the trigger and the ink label classes as `popupClassName`. Delete `VerifiedMarkInner` and the Tooltip import. No `dynamic()` is needed: the Popover code is already in both routes' static graph, so this removes the Tooltip code rather than moving it. `verified-mark.test.mjs:21-26` asserts the literal `<Tooltip.Portal>`; re-point it at the shared bubble's portal, or at "no `absolute top-1/2`", in the same commit.
  3. Signup: replace `InfoTip` and `useHoverCapable` (≈115 lines) with the shared bubble, loaded the way `float-field.tsx:21-24` loads it (`dynamic(..., { ssr: false })`). Warm the chunk on idle after hydration (the preload pattern `alumni-map` and the image viewer use), so the first tap on a phone does not wait for the floating stack that B1 measured at ~145 KB raw off the auth pages.
  4. Screenshot the three looks before and after: signup's two bubbles at 390 and 1440 (including the `fit` one), the Collection's edit/contribute hint, and a teacher's leaf on `/directory` and on a profile.
- **Saving**: ~−120 lines (signup −115 +6; VerifiedMark −30 +10; InfoTooltip +10), one machine fewer (the Tooltip module leaves the app), ~10 KB raw / ~3.5 KB gz eager off `/profile/[id]` and `/directory` (bundle-build-07's figure; re-measure), and audit 2's Q7 closed.
- **Risk & gate**: medium. The look must not change, since that was the owner's condition. For a11y, the leaf keeps `role="img"` and `aria-label`, so the label is announced whichever engine draws the popup. Gates: `npm run check` (`verified-mark.test.mjs`; `focus-recipe.test.mjs`, where signup-form's BORDERLESS entry is unaffected); `npm run visual` (directory baseline); the screenshots above; a throttled-3G tap on `/signup`'s (i) at 390, to confirm the idle warm hides the fetch.
- **Confidence**: medium. The byte half is bundle-build's measurement; the risk is first-tap latency on the auth page, and there is a fallback.
- **Notes**: If first-tap latency on `/signup` is visible even with idle warming, do steps 1-2 only (two machines instead of three, the Tooltip gone), and record Q7 as "partly done: the auth pages keep a hand-rolled bubble because the shared engine is 145 KB". bundle-build-07 proposes lazy-loading the Tooltip behind VerifiedMark. This finding is the alternative that also answers Q7 and needs no dynamic import. Pick one, not both.

### common-primitives-03 - Give `SpringPress` real element props: 36 `as object` casts and six hand-inlined copies go
- **Where**: `src/components/common/motion.tsx:150-174`. Props are typed `{ children; className?; onClick?: () => void; as?: "button" | "div" | "a" | "span" } & MotionProps`, and `:162` resolves the element with `const Comp = (m as unknown as Record<string, typeof m.button>)[as] ?? m.button;`.
  - Casts in shipped code (10 in 7 files): `collection/contribute-room.tsx:1218`, `posts/comments-section.tsx:617-621`, `posts/create-post-form.tsx:907-919` and `:937-944`, `common/attach-image-dialog.tsx:176-188`, `common/location-picker.tsx:319` and `:361`, `common/tag-input.tsx:91`, `catchups/answer/photo-attachments.tsx:127` and `:141`.
  - Casts in the lab: 26 (`grep -rn "as object)" src/app/lab | wc -l`).
  - SpringPress's exact press (`whileTap={{ scale: 0.93 }}` + `transition={SPRINGS.snappy}` on an `m.button`) typed out by hand: `love-button.tsx:95-96`, `share-button.tsx:52-53`, `bookmark-button.tsx:63-64`, `posts/post-card.tsx:684-685`, `catchups/edition/reader-parts.tsx:548-549`, `support/bird-picker.tsx:94-95`.
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: every cast has the shape `{...({ type: "button", "aria-label": ..., disabled, ... } as object)}`. `as object` erases the type, so `aria-lable` or `dissabled` would compile, and `attach-image-dialog.tsx:176-188` smuggles native `onDragOver`/`onDragLeave`/`onDrop` through the same hole. Audit 2 raised this as `fresh-code-11` (38 casts then). It was never routed to a phase row (grepping audit 2's `report.md` and `fix-prompt.md` for `fresh-code-11` finds nothing), so it is still open. In shipped code `as` is only ever "button" (7 times explicitly, which is redundant, and 3 by default); the lab uses `div` (11) and `a` (2). DESIGN-SYSTEM §7 calls SpringPress "mandatory on every clickable". In shipped code 7 files use it and 6 more type its body out by hand, which is what you would expect when the primitive cannot take `aria-pressed` without a cast.
- **What to do**: type the props as a union discriminated on `as`: `({ as?: "button" } & HTMLMotionProps<"button">) | ({ as: "div" } & HTMLMotionProps<"div">) | ({ as: "a" } & HTMLMotionProps<"a">) | ({ as: "span" } & HTMLMotionProps<"span">)`. Keep `whileTap`/`transition` overridable by spread order as today, and drop the `onClick?: () => void` override (it currently throws away the event). Then delete the 36 casts (spread the attributes plainly), drop the 7 redundant `as="button"` in shipped code, and turn the six hand-typed presses into `<SpringPress ...>`: their extra props (`aria-pressed`, `onPointerEnter`, `aria-controls`) now typecheck. TypeScript will flag any site that passed something its element does not accept, which is the point.
- **Saving**: 36 type-erasing casts; ~−12 lines (six `whileTap`/`transition` pairs); 7 redundant attributes; one press definition instead of seven.
- **Risk & gate**: low. `npm run check` (tsc is the proof); `motion-namespace-rule.test.mjs` stays green (still `m.`); `attach-well.test.mjs` asserts `WELL_PRESS` in contribute-room and is unaffected. Spot-check that the Collection's contribute well, the composer's two icon buttons and the comment send button still press.
- **Confidence**: high.
- **Notes**: I rejected deleting SpringPress in favour of a `{...PRESS}` spread on `m.button`: that touches 65 lab sites for no gain once the type is right. -05 builds on this.

### common-primitives-04 - One people search: fold the mention dropdown's copy into `useUserSearch`, and give the Catch-up pickers the "Low 100" fix they are missing
- **Where**: `src/components/common/use-user-search.ts:30-88` (debounce 200 ms, a request-id guard, results kept across queries); `src/components/posts/mention-dropdown.tsx:24-68` (a second 200 ms debounced fetch of the same `/api/users/search`, holding `{ query, users }` together); the hook's consumers `catchups/create/people-picker.tsx:87,142-170` and `catchups/home/people-door.tsx:190,241-266`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - The hook's docblock calls itself "the debounced people search behind every 'find someone by name' field" (`:4-5`). The composer's @-mention dropdown does not use it (`grep -rn "api/users/search" src --include=*.tsx | grep -v src/app/api` finds the hook and `mention-dropdown.tsx:49`).
  - The two copies have drifted. `mention-dropdown.tsx:25-29` carries audit Low 100's fix: "Held apart, the list kept showing the previous query's people while a new one was in flight ... long enough to press Enter on the wrong person".
  - `useUserSearch` keeps the old query's `results` until the new response lands, and both Catch-up pickers render `results` while `searching` (`people-picker.tsx:142,170`; `people-door.tsx:243`). That is the failure Low 100 fixed, still present in two places.
- **What to do**:
  - In `useUserSearch`, hold `{ query, people }` together and return only people whose query equals the current trimmed query (the dropdown's rule). Keep the request-id guard and `reset`.
  - Widen `SearchedPerson` with `accountType?: string | null`; the route already selects it (`api/users/search/route.ts:74`).
  - Replace `mention-dropdown.tsx:24-68` with `const { results, searching } = useUserSearch(query);` and keep its rendering. Pass no `alumniOnly`: the composer must find teachers (bug-report-2 C-006).
  - Correct the hook's docblock.
- **Saving**: ~−25 lines in mention-dropdown; one search instead of two; a stale-result bug closed in both Catch-up pickers.
- **Risk & gate**: low. `npm run check`. In the composer, type `@as` and then `h`: no stale row should remain. Check the Catch-up create form's people picker and the home's People → Add. `/api/users/search` does not change.
- **Confidence**: high.
- **Notes**: mention-dropdown is the feed territory's file; this is written from the primitive's side. The bug half is flagged to the bug lens below too.

### common-primitives-05 - One action-pill shell for the five post-row buttons, and one comments toggle instead of two
- **Where**: the same `m.button` shell (rounded-full, `px-2.5 py-1.5 text-sm`, the `state-layer` / on-dark pair, the 2px leaf focus ring, `whileTap 0.93` + `SPRINGS.snappy`) appears at:
  - `common/love-button.tsx:89-111`, `common/share-button.tsx:47-63`, `common/bookmark-button.tsx:57-72`;
  - `posts/post-card.tsx:677-690` (the comments toggle);
  - `catchups/edition/reader-parts.tsx:541-554` (the replies toggle). Its className is byte-identical to post-card's, `"state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"`, with the same `ChatCircle size={18}` and the same preload-on-hover wiring.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (one pixel-level choice flagged below)
- **Evidence**: read side by side. The on-dark branch is written twice and has drifted: love uses `text-white/85` (`:106`), share uses `text-white/80` (`:60`). Audit 2's trap list (`fix-prompt.md:775`) says to pick one deliberately. Audit 2 raised the love/share/bookmark half as `shell-primitives-14`; it was never routed. Since then the comments toggle was copied into the Catch-up reader, which makes five.
- **What to do**:
  - After -03, export `actionPill({ onDark, className })` returning the shared class string, from `love-button.tsx` or from a new `common/action-pill.ts`.
  - Render all five through `SpringPress`.
  - Optionally extract `CommentsToggle({ open, count, controls, onToggle, onWarm, labels })` for the post-card / reader pair.
  - Choose `white/80` or `white/85` for on-dark, and screenshot the viewer's heart and share over a bright photograph.
- **Saving**: ~0 to −10 lines (audit 1's "dedupe cannot save lines" applies). Five spellings of one control become one, and the on-dark drift closes.
- **Risk & gate**: low-medium (pixels, if the two whites are unified). `npm run visual` (feed and letters baselines); the viewer screenshot; `npm run check`.
- **Confidence**: high on the duplication. The payoff is consistency, not size.
- **Notes**: do not merge LoveButton, ShareButton and BookmarkButton themselves. Each owns a distinct animation (the heart pop and flecks, the check crossfade, the ribbon pour), and their docblocks say "do not fork this". Only the shell is shared.

### common-primitives-06 - Draw the Catch-up "Rhythm" control with `SegmentedPills` instead of a 78-line copy of it
- **Where**:
  - `src/components/catchups/create/cadence-control.tsx:1-78`: a canopy thumb on a `layoutId` (`:58`), `role="radiogroup"`, the same `EASE_SEGMENT_GLIDE` / `SEGMENT_GLIDE_SECONDS`, and the same thumb class as `segmented-pills.tsx:157`. One caller: `create/create-catchup-form.tsx:155`.
  - The loading screen hand-draws a third copy of the track: `(main)/catchups/new/loading.tsx:54-65` ("Rhythm: the cadence track (cadence-control.tsx)").
  - The shared control: `src/components/common/segmented-pills.tsx:70-176`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - Its own comment (`:62-67`) says: "Not SegmentedPills: this track wraps to a second line on a narrow create-form (`flex-wrap`), which the shared component deliberately doesn't support (see its file header)."
  - The header (`segmented-pills.tsx:3-41`) says no such thing. It lists the Catch-ups cadence as a caller ("'radiogroup' (signup, Catch-ups)", "Catch-ups' `bg-muted/40`"), so the two docblocks contradict each other.
  - SegmentedPills already passes `className` to the track, so `className="flex-wrap bg-muted/70"` is the whole difference.
  - The copy also carries a dead Tailwind v4 transition (`:52`, `transition-[color,transform]` beside `active:scale-[0.97]`: the trap `photo-river.tsx:193-212` documents).
- **What to do**:
  - Replace the body with `<SegmentedPills segments={OPTIONS.map((k) => ({ key: k, label: labels[k] }))} value={value} onChange={onChange} ariaLabel="Rhythm" layoutId="cadence" role="radiogroup" className="flex-wrap bg-muted/70" />`, or call it straight from `create-catchup-form.tsx:155` and delete the file.
  - Draw the loading track with `SegmentedPillsSkeleton segments={Object.values(CADENCE_LABELS).map((label) => ({ label }))}`, so the skeleton reads the control's geometry from `control-geometry.ts` instead of a copy.
- **Saving**: ~−63 lines (−55 in the control, −8 in the loading screen), or −78 and a file. One segmented control in the app instead of two, and SegmentedPills' header is true again.
- **Risk & gate**: low. Visually, a segment is `h-8 px-3.5 sm:px-4` where the copy is `px-4 py-1.5`, so up to 2px narrower per segment on a phone. Screenshot `/catchups/new` and its loading state at 390 and 1440; `npm run visual`; `npm run check`.
- **Confidence**: high.
- **Notes**: catchups-ui-20 changes the same file's data flow (the `labels` prop becomes an import of `CADENCE_LABELS`); do the two in one commit.

### common-primitives-07 - Drop `LocationPicker`'s single mode, which only the lab harness uses (audit 2's row #13, never asked)
- **Where**:
  - `src/components/common/location-picker.tsx`:
    - the docblock `:34-42`;
    - the discriminated union `:62-74`;
    - `initialQuery` and `lastAppliedRef` `:192-196`;
    - the sync effect `:198-206`;
    - the multi guard in `handleInputValueChange` `:234-240` (becomes unconditional);
    - the single branch of `handlePick` `:254-258`;
    - `clearSingle` `:288-293` and `showClear` `:295`;
    - the "Clear city" SpringPress `:351-365`;
    - the placeholder and aria ternaries `:347,349`.
  - The harness `src/app/lab/location-picker/page.lab.tsx:18,35-46` and its registry note `src/app/lab/_registry.ts:519`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: owner (it trims a lab room)
- **Evidence**: all three shipped callers pass `mode="multi"` (`admin/people/person-detail.tsx:603`, `profile/letterhead-profile.tsx:2036`, `onboarding/steps/register-step.tsx:132`). `mode="single"` appears once, at `lab/location-picker/page.lab.tsx:41`. Audit 2 recommended "drop" (report `:572`, row 13 / directory-profile-18), but row 13 never became one of the 28 questions (`grep "#13" fix-prompt.md` finds nothing) and was never done.
- **What to do**:
  - If the owner agrees, make the props `{ value: PlaceSelection[]; onChange; placeholder?; id?; "aria-label"? }` and delete every single-mode line listed above.
  - Delete the harness's Single card (13 lines), and "both single and multi mode" from the registry note.
  - While there: `handleOpenChange` (`:246-248`) is `setOpen` wrapped in a `useCallback`, so pass `setOpen` directly; hoist `itemToStringLabel` (`:278-281`) and `optionKey` (`:80-82`) to module scope; drop the unused `className` prop (-08).
- **Saving**: ~−60 lines in the picker, −14 in the lab harness.
- **Risk & gate**: low. `npm run check`. The three multi callers (the profile's cities pen, onboarding's register step, the admin person page) behave the same; `/lab/location-picker` still renders the multi picker.
- **Confidence**: high.
- **Notes**: `ui/combobox.tsx` (167 lines, ten exports) has this file as its only importer. That is audit 2's G4, parked by the owner (Q27); do not reopen it here.

### common-primitives-08 - Remove the optional props no caller passes (lab re-grepped)
- **Where** (each verified with the JSX-tag parser across all of `src/`, lab included, and a plain grep):

  | Prop | Where | Callers passing it |
  |---|---|---|
  | `IdentityRow.avatarClassName`, `avatarLinkClassName` | `identity-row.tsx:38-39, 57-58, 67, 79` | 0 of 8 sites (IdentityRow has no lab caller) |
  | `FloatField.containerClassName`, `FloatArea.containerClassName` | `float-field.tsx:82,92,95` and `:165,180,216` | 0 anywhere |
  | `FloatArea.bare`, and the bordered branch it gates | `float-field.tsx:163,172-179,242-243`; the `FIELD_FOCUS` import `:5` | the only caller (`collection/photo-questions.tsx:159`) always passes `bare`; `/lab/focus` names "the old FloatArea" in a string only |
  | `FloatArea.className` | `float-field.tsx:164,245` | 0 |
  | `FilterSheet.title` (default "Filters") | `filters/filter-sheet.tsx:17,25,35` | 0 of 2 |
  | `FilterPopover.className` | `filters/filter-popover.tsx:98,104,111` | 0 of 2 |
  | `SentenceLine.className` | `filters/sentence-line.tsx:69,88,97` | 0 of 6 (lab included) |
  | `SegmentedPillsSkeleton.className` | `skeleton.tsx:88,92,97` | 0 of 3 |
  | `RichTextArea.placeholder` and its empty-state machinery | `rich-text-area.tsx:35,46,59,68,80,103` | 0 of 2 (`catchups/answer/answer-card.tsx:114`, `posts/edit-post-dialog.tsx:97`); neither caller's className uses `data-empty` |
  | `TagInput.className` | `tag-input.tsx:31,38,78` | 0 of 1 |
  | `LocationPicker.className` | `location-picker.tsx:57,189,306` | 0 of 4 |
  | `FadeRise.style` | `motion.tsx:123,129,134` | 0 of 36 sites importing from `common/motion` |
  | `HouseOptions.tintIndexFor` optionality and its fallback | `house-options.tsx:54-59,84` | always passed, and the passed function always returns a number (`house-chain-editor.tsx:159-169`); goes with -10 |
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the table. `grep -rn "containerClassName\|avatarClassName\|avatarLinkClassName" src` returns only the defining files. FloatArea's docblock (`:147-157`) spends its first "deliberate difference" on the bordered look ("IT IS DRAWN AS A BORDER, NOT A FILL"), and no caller renders that look any more.
- **What to do**:
  - Delete each prop, with its destructure, its type line and the expression it feeds.
  - FloatArea: make the grouped-row (bare) look the only look. Drop `FIELD_FOCUS` from the import; FloatField keeps `FIELD_FOCUS_SHELL`, so `focus-recipe.test.mjs:64-85` still sees `ui/field-focus` imported. Rewrite the docblock's first bullet. Let its label reuse `FLOAT_LABEL_BASE` through `cn(FLOAT_LABEL_BASE, "top-[1.0625rem]")` instead of re-spelling it (`:252-253`).
  - RichTextArea: delete `placeholder`, `data-placeholder`, both `dataset.empty` writes and the `data-[empty=true]:before:*` class.
- **Saving**: ~−45 lines, 13 dead options.
- **Risk & gate**: low. `npm run check` (tsc catches any missed caller); `focus-recipe.test.mjs`; screenshot the description row in the Collection's edit/contribute dialog (the FloatArea) at 390.
- **Confidence**: high.
- **Notes**:
  - Left alone on purpose: `SentenceLine.right` and `FilterButton.open` (their only callers are in the lab room `lab/directory/_chrome.tsx`), `FadeRise.y` (lab-only), and `LoveButton.label` (every caller passes it; it could become required, not removed).
  - `SentenceLine`'s docblock at `:86` ("the directory puts its view toggle here") is stale: the directory uses `show` now.

### common-primitives-09 - Delete `BirdAvatar`'s inert `ring` prop and the deprecated `avatarSpecies` field
- **Where**:
  - `src/components/common/bird-avatar.tsx`:
    - `:61` (`ring = false`), `:66-82` (the 16-line docblock), `:86` (`ringStyle`), `:94` and `:142` (its two spreads);
    - `:18-20` and `:30-31` (`avatarSpecies`: "@deprecated unused in the real precedence chain — kept for older preview-mock callers").
  - `src/lib/catchups-types.ts:137` (`CatchupPersonRef.avatarSpecies`).
  - Lab sites passing `ring`: `lab/feed-canvas/page.lab.tsx:228`, `lab/tiles/_specimens.tsx:149`, `lab/profiles/_profile-avatar.tsx:180`, `_variant-dossier.tsx:262`, `_variant-editorial.tsx:196,249`.
  - Lab sites passing `avatarSpecies`: feed-canvas `:92,228,242`, and the profiles variants (`_variant-letterhead{,-2,-3}.tsx`, `_variant-dossier.tsx:260`, `_variant-broadsheet.tsx:248`, `_variant-editorial.tsx:201,254`, `_variant-field-guide.tsx:341`).
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - No shipped caller passes `ring` (tag parse: 0 of the 30 shipped BirdAvatar sites; 6 of the 73 lab ones). The Catch-up card that passed it at audit 2 (`your-catchups-card.tsx`, row A17) no longer exists.
  - All six lab callers render photo-less users (`photoUrl: null`, including `lab/profiles/_data.ts:128`). That is the bird path, where the docblock itself calls the ring "deliberately inert", because `BG_MODE` is "none" (`bird-avatar-v2.tsx:1768`). Removing the prop changes no pixel anywhere.
  - `avatarSpecies` is read nowhere (`grep -rn avatarSpecies src/components src/lib` finds only the types and a comment).
- **What to do**:
  - Delete `ring`, `ringStyle`, both spreads and the docblock. Keep the `clipped` switch: BG_MODE is T10's.
  - Delete `avatarSpecies` from `AvatarUser` (and its sentence in the file header) and from `CatchupPersonRef`.
  - Remove `ring` and `avatarSpecies` from the lab literals; excess-property errors will list them.
- **Saving**: ~−25 lines in shipped code; 17 lab attributes; one "do not fix this" docblock for a prop nobody uses.
- **Risk & gate**: low. `npm run check`; `/lab/profiles`, `/lab/tiles` and `/lab/feed-canvas` look identical (they already drew no ring).
- **Confidence**: high.
- **Notes**: the profiles lab rooms pass `avatarSpecies: ROLLER_SPECIES_INDEX`, expecting the Indian Roller. They have silently shown the id-hashed bird instead ever since `avatarSpecies` left the precedence chain. `birdOverride: "indian-roller"` would show the bird they meant, but that is a visible lab change and so the owner's call. Removing the dead field does not change what the rooms show today. Audit 2's A17 is moot.

### common-primitives-10 - Move `HouseOptions` beside its only caller, and make its tint function required
- **Where**: `src/components/common/house-options.tsx` (137 lines):
  - `:9` imports `HOUSE_TINTS_HOVER, HOUSE_TINTS_PANEL` from `@/components/profile/houses-chain`;
  - `:54-59` is the optional `tintIndexFor` and its docblock;
  - `:84` is the fallback.

  Its one importer is `src/components/profile/house-chain-editor.tsx:36`.
- **Phase**: relocate
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**:
  - `grep -rn "house-options" src` finds the file itself and `house-chain-editor.tsx:36`.
  - It was shared with `HousePicker` until `1906c68b` (2026-09-07, owner Q17: "delete the whole house picker lab"). Since then it has been a profile component living in `common/` and reaching back into `profile/` for its colours. That is the only `common/` → feature-folder import in my territory.
  - The fallback, `tintIndexFor?.(h) ?? (selected ? picked : 0)` ("what a caller without a chain beside it would want"), served the deleted picker. The editor's `tintIndexFor` (`house-chain-editor.tsx:159-169`) returns a `number` on every path.
- **What to do**:
  - `git mv src/components/common/house-options.tsx src/components/profile/house-options.tsx` and fix the one import.
  - Make `tintIndexFor: (house: string) => number` required. Drop `?? (selected ? picked : 0)` and the docblock's fallback sentence (`:56-58`).
  - While there, `house-chain-editor.tsx:24-31`'s header describes the panel as "Two columns, 44px rows, ... the canopy check for selection", but it has been a field of pills since 2026-08-07. Fix that one sentence.
- **Saving**: 1 file out of `common/`, 1 inverted dependency, ~−4 lines.
- **Risk & gate**: low. No test pins the path. `npm run check`; open a profile's houses in edit mode at 1440 (popover) and 390 (sheet).
- **Confidence**: high.
- **Notes**: I applied the same test to every one-caller primitive (census below). Only HouseOptions reaches into a feature folder. The others (`FloatArea`, `InfoTooltip`, `TagInput`, `YearInput`, `useClosingDialog`, `usePinchZoom`, `useCoarsePointer`) are generic by construction and stay.

### common-primitives-11 - Delete the zero "nudge" that puts a transform on every identity row
- **Where**: `src/components/common/identity-row.tsx`:
  - `:8` ("Edit these two numbers to tune every avatar/name/batch row in one place");
  - `:10` (`const IDENTITY_COPY_NUDGE_Y_PX = 0; // Negative moves text up; positive moves it down.`);
  - `:91` (`transform: \`translateY(${IDENTITY_COPY_NUDGE_Y_PX}px)\``).
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `git log -S'IDENTITY_COPY_NUDGE_Y_PX'` finds one commit, `b2110669` (2026-07-03), which added it at `0`; it has never held any other value. The result is an inline `transform: translateY(0px)` on the text column of every IdentityRow, on 8 shipped surfaces (feed posts, comments, letters, the viewer byline, the rails, admin). It moves nothing, but it still creates a stacking context and a containing block for fixed-position descendants.
- **What to do**: delete the constant and the `transform` entry, and keep `gap: IDENTITY_STACK_GAP_PX`. Reword `:8` to name the one number that remains.
- **Saving**: −3 lines; one stacking context per rendered identity row.
- **Risk & gate**: low. `npm run visual` (the feed, letters and collection baselines all render identity rows). `src/lib/identity-row-overflow-rule.test.mjs` is unaffected.
- **Confidence**: high.

### common-primitives-12 - Button: one name for the CTA fill, and stop callers restating its defaults
- **Where**:
  - `src/components/ui/button.tsx:76-79` (`default: CANOPY_FILL` beside `primary: CANOPY_FILL`) and `:133` (`defaultVariants.variant: "default"`).
  - `src/components/profile/letterhead-profile.tsx:713` (`variant={live ? "primary" : "default"}`) and `:719` (`className="rounded-full"`).
  - `lab/profiles/_variant-dossier.tsx:593` (`variant="default"`).
  - 29 shipped `<Button type="button">` and 21 shipped `<Button className="... rounded-full ...">`. The `rounded-full` sites:
    - `collection/collection-client.tsx:1522,1608`
    - `collection/contribute-room.tsx:1004,1011,1320,1332`
    - `common/filters/filter-sheet.tsx:54`
    - `directory/directory-client.tsx:730,742,769`
    - `posts/post-feed.tsx:330`
    - `profile/admin-profile-tools.tsx:75,88,101,114`
    - `profile/get-in-touch.tsx:303,318`
    - `profile/letterhead-profile.tsx:712`
    - `profile/profile-author-feed.tsx:173`
    - `pwa/install-app-tile.tsx:178,196`
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**:
  - The two variants are one constant. The letterhead's ternary has compiled to the same classes since it was written (`c7e95407`, 2026-08-07, when both were already `CANOPY_FILL`). "Done" and "Edit profile" look identical by construction, while the code reads as if they differ.
  - base-ui's Button already emits `type="button"` for native buttons (`node_modules/@base-ui/react/use-button/useButton.js:82-84`, merged under the caller's props).
  - The base class already carries `rounded-full` (`button.tsx:72`). DESIGN-SYSTEM §3 says: "Fix this in the shared Button primitive so it is the default for every variant — not something each caller has to remember".
  - Tag-parser counts: `type="button"` 29 shipped + 12 lab; `rounded-full` in a Button className 21 shipped + 3 lab.
- **What to do**:
  - Delete the `default` variant and set `defaultVariants.variant: "primary"`. Letterhead `:713` becomes `variant="primary"` (or nothing); the lab's `variant="default"` becomes `"primary"`.
  - Remove `type="button"` from `<Button>` only (never from a raw `<button>`, and keep every `type="submit"`).
  - Remove `rounded-full` from Button classNames.
- **Saving**: ~−30 lines (most `type="button"` attributes sit on their own line), 50 restated attributes, one variant name.
- **Risk & gate**: low. tsc flags any `variant="default"` left behind; `npm run check` (`focus-recipe.test.mjs:95-101` reads button.tsx); `npm run visual` should show no diff.
- **Confidence**: high.
- **Notes**:
  - `size: "default"` stays: sizes do have a real default.
  - Catch-ups' settings draws a cinnamon "one-way" button as `variant="ghost"` plus a className (`settings-surface.tsx:614,648-651`). If a second surface wants that look, it should become a variant here rather than a second className.
  - `bundle-build-03` (take the Button chain out of the root `error.tsx`) is independent of this.

### common-primitives-13 - One removable chip for the location picker and the tag input
- **Where**: `src/components/common/location-picker.tsx:311-323` and `src/components/common/tag-input.tsx:83-95` are identical:
  - the sky chip `inline-flex max-w-72 items-center gap-1.5 rounded-full border border-sky/35 bg-sky/[0.10] py-1 pr-1.5 pl-3 text-sm font-medium text-sky`;
  - a truncating label;
  - an x button: a SpringPress with the same ~250-character class string and an `as object` cast.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: tag-input's own comment (`:83-84`) says the chip is "byte-for-byte the same classes as the location picker's city chips". That is a promise to keep two files in step, with nothing enforcing it. Also, the x is canopy-tinted (`text-canopy/70 hover:bg-canopy/20 focus-visible:outline-canopy`) on a sky chip.
- **What to do**: add `RemovableChip({ label, onRemove, removeLabel })`, exported from `tag-input.tsx` or as a 20-line `common/removable-chip.tsx`, and render it in both files. While there, decide the x's colour once (sky to match its chip, or keep canopy) and give it the leaf focus ring (-14).
- **Saving**: ~−8 lines, one keep-in-step comment, and two casts (with -03).
- **Risk & gate**: low. Screenshot the profile's cities pen and the onboarding register step (cities, and a teacher's subjects) at 390.
- **Confidence**: high.

### common-primitives-14 - Filters kit: inline the single-use popup, fold the twin year selects, and cut the comments that describe the old canopy-wash pills
- **Where**:
  - **Single-use helper**: `filters/facet-select.tsx:28-58` (`FacetOptionsPopup`, whose own docblock says "It was shared with SortPill until 2026-09-05 ... FacetSelect is the only caller now") and its call at `:102`.
  - **Twin year selects**: `filters/range-facet-pill.tsx:84-113`. The From and To `<label><select>` blocks are identical apart from value and onChange (jscpd: `range-facet-pill.tsx [88:72-98:23] ↔ [103:72-113:23]`).
  - **Stale comments**:
    - `filters/pill-shell.tsx:9-13` says "Idle sits on the warm `--secondary` surface ... Set tints canopy". Since 2026-08-28 `PILL_IDLE` is `bg-transparent` and `PILL_SET` is solid canopy.
    - `pill-shell.tsx:53-60` describes the "0.08 -> 0.16" canopy hover ramp and "selection stays canopy/[0.08]". That ramp no longer exists.
    - `pill-shell.tsx:138-143` says the FacetClearButton "Keeps a canopy wash ... canopy/15 over the pill's canopy/[0.08] measures -7.25 dL*". The code is `hover:bg-white/20`, and `:153-155` explains that correctly.
    - `pill-shell.tsx:15-20` and `range-facet-pill.tsx:127-129` justify a canopy focus ring because "--ring (leaf) is the INPUT ring". The 2026-08-29 focus protocol reversed that: one leaf ring on every control.
    - `filters/facet-select.tsx:13-15` says "the `--accent` wash is the hover/keyboard-highlight state". It is `state-layer`.
    - `filters/filter-popover.tsx:53-60` says "The facet pills keep --secondary" and "--secondary is #F0EDE4". It is `#EAE7DC` (`globals.css:48`), and the pills are transparent.
  - **The canopy focus rings those comments justify**: `pill-shell.tsx:35` (`ring-canopy/40`, a half-alpha halo), `range-facet-pill.tsx:137`, `filter-sheet.tsx:49`, `sentence-line.tsx:50,134`, plus the two chip x's in -13.
  - **Audit 2's duplication-13**: the pill trigger (`div.facetPillClass > Trigger[data-facet-trigger] > span.truncate + ChevronDown`, then `FacetClearButton`) is spelled three times: `facet-select.tsx:92-101`, `facet-search-select.tsx:89-98`, `range-facet-pill.tsx:64-73`. It was four before SortPill was deleted.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: above. `pill-shell.tsx` has a comment-to-code ratio of 3.11 (115 comment lines to 37 code, `raw/cloc-by-file.csv`), and about 26 of those 115 lines describe code that is gone. One of each, as the brief asks:
  - KEEP, because it carries a reason, an owner quote and a date: `:42-50`, "No fill at rest. It was `--secondary`, a warm cream, and the owner's verdict on 2026-08-28 was blunt: 'I don't like the colours of the filtering pills...'".
  - CUT, because it describes deleted code: `:53-60`, "Set KEEPS a canopy hover ... 0.08 -> 0.16 measures -4.19 / -4.62 ... The RESTING Set appearance is untouched: selection stays canopy/[0.08]."
- **What to do**:
  - Inline `FacetOptionsPopup` into `FacetSelect`; the `anyItem` object becomes the `ANY` row directly.
  - Add a local `YearSelect({ value, onChange })` in range-facet-pill.
  - Delete or rewrite the listed comment blocks.
  - Move the seven canopy rings to the protocol's `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`. It is a visible colour change on keyboard focus only, and the owner's 08-29 decision already covers it.
  - The shared trigger (duplication-13) is optional: a `FacetTrigger` that takes the Select or Popover trigger as a render element saves ~5 lines. Do it only if you are touching all three anyway.
- **Saving**: ~−24 code lines, ~−26 comment lines, 7 off-protocol focus rings.
- **Risk & gate**: low. `npm run check`. Check `/directory` and `/admin/people` filters at 1440 (popover) and 390 (sheet), and Tab through the pills and presets to see the leaf ring. `npm run visual` (the directory baseline masks the map, not the toolbar).
- **Confidence**: high.
- **Notes**: the kit itself (8 files for two consumer surfaces) is not bloat. `FacetSearchSelect` and `RangeFacetPill` each have one caller, but they are the kit's documented variants, and the directory plus three admin lists all use the kit. Audit 2's two orphan files (`active-filter-chips.tsx`, `result-count.tsx`) were deleted in `d9adbca8`; `docs/spec/admin.md:425` still names `ResultCount`.

### common-primitives-15 - `BookmarkButton`: take its SVG id from `useId()` instead of a required prop
- **Where**: `src/components/common/bookmark-button.tsx:34,40-41` (`id: string`, "Unique per instance: namespaces the SVG clipPath id so multiple cards don't collide") and `:91,101` (`bm-${id}`). Callers: `posts/post-card.tsx:695`, `letters/letter-engagement.tsx:77`, and in the lab `_variant-dossier.tsx:439`, `_variant-broadsheet.tsx:495`, `_variant-terrace.tsx:484`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: React 19's `useId()` exists for exactly this. Both shipped callers pass the post id, which collides if one post renders twice on a page: a clipPath defined twice under one id lets the second ribbon reference the first.
- **What to do**: `const clipId = useId();` inside the component; delete the prop and its five `id=` lines.
- **Saving**: −6 lines, one required prop, one class of id collision.
- **Risk & gate**: low. `npm run check`; save a post on `/feed` and a letter, and watch the pour animation.
- **Confidence**: high.

### common-primitives-16 - Correct the primitives' docblocks that describe callers, colours or files that are gone
- **Where**:
  - `love-button.tsx:42-43` names "feed posts, comments, the Collection, group posts"; Groups have been removed.
  - `love-button.tsx:49` says "Per DESIGN-SYSTEM sec. 7 / PUNCHLIST"; PUNCHLIST.md was folded into bugs.md in `44579fb4` (2026-07-02).
  - `share-button.tsx:10` and `bookmark-button.tsx:8` also say "group posts".
  - `bookmark-button.tsx:116-120` tunes the stroke against "16px Lucide icons at strokeWidth 2". The siblings are now Phosphor 18px `ShareFat` and `ChatCircle` regular; the value still lands at ~1.1px either way.
  - `motion.tsx:7` says "Light-mode app"; dark mode shipped on 2026-08-02.
  - `info-tooltip.tsx:19-21` gives "e.g. settings' batch-year note" as an example; its only caller is FloatArea.
  - `person-name.tsx:3` says "Used everywhere a name appears". It has 2 callers, and 14 other shipped sites build their own profile link, rightly.
  - `use-user-search.ts:4-5` says "every ... field" (see -04).
  - `confirm-dialog.tsx:16` says "The one confirmation in the panel". It has 12 call sites in 7 files, across posts, letters, the Collection, profile and admin.
  - `location-picker.tsx:40-42` says "signup, the profile's cities pen and the admin person page all hand it the same two props". The caller is the onboarding register step, not signup, and callers pass four or five props.
  - `verified-mark.tsx:16-23` gives the portal's rationale in terms of IdentityRow and the post card. The leaf left post bylines the same day (`69293b5f`) and now draws on directory cards and the profile letterhead. Keep the portal; update the sentence.
  - `bird-avatar.tsx:22-23` lists four sizes. Shipped callers also pass 22, 30, 32, 34, 36, 44, 72 and 80 as numbers.
  - `ui/sonner.tsx:16`: the fallback in `var(--color-leaf, var(--primary))` can never apply.
  - `ui/sonner.tsx:36` and `:44` set the 12px radius twice, once as Sonner's `--border-radius` and once inline.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each claim was checked against the tree (the grep counts are above and in the census).
- **What to do**: rewrite each sentence to what is true, or delete it where it only restates history the commit log already holds. In `sonner.tsx`, keep one radius (the CSS variable Sonner reads) and drop the dead fallback.
- **Saving**: ~−8 lines; 13 misleading sentences.
- **Risk & gate**: none. `npm run check`.
- **Confidence**: high.
- **Notes**: kept on purpose, as reasoned comments:
  - `motion.tsx:62-87`: EASE_SEGMENT_GLIDE's measured damping ratios and the owner's 2026-08-02 "bounce";
  - `identity-row.tsx:15-26`: the 10.5px byline the owner reverted to;
  - `float-field.tsx:8-20`: B1's measured 145 KB;
  - `love-button.tsx:16-31`: two owner quotes on heart size.

## Owner decisions

**A. The single-city version of the city search box**
- **What I'd change:** the city search box on your profile, in onboarding and on the admin person page picks several cities. Built into it is a second version that picks one city. Nothing on the site uses that second version; only the "Location picker" testing room in the lab shows it. I'd delete the single-city version and that half of the testing room.
- **What you'd notice:** nothing on the site. The lab testing room would show one test box instead of two.
- **If I guess wrong:** if a future screen needs a one-city box, it gets rebuilt: about sixty lines, most of them straightforward.
- **Options:** (a) delete it and trim the room; (b) keep both.
- **If you don't reply I'll do:** (a). *(common-primitives-07; audit-2 row 13 / directory-profile-18)*

**B. The small sink when you press a button**
- **What I'd change:** when you press a button it is meant to sink slightly and ease back. Since a styling-library upgrade, that sink jumps in one frame instead of easing, on every standard button in the app and in about 27 other places. The code has asked for the eased version all along; a single word is missing from each one. I'd put it back.
- **What you'd notice:** buttons would glide down and back when pressed instead of snapping. Nothing else moves, and hover is untouched.
- **If I guess wrong:** you have been used to the snap for weeks. If the eased press feels soft, it is one word to take out again.
- **Options:** (a) fix the shared button and the dialog close button only; (b) fix it everywhere the same slip appears (29 places on the site, 39 in the lab); (c) leave it.
- **If you don't reply I'll do:** (a), then (b) once you have tried it. *(bug lens; `ui/button.tsx:72`, `ui/dialog.tsx:72`; the trap documented at `collection/photo-river.tsx:193-212`)*

## Not-findings
- `useMotionGovernor().ambientReduced` is always `false`, and none of its 8 callers reads it (all destructure `{ paused }`). DESIGN-SYSTEM §7 defends it as "the seam for an in-app toggle he might one day ask for; it must never be wired to matchMedia".
- `motion-features-max.ts` (a 14-line module) exists because a dynamic namespace import cannot be tree-shaken. It is pinned by `motion-namespace-rule.test.mjs:80-90`, and bundle-build confirms LazyMotion holds.
- `motion.tsx`'s single-caller constants (`AUTH_SLIDE_SECONDS` in 1 file, `SPRINGS.firm` in 2, `EASE_SEGMENT_GLIDE` in 2) are the timing and curve registry by design (DESIGN-SYSTEM §7: "import ... from motion.tsx. Never hand-type a cubic-bezier").
- `EASE_POP` `[0.34, 1.56, 0.64, 1]` and `EASE_SPRING` `[0.34, 1.5, 0.64, 1]` are two named curves 0.06 apart. Both have callers (`hoopoe.tsx` uses EASE_SPRING 26 times), and both are mirrored in `tailwind-theme.css:128-131` with a keep-in-step note. Merging them changes a feel and saves 0 lines.
- `pinch-zoom.ts` has 519 lines and one caller: one state machine, deliberately (its header says why the swipe moved in). The comment mass is decisions and measurements, e.g. "offsetWidth is ROUNDED TO A WHOLE PIXEL. Half a pixel of rounding becomes four at 8x ... Measured at 0.9px".
- The five `*.test.mjs` in the territory (`confirm-dialog`, `verified-mark`, `motion-namespace-rule`, `pinch-zoom`, `attach-well`) all pin subjects that exist, and two carry anti-vacuity guards. None is vacuous. `pinch-zoom.test.mjs:41-55` pins three literal constants (audit 2's lib-tests-09 called that scratch-shaped). My verdict is keep: they are an owner-settled feel, and the pin is 15 lines.
- `control-geometry.ts` is a server-safe values module out of necessity: a server component that imports a value from a `"use client"` file gets a client reference, not the value. That `BUCKET_WORD` (a Collection constant) lives there is the module's stated purpose, one registry of what the skeletons share with the client controls.
- `skeleton.tsx`, `identity-row.tsx`, `person-name.tsx`, `meta-dots.tsx` and `bird-avatar.tsx` are server components, correctly. Every importer of `motion.tsx` (a client module that exports constants) is itself a client module (checked), so no server file receives a reference instead of a value.
- `identity-row.tsx`'s `META_CLASS` at 10.5px was reverted by the owner on 2026-08-19, and the file argues it.
- `LoveButton`'s hardcoded `#E03A33` with `transition: none` is defended by DESIGN-SYSTEM Appendix B.
- `FlushAvatar` lives in `common/` with 3 shipped callers in Catch-ups; its header argues the move. The two lab copies are lab-catchups-05.
- `useClosingDialog` has one caller but is a generic hook. `letters/drafts-strip.tsx` should adopt it (bug lens, below).
- The 30 hand-built `/profile/${id}` hrefs: a helper would add a docblock and 30 imports for 0 lines saved.
- `bird-adjust.json` is 257 pretty-printed lines, generated by `scripts/dev/centroid.mjs` and bundled minified. Reformatting it would only game cloc.
- The bottom-sheet consolidation (`d422de66`) is complete in shipped code. Every rising panel is `BottomSheet`, and no hand-rolled bottom panel survives outside `ui/sheet.tsx`: `grep -E "fixed inset-x-0 bottom-0|rounded-t-(xl|2xl|\[)"` finds only `ui/card.tsx` and the landing's leaf pile. The replaced implementations were deleted, not left exported (settings-surface −187 lines, guide-overlay −90, filter-sheet rewritten). `SheetContent` stays for the two side drawers (the sidebar and the map's city list). The lab's own copies (`catchups/_settings.tsx`, the sketches) belong to the lab lenses.
- The toast wiring (`ui/sonner.tsx` plus `globals.css:647-690`): `cn-toast` is the hook the f9bca40f rules key on, and the four-selector specificity is explained (Sonner injects its stylesheet after ours).
- `FeedColumn` and `ContentColumn` each mount once by design (DESIGN-SYSTEM §9; "one spine").
- `"use client"` on the seven hook-only modules is redundant but harmless, with no bundle effect.
- `ConfirmDialog`'s `description` is optional although all 12 callers pass it. Its docblock defends the optionality (Carbon's rule, 2026-08-29).
- `FacetSearchSelect` and `RangeFacetPill` have one caller each but are the filter kit's documented variants.
- `BottomSheet`'s ref-plus-state pair in `useSwipeDownToClose` exists because of the React-compiler constraint its comment names.
- `LoveButton`, `ShareButton` and `BookmarkButton` stay three components, because each owns a distinct animation; only their shell is shared (-05).
- `Button`'s `detectIconSides` (the optical correction beside an icon) is load-bearing for every icon-plus-label pill.
- `ResponsiveDialog` (catchups-ui-25 asked me where it lives). Keep it local in `components/catchups/home/`: its two callers are both there, and the house editor's switch is popover-or-sheet, a different frame. Promote it to `ui/sheet.tsx` only when a third dialog-or-sheet caller appears outside Catch-ups. Pair it with -01 so its `phone` flag stops flipping.

## Audit carry-overs in this territory
- **A8** (dead-code-01/-03/-08 = directory-profile-06/-07 = shell-primitives-06): DONE. `d9adbca8` deleted `active-filter-chips.tsx`, `result-count.tsx`, `SortPill` and `HOUSE_OPTIONS`, and `button.tsx` has no `link`, `icon-xs` or `icon-lg` any more. Residue: `docs/spec/admin.md:425` still names `ResultCount`, and `FacetOptionsPopup` was left single-use (-14).
- **A17** (landing-mascot-avatars-06, BirdAvatar `ring`): resolved on 2026-09-05 by documentation (the owner kept the pixels). Now MOOT: no shipped caller remains (-09).
- **B1** (auth-edge-01, lazy InfoTooltip): DONE (`float-field.tsx:21-24`).
- **B8** (bundle-build-01, the `domMax` module): DONE (`motion-features-max.ts`). **dependency-diet-15** (the wrong test name): DONE; the comment now names the real file and records the old name.
- **D8** (directory-profile-05, HousePicker): DONE in `1906c68b`. The leftover is HouseOptions with a single caller (-10).
- **E11, the UI-kit tail**: OPEN.
  - duplication-13 (the filter pill trigger): 4 copies → 3 (optional step in -14).
  - duplication-08 `EmptyCard`, -11 `StepFooter`, -12 `useResendVerification`: none was built, and the twins remain: `auth/verify-email-banner.tsx:95-125` ≈ `auth/verify-email-dialog.tsx:94-124`, and the footers in `onboarding/steps/houses-step.tsx` and `register-step.tsx`. These live in the auth, onboarding and letters territories.
  - The mascot and collection halves are T10's and T04's.
- **G2 / Q7** (three tooltip systems): answered (a) on 2026-09-05, NEVER EXECUTED, and not on the board. There are still three machines today (-02).
- **G4** (shell-primitives-04/-05/-08): PARKED by Q27. `ui/combobox` still has one importer (location-picker).
- **Row #13** (directory-profile-18, LocationPicker single mode): never asked. Owner decision A (-07).
- **fresh-code-11** (SpringPress casts): OPEN, never routed to a row. 38 casts → 36 (-03).
- **shell-primitives-14** (the onDark block): OPEN, never routed. 3 copies → 5 (-05).
- **duplication-17 / media-viewer-15** (`clamp`): OPEN, now 8 definitions (6 shipped, 2 lab, one of them `pinch-zoom.ts:64`). A shared one-liner saves 0 lines, and importing hoopoe-kit's copy would pull in `common/motion` (audit 2's trap). Not worth a row.
- **fresh-code-08** (`usePinchZoom` returns a new object every render): OPEN. `image-viewer.tsx:491`'s keyboard effect lists `zoom` in its deps and so re-subscribes on every viewer render. The one-line fix is at the call site (T04, below).
- **lib-tests-09** (pinch-zoom.test.mjs's literal pins): OPEN. My verdict: keep (see Not-findings).
- **docs-17** (DESIGN-SYSTEM's stale LoveButton claim and others): OPEN (phase F was partial). `DESIGN-SYSTEM.md:453-455` still says "Today it only works in the feed" and names "groups".
- **catchups-ui-25** (where ResponsiveDialog lives): decided here (Not-findings, last item).

## For other lenses
- **Bug lens (the orchestrator decides what to relay):**
  - The Tailwind v4 `scale` trap in the primitives. `ui/button.tsx:72` lists `transition-[color,background-color,border-color,box-shadow,transform]` beside `active:scale-[0.97]`, so the press sink on every Button (205 tag sites) jumps instead of easing. The cause: v4's `scale-*` sets the standalone `scale` property, and `transition-transform` expands to `transform, translate, scale, rotate` (`node_modules/tailwindcss/dist/lib.js`) but an arbitrary list naming only `transform` does not. `ui/dialog.tsx:72` has the same shape. In all, 29 shipped sites and 39 lab sites have it; the largest shipped clusters are `layout/sidebar.tsx` (5), `layout/notification-bell.tsx` (2), `landing/landing-nav.tsx` (2), `landing/landing-footer.tsx` (2) and `directory/directory-client.tsx` (2) (found with `grep -rnoE 'transition-\[[^]]*transform[^]]*\]'` over lines that also carry a `scale-`). This is owner decision B.
  - `letters/drafts-strip.tsx:119-131` clears `deleting` on close, so ConfirmDialog's description flips to "this untitled letter" during its 180ms exit: exactly the bug `common/use-closing-dialog.ts` exists for.
  - Both Catch-up people pickers show the previous query's people under a new query (-04).
  - `settings/dark-gauntlet.tsx:242` uses a raw `autoFocus`, which opens the phone keyboard uninvited (DESIGN-SYSTEM §10); `useDeferredAutofocus` exists for this.
  - The directory's mobile `FilterButton` (`directory-client.tsx:584,590`) never gets `aria-expanded`. The `open` prop is passed only in the lab; on desktop, base-ui's PopoverTrigger supplies it.
- **Design protocol / T09 shell-ui-guide:**
  - 25 canopy-coloured focus rings in 19 shipped files break DESIGN-SYSTEM's "one leaf ring, no per-variant colours". The seven in my territory are in -13/-14. The largest elsewhere: `demo/demo-bar.tsx` (4) and `(main)/letters/(index)/page.tsx` (2). `focus-recipe.test.mjs:97` bans `outline-canopy` only inside `button.tsx`.
  - `profile/letterhead-profile.tsx:1421` hand-writes a `·` span instead of `.dotsep` or `MetaDots` (DESIGN-SYSTEM §5).
  - Two Catch-up dialogs repeat `DialogContent initialFocus={panel} ref={panel} tabIndex={-1}` (catchups-ui-25). Whether `DialogContent` should default to focusing its panel is T09's call.
- **Docs:**
  - After -03, DESIGN-SYSTEM §7's "SpringPress is mandatory on every clickable" needs a sentence on Button's own CSS press.
  - `docs/spec/admin.md:425` names the deleted `ResultCount`.
  - docs-17's LoveButton line (`DESIGN-SYSTEM.md:453-455`).
- **catchups-ui (T02):**
  - `settings/settings-surface.tsx:614-651`'s `ConfirmBody` re-draws ConfirmDialog's anatomy (title, one line, Cancel then the verb), because ConfirmDialog owns its own Dialog and has no "one-way" tone. That is fine while the settings dialog swaps bodies. If it stops swapping, `ConfirmDialog` could take `tone: "destructive" | "primary" | "oneWay"`.
  - `create/cadence-control.tsx` and `(main)/catchups/new/loading.tsx:54-65` are -06.
  - `reader.tsx`'s `useMedia` is -01, and `reader-parts.tsx:541-554` is -05.
- **feed (T01):** `posts/mention-dropdown.tsx` (-04); `posts/post-card.tsx:677-690` (-05).
- **messages:** `messages/message-composer.tsx:40,48,141` has an `autoFocus` prop that none of its three callers passes.
- **collection-media (T04):**
  - fresh-code-08's one-line fix: `image-viewer.tsx:491`'s deps should name `zoom.zoomed, zoom.settleToFit, zoom.zoomByStep` (stable callbacks from `pinch-zoom.ts:278-290`), not the fresh `zoom` object.
  - `attach-image-dialog.tsx:75-85` (`usePointerFine`) is -01, and its cast at `:176-188` is -03.
- **lab-rest:**
  - `src/app/lab/_kit.tsx:27-60` defines its own `SPRINGS` (3 of the 4), `FadeRise` and `useValleyMotion`, the prototype of `useMotionGovernor`. Its comment "The real app should also honor the OS media query" contradicts the owner's standing 2026-09-07 rule. 25 lab files import it (jscpd: `app/lab/_kit.tsx [26:41-32:68] ↔ components/common/motion.tsx [14:80-20:68]`). Audit-2 row #34 blessed lab files importing SPRINGS from `motion.tsx`; this is the other direction, a parallel copy.
  - The profiles rooms' `avatarSpecies` intent (-09).
- **lib-tests / catchups:** `ui/focus-recipe.test.mjs:60`'s BORDERLESS list names `catchups/home/picture-picker-dialog.tsx` (knip-unused; fresh-code-01). If that file is deleted, drop the entry: the test does not fail on stale entries, so nothing will remind anyone.
- **bundle-build:** bundle-build-07 and -02 here are alternatives; pick one.
- **Orchestrator:**
  - `fresh-code.md`'s per-file list and its finding 08 cite `src/components/common/identity-row-overflow-rule.test.mjs`; the file is `src/lib/identity-row-overflow-rule.test.mjs`.
  - Four audit-2 items in my files fell through without a decision or a ledger line: G2/Q7 (answered, never executed), row #13 (never asked), fresh-code-11 and shell-primitives-14 (never routed). Other territories may have the same gap.

## Charter leads and questions, answered
- **Did the 09-15 shared bottom sheet leave the sheets it replaced exported?** No. They were deleted in the same commit, and nothing hand-rolled survives in shipped code (Not-findings).
- **`active-filter-chips.tsx` and `result-count.tsx`:** deleted in `d9adbca8` (2026-09-05), not imported anywhere. One doc mention remains.
- **E11 UI-kit tail:** see carry-overs. Nothing of it was adopted; the filter trigger went from four copies to three only because SortPill died.
- **Props no caller passes:** -08 (13 of them) and -09.
- **Primitives with exactly one caller:** see the census below. Only HouseOptions is a relocated feature component (-10). LocationPicker's single mode is a relocated lab demo (-07).
- **Q1, client boundaries:** VerifiedMark is the one primitive that is `"use client"` only for a leaf's sake, its tooltip state around a static glyph (-02 / bundle-build-07). FloatField alone has no hooks, but it shares a file with FloatArea, which does, and all its callers are client forms, so splitting gains nothing. Everything else needs state, effects or handlers, or is correctly a server component.
- **Q2, `motion.tsx`:**
  - No LazyMotion strays. `motion-namespace-rule.test.mjs` is green; there are 0 shipped `motion.` uses; the 30 lab files that use `motion.*` do so by design and load the full runtime only on lab routes.
  - `m.` is used everywhere in shipped code.
  - Helpers used once are the registry by design, apart from `FadeRise.style`, which is dead (-08).
  - SpringPress is under-used because of its type (-03).
- **Q3, the six signatures:**
  - Single-use helpers: `FacetOptionsPopup` (-14); `optionKey` and `handleOpenChange` (-07).
  - Internal types used once: small and fine.
  - Defensive try/catch: `use-deferred-autofocus.ts:42-46` wraps `matchMedia`, which cannot throw in supported browsers. 3 lines; left.
  - Intermediates: none of note.
  - Over-abstraction: none (no registry with a single variant). The duplicate `default`/`primary` is -12.
  - Narrating comments: few. The stale ones are -14 and -16.
  - React-specific: useState-plus-effect mirrors (-01); `useCallback` wrappers with no benefit (-07); an unstable returned object (`usePinchZoom`, carry-over).

**Primitive census** (shipped caller files / lab files; my verdict):

| Primitive | Shipped | Lab | Verdict |
|---|---|---|---|
| `SPRINGS` / `EASE_*` / `FadeRise` / `SpringPress` / `useMotionGovernor` | 46 / 26 / 6 / 7 / 6 | 36 / 17 / 16 / 24 / 1 | foundation; -03 fixes SpringPress |
| `MotionFeatures` | 1 (root layout) | 0 | framework mount |
| `Button` | 157 tags | 48 tags | -12 |
| `BottomSheet` / `Sheet*` | 5 / 2 | 2 / 0 | done (09-15) |
| `Toaster` | 1 (root layout) | 0 | fine; -16 nit |
| `ContentColumn` / `FeedColumn` | 1 / 1 | 0 / 0 | by design |
| `LoveButton` / `ShareButton` / `BookmarkButton` | 5 / 3 / 2 | 15 / 0 / 3 | -05, -15 |
| `ConfirmDialog` | 7 (12 sites) | 0 | healthy |
| `useClosingDialog` | 1 | 0 | generic; drafts-strip should adopt it |
| `FloatField` / `FloatArea` / `FIELD_*` | 7 / 1 / 3 | 0 / 0 | -08 |
| `InfoTooltip` | 1 (FloatArea) | 0 | -02 |
| `VerifiedMark` | 2 (3 sites) | 9 | -02 |
| Filters kit (`FacetSelect`, `FacetSearchSelect`, `RangeFacetPill`, `FilterSheet`, `FilterButton`, `FilterPopover`, `SentenceLine`) | 3, 1, 1, 2, 2, 2, 2 | 0, 0, 0, 1, 2, 0, 1 | -08, -14 |
| `SegmentedPills` | 5 | 2 | -06 adds one |
| `skeleton.tsx` (4 exports) | 12 / 3 / 3 / 2 | 0 | healthy; fresh-code-20 adds `LineSkeleton` |
| `IdentityRow` / `IdentityRowSkeleton` | 8 / 7 | 0 | -08, -11 |
| `PersonName` / `MetaDots` | 2 / 3 | 0 / 1 | -16 |
| `BirdAvatar` / `FlushAvatar` / `contactPhotoSrc` | 30 sites / 3 / 1 | 73 / 2 / 0 | -09 |
| `HouseOptions` | 1 (profile) | 0 | -10, relocate |
| `LocationPicker` / `TagInput` / `YearInput` / `RichTextArea` | 3 / 1 / 1 / 2 | 1 / 0 / 0 / 0 | -07, -08, -13 |
| `FocusModality` | 1 (root layout) | 0 | pinned, needed |
| `useCoarsePointer` / `useWideViewport` | 1 / 2 | 0 | -01 |
| `useDeferredAutofocus` / `useLeaveGuard` / `useUserSearch` / `usePinchZoom` | 5 / 2 / 2 / 1 | 0 | -04 for useUserSearch |

## Metrics
- Lines read in full: 6,086 in territory (5,299 under `common/` + 787 in the five named primitives), plus ~2,300 lines of supporting evidence (DESIGN-SYSTEM 584, liftkit 162, signup-form 145, the Catch-up consumers ~450, the lab harness and kit ~125, two rule tests ~190, and the audit-2 rows and ledger).
- Comment-heaviest files in the territory (comment/code, `raw/cloc-by-file.csv`): `motion-features.tsx` 5.33 (32/6), `motion-features-max.ts` 5.00 (10/2), `filters/pill-shell.tsx` 3.11 (115/37; ~26 of those lines stale), `use-closing-dialog.ts` 2.26, `control-geometry.ts` 2.11, `flush-avatar.tsx` 1.86, `use-deferred-autofocus.ts` 1.62, `ui/button.tsx` 1.41. Apart from pill-shell's stale blocks and the -16 sentences, these ratios are reasons, dates and measurements, not restatement.
- Biggest files (code lines): `pinch-zoom.ts` 335, `location-picker.tsx` 325, `bird-adjust.json` 257 (data), `ui/sheet.tsx` 227, `float-field.tsx` 131, `filters/range-facet-pill.tsx` 122, `filters/facet-search-select.tsx` 117, `identity-row.tsx` 112.
- `"use client"` in 33 of 45 territory files. Every importer of the client `motion.tsx` is itself a client module.
- Counted:
  - 36 `as object` casts (10 shipped, 26 lab);
  - 6 hand-typed copies of SpringPress's press;
  - 9 hand-rolled live media-query subscriptions plus 1 correct one;
  - 3 help-bubble machines;
  - 5 copies of the action-pill shell;
  - 13 optional props no caller passes;
  - 50 attributes restating Button defaults (29 `type="button"`, 21 `rounded-full`);
  - 7 off-protocol canopy focus rings in the territory (25 across shipped code);
  - 8 `clamp` definitions;
  - 30 hand-built `/profile/${id}` hrefs.
- Findings: 16. By tier: T1 8 (-08, -09, -10, -11, -12, -14, -15, -16), T2 6 (-03, -04, -05, -06, -07, -13), T3 2 (-01, -02), T4 0. By class: structural 12, cheap 4. Decides: 1 owner (-07), 15 autonomous. Owner decisions raised: 2 (A: the single-city search box; B: the button press sink, which is a bug-lens fix with a feel the owner should confirm).
- Projected savings if all land: ~−570 source lines, −2 files (the two media hooks, or −3 if `cadence-control.tsx` is deleted), 1 file relocated out of `common/`, the `@base-ui/react/tooltip` module off `/profile/[id]` and `/directory` (~10 KB raw / ~3.5 KB gz eager, bundle-build-07's figure), 36 type casts, 13 dead options, 50 restated attributes, one render fewer per media-query consumer on client navigations, and 2 drifts closed (the Low-100 stale search; the on-dark action pill).
