import { birdFor, AVATAR_PALETTE } from "@/lib/avatar";
import ADJUST from "@/components/common/bird-adjust.json";

/**
 * Optical-centering corrections, keyed by bird name. Generated/refined by scripts/dev/centroid.mjs (which
 * rasterises each bird, finds its true pixel centroid + bounding box, and writes the scale-about-
 * centre + nudge needed to seat the visual mass at 50,50 with even margins). Hand-edited values
 * are preserved across runs unless re-measured.
 */
const ADJUST_MAP = ADJUST as Record<string, { x?: number; y?: number; s?: number }>;

/**
 * BirdAvatarV2 — the Rishi Valley bird set.
 *
 * 26 birds genuinely recorded at/around Rishi Valley (a dry arid scrub valley in Andhra Pradesh),
 * curated so no two read alike at 28-40px. Each member gets: an archetype, a per-member DISC
 * colour (so the feed never looks repeated), and a left/right pose. The BIRD keeps its true
 * colours (a hoopoe is cinnamon, a roller is turquoise); the disc carries the per-member variation.
 *
 * House style: one bird, big and SOFT and ROUNDED, filling ~85% of the disc. No thin spikes, no
 * hair-thin beaks/tails. Colour does the differentiating at small size; one bold rounded signature
 * gives each its character. Every bird is OPTICALLY centred via `adjust` (measured with
 * scripts/dev/centroid.mjs — geometric centre is not the visual centre).
 *
 * Drawing space is viewBox 0..100, disc centre (50,50) r50; keep visual mass inside r~45.
 * Wired in behind the USE_V2 flag in bird-avatar.tsx.
 */

const INK = "#33302B";
const WHITE = "#F6F1E7";

function mix(hex: string, withHex: string, pct: number) {
  // Expand 3-digit shorthand (#000 -> #000000) so the channel slices below never read past the end
  // and produce NaN (which renders as black).
  const norm = (h: string) => {
    const s = h.replace("#", "");
    return s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  };
  const a = norm(hex);
  const b = norm(withHex);
  const ar = parseInt(a.slice(0, 2), 16),
    ag = parseInt(a.slice(2, 4), 16),
    ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16),
    bg = parseInt(b.slice(2, 4), 16),
    bb = parseInt(b.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * pct);
  const g = Math.round(ag + (bg - ag) * pct);
  const bl = Math.round(ab + (bb - ab) * pct);
  return `#${[r, g, bl].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`;
}

function Eye({ cx, cy, r = 4.4 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx - r * 0.34} cy={cy - r * 0.34} r={r * 0.33} fill="#FFFFFF" />
    </g>
  );
}

/** Soft rounded "petal" beak pointing right from base x=xb. Never a thin spike. */
function beak(xb: number, y: number, len: number, h: number, fill: string) {
  return <path d={`M${xb} ${y - h} Q${xb + len} ${y} ${xb} ${y + h} Q${xb - 2.5} ${y} ${xb} ${y - h} Z`} fill={fill} />;
}

/**
 * `adjust` optically re-centres a bird: x/y nudge (viewBox units) and s scale-about-centre.
 * Values come from the scripts/dev/centroid.mjs harness (adjust.x/y = reported nudge dx/dy; s = ~44/reach
 * when a bird runs too big or too small). This makes the VISUAL mass sit at 50,50.
 */
type Arche = {
  name: string;
  skip: number[];
  draw: () => React.ReactNode;
};

/** Transform that applies a bird's optical-centering adjust (scale about centre, then nudge). */
export function archeTransform(a: Arche): string | undefined {
  const adj = ADJUST_MAP[a.name];
  if (!adj) return undefined;
  const s = adj.s ?? 1;
  const x = adj.x ?? 0;
  const y = adj.y ?? 0;
  return `translate(${x} ${y}) translate(50 50) scale(${s}) translate(-50 -50)`;
}

// Palette index order (AVATAR_PALETTE in lib/avatar.ts):
// 0 leaf  1 blue  2 cinnamon  3 rose  4 sky  5 moss  6 plum  7 honey  8 teal  9 terracotta
const GREENS = [0, 5, 8];
const BLUES = [1, 4, 8];
const WARMS = [2, 7, 9];

