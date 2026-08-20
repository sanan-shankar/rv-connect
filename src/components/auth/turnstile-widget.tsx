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
 *  and local sign-in, e2e and the QA probes stay unattended.
 *
 *  The token is handed out through getToken() exactly once — siteverify
 *  burns a token on first use, so after every hand-out the widget is
 *  reset to brew a fresh one for the next attempt. If the script cannot
 *  load or the challenge errors, getToken() settles to null and the
 *  form submits without a token: the server is the judge anyway, and
 *  its own posture (refuse a bad token, fail open only when Cloudflare
 *  itself is down) matches — a broken third party never bricks sign-in.
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

export type TurnstileHandle = {
  /** Resolves to a fresh single-use token, or null when the widget could
   *  not produce one (script blocked, challenge errored, 12s timeout). */
  getToken: () => Promise<string | null>;
};

export const TurnstileWidget = forwardRef<TurnstileHandle, { siteKey: string | null }>(
  function TurnstileWidget({ siteKey }, ref) {
    const holder = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const token = useRef<string | null>(null);
    const dead = useRef(false); // script/challenge failed; stop waiting
    const waiters = useRef<Array<(t: string | null) => void>>([]);

    useEffect(() => {
      if (!siteKey || !holder.current) return;
      let removed = false;
      loadScript()
        .then(() => {
          if (removed || !holder.current || !window.turnstile) return;
          widgetId.current = window.turnstile.render(holder.current, {
            sitekey: siteKey,
            appearance: "interaction-only",
            // Pinned, never "auto": auto follows the visitor's OS setting,
            // and this site is warm eggshell in both of its own themes — a
            // near-black Cloudflare card in the middle of the form is how
            // the rare visible challenge would look on a dark-mode machine.
            theme: "light",
            callback: (t: string) => {
              token.current = t;
              waiters.current.splice(0).forEach((w) => w(t));
            },
            "expired-callback": () => {
              token.current = null;
              if (widgetId.current) window.turnstile?.reset(widgetId.current);
            },
            "error-callback": () => {
              dead.current = true;
              waiters.current.splice(0).forEach((w) => w(null));
            },
          });
        })
        .catch(() => {
          dead.current = true;
          waiters.current.splice(0).forEach((w) => w(null));
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
          // Brew the next attempt's token now, not after a failed submit.
          if (widgetId.current) window.turnstile?.reset(widgetId.current);
          return Promise.resolve(t);
        }
        if (dead.current) return Promise.resolve(null);
        return new Promise<string | null>((resolve) => {
          const timer = setTimeout(() => {
            const i = waiters.current.indexOf(settle);
            if (i >= 0) waiters.current.splice(i, 1);
            resolve(null);
          }, 12_000);
          const settle = (t: string | null) => {
            clearTimeout(timer);
            if (t) {
              token.current = null;
              if (widgetId.current) window.turnstile?.reset(widgetId.current);
            }
            resolve(t);
          };
          waiters.current.push(settle);
        });
      },
    }));

    if (!siteKey) return null;
    // Zero-height until Cloudflare needs to show a challenge; the widget
    // grows the container itself at that moment, which is the one time a
    // layout shift is the correct behaviour — the visitor must see it.
    return <div ref={holder} aria-live="polite" />;
  },
);
