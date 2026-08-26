/**
 * Case-insensitive text matching for Prisma string filters.
 *
 * Postgres-only since the move off SQLite/libSQL on 2026-07-01, so this is a
 * plain constant: there is no longer a provider to detect. It used to be
 * `IS_POSTGRES ? {...} : {}` because SQLite's Prisma adapter rejects
 * `mode: "insensitive"` outright, and that arm has been unreachable ever since.
 *
 * Spread this into every `contains` / `startsWith` filter that a human types
 * into. Forgetting it is silently broken in the worst way: a search for "Afia"
 * misses a stored "afia" while a search for "fia" finds it.
 */
export const insensitive = { mode: "insensitive" } as const;

/**
 * The longest search pattern any `contains` filter will carry.
 *
 * `contains` compiles to `LIKE '%pattern%'`, which Postgres matches by naive
 * substring scan with no wildcard early-out, so the work per row is roughly
 * pattern length x text length. Nothing capped the term: `loadPosts` and
 * `buildDirectoryWhere` are unmetered reads on directly-callable paths, so a
 * 20KB `q` turned each ~20k-character letter into hundreds of millions of
 * comparisons and held one of five pool connections for the full 20s query
 * timeout, repeatably (audit C-015).
 *
 * A hundred characters is longer than any name, city or phrase somebody
 * actually searches for, so the clamp is invisible to a member and the whole
 * shape of the attack is gone.
 */
export const SEARCH_TERM_MAX = 100;

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
  /* Clamped BEFORE escaping, never after: truncating the escaped string could
     cut a `\\%` pair in half and leave a trailing lone backslash, which
     Postgres rejects outright ("LIKE pattern must not end with escape
     character"). */
  return value.slice(0, SEARCH_TERM_MAX).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
