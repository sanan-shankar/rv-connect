/**
 * Case-insensitive text matching for Prisma string filters.
 *
 * SQLite's Prisma adapter rejects `mode: "insensitive"`; only Postgres accepts
 * it. SQLite `LIKE` is already case-insensitive for ASCII, so on SQLite we drop
 * the flag. Detect the live provider the same way `prisma.ts` does.
 *
 * Spread this into every `contains` / `startsWith` filter that a human types
 * into. Forgetting it is silently broken in the worst way: a search for "Afia"
 * misses a stored "afia" while a search for "fia" finds it.
 */
const IS_POSTGRES = (process.env.DATABASE_URL ?? "").startsWith("postgres");

export const insensitive = IS_POSTGRES ? ({ mode: "insensitive" } as const) : {};

/**
 * Escape the LIKE wildcards in a value a human typed into a `contains` search.
 *
 * Prisma parameterises the value (so this is never a SQL-injection question)
 * but does NOT escape `%` and `_` inside `contains`/`startsWith`/`endsWith`, so
 * they reach Postgres as live wildcards: a search for "50%" matches every row
 * with "50" in it, and "_" matches any single character. Backslash is
 * Postgres's default LIKE escape, so prefixing each metacharacter (and the
 * backslash itself, first) makes it a literal. Pure alphanumeric queries -- the
 * overwhelming common case -- contain none of these three characters and pass
 * through byte-for-byte unchanged, so this only ever narrows a wildcard search
 * back to the literal one the person meant, never alters a normal one.
 *
 * Apply it to the free-text search box value, not to internal membership
 * checks on delimited columns (targetBatches, houses), whose stored tokens are
 * server-controlled and carry no wildcards.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
