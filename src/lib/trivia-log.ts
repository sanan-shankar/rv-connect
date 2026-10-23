import crypto from "crypto";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { IS_DEMO } from "@/lib/demo";
import { statsWritesEnabled } from "@/lib/stats-exclusion";
import { parseAgent } from "@/lib/last-seen";
import type { JudgeHow } from "@/lib/trivia-bank";

/* ------------------------------------------------------------------ *
 *  What happens at the trivia gate, written down.
 *
 *  Owner, 2026-10-23: "I want to know what people are typing in, which
 *  questions people don't like, which questions people like." Until this
 *  file the gate kept nothing at all. Read by /admin/trivia; the spec is
 *  docs/spec/admin.md §9.11.
 *
 *  ADDITIVE ONLY, like the sign-in log it is modelled on
 *  (src/lib/login-attempt.ts): nothing here can change what the gate
 *  answers, delay it, or fail it. Every write is behind after() and inside
 *  a try/catch, and a row that cannot be written is simply not written.
 *
 *  Pinned by src/lib/trivia-log-rule.test.mjs.
 * ------------------------------------------------------------------ */

export type TriviaKind = "shown" | "skipped" | "dontknow" | "wrong" | "right" | "limited";

export type TriviaEventInput = {
  kind: TriviaKind;
  questionId: string;
  /** What they typed, on the kinds that have words. Never on shown/skipped. */
  answer?: string | null;
  how?: JudgeHow | null;
  matched?: string | null;
};

/* ROWS ARE CAPPED, site-wide, at this many per rolling hour. The gate answers
   strangers by design and the swap arrow is unmetered, so without a ceiling a
   script could write rows as fast as it could call the action, and a full
   500 MB database turns read-only for everyone (the LoginAttempt lesson, bug
   audit 3 L5-02). Real traffic sets the number: the Centenary meet is ~1,000
   people, and an hour in which a hundred of them reach the gate at ~5 rows
   each is 500. A flood is held to roughly 250 KB an hour.

   The cap is SOFT, the same trade login-attempt.ts makes: the count and the
   insert are two statements, so calls landing in the same instant can each
   see room and each write, overshooting by about one row per concurrent
   call. That is a burst at the edge of an hour, not growth -- once the hour
   holds the cap, every later write is dropped until the window slides. */
export const TRIVIA_ROWS_PER_HOUR = 600;

/** Long enough for any real answer, short enough that a pasted essay is not kept. */
const ANSWER_MAX = 200;

/* The browser's gate id. It used to be issued on the first ANSWER and live 30
   minutes, which is all the pass cookie needed it for. It now arrives with the
   first QUESTION, so a person who looks and leaves is counted, and lives 30
   days, so a person who fails tonight and gets in tomorrow is one person in
   the room rather than two strangers. The pass token keeps its own 30-minute
   life (TOKEN_TTL_MS in trivia-actions.ts): a longer-lived id grants nothing,
   because the id was never a credential, only the thing a pass is bound to. */
export const TRIVIA_ID_COOKIE = "rv_trivia_id";
const TRIVIA_ID_MAX_AGE_S = 30 * 24 * 60 * 60;

/* The id is whatever cookie the caller sends, and it lands in every row, so
   only the shape this file mints is believed. Anything else (a 4 KB string
   somebody planted) is replaced, which also re-binds any pass to the new id:
   checkTrivia signs against what this returns, and hasPassedTrivia reads the
   cookie this sets. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** This browser's gate id, issued on the spot if it has none. */
export async function triviaBrowserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(TRIVIA_ID_COOKIE)?.value;
  if (existing && UUID.test(existing)) return existing;
  const id = crypto.randomUUID();
  jar.set(TRIVIA_ID_COOKIE, id, {
    httpOnly: true,
    // HTTPS-only in production (Vercel is always TLS); left off in local
    // dev, which is plain http. Next does not add this on its own.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TRIVIA_ID_MAX_AGE_S,
    path: "/",
  });
  return id;
}

