/* ------------------------------------------------------------------ *
 *  A key this instance has already seen with no budget, remembered until
 *  its window turns over (bug audit 3, L5-02).
 *
 *  Asking Upstash whether a key has budget costs one command, and the
 *  month holds 500,000 of them for every limiter in the app. A sign-in
 *  flood from one machine used to spend two to four on every attempt it
 *  was refused -- the refusal was the expensive part -- so ten attempts a
 *  second emptied the month in about seven hours, and every meter in the
 *  app then failed open until the month reset. Remembering the refusal
 *  here makes the flood's cost about one command per instance per window.
 *
 *  It only ever holds keys that were ALREADY refused, so it can never
 *  refuse a key Upstash would have let through on first sight. What it
 *  can do is hold one a little past the moment a sliding window would
 *  have freed a token: `reset` is the end of the window's current bucket,
 *  which the library's own cache for `limit()` honours the same way. So
 *  it is capped at MEMO_MAX_MS, the shortest login window, whatever the
 *  window says; a 30-day meter (`emailMoves`) is asked again after a
 *  quarter of an hour, not after a month.
 *
 *  Pure on purpose: no imports, so `node:test` can run it as it is.
 * ------------------------------------------------------------------ */

/** The longest any key is answered from memory: fifteen minutes. */
export const MEMO_MAX_MS = 15 * 60_000;

/** Past this many keys the expired ones are swept, and if that is not
 *  enough the oldest go: a flood rotating keys cannot grow it without end. */
export const MEMO_MAX_KEYS = 10_000;

export type SpentMemo = {
  /** Whether `key` is known to have no budget right now. */
  known(key: string, now?: number): boolean;
  /** `key` had no budget; remember it until `reset` (epoch ms), capped. */
  remember(key: string, reset: number, now?: number): void;
  size(): number;
};

export function createSpentMemo(): SpentMemo {
  const until = new Map<string, number>();

  const makeRoom = (now: number) => {
    for (const [key, t] of until) if (t <= now) until.delete(key);
    // Insertion order is age order, so the first keys are the oldest.
    for (const key of until.keys()) {
      if (until.size < MEMO_MAX_KEYS) break;
      until.delete(key);
    }
  };

  return {
    known(key, now = Date.now()) {
      const t = until.get(key);
      if (t === undefined) return false;
      if (t > now) return true;
      until.delete(key);
      return false;
    },
    remember(key, reset, now = Date.now()) {
      const t = Math.min(reset, now + MEMO_MAX_MS);
      if (!(t > now)) return;
      if (until.size >= MEMO_MAX_KEYS) makeRoom(now);
      until.delete(key);
      until.set(key, t);
    },
    size: () => until.size,
  };
}
