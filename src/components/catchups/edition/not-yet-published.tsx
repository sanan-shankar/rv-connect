/* ------------------------------------------------------------------ *
 *  <NotYetPublished> - a deep link to an Edition that is still draft /
 *  collecting / answering: a plain safety net so a shared or bookmarked link
 *  never dead-ends on a 404 or a half-rendered reader before the Edition
 *  exists to read.
 *
 *  It survived the deletion of `preparing` (2026-09-08) because it was never
 *  that state's screen -- those three are the states it does cover, and all
 *  three are still reachable. The spec's deletion list named it alongside the
 *  preparing screens; taking it out would dead-end every link shared while an
 *  Edition is still collecting questions.
 *
 *  The one line under the heading states where the Edition actually is, which
 *  the heading does not; it is not a restatement of it.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { describeEditionStatus } from "@/lib/catchups-core";
import type { EditionStatus } from "@/lib/catchups-types";
import { formatDisplayDateLong } from "@/lib/utils";

export function NotYetPublished({
  catchupId,
  title,
  status,
  opensAt = null,
}: {
  catchupId: string;
  title: string;
  status: EditionStatus;
  /** A sealed time capsule's opening day (build phase 14). A stand-in line
   *  until the owner picks the sealed Edition's look in the lab. */
  opensAt?: Date | null;
}) {
  const statusLine =
    status === "draft"
      ? "Questions have not opened yet."
      : status === "sealed" && opensAt
        ? `It opens on ${formatDisplayDateLong(opensAt)}.`
        : `${describeEditionStatus({ status })}.`;

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">{title}</p>
        <h1 className="mt-[var(--space-xs)] font-heading text-2xl tracking-[-0.02em] text-foreground">
          This Edition is not out yet
        </h1>
        <p className="mt-[var(--space-s)] text-[14.5px] leading-relaxed text-muted-foreground">
          {statusLine}
        </p>
        <Link href={`/catchups/${catchupId}`} className="mt-[var(--space-l)] inline-block">
          <Button variant="primary">Go to the Catch-up</Button>
        </Link>
      </div>
    </div>
  );
}
