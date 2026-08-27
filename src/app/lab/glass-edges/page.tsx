/* ------------------------------------------------------------------ *
 *  What Apple is doing to the inside of our icon, and how to do it
 *  ourselves.
 *
 *  Not the glassy rim around the outside of the tile -- that is the
 *  part everyone writes about and it is not what he noticed. He means
 *  what happens INSIDE: every hill has a bright line along its top
 *  edge, a fainter one underneath, and the black crest tips stop
 *  sinking into the dark tile.
 *
 *  Four builds got this wrong before this one, all of them by lighting
 *  a TONE step rather than a silhouette. The measurement that settles
 *  it, sampled straight across the blue/cream boundary in his
 *  screenshot (sanan's stuff/Inspiration/not yet right.png, tile at
 *  x 2218 y 25, 400 square):
 *
 *      117 118 117 116 119 | 144 | 236 244 242 242 242
 *
 *  One pixel of antialiasing and nothing else. Across cream/orange the
 *  same. Apple puts NO line between two colours that touch. The rim
 *  exists only where the artwork meets the tile, which means the height
 *  field is the union alpha of the whole picture -- and so the filter
 *  hangs on the art group, never on a path.
 *
 *  The rest of the truth, off the same tile. One px there is 1.28 units
 *  of our 512 box, so a "u" below is 5 units and about 4 px.
 *
 *    left flank   fill 119, peak 206  ->  +87
 *    top edge     fill 119, peak 197  ->  +78
 *    bottom edge  fill 118, peak 138  ->  +20
 *    right flank  fill 119, peak 138  ->  +19
 *    every one of them: nothing at the contour, peak three px in,
 *    back to the fill by nine
 *    tile under a hill  21 rising to 24 over ten px: a contact shadow
 *
 *  Two things fall out of those four numbers. The light is at azimuth
 *  215, further round to the left than up, because the left flank beats
 *  the top. And the dark side is 22% of the bright side, never zero,
 *  which is why there is light on the right of things -- but it needs
 *  almost no ambient to get there: a single distant light at the right
 *  elevation lands on 22% by itself.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { PEAK_PLANES as P } from "@/components/layout/peaks-mark";
import { Crest, Face } from "../hoopoe-marks/_parts";
import { edgeLightFilter } from "@/lib/edge-light";

/**
 * The shipped filter, dropped into a live <svg>.
 *
 * It arrives as markup rather than as JSX because the icon generator needs the
 * identical thing with no React in the room (scripts/dev/generate-icons.mjs
 * bakes it through sharp). One source; this is the thin React end of it.
 */
function RimDefs({
  id,
  u,
  width,
  strength,
}: {
  id: string;
  u: number;
  width?: number;
  strength?: number;
}) {
  return (
    <defs
      dangerouslySetInnerHTML={{ __html: edgeLightFilter({ id, u, width, strength }) }}
    />
  );
}

const C = {
  sky: "#3F7CA6",
  cream: "#EAF1DF",
  cinnamon: "#C2622F",
  canopy: "#235C49",
  pine: "#173F35",
  ink: "#141B18",
  paper: "#F5F2EA",
};

/* The build this replaced, kept as one cell so the room shows the finding
   rather than asserting it. It lights a LUMINANCE step, so it draws a line
   between two colours that touch -- down the cream/orange join, and around
   every one of the eleven cinnamon quill rays in the crest. Apple draws
   none of those. */
function ToneFilter({ id, u, strength = 1 }: { id: string; u: number; strength?: number }) {
  const AZ = 238;
  const EL = 34;
  const AMP = 1.25 * strength;
  const GAM = 1.2;
  const flat = Math.pow(Math.sin((EL * Math.PI) / 180), GAM) * AMP;
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="tone" />
      <feGaussianBlur in="tone" stdDeviation={0.25 * u} result="bump" />
      <feDiffuseLighting in="bump" surfaceScale={2.6 * u} diffuseConstant="1" lightingColor="#FFFFFF" result="raw">
        <feDistantLight azimuth={AZ} elevation={EL} />
      </feDiffuseLighting>
      <feComponentTransfer in="raw" result="lit">
        <feFuncR type="gamma" amplitude={AMP} exponent={GAM} offset={-flat} />
        <feFuncG type="gamma" amplitude={AMP} exponent={GAM} offset={-flat} />
        <feFuncB type="gamma" amplitude={AMP} exponent={GAM} offset={-flat} />
      </feComponentTransfer>
      <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lifted" />
      <feComposite in="lifted" in2="SourceAlpha" operator="in" />
    </filter>
  );
}

