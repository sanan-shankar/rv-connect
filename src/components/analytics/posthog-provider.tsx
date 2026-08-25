"use client";

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

/* Initialised at MODULE SCOPE, not in an effect.
 *
 * It used to run in this component's useEffect, and React runs a child's
 * effects before its parent's -- so <PostHogIdentify>, which lives inside this
 * provider in the (main) layout, always fired first, found `posthog.__loaded`
 * false and returned. Its deps never changed afterwards, so it never ran
 * again: on every full page load into a signed-in route -- every first visit,
 * every refresh, every link opened from an email -- the member was never
 * identified and their whole session landed in PostHog as an anonymous one
 * (bug audit M42). Only a soft navigation from a public page, where init had
 * already happened, ever attached an id.
 *
 * Module scope runs when the client bundle loads, which is before any render
 * and therefore before every effect in the tree. That is the ordering
 * guarantee; `__loaded` is set synchronously at the top of init(), so anything
 * running later can rely on it. The window check is because a "use client"
 * module is still evaluated on the server during SSR. */
if (typeof window !== "undefined" && KEY && !posthog.__loaded) {
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

    /* What these two actually do -- the comment here used to claim they were
     * "belt and braces ... never transmit the contents of an input", and
     * neither of them is that (audit C-120).
     *
     * The contents of an input are safe for a different reason, and it is
     * worth writing down where, because it is not here. posthog-js excludes
     * them itself, in two places, whatever this config says: element
     * attributes are only read for `name`, `id`, `class` and `aria-label`
     * once the element is an input, textarea, select or contenteditable, so
     * `value` is never among them; and its safe-text walk returns the empty
     * string outright for those same elements, so a letter draft cannot ride
     * out as `$el_text` either. (Read in node_modules/posthog-js, not
     * assumed -- and worth re-reading if the library is ever upgraded, since
     * it is their default we are leaning on and not a setting of ours.)
     *
     * mask_all_element_attributes stays FALSE, deliberately: it governs every
     * OTHER element, and autocapture identifies what somebody clicked by the
     * attributes on it. Turning it on would keep nothing extra from an input
     * and would blind the "ask a question in three months" purpose above.
     *
     * mask_personal_data_properties is about event PROPERTIES rather than
     * elements -- the URL, the referrer -- and it is on because an address or
     * a card number that appeared in a query string is not analytics data. */
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
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!KEY) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}
