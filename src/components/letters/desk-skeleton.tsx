/**
 * The letter desk, before it arrives: the back-link line, then the paper
 * sheet with a title, a few lines of body, and the row of controls along the
 * bottom.
 *
 * Writing and editing a letter are the same desk, so they had the same
 * skeleton -- byte for byte, down to the `NewLetterLoading` function name in
 * the edit route's copy. One shape, one file; the two `loading.tsx` files stay
 * because Next resolves them by convention, and are now the wrapper that says
 * which route they belong to.
 *
 * It has to hold the desk's OWN measurements or the wait is a jump rather than
 * an arrival. Two of them were wrong: without `w-full` this box is a flex item
 * with auto side margins, which does not stretch, and every bar inside it is a
 * percentage -- so the sheet collapsed to its own padding and shimmered as a
 * sliver. And the sheet was three lines tall against a desk whose editor alone
 * reserves 55vh, so the paper trebled in height the moment it landed.
 *
 * If the two desks ever diverge on screen, this splits again as easily as it
 * merged.
 */
export function LetterDeskSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="mb-5 flex items-center justify-between">
        <div className="skeleton-warm h-5 w-24 rounded-[var(--radius-sm)]" />
      </div>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-5 py-8 sm:px-14 sm:py-12">
        {/* The title line, then the body on the editor's own floor
            (create-post-form.tsx: minHeight 55vh when immersive). Together
            with the row below, that is the sheet's real height -- measured at
            683px on a 900px viewport, against the 214px this used to be. */}
        <div className="skeleton-warm h-9 w-2/3 rounded-[var(--radius-sm)]" />
        <div className="mt-2 min-h-[55vh] space-y-3">
          <div className="skeleton-warm h-4 w-full rounded-[var(--radius-sm)]" />
          <div className="skeleton-warm h-4 w-11/12 rounded-[var(--radius-sm)]" />
          <div className="skeleton-warm h-4 w-4/5 rounded-[var(--radius-sm)]" />
        </div>
        {/* The control row: two icon buttons left, "Save as draft" and
            "Publish letter" right, at the sizes they land at. */}
        <div className="mt-2 flex h-10 items-center gap-3">
          <div className="skeleton-warm h-9 w-9 rounded-full" />
          <div className="skeleton-warm h-9 w-9 rounded-full" />
          <div className="ml-auto flex items-center gap-3">
            <div className="skeleton-warm h-10 w-[108px] rounded-full" />
            <div className="skeleton-warm h-10 w-[122px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
