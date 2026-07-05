export default function NewCatchupLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 space-y-2">
        <div className="skeleton-warm h-8 w-52 rounded-md" />
        <div className="skeleton-warm h-4 w-80 max-w-full rounded-md" />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-7 rounded-[var(--radius)] border border-border bg-card p-6 sm:p-7">
          <div className="space-y-2">
            <div className="skeleton-warm h-3 w-16 rounded-full" />
            <div className="skeleton-warm h-9 w-48 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="skeleton-warm h-3 w-16 rounded-full" />
            <div className="skeleton-warm h-9 w-64 rounded-full" />
          </div>
          <div className="space-y-2.5">
            <div className="skeleton-warm h-3 w-28 rounded-full" />
            <div className="skeleton-warm h-14 w-full rounded-md" />
            <div className="skeleton-warm h-14 w-full rounded-md" />
          </div>
          <div className="flex justify-end border-t border-border pt-5">
            <div className="skeleton-warm h-11 w-44 rounded-full" />
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-5">
          <div className="skeleton-warm h-3 w-16 rounded-full" />
          <div className="skeleton-warm mt-3 h-5 w-40 rounded-md" />
          <div className="skeleton-warm mt-4 h-16 w-full rounded-md" />
          <div className="skeleton-warm mt-2.5 h-16 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
