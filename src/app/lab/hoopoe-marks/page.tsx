/* ------------------------------------------------------------------ *
 *  If the bird were the logo.
 *
 *  Every mark on this page is THE mascot, not a drawing of it. The
 *  first version of this room hand-rolled its own feathers and its own
 *  head and they were, correctly, thrown out: there is already a
 *  finished character in src/components/mascot/hoopoe.tsx with months
 *  of curve work in it, and a logo study that redraws it from memory is
 *  worth nothing.
 *
 *  So the technique is crop, not draw. Each tile renders the real rig
 *  at whatever size makes the chosen window fill the square, then clips
 *  to it. Changing the mascot changes every mark below, which is the
 *  correct relationship between a character and a logo cut from it.
 *
 *  The rig is idle={false} everywhere: these are logos, they hold still.
 * ------------------------------------------------------------------ */

import { Hoopoe } from "@/components/mascot/hoopoe";

const C = {
  canopy: "#235C49",
  cream: "#FBF4E6",
  ink: "#141B18",
};

/**
 * A window onto the rig, in its own user units (viewBox "0 -10 120 152").
 * Square, because an app icon is square and a crop that is not would
 * letterbox the bird.
 */
type Crop = { x: number; y: number; w: number };

/** Everything the rig lets us tune about the face, per mark. */
type Rig = {
  headScale?: number;
  eyeScale?: number;
  eyeY?: number;
  eyeSpread?: number;
  billLength?: number;
};

function BirdTile({
  size,
  ground,
  crop,
  rig,
  round = true,
}: {
  size: number;
  ground: string;
  crop: Crop;
  rig?: Rig;
  round?: boolean;
}) {
  const p = size / crop.w; // px per rig user unit
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: round ? Math.round((size * 96) / 512) : 0,
        background: ground,
        overflow: "hidden",
        position: "relative",
        flex: "none",
        boxShadow: round
          ? "0 1px 2px rgba(30,28,22,.16), 0 0 0 1px rgba(30,28,22,.07)"
          : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -crop.x * p,
          /* the rig's viewBox starts at y = -10, so its top edge is y + 10 */
          top: -(crop.y + 10) * p,
        }}
      >
        <Hoopoe size={120 * p} idle={false} variant="icon" {...rig} />
      </div>
    </div>
  );
}

type Mark = {
  key: string;
  name: string;
  why: string;
  crop: Crop;
  rig?: Rig;
  light: string;
  dark: string;
};

const MARKS: Mark[] = [
  {
    key: "crest",
    name: "Just the crest",
    why: "The fan on its own, cropped so the outer feathers nearly touch the sides and the crown anchors it along the bottom. Symmetrical, so it never looks like it is facing away from the page. A hoopoe to anyone who knows the bird and a sunrise to everyone who does not, which is a good place for a mark to live.",
    crop: { x: 34, y: -3, w: 52 },
    light: C.canopy,
    dark: C.ink,
  },
  {
    key: "crest-bled",
    name: "The crest, run off the top",
    why: "The same fan pushed up until the tips leave the tile. You lose the dark caps, which is a real cost, and you gain scale: the shapes come out half again as big, so this is the version that still says something at 16px.",
    crop: { x: 38, y: 9, w: 44 },
    light: C.canopy,
    dark: C.ink,
  },
  {
    key: "face",
    name: "Just the face",
    why: "Head, eyes, bill and the base of the crest, centred on the eyes rather than on the head. That is the difference between a portrait and a passport photo. The expression is the rig's own rest pose: round eyes, both catchlights, bill closed. Calm rather than startled.",
    crop: { x: 29, y: 23, w: 62 },
    rig: { eyeScale: 1.06, billLength: 0.92 },
    light: C.canopy,
    dark: C.ink,
  },
  {
    key: "face-close",
    name: "The face, closer",
    why: "The same face with the crown and the tip of the bill pushed off the square. Bigger eyes, less air, more character. Best of the lot at 512px on a home screen and the most likely to read as a toy at 16.",
    crop: { x: 33, y: 32, w: 54 },
    rig: { headScale: 0.96, eyeScale: 1.12, billLength: 0.86 },
    light: C.canopy,
    dark: C.ink,
  },
  {
    key: "head",
    name: "Head and crest",
    why: "The whole head with the fan above it and nothing cut off. The most complete portrait that is still a mark rather than an illustration. It also has the most to lose when it shrinks, and the 16px tile says so honestly.",
    crop: { x: 18, y: -2, w: 84 },
    rig: { eyeScale: 1.04 },
    light: C.canopy,
    dark: C.ink,
  },
  {
    key: "whole",
    name: "The whole bird",
    why: "The character exactly as the app already uses it, sitting in the square. The least designed option and the most honest one: whoever installs this gets the same bird that greets them inside. It is also the first to go to mush, because a whole body at 16px is a lot of shapes over very few pixels.",
    crop: { x: -1, y: 4, w: 122 },
    light: C.canopy,
    dark: C.ink,
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
            <BirdTile size={132} ground={g} crop={m.crop} rig={m.rig} />
            <div className="minis">
              <BirdTile size={44} ground={g} crop={m.crop} rig={m.rig} />
              <BirdTile size={32} ground={g} crop={m.crop} rig={m.rig} />
              <BirdTile size={16} ground={g} crop={m.crop} rig={m.rig} />
              <em>{i === 0 ? "light" : "dark"}</em>
            </div>
          </div>
        ))}
      </div>
      <div className="onrail">
        <div className="rail-strip">
          <BirdTile
            size={30}
            ground="transparent"
            crop={m.crop}
            rig={m.rig}
            round={false}
          />
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
.onrail { margin-top:14px; }
.rail-strip { background:${C.canopy}; border-radius:13px; padding:10px 14px;
  display:flex; align-items:center; gap:10px; color:${C.cream};
  font-family:var(--font-display),serif; font-weight:700; font-size:18px; letter-spacing:-.01em; }
