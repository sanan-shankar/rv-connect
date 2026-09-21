import { RAIL_GRID } from "@/components/layout/rail-grid";
import { CARD_FRAME } from "@/components/catchups/index/picture-door";
import { ButtonSkeleton } from "@/components/common/skeleton";

/* A Catch-up's home before it arrives: catchup-home.tsx's four regions, each
   where it lands.

   It used to draw the home before the rework -- a title bar with a countdown,
   form cards and a rail of labelled tiles -- so the page it flashed into, a
   photograph with the name written on it, arrived as a different screen.

   Now: the head at its own 172px and 240px (home-head.tsx), a shimmer in the
   shape of the photograph that fills it; then the app's rail grid, with the
   Edition in the main column 20px under the head (24px from 500px) and the
   earlier Editions in the rail, level with it from 1180px and 44px under it
   below that.

   The Edition region is the one that changes with the cycle, and it is drawn
   as the ask box (collecting.tsx), because that is what every cycle opens on
   and the answering card is the same object -- a card, a serif line, a box to
   write in, and its controls under it. The rail is one cover in the frame
   every cover shares, CARD_FRAME, imported so the two cannot drift. */
export default function CatchupHomeLoading() {
  return (
    <div>
      <div className="skeleton-warm h-[172px] w-full rounded-[var(--radius)] min-[500px]:h-[240px]" />

      <div className={RAIL_GRID}>
        <div className="mt-5 min-w-0 min-[500px]:mt-6">
          <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-[25.5px] items-center">
                <div className="skeleton-warm h-3.5 w-52 rounded-md" />
              </div>
              {/* The anonymity eye: a 17px glyph in its 32px target, which
                  hangs 4px past the card's padding and out of the row's
                  height (-mr-1 -my-1). */}
              <div className="-my-1 -mr-1 grid size-8 shrink-0 place-items-center">
                <div className="skeleton-warm size-[17px] rounded-full" />
              </div>
            </div>
            <div className="skeleton-warm mt-3 h-[5.5rem] rounded-[var(--radius-input)]" />
            <div className="mt-3 flex items-center gap-2.5">
              <ButtonSkeleton size="sm" icon label="From the library" />
              <ButtonSkeleton size="sm" label="Ask the group" className="ml-auto" />
            </div>
          </div>
        </div>
        <aside className="mt-11 self-start min-[1180px]:mt-0 min-[1180px]:pt-6">
          <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
            <div className={`skeleton-warm w-full ${CARD_FRAME}`} />
          </div>
        </aside>
      </div>
    </div>
  );
}
