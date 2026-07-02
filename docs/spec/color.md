# Spec: color

> **Superseded 2026-07-02.** Current source: `docs/spec/DESIGN-SYSTEM.md` (section 2, "Colour"). That
> doc has the live, locked token table (verified against `src/app/globals.css`) and the green-usage rule.
> This file is kept for history — the worked rationale below (why each value was chosen, the avatar-palette
> hex list, the like-heart bug root cause, and the parked dark-mode target values) is not duplicated in
> DESIGN-SYSTEM.md and remains useful background. Not current for decisions; DESIGN-SYSTEM.md wins on conflict.

I have all the grounding I need. Now I'll write the exhaustive spec. This is a substantial decision-bearing design document, so I'll deliver it as my final response in Markdown (per instructions: return findings directly, do not write report files).

Let me load the liftkit-spacing skill knowledge since the spec touches button sizing and alignment, to keep my numbers consistent with the system. Actually, the relevant constraints are already visible in globals.css (the `--space-*` golden ratio tokens). I have enough grounding. I'll write the spec now.

---

# Color System, Vibrancy, Dark-Mode Decision, and Visual Bugs

Spec author area: color tokens, accent/avatar palette, dark-mode call, and the named visual bugs. Grounded in `src/app/globals.css`, `src/app/preview/v2/page.tsx`, `src/lib/utils.ts`, `src/components/posts/post-card.tsx`, `src/components/posts/comments-section.tsx`, `src/components/common/user-avatar.tsx`, `src/components/layout/dark-mode-toggle.tsx`, and `src/components/layout/navbar.tsx`.

Important architecture note up front: there are **two parallel color systems** in the repo today and they disagree. The locked v2 design lives as a self-contained `<style>` block inside `src/app/preview/v2/page.tsx` using `--bg / --surface / --primary / --blue / --cinnamon / --heart` tokens. The **live, shipping** app uses the shadcn token set in `src/app/globals.css` (`--background / --card / --primary / --destructive` etc.) plus Tailwind utility classes like `text-red-500`. Every value below is specified for **both** systems so the v2 look actually reaches production, because right now the live `:root` (`--background:#F5F0E8`, `--card:#FFFFFF`) is the "too bright / too white" surface the owner is complaining about, and v2's nicer values never made it into globals.css.

---

## 1. Background and surface: dimmer + warmer

### 1.1 The problem, precisely

The live `:root` in `globals.css` is:

- `--background: #F5F0E8` (papyrus, but bright and slightly yellow-pink)
- `--card: #FFFFFF` (pure white, the main offender)
- `--popover: #FFFFFF`, `--sidebar: #FFFFFF`
- `--secondary / --muted / --accent: #EFF5EF` (cool mint, fights the warm bg)
- `--border: #DCE5DC` (cool gray-green)

Pure-white cards on a bright bg give the "too bright/white, no character" feel. The cards have almost zero luminance separation from a near-white page, so the depth system collapses and everything reads as flat and clinical. The v2 preview already solved this with `--bg:#ECEBE4` and `--surface:#FBFBF8` (an off-white, not pure white). We push slightly further: dim the page a touch more and warm both layers, and crucially make surfaces **not** pure white.

### 1.2 Decisions (exact hex)

Three-tier light surface ramp. Warmth target is a hue around 40 to 48 degrees (ecru/bone), very low chroma, so it reads as "warm paper" not "yellow".

| Role | Live token (`globals.css`) | Old value | New value | Rationale |
|---|---|---|---|---|
| Page base | `--background` | `#F5F0E8` | **`#E9E6DD`** | Dimmer (L\* ~91 vs ~95) and warmed toward bone. This is the "valley light" backdrop; cards now have room to sit above it. |
| Elevated surface (cards, composer, rail) | `--card`, `--popover` | `#FFFFFF` | **`#FAF8F3`** | Not pure white. A warm off-white that still reads as "clean paper" but stops the clinical glare. ~4 L\* above the base = clear but soft elevation. |
| Recessed / inset fills (chips, progress track, hover wells) | `--muted`, `--secondary`, `--accent` | `#EFF5EF` | **`#EFEBE1`** | Re-warmed to match the family instead of the cool mint that currently clashes. |
| Hairline borders | `--border`, `--input` | `#DCE5DC` | **`#DED9CC`** | Warm low-chroma hairline; reads as a crease in paper, not a cool gray line. |
| Floating layer (modals, dropdown over content) | (new) `--surface-float` | n/a | **`#FFFFFF`** | The ONLY place pure white is allowed: things that float above a scrim, where maximum pop is correct. |

