import { prisma } from "./prisma";
import { IS_DEMO } from "./demo";
import { writeAudit } from "./audit";
import { notifyAdmins } from "./admin-threads-server";
import { rosterMayAct, rosterOutcome } from "./roster-rule";
import { rowForEmail, rowsForName, type RosterRow } from "./roster-lookup";

/* ------------------------------------------------------------------ *
 *  The office roster, acting on an account (trust model, Phase 3).
 *
 *  Called at the moments an account becomes matchable: when its email
 *  gets confirmed (confirmEmailToken, resetPassword), when its name or
 *  years change (the member's own profile, or an admin's edit of it),
 *  and when the member asks to be verified. Everywhere it is
 *  best-effort: a roster hiccup must never break a confirmation that
 *  has already happened, so callers fire it through
 *  tryRosterAutoVerifyQuietly below.
 *
 *  What it may do is `rosterOutcome` (roster-rule.ts): a sign-in email
 *  on the list verifies; a name and batch year alone only put the
 *  account in the admin's verify queue. Both go in the audit log with
 *  the row they matched, because nothing else records it, and a
 *  re-import replaces every row id (scripts/dev/import-roster.mjs).
 *  Finding the rows is roster-lookup.ts, which the admin's person page
 *  reads without pulling in this write path.
 * ------------------------------------------------------------------ */

/** One row, in words that still read after a re-import has replaced its id. */
function describeRow(how: "email" | "name", row: RosterRow): string {
  const why = how === "email" ? "by email" : "by name and batch";
  return `${why}: ${row.fullName}, ${row.batchYear ?? "no year"} (${row.source}, ${row.id})`;
}

/**
 * Act on `userId` if the office list vouches for them. Returns true when the
 * user ends up verified by this call; a match that only queued them is false.
 *
 * Every precondition is checked here, not trusted from the caller, and each
 * write is conditional on the same facts, so an admin's decision that lands
 * between the read and the write (verify, or remove) is never overwritten.
 *
 * Never fills admission number, houses, or anything else from the sheets
 * (owner call: the roster admits people, it does not write their profile).
 */
async function tryRosterAutoVerify(userId: string): Promise<boolean> {
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
      verifyMethod: true,
    },
  });
  if (!user) return false;
  /* Confirmed, NOT merely "the email gate is open". A member waiting behind
     the daily email limit gets every gate (`confirmationStillWaiting`), but the
     roster matches on name and batch year, which are public: letting a waiting
     account match would let anyone sign up with an address they do not own,
     type a real alumnus's name and be verified AS them, posting under that
     name and reading every member's contact details (write-path review,
     2026-09-29). A waiting member can still ask to be verified, which reaches
     the owner; the match itself runs the moment they tap their link. */
  if (!user.emailVerified) return false;

  const account = {
    mailboxProven: Boolean(user.emailVerified),
    verifyState: user.verifyState,
    verifyMethod: user.verifyMethod,
  };
  // A row the list may not touch costs no roster lookup.
  if (!rosterMayAct(account)) return false;

  const byEmail = await rowForEmail(user);
  const byName = byEmail ? [] : await rowsForName(user);
  const outcome = rosterOutcome(account, { email: byEmail !== null, name: byName.length > 0 });

  if (outcome === "verify" && byEmail) {
    const now = new Date();
    const verified = await prisma.user.updateMany({
      where: { id: userId, verifyState: { in: ["unverified", "pending"] }, verifyMethod: null },
      data: {
        verifyState: "verified",
        verifyStateAt: now,
        verifyMethod: "office_list",
        verifiedAt: now,
      },
    });
    if (verified.count === 0) return false;
    await writeAudit({
      action: "roster.verify",
      targetType: "user",
      targetId: userId,
      detail: describeRow("email", byEmail),
    });
    return true;
  }

  if (outcome === "queue") {
    /* "pending" IS the admin's verify queue: the Overview worklist and the
       rail's count both read it. The admins hear about it once, on the
       transition; the next edit finds the row pending and rosterOutcome
       answers "none", so typing a name twice does not ring them twice. */
    const queued = await prisma.user.updateMany({
      where: { id: userId, verifyState: "unverified", verifyMethod: null },
      data: { verifyState: "pending", verifyStateAt: new Date() },
    });
    if (queued.count === 1) {
      const more = byName.length > 1 ? ` (and ${byName.length - 1} more)` : "";
      await writeAudit({
        action: "roster.queue",
        targetType: "user",
        targetId: userId,
        detail: describeRow("name", byName[0]) + more,
      });
      await notifyAdmins(`${user.name} matches the office list by name`, `/admin/people/${userId}`);
    }
  }

  return false;
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
