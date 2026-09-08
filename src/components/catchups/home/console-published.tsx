"use client";

/* ------------------------------------------------------------------ *
 *  <ConsolePublished> - the console once the latest Edition is out.
 *
 *  The Catch-up home is one surface (owner review 2026-07-25): when the
 *  Edition is published it is READ here, not linked to. The
 *  dedicated `/catchups/edition/[editionId]` route stays a real page (it
 *  is the shareable deep link), so the header keeps one plain link to
 *  it, but nobody has to navigate to read what their group wrote.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeRise } from "@/components/common/motion";
import { QuestionSection } from "@/components/catchups/edition/question-section";
import type { EditionEntry } from "@/components/catchups/edition/answer-card";
import type { CatchupPromptView } from "@/lib/catchups-types";
import { formatDisplayDateLong } from "@/lib/utils";
import type { HomeEditionView } from "./types";

/** The published Edition, loaded inline by this screen's page.tsx. Declared
 *  here (not in `home/types.ts`) because this console is its only consumer. */
export type PublishedEditionContents = {
  publishedAt: string | null;
  sections: Array<{ prompt: CatchupPromptView; entries: EditionEntry[] }>;
};

const TILE = "card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]";

const formatDate = (iso: string | null): string | null =>
  iso ? formatDisplayDateLong(iso) : null;

export function ConsolePublished({
  edition,
  contents,
}: {
  edition: HomeEditionView;
  contents: PublishedEditionContents | null;
}) {
  const dateLabel = formatDate(contents?.publishedAt ?? edition.publishedAt);

  return (
    <div className="space-y-[var(--space-l)]">
      <FadeRise>
        <div className={TILE}>
          <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-s)]">
            <h2 className="font-heading text-[1.35rem] font-bold tracking-[-0.02em] text-foreground">
              The new Edition is out.
            </h2>
            <Link
              href={`/catchups/edition/${edition.id}`}
              className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-canopy transition-colors duration-150 hover:text-leaf active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open it on its own page
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {/* The date, because the date is the Edition's NAME -- there are no
              Edition numbers anywhere any more (spec section 3.3; his: "the
              round number is irrelevant"). Who wrote in is not counted here:
              every contributor is named on their own answer, just below. */}
          {dateLabel && (
            <p className="mt-[var(--space-xxs)] text-sm text-muted-foreground">
              Published {dateLabel}
            </p>
          )}
        </div>
      </FadeRise>

      {contents === null ? null : contents.sections.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          This Edition did not gather any questions.
        </p>
      ) : (
        <div className="space-y-[var(--space-xl)]">
          {contents.sections.map((section, i) => (
            <QuestionSection
              key={section.prompt.id}
              id={`q-${section.prompt.id}`}
              index={i}
              prompt={section.prompt}
              entries={section.entries}
            />
          ))}
        </div>
      )}
    </div>
  );
}
