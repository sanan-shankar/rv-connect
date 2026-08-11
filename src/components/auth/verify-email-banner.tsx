"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailWarning, Check, Clock } from "lucide-react";
import { resendVerification } from "./email-actions";

/* ------------------------------------------------------------------ *
 *  "Confirm your email", on every page until they do.
 *
 *  Not dismissible, and that is a decision rather than an oversight.
 *  Posting, uploads and other people's contact details are all shut
 *  until this is done, so a bar that can be closed leaves somebody
 *  wondering why half the app refuses them with no way back to the
 *  explanation. It is one line, it is calm, and it disappears for good
 *  the moment they click the link.
 *
 *  It reads QUEUE STATE, not just the flag, because Resend's free plan
 *  sends 100 a day and launch will exceed that. Telling somebody to go
 *  and look in an inbox we have not written to yet is how a working
 *  queue reads as a broken product, so "queued" gets its own sentence
 *  and no resend button (there is nothing to resend, it has not been
 *  sent once).
 * ------------------------------------------------------------------ */

export type BannerState =
  | { state: "sent"; sentTo: string }
  | { state: "queued"; aheadOfYou: number }
  | { state: "none"; sentTo: string };

export function VerifyEmailBanner({ initial }: { initial: BannerState }) {
  const router = useRouter();
  const [state, setState] = useState<BannerState>(initial);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function handleSend() {
    if (busy) return;
    setBusy(true);
    setFlash("");
    const result = await resendVerification();
    setBusy(false);

    if (!result.ok) {
      setFlash(result.error ?? "That did not work. Try again in a minute.");
      return;
    }
    if (result.state === "sent") {
      setState({ state: "sent", sentTo: result.sentTo ?? "your address" });
      setFlash("Sent. Look in your inbox, and in spam if it is not there.");
    } else {
      setState({ state: "queued", aheadOfYou: 0 });
      setFlash("");
    }
    // The gate is read server-side, so a confirmation that landed while this
    // page was open only takes effect on the next render pass.
    router.refresh();
  }

  const queued = state.state === "queued";
  const Icon = queued ? Clock : MailWarning;

  return (
    <div
      className={
        // The cinnamon tint trio from the colour protocol (rule 4): an
        // informational chip, not an error. Red here would say something has
        // gone wrong, and nothing has: they joined a minute ago.
        "mb-[var(--space-m)] flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-md)] border border-cinnamon/30 bg-cinnamon/[0.07] px-3.5 py-2.5"
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-cinnamon" aria-hidden />

      <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-foreground">
        {queued ? (
          <>
            <span className="font-medium">Your confirmation link is on its way.</span>{" "}
            <span className="text-muted-foreground">
              We send these in batches, so it can take up to a day. Everything
              opens as soon as you click it.
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">Confirm your email</span>{" "}
            <span className="text-muted-foreground">
              to post, add photographs, and see how to reach the people you find.
              {state.state === "sent" && (
                <>
                  {" "}
                  We sent a link to{" "}
                  <span className="text-foreground">{state.sentTo}</span>.
                </>
              )}
            </span>
          </>
        )}
        {flash && (
          <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-cinnamon">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {flash}
          </span>
        )}
      </p>

      {/* No button while it is queued: there is nothing to send again, and a
          control that cannot help is worse than no control. */}
      {!queued && (
        <button
          type="button"
          onClick={handleSend}
          disabled={busy}
          className="state-layer shrink-0 rounded-full border border-cinnamon/40 px-3 py-1.5 text-[12.5px] font-semibold text-cinnamon transition-colors duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinnamon"
        >
          {busy ? "Sending..." : state.state === "sent" ? "Send it again" : "Send me the link"}
        </button>
      )}
    </div>
  );
}
