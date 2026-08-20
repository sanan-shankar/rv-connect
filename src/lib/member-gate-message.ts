/**
 * The string every gated action returns when the viewer's email is confirmed
 * but their profile has not yet been verified as a real member of the
 * community (the second gate of the trust model; audit H21).
 *
 * Its own dependency-free file for the same reason as EMAIL_UNVERIFIED in
 * email-gate-message.ts: both sides need it. The server returns it, and the
 * client dialog matches on it to know it should offer "ask to be verified"
 * rather than print the text as a plain error. Matched exactly, never by
 * keyword, and it reads as a complete sentence on its own so a surface that
 * has not been taught about the dialog degrades to simply showing it.
 */
export const MEMBER_UNVERIFIED =
  "Your profile is waiting to be verified. Posting and contact details open once that is done.";
