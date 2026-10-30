import type { PostHog } from "posthog-js";
import { MASKED_QUERY_PARAMS, maskEventUrls } from "@/lib/posthog-privacy";

/* ------------------------------------------------------------------ *
 *  Loading posthog-js, late and exactly once.
 *
 *  The library is 245 KB raw / 79 KB gzipped -- after react-dom, the
 *  largest single thing this site ships, and it used to sit in the first
 *  load of all 93 client pages because posthog-provider.tsx imported it
 *  statically. /privacy paid for it as surely as /feed did. Nothing about
 *  analytics needs to happen before the page is interactive, so it now
 *  arrives on an idle callback after hydration.
 *
 *  What this file has to protect while doing that is audit M42, and the
 *  shape here is chosen for it. The old bug: init ran in an effect, React
 *  runs a child's effects before its parent's, so <PostHogIdentify> fired
 *  first, found `posthog.__loaded` false, and returned -- silently, on
 *  every full page load into a signed-in route, for the whole life of the
 *  analytics room. The fix at the time was to init at module scope, which
 *  is an ORDERING argument: it works because module evaluation precedes
 *  every effect.
 *
 *  A deferred load cannot make that argument -- init is now the last thing
 *  to happen, not the first. So the guarantee is re-established by
 *  construction instead: `whenPostHog` chains on a promise that resolves only
 *  after init() has returned, and identify chains on it. A caller cannot
 *  observe posthog before it is initialised because there is no way to ask
 *  for it except through that promise. Ordering is no longer something to
 *  get right; it is something that cannot be got wrong.
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

/* Resolves once init() has returned, with null if analytics will never run
 * here (no key, or the server render of a "use client" module). Deliberately
 * never rejects: a failed analytics download is not a reason for a member to
 * see anything, and a rejection here would surface as an unhandled rejection
 * in their console. */
let resolveReady: (ph: PostHog | null) => void;
const ready = new Promise<PostHog | null>((resolve) => {
  resolveReady = resolve;
});

let started = false;

/* Localhost throws events all day while building and would pollute every
 * funnel with the developer's own clicking, so a dev server is opted out.
 * NEXT_PUBLIC_POSTHOG_DEV exists so the wiring itself can be proved to work
 * from a dev server -- otherwise the only way to test a change here is to ship
 * it. Exported because posthog-identify.tsx must not lift this opt-out when it
 * lifts the owner's. */
export const DEV_SILENCED =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_POSTHOG_DEV !== "1";

function start(): void {
  if (started) return;
  started = true;

  if (typeof window === "undefined" || !KEY) {
    resolveReady(null);
    return;
  }

  void import("posthog-js")
    .then(({ default: posthog }) => {
      if (!posthog.__loaded) {
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
           * act from counting which pages get opened, and the owner said off.
           * Were it ever turned on, everything carrying NO_CAPTURE
           * (src/lib/posthog-privacy.ts) would be blanked in it: that class is
           * replay's own block class in posthog-js. */
          disable_session_recording: true,

          /* Autocapture: every click and pageview recorded without naming it
           * first. This is what lets a question be asked in three months that
           * nobody thought to instrument today, which is what the owner meant
           * by "everything possible".
           *
           * A click carries the words on what was pressed and every attribute
           * on it and its ancestors, a link's href included, so it used to
           * carry a classmate's name off a directory card and their address
           * off a mailto: in their contact card (bug audit 3, T7b-22). The
           * owner's ruling, 2026-10-29: hide anything that shows a person and
           * keep the rest. So a name, a member card, an avatar and a contact
           * row carry NO_CAPTURE, and a click on one is not sent at all;
           * "Write a letter" and "Save contact card" still are. Masking every
           * word (`mask_all_text`) was the other option, and he did not take
           * it. */
          autocapture: true,

          /* App Router does a client-side navigation on every link, which fires
           * no browser page load. Without this, a whole session reads as one
           * pageview and every path/funnel is wrong.
           *
           * The initial pageview is captured by init() itself, so it survives
           * the defer -- it is stamped when init runs rather than at first
           * paint. The one real cost of loading late is here: a member who
           * navigates within the first moment is recorded as having landed on
           * the second page rather than the first. */
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
           * Nor would it keep a contact out: posthog-js writes the pressed link's
           * href onto the event after the attribute loop, whatever this says.
           * NO_CAPTURE is what keeps a person out.
           *
           * mask_personal_data_properties is about event PROPERTIES rather than
           * elements: it masks the ad networks' click ids (gclid, fbclid and the
           * rest) wherever posthog-js records a URL. custom_personal_data_properties
           * adds the site's own words to that list: `q`, the words typed into a
           * search, which are as often as not a classmate's name; `email`; and
           * `token` with the other names a key goes by, because a password-reset
           * link's key is live until it is used. PostHog sees `<masked>` for each.
           * The library leaves the referrer as the browser gave it and never
           * looks inside a path, so before_send masks the same words in every
           * address an event carries, plus a Catch-up invite's key, which IS a
           * path segment (posthog-privacy.ts). */
          mask_all_element_attributes: false,
          mask_personal_data_properties: true,
          custom_personal_data_properties: MASKED_QUERY_PARAMS,
          before_send: maskEventUrls,

          /* No page titles. posthog-js stamps document.title on every pageview,
           * and a page's title is its own words: a profile's is the member's
           * name, a photograph's is its caption with the tagged names in it. The
           * path already says which page it was, so the title adds nothing a
           * person-free event could keep. */
          property_denylist: ["title"],

          /* A member who has asked their browser not to be tracked is not
           * tracked. Costs a little data and is obviously right. */
          respect_dnt: true,

          /* See DEV_SILENCED above. */
          loaded: (ph) => {
            if (DEV_SILENCED) ph.opt_out_capturing();
          },
        });
      }
      resolveReady(posthog);
    })
    .catch(() => {
      /* The download failed -- offline, blocked, a bad deploy. Everything
       * waiting on `ready` resolves to null and quietly does nothing, which
       * is the correct outcome for analytics and the only one a member should
       * ever experience. Logged in development only, because a guard that
       * hides its own breakage is worse than no guard. */
      if (process.env.NODE_ENV !== "production") {
        console.warn("[posthog] failed to load; analytics is off for this page");
      }
      resolveReady(null);
    });
}

