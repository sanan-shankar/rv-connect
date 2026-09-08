/* ------------------------------------------------------------------ *
 *  <YourCatchupsCard> - one row in the index's left column, one per
 *  group the viewer belongs to (spec section 3.1). The whole card is a
 *  single link to that state's primary action (mirrors GroupCard's
 *  whole-card-is-a-link shape).
 *
 *  That link is a stretched overlay rather than a wrapper, because the
 *  card grew a second thing to press: the member's own archive/delete
 *  menu (bug audit B-063). A <button> inside an <a> is invalid HTML and
 *  unreachable for a keyboard, so the anchor covers the card from
 *  behind and the menu sits above it. Still exactly two focus stops per
 *  card, and still no interactive element nested inside another.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { CatchupCardMenu } from "./catchup-card-menu";
import { cn } from "@/lib/utils";
import type { CatchupIndexCard, CatchupPersonRef, EditionStatus } from "@/lib/catchups-types";

const STATUS_TONE: Partial<Record<EditionStatus, string>> = {
  collecting: "text-leaf",
  answering: "text-cinnamon",
  published: "text-canopy",
  draft: "text-muted-foreground",
};

/** `CatchupIndexCard` plus the "who has answered" data the live row needs
 *  for real pull (spec polish: the answering row should not read as the
 *  same weight as a dormant "Start one" row). Local to this screen since
 *  the shared `CatchupIndexCard` type has no other consumer that needs it. */
export type IndexCardView = CatchupIndexCard & {
  memberCount: number;
  answeredCount: number;
  answeredMembers: CatchupPersonRef[];
  /** The viewer started this Catch-up, so it is theirs to end rather than to
   *  bin. Decides only what the card's menu OFFERS; the action refuses either
   *  way. */
  isCreator: boolean;
  /** The batch's own Catch-up, which nobody leaves and nobody bins: the
   *  membership IS the batch, and the nightly heal would restore anyone who
   *  got out (spec 3.5). Archive still works; tidying a list is not leaving. */
  isBatch: boolean;
};

export function YourCatchupsCard({ card }: { card: IndexCardView }) {
  const overflow = Math.max(0, card.members.length - 5);
  const tone = card.editionStatus ? (STATUS_TONE[card.editionStatus] ?? "text-muted-foreground") : "text-muted-foreground";
  const href = card.cta?.href ?? "/catchups";
  const isAnswering = card.editionStatus === "answering";

  return (
    <div
      // state-layer because a border hairline was the entire hover on a
      // full-width card, which is far too quiet. The canopy border
      // hint and its deeper active step stay on top of the layer.
      className="card-elevated group relative flex flex-col gap-[var(--space-m)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] transition-colors duration-150 state-layer hover:border-canopy/40 active:border-canopy/60 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* The card's link, stretched behind everything. `inset-0` and the
          card's own radius, so the focus ring it draws is the card's outline
          exactly, which is what the wrapper anchor used to give for free. */}
      <Link
        href={href}
        aria-label={card.cta ? `${card.groupName}: ${card.cta.label}` : card.groupName}
        className="absolute inset-0 rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <div className="pointer-events-none relative min-w-0">
        {/* leading-tight, not the 1.5 default: the card's padding is a
            symmetric 16px, and a 25.5px line box on 17px type would push the
            first glyph 4px further from the top edge than from the left,
            which is exactly the lopsided-looking tile the owner flagged. */}
        <h3 className="truncate font-heading text-[17px] font-semibold leading-tight tracking-tight text-foreground">
          {card.groupName}
        </h3>
        <div className="mt-2 flex items-center gap-2.5">
          {card.members.length > 0 && (
            <div className="flex -space-x-2">
              {card.members.slice(0, 5).map((m) => (
                <BirdAvatar key={m.id} user={m} size="xs" ring />
              ))}
              {overflow > 0 && (
                <span
                  className="grid h-7 w-7 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
                  /* The same shadow BirdAvatar's `ring` prop draws, written out
                     because this chip is not a BirdAvatar. It stays even though
                     the birds beside it carry no ring: the chip is a flat disc
                     that the ring reads as a border on, where an unclipped bird
                     glyph gets sliced by one. See BirdAvatar's `ring` docblock;
                     the owner looked at both on 2026-09-05 and kept this. */
                  style={{ boxShadow: "0 0 0 4px var(--card)" }}
                >
                  +{overflow}
                </span>
              )}
            </div>
          )}
          <p className={cn("text-[13px] font-medium", card.catchupId ? tone : "text-muted-foreground")}>
            {card.statusLine}
          </p>
        </div>

        {/* Live pull: who has already answered + a mini N-of-M count, so this
            row visibly outweighs the dormant "Start one" rows below it. */}
        {isAnswering && (
          <div className="mt-2.5 flex items-center gap-2">
            {card.answeredMembers.length > 0 && (
              <div className="flex -space-x-1.5">
                {card.answeredMembers.slice(0, 4).map((m) => (
                  <BirdAvatar key={m.id} user={m} size="xs" ring />
                ))}
              </div>
            )}
            <span className="text-[12px] font-bold text-cinnamon">
              {card.answeredCount} of {card.memberCount} shared
            </span>
          </div>
        )}
      </div>

      {/* pointer-events-none all the way down, with the menu button opting
          back in: everything in this row except the menu is decoration over
          the stretched anchor, and a box that swallowed the click would make
          the card's own CTA the one place pressing it did nothing. */}
      <div className="pointer-events-none relative flex shrink-0 items-center gap-1">
        {card.cta && (
          // Matches the shared Button's `sm` size exactly (h-9, px-3.5,
          // text-[0.8rem], font-medium): this used to be a hand-rolled 13px/
          // semibold/py-2 pill that matched no Button size in the app (owner
          // review 2026-07-25). Stays a span, not a <Button>/<Link>: the card's
          // stretched anchor already goes exactly where this says it does, and
          // a second control on top of it would be the same destination twice.
          <span className="inline-flex h-9 flex-1 items-center justify-center rounded-full sm:flex-none bg-canopy px-3.5 text-[0.8rem] font-medium text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] transition-[filter] duration-150 group-hover:brightness-[1.08]">
            {card.cta.label}
          </span>
        )}
        {/* Only on a card that HAS a Catch-up. The "Start one" rows are built
            from a group with none, so there is no copy of anything to file
            away and no dead menu is offered. */}
        {card.catchupId && (
          <CatchupCardMenu
            catchupId={card.catchupId}
            groupName={card.groupName}
            canDelete={!card.isCreator && !card.isBatch}
          />
        )}
      </div>
    </div>
  );
}
