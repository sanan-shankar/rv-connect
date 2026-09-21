import { AdminFilterBarSkeleton, AdminPageSkeleton, ChipSkeleton } from "@/components/admin/admin-skeleton";

/* Content (page.tsx, content-list.tsx): the filter bar and its count, then the
   rows -- a 64px thumbnail where the thing is a photograph, the kind's chip
   with who and when, the words under them, and the row's menu. */
export default function AdminContentLoading() {
  return (
    <AdminPageSkeleton title="Content" className="gap-5">
      <div className="flex flex-col gap-3">
        <AdminFilterBarSkeleton />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5">
              <div className="skeleton-warm size-16 shrink-0 rounded-[var(--radius-sm)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <ChipSkeleton label="Photo" />
                  <div className="skeleton-warm h-2 w-28 rounded-md" />
                </div>
                <div className="mt-1.5 flex h-[17.9px] items-center">
                  <div className="skeleton-warm h-2.5 w-40 max-w-full rounded-md" />
                </div>
              </div>
              <div className="grid size-8 shrink-0 place-items-center">
                <div className="skeleton-warm h-1 w-4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminPageSkeleton>
  );
}
