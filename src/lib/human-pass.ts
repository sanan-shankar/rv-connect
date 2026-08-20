import { cookies } from "next/headers";
import { appSecret } from "./app-secret";
import { signHumanPass, HUMAN_PASS_COOKIE, HUMAN_PASS_TTL_MS } from "./human-pass-rule";

/* ------------------------------------------------------------------ *
 *  The human pass: how a fresh signup or a completed password reset
 *  signs itself in without solving Turnstile twice in one minute.
 *
 *  Both flows end with the client calling signIn("credentials"), which
 *  lands in authorize() — where the bot check lives. The action that
 *  got them there has ALREADY proved a human (registerUser verified a
 *  Turnstile token; resetPassword consumed a single-use emailed link),
 *  so it mints this five-minute, httpOnly cookie and authorize accepts
 *  it in place of a second widget token.
 *
 *  What keeps it from becoming a login bypass: it is bound by HMAC to
 *  ONE email address, it expires in five minutes, and it replaces only
 *  the bot check — the password is still checked, the rate limits still
 *  count, the block still blocks. Holding a human pass and holding the
 *  right to sign in remain two different things.
 *
 *  The verifying half lives in human-pass-rule.ts (pure, unit-tested).
 * ------------------------------------------------------------------ */

/** Called by registerUser and resetPassword, never anywhere a human was
 *  not just proven. */
export async function mintHumanPass(email: string): Promise<void> {
  const jar = await cookies();
  jar.set(HUMAN_PASS_COOKIE, signHumanPass(email, Date.now(), appSecret()), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: HUMAN_PASS_TTL_MS / 1000,
    path: "/",
  });
}
