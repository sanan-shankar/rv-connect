/**
 * The review room's own skeleton, and not `AdminSkeleton`.
 *
 * That component holds the shape every other admin route arrives in -- a
 * title, a toolbar and a list of cards -- and this room arrives as a
 * photograph with a form beside it. A list skeleton here would rearrange
 * itself into something else entirely on the frame the data lands, which is
 * the one thing a skeleton exists to prevent.
 */
export default function AdminReviewLoading() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-5">
      {/* PageHeader's 30px title, so nothing jumps under it. */}
      <div className="skeleton-warm h-[30px] w-32 rounded-md" />

      <div className="flex items-center gap-4">
        <div className="skeleton-warm h-9 w-52 rounded-full" />
        <div className="skeleton-warm h-8 w-28 rounded-full" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="skeleton-warm min-h-[38svh] flex-1 rounded-[var(--radius-lg)] lg:min-h-0" />
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[380px]">
          <div className="min-h-0 flex-1 rounded-[var(--radius-lg)] border border-border bg-card p-4">
            <div className="skeleton-warm h-3.5 w-40 rounded-md" />
            {/* The six bucket tiles, three across, exactly where they land. */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton-warm aspect-[4/3] rounded-[var(--radius-md)]" />
              ))}
            </div>
            <div className="skeleton-warm mt-5 h-28 rounded-[var(--radius-input)]" />
          </div>
          <div className="flex shrink-0 gap-2.5">
            <div className="skeleton-warm h-12 flex-1 rounded-full" />
            <div className="skeleton-warm h-12 flex-1 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
