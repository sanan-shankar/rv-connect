"use client";

/* ------------------------------------------------------------------ *
 *  The archived Catch-ups: one quiet row at the very foot of the list.
 *
 *  His, brief 5, on the WhatsApp model and on what shipped: "when you
 *  archive, you don't see it in your main feed ... But I don't want to
 *  fucking see archived things. And then there's a Put back button,
 *  which is right there."
 *
 *  So three rules, and they are all his. It is present only when at
 *  least one archived Catch-up exists -- not an empty state, an absence.
 *  It is CLOSED at rest, and it opens the way the sidebar's own profile
 *  menu opens. And **Put back** only exists after you have opened it,
 *  which is the whole difference from the tile-with-a-button this
 *  replaces.
 *
 *  Transplanted from `Archived` in
 *  src/app/lab/catchups/sketches/_list.tsx, with the room's invented
 *  names swapped for real rows and a real action behind Put back.
 * ------------------------------------------------------------------ */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { callAction } from "@/lib/call-action";
import { cn } from "@/lib/utils";
import { setCatchupArchived } from "@/app/(main)/catchups/actions";
import { LIST_FIRST_COLUMN } from "./picture-door";

export type ArchivedRow = { catchupId: string; name: string };

export function ArchivedShelf({ rows }: { rows: ArchivedRow[] }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2">
      {/* No count beside the word. The list is never long and never
          truncated, so a number answers a question the rows behind it have
          already answered. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="state-layer -ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 font-sans text-[13.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <CaretRight
          size={13}
          weight="bold"
          className={cn("transition-transform duration-300 ease-out", open && "rotate-90")}
        />
        Archived
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="archived"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: EASE_OUT_SMOOTH },
              opacity: { duration: 0.18, ease: EASE_OUT_SMOOTH },
            }}
            className="overflow-hidden"
          >
            {/* ONE CARD WIDE where the shelf is two cards wide. Left to fill
                the page, a row put the name at the far left and Put back a
                thousand pixels away at the far right, which is the "63 to 76%
                of the tile was the gap between the two ends" fault (recon I2)
                in a smaller costume. The arithmetic is the grid's own, and it
                lives beside LIST_GRID so the two turn on at the same pixel. */}
            <ul className={cn("pt-1", LIST_FIRST_COLUMN)}>
              {rows.map((row) => (
                <ArchivedRowView key={row.catchupId} row={row} />
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArchivedRowView({ row }: { row: ArchivedRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function putBack() {
    start(async () => {
      const result = await callAction(() => setCatchupArchived(row.catchupId, false));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${row.name} is back in your Catch-ups.`);
      /* router.refresh(), not local state: which shelf a Catch-up is on is the
         server's answer, computed from the same pref row this action wrote.
         Mirroring it here would be a second copy of the rule, free to
         disagree with the first. */
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-4 py-2 text-[14.5px] text-foreground">
      {/* An archived Catch-up is one you are still in, so its name still opens
          it: filing something away should not mean unfiling it to look. */}
      <Link
        href={`/catchups/${row.catchupId}`}
        className="min-w-0 truncate rounded-sm font-heading hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {row.name}
      </Link>
      <button
        type="button"
        onClick={putBack}
        disabled={pending}
        className="shrink-0 font-sans text-[13.5px] font-medium text-canopy hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {pending ? "Working..." : "Put back"}
      </button>
    </li>
  );
}
