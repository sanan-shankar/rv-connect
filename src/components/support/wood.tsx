"use client";

/* The aviary behind /support, and behind the lab room it was promoted from:
 * a fixed field of the site's own bird glyphs that the page scrolls over,
 * the same register as the valley photo every (main) page already has.
 *
 * The owner's brief, assembled over three rounds: like the lab version.
 * Dense, birds on the sides AND behind the panels (the glass blurs them),
 * never massive, never overlapping, "random but a bit more evenly
 * distributed", and explicitly not reading as a grid.
 *
 * So the field is a fine JITTERED GRID wearing a random face. Small cells
 * (7/10/14 columns as the viewport grows) each hold at most one bird, nudged
 * to a hashed point inside its cell: even coverage with no clumps, which is
 * what plain Math.random cannot do, while the jitter, the one-in-seven empty
 * cells and the size spread keep any grid alignment from surfacing. The bird

 * itself is sized by the viewport with pixel caps at both ends: an earlier
 * cut scaled purely with the cell and turned into 120px giants on a wide
 * monitor ("massive"), and the over-correction shrank to 26px "specks". The
 * clamp in the render is the truce: the lab room's look on a laptop, held
 * inside 40-84px everywhere.
 *
 * Behind the content column the field drops to under half strength via a CSS
 * mask, so bare text stays readable, but it never goes to zero: a fully
 * cleared lane read as "zero birds next to the column" the moment the
 * viewport grew. The mask, not per-bird math, is what makes the attenuation
 * track every width.
 *
 * Deterministic by construction: positions come from a fixed integer hash and
 * every number is rounded before it reaches a style attribute, because React
 * compares the server's style string against the client's numbers and
 * `20.359622773614056%` versus `20.3596%` is a hydration mismatch even though
 * it is the same place. transform/opacity only; each bird drifts a few pixels
 * over half a minute on its own clock. */

import { BirdGlyphV2, GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";
import { cn } from "@/lib/utils";

const round = (n: number, places = 2) => Number(n.toFixed(places));

/* 160 cells: at 8 columns that is 20 rows, roughly 3,000px of page at a
   desktop cell size, which covers the support page top to bottom. Whatever
   runs past the content's height is clipped and costs nothing. */
const WOOD = Array.from({ length: 160 }, (_, i) => {
  const h = (n: number) => (Math.sin((i + 1) * n) + 1) / 2;
  return {
    key: i,
    // One cell in seven sits empty: enough irregularity to break the grid,
    // not enough to open a bald patch.
    empty: h(91.7) < 0.14,
    species: GALLERY_SPECIES[(i * 13) % GALLERY_SPECIES.length].index,
    // Percent of the cell. 32-68 keeps even the largest bird essentially
    // inside its own cell, so neighbours never overlap at any width.
    x: round(32 + h(78.233) * 36),
    y: round(32 + h(12.9898) * 36),
    scale: round(0.68 + h(43.7) * 0.27, 3),
    opacity: round(0.2 + h(19.31) * 0.14, 3),
    duration: round(26 + h(31.7) * 16, 1),
    delay: round(h(53.1) * -24, 1),
  };
});

/* `inset` is the shipped /support shape: the field starts past the 248px
   sidebar rail and wears the column-attenuation mask. The lab room renders
   full-bleed with no mask (its header sits on glass, so nothing bare needs
   the protection). */
export function SupportWood({ inset = true }: { inset?: boolean }) {
  return (
    <>
      {inset && (
        <style>{`
          /* Not a clearing, a thinning: the centre stays at 40% strength so
             there are always birds behind the panels (the glass blurs them
             into atmosphere), while the fade to full strength at the sides is
             wide enough that no edge ever shows. The content column is 768px,
             centred in this same element, so "behind the words" is simply the
             middle. */
          .support-wood-inset {
            mask-image: linear-gradient(
              to right,
              black,
              black calc(50% - 520px),
              rgb(0 0 0 / 0.4) calc(50% - 360px),
              rgb(0 0 0 / 0.4) calc(50% + 360px),
              black calc(50% + 520px),
              black
            );
            -webkit-mask-image: linear-gradient(
              to right,
              black,
              black calc(50% - 520px),
              rgb(0 0 0 / 0.4) calc(50% - 360px),
              rgb(0 0 0 / 0.4) calc(50% + 360px),
              black calc(50% + 520px),
              black
            );
          }
        `}</style>
      )}
      <style>{`
        @keyframes support-wood-drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(4px, -6px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      {/* ABSOLUTE, not fixed: the birds scroll with the page, the way the
          approved lab room's field did (owner: "the birds were scrolling with
          the content in lab. I'd like it like that"). With no positioned
          element between the page and the app shell's content div, inset-0
          resolves against that div, which is the full content height and
          spans EXACTLY the area right of the 248px rail: the field
          structurally cannot paint over the sidebar, at any width or scroll
          position. The md:pl-6 keeps even a first-column bird from visually
          butting against the rail's edge. In the lab room the same element
          resolves against the room's own relative root, full-bleed, which is
          the original lab behaviour.

          -z-10 keeps it under the page content inside the nearest stacking
          context (the shell's z-10 content div; the lab room isolates
          itself), still above the fixed valley photo one context down.
          Weather, not content: aria-hidden and inert to the pointer. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 grid grid-cols-4 overflow-hidden sm:grid-cols-6 lg:grid-cols-8",
          inset && "support-wood-inset md:pl-6"
        )}
        aria-hidden
      >
        {WOOD.map((b) =>
          b.empty ? (
            <div key={b.key} className="aspect-square" />
          ) : (
            <div key={b.key} className="relative aspect-square">
              {/* Two nested spans on purpose: the outer owns the centring
                  translate and the pixel-capped size, the inner owns the
                  drift keyframes, because one animation setting `transform`
                  would wipe the centring out and drop every bird a half-cell
                  down and right. */}
              <span
                className="absolute block -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  // A FIXED base, deliberately not viewport units: the owner
                  // resized the window and watched the birds shrink to specks
                  // while the text stayed put ("I don't understand why the
                  // bird size would change when all the text is the same
                  // size"). So a bird is 44-61px on a phone, a laptop and a
                  // 5K display alike; what adapts to the width is the COLUMN
                  // COUNT, the same way text reflows without resizing. The
                  // 0.95 scale ceiling is load-bearing on phones: a 61px bird
                  // at maximum jitter stays inside a 97px four-column cell,
                  // anything larger can graze its neighbour.
                  width: `calc(64px * ${b.scale})`,
                  opacity: b.opacity,
                }}
              >
                <span
                  className="block aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
                  style={{
                    animation: `support-wood-drift ${b.duration}s ease-in-out ${b.delay}s infinite`,
                  }}
                >
                  <BirdGlyphV2 seed={`wood-${b.key}`} px={56} speciesOverride={b.species} />
                </span>
              </span>
            </div>
          )
        )}
      </div>
    </>
  );
}
