import { auth } from "./auth";
import { IS_DEMO } from "./demo";
import { EMAIL_UNVERIFIED } from "./email-gate-message";
import { MEMBER_UNVERIFIED } from "./member-gate-message";
import type { GateResult } from "./email-verification";

/* ------------------------------------------------------------------ *
 *  The verified-member gate: the second of the two gates.
 *
 *  Owner call, 2026-08-19 (the trust model in SECURITY-FIX-PLAN.md):
 *  confirming an email address proves a mailbox, not a person. Anyone
 *  can make an account with any address, so the address alone must not
 *  put content in front of the community or take a member's phone
 *  number out of it. What unlocks those is the profile being VERIFIED:
 *  matched against the school's registration sheets automatically, or
 *  confirmed by the owner, who knows the community personally.
 *
 *  The tiers, and what each may do:
 *
 *    Stage 0  account, email unconfirmed   read the feed, letters, map
 *    Stage 1  email confirmed              + directory names, profiles
 *    Stage 2  profile verified             + every write, contact details
 *
 *  Stage 1 is requireVerifiedEmail (email-verification.ts). This file
 *  is Stage 2. Same contract: enforced SERVER-SIDE as the first lines
 *  of every gated action, never in a component; the client dialogs
 *  exist to make the rule visible, not to make it true.
 * ------------------------------------------------------------------ */

export { MEMBER_UNVERIFIED } from "./member-gate-message";
export type { GateResult } from "./email-verification";

/**
 * The Stage 2 check. Returns the viewer when they may write, or the exact
 * sentinel the client dialogs match on: EMAIL_UNVERIFIED when the first gate
 * is the one still closed, MEMBER_UNVERIFIED when it is the second.
 *
 * Only "verified" passes. "pending" is still just a claim, and "flagged"
 * means an admin is actively looking -- neither may write. Admins pass like
 * anyone else: the owner's own account is verified, so exempting the role
 * would only hide a broken flow from the person most able to fix it.
 */
export async function requireVerifiedMember(): Promise<GateResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };

  // Same exemption, same reason as requireVerifiedEmail: the demo's one
  // invented visitor can neither confirm a mailbox nor be verified by anyone,
  // and its own default-deny Prisma allowlist is what keeps it safe.
  if (IS_DEMO) return { ok: true, user };

  if (!session.user.emailConfirmed) return { ok: false, error: EMAIL_UNVERIFIED };
  if (session.user.verifyState !== "verified") return { ok: false, error: MEMBER_UNVERIFIED };

  return { ok: true, user };
}

/** True when the signed-in viewer may see other members' contact details.
 *  Contact details are a Stage 2 capability (they are the harvest an abuser
 *  signs up for), so this rides the member gate. Split out because the
 *  profile page needs the boolean to decide what to SERIALIZE, not just what
 *  to render: a phone number withheld by CSS is a phone number sitting in
 *  the page source. */
export async function viewerMaySeeContacts(): Promise<boolean> {
  const gate = await requireVerifiedMember();
  return gate.ok;
}
