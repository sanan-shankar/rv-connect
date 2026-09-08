/* ------------------------------------------------------------------ *
 *  <FreshOffThePress> - the index's right rail: the most recently
 *  published Editions across the viewer's groups (spec section 3.1).
 *  Mirrors the compact rail-card shape used by FeedRail so the app's
 *  right-rail language stays consistent.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { VALLEY_TIME_ZONE } from "@/lib/utils";

export type FreshEditionItem = {
  editionId: string;
  groupName: string;
  publishedAt: Date | string | null;
  contributorCount: number;
  teaser: string | null;
};

/* The one local formatter left, and the exception is the YEAR, not the voice:
   this rail lists the last few Editions, all of them recent, and a year on every
   line is noise in a column that narrow. The locale matches the shared pair --
   it was en-US, so the same date read "Aug 5" here and "5 Aug 2026" three
   surfaces away. */
function formatDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "short",
  });
}

export function FreshOffThePress({ items }: { items: FreshEditionItem[] }) {
  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
      <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        Fresh off the press
      </h3>
      {items.length === 0 ? (
        <p className="py-2 text-[13px] leading-relaxed text-muted-foreground">
          Nothing published yet.
        </p>
      ) : (
        // `[&>*:last-child]:pb-0`: without it the last row's own py-3 stacks on
        // the card's 16px padding and the bottom inset reads 28px against a
        // 16px top, which is the lopsided tile the owner flagged. Same fix the
        // feed rail's Your Groups module already carries.
        <div className="[&>*:last-child]:pb-0 [&>a+a]:border-t [&>a+a]:border-border">
          {items.map((item) => (
            <Link
              key={item.editionId}
              href={`/catchups/edition/${item.editionId}`}
              // state-layer, not hover:opacity-80: fading the row dimmed the
              // headline the reader is aiming at. No negative margin, so the
              // tint band stays inside the card's text column and the
              // between-row hairlines above keep their exact width.
              className="block rounded-md py-3 state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {item.groupName}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(item.publishedAt)}
                </span>
              </div>
              {item.teaser && (
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  &ldquo;{item.teaser}&rdquo;
                </p>
              )}
              <p className="mt-1 text-[11px] font-semibold text-leaf">
                {item.contributorCount} {item.contributorCount === 1 ? "person" : "people"} wrote in
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
