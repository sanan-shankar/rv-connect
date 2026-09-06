"use client";

/* ------------------------------------------------------------------ *
 *  The app around the reader, drawn statically so a sketch is judged
 *  inside the app and not on a bare page (the profiles room learned this:
 *  "have the sidebar there to make it more realistic").
 *
 *  Mocks, not the real <Sidebar>: the real one reads the pathname and the
 *  session, and inside a scaled frame its fixed positioning would break.
 *  The numbers match the shipped shell.
 *
 *  Rewritten 2026-09-06 after the owner's review. Three things were wrong
 *  in every direction at once because they were wrong here:
 *
 *  1. The valley photograph. See ValleyWash in _parts.tsx for the cause;
 *     the fix is that the wash is one screen tall, not one PAGE tall.
 *  2. The gutter. `py-8 px-10` broke the rule the shipped shell states in
 *     a comment of its own: "the title's distance from the left edge
 *     EQUALS its distance from the top". It is p-10 on both axes now.
 *  3. The columns. "Three column layouts on desktop no need. Stick with
 *     two." And: "Let the main reader be on the left column. Don't have
 *     navigation on the left."
 *
 *     The shipped Round page already gets this right and every sketch had
 *     ignored it. Its grid, verbatim from
 *     app/(main)/catchups/round/[editionId]/page.tsx:
 *
 *         grid-cols-[minmax(0,1fr)_220px], gap-x-[30px]
 *
 *     Reader in the 1fr column on the LEFT, a 220px rail on the right, a
 *     30px gutter. A direction may depart from it, but it departs from
 *     THAT rather than inventing a margin, which is what produced
 *     "literally the column on the right has a massive margin in the
 *     right and the one on the left has no margin on the left".
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { Feather, Images, Info, MessagesSquare, Menu, Newspaper, Notebook } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { cn } from "@/lib/utils";
import { ValleyWash } from "./_parts";

const NAV = [
  { label: "Feed", icon: Newspaper },
  { label: "Directory", icon: Notebook },
  { label: "Collection", icon: Images },
  { label: "Letters", icon: Feather },
  { label: "Catch-ups", icon: MessagesSquare },
  { label: "About", icon: Info },
] as const;

/** One laptop screen, for the wash's height. The frame is 1512x982. */
const LAPTOP_SCREEN_HEIGHT = 982;

/** The 56px green bar a phone has at the top of every page. `absolute` so
 *  it can sit at the top of an 844px frame; pass `sticky` for a tall page. */
export function PhoneBar({ position = "static" }: { position?: "static" | "absolute" | "sticky" }) {
  return (
    <header
      className="z-40 flex h-14 w-full items-center gap-1.5 bg-sidebar px-3 text-sidebar-foreground"
      style={{ position, top: 0, left: 0 }}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full">
        <Menu className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="ml-1 inline-flex items-center gap-2 font-heading text-[15px]">
        <PeaksMark size={18} /> Rishi Valley
      </span>
    </header>
  );
}

/** The phone page under the bar, with the wash cropped to one screen.
 *
 *  `min-h-full` on the INNER layer too, always. It used to be applied only
 *  for the tall drawing, which meant that inside an 844px frame the layer
 *  a sketch actually renders into was only as tall as its content, so an
 *  `absolute bottom-0` navigator landed 180px up the screen with paper
 *  under it. Measured on the pick's MidScroll before the fix. */
export function PhoneShell({ children, tall = true }: { children: ReactNode; tall?: boolean }) {
  return (
    <div className={cn("relative min-h-full bg-background", !tall && "h-full")}>
      <ValleyWash height={844} />
      {/* This layer is `relative` so it can sit above the wash, which makes
          it the containing block for every `absolute` a sketch draws. On a
          one-screen drawing it therefore has to BE one screen: without
          `h-full` it grew to its content and an `absolute bottom-0`
          navigator landed below the visible 844, which read as the bar
          having disappeared. `overflow-hidden` with it, because a phone
          screen showing the middle of a page is meant to cut off. */}
      <div className={cn("relative z-10 min-h-full", !tall && "h-full overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}

/** The desktop shell: the green rail with Catch-ups lit, the valley behind,
 *  and the shipped page gutter (p-10, equal on both axes). */
export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[982px] bg-background">
      <ValleyWash height={LAPTOP_SCREEN_HEIGHT} />
      <aside className="relative z-10 flex w-[248px] shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground">
        <div className="mb-8 flex items-center gap-2.5 px-2 font-heading text-[17px]">
          <PeaksMark size={22} /> Rishi Valley
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ label, icon: Icon }) => {
            const active = label === "Catch-ups";
            return (
              <div
                key={label}
                className={`flex h-10 items-center gap-3 rounded-full px-3.5 text-[14.5px] font-medium ${
                  active ? "bg-canopy text-white" : "text-sidebar-foreground/75"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                {label}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <main className="w-full max-w-[1600px] flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
