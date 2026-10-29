import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "../../src/lib/test-kit.mjs";
import { SUPABASE_ROOT_CA_2021 } from "../../src/lib/db-tls.ts";
import { pgClient, pgPool } from "../dev/_pg.mjs";

/* ------------------------------------------------------------------ *
 *  Raw `pg` in scripts/ goes through one opener.
 *
 *  The laptop scripts all reach the one database production also uses,
 *  and twenty of them built their own client, three ways. Ten of those
 *  accepted any certificate (bug audit 3, VOL1-01). scripts/dev/_pg.mjs
 *  is now the only place a script gets a client, so a rule about how the
 *  database is opened is made once and cannot be forgotten by the next
 *  script. These tests hold both halves: nothing under scripts/ builds a
 *  client anywhere else, and what the opener builds verifies Supabase
 *  whatever its caller asked for.
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
