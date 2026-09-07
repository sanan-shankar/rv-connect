/* ------------------------------------------------------------------ *
 *  Serving a stored photo at the size it is actually displayed.
 *
 *  Measured on a production /feed, 2026-08-26: one screenful pulled
 *  1,041 KB of photographs against 188 KB of gzipped JavaScript. Every
 *  image on it was oversized -- a card 728 px wide downloading a 1920 px
 *  file, a half-width card 359 px wide downloading 1600 px. Between four
 *  and twenty times the pixels the screen can use. Image bytes dwarf every
 *  JavaScript saving in the 2026-08-25 bundle audit put together.
 *
 *  Why a URL and not <Image>. next/image's component form needs the
 *  intrinsic width and height, and this app did not store them (that gap
 *  was bugs.md #18, the reason feed photos had no reserved space and the
 *  page jumped as each one loaded). Passing a guessed aspect ratio would
 *  change every card's height. Pointing `src` at the optimizer instead
 *  changes nothing about layout: the returned image keeps its own aspect
 *  ratio, so `w-full object-cover max-h-*` lays it out exactly as before.
 *
 *  THAT GAP IS NOW CLOSED and the conclusion this comment used to draw
 *  from it is the wrong one. Dimensions are stored, in `Image` (2026-08-27),
 *  and `<PhotoFrame>` reserves the space from them -- but this must NOT
 *  become the <Image> component. The Collection rework spec locks the
 *  opposite (§4): the textbook justified grid is built on next/image, and
 *  building it that way would route all 20,000 archive photographs through
 *  Vercel's METERED optimiser, which is the one thing the owner asked to
 *  avoid ("I don't want to be billed by myself for images"). The Collection
 *  has never used it -- it serves precomputed derivatives straight off R2 at
 *  zero egress -- and the direction of travel is for the feed and letters to
 *  join it there, not the other way round. Until that ladder exists, this
 *  file stays as it is.
 *
 *  1920 is the top rung because 1920 is where the file STOPS: toDisplayWebp
 *  boxes every feed/letter upload to 1920 on the long edge (image.ts) and the
 *  staged original is purged. Asking for more cannot produce more.
 *
 *  The ladder rungs, each earning its place against a real slot:
 *  750 covers a 728 px full-width card at 1x and a 359 px half-card at 2x;
 *  1080 covers a phone at ~2.5x; 1456 is a full-width card at 2x, i.e. a
 *  Mac. That last rung is not in Next's defaults and had to be added to
 *  deviceSizes in next.config.ts -- the first pass shipped without it, and
 *  a retina screen fell back to 1080 for a slot wanting 1456, which is
 *  1.48x and reads as SOFT on a photograph. Sharpness is the whole point of
 *  a photo-sharing site; this ladder is not the place to save the last KB.
 *
 *  Nothing here ever needs more, because the full-size original is what the
 *  VIEWER fetches -- and the viewer must keep fetching the original (its
 *  Download button saves the real file; see next.config.ts connect-src).
 *
 *  No new attack surface: /_next/image only fetches hosts listed in
 *  next.config.ts remotePatterns, which is the exact-host allowlist audit
 *  C-134 put there. Local dev/demo paths are passed through untouched --
 *  the optimizer would just proxy them.
 * ------------------------------------------------------------------ */

const WIDTHS = [750, 1080, 1456, 1920] as const;
const QUALITY = 75;

