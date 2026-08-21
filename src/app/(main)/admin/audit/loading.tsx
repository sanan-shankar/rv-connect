/* The audit log is the one admin page with no loading state, and it reads the
   largest table on the site (audit M06). Rows, because that is what it is. */
export default function AuditLoading() {
  return (
    <div className="space-y-[var(--space-m)]">
      <div className="skeleton-warm h-8 w-36 rounded-md" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-[var(--radius-md)] border border-border bg-card p-3">
            <div className="skeleton-warm h-3.5 w-2/3 rounded-md" />
            <div className="skeleton-warm mt-2 h-3 w-1/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
