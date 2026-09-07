/**
 * "a****@gmail.com".
 *
 * Its own file, pure and importless, so any caller can take it without
 * dragging a mail library along: the copy that lived in src/lib/email.ts
 * carries the Resend SDK behind it.
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
