import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  Record a sign-in attempt.
 *
 *  Called from the credentials provider in src/lib/auth.ts. It is
 *  ADDITIVE ONLY: it never changes what authorize() returns, never
 *  blocks, and never throws. Authentication behaviour is exactly what it
 *  was before this existed.
 *
 *  Never receives a password. The reason codes distinguish the three
 *  failures that need different help: a wrong ADDRESS, an account with
 *  no password set (an invited member who never finished signing up),
 *  and a wrong PASSWORD.
 * ------------------------------------------------------------------ */

/* "blocked" was added 2026-08-20 with audit H4. It is deliberately a distinct
   reason rather than folding into "wrong-password": a blocked member typing
   their correct password is a very different event from a stranger guessing,
   and the analytics room's "who cannot sign in" panel is the one place the
   owner would ever notice somebody locked out who should not be. */
/* "rate-limited" and "bot-check" were added 2026-08-20 with audit H6/H22.
   Distinct reasons for the same purpose as "blocked": a member turned away
   because a stuffing run spent their account's failure budget, or because
   their Turnstile token expired in a long-idle tab, is somebody the owner
   may need to help — and indistinguishable from "wrong-password" they
   would be invisible. */
export type LoginReason =
  | "ok"
  | "no-account"
  | "no-password-set"
  | "wrong-password"
  | "blocked"
  | "rate-limited"
  | "bot-check";

export function recordLoginAttempt(input: {
  email: string;
  ok: boolean;
  reason: LoginReason;
  userId?: string | null;
}): void {
  /* Deliberately not awaited by the caller and deliberately not returning a
   * promise anyone can forget to catch. A statistics row must never be able to
   * delay, or fail, a sign-in. */
  void prisma.loginAttempt
    .create({
      data: {
        email: input.email.trim().toLowerCase().slice(0, 200),
        ok: input.ok,
        reason: input.reason,
        userId: input.userId ?? null,
      },
    })
    .catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[login-attempt] failed:", err);
      }
    });
}
