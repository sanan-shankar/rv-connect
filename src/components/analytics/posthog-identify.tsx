"use client";

import { useEffect } from "react";
import { DEV_SILENCED, whenPostHog } from "./posthog-client";

/* Attaches events to a member so a funnel can follow one person across a
 * session and across devices. Rendered from the (main) layout, which already
 * has the session, so no extra query.
 *
 * WHAT THIS SENDS: the user id and two coarse attributes. NOT the name, NOT the
 * email, NOT the city, NOT the phone number. PostHog does not need to know who
 * anyone is to answer "which batch uses the map view"; it only needs to be
 * able to tell one person from another, and an opaque cuid does that. This
 * used to be the whole promise while autocapture sent other members' names
 * and contact details off every click (bug audit 3, T7b-22); what keeps those
 * out now is NO_CAPTURE and the masking in posthog-client.ts.
 *
 * `isOwner` tags every admin, so PostHog's Filter out internal users can hide
 * them from a chart. The owner's own account and the test account go further
 * and are opted out of capture entirely (owner, 2026-09-15: his own machine
 * had skewed the OS and platform numbers). See src/lib/stats-exclusion.ts.
 * The opt-out is stored in this browser and outlives signing out, which is
 * right for the owner's own devices; a member who signs in on one of them
 * afterwards lifts it below, or nothing of theirs would ever be counted. */
export function PostHogIdentify({
  userId,
  accountType,
  batchYear,
  isOwner,
  excluded,
}: {
  userId: string;
  accountType: string | null;
  batchYear: number | null;
  isOwner: boolean;
  excluded: boolean;
}) {
  useEffect(() => {
    /* This used to read `posthog.__loaded` and bail if init had not run,
     * which is how audit M42 stayed invisible for the life of the analytics
     * room: init ran in the provider's effect, React runs a child's effects
     * first, so this fired early and gave up -- and its deps never changed,
     * so it never tried again. Every full page load into a signed-in route
     * landed in PostHog anonymous.
     *
     * There is no check to make now. posthog-js loads on an idle callback
     * well after this effect runs, and `whenPostHog` resolves only once
     * init() has returned, so identify cannot arrive early: the race is gone
     * rather than guarded. See posthog-client.ts.
     *
     * And no reset() on the way out: the layout unmounts on navigation and
     * resetting there would break every cross-page funnel. Sign-out is the
     * only place an identity should end, and it ends there explicitly
     * (endPostHogIdentity, bug audit 3, T7b-21): a full page load does not
     * end one, whatever this comment used to say.
     *
     * The opt-in is the other half of that lifecycle. Without
     * `captureEventName: false` it would send an `$opt_in` event, one more in
     * the nightly snapshot's count each time; it never runs on a dev server,
     * whose opt-out is for a different reason; and Do Not Track still wins,
     * because posthog-js reads it before any stored choice. */
    whenPostHog((ph) => {
      if (excluded) {
        ph.opt_out_capturing();
        return;
      }
      if (!DEV_SILENCED && ph.has_opted_out_capturing()) {
        ph.opt_in_capturing({ captureEventName: false });
      }
      ph.identify(userId, { accountType, batchYear, isOwner });
    });
  }, [userId, accountType, batchYear, isOwner, excluded]);

  return null;
}
