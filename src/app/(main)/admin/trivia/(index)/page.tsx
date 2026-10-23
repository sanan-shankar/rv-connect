import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import { loadGate } from "@/lib/admin-trivia";
import { RANGES, isRange } from "@/lib/trivia-ranges";
import { HereNow, RangeTabs, TriviaRoom } from "@/components/admin/trivia/room";

export const metadata: Metadata = { title: "Trivia gate" };

/* Live rows, read on every open: during the Centenary the point is to see
   who is at the question now, not as of a cache's last refresh. */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 *  The trivia gate: what newcomers are asked, what they type, and which
 *  questions work (docs/spec/admin.md §9.11). Everything drawn here is
 *  components/admin/trivia/room.tsx; this page only fetches.
 * ------------------------------------------------------------------ */

export default async function AdminTriviaPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  // Re-checked per page, not only in the layout: soft navigation skips
  // layouts, which leaves a demoted admin still reading (B-024, argued in
  // lib/admin.ts).
  await requireAdminPage();
  const { range } = await searchParams;
  const active = isRange(range) ? range : "all";
  const { report, capped } = await loadGate(active);
  const q = active === "all" ? "" : `?range=${active}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Trivia gate" />
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <RangeTabs
          ranges={RANGES}
          active={active}
          href={(key) => (key === "all" ? "/admin/trivia" : `/admin/trivia?range=${key}`)}
        />
        <HereNow n={report.door.hereNow} />
      </div>
      <TriviaRoom report={report} capped={capped} questionHref={(id) => `/admin/trivia/${id}${q}`} />
    </div>
  );
}
