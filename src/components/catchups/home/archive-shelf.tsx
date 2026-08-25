"use client";

/* ------------------------------------------------------------------ *
 *  <ArchiveShelf> - every published Round, one row each (number, date, a
 *  one-line teaser from the most-loved answer, contributor count).
 *
 *  Owner review (2026-07-25): the heading and its "once published it
 *  lives here for good" sub-copy are both gone, replaced by the plain
 *  label "Published issues". With no copy left to hold an empty box
 *  open, the shelf renders nothing until there is a first issue rather
 *  than sitting in the rail as a labelled void.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { FadeRise } from "@/components/common/motion";
import type { HomeArchiveRow } from "./types";
import { VALLEY_TIME_ZONE } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ArchiveShelf({ rows }: { rows: HomeArchiveRow[] }) {
  if (rows.length === 0) return null;

  return (
    <FadeRise delay={0.05}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cinnamon" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Published issues
          </p>
        </div>

        <div className="mt-[var(--space-s)] space-y-2">
          {rows.map((row) => (
            <Link
              key={row.editionId}
              href={`/catchups/round/${row.editionId}`}
              className="block rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-3 transition-colors duration-150 hover:border-cinnamon/40 hover:bg-cinnamon/[0.06] active:bg-cinnamon/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-heading text-sm font-bold tracking-[-0.01em] text-foreground">
                  Round {row.number}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(row.publishedAt)}
                </span>
              </div>
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
