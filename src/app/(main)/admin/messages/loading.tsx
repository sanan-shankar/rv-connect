import { AdminSkeleton } from "@/components/admin/admin-skeleton";

export default function AdminMessagesLoading() {
  return <AdminSkeleton rows={6} columns={2} toolbar={false} />;
}
