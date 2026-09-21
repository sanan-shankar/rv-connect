import {
  AdminPageSkeleton,
  AdminSectionSkeleton,
  ChipSkeleton,
} from "@/components/admin/admin-skeleton";
import { IdentityRowSkeleton } from "@/components/common/identity-row";
import { ADMIN_GRID } from "@/components/admin/admin-chrome";

/* The message queue (page.tsx, thread-list.tsx): "Open" and "Sorted", each
   a two-up grid of thread cards -- the kind's chip and the date, the
   member's row, then the subject over its preview. At the wide column, not
   the reading measure, as the page is. */
export default function AdminMessagesLoading() {
  return (
    <AdminPageSkeleton title="Messages" measure={false}>
      <AdminSectionSkeleton label="Open">
        <div className={ADMIN_GRID}>
          <ThreadCardSkeleton />
        </div>
      </AdminSectionSkeleton>
      <AdminSectionSkeleton label="Sorted">
        <div className={ADMIN_GRID}>
          {[0, 1, 2, 3].map((i) => (
            <ThreadCardSkeleton key={i} />
          ))}
        </div>
      </AdminSectionSkeleton>
    </AdminPageSkeleton>
  );
}

function ThreadCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <ChipSkeleton label="Bug report" />
        <div className="skeleton-warm ml-auto h-2 w-10 rounded-md" />
      </div>
      <IdentityRowSkeleton nameSize={13.5} metaSize={12.5} nameWidth="w-28" metaWidth="w-44" />
      <div className="min-w-0">
        <div className="flex h-[19.5px] items-center">
          <div className="skeleton-warm h-2.5 w-3/5 rounded-md" />
        </div>
        <div className="flex h-[18.75px] items-center">
          <div className="skeleton-warm h-2 w-4/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}
