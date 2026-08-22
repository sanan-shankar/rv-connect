/* ------------------------------------------------------------------ *
 *  The app icon, in the site's own colours.
 *
 *  The shipped icon paints the three hills in a set that exists nowhere
 *  else on the site: cream, sage, near-black. This room asks the obvious
 *  question instead - what if the hills were the green, the cinnamon and
 *  the blue the rest of the product already uses.
 *
 *  Every tile here is the real icon geometry: the same 512 box, the same
 *  96 radius, the same translate(85 190) scale(0.38) as src/app/icon.svg,
 *  and the plane paths imported from peaks-mark.tsx so they can never
 *  drift from the shipped mark. Only the fills change.
 * ------------------------------------------------------------------ */

import { PEAK_PLANES } from "@/components/layout/peaks-mark";

/* The brand's raw values, straight off globals.css. */
const C = {
  leaf: "#1F8A4C", // primary green
  leafLight: "#34C759", // lit accent, the green on active nav
  canopy: "#235C49", // deep sidebar green
  sky: "#3F7CA6", // office blue
  cinnamon: "#C2622F", // warm accent
  cream: "#EAF1DF", // the front hill as it ships today
  sage: "#8CA383", // the middle hill as it ships today
  pine: "#173F35", // the back hill as it ships today
  white: "#FFFFFF",
};

/** front = Bodi on the left, mid = Middle Peak, back = Rishikonda on the right. */
type Palette = {
  name: string;
  front: string;
  mid: string;
  back: string;
  /** opacity per plane, only used by the one-colour-three-depths options */
  fade?: [number, number, number];
  note?: string;
};

const CURRENT: Palette = {
  name: "Ships today",
  front: C.cream,
  mid: C.sage,
  back: C.pine,
  fade: [1, 0.72, 0.37],
};

const PALETTES: Palette[] = [
  { name: "Green, orange, blue", front: C.leaf, mid: C.cinnamon, back: C.sky },
  { name: "Green, blue, orange", front: C.leaf, mid: C.sky, back: C.cinnamon },
  {
    name: "Dark green, orange, blue",
    front: C.canopy,
    mid: C.cinnamon,
    back: C.sky,
  },
  {
    name: "Dark green, blue, orange",
    front: C.canopy,
    mid: C.sky,
    back: C.cinnamon,
  },
  {
    name: "Light green, orange, blue",
    front: C.leafLight,
    mid: C.cinnamon,
    back: C.sky,
  },
  {
    name: "Light green, blue, orange",
    front: C.leafLight,
    mid: C.sky,
    back: C.cinnamon,
  },
];

/* Ideas the brief did not ask for, kept separate so they do not muddy the
   six real candidates above. */
const EXTRAS: Palette[] = [
  {
    name: "Three greens",
    front: C.leafLight,
    mid: C.leaf,
    back: C.canopy,
    note: "One hue, three steps. The only option that still looks like a hill at 16px.",
  },
  {
    name: "Cream, orange, blue",
    front: C.cream,
    mid: C.cinnamon,
    back: C.sky,
    note: "Keeps the pale front hill it has now, brand colours only behind it.",
  },
  {
    name: "Green, orange, cream",
    front: C.leaf,
    mid: C.cinnamon,
    back: C.cream,
    note: "Depth runs the other way. The far hill is the light one, which is what haze actually does.",
  },
  {
    name: "White, three depths",
    front: C.white,
    mid: C.white,
    back: C.white,
    fade: [1, 0.68, 0.42],
    note: "No colour at all. Needs a coloured tile under it.",
  },
];

/* The four tiles every palette is shown on. */
const TILES = [
  { key: "cream", bg: "#F5F2EA", label: "paper" },
  { key: "white", bg: "#FFFFFF", label: "white" },
  { key: "canopy", bg: "#235C49", label: "sidebar green" },
  { key: "night", bg: "#141B18", label: "dark" },
];

/* Solid tiles for the white-mark row. */
const SOLID_TILES = [
  { bg: C.canopy, label: "canopy" },
  { bg: C.leaf, label: "green" },
  { bg: C.cinnamon, label: "cinnamon" },
  { bg: C.sky, label: "blue" },
  { bg: C.pine, label: "pine" },
];

function Icon({
  p,
  bg,
  size = 88,
}: {
  p: Palette;
  bg: string;
  size?: number;
}) {
  const fade = p.fade ?? [1, 1, 1];
  // The tile's corner radius is 96 of 512 in the real icon, so it has to be
  // scaled per size here. A fixed CSS radius turned the 32px tiles into circles.
  const r = Math.round((size * 96) / 512);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden
      style={{
        borderRadius: r,
        boxShadow:
          "0 1px 2px rgba(30,28,22,.14), 0 0 0 1px rgba(30,28,22,.07)",
      }}
    >
      <rect width="512" height="512" rx="96" fill={bg} />
      <g transform="translate(85 190) scale(0.38)">
        <path d={PEAK_PLANES.silhouette} fill={p.front} opacity={fade[0]} />
        <path d={PEAK_PLANES.middle} fill={p.mid} opacity={fade[1]} />
        <path d={PEAK_PLANES.rishi} fill={p.back} opacity={fade[2]} />
      </g>
    </svg>
  );
}

