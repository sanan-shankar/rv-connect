/* ------------------------------------------------------------------ *
 *  The app around the reader, drawn statically so a sketch is judged
 *  inside the app and not on a bare page (the profiles room learned this:
 *  "have the sidebar there to make it more realistic").
 *
 *  Two helpers a direction's sketch MAY use, or refuse: ¶42's Action
 *  Button analogy is a full-screen surface, and a direction that takes
 *  the whole screen simply does not mount these.
 *
 *  Mocks, not the real <Sidebar>: the real one reads the pathname and the
 *  session, and inside a scaled frame its fixed positioning would break.
 *  The numbers match the shipped shell closely enough to judge weight.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { Feather, Images, Info, MessagesSquare, Menu, Newspaper, Notebook } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";

const NAV = [
  { label: "Feed", icon: Newspaper },
  { label: "Directory", icon: Notebook },
  { label: "Collection", icon: Images },
  { label: "Letters", icon: Feather },
  { label: "Catch-ups", icon: MessagesSquare },
  { label: "About", icon: Info },
] as const;

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

/** The desktop shell: the green rail with Catch-ups lit, the faint valley
 *  behind, and the main gutter the shipped pages use. */
export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[982px] bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-[0.11]"
        style={{ backgroundImage: "url(/images/landing.jpeg)" }}
      />
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
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
