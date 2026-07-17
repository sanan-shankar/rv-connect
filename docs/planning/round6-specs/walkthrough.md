# Spec: the first-run Walkthrough (product tour)

**Status:** design spec + final-draft copy. No code written. Round 6.
**Owner brief:** a V1 walkthrough that explains each section (what it is for, and the main controls), narrated
by the hoopoe. Sections covered: **Feed, Directory, The Valley Collection, Catch-ups.** Groups is skipped for
now (its rework is being designed separately) but keeps a reserved slot. Notifications and search are not
explained. Offered (not forced) after onboarding, re-launchable from the About page, state kept per user.

This spec is grounded in the real code: the mascot flight bus (`src/components/mascot/mascot-flight.ts`),
the puppet controller (`src/components/mascot/hoopoe-kit.ts` / `hoopoe.tsx` / `use-hoopoe.ts`), the
sidebar-idle-bird precedent (`sidebar-hoopoe.tsx`), the onboarding flow and its local-state convention
(`src/components/onboarding/onboarding-flow.tsx`, `src/lib/onboarding-local.ts`), the layout
(`src/components/layout/app-shell.tsx`, `sidebar.tsx`), the About page (`src/app/(main)/about/page.tsx`),
and the four surfaces themselves (feed / directory / collection / catchups pages verified by screenshot and
by reading their client components). The additive-migration path uses the existing
`prisma/pending-migration.sql` + `scripts/dev/run-sql.mjs` pattern.

---

## 0. Decisions at a glance

- **Mechanism:** a warm **card docked bottom-centre** (bottom sheet on mobile), the hoopoe perched on it,
  presenting one section per stop. Progress dots, Back / Next, and Skip. The relevant on-page control is
  **spotlighted** (everything else gently dimmed).
- **The tour navigates the real pages** (`/feed` -> `/directory` -> `/collection` -> `/catchups`). It does
  **not** fake the sections with scrims over one page. Justification in section 1.
- **The hoopoe is the main character.** It flies from stop to stop, perches on the card, and points at the
  control being explained. Rendered slightly larger than its usual idle size (desktop ~116px, mobile ~84px;
  idle sidebar bird is 60px, the auth birds are 96-102px, so the tour bird reads as the lead).
- **State is localStorage, per user** (`rv:tour:<userId>`), mirroring `onboarding-local.ts`. A User column is
  specced as an easy later upgrade, not V1. Justification in section 7.
- **Trigger:** first arrival at `/feed` after onboarding, offered (never auto-started, never blocking).
- **Re-access:** a "Take the tour again" button in the About page's "How to use it" section. The tour doubles
  as the how-to guide.
- **Voice:** warm, plain, short sentences. No jargon. No em dashes. Always "Rishi Valley", never "RV Alumni".

---

## 1. Mechanism: navigate the real pages (not scrims over one page)

The tour walks the member through the **actual** `/feed`, `/directory`, `/collection`, and `/catchups`
pages, spotlighting each page's own real control, with the hoopoe flying between them. We deliberately reject
the alternative (staying on one page and drawing fake section previews under a scrim). Reasons:

1. **The copy teaches real controls that only exist on their real pages.** The Feed composer pill, the
   Directory search + Filters row, the Collection "Contribute" button, the Catch-ups Ask/Answer/Read band:
   these are the things the words point at. Rebuilding fake versions on a single page would duplicate UI the
   project already forbids rebuilding (see CLAUDE.md "do not rebuild what already exists") and would drift out
   of sync the moment a real page changes.
2. **The bird already knows how to cross a navigation.** `mascot-flight.ts` exists precisely to carry the one
   hoopoe across a client route change and perch it on the destination (it does this today for the landing ->
   login/signup flight). The tour reuses that exact mental model, so section-to-section flight is a solved
   problem, not new machinery.
3. **The member ends the tour already standing on the real pages,** having seen real data and real buttons,
   which is the whole point of a how-to.
4. **Mobile settles it.** On mobile the nav lives behind a hamburger drawer (`sidebar.tsx`), so there is no
   persistent nav rail to spotlight. Navigating to the real page and highlighting that page's own control is
   the only honest option on mobile, and doing the same on desktop keeps one behaviour across breakpoints.

