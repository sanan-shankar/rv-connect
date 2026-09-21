import { CARD_FRAME, LIST_GRID } from "@/components/catchups/index/picture-door";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonSkeleton } from "@/components/common/skeleton";

/* The shape of the Catch-ups list: page.tsx's header over a shelf of picture
   cards. Three of them, which is what most members have once the spare slots
   are counted, so nothing shifts when the real ones land.

   The grid and the card's frame are IMPORTED rather than retyped, and the
   header is the real PageHeader with "Start a Catch-up" as the real Button's
   box. A skeleton that has drifted from its page is worse than no skeleton:
   it moves the content the moment the real thing arrives, which is the one
   fault a skeleton exists to prevent. Each card is PictureDoor's own shell --
   the border, the elevation and the radius -- around a shimmer the shape of
   its photograph, so the card is the 2px its border adds taller, exactly as
   the real one is. */
export default function CatchupsLoading() {
  return (
    <div className="max-w-[1096px]">
      <PageHeader title="Catch-ups" actions={<ButtonSkeleton icon label="Start a Catch-up" />} />

      <div className={LIST_GRID}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
          >
            <div className={`skeleton-warm w-full ${CARD_FRAME}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
