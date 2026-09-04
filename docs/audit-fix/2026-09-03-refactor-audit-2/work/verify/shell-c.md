# shell-c - adversarial verification notes

Cluster: the app shell, common primitives, layout, mascot, landing, onboarding, guide, support,
settings. HEAD at time of verification: `74cc61a` ("fix(retention): notifications are kept 30 days,
everywhere"). Working tree: only `docs/audit-fix/README.md`, `progress.md` modified and this audit
folder untracked — no source file in my territory has uncommitted edits. (Note: the git-status
snapshot in my prompt listed `src/components/common/image-viewer.tsx` as modified; at the time I
read the tree it was clean, i.e. that edit landed as `72b5a1d`/`74cc61a`.)

Method: every claim re-derived from source at HEAD plus byte attribution against the read-only
build at `.scratch/audit2-build/.next/`. No builds, no browser, no DB, no writes outside this file.

---

## shell-primitives-01 - PageHeader ships the SearchPill to 22 routes that never draw one
**CONFIRMED (with one scoping correction).**

- `grep -rn "showSearch" src` returns exactly six lines in two files:
  `src/app/(main)/feed/page.tsx:76` (`showSearch`) and `page-header.tsx:14, 29, 41, 48, 141`.
  Only /feed passes it. Verified.
- `page-header.tsx:2` `import { SearchPill } from "./search-pill";` — static, top of file. The
  render is `{showSearch && (<div className="hidden sm:block"><SearchPill /></div>)}` at 141-145,
  and `hasRight` at :48 includes `showSearch`. All line numbers exact.
- The other two live pills are already passed via `actions`: `collection-client.tsx:1112` (inside
  the header's children) and `directory-client.tsx:529` (inside `actions={<>…}`). Verified.
- Byte attribution re-run by me over `.scratch/audit2-build/.next/static/chunks/*.js`: the marker
  string `"Search posts, by their words"` is in **17** chunk files, and those chunks appear in the
  `firstLoadChunkPaths` of **26 of the 52 non-lab routes**. `2khgj6qcobwi-.js` is **8,508 bytes**
  exactly. All three numbers in the finding reproduce.
- The default label in source is `"Search posts, by their words or by who wrote them"`
  (`search-pill.tsx:98`); the finding quotes a prefix. Not a defect — the marker is unique either way.

**Correction the fix session needs.** The 8,508-byte figure is a *clean isolated chunk* on only
**10** of the 26 carriers (/about, /admin, /admin/analytics, /admin/audit, /admin/catchups,
/admin/catchups/[catchupId], /admin/messages, /admin/support, /birds, /guide). On the other 16 the
pill sits inside a larger shared chunk (e.g. /admin/content 26,696 B; /catchups/[catchupId]
48,258 B; /messages 25,448 B), so what leaves is the three modules, not a whole chunk — the chunk
shrinks rather than disappears. The per-route saving is still ≈8.5 KB of module bytes because the
two Phosphor icons go too: `MagnifyingGlass` is imported in exactly two non-lab files
(`search-pill.tsx:5`, `post-feed.tsx:6`), and post-feed only rides /feed, which keeps its pill.
So the arithmetic (22 routes × 8.5 KB ≈ 187 KB) holds; the framing "a whole chunk disappears from
22 routes" does not.

## shell-primitives-02 - The sidebar mounts the 28 KB hoopoe puppet on every authenticated page
**CONFIRMED-WITH-CORRECTION.** The measurement is exact; the *saving list* is wrong in three places.

- `sidebar-hoopoe.tsx:42-43` is `const IDLE_MIN_MS = 90_000; const IDLE_MAX_MS = 120_000;` and
  `:82-89` is the `matchMedia("(min-width: 768px)")` gate. `:37` is the static
  `import { Hoopoe } from "./hoopoe"`. `logo-easter-egg-hoopoe.tsx:36` is the same static import.
  Both are mounted from `sidebar.tsx` (`<LogoEasterEgg>` around `<Brand>` and `<SidebarHoopoe />`
  in the account block). Verified.
- Byte attribution re-run: `81.5789%` (from `hoopoe.tsx:1495`) is in exactly ONE chunk,
  `0qa8au6zlhx7_.js`, **28,691 bytes**, present in the first load of **46 of 52** non-lab routes.
  The 6 that do not carry it: `/_not-found`, `/catchups/join`, `/catchups/join/[token]`,
  `/guidelines`, `/privacy`, `/terms`. Every number reproduces.
- `not-found.tsx:28-31` is the `dynamic(() => import("@/components/mascot/hoopoe")…, { ssr: false })`
  pattern with the `onReady`-not-`ref` explanation at :23-27, as claimed. And the sentence the
  finding says is wrong is there verbatim at :20-21: *"Do NOT copy this to login, signup, the
  landing or the sidebar -- all four show the bird at first paint by design (mascot.md)."*

**The correction.** I built the static import graph over all of `src` (resolving `@/` and relative
specifiers, skipping `import type`) and computed reverse reachability to
`src/components/mascot/hoopoe.tsx`. Nineteen non-lab route files reach it statically. After the
sidebar's two imports are deferred, **18 routes still keep the puppet through a second static
path**, and three of those are in the finding's "saving lands on" list:

- `/directory` — `directory-client.tsx:25` → `NoResultsHoopoe` → `moments/moment-hoopoe.tsx:18` → `Hoopoe`
- `/profile/[id]` — `letterhead-profile.tsx:75` → `SavedPostsFeed` → `NoSavedHoopoe` → `moment-hoopoe`
- `/messages` (index) — `messages/(index)/page.tsx:8` → `MessagesEmptyHoopoe` → `moment-hoopoe`

(The finding was right to exclude the catchups routes: all five reach it via
`AlmostReady` / `CompletionCard` / `GroupFirstGuidance`. `/collection` is safe to claim — its
`ContributeRoom` is already `dynamic()` at `collection-client.tsx:79`.)

The true saving set is **28 routes**, not the list given:
/about, /admin, /admin/analytics, /admin/audit, /admin/catchups, /admin/catchups/[catchupId],
/admin/content, /admin/mail, /admin/messages, /admin/messages/[id], /admin/people,
/admin/people/[id], /admin/reports, /admin/review, /admin/support, /birds, /collection,
/collection/[id], /guide, /guide/[area], /letters, /letters/[id], /letters/[id]/edit, /letters/new,
/messages/[id], /notice/[id], /pick-bird, /support.
28 × 28,691 B ≈ 803 KB raw across the app. The headline "−28 KB on roughly 30 authenticated
routes" survives intact; only the enumeration must be replaced.

## shell-primitives-09 - VerifiedMark is a third tooltip system
**CONFIRMED-WITH-CORRECTION.**

- `verified-mark.tsx` is 110 lines; `VerifiedMarkInner` is 41-109 exactly, with `useState` ×2
  (:50, :51), the `useLayoutEffect` measuring `getBoundingClientRect().right + 6 + tip.offsetWidth
  > window.innerWidth - margin` (:58-69), and the `eslint-disable-next-line
  react-hooks/set-state-in-effect` at :67. The label span is always rendered, toggled by
  `open ? "opacity-100" : "opacity-0"` (:99). All verified.
- The three-systems claim holds: `info-tooltip.tsx` is built on the shared `Popover`
  (`PopoverPositioner`, `PopoverPortal` imported at :5-11) and `notification-bell.tsx` uses native
  `title=` at exactly :279 and :419.
- The pin exists and says what the finding says: `verified-mark.test.mjs:14-15` asserts
  `/: "Verified";/` and `doesNotMatch(/Verified member/)`.

**Corrections.**
1. "the label is a fixed short string" is **wrong**: there are three labels — `"Verified teacher"`,
   `"Verified former teacher"`, `"Verified"` (`:31-36`). A CSS-only rebuild still works, but the
   fixer must not hardcode one string, and the pin only constrains the alumni case.
2. "the component stops being `"use client"` … removing N client component instances per list
   page" overstates the win. Of the three non-lab call sites, `post-card.tsx` and
   `letterhead-profile.tsx` are already `"use client"`; only `directory/profile-card.tsx` is a
   server component, so the client-boundary saving is the directory grid (and the map drilldown
   that reuses it), not the feed.

## shell-primitives-14 - The three action buttons repeat the same `onDark` block
**CONFIRMED-WITH-CORRECTION**, and the correction matters because the proposed shared constant
would be a *visible* change, not a refactor.

- Line ranges are right: `love-button.tsx:105-110`, `share-button.tsx:59-62`,
  `bookmark-button.tsx:58-64`; the `whileTap={{ scale: 0.93 }}` + `transition={SPRINGS.snappy}`
  opening is at love:95, share:52, bookmark:63.
- **The two `onDark` strings are NOT the same today.** love-button:
  `"text-white/85 transition-colors duration-150 hover:bg-white/12 focus-visible:outline-white"`
  with the hover ink in a *separate* ternary at :109 (`onDark ? "hover:text-white" : …`).
  share-button: `"text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white
  focus-visible:outline-white"`. They differ by `white/85` vs `white/80` and by where
  `hover:text-white` lives. Extracting the finding's literal `ON_DARK_ACTION` (which uses `/85`)
  would change the share arrow's resting opacity over a photograph. That is exactly the drift the
  finding is complaining about — but it means the fix must be an owner-visible decision about
  which value wins, not a silent dedupe.
- **The "identical opening written three times" is only true twice.** share-button and
  bookmark-button both open `flex items-center rounded-full px-2.5 py-1.5 text-sm …`; love-button
  opens `inline-flex items-center ${gap} rounded-full ${padding} ${text} …` from its `HEART[size]`
  map, so it is not literally the same string and cannot join a naive constant.
- The finding's own recommendation is "probably nothing"; I agree, and with the above the case for
  touching it is weaker still.

## shell-primitives-16 - search-pill's resize listener
**CONFIRMED-WITH-CORRECTION (count).**

- The effect is at `search-pill.tsx:129-142` exactly: `measure()` runs immediately, then
  `window.addEventListener("resize", measure)` with no `open` guard, deps `[]`. `full` feeds
  `ruleWidth` at :143, which is only seen while open. Verified.
- **Correction**: "2 window listeners per page" is wrong. `search-pill.tsx` registers two listeners
  total (`resize` at :140, `mousedown` at :171) and the mousedown one is **already gated on `open`**
  (`:160-161` `if (!open) return;`). So the always-on cost is **one** listener per mounted pill,
  i.e. one per page. Everything else about the item stands, including that it is only worth doing
  after -01.

---

## member-surfaces-01 - Code-split the guide sheet out of the (main) layout chunk
**CONFIRMED-WITH-CORRECTION (route count).**

- `guide-layer.tsx:16-17` are the two static imports (`CHAPTERS`, `GuideOverlay`); the component
  is `"use client"` (:1) and mounted once at `(main)/layout.tsx:16` / `:153`. Verified.
- The chunk is `.next/static/chunks/3hd4ups9q-ds3.js`, **23,588 bytes**, and I re-found every byte
  offset the finding quotes: `"Where the everyday things go"` at 7,914, `"See all fifty"` at
  18,309, `"Close the guide"` at 19,115, `"Have a look around"` at 2,440, `beforeinstallprompt` at
  22,418. So the guide occupies ≈7,900-19,200 → ≈11.3 KB raw. The measurement is sound.
- The six chapters total 13,647 source bytes (birds 1,456 / catchups 3,600 / collection 3,091 /
  directory 1,539 / feed 2,640 / letters 1,321) plus the 722-byte registry — the finding's "14 KB
  of source" is right.
- `guide-door.tsx:93-110` is the press handler with the touch two-step (`setArmed(true)` at :106),
  so the preload hook the finding describes is where it says it is. `letter-images.tsx:51` is the
  `onPointerEnter={() => void import("@/components/common/image-viewer")}` precedent, verbatim.

**Correction**: the chunk is in the first load of **39** non-lab routes, not 52. The 13 without it
are `/`, `/_not-found`, `/catchups/join`, `/catchups/join/[token]`, `/forgot-password`,
`/guidelines`, `/hoopoe`, `/login`, `/privacy`, `/reset-password`, `/signup`, `/terms`,
`/verify-email` — i.e. exactly the routes outside the `(main)` layout, which is what you would
expect and which strengthens rather than weakens the attribution. Restate the saving as
"≈11 KB raw off 39 routes".

## member-surfaces-04 - Move the parked aviary out of src/components
**CONFIRMED.**

- `src/components/support/wood.tsx` is **246 lines**; `grep -rn "SupportWood|support/wood" src`
  returns only the definition (:14, :97), the lab variant
  (`app/lab/support-ideas/_variant-aviary.tsx:23,36,59,66`) and the registry note
  (`app/lab/_registry.ts:226`, which already says "lab-only: nothing on /support mounts it").
  Nothing under `(main)` mounts it.
- `find src -name "wood-mount*"` → nothing; `ls src/components/layout/` has no such file. Yet
  `src/app/(main)/support/page.tsx:60-64` still reads *"The bird field and the solid backdrop
  mount from the APP SHELL (wood-mount.tsx), not here"*. The false comment is real, at the exact
  lines given.
- `wood.tsx:9-14` does give revival instructions naming `app-shell.tsx` (which exists), and
  :16-20 carries the transform-containing-block reasoning that the finding says must be kept.
  Both accurate.

## member-surfaces-06 - Collapse the setTheme / setThemePreference alias
**CONFIRMED.**

- `theme-actions.ts` is 75 lines. `async function setTheme(theme: Theme)` at **:31**, not exported.
  The wrapper docblock is :67-72 and the wrapper :73-75 — the finding's ":67-75" is right, and the
  comment ends "One implementation, two names; collapse to one when the flow ships" at :71.
- Both callers import the public name: `lights-on.tsx:11` and `dark-gauntlet.tsx:29`. Both files
  also destructure next-themes' client `setTheme` in the same scope (`lights-on.tsx:16`,
  `dark-gauntlet.tsx:68`), so the shadowing reason the comment gives is real and the surviving
  name must be `setThemePreference`, as the finding says.
- `grep setTheme src/lib/gate-coverage.test.mjs` → nothing. No pin names it. The rename is free.
- Nit: the deletion is 9 lines (67-75), not "~12".

## member-surfaces-10 - "Back to settings" on a page with no settings
**CONFIRMED.**

- `dark-gauntlet.tsx:139` and `:319` both read `Back to settings`. The first is inside
  `<Button variant="outline" onClick={() => router.back()}>` at :137-140; the second is inside
  `<Link href="/feed">` at :314-320. Two different destinations, one label. Exact.
- `ls src/app/(main)/` has no `settings` directory (about, admin, birds, catchups, collection,
  dark-mode, directory, feed, guide, letters, messages, notice, notifications, pick-bird, profile,
  support, welcome + the shared files). Confirmed there is nothing to go back to.

## member-surfaces-13 - Replace the costs card's count-up with motion primitives
**CONFIRMED-WITH-CORRECTION (the "free" premise is unproven).**

- `costs-card.tsx:43-101` is the comment + `useCountUpOnView` exactly as described: rAF loop with
  `1 - (1-t)^3` at :75, `IntersectionObserver` at `{ threshold: 0.4 }` (:91), `pausedRef` mirror of
  `useMotionGovernor().paused` (:50-54), cleanup at :94-97. One call site at **:104**. Exact.
- The governor claim checks out: `motion.tsx:105-113` — `paused` is `document.hidden` and nothing
  else, and the docblock at :92-94 says the OS reduced-motion setting is never read. So dropping
  the governor for a rAF-driven count is defensible, since a hidden tab already stops rAF.
- The `motion-namespace-rule.test.mjs` pin bans the `motion.` namespace, **not** named imports, so
  `import { animate, useInView } from "motion/react"` does not trip it. I checked line by line
  (`:50` matches `/\bmotion\.(?!tsx\b)(?!ts\b)\w+/`).

**Correction**: the premise "the app ships motion's animate/useInView in the same package
(/support's first load includes the motion core)" is not established. Across all non-lab source,
`animate` is imported from `motion/react` in exactly **one** file — `common/pinch-zoom.ts:61`,
which belongs to the image viewer and is `dynamic()`-loaded, so it is not on /support's first
load; `useInView` is imported nowhere. The app's motion surface is `m` + `LazyMotion(domMax)`,
whose features arrive in an async chunk. Pulling `animate` statically into `costs-card.tsx` may
therefore ADD first-load bytes to /support while removing 40 lines. The fix session must measure
/support's `firstLoadUncompressedJsBytes` before and after and report it; if it grows, this is a
not-finding.

---

## media-viewer-11 - The carousel hand-rolls a cubic-bezier
**CONFIRMED, and its stated uncertainty is now resolved in its favour.**

- `photo-carousel.tsx:71-86` is the 16-line bisection sampler, exactly as quoted, using
  `EASE_OUT_SMOOTH` (`motion.tsx:41`, `[0.16, 1, 0.3, 1] as const`).
- The finding's confidence was "medium — I did not confirm the `motion` entry re-exports
  `cubicBezier`". It does. `framer-motion/dist/types/index.d.ts:12` is `export * from
  'motion-utils';` and `motion/dist/react.d.ts:1` is `export * from 'framer-motion';`, so the type
  flows through. Runtime check:
  `import('node_modules/motion/dist/es/react.mjs')` → `cubicBezier: function`. Verified both ways.
- **Small correction to the "what to do"**: it suggests `import { cubicBezier } from "motion"`.
  Use **`"motion/react"`** — that is the specifier every other file in the repo uses and the one I
  verified. Spreading the `as const` tuple (`cubicBezier(...EASE_OUT_SMOOTH)`) typechecks against
  the four-number signature.

## media-viewer-16 - Two directives that claim more than they need to
**CONFIRMED-WITH-CORRECTION**, and the correction is a real trap.

- `carousel-arrow.tsx:1` is `"use client"`; the file is 101 lines with no hook of any kind (grep
  for useState/useEffect/useRef returns nothing) and only an `onClick={onPress}` at :79. Both
  importers are client modules: `photo-carousel.tsx:1` and `contribute-stage.tsx:1` are both
  `"use client"`, importing at :48 and :74 respectively. So removing it is safe *today*.
- The eslint-disable is at `photo-carousel.tsx:246`, under its three-line justification at
  :243-245, with deps `[photos, readScroll]` at :247. Exact.
- **Correction**: "no client-only import" is wrong. `carousel-arrow.tsx:29` imports
  `{ CaretLeft, CaretRight } from "@phosphor-icons/react"`, and that package ships **no**
  `"use client"` directive of its own — its `IconBase.es.js` calls `React.useContext(IconContext)`.
  So the directive is not decorative: it is what would let a *server* component import
  `<CarouselArrow>` without an RSC error. Deleting it is still correct given both call sites, but
  the fixer should know the module becomes server-fragile, and that a future server-side caller
  would fail at build time (loudly, which is fine) rather than silently.

## media-viewer-18 - The Catch-up form opens hand-aimed photographs at the wrong place
**CONFIRMED.** This is the strongest item in my cluster and it is a behaviour bug, not just a clone.

- `photo-aim.tsx:98-102` — *"`facts` is optional and the component measures the file itself when it
  is absent … a RESUMED draft holds nothing but URLs."* The measurement path is :115-135
  (`new Image()`, `naturalWidth/naturalHeight`) and the default is at :141-142:
  `focalX: facts?.focalX ?? 0.5, focalY: facts?.focalY ?? 0.5`. Exact.
- `image-aim.ts:82-108` — `myImageFacts`, with the same sentence at :85-89 ("a RESUMED DRAFT holds
  nothing but urls … the one thing this dialog must never do") and the ownership filter at
  :99-100 (`ownedUploadUrls`). Exact, including the C2 ownership note in the gate.
- `use-composer-uploads.ts:129-142` is the mount-only `myImageFacts(resumed)` call. Its two callers
  are the only ones: `grep -rn "myImageFacts" src` returns the definition and this one call.
- `photo-attachments.tsx` never calls it. `facts` (`:50`) is only ever written from a **fresh**
  upload response (`setFacts` at :102, inside the `/api/upload` handler), and the answer is
  autosaved (`:12-13` "the parent (AnswerCard) owns the autosave call"). So on any resumed answer
  `facts[src]` at **:144** is `undefined` and the aim window opens centred. Confirmed as described.
- `PhotoAimButton` has exactly two call sites (`create-post-form.tsx:765`,
  `photo-attachments.tsx:142`), so making `facts` required is a two-line change, as claimed.
- One caveat for the fixer, not a defect in the finding: because `framePhoto(known).kept >= 1`
  returns `null` (`:146`), a resumed photo whose true aim is off-centre can also make the handle
  *disappear* rather than merely open wrong. Worth checking both symptoms when gating.

---

## landing-mascot-avatars-15 - The launch pose is written twice inside hoopoe.tsx
**CONFIRMED-WITH-CORRECTION (two: a compile error in the proposed fix, and the jscpd note).**

- `flyCore`'s block is `hoopoe.tsx:715-725` (the finding says 715-724; the closing `]);` is 725).
  `takeOffRaw` is `:819-831`, its `Promise.all` at :820-830. Eight of the nine `A(...)` calls are
  character-for-character identical — the fold fade-outs (716/717 vs 821/822), the arm fade-ins
  (718/719 vs 823/824), `rotate: -74 / 74` on `SPRINGS.snappy` (721/722 vs 826/827) and
  `rotate: 138 / -138` on `SPRINGS.gentle` (723/724 vs 828/829).
- The ninth differs exactly as stated: `:720` `{ scaleY: [1, 0.9, 1], y: [0, 4, 0] }` at
  `duration: 0.22`; `:825` `{ scaleY: [1, 0.88, 1], y: [0, 5, 0], rotate: dir * 4 }` at
  `duration: 0.26`. And the banner at `:810-811` does say the cross-screen primitives "reuse the
  proven poses from flyCore so a cross-screen flight reads like the in-SVG one".

**Correction 1 (blocking).** The finding's preferred fix is `await takeOffRaw(0)`. The signature is
`function takeOffRaw(dir: 1 | -1 = 1)` at `:819` — `takeOffRaw(0)` does not typecheck. The fixer
must widen it to `dir: 1 | -1 | 0 = 1` (or add a separate `tilt` parameter) in the same edit, or
`npm run check` fails at the TypeScript gate.

**Correction 2.** The note claims "the 13-line clone jscpd actually flags is a different pair".
`raw/jscpd.txt` flags **both**: lines 662-663 are the landing fold (692-704 vs 872-880, 13 lines)
*and* lines 668-672 are this very launch pose, split into two entries (712-720 vs 819-825, 9 lines;
720-725 vs 825-830, 6 lines). The rest of the note — that the landing-fold pair should be left
alone because its three divergences are each argued at `:695-698` — I checked and agree with.

Second thing the fixer should know: `takeOffRaw`'s "NOT queued" warning (`:832-836`) is about the
external flight layer, and `flyCore` awaiting it from inside `enqueue` is the same await it does
today, so the pump-wedge hazard is unchanged. Function declarations hoist, so calling `takeOffRaw`
from `flyCore` (defined 110 lines earlier) is fine.

---

## Overlaps between findings in this cluster
- **shell-primitives-01 and -16 are ordered**: -16 is only worth doing after -01, as -16 itself
  says. They do not conflict.
- **shell-primitives-02 and landing-mascot-avatars-15 both touch the mascot**, but different
  regions: -02 changes only the two import statements in `sidebar-hoopoe.tsx` and
  `logo-easter-egg-hoopoe.tsx` (plus the wrong sentence in `not-found.tsx:20-21`), while -15
  changes `hoopoe.tsx:715-725`. They can land in either order. The safer sequence is -15 first
  (its gate is "watch the flight"), then -02, so a broken flight is never confounded with a
  bird that failed to load.
- **member-surfaces-13 and shell-primitives-02** both increase the app's reliance on measuring the
  build afterwards; both should re-run byte attribution rather than trusting the plan.
