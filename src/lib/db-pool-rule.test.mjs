import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROOT, decomment, walk } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The connection pool has to stay bounded and impatient.
 *
 *  Before 2026-08-21 `new PrismaPg({ connectionString })` took every pg
 *  default: max 10 per instance and NO checkout timeout, which means a
 *  checkout with no free connection waits forever (pg-pool/index.js:205).
 *  The (main) layout awaits its data ABOVE every loading.tsx, so "forever"
 *  renders as a blank page or a platform 504 rather than the app's error
 *  screen -- and each hung request keeps holding its Vercel slot, so the
 *  incident compounds instead of shedding.
 *
 *  These are static-shape assertions in the security-regressions.test.mjs
 *  style: they read the real source, so the tripwire fires the moment
 *  somebody simplifies the config back to a bare connection string.
 * ------------------------------------------------------------------ */

/* EVERY construction site, not just src/lib/prisma.ts.
 *
 * This test read that one file until 2026-09-05, and there was a second
 * `new PrismaPg(` the whole time: /api/demo/reset builds its own unguarded
 * client per call, correctly (the demo write policy would refuse the seed),
 * and took every pg default while doing it. A rule that reads one path cannot
 * see the next place somebody legitimately needs a second client.
 *
 * `walk` skips src/generated, whose Prisma-authored docblocks quote the bare
 * form in prose, and `decomment` drops the two comments in this repo that
 * quote it to explain why it is wrong. */
/* These values are written with JS numeric separators (`20_000`), and a bare
 * \d+ stops at the underscore. Until 2026-09-05 that made every band check
 * below read `20_000` as 20 and `5_000` as 5: they passed, but for the wrong
 * reason, and a query_timeout of `600_000` -- ten minutes -- would have read
 * as 600 and passed too. Found by mutation-testing the widened sweep. */
const ms = (raw) => Number(raw.replace(/_/g, ""));

