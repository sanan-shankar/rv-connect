/**
 * The gallery's grid, shared by the birds page, the paid picker and the picker's loading skeleton so
 * the three cannot drift (the owner asked for one layout, not two). It lives beside the order
 * because the order is checked against exactly these column counts: two on a phone, four from `sm`
 * (the sidebar arrives at `md` and takes the width a fifth column would need, which made 80px
 * birds), six from `lg` and seven from `xl`.
 *
 * From `sm` up each bird fills its column, the way the Support page's twelve do (owner, 2026-10-30:
 * that plate feels big, bright and cosy, full without being cramped, and this page felt sparse by
 * comparison). Before, a fixed 96px bird sat in a 210px column at desktop, with 130px of air
 * between neighbours. Seven columns because seventy birds make exactly ten full rows, and the names
 * still fit on one line at that width; eight made smaller birds, wrapped names and a ragged last
 * row. A phone keeps its two columns of 96px birds: his comparison was of the desktop pages.
 */
export const GALLERY_GRID =
  "grid grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7";

/** One bird's box in that grid: 96px on a phone, the full column from `sm` up. */
export const GALLERY_GLYPH =
  "relative grid size-24 shrink-0 place-items-center sm:aspect-square sm:h-auto sm:w-full [&>svg]:size-full";

/** The name under each bird. Balanced, so a name that wraps splits evenly rather than at a hyphen
 *  ("Green-" over "Pigeon"). The picker adds its hover and selected colours to it. */
export const GALLERY_NAME = "mt-[var(--space-xs)] text-balance text-[13px] font-medium leading-snug";

/**
 * The order the birds page and the supporters' picker show the birds in. First set on 2026-10-23,
 * when the owner asked for an order designed for colour, contrast and delight instead of a random
 * one; reworked on 2026-10-30, when he found the top of the page too red and warm (it read as
 * alarm, not calm), the second row three greens in a row, and named the birds he wanted higher and
 * lower. The full reasoning and the orders tried are in docs/planning/birds-expansion/ordering.md.
 *
 * The shape, and why:
 * - The Hoopoe first, then a calm first screen. Blues, greens, greys and soft browns lead the first
 *   four rows; red and orange are single sparks, never a band (the Hoopoe, the Avadavat, the Kite).
 *   The Spotted Owlet holds the top row where the Eagle-Owl was, and the Eagle-Owl ends row two.
 * - Every colour spread out. Never two of one colour side by side, never three of one colour in
 *   any five in a row, and no warm pair touching (the maroon Munia counts as warm).
 * - Look-alikes apart. No two birds of a family (the kingfishers, the bulbuls, the owls, the
 *   raptors, the teal pair of the White-throated Kingfisher and the Verditer...) side by side,
 *   stacked or corner to corner, at the 2, 4, 6 and 7 columns of GALLERY_GRID above.
 * - Rests. The black birds are spread out, never two beside or stacked, so they set the colours off
 *   instead of pooling.
 * - A strong last row.
 *
 * Names are full species names, so redrawing a bird never moves it. A bird added to the set must be
 * placed here too; bird-gallery-order.test.mjs fails until it is.
 */
export const GALLERY_ORDER: readonly string[] = [
  "Hoopoe",  // the first screen: calm, varied, the owner's picks; red and orange as sparks
  "Yellow-footed Green-Pigeon",
  "Verditer Flycatcher",
  "Spotted Owlet",
  "Black-rumped Flameback",
  "Common Kingfisher",
  "Red Avadavat",
  "Purple Sunbird",
  "Peregrine Falcon",
  "Green Bee-eater",
  "Little Cormorant",
  "Indian Peafowl",
  "Jerdon's Leafbird",
  "Indian Eagle-Owl",
  "Wire-tailed Swallow",
  "Laughing Dove",
  "Red-wattled Lapwing",
  "Black-crowned Night Heron",
  "Indian Robin",
  "Brahminy Kite",
  "White-throated Kingfisher",
  "Red-vented Bulbul",
  "Purple-rumped Sunbird",
  "Tickell's Blue Flycatcher",
  "Asian Paradise Flycatcher",
  "Baya Weaver",
  "Indian Grey Hornbill",
  "Blue-faced Malkoha",
  "Painted Spurfowl",  // the rest: every colour spread out, the black birds as rests
  "Black Drongo",
  "White-browed Bulbul",
  "Small Minivet",
  "Oriental Magpie-Robin",
  "Little Grebe",
  "Common Iora",
  "Rock Pigeon",
  "Bay-backed Shrike",
  "Cattle Egret",
  "Coppersmith Barbet",
  "Indian Spot-billed Duck",
  "Tricolored Munia",
  "Plum-headed Parakeet",
  "Brahminy Starling",
  "Jacobin Cuckoo",
  "Sirkeer Malkoha",
  "Grey Wagtail",
  "Black-headed Ibis",
  "Common Tailorbird",
  "Grey Junglefowl",
  "Black-winged Kite",
  "Yellow-throated Bulbul",
  "Rufous Treepie",
  "Pied Kingfisher",
  "Scaly-breasted Munia",
  "Indian Golden Oriole",
  "Asian Koel",
  "Chestnut-headed Bee-eater",
  "Indian Pond Heron",
  "Greater Coucal",
  "Rose-ringed Parakeet",
  "Common Kestrel",
  "Spot-breasted Fantail",
  "Red-whiskered Bulbul",
  "Black-hooded Oriole",
  "Indian White-eye",
  "Yellow-wattled Lapwing",
  "Grey-headed Swamphen",
  "Indian Pitta",
  "Orange-headed Thrush",
  "Black Eagle",
];
