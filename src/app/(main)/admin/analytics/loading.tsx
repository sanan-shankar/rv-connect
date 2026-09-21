import { VIEWS } from "@/components/admin/analytics/tabs";
import { PageHeader } from "@/components/layout/page-header";

/* Analytics before it arrives (page.tsx): the real title, the nine views as
   their own pills with the words invisible, the line that says what the view
   is, then the Live view's shape -- four stat tiles and the two panels under
   them. Live, because that is where the address lands unless it asks for
   another view. */
export default function AdminAnalyticsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Analytics" />
      <div className="-mx-1 flex gap-1 overflow-hidden px-1 pb-0.5">
        {VIEWS.map((v) => (
          <span key={v.key} className="skeleton-warm shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium">
            <span className="invisible">{v.label}</span>
          </span>
        ))}
      </div>
      <div className="-mt-1 flex h-[18.75px] items-center">
        <div className="skeleton-warm h-2 w-40 rounded-md" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-3">
              <div className="flex h-[17.25px] items-center">
                <div className="skeleton-warm h-2 w-24 rounded-md" />
              </div>
              <div className="flex h-[27.3px] items-center">
                <div className="skeleton-warm h-5 w-10 rounded-md" />
              </div>
              <div className="flex h-[15.8px] items-center">
                <div className="skeleton-warm h-2 w-full rounded-md" />
              </div>
              <div className="flex h-[15.8px] items-center">
                <div className="skeleton-warm h-2 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid items-start gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[180px] rounded-[var(--radius-md)] border border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
