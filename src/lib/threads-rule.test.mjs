import assert from "node:assert/strict";
import test from "node:test";

import { deriveSubject, previewOf } from "./admin-threads.ts";
import { DOUBLE_SUBMIT_MS } from "./double-submit.ts";
import { read, decomment, hasLoneSurrogate } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Member <-> admin conversations.
 *
 *  Two themes. One: a flag cleared for something nobody had seen --
 *  the unread mark is the ONLY signal either side gets, so clearing it
 *  wrongly does not degrade the surface, it deletes the message from
 *  everyone's attention. Two: a list capped with nothing on the page
 *  to say so, which is B-200 arriving twice more.
 * ------------------------------------------------------------------ */


const ACTIONS = decomment(read("src/app/(main)/messages/actions.ts"));
const NOTICE = decomment(read("src/app/(main)/notice/[id]/page.tsx"));

/* ---- C-059: a cut never lands inside a character ---------------- */

test("C-059: deriveSubject and previewOf never split a surrogate pair", () => {
  /* Every emoji is a two-code-unit pair and a ZWJ family is several joined
     ones, so a `slice` at an odd offset leaves a lone surrogate -- a U+FFFD
     diamond in a STORED subject and in the line an admin reads. Exercised over
     inputs with no spaces to cut at, which is where the old code fell back to
     a raw slice. */
  const inputs = [
    "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}".repeat(60), // ZWJ family
    "\u{1F1EE}\u{1F1F3}".repeat(80), // flag: two regional indicators
    "\u{1F600}".repeat(200),
    "a\u{1F600}".repeat(90), // odd offsets on purpose
    "नमस्ते\u{1F64F}".repeat(40),
  ];
  for (const input of inputs) {
    for (const [name, out] of [
      ["deriveSubject", deriveSubject(input)],
      ["previewOf", previewOf(input, 70)],
    ]) {
      assert.ok(!hasLoneSurrogate(out), `${name} left a lone surrogate: ${JSON.stringify(out.slice(-8))}`);
    }
  }
});

test("C-059: the cut still honours its width budget", () => {
  /* Counting GRAPHEMES instead of code units would have silently doubled the
     length of an emoji-heavy subject, which is a different bug. The budget is
     code units; only the boundary moved. */
  assert.ok(deriveSubject("\u{1F600}".repeat(200)).length <= 64 + 3, "the subject budget grew");
  assert.ok(previewOf("\u{1F600}".repeat(200), 20).length <= 20 + 3, "the preview budget grew");
  // And ordinary text is untouched.
  assert.equal(previewOf("A short note.", 90), "A short note.");
});

/* ---- C-128: a repeated send is one message ---------------------- */

