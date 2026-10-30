import { PageHeader } from "@/components/layout/page-header";
import { GALLERY_GLYPH, GALLERY_GRID } from "@/components/common/bird-gallery-order";
import { cn } from "@/lib/utils";

/* Warm shimmer while the eligibility read runs: the real title through the
   real PageHeader, and the first rows of the picker grid, so the page's shape
   is promised before its data lands.

   The picker's own geometry (bird-picker.tsx), which is the /birds gallery's
   GALLERY_GRID: each cell a button padded --space-s round the bird (96px on a
   phone, the full column from sm up) and its 13px name at leading-snug. The
   skeleton this replaces drew a subtitle the page has never had and three,
   four and five columns at the wrong breakpoints, so the grid rearranged on
   arrival. Fourteen discs: two full rows at desktop's seven columns. Never
   the grey pulse. */
export default function PickBirdLoading() {
  return (
    <div className="pb-[var(--space-xl)]">
      <PageHeader title="Pick your bird" />
      <ul className={GALLERY_GRID}>
        {Array.from({ length: 14 }, (_, i) => (
          <li key={i}>
            <div className="flex w-full flex-col items-center p-[var(--space-s)]">
              <div className={cn(GALLERY_GLYPH, "skeleton-warm rounded-full")} />
              {/* text-[13px] for the em: --space-xs is 0.382em, and the
                  name's is 13px, so its margin is 5px, not 6. */}
              <div className="mt-[var(--space-xs)] flex h-[17.875px] items-center text-[13px]">
                <div className="skeleton-warm h-2.5 w-20 rounded-md" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
