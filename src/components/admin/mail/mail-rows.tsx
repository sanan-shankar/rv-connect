"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip, type ChipTone } from "@/components/admin/admin-chip";
import { formatTimeAgo, metaLine } from "@/lib/utils";
import { dismissMail, retryMail } from "@/app/(main)/admin/mail/actions";

export interface MailRow {
  id: string;
  to: string;
  kind: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  personId: string | null;
  personName: string | null;
}

const TONE: Record<string, ChipTone> = {
  sent: "good",
  queued: "warn",
  sending: "warn",
  failed: "bad",
};

/** What the template is FOR, in the words of the person receiving it. */
export function mailKindLabel(kind: string): string {
  switch (kind) {
    case "verify":
      return "Confirm your address";
    case "reset":
      return "Password reset";
    case "password-changed":
      return "Password changed";
    default:
      return kind;
  }
}

export function MailRows({
  rows,
  showActions = false,
}: {
  rows: MailRow[];
  /** Retry and clear, on the failed list only. Nothing else is actionable. */
  showActions?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, fn: (id: string) => Promise<{ error?: string }>, done: string) {
    setBusy(id);
    const result = await fn(id);
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(done);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-foreground">
              {r.personId ? (
                <Link
                  href={`/admin/people/${r.personId}`}
                  className="truncate rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {r.personName}
                </Link>
              ) : (
                <span className="truncate">{r.to}</span>
              )}
              <Chip label={mailKindLabel(r.kind)} tone="info" />
              {r.status !== "sent" && (
                <Chip label={r.status} tone={TONE[r.status] ?? "idle"} />
              )}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {metaLine(
                r.personId ? r.to : null,
                formatTimeAgo(new Date(r.sentAt ?? r.createdAt)),
                r.attempts > 1 ? `${r.attempts} tries` : null
              )}
            </p>
            {/* The whole reason a failed row is worth a line. Recorded on
                every failure since the queue shipped, shown until now nowhere. */}
            {r.lastError && (
              <p className="mt-1 break-words text-[12px] leading-snug text-destructive">
                {r.lastError}
              </p>
            )}
          </div>

          {showActions && (
            <div className="flex shrink-0 gap-1.5">
              <Button
                size="xs"
                variant="outline"
                disabled={busy === r.id}
                onClick={() =>
                  act(r.id, retryMail, "Back in the queue. It goes out on the next page load.")
                }
              >
                Try again
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={busy === r.id}
                onClick={() => act(r.id, dismissMail, "Cleared")}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
