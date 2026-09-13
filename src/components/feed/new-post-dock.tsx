"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LayoutGroup } from "motion/react";

/**
 * NewPostDock: the one piece of state the feed header's New post badge and
 * the feed column share. There is no pill on the page for the composer to
 * grow out of any more (owner, 2026-09-13: "I want the posts to start right
 * at the top instead of this dead space"), so the badge opens it and the
 * column draws it, and they meet here rather than through a DOM query.
 *
 * The member's own bird is ONE element with a shared `layoutId`: in the
 * badge while the composer is shut, in the composer's avatar slot while it
 * is open. Both are 40px, so the flight between them is a plain move.
 * LayoutGroup lets the header and the column, which are separate subtrees,
 * hand it across.
 *
 * Settled in /lab/new-post, where the pill-shaped alternatives and the sheet
 * are kept as the record.
 */

export const OWN_BIRD_LAYOUT_ID = "feed-own-bird";

type CloseOptions = {
  /** The composer is closing because a post just landed, not because it was dismissed. */
  landed?: boolean;
  /** Put keyboard focus back on the badge (Escape). */
  refocus?: boolean;
};

type Dock = {
  open: boolean;
  landed: boolean;
  openComposer: () => void;
  close: (opts?: CloseOptions) => void;
};

const DockContext = createContext<Dock | null>(null);

export function NewPostDock({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [landed, setLanded] = useState(false);

  const openComposer = useCallback(() => {
    setLanded(false);
    setOpen(true);
  }, []);

  const close = useCallback((opts?: CloseOptions) => {
    setLanded(!!opts?.landed);
    setOpen(false);
    /* Found by its attribute rather than held in a ref on this context: a
       ref in the same value as `open` makes React's compiler treat every read
       of `open` during render as a ref read. There is one badge per page. */
    if (opts?.refocus) {
      document.querySelector<HTMLElement>("[data-new-post]")?.focus({ preventScroll: true });
    }
  }, []);

  const value = useMemo(
    () => ({ open, landed, openComposer, close }),
    [open, landed, openComposer, close]
  );

  return (
    <DockContext.Provider value={value}>
      <LayoutGroup>{children}</LayoutGroup>
    </DockContext.Provider>
  );
}

export function useNewPostDock(): Dock {
  const dock = useContext(DockContext);
  if (!dock) throw new Error("useNewPostDock needs a <NewPostDock> above it");
  return dock;
}
