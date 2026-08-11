"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { maskEmail } from "@/lib/email";
import { burnTokens, readToken } from "@/lib/auth-tokens";
import { enqueueMail, verificationMailState } from "@/lib/email-queue";
import { sendVerificationEmail } from "@/lib/verification-mail";

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
  /** "sent" means it is genuinely in their inbox; "queued" means we have
   *  written it down and it goes out when the day's budget allows. The caller
   *  MUST say different things for the two, per the owner's instruction that
   *  nobody is told to check an inbox we have not written to yet. */
  state?: "sent" | "queued";
  sentTo?: string;
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

  // Nudge the queue rather than waiting for the next page view. On an ordinary
  // day this sends it before the button finishes its press, which is what
  // makes a queue invisible to everyone except the launch-day crowd it exists
  // for. Failure here is fine: the row is written, and the next drain gets it.
  try {
    const { drainMailQueue } = await import("@/lib/email-queue");
    await drainMailQueue();
  } catch {
    // the queue keeps the row; nothing to recover here
  }

  const state = await verificationMailState(session.user.id);
  return {
    ok: true,
    state: state.state === "sent" ? "sent" : "queued",
    sentTo: maskEmail(session.user.email),
  };
}

/** What the banner and the verify page read to decide what to SAY. Exported as
 *  an action so a client component can refresh it after pressing resend. */
export async function myVerificationMailState(): Promise<
  { state: "verified" } | { state: "sent" } | { state: "queued"; aheadOfYou: number } | { state: "none" }
> {
  const session = await auth();
  if (!session?.user?.id) return { state: "none" };
  if (session.user.emailConfirmed) return { state: "verified" };

  const mail = await verificationMailState(session.user.id);
  if (mail.state === "sent") return { state: "sent" };
  if (mail.state === "queued") return { state: "queued", aheadOfYou: mail.aheadOfYou };
  return { state: "none" };
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

  return "confirmed";
}

/* ---------------------------------------------------------------- *
 *  Forgot password
 * ---------------------------------------------------------------- */

/**
 * Step one: somebody typed their address.
 *
 * ALWAYS returns the same shape, whether or not an account exists. The screen
 * that follows says "if that address has an account, the link is on its way",
 * because a version that said "no such account" would turn this form into a
 * membership checker: type an address, learn whether that person is a Rishi
 * Valley alumnus. For a private community that is precisely the fact worth
 * protecting, and it is the reason the copy is phrased the way it is rather
 * than more warmly.
 */
export async function requestPasswordReset(formData: FormData): Promise<{ ok: true }> {
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

  // Queued, not sent. The drain mints the token at the moment it actually
  // sends, so a reset that waits behind a launch-day backlog still arrives
  // with its full hour ahead of it. Resets sit at the front of the queue and
  // have a reserved slice of the daily budget (src/lib/email-queue.ts), so in
  // practice this leaves within seconds even on the worst day.
  await enqueueMail({
    kind: "reset",
    to: user.email,
    userId: user.id,
    payload: { name: user.name },
  });

  // The return value carries NOTHING about whether that address has an
  // account. An earlier draft returned the masked address when the row existed
  // and null when it did not, which handed the caller the exact fact this
  // whole function is shaped to withhold: type an address, read the response,
  // learn whether that person went to Rishi Valley. The screen that follows
  // masks the address the VISITOR TYPED, which is honest, useful for spotting
  // your own typo, and says nothing we did not already receive from them.
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
    },
  });

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

  return { ok: true, email: read.email };
}
