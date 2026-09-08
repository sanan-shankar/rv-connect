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
  /* Three middles that are not in globals.css yet. Each is here because the
     palette has no candidate at that job: a mid green between canopy and
     leaf, a warm that is quieter than cinnamon, and the dry-grass gold the
     valley actually is for eight months of the year. */
  moss: "#3E7A5E",
  clay: "#B4795A",
  gold: "#C9A961",
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
];

/* Every order of cream, cinnamon and blue. Six of them, which is all there is. */
const CREAM_SET: Palette[] = [
  {
    name: "Cream, orange, blue",
    front: C.cream,
    mid: C.cinnamon,
    back: C.sky,
  },
  {
    name: "Cream, blue, orange",
    front: C.cream,
    mid: C.sky,
    back: C.cinnamon,
  },
  {
    name: "Orange, cream, blue",
    front: C.cinnamon,
    mid: C.cream,
    back: C.sky,
  },
  {
    name: "Orange, blue, cream",
    front: C.cinnamon,
    mid: C.sky,
    back: C.cream,
  },
  {
    name: "Blue, cream, orange",
    front: C.sky,
    mid: C.cream,
    back: C.cinnamon,
  },
  {
    name: "Blue, orange, cream",
    front: C.sky,
    mid: C.cinnamon,
    back: C.cream,
  },
];

/* Two that belong to neither set. */
const TAIL: Palette[] = [
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

/** What src/app/icon.svg paints today. */
const SHIPPED: Palette = {
  name: "Blue, cream, orange",
  front: C.sky,
  mid: C.cream,
  back: C.cinnamon,
};


/* ---------------------------------------------------------------- *
 *  Cream and a dark green on the outside, one colour in the middle.
 *
 *  Two fixed hills and one variable, which is a much smaller question
 *  than the full permutation study above and the reason it gets a
 *  table rather than cards. Rows are the middle colour, columns are
 *  the order. The two tables are the two grounds worth testing: cream
 *  needs a dark tile to exist at all, so a paper tile is not one of
 *  them.
 * ---------------------------------------------------------------- */
const MIDDLES = [
  { key: "moss", name: "Moss", hex: C.moss },
  { key: "sage", name: "Sage", hex: C.sage },
  { key: "leaf", name: "Leaf", hex: C.leaf },
  { key: "cinnamon", name: "Cinnamon", hex: C.cinnamon },
  { key: "clay", name: "Clay", hex: C.clay },
  { key: "gold", name: "Dry gold", hex: C.gold },
  { key: "sky", name: "Blue", hex: C.sky },
];

const ORDERS = [
  { key: "c-canopy", label: "cream, x, canopy", front: C.cream, back: C.canopy },
  { key: "c-pine", label: "cream, x, pine", front: C.cream, back: C.pine },
  { key: "canopy-c", label: "canopy, x, cream", front: C.canopy, back: C.cream },
  { key: "pine-c", label: "pine, x, cream", front: C.pine, back: C.cream },
];

function OrderTable({ bg, caption }: { bg: string; caption: string }) {
  return (
    <div className="tbl">
      <div className="tbl-head">
        <span className="tbl-corner">{caption}</span>
        {ORDERS.map((o) => (
          <span className="tbl-col" key={o.key}>
            {o.label}
          </span>
        ))}
      </div>
      {MIDDLES.map((m) => (
        <div className="tbl-row" key={m.key}>
          <span className="tbl-lab">
            <i style={{ background: m.hex }} />
            {m.name}
          </span>
          {ORDERS.map((o) => (
            <span className="tbl-cell" key={o.key}>
              <Icon
                p={{ name: "", front: o.front, mid: m.hex, back: o.back }}
                bg={bg}
                size={82}
              />
              <Icon
                p={{ name: "", front: o.front, mid: m.hex, back: o.back }}
                bg={bg}
                size={16}
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

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
.tilecheck { display:flex; flex-wrap:wrap; gap:16px; }
.tbl { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:20px;
  padding:14px 16px 16px; width:max-content; max-width:100%; overflow-x:auto; }
.tbl-head, .tbl-row { display:grid; grid-template-columns:104px repeat(4,110px); align-items:center; gap:8px; }
.tbl-head { padding-bottom:8px; }
.tbl-col, .tbl-corner { font-size:10.5px; letter-spacing:.04em; color:var(--soft); text-align:center; }
.tbl-corner { text-align:left; font-weight:600; }
.tbl-row { padding:7px 0; border-top:1px solid rgba(35,36,30,.06); }
.tbl-lab { font-size:12.5px; display:flex; align-items:center; gap:7px; }
.tbl-lab i { width:11px; height:11px; border-radius:99px; box-shadow:inset 0 0 0 1px rgba(0,0,0,.12); }
.tbl-cell { display:flex; align-items:flex-end; justify-content:center; gap:7px; }
.tbls { display:flex; flex-wrap:wrap; gap:18px; }
.tilecheck .card { width:min(100%,520px); }
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
        Four orders. Two greens, and for each one the cinnamon and the blue
        either way round.
      </p>
      <div className="grid">
        {PALETTES.map((p) => (
          <Row key={p.name} p={p} />
        ))}
      </div>

      <h2>Cream, orange and blue: all six</h2>
      <p className="sub">
        Every order there is. Watch the cream: wherever it lands, it vanishes on
        the paper and white tiles and does its best work on the two dark ones.
      </p>
      <div className="grid">
        {CREAM_SET.map((p) => (
          <Row key={p.name} p={p} />
        ))}
      </div>

      <h2>Two more</h2>
      <p className="sub">Neither set has a home for these.</p>
      <div className="grid">
        {TAIL.map((p) => (
          <Row key={p.name} p={p} />
        ))}
      </div>

      <h2>Cream outside, one colour in the middle</h2>
      <p className="sub">
        Two hills fixed, one variable. Rows are the middle colour, columns are
        the order. Cream needs something dark behind it to exist, so both
        tables use a dark tile. The 16px next to each one is the whole test.
      </p>
      <p className="sub">
        The first colour is the biggest hill, so it decides how green the icon
        reads. Cream first makes a pale icon with green in it. Canopy or pine
        first makes a green icon with a pale peak at the back, which is closer
        to what you asked for. On the pine tile the pine hill disappears, so
        two of those eight columns are only there to prove it.
      </p>
      <div className="tbls">
        <OrderTable bg="#141B18" caption="on dark" />
        <OrderTable bg={C.pine} caption="on pine" />
      </div>

      <h2>The tile: pine or canopy</h2>
      <p className="sub">
        Blue, cream, cinnamon is the set that shipped. The only thing still
        open is the green behind it. Pine #173F35 is what the icon has always
        used and appears nowhere else in the app. Canopy #235C49 is the sidebar
        green exactly.
      </p>
      <div className="tilecheck">
        {[
          { name: "Pine #173F35", bg: "#173F35" },
          { name: "Canopy #235C49", bg: "#235C49" },
        ].map((t) => (
          <div className="card" key={t.bg}>
            <div className="cap">
              <span className="nm">{t.name}</span>
            </div>
            <div className="tiles" style={{ alignItems: "flex-end" }}>
              <Icon p={SHIPPED} bg={t.bg} size={160} />
              <Icon p={SHIPPED} bg={t.bg} size={64} />
              <Icon p={SHIPPED} bg={t.bg} size={48} />
              <Icon p={SHIPPED} bg={t.bg} size={32} />
              <Icon p={SHIPPED} bg={t.bg} size={16} />
            </div>
          </div>
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
