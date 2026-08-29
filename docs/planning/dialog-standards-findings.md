# Dialogs, menus, focus states: what is actually wrong

Working notes, 2026-08-29. Evidence gathered before any code moved. This is the shared
evidence base for four separate specs, not a spec itself. Owner brief: the Collection
contribute dialog, dialog hierarchy and copy generally, the "more" menus, and the
text-input focus states.

Nothing here is a proposal. Proposals live in the specs that cite this file.

## The thesis

This is not four taste problems. It is ONE organisational problem, four times over:
**in every area the owner flagged, a correct standard already exists in this repo — written
down, argued for, dated — and was never enforced past the surface it was written on.**

| Area | The standard that already exists | Where it was ignored |
|---|---|---|
| Focus states | DESIGN-SYSTEM.md §"Focus states": "**One** focus ring... **Remove the doubled / thicker outline currently drawn around focused inputs**" — it names the exact bug the owner re-reported | executed on `input.tsx` only; `textarea.tsx`, `select.tsx`, `button.tsx` still ship the doubled offset outline |
| Dialogs | DESIGN-SYSTEM.md §"Dialogs: one material (2026-07-30)": DialogTitle 16px medium, DialogDescription 14px muted, one footer shape, "**no per-dialog title sizes**" | the Collection contribute dialog: 20/23px per-dialog title, real title `sr-only`, a 22px paragraph impersonating it, no footer shape |
| Confirmations | `common/confirm-dialog.tsx`, whose header argues "that is the browser's chrome, not the app's" | 8 call sites still calling `window.confirm` |
| Menus | `ui/menu-material.ts` + DESIGN-SYSTEM.md §"Menus & dropdowns: one material (2026-07-30)" | panel level only; item/trigger level (separators, touch targets, one destructive flow) never finished |
| Attach flow | `AttachImageWell` — its own comment *claims* the Collection embeds it | the Collection hand-rolled a bespoke empty state; the claim is false |

Each standard was real and each was right. None was enforced. That is why the UI reads as
inconsistent rather than as bad — the thinking happened and then did not travel. The remedy
is therefore not "think about these four areas" (that was done, on the record, with dates)
but the owner's own standing rule: **one protocol, enforced by a test.** Each spec below
ships with the audit/test that makes drift a `npm run check` failure, the way the lab
registry and the protocol audit already work.

## 1. The Collection contribute dialog

`src/components/collection/contribute-room.tsx`. Measured live at 1440x900, signed in.

**The hierarchy is inverted.** The dialog has a real `<h2>` reading "Add to the valley's
memory", wrapped in a `sr-only` div — invisible to sighted users. A `<p>` styled
`font-heading text-[22px]` then impersonates the title, and what it says is **"Drag and drop,
browse or paste from your clipboard"**. So the loudest element in the dialog is a list of
input methods, and the actual subject is hidden. Everything else follows from that.

Measured:

- Panel 512x322, radius 20.8px, content block 462x248 — the box is sized for content it does not have
- The fake title is 22px Libre Baskerville across 446px and wraps 35 chars / 14 chars,
  breaking at "from / your clipboard". A lopsided centred wedge.
- Four centred elements stacked: icon (44px, Canopy), fake title, subtitle, CTA pill
- Subtitle: "As many photos as you like. Please provide descriptions if possible!" — two
  unrelated sentences, an exclamation mark, and an instruction for a step the member has not
  reached yet (descriptions are asked for on the next stage)
- 57px of dead white below the button
- **There is no drop zone.** It describes drag-and-drop in prose instead of drawing a box.
  It tells where the sibling dialog shows.

The owner's reaction was "there's something really wrong I can't tell what". The sr-only
title is the answer; the wrap, the centring and the whitespace are symptoms of it.

## 2. The sibling dialog it should learn from

`AttachImageDialog`, `src/components/common/attach-image-dialog.tsx:151`. Used in 6 places
(post composer, messages, avatar, catch-up answers, onboarding). The owner named this one as
the good one — the dotted line and the clear box to drop into.

Its own failure is pure redundancy. Every one of the three input methods is stated twice:

| `DialogDescription` (line 170) says | The well (lines 144-146) says |
|---|---|
| "Browse your computer" | "click to browse" |
| "drag a file in" | "Drop photos here" |
| "paste from your clipboard" | "or paste from your clipboard" — verbatim |

The description does not need trimming; it needs deleting. The well already says everything.
The well itself then runs two consecutive "or" clauses.

**Drift note:** `attach-image-dialog.tsx`'s own header comment claims "The Collection's
contribute dialog IS already a dialog, so it embeds `<AttachImageWell>` directly". It does
not. `grep` finds zero usages of `AttachImageWell` outside its own file. The comment
describes an intention that was never carried out, which is worse than no comment.

## 3. The press spring

`src/components/common/motion.tsx:159`. `SpringPress` applies `whileTap={{ scale: 0.93 }}`
with `SPRINGS.snappy` (stiffness 420, damping 30). Owner: "the box you press down on
compresses a bit too much. that spring is too loose." Two independent causes:

1. **A fixed scale applied at any size.** 0.93 on a 120px pill is ~8px of travel and reads
   as a press. On the 358px-wide drop well it is ~25px of horizontal collapse — rubbery.
   Apple's own behaviour is the inverse: larger surfaces press proportionally less.
