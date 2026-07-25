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
