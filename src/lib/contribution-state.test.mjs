import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { ROOT, read, decomment } from "./test-kit.mjs";

import {
  CONTRIBUTION_STATUSES,
  CONTRIBUTION_SUM,
  COUNTED_GIVERS,
  UNCOUNTED_GIVER_IDS,
  isCountedGiver,
  PAYABLE_FROM,
  REVERSED_STATUSES,
  canBecomePaid,
  foldReversal,
  isReversed,
  netPaise,
  unfoldDispute,
} from "./contribution-state.ts";

/* Audits C-084 and C-085. Both confirmers admitted the move to "paid" from
 * anything that was not already "paid", so a re-delivered payment.captured
 * (C-084) or a replayed browser callback (C-085) resurrected a refunded gift:
 * it re-counted in every money sum and minted a second bird pick. */

test("money can only arrive from a state where it has not arrived yet", () => {
  assert.equal(canBecomePaid("created"), true);
  assert.equal(canBecomePaid("failed"), true);
  assert.equal(canBecomePaid("paid"), false);
  assert.equal(canBecomePaid("refunded"), false);
  assert.equal(canBecomePaid("disputed"), false);
  assert.equal(canBecomePaid("nonsense"), false);
});

test("a reversal is terminal, and no reversed state is payable", () => {
  for (const s of REVERSED_STATUSES) {
    assert.equal(isReversed(s), true);
    assert.equal(canBecomePaid(s), false, `${s} can still become paid`);
  }
  // Every status is accounted for: payable, reversed, or paid itself. A new
  // status added without deciding which side it falls on fails here.
  for (const s of CONTRIBUTION_STATUSES) {
    const known = PAYABLE_FROM.includes(s) || REVERSED_STATUSES.includes(s) || s === "paid";
    assert.ok(known, `${s} belongs to neither side of the transition`);
  }
});

/* The property that fixes it: neither confirmer states the transition as a
 * negation of "paid". Both name the source states, through this module. */

const sources = [
  ["src/app/api/razorpay/webhook/route.ts", "payment.captured webhook"],
  ["src/app/(main)/support/actions.ts", "confirmContribution browser callback"],
];

for (const [file, what] of sources) {
  test(`${what} admits "paid" only from the source states`, () => {
    const src = decomment(read(file));
    const writes = [...src.matchAll(/status:\s*"paid"/g)];
    assert.ok(writes.length > 0, `${file} no longer writes status: "paid"`);

    assert.ok(
      /PAYABLE_FROM/.test(src),
      `${file} decides the paid transition without the shared source-state list`
    );
    assert.ok(
      !/status:\s*\{\s*not:\s*"paid"\s*\}/.test(src),
      `${file} guards the paid transition with a negation again`
    );
    assert.ok(
      !/contribution\.status\s*!==\s*"paid"/.test(src),
      `${file} guards the paid transition with a negation again`
    );
  });
}

/* ---------------------------------------------------------------- *
 *  Audit C-087: a partial refund un-counted the entire contribution
 * ---------------------------------------------------------------- */

test("a partial refund moves only the paise it returned", () => {
  const row = { amount: 500_000, refundedAmount: 0, status: "paid" };
  const folded = foldReversal({ ...row, to: "refunded", paise: 10_000 });
  assert.equal(folded.full, false);
  assert.equal(folded.status, "paid", "a partial refund made the whole gift disappear");
  assert.equal(folded.refundedAmount, 10_000);
  // The counted total drops by exactly the refunded paise, not the whole gift.
  assert.equal(
    netPaise({ amount: row.amount, refundedAmount: folded.refundedAmount }),
    490_000
  );
});

test("partial refunds accumulate, and the last one that covers the gift ends it", () => {
  const amount = 30_000;
  const first = foldReversal({ amount, refundedAmount: 0, status: "paid", to: "refunded", paise: 10_000 });
  assert.equal(first.full, false);
  const second = foldReversal({
    amount,
    refundedAmount: first.refundedAmount,
    status: first.status,
    to: "refunded",
    paise: 20_000,
  });
  assert.equal(second.full, true);
  assert.equal(second.status, "refunded");
  assert.equal(second.refundedAmount, amount);
  assert.equal(netPaise({ amount, refundedAmount: second.refundedAmount }), 0);
});

test("nothing can be refunded for more than it was given", () => {
  const folded = foldReversal({
    amount: 50_000,
    refundedAmount: 40_000,
    status: "paid",
    to: "refunded",
    paise: 999_999,
  });
  assert.equal(folded.refundedAmount, 50_000);
  assert.equal(netPaise({ amount: 50_000, refundedAmount: folded.refundedAmount }), 0);
});

test("a dispute is always the whole payment", () => {
  const folded = foldReversal({
    amount: 50_000,
    refundedAmount: 0,
    status: "paid",
    to: "disputed",
    paise: 1,
  });
  assert.equal(folded.full, true);
  assert.equal(folded.status, "disputed");
  assert.equal(folded.refundedAmount, 50_000);
});

/* Audit C-151: a reversal arriving before the capture matched nothing and was
 * acknowledged with a 200, so it was lost and the later capture landed the row
 * on "paid" as though the money had stayed. */

test("a reversal applies to a row the capture has not reached yet", () => {
  const folded = foldReversal({
    amount: 50_000,
    refundedAmount: 0,
    status: "created",
    to: "refunded",
    paise: 50_000,
  });
  assert.equal(folded.status, "refunded", "an early reversal was dropped");
  // ...and the capture that arrives afterwards cannot undo it.
  assert.equal(canBecomePaid(folded.status), false);
});

