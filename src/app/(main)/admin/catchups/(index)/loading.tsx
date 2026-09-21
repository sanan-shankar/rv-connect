import {
  AdminPageSkeleton,
  AdminSectionSkeleton,
  ChipSkeleton,
} from "@/components/admin/admin-skeleton";

/* Every Catch-up (page.tsx): "Past its date", which is nearly always the one
   line saying nothing is stuck, then "Everything else" as its cards -- the
   name's 13.5px line and the meta under it, the status chip opposite, and the
   Edition's line along the foot. */
export default function AdminCatchupsLoading() {
  return (
    <AdminPageSkeleton title="Catch-ups">
      <AdminSectionSkeleton label="Past its date">
        <div className="flex h-[27.5px] items-center px-0.5">
          <div className="skeleton-warm h-2.5 w-72 max-w-full rounded-md" />
        </div>
      </AdminSectionSkeleton>
      <AdminSectionSkeleton label="Everything else">
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-2">
                {/* 24px, not the name's 20.25: it is an inline link in a
                    plain block, so the block's own 16px strut sets its line. */}
                <div className="min-w-0">
                  <div className="flex h-6 items-center">
                    <div className="skeleton-warm h-2.5 w-40 rounded-md" />
                  </div>
                  <div className="mt-0.5 flex h-[18px] items-center">
                    <div className="skeleton-warm h-2 w-48 rounded-md" />
                  </div>
                </div>
                <ChipSkeleton label="Taking questions" />
              </div>
              <div className="flex h-[17.2px] items-center">
                <div className="skeleton-warm h-2 w-64 max-w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </AdminSectionSkeleton>
    </AdminPageSkeleton>
  );
}
