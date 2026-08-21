"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction, type AdminActionResult } from "@/lib/admin";

/**
 * Put a dead message back in the queue.
 *
 * The panel this replaces could tell you a send had failed, as a number, and
 * that was all: `OutboundEmail.lastError` was recorded and rendered nowhere,
 * and there was no way to make another attempt. Since the commonest cause is
 * a mistyped address that has since been corrected on the person's record,
 * "try again" is the obvious next move and there was no button for it.
 *
 * `attempts` goes back to zero, not just the status: the drain only picks up
 * rows with `attempts < MAX_ATTEMPTS` (4), and a failed row is failed
 * precisely because it has spent all four. Leaving the count would put the
 * row back in a queue that will never look at it again.
 *
 * `claimedAt` is cleared too, so a row that died mid-send is not treated as
 * still owned by some long-gone drain pass.
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
    data: { status: "queued", attempts: 0, lastError: null, claimedAt: null },
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
