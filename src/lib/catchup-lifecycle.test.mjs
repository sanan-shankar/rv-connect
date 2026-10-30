import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Regression pins for the Catch-up lifecycle findings (bug audit
 *  B-060/B-061/B-062).
 *
 *  The behaviour of the pure engine is tested properly in
 *  catchups-core.test.mjs -- these are the pins for the parts that only exist
 *  as a call into Prisma, in the security-regressions.test.mjs style:
 *  read the real source and fail the moment the guard goes missing.
 *  Written this way rather than as an integration test because the only
 *  database here is the live production one.
 * ------------------------------------------------------------------ */

test("B-061: the clock stops for a Catch-up that has ended, and only for that", () => {
  const src = decomment(read("src/lib/catchups.ts"));
  // The one gate, inside advanceEdition, which every caller comes through.
  /* With one exception since build phase 14: a sealed time capsule opens on
     its date whatever the Catch-up is doing, and nothing else gets through.
     time-capsule-rule.test.mjs pins why the plan for a sealed Edition has one
     step.

     ENDED, not "not active". Until 2026-10-17 a paused Catch-up froze too;
     there is nothing to hold since Editions stopped running on a rhythm, and a
     legacy `paused` row runs like any other, which is what lets its cleanup
     migration land on either side of the deploy. */
  assert.match(
    src,
    /meta\.catchupStatus === "ended" && edition\.status !== "sealed"\)\s*return;/,
    "advanceEdition no longer refuses to advance an ended Catch-up, or freezes a paused one again"
  );
  /* And the sweep does not even load ended ones. Pinned on the property rather
     than on one nesting of it, so what matters is that the sweep's own query
     still narrows past ended Catch-ups and to the viewer's scope. */
  const sweep = balancedBody(src, "export async function advanceDueCatchups");
  assert.ok(sweep, "advanceDueCatchups is gone; this pin is reading nothing");
  assert.match(
    sweep,
    /status: \{ not: "ended" \}/,
    "advanceDueCatchups no longer skips ended Catch-ups"
  );
  assert.match(
    sweep,
    /\.\.\.scope/,
    "advanceDueCatchups no longer scopes its query to the viewer's own Catch-ups"
  );
  // It opens nothing. An Edition starts because somebody starts it.
  assert.doesNotMatch(sweep, /openEdition|nextOpensAt/, "the sweep is opening Editions on its own again");
});

test("B-061: ending is the one freeze; nothing pauses any more", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.doesNotMatch(src, /export async function (pauseCatchup|resumeCatchup)\b/, "hold is back, with nothing scheduled to hold");
  assert.doesNotMatch(src, /status: "paused"/, "something writes a paused Catch-up again");
  const end = balancedBody(src, "export async function endCatchup");
  assert.ok(end, "endCatchup is gone; this pin is reading nothing");
  assert.match(end, /data: \{ status: "ended" \}/, "end does not end it");
});

test("B-061: every hand-driven write into a live Edition refuses an ended Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  // The clock gate in advanceEdition covers the automatic half only. These
  // write the edition directly, in their own transactions, and each used to
  // check the EDITION's status alone -- which does not change when a Catch-up
  // ends. A tab opened before the end could still publish the Edition and
  // notify the whole group under a page saying it had ended.
  const MUST_REFUSE_WHEN_ENDED = [
    "openAnswering",
    "closeAndPublish",
    "extendDeadline",
    "submitPrompt",
    "submitEntry",
    "startEdition",
    // Idle Editions stay `collecting` after a Catch-up ends, so curating them
    // is a write into an ended Catch-up too (write-path review, 2026-10-17).
    "curatePrompt",
  ];
  for (const name of MUST_REFUSE_WHEN_ENDED) {
    const start = src.indexOf(`export async function ${name}`);
    assert.ok(start > -1, `${name} has been renamed or removed`);
    const rest = src.slice(start);
    const end = rest.indexOf("export async function", 1);
    const body = end === -1 ? rest : rest.slice(0, end);
    // Two spellings, one guarantee. The Keeper controls reach it through
    // `loadKeeperEdition`; the member submissions and Start call
    // `refuseIfEnded` themselves.
    assert.match(
      body,
      /refuseIfEnded\(|loadKeeperEdition\(/,
      `${name} writes into an Edition without refusing an ended Catch-up`
    );
    // Delegating is not enough: `loadKeeperEdition` only runs the check when
    // it is ASKED to (`refuseEnded: true`), so a call without it looks gated
    // and is not. That is the exact hole this test exists to catch.
    if (!/refuseIfEnded\(/.test(body)) {
      assert.match(
        body,
        /refuseEnded: true/,
        `${name} calls loadKeeperEdition without refuseEnded, so nothing refuses an ended Catch-up`
      );
    }
  }

  // And the helper they delegate to must itself do the refusing.
  const helper = balancedBody(src, "async function loadKeeperEdition");
  assert.ok(helper, "loadKeeperEdition has been renamed or removed");
  assert.match(
    helper,
    /refuseIfEnded\(/,
    "loadKeeperEdition no longer refuses an ended Catch-up, so every Keeper control lost its gate at once"
  );

  /* The SCREEN. Answering happens on the home (N77), and the home's Edition
     region tests the CATCH-UP's state before the Edition's: an ended one gets
     nothing and an idle one gets Start, so neither can reach the box or the
     composer.

     Order is the whole of it. Read the other way round, `collecting` or
     `answering` would match first and an ended or idle Catch-up would draw a
     box whose every write is then refused. */
  const home = decomment(read("src/components/catchups/home/catchup-home.tsx"));
  const region = balancedBody(home, "function EditionRegion");
  assert.ok(region, "EditionRegion is gone; this pin is reading nothing");
  const ended = region.indexOf('catchupStatus === "ended"');
  const idle = region.indexOf("if (data.idle)");
  const collecting = region.indexOf('status === "collecting"');
  const answering = region.indexOf('status === "answering"');
  assert.ok(ended > -1 && idle > -1, "the home no longer tests the Catch-up's own state");
  assert.ok(collecting > -1 && answering > -1, "the home no longer draws the box and the composer; this pin is reading nothing");
  assert.ok(
    ended < collecting && idle < collecting && ended < answering && idle < answering,
    "the home offers the box or the composer before it checks for an ended or idle Catch-up"
  );
});

test("an idle Catch-up refuses every write that would start its clock behind everyone's back", () => {
  /* An idle `collecting` row -- a batch's never-started first, or one that
     fizzled -- is waiting for Start, which is the one thing that tells people.
     A question used to start a batch's clock silently; "give everyone longer"
     or "open answering" would now. So the three writes that can reach a
     collecting row all ask first. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  for (const name of ["submitPrompt", "openAnswering", "extendDeadline"]) {
    const body = balancedBody(src, `export async function ${name}`);
    assert.ok(body, `${name} is gone; this pin is reading nothing`);
    assert.match(body, /refuseIfIdle\(edition\)/, `${name} can start an idle Catch-up's clock with nobody told`);
  }
  // Matched on the source rather than through balancedBody, which would stop
  // at the `{ error: string }` in the return type.
  assert.match(
    src,
    /function refuseIfIdle\([^)]*\)[^{]*\{[^}]*\}[^{]*\{[\s\S]{0,200}?isEditionRunning\(/,
    "refuseIfIdle is gone, or no longer asks the one idle test"
  );
});

test("L12-03: an action proves the caller is in the group before it moves the Edition's clock", () => {
  /* `advanceEdition` is a write: it opens answering, publishes and sends the
     day's reminder, each with its bells. The actions used to call it on the
     way IN, before asking whether the caller belonged, so anyone holding an
     Edition or answer id could drive a stranger group's clock (bug audit 3,
     L12-03). Pinned as a property of the file, not of one action: the clock
     is moved in one place, that place is reached from one place, and that
     place has read the membership first. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.equal(
    (src.match(/\badvanceEdition\(/g) ?? []).length,
    1,
    "a second call to advanceEdition appeared in the actions; it must go through advanceAndReload, behind the membership check"
  );
  const advance = balancedBody(src, "async function advanceAndReload(");
  assert.ok(advance, "advanceAndReload is gone; this pin is reading nothing");
  assert.match(advance, /advanceEdition\(/, "advanceAndReload no longer advances; the one call moved somewhere unguarded");
  assert.equal(
    (src.match(/\badvanceAndReload\(/g) ?? []).length,
    2,
    "advanceAndReload has a caller other than loadMemberEdition, which may not have checked membership"
  );
  const member = balancedBody(src, "async function loadMemberEdition(");
  assert.ok(member, "loadMemberEdition is gone; this pin is reading nothing");
  const asked = member.indexOf("loadMembership(");
  const moved = member.indexOf("advanceAndReload(");
  assert.ok(asked > -1 && moved > -1, "loadMemberEdition no longer reads membership, or no longer advances");
  assert.ok(asked < moved, "loadMemberEdition advances the clock before it knows the caller is in the group");
  const base = balancedBody(src, "async function readEditionBase(");
  assert.ok(base, "readEditionBase is gone; this pin is reading nothing");
  assert.doesNotMatch(base, /advanceEdition\(|advanceAndReload\(/, "the plain read moves the clock again");
});

test("V-T2-02: a missing Edition and a closed door get the same sentence", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const member = balancedBody(src, "async function loadMemberEdition(");
  const refusals = [...member.matchAll(/return \{ error: ([^}]+?) \}/g)].map((m) => m[1].trim());
  assert.ok(refusals.length >= 2, "loadMemberEdition's refusals did not extract; this pin is vacuous");
  assert.equal(
    refusals[0],
    refusals[1],
    "\"not found\" and \"not a member\" read differently again, which tells a stranger holding an id whether it exists"
  );

  /* Every other door that resolves a client's id first (finished after the
     write-path reviews of A2 and A3). A Catch-up's own id: the missing row
     and the closed door share the door's sentence. A question, answer or
     comment id: the lookup itself only finds rows in the viewer's Catch-ups,
     so both answer "not found". */
  const catchupDoors = [
    ["async function loadKeeperScope(", /if \(!ctx\) return \{ error: ([^}]+) \};\s*if \(!ctx\.membership\) return \{ error: ([^}]+) \};/],
    ["async function loadOwnCatchupCopy(", /if \(!ctx\) return \{ error: ([^}]+) \};\s*if \(!ctx\.membership\) return \{ error: ([^}]+) \};/],
    ["export async function leaveCatchup(", /if \(!ctx\) return \{ error: ([^}]+) \};\s*if \(!ctx\.membership\) return \{ error: ([^}]+) \};/],
    ["export async function startEdition(", /if \(!ctx\) return \{ error: ([^}]+) \};\s*if \(!ctx\.membership\) return \{ error: ([^}]+) \};/],
    ["export async function setCatchupPicture(", /if \(!catchup\) return \{ error: ([^}]+) \};\s*const membership = await loadMembership\(catchup\.groupId, session\.user\.id\);\s*if \(!membership\) return \{ error: ([^}]+) \};/],
    ["export async function setReminderPref(", /if \(!catchup\) return \{ error: ([^}]+) \};\s*const membership = await loadMembership\(catchup\.groupId, session\.user\.id\);\s*if \(!membership\) return \{ error: ([^}]+) \};/],
  ];
  for (const [head, shape] of catchupDoors) {
    const fn = balancedBody(src, head);
    assert.ok(fn, `${head} is gone; this pin is reading nothing`);
    const m = fn.match(shape);
    assert.ok(m, `${head} no longer refuses a missing Catch-up and a closed door side by side; retarget this pin`);
    assert.equal(m[1].trim(), m[2].trim(), `${head} answers a missing Catch-up differently from a closed door again`);
  }
  assert.doesNotMatch(src, /"Catch-up not found\."/, "a Catch-up's id is answered \"not found\" somewhere, beside a door that says \"not a member\"");
  for (const [head, model] of [
    ["export async function curatePrompt(", "catchupPrompt"],
    ["export async function submitEntry(", "catchupPrompt"],
    ["export async function toggleEntryLove(", "catchupEntry"],
    ["async function loadCommentableEntry(", "catchupEntry"],
    ["export async function toggleEntryCommentLike(", "comment"],
  ]) {
    const fn = balancedBody(src, head);
    assert.ok(fn, `${head} is gone; this pin is reading nothing`);
    assert.match(fn, new RegExp(`prisma\\.${model}\\.findFirst\\(\\{\\s*where: \\{ id: \\w+, (edition|entry): (\\{ edition: )?inViewersCatchup\\(`), `${head} looks its id up outside the viewer's Catch-ups again`);
    assert.doesNotMatch(fn, new RegExp(`prisma\\.${model}\\.findUnique\\(\\{\\s*where: \\{ id: \\w+ \\}`), `${head} has an unscoped lookup by id again`);
  }
});

