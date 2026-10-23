import Link from "@/components/common/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminEmpty } from "@/components/admin/admin-chrome";
import { BarList } from "@/components/admin/analytics/stat";
import { NEAR_MISS_MIN_LENGTH } from "@/lib/trivia-bank";
import { OUTCOMES, type QuestionDetail } from "@/lib/trivia-report";
import { Candidates, StopAccepting } from "./candidates";
import { Grow } from "./grow";
import { Heading, Ribbon, SEGMENT, Sheet, VerdictChip, count, pct, seconds } from "./parts";
import { TypedLog } from "./trails";

/* ------------------------------------------------------------------ *
 *  One question, all of it: how its showings ended, what it accepts and
 *  how often each accepted spelling is the one people actually type,
 *  everything it turned away, every answer, and each generation.
 *
 *  "What gets in" is the part no other screen can show. An accepted entry
 *  nobody has ever typed is dead weight in the bank; one the one-letter
 *  rule keeps rescuing is a spelling that deserves its own line.
 * ------------------------------------------------------------------ */

export function QuestionPage({
  detail,
  backHref,
  rangeTabs,
  readOnly = false,
}: {
  detail: QuestionDetail;
  /** Absent in the lab, which has no room to go back to. */
  backHref?: string;
  rangeTabs?: React.ReactNode;
  /** The lab's invented answers must never reach the real gate. */
  readOnly?: boolean;
}) {
  const { stat, accepted, typoIns, turnedAway, answers, generations } = detail;
  const total = OUTCOMES.reduce((n, k) => n + stat.outcomes[k], 0);
  const right = seconds(stat.medianSecondsToRight);
  const moved = seconds(stat.medianSecondsToMoveOn);
  const takesMentions = accepted.some((a) => a.source === "mention");
  const maxHits = Math.max(1, ...accepted.map((a) => a.hits));

  return (
    <div className="flex flex-col gap-9">
      <header className="flex flex-col gap-3">
        {backHref && <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 rounded-sm text-[13px] text-muted-foreground transition-colors hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Trivia gate
        </Link>}
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-cinnamon">{stat.label}</p>
          <h1 className="mt-1.5 font-heading text-[26px] leading-[1.2] tracking-[-0.02em] text-foreground text-balance">
            {stat.question}
          </h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
            <VerdictChip verdict={stat.verdict} />
            <span className="tabular-nums">
              {total === 0 ? "Not shown yet" : `Shown ${count(total)} ${total === 1 ? "time" : "times"}`}
            </span>
          </p>
        </div>
        {rangeTabs}
      </header>

      <section className="flex flex-col gap-3">
        <Heading title="How it went" />
        <Sheet className="flex flex-col gap-4 px-3.5 pb-3.5 pt-4">
          <Grow>
            <Ribbon outcomes={stat.outcomes} size="lg" />
          </Grow>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {OUTCOMES.map((k) => (
              <li key={k} className="flex items-center gap-2 text-[13px]">
                <span className={cn("h-2.5 w-3.5 shrink-0 rounded-full", SEGMENT[k].swatch)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{SEGMENT[k].label}</span>
                <span className="tabular-nums text-foreground">{count(stat.outcomes[k])}</span>
                <span className="w-9 text-right tabular-nums text-muted-foreground">
                  {pct(stat.outcomes[k], total)}
                </span>
              </li>
            ))}
          </ul>
          {(right || moved) && (
            <p className="border-t border-border pt-3 text-[13px] text-foreground">
              {right && <>Half the right answers came within {right}. </>}
              {moved && <>Those who moved on without trying looked at it for {moved} first.</>}
            </p>
          )}
        </Sheet>
      </section>

      <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-5">
        <section className="flex min-w-0 flex-col gap-3">
          <Heading
            title="What gets in"
            note={
              takesMentions
                ? "Any answer that mentions one of these. The count is how many people got in on each."
                : `Spacing, capitals and a leading "the" never matter, and answers of ${NEAR_MISS_MIN_LENGTH} letters or more also get in one letter off. The count is how many people got in on each.`
            }
          />
          <Sheet>
            <ul className="divide-y divide-border">
              {accepted.map((a) => (
                <li key={`${a.source}:${a.entry}`} className="relative flex items-center gap-3 px-3.5 py-2">
                  {/* The bar sits behind the row, so a spelling nobody uses is
                      visibly empty without a second column to read. */}
                  <span
                    className="absolute inset-y-1 left-1.5 rounded-[var(--radius-sm)] bg-leaf/[0.1]"
                    style={{ width: a.hits ? `calc(${(a.hits / maxHits) * 100}% - 12px)` : 0 }}
                    aria-hidden
                  />
                  <span className={cn("relative min-w-0 flex-1 truncate text-[13.5px]", a.hits ? "text-foreground" : "text-muted-foreground")}>
                    {a.source === "added" ? a.typed : a.entry}
                    {a.source === "added" && (
                      <span className="ml-2 text-[12px] text-leaf">accepted by you</span>
                    )}
                  </span>
                  {a.source === "added" && a.addedId && !readOnly && (
                    <span className="relative">
                      <StopAccepting id={a.addedId} typed={a.typed ?? a.entry} />
                    </span>
                  )}
                  <span className="relative w-10 text-right text-[13px] tabular-nums text-foreground">
                    {count(a.hits)}
                  </span>
                </li>
              ))}
            </ul>
          </Sheet>
          {typoIns.length > 0 && (
            <p className="px-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Let in one letter off:{" "}
              {typoIns.map((t, i) => (
                <span key={t.typed}>
                  {i > 0 && ", "}
                  <span className="text-foreground">{`“${t.typed}”`}</span>
                  {t.count > 1 && <span className="tabular-nums"> {t.count}</span>}
                </span>
              ))}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <Heading title="By generation" note="Members only, matched once they join." />
          {generations.cohorts.length === 0 || generations.cells.every((c) => c.answered === 0) ? (
            <AdminEmpty>Nobody who answered this has joined yet.</AdminEmpty>
          ) : (
            <Sheet className="p-2">
              {/* A share per generation, so every bar is out of 100 and the
                  count rides along as the hint: the retention panel's shape. */}
              <BarList
                items={generations.cells
                  .filter((c) => c.answered > 0)
                  .map((c) => ({
                    label: c.cohort,
                    value: Math.round((c.right / c.answered) * 100),
                    hint: `${c.right} of ${c.answered}`,
                  }))}
                total={100}
                unit="%"
              />
            </Sheet>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <Heading
          title="Turned away"
          note="Everything this question refused, grouped by what it comes to once spacing and capitals are set aside."
        />
        {turnedAway.length === 0 ? (
          <AdminEmpty>Nothing turned away yet.</AdminEmpty>
        ) : (
          <Sheet className="max-h-[520px] overflow-y-auto">
            <Candidates items={turnedAway} showQuestion={false} readOnly={readOnly} />
          </Sheet>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="Every answer" note="Newest first." />
        {answers.length === 0 ? (
          <AdminEmpty>Nothing typed for this question yet.</AdminEmpty>
        ) : (
          <Sheet className="max-h-[520px] overflow-y-auto">
            <TypedLog events={answers} showQuestion={false} />
          </Sheet>
        )}
      </section>
    </div>
  );
}
