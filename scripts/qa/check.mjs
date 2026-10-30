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
 *  It is deliberately NOT a commit hook. docs/spec/DESIGN-SYSTEM.md is
 *  explicit that the design rules "nudge, they never break the build",
 *  and eslint.config.mjs sets every one of them to `warn` for exactly
 *  that reason. So this reports, ranks and exits non-zero on the things
 *  that are genuinely broken (types, ESLint ERRORS, stranded lab rooms,
 *  failing tests) and merely COUNTS the things that are matters of degree
 *  (ESLint warnings, the protocol audit).
 *  It does run before every push (scripts/dev/git-hooks/pre-push): a
 *  push is a deploy, and CI runs this same gate on it anyway.
 *
 *  Deliberately does not need the dev server: everything here is static
 *  or in-process, so it runs in seconds from a cold terminal. Anything
 *  needing a browser lives in the screenshot scripts instead.
 * ------------------------------------------------------------------ */

import { spawn } from "node:child_process";
import { readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

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
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    /* The entry's own type, never what a link points at. `statSync` followed
       links, so one dangling link anywhere in the tree crashed the whole gate:
       an album staged for import-album.mjs is a gitignored folder of links
       into the member's originals, and those were moved off the Desktop once
       the photographs were in (2026-10-28). */
    if (entry.isDirectory()) findTests(full, acc);
    else if (entry.name.endsWith(".test.mjs")) acc.push(relative(ROOT, full));
  }
  return acc;
}

/* The floor, and why there is one (audit C-195).
   This discovery is bound to an extension and to two directories, and it fails
   OPEN: a test renamed to `.spec.mjs`, or moved somewhere this does not walk,
   simply stops being run and the gate reports "N/N passing" with a smaller N.
   Nothing about a green run says how many tests it was green about.

   A floor well below the real count, so it never nags on an ordinary day and
   fires the moment a chunk of the suite goes missing. Raise it if it ever
   starts feeling close. Same device gate-coverage.test.mjs uses on its own
   file list, for the same reason. */
const MIN_TEST_FILES = 60;

/** Test-shaped files this discovery would NOT run, which is the other half:
 *  a floor catches a wholesale disappearance, this catches one rename. */
function findUnrunTests(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    // The entry's own type, as in findTests above, so a dangling link is skipped.
    if (entry.isDirectory()) {
      // e2e/ is Playwright's, run by `npm run test:e2e`, and deliberately not
      // here: these gates must not need a browser or a dev server.
      if (entry.name !== "e2e") findUnrunTests(full, acc);
      continue;
    }
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) && !entry.name.endsWith(".test.mjs")) {
      acc.push(relative(ROOT, full));
    }
  }
  return acc;
}

/* ------------------------------------------------------------------ *
 *  The gates. `blocking` means a failure here is a real defect, not a
 *  matter of taste, so the whole run exits 1. Exported, with each
 *  gate's reading of its tool split out as a pure `read`, so the tests
 *  can prove a failure still blocks (check-gates.test.mjs,
 *  ci-parity.test.mjs) without running the tool.
 * ------------------------------------------------------------------ */
