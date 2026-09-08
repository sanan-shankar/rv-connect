"use client";

/* ------------------------------------------------------------------ *
 *  <ArchiveShelf> - every published Edition, one row each: the DATE as its
 *  title, a one-line teaser from the most-loved answer, contributor count.
 *
 *  The date is the title because an Edition has no other name. The row used
 *  to read "Round 3" on the left and "5 Sept 2026" small and grey on the
 *  right; the number went in the 2026-09-08 rename (spec section 3.3, his:
 *  "let's ditch the round 1 ... The round number is irrelevant"), which left
 *  the date as the only thing telling one row from another, so it moved into
 *  the slot the number had. Spelled in full, with the year, because a shelf
 *  of these spans years -- his, 2026-09-07: "also include the year for the
 *  past editions not just the date and the month."
 *
 *  Owner review (2026-07-25): the heading and its "once published it
 *  lives here for good" sub-copy are both gone, replaced by a plain
 *  label. With no copy left to hold an empty box
 *  open, the shelf renders nothing until there is a first Edition rather
 *  than sitting in the rail as a labelled void.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { FadeRise } from "@/components/common/motion";
import type { HomeArchiveRow } from "./types";
import { formatDisplayDateLong } from "@/lib/utils";

const formatDate = (iso: string | null): string => (iso ? formatDisplayDateLong(iso) : "");

export function ArchiveShelf({ rows }: { rows: HomeArchiveRow[] }) {
  if (rows.length === 0) return null;

  return (
    <FadeRise delay={0.05}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cinnamon" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Published Editions
          </p>
        </div>

        <div className="mt-[var(--space-s)] space-y-2">
          {rows.map((row) => (
            <Link
              key={row.editionId}
              href={`/catchups/edition/${row.editionId}`}
              className="block rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-3 transition-colors duration-150 hover:border-cinnamon/40 hover:bg-cinnamon/[0.06] active:bg-cinnamon/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <p className="font-heading text-sm font-bold tracking-[-0.01em] text-foreground">
                {formatDate(row.publishedAt)}
              </p>
              {row.teaser && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                  &ldquo;{row.teaser}&rdquo;
                </p>
              )}
              <p className="mt-1.5 text-[11px] font-medium text-leaf">
                {row.contributorCount} {row.contributorCount === 1 ? "person" : "people"} wrote in
              </p>
            </Link>
          ))}
        </div>
      </div>
    </FadeRise>
  );
}
