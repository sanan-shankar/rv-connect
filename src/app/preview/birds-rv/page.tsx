import { BirdAvatar } from "@/components/common/bird-avatar";

/**
 * Public-facing display of the Rishi Valley bird set - one icon per species with its name.
 * These are the deterministic alumni avatars; every member without a photo is one of these birds.
 */
const NAMES = [
  "Hoopoe",
  "Indian Peafowl",
  "Spotted Owlet",
  "Indian Roller",
  "White-throated Kingfisher",
  "Indian Pitta",
  "Rose-ringed Parakeet",
  "Plum-headed Parakeet",
  "Green Bee-eater",
  "Coppersmith Barbet",
  "Indian Grey Hornbill",
  "Sirkeer Malkoha",
  "Yellow-throated Bulbul",
  "Red-whiskered Bulbul",
  "Oriental Magpie-Robin",
  "Indian Robin",
  "Asian Koel",
  "Black Drongo",
  "Greater Coucal",
  "Rufous Treepie",
  "Black-hooded Oriole",
  "Baya Weaver",
  "Purple Sunbird",
  "Brahminy Starling",
  "Yellow-wattled Lapwing",
  "Painted Spurfowl",
  "Asian Paradise Flycatcher",
  "Indian Pond Heron",
  "Little Cormorant",
  "Indian Golden Oriole",
  "Cattle Egret",
  "Verditer Flycatcher",
  "Peregrine Falcon",
  "Orange-headed Thrush",
  "Blue-faced Malkoha",
  "Jacobin Cuckoo",
  "Black Eagle",
  "Red Avadavat",
  "Common Kingfisher",
  "Jerdon's Leafbird",
  "Brahminy Kite",
  "Black-rumped Flameback",
  "Bay-backed Shrike",
  "Purple-rumped Sunbird",
  "Tickell's Blue Flycatcher",
  "Chestnut-headed Bee-eater",
  "Tricolored Munia",
  "Small Minivet",
  "Orange-breasted Green-Pigeon",
  "Indian White-eye",
];

export default function BirdGallery() {
  return (
    <div className="min-h-screen bg-[#EFE7D8] px-6 py-16 text-[#33302B]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="font-heading text-4xl tracking-tight">The Birds of the Valley</h1>
        </header>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {NAMES.map((name, i) => (
            <li key={i} className="flex flex-col items-center text-center">
              <BirdAvatar user={{ id: "gallery-" + i, name, avatarSpecies: i }} size={108} />
              <span className="mt-3 text-[13px] font-medium leading-snug text-[#33302B]/85">
                {name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
