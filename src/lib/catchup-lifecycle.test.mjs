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

test("B-061: the clock stops for a Catch-up that is not active", () => {
  const src = decomment(read("src/lib/catchups.ts"));
  // The one gate, inside advanceEdition, which every caller comes through.
  assert.match(
    src,
    /meta\.catchupStatus !== "active"\)\s*return;/,
    "advanceEdition no longer refuses to advance a paused or ended Catch-up"
  );
  /* And the sweep does not even load them. Pinned on the property rather than
     on one nesting of it: the two reads this used to spell out became one on
     2026-09-05 (refactor audit 2, C3), so what matters is that the sweep's own
     query still narrows to active Catch-ups and to the viewer's scope, not
     where in the `where` those clauses sit. */
  const sweep = balancedBody(src, "export async function advanceDueCatchups");
  assert.ok(sweep, "advanceDueCatchups is gone; this pin is reading nothing");
  assert.match(
    sweep,
    /status: "active"/,
    "advanceDueCatchups no longer scopes its query to active Catch-ups"
  );
  assert.match(
    sweep,
    /\.\.\.scope/,
    "advanceDueCatchups no longer scopes its query to the viewer's own Catch-ups"
  );
});

test("B-061: pausing stamps the freeze, ending and resuming clear it", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.match(src, /status: "paused", pausedAt: new Date\(\)/, "pause does not stamp pausedAt");
  assert.match(src, /status: "active", pausedAt: null/, "resume does not clear pausedAt");
  assert.match(src, /status: "ended", nextOpensAt: null, pausedAt: null/, "end does not clear pausedAt");
  // Pause is an edge, not a re-stamp: an already-paused row must not have its
  // credit extended by a second pause.
  assert.match(
    src,
    /where: \{ id: catchupId, status: "active" \}/,
    "pause is no longer conditional on the Catch-up being active"
  );
});

