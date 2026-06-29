import { BirdAvatar } from "@/components/common/bird-avatar";

/**
 * PROTOTYPE — new bird direction (not wired into the app yet).
 *
 * Goal: fix the two structural problems with the current mono-white silhouettes —
 *   (1) every bird shares ONE colour, so only shape differentiates them, and shape detail
 *       dies at 28-40px;  (2) the differences were thin pointy beaks/tails/crests that vanish.
 *
 * New formula: each bird has its OWN colours (body / belly / beak), fills ~85% of the disc,
 * and is built from BIG SOFT ROUNDED shapes only — no thin lines, no spikes. Colour carries the
 * difference at small size; one bold rounded signature carries the character.
 */

type Pal = { disc: string; body: string; belly: string; beak: string };
const INK = "#33302B";

function mix(hex: string, withHex: string, pct: number) {
  // simple hex blend; pct = amount of `withHex`
  const a = hex.replace("#", "");
  const b = withHex.replace("#", "");
  const ar = parseInt(a.slice(0, 2), 16);
  const ag = parseInt(a.slice(2, 4), 16);
  const ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16);
  const bg = parseInt(b.slice(2, 4), 16);
  const bb = parseInt(b.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * pct);
  const g = Math.round(ag + (bg - ag) * pct);
  const bl = Math.round(ab + (bb - ab) * pct);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function Eye({ cx, cy, r = 4.6 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx - r * 0.34} cy={cy - r * 0.34} r={r * 0.34} fill="#FFFFFF" />
    </g>
  );
}

type Bird = { name: string; pal: Pal; draw: (p: Pal) => React.ReactNode };

