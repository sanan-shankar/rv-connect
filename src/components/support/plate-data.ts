/* The fourteen birds on /support, and which way each one faces.
 *
 * The order is neither the owner's listing order nor the species order. It is
 * arranged, and the arrangement rests on one fact about a two-row grid: two
 * cells touch, side by side or corner to corner, exactly when their COLUMNS are
 * less than two apart. Rows do not come into it. So keeping look-alikes off
 * each other is a question of column spacing and nothing else.
 *
 * Their real disc colours, read off the rendered glyphs rather than guessed at:
 *
 *   Avadavat    #C0392B red        Kite          #A8431F rust
 *   Munia       #7A3A23 dark brown Dove          #D2977E salmon
 *   Owlet       #8C7B66 tan        Oriole        #E8B82E gold
 *   Leafbird    #4FA63C green      Pitta         #4FA05E green
 *   P-r Sunbird #277C49 dark green WT Kingfisher #1F9FB2 teal
 *   Verditer    #46A9BE cyan       C Kingfisher  #1FA6D6 blue
 *   P Sunbird   #5A3E7A purple     Cormorant     #2A2A30 near black
 *
 * Four look-alike sets fall out of that: three greens, three teal-to-blues,
 * three reds and browns, and two pale muted ones. Each set is spread across
 * columns at least two apart, so no member of a set ever touches another.
 * Reading across it gives red, cyan, green, gold, dark brown, teal, salmon on
 * top, and tan, black, rust, blue, green, purple, dark green below: no two
 * neighbours share a hue, every column pairs a warm bird with a cool one, and
 * three columns land on near complementaries.
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
  // Row one
  "Red Avadavat",
  "Verditer Flycatcher",
  "Jerdon's Leafbird",
  "Indian Golden Oriole",
  "Tricolored Munia",
  "White-throated Kingfisher",
  "Laughing Dove",
  // Row two
  "Spotted Owlet",
  "Little Cormorant",
  "Brahminy Kite",
  "Common Kingfisher",
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