/**
 * A tile. The art goes inside a group that carries the filter and NOTHING
 * else -- any transform on that same element would rescale every length in
 * the filter with it. The tile's own rect stays outside, so the contact
 * shadow has something to fall on.
 */
function Tile({
  size,
  ground,
  view = "0 0 512 512",
  filterId,
  children,
}: {
  size: number;
  ground: string;
  view?: string;
  filterId?: string;
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
      <g filter={filterId && `url(#${filterId})`}>{children}</g>
    </svg>
  );
}

/* ---- the two specimens ------------------------------------------- */

function Hills() {
  return (
    <g transform="translate(85 190) scale(0.38)">
      <path d={P.silhouette} fill={C.sky} />
      <path d={P.middle} fill={C.cream} />
      <path d={P.rishi} fill={C.cinnamon} />
    </g>
  );
}

/** The peeking hoopoe, in the mascot's own 120 space.
 *  tipOut and blunt are the two crest settings picked in /lab/hoopoe-marks:
 *  a longer orange point so it survives 26px, and its tip rounded off so the
 *  fan reads soft rather than as a cog. Both default to what the crest has
 *  always been, so the row further down can show the before. */
function Peek({ tipOut = 0.105, blunt = 0.11 }: { tipOut?: number; blunt?: number }) {
  return (
    <g>
      <Crest n={11} spread={68} len={1.18} taper={0.08} tipOut={tipOut} blunt={blunt} />
      <Face eyeS={1.12} billL={0.9} />
    </g>
  );
}

/* Isolating the two crest changes, because together they put noticeably more
   light on the orange and it is worth knowing which one did it. */
const CRESTS = [
  { key: "before", label: "before", tipOut: 0.073, blunt: 0 },
  { key: "long", label: "longer point only", tipOut: 0.105, blunt: 0 },
  { key: "round", label: "rounded tip only", tipOut: 0.073, blunt: 0.11 },
  { key: "both", label: "both \u2014 as it stands", tipOut: 0.105, blunt: 0.11 },
  { key: "less", label: "both, rounded less (0.07)", tipOut: 0.105, blunt: 0.07 },
];

type Spec = { key: string; name: string; view: string; u: number; render: () => ReactNode };

const SPECS: Spec[] = [
  { key: "hills", name: "The hills", view: "0 0 512 512", u: 5, render: () => <Hills /> },
  { key: "peek", name: "The hoopoe", view: "22 -19 78 78", u: 0.85, render: () => <Peek /> },
];

type Build = { key: string; label: string; kind: "none" | "rim" | "tone"; w?: number; s?: number };

const BUILDS: Build[] = [
  { key: "off", label: "as we ship it", kind: "none" },
  { key: "w60", label: "0.60", kind: "rim", w: 0.6, s: 1 },
  { key: "w70", label: "0.70 \u2014 this one", kind: "rim", w: 0.7, s: 1 },
  { key: "w85", label: "0.85", kind: "rim", w: 0.85, s: 1 },
  { key: "w100", label: "1.00, as fitted", kind: "rim", w: 1, s: 1 },
  { key: "tone", label: "the tone build (wrong)", kind: "tone", s: 0.55 },
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
.row { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; margin-bottom:8px; }
.cell { display:flex; flex-direction:column; align-items:center; gap:7px; }
.cell em { font-style:normal; font-size:11px; letter-spacing:.03em; color:var(--soft); }
.tag { font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--soft); width:110px; }
.note { background:#F7F4EB; border:1px solid rgba(35,36,30,.07); border-radius:18px;
  padding:16px 18px; max-width:620px; font-size:13.5px; line-height:1.65; color:var(--ink); }
