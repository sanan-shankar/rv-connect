"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  The Turnstile widget (audit H22), shared by the three auth forms.
 *
 *  Rendered with appearance "interaction-only": nothing is visible
 *  unless Cloudflare actually wants the visitor to click something, so
 *  the login and signup compositions keep their look and the visual
 *  baselines hold. In development the server hands the pages
 *  Cloudflare's always-pass test key, so the widget never interacts
 *  and local sign-in, e2e and the QA probes stay unattended — unless
 *  you ask for the checkbox with TURNSTILE_DEV_CHALLENGE=1, which is
 *  how the interactive path below gets looked at (see turnstile.ts).
 *
 *  The token is handed out through getToken() exactly once — siteverify
 *  burns a token on first use — and the widget is re-armed by the FORM,
 *  through reset(), only once an attempt has actually failed.
 *
 *  It used to re-arm the instant it handed the token over, to have the
 *  next one brewing early. For the invisible majority that was free. For
 *  anyone Cloudflare had put a checkbox in front of, it wiped their tick
 *  while their sign-in was still in flight, so they sat looking at an
 *  empty box under a "Signing in..." button and, reasonably, ticked it a
 *  second time (owner report 2026-08-22; measured at 33ms after submit
 *  against a 2.5s request). Re-arming is not optional — a spent token is
 *  refused, so a retry needs a fresh one — it just belongs at the moment
 *  the retry becomes possible, not before the first attempt has landed.
 *
 *  What happens when it CANNOT produce one used to be described here as
 *  "the form submits without a token, and a broken third party never
 *  bricks sign-in". That was wrong, and it was the bug (audit M07).
 *  `verifyTurnstile` fails open only when Cloudflare is unreachable from
 *  the SERVER; a request that simply arrives with no token is a plain no
 *  in every environment. So a visitor whose browser cannot reach
 *  challenges.cloudflare.com got "We couldn't confirm you're human.
 *  Refresh the page and try once more", refreshed, and got it again,
 *  for ever. Two things changed:
 *
 *   - A challenge error no longer latches the widget dead for the life
 *     of the page. It resets and tries again, up to ERROR_RETRIES, so a
 *     blip costs one attempt rather than the session.
 *   - A SCRIPT that never loads is reported as its own answer
 *     ("blocked") rather than as a generic failure, because the two need
 *     different advice: one is "try again", the other is "something in
 *     this browser is stopping it, and refreshing will not help".
 * ------------------------------------------------------------------ */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * How many times a challenge error is forgiven before the widget gives up for
 * this page.
 *
 * Two, because the errors Cloudflare reports here are overwhelmingly transient
 * (a dropped request, an expired challenge, a slow network) and a visitor
 * should not lose their session to one; but a widget that resets for ever
 * would spin against a genuinely hostile environment and never tell anybody.
 * Three strikes is the point at which "try again" has stopped being true.
 */