test("L1-02: a question removed as answering opens cannot leave an Edition with nothing to answer", () => {
  /* The open counted its questions before its swap, and the remove deleted
     after a plain status read, so the two could cross: an answering Edition
     with no questions and everyone told answers were open. Both now meet on
     the Edition's row. The remove touches it on `collecting` and deletes in
     the same transaction; each open swaps first, counts after, and rolls
     back on none. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const curate = balancedBody(src, "export async function curatePrompt(");
  assert.ok(curate, "curatePrompt is gone; this pin is reading nothing");
  const removeAt = curate.indexOf("curateRemoveSchema.safeParse(");
  assert.ok(removeAt > -1, "curatePrompt's remove branch moved; retarget this pin");
  const remove = curate.slice(removeAt);
  const tx = remove.indexOf("prisma.$transaction(");
  const touch = remove.search(/tx\.catchupEdition\.updateMany\(\{\s*where: \{ id: prompt\.editionId, status: "collecting" \}/);
  const del = remove.indexOf("tx.catchupPrompt.deleteMany(");
  assert.ok(tx > -1 && touch > tx && del > touch, "the remove no longer holds a collecting Edition while it deletes, in one transaction");
  assert.doesNotMatch(remove, /prisma\.catchupPrompt\.delete(Many)?\(/, "a delete outside the transaction is back");

  const open = balancedBody(src, "export async function openAnswering(");
  assert.ok(open, "openAnswering is gone; this pin is reading nothing");
  const cas = open.indexOf("tx.catchupEdition.updateMany(");
  const count = open.indexOf("tx.catchupPrompt.count(");
  const undo = open.indexOf("throw new EmptyAfterSwap()");
  assert.ok(cas > -1 && count > cas && undo > count, "openAnswering counts its questions before its swap again, or keeps an empty open");
  assert.match(open, /unlessEmpty\(prisma\.\$transaction\(/, "a rolled-back open is not turned into its refusal");

  const lib = decomment(read("src/lib/catchups.ts"));
  const apply = balancedBody(lib, "async function applyEditionAction(");
  assert.ok(apply, "applyEditionAction is gone; this pin is reading nothing");
  const clockCas = apply.indexOf("tx.catchupEdition.updateMany(");
  const clockCount = apply.search(/if \(action\.to === "answering"\) \{\s*const questions = await tx\.catchupPrompt\.count\(/);
  assert.ok(clockCas > -1 && clockCount > clockCas, "the clock's open no longer counts its questions after its swap");
  assert.match(apply, /throw new EmptyAfterSwap\(\)/, "the clock's empty open is no longer rolled back");
  assert.match(apply, /unlessEmpty\(prisma\.\$transaction\(/, "a rolled-back clock open reads as a lost swap, which the loop cannot tell apart");
});

test("C3-01: a hand close with nobody's answers in it writes nothing, and says so", () => {
  /* The press used to run the clock's zero-answer rule: the deadline went to
     three days from now (up to four days EARLIER in a week's first days), the
     group was rung again, the one safety net was spent, and the presser saw
     nothing, so a second press published an empty Edition to everyone. His
     Q15: refuse it, and offer more time. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const close = balancedBody(src, "export async function closeAndPublish");
  assert.ok(close, "closeAndPublish is gone; this pin is reading nothing");
  assert.doesNotMatch(
    close,
    /shouldExtendForTooFew\(|extendPatch\(|notifyAnswersOpen\(/,
    "a hand close runs the clock's zero-answer extension again"
  );
  // Both ways out, the seal and the publish, swap first and then count the
  // answers inside the same transaction, rolling back on none: counted
  // before the swap, an answer emptied as the press landed still counted
  // (A3 review of C3-01, the L1-02 shape).
  const ways = close.split("unlessEmpty(prisma.$transaction(").slice(1);
  assert.equal(ways.length, 2, "closeAndPublish no longer has its two ways out, each undone when empty; retarget this pin");
  for (const way of ways) {
    const written = way.indexOf("tx.catchupEdition.updateMany(");
    const counted = way.indexOf("tx.catchupEntry.count({ where: { editionId, ...ANSWERED_ENTRY_WHERE } })");
    const undone = way.indexOf("throw new EmptyAfterSwap()");
    assert.ok(written > -1 && counted > -1, "a way out no longer counts answers with something in them, or no longer writes");
    assert.ok(written < counted && counted < undone, "a way out counts before its swap, or does not roll an empty close back");
  }
  assert.match(close, /nobodyAnswered: true as const/, "the refusal no longer carries the marker the surface answers");

  // The clock's too-few rule counts the same thing.
  const lib = decomment(read("src/lib/catchups.ts"));
  const advance = balancedBody(lib, "export async function advanceEdition(");
  assert.ok(advance, "advanceEdition is gone; this pin is reading nothing");
  assert.match(advance, /catchupEntry\.count\(\{\s*where: \{ editionId: edition\.id, \.\.\.ANSWERED_ENTRY_WHERE \}/, "the clock counts empty rows as answers again");

  // And the home's "has anyone answered", which picks the dialog Close and
  // send it out opens (routed follow-up (c); the reminder's half runs in
  // catchup-bells.test.mjs).
  const home = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(home, /catchupEntry\.findMany\(\{\s*where: \{ editionId: freshLatest\.id, \.\.\.ANSWERED_ENTRY_WHERE \}/, "the home counts an emptied answer as somebody having answered again");
});

test("T3-06: an extension swaps on the deadline the caller saw, never on its own read", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.match(
    src,
    /export async function extendDeadline\(editionId: string, days: number, seenCloseAt: string\)/,
    "extendDeadline no longer takes the deadline the caller's page showed"
  );
  const fn = balancedBody(src, "export async function extendDeadline");
  assert.ok(fn, "extendDeadline is gone; this pin is reading nothing");
  assert.match(fn, /planExtension\(edition, parsedDays\.data, seenCloseAt,/, "the caller's deadline no longer decides the extension");
  const where = fn.slice(fn.indexOf("catchupEdition.updateMany("), fn.indexOf("data: plan.patch"));
  assert.match(where, /questionsCloseAt: plan\.deadline/, "the questions window swaps on something other than the page's date");
  assert.match(where, /answersCloseAt: plan\.deadline/, "the answers window swaps on something other than the page's date");
  assert.doesNotMatch(where, /edition\.(questions|answers)CloseAt/, "the swap reads the action's own fresh value again, which always matches");
  assert.match(fn, /closesAt: plan\.closesAt\.toISOString\(\)/, "the new date no longer goes back to the caller");
});

test("C3-01 and T3-06: the settings surface offers more time, and never shows an extension as a setting", () => {
  const surface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));
  // The row opens the offer when the page knows nobody has answered...
  assert.match(
    surface,
    /key: c\.answered \? "close-now" : "nobody-answered"/,
    "Close and send it out opens the publish confirmation over an Edition nobody has answered"
  );
  // ...and a refusal the page did not see coming turns into it, not a toast.
  const confirm = balancedBody(surface, "async function confirm(");
  assert.ok(confirm, "confirm is gone; this pin is reading nothing");
  assert.match(confirm, /if \(nobodyAnswered\(result\)\) \{\s*setDialog\(\{ shape: "confirm", key: "nobody-answered" \}\)/);
  assert.match(confirm, /key === "nobody-answered"[\s\S]{0,80}extend\(3\)/, "the offer no longer gives three days");
  // The extension sends the page's deadline and says the date it got back.
  const extend = balancedBody(surface, "async function extend(");
  assert.ok(extend, "extend is gone; this pin is reading nothing");
  assert.match(extend, /extendDeadline\(c\.editionId!, days, seen\)/, "the extension no longer sends the deadline the page showed");
  assert.match(extend, /toast\.success\(/, "the new date is no longer said");
  // No local "A week more": the line is the deadline, and no extend pill is drawn pressed.
  assert.doesNotMatch(surface, /setExtended|\bextended\b/, "the extension is held as local state again");
  const row = balancedBody(surface, "function SettingRow(");
  assert.match(row, /r\.choose === "reminders" \? at\.reminder : undefined/, "an extend pill can be drawn pressed again");
  const copy = balancedBody(surface, "export function confirmCopy(");
  assert.match(copy, /title: "Nobody has answered yet"/);
});

test("L12-09: a removal changes the invite link, in the same transaction, and only when it removed someone", () => {
  /* The link was minted once and never changed, and every member's page
     carried it, so a removed member could press Join on their old copy and be
     straight back in. His Q16: the removal sticks. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function removeCatchupMember");
  assert.ok(fn, "removeCatchupMember is gone; this pin is reading nothing");
  const at = (needle) => fn.indexOf(needle);
  const order = [
    "prisma.$transaction(",
    "tx.groupMember.deleteMany(",
    "if (gone.count === 0) return",
    "inviteToken: newInviteToken()",
    "tx.catchupPref.deleteMany(",
    "if (removed.count === 0)",
  ];
  for (const needle of order) assert.ok(at(needle) > -1, `removeCatchupMember lost ${needle}`);
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(at(order[i - 1]) < at(order[i]), `${order[i - 1]} no longer comes before ${order[i]}`);
  }
  // Rotated through the transaction, never beside it.
  assert.doesNotMatch(fn, /prisma\.catchup\.update(Many)?\(/, "the link is changed outside the removal's transaction");
});

test("C8-04: every exit takes the leaver's unsent writing in the transaction that takes the membership, then drains", () => {
  /* Leaving, a Keeper's removal and a batch-year correction took the
     membership and nothing else, so what the member had written for an
     Edition still running went out to the group after they had gone, and
     they could no longer withdraw it. His Q21: what nobody has read yet goes
     with the person. dropUnsentWriting itself is driven in
     group-succession.test.mjs. */
  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  const batch = decomment(read("src/lib/batch-catchups.ts"));
  for (const [name, body, who] of [
    ["removeCatchupMember", balancedBody(actions, "export async function removeCatchupMember"), "userId"],
    ["leaveCatchup", balancedBody(actions, "export async function leaveCatchup"), "viewerId"],
    ["syncBatchGroup", balancedBody(batch, "export async function syncBatchGroup("), "userId"],
  ]) {
    assert.ok(body, `${name} is gone; this pin is reading nothing`);
    const tx = body.indexOf("prisma.$transaction(");
    const membership = body.indexOf("tx.groupMember.deleteMany(");
    const drop = body.indexOf(`dropUnsentWriting(tx, catchupId, ${who})`);
    const drain = body.indexOf("drainPendingImagePurges(");
    assert.ok(tx > -1 && membership > tx, `${name} no longer takes the membership inside a transaction`);
    assert.ok(drop > membership, `${name} no longer takes the unsent writing in the transaction that takes the membership`);
    assert.ok(drain > drop, `${name} no longer drains what it queued once it has committed`);
  }
});

