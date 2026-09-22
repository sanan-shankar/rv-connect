/* The Contribution state machine, in one place.
 *
 * A contribution row is written by two racing confirmers -- the payer's own
 * browser callback (`confirmContribution`) and Razorpay's webhook -- and moved
 * again later by refunds and disputes. Both confirmers used to admit the move
 * to "paid" from ANY state that was not already "paid": the webhook with
 * `status: { not: "paid" }`, the callback with `if (status !== "paid")`.
 *
 * That is a hole rather than a guard, because "refunded" and "disputed" are
 * not "paid" either. A re-delivered payment.captured -- Razorpay retries any
 * delivery it did not 2xx, and the dashboard has a Resend button -- or a
 * replayed browser callback (the HMAC triple never expires and the payer holds
 * it) put a returned gift back on "paid" with a fresh paidAt: it re-counted in
 * the public recovery bar and minted the supporter a second bird pick (audits
 * C-084, C-085).
 *
 * So the transition is stated positively, as the states money can arrive
 * FROM, and both confirmers ask this module rather than each carrying its own
 * negation.
 */

export const CONTRIBUTION_STATUSES = [
  "created",
  "paid",
  "failed",
  "refunded",
  "disputed",
] as const;

export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

/** The only states a row may become "paid" from: the money has not landed yet. */
export const PAYABLE_FROM = ["created", "failed"] as const satisfies readonly ContributionStatus[];

/** Money in and back out again. Nothing may move a row out of one of these. */
export const REVERSED_STATUSES = [
  "refunded",
  "disputed",
] as const satisfies readonly ContributionStatus[];

/** True when a capture (webhook or browser callback) may mark this row paid. */
export function canBecomePaid(status: string): boolean {
  return (PAYABLE_FROM as readonly string[]).includes(status);
}

/** True when the money has already been returned or charged back. Terminal. */
export function isReversed(status: string): boolean {
  return (REVERSED_STATUSES as readonly string[]).includes(status);
}

/* ---------------------------------------------------------------- *
 *  What a contribution is actually worth now (audit C-087)
 * ---------------------------------------------------------------- */

/* A refund is not always the whole gift: the Razorpay dashboard takes an
 * amount. The webhook used to move the whole row to "refunded" on any
 * refund.processed and never read the refund's own amount, so ₹100 handed back
 * on a ₹5,000 contribution erased the entire ₹5,000 from every money surface
 * -- the public recovery bar, "Given, all time", the month tile, and the perk
 * ledger, where the paid sum could fall below the ₹500 floor over a token
 * partial refund.
 *
 * So a partial refund now leaves the row on "paid" and lands in
 * `refundedAmount`, and what is COUNTED is amount minus refundedAmount. Every
 * aggregate over this table sums both columns through `CONTRIBUTION_SUM` and
 * reads the answer through `netPaise`, so a new money surface cannot quietly
 * count the gross again. */

/** The `_sum` selection every Contribution aggregate must make. */
export const CONTRIBUTION_SUM = { amount: true, refundedAmount: true } as const;

/* ---------------------------------------------------------------- *
 *  Whose money the totals leave out
 * ---------------------------------------------------------------- */

/* Real payments that are not the alumni's giving: the owner's own, and two
 * made by people close to the site (owner, 2026-09-22: "exclude payments from
 * sanan sanjula and karthik from the website in progress bar and admin
 * stats"). They stay paid, stay in the ledger and still earn their perks;
 * they are only left out of the public recovery bar and the admin tiles.
 * By id rather than email, so a changed address cannot quietly count them
 * again. */
export const UNCOUNTED_GIVER_IDS = [
  "cmr1uahuj000004jx4dc4p8co", // Sanan Shankar
  "cmsqe3d6i000004l43i1hemnx", // Sanjula Shankar
  "cmsvuaide000004l1sabxvha6", // Kartik Kalyanram
] as const;

