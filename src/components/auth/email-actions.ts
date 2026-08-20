"use server";

import bcrypt from "bcryptjs";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { maskEmail } from "@/lib/email";
import { burnTokens, readToken } from "@/lib/auth-tokens";
import { passwordProblem } from "@/lib/password-rule";
import { enqueueMail, verificationMailState } from "@/lib/email-queue";
import { sendVerificationEmail } from "@/lib/verification-mail";
import { tryRosterAutoVerifyQuietly } from "@/lib/roster";
import { verifyHumanFromForm } from "@/lib/turnstile";
import { BOT_CHECK_FAILED } from "@/lib/bot-check-message";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { mintHumanPass } from "@/lib/human-pass";

/* ------------------------------------------------------------------ *
 *  Everything the two email flows do on the server.
 *
 *  Forgot password: ask -> mail a link -> set a new one -> get signed in.
 *  Confirm address: mailed at signup, redeemable from any device, and
 *  re-sendable from inside the app.
 * ------------------------------------------------------------------ */

/** Matches the signup rule (src/components/auth/actions.ts) so a password that
 *  was acceptable when the account was made stays acceptable on the way back
 *  in. Raising it here alone would lock people out of resetting to something
 *  they had already been allowed to choose. */
const MIN_PASSWORD = 8;

/* ---------------------------------------------------------------- *
 *  Confirm your email
 * ---------------------------------------------------------------- */

/**
 * The "resend it" button, from inside the app.
 *
 * Takes NO arguments and reads the address off the session. The version of
 * this that accepted an email would be an unauthenticated open relay; see the
 * note on `sendVerificationEmail` in src/lib/verification-mail.ts for why that
 * function is not exported from this file.
 */
export async function resendVerification(): Promise<{
  ok: boolean;
  /** "sent": genuinely accepted by the provider. "imminent": in flight or
   *  seconds from a retry. "queued": the day's budget is truly spent, and
   *  `sendingAt` names the refill. The caller says different things for each,
   *  and only "queued" may mention the email limit. */
  state?: "sent" | "imminent" | "queued";
  sentTo?: string;
  /** ISO. Only set with state "queued". */
  sendingAt?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  if (session.user.emailConfirmed) {
    return { ok: false, error: "Your email is already confirmed." };
  }

  const queued = await sendVerificationEmail({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });
  if (!queued.ok) {
    return { ok: false, error: "We could not do that just now. Try again in a minute." };
  }

  // `verificationMailState` is the sender, not just the reader: with budget
  // available it puts the row through Resend before answering, so by the time
  // this returns "sent" the provider has genuinely accepted the message. One
  // send path for the button, the page load and the drain (claimAndSend), so
  // there is no second copy of the bookkeeping to disagree.
  const state = await verificationMailState(session.user.id);
  return {
    ok: true,
    state:
      state.state === "sent"
        ? "sent"
        : state.state === "queued"
          ? "queued"
          : "imminent",
    sentTo: maskEmail(session.user.email),
    sendingAt: state.state === "queued" ? state.sendingAt.toISOString() : undefined,
  };
}

export type ConfirmOutcome = "confirmed" | "already" | "expired" | "unknown" | "stale";

/**
 * Redeem a confirmation link. Called by the /verify-email page during render,
 * so the link works on any device, signed in or not: the token IS the proof.
 *
 * "already" is its own outcome rather than an error. A second click on the
 * same mail, or a mail client that prefetches links, is the single most common
 * way this is hit, and telling someone their confirmation failed when it
 * actually succeeded a minute ago is the exact sort of thing that makes people
 * give up.
 */
export async function confirmEmailToken(token: string): Promise<ConfirmOutcome> {
  const read = await readToken(token, "verify", { consume: true });

  if (!read.ok) {
    if (read.reason === "used") {
      // Used token: if the address really is confirmed, say so plainly.
      return "already";
    }
    return read.reason === "expired"
      ? "expired"
      : read.reason === "stale"
        ? "stale"
        : "unknown";
  }

  await prisma.user.update({
    where: { id: read.userId },
    data: { emailVerified: new Date() },
  });

  // The mailbox is proven the instant the line above lands, which is the
  // moment an office-roster match becomes meaningful (trust model, Stage 2).
  // Quietly: a roster hiccup must never turn a successful confirmation into
  // an error screen.
  await tryRosterAutoVerifyQuietly(read.userId);

  return "confirmed";
}

/* ---------------------------------------------------------------- *
 *  Forgot password
 * ---------------------------------------------------------------- */

