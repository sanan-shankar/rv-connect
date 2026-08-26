"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";

/**
 * Do one admin thing: mark the control busy, run the action, say what
 * happened, and let go of the control whatever the answer was.
 *
 * Nine functions across six files wrote this out, and six of them carried the
 * same verbatim B-042 comment explaining the `finally` -- which is the tell.
 * B-042 is the bug where a rejected call left a row's buttons disabled for the
 * rest of the session, because `setBusy(null)` sat after the `return` instead
 * of in a `finally`. Six copies of a guard is six chances to write the seventh
 * without it; here it is one line that cannot be forgotten.
 *
 * `busy` is the key of whatever is in flight, or null. Surfaces with one
 * control pass a fixed key and read `busy !== null`; surfaces with a row of
 * them pass the row id, which is what disables that row and no other.
 *
 * `act` returns whether the action succeeded, for the callers that branch on
 * it (closing a confirm dialog only if the thing it confirmed actually
 * happened).
 *
 * Two options, deliberately not three:
 *
 *   onDone          instead of router.refresh() -- the mail card inside a
 *                   person's page refreshes its own list rather than the route
 *   refreshOnError  as well as the toast. The reports queue needs it: its
 *                   commonest refusal is "another admin already settled this"
 *                   (audit M01), so the row on screen is the stale thing that
 *                   caused the mistake, and leaving it invites the same click.
 *
 * Anything needing a third option should keep its own handler instead. The
 * confirm-dialog flows in person-detail do exactly that.
 */
export function useAdminAct(options?: { onDone?: () => void; refreshOnError?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(
    key: string,
    fn: () => Promise<{ error?: string } | void>,
    done: string
  ): Promise<boolean> {
    setBusy(key);
    try {
      const result = await callAction(fn);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        if (options?.refreshOnError) router.refresh();
        return false;
      }
      toast.success(done);
      if (options?.onDone) options.onDone();
      else router.refresh();
      return true;
    } finally {
      // finally, not a trailing statement: a rejected call used to leave the
      // control that started it disabled for the rest of the session
      // (audit B-042).
      setBusy(null);
    }
  }

  return { busy, act };
}
