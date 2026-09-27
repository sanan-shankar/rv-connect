# Rishi Valley — Design System & Brand

**Status:** Canonical for brand + design language, as of 2026-07-02, last revised 2026-08-02 (the
state layer replacing the `--accent` hover, menu row height, and dark mode shipping). The live token source is
`src/app/globals.css`; this doc is the human-readable rulebook that explains what the tokens mean and
how to use them. The former `docs/spec/color.md` is folded into Appendix B below (no information lost).

A handful of points are tagged **(confirming)** — they came from owner answers that required
interpretation and are pending a quick sign-off in chat. Everything else is locked.

---

## 1. Name & voice

- **User-facing name is "Rishi Valley".** We drop "Alumni" everywhere the user sees it, because the
  community includes teachers and staff, not only alumni. **(confirming)**
- **"RV Connect"** is internal/developer shorthand only — never shown to users.
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
| Secondary | `#EAE7DC` | Quiet filled controls (`--secondary`). Deepened from `#F0EDE4` on 2026-08-02: at the old value the composer's trigger pill measured dL* -1.77 against the paper card it sits on, under the ~2 just-noticeable threshold, so the owner saw "no contrast" between the pill and the tile. `#EAE7DC` is -3.92 on paper and still +2.14 on the page, so one token reads as a filled control in both places. |
| Accent | `#FAF8F2` | The opaque surface rung just under Float. **Not the hover token** (see rule 2). |
| State tint | `rgb(30 28 22 / .06)` hover, `/ .11` press | `--state-hover` / `--state-press`: the one hover and press treatment, applied through the `state-layer` utility. `--state-ink` flips to white in `.dark`. |
| Border | `#DFD8CB` | Hairlines / input borders. |

### The surface ladder (colour protocol, 2026-07-30)

The opaque neutrals are a single ladder, bottom to top:

```
background #E4E1D5  <  secondary #EAE7DC  <  mist #ECE8DD  <  paper #F5F2EA  <  accent #FAF8F2  <  float #FFFFFF
   page        quiet filled controls    recessed wells     cards/content     top opaque rung     menus/dialogs
```

Secondary and mist swapped places when secondary was deepened on 2026-08-02, and they now sit 0.43
dL* apart, which is not a visible step. Treat them as one register split by ROLE, not by lightness:
secondary is something you press, mist is something you read into. The ladder's real span is page →
paper → accent → float.

Hover and press are NOT on this ladder. They are a layer laid over whatever rung a control sits on;
see rule 2.

Why a ladder: the pre-protocol palette had FOUR token names resolving to one hex
(`--secondary` = `--muted` = `--accent` = mist `#EEE8DA`), so idle chips, hover states and
recessed wells all converged on one ochre and a hover turned a control into the same tan as the
well beside it. (The fault there was the CONVERGENCE, not the direction. A hover is allowed to
deepen a surface, and since 2026-08-02 it always does on light; what it may never do is land on
another named surface's colour.) Roughly 300 of
430 production background usages were the warm-tan family. That convergence, plus the photo
wash, is what read as "everything brown". The owner's calibration (revised 2026-07-30, after
finding iPhone True Tone had been exaggerating the yellow): all-white is a 0 (corporate,
characterless), the old state a 10; the right zone is **5-9** and the app sits at ~7. Warmth
IS the identity - the cure for drab is CONTRAST (a hover you can actually see, white floats, rationed wells),
not further de-warming. Do not cool these tokens again without an owner ask; verify any
future "too warm/too cool" report against a reference display first (True Tone / Night
Shift off).

**The rules** (each enforceable in review):

1. **Warmth lives at the bottom.** The page base and the valley-photo wash carry the boutique
   warmth. Surfaces get *cooler and lighter as they rise*. A floating surface (menu, dialog,
   popover) is Float white - that contrast is deliberate relief, not a bug.
