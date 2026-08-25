import { AdminSkeleton } from "@/components/admin/admin-skeleton";

/* The reading room fetches a whole Catch-up -- every Round, every question and
   every answer under it -- so it is the slowest page in the admin wing and the
   one that most needs a shimmer rather than a blank. */
export default function AdminCatchupReadingRoomLoading() {
  return <AdminSkeleton rows={6} columns={1} toolbar={false} />;
}
