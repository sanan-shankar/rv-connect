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
 * ONE option, deliberately:
 *
 *   refreshOnError  refresh as well as the toast. The reports queue needs it:
 *                   its commonest refusal is "another admin already settled
 *                   this" (audit M01), so the row on screen is the stale thing
 *                   that caused the mistake, and leaving it invites the same
 *                   click.
 *
 * There was a second, `onDone`, "instead of router.refresh()". It had one
 * caller, the mail card on a person's page, and that caller passed
 * `() => router.refresh()` -- the default, written out. The card is the shared
 * MailRows now and the option went with it (2026-09-07).
 *
 * Anything needing a second option should keep its own handler instead. The
 * confirm-dialog flows in person-detail and on a profile's admin tools do
 * exactly that: the dialog owns its own busy state and shows its own refusal,
 * so a hook over the top would do both of those twice.
 */
export function useAdminAct(options?: { refreshOnError?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(
    key: string,
    /* Whatever the action hands back; all this cares about is whether there is
       an `error` string in it.

       It used to say `{ error?: string } | void`, which is a WEAK type -- one
       whose properties are all optional -- and TypeScript refuses a source
       that shares no property with it. So an action returning only
       `{ success: true }` on its happy path did not typecheck here, which is
       most of them: `declinePhoto` was the one that tripped it. The error hid
       for a while behind tsc's incremental cache, since this file changes far
       less often than the actions it calls, and a cold run is the only thing
       that re-checks the call sites. */
    fn: () => Promise<Record<string, unknown> | void>,
    done: string
  ): Promise<boolean> {
    setBusy(key);
    try {
      const result = await callAction(fn);
      if (result && typeof result.error === "string" && result.error) {
        toast.error(result.error);
        if (options?.refreshOnError) router.refresh();
        return false;
      }
      toast.success(done);
      router.refresh();
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
