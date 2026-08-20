/**
 * The one signing secret for the app's own HMAC tokens (the trivia pass,
 * the post-signup human pass). NextAuth already refuses to boot without
 * AUTH_SECRET, so throwing here can only fire when someone strips the env
 * var while keeping the site up — and a loud crash is the correct answer
 * to that, because the previous behaviour was to fall back to a literal
 * printed in the public repo, which made every "signed" token forgeable
 * by anyone who could read GitHub (audit M7).
 */
export function appSecret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set; refusing to sign tokens without it.");
  return s;
}
