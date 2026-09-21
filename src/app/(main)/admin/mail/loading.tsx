import { AdminPageSkeleton, StatStripSkeleton } from "@/components/admin/admin-skeleton";

/* Mail (page.tsx): the three-tile strip, drawn with its labels. Nothing
   under it is always there -- a section appears only when it has something
   in it -- so the skeleton ends where the page usually does. */
export default function AdminMailLoading() {
  return (
    <AdminPageSkeleton title="Mail">
      <StatStripSkeleton labels={["Sent today", "Waiting to go", "Gave up"]} />
    </AdminPageSkeleton>
  );
}
