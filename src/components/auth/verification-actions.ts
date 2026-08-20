"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IS_DEMO } from "@/lib/demo";
import { EMAIL_UNVERIFIED } from "@/lib/email-gate-message";
import { notifyAdmins } from "@/lib/admin-threads-server";
import { tryRosterAutoVerifyQuietly } from "@/lib/roster";

/* ------------------------------------------------------------------ *
 *  "Ask to be verified": the member's side of the second gate.
 *
 *  Nothing used to write verifyState "pending" -- verification could only
 *  begin if the owner happened to notice a new account. This is the
 *  doorbell. It writes "pending", tells the admins once, and the owner
 *  confirms or not from the admin panel (owner call: no digests, no
 *  per-request email; he mans the panel himself).
 * ------------------------------------------------------------------ */

export type RequestVerificationResult =
  | { ok: true; state: "verified" | "pending" }
  | { ok: false; error: string };

export async function requestVerification(): Promise<RequestVerificationResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  // The demo's invented visitor never sees this dialog (the gates pass it
  // through), and its Prisma allowlist would refuse the write anyway. Answer
  // "pending" so a poked endpoint reveals nothing and breaks nothing.
  if (IS_DEMO) return { ok: true, state: "pending" };

  // First gate first: an unconfirmed address has no business in the
  // verification queue, because the owner would have no way to reach the
  // person behind it to check anything.
  if (!session.user.emailConfirmed) return { ok: false, error: EMAIL_UNVERIFIED };

  if (session.user.verifyState === "verified") return { ok: true, state: "verified" };

  // "flagged" means an admin is already looking at this account; asking again
  // must not quietly wash that state away. They are in the queue either way.
  if (session.user.verifyState === "flagged") return { ok: true, state: "pending" };

  // The office roster answers instantly what the owner would otherwise be
  // asked to check by hand. Best-effort: if it errors, the request still
  // reaches the admin the ordinary way.
  if (await tryRosterAutoVerifyQuietly(session.user.id)) {
    return { ok: true, state: "verified" };
  }

  const already = session.user.verifyState === "pending";
  if (!already) {
    await prisma.user.updateMany({
      where: { id: session.user.id, verifyState: "unverified" },
      data: { verifyState: "pending" },
    });
    // Once per request, not per click: the re-ask above short-circuits.
    await notifyAdmins(
      `${session.user.name} asked to be verified`,
      `/admin/people/${session.user.id}`
    );
  }

  return { ok: true, state: "pending" };
}
