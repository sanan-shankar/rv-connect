"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MailWarning, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { movedMessage, resendOutcomeMessage, sendTimeLabel } from "@/lib/confirmation-copy";
import { callAction } from "@/lib/call-action";
import { resendVerification } from "./email-actions";
import { ChangeEmailDialog, type NewLinkState } from "./change-email-dialog";
import { BESIDE_HEADER_CONTROLS } from "@/components/common/control-geometry";
import { railStartsAtTop } from "@/components/layout/rail-grid";

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
  /** Genuinely deferred: the day's budget is spent. `sendingAt` (ISO) is
   *  when it refills; `label` is the server's wording of it, so the first
   *  paint already says the right day. `open` is the session's email gate:
   *  true while nothing has ever been sent (`confirmationStillWaiting`), and
   *  then the copy says everything is open instead of naming the limit. */
  | { state: "queued"; sendingAt: string; label?: string; open: boolean }
  /** The receiving server refused it. `mailboxFull` when the reason was a
   *  full inbox, which emptying fixes (`mailboxWasFull`). */
  | { state: "bounced"; sentTo: string; mailboxFull: boolean }
  | { state: "none"; sentTo: string };

/** A store that never notifies: the "external" value here is the browser's
 *  locale, which does not change within a page's lifetime. */
function subscribeNever(): () => void {
  return () => {};
}

/*
 * On the Feed (`railStartsAtTop`), at the widths where the 318px rail
 * actually renders (>= 1180px, rail-grid.ts),
 * the chip floats in the rail's top-right corner instead of sitting in flow:
 * centred above the page it pushed the whole feed down, which read as the page
 * starting in the wrong place (owner, 2026-08-18: "move to the right of new
 * post above from the collection... I dont want the feed to start below it").
 * Other pages have no rail top to borrow, so they keep the in-flow chip. This
 * was a route list with all of /catchups on it, and after the Catch-ups rework
 * it floated onto the index's "Start a Catch-up" pill and onto a Catch-up's
 * cover photograph.
 */