const BIRDS: Bird[] = [
  {
    name: "Bluebird",
    pal: { disc: "#EAE0CF", body: "#4C86C6", belly: "#F3ECDD", beak: "#E6A038" },
    draw: (p) => (
      <g>
        {/* soft tail */}
        <path d="M22 50 Q8 52 10 62 Q20 60 30 58 Z" fill={mix(p.body, "#000", 0.18)} />
        {/* round body */}
        <circle cx="50" cy="54" r="33" fill={p.body} />
        {/* belly */}
        <ellipse cx="56" cy="64" rx="22" ry="19" fill={p.belly} />
        {/* folded wing */}
        <ellipse cx="40" cy="52" rx="16" ry="13" fill={mix(p.body, "#000", 0.16)} transform="rotate(-18 40 52)" />
        {/* soft rounded beak */}
        <path d="M78 50 Q92 55 78 60 Q75 55 78 50 Z" fill={p.beak} />
        <Eye cx={64} cy={46} />
      </g>
    ),
  },
  {
    name: "Robin",
    pal: { disc: "#79A7C6", body: "#7C6E62", belly: "#E06A36", beak: "#E0A93C" },
    draw: (p) => (
      <g>
        <path d="M22 50 Q9 53 12 63 Q21 60 31 58 Z" fill={mix(p.body, "#000", 0.15)} />
        <circle cx="50" cy="54" r="33" fill={p.body} />
        {/* big orange breast */}
        <path d="M50 24 A33 33 0 0 1 70 80 Q50 92 40 78 Q40 50 50 24 Z" fill={p.belly} />
        <ellipse cx="40" cy="50" rx="15" ry="12" fill={mix(p.body, "#000", 0.14)} transform="rotate(-18 40 50)" />
        <path d="M78 48 Q91 53 78 58 Q75 53 78 48 Z" fill={p.beak} />
        <Eye cx={63} cy={44} />
      </g>
    ),
  },
  {
    name: "Owl",
    pal: { disc: "#3D5C77", body: "#B98A52", belly: "#ECDCBC", beak: "#E08A38" },
    draw: (p) => (
      <g>
        {/* rounded ear bumps (not pointy) */}
        <circle cx="32" cy="26" r="11" fill={p.body} />
        <circle cx="68" cy="26" r="11" fill={p.body} />
        {/* big round head/body */}
        <ellipse cx="50" cy="56" rx="33" ry="34" fill={p.body} />
        {/* face/belly heart */}
        <ellipse cx="50" cy="58" rx="24" ry="25" fill={p.belly} />
        {/* big friendly eyes */}
        <Eye cx={39} cy={50} r={8.5} />
        <Eye cx={61} cy={50} r={8.5} />
        {/* soft little beak */}
        <path d="M50 58 Q44 64 50 68 Q56 64 50 58 Z" fill={p.beak} />
      </g>
    ),
  },
  {
    name: "Duck",
    pal: { disc: "#E7DECC", body: "#E5B53E", belly: "#F0D98A", beak: "#E6712F" },
    draw: (p) => (
      <g>
        <path d="M20 58 Q8 56 12 68 Q22 64 32 62 Z" fill={mix(p.body, "#000", 0.16)} />
        {/* body */}
        <ellipse cx="44" cy="62" rx="30" ry="23" fill={p.body} />
        <ellipse cx="42" cy="64" rx="18" ry="13" fill={mix(p.body, "#000", 0.12)} />
        {/* round head */}
        <circle cx="62" cy="42" r="19" fill={p.body} />
        {/* flat rounded bill */}
        <path d="M76 40 Q96 40 96 47 Q96 54 76 52 Q72 46 76 40 Z" fill={p.beak} />
        <Eye cx={66} cy={37} />
      </g>
    ),
  },
  {
    name: "Parrot",
    pal: { disc: "#2E7E5B", body: "#39A86A", belly: "#F2E6A0", beak: "#E7A52F" },
    draw: (p) => (
      <g>
        <path d="M24 54 Q12 60 16 74 Q28 66 34 60 Z" fill={mix(p.body, "#000", 0.18)} />
        {/* rounded crest bump */}
        <circle cx="52" cy="22" r="9" fill={mix(p.body, "#fff", 0.1)} />
        <circle cx="62" cy="26" r="8" fill={mix(p.body, "#fff", 0.1)} />
        <circle cx="50" cy="54" r="32" fill={p.body} />
        <ellipse cx="56" cy="64" rx="19" ry="17" fill={p.belly} />
        <ellipse cx="40" cy="52" rx="15" ry="13" fill={mix(p.body, "#000", 0.16)} transform="rotate(-16 40 52)" />
        {/* rounded hooked beak */}
        <path d="M74 42 Q90 42 88 54 Q84 58 78 56 Q73 56 74 50 Q70 46 74 42 Z" fill={p.beak} />
        <Eye cx={62} cy={42} />
      </g>
    ),
  },
  {
    name: "Toucan",
    pal: { disc: "#3A7C9C", body: "#2C2A30", belly: "#F2ECE0", beak: "#E8843A" },
    draw: (p) => (
      <g>
        <ellipse cx="44" cy="56" rx="29" ry="30" fill={p.body} />
        {/* white face patch */}
        <ellipse cx="52" cy="50" rx="18" ry="17" fill={p.belly} />
        {/* big soft rounded beak */}
        <path d="M58 38 Q96 32 92 56 Q74 54 60 56 Q54 47 58 38 Z" fill={p.beak} />
        <path d="M58 38 Q96 32 92 56 L88 50 Q72 49 60 51 Q56 45 58 38 Z" fill={mix(p.beak, "#000", 0.16)} />
        <Eye cx={54} cy={46} />
      </g>
    ),
  },
  {
    name: "Flamingo",
    pal: { disc: "#86B3CC", body: "#E78FA6", belly: "#F2BACA", beak: "#3A3640" },
    draw: (p) => (
      <g>
        {/* round body */}
        <ellipse cx="42" cy="64" rx="27" ry="22" fill={p.body} />
        <ellipse cx="46" cy="68" rx="16" ry="12" fill={p.belly} />
        {/* thick rounded neck up to a small head */}
        <path d="M50 58 Q72 52 66 30 Q64 18 54 20 Q63 24 60 36 Q56 52 44 60 Z" fill={p.body} />
        <circle cx="58" cy="22" r="9" fill={p.body} />
        {/* soft down-curved beak */}
        <path d="M60 20 Q74 22 70 34 Q66 30 60 30 Q57 24 60 20 Z" fill={p.beak} />
        <Eye cx={56} cy={20} r={3.4} />
      </g>
    ),
  },
  {
    name: "Penguin",
    pal: { disc: "#5C9BC4", body: "#33323B", belly: "#F2ECE0", beak: "#E7A52F" },
    draw: (p) => (
      <g>
        <ellipse cx="50" cy="56" rx="29" ry="33" fill={p.body} />
        {/* flippers */}
        <ellipse cx="22" cy="58" rx="8" ry="18" fill={mix(p.body, "#000", 0.2)} transform="rotate(16 22 58)" />
        <ellipse cx="78" cy="58" rx="8" ry="18" fill={mix(p.body, "#000", 0.2)} transform="rotate(-16 78 58)" />
        {/* white belly */}
        <ellipse cx="50" cy="62" rx="19" ry="27" fill={p.belly} />
        {/* feet */}
        <ellipse cx="40" cy="88" rx="7" ry="4" fill={p.beak} />
        <ellipse cx="60" cy="88" rx="7" ry="4" fill={p.beak} />
        {/* soft beak */}
        <path d="M50 46 Q42 51 50 56 Q58 51 50 46 Z" fill={p.beak} />
        <Eye cx={42} cy={40} r={3.8} />
        <Eye cx={58} cy={40} r={3.8} />
      </g>
    ),
  },
  {
    name: "Cardinal",
    pal: { disc: "#3E6E54", body: "#D2483E", belly: "#DC5A4C", beak: "#E8B53C" },
    draw: (p) => (
      <g>
        <path d="M22 52 Q9 56 13 66 Q23 62 32 60 Z" fill={mix(p.body, "#000", 0.16)} />
        {/* rounded raised crest (soft bump, not a spike) */}
        <path d="M38 28 Q40 8 56 14 Q60 22 54 30 Z" fill={p.body} />
        <circle cx="50" cy="54" r="32" fill={p.body} />
        {/* dark mask */}
        <ellipse cx="62" cy="46" rx="11" ry="9" fill={mix(p.body, "#000", 0.55)} transform="rotate(-8 62 46)" />
        <ellipse cx="40" cy="52" rx="14" ry="12" fill={mix(p.body, "#000", 0.14)} transform="rotate(-16 40 52)" />
        {/* short stout rounded beak */}
        <path d="M76 44 Q90 49 76 54 Q73 49 76 44 Z" fill={p.beak} />
        <Eye cx={63} cy={45} />
      </g>
    ),
  },
  {
    name: "Chickadee",
    pal: { disc: "#E4DAC6", body: "#5BB39A", belly: "#F1ECDE", beak: "#3A3640" },
    draw: (p) => (
      <g>
        <path d="M22 52 Q10 55 13 65 Q23 61 32 59 Z" fill={mix(p.body, "#000", 0.16)} />
        <circle cx="50" cy="54" r="32" fill={p.body} />
        {/* dark rounded cap */}
        <path d="M22 44 Q40 18 72 32 Q58 40 50 42 Q34 44 22 52 Z" fill={mix(p.body, "#000", 0.62)} />
        {/* cheek + belly */}
        <ellipse cx="56" cy="60" rx="20" ry="18" fill={p.belly} />
        <path d="M76 50 Q88 54 76 58 Q73 54 76 50 Z" fill={p.beak} />
        <Eye cx={62} cy={47} r={4} />
      </g>
    ),
  },
];

