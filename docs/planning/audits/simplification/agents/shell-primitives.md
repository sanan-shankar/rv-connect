# shell-primitives - simplification audit report

Territory reader for the app shell and the shared primitives everything imports:
`src/components/ui/**` (17 files), `src/components/common/**` minus the bird avatars (23 files +
11 in `filters/`), `src/components/layout/**` (10 files), the root and `(main)` layouts,
`error.tsx`/`not-found.tsx`/`template.tsx`, `globals.css`, `manifest.ts`/`robots.ts`/`sitemap.ts`,
`src/types/next-auth.d.ts`, and `src/lib/utils.ts` (fan-in 165, the most-imported module in the
app). Date: 2026-08-25. Files in territory: 74; read fully: 74 (bird-avatar.tsx read only for its
prop contract, per charter it belongs to a neighbour).

## Coverage

- Read fully: every file in the territory list above, including all 11 `filters/*` files, all 17
  `ui/*` files, all 10 `layout/*` files, `utils.ts` and `globals.css` line by line, plus
  `docs/spec/DESIGN-SYSTEM.md` in full and the liftkit-spacing skill (skimmed, as chartered).
- Skimmed: `src/components/common/bird-avatar.tsx` lines 20-80 only - needed to verify the
  `avatarColor` prop is accepted-and-ignored (finding 04). The bird files are a neighbour's.
- Not read: nothing in territory.
- Uncommitted edits seen: **none in my territory** (`git status --short` over every territory path
  is clean). The other session's WIP (next.config.ts, lib/admin.ts, forbidden.tsx, etc.) is all
  outside my files; I judged HEAD state throughout anyway.

## Summary

This territory is the best-maintained code I have seen in the repo: the comment weight
(globals.css 309 comment lines, button.tsx 108) is almost entirely the owner's
"every constant argued for" standard - measurements, dates, owner quotes, audit IDs - and is
protected, not bloat. The real waste hides in three places. (1) The forked shadcn kit carries
~430 lines of sub-primitives with zero callers anywhere, including two whole files (badge, tabs)
nothing imports. (2) `utils.ts` carries 101 dead lines - two functions whose callers were removed
by the direct-batch-entry signup rework and a random-avatar-colour picker the design system itself
declares removed. (3) One retired column, `User.avatarColor`, is still threaded through the JWT,
the session, ~10 Prisma selects and ~10 prop interfaces to feed a prop that `BirdAvatar`
deliberately ignores. Structural-vs-cheap split: roughly 80/20 structural by line count. The one
dependency win: `tw-animate-css` is imported for exactly one class list in `popover.tsx`, which is
also the one popup that deviates from the app's own menu material. Biggest surprise: how little
there is to cut in `components/common` - the primitives are genuinely deduplicated, and most
"unused export" leads turned out to be internal uses knip cannot see.

## Findings

### shell-primitives-01 - Trim the dead sub-primitives out of the forked shadcn kit
- **Where**: `src/components/ui/dropdown-menu.tsx:14-16,58-80,127-181,183-265,267-297` (Portal,
  Group, Label, Sub, SubTrigger, SubContent, CheckboxItem, RadioGroup, RadioItem, Separator,
  Shortcut - ~190 of 315 lines); `src/components/ui/combobox.tsx:55-63,65-80,183-185`
  (ComboboxIcon, ComboboxClear, ComboboxCollection, ~35 lines); `src/components/ui/select.tsx:12-20,125-136,187-198`
  (SelectGroup, SelectLabel, SelectSeparator, ~35 lines); `src/components/ui/card.tsx:59-70,82-93`
  (CardAction, CardFooter, ~25 lines); `src/components/ui/sheet.tsx:108-116,131-142` (SheetFooter,
  SheetDescription, ~20 lines); `src/components/ui/dialog.tsx:22-24` (the DialogClose wrapper -
  both internal close buttons use `DialogPrimitive.Close` directly); `src/components/ui/popover.tsx:63-65`
  (PopoverClose).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip and knip-production both list every one of these as unused exports. I
  re-verified each by name with grep across all of `src/` (lab included), `e2e/`, `scripts/` and
  every `*.test.mjs`: **zero external references for all 24 symbols** (the verification run is in
  my session; e.g. `DropdownMenuCheckboxItem: 0`, `SheetDescription: 0`, `CardFooter: 0`).
  Internal-use caveats checked one by one: `SelectScrollUpButton`/`SelectScrollDownButton` are used
  INSIDE `SelectContent` (select.tsx:112,118) so they stay (un-export only); `DialogOverlay` and
  `DialogPortal` are used inside `DialogContent` (dialog.tsx:60-61) so they stay (un-export only);
  `MenuPrimitive.Portal` is called directly in `DropdownMenuContent` (dropdown-menu.tsx:38) so the
  `DropdownMenuPortal` wrapper is fully dead.
- **What to do**: Delete the listed functions and their entries in each file's export block. In
  dropdown-menu.tsx also drop the now-unused `ChevronRightIcon`/`CheckIcon` lucide imports (only
  the deleted Sub/Checkbox/Radio items used them). In card.tsx, leave the
  `has-data-[slot=card-footer]` selectors in Card's class string or strip them too (they match
  nothing once CardFooter is gone; stripping is cleaner). Change `export` to nothing on
  SelectScrollUp/DownButton, DialogOverlay, DialogPortal rather than deleting them.
