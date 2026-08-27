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
  // And the sweep does not even load them.
  assert.match(
    src,
    /catchup: \{ status: "active", \.\.\.scope \}/,
    "advanceDueCatchups no longer scopes its edition query to active Catch-ups"
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

test("B-061: every hand-driven write into a live Round refuses a frozen Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  // The clock gate in advanceEdition covers the automatic half only. These
  // seven write the edition directly, in their own transactions, and each used
  // to check the ROUND's status alone -- which does not change on a pause. A
  // Keeper with a tab opened before the pause could still publish the Round and
  // notify the whole group under a page saying it was paused.
  const MUST_REFUSE_WHEN_FROZEN = [
    "openAnswering",
    "closeAndPrepare",
    "extendDeadline",
    "publishNow",
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
      `${name} writes into a Round without refusing a paused or ended Catch-up`
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

  const page = decomment(read("src/app/(main)/catchups/[catchupId]/answer/page.tsx"));
  assert.match(
    page,
    /catchup\.status !== "active"/,
    "the answer page no longer refuses a frozen Catch-up"
  );
});

test("B-060: resume re-arms the rhythm rather than leaving a dead Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  // resumeCatchup must reach for addCadenceGap: without it, a Catch-up whose
  // Round published while paused sits active forever with no future Round and
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
  const src = decomment(read("src/app/(main)/catchups/[catchupId]/page.tsx"));
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
  assert.match(body, /Answering has closed for this Round/);
});

test("C-125: the answering surface actually sends the version it holds", () => {
  const experience = decomment(read("src/components/catchups/answer/answer-experience.tsx"));
  assert.match(experience, /baseUpdatedAt: versions\.current\[promptId\]/);
  assert.match(experience, /versions\.current\[promptId\] = "updatedAt" in result/);
  // Seeded from what the page rendered, not from nothing.
  assert.match(experience, /prompts\.map\(\(p\) => \[p\.id, p\.entryUpdatedAt\]\)/);
  const page = decomment(read("src/app/(main)/catchups/[catchupId]/answer/page.tsx"));
  assert.match(page, /entryUpdatedAt: entry\?\.updatedAt\.toISOString\(\) \?\? null/);
  assert.match(page, /select: \{ promptId: true, body: true, images: true, updatedAt: true \}/);
});

test("C-020: rejoining through the invite link disarms your own bin", () => {
  const lib = decomment(read("src/lib/catchups.ts"));
  const start = lib.indexOf("export async function restoreOwnCatchupCopy(");
  assert.notEqual(start, -1, "the un-bin helper is gone");
  const body = lib.slice(start, lib.indexOf("\nexport ", start + 10));
  assert.match(body, /catchupPref\.updateMany/);
  assert.match(body, /data: \{ deletedAt: null \}/, "it no longer clears the bin");
  // Only the caller's own row, and only the bin: archiving is filing, not
  // deletion, and nothing sweeps it.
  assert.match(body, /where: \{ catchupId, userId, deletedAt: \{ not: null \} \}/);
  assert.ok(!body.includes("archivedAt"), "the un-bin now also unfiles an archived copy");

  // Both ways back in call it: the action, and the page that redirects an
  // existing member before the action could ever run.
  assert.match(
    decomment(read("src/app/(main)/catchups/actions.ts")),
    /restoreOwnCatchupCopy\(catchup\.id, session\.user\.id\)/
  );
  const page = decomment(read("src/app/catchups/join/[token]/page.tsx"));
  assert.match(page, /await restoreOwnCatchupCopy\(catchup\.id, session\.user\.id\);/);
  assert.ok(
    page.indexOf("restoreOwnCatchupCopy") < page.indexOf("redirect(`/catchups/${catchup.id}`)"),
    "the redirect happens before the bin is cleared, so it never runs"
  );
});

