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
