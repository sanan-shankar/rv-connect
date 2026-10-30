import { isSerializationFailure } from "./prisma-errors.ts";

/* ------------------------------------------------------------------ *
 *  The account purge's rules that need no database, so the unit tests
 *  hold the exact logic the server runs (the split roster-rule.ts and
 *  post-visibility-rule.ts make). The purge itself, which does need one,
 *  is account-purge.ts.
 * ------------------------------------------------------------------ */

/** How many times the purge's transaction is tried before it gives up until
 *  tomorrow. */
export const PURGE_ATTEMPTS = 3;

/**
 * Run `attempt` again, from the start, when Postgres refused it for a write
 * conflict: P2034, which the pg adapter raises for a serialization failure
 * (40001) and for a deadlock (40P01).
 *
 * The purge runs at REPEATABLE READ (audit C-076) so that nothing written while
 * it runs can slip past the bytes it collected. The price of that isolation is
 * that a concurrent write to any row the purge touches aborts it instead of
 * waiting: a heart on the member's post, the member signing back in, a Keeper
 * leaving one of their Catch-ups. The aborted attempt wrote nothing, and the
 * next one reads a fresh snapshot that includes the other write, which is what
 * C-076's own ledger line assumed would happen and nothing did: the purge
 * failed until the next night (bug audit 3, L1-04).
 *
 * Anything else is thrown at once. A timeout, a missing table or a bug does
 * not get better for asking again, and the cancellation the purge throws to
 * roll itself back must reach its caller on the first throw.
 */
export async function retryWriteConflicts<T>(
  attempt: () => Promise<T>,
  opts: {
    attempts: number;
    /** Called before each new try, with the number of the try that failed. */
    onRetry?: (failed: number) => void;
    /** Waits between tries; the default backs off with jitter. */
    pause?: (failed: number) => Promise<void>;
  }
): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (err) {
      if (n >= opts.attempts || !isSerializationFailure(err)) throw err;
      opts.onRetry?.(n);
      await (opts.pause ?? backOff)(n);
    }
  }
}

/** A wait that grows with each try and is never quite the same twice, so two
 *  transactions that collided do not collide again in step. */
function backOff(failed: number): Promise<void> {
  const ms = 100 * failed + Math.floor(Math.random() * 100 * failed);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
