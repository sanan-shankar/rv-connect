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
