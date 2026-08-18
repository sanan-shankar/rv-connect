import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Admin page furniture.
 *
 *  The panel is a TOOL, and density stays the feature (owner, 2026-08-04:
 *  "everything in the admin panel can be more dense, very feature rich. So
 *  sparsely populated."). Nothing here loosens it. What changed is WHERE the
 *  density lives: nine screens that each fit, instead of one 2901px page.
 *
 *  The old section label was 11px uppercase tracked `text-muted-foreground`,
 *  repeated six times down one page, because it was doing navigation's job.
 *  The rail does that now, so a heading in here can be a heading: 13px,
 *  foreground, sentence case. That single change is most of the answer to
 *  "it's just so hard to read because there's so much grey text" (measured
 *  before this rebuild: 53% of the panel's text, and 18 elements set below
 *  the type scale's smallest step).
 * ------------------------------------------------------------------ */

/**
 * A labelled block inside a section page. Used where one page genuinely holds
 * two different things (the Overview's worklist and its health strip); NOT
 * used to stack six unrelated surfaces down one route, which is what it was
 * for before.
 */
export function AdminSection({
  label,
  count,
  action,
  children,
  className,
}: {
  label: string;
  /** Rendered beside the label, and only when there is something to count. */
  count?: number;
  /** A control on the label's own line, e.g. a filter or a link out. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="text-[13px] font-semibold text-foreground">{label}</h2>
        {count !== undefined && count > 0 && (
          /* Tabular figures, so a count ticking 9 -> 10 does not shift the
             heading's baseline box under it. */
          <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * An empty queue. One line, no card: an empty state does not need a bordered
 * 80px box to say nothing is waiting, and four of those stacked down the old
 * panel were most of its height. A box must earn its border.
 */
export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-0.5 py-1 text-[13px] text-muted-foreground">{children}</p>;
}

/**
 * One fact about the place, in a strip of them.
 *
 * Every tile is a LINK to the section that owns the number. The panel it
 * replaces had six counts that were not clickable, three of which were
 * repeated as headings two inches below them, so the strip could tell you
 * something needed doing and then leave you to scroll for it.
 *
 * The value is foreground and the label is 12px, not the other way around:
 * the old strip set its labels at 10.5px muted, below the type scale, which
 * is the register this rebuild retired.
 */
export function StatTile({
  label,
  value,
  suffix,
  icon: Icon,
  href,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  /** A quiet trailing part, e.g. "/ 95" on the day's mail budget. */
  suffix?: string;
  icon?: LucideIcon;
  href?: string;
  /** `warn` and `bad` colour the FIGURE only, never the tile. */
  tone?: "plain" | "warn" | "bad";
}) {
  const figureTone =
    tone === "bad" ? "text-destructive" : tone === "warn" ? "text-cinnamon" : "text-foreground";

  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-leaf" strokeWidth={2} aria-hidden />}
        <span className={cn("text-[20px] font-semibold leading-none tabular-nums", figureTone)}>
          {value}
        </span>
        {suffix && (
          <span className="text-[13px] leading-none text-muted-foreground">{suffix}</span>
        )}
      </div>
      <p className="mt-1.5 truncate text-[12px] font-medium text-muted-foreground">{label}</p>
    </>
  );

  const shell = "bg-card px-3 py-2.5";

  return href ? (
    <Link
      href={href}
      className={cn(
        shell,
        "state-layer block transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      )}
    >
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

/**
 * The strip that holds them.
 *
 * `gap-px` over a `bg-border` backing rather than `divide-x`: the grid drops
 * to two columns on a phone, and `divide-x` only knows about columns, so the
 * wrapped row would have had no rule above it. This draws every seam at any
 * column count with no wrap-specific CSS.
 */
export function StatStrip({
  children,
  columns = 4,
}: {
  children: React.ReactNode;
  columns?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border",
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
      )}
    >
      {children}
    </div>
  );
}

/**
 * The two-column grid every admin queue uses.
 *
 * At 1192px a single-column list gives a name and one truncated sentence an
 * ~1150px row, which is most of the panel's width spent on nothing (owner,
 * 2026-08-04: "there's so much wide space. Maybe the messages can be in two
 * column layout"). Grid's default `stretch` keeps the two cards on a line the
 * same height, so a two-line row beside a three-line one reads as a pair
 * rather than a step.
 */
export const ADMIN_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2";