.note b { display:block; font-size:12px; letter-spacing:.07em; text-transform:uppercase; color:var(--soft); margin-bottom:6px; }
.fig { font-variant-numeric:tabular-nums; }
@media (max-width:640px){ .ge{padding:28px 18px 72px} .ge h1{font-size:25px} }
`,
        }}
      />

      <h1>The line Apple draws inside our icon</h1>
      <p className="lede">
        Not the glassy rim around the tile. The thing happening inside it: a
        bright line along the top and left of every shape, a fainter one under
        the bottom and round the right, and a shadow cast onto the tile beneath.
      </p>
      <p className="lede fig">
        Measured, not guessed. Off his screenshot the blue hill lifts 87 on its
        left flank, 78 along its top, 20 underneath and 19 on the right, every
        one of them peaking three pixels inside the contour and back to the fill
        by nine. Left beating top puts the light at azimuth 215. The dark side
        holding at 22% rather than falling to nothing is what lights the right
        of things. And across the boundary where blue meets cream: 117, 118,
        117, 116, 119, then one pixel of antialiasing, then 236, 244, 242. Apple
        puts <b>nothing</b> between two colours that touch. That single fact is
        why this build reads the silhouette and the four before it read tone.
      </p>

      {SPECS.map((sp) => (
        <div key={sp.key}>
          <h2>{sp.name}</h2>
          <p className="sub">
            Untouched, then the band at four widths, then the build this
            replaced. 1.00 is what the screenshot measures; against the crisp
            render it is about a third too thick, because the screenshot is a
            downscaled Retina capture and a downsample widens a three pixel
            band. Watch the crest on the last cell: it draws a line down every
            quill ray and around the cream band, because those are tonal steps.
            The rim leaves them alone and lights only where the bird meets the
            tile, which is what Apple does.
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
                      filterId={b.kind === "none" ? undefined : fid}
                    >
                      {b.kind === "rim" ? (
                        <RimDefs id={fid} u={sp.u} width={b.w} strength={b.s} />
                      ) : null}
                      {b.kind === "tone" ? (
                        <defs>
                          <ToneFilter id={fid} u={sp.u} strength={b.s} />
                        </defs>
                      ) : null}
                      {sp.render()}
                    </Tile>
                    <em>{b.label}</em>
                  </span>
                );
              })}
            </div>
          ))}
          <div className="row">
            <span className="tag">the fit, small</span>
            {[64, 44, 32, 16].map((n) => {
              const fid = `f-${sp.key}-small-${n}`;
              return (
                <span className="cell" key={n}>
                  <Tile size={n} ground={C.ink} view={sp.view} filterId={fid}>
                    <RimDefs id={fid} u={sp.u} />
                    {sp.render()}
                  </Tile>
                  <em>{n}</em>
                </span>
              );
            })}
          </div>
        </div>
      ))}

      <h2>The crest, before and after</h2>
      <p className="sub">
        Two changes landed on the crest at once and together they put more
        light on the orange, so here they are apart. Lengthening the point
        exposes more cinnamon to the silhouette, so more of the band lands on
        it. Rounding the tip does something different: a needle has two nearly
        parallel flanks and only one of them ever faces the light, while a
        dome turns through every direction at its apex and catches the band
        whichever way it points. The rounding is the bigger of the two.
      </p>
      <div className="row">
        <span className="tag">edge light on</span>
        {CRESTS.map((c) => {
          const fid = `f-crest-${c.key}`;
          return (
            <span className="cell" key={c.key}>
              <Tile size={148} ground={C.ink} view="22 -19 78 78" filterId={fid}>
                <RimDefs id={fid} u={0.85} />
                <Peek tipOut={c.tipOut} blunt={c.blunt} />
              </Tile>
              <em>{c.label}</em>
            </span>
          );
        })}
      </div>
      <div className="row">
        <span className="tag">light off</span>
        {CRESTS.map((c) => (
          <span className="cell" key={c.key}>
            <Tile size={148} ground={C.ink} view="22 -19 78 78">
              <Peek tipOut={c.tipOut} blunt={c.blunt} />
            </Tile>
            <em>{c.label}</em>
          </span>
        ))}
      </div>

      <h2>Will Apple double it up?</h2>
      <div className="note">
        <b>On the home screen, yes</b>
        iOS 26 adds its own specular pass to an app icon, and Apple&apos;s own
        guidance is that you should not bake highlights in because of it. So the
        icon we hand the home screen stays flat and lets the system light it.
        Everywhere else -- the sidebar mark, a letterhead, an email signature,
        the favicon, a share card -- nothing applies this, and baking it in is
        the only way to have it at all. One source, two builds.
      </div>
    </div>
  );
}
