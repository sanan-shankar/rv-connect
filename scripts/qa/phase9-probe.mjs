/**
 * Phase 9 behavioural probe: the CI security gate actually gates
 * (audit H16, H17). A gate is only proved by watching it CLOSE, so both
 * mechanisms are driven in both directions:
 *
 *  - npm-audit-gate: exits 0 against the real tree (the one accepted
 *    advisory allowlisted), and its unit test feeds it a crafted novel
 *    advisory to prove the exit-1 direction;
 *  - audit-status --fail-on-open: exits 0 against the real tree, and exits 1
 *    the moment a high finding regresses — proved by moving check.yml aside
 *    (which re-opens H16 for real) and watching the gate refuse;
 *  - the three H17 test suites run and pass, and the workflow runs all of it.
 *
 * Usage: node scripts/qa/phase9-probe.mjs   (no dev server needed)
 */
import { execSync } from "node:child_process";
import { renameSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeLedger } from "./_probe-kit.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
const L = makeLedger();

const run = (cmd) => {
  try {
    const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
};

console.log("\n-- H16: the npm-audit gate, both directions");
{
  const live = run("node scripts/qa/npm-audit-gate.mjs");
  L.check("the gate passes the real tree", live.code === 0, live.out.trim());
  /* Until 2026-09-05 this asserted the gate named GHSA-ggr8-5vv4-36mx out
     loud. The deepmerge-ts override had already fixed that advisory, so the
     gate stopped naming it and this check had been failing for weeks, in a
     probe nothing runs automatically. What still has to be true is that the
     gate says WHICH clean it means rather than one word for both. */
  L.check(
    "  ...and says whether anything is allowlisted",
    /nothing allowlisted|allowlisted with a reason/.test(live.out),
    live.out.trim(),
  );
  const unit = run("node scripts/qa/npm-audit-gate.test.mjs");
  L.check("the unit test proves a crafted novel advisory is refused", unit.code === 0, unit.out.slice(-200));
}

console.log("\n-- H16: audit-status --fail-on-open, both directions");
{
  const green = run("node scripts/qa/audit-status.mjs --fail-on-open=critical,high");
  L.check("nothing open at critical/high: exit 0", green.code === 0);

  // The fail direction, driven by a REAL regression: check.yml moved aside
  // re-opens H16 itself (its probe reads that file), and the gate must
  // refuse. Restored in finally; the file is committed, so even a crash
  // here loses nothing.
  const yml = ".github/workflows/check.yml";
  const aside = ".github/workflows/check.yml.probe9-aside";
  renameSync(yml, aside);
  try {
    const red = run("node scripts/qa/audit-status.mjs --fail-on-open=critical,high");
    L.check("a re-opened high finding turns the gate red (exit 1)", red.code === 1);
    L.check("  ...naming the finding", /H16/.test(red.out));
  } finally {
    renameSync(aside, yml);
  }
  L.check("check.yml restored", existsSync(yml));
}

console.log("\n-- H17: the security test suites themselves");
{
  for (const t of [
    "src/lib/security-regressions.test.mjs",
    "src/lib/gate-coverage.test.mjs",
    "src/lib/rich-text.test.mjs",
  ]) {
    const r = run(`node ${t}`);
    L.check(`${t} passes`, r.code === 0);
  }
}

console.log("\n-- the workflow wires all of it");
{
  const w = readFileSync(".github/workflows/check.yml", "utf8");
  L.check("check.yml runs npm run check (which runs every *.test.mjs)", /npm run check/.test(w));
  /* The two security gates are asserted against check.mjs, not check.yml.
     They were extra CI-only steps in the workflow until the day a green local
     run could still fail the push; ci-parity.test.mjs now forbids the
     workflow from running anything `npm run check` does not. These two lines
     kept reading check.yml and had been failing ever since. */
  const c = readFileSync("scripts/qa/check.mjs", "utf8");
  L.check("npm run check runs the npm-audit gate", /npm-audit-gate\.mjs/.test(c));
  L.check("npm run check fails on a re-opened critical/high", /--fail-on-open=critical,high/.test(c));
}

L.finish();
