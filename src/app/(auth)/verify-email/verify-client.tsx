"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthHeading, AuthPanel } from "@/components/auth/auth-panel";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { resendVerification, type ConfirmOutcome } from "@/components/auth/email-actions";

/* ------------------------------------------------------------------ *
 *  The confirmation link's landing page.
 *
 *  Five outcomes, each with its own bird and its own next step. The
 *  split matters more here than anywhere else in this feature: this is
 *  the page reached by the person who is least sure what is going on,
 *  often on a phone, often hours after signing up. "Invalid token" would
 *  be true for three of these and useful for none.
 * ------------------------------------------------------------------ */

type Outcome = ConfirmOutcome | "waiting";

const COPY: Record<Outcome, { title: string; body: string }> = {
  confirmed: {
    title: "You're confirmed",
    body: "That is your address, and everything is open now. Post, write a letter, add photographs to the Collection, and see how to reach the people you find.",
  },
  already: {
    title: "Already confirmed",
    body: "This address was confirmed earlier, so there is nothing left to do. You can carry on where you left off.",
  },
  expired: {
    title: "That link has run out",
    body: "Confirmation links last a day. Nothing is wrong with your account and nothing is lost, you just need a fresh one.",
  },
  stale: {
    title: "That link is out of date",
    body: "The email address on this account changed after the link was sent, so it no longer applies. Ask for a new one and it will go to the current address.",
  },
  unknown: {
    title: "We do not recognise that link",
    body: "Long links sometimes get cut in half by email apps. Try copying the whole thing from the message, or ask for a new one.",
  },
  waiting: {
    title: "Check your inbox",
    // Two sentences, not four. "Open it and this page will not be needed
    // again" told somebody standing on the page a thing they could work out,
    // and cost a whole line to do it.
    body: "We sent a link when you joined. If it never arrived, look in spam, or send yourself another.",
  },
};

/** Which outcomes are a happy ending. Drives both the bird and whether a
 *  resend button is worth offering. */
const GOOD: ReadonlySet<Outcome> = new Set<Outcome>(["confirmed", "already"]);

export function VerifyEmailClient({
  outcome,
  signedIn,
  alreadyVerified,
}: {
  outcome: Outcome;
  signedIn: boolean;
  alreadyVerified: boolean;
}) {
  const { ref: hoopoeRef } = useHoopoe();
  const [resent, setResent] = useState<string | null>(null);
  const [resendError, setResendError] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = COPY[outcome];
  const good = GOOD.has(outcome);
  // The resend button only makes sense for somebody who is signed in and not
  // yet confirmed: the action reads the address off the session, so a signed
  // out visitor has nothing for it to send to. They get a sign-in link instead.
  const canResend = signedIn && !alreadyVerified && !good;

  function onHoopoeReady(api: HoopoeApi) {
    if (outcome === "confirmed") {
      // The one full celebration in this feature. Confirming is the last step
      // of joining, and it is the only moment here that has actually finished
      // something.
      void api.celebrate(3);
      setTimeout(() => void api.express("happy"), 1800);
    } else if (outcome === "already") {
      void api.express("happy");
      void api.nod(1);
    } else if (outcome === "waiting") {
      // Waiting, not failed. `curious` is the pose that reads as "any minute
      // now" rather than as bad news.
      void api.express("curious");
    } else {
      // Expired, stale or unrecognised. `worried` carries a furrow without the
      // full grief tent of `sad`, which is the right weight for something that
      // is annoying and completely fixable.
      void api.express("worried");
      void api.shake(1);
    }
  }

  async function handleResend() {
    if (busy) return;
    setBusy(true);
    setResendError("");
    const result = await resendVerification();
    if (result.ok) setResent(result.sentTo ?? "your address");
    else setResendError(result.error ?? "That did not work. Try again in a minute.");
    setBusy(false);
  }

  return (
    <AuthPanel
      back={{ href: signedIn ? "/feed" : "/login", label: signedIn ? "Back to the feed" : "Back to sign in" }}
      hoopoeRef={hoopoeRef}
      onHoopoeReady={onHoopoeReady}
    >
      <AuthHeading title={copy.title}>{copy.body}</AuthHeading>

      <div className="space-y-2.5">
        {good && (
          <Button
            variant="primary"
            className="w-full"
            nativeButton={false}
            render={<Link href={signedIn ? "/feed" : "/login"} />}
          >
            {signedIn ? "Take me to the feed" : "Sign in"}
          </Button>
        )}

        {canResend &&
          (resent ? (
            // Replaces the button rather than sitting under it. A live button
            // beside "we just sent it" invites a second press, which the rate
            // limit would refuse and which would read as the page ignoring them.
            <p className="rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
              Sent. Look for a message from hello@rishivalley.space at{" "}
              <span className="font-medium">{resent}</span>, and check spam if it
              is not there in a minute.
            </p>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              onClick={handleResend}
              disabled={busy}
            >
              {busy ? "Sending..." : "Send me a new link"}
            </Button>
          ))}

        {!good && !canResend && (
          <Button
            variant="primary"
            className="w-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Sign in to get a new link
          </Button>
        )}

        {resendError && <p className="text-sm text-destructive">{resendError}</p>}
      </div>
    </AuthPanel>
  );
}
