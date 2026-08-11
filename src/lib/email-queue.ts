import { prisma } from "./prisma";
import { IS_DEMO } from "./demo";
import { appUrl, sendMail } from "./email";
import {
  passwordChangedTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
  type BuiltEmail,
} from "./email-templates";
import { TOKEN_TTL_MINUTES, mintToken } from "./auth-tokens";

/* ------------------------------------------------------------------ *
 *  The outbound mail queue.
 *
 *  Resend's free plan sends 100 messages a day. The owner expects more
 *  than 100 signups on the first day of launch and is not willing to cap
 *  who can join, so nothing is mailed inline: every message becomes a
 *  row and a drain pass sends what today's budget allows.
 *
 *  Three things this has to get right, and each is a real failure mode
 *  rather than a hypothetical:
 *
 *  1. A password reset must NEVER queue behind a hundred welcome
 *     emails. Somebody who cannot sign in is stuck right now, where a
 *     confirmation can wait a day and cost nobody anything. Handled by
 *     `priority` plus a slice of the daily budget that only resets may
 *     spend (RESET_RESERVE).
 *
 *  2. A link must not arrive dead. Tokens are minted HERE, at the moment
 *     of sending, so a confirmation that waited two days still lands
 *     with its full day of life ahead of it. This is the whole reason
 *     the queue row stores template ingredients rather than a finished
 *     message.
 *
 *  3. The app must not tell somebody to check an inbox we have not
 *     written to yet. `verificationMailState` below is what the banner
 *     reads, and it distinguishes "sent, go and look" from "queued, it
 *     is coming" in as many words.
 *
 *  There is no cron on this project. The drain is called opportunis-
 *  tically from the authenticated layout, the same lazy-tick pattern
 *  `advanceDueCatchups` already uses, and runs inside `after()` so it
 *  never delays a page.
 * ------------------------------------------------------------------ */

export type MailKind = "verify" | "reset" | "password-changed";

/** Lower sends first.
 *
 *  A reset is somebody locked out at this moment. The password-changed notice
 *  is the only warning a person gets that their account was taken, so it goes
 *  out close behind. A welcome confirmation is the one thing here that can
 *  honestly wait, which is fortunate, because it is also the one that arrives
 *  in hundreds. */
const PRIORITY: Record<MailKind, number> = {
  reset: 10,
  "password-changed": 20,
  verify: 100,
};

/**
 * Messages we will send in one UTC day.
 *
 * 95 rather than 100: Resend counts what IT accepted, and a retry after a
 * network timeout can land as a second accepted message where we recorded
 * none. Five in hand means a miscount tips into a slower day rather than into
 * hard rejections, which would fail the messages that matter most.
 */
const DAILY_CAP = 95;

/**
 * Of that budget, the tail that only resets and security notices may spend.
 *
 * Without it, launch day works out as: 95 welcome emails go out in the
 * morning, and the first person who forgets their password that afternoon
 * cannot get back in until tomorrow. 20 is far more than a day's resets for a
 * community this size, and the cost of reserving it is that 20 confirmations
 * slip a day, which nobody experiences as being stuck.
 */
const RESET_RESERVE = 20;

/** Sent per drain pass. Resend also rate-limits to a couple of requests a
 *  second, and this runs inside a page request's `after()`, so a pass stays
 *  small and the next page view picks up where it left off. */
const BATCH = 8;

/** A row claimed but not finished within this long is assumed to belong to a
 *  process that died mid-send, and is returned to the queue. Long enough that
 *  a slow Resend call is never mistaken for a crash. */
const STALE_CLAIM_MS = 2 * 60_000;

/** Give up after this many tries. A permanently bad address (someone typed
 *  `gmial`) must not be retried forever against a budget other people need. */
const MAX_ATTEMPTS = 4;

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export interface Budget {
  /** Sent since midnight UTC. */
  used: number;
  /** Total left today, resets included. */
  remaining: number;
  /** Left for confirmations, i.e. `remaining` minus the untouched reserve. */
  verifyRemaining: number;
}

/**
 * What is left of today.
 *
 * Counted off `sentAt` rather than a counter column, so it cannot drift out of
 * step with what actually went out, and so it self-corrects at UTC midnight
 * with no scheduled job to roll it over. Resend's own daily window is UTC,
 * which is why this is not the local day.
 */
export async function dailyBudget(): Promise<Budget> {
  const used = await prisma.outboundEmail.count({
    where: { status: "sent", sentAt: { gte: startOfUtcDay() } },
  });
  const remaining = Math.max(0, DAILY_CAP - used);
  return {
    used,
    remaining,
    verifyRemaining: Math.max(0, remaining - RESET_RESERVE),
  };
}

/** How often one account may put the same kind of message in the queue.
 *  This is the ENQUEUE limit, and it is separate from the token limit in
 *  auth-tokens.ts: that one guards how many links exist, this one guards how
 *  much of a shared 100-a-day budget one person can consume. Without it,
 *  holding down "resend" on launch day is a denial of service against everyone
 *  else's welcome email. */
