import assert from "node:assert/strict";
import test from "node:test";

import { REVERSED_STATUSES } from "./contribution-state.ts";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The admin rooms, where a number nobody can check is the whole risk.
 *
 *  Every finding here is a count that disagreed with the list printed
 *  underneath it, or a derived column left to drift. None of them can
 *  crash, which is exactly why they need pinning: a wrong number in an
 *  analytics room looks the same as a right one.
 *
 *  These read the source. The queries are raw SQL against a live
 *  database and the actions import Prisma, so neither can be called
 *  from the unit gate (`node <file>.test.mjs`, no resolver).
 * ------------------------------------------------------------------ */

const ANALYTICS = decomment(read("src/lib/admin-analytics.ts"));
const SUPPORT_PAGE = decomment(read("src/app/(main)/admin/support/page.tsx"));
const SUPPORT_ACTIONS = decomment(read("src/app/(main)/support/actions.ts"));
const WEBHOOK = decomment(read("src/app/api/razorpay/webhook/route.ts"));
const PEOPLE = decomment(read("src/app/(main)/admin/people/actions.ts"));

/* ---- C-080: a leaderboard is keyed on who, not on what they are called -- */

test("no analytics leaderboard groups people by name", () => {
  /* User.name has no unique constraint. Two members called the same thing
     collapsed into one bar carrying the sum of both their counts, under one of
     their identities -- and at two thousand alumni a shared name is not a
     hypothesis. Ten queries had it; a per-query check would pass on a file
     where nine were fixed, so the sites are COUNTED. */
  assert.ok(
    !/GROUP BY u\."name"/.test(ANALYTICS),
    "a leaderboard groups by u.\"name\" again (C-080): two members with one name " +
      "merge into a single bar with both their counts"
  );
  const keyed = [...ANALYTICS.matchAll(/GROUP BY u\.id/g)].length;
  assert.ok(
    keyed >= 10,
    `only ${keyed} leaderboards group by u.id; there were ten, so some have gone ` +
      "back to grouping by something else"
  );
});

test("a repeated name is disambiguated rather than left ambiguous", () => {
  // Grouping by id makes a new thing visible instead of hiding it: two bars
  // reading the same name. The hint only appears when it is needed, so an
  // ordinary list looks exactly as it did.
  const fn = ANALYTICS.slice(ANALYTICS.indexOf("function personList"));
  const body = fn.slice(0, fn.indexOf("\n}\n") + 2);
  assert.ok(body.length > 100, "personList did not slice; this test is vacuous");
  assert.ok(/batchYear/.test(body), "the disambiguating hint no longer carries the batch");
  assert.ok(
    /> 1/.test(body),
    "the hint is no longer conditional on the name repeating, so every row carries one"
  );
  assert.ok(
    /u\."batchYear"/.test(ANALYTICS),
    "the leaderboard queries stopped selecting the batch the hint is built from"
  );
});

/* ---- C-089: the tile and the ledger measure the same thing ------------- */

test("the 'Did not go through' tile excludes every reversed status", () => {
  /* A chargeback is money that DID move. It was counted in a warn-toned tile
     for failed payments while the ledger below rendered the same row under
     "Given back": two measurements under one label. Derived from
     REVERSED_STATUSES so a sixth contribution status cannot be added without
     the tile learning about it. */
  const tile = SUPPORT_PAGE.slice(SUPPORT_PAGE.indexOf("contribution.count("));
  const where = tile.slice(0, tile.indexOf("}),") + 3);
  assert.ok(where.length > 40, "the tile query did not slice; this test is vacuous");
  assert.ok(
    /notIn: \["paid", \.\.\.REVERSED_STATUSES\]/.test(where),
    "the tile's excluded statuses are hand-typed again (C-089); it must spread " +
      "REVERSED_STATUSES so it cannot fall behind the ledger"
  );
  // And the ledger's two groups read the same rule rather than repeating it.
  assert.ok(
    /isReversed\(r\.status\)/.test(SUPPORT_PAGE),
    "the ledger classifies reversed rows by a hand-written status comparison again"
  );
  assert.ok(
    !/r\.status === "disputed"/.test(SUPPORT_PAGE),
    "a hand-written 'disputed' comparison is back in the support page"
  );
  // The rule itself, so the shape assertions above are about something real.
  assert.deepEqual([...REVERSED_STATUSES], ["refunded", "disputed"]);
});