/* Begin the load after hydration, not during it. requestIdleCallback yields
 * until the main thread is free; the 2 s timeout is the ceiling, so a busy
 * page still starts analytics promptly rather than never. Safari has no
 * requestIdleCallback, hence the setTimeout arm. */
export function schedulePostHog(): void {
  if (typeof window === "undefined") return;
  /* Not `"requestIdleCallback" in window`: the DOM lib types declare it as
   * always present, so TypeScript narrows the else branch to `never` and the
   * Safari arm below stops compiling. Reading the property is the check that
   * matches reality. */
  const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
  if (typeof idle === "function") {
    idle(() => start(), { timeout: 2000 });
  } else {
    window.setTimeout(() => start(), 2000);
  }
}

/* The only way to reach posthog. Runs `fn` once init has returned, whenever
 * that is, and never runs it at all if analytics is not live here. Callers do
 * not need to know whether the library has arrived yet -- see the M42 note at
 * the top of this file for why that is the whole point. */
export function whenPostHog(fn: (ph: PostHog) => void): void {
  void ready.then((ph) => {
    if (ph) fn(ph);
  });
}

/* Ends the analytics identity on this browser, so whoever uses it next is
 * someone new to PostHog (bug audit 3, T7b-21). Every sign-out runs it, through
 * src/components/auth/sign-out.ts.
 *
 * Without it the landing page after a sign-out, and anything the next person
 * browsed signed out, was filed under the member who had left; and identify()
 * for the next member switched ids without merging, so their first pages
 * stayed filed under the first. A full page load does not end an identity:
 * posthog-js keeps it in localStorage and a cookie precisely so that it
 * survives one. The ready promise has settled long before anyone reaches a
 * sign-out button, so the reset lands in a microtask, ahead of the sign-out's
 * first network reply; a sign-out inside the first moment of a page, before
 * posthog-js has arrived, has nothing to reset and leaves the old id for the
 * next sign-in to replace.
 *
 * reset() clears consent too, so an opt-out is put back: the owner's and the
 * test account's, which stays on their own devices after they leave, as it
 * always has; a dev server's (DEV_SILENCED); a Do Not Track browser's, which
 * posthog-js honours regardless. A member who signs in next lifts the first
 * kind (posthog-identify.tsx). */
export function endPostHogIdentity(): void {
  whenPostHog((ph) => {
    const optedOut = ph.has_opted_out_capturing();
    ph.reset();
    if (optedOut) ph.opt_out_capturing();
  });
}
