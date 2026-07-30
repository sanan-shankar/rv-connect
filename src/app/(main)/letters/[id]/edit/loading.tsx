export default function NewLetterLoading() {
  /* The desk's own geometry: back-link line, then the paper sheet. */
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-5 flex items-center justify-between">
        <div className="skeleton-warm h-4 w-24 rounded-[var(--radius-sm)]" />
      </div>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-5 py-8 sm:px-14 sm:py-12">
        <div className="skeleton-warm mb-4 h-9 w-2/3 rounded-[var(--radius-sm)]" />
        <div className="space-y-3">
          <div className="skeleton-warm h-4 w-full rounded-[var(--radius-sm)]" />
          <div className="skeleton-warm h-4 w-11/12 rounded-[var(--radius-sm)]" />
          <div className="skeleton-warm h-4 w-4/5 rounded-[var(--radius-sm)]" />
        </div>
      </div>
    </div>
  );
}
