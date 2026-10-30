import type { Metadata } from "next";
import { loadAdminCounts, requireAdminPage } from "@/lib/admin";
import { AdminCountsSync } from "@/components/admin/admin-counts";
import { NO_CAPTURE } from "@/lib/posthog-privacy";

export const metadata: Metadata = {
  // Nests inside the root template, so a section reads
  // "Rishi Valley · Admin · People" and the tab says where you actually are.
  title: {
    default: "Admin",
    template: "Admin · %s",
  },
};

/**
 * The gate for every /admin route, and the one place the rail's counts are
 * fetched.
 *
 * The guard used to live in the single admin page. It governs every route
 * under /admin now, because a guard that has to be remembered per route is a
 * guard that will be forgotten on one of them. Server actions still check the
 * role for themselves (`requireAdminAction()` in `lib/admin.ts`): a layout
 * guard governs navigation, not authorisation.
 *
 * Every admin page is members' names, emails and phone numbers, so the whole
 * area is NO_CAPTURE (bug audit 3, T7b-22). The owner and the test account are
 * opted out of PostHog already; this covers any other admin. `contents` makes
 * the wrapper generate no box, so the pages lay out exactly as they did as
 * ContentColumn's own flex children. Admin pageviews still count.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  const counts = await loadAdminCounts();

  return (
    <div className={`${NO_CAPTURE} contents`}>
      <AdminCountsSync counts={counts} />
      {children}
    </div>
  );
}
