# Rishi Valley — Design System & Brand

**Status:** Canonical for brand + design language, as of 2026-07-02. The live token source is
`src/app/globals.css`; this doc is the human-readable rulebook that explains what the tokens mean and
how to use them. The former `docs/spec/color.md` is folded into Appendix B below (no information lost).

A handful of points are tagged **(confirming)** — they came from owner answers that required
interpretation and are pending a quick sign-off in chat. Everything else is locked.

---

## 1. Name & voice

- **User-facing name is "Rishi Valley".** We drop "Alumni" everywhere the user sees it, because the
  community includes teachers and staff, not only alumni. **(confirming)**
- **"RV Alumni"** is internal/developer shorthand only — never shown to users.
- **"Rishi Valley School"** is the institution — use only in external/legal/formal contexts.
- **Browser tab title:** `Rishi Valley · {Section}` (e.g. `Rishi Valley · Feed`, `Rishi Valley · Directory`).
  Pages with no section show just `Rishi Valley`. No "Alumni" in the title.
- **Sidebar / landing lockup:** "Rishi Valley" beside the mark, **left-aligned** (the icon sits on the
  other side). This replaces the old two-tier "Rishi Valley / Alumni". **(confirming)**
- **Logo:** `PeaksMark` (`src/components/layout/peaks-mark.tsx`) is **final**. Use as-is. No retrace needed.
- **Peak names:** "Rishikonda" and "Bodikonda" are each **one word**.
- **Tagline (function register):** *"A space for the Rishi Valley community to stay connected."*
  (Reworded from "...alumni..." to match the inclusive name. The "quiet home" / belonging register is
  rejected.) **(confirming the wording)**
- **Voice / AI-writing-tells** (see `docs/content/AI-WRITING-TELLS.md`):
  - No em dashes anywhere.
  - **Stop overusing "quiet."** It currently appears all over the copy; strike it as a reflex adjective.

---

## 2. Colour

Live values in `globals.css`. Surfaces are **never pure white** (`#FFFFFF` is reserved for floating modals).

| Token | Hex | Role |
|---|---|---|
| Canopy | `#235C49` | **The one green for all CTAs + the sidebar.** Brand green. |
| Leaf | `#1F8A4C` | Accent/highlight only. Never a button fill. |
| Leaf-light | `#34C759` | **Retired from fills** (reads cheap). |
| Cinnamon | `#C2622F` | **Secondary accent** (the hoopoe's colour). Use more, tastefully. |
| Sky | `#3F7CA6` | The vivid cool pop, used sparingly. |
| Heart | `#E03A33` | The heart / destructive red, always, in every theme. |
| Paper | `#F5F2EA` | Card / elevated surface. |
| Float | `#FFFFFF` | Floating modals, menus, dialogs only. |
| Ink | `#23241E` | Warm near-black text. |
| Background | `#E4E1D5` | Page base. |
| Mist | `#ECE8DD` | Recessed wells only (== `--muted`). |
| Secondary | `#F0EDE4` | Quiet filled controls (`--secondary`). |
| Accent | `#FAF8F2` | The hover lift (`--accent`). |
| Border | `#DFD8CB` | Hairlines / input borders. |

### The surface ladder (colour protocol, 2026-07-30)

The neutrals are a single ladder, bottom to top, each rung ~5 RGB steps lighter:

```
background #E4E1D5  <  mist #ECE8DD  <  secondary #F0EDE4  <  paper #F5F2EA  <  accent #FAF8F2  <  float #FFFFFF
   page          recessed wells      quiet filled controls   cards/content        hover lift        menus/dialogs
```

Why a ladder: the pre-protocol palette had FOUR token names resolving to one hex
(`--secondary` = `--muted` = `--accent` = mist `#EEE8DA`), so idle chips, hover states and
recessed wells all converged on one ochre and hovers went *darker* into tan. Roughly 300 of
430 production background usages were the warm-tan family. That convergence, plus the photo
wash, is what read as "everything brown". The owner's calibration: all-white is a 0 (corporate,
characterless), the old state a 10; the app sits at ~5 - warm at the base, clean where content
and interaction live.

