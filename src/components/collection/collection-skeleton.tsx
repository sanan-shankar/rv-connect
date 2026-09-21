import { PageHeader } from "@/components/layout/page-header";
import { PhotoStream } from "@/components/common/photo-rows";
import { ButtonSkeleton } from "@/components/common/skeleton";
import { BUCKETS, HALVES } from "@/lib/collection";

/**
 * The Collection before it arrives: collection-client.tsx's own page, with
 * the photographs not yet in it.
 *
 * It had been a title bar over eight rounded squares in a four-column grid
 * with a 12px gap, which is not what the page has looked like since the river
 * replaced the grid: no search or Contribute, no bucket line, no order, no
 * year rail, and tiles in a shape and a spacing the archive does not use.
 *
 * Now each part is the real one's own geometry. The title is the real title
 * through the real PageHeader (the valley half's, which is where the address
 * lands unless it asks for the other). The bucket words and the order are
 * their own boxes with the words set invisible, so every placeholder is as
 * wide as the word it stands for. The river is the real PhotoStream at the
 * river's 4px gap, square-cornered like every tile in the archive, fed a run
 * of ordinary photograph shapes, so the rows break and justify exactly the
 * way a real river's do at every width. The year rail keeps its 92px column
 * from xl up, so the river is the width it will be.
 */
export function CollectionSkeleton() {
  return (
    <div>
      <PageHeader
        title={HALVES.valley.title}
        actions={
          <>
            <div className="skeleton-warm size-10 rounded-full" />
            <div className="skeleton-warm size-10 rounded-full sm:hidden" />
            <ButtonSkeleton icon label="Contribute" className="hidden sm:inline-flex" />
          </>
        }
      />

      {/* RiverControls (river-controls.tsx): the bucket words, and the order
          at the far end, wrapping under them on a phone. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="-mx-1 flex min-w-0 max-w-full items-end gap-4 overflow-hidden px-1">
          {["All", ...BUCKETS.map((b) => b.label)].map((label, i) => (
            <Word key={label} label={label} active={i === 0} />
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center pb-0.5 text-[13px]">
          <span className="relative inline-flex items-center gap-1 py-0.5 font-medium">
            <span className="invisible">Newest</span>
            <span className="size-[11px]" />
            <span className="skeleton-warm absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-md" />
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-6 xl:gap-8">
        <div className="min-w-0 flex-1">
          <PhotoStream photos={SHAPES} gap={4}>
            {(_, __, cell) => (
              <div className="skeleton-warm w-full" style={{ aspectRatio: cell.aspectRatio }} />
            )}
          </PhotoStream>
        </div>
        {/* YearRail's column: 92px, a row every 26.7px, the year right-aligned
            in its 39px box. */}
        <div className="hidden w-[92px] shrink-0 space-y-[1.1px] xl:block">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex h-[25.6px] items-center justify-end pr-1">
              <div className="flex w-[39px] justify-end">
                <div className="skeleton-warm h-2.5 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* A bucket word's own box (BucketWord: 13.5px at leading-none, 4px over and
   8px under), with the bar on the letters rather than on the whole box. */
function Word({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`relative shrink-0 whitespace-nowrap px-0.5 pb-2 pt-1 text-[13.5px] leading-none ${active ? "font-semibold" : "font-medium"}`}
    >
      <span className="invisible">{label}</span>
      <span className="skeleton-warm absolute inset-x-0.5 top-[6px] h-2.5 rounded-md" />
    </span>
  );
}

/* Ordinary photograph shapes, portrait and landscape mixed the way an archive
   of phone and camera pictures is. Only their proportions matter: PhotoStream
   turns them into rows the same way it turns real photographs into rows. */
const SHAPES = [
  [3, 4], [4, 3], [3, 4], [2, 3], [16, 9], [16, 9], [4, 3], [4, 3], [3, 4], [4, 3],
  [4, 3], [3, 2], [1, 1], [4, 3], [3, 4], [16, 9], [4, 3], [3, 2], [3, 4], [4, 3],
].map(([width, height]) => ({ width, height }));
