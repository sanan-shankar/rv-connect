import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { loadGate } from "@/lib/admin-trivia";
import { RANGES, isRange } from "@/lib/trivia-ranges";
import { questionDetail } from "@/lib/trivia-report";
import { questionById } from "@/lib/trivia-bank";
import { QuestionPage } from "@/components/admin/trivia/question-page";
import { RangeTabs } from "@/components/admin/trivia/room";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ questionId: string }>;
}): Promise<Metadata> {
  const q = questionById((await params).questionId);
  return { title: q ? `Trivia · ${q.label}` : "Trivia gate" };
}

/* One question's page (components/admin/trivia/question-page.tsx). */
export default async function AdminTriviaQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();
  const [{ questionId }, { range }] = await Promise.all([params, searchParams]);
  if (!questionById(questionId)) notFound();
  const active = isRange(range) ? range : "all";
  /* The whole report, not just this question's rows: the generation split
     needs to know which browsers became members, which their other answers
     say. Admin-only and a few thousand rows; not worth a second query shape. */
  const { report, rows, added } = await loadGate(active);
  const detail = questionDetail(report, rows, added, questionId);
  if (!detail) notFound();
  const q = active === "all" ? "" : `?range=${active}`;

  return (
    <QuestionPage
      detail={detail}
      backHref={`/admin/trivia${q}`}
      rangeTabs={
        <RangeTabs
          ranges={RANGES}
          active={active}
          href={(key) => `/admin/trivia/${questionId}${key === "all" ? "" : `?range=${key}`}`}
        />
      }
    />
  );
}
