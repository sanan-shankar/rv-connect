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
 * refuses to run unless the target proves it is the demo one. Two checks on
 * the destination, which nothing waives:
 *   1. the DATABASE_URL `.env.demo` gives carries the demo project's ref, and
 *   2. the database it reaches holds only the demo's cast: no address that
 *      is not @demo.invalid, and at most twice the cast's size.
 * And two on the request: `.env.demo` sets DEMO_MODE=1, and its DATABASE_URL
 * is not byte-identical to the one in .env. `--i-know-what-im-doing` waives
 * those two only. Until 2026-10-29 the request checks were all there was, and
 * only an unrelated foreign key stood between a mislabelled `.env.demo` and a
 * production wipe (bug audit 3, C1-05). A tired person running this from the
 * wrong directory should hit an error, not a production wipe.
 *
 * Env is loaded by hand BEFORE any import that could construct a client,
 * since nothing auto-loads .env files outside Next.js. The Prisma client is
 * pulled in via dynamic import() so it is not hoisted above that.
 */

import { readEnv, carriesDemoRef, demoWipeRefusal } from "../dev/_env.mjs";
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
if (!carriesDemoRef(process.env.DATABASE_URL)) {
  die(
    "Refusing to run: the DATABASE_URL in .env.demo does not name the demo project.\n" +
      "This script deletes every row, and nothing waives this check.",
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
const { ALL_DEMO_PEOPLE } = await import("../../src/lib/demo-seed/people.js");

// A plain, UNEXTENDED client on purpose. The demo write-guard in
// src/lib/prisma.ts would (correctly) refuse almost everything this script
// does; the guard exists to constrain visitors, not the operator holding
// the database password.
const prisma = new PrismaClient({
  adapter: new PrismaPg(withDatabaseTls(process.env.DATABASE_URL ?? "")),
});

/* What the database holds, read before the wipe can touch it. */
const [users, outsiders] = await Promise.all([
  prisma.user.count(),
  prisma.user.count({ where: { NOT: { email: { endsWith: "@demo.invalid" } } } }),
]);
const refusal = demoWipeRefusal({ users, outsiders, cast: ALL_DEMO_PEOPLE.length });
if (refusal) die(`Refusing to run: ${refusal}. This is not the demo database.`);

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
