#!/usr/bin/env node
/**
 * Seed (or re-seed) the DEMO database.
 *
 *   npx tsx scripts/demo/seed-demo.mts
 *
 * The content and the writing logic live in src/lib/demo-seed/ because the
 * nightly reset route needs them too. This file is only the CLI door: load
 * the right env, refuse to point at the wrong database, call seedDemo().
 *
 * SAFETY. This deletes every row in the database it connects to, so it
 * refuses to run unless the target proves it is the demo one:
 *   1. `.env.demo` must exist and must set DEMO_MODE=1, and
 *   2. its DATABASE_URL must differ from the one in .env, which
 *      is the real database.
 * `--i-know-what-im-doing` overrides both. A tired person running this from
 * the wrong directory should hit an error, not a production wipe.
 *
 * Env is loaded by hand BEFORE any import that could construct a client,
 * since nothing auto-loads .env files outside Next.js. The Prisma client is
 * pulled in via dynamic import() so it is not hoisted above that.
 */

import { readEnv } from "../dev/_env.mjs";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

const FORCE = process.argv.includes("--i-know-what-im-doing");
const demoEnv = readEnv([".env.demo"]);
/* `[".env", ".env"]` until 2026-09-05: the second entry was a `.env.local`
   that stopped existing when the two were folded together on 2026-08-08
   (prisma.config.ts records that fold). Harmless, since first-writer wins,
   but it read as if two files mattered. */
const mainEnv = readEnv([".env"]);

/* Assigned, not loaded: the demo file has to beat anything already exported
   in the shell, and `loadEnv` would leave a stray production DATABASE_URL
   standing in a script that wipes whatever it connects to. */
for (const [k, v] of Object.entries(demoEnv)) process.env[k] = v;

function die(msg: string): never {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  die(
    "No DATABASE_URL. Create .env.demo holding the DEMO database credentials.\n" +
      "See docs/spec/demo.md for exactly what goes in it.",
  );
}
if (process.env.DEMO_MODE !== "1" && !FORCE) {
  die(
    "Refusing to run: .env.demo does not set DEMO_MODE=1.\n" +
      "This script deletes every row, so it only points at a database that\n" +
      "declares itself the demo one.",
  );
}
if (mainEnv.DATABASE_URL && mainEnv.DATABASE_URL === process.env.DATABASE_URL && !FORCE) {
  die(
    "Refusing to run: the demo DATABASE_URL is byte-identical to the one in\n" +
      ".env, which is the REAL database. The demo needs its own.",
  );
}

const { PrismaClient } = await import("../../src/generated/prisma/client.js");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { seedDemo } = await import("../../src/lib/demo-seed/seed.js");

// A plain, UNEXTENDED client on purpose. The demo write-guard in
// src/lib/prisma.ts would (correctly) refuse almost everything this script
// does; the guard exists to constrain visitors, not the operator holding
// the database password.
const prisma = new PrismaClient({
  adapter: new PrismaPg(withDatabaseTls(process.env.DATABASE_URL ?? "")),
});

console.log("Seeding the demo database.\n");
try {
  const r = await seedDemo(prisma, (m) => console.log(`  ${m}`));
  console.log(
    `\nDone.\n` +
      `  ${r.users} people\n` +
      `  ${r.posts} posts and letters\n` +
      `  ${r.comments} comments\n` +
      `  ${r.photos} Collection photos\n` +
      `  ${r.entries} Catch-up answers\n`,
  );
} catch (e) {
  console.error("\nSeed failed:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
