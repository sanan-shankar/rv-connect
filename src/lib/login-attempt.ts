import { after } from "next/server";
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

/* FAILURE ROWS ARE CAPPED, site-wide, at this many per rolling hour.
   Every refusal used to write its row whatever the limiter had decided, so a
   sign-in bot the limiter had already stopped still inserted one row per
   attempt, kept for a year: ~500 bytes each, which at ten attempts a second
   fills the Free plan's 500 MB in about a day, and Supabase then makes the
   whole database read-only (bug audit 3, L5-02). Real traffic was 39
   attempts in the fortnight to 2026-09-10, so no person ever meets this cap;
   a flood is held to ~60 KB an hour, and the rows it does write are still
   there to say a flood happened. Successful sign-ins are never capped. */
export const FAILURE_ROWS_PER_HOUR = 120;

export function recordLoginAttempt(input: {
  email: string;
  ok: boolean;
  reason: LoginReason;
  userId?: string | null;
  /** WHY, for the one reason whose cause is not visible from here. See the
   *  column comment in schema.prisma. Capped and stored verbatim; part of it
   *  is an untrusted hint from the browser, so it is written to be READ, never
   *  matched on and never used to decide anything. */
  detail?: string | null;
}): void {
  const write = async () => {
    try {
      if (!input.ok) {
        /* LIMIT inside, so the count stops at the cap instead of walking a
           flood's worth of rows; the range rides the createdAt index. */
        const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM (
            SELECT 1 FROM "LoginAttempt"
            WHERE NOT ok AND "createdAt" > now() - interval '1 hour'
            LIMIT ${FAILURE_ROWS_PER_HOUR}
          ) recent`;
        if (n >= FAILURE_ROWS_PER_HOUR) return;
      }
      await prisma.loginAttempt.create({
        data: {
          email: input.email.trim().toLowerCase().slice(0, 200),
          ok: input.ok,
          reason: input.reason,
          userId: input.userId ?? null,
          detail: input.detail ? input.detail.slice(0, 120) : null,
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[login-attempt] failed:", err);
      }
    }
  };
  /* Deliberately not awaited by the caller and deliberately not returning a
   * promise anyone can forget to catch. A statistics row must never be able to
   * delay, or fail, a sign-in.
   *
   * after(), not a bare `void`, for the same reason as every other site in
   * this cluster: Vercel can freeze or tear down the function the instant the
   * sign-in response streams, and a `void` write raced that teardown and
   * silently lost the row (bug audit Lows 25/35/44/72/77/82/87 -- the
   * unexplained gaps in /admin/analytics). The one thing that made `void`
   * defensible here -- authentication must survive this write failing -- is
   * exactly what after() also guarantees; it does not make the response wait.
   *
   * The try/catch below is the other half: authorize() in src/lib/auth.ts
   * always runs inside a request (the NextAuth route, or a login Server
   * Action), so after() should always find a request scope here, but this
   * file is a step removed from that call site with no way to enforce it stays
   * true. after() throws SYNCHRONOUSLY when there is no active request scope
   * (confirmed against the installed next@16.3.1 source,
   * node_modules/next/dist/server/after/after.js: "`after` was called outside
   * a request scope", error E468) -- an uncaught throw there would take
   * sign-in down with it, which is worse than the undercounting this fixes.
   * Guarded the same way src/lib/email-queue.ts's scheduleDrain() already
   * guards its own after() call: fall back to the original fire-and-forget
   * write rather than risk it. */
  try {
    after(write);
  } catch {
    void write();
  }
}
