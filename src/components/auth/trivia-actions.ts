"use server";

import { cookies } from "next/headers";
import { signStamp, stampValid } from "@/lib/human-pass-rule";
import { appSecret } from "@/lib/app-secret";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { TRIVIA_QUESTIONS, judge, questionById } from "@/lib/trivia-bank";
import {
  TRIVIA_ID_COOKIE,
  addedAnswers,
  recordTrivia,
  triviaBrowserId,
  type TriviaEventInput,
} from "@/lib/trivia-log";

/**
 * Server-side trivia gate.
 *
 * The question bank and the accepted answers live only on the server, so the
 * browser never sees the answer (the old client-only gate compared in the DOM).
 * A correct answer mints a short-lived signed token recorded in an httpOnly
 * cookie (triviaPassedAt) so the signup step can confirm the gate was actually
 * cleared. Attempts are lightly rate limited per gate token.
 *
 * The bank and the judge live in src/lib/trivia-bank.ts (2026-10-23), and
 * everything that happens here is written down by src/lib/trivia-log.ts for
 * /admin/trivia. The log is additive: it never changes an answer.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // a passed gate is good for 30 minutes

/* The attempt limit lives in src/lib/rate-limit.ts with everything else
   (audit M7). The old version here was an in-process Map keyed on a cookie
   the CALLER chose whether to send: omitting it collapsed every anonymous
   visitor into one shared bucket, so eight requests in a loop locked the
   front door for the whole site while the attacker rotated cookies past the
   limit entirely. Worse, the check ran BEFORE the cookie was issued, so the
   lockout landed precisely on genuine first-time visitors. Now the key is
   the caller's IP — not theirs to discard — in the shared store. */

/**
 * Returns a question to show. Never returns the answer. Pass the current
 * question's id to get a DIFFERENT one — the gate offers a swap (owner,
 * 2026-08-20) for the person who knows the tree but never lived in the
 * houses, or the reverse. No cost and no limit on swapping: every question
 * was always reachable by refreshing, so the button gives away nothing the
 * page did not.
 *
 * `said` is what they typed when the swap came from an "I don't know"
 * (trivia-dont-know.ts judges that in the browser, so this is the one place
 * the words can reach the log). Both arguments come from the caller and are
 * trusted for nothing: an unknown id records nothing, and `said` is capped
 * by the log.
 */
export async function getTriviaQuestion(
  excludeId?: string,
  said?: string,
): Promise<{ id: string; question: string }> {
  const pool = TRIVIA_QUESTIONS.filter((q) => q.id !== excludeId);
  const bank = pool.length > 0 ? pool : TRIVIA_QUESTIONS;
  const q = bank[Math.floor(Math.random() * bank.length)];

  const browserId = await triviaBrowserId();
  const events: TriviaEventInput[] = [];
  if (typeof excludeId === "string" && questionById(excludeId)) {
    const words = typeof said === "string" ? said : "";
    events.push(
      words.trim()
        ? { kind: "dontknow", questionId: excludeId, answer: words }
        : { kind: "skipped", questionId: excludeId },
    );
  }
  events.push({ kind: "shown", questionId: q.id });
  await recordTrivia(browserId, events);

  return { id: q.id, question: q.question };
}

/** Checks an answer on the server. On success, records a signed pass cookie. */
export async function checkTrivia(
  id: string,
  answer: string,
): Promise<{ ok: boolean; error?: string }> {
  const jar = await cookies();

  // A per-browser id the pass token below is signed AGAINST. Issued before
  // the answer is judged (and normally already issued with the question), so
  // the very first attempt already has the id its eventual pass will be
  // bound to. It carries no limit and no trust; it exists so a pass cookie
  // lifted on its own is worthless.
  const browserId = await triviaBrowserId();
  const q = questionById(id);
  const typed = typeof answer === "string" ? answer : "";

  // Attempts are metered per IP in the shared store (see the note above).
  // The refusal is the shared sentence, not a hand-typed cousin of it.
  const limited = await rateLimit("trivia", await clientIp());
  if (!limited.ok) {
    if (q) await recordTrivia(browserId, [{ kind: "limited", questionId: q.id, answer: typed }]);
    return { ok: false, error: limited.error };
  }

  if (!q) {
    return { ok: false, error: "That question expired. Please try again." };
  }

  const verdict = judge(q, typed, await addedAnswers(q.id));
  await recordTrivia(browserId, [
    {
      kind: verdict.ok ? "right" : "wrong",
      questionId: q.id,
      answer: typed,
      how: verdict.how,
      matched: verdict.matched,
    },
  ]);
  if (!verdict.ok) {
    return { ok: false, error: "Not quite. Have another go." };
  }

  /* The pass is HMAC-bound to THIS browser's id cookie, not a bare
     timestamp. The old token signed the timestamp alone, so one solved
     gate was a 30-minute hall pass anyone could replay from anywhere
     (audit M7); this one is useless without the matching rv_trivia_id,
     which never leaves the browser it was minted in. */
  /* No fallback secret. An earlier version fell back to a literal string
     printed in this file, which made every "signed" pass forgeable by
     anyone who could read the repository (audit M7). appSecret() throws
     instead, and NextAuth cannot boot without AUTH_SECRET anyway. */
  const token = signStamp("trivia", browserId, Date.now(), appSecret());
  jar.set("rv_trivia_pass", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL_MS / 1000,
    path: "/",
  });
  return { ok: true };
}

/** Server-side verification the gate was cleared (used by signup). */
export async function hasPassedTrivia(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get("rv_trivia_pass")?.value;
  const browserId = jar.get(TRIVIA_ID_COOKIE)?.value;
  if (!token || !browserId) return false;
  /* The expiry, the clock-skew rule and the constant-time compare are
     `stampValid`'s now, shared with the human pass rather than kept level
     with it by a comment. Same scheme, different label, subject and TTL. */
  return stampValid(token, "trivia", browserId, Date.now(), TOKEN_TTL_MS, appSecret());
}
