import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "../../src/lib/test-kit.mjs";
import { SUPABASE_ROOT_CA_2021 } from "../../src/lib/db-tls.ts";
import pg from "pg";
import utils from "pg/lib/utils.js";
import { pgClient, pgPool, utcInstant } from "../dev/_pg.mjs";

/* ------------------------------------------------------------------ *
 *  Raw `pg` in scripts/ goes through one opener.
 *
 *  The laptop scripts all reach the one database production also uses,
 *  and twenty of them built their own client, three ways. Ten of those
 *  accepted any certificate (bug audit 3, VOL1-01). scripts/dev/_pg.mjs
 *  is now the only place a script gets a client, so a rule about how the
 *  database is opened is made once and cannot be forgotten by the next
 *  script. These tests hold all three parts: nothing under scripts/
 *  builds a client anywhere else, what the opener builds verifies
 *  Supabase whatever its caller asked for, and every timestamp a script
 *  reads or writes is UTC (bug audit 3, L3-02), as Prisma's are.
 * ------------------------------------------------------------------ */

const OPENER = "scripts/dev/_pg.mjs";

test("nothing under scripts/ builds a raw pg client except the opener", () => {
  /* A filesystem walk, not git: a new script is caught the moment it is
     written, and the gitignored working folders under scripts/dev hold
     one-off scripts that reach the same database. */
  const files = walk(join(ROOT, "scripts"), {
    skip: (name) => SKIP_DIRS.includes(name),
    match: (name) => /\.(mjs|mts|ts|js|cjs)$/.test(name) && !/\.test\.mjs$/.test(name),
  });
  const offenders = [];
  let opened = 0;
  for (const full of files) {
    const rel = full.slice(ROOT.length + 1);
    if (rel === OPENER) continue;
    const src = decomment(read(rel));
    const builds = /new\s+(?:pg\.)?(?:Client|Pool)\s*\(/.test(src);
    const imports = /\bfrom\s+["']pg["']|require\(\s*["']pg["']\s*\)/.test(src);
    if (builds || imports) offenders.push(rel);
    opened += [...src.matchAll(/(?<!function\s+)\bpg(?:Client|Pool)\s*\(/g)].length;
  }
  // Anti-vacuity: 20 opener calls in tracked scripts on 2026-10-29.
  assert.ok(opened >= 15, `only ${opened} opener calls under scripts/; the sweep has drifted`);
  assert.deepEqual(
    offenders,
    [],
    `these import pg or build their own client; use pgClient/pgPool from ${OPENER}:\n  ` +
      offenders.join("\n  "),
  );
});

test("the opener verifies Supabase, whatever its caller asked for", async () => {
  const VERIFIED = { ca: SUPABASE_ROOT_CA_2021, rejectUnauthorized: true };
  // A connection string asking for no TLS, and options asking for none too.
  const asked = "postgresql://u:p@db.example:5432/postgres?sslmode=disable&pgbouncer=true";

  const client = pgClient(asked, { ssl: false, statement_timeout: 5000 });
  assert.deepEqual(client.connectionParameters.ssl, VERIFIED);
  assert.equal(client.connectionParameters.statement_timeout, 5000, "the caller's other options are lost");

  const pool = pgPool(asked, { ssl: { rejectUnauthorized: false }, max: 6 });
  assert.deepEqual(pool.options.ssl, VERIFIED);
  assert.equal(pool.options.max, 6, "the caller's other options are lost");
  await pool.end();

  /* No connection string means pg falls back to PG* variables and
     localhost: a default database, which this opener refuses to have. */
  assert.throws(() => pgClient(undefined), /No connection string/);
  assert.throws(() => pgPool(""), /No connection string/);
});

/* ------------------------------------------------------------------ *
 *  Timestamps (L3-02). Only worth testing away from UTC: on a UTC machine,
 *  which every CI runner is, local time IS UTC and the broken parse passes
 *  as well. India, because that is where the laptop was when the Catch-ups
 *  exports came out 5 h 30 m early, and it keeps no daylight saving, so
 *  these tests mean the same thing in every month.
 * ------------------------------------------------------------------ */
process.env.TZ = "Asia/Kolkata";

test("this file runs on a clock that is not UTC, so the tests below can fail", () => {
  // 18:30 UTC is midnight in India.
  assert.equal(new Date(Date.UTC(2026, 8, 4, 18, 30)).getHours(), 0);
});

test("a timestamp reads as the UTC instant it names, not as laptop time", () => {
  /* A deadline from the finding: 18:30 UTC on 4 September is 00:00 on the
     5th in the valley. node-pg's own parse builds the Date from local parts,
     which on this clock is 5 h 30 m early and on the valley's previous day. */
  const text = "2026-09-04 18:30:13.663";
  assert.equal(new Date(2026, 8, 4, 18, 30, 13, 663).toISOString(), "2026-09-04T13:00:13.663Z");
  assert.equal(utcInstant(text).toISOString(), "2026-09-04T18:30:13.663Z");
  assert.equal(pg.types.getTypeParser(1114)(text).toISOString(), "2026-09-04T18:30:13.663Z");
});

test("the parse keeps every shape Postgres sends", () => {
  assert.equal(utcInstant("2026-09-04 18:30:13.663123").toISOString(), "2026-09-04T18:30:13.663Z");
  assert.equal(utcInstant("2026-01-01 00:00:00.57").getUTCMilliseconds(), 570);
  assert.equal(utcInstant("2026-01-01 00:00:00").toISOString(), "2026-01-01T00:00:00.000Z");
  // A `date` is its UTC midnight, so its calendar day survives toISOString.
  assert.equal(utcInstant("2026-09-05").toISOString(), "2026-09-05T00:00:00.000Z");
  assert.equal(pg.types.getTypeParser(1082)("2026-09-05").toISOString(), "2026-09-05T00:00:00.000Z");
  assert.equal(utcInstant("infinity"), Infinity);
  assert.equal(utcInstant("-infinity"), -Infinity);
  assert.equal(utcInstant("0044-03-15 12:00:00 BC").toISOString(), "-000043-03-15T12:00:00.000Z");
  assert.equal(utcInstant("0099-12-31 23:59:59").toISOString(), "0099-12-31T23:59:59.000Z");
  // Another DateStyle comes back as the server's words, not as a wrong instant.
  assert.equal(utcInstant("09/04/2026 18:30:13"), "09/04/2026 18:30:13");
  const array = pg.types.getTypeParser(1115)('{"2026-09-04 18:30:13.663",NULL}');
  assert.deepEqual(array.map((d) => d && d.toISOString()), ["2026-09-04T18:30:13.663Z", null]);
});

test("a Date sent to the database goes as the UTC wall clock, as Prisma writes it", () => {
  /* The write half (bugs.md item 6). In laptop time this left as
     "2026-09-05T00:00:13.663+05:30", and a `timestamp without time zone`
     column keeps the wall clock and drops the offset. */
  assert.equal(pg.defaults.parseInputDatesAsUTC, true);
  assert.equal(utils.prepareValue(new Date("2026-09-04T18:30:13.663Z")), "2026-09-04T18:30:13.663+00:00");
});