**Consequence for the persistent layer:** the tour's card + hoopoe are mounted **once** in the authenticated
layout (`src/app/(main)/layout.tsx`, alongside where `AppShell` renders) so they survive the client
navigations between the four routes without unmounting. Because the puppet itself never unmounts mid-tour, the
hoopoe uses its **own same-mount controller** (`flyTo` / `point` / `perch`) to fly to each new control, rather
than the cross-page handoff dance in `mascot-flight.ts` (which is only needed when the puppet's mount is
destroyed by the navigation, as in the landing -> auth case across route groups). We still borrow that bus's
**reporter pattern**: each destination page reports where its highlighted control is, and the hoopoe waits for
that rect before flying to it. See section 3.

---

## 2. The stops (ordered)

| # | Stop | Route | Spotlight target | Hoopoe |
|---|------|-------|------------------|--------|
| - | Offer | `/feed` | none (card only) | flies in, waves |
| 1 | Feed | `/feed` | the composer pill (`data-tour="feed-composer"`) | points at composer |
| 2 | Directory | `/directory` | the search + Filters row (`data-tour="directory-search"`) | points at search |
| 3 | The Valley Collection | `/collection` | the Contribute button (`data-tour="collection-contribute"`) | points at Contribute |
| 4 | Catch-ups | `/catchups` | the Ask / Answer / Read band (`data-tour="catchups-explainer"`) | points at the band |
| (5) | Groups | `/groups` | reserved slot, disabled in V1 | (later) |
| - | Finish | stays on `/catchups` | none (card only) | celebrates |

**Progress dots show four** (Feed, Directory, Collection, Catch-ups). The Offer and Finish are not counted
dots (same convention as onboarding, where "done" has no dot). The Groups slot lives in the config array
between Catch-ups and Finish with `enabled: false`, so turning it on later is a one-line change plus its copy
(stub drafted in section 5); Catch-ups reads naturally into it because Catch-ups live inside Groups.

**Spotlight targets are opt-in `data-tour` attributes**, not brittle CSS selectors. Each page adds one small
attribute to the control it already renders (four one-line edits total); the tour reads `[data-tour="..."]`.
This keeps the tour from breaking when a page's class names change.

---

## 3. Component architecture

All new files live under `src/components/tour/`. Nothing here rebuilds an existing primitive: it imports the
shared `Button`, the `Hoopoe` puppet via `useHoopoe`, the house springs from `src/components/common/motion.tsx`,
and reuses the onboarding progress-dot styling.

### Files to create

- **`src/components/tour/tour-steps.ts`** — the ordered stop config (pure data): `id`, `route`, `navHref`,
  `spotlight` (the `data-tour` key), `title`, `body` (paragraph array), optional `note` (the callout block),
  `hoopoe` (which pose/gesture), and `enabled`. Includes the reserved Groups entry. This is the single source
  of truth for copy + order, so the copy in section 4/5 is literally this file's contents.

- **`src/components/tour/tour-provider.tsx`** — a client context provider mounted once in
  `(main)/layout.tsx`. Holds `{ status: "idle" | "offering" | "running" | "done", index }`, and exposes
  `offer()`, `start()`, `next()`, `back()`, `skip()`, `finish()`. On `next/back/start` it `router.push()`es
  the stop's `navHref`, then waits for that page to report its spotlight rect (below) before telling the
  hoopoe to fly. Persists terminal state to localStorage (section 7). It also owns the offer logic on `/feed`.

- **`src/components/tour/tour-anchors.ts`** — a tiny rect registry modeled **exactly** on
  `mascot-flight.ts`'s `reportPerch` / `awaitPerch`: `reportSpotlight(key, rect)` and
  `awaitSpotlight(key, timeoutMs)`. A small hook `useTourAnchor(key)` measures a `[data-tour]` element's
  client rect on mount / scroll / resize and reports it. This is the direct analogue of the flight bus's
  perch reporting: the destination says "my highlighted thing is here", the hoopoe flies to it. Resolves with
  `null` on timeout so a slow page never hangs the tour (same failsafe shape as `awaitPerch`).

