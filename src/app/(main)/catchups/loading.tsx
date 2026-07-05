export default function CatchupsLoading() {
  return (
    <div>
      <header className="mb-6 space-y-2">
        <div className="skeleton-warm h-8 w-40 rounded-md" />
        <div className="skeleton-warm h-4 w-96 max-w-full rounded-md" />
      </header>

      <div className="mb-7 rounded-[var(--radius)] border border-border bg-card p-6 sm:p-8">
        <div className="skeleton-warm h-3 w-20 rounded-full" />
        <div className="skeleton-warm mt-3 h-4 w-full max-w-lg rounded-md" />
        <div className="skeleton-warm mt-2 h-4 w-2/3 max-w-md rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
        <div className="min-w-0 space-y-3.5">
          <div className="skeleton-warm h-3 w-28 rounded-full" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-5">
              <div className="skeleton-warm h-5 w-40 rounded-md" />
              <div className="mt-3 flex items-center gap-2">
                <div className="skeleton-warm h-7 w-7 rounded-full" />
                <div className="skeleton-warm h-7 w-7 rounded-full" />
                <div className="skeleton-warm h-3 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <aside className="hidden min-[1180px]:block">
          <div className="rounded-[var(--radius)] border border-border bg-card p-4">
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
