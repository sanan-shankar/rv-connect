/* ------------------------------------------------------------------ *
 *  /lab loading state, and every room under it (no deeper loading.tsx
 *  exists, so this is the boundary for the whole tree).
 *
 *  This is a reliability fix, not decoration: the lab tree is ~28k
 *  lines of TSX and rooms compile on demand in dev, so before this
 *  boundary existed a first click on a heavy room painted NOTHING for
 *  seconds and read as "the lab doesn't load" (the owner's 60%
 *  complaint). The skeleton mirrors the index's own shape (header,
 *  pill controls, card grid) so /lab lands where the shimmer stood;
 *  for rooms it is simply an instant, honest "something is coming".
 * ------------------------------------------------------------------ */
export default function LabLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-12">
        {/* eyebrow, title, intro */}
        <div className="skeleton-warm h-3 w-16 rounded-[var(--radius-sm)]" />
        <div className="skeleton-warm mt-3 h-9 w-32 rounded-[var(--radius-sm)]" />
        <div className="skeleton-warm mt-4 h-4 w-full max-w-[480px] rounded-[var(--radius-sm)]" />

        {/* the tabs pill and the search pill */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="skeleton-warm h-10 w-48 rounded-full" />
          <div className="skeleton-warm h-10 w-full min-w-[240px] flex-1 rounded-full sm:max-w-sm" />
        </div>

        {/* card grid; six is one row of three on desktop twice, enough to fill
           the fold without pretending to know the real count */}
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] border border-border bg-card p-[18px]"
            >
              <div className="skeleton-warm h-5 w-3/4 rounded-[var(--radius-sm)]" />
              <div className="skeleton-warm mt-3 h-3.5 w-full rounded-[var(--radius-sm)]" />
              <div className="skeleton-warm mt-2 h-3.5 w-2/3 rounded-[var(--radius-sm)]" />
              <div className="mt-4 flex items-center justify-between">
                <div className="skeleton-warm h-3 w-24 rounded-[var(--radius-sm)]" />
                <div className="skeleton-warm h-3 w-12 rounded-[var(--radius-sm)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