/** One optimizer URL at a given width. */
function at(url: string, w: number): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${QUALITY}`;
}

/**
 * Only remote, already-allowlisted photographs go through the optimizer.
 * A relative path (local dev uploads, the demo's seeded files) is served
 * as-is, which is what it already was.
 */
function optimizable(url: string): boolean {
  return url.startsWith("https://");
}

/** The `src` for a displayed photo: the smaller width. */
export function photoSrc(url: string): string {
  return optimizable(url) ? at(url, WIDTHS[0]) : url;
}

/**
 * The `srcSet` that lets a retina screen ask for the larger one. Returns
 * undefined for a URL that is not going through the optimizer, so the
 * attribute is simply absent rather than empty.
 */
export function photoSrcSet(url: string): string | undefined {
  if (!optimizable(url)) return undefined;
  return WIDTHS.map((w) => `${at(url, w)} ${w}w`).join(", ");
}

/* ------------------------------------------------------------------ *
 *  What width a photo actually occupies, told to the browser.
 *
 *  `sizes` is a promise about layout, and a wrong one is worse than none:
 *  the first version of this said a flat "728px" because that is what a feed
 *  card measures on a 1440px laptop. It is not a constant. The feed's content
 *  wrapper is `max-w-[1600px]`, inside which the grid gives the column
 *  everything except a 318px rail and a 30px gap -- so the card GROWS with the
 *  window up to 1216px, and on a 3840px screen it was being handed a 750px
 *  file for a 1216px slot. 0.62x. Visibly blurry, which is exactly the failure
 *  the whole change was supposed to avoid.
 *
 *  THERE ARE THREE SLOTS, NOT ONE, because `ContentColumn` has two modes and
 *  the letter reader sets a third measure inside one of them. The first pass
 *  shipped a single pair of constants named FULL/HALF -- a name that says
 *  which half of a card, and nothing about which column -- and both the letter
 *  page and a member's profile took the FEED's promise while rendering in the
 *  centered column. On a 3840px screen both asked for 1216px and got a 1456px
 *  file for a 732px slot: two rungs of waste, on the two pages a member is
 *  most likely to open from a link. Hence WIDE_ / CENTERED_ / LETTER below;
 *  the column is now in the name, so the next call site has to choose.
 *
 *  The HALF variants are gone (2026-08-27). A post with more than one
 *  photograph no longer tiles them into half-width cells -- it lays them out
 *  in justified rows, where a photograph's share of the row is its ratio over
 *  the row's, and how many share a row depends on how wide the column turned
 *  out to be. "Half" stopped describing any real slot. What a photograph in a
 *  row promises instead is in photo-layout.ts, under `rowPhotoSizes`.
 *
 *  Shared arithmetic, since every number below is built from it. The shell
 *  (app-shell.tsx) is `p-5 sm:p-7 lg:p-10` -- 20 / 28 / 40px a side -- beside
 *  a 248px sidebar that appears at md. So the centered column is
 *  `min(768, 100vw - sidebar - 2 x padding)`, which reaches its 768px cap at
 *  a 1096px viewport. Every figure here was measured against a running page,
 *  not derived on paper: 500 -> 424, 768 -> 428, 1024 -> 660, 1096 -> 732.
 *
 *  Under is the safe direction: the rungs are coarse, so a small underestimate
 *  still lands on the rung above, while an overestimate wastes a whole rung.
 *
 *  If any of these columns' arithmetic ever changes, these change with it.
 *  That is the cost of sizes and there is no way to avoid it short of a
 *  sizes="auto", which Safari does not support.
 * ------------------------------------------------------------------ */

/**
 * A post card standing in the WIDE column: /feed.
 *
 * 248px sidebar + 80px of main padding + 318px rail + 30px gap + 32px card
 * padding = 708, rounded to 712 to sit a hair under. Past a 1928px viewport
 * the 1600px cap binds and the card is a flat 1216px.
 */
export const PHOTO_SIZES_WIDE_FULL =
  "(max-width: 767px) 100vw, (max-width: 1179px) calc(100vw - 96px), (max-width: 1927px) calc(100vw - 712px), 1216px";

/**
 * The same post card standing in the CENTERED column: a member's profile.
 *
 * Card inset is 36px (16px padding + 1px border a side, plus the photo
 * button's own 1px), so the slot is the column minus 36 and flat at 732 from
 * a 1096px viewport up. Declared 4px under throughout, which is what turns a
 * retina Mac's 1464px request into the 1456 rung instead of the 1920 one --
 * 1.99x on a 732px slot, and a whole rung of bytes saved.
 *
 * The `sheet` variant of the card (`px-5` inside a bordered wrapper) is 8px
 * narrower again. Nothing renders it any more -- the profile feed's `layout`
 * prop went in 2026-09-07, having only ever been passed "cards" -- so these
 * are written for `card`; the 4px shave happens to sit between the two if it
 * ever comes back.
 */
export const PHOTO_SIZES_CENTERED_FULL =
  "(max-width: 639px) calc(100vw - 80px), (max-width: 767px) calc(100vw - 96px), (max-width: 1023px) calc(100vw - 344px), (max-width: 1095px) calc(100vw - 368px), 728px";

/**
 * A photograph in a letter, which is neither of the above: the letter reader
 * sets a 680px READING measure inside the centered column (a typographic
 * choice, documented in content-column.tsx), so the article stops growing at
 * a 984px viewport, well before the column does. Measured: 900 -> 596,
 * 1096 -> 680. The photo button's 1px borders make the real slot 678; 2px is
 * below the resolution of the ladder and is not worth a second number.
 */
export const PHOTO_SIZES_LETTER =
  "(max-width: 639px) calc(100vw - 40px), (max-width: 767px) calc(100vw - 56px), (max-width: 983px) calc(100vw - 304px), 680px";
