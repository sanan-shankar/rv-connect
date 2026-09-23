"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { signStamp, stampValid } from "@/lib/human-pass-rule";
import { appSecret } from "@/lib/app-secret";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Server-side trivia gate.
 *
 * The question bank and the accepted answers live only on the server, so the
 * browser never sees the answer (the old client-only gate compared in the DOM).
 * A correct answer mints a short-lived signed token recorded in an httpOnly
 * cookie (triviaPassedAt) so the signup step can confirm the gate was actually
 * cleared. Attempts are lightly rate limited per gate token.
 */

type Question = {
  id: string;
  question: string;
  answers: string[];
  /**
   * Answers that are a sentence rather than a name: accepted when the guess
   * MENTIONS one of these, anywhere in it. Only the dinner question needs it.
   */
  contains?: string[];
  /**
   * Guesses turned away even when one edit from an accepted answer: the word
   * the question itself hands over. Only the folk dancing question needs it.
   */
  never?: string[];
};

/**
 * Accepted answers (widened 2026-08-04, owner). Three rules do most of the work
 * so these lists stay short and readable:
 *
 *   1. `normalize()` below strips spaces, punctuation, a leading "the" and a
 *      trailing "house"/"tree"/"valley", so one entry covers "BBT", "b.b.t.",
 *      "The Big Banyan Tree" and "cauvery house" alike. Entries here are
 *      already in that stripped form.
 *   2. `NEAR_MISS_MIN_LENGTH` lets an entry of 5+ characters match on a
 *      single typo (see `withinOneEdit`), which is what actually covers "any
 *      spelling variations" without anyone predicting every one of them:
 *      kavery, kaveree, cauvary and friends all land within one edit of a
 *      spelling below. Initialisms stay exact-match, because at three
 *      characters one edit is most of the word.
 *   3. A question whose answer is a plate of food rather than a name carries
 *      a `contains` list instead. "Egg curry and tomato rice", "just paneer"
 *      and "tomato rice I think" are the same answer, and enumerating the
 *      phrasings people use for a menu is a game nobody wins.
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
      "kaveree",
      "kauveri",
      "kauvery",
      "kaberi",
      "kabery",
      "caberi",
      "cabery",
    ],
  },
  {
    id: "caverock",
    question: "Which hill is most clearly visible from the games field?",
    answers: [
      "caverock",
      // said in full often enough to earn its own entry: normalize() takes a
      // trailing "house", "tree" and "valley" off, but not "hill"
      "caverockhill",
    ],
  },
  {
    id: "auditorium",
    question: "In which building are singing assemblies held?",
    answers: [
      "auditorium",
      "seniorauditorium",
      // what it is called out loud. "audi" is four characters, so it has to
      // land exactly; the longer entries carry the one-edit allowance
      "senioraudi",
      "audi",
    ],
  },
  {
    id: "thursdaydinner",
    question: "What is served for dinner on Thursdays?",
    // A menu, so it is answered by mention rather than by name (rule 3 above).
    // The one-edit allowance does not reach inside a sentence, which is why
    // the likelier misspellings are spelt out here instead of inferred.
    answers: [],
    contains: [
      "egg",
      "paneer",
      "paner",
      "panir",
      "panner",
      "tomatorice",
      "tomatoerice",
      "tomoatorice",
      "tamatorice",
    ],
  },
  {
    id: "tuckshop",
    question: "Which building has your fortnightly dose of chocolatey goodness?",
    answers: ["tuckshop", "grubtuck", "tuck"],
  },
  {
    id: "raavi",
    question: "Complete the list: Golden, Silver, Neem and _____?",
    // "Raavi valley" arrives here as "raavi", the suffix stripped. "ravi" is
    // four characters, so it is listed rather than left to the one-edit rule.
    answers: ["raavi", "ravi"],
  },
  {
    id: "roundhut",
    question: "Which hut was round?",
    answers: ["roundhut", "round"],
  },
  {
    id: "folkie",
    question: "What is folk dancing called here?",
    // "foki" and "fokee" are each one edit from "fokie", so they land on their
    // own. "foky" is four characters, so it is listed rather than inferred.
    // "folky" is one edit from "folk", the word the question itself hands
    // over, which is why "folk" is turned away by name.
    answers: ["folkie", "fokie", "folky", "foky"],
    never: ["folk"],
  },
  {
    id: "asthachal",
    question:
      "During which activity do you walk up a hill and sit quietly on a rock while the mosquitoes drain you?",
    // "asta" and "aastha" are one edit from "astha", but "ashta" is a
    // transposition, which withinOneEdit counts as two -- hence both spellings
    // of each length.
    answers: ["asthachal", "ashtachal", "astha", "ashta"],
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


/**
 * Reduce an answer to just its letters and digits, so spacing, capitalisation
 * and punctuation can never be the reason someone is turned away: "B.B.T.",
 * "b b t" and "bbt" all arrive here as the same three characters. A leading
 * "the" and a trailing "house"/"tree"/"valley" come off too, because "the
 * banyan tree", "cauvery house" and "Raavi valley" are how people naturally
 * answer these questions.
 */
function normalize(s: string): string {
  let out = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (out.startsWith("the")) out = out.slice(3);
  // Only strip the suffix when something is left in front of it, so a bare
  // "tree" stays "tree" (and stays wrong) instead of collapsing to "".
  for (const suffix of ["house", "tree", "valley"]) {
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
 * houses, or the reverse. No cost and no limit on swapping: every question
 * was always reachable by refreshing, so the button gives away nothing the
 * page did not.
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
      // HTTPS-only in production (Vercel is always TLS); left off in local
      // dev, which is plain http. Next does not add this on its own.
      secure: process.env.NODE_ENV === "production",
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
  const refused = q.never?.some((n) => normalize(n) === guess) ?? false;
  const named = !refused && q.answers.some((a) => {
    const candidate = normalize(a);
    if (candidate === guess) return true;
    return candidate.length >= NEAR_MISS_MIN_LENGTH && withinOneEdit(candidate, guess);
  });
  // A `contains` question is answered in a sentence, so it passes the moment
  // the guess mentions one of the things on the plate.
  const mentioned = q.contains?.some((c) => guess.includes(normalize(c))) ?? false;
  if (!named && !mentioned) {
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
  const browserId = jar.get("rv_trivia_id")?.value;
  if (!token || !browserId) return false;
  /* The expiry, the clock-skew rule and the constant-time compare are
     `stampValid`'s now, shared with the human pass rather than kept level
     with it by a comment. Same scheme, different label, subject and TTL. */
  return stampValid(token, "trivia", browserId, Date.now(), TOKEN_TTL_MS, appSecret());
}