test("C-021: a Round with no questions cannot be opened for answering", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const start = src.indexOf("export async function openAnswering(");
  assert.notEqual(start, -1);
  const body = src.slice(start, src.indexOf("\nexport async function", start + 10));

  // The same rows the clock counts, counted inside the same transaction as
  // the open, so removing the last question cannot land in between.
  assert.match(body, /tx\.catchupPrompt\.count\(\{\s*where: \{ editionId, accepted: true \}/);
  assert.match(body, /if \(accepted === 0\) return "empty"/);
  assert.ok(
    body.indexOf("catchupPrompt.count") < body.indexOf("catchupEdition.updateMany"),
    "the questions are counted after the Round is already open"
  );
  assert.ok(
    body.indexOf("prisma.$transaction") < body.indexOf("catchupPrompt.count"),
    "the count is outside the transaction, so it can go stale before the write"
  );
  // ...and the member is told why, rather than getting the generic refusal.
  assert.match(body, /no questions in this Round yet/);
});

test("C-025: taking the Keeper's hat off leaves the group's own admin role alone", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const start = src.indexOf("export async function setCatchupKeeper(");
  assert.notEqual(start, -1);
  const body = src.slice(start, src.indexOf("\nexport async function", start + 10));

  // Granting writes "keeper", never "admin", so a Catch-up Keeper is not
  // silently made a moderator of the group's posts. The revoke must show the
  // same care in the other direction: only a "keeper" row is demoted.
  assert.match(
    body,
    /where: \{ groupId: catchup\.groupId, userId, role: "keeper" \},\s*data: \{ role: "member" \}/,
    "the revoke writes over whatever role it finds"
  );
  assert.ok(!/data: \{ role: isKeeper \? "keeper" : "member" \}/.test(body));
  // A revoke that matched nothing is only an error when they are really gone.
  assert.match(body, /groupMember\.count\(\{\s*where: \{ groupId: catchup\.groupId, userId \}/);
});

test("C-026: a whole-group fanout fired outside a transition is metered", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  /* The four builders that write a row for every member. Inside a transaction
     (`notifyX(tx, ...)`) each one rides a status CAS, so it can fire once per
     transition and no more. Called with the shared client it has nothing
     bounding it at all -- which is what the manual nudge was: it bypasses the
     daily bucket AND every "off" preference, so a loop re-created an unread
     bell entry for the whole roster as often as the caller liked (C-026). */
  const FANOUT = ["notifyReminder", "notifyAnswersOpen", "notifyQuestionsOpen", "notifyPublished"];
  const unmetered = [];
  for (const name of FANOUT) {
    for (const m of src.matchAll(new RegExp(`await ${name}\\(prisma,`, "g"))) {
      // The exported action this call sits in.
      const fnStart = src.lastIndexOf("export async function ", m.index);
      const fnEnd = src.indexOf("\nexport async function", m.index);
      const body = src.slice(fnStart, fnEnd === -1 ? src.length : fnEnd);
      const meter = body.indexOf("await rateLimit(");
      if (meter === -1 || meter > m.index - fnStart) {
        unmetered.push(`${/export async function (\w+)/.exec(body)?.[1]} -> ${name}`);
      }
    }
  }
  assert.deepEqual(unmetered, []);
  // ...and the nudge really is one of the calls this covers, so the sweep is
  // not passing on an empty set.
  assert.match(src, /await notifyReminder\(prisma,/);
});

test("C-029: two questions sharing a position still render in one stable order", () => {
  const home = decomment(read("src/app/(main)/catchups/[catchupId]/page.tsx"));
  // The console sorts in JS after filtering, so the tiebreak has to be there
  // too -- the query's own orderBy does not survive the filter+sort.
  assert.match(
    home,
    /a\.position - b\.position \|\| a\.createdAt\.getTime\(\) - b\.createdAt\.getTime\(\)/,
    "the home console is back to a bare position sort"
  );
  // The same total order the query already asks the database for. That query
  // now lives in the loader both Round readers share, so the pin follows it
  // there -- one query for two surfaces, rather than one per page to keep in
  // step. What is pinned is unchanged: the database is asked for the order the
  // console then sorts by, so the filter+sort above cannot invent a different
  // one.
  const loader = decomment(read("src/lib/catchups-round-view.ts"));
  assert.match(loader, /orderBy: \[\{ position: "asc" \}, \{ createdAt: "asc" \}\]/);

  // ...and the comment above the cap check no longer claims a serialization a
  // plain transaction does not provide.
  const actions = read("src/app/(main)/catchups/actions.ts");
  const capComment = actions.slice(
    actions.indexOf("Read as max+1"),
    actions.indexOf("const created = await prisma.$transaction")
  );
  assert.ok(
    !/cannot both see room/.test(capComment),
    "the cap comment still promises two submissions cannot both pass"
  );
  assert.match(capComment, /READ\s+COMMITTED/);
});

test("C-030: a heart does not nudge somebody the Round has closed to", () => {
  const notify = decomment(read("src/lib/catchups-notify.ts"));
  const start = notify.indexOf("export const notifyLove");
  assert.notEqual(start, -1);
  const body = notify.slice(start);

  // A published answer stays when its author leaves, but the Round page 404s
  // for a non-member, so the bell entry pointed at a door that no longer
  // opens. Binned copies are excluded on the same footing as every broadcast.
  assert.match(body, /groupMember\.count\(\{ where: \{ groupId: ctx\.groupId, userId: ctx\.authorId \} \}\)/);
  assert.match(body, /catchupPref\.count\(\{[\s\S]*?deletedAt: \{ not: null \}/);
  assert.match(body, /if \(stillIn === 0 \|\| binned > 0\) return;/);
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
     advanceDueCatchups and openNextRoundIfDue cannot see a per-edition
     failure. Its catch did console.error only, and console.error on Vercel
     reaches nobody: round-OPENING failures went to Sentry and round-ADVANCING
     failures did not, which is the M09 fix applied to half the clock. The
     Round just stops moving while the countdown keeps counting down.

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
