/**
 * THE focus treatment for a text field. One place, imported by every field
 * in the app -- the ui primitives, the composer's contentEditable, the
 * comment box, the support amount, the float family -- in the
 * menu-material pattern, so "a field lights up like this" is one fact.
 *
 * Why it had to be one string and not a rule in a document: on 2026-08-29
 * the app had ELEVEN different answers to "what happens when a text box gets
 * focus", every one written by a session that believed it was matching the
 * others. The owner picked two fields at random and they differed. A shared
 * constant plus focus-recipe.test.mjs is the only shape that cannot drift.
 *
 * WHAT IT DOES, chosen by the owner from /lab/focus (column A), 2026-08-29:
 *
 * - Click or tap into a field: a quiet answer. A bordered box turns its
 *   1px border leaf. The mist floating-label shell (auth, profile) does
 *   nothing to its edge at all: the label floating up is its focus state,
 *   which is the August ruling ("I don't want the green outline on boxes")
 *   kept exactly.
 * - Tab into a field: one solid 2px leaf edge hugging the box (border +
 *   1px INSET ring, same colour, reads as one line). That is the 2px
 *   perimeter WCAG 2.4.13 asks for, and leaf clears 3:1 on every surface
 *   here. Nobody who clicks ever sees it.
 *
 * The split rides on `html[data-modality]`, set by <FocusModality> in the
 * root layout, because :focus-visible alone treats a clicked text box the
 * same as a tabbed one (MDN: text-entry widgets are always focus-visible).
 *
 * WRITTEN OUT IN FULL, NOT BUILT FROM A PREFIX: Tailwind generates CSS only
 * for class tokens it can read literally in source. A first draft spelled
 * these as `${KB}:focus-visible:ring-1` and every keyboard edge silently
 * compiled to nothing -- the tracker flipped, the class was on the element,
 * and no CSS existed for it. Keep every token literal.
 *
 * Details that are not decoration:
 * - INSET ring: the composer and the comment box each grew a bespoke ring
 *   because an outward one got clipped by their animating overflow-hidden
 *   wrappers. Inset has nothing outside the box to clip.
 * - Transparent 2px outline on the keyboard state: forced-colors mode drops
 *   box-shadow and recolours this outline, so Windows High Contrast users
 *   still get a ring.
 * - No half-alpha halo, no offset: those were "the thin ring and the thick
 *   ring" and "separated from the text box".
 *
 * `FIELD_FOCUS_SHELL` is the float family's version (nothing on click).
 * `FIELD_FOCUS_WITHIN` is the same pair on a wrapper that holds the focused
 * element (the combobox shell, the answer card around a RichTextArea).
 * `FIELD_INVALID` composes on other properties so error and focus never
 * fight: the edge goes red and stays red while focused.
 */

/** A field with a visible border: tint on click, edge on Tab. */
export const FIELD_FOCUS =
  "focus-visible:border-ring [html[data-modality=keyboard]_&]:focus-visible:ring-1 [html[data-modality=keyboard]_&]:focus-visible:ring-inset [html[data-modality=keyboard]_&]:focus-visible:ring-ring [html[data-modality=keyboard]_&]:focus-visible:outline-solid [html[data-modality=keyboard]_&]:focus-visible:outline-2 [html[data-modality=keyboard]_&]:focus-visible:outline-transparent";

/** The mist floating-label shell: nothing on click, edge on Tab. */
export const FIELD_FOCUS_SHELL =
  "[html[data-modality=keyboard]_&]:focus-visible:border-ring [html[data-modality=keyboard]_&]:focus-visible:ring-1 [html[data-modality=keyboard]_&]:focus-visible:ring-inset [html[data-modality=keyboard]_&]:focus-visible:ring-ring [html[data-modality=keyboard]_&]:focus-visible:outline-solid [html[data-modality=keyboard]_&]:focus-visible:outline-2 [html[data-modality=keyboard]_&]:focus-visible:outline-transparent";

/** A bordered wrapper around the focused element. */
export const FIELD_FOCUS_WITHIN =
  "focus-within:border-ring [html[data-modality=keyboard]_&]:focus-within:ring-1 [html[data-modality=keyboard]_&]:focus-within:ring-inset [html[data-modality=keyboard]_&]:focus-within:ring-ring [html[data-modality=keyboard]_&]:focus-within:outline-solid [html[data-modality=keyboard]_&]:focus-within:outline-2 [html[data-modality=keyboard]_&]:focus-within:outline-transparent";

export const FIELD_INVALID =
  "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-inset aria-invalid:ring-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive";
