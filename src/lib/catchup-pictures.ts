/* ------------------------------------------------------------------ *
 *  The Catch-up's picture: the pool, and the band every crop is taken
 *  from.
 *
 *  Every Catch-up has a photograph from the day it is made. Never
 *  optional, and his reason for that (review-2026-09-07 N23) is
 *  architectural rather than aesthetic: "then we'd have to have 2
 *  different architectures." One column that is always filled means one
 *  layout to draw, on the list, on the home, and in whatever comes
 *  later.
 *
 *  Why it exists at all is his diagnosis, N19: "In feed, you have these
 *  images, you have the birds and everything ... Directory, you have the
 *  whole graphic of the map ... Collection, obviously there's so much
 *  graphics ... Catch-ups is the only one that has like nothing, no
 *  images, no media. It's just all text and organization and very
 *  functional and very corporate."
 *
 *  THIS FILE MOVED OUT OF THE LAB (spec 3.4). `PICTURES` lived in
 *  src/app/lab/catchups/sketches/_shelf.ts, which is a room the public
 *  demo's build does not even compile. The pool picker, the settings
 *  control and the demo seed all need it, so it lives here and the room
 *  re-exports it. Adding his twenty is then ONE edit to the array below
 *  and no migration.
 * ------------------------------------------------------------------ */

/** Where a picture is and how it is aimed.
 *
 *  `src` is a path into `public/` for a pool photograph or an https url on
 *  our own image host for one somebody uploaded -- one field, because they
 *  are the same thing to every reader of it.
 *
 *  `focus` is the `object-position` its crop is taken at. Every surface
 *  draws this photograph with `object-fit: cover` at a different shape (see
 *  the table below), so the ONE thing that has to travel with the file is
 *  where the middle of it is. */
export type CatchupPicture = { src: string; focus: string };

/** The default, and the reason it is not "center center".
 *
 *  What makes a photograph of this place read as a PLACE -- a horizon, the
 *  stone benches, the ground under the banyan -- sits in the lower quarter
 *  of nearly all of them. A centred band through any of the six below comes
 *  back as green canopy texture. 85 rather than 65 because the arithmetic is
 *  unforgiving: the tightest frame here keeps 16% of a square photograph's
 *  height, so "a bit lower" has to mean most of the way down. */
export const DEFAULT_PICTURE_FOCUS = "center 85%";

/* ── the band, measured ───────────────────────────────────────────────
 *
 *  Every number here was measured off /lab/catchups/sketches on
 *  2026-09-08 at four real viewports. Every surface uses `object-fit:
 *  cover` with this photograph's own `object-position`.
 *
 *    home head, 1080p and wider   1520 x 240   6.33 : 1   the tightest strip
 *    home head, 14in MBP          1184 x 240   4.93 : 1
 *    home head, 13in laptop       1112 x 240   4.63 : 1
 *    list card, laptop             536 x 214   2.50 : 1
 *    home head, phone              388 x 172   2.26 : 1
 *    list card, phone              348 x 196   1.78 : 1   the least wide
 *
 *  THE HEAD IS A HEIGHT AND NEVER A RATIO (architecture 1b), so a wider
 *  window shows MORE photograph rather than a thinner slice of it -- which
 *  is why its ratio slides from 4.63 to 6.33 and why nothing can be
 *  authored to match it. It caps at 1520 x 240, and that cap is the
 *  tightest strip any surface takes.
 *
 *  So there are two different crops happening, in two axes, and they do not
 *  fight: against a landscape source every frame from 2.26 : 1 up crops the
 *  TOP AND BOTTOM (`focus`'s vertical half is what aims it), and only the
 *  1.78 : 1 phone card is narrower than a 2 : 1 source and takes 5.5% off
 *  each side instead. Aim vertically; keep the subject out of the outer
 *  eighth. */

