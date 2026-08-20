"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { appSecret } from "@/lib/app-secret";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { timingSafeEqualStrings } from "@/lib/timing-safe";

/**
 * Server-side trivia gate.
 *
 * The question bank and the accepted answers live only on the server, so the
 * browser never sees the answer (the old client-only gate compared in the DOM).
 * A correct answer mints a short-lived signed token recorded in an httpOnly
 * cookie (triviaPassedAt) so the signup step can confirm the gate was actually
 * cleared. Attempts are lightly rate limited per gate token.
 */

type Question = { id: string; question: string; answers: string[] };

/**
 * Accepted answers (widened 2026-08-04, owner). Two rules do most of the work
 * so these lists stay short and readable:
 *
 *   1. `normalize()` below strips spaces, punctuation, a leading "the" and a
 *      trailing "house"/"tree", so one entry covers "BBT", "b.b.t.",
 *      "The Big Banyan Tree" and "cauvery house" alike. Entries here are
 *      already in that stripped form.
 *   2. `NEAR_MISS_MIN_LENGTH` lets an entry of 5+ characters match on a
 *      single typo (see `withinOneEdit`), which is what actually covers "any
 *      spelling variations" without anyone predicting every one of them:
 *      kavery, kaveree, cauvary and friends all land within one edit of a
 *      spelling below. Initialisms stay exact-match, because at three
 *      characters one edit is most of the word.
 *
 * These are people who went to the school. The gate is there to stop a
 * stranger with a search engine, not to mark a spelling test.
 */
const TRIVIA_QUESTIONS: Question[] = [
  {
    id: "banyan",
    question: "What tree was the school built around?",
    answers: [
      // the plain answer and its common spellings
      "banyan",
      "banian",
      "banyon",
      "bunyan",
      // what people who were actually there call it
      "bigbanyan",
      "bbt",
      "kbt",
      "krishnamurtibanyan",
      "krishnamurthibanyan",
      "jkbanyan",
    ],
  },
  {
    id: "cauvery",
    question: "What house is next to Krishna?",
    answers: [
      // every spelling the owner listed, plus the ones a single edit away
      // from them is not guaranteed to reach (c/k and v/b both swap here)
      "cauvery",
      "cauveri",
      "caveri",
      "cavery",
      "kaveri",
      "kavery",
      "kauveri",
      "kauvery",
      "kaberi",
      "kabery",
      "caberi",
      "cabery",
    ],
  },
];

/** Below this length a one-edit allowance is most of the word, so don't. */
const NEAR_MISS_MIN_LENGTH = 5;

const TOKEN_TTL_MS = 30 * 60 * 1000; // a passed gate is good for 30 minutes

/* The attempt limit lives in src/lib/rate-limit.ts with everything else
   (audit M7). The old version here was an in-process Map keyed on a cookie
   the CALLER chose whether to send: omitting it collapsed every anonymous
   visitor into one shared bucket, so eight requests in a loop locked the
   front door for the whole site while the attacker rotated cookies past the
   limit entirely. Worse, the check ran BEFORE the cookie was issued, so the
   lockout landed precisely on genuine first-time visitors. Now the key is
   the caller's IP — not theirs to discard — in the shared store. */

/* No fallback secret. The previous version fell back to a literal string
   printed in this file, which made every "signed" pass token forgeable by
   anyone who could read the repository (audit M7). appSecret() throws
   instead, and NextAuth cannot boot without AUTH_SECRET anyway. */
function sign(payload: string): string {
  return crypto.createHmac("sha256", appSecret()).update(payload).digest("hex");
}

/**
 * Reduce an answer to just its letters and digits, so spacing, capitalisation
 * and punctuation can never be the reason someone is turned away: "B.B.T.",
 * "b b t" and "bbt" all arrive here as the same three characters. A leading
 * "the" and a trailing "house"/"tree" come off too, because "the banyan tree"
 * and "cauvery house" are how people naturally answer these two questions.
 */
function normalize(s: string): string {
  let out = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (out.startsWith("the")) out = out.slice(3);
  // Only strip the suffix when something is left in front of it, so a bare
  // "tree" stays "tree" (and stays wrong) instead of collapsing to "".
  for (const suffix of ["house", "tree"]) {
    if (out.length > suffix.length && out.endsWith(suffix)) {
      out = out.slice(0, -suffix.length);
      break;
    }
  }
  return out;
}

