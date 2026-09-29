"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IS_DEMO } from "@/lib/demo";
import { emailField } from "@/lib/email-address";
import { isUndeliverable } from "@/lib/email";
import { rateLimit, hasBudget, consume, clientIp } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { sendVerificationEmail } from "@/lib/verification-mail";
import { verificationMailState } from "@/lib/email-queue";
import { emailGateOpenFor } from "@/lib/email-gate-open";
import { maskEmail } from "@/lib/mask-email";
import { writeAudit } from "@/lib/audit";
import { reportSwallowed } from "@/lib/report-error";

/* ------------------------------------------------------------------ *
 *  "Use another email": the way out when a confirmation bounces.
 *
 *  Resend accepts the message and the receiving server refuses it,
 *  sometimes hours later -- two members' Gmail inboxes were full in
 *  September, and every resend the owner pressed went the same way. The
 *  owner's call (2026-09-29): the member fixes it themselves, rather than
 *  making a second account or waiting on the owner.
 *
 *  Only for an UNCONFIRMED account. A confirmed address is the account's
 *  identity, and moving it would want the old inbox's say-so, which is
 *  exactly what this flow exists because it cannot get.
 * ------------------------------------------------------------------ */

export type ChangeEmailResult =
  | {
      ok: true;
      /** The new address, masked, for "sign in with it from now on". */
      sentTo: string;
      /** Where the new confirmation has got to, as `resendVerification`
       *  reports it, so the banner can switch without a reload. */
      state: "sent" | "imminent" | "queued";
      sendingAt?: string;
      open?: boolean;
    }
  | { ok: false; error: string };

export async function changeUnconfirmedEmail(formData: FormData): Promise<ChangeEmailResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };
  // The demo persona is born confirmed and has no mailbox; its Prisma
  // allowlist would refuse the write anyway.
  if (IS_DEMO) return { ok: false, error: "This is a demo account, so it stays put." };
  const userId = session.user.id;

  // `formData.get` can hand back a File (audit C-174), so anything that is not
  // a string is treated as empty rather than crashing a string method below.
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const parsed = emailField().safeParse(typeof rawEmail === "string" ? rawEmail : "");
  if (!parsed.success) return { ok: false, error: "That doesn't look like an email address." };
  const email = parsed.data;
  if (isUndeliverable(email)) {
    return { ok: false, error: "That address can't receive email. Try another one." };
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true, password: true, name: true },
  });
  if (!me) return { ok: false, error: "Not authenticated" };
  if (me.emailVerified) return { ok: false, error: "Your email is already confirmed." };
  if (!me.password) {
    return {
      ok: false,
      error: "This account has no password to confirm with. Please message the admin instead.",
    };
  }
  if (email === me.email.trim().toLowerCase()) {
    return { ok: false, error: "That's the address we already have. Try a different one." };
  }

  /* Metered BEFORE anything that can say "that address is taken", which makes
     this a membership checker like signup's. By IP as well as by account, or
     a handful of throwaway signups would multiply signup's own IP meter. */
  const ip = await clientIp();
  for (const key of [ip, userId]) {
    const limited = await rateLimit("emailChange", key);
    if (!limited.ok) return { ok: false, error: limited.error };
  }

  /* Three moves a month (see `emailMoves` in rate-limit.ts). Checked before
     the password so a member at the ceiling is told why rather than asked for
     a password that cannot help; SPENT only after a move lands, below. */
  if (!(await hasBudget("emailMoves", userId))) {
    return {
      ok: false,
      error: "You've changed your address three times this month. Message the admin through Support to change it again.",
    };
  }

  /* The password is the point. Without it, anyone holding a signed-in device
     could move the account to their own inbox and reset the password from
     there. Wrong guesses spend the same `reauth` budget as confirming a
     deletion, because this is a second door the login limiter never sees. */
  if (!(await hasBudget("reauth", userId))) {
    return { ok: false, error: "Too many password attempts. Try again in a little while." };
  }
  if (!(await bcrypt.compare(password, me.password))) {
    await consume("reauth", userId);
    return { ok: false, error: "That password isn't right." };
  }

  let moved: boolean;
  try {
    moved = await prisma.$transaction(async (tx) => {
      /* Conditional on the row still being the one just read: an address
         confirmed, or moved by a second tab, in the moment since must not be
         overwritten. */
      const updated = await tx.user.updateMany({
        where: { id: userId, email: me.email, emailVerified: null },
        data: { email },
      });
      if (updated.count === 0) return false;
      /* A confirmation still WAITING goes to the new address instead, and
         keeps its place in line. Re-addressed rather than deleted and queued
         afresh, because a fresh row is always the youngest in the drain's
         oldest-first order: an account moving to invented addresses on a
         backlog day would never reach the front, so its link would never go
         out and the email gate would never shut (write-path review,
         2026-09-29). It is also simply fair: fixing a typo should not cost
         somebody their turn. Queued rows only -- one mid-send is left to finish
         rather than yanked out from under its claim. The enqueue below then
         folds into the re-addressed row instead of adding a second. */
      await tx.outboundEmail.updateMany({
        where: { userId, kind: "verify", status: "queued" },
        data: { to: email },
      });
      return true;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // The same sentence signup gives, so this door says nothing that one
      // does not already.
      return { ok: false, error: "That address already has an account. Sign in with it instead." };
    }
    throw err;
  }
  if (!moved) {
    return {
      ok: false,
      error: "Your account changed while you were doing this. Reload the page and try again.",
    };
  }
  await consume("emailMoves", userId);

  await writeAudit({
    actorId: userId,
    action: "account.email_change",
    targetType: "user",
    targetId: userId,
    ip,
    detail: `${maskEmail(me.email)} -> ${maskEmail(email)}`,
  });

  /* Everything past the transaction happens AFTER the address has moved, and
     a failure here must not read as "nothing happened": a retry of the same
     address would then be told it is the one we already have. So the answer
     says what is true -- moved, link not sent -- and the way on, which is the
     banner's own button once the page is reloaded (it will show "Send me the
     link", since no row for the new address exists). The same shape as
     resetPassword's post-commit block (audit C-035). */
  try {
    // The link goes to the new address now, or waits its turn like anyone's.
    await sendVerificationEmail({ id: userId, name: me.name, email });
    const state = await verificationMailState(userId, { sendInline: true });

    return {
      ok: true,
      sentTo: maskEmail(email),
      state: state.state === "sent" ? "sent" : state.state === "queued" ? "queued" : "imminent",
      sendingAt: state.state === "queued" ? state.sendingAt.toISOString() : undefined,
      open:
        state.state === "queued"
          ? await emailGateOpenFor({ id: userId, email, emailVerified: null })
          : undefined,
    };
  } catch (err) {
    reportSwallowed("change-email", err, { userId, step: "post-commit" });
    return {
      ok: false,
      error: `Your address is now ${maskEmail(email)}, but the link did not go out. Reload the page and tap Send me the link.`,
    };
  }
}