2. **Damping ratio 0.73** — `30 / (2 * sqrt(420 * 1))`. Underdamped, so it overshoots past
   1.0 on release and wobbles back. That is the "loose". Critical-ish damping for this
   stiffness would be ~37-41.

Both need fixing; fixing only the scale leaves the wobble, fixing only the damping leaves the
collapse.

## 4. Native system dialogs

Eight call sites still hand the member the browser's grey chrome:

- `src/components/posts/post-card.tsx:291` — "Delete this post? This cannot be undone." (the one the owner hit)
- `src/components/posts/comments-section.tsx:272`
- `src/components/letters/drafts-strip.tsx:60`
- `src/components/profile/admin-profile-tools.tsx:35, 52, 78`
- `src/components/catchups/home/keeper-settings-dialog.tsx:85`
- `src/components/catchups/home/people-panel.tsx:405`

`ConfirmDialog` already exists and already makes the argument, in its own header: *"That is
the browser's chrome, not the app's: no warm scrim, no radius ladder, no focus ring, and no
way to say WHICH user."* It supports a typed `confirmWord` for irreversible acts and notes
that requiring typing where the act is merely inconvenient "is theatre". It was built for the
admin panel and never adopted anywhere else.

This is 8 behaviour changes, not one — each needs its copy rewritten too. It deserves its own
pass rather than riding along with the Collection work.

## 5. Focus states

Four primitives, three treatments:

| Component | Treatment | Pseudo-class |
|---|---|---|
| `ui/input.tsx:23` | `focus:border-ring` + `focus:ring-[3px] ring-ring/50` — snug 3px glow hugging the border | `focus:` |
| `ui/textarea.tsx` | `outline-2 outline-offset-2 outline-ring` — hard 2px line floating 2px clear of the box | `focus-visible:` |
| `ui/select.tsx` | same as textarea | `focus-visible:` |
| `ui/button.tsx` | `outline-2 outline-offset-2`, but three colours by variant (canopy / ring / destructive) | `focus-visible:` |

Put an Input above a Textarea in one form and the focus indicator **changes shape and
position** as you tab between them. That is the owner's complaint verbatim: "sometimes it's a
thin outline, sometimes it's a thicker lighter one. sometimes it's both. sometimes it's the
thick one but slightly away from the box outline."

**Input's `focus:` is deliberate, not sloppy.** The comment at `input.tsx:15-22` records an
earlier owner complaint that the offset outline was "actually bigger than the box outline"
next to a combobox's snug glow, and switched Input to a plain `focus:` so mouse and keyboard
light it alike. So Input is the fixed one. The others are the unfixed ones.

Two consequences for the spec: the canonical treatment is probably Input's, not the outline;
and the `focus:` vs `focus-visible:` question has to be settled deliberately, because the
comment's reasoning (matching `focus-within`) is real but conflicts with the convention that
a keyboard indicator should not appear on mouse click.

Also observed live: the drop well carries a dashed border *and* a solid focus outline 2px
outside it — two rings on one element, which is what the offset treatment does to any
component that already has a border.

## 6. The "more" menus

Better news than expected. The panel is already ONE material — `MENU_PANEL_CLASS` in
`src/components/ui/menu-material.ts`, dated 2026-07-30, with every number argued in its
header (12px panel, 8.8px concentric rows, warm hairline, one origin animation, exit faster
than enter). Icons are consistently Lucide 16px leading. `variant="destructive"` exists on
`DropdownMenuItem` and is used. So the owner's "beta product" feel is not the panel; it is
four item/trigger-level gaps:

1. **No separator above destructive items, anywhere.** Zero `DropdownMenuSeparator` usages
   in post-card, comments, catch-up card or admin content menus. Apple, Carbon and Radix's
   own examples all put a divider above the destructive group.
2. **Trigger hit targets are under-size on touch.** Post-card: `p-1.5` + 16px glyph = 28px
   square (`post-card.tsx:372`). Comments: a 14px glyph (`comments-section.tsx:674`),
   smaller still. Fine-pointer floor (24px) is met; the coarse-pointer 44px convention
   (Apple default, Primer's formalised rule) is not — at 390px width these are thumb
   targets.
3. **Destructive flow differs by surface.** The catch-up card menu confirms in place
   (`setConfirming(true)`, its own pattern); the post card goes straight to native
   `confirm()`; admin tools go to native `confirm()` with different phrasing. Three
   different endings to the same gesture.
4. **Label register drifts.** "Remove (admin)" (`post-card.tsx:395`) — a parenthetical role
   annotation inside a menu item, where every other item is a bare verb.

Trigger focus rings are the old `outline-2 outline-offset-2` treatment and will be picked
up by the focus-state standard.

## Method

Live measurement via chrome-devtools MCP against `localhost:3000`, signed in as the test
account. Geometry and computed styles read from `getBoundingClientRect` and
`getComputedStyle`, not estimated from screenshots. Call-site counts from `grep` across
`src/`. Screenshots of both dialogs taken at 1440x900 for the visual comparison.

Not yet gathered at time of writing: the "more"/overflow menu inventory (trigger sizes, radii,
item heights, icon usage across post card / comment / admin table / profile), and the
industry research on dialog anatomy, destructive-action copy, menu specs and WCAG 2.4.13
focus appearance. Those are in flight and belong in the specs that use them.
