# Profile concepts, round 3 — build brief

Three new concepts for `/preview/delight/profiles`, written 2026-07-25 from the owner's
two rounds of feedback. The shipped profile is the blocker on launch; the owner has
said plainly they cannot tell us what they want, only what they like and dislike. This
brief converts that into rules.

Read this whole file before writing a line.

---

## 1. The hard rules (every concept, no exceptions)

These are all direct owner complaints about the shipped page. A concept that breaks
one of them has failed regardless of how it looks.

1. **No leaf watermark.** The big translucent leaf is gone. Owner: "That random leaf
   that is there, we don't need that. Everyone hated that." Do not replace it with
   another decorative glyph parked in dead space. If a region looks empty, fix the
   layout, do not garnish it.
2. **No dashed or dotted borders anywhere.** Solid hairlines only (`border-border`).
3. **No gradient fade from the photo into the card/white.** Owner: "feeding from the
   picture into white, that is just a definite no-go." Photos end at a clean edge.
4. **The photo must not be a magnified sliver.** Source frames are 3:2 (1200x800) or
   1:1 (900x900). The shipped page crops them into a ~6.4:1 band, showing ~24% of the
   frame at ~5x magnification. Give the picture a frame whose aspect is close to the
   source: portrait plate, square, or at widest 21:9. Always set an explicit
   `object-position` so the crop is art-directed rather than accidental.
5. **Hover never moves anything.** No `hover:-translate-y-*`, no `hover:scale-*`, no
   `whileHover` with `y` or `scale` on any control, tab, pill, or card. Hover is a
   colour/background change. `active:scale-*` press feedback is fine and wanted.
6. **About is the FIRST tab and the default tab.** Owner: "we definitely want about
   first, not posts", "I don't like that the about section requires another click."
7. **Email and phone are NOT on the surface.** They belong behind the "Get in touch"
   action. Owner: "I don't want the email and phone number to be as like right there.
   It doesn't have to be the first thing you see with your name. If people want to
   reach out, it should be there." So: reachable in one click, never printed next to
   the name.
8. **Valley years render as `2014-2023` with NO year count.** Never "9 years". Owner:
   "if we don't need nine years, everyone can freaking calculate a number of years."
9. **No nested vertical scrollers.** Nothing on the page may capture the page scroll.
   No `overflow-y-auto`, no `max-h-*` with scroll on a rail or a tag strip. A sticky
   column is fine (`position: sticky; align-self: start`) as long as it never scrolls
   internally. Owner: "when I scroll, it instead of scrolling the page, it scrolls the
   tags... gets cut out."
10. **No dead white space at any width.** Test at 1440 AND at 1920 fullscreen AND at
    390. Owner: "when you go to full screen, there's just a massive white space."
    A concept that centres one narrow column in an ocean of background has failed.
11. **No em dashes** anywhere in copy. Say "Rishi Valley", never "RV Connect".
12. **Do not invent features.** No "write them a letter", no follower counts, no
    "following". Both were called out as confusing and unwanted.

## 2. What the owner has explicitly said they LIKE — reuse these

- **The houses chain** (from Dossier): coloured house pills, an arrow between each,
  the year range on each. "I like this color of the houses... I think this is exactly
  the kind of thing we need." It must gracefully hold **ten** houses.
  **Use the shared `HousesTrail` from `./_houses-trail.tsx`** (already written). It
  lays the chain out as a serpentine: row 1 left-to-right, a 180 U-turn at the right
  edge, row 2 right-to-left, and so on, so no arrow ever points into empty space.
  This is the owner's own idea, implemented. Do not hand-roll a different chain.
- **The folder tabs** (shipped `profile-shell.tsx`): "the tabs that you click on is
  something that works." Reuse the clip-path folder-tab look, minus the hover lift.
- **"Find them"** social block from Dossier.
- **The admission-number stamp** from Dossier. Understated, never with a "#".
- **Clicking the bird avatar** (it chirps), **Save contact** (.vcf), **Get in touch**.
- **The big name** from Editorial. Serif, large, tight tracking.
- **Field guide's sense of life/colour** — but NOT its naming ("observations", "field
  notes" were called cringe) and NOT Latin binomials.

## 3. Layout requirement

Each concept ships **two genuinely different layouts**, not one layout that reflows:

- **Mobile (390):** a single column with a clear reading order. The owner's complaint
  about the shipped mobile view is that it has "no order to anything, there's just a
  bunch of different elements". Decide the order and make it obvious.
