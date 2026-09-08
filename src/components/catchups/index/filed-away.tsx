"use client";

/* ------------------------------------------------------------------ *
 *  <FiledAway> - the quiet section under "Your Catch-ups": the ones you
 *  archived (bug audit B-063).
 *
 *  It was two sections until build phase 5. The other was "Recently
 *  deleted", a thirty-day bin with a countdown on every row, and it went
 *  with the word: deleting became LEAVING (his, N18), which happens in
 *  the moment and leaves nothing to put back. What he said about the bin
 *  is why it is not being redesigned instead (brief 5): "I don't want to
 *  fucking see archived things. And then there's a Put back button,
 *  which is right there."
 *
 *  Owner, 2026-08-21: "hidden entirely when the member has none, no
 *  dead buttons". So this renders nothing at all for the member who has
 *  never archived anything, which is almost everybody. It is not an
 *  empty state; it is an absence.
 *
 *  Deliberately rows, not cards. A full card says "here is something to
 *  do"; these are things you have already decided about, and giving them
 *  the same weight as a live Catch-up would undo the tidying that put
 *  them here. One line each, one button each.
 * ------------------------------------------------------------------ */

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { setCatchupArchived } from "@/app/(main)/catchups/actions";

export type FiledRow = {
  catchupId: string;
  groupName: string;
  /** The same status line the live card shows, so a filed Catch-up still says what it is doing. */
  statusLine: string;
};

export function FiledAway({ archived }: { archived: FiledRow[] }) {
  if (archived.length === 0) return null;

  return (
    <div className="mt-[var(--space-l)] space-y-[var(--space-m)]">
      <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        {/* No count beside the heading. The list is never long enough to scroll
            and never truncated, so a number here answers a question the rows in
            front of it have already answered. */}
        <h2 className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          Archived
        </h2>
        {/* Hairlines between rows, none above the first: the eyebrow already
            separates the head from the list, and a rule under it would draw two
            lines a few pixels apart. */}
        <ul className="mt-[var(--space-s)] [&>li+li]:border-t [&>li+li]:border-border">
          {archived.map((row) => (
            <FiledRowView key={row.catchupId} row={row} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function FiledRowView({ row }: { row: FiledRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function restore() {
    start(async () => {
      const result = await callAction(() => setCatchupArchived(row.catchupId, false));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${row.groupName} is back in your Catch-ups.`);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-[var(--space-s)] py-2.5">
      <div className="min-w-0 flex-1">
        {/* An archived Catch-up is one you are still in, so its name still
            opens it: filing something away should not mean having to unfile it
            to look. */}
        <p className="truncate text-[14px] font-medium text-foreground">
          <Link
            href={`/catchups/${row.catchupId}`}
            className="rounded-sm transition-opacity duration-150 hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {row.groupName}
          </Link>
        </p>
        <p className="text-[12px] text-muted-foreground">{row.statusLine}</p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={restore} disabled={pending}>
        <RotateCcw className="size-3.5" aria-hidden />
        {pending ? "Working..." : "Put back"}
      </Button>
    </li>
  );
}
