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

const TRIVIA_QUESTIONS: Question[] = [
  {
    id: "banyan",
    question: "What tree was the school built around?",
    answers: ["banyan", "the banyan", "banyan tree"],
  },
  {
    id: "cauvery",
    question: "What house is next to Krishna?",
    answers: ["cauvery", "kaveri", "cauvery house"],
  },
];

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

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
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
  if (!q.answers.some((a) => normalize(a) === guess)) {
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
