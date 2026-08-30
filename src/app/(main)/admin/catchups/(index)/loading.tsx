import { AdminSkeleton } from "@/components/admin/admin-skeleton";

export default function AdminCatchupsLoading() {
  return <AdminSkeleton rows={4} columns={1} toolbar={false} />;
}
