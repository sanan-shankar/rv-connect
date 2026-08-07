#!/usr/bin/env node
/**
 * Apply a generated schema SQL script to the DEMO database.
 *
 *   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /tmp/demo-schema.sql
 *   node scripts/demo/apply-schema.mjs /tmp/demo-schema.sql
 *
 * WHY NOT `prisma db push`. prisma.config.ts starts with `import "dotenv/config"`,
 * which loads the repo's .env: the REAL database. Whether an injected DIRECT_URL
 * wins over that depends on dotenv's no-override behaviour and on load order,
 * and "probably wins" is not good enough when the downside is running DDL
 * against production. This script takes its connection string from .env.demo
 * explicitly, and nothing else is on the path.
 *
 * Two assertions before a single statement runs:
 *   1. the host must be the demo project's pooler, and
 *   2. the database must contain ZERO tables.
 * Production has thirty. So if this were ever pointed at it by accident, (2)
 * stops it dead rather than rewriting it.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

const EXPECTED_REF = "cbvlzptghkuxhygyaezq";

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("usage: node scripts/demo/apply-schema.mjs <schema.sql>");
  process.exit(1);
}

/** Minimal .env parser: only what this file needs, no dotenv on the path. */
function readEnvDemo() {
  const out = {};
  for (const line of readFileSync(".env.demo", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = readEnvDemo();
const dsn = env.DIRECT_URL;
if (!dsn) {
  console.error(".env.demo has no DIRECT_URL");
  process.exit(1);
}

// Assertion 1: the connection string names the demo project and nothing else.
if (!dsn.includes(EXPECTED_REF)) {
  console.error(
    `Refusing to run: DIRECT_URL does not mention the demo project ref\n` +
      `${EXPECTED_REF}. This script only ever touches the demo database.`,
  );
  process.exit(1);
}
if (env.DEMO_MODE !== "1") {
  console.error("Refusing to run: .env.demo does not set DEMO_MODE=1.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dsn, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  const existing = rows[0].n;

  // Assertion 2: an empty database. The real one has thirty tables, so this is
  // the check that would actually catch a mistake the ref check somehow missed.
  if (existing !== 0) {
    console.error(
      `Refusing to run: the target database already has ${existing} table(s) in\n` +
        `public. This script creates a schema from empty and will not run against\n` +
        `a database that already holds something.`,
    );
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, "utf8");
  console.log(`Applying ${sqlPath} to the demo database...`);
  await client.query(sql);

  const after = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log(`\nCreated ${after.rows.length} tables:`);
  console.log("  " + after.rows.map((r) => r.table_name).join(", "));
} finally {
  await client.end();
}
