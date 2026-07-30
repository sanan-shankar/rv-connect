/* ------------------------------------------------------------------ *
 *  <YourCatchupsCard> - one row in the index's left column, one per
 *  group the viewer belongs to (spec section 3.1). The whole card is a
 *  single link to that state's primary action (mirrors GroupCard's
 *  whole-card-is-a-link shape, so there is exactly one focus target
 *  and no interactive element nested inside another).
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";
import type { CatchupIndexCard, CatchupPersonRef, EditionStatus } from "@/lib/catchups-types";

const STATUS_TONE: Partial<Record<EditionStatus, string>> = {
  collecting: "text-leaf",
  answering: "text-cinnamon",
  preparing: "text-muted-foreground",
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
};

export function YourCatchupsCard({ card }: { card: IndexCardView }) {
  const overflow = Math.max(0, card.members.length - 5);
  const tone = card.editionStatus ? (STATUS_TONE[card.editionStatus] ?? "text-muted-foreground") : "text-muted-foreground";
  const href = card.cta?.href ?? "/catchups";
  const isAnswering = card.editionStatus === "answering";

  return (
    <Link
      href={href}
      className="card-elevated group flex flex-col gap-[var(--space-m)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] transition-colors duration-150 hover:border-canopy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:border-canopy/60 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
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

      {card.cta && (
        // Matches the shared Button's `sm` size exactly (h-9, px-3.5,
        // text-[0.8rem], font-medium): this used to be a hand-rolled 13px/
        // semibold/py-2 pill that matched no Button size in the app (owner
        // review 2026-07-25). Stays a span, not a nested <Button>/<Link>: the
        // whole card is already the one interactive element and one focus
        // target.
        <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-canopy px-3.5 text-[0.8rem] font-medium text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] transition-[filter] duration-150 group-hover:brightness-[1.08]">
          {card.cta.label}
        </span>
      )}
    </Link>
  );
}
