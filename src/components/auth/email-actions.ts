"use server";

import bcrypt from "bcryptjs";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { maskEmail } from "@/lib/email";
import { burnTokens, hashToken, readToken } from "@/lib/auth-tokens";
import { passwordProblem } from "@/lib/password-rule";
import { enqueueMail, verificationMailState } from "@/lib/email-queue";
import { sendVerificationEmail } from "@/lib/verification-mail";
import { tryRosterAutoVerifyQuietly } from "@/lib/roster";
import { verifyHumanFromForm } from "@/lib/turnstile";
import { BOT_CHECK_FAILED } from "@/lib/bot-check-message";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { mintHumanPass } from "@/lib/human-pass";
import { normalizeEmail } from "@/lib/email-address";
import { reportSwallowed } from "@/lib/report-error";

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
   *  and only "queued" may mention the email limit.
   *
   *  A row that gave up for good, or one that somehow does not exist right
   *  after an enqueue, is never spelled as one of these three: it comes back
   *  as `ok: false` instead, the same shape every other failure in this
   *  function already uses. Before this, both folded into "imminent" (bug
   *  audit M51) -- which told a member whose confirmation had permanently
   *  failed that it was still on its way, forever, since nothing was ever
   *  going to move it out of that state on its own. */
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
  // sendInline: somebody pressed "send it again" and is watching the button.
  // The layout deliberately does not (audit M20).
  const state = await verificationMailState(session.user.id, { sendInline: true });

  if (state.state === "failed" || state.state === "none") {
    // Honest, not "imminent" (M51): "failed" means the row already tried and
    // gave up -- nothing will move it further without a fresh attempt, which
    // is exactly what this button is for, so `ok: false` here (rather than a
    // false "sent") is what leaves the retry control on screen instead of
    // hiding it behind a state that reads as "nothing left to do". "none"
    // should not happen right after a successful enqueue, but answering it
    // honestly costs nothing and a silent miscategorisation costs a member
    // their retry button for reasons no one could see.
    return {
      ok: false,
      // Not "in Settings": there is no settings page, the profile is it
      // (audit M49). Naming a screen that does not exist in the one message a
      // stuck member reads is its own small dead end.
      error:
        "That did not go through. Check the email address on your profile, then try again.",
    };
  }

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

