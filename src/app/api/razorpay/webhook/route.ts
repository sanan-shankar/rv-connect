/* Razorpay's server-to-server confirmation.

   WHY this exists when the browser callback already verifies a signature: the
   callback only runs if the payer's tab survives long enough to run it. Close
   the tab on the bank's 3-D Secure page, lose signal after the UPI app
   confirms, and the money has moved with nothing on our side recording it.
   This route is the only path that does not depend on the payer's browser.

   Everything here is idempotent. The callback and this route race to confirm
   the same order and either may win; "paid" is terminal.

   NOTE: /api/razorpay is on the public list in src/proxy.ts. It has to be --
   Razorpay carries no session cookie, and without that entry every webhook
   would be answered with a redirect to /login. The signature check below is
   what stands in for auth, and nothing in this file trusts an unsigned body. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { verifyWebhookSignature, type WebhookSignatureVerdict } from "@/lib/razorpay";

/**
 * How long one unauthenticated POST speaks for. An hour, because the only
 * question this line has to answer is "has this been happening", and a rotated
 * secret produces a rejection on every real payment, so one an hour is already
 * a continuous signal. Anything finer would let a flood of forged posts fill
 * the audit table, which is the other half of the same attack.
 */
const REJECTION_NOTE_GAP_MS = 60 * 60 * 1000;

/**
 * Leave a mark where the owner already looks (/admin/audit) that a webhook
 * could not be authenticated.
 *
 * Deduped by time rather than rate-limited by token bucket: the limiter needs
 * Redis and fails open without it, and failing open is the one behaviour this
 * must not have. Best-effort throughout -- a failure to write the note must
 * never turn into a non-2xx, which is the very thing this whole branch exists
 * to avoid.
 */
async function noteRejection(verdict: WebhookSignatureVerdict): Promise<void> {
  try {
    const recent = await prisma.auditLog.findFirst({
      where: {
        action: "razorpay.webhook_rejected",
        createdAt: { gt: new Date(Date.now() - REJECTION_NOTE_GAP_MS) },
      },
      select: { id: true },
    });
    if (recent) return;
    await writeAudit({
      actorId: null,
      action: "razorpay.webhook_rejected",
      detail:
        verdict === "unsigned"
          ? "A POST arrived with no x-razorpay-signature header. Either something other than Razorpay is posting here, or the webhook is misconfigured at their end."
          : "A POST arrived with a signature that did not match. If real payments have stopped being recorded, RAZORPAY_WEBHOOK_SECRET in Vercel no longer matches the one in the Razorpay dashboard.",
    });
  } catch (err) {
    console.error("[razorpay] could not record the webhook rejection", err);
  }
}

type WebhookPayment = {
  id?: string;
  order_id?: string;
  method?: string;
  error_description?: string;
  error_reason?: string;
};

