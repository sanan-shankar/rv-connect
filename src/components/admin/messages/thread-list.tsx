import Link from "next/link";
import { AdminPersonRow } from "@/components/admin/admin-person-row";
import { Chip } from "@/components/admin/admin-chip";
import { ADMIN_GRID } from "@/components/admin/admin-chrome";
import { kindLabel, threadTitle } from "@/lib/admin-threads";
import { formatTimeAgo } from "@/lib/utils";

export interface ThreadRow {
  id: string;
  subject: string | null;
  kind: string;
  status: string;
  adminUnread: boolean;
  lastMessageAt: string;
  member: {
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
    birdOverride: string | null;
    accountType: string | null;
    batchType: string | null;
    batchYear: number | null;
  };
  preview: string;
  messageCount: number;
}

/**
 * A thread, as a row.
 *
 * Note that the identity half is `AdminPersonRow`, unchanged, and everything
 * this section knows that People does not (what kind of message, whether it
 * is new, how long ago) rides above and below it rather than being written
 * into the subtitle. That is the whole rule: the subtitle is who somebody is,
 * and never what is happening to them.
 *
 * A server component: nothing here is interactive except the links.
 */
export function ThreadList({ threads }: { threads: ThreadRow[] }) {
  return (
    <div className={ADMIN_GRID}>
      {threads.map((t) => (
        <div
          key={t.id}
          className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3"
        >
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Chip label={kindLabel(t.kind)} tone="info" />
            {t.adminUnread && <Chip label="New" tone="warn" />}
            <span className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
              {formatTimeAgo(new Date(t.lastMessageAt))}
            </span>
          </div>

          <AdminPersonRow person={t.member} className="border-0 bg-transparent p-0" />

          <Link
            href={`/admin/messages/${t.id}`}
            className="state-layer -mx-1 rounded-[var(--radius-md)] px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <p className="truncate text-[13px] font-medium text-foreground">
              {threadTitle(t)}
            </p>
            {t.preview && (
              <p className="truncate text-[12.5px] text-muted-foreground">{t.preview}</p>
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}
