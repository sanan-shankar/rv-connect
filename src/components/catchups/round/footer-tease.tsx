/* ------------------------------------------------------------------ *
 *  <RoundFooterTease> - the quiet close of the reader (spec 3.6): a gentle
 *  next-Round tease for recurring cadences, plus a way back to the group's
 *  Catch-up home (not the global /catchups index - "back to {group}
 *  Catch-ups" reads as this Catch-up specifically).
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function RoundFooterTease({
  catchupId,
  groupName,
  nextOpensAt,
  showNextOpens,
}: {
  catchupId: string;
  groupName: string;
  nextOpensAt: Date | string | null;
  /** False for a paused/ended Catchup, where there is no next Round to tease. */
  showNextOpens: boolean;
}) {
  const nextLabel =
    showNextOpens && nextOpensAt
      ? new Date(nextOpensAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <footer className="mt-[var(--space-3xl)] border-t border-border pt-[var(--space-l)] text-center">
      {nextLabel && <p className="text-sm text-muted-foreground">Next Round opens {nextLabel}.</p>}
      <Link
        href={`/catchups/${catchupId}`}
        className="mt-[var(--space-xs)] inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-leaf hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {groupName} Catch-ups
      </Link>
    </footer>
  );
}
