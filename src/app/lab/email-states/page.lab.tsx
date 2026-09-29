"use client";

import { DelightShell, DemoGrid, DemoCard } from "../_kit";
import { VerifyEmailBanner, type BannerState } from "@/components/auth/verify-email-banner";
import { movedMessage, resendOutcomeMessage, sendTimeLabel } from "@/lib/confirmation-copy";

/* ------------------------------------------------------------------ *
 *  Every line a new member can read about their confirmation email.
 *
 *  The real banner, in each state it has. They cannot be seen any other
 *  way off production: a dev machine does not send mail, so its queue
 *  never reaches "waiting" and every row reads as in flight. Rules in
 *  docs/spec/email.md.
 * ------------------------------------------------------------------ */

/** The next UTC midnight, `days` refills from now: 5:30 am IST. */
function refill(days: number): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)
  ).toISOString();
}

function waiting(days: number, open: boolean): BannerState {
  const sendingAt = refill(days);
  return { state: "queued", sendingAt, label: sendTimeLabel(sendingAt), open };
}

const STATES: { title: string; note: string; state: BannerState }[] = [
  {
    title: "Waiting, everything open",
    note: "Signed up after the day's emails ran out. Nothing has been sent yet, so the whole site works for them.",
    state: waiting(1, true),
  },
  {
    title: "Waiting, further back in line",
    note: "The same, two refills away. The day is named, never a flat \"tomorrow\".",
    state: waiting(2, true),
  },
  {
    title: "Waiting on a resend",
    note: "They were sent a link before and asked for another on a spent day. Still locked until they tap one.",
    state: waiting(1, false),
  },
  {
    title: "On its way",
    note: "Leaving right now, or seconds from a retry.",
    state: { state: "imminent" },
  },
  {
    title: "Sent",
    note: "In their inbox. Everything past reading waits for the tap.",
    state: { state: "sent", sentTo: "p***@gmail.com" },
  },
  {
    title: "Bounced, mailbox full",
    note: "Their mail server took it and handed it back. Use another email opens the fix, with a quiet retry for once they have made space.",
    state: { state: "bounced", sentTo: "d***@gmail.com", mailboxFull: true },
  },
  {
    title: "Bounced, refused",
    note: "The address does not take mail at all, usually a typo. Only a new address helps.",
    state: { state: "bounced", sentTo: "p***@gmial.com", mailboxFull: false },
  },
  {
    title: "Nothing on file",
    note: "Rare: the signup's email never got queued.",
    state: { state: "none", sentTo: "p***@gmail.com" },
  },
];

const RESENDS = [
  resendOutcomeMessage({ state: "sent", sentTo: "p***@gmail.com" }),
  resendOutcomeMessage({ state: "imminent" }),
  resendOutcomeMessage({ state: "queued", sendingAt: refill(1), open: false }),
  resendOutcomeMessage({ state: "queued", sendingAt: refill(2), open: true }),
];

const MOVES = [
  movedMessage({ state: "sent", sentTo: "n***@gmail.com" }),
  movedMessage({ state: "queued", sentTo: "n***@gmail.com", sendingAt: refill(1) }),
];

export default function Page() {
  return (
    <DelightShell
      title="Email states"
      lede="What a new member reads about their confirmation email, from waiting to sent to bounced. These are the live banner, not pictures of it."
    >
      <DemoGrid>
        {STATES.map((s) => (
          <DemoCard key={s.title} title={s.title} note={s.note}>
            <VerifyEmailBanner initial={s.state} />
          </DemoCard>
        ))}
        <DemoCard
          title="After pressing send again"
          note="The same four answers in the banner, the confirm-email card and the link page."
          span={2}
        >
          <ul className="space-y-2 text-[13.5px] leading-snug text-foreground">
            {RESENDS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DemoCard>
        <DemoCard
          title="After using another email"
          note="Where the new link has got to, and that they sign in with the new address now."
        >
          <ul className="space-y-2 text-[13.5px] leading-snug text-foreground">
            {MOVES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DemoCard>
      </DemoGrid>
    </DelightShell>
  );
}