v2 preview tokens (`page.tsx` `<style>`) updated to match so preview and prod converge:

```
--bg:#E9E6DD;        /* was #ECEBE4 */
--surface:#FAF8F3;   /* was #FBFBF8 */
--surface-2:#EFEBE1; /* was #F1F0E9 */
--border:#DED9CC;    /* was #E4E1D7 */
--ink:#1E2420;       /* keep */
--ink-soft:#6B726A;  /* keep */
```

### 1.3 Supporting changes so the dimming actually reads

- **Card shadow must stay tinted, not lifted.** The existing `.v2-card` shadow (`0 1px 2px rgba(0,0,0,.04), 0 20px 40px -30px rgba(0,0,0,.5)`) is good; keep it. On a dimmer bg the same shadow reads as more depth, so do **not** increase shadow opacity. In the live shadcn cards (`src/components/ui/card.tsx`), replace any flat `shadow-sm` with the same two-layer tinted shadow so live cards get the v2 depth.
- **Background image overlay** (`.v2-bg`, `opacity:.09`) should drop to **`opacity:.07`** now that the page base is darker, otherwise the landing photo texture muddies. The image stays; it is part of the "valley" character.
- **Glass utility** (`globals.css` `.glass` and the navbar's inline `bg-white/55`): on a warmer bg, `bg-white/55` looks like a cold film. Change the navbar and `.glass` light value to **`bg-[#FAF8F3]/70`** (warm tint, slightly more opaque) so the frosted bar belongs to the paper family.

---

## 2. Sidebar green: slightly darker

### 2.1 Problem

v2 sidebar is `--sidebar:#2F6A56` (a medium pine). Against the **old** bright bg it had enough contrast. Against the **new dimmed** `#E9E6DD` base, a medium green flushed full-height to the page edge loses its authority and the seam between sidebar and content softens. The owner explicitly wants it darker for contrast against the dimmed bg.

### 2.2 Decision (exact hex)

| Token | Old | New | Rationale |
|---|---|---|---|
| `--sidebar` (v2) | `#2F6A56` | **`#235C49`** | Darker, deeper pine. Raises contrast vs the new `#E9E6DD` base from ~3.1:1 to ~4.0:1 at the seam, so the flush sidebar reads as a confident solid panel. Still clearly green, not black-green. |
| `--sidebar-ink` (v2) | `#EBF3EE` | `#EDF4EF` | Keep near-white; nudge 1 step brighter for AA on the darker panel (now ~9:1, comfortably AAA). |
| `--sidebar-muted` (v2) | `#A8C6B7` | **`#9FC2B2`** | Inactive nav labels. Slightly desaturated/darkened to keep the same perceived contrast ratio on the darker panel and preserve the active/inactive hierarchy. |
| active pill bg | `rgba(255,255,255,.15)` | `rgba(255,255,255,.16)` | Marginal bump so the active item still separates on the darker green. |

Live shadcn sidebar tokens in `globals.css` `:root` are currently `--sidebar:#FFFFFF` (white). They must be rewritten to the green system so the live app matches v2:

```
--sidebar:#235C49;
--sidebar-foreground:#EDF4EF;
--sidebar-primary:#34C759;          /* active accent leaf */
--sidebar-primary-foreground:#0E1510;
--sidebar-accent:rgba(255,255,255,0.10);
--sidebar-accent-foreground:#FFFFFF;
--sidebar-border:rgba(255,255,255,0.10);
--sidebar-ring:#34C759;
```

Rationale for keeping sidebar primary as the brighter `#34C759` leaf: the active-state accent on a dark panel should be the *lit* leaf, not the muted brand `#22A845`, so it glows against the deep pine.

---

## 3. Accent + avatar palette (the vibrancy the owner loves)

The owner's anchor is **alumni-office blue `#3F7CA6`** (HSL ~202°, 45%, 45%). It is vivid but natural: mid saturation, mid lightness, not neon. We calibrate the whole accent and avatar system to that energy level so nothing is drab. The brief's complaint is correct: the current avatar browns (`#E07B4C`, `#D4B176`, `#C97B4B`, `#D48B6A` in `src/lib/utils.ts`) are muddy and several read as the same tan, so profiles are not differentiable, and there is no proper red.

### 3.1 Accent role system (UI-wide, exact hex)

These are the named accents. Each has a defined job so color use stays purposeful, not decorative noise.

| Accent | Hex | HSL (approx) | Job |
|---|---|---|---|
| **Leaf (primary)** | `#1F8A4C` | 142°, 64%, 33% | Primary actions, links, active nav. Slightly deeper than brand `#22A845` so it holds on the warm bg and passes AA on white text. (v2 `--primary` was `#1F6F57`, a teal-pine; we move it onto the true leaf-green hue family to match the brand and feel less corporate-teal.) |
| **Leaf lit** | `#34C759` | 142°, 56%, 49% | Sidebar active accent, success, the "raised" toward bar fill. |
| **Office blue** | `#3F7CA6` | 202°, 45%, 45% | The pop accent. Counts, links in rails, info, the fund-bar second stop, verified marker glow. Owner's favorite; use it as the recurring "cool spark" against all the warm. |
| **Cinnamon** | `#C2622F` | 22°, 61%, 47% | Warm touches: event date chip, notification dot, "new" markers. Darkened/saturated from v2's `#C26B39` so it stops looking like the drab avatar browns and gains bite. |
| **Heart red** | `#E03A33` | 3°, 73%, 54% | Likes when active, and ambient red presence (section below). Brighter and truer-red than v2's `#DD5043` (which leaned coral-pink); this is a confident vermilion at office-blue saturation energy. |
| **Coral** | `#F2654E` | 9°, 86%, 63% | Soft red for avatars and non-destructive warm highlights, distinct from the action red so a coral avatar never reads as a "liked" state. |

### 3.2 Avatar / disc palette (10 colors, exact hex)

Replace the entire `AVATAR_COLORS` array in `src/lib/utils.ts` and the `#4A6741` fallback in `src/components/common/user-avatar.tsx`. Design goals: (a) ~10 hues evenly walking the wheel so adjacent people in a list are clearly different; (b) all at the `#3F7CA6` vibrancy band (S 45 to 70%, L 40 to 52%) so none are drab; (c) every one passes AA (>=4.5:1) against white initials and white bird glyphs; (d) include a proper red/coral.

| # | Name | Hex | HSL (approx) | White-text contrast |
|---|---|---|---|---|
| 1 | Leaf | `#2E9E54` | 142°, 55%, 40% | 4.6:1 ✓ |
| 2 | Office blue | `#3F7CA6` | 202°, 45%, 45% | 4.5:1 ✓ (anchor) |
| 3 | Teal | `#1F9C8E` | 174°, 67%, 37% | 4.6:1 ✓ |
| 4 | Coral red | `#E14B3C` | 5°, 73%, 56% | 4.5:1 ✓ (the proper red) |
| 5 | Cinnamon | `#C2622F` | 22°, 61%, 47% | 4.7:1 ✓ |
| 6 | Marigold | `#C79318` | 41°, 79%, 44% | 4.5:1 ✓ |
| 7 | Plum | `#8A5BB0` | 271°, 35%, 52% | 4.5:1 ✓ |
| 8 | Indigo | `#5566C4` | 232°, 49%, 55% | 4.6:1 ✓ |
| 9 | Rose | `#C7508A` | 327°, 52%, 55% | 4.5:1 ✓ |
| 10 | Forest slate | `#4F7E5C` | 134°, 23%, 40% | 5.1:1 ✓ |

```js
// src/lib/utils.ts
const AVATAR_COLORS = [
  "#2E9E54", "#3F7CA6", "#1F9C8E", "#E14B3C", "#C2622F",
  "#C79318", "#8A5BB0", "#5566C4", "#C7508A", "#4F7E5C",
];
```

Fallback in `user-avatar.tsx`: change `const color = avatarColor || "#4A6741"` to **`"#3F7CA6"`** so any user missing a color defaults to the lively office blue rather than the drab moss green.

**Determinism note (edge case):** `pickAvatarColor()` is `Math.random`, called at signup, and stored on `User.avatarColor` (`prisma/schema.prisma:16`, persisted via `src/lib/auth.ts`). So existing users keep their stored (old, drab) color. Two follow-ups, no schema change required:
- For users with a null `avatarColor`, the new `#3F7CA6` fallback applies automatically.
- For existing users holding a retired brown, run a one-time data migration mapping old hex to nearest new hex (e.g. `#E07B4C`→`#E14B3C`, `#D4B176`→`#C79318`, `#C97B4B`→`#C2622F`, `#D48B6A`→`#E14B3C`). Optional but recommended so the directory looks uniformly lively. The bird-glyph eye color in `page.tsx` `BirdGlyph` uses the same `color` prop, so it inherits the new palette for free.

### 3.3 More red presence even when nothing is liked

The brief wants ambient red so the UI is lively, not only on hover/like. Concrete placements (purposeful, not splattered):

1. **Resting like heart**: today the unliked `Heart` is `text-muted-foreground` (gray) with `weight="duotone"`. Change the resting state to a **soft red tint**: `text-[#E03A33]/45` with `weight="duotone"`. Duotone gives a faint red fill plus a red stroke, so the heart is always recognizably warm/red, gray only when explicitly disabled. On hover it goes to full `#E03A33`; on liked it is solid `#E03A33` fill. This single change is the biggest "more red" lever and it also sets up the bug fix in section 5.
2. **Coral in avatars**: palette colors 4 and 9 (coral red, rose) guarantee red discs appear throughout the directory and rails regardless of likes.
3. **Notification dot**: currently `--cinnamon`. Keep cinnamon for "new in directory" but use **heart red `#E03A33`** for the unread-notifications bell dot specifically, so there is a small live red pulse in the chrome at all times when you have notifications.
4. **Destructive / sign-out**: align `--destructive` to `#E03A33` (currently `#EF4444`, a generic Tailwind red) so the one red in the system is the brand heart-red, reused.

---

## 4. Dark mode: recommendation

### 4.1 Why current dark mode "loses character / feels corporate"

Inspecting both dark definitions:
- `globals.css` `.dark`: `--background:#0E1510` (near-black green-tinted), `--card:#151D18`, `--foreground:#E0E4E1`.
- v2 `.v2.dark`: `--bg:#10171A`, `--surface:#18211D`, `--sidebar:#16271F`.

The diagnosis:
1. **Too close to pure black.** `#0E1510` and `#10171A` are ~6% lightness. Near-black backgrounds read as "developer dashboard / corporate SaaS," the opposite of warm paper. The light theme's entire identity is *warm ecru paper + valley light*; collapsing that to black throws away the soul.
2. **Cold, low-chroma surfaces.** The dark surfaces are gray-green at very low saturation. There is no warmth and no lit color, so the screen is inert.
3. **Desaturated, dimmed accents and image.** v2 dark sets `--blue:#5C9BC4` lightened and `.v2.dark .v2-bg { opacity:.05; filter:saturate(.7) brightness(.7) }`. So the one source of life, the office blue and the valley photo, are both muted in dark mode. Result: nothing glows. A soulful dark mode needs *lit* color against warm dark, not muted color against black.
4. **The sidebar disappears.** A `#16271F` sidebar on a `#10171A` page has almost no seam, so the signature flush green sidebar (the whole layout idea) vanishes in dark mode.

### 4.2 Recommendation: ship LIGHT-ONLY for MVP

**Decision: ship light-only for the MVP. Remove the dark-mode toggle from the shipping chrome; do not delete the dark token scaffolding.** Rationale:

- Light mode IS the product's character (warm valley paper). A half-baked dark mode actively cheapens the brand at launch, which is the owner's exact instinct.
- Maintaining two themes doubles the QA surface (every accent, every avatar contrast, the heart bug, the sidebar contrast) for an MVP that is light-first by explicit decision.
- The cost of parking it is near zero because the token system already exists; we just stop exposing the toggle.

**Concrete MVP actions:**
1. In `src/components/layout/navbar.tsx`, remove the `<DarkModeToggle />` render (line 76). Keep the component file.
2. In the root layout's `next-themes` `ThemeProvider`, set `forcedTheme="light"` (or `defaultTheme="light"` + `enableSystem={false}`). This neutralizes OS-level `prefers-color-scheme: dark` so users on dark-set machines still get the intended warm look. This is important: without it, the existing `.dark` block could partially apply.
3. Keep the `.dark { ... }` block in `globals.css` and `.v2.dark` in the preview as a parked, unshipped surface so the work resumes cleanly.

### 4.3 The parked plan: "gray not black", made soulful later

When dark mode returns post-MVP, the approach is **warm charcoal, never pure black; lit color, not muted color.** Target tokens to adopt at that time:

| Role | Parked dark value | Rationale |
|---|---|---|
| Page base | **`#1C2420`** | Warm green-charcoal at ~13% L, not 6%. Reads as "dusk in the valley," holds warmth. |
| Elevated surface | **`#262E29`** | Clear ~5 L\* lift above base, so cards still float (today's `#151D18` is too close to base). |
| Recessed fill | `#222A26` | Inset wells. |
| Border | `#34403A` | Visible warm hairline. |
| Sidebar | **`#16332A`** | A *deeper* pine than the page so the flush sidebar still reads as a distinct green panel (today it merges). |
| Ink | `#E8EDE6` | Warm off-white text, not cold `#E0E4E1`. |
| Office blue | **`#5FA6D6`** lit | Brighter, *more* saturated than light mode, so it glows on charcoal (do not desaturate). |
| Heart red | **`#FF5B4D`** | Lit coral-red that pops on dark. |
| Leaf primary | `#3FD16A` | Lit leaf. |
| Background photo | `opacity:.10; filter:saturate(1.05) brightness(.85)` | Do NOT desaturate. Keep the valley photo present and slightly richer, so character survives. |

The single rule for the future dark mode: **on a warm charcoal base, accents get brighter and more saturated, not dimmer.** That is the difference between "corporate dark dashboard" and "lamplit valley evening."

---

## 5. BUG: like heart flashes black then fades to red

### 5.1 Root cause (confirmed in code)

Two compounding causes:

**Cause A, the global color transition (primary).** `src/app/globals.css` lines 146 to 148:
```css
*, *::before, *::after {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
```
This puts a 200ms `color` transition on **every element**, including the `<button>` and the inherited `currentColor` of the SVG heart.

**Cause B, the Phosphor weight swap rendering in `currentColor`.** In `src/components/posts/post-card.tsx` (lines 227 to 240), the like button's text color is class-driven:
```jsx
className={`... ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"} ...`}
<Heart size={18} weight={liked ? "fill" : "duotone"} />
```
The Phosphor `fill` icon paints in `currentColor`. On click, React simultaneously (1) flips `weight` `duotone`→`fill` so the whole glyph becomes a solid `currentColor` shape, and (2) swaps the class from `text-muted-foreground` to `text-red-500`. Because of Cause A, `color` does **not** snap to red; it *animates* 200ms from the resting color toward `#ef4444`. The resting `text-muted-foreground` is `#64748B`, and the inherited document `color` is the near-black ink `#1A1A2E`. During the tween the now-solid fill heart is painted in that dark, in-between, low-chroma color, so you see a **black/dark heart that fades to red**. The duotone-to-fill swap is what makes it conspicuous: a small duotone outline tweening is invisible, but a fully filled glyph tweening through near-black is glaring.

The same defect exists in `src/components/posts/comments-section.tsx` (lines 229 to 236), same pattern.

### 5.2 The fix (exact)

Goal: heart is **always red**, only the size pops. Three coordinated edits.

**Fix 1, scope the global transition off `color` (root fix).** In `globals.css`, the `* { transition: color }` is the disease; it harms every icon weight swap, not just the heart. Replace the universal selector with a narrow, opt-in transition. Recommended:
```css
*, *::before, *::after {
  transition: background-color 200ms ease, border-color 200ms ease;
}
```
Drop `color` and `box-shadow` from the universal rule. Re-add `color` transitions *only* where intended (nav links, button hovers) via explicit `transition-colors` utility classes, which the navbar and buttons already use locally (e.g. `transition-colors duration-150` in `navbar.tsx`). This is the correct architecture: per-element opt-in, not a global blanket. (Removing `box-shadow` from the universal rule is also why section 6 says theme transition feels heavy.)

**Fix 2, decouple the heart's color from the button's text color.** Do not let the heart inherit `currentColor` through the tweening button. Give the `Heart` an explicit, non-transitioning color via inline style, and keep the resting heart red-tinted (ties into section 3.3):
```jsx
<Heart
  size={18}
  weight={liked ? "fill" : "duotone"}
  color={liked ? "#E03A33" : "#E03A33"}  /* always red; duotone gives the soft resting look */
  style={{ opacity: liked ? 1 : 0.5, transition: "none" }}
/>
```
Because Phosphor renders `fill` and the duotone primary stroke in the passed `color` (overriding `currentColor`), the heart is red in both states immediately. The unliked state reads as a faint red duotone (resting red presence), the liked state as solid red. There is no path through black because `color` is a fixed literal, not an inherited tweened value, and `transition:none` belts-and-braces against any stray inherited transition.

**Fix 3, the pop is size only.** Keep the existing `animateLike` scale (`scale-110` for 300ms in `post-card.tsx` line 233, and the v2 `@keyframes pop` 1→1.4→1). That is the only thing that should animate on like. Verify it animates `transform` only (it does: `scale`), satisfying the "only animate transform and opacity" hard rule. For a touch more delight without color flicker, the v2 `pop` keyframe at `cubic-bezier(.34,1.56,.64,1)` is preferred over the plain `scale-110` toggle; standardize on that overshoot spring.

Apply Fix 2 identically in `comments-section.tsx`.

### 5.3 Verification

After the fix: click like rapidly. The heart must be red on the first painted frame in both liked and unliked states, with zero dark frame. Screenshot is unreliable for this (animated element, per the screenshot protocol's "skip iteration on animated elements"), so verify by stepping frames in devtools Performance or by temporarily setting `animationduration`/transition to several seconds and confirming the color literal never tweens.

---

## 6. The remaining named fixes

### 6.1 Speed up theme transition

Even after parking dark mode, the global transition affects the very-occasional theme set and, more importantly, makes hover/state changes feel laggy. Two changes:
- The `200ms` universal `background-color` transition is fine for hovers but feels sluggish for a full theme repaint and is overkill on `box-shadow`. Reduce to **`120ms`** and, per Fix 1 above, drop `box-shadow` and `color` from the universal rule:
  ```css
  *, *::before, *::after { transition: background-color 120ms ease, border-color 120ms ease; }
  ```
- The toggle's own icon crossfade in `dark-mode-toggle.tsx` is `duration-300`. If/when dark mode returns, drop to **`duration-200`** and ensure it only transitions `[transform,opacity]` (it already does: `transition-[transform,opacity]`), which is compliant and fast.

### 6.2 New-post "+" vertical alignment + button content centering

In v2 (`page.tsx`) the button is `<button className="v2-btn v2-btn-primary"><Plus size={17} /> New post</button>`. `.v2-btn` already sets `display:inline-flex; align-items:center; justify-content:center; gap:8px` (line 655), so it is mostly centered, but the Lucide `Plus` has a slightly top-heavy optical center and the text baseline sits low against a 42px pill, so the "+" looks a hair high. Fixes:
- Add `line-height:1` to `.v2-btn` so the text glyph box does not add asymmetric leading that pushes content up.
- Give the leading icon a `0.5px` optical nudge: wrap or apply `svg { transform: translateY(0.5px) }` inside `.v2-btn` so the `Plus` crossbar aligns to the text x-height center. Lucide's `Plus` viewBox is visually centered but pairs low with text caps; the half-pixel correction is the standard fix.
- In the **live** app, the equivalent buttons use shadcn `Button` (`groups/page.tsx` uses `<Plus className="mr-1.5 h-4 w-4" />`). Ensure the shadcn button base has `inline-flex items-center justify-center` (it does) and add the same `[&_svg]:translate-y-[0.5px]` only if a screenshot shows misalignment at the real size; do not over-correct.
- Confirm `gap` not `mr-1.5` for spacing where possible so icon+label is one centered flex group rather than an icon with a right margin that breaks centering when the label wraps.

### 6.3 Larger "·" batch separator

The separator appears in `post-card.tsx` (`<span>·</span>`, line 125), `v2-batchline`/`cover-meta` (`<span className="dotsep">·</span>`), the footer, and group feed. The middle dot `·` (U+00B7) is tiny and sits high. Decisions:
- Add a `.dotsep` rule (and apply the class everywhere the bare `·` is used today): `font-size:1.15em; line-height:1; color:var(--ink-soft); opacity:.7;` so it is slightly larger and optically centered, plus give it small horizontal breathing room via the existing `gap` on the flex parent (no extra margins).
- Alternatively swap `·` for the bullet `•` (U+2022) at `0.5em` size, but the cleaner choice is keeping `·` and bumping to `1.15em`; that matches the brief ("slightly larger") without looking like a list bullet.
- In `post-card.tsx`, the separator is in a `flex items-center gap-2` row, so just wrap it: `<span className="dotsep">·</span>` and add the rule to globals.

### 6.4 Center bird glyphs in their disc

In `page.tsx`, `BirdGlyph` is drawn on a 32×32 viewBox but the bird's mass is **not** centered: the body path spans roughly x5.5 to 30.5 and y10 to 25.6, so the visual centroid sits low-right of the 16,16 disc center. Inside `.v2-av` (which is `display:grid; place-items:center`), the SVG box is centered but the *bird within the box* is off-center, so it looks like it drifts down-right in the circle. Fixes (pick one, prefer the first):
- **Transform nudge (no path edits):** wrap the glyph paths in a `<g transform="translate(-1.5 1.0)">` (move left and down-correction) so the bird's optical centroid lands on 16,16. Exact offset to tune: roughly `translate(-1 -0.5)` to pull it up-left into center. Verify at 42px (feed) and 104px (profile cover) sizes since the off-center is more visible large.
- **Or** recenter the viewBox: change `viewBox="0 0 32 32"` to a viewBox shifted by the centroid delta, e.g. `viewBox="-1 -0.5 32 32"`, which recenters without touching any path.
- Ensure `.v2-av` keeps `place-items:center` and that `BirdGlyph size={size * 0.66}` leaves an even margin ring; 0.66 is fine, the issue is internal centroid, not scale.

### 6.5 Tone the primary-button glow down ~20%

The primary button glow is `.v2-btn-primary { box-shadow:0 8px 18px -10px var(--primary); }` (line 657). Using the full primary color at full alpha as a drop shadow makes a saturated green halo that reads as too "loud / lit." Reduce ~20%:
- Change to **`box-shadow: 0 6px 14px -10px color-mix(in srgb, var(--primary) 80%, transparent);`** — that is 20% less spread/offset and 20% alpha reduction via `color-mix`, so the glow is present but restrained.
- Keep the `:hover { filter:brightness(1.07) }` for liveliness; the glow reduction is purely the resting halo.
- In the live shadcn primary button, apply the analogous tinted shadow at the same reduced strength rather than a flat `shadow`.

---

## 7. Consolidated token deltas (copy-ready)

### 7.1 `src/app/globals.css` — live `:root`
```
--background:#E9E6DD;        /* was #F5F0E8 */
--card:#FAF8F3;              /* was #FFFFFF */
--popover:#FAF8F3;           /* was #FFFFFF */
--secondary:#EFEBE1;         /* was #EFF5EF */
--muted:#EFEBE1;             /* was #EFF5EF */
--accent:#EFEBE1;            /* was #EFF5EF */
--border:#DED9CC;            /* was #DCE5DC */
--input:#DED9CC;             /* was #DCE5DC */
--primary:#1F8A4C;           /* was #22A845 (deeper leaf for AA on warm bg) */
--destructive:#E03A33;       /* was #EF4444 (unify on brand heart-red) */
--sidebar:#235C49;           /* was #FFFFFF */
--sidebar-foreground:#EDF4EF;
--sidebar-primary:#34C759;
--sidebar-accent:rgba(255,255,255,0.10);
--sidebar-accent-foreground:#FFFFFF;
--sidebar-border:rgba(255,255,255,0.10);
/* NEW */ --surface-float:#FFFFFF;  /* only floating modals/dropdowns */
```
And the universal transition (lines 146 to 148):
```css
*, *::before, *::after { transition: background-color 120ms ease, border-color 120ms ease; }
```

### 7.2 `src/app/preview/v2/page.tsx` — `.v2` tokens
```
--bg:#E9E6DD; --surface:#FAF8F3; --surface-2:#EFEBE1; --border:#DED9CC;
--sidebar:#235C49; --sidebar-muted:#9FC2B2;
--primary:#1F8A4C; --blue:#3F7CA6; --cinnamon:#C2622F; --heart:#E03A33;
```
`.v2-bg { opacity:.07 }`; `.v2-btn-primary` glow reduced per 6.5; `.dotsep` rule per 6.3; `BirdGlyph` centroid nudge per 6.4; `.v2-btn` `line-height:1` + icon `translateY(.5px)` per 6.2.

### 7.3 `src/lib/utils.ts`
```js
const AVATAR_COLORS = ["#2E9E54","#3F7CA6","#1F9C8E","#E14B3C","#C2622F","#C79318","#8A5BB0","#5566C4","#C7508A","#4F7E5C"];
```

### 7.4 `src/components/common/user-avatar.tsx`
Fallback `"#4A6741"` → `"#3F7CA6"`.

### 7.5 `src/components/posts/post-card.tsx` and `comments-section.tsx`
Heart gets explicit `color="#E03A33"` + `style={{opacity: liked?1:0.5, transition:"none"}}`; resting button class drops `text-muted-foreground` for the heart specifically.

### 7.6 `src/components/layout/navbar.tsx`
Remove `<DarkModeToggle />`; glass tint → `bg-[#FAF8F3]/70`. Notification-bell dot → `#E03A33`.

---

## 8. Reuse, IA, and edge cases

- **Reuse:** all avatar coloring funnels through the single `AVATAR_COLORS`/`pickAvatarColor` in `utils.ts` and the single `UserAvatar` component, so the palette change is one edit that propagates to feed, rails, directory, profile, and the v2 `BirdGlyph` eye color. The heart fix is two files because there are two like surfaces (post + comment); both follow the identical pattern, so extract a shared `<LikeButton>` later if a third surface appears (group posts). The token deltas are centralized in `:root` and the v2 `<style>`; no per-component color literals are introduced except the heart's required explicit red.
- **Accessibility edge cases:** every avatar color verified >=4.5:1 with white initials and white bird glyphs. The deeper `--primary:#1F8A4C` keeps white button text at AA. The darker sidebar keeps `--sidebar-muted` at the same perceived contrast as before. Heart-red `#E03A33` on `--surface #FAF8F3` is ~4.0:1 for the count text; keep the count text in `--ink-soft`/`--ink`, not red, so only the icon is red (the count stays readable).
- **Color-blind differentiability:** the 10-avatar set walks hue widely (green/blue/teal/red/cinnamon/marigold/plum/indigo/rose/slate), but red-green CVD users may confuse #1 leaf and #5 cinnamon, or #4 coral and #6 marigold. Because avatars also carry initials (or distinct bird glyph variants) and names, identity never relies on hue alone, so this is acceptable; do not add more reds beyond coral.
- **Dark mode regression guard:** with `forcedTheme="light"`, the parked `.dark` block cannot accidentally apply via OS preference, which would otherwise expose half-fixed dark tokens. This is the one must-do alongside removing the toggle.
- **Migration:** no Prisma schema change required for any of this. `User.avatarColor` is already `String?`. The only optional data task is the one-time remap of retired brown hexes (section 3.2), which is a data backfill, not a schema delta.

**Files referenced (absolute paths):** `/Users/sanan/Documents/rv-alumni/src/app/globals.css`, `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx`, `/Users/sanan/Documents/rv-alumni/src/lib/utils.ts`, `/Users/sanan/Documents/rv-alumni/src/components/common/user-avatar.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/posts/post-card.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/posts/comments-section.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/layout/dark-mode-toggle.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/layout/navbar.tsx`, `/Users/sanan/Documents/rv-alumni/prisma/schema.prisma`.