const ENQUEUE_LIMIT: Record<MailKind, { max: number; windowMinutes: number }> = {
  reset: { max: 4, windowMinutes: 30 },
  verify: { max: 5, windowMinutes: 60 },
  "password-changed": { max: 6, windowMinutes: 60 },
};

/**
 * Put a message in the queue.
 *
 * Callers do not await a send and cannot learn whether one happened: by
 * design, because on a busy day it will not have. Ask `verificationMailState`.
 *
 * A verify or reset for somebody who already has one WAITING is folded into
 * the existing row rather than added beside it. Pressing "resend" three times
 * while the queue is backed up should not spend three of the day's hundred to
 * say one thing, and on launch day each of those is somebody else's welcome
 * email. A `password-changed` notice is never folded: two password changes are
 * two things that happened, and the second is exactly the one you need to see.
 */
export async function enqueueMail(input: {
  kind: MailKind;
  to: string;
  userId?: string | null;
  payload?: Record<string, string>;
}): Promise<{ queued: boolean; id?: string; reason?: "rate-limited" | "demo" }> {
  // The demo has no mailbox and must never write to the real sending domain.
  if (IS_DEMO) return { queued: false, reason: "demo" };

  const foldable = input.kind === "verify" || input.kind === "reset";

  if (foldable && input.userId) {
    const waiting = await prisma.outboundEmail.findFirst({
      where: {
        userId: input.userId,
        kind: input.kind,
        status: { in: ["queued", "sending"] },
      },
      select: { id: true },
    });
    if (waiting) return { queued: true, id: waiting.id };
  }

  if (input.userId) {
    const limit = ENQUEUE_LIMIT[input.kind];
    const since = new Date(Date.now() - limit.windowMinutes * 60_000);
    const recent = await prisma.outboundEmail.count({
      where: { userId: input.userId, kind: input.kind, createdAt: { gte: since } },
    });
    if (recent >= limit.max) return { queued: false, reason: "rate-limited" };
  }

  const row = await prisma.outboundEmail.create({
    data: {
      kind: input.kind,
      to: input.to,
      userId: input.userId ?? null,
      priority: PRIORITY[input.kind],
      payload: input.payload ? JSON.stringify(input.payload) : null,
    },
    select: { id: true },
  });
  return { queued: true, id: row.id };
}

/** Build the actual message, minting whatever token it needs right now. */
async function render(row: {
  id: string;
  kind: string;
  to: string;
  userId: string | null;
  payload: string | null;
}): Promise<BuiltEmail | { skip: string }> {
  const payload: Record<string, string> = row.payload ? JSON.parse(row.payload) : {};
  const name = payload.name ?? "there";

  if (row.kind === "password-changed") {
    return passwordChangedTemplate({ name });
  }

  if (!row.userId) return { skip: "no user on a token email" };

  // The token is born HERE, so its clock starts when the message leaves rather
  // than when it was queued.
  const kind = row.kind === "reset" ? "reset" : "verify";
  const minted = await mintToken(row.userId, kind, row.to);
  if (!minted.ok) {
    // Rate limited at the token layer. Not an error worth burning an attempt
    // on: it means this person has been issued several links very recently and
    // one of them is almost certainly still live in their inbox.
    return { skip: "token rate limit" };
  }

  if (kind === "reset") {
    return resetPasswordTemplate({
      name,
      email: row.to,
      url: appUrl(`/reset-password?token=${encodeURIComponent(minted.token)}`),
      minutes: TOKEN_TTL_MINUTES.reset,
    });
  }
  return verifyEmailTemplate({
    name,
    url: appUrl(`/verify-email?token=${encodeURIComponent(minted.token)}`),
    hours: Math.round(TOKEN_TTL_MINUTES.verify / 60),
  });
}

export interface DrainReport {
  sent: number;
  failed: number;
  /** True when there is more waiting than today's budget could take. */
  backlog: boolean;
}

/**
 * Send what today's budget allows. Safe to call from anywhere, as often as you
 * like: it claims rows before sending, so a hundred simultaneous page views
 * cannot mail the same person a hundred times.
 */