- **Saving**: ~280 lines code; a few hundred bytes of client JS on every page (dropdown-menu is in
  the shared chunk via notification-bell, so the two lucide glyphs and the sub-menu machinery ship
  everywhere today).
- **Risk & gate**: low. `npm run check` (TypeScript will catch any reference I missed),
  `npm run visual` for the menus. No pinned test touches these files.
- **Confidence**: high. The one thing that would change my mind: a plan to actually use submenu /
  checkbox menus soon - re-adding later means re-deriving the house styling, since these are forked,
  not stock. If the owner wants to keep them "for the kit's completeness", keeping them is
  defensible; they are still dead today.
- **Notes**: This is the counter-argument stated honestly: shadcn convention is to install the
  whole kit and let unused parts sit. But this kit is FORKED (state-layer, radius ladder, no
  min-height - each carries house rules), so it is maintained code, not vendored code: every future
  protocol change pays to update rows nobody renders. That tips it to delete. Related: -02 removes
  two entire files the same way.

### shell-primitives-02 - Delete `ui/badge.tsx` and `ui/tabs.tsx`, unused whole files
- **Where**: `src/components/ui/badge.tsx:1-56` (all), `src/components/ui/tabs.tsx:1-90` (all)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip ("unused files"), madge-orphans, and my own grep: `ui/badge`, `ui/tabs`,
  `badgeVariants`, `tabsListVariants` have zero importers in `src/` (lab included), `e2e/`,
  `scripts/`, and every test. The app's real tab-shaped control is `SegmentedPills`
  (`common/segmented-pills.tsx`), which every switcher uses; badges were superseded by the
  protocol's tint-trio chips written inline. Both files were forked (state-layer comments dated
  2026-08-02) and then never adopted.
- **What to do**: `git rm src/components/ui/badge.tsx src/components/ui/tabs.tsx`. Nothing else
  references them; components.json does not track installed files.
- **Saving**: 146 lines, 2 files.
- **Risk & gate**: near-zero. `npm run check`.
- **Confidence**: high. Would change my mind: nothing - they are re-installable from the registry
  in one command if ever wanted (`npx shadcn add badge tabs`), minus the fork styling, which the
  git history keeps.
- **Notes**: badge.tsx line 21 also contains the dangling `dark: ` no-op class bug noted in -15;
  deleting the file settles that instance.