export type ConfirmOutcome =
  | "confirmed"
  | "already"
  | "superseded"
  | "expired"
  | "unknown"
  | "stale";

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
  // Peek, not consume: the expired/stale/unknown/already-used branches below
  // need to read the token WITHOUT spending it, because spending happens
  // together with the effect it unlocks, in one transaction, a few lines down
  // (bug audit Low 22). Before this, `readToken(consume: true)` burned the
  // token as its own statement and `emailVerified` was written separately: a
  // crash or a DB error in between left the token spent for nothing and the
  // address still unconfirmed. Verify tokens are never burned on remint
  // (B-021), so a resend would still have worked -- but the very next load of
  // THIS link threw an uncaught error instead of landing on the graceful
  // "superseded" screen that a plain "used" token already gets.
  const peek = await readToken(token, "verify", { consume: false });

  if (!peek.ok) {
    if (peek.reason === "used") {
      // Used token, but "used" is not the same as "confirmed". The account row
      // is what decides: a mail client prefetching the link, or an older mail
      // whose token an earlier remint burned, both arrive here with the address
      // still unverified. Telling that member "nothing left to do" and hiding
      // the resend button was the dead end this checks for (bug audit B-021).
      const account = await prisma.user.findUnique({
        where: { id: peek.userId },
        select: { emailVerified: true },
      });
      return account?.emailVerified ? "already" : "superseded";
    }
    return peek.reason === "expired"
      ? "expired"
      : peek.reason === "stale"
        ? "stale"
        : "unknown";
  }

  // Burn the token and confirm the address together. `readToken` cannot be
  // called from inside this callback for the burn (see `hashToken`'s
  // docblock in auth-tokens.ts): it writes through the shared `prisma` client, not `tx`,
  // so it would not join this transaction at all. The claim below repeats
  // `readToken`'s own conditional update -- unused, unexpired, this kind --
  // so of two racing redemptions (a second tab, a mail client prefetch)
  // exactly one still wins.
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.authToken.updateMany({
      where: {
        tokenHash: hashToken(token),
        kind: "verify",
        usedAt: null,
        expiresAt: { gt: new Date() },
        // ...and the address has not moved on since the link was sent, which
        // is `readToken`'s "stale" check. The peek above already refused that
        // case, but only as of the peek: without repeating it here the claim
        // would be LOOSER than the read it stands in for, and a member who
        // changed their email in the instant between the two would have this
        // link confirm the mailbox they just left.
        user: { email: peek.email },
      },
      data: { usedAt: new Date() },
    });
    if (claim.count === 0) return false;
    await tx.user.update({
      where: { id: peek.userId },
      data: { emailVerified: new Date() },
    });
    return true;
  });

  if (!claimed) {
    // Lost the single-use race in the instant between the peek above and this
    // claim. Same recovery as the ordinary "used" branch: read the account
    // fresh and say which of "already" or "superseded" is true right now.
    const account = await prisma.user.findUnique({
      where: { id: peek.userId },
      select: { emailVerified: true },
    });
    return account?.emailVerified ? "already" : "superseded";
  }

  // The mailbox is proven the instant the transaction above lands, which is
  // the moment an office-roster match becomes meaningful (trust model, Stage
  // 2). Quietly: a roster hiccup must never turn a successful confirmation
  // into an error screen.
  await tryRosterAutoVerifyQuietly(peek.userId);

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

  const raw = normalizeEmail(formData.get("email") as string | null);

  // Nothing usable typed: still answer as though it worked.
  if (!raw || !raw.includes("@")) return { ok: true };

  const user = await prisma.user.findUnique({
    where: { email: raw },
    select: { id: true, name: true, email: true, password: true, isBlocked: true },
  });

  // No account, an account with no password to reset (the admin bypass row),
  // or one an admin has blocked. Same answer either way -- the identical
  // { ok: true } is the whole point, so a blocked member learns nothing here
  // that anybody else would not. What changes is that no reset mail goes out:
  // sending one invited them to complete a flow ending in "we are signing you
  // in now", after which the door refused the new password with "Invalid email
  // or password", for ever (audit C-033).
  if (!user?.password || user.isBlocked) return { ok: true };

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
  // one link and strand them back at the request form. This same peek also
  // stands in for the general validity check below: nothing else changes
  // about this token between here and the claim a few lines down, so there
  // is no need to read it a second time before knowing whether to burn it.
  const peek = await readToken(input.token, "reset", { consume: false });
  if (!peek.ok) {
    return {
      ok: false,
      error:
        peek.reason === "expired"
          ? "That link has run out. Ask for a new one and it will be in your inbox in a moment."
          : peek.reason === "used"
            ? "That link has already been used. Ask for a new one if you still need it."
            : "We do not recognise that link. Ask for a new one to be safe.",
    };
  }
  const weak = passwordProblem(input.password, peek.email);
  if (weak) return { ok: false, error: weak };

  const hashed = await bcrypt.hash(input.password, 12);

  // Burn the token and set the new password together, in ONE transaction
  // (bug audit Low 114). Before this, `readToken(consume: true)` burned the
  // token as its own statement and the password write followed separately:
  // a crash or a DB error in between spent the person's one link for nothing
  // and left the password unchanged, and unlike a confirmation link (Low 22,
  // just above) there was no soft landing -- reset tokens ARE burned on
  // remint (see auth-tokens.ts's `BURNS_ON_MINT`), so the
  // only way back was a whole new request-a-reset round trip. Wrapped like
  // this, a failure rolls the burn back too: the SAME link is still good to
  // retry, exactly as if nothing had been submitted.
  //
  // `readToken` cannot supply the burn itself (see `hashToken`'s docblock in
  // auth-tokens.ts), so the claim below repeats its own conditional update -- unused,
  // unexpired, this kind -- so of two racing submissions (a double-click, a
  // retried request) exactly one still wins.
  const applied = await prisma.$transaction(async (tx) => {
    const claim = await tx.authToken.updateMany({
      where: {
        tokenHash: hashToken(input.token),
        kind: "reset",
        usedAt: null,
        expiresAt: { gt: new Date() },
        // `readToken`'s "stale" check, repeated for the same reason as in
        // confirmEmailToken above: the peek refused a moved address as of the
        // peek, and without this the claim would be looser than the read it
        // replaces, handing the password of an account to a link sent to an
        // address it no longer uses.
        user: { email: peek.email },
      },
      data: { usedAt: new Date() },
    });
    if (claim.count === 0) return null;

    return tx.user.update({
      where: { id: peek.userId },
      data: {
        password: hashed,
        // Getting mail at this address is proof it is theirs, so a reset
        // doubles as a confirmation. Someone locked out of posting because
        // they never found the original welcome mail is fixed by the very
        // act of proving they can read the inbox.
        emailVerified: new Date(),
        /* Ends every session already signed in on this account (audit M4).
           Without it, a reset burned the outstanding reset LINKS below and
           left the attacker's actual session cookie working for its full 30
           days -- so the one action a phished member takes to save
           themselves did not touch the thing that had been stolen. */
        credentialVersion: { increment: 1 },
      },
      select: { name: true },
    });
  });

  if (!applied) {
    // Lost the single-use race in the instant between the peek above and
    // this claim: nothing was written, so nothing needs to be undone. Same
    // message a plain re-read would have given.
    return { ok: false, error: "That link has already been used. Ask for a new one if you still need it." };
  }

  /* Everything past this point is AFTER the password has changed, and none of
     it may take that success away again (audit C-035).
     These three were plain awaits with no catch, under a comment claiming the
     mail was "never awaited for success". A pool timeout inside any of them
     threw out of the server action, so the member watched "Saving..." for ever
     with no way to know their password had in fact been written -- and the
     token was already burned, so trying again said "That link has already been
     used". The transaction above is the thing that had to be atomic; these are
     the things that may be retried, or simply logged.

     Awaited rather than deferred to after(), because the client signs in on
     this response and mintHumanPass has to be in place before it does. The
     catch is what makes that safe. */
  try {
    // A reset doubles as a confirmation (above), so it is also a moment the
    // roster may vouch for this account. Same best-effort contract as in
    // confirmEmailToken.
    await tryRosterAutoVerifyQuietly(peek.userId);

    // Any other reset links already in flight die with this one.
    await burnTokens(peek.userId, "reset");

    // Tell the mailbox that the password moved. This is the only warning a
    // person gets if somebody else did it, so it is queued at high priority
    // (just behind resets) rather than left to a launch-day backlog. Queued
    // rather than sent: a mail failure must not undo a password change that
    // has already been written.
    await enqueueMail({
      kind: "password-changed",
      to: peek.email,
      userId: peek.userId,
      payload: { name: applied.name ?? "there" },
    });

    // The client signs the person straight in with their new password, which
    // now crosses authorize()'s bot check. Consuming a single-use emailed link
    // is already proof of a human with the mailbox, so it earns the same
    // five-minute pass a fresh signup gets.
    await mintHumanPass(peek.email);
  } catch (err) {
    reportSwallowed("reset", err, { userId: peek.userId, step: "post-commit" });
  }

  return { ok: true, email: peek.email };
}