/* ---- C-088: both writers of "paid" write the same fields --------------- */

test("the browser callback clears the failure reason the webhook clears", () => {
  /* Low 116's hygiene fix landed only in the webhook. The browser callback is
     the one that usually WINS the race -- the payer retries inside the same
     modal and the tab survives -- so a paid gift kept the red error line from
     the attempt before it, printed under "Given" in the admin ledger. */
  const fn = SUPPORT_ACTIONS.slice(SUPPORT_ACTIONS.indexOf("contribution.updateMany"));
  const body = fn.slice(0, fn.indexOf("});") + 3);
  assert.ok(body.length > 80, "confirmContribution's update did not slice; test is vacuous");
  assert.ok(
    /failureReason: null/.test(body),
    "confirmContribution no longer clears failureReason (C-088)"
  );
  assert.ok(
    /status: { in: \[\.\.\.PAYABLE_FROM\] }/.test(body),
    "the confirm is no longer conditional on the states money may arrive from (C-085)"
  );
});

test("the webhook backfills the method when the callback got there first", () => {
  /* The only fact this event carries that the callback cannot: how it was
     paid. Without the backfill every gift recorded by the happy path landed in
     the "Most used" tile as "unknown". Narrow -- a row still paid and still
     without a method -- so it can never resurrect a refunded one (C-084). */
  const branch = WEBHOOK.slice(WEBHOOK.indexOf('if (event.event === "payment.captured")'));
  const backfill = branch.slice(branch.indexOf("moved.count === 0"));
  assert.ok(
    /moved\.count === 0/.test(branch),
    "the captured branch gives up when it finds the row already paid (C-088)"
  );
  const where = backfill.slice(0, backfill.indexOf("});") + 3);
  assert.ok(
    /status: "paid"/.test(where) && /method: null/.test(where),
    "the method backfill is not narrowed to a paid row with no method, so it can " +
      "write over a reversed gift (C-084's shape)"
  );
  assert.ok(
    !/paidAt/.test(where) && !/status: "paid",\s*$/m.test(where),
    "the backfill writes more than the method"
  );
});

/* ---- C-041: a derived credential is re-derived, never left ------------- */

