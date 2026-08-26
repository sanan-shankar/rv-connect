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
 *  intrinsic width and height, and this app does not store them (that gap
 *  is bugs.md #18, the reason feed photos have no reserved space and the
 *  page jumps as each one loads). Passing a guessed aspect ratio would
 *  change every card's height. Pointing `src` at the optimizer instead
 *  changes nothing about layout: the returned image keeps its own aspect
 *  ratio, so `w-full object-cover max-h-*` lays it out exactly as before.
 *  When dimensions are stored and #18 is fixed, this should become the
 *  real <Image> component.
 *
 *  The widths are the only two of Next's default deviceSizes this UI can
 *  use: 750 covers a 728 px card at 1x and a 359 px half-card at 2x; 1080
 *  covers the full-width card on a retina laptop. Nothing here ever needs
 *  more, because the full-size original is what the VIEWER fetches -- and
 *  the viewer must keep fetching the original (its Download button saves
 *  the real file; see next.config.ts connect-src).
 *
 *  No new attack surface: /_next/image only fetches hosts listed in
 *  next.config.ts remotePatterns, which is the exact-host allowlist audit
 *  C-134 put there. Local dev/demo paths are passed through untouched --
 *  the optimizer would just proxy them.
 * ------------------------------------------------------------------ */

const WIDTHS = [750, 1080] as const;
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
