import Link from "@/components/common/link";
import { AdminPersonRow, type AdminPerson } from "@/components/admin/admin-person-row";
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
  member: AdminPerson;
  preview: string;
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
      {threads.map((t) => {
        const title = threadTitle(t);
        // A "notice" thread's title IS its kind ("Notes from the admins"),
        // which the chip beside it already says. Showing both puts the same
        // four words on the card twice.
        const titleRepeatsKind = title === kindLabel(t.kind) || t.kind === "notice";

        return (
          <div
            key={t.id}
            className="state-layer relative flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3"
          >
            {/* The whole card opens the thread, as a stretched overlay rather
                than a wrapper. A wrapper would put the member's name link
                inside another anchor, which is invalid HTML and which Safari
                resolves by dropping the inner one, silently breaking the one
                click the owner asked for ("click on their name to view
                profile"). The overlay sits at z-0; everything real sits above
                it. */}
            <Link
              href={`/admin/messages/${t.id}`}
              aria-label={`Open: ${title}`}
              className="absolute inset-0 z-0 rounded-[var(--radius)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            />

            <div className="relative z-[1] flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <Chip label={kindLabel(t.kind)} tone="info" />
              {t.adminUnread && <Chip label="New" tone="warn" />}
              <span className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
                {formatTimeAgo(new Date(t.lastMessageAt))}
              </span>
            </div>

            <div className="pointer-events-none relative z-[1] [&_a]:pointer-events-auto">
              <AdminPersonRow person={t.member} className="border-0 bg-transparent p-0" />
            </div>

            <div className="relative z-[1] min-w-0">
              {!titleRepeatsKind && (
                <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
              )}
              {t.preview && (
                <p className="truncate text-[12.5px] text-muted-foreground">{t.preview}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
