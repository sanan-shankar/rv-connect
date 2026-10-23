/**
 * The order the birds page and the supporters' picker show the birds in (owner, 2026-10-23: "give a
 * much more meaningful order when they click see all birds... the color science of it all, the
 * layouts of it all, tensions, release, light, warm, dark, cool... induce maximum dopamine").
 *
 * The shape, and why (the full reasoning and the orders tried are in
 * docs/planning/birds-expansion/ordering.md):
 * - An overture. The first twelve are the brightest, best-loved birds laid out as one compressed
 *   rainbow, so the first two rows at any width show the whole palette at once.
 * - A journey. The vivid birds then travel the colour wheel again, red to purple, so each scroll
 *   reveals a new colour world and the page reads as designed, not shuffled.
 * - Rests. The black, grey, pale and brown birds are spread evenly between the vivid ones, never
 *   two dark birds together, so they set the colours off instead of pooling into a grey patch.
 * - Look-alikes apart. No two birds of a family (the kingfishers, the bulbuls, the lapwings, the
 *   orioles, the parakeets...) sit side by side or stacked at two, three, four or five columns,
 *   the widths the grid takes from phone to desktop.
 * - A star in every short stretch, and a strong last row.
 *
 * Names are full species names, so redrawing a bird never moves it. A bird added to the set must be
 * placed here too; bird-gallery-order.test.mjs fails until it is.
 */
export const GALLERY_ORDER: readonly string[] = [
  "Red Avadavat",  // the overture: the brightest birds as one compressed rainbow, red to purple
  "Hoopoe",
  "Black-rumped Flameback",
  "Indian Eagle-Owl",
  "Common Iora",
  "Purple-rumped Sunbird",
  "Coppersmith Barbet",
  "Green Bee-eater",
  "Indian Peafowl",
  "Common Kingfisher",
  "Tickell's Blue Flycatcher",
  "Purple Sunbird",
  "Jacobin Cuckoo",  // the journey: red, orange, gold, green, blue, with the quiet birds spread as rests
  "Brahminy Starling",
  "Sirkeer Malkoha",
  "Tricolored Munia",
  "Indian Spot-billed Duck",
  "Small Minivet",
  "Little Cormorant",
  "Yellow-throated Bulbul",
  "Brahminy Kite",
  "Pied Kingfisher",
  "Painted Spurfowl",
  "Red-wattled Lapwing",
  "Orange-headed Thrush",
  "Indian Pond Heron",
  "Common Kestrel",
  "Red-vented Bulbul",
  "Bay-backed Shrike",
  "Asian Paradise Flycatcher",
  "Baya Weaver",
  "Indian Grey Hornbill",
  "Black-hooded Oriole",
  "Black Drongo",
  "Rufous Treepie",
  "Black-crowned Night Heron",
  "White-browed Bulbul",
  "Laughing Dove",
  "Grey Wagtail",
  "Indian Robin",
  "Plum-headed Parakeet",
  "Peregrine Falcon",
  "Blue-faced Malkoha",
  "Little Grebe",
  "Common Tailorbird",
  "Oriental Magpie-Robin",
  "Indian Golden Oriole",
  "Rock Pigeon",
  "Rose-ringed Parakeet",
  "Red-whiskered Bulbul",
  "Indian Pitta",
  "Black Eagle",
  "Indian White-eye",
  "Black-headed Ibis",
  "Jerdon's Leafbird",
  "Grey Junglefowl",
  "Chestnut-headed Bee-eater",
  "Asian Koel",
  "Yellow-footed Green-Pigeon",
  "Scaly-breasted Munia",
  "White-throated Kingfisher",
  "Cattle Egret",
  "Verditer Flycatcher",
  "Greater Coucal",
  "Black-winged Kite",
  "Yellow-wattled Lapwing",
  "Wire-tailed Swallow",
  "Spotted Owlet",
  "Grey-headed Swamphen",
  "Spot-breasted Fantail",
];