const sites = walk(resolve(ROOT, "src"))
  .map((file) => ({ file, src: decomment(readFileSync(file, "utf8")) }))
  .filter(({ src }) => /new PrismaPg\(/.test(src))
  .map(({ file, src }) => ({ file: file.slice(ROOT.length + 1), src }));

test("the sweep still finds the construction sites it is meant to guard", () => {
  // Without this, a broken walk or a renamed adapter empties every loop below
  // and the whole file passes by testing nothing.
  assert.ok(
    sites.length >= 2,
    `only ${sites.length} PrismaPg construction site(s) found; the sweep has drifted`
  );
});

test("the pg pool caps connections per instance", () => {
  for (const { file, src } of sites) {
    const m = src.match(/\bmax:\s*([\d_]+)/);
    assert.ok(m, `${file}: PrismaPg is constructed with no pool \`max\` (pg defaults to 10 per instance)`);
    const max = ms(m[1]);
    assert.ok(
      max >= 1 && max <= 10,
      `${file}: pool max ${max} is outside the 1-10 band the Supavisor client cap allows`
    );
  }
});

test("a connection checkout gives up instead of queueing forever", () => {
  for (const { file, src } of sites) {
    const m = src.match(/\bconnectionTimeoutMillis:\s*([\d_]+)/);
    assert.ok(m, `${file}: PrismaPg sets no connectionTimeoutMillis: checkouts queue forever under load`);
    const value = ms(m[1]);
    assert.ok(value > 0 && value <= 15000, `${file}: connectionTimeoutMillis ${value} is not a fast, honest failure`);
  }
});

test("a single query cannot hang a request forever", () => {
  // query_timeout is CLIENT-side and is the only one of pg's timeout knobs
  // that Supavisor actually honours -- statement_timeout travels as a
  // startup parameter and the pooler silently drops it (probed live
  // 2026-08-21 against both :6543 and :5432; SHOW returned Supabase's own
  // 2min and a pg_sleep(3) under statement_timeout=1000 ran to completion).
  for (const { file, src } of sites) {
    const m = src.match(/\bquery_timeout:\s*([\d_]+)/);
    assert.ok(m, `${file}: PrismaPg sets no query_timeout: one stuck query hangs the request`);
    const value = ms(m[1]);
    assert.ok(value > 0 && value <= 60000, `${file}: query_timeout ${value} is too loose to bound a page render`);
  }
});

/* The long-lived singleton only. A per-call client that is disconnected in a
 * `finally` has no idle phase for an idle-client error to arrive in. */
test("a pool-level error is not swallowed", () => {
  const singleton = sites.find((s) => s.file === "src/lib/prisma.ts");
  assert.ok(singleton, "src/lib/prisma.ts no longer constructs a PrismaPg");
  assert.ok(
    /onPoolError/.test(singleton.src),
    "no onPoolError handler: idle-client errors vanish into the adapter's debug channel"
  );
});

/* ------------------------------------------------------------------ *
 *  The singleton's own pool (bug audit 3, L5-04 and L5-05).
 *
 *  Under Fluid compute an idle instance is suspended, and timers do not run
 *  while it sleeps, so a connection still open then keeps its Supavisor slot
 *  for the whole sleep and can wake as a socket the pooler already dropped.
 *  prisma.ts therefore builds the pg Pool itself (the object Vercel's
 *  `attachDatabasePool` takes, once the project carries @vercel/functions)
 *  and closes idle clients sooner than pg's 10s default.
 * ------------------------------------------------------------------ */

const singleton = () => sites.find((s) => s.file === "src/lib/prisma.ts")?.src ?? "";

/** The argument list of the call whose `(` is at `open`, parens balanced. */
function callArgs(src, open) {
  for (let i = open, depth = 0; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return src.slice(open + 1, i);
  }
  return "";
}

test("the app builds the pool, and the client ends it when it disconnects", () => {
  const src = singleton();
  const pool = src.match(/\bconst\s+(\w+)\s*=\s*new\s+Pool\s*\(/);
  assert.ok(pool, "prisma.ts no longer builds its own pg Pool; PrismaPg is making one nobody can attach or inspect");
  const open = src.indexOf("new PrismaPg(");
  const args = callArgs(src, open + "new PrismaPg".length);
  assert.match(args, new RegExp(`^\\s*${pool[1]}\\s*,`), "the pool prisma.ts builds is not the one it hands PrismaPg");
  /* Without this the adapter leaves a pool it was handed open on
     $disconnect(), and every dev rebuild after a schema change (CLAUDE.md
     gotcha 8) would leak the old client's connections. */
  assert.match(args, /\bdisposeExternalPool:\s*true\b/, "PrismaPg no longer ends the app's pool on $disconnect()");
});

test("an idle connection closes well inside the platform's suspend", () => {
  const m = singleton().match(/\bidleTimeoutMillis:\s*([\d_]+)/);
  assert.ok(m, "prisma.ts sets no idleTimeoutMillis: pg's 10s default keeps idle clients past an instance's suspend");
  const value = ms(m[1]);
  assert.ok(value >= 1000 && value <= 5000, `idleTimeoutMillis ${value} is outside the 1-5s Vercel's guidance asks for`);
});

test("an interactive transaction waits for a connection exactly as long as a query does", () => {
  const src = singleton();
  const open = src.indexOf("new PrismaClient(");
  assert.ok(open >= 0, "prisma.ts no longer constructs a PrismaClient");
  const wait = callArgs(src, open + "new PrismaClient".length).match(/transactionOptions:\s*\{[^}]*\bmaxWait:\s*([\d_]+)/);
  assert.ok(wait, "PrismaClient takes Prisma's own 2s maxWait, so a $transaction gives up before the pool's checkout would");
  const pool = src.match(/\bconnectionTimeoutMillis:\s*([\d_]+)/);
  assert.equal(ms(wait[1]), ms(pool[1]), "transactionOptions.maxWait and connectionTimeoutMillis disagree: two budgets for one wait");
});

test("the adapter adopts the app's pool rather than building a second one, and ends it on dispose", async () => {
  /* PrismaPg recognises a pool by `instanceof pg.Pool` against ITS copy of
     pg. A second copy in node_modules would make it read our pool as a bag
     of options and quietly build its own, and the settings and the attach
     would land on a pool nothing uses. connect() opens no connection; it
     only wraps the pool. */
  const pool = new pg.Pool({ max: 1 });
  const adapter = await new PrismaPg(pool, { disposeExternalPool: true }).connect();
  assert.equal(adapter.underlyingDriver(), pool, "PrismaPg did not adopt the pool it was handed (two copies of pg?)");
  await adapter.dispose();
  assert.equal(pool.ended, true, "disposing the adapter left the app's pool open");
});

