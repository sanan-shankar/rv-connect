import {
  AdminPageSkeleton,
  AdminSectionSkeleton,
  ChipSkeleton,
} from "@/components/admin/admin-skeleton";

/* Reports (page.tsx, report-list.tsx): "Waiting on you", then "Settled" as
   a column of report cards -- who reported whom and when, the reason's chip
   opposite, and the reported words in their well. */
export default function AdminReportsLoading() {
  return (
    <AdminPageSkeleton title="Reports">
      {/* Its one line: an empty queue is the page's usual state. */}
      <AdminSectionSkeleton label="Waiting on you">
        <div className="flex h-7 items-center px-0.5">
          <div className="skeleton-warm h-2.5 w-72 max-w-full rounded-md" />
        </div>
      </AdminSectionSkeleton>
      <AdminSectionSkeleton label="Settled">
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      </AdminSectionSkeleton>
    </AdminPageSkeleton>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex h-[18.5px] items-center">
            <div className="skeleton-warm h-2.5 w-56 max-w-full rounded-md" />
          </div>
          <div className="mt-0.5 flex h-[18px] items-center">
            <div className="skeleton-warm h-2 w-24 rounded-md" />
          </div>
        </div>
        <ChipSkeleton label="Spam" />
      </div>
      <div className="h-[37.1px] rounded-[var(--radius-md)] bg-muted" />
    </div>
  );
}