test("an admin batch-year edit re-derives the board credential", () => {
  /* batchType is derived from (yearLeft, batchYear) and used by
     batchTargetKey, so an admin correction that crosses the ICSE/ISC boundary
     left the stored board wrong and a batch-targeted post went to the wrong
     set of people. Nothing visible said so: the byline formats from batchYear
     alone. The member's own editor already re-derived; this one did not. */
  const fn = PEOPLE.slice(PEOPLE.indexOf("export async function adminUpdatePerson"));
  const body = fn.slice(0, fn.indexOf("\nexport async function adminUpdatePlaces"));
  assert.ok(body.length > 500, "adminUpdatePerson did not slice; this test is vacuous");
  assert.ok(
    /batchTypeFromLeaving\(/.test(body),
    "adminUpdatePerson writes batchYear without re-deriving batchType (C-041)"
  );
  assert.ok(
    /yearLeft/.test(body),
    "the re-derivation no longer reads the stored yearLeft, so it is guessing"
  );
  assert.ok(
    /batchType,/.test(body),
    "the derived batchType is computed and then not written"
  );
  assert.ok(
    /tryRosterAutoVerifyQuietly\(/.test(body),
    "an admin fixing a name or batch year no longer re-checks the office roster, " +
      "which the member's own editor does at the same moment"
  );
});

/* ---- O-08 / T7a-06: the office list verifies by email alone, and an ---- *
 * ---- admin's removal of a verification stays removed               ---- */

const ROSTER = decomment(read("src/lib/roster.ts"));
const ASK = decomment(read("src/components/auth/verification-actions.ts"));
const IMPORT_ROSTER = decomment(read("scripts/dev/import-roster.mjs"));

/** The balanced `{ ... }` of the first `where:` at or after `from`. */
function whereAfter(src, from) {
  const open = src.indexOf("{", src.indexOf("where:", from));
  for (let i = open, depth = 0; open >= 0 && i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return "";
}

test("an admin's 'Remove verification' leaves the mark the office list refuses (T7a-06)", () => {
  /* A null method is what a row nobody has looked at carries, so the roster
     verified a removed member again on their next reset, profile edit or "Ask
     to be verified", or on the admin's own next edit of their name. */
  const body = balancedBody(PEOPLE, "export async function adminUnverifyUser");
  assert.ok(body && body.length > 150, "adminUnverifyUser did not slice; this test is vacuous");
  assert.match(
    body,
    /verifyMethod: ADMIN_WITHHELD/,
    "the removal no longer marks the row, so the office list will hand the verification back (T7a-06)"
  );
});

test("every write the office list makes requires a row nobody has decided", () => {
  /* The property, not the two writes there are today: an admin's removal
     (ADMIN_WITHHELD) or verification that lands between the roster's read and
     its write must win, and that only holds if each write re-checks it. */
  const writes = [...ROSTER.matchAll(/\.update(Many)?\(/g)];
  assert.ok(writes.length >= 2, `found ${writes.length} roster writes; this sweep stopped matching`);
  for (const w of writes) {
    assert.equal(w[1], "Many", "the roster writes a user row without a condition");
    assert.match(
      whereAfter(ROSTER, w.index),
      /verifyMethod: null/,
      "a roster write admits a row an admin has already decided (T7a-06)"
    );
  }
});

test("the office list decides by the shared rule and audits what it verifies (O-08)", () => {
  /* rosterOutcome (roster-rule.ts, tested in roster-rule.test.mjs) is where
     "a name only queues" lives; the server must ask it rather than re-derive
     it, and the one write that verifies must leave a record. Before, an
     automatic verification left no trace and nobody was told. */
  assert.match(ROSTER, /rosterOutcome\(/, "roster.ts no longer asks the shared rule what a match may do");
  const verifies = [...ROSTER.matchAll(/verifyMethod: "office_list"/g)];
  assert.equal(verifies.length, 1, "the office list should verify in exactly one place");
  const block = ROSTER.slice(ROSTER.lastIndexOf("if (", verifies[0].index), verifies[0].index + 700);
  assert.match(block, /outcome === "verify"/, "the office_list write is no longer behind the email-only outcome");
  assert.match(block, /writeAudit\(\{\s*action: "roster\.verify"/, "an automatic verification is not audited (O-08)");
  assert.match(ROSTER, /action: "roster\.queue"/, "a name match sent to the queue is not audited");
});

test("asking to be verified after an admin's removal is refused before the office list runs", () => {
  const body = balancedBody(ASK, "export async function requestVerification");
  assert.ok(body && body.length > 400, "requestVerification did not slice; this test is vacuous");
  /* Any method on an unverified row is a decision (ADMIN_WITHHELD today),
     refused before the office list runs; the write below needs a null one. */
  const refused = body.search(/verifyMethod != null\) return \{ ok: false, error: ALREADY_DECIDED \}/);
  const roster = body.indexOf("tryRosterAutoVerifyQuietly(");
  assert.ok(refused > 0 && refused < roster, "a withheld account reaches the office list (or the queue) again");
  assert.match(body, /ADMIN_WITHHELD/, "a removal that lands mid-call is answered as pending again");
  assert.match(
    whereAfter(body, body.indexOf(".updateMany(")),
    /verifyMethod: null/,
    "the request's own write can turn a removal that lands mid-call back into a request"
  );
});

test("the roster import's backfill follows the same rule and never reads a decided row", () => {
  assert.match(IMPORT_ROSTER, /rosterOutcome\(/, "the backfill re-derives the rule instead of sharing it (it verified by name)");
  assert.ok(
    [...IMPORT_ROSTER.matchAll(/"verifyMethod" IS NULL/g)].length >= 2,
    "the backfill's read and its write must both skip a row an admin has decided"
  );
  assert.match(IMPORT_ROSTER, /'roster\.verify'/, "the backfill's verifications are not audited");
});
