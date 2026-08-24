"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction, type AdminActionResult } from "@/lib/admin";
import { RETRY_RESET } from "@/lib/mail-policy";

/**
 * Put a dead message back in the queue.
 *
 * The panel this replaces could tell you a send had failed, as a number, and
 * that was all: `OutboundEmail.lastError` was recorded and rendered nowhere,
 * and there was no way to make another attempt. Since the commonest cause is
 * a mistyped address that has since been corrected on the person's record,
 * "try again" is the obvious next move and there was no button for it.
 *
 * Every counter the drain's selection reads goes back to zero, not just the
 * status: it picks up rows with `attempts < MAX_ATTEMPTS` (4) AND `deferrals <
 * MAX_DEFERRALS` (10) AND nothing pending on `nextAttemptAt`. Leaving any of
 * them would put the row back in a queue that will never look at it again.
 *
 * `deferrals` was the one this missed, and it was the one that mattered most:
 * a row retired by a provider outage is failed with deferrals at the ceiling
 * and its attempts possibly at zero, because a transient failure hands its
 * attempt back. Retry made it `queued` and invisible -- and for a reset, which
 * folds, every later "forgot my password" for that member folded into the
 * zombie and returned without sending, so they could never get a reset email
 * again (audit C-102).
 *
 * The write is `RETRY_RESET`, beside the predicate it has to satisfy.
 */
export async function retryMail(id: string): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  const row = await prisma.outboundEmail.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) return { error: "That message is no longer here." };
  if (row.status === "sent") return { error: "That one already went out." };
  if (row.status === "sending") {
    // A row a drain has CLAIMED and is mid-flight on. Requeueing it here would
    // release the claim while the provider call is still in the air, so the
    // next drain would pick it up and send the same real email twice (audit
    // Low 4). The stale-claim window in the queue reclaims a genuinely stuck
    // row on its own, so waiting costs nothing but a minute.
    return { error: "That one is being sent right now. Give it a minute." };
  }

  /* Conditional on the status it was read with, so the retry cannot land on a
     row that moved between the read and the write. */
  const requeued = await prisma.outboundEmail.updateMany({
    where: { id, status: row.status },
    data: { ...RETRY_RESET },
  });
  if (requeued.count === 0) {
    return { error: "That message moved on while you were looking at it. Try again." };
  }

  revalidatePath("/admin", "layout");
  return { success: true };
}

/**
 * Give up on a message for good.
 *
 * A failed row sits in the "gave up" count forever, and some of them deserve
 * to: an address that was wrong and has since been deleted is never going to
 * be delivered, and leaving it there makes the one number that should mean
 * "look at this" mean nothing.
 */
export async function dismissMail(id: string): Promise<AdminActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;

  const row = await prisma.outboundEmail.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) return { error: "That message is no longer here." };
  if (row.status !== "failed") {
    return { error: "Only a message that gave up can be cleared." };
  }

  await prisma.outboundEmail.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  return { success: true };
}
