import { PageHeader } from "@/components/layout/page-header";
import { SegmentedPillsSkeleton } from "@/components/common/skeleton";

/**
 * The review room's own skeleton, and not `AdminSkeleton`.
 *
 * That component holds the shape every other admin route arrives in -- a
 * title, a toolbar and a list of cards -- and this room arrives as a
 * photograph with a form beside it. A list skeleton here would rearrange
 * itself into something else entirely on the frame the data lands, which is
 * the one thing a skeleton exists to prevent.
 */
export default function AdminReviewLoading() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-5">
      <PageHeader title="Review" />

      {/* ReviewRoom's own column (review-room.tsx), the header and the stage
          16px apart inside the page's 20px gap rather than on it. The header:
          the three piles as the switcher's own box with its words and counts
          invisible, and the "1 of 12" stepper beside it. */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 lg:gap-x-4">
          <SegmentedPillsSkeleton
            segments={["Waiting", "Set aside", "Undated"].map((label) => ({ label, count: "0" }))}
          />
          <div className="skeleton-warm h-8 w-28 rounded-full" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="skeleton-warm min-h-[44svh] flex-1 rounded-[var(--radius-lg)] lg:min-h-0" />
          <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[380px]">
            <div className="min-h-0 flex-1 rounded-[var(--radius-lg)] border border-border bg-card p-4">
              <div className="skeleton-warm h-3.5 w-40 rounded-md" />
              {/* The six bucket tiles, three across, exactly where they land. */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton-warm aspect-[4/3] rounded-[var(--radius-md)]" />
                ))}
              </div>
              <div className="skeleton-warm mt-5 h-28 rounded-[var(--radius-input)]" />
            </div>
            <div className="flex shrink-0 gap-2.5">
              <div className="skeleton-warm h-12 flex-1 rounded-full" />
              <div className="skeleton-warm h-12 flex-1 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
