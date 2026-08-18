"use server";

/* The two halves of a contribution on /support.

   Server Actions rather than /api/create-order + /api/verify-payment (which is
   what Razorpay's own boilerplate suggests) for three reasons that all matter
   here: this codebase does mutations as Server Actions everywhere else; Next
   applies its Server Action origin check, so neither is a bare CSRF-able POST;
   and neither exists as a public URL a stranger can hammer to mint orders in
   the merchant account. The webhook is the one genuine exception and lives at
   src/app/api/razorpay/webhook/route.ts, because Razorpay has to POST to it.

   The amount is never trusted from the browser. It arrives as rupees, is
   validated and clamped here, and is converted to paise exactly once. */

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { createOrder, razorpayKeyId, razorpayLivemode, verifyPaymentSignature } from "@/lib/razorpay";
import { PERK_MIN_PAISE, WEARABLE_SLUGS } from "@/components/support/plate-data";

/* Floor and ceiling on a single contribution, in rupees. Razorpay's own floor
   is ₹1; ₹500 is ours (owner, 2026-08-18, raised from ₹100): below it the
   processor's cut is a real slice of the gift, a stray tiny order is more
   likely a probe than a thank-you, and ₹500 is also the bird-picker
   threshold, so one number answers both "what is the minimum" and "what
   unlocks the perk". The ceiling is not a policy about generosity -- it is
   the blast radius of a typo, in either direction, on a page whose largest
   chip is ₹5,000. */
const MIN_RUPEES = 500;
const MAX_RUPEES = 500_000;

export type StartResult =
  | { error: string }
  | {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      name: string;
      email: string;
      contact: string;
    };

/**
 * Opens a contribution: validates the amount, creates the Razorpay order, and
 * records it as "created" before the payer ever sees the modal. Signed-in only
 * (/support already sits behind the (main) layout), which is also what keeps
 * this from being an open order-minting endpoint.
 */
export async function startContribution(amountRupees: number): Promise<StartResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "This is a demo, so no real payment is taken. The rest of the page works as it would." };

  // Number.isInteger rejects NaN, Infinity and ₹500.50 in one go. Rupees are
  // whole here by choice: nothing on the page offers paise, so a fractional
  // amount can only be a bad client.
  if (!Number.isInteger(amountRupees) || amountRupees < MIN_RUPEES || amountRupees > MAX_RUPEES) {
    return { error: `Please enter an amount between ₹${MIN_RUPEES} and ₹${MAX_RUPEES.toLocaleString("en-IN")}.` };
  }

  const amountPaise = amountRupees * 100;

  // The row id is minted here, before either write, so it can be the Razorpay
  // receipt AND the primary key. The order is created FIRST and the row only
  // afterwards, with the real order id already in hand: a row inserted with a
  // placeholder order id and patched later would collide with any concurrent
  // checkout on the unique index. The cost of this ordering is that a failed
  // insert strands an unused order at Razorpay, which is inert -- an order
  // nobody pays is not a charge.
  const receipt = createId();

  // Razorpay makes contact a required field and asks for it in a modal of its
  // own before payment can start. Anyone who has filled in a phone number here
  // should not have to type it again at the one moment we least want friction,
  // so it is read fresh rather than taken from the session (which does not
  // carry it). Empty is fine: Razorpay simply asks.
  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });

  try {
    const order = await createOrder({
      amountPaise,
      // Razorpay caps receipt at 40 characters; a cuid2 is 24.
      receipt,
      // Shown against the payment in the Razorpay dashboard, so a contribution
      // can be matched to a person there without a database lookup.
      notes: {
        userId: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      },
    });

    await prisma.contribution.create({
      data: {
        id: receipt,
        userId: session.user.id,
        amount: order.amount,
        currency: order.currency,
        status: "created",
        razorpayOrderId: order.id,
        livemode: razorpayLivemode(),
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId(),
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      contact: profile?.phone ?? "",
    };
  } catch (err) {
    console.error("[support] startContribution failed", err);
    return { error: "We could not reach the payment gateway. Please try again in a moment." };
  }
}

/**
 * Closes it, from the browser's success callback. The signature is real proof
 * (it cannot be produced without our API secret), so a pass here marks the row
 * paid; a failure marks nothing and is logged, because the only way to reach
 * it is a forgery attempt or a genuine Razorpay change.
 *
 * Idempotent, and deliberately so: the webhook may already have written this
 * exact row a second earlier.
 */
export async function confirmContribution(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "This is a demo, so no real payment is taken." };

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = input;
  if (!orderId || !paymentId || !signature) return { error: "Missing payment details" };

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    console.error("[support] signature mismatch", { orderId, paymentId, userId: session.user.id });
    return { error: "We could not verify that payment. Nothing has been recorded, so please contact us before trying again." };
  }

  const contribution = await prisma.contribution.findUnique({
    where: { razorpayOrderId: orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!contribution) return { error: "We could not find that payment." };

  // A valid signature proves the payment is real, not that this session opened
  // it. Refusing to move someone else's row keeps one person's checkout from
  // being confirmed under another person's name.
  if (contribution.userId && contribution.userId !== session.user.id) {
    console.error("[support] confirm by non-owner", { orderId, userId: session.user.id });
    return { error: "That payment belongs to a different account." };
  }

  if (contribution.status !== "paid") {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: "paid", razorpayPaymentId: paymentId, paidAt: new Date() },
    });
  }

  return { ok: true };
}

/**
 * The perk: a supporter picks the bird they wear everywhere.
 *
 * Four gates, in order of who they protect. Auth, because birdOverride is a
 * column on the caller's own row and nobody else's. The demo guard, because
 * the demo's write path is default-deny and this is a write. The slug
 * allowlist, because User.birdOverride is trusted downstream: only a slug
 * from WEARABLE_SLUGS may be stored, which structurally excludes the reserved
 * Hoopoe and Roller (resolveBirdOverride would ignore those anyway, but a row
 * should never hold a value the renderer has to refuse). And the payment
 * gate: the member's PAID contributions, in the current key mode, must reach
 * the perk threshold. Mode-filtered the same way the public recovered figure
 * is, so a developer's test payment unlocks the picker against test keys and
 * never against live ones.
 *
 * Re-picking is allowed indefinitely. The perk is standing, and the write is
 * idempotent, so there is nothing to meter and no state to corrupt by
 * clicking twice.
 */
export async function chooseBird(slug: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "This is a demo, so bird picking is switched off." };

  if (typeof slug !== "string" || !WEARABLE_SLUGS.has(slug)) {
    return { error: "That bird is not available." };
  }

  const paid = await prisma.contribution.aggregate({
    _sum: { amount: true },
    where: { userId: session.user.id, status: "paid", livemode: razorpayLivemode() },
  });
  if ((paid._sum.amount ?? 0) < PERK_MIN_PAISE) {
    return { error: "Picking a bird opens after a contribution of ₹500 or more." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { birdOverride: slug },
  });

  revalidatePath("/support");
  return { ok: true };
}
