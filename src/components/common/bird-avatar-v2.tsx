import {
  birdFor,
  AVATAR_PALETTE,
  hashSpeciesFor,
  HOOPOE_SPECIES_INDEX,
  HOOPOE_RESERVED_USER_ID,
  ROLLER_SPECIES_INDEX,
  ROLLER_RESERVED_USER_IDS,
} from "@/lib/avatar";
import ADJUST from "@/components/common/bird-adjust.json";

/**
 * Optical-centering corrections, keyed by bird name. Generated/refined by scripts/dev/centroid.mjs (which
 * rasterises each bird, finds its true pixel centroid + bounding box, and writes the scale-about-
 * centre + nudge needed to seat the visual mass at 50,50 with even margins). Hand-edited values
 * are preserved across runs unless re-measured.
 */
const ADJUST_MAP = ADJUST as Record<string, { x?: number; y?: number; s?: number }>;

/**
 * BirdAvatarV2 - the Rishi Valley bird set.
 *
 * 50 birds genuinely recorded at/around Rishi Valley (a dry arid scrub valley in Andhra Pradesh),
 * curated so no two read alike at 28-40px. Each member gets: an archetype, a per-member DISC
 * colour (used only by the disc-bearing modes), and a left/right pose. The BIRD keeps its true
 * colours (a hoopoe is cinnamon, a roller is turquoise).
 *
 * House style: one bird, big and SOFT and ROUNDED, filling the avatar. No thin spikes, no
 * hair-thin beaks/tails. Colour does the differentiating at small size; one bold rounded signature
 * gives each its character. Every bird is OPTICALLY centred via bird-adjust.json (measured with
 * scripts/dev/centroid.mjs - sized by visual mass, not the geometric box).
 *
 * Drawing space is viewBox 0..100, centre (50,50); keep visual mass inside r~45.
 * Background treatment is controlled by BG_MODE; wired in behind the USE_V2 flag in bird-avatar.tsx.
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
  // 0 - COMMON HOOPOE. The standout: cinnamon body, barred wing, big fanned crest. Soft short bill.
  {
    name: "Hoopoe",
    skip: WARMS,
    draw: () => {
      const CIN = "#CE8A4E", CINL = "#DBA06A", BARD = "#2E2A26", BARL = "#F2E7D3";
      return (
        <g>
          {/* crest: fanned feathers with ROUNDED tips (a soft crown, no spikes) */}
          {[-33, -19.5, -6.5, 6.5, 19.5, 33].map((d, k) => (
            <g key={k} transform={`rotate(${d} 51 45)`}>
              <path d="M47.5 45 Q46.4 26 48.6 18 Q51 14.5 53.4 18 Q55.6 26 54.5 45 Z" fill={CIN} />
              <path d="M48.6 18 Q51 14.5 53.4 18 Q55 24 54.4 30 Q51 28.2 47.6 30 Q47 24 48.6 18 Z" fill={BARD} />
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
          <path d="M62 48 Q75 49 81 55 Q84 58 81 60 Q76 57 64 51 Z" fill="#5A5048" />
          <Eye cx={57} cy={47} />
        </g>
      );
    },
  },
  // 1 - INDIAN PEAFOWL. Bright royal-blue round body, iconic triple-dot crest, white eye-crescent.
  {
    name: "Peafowl",
    skip: BLUES,
    draw: () => {
      const BLU = "#2A82C2", BLUL = "#54A6DE", TRAIN = "#2E9C84", TRAIND = "#247E6A", GOLD = "#E0B24A", OCEL = "#214F96", STALK = "#1C6AA6", TUFT = "#2FAE96";
      return (
        <g>
          {/* peacock train: a soft rounded green fan tucked behind/below the body, with gold eyespots */}
          <path d="M45 62 Q20 58 13 76 Q24 87 45 81 Q54 71 45 62 Z" fill={TRAIN} />
          <path d="M18 70 Q26 70 30 78" stroke={TRAIND} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
          <circle cx="24" cy="71" r="4.6" fill={GOLD} /><circle cx="24" cy="71" r="2.3" fill={OCEL} />
          <circle cx="33" cy="79" r="4" fill={GOLD} /><circle cx="33" cy="79" r="2" fill={OCEL} />
          {/* plump round royal-blue body */}
          <circle cx="53" cy="55" r="30" fill={BLU} />
          {/* soft breast highlight */}
          <ellipse cx="57" cy="64" rx="11" ry="9" fill={BLUL} opacity="0.5" />
          {/* cute crest: a small fan of plump rounded feathers topped with teal tufts (no thin spikes) */}
          {[-26, 0, 26].map((d, k) => (
            <g key={k} transform={`rotate(${d} 56 38)`}>
              <path d="M56 38 Q52.5 28 56 21 Q59.5 28 56 38 Z" fill={STALK} />
              <circle cx="56" cy="20.5" r="3.3" fill={TUFT} />
            </g>
          ))}
          {/* white eye-crescents (the peacock face marks, above and below the eye) */}
          <ellipse cx="63" cy="42" rx="5.4" ry="2.8" fill={WHITE} />
          <ellipse cx="62" cy="50.5" rx="4.4" ry="2.3" fill={WHITE} />
          {beak(75, 46, 8, 2.6, "#9A9A92")}
          {/* big friendly eye */}
          <Eye cx={63} cy={46} r={4.2} />
        </g>
      );
    },
  },
  // 2 - SPOTTED OWLET. Flat round head, two oversized yellow eyes, white-spotted body.
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
  // 3 - LAUGHING DOVE. Plump rosy-fawn dove, chequered copper-and-black necklace across the throat,
  // one cool blue-grey wing panel against all that warmth.
  //
  // This slot used to hold the Indian Roller. When the Roller was reserved to the owner alone
  // (2026-08-04, see ROLLER_SPECIES_INDEX in src/lib/avatar.ts) the Dove took its index rather than
  // being appended at the end: appending would have meant raising BIRD_SPECIES_COUNT, and the hash
  // is a modulo of that number, so every member in the database would have woken up as a different
  // bird. Taking slot 3 changes exactly the members who used to hash onto the Roller and nobody else.
  {
    name: "Laughing Dove",
    skip: WARMS,
    draw: () => {
      const ROSE = "#D2977E",   // rosy-fawn: head AND breast, one colour on the real bird
        RUF = "#A96F49",        // warm rufous back + folded wing
        GREY = "#8B94A1",       // blue-grey wing panel: the one cool note
        BELLY = "#F0E6D5",
        COPPER = "#9C5730";     // the necklace
      return (
        <g>
          {/* One circle for head and body together, no separate head disc: a dove's head is the
              same rosy fawn as its breast, and drawing it as its own lighter circle read as a
              pale coin stuck on a ball. The necklace below does the identifying instead. */}
          <circle cx="49" cy="55" r="32" fill={ROSE} />
          {/* Rufous mantle: a crescent hugging the BACK edge, not a wedge cut toward the middle.
              The first attempt ran the boundary through x=49 (dead centre) and the brown read as a
              slice removed from the ball; keeping it out at the rim leaves the whole upper right
              rose, which is what gives the face somewhere to be without drawing a head disc. */}
          {/* Its outer edge is an ARC on the body's own circle, not a hand-guessed curve: drawn
              freehand it left a rose rim showing outside the brown in places and pushed past the
              silhouette in others. Both endpoints sit on r=32 about (49,55). */}
          <path d="M46 23.5 A32 32 0 0 0 33 83 Q41 76 40 60 Q40 38 46 23.5 Z" fill={RUF} />
          <ellipse cx="30" cy="58" rx="9" ry="14" fill={GREY} transform="rotate(-14 30 58)" />
          {/* cream belly, kept low and small so it does not read as a second egg */}
          <ellipse cx="57" cy="75" rx="15" ry="9.5" fill={BELLY} />
          {/* THE signature: the speckled necklace on the throat. Two copper dots, no black ones
              (owner, 2026-08-04). The dark row that used to sit above these read as hardware on a
              soft bird and fought the eye for attention at 28px; copper alone keeps the bib legible
              while letting the eye stay the darkest thing on the glyph. Two rather than three, and
              lifted 5 units off their first position, so they sit clear of the cream belly instead
              of resting on its edge. Staggered, because a level pair read as a stripe. */}
          {[[55.5, 50.5], [61.5, 57]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="3.2" fill={COPPER} />
          ))}
          {beak(74, 45, 11, 3.2, "#4A423A")}
          <Eye cx={62} cy={41} />
        </g>
      );
    },
  },
  // 4 - WHITE-THROATED KINGFISHER. Turquoise back, chocolate head, white bib, big coral bill.
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
          <path d="M70 38 Q88 39 93 45 Q95 47 93 49 Q88 52 70 50 Q66 44 70 38 Z" fill={RED} />
          <Eye cx={60} cy={40} />
        </g>
      );
    },
  },
  // 5 - INDIAN PITTA. The walking rainbow: green back, buff under, scarlet vent, azure wing.
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
  // 6 - ROSE-RINGED PARAKEET. Grass-green, fat hooked coral bill, rose neck-ring.
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
  // 7 - PLUM-HEADED PARAKEET. Lime body, solid plum-purple head.
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
  // 8 - GREEN BEE-EATER. Emerald ball, rufous crown, turquoise throat, black eye-mask.
  {
    name: "Bee-eater",
    skip: GREENS,
    draw: () => {
      const GRN = "#2FA869";
            const GRND = mix(GRN, "#000", 0.2);   // darker folded-wing green so the body has one clean depth zone
            const GRNL = mix(GRN, "#fff", 0.14);   // soft upper back highlight
            const RUF = "#B06A35";                 // rufous-tinged crown cap
            const TURQ = "#46C2C8";                // tidy turquoise throat patch
            const TURQL = mix(TURQ, "#fff", 0.18); // soft throat highlight
            const BILL = "#2E2A30";                // slim dark bill
            return (
              <g>
                {/* plump emerald body, gently tilted so it is a sleek bird and not a plain ball */}
                <ellipse cx="46" cy="60" rx="31" ry="27" fill={GRN} transform="rotate(-8 46 60)" />
                {/* soft highlight along the upper back */}
                <ellipse cx="40" cy="52" rx="19" ry="9" fill={GRNL} opacity="0.5" transform="rotate(-10 40 52)" />
                {/* ONE darker folded-wing zone low on the body for depth, fully rounded */}
                <path d="M28 58 Q20 72 35 81 Q47 71 46 59 Q39 54 28 58 Z" fill={GRND} />
                {/* rounded head set high + forward on the body */}
                <circle cx="61" cy="42" r="15" fill={GRN} />
                {/* rufous cap: one smooth rounded shape hugging only the crown, no spikes */}
                <path d="M47 41 Q49 26 63 25 Q76 26 76 38 Q76 43 72 44 Q69 36 61 35 Q53 36 49 44 Q47 45 47 41 Z" fill={RUF} />
                {/* tidy turquoise throat patch tucked right under the chin (NOT a belly ball) */}
                <path d="M58 51 Q70 52 70 58.5 Q65 62.5 57 59.5 Q55 54.5 58 51 Z" fill={TURQ} />
                <ellipse cx="61.5" cy="55" rx="3.8" ry="3" fill={TURQL} opacity="0.7" />
                {/* slim black eye-mask: a thin rounded sliver through the eye, stopping short of the bill */}
                <path d="M53 44 Q62 42.4 71 45 Q72.4 46.2 71 47.4 Q62 45 54.5 46.4 Q52.6 45.4 53 44 Z" fill={INK} />
                {/* small soft rounded bill poking right, clearly separate from the mask */}
                {beak(75.5, 45, 8.5, 2.3, BILL)}
                {/* eye seated on the mask line (the bee-eater eye-stripe) */}
                <Eye cx={61} cy={44} r={3.9} />
              </g>
            );
    },
  },
  // 9 - COPPERSMITH BARBET. Spherical green body, crimson-and-yellow patterned face.
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
          <path d="M40 36 Q56 30 66.5 37 Q71 38.2 68 40 Q58 40.4 50 40 Q44 40 40 42 Z" fill={RED} />
          <path d="M34 62 Q52 70 69 62.4 Q71.6 64.4 69 66.6 Q52 74 35 67 Q32.8 64.4 34 62 Z" fill={RED} />
          {beak(78, 49, 9, 3.2, "#3A352E")}
          <Eye cx={60} cy={47} />
        </g>
      );
    },
  },
  // 10 - INDIAN GREY HORNBILL. Grey body dominated by a huge curved banana bill + casque.
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
          <path d="M60 34 Q82.5 31 84.4 36 Q85 38.4 82.4 39.6 Q72 37 62 40 Z" fill={CASQ} />
          <Eye cx={58} cy={41} />
        </g>
      );
    },
  },
  // 11 - SIRKEER MALKOHA. Olive-brown plump body, candy red-and-yellow stout down-bill.
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
          <path d="M75 43 Q83.4 43.4 81.4 49.6 Q81 51.6 78.8 51.8 Q76 51.4 73 51 Z" fill={YGRN} />
          <Eye cx={58} cy={43} />
        </g>
      );
    },
  },
  // 12 - YELLOW-THROATED BULBUL (RV specialty). Olive-grey body, glowing sulphur face, soft crest.
  {
    name: "Y-T Bulbul",
    skip: [],
    draw: () => {
      const ASH = "#9DA09A";                  // ashy-grey body
            const ASHD = mix(ASH, "#000", 0.16);    // shaded wing/tail
            const ASHL = mix(ASH, WHITE, 0.28);     // lit breast
            const YEL = "#E4C82E";                  // core glowing olive-yellow
            const YELB = mix(YEL, "#FFF6C8", 0.55); // brightest glow centre
            const YELD = mix(YEL, "#7E8A2A", 0.32); // olive edge of the glow
            const HALO = mix(YEL, ASH, 0.5);        // soft halo bleeding into the grey
            return (
              <g>
                {/* broad soft tail sweeping down-left (a rounded paddle, never a needle) */}
                <path d="M38 66 Q27 73 21 84 Q18 90 24 89 Q35 82 45 73 Q50 67 43 64 Q40 63 38 66 Z" fill={ASHD} />
                <path d="M25 80 Q32 75 41 70 Q34 77 29 84 Q25 85 25 80 Z" fill={mix(ASH, "#000", 0.06)} opacity="0.7" />
                {/* slim ashy body, tilted, perched */}
                <ellipse cx="48" cy="58" rx="27" ry="29" fill={ASH} transform="rotate(-8 48 58)" />
                {/* lit breast keeps the grey mass from reading flat */}
                <ellipse cx="53" cy="66" rx="16" ry="14" fill={ASHL} opacity="0.6" />
                {/* darker folded wing: a soft rounded panel hugging the back flank */}
                <path d="M28 50 Q21 64 28 78 Q36 84 44 79 Q40 64 41 54 Q36 48 28 50 Z" fill={ASHD} />
                <path d="M31 56 Q28 66 33 75 Q31 64 34 56 Q33 54 31 56 Z" fill={mix(ASHD, "#000", 0.18)} opacity="0.5" />
                {/* bright yellow undertail lobe tucked at the lower rear (the field cue) */}
                <path d="M30 68 Q23 73 26 83 Q33 88 41 81 Q43 73 36 68 Q33 66 30 68 Z" fill={YEL} />
                <path d="M29 72 Q25 77 29 83 Q34 85 38 79 Q38 73 32 71 Z" fill={YELB} opacity="0.7" />
                {/* THE STAR: glowing olive-yellow head + throat as ONE luminous hood */}
                {/* soft halo first so the yellow bleeds outward and reads as glowing, not a sticker */}
                <path d="M44 30 Q70 30 74 48 Q75 62 64 70 Q52 74 44 66 Q38 56 39 44 Q40 35 44 30 Z" fill={HALO} opacity="0.55" />
                {/* olive outer of the hood: covers head and flows down into the throat */}
                <path d="M46 31 Q68 32 71 48 Q72 60 62 67 Q52 70 46 63 Q41 54 42 44 Q43 36 46 31 Z" fill={YELD} />
                {/* core yellow */}
                <path d="M47 33 Q66 34 69 48 Q69 58 61 64 Q52 67 47 60 Q43 52 44 44 Q45 37 47 33 Z" fill={YEL} />
                {/* brightest glow toward the face/forehead */}
                <ellipse cx="58" cy="44" rx="11" ry="12" fill={YELB} opacity="0.85" />
                <ellipse cx="61" cy="42" rx="5.5" ry="6" fill={mix(YELB, "#FFFDEC", 0.6)} opacity="0.9" />
                {/* neat soft bulbul crest: a short backswept rounded tuft leaning forward over the brow,
                    broad at the base so it reads as a crest fused to the head, not a separate ear */}
                <path d="M48 33 Q46 19 56 16 Q64 15 63 22 Q59 28 56 34 Q52 32 48 33 Z" fill={YELD} />
                <path d="M49 32 Q48 20 57 17.5 Q62.5 17 61.5 23 Q58 28 55 33 Q52 31 49 32 Z" fill={YEL} />
                <path d="M53 22 Q55 18 58.5 18 Q59.5 20 58 24 Q55.5 23.5 53 22 Z" fill={YELB} opacity="0.85" />
                {/* dark bulbul eye sitting inside the glow so it pops */}
                <Eye cx={60} cy={46} r={4.2} />
                {/* soft rounded petal bill (softer than the Flameback chisel ceiling) */}
                {beak(71, 49, 8.5, 2.6, "#3A352E")}
              </g>
            );
    },
  },
  // 13 - RED-WHISKERED BULBUL. Tall (soft) black crest, white-and-red cheek, brown back, red vent.
  {
    name: "R-W Bulbul",
    skip: [],
    draw: () => {
      const BRN = "#7C6A55", RED = "#D2483E";
      return (
        <g>
          {/* tall soft crest */}
          <path d="M50 30 Q50 10 57.8 12.8 Q61 14 59.4 17 Q56.4 20 58 32 Z" fill={INK} />
          <circle cx="49" cy="56" r="31" fill={BRN} />
          {/* white underparts */}
          <ellipse cx="54" cy="64" rx="19" ry="17" fill={WHITE} />
          {/* black head cap + white cheek */}
          <path d="M40 40 Q56 30 66.5 39 Q71 40.2 67.6 41.6 Q56 38 48 42 Z" fill={INK} />
          <circle cx="60" cy="48" r="6.5" fill={WHITE} />
          {/* red whisker */}
          <circle cx="62" cy="52" r="2.8" fill={RED} />
          {/* red vent */}
          <path d="M35 67 Q34 72 39 75 Q47 78 52 71 Q53 67 48 65 Q41 64 35 67 Z" fill={RED} />
          {beak(74, 49, 8, 2.6, "#2E2A26")}
          <Eye cx={59} cy={46} />
        </g>
      );
    },
  },
  // 14 - ORIENTAL MAGPIE-ROBIN. Clean black-and-white pied, cocked tail.
  {
    name: "Magpie-Robin",
    skip: [],
    draw: () => {
      const BLK = "#2E2A2C";
      return (
        <g>
          {/* cocked tail: a broad black paddle swept UP and back, the magpie-robin signature, with a white outer edge */}
          <path d="M40 46 Q24 40 17 25 Q15 19 21 19 Q28 21 34 30 Q43 41 48 52 Q45 49 40 46 Z" fill={BLK} />
          <path d="M21 21 Q27 23 33 31 Q29 30 25 31 Q22 26 21 21 Z" fill={WHITE} />
          {/* upright body leaning slightly back so it reads as a perched bird */}
          <g transform="rotate(9 49 59)">
            <ellipse cx="49" cy="59" rx="22" ry="28" fill={BLK} />
          </g>
          {/* crisp white belly as a bounded front panel (black rims it, so it never merges with the page) */}
          <path d="M53 53 Q68 57 65 76 Q55 83 48 76 Q46 63 53 53 Z" fill={WHITE} />
          {/* head lifted high and forward */}
          <circle cx="59" cy="37" r="13" fill={BLK} />
          {/* white wing-bar slash on the black wing (the diagnostic mark) */}
          <ellipse cx="42" cy="58" rx="3.4" ry="11" fill={WHITE} transform="rotate(-22 42 58)" />
          {beak(71, 35, 9, 2.6, "#2E2A26")}
          <Eye cx={62} cy={34} />
        </g>
      );
    },
  },
  // 15 - INDIAN ROBIN. Glossy blue-black upright body, chestnut vent, white shoulder.
  {
    name: "Indian Robin",
    skip: [],
    draw: () => {
      const BLK = "#2C2A30";
      const SHEEN = mix(BLK, "#3A5A8A", 0.2);
      const CHES = "#B5572E", CHESL = mix(CHES, "#fff", 0.16);
      return (
        <g>
          {/* cocked tail: broad soft paddle swept UP and back, held high above the body (the signature) */}
          <path d="M40 44 Q24 38 17 24 Q15 18 21 18 Q27 19 33 27 Q42 38 47 50 Q44 47 40 44 Z" fill={SHEEN} />
          {/* slim upright body, leaning slightly back so it reads as a perched bird, not a ball */}
          <g transform="rotate(9 49 59)">
            <ellipse cx="49" cy="59" rx="21" ry="28" fill={BLK} />
          </g>
          {/* low blue sheen hugging the flank (glossy blue-black) */}
          <ellipse cx="47" cy="65" rx="15" ry="17" fill={SHEEN} opacity="0.85" transform="rotate(9 47 65)" />
          {/* chestnut/rufous vent: soft rounded lobe tucked under the cocked tail at the lower-rear */}
          <path d="M31 64 Q23 69 27 78 Q35 83 42 75 Q38 67 31 64 Z" fill={CHES} />
          <path d="M30 68 Q27 72 30 77 Q35 79 38 74 Z" fill={CHESL} />
          {/* separate rounded head, lifted high and forward for the alert upright posture */}
          <circle cx="58" cy="36" r="13" fill={BLK} />
          {/* white shoulder flash: small crisp patch high on the folded wing */}
          <ellipse cx="42" cy="52" rx="5" ry="7.5" fill={WHITE} transform="rotate(-26 42 52)" />
          {beak(70, 34, 9, 2.6, "#2E2A26")}
          <Eye cx={61} cy={33} />
        </g>
      );
    },
  },
  // 16 - ASIAN KOEL. Glossy black body, staring crimson eye, pale-green bill.
  {
    name: "Koel",
    skip: [],
    draw: () => {
      const BLK = "#2A2730", GLOSS = mix(BLK, "#5E86C0", 0.62), SHEEN = mix(BLK, "#86A8D6", 0.78), RED = "#D2433A", BILL = "#B6C268", BILLD = mix(BILL, "#000", 0.18);
      return (
        <g>
          {/* long rounded tail sweeping down-left (the slim long-tailed cuckoo cue) */}
          <path d="M44 64 Q30 70 20 82 Q16 88 22 86 Q34 80 47 73 Q50 68 44 64 Z" fill={BLK} />
          <path d="M40 67 Q28 74 21 83 Q26 81 34 76 Q42 71 43 68 Q43 66 40 67 Z" fill={mix(BLK, "#3A5A8A", 0.22)} />
          {/* slim body, tilted, mass near (49,55) */}
          <ellipse cx="49" cy="56" rx="27" ry="30" fill={BLK} transform="rotate(14 49 56)" />
          {/* raised head blended into the body (soft, no neck corner) */}
          <path d="M50 40 Q56 28 66 32 Q73 36 71 46 Q66 54 56 54 Q48 50 50 40 Z" fill={BLK} />
          <circle cx="61" cy="40" r="14" fill={BLK} />
          {/* big visible blue-grey wing gloss + brighter sheen streak (the second colour) */}
          <ellipse cx="44" cy="58" rx="17" ry="21" fill={GLOSS} transform="rotate(16 44 58)" />
          <ellipse cx="40" cy="52" rx="8" ry="13" fill={SHEEN} opacity="0.85" transform="rotate(16 40 52)" />
          {/* pale yellow-green down-curved petal bill, rounded tip */}
          <path d="M71 39 Q86 40 85 49 Q82 53 75 51 Q70 46 71 39 Z" fill={BILL} />
          <path d="M78 43 Q85 44 84 49 Q81 51 77 50 Q76 46 78 43 Z" fill={BILLD} />
          {/* staring crimson eye (focal) */}
          <circle cx="62" cy="40" r="5.6" fill={RED} />
          <circle cx="62" cy="40" r="2.6" fill={INK} />
          <circle cx="60.4" cy="38.4" r="1.5" fill="#fff" />
        </g>
      );
    },
  },
  // 17 - BLACK DRONGO. Slim glossy-black body, slight forehead bump, and THE signature: a deeply
  // forked fish-tail with bold ROUNDED fork tips. Visible steel-blue gloss so it is never a flat void.
  {
    name: "Drongo",
    skip: [],
    draw: () => {
      const BLK = "#29262F";
      const GLOSS = mix(BLK, "#3E6AA8", 0.42);   // steel-blue sheen
      const GLOSSL = mix(BLK, "#6E98CE", 0.6);   // brighter glint
      const SHADE = mix(BLK, "#000", 0.22);
      return (
        <g>
          {/* deeply forked fish-tail (left): ONE closed shape, two rounded lobe tips, smooth deep notch */}
          <path
            d="M33 49 Q18 43 11 43 Q7 45 11 48 Q22 52 25 54 Q22 56 11 60 Q7 63 11 65 Q18 65 33 59 Z"
            fill={BLK}
          />
          {/* gloss running along the upper fork so the tail reads glossy, not dead-flat */}
          <path d="M14 45 Q22 48 27 53" stroke={GLOSS} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />

          {/* slim body, tilted so it reads slender rather than a fat ball */}
          <ellipse cx="50" cy="55" rx="29" ry="24" fill={BLK} transform="rotate(-12 50 55)" />
          {/* soft underside shade preserves the slim form */}
          <ellipse cx="49" cy="64" rx="20" ry="12" fill={SHADE} opacity="0.5" transform="rotate(-8 49 64)" />

          {/* steel-blue gloss highlight across the back/shoulder */}
          <ellipse cx="46" cy="46" rx="17" ry="11" fill={GLOSS} transform="rotate(-18 46 46)" />
          <ellipse cx="44" cy="44" rx="8" ry="4.4" fill={GLOSSL} opacity="0.85" transform="rotate(-18 44 44)" />

          {/* head + slight forehead bump (small circle merged onto the crown) */}
          <circle cx="62" cy="44" r="13" fill={BLK} />
          <circle cx="64" cy="35" r="6.5" fill={BLK} />
          <ellipse cx="60" cy="40" rx="6" ry="3" fill={GLOSS} opacity="0.65" />

          {beak(74, 45, 10, 2.8, "#23202A")}
          <Eye cx={65} cy={42} r={3.6} />
        </g>
      );
    },
  },
  // 18 - GREATER COUCAL. Heavy black body, rich chestnut wings, crimson eye.
  {
    name: "Coucal",
    skip: WARMS,
    draw: () => {
      const BLK = "#2A2730", BLKL = mix(BLK, "#3A4660", 0.32),
              CHES = "#A4521F", CHESL = "#C26A2C", CHESD = mix(CHES, "#000", 0.22),
              RED = "#B33028", BILL = "#211E22", BILLR = mix(BILL, "#fff", 0.16);
            return (
              <g>
                {/* LONG BROAD graduated tail sweeping down-left well clear of the body (key field mark);
                    one closed shape, broad blade, fully rounded tip, smooth join */}
                <path d="M54 62 Q34 74 17 92 Q12 97 19 96 Q24 95 29 91 Q47 78 60 70 Q63 62 54 62 Z" fill={BLK} />
                <path d="M44 74 Q31 83 21 93 Q28 90 35 84 Q44 79 47 75 Q49 72 44 74 Z" fill={BLKL} opacity="0.7" />
                {/* solid heavy black body mass (crow-like cuckoo); rounded ovoid, no gaps */}
                <ellipse cx="47" cy="54" rx="29" ry="30" fill={BLK} />
                {/* big rich CHESTNUT wing laid over the back/shoulder = the diagnostic mark */}
                <path d="M47 25 Q19 29 19 57 Q20 77 44 79 Q41 58 48 39 Q53 28 51 26 Q50 23 47 25 Z" fill={CHES} />
                <path d="M45 29 Q25 34 24 55 Q25 71 42 75 Q39 56 45 40 Q48 31 47 29 Q46 27 45 29 Z" fill={CHESL} opacity="0.5" />
                {/* folded primaries: a darker chestnut crescent hugging the LOWER wing edge (not a centred hole) */}
                <path d="M23 59 Q27 75 42 77 Q41 67 43 57 Q32 55 23 59 Z" fill={CHESD} opacity="0.85" />
                {/* distinct black head up-right, soft join into the body (no neck corner) */}
                <path d="M50 36 Q54 26 64 28 Q74 30 73 44 Q70 56 58 56 Q49 50 50 36 Z" fill={BLK} />
                <circle cx="62" cy="40" r="13.5" fill={BLK} />
                <ellipse cx="56" cy="36" rx="6" ry="3.4" fill={BLKL} opacity="0.6" />
                {/* HEAVY slightly-decurved BLACK bill: deep stout base, culmen arcs down to a rounded tucked
                    tip; every corner a Q-curve, blunter + shorter than the Flameback chisel ceiling */}
                <path d="M72 37 Q83 37 86 43.5 Q88 48 84 50.5 Q81 51.5 80 48.5 Q78 44 72.5 45 Q71.5 41 72 37 Z" fill={BILL} />
                <path d="M73.5 39 Q82 39.5 85.5 45" stroke={BILLR} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55" />
                <path d="M72.8 45 Q78 45.6 82.5 46.5" stroke={mix(BILL, "#000", 0.4)} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
                {/* CALM deep-red eye: smaller iris, normal dark pupil + catchlight (character, not horror) */}
                <circle cx="64" cy="39" r="4.2" fill={RED} />
                <circle cx="64" cy="39" r="2" fill={INK} />
                <circle cx="62.9" cy="37.9" r="0.95" fill="#fff" />
              </g>
            );
    },
  },
  // 19 - RUFOUS TREEPIE. Warm rufous body under a sooty-grey hood, pale-grey wing panel.
  {
    name: "Treepie",
    skip: WARMS,
    draw: () => {
      const RUF = "#C07A45", HOOD = "#5A554E", PG = "#C9C2B4";
      return (
        <g>
          <circle cx="49" cy="56" r="32" fill={RUF} />
          {/* grey hood */}
          <path d="M30 42 Q50 24 66.5 41 Q71 42.2 67.6 43.6 Q58 40.4 50 40 Q40 40 30 46 Z" fill={HOOD} />
          <circle cx="56" cy="40" r="14" fill={HOOD} />
          {/* pale grey wing panel */}
          <ellipse cx="38" cy="60" rx="9" ry="15" fill={PG} transform="rotate(-14 38 60)" />
          {beak(72, 44, 11, 3.2, "#3A352E")}
          <Eye cx={60} cy={40} />
        </g>
      );
    },
  },
  // 20 - BLACK-HOODED ORIOLE. Glowing golden-yellow body, jet-black hood, pink-red bill.
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
          <path d="M30 64 Q39 77 50 79.5 Q54 80.5 54.5 77 Q48 66 40 58 Z" fill={BLK} />
          <path d="M70 40 Q84 41 82 49 Q78 53 71 51 Q68 46 70 40 Z" fill={PINK} />
          <Eye cx={60} cy={41} />
        </g>
      );
    },
  },
  // 21 - BAYA WEAVER. Golden-yellow cap over a streaky warm-brown body, stout conical bill.
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
          <path d="M70 46 L83 48.8 Q86 50 83 51.2 L70 56 Z" fill="#D9CBA6" />
          <Eye cx={59} cy={47} />
        </g>
      );
    },
  },
  // 22 - PURPLE SUNBIRD. Tiny all-over iridescent purple jewel, short decurved bill.
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
          <path d="M68 44 Q81 46 80 52 Q80 55 77 54 Q73 52 70 51 Q66 47 68 44 Z" fill="#2A2730" />
          <Eye cx={60} cy={45} r={3.8} />
        </g>
      );
    },
  },
  // 23 - BRAHMINY STARLING. Peachy body, grey wings, shaggy black punk crest, yellow-blue bill.
  {
    name: "Starling",
    skip: WARMS,
    draw: () => {
      const PEACH = "#E0A86A", GREY = "#A7A39A", GREYD = mix(GREY, "#000", 0.18), YEL = "#D9B23C", BLU = "#6E7E8A";
            return (
              <g>
                {/* plump peachy-buff body: the dominant warm mass */}
                <circle cx="49" cy="57" r="31" fill={PEACH} />
                {/* soft grey FOLDED WING: one clean rounded shape draped over the upper back + rear flank, visibly sitting
                    ON the body (a calm rounded blob, never a diagonal slash) */}
                <path d="M28 46 Q20 60 26 76 Q35 83 46 78 Q47 62 47 49 Q40 42 28 46 Z" fill={GREY} />
                {/* a soft rounded fold line inside the wing so it reads as a folded wing, not a flat patch */}
                <path d="M33 53 Q29 64 34 75 Q40 77 44 74 Q43 62 43 53 Q39 50 33 53 Z" fill={GREYD} opacity="0.5" />
                {/* rounded head set clearly above the shoulders, peachy */}
                <circle cx="58" cy="37" r="14" fill={PEACH} />
                {/* small black shaggy crest: two short SOFT rounded peaks rising from the crown (no spikes) */}
                <path d="M48 28 Q47 16 54 16 Q58 17 56 23 Q54 27 55 31 Q51 31 48 28 Z" fill={INK} />
                <path d="M55 27 Q56 15 63 17 Q66 18.5 63 23 Q60 26 62 31 Q57 31 55 27 Z" fill={INK} />
                {/* neat black cap: a soft rounded arc capping the crown, tucked under the crest */}
                <path d="M45 33 Q58 25 71 33 Q66 28 58 28 Q50 28 45 33 Z" fill={INK} />
                {/* soft bill: stout rounded wedge (no sharper than the Flameback chisel), blue base + yellow tip */}
                <path d="M69 38 L80 40.2 Q83 41 80 41.8 L69 45 Z" fill={YEL} />
                <path d="M69 38 L73.5 39 Q76 39.6 73.5 40.4 L69 45 Z" fill={BLU} />
                {/* dark starling eye */}
                <Eye cx={60} cy={38} r={3.9} />
              </g>
            );
    },
  },
  // 24 - YELLOW-WATTLED LAPWING. Sandy body, crisp black cap, lemon-yellow facial wattle. Stubby legs.
  {
    name: "Lapwing",
    skip: WARMS,
    draw: () => {
      const SAND = "#C2A87A", SANDD = "#A98E60", PALE = "#EAE0CC", BLK = "#2E2A26", YEL = "#E2C23C", LEG = "#E6B83A", LEGD = "#C99A28";
      return (
        <g>
          {/* tall yellow wader legs (rounded caps + bent knee + soft feet) - the silhouette break */}
          <g>
            <path d="M45 70 Q43 80 45 88 Q44 91 46 91 Q48 89 47.5 88 Q46 80 48 72 Z" fill={LEGD} />
            <path d="M55 70 Q54 80 55.5 88 Q54.5 91 56.5 91 Q58.5 89 58 88 Q57 80 58 72 Z" fill={LEG} />
            {/* soft toes */}
            <path d="M46 90 Q41 92 43 94 Q46 93 47 92.5 Q49 93 51 94 Q52 92 47 90 Z" fill={LEGD} />
            <path d="M56.5 90 Q51.5 92 53.5 94 Q56.5 93 57.5 92.5 Q59.5 93 61.5 94 Q62.5 92 57.5 90 Z" fill={LEG} />
          </g>
          {/* plump sandy body, perched high */}
          <ellipse cx="48" cy="52" rx="29" ry="25" fill={SAND} />
          {/* pale belly/breast */}
          <ellipse cx="51" cy="60" rx="19" ry="15" fill={PALE} />
          {/* folded wing (soft rounded panel) */}
          <ellipse cx="36" cy="52" rx="14" ry="17" fill={SANDD} transform="rotate(-12 36 52)" />
          {/* low dark breast-border band (soft curve, rounded ends) */}
          <path d="M37 67 Q51 73 64 65" stroke={BLK} strokeWidth="3.4" fill="none" strokeLinecap="round" opacity="0.65" />
          {/* small round head set high + forward */}
          <circle cx="58" cy="35" r="13" fill={SAND} />
          {/* neat jet-black crown cap (all rounded) */}
          <path d="M46 33 Q56 19 70 30 Q68 33 64 33 Q57 31 50 35 Q47 35 46 33 Z" fill={BLK} />
          <ellipse cx="59" cy="27" rx="11" ry="7.5" fill={BLK} />
          {/* lemon-yellow facial wattle/lore lobe (the signature) */}
          <ellipse cx="67" cy="38" rx="5.5" ry="6.5" fill={YEL} />
          <path d="M62 39 Q67 37 71 40 Q67 43 62 41 Z" fill={mix(YEL, "#fff", 0.18)} />
          {/* thin yellow eye-ring touch */}
          <circle cx="61" cy="35" r="6" fill={YEL} opacity="0.55" />
          {/* short soft petal bill with dark tip */}
          {beak(70, 39, 9, 2.6, "#3A352E")}
          <Eye cx={61} cy={35} />
        </g>
      );
    },
  },
  // 25 - PAINTED SPURFOWL. Dumpy round gamebird, dark chestnut with white moon-spots, red face.
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
  // 26 - ASIAN PARADISE FLYCATCHER (rufous morph). Glossy blue-black crested head, rufous body,
  // powder-blue eye-ring + bill (its ribbon tail is cropped to a soft nub).
  {
    name: "Paradise Flycatcher",
    skip: WARMS,
    draw: () => {
      const RUF = "#C07A50", RUFD = mix(RUF, "#000", 0.16), RUFL = mix(RUF, WHITE, 0.14), BLK = "#2C2A33", BLKS = mix(BLK, "#3A5A8A", 0.22), BLU = "#83B6CA", BILL = "#6E94A8";
      return (
        <g>
          {/* SIGNATURE: long flowing rufous ribbon tail sweeping off the lower-left body - two broad smooth streamers, all rounded */}
          <path d="M40 64 Q22 70 12 86 Q9 92 16 90 Q30 82 46 70 Q48 64 40 64 Z" fill={RUF} />
          <path d="M14 86 Q9 90 13 94 Q18 93 18 88 Q17 85 14 86 Z" fill={RUFD} />
          <path d="M42 70 Q26 78 18 92 Q24 88 34 80 Q42 74 44 71 Q44 68 42 70 Z" fill={RUFD} opacity="0.7" />
          {/* clean rufous body - one confident ovoid, no notches */}
          <ellipse cx="48" cy="56" rx="29" ry="30" fill={RUF} />
          {/* folded wing: a single soft darker-rufous lobe so the body reads, not a flat ball */}
          <path d="M34 46 Q24 62 34 80 Q44 74 47 58 Q47 49 43 45 Q38 44 34 46 Z" fill={RUFD} />
          <ellipse cx="40" cy="54" rx="8" ry="13" fill={RUFL} opacity="0.5" transform="rotate(10 40 54)" />
          {/* glossy blue-black crested head: head circle + ONE soft rounded crest sweep */}
          <path d="M44 30 Q47 13 57 16 Q63 18 60 25 Q56 30 56 36 Q50 38 44 30 Z" fill={BLK} />
          <circle cx="56" cy="42" r="15" fill={BLK} />
          <ellipse cx="51" cy="46" rx="8" ry="11" fill={BLKS} opacity="0.7" transform="rotate(8 51 46)" />
          {/* powder-blue eye-ring + soft stout rounded bill */}
          <circle cx="60" cy="41" r="5.8" fill={BLU} />
          <Eye cx={60} cy={41} r={3.4} />
          <path d="M71 40 Q83 42 82 47.5 Q78 47 71 46.5 Q68 43 71 40 Z" fill={BILL} />
        </g>
      );
    },
  },
  // 27 - INDIAN POND HERON. Hunched buff body, white belly/wing, streaky crown, soft dagger bill.
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
          {/* soft dagger bill with dark tip (compact so the body reads big) */}
          <path d="M70 45 Q79 46 81.5 49.5 Q83 51 81 52 Q76 50.5 71 49 Z" fill={BILL} />
          <path d="M77 48 Q81.5 49.5 81 51 Q80 51.5 78.5 50.5 Q76 49.8 75 49.5 Z" fill="#5A5040" />
          <Eye cx={61} cy={43} />
        </g>
      );
    },
  },
  // 28 - LITTLE CORMORANT. Dark glossy waterbird, raised snaky neck, hooked bill, blue-green eye.
  {
    name: "Cormorant",
    skip: [],
    draw: () => {
      const BLK = "#2A2A30", SHEEN = "#33453F", SHADE = "#232329", BILL = "#8C8C84", EYE = "#3FA88A";
      return (
        <g>
          {/* low oval glossy body (large + raised so the tall raised-neck bird fits the frame, head not cut off) */}
          <ellipse cx="46" cy="62" rx="30" ry="24" fill={BLK} />
          {/* subtle green-black gloss hugging the upper back/shoulder */}
          <path d="M24 56 Q36 45 58 49 Q48 53 40 59 Q32 63 25 67 Q22 61 24 56 Z" fill={SHEEN} />
          {/* soft folded-wing shade low on the body (rounded crescent) */}
          <path d="M26 68 Q28 82 48 82 Q44 74 44 65 Q35 62 26 68 Z" fill={SHADE} />
          {/* raised snaky S-neck rising out of the body (head set a touch lower so it stays in frame) */}
          <path d="M48 66 Q45 54 50 47 Q53 42 56 40 Q60 44 57 49 Q53 56 54 63 Q51 67 48 66 Z" fill={BLK} />
          {/* merge the neck base smoothly into the body */}
          <ellipse cx="50" cy="64" rx="8" ry="6" fill={BLK} />
          {/* small head capping the top of the neck */}
          <circle cx="57" cy="40" r="8" fill={BLK} />
          <ellipse cx="54.5" cy="45" rx="4.5" ry="5" fill={BLK} />
          {/* hooked grey bill: base tucked into the head, flows out, small rounded hook tip */}
          <path d="M61 37 Q71 36.2 76.5 38.9 Q79 40.1 78 41.6 Q77.2 42.4 75.3 42.4 Q76.4 43.7 74.9 44.8 Q72.8 45.4 71.4 43.9 Q65.5 42.7 61 42 Q59 39.5 61 37 Z" fill={BILL} />
          {/* soft culmen ridge so the bill reads dimensional (rounded stroke ends) */}
          <path d="M62.5 38.3 Q69 37.9 75 40.1" stroke={mix(BILL, "#000", 0.22)} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.45" />
          {/* blue-green eye */}
          <circle cx="57" cy="39.6" r="3.1" fill={EYE} />
          <circle cx="57" cy="39.6" r="1.45" fill={INK} />
          <circle cx="56.3" cy="39" r="0.6" fill="#FFFFFF" />
        </g>
      );
    },
  },
  // 29 - INDIAN GOLDEN ORIOLE. Glowing golden-yellow body, black eye-stripe (not a hood), black
  // wing, pink-red bill. (Distinct from the full-hooded Black-hooded Oriole.)
  {
    name: "Golden Oriole",
    skip: [7],
    draw: () => {
      const YEL = "#E8B82E", BLK = "#2E2A26", PINK = "#D06A6A";
      return (
        <g>
          <circle cx="49" cy="55" r="33" fill={YEL} />
          {/* small black wing tip only - silhouette stays mostly-yellow, unlike the black-headed Oriole */}
          <ellipse cx="33" cy="64" rx="8" ry="9" fill={BLK} transform="rotate(-12 33 64)" />
          {/* black eye-stripe through the eye (the Golden Oriole's signature) */}
          <path d="M50 39 Q63 37 73 42 Q74 44.5 73 47 Q63 43 52 46 Z" fill={BLK} />
          {/* pink-red bill */}
          <path d="M71 42 Q84 43 83 51 Q79 55 72 53 Q69 47 71 42 Z" fill={PINK} />
          <Eye cx={62} cy={43} />
        </g>
      );
    },
  },
  // 30 - CATTLE EGRET (breeding). Cool-white body, buff crown/breast plumes, yellow dagger bill.
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
          <path d="M44 38 Q55 31 63 38 Q65.5 39.5 63 41 Q56 39.5 50 43 Q46 42 44 45 Z" fill={BUFF} />
          <circle cx="58" cy="45" r="12" fill={WHT} />
          <path d="M52 41 Q59 36.5 64.5 39.5 Q66.5 41 64.5 42 Q59 40.5 54 44 Z" fill={BUFF} />
          {/* yellow dagger bill */}
          <path d="M68 45 Q83 46 85.5 50 Q86.6 51 85.5 52 Q83 50.5 70 49.5 Z" fill={BILL} />
          <Eye cx={61} cy={44} />
        </g>
      );
    },
  },
  // 31 - VERDITER FLYCATCHER. Uniform bright verditer (aqua) body, black lores, small dark bill.
  {
    name: "Verditer Flycatcher",
    skip: BLUES,
    draw: () => {
      const VERD = "#46A9BE", DARK = "#2E2A30";
      return (
        <g>
          <circle cx="49" cy="55" r="32" fill={VERD} />
          {/* soft darker-aqua wing, low and behind, so it reads as a wing not a separate ball */}
          <path d="M30 52 Q24 70 40 80 Q50 66 50 54 Q42 50 30 52 Z" fill={mix(VERD, "#000", 0.14)} />
          {beak(74, 49, 9, 2.6, DARK)}
          <Eye cx={60} cy={46} />
        </g>
      );
    },
  },
  // 32 - PEREGRINE FALCON. Fresh take (2026-07-18): bold round perched raptor in the Kingfisher's
  // build. Slate body + flank wing, two darker swept wingtip points crossing toward the short
  // tail (the falcon cue that kills any penguin read), pale chest barred from the neckline down,
  // and a clearly separated face: dark head dome (helmet), white cheek, NARROW malar teardrop
  // dropping from the yellow-ringed eye (white visible on both sides), a small yellow cere dot
  // and a SHORT stubby hooked beak nestled against the head. All shapes stay compact around the
  // body; adjust matches the other round-bodied birds (~1.2 scale).
  {
    name: "Peregrine Falcon",
    skip: [],
    draw: () => {
      const SLATE = "#617586", SLATED = "#4C5A67", SLATEL = "#8290A0";
      const HOOD = "#2F3843", HOODL = "#454F5B";
      const PALE = "#ECE7DA", BAR = "#6E7C8A";
      const CERE = "#E2B43E", CERED = "#C1922B", BEAK = "#33363B";
      const PRIM1 = "#39434D", PRIM2 = "#46525E";
      return (
        <g>
          {/* yellow feet gripping a perch, peeking at the base */}
          <path d="M45 80 Q43 90 47 91 Q50 87 50 80 Z" fill={CERED} />
          <path d="M55 80 Q57 90 53 91 Q50 87 50 80 Z" fill={CERE} />
          {/* short tail peeking below the body */}
          <path d="M44 76 Q43 92 50 93 Q56 91 54 76 Z" fill={SLATED} />
          {/* slate body (upperparts) */}
          <circle cx="48" cy="54" r="32" fill={SLATE} />
          {/* pale front: breast + belly */}
          <path d="M55 40 Q66 39 72 45 Q82 54 79 68 Q75 86 50 86 Q39 85 42 66 Q44 48 55 40 Z" fill={PALE} />
          {/* barring rises to the neckline: barred raptor chest, not a penguin belly */}
          <path d="M51 60 Q61 63 71 60" stroke={BAR} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M50 67 Q60 70 71 67" stroke={BAR} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.45" />
          <path d="M50 74 Q59 76.5 69 74" stroke={BAR} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.42" />
          <path d="M52 80.5 Q59 82.5 67 80.5" stroke={BAR} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.38" />
          {/* folded wing over the flank */}
          <path d="M52 34 Q30 36 25 58 Q23 77 41 84 Q46 74 49 60 Q52 48 53 40 Z" fill={SLATED} />
          {/* lit shoulder so the dark mass isn't a flat void */}
          <ellipse cx="40" cy="46" rx="11" ry="7" fill={SLATEL} opacity="0.32" transform="rotate(-24 40 46)" />
          {/* long pointed wingtips sweeping down the flank to cross over the tail */}
          <path d="M40 55 Q43 70 50 81 Q52.5 83 53 80.5 Q47.5 71 46 62 Q44.5 54 40 55 Z" fill={PRIM2} />
          <path d="M33 57 Q35 75 52 87 Q55.5 88.5 56 86 Q48.5 77.5 44.5 67 Q41 58 33 57 Z" fill={PRIM1} />
          {/* distinct dark head dome (the peregrine helmet), clearly bounded above the body */}
          <circle cx="59" cy="38" r="18" fill={HOOD} />
          {/* crown sheen */}
          <ellipse cx="55" cy="28" rx="9" ry="4.5" fill={HOODL} opacity="0.65" transform="rotate(-14 55 28)" />
          {/* white cheek patch on the lower face: the field mark the malar divides */}
          <path d="M52 43 Q62 39.5 74 43 Q76 50.5 69.5 55 Q60.5 58.5 54 54 Q50.5 48.5 52 43 Z" fill={WHITE} />
          {/* narrow malar teardrop dropping from the eye, white cheek on BOTH sides */}
          <path d="M63.5 41.5 Q66.5 44.5 66 50.5 Q65.5 55.5 62.5 56 Q60 54.5 60.5 48 Q61 43 63.5 41.5 Z" fill={HOOD} />
          {/* small yellow cere dot at the beak base, nestled against the head edge */}
          <circle cx="74.5" cy="39.3" r="3.3" fill={CERE} />
          {/* short stubby hooked beak (falcon beaks are tiny); base overlaps the cere */}
          <path d="M76 36.8 Q84 37.5 85.5 41.5 Q86 45.3 81.8 45.8 Q83 42.5 80 41.8 Q77.8 41.4 76.3 42 Q75.4 39.2 76 36.8 Z" fill={BEAK} />
          {/* yellow eye-ring at the hood/cheek border */}
          <circle cx="64" cy="38" r="5.4" fill={CERE} />
          {/* fierce dark eye */}
          <Eye cx={64} cy={38} r={3.9} />
        </g>
      );
    },
  },
  // 33 - ORANGE-HEADED THRUSH. Glowing orange head + underparts, blue-grey back and wing.
  {
    name: "Orange-headed Thrush",
    skip: WARMS,
    draw: () => {
      const ORG = "#E08A2E", GLOW = "#F2A648", GLOWH = "#FBC066";
            const GREY = "#67737F", GREYD = "#56616C", LEG = "#5A4A38", BILL = "#8A6A3A";
            return (
              <g>
                {/* hint of leg below - anchors the upright thrush stance */}
                <path d="M50 80 Q49.4 86 50.2 90 Q52 91 53.4 90 Q53.6 86 53 80 Z" fill={LEG} />
                {/* cool blue-grey back + folded wing, hugging the body */}
                <path d="M52 36 Q30 36 25 58 Q24 78 41 83 Q47 64 49 48 Q49 40 52 36 Z" fill={GREY} />
                <ellipse cx="36" cy="60" rx="11" ry="18" fill={GREYD} transform="rotate(-9 36 60)" />
                {/* plump orange body (breast + belly) - the dominant warm mass */}
                <path d="M52 39 Q74 43 73 64 Q72 82 52 83 Q41 82 43 62 Q44 46 52 39 Z" fill={ORG} />
                {/* two-step glow so the orange reads as glowing, not flat */}
                <ellipse cx="58" cy="58" rx="11" ry="15" fill={GLOW} />
                <ellipse cx="59" cy="55" rx="6" ry="9" fill={GLOWH} />
                {/* rounded head, clearly set off above the body, glowing orange */}
                <circle cx="59" cy="33" r="13" fill={ORG} />
                <path d="M54 26 Q59 21 65 25 Q69 29 66 34 Q60 30 54 31 Q52 28 54 26 Z" fill={GLOW} />
                {/* soft rounded petal bill */}
                {beak(70, 33, 9, 2.4, BILL)}
                {/* dark thrush eye */}
                <Eye cx={62} cy={32} r={3.8} />
              </g>
            );
    },
  },
  // 34 - BLUE-FACED MALKOHA. Dark olive body, bold blue facial patch around the eye, green bill.
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
  // 35 - JACOBIN (PIED) CUCKOO. Black above, white below, tall pointed crest, white wing patch.
  {
    name: "Jacobin Cuckoo",
    skip: [],
    draw: () => {
      const BLK = "#2E2A2C", BLKL = "#3C3838", WHT = "#F2ECDE", WHTS = "#E2DBCB", BILL = "#3A352E";
      return (
        <g>
          {/* longish tail sweeping down-back (breaks the penguin egg); rounded petal tip, not a needle */}
          <path d="M40 60 Q30 74 21 86 Q17 90 14 86 Q14 82 18 78 Q27 68 33 56 Z" fill={BLK} />
          <path d="M22 80 Q25 84 22 86 Q20 86 19 84 Z" fill={WHTS} />
          {/* black upper body (a soft tilted ovoid, NOT a plain circle) */}
          <ellipse cx="50" cy="57" rx="28" ry="27" fill={BLK} transform="rotate(-8 50 57)" />
          {/* white underparts - a clean rounded belly, the pied lower half */}
          <path d="M48 44 Q72 46 73 66 Q73 84 52 85 Q38 85 36 70 Q36 52 48 44 Z" fill={WHT} />
          {/* bold white wing-flash across the dark mantle */}
          <path d="M30 49 Q44 46 49 56 Q44 64 31 63 Q26 56 30 49 Z" fill={WHT} transform="rotate(-8 38 56)" />
          {/* distinct head set apart on a short neck */}
          <circle cx="58" cy="40" r="13.5" fill={BLK} />
          {/* jaunty crest: a soft rounded backswept tuft (rounded tip, no sharp horn) */}
          <path d="M52 31 Q49 17 58 13 Q66 12 65 19 Q63 26 61 33 Q56 30 52 31 Z" fill={BLK} />
          <path d="M55 24 Q58 17 62 17 Q63 20 61 26 Q58 25 55 24 Z" fill={BLKL} />
          {/* soft rounded petal bill */}
          {beak(70, 41, 9, 2.7, BILL)}
          <Eye cx={61} cy={39} r={3.8} />
        </g>
      );
    },
  },
  // 36 - BLACK EAGLE. All-black soaring raptor, fierce brow, hooked beak, yellow cere + eye.
  {
    name: "Black Eagle",
    skip: [],
    draw: () => {
      const SOOT = "#3A332C", SOOTL = "#5A4F42", NAPE = "#7A6A52", CERE = "#E7B833", BEAK = "#3D3833", FOOT = "#E0B23C";
            return (
              <g>
                {/* broad swept raptor wing behind the body (rounded trailing-edge scallops, no sharp fingers) */}
                <path d="M50 50 Q24 44 14 60 Q11 67 17 70 Q22 67 27 69 Q24 73 28 75 Q33 71 38 73 Q35 77 40 78 Q47 70 52 64 Q54 56 50 50 Z" fill={SOOT} />
                {/* sooty-brown body (a soft tilted ovoid, not a plain circle) */}
                <ellipse cx="49" cy="57" rx="30" ry="29" fill={SOOT} transform="rotate(-8 49 57)" />
                {/* warmer lit underside so the dark mass is not a flat void */}
                <path d="M50 46 Q74 50 72 74 Q60 84 48 78 Q44 60 50 46 Z" fill={SOOTL} />
                {/* feather/plumage texture: rows of soft rounded scallops across body + wing */}
                {[[30,52],[42,50],[26,62],[38,60],[50,58],[30,72],[44,70],[58,66],[58,52]].map(([x,y],k)=>(
                  <path key={k} d={`M${x-6} ${y} Q${x} ${y+5} ${x+6} ${y}`} stroke={mix(SOOT,"#000",0.22)} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.5" />
                ))}
                {/* paler tawny nape patch (the field cue the owner asked to see) */}
                <path d="M44 44 Q56 38 67 46 Q60 47 53 50 Q48 49 44 52 Z" fill={NAPE} opacity="0.9" />
                {/* head */}
                <circle cx="58" cy="44" r="15" fill={SOOT} />
                {/* heavy fierce overhanging brow (a soft rounded shelf above the eye) */}
                <path d="M50 38 Q60 31 70 37 Q72 40 70 43 Q60 38 52 42 Q50 40 50 38 Z" fill={mix(SOOT,"#000",0.3)} />
                {/* yellow cere then dark hooked tip (the hook is a soft curve, no needle) */}
                <path d="M67 41 Q80 41 80 49 Q76 47 70 48 Q67 45 67 41 Z" fill={CERE} />
                <path d="M74 43 Q83 45 79 51 Q76 51 74 49 Q73 46 74 43 Z" fill={BEAK} />
                {/* glowing yellow eye */}
                <circle cx="59" cy="43" r="4.4" fill={CERE} />
                <circle cx="59" cy="43" r="2.1" fill={INK} />
                <circle cx="57.7" cy="41.7" r="0.9" fill={WHITE} />
                {/* yellow taloned foot tucked under (rounded toes, no spikes) */}
                <path d="M46 80 Q52 78 56 82 Q54 84 51 83 Q49 85 47 83 Q45 84 44 82 Q44 80 46 80 Z" fill={FOOT} />
              </g>
            );
    },
  },
  // 37 - RED AVADAVAT. A glowing red berry of a body with a few cream pearl-pips, coral bill.
  {
    name: "Red Avadavat",
    skip: WARMS,
    draw: () => {
      const RED = "#C0392B", REDD = "#A83227", PIP = "#F1E9D6";
      return (
        <g>
          <circle cx="49" cy="55" r="32" fill={RED} />
          <ellipse cx="52" cy="65" rx="20" ry="15" fill={REDD} />
          {[[36, 52], [44, 62], [54, 58], [34, 65], [48, 71], [62, 64]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="2.6" fill={PIP} />
          ))}
          {beak(74, 48, 10, 3.2, "#E0533B")}
          <Eye cx={61} cy={45} />
        </g>
      );
    },
  },
  // 38 - COMMON KINGFISHER. A vivid two-tone jewel: electric cyan top, rufous-orange belly, white dab.
  {
    name: "Common Kingfisher",
    skip: BLUES,
    draw: () => {
      const CYAN = "#1FA6D6", CYANL = "#3FD0F0", TEAL = "#1483B0", COB = "#2E5FB0", ORG = "#D2691E", ORGD = "#BF5C18", DAGGER = mix(INK, "#000", 0.12), GLOSS = mix(DAGGER, "#fff", 0.28);
      return (
        <g>
          {/* short stubby tail-nub poking down-back (kingfishers are near tail-less - the silhouette break vs long-tailed cuckoos) */}
          <path d="M36 71 Q26 77 22 85 Q20 89 24 88 Q32 83 42 76 Q43 72 36 71 Z" fill={TEAL} />
          {/* compact DUMPY body mass, gently tilted so it never reads as a plain ball */}
          <ellipse cx="46" cy="62" rx="25" ry="23" fill={CYAN} transform="rotate(-6 46 62)" />
          {/* glowing electric-cyan back-stripe down the mantle (the lit kingfisher back line) */}
          <path d="M41 42 Q29 53 26 73 Q31 71 35 60 Q40 49 48 45 Q45 41 41 42 Z" fill={CYANL} opacity="0.95" />
          {/* rufous-orange underparts: ONE warm zone wrapping belly + lower front */}
          <path d="M47 55 Q74 57 73 80 Q57 88 42 81 Q39 64 47 55 Z" fill={ORG} />
          <ellipse cx="56" cy="73" rx="13" ry="10" fill={ORGD} />
          {/* OVERSIZED head set high + forward (the top-heavy big-headed signature) */}
          <circle cx="62" cy="40" r="19" fill={CYAN} />
          {/* rounded cobalt crown hugging the dome of the head (rounded, no point, no flat brim) */}
          <path d="M44 40 Q43 22 60 18 Q77 17 81 32 Q82 40 79 45 Q74 33 62 33 Q51 34 46 44 Q44 43 44 40 Z" fill={COB} />
          {/* rufous cheek wrapping under + behind the eye, continuous with the warm underside */}
          <path d="M58 44 Q74 45 76 58 Q72 62 62 60 Q54 53 58 44 Z" fill={ORG} />
          {/* white neck-patch (the diagnostic side dab) at the cheek/neck join */}
          <ellipse cx="54" cy="51" rx="5.8" ry="6.2" fill={WHITE} />
          {/* long STOUT dagger bill: rounded tip + rounded base, no sharper than the Flameback chisel ceiling */}
          <path d="M76 37 L93 40 Q96.5 41.4 93 42.8 L76 46 Q74 41.5 76 37 Z" fill={DAGGER} />
          {/* faint gloss ridge so the bill reads as a three-dimensional dagger */}
          <path d="M77 38.5 L91 41 Q92.5 41.5 91 42 L77 44.5 Z" fill={GLOSS} opacity="0.5" />
          <Eye cx={66} cy={38} r={4.2} />
        </g>
      );
    },
  },
  // 39 - JERDON'S LEAFBIRD. A bright leaf-green bird read in three clean zones: a green body, a
  // green head set up-forward, and ONE neat connected black face-and-throat patch (forehead, chin
  // and throat as a single rounded shape with clean edges). A short turquoise moustache streak sits
  // at the lower jaw, the eye sits inside the black, and a soft bill points out the front. The old
  // muddy orange smudge is dropped to a subtle low shoulder wash so nothing crisscrosses the face.
  {
    name: "Jerdon's Leafbird",
    skip: GREENS,
    draw: () => {
      const GRN = "#4FA63C", GRNL = "#67C04A", DARK = "#3C7E2B", BIB = "#23201C",
        TURQ = "#3FC2D6", ORG = "#D98A38";
      return (
        <g>
          {/* leaf-green body mass: one confident round zone */}
          <circle cx="47" cy="58" r="31" fill={GRN} />
          {/* folded wing: one clean darker-green rounded panel hugging the back/flank (gives form) */}
          <path d="M24 50 Q40 44 52 52 Q50 70 40 82 Q26 80 22 64 Q21 56 24 50 Z" fill={DARK} />
          {/* subtle lime breast lift so the green mass is not flat (well below the face, no crisscross) */}
          <ellipse cx="50" cy="70" rx="16" ry="11" fill={GRNL} opacity="0.8" />
          {/* faint warm shoulder wash low on the flank, kept clear of the black face */}
          <ellipse cx="40" cy="68" rx="9" ry="7" fill={mix(ORG, GRN, 0.45)} opacity="0.55" />
          {/* rounded green head set clearly up and forward (the songbird crown) */}
          <circle cx="58" cy="42" r="16" fill={GRN} />
          {/* SIGNATURE: ONE connected black face-and-throat patch (forehead, chin, throat, upper breast),
              a single rounded lobe with clean edges across the front of the head and down the throat */}
          <path d="M51 30 Q62 27 71 37 Q74 46 72 56 Q67 69 55 71 Q47 69 45 58 Q44 47 47 38 Q48 33 51 30 Z" fill={BIB} />
          {/* short turquoise moustache streak at the lower jaw of the black (rounded, no spike) */}
          <path d="M54 56 Q61 56 65 60 Q60 61 55 61 Q52 59 54 56 Z" fill={TURQ} />
          {/* soft stout petal bill pointing out the front of the face */}
          {beak(71, 41, 9, 2.8, "#3A352E")}
          {/* eye sitting inside the black patch so it reads as a dark-faced bird */}
          <Eye cx={61} cy={40} r={4.2} />
        </g>
      );
    },
  },
  // 40 - BRAHMINY KITE. White hood + breast against a rich chestnut body; pale hooked beak.
  {
    name: "Brahminy Kite",
    skip: WARMS,
    draw: () => {
      const WHT = "#F4F1E6", CHES = "#A8431F";
      return (
        <g>
          <circle cx="49" cy="56" r="32" fill={CHES} />
          {/* black wingtip */}
          <path d="M23 61 Q20 79 41 83 Q34 70 32.4 61 Q31 59 28 59 Q24 59 23 61 Z" fill="#1A1A1A" />
          {/* white head + breast */}
          <path d="M50 26 Q72 30 70 56 Q60 68 48 64 Q42 44 50 26 Z" fill={WHT} />
          <circle cx="55" cy="40" r="15" fill={WHT} />
          {/* pale-yellow hooked beak */}
          <path d="M68 38 Q80 38 80 45 Q76 43 70 44 Q67 41 68 38 Z" fill="#E0C24A" />
          <Eye cx={58} cy={39} />
        </g>
      );
    },
  },
  // 41 - BLACK-RUMPED FLAMEBACK. Golden back, scarlet crest, white flecked underparts (woodpecker).
  {
    name: "Flameback",
    skip: [7],
    draw: () => {
      const GOLD = "#C7A12A", GOLDD = "#9C7A12";
            const CREAM = "#F1EBD8", SCALE = "#3A352E";
            const RED = "#D8392B", REDD = "#B62A21";
            const BLK = "#2B2824";
            return (
              <g>
                {/* golden-olive back/body mass */}
                <ellipse cx="46" cy="58" rx="28" ry="30" fill={GOLD} />
                {/* darker folded wing panel low-front, so the gold reads as a wing not a hole */}
                <path d="M30 50 Q24 70 40 82 Q52 70 50 54 Q42 48 30 50 Z" fill={GOLDD} />
                {/* cream white underparts sweeping up the front to the throat */}
                <path d="M50 40 Q72 44 71 70 Q67 85 52 85 Q44 70 46 56 Q47 46 50 40 Z" fill={CREAM} />
                {/* soft round scaly spots (woodpecker scaling) */}
                {[[59, 55], [65, 61], [58, 66], [64, 72], [56, 77]].map(([x, y], k) => (
                  <circle key={k} cx={x} cy={y} r={k > 2 ? 1.7 : 1.9} fill={SCALE} />
                ))}
                {/* head: cream profile head merged onto the upper body */}
                <circle cx="58" cy="44" r="14.5" fill={CREAM} />
                {/* clean black eye-stripe hugging the head curve, rounded both ends */}
                <path d="M52 43 Q64 41 74 46 Q75 49 73 50.5 Q64 46 54 49 Q50.5 46 52 43 Z" fill={BLK} />
                {/* black malar/moustache stripe, lower and rounded */}
                <path d="M53 53 Q63 54 71 59 Q70 62 67 62 Q60 58 54 58 Q51 55 53 53 Z" fill={BLK} />
                {/* swept-back crimson crest: ONE smooth dome over the crown, sweeping down the nape behind
                    the head. Outer edge one arc; lower edge curves gently back. No notch, no spike. */}
                <path d="M65 35 Q63 20 49 16 Q36 14 30 23 Q27 30 33 36 Q40 41 47 50 Q52 53 55 49 Q56 42 58 38 Q61 36 65 35 Z" fill={RED} />
                {/* soft darker crown fold for depth, fully rounded */}
                <path d="M41 22 Q34 23 32 29 Q37 33 44 33 Q47 28 46 23 Q44 22 41 22 Z" fill={REDD} />
                {/* strong straight chisel bill, rounded tip + rounded base (soft wedge, never a needle) */}
                <path d="M71 43 L84 45.2 Q87 46.4 84 47.6 L71 51 Q69.5 47 71 43 Z" fill={INK} />
                {/* faint gloss ridge down the bill so it reads as a chisel */}
                <path d="M72 44.5 L83 46.3 Q84.5 46.8 83 47.3 L72 49.5 Z" fill={mix(INK, "#fff", 0.12)} opacity="0.5" />
                <Eye cx={61} cy={44} r={4} />
              </g>
            );
    },
  },
  // 42 - BAY-BACKED SHRIKE. Broad black bandit mask over a bay-chestnut back + blue-grey crown.
  {
    name: "Bay-backed Shrike",
    skip: WARMS,
    draw: () => {
      const BAY = "#A04A2A", BAYD = mix(BAY, "#3A1E10", 0.45), CREAM = "#E7D6B4", MASK = "#241F1C", BILL = "#6E5B49";
            return (
              <g>
                {/* one real tail: a soft rounded blade sweeping down-and-back from the body */}
                <path d="M40 70 Q27 80 19 92 Q17 96 23 94 Q34 87 47 78 Q50 73 40 70 Z" fill={BAYD} />
                {/* leg hint below the body - anchors the perched stance (like the thrush) */}
                <path d="M52 82 Q51.4 88 52.2 92 Q54 93 55.4 92 Q55.6 88 55 82 Z" fill={BILL} />
                {/* plump bay body - the dominant warm mass */}
                <ellipse cx="50" cy="60" rx="27" ry="25" fill={BAY} />
                {/* folded-wing back zone: one darker bay panel hugging the upper-rear, gives a clear wing */}
                <path d="M48 41 Q29 44 27 63 Q28 78 41 81 Q44 64 47 51 Q47 45 48 41 Z" fill={BAYD} />
                {/* pale lower-belly: a clean zone fully bounded by the body (no floating panel) */}
                <path d="M53 57 Q69 61 66 75 Q57 82 49 76 Q49 65 53 57 Z" fill={CREAM} />
                {/* separate rounded HEAD set clearly above the body - this is what makes it read as a bird */}
                <circle cx="58" cy="36" r="14" fill={BAY} />
                {/* THE SIGNATURE: one bold black bandit mask through the eye, sitting only on the head */}
                <path d="M47 35 Q60 30 72 36 Q73 40 70 43 Q60 38 49 41 Q45 39 47 35 Z" fill={MASK} />
                {/* soft hooked bill, paler than the mask, clearly to the right of the head */}
                <path d="M71 37 Q81 38 81 42 Q80.5 45.2 76.5 44 Q78 42 76 41 Q73.5 40.5 71 41 Z" fill={BILL} />
                <Eye cx={60} cy={38} r={3.8} />
              </g>
            );
    },
  },
  // 43 - PURPLE-RUMPED SUNBIRD. Metallic-green back, maroon throat, glowing lemon-yellow belly.
  {
    name: "Purple-rumped Sunbird",
    skip: GREENS,
    draw: () => {
      const GRN = "#277C49", GRNL = mix(GRN, "#86CE6E", 0.45), GRND = mix(GRN, "#0C3A22", 0.5);
      const MAR = "#82273A", YEL = "#EBC73C", YELL = mix(YEL, "#fff", 0.4), BILL = "#2C2823";
      return (
        <g>
          {/* ONE plump green body mass: a tall ovoid, metallic-green back + raised head together (the whole jewel) */}
          <ellipse cx="49" cy="55" rx="27" ry="30" fill={GRN} transform="rotate(8 49 55)" />
          {/* soft darker-green folded wing down the back so the green reads as a wing, not a flat ball */}
          <path d="M34 48 Q26 62 35 80 Q45 76 47 60 Q46 51 42 46 Q37 45 34 48 Z" fill={GRND} />
          {/* metallic-green sheen catching the upper back/shoulder */}
          <ellipse cx="44" cy="50" rx="11" ry="8" fill={GRNL} opacity="0.6" transform="rotate(-14 44 50)" />
          {/* glowing lemon-yellow belly: one clean rounded lower-front panel, clearly parted from the green */}
          <path d="M52 56 Q70 60 67 76 Q57 85 45 80 Q42 67 47 59 Q49 54 52 56 Z" fill={YEL} />
          <ellipse cx="56" cy="69" rx="7.5" ry="8" fill={YELL} opacity="0.5" />
          {/* bold MAROON throat patch: one clean crescent under the bill, parting green head from lemon belly */}
          <path d="M55 47 Q70 49 70 57 Q62 62 53 58 Q48 52 55 47 Z" fill={MAR} />
          {/* fine short DOWN-CURVED sunbird bill: a slim forward-and-down arc, rounded tip, well inside the chisel ceiling */}
          <path d="M71 41 Q82 41.5 84 47 Q84.5 49 82.5 48.5 Q80.5 47 79 45 Q76 42 71 43.5 Q70 42.3 71 41 Z" fill={BILL} />
          <Eye cx={64} cy={42} r={3.6} />
        </g>
      );
    },
  },
  // 44 - TICKELL'S BLUE FLYCATCHER. Cobalt hood/back, rusty-orange throat fading to a pale belly.
  {
    name: "Tickell's Blue Flycatcher",
    skip: BLUES,
    draw: () => {
      const COB = "#2F6FD0";
            const WING = mix(COB, "#000", 0.22);
            const SHEEN = mix(COB, "#3C7CD8", 0.6);
            const BROW = "#4F9BE6";
            const TAIL = mix(COB, "#000", 0.3);
            const TAILD = mix(COB, "#000", 0.46);
            const ORG = "#D9763A";
            const ORGL = mix(ORG, WHITE, 0.16);
            const CRM = "#EFE6D2";
            const BILL = "#2E2A30";
            return (
              <g>
                {/* cocked-up tail at the lower-left, a broad rounded petal (the upright-perched cue) */}
                <path d="M42 66 Q28 72 19 86 Q16 92 22 90 Q35 82 47 73 Q49 66 42 66 Z" fill={TAIL} />
                <path d="M24 83 Q28 87 24 90 Q21 89 21 86 Z" fill={TAILD} />
                {/* upright body: a tall ovoid, long axis vertical, slight back-tilt (NOT a plain circle) */}
                <ellipse cx="50" cy="60" rx="24" ry="29" fill={COB} transform="rotate(7 50 60)" />
                {/* folded blue wing down the back so the upper blue reads as a wing, not a flat ball */}
                <path d="M35 50 Q27 66 38 84 Q47 78 50 62 Q49 52 45 47 Q39 46 35 50 Z" fill={WING} />
                <ellipse cx="42" cy="56" rx="9" ry="15" fill={SHEEN} opacity="0.55" transform="rotate(10 42 56)" />
                {/* PEAKED alert head: a rounded crown rising to a soft peak, set clearly above the shoulders */}
                <path d="M36 41 Q34 22 45 16 Q53 12.5 60 18 Q68 24 67 36 Q65 47 51 48 Q39 48 36 41 Z" fill={COB} />
                {/* bright sky-blue forehead glint over the brow (the electric supercilium) */}
                <path d="M40 30 Q49 21 60 26 Q63 27.4 60 29 Q51 29 45 33 Q40 33 40 30 Z" fill={BROW} />
                {/* rusty-orange throat + breast bib, high on the chest, clean curved lower edge */}
                <path d="M47 42 Q66 44 68 57 Q68 67 56 69 Q46 67 44 56 Q44 47 47 42 Z" fill={ORG} />
                <ellipse cx="55" cy="50" rx="8" ry="7" fill={ORGL} opacity="0.6" />
                {/* white belly below the bib, with a clean two-tone separation */}
                <path d="M46 65 Q57 68 65 64 Q68 76 58 83 Q48 85 43 77 Q43 69 46 65 Z" fill={CRM} />
                {/* tiny soft rounded petal bill (deliberately small, vs the Kingfisher dagger) */}
                {beak(63, 41.4, 8, 2.4, BILL)}
                {/* big alert eye set high on the peaked head */}
                <Eye cx={55} cy={36} r={4.6} />
              </g>
            );
    },
  },
  // 45 - CHESTNUT-HEADED BEE-EATER. Green body with a FULL chestnut head + yellow throat.
  {
    name: "Chestnut-headed Bee-eater",
    skip: GREENS,
    draw: () => {
      const GRN = "#4FA05E";                 // bee-eater green body
      const GRND = mix(GRN, "#000", 0.2);    // darker folded-wing green for depth
      const GRNL = mix(GRN, "#fff", 0.14);   // soft back highlight
      const CHES = "#9C5A2E";                // full chestnut cap
      const CHESL = mix(CHES, "#fff", 0.14); // soft cap highlight
      const YEL = "#E6C23C";                 // yellow throat
      const YELL = mix(YEL, "#fff", 0.2);    // throat glow
      const BILL = "#2E2A26";                // soft dark bill
      return (
        <g>
          {/* one slim rounded green tail-streamer sweeping down-back-left (the bee-eater cue, reads as a tail not a slash) */}
          <path d="M34 64 Q22 73 13 85 Q10.5 89 15 87 Q27 80 38 72 Q42 69 42 65 Q40 62 34 64 Z" fill={GRND} />
          {/* slim elongated green body, gently tilted so it reads slender, not a fat ball */}
          <ellipse cx="48" cy="58" rx="32" ry="25" fill={GRN} transform="rotate(-10 48 58)" />
          {/* soft back highlight so the green has form */}
          <ellipse cx="42" cy="50" rx="20" ry="9" fill={GRNL} opacity="0.55" transform="rotate(-12 42 50)" />
          {/* darker folded wing low on the body so the green is never flat */}
          <path d="M30 56 Q22 70 36 80 Q48 70 47 58 Q40 53 30 56 Z" fill={GRND} />
          {/* green head clearly set forward + up on the slim body */}
          <circle cx="61" cy="44" r="14" fill={GRN} />
          {/* THE SIGNATURE: full chestnut cap as ONE clean rounded shape over crown + nape, no notches */}
          <path d="M47 47 Q46 28 62 26 Q77 27 78 43 Q78 50 73 51 Q70 41 61 40 Q52 41 49 50 Q47 50 47 47 Z" fill={CHES} />
          <ellipse cx="62" cy="33" rx="9" ry="6" fill={CHESL} opacity="0.6" />
          {/* tidy yellow throat tucked under the chin, clean rounded lower edge */}
          <path d="M58 52 Q71 53 71 62 Q65 67 56 64 Q53 57 58 52 Z" fill={YEL} />
          <ellipse cx="62" cy="57" rx="5" ry="4" fill={YELL} opacity="0.7" />
          {/* one soft dark bee-eater bill (a single petal, softer than the Flameback chisel) */}
          {beak(73, 47, 9.5, 2.6, BILL)}
          <Eye cx={63} cy={43} r={3.9} />
        </g>
      );
    },
  },
  // 46 - TRICOLORED MUNIA. Three clean blocks: black hood + breast, chestnut back, white belly.
  {
    name: "Tricolored Munia",
    skip: WARMS,
    draw: () => {
      const BLK = "#14110F", CHES = "#7A3A23", WHT = "#F4F1E6";
      return (
        <g>
          <circle cx="49" cy="55" r="31" fill={CHES} />
          {/* black hood + breast */}
          <circle cx="55" cy="44" r="15" fill={BLK} />
          <path d="M44 50 Q58 52 60 63 Q52 67 46 62 Q44 56 44 50 Z" fill={BLK} />
          {/* white belly */}
          <path d="M50 61 Q70 65 66 80 Q54 84 46 78 Q46 67 50 61 Z" fill={WHT} />
          {/* stout pale conical bill, rounded tip */}
          <path d="M68 42 L79 45.5 Q82 47 79 48.5 L68 52 Z" fill="#B7C2CB" />
          <Eye cx={58} cy={43} />
        </g>
      );
    },
  },
  // 47 - SMALL MINIVET. A slim, long-tailed dainty bird: clean cool-grey hood + upperparts, a vivid
  // flame-orange breast/rump, and the diagnostic orange wing-flash on a dark folded wing. The LONG
  // graduated tail (about as long as the body) is the silhouette break - never a plump ball.
  {
    name: "Small Minivet",
    skip: [],
    draw: () => {
      const SLATE = "#5C646C";      // clean cool blue-slate (B highest, R lowest) - never violet
            const SLATED = "#454B52";     // darker slate: cap, folded wing, tail
            const SLATEL = "#777F87";     // pale cool cheek so the small dark bill reads
            const FLAME = "#E8642A";      // flame-orange breast + rump
            const FLAMEL = "#F0894A";     // soft inner glow on the breast
            const FIRE = "#F4A638";       // bright orange wing-flash (the minivet signature)
            const BILL = "#2A2730";
            return (
              <g>
                {/* LONG GRADUATED TAIL: a slim tail sweeping down-and-back, about as long as the body itself -
                    the unmistakable dainty long-tailed minivet cue. One closed shape, soft rounded lobe tip, no needle. */}
                <path d="M43 64 Q31 73 22 83 Q17 89 13 90 Q12 87 15 83 Q23 73 31 64 Q37 57 44 56 Q49 58 47 63 Q46 67 43 70 Q40 70 43 64 Z" fill={SLATED} />
                <path d="M21 82 Q16 87 14 89 Q17 87 23 81 Q24 80 21 82 Z" fill={mix(SLATED, "#000", 0.2)} />
                {/* SLIM perched body: a narrow tilted ovoid, clearly slimmer than it is tall, so it never reads
                    as a plump ball. Mass sits near (49,55). */}
                <g transform="rotate(15 49 56)">
                  <ellipse cx="49" cy="56" rx="17" ry="27" fill={SLATE} />
                </g>
                {/* flame-orange breast: a clean bounded panel down the slim front (not a wash), with a soft inner glow */}
                <path d="M52 45 Q64 48 63 66 Q60 79 50 78 Q43 76 43 67 Q43 55 47 48 Q49 45 52 45 Z" fill={FLAME} />
                <path d="M52 53 Q59 56 57 67 Q53 73 49 70 Q47 61 50 54 Q51 52 52 53 Z" fill={FLAMEL} opacity="0.75" />
                {/* dark folded wing: a slim panel hugging the slate back (keeps the body reading slim, not round) */}
                <path d="M41 43 Q32 50 34 68 Q36 76 43 74 Q45 60 45 49 Q45 43 41 43 Z" fill={SLATED} />
                {/* THE wing-flash: a single crisp flame bar set into the dark wing - the diagnostic Small Minivet mark */}
                <path d="M38 52 Q35 58 37 66 Q40 68 42 65 Q43 58 42 53 Q41 50 38 52 Z" fill={FIRE} />
                {/* small round head, set high + forward, clean cool slate (dainty proportion) */}
                <circle cx="59" cy="36" r="12.5" fill={SLATE} />
                {/* darker slate cap hugging the crown (rounded, no edge) */}
                <path d="M48 33 Q59 24 70 32 Q72 34 69 36 Q59 32 51 37 Q48 36 48 33 Z" fill={SLATED} />
                {/* faint cool-grey cheek so the dark bill has contrast (clean grey, never violet) */}
                <ellipse cx="64" cy="40" rx="6" ry="4.6" fill={SLATEL} opacity="0.65" />
                {beak(70, 40, 8, 2.4, BILL)}
                <Eye cx={61} cy={36} r={3.9} />
              </g>
            );
    },
  },
  // 48 - ORANGE-BREASTED GREEN-PIGEON. Fat green barrel with bold lilac-over-orange breast bands.
  {
    name: "Green-Pigeon",
    skip: GREENS,
    draw: () => {
      const GRN = "#8FB84A", GREY = "#9AA38C", LILAC = "#C98AA8", ORG = "#E0913A", BELLY = "#B6C46A";
      return (
        <g>
          <ellipse cx="48" cy="56" rx="31" ry="29" fill={GRN} />
          {/* grey crown */}
          <path d="M30 44.5 Q44 31 63 39 Q66.4 40 63.5 41.2 Q52 42 44 45 Q40 46.5 30 44.5 Z" fill={GREY} />
          {/* pale belly */}
          <ellipse cx="52" cy="69" rx="18" ry="12" fill={BELLY} />
          {/* breast bands: lilac over orange (solid blocks) */}
          <path d="M40 50 Q56 52 69 50 L69 55 Q56 57 40 55 Z" fill={LILAC} />
          <path d="M40 56 Q56 58 69 56 L69 62 Q56 64 40 62 Z" fill={ORG} />
          {/* head */}
          <circle cx="58" cy="44" r="11" fill={GRN} />
          <path d="M52 40 Q60 36 66 40 Q59 41 55 43 Z" fill={GREY} />
          {beak(68, 45, 8, 2.6, "#C9C2B4")}
          {/* stubby red legs */}
          <rect x="44" y="82" width="3" height="6" rx="1.5" fill="#C24A3A" />
          <rect x="54" y="82" width="3" height="6" rx="1.5" fill="#C24A3A" />
          <Eye cx={61} cy={43} />
        </g>
      );
    },
  },
  // 49 - INDIAN WHITE-EYE. Olive-green, yellow throat, pale belly, and a BOLD white spectacle.
  {
    name: "Indian White-eye",
    skip: GREENS,
    draw: () => {
      const OLV = "#7FA63A", YEL = "#E6C23C", BELLY = "#E8E4D2";
      return (
        <g>
          <circle cx="49" cy="55" r="31" fill={OLV} />
          {/* yellow throat/breast */}
          <path d="M48 48 Q49 45.8 51.2 46.4 Q68 48 66 64 Q56 70 48 64 Q46 54 48 48 Z" fill={YEL} />
          {/* pale belly */}
          <ellipse cx="52" cy="70" rx="15" ry="10" fill={BELLY} />
          {/* bold white eye-ring (the signature) */}
          <circle cx="60" cy="44" r="7" fill="#FBF8F1" />
          <Eye cx={60} cy={44} r={4} />
          {beak(72, 46, 7, 2.2, "#3A352E")}
        </g>
      );
    },
  },
  // 50 - INDIAN ROLLER. Cinnamon breast + bold turquoise/cobalt wing bands. Chunky big head.
  //
  // RESERVED, and deliberately the last entry. The hashable pool is indices 0..49
  // (BIRD_SPECIES_COUNT is 50, so `hash % 50` can never reach 50), which means no member can land
  // on this bird by chance and there is no remap to maintain, unlike the Hoopoe's exclusion at
  // index 0. It belongs to the owner alone (owner, 2026-08-04) and is kept off the public gallery
  // by GALLERY_SPECIES below. Its short name stays "Roller" so its measured entry in
  // bird-adjust.json keeps applying.
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
];

