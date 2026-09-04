# shell-primitives - refactor audit 2 report

Territory reader for the application shell and the shared primitives: the root and `(main)`
layouts, `template.tsx`, the error/not-found/forbidden boundaries, `manifest`/`robots`/`sitemap`,
`globals.css`, `src/components/layout/**` (10), `src/components/ui/**` (16), the generic pieces of
`src/components/common/**` (20), `src/components/analytics/**` (3), `src/lib/utils.ts`,
`fnv1a.ts`, `theme.ts`, `components.json`, `postcss.config.mjs`. Date: 2026-09-04 (HEAD `72b5a1d`).
Files in territory: 62; read fully: 62.

## Coverage

- **Read fully**: every file listed in the charter, line by line. `src/app/layout.tsx`,
  `src/app/(main)/layout.tsx`, `(main)/template.tsx`, `(main)/error.tsx`, `src/app/error.tsx`,
  `src/app/not-found.tsx` (413), `(main)/forbidden.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`,
  `globals.css` (726), all ten `components/layout/*` (2,276 lines incl. `sidebar.tsx` 777 and
  `notification-bell.tsx` 460), all sixteen `components/ui/*` (1,532), the twenty chartered
  `components/common/*` files, all three `components/analytics/*`, `lib/utils.ts` (447),
  `lib/fnv1a.ts`, `lib/theme.ts`, `components.json`, `postcss.config.mjs`,
  `src/lib/text-shape.test.mjs`, `src/components/ui/focus-recipe.test.mjs`,
  `src/components/layout/sidebar-support-icon.test.mjs`,
  `src/components/common/{confirm-dialog,verified-mark,motion-namespace-rule}.test.mjs`.
