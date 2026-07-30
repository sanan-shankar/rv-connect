import { RAIL_GRID, RAIL_ASIDE } from "@/components/layout/rail-grid";

/* Mirrors the shape of the Catch-ups index exactly: the header row inside
   the rail grid (title left; from 1280px the Ask/Answer/Read pill plus the
   canopy CTA on the right, per the header-pill handoff in
   explainer-band.tsx), the pill's own fallback row below 1280, then the
   cards column and the rail. Skeleton widths approximate the common
   has-Catch-ups state, so the page does not shift when the real one lands. */
export default function CatchupsLoading() {
  return (
    <div>
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          <header className="mb-6 flex flex-nowrap items-start justify-between gap-4">
            <div className="skeleton-warm h-8 w-40 rounded-md" />
            <div className="flex flex-nowrap items-center gap-2.5">
              {/* 36px tall, matching the real pill (py-2 on a 12px line). */}
              <div className="skeleton-warm hidden h-9 w-40 rounded-full min-[1280px]:block" />
              {/* The "Start a Catch-up" canopy pill: h-10, ~146px wide. */}
              <div className="skeleton-warm h-10 w-36 rounded-full" />
            </div>
          </header>
        </div>
      </div>

      <div className="mb-[var(--space-l)] min-[1280px]:hidden">
        <div className="skeleton-warm h-9 w-64 max-w-full rounded-full" />
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