- **`src/components/tour/tour-spotlight.tsx`** — the dimming overlay. A single fixed full-viewport layer that
  darkens everything except a rounded-rect hole over the target (SVG mask, or four warm-ink panels around the
  rect). Warm ink tint at ~55% opacity (never pure black; consistent with the design system's warm surfaces),
  with a soft leaf-tinted ring around the hole. Recomputes on scroll/resize; `scrollIntoView`s the target
  first. When a stop has no target (Offer, Finish) it dims the whole page evenly behind the card.

- **`src/components/tour/tour-panel.tsx`** — the docked card UI (the form factor the owner asked for). Renders
  the hoopoe (owns the `useHoopoe` ref), title, body paragraphs, the optional `note` callout, the progress
  dots, Back / Next, and Skip. Uses `AnimatePresence` with a real exit (house rule) and `SpringPress` on every
  button. This is the persistent element; it does not unmount between stops, only its contents cross-fade.

- **`src/components/tour/tour-offer.tsx`** — the small "want a tour?" card shown on first `/feed` arrival. Can
  be the same `tour-panel` in an "offer" state, or a lighter sibling; either way it is dismissible.

### Data flow for one "Next"

1. `tour-provider` sets `index++`, reads the stop's `navHref`, calls `router.push(navHref)`.
2. The hoopoe lifts off the card (`flyTo` a point just above it, wings working) while the route changes.
3. The destination page mounts; its `useTourAnchor("...")` measures the highlighted control and
   `reportSpotlight(key, rect)`s it.
4. `tour-provider` `awaitSpotlight(key)`s, then the spotlight overlay opens its hole on that rect and the
   hoopoe `flyTo`s a hover point beside the control and `point()`s at it (no label; the words are in the
   card), then `flyTo`s back to perch on the card and rests in `content` / `curious`.
5. The card cross-fades to the new stop's copy.

### Hoopoe choreography, per moment (hooking the existing API)

Every verb below is a real method on `HoopoeApi` (see `hoopoe-kit.ts`). All are queued/awaitable.

- **Offer in:** `flyIn("top")` onto the card, then `wave()`, `express("curious")`. (`flyIn` is the
  same-mount off-canvas entrance, exactly as `sidebar-hoopoe.tsx` uses it.)
- **Start:** `nod()` + a small `hop()`, then run the stop-1 arrival beat.
- **Arrival beat (each stop):** `flyTo(hoverPointNearControl)` -> `point(controlRect)` -> `flyTo(cardPerch)`
  -> `express("content")`. The `flyTo` targets come from `awaitSpotlight`, the reporter analogue of
  `awaitPerch`.
- **Between stops:** the lift-off + fly-to-new-control is the "flies between the sections" the brief wants;
  because the puppet lives in the persistent tour layer it is one continuous same-mount `flyTo`, no cross-page
  handoff needed.
- **Finish:** `celebrate(2)` + `crest(true)` + `nod()`, then `flyTo` off the top edge (or fade with the card).
- Bias every resting pose to `content` / `curious` / `happy` per the mascot's emotional guidance; never
  `sad` / `worried` here.

### One-hoopoe rule

The tour hoopoe renders a real `<Hoopoe>`, so it carries the `hoopoe-mascot` class that
`anotherHoopoeOnScreen()` (`moments/one-hoopoe-guard.ts`) looks for. This means:
- While the tour runs, the sidebar idle bird, the bell-delivery bird, and the celebration moments all hold off
  on their own (they already check the guard before mounting). No new suppression code needed.
- Symmetrically, the **offer** must check `anotherHoopoeOnScreen()` before appearing, and retry shortly if
  blocked (same `BLOCKED_RETRY_MS` pattern as `sidebar-hoopoe.tsx`), so it never collides with the post-signup
  welcome celebration. In practice that celebration plays on `/welcome` and is one-shot latched, so by the
  time the member reaches `/feed` it is already spent; the guard is the belt-and-braces.

---

## 4. The copy (final draft)

Voice notes honoured: warm, plain, short sentences, no jargon, no em dashes, "Rishi Valley" not "RV Alumni".
Each stop is one card. Body is shown as the paragraphs the card renders; `note` is the soft callout block.

### Offer (first arrival at the feed)

> **Title:** Want a quick look around?
>
> **Body:**
> Hello, and welcome in. I am the valley's hoopoe, and I can show you around in about a minute.
>
> Four short stops. You can stop me whenever you like.
>
> **Buttons:** `Show me around` (primary) · `Maybe later` (quiet)

### Stop 1 — Feed

> **Title:** The Feed
>
> **Body:**
> This is where the valley shares its news and reads it. Someone is planning a reunion, a batch has an
> update, the school has an announcement: it goes here, where everyone can see it.
>
> You can like a post, leave a comment, and reply to what other people say. To share something of your own,
> tap where it says "Share a memory, a sighting, or a note for the valley."
>
> **Note (callout):**
> One small thing, and it matters. This is not here to replace your WhatsApp groups. The everyday chatter,
> the good-mornings, the quick forwards: those are lovely, and they belong there. If all of it moved over
> here, the cost of keeping it would quietly break us.
>
> Think of it this way. The group chats are full of wonderful messages, and most of them scroll away and are
> gone by morning. The Feed is for the ones worth keeping: the updates you would happily come back to and
> read again.

### Stop 2 — Directory

> **Title:** The Directory
>
> **Body:**
> This is how you find people again. Search by name, or open the map to see where everyone landed. You can
> also browse batch by batch.
>
> Tap "Filters" to narrow things down: a city, a range of years, a profession.
>
> That last one is worth knowing if you are early in your working life. You can find the people from the
> valley who do the kind of work you are curious about, and simply say hello.

### Stop 3 — The Valley Collection

> **Title:** The Valley Collection
>
> **Body:**
> Have you ever tried to show someone what Rishi Valley looks like, searched online, and found nothing that
> did it justice? This is us fixing that.
>
> People have started little photo archives of the valley over the years, each on their own. This is the one
> we build together. Anyone can add to it with the "Contribute" button.
>
> The photos that belong here are the ones of the school that others would love to see: the banyan in good
> light, the hills at dawn, the birds, a corner you never forgot. A caption and a tag on each one help people
> find it later.
>
> **Note (callout):**
> A few of us quietly look after the Collection and take down anything that does not belong. So please go
> about this responsibly, and it will stay a place everyone is glad to open.

### Stop 4 — Catch-ups

> **Title:** Catch-ups
>
> **Body:**
> A Catch-up is a little group letter that comes around now and then. It happens in three easy steps.
>
> First, everyone adds a question or two. Then, for a few days, everyone answers. When the window closes, all
> the answers are gathered into one warm issue the whole group reads together.
>
> Ask, answer, read. It is a lovely way to hear from the people you do not speak to every day.

### Finish

> **Title:** That is the tour
>
> **Body:**
> That is everything for now. Have a wander, and add something whenever you feel like it. There is no rush.
>
> If you ever want this again, it is on the About page, under "How to use it."
>
> **Button:** `Start looking around` (primary) — closes the tour, marks it complete, leaves the member on the
> page they are on.

---

## 5. Reserved Groups slot (stub copy, do NOT ship in V1)

Kept in `tour-steps.ts` with `enabled: false` so it is trivial to switch on once the Groups rework lands.
Draft, to be rewritten when Groups is finalised:

> **Title:** Groups
>
> **Body:**
> Groups are the smaller circles inside the valley: your batch, your house, a shared interest. They are where
> Catch-ups live, and where some conversations feel more at home.
>
> (We are giving Groups a fresh look, so there will be more to show you here soon.)

When enabled, place it after Catch-ups (they are related) and bump the progress dots from four to five. Its
spotlight target would be `data-tour="groups-..."` on whatever the reworked page's primary control turns out
to be.

---

## 6. Re-access from About

The About page (`src/app/(main)/about/page.tsx`) already has a "How to use it" section. Add a "Take the tour
again" button there. Copy:

> **In the "How to use it" section, above or below the per-section notes:**
> Prefer to be shown around? The hoopoe can walk you through it again.
>
> **Button:** `Take the tour again`

Pressing it calls `tour-provider`'s `start()` and `router.push("/feed")` so the tour begins from Stop 1
regardless of stored state (the About entry point deliberately ignores the "completed"/"dismissed" flag; it is
the always-on way back in). This is why the tour can safely double as the permanent how-to guide.

The existing prose "How to use it" blurbs in About can stay as a text fallback, but should be brought in line
with the tour copy (the current About text still says things like targeting batches and uses a slightly
different Directory description). Recommend trimming About's per-section prose to one line each and letting the
tour carry the detail, so the two never disagree. (Flagged, not required for the tour to ship.)

---

## 7. State and storage

**Decision: localStorage, per user, for V1.** Key `rv:tour:<userId>`, value `"completed"` or `"dismissed"`.
New helpers in a small `src/lib/tour-local.ts`, written in the exact shape of `src/lib/onboarding-local.ts`
(safe get/set that never throws in private mode, scoped by user id so switching accounts on one browser never
crosses wires):

```
hasSettledTour(userId): boolean          // completed OR dismissed
markTourCompleted(userId): void          // "completed"
markTourDismissed(userId): void          // "dismissed" (Skip or "Maybe later")
```

**Offer logic on `/feed` mount:** offer the tour when all of these hold:
`hasSeenOnboarding(userId)` (they came through the wizard) AND `!hasSettledTour(userId)` (never finished or
dismissed) AND `!anotherHoopoeOnScreen()` (no other bird is mid-moment). "Maybe later" and "Skip" both call
`markTourDismissed`, so the offer never nags again; the About button is the intended way back.

**Why localStorage and not a User column (for V1):**
- It mirrors the established pattern. Onboarding already stores its "seen" flag this way
  (`rv:onboarding:seen:<userId>`) and the moments system stores one-shots per user id
  (`moments/one-shot.ts`). The tour flag is the same kind of first-run, per-user, non-critical signal.
- It needs no schema change or migration coordination during an active redesign.
- The failure mode is benign and even friendly: a member on a brand-new browser who never finished the tour
  simply gets offered it again. Losing the flag re-offers a nicety; it loses no data and breaks nothing.
- Cross-device "never offer again" is not actually wanted here, because the tour is meant to stay
  re-launchable forever from About anyway.

**Upgrade path (later, if the owner wants a durable cross-device flag):** add one additive, idempotent column
the same way `secondaryCity` / `houses` were added, appended to `prisma/pending-migration.sql` and run through
`scripts/dev/run-sql.mjs`:

```
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tourState" TEXT;   -- null | 'completed' | 'dismissed'
```

Then a small server action `setTourState(state)` (guarded like the other profile actions) writes it, and the
session `select` reads it. The client should **probe-and-fall-back** exactly like the houses step already does
(prefer the column when present, else localStorage), so the column can land with zero risk. Recommend staying
on localStorage until there is a concrete reason to go durable.

---

## 8. Mobile behaviour (390 x 844)

- **Panel becomes a bottom sheet.** Full width with 12px side insets, rounded top (~20px, a larger radius than
  the desktop card since it meets the screen edge), `card-elevated` shadow, and bottom safe-area padding. It
  is pinned to the bottom of the viewport.
- **Hoopoe** perches on the top edge of the sheet, size ~84px (still clearly the lead character; the sheet's
  top padding leaves room so the bird is never clipped).
- **Spotlight without overlap.** Before opening the hole, `scrollIntoView` the target into the **top ~40%** of
  the viewport, so the bottom sheet and the highlighted control never sit on top of each other. The dim covers
  everything except the control's rounded-rect hole.
- **No nav-rail spotlighting.** The mobile nav is inside the hamburger drawer, so the tour never tries to
  highlight a nav item; it navigates programmatically (`router.push`) and highlights the on-page control, the
  same as desktop.
- **Controls sized for older hands.** Back / Next are large tap targets (>=44px height), Next is a canopy pill,
  Back is quiet, Skip is a clear text button in the sheet header. Progress dots centred. If the copy (Feed +
  its note) is taller than the sheet's max height (~62vh), the body scrolls inside the sheet while the header
  (dots + Skip) and footer (Back / Next) stay fixed.
- **Between stops** the hoopoe still flies (short arc to the new control, then back to the sheet), just over a
  shorter distance. Animation is always on (no reduced-motion branch anywhere in the mascot, per the design
  system).

---

## 9. Visual and design tokens

Follow `docs/spec/DESIGN-SYSTEM.md`; specifics for this surface:

- **Card:** Paper `#F6F2E8`, 16px radius (desktop), `card-elevated` layered ink-tinted shadow. The `note`
  callout inside it is a nested box, so it is a smaller radius than its container (12px) per the nesting rule,
  with a faint leaf or cinnamon left edge to read as an aside, not a warning.
- **Buttons:** Next is a Canopy `#235C49` full pill; Back and Skip are quiet (ghost) pills. Every button has
  hover / focus-visible / active and uses `SpringPress`.
- **Progress dots:** reuse the onboarding dot styling (the current dot is a widened canopy pill, done dots are
  `canopy/45`, upcoming are `border`); four dots for the four sections.
- **Spotlight dim:** warm ink at ~55% (never pure black), with a soft leaf-tinted ring around the hole. Match
  the hole's corner radius to the control (the composer pill is a full pill; the Contribute button is a pill;
  the Catch-ups band is a 16px card).
