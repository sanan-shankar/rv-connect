/**
 * PeaksMark - the Bodikonda / Middle / Rishikonda skyline, traced from the valley photo
 * (/Inspiration/bodi-middle-rishi.png).
 *
 * Reading the photo left to right: a low, rounded left massif (Bodikonda), a wide central
 * saddle, then the dominant summit at roughly 54% of the width (rounded crown, the tallest
 * point), a small secondary shoulder just to its right, and a long descent to a low right
 * shoulder. The ridge uses curved C/Q segments so the crowns read as weathered hills, not a
 * straight-line zigzag.
 *
 * `variant="outline"` strokes the ridge; `variant="solid"` fills the closed silhouette.
 * Defaults to outline (the existing app usage). Renders in currentColor / white so it sits on
 * the green sidebar and the login photo alike.
 */

// Ridge traced across a 0..64 x 0..22 viewBox. Baseline sits at y=20.
const RIDGE =
  "M1 20 " +
  "C4 20 6 18.5 9 14.5 " + // rise onto the rounded left massif
  "C11.5 11.2 14 11 16.5 13.5 " + // rounded crown of Bodikonda
  "C19 16 21 18 24 17.2 " + // dip into the wide central saddle
  "C28 16 31 10 34.5 4.8 " + // climb to the dominant summit (~54% width)
  "C36 2.6 38 3 39.5 6 " + // rounded crown of the tallest peak
  "C41 9 42.5 12.5 45 12 " + // small secondary shoulder just right of the summit
  "C49 11 52 14.5 56 17.5 " + // long descent
  "C59 19.5 61 20 63 20"; // settle to the low right shoulder

const SILHOUETTE = RIDGE + " L63 22 L1 22 Z";

export function PeaksMark({
  size = 18,
  className = "",
  variant = "outline",
}: {
  size?: number;
  className?: string;
  variant?: "outline" | "solid";
}) {
  const w = Math.round((size * 64) / 22);
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 64 22"
      fill="none"
      className={className}
      aria-hidden
    >
      {variant === "solid" ? (
        <path d={SILHOUETTE} fill="currentColor" />
      ) : (
        <path
          d={RIDGE}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
