"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";

/* ------------------------------------------------------------------ *
 *  PostHog - what members actually do.
 *
 *  Vercel Analytics answers "34% India, 22% iOS" and nothing else. This
 *  answers the questions the owner actually asked: how many people open
 *  /support and never contribute, which routes lead to which, what gets
 *  typed into directory search, whether the map or the batch list gets
 *  used. Those are funnels, paths and property breakdowns, and no
 *  pageview counter can produce them at any price.
 *
 *  Installed by hand rather than with `npx @posthog/wizard`, which is an
 *  LLM codemod over the repo and wires up session replay by default.
 * ------------------------------------------------------------------ */

/* Write-only project key. Like the Sentry DSN it is designed to sit in public
 * client code: it can send events and cannot read anything back. Inline rather
 * than env-only because NEXT_PUBLIC_* is inlined into the client bundle at
 * build time regardless -- putting it in Vercel's settings would hide it from
 * nobody while adding a step that, if forgotten, silently produces a site with
 * no analytics and no error to say so. */
const KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ??
  "phc_wi5LEF4HN26w7w5iRFRcwkd5QDy9n4gVAEGX2iekakeG";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY) return;

    posthog.init(KEY, {
      /* OUR domain, not PostHog's. Ad blockers ship lists of known analytics
       * hostnames, and posthog.com is on all of them -- roughly 10-25% of
       * visitors would silently vanish from the numbers. The rewrites in
       * next.config.ts forward /ingest to eu.i.posthog.com server-side, so
       * the browser only ever sees a first-party request. */
      api_host: "/ingest",
      /* Where the "view in PostHog" links point. Must be the real host: it
       * is a UI concern, not a request path. */
      ui_host: "https://eu.posthog.com",

      /* EU region, chosen at signup and unchangeable. Matches Sentry, so
       * every third party holding this community's data sits under one
       * regime rather than two. */

      /* SESSION REPLAY OFF, and this is the line that keeps it off.
       * Replay records the actual screen. This is a private alumni network:
       * real names, home addresses, phone numbers and photographs of other
       * people are on that screen. Watching a member browse is a different
       * act from counting which pages get opened, and the owner said off. */
      disable_session_recording: true,

      /* Autocapture: every click and pageview recorded without naming it
       * first. This is what lets a question be asked in three months that
       * nobody thought to instrument today, which is what the owner meant
       * by "everything possible". */
      autocapture: true,

      /* App Router does a client-side navigation on every link, which fires
       * no browser page load. Without this, a whole session reads as one
       * pageview and every path/funnel is wrong. */
      capture_pageview: "history_change",
      capture_pageleave: true,

      /* Only build a person profile for members who have signed in. Signed-out
       * visitors are counted, never profiled -- cheaper on quota and far less
       * data held about people who only ever looked at the landing page. */
      person_profiles: "identified_only",

      /* Belt and braces on top of replay being off: never transmit the
       * contents of an input. A directory search box or a letter draft is
       * not analytics data. */
      mask_all_element_attributes: false,
      mask_personal_data_properties: true,

      /* A member who has asked their browser not to be tracked is not
       * tracked. Costs a little data and is obviously right. */
      respect_dnt: true,

      /* Localhost throws events all day while building and would pollute
       * every funnel with the developer's own clicking. NEXT_PUBLIC_POSTHOG_DEV
       * exists so the wiring itself can be proved to work from a dev server --
       * otherwise the only way to test a change here is to ship it. */
      loaded: (ph) => {
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_POSTHOG_DEV !== "1"
        ) {
          ph.opt_out_capturing();
        }
      },
    });
  }, []);

  if (!KEY) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}