export async function drainMailQueue(): Promise<DrainReport> {
  if (IS_DEMO) return { sent: 0, failed: 0, backlog: false };
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
    return { sent: 0, failed: 0, backlog: false };
  }

  // Reclaim anything a dead process left mid-flight.
  await prisma.outboundEmail.updateMany({
    where: { status: "sending", claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
    data: { status: "queued", claimedAt: null },
  });

  const budget = await dailyBudget();
  if (budget.remaining === 0) {
    const waiting = await prisma.outboundEmail.count({ where: { status: "queued" } });
    return { sent: 0, failed: 0, backlog: waiting > 0 };
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < BATCH; i++) {
    const live = await dailyBudget();
    if (live.remaining === 0) break;

    // Confirmations stop at the reserve line; resets and security notices may
    // spend all the way down. Expressed as a filter on which kinds are even
    // eligible, so the reserve cannot be nibbled away by a long verify run.
    const eligibleKinds =
      live.verifyRemaining > 0 ? ["verify", "reset", "password-changed"] : ["reset", "password-changed"];

    const next = await prisma.outboundEmail.findFirst({
      where: { status: "queued", kind: { in: eligibleKinds }, attempts: { lt: MAX_ATTEMPTS } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { id: true, kind: true, to: true, userId: true, payload: true },
    });
    if (!next) break;

    // Claim it. Conditional on still being queued, so of two racing drains
    // exactly one gets the row and the other moves on.
    const claimed = await prisma.outboundEmail.updateMany({
      where: { id: next.id, status: "queued" },
      data: { status: "sending", claimedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    // Read back the incremented count so a failure below can decide between
    // another try and giving up, without re-deriving it from the pre-claim row.
    const attempted = await prisma.outboundEmail.findUnique({
      where: { id: next.id },
      select: { attempts: true },
    });
    const spent = attempted?.attempts ?? MAX_ATTEMPTS;
    // A row that has used its last attempt stops being retried, so one bad
    // address cannot keep spending a budget other people are waiting on.
    const afterFailure = spent >= MAX_ATTEMPTS ? "failed" : "queued";

    try {
      const built = await render(next);

      if ("skip" in built) {
        // Nothing to send and nothing wrong. Retire the row rather than leave
        // it to be retried against a budget other people need.
        await prisma.outboundEmail.update({
          where: { id: next.id },
          data: { status: "failed", lastError: built.skip },
        });
        continue;
      }

      const result = await sendMail({ to: next.to, ...built });

      if (result.ok) {
        await prisma.outboundEmail.update({
          where: { id: next.id },
          data: { status: "sent", sentAt: new Date(), claimedAt: null, lastError: null },
        });
        sent++;
      } else {
        failed++;
        await prisma.outboundEmail.update({
          where: { id: next.id },
          data: {
            status: afterFailure,
            claimedAt: null,
            lastError: result.error ?? "send failed",
          },
        });
      }
    } catch (err) {
      failed++;
      await prisma.outboundEmail.update({
        where: { id: next.id },
        data: {
          status: afterFailure,
          claimedAt: null,
          lastError: err instanceof Error ? err.message : "unknown",
        },
      });
    }
  }

  const waiting = await prisma.outboundEmail.count({ where: { status: "queued" } });
  return { sent, failed, backlog: waiting > 0 };
}

/** The daily ceiling, exported so the admin panel can show the budget rather
 *  than a bare count with no denominator. */
export const MAIL_DAILY_CAP = DAILY_CAP;

/** Queue health for the admin panel: what today has spent, what is still
 *  waiting on it, and what gave up. "Gave up" is the only one that needs a
 *  human, and it is almost always a mistyped address. */
export async function mailHealth(): Promise<{
  sentToday: number;
  dailyCap: number;
  waiting: number;
  failed: number;
}> {
  const [sentToday, waiting, failed] = await Promise.all([
    prisma.outboundEmail.count({
      where: { status: "sent", sentAt: { gte: startOfUtcDay() } },
    }),
    prisma.outboundEmail.count({ where: { status: { in: ["queued", "sending"] } } }),
    prisma.outboundEmail.count({ where: { status: "failed" } }),
  ]);
  return { sentToday, dailyCap: DAILY_CAP, waiting, failed };
}

export type VerificationMailState =
  /** The link is in their inbox. Safe to say "go and look". */
  | { state: "sent"; at: Date }
  /** Written down, not yet sent. Say it is coming; do NOT say check your inbox. */
  | { state: "queued"; aheadOfYou: number }
  /** Tried and gave up (a bad address, usually). Offer to try again. */
  | { state: "failed" }
  /** Nothing on file. Offer to send one. */
  | { state: "none" };

/**
 * Has this person's confirmation actually left the building?
 *
 * The owner's instruction, verbatim: they should be "asked to verify only
 * after the email is definitely sent". So the banner, the dialog and the
 * verify page all read this rather than assuming that signing up means a
 * message exists. Telling somebody to check an inbox we have not written to
 * yet is how a working queue reads as a broken product.
 */
export async function verificationMailState(userId: string): Promise<VerificationMailState> {
  const row = await prisma.outboundEmail.findFirst({
    where: { userId, kind: "verify" },
    orderBy: { createdAt: "desc" },
    select: { status: true, sentAt: true, priority: true, createdAt: true },
  });

  if (!row) return { state: "none" };
  if (row.status === "sent" && row.sentAt) return { state: "sent", at: row.sentAt };
  if (row.status === "failed") return { state: "failed" };

  // Queued or sending. How many are in front of them, so the wait can be
  // described honestly instead of as an indefinite "soon".
  const aheadOfYou = await prisma.outboundEmail.count({
    where: {
      status: { in: ["queued", "sending"] },
      OR: [
        { priority: { lt: row.priority } },
        { priority: row.priority, createdAt: { lt: row.createdAt } },
      ],
    },
  });
  return { state: "queued", aheadOfYou };
}
