/**
 * The string every gated action returns when the viewer's address is not
 * confirmed.
 *
 * Its own dependency-free file because BOTH sides need it: the server returns
 * it, and the client dialog matches on it to know it should offer "send it
 * again" rather than print the text as a plain error. Reaching for it from
 * `email-verification.ts` would pull `auth()`, and with it NextAuth and Prisma,
 * into the browser bundle.
 *
 * Matched exactly, never by keyword, so an unrelated error that happens to
 * mention email cannot open the dialog by accident. It also reads as a
 * complete sentence on its own, so a surface that has not been taught about
 * the dialog degrades to simply showing it.
 */
// "Tap the link we emailed you", not "we sent you a link when you joined": on
// a launch day the link can leave a day or two after they did.
export const EMAIL_UNVERIFIED =
  "Confirm your email address before you post. Tap the link we emailed you.";
