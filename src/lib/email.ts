import { Resend } from "resend";
import { IS_DEMO } from "./demo";
import { maskEmail } from "./mask-email";
import { isTransientMailError, quotaExceeded } from "./mail-policy";

/* ------------------------------------------------------------------ *
 *  The one place that sends mail.
 *
 *  Resend, on the rishivalley.space domain the owner verified on
 *  2026-08-11. Everything that leaves the app goes through `sendMail`
 *  below, so the From address, the failure posture and the dev fallback
 *  are decided once. Catch-up notifications are the next caller.
 * ------------------------------------------------------------------ */

/**
 * Sent from the root domain rather than a `mail.` subdomain. Resend recommends
 * a subdomain so that a reputation hit on bulk mail cannot spill onto the
 * root, and that advice is correct for a company sending marketing alongside
 * receipts. It does not buy this project anything: every message here is
 * transactional, triggered by a person who just asked for it, at a volume
 * measured in tens per week, and nothing else sends from this domain at all.
 * There is no second sender whose reputation could be protected. If a
 * newsletter blast is ever added, move THAT to a subdomain and leave these
 * where they are.
 *
 * The display name matters more than it looks: an alumnus who last thought
 * about this school in 1994 needs to recognise the sender at a glance in a
 * crowded inbox, and "Rishi Valley" is the name they will know.
 */
const FROM = process.env.EMAIL_FROM ?? "Rishi Valley <hello@rishivalley.space>";

/**
 * The origin every emailed link is built against.
 *
 * Deliberately NOT `AUTH_URL` / `NEXTAUTH_URL`. Those are suspected of still
 * pointing at the old `rv-alumni.vercel.app` host on the Vercel dashboard
 * (docs/planning/bugs.md #15), and a reset link is the one thing in the app
 * that must not be built from a value we already believe is wrong: it lands in
 * an inbox, outlives the session, and gets clicked hours later. `proxy.ts`
 * would 308 such a link to the right host, but the token would ride through a
 * redirect chain to get there, which is a needless place to lose it.
 *
 * So: an explicit `APP_URL` if set, else the canonical origin, else localhost
 * in development. Same constant as CANONICAL_ORIGIN in src/proxy.ts.
 */
