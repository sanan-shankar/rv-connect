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

  if (threads.length === 0) {
    return <p className="text-sm text-muted-foreground">Nobody has written in. All clear.</p>;
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

  return (
    <div className="flex flex-col gap-2.5">
      {threads.map((t) => {
        const open = openId === t.id;
        const last = t.messages[t.messages.length - 1];
        return (
          <div
            key={t.id}
            className="overflow-hidden rounded-[var(--radius)] border border-border bg-card"
          >
            <button
              type="button"
              onClick={() => handleToggle(t)}
              aria-expanded={open}
              // hover:bg-mist/50 put ~2 dL* between this row and the card it
              // sits on, which is the just-noticeable floor. state-layer is a
              // translucent tint measured at ~4.4 dL* on every surface, and it
              // brings the press tint with it (the old active:bg-mist/70).
              className="flex w-full items-start gap-3 p-4 text-left state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <BirdAvatar user={t.member} size={36} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14px] font-semibold text-foreground">{t.member.name}</span>
                  <span className="text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground">
                    {kindLabel(t.kind)}
                  </span>
                  {t.adminUnread && (
                    <span className="rounded-full bg-cinnamon px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white">
                      New
                    </span>
                  )}
                  {t.status === "closed" && (
                    <span className="rounded-full bg-mist px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      Sorted
                    </span>
                  )}
                  <span className="ml-auto text-[11.5px] text-muted-foreground">
                    {formatTimeAgo(new Date(t.lastMessageAt))}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">
                  {threadTitle(t)}
                </p>
                {!open && last && (
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
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
                      className="rounded-full px-2 text-[13px] font-medium text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy/40"
                    >
                      See {t.member.name.split(" ")[0]}&apos;s profile
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
