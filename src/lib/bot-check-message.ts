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
