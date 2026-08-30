"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ *
 *  A DIALOG WHOSE SUBJECT OUTLIVES ITS OWN CLOSE.
 *
 *  `{target && <SomeDialog open ... />}` is the obvious way to open a
 *  dialog about one row, and it silently throws away half the dialog
 *  material: clearing `target` unmounts the panel on the same frame the
 *  close is asked for, so the exit ui/dialog.tsx draws -- the backdrop
 *  letting go over 180ms while the panel drops 8px and scales to 0.96 --
 *  never runs at all. The dialog does not close, it VANISHES, and the
 *  page behind it snaps back with nothing in between. Every enter in the
 *  app is animated and that exit is not, which is the sort of asymmetry
 *  you feel before you can name it.
 *
 *  The fix everywhere else in this codebase is a `somethingMounted`
 *  latch beside the open flag (ContributeDialog, the image viewer): once
 *  opened it stays in the tree, and only the flag flips. That works
 *  while the dialog is about the PAGE. It falls over the moment the
 *  dialog is about a ROW, because the row is what you were clearing, and
 *  a panel rendered from `null` for the 200ms of its own exit is a blank
 *  panel fading out.
 *
 *  So: hold the subject past the close, and flip a separate flag.
 *
 *      const edit = useClosingDialog<Photo>();
 *      ...
 *      {edit.subject && (
 *        <EditDialog photo={edit.subject}
 *                    open={edit.open} onClose={edit.close} />
 *      )}
 *
 *  AND THE OPEN IS ONE FRAME LATE, which is the other half of the same
 *  problem and the reason this is a hook rather than two `useState`
 *  calls at the call site. Setting the subject and the flag together
 *  mounts the panel ALREADY OPEN, and a panel that has never been closed
 *  has no closed state to transition out of -- measured, on rAF, inside
 *  the page: opacity 1 and scale 1 on the very first frame, every frame
 *  after. So the subject lands, the browser paints one closed frame, and
 *  the flag flips on the next: 16ms nobody can perceive, in exchange for
 *  the first open of a page animating exactly like every later one.
 *
 *  WHAT IT DELIBERATELY DOES NOT DO is key the dialog per open. That was
 *  the first cut, to give each open a clean form, and it reintroduced
 *  the very bug above by a different door: a new key is a new mount, and
 *  a new mount is open-from-birth. A dialog that needs to start clean
 *  resets itself on its own open edge instead, which is one line inside
 *  the component that owns the state.
 * ------------------------------------------------------------------ */
export function useClosingDialog<T>() {
  const [subject, setSubject] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const frame = useRef(0);

  /* Cancelled on unmount: the frame after a route change would otherwise
     open a dialog on a page that has gone. */
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const show = useCallback((next: T) => {
    setSubject(next);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setOpen(true));
  }, []);

  const close = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setOpen(false);
  }, []);

  return {
    /** The row this dialog is about. Stays put through the close, and
     *  therefore for the rest of the page's life -- read `open` to ask
     *  whether anything is actually being acted on. */
    subject,
    open,
    show,
    close,
  };
}
