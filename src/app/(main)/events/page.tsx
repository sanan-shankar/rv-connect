import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function EventsPage() {
  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Reunions, founders' week, city meet-ups, and gatherings in the valley."
      />
      <ComingSoon
        icon={CalendarDays}
        eyebrow="In the works"
        title="Where the valley gathers"
        cta={{ href: "/feed", label: "Back to the feed" }}
      >
        <p>
          Events will let anyone post a gathering, with a date, a place, and a simple way to say you
          are coming. The next one will surface on your feed as it approaches.
        </p>
        <p>
          This lands alongside the deploy. Until then, share plans with everyone on the feed or
          inside a group.
        </p>
      </ComingSoon>
    </div>
  );
}
