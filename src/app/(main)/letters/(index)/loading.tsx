import { PageHeader } from "@/components/layout/page-header";
import { IdentityRowSkeleton } from "@/components/common/identity-row";
import { ButtonSkeleton } from "@/components/common/skeleton";

/**
 * The letters index before it arrives: the real header, then letter cards at
 * page.tsx's own measurements.
 *
 * The header is the real PageHeader with the real title, and "Write a letter"
 * is the real Button's box (ButtonSkeleton), so the pill opposite the title is
 * exactly the size it lands at. A lone title bar with nothing opposite it
 * once left this looking like a much smaller header than the one it flashes
 * into, which is what read as "so tiny" (owner, 2026-08-29).
 *
 * No drafts card here. DraftsStrip returns null for anyone with no drafts,
 * which is nearly everyone, so shimmering a box above the letters promised a
 * surface that then vanished on arrival. A skeleton draws what is always
 * there.
 *
 * Each card is the real card line for line (page.tsx): p-5; the kicker's 16px
 * row; a 24px title at leading-snug, which is a 33px line; the excerpt's two
 * clamped lines of 14.5px at leading-relaxed; then the byline, a 40px bird
 * with the name's 13px line over the date's. 208px, the height it lands at.
 * The bars sit inside those line boxes rather than standing in for them.
 */
export default function LettersLoading() {
  return (
    <div>
      <PageHeader title="Letters" actions={<ButtonSkeleton icon label="Write a letter" />} />

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
            <div className="flex h-4 items-center">
              <div className="skeleton-warm h-2.5 w-36 rounded-md" />
            </div>
            <div className="mt-2 flex h-[33px] items-center">
              <div className={`skeleton-warm h-[18px] rounded-md ${TITLE_WIDTHS[i]}`} />
            </div>
            <div className="mt-2">
              <div className="flex h-[23.5625px] items-center">
                <div className="skeleton-warm h-3 w-full rounded-md" />
              </div>
              <div className="flex h-[23.5625px] items-center">
                <div className="skeleton-warm h-3 w-11/12 rounded-md" />
              </div>
            </div>
            <IdentityRowSkeleton className="mt-3.5 gap-2.5" nameSize={13} nameWidth="w-24" metaWidth="w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Titles are different lengths; three equal bars read as a table. */
const TITLE_WIDTHS = ["w-1/2", "w-2/3", "w-3/5"];
