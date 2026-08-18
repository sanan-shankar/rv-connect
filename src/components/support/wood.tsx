"use client";

/* The aviary behind /support: a fixed field of bird glyphs the page scrolls
 * over, the same register as the valley photo every (main) page already has,
 * just made of the site's own birds.
 *
 * Layout is a JITTERED GRID, not a random scatter. Random placement clumps: a
 * few birds land on top of each other and leave bald patches everywhere else.
 * A grid with each bird nudged inside its own cell fills the viewport evenly
 * with no overlaps ever, because a bird is 42% of its cell and its centre
 * never leaves the middle 42%, so two neighbours cannot reach each other. And
 * because cells are viewport fractions, a phone gets four fat columns rather
 * than the miniscule pinned-pixel birds a first cut had.
 *
 * The middle stays clear of the words. A CSS mask cuts a soft vertical lane
 * out of the field exactly where the content column sits (bare header text
 * over birds was tried and the verdict was "ruins readability"), while the
 * side gutters run at full density, so the page reads as a clearing in a wood
 * rather than a wall of wallpaper. The mask, not per-bird math, is what makes
 * the lane track every viewport width. On phones there are no gutters, so the
 * lane instead fades the whole field down to a whisper at the edges.
 *
 * Deterministic by construction: positions come from a fixed integer hash and
 * every number is rounded before it reaches a style attribute, because React
 * compares the server's style string against the client's numbers and
 * `20.359622773614056%` versus `20.3596%` is a hydration mismatch even though
 * it is the same place. transform/opacity only; each bird drifts a few pixels
 * over half a minute on its own clock. */

import { BirdGlyphV2, GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";

const round = (n: number, places = 2) => Number(n.toFixed(places));

/* 90 cells: at the widest grid (8 columns on a 1192px main, 149px cells) that
   is 11 rows, which outruns any viewport height the fixed layer can show. What
   runs past the bottom is clipped and costs nothing. */
const WOOD = Array.from({ length: 90 }, (_, i) => {
  const h = (n: number) => (Math.sin((i + 1) * n) + 1) / 2;
  return {
    key: i,
    // Roughly one cell in six sits empty so the wood has clearings.
    empty: h(91.7) < 0.17,
    species: GALLERY_SPECIES[(i * 13) % GALLERY_SPECIES.length].index,
    // Percent of the cell; 29-71 keeps a 42%-wide bird fully inside it.
    x: round(29 + h(78.233) * 42),
    y: round(29 + h(12.9898) * 42),
    scale: round(0.72 + h(43.7) * 0.42, 3),
    opacity: round(0.2 + h(19.31) * 0.14, 3),
    duration: round(26 + h(31.7) * 16, 1),
    delay: round(h(53.1) * -24, 1),
  };
});

export function SupportWood() {
  return (
    <>
      <style>{`
        @keyframes support-wood-drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(4%, -6%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        /* The clear lane. The wood spans the main area (viewport minus the
           248px rail), and the 768px content column is centred in that same
           area, so "behind the words" is simply the middle of this element.
           The column's half-width is 384px; clear to 396 and fade out by 500
           so the lane has no visible edge. */
        .support-wood {
          mask-image: linear-gradient(
            to right,
            black,
            black calc(50% - 500px),
            transparent calc(50% - 396px),
            transparent calc(50% + 396px),
            black calc(50% + 500px),
            black
          );
          -webkit-mask-image: linear-gradient(
            to right,
            black,
            black calc(50% - 500px),
            transparent calc(50% - 396px),
            transparent calc(50% + 396px),
            black calc(50% + 500px),
            black
          );
        }
        /* No gutters on a phone: the column is the whole screen. Instead of a
           lane, the field survives only at the screen's edges and at less than
           half strength, so the birds are present without sitting under a
           single line of copy. */
        @media (max-width: 767px) {
          .support-wood {
            mask-image: linear-gradient(
              to right,
              rgb(0 0 0 / 0.45),
              transparent 88px,
              transparent calc(100% - 88px),
              rgb(0 0 0 / 0.45)
            );
            -webkit-mask-image: linear-gradient(
              to right,
              rgb(0 0 0 / 0.45),
              transparent 88px,
              transparent calc(100% - 88px),
              rgb(0 0 0 / 0.45)
            );
          }
        }
      `}</style>

      {/* -z-10 keeps it under the page content inside the shell's own z-10
          stacking context while still painting over the fixed valley photo
          (z-0, one context down). left offset matches the fixed sidebar rail
          so the wood never paints across it. Weather, not content: aria-hidden
          and inert to the pointer. */}
      <div
        className="support-wood pointer-events-none fixed inset-y-0 left-0 right-0 -z-10 grid grid-cols-4 overflow-hidden sm:grid-cols-6 md:left-[248px] lg:grid-cols-8"
        aria-hidden
      >
        {WOOD.map((b) =>
          b.empty ? (
            <div key={b.key} className="aspect-square" />
          ) : (
            <div key={b.key} className="relative aspect-square">
              {/* Two nested spans on purpose: the outer owns the centring
                  translate, the inner owns the drift keyframes, because one
                  animation setting `transform` would wipe the centring out and
                  drop every bird a half-cell down and right. */}
              <span
                className="absolute block w-[42%] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${b.x}%`, top: `${b.y}%`, opacity: b.opacity }}
              >
                <span
                  className="block aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
                  style={{
                    transform: `scale(${b.scale})`,
                    animation: `support-wood-drift ${b.duration}s ease-in-out ${b.delay}s infinite`,
                  }}
                >
                  <BirdGlyphV2 seed={`wood-${b.key}`} px={64} speciesOverride={b.species} />
                </span>
              </span>
            </div>
          )
        )}
      </div>
    </>
  );
}
