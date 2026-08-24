/* ------------------------------------------------------------------ *
 *  Nine fresh directions for the app icon, after the blue/cream/
 *  cinnamon version shipped and turned out to be wrong.
 *
 *  The owner's complaint, in his words: the green is only the
 *  background, dark mode deletes the background, the three hues read
 *  like a flag, and the same mark cannot also sit on the sidebar.
 *
 *  Every direction here answers the same three questions: what carries
 *  the green, what separates the hills, and what happens when the
 *  ground goes dark. Geometry is imported from peaks-mark.tsx so none
 *  of it can drift from the shipped mark.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { PEAK_PLANES as P } from "@/components/layout/peaks-mark";

/* Palette. Everything except the two mid-greens is already in globals.css. */
const C = {
  pine: "#173F35", // the icon tile today
  canopy: "#235C49", // sidebar green
  leaf: "#1F8A4C", // primary green
  sage: "#8CA383", // the middle hill today
  moss: "#3E7A5E", // between canopy and leaf, no neon in it
  fern: "#5C8F6E", // a soft light green that is not #34C759
  cinnamon: "#C2622F",
  sky: "#3F7CA6",
  cream: "#EAF1DF",
  paper: "#F5F2EA",
  ink: "#141B18",
  night: "#0F1714",
};

/* The icon box: same 512, same rx=96, same art transform as icon.svg. */
function Box({
  size,
  ground,
  groundNode,
  transform = "translate(85 190) scale(0.38)",
  children,
}: {
  size: number;
  ground: string;
  groundNode?: ReactNode;
  /** Overridden only by the full bleed direction, which draws much larger. */
  transform?: string;
  children: ReactNode;
}) {
  const r = Math.round((size * 96) / 512);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden
      style={{
        borderRadius: r,
        boxShadow: "0 1px 2px rgba(30,28,22,.16), 0 0 0 1px rgba(30,28,22,.07)",
      }}
    >
      {groundNode ?? <rect width="512" height="512" fill={ground} />}
      <g transform={transform}>{children}</g>
    </svg>
  );
}

/** Three flat fills, front to back. The plain case. */
const flat = (a: string, b: string, c: string) => (
  <>
    <path d={P.silhouette} fill={a} />
    <path d={P.middle} fill={b} />
    <path d={P.rishi} fill={c} />
  </>
);

/**
 * Three hills in ONE colour, told apart by a sliver of the ground between
 * them. The stroke is the ground colour laid over the shared edge, so the
 * separation costs no second hue. This is the cheapest way to answer "it
 * looks like a blob" without answering it with more colour.
 */
const cut = (hill: string, ground: string, w = 20) => (
  <>
    <path d={P.silhouette} fill={hill} />
    <path d={P.middle} fill={hill} stroke={ground} strokeWidth={w} />
    <path d={P.rishi} fill={hill} stroke={ground} strokeWidth={w} />
  </>
);

type Skin = {
  ground: string;
  groundNode?: ReactNode;
  transform?: string;
  hills: ReactNode;
};
type Direction = {
  key: string;
  name: string;
  why: string;
  light: Skin;
  dark: Skin;
};

