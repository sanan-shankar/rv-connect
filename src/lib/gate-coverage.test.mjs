import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  Gate coverage: every exported server action either checks who is
 *  calling, or is on the written public list with a reason (audit H17).
 *
 *  This is the tripwire for the class of bug the audit kept finding:
 *  H1 (loadDirectoryPage had no auth), H3 (five interaction paths never
 *  re-checked visibility), L4 (three actions skipped the email gate).
 *  Each of those was one forgotten line in one new function. The sweep
 *  makes the forgetting loud: a new exported action with no gate marker
 *  fails `npm run check` until it either gains one or is added to
 *  PUBLIC_BY_DESIGN with its reason written down — at which point it is a
 *  reviewed decision instead of an accident.
 *
 *  A marker proves the SHAPE, not the correctness (a gate whose result is
 *  ignored still matches). Correctness lives in the phase probes; this
 *  catches the action where nobody thought about auth at all.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** The ways this codebase asks "who are you / may you". */
const GATE = /await\s+auth\s*\(|requireVerifiedMember|requireVerifiedEmail|requireAdminActor|requireAdminAction|requireAdmin\s*\(/;

/**
 * Exported actions that are MEANT to answer strangers. Every entry carries
 * the reason it may skip the gate; removing an entry is how you re-gate one.
 */
const PUBLIC_BY_DESIGN = {
  "src/components/auth/actions.ts": {
    registerUser: "signup: its callers do not have accounts yet (guarded by trivia + Turnstile + limits)",
  },
  "src/components/auth/email-actions.ts": {
    requestPasswordReset: "reset request: reached by somebody who cannot sign in; single-use token guards the rest",
    resetPassword: "reset completion: authenticated by the emailed single-use token, not a session",
    checkResetLink: "answers only whether a reset token is still live; the token is the credential",
    confirmEmailToken: "email confirmation: authenticated by the emailed single-use token",
  },
  "src/components/auth/trivia-actions.ts": {
    getTriviaQuestion: "the entry gate itself: asked before any account exists (per-IP limited)",
    checkTrivia: "answering the entry question, same pre-account moment (per-IP limited)",
    hasPassedTrivia: "reads the caller's own signed pass cookie; discloses nothing else",
  },
};

/** Every exported async function name in a source file. */
function exportedActions(src) {
  const names = [];
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)/g;
  for (let m; (m = re.exec(src)); ) names.push(m[1]);
  return names;
}

// fnBody, the audit-status version verbatim: balance the parameter parens,
// skip a `: ReturnType<{...}>` annotation (whose braces are NOT the body —
// the naive indexOf("{") version reported loadDirectoryPage as ungated
// because it landed inside `Promise<{ users: ... }>`), then take the
// balanced body.
function fnBody(text, name) {
  const m = text.match(new RegExp(`export\\s+async\\s+function\\s+${name}\\b`));
  if (!m) return null;
  let i = text.indexOf("(", m.index);
  if (i < 0) return null;
  for (let depth = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") { depth--; if (depth === 0) { i++; break; } }
  }
  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] === ":") {
    let angle = 0;
    for (i++; i < text.length; i++) {
      const c = text[i];
      if (c === "<") angle++;
      else if (c === ">") angle--;
      else if (c === "{" && angle === 0) break;
    }
  }
  i = text.indexOf("{", i);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") { depth--; if (depth === 0) return text.slice(i, j + 1); }
  }
  return text.slice(i);
}

const files = execSync(`git grep -l '"use server"' -- 'src/**/*.ts' || true`, {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  // Only files where "use server" is the module DIRECTIVE. A grep hit inside
  // a comment (two lib files explicitly document that they are NOT use-server
  // modules, quoting the directive) is not an action file.
  .filter((f) => /^\s*(['"])use server\1/.test(read(f)));

test("there are server-action files to sweep", () => {
  assert.ok(files.length >= 15, `only found ${files.length}; the git grep broke`);
});

for (const file of files) {
  test(`every exported action in ${file} is gated or deliberately public`, () => {
    const src = decomment(read(file));
    const names = exportedActions(src);
    // Pass 1: functions whose own body carries a gate marker.
    const gated = new Set(names.filter((n) => GATE.test(fnBody(src, n) ?? "")));
    // Pass 2: thin delegations — a body that calls a gated sibling (the
    // theme actions' one-implementation-two-names pattern) inherits its gate.
    const delegates = (n) =>
      [...gated].some((g) => new RegExp(`\\b${g}\\s*\\(`).test(fnBody(src, n) ?? ""));
    for (const name of names) {
      if (PUBLIC_BY_DESIGN[file]?.[name]) continue;
      assert.ok(
        gated.has(name) || delegates(name),
        `${file} → ${name}() has no gate marker and no PUBLIC_BY_DESIGN entry`
      );
    }
  });
}

test("the public list names only functions that still exist", () => {
  for (const [file, entries] of Object.entries(PUBLIC_BY_DESIGN)) {
    const src = decomment(read(file));
    const names = new Set(exportedActions(src));
    for (const fn of Object.keys(entries)) {
      assert.ok(names.has(fn), `${file} → ${fn} is listed public but no longer exported (stale entry)`);
    }
  }
});

/* ------------------------------------------------------------------ *
 *  Every admin PAGE re-establishes the role, not just the layout.
 *
 *  The layout gate is navigation, not authorisation. In App Router partial
 *  rendering a soft navigation re-renders only the segments the client's
 *  router-state tree marks as changed, so a shared layout is not
 *  re-evaluated on every move -- and eleven of the twelve admin pages were
 *  bare prisma reads of member emails, verification states, login attempts,
 *  audit rows, reports and analytics with no check of their own. An admin
 *  demoted mid-session kept reading all of it until they did a hard reload
 *  (bug audit B-024). Every admin ACTION already re-checks; this is the same
 *  rule for the pages.
 * ------------------------------------------------------------------ */

test("every /admin page checks the role itself", () => {
  const files = execSync('git ls-files "src/app/(main)/admin/**/page.tsx"', {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  assert.ok(files.length >= 10, `found only ${files.length} admin pages; the glob has drifted`);
  for (const file of files) {
    assert.ok(
      /requireAdminPage\s*\(/.test(decomment(read(file))),
      `${file} relies on the layout gate alone, which soft navigation can skip (B-024)`
    );
  }
});
