"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MailWarning, Check, Clock } from "lucide-react";
import { cn, VALLEY_TIME_ZONE, valleyDayKey } from "@/lib/utils";
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
    .toLocaleTimeString("en-GB", {
      timeZone: VALLEY_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    })
    .toLowerCase();
  // Compared in the valley's day, because that is the day the time above is
  // now printed in. Comparing browser-local calendar fields against an IST
  // clock face made the two disagree for any member reading from abroad.
  const sameDay = valleyDayKey(d) === valleyDayKey(now);
  return sameDay ? `at ${time}` : `tomorrow at ${time}`;
}

/** A store that never notifies: the "external" value here is the browser's
 *  locale, which does not change within a page's lifetime. */
function subscribeNever(): () => void {
  return () => {};
}

/**
 * The two rail pages (Feed, Catch-ups). On these, at the widths where the
 * 318px rail actually renders (>= 1180px, rail-grid.ts), the chip floats in
 * the rail's top-right corner instead of sitting in flow: centred above the
 * page it pushed the whole feed down, which read as the page starting in
 * the wrong place (owner, 2026-08-18: "move to the right of new post above
 * from the collection... I dont want the feed to start below it"). Other
 * pages have no rail to borrow, so they keep the in-flow chip.
 */
const RAIL_FLOAT_ROUTES = ["/feed", "/catchups"];

export function VerifyEmailBanner({ initial }: { initial: BannerState }) {
  const router = useRouter();
  const pathname = usePathname();
  const floated = RAIL_FLOAT_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
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
      setFlash(`Sent to ${result.sentTo ?? "your address"}.`);
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
        // enough left to touch the New post button.
        floated &&
          "min-[1180px]:absolute min-[1180px]:top-0 min-[1180px]:right-0 min-[1180px]:mx-0 min-[1180px]:mb-0 min-[1180px]:w-[318px]"
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
          // Mid-send or seconds from a retry. One plain sentence and nothing
          // else (owner, 2026-08-18: no spam-folder aside, and the bolding
          // came off on second look); no button, because there is nothing
          // for them to do.
          <span>
            A link has been sent to your email. Tap on it to verify your
            account.
          </span>
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
        </>
      )}
    </div>
    </div>
  );
}
