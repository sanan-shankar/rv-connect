/**
 * The two Prisma error codes this app has to answer rather than throw.
 *
 * Each one is a race the database has already settled correctly, arriving as an
 * exception. A unique violation on a like means the other tap won and the row
 * exists -- which IS the state the caller was asking for. A missing record on a
 * delete means the other tap already removed it. Treating these as failures is
 * what turned an ordinary mobile double-tap into a raw error thrown out of a
 * server action, with the client's optimistic state left pointing the wrong way
 * (audit B-040, Lows 67 and 80).
 *
 * Collected here because there were four hand-written `code === "P2002"` checks
 * scattered across the codebase and no name for what any of them meant.
 *
 * P2025 ("update/delete matched no row") had a predicate here too until the
 * 2026-08-25 refactor audit found it callerless. It is not an oversight: seven
 * places in this codebase answer that race by reaching for `updateMany` rather
 * than `update`, which simply affects zero rows instead of throwing. Do that
 * rather than re-adding a hand-rolled `code === "P2025"`.
 */
function code(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const c = (err as { code?: unknown }).code;
  return typeof c === "string" ? c : undefined;
}

/** P2002: a unique constraint rejected the write. The row is already there. */
export function isUniqueViolation(err: unknown): boolean {
  return code(err) === "P2002";
}

/** P2003: a foreign key pointed at something that does not exist. */
export function isForeignKeyViolation(err: unknown): boolean {
  return code(err) === "P2003";
}

/**
 * True when an error means "this table does not exist yet" -- a migration
 * written by hand and not yet run.
 *
 * Not a race like the two above, but the same shape of question: a surface
 * that asks for data whose table is missing should degrade to empty rather
 * than 500. Two callers wanted this and each wrote its own copy.
 *
 * `table` scopes the message fallback, and scoping it is the whole point: the
 * two error CODES are unambiguous, but Prisma does not always produce them,
 * and matching "does not exist" alone would swallow an unrelated failure and
 * render an empty page instead of reporting it.
 */
export function isMissingTable(err: unknown, table: RegExp): boolean {
  const c = code(err);
  if (c === "P2021") return true; // Prisma: the table does not exist
  if (c === "42P01") return true; // Postgres undefined_table, raw via the pg adapter
  const message = (err as { message?: unknown } | null)?.message;
  if (typeof message !== "string") return false;
  return table.test(message) && /does not exist/i.test(message);
}
