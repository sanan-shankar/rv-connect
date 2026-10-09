/**
 * The dealing rule: which bird a new member is given when they sign up.
 *
 * A member who joined before 2026-10 wears the bird their id hashes to (avatar.ts), and for them
 * the hash stays the floor. It cannot keep the birds equally common, though, because it knows
 * nothing about who already wears what: a species added after five hundred members joined would
 * stay rare for good, and the birds supporters pay to pick would only ever grow commoner. The
 * owner, 2026-10-08 (docs/planning/birds-expansion/brief.md ¶37 and ¶38):
 *
 *   "we wanna change the probabilities so that we get roughly frequency of all birds equal"
 *   "I don't want to make a likelihood zero, but I'd like to make it less, just so it equals up"
 *
 * So a new member is DEALT a bird: a random draw weighted towards the species the fewest members
 * visibly wear, stored in `User.birdOverride` so that one draw stays theirs for good.
 *
 * The weight: a species with `n` visible wearers weighs `1 / (n + 1)^2`.
 *  - A bird nobody wears is 100x likelier than one worn by nine, so new species are dealt first.
 *  - Nine against ten is about 1.2x, so once the birds have levelled the deal is close to random.
 *  - No weight is ever zero, so a bird many supporters chose is dealt less, but still dealt.
 *  - It works on ratios, not differences: a bird worn by a third more than another is dealt a
 *    little over half as often, at 40 against 30 or at 400 against 300, so the same formula keeps
 *    pulling the counts together at five thousand members as at five hundred.
 * Measured on the 2026-10-08 counts with twelve new species at zero: the next signup gets one of
 * the twelve 93 times in 100, they take about 70% of the first fifty signups, and they reach the
 * old birds' average (8.8) after about 250 (avatar-deal.test.mjs runs that simulation).
 * Considered and not taken: `1 / (n + 1)`, under which a new bird is only 10x likelier than one
 * worn by nine, the next signup gets a new bird 67 times in 100, and a bird supporters crowd onto
 * is held back about half as hard; and "always the least worn", which gives every other bird a
 * chance of zero and turns signup into a queue anyone could see.
 *
 * "Visible" (question 8, answered 2026-10-08): a photograph hides the bird, so a member with one
 * is not counted, and counts again if they take it down.
 *
 * Pure, so node:test can load it. The database half, and the resolver BirdAvatar uses (which
 * lives in a .tsx file node cannot load), is avatar-deal-server.ts.
 */

import { HOOPOE_SPECIES_INDEX, ROLLER_SPECIES_INDEX } from "./avatar.ts";

/** A species the deal may hand out: its ARCHES index, and the slug `User.birdOverride` stores. */
export interface DealableSpecies {
  index: number;
  slug: string;
}

/** Visible wearers per species index. A species missing from the map has none. */
export type WearerCounts = ReadonlyMap<number, number>;

/**
 * The mascot and the owner's own bird. Refused here whatever list the caller passes, so widening
 * the wearable list by mistake can never deal either of them to a stranger.
 */
const NEVER_DEALT: ReadonlySet<number> = new Set([HOOPOE_SPECIES_INDEX, ROLLER_SPECIES_INDEX]);

/** Every species in `species` the deal may hand out, with its weight in the draw. */
export function weightsFor(
  counts: WearerCounts,
  species: readonly DealableSpecies[]
): (DealableSpecies & { weight: number })[] {
  return species
    .filter(({ index }) => !NEVER_DEALT.has(index))
    .map(({ index, slug }) => ({ index, slug, weight: 1 / ((counts.get(index) ?? 0) + 1) ** 2 }));
}

/**
 * One weighted draw; returns the slug. `random` answers in [0, 1): Math.random in production, a
 * seeded generator in the tests. Throws when there is nothing to deal, which only a broken species
 * list can cause; signup reports that and the member keeps the bird their id hashes to.
 */
export function dealBird(
  counts: WearerCounts,
  species: readonly DealableSpecies[],
  random: () => number
): string {
  const weighted = weightsFor(counts, species);
  if (weighted.length === 0) throw new Error("dealBird: there is no species to deal");
  let r = random() * weighted.reduce((sum, s) => sum + s.weight, 0);
  for (const s of weighted) {
    r -= s.weight;
    if (r < 0) return s.slug;
  }
  // Float rounding can leave r a hair above zero after the last subtraction.
  return weighted[weighted.length - 1].slug;
}

/**
 * Visible wearers per species: every member WITHOUT a photograph, counted under the bird they
 * show. `speciesOf` must resolve that bird exactly as BirdAvatar does (override, then pin, then
 * hash); it is a parameter because that resolver lives in a .tsx file. "Without a photograph" is
 * BirdAvatar's own test too: any non-empty photoUrl hides the bird.
 */
export function tallyVisibleWearers<M extends { photoUrl: string | null }>(
  members: Iterable<M>,
  speciesOf: (member: M) => number
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const member of members) {
    if (member.photoUrl) continue;
    const species = speciesOf(member);
    counts.set(species, (counts.get(species) ?? 0) + 1);
  }
  return counts;
}
