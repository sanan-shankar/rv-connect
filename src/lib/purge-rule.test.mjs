import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";
import { DRAIN_PARALLEL, DRAIN_REMOVE_TIMEOUT_MS, PURGE_ATTEMPTS, drainQueue, retryWriteConflicts } from "./purge-rule.ts";

/* ------------------------------------------------------------------ *
 *  The purge has to be honest about what it removed.
 *
 *  Three things used to conspire (bug audit B-011, B-012, B-013):
 *  `delImageByKey`'s catch block was empty, so an R2 failure produced no
 *  signal at all; the purge counted `deleted += 1` per ATTEMPT, so the
 *  audit line reported objects that were still live; and the URL list only
 *  ever existed in a local array, so a failure mid-loop lost the keys
 *  forever -- the rows that named them had already cascaded away.
 *
 *  Static-shape assertions, in the security-regressions.test.mjs style:
 *  the behaviour needs a database and an R2 outage to exercise, but the
 *  shapes that made it possible can be pinned closed on every check.
 * ------------------------------------------------------------------ */

test("a refused R2 delete is reported, not swallowed", () => {
  const src = decomment(read("src/lib/storage.ts"));
  const fn = src.slice(src.indexOf("export async function delImageByKey"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 2);
  assert.ok(
    /catch\s*\(/.test(body),
    "delImageByKey catches without binding the error again — it cannot log what failed"
  );
  assert.ok(/console\.error/.test(body), "delImageByKey no longer logs a failed delete");
  assert.ok(
    /Promise<boolean>/.test(body),
    "delImageByKey no longer tells its caller whether the object is gone"
  );
});

test("the purge's audit lines claim nothing it has not done (B-013, T7a-05)", () => {
  /* B-013: the purge counted `deleted += 1` per attempt, and the audit line
     quoting it called live objects removed. Since T7a-05 and L11-07 (bug audit
     3) the purge deletes no bytes at all: it queues them with the delete and
     returns that list, its callers write their line from it, saying queued,
     and only then drain, and the drain counts what R2 actually let go of. */
  const src = decomment(read("src/lib/account-purge.ts"));
  const purge = balancedBody(src, "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  assert.doesNotMatch(purge, /delImage\(|drainPendingImagePurges\(/, "the purge deletes bytes before its caller has written the line that records it");
  assert.match(purge, /return \{ ok: true, queued: urls, groupsRehomed \}/, "the purge no longer hands back what it queued");
  for (const file of ["src/lib/retention.ts", "src/app/(main)/admin/people/actions.ts"]) {
    const code = decomment(read(file));
    assert.match(code, /\$\{purged\.queued\.length\} stored image\(s\) queued for deletion/, `${file}'s audit line no longer says what the purge queued`);
    assert.doesNotMatch(code, /stored image\(s\) removed/, `${file}'s audit line calls objects removed that nothing has deleted yet`);
  }
});

test("the image worklist is durable before the rows go", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const txStart = src.indexOf("prisma.$transaction");
  assert.ok(txStart > -1, "purgeUserAccount no longer uses a transaction");
  const tx = src.slice(txStart, src.indexOf("catch", txStart));
  assert.ok(
    tx.indexOf("pendingImagePurge.createMany") > -1,
    "the pending-image worklist is not written inside the delete transaction"
  );
  assert.ok(
    tx.indexOf("pendingImagePurge.createMany") < tx.indexOf("user.delete"),
    "the worklist is written after the delete, which is too late to help"
  );
});

test("what the purge could not delete is retried by the nightly sweep", () => {
  // The whole worklist (no url scope), with what is left of the night's time.
  const src = decomment(read("src/lib/retention.ts"));
  assert.ok(
    /drainPendingImagePurges\(undefined, budget\)/.test(src),
    "the retention sweep no longer drains the pending-image worklist"
  );
});

test("admin-thread screenshots are collected before the thread cascades", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  assert.ok(
    /adminMessage\.findMany/.test(src) && /imageUrl/.test(src),
    "collectImageUrls no longer reads AdminMessage.imageUrl; those screenshots " +
      "become unreachable orphans the moment the thread cascades (B-012)"
  );
});

test("the retention sweep queues a screenshot before ageing its message out", () => {
  /* AdminMessage.imageUrl points at an object in R2, and the sweep was a bare
     deleteMany: the row went, the object stayed, and nothing could ever name
     it again -- the row was the only thing that could (audit C-065). The
     account purge already collects these exact bytes, so this step was the one
     path that leaked them. */
  const src = decomment(read("src/lib/retention.ts"));
  const start = src.indexOf('step("adminMessages"');
  assert.ok(start > -1, "the adminMessages retention step is gone");
  const stepSrc = src.slice(start, src.indexOf('step("reports"', start));

  assert.ok(
    /imageUrl/.test(stepSrc),
    "the adminMessages sweep deletes rows without reading their screenshots"
  );
  const queued = stepSrc.indexOf("pendingImagePurge.createMany");
  const deleted = stepSrc.indexOf("adminMessage.deleteMany");
  assert.ok(queued > -1, "the adminMessages sweep does not queue its screenshots for deletion");
  assert.ok(deleted > -1, "the adminMessages sweep no longer deletes anything");
  assert.ok(
    queued < deleted,
    "the worklist is written after the rows go, which is too late to name them"
  );
  assert.ok(
    /\$transaction/.test(stepSrc),
    "collect and delete are not in one transaction, so a failure between them " +
      "can queue a purge for a message that still exists"
  );
});

/* ------------------------------------------------------------------ *
 *  A cancelled deletion stays cancelled.
 *
 *  The nightly sweep reads its due list once and then purges the rows one at
 *  a time, each in its own transaction, so minutes pass between "due" and
 *  "deleted". Signing in during the grace window IS the cancellation, and
 *  the unconditional delete erased those members anyway -- irreversibly,
 *  after the app had told them it was called off (bug-report-2 C-075).
 *  Reproduced live before the fix: three races, three accounts destroyed
 *  after a committed cancellation; five after it, none.
 *
 *  Shape assertions, because the behaviour needs two concurrent connections.
 * ------------------------------------------------------------------ */

test("the purge's delete is conditional, and losing the condition rolls it back", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const fn = src.slice(src.indexOf("export async function purgeUserAccount"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 2);

  // A plain user.delete cannot express the condition at all, which is exactly
  // how the bug read: correct-looking code with no predicate on it.
  assert.ok(
    !/tx\.user\.delete\s*\(/.test(body),
    "purgeUserAccount deletes unconditionally again: a member who cancelled mid-sweep is erased anyway (C-075)"
  );
  const del = body.slice(body.indexOf("tx.user.deleteMany"));
  assert.ok(del, "purgeUserAccount no longer deletes the user row at all");
  assert.match(
    del.slice(0, del.indexOf("})")),
    /onlyIfRequestedBefore[\s\S]*deletionRequestedAt/,
    "the delete no longer carries the caller's deletionRequestedAt condition"
  );
  assert.match(
    body,
    /removed\.count === 0[\s\S]{0,60}throw/,
    "zero rows deleted no longer aborts the transaction, so the rehoming and the " +
      "image worklist would commit against an account that is still alive"
  );
});

test("the sweep purges by the same cutoff it selected by", () => {
  // Two different cutoffs would be worse than none: the list would say due
  // and the delete would say no, every night, forever.
  const src = decomment(read("src/lib/retention.ts"));
  const listed = /deletionRequestedAt:\s*\{\s*lt:\s*(cutoff\([A-Z_]+\))/.exec(src);
  assert.ok(listed, "the due-list read no longer filters on deletionRequestedAt");
  assert.ok(
    new RegExp(`onlyIfRequestedBefore:\\s*${listed[1].replace(/[()]/g, "\\$&")}`).test(src),
    `the purge call does not pass ${listed[1]}, the cutoff the due list was read with`
  );
});

test("a cancelled purge is a skip, not an error", () => {
  const src = decomment(read("src/lib/retention.ts"));
  const loop = src.slice(src.indexOf("const purged = await purgeUserAccount"));
  const guard = loop.slice(0, loop.indexOf("accountsPurged += 1"));
  const cancelledAt = guard.indexOf("purged.cancelled");
  const errorAt = guard.indexOf("errors.push");
  assert.ok(cancelledAt !== -1, "the sweep no longer recognises a cancelled purge");
  assert.ok(errorAt !== -1, "the sweep no longer records a failed purge");
  assert.ok(
    cancelledAt < errorAt,
    "a cancellation is counted as a sweep error, which fails the nightly job for the right outcome"
  );
});

/* ------------------------------------------------------------------ *
 *  A report outlives the member who filed it (bug audit 3, T7a-01).
 *
 *  The reporter edge was RESTRICT, so the purge and the merge both deleted
 *  every report the member had filed, pending ones included, to let the
 *  account go. The edge is SetNull now (cascade-rule.test.mjs pins it), so
 *  neither door has a reason to delete one, and the owner's Q1 says keep
 *  them: the purge leaves them to the edge, the merge moves them.
 * ------------------------------------------------------------------ */

test("T7a-01: the purge deletes no report a member filed", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  assert.doesNotMatch(
    src,
    /report\.deleteMany/,
    "account-purge.ts deletes reports again: a member who leaves takes their complaints off the desk"
  );
});

test("T7a-01: a merge moves the duplicate's reports, both ways, instead of dropping them", () => {
  const fn = balancedBody(
    decomment(read("src/app/(main)/admin/people/actions.ts")),
    "export async function adminMergeUsers("
  );
  assert.ok(fn, "adminMergeUsers is gone; this pin is reading nothing");
  assert.match(
    fn,
    /report\.updateMany\(\{\s*where:\s*\{\s*reporterId:\s*sourceId\s*\},\s*data:\s*\{\s*reporterId:\s*targetId\s*\}/,
    "the reports the duplicate filed no longer move to the survivor"
  );
  assert.match(
    fn,
    /report\.updateMany\(\{\s*where:\s*\{\s*reportedUserId:\s*sourceId\s*\},\s*data:\s*\{\s*reportedUserId:\s*targetId\s*\}/,
    "the reports filed against the duplicate no longer name the survivor, so they cascade away with it"
  );
  /* A shed is a deleteMany scoped to a collision. A bare one on either column
     is the old wholesale delete come back. */
  assert.doesNotMatch(
    fn,
    /report\.deleteMany\(\{\s*where:\s*\{\s*(?:reporterId|reportedUserId):\s*sourceId\s*\}\s*\}\)/,
    "the merge deletes every report on one side of the duplicate again"
  );
  const delAt = fn.indexOf("user.delete(");
  assert.ok(delAt > -1, "the merge no longer deletes the duplicate");
  assert.ok(
    fn.lastIndexOf("reportedUserId: targetId") < delAt,
    "the reports move after the duplicate is deleted, by which time they have cascaded away"
  );
});

/* ------------------------------------------------------------------ *
 *  A bell never leads to a member who has been erased (bug audit 3,
 *  T7a-04 and C8-09; the owner's Q21).
 *
 *  The member's own bell cascades with them; nobody else's does. The purge
 *  removes posts, photographs and answers by cascade, so no app code ran for
 *  them, and notification-reach.test.mjs's takedown sweep, which looks for
 *  post.delete(, never saw it (L9-08). Other members' bells kept a line of the
 *  erased member's words and opened pages that were gone, for a month.
 * ------------------------------------------------------------------ */

test("T7a-04 / C8-09: the purge clears every bell that leads to the member's things, before the rows go", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const helper = balancedBody(src, "async function clearBellsPointingAtThisMember(");
  assert.ok(helper, "clearBellsPointingAtThisMember is gone; this pin is reading nothing");
  for (const [shape, what] of [
    [/postNotificationLink\(/, "their posts and letters (likes, comments, replies, mentions)"],
    [/adminThreadLink\(/, "their threads with the admins (the admins' 'wrote' and report bells)"],
    [/`\/messages\/\$\{/, "their threads, member side"],
    [/`\/admin\/people\/\$\{userId\}`/, "their person page (the admins' 'asked to be verified')"],
    [/ownProfileLink\(userId\)/, "their profile"],
    [/`\/collection\/\$\{/, "their Collection photographs (tag bells)"],
    [/#entry-\$\{/, "their Catch-up answers (replies under them)"],
  ]) {
    assert.match(helper, shape, `the purge leaves bells aimed at ${what} in other members' lists`);
  }
  assert.match(helper, /notification\.deleteMany\(\{\s*where:\s*\{\s*link:\s*\{\s*in:\s*links\s*\}/, "the links are gathered and nothing is deleted");

  const purge = balancedBody(src, "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  const tx = purge.indexOf("prisma.$transaction(");
  const cleared = purge.indexOf("clearBellsPointingAtThisMember(tx, userId)");
  const deleted = purge.indexOf("tx.user.deleteMany(");
  assert.ok(tx > -1 && cleared > tx, "the bells are cleared outside the purge's transaction");
  assert.ok(deleted > cleared, "the bells are looked for after the rows that name their targets have cascaded away");
});

test("T7a-04 / C8-09: the writers still build the links the purge looks for", () => {
  /* The purge matches exact links. A writer that changes its shape would leave
     its bells behind silently, so each writer is held to the shape the purge
     builds. */
  for (const [file, shape, what] of [
    ["src/lib/photo-tag-notifications.ts", /`\/collection\/\$\{notice\.photoId\}`/, "a tag in a photograph's caption"],
    ["src/lib/catchups-notify.ts", /`\/catchups\/edition\/\$\{ctx\.editionId\}#entry-\$\{ctx\.entryId\}`/, "a comment under a Catch-up answer"],
    ["src/components/auth/verification-actions.ts", /`\/admin\/people\/\$\{session\.user\.id\}`/, "asking to be verified"],
    ["src/lib/roster.ts", /`\/admin\/people\/\$\{userId\}`/, "a name match on the office list"],
    ["src/app/(main)/messages/actions.ts", /adminThreadLink\(/, "a member writing to the admins"],
    ["src/components/posts/report-action.ts", /adminThreadLink\(/, "a report"],
    ["src/lib/mention-notifications.ts", /postNotificationLink\(/, "a mention"],
  ]) {
    assert.match(decomment(read(file)), shape, `${file} no longer builds the link the purge clears for ${what}`);
  }
});

test("C8-09: a merge points the admins' bells about the duplicate at the survivor", () => {
  const fn = balancedBody(
    decomment(read("src/app/(main)/admin/people/actions.ts")),
    "export async function adminMergeUsers("
  );
  assert.ok(fn, "adminMergeUsers is gone; this pin is reading nothing");
  const repointed = fn.search(
    /notification\.updateMany\(\{\s*where:\s*\{\s*link:\s*`\/admin\/people\/\$\{sourceId\}`\s*\},\s*data:\s*\{\s*link:\s*`\/admin\/people\/\$\{targetId\}`/
  );
  assert.ok(repointed > -1, "the admins' 'asked to be verified' bells about a merged duplicate open a 404");
  assert.ok(repointed < fn.indexOf("tx.user.delete("), "the bells are re-pointed after the duplicate is gone");
});

/* ------------------------------------------------------------------ *
 *  A question nobody answered goes with its asker (bug audit 3, C8-08;
 *  the owner's Q21). An answered one stays, unnamed: CatchupPrompt.author
 *  is SetNull, which cascade-rule.test.mjs holds.
 * ------------------------------------------------------------------ */

test("C8-08: the purge deletes the member's questions nobody else answered, and only those", () => {
  const src = decomment(read("src/lib/account-purge.ts"));
  const helper = balancedBody(src, "async function deleteUnansweredPrompts(");
  assert.ok(helper, "deleteUnansweredPrompts is gone; this pin is reading nothing");
  /* Deleting a question deletes every answer under it (CatchupEntry.prompt is
     Cascade), so the filter is the whole safety: any row by anyone else, empty
     or not, keeps the question. */
  assert.match(
    helper,
    /catchupPrompt\.deleteMany\(\{\s*where:\s*\{\s*authorId:\s*userId,\s*entries:\s*\{\s*none:\s*\{\s*authorId:\s*\{\s*not:\s*userId\s*\}\s*\}\s*\}\s*\}/,
    "the purge's question delete can reach a question somebody else answered, and their answer with it"
  );

  const purge = balancedBody(src, "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  const collected = purge.indexOf("collectImageUrls(tx, userId)");
  const bells = purge.indexOf("clearBellsPointingAtThisMember(tx, userId)");
  const prompts = purge.indexOf("deleteUnansweredPrompts(tx, userId)");
  const deleted = purge.indexOf("tx.user.deleteMany(");
  assert.ok(collected > -1 && prompts > collected, "questions go before the bytes of the member's own answers under them are collected");
  assert.ok(bells > -1 && prompts > bells, "the bells under the member's own answers are looked for after those answers are gone");
  assert.ok(deleted > prompts, "the questions are deleted outside the purge, after the member");
});

/* ------------------------------------------------------------------ *
 *  A write that lands mid-purge is a retry, not a failed night (bug
 *  audit 3, L1-04, T7a-09, T7a-10).
 *
 *  The purge runs at REPEATABLE READ (C-076), which refuses a write to any
 *  row somebody changed after its snapshot instead of waiting: a heart on
 *  the member's post, the member signing back in. Proved live on throwaway
 *  accounts before the fix: a committed write on the member's group and the
 *  member's own sign-in each ended the purge as P2034, "Could not delete the
 *  account.", the second instead of counting the member as spared.
 * ------------------------------------------------------------------ */

const conflict = () => Object.assign(new Error("write conflict"), { code: "P2034" });
const noPause = async () => {};

test("L1-04: a write conflict is tried again, and the second try's answer stands", async () => {
  let calls = 0;
  const retried = [];
  const out = await retryWriteConflicts(
    async () => {
      calls += 1;
      if (calls === 1) throw conflict();
      return "purged";
    },
    { attempts: PURGE_ATTEMPTS, pause: noPause, onRetry: (n) => retried.push(n) }
  );
  assert.equal(out, "purged");
  assert.equal(calls, 2);
  assert.deepEqual(retried, [1]);
});

test("L1-04: a conflict on every try gives up after the last one, with the conflict", async () => {
  let calls = 0;
  await assert.rejects(
    retryWriteConflicts(
      async () => {
        calls += 1;
        throw conflict();
      },
      { attempts: PURGE_ATTEMPTS, pause: noPause }
    ),
    (err) => err.code === "P2034"
  );
  assert.equal(calls, PURGE_ATTEMPTS);
});

test("L1-04: anything but a write conflict is thrown at once, the purge's own cancellation included", async () => {
  class Cancelled extends Error {}
  for (const thrown of [new Cancelled(), Object.assign(new Error("timeout"), { code: "P2028" }), new TypeError("bug")]) {
    let calls = 0;
    await assert.rejects(
      retryWriteConflicts(
        async () => {
          calls += 1;
          throw thrown;
        },
        { attempts: PURGE_ATTEMPTS, pause: noPause }
      ),
      (err) => err === thrown
    );
    assert.equal(calls, 1, `${thrown.constructor.name} was tried again`);
  }
});

test("L1-04: the purge's transaction goes through the retry", () => {
  const purge = balancedBody(decomment(read("src/lib/account-purge.ts")), "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  assert.match(
    purge,
    /retryWriteConflicts\(\s*\(\) =>\s*prisma\.\$transaction\(/,
    "the purge's transaction is no longer retried on a write conflict, so a heart on the member's post fails the night"
  );
  assert.match(purge, /attempts:\s*PURGE_ATTEMPTS/, "the purge retries with some other count");
  assert.ok(PURGE_ATTEMPTS >= 2, "one attempt is no retry at all");
});

test("T7a-09: a purge or a merge that fails is reported, and nobody is sent to a server log", () => {
  const purge = balancedBody(decomment(read("src/lib/account-purge.ts")), "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  const catchAt = purge.indexOf("} catch (err) {");
  assert.ok(catchAt > -1, "the purge no longer catches its own failure");
  const reports = purge.slice(catchAt).match(/reportSwallowed\("purge", err/g) ?? [];
  assert.equal(reports.length, 2, `${reports.length} of the purge's 2 failure branches reach Sentry; the rest are a console line`);
  assert.doesNotMatch(purge, /console\.error\(/, "the purge logs a failure to the console alone again");

  const people = decomment(read("src/app/(main)/admin/people/actions.ts"));
  assert.doesNotMatch(people, /server log/i, "an admin is told to check a server log they cannot read");
  const merge = balancedBody(people, "export async function adminMergeUsers(");
  assert.ok(merge, "adminMergeUsers is gone; this pin is reading nothing");
  assert.match(merge, /reportSwallowed\("merge", err/, "a failed merge is a console line again");
  const del = balancedBody(people, "export async function adminDeleteUser(");
  assert.ok(del, "adminDeleteUser is gone; this pin is reading nothing");
  assert.match(del, /if \(!purged\.ok\) return \{ error: purged\.error \}/, "the admin no longer hears what the purge found");
});

test("T7a-10: a member who signs back in while every try collides is spared, not failed", () => {
  const purge = balancedBody(decomment(read("src/lib/account-purge.ts")), "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  const branch = purge.slice(purge.indexOf("if (isSerializationFailure(err)) {"));
  assert.ok(branch.length > 0 && purge.includes("if (isSerializationFailure(err)) {"), "the purge no longer tells a collision from a failure");
  const spared = branch.indexOf("cancelled: true");
  const deferred = branch.indexOf("deferred: true");
  assert.ok(
    /stillDue\(userId, opts\.onlyIfRequestedBefore\)/.test(branch.slice(0, spared)),
    "the sweep calls a collision a failure without asking whether the member signed back in"
  );
  assert.ok(spared > -1 && deferred > spared, "the spared answer comes after the failure it should replace");
});

test("L1-04: the sweep counts a deferred purge apart from a failed one", () => {
  const src = decomment(read("src/lib/retention.ts"));
  const loop = src.slice(src.indexOf("const purged = await purgeUserAccount"));
  const guard = loop.slice(0, loop.indexOf("accountsPurged += 1"));
  const deferredAt = guard.indexOf("purged.deferred");
  const errorAt = guard.indexOf("errors.push");
  assert.ok(deferredAt > -1, "the sweep no longer recognises a purge that collided until tomorrow");
  assert.ok(deferredAt < errorAt, "a collision that settles itself turns the nightly job red");
  assert.match(src, /accountsDeferred,/, "the night's audit line no longer says how many waited for tomorrow");
});

/* ------------------------------------------------------------------ *
 *  The purge holds every group it leaves before it chooses a successor
 *  (bug audit 3, Phase A review 2, after L1-03).
 *
 *  `lockGroup` is what leaving, removal, adding, joining and a merge take
 *  first; the purge chose a Keeper's successor without it, so a nightly purge
 *  of one Keeper and another Keeper leaving in the same instant each read the
 *  other still wearing the hat and left a creator-less Catch-up untended.
 * ------------------------------------------------------------------ */

test("A-review: the purge holds every group the member is in before choosing anybody", () => {
  const fn = balancedBody(decomment(read("src/lib/account-purge.ts")), "async function promoteOrphanedGroups(");
  assert.ok(fn, "promoteOrphanedGroups is gone; this pin is reading nothing");
  const joined = fn.search(/groupMember\.findMany\(\{\s*where:\s*\{\s*userId\s*\}/);
  const sorted = fn.search(/\[\.\.\.new Set\(\[\.\.\.groupIds,\s*\.\.\.joined\.map\(\(m\) => m\.groupId\)\]\)\]\.sort\(\)/);
  const locked = fn.indexOf("await lockGroup(db, groupId)");
  const chosen = fn.indexOf("chooseGroupSuccessor(");
  assert.ok(joined > -1, "the purge holds only the groups the member keeps, not every one they are leaving");
  assert.ok(sorted > joined, "the groups are not held in one order, so two departures can deadlock");
  assert.ok(locked > sorted, "the groups are read but never held");
  assert.ok(chosen > locked, "a successor is chosen before the group is held");
});

/* ------------------------------------------------------------------ *
 *  A reporter is answered when an erasure takes what they reported (bug
 *  audit 3, B3a's write-path review, after T7a-02).
 *
 *  A report on the member's post and a flag against the member both cascade
 *  with the account. The reporter's thread outlives its report and was told
 *  "An admin will read it."; a post deleted on its own writes the closing
 *  line, and the purge, which removes posts by cascade, wrote none.
 * ------------------------------------------------------------------ */

test("B3a-review: the purge answers whoever waits on a report it is about to take", () => {
  const helper = balancedBody(decomment(read("src/lib/admin-threads-server.ts")), "export async function noteReportsOnErasedMember(");
  assert.ok(helper, "noteReportsOnErasedMember is gone; this pin is reading nothing");
  assert.match(helper, /status:\s*"pending"/, "a settled report's reporter is told twice");
  assert.match(helper, /post:\s*\{\s*authorId:\s*userId\s*\}/, "reports on the member's posts are left unanswered");
  assert.match(helper, /reportedUserId:\s*userId/, "flags against the member are left unanswered");
  assert.match(helper, /memberId:\s*\{\s*not:\s*userId\s*\}/, "the member's own threads, which go with them, are written to");
  assert.match(helper, /writeReportNote\(tx, thread,/, "the answer is not the note and bell every other closing line uses");

  const purge = balancedBody(decomment(read("src/lib/account-purge.ts")), "export async function purgeUserAccount(");
  assert.ok(purge, "purgeUserAccount is gone; this pin is reading nothing");
  const tx = purge.indexOf("prisma.$transaction(");
  const noted = purge.indexOf("await noteReportsOnErasedMember(tx, userId)");
  const deleted = purge.indexOf("tx.user.deleteMany(");
  assert.ok(tx > -1 && noted > tx, "the reporters are answered outside the purge's transaction");
  assert.ok(deleted > noted, "the reporters are looked for after the account, and their reports with it, are gone");
});

/* ------------------------------------------------------------------ *
 *  The worklist drains in one sitting (bug audit 3, T7a-21).
 *
 *  The drain took 500 rows and deleted them one at a time, so a member with
 *  a large Collection contribution stayed publicly fetchable for nights after
 *  their account went. It now pages through the whole worklist in rounds of
 *  parallel deletes until a time budget is spent.
 * ------------------------------------------------------------------ */

/** An in-memory worklist with the drain's three doors, counting what it saw. */
function fakeQueue(n, { refuse = () => false, remove } = {}) {
  const base = Date.parse("2026-10-30T00:00:00Z");
  // Five rows to each createdAt, as one createMany writes them.
  let rows = Array.from({ length: n }, (_, i) => ({
    id: `row-${String(i).padStart(5, "0")}`,
    url: `https://img.example/${i}.webp`,
    createdAt: new Date(base + Math.floor(i / 5)),
  }));
  const tried = new Map();
  let inFlight = 0;
  let maxInFlight = 0;
  const after = (row, cursor) =>
    !cursor || row.createdAt > cursor.createdAt || (+row.createdAt === +cursor.createdAt && row.id > cursor.id);
  return {
    io: {
      page: async (cursor, limit) => rows.filter((r) => after(r, cursor)).slice(0, limit),
      remove:
        remove ??
        (async (url) => {
          tried.set(url, (tried.get(url) ?? 0) + 1);
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((r) => setImmediate(r));
          inFlight -= 1;
          return !refuse(url);
        }),
      settle: async (gone) => {
        const ids = new Set(gone.map((r) => r.id));
        rows = rows.filter((r) => !ids.has(r.id));
      },
    },
    left: () => rows.length,
    tried,
    maxInFlight: () => maxInFlight,
  };
}

test("T7a-21: a 1,200-object archive drains in one call, 25 at a time", async () => {
  const q = fakeQueue(1200);
  const out = await drainQueue(q.io, { deadline: Date.now() + 60_000 });
  assert.deepEqual(out, { deleted: 1200, failed: 0, finished: true });
  assert.equal(q.left(), 0, "rows were left on the worklist");
  assert.equal(q.tried.size, 1200);
  assert.ok([...q.tried.values()].every((n) => n === 1), "an object was deleted twice in one pass");
  assert.equal(q.maxInFlight(), DRAIN_PARALLEL, "the deletes are not running in parallel rounds");
});

test("T7a-21: a refused object is counted, kept, and not tried again in the same pass", async () => {
  const q = fakeQueue(300, { refuse: (url) => /\/(7|150|299)\.webp$/.test(url) });
  const out = await drainQueue(q.io, { deadline: Date.now() + 60_000 });
  assert.deepEqual(out, { deleted: 297, failed: 3, finished: true });
  assert.equal(q.left(), 3, "a refused object's row went, and with it the only record of the bytes");
  assert.ok([...q.tried.values()].every((n) => n === 1), "a refused object was retried in a loop");
});

test("T7a-21: the deadline stops it between rounds, and says it did not finish", async () => {
  const q = fakeQueue(500);
  let clock = 0;
  const out = await drainQueue(q.io, {
    deadline: 3,
    // Each round reads the clock once before it starts; the fourth finds it spent.
    now: () => clock++,
  });
  assert.equal(out.finished, false);
  assert.equal(out.deleted, 2 * DRAIN_PARALLEL, `${out.deleted} deleted: a round started after the deadline`);
  assert.equal(q.left(), 500 - out.deleted, "a finished round was not settled");
});

test("T7a-21: a delete that throws or never answers is a refusal, not a stalled drain", async () => {
  let n = 0;
  const q = fakeQueue(4, {
    remove: async () => {
      n += 1;
      if (n === 1) throw new Error("socket hang up");
      if (n === 2) return new Promise(() => {});
      return true;
    },
  });
  const out = await drainQueue(q.io, { deadline: Date.now() + 60_000, removeTimeoutMs: 25 });
  assert.deepEqual(out, { deleted: 2, failed: 2, finished: true });
});

test("T7a-21: the app's drain is the budgeted loop, not a fixed slice", () => {
  const fn = balancedBody(decomment(read("src/lib/account-purge.ts")), "export async function drainPendingImagePurges(");
  assert.ok(fn, "drainPendingImagePurges is gone; this pin is reading nothing");
  assert.match(fn, /return drainQueue\(/, "the drain no longer goes through the budgeted parallel loop");
  assert.match(fn, /deadline: Date\.now\(\) \+ budgetMs/, "the drain has no time budget, so a large archive is either cut short or unbounded");
  assert.doesNotMatch(fn, /for \(const row of rows\)/, "the drain deletes one row at a time again");
});

/* ------------------------------------------------------------------ *
 *  An erasure is on the record before its bytes are touched, and the
 *  sweep keeps time (bug audit 3, T7a-05 and L11-07).
 *
 *  The admin's delete wrote its line after an in-request drain of up to 500
 *  serial deletes, and the sweep's ten-purge cap was sized for the purges'
 *  transactions and not the deletes each made inline, while GitHub's timeout
 *  equalled the function's: a cut-off request or night erased the account
 *  and lost the line that said so, and the job died before showing why.
 * ------------------------------------------------------------------ */

test("T7a-05: an admin's delete writes its audit line before it drains, and a failed drain does not undo the answer", () => {
  const del = balancedBody(decomment(read("src/app/(main)/admin/people/actions.ts")), "export async function adminDeleteUser(");
  assert.ok(del, "adminDeleteUser is gone; this pin is reading nothing");
  const purged = del.indexOf("await purgeUserAccount(userId)");
  const audited = del.indexOf('action: "admin.delete"');
  const drained = del.indexOf("await drainPendingImagePurges(purged.queued)");
  assert.ok(purged > -1 && audited > purged, "the audit line is written before the purge, or not at all");
  assert.ok(drained > audited, "the bytes are deleted before the deletion is on the record");
  assert.match(del.slice(drained - 40, drained + 200), /try \{[\s\S]*\} catch \(err\) \{\s*reportSwallowed\(/, "a failed drain turns a finished delete into an error for the admin");
});

test("L11-07: the sweep stops starting purges when its time is spent, and drains once, after them", () => {
  const src = decomment(read("src/lib/retention.ts"));
  const loop = src.slice(src.indexOf("for (const [i, row] of rows.entries())"));
  assert.ok(loop.length > 0 && src.includes("for (const [i, row] of rows.entries())"), "the purge loop moved; this pin is reading nothing");
  const timed = loop.search(/if \(Date\.now\(\) - startedAt >= LAST_PURGE_STARTS_MS\) \{\s*accountsDeferred \+= rows\.length - i;\s*break;/);
  assert.ok(timed > -1 && timed < loop.indexOf("await purgeUserAccount("), "a purge starts whatever the hour, so a heavy night is cut off mid-purge");
  assert.doesNotMatch(src, /take:\s*PURGE_BATCH/, "the purge step is capped by a count sized for its transactions again");
  const budget = Number(/const SWEEP_BUDGET_MS = ([\d_]+);/.exec(src)?.[1].replaceAll("_", ""));
  const lastStart = Number(/const LAST_PURGE_STARTS_MS = ([\d_]+);/.exec(src)?.[1].replaceAll("_", ""));
  assert.ok(budget > 0 && lastStart > 0 && lastStart < budget, "the sweep's two times are missing, or the last purge may start after the budget ends");

  /* The arithmetic between the three clocks: the sweep finishes inside the
     route's ceiling with a drain round's answer to spare, curl waits past that
     ceiling for Vercel's own answer, and GitHub waits past curl. */
  const route = decomment(read("src/app/api/retention/sweep/route.ts"));
  const ceiling = Number(/export const maxDuration = (\d+);/.exec(route)?.[1]) * 1000;
  const workflow = read(".github/workflows/retention.yml");
  const curl = Number(/--max-time (\d+)/.exec(workflow)?.[1]) * 1000;
  const job = Number(/timeout-minutes: (\d+)/.exec(workflow)?.[1]) * 60_000;
  assert.ok(ceiling > 0 && curl > 0 && job > 0, "a clock is missing from the route or the workflow");
  assert.ok(budget + DRAIN_REMOVE_TIMEOUT_MS < ceiling, `the sweep plans ${budget + DRAIN_REMOVE_TIMEOUT_MS} ms against a ${ceiling} ms ceiling`);
  assert.ok(curl > ceiling, "curl gives up before the route's own answer can arrive");
  assert.ok(job > curl, "GitHub cancels the job before curl can print why the night failed");
});