/**
 * True when `a` and `b` are at most one insertion, deletion or substitution
 * apart. Written as an early-exit walk rather than a full edit-distance matrix
 * because we only ever ask about a distance of one: scan together, and on the
 * first disagreement try the three single-edit repairs and require the rest to
 * match exactly.
 */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true; // identical
  const restA = a.slice(i);
  const restB = b.slice(i);
  return (
    restA.slice(1) === restB.slice(1) || // substitution
    restA.slice(1) === restB || // deletion from a
    restA === restB.slice(1) // insertion into a
  );
}

/**
 * Returns a question to show. Never returns the answer. Pass the current
 * question's id to get a DIFFERENT one — the gate offers a swap (owner,
 * 2026-08-20) for the person who knows the tree but never lived in the
 * houses, or the reverse. No cost and no limit on swapping: both questions
 * were always reachable by refreshing, so the button gives away nothing
 * the page did not.
 */
export async function getTriviaQuestion(
  excludeId?: string,
): Promise<{ id: string; question: string }> {
  const pool = TRIVIA_QUESTIONS.filter((q) => q.id !== excludeId);
  const bank = pool.length > 0 ? pool : TRIVIA_QUESTIONS;
  const q = bank[Math.floor(Math.random() * bank.length)];
  return { id: q.id, question: q.question };
}

/** Checks an answer on the server. On success, records a signed pass cookie. */
export async function checkTrivia(
  id: string,
  answer: string,
): Promise<{ ok: boolean; error?: string }> {
  const jar = await cookies();

  // Attempts are metered per IP in the shared store (see the note above).
  // The refusal is the shared sentence, not a hand-typed cousin of it.
  const limited = await rateLimit("trivia", await clientIp());
  if (!limited.ok) {
    return { ok: false, error: limited.error };
  }

  // A per-browser id the pass token below is signed AGAINST. Issued here,
  // before the answer is judged, so the very first attempt already has the
  // id its eventual pass will be bound to. It carries no limit and no
  // trust; it exists so a pass cookie lifted on its own is worthless.
  let browserId = jar.get("rv_trivia_id")?.value;
  if (!browserId) {
    browserId = crypto.randomUUID();
    jar.set("rv_trivia_id", browserId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: TOKEN_TTL_MS / 1000,
      path: "/",
    });
  }

  const q = TRIVIA_QUESTIONS.find((x) => x.id === id);
  if (!q) {
    return { ok: false, error: "That question expired. Please try again." };
  }

  const guess = normalize(answer);
  const accepted = q.answers.some((a) => {
    const candidate = normalize(a);
    if (candidate === guess) return true;
    return candidate.length >= NEAR_MISS_MIN_LENGTH && withinOneEdit(candidate, guess);
  });
  if (!accepted) {
    return { ok: false, error: "Not quite. Have another go." };
  }

  /* The pass is HMAC-bound to THIS browser's id cookie, not a bare
     timestamp. The old token signed the timestamp alone, so one solved
     gate was a 30-minute hall pass anyone could replay from anywhere
     (audit M7); this one is useless without the matching rv_trivia_id,
     which never leaves the browser it was minted in. */
  const ts = Date.now();
  const token = `${ts}.${sign(`trivia:${ts}:${browserId}`)}`;
  jar.set("rv_trivia_pass", token, {
    httpOnly: true,
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
  const browserId = jar.get("rv_trivia_id")?.value;
  if (!token || !browserId) return false;
  const [tsStr, sig] = token.split(".");
  if (!tsStr || !sig) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  // Expired, or dated in the future -- the same clock-skew paranoia
  // human-pass-rule.ts applies; a pass this server minted is never ahead
  // of its own clock by more than a minute.
  if (Date.now() - ts > TOKEN_TTL_MS || ts > Date.now() + 60_000) return false;
  // Recompute from what THIS request carries and compare constant-time
  // (the old check was a string ===, a timing oracle on the signature).
  return timingSafeEqualStrings(sign(`trivia:${ts}:${browserId}`), sig);
}
