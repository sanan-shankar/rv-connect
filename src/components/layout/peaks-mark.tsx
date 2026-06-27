/**
 * PeaksMark - the Bodikonda / Middle Peak / Rishikonda ridgeline, traced from the valley.
 * A first-pass standalone mark (stroked silhouette); the dedicated logo pass will refine it.
 * Left to right: Bodikonda (medium), Middle Peak (lower), Rishikonda (tallest, right).
 */
export function PeaksMark({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
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
      <path
        d="M1 19 L11 9 L20 14 L29 11 L39 15 L52 4.5 L63 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