test("C-128: both member write paths carry a twin-window guard", () => {
  assert.ok(DOUBLE_SUBMIT_MS > 0);
  for (const [fn, marker, acted] of [
    [
      "startThread",
      /messages: \{ some: \{ authorId: session\.user\.id, fromAdmin: false, body \} \}/,
      /if \(twin\) \{[\s\S]{0,120}?return \{ threadId: twin\.id \};/,
    ],
    [
      "replyToThread",
      /const twinReply = await prisma\.adminMessage\.findFirst\(/,
      /if \(twinReply\) return \{ threadId \};/,
    ],
  ]) {
    const from = ACTIONS.indexOf(`export async function ${fn}`);
    assert.ok(from > 0, `${fn} is gone`);
    const next = ACTIONS.indexOf("export async function", from + 10);
    const body = ACTIONS.slice(from, next === -1 ? undefined : next);
    assert.match(body, /DOUBLE_SUBMIT_MS/, `${fn} has no twin window, so a double tap pages the admins twice`);
    assert.match(body, marker, `${fn}'s twin lookup does not match the caller's own identical message`);
    /* And the lookup's ANSWER is acted on. Checking only that the query exists
       passed against a body where the `if` had been deleted and the write went
       ahead anyway -- the guard present, and doing nothing. */
    assert.match(body, acted, `${fn} looks for a twin and then writes regardless`);
  }
});

/* ---- C-053/C-061: a flag is cleared only for what was seen ------ */

test("C-053: closing a thread does not clear the unread mark", () => {
  const from = ACTIONS.indexOf("export async function setThreadStatus");
  const body = ACTIONS.slice(from, ACTIONS.indexOf("export async function", from + 10));
  assert.doesNotMatch(
    body,
    /adminUnread: false/,
    "Sorted still clears the mark, so a reply arriving after the page rendered is buried"
  );
  assert.match(body, /data: \{ status \}/, "setThreadStatus writes something other than the status");
});

test("C-061: every mark-read is scoped to what was rendered", () => {
  /* Three call sites, counted rather than detected: this is the per-file sweep
     trap -- two of the three passing is not the fix. */
  const sites = [
    ["src/app/(main)/messages/actions.ts", /lastMessageAt: \{ lte: seenThrough \}/],
    ["src/app/(main)/messages/[id]/page.tsx", /lastMessageAt: \{ lte: seenThrough \}/],
    ["src/app/(main)/admin/messages/[id]/page.tsx", /markThreadSeenByAdmin\(thread\.id, shown\.at\(-1\)\?\.createdAt\)/],
  ];
  for (const [file, pattern] of sites) {
    assert.match(decomment(read(file)), pattern, `${file} clears an unread flag for a message it never showed`);
  }
  // The member page must derive its bound from the rendered window, not the row.
  const page = decomment(read("src/app/(main)/messages/[id]/page.tsx"));
  assert.match(page, /const seenThrough = shown\.at\(-1\)\?\.createdAt;/);
});

/* ---- C-057: somebody else's actions do not spend your budget ---- */

test("C-057: admin-opened notices are outside the member's new-thread budget", () => {
  const src = decomment(read("src/lib/admin-threads-server.ts"));
  const from = src.indexOf("export async function isThreadRateLimited");
  const body = src.slice(from, src.indexOf("export async function", from + 10));
  assert.match(
    body,
    /kind: \{ not: "notice" \}/,
    "a member whose posts an admin took down in a burst cannot write to say what they think"
  );
  // The rows being excluded really are admin-opened.
  assert.match(
    decomment(read("src/lib/admin-threads-server.ts")),
    /kind: "notice"/,
    "openAdminNoticeThread no longer writes the kind this exclusion names"
  );
});

/* ---- C-058/C-081: no list is cut with nothing saying so --------- */

test("C-058/C-081: every capped thread list carries a count and an escape", () => {
  const lists = [
    ["src/app/(main)/messages/page.tsx", "THREAD_PAGE", "/messages?all=1"],
    ["src/app/(main)/admin/messages/page.tsx", "OPEN_PAGE", "/admin/messages?open=all"],
  ];
  for (const [file, cap, escape] of lists) {
    const src = decomment(read(file));
    assert.match(src, new RegExp(`const ${cap} = \\d+;`), `${file} has no named cap`);
    assert.match(src, new RegExp(`take: ${cap}`), `${file}'s cap is not applied`);
    assert.match(src, /prisma\.adminThread\.count\(/, `${file} shows a cut list with no total`);
    assert.match(src, new RegExp(escape.replace(/[?]/g, "\\?")), `${file} offers no way to the rest`);
    assert.match(src, /Show \{[a-zA-Z]+\} older/, `${file} says nothing about what it is hiding`);
  }
  // The admin open list was the unbounded one; make sure it is not again.
  const admin = decomment(read("src/app/(main)/admin/messages/page.tsx"));
  const openQuery = admin.slice(admin.indexOf('where: { status: { not: "closed" } }'));
  assert.match(openQuery.slice(0, 300), /take: OPEN_PAGE/, "the open queue is unbounded again");
});

/* ---- C-115: two first-opens of one legacy note make one thread --- */

test("the legacy notice resolution is serialised on the notification row", () => {
  /* M46 claimed to have fixed this and had not: a findFirst followed by a
     create is idempotent only if something stops two concurrent readers from
     both seeing nothing, and AdminThread has no unique key for (memberId,
     kind, createdAt). Proved live before the fix -- two simultaneous opens
     left two identical conversations about one note.

     The lock is the notification row, taken FOR UPDATE inside the same
     transaction as the create, so the second request waits and then sees the
     link the first one wrote. */
  assert.ok(NOTICE.length > 400, "the notice page did not read; this test is vacuous");
  assert.ok(/\$transaction\(/.test(NOTICE), "the resolution left its transaction (C-115)");
  const tx = NOTICE.slice(NOTICE.indexOf("$transaction("));
  assert.ok(
    /FOR UPDATE/.test(tx),
    "the notification row is no longer locked, so both readers see no thread again"
  );
  assert.ok(
    tx.indexOf("FOR UPDATE") < tx.indexOf("openAdminNoticeThread"),
    "the create happens before the lock is taken, which is no lock at all"
  );
  assert.ok(
    /db: tx/.test(tx),
    "openAdminNoticeThread is called on the global client, so the create commits " +
      "outside the lock that was taken to serialise it"
  );
  assert.ok(
    /tx\.notification\.update/.test(tx),
    "the link write left the transaction: the thread would commit without the " +
      "record that says which thread it is"
  );
});
