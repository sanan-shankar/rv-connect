import { PageHeader } from "@/components/layout/page-header";
import { FilterButtonSkeleton, SegmentedPillsSkeleton } from "@/components/common/skeleton";

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
 * Then the shape was right and the sizes were not (owner, 2026-09-21: "the
 * height and length of the navigation pill could be tweaked slightly"): the
 * toggle was drawn 44px tall at a guessed 218px where SegmentedPills is 42px
 * and sizes to its labels, so the map under it started 13.5px low; the
 * header's controls sat 3.5px under the ones PageHeader places; and a phone
 * was shown the laptop's 88px Filters pill where it gets a 48px one.
 *
 * So each placeholder is now its control's own box with the ink taken out:
 * the real PageHeader around the real title, the toggle and the Filters
 * button as their controls' own placeholders, each with its labels set
 * invisible, which makes them exactly as wide as the real
 * ones at every breakpoint and in every font rather than approximately as
 * wide at one. The map slot is not a shimmer but the ocean colour the map
 * itself paints first, so the swap is a world appearing on water rather than
 * a rectangle changing colour.
 */
export default function DirectoryLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Directory"
        actions={
          <>
            <div className="skeleton-warm size-10 rounded-full" />
            {/* Icon only below sm, as the directory's real one is. */}
            <FilterButtonSkeleton compactBelowSm />
          </>
        }
      />

      {/* THE ROW: the view toggle, and the headcount opposite it. -mt-1 as
          the real row has it (20px under the header, not 24). */}
      <div className="-mt-1 mb-4 flex items-center gap-3">
        <SegmentedPillsSkeleton segments={[{ label: "Map" }, { label: "Batches" }, { label: "People" }]} />
        {/* "194 people", at SentenceLine's 13.5px. */}
        <div className="skeleton-warm ml-auto h-2.5 w-[62px] rounded-md" />
      </div>

      <div
        className="card-elevated flex-1 rounded-[var(--radius)] border border-border bg-muted"
        style={{ minHeight: 360 }}
      />
    </div>
  );
}
