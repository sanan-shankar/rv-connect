/**
 * "a****@gmail.com".
 *
 * Its own file, with no imports, because both sides need it: the server builds
 * the line for the banner, and the "check your inbox" screen masks the address
 * the visitor just typed. Reaching for the copy in src/lib/email.ts from a
 * client component would pull the Resend SDK into the browser bundle.
 *
 * First character and domain only. That is enough for someone to recognise
 * their own address and spot a typo in it, and not enough for the screen to
 * become a way of reading a stranger's.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "your address";
  const name = email.slice(0, at);
  const domain = email.slice(at);
  if (name.length <= 1) return `${name}***${domain}`;
  return `${name[0]}${"*".repeat(Math.min(name.length - 1, 4))}${domain}`;
}
