"use client";

/* ------------------------------------------------------------------ *
 *  <FiledAway> - the two quiet sections under "Your Catch-ups": the
 *  ones you archived, and the ones you deleted and can still get back
 *  (bug audit B-063).
 *
 *  Owner, 2026-08-21: "hidden entirely when the member has none, no
 *  dead buttons". So this renders nothing at all for the member who has
 *  never archived or deleted anything, which is almost everybody. It is
 *  not an empty state; it is an absence.
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
import { restoreDaysLeft } from "@/lib/catchup-shelf";
import { setCatchupArchived, setCatchupDeleted } from "@/app/(main)/catchups/actions";

export type FiledRow = {
  catchupId: string;
  groupName: string;
  /** The same status line the live card shows, so a filed Catch-up still says what it is doing. */
  statusLine: string;
  /** ISO, and only on a deleted row: it is what the countdown is made of. */
  deletedAt: string | null;
};

export function FiledAway({
  archived,
  deleted,
}: {
  archived: FiledRow[];
  deleted: FiledRow[];
}) {
  if (archived.length === 0 && deleted.length === 0) return null;

  return (
    <div className="mt-[var(--space-l)] space-y-[var(--space-m)]">
      {archived.length > 0 && (
        <Shelf title="Archived" rows={archived} kind="archived" />
      )}
      {deleted.length > 0 && (
        <Shelf
          title="Recently deleted"
          rows={deleted}
          kind="deleted"
          note="Put one back any time before its last day. After that you are out of that Catch-up."
        />
      )}
    </div>
  );
}

function Shelf({
  title,
  rows,
  kind,
  note,
}: {
  title: string;
  rows: FiledRow[];
  kind: "archived" | "deleted";
  note?: string;
}) {
  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
      {/* No count beside the heading. The list is never long enough to scroll
          and never truncated, so a number here answers a question the rows in
          front of it have already answered. */}
      <h2 className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {title}
      </h2>
      {note && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{note}</p>
      )}
      {/* Hairlines between rows, none above the first: the eyebrow already
          separates the head from the list, and a rule under it would draw two
          lines a few pixels apart. */}
      <ul className="mt-[var(--space-s)] [&>li+li]:border-t [&>li+li]:border-border">
        {rows.map((row) => (
          <FiledRowView key={row.catchupId} row={row} kind={kind} />
        ))}
      </ul>
    </section>
  );
}

function FiledRowView({ row, kind }: { row: FiledRow; kind: "archived" | "deleted" }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Counted on the client on purpose: this is the one number on the page that
  // goes stale by sitting still, and a tab left open overnight should not keep
  // promising a day that has passed. `restoreDaysLeft` is the same function
  // the retention sweep's cutoff is derived from, so the row and the sweep
  // cannot disagree.
  const daysLeft = row.deletedAt ? restoreDaysLeft(row.deletedAt, new Date()) : 0;

  function restore() {
    start(async () => {
      // Two calls rather than one with a ternary inside: the two actions
      // return different success shapes, and unifying them inside the thunk
      // loses the narrowing that `"error" in result` depends on.
      const result =
        kind === "archived"
          ? await callAction(() => setCatchupArchived(row.catchupId, false))
          : await callAction(() => setCatchupDeleted(row.catchupId, false));
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
            to look. A deleted one is plain text, because the only thing to do
            with it is put it back. */}
        <p className="truncate text-[14px] font-medium text-foreground">
          {kind === "archived" ? (
            <Link
              href={`/catchups/${row.catchupId}`}
              className="rounded-sm transition-opacity duration-150 hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {row.groupName}
            </Link>
          ) : (
            row.groupName
          )}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {kind === "deleted"
            ? daysLeft === 1
              ? "Last day to put it back"
              : `${daysLeft} days to put it back`
            : row.statusLine}
        </p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" onClick={restore} disabled={pending}>
        {/* One verb, one icon. The two shelves reached for different glyphs
            at first, which made the same word look like two actions. */}
        <RotateCcw className="size-3.5" aria-hidden />
        {pending ? "Working..." : "Put back"}
      </Button>
    </li>
  );
}
