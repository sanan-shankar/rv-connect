/**
 * Deterministic valley-bird avatars.
 *
 * Every member without an uploaded photo gets a bird, derived stably from their id, so it never
 * changes and is evenly distributed. The three axes (species, disc colour, pose) are hashed with
 * different salts so they do not correlate: two members who happen to share a species are very
 * unlikely to also share colour and pose. Combinations:
 *
 *     52 species  x  10 disc colours  x  4 poses  =  2080
 *
 * which clears the 500 floor with wide headroom and scales past 1000. Photo
 * upload overrides the bird; a manual species/colour can also override the hash (precedence:
 * photo > manual > hash). The same id yields the same bird on the server and the client because
 * this is pure arithmetic over charCodeAt, with no Math.random, Date, or locale.
 */

export const AVATAR_PALETTE = [
  "#1F8A4C", // leaf green
  "#3F7CA6", // office blue (the vivid pop)
  "#C2622F", // cinnamon
  "#C75F7A", // rose
  "#5C9BC4", // sky
  "#4F9E6B", // moss
  "#7E6BA8", // plum
  "#C8943C", // honey
  "#3E9E8F", // teal
  "#D2694A", // terracotta / coral (keeps real red in the mix)
];

// Rishi Valley bird species. Keep in sync with the ARCHES list in bird-avatar-v2.tsx.
export const BIRD_SPECIES_COUNT = 37;

// Pose variations (left/right). Only pose >= 2 mirrors the bird; see bird-avatar-v2.tsx.
export const BIRD_POSE_COUNT = 4;

/**
 * Manual species pins by user id, until a settings UI lets members pick their own bird.
 * The site owner is the Common Hoopoe (#0) — the valley's signature bird.
 * (For production this should migrate to an avatarSpecies column; ids differ per database.)
 */
export const SPECIES_PINS: Record<string, number> = {
  cmmz0vvws0000ynsg3ueb9scp: 0, // sanan (owner) -> Hoopoe
};

/** FNV-1a 32-bit hash. Stable across runtimes, good spread for short strings like ids. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface BirdChoice {
  species: number;
  pose: number;
  color: string;
  colorIndex: number;
}

/**
 * Each axis is a separately-salted FNV-1a, and we take a HIGH-bit window (`>>> 13`) before the
 * modulo. The salting decorrelates the axes' high bits; the high-bit window is what actually
 * matters here, because FNV-1a's final `imul` step couples the LOW bit of the result across
 * salts of equal length (so `color % 10` parity and `pose % 4` parity would otherwise lock
 * together). Slicing from bit 13 upward avoids that coupling and yields all 640 combinations
 * evenly across real cuid ids (verified in avatar.test.mjs).
 */
function axisIndex(seed: string, salt: string, count: number): number {
  return ((fnv1a(salt + seed) >>> 13) >>> 0) % count;
}

export function birdFor(seed: string): BirdChoice {
  const s = seed && seed.length > 0 ? seed : "valley";
  const species = axisIndex(s, "species::", BIRD_SPECIES_COUNT);
  const colorIndex = axisIndex(s, "color::", AVATAR_PALETTE.length);
  const pose = axisIndex(s, "pose::", BIRD_POSE_COUNT);
  return { species, pose, color: AVATAR_PALETTE[colorIndex], colorIndex };
}
