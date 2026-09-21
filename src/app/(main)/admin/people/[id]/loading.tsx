import { AdminSectionSkeleton } from "@/components/admin/admin-skeleton";
import { ButtonSkeleton } from "@/components/common/skeleton";

/* One person's record (person-detail.tsx): the back link; the 64px bird
   beside the name's 26px line and the email under it, "View profile"
   opposite; then the two columns -- the editable details on the left, their
   standing, powers and counts in the 340px column on the right. The form's
   own fields are placeholders (a label over a 40px field), since the record's
   words are the one thing on this page worth waiting for. */
export default function AdminPersonLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-[19.5px] items-center">
        <div className="skeleton-warm h-2.5 w-16 rounded-md" />
      </div>
      <header className="flex flex-wrap items-center gap-3">
        <div className="skeleton-warm size-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="flex h-[32.5px] items-center">
            <div className="skeleton-warm h-5 w-48 rounded-md" />
          </div>
          <div className="mt-0.5 flex h-[19.5px] items-center">
            <div className="skeleton-warm h-2.5 w-56 max-w-full rounded-md" />
          </div>
        </div>
        <ButtonSkeleton size="sm" icon label="View profile" />
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <AdminSectionSkeleton label="Their details">
            <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5">
              <FieldSkeleton />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <FieldSkeleton />
            </div>
          </AdminSectionSkeleton>
        </div>
        <div className="flex flex-col gap-4">
          <AdminSectionSkeleton label="Standing">
            <div className="h-[333px] rounded-[var(--radius)] border border-border bg-card" />
          </AdminSectionSkeleton>
          <AdminSectionSkeleton label="Powers">
            <div className="h-[146px] rounded-[var(--radius)] border border-border bg-card" />
          </AdminSectionSkeleton>
        </div>
      </div>
    </div>
  );
}

/* A labelled field: the 13px label, the 40px field, the hint's 12px line. */
function FieldSkeleton() {
  return (
    <div>
      <div className="flex h-[19.5px] items-center">
        <div className="skeleton-warm h-2.5 w-20 rounded-md" />
      </div>
      <div className="skeleton-warm mt-1.5 h-10 rounded-[var(--radius-input)]" />
      <div className="mt-1 flex h-[18px] items-center">
        <div className="skeleton-warm h-2 w-48 max-w-full rounded-md" />
      </div>
    </div>
  );
}
