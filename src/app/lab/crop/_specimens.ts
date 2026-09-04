/* ------------------------------------------------------------------ *
 *  One real photograph for every shape a member can post.
 *
 *  Cut from the banyan set that already lives in this repo, so they are
 *  photographs and not swatches, and boxed to 940 on the long edge. They
 *  run from a phone video still at one end to a panorama at the other,
 *  and they deliberately crowd the middle -- 1:1, 7:6, 5:4, 4:3 -- because
 *  that narrow band is where the rule has to make its hardest choice and
 *  where a bed used to show either side of the photograph.
 *
 *  The focal numbers are sharp's own, read back the way the upload path
 *  reads them. They are not always sensible: on the 5:4 it gave up and
 *  returned the corner, and on the 7:6 it went for the bright edge. That
 *  is the point of the clamp, and it is worth seeing here rather than
 *  taking on trust.
 *
 *  Throwaway, with the room. Delete these files, public/lab/crop/ and the
 *  registry row once the layout rules are settled. "These files" means the
 *  eleven shape-*.webp fixtures SPECIMENS lists below and nothing else:
 *  pano-21x9, phone-9x16 and grainy-420 were this room's first cut, were
 *  superseded the next day by 6fb0780, and went on 2026-09-05.
 * ------------------------------------------------------------------ */

export type Specimen = {
  key: string;
  src: string;
  /** The file's own size. Everything the room says is derived from these. */
  w: number;
  h: number;
  /** The shape, the way a person would name it. */
  label: string;
  note: string;
  focal: { x: number; y: number };
};

export const SPECIMENS: Specimen[] = [
  {
    key: "9x16",
    src: "/lab/crop/shape-9x16.webp",
    w: 529,
    h: 940,
    label: "9:16",
    note: "A phone video still, or a screenshot. The tallest thing anyone posts.",
    focal: { x: 0.594, y: 0.094 },
  },
  {
    key: "2x3",
    src: "/lab/crop/shape-2x3.webp",
    w: 627,
    h: 940,
    label: "2:3",
    note: "A camera held upright. The 35mm portrait.",
    focal: { x: 0.561, y: 0.094 },
  },
  {
    key: "3x4",
    src: "/lab/crop/shape-3x4.webp",
    w: 705,
    h: 940,
    label: "3:4",
    note: "A phone held upright. The commonest portrait there is.",
    focal: { x: 0.687, y: 0.812 },
  },
  {
    key: "4x5",
    src: "/lab/crop/shape-4x5.webp",
    w: 752,
    h: 940,
    label: "4:5",
    note: "Instagram's portrait. Barely taller than wide.",
    focal: { x: 0.593, y: 0.155 },
  },
  {
    key: "1x1",
    src: "/lab/crop/shape-1x1.webp",
    w: 900,
    h: 900,
    label: "1:1",
    note: "Square. A deliberate shape, not an accident.",
    focal: { x: 0.156, y: 0.812 },
  },
  {
    key: "7x6",
    src: "/lab/crop/shape-7x6.webp",
    w: 900,
    h: 771,
    label: "7:6",
    note: "Only just landscape. The shape that used to sit on the widest bed.",
    focal: { x: 0.968, y: 0.781 },
  },
  {
    key: "5x4",
    src: "/lab/crop/shape-5x4.webp",
    w: 900,
    h: 720,
    label: "5:4",
    note: "The old print shape.",
    focal: { x: 0, y: 0 },
  },
  {
    key: "4x3",
    src: "/lab/crop/shape-4x3.webp",
    w: 940,
    h: 705,
    label: "4:3",
    note: "A phone held sideways. The commonest landscape there is.",
    focal: { x: 0.405, y: 0.25 },
  },
  {
    key: "3x2",
    src: "/lab/crop/shape-3x2.webp",
    w: 940,
    h: 627,
    label: "3:2",
    note: "A camera held sideways. The 35mm landscape.",
    focal: { x: 0.405, y: 0.249 },
  },
  {
    key: "16x9",
    src: "/lab/crop/shape-16x9.webp",
    w: 940,
    h: 529,
    label: "16:9",
    note: "Widescreen.",
    focal: { x: 0.968, y: 0.656 },
  },
  {
    key: "21x9",
    src: "/lab/crop/shape-21x9.webp",
    w: 940,
    h: 403,
    label: "21:9",
    note: "A panorama. A thin strip, and that is correct.",
    focal: { x: 0.905, y: 0.811 },
  },
];

/** How wide the card is.
 *
 *  `window` is the real thing and the default: the card simply fills the room,
 *  so dragging the browser narrower does exactly what dragging the real app
 *  narrower does. The other three pin it to a width the app actually has, for
 *  looking at one screen without owning that screen. */
export const WIDTHS = {
  window: { label: "This window", px: 0, note: "The card fills the room and follows the window, the way it does in the app. Drag the browser and watch it move." },
  phone: { label: "Phone", px: 358, note: "A card on a phone. Nothing is ever narrowed here -- the screen is the limit." },
  laptop: { label: "Laptop", px: 728, note: "A card on an ordinary laptop." },
  wide: { label: "Big monitor", px: 1216, note: "The feed on a 27-inch screen, where the card grows but the photograph does not." },
} as const;

export type WidthKey = keyof typeof WIDTHS;
