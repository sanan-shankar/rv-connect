"use client";

/* ------------------------------------------------------------------ *
 *  <ConsolePublished> - the console once the latest Round is out.
 *
 *  The Catch-up home is one surface (owner review 2026-07-25): when the
 *  Round is published the issue is READ here, not linked to. The
 *  dedicated `/catchups/round/[editionId]` route stays a real page (it
 *  is the shareable deep link), so the header keeps one plain link to
 *  it, but nobody has to navigate to read what their group wrote.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeRise } from "@/components/common/motion";
import { QuestionSection } from "@/components/catchups/round/question-section";
import type { RoundEntry } from "@/components/catchups/round/answer-card";
import type { CatchupPromptView } from "@/lib/catchups-types";
import type { HomeEditionView } from "./types";

/** The published Round, loaded inline by this screen's page.tsx. Declared
 *  here (not in `home/types.ts`) because this console is its only consumer. */
export type PublishedIssue = {
  publishedAt: string | null;
  sections: Array<{ prompt: CatchupPromptView; entries: RoundEntry[] }>;
};

const TILE = "card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ConsolePublished({
  edition,
  issue,
}: {
  edition: HomeEditionView;
  issue: PublishedIssue | null;
}) {
  const dateLabel = formatDate(issue?.publishedAt ?? edition.publishedAt);

  return (
    <div className="space-y-[var(--space-l)]">
      <FadeRise>
        <div className={TILE}>
          <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-s)]">
            <h2 className="font-heading text-[1.35rem] font-bold tracking-[-0.02em] text-foreground">
              Round {edition.number} is out.
            </h2>
            <Link
              href={`/catchups/round/${edition.id}`}
              className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-canopy transition-colors duration-150 hover:text-leaf active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Open it on its own page
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {/* Round number is in the heading, so this line carries only the
              date. Who wrote in is not counted at the reader: every
              contributor is named on their own answer, just below. */}
          {dateLabel && (
            <p className="mt-[var(--space-xxs)] text-sm text-muted-foreground">
              Published {dateLabel}
            </p>
          )}
        </div>
      </FadeRise>

      {issue === null ? null : issue.sections.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          This round did not gather any questions.
        </p>
      ) : (
        <div className="space-y-[var(--space-xl)]">
          {issue.sections.map((section, i) => (
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
