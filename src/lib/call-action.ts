/**
 * Await a server action without letting a rejection strand the UI.
 *
 * A server action does not only return `{ error }`. It can REJECT, and three
 * ordinary things make it: the network drops mid-call, a deploy lands while the
 * tab is open and the client asks for an action id the new build no longer has
 * ("Failed to find Server Action"), or the session expires and the proxy
 * answers the action POST with a redirect to /login.
 *
 * Almost every client component in this app awaited an action as if only the
 * first of those existed, so a rejection produced an unhandled promise
 * rejection and, worse, silence: a `setLoading(false)` that never ran left the
 * feed showing skeletons forever, and a `setSubmitting(false)` that never ran
 * left the comment box disabled forever. No toast, no retry, nothing on screen
 * to explain it (audit B-042).
 *
 * So: route every await-an-action through here, and pair it with try/finally on
 * any busy flag. The rejection becomes an ordinary `{ error }` -- the shape
 * every call site already knows how to render.
 */

/** What a member is told when the call itself never landed. */
export const ACTION_FAILED = "That did not go through. Check your connection and try again.";

type ActionFailure = { error: string };

/**
 * The failure branch, shaped like one of the action's own branches.
 *
 * TypeScript builds an action's return type by unioning its `return` statements
 * and giving every branch the OTHER branches' keys as `?: undefined` -- which
 * is what lets a call site write `if (result.error)` and then reach
 * `result.comment` on the far side. A bare `{ error: string }` added to that
 * union breaks the trick: it has no `comment` key at all, and `if
 * (result.error)` cannot narrow it away either, because `string` includes "".
 * So the failure branch is given the same treatment, and every existing call
 * site keeps compiling and narrowing exactly as it did.
 */
type ActionFailureLike<T> = ActionFailure & {
  [K in Exclude<keyof T, "error">]?: undefined;
};

export async function callAction<T>(
  run: () => Promise<T>
): Promise<T | ActionFailureLike<T>> {
  try {
    return await run();
  } catch (err) {
    // Logged, not swallowed: a deploy-skew or auth-redirect rejection is a real
    // signal and the console is where a developer will look for it. The member
    // gets a sentence they can act on instead of a stack trace.
    console.error("[action] call failed", err);
    // The cast is the price of the mapped type above: at runtime this object
    // IS the failure branch (every sibling key is genuinely absent, which is
    // what `?: undefined` means), but TypeScript cannot see that a literal
    // satisfies a mapped type over an unresolved generic.
    return { error: ACTION_FAILED } as ActionFailureLike<T>;
  }
}
