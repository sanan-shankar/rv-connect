import { IndianRupee, Send, UserPlus, Users } from "lucide-react";
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
        {/* AdminEmpty's line box (13px at 1.5, py-1): the sentence is one
            line from sm and two on a phone, where it is 583px of words in a
            350px column. */}
        <div className="px-0.5 py-1">
          <div className="flex h-[19.5px] items-center">
            <div className="skeleton-warm h-2.5 w-full rounded-md sm:w-[583px] sm:max-w-full" />
          </div>
          <div className="flex h-[19.5px] items-center sm:hidden">
            <div className="skeleton-warm h-2.5 w-2/5 rounded-md" />
          </div>
        </div>
      </AdminSectionSkeleton>

      <AdminSectionSkeleton label="The place">
        <StatStripSkeleton
          tiles={[
            { label: "Members", icon: Users },
            { label: "New this week", icon: UserPlus },
            { label: "Mail sent today", icon: Send },
            { label: "Given this month", icon: IndianRupee },
          ]}
        />
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