test("B-061: every hand-driven write into a live Edition refuses a frozen Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  // The clock gate in advanceEdition covers the automatic half only. These
  // six write the edition directly, in their own transactions, and each used
  // to check the EDITION's status alone -- which does not change on a pause. A
  // Keeper with a tab opened before the pause could still publish the Edition and
  // notify the whole group under a page saying it was paused.
  //
  // Six, not seven: `publishNow` is deleted with `preparing` (2026-09-08), and
  // `closeAndPrepare` is `closeAndPublish` -- the close IS the publish now.
  const MUST_REFUSE_WHEN_FROZEN = [
    "openAnswering",
    "closeAndPublish",
    "extendDeadline",
    "nudgeGroup",
    "submitPrompt",
    "submitEntry",
  ];
  for (const name of MUST_REFUSE_WHEN_FROZEN) {
    const start = src.indexOf(`export async function ${name}`);
    assert.ok(start > -1, `${name} has been renamed or removed`);
    const rest = src.slice(start);
    const end = rest.indexOf("export async function", 1);
    const body = end === -1 ? rest : rest.slice(0, end);
    // Two spellings, one guarantee. The five Keeper controls now reach the
    // freeze through `loadKeeperEdition`, which the two member submissions do
    // not use (their status check has to run before the frozen one), so they
    // still call `refuseIfFrozen` themselves.
    assert.match(
      body,
      /refuseIfFrozen\(|loadKeeperEdition\(/,
      `${name} writes into an Edition without refusing a paused or ended Catch-up`
    );
    // Delegating is not enough: `loadKeeperEdition` only runs the freeze when
    // it is GIVEN a pausedHint, so a call without one looks gated and is not.
    // That is the exact hole this test exists to catch, so it is checked
    // rather than assumed.
    if (!/refuseIfFrozen\(/.test(body)) {
      assert.match(
        body,
        /pausedHint:/,
        `${name} calls loadKeeperEdition without a pausedHint, so nothing refuses a frozen Catch-up`
      );
    }
  }

  // And the helper they delegate to must itself do the refusing.
  const helper = balancedBody(src, "async function loadKeeperEdition");
  assert.ok(helper, "loadKeeperEdition has been renamed or removed");
  assert.match(
    helper,
    /refuseIfFrozen\(/,
    "loadKeeperEdition no longer refuses a frozen Catch-up, so five Keeper controls lost their gate at once"
  );

  /* And the SCREEN. `/catchups/[catchupId]/answer` is a 308 to the home since
     build phase 7 -- answering happens on the home now (N77) -- so the screen
     half of this guard moved with it. The home's Edition region tests the
     CATCH-UP's state before the Edition's, so a paused Catch-up gets the "on
     hold" card and an ended one gets nothing; neither can reach the composer.

     Order is the whole of it. Read the other way round, `answering` would
     match first and a frozen Catch-up would draw a writing box whose saves
     `submitEntry` then refuses one at a time. */
  const home = decomment(read("src/components/catchups/home/catchup-home.tsx"));
  const region = balancedBody(home, "function EditionRegion");
  assert.ok(region, "EditionRegion is gone; this pin is reading nothing");
  const ended = region.indexOf('catchupStatus === "ended"');
  const paused = region.indexOf('catchupStatus === "paused"');
  const answering = region.indexOf('status === "answering"');
  assert.ok(ended > -1 && paused > -1, "the home no longer tests the Catch-up's own state");
  assert.ok(answering > -1, "the home no longer draws the composer; this pin is reading nothing");
  assert.ok(
    ended < answering && paused < answering,
    "the home offers the composer before it checks for a frozen Catch-up"
  );
});

test("B-060: resume re-arms the rhythm rather than leaving a dead Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  // resumeCatchup must reach for addCadenceGap: without it, a Catch-up whose
  // Edition published while paused sits active forever with no future Edition and
  // no control anywhere in the app to start one.
  const resume = src.slice(src.indexOf("export async function resumeCatchup"));
  const body = resume.slice(0, resume.indexOf("export async function", 1));
  assert.match(body, /addCadenceGap/, "resumeCatchup no longer backfills nextOpensAt");
  assert.match(body, /shiftEditionPatch/, "resumeCatchup no longer gives back the paused time");
  // The compare-and-swap pins the freeze stamp, not just the status: a
  // pause/resume/pause cycle racing this one would otherwise credit the wrong
  // duration to every deadline below.
  assert.match(
    body,
    /status: "paused", pausedAt \}/,
    "resumeCatchup's compare-and-swap no longer pins pausedAt"
  );
});

test("B-062: the header does not count down a Catch-up whose clock is stopped", () => {
  const src = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(
    src,
    /catchup\.status === "active"\s*\?\s*editionCountdownLabel/,
    "the page header prints a live countdown over the paused banner again"
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

  // resolveSpotify sits between the status read and the write with a 3-second
  // network budget; every other transition here CASes on status for exactly
  // this reason.
  assert.match(body, /tx\.catchupEdition\.count\(\{\s*where: \{ id: prompt\.editionId, status: "answering" \}/);
  assert.match(body, /if \(open === 0\) return "closed"/);
  assert.ok(
    body.indexOf("resolveSpotify") < body.indexOf("catchupEdition.count"),
    "the re-read happens before the slow call, which is the read it was meant to replace"
  );
  assert.ok(
    body.indexOf("catchupEdition.count") < body.indexOf("catchupEntry.upsert"),
    "the write happens before the window is re-read"
  );
  assert.ok(
    body.indexOf("prisma.$transaction") < body.indexOf("catchupEdition.count"),
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
  assert.match(page, /select: \{ promptId: true, body: true, images: true, updatedAt: true \}/);
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
  assert.match(body, /groupMember\.count\(\{\s*where: \{ groupId: ctx\.groupId, userId: ctx\.authorId \},?\s*\}\)/);
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
