import type { Specimen } from "./_policies";

/* ------------------------------------------------------------------ *
 *  Six photographs chosen to be awkward.
 *
 *  All six are real frames of the banyan amphitheatre, already in this
 *  repo. Three are used as they are. Three were cut from the others to
 *  reach shapes the Collection does not happen to contain yet but a
 *  phone and a real camera produce constantly: 9:16, 21:9, and a file
 *  small enough that a wide column has to stretch it.
 *
 *  The focal numbers are sharp's, not mine. Each file was resized to a
 *  square with `sharp.strategy.attention` and the crop window it chose
 *  was read back. Note what it does on the two portraits: it goes for
 *  the canopy, because that is where the contrast is, and walks past the
 *  benches. Worth seeing before trusting policy six with a face.
 * ------------------------------------------------------------------ */

export const SPECIMENS: Specimen[] = [
  {
    key: "phone",
    src: "/lab/crop/phone-9x16.webp",
    w: 731,
    h: 1300,
    label: "9:16",
    note: "A phone held upright. The worst case, and the most common one.",
    focal: { x: 0.5, y: 0.281 },
  },
  {
    key: "portrait",
    src: "/images/collection/demo-assembly-wide.webp",
    w: 760,
    h: 1140,
    label: "2:3",
    note: "A camera held upright. Benches along the bottom, canopy along the top.",
    focal: { x: 0.5, y: 0.333 },
  },
  {
    key: "square",
    src: "/images/collection/c1.webp",
    w: 900,
    h: 900,
    label: "1:1",
    note: "Square. Nothing should ever happen to this one.",
    focal: { x: 0.5, y: 0.5 },
  },
  {
    key: "landscape",
    src: "/images/collection/demo-banyan-canopy.webp",
    w: 1280,
    h: 760,
    label: "5:3",
    note: "An ordinary landscape frame. The trunk is the subject and it sits right of centre.",
    focal: { x: 0.703, y: 0.5 },
  },
  {
    key: "pano",
    src: "/lab/crop/pano-21x9.webp",
    w: 1280,
    h: 549,
    label: "21:9",
    note: "A panorama. Wide enough that some policies have to cut its sides off.",
    focal: { x: 0.786, y: 0.5 },
  },
  {
    key: "grainy",
    src: "/lab/crop/grainy-420.webp",
    w: 420,
    h: 420,
    label: "420px",
    note: "A small file. Nothing can crop this well; the question is how badly a wide column stretches it.",
    focal: { x: 0.5, y: 0.5 },
  },
];
