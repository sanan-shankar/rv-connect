export default function CatchupHomeLoading() {
  return (
    <div>
      <header className="mb-6 space-y-2">
        <div className="skeleton-warm h-8 w-56 rounded-md" />
        <div className="skeleton-warm h-4 w-96 max-w-full rounded-md" />
      </header>

      <div className="grid items-start gap-x-6 gap-y-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-[var(--radius)] border border-border bg-card p-6">
            <div className="skeleton-warm h-3 w-32 rounded-full" />
            <div className="mt-4 flex items-center gap-3.5">
              <div className="skeleton-warm h-14 w-14 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <div className="skeleton-warm h-4 w-40 rounded-md" />
                <div className="skeleton-warm h-3 w-24 rounded-md" />
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-6">
            <div className="skeleton-warm h-4 w-44 rounded-md" />
            <div className="skeleton-warm mt-3 h-20 w-full rounded-md" />
            <div className="mt-3 flex items-center justify-between">
              <div className="skeleton-warm h-7 w-40 rounded-full" />
              <div className="skeleton-warm h-9 w-28 rounded-full" />
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-6 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-warm h-14 w-full rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[var(--radius)] border border-border bg-card p-5 space-y-2.5">
            <div className="skeleton-warm h-3 w-28 rounded-full" />
            <div className="skeleton-warm h-9 w-full rounded-full" />
            <div className="skeleton-warm h-9 w-full rounded-full" />
          </div>
          <div className="rounded-[var(--radius)] border border-border bg-card p-5 space-y-2.5">
            <div className="skeleton-warm h-3 w-24 rounded-full" />
            <div className="skeleton-warm h-8 w-full rounded-full" />
          </div>
          <div className="rounded-[var(--radius)] border border-border bg-card p-5 space-y-2.5">
            <div className="skeleton-warm h-3 w-20 rounded-full" />
            {[1, 2].map((i) => (
              <div key={i} className="skeleton-warm h-16 w-full rounded-[var(--radius-md)]" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
