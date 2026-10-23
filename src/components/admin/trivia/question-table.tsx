import Link from "@/components/common/link";
import { ChevronRight } from "lucide-react";
import { cn, metaLine } from "@/lib/utils";
import type { QuestionStat } from "@/lib/trivia-report";
import { Grow } from "./grow";
import { count, pct, Ribbon, seconds, Sheet, VerdictChip } from "./parts";

/* ------------------------------------------------------------------ *
 *  The questions, best first.
 *
 *  A ranked list, not a grid of cards, and that is the whole design: ten
 *  ribbons stacked on one shared axis are a comparison the eye makes in a
 *  second, where the same ten in a 2x5 grid have to be read one at a time.
 *  The owner's question was "which ones do people like, which don't they",
 *  and only a common baseline answers "which" rather than "how".
 *
 *  The figure on the right is first-go share: of the showings that ended in
 *  something, how many were answered right on the first try. It is the one
 *  number that says a question is doing its job for the people it is for.
 * ------------------------------------------------------------------ */

export function QuestionTable({
  questions,
  hrefFor,
}: {
  questions: QuestionStat[];
  /** Where a row opens. Absent in the lab, which has no question pages. */
  hrefFor?: (id: string) => string;
}) {
  return (
    /* overflow-hidden so a row's hover tint takes the card's corners. The
       focus ring is inset, so it is never the thing clipped. */
    <Sheet className="overflow-hidden">
      <ol className="divide-y divide-border">
        {questions.map((q, i) => {
          const inner = (
            <>
              <span className="w-5 shrink-0 pt-px text-right text-[12.5px] tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-5">
                <div className="min-w-0 lg:w-[42%] lg:shrink-0">
                  <p className="font-heading text-[15px] leading-snug text-foreground text-pretty">
                    {q.question}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                    <VerdictChip verdict={q.verdict} />
                    <span className="tabular-nums">
                      {metaLine(
                        q.shown === 0 ? "Not shown yet" : `Shown ${count(q.shown)} ${q.shown === 1 ? "time" : "times"}`,
                        seconds(q.medianSecondsToRight) && `${seconds(q.medianSecondsToRight)} to answer`,
                      )}
                    </span>
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Grow index={i} className="min-w-0 flex-1">
                    <Ribbon outcomes={q.outcomes} />
                  </Grow>
                  <div className="flex w-[74px] shrink-0 flex-col items-end">
                    <span className="text-[17px] font-semibold leading-none tabular-nums text-foreground">
                      {q.answered ? pct(q.outcomes.firstGo, q.answered) : "–"}
                    </span>
                    <span className="mt-1 text-[12px] leading-none text-muted-foreground">first go</span>
                  </div>
                </div>
              </div>
              {hrefFor && (
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground lg:mt-0 lg:self-center" aria-hidden />
              )}
            </>
          );
          const row = "flex items-start gap-3 px-3.5 py-3 lg:items-center";
          return (
            <li key={q.id}>
              {hrefFor ? (
                <Link
                  href={hrefFor(q.id)}
                  className={cn(
                    row,
                    "state-layer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <div className={row}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