export const ARCHETYPE_COUNT = ARCHES.length;

/** Exposed for the optical-centering harness (preview/centroid + scripts/dev/centroid.mjs). */
export const ARCHETYPES = ARCHES;

/**
 * Full common names, 1:1 by index with ARCHES. `arche.name` stays a short internal key (it indexes
 * ADJUST_MAP in bird-adjust.json and the centroid tooling in scripts/dev/centroid.mjs, so it is not
 * renamed); this is the user-facing name everywhere a member's species is shown ("You're a X",
 * profile tooltip, the all-species gallery). Keep in sync with ARCHES order if a species is added,
 * removed, or reordered.
 */
export const SPECIES_FULL_NAMES: string[] = [
  "Hoopoe",
  "Indian Peafowl",
  "Spotted Owlet",
  "Laughing Dove",
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
  "Indian Roller", // index 50, reserved; see the ARCHES entry and GALLERY_SPECIES below
];

/**
 * What the public bird galleries list: every species except the ones held back for one account.
 * Today that is the Indian Roller alone. The Hoopoe stays on the shelf even though no member may
 * wear it, because a gallery of the valley's birds that left out the mascot would read as an
 * omission rather than a decision.
 *
 * Fifty entries. Both /birds and /lab/birds-rv render from this one list, so the count in the page
 * copy and the birds actually shown can never drift apart.
 */
