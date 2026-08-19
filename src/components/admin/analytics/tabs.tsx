import Link from "next/link";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The room's six views.
 *
 *  WHY tabs rather than one long page (owner, 2026-08-19: "I'm not sure
 *  the current layout is scalable... things are slowly getting cluttered
 *  and messy"). One page meant every new metric made the scroll longer
 *  and the relationships between numbers harder to see, and it also meant
 *  ~40 queries ran on every load to render things nobody had scrolled to.
 *
 *  Each view is one question a person actually arrives with, and only the
 *  active one queries anything. So the page gets FASTER as it grows,
 *  rather than slower.
 *
 *  Server-rendered links on a search param, not client state: every view
 *  is a real URL that can be linked, bookmarked and reloaded.
 * ------------------------------------------------------------------ */

export const VIEWS = [
  { key: "live", label: "Live", blurb: "Who is here right now" },
  { key: "people", label: "People", blurb: "Who has joined, and who stayed" },
  { key: "content", label: "Content", blurb: "What gets written and read" },
  { key: "rhythms", label: "Rhythms", blurb: "When this place is awake" },
  { key: "faces", label: "Faces", blurb: "Who reads, who writes, and who nobody has answered" },
  { key: "reach", label: "Reach", blurb: "How people arrive and what they look for" },
  { key: "journey", label: "Joining", blurb: "How far each generation gets, and who cannot sign in" },
  { key: "compare", label: "Compare", blurb: "Any measure, grouped any way, plus what moves together" },
  { key: "health", label: "Health", blurb: "Email and delivery" },
] as const;

export type ViewKey = (typeof VIEWS)[number]["key"];

export function isViewKey(v: string | undefined): v is ViewKey {
  return !!v && VIEWS.some((x) => x.key === v);
}

export function AnalyticsTabs({ active }: { active: ViewKey }) {
  return (
    <nav
      /* Scrolls rather than wraps: six tabs wrap to two ragged lines at 390px,
         and a second row of navigation above the content reads as chrome. */
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
      aria-label="Analytics views"
    >
      {VIEWS.map((v) => {
        const current = v.key === active;
        return (
          <Link
            key={v.key}
            href={`/admin/analytics?view=${v.key}`}
            aria-current={current ? "page" : undefined}
            title={v.blurb}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              current
                ? "bg-canopy text-white"
                : /* Lifts to the card surface on hover rather than sinking into
                     muted. The protocol audit catches the sink, and it is right
                     to: a control that darkens under the cursor reads as pressed
                     before it has been. */
                  "bg-secondary text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
