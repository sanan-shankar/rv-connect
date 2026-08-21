/* /support reads the running contribution total before it can paint, and that
   is an aggregate over the whole table (audit M06). The tiles keep their own
   footprint so the recovery figure does not shove the page down when it
   lands. */
export default function SupportLoading() {
  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-2">
        <div className="skeleton-warm h-8 w-48 rounded-md" />
        <div className="skeleton-warm h-4 w-72 rounded-md" />
      </div>
      <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <div className="skeleton-warm h-3 w-24 rounded-md" />
        <div className="skeleton-warm mt-3 h-10 w-40 rounded-md" />
        <div className="skeleton-warm mt-4 h-2.5 w-full rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-warm h-4 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