export const GATES = {
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
    /* Errors block; warnings only count (bug audit 3, L9-03). The two kinds
       are different things. Every design rule in eslint.config.mjs is `warn`
       on purpose -- they nudge, they never break the build -- and stay that
       way. What arrives at `error` is the framework's correctness set from
       eslint-config-next: rules-of-hooks, jsx-key, jsx-no-undef and some sixty
       more, where a hit is a page that crashes. This gate used to be
       non-blocking whole, so a conditional hook printed FAIL and CI shipped
       it green. */
    blocking: true,
    async run() {
      return GATES.lint.read(await run("npx", ["eslint", "src"]));
    },
    read({ code, out }) {
      const m = out.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
      /* A CRASHED eslint -- a broken config, a plugin that will not load --
         prints no summary line, and so did a clean one: the parse fell through
         to zero problems and this gate said "clean" while lint enforcement was
         simply off (audit C-190). The exit code was captured all along and
         thrown away. Non-zero AND no summary is the crash; non-zero WITH a
         summary is eslint doing its job and reporting errors. A crash blocks:
         an eslint that did not run cannot say there were no errors. */
      if (!m && code !== 0) return { ok: false, detail: "tool crashed", out };
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
      const { code, out } = await run("node", ["scripts/qa/protocol-audit.mjs"]);
      const m = out.match(/(\d+) violation/);
      // Same shape as the lint gate above (C-190): an audit that throws before
      // printing its count is not a clean audit, it is no audit.
      if (!m && code !== 0) return { ok: false, soft: true, detail: "tool crashed", out };
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
      const unrun = findUnrunTests(join(ROOT, "src")).concat(findUnrunTests(join(ROOT, "scripts")));
      const results = await Promise.all(files.map((f) => run("node", [f]).then((r) => ({ f, ...r }))));
      const failed = results.filter((r) => r.code !== 0);

      // A shrunken suite is a failure of this gate, not a smaller number in
      // its own report (C-195).
      const missing = files.length < MIN_TEST_FILES;
      const notes = [
        missing ? `only ${files.length} test files found, floor is ${MIN_TEST_FILES}` : "",
        unrun.length ? `test-shaped files this gate does not run:\n${unrun.join("\n")}` : "",
      ].filter(Boolean);

      return {
        ok: failed.length === 0 && !missing && unrun.length === 0,
        detail:
          `${results.length - failed.length}/${results.length} passing` +
          (missing ? " — BELOW THE FLOOR" : "") +
          (unrun.length ? ` — ${unrun.length} not run` : ""),
        out: [...notes, ...failed.map((r) => `--- ${r.f}\n${r.out}`)].join("\n"),
      };
    },
  },

  /* The two gates below used to live only in .github/workflows/check.yml, as
     steps AFTER `npm run check`. That made CI a strict superset of the gate
     this project calls "the one gate": a tree that was green on the laptop
     could be red on the push, and twice in a fortnight it was -- once on a
     browserslist advisory published overnight, once on the audit status
     board. The failure arrives as an email, minutes after the deploy, which
     is the worst place to learn it. One list of gates, run the same way in
     both places, is the fix; ci-parity.test.mjs keeps them from drifting
     apart again. */

  deps: {
    label: "Dependency advisories",
    blocking: true,
    async run() {
      const { code, out } = await run("node", ["scripts/qa/npm-audit-gate.mjs"]);
      /* Exit 2 is "the audit could not run" -- no registry. On a laptop with
         no network that is a warning, because a gate that cannot be run
         offline is a gate that gets skipped; in CI it is a failure, because
         there is no such excuse and an unchecked audit must not read green. */
      if (code === 2) {
        return {
          ok: false,
          soft: !process.env.CI,
          detail: "could not reach the registry — not checked",
          out,
        };
      }
      const fails = (out.match(/^ {2}FAIL /gm) ?? []).length;
      const allowed = (out.match(/^ {2}allowed /gm) ?? []).length;
      return {
        ok: code === 0,
        detail:
          code === 0
            ? `clean${allowed ? `, ${allowed} allowlisted` : ""}`
            : `${fails} new high/critical advisor${fails === 1 ? "y" : "ies"}`,
        out,
      };
    },
  },

  security: {
    label: "Security audit status",
    blocking: true,
    async run() {
      const { code, out } = await run("node", [
        "scripts/qa/audit-status.mjs",
        "--fail-on-open=critical,high",
      ]);
      const m = out.match(/(\d+) checked --/);
      // Same crash test as lint and protocol: no summary line AND non-zero is
      // the board failing to read itself, not a finding it found.
      if (!m && code !== 0) return { ok: false, detail: "tool crashed", out };
      return {
        ok: code === 0,
        detail: code === 0 ? `${m[1]} tracked, none open at high` : "a high or critical finding is open",
        out,
      };
    },
  },
};

/** A result's row: "pass", "soft" (a warning) or "fail". */
export const stateOf = (result) => (result.ok ? "pass" : result.soft ? "soft" : "fail");

/** Whether a gate's result stops the run (exit 1). */
export const blocks = (gate, result) => stateOf(result) === "fail" && gate.blocking === true;

/* ------------------------------------------------------------------ */
async function main() {
  process.chdir(ROOT);
  const only = process.argv[2]; // optional: run one gate by name
  const names = only ? [only] : Object.keys(GATES);
  if (only && !GATES[only]) {
    console.error(`unknown gate "${only}". known: ${Object.keys(GATES).join(", ")}`);
    process.exit(2);
  }

  console.log("");
  const started = Date.now();
  const results = await Promise.all(
    names.map(async (name) => ({ gate: GATES[name], result: await GATES[name].run() }))
  );

  const MARK = { pass: "  ok  ", soft: " warn ", fail: " FAIL " };
  let blocked = false;

  for (const { gate, result } of results) {
    if (blocks(gate, result)) blocked = true;
    console.log(`${MARK[stateOf(result)]} ${gate.label.padEnd(24)} ${result.detail}`);
  }

  console.log("");
  for (const { gate, result } of results) {
    if (result.ok) continue;
    console.log(`--- ${gate.label} ---`);
    console.log(result.out.split("\n").filter((l) => !l.startsWith("[BABEL]")).slice(0, 40).join("\n").trim());
    console.log("");
  }

  console.log(`${((Date.now() - started) / 1000).toFixed(1)}s`);
  process.exit(blocked ? 1 : 0);
}

/* The gate runs when this file is run, and only then: the tests import it.
   `import.meta.main` answers that on any path (Node 24.2 and up). The
   fallback compares real paths, not `file://${argv[1]}`, which never equals
   the URL of a checkout under a folder with a space in its name or reached
   through a symlink -- the guard that let the dependency gate print nothing
   and read as clean (bug audit 3, C1-08). */
const isEntryPoint =
  import.meta.main ??
  (Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url));
if (isEntryPoint) await main();
