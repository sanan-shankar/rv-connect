"use client";

/* ------------------------------------------------------------------ *
 *  The optimistic tap, once.
 *
 *  A heart or a bookmark flips the instant it is touched and the server
 *  action follows. Getting that right takes four things, and three
 *  components each wrote out all four: a ref (not state) so a double tap
 *  is refused in the SAME tick that `disabled` would only catch on the
 *  next render (C-010/C-178), the optimistic flip, a rollback with a
 *  toast when the action refuses, and adopting what the row actually
 *  says rather than what the tap assumed (C-133).
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

import { useRef } from "react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { settledHeart } from "@/lib/heart";

/** What the toggle actions answer with. All three fields undefined means the
 *  action did not say -- an older shape, or a demo stub -- and the optimistic
 *  flip stands.
 *
 *  `liked` and `loved` are the same fact under two names: posts and comments
 *  are liked, Catch-up answers and Collection photos are loved. The hook takes
 *  either rather than making five server actions agree on a word. */
type ToggleResult = {
  error?: string;
  liked?: boolean;
  loved?: boolean;
  bookmarked?: boolean;
};

type Options = {
  /** Flip on screen but write nothing. The demo's posts are read-only, and a
   *  heart that refuses to move reads as broken rather than as a demo. */
  skipAction?: boolean;
};

function useOptimistic<T>(
  action: () => Promise<ToggleResult>,
  flip: (before: T) => T,
  settle: (before: T, result: ToggleResult) => T
) {
  /* A ref, not state: `disabled={busy}` binds on the NEXT render, so a
     double tap gets through it, and re-rendering merely to record that a
     request is in the air would be a render nobody asked for. */
  const busy = useRef(false);

  /** Resolves with the state that STUCK, or undefined if nothing did -- the
   *  tap was refused as a double, or the action was and the flip rolled back.
   *  Callers with a neighbour to tell (the Saved tab, which drops a card when
   *  its bookmark goes) wait on that rather than on the optimistic flip. */
  return async function fire(
    before: T,
    commit: (next: T) => void,
    opts?: Options
  ): Promise<T | undefined> {
    if (busy.current) return undefined;
    const optimistic = flip(before);
    commit(optimistic);
    if (opts?.skipAction) return optimistic;
    busy.current = true;
    try {
      const result = await callAction(action);
      if (result.error) {
        commit(before);
        toast.error(result.error);
        return undefined;
      }
      const next = settle(before, result);
      commit(next);
      return next;
    } finally {
      busy.current = false;
    }
  };
}

/** A heart, with its count. The count is put back where it BEGAN on a
 *  rollback rather than guessed at from a delta, which is why `before`
 *  carries both. */
export function useHeartToggle(action: () => Promise<ToggleResult>) {
  return useOptimistic<{ liked: boolean; count: number }>(
    action,
    (before) => ({
      liked: !before.liked,
      count: before.liked ? before.count - 1 : before.count + 1,
    }),
    (before, result) => settledHeart(before, result.liked ?? result.loved)
  );
}

/** A bookmark: the same choreography with nothing to count. */
export function useBookmarkToggle(action: () => Promise<ToggleResult>) {
  return useOptimistic<boolean>(
    action,
    (before) => !before,
    (before, result) => result.bookmarked ?? !before
  );
}
