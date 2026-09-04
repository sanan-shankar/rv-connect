"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PILL_SET } from "./pill-shell";

/* ------------------------------------------------------------------ *
 *  The sentence line (owner, 2026-08-03: "use sentence for filter";
 *  Concept B in /lab/directory, which the room argues for as the pick).
 *
 *  The row that already had to exist -- the result count -- absorbs the
 *  whole active-filter display, so adding a filter costs ZERO rows.
 *  That is the entire argument for it. The chrome it replaced paid a
 *  row for the count, up to two more for the facet pills, and a third
 *  for the mobile chip strip, all describing the same state; a count
 *  could be shown three times over.
 *
 *  It cannot wrap, structurally rather than by CSS luck: the left half
 *  is `min-w-0 overflow-hidden flex-nowrap`, the right half is
 *  `shrink-0`, and the token count is CAPPED IN JS rather than clipped
 *  by overflow, so what spills is always a real, countable "+2 more"
 *  that opens the panel, never a token sliced through the middle.
 * ------------------------------------------------------------------ */

export interface SentenceToken {
  key: string;
  /**
   * The BARE value: "Chennai", "2003 to 2007", "Teachers". Deliberately not
   * the kit's usual "City: Chennai" chip form. The line reads as a sentence
   * ("12 people, Chennai, Teachers"), and inside one a facet's name is
   * already implied by its value; the labelled form belongs on a pill that
   * has to stand alone.
   */
  label: string;
  onClear: () => void;
}

function Token({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Remove ${label}`}
      className={cn(
        PILL_SET,
        // Shorter than a facet pill (h-7 against h-10): this sits in a text
        // line, so it has to read as part of the sentence rather than as a
        // control docked under it.
        "inline-flex h-7 max-w-[42%] shrink-0 items-center gap-1 rounded-full border py-0 pl-2.5 pr-1.5 text-[12.5px] font-medium transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
      )}
    >
      <span className="truncate">{label}</span>
      <X className="size-3 shrink-0" strokeWidth={2.5} />
    </button>
  );
}

export function SentenceLine({
  count,
  singular = "person",
  plural = "people",
  tokens,
  onClearAll,
  onOpenPanel,
  max = 3,
  right,
  className,
}: {
  count: number;
  singular?: string;
  plural?: string;
  tokens: SentenceToken[];
  onClearAll: () => void;
  /** Opens the filter panel, so "+N more" leads somewhere real. */
  onOpenPanel: () => void;
  /** How many tokens render before the rest collapse into "+N more". */
  max?: number;
  /** Pinned to the right of the line; the directory puts its view toggle here. */
  right?: ReactNode;
  className?: string;
}) {
  const shown = tokens.slice(0, max);
  const hidden = tokens.length - shown.length;

  return (
    <div className={cn("flex min-h-[36px] items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden">
        <span className="shrink-0 whitespace-nowrap text-[13.5px] text-muted-foreground">
          <b className="font-semibold tabular-nums text-foreground">
            {count.toLocaleString("en-IN")}
          </b>{" "}
          {count === 1 ? singular : plural}
        </span>
        {tokens.length > 0 && (
          // The one separator between the count and the filters that narrowed
          // it. `dotsep` is the app's shared middle dot (globals.css), so this
          // line punctuates like every byline in the product.
          <span aria-hidden className="dotsep shrink-0">
            ·
          </span>
        )}
        {shown.map((t) => (
          <Token key={t.key} label={t.label} onClear={t.onClear} />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={onOpenPanel}
            className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[12.5px] font-medium text-muted-foreground underline-offset-2 transition-transform hover:underline active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            +{hidden} more
          </button>
        )}
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            // Text action, so the rule is its hover rather than a state layer:
            // a tint behind two words would read as a stray token. Matches its
            // twin in filter-sheet.tsx, the mobile one.
            className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[12.5px] font-semibold text-canopy underline-offset-2 transition-transform hover:underline active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
          >
            Clear all
          </button>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
