/* ------------------------------------------------------------------ *
 *  <RoundFooterTease> - the close of the reader: when the next Round opens
 *  (recurring cadences only), and the way back to this group's Catch-up
 *  home rather than the global /catchups index.
 *
 *  The link used to read "Back to {group} Catch-ups", which was the third
 *  print of the Catch-up's name on one page. The name is printed once now,
 *  in the masthead h1 (owner review 2026-07-25).
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function RoundFooterTease({
  catchupId,
  nextOpensAt,
  showNextOpens,
}: {
  catchupId: string;
  nextOpensAt: Date | string | null;
  /** False for a paused/ended Catchup, where there is no next Round. */
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
    <footer className="mt-[var(--space-xl)] border-t border-border pt-[var(--space-l)] text-center">
      {nextLabel && <p className="text-sm text-muted-foreground">Next Round opens {nextLabel}.</p>}
      <Link
        href={`/catchups/${catchupId}`}
        className="mt-[var(--space-xs)] inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-leaf hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the Catch-up
      </Link>
    </footer>
  );
}
