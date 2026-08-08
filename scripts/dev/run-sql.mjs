#!/usr/bin/env node
/**
 * Run a SQL file (or an inline statement) against the project database.
 *
 * Usage:
 *   node scripts/dev/run-sql.mjs path/to/file.sql
 *   node scripts/dev/run-sql.mjs --inline "SELECT count(*) FROM \"User\""
 *
 * Uses DIRECT_URL (session pooler, port 5432) like the Prisma CLI does, so DDL
 * works; falls back to DATABASE_URL. Reads .env then .env, never prints
 * the connection string. Prints row output as JSON (capped) so it is safe to
 * pipe into logs.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnv() {
  const vars = {};
  for (const file of [".env", ".env"]) {
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

const env = loadEnv();
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error("No DIRECT_URL or DATABASE_URL found in .env");
  process.exit(1);
}

const [, , arg, inlineSql] = process.argv;
let sql;
if (arg === "--inline") sql = inlineSql;
else if (arg) sql = readFileSync(resolve(process.cwd(), arg), "utf8");
if (!sql) {
  console.error("Usage: run-sql.mjs <file.sql> | --inline \"SQL\"");
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
