"use client";

import { useState, useSyncExternalStore } from "react";
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
  /** In another process's hands right now, or seconds from a retry. */
  | { state: "imminent" }
  /** Genuinely deferred: the day's budget is spent. The ONLY state whose copy
   *  may mention the email limit; `sendingAt` (ISO) is when it refills. */
  | { state: "queued"; sendingAt: string }
  | { state: "none"; sentTo: string };

/**
 * "tomorrow at 5:30 am", or "at 5:30 am" when the refill lands later the same
 * local day. Formatted in the BROWSER's timezone: the server cannot know where
 * the reader is, and "sometime tomorrow" is the kind of vague reassurance that
 * reads as a brush-off. Exported for the dialog, so the two never phrase the
 * same moment two ways.
 */
export function sendTimeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  const sameLocalDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameLocalDay ? `at ${time}` : `tomorrow at ${time}`;
}

/** A store that never notifies: the "external" value here is the browser's
 *  locale, which does not change within a page's lifetime. */
function subscribeNever(): () => void {
  return () => {};
}

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
      setFlash("Sent. Check your spam folder if it does not arrive.");
    } else if (result.state === "queued" && result.sendingAt) {
      setState({ state: "queued", sendingAt: result.sendingAt });
      setFlash("");
    } else {
      setState({ state: "imminent" });
      setFlash("");
    }
    // The gate is read server-side, so a confirmation that landed while this
    // page was open only takes effect on the next render pass.
    router.refresh();
  }

  const queued = state.state === "queued";
  const imminent = state.state === "imminent";
  const Icon = queued || imminent ? Clock : MailWarning;

  // The refill time is formatted ONLY in the browser. sendTimeLabel reads the
  // reader's locale, and the server's locale is not the reader's: SSR said
  // "5:30 am" where a 24-hour browser said "5:30", and React threw a
  // hydration mismatch over the difference (caught live, 2026-08-13).
  // useSyncExternalStore is the sanctioned tool for a value that legitimately
  // differs between server and client: the server snapshot is empty (both
  // sides hydrate on the bare "tomorrow"), and the client snapshot formats in
  // the reader's own locale on the very next render.
  const sendingAtIso = state.state === "queued" ? state.sendingAt : null;
  const timeLabel = useSyncExternalStore(
    subscribeNever,
    () => (sendingAtIso ? sendTimeLabel(sendingAtIso) : ""),
    () => "",
  );

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
          // The one place the limit may be named, and only reachable when the
          // day's count is genuinely at the cap (verificationMailState sends
          // the mail itself in every other case, so this state cannot render
          // otherwise). Names the refill time instead of "up to a day".
          <>
            <span className="font-medium">
              We have hit today&apos;s email limit.
            </span>{" "}
            <span className="text-muted-foreground">
              Your link goes out {timeLabel || "tomorrow"}. Nothing you need to
              do.
            </span>
          </>
        ) : imminent ? (
          // Mid-send or seconds from a retry. No deadline named, because there
          // is not one; no button, because there is nothing for them to do.
          <>
            <span className="font-medium">Your link is on its way.</span>{" "}
            <span className="text-muted-foreground">
              Give it a minute, then check your spam folder.
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">Confirm your email</span>{" "}
            <span className="text-muted-foreground">
              to post, upload photos and see contact details.
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

      {/* No button while it is queued or in flight: there is nothing to send
          again, and a control that cannot help is worse than no control. */}
      {!queued && !imminent && (
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
