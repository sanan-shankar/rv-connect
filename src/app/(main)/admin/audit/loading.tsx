import { AdminPageSkeleton, AdminSectionSkeleton } from "@/components/admin/admin-skeleton";
import { TextSkeleton } from "@/components/common/skeleton";

/* The audit log reads the largest table on the site (audit M06). Its shape
   (page.tsx): the record as one bordered list of rows split by hairlines.

   Each row is the real row's own markup -- a baseline-aligned wrapping line
   of an action, who did it to whom, a detail and when, 14px and 13px at
   px-4 py-3 -- with sample words set invisible inside the bars. That is what
   makes it exact rather than close: the row's height is the two sizes'
   baseline-aligned line (44.5px, which a fixed 44 drifted from by a pixel a
   row), and on a phone the row wraps to a second line exactly where a real
   one does, because the words doing the wrapping are the same length. */
export default function AuditLoading() {
  return (
    <AdminPageSkeleton title="Audit log">
      <AdminSectionSkeleton label="Actions on the record">
        <ul className="flex flex-col divide-y divide-border/60 rounded-[var(--radius-card)] border border-border/60 bg-card">
          {ROWS.map(([who, detail], i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
              <span className="text-sm font-medium">
                <TextSkeleton>Verified</TextSkeleton>
              </span>
              <span className="text-sm">
                <TextSkeleton>{who}</TextSkeleton>
              </span>
              <span className="text-[13px]">
                <TextSkeleton>{detail}</TextSkeleton>
              </span>
              <span className="ml-auto shrink-0 text-[13px] tabular-nums">
                <TextSkeleton>3h ago</TextSkeleton>
              </span>
            </li>
          ))}
        </ul>
      </AdminSectionSkeleton>
    </AdminPageSkeleton>
  );
}

const ROWS = [
  ["Sanan Shankar → Aniket Ullal", "admin_manual"],
  ["Sanan Shankar → Gayathri Iyengar", "admin_manual"],
  ["Sanan Shankar → Ruthvik Gollapinni", "admin_manual"],
  ["Sanan Shankar → Ayaan Dutt", "admin_manual"],
  ["Sanan Shankar → Nanda Kishore", "admin_manual"],
  ["Sanan Shankar → Vyshnavi Bodda", "admin_manual"],
  ["Sanan Shankar → Keerthana R", "admin_manual"],
  ["Sanan Shankar → Bharati Challa", "admin_manual"],
  ["Sanan Shankar → Shreyas Achal", "admin_manual"],
  ["Sanan Shankar → Aravv Shah", "admin_manual"],
];
