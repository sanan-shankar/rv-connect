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

/* ------------------------------------------------------------------ *
 *  Timestamps, read and written in UTC.
 *
 *  Prisma stores every DateTime as `timestamp without time zone` holding
 *  the UTC wall clock, and reads it back as UTC. Raw `pg` did neither: it
 *  parsed such a column in the LAPTOP's zone and sent a JS Date in it. In
 *  India every timestamp a script read came out 5 h 30 m early; in London
 *  an hour early in summer and right in winter. The Catch-ups export, the
 *  safety copy taken before every destructive Catch-ups migration, wrote
 *  its dates that way, and run-sql.mjs printed them that way (bug audit 3,
 *  L3-02; the write half is bugs.md item 6).
 *
 *  Set here, for the whole process, as this module loads, so no script can
 *  open a client without them.
 * ------------------------------------------------------------------ */

const STAMP = /^(\d{4,})-(\d\d)-(\d\d)(?: (\d\d):(\d\d):(\d\d)(\.\d+)?)?( BC)?$/;

/**
 * Postgres's text for a `timestamp` or a `date`, as the instant it names in
 * UTC: a date is its UTC midnight. `infinity` comes back as node-pg's own
 * parser gives it. Text in any other shape (another DateStyle) comes back
 * unchanged, so a surprise prints as what the server said rather than as a
 * wrong instant.
 * @param {string} text
 * @returns {Date | number | string}
 */
export function utcInstant(text) {
  if (text === "infinity") return Infinity;
  if (text === "-infinity") return -Infinity;
  const m = STAMP.exec(text);
  if (!m) return text;
  const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = "", bc] = m;
  const at = new Date(0);
  // 1 BC is year 0 here, and setUTCFullYear keeps years 0-99 as given.
  at.setUTCFullYear(bc ? 1 - Number(year) : Number(year), Number(month) - 1, Number(day));
  // Postgres sends up to six fractional digits; a Date holds three. ".57" is 570.
  at.setUTCHours(Number(hour), Number(minute), Number(second), Number(`${fraction.slice(1)}000`.slice(0, 3)));
  return at;
}

const { builtins, setTypeParser, arrayParser } = pg.types;
setTypeParser(builtins.TIMESTAMP, utcInstant);
setTypeParser(builtins.DATE, utcInstant);
// The array forms: node-pg's own parse each element in local time too.
const utcArray = (text) => arrayParser.create(text, (e) => (e === null ? null : utcInstant(e))).parse();
setTypeParser(1115, utcArray); // timestamp[]
setTypeParser(1182, utcArray); // date[]
// A JS Date sent as a parameter: the UTC wall clock, the way Prisma writes it.
pg.defaults.parseInputDatesAsUTC = true;

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
