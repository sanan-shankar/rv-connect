import type { CSSProperties } from "react";

/* ------------------------------------------------------------------ *
 *  The letterhead's sheet -- its geometry and its material -- in a module
 *  of its own so the profile's loading screen can draw the same sheet:
 *  letterhead-profile.tsx is a client component, and a server component
 *  that imports a value from one gets a client reference rather than the
 *  value. Moved here, not copied, so the page and its skeleton cannot
 *  drift apart.
 * ------------------------------------------------------------------ */

/**
 * The identity lockup's geometry, declared once and then derived from. The
 * photo circle and the action pill both have to agree with the name's type,
 * so both are calc()ed off these instead of carrying magic numbers.
 */
export const IDENTITY_VARS = {
  "--lh-colophon": "1rem", // the colophon row's fixed height: 16px
  "--lh-gap": "0.5rem", // colophon -> name: 8px
  // cqi, not vw (changed 2026-08-18, owner: "it wraps, then unwraps and then
  // wraps"). The old 7vw sized the name against the VIEWPORT while the column
  // it sits in steps discretely (the sidebar collapse alone hands it ~220px
  // at once), so narrowing the window wrapped, unwrapped and re-wrapped the
  // name. Sized against the sheet itself (the @container on the padded
  // wrapper), characters-per-line is CONSTANT while the clamp is between its
  // bounds: a name that fits keeps fitting through the whole scaling band,
  // and wrapping happens once, at the floor, instead of flickering. 6.1cqi
  // reaches the 2.6rem cap at a 682px content box, just inside the 688px
  // the full-width sheet has behind its sm:p-10, so at rest the name
  // renders exactly the size it always did.
  "--lh-name": "clamp(1.9rem, 6.1cqi, 2.6rem)",
  "--lh-head": "calc(var(--lh-colophon) + var(--lh-gap) + var(--lh-name) * 1.05)",
  // Centre a 40px (h-10) pill on the name's first line.
  "--lh-cta-top":
    "calc(var(--lh-colophon) + var(--lh-gap) + (var(--lh-name) * 1.05 - 2.5rem) / 2)",
} as CSSProperties;

/** The sheet's layered shadow: ink under it, and the faint cinnamon glow. */
export const SHEET_SHADOW =
  "0 1px 2px rgba(35,36,30,0.05), 0 24px 48px -32px rgba(35,36,30,0.55), 0 46px 96px -55px color-mix(in srgb, var(--color-cinnamon) 26%, transparent)";

/** The Writing switcher's own lift off the page. */
export const SWITCHER_SHADOW = "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)";

/* A faint grain so the sheet reads as paper, not a flat fill. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

/** The sheet's material, under whatever is written on it: the grain, and the
 *  faint canopy glow in the corner the bird perches over. */
export function SheetMaterial() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: `url("${PAPER_GRAIN}")` }}
      />
      <div
        className="pointer-events-none absolute -top-16 right-14 h-56 w-56 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-canopy) 14%, transparent), transparent 70%)",
        }}
      />
    </>
  );
}
