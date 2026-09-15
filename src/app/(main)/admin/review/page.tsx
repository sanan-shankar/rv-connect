import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { loadReview, reviewCounts, REVIEW_BATCH, type ReviewMode } from "@/lib/admin-review";
import { ReviewRoom } from "@/components/admin/review/review-room";

export const metadata: Metadata = {
  title: "Review",
};

/**
 * Look at a photograph properly, fix what is wrong with it, and decide.
 *
 * A ROOM OF ITS OWN rather than a filter on /admin/content, which is what this
 * was until 2026-08-30. The content list is built for finding one thing among
 * everything members have made; reviewing photographs is the opposite shape --
 * a known pile, one at a time, with a decision at the end of each. Sharing a
 * surface meant the queue inherited a search box, a facet panel, a match
 * count and four repeated chips per row, and gave a photograph 64 pixels.
 *
 * NOT deliberately width-limited to ADMIN_MEASURE. Every other admin page is,
 * because a list of names in a 1400px row is mostly empty space. Here the
 * empty space IS the product: it is where the photograph goes.
 */
export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Re-checked per page and not only in the layout: a soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024).
  await requireAdminPage();

  const sp = await searchParams;
  const mode: ReviewMode = sp.pile === "undated" || sp.pile === "aside" ? sp.pile : "waiting";

  const [photos, counts] = await Promise.all([loadReview(mode), reviewCounts()]);

  return (
    /* `min-h-0` all the way down, so the stage inside can shrink to the window
       instead of pushing the two buttons off the bottom of a laptop screen.
       A flex child defaults to `min-height: auto`, which refuses to go below
       its content -- and the content here is a full-size photograph. */
    <div className="flex min-h-0 w-full flex-1 flex-col gap-5">
      <PageHeader title="Review" />
      <ReviewRoom
        /* Remounted when the pile changes: the room holds the list, the
           position and the edits in local state, and carrying any of those
           across a switch between two different piles would be wrong. */
        key={mode}
        mode={mode}
        photos={photos}
        counts={counts}
        capped={photos.length >= REVIEW_BATCH}
      />
    </div>
  );
}
