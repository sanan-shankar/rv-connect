/**
 * Every tap on a heart or a bookmark counts, however slow the write is.
 *
 * WHAT THIS REPLACED. Each toggle used to carry an in-flight guard: while one
 * request for a subject was in the air, a second tap on it was refused
 * outright (C-010/C-178, where two racing toggles could land in either order).
 * That was safe for the database and wrong for the member, because the button
 * had already squeezed and, for a like, thrown its flecks. Measured on
 * 2026-09-17: a like took 0.5 to 2.7s to come back, and five taps made inside
 * one of those windows changed nothing on screen. The owner, on a phone:
 * "the celebration shows when I like a catch up post but the heart doesn't
 * colour in", and "sometimes it just doesn't react for even 5 taps even
 * though it compresses".
 *
 * NOW. A tap always flips the screen. What the member last asked for is
 * `wanted`; what the server last confirmed is `confirmed`. One request per
 * subject is in the air at a time, which keeps C-010's guarantee (no two
 * toggles race), and when it lands the loop compares: if the server is where
 * the member wants it, adopt the server's version and stop; if not (they
 * tapped again meanwhile, or the page was stale and the toggle went the other
 * way, C-133), send one more. An even number of taps during a flight costs no
 * request at all.
 *
 * Framework-free on purpose, so `heart.test.mjs` can drive it with a fake
 * server instead of reading its source for the right-looking lines.
 */

export type ToggleResult = {
  error?: string;
  liked?: boolean;
  loved?: boolean;
  bookmarked?: boolean;
};

export type FireOptions = {
  /** Flip on screen but write nothing (the demo). */
  skipAction?: boolean;
  /** Which thing the tap is about, when one queue serves many (the Collection). */
  subject?: string;
};

type Run<T> = {
  confirmed: T;
  wanted: T;
  commit: (next: T) => void;
  /** Bumped per tap, so only the LAST tap's promise reports what stuck. */
  seq: number;
  done: Promise<T | undefined>;
};

/* A server that answers each toggle with the state it did not reach would
   loop forever. Four round trips is two full on-off cycles of a member
   actively tapping; past that the server's answer stands. */
const MAX_ROUND_TRIPS = 4;

export function createToggleQueue<T>({
  action,
  flip,
  settle,
  same,
  onError,
}: {
  action: (subject: string) => Promise<ToggleResult>;
  flip: (before: T) => T;
  settle: (before: T, result: ToggleResult) => T;
  /** Whether two states are the same ASK (liked or not), ignoring counts. */
  same: (a: T, b: T) => boolean;
  onError: (message: string) => void;
}) {
  const runs = new Map<string, Run<T>>();

  async function drain(subject: string, run: Run<T>): Promise<T | undefined> {
    try {
      for (let trip = 1; ; trip++) {
        const from = run.confirmed;
        const result = await action(subject);
        if (result.error) {
          // Back to the last state the server actually holds.
          run.commit(from);
          onError(result.error);
          return undefined;
        }
        run.confirmed = settle(from, result);
        if (same(run.confirmed, run.wanted) || trip >= MAX_ROUND_TRIPS) {
          run.commit(run.confirmed);
          return run.confirmed;
        }
      }
    } finally {
      runs.delete(subject);
    }
  }

  /** Resolves with the state that STUCK, or undefined if nothing did (the
   *  action refused and the flip rolled back) or a later tap superseded this
   *  one. Callers with a neighbour to tell (the Saved tab drops a card when
   *  its bookmark goes) wait on that rather than on the optimistic flip. */
  return function fire(
    before: T,
    commit: (next: T) => void,
    opts?: FireOptions
  ): Promise<T | undefined> {
    const subject = opts?.subject ?? "";
    const wanted = flip(before);
    commit(wanted);
    if (opts?.skipAction) return Promise.resolve(wanted);

    let run = runs.get(subject);
    if (run) {
      run.wanted = wanted;
      run.commit = commit;
      run.seq += 1;
    } else {
      run = { confirmed: before, wanted, commit, seq: 1, done: undefined! };
      runs.set(subject, run);
      run.done = drain(subject, run);
    }
    const mine = run.seq;
    const owner = run;
    return owner.done.then((stuck) => (owner.seq === mine ? stuck : undefined));
  };
}
