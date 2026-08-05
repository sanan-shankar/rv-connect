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
    select: { id: true, status: true },
  });

  if (!contribution) {
    // A signed event for an order we have no row for: worth knowing about (it
    // would mean the insert in startContribution failed after the order was
    // created), but not worth a retry storm.
    console.error("[razorpay] webhook for unknown order", orderId);
    return NextResponse.json({ received: true });
  }

  if (event.event === "payment.captured") {
    if (contribution.status !== "paid") {
      await prisma.contribution.update({
        where: { id: contribution.id },
        data: {
          status: "paid",
          razorpayPaymentId: payment?.id ?? null,
          method: payment?.method ?? null,
          paidAt: new Date(),
        },
      });
    }
  } else if (contribution.status === "created") {
    // Only from "created". A failed attempt arriving after a successful one on
    // the same order must not undo it.
    await prisma.contribution.update({
      where: { id: contribution.id },
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
