/**
 * FNV-1a, 32-bit. Stable across runtimes, and a good spread for short strings
 * like a cuid or a date key.
 *
 * Two unrelated things want a cheap deterministic number from a string: which
 * bird an id draws, and which word the dark-mode gauntlet falls back to when
 * the NYT is unreachable. They had a copy each, one of them called `hash`,
 * which is a name that says nothing about what it computes.
 *
 * Deliberately NOT a security primitive. Anyone can predict the output; that
 * is fine for both callers, and it must never be used where that is not.
 *
 * There is a third copy, in src/lib/avatar.test.mjs, and it stays. That file
 * mirrors the avatar maths on purpose so the two can be compared -- a test
 * that imports the thing it checks agrees with itself by construction.
 */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
