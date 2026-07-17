/**
 * Deterministic valley-bird avatars.
 *
 * Every member without an uploaded photo gets a bird, derived stably from their id, so it never
 * changes and is evenly distributed. The three axes (species, disc colour, pose) are hashed with
 * different salts so they do not correlate. The set is 50 real Rishi Valley species (see
 * bird-avatar-v2.tsx); the avatars currently render with no background (BG_MODE="none"), so the
 * visible variety is 50 species x 2 poses (left/right) and the disc colour is held in reserve for
 * the disc-bearing modes.
 *
 * Photo upload overrides the bird; a manual per-user `birdOverride` (DB column, species slug) or an
 * owner/staff pin can also override the hash (precedence: photo > birdOverride > pin > hash). The
 * same id yields the same bird on the server and the client because this is pure arithmetic over
 * charCodeAt, with no Math.random, Date, or locale.
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
export const BIRD_SPECIES_COUNT = 50;

// Pose variations (left/right). Only pose >= 2 mirrors the bird; see bird-avatar-v2.tsx.
export const BIRD_POSE_COUNT = 4;

/**
 * Manual species pins by user id, until a settings UI lets members pick their own bird.
 * The owner (the account matching ADMIN_EMAIL in .env.local) is pinned to the Indian Roller (#3)
 * so their personal avatar reads distinctly from the Hoopoe, which stays reserved for the app's
 * flying mascot rather than doubling as anyone's member identity (see docs/spec/mascot.md, "Open
 * follow-ups").
 * (For production this should migrate to an avatarSpecies column; ids differ per database, so the
 * seed-demo id below is kept for the local demo-seed flow and the production id was resolved once
 * against the live database for the ADMIN_EMAIL account.)
 */
export const SPECIES_PINS: Record<string, number> = {
  cmmz0vvws0000ynsg3ueb9scp: 3, // seed-demo owner -> Indian Roller
  cmr1uahuj000004jx4dc4p8co: 3, // production owner (ADMIN_EMAIL) -> Indian Roller
};

/**
 * The Hoopoe is species index 0 in the Rishi Valley set (see ARCHES in bird-avatar-v2.tsx) and is
 * the app's flying mascot (docs/spec/mascot.md). No real member may wear it. The only exception is
 * the Anonymous placeholder account, which is allowed a `birdOverride` of `"hoopoe"` (see
 * HOOPOE_RESERVED_USER_ID); every other id is guarded against it in bird-avatar-v2.tsx's
 * `resolveBirdOverride`.
 */
export const HOOPOE_SPECIES_INDEX = 0;

/** The one user id allowed to keep the Hoopoe as its bird (see HOOPOE_SPECIES_INDEX). */
export const HOOPOE_RESERVED_USER_ID = "anonymous";

/**
 * Fixed fallback species for a member whose id happens to hash onto the reserved Hoopoe slot.
 * Deterministic (not re-hashed) so it never collides with the hash of any other real id, and
 * chosen to read nothing like the Hoopoe (no cinnamon body, no fanned crest): the Rufous Treepie,
 * a long-tailed grey/rufous/black bird (species index 19 in ARCHES).
 */
export const HOOPOE_HASH_REMAP_INDEX = 19;

/**
 * The final species index for a member's hash-derived bird, with the Hoopoe exclusion applied.
 * Only ever changes the outcome for the (rare) ids whose raw hash lands on the reserved Hoopoe
 * slot; every other id's bird is untouched. Manual overrides and pins are resolved by the caller
 * before falling back to this - it only covers the plain-hash tier of the precedence chain.
 */
export function hashSpeciesFor(seed: string): number {
  const raw = birdFor(seed).species;
  return raw === HOOPOE_SPECIES_INDEX ? HOOPOE_HASH_REMAP_INDEX : raw;
}

/**
 * Resolves a member's final species index given the full precedence chain: an already-resolved
 * manual `birdOverride` index wins, then the owner/staff pin, then the (Hoopoe-excluded) hash.
 * `overrideIndex` should already have gone through bird-avatar-v2.tsx's `resolveBirdOverride`
 * (which parses the slug and enforces the Hoopoe reservation), so this function does not need to
 * know about slugs at all.
 */
export function speciesForMember(seed: string, overrideIndex?: number | null): number {
  if (overrideIndex !== undefined && overrideIndex !== null) {
    return ((overrideIndex % BIRD_SPECIES_COUNT) + BIRD_SPECIES_COUNT) % BIRD_SPECIES_COUNT;
  }
  const pinned = SPECIES_PINS[seed];
  if (pinned !== undefined) return pinned;
  return hashSpeciesFor(seed);
}

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
 * together). Slicing from bit 13 upward avoids that coupling and spreads all species/colour/pose
 * combinations evenly across real cuid ids (verified in avatar.test.mjs).
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
