"use client";

/* ------------------------------------------------------------------ *
 *  What the phone's green bar says, when a page has something better to
 *  say than the wordmark.
 *
 *  WHY THIS EXISTS. Architecture section 7: "Every screen carries the name
 *  of the thing it is inside, and that name is the way up." On the Edition
 *  reader that name is the Catch-up's, in the green bar, at every scroll
 *  depth -- which is what kills the 44,381px of scrolling recon measured
 *  as the only way back ("I scroll all the way to the bottom, which takes
 *  me a week", brief 35). Not a Back button: he ruled that out by name
 *  (brief 18, D48).
 *
 *  WHY A STORE AND NOT A PROP. The bar lives in `Sidebar`, which the
 *  `(main)` layout renders as a SIBLING of the page. A layout cannot read
 *  a deeper route's params, and a server component cannot provide context,
 *  so there is no way to hand the name down the tree it would have to
 *  travel. A module store read through `useSyncExternalStore` is the
 *  smallest thing that crosses that gap.
 *
 *  WHY `useLayoutEffect` AND NOT `useEffect`. A layout effect runs after
 *  React commits the DOM and BEFORE the browser paints, and React flushes
 *  the re-render it schedules in the same frame. So arriving at the reader
 *  from the list or the home -- a client transition, and the way anyone
 *  actually gets here -- never paints the wordmark first. With
 *  `useEffect` it would paint the wordmark, then swap, which is exactly
 *  the fault he caught in the lab: "when I click on reader it shows me
 *  some different UI for a second before showing the correct one".
 *
 *  WHAT IT STILL COSTS, said plainly. On a COLD load of an Edition URL
 *  the server has already streamed the wordmark into the HTML, so the bar
 *  carries "Rishi Valley" until hydration runs. There is no server-side
 *  fix short of moving the bar out of the sidebar. The swap is one word
 *  for another in the same slot, at the same size, and it happens once per
 *  cold deep link.
 * ------------------------------------------------------------------ */

import { useLayoutEffect, useSyncExternalStore } from "react";

export type AppBarTitleValue = { title: string; href: string } | null;

let current: AppBarTitleValue = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** The bar's own read. Null means "draw the wordmark", which is every page
 *  but this one. */
export function useAppBarTitle(): AppBarTitleValue {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/**
 * Renders nothing. Mount it inside a page and the phone's bar carries this
 * name, as a link, until the page unmounts.
 *
 * Unmount clears the store only if nobody else has claimed it since, so two
 * readers overlapping during a route transition cannot leave the bar blank.
 */
export function AppBarTitle({ title, href }: { title: string; href: string }) {
  useLayoutEffect(() => {
    const mine = { title, href };
    current = mine;
    emit();
    return () => {
      if (current === mine) {
        current = null;
        emit();
      }
    };
  }, [title, href]);
  return null;
}