- **Motion:** import `SPRINGS` / `EASE_POP` from `src/components/common/motion.tsx`. Animate only transform and
  opacity. `AnimatePresence` with a real exit on the card and the overlay. No `transition-all`, no hand-typed
  cubic-bezier.
- **Hoopoe size:** desktop ~116px, mobile ~84px (bigger than the 96-102px auth birds so it reads as the lead).
- **Copy:** headings in Libre Baskerville, body in Source Sans 3, body line-height ~1.65. No em dashes.

---

## 10. Build checklist

**New files**
- [ ] `src/lib/tour-local.ts` (localStorage helpers, shaped like `onboarding-local.ts`).
- [ ] `src/components/tour/tour-steps.ts` (ordered config + copy from sections 4/5; Groups `enabled:false`).
- [ ] `src/components/tour/tour-anchors.ts` (`reportSpotlight` / `awaitSpotlight`, modeled on `awaitPerch`).
- [ ] `src/components/tour/tour-provider.tsx` (state machine, navigation, offer logic, persistence).
- [ ] `src/components/tour/tour-spotlight.tsx` (dim + rounded-rect hole, scroll-into-view, resize-aware).
- [ ] `src/components/tour/tour-panel.tsx` (docked card / bottom sheet + hoopoe + dots + Back/Next/Skip).
- [ ] `src/components/tour/tour-offer.tsx` (first-arrival offer card; guarded by `anotherHoopoeOnScreen`).

