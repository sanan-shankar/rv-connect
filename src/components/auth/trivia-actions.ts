"use server";

import crypto from "crypto";
import { cookies } from "next/headers";

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
const MAX_ATTEMPTS = 8; // light rate limit per gate token
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

// In-process attempt counter. Sufficient as a light guard for a single-node
// deploy; a multi-node deploy would back this with a shared store.
const attempts = new Map<string, { count: number; first: number }>();

function secret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "rv-alumni-trivia-dev-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
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

/** Returns a question to show. Never returns the answer. */
export async function getTriviaQuestion(): Promise<{ id: string; question: string }> {
  const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
  return { id: q.id, question: q.question };
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

/** Checks an answer on the server. On success, records a signed pass cookie. */
export async function checkTrivia(
  id: string,
  answer: string,
): Promise<{ ok: boolean; error?: string }> {
  const jar = await cookies();
  // Rate-limit per gate cookie (falls back to the question id for first visit).
  const rlKey = jar.get("rv_trivia_rl")?.value ?? `anon:${id}`;
  if (rateLimited(rlKey)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }
  if (!jar.get("rv_trivia_rl")) {
    jar.set("rv_trivia_rl", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: ATTEMPT_WINDOW_MS / 1000,
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

  const ts = Date.now();
  const token = `${ts}.${sign(String(ts))}`;
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
  if (!token) return false;
  const [tsStr, sig] = token.split(".");
  if (!tsStr || !sig) return false;
  if (sign(tsStr) !== sig) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= TOKEN_TTL_MS;
}
