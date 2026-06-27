/**
 * Deterministic valley-bird avatars.
 *
 * Every member without an uploaded photo gets a bird, derived stably from their id, so it never
 * changes and is evenly distributed (species and disc colour are hashed with different salts so
 * they do not correlate). Combinations = species x colours x (future variations), which scales
 * well past 500 as we add species. Photo upload overrides the bird; a manual species/colour can
 * also override the hash.
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

// Bird silhouettes available in bird-avatar.tsx. Keep in sync with the Species switch there.
export const BIRD_SPECIES_COUNT = 6;

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
  color: string;
  colorIndex: number;
}

export function birdFor(seed: string): BirdChoice {
  const s = seed && seed.length > 0 ? seed : "valley";
  const species = fnv1a(s + "::species") % BIRD_SPECIES_COUNT;
  const colorIndex = fnv1a(s + "::color") % AVATAR_PALETTE.length;
  return { species, color: AVATAR_PALETTE[colorIndex], colorIndex };
}