**Wiring (small edits to existing files)**
- [ ] Mount `<TourProvider>` (and its panel/overlay) once in `src/app/(main)/layout.tsx` so it survives the
      four navigations.
- [ ] Add `data-tour="feed-composer"` to the feed composer pill.
- [ ] Add `data-tour="directory-search"` to the directory search + Filters row.
- [ ] Add `data-tour="collection-contribute"` to the Collection Contribute button.
- [ ] Add `data-tour="catchups-explainer"` to the Catch-ups Ask/Answer/Read band.
- [ ] Add `useTourAnchor(key)` to each of the four pages (measures + reports the rect).
- [ ] Add the "Take the tour again" button to the About page "How to use it" section.

**After-work (per CLAUDE.md)**
- [ ] Every clickable element has hover / focus-visible / active; CTAs are canopy pills; `SpringPress` used.
- [ ] Animate only transform/opacity; `AnimatePresence` exits on card + overlay; springs imported, not typed.
- [ ] Screenshots: desktop (1440) and mobile (390) of the offer, all four stops, and finish. Minimum 2 rounds.
      Skip iteration on the flight frames (animated).
- [ ] Verify at runtime, not just `tsc`: watch the console/server log while stepping through all four routes
      (a `data-tour` on a control that later moves must still be found; a missing anchor must fall back, not
      hang).
