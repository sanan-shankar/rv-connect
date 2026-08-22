/* The twelve birds on /support, and which way each one faces.
 *
 * Down from fourteen (owner, 2026-08-22): the Common Kingfisher and the
 * Tricolored Munia are gone, which is what makes twelve divide evenly into
 * BOTH grids the plate now renders -- four columns and three rows on mobile
 * (owner, same day, correcting an initial three-by-four: "you did the
 * support as 3x4. do 4x3"), six columns and two rows from `sm` up
 * (bird-plate.tsx).
 *
 * The order is neither the owner's listing order nor the species order. It is
 * arranged so no two look-alike birds ever touch, side by side, stacked, or
 * corner to corner, IN EITHER GRID SHAPE AT ONCE -- the same twelve-item list
 * just reflows at a different width. The old two-row plate could get away
 * with a column-only rule (two cells touch exactly when their columns are
 * less than two apart, rows do not come into it), a shortcut that only holds
 * because a two-row grid has no room for a cell two rows away. Three rows
 * does not have that shortcut: touching now depends on both axes, so this
 * order was found by exhaustive search (script kept, see PR/commit) rather
 * than argued by hand, and it is CHECKED, not merely believed -- the search
 * re-validates its own answer against both grids before accepting it. (The
 * 3x4 ordering this replaced was a DIFFERENT valid answer to a different
 * problem: a 3-column grid has different touching pairs than a 4-column one,
 * so the sequence could not simply be relabelled, it had to be re-solved.)
 *
 * Their real disc colours, read off the rendered glyphs rather than guessed at:
 *
 *   Avadavat    #C0392B red        Kite          #A8431F rust
 *   Owlet       #8C7B66 tan        Dove          #D2977E salmon
 *   Leafbird    #4FA63C green      Oriole        #E8B82E gold
 *   Pitta       #4FA05E green      WT Kingfisher #1F9FB2 teal
 *   P-r Sunbird #277C49 dark green Verditer      #46A9BE cyan
 *   P Sunbird   #5A3E7A purple     Cormorant     #2A2A30 near black
 *
 * Three look-alike sets remain: three greens (Leafbird, Pitta, P-r Sunbird),
 * a teal pair (WT Kingfisher, Verditer -- the Common Kingfisher's blue used to
 * make this a trio), and a red/rust pair (Avadavat, Kite -- the Munia's dark
 * brown used to make this a trio too), plus a pale pair (Owlet, Dove) that
 * was never a trio. Oriole, Cormorant and Purple Sunbird are each the only
 * member of their hue and carry no constraint at all.
 *
 * Names, not indices. An earlier version of this row was a list of raw indices,
 * and when the Indian Roller was reserved the numbers shifted and one bird
 * spent weeks captioned as another. A name that no longer exists throws here,
 * at module load, which is deterministic: if it renders once in dev it cannot
 * fail in production. */

import { birdFor, HOOPOE_SPECIES_INDEX } from "@/lib/avatar";
import {
  GALLERY_SPECIES,
  SPECIES_FULL_NAMES,
  SPECIES_SLUGS,
} from "@/components/common/bird-avatar-v2";

const PLATE_NAMES = [
  "Red Avadavat",
  "Jerdon's Leafbird",
  "Verditer Flycatcher",
  "Indian Golden Oriole",
  "White-throated Kingfisher",
  "Laughing Dove",
  "Little Cormorant",
  "Spotted Owlet",
  "Brahminy Kite",
  "Indian Pitta",
  "Purple Sunbird",
  "Purple-rumped Sunbird",
];

/* Which way a bird faces is not a prop, it is the seed: BirdGlyphV2 mirrors
   the glyph when birdFor(seed).pose is 2 or 3, and pose is a salted hash of
   the seed string. Left on the gallery's own seeds the birds face whichever
   way the hash felt like, which is the last thing you want on a plate whose
   whole job is comparison. This walks `plate-<index>-<k>` upward until the
   pose lands facing right, a pure function of the index, so the server and
   the client always agree.

   Everything faces RIGHT, the way a field guide plates its birds: hold the
   direction still and the differences between bills, crests and postures are
   the only thing left moving. The Spotted Owlet is drawn head-on, so it ends
   up the single bird looking back at you, for free. */
export function seedFacingRight(index: number): string {
  for (let k = 0; k < 64; k++) {
    const seed = `plate-${index}-${k}`;
    if (birdFor(seed).pose < 2) return seed;
  }
  // Unreachable with a 4-value pose. The fallback only exists so a future
  // pose change cannot hang the module.
  return `plate-${index}-0`;
}

export const PLATE = PLATE_NAMES.map((name) => {
  const index = SPECIES_FULL_NAMES.indexOf(name);
  if (index < 0) throw new Error(`Unknown species on the support plate: ${name}`);
  return { name, index, seed: seedFacingRight(index) };
});

/* Every species a supporter may actually wear: the public gallery minus the
   mascot. GALLERY_SPECIES already holds the Indian Roller back; the Hoopoe is
   listed there so the gallery never looks like it forgot the mascot, but
   resolveBirdOverride ignores the slug for everyone except the reserved
   account, so offering it in a picker would be offering a dud. The server
   action validates against this same list, so the UI and the rule can never
   disagree. */
export const WEARABLE_SPECIES = GALLERY_SPECIES.filter(
  ({ index }) => index !== HOOPOE_SPECIES_INDEX
).map(({ index, name }) => ({ index, name, slug: SPECIES_SLUGS[index] }));

export const WEARABLE_SLUGS = new Set(WEARABLE_SPECIES.map((s) => s.slug));

/* What unlocks the bird picker, in paise: total PAID contributions from one
   member, in the current key mode. Summed rather than per-payment so two old
   ₹300s count the same as one ₹600. Lives here rather than in actions.ts
   because a "use server" module may only export async functions. */
export const PERK_MIN_PAISE = 500 * 100;
