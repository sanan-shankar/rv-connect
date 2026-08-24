/**
 * What a heart should show once the server has answered.
 *
 * Every heart in the app is optimistic: it flips the instant it is tapped and
 * the action follows. What none of them did was LISTEN to the answer. The
 * toggles are delete-first and idempotent, so they never throw -- they just
 * report which state the row ended in -- and every caller threw that away and
 * kept the guess.
 *
 * That is invisible until the guess is wrong, and there are two ordinary ways
 * for it to be wrong. A double-tap fires two toggles whose order the network
 * decides (audit C-010/C-178). And Next reuses a cached page payload on
 * browser Back, so a detail page re-mounts with the heart it had BEFORE the
 * tap; tapping that stale-empty heart removes the like that is really there,
 * and the UI, trusting its own flip, shows it full (audit C-133).
 *
 * `before` is the state the tap started from, so the count can be put back
 * where it began rather than guessed at from a delta.
 *
 * `serverLiked` undefined means the action did not say -- an older shape, or a
 * demo stub. Then the optimistic flip stands, which is what happened before.
 */
export function settledHeart(
  before: { liked: boolean; count: number },
  serverLiked: boolean | undefined
): { liked: boolean; count: number } {
  const liked = serverLiked ?? !before.liked;
  if (liked === before.liked) return { liked, count: before.count };
  return { liked, count: Math.max(0, before.count + (liked ? 1 : -1)) };
}
