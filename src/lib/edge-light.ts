/* ------------------------------------------------------------------ *
 *  Apple's edge light, as one SVG filter.
 *
 *  What iOS 26 and macOS 26 draw INSIDE an app icon: a bright line along
 *  the top and left of every shape, a fainter one under the bottom and
 *  round the right, and a shadow cast onto the tile beneath. Not the
 *  glassy rim around the outside of the tile, which is the part everyone
 *  writes about and is not this.
 *
 *  Every number here was measured off the owner's own home screen rather
 *  than inferred; the working, the four constructions that were wrong and
 *  the traps are in docs/spec/apple-edge-light.md.
 *
 *  This returns MARKUP rather than JSX because two very different things
 *  need the identical filter: the lab room renders it into a live <svg>,
 *  and scripts/dev/generate-icons.mjs bakes it into a PNG through sharp
 *  with no React and no browser. One source, so they cannot drift.
 * ------------------------------------------------------------------ */

/** The edge's shape: depth into the shape in units of `u`, against strength. */
const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.26, 0.2], [0.51, 0.45], [0.77, 1], [1.02, 0.85],
  [1.28, 0.65], [1.54, 0.5], [1.79, 0.15], [2.05, 0.05], [2.3, 0],
];

/** Blur that turns the artwork's alpha into a depth map, chosen so the
    profile's last point lands at alpha 0.995 and the edge fits in the table. */
const SIGMA = 0.893;

/**
 * A blurred alpha IS the normal CDF of depth past the contour: exactly 0.5 on
 * it, rising inward. So inverting the CDF once turns a feComponentTransfer
 * table indexed by alpha into a table indexed by DEPTH, and the profile above
 * is drawn literally rather than approximated.
 *
 * This is what four earlier builds were missing. They all reached for
 * feMorphology, whose square kernel makes the band 1.41x wider on a 45 degree
 * contour than on a flat one, which is why the hills' shoulders read as an
 * airbrush while their tops read as a line. A Gaussian is isotropic.
 *
 * Scaling SIGMA and the profile together leaves this table unchanged, which is
 * why the table is a constant and width is a single dial.
 */
function bandTable(n = 65): string {
  const erf = (x: number) => {
    const s = x < 0 ? -1 : 1;
    const a = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * a);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
      - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
    return s * y;
  };
  const cdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
  const icdf = (a: number) => {
    let lo = -6, hi = 6;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cdf(m) < a) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const last = PROFILE[PROFILE.length - 1][0];
  const at = (d: number) => {
    if (d <= 0 || d >= last) return 0;
    for (let i = 1; i < PROFILE.length; i++) {
      if (d <= PROFILE[i][0]) {
        const [d0, v0] = PROFILE[i - 1], [d1, v1] = PROFILE[i];
        return v0 + ((v1 - v0) * (d - d0)) / (d1 - d0);
      }
    }
    return 0;
  };
  return Array.from({ length: n }, (_, k) => {
    const a = k / (n - 1);
    return a <= 0.5 ? 0 : +at(SIGMA * icdf(Math.min(a, 0.99999))).toFixed(4);
  }).join(" ");
}

const BAND = bandTable();

export type EdgeLightOptions = {
  id: string;
  /** One unit of the space the FILTERED GROUP lives in. It must be that
      group's space and not the artwork's: a transform on the element carrying
      the filter rescales every length inside it, which is how a 4.5 unit blur
      quietly became a 1.7 unit one and cost three rounds. Put the filter on an
      outer group and the transform on an inner one. */
  u: number;
  /** Widens the band. Ships at 0.7 rather than the fitted 1: the screenshot
      everything was fitted against is a downscaled Retina capture, and
      resampling smears a three pixel band wider than it is. See the spec. */
  width?: number;
  /** Brightens it. 1 reproduces all four of Apple's flanks within 3 of 255. */
  strength?: number;
  /** The tile darkens ~4L directly under a shape. Set 0 where the artwork is
      not sitting on a tile of its own. */
  shadow?: number;
};

/** The filter, as `<filter>…</filter>` markup. */
export function edgeLightFilter({
  id,
  u,
  width = 0.7,
  strength = 1,
  shadow = 1,
}: EdgeLightOptions): string {
  /* Solved, not chosen. Azimuth from the left flank (+87) beating the top
     (+78); surface scale from the right (+19) being 22% of the left; the two
     transfer knobs by least squares over all four flanks at once. */
  const AZ = 215;
  const EL = 45;
  const SLOPE = 0.3625 * strength;
  const ICEPT = 0.016 * strength;
  const w = u * width;
  const n = (x: number) => +x.toFixed(4);
  return [
    `<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">`,
    shadow > 0
      ? [
          `<feGaussianBlur in="SourceAlpha" stdDeviation="${n(1 * u)}" result="shb"/>`,
          `<feOffset in="shb" dy="${n(0.45 * u)}" result="sho"/>`,
          `<feComposite in="sho" in2="SourceAlpha" operator="out" result="shOut"/>`,
          `<feComponentTransfer in="shOut" result="shA"><feFuncA type="linear" slope="${n(0.32 * shadow)}"/></feComponentTransfer>`,
          `<feFlood flood-color="#000000" result="black"/>`,
          `<feComposite in="black" in2="shA" operator="in" result="shadow"/>`,
        ].join("")
      : "",
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${n(SIGMA * w)}" result="depth"/>`,
    `<feComponentTransfer in="depth" result="band"><feFuncA type="table" tableValues="${BAND}"/></feComponentTransfer>`,
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${n(1 * w)}" result="bump"/>`,
    `<feDiffuseLighting in="bump" surfaceScale="${n(3 * w)}" diffuseConstant="1" lighting-color="#FFFFFF" result="raw">`,
    `<feDistantLight azimuth="${AZ}" elevation="${EL}"/></feDiffuseLighting>`,
    `<feComponentTransfer in="raw" result="lit">`,
    `<feFuncR type="linear" slope="${n(SLOPE)}" intercept="${n(ICEPT)}"/>`,
    `<feFuncG type="linear" slope="${n(SLOPE)}" intercept="${n(ICEPT)}"/>`,
    `<feFuncB type="linear" slope="${n(SLOPE)}" intercept="${n(ICEPT)}"/></feComponentTransfer>`,
    `<feComposite in="lit" in2="band" operator="in" result="edge"/>`,
    /* ADD, never blend. The cream hill lifting only +9 when it sits at 242 is
       the tell: the same light as everything else, no headroom left. */
    `<feComposite in="edge" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="up"/>`,
    `<feComposite in="up" in2="SourceAlpha" operator="in" result="art"/>`,
    shadow > 0
      ? `<feMerge><feMergeNode in="shadow"/><feMergeNode in="art"/></feMerge>`
      : "",
    `</filter>`,
  ].join("");
}
