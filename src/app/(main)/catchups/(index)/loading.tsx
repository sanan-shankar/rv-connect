import { CARD_FRAME, LIST_GRID } from "@/components/catchups/index/picture-door";

/* The shape of the rebuilt Catch-ups list (build phase 6): the header row and
   a shelf of picture cards. Three of them, which is what most members have
   once the spare slots are counted, so nothing shifts when the real one lands.
   The rail this used to draw is gone with "Fresh off the press".

   The grid and the card's frame are IMPORTED rather than retyped. A skeleton
   that has drifted from its page is worse than no skeleton: it moves the
   content the moment the real thing arrives, which is the one fault a
   skeleton exists to prevent. */
export default function CatchupsLoading() {
  return (
    <div className="max-w-[1096px]">
      <header className="mb-6 flex flex-nowrap items-start justify-between gap-4">
        <div className="skeleton-warm h-8 w-40 rounded-md" />
        {/* The "Start a Catch-up" canopy pill: h-10, ~146px wide. */}
        <div className="skeleton-warm h-10 w-36 rounded-full" />
      </header>

      <div className={LIST_GRID}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`skeleton-warm w-full rounded-[var(--radius)] ${CARD_FRAME}`}
          />
        ))}
      </div>
    </div>
  );
}
