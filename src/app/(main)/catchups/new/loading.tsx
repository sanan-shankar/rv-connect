/* Mirrors the real page exactly: one max-w-xl measure centred inside the
   768px CENTERED column (see new/page.tsx), a bare title, then the single
   form card with its three label+field pairs and a LEFT-aligned pill
   button (create-catchup-form.tsx; the owner ruled the button left-aligned
   and the rule above it removed, 2026-07-25). The old skeleton was a
   1024px two-column layout with a preview rail card and a right-aligned
   CTA, none of which exists any more, so the page visibly jumped left and
   narrowed when the real content landed. */
export default function NewCatchupLoading() {
  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6">
        <div className="skeleton-warm h-8 w-56 rounded-md" />
      </header>

      <div className="space-y-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
        {/* Name */}
        <div className="space-y-2">
          <div className="skeleton-warm h-3 w-16 rounded-full" />
          <div className="skeleton-warm h-10 w-full rounded-[var(--radius-input)]" />
        </div>
        {/* With (people picker trigger) */}
        <div className="space-y-2">
          <div className="skeleton-warm h-3 w-16 rounded-full" />
          <div className="skeleton-warm h-10 w-full rounded-[var(--radius-input)]" />
        </div>
        {/* Rhythm (segmented pill row) */}
        <div className="space-y-2">
          <div className="skeleton-warm h-3 w-20 rounded-full" />
          <div className="skeleton-warm h-10 w-64 max-w-full rounded-full" />
        </div>
        {/* "Start the first Round", left-aligned like the real button */}
        <div className="flex items-center pt-[var(--space-l)]">
          <div className="skeleton-warm h-10 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}
