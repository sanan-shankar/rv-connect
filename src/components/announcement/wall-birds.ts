/* ------------------------------------------------------------------ *
 *  Which birds the announcement window's wall shows, row by row, and
 *  in what order. docs/spec/announcement.md.
 *
 *  THE LOOK is the Support page's plate, set moving: big round birds,
 *  close together, on the same warm card. The owner held that plate up
 *  as the bar ("the cute and cosyness of the support page birds") after
 *  two walls that missed it, one on pastel tiles that belonged to
 *  nothing else on the site, one on the sidebar's green with too much
 *  of the green showing between the birds.
 *
 *  THE BIRDS are forty-five of the brightest: the owner's twelve from
 *  the plate, every new bird with colour enough to hold its place, and
 *  every bird the window names, the dark Red-vented Bulbul among them
 *  (on the cream, its crimson vent and black crest read at once). The olive, brown and grey birds sit
 *  out ("I just saw like 50 gray and brown birds" was the first wall).
 *
 *  THE ORDER is composed, not sorted. The tiled wall gave each row one
 *  colour family, and the owner called it "overly ordered and
 *  manicured": grouping like with like is not colour thinking. So every
 *  row is a mixed bunch, a hero or two, a few stars and the rest in
 *  support, and each bird is chosen for the two beside it:
 *    - the main colours of neighbours differ, ideally as complements
 *      (the cobalt Peafowl beside the gold Oriole, the violet Swamphen
 *      beside the yellow Iora);
 *    - where it can, a neighbour picks up the other's accent, so the
 *      row reads as one piece (the Munia's chestnut beside the
 *      Kingfisher's orange breast, the Bee-eater's orange cap beside
 *      the Owl);
 *    - light and dark alternate, so no two dark birds touch;
 *    - look-alikes never share a row: the three kingfishers bar the
 *      Pied and White-throated (two apart, and unlike at a glance), the
 *      parakeets, the bee-eaters, the orioles and the Iora, the
 *      sunbirds, the bulbuls, the blue flycatchers, the raptors, the
 *      owls, the pigeons and the chestnut birds are each spread down
 *      the wall.
 *  The loop's seam counts as a neighbour too. Each row is listed left
 *  to right as the window opens, so the heroes start scattered across
 *  the picture rather than stacked in a column. The phone's band shows
 *  the first four rows, which hold every bird the window's words name.
 *
 *  Names, not indices, as on the Support plate: a name that stops
 *  existing throws when the module loads.
 * ------------------------------------------------------------------ */

import { SPECIES_FULL_NAMES } from "@/components/common/bird-avatar-v2";

/** Each row's birds left to right as the window opens, and how far the row
 *  starts shifted right, in slots, so no two rows begin in step. */
const ROWS: { shift: number; birds: string[] }[] = [
  { shift: 0.1, birds: ["Rose-ringed Parakeet", "Hoopoe", "Verditer Flycatcher", "Red Avadavat", "White-browed Bulbul", "Little Cormorant", "Small Minivet"] },
  { shift: 0.6, birds: ["Indian White-eye", "Brahminy Starling", "Indian Peafowl", "Indian Golden Oriole", "Peregrine Falcon", "Purple-rumped Sunbird", "Tricolored Munia", "Common Kingfisher"] },
  { shift: 0.3, birds: ["Plum-headed Parakeet", "Red-vented Bulbul", "Laughing Dove", "Grey-headed Swamphen", "Common Iora", "Black-winged Kite", "Chestnut-headed Bee-eater", "Bay-backed Shrike"] },
  { shift: 0.8, birds: ["Common Kestrel", "Green Bee-eater", "Indian Eagle-Owl", "Tickell's Blue Flycatcher", "Yellow-throated Bulbul", "Purple Sunbird", "Asian Paradise Flycatcher"] },
  { shift: 0.2, birds: ["Coppersmith Barbet", "Pied Kingfisher", "Rufous Treepie", "White-throated Kingfisher", "Orange-headed Thrush", "Jerdon's Leafbird", "Spotted Owlet", "Grey Wagtail", "Black-rumped Flameback"] },
  { shift: 0.55, birds: ["Brahminy Kite", "Indian Pitta", "Black-crowned Night Heron", "Black-hooded Oriole", "Wire-tailed Swallow", "Yellow-footed Green-Pigeon"] },
];

/** One bird's slot along its row, in row heights: the bird, then its air. */
export const SLOT = 1.1;

export type WallBird = {
  index: number;
  name: string;
  /** Size, in row heights. */
  size: number;
  /** Nudge off the row's centre line, in row heights. */
  lift: number;
  /** Where the bird stands along its row as the window opens, in row heights. */
  at: number;
};

export type WallRow = { birds: WallBird[]; /** One lap, in row heights. */ span: number };

/* A small fixed scatter from each name, so the wall never reads as a grid
   (sizes a few percent apart, birds a hair off the line, gaps unequal) and
   still lands the same way every time. Small, because the plate it follows
   is calm: every bird there is the same size. */
function scatter(name: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 999;
}

export const WALL_ROWS: WallRow[] = ROWS.map(({ shift, birds }) => {
  let at = shift * SLOT;
  const placed = birds.map((name) => {
    const index = SPECIES_FULL_NAMES.indexOf(name);
    if (index < 0) throw new Error(`Unknown species on the announcement wall: ${name}`);
    const bird = { index, name, size: 0.98 + 0.08 * scatter(name, 1), lift: 0.05 * (scatter(name, 2) - 0.5), at };
    at += SLOT * (0.92 + 0.16 * scatter(name, 3));
    return bird;
  });
  return { birds: placed, span: at - shift * SLOT };
});
