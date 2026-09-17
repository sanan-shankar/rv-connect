"use client";

/* ------------------------------------------------------------------ *
 *  The optimistic tap, once.
 *
 *  A heart or a bookmark flips the instant it is touched and the server
 *  action follows. Getting that right takes four things, and three
 *  components each wrote out all four: one request per subject in the air
 *  at a time, so two toggles never race (C-010/C-178), the optimistic
 *  flip, a rollback with a toast when the action refuses, and adopting
 *  what the row actually says rather than what the tap assumed (C-133).
 *  How taps made during a flight are honoured rather than refused is
 *  `lib/toggle-queue.ts`.
 *
 *  `settledHeart` in lib/heart.ts already owned the last of those. What
 *  was still written three times is everything around it -- the feed
 *  card, the letter page and a comment row -- and letter-engagement's own
 *  comment admitted it: "the same refs the feed card carries".
 *
 *  Where the state LIVES is deliberately still the caller's business.
 *  The card and the letter hold their own; a comment row writes its
 *  parent's through `onLikeToggle`. So these hooks take a `commit`
 *  rather than owning a `useState`, which is what lets one shape serve
 *  all three.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { settledHeart } from "@/lib/heart";
import { createToggleQueue, type ToggleResult } from "@/lib/toggle-queue";

/* `liked` and `loved` in ToggleResult are the same fact under two names:
   posts and comments are liked, Catch-up answers and Collection photos are
   loved. The hook takes either rather than making five server actions agree
   on a word.

   `subject` in the fire options says WHICH thing a tap is about. Four of the
   five hearts are drawn by a component that IS one subject (a card, a comment
   row, a letter) and leave it alone. The Collection's viewer draws one heart
   for whichever of hundreds of photographs is on screen, so a single hook
   instance serves the lot, and the queue is kept per subject: hearting one
   photograph and swiping on to heart the next must not wait on the first
   (owner, 2026-09-08, on an S23). */

function useOptimistic<T>(
  action: (subject: string) => Promise<ToggleResult>,
  flip: (before: T) => T,
  settle: (before: T, result: ToggleResult) => T,
  same: (a: T, b: T) => boolean
) {
  /* Created once, because the queue holds what is in the air: a re-render
     that made a new one would forget a flight mid-way and let a second
     request race it. So it keeps the FIRST render's action, which is sound
     because every caller's action is fixed for the component's life: the
     card, row, letter and answer are keyed by the id their closure names,
     and the Collection's takes the id from the tap. */
  const [fire] = useState(() =>
    createToggleQueue<T>({
      action: (subject) => callAction(() => action(subject)),
      flip,
      settle,
      same,
      onError: (message) => toast.error(message),
    })
  );
  return fire;
}

/** A heart, with its count. The count is put back where it BEGAN on a
 *  rollback rather than guessed at from a delta, which is why `before`
 *  carries both. */
export function useHeartToggle(action: (subject: string) => Promise<ToggleResult>) {
  return useOptimistic<{ liked: boolean; count: number }>(
    action,
    (before) => ({
      liked: !before.liked,
      count: before.liked ? before.count - 1 : before.count + 1,
    }),
    (before, result) => settledHeart(before, result.liked ?? result.loved),
    (a, b) => a.liked === b.liked
  );
}

/** A bookmark: the same choreography with nothing to count. */
export function useBookmarkToggle(action: (subject: string) => Promise<ToggleResult>) {
  return useOptimistic<boolean>(
    action,
    (before) => !before,
    (before, result) => result.bookmarked ?? !before,
    (a, b) => a === b
  );
}
