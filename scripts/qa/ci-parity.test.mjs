import assert from "node:assert/strict";
import test from "node:test";

import { read } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  CI runs nothing that `npm run check` does not.
 *
 *  check.yml used to run `npm run check` and then two more gates of its
 *  own -- the npm advisory gate and the security status board. That made
 *  CI a strict SUPERSET of the local gate, so a tree could be green on
 *  the laptop and red on the push, and it twice was: a browserslist
 *  advisory published overnight (2026-09-02) and an open high finding on
 *  the status board (2026-08-27). Neither was visible before pushing, and
 *  a push to this repo is a deploy, so the first news of it was a failure
 *  email about code that had already shipped.
 *
 *  The gap is not that the gates were wrong. It is that there were two
 *  lists. This pins there being one: everything CI runs is either
 *  installing dependencies or `npm run check`, and check.mjs still calls
 *  the two scripts that moved into it.
 *
 *  Only check.yml. backup/retention/snapshot are scheduled operations,
 *  not gates on a push, and have nothing to do with a clean local run.
 * ------------------------------------------------------------------ */

const WORKFLOW = ".github/workflows/check.yml";

/** Every shell command the workflow runs, `- run:` one-liners and `run: |` blocks alike. */
function runSteps(yaml) {
  const lines = yaml.split("\n");
  const steps = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)-?\s*run:\s*(.*)$/);
    if (!m) continue;
    const [, indent, rest] = m;
    if (rest && rest !== "|" && rest !== ">") {
      steps.push(rest.trim());
      continue;
    }
    // A block scalar: every following line indented past the `run:` key.
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (!line.trim()) continue;
      if (line.search(/\S/) <= indent.length) break;
      steps.push(line.trim());
    }
  }
  return steps;
}

/**
 * The two commands a push gate is allowed to be. `npm ci` installs;
 * `npm run check` IS the gate. Anything else is a check the owner cannot
 * run before pushing, which is the whole bug.
 */
const ALLOWED = new Set(["npm ci", "npm run check"]);

test("check.yml runs the gate and nothing else", () => {
  const steps = runSteps(read(WORKFLOW));
  assert.ok(steps.length >= 2, `found only ${steps.length} run steps; the parser has drifted`);
  const strays = steps.filter((s) => !ALLOWED.has(s));
  assert.deepEqual(
    strays,
    [],
    "check.yml runs something `npm run check` does not, so a green laptop can " +
      "still push a red build. Move it into the GATES list in scripts/qa/check.mjs " +
      "instead:\n" + strays.join("\n")
  );
});

test("check.yml still runs the gate at all", () => {
  assert.ok(
    runSteps(read(WORKFLOW)).includes("npm run check"),
    "check.yml no longer runs `npm run check`; the push gate is off"
  );
});

/* The other direction. The parity above is satisfied just as well by
   deleting both security gates, which would be silent: fewer checks, every
   run green. These name them. */
test("the two gates that moved out of the workflow are still gates", () => {
  const check = read("scripts/qa/check.mjs");
  for (const script of ["scripts/qa/npm-audit-gate.mjs", "scripts/qa/audit-status.mjs"]) {
    assert.ok(
      check.includes(script),
      `${script} ran in CI until it moved into check.mjs, and check.mjs no longer calls it`
    );
  }
});
