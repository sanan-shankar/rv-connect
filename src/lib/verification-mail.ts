import { IS_DEMO } from "./demo";
import { enqueueMail } from "./email-queue";

/**
 * Ask for a confirmation link to be sent to this person.
 *
 * QUEUES rather than sends. Resend's free plan allows 100 messages a day and
 * launch is expected to exceed that in signups alone, so the send happens in
 * `drainMailQueue` when the day's budget allows. Nothing here can tell you
 * whether the message went out, and no caller should pretend otherwise: use
 * `verificationMailState` to find out, which is what the banner does before it
 * decides whether to say "check your inbox" or "it is on its way".
 *
 * Lives in `lib` rather than beside the other email actions ON PURPOSE. Every
 * export of a `"use server"` file becomes an endpoint the browser can POST to,
 * and this function takes the recipient as an argument: exported from there it
 * would be an unauthenticated "send mail from hello@rishivalley.space to any
 * address I name" relay, pointed at the owner's sending reputation. The
 * callable wrapper is `resendVerification` in components/auth/email-actions.ts,
 * which takes no arguments and reads the address off the session instead.
 */
export async function sendVerificationEmail(user: {
  id: string;
  name: string;
  email: string;
}): Promise<{ ok: boolean; reason?: "demo" }> {
  if (IS_DEMO) return { ok: false, reason: "demo" };

  await enqueueMail({
    kind: "verify",
    to: user.email,
    userId: user.id,
    payload: { name: user.name },
  });

  return { ok: true };
}