/* A `where` fragment for every total. Spelled with the null case because SQL's
 * `NOT IN` is never true for a NULL userId, so a plain `notIn` would also drop
 * every gift whose account was deleted (userId is SetNull). */
export const COUNTED_GIVERS = {
  OR: [{ userId: null }, { userId: { notIn: [...UNCOUNTED_GIVER_IDS] } }],
};

/** The in-memory twin of COUNTED_GIVERS, for totals computed from fetched rows. */
export function isCountedGiver(userId: string | null | undefined): boolean {
  return !userId || !(UNCOUNTED_GIVER_IDS as readonly string[]).includes(userId);
}

/** What a summed set of contributions is worth after refunds. */
export function netPaise(sum: {
  amount?: number | null;
  refundedAmount?: number | null;
}): number {
  return (sum.amount ?? 0) - (sum.refundedAmount ?? 0);
}

/**
 * Fold one refund or dispute into a row.
 *
 * Pure, because the ordering cases are the whole difficulty and they are far
 * easier to state as a table than to reason about at a Prisma call site:
 *
 *  - a partial refund leaves the row where it is and only moves the paise;
 *  - a refund covering the rest of the amount makes the row terminal;
 *  - a dispute is always the whole thing;
 *  - a reversal arriving BEFORE the capture event (Razorpay delivers in no
 *    particular order, and a capture can be retrying) used to match nothing
 *    and be acknowledged with a 200, so it was lost for ever and a later
 *    capture landed the row on "paid" with no record that the money had gone
 *    back (audit C-151). It now applies to the row it finds, whatever state
 *    that row is in, and because a reversed row is not one money can arrive
 *    from, the later capture cannot undo it.
 */
export function foldReversal(input: {
  /** The row as it stands. */
  amount: number;
  refundedAmount: number;
  status: string;
  /** Which reversal this is, and for how much. */
  to: "refunded" | "disputed";
  paise: number;
}): { refundedAmount: number; status: string; full: boolean } {
  const returned = Math.min(input.amount, Math.max(0, input.refundedAmount + input.paise));
  // A dispute is the whole payment by definition; a refund only when the paise
  // add up to it.
  const full = input.to === "disputed" || returned >= input.amount;
  return {
    refundedAmount: full ? input.amount : returned,
    status: full ? input.to : input.status,
    full,
  };
}

/**
 * A chargeback the owner WON, folded back out.
 *
 * `payment.dispute.created` moves a row to "disputed", which every money
 * surface filters out. Nothing anywhere moved it back, so a dispute the owner
 * won -- money that never left -- stayed un-counted for ever, in the public
 * recovery bar, in "Given, all time" and in the supporter's own history, and
 * the only correction was raw SQL against the live database (bug-report-2
 * C-086). A LOST dispute is already right where it is.
 *
 * Only from "disputed": a won event for a row that is refunded, or that never
 * reached the dispute, must not resurrect anything.
 *
 * The one imprecision, stated rather than hidden: `foldReversal` treats a
 * dispute as the whole payment and clamps `refundedAmount` to `amount`, so a
 * partial refund that happened BEFORE the dispute is absorbed into that number
 * and cannot be told apart from it here. Unfolding therefore returns the
 * dispute's own paise and, in that one sequence -- partial refund, then
 * chargeback, then the owner wins -- gives the earlier refund back to the
 * total. Recording it exactly would need a column of its own; the audit line
 * names the paise so the owner can see what moved.
 */
export function unfoldDispute(input: {
  amount: number;
  refundedAmount: number;
  status: string;
  /** What the dispute was for; the full amount when the payload does not say. */
  paise: number;
}): { refundedAmount: number; status: string } | null {
  if (input.status !== "disputed") return null;
  const given = Math.min(input.amount, Math.max(0, input.paise));
  return {
    refundedAmount: Math.max(0, input.refundedAmount - given),
    status: "paid",
  };
}
