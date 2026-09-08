/* ------------------------------------------------------------------ *
 *  Five walls, invented, deterministic.
 *
 *  WHY NOT `?data=pressure`. The pressure corpus carries ONE wall, of
 *  twenty-four photographs, one each from twenty-four people
 *  (`_fixtures/pressure.ts`, PHOTO_WALL). That is the happy middle. The
 *  four cases that decide whether a shape is a shape are not in it: one
 *  photograph, three, two hundred, and a wall where every photograph is
 *  portrait. So they are here, in the corpus the fixture's own cast and
 *  photographs are drawn from, and the twenty-four is reproduced exactly
 *  so nothing is judged against a friendlier version of the known case.
 *
 *  NOTHING RANDOM. Every choice is a function of the index, so the same
 *  wall draws the same way on a reload, in a screenshot, and on his
 *  machine. `Math.random` here would make two rounds of comparison
 *  meaningless.
 *
 *  THE PHOTOGRAPHS are the app's own, and each one's real pixel size is
 *  recorded beside it because a wall is a layout problem about shapes: a
 *  run gives every photograph its own width, and a drift chooses a
 *  measure FROM the shape. Both are wrong if the shapes are guessed.
 *
 *  AND THEY ALL COME FROM `public/images/`, NOT `public/lab/`. The crop
 *  room's eleven ratios (`public/lab/crop/`) would have been the better
 *  spread, 21:9 down to 9:16, and they cannot be used: `/lab` requires a
 *  session (`src/proxy.ts`, audit M19), and next/image's optimiser fetches
 *  the source server-side with no cookie. So `/lab/crop/shape-9x16.webp`
 *  answers 307 to the optimiser, `/_next/image` answers 400, and the page
 *  draws a broken-image glyph while the same file loads perfectly in a
 *  plain <img> two rooms over. Anything under /lab is unreachable to
 *  next/image, in any room, for ever.
 *
 *  The cost is the extremes: the widest photograph the app owns is 1.68:1
 *  and the tallest is 0.667:1 (2:3). A 2:3 portrait at the full reading
 *  column is already 1,284px tall on a laptop, so the case the all-portrait
 *  wall exists to break is still broken; 9:16 would only break it further.
 * ------------------------------------------------------------------ */

export type WallPerson = {
  id: string;
  name: string;
  batchYear: number;
};

export type WallShot = {
  id: string;
  src: string;
  /** width / height, from the file. */
  ratio: number;
  by: WallPerson;
  caption: string | null;
  hearts: number;
};

/* ── the photographs ───────────────────────────────────────────────── */

type Plate = { src: string; ratio: number };

const plate = (src: string, w: number, h: number): Plate => ({
  src,
  ratio: Math.round((w / h) * 1000) / 1000,
});

/** Wide, square and portrait, six ratios from 1.684 to 0.667, in an order
 *  that gives a mixed wall rather than all the wide ones first. The app
 *  owns twelve photographs and three of them are portrait, so the three
 *  come round more than once: a wall's layout does not know or care that
 *  two frames hold the same picture, and the shapes are what is on trial. */
const PLATES: Plate[] = [
  plate("/images/collection/demo-banyan-canopy.webp", 1280, 760),
  plate("/images/collection/v3.webp", 900, 1300),
  plate("/images/collection/c1.webp", 900, 900),
  plate("/images/collection/v1.webp", 1200, 800),
  plate("/images/collection/demo-assembly-wide.webp", 760, 1140),
  plate("/images/collection/demo-banyan-arch.webp", 900, 900),
  plate("/images/collection/v2.webp", 800, 1100),
  plate("/images/collection/demo-banyan-pillar.webp", 1200, 800),
  plate("/images/collection/c3.webp", 900, 900),
  plate("/images/collection/v3.webp", 900, 1300),
  plate("/images/collection/demo-banyan-benches.webp", 900, 900),
  plate("/images/collection/demo-banyan-canopy.webp", 1280, 760),
  plate("/images/collection/demo-assembly-wide.webp", 760, 1140),
  plate("/images/collection/c2.webp", 900, 900),
  plate("/images/collection/v2.webp", 800, 1100),
  plate("/images/collection/demo-banyan-trunk.webp", 900, 900),
  plate("/images/collection/v1.webp", 1200, 800),
  plate("/images/collection/c4.webp", 900, 900),
];

/** Only the tall ones, for the all-portrait wall. */
const PORTRAITS = PLATES.filter((p) => p.ratio < 0.9);

/* ── the people ────────────────────────────────────────────────────── */

const NAMES = [
  "Meera Raghavan",
  "Ashwin Menon",
  "Tara Fernandes",
  "Nandini Iyer",
  "Joseph Mathew",
  "Vikram Shenoy",
  "Leela Nair",
  "Kavya Pillai",
  "Imran Sheikh",
  "Sunita Bose",
  "Arjun Varma",
  "Priya Balan",
  "Gautam Reddy",
  "Rhea D'Souza",
  "Naveen Kumar",
  "Shalini Ganesh",
  "Karthik Subramanian",
  "Anandi Deshpande",
  "Farhan Qureshi",
  "Mallika Chatterjee",
  "Rohan Pai",
  "Ishaan Bhatt",
  "Divya Sundaram",
  "Neel Acharya",
  "Padma Venkataraman",
  "Zoya Alam",
  "Sameer Joshi",
  "Uma Krishnamurthy",
  "Dev Anand Rao",
  "Bhavana Kulkarni",
  "Yusuf Ansari",
  "Radhika Swaminathan",
  "Aditya Ghosh",
  "Charu Lakshmi",
  "Nikhil Trivedi",
  "Saira Bhandari",
  "Ram Prasad",
  "Ela Bhattacharya",
  "Manav Sethi",
  "Jaya Narayanan",
];