const ARCHES: Arche[] = [
  // 0 — COMMON HOOPOE. The standout: cinnamon body, barred wing, big fanned crest. Soft short bill.
  {
    name: "Hoopoe",
    skip: WARMS,
    draw: () => {
      const CIN = "#CE8A4E", CINL = "#DBA06A", BARD = "#2E2A26", BARL = "#F2E7D3";
      return (
        <g>
          {/* crest: tightly-fanned tipped feathers (a crown, not antennae) */}
          {[-33, -19.5, -6.5, 6.5, 19.5, 33].map((d, k) => (
            <g key={k} transform={`rotate(${d} 51 45)`}>
              <path d="M47.5 45 Q46.6 26 51 15 Q55.4 26 54.5 45 Z" fill={CIN} />
              <path d="M51 15 Q55.4 26 54.6 31 Q51 28.5 47.4 31 Q46.6 26 51 15 Z" fill={BARD} />
            </g>
          ))}
          {/* body */}
          <ellipse cx="46" cy="61" rx="25" ry="22" fill={CIN} />
          <ellipse cx="50" cy="67" rx="14" ry="10" fill={CINL} />
          {/* boldly barred wing */}
          <ellipse cx="40" cy="64" rx="18" ry="12" fill={BARD} transform="rotate(-8 40 64)" />
          {[30, 38, 46].map((x, k) => (
            <rect key={k} x={x} y="54" width="3.2" height="20" rx="1.6" fill={BARL} transform="rotate(-8 40 64)" />
          ))}
          {/* head + long soft decurved bill */}
          <circle cx="54" cy="49" r="9.5" fill={CIN} />
          <path d="M62 48 Q77 50 83 58 Q79 53 64 51 Z" fill="#5A5048" />
          <Eye cx={57} cy={47} />
        </g>
      );
    },
  },
  // 1 — INDIAN PEAFOWL. Bright royal-blue round body, iconic triple-dot crest, white eye-crescent.
  {
    name: "Peafowl",
    skip: BLUES,
    draw: () => {
      const BLU = "#2A82C2", BLUD = "#1C6AA6", GRN = "#3C8E72";
      return (
        <g>
          {/* triple-dot crest on slim stalks */}
          {[-16, 0, 16].map((d, k) => (
            <g key={k} transform={`rotate(${d} 50 28)`}>
              <rect x="48.8" y="10" width="2.4" height="18" rx="1.2" fill={BLUD} />
              <circle cx="50" cy="10" r="3" fill={BLU} />
            </g>
          ))}
          {/* round royal-blue body */}
          <circle cx="48" cy="57" r="31" fill={BLU} />
          {/* bronze-green folded wing */}
          <ellipse cx="37" cy="62" rx="15" ry="13" fill={GRN} transform="rotate(-16 37 62)" />
          {/* brighter breast */}
          <ellipse cx="56" cy="64" rx="14" ry="13" fill={mix(BLU, "#fff", 0.14)} />
          {/* white eye-crescent (peacock face mark) */}
          <ellipse cx="62" cy="46" rx="6" ry="3.4" fill={WHITE} />
          {beak(76, 49, 9, 2.6, "#8C8C88")}
          <Eye cx={62} cy={46} />
        </g>
      );
    },
  },
  // 2 — SPOTTED OWLET. Flat round head, two oversized yellow eyes, white-spotted body.
  {
    name: "Owlet",
    skip: [],
    draw: () => {
      const BRN = "#8C7B66", FACE = "#E8DCC4", YEL = "#E6C23C";
      return (
        <g>
          <ellipse cx="50" cy="55" rx="33" ry="34" fill={BRN} />
          {/* white spots on crown/shoulders */}
          {[[34, 30], [50, 25], [66, 30], [28, 44], [72, 44], [40, 22], [60, 22]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="2.6" fill={mix(FACE, "#fff", 0.3)} />
          ))}
          {/* facial disc */}
          <ellipse cx="50" cy="52" rx="26" ry="24" fill={FACE} />
          {/* big eyes */}
          <circle cx="38" cy="49" r="11" fill={YEL} />
          <circle cx="62" cy="49" r="11" fill={YEL} />
          <Eye cx={38} cy={49} r={5.4} />
          <Eye cx={62} cy={49} r={5.4} />
          {/* little beak */}
          <path d="M50 53 Q45 59 50 63 Q55 59 50 53 Z" fill="#C9B48E" />
        </g>
      );
    },
  },
  // 3 — INDIAN ROLLER. Cinnamon breast + bold turquoise/cobalt wing bands. Chunky big head.
  {
    name: "Roller",
    skip: BLUES,
    draw: () => {
      const CIN = "#C07A48", TURQ = "#28A6A8", COB = "#2E5FB0", SKY = "#5FB3D8";
      return (
        <g>
          {/* cinnamon body */}
          <circle cx="50" cy="54" r="33" fill={CIN} />
          {/* turquoise crown + belly */}
          <path d="M50 21 A33 33 0 0 1 50 87 Q72 70 72 54 Q72 34 50 21 Z" fill={TURQ} />
          {/* cobalt + sky wing bands */}
          <ellipse cx="40" cy="58" rx="18" ry="13" fill={COB} transform="rotate(-16 40 58)" />
          <ellipse cx="35" cy="64" rx="12" ry="7" fill={SKY} transform="rotate(-16 35 64)" />
          {beak(78, 50, 12, 3.2, "#3A352E")}
          <Eye cx={62} cy={45} />
        </g>
      );
    },
  },
  // 4 — WHITE-THROATED KINGFISHER. Turquoise back, chocolate head, white bib, big coral bill.
  {
    name: "Kingfisher",
    skip: BLUES,
    draw: () => {
      const TURQ = "#1F9FB2", CHOC = "#6B4A33", RED = "#E0533B";
      return (
        <g>
          {/* turquoise back/body */}
          <circle cx="46" cy="56" r="32" fill={TURQ} />
          {/* chocolate head + lower belly */}
          <circle cx="56" cy="42" r="18" fill={CHOC} />
          <path d="M30 70 Q46 86 66 76 Q56 64 40 64 Z" fill={CHOC} />
          {/* white bib */}
          <ellipse cx="48" cy="58" rx="14" ry="13" fill={WHITE} />
          {/* big coral bill (thick) */}
          <path d="M70 38 Q92 41 92 47 Q92 53 70 50 Q66 44 70 38 Z" fill={RED} />
          <Eye cx={60} cy={40} />
        </g>
      );
    },
  },
  // 5 — INDIAN PITTA. The walking rainbow: green back, buff under, scarlet vent, azure wing.
  {
    name: "Pitta",
    skip: [],
    draw: () => {
      const GRN = "#4FA05E", BUFF = "#E3C88E", RED = "#D5483B", AZ = "#3E78C0";
      return (
        <g>
          {/* green back/head */}
          <circle cx="50" cy="52" r="33" fill={GRN} />
          {/* buff underparts */}
          <ellipse cx="52" cy="62" rx="24" ry="22" fill={BUFF} />
          {/* azure wing patch */}
          <ellipse cx="38" cy="52" rx="13" ry="12" fill={AZ} transform="rotate(-14 38 52)" />
          {/* scarlet vent low */}
          <path d="M52 78 Q66 82 70 70 Q60 70 52 72 Z" fill={RED} />
          {/* head stripe */}
          <path d="M40 36 Q56 30 70 38 L70 44 Q56 38 42 44 Z" fill={INK} />
          {beak(76, 50, 11, 3, "#C9B48E")}
          <Eye cx={62} cy={44} />
        </g>
      );
    },
  },
  // 6 — ROSE-RINGED PARAKEET. Grass-green, fat hooked coral bill, rose neck-ring.
  {
    name: "Parakeet",
    skip: GREENS,
    draw: () => {
      const GRN = "#48AC46", RED = "#E0533B", ROSE = "#D98AA0";
      return (
        <g>
          <circle cx="49" cy="55" r="33" fill={GRN} />
          <ellipse cx="55" cy="64" rx="18" ry="16" fill={mix(GRN, "#fff", 0.16)} />
          <ellipse cx="38" cy="54" rx="14" ry="12" fill={mix(GRN, "#000", 0.1)} transform="rotate(-16 38 54)" />
          {/* rose neck ring */}
          <path d="M56 60 Q44 66 40 56" stroke={ROSE} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          {/* hooked red beak (clean, reads as a bill not lips) */}
          <path d="M67 41 Q83 41 82 51 Q79 55 74 53 Q70 51 71 47 Q67 44 67 41 Z" fill={RED} />
          <Eye cx={60} cy={43} />
        </g>
      );
    },
  },
  // 7 — PLUM-HEADED PARAKEET. Lime body, solid plum-purple head.
  {
    name: "Plum Parakeet",
    skip: GREENS,
    draw: () => {
      const GRN = "#6FB84A", PLUM = "#9D4FA6", YEL = "#E0A040";
      return (
        <g>
          <circle cx="49" cy="56" r="32" fill={GRN} />
          <ellipse cx="38" cy="56" rx="13" ry="11" fill={mix(GRN, "#000", 0.1)} transform="rotate(-16 38 56)" />
          {/* plum-purple head */}
          <circle cx="55" cy="43" r="17" fill={PLUM} />
          <ellipse cx="50" cy="38" rx="9" ry="7" fill={mix(PLUM, "#fff", 0.14)} opacity="0.8" />
          {/* black neck collar */}
          <path d="M44 56 Q56 60 66 54" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.55" />
          {/* hooked coral beak */}
          <path d="M68 42 Q83 42 82 51 Q79 55 74 53 Q71 51 72 47 Q68 45 68 42 Z" fill={YEL} />
          <Eye cx={60} cy={42} />
        </g>
      );
    },
  },
  // 8 — GREEN BEE-EATER. Emerald ball, rufous crown, turquoise throat, black eye-mask.
  {
    name: "Bee-eater",
    skip: GREENS,
    draw: () => {
      const GRN = "#2FA869", RUF = "#C68A4A", TURQ = "#3FB6C2";
      return (
        <g>
          <circle cx="49" cy="55" r="32" fill={GRN} />
          {/* rufous crown */}
          <path d="M24 44 Q42 22 70 34 Q54 40 44 44 Q34 46 24 50 Z" fill={RUF} />
          {/* turquoise throat */}
          <ellipse cx="56" cy="60" rx="15" ry="13" fill={TURQ} />
          {/* black eye-mask */}
          <path d="M44 44 Q58 40 72 46 L72 50 Q58 46 46 50 Z" fill={INK} />
          {beak(76, 49, 12, 2.6, "#2E2A26")}
          <Eye cx={62} cy={45} />
        </g>
      );
    },
  },
  // 9 — COPPERSMITH BARBET. Spherical green body, crimson-and-yellow patterned face.
  {
    name: "Barbet",
    skip: GREENS,
    draw: () => {
      const GRN = "#5BB04A", RED = "#D2483E", YEL = "#E6C23C";
      return (
        <g>
          <circle cx="50" cy="55" r="34" fill={GRN} />
          {/* yellow eye-patches */}
          <ellipse cx="52" cy="48" rx="20" ry="13" fill={YEL} />
          {/* crimson forehead + breast band */}
          <path d="M40 36 Q56 30 70 38 Q58 40 50 40 Q44 40 40 42 Z" fill={RED} />
          <path d="M34 62 Q52 70 70 62 L70 67 Q52 74 34 67 Z" fill={RED} />
          {beak(78, 49, 9, 3.2, "#3A352E")}
          <Eye cx={60} cy={47} />
        </g>
      );
    },
  },
  // 10 — INDIAN GREY HORNBILL. Grey body dominated by a huge curved banana bill + casque.
  {
    name: "Hornbill",
    skip: [],
    draw: () => {
      const GREY = "#8E8A82", HORN = "#CDBBA0", CASQ = "#6E6256";
      return (
        <g>
          {/* body back-weighted */}
          <circle cx="42" cy="56" r="30" fill={GREY} />
          <ellipse cx="46" cy="64" rx="16" ry="13" fill={mix(GREY, "#fff", 0.18)} />
          {/* head */}
          <circle cx="56" cy="42" r="15" fill={GREY} />
          {/* huge down-curved bill */}
          <path d="M60 36 Q92 34 86 52 Q80 58 66 56 Q60 50 60 44 Z" fill={HORN} />
          {/* casque ridge */}
          <path d="M60 34 Q84 31 84 40 Q72 37 62 40 Z" fill={CASQ} />
          <Eye cx={58} cy={41} />
        </g>
      );
    },
  },
  // 11 — SIRKEER MALKOHA. Olive-brown plump body, candy red-and-yellow stout down-bill.
  {
    name: "Malkoha",
    skip: WARMS,
    draw: () => {
      const OLV = "#8A7E5C", RED = "#D2483E", YGRN = "#C7C24A";
      return (
        <g>
          <circle cx="44" cy="56" r="31" fill={OLV} />
          <ellipse cx="48" cy="64" rx="16" ry="12" fill={mix(OLV, "#fff", 0.14)} />
          <circle cx="56" cy="44" r="15" fill={mix(OLV, "#fff", 0.06)} />
          {/* stout slightly-curved bill: red base, yellow-green tip */}
          <path d="M62 39 Q84 39 82 52 Q76 56 66 54 Q62 47 62 39 Z" fill={RED} />
          <path d="M75 43 Q84 43 82 51 Q78 53 73 51 Z" fill={YGRN} />
          <Eye cx={58} cy={43} />
        </g>
      );
    },
  },
  // 12 — YELLOW-THROATED BULBUL (RV specialty). Olive-grey body, glowing sulphur face, soft crest.
  {
    name: "Y-T Bulbul",
    skip: [],
    draw: () => {
      const OLV = "#9A9A7E", YEL = "#DCC53E";
      return (
        <g>
          {/* soft rounded crest */}
          <path d="M46 28 Q50 14 60 20 Q57 26 56 32 Z" fill={OLV} />
          <circle cx="49" cy="55" r="32" fill={OLV} />
          {/* yellow face + throat */}
          <path d="M52 36 Q74 42 70 64 Q60 56 52 56 Q46 50 52 36 Z" fill={YEL} />
          {/* yellow vent */}
          <path d="M34 70 Q44 76 52 70 Q44 66 36 66 Z" fill={mix(YEL, "#9A9A7E", 0.2)} />
          {beak(74, 50, 8, 2.6, "#3A352E")}
          <Eye cx={60} cy={47} />
        </g>
      );
    },
  },
  // 13 — RED-WHISKERED BULBUL. Tall (soft) black crest, white-and-red cheek, brown back, red vent.
  {
    name: "R-W Bulbul",
    skip: [],
    draw: () => {
      const BRN = "#7C6A55", RED = "#D2483E";
      return (
        <g>
          {/* tall soft crest */}
          <path d="M50 30 Q50 10 60 14 Q56 20 58 32 Z" fill={INK} />
          <circle cx="49" cy="56" r="31" fill={BRN} />
          {/* white underparts */}
          <ellipse cx="54" cy="64" rx="19" ry="17" fill={WHITE} />
          {/* black head cap + white cheek */}
          <path d="M40 40 Q56 30 70 40 Q56 38 48 42 Z" fill={INK} />
          <circle cx="60" cy="48" r="6.5" fill={WHITE} />
          {/* red whisker */}
          <circle cx="62" cy="52" r="2.8" fill={RED} />
          {/* red vent */}
          <path d="M34 70 Q44 76 52 70 Q44 66 36 66 Z" fill={RED} />
          {beak(74, 49, 8, 2.6, "#2E2A26")}
          <Eye cx={59} cy={46} />
        </g>
      );
    },
  },
  // 14 — ORIENTAL MAGPIE-ROBIN. Clean black-and-white pied, cocked tail.
  {
    name: "Magpie-Robin",
    skip: [],
    draw: () => {
      const BLK = "#2E2A2C";
      return (
        <g>
          {/* cocked tail */}
          <path d="M24 50 Q12 44 12 30 Q22 40 30 46 Z" fill={BLK} />
          <ellipse cx="50" cy="55" rx="29" ry="31" fill={BLK} />
          {/* white belly */}
          <path d="M50 40 Q74 44 72 76 Q58 86 46 78 Q44 56 50 40 Z" fill={WHITE} />
          {/* white wing bar */}
          <ellipse cx="38" cy="58" rx="6" ry="13" fill={WHITE} transform="rotate(-12 38 58)" />
          {beak(72, 46, 10, 2.8, "#2E2A26")}
          <Eye cx={58} cy={40} />
        </g>
      );
    },
  },
  // 15 — INDIAN ROBIN. Glossy blue-black upright body, chestnut vent, white shoulder.
  {
    name: "Indian Robin",
    skip: [],
    draw: () => {
      const BLK = "#2C2A30", CHES = "#B5572E";
      return (
        <g>
          {/* cocked tail */}
          <path d="M26 48 Q14 42 14 28 Q24 38 32 44 Z" fill={BLK} />
          <ellipse cx="50" cy="54" rx="27" ry="31" fill={BLK} />
          {/* chestnut vent low-rear */}
          <path d="M30 72 Q42 82 52 74 Q42 70 32 70 Z" fill={CHES} />
          {/* white shoulder flash */}
          <ellipse cx="40" cy="52" rx="6" ry="8" fill={WHITE} transform="rotate(-18 40 52)" />
          {beak(72, 44, 10, 2.6, "#2E2A26")}
          <Eye cx={58} cy={40} />
        </g>
      );
    },
  },
  // 16 — ASIAN KOEL. Glossy black body, staring crimson eye, pale-green bill.
  {
    name: "Koel",
    skip: [],
    draw: () => {
      const BLK = "#2A2730", RED = "#D2433A", BILL = "#A7B36A";
      return (
        <g>
          <ellipse cx="48" cy="55" rx="30" ry="31" fill={BLK} />
          <ellipse cx="40" cy="58" rx="14" ry="18" fill={mix(BLK, "#3A5A8A", 0.18)} transform="rotate(-14 40 58)" />
          {beak(72, 46, 12, 3, BILL)}
          {/* crimson eye (focal) */}
          <circle cx="58" cy="43" r="5.2" fill={RED} />
          <circle cx="58" cy="43" r="2.4" fill={INK} />
          <circle cx="56.6" cy="41.6" r="1.4" fill="#fff" />
        </g>
      );
    },
  },
  // 17 — BLACK DRONGO. Slim glossy-black body, soft forked tail-notch.
  {
    name: "Drongo",
    skip: [],
    draw: () => {
      const BLK = "#2A2730";
      return (
        <g>
          {/* soft forked tail */}
          <path d="M26 50 Q12 46 8 34 Q16 44 24 47 Q14 56 10 64 Q22 56 28 53 Z" fill={BLK} />
          <ellipse cx="52" cy="53" rx="27" ry="26" fill={BLK} />
          <ellipse cx="46" cy="56" rx="16" ry="16" fill={mix(BLK, "#3A5A8A", 0.12)} />
          {beak(74, 46, 11, 2.8, "#23202A")}
          <Eye cx={60} cy={42} r={3.8} />
          <circle cx="61.6" cy="42.4" r="1.2" fill="#7A3A33" />
        </g>
      );
    },
  },
  // 18 — GREATER COUCAL. Heavy black body, rich chestnut wings, crimson eye.
  {
    name: "Coucal",
    skip: WARMS,
    draw: () => {
      const BLK = "#2A2730", CHES = "#A85A2E", RED = "#D2433A";
      return (
        <g>
          {/* black body + head (right) */}
          <circle cx="50" cy="55" r="32" fill={BLK} />
          {/* big chestnut wing on the back/left so the black is never a featureless void */}
          <path d="M50 25 Q19 29 19 59 Q21 80 45 81 Q57 60 53 39 Q51 30 50 25 Z" fill={CHES} />
          <ellipse cx="32" cy="60" rx="9" ry="15" fill={mix(CHES, "#000", 0.16)} transform="rotate(8 32 60)" />
          {beak(74, 46, 12, 3.4, "#23202A")}
          <circle cx="58" cy="43" r="4.8" fill={RED} />
          <circle cx="58" cy="43" r="2.2" fill={INK} />
        </g>
      );
    },
  },
  // 19 — RUFOUS TREEPIE. Warm rufous body under a sooty-grey hood, pale-grey wing panel.
  {
    name: "Treepie",
    skip: WARMS,
    draw: () => {
      const RUF = "#C07A45", HOOD = "#5A554E", PG = "#C9C2B4";
      return (
        <g>
          <circle cx="49" cy="56" r="32" fill={RUF} />
          {/* grey hood */}
          <path d="M30 42 Q50 24 70 42 Q58 40 50 40 Q40 40 30 46 Z" fill={HOOD} />
          <circle cx="56" cy="40" r="14" fill={HOOD} />
          {/* pale grey wing panel */}
          <ellipse cx="38" cy="60" rx="9" ry="15" fill={PG} transform="rotate(-14 38 60)" />
          {beak(72, 44, 11, 3.2, "#3A352E")}
          <Eye cx={60} cy={40} />
        </g>
      );
    },
  },
  // 20 — BLACK-HOODED ORIOLE. Glowing golden-yellow body, jet-black hood, pink-red bill.
  {
    name: "Oriole",
    skip: [7],
    draw: () => {
      const YEL = "#E6B52E", BLK = "#2E2A26", PINK = "#D06A6A";
      return (
        <g>
          <circle cx="49" cy="55" r="33" fill={YEL} />
          {/* black hood */}
          <circle cx="55" cy="42" r="17" fill={BLK} />
          <path d="M38 40 Q52 32 66 40 Q52 40 44 44 Z" fill={BLK} />
          {/* black wing edge */}
          <path d="M30 64 Q40 78 54 80 Q44 66 40 58 Z" fill={BLK} />
          <path d="M70 40 Q84 41 82 49 Q78 53 71 51 Q68 46 70 40 Z" fill={PINK} />
          <Eye cx={60} cy={41} />
        </g>
      );
    },
  },
  // 21 — BAYA WEAVER. Golden-yellow cap over a streaky warm-brown body, stout conical bill.
  {
    name: "Weaver",
    skip: WARMS,
    draw: () => {
      const BRN = "#9A7E54", YEL = "#E0B23C", MASK = "#5A4A36";
      return (
        <g>
          <circle cx="49" cy="56" r="32" fill={BRN} />
          {/* streaks */}
          {[36, 46, 56].map((y, k) => (
            <path key={k} d={`M28 ${y} Q48 ${y + 4} 68 ${y}`} stroke={mix(BRN, "#000", 0.22)} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          ))}
          {/* golden cap + breast */}
          <path d="M32 40 Q50 24 70 38 Q52 40 44 42 Q38 42 32 46 Z" fill={YEL} />
          <ellipse cx="56" cy="60" rx="14" ry="12" fill={YEL} />
          {/* dark face mask */}
          <ellipse cx="58" cy="48" rx="9" ry="8" fill={MASK} />
          {/* stout conical bill */}
          <path d="M70 46 L86 50 L70 56 Z" fill="#D9CBA6" />
          <Eye cx={59} cy={47} />
        </g>
      );
    },
  },
  // 22 — PURPLE SUNBIRD. Tiny all-over iridescent purple jewel, short decurved bill.
  {
    name: "Sunbird",
    skip: [6],
    draw: () => {
      const PUR = "#5A3E7A", SHEEN = "#7E5AA0", TEAL = "#3E6E7A";
      return (
        <g>
          <circle cx="49" cy="55" r="31" fill={PUR} />
          {/* violet sheen highlight */}
          <ellipse cx="44" cy="48" rx="16" ry="14" fill={SHEEN} opacity="0.8" />
          <ellipse cx="58" cy="64" rx="12" ry="10" fill={TEAL} opacity="0.5" />
          {/* short decurved bill */}
          <path d="M68 44 Q82 46 80 56 Q76 52 70 51 Q66 47 68 44 Z" fill="#2A2730" />
          <Eye cx={60} cy={45} r={3.8} />
        </g>
      );
    },
  },
  // 23 — BRAHMINY STARLING. Peachy body, grey wings, shaggy black punk crest, yellow-blue bill.
  {
    name: "Starling",
    skip: WARMS,
    draw: () => {
      const PEACH = "#E0A86A", GREY = "#9A968C", YEL = "#D9B23C", BLU = "#6E7E8A";
      return (
        <g>
          {/* shaggy crest */}
          <path d="M40 30 Q44 12 54 16 Q50 22 52 32 Z" fill={INK} />
          <path d="M50 30 Q52 12 62 18 Q56 24 60 32 Z" fill={INK} />
          <circle cx="49" cy="56" r="32" fill={PEACH} />
          {/* grey wing */}
          <path d="M28 56 Q34 80 54 82 Q44 64 40 52 Z" fill={GREY} />
          {/* black cap */}
          <path d="M38 40 Q54 30 66 40 Q54 38 46 42 Z" fill={INK} />
          {/* bill: blue base, yellow tip */}
          <path d="M68 44 L84 48 L68 53 Z" fill={YEL} />
          <path d="M68 44 L75 46 L68 53 Z" fill={BLU} />
          <Eye cx={59} cy={45} />
        </g>
      );
    },
  },
  // 24 — YELLOW-WATTLED LAPWING. Sandy body, crisp black cap, lemon-yellow facial wattle. Stubby legs.
  {
    name: "Lapwing",
    skip: WARMS,
    draw: () => {
      const SAND = "#C2A87A", PALE = "#EAE0CC", BLK = "#2E2A26", YEL = "#E2C23C";
      return (
        <g>
          <circle cx="49" cy="53" r="31" fill={SAND} />
          <ellipse cx="52" cy="62" rx="20" ry="17" fill={PALE} />
          {/* black cap */}
          <path d="M34 38 Q52 24 70 38 Q52 40 44 42 Q38 40 34 44 Z" fill={BLK} />
          <circle cx="55" cy="38" r="12" fill={BLK} />
          {/* yellow wattle/lores */}
          <ellipse cx="64" cy="44" rx="5" ry="6.5" fill={YEL} />
          {/* stubby legs */}
          <rect x="44" y="80" width="3" height="7" rx="1.5" fill={YEL} />
          <rect x="54" y="80" width="3" height="7" rx="1.5" fill={YEL} />
          {beak(72, 44, 8, 2.4, "#2E2A26")}
          <Eye cx={60} cy={40} />
        </g>
      );
    },
  },
  // 25 — PAINTED SPURFOWL. Dumpy round gamebird, dark chestnut with white moon-spots, red face.
  {
    name: "Spurfowl",
    skip: WARMS,
    draw: () => {
      const CHES = "#7A4632", RED = "#D2483E", SPOT = "#EFE7D6";
      return (
        <g>
          <ellipse cx="48" cy="57" rx="33" ry="30" fill={CHES} />
          {/* moon spots */}
          {[[38, 48], [52, 44], [64, 52], [34, 62], [50, 64], [64, 66], [44, 74], [58, 76], [70, 60]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="2.8" fill={SPOT} />
          ))}
          {/* red face patch */}
          <ellipse cx="60" cy="44" rx="11" ry="9" fill={RED} />
          {/* stubby red legs */}
          <rect x="42" y="82" width="3" height="6" rx="1.5" fill={RED} />
          <rect x="52" y="82" width="3" height="6" rx="1.5" fill={RED} />
          {beak(74, 44, 8, 2.6, "#C9B48E")}
          <Eye cx={62} cy={42} />
        </g>
      );
    },
  },
  // 26 — ASIAN PARADISE FLYCATCHER (rufous morph). Glossy blue-black crested head, rufous body,
  // powder-blue eye-ring + bill (its ribbon tail is cropped to a soft nub).
  {
    name: "Paradise Flycatcher",
    skip: WARMS,
    draw: () => {
      const RUF = "#C07A50", BLK = "#2C2A33", BLU = "#83B6CA";
      return (
        <g>
          {/* soft tail nub */}
          <path d="M22 54 Q10 58 13 68 Q23 61 31 59 Z" fill={RUF} />
          <circle cx="48" cy="57" r="30" fill={RUF} />
          {/* crested blue-black head */}
          <path d="M48 30 Q50 16 60 21 Q54 26 56 34 Z" fill={BLK} />
          <circle cx="56" cy="42" r="15" fill={BLK} />
          {/* powder-blue eye-ring + bill */}
          <circle cx="59" cy="41" r="5.6" fill={BLU} />
          <Eye cx={59} cy={41} r={3.3} />
          <path d="M70 42 Q83 43 82 50 Q78 49 71 48 Q68 45 70 42 Z" fill={BLU} />
        </g>
      );
    },
  },
  // 27 — INDIAN POND HERON. Hunched buff body, white belly/wing, streaky crown, soft dagger bill.
  {
    name: "Pond Heron",
    skip: WARMS,
    draw: () => {
      const BUFF = "#B49A6E", WHT = "#EDEADF", CROWN = "#8A7450", BILL = "#C7B074";
      return (
        <g>
          {/* white underparts */}
          <ellipse cx="46" cy="64" rx="22" ry="17" fill={WHT} />
          {/* hunched buff body */}
          <path d="M22 60 Q24 40 44 38 Q66 38 70 58 Q70 80 46 81 Q24 80 22 60 Z" fill={BUFF} />
          {/* streaky neck */}
          {[52, 60].map((y, k) => (
            <path key={k} d={`M34 ${y} Q46 ${y + 3} 58 ${y}`} stroke={mix(BUFF, "#000", 0.2)} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" />
          ))}
          <circle cx="58" cy="44" r="13" fill={BUFF} />
          {/* darker crown */}
          <path d="M48 40 Q58 31 70 40 Q58 38 50 43 Z" fill={CROWN} />
          {/* soft dagger bill with dark tip */}
          <path d="M70 44 Q86 46 89 52 Q83 49 71 49 Z" fill={BILL} />
          <path d="M82 47.5 Q89 50 89 52 Q84 50.5 80 49.5 Z" fill="#5A5040" />
          <Eye cx={61} cy={43} />
        </g>
      );
    },
  },
  // 28 — LITTLE CORMORANT. Dark glossy waterbird, raised snaky neck, hooked bill, blue-green eye.
  {
    name: "Cormorant",
    skip: [],
    draw: () => {
      const BLK = "#2A2A30", BILL = "#8C8C84", EYE = "#3FA88A";
      return (
        <g>
          <ellipse cx="45" cy="60" rx="29" ry="26" fill={BLK} />
          <ellipse cx="41" cy="62" rx="15" ry="15" fill={mix(BLK, "#2E6E50", 0.16)} />
          {/* raised neck + small head */}
          <path d="M52 58 Q61 44 59 33 Q58 27 50 29 Q56 33 54 44 Q52 53 44 59 Z" fill={BLK} />
          <circle cx="56" cy="31" r="9" fill={BLK} />
          {/* hooked grey bill */}
          <path d="M62 29 Q77 29 77 37 Q73 40 67 38 Q64 33 62 29 Z" fill={BILL} />
          {/* blue-green eye */}
          <circle cx="57" cy="30" r="3.6" fill={EYE} />
          <circle cx="57" cy="30" r="1.7" fill={INK} />
        </g>
      );
    },
  },
  // 29 — INDIAN GOLDEN ORIOLE. Glowing golden-yellow body, black eye-stripe (not a hood), black
  // wing, pink-red bill. (Distinct from the full-hooded Black-hooded Oriole.)
  {
    name: "Golden Oriole",
    skip: [7],
    draw: () => {
      const YEL = "#E8B82E", BLK = "#2E2A26", PINK = "#D06A6A";
      return (
        <g>
          <circle cx="49" cy="55" r="33" fill={YEL} />
          {/* black wing edge */}
          <path d="M28 50 Q34 77 55 81 Q42 62 38 47 Z" fill={BLK} />
          {/* black eye-stripe through the eye */}
          <path d="M50 39 Q63 37 73 42 L73 47 Q63 43 52 46 Z" fill={BLK} />
          {/* pink-red bill */}
          <path d="M71 42 Q84 43 83 51 Q79 55 72 53 Q69 47 71 42 Z" fill={PINK} />
          <Eye cx={62} cy={43} />
        </g>
      );
    },
  },
  // 30 — CATTLE EGRET (breeding). Cool-white body, buff crown/breast plumes, yellow dagger bill.
  {
    name: "Cattle Egret",
    skip: [],
    draw: () => {
      const WHT = "#EFF1EA", SHADE = "#DBDDD2", BUFF = "#D9A85A", BILL = "#E0B23C", LEG = "#7A6E58";
      return (
        <g>
          {/* stubby legs */}
          <rect x="42" y="80" width="3" height="8" rx="1.5" fill={LEG} />
          <rect x="52" y="80" width="3" height="8" rx="1.5" fill={LEG} />
          <ellipse cx="46" cy="58" rx="29" ry="26" fill={WHT} />
          {/* soft grey wing shading so the white body holds form */}
          <ellipse cx="35" cy="62" rx="14" ry="16" fill={SHADE} transform="rotate(-12 35 62)" />
          {/* buff breast + crown plumes */}
          <ellipse cx="50" cy="64" rx="13" ry="10" fill={mix(BUFF, "#fff", 0.32)} />
          <path d="M44 38 Q56 31 66 40 Q56 39 50 43 Q46 42 44 45 Z" fill={BUFF} />
          <circle cx="58" cy="45" r="12" fill={WHT} />
          <path d="M52 41 Q60 36 67 41 Q59 40 54 44 Z" fill={BUFF} />
          {/* yellow dagger bill */}
          <path d="M68 45 Q84 46 87 51 Q82 49 70 49.5 Z" fill={BILL} />
          <Eye cx={61} cy={44} />
        </g>
      );
    },
  },
  // 31 — VERDITER FLYCATCHER. Uniform bright verditer (aqua) body, black lores, small dark bill.
  {
    name: "Verditer Flycatcher",
    skip: BLUES,
    draw: () => {
      const VERD = "#46A9BE", DARK = "#2E2A30";
      return (
        <g>
          <circle cx="49" cy="55" r="32" fill={VERD} />
          <ellipse cx="38" cy="58" rx="14" ry="14" fill={mix(VERD, "#000", 0.16)} transform="rotate(-14 38 58)" />
          {/* black lores */}
          <ellipse cx="64" cy="46" rx="6" ry="4.6" fill={DARK} />
          {beak(74, 48, 9, 2.6, DARK)}
          <Eye cx={60} cy={44} />
        </g>
      );
    },
  },
  // 32 — PEREGRINE FALCON. Slate back, pale barred belly, dark hood + black moustache, hooked beak.
  {
    name: "Peregrine Falcon",
    skip: [],
    draw: () => {
      const SLATE = "#5C6E7E", HOOD = "#3E4A57", PALE = "#E6E2D6", BAR = "#9AA0A0", CERE = "#E0B23C", BEAK = "#5A5A60";
      return (
        <g>
          <circle cx="49" cy="55" r="32" fill={SLATE} />
          {/* pale barred belly */}
          <path d="M50 40 Q72 44 70 78 Q56 84 46 78 Q44 56 50 40 Z" fill={PALE} />
          {[58, 66, 74].map((y, k) => (
            <path key={k} d={`M48 ${y} Q60 ${y + 3} 68 ${y}`} stroke={BAR} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          ))}
          {/* dark hooded head + white cheek */}
          <circle cx="56" cy="42" r="15" fill={HOOD} />
          <circle cx="61" cy="46" r="6" fill={PALE} />
          {/* black moustache */}
          <path d="M59 46 Q61 54 57 59 Q55 52 57 46 Z" fill="#2E343C" />
          {/* hooked beak with yellow cere */}
          <path d="M68 42 Q80 42 80 49 Q76 47 70 48 Q67 45 68 42 Z" fill={CERE} />
          <path d="M74 44 Q82 44 80 50 Q77 49 74 48 Z" fill={BEAK} />
          <Eye cx={57} cy={42} r={3.8} />
        </g>
      );
    },
  },
  // 33 — ORANGE-HEADED THRUSH. Glowing orange head + underparts, blue-grey back and wing.
  {
    name: "Orange-headed Thrush",
    skip: WARMS,
    draw: () => {
      const ORG = "#D98A3E", GREY = "#6E7A86";
      return (
        <g>
          <circle cx="49" cy="55" r="32" fill={GREY} />
          {/* orange head + front */}
          <path d="M50 40 Q72 44 70 78 Q56 84 46 78 Q44 56 50 40 Z" fill={ORG} />
          <circle cx="57" cy="42" r="15" fill={ORG} />
          {/* grey wing */}
          <ellipse cx="36" cy="58" rx="13" ry="16" fill={mix(GREY, "#000", 0.14)} transform="rotate(-12 36 58)" />
          {beak(72, 44, 11, 2.8, "#C9B48E")}
          <Eye cx={61} cy={42} />
        </g>
      );
    },
  },
  // 34 — BLUE-FACED MALKOHA. Dark olive body, bold blue facial patch around the eye, green bill.
  {
    name: "Blue-faced Malkoha",
    skip: [],
    draw: () => {
      const OLV = "#6E7458", BLUE = "#3A78A8", BILL = "#9AB04A";
      return (
        <g>
          <circle cx="46" cy="56" r="31" fill={OLV} />
          <ellipse cx="42" cy="62" rx="15" ry="13" fill={mix(OLV, "#000", 0.16)} />
          <circle cx="57" cy="44" r="14" fill={OLV} />
          {/* blue face patch */}
          <ellipse cx="60" cy="44" rx="9" ry="7" fill={BLUE} />
          <Eye cx={61} cy={44} r={3.3} />
          {/* pale green bill */}
          <path d="M70 43 Q83 43 82 51 Q78 54 72 52 Q69 47 70 43 Z" fill={BILL} />
        </g>
      );
    },
  },
  // 35 — JACOBIN (PIED) CUCKOO. Black above, white below, tall pointed crest, white wing patch.
  {
    name: "Jacobin Cuckoo",
    skip: [],
    draw: () => {
      const BLK = "#2E2A2C", WHT = "#F2ECDE";
      return (
        <g>
          {/* tall crest */}
          <path d="M48 28 Q48 10 60 15 Q53 21 56 32 Z" fill={BLK} />
          <ellipse cx="49" cy="55" rx="31" ry="30" fill={BLK} />
          {/* white underparts */}
          <path d="M50 42 Q74 46 72 78 Q58 86 46 80 Q44 58 50 42 Z" fill={WHT} />
          {/* white wing patch */}
          <ellipse cx="38" cy="56" rx="7" ry="11" fill={WHT} transform="rotate(-12 38 56)" />
          {beak(70, 44, 10, 2.8, "#2E2A26")}
          <Eye cx={59} cy={42} />
        </g>
      );
    },
  },
  // 36 — BLACK EAGLE. All-black soaring raptor, fierce brow, hooked beak, yellow cere + eye.
  {
    name: "Black Eagle",
    skip: [],
    draw: () => {
      const BLK = "#2C2A30", CERE = "#E0B23C", BEAK = "#4A4A50";
      return (
        <g>
          <circle cx="48" cy="56" r="32" fill={BLK} />
          <ellipse cx="38" cy="58" rx="15" ry="18" fill={mix(BLK, "#000", 0.18)} transform="rotate(-12 38 58)" />
          <circle cx="57" cy="44" r="15" fill={BLK} />
          {/* faint brow ridge */}
          <path d="M50 38 Q60 35 68 39 L67 43 Q59 40 52 43 Z" fill={mix(BLK, "#fff", 0.08)} />
          {/* hooked beak + yellow cere */}
          <path d="M68 41 Q80 41 80 48 Q76 46 70 47 Q67 44 68 41 Z" fill={CERE} />
          <path d="M74 43 Q82 43 80 49 Q77 48 74 47 Z" fill={BEAK} />
          {/* piercing yellow eye */}
          <circle cx="58" cy="43" r="4" fill={CERE} />
          <circle cx="58" cy="43" r="2" fill={INK} />
        </g>
      );
    },
  },
];

