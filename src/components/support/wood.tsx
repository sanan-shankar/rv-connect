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

/* 320 cells: a 27" display fits 13 auto-fill columns, so this is still 24
   rows there, roughly 4,000px of page. Whatever runs past the content's
   height is clipped and costs nothing; empty cells are just a div. */
const WOOD = Array.from({ length: 320 }, (_, i) => {
  const h = (n: number) => (Math.sin((i + 1) * n) + 1) / 2;
  return {
    key: i,
    // One cell in seven sits empty: enough irregularity to break the grid,
    // not enough to open a bald patch.
    empty: h(91.7) < 0.14,
    species: GALLERY_SPECIES[(i * 13) % GALLERY_SPECIES.length].index,
    // Percent of the cell. 34-66 keeps even the largest bird inside its own
    // cell at the 170px cell minimum, so neighbours never overlap.
    x: round(34 + h(78.233) * 32),
    y: round(34 + h(12.9898) * 32),
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
          /* A true clearing behind the reading column: the owner's bare
             header text sits directly on the page, and at 82-114px even a
             40%-strength bird behind a sentence is a bird behind a sentence
             (his screenshot, 2026-08-18). The cards live in this same lane
             on glass, so the lane costs nothing; the gutters carry the
             aviary at full strength, and the fixed-density cells mean they
             stay populated at every viewport, which is what made a thinned
             (rather than cleared) centre necessary in the first place. The
             content column is 768px, centred in this element, so "behind the
             words" is simply the middle: clear to ±396, full by ±500, and
             the soft ramp is what keeps the lane from reading as a cut. */
          .support-wood-inset {
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
          /* No gutters exist on a phone: the column is the whole screen, so
             the lane above would blank the field entirely. Instead the birds
             survive only at the screen's outer 90px and at under half
             strength, present without ever sitting under a line of copy. */
          @media (max-width: 767px) {
            .support-wood-inset {
              mask-image: linear-gradient(
                to right,
                rgb(0 0 0 / 0.45),
                transparent 90px,
                transparent calc(100% - 90px),
                rgb(0 0 0 / 0.45)
              );
              -webkit-mask-image: linear-gradient(
                to right,
                rgb(0 0 0 / 0.45),
                transparent 90px,
                transparent calc(100% - 90px),
                rgb(0 0 0 / 0.45)
              );
            }
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
          /* auto-fill with a FIXED cell minimum, not a column count: cells
             sit between 170px and just under 340px at every viewport, so the
             field's DENSITY is as constant as the birds' size. The previous
             breakpoint ladder sized cells as viewport fractions, and a 27"
             display got 385px cells: one bird per third of a metre, which is
             the bald side gutter in the owner's screenshot. Overlap-free by
             the same arithmetic as before: a 114px bird at maximum jitter
             (site 34-66%) reaches 84px from centre, under half the minimum
             cell. */
          "pointer-events-none absolute inset-0 -z-10 grid [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))] overflow-hidden",
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
                  // size"). So a bird is 82-114px on a phone, a laptop and a
                  // 5K display alike; what adapts to the width is the COLUMN
                  // COUNT, the same way text reflows without resizing. Third
                  // size round: 64 then 80 both read too small, 120 is his
                  // "50% bigger" on 80. The column ladder below is derived
                  // from this number; change one, re-derive the other. */
                  width: `calc(120px * ${b.scale})`,
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
