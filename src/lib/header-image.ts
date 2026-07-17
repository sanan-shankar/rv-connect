/**
 * Profile header band imagery.
 *
 * The band behind the profile header must carry colour and life (owner's hard
 * requirement: the page is never flat/white). Source priority:
 *   1. `user.coverPhoto` if the person set one.
 *   2. A deterministic pick from a pool of cropped valley photos, so a given
 *      person's header is stable across loads (never reshuffling per render).
 *   3. If the pool is ever empty, callers fall back to the gradient wash
 *      (`HEADER_PAPER_TEXTURE`) so there is always something alive on screen.
 *
 * The pool reuses the Valley Collection landscape frames already shipped in
 * /public. When the owner supplies a dedicated cropped-stock set, swap the
 * list below; the deterministic selection contract stays identical.
 */
export const HEADER_IMAGE_POOL: string[] = [
  "/images/collection/v1.webp",
  "/images/collection/v2.webp",
  "/images/collection/v3.webp",
  "/images/collection/v4.webp",
  "/images/collection/v5.webp",
  "/images/collection/v6.webp",
  "/images/collection/c1.webp",
  "/images/collection/c2.webp",
  "/images/collection/c3.webp",
  "/images/collection/c4.webp",
  "/images/collection/c5.webp",
  "/images/collection/c6.webp",
];

/** Small stable string hash (djb2-ish) so the pool pick never changes per load. */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * The header band image for a person: their own cover, else a deterministic
 * pool pick, else null (caller shows the gradient wash).
 */
export function headerImageFor(user: {
  id?: string | null;
  coverPhoto?: string | null;
}): string | null {
  if (user.coverPhoto) return user.coverPhoto;
  if (HEADER_IMAGE_POOL.length === 0) return null;
  const seed = user.id || "valley";
  return HEADER_IMAGE_POOL[hashString(seed) % HEADER_IMAGE_POOL.length];
}

/**
 * Layered radial-gradient wash + fine SVG-noise grain, in brand tokens
 * (canopy top-left, cinnamon bottom-right). Used as the gradient fallback for
 * the header band and as the faint whole-page paper wash, so the reading
 * surface reads as warm paper under light rather than a flat token colour.
 * Built once at module scope: it is a static texture, not per-render work.
 */
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix type="matrix" values="0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.05 0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#n)"/></svg>';

export const HEADER_PAPER_TEXTURE = [
  "radial-gradient(1100px 720px at 8% -14%, rgba(35,92,73,0.16), transparent 55%)",
  "radial-gradient(900px 680px at 106% 120%, rgba(194,98,47,0.14), transparent 58%)",
  `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`,
].join(", ");

/** A much fainter version of the wash for the whole-page background behind the paper. */
export const PAGE_PAPER_TEXTURE = [
  "radial-gradient(1200px 760px at 6% -10%, rgba(35,92,73,0.05), transparent 55%)",
  "radial-gradient(1000px 720px at 108% 118%, rgba(194,98,47,0.045), transparent 58%)",
  `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`,
].join(", ");
