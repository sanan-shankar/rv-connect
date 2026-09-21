import { ADMIN_NAV } from "@/components/admin/admin-nav";
import {
  AdminPageSkeleton,
  AdminSectionSkeleton,
  StatStripSkeleton,
} from "@/components/admin/admin-skeleton";

/* The overview before it arrives (page.tsx): "Waiting on you", "The place"
   as its stat strip with the four labels drawn, and on a phone the list of
   sections, which never changes and so is drawn as the words it is. */
export default function AdminOverviewLoading() {
  return (
    <AdminPageSkeleton title="Admin">
      {/* Its one line, because nothing waiting is the page's usual state
          and its good news (page.tsx); rows, when there are some, arrive
          under a heading that did not move. */}
      <AdminSectionSkeleton label="Waiting on you">
        <div className="flex h-7 items-center px-0.5">
          <div className="skeleton-warm h-2.5 w-96 max-w-full rounded-md" />
        </div>
      </AdminSectionSkeleton>

      <AdminSectionSkeleton label="The place">
        <StatStripSkeleton labels={["Members", "New this week", "Mail sent today", "Given this month"]} />
      </AdminSectionSkeleton>

      <AdminSectionSkeleton label="Everything else" className="md:hidden">
        <div className="flex flex-col gap-1.5">
          {ADMIN_NAV.flatMap((g) => g.sections)
            .filter((s) => s.href !== "/admin")
            .map((s) => (
              <div key={s.href} className="flex items-start gap-2.5 rounded-[var(--radius)] border border-border bg-card p-3">
                <s.icon className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground">{s.label}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{s.blurb}</p>
                </div>
              </div>
            ))}
        </div>
      </AdminSectionSkeleton>
    </AdminPageSkeleton>
  );
}