export function VerifyEmailBanner({ initial }: { initial: BannerState }) {
  const router = useRouter();
  const pathname = usePathname();
  const floated = railStartsAtTop(pathname);
  const [state, setState] = useState<BannerState>(initial);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [changing, setChanging] = useState(false);

  /** Switch to wherever a fresh link has got to, without a reload. */
  function applyNewLink(result: NewLinkState): void {
    if (result.state === "sent") {
      setState({ state: "sent", sentTo: result.sentTo ?? "your address" });
    } else if (result.state === "queued" && result.sendingAt) {
      setState({ state: "queued", sendingAt: result.sendingAt, open: !!result.open });
    } else {
      setState({ state: "imminent" });
    }
  }

  /** "Use another email" landed, or a full mailbox was tried again. The flash
   *  is the confirmation, and after a move it says the sign-in address
   *  changed, which is the one thing they must not miss. The refresh is for
   *  the gate: a new address still waiting behind the limit opens everything
   *  (`confirmationStillWaiting`), and only the server knows that. */
  function handleDone(result: NewLinkState, moved: boolean): void {
    setChanging(false);
    applyNewLink(result);
    setFlash(moved ? movedMessage(result) : resendOutcomeMessage(result));
    router.refresh();
  }

  async function handleSend() {
    if (busy) return;
    setBusy(true);
    setFlash("");
    try {
      // callAction: a rejected resend used to leave `busy` stuck true
      // forever, so the button sat on "Sending..." for the rest of the
      // session (audit B-042). "ok" in result tells a genuine { ok: false }
      // apart from callAction's own ActionFailure, which carries no `ok`.
      const result = await callAction(() => resendVerification());
      if (!("ok" in result) || !result.ok) {
        setFlash(result.error ?? "That did not work. Try again in a minute.");
        return;
      }
      applyNewLink(result);
      setFlash(result.state === "sent" ? `Sent to ${result.sentTo ?? "your address"}.` : "");
      // The gate is read server-side, so a confirmation that landed while this
      // page was open only takes effect on the next render pass.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const queued = state.state === "queued";
  const imminent = state.state === "imminent";
  const Icon = queued || imminent ? Clock : MailWarning;

  // The refill time depends on `now`: sendTimeLabel compares the send against
  // the current valley day to choose "at", "tomorrow at" or a weekday, and the
  // server renders at one instant while the browser hydrates at another. Land
  // either side of valley midnight and the two disagree (a hydration mismatch
  // was caught live on 2026-08-13, back when locale was the cause).
  // useSyncExternalStore is the sanctioned tool for exactly that. The server
  // snapshot is the label the layout already worded, so the first paint says
  // the right day and hydration matches it; the browser re-words it only in
  // that midnight minute. It used to be "" on the server, which painted a bare
  // "tomorrow" first -- wrong for everybody two or more days back in line.
  const sendingAtIso = state.state === "queued" ? state.sendingAt : null;
  const serverLabel = state.state === "queued" ? (state.label ?? "") : "";
  const timeLabel = useSyncExternalStore(
    subscribeNever,
    () => (sendingAtIso ? sendTimeLabel(sendingAtIso) : ""),
    () => serverLabel,
  );
  const gateOpen = state.state === "queued" && state.open;

  return (
    // The outer div is the rail-float anchor: zero-height and relative from
    // 1180px on the rail pages, so the chip inside pins to the column's
    // top-right while the page's own content starts at the very top,
    // unpushed. On every other page it is inert.
    <div className={cn(floated && "min-[1180px]:relative min-[1180px]:z-20 min-[1180px]:h-0")}>
    <div
      className={cn(
        // The cinnamon tint trio from the colour protocol (rule 4): an
        // informational chip, not an error. Red here would say something has
        // gone wrong, and nothing has: they joined a minute ago.
        // A chip sized to its sentence, not a full-width bar (owner,
        // 2026-08-18: "make the orange alert rectangle smaller to fit the
        // text"): w-fit hugs the line, mx-auto keeps it composed over the
        // centered onboarding column, max-w-full lets the longer resend
        // state wrap instead of overflowing. px-3 py-2 and the 16px icon
        // are the same trim from the earlier pass.
        "mx-auto mb-[var(--space-m)] flex w-fit max-w-full flex-wrap items-center gap-x-2.5 gap-y-2 rounded-[var(--radius-md)] border border-cinnamon/30 bg-cinnamon/[0.07] px-3 py-2",
        // Floated over the rail at rail widths: exactly the rail card's
        // 318px, so it reads as the rail's first card and never reaches far
        // enough left to touch the New post button. Its TOP is the header's
        // search and bell circles' top, which PageHeader lifts above the
        // column (owner, 2026-09-28: "align the top of the confirm your email
        // box to the top of the notification search circles"). At top-0 it
        // started 3.5px lower and read as hanging off the Collection card
        // below it rather than the header row.
        floated && [
          BESIDE_HEADER_CONTROLS,
          "min-[1180px]:absolute min-[1180px]:right-0 min-[1180px]:mx-0 min-[1180px]:mb-0 min-[1180px]:w-[318px]",
        ]
      )}
    >
      {/* After a resend, the confirmation IS the chip: one check, one line.
          The first draft appended it under the normal content, which inside
          the rail's 318px stacked three wrapped lines around a floating
          button (owner: "this doesn't render right"). There is nothing left
          to do after sending, so nothing else earns the room. */}
      {flash ? (
        <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] leading-snug text-cinnamon">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {flash}
        </p>
      ) : (
        <>
      <Icon className="h-4 w-4 shrink-0 text-cinnamon" aria-hidden />

      <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-foreground">
        {queued && gateOpen ? (
          // Waiting behind the daily limit with nothing ever sent, so every
          // gate is open (owner, 2026-09-29: "until we have sent the
          // verification email, they should continue to have full access").
          // The promise and the fact that nothing is locked. No reason clause:
          // they are not blocked, the time is the promise, and "the limit" is
          // only one of the two ways a row ends up waiting.
          <>
            <span className="font-medium">
              We&apos;ll send your confirmation email {timeLabel || "soon"}.
            </span>{" "}
            <span className="text-muted-foreground">
              Everything is open to you until then.
            </span>
          </>
        ) : queued ? (
          // The one place the limit may be named, and only reachable when the
          // day's count is genuinely at the cap (verificationMailState sends
          // the mail itself in every other case, so this state cannot render
          // otherwise). Names the refill time instead of "up to a day".
          <>
            <span className="font-medium">
              We have hit today&apos;s email limit.
            </span>{" "}
            <span className="text-muted-foreground">
              Your link goes out {timeLabel || "soon"}. Nothing you need to
              do.
            </span>
          </>
        ) : imminent ? (
          // Mid-send or seconds from a retry. One plain sentence and nothing
          // else (owner, 2026-08-18: no spam-folder aside, and the bolding
          // came off on second look); no button, because there is nothing
          // for them to do.
          <span>
            A link has been sent to your email. Tap on it to verify your
            account.
          </span>
        ) : state.state === "bounced" ? (
          // Accepted, then refused by their mail server. What happened and
          // why, in their words; the fix is the button. A full mailbox's own
          // retry lives inside the dialog, so the chip keeps one control like
          // every other state.
          <>
            <span className="font-medium">
              We couldn&apos;t deliver your confirmation email.
            </span>{" "}
            <span className="text-muted-foreground">
              {state.mailboxFull ? (
                <>
                  The mailbox at{" "}
                  <span className="text-foreground">{state.sentTo}</span> is
                  full.
                </>
              ) : (
                <>
                  <span className="text-foreground">{state.sentTo}</span>{" "}
                  didn&apos;t accept it.
                </>
              )}
            </span>
          </>
        ) : (
          // Two short facts and nothing else (owner, 2026-08-18: the "to
          // post, upload photos..." feature list came off).
          <>
            <span className="font-medium">Confirm your email.</span>
            {state.state === "sent" && (
              <span className="text-muted-foreground">
                {" "}
                We sent a link to{" "}
                <span className="text-foreground">{state.sentTo}</span>.
              </span>
            )}
          </>
        )}
      </p>

      {/* No button while it is queued or in flight: there is nothing to send
          again, and a control that cannot help is worse than no control. A
          bounce gets the fix instead of a resend: sending the same thing to
          an address that refused it is the loop this state exists to end. */}
      {state.state === "bounced" ? (
        <button
          type="button"
          onClick={() => setChanging(true)}
          className="state-layer shrink-0 rounded-full border border-cinnamon/40 px-3 py-1.5 text-[12.5px] font-semibold text-cinnamon transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Use another email
        </button>
      ) : (
        !queued &&
        !imminent && (
          <button
            type="button"
            onClick={handleSend}
            disabled={busy}
            className="state-layer shrink-0 rounded-full border border-cinnamon/40 px-3 py-1.5 text-[12.5px] font-semibold text-cinnamon transition-colors duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {busy ? "Sending..." : state.state === "sent" ? "Send it again" : "Send me the link"}
          </button>
        )
      )}
        </>
      )}
    </div>
    <ChangeEmailDialog
      open={changing}
      onOpenChange={setChanging}
      retryTo={state.state === "bounced" && state.mailboxFull ? state.sentTo : undefined}
      onDone={handleDone}
    />
    </div>
  );
}
