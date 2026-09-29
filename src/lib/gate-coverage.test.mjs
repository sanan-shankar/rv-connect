import assert from "node:assert/strict";
import test from "node:test";
import { relative, resolve } from "node:path";
import { ROOT, read, decomment, walk, balancedBody, serverActionFiles } from "./test-kit.mjs";

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

/* Walked off the FILESYSTEM, not asked of git (audit C-189). Shared with
   security-regressions.test.mjs since 2026-09-05; the reasoning is in
   test-kit.mjs, where the one answer to "which files are actions" lives. */
const files = serverActionFiles().sort();

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

/* `loadCommentableEntry` is the third spelling, and it is a visibility check
   rather than an exemption: a Catch-up answer's comments (build phase 9) are
   readable by a member of the group once the Edition is PUBLISHED, which is
   the heart's gate exactly (architecture 8 puts comment and heart in one
   cell). Widening the guard rather than listing the three actions under
   AUTHORISED_OTHERWISE is deliberate -- an exemption would mean a FOURTH
   Catch-up comment action could arrive with no gate at all and still pass. */
const VISIBILITY_GUARD =
  /canViewPost\s*\(|canViewPostOfComment\s*\(|loadCommentableEntry\s*\(/;

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
  "src/app/(main)/admin/reports/actions.ts": {
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
  const files = walk(resolve(ROOT, "src/app/(main)/admin"), {
    match: (name) => name === "page.tsx",
  }).map((full) => relative(ROOT, full));
  assert.ok(files.length >= 10, `found only ${files.length} admin pages; the glob has drifted`);
  for (const file of files) {
    assert.ok(
      /requireAdminPage\s*\(/.test(decomment(read(file))),
      `${file} relies on the layout gate alone, which soft navigation can skip (B-024)`
    );
  }
});

/* ------------------------------------------------------------------ *
 *  Every server-rendered /lab room re-establishes the role, too.
 *
 *  The same rule as the admin pages above, for the same reason, found the
 *  harder way: a hand-crafted RSC request whose router-state tree claims
 *  /lab is already on screen makes the server start rendering at the page,
 *  below lab/layout.tsx, so the layout's check never runs (bug audit 3,
 *  L2-01). Several rooms read real members' rows, one private Catch-up's
 *  answers among them. A "use client" room renders nothing on the server
 *  but its own code, so only server rooms are held to it.
 * ------------------------------------------------------------------ */

test("every server-rendered /lab room checks the role itself", () => {
  const files = walk(resolve(ROOT, "src/app/lab"), {
    match: (name) => name === "page.lab.tsx",
  }).map((full) => relative(ROOT, full));
  assert.ok(files.length >= 40, `found only ${files.length} lab rooms; the glob has drifted`);
  let server = 0;
  for (const file of files) {
    const src = decomment(read(file)).trimStart();
    if (/^["']use client["']/.test(src)) continue;
    server += 1;
    assert.ok(
      /await\s+requireLabAdmin\s*\(/.test(src),
      `${file} renders on the server and relies on the lab layout's gate alone, which a crafted request skips (L2-01)`,
    );
  }
  // Anti-vacuity: 25 server rooms on 2026-09-30. If the "use client" test
  // started matching everything, this would pass over nothing.
  assert.ok(server >= 15, `only ${server} server-rendered lab rooms found; the client test has drifted`);
});