/** Whether this deployment keeps a gate log at all. */
function logging(): boolean {
  return !IS_DEMO && statsWritesEnabled();
}

/**
 * Write what just happened at the gate, after the response has gone.
 *
 * The request is read NOW, not inside after(): headers() throws there
 * (last-seen.ts readPresence has the long version), and the write swallows
 * everything, so reading it late would lose every row in silence.
 */
export async function recordTrivia(browserId: string, events: TriviaEventInput[]): Promise<void> {
  if (!logging() || events.length === 0) return;
  const h = await headers();
  const { device } = parseAgent(h.get("user-agent") ?? "");
  /* Country only. A city is more than a person who has not joined has told
     anybody, and "is somebody abroad poking at the gate" needs no more. */
  const country = h.get("x-vercel-ip-country");

  /* Stamped here, a millisecond apart in the order given, rather than left
     to the column default: one insert would give a swap's skip and the next
     question the same instant, and the order is known now and lost after. */
  const at = Date.now();
  const rows = events.map((e, i) => ({
    createdAt: new Date(at + i),
    browserId,
    questionId: e.questionId.slice(0, 40),
    kind: e.kind,
    answer: e.answer ? e.answer.trim().slice(0, ANSWER_MAX) || null : null,
    how: e.how ?? null,
    matched: e.matched ? e.matched.slice(0, 60) : null,
    device,
    country,
  }));

  const write = async () => {
    try {
      /* LIMIT inside, so the count stops at the cap instead of walking a
         flood's worth of rows; the range rides the createdAt index. */
      const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM (
          SELECT 1 FROM "TriviaEvent"
          WHERE "createdAt" > now() - interval '1 hour'
          LIMIT ${TRIVIA_ROWS_PER_HOUR}
        ) recent`;
      if (n >= TRIVIA_ROWS_PER_HOUR) return;
      await prisma.triviaEvent.createMany({ data: rows });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error("[trivia-log] failed:", err);
    }
  };
  /* after() throws synchronously outside a request scope; every caller here
     is a server action, but a statistics row must never be the thing that
     takes the gate down, so fall back to fire-and-forget. */
  try {
    after(write);
  } catch {
    void write();
  }
}

/**
 * Stamp this browser's gate rows with the member it just became.
 *
 * Called from registerUser once the account exists. It is what turns
 * "somebody typed kaveri" into a name and a batch, and what lets the room
 * split every number by generation.
 *
 * Only the last LINK_WINDOW_DAYS are claimed. The id lives 30 days, and on a
 * family or library computer the browser's older rows can be somebody else's
 * tries: the father who gave up last week is not the daughter joining today.
 * Three days still covers the case the long id exists for, failing one
 * evening and getting in the next.
 */
const LINK_WINDOW_DAYS = 3;

export async function linkTriviaToMember(userId: string): Promise<void> {
  if (!logging()) return;
  const browserId = (await cookies()).get(TRIVIA_ID_COOKIE)?.value;
  if (!browserId) return;
  const since = new Date(Date.now() - LINK_WINDOW_DAYS * 86_400_000);
  const write = async () => {
    try {
      await prisma.triviaEvent.updateMany({
        where: { browserId, userId: null, createdAt: { gte: since } },
        data: { userId },
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error("[trivia-log] link failed:", err);
    }
  };
  try {
    after(write);
  } catch {
    void write();
  }
}

/** Answers accepted from the admin room for one question, normalised. Never throws. */
export async function addedAnswers(questionId: string): Promise<string[]> {
  try {
    const rows = await prisma.triviaAnswer.findMany({
      where: { questionId },
      select: { answer: true },
    });
    return rows.map((r) => r.answer);
  } catch {
    /* The gate must answer even if this table cannot be read: the bank alone
       is how it worked before the table existed. */
    return [];
  }
}
