/**
 * The mail queue's policy, with no database and no provider in it.
 *
 * Everything here is a decision the queue makes -- which kinds may be sent
 * against what is left of the day, when a failed row may be tried again, and
 * whether a failure was the provider's fault or the address's. Kept pure so
 * each rule can be tested for what it decides rather than for how it is
 * spelled, and kept in ONE file so a new kind of mail cannot be added to half
 * of them (which is exactly bug audit B-070).
 */

/**
 * Every kind of message the queue can hold.
 *
 * Adding one means adding it here, to PRIORITY and to ENQUEUE_LIMIT in
 * email-queue.ts, and giving render() a template. Nothing else: the eligible
 * list the drain selects on is DERIVED below, which is the one that was
 * forgotten.
 */
export type MailKind = "verify" | "reset" | "password-changed" | "deletion-scheduled";

/**
 * Lower sends first. A password reset is somebody locked out RIGHT NOW; a
 * welcome confirmation can wait a day without anyone being stuck.
 */
export const PRIORITY: Record<MailKind, number> = {
  reset: 10,
  "password-changed": 20,
  // The same class of message as password-changed: the only warning a person
  // gets that their account is going away, and -- if it was not them -- the 60
  // days in which signing in undoes it start counting from now.
  "deletion-scheduled": 20,
  verify: 100,
};

/**
 * Everything except `verify`: the kinds the reserve exists to protect, and the
 * ones that may spend the daily budget all the way down.
 *
 * DERIVED, because typing it out is what broke. `deletion-scheduled` was added
 * to MailKind, to PRIORITY, to ENQUEUE_LIMIT and to render(), and left out of
 * the drain's hard-coded eligible list -- so the drain could never select it,
 * and every account-deletion confirmation, including the alarm a takeover
 * victim gets during their 60-day undo window, sat queued forever (B-070).
 */
export const RESERVED_KINDS: MailKind[] = (Object.keys(PRIORITY) as MailKind[]).filter(
  (k) => k !== "verify"
);

/**
 * Which kinds a drain pass may select, given what is left for confirmations.
 *
 * Confirmations stop at the reserve line; resets and security notices may
 * spend all the way down. Expressed as a filter on which kinds are even
 * eligible, so the reserve cannot be nibbled away by a long verify run.
 */
export function eligibleKindsFor(verifyRemaining: number): MailKind[] {
  return verifyRemaining > 0 ? [...RESERVED_KINDS, "verify"] : RESERVED_KINDS;
}

/**
 * When a failed email may be tried again, and whether the failure counted.
 *
 * Pure and dependency-free so the policy can be tested without a provider, a
 * database or a clock.
 *
 * The bug this exists to prevent (bug audit B-002): a requeued row kept its
 * original `createdAt`, so it was still the oldest eligible row and the very
 * next iteration of the SAME drain pass picked it up again. Four failures
 * landed within about four seconds, `attempts` hit the ceiling, and the row was
 * marked permanently failed. A thirty-second Resend brownout therefore
 * converted every queued password reset and confirmation into mail that would
 * never be sent and that nothing would ever retry.
 *
 * Two rules fix it, and both are needed:
 *
 *  1. Every failure sets a time before which the row is not eligible, so
 *     retries spread over passes instead of burning inside one.
 *  2. A failure the PROVIDER caused is not the same as a failure the ADDRESS
 *     caused. Somebody typing `gmial.com` should stop being retried; Resend
 *     having a bad minute should not spend anyone's last attempt.
 */

/** Give up after this many real attempts. A permanently bad address must not
 *  be retried forever against a budget other people need. */
export const MAX_ATTEMPTS = 4;

/**
 * Give up after this many provider-caused deferrals. With the schedule below
 * that is roughly four and a half hours of trying, which outlasts any outage
 * worth waiting through and stops well short of sending a confirmation into a
 * conversation the member has long since given up on.
 */
export const MAX_DEFERRALS = 10;

/**
 * Resend's error codes for "this is us, not you". Anything else — a malformed
 * address, a rejected API key, a validation error — is a fact about the
 * request that will still be true in five minutes.
 *
 * `*_quota_exceeded` is here because it IS temporary, but it is temporary on a
 * different clock: see `quotaExceeded`, which the queue defers to the next
 * budget window rather than to the next few minutes.
 */
const TRANSIENT_CODES = new Set([
  "rate_limit_exceeded",
  "daily_quota_exceeded",
  "monthly_quota_exceeded",
  "application_error",
  "internal_server_error",
  "concurrent_idempotent_requests",
]);

/** Substrings of a thrown error's message that mean the network, not the mail. */
const TRANSIENT_MESSAGES = [
  "fetch failed",
  "timeout",
  "timed out",
  "econnreset",
  "econnrefused",
  "etimedout",
  "socket hang up",
  "network",
  "aborted",
];

export type MailErrorLike = {
  name?: string | null;
  statusCode?: number | null;
  message?: string | null;
};

