export default function FeedLoading() {
  return (
    <div className="grid grid-cols-1 gap-x-[30px] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
      <div className="min-w-0 space-y-6">
      {/* Create post skeleton */}
      <div className="rounded-[var(--radius)] border border-border bg-card p-6">
        <div className="skeleton-warm h-20 w-full rounded-md" />
      </div>

      {/* Post skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="skeleton-warm h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton-warm h-4 w-32 rounded-md" />
              <div className="skeleton-warm h-3 w-20 rounded-md" />
            </div>
          </div>
          <div className="skeleton-warm mt-4 h-16 w-full rounded-md" />
          <div className="mt-4 flex gap-4 border-t border-border pt-3">
            <div className="skeleton-warm h-4 w-12 rounded-md" />
            <div className="skeleton-warm h-4 w-12 rounded-md" />
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