**The rules** (each enforceable in review):

1. **Warmth lives at the bottom.** The page base and the valley-photo wash carry the boutique
   warmth. Surfaces get *cooler and lighter as they rise*. A floating surface (menu, dialog,
   popover) is Float white - that contrast is deliberate relief, not a bug.
2. **Hover lifts, never sinks.** Interactive hover/highlight is `--accent` (a rung *above*
   paper). Never `hover:bg-muted`, never `hover:bg-secondary/70`, never any tint darker than
   the resting surface. (Press/active may sink - that is feedback for an action.)
3. **One well per card.** At most one mist/`--muted` recessed region inside any card, and
   never two mist surfaces adjacent (nested or side by side). Everything else sits directly
   on the card's paper; if it needs an edge, it earns a border, not a fill.
4. **No green-on-green DECORATIVE chips.** The drab pairing (`bg-canopy/10` + `text-canopy`,
   or the old off-palette `#1A6B3C` text on tan) is dead for informational chips, tags and
   icon bubbles. Those use the approved tint trio - `border-leaf/30 bg-leaf/[0.07] text-leaf`,
   `border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon`, `border-sky/35 bg-sky/[0.10]
   text-sky` (first shipped in the profile houses chain) - rotated so one screen never repeats
   a single tint. The canopy wash survives in exactly ONE role: a **selected/active state**
   (an active thread row, a pressed filter, a segmented-control thumb) - selection is the app's
   one green state, like an OS selection colour. Solid selection stays canopy fill + white text.
5. **Text on tinted chips must clear AA.** At small bold sizes leaf text on paper is ~4.1:1;
   when in doubt the chip's text steps down the ladder to canopy over a leaf wash.
6. **No new hexes.** Any colour not in the table above needs a token and a written reason, or
   it does not merge. (Plumage art - bird glyphs, the hoopoe - is the standing exception.)

### The green rule (this is what stops the "three greens" mess)

- **Buttons & sidebar → Canopy `#235C49`, one green.** Standardize the composer "Post" button, the
  "New post" button, and the sidebar to this. The current composer Post green is too light/cheap — replace it.
- **Leaf `#1F8A4C` is a highlight, not a button.** Use it *sparingly* for relief: feature icons (the
  Letters pen, the Events calendar), links, selection states, the focus glow. Never fill a CTA with it.
