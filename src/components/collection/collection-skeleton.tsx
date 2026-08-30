/**
 * The Collection before it arrives: the title, then the grid.
 *
 * Shared by /collection and /collection/<id> because they are the SAME page.
 * Since the 2026-08-28 viewer rebuild a photograph's address renders the
 * Collection with the viewer already open on it, and the permalink's skeleton
 * had never been updated -- it still drew the old detail page, a back link
 * above a 4/3 card in a narrow column, which had not existed for two days.
 * Nobody saw it, because `collection/loading.tsx` was painting over it (see
 * `src/lib/loading-boundary-rule.test.mjs`); the day that stopped being true
 * was the day it had to be right.
 */
export function CollectionSkeleton() {
  return (
    <div>
      <header className="mb-6">
        <div className="skeleton-warm h-8 w-64 rounded-md" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="skeleton-warm aspect-square rounded-[var(--radius)]" />
        ))}
      </div>
    </div>
  );
}
