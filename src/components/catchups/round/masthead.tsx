/* ------------------------------------------------------------------ *
 *  <RoundMasthead> - the magazine cover band for a published Round.
 *
 *  Spec 3.6 (BINDING): "Round N", the group name, the publish date, and a
 *  who-answered avatar strip, in a full-bleed band (not a padded card in a
 *  centered column). The band bleeds past `<main>`'s own horizontal padding
 *  (px-5 / sm:px-7 / lg:px-10, matching src/components/layout/app-shell.tsx)
 *  so it reads as edge-to-edge within the content column, then re-applies
 *  that same padding internally.
 *
 *  Signature element: the who-answered strip renders bird avatars perched,
 *  at slightly uneven heights, along a thin curved wire - a literal
 *  bird-watching motif (see DESIGN-SYSTEM Appendix A) rather than a generic
 *  overlapping avatar stack. The Round number is set as an oversized,
 *  low-opacity editorial plate numeral: a real sequence (this IS the Nth
 *  Round), not a decorative 01/02/03 marker.
 * ------------------------------------------------------------------ */

import { MessagesSquare } from "lucide-react";
import { ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { roundLabel } from "@/lib/catchups";
import type { CatchupPersonRef } from "@/lib/catchups-types";

const MAX_SHOWN_CONTRIBUTORS = 14;

// Small, deterministic per-index vertical jitter so the birds along the wire
// read as unevenly perched rather than laid out on a perfect grid. Fixed
// values (not Math.random()) so server and client render identically.
const PERCH_JITTER_PX = [-3, 1, -1, 3, -2, 2, 0, -3, 2, -1, 1, -2, 3, 0];

/** The masthead's contributor line. Softens for a thin Round (spec 3.6). */
export function contributorsCopy(contributors: CatchupPersonRef[]): string {
  const n = contributors.length;
  if (n === 0) return "No one has written in yet.";
  if (n === 1) return `A small Round. ${contributors[0].name} wrote in.`;
  if (n === 2) return `A small Round. ${contributors[0].name} and ${contributors[1].name} wrote in.`;
  if (n === 3) {
    return `A small Round. ${contributors[0].name}, ${contributors[1].name}, and ${contributors[2].name} wrote in.`;
  }
  return `${n} of the group wrote in.`;
}

export function RoundMasthead({
  title,
  groupName,
  publishedAt,
  number,
  contributors,
}: {
  title: string;
  /** Always the group's plain name, even when `title` is a Keeper-customised headline. */
  groupName: string;
  publishedAt: Date | string | null;
  number: number;
  contributors: CatchupPersonRef[];
}) {
  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Spec 3.6 names four distinct masthead pieces: "Round N", the group name,
  // the publish date, and the who-answered strip. The oversized numeral
  // (below) carries "Round N" as a visual signature, but this line spells
  // all three text pieces out literally, so a custom Catch-up title never
  // hides the plain group name or the Round number.
  const metaLine = [roundLabel(number), groupName, dateLabel ? `Published ${dateLabel}` : null]
    .filter(Boolean)
    .join(" · ");

  const shown = contributors.slice(0, MAX_SHOWN_CONTRIBUTORS);
  const overflow = contributors.length - shown.length;

  return (
    <section
      className="relative -mx-5 overflow-hidden border-b border-border/70 px-5 pb-9 pt-8 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 lg:pb-12 lg:pt-10"
      aria-label="Round masthead"
    >

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">
            <MessagesSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
            Catch-ups
          </div>
          <h1 className="mt-[var(--space-xs)] font-heading text-[1.9rem] leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2.3rem]">
            {title}
          </h1>
          {metaLine && <p className="mt-[var(--space-s)] text-sm text-muted-foreground">{metaLine}</p>}
          <p className="mt-[var(--space-xs)] flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground/70">
            <ChatCircleDots size={13} weight="duotone" />
            Replies aren&apos;t open yet
          </p>
        </div>

        {/* The plate number: a real sequence marker (this Catch-up's Nth
            Round), set large and faint so it reads as editorial furniture. */}
        <div
          aria-hidden
          className="pointer-events-none -mb-2 self-start font-heading text-[4.5rem] leading-none font-bold tracking-[-0.02em] text-canopy/[0.09] select-none sm:self-end sm:text-[6rem]"
        >
          {String(number).padStart(2, "0")}
        </div>
      </div>

      <div className="relative mt-[var(--space-xl)]">
        {shown.length > 0 && (
          <div className="relative pb-2">
            <svg
              aria-hidden
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              className="absolute inset-x-0 top-[21px] h-2.5 w-full text-border"
            >
              <path d="M0 5 Q 25 2 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="relative flex flex-wrap items-end gap-x-1 gap-y-2">
              {shown.map((c, i) => (
                <span
                  key={c.id}
                  className="inline-block"
                  style={{ transform: `translateY(${PERCH_JITTER_PX[i % PERCH_JITTER_PX.length]}px)` }}
                >
                  <BirdAvatar user={c} size="xs" className="ring-2 ring-background" />
                </span>
              ))}
              {overflow > 0 && (
                <span className="mb-0.5 ml-1 inline-flex h-7 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                  +{overflow}
                </span>
              )}
            </div>
          </div>
        )}
        <p className="mt-[var(--space-s)] text-sm text-muted-foreground">{contributorsCopy(contributors)}</p>
      </div>
    </section>
  );
}
