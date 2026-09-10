/* ------------------------------------------------------------------ *
 *  What gets written down when the bot check cannot answer for a
 *  sign-in.
 *
 *  Its own dependency-free file for the reason every `*-rule.ts` and
 *  `*-message.ts` here is one: node:test cannot load a module with
 *  relative value imports, and auth.ts pulls in half the app. The part
 *  worth pinning is the part that lives alone.
 *
 *  Two of the three inputs are ours. The third — `hint` — is the
 *  widget's own account of what went wrong, and it arrives through the
 *  sign-in POST, which means it arrives from whoever is calling: a
 *  browser that cannot pass the bot check is precisely the one whose
 *  word is worth least. It is recorded and never branched on, so the
 *  risk it carries is not a wrong decision but a poisoned record — a
 *  column read by eye in /admin/audit, and by whatever reads that table
 *  next. Hence the allowlist below rather than an escape: an unknown
 *  shape is dropped entirely, so nothing can be smuggled into the log
 *  by inventing a hint.
 * ------------------------------------------------------------------ */

/** The vocabulary the widget is allowed to use about itself. Anything else
 *  is discarded rather than trimmed: these are the only four states
 *  turnstile-widget.tsx can be in when it hands over no token, so a fifth
 *  is not a new failure mode, it is somebody typing into our audit log.
 *  `error-<code>` keeps Cloudflare's numeric code, which is the one piece
 *  of this that turns a report into a lookup (110200 is "domain not
 *  allowed"; it cost a whole session on 2026-08-28). */
const KNOWN_HINT = /^(timeout|blocked|error|error-[a-z0-9]{1,12})$/i;

/** Room for `why`, a slash, a hint and Cloudflare's own comma-separated
 *  error codes, inside the 120 the column is capped at. */
const MAX_DETAIL = 120;

/**
 * Compose the one string stored on a "bot-check" LoginAttempt row.
 *
 * `why` is the server's verdict (`no-token`, `refused`, `wrong-host`) and is
 * always present. `hint` is the browser's, and may be anything at all.
 * `detail` is Cloudflare's, from siteverify, and is ours only in the sense
 * that we read it off a response we made.
 */
export function botCheckDetail(
  why: string,
  hint: string | null | undefined,
  detail: string | null | undefined,
): string {
  const safeHint = hint && KNOWN_HINT.test(hint.trim()) ? hint.trim().toLowerCase() : null;
  // Cloudflare's codes are `[a-z-]` words joined by commas; anything outside
  // that is not something siteverify said, so it is not written down either.
  const safeDetail = detail ? detail.replace(/[^a-z0-9,.:!= _-]/gi, "").slice(0, 60).trim() : null;
  return `${why}${safeHint ? `/${safeHint}` : ""}${safeDetail ? ` (${safeDetail})` : ""}`.slice(
    0,
    MAX_DETAIL,
  );
}