function Row({ p }: { p: Palette }) {
  return (
    <div className="card">
      <div className="cap">
        <span className="nm">{p.name}</span>
        <span className="chips">
          <i style={{ background: p.front }} />
          <i style={{ background: p.mid }} />
          <i style={{ background: p.back }} />
        </span>
      </div>
      {p.note ? <p className="note">{p.note}</p> : null}
      <div className="tiles">
        {TILES.map((t) => (
          <span className="tile" key={t.key}>
            <Icon p={p} bg={t.bg} />
            <em>{t.label}</em>
          </span>
        ))}
      </div>
      {/* Favicon sizes. A browser tab is 16px and a bookmark bar is 32px, so
          any option that turns to mud here is out no matter how it looks big. */}
      <div className="small">
        <span className="s-set" style={{ background: "#F5F2EA" }}>
          <Icon p={p} bg="#F5F2EA" size={32} />
          <Icon p={p} bg="#F5F2EA" size={16} />
        </span>
        <span className="s-set" style={{ background: "#141B18" }}>
          <Icon p={p} bg="#141B18" size={32} />
          <Icon p={p} bg="#141B18" size={16} />
        </span>
        <span className="s-set" style={{ background: "#235C49" }}>
          <Icon p={p} bg="#235C49" size={32} />
          <Icon p={p} bg="#235C49" size={16} />
        </span>
      </div>
    </div>
  );
}

export default function IconColoursLab() {
  const flat: Palette = {
    name: "flat white",
    front: C.white,
    mid: C.white,
    back: C.white,
  };
  return (
    <div className="ic">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.ic { --bg:#EBE6D7; --ink:#23241E; --soft:#6B6A5C;
  min-height:100vh; background:var(--bg); color:var(--ink);
  padding:40px 44px 96px; font-family:var(--font-body),system-ui,sans-serif; }
.ic h1 { font-family:var(--font-display),serif; font-size:30px; letter-spacing:-.02em; margin:0 0 8px; }
.ic .lede { color:var(--soft); font-size:14.5px; margin:0 0 8px; max-width:66ch; line-height:1.65; }
.ic h2 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin:40px 0 6px; }
.ic .sub { color:var(--soft); font-size:13.5px; margin:0 0 18px; max-width:66ch; line-height:1.6; }
.grid { display:flex; flex-wrap:wrap; gap:16px; }
.card { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:20px;
  padding:16px 16px 14px; width:min(100%,436px); }
.cap { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.nm { font-size:14.5px; font-weight:600; letter-spacing:-.01em; }
.chips { display:inline-flex; gap:4px; }
.chips i { width:11px; height:11px; border-radius:99px; display:block;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.12); }
.note { color:var(--soft); font-size:12.5px; line-height:1.55; margin:6px 0 0; }
.tiles { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
.tile { display:flex; flex-direction:column; align-items:center; gap:5px; }
.tile em { font-style:normal; font-size:10px; letter-spacing:.05em; color:var(--soft); }
.small { display:flex; gap:8px; margin-top:12px; }
.s-set { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:12px;
  box-shadow:inset 0 0 0 1px rgba(30,28,22,.1); }
.solids { display:flex; flex-wrap:wrap; gap:10px; }
/* 44px of side padding costs a whole tile column on a 390px phone. */
@media (max-width:640px) {
  .ic { padding:28px 18px 72px; }
  .ic h1 { font-size:25px; }
  .card { padding:14px 12px 12px; }
}
`,
        }}
      />

      <h1>The app icon, in the site&apos;s own colours</h1>
      <p className="lede">
        The icon paints its three hills cream, sage and near-black. None of those
        three is a colour the site uses anywhere else, which is why it only ever
        looks right sitting on sidebar green. Below is the same mark wearing the
        green, the cinnamon and the blue instead, in every order worth seeing, on
        a light tile and a dark one.
      </p>
      <p className="lede">
        Left hill is Bodi, middle is Middle Peak, right is Rishikonda. Names read
        left to right in that order.
      </p>

      <h2>What ships today</h2>
      <p className="sub">
        The baseline. Look at the dark tile: the back hill is near-black on
        near-black, so the mark loses its right shoulder entirely.
      </p>
      <div className="grid">
        <Row p={CURRENT} />
      </div>

      <h2>Green first</h2>
      <p className="sub">
        Six orders. Three greens, and for each one the cinnamon and the blue
        either way round.
      </p>
      <div className="grid">
        {PALETTES.map((p) => (
          <Row key={p.name} p={p} />
        ))}
      </div>

      <h2>Four more worth a look</h2>
      <p className="sub">Not asked for. Included because they answer the same complaint.</p>
      <div className="grid">
        {EXTRAS.map((p) => (
          <Row key={p.name} p={p} />
        ))}
      </div>

      <h2>Flat white on a brand tile</h2>
      <p className="sub">
        No planes at all, one silhouette. This is the version that survives
        anything: a 16px tab, a monochrome dock, a printed page.
      </p>
      <div className="solids">
        {SOLID_TILES.map((t) => (
          <span className="tile" key={t.label}>
            <Icon p={flat} bg={t.bg} />
            <em>{t.label}</em>
          </span>
        ))}
        {SOLID_TILES.map((t) => (
          <span className="tile" key={`${t.label}-sm`}>
            <Icon p={flat} bg={t.bg} size={32} />
            <em>32px</em>
          </span>
        ))}
      </div>
    </div>
  );
}
