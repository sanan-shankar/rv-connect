import { AdminSkeleton } from "@/components/admin/admin-skeleton";

export default function AdminThreadLoading() {
  return <AdminSkeleton rows={4} columns={1} toolbar={false} />;
}