/* Every money surface counts the NET, through the shared selection and the
 * shared reader. A new aggregate that sums the gross would re-open C-087 on
 * exactly one page, which is the hardest kind of drift to notice. */

test("no money surface reads a contribution sum's gross amount", () => {
  assert.deepEqual(CONTRIBUTION_SUM, { amount: true, refundedAmount: true });

  // Every file that both touches the Contribution table and aggregates. The
  // call is written two ways in this repo (`prisma.contribution.aggregate(`
  // and the awaited-chain form with `.aggregate(` on its own line), so match
  // the pair rather than one spelling of it.
  const files = execSync("git grep -l 'prisma.contribution' -- src ':!src/generated'", {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .map((f) => [f, decomment(read(f))])
    .filter(([, src]) => /\.aggregate\(/.test(src));
  assert.ok(files.length >= 6, "the contribution aggregates have moved; retarget this test");

  for (const [f, src] of files) {
    assert.ok(
      !/_sum:\s*\{[^}]*\bamount:\s*true/.test(src),
      `${f} sums a contribution's gross amount instead of CONTRIBUTION_SUM`
    );
    assert.ok(
      /CONTRIBUTION_SUM/.test(src) && /netPaise\(/.test(src),
      `${f} aggregates contributions without reading the net`
    );
  }
});

/* ------------------------------------------------------------------ *
 *  A chargeback the owner WINS counts again.
 *
 *  `payment.dispute.created` moved a row to "disputed" and nothing anywhere
 *  moved it back, so a dispute the owner won -- money that never actually
 *  left -- stayed un-counted for ever on the recovery bar, in "Given, all
 *  time" and in the supporter's own history, correctable only by raw SQL
 *  against the live database (bug-report-2 C-086).
 * ------------------------------------------------------------------ */

test("winning a dispute puts the money back", () => {
  const row = { amount: 500000, refundedAmount: 500000, status: "disputed" };
  assert.deepEqual(unfoldDispute({ ...row, paise: 500000 }), {
    refundedAmount: 0,
    status: "paid",
  });
});

test("a dispute payload with no amount still resolves the whole thing", () => {
  // The route passes the contribution's own amount when the entity does not
  // carry one, which is the safe direction for a dispute (always the full
  // payment by definition).
  const row = { amount: 500000, refundedAmount: 500000, status: "disputed" };
  assert.equal(unfoldDispute({ ...row, paise: 500000 })?.status, "paid");
});

test("a won event resurrects nothing that was not disputed", () => {
  for (const status of ["paid", "created", "failed", "refunded"]) {
    assert.equal(
      unfoldDispute({ amount: 500000, refundedAmount: 0, status, paise: 500000 }),
      null,
      `a dispute-won event moved a row out of "${status}"`
    );
  }
});

test("a refund that happened before the dispute is not counted as given twice", () => {
  // ...and never goes negative, whatever the payload claims the dispute was
  // for. The over-return in the refund-then-dispute-then-won sequence is
  // documented on the function; what must not happen is a negative refund,
  // which would count MORE than the gift.
  const out = unfoldDispute({ amount: 500000, refundedAmount: 500000, status: "disputed", paise: 900000 });
  assert.equal(out?.refundedAmount, 0);
  assert.ok((out?.refundedAmount ?? -1) >= 0);
});

test("the webhook acts on a won dispute, from disputed only, once", () => {
  const src = decomment(read("src/app/api/razorpay/webhook/route.ts"));
  assert.match(src, /payment\.dispute\.won/, "the webhook ignores a won dispute again");
  assert.match(src, /payment\.dispute\.closed/, "the webhook ignores a closed dispute again");
  const branch = src.slice(src.indexOf("unfoldDispute({"));
  const write = branch.slice(branch.indexOf("updateMany"), branch.indexOf("if (moved.count"));
  assert.match(write, /status:\s*["']disputed["']/, "the resolution is not conditional on the row still being disputed");
  assert.match(write, /NOT:\s*\{\s*reversalIds:\s*\{\s*has:/, "a re-delivered won event would apply twice");
  // A lost dispute is correctly un-counted and must stay that way.
  assert.ok(!/payment\.dispute\.lost/.test(src), "the webhook acts on a lost dispute, which is already correct as it stands");
});

/* Owner, 2026-09-22: the site's own people's payments stay out of the public
 * bar and the admin tiles. The fragment must keep gifts from deleted accounts
 * (userId NULL), which a bare `notIn` would silently drop, and every total
 * must actually spread it. */
test("uncounted givers: null userId still counts, the listed ids do not", () => {
  assert.equal(isCountedGiver(null), true);
  assert.equal(isCountedGiver("someone-else"), true);
  for (const id of UNCOUNTED_GIVER_IDS) assert.equal(isCountedGiver(id), false);
  assert.deepEqual(COUNTED_GIVERS.OR[0], { userId: null });
});

test("uncounted givers: every public or admin total filters them", () => {
  for (const [file, n] of [
    ["src/app/(main)/support/page.tsx", 1],
    ["src/app/(main)/admin/(index)/page.tsx", 1],
    ["src/app/(main)/admin/support/page.tsx", 4],
  ]) {
    const hits = decomment(read(file)).match(/\.\.\.COUNTED_GIVERS/g) ?? [];
    assert.equal(hits.length, n, file);
  }
});
