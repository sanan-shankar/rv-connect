import { VALLEY_TIME_ZONE, valleyDayKey } from "./utils.ts";

/**
 * When a waiting confirmation goes out, as the end of a sentence: "at 4:40 pm
 * IST" later today, "tomorrow at 5:30 am IST", "on Thursday at 5:30 am IST",
 * or "on 6 October at 5:30 am IST" a week or more out.
 *
 * It used to know only "at" and "tomorrow at". The queue behind it
 * (`verifySendingAt`) counts the member's real place in line and on a busy
 * launch lands two and three days out, so the label promised tomorrow to
 * people who would not get their link until the day after (2026-09-29, the
 * launch). "Sometime soon" reads as a brush-off; a day and a clock time is a
 * promise somebody can check, so it has to be right.
 *
 * Formatted in the VALLEY's timezone, not the reader's, and it says so: a
 * member in London reading an unlabelled "5:30 am" reads it as their own and
 * checks an empty inbox at the wrong hour (audit C-037). Days are counted
 * between valley calendar days for the same reason.
 *
 * 12-hour with a lowercase am/pm. en-GB's default is the 24-hour clock, which
 * printed "5:30 IST" with nothing to say it was morning. Whitespace is
 * flattened because newer ICU builds put a narrow no-break space before the
 * am, and the server and the browser need not agree on which ICU they have.
 *
 * Plain module, no "use client": the (main) layout renders the first paint of
 * this label on the server, and a function exported from a client file cannot
 * be called there.
 */
export function sendTimeLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const time = at
    .toLocaleTimeString("en-GB", {
      timeZone: VALLEY_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s+/g, " ")
    .toLowerCase();

  const days = Math.round(
    (Date.parse(valleyDayKey(at)) - Date.parse(valleyDayKey(now))) / 86_400_000,
  );
  if (days <= 0) return `at ${time} IST`;
  if (days === 1) return `tomorrow at ${time} IST`;

  // A weekday is only unambiguous inside the coming week.
  const day =
    days < 7
      ? at.toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, weekday: "long" })
      : at.toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, day: "numeric", month: "long" });
  return `on ${day} at ${time} IST`;
}

/**
 * What pressing "send it again" says happened, wherever it was pressed.
 *
 * The confirm-email dialog, the banner and the /verify-email page all call the
 * same `resendVerification`, and the page used to answer "Sent to ..." for
 * every outcome -- including the one where the day's budget was spent and the
 * email would not leave until tomorrow, which is precisely when a member goes
 * looking in an empty inbox (2026-09-29). One function, so the three cannot say
 * the same moment three ways.
 *
 * Only a waiting row may mention the limit, and only a waiting row whose gate
 * is SHUT says so: an open one has nothing locked, so it says that instead.
 */
export function resendOutcomeMessage(
  result: {
    state?: "sent" | "imminent" | "queued";
    sentTo?: string;
    sendingAt?: string;
    open?: boolean;
  },
  now: Date = new Date(),
): string {
  if (result.state === "sent") {
    return `Sent to ${result.sentTo ?? "your address"}. Check your spam folder if it does not arrive.`;
  }
  if (result.state === "queued" && result.sendingAt) {
    const when = sendTimeLabel(result.sendingAt, now);
    return result.open
      ? `We'll send your confirmation email ${when}. Everything is open to you until then.`
      : `We have hit today's email limit. Your link goes out ${when}.`;
  }
  return "Your link is on its way. Give it a minute, then check spam.";
}

/**
 * What the banner says after "use another email" (change-email-actions.ts):
 * where the new link has got to, and that the sign-in address changed with it.
 * The second half is the one they must not miss -- the old address no longer
 * signs in -- so it is on every branch.
 */
export function movedMessage(
  result: { state?: "sent" | "imminent" | "queued"; sentTo?: string; sendingAt?: string },
  now: Date = new Date(),
): string {
  const to = result.sentTo ?? "your new address";
  const signIn = "Sign in with that address from now on.";
  if (result.state === "sent") return `Sent to ${to}. ${signIn}`;
  if (result.state === "queued" && result.sendingAt) {
    return `We'll send your link to ${to} ${sendTimeLabel(result.sendingAt, now)}. ${signIn}`;
  }
  return `Your link is on its way to ${to}. ${signIn}`;
}
