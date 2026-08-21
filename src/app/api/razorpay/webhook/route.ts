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
import { verifyWebhookSignature } from "@/lib/razorpay";

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

  if (!verifyWebhookSignature(raw, signature)) {
    // 400, not 401: Razorpay retries on 5xx, and a body we cannot authenticate
    // is never going to authenticate on the third attempt either.
    console.error("[razorpay] webhook signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
  if (!orderId || (event.event !== "payment.captured" && event.event !== "payment.failed")) {
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
  } else {
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
        failureReason: payment?.error_description ?? payment?.error_reason ?? null,
      },
    });
  }

  return NextResponse.json({ received: true });
}
