import type { Metadata } from "next";
import { loadAdminCounts, requireAdminPage } from "@/lib/admin";
import { AdminCountsSync } from "@/components/admin/admin-counts";

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
 * The guard used to live in the single admin page. There are eleven routes
 * now, and a guard that has to be remembered per route is a guard that will
 * be forgotten on one of them. Server actions still check the role for
 * themselves (`requireAdmin()` in admin-actions.ts): a layout guard governs
 * navigation, not authorisation.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  const counts = await loadAdminCounts();

  return (
    <>
      <AdminCountsSync counts={counts} />
      {children}
    </>
  );
}