test("C8-04: Leave says what goes with you, and only when an Edition is running", () => {
  /* Its line said "What you wrote stays" whatever was running; leaving now
     takes what you wrote for an Edition nobody has read yet. */
  const surface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));
  const copy = balancedBody(surface, "export function confirmCopy(");
  const leave = copy.slice(copy.indexOf('case "leave"'), copy.indexOf('case "put-away"'));
  assert.match(leave, /running\s*\?\s*"[^"]*anything you wrote for this one goes with you[^"]*"\s*:\s*"[^"]*What you wrote stays[^"]*"/, "Leave no longer says what goes with you while an Edition runs");
  assert.match(surface, /const running = !c\.ended && \(c\.state === "collecting" \|\| c\.state === "answering"\);\s*const copy = confirmCopy\(open\.key, c\.name, c\.people, c\.autoExtended, running\)/, "the dialog no longer tells the copy whether an Edition is running");
});

test("C8-04: a save already past the door cannot write an answer back in after its author is taken out", () => {
  /* Membership is checked before submitEntry's transaction. The exit deletes
     the unsent answers while holding the Edition, so the save holds it too
     (FOR SHARE) and asks again, inside, before it writes. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function submitEntry(");
  assert.ok(fn, "submitEntry is gone; this pin is reading nothing");
  const hold = fn.indexOf("FOR SHARE");
  const asked = fn.search(/tx\.groupMember\.count\(\{\s*where: \{ groupId: edition\.catchup\.group\.id, userId: session\.user\.id \}/);
  const write = fn.indexOf("catchupEntry.upsert(");
  assert.ok(hold > -1 && asked > hold && write > asked, "the save no longer re-checks membership, holding the Edition, before it writes");
  assert.match(fn, /if \(stillIn === 0\) return "gone"/);
  assert.match(fn, /if \(entry === "gone"\) return \{ error: NOT_IN_EDITION, final: true as const \}/, "a save refused for that says nothing, or invites a retry");
});

test("A3 review of L12-09 and T3-17: a join reads the link again, and counts the roster, while the roster is held", () => {
  /* The token was read, then the membership written later, so a removed
     member whose join read the old link a moment before the removal committed
     was written back in; and the hundred-person cap was the add's alone, while
     the restored link made joining the other way in. A join now runs in a
     transaction holding the group's row, the row a removal takes first
     (succession's lockGroup, pinned in group-succession.test.mjs) and adding
     takes too. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function joinCatchupByToken(");
  assert.ok(fn, "joinCatchupByToken is gone; this pin is reading nothing");
  const tx = fn.indexOf("prisma.$transaction(");
  const lock = fn.indexOf("await lockGroup(tx, catchup.groupId)");
  const reread = fn.search(/tx\.catchup\.findFirst\(\{\s*where: \{ id: catchup\.id, inviteToken: token \}/);
  const count = fn.indexOf("tx.groupMember.count(");
  const cap = fn.indexOf(">= MAX_CATCHUP_PEOPLE", count);
  const insert = fn.indexOf("tx.groupMember.upsert(");
  assert.ok(tx > -1 && lock > tx && reread > lock && count > reread && cap > count && insert > cap, "a join no longer re-reads the link and counts the roster, holding the group, before it writes the membership");
  assert.doesNotMatch(fn, /prisma\.groupMember\.(upsert|create)\(/, "a join writes the membership outside the transaction again");
  assert.match(fn, /A Catch-up holds up to \$\{MAX_CATCHUP_PEOPLE\} people, and this one is full\./, "a full Catch-up refuses a join without the add's sentence");
});

test("L12-09: only a Keeper's page carries the invite link", () => {
  const page = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  const sets = [...page.matchAll(/inviteToken:\s*([^,\n]+)/g)].map((m) => m[1].trim());
  assert.equal(sets.length, 1, "the home's view model sets the invite link more than once, or not at all");
  assert.match(sets[0], /^isKeeper && .*\? catchup\.inviteToken : null$/, "the invite link goes to every member's browser again");
});

test("T2a-10: removing someone takes their filing, as leaving does", () => {
  /* The spec says removal "does the same" as leaving, and leaving drops the
     pref row; removal kept it, so a member re-added by link found the
     Catch-up under Archived. Both exits now clear it. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  for (const [name, who] of [["removeCatchupMember", "userId"], ["leaveCatchup", "userId: viewerId"]]) {
    const fn = balancedBody(src, `export async function ${name}`);
    assert.ok(fn, `${name} is gone; this pin is reading nothing`);
    assert.ok(
      fn.includes(`catchupPref.deleteMany({ where: { catchupId, ${who} } })`),
      `${name} no longer deletes the member's pref row`
    );
  }
});

test("T2a-07: a Catch-up cannot be ended while an Edition is running, and the End row says when it can", () => {
  /* Ending stops the clock, so an Edition caught collecting or answering
     stayed there for good and that week's answers were never read. His Q2:
     refuse it until the Edition is over. One statement, so the check and the
     write see the same rows. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const end = balancedBody(src, "export async function endCatchup");
  assert.ok(end, "endCatchup is gone; this pin is reading nothing");
  assert.match(
    end,
    /tx\.catchup\.updateMany\(\{\s*where: \{ id: catchupId, editions: \{ none: RUNNING_EDITION_WHERE \} \},\s*data: \{ status: "ended" \},?\s*\}\)/,
    "ending no longer refuses a Catch-up with an Edition running, in the same statement"
  );
  /* And never across a Start (A3 review): End holds the Catch-up's row before
     it looks, and openEdition holds it first and only while not ended, so an
     End landing between Start's own check and its Edition is seen. */
  const held = end.search(/tx\.catchup\.updateMany\(\{ where: \{ id: catchupId \}, data: \{ updatedAt: new Date\(\) \} \}\)/);
  assert.ok(held > -1 && held < end.indexOf("editions: { none: RUNNING_EDITION_WHERE }"), "End looks for a running Edition before it holds the Catch-up's row");
  const lib = decomment(read("src/lib/catchups.ts"));
  const open = balancedBody(lib, "export async function openEdition");
  assert.ok(open, "openEdition is gone; this pin is reading nothing");
  const gate = open.search(/tx\.catchup\.updateMany\(\{\s*where: \{ id: catchup\.id, status: \{ not: "ended" \} \}/);
  assert.ok(gate > -1 && gate < open.indexOf("tx.catchupEdition.findFirst("), "openEdition reads the Editions before it holds a Catch-up that has not ended");
  assert.match(open, /if \(held\.count === 0\) return \{ refused: "ended" as const \}/, "openEdition starts an Edition in an ended Catch-up");
  assert.match(balancedBody(src, "export async function startEdition"), /opened\.refused === "ended"/, "a Start refused for an ended Catch-up says something else");
  assert.match(end, /if \(ended\.count === 0\) \{\s*return \{ error: "An Edition is running\./, "a refused end says nothing");
  assert.doesNotMatch(end, /prisma\.catchup\.update\(/, "a second, unconditional write ends it anyway");

  const surface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));
  const group = balancedBody(surface, "function catchupGroup(");
  assert.ok(group, "catchupGroup is gone; this pin is reading nothing");
  assert.match(group, /const running = c\.state === "collecting" \|\| c\.state === "answering";/);
  assert.match(group, /opens: running \? undefined : \{ shape: "confirm", key: "end" \}/, "End can be pressed while an Edition runs");
  assert.match(group, /You can end it once this Edition is over/, "the End row no longer says when it can be pressed");
});

test("T2a-03: the roster holds MAX_CATCHUP_PEOPLE, counted inside the write that adds to it", async () => {
  /* The bound was on one request's list, and the People door sends one id
     per request, so a Keeper could keep adding past a hundred and every bell
     the Catch-up rings fans out per member. The count has to run while the
     group's row is held, the lock every roster change takes: with nothing
     held, parallel adds (or an add and a join) each see the room the others
     are about to take. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function addCatchupMembers(");
  assert.ok(fn, "addCatchupMembers is gone; this pin is reading nothing");

  const tx = fn.indexOf("prisma.$transaction(");
  const lock = fn.indexOf("await lockGroup(tx, catchup.groupId)");
  const count = fn.indexOf("tx.groupMember.count(");
  const cap = fn.indexOf("> MAX_CATCHUP_PEOPLE", count);
  const insert = fn.indexOf("tx.groupMember.createMany(");
  assert.ok(tx > -1 && lock > -1 && count > -1 && insert > -1, "the roster is no longer counted and written in one transaction holding the group");
  assert.ok(tx < lock && lock < count && count < cap && cap < insert, "the roster is not counted and capped, after the group is held, before the insert");
  assert.match(fn, /isSerializationFailure\(err\)/, "a deadlock throws out as \"Something went wrong\" instead of asking to try again");
  assert.doesNotMatch(fn.slice(insert), /prisma\.groupMember\.createMany\(/, "a second, uncounted insert appeared");
  assert.match(fn, /holds up to \$\{MAX_CATCHUP_PEOPLE\} people/, "a full roster refuses without saying the number");

  /* Metered per person added, on a bucket of its own (write-path review of
     A2): on the shared `catchups` bucket, one token a request, a Keeper got
     five adds an hour, one person each, and a Start after them was refused.
     Checked before the write, spent after it for the people actually added. */
  assert.doesNotMatch(fn, /rateLimit\("catchups"/, "adding draws on the bucket creation and Start share again");
  const checked = fn.indexOf('hasBudget("catchupAdds", session.user.id, realIds.length)');
  const spent = fn.indexOf('consume("catchupAdds", session.user.id, written.added)');
  assert.ok(checked > -1 && checked < tx, "adding is not checked against its own meter before it writes");
  assert.ok(spent > insert, "the meter is spent before anyone is added, so a refusal or a full roster costs a token");
  const { MAX_CATCHUP_PEOPLE } = await import("./catchup-caps.ts");
  const limits = decomment(read("src/lib/rate-limit.ts"));
  const tokens = Number(limits.match(/catchupAdds: \{ tokens: (\d+), window: "1 h" \}/)?.[1]);
  assert.ok(tokens >= MAX_CATCHUP_PEOPLE, "a Keeper can no longer fill a Catch-up to its cap within the hour");
  assert.match(limits, /return remaining >= cost;/, "hasBudget no longer asks for the whole cost");
  assert.match(limits, /await limiter\.limit\(key, \{ rate: cost \}\);/, "consume no longer spends the whole cost");
});

test("B-060's successor: there is always a way to start the next Edition", () => {
  /* B-060 was a Catch-up sitting active for ever with no future Edition and no
     control anywhere to start one. Its fix re-armed the rhythm on resume; with
     no rhythm the fix is simpler and wider -- whenever nothing is running the
     home draws Start, for anyone in it, and the opener reuses a fizzled or
     never-started row rather than refusing on it. */
  const lib = decomment(read("src/lib/catchups.ts"));
  const open = balancedBody(lib, "export async function openEdition");
  assert.ok(open, "openEdition is gone; this pin is reading nothing");
  assert.match(open, /isEditionRunning\(/, "openEdition no longer refuses to start a second Edition on top of a running one");
  assert.match(open, /status === "collecting"/, "openEdition no longer reuses an idle collecting row");
  assert.match(open, /notifyQuestionsOpen\(tx/, "starting an Edition no longer tells anyone, inside the same transaction");
  const page = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(page, /const idle =/, "the home no longer works out whether it is idle");
});

test("B-062: the header does not count down a Catch-up whose clock is stopped", () => {
  const src = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(
    src,
    /catchup\.status !== "ended"\s*\?\s*editionCountdownLabel/,
    "the page header prints a live countdown over an ended Catch-up again"
  );
});

test("C-125: a stale device cannot replace an answer written on another one", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const start = src.indexOf("export async function submitEntry(");
  assert.notEqual(start, -1);
  const body = src.slice(start, src.indexOf("\nexport async function", start + 10));

  // The precondition: the write only lands if the row still holds the version
  // the caller last saw. Without `updatedAt: base` in the where clause this is
  // an ordinary update and the guard is decoration.
  assert.match(
    body,
    /updateMany\(\{\s*where: \{[^}]*updatedAt: base[^}]*\}/,
    "the version precondition is gone from the entry write"
  );
  assert.match(body, /moved\.count === 0/, "a refused save is not detected");
  assert.match(body, /changed somewhere else/, "a refused save says nothing to the member");
  // The unconditional upsert survives ONLY for a caller holding no version.
  assert.ok(
    body.indexOf("if (base) {") < body.indexOf("catchupEntry.upsert("),
    "the upsert is no longer behind the version check"
  );
  // The new version goes back, or the next save would look stale.
  assert.match(body, /updatedAt: entry\.updatedAt\.toISOString\(\)/);

  // The same instrument the letters desk carries for M66; if that one is ever
  // removed this comparison is worth revisiting rather than silently drifting.
  const feed = decomment(read("src/app/(main)/feed/actions.ts"));
  assert.match(feed, /updatedAt: base/, "editPost lost the guard this one mirrors");
});

test("C-027: the answer window is re-read at write time, not trusted", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const start = src.indexOf("export async function submitEntry(");
  const body = src.slice(start, src.indexOf("\nexport async function", start + 10));

  /* The gap this guards used to be a Spotify fetch with a 3-second budget,
     deleted with the song field on 2026-10-11. The re-read stays: every other
     transition in this feature CASes on status for the same reason, and an
     answer landing in an Edition already on its way out is the fault. */
  /* Held, not just read (C8-04): FOR SHARE keeps a close, an extension or the
     author's own departure from landing between the re-read and the write. */
  assert.match(body, /FROM "CatchupEdition"\s+WHERE "id" = \$\{prompt\.editionId\} AND "status" = 'answering'\s+FOR SHARE/);
  assert.match(body, /if \(open\.length === 0\) return "closed"/);
  assert.ok(
    body.indexOf("FOR SHARE") < body.indexOf("catchupEntry.upsert"),
    "the write happens before the window is re-read"
  );
  assert.ok(
    body.indexOf("prisma.$transaction") < body.indexOf("FOR SHARE"),
    "the re-read is outside the transaction that writes, so it can go stale again"
  );
  assert.match(body, /Answering has closed for this Edition/);
});

test("C-125: the answering surface actually sends the version it holds", () => {
  const experience = decomment(read("src/components/catchups/answer/answer-experience.tsx"));
  assert.match(experience, /baseUpdatedAt: versions\.current\[promptId\]/);
  assert.match(experience, /versions\.current\[promptId\] = "updatedAt" in result/);
  // Seeded from what the page rendered, not from nothing.
  assert.match(experience, /prompts\.map\(\(p\) => \[p\.id, p\.entryUpdatedAt\]\)/);
  /* The loader moved to the HOME in build phase 7, with answering itself.
     Same two lines, same reason: the version has to be seeded from the row
     this page rendered, or every save after the first looks stale to the
     guard and the whole optimistic-concurrency check turns into a refusal. */
  const page = decomment(
    read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx")
  );
  assert.match(page, /entryUpdatedAt: entry\?\.updatedAt\.toISOString\(\) \?\? null/);
  /* The four this guard needs, named rather than matched as one string: the
     recording's three columns joined the same select in build phase 12 and a
     fifth field is not a regression. `updatedAt` IS the guard. */
  const draftSelect = /select: \{ promptId: true,[^}]*\}/.exec(page)?.[0] ?? "";
  for (const field of ["promptId: true", "body: true", "images: true", "updatedAt: true"]) {
    assert.ok(draftSelect.includes(field), `the answering draft stopped loading ${field}`);
  }
});

test("T2a-08: two creations in flight together find each other, so a double press makes one Catch-up", () => {
  /* The twin read ran before the creating transaction, so two requests in
     flight together each missed the other's uncommitted rows and both made a
     Catch-up, ringing everyone named twice. It now runs inside, after the
     creator's own row is held: the second waits, then finds the first. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function createCatchupWithPeople(");
  assert.ok(fn, "createCatchupWithPeople is gone; this pin is reading nothing");
  const tx = fn.indexOf("prisma.$transaction(");
  const lock = fn.search(/tx\.\$queryRaw`SELECT 1 FROM "User" WHERE "id" = \$\{creatorId\} FOR NO KEY UPDATE`/);
  const twin = fn.indexOf("tx.catchup.findFirst(");
  const create = fn.indexOf("tx.group.create(");
  assert.ok(tx > -1 && lock > tx && twin > lock && create > twin, "the twin is no longer read inside the creating transaction, after the creator's row is held");
  assert.doesNotMatch(fn, /prisma\.catchup\.findFirst\(/, "the twin is read outside the transaction again, where a request in flight cannot see it");
});

test("T2b-09: a reorder takes every question the soft cap can let in", () => {
  /* The insert cap tolerates a 41st question when two land together (C-029),
     and the reorder sends every accepted id, so a payload bound AT the cap
     refused every drag on that Edition for good. The bound sits above it. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const cap = Number(src.match(/const MAX_ACCEPTED_PROMPTS_PER_EDITION = (\d+);/)?.[1]);
  const bound = src.match(/const MAX_REORDER_PROMPT_IDS = MAX_ACCEPTED_PROMPTS_PER_EDITION \* (\d+);/);
  assert.ok(cap > 0 && bound, "the insert cap or the reorder's bound moved; retarget this pin");
  assert.ok(Number(bound[1]) >= 2, "the reorder's bound is not comfortably above the insert cap");
  assert.match(
    src,
    /orderedPromptIds: z\.array\(z\.string\(\)\.min\(1\)\)\.min\(1\)\.max\(MAX_REORDER_PROMPT_IDS\)/,
    "the reorder schema is bounded by something else again, likely the insert cap"
  );
});

test("T2b-06: the empty-answer withdrawal deletes the row only while it is still empty", async () => {
  /* The write that empties an answer commits first, and the delete follows.
     A second device with no version upserts onto the same row in between, so
     a delete by id alone took its paragraph after telling it "Saved". The
     delete names every column the test for "empty" reads, and nothing else
     says what empty means. */
  const { EMPTY_ENTRY_WHERE } = await import("./catchups-core.ts");
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function submitEntry(");
  assert.ok(fn, "submitEntry is gone; this pin is reading nothing");
  const test_ = fn.match(/if \((!entry\.\w+(?: && !entry\.\w+)*)\) \{\s*const withdrawn/);
  assert.ok(test_, "the withdrawal's test for an empty answer moved; retarget this pin");
  const tested = test_[1].split(" && ").map((s) => s.replace("!entry.", "")).sort();
  assert.deepEqual(Object.keys(EMPTY_ENTRY_WHERE).sort(), tested, "the delete's predicate and the test for empty name different columns");
  assert.ok(Object.values(EMPTY_ENTRY_WHERE).every((v) => v === null), "EMPTY_ENTRY_WHERE matches something other than an empty column");
  assert.match(fn, /catchupEntry\.deleteMany\(\{\s*where: \{ id: entry\.id, \.\.\.EMPTY_ENTRY_WHERE \},?\s*\}\)/, "the withdrawal deletes without asking the row is still empty");
  assert.doesNotMatch(fn, /deleteMany\(\{ where: \{ id: entry\.id \} \}\)/, "a delete by id alone is back");
});

test("C-020 is closed by deletion: there is no bin left to disarm", () => {
  /* The bug: binning your own copy stamped `CatchupPref.deletedAt`, which
     stopped every broadcast and armed a nightly sweep to take your membership
     row on the thirtieth night -- and following your own invite link back in
     redirected an existing member straight past the join action, so the stamp
     survived and the sweep removed somebody who had just walked back in.
     `restoreOwnCatchupCopy` existed to disarm it on the way through.

     Build phase 5 deleted the bin instead (his, N18: "defaults, except
     deleting becomes leaving"). Leaving takes the `GroupMember` row in the
     moment, so a member who is out is not one this branch can see, and there
     is nothing left to arm. This pin is what stops the helper coming back
     without the bug being reconsidered. */
  const lib = decomment(read("src/lib/catchups.ts"));
  assert.ok(
    !lib.includes("export async function restoreOwnCatchupCopy"),
    "the un-bin helper is back; C-020 needs re-reading before it ships"
  );
  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.ok(
    !actions.includes("export async function setCatchupDeleted"),
    "the thirty-day bin is back, and with it the rejoin hole C-020 described"
  );

  // Archiving is untouched, and the join path still leaves it alone: filing
  // something away and then opening it again must not unfile it.
  const page = decomment(read("src/app/catchups/join/[token]/page.tsx"));
  assert.ok(!page.includes("archivedAt"), "the invite link now unfiles an archived copy");
  assert.match(page, /redirect\(`\/catchups\/\$\{catchup\.id\}`\)/);
});

test("C-030: a heart does not nudge somebody the Edition has closed to", () => {
  const notify = decomment(read("src/lib/catchups-notify.ts"));
  const start = notify.indexOf("export const notifyLove");
  assert.notEqual(start, -1);
  const body = notify.slice(start);

  // A published answer stays when its author leaves, but the Edition page 404s
  // for a non-member, so the bell entry pointed at a door that no longer
  // opens. A second count beside it excluded whoever had binned their own
  // copy; build phase 5 deleted the bin, and leaving now takes the membership
  // row itself, so this one count is the whole test.
  // Still a member, and still in good standing (T2a-13, his Q6).
  assert.match(body, /groupMember\.count\(\{\s*where: \{ groupId: ctx\.groupId, userId: ctx\.authorId, user: IN_GOOD_STANDING \},?\s*\}\)/);
  assert.match(body, /if \(stillIn === 0\) return;/);
  assert.ok(!/deletedAt/.test(body), "the love nudge is reading a column nothing writes");
  assert.ok(
    body.indexOf("stillIn === 0") < body.indexOf("notification.create"),
    "the check happens after the row is written, which notifies them anyway"
  );
  // ...and the caller passes the group it needs to do the check.
  assert.match(
    decomment(read("src/app/(main)/catchups/actions.ts")),
    /groupId: edition\.catchup\.group\.id,/
  );
});

test("T2a-02 and T3-09: a Catch-up is called by the name its pages print, in every bell and on its invitation", () => {
  /* A rename writes only `Catchup.title`. The bells took `groupName`, filled
     from `group.name` at every call site, and the invitation printed the same
     column, so a renamed Catch-up was announced by the name it had given up,
     in every bell, for good. The name is `catchupDisplayName`'s now, and the
     field says so. */
  const notify = decomment(read("src/lib/catchups-notify.ts"));
  assert.doesNotMatch(notify, /groupName|group\.name/, "a bell takes the group's own name again");
  const builders = [...notify.matchAll(/export const (notify\w+)/g)].map((m) => m[1]);
  assert.ok(builders.length >= 8, `only ${builders.length} notify builders found; retarget this pin`);
  for (const name of builders) {
    const body = balancedBody(notify, `export const ${name}`);
    assert.match(body, /ctx\.catchupName/, `${name} names the Catch-up some other way`);
  }

  /* Every place that reads a group's name to call a Catch-up something hands
     it to the helper, with the title beside it. A bare `group.name` is how the
     bug looked at all eight sites. */
  for (const file of [
    "src/lib/catchups.ts",
    "src/app/(main)/catchups/actions.ts",
    "src/app/catchups/join/[token]/page.tsx",
    "src/app/(main)/catchups/[catchupId]/(home)/page.tsx",
  ]) {
    const src = decomment(read(file));
    const bare = [...src.matchAll(/(?:\w+\.)*group\.name\b/g)].filter(
      (m) => !/catchupDisplayName\([^()]*$/.test(src.slice(Math.max(0, m.index - 120), m.index))
    );
    /* One exception, said by name: the advance input hands the group's id and
       name over together, title beside them, for `loadMeta` to combine. */
    const allowed = bare.filter((m) => !/group: \{ id: catchup\.group\.id, name: catchup\.group\.name \}/.test(src.slice(m.index - 40, m.index + 40)));
    assert.deepEqual(allowed.map((m) => m[0]), [], `${file} names a Catch-up by its group's name alone`);
    assert.doesNotMatch(src, /groupName:/, `${file} hands a notification the group's name`);
  }

  // The clock's bells: an included row counts only when its caller selected
  // the title, so leaving it out costs a read, never the right name.
  const lib = decomment(read("src/lib/catchups.ts"));
  const meta = balancedBody(lib, "async function loadMeta(");
  assert.ok(meta, "loadMeta is gone; this pin is reading nothing");
  assert.match(meta, /included\?\.group && included\.title !== undefined/, "loadMeta trusts a caller that did not select the title");
  assert.match(meta, /title: true/, "loadMeta's own read does not fetch the title");
  assert.equal((meta.match(/catchupDisplayName\(/g) ?? []).length, 2, "one of loadMeta's two ways out names the Catch-up without the helper");
});

test("T7b-15: a reminder leaves the bell when what it says stops being true", () => {
  /* A reminder names the deadline. The close's own bells take the round's
     reminders with them (catchup-bells.test.mjs runs those); these are the
     three that exist only as calls into Prisma. */
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  // An author who answers, inside the write, only once the answer has
  // something in it: an emptied one is withdrawn and clears nothing.
  const submit = balancedBody(src, "export async function submitEntry(");
  assert.ok(submit, "submitEntry is gone; this pin is reading nothing");
  const write = submit.slice(submit.indexOf("prisma.$transaction("), submit.indexOf('if (entry === "closed")'));
  assert.match(
    write,
    /if \(row\.body \|\| row\.images \|\| row\.audioUrl\) \{\s*await clearReminders\(tx, edition\.catchupId, session\.user\.id\);/,
    "an answer no longer takes its author's reminder with it, inside the write"
  );
  assert.ok(write.indexOf("clearReminders(") > write.indexOf("catchupEntry.upsert("), "the reminder goes before the answer is written");

  // A Keeper's extension, and the clock's own when nobody has answered: both
  // move the deadline every waiting reminder names.
  const extend = balancedBody(src, "export async function extendDeadline");
  assert.match(extend, /await clearReminders\(prisma, edition\.catchupId\)/, "a hand extension leaves the old deadline in the bell");
  const lib = decomment(read("src/lib/catchups.ts"));
  const apply = balancedBody(lib, "async function applyEditionAction(");
  const clockExtend = apply.slice(apply.indexOf('action.kind === "extend"'), apply.indexOf('action.kind === "fizzle"'));
  assert.match(clockExtend, /notify\.clearReminders\(tx, meta\.catchupId\)/, "the clock's extension leaves the old deadline in the bell");
});

test("T7b-15 follow-up (g): the extend row and its toast name the hour, like every deadline", () => {
  const surface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));
  const row = balancedBody(surface, "function editionGroup(");
  assert.match(row, /close \$\{deadlineWords\(closes, formatDayMonth\)\}/, "the extend row names the deadline without its hour");
  const extend = balancedBody(surface, "async function extend(");
  assert.match(extend, /now close \$\{deadlineWords\(result\.closesAt\)\}/, "the extension's toast names the deadline without its hour");
  assert.doesNotMatch(surface, /formatDayAndDate\(/, "a bare date names a deadline on this surface again");
});

test("routed follow-up (d): Nobody has answered yet says what the clock will do", async () => {
  /* It said "There is nothing to send out until someone answers", and the
     clock does not wait: at a deadline with nobody's answers it gives three
     more days, once, then publishes what is there, empty or not. The rule
     first, so a change to it fails here and the sentence is read again. */
  const { shouldExtendForTooFew, REMINDER_EXTENDED } = await import("./catchups-core.ts");
  assert.equal(shouldExtendForTooFew({ remindersSent: 0 }, 0), true, "no answers no longer buys three more days");
  assert.equal(shouldExtendForTooFew({ remindersSent: REMINDER_EXTENDED }, 0), false, "an empty Edition no longer comes out after its one extension");

  const surface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));
  const copy = balancedBody(surface, "export function confirmCopy(");
  const offer = copy.slice(copy.indexOf('case "nobody-answered"'), copy.indexOf('case "start"'));
  assert.doesNotMatch(offer, /until someone answers/, "the offer promises the Edition waits for an answer");
  assert.match(
    offer,
    /autoExtended\s*\?\s*"[^"]*comes out even if it is empty\."\s*:\s*"[^"]*three more days[^"]*comes out even if it is empty\."/,
    "the offer no longer says which of the clock's two next steps comes"
  );
  // The page tells it which of the two it is.
  const page = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(page, /autoExtended: \(\(freshLatest\?\.remindersSent \?\? 0\) & REMINDER_EXTENDED\) !== 0/);
  assert.match(surface, /confirmCopy\(open\.key, c\.name, c\.people, c\.autoExtended[,)]/);
});

test("C-149: every swallowed failure on the clock is reported, not just logged", () => {
  /* advanceEdition never re-throws -- an edition that cannot advance must not
     take down the page it was called from -- so the reportSwallowed calls in
     advanceDueCatchups and openNextEditionIfDue cannot see a per-edition
     failure. Its catch did console.error only, and console.error on Vercel
     reaches nobody: round-OPENING failures went to Sentry and round-ADVANCING
     failures did not, which is the M09 fix applied to half the clock. The
     Edition just stops moving while the countdown keeps counting down.

     Swept rather than pinned to one function: every catch in this file that
     swallows (does not re-throw) has to report. */
  const src = decomment(read("src/lib/catchups.ts"));
  /* `catch (err)` AND the parenless `catch {`. The old pattern required
     parentheses, so a swallowing block written without a binding was
     invisible to this sweep -- a gap, not a decision. */
  const catches = [...src.matchAll(/\}\s*catch\s*(?:\([^)]*\)\s*)?\{/g)];
  assert.ok(catches.length >= 3, `only found ${catches.length} catch blocks; the sweep has drifted`);

  for (const m of catches) {
    // The block, brace-matched from the catch's own opening brace.
    let depth = 0;
    let end = m.index + m[0].length - 1;
    for (let i = end; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const block = src.slice(m.index, end + 1);
    // A catch that re-throws is not swallowing: its caller still hears.
    if (/\bthrow\b/.test(block)) continue;
    // ...nor is one that only classifies and returns to a caller that reports.
    if (/isMissingCatchupTable/.test(block) && !/console\.error/.test(block)) {
      assert.match(
        block,
        /reportSwallowed\(/,
        `a catch in catchups.ts swallows a failure without reporting it:\n${block.slice(0, 200)}`
      );
      continue;
    }
    assert.ok(
      /reportSwallowed\(/.test(block),
      `a catch in catchups.ts swallows a failure with console alone, which on Vercel reaches ` +
        `nobody (C-149):\n${block.slice(0, 200)}`
    );
  }
});

/* ------------------------------------------------------------------ *
 *  Blocked and leaving members inside a Catch-up (bug audit 3, T2a-13 and
 *  T2b-05; the owner's Q6 (b), 2026-10-29): out of its lists, counts and
 *  bells; Editions already sent stay exactly as people read them; what
 *  nobody has read yet goes with them (Q21). The bells are driven in
 *  catchup-bells.test.mjs and the close's helper in group-succession.
 * ------------------------------------------------------------------ */

test("Q6: every close sheds a blocked or leaving member's writing after its count and before its bell", () => {
  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  const close = balancedBody(actions, "export async function closeAndPublish");
  const ways = close.split("unlessEmpty(prisma.$transaction(").slice(1);
  assert.equal(ways.length, 2, "closeAndPublish no longer has its two ways out; retarget this pin");
  for (const way of ways) {
    const counted = way.indexOf("throw new EmptyAfterSwap()");
    const shed = way.indexOf("await dropGoneMembersWriting(tx, editionId)");
    const bell = way.search(/await notify(Sealed|Published)\(tx,/);
    assert.ok(counted > -1 && shed > counted && bell > shed, "a hand close sends out a blocked or leaving member's writing again");
  }
  const lib = decomment(read("src/lib/catchups.ts"));
  const apply = balancedBody(lib, "async function applyEditionAction(");
  const transition = apply.slice(apply.indexOf('action.kind === "transition"'), apply.indexOf('action.kind === "extend"'));
  const shed = transition.indexOf('if (action.from === "answering") await dropGoneMembersWriting(tx, editionId);');
  assert.ok(shed > transition.indexOf("if (cas.count === 0) return false;"), "the clock's close sheds before it holds the row, or not at all");
  assert.ok(shed > -1 && shed < transition.indexOf("notify."), "the clock's close rings its bell before it sheds");
});

test("Q6: an answer is a row with something in it, from somebody still in good standing", async () => {
  const { ANSWERED_ENTRY_WHERE, EMPTY_ENTRY_WHERE } = await import("./catchups-core.ts");
  const { IN_GOOD_STANDING } = await import("./catchup-caps.ts");
  assert.deepEqual(ANSWERED_ENTRY_WHERE, { NOT: EMPTY_ENTRY_WHERE, author: IN_GOOD_STANDING });
  // One standing for the whole site: the feed's fragment names the same two columns.
  assert.match(
    decomment(read("src/lib/posts.ts")),
    /AUTHOR_IN_GOOD_STANDING = \{ author: \{ isBlocked: false, deletionRequestedAt: null \} \}/,
    "the feed's standing changed; IN_GOOD_STANDING (catchup-caps.ts) should change with it"
  );
});

test("Q6: a Catch-up's People list, its head counts and the batch floor count members in good standing", () => {
  const home = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(home, /members: \{\s*where: \{ user: IN_GOOD_STANDING \},\s*select: \{/, "the People list draws blocked or leaving members again");
  assert.match(home, /people: catchup\.group\.members\.length/, "Start's head count no longer reads the list the page draws");
  const join = decomment(read("src/app/catchups/join/[token]/page.tsx"));
  assert.match(join, /_count: \{ select: \{ members: \{ where: \{ user: IN_GOOD_STANDING \} \} \} \}/, "the invitation counts blocked or leaving members again");
  const batch = decomment(read("src/lib/batch-catchups.ts"));
  assert.match(batch, /const BATCH_FLOOR_COUNT = \{\s*_count: \{ select: \{ members: \{ where: \{ user: IN_GOOD_STANDING \} \} \} \},/);
  assert.match(balancedBody(batch, "export async function ensureBatchCatchup("), /\.\.\.BATCH_FLOOR_COUNT/, "signup's floor counts blocked or leaving members again");
  assert.match(balancedBody(batch, "export async function healBatchCatchups("), /\.\.\.BATCH_FLOOR_COUNT/, "the tick's floor counts blocked or leaving members again");
});

test("T2b-05: a published Edition keeps every answer as it was read, and hides a blocked author's comments as everywhere", () => {
  /* The decision, pinned both ways: no standing filter on the answers (or
     their hearts), because an Edition already sent stays as people read it;
     comments through VISIBLE_COMMENT, the site's rule, because a comment is
     written after an Edition is out. comment-target-rule.test.mjs holds the
     comment count's filter in entryCounts. */
  const view = decomment(read("src/lib/catchups-edition-view.ts"));
  const fn = balancedBody(view, "export async function loadPublishedEditionView");
  const entries = fn.slice(fn.indexOf("entries: {"), fn.indexOf("loves: { where: { userId: viewerId }"));
  assert.ok(entries.length > 0, "the reader's answers moved; retarget this pin");
  assert.doesNotMatch(entries, /isBlocked|deletionRequestedAt|GOOD_STANDING/, "a published Edition drops a blocked author's answers, which his Q6 (b) keeps as read");
  assert.match(decomment(read("src/lib/page-counts.ts")), /VISIBLE_COMMENT/, "the comment count no longer follows the site's rule for a blocked author");
});

/* ------------------------------------------------------------------ *
 *  Bytes a Catch-up row stops naming are queued in the write that stops
 *  naming them, the C-064 rule editPost follows (bug audit 3, L12-02 and
 *  V-L-d-01). Nothing can list the bucket afterwards, so a photograph left
 *  behind here stayed public for good, and the account purge, which
 *  collects only what a row still names, never found it.
 * ------------------------------------------------------------------ */

test("L12-02: a photograph taken off an answer is queued in the write that takes it off", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function submitEntry(");
  assert.ok(fn, "submitEntry is gone; this pin is reading nothing");
  const write = fn.slice(fn.indexOf("prisma.$transaction("), fn.indexOf('if (entry === "closed")'));
  assert.match(write, /hasAudio \|\| hasImages\s*\?\s*await tx\.catchupEntry\.findUnique\(\{ where: key, select: \{ audioUrl: true, images: true \} \}\)/, "the write no longer reads the photographs it is about to replace");
  assert.match(write, /parseJsonArray\(before\?\.images\)\.filter\(\(url\) => !ownedImages\.includes\(url\)\)/, "the dropped photographs are no longer what the row stopped naming");
  const upsert = write.indexOf("catchupEntry.upsert(");
  const queued = write.indexOf("tx.pendingImagePurge.createMany(");
  assert.ok(upsert > -1 && queued > upsert, "a dropped photograph is not queued inside the write that drops it");
  assert.match(write, /reason: "replaced"/);
  // A url another answer still names stays (C-018).
  assert.match(write, /where: \{ id: \{ not: row\.id \}, OR: dropped\.map\(\(url\) => \(\{ images: \{ contains: url \} \}\)\) \}/);
  // Drained after the commit, before an emptied answer is withdrawn.
  const drain = fn.indexOf("await drainPendingImagePurges(entry.droppedImages)");
  assert.ok(drain > fn.indexOf('if (entry === "closed")') && drain < fn.indexOf("const withdrawn"), "the queued photographs are not drained after the commit");
});

test("V-L-d-01: replacing an uploaded picture queues the old one, and only an upload nothing else shows", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function setCatchupPicture(");
  assert.ok(fn, "setCatchupPicture is gone; this pin is reading nothing");
  const order = [
    "prisma.$transaction(",
    "tx.catchup.updateMany({ where: { id: catchupId }, data: { updatedAt: new Date() } })",
    "tx.catchup.findUnique({ where: { id: catchupId }, select: { pictureSrc: true } })",
    "tx.catchup.update(",
    "isPoolPicture(old)",
    "tx.catchup.count({ where: { pictureSrc: old } })",
    'tx.pendingImagePurge.createMany({ data: [{ url: old, reason: "replaced" }] })',
    "await drainPendingImagePurges([replaced])",
  ];
  for (let i = 0; i < order.length; i += 1) {
    assert.ok(fn.indexOf(order[i]) > -1, `setCatchupPicture lost ${order[i]}`);
    if (i > 0) assert.ok(fn.indexOf(order[i - 1]) < fn.indexOf(order[i]), `${order[i - 1]} no longer comes before ${order[i]}`);
  }
  assert.doesNotMatch(fn, /prisma\.catchup\.update\(/, "the picture is written outside the transaction that reads what it replaces");
});

test("V-L-d-01: an upload the picker did not keep is thrown away, never one a row still shows", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function discardPictureUpload(");
  assert.ok(fn, "discardPictureUpload is gone; this pin is reading nothing");
  assert.match(fn, /requireVerifiedMember\(\)/);
  assert.match(fn, /ownedUploadUrls\(\[url\], session\.user\.id\)/, "it can throw away somebody else's upload");
  for (const named of [
    "prisma.catchup.count({ where: { pictureSrc: url } })",
    "prisma.post.count({ where: { images: { contains: url } } })",
    "prisma.catchupEntry.count({ where: { images: { contains: url } } })",
    "prisma.user.count({ where: { photoUrl: url } })",
    "prisma.adminMessage.count({ where: { imageUrl: url } })",
  ]) {
    assert.ok(fn.includes(named), `it no longer asks ${named} before deleting`);
  }
  assert.ok(fn.indexOf("named.some((n) => n > 0)") < fn.indexOf('purgeImageUrls([url], "abandoned")'), "it deletes before asking whether anything shows it");

  const picker = decomment(read("src/components/catchups/home/picture-picker-dialog.tsx"));
  assert.match(picker, /discard\(unsaved\.current\);\s*unsaved\.current = url;/, "a second upload no longer throws the first away");
  assert.match(picker, /if \(upload !== chosen\) discard\(upload\);/, "saving another picture no longer throws the unused upload away");
  assert.match(picker, /if \(!next && !saving\) \{\s*discard\(unsaved\.current\);/, "closing the picker no longer throws the unused upload away");
  assert.match(picker, /useEffect\(\(\) => \(\) => discard\(unsaved\.current\), \[discard\]\)/, "leaving the page no longer throws the unused upload away");
  assert.match(picker, /<Dialog open=\{open\} onOpenChange=\{closeOrOpen\}>/);
});