export const ARCHETYPE_COUNT = ARCHES.length;

/** Exposed for the optical-centering harness (preview/centroid + scripts/dev/centroid.mjs). */
export const ARCHETYPES = ARCHES;

/** Pick a disc colour that does not clash with the archetype's body hue. */
function discFor(arche: Arche, colorIndex: number): string {
  let idx = colorIndex % AVATAR_PALETTE.length;
  for (let i = 0; i < AVATAR_PALETTE.length && arche.skip.includes(idx); i++) {
    idx = (idx + 3) % AVATAR_PALETTE.length;
  }
  // Soften the disc slightly so the saturated bird body always pops, while still holding an edge
  // on the app's warm cream surfaces.
  return mix(AVATAR_PALETTE[idx], "#FBF6EC", 0.18);
}

/**
 * How the bird sits in its slot. Owner-chosen: "none" (just the bird, no disc). Switching to
 * "outline" (sticker halo) or "inset" (bird inside a coloured disc) is a one-line change and the
 * rest of the system (centering, BirdAvatar container) adapts automatically.
 */
export const BG_MODE: "none" | "outline" | "inset" = "none";

/** Inset scale for "inset" mode (bird sits inside the disc with margin). */
const INSET_SCALE = 0.66;

/**
 * The bird glyph, sized to `px`. In "none" mode it is just the centred bird on a transparent
 * background (BirdAvatar gives it a non-clipping container so crest/bill are never cut). `colorOverride`
 * (disc colour) and `speciesOverride` mirror the BirdAvatar manual-override path; disc colour is
 * only used by the disc-bearing modes.
 */
