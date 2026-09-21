import { PageHeader } from "@/components/layout/page-header";

/* Warm shimmer while the eligibility read runs: the real title through the
   real PageHeader, and the first rows of the picker grid, so the page's shape
   is promised before its data lands.

   The picker's own geometry (bird-picker.tsx), which is the /birds gallery's:
   two columns, then three from sm, four from md and five from lg, at the
   gallery's gaps; each cell a button padded --space-s round the 96px bird
   and its 13px name at leading-snug. The skeleton this replaces drew a
   subtitle the page has never had and three, four and five columns at the
   wrong breakpoints, so the grid rearranged on arrival. Never the grey pulse. */
export default function PickBirdLoading() {
  return (
    <div className="pb-[var(--space-xl)]">
      <PageHeader title="Pick your bird" />
      <ul className="grid grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 15 }, (_, i) => (
          <li key={i}>
            <div className="flex w-full flex-col items-center p-[var(--space-s)]">
              <div className="skeleton-warm size-24 shrink-0 rounded-full" />
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