- **Read outside the charter, deliberately**: `src/components/common/use-closing-dialog.ts` and
  `focus-modality.tsx` (the charter asks about dialog closers and the root layout mounts
  FocusModality); `src/components/mascot/sidebar-hoopoe.tsx` and
  `moments/logo-easter-egg-hoopoe.tsx` head + import block (the charter grants me "the sidebar's
  hoopoe mount is yours to weigh"); `src/app/(main)/feed/page.tsx:30-95` and
  `(main)/notifications/actions.ts:90-115` (the unread-count question).
- **Specs read**: `docs/spec/DESIGN-SYSTEM.md` in full, `docs/spec/mascot.md` §sidebar/moments,
  the audit-1 `shell-primitives.md` report in full, and the audit-1 `fix-prompt.md` rows that
  name it.
- **Skimmed**: `src/components/mascot/hoopoe.tsx` (import surface and the `.hoopoe-mascot` CSS
  block only, to find a marker unique to the puppet for the byte attribution below). It is the
  mascot lens's file.
- **Not read**: nothing in territory. The filters kit, the pickers, `use-user-search`, the photo
  primitives, the bird avatars and `next.config.ts` are other agents' by charter and I did not
  audit them; where I crossed them, it is under "For other lenses".
- **Uncommitted edits seen**: none in my territory. `git status --short` at session start showed
  only this audit's own untracked folder; the `image-viewer.tsx` modification listed in the
  session's opening snapshot had already landed as `72b5a1d`.
- **Measurements** were taken by reading the committed build in `.scratch/audit2-build/.next/`
  and `raw/route-bundle-stats.json` with `grep -F` on marker strings. I ran no build, no dev
  server, no browser and no database query.

## Summary

This territory is in genuinely good shape as *source*. Audit 1's cuts landed: the dead shadcn
sub-primitives are gone, `badge.tsx`/`tabs.tsx` are gone, `utils.ts` is down from 742 to 447 lines
with the rich-text renderer and the phone kit in their own modules, the dead globals tokens
(charts, `--z-base`, `--radius-4xl`, `--space-3xl`, `.animate-bell`, `--sidebar-primary`) are gone,
`tw-animate-css` is gone and `PopoverContent` is on the shared menu material, the bell's two
variant returns are collapsed into one, and the `m`-namespace rule holds — **zero** non-lab files
import the full `motion` namespace. I re-grepped every token in `globals.css` by hand and found
**no dead tokens left**. That well is dry.

The waste has moved from *lines* to *bytes on the wire*, and it is concentrated in two static
imports that put a module into a route's first load when nothing on that route can ever render it.

1. **`PageHeader` statically imports `SearchPill`.** Exactly one of its 31 call sites (in 27 files) passes
   `showSearch`, and only `/feed`. Measured against the build: 26 non-lab routes carry the
   SearchPill module, and on `/about` it is an 8.5 KB chunk holding nothing but `search-pill.tsx`
   and the six weight-variants each of two Phosphor glyphs. **22 routes pay 8.5 KB for a control
   they never draw** (~187 KB of first-load JS across the app).
2. **The sidebar's hoopoe statically imports the 28 KB puppet** for a bird that cannot appear for
   **90–120 seconds** (`IDLE_MIN_MS = 90_000`) and only on desktop. The puppet SVG is in the first
   load of 46 of 52 non-lab routes; about 30 of those have no other reason to hold it.
   `not-found.tsx` already ships the exact deferral pattern (dynamic + `onReady`) two directories
   away.

Third, a query finding: **three identical `notification.count` queries run per `/feed` load** —
the `(main)` layout, the feed page, and the bell's own mount-time `refreshCount()` — and two per
every other authenticated load.

Structural/cheap split: 10 structural findings, 6 cheap. The surprise was how thoroughly the
comment weight is earned; `posthog-client.ts` at 1.83 comment:code and `utils.ts` at 1.52 are
both entirely reasoning, dates, owner quotes and audit ids, and I propose trimming none of it.
The other surprise: `ui/card.tsx` — five exported components with house radius and shadow rules —
renders in exactly **one lab room** and nowhere in the shipped app, while 70 non-lab files
hand-write its class string. Audit 1's sub-primitive sweep could not see it because the lab room
keeps it alive.

## Findings

### shell-primitives-01 - PageHeader ships the SearchPill to 22 routes that never draw one
- **Where**: `src/components/layout/page-header.tsx:2` (the static import), `:29` and `:41`
  (the `showSearch` prop), `:141-145` (the render); the only caller that passes it is
  `src/app/(main)/feed/page.tsx:76`. The other two live SearchPills are passed through `actions`
  already: `src/components/collection/collection-client.tsx:1112` and
  `src/components/directory/directory-client.tsx:529`.
- **Phase**: placeholder (a prop one caller in twenty-five passes) → the fix is `relocate`
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "showSearch" src --include=*.tsx` returns exactly two files:
  `page-header.tsx` (the definition) and `feed/page.tsx:76`. Bundle attribution against
  `.scratch/audit2-build`: the string `"Search posts, by their words"` (SearchPill's default
  `label`, unique to that file) appears in 17 chunk files, and those chunks are in the first-load
  list of **26 of the 52 non-lab routes**. On `/about` the carrying chunk is
  `.next/static/chunks/2khgj6qcobwi-.js`, **8,508 bytes**, three Turbopack modules: the Phosphor
  `MagnifyingGlass` icon (six weights), the Phosphor `X` icon (six weights), and
  `search-pill.tsx`. Nothing else. The same 8.5 KB rides `/birds`, `/guide`, `/pick-bird`,
  `/messages`, `/letters`, `/catchups`, `/admin/analytics` and the rest of the admin panel.
  Root cause is a plain RSC fact: a server component that imports a client component puts that
  client module into the route's client bundle whether or not the branch renders — `showSearch`
  is checked at runtime, long after bundling.
- **What to do**: Delete the `showSearch` prop and the `SearchPill` import from `page-header.tsx`
  (lines 2, 29, 41, and the `{showSearch && …}` block at 141-145; drop `showSearch` from the
  `hasRight` expression at :48). In `src/app/(main)/feed/page.tsx`, import `SearchPill` directly
  and pass it through `actions`, keeping the `hidden sm:block` wrapper that page-header currently
  supplies: `actions={<><div className="hidden sm:block"><SearchPill /></div><NewPostCTA /></>}`.
  That is exactly the shape Collection and the directory already use, so the change makes the
  three call sites identical rather than making /feed special. `page-header.tsx:17-18` and
  :105-117 mention `showSearch` in prose; update those two paragraphs (the `group-has-
  [[data-search-open]]` title-fade note at :105-117 is still correct and must stay — it works off
  a data attribute, not the prop).
- **Saving**: **−8.5 KB raw first-load JS on 22 routes** (≈187 KB across the app; ≈3 KB gzipped
  per route), −1 prop, −1 static import edge. No source lines lost to speak of (~8).
- **Risk & gate**: low. `npm run check`; `npm run visual` (the feed header is a baseline route);
  open `/feed` at 1440 and at 390 and confirm the glass draws its line and the title fades on the
  phone. `npm run verify:crawl` to be sure no other page silently relied on the prop.
- **Confidence**: high. The byte number is read off the committed build, not estimated. The one
  thing that would change my mind: a near-term plan to put search on more surfaces — but even
  then the right shape is passing the pill in, since Collection and directory both need their own
  controlled instance and cannot use `showSearch` anyway.
- **Notes**: `NotificationBell` has the same static-import shape in this file (`:3`, `:151`) and
  only `/feed` passes `unreadCount` — but the bell is NOT a byte saving, because `sidebar.tsx:771`
  mounts the same component in the mobile top bar on every `(main)` route that is not `/feed`, so
  the module is on the floor regardless. Moving `unreadCount` into `actions` too would be tidier
  and save nothing; I would leave it, and say so in the commit so the next reader does not
  re-derive it. Related: `GuideDoor` (`page-header.tsx:4`) is statically imported and only seven of
  the 31 call sites pass `guide` — same shape, 115 lines, and it belongs to the guide lens (see
  "For other lenses").

### shell-primitives-02 - The sidebar mounts the 28 KB hoopoe puppet on every authenticated page for a bird that cannot appear for 90 seconds
- **Where**: `src/components/mascot/sidebar-hoopoe.tsx:37` (`import { Hoopoe } from "./hoopoe"`),
  mounted at `src/components/layout/sidebar.tsx:652`; and
  `src/components/mascot/moments/logo-easter-egg-hoopoe.tsx:36` (same static import), mounted at
  `sidebar.tsx:627`.
- **Phase**: architecture (deferral) / library
- **Tier**: T3     **Class**: structural     **Decides**: autonomous, but it touches a mascot file,
  so coordinate with the landing-mascot-avatars lens before the commit
- **Evidence**: `sidebar-hoopoe.tsx:42-43`: `IDLE_MIN_MS = 90_000; IDLE_MAX_MS = 120_000`. The bird
  is armed by a `setTimeout` that fires after 90–120 s of no activity, and only when
  `matchMedia("(min-width: 768px)")` matches (`:82-89`), so on a phone it never mounts at all.
  The logo egg fires only after three rapid clicks on the wordmark. Yet both statically import the
  puppet. Bundle attribution: the string `81.5789%` (from the `.hoopoe-mascot [data-part=root]`
  transform-origin rule at `hoopoe.tsx:1495`, unique to that file) is in
  `.next/static/chunks/0qa8au6zlhx7_.js`, **28,691 bytes**, which is in the first-load list of
  **46 of 52 non-lab routes**, `/about` and every `/admin/*` page included.
  The pattern to copy is two directories away and already written down, with its own gotcha
  solved: `src/app/not-found.tsx:28-31` loads the same component through
  `dynamic(() => import("@/components/mascot/hoopoe").then((m) => m.Hoopoe), { ssr: false })` and
  `:23-27` explains why the controller is filled from `onReady` rather than a `ref`
  (next/dynamic's wrapper does not forward refs, so `ref={ref}` leaves the controller null and the
  bird silently inert).
- **What to do**: In both files, replace the static import with the `not-found.tsx` `dynamic()`
  form and fill `apiRef`/its equivalent from `onReady` instead of `ref`. Nothing else changes:
  mascot.md's binding structural rule for these two files is that "a ref-owning wrapper is mounted
  early and its `<Hoopoe>` puppet mounted on demand, never both in the same commit" (the Strict
  Mode double-invoke postmortem at `87c054d^`) — that is about MOUNT order and is preserved
  exactly; only the module import moves. Optionally add `void import("@/components/mascot/hoopoe")`
  inside `tryEnter()` a beat before `setMounted(true)`, which starts the fetch while the guard is
  being checked; there are 8 s of `BLOCKED_RETRY_MS` and 90 s of idle to cover it, so no preload is
  strictly needed.
- **Saving**: **−28 KB raw first-load JS (~9 KB gz) on roughly 30 authenticated routes.** Honest
  scoping: the puppet stays on `/`, `/login`, `/signup`, `/reset-password`, `/forgot-password`,
  `/verify-email`, `/hoopoe` (first-paint birds by design, mascot.md), and on `/feed`, `/welcome`
  (`CelebrationSignals`), `/catchups`, `/catchups/new`, `/catchups/[id]/answer` and `/dark-mode`,
  each of which has its own static importer. The saving lands on `/about`, `/directory`,
  `/collection`, `/collection/[id]`, `/profile/[id]`, `/letters` ×4, `/messages` ×2, `/birds`,
  `/guide` ×2, `/pick-bird`, `/support`, `/notice/[id]` and all ten `/admin/*` routes.
- **Risk & gate**: medium. This is the one item in my report that a fixer can get subtly wrong,
  and the failure is silent: a `ref` left where `onReady` is needed produces a bird that never
  plays and no error anywhere. Gates: `npm run check`; then a hand test — sign in as Jerry, open
  `/about` on a desktop viewport, leave the mouse still for two minutes, and watch the bird glide
  in and settle; then click the sidebar wordmark three times fast and watch the egg fire. Also
  re-check the one-hoopoe guard still bites (`anotherHoopoeOnScreen()` reads the `.hoopoe-mascot`
  class off the DOM, which is unaffected by how the module arrived). `npm run visual` will not
  catch this either way — the bird is masked/absent in every baseline.
- **Confidence**: high on the measurement and on the deferral being correct; medium on the
  execution risk above.
- **Notes (read this before starting)**: `not-found.tsx:20-22` says *"Do NOT copy this to login,
  signup, the landing or the sidebar — all four show the bird at first paint by design
  (mascot.md)."* **That sentence is wrong about the sidebar**, and a fixer who reads it will stop.
  The sidebar's bird is the idle-rest moment: it is invisible for at least 90 seconds and never
  exists on a phone. Login, signup and the landing genuinely do paint a bird immediately and must
  keep their static imports. Fix that sentence in the same commit so the next reader is not
  misled again. Second fear: if Turbopack's chunking decides to inline the deferred module back
  into a shared group, the saving evaporates — the fix session should re-run the marker grep
  (`grep -lF "81.5789%"` over `.next/static/chunks/*.js`, then check the route's
  `firstLoadChunkPaths`) after the build to prove the bytes actually left.

### shell-primitives-03 - Three identical unread-count queries per /feed load, two per every other authenticated load
- **Where**: `src/app/(main)/layout.tsx:56-62` (the layout's `prisma.notification.count`);
  `src/app/(main)/feed/page.tsx:39-42` (the same count, same request);
  `src/components/layout/notification-bell.tsx:148-159` (`refreshCount()` fired from a mount
  effect, which calls `getUnreadNotificationCount()` →
  `src/app/(main)/notifications/actions.ts:96-103`, a third `prisma.notification.count`).
- **Phase**: dedupe (queries, not lines)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: All three are literally `prisma.notification.count({ where: { userId, read: false } })`.
  The layout runs it inside its `Promise.all`; `/feed` runs it again in its own `Promise.all` on
  the same request because a page cannot read a layout's locals; the client bell then asks a third
  time from `useEffect(() => { void refreshCount(); … }, [refreshCount])` at `:154-159`. The
  effect's own docblock (`:130-147`) argues for the *focus* listener, and that argument is sound —
  the sidebar bell lives in the layout and does not re-render on soft navigation, so its prop does
  go stale. But the **mount** call is not covered by it: at mount the prop was computed on the
  server milliseconds earlier, on the same request. On a hard load of `/feed` that is three round
  trips to Mumbai for one integer; on every other authenticated page it is two, because the
  sidebar's mobile top bar (`sidebar.tsx:765-773`) renders the bell in the DOM at every width
  (`md:hidden` is CSS, not React).
- **What to do**: Two independent halves, either safe alone.
  (a) Add `const unreadCountFor = cache(async (userId: string) => prisma.notification.count({ where: { userId, read: false } }))` to a small server module (`src/lib/notifications-count.ts`, or beside
  `notifications/actions.ts` if the fixer prefers) using React's `cache()`, and call it from both
  `(main)/layout.tsx:57` and `feed/page.tsx:40`. React `cache()` dedupes per request, so the two
  calls become one query. This is the same mechanism `auth()` already relies on — audit 1's
  fix-prompt records that `auth()` is `cache()`d and the double call is free, so the idiom is
  established here.
  (b) Drop the bare `void refreshCount()` at `notification-bell.tsx:155`, keeping the `focus`
  listener and its cleanup. Rewrite the docblock's last paragraph to say the initial value comes
  from the server prop and the listener is what keeps it honest.
- **Saving**: **−2 database queries per `/feed` load, −1 per every other authenticated page load**,
  and −1 client→server round trip on every authenticated page load. At the owner's stated 2,000-user
  headroom this is the difference between three and one query on the app's busiest route.
- **Risk & gate**: low-medium. The half worth pausing over is (b): confirm by hand that the badge
  is still correct after a soft navigation (it is — the PageHeader bell remounts with a fresh
  server prop on every navigation to `/feed`, and the sidebar bell is refreshed by the focus
  listener). Gates: `npm run check`; open `/feed`, mark one notification read on another device,
  switch tabs away and back, and confirm the count updates (that is the focus path, which must
  survive). No pinned test names these lines; `security-regressions.test.mjs` is untouched.
- **Confidence**: high on (a); medium-high on (b) — the thing that would change my mind on (b) is a
  case where the bell mounts long after its prop was computed. The only candidate is bfcache
  restore, and that fires `focus`, which is already handled.
- **Notes**: I deliberately do NOT propose polling. The existing comment already argues against it
  and is right. Nor do I propose removing the layout's count in favour of the page's — the sidebar
  bell needs it on every route, not just `/feed`.

### shell-primitives-04 - `ui/card.tsx` renders in one lab room and nowhere in the shipped app, while 70 files hand-write its class string
- **Where**: `src/components/ui/card.tsx:1-75` (all five exports); the only importer in the repo is
  `src/app/lab/location-picker/page.tsx:5`.
- **Phase**: placeholder (a maintained primitive with no production consumer)
- **Tier**: T3     **Class**: structural     **Decides**: **owner** (it is a kit decision, and one
  branch touches a lab room)
- **Evidence**: `grep -rn "components/ui/card" src e2e scripts` returns exactly two lines: the lab
  room's import, and a quoted string inside `src/app/lab/everything/_findings.ts:601`. `<CardHeader`,
  `<CardTitle`, `<CardDescription` and `<CardContent` each appear twice in the repo and **both**
  occurrences of each are in `src/app/lab`. Meanwhile `card-elevated` appears in 70 non-lab files,
  58 of them alongside `border` and `bg-card` — i.e. the app writes the Card's own class string by
  hand, 58 times, and the component that owns it is unused. Two smaller facts inside the file
  confirm it is unmaintained: `card.tsx:28` still carries
  `has-data-[slot=card-action]:grid-cols-[1fr_auto]`, and `CardAction` was deleted by audit 1
  (`grep -rn "card-action"` finds only this selector), so that rule can never match; and the
  `size="sm"` variant at `:9,:13` has **zero** call sites anywhere (`grep -rn "<Card" | grep size=`
  → nothing), so the four `data-[size=sm]:` / `group-data-[size=sm]/card:` clauses spread across
  `:15,:28,:41,:63` are dead too.
- **What to do**: The owner picks one.
  (a) **Adopt it.** Sweep the 58 hand-written card class strings onto `<Card>`. This is the
  design-system-correct answer and is how the radius ladder stops drifting — but it is a large,
  visible refactor across every feature folder, it is not a line saving (audit 1's lesson), and it
  is not mine to schedule.
  (b) **Delete it and let the lab room hand-roll.** `git rm src/components/ui/card.tsx`, and inline
  the four wrappers into `src/app/lab/location-picker/page.tsx` as plain divs with the same
  classes. −75 lines, −1 file, one fewer maintained primitive that no shipped page uses. The lab
  room is preserved (only its imports change), which I read as inside the "do not remove a lab
  room" rule rather than outside it — but touching a lab room at all is an owner call.
  (c) **Keep it as the kit's reference implementation**, and in that case at minimum delete the
  dead `card-action` selector and the whole `size="sm"` variant (≈8 lines and four class clauses),
  so the file stops carrying rules for things that do not exist.
  My recommendation is (c) now and (a) as a scheduled design pass later; (b) is defensible but
  throws away a component the app arguably should be using.
- **Saving**: (b) 75 lines + 1 file; (c) ~8 lines and four dead Tailwind clauses out of the CSS
  Tailwind emits for lab; (a) 0 lines and a real consistency win.
- **Risk & gate**: (c) near-zero, `npm run check`. (b) low — `npm run check` plus opening
  `/lab/location-picker`. (a) is a T4 design pass with `npm run visual` and screenshots.
- **Confidence**: high on the facts; the recommendation is a judgement.
- **Notes**: This is the finding audit 1 could not have made: its sub-primitive sweep asked "does
  anything import this symbol" and a lab room said yes. The right question is "does anything the
  public sees import this", and the answer is no. Worth carrying that question into the next audit
  as a general rule.

### shell-primitives-05 - Thirteen of the ui/ wrappers are pure pass-throughs, and the attribute they add is read in one place
- **Where**: `src/components/ui/dialog.tsx:10-20` (`Dialog`, `DialogTrigger`, `DialogPortal`);
  `src/components/ui/dropdown-menu.tsx:8-14` (`DropdownMenu`, `DropdownMenuTrigger`);
  `src/components/ui/sheet.tsx:10-24` (`Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal`);
  `src/components/ui/popover.tsx:17-27` (`Popover`, `PopoverTrigger`, `PopoverPortal`);
  `src/components/ui/combobox.tsx:55-57` (`ComboboxPortal`).
- **Phase**: architecture (over-abstraction, LLM-bloat signature 5)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous, but it is a house-convention
  change, so worth a sentence to the owner
- **Evidence**: Thirteen functions (11 of them exported; `DialogPortal` and `SheetPortal` are file-internal) whose entire body is
  `<Primitive data-slot="x" {...props} />`. They add no class, no default, no behaviour — only the
  `data-slot` attribute. I grepped every `data-[slot=…]` / `has-data-[slot=…]` selector in `src`:
  there are exactly **two**, `ui/card.tsx:28` (which is dead, see -04) and `ui/select.tsx:44`
  (`*:data-[slot=select-value]:…`, live). So of ~30 `data-slot` attributes the kit stamps onto the
  DOM, **one** is ever selected on. The rest are shadcn convention and a debugging aid.
  Contrast with the wrappers that earn their keep and must stay: `DialogContent` (composes
  Portal + Overlay + the material + the close button), `DropdownMenuContent` (Portal + Positioner +
  `MENU_PANEL_CLASS` + the 6px placement), `SelectContent`, `ComboboxPopup`, `PopoverContent`,
  `PopoverPositioner` (the `sideOffset = 6`/`align = "start"` defaults that put it on the material).
- **What to do**: Two honest options, and I lean to the second.
  (a) Delete the thirteen pass-throughs and re-export the primitives directly:
  `export const Dialog = DialogPrimitive.Root` etc., the shape `select.tsx:11`
  (`const Select = SelectPrimitive.Root`) and `combobox.tsx:21` already use, so the kit is not even
  self-consistent today. ~55 lines, one fewer React element per popup instance in the tree.
  (b) Leave them and write one sentence at the top of each file saying the `data-slot` is a
  debugging handle, not a selector — because the wrapper is also where a future default would
  land, and shadcn's own generator expects the shape.
  Either way, make it consistent: today `Dialog` is a wrapper and `Select` is a bare re-export,
  which is drift.
- **Saving**: (a) ~55 lines and thirteen React function components out of the client bundle; the
  byte saving is small (these minify to almost nothing) but the element-per-popup saving is real
  in a feed with twenty post menus.
- **Risk & gate**: low. `npm run check` (TypeScript catches a prop-type mismatch on a bare
  re-export — that is the one real risk, since `PopoverPrimitive.Root.Props` and the wrapper's
  signature must stay compatible). `npm run visual`.
- **Confidence**: high on the facts; medium on which option the owner wants.
- **Notes**: I did NOT propose removing `data-slot` from the wrappers that do work — it costs a
  handful of bytes and the two live selectors need it. And I am aware this is the kind of finding
  that reads as tidying; the reason it is structural rather than cheap is that the kit currently
  answers "is a wrapper a place to hang a default" two different ways in one folder.

### shell-primitives-06 - Three dead Button variants/sizes in the app's most-imported primitive
- **Where**: `src/components/ui/button.tsx:113` (`link` variant), `:130` (`icon-xs` size),
  `:132` (`icon-lg` size)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: exhaustive grep across all of `src` (lab included), `e2e/`, `scripts/` and every
  `*.test.mjs`: `variant="link"` / `variant: "link"` → **0** hits anywhere;
  `size="icon-xs"` → **0**; `size="icon-lg"` → **0**. For contrast, the live ones:
  `primary` 68, `outline` 76, `ghost` 19, `destructive` 12, `secondary` 4, `sm` 53, `xs` 31,
  `lg` 23, `icon-sm` 8, `icon` 3, and bare `<Button>` (the `default` variant, which is deliberately
  the same `CANOPY_FILL` as `primary` — audit 1 established that is intentional and it stays).
- **What to do**: Delete the three lines. `link` in particular is a shadcn leftover that would
  render an underlined text button, which this design system does not have (`DESIGN-SYSTEM.md` §3:
  "Buttons / CTAs / chips / tags: full pill"), so it is a variant that would be *wrong* if anyone
  used it. `icon-xs` also carries an `[&_svg:not([class*='size-'])]:size-3` clause that goes with
  it. Nothing else references them; `focus-recipe.test.mjs:99-106` pins the base ring and the
  absence of per-variant ring colours, not the variant list, so it stays green.
- **Saving**: 3 lines, three dead cva branches out of a file in every route's bundle, and three
  fewer Tailwind class strings for the compiler to emit into the 233 KB stylesheet.
- **Risk & gate**: near-zero. `npm run check` — a missed call site is a TypeScript error, since
  `VariantProps<typeof buttonVariants>` narrows to the literal union.
- **Confidence**: high. Would change my mind: nothing; they are one `cva` line each to restore.

### shell-primitives-07 - `not-found.tsx`'s 413 lines of flight machinery ride the first load of all 52 routes
- **Where**: `src/app/not-found.tsx:1-413` (the whole file; the deferrable half is
  `:110-155` the token/`until`/`hold` kit, `:170-355` the director effect, and the
  `{solo && …}` stage at `:395-411`)
- **Phase**: architecture (deferral)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `.next/static/chunks/0uxgeqj6j_wg1.js` is **6,116 bytes** and contains the marker
  `"wandered off the path"`; it appears in the `firstLoadChunkPaths` of **52 of 52** non-lab
  routes. Next includes the root `not-found` boundary in every route's client graph, which is
  correct and unavoidable for the *boundary* — but the boundary only has to be the copy block. The
  puppet is already dynamic (`:28-31`, and that comment explains exactly why), so what actually
  ships everywhere is the token machinery, `rigMetrics`, `smoother`, the idle-beat loop and the
  pointer handler.
- **What to do**: Split the file. `not-found.tsx` keeps the four static elements (the 404, the two
  headings, the Link + Button) and becomes as small as it can be; everything from `RIG_MOBILE`
  down moves to `src/app/_not-found-stage.tsx` (or `src/components/mascot/moments/not-found-stage.tsx`,
  which is where a fixer might prefer it), loaded from `not-found.tsx` with
  `dynamic(() => import(...), { ssr: false })`. The stage owns the `onPointerDown` handler and the
  `fixed` bird wrapper; the copy block does not need it, because the handler is on `<main>` and a
  wrapper `<div className="fixed inset-0" onPointerDown>` inside the stage does the same job.
- **Saving**: roughly **−4 to −5 KB raw first-load JS on all 52 non-lab routes** (≈250 KB across
  the app), leaving ~1 KB of boundary. 0 source lines.
- **Risk & gate**: low-medium. The 404 is not in `e2e/visual.spec.ts`'s `ROUTES`, so `npm run visual`
  will not cover it — verify by hand: open a nonsense URL signed out and signed in, confirm the copy
  renders instantly, the bird arrives a beat later, a click sends it, and a nested `notFound()` from
  an admin page still shows the copy with the sidebar intact (the `useSoloHoopoe()` guard). Re-run
  the chunk grep afterwards to prove the bytes left.
- **Confidence**: medium-high. The measurement is certain; the risk is that a fixer breaks the
  one-hoopoe guard or the `solo` gate while splitting. Would change my mind: if the split turns out
  to need most of the file in the boundary anyway (it should not — the boundary needs no state).
- **Notes**: Audit 1 listed this file as a not-finding on the grounds that "its code loads only on
  the 404 route". That was wrong, and I am re-opening it with the measurement as the new evidence
  the brief requires. Everything else about audit 1's judgement stands: it is an intentional
  delight, the comment block is a design document, and none of it should be deleted.

### shell-primitives-08 - `ui/combobox.tsx`: 167 lines and ten exports for one caller
- **Where**: `src/components/ui/combobox.tsx:1-167`; the only importer is
  `src/components/common/location-picker.tsx:19`.
- **Phase**: architecture (over-abstraction with one caller)
- **Tier**: T3     **Class**: structural     **Decides**: owner (a kit-shape call)
- **Evidence**: `grep -rn "components/ui/combobox" src` → one line. The file's own docblock
  (`:9-19`) argues the split is right — "domain composition … lives in the feature component that
  uses it (location-picker.tsx)" — and that argument is genuinely good for a *reusable* primitive.
  It has had one consumer since it was written. Three of its ten exports (`ComboboxPortal`, and the
  bare `Combobox` re-export) add nothing but a `data-slot` (see -05).
- **What to do**: My recommendation is to **keep it and change nothing**, and to record here that
  it was examined so the next audit does not re-open it. The counter-case, if the owner disagrees:
  fold the ten wrappers into `location-picker.tsx` as local components, −167 lines and −1 file,
  at the cost of the next combobox in the app having to re-derive the menu material. The same
  question applies with less force to `ui/select.tsx` (209 lines, two importers:
  `posts/report-dialog.tsx` and `posts/post-feed.tsx`) and `ui/label.tsx` (20 lines, one importer:
  `onboarding/steps/register-step.tsx`).
- **Saving**: 0 if kept (recommended); 167 lines + 1 file if folded.
- **Risk & gate**: n/a if kept.
- **Confidence**: high on the counts; the recommendation is a judgement, and I lean to keeping
  because the menu-material rule (`DESIGN-SYSTEM.md` §3, "one material") is exactly the kind of
  thing that decays when the material lives inside a feature file.
- **Notes**: `ui/label.tsx` also carries a needless `"use client"` (`:1`) — it renders a plain
  `<label>` and imports no client library. It is harmless today because its one consumer is
  already a client component, but it is the kind of directive that turns a server tree client the
  first time somebody reuses it. Fold that one-line deletion into -12.

### shell-primitives-09 - `VerifiedMark` is a third tooltip system, hand-rolled, with state per row
- **Where**: `src/components/common/verified-mark.tsx:41-109` (the whole `VerifiedMarkInner`:
  two `useState`, a `useLayoutEffect` that measures against the viewport and flips side, and a
  label span rendered at `opacity-0` into the DOM of every row)
- **Phase**: dedupe / library
- **Tier**: T3     **Class**: structural     **Decides**: owner (it changes a hover a member sees)
- **Evidence**: The app has three answers to "a small thing explains itself on hover":
  `InfoTooltip` (`common/info-tooltip.tsx`, built on the shared `Popover`, so it gets Base UI's
  collision handling, portalling and touch behaviour for free); the native `title=` attribute
  (`notification-bell.tsx:279`, `:419`); and this, which reimplements collision flipping by hand at
  `:58-69` with a `getBoundingClientRect` + `window.innerWidth` comparison and an
  `eslint-disable-next-line react-hooks/set-state-in-effect` to make it lint. Cost: every verified
  member's row in the feed, the directory and the map drilldown mounts a client component with two
  pieces of state and a layout effect, and paints a hidden label span. A feed of twenty posts by
  verified members is twenty of them.
- **What to do**: Either rebuild it on `Popover` + `PopoverPositioner` (the flip becomes the
  positioner's job and ~35 lines go), or — cheaper and probably better here — make it CSS-only:
  the label is a fixed short string, so `group-hover:opacity-100 group-focus-visible:opacity-100`
  on a `peer`/`group` wrapper removes both `useState` and the layout effect, and the flip can be
  handled by anchoring the label to the row rather than the glyph. The second keeps the component
  a server component, which is the real win. Either way, keep the wording pin: `verified-mark.test.mjs`
  asserts the label is exactly `"Verified"` and never `"Verified member"` — that test must stay green.
- **Saving**: ~35 lines; and if the CSS-only route is taken, the component stops being
  `"use client"` at all, removing N client component instances per list page. 0 KB directly (the
  file is small), but it removes a layout effect per verified row.
- **Risk & gate**: medium — this is a hover a member sees, and the flip exists because the label
  ran off the right edge on a phone. `npm run visual` masks the feed body, so verify by hand at
  390×844 on `/directory` with a verified member near the right edge, and on `/profile/[id]` where
  the 16px size is used. Keep both sanctioned sizes (13 and 16; the docblock at `:16-19` is an
  owner decision).
- **Confidence**: medium. The thing that would change my mind: if the flip genuinely cannot be done
  without measurement in the layouts it appears in, in which case rebuilding on `Popover` is the
  answer rather than CSS.

### shell-primitives-10 - The z-index tokens are a migration that stopped: three tokens, four call sites, `z-50` everywhere else
- **Where**: `src/app/globals.css:50-56` (the token block and its migration note); the four
  non-lab consumers are `catchups/answer/progress-rail.tsx:142` (`--z-elevated`),
  `ui/combobox.tsx:74` (`--z-floating`), `collection/contribute-room.tsx:745` and
  `common/image-viewer.tsx:542` (`--z-overlay`).
- **Phase**: placeholder (a convention adopted by four files)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the comment at `:50-53` says "Migrate ad-hoc z-* values onto these as they're
  touched". Two years of touching later, the count outside lab is **1 / 1 / 2**. Meanwhile the
  primitives that define the app's stacking order all use raw numbers:
  `ui/dialog.tsx:39,:66` `z-50`, `ui/sheet.tsx:35,:71` `z-50`, `ui/dropdown-menu.tsx:34,:44`
  `z-50`, `ui/select.tsx:90,:100` `z-50`, `ui/popover.tsx:40` `z-50`, `sidebar.tsx:622` `z-10`,
  `:671` `z-40`, `konami-eggs.tsx:68` `z-[120]`. `--z-overlay` is literally defined as `50`, so
  the tokens and the raw values already agree — which is the worst state: two vocabularies for one
  fact, and nothing failing if they drift.
- **What to do**: pick one and finish it, in a single mechanical commit.
  (a) Adopt: replace `z-50` with `z-[var(--z-overlay)]` in the five `ui/` popup files,
  `z-10`→`z-[var(--z-elevated)]` and `z-40`→ a new `--z-app-bar: 40` in `sidebar.tsx`, and give
  `konami-eggs`'s `z-[120]` a name. Then the stacking order is one readable ladder.
  (b) Abandon: delete the three tokens and the migration comment, convert the four call sites to
  the numbers they already resolve to, and say in the comment block that raw `z-` values are the
  house convention.
  I lean to (a): the sidebar (`z-10`), the mobile app bar (`z-40`), the popups (`z-50`) and konami
  (`120`) are a real four-rung ladder that nothing currently writes down, and getting it wrong is
  the sort of bug that shows up as "the menu opened behind the header".
- **Saving**: 0 lines. Clarity only, plus one place to change the ladder.
- **Risk & gate**: low for (a) if done mechanically — the values are identical, so nothing moves.
  `npm run check`; `npm run visual`; open a dropdown inside a dialog and the mobile drawer over the
  app bar to be sure.
- **Confidence**: high on the counts.

### shell-primitives-11 - `--space-xxl`'s only non-lab consumer is a file knip lists as unused
- **Where**: `src/app/globals.css:89` (`--space-xxl: 4.236em`); its one non-lab consumer is
  `src/components/landing/showcase.tsx:154`.
- **Phase**: dead (conditionally)
- **Tier**: T1     **Class**: cheap     **Decides**: owner (it depends on the landing showcase
  decision, which is an audit-1 carry-over)
- **Evidence**: `grep -E "space-xxl"` over `src` returns 7 hits: 6 in `src/app/lab`, and
  `landing/showcase.tsx:154`. `raw/knip-repo-config.txt` lists `src/components/landing/showcase.tsx`
  among its seven unused files. So if the landing showcase family is retired (audit 1 §4, still
  open), `--space-xxl` becomes dead and can go with it. Every other `--space-*` rung is genuinely
  live outside lab: xxs 10, xs 41, s 78, m 108, l 92, xl 25.
- **What to do**: Nothing on its own. Whoever resolves the showcase decision should delete
  `globals.css:89` in the same commit if the showcase goes. Noted here so the token is not left
  behind as the next audit's "unused token".
- **Saving**: 1 line, and one custom property out of the shipped `:root` block.
- **Risk & gate**: n/a until the showcase decision lands.
- **Confidence**: high.

### shell-primitives-12 - Audit-1 hygiene rows that never landed, plus four new ones
- **Where & what** (each verified individually this session):
  - **`src/app/layout.tsx:75-82` — a stale comment that is now false.** It says "HARD GUARD: until
    a `.dark` block exists in globals.css this is visually inert". The `.dark` block shipped:
    `globals.css:270-352`, 60 lines of it. Audit 1's -15 asked for this and it was not done. Rewrite
    to three lines: the per-request theme comes from the `rv-theme` cookie so SSR paints the
    member's choice with no flash; `enableSystem` is off because dark is entered only through the
    settings gauntlet.
  - **`src/components/layout/sidebar.tsx:394-400` — `countFor` is still there.** A seven-line
    single-use helper whose whole body is `if (!counts) return undefined; return counts[key]`,
    i.e. `counts?.[key]`. Inline it at `:385`. Audit 1's -15 asked for this too.
  - **`src/components/layout/peaks-mark.tsx:33-34` — `PEAK_SPAN` and `PEAK_CENTRE` are exported to
    nobody.** Both are used only inside the file (`:34`, `:35`). Their only external mention is
    `src/lib/mark-centring.test.mjs:79`, which reads the *source text* with a regex
    (`/VIEWBOX_X = PEAK_CENTRE - VIEWBOX_WIDTH \/ 2/`) and does not import them, so un-exporting is
    safe and the pin stays green. `PEAK_PLANES` (`:84`) is genuinely used by three lab rooms and
    stays exported.
  - **`src/components/common/motion-features.tsx:23` — a stale filename.** It says
    "`no-motion-namespace.test.mjs` is what keeps the app side honest"; the file is
    `src/components/common/motion-namespace-rule.test.mjs`. One word.
  - **`src/components/layout/search-pill.tsx:195` — `m.form` animates nothing.** It carries only
    `onSubmit` and `className`; there is no `initial`/`animate`/`variants` on it. Make it a plain
    `<form>` and one motion component per header goes away. (The `m.div` at `:206` and the
    `m.span` at `:344` do animate and stay.)
  - **`src/components/analytics/posthog-identify.tsx:44-48` — an effect returns a cleanup function
    that does nothing but hold a comment.** React calls it on every dep change. Delete the
    `return`, keep the comment above the `whenPostHog` line.
  - **`src/components/layout/sidebar.tsx:643-645` and `:729-731` — the same teacher test written
    twice**: `user.accountType === "teacher" || user.accountType === "ex_teacher"`. Hoist one
    `const hideCatchups = …` next to `inAdmin` at `:595` and pass it to both `NavLinks`. Three
    lines, and the desktop rail and the mobile drawer can no longer disagree about who sees
    Catch-ups.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: per item above; every one grep-verified against HEAD.
- **What to do**: one mechanical commit.
- **Saving**: ~20 lines, one motion component per page header, one stale comment that would have
  misdirected the next reader of the theme code.
- **Risk & gate**: near-zero. `npm run check`. `mark-centring.test.mjs` and
  `sidebar-support-icon.test.mjs` must stay green (both read source text; neither is affected).
- **Confidence**: high.
- **Notes**: audit 1's -15 also asked for `THEME_COLORS` (`app/layout.tsx:47`) and `isWideRoute`
  (`content-column.tsx:55`) to be un-exported. `isWideRoute` **is** un-exported now. `THEME_COLORS`
  must **stay exported**: `src/lib/proxy-rule.test.mjs:141-145` matches on `THEME_COLORS[` and on
  the exact declaration shape. Audit 1 was wrong about that one; do not "fix" it.

### shell-primitives-13 - `not-found.tsx` gates a flight on the OS reduced-motion setting, which the design system forbids
- **Where**: `src/app/not-found.tsx:181` (`const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches`) and `:242-245` (the branch that teleports instead of arcing)
- **Phase**: hygiene (protocol conformance)
- **Tier**: T2     **Class**: cheap     **Decides**: **owner** (it is a stated design rule with one
  documented exception being asserted in code)
- **Evidence**: `DESIGN-SYSTEM.md` §7, first line: "**Animations always play.** Never gate motion on
  the OS `prefers-reduced-motion` setting, anywhere in the app. (The only thing that pauses motion
  is the browser tab being hidden.)" `globals.css:457-460` restates it. `motion.tsx:99-104` builds
  the whole `useMotionGovernor` around it and says `ambientReduced` "must NEVER be wired to
  `window.matchMedia("(prefers-reduced-motion)")`". This file does exactly that, and argues for
  itself in a comment at `:178-181`. It is the only such site left in non-lab `src` that I found.
- **What to do**: the owner decides whether the 404 keeps its exception. If yes, the exception
  belongs in `DESIGN-SYSTEM.md` §7 as a named carve-out, so the rule stops being contradicted
  silently. If no, delete `:181` and the `if (calm)` branch at `:242-245` (5 lines) — the bird
  always arcs.
- **Saving**: 5 lines, or one honest line in the spec.
- **Risk & gate**: low either way. `npm run check`.
- **Confidence**: high on the contradiction; the resolution is the owner's.
- **Notes**: audit 1 flagged this for the design lens and it was not resolved. Flagging again with
  the spec line quoted so it can be closed one way or the other rather than carried a third time.

### shell-primitives-14 - The three action buttons repeat the same `onDark` block, and the same press
- **Where**: `src/components/common/love-button.tsx:104-110` vs
  `src/components/common/share-button.tsx:58-62` (the `onDark ? … : "state-layer …"` ternary and its
  ~8-line justifying comment, written twice); `bookmark-button.tsx:58-64`,
  `love-button.tsx:90-96`, `share-button.tsx:48-53` (the identical
  `type="button"` + `whileTap={{ scale: 0.93 }}` + `transition={SPRINGS.snappy}` +
  `rounded-full px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2`
  opening, written three times).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the three files sit in the same post-card footer row and were extracted at
  different times; each carries its own copy of the `-4.50 vs +2.06 dL*` measurement in a comment
  and cross-references the others by name ("see love-button.tsx"), which is the tell.
- **What to do**: honestly, **probably nothing**, and I want to say why rather than propose churn.
  Audit 1's closing lesson is that deduplication cannot save lines here: a shared
  `ACTION_BUTTON_BASE` const plus three imports plus a docblock costs about what the three copies
  cost, and the three buttons have genuinely different insides. The one piece worth sharing is the
  `onDark` pair, because `love-button` and `share-button` must agree about what "floating over a
  photograph" looks like and today nothing makes them: a two-line
  `export const ON_DARK_ACTION = "text-white/85 transition-colors duration-150 hover:bg-white/12 focus-visible:outline-white"` beside `SPRINGS` in `motion.tsx`, or in a new
  `common/action-button.ts`, with the measurement comment moved there once instead of twice.
  `bookmark-button` has no `onDark` and does not join.
- **Saving**: ~10 lines; the real value is "0 lines, one fewer place for the two viewer buttons to
  drift apart".
- **Risk & gate**: low. `npm run check`; open a photo in the viewer and check the heart and the
  share arrow read the same weight over a bright photograph.
- **Confidence**: medium-high; this is a taste call and skipping it costs nothing.

### shell-primitives-15 - `utils.ts` is not a grab-bag any more; two exports exist only for their test
- **Where**: `src/lib/utils.ts` (447 lines, 24 exports)
- **Phase**: n/a — this is the charter's floor question, answered, with one small item attached
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the full fan-in census, counted by grep over `src`, `e2e` and `scripts` excluding
  `src/generated` and the file itself:

  | Export | External callers | Verdict |
  |---|---|---|
  | `cn` | 128 files | the reason the module exists |
  | `metaLine` | 21 | live |
  | `batchLine` | 17 | live |
  | `formatTimeAgo` | 13 | live |
  | `formatDisplayDate` | 10 | live |
  | `parseJsonArray` | 9 | live |
  | `readMinutes` | 9 | live |
  | `valleyYear` | 9 | live |
  | `VALLEY_TIME_ZONE` | 6 | live (see note) |
  | `valleyDayKey` | 6 | live |
  | `plainExcerpt` | 5 | live |
  | `letterTitle` | 4 | live |
  | `batchTypeFromLeaving` | 4 | live |
  | `FULL_NAME_MAX` | 4 | live |
  | `valleyMidnight` | 3 | live |
  | `formatDisplayDateLong` | 3 | live |
  | `formatPaise` | 2 | live |
  | `valleyDaysBetween` | 2 (`catchups-core.ts`, its test) | live |
  | `valleyDayStart` | 2 (`feed/actions.ts`, its test) | live |
  | `fullNameFits` | 2 (`validators.ts`, its test) | live |
  | `graphemes` | 1 (`admin-threads.ts`) | live |
  | `getInitials` | 1 (`bird-avatar.tsx`) | live |
  | `firstGrapheme` | **0 outside `text-shape.test.mjs`** | internal to `getInitials` |
  | `truncateGraphemes` | **0 outside `text-shape.test.mjs`** | internal to `letterTitle`/`plainExcerpt` |

  So: **no, it is not a grab-bag again.** Every export but two has a real caller, and the two
  exceptions are exported so `text-shape.test.mjs` can unit-test the grapheme edge cases directly
  (the ZWJ family emoji, the flag, the lone-surrogate assertions at `:38-59,65-67`). That is a
  legitimate consumer and I would keep both exported; the alternative is testing them only through
  `letterTitle`, which is weaker.
- **What to do**: One real item, and it is small: `utils.ts:133` constructs
  `new Intl.Segmenter(undefined, { granularity: "grapheme" })` at **module scope**, so every client
  chunk that imports only `cn` — which is 128 files — resolves an ICU segmenter at import time.
  Audit 1's fix session measured the analogous move (the rich-text regexes and the phone kit) at
  only ~2 KB, so the byte case is weak; the runtime case is that this is work done on every page
  for a function two files call. A lazy getter is four lines and changes nothing observable:
  `let seg: Intl.Segmenter | undefined; const segmenter = () => (seg ??= new Intl.Segmenter(undefined, { granularity: "grapheme" }));`
  with `graphemes()` calling `segmenter()`. Keep the existing comment at `:121-132` — it explains
  why the instance is shared, which is still true — and add one sentence saying it is now built on
  first use.
- **Saving**: 0 lines; one `Intl.Segmenter` construction removed from the import-time work of every
  page in the app.
- **Risk & gate**: low. `npm run check` — `text-shape.test.mjs` covers `graphemes` through four
  functions and is the gate.
- **Confidence**: high on the census; medium on whether the segmenter change is worth the churn
  (it is four lines, so I lean yes).
- **Notes**: one cross-cutting observation while I was counting. `VALLEY_TIME_ZONE` has six
  importers, and **all six hand-roll their own `toLocaleDateString(..., { timeZone: VALLEY_TIME_ZONE, … })`**:
  `letters/[id]/(read)/page.tsx:196`, `settings/actions.ts:233`, `auth/verify-email-banner.tsx:56`,
  `catchups/index/fresh-off-the-press.tsx:29`, `catchups/home/extend-deadline-card.tsx:50`,
  `lib/demo-seed/seed.ts:500`. Alongside `formatDisplayDate`, `formatDisplayDateLong` and
  `formatTimeAgo`, that is nine date voices where `formatDisplayDateLong`'s own docblock (`:233-236`)
  says the whole point was to stop having "six local formatters in three tags". Whether those six
  genuinely need different shapes is a question for the lens that owns each file; I flag it under
  "For other lenses" rather than proposing a sweep from here.

### shell-primitives-16 - `search-pill.tsx` adds a window resize listener that only three surfaces need, and measures on every mount
- **Where**: `src/components/layout/search-pill.tsx:129-142`
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the effect runs `measure()` immediately and registers a `resize` listener for the
  life of the component, to compute a rule width that is only ever *seen* once the pill is open.
  At rest the pill is a 40px glass and `full` is unread. After -01 lands this is on three surfaces
  rather than 22, which makes it much less interesting — which is why it is here at cheap tier
  rather than as a finding of its own.
- **What to do**: gate the listener on `open` (`useEffect(() => { if (!open) return; … }, [open])`),
  keeping the initial `measure()` so the first frame of the open is already the right width. Or
  leave it; after -01 the cost is three listeners on three pages.
- **Saving**: 2 window listeners per page, post -01. Nothing measurable.
- **Risk & gate**: low. Open the search on `/collection` at 390 and confirm the line still reaches
  the column's left edge, then rotate/resize with it open.
- **Confidence**: medium. Do -01 first and then decide whether this is worth touching at all.

## Owner decisions

**The sidebar's sleeping hoopoe is downloaded on every page, ninety seconds before it can appear
(finding 02).** Every signed-in page currently downloads the full hoopoe puppet — about 28 KB —
even though the sidebar's bird only wakes up after a minute and a half of you doing nothing, and
never appears on a phone at all. We can load it only when it is actually about to be needed, which
is a change nobody can see: the bird still glides in at the same moment, from the same corner, and
the logo easter egg still fires on three clicks. The cost is that a fix session has to be careful,
because if it is done wrong the bird simply never shows up and nothing complains. My
recommendation: do it, and check it by hand afterwards (sit still on `/about` for two minutes).

**The Card component nobody uses (finding 04).** There is a `Card` component in the shared kit with
all the house rules baked in — the 16px corners, the soft layered shadow — and the only place in
the whole project that uses it is one lab room. Everywhere else, all seventy of them, the same
styling is typed out by hand. Three options: adopt it properly across the app (correct, but a big
visible refactor that should be scheduled, not slipped in), delete it (75 lines gone, the lab room
inlines its own), or keep it as the written-down reference and just remove the two parts of it that
are provably dead. I recommend the third now and the first as a scheduled design pass.

**The 404 page's one exception to "animations always play" (finding 13).** The design system says,
in the owner's own standing decision, that motion never turns itself off because of an operating
system setting. The 404 page's bird does exactly that for its click-flight, and argues for itself
in a comment. It needs to be one or the other: either write the exception into the design system so
it is a decision rather than a contradiction, or take it out and let the bird always fly. Either is
fine; leaving it as it is means the next audit finds it again, as this one did.

**`--space-xxl` waits on the landing showcase (finding 11).** One spacing value in the design tokens
is used by exactly one file outside the design lab, and that file is one of the five landing-page
files that have been switched off since the last audit and are still waiting on your decision.
Whatever you decide about the showcase, that token goes or stays with it.

## Not-findings

Things that look like bloat in this territory and are verified intentional. Recorded so no future
audit re-opens them.

- **`globals.css`'s 383 comment lines against 305 of code (density 1.26).** Every block I read
  carries a measurement (dL* tables, WCAG ratios), a date, an owner quote, or an audit id. The
  `--secondary`/`--mist` "range running out" note at `:119-131` and the state-layer derivation at
  `:204-235` are load-bearing: they are the reason the values are what they are, and both explicitly
  warn a future session not to "fix" them. Protected by the "every constant argued for" standard.
- **There are no unused tokens left in `globals.css`.** I grepped every custom property, every
  `@theme` alias and every `@utility` by name across `src`, `e2e` and the built stylesheet.
  Audit 1's -05 removed the dead set (charts, `--z-base`, `--radius-4xl`, `--space-3xl`,
  `.animate-bell`, `--sidebar-primary`) and nothing has rotted since. Lowest-consumer survivors, all
  live and all justified: `--color-float` (1 consumer, `ui/dialog.tsx:66`, and it is the top rung of
  the documented surface ladder), `--sidebar-border` (1), `--sidebar-active` (1),
  `--sidebar-foreground-muted` (1), `--space-xxl` (1, see -11). A token with one consumer that names
  a rung of a documented ladder is not dead code.
- **`--input` and `--border` hold identical values in both themes.** Two names, one hex. That is the
  shadcn contract (a future session may want a different field edge) and costs one line.
- **`posthog-client.ts` at 1.83 comment:code, the highest in the repo.** The whole file is the M42
  ordering postmortem, the ad-blocker reasoning for `/ingest`, the session-replay decision in the
  owner's words, and the C-120 correction of a comment that used to be wrong. It is the most
  valuable prose in my territory. PostHog `identify` is wired exactly once
  (`(main)/layout.tsx:111` → `posthog-identify.tsx:43`, chained on the `whenPostHog` promise so it
  cannot fire before init), which was the charter's question.
- **The `m`-namespace split holds.** `grep -E "\bmotion\.[a-z]"` over non-lab `src` returns zero
  real hits (the two matches are the words "motion.div" inside comments). No non-lab file imports
  `motion` from `motion/react`. `LazyMotion` is mounted once, in the root layout, with `domMax`,
  and `motion-namespace-rule.test.mjs` pins both halves with two anti-vacuity asserts. Audit 1's
  biggest win in this territory is intact.
- **`(main)/template.tsx`.** Cannot fold into the layout; a template re-mounts per navigation and
  that is the entire mechanism of the content cross-fade. Its header comment says so.
- **`ContentColumn` being `"use client"`.** It needs `usePathname` live on soft navigations; the
  layout's `x-pathname` header is stale after a client-side nav.
- **`field-focus.ts`'s three near-identical 7-token strings.** `FIELD_FOCUS`, `FIELD_FOCUS_SHELL`
  and `FIELD_FOCUS_WITHIN` differ by one token each and look like an obvious candidate for a
  builder. They must not be: `focus-recipe.test.mjs:38` asserts the file contains no `${`, because
  Tailwind reads class names out of source as literal text and an interpolated class compiles to no
  CSS at all — which is exactly how the first draft shipped an invisible keyboard edge. The
  duplication is the mechanism.
- **The three `SPRINGS` entries with few call sites.** `SPRINGS.firm` has exactly one
  (`attach-image-dialog.tsx:67`), but its comment carries the owner's "that spring is too loose"
  and the damping-ratio arithmetic that produced 38. A named constant that records why a number is
  that number is not a one-caller abstraction.
- **`konami-eggs.tsx`.** Audit 1 kept it and the arithmetic still holds: its two heavy imports
  (`BirdAvatar`, motion) are already on every authenticated page through the sidebar's
  `IdentityRow`, so the marginal cost is the 126 lines of source and one keydown listener. Measured:
  it rides 39 of 52 non-lab routes, in a chunk it shares with other sidebar code.
- **`forbidden.tsx` at 40 lines for two words.** 32 of the 40 are a comment explaining why the file
  is at `(main)/` rather than the root, why it is not the not-found boundary, and that its one dev
  console warning comes from React and not from here. That comment exists to stop somebody chasing
  it a second time; it has already paid for itself.
- **`robots.ts` / `sitemap.ts` / `manifest.ts`.** All three are short, all three are Next
  conventions, and all three carry the reason they exist (C-203 for the first two, the iOS
  letter-tile bug for the third). The hand-written sitemap is deliberate and the comment at `:8-13`
  says why deriving it from the route tree would be one refactor away from publishing the whole
  private site.
- **`ConfirmDialog` and `useClosingDialog` are not two dialog closers.** The charter asked. They
  solve different problems: `ConfirmDialog` is the one confirmation UI (pinned by
  `confirm-dialog.test.mjs`, which keeps the eight `window.confirm` sites it replaced dead), and
  `useClosingDialog` is a state hook for a dialog whose *subject* is a row that must outlive its
  own close animation. `ui/sheet.tsx` is the edge-anchored variant of the same dialog material,
  not a third system. There is one dialog material, one confirmation, and one toast system
  (`sonner`, mounted once at `app/layout.tsx:107`). Only the tooltip question has a real answer —
  see finding 09.
- **`sidebar-support-icon.test.mjs`, `verified-mark.test.mjs`, `confirm-dialog.test.mjs`,
  `focus-recipe.test.mjs`, `motion-namespace-rule.test.mjs`.** All five are live pins whose subject
  still exists. `focus-recipe.test.mjs` in particular is the strongest test in my territory: it
  walks every file rendering a text field and demands the shared constant, with a reasoned
  allowlist. None is bloat.
- **`ui/select.tsx`'s `SelectScrollUpButton` / `SelectScrollDownButton`, and `dialog.tsx`'s
  `DialogOverlay` / `DialogPortal`.** They look unused; they are internal (`select.tsx:103,109`,
  `dialog.tsx:56-57`). Audit 1 already un-exported them and that is the correct end state.

## Audit-1 carry-overs in this territory

- **shell-primitives-01/02 (dead kit sub-primitives; `badge.tsx`/`tabs.tsx`)** — **done**. Both
  files are gone; `dropdown-menu.tsx` is 120 lines (was 315) and gained one genuinely new export,
  `DropdownMenuSeparator`, in the 2026-08-29 menu-standards commit.
- **shell-primitives-03 (three dead functions in `utils.ts`)** — **done**. `utils.ts` is 447 lines;
  a tombstone comment at `:207-213` records why `formatBatch` and `formatBatchChip` went.
- **shell-primitives-04 (`avatarColor` plumbing)** — **done in code**. No `avatarColor` in
  `SidebarUser`, in `(main)/layout.tsx`'s user object, or in `next-auth.d.ts`. The **column drop**
  remains an open owner decision (a manual migration on the one shared database); nothing in my
  territory is blocked by it.
- **shell-primitives-05 (dead globals tokens)** — **done**, and I re-verified the whole file has no
  dead tokens left.
- **shell-primitives-06 (LogoFact, the feature hardcoded off)** — **resolved**. `logo-fact.tsx` no
  longer exists; `sidebar.tsx:627-629` mounts `<LogoEasterEgg><Brand nowrap /></LogoEasterEgg>`,
  which is option (b) from that finding.
- **shell-primitives-07 (PopoverContent on the menu material; drop `tw-animate-css`)** — **done**.
  `globals.css:2` is now `@import "shadcn/tailwind.css"`; `popover.tsx:57` composes
  `MENU_PANEL_CLASS`; `sideOffset` is 6.
- **shell-primitives-08 (collapse the bell's two variant returns)** — **done**. One tree, `isHeader`
  at `:251`, and the dead `group_invite` icon row is gone.
- **shell-primitives-09 (move rich-text and the phone kit out of `utils.ts`)** — **done in
  fix-session phase 5**, and the fix-prompt records the honest outcome: the shared chunk went
  30 KB → 28 KB, not the hoped-for more. See my -15 for what is left in `utils.ts` and the one
  remaining module-scope construction.
- **shell-primitives-10 (the filters barrel)** — outside my territory now (the filters kit is the
  directory-profile lens's); `raw/barrels.txt` shows one barrel left in the repo and it is
  `components/guide/chapters/index.tsx`, so the filters barrel is gone.
- **shell-primitives-11 (the phone-kit clone)** — **done** per the fix-prompt.
- **shell-primitives-12 (the dead `leaf` Button variant)** — **done**. My -06 finds three more that
  went undetected then because the sweep asked only about `leaf`.
- **shell-primitives-13 (image-viewer byline written twice)** — outside my territory now
  (media-viewer lens).
- **shell-primitives-14 (`ui/skeleton.tsx`, the banned grey pulse)** — **done**. The file no longer
  exists; `skeleton-warm` (`globals.css:614-623`) is the only skeleton.
- **shell-primitives-15 (the cheap hygiene batch)** — **partly done**. `isWideRoute`,
  `WORDMARK_LOGO_SIZE`, `WORDMARK_FONT_SIZE`, the `import * as React` strays in
  `combobox.tsx`/`popover.tsx`, and the duplicated destructive focus trio in `button.tsx` all
  landed. **Not done**: the stale HARD-GUARD comment in `app/layout.tsx`, and `countFor` in
  `sidebar.tsx`. Both are in my -12. The `THEME_COLORS` row should be dropped from the list — it is
  pinned by `proxy-rule.test.mjs` and must stay exported.
- **Audit-1 owner decision "Collection's filter row vs the sentence line"** — not mine any more
  (`active-filter-chips.tsx` and `result-count.tsx` are both in `raw/knip-repo-config.txt`'s unused
  files, so the migration appears to have happened and the two files are now retirable — the
  Collection lens should confirm and delete them).
- **Audit-1 not-finding "`not-found.tsx`'s code loads only on the 404 route"** — **re-opened with
  new evidence** (my -07): its 6 KB chunk is in the first-load list of all 52 non-lab routes.

## For other lenses

- **`src/components/guide/guide-door.tsx` + `src/components/layout/page-header.tsx:4,:126`** — the
  same static-import shape as my -01: `GuideDoor` (115 lines) is pulled into every PageHeader
  route and only seven of 31 call sites pass `guide`. Guide/bundle lens. The fix is the same (pass it in, or
  `next/dynamic`), and it could ride in the same commit as -01.
- **`src/components/mascot/moments/celebration-hoopoe.tsx` (via `celebration-signals` on `/feed`
  and `/welcome`), `src/components/catchups/{almost-ready,answer/completion-card,index/group-first-guidance}.tsx`,
  `src/components/settings/dark-gauntlet.tsx`** — five more static importers of the 28 KB hoopoe
  puppet, each on a route where the bird is conditional. They are why my -02's saving is ~30 routes
  and not 39. Mascot/bundle lens; the same `dynamic()` treatment applies to each.
- **Phosphor icons ship all six weight variants per glyph.** The `/about` SearchPill chunk
  (8,508 bytes) is two glyphs × six weights plus 360 lines of component. Every
  `@phosphor-icons/react` import in the app pays that. Bundle lens: worth checking whether
  `experimental.optimizePackageImports` covers it and whether a per-weight import path exists.
- **Nine date voices, one time zone.** `VALLEY_TIME_ZONE` has six importers that each hand-roll
  their own `toLocaleDateString`, alongside `formatDisplayDate`, `formatDisplayDateLong` and
  `formatTimeAgo` in `utils.ts`. Files:
  `src/app/(main)/letters/[id]/(read)/page.tsx:196`, `src/components/settings/actions.ts:233`,
  `src/components/auth/verify-email-banner.tsx:56`,
  `src/components/catchups/index/fresh-off-the-press.tsx:29`,
  `src/components/catchups/home/extend-deadline-card.tsx:50`, `src/lib/demo-seed/seed.ts:500`.
  `formatDisplayDateLong`'s own docblock says the point of the shared helpers was to stop this.
  Duplication lens / whoever owns each file.
- **`src/components/common/filters/{active-filter-chips,result-count}.tsx`** — both in knip's
  unused-files list at HEAD. If the Collection's migration to the sentence line has landed, these
  two are a clean delete. Directory-profile / Collection lens.
- **`src/components/common/tag-input.tsx:91`** —
  `{...({ type: "button", "aria-label": … } as object)}` is a cast escape hatch around
  `SpringPress`'s prop type. The real fix is in `motion.tsx:150-173`: `SpringPress` accepts
  `as?: "button" | "div" | "a" | "span"` but its prop type does not vary with it, and `:162` is
  itself a `as unknown as Record<...>` cast (it is in `raw/type-sludge.txt`). Whoever takes the
  type-sludge lens: these two casts are one problem.
- **`src/components/mascot/sidebar-hoopoe.tsx:83,:98` and `src/components/common/verified-mark.tsx:67`**
  carry `eslint-disable-next-line react-hooks/set-state-in-effect` with reasoned comments. Three of
  the four disables in non-lab `src` are here. Not wrong, but worth the lint lens knowing they
  cluster in my territory.
- **`src/app/(main)/feed/page.tsx:39-42`** — half of my -03 lives in the feed lens's file. Please
  coordinate; the change there is two lines.

## Metrics

- **Lines read in territory**: 8,485 (`wc -l` over the 62 chartered files), plus
  `DESIGN-SYSTEM.md` (531), the audit-1 shell-primitives report (562), the mascot spec's relevant
  sections, and ~400 lines read outside the charter for cross-checks.
- **Biggest files**: `sidebar.tsx` 777, `globals.css` 726, `notification-bell.tsx` 460,
  `lib/utils.ts` 447, `not-found.tsx` 413, `search-pill.tsx` 360, `float-field.tsx` 272,
  `select.tsx` 209, `button.tsx` 199, `posthog-client.ts` 195.
- **Comment-heaviest (comment:code)**: `posthog-client.ts` 115:63 = 1.83; `utils.ts` 253:166 = 1.52;
  `button.tsx` 110:81 = 1.36; `page-header.tsx` 85:69 = 1.23; `app-shell.tsx` 48:40 = 1.20;
  `globals.css` 383:305 = 1.26. **All verified as protected reasoning; I propose trimming none of
  it**, only correcting the two that are factually wrong (`app/layout.tsx:75-82`,
  `motion-features.tsx:23`) and the one that misdirects (`not-found.tsx:20-22`).
- **Bytes measured off the committed build** (`.scratch/audit2-build/.next/`, marker-string
  attribution): SearchPill chunk on `/about` **8,508 B**, on **26 of 52** non-lab routes, needed on
  4. Hoopoe puppet chunk **28,691 B**, on **46 of 52** non-lab routes, needed at first paint on ~13.
  `not-found` chunk **6,116 B**, on **52 of 52**. Konami and the bell: **39 of 52** each, both
  genuinely needed on those 39.
- **Shared floor**: 14 chunks totalling **621 KB raw** are on all 52 non-lab routes; the two
  largest are 223.7 KB (React/react-dom) and 125.9 KB. The `not-found` chunk is one of the 14.
- **`globals.css` token census**: 3 ease, 3 z, 7 radius, 7 space, 10 palette, 26 shadcn semantic,
  9 sidebar, 3 state, 1 shadow. **0 with zero consumers.** 148 distinct custom properties reach
  the shipped `:root`.
- **`ui/` importer census** (non-lab): `button` 90+, `dialog` 18, `dropdown-menu` 8, `popover` 8,
  `sheet` 6, `select` 2, `combobox` 1, `label` 1, `card` **0** (one lab room only).
- **Dead code found and verified**: 3 Button branches, 1 dead Tailwind selector + 4 dead
  `size=sm` clauses in `card.tsx`, 2 needless exports in `peaks-mark.tsx`, ~20 lines of hygiene.
  Total ~35 lines — which is the honest headline: **the line well in this territory is nearly dry,
  and the byte well is not.**
- **Structural vs cheap**: 10 structural (01–11, 15), 6 cheap (12–14, 16, and the cheap halves of
  04 and 08).
- **Autonomous vs owner**: 11 autonomous, 5 owner (04, 08, 09, 13, and the schema-adjacent half of
  the audit-1 `avatarColor` carry-over).
