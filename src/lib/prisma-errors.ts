/**
 * The three Prisma error codes this app has to answer rather than throw.
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

/** P2025: `update`/`delete` matched no row. It is already gone. */
export function isRecordNotFound(err: unknown): boolean {
  return code(err) === "P2025";
}

/** P2003: a foreign key pointed at something that does not exist. */
export function isForeignKeyViolation(err: unknown): boolean {
  return code(err) === "P2003";
}
