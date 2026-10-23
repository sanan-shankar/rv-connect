import { prisma } from "@/lib/prisma";
import { statsFilter } from "@/lib/stats-exclusion";
import { normalize } from "@/lib/trivia-bank";
import { RANGES, type RangeKey } from "@/lib/trivia-ranges";
import {
  buildGateReport,
  type AddedAnswer,
  type GateReport,
  type TriviaRow,
} from "@/lib/trivia-report";

/* ------------------------------------------------------------------ *
 *  The trivia gate room's one read (docs/spec/admin.md §9.11).
 *
 *  Fetches the rows for a range and hands them to trivia-report.ts, which
 *  decides what they mean. The only file allowed to read the gate's tables
 *  besides the writer and the sweep (trivia-log-rule.test.mjs).
 * ------------------------------------------------------------------ */

/* A ceiling on rows, so a year at the Centenary's pace cannot make one page
   load fetch an unbounded table. ~30k rows is several years of real traffic
   at this community's size, and the hourly write cap means even a flood
   year stays near it. */
const ROW_CEILING = 30_000;

export type Loaded = {
  report: GateReport;
  rows: TriviaRow[];
  added: AddedAnswer[];
  /** True when the ceiling cut the range short. */
  capped: boolean;
};

/** The report for a range, and the rows and accepted answers it was built
    from, which a question's own page reads again. */
export async function loadGate(range: RangeKey): Promise<Loaded> {
  const spec = RANGES.find((r) => r.key === range)!;
  const now = new Date();
  const from = new Date(now.getTime() - spec.days * 86_400_000);
  const counted = await statsFilter();

  const [rows, added] = await Promise.all([
    prisma.triviaEvent.findMany({
      where: { createdAt: { gte: from }, ...counted.trivia },
      orderBy: { createdAt: "desc" },
      take: ROW_CEILING,
      select: {
        id: true,
        browserId: true,
        questionId: true,
        kind: true,
        answer: true,
        how: true,
        matched: true,
        device: true,
        country: true,
        userId: true,
        createdAt: true,
      },
    }),
    prisma.triviaAnswer.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const ids = [...new Set(rows.map((r) => r.userId).filter((v): v is string => !!v))];
  const members = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          birdOverride: true,
          accountType: true,
          batchType: true,
          batchYear: true,
          verifyState: true,
          createdAt: true,
        },
      })
    : [];

  const addedByQuestion = new Map<string, string[]>();
  for (const a of added) {
    addedByQuestion.set(a.questionId, [...(addedByQuestion.get(a.questionId) ?? []), normalize(a.answer)]);
  }

  const report = buildGateReport({
    rows,
    members,
    addedByQuestion,
    now,
    days: spec.strip,
  });
  return { report, rows, added, capped: rows.length === ROW_CEILING };
}
