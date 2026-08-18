/* Warm shimmer while the eligibility read runs: the header block and the
   first rows of the picker grid, so the page's shape is promised before its
   data lands. Never the grey pulse. */
export default function PickBirdLoading() {
  return (
    <div className="pb-[var(--space-xl)]">
      <div className="mb-6">
        <div className="skeleton-warm h-[30px] w-56 rounded-[var(--radius-sm)]" />
        <div className="skeleton-warm mt-2 h-4 w-80 max-w-full rounded-[var(--radius-sm)]" />
      </div>
      <div className="grid grid-cols-3 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-4 md:grid-cols-5">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-[var(--space-xs)] p-[var(--space-s)]">
            <div className="skeleton-warm aspect-square w-full max-w-[96px] rounded-full" />
            <div className="skeleton-warm h-3.5 w-20 rounded-[var(--radius-sm)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
