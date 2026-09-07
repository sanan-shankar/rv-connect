"use client";

/* ------------------------------------------------------------------ *
 *  The app around the reader, drawn statically so the sketch is judged
 *  inside the app and not on a bare page (the profiles room learned this:
 *  "have the sidebar there to make it more realistic").
 *
 *  Mocks, not the real <Sidebar>: the real one reads the pathname and the
 *  session, and inside a scaled frame its fixed positioning would break.
 *  The numbers match the shipped shell.
 *
 *  Three things are fixed here that were wrong in every earlier sketch at
 *  once, because they were wrong in the shell they shared:
 *
 *  1. The valley photograph. See ValleyWash in _parts.tsx for the cause;
 *     the fix is that the wash is one screen tall, not one PAGE tall.
 *  2. The gutter. The shipped shell's rule: "the title's distance from the
 *     left edge EQUALS its distance from the top". It is p-10 on both axes.
 *  3. The columns. Two, never three, and the reading on the left.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { Bell, Feather, Images, Info, MessagesSquare, Menu, Newspaper, Notebook } from "lucide-react";
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

/** The app's 56px green bar on a phone.
 *
 *  With a `title`, the bar is the reader's: the Catch-up's name sits where
 *  the wordmark sits on every other page. That is what a navigation bar is
 *  for on an iPhone, the name of the screen you are on, and it is the one
 *  place the name is printed. The hamburger and the bell stay, because the
 *  bar is still the app's bar and never leaves (handover 1.5). The name is
 *  also the way up to the Catch-up's home, which is why it is a button.
 *
 *  His words on the earlier sketch that did this: "I do like the idea of
 *  using the top bar like you are now, so saying 'in the loop, Round 1',
 *  that's done fine." (R19) And: "If we're doing a green bar, might as well
 *  make it the top one." (R41) */
export function PhoneBar({
  title,
  position = "static",
}: {
  title?: string;
  position?: "static" | "absolute" | "sticky";
}) {
  return (
    <header
      className="z-40 flex h-14 w-full items-center gap-1.5 bg-sidebar px-3 text-sidebar-foreground"
      style={{ position, top: 0, left: 0 }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sidebar-foreground-idle">
        <Menu className="h-[22px] w-[22px]" strokeWidth={1.9} />
      </span>
      {title ? (
        <button
          type="button"
          className="ml-0.5 min-w-0 flex-1 truncate text-left font-heading text-[17px] leading-none text-sidebar-foreground"
          aria-label={`${title}, back to the Catch-up`}
        >
          {title}
        </button>
      ) : (
        <span className="ml-1 inline-flex min-w-0 flex-1 items-center gap-2 font-heading text-[15px]">
          <PeaksMark size={18} /> Rishi Valley
        </span>
      )}
      <span className="grid h-10 w-10 shrink-0 place-items-center text-sidebar-foreground-idle">
        <Bell className="h-[21px] w-[21px]" strokeWidth={1.9} />
      </span>
    </header>
  );
}

/** The phone page under the bar, with the wash cropped to one screen.
 *
 *  `min-h-full` on the INNER layer too, always: inside an 844px frame the
 *  layer a drawing renders into would otherwise be only as tall as its
 *  content, and an `absolute bottom-0` sheet would land 180px up the screen
 *  with paper under it. */
export function PhoneShell({ children, tall = true }: { children: ReactNode; tall?: boolean }) {
  return (
    <div className={cn("relative min-h-full bg-background", !tall && "h-full")}>
      <ValleyWash height={844} />
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
