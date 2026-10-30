import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A process that is not production cannot pass for it (bug audit 3,
 *  L11-06).
 *
 *  The laptop, `next start` and a Vercel preview all share production's one
 *  database, and two things followed that were not true. `delImage` called a
 *  photograph "gone" whenever this process had no R2 credentials to delete it
 *  with, so a laptop run of the sweep struck the worklist clean while the
 *  bytes stayed public. And the nightly sweep ran wherever it was called,
 *  erasing accounts early and writing an audit line nobody could tell from
 *  GitHub's: six laptop sweeps in August did.
 * ------------------------------------------------------------------ */

/* storage.ts imports through the `@/` alias, which bare node cannot resolve:
   the same two hooks proxy-rule.test.mjs uses. */
const SRC = pathToFileURL(resolve(ROOT, "src")).href;
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(SRC) && specifier.startsWith("@/")) {
      return next(pathToFileURL(resolve(ROOT, "src", `${specifier.slice(2)}.ts`)).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    const ts = url.startsWith(SRC) && /\.ts(\?|$)/.test(url);
    return next(url, ts ? { ...context, format: "module-typescript" } : context);
  },
});

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"];

/** storage.ts as a process with exactly this R2 environment loads it. `useR2`
 *  is decided once, at import, so each environment is its own instance. */
async function storageWith(env, tag) {
  for (const name of R2_VARS) delete process.env[name];
  Object.assign(process.env, env);
  return import(`${pathToFileURL(resolve(ROOT, "src/lib/storage.ts")).href}?${tag}`);
}

const LIVE = "https://images.rishivalley.space";
const OLD = "https://pub-a656209a5438484f9694738260255a5e.r2.dev";

test("with no R2 credentials, none of our photographs is ever reported deleted", async () => {
  const storage = await storageWith({}, "no-r2");
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  try {
    for (const url of [
      `${LIVE}/uploads/abc/2026/10/x.webp`,
      `${LIVE}/collection/abc/2026/10/y.webp`,
      `${LIVE}/audio/abc/2026/10/z.webm`,
      `${LIVE}/staging/abc/2026/10/w-o.jpg`,
      `${OLD}/avatars/abc/2026/08/v.webp`,
    ]) {
      assert.equal(await storage.delImage(url), false, `${url} was called gone by a process that cannot reach the bucket`);
    }
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 5, "a refusal must say so in the log, not pass in silence");

  // Not ours to delete, here as in production: answered as before, quietly.
  assert.equal(await storage.delImage("https://evil.test/uploads/a/x.webp"), true);
  assert.equal(await storage.delImage(`${LIVE}/link-previews/shared.webp`), true, "a shared preview image is nobody's to delete");
  assert.equal(await storage.delImage(`${LIVE}.evil.test/uploads/a/x.webp`), true);
  assert.equal(await storage.delImage(null), true);
});

test("an R2_PUBLIC_BASE_URL still naming the old host does not hide today's photographs", async () => {
  /* The other way a process misread the store: credentials present, but the
     base variable from before 2026-08-21. Every images.rishivalley.space URL
     read as somebody else's, and its delete was skipped as "not ours". */
  const storage = await storageWith(
    { R2_ACCOUNT_ID: "acct", R2_ACCESS_KEY_ID: "key", R2_SECRET_ACCESS_KEY: "secret", R2_BUCKET: "bucket", R2_PUBLIC_BASE_URL: OLD },
    "stale-base"
  );
  assert.equal(storage.keyForUrl(`${LIVE}/uploads/abc/2026/10/x.webp`), "uploads/abc/2026/10/x.webp");
  assert.equal(storage.keyForUrl(`${OLD}/uploads/abc/2026/10/x.webp`), "uploads/abc/2026/10/x.webp");
  assert.equal(storage.keyForUrl("https://evil.test/uploads/abc/2026/10/x.webp"), null);
  assert.equal(storage.keyForUrl(`${LIVE}/uploads/../../etc/passwd`), null);
});

test("the nightly sweep runs only on the production deployment, unless its server says otherwise", () => {
  const body = balancedBody(decomment(read("src/app/api/retention/sweep/route.ts")), "export async function GET");
  assert.ok(body, "the sweep route's GET is gone");
  const guard = body.search(/if \(process\.env\.VERCEL_ENV !== "production" && process\.env\.SWEEP_IN_DEV !== "1"\) \{/);
  const sweep = body.indexOf("runRetentionSweep(");
  assert.ok(guard > -1, "the sweep no longer refuses a process that is not production");
  assert.ok(sweep > guard, "the refusal must come before the sweep runs");
  assert.match(body.slice(guard, sweep), /status: 403/, "a refused sweep must not answer as one that ran");
  // Behind the cron secret, so a caller without it learns nothing about where it runs.
  assert.ok(body.indexOf("requireCronSecret(") > -1 && body.indexOf("requireCronSecret(") < guard);
});
