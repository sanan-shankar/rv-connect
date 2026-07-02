"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminVerifyUser } from "@/components/profile/admin-actions";
import { batchLine } from "@/lib/utils";
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
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Everyone is verified. Nothing waiting.
      </div>
    );
  }

  async function verify(id: string) {
    setBusy(id);
    const result = await adminVerifyUser(id, "office_list");
    setBusy(null);
    if (result.error) toast.error(result.error);
    else toast.success("Verified");
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link href={`/profile/${u.id}`} className="hover:underline">
                  {u.name}
                </Link>
                {u.verifyState === "flagged" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    <Flag className="h-3 w-3" />
                    Flagged
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {batchLine(u)} · {u.email}
                {u.admissionNumber != null && ` · Adm. ${u.admissionNumber}`}
                {u.yearJoined && u.yearLeft && ` · ${u.yearJoined}-${u.yearLeft}`}
              </p>
            </div>
            <Button size="sm" variant="primary" disabled={busy === u.id} onClick={() => verify(u.id)}>
              <BadgeCheck className="mr-1 h-3.5 w-3.5" />
              Verify
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
