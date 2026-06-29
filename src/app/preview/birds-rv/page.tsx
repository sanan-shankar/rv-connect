import { BirdAvatar } from "@/components/common/bird-avatar";
import { ARCHETYPE_COUNT } from "@/components/common/bird-avatar-v2";
import { AVATAR_PALETTE } from "@/lib/avatar";

const NAMES = [
  "Hoopoe", "Indian Peafowl", "Spotted Owlet", "Indian Roller", "White-throated Kingfisher",
  "Indian Pitta", "Rose-ringed Parakeet", "Plum-headed Parakeet", "Green Bee-eater",
  "Coppersmith Barbet", "Indian Grey Hornbill", "Sirkeer Malkoha", "Yellow-throated Bulbul",
  "Red-whiskered Bulbul", "Oriental Magpie-Robin", "Indian Robin", "Asian Koel", "Black Drongo",
  "Greater Coucal", "Rufous Treepie", "Black-hooded Oriole", "Baya Weaver", "Purple Sunbird",
  "Brahminy Starling", "Yellow-wattled Lapwing", "Painted Spurfowl",
];

const MEMBERS = [
  "Ananya Rao", "Karthik Menon", "Sanjana Pillai", "Dhruv Varma", "Meera Iyer", "Rohan Das",
  "Aisha Khan", "Vivek Nair", "Tara Joshi", "Imran Sheikh", "Priya Reddy", "Arjun Mehta",
  "Nila Krishnan", "Sahil Gupta", "Diya Patel", "Kabir Singh", "Leela Mani", "Yusuf Ali",
];

export default function BirdsRV() {
  return (
    <div className="min-h-screen bg-[#EFE7D8] p-10 text-[#33302B]">
      <h1 className="font-heading text-2xl tracking-tight">Rishi Valley birds</h1>
      <p className="mt-1 max-w-2xl text-sm opacity-70">
        26 birds recorded at/around Rishi Valley, drawn in the new style and optically centred.
        Each member gets a bird + a per-member disc colour + a left/right pose.
      </p>

      <h2 className="mt-8 font-heading text-lg">The 26 species (at real profile sizes)</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: ARCHETYPE_COUNT }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <BirdAvatar user={{ id: "rv-" + i, name: NAMES[i], avatarSpecies: i }} size="lg" />
            <div className="flex items-end gap-2">
              <BirdAvatar user={{ id: "rv-" + i, name: NAMES[i], avatarSpecies: i }} size="md" />
              <BirdAvatar user={{ id: "rv-" + i, name: NAMES[i], avatarSpecies: i }} size="sm" />
              <BirdAvatar user={{ id: "rv-" + i, name: NAMES[i], avatarSpecies: i }} size="xs" />
            </div>
            <span className="text-[12px] leading-tight opacity-80">
              <span className="opacity-50">#{i}</span> {NAMES[i]}
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-lg">Same bird, different members (disc colour varies)</h2>
      <div className="mt-4 flex flex-col gap-3">
        {[0, 3, 16].map((sp) => (
          <div key={sp} className="flex items-center gap-2">
            <span className="w-28 text-[12px] opacity-70">{NAMES[sp]}</span>
            {AVATAR_PALETTE.map((c) => (
              <BirdAvatar key={c} user={{ id: "v" + sp + c, avatarSpecies: sp, avatarColor: c }} size="sm" />
            ))}
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-lg">Sample members (deterministic from name)</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {MEMBERS.map((n, i) => (
          <div key={i} className="flex w-[160px] items-center gap-2.5">
            <BirdAvatar user={{ id: "seed-" + n, name: n }} size="sm" />
            <span className="truncate text-[13px]">{n}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-lg">Tiny test (28px, inline) — must stay distinct</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: ARCHETYPE_COUNT }).map((_, i) => (
          <BirdAvatar key={i} user={{ id: "tiny-" + i, name: NAMES[i], avatarSpecies: i }} size="xs" />
        ))}
      </div>
    </div>
  );
}
