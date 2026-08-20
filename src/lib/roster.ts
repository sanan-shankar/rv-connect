import { prisma } from "./prisma";
import { IS_DEMO } from "./demo";
import {
  normalizeRosterName,
  rosterNameMatches,
  rosterYearMatches,
} from "./roster-rule";

/* ------------------------------------------------------------------ *
 *  Auto-verification against the office roster (trust model, Phase 3).
 *
 *  Called at the moments an account becomes matchable: when the email
 *  gets confirmed (confirmEmailToken, resetPassword), when onboarding
 *  writes the batch year, and when the member explicitly asks to be
 *  verified. Everywhere it is best-effort: a roster hiccup must never
 *  break a confirmation that has already happened, so callers fire it
 *  through tryRosterAutoVerifyQuietly below.
 * ------------------------------------------------------------------ */

/**
 * Verify `userId` with verifyMethod "office_list" if the roster vouches for
 * them. Returns true when the user ends up verified by this call.
 *
 * Preconditions checked here, not trusted from the caller: the email must be
 * confirmed (a match against an unproven mailbox verifies nobody), and only
 * "unverified"/"pending" ever transition -- never "flagged", which an admin
 * is already looking at, and never an existing "verified", whose method is
 * a fact worth preserving.
 *
 * Never fills admission number, houses, or anything else from the sheets
 * (owner call: the roster admits people, it does not write their profile).
 */
export async function tryRosterAutoVerify(userId: string): Promise<boolean> {
  if (IS_DEMO) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      emailVerified: true,
      name: true,
      batchYear: true,
      yearLeft: true,
      verifyState: true,
    },
  });
  if (!user) return false;
  if (!user.emailVerified) return false;
  if (user.verifyState !== "unverified" && user.verifyState !== "pending") return false;

  let matched = Boolean(
    await prisma.rosterEntry.findFirst({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    })
  );

  if (!matched) {
    // Name+batch path: pull only the rows for this member's two candidate
    // years (index-backed), then let the pure rule compare names.
    const years = [user.batchYear, user.yearLeft].filter((y): y is number => y != null);
    if (years.length > 0 && normalizeRosterName(user.name)) {
      const candidates = await prisma.rosterEntry.findMany({
        where: { batchYear: { in: years } },
        select: { normalizedName: true, batchYear: true },
      });
      matched = candidates.some(
        (c) => rosterYearMatches(c.batchYear, user) && rosterNameMatches(user.name, c.normalizedName)
      );
    }
  }

  if (!matched) return false;

  // Conditional update so a concurrent admin decision (verify, flag) between
  // the read above and here is never overwritten.
  const updated = await prisma.user.updateMany({
    where: { id: userId, verifyState: { in: ["unverified", "pending"] } },
    data: {
      verifyState: "verified",
      verifyMethod: "office_list",
      verifiedAt: new Date(),
    },
  });
  return updated.count > 0;
}

/**
 * The fire-and-log wrapper for call sites where verification is a bonus on
 * top of something that must not fail (confirming an email, resetting a
 * password). Errors are logged, not thrown: a member locked out of
 * confirmation because a MATCHING step broke would be the guard hurting the
 * person it exists for -- but silently is how a dead roster goes unnoticed,
 * so it says so in the log.
 */
export async function tryRosterAutoVerifyQuietly(userId: string): Promise<boolean> {
  try {
    return await tryRosterAutoVerify(userId);
  } catch (err) {
    console.error("[roster] auto-verify failed; the member stays unverified", err);
    return false;
  }
}