- **Leaf-light `#34C759` is retired** as a fill (it's the "cheap" green). Where a highlight is needed,
  use Leaf or Cinnamon instead.
- **Cinnamon `#C2622F` is the second accent** — expand its use (Events, saved, the hoopoe). (The Directory
  map's single-city pin stays leaf green per owner, 2026-07-02; do not cinnamon-ify it.)

### Focus states

- **One focus ring** (Leaf), a single outline. Remove the doubled / thicker outline currently drawn
  around focused inputs.

### Dark mode

- Being rebuilt from scratch (owner, 2026-07-30). The old `.dark` scaffold was **deleted** —
  "pretty garbage", never build on it. Constraints for the rebuild: warm charcoal, never pure
  black; the Canopy sidebar does **not** change; the heart stays `#E03A33`; accents get
  *brighter* on dark, not dimmer. Ships behind a deliberately funny multi-step confirmation
  flow in settings (easy to turn OFF, theatrically hard to turn on), with a payoff transition.
  Until then `forcedTheme="light"`.

### Feature label accents

The owner likes the small uppercase eyebrow labels on the landing page's feature sections
(`FeatureSection`'s `eyebrow` prop, e.g. "The Directory", "The Feed") in these three colours for
small-label use — a good default rotation whenever a short label needs a colour accent:

- Sky `#3F7CA6` — Directory
- Leaf `#1F8A4C` — Feed, Catch-ups
- Cinnamon `#C2622F` — Letters, The Valley Collection

---

## 3. Shape & radii

- **Buttons / CTAs / chips / tags: full pill** (`rounded-full`, 999px). Fix this in the shared `Button`
  primitive so it is the default for every variant — not something each caller has to remember.
- **Cards / boxes: 16px.** (Chosen over 18 and 21; roundest is rejected. What the feed uses now is right.)
- **Nesting rule:** a box inside another box is **never the same radius** as its container — the inner one
  is slightly smaller (e.g. 16px container → 12px inner). This keeps nested corners from looking wrong.
- **Text fields / inputs: 12px** (slightly less round than cards — a quiet signal that it's an input).
  **Exception:** the feed composer's inline post box stays a **full pill**.
- **Avatars: full circle.**

### The radius ladder (shape protocol, 2026-07-30)

One ladder, three rungs down from the card, everything derived from `--radius: 1rem`:

| Rung | Token | Value | What sits here |
|---|---|---|---|
| Container | `--radius` (`rounded-lg`) | 16px | Cards, tiles, the composer shell |
| Nested | `--radius-md` | 12px | Photos inside a card, the letter-preview outline, inner panels; also every input (`--radius-input`, same 12px) and menu panels |
| Thumbnail | `--radius-sm` | 8.8px | Small media (80px previews), the viewer photo, third-level boxes |
| Control | `rounded-full` | pill | Buttons, chips, tags, the composer trigger |

**The rules:**

1. **Inner is always SHARPER, one rung down.** 16 → 12 → 8.8. Never equal, never rounder.
   The concentric formula (inner = outer − inset) collapses to 0 when the inset equals the
   radius, so the ladder is the binding rule, not the formula.
2. **`rounded-xl` is a trap in this repo** — it computes to 20.8px (`--radius × 1.3`), which is
   *rounder than the 16px card*. It exists for standalone hero surfaces only; it never
   appears inside a card. When in doubt, name the token (`rounded-[var(--radius-md)]`), don't
   reach for a Tailwind step.
3. **Pills are for controls, not containers.** A pill is correct on anything you press that is
   a single row tall. A multi-line region is never a pill.
4. **A highlight inside a panel is concentric with the panel**: item radius = panel radius −
   panel padding (e.g. a 12px menu with 4px padding highlights its rows at 8px). A highlight
   whose radius ≥ its panel's reads as a cut — this is the exact dropdown bug the owner named.

### Menus & dropdowns: one material (2026-07-30)

"What would Apple do": a menu is a *material*, not a per-screen decision. Every dropdown,
select, combobox and context menu in the app — Directory and Collection filters included —
is the same object:

- **Surface:** Float `#FFFFFF`, `--radius-md` 12px panel, 4px inner padding, the layered
  ink-tinted shadow (`.card-elevated` register), hairline border.
- **Rows:** highlight = `--accent` lift (never a tan sink, never a green wash), radius 8px
  (concentric: 12 − 4), full-width, 36–40px tall.
- **Placement:** opens BELOW its trigger, aligned to the trigger's leading edge, 6px offset,
  flipping only when the viewport forces it. Never centred-under-nothing, never a different
  edge on a different page.
- **Motion:** one origin animation — scale/fade from the trigger corner on `EASE_POP`,
  ~140ms, exit faster than enter. No slide-downs on one page and pops on another.
- **Enforcement:** these live in the shared primitives (`ui/dropdown-menu`, `ui/select`,
  `ui/popover`, `pill-shell`); a page may not override radius, colour, offset or animation.
  If a surface needs something a menu primitive can't do, it isn't a menu.

---

## 4. Depth, elevation, glass

- **Shadows:** layered, ink-tinted, low opacity (the `.card-elevated` utility). Never a flat `shadow-md`.
- **Frosted glass:** **yes** — implement a `.glass` utility (a semi-transparent, blurred surface) for the
  sticky nav and overlays. It's a translucent `--card` with a backdrop blur.
- **Z-index (stacking order):** define named tokens for the layers — base → elevated → floating → overlay —
  and migrate the scattered ad-hoc values onto them. (This is the invisible rule for what sits on top of
  what when things overlap; you only ever notice it when a menu hides behind something.)

---

## 5. Typography

- **Heading:** Libre Baskerville (`--font-heading`). **Body:** Source Sans 3 (`--font-sans`).
- **Type scale** (documented ladder, matches `/preview/v2`):
  display `clamp(1.9rem,5vw,2.6rem)` · h1 `2rem` · h2 `1.5rem` · h3 `1.25rem` · body `1rem`/1.65 ·
  small `0.875rem` · label `0.75rem` uppercase, letter-spacing `0.08–0.16em`.
- **Heading tracking:** tight (`-0.025em`).
- No mono font (the dead `--font-mono` token is removed).
- **Meta lines & the middle dot** (owner, 2026-07-30): a `·` separator appears only BETWEEN
  surviving segments — never leading, trailing, or beside an empty one. A byline with one
  segment renders dotless; an Anonymous-profile byline is just the date (no "Member" filler).
  Never hand-write ` · ` in a template string: use `metaLine()` (`src/lib/utils.ts`) for plain
  strings or `<MetaDots>` (`src/components/common/meta-dots.tsx`) for styled spans.

---

## 6. Spacing

- Use the **LiftKit golden-ratio scale** (`--space-*` in `globals.css`). It is the standard, applied
  app-wide — not a pilot. Retrofit existing screens onto it where it improves consistency; effort is not
  a reason to skip it.

---

## 7. Motion & delight

- **Animations always play.** Never gate motion on the OS `prefers-reduced-motion` setting, anywhere in
  the app. (The only thing that pauses motion is the browser tab being hidden.) Consolidate to one
  `useMotionGovernor`; remove the OS checks left in older components; reconcile the two `useValleyMotion`
  forks into it.
- **Curves:** import `EASE_POP` / `EASE_SPRING` / `EASE_OUT_SMOOTH` / `EASE_IN_OUT_SCENE` / `SPRINGS`
  from `src/components/common/motion.tsx`. Never hand-type a `cubic-bezier(...)`.
  Picking between the two slide curves: `EASE_OUT_SMOOTH` starts at full speed, which is right for a
  small element answering a click. `EASE_IN_OUT_SCENE` ramps in and settles, which is what a large,
  viewport-scale move needs; using the out-only curve there reads as an abrupt lurch because the eye
  never gets to pick the movement up.
- **HOVER NEVER MOVES A CONTROL** (owner, 2026-07-25). No `hover:-translate-y-*`, no `hover:scale-*`,
  no `whileHover` carrying `y` or `scale`, on any button, pill, chip, tab, card, or nav item. Hover is
  a colour or background change and nothing else: "it changes color marginally, and that's enough. It
  doesn't have to physically move." The press sink on `:active` / `whileTap` STAYS, because that is
  feedback for an action you took rather than a control drifting under an idle cursor.
  The one exception is a PHOTO scaling inside its own `overflow-hidden` frame, where the frame itself
  does not move. Every clickable still needs `hover`, `focus-visible` and `active` states, so when a
  transform is removed a colour hover has to be there in its place.
- **`SpringPress` is mandatory** on every clickable/interactive element. No bespoke Tailwind transitions.
- **Auto-animate is mandatory** on every list that adds/removes items.
- **`AnimatePresence` with a real exit** on every modal/panel (this is what prevents the close-jump bugs).
- **One shared `<LoveButton>`** (the feed heart, the one that never flashes black) used **everywhere** —
  Catch-ups, groups, the Collection, comments. Today it only works in the feed; that is the exact
  modularity failure we are fixing. Extract it once, reuse it.
- **Loading:** every async route ships a loading state, using the **warm shimmer** (not the grey pulse).
  The "sleeping birds waking" idea builds on top of the warm shimmer.
- **The viewer step (named pattern, 2026-07-30):** moving between photos in the full-screen
  viewer is a film advance — incoming drifts 28px from the direction of travel on
  `EASE_IN_OUT_SCENE`, outgoing slips 18px the other way; opacity is asymmetric (140ms out,
  200ms in) so the cross never dips see-through. **No scale in any image-to-image step,
  anywhere** — a size mismatch between stacked frames reads as a zoom-bounce. Drag gestures
  live on a stable wrapper, never on the keyed frame they would exit with.
- **Mascot:** wire the hoopoe onto the **signup** password field (reuse the `/login` rig). More
  placements come later.

---

## 8. Feature naming

- **Newsletter feature = "Catch-ups".** Each issue/edition = **"Round N"** (Round 1, Round 2, ...).
  **Kill "Roundup" / "Roundups" everywhere** — code, copy, schema comments, spec titles. Rename
  `roundupLabel()` → `roundLabel()`, type `Roundup` → `Round`. **(confirming "Round" as the issue word)**
- **Letters** — long-form posts. **The Valley Collection** (nav label "Collection") — photo archive.
  **Hoopoe** — the mascot. All locked.

---

## 9. Component reuse rules

- **Feeds:** reuse the shared `CreatePostForm` / `PostFeed` / `PostCard` (via `FeedColumn`). Don't rebuild.
- **Avatars:** import `BirdAvatar` (never `BirdGlyphV2` directly). A user's bird is deterministic. If they
  add a profile photo it must show **everywhere**; if they remove it, they return to the **same** bird they
  had before (never a new random one). There is no `avatarColor` (removed — see the avatar-colour bug fix).
- **Love button:** one shared `<LoveButton>` (see Motion).
- **Right rail:** a shared rail-card kit is still missing (currently one monolithic component) — a future
  reuse target, noted here so it isn't rebuilt ad hoc.

---

## How to use this doc

Before building any UI, read this file plus the relevant `docs/spec/*` for the feature. After building,
run the after-work checklist in `CLAUDE.md`. The automated checks (ESLint rules + PR template) enforce the
non-negotiables — pill CTAs, no `transition-all`, no hand-typed easing, no cheap-green fills — so drift
gets caught before it ships rather than fixed by hand afterward.

---

## Appendix A: Subject & motifs (design fuel)

Krishnamurti's valley school in Andhra Pradesh. Motifs: the ancient banyan, Rishi Konda hill,
bird-watching (hoopoe = founder's favourite bird; parakeets), rocky scrub-valley landscape,
hand-loom textiles, contemplative minimalism, study under trees, houses (e.g. "Krishna").
Aesthetic target: boutique, intimate, naturalist field-journal, NOT Instagram-for-the-masses.

## Appendix B: Avatar palette + parked dark mode

**Avatar / disc palette** (10 colours, assigned deterministically by hash; all ~AA against white glyphs):
Leaf `#2E9E54`, Office blue `#3F7CA6`, Teal `#1F9C8E`, Coral `#E14B3C`, Cinnamon `#C2622F`,
Marigold `#C79318`, Plum `#8A5BB0`, Indigo `#5566C4`, Rose `#C7508A`, Forest slate `#4F7E5C`.

**Heart:** the shared `LoveButton` hardcodes `#E03A33` with `transition: none` so it never flashes
black on the fill-weight swap (the old bug, now fixed by extraction).

**Dark mode working palette** (rebuild in progress; the rule is warm charcoal, never pure black, and
accents get *brighter* on dark, not dimmer): page `#1C2420`, elevated `#262E29`, recessed `#222A26`,
border `#34403A`, ink `#E8EDE6`, office blue `#5FA6D6`, leaf `#3FD16A`.
Owner overrides (2026-07-30, these win over any older note): the **sidebar does not change** in dark
(stays Canopy `#235C49`, not the once-parked `#16332A`), and the **heart stays `#E03A33`** in every
theme (the `#FF5B4D` bright variant is rejected — brand colours do not shift).
