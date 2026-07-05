"use client";

/* ------------------------------------------------------------------ *
 *  <ArchiveShelf> - "vellum spines on a shelf" (spec 3.7): every
 *  published Round, one row each (number, date, a one-line teaser from
 *  the most-loved answer, contributor count). Not a grid of identical
 *  squares - a first-class, always-visible list, not a dropdown.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { FadeRise } from "@/components/common/motion";
import type { HomeArchiveRow } from "./types";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ArchiveShelf({ rows, groupName }: { rows: HomeArchiveRow[]; groupName: string }) {
  return (
    <FadeRise delay={0.05}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cinnamon" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The archive
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Once {groupName}&apos;s first Round is published, it lives here for good.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((row) => (
              <Link
                key={row.editionId}
                href={`/catchups/round/${row.editionId}`}
                className="group/spine block rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-3 transition-colors duration-150 hover:border-cinnamon/40 hover:bg-cinnamon/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-cinnamon/[0.1]"
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
        )}
      </div>
    </FadeRise>
  );
}
