/**
 * The one sentence every rate-limited surface shows. Its own dependency-free
 * file for the same reason as member-gate-message.ts: the server returns it,
 * and the Phase 4 probe (plain Node, no next/headers) asserts the UI shows
 * exactly it. One sentence, no jargon, and it never says how long the window
 * is — that is tuning data an attacker should have to measure, not read.
 */
export const RATE_LIMITED = "That was a few too many, too quickly. Give it a minute and try again.";
