import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { REVERSED_STATUSES } from "./contribution-state.ts";

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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

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
