import assert from "node:assert/strict";
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
  const [id] = Object.keys(ALLOWLIST);
  const v = gateVerdict(auditJson([advisory(id, "high")]));
  assert.equal(v.ok, true);
  assert.deepEqual(v.allowed, [id]);
});

test("an allowlisted advisory does not smuggle a novel one through beside it", () => {
  const [id] = Object.keys(ALLOWLIST);
  const v = gateVerdict(auditJson([advisory(id, "high"), advisory("GHSA-new3-high-0003", "high")]));
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

test("every allowlist entry carries a reason and an exit condition", () => {
  for (const [id, entry] of Object.entries(ALLOWLIST)) {
    assert.ok(entry.reason?.length > 20, `${id} has no real reason`);
    assert.ok(entry.clearsWhen?.length > 5, `${id} has no exit condition`);
  }
});
