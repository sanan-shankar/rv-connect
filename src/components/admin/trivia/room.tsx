import { AdminCapped, AdminEmpty } from "@/components/admin/admin-chrome";
import { PillNav } from "@/components/admin/analytics/tabs";
import type { GateReport } from "@/lib/trivia-report";
import { Candidates } from "./candidates";
import { Door } from "./door";
import { Generations } from "./generations";
import { Heading, RibbonLegend, Sheet, count } from "./parts";
import { QuestionTable } from "./question-table";
import { Rhythm } from "./rhythm";
import { Trails, TypedLog } from "./trails";

/* ------------------------------------------------------------------ *
 *  The trivia gate room, top to bottom in the order the owner would act
 *  on it (docs/spec/admin.md §9.11): how far people get, the answers
 *  worth letting in, which questions work, who could not get in and what
 *  everyone typed, then the shape of it over days and generations.
 *
 *  It draws a GateReport and fetches nothing, so the lab room can hand it
 *  an invented one and show the owner what the Centenary will look like
 *  before a single real row exists.
 * ------------------------------------------------------------------ */

/** When the gate started writing anything down. Nothing before it exists. */
export const RECORDING_SINCE = "23 October 2026";

const CANDIDATES_SHOWN = 6;
const TYPED_SHOWN = 40;
const TRAILS_SHOWN = 30;

/* Long lists scroll inside their card rather than stretching the page: a
   busy Centenary day would otherwise push everything below a screen away.
   The analytics room's Panel makes the same call for the same reason. */
const CAPPED = "max-h-[440px] overflow-y-auto";

export function RangeTabs({
  ranges,
  active,
  href,
}: {
  ranges: readonly { key: string; label: string }[];
  active: string;
  href: (key: string) => string;
}) {
  return <PillNav items={ranges} active={active} href={href} label="Time range" />;
}

/** Somebody is on the question right now. Only drawn when it is true. */
export function HereNow({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-leaf/30 bg-leaf/[0.07] px-2.5 py-1 text-[12px] font-medium text-leaf">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-leaf/60" />
        <span className="relative size-2 rounded-full bg-leaf" />
      </span>
      {n === 1 ? "Someone is at the question now" : `${n} people at the question now`}
    </span>
  );
}

export function TriviaRoom({
  report,
  capped = false,
  questionHref,
  readOnly = false,
}: {
  report: GateReport;
  capped?: boolean;
  /** Where a question row opens; absent where there are no question pages. */
  questionHref?: (id: string) => string;
  readOnly?: boolean;
}) {
  const empty = report.events === 0;
  const moreCandidates = report.candidates.length - CANDIDATES_SHOWN;

  return (
    <div className="flex flex-col gap-9">
      <section className="flex flex-col gap-3">
        <Heading
          title="The door"
          note={
            empty
              ? `Recording began on ${RECORDING_SINCE}. The first people to reach the question will appear here.`
              : "Everyone who reached the question, and how far they got."
          }
        />
        <Door report={report} />
        {capped && <AdminCapped>Counting the newest 30,000 records in this range.</AdminCapped>}
      </section>

      <section className="flex flex-col gap-3" id="accept">
        <Heading
          title="Answers worth a look"
          note="Turned away, but close to an answer we take, or typed by several people who got in on another question. Accept the ones that are right."
        />
        {report.candidates.length === 0 ? (
          <AdminEmpty>Nothing the question turned away is close to a right answer yet.</AdminEmpty>
        ) : (
          <>
            <Sheet>
              <Candidates items={report.candidates.slice(0, CANDIDATES_SHOWN)} readOnly={readOnly} />
            </Sheet>
            {moreCandidates > 0 && (
              <AdminCapped>
                {count(moreCandidates)} more on the questions&apos; own pages.
              </AdminCapped>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading title="The questions, best first" note="Every time a question was shown, and how it ended." />
        <RibbonLegend className="px-0.5" />
        <QuestionTable questions={report.questions} hrefFor={questionHref} />
      </section>

      <div className="grid items-start gap-9 lg:grid-cols-2 lg:gap-5">
        <section className="flex min-w-0 flex-col gap-3" id="stuck">
          <Heading
            title="Couldn't get in"
            note="They tried and never got through. Some will be alumni the questions failed."
          />
          {report.stuck.length === 0 ? (
            <AdminEmpty>Nobody has given up at the question.</AdminEmpty>
          ) : (
            <Sheet className={CAPPED}>
              <Trails trails={report.stuck.slice(0, TRAILS_SHOWN)} />
            </Sheet>
          )}
        </section>
        <section className="flex min-w-0 flex-col gap-3">
          <Heading title="What people typed" note="Every answer, newest first." />
          {report.recent.length === 0 ? (
            <AdminEmpty>Nothing typed yet.</AdminEmpty>
          ) : (
            <Sheet className={CAPPED}>
              <TypedLog events={report.recent.slice(0, TYPED_SHOWN)} />
            </Sheet>
          )}
        </section>
      </div>

      <div className="grid items-start gap-9 lg:grid-cols-2 lg:gap-5">
        <section className="flex min-w-0 flex-col gap-3">
          <Heading title="Day by day" note="In Indian time. Point at a day to read it." />
          <Sheet>
            <Rhythm days={report.daily} />
          </Sheet>
        </section>
        <section className="flex min-w-0 flex-col gap-3">
          <Heading
            title="Who knows what"
            note="Of each generation, the share who got each question right. Filled in as people join."
          />
          {report.generations.cohorts.length === 0 ? (
            <AdminEmpty>Nobody who answered has joined yet, so there is no batch to match them to.</AdminEmpty>
          ) : (
            <Sheet>
              <Generations data={report.generations} />
            </Sheet>
          )}
        </section>
      </div>
    </div>
  );
}
