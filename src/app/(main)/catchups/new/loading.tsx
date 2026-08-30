/* Mirrors the real page (new/page.tsx + create-catchup-form.tsx): the bare
   title, then ONE card at the centered column's full 768px, laid out as the
   form's own `340px 1fr` grid -- Name and Rhythm stacked on the left, With
   spanning both rows on the right, and the left-aligned pill closing the
   form across both columns.

   It was a max-w-xl single-column stack, from before the card was widened on
   2026-08-29, so the page grew by 192px and rearranged itself into two
   columns the moment the form landed. It also had auto side margins and no
   `w-full`, which in a flex column is shrink-to-fit rather than stretch, so
   it never even held the 576 it asked for. */
export default function NewCatchupLoading() {
  return (
    <div>
      <header className="mb-6">
        <div className="skeleton-warm h-8 w-56 rounded-md" />
      </header>

      <div className="card-elevated grid grid-cols-1 gap-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:grid-cols-[340px_1fr] sm:p-[var(--space-l)]">
        {/* Name */}
        <div className="sm:col-start-1 sm:row-start-1">
          <div className="skeleton-warm h-3 w-16 rounded-full" />
          <div className="skeleton-warm mt-[var(--space-xs)] h-10 w-full rounded-[var(--radius-input)]" />
        </div>

        {/* With: the search field, the batch shortcut, then you */}
        <div className="sm:col-start-2 sm:row-start-1 sm:row-span-2">
          <div className="skeleton-warm h-3 w-16 rounded-full" />
          <div className="mt-[var(--space-xs)] space-y-3">
            <div className="skeleton-warm h-10 w-full rounded-[var(--radius-input)]" />
            <div className="skeleton-warm h-[30px] w-40 rounded-full" />
            <div className="skeleton-warm h-[34px] w-36 rounded-full" />
          </div>
        </div>

        {/* Rhythm: one segmented pill, not a full-width field */}
        <div className="sm:col-start-1 sm:row-start-2">
          <div className="skeleton-warm h-3 w-20 rounded-full" />
          <div className="skeleton-warm mt-[var(--space-xs)] h-10 w-64 max-w-full rounded-full" />
        </div>

        <div className="flex items-center pt-[var(--space-l)] sm:col-span-2 sm:row-start-3">
          <div className="skeleton-warm h-10 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