/**
 * Step one: somebody typed their address.
 *
 * ALWAYS returns the same bare `{ ok: true }`, whether or not an account
 * exists. Anything else turns this form into a membership checker: type an
 * address, read the response, learn whether that person went to Rishi Valley.
 * For a private community that is precisely the fact worth protecting.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  /* Bot check + per-IP meter FIRST, and both refusals are safe to say out
     loud: they depend only on the caller's behaviour, never on whether the
     typed address has an account, so the membership secret this function
     protects stays protected. The per-IP limit is audit M3 — before it, one
     caller cycling known addresses could burn the whole day's ~95-message
     mail budget in minutes, taking password recovery down for everyone. */
  const ip = await clientIp();
  if (!(await verifyHumanFromForm(formData, ip))) {
    return { ok: false, error: BOT_CHECK_FAILED };
  }
  const limited = await rateLimit("reset", ip);
  if (!limited.ok) return { ok: false, error: limited.error };

  const raw = ((formData.get("email") as string) ?? "").trim().toLowerCase();

  // Nothing usable typed: still answer as though it worked.
  if (!raw || !raw.includes("@")) return { ok: true };

  const user = await prisma.user.findUnique({
    where: { email: raw },
    select: { id: true, name: true, email: true, password: true },
  });

  // No account, or an account with no password to reset (the admin bypass row).
  // Same answer either way.
  if (!user?.password) return { ok: true };

  // `enqueueMail` writes the row and sends it immediately (it schedules its own
  // drain), so this leaves within seconds. The row exists first so that if the
  // send fails the message is not simply lost, and so the token is minted at
  // the moment of sending rather than here: a reset that did have to wait
  // still arrives with its full hour ahead of it.
  //
  // Inside after(), NOT awaited (audit L3): both branches of this function
  // now return after the same single findUnique. Awaiting the enqueue here
  // made the has-an-account path measurably slower — a fold-check, a count
  // and a create — which is a timing oracle recovering exactly the
  // membership fact the identical { ok: true } answers exist to hide.
  after(async () => {
    try {
      await enqueueMail({
        kind: "reset",
        to: user.email,
        userId: user.id,
        payload: { name: user.name },
      });
    } catch (err) {
      // Post-response, so nothing can surface this to the caller; the queue
      // row is the recovery path and this log is the only witness.
      console.error("[reset] enqueue failed:", err);
    }
  });


  // The return value carries NOTHING about whether that address has an
  // account (see the function comment). The screen that follows echoes back
  // the address the VISITOR TYPED, which helps them catch a typo and tells
  // them nothing we did not already receive from them.
  return { ok: true };
}

export type ResetLinkState =
  | { state: "ok"; email: string }
  | { state: "expired" }
  | { state: "used" }
  | { state: "stale" }
  | { state: "unknown" };

/**
 * Is this reset link still good? Read WITHOUT burning it, so the page can
 * render the form; the token is spent by `resetPassword` below when the new
 * password is actually submitted.
 */
export async function checkResetLink(token: string): Promise<ResetLinkState> {
  const read = await readToken(token, "reset", { consume: false });
  if (read.ok) return { state: "ok", email: read.email };
  return { state: read.reason === "unknown" ? "unknown" : read.reason };
}

/**
 * Step two: set the new password.
 *
 * Returns the email on success so the client can sign the person straight in
 * with the credentials they just chose. Making them type the same password
 * again on a login screen, seconds after setting it, is the kind of small
 * indignity that this flow exists to remove.
 */
export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!input.password || input.password.length < MIN_PASSWORD) {
    return { ok: false, error: `Pick a password of at least ${MIN_PASSWORD} characters.` };
  }

  // The quality floor (audit M8), checked against a PEEK at the token —
  // never after consuming it, or a refused password would burn the person's
  // one link and strand them back at the request form.
  const peek = await readToken(input.token, "reset", { consume: false });
  if (peek.ok) {
    const weak = passwordProblem(input.password, peek.email);
    if (weak) return { ok: false, error: weak };
  }

  // Consumed here, at the moment of use, so the link cannot be replayed.
  const read = await readToken(input.token, "reset", { consume: true });
  if (!read.ok) {
    return {
      ok: false,
      error:
        read.reason === "expired"
          ? "That link has run out. Ask for a new one and it will be in your inbox in a moment."
          : read.reason === "used"
            ? "That link has already been used. Ask for a new one if you still need it."
            : "We do not recognise that link. Ask for a new one to be safe.",
    };
  }

  const hashed = await bcrypt.hash(input.password, 12);
  await prisma.user.update({
    where: { id: read.userId },
    data: {
      password: hashed,
      // Getting mail at this address is proof it is theirs, so a reset doubles
      // as a confirmation. Someone locked out of posting because they never
      // found the original welcome mail is fixed by the very act of proving
      // they can read the inbox.
      emailVerified: new Date(),
      /* Ends every session already signed in on this account (audit M4).
         Without it, a reset burned the outstanding reset LINKS below and left
         the attacker's actual session cookie working for its full 30 days --
         so the one action a phished member takes to save themselves did not
         touch the thing that had been stolen. */
      credentialVersion: { increment: 1 },
    },
  });

  // A reset doubles as a confirmation (above), so it is also a moment the
  // roster may vouch for this account. Same best-effort contract as in
  // confirmEmailToken.
  await tryRosterAutoVerifyQuietly(read.userId);

  // Any other reset links already in flight die with this one.
  await burnTokens(read.userId, "reset");

  // Tell the mailbox that the password moved. This is the only warning a
  // person gets if somebody else did it, so it is queued at high priority
  // (just behind resets) rather than left to a launch-day backlog. Queued
  // rather than sent, and never awaited for success: a mail failure must not
  // undo a password change that has already been written.
  const user = await prisma.user.findUnique({
    where: { id: read.userId },
    select: { name: true },
  });
  await enqueueMail({
    kind: "password-changed",
    to: read.email,
    userId: read.userId,
    payload: { name: user?.name ?? "there" },
  });

  // The client signs the person straight in with their new password, which
  // now crosses authorize()'s bot check. Consuming a single-use emailed link
  // is already proof of a human with the mailbox, so it earns the same
  // five-minute pass a fresh signup gets.
  await mintHumanPass(read.email);

  return { ok: true, email: read.email };
}
