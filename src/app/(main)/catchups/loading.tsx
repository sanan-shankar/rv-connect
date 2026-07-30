/* Mirrors the shape of the Catch-ups index exactly: a bare "Catch-ups"
   h1 with no sub-line, the Ask/Answer/Read strip, then the cards column
   and the rail. Nothing here stands in for copy that no longer exists,
   so the skeleton does not shift when the real page lands. */
export default function CatchupsLoading() {
  return (
    <div>
      <header className="mb-6">
        <div className="skeleton-warm h-8 w-40 rounded-md" />
      </header>

      <div className="mb-[var(--space-l)]">
        {/* 36px tall, matching the real pill (py-2 on a 12px line), so the
            strip does not resize under the cards when the page lands. */}
        <div className="skeleton-warm h-9 w-64 max-w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-x-[30px] gap-y-[var(--space-m)] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
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
        <aside className="hidden min-[1180px]:block">
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
