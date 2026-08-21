/**
 * The one sentence a failed bot check shows. Its own dependency-free file
 * for the same reason as rate-limit-message.ts: the server actions return
 * it, and the login form — which can only receive a CODE through NextAuth's
 * CredentialsSignin channel, never the thrown message — maps that code back
 * to this exact sentence, so the same refusal reads the same everywhere.
 * (turnstile.ts itself pulls in node crypto via the shared compare, so a
 * client component could not import the sentence from there.)
 */
export const BOT_CHECK_FAILED =
  "We couldn't confirm you're human. Refresh the page and try once more.";

/**
 * Shown INSTEAD of submitting when Cloudflare's checkbox is on screen and
 * unticked. Before this, the form waited out a 12-second token timeout and
 * then sent a request the server could only refuse — a hang, then a
 * confusing error (owner report, 2026-08-20). Same file, same reasoning:
 * all three auth forms show the identical sentence.
 */
export const TICK_HUMAN_BOX =
  'Please tick the "Verify you are human" box first.';

/**
 * Shown when the bot-check SCRIPT never loaded at all, rather than when the
 * challenge failed (audit M07).
 *
 * The distinction matters because the advice is opposite. A failed challenge
 * is worth another go; a blocked script is not, and BOT_CHECK_FAILED's
 * "refresh the page and try once more" was, for those visitors, a permanent
 * loop with a friendly voice. Naming the address is deliberate: it is the one
 * thing they can act on, and whoever has an extension or a network filter in
 * the way needs to know what to allow.
 */
export const BOT_CHECK_BLOCKED =
  "Something in this browser is blocking our security check, so we cannot let you in from here. " +
  "It loads from challenges.cloudflare.com: allow that address, or try another browser.";
