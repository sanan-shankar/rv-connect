/**
 * Opening the database from a script, once, the safe way.
 *
 * Every script under scripts/ that talks to Postgres through raw `pg` gets its
 * client here and nowhere else; scripts/qa/raw-pg.test.mjs fails a
 * `new pg.Client` or `new pg.Pool` written anywhere else under scripts/.
 *
 * Encrypted AND verified. `withDatabaseTls` (src/lib/db-tls.ts) is the app's
 * own connection rule: TLS, and a certificate that chains to Supabase's
 * pinned root. Until 2026-10-29 ten of these scripts, run-sql.mjs among them,
 * passed `ssl: { rejectUnauthorized: false }` instead: encrypted, but willing
 * to talk to whoever answered, which is the one thing verifying exists to stop
 * (bug audit 3, VOL1-01). Options can add to a client; they cannot loosen
 * that, which is why they are spread first and the TLS settings last.
 *
 * Deliberately NO default connection string. Each script still decides where
 * it points, through `databaseUrl` in _env.mjs and its demo guard; an opener
 * that picked a database for you is the convenience scripts/demo keeps a wall
 * against.
 *
 * Loading db-tls.ts makes Node print one MODULE_TYPELESS_PACKAGE_JSON warning
 * per run on stderr, as every script here that imports a src/lib .ts file
 * does. It is harmless. Its own advice, `"type": "module"` in package.json,
 * would change how the whole app's files load, which is not a trade for a
 * quieter terminal.
 */
import pg from "pg";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

/** `url`, or a refusal: pg given nothing falls back to PG* variables and
 *  localhost, which is a default database by another name. */
function named(url) {
  if (!url) throw new Error("No connection string: say which database, through databaseUrl() in _env.mjs");
  return url;
}

/** A `pg.Client` for `url`, not yet connected.
 *  @param {string} url
 *  @param {import("pg").ClientConfig} [options] */
export function pgClient(url, options = {}) {
  return new pg.Client({ ...options, ...withDatabaseTls(named(url)) });
}

/** A `pg.Pool` for `url`, for a script whose workers run queries side by side.
 *  @param {string} url
 *  @param {import("pg").PoolConfig} [options] */
export function pgPool(url, options = {}) {
  return new pg.Pool({ ...options, ...withDatabaseTls(named(url)) });
}
