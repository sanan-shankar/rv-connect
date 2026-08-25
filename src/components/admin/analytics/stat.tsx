import { cn } from "@/lib/utils";
import type { Trend } from "@/lib/admin-analytics";

/* ------------------------------------------------------------------ *
 *  The analytics room's four primitives.
 *
 *  Built against the owner's complaint about the tools this replaces:
 *  "a lot of white space, a lot of tiles that are full width when it can
 *  be in columns". So every one of these is DENSE by default and none of
 *  them is full-bleed. A tile is 1/4 of a row on desktop, and the grid
 *  reflows to 2 on tablet and 2 on phone rather than 1 -- a column of
 *  single numbers down a phone is the exact shape being avoided.
 *
 *  The other rule: nothing draws an empty chart. A sparkline with one
 *  point is a dot, not a line, and a chart box with no data in it is
 *  worse than no chart, so Sparkline renders nothing below two points.
 * ------------------------------------------------------------------ */

/** Indian grouping: 5,530 not 5.53k, and 1,20,000 not 120,000. */
const nf = new Intl.NumberFormat("en-IN");

function formatValue(value: number, kind?: Stat["kind"]): string {
  switch (kind) {
    case "money":
      /* Paise in, rupees out. The unit is stored as paise everywhere
         (Contribution.amount) because that is what Razorpay counts in. */
      return `₹${nf.format(Math.round(value / 100))}`;
    case "percent":
      return `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`;
    case "ratio":
      return value.toFixed(1);
    default:
      return nf.format(Math.round(value));
  }
}

export type Stat = {
  label: string;
  value: number;
  kind?: "count" | "money" | "percent" | "ratio";
  /** One short clause under the number. Says what it MEANS, never repeats it. */
  hint?: string;
  trend?: Trend;
  /** Draws attention without inventing a colour: leaf good, cinnamon waiting. */
  tone?: "good" | "warn" | "bad";
};

const TONE = {
  good: "text-leaf",
  warn: "text-cinnamon",
  bad: "text-destructive",
} as const;

function StatTile({ stat }: { stat: Stat }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-3">
      <p className="truncate text-[11.5px] font-medium uppercase tracking-[0.055em] text-muted-foreground">
        {stat.label}
      </p>
      <p
        className={cn(
          "font-display text-[26px] leading-[1.05] tabular-nums text-foreground",
          stat.tone && TONE[stat.tone],
        )}
      >
        {formatValue(stat.value, stat.kind)}
      </p>
      {stat.trend && stat.trend.length > 1 && (
        <Sparkline trend={stat.trend} tone={stat.tone} />
      )}
      {stat.hint && (
        <p className="text-[11.5px] leading-snug text-muted-foreground">{stat.hint}</p>
      )}
    </div>
  );
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <StatTile key={s.label} stat={s} />
      ))}
    </div>
  );
}

/**
 * A sparkline, drawn as a path in a 100x20 viewBox and stretched.
 *
 * No axes, no labels, no grid. The shape is the whole message: a tile
 * already carries the current number, and this only has to say whether it
 * has been climbing. preserveAspectRatio="none" lets it fill any width
 * without the stroke thickening, which is why the stroke is set in the
 * parent's units rather than px.
 */
function Sparkline({ trend, tone }: { trend: Trend; tone?: Stat["tone"] }) {
  if (trend.length < 2) return null;

  const values = trend.map((t) => t.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  /* A flat line would divide by zero and, drawn at full height, would also
     lie: it would look like a peak. Held at mid-height instead. */
  const span = max - min || 1;

  const points = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * 100;
    const y = 20 - ((t.value - min) / span) * 18 - 1;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      className="h-5 w-full"
      aria-hidden="true"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          tone ? TONE[tone] : rising ? "text-leaf" : "text-muted-foreground",
          "stroke-current",
        )}
      />
    </svg>
  );
}

/**
 * A ranked list as proportional bars.
 *
 * Replaces the pie chart this would otherwise be. A pie of eight cities is
 * unreadable and a bar list is scannable, sortable and takes half the
 * height -- which is the whole complaint about the tools being replaced.
 */
export function BarList({
  items,
  total,
  unit,
  empty = "Nothing yet.",
}: {
  items: { label: string; value: number; hint?: string }[];
  /** Bars are drawn against the LARGEST value, not the sum, so the shape of
      the distribution is legible even when one entry dominates. */
  total?: number;
  /** Appended to every value. Without it a percentage renders as a bare "2",
      which reads as a count -- the retention panel said "2" and meant 2%. */
  unit?: string;
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">{empty}</p>;
  }
  const max = total ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="flex flex-col gap-1">
      {items.map((i) => (
        <li key={`${i.label}-${i.hint ?? ""}`} className="relative flex items-center gap-2">
          {/* The bar sits BEHIND the text rather than beside it, so the row
              stays one line and the list stays dense. */}
          <div
            className="absolute inset-y-0 left-0 rounded-[var(--radius-sm)] bg-leaf/[0.13]"
            style={{ width: `${Math.max((i.value / max) * 100, 2)}%` }}
            aria-hidden="true"
          />
          <span className="relative z-10 min-w-0 flex-1 truncate py-1 pl-2 text-[12.5px] text-foreground">
            {i.label}
            {i.hint && <span className="ml-1.5 text-muted-foreground">{i.hint}</span>}
          </span>
          <span className="relative z-10 shrink-0 pr-2 text-[12.5px] tabular-nums text-muted-foreground">
            {nf.format(i.value)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A titled block.
 *
 * `cap` is what makes a grid of these survive real data. Panels sized by their
 * content give every row a ragged bottom edge, and one list that happens to be
 * long (forty people online, twelve cities) drags its whole row with it. A
 * capped panel scrolls its own overflow instead, so the page's shape is a
 * property of the LAYOUT rather than of whatever the numbers happen to be
 * today -- which is the difference between a page that looks fine now and one
 * that still looks fine at two thousand members.
 */
export function Panel({
  title,
  note,
  children,
  className,
  cap = true,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
  /** Set false for a panel whose content is inherently short and fixed. */
  cap?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-3",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[12.5px] font-semibold text-foreground">{title}</h3>
        {note && <p className="text-[11.5px] leading-snug text-muted-foreground">{note}</p>}
      </div>
      {/* -mx/px pair so a scrollbar sits at the panel edge rather than
          insetting the content away from it. */}
      <div className={cn(cap && "-mx-1 max-h-[264px] overflow-y-auto px-1")}>{children}</div>
    </section>
  );
}
