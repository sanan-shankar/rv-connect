import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { gateVerdict, ALLOWLIST } from "./npm-audit-gate.mjs";

/* ------------------------------------------------------------------ *
 *  Both directions of the CI dependency gate (audit H16), fed crafted
 *  `npm audit --json` shapes — a real npm audit cannot be made to produce a
 *  novel advisory on demand, so this is where the FAIL path is proved.
 * ------------------------------------------------------------------ */

const advisory = (ghsa, severity, title = "crafted advisory") => ({
  source: 1,
  name: "somepkg",
  title,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  range: "<1.0.0",
});

const auditJson = (vias) => ({ vulnerabilities: { somepkg: { severity: "high", via: vias } } });

/* The allowlist path is proved against a CRAFTED allowlist, not the live one.
   These two tests read `Object.keys(ALLOWLIST)[0]` until 2026-09-05, so the
   day the real allowlist emptied they would have asserted on `undefined`
   instead of failing. gateVerdict takes the allowlist as a parameter for
   exactly this. */
const ALLOWED_ID = "GHSA-allw-list-0001";
const CRAFTED = { [ALLOWED_ID]: { reason: "crafted, for this test only", clearsWhen: "never" } };

test("a novel high advisory blocks", () => {
  const v = gateVerdict(auditJson([advisory("GHSA-new1-high-0001", "high")]));
  assert.equal(v.ok, false);
  assert.equal(v.blocking[0][0], "GHSA-new1-high-0001");
});

test("a novel critical advisory blocks", () => {
  const v = gateVerdict(auditJson([advisory("GHSA-new2-crit-0002", "critical")]));
  assert.equal(v.ok, false);
});

test("the allowlisted advisory alone passes, and is reported as allowed", () => {
  const v = gateVerdict(auditJson([advisory(ALLOWED_ID, "high")]), CRAFTED);
  assert.equal(v.ok, true);
  assert.deepEqual(v.allowed, [ALLOWED_ID]);
});

test("an allowlisted advisory does not smuggle a novel one through beside it", () => {
  const v = gateVerdict(
    auditJson([advisory(ALLOWED_ID, "high"), advisory("GHSA-new3-high-0003", "high")]),
    CRAFTED,
  );
  assert.equal(v.ok, false);
  assert.equal(v.blocking.length, 1);
});

test("moderate advisories sit below the gate", () => {
  const v = gateVerdict(auditJson([advisory("GHSA-mod1-mode-0004", "moderate")]));
  assert.equal(v.ok, true);
});

test("transitive string entries are not advisories", () => {
  const v = gateVerdict(auditJson(["deepmerge-ts", "another-pkg"]));
  assert.equal(v.ok, true);
});

test("an empty audit passes", () => {
  assert.equal(gateVerdict({ vulnerabilities: {} }).ok, true);
});

/* The gate used to read a missing report as an empty one, which meant a
   registry it could not reach produced a clean bill of health for
   dependencies it had never looked at. That is the one failure a security
   gate must not have, and `{}` vs absent is the whole distinction. */
test("an audit that never reached the registry does not read as clean", () => {
  const offline = {
    message: "request to https://registry.npmjs.org/... failed, reason: ECONNREFUSED",
    error: { summary: "", detail: "" },
  };
  const v = gateVerdict(offline);
  assert.equal(v.ok, false);
  assert.equal(v.unreachable, true);
  assert.match(v.why, /ECONNREFUSED/);
});

test("garbage in place of an audit report does not read as clean", () => {
  for (const junk of [null, undefined, {}, { vulnerabilities: null }]) {
    const v = gateVerdict(junk);
    assert.equal(v.ok, false, `${JSON.stringify(junk)} passed the gate`);
    assert.equal(v.unreachable, true);
  }
});

test("every allowlist entry carries a reason and an exit condition", () => {
  for (const [id, entry] of Object.entries(ALLOWLIST)) {
    assert.ok(entry.reason?.length > 20, `${id} has no real reason`);
    assert.ok(entry.clearsWhen?.length > 5, `${id} has no exit condition`);
  }
});

/* Bug audit 3, C1-08. The gate decided whether it was being run with
   `import.meta.url === \`file://${argv[1]}\``, which is false for a checkout
   under a folder with a space in its name or reached through a symlink, so
   there it skipped itself, printed nothing and exited 0, and check.mjs read
   that as clean. Run it for real through both at once, with an `npm` on the
   PATH that answers with an empty audit, so no registry is needed. */
test("the gate runs, and says so, from a path with a space reached through a symlink", () => {
  const dir = mkdtempSync(join(tmpdir(), "audit gate "));
  try {
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "bin", "npm"), `#!/bin/sh\necho '{"vulnerabilities":{}}'\n`);
    chmodSync(join(dir, "bin", "npm"), 0o755);
    const link = join(dir, "the gate.mjs");
    symlinkSync(fileURLToPath(new URL("./npm-audit-gate.mjs", import.meta.url)), link);

    const run = spawnSync(process.execPath, [link], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${join(dir, "bin")}${delimiter}${process.env.PATH}` },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /^npm-audit-gate: clean\b/m, "the gate printed no verdict: it did not run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
