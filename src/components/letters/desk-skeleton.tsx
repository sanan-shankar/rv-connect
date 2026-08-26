/**
 * The letter desk, before it arrives: the back-link line, then the paper
 * sheet with a title and three lines of body.
 *
 * Writing and editing a letter are the same desk, so they had the same
 * skeleton -- byte for byte, down to the `NewLetterLoading` function name in
 * the edit route's copy. One shape, one file; the two `loading.tsx` files stay
 * because Next resolves them by convention, and are now the wrapper that says
 * which route they belong to.
 *
 * If the two desks ever diverge on screen, this splits again as easily as it
 * merged.
 */
export function LetterDeskSkeleton() {
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
