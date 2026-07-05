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
| Paper | `#F6F2E8` | Card / elevated surface. |
| Float | `#FFFFFF` | Floating modals only. |
| Ink | `#23241E` | Warm near-black text. |
| Background | `#E7E1D3` | Page base. |
| Mist | `#EEE8DA` | Recessed surface. |
| Border | `#E0D8C8` | Hairlines / input borders. |

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

- Parked (`forcedTheme="light"`). Leave the scaffold; revisit later.

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
- **Curves:** import `EASE_POP` / `EASE_SPRING` / `SPRINGS` from `src/components/common/motion.tsx`.
  Never hand-type a `cubic-bezier(...)`.
- **`SpringPress` is mandatory** on every clickable/interactive element. No bespoke Tailwind transitions.
- **Auto-animate is mandatory** on every list that adds/removes items.
- **`AnimatePresence` with a real exit** on every modal/panel (this is what prevents the close-jump bugs).
- **One shared `<LoveButton>`** (the feed heart, the one that never flashes black) used **everywhere** —
  Catch-ups, groups, the Collection, comments. Today it only works in the feed; that is the exact
  modularity failure we are fixing. Extract it once, reuse it.
- **Loading:** every async route ships a loading state, using the **warm shimmer** (not the grey pulse).
  The "sleeping birds waking" idea builds on top of the warm shimmer.
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

**Parked dark mode** (post-MVP; the rule is warm charcoal, never pure black, and accents get *brighter*
on dark, not dimmer): page `#1C2420`, elevated `#262E29`, recessed `#222A26`, border `#34403A`,
sidebar `#16332A`, ink `#E8EDE6`, office blue `#5FA6D6`, heart `#FF5B4D`, leaf `#3FD16A`.