export function BirdGlyphV2({
  seed,
  px,
  colorOverride,
  speciesOverride,
}: {
  seed: string;
  px: number;
  colorOverride?: string | null;
  speciesOverride?: number | null;
}) {
  const bird = birdFor(seed);
  const arche = ARCHES[(speciesOverride ?? bird.species) % ARCHES.length];
  const flip = bird.pose >= 2;
  const inner = (
    <g transform={flip ? "translate(100 0) scale(-1 1)" : undefined}>
      <g transform={archeTransform(arche)}>{arche.draw()}</g>
    </g>
  );

  if (BG_MODE === "none") {
    return (
      <svg width={px} height={px} viewBox="0 0 100 100" className="block" aria-hidden>
        {inner}
      </svg>
    );
  }

  const uid = `${seed.replace(/[^a-zA-Z0-9]/g, "")}-${px}`;

  if (BG_MODE === "outline") {
    const fid = `stk-${uid}`;
    return (
      <svg width={px} height={px} viewBox="0 0 100 100" className="block" aria-hidden>
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
        <g filter={`url(#${fid})`}>{inner}</g>
      </svg>
    );
  }

  // inset: bird inside a coloured disc
  const disc = colorOverride ? mix(colorOverride, "#FBF6EC", 0.18) : discFor(arche, bird.colorIndex);
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className="block" aria-hidden>
      <circle cx="50" cy="50" r="50" fill={disc} />
      <g transform={`translate(50 50) scale(${INSET_SCALE}) translate(-50 -50)`}>{inner}</g>
    </svg>
  );
}