function V2({ px, b }: { px: number; b: Bird }) {
  const clip = `c-${b.name}-${px}`;
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className="shrink-0">
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill={b.pal.disc} />
      <g clipPath={`url(#${clip})`}>{b.draw(b.pal)}</g>
    </svg>
  );
}

export default function BirdsV2() {
  return (
    <div className="min-h-screen bg-[#EFE7D8] p-10 text-[#33302B]">
      <h1 className="font-heading text-2xl tracking-tight">Bird direction — prototype</h1>
      <p className="mt-1 max-w-2xl text-sm opacity-70">
        New formula: each bird has its own colours, fills the disc, built from big soft rounded
        shapes only (no thin lines, no spikes). Compare the 28px column on the right to the current
        birds at the bottom.
      </p>

      <h2 className="mt-8 font-heading text-lg">New birds — at real profile sizes</h2>
      <div className="mt-4 grid gap-x-8 gap-y-5" style={{ gridTemplateColumns: "120px repeat(4, auto) 1fr" }}>
        <div className="text-xs opacity-50">name</div>
        <div className="text-xs opacity-50">104</div>
        <div className="text-xs opacity-50">64</div>
        <div className="text-xs opacity-50">40</div>
        <div className="text-xs opacity-50">28</div>
        <div />
        {BIRDS.map((b) => (
          <Row key={b.name} b={b} />
        ))}
      </div>

      <h2 className="mt-12 font-heading text-lg">Current birds (for comparison)</h2>
      <div className="mt-4 flex flex-wrap items-end gap-5">
        {[0, 14, 17, 1, 29, 19].map((sp) => (
          <div key={sp} className="flex items-end gap-2">
            <BirdAvatar user={{ id: "cmp" + sp, avatarSpecies: sp, avatarColor: "#3E6E54" }} size="md" />
            <BirdAvatar user={{ id: "cmp" + sp, avatarSpecies: sp, avatarColor: "#3E6E54" }} size="sm" />
            <BirdAvatar user={{ id: "cmp" + sp, avatarSpecies: sp, avatarColor: "#3E6E54" }} size="xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ b }: { b: Bird }) {
  return (
    <>
      <div className="self-center text-sm">{b.name}</div>
      <V2 px={104} b={b} />
      <V2 px={64} b={b} />
      <V2 px={40} b={b} />
      <V2 px={28} b={b} />
      <div />
    </>
  );
}
