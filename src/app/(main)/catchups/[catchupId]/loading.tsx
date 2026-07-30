/* Mirrors the Catch-up home's real shape: a title with no subtitle under it,
   one plain status line, the question box, the question list, and a rail of
   the member's own settings. Same symmetric tile padding as the live screen. */
export default function CatchupHomeLoading() {
  return (
    <div>
      <header className="mb-6">
        <div className="skeleton-warm h-8 w-56 rounded-md" />
      </header>

      <div className="grid items-start gap-x-[var(--space-l)] gap-y-[var(--space-m)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-[var(--space-m)]">
          <div className="skeleton-warm h-4 w-48 rounded-md" />

          <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
            <div className="skeleton-warm h-4 w-44 rounded-md" />
            <div className="skeleton-warm mt-[var(--space-s)] h-[6.5rem] w-full rounded-[var(--radius-input)]" />
            <div className="mt-[var(--space-m)] flex items-center justify-between gap-[var(--space-s)]">
              <div className="skeleton-warm h-8 w-56 rounded-full" />
              <div className="skeleton-warm h-9 w-28 rounded-full" />
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
            <div className="skeleton-warm h-4 w-40 rounded-md" />
            <div className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-warm h-14 w-full rounded-[var(--radius-md)]" />
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-[var(--space-m)]">
          <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
            <div className="skeleton-warm h-3 w-24 rounded-full" />
            <div className="skeleton-warm mt-[var(--space-s)] h-8 w-full rounded-full" />
          </div>
          <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
            <div className="skeleton-warm h-3 w-28 rounded-full" />
            <div className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton-warm h-16 w-full rounded-[var(--radius-md)]" />
              ))}
            </div>
          </div>
          <div className="skeleton-warm mx-auto h-8 w-24 rounded-full" />
        </aside>
      </div>
    </div>
  );
}
