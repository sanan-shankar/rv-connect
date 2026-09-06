# Research digest: overflow menus and input focus states

2026-08-29. Distilled from primary sources (Apple HIG incl. the June 2026 menu-icon update,
Material 3, Carbon, Fluent 2, Spectrum, Polaris, Atlassian, Primer, Radix, shadcn source,
WCAG 2.2 normative text, GOV.UK's actual _focused.scss). Companion to
`dialog-standards-findings.md` (codebase evidence) and `dialog-standards-research.md`
(destructive dialogs + copy). Apple is the tiebreaker; departures from Apple are called out.

## Menus ("more" / overflow / context)

### Where the field agrees

- **Destructive items: red text, at the end, separator above.** Apple: "list them at the
  end of the menu... The system can display a destructive menu item using a red text
  color." Carbon mandates the divider: significant-change actions "are separated by a
  divider and live below the primary set of actions." Primer: "Place danger items at the
  end of the list." (Carbon's red-fill-on-hover variant is the lone dissent on colour.)
- **A destructive menu item leads to confirmation, not straight to the act.** Apple: the
  system confirms via action sheet "because an action sheet appears in a different location
  from the menu and requires deliberate dismissal, it can help people avoid losing data by
  mistake." Primer: "For destructive or irremediable actions, show a confirmation dialog
  for extra friction. If the action is not destructive, present the user a way to undo the
  action instead." This chains directly into our ConfirmDialog standard.
- **Icons are all-or-nothing within a group.** Apple (June 2026): "provide icons for all
  menu items in a group, or none of them," and "Don't display an icon if you can't find one
  that clearly represents the menu item." Primer states the same rule. Nobody licenses a
  mixed menu.
- **Order by frequency, dangerous last** (Apple, Carbon, Fluent all say versions of this).
- **Keep menus short.** Apple: no more than ~3 groups; a menu of 1-2 items should probably
  be a plain button ("listing a minimum of three items can help the interaction feel
  worthwhile"). Carbon: ≤12 items overflow, &lt;5 for menu buttons.
- **Hit targets:** WCAG AA floor is 24x24; Apple's default is 44x44pt on touch. Primer is
  the only system that formalises the split: 24 fine pointer, 44 coarse. Do that.

### Where the field disagrees, resolved for this app

- **Container radius:** 4px camp (Material, Fluent, Spectrum, Polaris) vs 8px camp
  (Atlassian "cards and dropdowns", shadcn, Radix size-2). Apple publishes none for web.
  **Resolution: stay on the app's radius ladder** — a menu is a floating card, so it takes
  the same token our popovers take; do not invent a menu-only radius. (shadcn base we build
  on is 8px container / 6px item, which is inside industry range.)
- **Item height:** field runs 24-48px; **32px is the modal default** (Carbon sm, Fluent,
  Polaris, Spectrum md, Radix size-2, shadcn, Primer md) with 44px hit target on touch via
  padding/pseudo-element, per Primer's coarse-pointer rule.
- **Icon position:** Apple trails icons; every other system leads. **Departure from Apple,
  stated:** leading icons are the web convention our members' eyes are trained on, and a
  trailing icon in a left-aligned LTR menu breaks the scan line the label sets up.
- **Icon size:** 16px in a 14px-text menu (Carbon and shadcn agree; Lucide's grid).
- **Max width:** Fluent's 300px hard cap is the sanest published number; long labels are a
  copy bug, not a layout problem.

### The Apple warning that matters most for us

"Although people generally understand that a More button offers additional functionality
related to the current context, **the ellipsis icon doesn't necessarily help them predict
its contents.**" — i.e. the real design question for our post-card "..." is what goes IN it
versus what stays outside as a first-class control (Like, Comment, Save are already
outside; that instinct was right). A menu is where actions go when they don't earn a
button, not a junk drawer.

## Input focus states

### The requirements (what actually binds us)

- AA: a visible indicator exists (2.4.7); resting borders that identify the control hit 3:1
  against surroundings (1.4.11 — grey #767676 on white passes, #AAA fails); 24px targets.
- AAA (aspirational, cheap to hit): 2.4.13 — indicator area ≥ a 2px perimeter of the
  component, with ≥3:1 change between focused and unfocused states. A 3px ring trivially
  passes. An inset indicator must be ≥3px.

### The technical verdicts

1. **box-shadow rings vanish in Windows High Contrast / forced-colors mode.** MDN: box-shadow
   is forced to none; outline survives (recoloured). Every ring-based system that doesn't
   pair a transparent outline (shadcn, Primer form inputs, Tailwind `ring`) silently loses
   its focus indicator there. GOV.UK is the only surveyed system whose source carries the
   fix as a commented decision: `outline: 3px solid transparent` — invisible normally,
   becomes a visible system-colour outline in forced-colors.
2. **Never change border-width on focus** — layout shift. GOV.UK thickens via inset
   box-shadow for exactly this reason ("we avoid changing border-width as it will change
   the element size").
3. **`:focus-visible` on a TEXT INPUT fires on mouse click too.** MDN: "when a text box
   needing user input has focus, focus is indicated" — browsers treat text-entry widgets as
   always focus-visible, because the user is about to type. So the dilemma our input.tsx
   comment records (plain `focus:` so mouse and keyboard light it alike) dissolves:
   `focus-visible:` gives identical behaviour on inputs/textareas AND the correct
   keyboard-only behaviour on buttons. One pseudo-class everywhere, no compromise.
4. **Error and focus live on different CSS properties so they compose** — every surveyed
   system does this (error = border colour, focus = ring). shadcn's layering is the model:
   invalid border + faint invalid ring at rest, full ring geometry recoloured when focused.

### The canonical treatment this yields (draft, pending owner approval)

One focus recipe for every field-like control (Input, Textarea, Select trigger, comboboxes,
the FloatArea family), replacing the current three-way split:

- `focus-visible:` (not `focus:`) — per verdict 3, identical UX on text fields, better on buttons
- border turns `ring` colour + a **3px ring at 50% alpha hugging the border, no offset** —
  i.e. exactly what `input.tsx` already ships, which the owner already approved in an
  earlier round ("bigger than the box outline" complaint) — now promoted from one
  component's fix to THE treatment
- plus `outline: 2px solid transparent` for forced-colors survival (the one thing input.tsx
  is missing)
- `aria-invalid:` keeps its border-destructive + destructive-tinted ring, composing per
  verdict 4
- Buttons keep an outline-based ring (they have no border to hug and often sit on Canopy
  fill where a glow reads poorly) but move to the same colour token and drop the
  per-variant colour zoo.

The double-ring/"Oreo" patterns (C40's 9:1 two-colour trick, GOV.UK yellow/black) solve
any-background dark-mode problems this light-mode app does not have; noted, not adopted.

### Not verified by the research (flagged by the researcher, kept flagged here)

Chrome's native ring exact values; Firefox version for outline-follows-radius;
outline-offset behaviour on rounded corners at large offsets. None of these block the
recipe above (the ring is box-shadow-based and follows radius everywhere; the transparent
outline is a fallback whose exact corner rendering in forced-colors is a degraded mode).
