#!/usr/bin/env node
/**
 * The CI dependency gate (audit H16): `npm audit` with a documented,
 * per-advisory allowlist instead of a blanket pass/fail.
 *
 * Why not bare `npm audit --audit-level=high`: the owner ACCEPTED one
 * residual advisory (below), and a gate that is red every day trains
 * everyone to ignore it, which is worse than no gate. So this runs the same
 * audit, subtracts only the advisories written down here with a reason, and
 * fails on anything else at high or critical — a NEW advisory still stops
 * the merge.
 *
 * Usage: node scripts/qa/npm-audit-gate.mjs
 * Exit 0 when every high/critical advisory is allowlisted; 1 otherwise.
 */
import { execSync } from "node:child_process";

/**
 * Accepted advisories. Each entry needs the GHSA id, why it is accepted, and
 * what would clear it — an entry with no exit condition is a rug.
 */
export const ALLOWLIST = {
  "GHSA-ggr8-5vv4-36mx": {
    reason:
      "deepmerge-ts stack exhaustion, pulled only via @prisma/config. Build/config-time " +
      "code that never receives attacker-controlled object graphs in this app; the only " +
      "offered fix is a MAJOR downgrade to prisma 6. Accepted by the owner, 2026-08-20 " +
      "(Phase 6 session log).",
    clearsWhen: "prisma ships a 7.x release that bumps deepmerge-ts to >=8",
  },
};

/**
 * The verdict, as a pure function so the both-directions test can feed it
 * crafted audit JSON (a real `npm audit` cannot be made to produce a novel
 * advisory on demand).
 *
 * `auditJson` is `npm audit --json` output: `vulnerabilities` maps package
 * name -> { severity, via: [advisoryObject | "transitiveName", ...] }.
 * Advisory objects carry the GHSA id in their `url`. Transitive entries are
 * plain strings naming another vulnerable package, so the unique advisory
 * set comes only from the objects.
 */
export function gateVerdict(auditJson, allowlist = ALLOWLIST) {
  const advisories = new Map(); // GHSA id -> { severity, title }
  for (const vuln of Object.values(auditJson.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== "object" || !via.url) continue;
      if (via.severity !== "high" && via.severity !== "critical") continue;
      const id = via.url.split("/").pop();
      advisories.set(id, { severity: via.severity, title: via.title ?? "" });
    }
  }
  const blocking = [...advisories.entries()].filter(([id]) => !(id in allowlist));
  const allowed = [...advisories.keys()].filter((id) => id in allowlist);
  return { ok: blocking.length === 0, blocking, allowed };
}

// Runs the gate for real only when invoked as a script, so the test can
// import gateVerdict without triggering an npm audit.
if (import.meta.url === `file://${process.argv[1]}`) {
  let out;
  try {
    out = execSync("npm audit --omit=dev --json", { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch (err) {
    // npm audit exits non-zero when it finds anything; the JSON is still on
    // stdout, which is the whole point of parsing it ourselves.
    out = err.stdout;
    if (!out) {
      console.error("npm-audit-gate: npm audit produced no output:", err.message);
      process.exit(1);
    }
  }
  const verdict = gateVerdict(JSON.parse(out));
  for (const id of verdict.allowed) {
    console.log(`  allowed  ${id} — ${ALLOWLIST[id].reason.split(".")[0]}.`);
  }
  if (!verdict.ok) {
    for (const [id, a] of verdict.blocking) {
      console.error(`  FAIL     ${id} (${a.severity}) ${a.title}`);
    }
    console.error("\nnpm-audit-gate: new high/critical advisories; fix or (with the owner) allowlist with a reason.");
    process.exit(1);
  }
  console.log("npm-audit-gate: clean (every high/critical advisory is allowlisted with a reason)");
}
