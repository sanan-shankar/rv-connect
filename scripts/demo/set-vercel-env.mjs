#!/usr/bin/env node
/**
 * Push the demo environment into the rv-alumni-demo Vercel project.
 *
 *   node scripts/demo/set-vercel-env.mjs
 *
 * Values are piped to `vercel env add` on stdin, never passed as argv: a
 * database password in an argument lands in the shell history and is visible
 * in the process list to every other user on the machine.
 *
 * Deliberately sets ONLY five variables. The demo has no use for ADMIN_EMAIL,
 * R2_*, RAZORPAY_* or RESEND_API_KEY, and a secret that is not in the
 * environment is a secret that cannot leak from it. src/lib/storage.ts already
 * degrades to the local filesystem when the R2 vars are absent, so nothing
 * breaks by leaving them out.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

// The CLI in this version has no --project flag, and this directory is
// repo-linked to the REAL project (.vercel/repo.json), so an unscoped
// `vercel env add` would write production's environment. VERCEL_PROJECT_ID /
// VERCEL_ORG_ID are the documented way to scope a command explicitly, and
// they bypass linking entirely so the existing link is never disturbed.
const PROJECT_ID = "prj_AUNvjfmHLNnM15w5GFe3KP5SXugq"; // rv-alumni-demo
const ORG_ID = "team_i1LX00JFm5simazVASgoe8xT";
const SCOPED_ENV = { ...process.env, VERCEL_PROJECT_ID: PROJECT_ID, VERCEL_ORG_ID: ORG_ID };

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

const demo = readEnvDemo();
let failures = 0;

const vars = {
  DATABASE_URL: demo.DATABASE_URL,
  DIRECT_URL: demo.DIRECT_URL,
  DEMO_MODE: "1",
  // Auth.js wants a secret present even though demo mode never mints a
  // session (identity is a constant in src/lib/auth.ts). Random per run:
  // nothing verifies anything against it.
  AUTH_SECRET: randomBytes(32).toString("base64url"),
  // Authenticates the nightly reset cron. Vercel sends it as
  // `Authorization: Bearer $CRON_SECRET` on the scheduled GET.
  CRON_SECRET: randomBytes(32).toString("base64url"),
};

for (const [key, value] of Object.entries(vars)) {
  if (!value) {
    console.error(`  ! ${key} has no value, skipping`);
    continue;
  }
  for (const target of ["production", "preview", "development"]) {
    try {
      execFileSync("vercel", ["env", "add", key, target, "--force"], {
        input: value,
        env: SCOPED_ENV,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      const detail = String(e.stderr || e.message)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("Vercel CLI"))
        .pop();
      console.error(`  FAILED ${key} (${target}): ${detail}`);
      failures++;
      continue;
    }
  }
  const shown = key === "DEMO_MODE" ? value : `${value.length} chars, not printed`;
  console.log(`  set ${key.padEnd(13)} ${shown}`);
}

console.log(`\nDeliberately NOT set: ADMIN_EMAIL, R2_*, RAZORPAY_*, RESEND_API_KEY.`);
if (failures > 0) {
  console.error(`\n${failures} assignment(s) failed. The demo will not work until they do.`);
  process.exit(1);
}
