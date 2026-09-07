/* Resend's delivery reports.
 *
 * WHY: OutboundEmail.status stops at "sent", which only ever meant Resend
 * accepted the message from us. Whether it reached a human was invisible.
 * That gap is widest exactly when it matters most -- at launch, when a few
 * hundred invitations go out at once and "400 sent" with half of them
 * bouncing off stale addresses looks identical to a clean run.
 *
 * NOTE: "/api/resend" must be on the public list in src/proxy.ts, for the same
 * reason /api/razorpay is: this is server-to-server, carries no session
 * cookie, and would otherwise be answered with a redirect to /login. The
 * signature check below is what stands in for auth, and nothing in this file
 * trusts an unsigned body. */

import { NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** How long to wait before re-matching a webhook event that found no row.
 *  Two tries, generously longer than the database write it is racing. */
const RETRY_DELAYS_MS = [2_000, 6_000];

/* Resend signs with Svix. Verified by hand rather than by adding the `svix`
 * package: the scheme is one HMAC and a timestamp check, and this is the only
 * place in the codebase that needs it. */
function verify(raw: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend] RESEND_WEBHOOK_SECRET is not set; rejecting.");
    return false;
  }

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  /* Reject anything older than five minutes so a captured request cannot be
   * replayed back at us indefinitely. */
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    console.error("[resend] webhook timestamp outside the replay window");
    return false;
  }

  /* The secret is delivered as "whsec_<base64>"; the bytes after the prefix
   * are the actual key. */
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${raw}`)
    .digest("base64");

  /* The header carries a space-separated list of "v1,<sig>" so a secret can be
   * rotated without dropping events mid-flight. Any one matching is enough. */
  return signature.split(" ").some((part) => {
    const candidate = part.split(",")[1];
    if (!candidate) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

type ResendEvent = {
  type?: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; subType?: string };
  };
};

export async function POST(request: Request) {
  /* request.text(), never request.json(): the signature is over the exact
   * bytes Resend sent, and re-serialising parsed JSON reorders keys. */
  const raw = await request.text();

  if (!verify(raw, request.headers)) {
    /* 400, not 401: Svix retries on 5xx, and a body we cannot authenticate is
     * never going to authenticate on the third attempt either. */
    console.error("[resend] webhook signature rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  const providerId = event.data?.email_id;
  if (!providerId || !event.type) {
    /* 200: the body is authentic, it just carries nothing we act on. A non-2xx
     * here would make Svix retry an event that will never be useful. */
    return NextResponse.json({ ok: true, ignored: "no email_id" });
  }

  const now = new Date();

  /* Only the four states worth recording. Opens and clicks are deliberately
   * not tracked: they need a tracking pixel in members' mail, and this is a
   * community's inbox, not a marketing funnel. */
  const patch: Record<string, unknown> | null =
    event.type === "email.delivered"
      ? { deliveredAt: now }
      : event.type === "email.bounced"
        ? {
            bouncedAt: now,
            /* "failed" is deliberate rather than a new status value: the admin
             * worklist already queries OutboundEmail where status = "failed"
             * (admin-worklist-query.ts), so a bounce walks straight onto the
             * page the owner already checks. A sixth status would have needed
             * a new query, a new tone and a new label to be seen at all, which
             * is how a column ends up holding data nobody ever looks at. */
            status: "failed",
            /* That same row renders lastError as its explanation. Without this
             * a bounce would appear as a failure with no reason given -- and it
             * is now the ONLY place the hard/soft distinction is kept.
             *
             * A `bounceKind` column held Resend's raw subtype beside this from
             * 2026-08-19, so that "the two deserve different handling" could be
             * decided later. It never was, in a year of them, and nothing ever
             * read the column: 0 of 55 rows carried a value (refactor audit 2 /
             * D7). The subtype is in this sentence, on the row the admin
             * worklist already draws, which is where it was always being read
             * from. If the distinction is ever acted on rather than merely
             * displayed, it wants a column again -- and a reader written in the
             * same commit. */
            lastError: `Bounced (${
              event.data?.bounce?.subType ?? event.data?.bounce?.type ?? "unknown"
            }) -- the address did not accept it`,
          }
        : event.type === "email.complained"
          ? {
              complainedAt: now,
              status: "failed",
              lastError: "Marked as spam by the recipient",
            }
          : event.type === "email.delivery_delayed"
            ? { lastError: "delivery delayed by the receiving server" }
            : null;

  if (!patch) return NextResponse.json({ ok: true, ignored: event.type });

  /* updateMany, not update: the row may legitimately be absent (mail sent
   * before this column existed, or from another environment against the same
   * shared database), and a missing row must not 500 and trigger retries. */
  const { count } = await prisma.outboundEmail.updateMany({
    where: { providerId },
    data: patch,
  });

  if (count === 0) {
    /* Almost certainly the race, not a stranger's message (audit Low 90).
     *
     * We write `providerId` onto the row immediately after Resend accepts the
     * send -- but Resend can deliver a bounce webhook before that write lands,
     * and this match is on `providerId` alone. The event was then dropped with
     * a warning and the row stayed "sent" for ever, which is the one status
     * that means "nothing more will happen to this".
     *
     * Retried behind the response so the webhook still gets its immediate 200
     * (a slow or failing webhook endpoint is its own hazard). Two tries a few
     * seconds apart is far longer than a database write takes; anything still
     * unmatched after that really is a message this deployment did not send. */
    after(async () => {
      for (const delay of RETRY_DELAYS_MS) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        const retry = await prisma.outboundEmail.updateMany({
          where: { providerId },
          data: patch,
        });
        if (retry.count > 0) {
          console.info(`[resend] ${event.type} matched on retry for email_id ${providerId}`);
          return;
        }
      }
      console.warn(`[resend] ${event.type} for unknown email_id ${providerId}`);
    });
  } else if (event.type === "email.bounced" || event.type === "email.complained") {
    /* Loud in the log: a bounce means an alumnus never got their invitation,
     * and a complaint is the single most damaging signal for a young sending
     * domain. Neither should be discoverable only by reading the database. */
    console.error(`[resend] ${event.type} recorded for email_id ${providerId}`);
  }

  return NextResponse.json({ ok: true });
}