const ERROR_RETRIES = 2;

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null; // a later mount may retry
        reject(new Error("turnstile script failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** What `getToken` can answer with, besides a real token.
 *
 *  - "interaction": Cloudflare is showing its checkbox and is waiting on the
 *    HUMAN. Submitting cannot succeed until they tick it, so the form says so
 *    immediately rather than hanging out the timeout and then sending a doomed
 *    request (owner report, 2026-08-20: incognito visitors saw exactly that).
 *  - "blocked": the widget SCRIPT never loaded. Nothing the visitor does on
 *    this page will change that, so "refresh and try again" is the one piece
 *    of advice that is certain to be wrong (audit M07).
 *  - null: it tried and could not, this time. Trying again is reasonable. */
export type TurnstileFailure = "interaction" | "blocked";

export type TurnstileHandle = {
  getToken: () => Promise<string | null | TurnstileFailure>;
  /** Re-arm for another go. Called by the form when an attempt FAILED and
   *  the person is still on the page: the token they just spent cannot be
   *  sent twice, so the next attempt needs a new one. Never called on the
   *  way to a success, which navigates away and needs nothing. */
  reset: () => void;
};

export const TurnstileWidget = forwardRef<TurnstileHandle, { siteKey: string | null }>(
  function TurnstileWidget({ siteKey }, ref) {
    const holder = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const token = useRef<string | null>(null);
    const dead = useRef(false); // out of retries; stop waiting
    const blocked = useRef(false); // the script itself never loaded
    const errors = useRef(0);
    const interactive = useRef(false); // Cloudflare is showing its checkbox
    const waiters = useRef<Array<(t: string | null | TurnstileFailure) => void>>([]);

    useEffect(() => {
      if (!siteKey || !holder.current) return;
      let removed = false;
      loadScript()
        .then(() => {
          if (removed || !holder.current || !window.turnstile) return;
          widgetId.current = window.turnstile.render(holder.current, {
            sitekey: siteKey,
            appearance: "interaction-only",
            // "normal" is a fixed 300px box, which inside this form's 400px
            // column left it short of the fields with ~100px of eggshell
            // beside it — the giveaway that it was bolted on. "flexible"
            // fills whatever it is given, so its frame lines up with the
            // email and password fields above it: 400px on desktop, 338px
            // at 390 (measured, both exact against the fields).
            //
            // Cloudflare will not go below 300px whatever the container
            // says, and this form is the viewport less 52px of gutter, so
            // the floor bites under a 352px viewport: at 320 the column is
            // 268 and the last 32px of the widget (the logo's tail) is
            // clipped by the rounding below. Left as is deliberately. No
            // phone in use is that narrow — the smallest current iPhone is
            // 375, giving 323 — and the alternative, a scale transform,
            // buys a 2016 device blurry third-party text plus a height that
            // has to track the scale. Note it is still an improvement on
            // the fixed 300px box, which at that width overflowed the PAGE.
            size: "flexible",
            // Pinned, never "auto": auto follows the visitor's OS setting,
            // and this site is warm eggshell in both of its own themes — a
            // near-black Cloudflare card in the middle of the form is how
            // the rare visible challenge would look on a dark-mode machine.
            theme: "light",
            callback: (t: string) => {
              token.current = t;
              interactive.current = false;
              waiters.current.splice(0).forEach((w) => w(t));
            },
            // Fires when Cloudflare decides the visitor must click. From
            // this moment a token can only come from the human's tick, so
            // any submit in flight (and every later one) is answered with
            // the sentinel instead of a 12-second wait.
            "before-interactive-callback": () => {
              interactive.current = true;
              waiters.current.splice(0).forEach((w) => w("interaction"));
            },
            "expired-callback": () => {
              token.current = null;
              if (widgetId.current) window.turnstile?.reset(widgetId.current);
            },
            /* Settle the waiters either way, so nobody sits out the 12s
               timeout; but only LATCH once the retries are spent. Resetting
               gives the next attempt a fresh challenge instead of handing the
               whole page session to one bad request (audit M07). */
            "error-callback": () => {
              errors.current += 1;
              if (errors.current > ERROR_RETRIES) {
                dead.current = true;
              } else if (widgetId.current) {
                window.turnstile?.reset(widgetId.current);
              }
              waiters.current.splice(0).forEach((w) => w(null));
            },
          });
        })
        .catch(() => {
          // The script did not load at all: an extension, a DNS block or a
          // network filter is in the way. That is a different sentence from
          // "the challenge failed", and it is the one the form must show.
          blocked.current = true;
          dead.current = true;
          waiters.current.splice(0).forEach((w) => w("blocked"));
        });
      return () => {
        removed = true;
        if (widgetId.current && window.turnstile) {
          window.turnstile.remove(widgetId.current);
          widgetId.current = null;
        }
      };
    }, [siteKey]);

    useImperativeHandle(ref, () => ({
      getToken() {
        if (!siteKey) return Promise.resolve(null);
        if (token.current) {
          const t = token.current;
          token.current = null;
          return Promise.resolve(t);
        }
        if (blocked.current) return Promise.resolve("blocked");
        if (dead.current) return Promise.resolve(null);
        if (interactive.current) return Promise.resolve("interaction");
        return new Promise<string | null | TurnstileFailure>((resolve) => {
          const timer = setTimeout(() => {
            const i = waiters.current.indexOf(settle);
            if (i >= 0) waiters.current.splice(i, 1);
            resolve(null);
          }, 12_000);
          const settle = (t: string | null | TurnstileFailure) => {
            clearTimeout(timer);
            if (t && t !== "interaction") token.current = null;
            resolve(t);
          };
          waiters.current.push(settle);
        });
      },
      reset() {
        // Pointless on a widget that never rendered (blocked) or has spent
        // its retries (dead): there is nothing there to re-arm, and the
        // sentinel those two states return is the answer the form wants.
        if (blocked.current || dead.current || !widgetId.current) return;
        token.current = null;
        // Cloudflare re-decides from scratch after a reset, so drop our note
        // that a checkbox is up; before-interactive-callback says so again if
        // it still is. Leaving it set would answer the next submit with "tick
        // the box" while no box was on screen.
        interactive.current = false;
        window.turnstile?.reset(widgetId.current);
      },
    }));

    if (!siteKey) return null;
    // Zero-height until Cloudflare needs to show a challenge; the widget
    // grows the container itself at that moment, which is the one time a
    // layout shift is the correct behaviour — the visitor must see it.
    //
    // The corner radius is ours, not Cloudflare's. Everything inside the
    // challenge is a cross-origin iframe we cannot style — not its white
    // fill, not its type, not its logo — but the iframe is OUR child, so
    // clipping it to --radius-input, the same 12px the fields above it
    // use, is the one piece of the shape we do own.
    //
    // clip-path and NOT `overflow-hidden rounded-*`, which is the obvious
    // way to write this and is wrong here. Hidden overflow makes this div a
    // block formatting context, and a BFC stops margins collapsing THROUGH
    // it — so on the invisible majority's page, where this div is 0px tall,
    // the form's `space-y-3` stopped collapsing to one 12px gap and paid
    // 12px twice. The form grew 12px and, being centred, everything on it
    // slid 6px up. clip-path paints the same rounded corners and touches
    // layout not at all (measured: 206px form height either way, against
    // 218px with overflow). The visual suite caught this; nothing else did.
    return (
      <div
        ref={holder}
        aria-live="polite"
        className="[clip-path:inset(0_round_var(--radius-input))]"
      />
    );
  },
);
