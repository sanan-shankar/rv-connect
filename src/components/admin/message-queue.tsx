"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Conversation, type ConversationMessage } from "@/components/messages/conversation";
import { MessageComposer } from "@/components/messages/message-composer";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { kindLabel, threadTitle } from "@/lib/admin-threads";
import { markThreadSeenByAdmin, setThreadStatus } from "@/app/(main)/messages/actions";
import { formatTimeAgo } from "@/lib/utils";

/**
 * Two threads to a line. No `items-start`: grid's default stretch keeps the two
 * cards on a line the same height, so a two-line preview beside a three-line one
 * reads as a pair rather than a step. An open card spans both columns, so it is
 * alone in its row and can never drag a neighbour taller.
 */
const QUEUE_GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2";

export interface AdminThreadRow {
  id: string;
  subject: string | null;
  kind: string;
  status: string;
  adminUnread: boolean;
  lastMessageAt: string;
  member: { id: string; name: string; photoUrl: string | null; birdOverride: string | null };
  messages: ConversationMessage[];
}

/**
 * The admin queue for member messages: bug reports, ideas, follow-ups on
 * things people reported, and replies to moderation notes, all in the panel
 * the rest of moderation already lives in. A row opens in place, so answering
 * three of them in a row never costs a page load.
 *
 * Every mutation below re-checks the admin role on the server; nothing here is
 * trusted (see src/app/(main)/messages/actions.ts).
 */
export function MessageQueue({
  threads,
  initialOpenId,
}: {
  threads: AdminThreadRow[];
  initialOpenId?: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // When a row is auto-opened from the admin's notification (?thread=<id>),
  // clear its "new" marker once on mount, the same as clicking it would. Runs a
  // single time so it cannot loop against the router.refresh it triggers.
  const clearedOnMount = useRef(false);
  useEffect(() => {
    if (clearedOnMount.current || !initialOpenId) return;
    clearedOnMount.current = true;
    const row = threads.find((t) => t.id === initialOpenId);
    if (row?.adminUnread) {
      void markThreadSeenByAdmin(initialOpenId).then(() => router.refresh());
    }
  }, [initialOpenId, threads, router]);

  /* Sorted threads are done. They were sitting in the same stack as the live
     ones, at the same size, so a panel with three answered messages and one
     waiting looked like four jobs (owner, 2026-08-04: "put all the sorted
     messages ... away, or at least collapsible"). They keep their own
     disclosure, shut unless the admin asks or unless the thread a notification
     pointed at happens to be in there. */
  const live = threads.filter((t) => t.status !== "closed");
  const sorted = threads.filter((t) => t.status === "closed");
  const [showSorted, setShowSorted] = useState(
    Boolean(initialOpenId && sorted.some((t) => t.id === initialOpenId))
  );

  if (threads.length === 0) {
    return <p className="text-[13px] text-muted-foreground">Nobody has written in. All clear.</p>;
  }

  function handleToggle(thread: AdminThreadRow) {
    const next = openId === thread.id ? null : thread.id;
    setOpenId(next);
    if (next && thread.adminUnread) {
      void markThreadSeenByAdmin(thread.id).then(() => router.refresh());
    }
  }

  async function handleStatus(threadId: string, status: "open" | "closed") {
    setBusyId(threadId);
    const result = await setThreadStatus(threadId, status);
    setBusyId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(status === "closed" ? "Marked as sorted." : "Reopened.");
    router.refresh();
  }

  function row(t: AdminThreadRow) {
    const open = openId === t.id;
    const last = t.messages[t.messages.length - 1];
    return (
      <div
        key={t.id}
        /* Collapsed rows sit two to a line: at 1112px one row was ~856px wide
           to carry a name and a truncated sentence, so most of the panel's
           width was empty (owner: "there's so much wide space. Maybe the
           messages can be in two column layout"). An OPEN row takes the full
           width back, because reading a conversation and writing a reply is
           the one thing here that actually wants the room. */
        className={`overflow-hidden rounded-[var(--radius)] border border-border bg-card ${
          open ? "sm:col-span-2" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => handleToggle(t)}
          aria-expanded={open}
          // hover:bg-mist/50 put ~2 dL* between this row and the card it
          // sits on, which is the just-noticeable floor. state-layer is a
          // translucent tint measured at ~4.4 dL* on every surface, and it
          // brings the press tint with it (the old active:bg-mist/70).
          className="flex w-full items-start gap-2.5 p-3 text-left state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <BirdAvatar user={t.member} size={30} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            {/* flex-nowrap with a truncating name: wrapping put the timestamp
                on its own line in a half-width column, which is what made
                these rows tall. */}
            <div className="flex items-baseline gap-x-1.5">
              <span className="truncate text-[13.5px] font-semibold text-foreground">
                {t.member.name}
              </span>
              <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                {kindLabel(t.kind)}
              </span>
              {t.adminUnread && (
                <span className="shrink-0 rounded-full bg-cinnamon px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
                  New
                </span>
              )}
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                {formatTimeAgo(new Date(t.lastMessageAt))}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
              {threadTitle(t)}
            </p>
            {!open && last && (
              <p className="truncate text-[12.5px] text-muted-foreground">
                {last.fromAdmin && last.author ? "Admin: " : ""}
                {last.body}
              </p>
            )}
          </div>
          <ChevronDown
            aria-hidden
            className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={2}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
              className="border-t border-border px-4 pb-4 pt-5"
            >
              <Conversation messages={t.messages} viewerId="" />

              <div className="mt-5 border-t border-border pt-4">
                <MessageComposer
                  mode="admin-reply"
                  threadId={t.id}
                  placeholder={`Write back to ${t.member.name.split(" ")[0]}...`}
                  submitLabel="Reply"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {t.status === "open" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === t.id}
                    onClick={() => handleStatus(t.id, "closed")}
                  >
                    <Check className="size-3.5" strokeWidth={2} />
                    Mark as sorted
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === t.id}
                    onClick={() => handleStatus(t.id, "open")}
                  >
                    <RotateCcw className="size-3.5" strokeWidth={2} />
                    Reopen
                  </Button>
                )}
                <Link
                  href={`/profile/${t.member.id}`}
                  className="rounded-full px-2 text-[13px] font-medium text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                >
                  See {t.member.name.split(" ")[0]}&apos;s profile
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {live.length > 0 ? (
        <div className={QUEUE_GRID}>{live.map(row)}</div>
      ) : (
        <p className="px-1 text-[13px] text-muted-foreground">
          Nothing waiting. Everything has been sorted.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowSorted((v) => !v)}
            aria-expanded={showSorted}
            className="flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronDown
              aria-hidden
              className={`size-3.5 transition-transform duration-200 ease-out ${
                showSorted ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
            Sorted ({sorted.length})
          </button>
          {showSorted && <div className={QUEUE_GRID}>{sorted.map(row)}</div>}
        </div>
      )}
    </div>
  );
}