/** Whether a failure should be waited out rather than counted against the row. */
export function isTransientMailError(err: MailErrorLike | null | undefined): boolean {
  if (!err) return false;
  if (err.name && TRANSIENT_CODES.has(err.name)) return true;
  // 429 and every 5xx, whatever the code happens to be called this year.
  if (typeof err.statusCode === "number" && (err.statusCode === 429 || err.statusCode >= 500)) {
    return true;
  }
  const message = (err.message ?? "").toLowerCase();
  return TRANSIENT_MESSAGES.some((m) => message.includes(m));
}

/**
 * Every reason `render()` can decline to build a message, as named constants.
 *
 * They live here, next to the rule that reads them, because the rule matches
 * on the STRING: with the words spelled out in one file and compared in
 * another, rewording the message would silently switch a retryable skip back
 * into a permanent failure, with nothing failing to say so. This is the same
 * drift-by-copy-paste the directory's `insensitive` helper exists to prevent.
 */
export const SKIP_TOKEN_RATE_LIMIT = "token rate limit";
export const SKIP_NO_USER = "no user on a token email";

/**
 * Whether a `render()` skip reason is worth waiting out rather than retiring
 * the row outright.
 *
 * "token rate limit" means auth-tokens.ts's own 60-minute mint window is
 * full. That clears on its own and says nothing about whether the address is
 * any good, so treating it the same as a permanent failure meant a row that
 * failed here for reasons that were never the member's fault could not be
 * resent: the next manual click just created a fresh row, which hit the
 * exact same window and failed the exact same way, and three or four system
 * retries of one message could burn most of an hour's mint budget before the
 * member's genuine next ask had anything left to spend (bug audit M52).
 *
 * Anything else -- today just "no user on a token email", a data problem no
 * amount of waiting fixes -- stays a real, immediate failure.
 */
export function isRetryableSkip(reason: string): boolean {
  return reason === SKIP_TOKEN_RATE_LIMIT;
}

/** Whether the provider says the day's (or month's) allowance is spent. */
export function quotaExceeded(err: MailErrorLike | null | undefined): boolean {
  if (!err) return false;
  return err.name === "daily_quota_exceeded" || err.name === "monthly_quota_exceeded";
}

/**
 * How long to wait before the nth deferral is eligible again.
 *
 * 1, 2, 5, 10, 20, 40 minutes and then an hour: fast enough that a blip costs
 * a member a minute, slow enough that a real outage is not hammered. Capped,
 * because an unbounded doubling turns a two-hour outage into a two-day delay.
 */
const SCHEDULE_MINUTES = [1, 2, 5, 10, 20, 40, 60];

export function retryDelayMs(deferrals: number): number {
  const i = Math.min(Math.max(deferrals, 0), SCHEDULE_MINUTES.length - 1);
  return SCHEDULE_MINUTES[i] * 60_000;
}

/**
 * A failure that is nobody's fault but still has to be counted somewhere gets
 * a flat wait. Short, because these are the ones a human may be watching for,
 * and the attempt ceiling already stops them repeating for long.
 */
export const ATTEMPT_RETRY_MS = 5 * 60_000;

/**
 * Which recipients THIS process is allowed to take out of the queue.
 *
 * `null` means "anybody", and ONLY production ever gets it. Every other
 * environment gets exactly one address: the owner's. An environment with no
 * `ADMIN_EMAIL` gets the empty string, which matches no row, because no queued
 * message is ever addressed to nothing.
 *
 * The problem it solves (bug audit M53): local dev and production share ONE
 * database, so the queue on this machine holds real members' verification and
 * password-reset mail. With `EMAIL_DEV_SEND=1` set -- which exists for the
 * deliberate case of checking how a template renders in a real inbox -- the
 * next page view on localhost drains whatever is queued and sends it, from the
 * production sending domain, to real people, off a half-finished branch.
 *
 * Applied at ROW SELECTION, never as a refusal inside the send. A refusal at
 * the send is a non-transient failure: the row would burn its attempts and end
 * up `failed`, which is the 2026-08-12 incident wearing a different hat. Not
 * claiming the row at all leaves it exactly as it was, for production to send.
 *
 * The empty-string case is the FAIL-CLOSED direction, and it is deliberate.
 * This function first returned `null` there, reasoning that `queueIsSendable`
 * had already decided the process may send -- but that gate looks only at
 * `EMAIL_DEV_SEND`, so a developer with the flag on and no `ADMIN_EMAIL` in
 * their env would have drained the whole real queue: the missing variable
 * reintroducing the exact incident the set one is guarded against
 * (write-path review, 2026-08-21). A stalled local queue is the harmless
 * failure; sending is not. `queueIsSendable` now refuses that environment
 * outright and says why, so this is the second of two locks on one door.
 */
export function localDrainRecipient(env: {
  NODE_ENV?: string;
  ADMIN_EMAIL?: string;
}): string | null {
  if (env.NODE_ENV === "production") return null;
  return env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}
