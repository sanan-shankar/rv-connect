import { RAIL_GRID, RAIL_ASIDE } from "@/components/layout/rail-grid";

/* Mirrors the shape of the Catch-ups index: the header row, cards column,
   and rail. Skeleton widths approximate the common has-Catch-ups state,
   so the page does not shift when the real one lands. */
export default function CatchupsLoading() {
  return (
    <div>
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          <header className="mb-6 flex flex-nowrap items-start justify-between gap-4">
            <div className="skeleton-warm h-8 w-40 rounded-md" />
            <div className="flex flex-nowrap items-center gap-2.5">
              {/* The "Start a Catch-up" canopy pill: h-10, ~146px wide. */}
              <div className="skeleton-warm h-10 w-36 rounded-full" />
            </div>
          </header>
        </div>
      </div>

      <div className={`${RAIL_GRID} gap-y-[var(--space-m)]`}>
        <div className="min-w-0 space-y-3.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]"
            >
              <div className="skeleton-warm h-5 w-40 rounded-md" />
              <div className="mt-2 flex items-center gap-2.5">
                <div className="skeleton-warm h-7 w-7 rounded-full" />
                <div className="skeleton-warm h-7 w-7 rounded-full" />
                <div className="skeleton-warm h-3 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <aside className={RAIL_ASIDE}>
          <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
            <div className="skeleton-warm h-3 w-32 rounded-full" />
            {[1, 2].map((i) => (
              <div key={i} className="mt-4 space-y-1.5">
                <div className="skeleton-warm h-3 w-full rounded-md" />
                <div className="skeleton-warm h-3 w-2/3 rounded-md" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
