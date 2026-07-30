/* ------------------------------------------------------------------ *
 *  <RoundMasthead> - the header of a published Round.
 *
 *  Owner review 2026-07-25 rewrote this. It now:
 *   - sits inside <main>'s own gutter (the old `-mx-5 sm:-mx-7 lg:-mx-10`
 *     full bleed cancelled the app shell padding, so the band ran flush
 *     against the green sidebar with no margin at all);
 *   - prints the Catch-up's name exactly ONCE, in the h1. The meta line
 *     carries only "Round N" and the publish date;
 *   - carries no eyebrow (the sidebar already says Catch-ups) and no
 *     oversized plate numeral (it sat badly at top right and opened a big
 *     empty band on mobile);
 *   - shows the who-answered birds plainly, with no ring box behind them
 *     and no decorative perch wire.
 * ------------------------------------------------------------------ */

import { BirdAvatar } from "@/components/common/bird-avatar";
import { roundLabel } from "@/lib/catchups";
import { metaLine } from "@/lib/utils";
import type { CatchupPersonRef } from "@/lib/catchups-types";

const MAX_SHOWN_CONTRIBUTORS = 14;

/** The byline: who wrote in. Names them up to three, then counts. */
export function contributorsCopy(contributors: CatchupPersonRef[]): string {
  const n = contributors.length;
  // This byline only ever renders on a published Round, so "yet" would be wrong.
  if (n === 0) return "No one wrote in.";
  if (n === 1) return `${contributors[0].name} wrote in.`;
  if (n === 2) return `${contributors[0].name} and ${contributors[1].name} wrote in.`;
  if (n === 3) {
    return `${contributors[0].name}, ${contributors[1].name}, and ${contributors[2].name} wrote in.`;
  }
  return `${n} of the group wrote in.`;
}

export function RoundMasthead({
  title,
  publishedAt,
  number,
  contributors,
}: {
  title: string;
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

  const pressLine = metaLine(roundLabel(number), dateLabel && `Published ${dateLabel}`);

  const shown = contributors.slice(0, MAX_SHOWN_CONTRIBUTORS);
  const overflow = contributors.length - shown.length;

  return (
    <section className="border-b border-border pb-[var(--space-l)]" aria-label="Round masthead">
      <h1 className="font-heading text-[1.9rem] leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2.3rem]">
        {title}
      </h1>
      <p className="mt-[var(--space-s)] text-sm text-muted-foreground">{pressLine}</p>

      <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-x-[var(--space-s)] gap-y-[var(--space-xs)]">
        {shown.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {shown.map((c) => (
              <BirdAvatar key={c.id} user={c} size="xs" />
            ))}
            {overflow > 0 && (
              <span className="inline-flex h-7 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                +{overflow}
              </span>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{contributorsCopy(contributors)}</p>
      </div>
    </section>
  );
}
