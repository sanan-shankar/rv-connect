import { auth } from "./auth";
import { IS_DEMO } from "./demo";
import { EMAIL_UNVERIFIED } from "./email-gate-message";

/* ------------------------------------------------------------------ *
 *  The confirmed-email gate.
 *
 *  Owner call, 2026-08-11: an account can read the whole site the
 *  moment it is created, but anything that PUTS something into the
 *  community, or takes a real person's contact details out of it, waits
 *  until the address has been confirmed. The reasoning is the split
 *  between the two risks. An unconfirmed account browsing costs nothing.
 *  An unconfirmed account posting, uploading images, or harvesting phone
 *  numbers out of the directory is the whole threat model of a small
 *  private community, and the address is the only thing tying an account
 *  to a person we can actually reach.
 *
 *  Enforced SERVER-SIDE, here, and never in a component. The client
 *  pieces (the composer's marker, the dialog) exist so the rule is
 *  visible before you hit it; they are not what makes it true. Every
 *  gated action calls `requireVerifiedEmail()` as its second line, right
 *  after the authentication check.
 * ------------------------------------------------------------------ */

// The sentinel every gated action returns lives in its own dependency-free
// file (./email-gate-message) so the client dialog can match on it without
// importing `auth()` -- and with it NextAuth and Prisma -- into the browser
// bundle. Every caller imports it from there directly.

interface VerifiedViewer {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type GateResult =
  | { ok: true; user: VerifiedViewer }
  | { ok: false; error: string };

/**
 * The one check. Returns the viewer when they may proceed, or the error to
 * hand straight back to the caller's client.
 *
 * Admins are NOT exempt: the owner's own account confirms like everybody
 * else, so the flow gets exercised by the person most able to fix it.
 */
export async function requireVerifiedEmail(): Promise<GateResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };

  // The demo has one invented visitor, no mailbox, and no way to confirm
  // anything (src/lib/demo.ts closes /api/auth outright and sendMail refuses).
  // Gating it would present a stranger with a permanent nag bar and a dead
  // "resend" button on a deployment whose entire job is to look finished.
  // Its own default-deny Prisma allowlist is what keeps the demo safe, not
  // this.
  if (IS_DEMO) return { ok: true, user };

  if (!session.user.emailConfirmed) return { ok: false, error: EMAIL_UNVERIFIED };

  return { ok: true, user };
}

