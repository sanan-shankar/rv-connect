import { requireLabAdmin } from "@/app/lab/_gate";
import { buildGateReport, questionDetail } from "@/lib/trivia-report";
import { sampleGate } from "@/lib/trivia-sample";
import { TriviaRoom } from "@/components/admin/trivia/room";
import { QuestionPage } from "@/components/admin/trivia/question-page";

/**
 * /admin/trivia after a busy month, drawn from an invented one.
 *
 * The real room is empty until people reach the question, and nobody can
 * judge a design on zeros. trivia-sample.ts plays ~220 made-up visitors
 * through the gate, with the Centenary's two busy days near the end, and
 * the SAME buildGateReport and the SAME room components draw them. Accept
 * is switched off: an invented answer must never reach the real gate.
 */
export default async function TriviaGateLab() {
  await requireLabAdmin();
  const now = new Date();
  const { rows, members } = sampleGate(now);
  const report = buildGateReport({ rows, members, addedByQuestion: new Map(), now, days: 30 });
  const detail = questionDetail(report, rows, [], "asthachal");

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-10 text-foreground sm:px-8">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-cinnamon">Admin, with invented people</p>
          <h1 className="font-heading text-[30px] leading-tight tracking-[-0.02em]">The trivia gate after a busy month</h1>
          <p className="max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground">
            This is what the Trivia gate room in admin will look like once the Centenary has been through it.
            The people are made up. The arithmetic is the real room&apos;s. Accept does nothing here.
          </p>
        </header>

        <TriviaRoom report={report} readOnly />

        {detail && (
          <section className="flex flex-col gap-6 border-t border-border pt-10">
            <p className="text-[14px] text-muted-foreground">
              Every question opens its own page. Here is the walk up the hill.
            </p>
            <QuestionPage detail={detail} readOnly />
          </section>
        )}
      </div>
    </main>
  );
}