const DIRECTIONS: Direction[] = [
  {
    key: "first-light",
    name: "First light",
    why: "Two greens and one warm hill, not three equal hues. Rishikonda is the ridge that catches the sun first, so the cinnamon is the last hill on the right and nothing else. Two thirds of the mark is green, which is what stops it reading as a flag.",
    light: {
      ground: C.paper,
      hills: flat(C.canopy, C.moss, C.cinnamon),
    },
    dark: {
      ground: C.pine,
      hills: flat(C.fern, C.cream, C.cinnamon),
    },
  },
  {
    key: "cut",
    name: "Cut from one green",
    why: "One colour, three hills. The gap between them is the background showing through, so the separation survives at any size and in any theme. The softest thing on this page.",
    light: { ground: C.paper, hills: cut(C.canopy, C.paper) },
    dark: { ground: C.ink, hills: cut(C.fern, C.ink) },
  },
  {
    key: "valley-greens",
    name: "Valley greens",
    why: "The tonal idea again, done properly. The greens in the lab last week were phone-UI greens. These three come off the hills: deep, mid, hazy. Nothing here glows.",
    light: { ground: C.cream, hills: flat(C.pine, C.canopy, C.sage) },
    dark: { ground: C.night, hills: flat(C.sage, C.moss, C.canopy) },
  },
  {
    key: "constant",
    name: "One figure, two grounds",
    why: "The strict version of the rule. The hills are byte-identical in both themes and only the tile moves. Whatever the OS does to the background, the identity is untouched, because the identity was never in the background.",
    light: { ground: C.paper, hills: flat(C.canopy, C.moss, C.cinnamon) },
    dark: { ground: C.ink, hills: flat(C.canopy, C.moss, C.cinnamon) },
  },
  {
    key: "asthachal",
    name: "Asthachal",
    why: "The warm colour stops being a hill and becomes the sun going down behind the ridge. Now all three hills can be green, the mark still has a second colour, and the second colour means something: the place the school watches the light leave.",
    light: {
      ground: C.paper,
      hills: (
        <>
          <circle cx="455" cy="168" r="122" fill={C.cinnamon} opacity="0.92" />
          <path d={P.silhouette} fill={C.canopy} />
          <path d={P.middle} fill={C.moss} />
          <path d={P.rishi} fill={C.pine} />
        </>
      ),
    },
    dark: {
      ground: C.night,
      hills: (
        <>
          <circle cx="455" cy="168" r="122" fill="#D8763C" />
          <path d={P.silhouette} fill={C.moss} />
          <path d={P.middle} fill={C.canopy} />
          <path d={P.rishi} fill={C.pine} />
        </>
      ),
    },
  },
  {
    key: "ridgeline",
    name: "The ridgeline",
    why: "No fill at all. A drawn line reads as a place rather than a logo, and it is the only treatment here that would work embossed, stamped or on a school letterhead. It is also the one most likely to fail at 16px, which is why the small sizes are right there.",
    light: {
      ground: C.paper,
      hills: (
        <path
          d={P.ridge}
          stroke={C.canopy}
          strokeWidth="52"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    dark: {
      ground: C.ink,
      hills: (
        <path
          d={P.ridge}
          stroke={C.fern}
          strokeWidth="52"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
  },
  {
    key: "green-cream-green",
    name: "Green, cream, green",
    why: "Your own separator argument, with the second colour taken out. The pale hill sits between two greens purely so the edges never merge for someone squinting at a 16px tab. Two hues total, three hills, and the mark is still mostly green.",
    light: { ground: C.paper, hills: flat(C.moss, C.cream, C.pine) },
    dark: { ground: C.pine, hills: flat(C.fern, C.cream, C.canopy) },
  },
  {
    key: "bleed",
    name: "Full bleed valley",
    why: "Every other direction draws a small mark floating on a large field, which is why they all soften at 16px. This one crops in until the range runs off both edges. The shapes get roughly twice as big for free, so it is the most legible thing here at the smallest size, and it reads as a view rather than a badge.",
    light: {
      ground: "#E8E2D2",
      transform: "translate(10 302) scale(0.56)",
      hills: flat(C.canopy, C.moss, C.fern),
    },
    dark: {
      ground: C.night,
      transform: "translate(10 302) scale(0.56)",
      hills: flat(C.moss, C.fern, C.canopy),
    },
  },
  {
    key: "sky",
    name: "Sky over hills",
    why: "The tile stops being a tile. The top half is air and the bottom half is the valley, so the background is doing drawing rather than sitting behind the drawing. Dark mode becomes evening instead of a black square, which is the one direction here where going dark is a gain and not a loss.",
    light: {
      ground: C.paper,
      groundNode: (
        <>
          <defs>
            <linearGradient id="sky-l" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9DDE4" />
              <stop offset="100%" stopColor="#F0EBDD" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" fill="url(#sky-l)" />
        </>
      ),
      hills: flat(C.canopy, C.moss, C.fern),
    },
    dark: {
      ground: C.night,
      groundNode: (
        <>
          <defs>
            <linearGradient id="sky-d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B3742" />
              <stop offset="100%" stopColor="#12211D" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" fill="url(#sky-d)" />
        </>
      ),
      hills: flat(C.canopy, C.moss, C.pine),
    },
  },
];



/* The synthesis: the crop from Full bleed, the sun from Asthachal, greens
   only on the hills. Shown last because it is an argument, not an option. */
const PICK: Direction = {
  key: "pick",
  name: "Sunset over the three hills",
  why: "The crop from Full bleed valley, the sun from Asthachal, and no colour on a hill that is not green. Green is now the largest thing in the mark in both themes, the warm accent is a sun rather than a peak so it cannot read as a flag stripe, and the shapes are big enough to survive a 16px tab.",
  light: {
    ground: "#EFE9DA",
    transform: "translate(10 302) scale(0.56)",
    hills: (
      <>
        <circle cx="455" cy="168" r="122" fill={C.cinnamon} opacity="0.9" />
        <path d={P.silhouette} fill={C.canopy} />
        <path d={P.middle} fill={C.moss} />
        <path d={P.rishi} fill={C.pine} />
      </>
    ),
  },
  dark: {
    ground: C.night,
    transform: "translate(10 302) scale(0.56)",
    hills: (
      <>
        <circle cx="455" cy="168" r="122" fill="#D8763C" />
        <path d={P.silhouette} fill={C.moss} />
        <path d={P.middle} fill={C.fern} />
        <path d={P.rishi} fill={C.canopy} />
      </>
    ),
  },
};

/* A phone home screen, roughly. Neighbours are deliberately dull: the point is
   whether ours holds its own in a grid, not whether it beats a nice icon. */
const NEIGHBOURS = ["#8E8E93", "#C7C7CC", "#7B8A99", "#A99C8D", "#9AA79B", "#B3ADA1", "#87909B"];

function HomeScreen({
  d,
  theme,
}: {
  d: Direction;
  theme: "light" | "dark";
}) {
  const s = theme === "light" ? d.light : d.dark;
  const wall =
    theme === "light"
      ? "linear-gradient(160deg,#D9D3C4,#C7C6BC)"
      : "linear-gradient(160deg,#2A2E31,#15181A)";
  const cells = [];
  for (let i = 0; i < 8; i++) {
    if (i === 5) {
      cells.push(
        <span className="hs-app" key="ours">
          <Box size={54} ground={s.ground} groundNode={s.groundNode} transform={s.transform}>
            {s.hills}
          </Box>
          <em>Rishi Valley</em>
        </span>,
      );
    } else {
      cells.push(
        <span className="hs-app" key={i}>
          <i style={{ background: NEIGHBOURS[i > 5 ? i - 1 : i] }} />
          <em />
        </span>,
      );
    }
  }
  return (
    <figure className="hs">
      <div className="hs-wall" style={{ background: wall }}>
        {cells}
      </div>
      <figcaption>
        {d.name}, {theme}
      </figcaption>
    </figure>
  );
}

/* Sidebar lockup structures, drawn at the rail's real width. */
const RAIL = C.canopy;

function Rail({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <figure className="rail">
      <div className="rail-box" style={{ background: RAIL }}>
        <div className="rail-top">{children}</div>
        <ul>
          <li className="on">Feed</li>
          <li>Directory</li>
          <li>Collection</li>
          <li>Letters</li>
        </ul>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function RailMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={Math.round((size * 1140) / 350)}
      height={size}
      viewBox="-110 40 1140 350"
      aria-hidden
    >
      <path d={P.silhouette} fill={C.cream} />
    </svg>
  );
}

function Card({ d }: { d: Direction }) {
  return (
    <div className="card">
      <div className="cap">
        <span className="nm">{d.name}</span>
      </div>
      <p className="why">{d.why}</p>
      <div className="rows">
        {[d.light, d.dark].map((s, i) => (
          <div className="row" key={i}>
            <Box
              size={132}
              ground={s.ground}
              groundNode={s.groundNode}
              transform={s.transform}
            >
              {s.hills}
            </Box>
            <div className="minis">
              <Box
                size={48}
                ground={s.ground}
                groundNode={s.groundNode}
                transform={s.transform}
              >
                {s.hills}
              </Box>
              <Box
                size={32}
                ground={s.ground}
                groundNode={s.groundNode}
                transform={s.transform}
              >
                {s.hills}
              </Box>
              <Box
                size={16}
                ground={s.ground}
                groundNode={s.groundNode}
                transform={s.transform}
              >
                {s.hills}
              </Box>
              <em>{i === 0 ? "light" : "dark"}</em>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IconDirectionsLab() {
  return (
    <div className="idr">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.idr { --bg:#EBE6D7; --ink:#23241E; --soft:#6B6A5C;
  min-height:100vh; background:var(--bg); color:var(--ink);
  padding:40px 44px 96px; font-family:var(--font-body),system-ui,sans-serif; }
.idr h1 { font-family:var(--font-display),serif; font-size:31px; letter-spacing:-.02em; margin:0 0 10px; max-width:20ch; }
.idr .lede { color:var(--soft); font-size:15px; margin:0 0 10px; max-width:64ch; line-height:1.65; }
.idr h2 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin:44px 0 8px; }
.idr .sub { color:var(--soft); font-size:13.5px; margin:0 0 18px; max-width:64ch; line-height:1.6; }
.faults { display:flex; flex-wrap:wrap; gap:14px; margin:18px 0 0; padding:0; list-style:none; }
.faults li { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:16px;
  padding:14px 16px; width:min(100%,330px); font-size:13.5px; line-height:1.6; color:var(--ink); }
.faults b { display:block; font-size:12px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--soft); margin-bottom:5px; font-weight:600; }
.grid { display:flex; flex-wrap:wrap; gap:16px; }
.card { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:20px;
  padding:16px 16px 14px; width:min(100%,436px); }
.nm { font-size:15.5px; font-weight:600; letter-spacing:-.01em; }
.why { color:var(--soft); font-size:13px; line-height:1.6; margin:6px 0 14px; }
.rows { display:flex; flex-direction:column; gap:12px; }
.row { display:flex; align-items:flex-end; gap:14px; }
.minis { display:flex; align-items:flex-end; gap:9px; }
.minis em { font-style:normal; font-size:10px; letter-spacing:.06em; color:var(--soft); margin-bottom:2px; }
.hs-row { display:flex; flex-wrap:wrap; gap:22px; }
.hs-pair { display:flex; gap:12px; }
.hs figcaption { font-size:12px; color:var(--soft); margin-top:8px; }
.hs-wall { width:250px; border-radius:22px; padding:20px 16px;
  display:grid; grid-template-columns:repeat(4,1fr); gap:14px 10px; }
.hs-app { display:flex; flex-direction:column; align-items:center; gap:5px; }
.hs-app i { width:54px; height:54px; border-radius:13px; display:block; opacity:.85; }
.hs-app em { font-style:normal; font-size:8px; color:rgba(255,255,255,.85); height:10px;
  text-shadow:0 1px 2px rgba(0,0,0,.4); }
.rails { display:flex; flex-wrap:wrap; gap:18px; }
.rail figcaption { font-size:12px; color:var(--soft); margin-top:8px; max-width:26ch; line-height:1.5; }
.rail-box { width:248px; border-radius:16px; padding:18px 16px 22px; }
.rail-top { min-height:38px; display:flex; align-items:center; gap:10px; color:${C.cream};
  font-family:var(--font-display),serif; font-weight:700; font-size:18px; letter-spacing:-.01em; }
.rail-box ul { list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:3px; }
.rail-box li { font-size:14px; color:#D3E2D9; padding:9px 12px; border-radius:11px; }
.rail-box li.on { background:rgba(255,255,255,.11); color:#fff; }
@media (max-width:640px) {
  /* Two home screens side by side is 512px of content on a 390px phone, which
     was pushing the whole page into a horizontal scroll. */
  .hs-pair { flex-wrap:wrap; }
  .hs-wall { width:min(100%,250px); }
  .idr { padding:28px 18px 72px; }
  .idr h1 { font-size:26px; }
  .card { padding:14px 12px 12px; }
}
`,
        }}
      />

      <h1>The green has to be in the hills, not behind them</h1>
      <p className="lede">
        The icon that shipped puts blue, cream and cinnamon on the hills and the
        green on the tile. That makes the green the one part of the mark the
        operating system is allowed to take away, and in dark mode it does.
      </p>
      <p className="lede">
        Every direction below is built on one rule: the hills carry the
        identity, the tile is scenery. Each is shown on a light ground and a
        dark one, then at 48, 32 and 16 pixels, because that is where a nice
        idea usually dies.
      </p>

      <h2>What is actually wrong</h2>
      <ul className="faults">
        <li>
          <b>The green is scenery</b>
          It only exists as the tile. Turn the tile dark and the mark has no
          green left at all, which is exactly the version you saw on your home
          screen.
        </li>
        <li>
          <b>Three hues at one strength</b>
          Blue, cream and cinnamon are equally loud and sit in bands. That is
          the recipe for a flag. Hills are not equal, so their colours should
          not be either.
        </li>
        <li>
          <b>One mark cannot do both jobs</b>
          A colourful mark on a green rail will always fight. Nearly every
          studio ships two lockups: full colour for the icon, one flat colour
          for interface chrome. That is the fix, not a compromise.
        </li>
      </ul>

      <h2>Nine directions</h2>
      <p className="sub">
        Top row of each card is the light ground, bottom row the dark one.
      </p>
      <div className="grid">
        {DIRECTIONS.map((d) => (
          <Card key={d.key} d={d} />
        ))}
      </div>

      <h2>In a grid, which is where you actually see it</h2>
      <p className="sub">
        Three of the nine, dropped onto a home screen next to seven dull
        neighbours. An icon that looks fine alone can still go quiet here.
      </p>
      <div className="hs-row">
        {["bleed", "first-light", "asthachal"].map((k) => {
          const d = DIRECTIONS.find((x) => x.key === k)!;
          return (
            <div className="hs-pair" key={k}>
              <HomeScreen d={d} theme="light" />
              <HomeScreen d={d} theme="dark" />
            </div>
          );
        })}
      </div>

      <h2>If it were mine to decide</h2>
      <p className="sub">
        One specimen, then the argument. This is not a tenth option so much as
        the three above it stapled together.
      </p>
      <div className="grid">
        <Card d={PICK} />
        <div className="card">
          <div className="cap">
            <span className="nm">Why this one</span>
          </div>
          <p className="why">
            <b>The crop does the heavy lifting.</b> Every mark on this page has
            the same problem at 16px, and only one of them fixes it by drawing
            bigger rather than drawing simpler. Cropping in is free legibility.
          </p>
          <p className="why">
            <b>The sun is the only warm thing.</b> A stripe of orange next to a
            stripe of blue is a flag. A sun behind a ridge is a time of day. It
            also gives the dark version something to be about, instead of being
            the light version with the lights off.
          </p>
          <p className="why">
            <b>Green is the biggest shape in both themes.</b> That was the whole
            complaint, and it is the one thing every direction here had to
            satisfy before it earned a card.
          </p>
          <p className="why">
            <b>What I would not do.</b> Ship the ridgeline: look at its 16px
            tile, there is nothing there. Ship Sky over hills as it stands: it
            is the prettiest thing on the page and its two themes are two
            different products. Ship Valley greens: three soft greens on a cream
            field is the mossy, dirty look you already rejected once.
          </p>
        </div>
      </div>

      <h2>Then the rail</h2>
      <p className="sub">
        Same three questions, different room. The mark on the sidebar is one
        flat cream in all three, because that is the second lockup. What changes
        is how much of the name you keep.
      </p>
      <div className="rails">
        <Rail label="Mark and name, as it is now. The name is spelled out in the one place the product is home.">
          <RailMark />
          <span>Rishi Valley</span>
        </Rail>
        <Rail label="Name only. The mark is reserved for the icon, so the two never compete and the rail gets quieter.">
          <span>Rishi Valley</span>
        </Rail>
        <Rail label="Mark only, larger. Confident, and wrong for a site people reach once a month and need reminding of.">
          <RailMark size={34} />
        </Rail>
      </div>
    </div>
  );
}
