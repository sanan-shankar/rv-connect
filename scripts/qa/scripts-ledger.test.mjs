import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { read, ROOT } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  scripts/README.md says what every script here is for. This makes
 *  that true.
 *
 *  The rule is the README's own first paragraph: "If you add one, add a
 *  line. If a line has no owner and answers no live question, delete
 *  both." It was written after this folder reached 63 files, 31 of them
 *  one-off probes from single sessions that nobody ever ran again --
 *  the owner's 30-to-40-thousand-line manual cleanup.
 *
 *  Written down is not enforced. By 2026-08-26 the folder held 50
 *  tracked scripts and the README named 32 of them, and the eighteen
 *  it had lost included every phase probe and the whole `ops/` folder,
 *  which a nightly workflow runs. That is the same failure the rule
 *  exists to stop, arriving quietly.
 *
 *  Two directions, because a ledger can be wrong either way:
 *    - a tracked script with no line: nobody has said what it is for
 *    - a line naming a file that is gone: the ledger describes a folder
 *      that no longer exists, which is how a reader stops trusting it
 *
 *  TRACKED files, not a filesystem walk -- the opposite of what
 *  gate-coverage.test.mjs does for admin pages, and deliberately. An
 *  ungated page is a hole the moment it exists; an unlisted script is
 *  only a problem once it is committed for somebody else to find. And
 *  several sessions share this checkout, so a walk would fail the gate
 *  on a peer's work in progress, which is how a gate gets ignored.
 *
 *  No wiring needed: check.mjs walks for `*.test.mjs`, and CI runs
 *  `npm run check` on every push.
 * ------------------------------------------------------------------ */

const README = "scripts/README.md";
const SCRIPT_EXT = /\.(mjs|mts|ts)$/;

/** Every tracked file under scripts/ that is a script at all, tests included. */
function allTracked() {
  return execFileSync("git", ["ls-files", "scripts"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter((p) => p && SCRIPT_EXT.test(p));
}

/** The ones the ledger is FOR. A `*.test.mjs` is a gate, not a tool: it needs
 *  no line, though naming one is fine and must not read as a ghost. */
function trackedScripts() {
  return allTracked().filter((p) => !p.endsWith(".test.mjs"));
}

const doc = read(README);

/**
 * Names the README mentions, in both the forms it uses: a bare
 * `run-sql.mjs` inside a folder's table, and a full `scripts/dev/run-sql.mjs`
 * in prose.
 *
 * Paths matter, not just basenames: `run-sql.mjs` existed under BOTH dev/ and
 * demo/ until the demo one was deleted, and a ledger that cannot tell those
 * apart would have counted one line for two scripts.
 */
function mentioned() {
  const paths = new Set();
  const bare = new Set();
  for (const m of doc.matchAll(/(?:scripts\/)?((?:demo|dev|qa|ops)\/[\w.-]+\.(?:mjs|mts|ts))\b/g)) {
    paths.add(`scripts/${m[1]}`);
  }
  for (const m of doc.matchAll(/`([\w.-]+\.(?:mjs|mts|ts))`/g)) bare.add(m[1]);
  return { paths, bare };
}

test("every tracked script has a line in the README", () => {
  const scripts = trackedScripts();
  assert.ok(scripts.length >= 30, `only found ${scripts.length} scripts; the git ls-files broke`);

  const { paths, bare } = mentioned();
  /* A bare name only counts when it can mean one thing. Two scripts sharing a
     basename must each be named by path or neither is really on the ledger. */
  const basenameCount = new Map();
  for (const p of scripts) {
    const b = p.split("/").pop();
    basenameCount.set(b, (basenameCount.get(b) ?? 0) + 1);
  }

  const orphans = scripts.filter((p) => {
    if (paths.has(p)) return false;
    const b = p.split("/").pop();
    return !(basenameCount.get(b) === 1 && bare.has(b));
  });

  assert.deepEqual(
    orphans,
    [],
    `no line in ${README}, so nobody has said what these are for. Write the ` +
      `line or delete the script:\n  ${orphans.join("\n  ")}`
  );
});

test("the README names no script that has been deleted", () => {
  /* Existence, not ledger membership: the README names this test file itself,
     and a test is deliberately outside the inventory above. */
  const scripts = new Set(allTracked());
  const basenames = new Set([...scripts].map((p) => p.split("/").pop()));
  const { paths, bare } = mentioned();

  const ghosts = [
    ...[...paths].filter((p) => !scripts.has(p)),
    ...[...bare].filter((b) => !basenames.has(b)),
  ].sort();

  assert.deepEqual(
    ghosts,
    [],
    `${README} describes scripts that are not in the tree. A ledger that ` +
      `describes a folder which no longer exists is how a reader stops ` +
      `trusting it:\n  ${ghosts.join("\n  ")}`
  );
});