.rails { display:flex; flex-wrap:wrap; gap:18px; }
.rail figcaption { font-size:12px; color:var(--soft); margin-top:8px; max-width:26ch; line-height:1.5; }
.rail-box { width:248px; border-radius:16px; padding:18px 16px 22px; background:${C.canopy}; }
.rail-top { min-height:40px; display:flex; align-items:center; gap:10px; color:${C.cream};
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
        Six marks, every one of them the actual mascot with a square cut out of
        it. Nothing here is redrawn. Each tile renders the real rig at whatever
        size makes the chosen window fill the icon, so when the character
        changes, every mark on this page changes with it.
      </p>
      <p className="lede">
        Worth saying before the ideas start. The bird carries its own three
        colours, cinnamon, cream and near black, and none of them depend on the
        tile. That is the thing the hills could never do. Put it on green in the
        day and on charcoal at night and the identity does not move.
      </p>

      <h2>Six crops</h2>
      <p className="sub">
        Top row of each card is the light ground, bottom the dark. Under both is
        the same crop on the rail, which is where you will see it a hundred
        times more often than on a home screen.
      </p>
      <div className="grid">
        {MARKS.map((m) => (
          <Card key={m.key} m={m} />
        ))}
      </div>

      <h2>The rail, at full width</h2>
      <p className="sub">
        The name is one word now, which changes the lockup. Six letters is short
        enough to carry a bigger mark beside it than Rishi Valley ever could.
      </p>
      <div className="rails">
        {[MARKS[0], MARKS[2], MARKS[3]].map((m) => (
          <figure className="rail" key={m.key}>
            <div className="rail-box">
              <div className="rail-top">
                <BirdTile
                  size={34}
                  ground="transparent"
                  crop={m.crop}
                  rig={m.rig}
                  round={false}
                />
                <span>Hoopoe</span>
              </div>
              <ul>
                <li className="on">Feed</li>
                <li>Directory</li>
                <li>Collection</li>
                <li>Letters</li>
              </ul>
            </div>
            <figcaption>{m.name}</figcaption>
          </figure>
        ))}
      </div>

      <h2>What I would actually do</h2>
      <p className="sub">
        The crest for the icon and the rail both. It is the only mark here that
        is a shape rather than a picture, it is symmetrical so it never looks
        like it is facing away from the page, and it keeps the face in reserve
        for the places the mascot already lives. A logo that is also a character
        is a character you can never stop drawing.
      </p>
      <p className="sub">
        If you want the face, take the closer crop rather than the full
        portrait. Head and crest at 16px is a smudge with a hat on. The tight
        face at least keeps two eyes, and two eyes is the only thing a face
        needs to survive being that small.
      </p>
    </div>
  );
}
