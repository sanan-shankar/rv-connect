/* ------------------------------------------------------------------ *
 *  If the bird were the logo.
 *
 *  Seven marks built out of the mascot's own parts (./_parts.tsx), not
 *  cropped out of the finished puppet and not redrawn from memory. The
 *  curves are the character's; the proportions are a logo's. Mostly
 *  that means fanning the crest much further than a bird ever would,
 *  because a mark has no body under it to keep the fan in scale.
 *
 *  Each tile is a viewBox onto the rig's own 120-unit space, so a mark
 *  is defined by two things: what it draws and where the square sits.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { Body, Crest, Face, G } from "./_parts";

function Tile({
  size,
  ground,
  view,
  children,
  round = true,
}: {
  size: number;
  ground: string;
  /** the window onto the rig's coordinate space */
  view: string;
  children: ReactNode;
  round?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={view}
      aria-hidden
      style={{
        borderRadius: round ? Math.round((size * 96) / 512) : 0,
        display: "block",
        flex: "none",
        boxShadow: round
          ? "0 1px 2px rgba(30,28,22,.16), 0 0 0 1px rgba(30,28,22,.07)"
          : undefined,
      }}
    >
      {/* the tile itself, painted in the mark's own coordinates */}
      <rect x="-500" y="-500" width="1200" height="1200" fill={ground} />
      {children}
    </svg>
  );
}

type Mark = {
  key: string;
  name: string;
  why: string;
  view: string;
  art: ReactNode;
  /** the one-colour version; separators take the ground colour */
  flat: (ground: string) => ReactNode;
  light: string;
  dark: string;
};

const MARKS: Mark[] = [
  {
    key: "fan",
    name: "The fan",
    view: "14 -32 92 92",
    why: "The crest opened to 152 degrees across thirteen feathers, which is far wider than the bird can actually manage. On a real hoopoe the fan has a head under it holding it in scale. A mark has nothing under it, so it has to be the whole thing: wide, shallow, symmetrical, and closer to a sunrise than to a haircut.",
    art: <Crest n={13} spread={76} len={1.32} w={1.02} taper={0.1} />,
    flat: (g) => <Crest n={13} spread={76} len={1.32} w={1.02} taper={0.1} flat={G.cream} sep={g} />,
    light: G.canopy,
    dark: G.ink,
  },
  {
    key: "fan-bled",
    name: "The fan, run off the sides",
    view: "24 -26 68 68",
    why: "The same fan with the outer feathers leaving the tile. Everything comes out about a third bigger, which is the only thing that ever helps at 16px, and the cut edges make the mark feel like a window onto something larger rather than a badge sitting in the middle of a square.",
    art: <Crest n={13} spread={76} len={1.32} w={1.02} taper={0.1} />,
    flat: (g) => <Crest n={13} spread={76} len={1.32} w={1.02} taper={0.1} flat={G.cream} sep={g} />,
    light: G.canopy,
    dark: G.ink,
  },
  {
    key: "peek",
    name: "Peeking",
    view: "22 -14 78 78",
    why: "The one you spotted by accident. The head comes up from the bottom edge, the eyes are cut by it, and the fan does the rest. It is the only mark here with any suspense in it, and the cut is doing the work: a whole face is a picture, two thirds of a face looking at you is a character.",
    art: (
      <>
        <Crest n={11} spread={68} len={1.18} w={1} taper={0.08} />
        <Face eyeS={1.12} billL={0.9} />
      </>
    ),
    flat: (g) => (
      <>
        <Crest n={11} spread={68} len={1.18} w={1} taper={0.08} flat={G.cream} sep={g} />
        <Face eyeS={1.12} billL={0.9} flat={G.cream} />
      </>
    ),
    light: G.canopy,
    dark: G.ink,
  },
  {
    key: "rising",
    name: "Rising",
    view: "18 -8 84 84",
    why: "The same idea backed off by six units. The eyes clear the edge and the head is what gets cut instead. Calmer, less of a joke, and it keeps both catchlights, which is most of what makes the bird look alive rather than printed.",
    art: (
      <>
        <Crest n={11} spread={66} len={1.15} taper={0.08} />
        <Face eyeS={1.06} billL={0.92} />
      </>
    ),
    flat: (g) => (
      <>
        <Crest n={11} spread={66} len={1.15} taper={0.08} flat={G.cream} sep={g} />
        <Face eyeS={1.06} billL={0.92} flat={G.cream} />
      </>
    ),
    light: G.canopy,
    dark: G.ink,
  },
  {
    key: "portrait",
    name: "The portrait",
    view: "16 -4 88 88",
    why: "Head and fan complete, nothing cut, with the crest opened wider than the character wears it so the mark is broad rather than tall. The bill is shortened a little and the eyes are up a hair. Those are the same three dials the live puppet takes, so whatever gets chosen here can be set on the real bird in one line.",
    art: (
      <>
        <Crest n={11} spread={62} len={1.16} taper={0.06} />
        <Face eyeS={1.06} billL={0.88} />
      </>
    ),
    flat: (g) => (
      <>
        <Crest n={11} spread={62} len={1.16} taper={0.06} flat={G.cream} sep={g} />
        <Face eyeS={1.06} billL={0.88} flat={G.cream} />
      </>
    ),
    light: G.canopy,
    dark: G.ink,
  },
  {
    key: "shoulder",
    name: "Head and shoulder",
    view: "8 -6 104 104",
    why: "The body brought in under the head and cut off at the bottom edge, so the bird is sitting in the tile rather than floating in it. The extra mass helps at small sizes and costs the mark some of its poise at large ones.",
    art: (
      <>
        <Crest n={11} spread={62} len={1.14} taper={0.06} />
        <Body />
        <Face eyeS={1.04} billL={0.9} />
      </>
    ),
    flat: (g) => (
      <>
        <Crest n={11} spread={62} len={1.14} taper={0.06} flat={G.cream} sep={g} />
        <Body flat={G.cream} />
        <Face eyeS={1.04} billL={0.9} flat={G.cream} />
      </>
    ),
    light: G.canopy,
    dark: G.ink,
  },
  {
    key: "onecolour",
    name: "The fan, one colour",
    view: "14 -32 92 92",
    why: "The same fan with the bands and the dark caps taken out. This is what the mark has to survive as: a favicon, an embossed page, a stamp, the rail. If it still reads here it is a logo, and if it only works in full colour it is an illustration.",
    art: <Crest n={13} spread={76} len={1.32} w={1.02} taper={0.1} flat={G.cream} sep={G.canopy} />,
    flat: (g) => <Crest n={13} spread={76} len={1.32} w={1.02} taper={0.1} flat={G.cream} sep={g} />,
    light: G.canopy,
    dark: G.ink,
  },
];

