"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/admin/admin-chip";
import { AdminPersonRow, type AdminPerson } from "@/components/admin/admin-person-row";
import {
  Conversation,
  type ConversationMessage,
} from "@/components/messages/conversation";
import { MessageComposer } from "@/components/messages/message-composer";
import { kindLabel, threadTitle } from "@/lib/admin-threads";
import { setThreadStatus } from "@/app/(main)/messages/actions";

export interface AdminThreadDetail {
  id: string;
  subject: string | null;
  kind: string;
  status: string;
  lastMessageAt: string;
  member: AdminPerson;
  messages: ConversationMessage[];
  /** True when the page loaded only the most recent window of a long
   *  conversation (audit Low 86), so the view can say so. */
  olderExist: boolean;
}

export function ThreadView({ thread }: { thread: AdminThreadDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const firstName = thread.member.name.split(" ")[0];

  async function setStatus(status: "open" | "closed") {
    setBusy(true);
    try {
      const result = await callAction(() => setThreadStatus(thread.id, status));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "closed" ? "Marked as sorted." : "Reopened.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    /* A reading measure, not the full 1192px. A conversation is prose, and
       the one thing on this route that genuinely wants width is the reply
       box, which sits inside the same column. */
    <div className="flex max-w-3xl flex-col gap-4">
      <Link
        href="/admin/messages"
        className="inline-flex w-fit items-center gap-1.5 rounded-full text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" strokeWidth={2} />
        Messages
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip label={kindLabel(thread.kind)} tone="info" />
          {thread.status === "closed" && <Chip label="Sorted" tone="good" />}
        </div>
        <h1 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          {threadTitle(thread)}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AdminPersonRow
            person={thread.member}
            href={`/admin/people/${thread.member.id}`}
            className="min-w-0 flex-1"
            action={
              <Link href={`/admin/people/${thread.member.id}`}>
                <Button size="xs" variant="outline">
                  <UserRound className="size-3" strokeWidth={2} />
                  Their record
                </Button>
              </Link>
            }
          />
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        {thread.olderExist && (
          <p className="mb-4 text-[12.5px] text-muted-foreground">
            Showing the most recent part of this conversation.
          </p>
        )}
        <Conversation messages={thread.messages} viewerId="" />

        <div className="mt-5 border-t border-border pt-4">
          <MessageComposer
            mode="admin-reply"
            threadId={thread.id}
            placeholder={`Write back to ${firstName}...`}
            submitLabel="Reply"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {thread.status === "open" ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus("closed")}>
            <Check className="size-3.5" strokeWidth={2} />
            Mark as sorted
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus("open")}>
            <RotateCcw className="size-3.5" strokeWidth={2} />
            Reopen
          </Button>
        )}
        <Link
          href={`/profile/${thread.member.id}`}
          className="rounded-full px-2 text-[13px] font-medium text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
        >
          See {firstName}&apos;s profile
        </Link>
      </div>
    </div>
  );
}
