/* ------------------------------------------------------------------ *
 *  What Apple is doing to the inside of our icon, and how to do it
 *  ourselves.
 *
 *  The owner noticed that on his home screen each hill in our icon has
 *  a bright line along its top edge and a dark one underneath, so the
 *  hills separate from each other and the black crest tips stop
 *  blending into the tile. He is explicitly NOT talking about the
 *  glassy rim around the outside of the tile, which is the part
 *  everyone writes about. He means what happens INSIDE.
 *
 *  Measured off his screenshot (sanan's stuff/Inspiration/apple
 *  bordering.png), sampling straight through the edges:
 *
 *    blue hill, top edge      fill #4680AB L119 -> peak #7DB4D5 L171
 *                             a lift of +52 L over about 8 screen px,
 *                             then back to fill within 4 more
 *    orange hill, bottom edge fill L121 -> L140 just inside the edge,
 *                             then a hard fall into the tile: L30 at
 *                             the boundary, i.e. DARKER than the tile
 *                             beside it (L23 -> L21). A cast shadow.
 *    tile top edge            L49 fill, rim peaks L158
 *    tile bottom edge         L19 fill, rim peaks L99
 *
 *  So the model is: every shape is a thin plate lifted off the one
 *  behind it, lit from above. Three parts, and they are separable:
 *
 *    1. shading across the whole body of each shape, not a line
 *       around it: lighter at the top, falling away to the bottom
 *    2. a tight specular line where the surface turns over at the top
 *    3. a soft shadow cast down onto whatever is behind
 *
 *  The first version of this room did 2 and 3 only and it was wrong.
 *  Next to the real thing it read as a hairline tracing a flat shape.
 *  The volume is the point.
 *
 *  Everything below is built from that, as one SVG filter applied per
 *  PATH rather than per icon. Per path matters: our hills overlap, so
 *  each one has its own contour and gets its own edge. Apply the
 *  filter to the group instead and the internal boundaries vanish,
 *  because the union has no alpha edge between them. That single
 *  choice is the whole difference between this and a bevel that only
 *  outlines the silhouette.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { PEAK_PLANES as P } from "@/components/layout/peaks-mark";
import { Crest, Face } from "../hoopoe-marks/_parts";

const C = {
  sky: "#3F7CA6",
  cream: "#EAF1DF",
  cinnamon: "#C2622F",
  canopy: "#235C49",
  pine: "#173F35",
  ink: "#141B18",
  paper: "#F5F2EA",
};

/**
 * The edge treatment, as a filter.
 *
 * Second attempt. The first was an offset-and-subtract rim, and side by side
 * against the real thing it was obviously wrong: a hairline tracing each
 * shape, with the shape still flat inside it. The real one has VOLUME. Each
 * hill, each feather, each crest tip is shaded right across its body, lighter
 * at the top and falling away toward the bottom, with a tight specular line
 * where the surface turns over at the top edge. That is not a stroke. That is
 * a lit surface, so this now uses SVG's lighting primitives, which is what
 * they are for.
 *
 * How it works: blur the alpha to get a height field, which turns the flat
 * shape into a low dome with rounded shoulders. Light that dome from above
 * with feDiffuseLighting for the body shading and feSpecularLighting for the
 * hot line along the top shoulder. Multiply the diffuse into the fill so the
 * shading keeps the fill's hue, add the specular on top, then cast a shadow
 * down onto whatever is behind.
 *
 * `u` is one unit of the coordinate space the filtered path lives in, so the
 * same numbers give the same optical result in the 512 icon box and in the
 * mascot's 120 box.
 *
 * Two numbers are not free choices:
 *
 * `diffuseConstant` is 1/sin(elevation). A flat interior has the normal
 * pointing straight at the viewer, so its diffuse term is sin(elevation) --
 * at 55 degrees that is 0.82, and without the correction every shape would
 * come out 18% darker than the colour we chose. Normalising it means the
 * middle of a shape is untouched and only the shoulders move.
 *
 * The lift measured off the screenshot still holds and is the check on all
 * of this: the blue hill's fill #4680AB reaching #7DB4D5 at its top edge is
 * +55/+52/+42, an additive lift that keeps the hue. Specular light with a
 * white lighting-colour added onto the fill does exactly that; a white
 * overlay at some opacity does not, which is why the first version looked
 * chalky.
 */
