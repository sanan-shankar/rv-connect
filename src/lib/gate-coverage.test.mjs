import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { balancedBody } from "./test-fn-body.mjs";

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

/**
 * Every async function in the file, exported or not. Only the EXPORTED ones
 * are asserted over (they are the network endpoints); this wider list exists
 * so the delegation pass below can see a gate that lives in a private helper.
 * De-exporting such a helper removes an invocable endpoint without removing
 * its check, and the sweep must not punish that.
 */
function allActions(src) {
  const names = [];
  const re = /(?:export\s+)?async\s+function\s+([A-Za-z0-9_]+)/g;
  for (let m; (m = re.exec(src)); ) names.push(m[1]);
  return names;
}

/* fnBody delegates to the shared extractor rather than carrying its own copy
   (audit lib-tests-02): same walk — balance the parameter parens, step over a
   `: Promise<{...}>` return annotation whose braces are NOT the body, then
   balance the body — living in ONE place instead of two that have to be fixed
   twice. The failure modes it defends against are documented at its header.

   The `export` is optional here ON PURPOSE. The delegation pass below has to
   find gates that live in unexported helpers, so this must match a bare
   `async function` too; requiring `export` would silently orphan every
   inherited gate. */
const fnBody = (text, name) =>
  balancedBody(text, new RegExp(String.raw`(?:export\s+)?async\s+function\s+${name}\b`));

/* Walked off the FILESYSTEM, not asked of git.
   This used to be `git grep -l '"use server"'`, which failed open three ways
   at once (audit C-189). It matched the literal DOUBLE-quoted directive, so an
   equally valid `'use server'` file was never listed and the char-class
   defence on the filter below never got the chance to run. It required the
   directive at character zero, so a file opening with its docblock -- the
   likely shape in a codebase as comment-heavy as this one -- was dropped
   whole. And `git grep` only sees TRACKED files, so a new action file was
   invisible to this sweep until somebody staged it, which is precisely the
   moment you would want it to speak up.

   Every one of those produces NO assertion rather than a failing one, so a new
   ungated action simply ships. A walk sees every file; the filter below is the
   one strict place. */
/* Not named `useServerFiles`: ESLint's rules-of-hooks reads a `use` prefix as
   a React hook and refuses it at the top level. */
function serverActionFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "generated") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      serverActionFiles(full, acc);
      continue;
    }
    if (!entry.endsWith(".ts")) continue;
    /* The directive must be the first STATEMENT, not the first line: leading
       comments are stripped before the test. A grep hit inside a comment (two
       lib files explicitly document that they are NOT use-server modules,
       quoting the directive) is not an action file, and this is what tells
       the two apart. */
    const head = readFileSync(full, "utf8").replace(
      /^(?:\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)\s*)*/,
      ""
    );
    if (/^(['"])use server\1/.test(head)) acc.push(relative(ROOT, full));
  }
  return acc;
}

const files = serverActionFiles(resolve(ROOT, "src")).sort();

test("there are server-action files to sweep", () => {
  assert.ok(files.length >= 15, `only found ${files.length}; the git grep broke`);
});

test("no action file exports a shape this sweep cannot see", () => {
  /* `exportedActions` above matches `export async function NAME` and nothing
     else, so `export const doThing = async () => {}` or a re-exported
     `export { doThing }` would be swept up by no assertion at all and ship
     ungated (audit C-189, vector three). Rather than teach the regex every
     export form JavaScript has -- which is the version that quietly falls
     behind -- this pins the ASSUMPTION: an action file exports async functions
     and types, full stop. Every current file already conforms; the day one
     does not, this says so instead of the sweep silently shrinking.

     If a new form is genuinely wanted, the fix is to extend `exportedActions`
     AND this list together, which is exactly the coupling that was missing. */
  const offenders = [];
  for (const file of files) {
    for (const m of read(file).matchAll(/^export\s+.*$/gm)) {
      const line = m[0];
      if (/^export\s+async\s+function\s/.test(line)) continue;
      // Types are erased; they carry no callable surface to gate.
      if (/^export\s+(type|interface)\s/.test(line)) continue;
      offenders.push(`${file}: ${line.slice(0, 90)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a use-server file exports something exportedActions() cannot see, so it is " +
      "swept by nothing:\n" + offenders.join("\n")
  );
});

for (const file of files) {
  test(`every exported action in ${file} is gated or deliberately public`, () => {
    const src = decomment(read(file));
    const names = exportedActions(src);
    // Pass 1: functions whose own body carries a gate marker. Built over
    // allActions, not names, so a private helper counts as a gate for pass 2;
    // the assertion below still runs only over the exported ones.
    const gated = new Set(allActions(src).filter((n) => GATE.test(fnBody(src, n) ?? "")));
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
 *  Every action that acts on a post id asks whether the caller may SEE it.
 *
 *  The gate above proves an action knows WHO is calling. This one proves it
 *  asked WHETHER — the second half of audit H3, whose actual bug was five
 *  interaction paths taking a postId and acting on it, each one authenticated
 *  perfectly. post-visibility-rule.test.mjs attacks the rule itself in 311
 *  lines and never once asserts that anybody calls it, so a new interaction
 *  path (a reaction, a share, a report-with-quote) could skip the guard with
 *  every test green — and this codebase demonstrably grows such paths, both
 *  toggleCommentLike and reportPost having been added exactly that way
 *  (bug-report-2 C-194; reportPost was in fact unguarded when this was
 *  written, and printed the author's name of any post into the reporter's
 *  thread).
 *
 *  Candidates are derived: any exported action whose body names a `postId` or
 *  `commentId` at all. An action authorised some OTHER way — by authorship,
 *  by the admin role — is exempt with the reason written down, which is the
 *  reviewed decision; a new action in neither place is the accident.
 * ------------------------------------------------------------------ */

const VISIBILITY_GUARD = /canViewPost\s*\(|canViewPostOfComment\s*\(/;

const AUTHORISED_OTHERWISE = {
  "src/app/(main)/feed/actions.ts": {
    createPost: "creates the row; the only postId it names is the one it just minted",
    publishDraft: "author-only (post.authorId !== session.user.id refuses); a draft has no other viewer",
    deleteDraft: "author-only, same as publishDraft",
    deletePost: "author, site admin or the group's admin; visibility is not the question a delete asks",
    editPost: "author-only",
    adminRemovePost: "admin-only moderation: an admin acts on posts they are not the audience for",
    deleteComment: "comment author or site admin",
    adminRemoveComment: "admin-only moderation, same as adminRemovePost",
  },
  "src/components/profile/admin-actions.ts": {
    adminHidePost: "admin-only moderation (requireAdmin), reached from the admin queue",
  },
};

test("every action that takes a post or comment id checks visibility or says why not", () => {
  let candidates = 0;
  for (const file of files) {
    const src = decomment(read(file));
    for (const name of exportedActions(src)) {
      const body = fnBody(src, name) ?? "";
      if (!/\b(postId|commentId)\b/.test(body)) continue;
      candidates++;
      if (AUTHORISED_OTHERWISE[file]?.[name]) continue;
      assert.ok(
        VISIBILITY_GUARD.test(body),
        `${file} → ${name}() acts on a post id without canViewPost and has no AUTHORISED_OTHERWISE entry`
      );
    }
  }
  assert.ok(candidates >= 15, `only ${candidates} candidate actions; the sweep has stopped finding them`);
});

test("the visibility exemption list names only actions that still exist", () => {
  for (const [file, entries] of Object.entries(AUTHORISED_OTHERWISE)) {
    const names = new Set(exportedActions(decomment(read(file))));
    for (const fn of Object.keys(entries)) {
      assert.ok(names.has(fn), `${file} → ${fn} is exempt from the visibility guard but no longer exported (stale entry)`);
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
  // Walked, not `git ls-files`: a new admin page is untracked until somebody
  // stages it, and that is exactly when this should already be shouting
  // (same reasoning as the use-server walk above, audit C-189).
  const walk = (dir, acc = []) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, acc);
      else if (entry === "page.tsx") acc.push(relative(ROOT, full));
    }
    return acc;
  };
  const files = walk(resolve(ROOT, "src/app/(main)/admin"));
  assert.ok(files.length >= 10, `found only ${files.length} admin pages; the glob has drifted`);
  for (const file of files) {
    assert.ok(
      /requireAdminPage\s*\(/.test(decomment(read(file))),
      `${file} relies on the layout gate alone, which soft navigation can skip (B-024)`
    );
  }
});
