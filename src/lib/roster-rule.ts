/* ------------------------------------------------------------------ *
 *  The roster matching rule, pure and import-free, so the unit tests
 *  and the dev import script can hold the exact same logic the server
 *  runs (the split follows post-visibility-rule.ts).
 *
 *  What counts as "on the office list" (owner, 2026-08-19): the email
 *  matching exactly is enough on its own -- the account has just PROVED
 *  it owns that mailbox, and the school's sheet says that mailbox is an
 *  alum. A name match is weaker (anyone can type a name), so it only
 *  counts together with the batch year, and both only ever run for an
 *  account whose email is already confirmed.
 *
 *  And a name match no longer verifies anybody (owner, 2026-10-29, bug
 *  audit 3 O-08). The year was meant to make it hard to fake, but the
 *  directory hands every confirmed account each member's name and batch
 *  year, so a stranger could copy one and be verified as that classmate.
 *  It now puts the account in front of the owner instead: see
 *  `rosterOutcome` below.
 * ------------------------------------------------------------------ */

/**
 * What an admin's "Remove verification" leaves in `User.verifyMethod`,
 * beside `verifyState: "unverified"`.
 *
 * Before it, the removal wrote a null method, which is exactly what a row
 * nobody has looked at carries, so the office list verified a roster-matched
 * member again on their next password reset, profile edit or "Ask to be
 * verified", or on the admin's own next edit of their name (bug audit 3,
 * T7a-06). Verifying them again by hand overwrites it.
 */
export const ADMIN_WITHHELD = "admin_withheld";

/** What the office list may do for one account. */
export type RosterOutcome = "verify" | "queue" | "none";

export interface RosterAccount {
  /** The link sent to the sign-in address was tapped: `User.emailVerified`,
   *  the fact, never the session's gate (email-gate-rule.test.mjs). */
  mailboxProven: boolean;
  verifyState: string;
  verifyMethod: string | null;
}

/**
 * Whether the office list may act on this account at all: a confirmed
 * address (a match against an unproven mailbox proves nothing), a state that
 * is still open ("unverified" or "pending"), and no decision on the row.
 * Every method counts as a decision -- an admin's removal above, or how a
 * verified account got there -- and an undefined one fails closed.
 */
export function rosterMayAct(account: RosterAccount): boolean {
  return (
    account.mailboxProven &&
    account.verifyMethod === null &&
    (account.verifyState === "unverified" || account.verifyState === "pending")
  );
}

/**
 * The owner's rule for an office-list match (2026-10-29):
 *
 *   verify  the sign-in email is on the list. The only automatic verification.
 *   queue   only the name and a batch year match. An unverified account goes
 *           to the admin's verify queue ("pending"), with the row beside it on
 *           its admin page. A pending one is already there, so it is "none":
 *           a second edit must not ring the admins again.
 *   none    no match, or the list may not act (`rosterMayAct`).
 *
 * Nothing here asks whether another account already fits the same row, on
 * purpose. The audit proposed refusing a second claimant; the owner ruled
 * against it on 2026-10-29, because two people can share a name: a second
 * match is queued for him like any other, and the admin page shows the first
 * as information.
 */
export function rosterOutcome(
  account: RosterAccount,
  matched: { email: boolean; name: boolean }
): RosterOutcome {
  if (!rosterMayAct(account)) return "none";
  if (matched.email) return "verify";
  if (matched.name && account.verifyState === "unverified") return "queue";
  return "none";
}

/**
 * One canonical spelling for a person's name: lowercase, diacritics folded
 * out, every run of punctuation or space collapsed to one space. "Sriram
 *  Krishnan" and "SRIRAM KRISHNAN." both become "sriram krishnan".
 */
export function normalizeRosterName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
}

/**
 * The sheet's "Name & initials" column writes "Chellam Kuppuraj, T." --
 * the person, a comma, then initials. Everything from the first comma on is
 * dropped BEFORE normalizing, or the initials become stray one-letter tokens
 * that break the first+last comparison below.
 */
export function stripRosterInitials(raw: string): string {
  return raw.split(",")[0].trim();
}

/**
 * Does a member's typed name match a roster row's normalized name?
 *
 * Exact match after normalization, or first+last token equality -- which
 * forgives a middle name present on only one side ("Ananya Iyer" vs "Ananya
 * Devi Iyer") without ever matching on a single token. Both compared tokens
 * must be real words (2+ letters), so an initial can never carry a match.
 */
export function rosterNameMatches(userName: string, entryNormalizedName: string): boolean {
  const u = normalizeRosterName(userName);
  const e = entryNormalizedName;
  if (!u || !e) return false;
  if (u === e) return true;

  const ut = u.split(" ");
  const et = e.split(" ");
  if (ut.length < 2 || et.length < 2) return false;
  const [uFirst, uLast] = [ut[0], ut[ut.length - 1]];
  const [eFirst, eLast] = [et[0], et[et.length - 1]];
  return (
    uFirst.length >= 2 &&
    uLast.length >= 2 &&
    uFirst === eFirst &&
    uLast === eLast
  );
}

/**
 * Does a roster row's year fit this member? The sheets state one year per
 * person but mean slightly different things by it ("Batch" vs "Year of
 * Passing"), and a member who left in 10th has a yearLeft two years before
 * their batchYear -- so either of the member's two years may be the one the
 * office wrote down. A row with NO year can never carry a name-only match.
 */
export function rosterYearMatches(
  entryYear: number | null,
  user: { batchYear: number | null; yearLeft: number | null }
): boolean {
  if (entryYear == null) return false;
  return entryYear === user.batchYear || entryYear === user.yearLeft;
}