function EdgeFilter({
  id,
  u,
  strength = 1,
  shadow = 1,
}: {
  id: string;
  u: number;
  strength?: number;
  shadow?: number;
}) {
  /* How far the light is round to the left, and how high. Read off the
     screenshot: the highlights sit on the top and top-left of every shape and
     the shadows fall bottom-right. SVG measures azimuth counter-clockwise
     from the positive x axis with y pointing down, so 250 is up and a little
     left. */
  const AZ = 250;
  const EL = 55;
  const bump = 1.15 * u; // how far in from the edge the shoulder rolls
  const scale = 5.2 * u * strength; // how tall the dome is
  const diffuse = 1 / Math.sin((EL * Math.PI) / 180);
  /* An ambient floor. Pure diffuse takes a shoulder facing away from the
     light all the way to black, which is what made the first tone build look
     like wet plastic. Real light in a room bounces; 0.86 means the darkest
     shoulder loses 14% of its colour and no more. */
  return (
    <filter
      id={id}
      x="-30%"
      y="-30%"
      width="160%"
      height="160%"
      colorInterpolationFilters="sRGB"
    >
      {/* the height field: a flat shape with rounded shoulders */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={bump} result="bump" />

      {/* body shading, multiplied into the fill so it keeps its hue */}
      <feDiffuseLighting
        in="bump"
        surfaceScale={scale}
        diffuseConstant={diffuse}
        lightingColor="#FFFFFF"
        result="diff"
      >
        <feDistantLight azimuth={AZ} elevation={EL} />
      </feDiffuseLighting>
      <feComposite in="diff" in2="SourceAlpha" operator="in" result="diffIn" />
      <feBlend in="diffIn" in2="SourceGraphic" mode="multiply" result="shaded" />
      <feComposite
        in="shaded"
        in2="SourceAlpha"
        operator="in"
        result="body"
      />

      {/* the hot line where the surface turns over at the top */}
      <feSpecularLighting
        in="bump"
        surfaceScale={scale}
        specularConstant={0.9 * strength}
        specularExponent={16}
        lightingColor="#FFFFFF"
        result="spec"
      >
        <feDistantLight azimuth={AZ} elevation={EL} />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />

      {/* specular ADDS to the body; it does not cover it */}
      <feComposite
        in="specIn"
        in2="body"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="lit"
      />

      {shadow > 0 ? (
        <feDropShadow
          dx="0"
          dy={0.7 * u * shadow}
          stdDeviation={0.6 * u * shadow}
          floodColor="#000"
          floodOpacity={0.5}
          in="lit"
        />
      ) : (
        <feOffset in="lit" dx="0" dy="0" />
      )}
    </filter>
  );
}

/**
 * The second mechanism, and the one that explains what he noticed: Apple's
 * effect is NOT applied to every element. Two of our crest feathers sitting
 * next to each other, both cinnamon, get nothing between them. The cream band
 * against the cinnamon gets a lot. A dark tip against the tile gets a lot.
 *
 * That is the signature of a height field built from LUMINANCE rather than
 * from each shape's alpha. A big tonal step is a tall cliff and lights hard; a
 * small one is barely a step and lights not at all. It also gives the effect
 * its direction for free: which side of an edge lights up depends on which
 * side is brighter, so it is a real bevel and not a ring drawn round a shape.
 *
 * It is also the only mechanism that could work on a flat PNG, which is what
 * we actually ship to a home screen. Nothing in that file says where one hill
 * ends and the next begins except the change in tone.
 *
 * So this filter goes on the whole tile at once, not on each path.
 */
function ToneFilter({
  id,
  u,
  strength = 1,
}: {
  id: string;
  u: number;
  strength?: number;
}) {
  /* Height from TONE, and a shoulder narrow enough to stay a line.
   *
   * Why tone and not alpha. An alpha band lights every path the same, so on
   * the hoopoe the eleven cinnamon quill rays each get their own rim and the
   * fan turns into a diagram. Apple's does not do that, because two
   * neighbouring cinnamon feathers are the same tone and there is no cliff
   * between them. The cream band against cinnamon is a cliff; the dark tip
   * against cream is a cliff. Tone is what decides.
   *
   * Why it looked like an airbrush the first time. The blur was 1.7u, so the
   * lit shoulder was fifty units wide. It is now 0.25u. Everything else about
   * that build was right.
   *
   * The flat middle of every region is zeroed by subtracting what a flat
   * surface returns, sin(elevation) before gamma, so only the cliffs light.
   */
  const AZ = 238; // up and a little left
  const EL = 34;
  const BUMP = 0.25 * u; // this alone sets how wide the line is
  const SCALE = 2.6 * u;
  const AMP = 1.25 * strength;
  const GAM = 1.2;
  const flat = Math.pow(Math.sin((EL * Math.PI) / 180), GAM) * AMP;
  return (
    <filter
      id={id}
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
      colorInterpolationFilters="sRGB"
    >
      <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="tone" />
      <feGaussianBlur in="tone" stdDeviation={BUMP} result="bump" />
      <feDiffuseLighting
        in="bump"
        surfaceScale={SCALE}
        diffuseConstant="1"
        lightingColor="#FFFFFF"
        result="raw"
      >
        <feDistantLight azimuth={AZ} elevation={EL} />
      </feDiffuseLighting>
      <feComponentTransfer in="raw" result="lit">
        <feFuncR type="gamma" amplitude={AMP} exponent={GAM} offset={-flat} />
        <feFuncG type="gamma" amplitude={AMP} exponent={GAM} offset={-flat} />
        <feFuncB type="gamma" amplitude={AMP} exponent={GAM} offset={-flat} />
      </feComponentTransfer>

      {/* ADD, never blend. The cream hill lifting only +9 when it sits at 242
          is the tell: same lift as everything else, no headroom left. */}
      <feComposite
        in="lit"
        in2="SourceGraphic"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="lifted"
      />
      <feComposite in="lifted" in2="SourceAlpha" operator="in" />
    </filter>
  );
}

/** A tile. `art` gets the filter id to hang on each of its own paths. */
function Tile({
  size,
  ground,
  view = "0 0 512 512",
  groupFilter,
  children,
}: {
  size: number;
  ground: string;
  view?: string;
  /** the tone build needs the whole picture, so it hangs on the art group */
  groupFilter?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={view}
      aria-hidden
      style={{
        borderRadius: Math.round((size * 96) / 512),
        display: "block",
        flex: "none",
        boxShadow: "0 1px 2px rgba(30,28,22,.2), 0 0 0 1px rgba(30,28,22,.07)",
      }}
    >
      <rect x="-500" y="-500" width="2000" height="2000" fill={ground} />
      <g filter={groupFilter && `url(#${groupFilter})`}>{children}</g>
    </svg>
  );
}

/* ---- the two specimens ------------------------------------------- */

function Hills({ fid }: { fid?: string }) {
  const f = fid ? `url(#${fid})` : undefined;
  return (
    <g transform="translate(85 190) scale(0.38)">
      <path d={P.silhouette} fill={C.sky} filter={f} />
      <path d={P.middle} fill={C.cream} filter={f} />
      <path d={P.rishi} fill={C.cinnamon} filter={f} />
    </g>
  );
}

/** The peeking hoopoe, in the mascot's own 120 space. */
function Peek({ fid }: { fid?: string }) {
  return (
    <g>
      <Crest n={11} spread={68} len={1.18} taper={0.08} pathFilter={fid} />
      <Face eyeS={1.12} billL={0.9} pathFilter={fid} />
    </g>
  );
}

type Spec = {
  key: string;
  name: string;
  view: string;
  u: number;
  render: (fid?: string) => ReactNode;
};

const SPECS: Spec[] = [
  {
    key: "hills",
    name: "The hills",
    view: "0 0 512 512",
    u: 5,
    render: (fid) => <Hills fid={fid} />,
  },
  {
    key: "peek",
    name: "The hoopoe",
    view: "22 -19 78 78",
    u: 0.85,
    render: (fid) => <Peek fid={fid} />,
  },
];

const BUILDS = [
  { key: "off", label: "as we ship it", kind: "none" as const, s: 0 },
  { key: "tone-half", label: "tone, half", kind: "tone" as const, s: 0.55 },
  { key: "tone", label: "tone", kind: "tone" as const, s: 1 },
  { key: "tone-strong", label: "tone, strong", kind: "tone" as const, s: 1.6 },
  { key: "path", label: "per path (wrong)", kind: "path" as const, s: 1 },
];

const GROUNDS = [
  { key: "dark", label: "dark tile", bg: C.ink },
  { key: "canopy", label: "sidebar green", bg: C.canopy },
  { key: "paper", label: "paper", bg: C.paper },
];

export default function GlassEdgesLab() {
  return (
    <div className="ge">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.ge { --bg:#EBE6D7; --ink:#23241E; --soft:#6B6A5C;
  min-height:100vh; background:var(--bg); color:var(--ink);
  padding:40px 44px 96px; font-family:var(--font-body),system-ui,sans-serif; }
.ge h1 { font-family:var(--font-display),serif; font-size:31px; letter-spacing:-.02em; margin:0 0 10px; max-width:24ch; }
.ge .lede { color:var(--soft); font-size:15px; margin:0 0 10px; max-width:66ch; line-height:1.65; }
.ge h2 { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); margin:44px 0 8px; }
.ge .sub { color:var(--soft); font-size:13.5px; margin:0 0 18px; max-width:66ch; line-height:1.6; }
.strip { display:flex; flex-wrap:wrap; gap:18px; align-items:flex-end; }
.cell { display:flex; flex-direction:column; align-items:center; gap:7px; }
.cell em { font-style:normal; font-size:11px; letter-spacing:.03em; color:var(--soft); }
.row { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; margin-bottom:8px; }
.tag { font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--soft); width:110px; }
.note { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:18px;
  padding:16px 18px; max-width:620px; font-size:13.5px; line-height:1.65; color:var(--ink); }
.note b { display:block; font-size:12px; letter-spacing:.07em; text-transform:uppercase; color:var(--soft); margin-bottom:6px; }
@media (max-width:640px){ .ge{padding:28px 18px 72px} .ge h1{font-size:25px} }
`,
        }}
      />

      <h1>The line Apple draws inside our icon</h1>
      <p className="lede">
        Not the glassy rim around the tile. The thing happening inside it: every
        hill has a bright line along its top edge and a dark one under its
        bottom, so the hills separate from each other and the black crest tips
        stop sinking into the dark tile.
      </p>
      <p className="lede">
        Measured off the screenshot rather than guessed. The blue hill&apos;s
        fill is L119 and its top edge peaks at L171, a lift of 52 over about
        eight screen pixels. The orange hill lifts only 19 at its bottom edge
        and then falls to L30 at the boundary, which is darker than the tile
        beside it. So: bright above, dark below, and a shadow cast down. The top
        is about two and a half times the strength of the bottom, and that
        asymmetry is what makes it read as light instead of as an outline.
      </p>

      {SPECS.map((sp) => (
        <div key={sp.key}>
          <h2>{sp.name}</h2>
          <p className="sub">
            Untouched, then the tone build at three strengths, then the per
            path build for comparison. Watch the crest: the tone build leaves
            two neighbouring cinnamon feathers alone and lights the cream band
            hard. The per path build outlines all of them equally, which is the
            thing that looked wrong.
          </p>
          {GROUNDS.map((g) => (
            <div className="row" key={g.key}>
              <span className="tag">{g.label}</span>
              {BUILDS.map((b) => {
                const fid = `f-${sp.key}-${g.key}-${b.key}`;
                return (
                  <span className="cell" key={b.key}>
                    <Tile
                      size={132}
                      ground={g.bg}
                      view={sp.view}
                      groupFilter={b.kind === "tone" ? fid : undefined}
                    >
                      {b.kind === "tone" ? (
                        <defs>
                          <ToneFilter id={fid} u={sp.u} strength={b.s} />
                        </defs>
                      ) : null}
                      {b.kind === "path" ? (
                        <defs>
                          <EdgeFilter id={fid} u={sp.u} strength={b.s} />
                        </defs>
                      ) : null}
                      {sp.render(b.kind === "path" ? fid : undefined)}
                    </Tile>
                    <em>{b.label}</em>
                  </span>
                );
              })}
            </div>
          ))}
          <div className="row">
            <span className="tag">small</span>
            {[64, 44, 32, 16].map((n) => {
              const fid = `f-${sp.key}-small-${n}`;
              return (
                <span className="cell" key={n}>
                  <Tile size={n} ground={C.ink} view={sp.view} groupFilter={fid}>
                    <defs>
                      <ToneFilter id={fid} u={sp.u} strength={1} />
                    </defs>
                    {sp.render(undefined)}
                  </Tile>
                  <em>{n}</em>
                </span>
              );
            })}
          </div>
        </div>
      ))}

      <h2>What it is made of</h2>
      <div className="note">
        <b>Three parts, one filter</b>
        The alpha of the shape, pushed down and subtracted from itself, leaves a
        sliver along the top contour: that is the bright line. The same trick
        upside down leaves a sliver along the bottom: that is the dark one. A
        drop shadow underneath makes the plate sit above whatever is behind it.
        The filter hangs on each PATH, not on the group. That is the whole
        trick. Put it on the group and the internal boundaries disappear,
        because the union of touching shapes has no alpha edge between them, and
        you get a bevel that only outlines the silhouette.
      </div>
    </div>
  );
}
