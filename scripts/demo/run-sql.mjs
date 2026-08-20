#!/usr/bin/env node
/**
 * Run a SQL file (or --inline statement) against the DEMO database.
 *
 * The demo counterpart of scripts/dev/run-sql.mjs, needed because that one
 * reads .env (the real database) and apply-schema.mjs refuses any database
 * that already has tables (it is the bootstrap tool). This one takes its
 * connection from .env.demo ONLY, and refuses to run unless the host carries
 * the demo project's ref -- so it can never be pointed at production by a
 * stray environment variable.
 *
 * Usage:
 *   node scripts/demo/run-sql.mjs path/to/file.sql
 *   node scripts/demo/run-sql.mjs --inline "SELECT count(*) FROM \"User\""
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const EXPECTED_REF = "cbvlzptghkuxhygyaezq";

const env = {};
for (const line of readFileSync(".env.demo", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  env[m[1]] = v;
}

const conn = env.DIRECT_URL || env.DATABASE_URL;
if (!conn) {
  console.error(".env.demo has no DIRECT_URL/DATABASE_URL");
  process.exit(1);
}
if (!conn.includes(EXPECTED_REF)) {
  console.error(`refusing: connection host does not carry the demo ref ${EXPECTED_REF}`);
  process.exit(1);
}

const sql =
  process.argv[2] === "--inline"
    ? process.argv[3]
    : readFileSync(resolve(repoRoot, process.argv[2]), "utf8");
if (!sql) {
  console.error("usage: node scripts/demo/run-sql.mjs <file.sql | --inline 'SQL'>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: conn });
await client.connect();
try {
  const result = await client.query(sql);
  const results = Array.isArray(result) ? result : [result];
  for (const r of results) {
    console.log(
      JSON.stringify({ command: r.command, rowCount: r.rowCount, rows: r.rows.slice(0, 50) }, null, 1)
    );
  }
} finally {
  await client.end();
}