export function appUrl(path = "/"): string {
  // The localhost base exists for ONE case: development with sending
  // suppressed, where the message is printed to the terminal and a clickable
  // local link is the convenience. The moment a dev machine really sends
  // (EMAIL_DEV_SEND=1), its links go to real inboxes on other people's
  // devices, where localhost is this machine, not ours: a member's
  // confirmation went out carrying http://localhost:3000 on 2026-08-13
  // because this branch keyed off NODE_ENV alone. Tokens live in the shared
  // database, so a canonical link minted here redeems anywhere.
  const reallySending =
    process.env.NODE_ENV === "production" || process.env.EMAIL_DEV_SEND === "1";
  const base =
    process.env.APP_URL?.replace(/\/+$/, "") ??
    (reallySending ? "https://rishivalley.space" : "http://localhost:3000");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

let client: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/**
 * How long to wait for Resend before giving up on one send.
 *
 * 10 seconds: Resend's own p99 is well under a second, so anything past this is
 * a provider that has stopped answering rather than one that is being slow.
 */
export const SEND_TIMEOUT_MS = 10_000;

export interface MailResult {
  ok: boolean;
  /** Set when the send failed, for the server log. Never shown to a visitor. */
  error?: string;
  /**
   * True when the failure was the PROVIDER's and not the address's: a 429, a
   * 5xx, a dropped socket, a timeout. The queue waits those out instead of
   * spending one of the four attempts it keeps for finding out that somebody
   * typed `gmial` (bug audit B-002). Classified here because this is the only
   * place that still has Resend's structured error to look at.
   */
  transient?: boolean;
  /** True when the provider says the day's or month's allowance is spent, so
   *  the queue can wait for the window rather than for a few minutes. */
  quota?: boolean;
  /**
   * Resend's id for the accepted message. Stored on the OutboundEmail row so a
   * later delivery webhook has something to join on: an event says "this id
   * bounced" and nothing else that identifies the recipient. Absent on the dev
   * path and on failures, both of which never produced a message at all.
   */
  providerId?: string;
}

/**
 * Top-level domains that can never receive mail.
 *
 * `.invalid`, `.test`, `.example` and `.localhost` are reserved by RFC 2606
 * and RFC 6761 precisely so they cannot resolve, so anything addressed to one
 * is guaranteed to hard-bounce. Hard bounces are the single worst thing for a
 * young sending domain's reputation, and rishivalley.space was verified on
 * 2026-08-11 with no history to absorb them.
 *
 * This is not hypothetical: an end-to-end test of the reset flow on the day
 * this shipped put two messages to `flowtest@example.invalid` through a live
 * key, because `.env` carries the same RESEND_API_KEY production does. The
 * seeded demo people at `@demo.valley.test` are the same hazard sitting in the
 * data. Refused here, at the one place everything passes through, rather than
 * trusted not to happen.
 */
const UNDELIVERABLE_TLDS = [".invalid", ".test", ".example", ".localhost"];

function isUndeliverable(address: string): boolean {
  const at = address.lastIndexOf("@");
  if (at < 0) return true;
  const domain = address.slice(at + 1).toLowerCase().trim();
  return UNDELIVERABLE_TLDS.some((tld) => domain === tld.slice(1) || domain.endsWith(tld));
}

/**
 * Send one transactional email.
 *
 * Never throws. Every caller is a server action in the middle of something
 * else (registering an account, asking for a reset), and a mail provider
 * having a bad minute must not roll back a signup or surface a stack trace to
 * someone who just typed their address. Callers decide what to say; this
 * reports what happened.
 *
 * `text` is required, not optional. A plain-text part is what keeps the
 * message out of the spam folder for the recipients most likely to be on an
 * old mail client, and it is the version that still contains a usable link
 * when an email app decides not to render our button.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  // The demo deployment must never send mail. Its "members" are invented
  // people at @demo.valley.test, so the only reachable outcome is bouncing
  // mail off a domain that does not exist, from the real sending domain,
  // which is exactly how a sender reputation gets destroyed by a showcase.
  if (IS_DEMO) return { ok: false, error: "demo mode does not send mail" };

  // Guaranteed bounce. Refused before the provider ever sees it.
  if (isUndeliverable(opts.to)) {
    // Masked (audit L5): this is the one line here that logs an address in
    // PRODUCTION, and Vercel's log stream has no scrubbing or retention
    // promise. The first character and domain are plenty to debug with.
    console.warn(`[email] refused undeliverable address: ${maskEmail(opts.to)}`);
    return { ok: false, error: "undeliverable address" };
  }

  // Development does not mail real people unless you ask it to.
  //
  // `.env` carries the same RESEND_API_KEY as production, so without this the
  // ordinary act of exercising a flow on localhost sends live mail from the
  // real domain, to whatever address happens to be in the row. Set
  // EMAIL_DEV_SEND=1 for the deliberate case of checking how a message
  // actually renders in an inbox.
  if (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_SEND !== "1") {
    console.info(
      `\n[email:dev] to=${opts.to}\n[email:dev] subject=${opts.subject}\n${opts.text}\n`,
    );
    // NOT `ok: true`. Printing a message to a terminal is not sending it, and
    // reporting otherwise is what let a localhost drain mark a real member's
    // confirmation as sent on 2026-08-12: "sent" is terminal, so the message
    // was never retried and never arrived. Nothing may record a send on the
    // strength of a console.log.
    return { ok: false, error: "suppressed in development" };
  }

  const api = resend();

  // No API key. In development that is the normal state (nobody wants a real
  // inbox in the loop while building), so print the message and carry on: the
  // link is right there in the terminal. In production it is a misconfigured
  // deployment, and pretending the mail was sent would strand people on a
  // "check your inbox" screen forever, so it fails loudly in the log.
  if (!api) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY is not set; no mail was sent.");
      return { ok: false, error: "RESEND_API_KEY is not set" };
    }
    console.info(
      `\n[email:dev] to=${opts.to}\n[email:dev] subject=${opts.subject}\n${opts.text}\n`,
    );
    return { ok: true };
  }

  try {
    // A deadline, because this is awaited inside a page render for unconfirmed
    // members (verificationMailState in the (main) layout). Without it a
    // provider that accepts the connection and then says nothing holds the
    // whole page open until the platform kills the function, and the member
    // sees a blank screen rather than a slow one (audit M20). A race, not an
    // abort: the Resend SDK takes no signal, so the request may still land --
    // which is one reason DAILY_CAP keeps five messages in hand.
    const send = api.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    const raced = await Promise.race([
      send,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SEND_TIMEOUT_MS)),
    ]);
    if (raced === null) {
      console.error(`[email] send timed out after ${SEND_TIMEOUT_MS}ms`);
      return { ok: false, error: "send timed out", transient: true };
    }
    const { data, error } = raced;
    if (error) {
      console.error("[email] send failed", error);
      return {
        ok: false,
        error: error.message,
        transient: isTransientMailError(error),
        quota: quotaExceeded(error),
      };
    }
    // Resend's id for this message, carried back so the queue can store it on
    // the row. It is the ONLY thing a delivery webhook gives us to identify
    // which OutboundEmail an event belongs to -- without it, "delivered" and
    // "bounced" arrive with nowhere to go.
    return { ok: true, providerId: data?.id };
  } catch (err) {
    console.error("[email] send threw", err);
    // A throw out of the SDK is a transport failure -- DNS, a reset socket, a
    // TLS hiccup. The message never reached Resend, so it is worth waiting out.
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
      transient: true,
    };
  }
}

// Re-exported so server callers can reach it from the module they already
// import. The implementation lives in its own dependency-free file because the
// client needs it too, and importing this module into a client component would
// drag the Resend SDK into the browser bundle.
