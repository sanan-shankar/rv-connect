/**
 * The profile's loading state, shaped like the letterhead it precedes: one
 * sheet with the colophon / name / facts block, then the segmented switcher,
 * then free-standing post cards. The skeleton is the page with the ink
 * drained out rather than a rough sketch of it, so nothing re-corners,
 * re-pads or jumps when the real page swaps in.
 */
export default function ProfileLoading() {
  return (
    <div>
      {/* The sheet: same radius, border and equal padding as the real one. */}
      <div className="rounded-[var(--radius-2xl)] border border-border bg-card p-6 sm:p-10">
        {/* colophon */}
        <div className="skeleton-warm h-4 w-24 rounded-md" />
        {/* name */}
        <div className="skeleton-warm mt-[var(--space-s)] h-10 w-64 max-w-full rounded-md sm:h-11" />
        {/* occupation */}
        <div className="skeleton-warm mt-[var(--space-s)] h-4 w-52 max-w-full rounded-md" />

        {/* the three facts */}
        <div className="mt-[var(--space-l)] grid grid-cols-2 gap-x-[var(--space-l)] gap-y-[var(--space-m)] sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
              <div className="skeleton-warm h-3 w-16 rounded-md" />
              <div className="skeleton-warm mt-[var(--space-xs)] h-5 w-28 max-w-full rounded-md" />
            </div>
          ))}
        </div>

        {/* about */}
        <div className="mt-[var(--space-l)]">
          <div className="skeleton-warm h-3 w-14 rounded-md" />
          <div className="skeleton-warm mt-[var(--space-s)] h-4 w-full rounded-md" />
          <div className="skeleton-warm mt-2 h-4 w-full rounded-md" />
          <div className="skeleton-warm mt-2 h-4 w-3/4 rounded-md" />
        </div>
      </div>

      {/* the segmented switcher */}
      <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
        <div className="skeleton-warm h-10 w-[19rem] max-w-full rounded-full" />

        {/* free-standing post cards */}
        <div className="mt-[var(--space-m)] space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="skeleton-warm h-10 w-10 rounded-full" />
                <div>
                  <div className="skeleton-warm h-4 w-32 rounded-md" />
                  <div className="skeleton-warm mt-2 h-3 w-20 rounded-md" />
                </div>
              </div>
              <div className="skeleton-warm mt-4 h-14 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
