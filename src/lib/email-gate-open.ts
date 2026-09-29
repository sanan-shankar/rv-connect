import { prisma } from "./prisma";
import { confirmationStillWaiting } from "./mail-policy";
import { reportSwallowed } from "./report-error";

/**
 * Whether the confirmed-email gate stands open for this member: their address
 * is confirmed, or their confirmation is still waiting in our queue with none
 * ever sent to the address on the account (`confirmationStillWaiting` in
 * mail-policy.ts, which carries the owner's rule).
 *
 * The session callback in auth.ts is the caller that matters: it is what every
 * gate reads. The resend and change-address actions ask it too, to word their
 * answer. The roster auto-match deliberately does NOT (see roster.ts): it
 * vouches for an identity, and a waiting address has proven nothing.
 *
 * Costs nothing for a confirmed member. For an unconfirmed one it is one read
 * on the (userId, kind, status) index, once per request (auth() is cache()d).
 *
 * FAIL-CLOSED on a database error. This runs inside the session callback, and
 * a throw there is an error page on every route for the member it concerns.
 * Answering "shut" shows them the ordinary confirm-your-email state for the
 * length of the hiccup instead; answering "open" would let a transient error
 * open the gate for an account whose mail has already gone out. Reported, so
 * a gate stuck shut for everyone is visible.
 *
 * One consequence, weighed and kept (write-path review, 2026-09-29): with no
 * RESEND_API_KEY in production nothing ever sends, so every new member stays
 * "waiting" and keeps this gate open until the key is back. That is the
 * owner's rule applied literally (nothing sent, nothing shut), posting and
 * contacts still need a verified profile, and `queueIsSendable` logs an
 * error on every drain pass while the key is missing.
 */
export async function emailGateOpenFor(user: {
  id: string;
  email: string;
  emailVerified: Date | null;
}): Promise<boolean> {
  if (user.emailVerified) return true;
  try {
    const rows = await prisma.outboundEmail.findMany({
      where: { userId: user.id, kind: "verify" },
      // A member has a handful of these at most: resends fold into the one
      // that is waiting and are metered per hour. The bound is only there so
      // no pathological account can make this read expensive.
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { to: true, status: true, sentAt: true },
    });
    return confirmationStillWaiting(rows, user.email);
  } catch (err) {
    reportSwallowed("email", err, { step: "email-gate-open", userId: user.id });
    return false;
  }
}
