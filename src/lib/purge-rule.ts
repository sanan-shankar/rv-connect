import { isSerializationFailure } from "./prisma-errors.ts";
import { parseJsonArray } from "./utils.ts";

/* ------------------------------------------------------------------ *
 *  The account purge's rules that need no database, so the unit tests
 *  hold the exact logic the server runs (the split roster-rule.ts and
 *  post-visibility-rule.ts make). The purge itself, which does need one,
 *  is account-purge.ts.
 * ------------------------------------------------------------------ */

/**
 * The stored bytes a set of Catch-up answers name: every photograph in each
 * `images` column (a JSON array; a malformed one names nothing rather than
 * failing the caller) and each recording. What the purge collects from the
 * member's own answers, and what a merge must queue for the answers it drops
 * (bug audit 3, V-T7a-02), so the two cannot disagree about what an answer
 * holds.
 */
export function entryStoredUrls(entries: { images: string | null; audioUrl: string | null }[]): string[] {
  const urls: string[] = [];
  for (const entry of entries) {
    urls.push(...parseJsonArray(entry.images));
    if (entry.audioUrl) urls.push(entry.audioUrl);
  }
  return [...new Set(urls)];
}

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

/* ------------------------------------------------------------------ *
 *  Draining the image worklist (bug audit 3, T7a-21).
 *
 *  `PendingImagePurge` holds the bytes an erasure, a post's delete or a
 *  merge has queued. The drain took 500 rows and deleted them one at a
 *  time, so a member with a large Collection contribution (three objects a
 *  photograph) stayed publicly fetchable for nights after their account
 *  went, and the audit line counted the 500 it tried with nothing said of
 *  the rest. It now works through the whole worklist in rounds of parallel
 *  deletes until a time budget is spent; what the budget does not reach
 *  stays queued for the next pass, which is the queue's purpose.
 * ------------------------------------------------------------------ */

/** One row of the worklist, as the drain reads it. */
export type QueuedObject = { id: string; url: string; createdAt: Date };

export type DrainIo = {
  /** The next rows after `after` (from the start when null), oldest first,
   *  `limit` at most. */
  page: (after: QueuedObject | null, limit: number) => Promise<QueuedObject[]>;
  /** Delete one object; true when it is gone. */
  remove: (url: string) => Promise<boolean>;
  /** Record one round: the rows whose bytes went, and the ones refused. */
  settle: (gone: QueuedObject[], refused: QueuedObject[]) => Promise<void>;
};

/** Deletes in flight at once. A member's whole archive (the largest today is
 *  330 objects, the owner's 5,220) drains in seconds rather than minutes, and
 *  25 requests at a time is nowhere near what R2 will take. */
export const DRAIN_PARALLEL = 25;
/** Rows read per page of the worklist. */
export const DRAIN_PAGE = 200;
/** A delete that has not answered in this long counts as refused for this
 *  pass, and its row stays queued, so one hung request cannot hold the drain
 *  past its budget. The storage client sets no timeout of its own. */
export const DRAIN_REMOVE_TIMEOUT_MS = 10_000;

/**
 * Work through the worklist, oldest first, a round of parallel deletes at a
 * time, until it is empty or `deadline` has passed. No round starts after the
 * deadline; one already started finishes (within its timeout). Every row is
 * tried at most once per call, so a refused object waits for the next pass
 * instead of being retried in a loop.
 *
 * `finished` is false when the deadline stopped it with rows still unread.
 */
export async function drainQueue(
  io: DrainIo,
  opts: {
    deadline: number;
    now?: () => number;
    parallel?: number;
    pageSize?: number;
    removeTimeoutMs?: number;
  }
): Promise<{ deleted: number; failed: number; finished: boolean }> {
  const now = opts.now ?? Date.now;
  const parallel = opts.parallel ?? DRAIN_PARALLEL;
  const pageSize = opts.pageSize ?? DRAIN_PAGE;
  const removeTimeoutMs = opts.removeTimeoutMs ?? DRAIN_REMOVE_TIMEOUT_MS;
  let deleted = 0;
  let failed = 0;
  let after: QueuedObject | null = null;
  for (;;) {
    if (now() >= opts.deadline) return { deleted, failed, finished: false };
    const rows = await io.page(after, pageSize);
    if (rows.length === 0) return { deleted, failed, finished: true };
    for (let i = 0; i < rows.length; i += parallel) {
      if (now() >= opts.deadline) return { deleted, failed, finished: false };
      const round = rows.slice(i, i + parallel);
      const answers = await Promise.all(round.map((row) => removeWithin(io.remove, row.url, removeTimeoutMs)));
      const gone = round.filter((_, j) => answers[j]);
      const refused = round.filter((_, j) => !answers[j]);
      await io.settle(gone, refused);
      deleted += gone.length;
      failed += refused.length;
    }
    if (rows.length < pageSize) return { deleted, failed, finished: true };
    after = rows[rows.length - 1];
  }
}

/** One delete, answered within `ms`: a throw or a late answer is a refusal. */
async function removeWithin(remove: DrainIo["remove"], url: string, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([remove(url).catch(() => false), late]);
  } finally {
    clearTimeout(timer);
  }
}
