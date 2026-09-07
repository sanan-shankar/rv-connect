import {
  ListChecks,
  Inbox,
  Images,
  Flag,
  Users,
  FileText,
  MessagesSquare,
  IndianRupee,
  Mail,
  ChartLine,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  The admin sections, in one place.
 *
 *  Read by the sidebar (which swaps its whole nav for this list while you
 *  are under /admin) and by the Overview page's own section list, which is
 *  how a phone gets here without opening the drawer. One source, so the two
 *  can never disagree about what exists.
 *
 *  Grouped by the JOB, not by the model behind it: things that need you now,
 *  the people and what they made, then the health of the place. Nine flat
 *  rows is a list you read; three groups of three is a list you scan.
 * ------------------------------------------------------------------ */

/** Which count from `loadAdminCounts()` belongs on the row, if any. */
export type AdminCountKey = "waiting" | "messages" | "reports" | "photos" | "people";

interface AdminSectionDef {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One line, shown on the Overview section list. Not shown in the rail. */
  blurb: string;
  countKey?: AdminCountKey;
}

export interface AdminNavGroup {
  /** The uppercase label above the group. */
  label: string;
  sections: AdminSectionDef[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Waiting",
    sections: [
      {
        href: "/admin",
        label: "Overview",
        icon: ListChecks,
        blurb: "Everything that needs you, in one list.",
        countKey: "waiting",
      },
      {
        href: "/admin/review",
        label: "Review",
        icon: Images,
        blurb: "Photographs waiting to be let in, and the ones with no date.",
        countKey: "photos",
      },
      {
        href: "/admin/messages",
        label: "Messages",
        icon: Inbox,
        blurb: "What members have written in about.",
        countKey: "messages",
      },
      {
        href: "/admin/reports",
        label: "Reports",
        icon: Flag,
        blurb: "Flagged posts and people, pending and settled.",
        countKey: "reports",
      },
    ],
  },
  {
    label: "The community",
    sections: [
      {
        href: "/admin/people",
        label: "People",
        icon: Users,
        blurb: "Everyone here, what they have confirmed, and their details.",
        countKey: "people",
      },
      {
        href: "/admin/content",
        label: "Content",
        icon: FileText,
        blurb: "Posts, letters, comments and photos. Find one, take it down.",
      },
      {
        href: "/admin/catchups",
        label: "Catch-ups",
        icon: MessagesSquare,
        blurb: "Which Catch-ups are running, and which are stuck.",
      },
    ],
  },
  {
    label: "The place",
    sections: [
      {
        href: "/admin/support",
        label: "Support",
        icon: IndianRupee,
        blurb: "Who has given, how much, and what failed.",
      },
      {
        href: "/admin/mail",
        label: "Mail",
        icon: Mail,
        blurb: "The send queue, the daily budget, and the failures.",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
        blurb: "Who blocked, deleted or verified whom, and the failed sign-ins.",
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: ChartLine,
        blurb: "Who is here, what they open, and where they come from.",
      },
    ],
  },
];

/**
 * Active-row test.
 *
 * `/admin` is the Overview and would otherwise prefix-match every section
 * below it, lighting two rows at once. It is the one exact match; everything
 * else owns its children, so /admin/people/<id> keeps People lit.
 */
export function isAdminSectionActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

/** True while the sidebar should be showing the admin nav instead of the app's. */
export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