### shell-primitives-03 - Delete the three dead functions in `utils.ts` (101 lines)
- **Where**: `src/lib/utils.ts:193-202` (`AVATAR_COLORS` + `pickAvatarColor`),
  `src/lib/utils.ts:204-217` (`formatBatch` + the formatBatchChip tombstone comment),
  `src/lib/utils.ts:493-569` (`BatchComputation` type + `computeBatchFromSchooling`)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags all three; tsc-unused flags `formatBatch`'s ignored `batchType` param.
  Verified by grep: `pickAvatarColor` - zero references anywhere. `computeBatchFromSchooling` -
  zero references; its callers were removed by commit `af89744` ("feat(onboarding): collect batch
  year directly at signup") and `6576aaf` ("settings batch fields switch to direct entry, drop
  retired grade-joined path"); its docstring still claims it is "the single source of truth for
  both the live sign-up preview (client) and registration (server)", which is now false - the live
  truth is `batchTypeFromLeaving` (utils.ts:471), which has 8 importers. `formatBatch` - every one
  of its 5 grep hits is a COMMENT saying "batchLine, never formatBatch" (letters/page.tsx:211,
  admin-person-row.tsx:37, directory-module.tsx:67, batch-line.test.mjs:8,32) or a quoted string in
  lab `_findings.ts`. No test imports any of the three (text-shape.test.mjs imports were checked
  name by name).
- **What to do**: Delete the three ranges. In `batchLine`'s docstring (utils.ts:384-386) trim the
  sentence "See computeBatchFromSchooling below", which will dangle. Leave the comments in other
  files that mention formatBatch by name - they are history explaining why batchLine is used, and
  still read correctly once the function is gone ("used to call formatBatch").
- **Saving**: 101 lines in the single most-imported module in the app (fan-in 165).
- **Risk & gate**: low. `npm run check` - the unit suite includes `text-shape.test.mjs` and
  `batch-line.test.mjs`, which pin the SURVIVING batch functions and must stay green.
- **Confidence**: high. Would change my mind: a caller reachable only via string reference - I
  checked for `"computeBatchFromSchooling"` as a string and found none.
- **Notes**: `AVATAR_COLORS` here is a stale duplicate of the palette that actually ships (the
  avatar discs derive colour in `src/lib/avatar.ts`); DESIGN-SYSTEM Appendix B documents the live
  one. Related to -04, which retires the column this picker once filled.

### shell-primitives-04 - Retire the `avatarColor` plumbing: a retired column still riding every JWT, session read and query
- **Where**: `src/types/next-auth.d.ts:33,48,61`; `src/lib/auth.ts:240,298,324,358,410`;
  `src/app/(main)/layout.tsx:125`; `src/components/layout/sidebar.tsx:52` (`SidebarUser`);
  `src/app/api/dev-login/route.ts:124`; `src/app/api/users/search/route.ts:85`; Prisma selects in
  `(main)/directory/page.tsx:25,48`, `(main)/directory/actions.ts:12`, `(main)/feed/actions.ts:38,1548`,
  `(main)/letters/page.tsx:89`, `(main)/letters/[id]/page.tsx:60`, `(main)/collection/[id]/page.tsx:51`,
  `(main)/collection/actions.ts:103`, `(main)/welcome/page.tsx:35`; prop interfaces in
  `comments-section.tsx:35`, `mention-dropdown.tsx:10`, `profile-card.tsx:48`,
  `directory-client.tsx:36`, `alumni-map.tsx:34`, `onboarding-flow.tsx:57`; the field list entry in
  `src/lib/demo.ts:150`; the column itself, `prisma/schema.prisma:16`.
- **Phase**: placeholder
- **Tier**: T3     **Class**: structural     **Decides**: autonomous for the code; **owner** for
  the schema column drop (it is a manual migration on the one shared database).
- **Evidence**: `bird-avatar.tsx:26-28,41-43` in the component's own words: "There is no
  avatarColor override: the bird always drives its own colour from src/lib/avatar.ts ...
  `avatarColor` is accepted on the type for source compatibility with existing callers but is
  intentionally ignored here", and the prop is marked `@deprecated unused`. DESIGN-SYSTEM sec. 9:
  "There is no avatarColor (removed - see the avatar-colour bug fix)." Yet the value is stamped
  into every JWT (`auth.ts:298`), re-read from the DB on every session refresh (`auth.ts:324,358`),
  selected in at least 10 queries, and threaded through 10+ component interfaces - all to feed a
  prop that is discarded on arrival. ~25 files carry it (grep, excluding `src/generated`).
- **What to do**: In one pass: remove the three `next-auth.d.ts` fields, the four `auth.ts` sites,
  the layout/dev-login pass-throughs, `SidebarUser.avatarColor`, every `avatarColor: true` select
  and every `avatarColor: string | null` interface member listed above, and the `demo.ts:150` list
  entry. Keep the `@deprecated avatarColor?` member on `AvatarUser` in bird-avatar.tsx until the
  sweep lands, then delete it too (it exists only for these callers). SEPARATE, owner-gated step:
  a dated idempotent `prisma/migrations-manual/` file dropping `User.avatarColor`, plus
  `npx prisma generate` - per CLAUDE.md this is never `prisma db push`, and the owner approves the
  migration. The code sweep is safe with the column still present; the column drop can wait
  indefinitely.
- **Saving**: ~45 lines of code across ~25 files, a few bytes off every JWT cookie and every
  session read, one column off the hottest table. Mostly a truthfulness win: today every new
  surface copies `avatarColor` into its select because its neighbours have it.
- **Risk & gate**: medium (touches auth.ts, which is pinned by `security-regressions.test.mjs` -
  the pins are about admin-login/dev-login behaviour, not this field, but the file must stay
  green). Gates: `npm run check`, `npm run verify:crawl` (every route renders), sign-in flow in
  `npm run test:e2e`. The demo's `demo.ts` list edit must keep the demo rule tests green.
- **Confidence**: high on the code being dead weight; medium on drop-ordering subtleties (a live
  JWT minted before the deploy contains the claim; the session callback must simply stop reading
  it, which is what removing the code does - stale claims in old tokens are ignored, not errors).
- **Notes**: `avatarSpecies` (the other deprecated AvatarUser prop) is still used by lab mocks
  (`lab/feed-canvas`, `lab/profiles/*`) - leave it; lab rooms are owner-protected. Fear worth
  writing down: `welcome/page.tsx:92` and `photo-step.tsx:146` FORWARD the value into components -
  confirm each recipient also ignores it (they hand it to BirdAvatar, which does).

### shell-primitives-05 - globals.css: delete the token sets and keyframe class nothing uses
- **Where**: `src/app/globals.css` - chart tokens `:27-31` (@theme), `:166-170` (:root),
  `:326-330` (.dark); `--sidebar-primary`/`--sidebar-primary-foreground` `:23-24`, `:174-175`,
  `:377-378`; `--sidebar-accent` (the non-foreground one) `:15`, `:176`, `:374`; `--z-base` `:64`;
  `--radius-4xl` `:54`; `--space-3xl` `:101`; `.animate-bell` `:624-627` plus the comment line
  `:616` that documents it.
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep counts across all of `src/` (lab included): `chart-1..5` 0 uses (and no
  `var(--chart` anywhere - the admin analytics room draws no charts through these);
  `sidebar-primary` 0; bare `sidebar-accent` 0 (the only nonlab hits are
  `text-sidebar-accent-foreground`, sidebar.tsx:208,269 - KEEP `--sidebar-accent-foreground`);
  `z-base` 0 (`z-elevated`/`z-floating`/`z-overlay` are used); `radius-4xl` 0; `space-3xl` 0;
  `.animate-bell` 0 - the bell shake shipped as a Motion keyframe animation in
  `notification-bell.tsx:167` instead, and only `.bell-trigger:hover svg` (globals.css:629) is
  used, via notification-bell.tsx:258. The `@keyframes bell` block itself stays for that hover
  rule.
- **What to do**: Delete the listed lines. In the `.animate-bell` deletion, rewrite the comment at
  :615-616 to describe only the hover trigger. Do NOT touch `--sidebar-accent-foreground`,
  `--sidebar-ring`, `--sidebar-border`, `--sidebar-foreground-muted` (all verified used at least
  once in the shipped sidebar).
- **Saving**: ~32 lines of globals.css, and the corresponding custom properties out of the
  compiled CSS payload on every page.
- **Risk & gate**: low. `npm run visual` (20 screenshots) is the exact gate; a token that was
  secretly load-bearing shows up as a diff.
- **Confidence**: high for chart/z-base/radius-4xl/space-3xl/animate-bell; medium-high for the
  sidebar pair - shadcn's sidebar token block is conventional, but this app's sidebar is bespoke
  (`sidebar.tsx` uses the hover/active/idle set, never primary/accent).
- **Notes**: The other 309 comment lines in this file are measurement-bearing owner reasoning and
  are a not-finding (below). I also checked every `@utility`/`@keyframes`/component class:
  `state-layer` (162 nonlab uses), `card-elevated` (74), `skeleton-warm` (201), `glass` (17),
  `dotsep` (5), `deeplink-flash` (2), `valley-tree` (4), `.hoopoe` rig classes (used by the login
  mascot) - all alive.

### shell-primitives-06 - LogoFact: a feature hardcoded off ships its corpse on every page (owner call)
- **Where**: `src/components/layout/logo-fact.tsx:1-128` (whole file; the gate is
  `LOCKUP_FUN_FACT_ENABLED = false` at :39); mounted at `sidebar.tsx:617-619`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: owner
- **Evidence**: The flag comment at :35-38 says the reveal is "Disabled per owner request; the
  reveal logic below is left intact (just gated to never open) so this can go back to `true`
  later without reconstructing it." With the flag false, the component is functionally identical
  to the `Brand` link that already exists in the same sidebar (sidebar.tsx:106-127) - same Link,
  same Wordmark - but still ships the ten VALLEY_FACTS paragraphs (~1.6KB of prose), a motion.div
  tooltip rendered hidden into every page's DOM, a `Math.random` effect and two timers, in the
  shared client chunk of every authenticated page.
- **What to do**: Owner picks one: (a) turn the flag back on (it works; it was built and parked),
  or (b) delete the file and mount `<Brand />` inside `LogoEasterEgg` at sidebar.tsx:617 (export
  Brand from sidebar.tsx or move it to peaks-mark.tsx). Nothing is lost by (b): the original demo
  survives in `/lab/eggs` (jscpd confirms the lab room carries the same code), which is exactly
  what the lab is for.
- **Saving**: (b) saves 128 lines, ~2KB of shared client JS, one hidden DOM subtree per page.
  (a) saves nothing but makes the code honest.
- **Risk & gate**: low. `npm run visual` (the sidebar lockup is in every baseline);
  check the desktop rail and the mobile drawer both still link home.
- **Confidence**: high that the current state is the worst of the three options.
- **Notes**: I lean (b): the owner already said no to the reveal, and "kept so it can come back"
  is what git history is for. But it is his feature to keep parked, hence owner.

### shell-primitives-07 - Rebuild PopoverContent on the shared menu material and drop the `tw-animate-css` dependency
- **Where**: `src/components/ui/popover.tsx:46-61` (PopoverContent's class list);
  `src/app/globals.css:2` (`@import "tw-animate-css"`); `package.json` (the dependency).
- **Phase**: library (plus dedupe)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep for the tw-animate class family (`animate-in`, `animate-out`, `fade-in-0`,
  `zoom-in-95`, `slide-in-from-*`) across all of `src/`: exactly ONE file uses any of them -
  `popover.tsx:55`. Everything else animates through Base UI's `data-starting-style`/
  `data-ending-style` transitions (the `MENU_PANEL_CLASS` in `ui/menu-material.ts`) or Motion.
  PopoverContent also hand-restates the material's surface (same radius var, same border, same
  shadow literal) instead of composing `MENU_PANEL_CLASS`, and uses `sideOffset = 8` where the
  material's documented placement is 6 - it is the one floating panel off-material, which
  `pill-shell.tsx:100-107` even wrote a workaround for (`FacetPanel` exists because "ui/popover's
  PopoverContent, whose own wider-card class list ... tailwind-merge cannot reliably strip back
  down to the material").
- **What to do**: Rewrite PopoverContent as `cn(MENU_PANEL_CLASS, "w-72 p-4", className)` (keeping
  `p-4` and `w-72` as its own sizing, per the material's rule that padding is the popup's own),
  and align `PopoverPositioner`'s default `sideOffset` to 6. Then delete globals.css line 2 and
  `npm uninstall tw-animate-css`. Verify the three PopoverContent consumers: `info-tooltip.tsx`,
  `house-picker.tsx` (desktop panel), and anything found by grep for `PopoverContent` - all get
  the standard menu enter/exit instead of the slide-in, which is what DESIGN-SYSTEM's "one origin
  animation ... No slide-downs on one page and pops on another" demands anyway.
- **Saving**: 1 dependency, ~6 source lines, and the material rule finally has zero exceptions.
- **Risk & gate**: low-medium (visible motion change on 3 popovers, in the DIRECTION the spec
  orders). `npm run check`; `npm run visual`; open the settings info-tip and the house picker by
  hand.
- **Confidence**: high that tw-animate-css has one consumer (grep is exhaustive); medium that no
  lab room needs it - my grep covered lab and found nothing.
- **Notes**: With Tailwind v4 JIT the CSS payload saving is small (unused utilities are not
  emitted), so the wins are the dependency, the consistency, and unblocking a future FacetPanel
  simplification. Do this before or with -01 (popover.tsx is touched by both).

### shell-primitives-08 - NotificationBell: collapse the two near-identical variant returns
- **Where**: `src/components/layout/notification-bell.tsx:249-362` (the `variant === "header"`
  early return at 249-298 vs the sidebar return at 300-361)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Both branches render the same tree - DropdownMenu > DropdownMenuTrigger >
  (motion.span shake wrapper > Bell) + badge + sr-only + NotificationPanel - differing only in:
  trigger className (card circle vs rail square), Bell size (18 vs 19), and badge (2px cinnamon
  dot vs count pill). ~55 of the ~110 lines are duplicated verbatim, including the whole
  `shakeAnimate`/`whileTap` wrapper and the identical `<NotificationPanel ...>` invocation with
  its 7 props.
- **What to do**: One return. `const isHeader = variant === "header"`; a ternary for the trigger
  className (both class strings already exist, keep their comments beside the ternary), a ternary
  for the badge block, `size={isHeader ? 18 : 19}` on the Bell. The two long comment blocks
  (2026-08-02 rail-centering measurements, the sr-only reasoning) each survive once instead of the
  sr-only one appearing twice.
- **Saving**: ~40 lines.
- **Risk & gate**: low. `npm run visual` covers both variants (feed header bell + every other
  route's mobile bar bell); check mobile 390x844 per house rule.
- **Confidence**: high.
- **Notes**: While in the file: `group_invite` at :73 maps an icon for a notification type nothing
  writes any more (Groups removed; grep finds no writer). Old rows in the DB may still carry the
  type, and the `Bell` fallback at :98 covers them, so the entry can go (2 lines + the `Users`
  import) at the cost of a generic glyph on ancient rows - fold into this commit.

### shell-primitives-09 - `utils.ts` after the dead-code cut: what it contains, and the two concerns worth moving out
- **Where**: `src/lib/utils.ts` (742 lines today, 641 after -03)
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: The charter's floor question, answered. Concern map with line ranges (current
  numbering): `cn` 1-6; valley-time (VALLEY_TIME_ZONE, valleyYear/DayKey/Midnight/DayStart,
  valleyDaysBetween) 8-57 + 728-742, ~65 lines, 11 importers; formatTimeAgo 59-78; parseJsonArray
  80-98; grapheme text kit (graphemes/firstGrapheme/truncateGraphemes/getInitials) 100-167;
  name-ceiling (FULL_NAME_MAX/fullNameFits) 169-191; **phone display/split/join 219-365, 147
  lines, exactly 4 importers** (profile page, letterhead-profile, contact-rows, contacts-editor);
  formatDisplayDate 367-378; batchLine 380-427; metaLine 429-458; batchTypeFromLeaving 460-491;
  letterTitle 571-596; formatPaise 598-609; plainExcerpt 611-628; **rich-text renderer
  (emphasisPattern/EMPHASIS_RULES/renderRichText) 630-726, 97 lines** - whose siblings
  `rich-text-editing.ts` and `rich-truncate.ts` already live as their own lib modules and import
  it back out of utils. Everything else (cn, dates, text, batch, meta, money) is broadly-shared
  formatting that belongs exactly where it is. Module-scope construction note: utils.ts builds an
  `Intl.Segmenter`, a 30-entry Set, and five `new RegExp` at import time with no `#__PURE__`
  annotations, so every client chunk that imports only `cn` still evaluates them.
- **What to do**: Two moves, nothing clever: (1) `renderRichText` + `emphasisPattern` +
  `EMPHASIS_RULES` -> `src/lib/rich-text.ts`, next to its two sibling modules; update the 12
  importers (grep list is in this audit's session; includes rich-text-editing.ts,
  rich-truncate.ts, post-card, comments-section, create-post-form, rich-text-area, answer-card,
  letters/[id], admin catchup page, lab type room). (2) The whole phone block ->
  `src/lib/phone.ts`; update 4 importers. Keep everything else in utils.ts. Do NOT create an
  index barrel.
- **Saving**: 0 lines (honest); utils.ts drops from 641 to ~400; the security-sensitive renderer
  gets its own file and test surface; chunks that need only `cn` stop evaluating five regex
  constructions.
- **Risk & gate**: low-medium (many mechanical import edits). `npm run check` - note
  `text-shape.test.mjs` imports letterTitle/plainExcerpt from `./utils.ts` (they stay), and
  `rich-truncate.test.mjs` exercises renderRichText through rich-truncate (update its import if it
  imports from utils directly - it imports rich-truncate, which will re-point).
- **Confidence**: medium-high. Would change my mind on (2): if the owner prefers one grab-bag
  utils file as a convention, the cost of staying is small - this is the lowest-priority
  structural item in my list.
- **Notes**: I deliberately do NOT propose splitting valley-time out: 11 importers plus tests
  reference it via utils, the functions are 5 lines each, and `lib/batch-year.ts` already shows
  the repo splits lib modules when a concern grows. Fan-in 165 is dominated by `cn`, which must
  stay at `@/lib/utils` (components.json aliases `utils` there for shadcn generation).

### shell-primitives-10 - Replace the filters barrel with direct imports
- **Where**: `src/components/common/filters/index.ts:1-12`; importers
  `collection-client.tsx:16`, `directory-client.tsx:19`, `admin/people/people-list.tsx:18`,
  `admin/content/content-list.tsx:24`
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The charter names it: the ONE internal barrel in the app. Four client components
  `import { ... } from "@/components/common/filters"`, which makes every one of the ten kit files
  (plus their lucide/BaseUI imports) part of each importer's module graph regardless of use -
  admin's people-list uses 4 of the 10 pieces but pulls RangeFacetPill, sentence-line,
  active-filter-chips and both sheet/popover shells through the star re-exports. Barrels also
  defeat Turbopack's per-module tree-shaking for internal code (the documented reason
  `optimizePackageImports` exists for packages; internal barrels get no such treatment).
- **What to do**: Delete `index.ts`. Point the four import statements at the concrete files
  (`.../filters/facet-select`, `.../filters/filter-sheet`, etc. - each importer's list already
  names exactly what it uses, so this is mechanical). `lib/*-facets.ts` files already import
  `types` directly and need no change.
- **Saving**: 12 lines + 1 file; a few KB of client JS on the two admin routes and Collection
  (they currently carry kit pieces they never render).
- **Risk & gate**: low. `npm run check`; open /directory and /collection.
- **Confidence**: high.
- **Notes**: knip's `PILL_BASE`/`PILL_IDLE` "unused export" hits are internal uses
  (pill-shell.tsx:113 `facetPillClass`) - un-export them in the same commit (see -15).

### shell-primitives-11 - Phone kit: extract the duplicated country-code split
- **Where**: `src/lib/utils.ts:285-295` vs `342-352` (the jscpd clone: the codeLength ternary +
  plausibility check, duplicated between `formatPhoneDisplay` and `splitPhoneParts`)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: `lib/utils.ts [285:3 - 294:78] (10 lines, 59 tokens) = lib/utils.ts
  [342:3 - 349:78]`. The comment at :309-312 defends the two functions staying independent
  ("Kept independent of formatPhoneDisplay above rather than sharing its body, so this never
  risks that function's existing, already-relied-on output"). That defence covers the FUNCTIONS -
  the space-handling and fallback behaviour genuinely differ - but not the ITU arithmetic, which
  is a pure computation both must agree on: they already share `TWO_DIGIT_CALLING_CODES`,
  `MIN/MAX_NATIONAL_DIGITS`, and if the clone ever drifted, display and editor would split the
  same number differently, which is a bug by definition.
- **What to do**: Private helper `function splitCountryCode(digits: string): { code: string; rest:
  string } | null` returning null when the remainder fails the plausibility bounds; both callers
  keep their own fallbacks on null (return `trimmed` / return `{ DEFAULT_PHONE_CODE, digits }`).
  Byte-identical outputs; the defending comment gets one added sentence saying the arithmetic is
  shared precisely so the two CANNOT disagree.
- **Saving**: ~12 lines.
- **Risk & gate**: low. `npm run check` (text-shape tests cover formatPhoneDisplay); eyeball
  contacts-editor round-trip.
- **Confidence**: high.
- **Notes**: If the fixer disagrees with my reading of the comment, skipping this one costs 12
  lines and nothing else - it is the smallest structural item here.

### shell-primitives-12 - Delete the dead `leaf` Button variant alias
- **Where**: `src/components/ui/button.tsx:73-78`
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: The alias's own comment: "kept only so the held-off src/components/catchups/*
  (separate GSD rebuild, do not touch) keeps compiling against its existing variant=\"leaf\" call
  sites." The Catch-ups rebuild has since shipped (memory + DESIGN-SYSTEM), and grep for
  `variant="leaf"` / `variant: "leaf"` across all of src finds ZERO call sites - the only hit is
  the alias's own comment. The migration it waited for happened.
- **What to do**: Delete lines 73-78 (the comment and `leaf: CANOPY_FILL,`).
- **Saving**: 6 lines.
- **Risk & gate**: near-zero; `npm run check` (a missed call site is a type error).
- **Confidence**: high.
- **Notes**: `default` and `primary` both mapping to CANOPY_FILL is deliberate (primary is the
  named, documented variant; default catches bare `<Button>`) - not a finding.

### shell-primitives-13 - image-viewer: the author byline is written twice
- **Where**: `src/components/common/image-viewer.tsx:357-389` (the `current.author.id ? <Link> :
  <span>` branches; jscpd flags 366-376 vs 378-388)
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: jscpd clone `[366:15 - 376:17] = [378:66 - 388:17]`. The inner content (BirdAvatar
  + name span + date span, 11 lines) is byte-identical between the linked and unlinked branches;
  only the wrapper differs.
- **What to do**: `const byline = (<><BirdAvatar .../><span ...>...</span></>)`; then
  `author.id ? <Link ...>{byline}</Link> : <span ...>{byline}</span>`. The explanatory comment at
  :358-361 stays on the branch.
- **Saving**: ~14 lines.
- **Risk & gate**: low; `npm run visual` masks nothing here - open any post photo.
- **Confidence**: high.
- **Notes**: The three identical 10x10 icon-button class strings in the top bar (:246,:255,:263)
  could share a const too (~4 lines); take it or leave it in the same commit.

### shell-primitives-14 - `ui/skeleton.tsx` is the banned grey pulse; make it the warm shimmer
- **Where**: `src/components/ui/skeleton.tsx:7`; consumers `posts/post-feed.tsx`,
  `profile/profile-author-feed.tsx`
- **Phase**: dedupe (protocol convergence)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: The component is stock shadcn: `animate-pulse rounded-md bg-muted` - the exact
  "grey pulse" CLAUDE.md bans ("warm shimmer, not a grey pulse"). `skeleton-warm` has 201 nonlab
  uses; `ui/skeleton` has exactly 2 importers left, both loading states.
- **What to do**: Change the class to `skeleton-warm rounded-md` (API unchanged), OR swap the two
  call sites to plain `<div className="skeleton-warm ...">` like the other 201 and delete the
  file (13 lines). I prefer the second: the app's idiom is the utility class, and a component
  wrapper for one class string is LLM-bloat signature 5.
- **Saving**: 13 lines + 1 file (second option); visual consistency either way.
- **Risk & gate**: low; the two loading states are transient - eyeball /feed while throttled or
  trust `npm run check`.
- **Confidence**: high.
- **Notes**: This is a design-rule fix as much as a simplification; screenshot-qa need not be
  spawned for a skeleton, but the fixer should look once.

### shell-primitives-15 - Cheap batch: un-export internals, dead imports, no-op classes, one stale guard comment
- **Where & what** (each verified individually):
  - `src/components/ui/combobox.tsx:3` and `src/components/ui/popover.tsx:3`: `import * as React`
    never used (tsc-unused). Delete both lines.
  - `src/components/ui/button.tsx:111` (destructive variant): the token `dark: ` with a trailing
    space is a NO-OP class (a bare `dark:` modifier applied to nothing), and
    `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive`
    appears TWICE in the same string. Delete the no-op and one duplicate trio. (badge.tsx:21 has
    the same twin bug; moot after -02.)
  - Un-export symbols knip flags that are genuinely internal-only: `PILL_BASE`, `PILL_IDLE`
    (pill-shell.tsx:34,42), `isWideRoute` (content-column.tsx:52), `WORDMARK_LOGO_SIZE`,
    `WORDMARK_FONT_SIZE` (peaks-mark.tsx:22-23), `THEME_COLORS` (app/layout.tsx:46),
    `SelectScrollUpButton`/`SelectScrollDownButton`, `DialogOverlay`/`DialogPortal` (with -01).
  - `src/app/layout.tsx:74-81`: the comment claims "HARD GUARD: until a .dark block exists in
    globals.css this is visually inert" - the .dark block shipped 2026-08-02; the paragraph
    describes a state that no longer exists and will misdirect the next reader. Rewrite to three
    lines: cookie-driven SSR theme, enableSystem off because dark is entered only via settings.
  - `src/components/layout/sidebar.tsx:384-390`: `countFor(counts, key)` is a 7-line single-use
    helper equal to `counts?.[key]`. Inline it at :375 (LLM-bloat signature 1).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: per item above; all grep/tsc verified this session.
- **What to do**: One commit, mechanical.
- **Saving**: ~20 lines and several no-op class tokens out of the shared chunk.
- **Risk & gate**: near-zero. `npm run check`.
- **Confidence**: high.
- **Notes**: I did NOT include comment-trimming anywhere in this territory: the dense comments are
  the owner's documented standard and carry measurements this audit itself relied on.

## Owner decisions

**Konami eggs (keep - recommended).** Every authenticated page carries a 126-line easter egg
(`components/layout/konami-eggs.tsx`): type the Konami code and birds fly across the screen. Cost,
measured honestly: about 3.5KB of source in the shared bundle, one keyboard listener per page, and
zero rendering until triggered - its two heavy imports (the bird set, the motion library) are
already on every page for other reasons. This is the kind of delight the site is built around, and
the price is genuinely small. Recommendation: keep it, spend nothing more thinking about it.

**The sidebar logo's "Did you know" tooltip (finding 06).** A hover feature you asked to turn off
is still fully built inside the sidebar logo on every page - ten facts about the valley, a hidden
tooltip, all shipped but permanently switched off. Either switch it back on (it works) or let us
delete it; the original lives on in the /lab/eggs room either way. Recommendation: delete; git and
the lab both remember it if you ever want it back.

**Collection's filter row vs the sentence line.** Directory and both admin lists now show results
as one sentence ("42 people · Chennai · Clear all"), which you picked in the lab. Collection still
uses the older two-piece chrome (a count line plus a separate chip strip), so the kit keeps both
systems alive (~80 lines) and the two browse pages read differently. Recommendation: migrate
Collection to the sentence line in a later UI session, then retire `active-filter-chips.tsx` and
`result-count.tsx`. This changes what members see, so it is yours to schedule.

**Dropping the `avatarColor` column (part of finding 04).** The code cleanup is safe on its own;
actually removing the retired column from the database is a manual migration on the one shared
database and waits for your go-ahead. No urgency - an unused column costs almost nothing.

## Not-findings

- **globals.css's 309 comment lines / button.tsx's 108** - measurement-bearing owner reasoning
  (dL* tables, WCAG ratios, dated owner quotes, audit IDs). Protected by the "every constant
  argued for" standard (project memory; brief 4d). Do not trim.
- **`(main)/template.tsx`** - cannot fold into layout.tsx: a template re-mounts per navigation,
  which is the entire mechanism of the content cross-fade. Its header comment says exactly this.
- **`ContentColumn` being "use client"** - it needs `usePathname` live on soft navigations; the
  layout's `x-pathname` header is stale after client-side nav. Correct as is.
- **Root/`(main)` layout provider stack** - PostHog wraps signed-out pages deliberately (comment:
  the landing funnel), MascotFlightLayer must live at root to survive route changes, Toaster and
  Analytics are app-wide by nature. `advanceDueCatchups` being awaited is documented as deliberate
  (audit Low 24). No misplaced providers.
- **`not-found.tsx` at 386 lines** - the interactive 404 hoopoe, an intentional delight; its code
  loads only on the 404 route, and its heavy comment block is a cancellation-token design doc.
- **konami-eggs duplicating `/lab/eggs`** (jscpd) - the lab room is the preserved prototype;
  ports out of lab are the documented workflow.
- **`verified-mark.test.mjs` "unused" per knip** - knip has no entry for the node:test runner;
  `scripts/qa/check.mjs` runs it (brief section 3 documents this exact false positive).
- **motion.tsx exports** - all ten verified in use (AUTH_SLIDE_SECONDS has 1 importer,
  EASE_IN_OUT_SCENE 2; the rest 4-28). `useMotionGovernor`'s always-false `ambientReduced` is a
  documented seam, kept on purpose.
- **`.dark` not overriding canopy/cinnamon/heart/leaf-light** - byte-identical-in-both-themes is
  the stated brand policy (DESIGN-SYSTEM sec. 2).
- **IdentityRow's 10.5px META_CLASS** - a documented owner-reverted exception ("DO NOT 'FIX' THIS
  TO 12px"); the comment exists to stop this exact audit re-litigating it.
- **Sidebar's `rounded-xl` rows** - the rounded-xl trap is about boxes INSIDE cards; the rail is
  not a card. Verified against the radius-ladder rule's own wording.
- **`select.tsx` scroll buttons / `dialog.tsx` Overlay+Portal appearing unused** - internal uses
  knip cannot attribute (select.tsx:112,118; dialog.tsx:60-61). Un-export, never delete.
- **The `Secondary`/`Mist` near-identical values** - documented as the range running out, with a
  warning against "fixing" the ordering (globals.css:131-143).
- **`formatTimeAgo`, `parseJsonArray`, `metaLine`, `batchLine`, grapheme kit, `formatPaise`** -
  all heavily imported; utils.ts's live surface is genuinely live (only 101 of 742 lines were
  dead).

## For other lenses

- **Tour kit in `(main)/layout.tsx`** (`components/tour/*`, ~718 lines client): TourProvider is
  mounted for every member but the tour is opt-in outside the demo; TourOffer/TourPanel/
  TourSpotlight are `next/dynamic` candidates loaded when a tour starts. Bundle lens.
- **Collection page still on ActiveFilterChips/ResultCount** (see Owner decisions) - the page-side
  migration belongs to whoever owns `components/collection/collection-client.tsx`.
- **`ui/skeleton` grey-pulse consumers** `posts/post-feed.tsx` and `profile/profile-author-feed.tsx`
  are page-side files; my finding 14 covers the primitive, the call-site swap is theirs.
- **`house-picker.tsx` imports `HOUSE_TINTS_*` from `components/profile/houses-chain`** - a
  common->profile layering inversion; harmless, but if a profile lens restructures houses-chain it
  should know a common component reaches into it.
- **`app/api/dev-login/route.ts:124`** copies `avatarColor` - included in finding 04's sweep, but
  the file belongs to the auth/api lens; coordinate.
- **`e2e/visual.spec.ts` references `formatTimeAgo`** (imports from src) - visual lens should know
  utils.ts moves (finding 09) touch it only if the phone/rich-text moves change paths it imports
  (they do not).
- **not-found.tsx:162 honours `prefers-reduced-motion`** for the click flight while the house rule
  says motion never gates on the OS setting; the comment argues the rig's delights stay on. A
  design-rule call, not a simplification - flagging for the protocol/design lens.

## Metrics

- Lines read: ~10,900 in territory (10,718 per wc over the territory file set, plus specs).
- Territory sizes: ui/ 2,013 lines / 17 files; common/ (minus birds) ~2,700 / 23 + filters 987 /
  11; layout/ 2,155 / 10; app shell files 1,691 / 11; utils.ts 742; next-auth.d.ts 63.
- Comment-heaviest (comment:code): button.tsx 108:82 (1.32), utils.ts 364:325 (1.12), globals.css
  309:322 (0.96), segmented-pills.tsx 61:89 (0.69) - all verified protected reasoning.
- Biggest files: sidebar.tsx 755, utils.ts 742, globals.css 662, notification-bell.tsx 481,
  location-picker.tsx 453, image-viewer.tsx 444.
- Dead code found and verified: 101 lines (utils.ts) + 146 (badge/tabs) + ~280 (kit
  sub-primitives) + ~32 (globals tokens) + 6 (leaf alias) + ~45 (avatarColor code) = ~610 lines
  autonomous, + 128 owner-gated (LogoFact).
- Client-bundle-relevant: every deletion in ui/ and layout/ lands in the shared chunk set (all are
  imported by the sidebar/bell/shell that every authenticated page mounts).
- Dependencies removable: 1 (`tw-animate-css`).
