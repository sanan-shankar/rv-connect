import type { LucideIcon } from "lucide-react";

export interface AdminStat {
  label: string;
  value: number;
  icon: LucideIcon;
}

/**
 * The six counts at the top of the admin panel, as ONE strip rather than six
 * cards (owner, 2026-08-04: "they have to be much smaller because they don't
 * need to be this huge tile").
 *
 * What was wrong: six `<Card>`s in a 4-column grid, so six two-digit numbers
 * cost two rows and ~196px, and the second row ran half empty because six does
 * not divide by four. Six columns fixes the ragged row, and folding them into
 * one bordered strip removes five card borders and five drop shadows from the
 * first thing you see.
 *
 * The hairlines are `gap-px` over a `bg-border` backing rather than
 * `divide-x`: the grid drops to three columns on mobile, and divide-x only
 * knows about columns, so the wrapped row would have had no rule above it.
 * This way every seam is drawn, at any column count, with no wrap-specific CSS.
 */
export function AdminStats({ stats }: { stats: AdminStat[] }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-6">
      {stats.map((s) => (
        <div key={s.label} className="bg-card px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <s.icon className="size-3.5 shrink-0 text-leaf" strokeWidth={2} />
            {/* Tabular figures: these sit in a row and should not jiggle their
                own column when a count crosses a digit. */}
            <span className="text-[19px] font-semibold leading-none tabular-nums text-foreground">
              {s.value}
            </span>
          </div>
          <p className="mt-1.5 truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
