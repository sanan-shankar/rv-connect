/* Razorpay, talked to directly over HTTPS.

   No `razorpay` npm package. The whole surface we need is one authenticated
   POST to create an order and two HMAC comparisons, so the SDK would buy us
   nothing but a dependency sitting in the path of real money. The rest of this
   codebase talks to R2 and Resend the same way.

   SERVER ONLY. Nothing here may be imported from a "use client" file:
   RAZORPAY_KEY_SECRET must never be bundled. (Next would substitute
   `undefined` for a non-NEXT_PUBLIC env var in a client bundle rather than
   inline the value, so a mistake fails loudly instead of leaking -- but the
   rule still stands.)

   Amounts are ALWAYS paise, everywhere in this file and in the Contribution
   table, because that is the only unit Razorpay counts in. Rupees exist only
   in the UI and at the single conversion point in the Support actions. */

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.razorpay.com/v1";

/* Read at call time, not at module scope: a missing key should fail the one
   request that needed it, not crash the whole server on import. */
function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
  }
  return { keyId, keySecret };
}

/* The publishable half of the pair. Handed to the browser by the Support
   action alongside the order, rather than baked in as NEXT_PUBLIC_* at build
   time: one env var instead of two that can silently disagree, and switching
   test keys for live keys becomes a dashboard change plus a redeploy rather
   than a rebuild with a different value compiled in. */
export function razorpayKeyId() {
  return credentials().keyId;
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/* Whether the configured keys move real money. Razorpay encodes the mode in
   the key id itself ("rzp_live_..." vs "rzp_test_..."), and nothing in an
   order or payment id does, so this prefix is the only signal available.
   Defaults to false on anything unrecognised: a test row wrongly counted as
   real inflates a public figure, which is the worse of the two mistakes.

   Reads the env directly rather than through `credentials()`, which THROWS on
   a missing key. This is asked in the middle of building a Prisma `where` on
   /pick-bird and /support, so with no keys configured the throw escaped the
   surrounding `.catch()` (it happens while the argument is being built, before
   any promise exists) and took the whole page down with a 500 (audit M60). An
   environment with no keys has no live money in it by definition, so `false`
   is not a fallback here, it is the answer. */
export function razorpayLivemode() {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_");
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

/** Creates an order. `amountPaise` is trusted here; callers validate it first. */
export async function createOrder(opts: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: "INR",
      receipt: opts.receipt,
      notes: opts.notes,
    }),
    // Razorpay is a hard dependency of this one action, not of the page. Cap
    // the wait so a slow gateway shows an error instead of hanging the button.
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    // Logged, never returned to the browser: the body can carry account
    // details, and a 401 here means OUR keys are wrong, not the payer's fault.
    console.error("[razorpay] order creation failed", res.status, body);
    throw new Error(`Razorpay order creation failed (${res.status})`);
  }

  const order = (await res.json()) as RazorpayOrder;
  return { id: order.id, amount: order.amount, currency: order.currency };
}

/* Constant-time hex compare. A plain `===` on a signature leaks its own
   answer through timing; the length guard is separate because
   timingSafeEqual throws on a length mismatch rather than returning false. */
function hmacMatches(expectedHex: string, givenHex: string) {
  if (typeof givenHex !== "string" || givenHex.length !== expectedHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(givenHex, "hex"));
  } catch {
    return false;
  }
}

/**
 * The browser's success callback: HMAC-SHA256 of "<order_id>|<payment_id>"
 * keyed with the API secret. Unforgeable without the secret, so a pass here is
 * real proof the payment happened -- but see the webhook below for the case
 * where this callback never runs because the payer closed the tab.
 */
export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  return hmacMatches(expected, opts.signature);
}

/**
 * Why a webhook can fail to authenticate, not just that it did.
 *
 * The three reasons need three different answers, and collapsing them into
 * `false` meant the route could only give one (audit M59):
 *   - "unconfigured" is OUR fault and is recoverable -- the payment is real
 *     and will be recorded as soon as the secret is set, so the sender should
 *     be asked to come back.
 *   - "unsigned" and "mismatch" are a body we will never trust. Whoever sent
 *     it should be told we heard them and nothing more.
 */
export type WebhookSignatureVerdict = "ok" | "unconfigured" | "unsigned" | "mismatch";

/**
 * The webhook: HMAC-SHA256 of the RAW request body keyed with the separate
 * webhook secret (not the API secret) from the Razorpay dashboard. The body
 * must be the exact bytes received -- re-serialising parsed JSON reorders keys
 * and changes whitespace, and the signature will never match again.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): WebhookSignatureVerdict {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return "unconfigured";
  if (!signature) return "unsigned";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return hmacMatches(expected, signature) ? "ok" : "mismatch";
}
