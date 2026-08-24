import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTION_STATUSES,
  PAYABLE_FROM,
  REVERSED_STATUSES,
  canBecomePaid,
  isReversed,
} from "./contribution-state.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

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
