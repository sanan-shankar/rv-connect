/**
 * The directory's own shape, held for the few hundred milliseconds the query
 * takes.
 *
 * It used to be a search bar, three filter pills and six profile cards in a
 * grid -- the page as it looked before the map became the default view. So
 * every visit flashed a card grid and then rearranged itself into a map
 * (owner, 2026-08-28: "there's a weird glitch on the page for a few
 * milliseconds it looks different then adjusts"). A skeleton that does not
 * match the page it is standing in for is worse than none: it animates a
 * layout change that never actually happened.
 *
 * So: the title line, the view toggle, and the map card filling the rest of
 * the column, at the same heights the real ones occupy. The map slot is not a
 * shimmer but the ocean colour the map itself paints first, so the swap is a
 * world appearing on water rather than a rectangle changing colour.
 */
export default function DirectoryLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Title line: the h1 on the left, the search and filter buttons right. */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="skeleton-warm h-10 w-[150px] rounded-md" />
        <div className="flex items-center gap-2">
          <div className="skeleton-warm h-10 w-10 rounded-full" />
          <div className="skeleton-warm h-10 w-[86px] rounded-full" />
        </div>
      </div>
      {/* Map / Batches / People, and the headcount opposite it. */}
      <div className="mb-4 flex h-[52px] items-center justify-between gap-4">
        <div className="skeleton-warm h-[44px] w-[218px] rounded-full" />
        <div className="skeleton-warm h-4 w-[70px] rounded-md" />
      </div>
      <div
        className="card-elevated flex-1 rounded-[var(--radius)] border border-border bg-muted"
        style={{ minHeight: 360 }}
      />
    </div>
  );
}
