import { readFileSync } from "fs";
import { join } from "path";
import { ARCHETYPES } from "@/components/common/bird-avatar-v2";
import { AVATAR_PALETTE } from "@/lib/avatar";

export const dynamic = "force-dynamic";

const NAMES = [
  "Hoopoe", "Indian Peafowl", "Spotted Owlet", "Indian Roller", "White-throated Kingfisher",
  "Indian Pitta", "Rose-ringed Parakeet", "Plum-headed Parakeet", "Green Bee-eater",
  "Coppersmith Barbet", "Indian Grey Hornbill", "Sirkeer Malkoha", "Yellow-throated Bulbul",
  "Red-whiskered Bulbul", "Oriental Magpie-Robin", "Indian Robin", "Asian Koel", "Black Drongo",
  "Greater Coucal", "Rufous Treepie", "Black-hooded Oriole", "Baya Weaver", "Purple Sunbird",
  "Brahminy Starling", "Yellow-wattled Lapwing", "Painted Spurfowl",
];

function mix(hex: string, withHex: string, pct: number) {
  const a = hex.replace("#", ""), b = withHex.replace("#", "");
  const ar = parseInt(a.slice(0, 2), 16), ag = parseInt(a.slice(2, 4), 16), ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16), bg = parseInt(b.slice(2, 4), 16), bb = parseInt(b.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * pct), g = Math.round(ag + (bg - ag) * pct), bl = Math.round(ab + (bb - ab) * pct);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function centering(adj?: { x?: number; y?: number; s?: number }) {
  if (!adj) return undefined;
  const s = adj.s ?? 1, x = adj.x ?? 0, y = adj.y ?? 0;
  return `translate(${x} ${y}) translate(50 50) scale(${s}) translate(-50 -50)`;
}

type Mode = "none" | "inset" | "disc";

function Bird({ i, px, mode, adj }: { i: number; px: number; mode: Mode; adj: Record<string, { x?: number; y?: number; s?: number }> }) {
  const a = ARCHETYPES[i];
  const c = centering(adj[a.name]);
  const disc = mix(AVATAR_PALETTE[i % AVATAR_PALETTE.length], "#FBF6EC", 0.18);
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className="block shrink-0">
      {mode !== "none" && <circle cx="50" cy="50" r="50" fill={disc} />}
      {mode === "inset" ? (
        <g transform="translate(50 50) scale(0.66) translate(-50 -50)">
          <g transform={c}>{a.draw()}</g>
        </g>
      ) : (
        <g transform={c}>{a.draw()}</g>
      )}
    </svg>
  );
}

const SURFACES: { label: string; bg: string; fg: string }[] = [
  { label: "cream card", bg: "#FBF8F1", fg: "#33302B" },
  { label: "feed bg", bg: "#EFE7D8", fg: "#33302B" },
  { label: "green sidebar", bg: "#235C49", fg: "#EFE7D8" },
];

export default async function BirdsBg() {
  const adj = JSON.parse(
    readFileSync(join(process.cwd(), "src/components/common/bird-adjust.json"), "utf8"),
  ) as Record<string, { x?: number; y?: number; s?: number }>;

  const sample = [0, 2, 4, 16, 20, 25]; // hoopoe, owlet, kingfisher, koel, oriole, spurfowl

  return (
    <div className="min-h-screen bg-[#EFE7D8] p-10 text-[#33302B]">
      <h1 className="font-heading text-2xl tracking-tight">Bird treatments — background or not</h1>
      <p className="mt-1 max-w-2xl text-sm opacity-70">
        Three ways to show the bird: <b>no background</b> (the daring one), <b>small in circle</b>
        {" "}(clearly sits in a profile), and <b>fills circle</b> (current). Pick the treatment, then
        the birds.
      </p>

      {/* Your hoopoe, big, three ways, on three surfaces */}
      <h2 className="mt-8 font-heading text-lg">Your hoopoe — three ways, on three surfaces</h2>
      <div className="mt-4 flex flex-col gap-3">
        {SURFACES.map((s) => (
          <div key={s.label} className="flex items-center gap-6 rounded-lg p-4" style={{ background: s.bg, color: s.fg }}>
            <span className="w-28 text-xs opacity-70">{s.label}</span>
            {(["none", "inset", "disc"] as Mode[]).map((m) => (
              <div key={m} className="flex flex-col items-center gap-1">
                <Bird i={0} px={96} mode={m} adj={adj} />
                <span className="text-[11px] opacity-60">{m === "none" ? "no bg" : m === "inset" ? "small in circle" : "fills circle"}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Sample birds, three treatments side by side */}
      <h2 className="mt-10 font-heading text-lg">Sample birds — the three treatments (on a cream card)</h2>
      <div className="mt-4 rounded-lg bg-[#FBF8F1] p-5">
        {sample.map((i) => (
          <div key={i} className="flex items-center gap-8 border-b border-black/5 py-2 last:border-0">
            <span className="w-44 text-[12px]">{NAMES[i]}</span>
            {(["none", "inset", "disc"] as Mode[]).map((m) => (
              <Bird key={m} i={i} px={64} mode={m} adj={adj} />
            ))}
          </div>
        ))}
        <div className="mt-2 flex gap-8 pl-44 text-[11px] opacity-50">
          <span className="w-16">no bg</span><span className="w-16">small</span><span>fills</span>
        </div>
      </div>

      {/* ALL 26 — no background */}
      <h2 className="mt-10 font-heading text-lg">All 26 — NO background (the daring option)</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
        {ARCHETYPES.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Bird i={i} px={72} mode="none" adj={adj} />
            <Bird i={i} px={40} mode="none" adj={adj} />
            <Bird i={i} px={28} mode="none" adj={adj} />
            <span className="text-[11px] leading-tight opacity-80"><span className="opacity-50">#{i}</span> {NAMES[i]}</span>
          </div>
        ))}
      </div>

      {/* No background on the GREEN sidebar (dark-bird readability test) */}
      <h2 className="mt-10 font-heading text-lg">No background, on the green sidebar (dark-bird test)</h2>
      <div className="mt-4 flex flex-wrap gap-3 rounded-lg bg-[#235C49] p-5">
        {ARCHETYPES.map((_, i) => (
          <Bird key={i} i={i} px={48} mode="none" adj={adj} />
        ))}
      </div>

      {/* ALL 26 — small in circle */}
      <h2 className="mt-10 font-heading text-lg">All 26 — small in circle (fallback option)</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
        {ARCHETYPES.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Bird i={i} px={64} mode="inset" adj={adj} />
            <Bird i={i} px={40} mode="inset" adj={adj} />
            <span className="text-[11px] leading-tight opacity-80"><span className="opacity-50">#{i}</span> {NAMES[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
