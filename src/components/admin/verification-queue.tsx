"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminVerifyUser } from "@/components/profile/admin-actions";
import { batchLine, metaLine } from "@/lib/utils";
import { toast } from "sonner";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  accountType: string;
  verifyState: string;
  batchType: string | null;
  batchYear: number | null;
  admissionNumber: number | null;
  yearJoined: number | null;
  yearLeft: number | null;
}

export function VerificationQueue({ users }: { users: PendingUser[] }) {
  const [busy, setBusy] = useState<string | null>(null);

  if (users.length === 0) {
    return (
      <p className="px-1 py-1 text-[13px] text-muted-foreground">
        Everyone is verified. Nothing waiting.
      </p>
    );
  }

  async function verify(id: string) {
    setBusy(id);
    try {
      const result = await adminVerifyUser(id, "office_list");
      if (result.error) toast.error(result.error);
      else toast.success("Verified");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    /* Two to a line, like the message queue. One person waiting on a tick used
       a full 1112px-wide card for a name, a meta line and a button (owner,
       2026-08-04: "same with verification, each tile is so big"). */
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground">
              <Link
                href={`/profile/${u.id}`}
                className="truncate rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {u.name}
              </Link>
              {u.verifyState === "flagged" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  <Flag className="h-2.5 w-2.5" />
                  Flagged
                </span>
              )}
            </p>
            {/* The meta line wraps to two lines rather than truncating: in a
                half-width column the admission number is the whole reason this
                row exists, and it is last in the sentence. */}
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
              {metaLine(
                batchLine(u),
                u.email,
                u.admissionNumber != null && `Adm. ${u.admissionNumber}`,
                Boolean(u.yearJoined && u.yearLeft) && `${u.yearJoined}-${u.yearLeft}`
              )}
            </p>
          </div>
          <Button
            size="xs"
            variant="primary"
            className="shrink-0"
            disabled={busy === u.id}
            onClick={() => verify(u.id)}
          >
            <BadgeCheck className="h-3 w-3" />
            Verify
          </Button>
        </div>
      ))}
    </div>
  );
}
