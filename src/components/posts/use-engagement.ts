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
  /** WHICH thing this tap is about -- a post id, a photograph id. The
   *  in-flight guard is kept per subject, and the action is handed this back,
   *  so one hook can serve a whole list of hearts.
   *
   *  Four of the five hearts are drawn by a component that IS one subject (a
   *  card, a comment row, a letter), so their hook instance is one subject's
   *  too and they leave this alone. The Collection is the exception and always
   *  was: its viewer draws one heart for whichever of hundreds of photographs
   *  is on screen, so a single hook instance serves the lot. */
  subject?: string;
};

function useOptimistic<T>(
  action: (subject: string) => Promise<ToggleResult>,
  flip: (before: T) => T,
  settle: (before: T, result: ToggleResult) => T
) {
  /* A ref, not state: `disabled={busy}` binds on the NEXT render, so a
     double tap gets through it, and re-rendering merely to record that a
     request is in the air would be a render nobody asked for.

     A SET of subjects, not one boolean, and that is a fix rather than a
     generalisation. The guard is meant to refuse a second tap on the heart
     that is already mid-flight; as one boolean it refused a tap on any OTHER
     heart the same hook instance drew. The Collection has exactly one such
     instance for the whole archive, so hearting a photograph and then swiping
     to the next and hearting that one -- a second apart on a phone, well
     inside one round trip -- silently dropped the second tap. The celebration
     had already played (the button animates on press, not on the answer), so
     the flecks flew and the heart stayed empty: "I get the celebration with
     the heart, the heart didn't fill in" (owner, 2026-09-08, on an S23).

     Held per subject it does what it always said it did. Callers that pass no
     subject share the key "", which is the old behaviour exactly -- correct
     for them, because their hook instance already only ever draws one. */
  const busy = useRef(new Set<string>());

  /** Resolves with the state that STUCK, or undefined if nothing did -- the
   *  tap was refused as a double, or the action was and the flip rolled back.
   *  Callers with a neighbour to tell (the Saved tab, which drops a card when
   *  its bookmark goes) wait on that rather than on the optimistic flip. */
  return async function fire(
    before: T,
    commit: (next: T) => void,
    opts?: Options
  ): Promise<T | undefined> {
    const subject = opts?.subject ?? "";
    if (busy.current.has(subject)) return undefined;
    const optimistic = flip(before);
    commit(optimistic);
    if (opts?.skipAction) return optimistic;
    busy.current.add(subject);
    try {
      const result = await callAction(() => action(subject));
      if (result.error) {
        commit(before);
        toast.error(result.error);
        return undefined;
      }
      const next = settle(before, result);
      commit(next);
      return next;
    } finally {
      busy.current.delete(subject);
    }
  };
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
    (before, result) => settledHeart(before, result.liked ?? result.loved)
  );
}

/** A bookmark: the same choreography with nothing to count. */
export function useBookmarkToggle(action: (subject: string) => Promise<ToggleResult>) {
  return useOptimistic<boolean>(
    action,
    (before) => !before,
    (before, result) => result.bookmarked ?? !before
  );
}
