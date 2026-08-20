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
 * ------------------------------------------------------------------ */

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
