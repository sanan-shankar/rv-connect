import { after } from "next/server";
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
 *  3. The app must not lie about where a message is. `verificationMail-
 *     State` below is what the banner reads, and it does not merely
 *     report: with budget available it SENDS the pending row before
 *     answering, so "we've hit today's email limit" is impossible to
 *     render on a day that has budget left. That closes the 2026-08-13
 *     incident, where a fresh signup was shown the limit message as the
 *     third email of a ninety-five-email day.
 *
 *  There is no cron on this project. Sends are triggered at enqueue
 *  time (`scheduleDrain`), at first page view (`verificationMailState`),
 *  and by the authenticated layout's `after()` backstop, in that order
 *  of likelihood; the claim in `claimAndSend` is what lets all three
 *  race safely.
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

/**
 * True when THIS process is allowed to move mail out of the queue.
 *
 * All or nothing: a process that cannot genuinely send (the demo, a dev
 * machine without EMAIL_DEV_SEND=1, production missing its key) must not touch
 * queued rows at all, because a drain that "sends" without sending is how real
 * members' mail got marked sent off a console.log (2026-08-12).
 *
 * Production without a key logs an error EVERY time it declines, rather than
 * returning quietly. The quiet version meant a misnamed Vercel env var
 * produced no sends and no evidence: the queue just grew, and the first
 * symptom anyone saw was a member asking where their email was.
 */
function queueIsSendable(): boolean {
  if (IS_DEMO) return false;
  if (process.env.NODE_ENV === "production") {
    if (!process.env.RESEND_API_KEY) {
      console.error(
        "[email] RESEND_API_KEY is not set in this environment; queued mail cannot send. " +
          "Check the Vercel env var is named exactly RESEND_API_KEY and redeploy.",
      );
      return false;
    }
    return true;
  }
  return process.env.EMAIL_DEV_SEND === "1";
}

/** The fields `claimAndSend` needs off a queue row. */
interface QueueRow {
  id: string;
  kind: string;
  to: string;
  userId: string | null;
  payload: string | null;
}

type SendOutcome = "sent" | "requeued" | "failed" | "lost-claim";

/**
 * Claim one queued row and send it, atomically enough to be called from
 * anywhere: the claim is a conditional update, so of two processes racing for
 * the same row exactly one sends and the other reports "lost-claim". This is
 * the ONE piece of code that moves a row out of "queued" - the drain loop and
 * the page-load self-heal both go through it, so there is no second copy of
 * the bookkeeping to drift.
 */
