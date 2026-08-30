import { AdminSkeleton } from "@/components/admin/admin-skeleton";

export default function AdminOverviewLoading() {
  return <AdminSkeleton rows={5} columns={1} toolbar={false} />;
}
