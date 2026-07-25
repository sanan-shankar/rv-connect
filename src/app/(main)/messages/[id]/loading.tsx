export default function ThreadLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton-warm mb-6 h-5 w-36 rounded-md" />

      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center gap-3 bg-canopy px-5 py-4 sm:px-6 sm:py-5">
          <div className="size-9 shrink-0 rounded-full bg-white/15" />
          <div className="h-4 w-56 rounded-md bg-white/15" />
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton-warm size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton-warm h-3.5 w-40 rounded-md" />
                <div className="skeleton-warm h-16 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
