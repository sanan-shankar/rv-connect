/**
 * The admin panel's loading state, in one place so nine routes cannot each
 * invent their own.
 *
 * Warm shimmer (`skeleton-warm`), never the grey pulse: the house rule for
 * every async route. `rows` and `columns` are the only knobs, because the
 * point of a skeleton is to hold the shape of what is arriving, and every
 * admin section arrives as a title, a toolbar and a list of cards.
 */
export function AdminSkeleton({
  rows = 6,
  columns = 2,
  toolbar = true,
}: {
  rows?: number;
  columns?: 1 | 2;
  toolbar?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Matches PageHeader's 30px title, so nothing jumps when the real one
          lands under it. */}
      <div className="skeleton-warm h-[30px] w-40 rounded-md" />

      {toolbar && (
        <div className="flex gap-2">
          <div className="skeleton-warm h-10 w-full max-w-xs rounded-[var(--radius-input)]" />
          <div className="skeleton-warm h-10 w-24 rounded-full" />
        </div>
      )}

      <div
        className={
          columns === 2
            ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
            : "flex flex-col gap-2"
        }
      >
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
          >
            <div className="skeleton-warm size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="skeleton-warm h-3.5 w-32 rounded-md" />
              <div className="skeleton-warm mt-1.5 h-3 w-48 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
