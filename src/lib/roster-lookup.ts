import { prisma } from "./prisma";
import { normalizeRosterName, rosterNameMatches, rosterYearMatches } from "./roster-rule";

/* ------------------------------------------------------------------ *
 *  Reading the office roster: which of its rows fit an account.
 *
 *  roster.ts ACTS on a match (verifies, or queues for an admin) and is
 *  called from the member's own write paths; this file only finds the
 *  rows, for that and for the admin's person page, which has no reason
 *  to import a write path that rings bells and writes the audit log.
 *  The matching itself is the pure rule in roster-rule.ts.
 * ------------------------------------------------------------------ */

const ROW_SELECT = {
  id: true,
  fullName: true,
  normalizedName: true,
  email: true,
  batchYear: true,
  source: true,
} as const;

export interface RosterRow {
  id: string;
  fullName: string;
  normalizedName: string;
  email: string | null;
  batchYear: number | null;
  source: string;
}

export interface RosterSubject {
  email: string;
  name: string;
  batchYear: number | null;
  yearLeft: number | null;
}

/** The row this account's sign-in email is on, if any. */
export function rowForEmail(user: RosterSubject): Promise<RosterRow | null> {
  return prisma.rosterEntry.findFirst({
    where: { email: user.email.toLowerCase() },
    select: ROW_SELECT,
  });
}

/**
 * The rows this account fits by name and one of its two years. Only the rows
 * for those years are pulled (index-backed), then the pure rule compares names.
 */
export async function rowsForName(user: RosterSubject): Promise<RosterRow[]> {
  const years = [user.batchYear, user.yearLeft].filter((y): y is number => y != null);
  if (years.length === 0 || !normalizeRosterName(user.name)) return [];
  const candidates = await prisma.rosterEntry.findMany({
    where: { batchYear: { in: years } },
    select: ROW_SELECT,
  });
  return candidates.filter(
    (c) => rosterYearMatches(c.batchYear, user) && rosterNameMatches(user.name, c.normalizedName)
  );
}

/** One office-list row an account fits, for the admin deciding about it. */
export interface RosterMatch {
  id: string;
  how: "email" | "name";
  fullName: string;
  /** The address the school has for this person, which may not be theirs. */
  email: string | null;
  batchYear: number | null;
  /** Every OTHER account the same row fits. Information, never a refusal:
   *  names repeat (owner, 2026-10-29). */
  others: { id: string; name: string; verified: boolean }[];
}

/**
 * What the office list says about one person, read fresh for their admin page:
 * the row their sign-in email is on, the rows their name and years fit, and
 * who else each row fits.
 *
 * Read live rather than from the audit log on purpose. The accounts the list
 * verified before 2026-10-29 left no record of their row, audit rows age out
 * after a year, and a re-import replaces every row id; the rule itself is the
 * one thing that stays true.
 */
export async function loadRosterMatches(
  user: RosterSubject & { id: string }
): Promise<RosterMatch[]> {
  const [byEmail, byName] = await Promise.all([rowForEmail(user), rowsForName(user)]);
  const rows = [
    ...(byEmail ? [{ how: "email" as const, row: byEmail }] : []),
    ...byName.filter((r) => r.id !== byEmail?.id).map((row) => ({ how: "name" as const, row })),
  ];

  const emails = rows.map((r) => r.row.email).filter((e): e is string => e != null);
  const years = rows.map((r) => r.row.batchYear).filter((y): y is number => y != null);
  const fits = [
    ...(emails.length > 0 ? [{ email: { in: emails.map((e) => e.toLowerCase()) } }] : []),
    ...(years.length > 0 ? [{ batchYear: { in: years } }, { yearLeft: { in: years } }] : []),
  ];
  // Never an empty OR (docs/TRAPS.md, "Do not depend on how an empty array compiles").
  if (fits.length === 0) return [];

  const people = await prisma.user.findMany({
    where: { id: { not: user.id }, OR: fits },
    select: { id: true, name: true, email: true, batchYear: true, yearLeft: true, verifyState: true },
  });

  return rows.map(({ how, row }) => ({
    id: row.id,
    how,
    fullName: row.fullName,
    email: row.email,
    batchYear: row.batchYear,
    others: people
      .filter(
        (p) =>
          (row.email !== null && p.email === row.email) ||
          (rosterYearMatches(row.batchYear, p) && rosterNameMatches(p.name, row.normalizedName))
      )
      .map((p) => ({ id: p.id, name: p.name, verified: p.verifyState === "verified" })),
  }));
}
