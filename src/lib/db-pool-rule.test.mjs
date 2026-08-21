import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const src = decomment(readFileSync(resolve(ROOT, "src/lib/prisma.ts"), "utf8"));

test("the pg pool caps connections per instance", () => {
  const m = src.match(/\bmax:\s*(\d+)/);
  assert.ok(m, "PrismaPg is constructed with no pool `max` (pg defaults to 10 per instance)");
  const max = Number(m[1]);
  assert.ok(
    max >= 1 && max <= 10,
    `pool max ${max} is outside the 1-10 band the Supavisor client cap allows`
  );
});

test("a connection checkout gives up instead of queueing forever", () => {
  const m = src.match(/\bconnectionTimeoutMillis:\s*(\d+)/);
  assert.ok(m, "PrismaPg sets no connectionTimeoutMillis: checkouts queue forever under load");
  const ms = Number(m[1]);
  assert.ok(ms > 0 && ms <= 15000, `connectionTimeoutMillis ${ms} is not a fast, honest failure`);
});

test("a single query cannot hang a request forever", () => {
  // query_timeout is CLIENT-side and is the only one of pg's timeout knobs
  // that Supavisor actually honours -- statement_timeout travels as a
  // startup parameter and the pooler silently drops it (probed live
  // 2026-08-21 against both :6543 and :5432; SHOW returned Supabase's own
  // 2min and a pg_sleep(3) under statement_timeout=1000 ran to completion).
  const m = src.match(/\bquery_timeout:\s*(\d+)/);
  assert.ok(m, "PrismaPg sets no query_timeout: one stuck query hangs the request");
  const ms = Number(m[1]);
  assert.ok(ms > 0 && ms <= 60000, `query_timeout ${ms} is too loose to bound a page render`);
});

test("a pool-level error is not swallowed", () => {
  assert.ok(
    /onPoolError/.test(src),
    "no onPoolError handler: idle-client errors vanish into the adapter's debug channel"
  );
});
