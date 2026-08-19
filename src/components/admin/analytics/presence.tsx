import { Circle, Monitor, Smartphone, Tablet } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import type { Presence } from "@/lib/admin-analytics";

/* ------------------------------------------------------------------ *
 *  Who is here, right now.
 *
 *  The one identifiable surface in the analytics room, and the reason
 *  the owner asked for the room at all: "so I know where especially the
 *  elder alumni are struggling". A batch year sits beside every name
 *  because that is the whole question -- a 1970s alumnus stuck on
 *  /directory for eleven minutes is the finding, and the same eleven
 *  minutes from a 2020s alumnus is not.
 * ------------------------------------------------------------------ */

const DEVICE_ICON = { phone: Smartphone, tablet: Tablet, desktop: Monitor } as const;

/** "just now", "4m", "2h" -- shorter than the feed's formatTimeAgo, because
 *  this list is scanned rather than read and every row carries one. */
function since(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** A visit's length. Zero is honest: they opened one page and left. */
function lasted(a: Date, b: Date): string {
  const s = Math.floor((b.getTime() - a.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** "/profile/clx123..." reads as noise; "a profile" reads as a fact. */
function readablePath(path: string | null): string {
  if (!path) return "somewhere";
  const named: Record<string, string> = {
    "/feed": "the feed",
    "/directory": "the directory",
    "/letters": "letters",
    "/collection": "the collection",
    "/catchups": "catch-ups",
    "/support": "support",
    "/birds": "the birds",
    "/about": "about",
    "/messages": "messages",
    "/settings": "settings",
  };
  if (named[path]) return named[path];
  if (path.startsWith("/profile/")) return "a profile";
  if (path.startsWith("/letters/")) return "reading a letter";
  if (path.startsWith("/catchups/")) return "a catch-up";
  if (path.startsWith("/collection/")) return "a photo";
  if (path.startsWith("/admin")) return "the admin panel";
  return path;
}

export function PresenceList({
  rows,
  live,
  empty,
}: {
  rows: Presence[];
  /** Live rows get the pulsing dot; recent ones get a time instead. */
  live?: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border/70">
      {rows.map((r) => {
        const Icon = DEVICE_ICON[(r.device ?? "desktop") as keyof typeof DEVICE_ICON] ?? Monitor;
        const place = [r.city, r.country].filter(Boolean).join(", ");
        return (
          <li key={`${r.id}-${r.endedAt.getTime()}`} className="flex items-center gap-2.5 py-2">
            <BirdAvatar
              user={{
                id: r.id,
                name: r.name,
                photoUrl: r.photoUrl,
                birdOverride: r.birdOverride,
              }}
              size="xs"
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-foreground">
                  {r.name ?? "Someone"}
                </span>
                {r.batchYear && (
                  <span className="shrink-0 text-[11.5px] text-muted-foreground">
                    {r.batchYear}
                  </span>
                )}
              </div>
              <span className="truncate text-[11.5px] text-muted-foreground">
                {readablePath(r.path)}
                {place && ` · ${place}`}
                {` · ${r.views} ${r.views === 1 ? "page" : "pages"}`}
                {` · ${lasted(r.startedAt, r.endedAt)}`}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
              {live ? (
                /* Opacity only, and no infinite loop on a colour: the house
                   rule is that only transform and opacity animate. */
                <Circle
                  className="h-2 w-2 animate-pulse fill-leaf text-leaf"
                  aria-label="here now"
                />
              ) : (
                <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
                  {since(r.endedAt)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
