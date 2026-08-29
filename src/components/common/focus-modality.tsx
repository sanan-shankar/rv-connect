"use client";

import { useEffect } from "react";

/* ------------------------------------------------------------------ *
 *  How did focus last move: a pointer or the keyboard?
 *
 *  Sets `data-modality="pointer" | "keyboard"` on <html>, and that is all.
 *  field-focus.ts reads it: a text box you CLICK into tints its border (or,
 *  for the mist floating-label shell, just floats its label), while a text
 *  box you TAB into gets the full 2px leaf edge. The owner chose this on
 *  2026-08-29 from /lab/focus (column A) after ruling in August that he did
 *  not want "the green outline on boxes" -- which was always about the
 *  ring appearing on a click. Keyboard users still need a real ring; this
 *  is how both can be true. iOS does the pointer half; WCAG asks for the
 *  keyboard half.
 *
 *  :focus-visible alone cannot make this split, because browsers treat
 *  text-entry widgets as always focus-visible (MDN), on click as much as
 *  on Tab. Buttons and links do not need this: on them :focus-visible
 *  already means keyboard, and they keep their offset outline untouched.
 *
 *  Capture phase, so a pointerdown that some component stops propagating
 *  still counts. Arrow keys count as keyboard because menus and radio
 *  groups move focus with them.
 * ------------------------------------------------------------------ */
export function FocusModality() {
  useEffect(() => {
    const root = document.documentElement;
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key.startsWith("Arrow")) root.dataset.modality = "keyboard";
    };
    const pointer = () => {
      root.dataset.modality = "pointer";
    };
    root.dataset.modality = "pointer";
    window.addEventListener("keydown", keyboard, true);
    window.addEventListener("pointerdown", pointer, true);
    return () => {
      window.removeEventListener("keydown", keyboard, true);
      window.removeEventListener("pointerdown", pointer, true);
    };
  }, []);
  return null;
}
