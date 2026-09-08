/* ------------------------------------------------------------------ *
 *  <EditionMasthead> - the header of a published Edition.
 *
 *  Owner review 2026-07-25 rewrote this. It now:
 *   - sits inside <main>'s own gutter (the old `-mx-5 sm:-mx-7 lg:-mx-10`
 *     full bleed cancelled the app shell padding, so the band ran flush
 *     against the green sidebar with no margin at all);
 *   - prints the Catch-up's name exactly ONCE, in the h1. The meta line
 *     carries the publish date, which since 2026-09-08 is the Edition's
 *     whole name: no "Edition N", because there are no Edition numbers;
 *   - carries no eyebrow (the sidebar already says Catch-ups) and no
 *     oversized plate numeral (it sat badly at top right and opened a big
 *     empty band on mobile);
 *   - shows the who-answered birds plainly, with no ring box behind them
 *     and no decorative perch wire.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { CatchupPersonRef } from "@/lib/catchups-types";

const MAX_SHOWN_CONTRIBUTORS = 14;

/** The byline: who wrote in. Names them up to three, then counts. */
function contributorsCopy(contributors: CatchupPersonRef[]): string {
  const n = contributors.length;
  // This byline only ever renders on a published Edition, so "yet" would be wrong.
  if (n === 0) return "No one wrote in.";
  if (n === 1) return `${contributors[0].name} wrote in.`;
  if (n === 2) return `${contributors[0].name} and ${contributors[1].name} wrote in.`;
  if (n === 3) {
    return `${contributors[0].name}, ${contributors[1].name}, and ${contributors[2].name} wrote in.`;
  }
  return `${n} of the group wrote in.`;
}

export function EditionMasthead({
  title,
  publishedAt,
  contributors,
}: {
  title: string;
  publishedAt: Date | string | null;
  contributors: CatchupPersonRef[];
}) {
  const dateLabel = publishedAt ? formatDisplayDateLong(publishedAt) : null;

  const pressLine = metaLine(dateLabel && `Published ${dateLabel}`);

  const shown = contributors.slice(0, MAX_SHOWN_CONTRIBUTORS);
  const overflow = contributors.length - shown.length;

  return (
    <section className="border-b border-border pb-[var(--space-l)]" aria-label="Edition masthead">
      <h1 className="font-heading text-[1.9rem] leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[2.3rem]">
        {title}
      </h1>
      <p className="mt-[var(--space-s)] text-sm text-muted-foreground">{pressLine}</p>

      <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-x-[var(--space-s)] gap-y-[var(--space-xs)]">
        {shown.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {shown.map((c) => (
              // Each contributor walks to their profile; the aria-label is the
              // name the strip itself never prints past three.
              <Link
                key={c.id}
                href={`/profile/${c.id}`}
                aria-label={c.name}
                className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <BirdAvatar user={c} size="xs" />
              </Link>
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
