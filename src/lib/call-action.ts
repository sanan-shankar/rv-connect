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

export type ActionFailure = { error: string };

export async function callAction<T>(run: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await run();
  } catch (err) {
    // Logged, not swallowed: a deploy-skew or auth-redirect rejection is a real
    // signal and the console is where a developer will look for it. The member
    // gets a sentence they can act on instead of a stack trace.
    console.error("[action] call failed", err);
    return { error: ACTION_FAILED };
  }
}
