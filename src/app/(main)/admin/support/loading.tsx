import { AlertTriangle, CalendarDays, CreditCard, IndianRupee, TrendingUp, Users } from "lucide-react";
import {
  AdminPageSkeleton,
  AdminSectionSkeleton,
  StatStripSkeleton,
} from "@/components/admin/admin-skeleton";

/* Support in the admin wing (page.tsx): the two stat strips with their
   icons and labels drawn and the note under them, then the ledger of gifts. */
export default function AdminSupportLoading() {
  return (
    <AdminPageSkeleton title="Support">
      <StatStripSkeleton
        tiles={[
          { label: "Given, all time", icon: IndianRupee },
          { label: "This month", icon: CalendarDays },
          { label: "People who gave", icon: Users },
          { label: "Did not go through", icon: AlertTriangle },
        ]}
      />
      <StatStripSkeleton
        tiles={[
          { label: "Finished paying", icon: TrendingUp },
          { label: "Opened a payment", icon: Users },
          { label: "Typical gift", icon: IndianRupee },
          { label: "Most used", icon: CreditCard },
        ]}
      />
      <div className="-mt-3 flex h-[18px] items-center">
        <div className="skeleton-warm h-2 w-96 max-w-full rounded-md" />
      </div>
      <AdminSectionSkeleton label="Given">
        <div className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex h-12 items-center gap-3 px-4">
              <div className="skeleton-warm h-2.5 w-40 rounded-md" />
              <div className="skeleton-warm ml-auto h-2.5 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </AdminSectionSkeleton>
    </AdminPageSkeleton>
  );
}
