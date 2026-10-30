import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";

import { read } from "../../src/lib/test-kit.mjs";
import { GATES, blocks } from "./check.mjs";

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

/* Three more ways the workflow can stop being the gate while every `run:`
   above still reads right (bug audit 3, L9-04): an action that is not a
   `run:` step at all, and a gate step that is allowed to fail or never runs.
   The two actions here install the code and the runtime; anything else that
   can fail the job is a check the laptop does not run. */
const ALLOWED_ACTIONS = [/^actions\/checkout@/, /^actions\/setup-node@/];

test("check.yml uses no action but checkout and setup-node", () => {
  const actions = [...read(WORKFLOW).matchAll(/^\s*-?\s*uses\s*:\s*["']?([^\s"'#]+)/gm)].map((m) => m[1]);
  assert.ok(actions.length >= 2, `found only ${actions.length} actions; the parser has drifted`);
  const strays = actions.filter((a) => !ALLOWED_ACTIONS.some((ok) => ok.test(a)));
  assert.deepEqual(strays, [], "check.yml runs an action `npm run check` does not:\n" + strays.join("\n"));
});

test("nothing in check.yml lets the gate fail quietly or skip itself", () => {
  const yaml = read(WORKFLOW);
  assert.doesNotMatch(yaml, /^\s*-?\s*continue-on-error\s*:/m, "continue-on-error lets a red gate pass the push");
  assert.doesNotMatch(yaml, /^\s*-?\s*if\s*:/m, "an `if:` can switch the gate step, or the whole job, off");
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

/* Called is not the same as gating (L9-04): flip `blocking` to false, or
   make a failure read as a warning, and the scripts above are still called
   while a high advisory or a re-opened finding stops nothing. So the gates
   are asked what they DO with a failure. One gate is non-blocking by
   design, the protocol audit, whose findings a human triages. */
const NON_BLOCKING = ["protocol"];

test("every gate but the protocol audit blocks the push when it fails", () => {
  assert.deepEqual(
    Object.keys(GATES).filter((name) => GATES[name].blocking !== true),
    NON_BLOCKING,
    "a gate stopped blocking: check.yml runs it, and a failure there no longer fails the push"
  );
  assert.equal(
    blocks(GATES.deps, GATES.deps.read({ code: 1, out: "  FAIL     GHSA-xxxx-xxxx-xxxx (high) crafted\n" })),
    true,
    "a new high advisory no longer fails the push"
  );
  assert.equal(
    blocks(GATES.security, GATES.security.read({ code: 1, out: "  74 checked -- 1 open\nFAIL: 1 open finding(s)" })),
    true,
    "a re-opened high finding no longer fails the push"
  );
});

/* The laptop half (owner, 2026-10-28). CI running the gate only means the
   failure is learned by email after the deploy; the pre-push hook runs it
   before the push leaves. A hook that lost its execute bit is skipped by git
   without a word, and one that ignores the gate's exit pushes anyway. */
test("the pre-push hook runs the gate and stops the push on a red run", () => {
  const HOOK = "scripts/dev/git-hooks/pre-push";
  assert.ok(statSync(HOOK).mode & 0o100, `${HOOK} is not executable, so git silently skips it`);
  assert.match(
    read(HOOK),
    /^npm run check --silent && exit 0$[\s\S]*^exit 1$/m,
    `${HOOK} no longer runs \`npm run check\` and refuses the push when it fails`
  );
});
