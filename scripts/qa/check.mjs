#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  check.mjs - the one gate. Run: `npm run check`
 *
 *  Every check in this file already existed somewhere in the repo, and
 *  every one of them was switched off in practice, because running five
 *  commands by hand after every change is a discipline nobody keeps. On
 *  2026-08-08 that had let two real design-system violations sit in
 *  PRODUCTION code (a hand-typed cubic-bezier inside the shared Button,
 *  and bg-white in the landing hero) while the rules forbidding both
 *  were written down in three places. Rules nothing enforces are just
 *  prose. This is the enforcement.
 *
 *  It is deliberately NOT a git hook. docs/spec/DESIGN-SYSTEM.md is
 *  explicit that the design rules "nudge, they never break the build",
 *  and eslint.config.mjs sets every one of them to `warn` for exactly
 *  that reason. So this reports, ranks and exits non-zero on the things
 *  that are genuinely broken (types, stranded lab rooms, failing tests)
 *  and merely COUNTS the things that are matters of degree (lint).
 *
 *  Deliberately does not need the dev server: everything here is static
 *  or in-process, so it runs in seconds from a cold terminal. Anything
 *  needing a browser lives in the screenshot scripts instead.
 * ------------------------------------------------------------------ */

import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
process.chdir(ROOT);

const only = process.argv[2]; // optional: run one gate by name

/** Run a command, capture everything, never throw. */
function run(cmd, args) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: ROOT, shell: false });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", (e) => res({ code: 1, out: String(e.message) }));
    p.on("close", (code) => res({ code: code ?? 1, out }));
  });
}

/** Find every *.test.mjs the repo tracks. They are standalone scripts that throw on failure. */
function findTests(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findTests(full, acc);
    else if (entry.endsWith(".test.mjs")) acc.push(relative(ROOT, full));
  }
  return acc;
}

/* ------------------------------------------------------------------ *
 *  The gates. `blocking` means a failure here is a real defect, not a
 *  matter of taste, so the whole run exits 1.
 * ------------------------------------------------------------------ */
const GATES = {
  types: {
    label: "TypeScript",
    blocking: true,
    async run() {
      const { code, out } = await run("npx", ["tsc", "--noEmit"]);
      const errors = (out.match(/error TS/g) ?? []).length;
      return { ok: code === 0, detail: errors ? `${errors} error(s)` : "no errors", out };
    },
  },

  lint: {
    label: "ESLint",
    blocking: false, // by design: see the header, and eslint.config.mjs
    async run() {
      const { out } = await run("npx", ["eslint", "src"]);
      const m = out.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
      const errors = m ? Number(m[2]) : 0;
      const warnings = m ? Number(m[3]) : 0;
      return {
        ok: errors === 0 && warnings === 0,
        soft: errors === 0 && warnings > 0,
        detail: m ? `${errors} error(s), ${warnings} warning(s)` : "clean",
        out,
      };
    },
  },

  protocol: {
    label: "Shape + colour protocol",
    blocking: false, // it reports comment false-positives; a human triages
    async run() {
      const { out } = await run("node", ["scripts/qa/protocol-audit.mjs"]);
      const m = out.match(/(\d+) violation/);
      const n = m ? Number(m[1]) : 0;
      return { ok: n === 0, soft: n > 0, detail: n ? `${n} finding(s)` : "clean", out };
    },
  },

  lab: {
    label: "Lab registry",
    blocking: true, // a stranded room is the exact bug /lab was built to kill
    async run() {
      const { code, out } = await run("node", ["scripts/qa/lab-audit.mjs"]);
      const m = out.match(/(\d+) routes registered/);
      return { ok: code === 0, detail: m ? `${m[1]} routes registered` : "stranded rooms", out };
    },
  },

  tests: {
    label: "Unit tests",
    blocking: true,
    async run() {
      const files = findTests(join(ROOT, "src")).concat(findTests(join(ROOT, "scripts")));
      const results = await Promise.all(files.map((f) => run("node", [f]).then((r) => ({ f, ...r }))));
      const failed = results.filter((r) => r.code !== 0);
      return {
        ok: failed.length === 0,
        detail: `${results.length - failed.length}/${results.length} passing`,
        out: failed.map((r) => `--- ${r.f}\n${r.out}`).join("\n"),
      };
    },
  },
};

/* ------------------------------------------------------------------ */
const names = only ? [only] : Object.keys(GATES);
if (only && !GATES[only]) {
  console.error(`unknown gate "${only}". known: ${Object.keys(GATES).join(", ")}`);
  process.exit(2);
}

console.log("");
const started = Date.now();
const results = await Promise.all(
  names.map(async (name) => ({ name, ...GATES[name], ...(await GATES[name].run()) }))
);

const MARK = { pass: "  ok  ", soft: " warn ", fail: " FAIL " };
let blocked = false;

for (const r of results) {
  const state = r.ok ? "pass" : r.soft ? "soft" : "fail";
  if (state === "fail" && r.blocking) blocked = true;
  console.log(`${MARK[state]} ${r.label.padEnd(24)} ${r.detail}`);
}

console.log("");
for (const r of results) {
  if (r.ok) continue;
  console.log(`--- ${r.label} ---`);
  console.log(r.out.split("\n").filter((l) => !l.startsWith("[BABEL]")).slice(0, 40).join("\n").trim());
  console.log("");
}

console.log(`${((Date.now() - started) / 1000).toFixed(1)}s`);
process.exit(blocked ? 1 : 0);