async function claimAndSend(row: QueueRow): Promise<SendOutcome> {
  const claimed = await prisma.outboundEmail.updateMany({
    where: { id: row.id, status: "queued" },
    data: { status: "sending", claimedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return "lost-claim";

  // Read back the incremented count so a failure below can decide between
  // another try and giving up. A row on its last attempt stops being retried,
  // so one bad address cannot keep spending budget other people are waiting on.
  const attempted = await prisma.outboundEmail.findUnique({
    where: { id: row.id },
    select: { attempts: true },
  });
  const spent = attempted?.attempts ?? MAX_ATTEMPTS;
  const afterFailure = spent >= MAX_ATTEMPTS ? "failed" : "queued";

  try {
    const built = await render(row);

    if ("skip" in built) {
      // Nothing to send and nothing wrong (token rate limit, usually). Retire
      // the row rather than leave it to retry against a shared budget.
      await prisma.outboundEmail.update({
        where: { id: row.id },
        data: { status: "failed", lastError: built.skip },
      });
      return "failed";
    }

    const result = await sendMail({ to: row.to, ...built });

    if (result.ok) {
      await prisma.outboundEmail.update({
        where: { id: row.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          claimedAt: null,
          lastError: null,
          // Resend's id for the message. "sent" only means Resend accepted it;
          // this is what lets the delivery webhook come back later and say
          // whether it actually landed. See the delivery columns on the model.
          providerId: result.providerId ?? null,
        },
      });
      // One line of record per real send, with the ORIGIN its links were built
      // against (never the token). Exists because "which link did Nirad's
      // email actually carry" took a forensic reconstruction on 2026-08-13:
      // the Resend key is send-only, so the provider cannot answer, and the
      // row does not store the rendered body. With this, the answer is one
      // grep of the server logs.
      console.info(
        `[email] sent kind=${row.kind} to=${row.to} origin=${appUrl("/")} row=${row.id}`,
      );
      return "sent";
    }

    await prisma.outboundEmail.update({
      where: { id: row.id },
      data: { status: afterFailure, claimedAt: null, lastError: result.error ?? "send failed" },
    });
    return afterFailure === "failed" ? "failed" : "requeued";
  } catch (err) {
    await prisma.outboundEmail.update({
      where: { id: row.id },
      data: {
        status: afterFailure,
        claimedAt: null,
        lastError: err instanceof Error ? err.message : "unknown",
      },
    });
    return afterFailure === "failed" ? "failed" : "requeued";
  }
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

  // Send it NOW. The queue exists to survive the 100-a-day ceiling, not to
  // hold mail back for its own sake, so the default is immediate and the only
  // thing that ever defers a message is the budget genuinely being spent.
  //
  // This used to be left to the lazy tick in the authenticated layout, which
  // meant a signup at 06:05 sat unsent until somebody happened to load a page
  // five hours later (owner, 2026-08-12: Nirad's confirmation, then Sanjula's
  // still queued with the day's budget barely touched). Nudging from here
  // rather than from each caller is what stops the next new send path from
  // quietly reintroducing the same wait.
  scheduleDrain();

  return { queued: true, id: row.id };
}

/**
 * Run a drain pass without making the caller wait for it.
 *
 * `after()` is the right tool inside a request: the person gets their response
 * and the mail goes out immediately behind it. Outside one (a script, a test,
 * the seed) `after()` throws, so this falls back to firing the promise off
 * directly. Either way nothing here is awaited and nothing here can fail the
 * action that triggered it.
 */
function scheduleDrain(): void {
  const run = async () => {
    try {
      await drainMailQueue();
    } catch (err) {
      console.error("[email] drain failed", err);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
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
  // All-or-nothing (see queueIsSendable): either this process really sends, or
  // it leaves the queue completely alone for one that does. This database is
  // shared by production and local dev, so the rows here belong to real
  // members; a process that half-participates is how a localhost drain once
  // marked a real member's mail sent off a console.log.
  if (!queueIsSendable()) return { sent: 0, failed: 0, backlog: false };

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

    const outcome = await claimAndSend(next);
    if (outcome === "sent") sent++;
    else if (outcome === "requeued" || outcome === "failed") failed++;
    // lost-claim: another process took the row between our read and our claim;
    // nothing to count, the loop just looks for the next one.
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

/**
 * When the daily budget refills, i.e. the earliest a message deferred by the
 * cap could go out. Resend's window is UTC, so this is the next UTC midnight.
 *
 * Returned as a Date and formatted in the BROWSER's timezone by whoever shows
 * it. "It will go out tomorrow" is the kind of vague reassurance that reads as
 * a brush-off; a real clock time is a promise somebody can check.
 */
export function nextBudgetResetAt(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

export type VerificationMailState =
  /** The link is in their inbox. Safe to say "go and look". */
  | { state: "sent"; at: Date }
  /** Being sent right now, or seconds from a retry. Say it is on its way;
   *  never name a deadline, because there isn't one. */
  | { state: "imminent" }
  /** Genuinely deferred: today's budget is SPENT. This is the only state that
   *  may mention the email limit, and `sendingAt` is when it refills. */
  | { state: "queued"; sendingAt: Date }
  /** Tried and gave up (a bad address, usually). Offer to try again. */
  | { state: "failed" }
  /** Nothing on file. Offer to send one. */
  | { state: "none" };

/**
 * Has this person's confirmation actually left the building? And if it has
 * not, WHY not - because the answer decides what the banner may claim.
 *
 * This function does not merely report; it repairs. A queued row with budget
 * available is sent HERE, synchronously, before the state is returned. That
 * choice comes from a production incident (2026-08-13): a fresh signup's row
 * sat queued because the fire-and-forget drain never ran on Vercel, and the
 * old version of this function answered "queued" for every unsent row - which
 * the banner then explained as "we've hit today's email limit", to a member
 * who was the third email of a ninety-five-email day. Two lies stacked: the
 * mail had not been deferred, and the limit had nothing to do with it.
 *
 * Sending from the read path makes the invariant structural: by the time an
 * unconfirmed member sees any page, their mail has either really gone (state
 * "sent"), is in another process's hands this second ("imminent"), or the
 * budget is arithmetically exhausted ("queued", the only state whose copy may
 * mention the limit, with the refill time attached). There is no code path
 * that can show the limit message while the day still has budget in it.
 *
 * Cost: one Resend call inside one page load, once, for the member whose mail
 * is pending. Every later read takes the "sent" fast path.
 */
export async function verificationMailState(userId: string): Promise<VerificationMailState> {
  const row = await prisma.outboundEmail.findFirst({
    where: { userId, kind: "verify" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      to: true,
      userId: true,
      payload: true,
      status: true,
      sentAt: true,
    },
  });

  if (!row) return { state: "none" };
  if (row.status === "sent" && row.sentAt) return { state: "sent", at: row.sentAt };
  if (row.status === "failed") return { state: "failed" };

  // Queued or sending. A process that cannot send (a dev machine without
  // EMAIL_DEV_SEND, production missing its key) reports the only thing it can
  // see honestly: the message is written down and a sending process will pick
  // it up. Never the budget message - the budget is not the reason.
  if (!queueIsSendable()) return { state: "imminent" };

  const budget = await dailyBudget();
  if (budget.verifyRemaining <= 0) {
    return { state: "queued", sendingAt: nextBudgetResetAt() };
  }

  // Budget is available, so nothing may sit queued: send it now. "lost-claim"
  // means a concurrent drain beat us to this exact row, which is fine - the
  // re-read below sees whatever it did with it.
  if (row.status === "queued") {
    const outcome = await claimAndSend(row);
    if (outcome === "sent") return { state: "sent", at: new Date() };
  }

  const fresh = await prisma.outboundEmail.findUnique({
    where: { id: row.id },
    select: { status: true, sentAt: true },
  });
  if (fresh?.status === "sent") return { state: "sent", at: fresh.sentAt ?? new Date() };
  if (fresh?.status === "failed") return { state: "failed" };

  // Mid-flight in another process, or our own attempt hit a transient error
  // and requeued for the next pass. Either way it is minutes, not tomorrow.
  return { state: "imminent" };
}
