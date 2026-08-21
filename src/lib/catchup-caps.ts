/* ------------------------------------------------------------------ *
 *  The one number for how many people a Catch-up may hold.
 *
 *  Its own module because the server action that enforces it lives in a
 *  `"use server"` file, which may export nothing but async functions, so
 *  a client component cannot import the constant from where it is used.
 *  Same reason `post-caps.ts` exists.
 *
 *  Before this, the picker had no cap at all: "Everyone from my batch"
 *  happily added a 240-person batch, the member spent time arranging a
 *  roster, and the submit then failed flat with a sentence about a limit
 *  nothing on screen had mentioned (audit M12).
 * ------------------------------------------------------------------ */

/**
 * 100, not the 500 the audit called out as the forced-enrolment number.
 *
 * It is roughly a tenth of the community at the expected ceiling, which is
 * about as many people as one person can plausibly claim to be catching up
 * WITH; past that it is a broadcast, and a broadcast that enrols its audience
 * without asking. Every enrolment also fans out notifications, so the cap is
 * the reach limit as much as the roster limit.
 */
export const MAX_CATCHUP_PEOPLE = 100;
