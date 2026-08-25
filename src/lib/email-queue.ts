import { after } from "next/server";
import { prisma } from "./prisma";
import { IS_DEMO } from "./demo";
import { appUrl, sendMail } from "./email";
import { maskEmail } from "./mask-email";
import {
  ATTEMPT_RETRY_MS,
  MAX_ATTEMPTS,
  MAX_DEFERRALS,
  PRIORITY,
  STALE_CLAIM_MS,
  eligibleKindsFor,
  isRetryableSkip,
  localDrainRecipient,
  SKIP_NO_USER,
  SKIP_TOKEN_RATE_LIMIT,
  retryDelayMs,
  startOfUtcDay,
  type MailKind,
} from "./mail-policy";
import {
  deletionScheduledTemplate,
  passwordChangedTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
  type BuiltEmail,
} from "./email-templates";
import { TOKEN_TTL_MINUTES, mintToken } from "./auth-tokens";
import { reportSwallowed } from "@/lib/report-error";
import { isUniqueViolation } from "@/lib/prisma-errors";

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

export type { MailKind } from "./mail-policy";

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
  if (process.env.EMAIL_DEV_SEND !== "1") return false;
  /* And a KEY, fail-closed exactly like the production branch above (audit
     C-105). Without one, `sendMail` falls through to its "print the link to
     the terminal" branch and returns ok -- so the drain marked the row `sent`
     with a `sentAt` off a console.log. The queue's whole invariant is that
     "sent" means a provider accepted it; a row that lies about that is
     unrecoverable, because nothing ever looks at it again. */
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "[email] EMAIL_DEV_SEND=1 but RESEND_API_KEY is unset; refusing to drain. " +
        "Sending would print the link to this terminal and then mark the row " +
        "sent, which is a lie the queue cannot recover from.",
    );
    return false;
  }
  /* Outside production the drain is narrowed to the owner's own address
     (`localDrainRecipient`, audit M53), and that narrowing is the only thing
     standing between a developer's page view and every real member's queued
     mail. With no ADMIN_EMAIL there is nothing to narrow TO, so this refuses
     rather than falling back to "everybody" -- the same fail-closed shape,
     and the same loud console line, as the production missing-key branch
     above. */
  if (!process.env.ADMIN_EMAIL?.trim()) {
    console.error(
      "[email] EMAIL_DEV_SEND=1 but ADMIN_EMAIL is unset; refusing to drain. " +
        "This database is production's, so a dev drain with no recipient scope " +
        "would send real members' mail. Set ADMIN_EMAIL, or unset EMAIL_DEV_SEND.",
    );
    return false;
  }
  return true;
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
  // Captured once and reused as this claim's fencing value: every write below
  // that mutates this row repeats it in the `where`, not just `id`.
  const claimedAt = new Date();
  const claimed = await prisma.outboundEmail.updateMany({
    where: { id: row.id, status: "queued" },
    data: { status: "sending", claimedAt, attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return "lost-claim";

  /**
   * Write to the row ONLY if this call still holds the exact claim taken
   * above, and say so loudly when it does not (bug audit M50).
   *
   * The stale-claim sweep in `drainWithLease` resets a row to `queued` when
   * it has sat claimed longer than STALE_CLAIM_MS, on the assumption the
   * claiming process died. `sendMail` itself cannot run that long -- it
   * races a 10-second timeout (src/lib/email.ts) -- but this function has
   * two callers that are NOT bounded the same way: `verificationMailState`
   * calls it directly from inside a page render, and `drainWithLease` calls
   * it from inside an `after()` callback, which Vercel is free to FREEZE the
   * instant the triggering request's response has streamed and resume later
   * with no sense that time passed in between (the same platform behaviour
   * `mintToken`'s sweep is guarded against). A frozen-then-resumed call is
   * not dead; it finishes exactly where it left off, still believing it owns
   * the row -- and by the time it resumes, the sweep may have put the row
   * back in the queue and a second process may already have claimed and
   * sent it, or marked it permanently failed.
   *
   * An unconditional `update({ where: { id } })` would overwrite whichever of
   * those happened with this stale call's own idea of the row: a `sent` row
   * flipped back to `queued` (a THIRD send, from whoever drains next) or a
   * row a newer claimant is still working on stamped `sent` out from under
   * it. Scoping the write to `status: "sending"` AND this exact `claimedAt`
   * turns that into a no-op instead: `count === 0` means somebody else now
   * owns this row, so this call's write is dropped rather than applied. It
   * cannot undo the one thing that may already be real -- the Resend call
   * itself, which does not take a cancellation -- so the drop is logged
   * loudly: the DB staying honest is the whole of what this can still do.
   */
  const writeIfStillClaimed = async (
    data: Parameters<typeof prisma.outboundEmail.updateMany>[0]["data"],
    note: string,
  ): Promise<void> => {
    const result = await prisma.outboundEmail.updateMany({
      where: { id: row.id, status: "sending", claimedAt },
      data,
    });
    if (result.count === 0) {
      console.error(
        `[email] lost claim on row=${row.id} while finalizing (${note}); ` +
          `another process moved it on in the meantime. If this was a real ` +
          `send, the row may now understate how many times it went out.`,
      );
    }
  };

  // Read back the incremented count so a failure below can decide between
  // another try and giving up. A row on its last attempt stops being retried,
  // so one bad address cannot keep spending budget other people are waiting on.
  const attempted = await prisma.outboundEmail.findUnique({
    where: { id: row.id },
    select: { attempts: true },
  });
  const spent = attempted?.attempts ?? MAX_ATTEMPTS;
  const afterFailure = spent >= MAX_ATTEMPTS ? "failed" : "queued";

  /**
   * Book a failure so it is retried LATER rather than in this same pass.
   *
   * The bug (B-002): a requeued row kept its createdAt, so it stayed the oldest
   * eligible row and the next loop iteration picked it straight back up. Four
   * attempts burned in about four seconds and the row went terminally 'failed',
   * which nothing retries. Now every failure names a time it becomes eligible
   * again, and a failure the provider caused is put on its own counter so it
   * never spends one of the four attempts kept for a genuinely bad address.
   */
  const bookFailure = async (result: {
    error?: string;
    transient?: boolean;
    quota?: boolean;
  }): Promise<SendOutcome> => {
    if (result.transient) {
      const current = await prisma.outboundEmail.findUnique({
        where: { id: row.id },
        select: { deferrals: true },
      });
      const deferrals = (current?.deferrals ?? 0) + 1;
      const giveUp = deferrals >= MAX_DEFERRALS;
      await writeIfStillClaimed(
        {
          status: giveUp ? "failed" : "queued",
          claimedAt: null,
          // The attempt this send consumed was not the address's fault, so it
          // is handed back. `deferrals` is what bounds provider trouble.
          attempts: { decrement: 1 },
          deferrals,
          // A spent daily allowance is temporary on a different clock: waiting
          // five minutes for a quota that resets at midnight UTC just burns
          // deferrals for nothing.
          nextAttemptAt: result.quota
            ? nextBudgetResetAt()
            : new Date(Date.now() + retryDelayMs(deferrals - 1)),
          lastError: result.error ?? "send failed",
        },
        giveUp ? "failed" : "requeued",
      );
      return giveUp ? "failed" : "requeued";
    }

    await writeIfStillClaimed(
      {
        status: afterFailure,
        claimedAt: null,
        nextAttemptAt: new Date(Date.now() + ATTEMPT_RETRY_MS),
        lastError: result.error ?? "send failed",
      },
      afterFailure === "failed" ? "failed" : "requeued",
    );
    return afterFailure === "failed" ? "failed" : "requeued";
  };

  let accepted = false;

  try {
    const built = await render(row);

    if ("skip" in built) {
      if (isRetryableSkip(built.skip)) {
        // Genuinely temporary: auth-tokens.ts's mint window is a rolling 60
        // minutes and clears on its own. Routed through the same transient
        // path as a provider hiccup, so the attempt is handed back -- "not
        // worth burning an attempt on", per render()'s own comment -- and the
        // row quietly retries itself once the window has room again, instead
        // of being retired and forcing the next manual resend to create a
        // fresh row that hits the same limit and fails the same way (M52).
        return bookFailure({ error: built.skip, transient: true });
      }
      // Not retryable: no amount of waiting gives this row a userId.
      await writeIfStillClaimed(
        { status: "failed", claimedAt: null, lastError: built.skip },
        "failed",
      );
      return "failed";
    }

    const result = await sendMail({ to: row.to, ...built });
    // From here on the message may already exist in somebody's inbox, so the
    // catch below must not book a failure and hand the row back to the queue.
    accepted = result.ok;

    if (result.ok) {
      await writeIfStillClaimed(
        {
          status: "sent",
          sentAt: new Date(),
          claimedAt: null,
          nextAttemptAt: null,
          lastError: null,
          // Resend's id for the message. "sent" only means Resend accepted it;
          // this is what lets the delivery webhook come back later and say
          // whether it actually landed. See the delivery columns on the model.
          providerId: result.providerId ?? null,
        },
        "sent",
      );
      // One line of record per real send, with the ORIGIN its links were built
      // against (never the token). Exists because "which link did Nirad's
      // email actually carry" took a forensic reconstruction on 2026-08-13:
      // the Resend key is send-only, so the provider cannot answer, and the
      // row does not store the rendered body. With this, the answer is one
      // grep of the server logs.
      // The address is MASKED here: in a members-only alumni community the
      // membership of a given address is itself the protected fact, and it has
      // no business sitting in Vercel's log retention in the clear. The row id
      // stays unmasked, and OutboundEmail.to holds the full address, so the
      // forensic lookup is one query away without logging PII on every send.
      console.info(
        `[email] sent kind=${row.kind} to=${maskEmail(row.to)} origin=${appUrl("/")} row=${row.id}`,
      );
      return "sent";
    }

    return bookFailure(result);
  } catch (err) {
    if (accepted) {
      // Resend took the message and the row update failed. Requeueing here
      // would send it a second time; leaving the row in "sending" means the
      // stale-claim sweep decides, two minutes from now, with the same
      // information and no risk of us doing it twice in one breath.
      reportSwallowed("email", err, { step: "record-sent", rowId: row.id });
      return "sent";
    }
    // A throw from render(): not the provider, so it counts as an attempt.
    // render() failing the same way four times is a real fault somebody has to
    // look at, which is what the ceiling is for.
    return bookFailure({ error: err instanceof Error ? err.message : "unknown" });
  }
}

interface Budget {
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
  // Counted off `sentAt` ALONE, with no status filter. `sentAt` is written
  // once, on a real provider accept, and nothing ever clears it -- whereas
  // `status` moves afterwards: the Resend webhook flips a bounced or
  // complained-about row to 'failed', which used to subtract a message Resend
  // had already counted against the real quota and hand back a phantom slot
  // (bug audit B-071). A dozen same-day bounces ate the whole five-message
  // margin, after which the app kept sending into hard rejections.
  //
  // Rows in flight count too. Every authenticated page view can start a pass,
  // so without this several passes read the same `remaining` and each spend it
  // (B-072). A claimed row is a message about to exist.
  const [accepted, inFlight] = await Promise.all([
    prisma.outboundEmail.count({ where: { sentAt: { gte: startOfUtcDay() } } }),
    prisma.outboundEmail.count({ where: { status: "sending" } }),
  ]);
  const used = accepted + inFlight;
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
  // One genuine request plus a cancel-and-re-request; anything past that in
  // an hour is a script worrying the button.
  "deletion-scheduled": { max: 3, windowMinutes: 60 },
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
    if (waiting) {
      /* Nudged on the way out, exactly as the create path below is (audit
         C-103). This return sat ABOVE `scheduleDrain()`, so the fold -- which
         is what a member pressing "resend" hits -- was the one path that never
         woke the queue. Somebody whose confirmation was stuck could press the
         button as often as they liked and nothing moved, which is the precise
         failure the nudge was added for (owner, 2026-08-12). */
      scheduleDrain();
      return { queued: true, id: waiting.id };
    }
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
/**
 * Send one specific queued row without making the caller wait for it.
 *
 * Same guarded shape as scheduleDrain below and for the same reason: `after()`
 * throws SYNCHRONOUSLY outside a request scope, and this is reachable from a
 * script or a test as well as from a page render.
 */
function scheduleSend(row: Parameters<typeof claimAndSend>[0]): void {
  const run = async () => {
    try {
      await claimAndSend(row);
    } catch (err) {
      reportSwallowed("email", err, { step: "targeted-send", rowId: row.id });
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

function scheduleDrain(): void {
  const run = async () => {
    try {
      await drainMailQueue();
    } catch (err) {
      reportSwallowed("email", err, { step: "drain" });
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

  if (row.kind === "deletion-scheduled") {
    return deletionScheduledTemplate({ name, purgeDate: payload.purgeDate ?? "" });
  }

  if (!row.userId) return { skip: SKIP_NO_USER };

  // The token is born HERE, so its clock starts when the message leaves rather
  // than when it was queued.
  const kind = row.kind === "reset" ? "reset" : "verify";
  const minted = await mintToken(row.userId, kind, row.to);
  if (!minted.ok) {
    // Rate limited at the token layer. Not an error worth burning an attempt
    // on: it means this person has been issued several links very recently and
    // one of them is almost certainly still live in their inbox.
    return { skip: SKIP_TOKEN_RATE_LIMIT };
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

/** The named lease one drain pass holds while it sends. */
const DRAIN_LEASE = "mail-drain";

/** How long a pass may hold the lease before another may take it.
 *
 *  Long enough for any single send to finish inside it, short enough that a
 *  process killed mid-pass only stalls the queue for half a minute. It is
 *  deliberately NOT long enough for a whole worst-case pass: BATCH sends each
 *  timing out at SEND_TIMEOUT_MS is 80 seconds, and a lease sized for that
 *  would leave the queue stalled for that long every time a serverless
 *  instance was frozen mid-drain.
 *
 *  So the pass RENEWS instead (bug-report-2 C-108). The old shape took the
 *  lease once and never looked at it again: during a Resend brownout -- the
 *  exact condition the lease exists for -- a pass ran ~80 seconds, the lease
 *  lapsed at 45, a concurrent page view took it, and two passes ran together,
 *  reopening the self-inflicted 429 storm and burning deferrals twice as
 *  fast. */
const DRAIN_LEASE_MS = 45_000;

/**
 * Push this pass's lease out by another window, and say whether it is still
 * ours. False means somebody else took it while we were sending, which is the
 * one case where a pass must stop mid-loop rather than carry on sending
 * alongside them.
 */
async function renewDrainLease(holder: string): Promise<boolean> {
  const held = await prisma.queueLease.updateMany({
    where: { name: DRAIN_LEASE, holder },
    data: { expiresAt: new Date(Date.now() + DRAIN_LEASE_MS) },
  });
  return held.count === 1;
}

/**
 * Take the drain lease, or return null because somebody else has it.
 *
 * A conditional updateMany on the expiry, exactly like the per-row claim: no
 * advisory lock, because those are session-scoped and this app reaches
 * Postgres through the pgbouncer transaction pooler, where "the session" is
 * whatever connection came free.
 */
async function takeDrainLease(): Promise<string | null> {
  const holder = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DRAIN_LEASE_MS);
  const taken = await prisma.queueLease.updateMany({
    where: { name: DRAIN_LEASE, expiresAt: { lte: now } },
    data: { holder, expiresAt },
  });
  if (taken.count === 1) return holder;
  // Count 0 means either somebody holds it, or the row has never existed.
  try {
    await prisma.queueLease.create({ data: { name: DRAIN_LEASE, holder, expiresAt } });
    return holder;
  } catch (err) {
    /* A unique violation means another pass created it in the same instant,
       and returning null is right. ANYTHING ELSE -- a pool timeout, a dropped
       connection -- was being read as "somebody holds the lease" too, so a
       database that had stopped answering looked exactly like a busy queue and
       the drain quietly stopped for as long as it lasted, with no witness
       (audit C-153). */
    if (!isUniqueViolation(err)) {
      reportSwallowed("email", err, { step: "take-drain-lease" });
    }
    return null;
  }
}

/** Hand the lease back early so the next page view can drain immediately. */
async function releaseDrainLease(holder: string): Promise<void> {
  await prisma.queueLease
    .updateMany({ where: { name: DRAIN_LEASE, holder }, data: { expiresAt: new Date(0) } })
    .catch(() => {
      // Nothing to do: the lease expires on its own within DRAIN_LEASE_MS.
    });
}

/**
 * Send what today's budget allows. Safe to call from anywhere, as often as you
 * like: it claims rows before sending, so a hundred simultaneous page views
 * cannot mail the same person a hundred times.
 *
 * One pass at a time, fleet-wide. Every authenticated page view runs this in
 * an `after()` and every enqueue schedules one, and before the lease those
 * passes did not collapse: a loser of the per-row race simply moved to the
 * NEXT row, so K passes sent K different messages in parallel -- a
 * self-inflicted 429 storm against a provider that rate-limits to about two
 * requests a second, with each 429 burning an attempt (bug audit B-072).
 */
export async function drainMailQueue(): Promise<DrainReport> {
  // All-or-nothing (see queueIsSendable): either this process really sends, or
  // it leaves the queue completely alone for one that does. This database is
  // shared by production and local dev, so the rows here belong to real
  // members; a process that half-participates is how a localhost drain once
  // marked a real member's mail sent off a console.log.
  if (!queueIsSendable()) return { sent: 0, failed: 0, backlog: false };

  /* Is there anything to do? One indexed count, before the lease.
     `after()` runs this on EVERY authenticated page view, and with an empty
     queue the pass below still took the lease, reclaimed, counted the budget
     four times over and handed the lease back: around nine statements, three
     of them writes, on the hottest path in the app, 99% of the time to send
     nothing (audit C-104). The lease row makes it worse than it looks --
     releaseDrainLease expires it deliberately, so every single view WINS the
     lease and does the whole dance.

     The where is `drainHasWork` (mail-policy.ts) spelled as a query, both
     arms -- written out there so a test can call it, exactly as `drainEligible`
     is for the row selection below. Counting only
     `queued` would be the tempting version and would strand a row whose
     sender died mid-send for ever, because reclaiming it is this pass's own
     job and this precheck would be what skipped the pass. */
  const pending = await prisma.outboundEmail.count({
    where: {
      OR: [
        { status: "queued" },
        {
          status: "sending",
          claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) },
        },
      ],
    },
  });
  if (pending === 0) return { sent: 0, failed: 0, backlog: false };

  const lease = await takeDrainLease();
  if (!lease) {
    // Another pass is sending right now. Returning immediately is the whole
    // point; the queue is not neglected, it is busy.
    const waiting = await prisma.outboundEmail.count({ where: { status: "queued" } });
    return { sent: 0, failed: 0, backlog: waiting > 0 };
  }

  try {
    return await drainWithLease(lease);
  } finally {
    await releaseDrainLease(lease);
  }
}

/** The pass itself, once this process is the one allowed to send. */
async function drainWithLease(holder: string): Promise<DrainReport> {
  // Reclaim anything a dead process left mid-flight. Logged only when it
  // actually finds something: a reclaimed row is not necessarily a dead
  // process (see the comment on `writeIfStillClaimed` in claimAndSend), so
  // this count is the other half of the forensic trail for that log line --
  // together they are how a double send would ever be noticed at all.
  const reclaimed = await prisma.outboundEmail.updateMany({
    where: { status: "sending", claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
    data: { status: "queued", claimedAt: null },
  });
  if (reclaimed.count > 0) {
    console.error(
      `[email] reclaimed ${reclaimed.count} row(s) claimed longer than ${STALE_CLAIM_MS}ms; ` +
        `if the original claimant was frozen rather than dead, it may still send when it resumes.`,
    );
  }

  const budget = await dailyBudget();
  if (budget.remaining === 0) {
    const waiting = await prisma.outboundEmail.count({ where: { status: "queued" } });
    return { sent: 0, failed: 0, backlog: waiting > 0 };
  }

  const drainRecipient = localDrainRecipient(process.env);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < BATCH; i++) {
    /* Before every send, not once at the top: a send may take up to
       SEND_TIMEOUT_MS, and BATCH of them is longer than the lease (C-108).
       Renewing keeps the one-pass-at-a-time guarantee through a brownout
       without making the lease so long that a killed process stalls the queue.
       Losing it means another pass legitimately took over -- stop, rather than
       send alongside them. */
    if (!(await renewDrainLease(holder))) break;

    const live = await dailyBudget();
    if (live.remaining === 0) break;

    // Confirmations stop at the reserve line; resets and security notices may
    // spend all the way down. Expressed as a filter on which kinds are even
    // eligible, so the reserve cannot be nibbled away by a long verify run.
    const eligibleKinds = eligibleKindsFor(live.verifyRemaining);

    const next = await prisma.outboundEmail.findFirst({
      where: {
        status: "queued",
        kind: { in: eligibleKinds },
        // On a development machine with EMAIL_DEV_SEND=1, only the owner's own
        // address. This database is production's, so the rows here are real
        // members' verification and reset mail, and a localhost drain must not
        // be able to CLAIM one -- let alone send it (bug audit M53). Narrowing
        // the selection rather than refusing the send is deliberate: a refusal
        // inside the send is a non-transient failure, so the row would burn its
        // attempts and end up `failed`, which is the 2026-08-12 incident
        // wearing a different hat. Not selecting it leaves it untouched for
        // production to send. `undefined` in production, where it is a no-op.
        to: drainRecipient ? { equals: drainRecipient, mode: "insensitive" } : undefined,
        attempts: { lt: MAX_ATTEMPTS },
        deferrals: { lt: MAX_DEFERRALS },
        // Only what is due. A row that just failed names the moment it may be
        // tried again, so retries spread across passes instead of burning four
        // attempts inside one (B-002).
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
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
    // Same definition as dailyBudget: what the provider accepted today,
    // whatever a later delivery webhook has since made of the row.
    prisma.outboundEmail.count({ where: { sentAt: { gte: startOfUtcDay() } } }),
    prisma.outboundEmail.count({ where: { status: { in: ["queued", "sending"] } } }),
    prisma.outboundEmail.count({ where: { status: "failed" } }),
  ]);
  return { sentToday, dailyCap: DAILY_CAP, waiting, failed };
}

/**
 * When the daily budget refills, i.e. the earliest a message deferred by the
 * cap could go out. Resend's window is UTC, so this is the next UTC midnight.
 *
 * Returned as a Date. Whoever shows it formats it in the VALLEY's timezone and
 * says so -- see `sendTimeLabel` -- which this line used to claim was the
 * browser's (audit C-037). "It will go out tomorrow" is the kind of vague
 * reassurance that reads as a brush-off; a real clock time, with the zone on
 * it, is a promise somebody can check.
 */
export function nextBudgetResetAt(daysForward = 1): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysForward),
  );
}

/** How many confirmations a single day's budget can carry, after the reserve
 *  the reset and security mail keeps for itself. */
const VERIFY_PER_DAY = Math.max(1, DAILY_CAP - RESET_RESERVE);

/**
 * When THIS confirmation actually goes out, counting the queue in front of it.
 *
 * The banner prints this as a clock time -- "Your link goes out tomorrow at
 * 5:30 am" -- and it used to be the next UTC midnight for everybody, with no
 * queue-depth term at all. The drain is oldest-first, so on a launch day with
 * 300 signups the person at position 200 was told "tomorrow" and waited three
 * days (bug-report-2 C-161). A promise a member can watch fail is worse than a
 * vaguer one that holds.
 *
 * Counted, not estimated: the rows ahead are the queued verify rows older than
 * this one, which is exactly the order drainWithLease sends in.
 */
async function verifySendingAt(row: { id: string; createdAt: Date }): Promise<Date> {
  const ahead = await prisma.outboundEmail.count({
    where: {
      status: "queued",
      kind: "verify",
      attempts: { lt: MAX_ATTEMPTS },
      deferrals: { lt: MAX_DEFERRALS },
      OR: [{ createdAt: { lt: row.createdAt } }, { createdAt: row.createdAt, id: { lt: row.id } }],
    },
  });
  return nextBudgetResetAt(Math.floor(ahead / VERIFY_PER_DAY) + 1);
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
/**
 * How far off a send may be and still be called "imminent".
 *
 * The banner's imminent copy asserts a completed send, so the word has to mean
 * what it says. A transient retry books a few minutes; a provider quota books
 * the next UTC midnight. Ten minutes sits well clear of the first and nowhere
 * near the second (audit C-107).
 */
const IMMINENT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Where a member's confirmation email has got to, and -- when it is due -- the
 * push that sends it.
 *
 * `sendInline` decides whether the caller WAITS for the provider.
 *
 *  - The resend BUTTON passes true. Somebody has just pressed "send it again"
 *    and is watching; the whole value of that button is an honest answer, and
 *    "sent" has to mean the provider accepted it.
 *
 *  - The (main) LAYOUT passes nothing, and must. That layout renders on every
 *    authenticated page, and this used to reach Resend from inside its
 *    render-blocking Promise.all: a provider that accepted the connection and
 *    then said nothing held an unconfirmed member's whole page for the ten
 *    seconds of `SEND_TIMEOUT_MS`, showing them nothing at all (audit M20).
 *    Deferred, the send happens the instant the response has streamed and the
 *    banner reads "imminent" -- which is exactly what it means.
 */
export async function verificationMailState(
  userId: string,
  opts: { sendInline?: boolean } = {}
): Promise<VerificationMailState> {
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
      nextAttemptAt: true,
      // For the queue-position arithmetic below, which is what makes the
      // banner's "goes out at" honest on a busy day.
      createdAt: true,
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
    return { state: "queued", sendingAt: await verifySendingAt(row) };
  }

  // Budget is available, so nothing may sit queued: send it now. "lost-claim"
  // means a concurrent drain beat us to this exact row, which is fine - the
  // re-read below sees whatever it did with it.
  // ...unless the row is serving a backoff. A transient failure books the
  // moment it may be tried again, and re-sending on every page load would walk
  // straight through that budget one refresh at a time (B-002).
  const due = !row.nextAttemptAt || row.nextAttemptAt <= new Date();
  // The same recipient scope the batch pass uses. This path claims a row
  // directly rather than selecting one, so the filter has to be spelled out:
  // without it, a developer looking at any member's verify banner locally
  // would send that member's mail (M53).
  const scope = localDrainRecipient(process.env);
  const mine = !scope || row.to.trim().toLowerCase() === scope;
  if (row.status === "queued" && due && mine) {
    // Deliberately NOT behind the drain lease. This is one targeted send for
    // the member looking at the page, and making it wait on a batch pass is
    // exactly the 2026-08-13 incident this function exists to prevent. It
    // still cannot double-send: claimAndSend's conditional claim decides --
    // which is also why deferring it below is safe.
    if (!opts.sendInline) {
      scheduleSend(row);
      return { state: "imminent" };
    }
    const outcome = await claimAndSend(row);
    if (outcome === "sent") return { state: "sent", at: new Date() };
  }

  const fresh = await prisma.outboundEmail.findUnique({
    where: { id: row.id },
    select: { status: true, sentAt: true, nextAttemptAt: true },
  });
  if (fresh?.status === "sent") return { state: "sent", at: fresh.sentAt ?? new Date() };
  if (fresh?.status === "failed") return { state: "failed" };

  /* "Imminent" has to actually be imminent (audit C-107).
     A row can be queued with `nextAttemptAt` set to the next UTC midnight --
     the PROVIDER's own quota said no, which is a different ceiling from this
     app's daily budget and is not visible in the arithmetic above. `due` is
     then false, the send is skipped, and this fell through to "imminent",
     whose copy reads "A link has been sent to your email". For up to
     twenty-four hours, about a message that had not been sent, on a banner
     whose queued state is the one that offers a time and a way to ask again.
     Anything further off than a transient retry says WHEN instead. */
  const waitUntil = fresh?.nextAttemptAt ?? row.nextAttemptAt;
  if (waitUntil && waitUntil.getTime() - Date.now() > IMMINENT_WINDOW_MS) {
    return { state: "queued", sendingAt: waitUntil };
  }

  // Mid-flight in another process, or our own attempt hit a transient error
  // and requeued for the next pass. Either way it is minutes, not tomorrow.
  return { state: "imminent" };
}