- **Desktop (1024+):** a real multi-column composition. Owner: "I don't want the wide
  version to just be the mobile version because that's gonna be a lot of white space.
  We can do so many more interesting things on a laptop."

## 4. The three concepts

Build exactly these. Each is a default-exported component taking `{ profile }`
(`ProfileVariantProps` from `./_data`).

### A. `passport` — "Passport", file `_variant-passport.tsx`

Identity-first. The Letterhead contact-card idea done as a real two-column page.

- Desktop: grid `[340px_minmax(0,1fr)]`, gap `var(--space-xl)`, page `max-w-[1240px]`.
  - **Left column** is sticky (`sticky top-6 self-start`, NO internal scroll):
    - The uploaded `coverPhoto` as a **portrait plate**, `aspect-[4/5]`, `rounded-2xl`,
      `object-cover`, `object-position: 50% 30%`. A portrait frame uses most of a 3:2
      or 1:1 source instead of a sliver. Hard edge, thin border, no fade.
    - The bird avatar overlapping the plate's bottom-left corner, clickable.
    - The admission stamp pinned to the plate's top-right.
    - Name (serif, ~30px, tracking -0.03em), then one meta line built with
      `[batch, city, profession].filter(Boolean).join(" · ")`.
    - CTA row: "Get in touch" (canopy pill) + ghost "Save contact".
    - "Find them" social pills.
  - **Right column:** folder tabs (About | Posts | Letters | Photos) + panel.
- Mobile: photo plate full width at `aspect-[3/2]`, then name block, then CTA row,
  then tabs. Houses trail sits in the About panel.

### B. `broadsheet` — "Broadsheet", file `_variant-broadsheet.tsx`

Newspaper. The "big writing and editorial" the owner liked, given a real grid.

- A masthead across the full content width: the name at 56-72px Libre Baskerville,
  tracking -0.035em, with the `coverPhoto` as a `21/9` hero (max-height ~300px,
  `object-position: 50% 35%`) framed with a hard edge and a thin cinnamon rule beneath.
- A "dateline" strip under the masthead: four facts in a row separated by **solid**
  vertical hairlines: Batch / In the valley / Based in / Admission. On mobile this
  becomes a 2x2 grid.
- Body: grid `[minmax(0,1fr)_300px]`. Main article column carries the tabs (About
  first). Right rail carries the houses trail, "Find them", and the contact actions.
- Mobile: name, photo, dateline grid, then the rail's contents ABOVE the tabs, then
  tabs. Never hide the rail on mobile, move it.

### C. `terrace` — "Terrace", file `_variant-terrace.tsx`

The warm, alive one. Colour comes from the surface, not from a giant photo.

- No photo banner. Instead the top band is a layered warm field: several low-opacity
  radial gradients in canopy/sky/cinnamon plus an SVG noise texture.
- The `coverPhoto` sits ON that field as a **square plate** (`aspect-square`,
  ~200-240px), very slightly rotated, with a real border, overlapping down into the
  content below like a photo left on a desk. No fade.
- Name and facts sit to the RIGHT of the plate on desktop, stacked below it on mobile.
- The houses trail is a hero element here, rendered at full width under the identity
  block. This is the concept where the trail gets to be the star.
- Below: asymmetric two columns `[minmax(0,1fr)_320px]` with tabs on the left.

## 5. Shared plumbing

- Register all three in `CONCEPTS` in `page.tsx`, appended after the existing five,
  so `?v=passport`, `?v=broadsheet`, `?v=terrace` deep-link for screenshots.
- Import `HousesTrail` from `./_houses-trail`.
- Import motion tokens from `@/components/common/motion` (`SPRINGS`, `FadeRise`).
  Never hand-type a `cubic-bezier(...)`.
- Use brand tokens only: canopy `--color-canopy`, leaf `--color-leaf`, cinnamon
  `--color-cinnamon`, sky `--color-sky`, `--color-mist`, `--card`, `--border`. No
  default Tailwind blue/indigo. The heart is always `#E03A33`.
- Spacing uses the LiftKit tokens (`var(--space-xs)` ... `var(--space-xxl)`), not
  arbitrary Tailwind steps. See `.claude/skills/liftkit-spacing/SKILL.md`.
- CTAs are `rounded-full` canopy pills. Cards are 16px radius; a box nested inside
  another box never shares its container's radius.
- Every clickable needs `hover`, `focus-visible`, and `active` states.
- Show a "Change photo" affordance on the picture (this is the owner's own profile
  view) so the upload slot is visibly designed, not implied.
