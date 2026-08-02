import Link from "next/link";
import { Bug, Flag, Lightbulb, MessageCircle, ShieldCheck } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { previewOf, threadTitle } from "@/lib/admin-threads";

export interface ThreadListRow {
  id: string;
  subject: string | null;
  kind: string;
  status: string;
  memberUnread: boolean;
  lastMessageAt: string;
  lastBody: string;
  lastFromAdmin: boolean;
  messageCount: number;
}

const KIND_GLYPH: Record<string, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  message: MessageCircle,
  notice: ShieldCheck,
  report: Flag,
};

/**
 * The member's own list of conversations with the admins: moderation notes,
 * things they reported, and anything they wrote themselves, in one place and
 * newest first. The whole row is the link, so it is a big target on a phone.
 */
export function ThreadList({ threads }: { threads: ThreadListRow[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {threads.map((t) => {
        const Glyph = KIND_GLYPH[t.kind] ?? MessageCircle;
        return (
          <li key={t.id}>
            <Link
              href={`/messages/${t.id}`}
              // The row's only hover used to be a 1px border tint on a 90px
              // card, which is the "most subtle highlight" register. The border
              // hint stays (it is the canopy cue), and state-layer gives the
              // surface itself something to say.
              className="card-elevated group flex items-start gap-3.5 rounded-[var(--radius)] border border-border bg-card p-4 transition-[colors,transform] duration-150 ease-out state-layer hover:border-canopy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.995]"
            >
              <span
                aria-hidden
                className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${
                  t.kind === "notice" || t.kind === "report"
                    ? "bg-canopy/10 text-canopy"
                    : "bg-mist text-muted-foreground"
                }`}
              >
                <Glyph className="size-[17px]" strokeWidth={1.9} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-heading text-[15.5px] font-bold leading-snug tracking-[-0.01em] text-foreground">
                    {threadTitle(t)}
                  </p>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                    {t.memberUnread && (
                      <span
                        aria-label="Unread reply"
                        className="size-2 rounded-full bg-cinnamon"
                      />
                    )}
                    <span className="text-[12px] text-muted-foreground">
                      {formatTimeAgo(new Date(t.lastMessageAt))}
                    </span>
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.6] text-muted-foreground">
                  {t.lastFromAdmin ? "" : "You: "}
                  {previewOf(t.lastBody, 140)}
                </p>

                {(t.messageCount > 1 || t.status === "closed") && (
                  <p className="mt-2 flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t.messageCount > 1 && <span>{t.messageCount} messages</span>}
                    {t.status === "closed" && (
                      <span className="rounded-full bg-mist px-2 py-0.5 normal-case tracking-normal">
                        Sorted
                      </span>
                    )}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