function Card({ m }: { m: Mark }) {
  return (
    <div className="card">
      <div className="cap">
        <span className="nm">{m.name}</span>
      </div>
      <p className="why">{m.why}</p>
      <div className="rows">
        {[m.light, m.dark].map((g, i) => (
          <div className="row" key={i}>
            <Tile size={132} ground={g} view={m.view}>
              {m.art}
            </Tile>
            <div className="minis">
              <Tile size={44} ground={g} view={m.view}>
                {m.art}
              </Tile>
              <Tile size={32} ground={g} view={m.view}>
                {m.art}
              </Tile>
              <Tile size={16} ground={g} view={m.view}>
                {m.art}
              </Tile>
              <em>{i === 0 ? "light" : "dark"}</em>
            </div>
          </div>
        ))}
      </div>
      <div className="onrail">
        <div className="rail-strip">
          <Tile size={30} ground="transparent" view={m.view} round={false}>
            {m.flat(G.canopy)}
          </Tile>
          <span>Hoopoe</span>
        </div>
        <div className="rail-strip">
          <Tile size={30} ground="transparent" view={m.view} round={false}>
            {m.art}
          </Tile>
          <span>Hoopoe</span>
        </div>
      </div>
    </div>
  );
}

export default function HoopoeMarksLab() {
  return (
    <div className="hm">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.hm { --bg:#EBE6D7; --ink:#23241E; --soft:#6B6A5C;
  min-height:100vh; background:var(--bg); color:var(--ink);
  padding:40px 44px 96px; font-family:var(--font-body),system-ui,sans-serif; }
.hm h1 { font-family:var(--font-display),serif; font-size:31px; letter-spacing:-.02em; margin:0 0 10px; max-width:22ch; }
.hm .lede { color:var(--soft); font-size:15px; margin:0 0 10px; max-width:64ch; line-height:1.65; }
.hm h2 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin:44px 0 8px; }
.hm .sub { color:var(--soft); font-size:13.5px; margin:0 0 18px; max-width:64ch; line-height:1.6; }
.grid { display:flex; flex-wrap:wrap; gap:16px; }
.card { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:20px;
  padding:16px 16px 14px; width:min(100%,436px); }
.nm { font-size:15.5px; font-weight:600; letter-spacing:-.01em; }
.why { color:var(--soft); font-size:13px; line-height:1.6; margin:6px 0 14px; }
.rows { display:flex; flex-direction:column; gap:12px; }
.row { display:flex; align-items:flex-end; gap:14px; }
.minis { display:flex; align-items:flex-end; gap:9px; }
.minis em { font-style:normal; font-size:10px; letter-spacing:.06em; color:var(--soft); margin-bottom:2px; }
.onrail { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
.rail-strip { background:${G.canopy}; border-radius:13px; padding:10px 14px;
  display:flex; align-items:center; gap:10px; color:${G.cream};
  font-family:var(--font-display),serif; font-weight:700; font-size:18px; letter-spacing:-.01em; }
.rails { display:flex; flex-wrap:wrap; gap:18px; }
.rail figcaption { font-size:12px; color:var(--soft); margin-top:8px; max-width:26ch; line-height:1.5; }
.rail-box { width:248px; border-radius:16px; padding:18px 16px 22px; background:${G.canopy}; }
.rail-top { min-height:40px; display:flex; align-items:center; gap:10px; color:${G.cream};
  font-family:var(--font-display),serif; font-weight:700; font-size:19px; letter-spacing:-.01em; }
.rail-box ul { list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:3px; }
.rail-box li { font-size:14px; color:#D3E2D9; padding:9px 12px; border-radius:11px; }
.rail-box li.on { background:rgba(255,255,255,.11); color:#fff; }
@media (max-width:640px) {
  .hm { padding:28px 18px 72px; }
  .hm h1 { font-size:26px; }
  .card { padding:14px 12px 12px; }
}
`,
        }}
      />

      <h1>If the bird were the logo</h1>
      <p className="lede">
        Seven marks made from the mascot&apos;s own parts rather than cropped out
        of it. Every curve below is the character&apos;s: the feather with its
        pale band and dark cap, the round eye with both catchlights, the slender
        closed bill. What changes is proportion.
      </p>
      <p className="lede">
        The main change is the fan. A hoopoe wears its crest across about a
        hundred degrees because it has a head under it keeping the fan in
        scale. A logo has nothing under it, so the crest has to open much
        further before it stops looking like a haircut and starts looking like a
        mark. Most of these run at 130 to 150 degrees.
      </p>

      <h2>Seven marks</h2>
      <p className="sub">
        Light ground, then dark. Under each card, the rail twice: once in one
        flat cream, once in full colour, because that choice matters more on the
        sidebar than the mark does.
      </p>
      <div className="grid">
        {MARKS.map((m) => (
          <Card key={m.key} m={m} />
        ))}
      </div>

      <h2>The rail, at full width</h2>
      <p className="sub">
        Hoopoe is six letters, which is short enough to carry a bigger mark
        beside it than Rishi Valley ever could.
      </p>
      <div className="rails">
        {[MARKS[0], MARKS[2], MARKS[4]].map((m) => (
          <figure className="rail" key={m.key}>
            <div className="rail-box">
              <div className="rail-top">
                <Tile size={34} ground="transparent" view={m.view} round={false}>
                  {m.flat(G.canopy)}
                </Tile>
                <span>Hoopoe</span>
              </div>
              <ul>
                <li className="on">Feed</li>
                <li>Directory</li>
                <li>Collection</li>
                <li>Letters</li>
              </ul>
            </div>
            <figcaption>{m.name}, flat</figcaption>
          </figure>
        ))}
        {[MARKS[0], MARKS[2]].map((m) => (
          <figure className="rail" key={`${m.key}-colour`}>
            <div className="rail-box">
              <div className="rail-top">
                <Tile size={34} ground="transparent" view={m.view} round={false}>
                  {m.art}
                </Tile>
                <span>Hoopoe</span>
              </div>
              <ul>
                <li className="on">Feed</li>
                <li>Directory</li>
                <li>Collection</li>
                <li>Letters</li>
              </ul>
            </div>
            <figcaption>{m.name}, full colour</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
