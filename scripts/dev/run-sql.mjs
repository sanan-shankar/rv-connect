#!/usr/bin/env node
/**
 * Run a SQL file (or an inline statement) against the project database.
 *
 * Usage:
 *   node scripts/dev/run-sql.mjs path/to/file.sql
 *   node scripts/dev/run-sql.mjs --inline "SELECT count(*) FROM \"User\""
 *   node scripts/dev/run-sql.mjs --env .env.demo path/to/file.sql
 *
 * Uses DIRECT_URL (session pooler, port 5432) like the Prisma CLI does, so DDL
 * works; falls back to DATABASE_URL. Reads .env by default, never prints the
 * connection string. Prints row output as JSON (capped) so it is safe to pipe
 * into logs.
 *
 * `--env <file>` points it at a DIFFERENT env file, which exists for exactly
 * one reason: the demo deployment has its own Supabase project, and until
 * 2026-08-21 there was no way to apply a manual migration to it. The result
 * was silent schema drift -- `User.showEmail` shipped to the main database in
 * commit eedbb3e and never reached the demo's, where every query selecting it
 * then failed (found by a write-path review). A second database with no way
 * to migrate it is a second database that will be wrong.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnv(files) {
  const vars = {};
  for (const file of files) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in vars)) vars[m[1]] = v;
    }
  }
  return vars;
}

const argv = process.argv.slice(2);
let envFile = ".env";
if (argv[0] === "--env") {
  envFile = argv[1];
  argv.splice(0, 2);
}

const env = loadEnv([envFile]);
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error(`No DIRECT_URL or DATABASE_URL found in ${envFile}`);
  process.exit(1);
}

const [arg, inlineSql] = argv;
let sql;
if (arg === "--inline") sql = inlineSql;
else if (arg) sql = readFileSync(resolve(process.cwd(), arg), "utf8");
if (!sql) {
  console.error("Usage: run-sql.mjs [--env <file>] <file.sql> | --inline \"SQL\"");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    const rows = (r.rows || []).slice(0, 200);
    console.log(JSON.stringify({ command: r.command, rowCount: r.rowCount, rows }, null, 1));
  }
} catch (err) {
  console.error("SQL error:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