/* ── The scrim over a photograph that carries words ──────────────────
 *
 *  Spotify's, near enough, and it is his correction: "it doesn't have to fade
 *  to full black it can just be dark like spotify." Then, a day later: "if the
 *  darkening is the same constant, make both less dark by 15%." Every stop is
 *  scaled by 0.85 rather than the foot alone, so the curve keeps its shape and
 *  every surface stays identical: 0.72 -> 0.61, 0.44 -> 0.37, 0.10 -> 0.085.
 *
 *  ONE CONSTANT. The list's card, the list's Edition covers and the home's head
 *  are the same object at three sizes, and he asked whether they matched before
 *  he asked for them to be lighter. It lives here rather than in a component
 *  because the lab room and the shipped page both draw it and neither may own
 *  it. */
export const PICTURE_SCRIM =
  "linear-gradient(to top, rgb(20 16 12 / 0.61) 0%, rgb(20 16 12 / 0.37) 26%, rgb(20 16 12 / 0.085) 52%, transparent 74%)";

/* ── An Edition's cover: how many photographs, and how they tile ─────
 *
 *  A published Edition is drawn as its photographs (architecture 1), on the
 *  list and on the home, and both draw the same tiling. THREE, and four is
 *  wrong rather than merely different: with the lead spanning two columns and
 *  two rows, a fourth has nowhere to go but a third row beside an empty cell.
 *
 *  Here for the same reason PICTURE_SCRIM is: the lab room and the shipped
 *  page both draw it, a lab room is not importable from `(main)` because the
 *  public demo's build does not compile one, and neither may own it. The
 *  number was declared three times before build phase 6 -- the room, the
 *  server query that fetches the urls, and the card that draws them -- so
 *  raising it to four would have quietly capped at three in whichever of the
 *  three was forgotten. */
export const COVER_SHOTS = 3;

/** The grid a cover's photographs sit in, by how many there are. The first is
 *  the lead and spans two columns and two rows past two photographs, so an
 *  Edition reads as having a picture rather than as a contact sheet. */
export function coverTiles(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  return "grid-cols-3 grid-rows-2";
}

/** The tightest frame anything draws: the home's head at 1080p and wider.
 *
 *  The aiming control shows THIS band rather than the roomiest one, which
 *  is the thing that has fooled two sessions (spec 10.2). Aim inside the
 *  strip that survives everywhere and the picture is right on every screen;
 *  aim inside the roomiest one and a phone-shaped choice quietly falls out
 *  of the banner a laptop draws. */
export const PICTURE_BAND = { width: 1520, height: 240 } as const;

/** 6.333…, and it is a ratio rather than the two numbers because that is
 *  all a CSS `aspect-ratio` and a crop calculation ever want. */
export const PICTURE_BAND_RATIO = PICTURE_BAND.width / PICTURE_BAND.height;

/**
 * What survives the tightest band, as a fraction of the source's height.
 *
 * Exported because the aiming control has to say it out loud: a person
 * moving a 900px-tall photograph inside a strip that keeps 142px of it
 * deserves to be told that is what is happening.
 */
export function bandKeptFraction(sourceWidth: number, sourceHeight: number): number {
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) return 1;
  const kept = sourceWidth / sourceHeight / PICTURE_BAND_RATIO;
  return Math.min(1, kept);
}

