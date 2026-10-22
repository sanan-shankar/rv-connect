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
 * Background treatment is controlled by BG_MODE; BirdAvatar in bird-avatar.tsx renders this.
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

/**
 * The house eye: a dark disc with a catchlight up-left. `disc` defaults to INK; a bird whose head
 * is darker than INK (the Munia's near-black hood, the Shrike's mask) passes a darker disc so the
 * eye stays the darkest point on the bird (review 1, 2026-10-12). A species with a coloured eye
 * draws its own iris and pupil, the way the Koel, Coucal and Cormorant do.
 */
function Eye({ cx, cy, r = 4.4, disc = INK }: { cx: number; cy: number; r?: number; disc?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={disc} />
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
function archeTransform(a: Arche): string | undefined {
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
          <path d="M31 68 Q29 71 32.5 73 Q46 86 64 78 Q67.5 76 65 73 Q56 64 40 64 Q33 64 31 68 Z" fill={CHOC} />
          {/* white bib */}
          <ellipse cx="48" cy="58" rx="14" ry="13" fill={WHITE} />
          {/* big coral dagger: 7.5 deep where it starts beside the eye, 23 long, tapering steadily to a
              2.5-unit round point. Both long edges bow only a fourteenth of their chord, so it reads as a
              blade and not a lozenge; the rear edge is a soft bow over the chocolate head */}
          <path d="M66 39.6 Q78 39.7 88.2 43.3 Q90 44.5 88.3 45.8 Q78 47.9 66 47.1 Q63.6 43.4 66 39.6 Z" fill={RED} />
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
          <path d="M53 72 Q60 67.8 68.5 69.5 Q71.5 71 69.5 74 Q66 82 53.5 78 Q50 75.5 53 72 Z" fill={RED} />
          {/* head stripe: a 6.8-unit band along one arc with a round cap at each end (review 1 found
              both ends chopped), raised so at least 2 units of buff/green show between it and the eye */}
          <path d="M39.8 35.1 Q45.1 31.9 50.5 31 Q56 30 61.4 31.3 Q66.7 32.5 71.9 36 Q74.7 37.8 72.8 40.7 Q71 43.5 68.1 41.6 Q64 38.9 59.8 37.9 Q55.8 36.9 51.7 37.7 Q47.5 38.4 43.2 40.9 Q40.3 42.7 38.6 39.7 Q36.8 36.8 39.8 35.1 Z" fill={INK} />
          {beak(76, 50, 11, 3, "#C9B48E")}
          <Eye cx={62} cy={45.5} />
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
          <path d="M40 36 Q56 30 66.5 37 Q71.4 39.4 68 40 Q55 37.4 41 42 Q37.2 42.4 37.4 39.2 Q37.8 36.2 40 36 Z" fill={RED} />
          <path d="M35.8 62.4 Q41.1 64.8 46.3 65.6 Q51.5 66.3 56.6 65.6 Q61.8 64.8 67 62.4 Q69.1 61.5 70.1 63.5 Q71 65.6 69 66.6 Q63.2 69.2 57.3 70.1 Q51.5 71 45.6 70.1 Q39.8 69.2 34 66.6 Q31.9 65.6 32.8 63.6 Q33.8 61.5 35.8 62.4 Z" fill={RED} />
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
          {/* huge down-curved banana bill: both edges are offsets of ONE curved midline, so the bill is
              12 units deep where it leaves the head, 9 at mid-length, 6.5 at three quarters and a
              3.6-unit round tip; the culmen is the outside of the curve (convex), the lower edge the
              inside, and the rear edge over the face bows 1.5 into the bill with a rounded lower
              corner, so the face's feathering wraps the bill's base (review 2: a ruler line). Big,
              because the bill IS the hornbill; never a block, never a sickle */}
          <path d="M64.5 35.5 Q71 35 77.4 40.3 Q82.6 45.7 83.9 53.8 Q83.2 57 80.6 55.2 Q76.8 49.1 72.6 48 Q68.5 47.1 64.6 47.7 Q63.4 47.6 63.6 46.4 Q67 41 64.5 35.5 Z" fill={HORN} />
          {/* casque: a low dark ridge that reads as the culmen's own top edge (review 1: a dome as big
              as the bill fused with the eye). Its top runs about 3 units above the bill's edge and
              parallel to it, its underside under 1 unit inside the bill, its rear a round end 1.5+
              clear of the eye, its front tapering onto the bill's edge at x 75 with no step */}
          <path d="M64.6 37.6 Q63.3 36.2 64.8 34.6 Q69.5 31.6 74 36.2 Q75.2 37.5 75.6 38.8 Q70.5 36.3 64.6 37.6 Z" fill={CASQ} />
          <Eye cx={56.5} cy={41.5} />
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
                <path d="M38 66 Q27.3 72.3 21 83 Q19.6 85.4 21.1 87.2 Q22.7 89 25.5 87.8 Q37.2 82.9 45 73 Q50 67 43 64 Q40 63 38 66 Z" fill={ASHD} />
                {/* slim ashy body, tilted, perched */}
                <ellipse cx="48" cy="58" rx="27" ry="29" fill={ASH} transform="rotate(-8 48 58)" />
                {/* lit breast keeps the grey mass from reading flat */}
                <ellipse cx="53" cy="66" rx="16" ry="14" fill={ASHL} opacity="0.6" />
                {/* darker folded wing: a soft rounded panel hugging the back flank */}
                <path d="M28 50 Q21 64 28 78 Q36 84 44 79 Q40 64 41 54 Q36 48 28 50 Z" fill={ASHD} />
                <path d="M31 56 Q28 66 33 75 Q31 64 34 56 Q33 54 31 56 Z" fill={mix(ASHD, "#000", 0.18)} opacity="0.5" />
                {/* bright yellow undertail lobe tucked at the lower rear (the field cue) */}
                <path d="M30 68 Q23 73 26 83 Q33 88 41 81 Q43 73 36 68 Q33 66 30 68 Z" fill={YEL} />
                <path d="M29 72 Q25 77 29 83 Q34 85 38 79 Q38 73 32 71 Q29.6 70.6 29 72 Z" fill={YELB} opacity="0.7" />
                {/* THE STAR: glowing olive-yellow head + throat as ONE luminous hood */}
                {/* soft halo first so the yellow bleeds outward and reads as glowing, not a sticker */}
                <path d="M50 30 Q70 30 74 48 Q75 62 64 70 Q52 74 44 66 Q38 56 39 44 Q39.5 31 50 30 Z" fill={HALO} opacity="0.55" />
                {/* olive outer of the hood: covers head and flows down into the throat */}
                <path d="M51 31.5 Q68 32 71 48 Q72 60 62 67 Q52 70 46 63 Q41 54 42 44 Q42.5 32.5 51 31.5 Z" fill={YELD} />
                {/* core yellow */}
                <path d="M53 32.3 Q66 34 69 48 Q69 58 61 64 Q52 67 47 60 Q43 52 44 44 Q44.5 34 53 32.3 Z" fill={YEL} />
                {/* brightest glow toward the face, its pale centre a ring around the eye (his ¶33: the eye
                    was not in "that white circle"; review 1 found it half in, half out) */}
                <ellipse cx="58" cy="44" rx="11" ry="12" fill={YELB} opacity="0.85" />
                <circle cx="60" cy="46" r="7" fill={mix(YELB, "#FFFDEC", 0.6)} opacity="0.9" />
                {/* neat soft bulbul crest: a short backswept rounded tuft leaning forward over the brow,
                    broad at the base so it reads as a crest fused to the head, not a separate ear */}
                <path d="M48 33 Q46 19 56 16 Q64 15 63 22 Q61.5 29 56 34 Q52 32 48 33 Z" fill={YELD} />
                <path d="M49 32 Q48 20 57 17.5 Q62.5 17 61.5 23 Q60.3 29 55 33 Q52 31 49 32 Z" fill={YEL} />
                <path d="M53 22 Q55 18 58.5 18 Q59.5 20 58 24 Q55.5 23.5 53 22 Z" fill={YELB} opacity="0.85" />
                {/* dark bulbul eye sitting inside the glow so it pops */}
                <Eye cx={60} cy={46} r={4.2} />
                {/* soft rounded petal bill (softer than the Flameback chisel ceiling) */}
                {beak(71, 49, 8.5, 2.6, "#3A352E")}
              </g>
            );
    },
  },
  // 13 - RED-WHISKERED BULBUL. U3b (F1, paragraph 7: "almost angry and it's very sharp... a mess,
  // particularly the thing on top"). Eleven shapes, all round: a brown body with a darker folded wing
  // running to within 3 units of the rim so it is the bird's back, a short tail, the white bib held
  // inside brown and weighted to the front, the red vent at the lower rear under the tail, and a
  // black head set up and forward wearing ONE soft crest, a tuft 12 wide at the crown narrowing to a
  // 5-unit round top tipped a little forward (the old one was a spike over an eyebrow-shaped cap).
  // The white cheek sits under the eye and the red whisker behind the eye, with black round each.
  {
    name: "R-W Bulbul",
    skip: WARMS,
    draw: () => {
      const BRN = "#8C7258", WING = "#66513F", BLK = "#2A2628", RED = "#D8453C", BILL = "#4A443E";
      return (
        <g>
          {/* short tail down and back, round-ended, its base under the body */}
          <path d="M40 74 Q30 80 22 89 Q19 92 16.5 89.5 Q15.5 86.5 19 82 Q27 74 37 71 Z" fill={WING} />
          {/* round brown body */}
          <circle cx="47" cy="61" r="30" fill={BRN} />
          {/* folded wing: one darker lobe from the shoulder back and down the flank */}
          <path d="M44 40 Q29 43 20.5 54 Q18.5 64 24 73 Q27 76.5 30.5 70.5 Q32 58 38.5 49.5 Q40 45 44 40 Z" fill={WING} />
          {/* white throat and belly: one lobe from under the chin down the front, brown round it */}
          <path d="M60 54 Q71 59 69.5 70 Q67 79 56 80 Q48 79.5 47.5 71 Q47.5 61 53 55.5 Q56.5 53 60 54 Z" fill={WHITE} />
          {/* red vent: one lobe at the lower rear, under the tail */}
          <path d="M31.5 74.5 Q28 80 32.5 84.5 Q39 88 44 82.5 Q46 77.5 41.5 74.5 Q36.5 72 31.5 74.5 Z" fill={RED} />
          {/* the crest: one soft tuft rising from the crown, drawn under the head so its base is the head's own curve */}
          <path d="M53 31 Q51 23.5 60 19 Q62.5 16 65 19 Q68 23 65.5 33 Z" fill={BLK} />
          {/* slim dark-grey bill under the head: 4 deep at the head's edge, tapering to a soft round tip */}
          <path d="M70 39 Q77.5 38.6 83 41.3 Q84.6 42.3 83.4 43.4 Q77.5 44.8 70 43.6 Z" fill={BILL} />
          {/* black head, up and forward */}
          <circle cx="60" cy="41" r="14" fill={BLK} />
          {/* white cheek under the eye; the red whisker behind the eye, black between it and both */}
          <circle cx="63" cy="47" r="5.5" fill={WHITE} />
          <circle cx="55.5" cy="39.5" r="2.6" fill={RED} />
          <Eye cx={64} cy={36.5} r={4.2} disc="#120F10" />
        </g>
      );
    },
  },
  // 14 - ORIENTAL MAGPIE-ROBIN. Clean black-and-white pied, cocked tail. U2b (F2, paragraphs 8, 12,
  // 23): the body is shorter, and the white is the bird's own: a belly lobe on the lower front with a
  // black breast above it and a black rim below, and the white wing-bar laid along a folded wing that
  // is its own darker lobe (review 1: a bar with no wing read as a shine on a ball). The cocked tail
  // stays, solid black (its white panel left a 1.4-unit rim and read as a hole).
  {
    name: "Magpie-Robin",
    skip: [],
    draw: () => {
      const BLK = "#2E2A2C", WING = "#1C191B";
      return (
        <g>
          {/* cocked tail: a broad black paddle swept UP and back, the magpie-robin signature */}
          <path d="M41 50 Q27 44 20 31 Q18 25 24 25 Q31 28 36 36 Q45.5 44.5 49 56 Q46 53 41 50 Z" fill={BLK} />
          {/* compact body leaning slightly back so it reads as a perched bird (ry 24, was 28: he found it long) */}
          <g transform="rotate(9 49 58)">
            <ellipse cx="49" cy="58" rx="23" ry="24" fill={BLK} />
          </g>
          {/* folded wing: one darker lobe from the shoulder (under the head) back and down the flank, a 3-unit rim of body black round it */}
          <path d="M49 44 Q35 45 29.5 58 Q29.5 69 34 74.5 Q37 77.5 39 73 Q39.5 63 44 54 Q45.5 47 49 44 Z" fill={WING} />
          {/* the long white wing-bar: one lozenge lying along the wing from the shoulder back towards the tail */}
          <ellipse cx="37" cy="57" rx="6" ry="3" fill={WHITE} transform="rotate(-35 37 57)" />
          {/* the real bird's white belly: one lobe on the lower front; black breast above, a black rim below so it never merges with the page */}
          <path d="M58 58 Q66 63 62 72 Q60 79 50 79 Q43 77 44 69 Q46 61 52 58 Q55 57 58 58 Z" fill={WHITE} />
          {/* head lifted high and forward */}
          <circle cx="59" cy="38" r="13" fill={BLK} />
          {beak(71, 36, 9, 2.6, "#2E2A26")}
          {/* eye disc darker than the head so it is the darkest point on the bird */}
          <Eye cx={62} cy={35} disc="#141218" />
        </g>
      );
    },
  },
  // 15 - INDIAN ROBIN. U3b (F3, Q9, paragraph 36: "looks like a bird trying to wave"). A parallel bar
  // held up off a round body is an arm (review 1), so the tail is now a FAN built the Magpie-Robin's
  // way: its two edges leave the body's upper-left about 10 units apart and spread to a 12-unit
  // rounded end, lying along the back at about 50 degrees, the upper edge running on into the body.
  // Round body, the Magpie-Robin's family (14): a blue-black lit wing lobe with the white shoulder
  // patch wholly on it, the chestnut vent a lobe lying along the body's lower curve, the head up and
  // forward, a slim grey bill. Eight shapes.
  {
    name: "Indian Robin",
    skip: [],
    draw: () => {
      const BLK = "#2C2A30", SHEEN = "#3C3F58", CHES = "#B8552A", BILL = "#55504A";
      return (
        <g>
          {/* cocked tail: a fan, narrow where it leaves the body and widening to a round end, its root under the body */}
          <path d="M31.1 52 Q21.35 45.8 15.4 36.4 Q16 29.4 23 30 Q33.5 36 35.7 48.2 Z" fill={BLK} />
          {/* round body leaning a touch back so it reads as perched */}
          <g transform="rotate(9 50 58)">
            <ellipse cx="50" cy="58" rx="24" ry="25" fill={BLK} />
          </g>
          {/* folded wing: the one lit region on a dark bird, a blue-black lobe from the shoulder down the flank */}
          <path d="M50 43 Q37 45 32 55 Q32 60 35 63 Q37.5 66 40.5 62 Q42 56 46.5 51 Q47.5 45.5 50 43 Z" fill={SHEEN} />
          {/* the white shoulder patch, on the wing */}
          <ellipse cx="37.8" cy="55" rx="3.3" ry="5" fill={WHITE} transform="rotate(-25 37.8 55)" />
          {/* chestnut vent: one lobe lying along the body's lower-rear curve, below the wing and clear of it */}
          <ellipse cx="39.5" cy="72.5" rx="7.5" ry="4.2" fill={CHES} transform="rotate(45 39.5 72.5)" />
          {/* slim grey bill under the head */}
          <path d="M66.5 37.6 Q72.5 37.2 76.5 39.5 Q77.8 40.3 76.8 41.2 Q72.5 42.4 66.5 41.6 Z" fill={BILL} />
          {/* head up and forward */}
          <circle cx="59" cy="40" r="11.5" fill={BLK} />
          <Eye cx={62} cy={38} r={4} disc="#141218" />
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
          {/* deeply forked tail (left): ONE closed shape, two leaf-shaped blades from a notch at the
              body's edge. Every long edge bows a tenth of its chord; each tip is a two-curve cap whose
              tangents match the edges on both sides, so there is no ruler line and no corner anywhere */}
          <path
            d="M30 50.5 Q21.9 42.8 11.5 38.8 Q9.1 37.9 7.5 39.9 Q6.3 41.6 9 45.2 Q13.5 51.2 20 55 Q22 56 20 57 Q13.5 60.8 9 66.8 Q6.3 70.4 7.5 72.1 Q9.1 74.1 11.5 73.2 Q21.9 69.2 30 61.5 Z"
            fill={BLK}
          />

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
          <ellipse cx="57.5" cy="35.2" rx="5" ry="2.4" fill={GLOSS} opacity="0.65" />

          {beak(74, 45, 10, 2.8, "#23202A")}
          {/* the Black Drongo's eye is dark red-brown: iris, a pupil darker than the body, catchlight */}
          <circle cx="65" cy="42" r="3.6" fill="#4E2A26" />
          <circle cx="65" cy="42" r="1.9" fill="#141218" />
          <circle cx="63.8" cy="40.8" r="1.2" fill="#FFFFFF" />
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
              RED = "#B33028", BILL = "#211E22";
            return (
              <g>
                {/* LONG BROAD graduated tail sweeping down-left well clear of the body (key field mark);
                    one closed shape, broad blade, fully rounded tip, smooth join */}
                <path d="M54 62 Q33.2 69.5 17 84.5 Q15.1 86.3 16.6 88.9 Q17.8 91 23 89.5 Q43.5 83.5 60 70 Q63 62 54 62 Z" fill={BLK} />
                <path d="M43 72.5 Q46 74 44 75.5 Q34.5 84 21 88 Q18.5 87.5 20 85.5 Q29.5 76.6 43 72.5 Z" fill={BLKL} opacity="0.7" />
                {/* solid heavy black body mass (crow-like cuckoo); rounded ovoid, no gaps */}
                <ellipse cx="47" cy="54" rx="29" ry="30" fill={BLK} />
                {/* big rich CHESTNUT wing laid over the back/shoulder = the diagnostic mark. A leaf: the
                    outer edge follows the body, the inner edge bows OUT so it reads as a wing on a round
                    bird, not a ruler line down the middle; the shoulder tucks under the head */}
                <path d="M49 29 Q48.8 27.4 44.5 27.8 Q18 30.5 19 57 Q20 77 41 79 Q45.5 79.6 46.5 76.5 Q54 52 49 29 Z" fill={CHES} />
                <path d="M46.5 31 Q46.3 29.4 43 30 Q24 35 24 55 Q25 71 42 75 Q50.5 52 46.5 31 Z" fill={CHESL} opacity="0.5" />
                {/* folded primaries: a darker chestnut pad low on the wing, its top one convex dome, its
                    rear corner on the wing's own outline so no point shows */}
                <path d="M19.5 60.5 Q22 76 43 78.2 Q48 71 46 65 Q38 53.5 19.5 60.5 Z" fill={CHESD} opacity="0.85" />
                {/* slightly-decurved BLACK bill, drawn UNDER the head so the head's round edge is its base:
                    8.6 deep where it leaves the head, 6 at mid-length, a 3.1-unit round tip (review 1:
                    the old one was a club as thick at the hook as at the base) */}
                <path d="M72 37 Q82 36.8 85.6 44.4 Q86.2 47 84.2 47.2 Q80.4 43.4 70.5 48.5 Q70 42 72 37 Z" fill={BILL} />
                {/* distinct black head up-right, soft join into the body (no neck corner) */}
                <path d="M50 36 Q54 26 64 28 Q74 30 73 44 Q70 56 58 56 Q49 50 50 36 Z" fill={BLK} />
                <circle cx="62" cy="40" r="13.5" fill={BLK} />
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
          <path d="M30.5 42 Q50 24 66.5 41 Q71 42.2 67.6 43.6 Q58 40.4 50 40 Q40 40 31.5 45.6 Q28.2 44.2 30.5 42 Z" fill={HOOD} />
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
          {/* pink bill, drawn UNDER the hood so it emerges from the hood's own curve: 7 deep at the
              hood's edge, slightly down-curved, tapering to a 2.8-unit round tip */}
          <path d="M64 39.2 Q76 38.9 83.8 44.4 Q85.6 45.9 84.1 47.2 Q76 48 64 45.6 Z" fill={PINK} />
          {/* black hood */}
          <circle cx="55" cy="42" r="17" fill={BLK} />
          <path d="M38 40 Q52 32 66 40 Q52 40 44 44 Z" fill={BLK} />
          {/* black folded wing: broad round end at the shoulder behind the hood, trailing back and down
              along the body's curve to a round tip (review 1: it pointed forward like a flipper) */}
          <path d="M43.5 57.3 Q47.5 59.5 44 64.5 Q37 71.5 28.5 74.5 Q24.5 75.5 25 72 Q28 63 37 58.5 Q40.5 56.2 43.5 57.3 Z" fill={BLK} />
          {/* the adult's crimson eye: iris, a pupil in the hood's own colour, catchlight */}
          <circle cx="60" cy="41" r="4.4" fill="#B53A3C" />
          <circle cx="60" cy="41" r="2.4" fill={BLK} />
          <circle cx="58.5" cy="39.5" r="1.45" fill="#FFFFFF" />
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
            <path key={k} d={`M28 ${y} Q39.5 ${y + 3} 51 ${y + 1}`} stroke={mix(BRN, "#000", 0.22)} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          ))}
          {/* golden cap + breast */}
          <path d="M32.5 40 Q50 24 67.5 36.5 Q71.2 38.6 68 40 Q56 44.5 44 42 Q38.5 42 33.5 45.5 Q29.8 43.8 32.5 40 Z" fill={YEL} />
          <ellipse cx="56" cy="60" rx="14" ry="12" fill={YEL} />
          {/* dark face mask */}
          <ellipse cx="58" cy="48" rx="9" ry="8" fill={MASK} />
          {/* stout conical bill */}
          <path d="M70 45.5 Q77 46.3 82.5 48.4 Q86.2 50 82.5 51.6 Q77 55 70 56.3 Q63.6 51 70 45.5 Z" fill="#D9CBA6" />
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
  // 23 - BRAHMINY STARLING. U3b (F12, paragraph 15: "I don't like the color... that super thin black
  // line... should be redone"). From nothing, eight shapes: a pale apricot body (paler and yellower
  // than the Orange-headed Thrush's orange, so the two part at 40px), one dove-grey folded wing lobe
  // and a short grey tail, the head up and forward (review 1: it barely broke the outline) wearing
  // its black as plumage, not a hat: ONE cap inside the head's own outline from the bill base over
  // the crown, its lower edge dipping to just above the eye, the loose crest hanging down the nape as
  // a soft tuft (the old cap was a crescent one unit thick, the first redraw a beret with a brim);
  // and the yellow bill with its blue base, slim and drawn under the head.
  {
    name: "Starling",
    skip: WARMS,
    draw: () => {
      const BUFF = "#EFB46C", GREY = "#A9AEAD", GREYD = "#737A7E", YEL = "#E3B33A", BLU = "#5E7FA6", BLK = "#2A2628";
      return (
        <g>
          {/* short grey tail down and back */}
          <path d="M32 74 Q24 79 18 86 Q15.5 88.5 14.5 86 Q14.5 83 17.5 79.5 Q24 73 31 70 Z" fill={GREYD} />
          {/* apricot body */}
          <circle cx="48" cy="60" r="29" fill={BUFF} />
          {/* dove-grey folded wing: one lobe from the shoulder back and down the flank */}
          <path d="M50 46 Q36 47 29 59 Q28 70 33 78 Q36 81 38.5 76 Q39 65 44 55 Q46.5 49 50 46 Z" fill={GREY} />
          {/* yellow bill with a blue base, under the head: 4.4 deep at the head's edge, soft round tip */}
          <path d="M68 36.3 Q75 35.9 80 38.5 Q81.6 39.5 80.4 40.5 Q75 41.9 68 40.7 Z" fill={YEL} />
          <path d="M68 36.3 Q71.5 36 74.5 37.2 Q76 38.5 74.5 39.8 Q71.5 41 68 40.7 Z" fill={BLU} />
          {/* head up and forward, breaking the body's outline by 7 */}
          <circle cx="60" cy="37.5" r="13.5" fill={BUFF} />
          {/* ONE black cap, the head's own crown: from the bill base up the forehead, over the crown on the
              head's outline, down the back of the head as a tuft lying on the nape, then forward along a
              lower edge that dips to just above the eye */}
          <path d="M72 36 Q72.5 25 60 24 Q52 24.5 47.5 31 Q44 36 45.5 41.5 Q48 43 50 40 Q56 39.5 63 32.5 Q68 32.5 72 36 Z" fill={BLK} />
          <Eye cx={64} cy={39} r={4} />
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
  // 26 - ASIAN PARADISE FLYCATCHER, the white male (U3a, F13, paragraph 16: "insanely long tail,
  // is white, magnificent... we should pick the male"). A perched male: glossy blue-black head with a
  // short crest swept back off the nape, blue bill and eye-ring, white body, and the signature: one
  // ribbon tail that leaves from under the folded wing's tip and hangs down and BACK in a loose S to
  // a round cap near the lower-left corner, never crossing in front of the body (review 1: under the
  // bird it read as a saucer). Body and head are drawn small (r 17.5 and 11.5) so the ribbon gets its
  // length inside the box; the centroid script scales the whole bird up. The white sits on a grey
  // shade disc offset to the lower back (review 2: the upper back was white on the paper), so no white
  // meets the paper anywhere; the folded wing is a grey teardrop from the shoulder to a round tip at
  // the vent, the tail one step darker than the shade so it reads at 40px. Nine shapes.
  {
    name: "Paradise Flycatcher",
    skip: [],
    draw: () => {
      const WHT = "#ECEEE6", SHD = "#D6D8CE", SHD2 = "#CDCFC5", BLK = "#23232B", RING = "#6FA9C4", BILL = "#4F86A6";
      return (
        <g>
          {/* SIGNATURE: the ribbon tail, rooted under the wing's tip, 6 wide tapering to 3.6, round cap */}
          <path d="M33.5 55.3 Q30.5 59.2 29.7 63.0 Q27.7 67.4 27.9 71.8 Q27.5 77.1 25.8 80.7 Q23.8 85.0 20.9 87.2 Q18.0 89.5 15.1 89.8 Q13.4 90.0 12.4 88.9 A1.8 1.8 0 0 0 9.6 91.1 Q11.7 93.9 15.4 93.7 Q19.3 93.4 23.1 90.8 Q27.2 88.0 30.0 82.8 Q32.2 78.5 33.1 72.2 Q33.6 68.5 35.0 65.0 Q36.3 61.7 38.5 58.7 Z" fill={SHD2} />
          {/* the shade: a grey disc under the white, so the body's rim is grey on the paper all round (0.6 at the lit upper front under the head, 3.4 at the lower back) */}
          <circle cx="47" cy="52" r="19.5" fill={SHD} />
          <circle cx="48" cy="51" r="17.5" fill={WHT} />
          {/* folded wing: one grey teardrop from the shoulder (under the head) down the back to a round tip at the vent, its outer edge on the white's rim; every join turns 14 degrees or less */}
          <path d="M52 40.5 Q39 40.5 32.5 50 Q29 59.5 33.5 67 A2 2 0 0 0 36.9 65 Q35.4 62.4 44 50.5 Q46.5 44.5 52 40.5 Z" fill={SHD2} />
          {/* crest: one short tuft swept back off the nape, 6.5 wide at the base, round end */}
          <path d="M53.5 33 Q46.5 30.5 45 25.5 Q45 22 49 22.5 Q54.5 23.5 58.5 27 Z" fill={BLK} />
          {/* slim blue bill drawn UNDER the head so it emerges from the head's own curve: 4 deep at the edge, tapering to a soft 2.1 tip */}
          <path d="M68 35.5 Q76 35.4 81.3 38.6 Q82.5 39.7 81.4 40.7 Q75.5 41.6 68 39.4 Z" fill={BILL} />
          {/* glossy black head, up and forward of the white body */}
          <circle cx="62" cy="37" r="11.5" fill={BLK} />
          {/* the blue eye-ring; eye disc darker than the head so it stays the darkest point */}
          <circle cx="65.5" cy="35.5" r="4.8" fill={RING} />
          <Eye cx={65.5} cy={35.5} r={3.2} disc="#101016" />
        </g>
      );
    },
  },
  // 27 - INDIAN POND HERON. Hunched buff body, deep maroon breeding mantle, streaky neck, yellow
  // dagger bill with a dark tip.
  {
    name: "Pond Heron",
    skip: WARMS,
    draw: () => {
      const BUFF = "#B49A6E", MANTLE = "#753C3E", CROWN = "#8A7450", BILL = "#D6B54A", TIP = "#4A4039";
      return (
        <g>
          {/* hunched buff body ("the shape is good": untouched) */}
          <path d="M22 60 Q24 40 44 38 Q66 38 70 58 Q70 80 46 81 Q24 80 22 60 Z" fill={BUFF} />
          {/* the one accent: the breeding bird's maroon mantle laid over the hunched back. Its outer
              edge IS the body's edge (same curve, so no rim); its lower edge is one sag that lands level
              on the outline, so it reads as a saddle on a round body; its front tucks under the head */}
          <path d="M22 60 Q24 40 44 38 Q49 38 50 40 Q38 60 22 60 Z" fill={MANTLE} />
          {/* streaky neck, on the buff below the mantle */}
          {[[40, 56], [38, 63]].map(([x, y], k) => (
            <path key={k} d={`M${x} ${y} Q${(x + 58) / 2} ${y + 3} 58 ${y}`} stroke={mix(BUFF, "#000", 0.2)} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" />
          ))}
          {/* dagger bill drawn UNDER the head so it emerges from the head's own curve (no base chord):
              about five units deep where it leaves the head, both edges bowed a tenth of their chord,
              tapering to a round point two units across. The dark tip is the bill's own last five
              units, its outline the same curves, so it is a dipped tip and not a knob */}
          <path d="M64 44.6 Q72.5 44.6 81.4 48.3 Q83.4 49.6 81.4 50.3 Q73 51.9 64 49.8 Z" fill={BILL} />
          <path d="M77.3 46.8 Q79.3 47.4 81.4 48.3 Q83.4 49.6 81.4 50.3 Q79.4 50.7 77.3 50.9 Q76.3 48.9 77.3 46.8 Z" fill={TIP} />
          <circle cx="58" cy="44" r="13" fill={BUFF} />
          {/* darker crown, both ends rounded, the front inside the head */}
          <path d="M49.5 39.5 Q58 31.5 68 38 Q70 39.8 68.5 40.8 Q58 38.5 51.5 42.5 Q48.2 41.8 49.5 39.5 Z" fill={CROWN} />
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
          <path d="M23 55.5 Q21 45 33 42.5 Q40 40.2 46.5 41.5 Q50 43.5 47.5 47 Q40 55.5 25.5 58.6 Q22.4 58.6 23 55.5 Z" fill={SHEEN} />
          {/* soft folded-wing shade low on the body: a crescent whose inner edge is one convex arc */}
          <path d="M24 66 Q25 86 48 84.6 Q52.5 84 51.5 79 Q50 70 27 63.5 Q23.5 64 24 66 Z" fill={SHADE} />
          {/* raised snaky S-neck rising out of the body (head set a touch lower so it stays in frame) */}
          <path d="M48 66 Q45 54 50 47 Q53 42 56 40 Q60 44 57 49 Q53 56 54 63 Q51 67 48 66 Z" fill={BLK} />
          {/* merge the neck base smoothly into the body */}
          <ellipse cx="50" cy="64" rx="8" ry="6" fill={BLK} />
          {/* slim grey bill, drawn UNDER the head so it emerges from the head's own curve: 3.9 deep at
              the head's edge tapering to 2.4 behind the tip, where only the upper mandible's end turns
              down as a soft round nail about 1 unit below the lower edge, with no notch behind it
              (review 1: the old one read as a bent pipe laid on the head) */}
          <path d="M60 37.4 Q69 36.8 77.8 38.9 Q80 39.7 79.6 41.4 Q79.3 42.5 78.2 42.2 Q77.2 41.9 76.2 41.1 Q68 40.1 60 41.5 Q59 39.4 60 37.4 Z" fill={BILL} />
          {/* small head capping the top of the neck */}
          <circle cx="57" cy="40" r="8" fill={BLK} />
          <ellipse cx="54.5" cy="45" rx="4.5" ry="5" fill={BLK} />
          {/* blue-green eye */}
          <circle cx="57" cy="39.6" r="3.1" fill={EYE} />
          <circle cx="57" cy="39.6" r="1.45" fill={INK} />
          <circle cx="56.3" cy="39" r="0.6" fill="#FFFFFF" />
        </g>
      );
    },
  },
  // 29 - INDIAN GOLDEN ORIOLE. Glowing golden-yellow body, black eye-stripe (not a hood), black
  // wing, pink-red bill. (Distinct from the full-hooded Black-hooded Oriole.) U2b (F18, paragraph
  // 20): the stripe trails BEHIND the eye and never reaches the bill, so eye and bill are two things
  // on one face rather than a pair of sunglasses; the bill tapers to a soft tip. Colours unchanged.
  {
    name: "Golden Oriole",
    skip: [7],
    draw: () => {
      const YEL = "#E8B82E", BLK = "#2E2A26", PINK = "#D06A6A";
      return (
        <g>
          <circle cx="49" cy="55" r="33" fill={YEL} />
          {/* black folded wing: a broad round end at the shoulder trailing back and down along the body's
              curve to a round tip (the idiom that passed on the Black-hooded Oriole); the silhouette stays yellow */}
          <path d="M44 49 Q49 52 45 57 Q37 66 27 70 Q22.5 71 23.5 67 Q27 58 36 52 Q40 48.5 44 49 Z" fill={BLK} />
          {/* black eye-stripe: a rounded flick trailing back from the eye (its front end hides under the eye disc) */}
          <path d="M61 39.8 Q54 38.5 48 40.8 Q45 42.6 47.5 45 Q53 47 61 46.2 Z" fill={BLK} />
          {/* pink-red bill: slim, a soft down-turned tip, clear yellow between it and the eye */}
          <path d="M70.5 41 Q80 41 84.5 46.5 Q85.5 48.5 83.5 49 Q77.5 47.5 71 49.5 Q68.8 45.5 70.5 41 Z" fill={PINK} />
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
          {/* nape plumes: a round tuft mostly under the head, its visible rear a lobe not a chop */}
          <path d="M46 36 Q52 33.8 57 36 Q59.5 39 57 42 Q52 45 45.5 44.2 Q41.8 40 46 36 Z" fill={BUFF} />
          {/* yellow dagger bill, drawn UNDER the head so it emerges from the head's own curve: 5.4 deep
              at the head's edge, tapering evenly to a 2-unit round point */}
          <path d="M64 45.2 Q77.5 45.6 81 49.2 Q82.2 50.9 80.7 51.3 Q73.5 51.8 64 49.6 Z" fill={BILL} />
          <circle cx="58" cy="45" r="12" fill={WHT} />
          {/* crown plume on the head: both ends rounded */}
          <path d="M52.5 40.5 Q59 36.2 64.5 39.3 Q66.8 40.8 64.6 42.2 Q59 40.6 54.5 43.8 Q51.3 43.2 52.5 40.5 Z" fill={BUFF} />
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
  // 32 - PEREGRINE FALCON (U3a, F11, paragraph 22: "balance the killer nature with the cuteness and
  // at the same time keeping it just simple"). Redrawn from nothing, eleven shapes. What keeps it
  // from a penguin (review 2): the cream is a bib only (cheek, throat, upper breast, round lower
  // corners) over ONE grey-barred mid-tone belly, both inside the body so there is no pot belly and a
  // slate rim bounds them; and the rear is one long taper, a narrow slate tail projecting down and
  // back with the dark wing's tip lying on it. A dark helmet with the moustache hanging from under the
  // eye and cream on both sides of it, yellow cere and eye-ring with helmet all round the ring, and a
  // small hooked bill that ends in a round nail. Every join turns 16 degrees or less.
  {
    name: "Peregrine Falcon",
    skip: BLUES,
    draw: () => {
      const SLATE = "#5F7284", WING = "#3F4F62", HOOD = "#2A3340", PALE = "#EFE9DB", BELLY = mix(SLATE, PALE, 0.45), CERE = "#E6B83F", BILL = "#363B44";
      return (
        <g>
          {/* narrow slate tail projecting down and back past the rim, 7 wide at the root tapering to a 4.5 round cap; the wing's tip lies on it and ends about seven units short of the cap */}
          <path d="M36.1 67.1 Q28.4 79.7 17.1 89.2 A2.2 2.2 0 0 0 19.9 92.8 Q32.6 83.7 41.9 70.9 Z" fill={SLATE} />
          {/* slate body */}
          <circle cx="47" cy="57" r="30" fill={SLATE} />
          {/* long folded wing: one darker sickle from the shoulder (under the head) down the back, its 4.5-unit round tip lying on the tail, the way a perched falcon's wingtips reach its tail */}
          <path d="M49 41 Q33 41 24.5 54 Q19 67 24 82 Q25.5 86.5 28.3 85.3 Q30.5 84 30 76 Q31 64 40 56 Q47.5 50 49 41 Z" fill={WING} />
          {/* dark helmet, set up and forward */}
          <circle cx="59" cy="39" r="16" fill={HOOD} />
          {/* the grey-barred underparts as one mid-tone: the whole front oval, about 2.9 inside the body's rim; the cream bib covers its upper half */}
          <path d="M49 46 Q58 42 67.5 45.5 Q71 48 73.9 52 Q77 65.9 66.4 76.4 Q56.3 86.6 44.5 84 Q40 83 39.8 74 Q40.5 64 46 58 Q49.2 53.2 49 46 Z" fill={BELLY} />
          {/* cream bib: cheek, throat and upper breast only. Its top edge bows 1.8 under the eye-ring, its sides share the belly's outline, and its lower corners round into a shallow bottom at about y 66 */}
          <path d="M49 46 Q58 42 67.5 45.5 Q71 48 73.9 52 Q75 55 74.5 58.5 Q74.3 64 69 66 Q58 67.5 49 63 Q44.5 60 46.5 54 Q49.5 49 49 46 Z" fill={PALE} />
          {/* the moustache: one tongue starting in the band of helmet under the eye and hanging into the cheek, 5.5 wide tapering to a 3.5 round end */}
          <path d="M60.5 43.5 Q66 43 66 48 Q65.5 54 62 55 Q59 54.5 59.5 49 Q59.5 45 60.5 43.5 Z" fill={HOOD} />
          {/* yellow cere at the bill's base, then the small hooked bill over it ending in a round nail */}
          <ellipse cx="74" cy="39.4" rx="2.8" ry="2.4" fill={CERE} />
          <path d="M72.5 37.3 Q81 38.3 81.5 42.8 Q81.5 44.6 80.2 44 Q77 42.4 73.3 43.2 Q71.5 40.8 72.5 37.3 Z" fill={BILL} />
          {/* thin yellow eye-ring, two units of helmet between it and the cere so the two never blur; eye disc darker than the helmet */}
          <circle cx="64" cy="37" r="5" fill={CERE} />
          <Eye cx={64} cy={37} r={3.9} disc="#161A21" />
        </g>
      );
    },
  },
  // 33 - ORANGE-HEADED THRUSH. U3b (F7, paragraphs 12, 23: "the shape is a bit long... just not
  // working for me"). Seven shapes and round: one orange body with the head up and forward in the
  // same orange (the real bird's head and underparts are one colour), one blue-grey folded wing lobe
  // down the back with the white wing-bar on it, a short blue-grey tail, a slim horn bill under the
  // head. The leg stub, the two-step glow and the tall body are gone.
  {
    name: "Orange-headed Thrush",
    skip: WARMS,
    draw: () => {
      const ORG = "#E8902E", GREY = "#6B7A88", BILL = "#8A6A3A";
      return (
        <g>
          {/* short blue-grey tail down and back */}
          <path d="M35 72 Q29.5 74.5 22.5 81.5 Q20.5 83.5 19.5 81.5 Q19.5 79 22 76.5 Q28 71 34 68.5 Z" fill={GREY} />
          {/* orange body */}
          <circle cx="50" cy="59" r="24.5" fill={ORG} />
          {/* blue-grey folded wing: one lobe from the shoulder back and down the flank, an orange rim round it */}
          <path d="M50 37.5 Q37 37.5 30.5 50 Q28.5 62 34 73 Q36.5 77 38.5 72.5 Q38.5 61 44 50 Q46.5 42 50 37.5 Z" fill={GREY} />
          {/* the white wing-bar */}
          <ellipse cx="38.5" cy="52" rx="3.2" ry="2" fill={WHITE} transform="rotate(-35 38.5 52)" />
          {/* slim horn bill under the head */}
          <path d="M67 39.4 Q73.5 39 77.5 41.3 Q78.8 42.2 77.7 43.1 Q73.5 44.2 67 43.2 Z" fill={BILL} />
          {/* head up and forward */}
          <circle cx="59" cy="41" r="12" fill={ORG} />
          <Eye cx={62.5} cy={39.5} r={3.9} />
        </g>
      );
    },
  },
  // 34 - BLUE-FACED MALKOHA. Grey-green body, bold blue facial patch around the eye, green bill.
  // U2b (F20, paragraph 24): one body green with the wing a clear step darker (two greens, not three
  // near-misses), the blue face bigger so it is the signature, the bill slimmed to a soft tip. Review
  // 1: the head now sits up and forward, breaking the outline, and the wing sits back and down, clear
  // of the head, so it keeps its own rounded shape instead of showing the head as a bite.
  {
    name: "Blue-faced Malkoha",
    skip: GREENS,
    draw: () => {
      const OLV = "#6F7F4F", WING = "#4E5C3A", BLUE = "#3A78A8", BILL = "#9AB04A";
      return (
        <g>
          <circle cx="46" cy="56" r="31" fill={OLV} />
          {/* folded wing: the one darker step on the body, back and low */}
          <ellipse cx="37" cy="66" rx="14" ry="12" fill={WING} />
          {/* head set up and forward: its dome breaks the body's outline by about 4 units */}
          <circle cx="60" cy="38" r="14" fill={OLV} />
          {/* the bare blue face: big, the whole side of the head around the eye */}
          <ellipse cx="61.5" cy="38" rx="9.5" ry="9" fill={BLUE} />
          <Eye cx={64} cy={38} r={3.8} />
          {/* pale green bill: stout at the base, arched to a soft rounded tip */}
          <path d="M71.5 36.5 Q81 36 85 41.5 Q86 43.5 84 44 Q78 43.5 72.5 44.5 Q70 40.5 71.5 36.5 Z" fill={BILL} />
        </g>
      );
    },
  },
  // 35 - JACOBIN (PIED) CUCKOO (U3a, F21, paragraph 25: "think of the white as white space"). Black
  // above, white below: the white belly sits INSIDE the black body with a 3-unit black rim under it so
  // it never bleeds into the paper, the white wing flash is one short bar low on a darker folded
  // wing, the crest one soft tuft leaning back off the crown, the tail one long black paddle. Nine
  // shapes; every join on the belly turns 15 degrees or less.
  {
    name: "Jacobin Cuckoo",
    skip: [],
    draw: () => {
      const BLK = "#2A2628", WING = "#1A1718", WHT = "#F4F1E6", BILL = "#5A544E";
      return (
        <g>
          {/* long tail paddle sweeping down and back, 10 wide at the rim, both edges bowed, round-ended */}
          <path d="M40 66 Q28 73 22 86 Q18.5 90.5 15.5 87 Q14.5 84 18 79 Q28 72 35 59 Z" fill={BLK} />
          {/* black body */}
          <circle cx="47" cy="57" r="29" fill={BLK} />
          {/* white underparts: throat to vent, bounded by black on every side */}
          <path d="M60 46 Q69 46 72 53 Q75.5 65 66.5 73.4 Q58 83.6 47 82.6 Q42 82 41.8 74 Q42 67 47 60 Q50 52 60 46 Z" fill={WHT} />
          {/* folded wing: one darker lobe from the shoulder back and down the flank */}
          <path d="M50 45 Q36 46 29.5 58 Q29 68 33.5 75 Q36.5 78 38.5 73 Q39.5 62 44.5 53 Q46.5 47.5 50 45 Z" fill={WING} />
          {/* the white wing flash: one short bar across the base of the primaries, low on the wing (review 1: higher up it was the Magpie-Robin's own bar) */}
          <ellipse cx="35" cy="68" rx="3.2" ry="2.1" fill={WHT} transform="rotate(-15 35 68)" />
          {/* crest: one soft tuft leaning well back off the crown, 9 wide at the base narrowing to a 4.5 round top */}
          <path d="M49.5 33.5 Q44 29.5 44 24 Q45 20.5 48 21.5 Q53.5 24 58.5 32 Z" fill={BLK} />
          {/* slim dark-grey bill drawn UNDER the head: 4.3 deep at the head's edge tapering to a soft 2.2 tip */}
          <path d="M67 38.5 Q75.5 38.3 80.5 41.8 Q81.8 43 80.6 44 Q75 44.8 67 42.8 Z" fill={BILL} />
          {/* head lifted high and forward */}
          <circle cx="58" cy="41" r="14" fill={BLK} />
          <Eye cx={62} cy={39} r={3.8} disc="#120F10" />
        </g>
      );
    },
  },
  // 36 - BLACK EAGLE (U3a, F22, paragraph 26: "too many elements"). Seven shapes: one sooty body
  // with the head set up and forward, one long paler folded wing from the shoulder down the back to a
  // round tip trailing over the tail (the perched eagle's outline, and the lit region so the dark is
  // not a void), a broad round tail paddle, a dark-grey hooked bill with the yellow cere as its own
  // base, and the adult's dark-brown eye (review 1: a yellow iris was a second yellow dot on the face;
  // the real bird's iris is brown at every age). No brow, no spot on the bill, no scallops, no foot.
  {
    name: "Black Eagle",
    skip: [],
    draw: () => {
      const SOOT = "#3A332C", LIT = "#5C4E40", CERE = "#E7B833", BILL = "#5B5753", IRIS = "#5E4430";
      return (
        <g>
          {/* broad tail paddle down and back, 9 wide at the rim, 11 at its round end, both edges bowed */}
          <path d="M40 70 Q29 76 22 85 Q18 90 23 91 Q29 91 34 85.5 Q36 81 45 72 Z" fill={SOOT} />
          {/* body */}
          <circle cx="47" cy="58" r="29" fill={SOOT} />
          {/* long folded wing: the one lit region, from the shoulder (under the head) down the back, its round tip trailing past the rim over the tail; every join turns under 20 degrees */}
          <path d="M52 44 Q35 43 26 56 Q19.5 69 21.5 84 Q22.5 88.5 25.5 87.3 Q28.5 85.5 30 77 Q32 63 52 44 Z" fill={LIT} />
          {/* head, set up and forward of the body */}
          <circle cx="60" cy="37" r="15" fill={SOOT} />
          {/* hooked bill, then the yellow cere as a saddle on the bill's own base, half the eye's height */}
          <path d="M71.5 32.5 Q82.5 33.5 83 39.5 Q83 41.7 81.4 40.9 Q77.8 38.7 73.5 39.8 Q70.5 36.5 71.5 32.5 Z" fill={BILL} />
          <ellipse cx="74" cy="33.6" rx="4.2" ry="2" fill={CERE} transform="rotate(8 74 33.6)" />
          {/* dark-brown eye: a thin brown iris ring round the house eye, its disc darker than the head */}
          <circle cx="63" cy="34.5" r="4.9" fill={IRIS} />
          <Eye cx={63} cy={34.5} r={3.9} disc="#141110" />
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
  // U2b (F8, paragraph 12, "kind of dull"): the cyan and the orange brightened; nothing structural.
  // Review 1 (the unit owns its edges, F17): the belly kept inside the body with no straight side, the
  // cheek's point pulled inside the head, the gloss ridge's base rounded, the darker belly oval dropped
  // (it left a lighter sliver under itself; the real bird's underside is one orange).
  {
    name: "Common Kingfisher",
    skip: BLUES,
    draw: () => {
      const CYAN = "#12B6EA", CYANL = "#5CE0FA", TEAL = "#1290C4", COB = "#2559C4", ORG = "#F27A1F", DAGGER = mix(INK, "#000", 0.12), GLOSS = mix(DAGGER, "#fff", 0.28);
      return (
        <g>
          {/* short stubby tail-nub poking down-back (kingfishers are near tail-less - the silhouette break vs long-tailed cuckoos) */}
          <path d="M36 71 Q26 77 22 85 Q20 89 24 88 Q28 81.5 42 76 Q43 72 36 71 Z" fill={TEAL} />
          {/* compact DUMPY body mass, gently tilted so it never reads as a plain ball */}
          <ellipse cx="46" cy="62" rx="25" ry="23" fill={CYAN} transform="rotate(-6 46 62)" />
          {/* glowing electric-cyan back-stripe down the mantle (the lit kingfisher back line) */}
          <path d="M41 42 Q29 53 26 73 Q31 71 35 60 Q40 49 48 45 Q45 41 41 42 Z" fill={CYANL} opacity="0.95" />
          {/* rufous-orange underparts: ONE warm zone on the belly and lower front, every edge curved and the
              whole of it inside the cyan body (review 1: its right side ran straight to a corner at the edge) */}
          <path d="M48 54.5 Q69 57 67 69 Q66 78 56 80.5 Q47 81 43 78 Q39.5 65 45 56.5 Q46.5 54.5 48 54.5 Z" fill={ORG} />
          {/* OVERSIZED head set high + forward (the top-heavy big-headed signature) */}
          <circle cx="62" cy="40" r="19" fill={CYAN} />
          {/* rounded cobalt crown hugging the dome of the head (rounded, no point, no flat brim) */}
          <path d="M44 40 Q43 22 60 18 Q77 17 81 32 Q82 40 79 45 Q74 33 62 33 Q51 34 46 44 Q44 43 44 40 Z" fill={COB} />
          {/* rufous cheek wrapping under + behind the eye, continuous with the warm underside */}
          <path d="M59 43.5 Q73 45 72 54 Q69 61 62 60 Q54 53 56.5 45.5 Q57.5 43.5 59 43.5 Z" fill={ORG} />
          {/* white neck-patch (the diagnostic side dab) at the cheek/neck join */}
          <ellipse cx="54" cy="51" rx="5.8" ry="6.2" fill={WHITE} />
          {/* long STOUT dagger bill: rounded tip + rounded base, no sharper than the Flameback chisel ceiling */}
          <path d="M76 37 L93 40 Q96.5 41.4 93 42.8 L76 46 Q74 41.5 76 37 Z" fill={DAGGER} />
          {/* faint gloss ridge so the bill reads as a three-dimensional dagger */}
          <path d="M77 38.5 L91 41 Q92.5 41.5 91 42 L77 44.5 Q75.6 41.5 77 38.5 Z" fill={GLOSS} opacity="0.5" />
          <Eye cx={66} cy={38} r={4.2} />
        </g>
      );
    },
  },
  // 39 - JERDON'S LEAFBIRD. A bright leaf-green bird read in three clean zones: a green body, a
  // green head set up-forward, and ONE black face-and-throat patch. U2b (F23, paragraph 27): every
  // colour kept; the black is a mask-and-bib the size of a face (forehead, lores, cheek, chin, throat)
  // rather than the whole front of the head, the turquoise moustache runs from the bill base back along
  // the jaw, and the bill is a slim dark-grey curve that parts from the black. Review 1: the eye sits
  // wholly inside the mask as the species' brown iris with a dark pupil (a near-black disc in a black
  // mask was the "where is the eye" he named); the wing is one smooth teardrop that nothing cuts, with
  // the breast lift in front of it and the warm wash inside it, both opaque and bounded.
  {
    name: "Jerdon's Leafbird",
    skip: GREENS,
    draw: () => {
      const GRN = "#4FA63C", GRNL = "#67C04A", DARK = "#3C7E2B", BIB = "#23201C",
        TURQ = "#3FC2D6", ORG = "#D98A38", BILL = "#5A5249", IRIS = "#7A4A2A";
      return (
        <g>
          {/* leaf-green body mass: one confident round zone */}
          <circle cx="47" cy="58" r="31" fill={GRN} />
          {/* folded wing: one darker-green teardrop along the back and flank, smooth all round, 2 units clear of the head */}
          <path d="M24.5 53 Q27 48.5 33 48 Q40 47.5 43 53 Q47.5 57 46.5 65 Q45.5 74 41 79.5 Q37.5 82.5 32 80 Q24.5 76 24 69 Q22 59 24.5 53 Z" fill={DARK} />
          {/* warm shoulder wash, wholly inside the wing */}
          <ellipse cx="33" cy="68" rx="7" ry="5.5" fill={mix(DARK, ORG, 0.4)} />
          {/* lime breast lift, wholly in front of the wing and below the bib */}
          <ellipse cx="56" cy="74" rx="9" ry="7" fill={mix(GRN, GRNL, 0.8)} />
          {/* rounded green head set clearly up and forward (the songbird crown) */}
          <circle cx="58" cy="42" r="16" fill={GRN} />
          {/* SIGNATURE: the black mask-and-bib: forehead, lores, cheek, chin and throat down to a rounded bib on
              the upper breast; the green crown stays above it and the green nape behind it */}
          <path d="M53 38 Q58 32.5 66 33.5 Q72 35.5 73 43 Q74 52 72 56 Q69 64 61 66 Q53 65 50 57 Q48.5 47 53 38 Z" fill={BIB} />
          {/* turquoise moustache: a short rounded streak from the bill base back along the jaw */}
          <path d="M68.5 46.5 Q65 50.5 58 52.5 Q55 52.5 55.5 50.2 Q60 47 66 44.8 Q69 44.3 68.5 46.5 Z" fill={TURQ} />
          {/* slim leafbird bill, a touch down-curved, soft tip, dark grey so it reads against the black */}
          <path d="M70 39 Q79 39 83.5 43.5 Q85 45.8 83 46 Q78 44.8 70.5 46 Q68.8 42.5 70 39 Z" fill={BILL} />
          {/* the eye, wholly inside the mask: brown iris, INK pupil, catchlight */}
          <circle cx="62" cy="40" r="4.4" fill={IRIS} />
          <circle cx="62" cy="40" r="2.8" fill={INK} />
          <circle cx="60.5" cy="38.5" r="1.45" fill="#FFFFFF" />
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
          <path d="M23 61 Q20 79 40 83 Q42.6 83.3 41.2 81 Q34 70 32.4 61 Q31 59 28 59 Q24 59 23 61 Z" fill="#1A1A1A" />
          {/* white head + breast: the bib's side bows out about a unit and rounds into its lower edge */}
          <path d="M50 26 Q75 32 71.5 51 Q70.5 61 62 65.5 Q55.5 68 49.5 65 Q46 64.5 45.3 61 Q42.5 54 47 48 Q46 38 50 26 Z" fill={WHT} />
          <circle cx="55" cy="40" r="15" fill={WHT} />
          {/* pale-yellow hooked beak: keeps its curl but ends in a small round nail, not a point */}
          <path d="M68 38 Q80.6 38.4 80.4 44 Q80.1 45.6 78.8 44.8 Q75.5 43 70 44 Q67 41 68 38 Z" fill="#E0C24A" />
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
            const RED = "#D8392B";
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
                {[[66, 65.5], [58, 66], [64, 72], [56, 77]].map(([x, y], k) => (
                  <circle key={k} cx={x} cy={y} r={k > 1 ? 1.7 : 1.9} fill={SCALE} />
                ))}
                {/* head: cream profile head merged onto the upper body */}
                <circle cx="58" cy="44" r="14.5" fill={CREAM} />
                {/* no eye-stripe: under this crest only a grey wedge of it ever showed (review 2), so the
                    face is eye, moustache and bill. Moustache ends round, 1.6 inside the cream */}
                <path d="M53 53 Q62 54 67.5 57.6 Q70 59.6 67.4 61.3 Q66.3 61.8 65 61.4 Q59 58 54 58 Q51 55 53 53 Z" fill={BLK} />
                {/* swept-back crimson crest: ONE smooth dome over the crown, sweeping down the nape behind
                    the head. Outer edge one arc; lower edge curves gently back. No notch, no spike. */}
                <path d="M65 35 Q63 20 49 16 Q36 14 30 23 Q28 29 33 36 Q37 43.5 47 50 Q52 53 55 49 Q56 42 58 38 Q61 36 65 35 Z" fill={RED} />
                {/* strong straight chisel bill, rounded tip + rounded base (soft wedge, never a needle);
                    one flat INK fill, the allowed chisel */}
                <path d="M71 43 L82.5 45.1 Q86.6 46.4 82.5 47.7 L71 51 Q68.4 47 71 43 Z" fill={INK} />
                <Eye cx={61} cy={44} r={4} disc="#221F1C" />
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
                <path d="M40 70 Q27.8 76.9 19.2 88 Q17.9 89.7 19.2 91.6 Q20.2 92.9 24 91.6 Q36.9 87.1 47 78 Q50 73 40 70 Z" fill={BAYD} />
                {/* leg hint below the body - anchors the perched stance (like the thrush) */}
                <path d="M52 82 Q51.4 88 52.2 92 Q54 93 55.4 92 Q55.6 88 55 82 Z" fill={BILL} />
                {/* plump bay body - the dominant warm mass */}
                <ellipse cx="50" cy="60" rx="27" ry="25" fill={BAY} />
                {/* folded-wing back zone: one darker bay panel hugging the upper-rear, gives a clear wing */}
                <path d="M48 41 Q29 44 27 63 Q28 78 41 81 Q48 62 46 48 Q46 43.5 48 41 Z" fill={BAYD} />
                {/* pale lower-belly: a clean zone fully bounded by the body (no floating panel) */}
                <path d="M53 57 Q69 61 66 75 Q57 82 49 76 Q46.5 66 53 57 Z" fill={CREAM} />
                {/* separate rounded HEAD set clearly above the body - this is what makes it read as a bird */}
                <circle cx="58" cy="36" r="14" fill={BAY} />
                {/* slim shrike bill: the culmen starts its descent early, so the bill is about 4.7 deep
                    where it leaves the mask, 4.3 at x 78 and ends in a 3.1-unit round nail drooping 0.6
                    below the lower mandible, whose edge bows gently up into the bill and meets the nail
                    under 10 degrees (review 2: the softened one was a blunt thumb). Drawn UNDER the
                    mask so it emerges from the mask's own rounded end, with no base edge */}
                <path d="M69 36.2 Q76.5 35.9 80.4 39.6 Q81.6 41 80.6 42.1 Q79.9 42.8 78.8 42.3 Q74.2 41 69 41 Q67.5 38.5 69 36.2 Z" fill={BILL} />
                {/* THE SIGNATURE: one bold black bandit mask through the eye, sitting only on the head;
                    the eye sits wholly inside it with a disc darker than the mask, a glint in the band */}
                <path d="M47 35 Q60 30 72 36 Q73 40 70 43 Q60 43.6 49 41 Q45 39 47 35 Z" fill={MASK} />
                <Eye cx={60} cy={37.8} r={3.6} disc="#0F0D0C" />
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
  // 44 - TICKELL'S BLUE FLYCATCHER. U3b (F6, Q4, paragraphs 12, 23, 30: "a bit weird... a bit long...
  // looks just weird"). Round: an indigo-blue body with a darker folded wing lobe and a short tail,
  // the white front as ONE bib from chin to belly held inside a blue rim, the rusty throat-and-breast
  // as one lobe drawn OVER the bib's upper half so the rust sits in the white and the boundary is the
  // rust's own round bottom, the head up and forward, a slim dark bill under the head. Eight shapes.
  {
    name: "Tickell's Blue Flycatcher",
    skip: BLUES,
    draw: () => {
      const COB = "#2A62C4", WING = "#1F4C9A", ORG = "#E07A36", CRM = "#F6F1E7", BILL = "#2A2630";
      return (
        <g>
          {/* short tail down and back */}
          <path d="M33 75 Q25 80 20 86 Q18 88.5 16.5 86.5 Q16 84 18.5 80.5 Q25 73.5 32 71 Z" fill={WING} />
          {/* cobalt body */}
          <circle cx="48" cy="60" r="29" fill={COB} />
          {/* folded wing: one darker lobe from the shoulder back and down the flank */}
          <path d="M48 46 Q34 47 28 59 Q27 70 32 78 Q35 81 37.5 76 Q38 65 43 54 Q45.5 48 48 46 Z" fill={WING} />
          {/* the white front FIRST: one bib from under the chin to the belly, a blue rim between it and the paper */}
          <path d="M60 58 Q71 60 71.5 68 Q71.5 78 62 82.5 Q56.5 86 50 84.5 Q45 82.5 44.5 76 Q44 66 49 60 Q54 57.5 60 58 Z" fill={CRM} />
          {/* rusty throat and breast OVER it, a little narrower, so the white's top edge is the rust's own round
              bottom (review 1: drawn the other way up, the white chopped the rust flat) */}
          <path d="M61 50.5 Q70 54 69.5 63 Q68 71.5 59 72.5 Q50 71.5 48 64 Q47.5 55 53.5 51 Q57.5 49.5 61 50.5 Z" fill={ORG} />
          {/* slim dark bill under the head */}
          <path d="M67 38 Q74 37.6 79 40 Q80.5 41 79.4 42 Q74 43.4 67 42.4 Z" fill={BILL} />
          {/* head up and forward */}
          <circle cx="59" cy="39" r="14" fill={COB} />
          <Eye cx={63.5} cy={39.5} r={4.3} />
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
          {/* white belly first, round at every corner */}
          <path d="M49 62 Q68 62 67.5 76 Q66.5 81 61 82 Q53 83.5 48 79 Q45 75 46 68 Q46.8 63.5 49 62 Z" fill={WHT} />
          {/* black breast over it: one rounded lobe whose lower edge is a single convex arc */}
          <path d="M44.5 50 Q58 50 61 58 Q63 62.5 61.6 65.6 Q59.8 67.8 52 66.8 Q45.5 66 44.3 58 Q43.2 54 44.5 50 Z" fill={BLK} />
          {/* stout pale conical bill, rounded tip */}
          <path d="M68 42 Q74 43.2 78.6 45.6 Q81.8 47 78.6 48.4 Q74 50.8 68 52 Q62.8 47 68 42 Z" fill="#B7C2CB" />
          {/* dark-brown eye: iris, a pupil in the hood's own colour, catchlight */}
          <circle cx="58" cy="43" r="4.4" fill="#4A2C20" />
          <circle cx="58" cy="43" r="2.6" fill={BLK} />
          <circle cx="56.5" cy="41.5" r="1.45" fill="#FFFFFF" />
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
  // 48 - ORANGE-BREASTED GREEN-PIGEON. Fat green barrel, grey crown, orange breast. U2b (F25,
  // paragraph 31): the breast is ONE bounded orange lobe on the front (the field mark; the lilac band
  // read as lips on a lobe and as a pill in a stack, so it is gone), the head sits up and forward and
  // breaks the outline, and the crown is ONE grey cap on the dome, clear of the eye.
  {
    name: "Green-Pigeon",
    skip: GREENS,
    draw: () => {
      const GRN = "#8FB84A", GREY = "#9AA38C", ORG = "#E0913A";
      return (
        <g>
          <ellipse cx="48" cy="56" rx="31" ry="29" fill={GRN} />
          {/* the orange breast: one rounded lobe on the front, green all round it, 2.7 units under the chin */}
          <ellipse cx="58" cy="61" rx="11.5" ry="9.5" fill={ORG} />
          {/* head up and forward (its dome is about 5 units above the body's outline), one grey cap on top */}
          <circle cx="60" cy="37" r="12.5" fill={GRN} />
          <path d="M49.5 31.5 Q52 24.5 60 24.5 Q68 24.5 70.5 31.5 Q60 34 49.5 31.5 Z" fill={GREY} />
          {beak(70, 42.5, 8, 2.6, "#C9C2B4")}
          {/* stubby red legs */}
          <rect x="44" y="82" width="3" height="6" rx="1.5" fill="#C24A3A" />
          <rect x="54" y="82" width="3" height="6" rx="1.5" fill="#C24A3A" />
          <Eye cx={63.5} cy={40.5} />
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
  // 51 - YELLOW-FOOTED GREEN-PIGEON (candidate, Q3 of the 2026-10 expansion: he keeps whichever of
  // this and the Orange-breasted looks better, from one sheet). The same fat barrel as 48, told from it
  // by colour: olive-green back and wing, a yellow-olive head-and-breast drawn as ONE pear with soft
  // concave necks (review 1: two crossing circles left V notches), a grey crown on the dome clear of the
  // eye, one mauve patch at the bend of the wing, and the field mark, bright yellow legs and feet.
  // Appended past the Roller so no member can land on it by chance while it is a candidate.
  {
    name: "Yellow-footed Green-Pigeon",
    skip: GREENS,
    draw: () => {
      const OLV = "#7A9A3A", YEL = "#D2C44C", GREY = "#9CA4A2", MAUVE = "#B48AB6", LEG = "#F2C230", BILL = "#C9C8B8";
      return (
        <g>
          {/* bright yellow legs and feet: the field mark; rounded stubs, each with a soft toe pad */}
          <rect x="43.5" y="81" width="3.4" height="7" rx="1.7" fill={LEG} />
          <rect x="53.5" y="81" width="3.4" height="7" rx="1.7" fill={LEG} />
          <ellipse cx="45.5" cy="88" rx="3.6" ry="1.6" fill={LEG} />
          <ellipse cx="55.5" cy="88" rx="3.6" ry="1.6" fill={LEG} />
          {/* olive-green barrel body */}
          <ellipse cx="48" cy="56" rx="31" ry="29" fill={OLV} />
          {/* one mauve patch at the bend of the folded wing, behind the yellow front */}
          <ellipse cx="35.5" cy="52" rx="5.5" ry="6.5" fill={MAUVE} transform="rotate(-12 35.5 52)" />
          {/* yellow-olive head and breast as ONE pear: a dome breaking the outline, soft concave necks,
              a round breast with at least 4 units of olive round it */}
          <path d="M60 25 Q72 25 72 37 Q71.5 43 67.5 46.5 Q66 48.5 67 51 Q67.8 52.6 69 53.5 Q72.5 58 72 66 Q71 80 56 80 Q40 80 40 64 Q40.5 57 43.5 53.5 Q50 50 49.8 46.5 Q49.6 41.3 48 37 Q48 25 60 25 Z" fill={YEL} />
          {/* grey crown on the dome, clear of the eye */}
          <path d="M49.1 30.9 Q51.6 25 60 25 Q68.4 25 70.9 30.9 Q60 33.5 49.1 30.9 Z" fill={GREY} />
          {beak(70, 42.5, 8, 2.6, BILL)}
          <Eye cx={63.5} cy={40.5} />
        </g>
      );
    },
  },
  // 52 - ASIAN PARADISE FLYCATCHER, the white male, SECOND TAKE (candidate, U3a, F13, paragraph 16:
  // "insanely long tail, is white, magnificent, tiny, cute"). He sees this beside 26 on one sheet and
  // keeps one. Ten shapes. A small body leaning up and forward; the hood is ONE shape (head, a soft
  // crest tuft on the crown, and the real male's black throat as a lobe into the breast); a cobalt
  // eye-ring and bill; and the tail as one white ribbon in a long S, trailing behind and down to the
  // lower-left corner with a flick at the end, never under the bird. White against the paper is held
  // the Egret's way: a grey shade under the body shows as a rim along the belly and breast, a grey
  // wing lobe sits on the back, and the ribbon is grey along its shadow side with white on the lit one.
  {
    name: "Paradise Flycatcher (candidate)",
    skip: [],
    draw: () => {
      const HOOD = "#1E222C", BLUE = "#3E78CF", WHT = "#EEF0ED", SHADE = "#D3D7D7";
      return (
        <g>
          {/* the tail: the grey ribbon is the whole feather, the white lies along its lit upper edge
              (centreline shifted 1.4 units, 0.66 of the width), so grey shows down the shadow side;
              both roots hide under the body. The S ends at (11,86), its tip a two-arc cap, so after
              re-centring it sits six units clear of the box (review 2) */}
          <path d="M47.2 50.8 Q38 50.4 29.3 54.7 Q20.5 60 18 69.2 Q15.4 77.1 11 83.1 Q9.7 84.6 11.1 86 Q12.6 87.3 14 85.9 Q19.8 79.1 23 71.3 Q26.1 63.7 32.5 60.9 Q39 58.3 46.8 59.2 Z" fill={SHADE} />
          <path d="M47.2 50.8 Q38 50.3 29.2 54.5 Q20.3 59.8 17.5 69 Q14.8 76.8 10.5 82.6 Q9.6 83.6 10.6 84.5 Q11.5 85.4 12.4 84.4 Q17.7 78.2 20.9 70.4 Q23.9 62.2 31.3 58.6 Q38.6 55.5 46.9 56.4 Z" fill={WHT} />
          {/* body: a grey shade ellipse, then the white one 1.8 units up-left and a little smaller, so the
              grey is a rim of about 3.5 along the belly, 2 at breast and rear, nothing on the back */}
          <ellipse cx="58" cy="46" rx="21" ry="18" fill={SHADE} transform="rotate(-20 58 46)" />
          <ellipse cx="57.4" cy="44.3" rx="19" ry="16.2" fill={WHT} transform="rotate(-20 57.4 44.3)" />
          {/* grey folded wing on the back, its lower end clear of the belly rim; its front edge tucks
              under the hood at (58,41), crossing the hood's edge at a steep angle instead of running
              beside it (review 2: a white needle between wing and nape) */}
          <path d="M55 31 Q45 32.5 41.5 41 Q39.5 47.5 42.5 52.5 Q44.5 55 46.5 52 Q49 45 58 41 Q60.5 35.5 55 31 Z" fill={SHADE} />
          {/* cobalt bill, drawn UNDER the hood so it emerges from the throat's own curve: about 5 deep
              where it leaves the black, tapering to a 2.2-unit round tip at x 88.6 */}
          <path d="M74 28.6 Q84 28.7 88 31.8 Q89.2 33 87.8 34 Q81.5 35.7 74 33.8 Z" fill={BLUE} />
          {/* the hood as one shape: the head (centre 67,29 r 12.5 in 45-degree arcs), the crest tuft rising
              from the crown's back to a round top at y 11, and the black throat, which IS the front
              silhouette from the chin down to y 46 (it bulges to x 80.7, two units past the body), then
              turns in across the shade rim at about 45 degrees and rounds off inside the white through
              (72,48.5) and (60,46), no join over 20 degrees (review 2: a point and a white sliver) */}
          <path d="M56.2 35.3 Q53.6 30.8 54.9 25.8 Q56.3 20.8 60.8 18.2 Q56.5 15.5 58.5 12.5 Q62 9.8 66.5 12.2 Q69.2 13.8 70.2 16.9 Q75.2 18.3 77.8 22.8 Q79.5 25.7 79.5 29 Q81.5 35 80.2 41 Q78.5 47.5 72 48.5 Q65 49.5 60 46 Q54.8 42.5 56.2 35.3 Z" fill={HOOD} />
          {/* cobalt eye-ring, the species' bare blue skin; the eye disc darker than the hood */}
          <circle cx="70.5" cy="27.5" r="5.9" fill={BLUE} />
          <Eye cx={70.5} cy={27.5} r={4.2} disc="#0B0D12" />
        </g>
      );
    },
  },
  // 53 - PEREGRINE FALCON, SECOND TAKE (candidate, U3a, F11, paragraph 22: "balance the killer nature
  // with the cuteness and at the same time keeping it just simple"). He sees this beside 32 on one
  // sheet and keeps one. Eleven shapes. Review 2 read the first draft's upright egg and flipper as a
  // penguin, so the body is now ONE leaning teardrop: a broad chest, the belly curving in, and the
  // rear one long taper to a narrow round-ended tail at (25,89). The wing is a sickle laid on the back
  // whose outer edge is the silhouette from the wrist at (28,42) to its tip, and the tip lies ON the
  // tail with the tail's end showing past it. Cream only on cheek, throat and upper breast; the lower
  // breast and belly are one barred mid-tone (slate and cream mixed), the way the barring reads from
  // across a field. The head is cream (cheek, chin, throat) and the hood is one shape laid over it:
  // cap, nape, the mask through the eye, and the moustache hanging under the eye as a rounded teardrop
  // with cream behind it and in front. Drawn to a reach of 40 so the runner seats it near s 1.17.
  {
    name: "Peregrine Falcon (candidate)",
    skip: BLUES,
    draw: () => {
      const SLATE = "#4D5E72", WING = "#3A4757", HOOD = "#23272F", CREAM = "#F0E4CC", YEL = "#E9B83C", BILL = "#6E7D90";
      return (
        <g>
          {/* body: a teardrop leaning forward, 49 wide at the chest (y 60), 22 at y 80, a 9-unit tail at
              y 88 ending in a two-arc round cap; the back is one gentle convex curve and so is the
              underside from the belly round to the tail (review 3: it was a ruler line with an elbow) */}
          <path d="M52 30 Q73 31 77 48 Q79 64 62 75 Q50 86 32 89 Q27.5 90.5 25.8 89.5 Q23.8 87.8 24.2 85 Q22 60 34 38 Q38 29 52 30 Z" fill={SLATE} />
          {/* barred lower breast and belly: one mid-tone shape, at least 2.6 units inside the slate */}
          <path d="M52 53 Q69 54 67.5 63 Q65 71 56 74 Q47 77.5 45 70 Q43.5 60 52 53 Z" fill={mix(SLATE, CREAM, 0.55)} />
          {/* cream throat and upper breast, laid over the top of the barred belly */}
          <path d="M57 42 Q74 45 72.5 56 Q71.5 64 61 65.5 Q51 66 50.5 57 Q50.5 47 57 42 Z" fill={CREAM} />
          {/* the folded wing: its top edge leaves the shoulder under the head and meets the back
              horizontally, a rounded wrist bulges 3 units past the back at y 42, the outer edge runs 1 to
              3 units outside the back all the way down, the tip (two-arc cap, apex 26.7,86.4) lies on
              the tail, and the inner edge is a sickle bowed back so the wing tapers from 15 to 8 wide */}
          <path d="M48 36 Q40 41.5 31.5 41 Q27 41.5 25.5 46.5 Q20.5 65 23.5 84 Q23.9 86.8 26.7 86.4 Q29.5 86 29.1 83.2 Q31 58 48 36 Z" fill={WING} />
          {/* cream head, then the hood over it as one shape: 45-degree arcs round the cap (r 15.3 so no
              cream halo), the mask line under the eye, the moustache teardrop ending in a 3.5-unit round
              tip with a 3-unit cream chin in front, and the cheek's top rounded at (61,38) so it ends
              blunt under the ring (review 2); the mask line ends 1.2 units inside the cream with a
              rounded nape corner, so cream parts the hood from the wing (review 3) */}
          <circle cx="60" cy="34" r="15" fill={CREAM} />
          <path d="M45.4 36.6 Q44.2 31.5 46.8 26.4 Q49.9 20.9 56 19.2 Q62.2 17.6 67.7 20.8 Q73.1 23.9 74.8 30 Q76.5 33.3 75.1 36.7 Q69.5 41 67 45 Q65 47.5 63.5 45.5 Q61 42 61 39.5 Q61 37.5 58.5 37.8 Q52 40 47 38.6 Q45.6 38.3 45.4 36.6 Z" fill={HOOD} />
          {/* yellow cere at the base of the bill, drawn under the bill */}
          <ellipse cx="73.5" cy="34.5" rx="2.8" ry="2.4" fill={YEL} />
          {/* hooked bill: slim, curling down to a small round nail, never a point */}
          <path d="M73 31.5 Q82 31.8 82.5 37.5 Q82.3 40.4 80.6 39.6 Q78.5 37.5 74.5 37.5 Q72 35 73 31.5 Z" fill={BILL} />
          {/* yellow eye-ring, then the eye, darker than the hood */}
          <circle cx="63" cy="29.5" r="5.5" fill={YEL} />
          <Eye cx={63} cy={29.5} r={4.2} disc="#0E1116" />
        </g>
      );
    },
  },
  // 54 - BLUE-CAPPED ROCK-THRUSH (candidate, U3b, Q4): drawn beside the redrawn Tickell's (44) so he
  // keeps whichever looks better. The male: a cobalt crown and throat, black cheeks and a black
  // mantle, a white flash on the wing, chestnut-orange underparts. Eight shapes: chestnut body, black
  // tail and black folded wing lobe with the white flash, the blue hood (head up and forward, the
  // throat one lobe under it), a slim grey bill. A black cheek was tried twice: under the eye it was a
  // panda's patch, behind it a second eye; the black wing carries the species' black instead.
  {
    name: "Blue-capped Rock-Thrush (candidate)",
    skip: WARMS,
    draw: () => {
      const BLUE = "#2E7BD6", BLK = "#26232A", CHES = "#C9632A", WHT = "#F4F1E6", BILL = "#4A4650";
      return (
        <g>
          {/* short black tail down and back */}
          <path d="M33 75 Q25 80 20 86 Q18 88.5 16.5 86.5 Q16 84 18.5 80.5 Q25 73.5 32 71 Z" fill={BLK} />
          {/* chestnut body */}
          <circle cx="48" cy="60" r="29" fill={CHES} />
          {/* black folded wing lobe, the white flash lying along it */}
          <path d="M48 46 Q34 47 28 59 Q27 70 32 78 Q35 81 37.5 76 Q38 65 43 54 Q45.5 48 48 46 Z" fill={BLK} />
          <ellipse cx="35.5" cy="61" rx="4.4" ry="2.6" fill={WHT} transform="rotate(-65 35.5 61)" />
          {/* slim grey bill under the head */}
          <path d="M67 38 Q74 37.6 79 40 Q80.5 41 79.4 42 Q74 43.4 67 42.4 Z" fill={BILL} />
          {/* the blue hood: the throat lobe is drawn under the head as wide as the head is there and
              both its sides leave the head circle on a curve (review 1: the left was a ruler, the right a
              pinch), so head and throat are one pear (the Oriole's hood construction) */}
          <path d="M70.5 47 Q66.4 51.4 64 56.9 Q61.5 61 59 61 Q56.5 61 54 56.9 Q51.6 51.4 47.5 47 Z" fill={BLUE} />
          <circle cx="59" cy="39" r="14" fill={BLUE} />
          <Eye cx={63} cy={38.5} r={4.3} />
        </g>
      );
    },
  },
  // 55 - SMALL MINIVET (candidate, U3b, Q10: "redraw and pick the best"; F9, "a little bit long").
  // Beside 47, which stays as it was. Rounder: a slate body instead of the tilted ovoid, the tail
  // shorter than the old one and still a slim graduated tail, the flame as ONE lobe from breast to
  // vent inside a slate rim (the whole underside, as the real male and 47 have it), the darker wing
  // lobe with the flame bar set on it, the head up and forward in one slate (the old cap and cheek
  // are gone), a slim dark bill. Eight shapes.
  {
    name: "Small Minivet (candidate)",
    skip: [],
    draw: () => {
      const SLATE = "#5C646C", SLATED = "#41474E", FLAME = "#EA6628", FIRE = "#F5A63A", BILL = "#2A2730";
      return (
        <g>
          {/* graduated tail down and back, slim, round-ended */}
          <path d="M36 74 Q30 84 17 88 Q13.5 90 12.5 87 Q12.5 84 16 80.5 Q21 79 34 69 Z" fill={SLATED} />
          {/* slate body */}
          <circle cx="48" cy="60" r="27" fill={SLATE} />
          {/* darker folded wing lobe, the flame bar on it */}
          <path d="M48 46 Q35 47 29.5 58 Q28.5 68 33 76 Q36 79 38 74 Q38.5 63 43.5 54 Q46 48 48 46 Z" fill={SLATED} />
          <ellipse cx="35.5" cy="62" rx="2.7" ry="5.2" fill={FIRE} transform="rotate(-15 35.5 62)" />
          {/* flame underside: ONE lobe from the breast down to the vent, the real male's whole front, inside
              a slate rim; its top tucked under the head (review 1: a chest patch over grey was a grey robin) */}
          <path d="M61 51 Q70.5 55 69.5 67 Q68 80 56 83.5 Q49.5 85 44.5 81 Q41 76 44 68 Q46.5 57 56 51 Q58.5 50 61 51 Z" fill={FLAME} />
          {/* slim dark bill under the head */}
          <path d="M66.5 38.4 Q73 38 77.5 40.3 Q78.8 41.2 77.7 42.1 Q73 43.4 66.5 42.6 Z" fill={BILL} />
          {/* head up and forward */}
          <circle cx="59" cy="40" r="12.5" fill={SLATE} />
          <Eye cx={62.5} cy={38.5} r={4} />
        </g>
      );
    },
  },
  // 56 - SIRKEER MALKOHA (candidate, U3b, Q10: "redraw and pick the best"). Beside 11, which stays as
  // it was. The old one is an olive ball with a stout candy bill; the real bird is a long-tailed
  // ground cuckoo. Nine shapes: an olive-brown body with a long graduated tail down and back, one
  // darker folded wing lobe, the buff throat-and-belly as one lobe inside an olive rim, the head up
  // and forward, and the signature bill: 8 deep where it leaves the head, cherry-red with a yellow
  // tip, arched and tapering to a 3.4-unit round end (the old one was 13 deep and did not taper; the
  // first redraw's tip was a 7-unit club with a step at the yellow).
  {
    name: "Sirkeer Malkoha (candidate)",
    skip: WARMS,
    draw: () => {
      const OLV = "#8C7E5A", OLVD = "#6E6246", BUFF = "#D9C69A", RED = "#D9413A", YEL = "#E8C53E";
      return (
        <g>
          {/* graduated tail down and back: about 8 wide where it leaves the body, 9 at its round end, its root under the body */}
          <path d="M34.1 71.05 Q28.6 83.2 18.7 91.2 Q12 91.55 12.3 84.9 Q20.7 75.5 31.9 68.95 Z" fill={OLVD} />
          {/* olive-brown body */}
          <circle cx="48" cy="60" r="28" fill={OLV} />
          {/* darker folded wing lobe */}
          <path d="M48 46 Q35 47 29 58 Q28 69 32.5 77 Q35.5 80 37.5 75 Q38 64 43 54 Q45.5 48 48 46 Z" fill={OLVD} />
          {/* buff throat and belly: one lobe down the front, olive round it */}
          <path d="M60 56 Q70 61 68 71 Q65 80 54 80 Q46 79 46 70 Q47 61 53 57 Q56.5 55 60 56 Z" fill={BUFF} />
          {/* the bill, under the head: red, arched and tapering from 8 deep at the head to a 3.4 round tip;
              the yellow is the outer third cut from the SAME two edges (its curves are sub-curves of the
              red's), so there is no step where the colours change */}
          <path d="M65 34.5 Q77 32.5 84.5 39.5 Q86.3 41.6 83.5 42.8 Q76 40.5 65 42.5 Z" fill={RED} />
          <path d="M78.7 35.7 Q81.9 37.05 84.5 39.5 Q86.3 41.6 83.5 42.8 Q81.6 42.2 79.6 42 Q77.2 39 78.7 35.7 Z" fill={YEL} />
          {/* head up and forward */}
          <circle cx="59" cy="41" r="13.5" fill={OLV} />
          <Eye cx={62.5} cy={39.5} r={4.2} />
        </g>
      );
    },
  },
  // 57 - GREY JUNGLEFOWL (U4a, selection.md 2.1: the valley's wild rooster). A hen-shaped grey body
  // (an ellipse wider than tall, not the set's disc), a darker folded wing, and the two signatures a
  // child draws on a rooster: a red comb of three soft scallops drawn UNDER the head so only the
  // lobes above the crown show, and a sickle tail that leaves the rump, arches up the back and
  // curls in at a round tip, a glossy green-black plume with a shorter teal-green one layered in
  // front. The golden hackles are one cape lobe draped over the neck and shoulder between head and
  // body (it is also the neck). A red wattle hangs under the chin; a short pale bill. No spangles,
  // so it never reads as the Spurfowl's white moons. Ten shapes.
  {
    name: "Grey Junglefowl",
    skip: WARMS,
    draw: () => {
      const GREY = "#8A9394", GREYD = "#687072", TAILD = "#1E3A33", TAIL = "#2E7D66", GOLD = "#E3A93A", RED = "#D63C3A", BILL = "#D6C3A0";
      return (
        <g>
          {/* sickle tail in two layers: one fat green-black plume rising from the rump, arching over and drooping, and a slimmer teal plume lying ON it (same inner edge, so no paper between them; the dark shows as a band of 3 or more outside the teal and its tip emerges below) */}
          <path d="M32 54 Q25.5 44 29 34 Q28 17 16 18 Q11 18 10.5 28 Q10.5 37 13.5 41 Q16 44.5 20 42.5 Q25.5 38 24 32 Q32 33 33 40 Q34 45 40 50 Z" fill={TAILD} />
          <path d="M36 54 Q30 44 29.5 37 Q28.5 27 19 27 Q14 27 14 33 Q14 37.5 17.5 38.5 Q20.5 39 20.5 36 Q21 34.5 24.5 34.5 Q32 34 33 40 Q34 45 40 50 Z" fill={TAIL} />
          {/* hen-shaped body */}
          <ellipse cx="47" cy="62" rx="27" ry="22" fill={GREY} />
          {/* darker folded wing lobe */}
          <path d="M50 49 Q36 50 29 61 Q28 69 32 75 Q35 77.5 37 73 Q38.5 64 43.5 57 Q46 51.5 50 49 Z" fill={GREYD} />
          {/* golden hackle cape over the neck and shoulder, its top hidden under the head */}
          <path d="M52 32 Q43 35 39 46 Q38 55 46 58 Q57 60 68 54 Q73 48 70 42 Q64 35 52 32 Z" fill={GOLD} />
          {/* comb: three scallops, base chord hidden under the head, each lobe 6 wide at the crown */}
          <path d="M51 35 Q50 26 54.5 24 Q58 23 57.8 28 Q58.5 20.5 61 20 Q64 20.5 64.5 28 Q65 23 68 24 Q72 26 71 35 Z" fill={RED} />
          {/* short pale bill under the head: 4.6 deep at the head's edge, round 2.3 tip */}
          <path d="M70 39.6 Q77.5 39 81.5 42 Q82.8 43.3 81.4 44.3 Q76.5 46 70 44.2 Z" fill={BILL} />
          {/* head up and forward */}
          <circle cx="61" cy="41" r="12.5" fill={GREY} />
          {/* wattle under the chin */}
          <ellipse cx="67" cy="52.5" rx="3.6" ry="4.6" fill={RED} />
          <Eye cx={64} cy={40} r={4.2} />
        </g>
      );
    },
  },
  // 58 - INDIAN SPOT-BILLED DUCK (U4a, selection.md 2.2). A boat: one low wide body path with a
  // soft upturned tail nub at the rear, the head on a short neck at the front (a neck ellipse in the
  // body's colour fills the throat), and the one broad bill in the set: a black spatula 7.5 deep
  // where it leaves the head, drooping a little, its tip a 4.5-unit round end, the yellow tip cut
  // from the bill's own two edges, one red spot at its base. A dark crown cap sits inside the head's
  // outline with its lower edge above the eye (no stripe through the eye); the folded wing is a brown
  // lobe whose upper edge IS the back's curve, with the green speculum low at its rear. Ten shapes.
  {
    name: "Spot-billed Duck",
    skip: WARMS,
    draw: () => {
      const FAWN = "#CFC4A8", WING = "#A08862", CAP = "#4C3B2C", BILL = "#2B2724", YEL = "#F0C83C", RED = "#D8443A", SPEC = "#2E8C6A";
      return (
        <g>
          {/* the boat: tail nub, belly, breast, arched back */}
          <path d="M16 50 Q10 51 12 58 Q16 80 42 84 Q68 86 74 70 Q80 58 68 50 Q45 41 16 50 Z" fill={FAWN} />
          {/* folded wing: its top edge is the back's own curve (a sub-curve of it), the lower edge bowed */}
          <path d="M61 47.7 Q45 43.5 26.2 47.3 Q17 54 21 63 Q26 69 36 67.5 Q50 63 58 55 Q62 50 61 47.7 Z" fill={WING} />
          {/* green speculum, low at the wing's rear */}
          <ellipse cx="29" cy="60" rx="5" ry="3.4" fill={SPEC} transform="rotate(-18 29 60)" />
          {/* neck, in the body's colour, so the throat is one curve */}
          <ellipse cx="62" cy="50" rx="7" ry="7" fill={FAWN} />
          {/* the bill, under the head: its culmen a shallow dished line out of the forehead, 7.7 deep at the face, tapering to the 4.5 yellow nail; the nail cut from the same two edges; one red spot at the base */}
          <path d="M70 35 Q77 39 85 39.5 Q87.5 41.75 85 44 Q78 46 70 44.5 Z" fill={BILL} />
          <path d="M81.06 39.03 Q83 39.375 85 39.5 Q87.5 41.75 85 44 Q83.25 44.5 81.44 44.78 Q80.2 41.9 81.06 39.03 Z" fill={YEL} />
          <circle cx="74" cy="38.6" r="1.4" fill={RED} />
          {/* head on the neck */}
          <circle cx="61" cy="42" r="12.5" fill={FAWN} />
          {/* dark crown: on the head's own outline from the forehead (ending 5 units short of the bill) over the crown to the nape, lower edge above the eye */}
          <path d="M68.5 32 Q66 29.5 61 29.5 Q52.5 30 49.3 37.7 Q50 41.5 54 41.5 Q60 41 64.5 37 Q67.5 35.5 68.5 32 Z" fill={CAP} />
          <Eye cx={65} cy={43.5} r={4} />
        </g>
      );
    },
  },
  // 59 - GREY-HEADED SWAMPHEN (U4a, selection.md 2.3: "a chunky hen with a comically big red nose").
  // A big purple-blue ball with a turquoise folded-wing lobe, a short dark tail cocked up at the
  // rear, a pale grey-blue head up and forward, and the signature drawn as ONE red shape over the
  // head: the frontal shield, a plate standing 4 units off the forehead from the crown down, running
  // without a seam into the bill, which tapers from the face to a 4.6-unit round tip with a convex
  // culmen and a bowed lower edge. The eye sits just behind the shield's rear edge. Two long red
  // legs with rounded ends and two soft feet break the circle below. Eleven shapes.
  {
    name: "Swamphen",
    skip: [1, 6],
    draw: () => {
      const PUR = "#4A4FA3", TURQ = "#3E9FB0", TAIL = "#2E2A5A", HEAD = "#AAB8C8", RED = "#D6413C";
      return (
        <g>
          {/* short tail cocked up at the rear, root under the body */}
          <path d="M31 43 Q23 32 15 38 Q12 46 22 51 Z" fill={TAIL} />
          {/* long red legs, tops under the body, round-ended, and two soft feet */}
          <path d="M37.5 72 Q35.5 82 37 90.5 Q37.5 93.5 40.5 93.5 Q43.5 93.3 43 90.5 Q41.5 82 43.5 72 Z" fill={RED} />
          <path d="M50 72 Q48.5 82 49.5 90.5 Q50 93.5 53 93.5 Q56 93.3 55.5 90.5 Q54 82 56 72 Z" fill={RED} />
          <ellipse cx="41.5" cy="92.6" rx="6" ry="1.8" fill={RED} />
          <ellipse cx="54" cy="92.6" rx="6" ry="1.8" fill={RED} />
          {/* purple-blue body */}
          <circle cx="46" cy="52" r="27" fill={PUR} />
          {/* turquoise folded wing lobe */}
          <path d="M49 37 Q34 38 27 51 Q26 62 31 70 Q34.5 73 37 68 Q37.5 56 43 46 Q45.5 40 49 37 Z" fill={TURQ} />
          {/* pale grey-blue head, up and forward */}
          <circle cx="58" cy="34" r="12.5" fill={HEAD} />
          {/* shield and bill, one red shape: crown, plate off the forehead, convex culmen to the round
              tip, bowed lower edge back to the chin, then up the plate's rear edge in front of the eye */}
          <path d="M61 22 Q70 20 73 28 Q80 30 84.5 37.8 Q86.8 40.3 84.8 42.4 Q76 45 66 43.5 Q62.5 41 63.5 33 Q64 26 61 22 Z" fill={RED} />
          <Eye cx={57} cy={35.5} r={4.2} />
        </g>
      );
    },
  },
  // 60 - BLACK-WINGED KITE (U4a, selection.md 2.4: "a soft, dove-shaped ghost with ruby eyes"). The
  // bird's white is a pale pearl (#D3D7DC) so the silhouette has an edge on the paper without a rim
  // holding it in (a first pass held white inside grey the Jacobin's way and read as a snowman in a
  // ring). Grey above, pale below: a mid-pearl crown cap on the head's own outline with its lower
  // edge above the eye, and one mid-pearl folded wing from the shoulder back and down past the
  // body's rear to a round tip (a long-winged bird; both edges bowed), the jet-black shoulder a cap
  // on the wing's upper end sharing the wing's own two edges. A small black hooked bill under the
  // head, and the ruby eye: iris, dark pupil, catchlight. No brow (it would be a scowl), no legs.
  // Seven shapes and the eye.
  {
    name: "Black-winged Kite",
    skip: [],
    draw: () => {
      const PALE = "#D3D7DC", MID = "#A3ACB6", BLK = "#26232A", RUBY = "#C22E3C";
      return (
        <g>
          {/* pale pearl body */}
          <circle cx="46" cy="58" r="28" fill={PALE} />
          {/* long folded wing: shoulder (under the head) back and down to a round tip past the body's rear */}
          <path d="M52 38 Q36 40 27 54 Q17 65 16 80 Q14.5 85 19 85 Q24 83 28 76 Q31 60 44 50 Q50 45 52 38 Z" fill={MID} />
          {/* jet-black shoulder: the wing's upper end, its lower edge one sag */}
          <path d="M52 38 Q36 40 27 54 Q33 60 44 50 Q50 45 52 38 Z" fill={BLK} />
          {/* small black hooked bill under the head: 5.8 deep at the head's edge, curling to a 2.5 nail */}
          <path d="M71 35.5 Q80 35.5 81.5 40.8 Q81.8 43.2 79.6 42.8 Q76.5 41 72.5 41.8 Z" fill={BLK} />
          {/* head up and forward, breaking the outline by 8 */}
          <circle cx="61" cy="38" r="13.5" fill={PALE} />
          {/* mid-pearl crown: on the head's own outline from the forehead (a pale brow between it and the bill) over the crown to the nape, lower edge above the eye */}
          <path d="M71.3 29.3 Q67.25 24.7 61 24.5 Q51.8 25 48.4 33.4 Q49.1 37.5 53.4 37.5 Q60 37 65.3 32.5 Q69.5 32 71.3 29.3 Z" fill={MID} />
          {/* ruby eye: iris, dark pupil, catchlight */}
          <circle cx="65" cy="39" r="4.6" fill={RUBY} />
          <circle cx="65" cy="39" r="2.5" fill={BLK} />
          <circle cx="63.5" cy="37.5" r="1.5" fill="#FFFFFF" />
        </g>
      );
    },
  },
  // 61 - INDIAN EAGLE-OWL (U4b, selection.md 2.5: "tufts and orange eyes"). Face-on, the way a child
  // draws an owl, and kept apart from the Owlet (2) by silhouette and colour rather than detail: two
  // soft ear tufts stand up off the crown and break the outline, the body is a warm tawny egg where
  // the Owlet is a cool grey-brown disc, and the eyes are orange. The facial disc is two round buff
  // lobes, one per eye, their rims arched over the eyes (raised brows, never a V scowl). A tawny-buff
  // belly whose lower edge IS the body's own arc, so the darker folded wings show as the two sides,
  // with five dark streaks set three over two (three set two over one read as a second face). A small
  // grey bill points down between the eyes. Ten shapes and the streaks.
  {
    name: "Eagle-Owl",
    skip: WARMS,
    draw: () => {
      const BODY = "#93582A", BELLY = "#D49A55", FACE = "#EBCD98", IRIS = "#F08A1E", BILL = "#4A4440", STREAK = "#7A4420";
      return (
        <g>
          {/* ear tufts, leaning out a little, their base chords hidden inside the body */}
          <path d="M32.5 36 Q27.5 26 29.6 15.6 Q30.4 12.2 33.6 13.4 Q39.5 18 42.5 29 Z" fill={BODY} />
          <path d="M67.5 36 Q72.5 26 70.4 15.6 Q69.6 12.2 66.4 13.4 Q60.5 18 57.5 29 Z" fill={BODY} />
          <ellipse cx="50" cy="57" rx="29" ry="32" fill={BODY} />
          {/* belly: its top tucked under the face, its lower edge the body's own arc */}
          <path d="M30 80.2 A30 30 0 0 1 38.5 57 Q50 50 61.5 57 A30 30 0 0 1 70 80.2 A29 32 0 0 1 30 80.2 Z" fill={BELLY} />
          {[[41, 66.5], [50, 66.5], [59, 66.5], [45.5, 75], [54.5, 75]].map(([x, y], k) => (
            <ellipse key={k} cx={x} cy={y} rx="1.3" ry="2.8" fill={STREAK} />
          ))}
          {/* facial disc: two round lobes, a shallow dip between them above and below */}
          <path d="M50 38 Q46 32.5 39 32.5 Q28 33 27.5 45 Q28 57 39 57.5 Q46 57.5 50 54 Q54 57.5 61 57.5 Q72 57 72.5 45 Q72 33 61 32.5 Q54 32.5 50 38 Z" fill={FACE} />
          <circle cx="39" cy="45" r="8.5" fill={IRIS} />
          <circle cx="61" cy="45" r="8.5" fill={IRIS} />
          <Eye cx={39.5} cy={45.5} r={5} />
          <Eye cx={60.5} cy={45.5} r={5} />
          {/* small grey bill, clear of both irises, tapering to a round tip */}
          <path d="M47 50.5 Q50 49 53 50.5 Q53.2 55.5 51 58.8 Q50 60 49 58.8 Q46.8 55.5 47 50.5 Z" fill={BILL} />
        </g>
      );
    },
  },
  // 62 - COMMON TAILORBIRD (U4b, selection.md 2.6: "the cocked-up tail and the rust cap"). The pale
  // body the selection asks for (a cream ball with an edge on the paper, so it is nothing like the
  // White-eye's olive ball) under an olive folded wing whose top edge is the back's own arc, and the
  // signature: a darker olive tail rising from the rump and swept a little back, narrow where it
  // leaves the body and fanning to a round tip, so it reads as a tail and not a stalk. A rust cap on
  // the head's own outline with its lower edge arched well above the eye, a slim dark bill drooping to
  // a soft tip, and two short pink legs. Nine shapes.
  {
    name: "Tailorbird",
    skip: GREENS,
    draw: () => {
      const CREAM = "#E6D5AE", OLIVE = "#8F9C45", TAIL = "#6F7B36", CAP = "#C4602B", BILL = "#4E453C", LEG = "#D59A8C";
      return (
        <g>
          {/* short pink legs, tops under the body, round-ended */}
          <path d="M42.6 79 Q41.8 84.5 42.7 88.5 Q43.2 90.6 45 90.4 Q46.6 90 46.2 88 Q45.4 84.5 46 79 Z" fill={LEG} />
          <path d="M51.6 79 Q50.8 84.5 51.7 88.5 Q52.2 90.6 54 90.4 Q55.6 90 55.2 88 Q54.4 84.5 55 79 Z" fill={LEG} />
          {/* the cocked tail: root under the body, both edges bowed back, 7 wide at the rump and 10 at the round tip */}
          <path d="M30 58 Q19.5 45 18.2 30.5 Q17.6 24 23.3 23.6 Q29 23.3 28.4 29.6 Q26.2 44 34 55 Z" fill={TAIL} />
          <circle cx="47" cy="61" r="21" fill={CREAM} />
          {/* olive folded wing: its top edge the body's arc from the shoulder to the rump, the lower edge one sag turning up into the front edge without a corner */}
          <path d="M55.9 42 A21 21 0 0 0 27.3 53.8 Q37 73 52.5 58 Q57 53.6 55.9 42 Z" fill={OLIVE} />
          {/* slim bill under the head, both edges bowed, drooping to a round tip */}
          <path d="M70.5 39 Q78.5 39.3 84 42.6 Q85.6 43.9 83.8 44.7 Q77.5 45.8 71 43.6 Z" fill={BILL} />
          <circle cx="61" cy="38.5" r="12.5" fill={CREAM} />
          {/* rust cap: the head's outline from forehead to nape, its lower edge arched 3.8 above the eye */}
          <path d="M72.3 33.2 A12.5 12.5 0 0 0 48.7 36.3 Q60 28.5 72.3 33.2 Z" fill={CAP} />
          <Eye cx={65} cy={39.5} r={4.2} />
        </g>
      );
    },
  },
  // 63 - COMMON KESTREL, the male (U4b, selection.md 2.7: "a blue-grey head on a chestnut back, black
  // band on the tail"). Kept apart from both Peregrines (32, 53) by colour and silhouette: warm where
  // they are slate, a mid-grey head where they wear a dark hood, and upright with the tail hanging
  // straight down where theirs angles away. One cream teardrop body, a chestnut folded wing laid on
  // it (its outer edge is the back's own curve, its tip lies on the tail) with three dark spots, and
  // a grey tail whose black band is cut from the tail's own two edges, a grey tip below it. A big
  // round grey head, a pale cheek, and the moustache as a short tapering streak hanging from under
  // the eye-ring onto the cheek (a long one read as a tongue). A small hooked bill ending in a round
  // nail. Ten shapes and the spots.
  {
    name: "Kestrel",
    skip: WARMS,
    draw: () => {
      const CHES = "#B4602C", CREAM = "#EED8B0", GREY = "#8D9BAC", BAND = "#2A2D34", MOUS = "#3E4654", YEL = "#E9B83C", BILL = "#4A5260";
      return (
        <g>
          {/* grey tail hanging straight down, root under the body, a little wider at the round end */}
          <path d="M41.5 72 Q37.2 83 37.8 89.5 Q38.3 94.6 44 94.6 Q49.7 94.6 50.2 89.5 Q52.4 81 50.5 73 Z" fill={GREY} />
          {/* black band: its sides are sub-curves of the tail's two edges, top and bottom bowed with the round end */}
          <path d="M37.82 85.8 Q37.64 87.8 37.8 89.5 Q44 92.1 50.2 89.5 Q50.68 87.64 50.97 85.8 Q44.4 88.4 37.82 85.8 Z" fill={BAND} />
          {/* cream teardrop body: back, rump, round belly, the breast bulging forward */}
          <path d="M52 31 Q31 37 30 57 Q30 72 40 78.5 Q46.5 82 53.5 78.5 Q74 68 74.5 51 Q74.5 39 64 35 Q58 31 52 31 Z" fill={CREAM} />
          {/* chestnut folded wing: the back's own curve, then past the rump to a round tip on the tail, the lower edge bowed toward the breast */}
          <path d="M52 31 Q31 37 30 57 Q28.6 69.5 36.6 79 Q38.2 82.2 40.9 79.6 Q50.6 70 55.5 52 Q57.5 41 54 33 Z" fill={CHES} />
          {/* small hooked bill under the head, curling to a round nail */}
          <path d="M70.5 24.5 Q80 24.9 81 30.6 Q81.2 33 79.6 32.4 Q76.4 30.6 71.5 31.5 Q69.4 28 70.5 24.5 Z" fill={BILL} />
          <circle cx="60" cy="28.5" r="13.5" fill={GREY} />
          {/* pale cheek and throat: the head's lower-front arc, its top edge 2.4 under the eye-ring */}
          <path d="M73.1 31.77 A13.5 13.5 0 0 1 56.51 41.54 Q62.5 32 73.1 31.77 Z" fill={CREAM} />
          {/* moustache: 4 wide under the ring tapering to a 2.4 round end, behind the eye, never toward the bill */}
          <path d="M60.8 30.6 Q63 30 64.9 31.4 Q64.7 35.6 62.8 38.6 Q62 40.2 60.9 39.2 Q60.1 35 60.8 30.6 Z" fill={MOUS} />
          {/* yellow eye-ring, then the eye, darker than the band */}
          <circle cx="64" cy="26.5" r="5.4" fill={YEL} />
          <Eye cx={64} cy={26.5} r={4.1} disc="#16181D" />
        </g>
      );
    },
  },
  // 64 - BLACK-CROWNED NIGHT HERON (U4b, selection.md 2.8: "red eye under a black cap, hunched"). A
  // stocky pale-grey loaf on two short yellow legs, the big round head sunk into the shoulders but
  // still breaking the back's line. Black on top only: a cap on the head's own outline from the
  // forehead (a pale sliver left above the bill) over the crown to the nape, and a black saddle on
  // the back whose outer edge is the body's arc, so the two read as one black crown-and-mantle. A pale
  // grey folded wing below the saddle, running past the rump to a round tail tip. The red eye (iris,
  // dark pupil, catchlight) sits just under the cap's edge, and the bill is a stout black dagger, 7
  // deep at the face, tapering to a round tip. The white nape plume was tried and dropped: held on the
  // black it read as a slot cut in the back. Eight shapes and the eye. Kept apart from the
  // Black-winged Kite (60), which shares grey, black and a red eye, by silhouette: a horizontal
  // heron on legs with a long bill and black ON TOP, against a round disc with a black wing slash.
  {
    name: "Night Heron",
    skip: [],
    draw: () => {
      const PALE = "#D5D9DC", WING = "#A3ACB5", BLK = "#1F3436", RED = "#CF2B39", LEG = "#E2BE48", BILL = "#202429";
      return (
        <g>
          {/* short yellow legs, tops under the body, round-ended */}
          <path d="M41 74 Q40 82 41 87.8 Q41.5 90.2 43.6 90 Q45.4 89.6 45 87.6 Q44 82 45 74 Z" fill={LEG} />
          <path d="M51 74 Q50 82 51 87.8 Q51.5 90.2 53.6 90 Q55.4 89.6 55 87.6 Q54 82 55 74 Z" fill={LEG} />
          <ellipse cx="46" cy="59" rx="28" ry="21" fill={PALE} />
          {/* grey folded wing: the body's arc from the shoulder to the rump, a round tail tip past it, the lower edge rising under the head */}
          <path d="M55.58 39.27 A28 21 0 0 0 18.43 62.65 Q12.5 66.5 14.5 71.5 Q16.5 75.5 23.5 72.5 Q42 66 56 51 Q60 47 55.58 39.27 Z" fill={WING} />
          {/* black saddle: the same arc from the shoulder to mid-back, its lower edge one sag */}
          <path d="M55.58 39.27 A28 21 0 0 0 26.2 44.15 Q40 56 55.58 39.27 Z" fill={BLK} />
          {/* stout dagger bill under the head, both edges bowed, a round tip */}
          <path d="M72 41.5 Q80 41.6 86.4 45.3 Q88 46.5 86.4 47.4 Q79.5 49.8 72.5 48.6 Z" fill={BILL} />
          <circle cx="63" cy="43" r="13" fill={PALE} />
          {/* black cap: the head's outline from forehead to nape, its lower edge 2 above the eye */}
          <path d="M75.2 38.55 A13 13 0 0 0 50.2 45.26 Q62 33 75.2 38.55 Z" fill={BLK} />
          <circle cx="66.5" cy="43.5" r="4.6" fill={RED} />
          <circle cx="66.5" cy="43.5" r="2.5" fill="#15181C" />
          <circle cx="65" cy="42" r="1.5" fill="#FFFFFF" />
        </g>
      );
    },
  },
  // 65 - PIED KINGFISHER (U4c, selection.md 2.9: "crest, dagger, breast band"; Q5, he decides on
  // seeing it). Kept apart from the Magpie-Robin (14) and the Jacobin (35), both black balls with a white
  // belly, by being a WHITE bird with black on it: the white head with the eye on it, the crest, the long
  // dagger. The white is a cool #E3E6E9, so the throat, face and belly hold an edge on the paper without
  // a rim (the Jacobin's held-in white read as a hole, paragraph 25). One black crown from above the bill
  // over the top, its lower edge arching just clear of the eye, flowing back into three shaggy tufts; the
  // cap ends above the nape so a white collar parts it from the black back. A black folded wing whose top
  // edge is the back's own arc, six white spots in two rows for the pied back, one breast band whose
  // front end is the body's own outline and whose rear end tucks under the wing, a short black tail, and
  // the chisel bill: two straight edges, a round tip, the base under the head. Nine shapes and the spots.
  {
    name: "Pied Kingfisher",
    skip: [],
    draw: () => {
      const WHT = "#DADFE5", BLK = "#24252A", BILL = "#1D1E22";
      return (
        <g>
          {/* short black tail down and back, root inside the body, round end, both edges bowed */}
          <path d="M39 75 Q33 82 31 90.5 Q30 94.8 34 94.6 Q37.5 94 40.5 89 Q42.4 85.2 47 81 Z" fill={BLK} />
          <circle cx="46" cy="62" r="24" fill={WHT} />
          {/* breast band, sagging a little: front end the body's own arc, rear end under the wing */}
          <path d="M48 52 Q60 61 69.18 55.79 A24 24 0 0 1 70 62 Q60 66.5 46 59 Z" fill={BLK} />
          {/* black folded wing: the back's own arc from the shoulder (under the head) to a round tip on the tail, the lower edge bowed toward the breast */}
          <path d="M52.21 38.82 A24 24 0 0 0 24.25 72.14 Q22 80 26 84 Q30 87 34 82 Q50 66 55 50 Q56 44 52.21 38.82 Z" fill={BLK} />
          {/* the pied back: six white spots in two rows along the wing, each 2 or more inside its edges */}
          {[[42.9, 49.85], [37.4, 58.6], [31.9, 67.35], [47, 58.3], [41.5, 67.1], [36, 75.8]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="1.9" fill={WHT} />
          ))}
          {/* the dagger: a chisel 9 deep at the face tapering to a 3-unit round tip, base under the head */}
          <path d="M72 31.5 L90.5 38.4 Q94 40 90.4 41.4 L72 42 Q69.5 36.5 72 31.5 Z" fill={BILL} />
          <circle cx="60" cy="35" r="15" fill={WHT} />
          {/* one black crown: the head's outline from 3 above the bill over the top, three shaggy tufts back off the crown, then a lower edge ending above the nape and arching 2.5 or more clear of the eye */}
          <path d="M73.91 29.38 A15 15 0 0 0 58.69 20.06 Q51 14.2 44.2 13.6 Q40.6 13.6 42.4 16.6 Q44.6 19.6 47.4 21.2 Q42 19.6 38.6 21.4 Q35.4 23.4 38.6 25.6 Q41.6 28.2 45.6 28.4 Q41.2 28.8 38.9 30.4 Q36.4 32.6 39.6 34 Q42.6 34.2 45.23 32.4 Q50.5 34.6 56.5 32 Q63.7 28.88 73.91 29.38 Z" fill={BLK} />
          <Eye cx={64.5} cy={37} r={4.6} disc="#0E0F12" />
        </g>
      );
    },
  },
  // 66 - WIRE-TAILED SWALLOW (U4c, selection.md 2.10: "blue over white with a rust cap, swept"). Perched,
  // leaning back a little the way a swallow sits on a wire, so its long axis runs toward the frame's
  // lower-left corner and the wires fit without shrinking the body (laid level they set the frame cap and
  // left the bird a quarter smaller than its neighbours). Steel-blue above: the head and one long folded
  // wing on the back's own arc, ending in a soft point past the rump. Pure white below, a cool white with
  // an edge on the paper: the body, and a throat lobe on the head whose rear runs past the head's edge
  // over the white body (an earlier pass left a blue hairline there) and meets the wing's lower edge
  // exactly. The rust cap on the head's own outline from 2 above the bill, its lower edge 2.8 clear of the
  // eye. The two wires come out from under the wing tip as slender ribbons, 3.6 wide at the base and 2.6
  // at the round end, bowed so neither is a ruler line. A tiny black bill. Nine shapes.
  {
    name: "Wire-tailed Swallow",
    skip: BLUES,
    draw: () => {
      const WHT = "#DADFE5", BLUE = "#27427F", TAIL = "#1D3266", CAP = "#C8642E", BILL = "#1A1D24";
      return (
        <g>
          {/* the two wire streamers, bases under the wing tip, diverging a little, round ends */}
          <path d="M21.32 69.36 Q17.77 79.48 9.67 86.50 Q8.50 89.17 11.33 88.50 Q20.29 81.28 24.68 70.64 Z" fill={TAIL} />
          <path d="M22.71 71.32 Q21.92 81.94 15.94 90.75 Q15.50 93.62 18.06 92.25 Q24.82 83.03 26.29 71.68 Z" fill={TAIL} />
          <ellipse cx="48.5" cy="57.5" rx="25" ry="21.5" fill={WHT} transform="rotate(-26 48.5 57.5)" />
          {/* steel-blue folded wing: the back's own arc from under the head to a soft point past the rump, the lower edge one long S back under the head */}
          <path d="M55.72 35.65 A25 21.5 -26 0 0 24.73 64.94 Q19 68.5 16 73.5 Q14.4 76.8 17.8 76.6 Q32 75 46 66 Q57.5 58.5 61.5 48 Z" fill={BLUE} />
          {/* tiny bill under the head, 5.7 deep at the face, a round 1.8 tip */}
          <path d="M79 32.2 Q85 33.2 88.4 35.4 Q89.7 36.4 88.2 37.2 Q84 38.4 79 38.2 Z" fill={BILL} />
          <circle cx="66" cy="34" r="16" fill={BLUE} />
          {/* white throat: the head's lower-front arc, then past the head's edge over the white body to where the wing's edge crosses the head, and its top edge 5 under the eye */}
          <path d="M81.04 39.47 A16 16 0 0 1 69.33 49.65 Q65.5 52.6 62.4 51.2 Q61.6 50.4 61.01 49.20 Q70.5 40 81.04 39.47 Z" fill={WHT} />
          {/* rust cap: the head's outline from forehead to nape, its lower edge dipping toward the eye */}
          <path d="M81.2 29 A16 16 0 0 0 50.06 32.61 Q57.6 31.2 64.2 26.4 Q72.8 22 81.2 29 Z" fill={CAP} />
          <Eye cx={71} cy={32.5} r={4.7} disc="#0E121B" />
        </g>
      );
    },
  },
  // 67 - GREY WAGTAIL (U4c, selection.md 2.11: "lemon under slate, a long tail"). The winter bird, the one
  // the valley actually sees: no black throat. Kept apart from the Yellow-throated Bulbul (12), grey with
  // a yellow HEAD, by putting the lemon low: a lemon body under one slate folded wing whose top edge is
  // the back's own arc, so slate runs from the crown down the back and lemon from the breast to the vent.
  // The long dark tail held out behind and a little down (laid level it set the frame cap and shrank the
  // body), the slate wing's tip lying on it. A plain slate head (the white supercilium was tried and
  // read as an eyebrow raised in surprise, U4c review 1), a slim dark bill, two pink legs. Eight shapes.
  {
    name: "Grey Wagtail",
    skip: [7],
    draw: () => {
      const LEMON = "#F2D13A", SLATE = "#78838F", TAIL = "#33373E", BILL = "#2A2D33", LEG = "#D99A96";
      return (
        <g>
          {/* long dark tail, root inside the body, both edges arched, round end */}
          <path d="M31 60.5 Q20 64.2 11 71 Q8.8 73.2 10.6 75.4 Q12.6 77 15 75.8 Q24.5 69.2 33.5 66.5 Z" fill={TAIL} />
          {/* pink legs, tops under the body, round-ended */}
          <path d="M43.5 72 Q42.7 82 43.6 88 Q44.1 90.2 45.8 90 Q47.4 89.6 47 87.6 Q46.3 82 46.9 72 Z" fill={LEG} />
          <path d="M52 72 Q51.2 82 52.1 88 Q52.6 90.2 54.3 90 Q55.9 89.6 55.5 87.6 Q54.8 82 55.4 72 Z" fill={LEG} />
          <ellipse cx="47" cy="58" rx="25" ry="19" fill={LEMON} transform="rotate(-15 47 58)" />
          {/* slate back and folded wing: the back's own arc from under the head to a round tip on the tail, the lower edge one sag back under the head */}
          <path d="M56.82 39.26 A25 19 -15 0 0 22.40 59.50 Q17.5 60.5 14.5 62.5 Q12.5 64.6 15.6 65.8 Q32 68 47 61.5 Q57 56.5 60.5 48.5 Z" fill={SLATE} />
          {/* slim bill under the head, both edges bowed, a round tip */}
          <path d="M77 37.2 Q83.5 37.9 87.7 39.8 Q89 40.8 87.6 41.6 Q82.5 42.8 77 42.4 Z" fill={BILL} />
          <circle cx="66" cy="39" r="14" fill={SLATE} />
          <Eye cx={70.5} cy={39} r={4.4} disc="#1E2024" />
        </g>
      );
    },
  },
  // 68 - ROCK PIGEON (U4c, selection.md 2.12: "the shimmer collar, the two bars, the puffed chest"). The
  // campus pigeon: a plump blue-grey body with the breast puffed forward under a small round darker
  // head, so it parts from the Hornbill (10), a warm-grey ball with a banana bill, by colour and by the
  // collar. The collar is one band in two flat colours wrapping the neck under the head, green over
  // purple, each running from the breast's own outline back under the wing's front edge (an earlier pass
  // left a purple sliver on the nape). A pale grey folded wing on the back's own arc with a round tip over
  // the short dark tail, and the two black bars across its rear half, each running to the wing's lower
  // edge as an exact piece of that edge (an inside dash read as claw marks). The orange eye (iris, dark
  // pupil, catchlight), a small dark bill, short coral legs. The white cere was tried and dropped: it read
  // as a spot on top of the bill (paragraph 26). Eleven shapes and the eye.
  {
    name: "Rock Pigeon",
    skip: BLUES,
    draw: () => {
      const BODY = "#8F9AAB", HEAD = "#6F7A8B", WING = "#B4BDC8", BAR = "#2E3138", GREEN = "#3E9A7A", PURP = "#8B4F8F", TAILC = "#5E6878", BILL = "#4A4E57", IRIS = "#E8742A", LEG = "#D65F4E";
      return (
        <g>
          {/* short dark tail out behind, root inside the body, round end */}
          <path d="M30 58 Q18 59 9 63 Q6 65 7.5 68 Q9.5 70.5 13 69.5 Q22 67 32 68 Z" fill={TAILC} />
          {/* short coral legs, tops under the body, round-ended */}
          <path d="M44 78 Q43.5 83 44.2 86.5 Q44.6 88.4 46.3 88.3 Q47.8 88 47.5 86.3 Q47 83 47.6 78 Z" fill={LEG} />
          <path d="M52 78 Q51.5 83 52.2 86.5 Q52.6 88.4 54.3 88.3 Q55.8 88 55.5 86.3 Q55 83 55.6 78 Z" fill={LEG} />
          <ellipse cx="47" cy="60" rx="28" ry="22" fill={BODY} transform="rotate(-8 47 60)" />
          {/* the shimmer collar: purple, then green over it, each the body's own outline from the nape round to the breast and one sag back */}
          <path d="M42.97 38.36 A28 22 -8 0 1 74.36 54.22 Q58 63 42.97 38.36 Z" fill={PURP} />
          <path d="M46.37 37.96 A28 22 -8 0 1 72.99 50.60 Q60 57 46.37 37.96 Z" fill={GREEN} />
          {/* pale folded wing: the back's own arc from the collar's rear to a round tip over the tail, the lower edge bowed, the front edge a round shoulder over the collar */}
          <path d="M46.37 37.96 A28 22 -8 0 0 19.16 60.05 Q14.5 63 12.5 66.5 Q11.5 69.5 15 69.5 Q34 71 47 63.5 Q55 58 54 50 Q53 42 46.37 37.96 Z" fill={WING} />
          {/* the two black bars: across the wing's rear half, round tops, each bottom an exact piece of the wing's lower edge */}
          <path d="M35.79 68.02 Q32.82 63.60 31.49 58.44 Q31.75 54.48 35.09 57.37 Q36.42 62.53 39.40 66.94 Q37.64 67.55 35.79 68.02 Z" fill={BAR} />
          <path d="M27.56 69.45 Q24.69 65.26 23.46 60.33 Q23.81 56.41 27.43 59.80 Q28.66 64.73 31.53 68.92 Q29.59 69.25 27.56 69.45 Z" fill={BAR} />
          {/* small dark bill under the head, a round tip */}
          <path d="M74 34 Q80 35 83 37.6 Q84.2 38.8 82.8 39.5 Q79 40.6 74 39.8 Z" fill={BILL} />
          <circle cx="65" cy="35" r="12" fill={HEAD} />
          {/* orange eye: iris, dark pupil, catchlight */}
          <circle cx="68.5" cy="33" r="4" fill={IRIS} />
          <circle cx="68.5" cy="33" r="2.2" fill="#1B1B1F" />
          <circle cx="67.3" cy="31.8" r="1.3" fill="#FFFFFF" />
        </g>
      );
    },
  },
  // 69 - RED-VENTED BULBUL (U4d, Q6: "use the more interesting colours they have instead of just making
  // them brown"). The commonest bird in the school. Kept apart from the Red-whiskered Bulbul (13), a brown
  // ball with a white face and bib, and the Indian Robin (15), black all over with its tail cocked, by
  // where its dark and pale sit: ONE black hood (the head, a short crest peaked at the back of the crown,
  // the throat and the breast) over a buff belly. The breast is scaly: four dark-grey cups on the
  // black. A sooty-brown back and folded wing whose outer edge is the back's own arc, the crimson vent at
  // the base of the tail with the body's arc as its outer edge, and the tail hanging down and back. Nine
  // shapes and the scales (a white rump read as a bite out of the back and was cut, U4d review 1).
  {
    name: "R-V Bulbul",
    skip: WARMS,
    draw: () => {
      const HOOD = "#231F21", SCALE = "#776B62", WING = "#5B5049", BELLY = "#CDBFA8", VENT = "#C8233B", TAIL = "#2F2927", BILL = "#25201F";
      return (
        <g>
          {/* tail hanging down and back, root under the body, both edges bowed, round end */}
          <path d="M30.03 70.03 Q21.5 74 16.61 82.61 Q13.21 86 16.61 89.39 Q20 92.79 23.39 89.39 Q31.5 85.5 35.97 75.97 Q34.5 71.5 30.03 70.03 Z" fill={TAIL} />
          <circle cx="47" cy="58" r="26" fill={BELLY} />
          {/* the hood's breast: from under the bill down the throat (filling the neck's notch) and the body's front, a hem across the breast, its rear under the wing */}
          <path d="M73.2 39.81 Q71.18 46.72 72.43 52.59 A26 26 0 0 1 72.23 64.29 Q60 70 46 61 Q50 50 56 44 Q66 38 73.2 39.81 Z" fill={HOOD} />
          {/* crimson vent: the body's own arc at the base of the tail, its top under the wing, its front edge one curve on the belly */}
          <path d="M43.83 83.81 A26 26 0 0 1 26.51 74.01 Q30 70 40 70.5 Q49.5 77 43.83 83.81 Z" fill={VENT} />
          {/* sooty back and folded wing: the back's own arc from under the head to the tail's root, a round turn, the lower edge bowed back up to the shoulder */}
          <path d="M52.41 32.57 A26 26 0 0 0 27.08 74.71 Q29.5 79 35 77.6 Q47 74 53.5 61 Q57 54 56 45 Q55.5 38 52.41 32.57 Z" fill={WING} />
          {/* slim black bill under the head, 4.5 deep at the face, a round tip */}
          <path d="M70.5 35.9 Q77 36 81.4 38.5 Q82.8 39.4 81.4 40.3 Q76.5 41.2 71 40.4 Z" fill={BILL} />
          {/* the crest: the crown rising from the forehead to a round peak at the back, dropping into the nape; base inside the head */}
          <path d="M70.34 28.32 Q63.2 19.8 54 18 Q44 16.4 46 20 Q49.5 26 47.24 32.6 Q58 34 70.34 28.32 Z" fill={HOOD} />
          <circle cx="60" cy="37" r="13.5" fill={HOOD} />
          {/* the scaly breast: four cups in two staggered rows, each 2 or more inside the black */}
          {[[62.4, 53.4], [68.2, 53.4], [59.4, 58.9], [65.3, 58.9]].map(([x, y], k) => (
            <path key={k} d={`M${x - 2.4} ${y} Q${x} ${y + 6.4} ${x + 2.4} ${y} Q${x} ${y + 0.4} ${x - 2.4} ${y} Z`} fill={SCALE} />
          ))}
          <Eye cx={64.5} cy={35.5} r={4.4} disc="#0C0A0B" />
        </g>
      );
    },
  },
  // 70 - WHITE-BROWED BULBUL, the PDF's "Murukku bird" (U4d, Q6: drawn from "the more interesting colours
  // they have"). Kept apart from the Yellow-throated Bulbul (12), grey with a yellow HEAD, and the
  // Tailorbird (62), a cream ball with a rust cap and an upright tail, by colour: an olive head on a darker
  // olive back and folded wing (its outer edge the back's own arc), over a butter-yellow body (the yellow
  // wash), and the golden vent at the base of the tail with the body's arc as its outer edge. The white
  // brow is its name: a long, low, level stripe from the forehead above the bill back over the eye, 0.7
  // above it, to well behind it, 3.5 to 4.8 thick with round ends. Level, because the Wagtail's short arch
  // read as a raised eyebrow and a front end dipped toward the bill reads as a frown. The eye sits low in
  // the head, under it. Round-headed, no crest, so it never reads as the Red-vented. Eight shapes.
  {
    name: "W-B Bulbul",
    skip: [0, 5, 7, 8],
    draw: () => {
      const HEAD = "#9C9D50", WING = "#7F803E", TAIL = "#6B6A35", BODY = "#E6DBA6", VENT = "#EDB526", BROW = "#F6F3EA", BILL = "#3E3A33";
      return (
        <g>
          {/* tail down and back, root under the body, both edges bowed, round end */}
          <path d="M28.31 64.31 Q19.33 69.33 13.89 77.89 Q10.78 81 13.89 84.11 Q17 87.22 20.11 84.11 Q28.67 78.67 33.69 69.69 Q32.5 65.5 28.31 64.31 Z" fill={TAIL} />
          <ellipse cx="47" cy="58" rx="27" ry="23" fill={BODY} />
          {/* golden vent: the body's own arc at the base of the tail, its top under the wing, its front edge one curve on the belly */}
          <path d="M42.31 80.65 A27 23 0 0 1 23.62 69.5 Q28 66 40 68.5 Q47.5 73.5 42.31 80.65 Z" fill={VENT} />
          {/* olive back and folded wing: the back's own arc from under the head to the tail's root, a round turn, the lower edge bowed back up to the shoulder */}
          <path d="M56.23 36.39 A27 23 0 0 0 24.1 70.19 Q26.8 74.2 32 73.6 Q44.5 71 52 57 Q55.5 50.5 56.5 44 Q57.2 40 56.23 36.39 Z" fill={WING} />
          {/* slim dark bill under the head, 4.6 deep at the face, a round tip */}
          <path d="M72 37.2 Q79 37.3 83.8 39.9 Q85.2 40.9 83.8 41.7 Q78.5 42.6 72.4 41.6 Z" fill={BILL} />
          <circle cx="62" cy="37" r="13" fill={HEAD} />
          {/* the white brow: long, low and level, from the forehead back over the eye to well behind it, round ends inside the head */}
          <path d="M56.6 31 Q63.5 29.6 71.2 30.8 Q72.6 32.6 71.1 34.3 Q63 35.4 56.8 34 Q55 32.5 56.6 31 Z" fill={BROW} />
          <Eye cx={66.3} cy={40} r={4.4} />
        </g>
      );
    },
  },
  // 71 - RED-WATTLED LAPWING (candidate, Q2 of the 2026-10 expansion: he keeps whichever of this and the
  // Yellow-wattled (24) looks better, from one sheet; 24 is on his LOCKED list and is not touched). The
  // school's own lapwing, the "did-he-do-it" bird. A plump white body on two long yellow legs, each ending
  // in a soft foot; a bronze-brown back and folded wing whose outer edge is the back's own arc; and ONE
  // black hood shaped like a C round the eye: the cap over the crown, the forehead and lores, the throat
  // (filling the neck's notch) and the breast down to a hem. The white between its two arms is the cheek
  // patch, running down the side of the neck into the white belly. The red is one shape: the bare ring
  // round the eye and the wattle in front of it, ending 2.4 short of the red bill, whose dark tip is cut
  // from the bill's own two edges. Ten shapes.
  {
    name: "Red-wattled Lapwing (candidate)",
    skip: WARMS,
    draw: () => {
      const WHT = "#DCDAD2", WING = "#9A7B58", BLK = "#232022", RED = "#D63A3C", TIP = "#262225", LEG = "#E6BF3C", LEGD = "#C9A230";
      return (
        <g>
          {/* two long yellow legs, tops under the body, each turning forward into a soft round foot */}
          <path d="M39 68 Q38.6 79 38.7 86.6 Q38.5 90.6 42 90.8 Q45.8 91 46 89.3 Q45.8 87.8 42.6 87.6 Q42.4 79 42.6 68 Z" fill={LEGD} />
          <path d="M49.4 68 Q49.7 79 50 86.6 Q49.8 90.6 53.3 90.8 Q57.1 91 57.3 89.3 Q57.1 87.8 53.9 87.6 Q53.3 79 53 68 Z" fill={LEG} />
          <ellipse cx="45" cy="52" rx="27" ry="22" fill={WHT} />
          {/* bronze-brown back and folded wing: the back's own arc from under the head to the rear, the lower edge bowed up to a round wrist, then up under the head */}
          <path d="M56.41 32.06 A27 22 0 0 0 21.62 63 Q36 64.5 47.5 53.5 Q50.5 50.5 50.3 46.5 Q50.4 41.5 53.5 38 Q55 34 56.41 32.06 Z" fill={WING} />
          {/* red bill under the head, 4.7 deep at the face, a round tip */}
          <path d="M71 30 Q78.5 30.2 84 32.6 Q85.5 33.5 84 34.4 Q78.5 35.6 71 34.6 Z" fill={RED} />
          {/* its dark tip, cut from the bill's own two edges, the boundary bowed toward the base */}
          <path d="M80.3 31.3 Q82.25 31.84 84 32.6 Q85.5 33.5 84 34.4 Q82.25 34.78 80.3 34.94 Q79.5 33.1 80.3 31.3 Z" fill={TIP} />
          <circle cx="61.5" cy="30" r="12.5" fill={WHT} />
          {/* the black hood as one C: cap from the nape over the crown, down the face, the throat over the neck's notch, the body's front to the hem, then up the bib's rear edge to the eye and back along the cap's lower edge */}
          <path d="M49.91 25.32 A12.5 12.5 0 0 1 61.5 17.5 A12.5 12.5 0 0 1 73.25 34.28 Q69.9 41.62 71.41 47.43 A27 22 0 0 1 70.68 58.8 Q61 62.2 54 55.2 Q55 42.5 62.5 32.5 Q63.5 29 61 27.2 Q55 28 49.91 25.32 Z" fill={BLK} />
          {/* the red: the bare ring round the eye and the wattle in front of it, one shape, ending 2.4 short of the bill */}
          <path d="M64.5 22.9 Q69.4 22.9 70.9 27.6 Q72.2 31.8 70.4 34.1 Q68 36.2 64.5 34.4 Q58.9 34.4 58.9 28.6 Q58.9 22.9 64.5 22.9 Z" fill={RED} />
          <Eye cx={64.5} cy={28.5} r={4.2} disc="#0D0B0C" />
        </g>
      );
    },
  },
  // 72 - LITTLE GREBE (U4e, selection.md section 3: "a dark brown fluff ball with chestnut cheeks and a
  // pale spot at the gape, no tail to speak of; the roundest bird on the list"). The dabchick: one round
  // warm-brown ball, a darker back on the back's own arc, the round head up and forward, and a warm buff
  // powder-puff at the raised rear in place of a tail. The chestnut is one shape: the cheeks and throat,
  // with the eye on it, running down the front of the neck to a hem on the breast; the dark crown and
  // nape are the head's own colour above it. A short black bill and the pale gape spot at its corner,
  // on the face behind the bill's base. Riding on water is not drawn. Eight shapes.
  {
    name: "Little Grebe",
    skip: WARMS,
    draw: () => {
      const FLANK = "#5E4535", BACK = "#3B2E27", CHES = "#B0532D", PUFF = "#CDAE80", GAPE = "#E8E19C", BILL = "#221D1B";
      return (
        <g>
          {/* the powder-puff rear, raised, its root under the body */}
          <ellipse cx="20.5" cy="45" rx="8" ry="6.2" fill={PUFF} transform="rotate(35 20.5 45)" />
          <ellipse cx="46" cy="61" rx="27" ry="24" fill={FLANK} />
          {/* dark back: the body's own arc from under the head to the rear, the lower edge one sag, its front end under the chestnut */}
          <path d="M53 37.82 A27 24 0 0 0 21 51.93 Q36 64 57 53 Q59 45 53 37.82 Z" fill={BACK} />
          {/* short black bill under the head, a round tip */}
          <path d="M71.5 39.4 Q79 40 83.5 42.3 Q85 43.3 83.5 44.2 Q78.5 45.3 72 45 Z" fill={BILL} />
          <circle cx="61" cy="38.5" r="14" fill={BACK} />
          {/* chestnut cheeks, throat and foreneck: the head's outline from the forehead, a crown line 2.2 over the eye, one elliptical arc round behind the cheek and down the side of the neck, a sagging hem on the breast, up the body's front, and the throat's waist meeting both outlines on their own tangents; a dark nape 2.8 wide stays behind it */}
          <path d="M74.16 33.71 Q69 29.5 63 29.5 A12.5 14.5 0 0 0 56.75 56.56 Q62.98 60.73 72.85 58.5 A27 24 0 0 0 72.14 55 Q70.41 49.06 71.72 47.5 A14 14 0 0 0 74.16 33.71 Z" fill={CHES} />
          {/* the pale gape spot at the corner of the bill, on the face */}
          <ellipse cx="69.6" cy="43.8" rx="2.3" ry="1.6" fill={GAPE} transform="rotate(-12 69.6 43.8)" />
          <Eye cx={65.5} cy={36.5} r={4.7} />
        </g>
      );
    },
  },
  // 73 - SCALY-BREASTED MUNIA (U4e, selection.md section 3: "chocolate head and back; cream belly
  // scalloped in dark scales; a stout dark bill. Spots on cream, the inverse of the Spurfowl"). A plump
  // cream ball under a warm-brown back and folded wing whose outer edge is the back's own arc, a big
  // chocolate head with the throat and upper breast in the same chocolate (the bib fills the neck's notch
  // on both outlines' tangents and ends in a sagging hem, its rear under the wing), and the signature:
  // seven dark scallops on the cream breast and flank, each a cup 6 wide and 3.2 thick, all one mark.
  // The bill is a finch's cone, 9 deep at the face tapering to a round 2.8 tip. Kept apart from the
  // Tricolored Munia (46), a chestnut disc with a black hood and a plain white belly, by being brown over
  // a speckled cream. Seven shapes and the scales.
  {
    name: "Scaly-breasted Munia",
    skip: WARMS,
    draw: () => {
      const CHOC = "#5A3524", WING = "#7D5B40", TAIL = "#5E4331", CREAM = "#D8BC8A", SCALE = "#6B4430", BILL = "#3D3B40";
      return (
        <g>
          {/* short tail down and back, root under the body, both edges bowed, round end */}
          <path d="M28 71.5 Q20 76 17.5 83.5 Q15.5 88 19.5 88.5 Q23 88.7 26.5 84.5 Q30.5 78.5 35 77.5 Z" fill={TAIL} />
          <ellipse cx="45.5" cy="60.5" rx="26" ry="24" fill={CREAM} />
          {/* chocolate bib: from under the bill down the throat (the neck's notch, on both outlines' tangents), the body's front, a hem sagging 3 across the breast, its rear under the wing */}
          <path d="M72.22 45.5 Q69.66 49.33 71.04 56 A26 24 0 0 1 71.45 59 Q61 66 50.5 57 Q53 49 58 44 Q65 43 72.22 45.5 Z" fill={CHOC} />
          {/* the scaly breast: seven cups in three staggered rows, each 2 or more inside the cream */}
          {[[57, 65], [64, 65], [51, 70.5], [57.5, 70.5], [64, 70.5], [51.5, 75.5], [58, 75.5]].map(([x, y], k) => (
            <path key={k} d={`M${x - 3} ${y} Q${x} ${y + 7} ${x + 3} ${y} Q${x} ${y + 0.6} ${x - 3} ${y} Z`} fill={SCALE} />
          ))}
          {/* warm-brown back and folded wing: the back's own arc from under the head to the tail's root, a round turn, the lower edge bowed back up to the shoulder */}
          <path d="M52 37.26 A26 24 0 0 0 22.98 72.5 Q24 79 30.5 77.5 Q44.5 73.5 51.5 61.5 Q55 53.5 54.5 45 Q54.5 39.5 52 37.26 Z" fill={WING} />
          {/* stout cone of a bill under the head: 9 deep at the face, a round 2.8 tip */}
          <path d="M70.5 35.8 Q78 36.2 82.6 39.8 Q84 41.2 82.6 42.6 Q78 45.2 71 45 Z" fill={BILL} />
          <circle cx="61" cy="38" r="13.5" fill={CHOC} />
          <Eye cx={64.5} cy={36} r={4.6} disc="#17110E" />
        </g>
      );
    },
  },
  // 74 - BLACK-HEADED IBIS (U4e, selection.md section 3: "white body; bare black head and neck; a long
  // down-curved black bill"). Drawn the way paragraph 43 asks for a pale bird: the white held INSIDE the
  // species' own darker colours rather than laid on the paper. In front, the bare black head and neck as
  // one shape (the round head and a thick neck whose edges leave the head on its own tangents and bow in
  // to a waist, its base tucked under the body so the white's own arc is where the feathers start).
  // Above, a slaty folded wing on the back's own arc (the adult's slaty scapulars and tertials). Behind,
  // the jet-black ornamental plumes the adult carries over its tail in the breeding season, drooping past
  // the rump with the wing's tip lying on them. Below, a slate shade along the belly's own arc and two
  // black legs. No black on the wing tips: that is the Sacred Ibis. The bill is the sickle, 6.3 deep at
  // the face curving down to a 2.4 round tip. Nine shapes.
  {
    name: "Black-headed Ibis (candidate)",
    skip: [],
    draw: () => {
      const WHT = "#DADFE5", SHADE = "#AEB6C1", WING = "#939DA9", BLK = "#262326", HOOD = "#302C2F";
      return (
        <g>
          {/* the black breeding plumes over the tail, root under the body, drooping past the rump to a soft round end */}
          <path d="M33 63 Q22 64 16.5 72 Q14 77.5 18.5 78.3 Q25 77.5 34 70 Z" fill={BLK} />
          {/* two black legs, tops under the body, round-ended */}
          <path d="M40 76 Q39 83 40 88.3 Q40.5 90.6 42.6 90.4 Q44.4 90 44 88 Q43 83 44 76 Z" fill={BLK} />
          <path d="M50 76 Q49 83 50 88.3 Q50.5 90.6 52.6 90.4 Q54.4 90 54 88 Q53 83 54 76 Z" fill={BLK} />
          {/* the sickle bill under the head: 6.3 deep at the face, curving down to a round 2.4 tip */}
          <path d="M72 29.6 Q85 30.5 90.6 47.6 Q91.2 50.2 89 49.4 Q83 36.5 72.5 36.2 Z" fill={BLK} />
          {/* bare black head and neck, one shape: the throat leaving the head on its tangent and bowing in, the base under the body, the nape bowing in back up to the head, then round over the crown */}
          <path d="M73.96 40.36 Q67.53 48.02 68.5 57.5 Q60 60.5 51.5 53 Q55.6 44.74 52.22 37.49 A13 13 0 1 1 73.96 40.36 Z" fill={HOOD} />
          <ellipse cx="45" cy="62" rx="25" ry="19" fill={WHT} />
          {/* slate shade under the belly: the body's own arc from the breast round to the rump, its inner edge one shallower curve, 6 deep at the bottom */}
          <path d="M67.66 70.03 A25 19 0 0 1 21.51 68.5 Q45.42 80.74 67.66 70.03 Z" fill={SHADE} />
          {/* slaty folded wing: the back's own arc from the neck's base to the rump, a round tip lying on the plumes, the lower edge one sag crossing above the body's middle so the white leads */}
          <path d="M57 45.33 A25 19 0 0 0 20.38 65.3 Q17.5 71 22.5 72.5 Q36 70 56 50 Q58.5 47.5 57 45.33 Z" fill={WING} />
          <Eye cx={68} cy={30.5} r={4.6} disc="#0B0A0B" />
        </g>
      );
    },
  },
  // 75 - SPOT-BREASTED FANTAIL (U4e, selection.md section 3: "dark grey-brown; white brow; white-spotted
  // breast; a tail fanned wide. A silhouette nothing else has"). The fan is the bird: a near-black fan
  // spread up and back from the rump, four round feather tips round its rim, its lower side sagging out
  // into the first tip, the last tip dipping behind the back (a dome lying along the back read as a
  // cape). A rich buff belly, the species' own (a pale one washed into the paper, paragraph 43), under a
  // warm dark grey-brown head and breast (one bib from under the bill, filling the neck's notch on both
  // outlines' tangents, to a sagging hem, its rear under the wing), a darker folded wing on the back's
  // own arc, seven white spots on the breast (one mark), and the white brow as a short level stripe from
  // over the eye's front to just behind it: the whites held inside the dark so none touches the paper
  // (paragraphs 25 and 43). Kept apart from the Magpie-Robin (14) and the Indian Robin (15) by the fan
  // and by grey-brown over buff, not black over white. Eight shapes and the spots.
  {
    name: "Spot-breasted Fantail",
    skip: [],
    draw: () => {
      const FAN = "#2A2421", WING = "#3D342F", DARK = "#4F443D", BELLY = "#D6B47E", WHT = "#F4F0E6", BILL = "#27231F";
      return (
        <g>
          {/* the fanned tail, spread up and back from the rump: the lower side sagging out into the first round feather tip, three more tips round the rim, the last dipping behind the back; root inside the body */}
          <path d="M33 66 Q12 69 8.5 60 Q6.93 55.95 13.73 54.87 Q10.03 46.44 19.14 47.68 Q19.51 38.49 27.16 43.59 Q31.34 34.16 38.16 46.09 Q40 58 33 66 Z" fill={FAN} />
          <ellipse cx="51" cy="61" rx="22" ry="20" fill={BELLY} />
          {/* dark breast: from under the bill down the throat (the neck's notch, on both outlines' tangents), the body's front, a hem sagging 3, its rear under the wing */}
          <path d="M74.65 46.46 Q70.78 51.98 71.61 54 A22 20 0 0 1 72.75 64 Q63 71 53 61.5 Q57 52 62 48 Q68 46 74.65 46.46 Z" fill={DARK} />
          {/* the white spots: seven in three staggered rows, each 2 or more inside the dark */}
          {[[63.5, 55], [67.5, 55], [61.5, 59.3], [65.5, 59.3], [69.5, 59.3], [63.5, 63.3], [67.5, 63.3]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="1.5" fill={WHT} />
          ))}
          {/* darker folded wing: the back's own arc from under the head to the rump, a round tip, the lower edge bowed back up to the shoulder */}
          <path d="M56 41.52 A22 20 0 0 0 29.75 66.18 Q29 72.5 35 72 Q50 68 58.5 57 Q61.5 50 58.5 44.5 Q57.5 42.5 56 41.52 Z" fill={WING} />
          {/* small slim bill under the head, a round tip */}
          <path d="M75 40.6 Q80.5 41 84 42.6 Q85.3 43.5 84 44.3 Q80 45 75.5 44.6 Z" fill={BILL} />
          <circle cx="64" cy="39" r="13" fill={DARK} />
          {/* the white brow: a short level pill, both long edges bowed, 10.6 long from over the eye's front to just behind it, 3 to 3.4 thick, 1.1 clear of the eye, round ends inside the head */}
          <path d="M69 30.4 Q64.5 29.5 60.4 31.1 Q58.7 32.6 60.3 34.1 Q64.5 34.8 68.9 33.8 Q70.6 32.1 69 30.4 Z" fill={WHT} />
          <Eye cx={68} cy={39.5} r={4.4} disc="#161412" />
        </g>
      );
    },
  },
  // 76 - COMMON IORA, the breeding male of the valley's race (U4e, selection.md section 3: "yellow with
  // black wings and two white wing bars. Only if the reviewer can hold it apart from the two orioles at
  // 40px"). Held apart by where the black sits: ON TOP, a black cap on the head's own outline from above
  // the bill to the nape that meets a black back and folded wing on the back's own arc, over a lemon face
  // and underparts, with a short black tail out behind. The Black-hooded Oriole (20) is a gold disc with
  // a black HEAD, the Golden Oriole (29) a gold disc with a black wing slash in its middle; both pink-
  // billed. The two white bars are curved bands concentric with the wing's lower edge, so they read as
  // feather rows rather than dashes. A lemon (#EED63E) a shade greener than the orioles' gold, a slim dark
  // bill, the eye on the yellow face. Nine shapes (the two bars are one mark).
  {
    name: "Common Iora",
    skip: [7],
    draw: () => {
      const YEL = "#EED63E", BLK = "#1E1D21", WHT = "#F2EFE6", BILL = "#3A3D45";
      return (
        <g>
          {/* short black tail down and back, root under the body, both edges bowed, round end */}
          <path d="M28.31 64.31 Q19.33 69.33 13.89 77.89 Q10.78 81 13.89 84.11 Q17 87.22 20.11 84.11 Q28.67 78.67 33.69 69.69 Q32.5 65.5 28.31 64.31 Z" fill={BLK} />
          <ellipse cx="47" cy="59" rx="26" ry="22" fill={YEL} />
          {/* black back and folded wing: the back's own arc from under the head to the rear, a rounded tip inside the outline, the lower edge one sag back up to the shoulder */}
          <path d="M55 38.07 A26 22 0 0 0 23.44 68.3 Q25.86 72.68 28.5 74.6 Q30.5 75.8 33 75 Q45 71.5 55.5 56 Q59 48 55 38.07 Z" fill={BLK} />
          {/* the two white wing bars: curved bands 3.2 thick, concentric with the wing's lower edge, round ends, 2 or more inside the black */}
          <path d="M37.44 65.57 Q44.31 63.67 47.49 55.81 Q50.17 53.44 50.45 57.01 Q46.69 66.33 38.3 68.65 Q34.79 67.96 37.44 65.57 Z" fill={WHT} />
          <path d="M35.84 59.79 Q39.85 58.67 41.92 53.56 Q44.6 51.19 44.88 54.76 Q42.23 61.33 36.7 62.87 Q33.19 62.18 35.84 59.79 Z" fill={WHT} />
          {/* slim dark bill under the head, a round tip */}
          <path d="M71.5 36.2 Q79 36.6 84 39 Q85.5 40 84 40.8 Q79 42 72 41.4 Z" fill={BILL} />
          <circle cx="62" cy="38" r="13" fill={YEL} />
          {/* black cap: the head's outline from 4 above the bill over the crown to the nape, where it meets the black back; its lower edge arching 2.5 clear of the eye */}
          <path d="M73.78 32.51 A13 13 0 0 0 49.44 41.36 Q60 28.5 73.78 32.51 Z" fill={BLK} />
          <Eye cx={66} cy={38.5} r={4.4} />
        </g>
      );
    },
  },
];


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
  "Yellow-footed Green-Pigeon (candidate)", // index 51, a Q3 candidate beside the Orange-breasted (48) until he picks
  "Asian Paradise Flycatcher (candidate)", // index 52, U3a's second take on 26; he keeps one
  "Peregrine Falcon (candidate)", // index 53, U3a's second take on 32; he keeps one
  "Blue-capped Rock-Thrush (candidate)", // index 54, U3b's Q4 candidate beside Tickell's (44); he keeps one
  "Small Minivet (candidate)", // index 55, U3b's Q10 second take on 47; he keeps one
  "Sirkeer Malkoha (candidate)", // index 56, U3b's Q10 second take on 11; he keeps one
  "Grey Junglefowl", // index 57, U4a, a new species
  "Indian Spot-billed Duck", // index 58, U4a, a new species
  "Grey-headed Swamphen", // index 59, U4a, a new species
  "Black-winged Kite", // index 60, U4a, a new species
  "Indian Eagle-Owl", // index 61, U4b, a new species
  "Common Tailorbird", // index 62, U4b, a new species
  "Common Kestrel", // index 63, U4b, a new species
  "Black-crowned Night Heron", // index 64, U4b, a new species
  "Pied Kingfisher", // index 65, U4c, a new species
  "Wire-tailed Swallow", // index 66, U4c, a new species
  "Grey Wagtail", // index 67, U4c, a new species
  "Rock Pigeon", // index 68, U4c, a new species
  "Red-vented Bulbul", // index 69, U4d, a new species (Q6)
  "White-browed Bulbul", // index 70, U4d, a new species (Q6), the PDF's "Murukku bird"
  "Red-wattled Lapwing (candidate)", // index 71, U4d's Q2 candidate beside the Yellow-wattled (24); he keeps one
  "Little Grebe", // index 72, U4e, a new species from the reserve
  "Scaly-breasted Munia", // index 73, U4e, a new species from the reserve
  "Black-headed Ibis (candidate)", // index 74, U4e, from the reserve; held back until he says yes (one more grey-and-white bird, brief ¶43)
  "Spot-breasted Fantail", // index 75, U4e, a new species from the reserve
  "Common Iora", // index 76, U4e, a new species from the reserve
];

/**
 * What the public bird galleries list: every species except the ones held back for one account
 * and the candidates (below). Today the held-back one is the Indian Roller alone. The Hoopoe stays
 * on the shelf even though no member may wear it, because a gallery of the valley's birds that
 * left out the mascot would read as an omission rather than a decision.
 *
 * Both /birds and /lab/birds-rv render from this one list, so the count in the page copy and the
 * birds actually shown can never drift apart; the copy's number is checked against it in U6 of
 * the birds expansion (docs/planning/birds-expansion/handover.md).
 */
export const GALLERY_SPECIES: { index: number; name: string }[] = SPECIES_FULL_NAMES.map(
  (name, index) => ({ index, name })
).filter(({ index, name }) => index !== ROLLER_SPECIES_INDEX && !isCandidate(name));

/**
 * A candidate is a second drawing of a bird that already has one, appended while the birds
 * expansion runs (2026-10) so the owner can see both on one sheet and keep one. Until he picks,
 * it is drawn by the dev tooling only: not in the gallery, not in the paid picker, not dealt at
 * signup (all three read GALLERY_SPECIES). The name suffix is the whole marker.
 */
export function isCandidate(name: string): boolean {
  return name.endsWith(" (candidate)");
}

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

/** Whether this member's bird faces left. Pose is hashed from the seed alone, so a species
 *  override keeps the member's pose. Shared with the contact-card photo, which picks the
 *  pre-rendered file for the same species and pose (scripts/dev/generate-bird-photos.mjs). */
export function isMirrored(seed: string): boolean {
  return birdFor(seed).pose >= 2;
}

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
  const flip = isMirrored(seed);
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
