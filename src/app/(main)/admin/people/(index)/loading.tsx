import {
  AdminFilterBarSkeleton,
  AdminPageSkeleton,
  AdminPersonRowSkeleton,
} from "@/components/admin/admin-skeleton";
import { ADMIN_GRID_3 } from "@/components/admin/admin-chrome";

/* People (page.tsx, people-list.tsx): the filter bar and its count, then
   the person rows three up from xl, two from sm -- ADMIN_GRID_3, imported so
   the two cannot disagree -- at the wide column the page takes. */
export default function AdminPeopleLoading() {
  return (
    <AdminPageSkeleton title="People" measure={false} className="gap-5">
      <div className="flex flex-col gap-4">
        <AdminFilterBarSkeleton />
        <div className={ADMIN_GRID_3}>
          {Array.from({ length: 12 }, (_, i) => (
            <AdminPersonRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </AdminPageSkeleton>
  );
}
