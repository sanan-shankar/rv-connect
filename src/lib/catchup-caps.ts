/* ------------------------------------------------------------------ *
 *  Who, and how many, a Catch-up may hold.
 *
 *  Its own module because the server actions that enforce both live in a
 *  `"use server"` file, which may export nothing but async functions, so
 *  neither a client component nor an API route can import a constant from
 *  where it is used. Same reason `post-caps.ts` exists.
 *
 *  Before this, the picker had no cap at all: "Everyone from my batch"
 *  happily added a 240-person batch, the member spent time arranging a
 *  roster, and the submit then failed flat with a sentence about a limit
 *  nothing on screen had mentioned (audit M12).
 * ------------------------------------------------------------------ */

import type { Prisma } from "@/generated/prisma/client";

/**
 * 100, not the 500 the audit called out as the forced-enrolment number.
 *
 * It is roughly a tenth of the community at the expected ceiling, which is
 * about as many people as one person can plausibly claim to be catching up
 * WITH; past that it is a broadcast, and a broadcast that enrols its audience
 * without asking. Every enrolment also fans out notifications, so the cap is
 * the reach limit as much as the roster limit. It bounds the ROSTER: adding
 * counts who is already in, inside the same write, rather than capping one
 * request, which a Keeper adding one person at a time never reached (bug
 * audit 3, T2a-03).
 */
export const MAX_CATCHUP_PEOPLE = 100;

/**
 * The people a Catch-up may be given, or may hand its Keeper's hat to: an
 * alumnus with a confirmed email and a verified profile (the trust model's
 * Stage 2), not blocked, not inside their deletion window, and not the site's
 * Anonymous byline.
 *
 * Being inside a Catch-up is reading among people who were told who would
 * read them, and its people get every bell it rings, so being PUT into one
 * by somebody else asks the stage the member's own doors already ask: the
 * invite link, creating one, asking, answering (bug audit 3, L10-01: a
 * Keeper's picker and the hat both handed Catch-ups to accounts that had
 * confirmed nothing). A batch Catch-up is the one the owner kept open: a
 * signup joins their batch's at once and may read it, and presses nothing
 * until verified (2026-10-29), which the actions enforce, not this.
 *
 * A Prisma `where` on User, applied NESTED -- `AND: [CATCHUP_PEOPLE]` beside
 * the caller's own clauses, or `user: CATCHUP_PEOPLE` through a relation --
 * never spread: it names `id`, and a spread would silently replace the
 * caller's `id: { in: [...] }` with this one.
 */
export const CATCHUP_PEOPLE = {
  accountType: { notIn: ["teacher", "ex_teacher"] },
  emailVerified: { not: null },
  verifyState: "verified",
  isBlocked: false,
  deletionRequestedAt: null,
  id: { not: "anonymous" },
} satisfies Prisma.UserWhereInput;