export const GALLERY_SPECIES: { index: number; name: string }[] = SPECIES_FULL_NAMES.map(
  (name, index) => ({ index, name })
).filter(({ index }) => index !== ROLLER_SPECIES_INDEX);

/**
 * The species name for a member's deterministic bird (same precedence as
 * BirdGlyphV2: a manual override wins, otherwise the id-derived hash, with the
 * Hoopoe exclusion applied). Used anywhere copy wants to say "You're a Hoopoe"
 * instead of just showing the glyph, e.g. the onboarding photo step's
 * "proudly keep your bird" option.
 * Returns the full common name (e.g. "Indian Roller", not "Roller").
 */
export function speciesNameFor(seed: string, speciesOverride?: number | null): string {
  const index = (speciesOverride ?? hashSpeciesFor(seed)) % ARCHES.length;
  return SPECIES_FULL_NAMES[index] ?? ARCHES[index].name;
}

/** kebab-case a full species name into the slug stored in `User.birdOverride`. */
function slugifySpecies(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Species slugs, 1:1 by index with ARCHES/SPECIES_FULL_NAMES (e.g. "peregrine-falcon"). */
export const SPECIES_SLUGS: string[] = SPECIES_FULL_NAMES.map(slugifySpecies);

const SLUG_TO_SPECIES_INDEX: Record<string, number> = SPECIES_SLUGS.reduce(
  (acc, slug, index) => {
    acc[slug] = index;
    return acc;
  },
  {} as Record<string, number>
);

/**
 * Which ids may wear each reserved species. A slug naming one of these resolves for the listed
 * accounts and is ignored for everyone else, so a stray or hand-set override can never dress a
 * member as the mascot or as the owner.
 */
const RESERVED_SPECIES_OWNERS: Record<number, readonly string[]> = {
  [HOOPOE_SPECIES_INDEX]: [HOOPOE_RESERVED_USER_ID],
  [ROLLER_SPECIES_INDEX]: ROLLER_RESERVED_USER_IDS,
};

/**
 * Resolves a `User.birdOverride` slug (e.g. "peregrine-falcon") to a species index, enforcing the
 * reservations above: the "hoopoe" slug only resolves for the Anonymous placeholder account and
 * "indian-roller" only for the owner. For anyone else those slugs are ignored (the caller falls
 * through to the pin/hash tiers) rather than throwing, because a bad override should cost a member
 * their preferred bird, not their avatar. Unknown slugs are ignored the same way. Returns undefined
 * when there is no applicable override.
 */
export function resolveBirdOverride(
  userId: string | null | undefined,
  birdOverride: string | null | undefined
): number | undefined {
  if (!birdOverride) return undefined;
  const index = SLUG_TO_SPECIES_INDEX[birdOverride];
  if (index === undefined) return undefined;
  const allowed = RESERVED_SPECIES_OWNERS[index];
  if (allowed && !allowed.includes(userId ?? "")) return undefined;
  return index;
}

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
 * background (BirdAvatar gives it a non-clipping container so crest/bill are never cut).
 * `speciesOverride` mirrors the BirdAvatar manual-override path. There is no colour override: the
 * disc (in the disc-bearing modes) always derives from the bird's own deterministic colour.
 */
export function BirdGlyphV2({
  seed,
  px,
  speciesOverride,
}: {
  seed: string;
  px: number;
  speciesOverride?: number | null;
}) {
  const bird = birdFor(seed);
  const arche = ARCHES[(speciesOverride ?? hashSpeciesFor(seed)) % ARCHES.length];
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
  const disc = discFor(arche, bird.colorIndex);
  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className="block" aria-hidden>
      <circle cx="50" cy="50" r="50" fill={disc} />
      <g transform={`translate(50 50) scale(${INSET_SCALE}) translate(-50 -50)`}>{inner}</g>
    </svg>
  );
}
