"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToInvite } from "@/app/(main)/groups/actions";
import { toast } from "sonner";

/**
 * InviteResponse: the accept/decline banner shown to a person who has a pending
 * invite to a group (the entry point reached from their notification bell).
 * Accepting joins them even when the group is private.
 */
export function InviteResponse({
  groupId,
  groupName,
  inviterName,
}: {
  groupId: string;
  groupName: string;
  inviterName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    const result = await respondToInvite(groupId, action);
    if (result?.error) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    if (action === "accept") {
      toast.success(`Welcome to ${groupName}`);
    } else {
      toast.success("Invite declined");
      router.push("/groups");
      return;
    }
    router.refresh();
  }

  return (
    <section className="card-elevated flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-leaf/30 bg-leaf/[0.06] p-4">
      <Mail className="h-5 w-5 shrink-0 text-leaf" />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <span className="font-semibold">{inviterName}</span> invited you to join{" "}
        <span className="font-semibold">{groupName}</span>.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => respond("decline")}
          disabled={busy}
        >
          Decline
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="rounded-full"
          onClick={() => respond("accept")}
          disabled={busy}
        >
          {busy ? "Joining..." : "Accept invite"}
        </Button>
      </div>
    </section>
  );
}
