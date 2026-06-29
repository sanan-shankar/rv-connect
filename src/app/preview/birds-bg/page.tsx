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

type Mode = "none" | "outline" | "inset";

function Bird({ i, px, mode, adj, uid }: { i: number; px: number; mode: Mode; adj: Record<string, { x?: number; y?: number; s?: number }>; uid: string }) {
  const a = ARCHETYPES[i];
  const c = centering(adj[a.name]);
  const disc = mix(AVATAR_PALETTE[i % AVATAR_PALETTE.length], "#FBF6EC", 0.18);
  const fid = `stk-${uid}`;
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className="block shrink-0">
      {mode === "outline" && (
        <defs>
          <filter id={fid} x="-30%" y="-30%" width="160%" height="160%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="d" />
            <feGaussianBlur in="d" stdDeviation="1.3" result="shb" />
            <feFlood floodColor="#2A2622" floodOpacity="0.22" result="shc" />
            <feComposite in="shc" in2="shb" operator="in" result="shadow" />
            <feFlood floodColor="#FCFAF4" result="hc" />
            <feComposite in="hc" in2="d" operator="in" result="halo" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      {mode === "inset" && <circle cx="50" cy="50" r="50" fill={disc} />}
      {mode === "inset" ? (
        <g transform="translate(50 50) scale(0.66) translate(-50 -50)">
          <g transform={c}>{a.draw()}</g>
        </g>
      ) : mode === "outline" ? (
        <g filter={`url(#${fid})`}>
          <g transform={c}>{a.draw()}</g>
        </g>
      ) : (
        <g transform={c}>{a.draw()}</g>
      )}
    </svg>
  );
}

const MODE_LABEL: Record<Mode, string> = { none: "no background", outline: "no bg + outline", inset: "small in circle" };
const MODES: Mode[] = ["none", "outline", "inset"];

export default async function BirdsBg() {
  const adj = JSON.parse(
    readFileSync(join(process.cwd(), "src/components/common/bird-adjust.json"), "utf8"),
  ) as Record<string, { x?: number; y?: number; s?: number }>;

  const problem = [2, 4, 14, 8, 16, 25]; // owlet, kingfisher, magpie-robin, bee-eater, koel, spurfowl

  const Section = ({ title, mode, surface }: { title: string; mode: Mode; surface?: string }) => (
    <>
      <h2 className="mt-10 font-heading text-lg">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg p-5 md:grid-cols-3 lg:grid-cols-4"
        style={surface ? { background: surface } : undefined}>
        {ARCHETYPES.map((_, i) => (
          <div key={i} className="flex items-center gap-2" style={surface ? { color: "#EFE7D8" } : undefined}>
            <Bird i={i} px={68} mode={mode} adj={adj} uid={`${mode}-${i}-a`} />
            <Bird i={i} px={40} mode={mode} adj={adj} uid={`${mode}-${i}-b`} />
            <Bird i={i} px={28} mode={mode} adj={adj} uid={`${mode}-${i}-c`} />
            <span className="text-[11px] leading-tight opacity-80"><span className="opacity-50">#{i}</span> {NAMES[i]}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#EFE7D8] p-10 text-[#33302B]">
      <h1 className="font-heading text-2xl tracking-tight">Bird treatments — pick one</h1>
      <p className="mt-1 max-w-2xl text-sm opacity-70">
        Three options to choose from: <b>no background</b>, <b>no bg + thin outline</b> (sticker
        halo so it reads on any surface), and <b>small in circle</b>.
      </p>

      {/* Hoopoe, big, 3 treatments x 3 surfaces */}
      <h2 className="mt-8 font-heading text-lg">Your hoopoe — the three options, on three surfaces</h2>
      <div className="mt-4 flex flex-col gap-3">
        {[
          { label: "cream card", bg: "#FBF8F1" },
          { label: "feed bg", bg: "#EFE7D8" },
          { label: "green sidebar", bg: "#235C49" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-8 rounded-lg p-4" style={{ background: s.bg }}>
            <span className="w-28 text-xs" style={{ color: s.bg === "#235C49" ? "#EFE7D8" : "#33302B" }}>{s.label}</span>
            {MODES.map((m) => (
              <div key={m} className="flex flex-col items-center gap-1">
                <Bird i={0} px={92} mode={m} adj={adj} uid={`hoopoe-${m}-${s.label.replace(/\s/g, "")}`} />
                <span className="text-[11px]" style={{ color: s.bg === "#235C49" ? "#EFE7D8" : "#33302B", opacity: 0.6 }}>{MODE_LABEL[m]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Problem cases: 3 treatments, on cream AND green */}
      <h2 className="mt-10 font-heading text-lg">The tricky birds (pale + green + dark) — 3 options, two surfaces</h2>
      {[
        { label: "on cream card", bg: "#FBF8F1" },
        { label: "on green sidebar", bg: "#235C49" },
      ].map((s) => (
        <div key={s.label} className="mt-3 rounded-lg p-5" style={{ background: s.bg }}>
          <div className="mb-2 text-xs" style={{ color: s.bg === "#235C49" ? "#EFE7D8" : "#33302B", opacity: 0.7 }}>{s.label}</div>
          {problem.map((i) => (
            <div key={i} className="flex items-center gap-10 py-1" style={{ color: s.bg === "#235C49" ? "#EFE7D8" : "#33302B" }}>
              <span className="w-40 text-[12px]">{NAMES[i]}</span>
              {MODES.map((m) => (
                <Bird key={m} i={i} px={60} mode={m} adj={adj} uid={`prob-${i}-${m}-${s.label.replace(/\s/g, "")}`} />
              ))}
            </div>
          ))}
          <div className="mt-1 flex gap-10 pl-40 text-[11px]" style={{ color: s.bg === "#235C49" ? "#EFE7D8" : "#33302B", opacity: 0.5 }}>
            <span className="w-[60px]">no bg</span><span className="w-[60px]">outline</span><span>circle</span>
          </div>
        </div>
      ))}

      <Section title="ALL 26 — option A: no background" mode="none" />
      <Section title="ALL 26 — option B: no bg + thin outline" mode="outline" />
      <Section title="ALL 26 — option C: small in circle" mode="inset" />
    </div>
  );
}