- [ ] Confirm the one-hoopoe rule: sidebar idle bird, bell delivery, and celebrations all stay quiet while the
      tour runs; the offer waits its turn if another bird is up.
- [ ] Run `/simplify`. Security review is essentially N/A (no auth/data/forms) unless the optional `tourState`
      column + server action is built, in which case guard it like the other profile actions and review it.
- [ ] No em dashes; "Rishi Valley" everywhere; check the copy renders without widow/orphan awkwardness on 390.

---

## 11. Dependencies and open questions

- **Collection page is currently hanging server-side in local dev** (the route did not respond within 60s to a
  plain request during this spec's screenshot pass; feed / directory / catchups all rendered fine). This is a
  pre-existing bug unrelated to the tour, but the tour's Collection stop cannot be verified until it renders,
  so flag it to whoever owns the Collection workstream. The `data-tour` attribute and copy are ready
  regardless.
- **Catch-ups depends on Groups.** The Catch-ups page shows per-group cards ("Start one") and its own
  Ask/Answer/Read band. The tour copy is written to stand alone (it says "group letter" / "the group") without
  teaching Groups, so it holds even while the Groups tour slot is disabled. If a member has no groups yet, the
  Catch-ups stop still explains the idea; the spotlight falls on the explainer band, which is always present.
- **Offer timing vs the profile-nudge banner.** `/feed` also shows a "Finish setting up your profile" banner.
  The tour offer and that banner can coexist (the offer is a hoopoe card, the banner is inline), but do a
  quick visual check on 390 that they do not stack awkwardly; if they do, let the banner sit and dock the
  offer at the bottom as specced.
- **Groups copy** in section 5 is a stub to be rewritten once the Groups rework is designed.
</content>
</invoke>