2. **Hover and press are a STATE LAYER, not a rung of this ladder** (rewritten 2026-08-02).
   Interactive hover and press are a translucent ink tint composited over whatever surface the
   control already sits on - `--state-hover` / `--state-press`, applied through the `state-layer`
   utility - never a swap to a different opaque token.

   This rule used to say the opposite ("hover lifts, never sinks; hover is `--accent`"), and that
   is the rule that broke every menu in the app. One opaque hex cannot serve as hover across
   surfaces that span ~10 dL*. Measured against the shipped values, `--accent #FAF8F2` landed at
   +8.12 on the page, +5.55 on mist, +3.83 on secondary, +2.06 on a paper card, and **-2.42 on
   Float white**. On Float there is no rung above, so the hover INVERTED and vanished ("hovering
   over all menus now has disappeared"), and on a card it sat right at the ~2 just-noticeable
   threshold ("the most subtle highlight I've ever seen in my life"). Both are the owner's words,
   2026-08-02, and both are that table rather than a slip in one component.

   A translucent tint composites over its own backdrop, so ONE token lands between -4.19 dL*
   (page) and -4.72 dL* (float): a spread of 0.53 instead of 10.5, and it cannot invert.
   **Direction is no longer the rule. CONSTANT PERCEPTUAL WEIGHT is.** On light the layer deepens
   the surface; on dark `--state-ink` flips to white and it lifts (+5.19 to +6.27 dL*), because an
   ink tint on charcoal is no change at all. Press is the same tint at roughly double strength
   (~-8 dL*), so a press always reads deeper than the hover it came from.

   Banned: `hover:bg-accent`, `hover:bg-muted`, `hover:bg-secondary/70`, or any other opaque-token
   hover swap. The one exception is a SEMANTIC wash (the red on a destructive menu row), which
   carries meaning rather than weight. Two known limits of the utility, both deliberate: an
   element that already paints a gradient needs a bespoke hover (`state-layer` uses
   `background-image` and would clobber it), and the change lands on the first frame rather than
   fading, which is how a native menu highlights.
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

### Focus states (rewritten 2026-08-29; the old two-line stub was executed on one component and ignored by the rest)

One colour — Leaf, the `--ring` token — and exactly three treatments, chosen by what the
element is. Never a fourth. All on `focus-visible:` (browsers treat text fields as always
focus-visible, so fields light on click AND keyboard with the same pseudo-class).

1. **Text fields** (every one: Input, Textarea, Select, the combobox shell, the composer's
   contentEditable, the comment pill, the support amount, the float family): ONE constant,
   `FIELD_FOCUS` in `ui/field-focus.ts`, chosen by the owner from `/lab/focus` (column A)
   and pinned by `focus-recipe.test.mjs`, which walks every file that renders a text
   field. What it does: **click or tap** tints a bordered box's border leaf and leaves the
   mist floating-label shell alone (its label rising is the state; the 2026-08-14 "no
   green outline on boxes" ruling, kept exactly); **Tab** gets one solid 2px leaf edge
   hugging the box (border + 1px inset ring, one line). The split rides on
   `html[data-modality]`, set by `<FocusModality>` in the root layout, because
   `:focus-visible` cannot tell a clicked text box from a tabbed one. Never a half-alpha
   halo ("the thin ring and the thick ring"), never an offset ("separated from the box").
   Invalid composes on its own properties: red border + red inset ring, and stays red
   while focused.
2. **Fields with no box** (the profile pen's underline, a search line in a popover
   header, a year digit in a grouped row): nothing to light; the caret and the container
   are the state. The test's BORDERLESS list names each one with its reason.
3. **A surface with its own accent rescopes the colour, never the recipe.** The Support
   card runs on sky, so it sets `[--ring:var(--sky)]` once on its root and every focus
   treatment inside (the amount field, the button's Tab ring) turns sky (owner,
   2026-08-30: "I do like the idea of making this one blue"). It is the RAW `--ring`
   token: `tailwind-theme.css` declares `@theme inline`, so `ring-ring` and `border-ring` compile
   to `var(--ring)` directly and there is no `--color-ring` at runtime to override.
   No surface writes its own focus classes to get a colour.
3. **Controls** (buttons, links, menu triggers, anything without a glow-able border):
   `outline-2 outline-offset-2 outline-ring`, with `outline-solid` (Tailwind v4 zeroes
   the style under `outline-none`; without solid the ring is invisible). The offset gap
   is transparent, which is what lets one leaf ring sit on any fill — no per-variant
   ring colours, ever (the button zoo of canopy/red rings was removed).

Forced-colors survival: box-shadow rings vanish in Windows High Contrast, so treatment 1
carries `focus-visible:outline-solid outline-2 outline-transparent` — invisible normally,
recoloured to a visible system colour there. Treatment 3 already uses outline and needs
nothing.

### Dark mode

**Shipped 2026-08-02.** `.dark` is a real token block in `globals.css`, written from a blank sheet
on 2026-07-30 (the old scaffold was deleted on owner instruction, "pretty garbage", and nothing
descends from it). It sits behind the deliberately funny multi-step confirmation flow in settings
(easy to turn OFF, theatrically hard to turn on) with a payoff transition. The per-request theme
comes from the `rv-theme` cookie, mirrored from `User.theme`, so SSR paints the member's choice with
no flash; `enableSystem` stays off, because dark is only ever entered through that settings flow.
**`forcedTheme="light"` is gone.** Do not reintroduce it, and do not treat "the app is light only" as
current anywhere.

The constraints held: warm charcoal, never pure black (page `#1C2420`, every neutral keeping a
G >= R > B cast); the heart and destructive red stay `#E03A33` in every theme; accents that render as
small text get brighter, so leaf lifts to `#3FD16A` and sky to `#5FA6D6`, while canopy, cinnamon and
the primary CTA fill are byte-identical to light. The surface ladder holds in an inverted register:
rungs get lighter as surfaces rise, and "float" becomes the lightest charcoal in the room (`#333D37`)
because pure white is impossible here.

**Owner reversal, 2026-08-02: the sidebar DOES change in dark.** Verbatim: "initially I said I didn't
want the sidebar to be affected during dark mode. that was a wrong decision. sidebar should be dark
but I'd like to keep the green colour somewhere there." The dark sidebar is a charcoal rail
(`--sidebar #141B18`) at dL* -4.33 BELOW the page, which makes it the one surface in the app that
sits under the page rather than above it; that is what keeps a flush rail reading as its own plane
once everything is dark. Canopy `#235C49` survives as the ACTIVE ROW, unchanged from light mode:
white on it is 7.78:1, it sits dL* 26 above the rail so it reads as genuinely lit, and it introduces
no new hex. The green that used to BE the sidebar now marks your place in it. The cinnamon left edge
is kept in both themes. Anyone who finds an older note saying the sidebar stays Canopy in dark is
reading the decision the owner reversed; do not restore it.

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
  (The feed composer's resting pill used to be the exception here. It is gone since 2026-09-14:
  the composer opens from the New post badge, the member's own bird with a canopy plus, in the feed
  header. `src/components/feed/new-post-cta.tsx`.)
  **Second input material (calm forms, 2026-08-14):** the signup flow's fields are 56px,
  **mist-filled and borderless**, with the label floating inside the box (`FloatField`,
  `src/components/common/float-field.tsx`; owner reference: Revolut's one-text-per-box form).
  Definition comes from the mist fill (+2.6 dL* on the page, a well you type into) and the one
  leaf focus ring, not a hairline — do not "fix" a border back onto these. First cut used paper
  and the owner read it as "the white typing box"; paper is a card surface, not a field. Use this
  material when the page IS a form (the auth steps); the bordered 40px `Input` stays the default
  inside cards and settings rows.
- **Avatars: full circle.**

### The radius ladder (shape protocol, 2026-07-30)

One ladder, three rungs down from the card, everything derived from `--radius: 1rem`:

| Rung | Token | Value | What sits here |
|---|---|---|---|
| Container | `--radius` (`rounded-lg`) | 16px | Cards, tiles, the composer shell |
| Nested | `--radius-md` | 12px | Photos inside a card, the letter-preview outline, inner panels; also every input (`--radius-input`, same 12px) and menu panels |
| Thumbnail | `--radius-sm` | 8.8px | Small media (80px previews), the viewer photo, third-level boxes |
| Control | `rounded-full` | pill | Buttons, chips, tags, the New post badge |

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

- **Surface:** Float, via `--popover` (`#FFFFFF` on light, the lightest charcoal `#333D37` on dark),
  `--radius-md` 12px panel, 4px inner padding, the layered ink-tinted shadow (`.card-elevated`
  register), hairline border.
- **Rows:** highlight = the `state-layer` tint (never an opaque-token swap, never a green wash),
  radius 8px (concentric: 12 − 4), full-width, and their NATURAL height, ~28px (`py-1` on a 20px
  line box). The `min-h-9` floor that this spec used to mandate as "36-40px tall" is reverted
  (2026-08-02): it made the sidebar account menu 40px taller than the contents it holds, and the
  owner's verdict was "before it was nicely sized ... the last few updates have made it really
  stretched". A menu is sized by what is in it. If a touch target ever has to grow, grow the
  PADDING so the panel stays proportional; never put a floor on the row.
- **How the highlight is applied:** Base UI marks the highlighted row with `data-highlighted` and
  keeps DOM focus on the popup, so it never moves focus onto a row. The inherited shadcn/Radix
  idiom `focus:bg-*` therefore matches nothing on these rows and lit up for nobody. `state-layer`
  keys off `:hover`, `[data-highlighted]`, `[data-open]` and `[data-popup-open]` for exactly this
  reason. Never write a `focus:bg-*` highlight on a menu row.
- **Placement:** opens BELOW its trigger, aligned to the trigger's leading edge, 6px offset,
  flipping only when the viewport forces it. Never centred-under-nothing, never a different
  edge on a different page.
- **Motion:** one origin animation — scale/fade from the trigger corner on `EASE_POP`,
  ~140ms, exit faster than enter. No slide-downs on one page and pops on another.
- **The item level (2026-08-29).** Destructive items sit LAST, in red, with a
  `DropdownMenuSeparator` above them — the gap is the warning (Apple and Carbon both
  specify it; Carbon: divider-separated, "below the primary set of actions"). Labels are
  bare verbs or verb+noun, sentence case, never a parenthetical role note ("Remove (admin)"
  is what this rule replaced). A destructive menu item never acts directly: it opens
  `ConfirmDialog`. Icons in a menu are all-or-nothing per group (Apple, June 2026: "provide
  icons for all menu items in a group, or none of them"). Bare-glyph "..." triggers wear
  `MENU_TRIGGER_HIT` (menu-material.ts): drawn small for a cursor, silently 44px for a
  thumb — Primer's 24-fine/44-coarse split, the one system that writes it down.
- **Enforcement:** these live in the shared primitives (`ui/dropdown-menu`, `ui/select`,
  `ui/popover`, `pill-shell`); a page may not override radius, colour, offset or animation.
  If a surface needs something a menu primitive can't do, it isn't a menu.

### Dialogs: one material (2026-07-30)

Owner: "edit post, report post, get in touch, flag person all have different styles even
though they should be reusing the same template... report is the closest." So the report
register IS the template, and it lives in exactly one file - `src/components/ui/dialog.tsx`:

- **Backdrop:** constant warm-ink tint (`#241a12`/55) + blur; only OPACITY animates, so the
  fade reads as the background gradually blurring. 220ms in, 180ms out.
- **Panel:** Float `#FFFFFF` (the one sanctioned pure-white surface), 20.8px floating-modal
  radius, hairline border, layered ink shadow, `max-w-sm`, 16px padding. It enters a beat
  (80ms) after the backdrop - rise 12px + scale from 0.94 on the spring curve - and exits
  immediately (no delay), so closing never lags. X close button top-right, always, and it is
  `MODAL_CLOSE`: a bare X, muted ink that darkens on hover, 44px to a thumb. It was a 32px
  filled circle (the iOS sheet close) until the owner, 2026-09-27: "I don't know why we do it
  just have a normal x". No disc, no tan patch behind it, on any dialog or sheet.
- **Anatomy:** `DialogTitle` (`MODAL_TITLE`: heading face, 18px regular; the face ships 400 and
  700 only, so the old "16px medium" was 400 all along) + `DialogDescription` (14px muted) +
  content + ONE footer shape: a right-aligned Cancel-then-action row. No recessed footer
  trays, no full-width buttons, no per-dialog title sizes. Inner boxes step down the radius
  ladder (12px inputs/tiles inside the 20.8px panel). Button *variants* carry the semantics
  (primary / destructive); the layout never changes per dialog.
- **Sections are separated by space, never a hairline (2026-09-08).** The menu rule above
  puts a `DropdownMenuSeparator` over a destructive item, and its own stated reason is that
  *the gap is the warning*: a menu row is flush against its neighbours, so a line is the
  only gap available. A dialog row already has 16px around it and its controls are outlined
  pills, so a `border-t` there is a third horizontal edge between two button borders. It is
  also not what the line rule is copied from: iOS draws hairlines BETWEEN rows inside one
  grouped container, inset from the leading edge, and separates the groups themselves with
  whitespace — never a full-bleed line between two standalone buttons. Widen the gap
  instead. The keeper settings dialog is the worked example: 24px above the Pause/End
  group, 12px inside it, no rules drawn.
- **Two text levels, and the second must earn its place (2026-08-29).** A dialog is a
  title plus at most one description line — no system on earth permits more (Apple: title
  + optional informative text; M3 marks even the *headline* optional; five levels has no
  precedent anywhere). The description exists only if it changes which button you press
  (Carbon's test: title "Edit object", purpose to edit an object → no description). Never
  restate the title in the body, never explain the buttons, never describe input methods
  the UI below already shows — that inversion (an sr-only title behind a 22px paragraph
  listing "drag and drop, browse or paste") is what made the contribute dialog feel wrong
  before anyone could say why. The one place the methods ARE named is inside a drop box, as its
  own second line, on a machine with a cursor: the Collection's reads "Drag and drop, paste, or
  click to browse" (owner, 2026-09-27: "I just click on it. I don't know that I can drag and
  drop and copy paste"). Left-aligned; centring is for a short icon-anchored block
  only (M3: centre WITH icon, start without).
- **Dialog copy (2026-08-29; the research is in docs/planning/dialog-*-research.md).**
  Statement titles naming the object ("Delete post", never "Are you sure?" — banned by
  every system that mentions it). Sentence case, no terminal punctuation, no exclamation
  marks in functional UI. Buttons are the verb, one or two words, never Yes/No/OK/Done;
  the same verb for the same act everywhere (a menu's "Remove post" opens a dialog that
  says remove, not delete). Consequence lines are uncontracted ("This cannot be undone" —
  GOV.UK: negative contractions get misread as their opposite) and appear only on
  genuinely irreversible acts. Destructive confirms: Cancel left, red action trailing,
  nothing auto-focused so Enter cannot destroy; typed confirmation only where a mis-click
  is unrecoverable (asking otherwise "is theatre" — confirm-dialog.tsx). Warmth budget:
  one warm line per surface, spent on a title or success state, never on buttons, errors
  or anything destructive (owner: dial from 7.5/10 to ~4.5 — "don't strip it and make it
  a corporate app. but use it smartly").
- **Short interactions only.** A dialog is for something done in seconds (report, flag,
  contact, a quick edit). Anything immersive (writing a letter) gets a page, not a dialog.
- **Bottom sheets are the same material (2026-09-15).** Anything that rises from the foot of
  the screen is `BottomSheet` in `ui/sheet.tsx`, never a hand-rolled panel and never a
  per-surface header: the title (`MODAL_TITLE`) at the leading edge, `MODAL_CLOSE` at the
  trailing one, no hairline under the title, a footer on the sheet's own surface (the old tan
  tray read as a brown smear behind the button), the dialog's 20.8px radius on the top edge.
  It closes four ways: the X, the scrim, back, and a swipe down that starts anywhere nothing
  under the finger is scrolled (owner, 2026-09-09 and 2026-09-15). Filters on the Directory
  and the admin lists, the guide, the house picker, a Catch-up's Settings and People all use it.
- **Enforcement:** every modal imports from `ui/dialog`. `aria-modal` appearing anywhere
  else is an audit violation (the full-screen image viewer is the one exception - it is an
  experience, not a dialog).

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

- **Animations always play**, and this is a decision about the people who use this site rather than
  a default nobody got round to changing. Asked on 2026-09-07 whether the two surfaces that still
  check the OS setting should go still for a member who has it on, the owner refused outright:
  *"reduce motion shouldn't be considered anywhere. I know these people. they'd want to see these
  fun things. don't make anything boring because they have rduced motion on."*
  So: never gate motion on `prefers-reduced-motion`, anywhere, and a new surface never asks. The one
  thing that pauses motion is the browser tab being hidden, and `useMotionGovernor`
  (`src/components/common/motion.tsx`) is the only place that decides it. Its `ambientReduced` field
  is permanently false and exists as the seam for an in-app toggle he might one day ask for; it must
  never be wired to `matchMedia`.
  **Zero shipped files check the OS setting.** Three did when that answer was given, all written
  before it: `landing/footer-hoopoe.tsx` (which argued in its own comment that it was a scoped
  exception), `mascot/moments/not-found-stage.tsx` (the click flight teleported instead of arcing)
  and `landing/showcase-shot.tsx` (the parallax). Asked whether they should come out too, he said
  *"make them animate for everybody"* (2026-09-08), and they did. **The count is the rule**: if a
  grep for `prefers-reduced-motion` outside a comment ever returns a hit again, that is a
  regression, not a new exception.
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
- **Loading:** every async route ships a loading state, using the **warm shimmer** (not the grey pulse),
  and it is the page it stands in for rather than a sketch of it (2026-09-21, owner: "make them perfect on
  all pages"). The rules, each one measured against the real page at 1440 and 390:
  - **Frames and fixed words are drawn as they are.** Cards, sheets and borders are real; so are the words
    the page never changes: the title through the real `PageHeader`, section and form labels, a stat's
    label. The title is what says where the click went, from the first frame.
  - **What is fetched or pressed is a placeholder at its own box.** `ButtonSkeleton` is the real Button with
    its label set invisible, so it is the button's exact width at every breakpoint; `TextSkeleton` is a bar
    as wide as its words; a bar sits inside its text's real line box rather than standing in for it.
  - **Words that rise in on arrival get placeholders**, even fixed ones (a gauntlet step, the lab index):
    drawn now, they would vanish and rise again.
  - **Draw what is always there, not what might be.** A queue that is usually empty draws its empty line;
    a drafts strip nearly nobody has is not drawn.
  - **Share the real parts rather than copy them.** The page's own constants and grids are imported
    (`RAIL_GRID`, `CARD_FRAME`, `ADMIN_GRID_3`, the letterhead's sheet); a wait that happens twice draws one
    component (`PostCardSkeleton` for the feed's two); a page that is nearly all fixed words renders its
    own shell with the live parts swapped for placeholders (`SupportShell`).
  - `skeleton-words-rule.test.mjs` fails if a skeleton draws a word no page says any more.

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

## 10. Mobile-first (2026-08-29)

Most sessions design against a 1440px screenshot first and check mobile after, because that's the
screenshot already open. The owner's estimate is 60% of members are on a phone. Design and build for
the phone first; confirm the desktop version reads just as well, not the other way round. A pattern
that would be caught here was found live in the app on 2026-08-29: a form field that stole focus on
open, a touch tap that fired three state changes instead of one, a fixed footer padded for a screen
with no home indicator.

- **Never open the keyboard uninvited.** A text field should gain focus only when someone has asked to
  type, never just because a panel opened. This is a solved problem, not a per-component judgment
  call: `useDeferredAutofocus` (`src/components/common/use-deferred-autofocus.ts`) gates any
  `autoFocus`-shaped need behind `(hover: hover) and (pointer: fine)`, and Base UI's own Popover/Dialog
  primitives already refuse to focus a field on a touch open by default — so the actual bug is usually
  a raw `autoFocus` prop *fighting* that default, not a missing feature. Never add `autoFocus` to a
  field inside a popover, sheet, or dialog without checking one of these two mechanisms first.
- **A tap is one state change, not a sequence.** `pointerenter`/`pointerleave` are a mouse's hover
  vocabulary; routing touch through them produces exactly the enter → leave → click flicker a real
  tap fires in that order. Gate hover handlers to non-touch pointers (`e.pointerType !== "touch"`) and
  let touch answer to `click` alone.
- **Fixed bottom bars pad for `env(safe-area-inset-bottom)`**, not a guessed flat value — the root
  layout already opts into `viewport-fit=cover`, so that inset is real screen the home indicator sits
  over. Pattern: `style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}`.
- **44px is the finger, not the eye.** A control's visible size can stay small; its hit area (padding,
  not a bigger icon) must reach 44px, the same way `<GuideDoor>` grows its tap target with `py-[7px]
  -my-[7px]` rather than a bigger glyph.
- **Screenshot mobile first**, not last. The Hard Rules already require both viewports for every
  desktop UI change; treat the 390×844 shot as the one that decides whether the work is done, and the
  1440 shot as the confirmation.

---

## How to use this doc

Before building any UI, read this file plus the relevant `docs/spec/*` for the feature. After building,
run `npm run check`: it runs the ESLint design rules and `scripts/qa/protocol-audit.mjs` (plus types, the
lab registry and the unit tests) and reports in one table, so drift gets caught before it ships rather
than fixed by hand afterward.

The design rules are deliberately `warn`, never `error`: they nudge, they never break the build. That is
why they need a gate somebody actually runs. This paragraph used to cite "ESLint rules + PR template";
the PR template was deleted on 2026-08-08 and ESLint was, in practice, never run, which is how a
hand-typed easing curve reached the shared `Button` and `bg-white` reached the landing hero with three
separate documents forbidding both.

---

## Appendix A: Subject & motifs (design fuel)

Krishnamurti's valley school in Andhra Pradesh. Motifs: the ancient banyan, Rishi Konda hill,
bird-watching (hoopoe = founder's favourite bird; parakeets), rocky scrub-valley landscape,
hand-loom textiles, contemplative minimalism, study under trees, houses (e.g. "Krishna").
Aesthetic target: boutique, intimate, naturalist field-journal, NOT Instagram-for-the-masses.

## Appendix B: Avatar palette + the dark palette

**Avatar / disc palette** (10 colours, assigned deterministically by hash; all ~AA against white glyphs):
Leaf `#2E9E54`, Office blue `#3F7CA6`, Teal `#1F9C8E`, Coral `#E14B3C`, Cinnamon `#C2622F`,
Marigold `#C79318`, Plum `#8A5BB0`, Indigo `#5566C4`, Rose `#C7508A`, Forest slate `#4F7E5C`.

**Heart:** the shared `LoveButton` hardcodes `#E03A33` with `transition: none` so it never flashes
black on the fill-weight swap (the old bug, now fixed by extraction).

**Dark mode palette** (shipped 2026-08-02; the `.dark` block in `globals.css` is the live source and
wins over anything transcribed here). Page `#1C2420`, card `#262E29`, recessed `#212925`, float
`#333D37`, border `#34403A`, ink `#E8EDE6`, sky `#5FA6D6`, leaf `#3FD16A`. The rule behind the values:
warm charcoal, never pure black, and accents get *brighter* on dark, not dimmer.

Two owner calls to keep straight, because one of them supersedes the other:

- **The heart stays `#E03A33`** in every theme (2026-07-30). The `#FF5B4D` bright variant is
  rejected; brand colours do not shift.
- **The sidebar DOES go dark** (2026-08-02). This REVERSES the 2026-07-30 note that said the sidebar
  does not change in dark, in the owner's own words: "that was a wrong decision." The shipped rail is
  `#141B18` with Canopy `#235C49` as the active row; the once-parked `#16332A` was never the answer
  either. Section 2's Dark mode block carries the reasoning and the contrast numbers.
