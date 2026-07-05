/* ------------------------------------------------------------------ *
 *  <YourCatchupsCard> — one row in the index's left column, one per
 *  group the viewer belongs to (spec section 3.1). The whole card is a
 *  single link to that state's primary action (mirrors GroupCard's
 *  whole-card-is-a-link shape, so there is exactly one focus target
 *  and no interactive element nested inside another).
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";
import type { CatchupIndexCard, EditionStatus } from "@/lib/catchups-types";

const STATUS_TONE: Partial<Record<EditionStatus, string>> = {
  collecting: "text-leaf",
  answering: "text-cinnamon",
  preparing: "text-muted-foreground",
  published: "text-canopy",
  draft: "text-muted-foreground",
};

export function YourCatchupsCard({ card }: { card: CatchupIndexCard }) {
  const overflow = Math.max(0, card.members.length - 5);
  const tone = card.editionStatus ? (STATUS_TONE[card.editionStatus] ?? "text-muted-foreground") : "text-muted-foreground";
  const href = card.cta?.href ?? "/catchups";

  return (
    <Link
      href={href}
      className="card-elevated group flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-card p-5 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h3 className="truncate font-heading text-[17px] font-semibold tracking-tight text-foreground">
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
      </div>

      {card.cta && (
        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-canopy px-4 py-2 text-[13px] font-semibold text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] transition-transform duration-150 group-hover:scale-[1.03]">
          {card.cta.label}
        </span>
      )}
    </Link>
  );
}
