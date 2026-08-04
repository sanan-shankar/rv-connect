"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinCatchupByToken } from "@/app/(main)/catchups/actions";

/**
 * The accept/decline pair on an invite link, for someone already signed in.
 *
 * "Not now" is a plain link back to the feed rather than anything that writes:
 * declining an invitation is just not accepting it, and recording a refusal
 * would only create a row nobody will ever read.
 */
export function AcceptInvite({ token, groupName }: { token: string; groupName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    const result = await joinCatchupByToken(token);
    if ("error" in result && result.error) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    if ("catchupId" in result && result.catchupId) {
      toast.success(`You're in ${groupName}.`);
      // replace, not push: the invite link has done its job, and leaving it in
      // history means Back walks into a page that would just bounce forward.
      router.replace(`/catchups/${result.catchupId}`);
      return;
    }
    setBusy(false);
  }

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={accept}>
        {busy ? "Joining..." : "Join this Catch-up"}
      </Button>
      <Button
        variant="ghost"
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => router.push("/feed")}
      >
        Not now
      </Button>
    </div>
  );
}