export async function POST(request: Request) {
  // request.text(), never request.json(): the signature is over the exact
  // bytes Razorpay sent. Re-serialising parsed JSON reorders keys and drops
  // whitespace, and no signature would ever match again.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  const verdict = verifyWebhookSignature(raw, signature);

  if (verdict === "unconfigured") {
    /* Our fault, and recoverable: the payment is real, and the moment
       RAZORPAY_WEBHOOK_SECRET is set in Vercel, a retry of this same event
       records it. 500 is the one status that asks Razorpay to come back --
       which is exactly what we want here, and exactly what we do NOT want for
       a body we will never trust (below). */
    console.error(
      "[razorpay] RAZORPAY_WEBHOOK_SECRET is not set; a real payment confirmation " +
        "cannot be verified and is being deferred. Set it in Vercel and redeploy."
    );
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (verdict !== "ok") {
    /* This used to answer 400, reasoning that "a body we cannot authenticate is
       never going to authenticate on the third attempt either". True, and beside
       the point: this endpoint is public and unauthenticated by necessity (it
       carries no session cookie -- see the note at the top of this file), so
       anybody at all can POST to it, and Razorpay counts an endpoint's failures
       and DISABLES a webhook that keeps producing them. A few thousand forged
       posts and the real payment confirmations stop arriving, silently, for
       everybody (audit M59). A 2xx costs nothing -- we have already decided to
       do nothing with this body -- and cannot be used to switch the endpoint off.

       The thing 400 was genuinely buying was a failure signal in Razorpay's
       dashboard, which is the only way a WRONG (rather than missing) secret
       would ever surface. That is what the audit line below replaces, and it
       arrives somewhere the owner already looks. */
    console.error(`[razorpay] webhook signature rejected (${verdict})`);
    await noteRejection(verdict);
    return NextResponse.json({ received: true });
  }

  let event: { event?: string; payload?: { payment?: { entity?: WebhookPayment } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;

  // Razorpay lets you subscribe to far more events than we act on. Anything
  // else is acknowledged so it is not retried forever.
  const acted =
    event.event === "payment.captured" ||
    event.event === "payment.failed" ||
    /* Money that came back out. Until now nothing in the app ever heard about
       a refund or a chargeback, so a returned gift stayed "paid" for ever: it
       kept counting in the recovery total on /support, in "Given, all time",
       and in the member's own contribution history (audit M58). Both are
       recorded by moving the row out of "paid", which every sum in the app
       already filters on, so the arithmetic corrects itself everywhere at once
       rather than needing a new exclusion in each place.

       `refund.processed`, not `refund.created`: created is the instruction,
       processed is the money actually having left. A refund that fails to
       process should not un-count a gift that is still ours. */
    event.event === "refund.processed" ||
    event.event === "payment.dispute.created";
  if (!orderId || !acted) {
    return NextResponse.json({ received: true });
  }

  const contribution = await prisma.contribution.findUnique({
    where: { razorpayOrderId: orderId },
    select: { id: true, status: true, userId: true, amount: true },
  });

  if (!contribution) {
    // A signed event for an order we have no row for: worth knowing about (it
    // would mean the insert in startContribution failed after the order was
    // created), but not worth a retry storm.
    console.error("[razorpay] webhook for unknown order", orderId);
    return NextResponse.json({ received: true });
  }

  if (event.event === "payment.captured") {
    // Conditional, not check-then-write: the browser callback may be marking
    // the same row paid this same second, and whichever of the two makes the
    // transition is the one that owes the supporter a word.
    const moved = await prisma.contribution.updateMany({
      where: { id: contribution.id, status: { not: "paid" } },
      data: {
        status: "paid",
        razorpayPaymentId: payment?.id ?? null,
        method: payment?.method ?? null,
        // Cleared, not left. A first attempt that failed and a second that
        // went through are the same row, and the old reason printed a red
        // error line under a successful gift (audit Low 116).
        failureReason: null,
        paidAt: new Date(),
      },
    });

    /* This route exists because "the callback only runs if the payer's tab
       survives long enough to run it" -- Android killing the tab during the UPI
       app switch, someone closing the 3-D Secure page. In exactly that case the
       money was recorded, the recovery bar moved, and the supporter got NOTHING:
       no notification, no email, and /support deliberately carries no standing
       link to /pick-bird, so the perk they were promised was reachable only by
       guessing the URL (bug audit B-081).

       A notification, not a standing door: it is the one-time consequence of a
       payment, which is exactly the shape the owner's no-standing-link decision
       leaves room for. Only when THIS request made the transition, so the
       ordinary case -- browser survives, redirects straight to the picker --
       does not also collect one. Best-effort: a failure here must not make
       Razorpay retry a payment we have already recorded. */
    if (moved.count === 1 && contribution.userId) {
      try {
        await prisma.notification.create({
          data: {
            userId: contribution.userId,
            type: "contribution_received",
            message: "Your contribution came through. Pick the bird you want to wear.",
            link: "/pick-bird",
          },
        });
      } catch (err) {
        console.error("[razorpay] could not notify the contributor", err);
      }
    }
  } else if (event.event === "payment.failed") {
    // Only from "created", and CONDITIONALLY so, not check-then-write: a
    // failed attempt arriving in the same instant as the successful one on the
    // same order must not undo it, and reading the status a moment earlier is
    // not the same as holding it (audit M27).
    await prisma.contribution.updateMany({
      where: { id: contribution.id, status: "created" },
      data: {
        status: "failed",
        razorpayPaymentId: payment?.id ?? null,
        method: payment?.method ?? null,
        /* Cleared on a later success (see the paid branch): a red reason
           surviving under a payment that eventually went through was its own
           small lie (audit Low 116). */
        failureReason: payment?.error_description ?? payment?.error_reason ?? null,
      },
    });
  } else {
    /* Refunded or disputed. Only from "paid", conditionally, for the same
       reason the failure branch is: a refund for an order we never recorded as
       paid is not something to invent a state for, and the webhook can arrive
       in any order. Nothing is deleted -- the row stays as the record that
       money moved and came back, which is what a ten-year payment retention
       window is for. */
    const to = event.event === "refund.processed" ? "refunded" : "disputed";
    const moved = await prisma.contribution.updateMany({
      where: { id: contribution.id, status: "paid" },
      data: { status: to },
    });
    if (moved.count === 1) {
      // Loud, because this is the one thing on the money surfaces that
      // changes a number DOWNWARDS after the fact, and the owner should hear
      // it from somewhere other than a total that quietly shrank.
      await writeAudit({
        actorId: null,
        action: "razorpay.contribution_reversed",
        targetType: "contribution",
        targetId: contribution.id,
        detail: `${to} by Razorpay (${event.event}); ${contribution.amount} paise no longer counted as given`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
