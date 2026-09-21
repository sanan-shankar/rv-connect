import { ChipSkeleton } from "@/components/admin/admin-skeleton";
import { ADMIN_MEASURE } from "@/components/admin/admin-chrome";

/* The reading room fetches a whole Catch-up -- every Edition, every question
   and every answer under it -- so it is the slowest page in the admin wing
   and the one that most needs a shimmer rather than a blank. Its shape
   (page.tsx): the "Every Catch-up" link over the Catch-up's name at the
   page title's 36px line, the meta line and the status chip, the reading-only
   note, then an Edition's heading, chip and questions. */
export default function AdminCatchupReadingRoomLoading() {
  return (
    <div className={`flex flex-col gap-6 ${ADMIN_MEASURE}`}>
      <div>
        <div className="mb-2 flex h-[18.75px] items-center">
          <div className="skeleton-warm h-2.5 w-24 rounded-md" />
        </div>
        <div className="mb-6 flex h-9 items-center">
          <div className="skeleton-warm h-6 w-56 rounded-md" />
        </div>
        <div className="-mt-4 flex h-[20.3px] items-center">
          <div className="skeleton-warm h-2.5 w-72 max-w-full rounded-md" />
        </div>
        <div className="mt-2 flex items-center gap-1">
          <ChipSkeleton label="Taking questions" />
        </div>
        <div className="mt-3 space-y-1">
          <div className="skeleton-warm h-2.5 w-full rounded-md" />
          <div className="skeleton-warm h-2.5 w-3/5 rounded-md" />
        </div>
      </div>
      <section className="flex flex-col gap-2.5">
        <div className="flex h-[19.5px] items-center px-0.5">
          <div className="skeleton-warm h-2.5 w-20 rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] rounded-[var(--radius)] border border-border bg-card" />
          ))}
        </div>
      </section>
    </div>
  );
}
