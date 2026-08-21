/**
 * The one sentence a sign-in shows when the SITE, not the password, is the
 * problem: the database unreachable, a query timed out, the pool exhausted.
 *
 * Its own dependency-free file for the same reason as `rate-limit-message.ts`
 * and `bot-check-message.ts`. `authorize()` can only hand the login form a
 * CODE through NextAuth's CredentialsSignin channel, never a message, so the
 * form maps the code back to this exact sentence.
 *
 * It exists because the alternative was worse than useless: an outage used to
 * print "Invalid email or password." to somebody whose password was right,
 * which sends them to the reset flow, which needs the same database, which
 * fails the same way (bug audit M18). This sentence says whose fault it is
 * and what to do, and deliberately does not say "try again" without "in a
 * moment" -- hammering the button is the one thing that does not help.
 */
export const SIGN_IN_UNAVAILABLE =
  "We could not reach the site just now. This is us, not your password. Give it a moment and try again.";
