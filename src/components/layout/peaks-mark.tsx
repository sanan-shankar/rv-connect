/**
 * PeaksMark - the chosen Bodi / Middle / Rishi mountain mark.
 *
 * This is the final Bodi / Middle / Rishi logo study from Inspiration. It
 * stays inline so brand surfaces can choose solid white/currentColor, the
 * shaded sidebar mark for dark green, or the option-A greens for light surfaces.
 */

const VIEWBOX_WIDTH = 1140;
const VIEWBOX_HEIGHT = 350;
const RIDGE =
  "M-70 348 " +
  "C6 346 82 248 190 198 " +
  "C284 155 370 179 462 252 " +
  "C512 199 548 80 622 62 " +
  "C695 44 683 150 748 158 " +
  "C786 162 781 107 822 128 " +
  "C899 168 922 344 980 348";

const SILHOUETTE =
  "M-48 390 " +
  "C-75 390 -98 377 -98 362 " +
  "C-98 352 -84 348 -70 348 " +
  "C6 346 82 248 190 198 " +
  "C284 155 370 179 462 252 " +
  "C512 199 548 80 622 62 " +
  "C695 44 683 150 748 158 " +
  "C786 162 781 107 822 128 " +
  "C899 168 922 344 980 348 " +
  "C994 348 1008 352 1008 362 " +
  "C1008 377 985 390 958 390 Z";

const MIDDLE_PLANE =
  "M462 252 " +
  "C512 199 548 80 622 62 " +
  "C695 44 683 150 748 158 " +
  "C786 162 781 107 822 128 " +
  "C899 168 922 344 980 348 " +
  "C994 348 1008 352 1008 362 " +
  "C1008 377 985 390 958 390 " +
  "L432 390 " +
  "C432 338 444 286 462 252 Z";

const RISHI_PLANE =
  "M748 158 " +
  "C786 162 781 107 822 128 " +
  "C899 168 922 344 980 348 " +
  "C994 348 1008 352 1008 362 " +
  "C1008 377 985 390 958 390 " +
  "L680 390 " +
  "C692 288 718 202 748 158 Z";

export function PeaksMark({
  size = 18,
  className = "",
  variant = "solid",
}: {
  size?: number;
  className?: string;
  variant?: "two-plane" | "light" | "outline" | "solid";
}) {
  const w = Math.round((size * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT);
  return (
    <svg
      width={w}
      height={size}
      viewBox="-110 40 1140 350"
      fill="none"
      className={className}
      aria-hidden
    >
      {variant === "two-plane" ? (
        <>
          <path d={SILHOUETTE} fill="#eaf1df" />
          <path d={MIDDLE_PLANE} fill="#8ca383" opacity="0.72" />
          <path d={RISHI_PLANE} fill="#173f35" opacity="0.37" />
        </>
      ) : variant === "light" ? (
        <>
          <path d={SILHOUETTE} fill="#cbd8c1" />
          <path d={MIDDLE_PLANE} fill="#7f9a82" />
          <path d={RISHI_PLANE} fill="#235c49" />
        </>
      ) : variant === "solid" ? (
        <path d={SILHOUETTE} fill="currentColor" />
      ) : (
        <path
          d={RIDGE}
          stroke="currentColor"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
