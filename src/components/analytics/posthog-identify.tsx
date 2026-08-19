"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/* Attaches events to a member so a funnel can follow one person across a
 * session and across devices. Rendered from the (main) layout, which already
 * has the session, so no extra query.
 *
 * WHAT IS SENT: the user id and two coarse attributes. NOT the name, NOT the
 * email, NOT the city, NOT the phone number. PostHog does not need to know who
 * anyone is to answer "which batch uses the map view"; it only needs to be
 * able to tell one person from another, and an opaque cuid does that.
 *
 * `isOwner` is set rather than opting the admin out of capture entirely. With
 * 49 members, discarding the most active user's data costs more than it saves,
 * and PostHog can hide internal users project-wide from
 * Settings > Project > Filter out internal users -- a dashboard decision that
 * stays reversible, unlike data never collected. */
export function PostHogIdentify({
  userId,
  accountType,
  batchYear,
  isOwner,
}: {
  userId: string;
  accountType: string | null;
  batchYear: number | null;
  isOwner: boolean;
}) {
  useEffect(() => {
    if (!posthog.__loaded) return;
    posthog.identify(userId, { accountType, batchYear, isOwner });
    return () => {
      /* No reset() on unmount: the layout unmounts on navigation and resetting
       * there would break every cross-page funnel. Sign-out is the only place
       * an identity should end, and that is a full page load anyway. */
    };
  }, [userId, accountType, batchYear, isOwner]);

  return null;
}
