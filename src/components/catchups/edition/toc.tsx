"use client";

/* ------------------------------------------------------------------ *
 *  Edition table of contents: one shared scroll-spy hook, two renderings.
 *
 *  Spec 3.6 (BINDING): a right-hand floating sticky TOC on desktop, which
 *  collapses to a top "jump to" chip row on mobile. Those are two different
 *  DOM positions (a sticky aside beside the body vs. a horizontal strip
 *  above it), so this file exports two small components that share one
 *  IntersectionObserver-driven `useActiveSection` hook rather than forking
 *  the scroll-spy logic. Both mount at every viewport (Tailwind `lg:`
 *  visibility is CSS, not conditional rendering), so the hook keys its
 *  effect on the joined id list: without that, `ids` being a fresh array
 *  each render rebuilt both observers on every single re-render.
 *
 *  The desktop rail's active-item indicator reuses `NAV_MARKER_SPRING`
 *  (src/components/common/motion.tsx) - the same spring the sidebar's
 *  active-row marker uses - so this page's in-page navigation reads as the
 *  same hand as the app shell's. It animates a `transform: translateY`
 *  only (measured `offsetTop` in px), never the `layout` prop (see the
 *  Motion Gotchas note: layout FLIP reads as a stretch on big jumps).
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { NAV_MARKER_SPRING } from "@/components/common/motion";
import { cn } from "@/lib/utils";

export type TocItem = { id: string; label: string };

function useActiveSection(ids: string[]): number {
  const [active, setActive] = useState(0);
  const key = ids.join("|");

  useEffect(() => {
    const sections = key
      .split("|")
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        // Track whichever observed section's top is closest to (but still
        // above) the upper third of the viewport, so the active item is
        // whatever the reader is actually looking at, not just "in view".
        let bestIndex = -1;
        let bestTop = -Infinity;
        for (const entry of observed) {
          const idx = sections.indexOf(entry.target as HTMLElement);
          if (idx === -1) continue;
          const top = entry.boundingClientRect.top;
          if (top <= 160 && top > bestTop) {
            bestTop = top;
            bestIndex = idx;
          }
        }
        if (bestIndex !== -1) setActive(bestIndex);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/** Desktop: the sticky floating rail. Render inside a `sticky` aside. */
export function EditionTocRail({ items }: { items: TocItem[] }) {
  const active = useActiveSection(items.map((i) => i.id));
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [marker, setMarker] = useState({ y: 0, h: 20 });

  useEffect(() => {
    const el = itemRefs.current[active];
    if (el) setMarker({ y: el.offsetTop, h: el.offsetHeight });
  }, [active]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Jump to a question" className="relative">
      <p className="mb-[var(--space-s)] text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        In this Edition
      </p>
      <div className="relative pl-4">
        <m.span
          aria-hidden
          className="absolute left-0 top-0 w-[2px] rounded-full bg-leaf"
          style={{ height: marker.h }}
          animate={{ y: marker.y }}
          transition={NAV_MARKER_SPRING}
        />
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={`#${item.id}`}
                className={cn(
                  "block rounded-md py-1.5 pr-2 text-[13px] leading-snug hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  i === active ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** Mobile: a horizontal, scrollable "jump to" chip row above the body. */
export function EditionTocChips({ items, className }: { items: TocItem[]; className?: string }) {
  const active = useActiveSection(items.map((i) => i.id));

  if (items.length === 0) return null;

  return (
    // No full-bleed negative margin: below `lg` the sidebar is still on
    // screen from `md` up, and bleeding past the shell's gutter put this row
    // flush against it (owner review 2026-07-25).
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex w-max gap-2 pb-1">
        {items.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              i === active
                ? "border-canopy bg-canopy text-white hover:bg-canopy/90"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