/* ── the pool ─────────────────────────────────────────────────────────
 *
 *  SIX STAND-INS, AND HE OWES TWENTY. Owner question 17, his answer:
 *  "i'll give the pictures when I get time." Until they arrive these six
 *  ship, and the compromise is stated rather than hidden: four of them are
 *  900x900 and the other two are 1200x800 and 1280x760, so a banner 1520
 *  CSS px wide is upscaled, badly, at retina. Nothing wider is in the
 *  repository.
 *
 *  THREE THINGS CAME OUT OF ACTUALLY OPENING THEM (F46), and they are the
 *  brief for the twenty:
 *
 *  ONE WAS A DUPLICATE. `v1.webp` and `demo-banyan-pillar.webp` are the
 *  same photograph; two of the first three cards on the list were the same
 *  picture and it read as a rendering bug. Dropped.
 *
 *  ONE WAS PORTRAIT. `demo-assembly-wide.webp`, despite the name, is
 *  760x1140. Cropped to the band it keeps about a ninth of the frame and
 *  upscales that sliver, which is the "insanely cropped in, like, 30x zoom
 *  picture" he complained about, exactly. Dropped.
 *
 *  AND THE CROP WAS IN THE WRONG PLACE, which is why each carries its own
 *  `focus` rather than sharing a constant. His: "you have to figure out how
 *  you'd crop it. Different places."
 *
 *  WHAT THE TWENTY WANT TO BE (handover, "The twenty photographs"):
 *  landscape at 2 : 1, 2,400 x 1,200 or better; the subject in the strip
 *  from 58% to 90% down the frame and inside the middle 85% of its width;
 *  the bottom-left corner quiet, because the Catch-up's name is written
 *  across it over a scrim; nothing with a recognisable face in it; and
 *  DETAILS RATHER THAN VALLEY VIEWS -- the landing page and half the
 *  Collection are already wide valley views, so twenty more would read as
 *  the same photograph twenty times.
 *
 *  They land in `public/images/catchups/` and replace the six below in one
 *  edit. Nothing else changes: `pictureFor` re-spreads new Catch-ups over
 *  whatever is here, and every existing row keeps the picture it has. */
export const CATCHUP_PICTURES: CatchupPicture[] = [
  /* Sky, a treeline and four rows of stone benches. The only one with a
     real horizon in it, so it survives a letterbox better than any other. */
  { src: "/images/collection/demo-banyan-benches.webp", focus: "center 92%" },
  /* The banyan with the whitewashed pillar and the benches behind. A little
     below centre, so the band holds the trunk's base and the grass rather
     than a ceiling of leaves. */
  { src: "/images/collection/demo-banyan-pillar.webp", focus: "center 88%" },
  /* The trunk, a single stone seat, open grass. The seat is the thing worth
     keeping and it sits low left. */
  { src: "/images/collection/demo-banyan-canopy.webp", focus: "center 90%" },
  { src: "/images/collection/demo-banyan-arch.webp", focus: DEFAULT_PICTURE_FOCUS },
  { src: "/images/collection/demo-banyan-trunk.webp", focus: DEFAULT_PICTURE_FOCUS },
  { src: "/images/collection/c3.webp", focus: DEFAULT_PICTURE_FOCUS },
];

/**
 * The picture a new Catch-up starts with.
 *
 * Deterministic in `seed`, for the same reason the backfill's SQL is: a
 * creation path that is re-run, a seed that is re-seeded and a migration
 * that is applied twice must all land on the same photograph rather than
 * shuffling the app under someone. FNV-1a over the seed, which is four
 * lines and has no dependency, rather than `Math.random()`.
 *
 * It does NOT have to agree with the SQL backfill's `hashtext` -- those are
 * two populations picked once each, and the only property either needs is
 * to spread evenly and stay put.
 */
export function pictureFor(seed: string): CatchupPicture {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // The FNV prime, as the shifts and adds that survive 32-bit overflow.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return CATCHUP_PICTURES[h % CATCHUP_PICTURES.length];
}

/** Is this one of the shipped pool paths?
 *
 *  The picture control accepts exactly two things -- a pool path or an
 *  upload that landed on our own image host -- and this is the first half.
 *  A `src` is written to a column that every member of a Catch-up then
 *  loads in their browser, so an arbitrary url would be somebody else's
 *  server learning who read what, from a field a settings row can set. */
export function isPoolPicture(src: string): boolean {
  return CATCHUP_PICTURES.some((p) => p.src === src);
}

/** A CSS `object-position` we are willing to write into a style attribute.
 *
 *  Two components, each a keyword or a whole percent, which is everything
 *  the aiming control can produce and nothing that could carry a second
 *  declaration into the style it is interpolated into. */
export const PICTURE_FOCUS_PATTERN =
  /^(left|center|right|\d{1,3}%) (top|center|bottom|\d{1,3}%)$/;

export function isValidPictureFocus(focus: string): boolean {
  return PICTURE_FOCUS_PATTERN.test(focus);
}
