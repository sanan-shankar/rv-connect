"use client";

/**
 * A client wrapper that registers whatever it wraps as a tour spotlight
 * target.
 *
 * `useTourAnchor` reports a live element through a ref, so the element has to
 * be rendered by a client component. Most spotlight targets already are
 * (the feed composer, the directory search, the Collection's Contribute
 * button all call the hook on themselves). The Catch-ups card is not: it is
 * server-rendered, and converting it to a client component to register one
 * ref would push the whole card into the client bundle to buy nothing else.
 *
 * So this wraps instead. It renders one plain `div` with no styling of its
 * own, which is deliberate -- callers place it inside a `space-y` stack where
 * an extra unstyled child keeps exactly the rhythm the cards had before.
 *
 * `data-tour` is convention rather than machinery (the hook reads the ref, not
 * the attribute) but it is what makes the target findable in the DOM when
 * somebody is debugging a stop that will not light up.
 */

import type { ReactNode } from "react";
import { useTourAnchor } from "./tour-anchors";

export function TourAnchorSlot({
  anchorKey,
  children,
}: {
  anchorKey: string;
  children: ReactNode;
}) {
  const ref = useTourAnchor<HTMLDivElement>(anchorKey);
  return (
    <div ref={ref} data-tour={anchorKey}>
      {children}
    </div>
  );
}