/** The longest name in the list is 19 characters, which is not a test. This
 *  one is, and it sits under whichever frame is narrowest in the wall. */
const LONG_NAME = "Chandrasekhar Venkataraghavan";

function personAt(i: number): WallPerson {
  const name = i === 3 ? LONG_NAME : NAMES[i % NAMES.length];
  return {
    id: `wall-person-${i}`,
    name,
    batchYear: 1971 + ((i * 7) % 52),
  };
}

/* ── the captions ──────────────────────────────────────────────────── */

/** About one photograph in three carries words, which matches the live
 *  Edition: of the fourteen answers with a photograph on it, five have a
 *  body as well. One is long enough to need a clamp wherever a wall shows
 *  captions at all. */
const CAPTIONS = [
  "The tamarind, still there.",
  null,
  null,
  "Took this on the walk down from the old dining hall, about six in the morning.",
  null,
  "Bangalore, from the balcony. Not the valley but it is what I have this month.",
  null,
  null,
  "My daughter, first time she has seen it.",
  null,
  "This is the longest thing anybody wrote under a photograph on the live Edition, and it is here because a wall that only ever meets four words has not met a caption. It runs on for a while, the way people do when they have not written to anybody in three months and the photograph reminds them of something they had not thought about since they left. There is no cap on this field today.",
  null,
];

function captionAt(i: number): string | null {
  return CAPTIONS[i % CAPTIONS.length];
}

/* ── building a wall ───────────────────────────────────────────────── */

function shot(i: number, plate: Plate, by: WallPerson): WallShot {
  return {
    id: `wall-shot-${i}`,
    src: plate.src,
    ratio: plate.ratio,
    by,
    caption: captionAt(i),
    /* A few carry hearts and most do not, which is the live Edition again:
       hearts are rare and a wall drawn as though every photograph has six
       is a wall drawn against a fantasy. */
    hearts: i % 5 === 0 ? (i % 3) + 1 : 0,
  };
}

/** THE CAP, and it is his, 2026-09-09: **three**, the same as an ordinary
 *  answer. The spec had said a wall question raises the cap without saying
 *  to what, and six was proposed here. He said *"cap photo wall also at 3
 *  each"*, so the answering control is the photo strip exactly as it is
 *  drawn today, with nothing changed about it at all. */
export const WALL_CAP = 3;

/** `count` photographs spread over `people`, contributors in order, so
 *  somebody who sent more than one has theirs side by side. That grouping
 *  is what a run has to survive: it is the difference between a wall of
 *  people and a wall of pictures.
 *
 *  Nobody exceeds `WALL_CAP`, which is what makes these walls legal rather
 *  than illustrative. Most people send one; the pattern gives every wall at
 *  least one person at two and one at three, and if the photographs run out
 *  before the count is reached it goes round again, still capped. */
function wall(
  count: number,
  people: number,
  plates: Plate[] = PLATES,
): WallShot[] {
  const target = (p: number) => Math.min(WALL_CAP, p % 9 === 4 ? 3 : p % 4 === 1 ? 2 : 1);
  const order: number[] = [];
  for (let p = 0; p < people && order.length < count; p += 1) {
    for (let k = 0; k < target(p) && order.length < count; k += 1) order.push(p);
  }
  /* Still short: another pass, one each, and never past the cap. */
  for (let round = 0; order.length < count && round < WALL_CAP; round += 1) {
    for (let p = 0; p < people && order.length < count; p += 1) {
      const mine = order.filter((x) => x === p).length;
      if (mine < WALL_CAP) order.push(p);
    }
  }
  /* Contributors travel together, which is what a run groups on. */
  order.sort((a, b) => a - b);
  return order.map((p, i) => shot(i, plates[i % plates.length], personAt(p)));
}

export type WallKey = "one" | "three" | "real" | "portrait" | "flood";

export const WALLS: Record<
  WallKey,
  { label: string; note: string; shots: WallShot[] }
> = {
  one: {
    label: "One",
    note: "One person answered. Every shape has to look deliberate holding a single photograph, not like a layout that lost the rest.",
    shots: wall(1, 1),
  },
  three: {
    label: "Three",
    note: "Three photographs from three people, which is what a wall looks like on the first morning and what most of them will look like for good.",
    shots: wall(3, 3),
  },
  real: {
    label: "Twenty-four",
    note: "The pressure corpus's own wall: 24 photographs, mixed shapes, a few people who sent more than one.",
    shots: wall(24, 18),
  },
  portrait: {
    label: "All portrait",
    note: "Eighteen photographs, every one taller than it is wide, down to 9:16. This is the shape a phone takes and it is the one that breaks a column.",
    shots: wall(18, 14, PORTRAITS),
  },
  flood: {
    label: "Two hundred",
    note: "Eighty people at the cap of three each, which is what a large Catch-up answering in force looks like. The photographs repeat because the app owns twelve of them; the layout does not know that.",
    shots: wall(200, 80),
  },
};

/** Consecutive photographs from the same person, as one group. */
export function byContributor(shots: WallShot[]): WallShot[][] {
  const out: WallShot[][] = [];
  for (const s of shots) {
    const last = out[out.length - 1];
    if (last && last[0].by.id === s.by.id) last.push(s);
    else out.push([s]);
  }
  return out;
}

