/**
 * PeaksMark - the chosen Bodi / Middle / Rishi mountain mark.
 *
 * This is the final Bodi / Middle / Rishi logo study from Inspiration. It
 * stays inline so brand surfaces can choose solid white/currentColor, the
 * shaded sidebar mark for dark green, or the option-A greens for light surfaces.
 */

/**
 * Canonical "PeaksMark + Rishi Valley" wordmark lockup. Sized so the mark's
 * left edge lands on the sidebar nav pill's left edge with the two
 * vertically centered against each other (see sidebar.tsx Brand) - the
 * wordmark's right edge no longer needs to
 * reach the pill's right edge; it now leaves comfortable margin before the
 * sidebar's own edge. Every lockup on the site (sidebar, landing hero,
 * landing nav, landing footer, /login, /signup) uses this same font size
 * and mark size so the brand reads as one fixed logotype at every scale,
 * not a wordmark that grows with the canvas. Use the `Wordmark` component
 * below to render the pairing; it carries the pair's optical nudges so
 * they only ever need tuning in one place.
 */
const WORDMARK_LOGO_SIZE = 24;
const WORDMARK_FONT_SIZE = 18;

const VIEWBOX_WIDTH = 1140;
const VIEWBOX_HEIGHT = 350;

/* The ridge is drawn from -98 to 1008, so its centre is 455. The viewBox's x
   is derived from that rather than typed: it used to read -110, which put the
   window's centre at 460 and hung the mark five units left of true. That is
   0.44% of its width -- invisible on its own and not invisible once the same
   habit had also moved the favicon and the app icon. */
const PEAK_SPAN = { left: -98, right: 1008 } as const;
const PEAK_CENTRE = (PEAK_SPAN.left + PEAK_SPAN.right) / 2;
const VIEWBOX_X = PEAK_CENTRE - VIEWBOX_WIDTH / 2;
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

/** The lightest of the three planes, and the whole mark wherever it is drawn
 *  flat against the dark green rail: at 24px the middle and Rishi planes read
 *  as smudges rather than ridges, so the sidebar lockup takes this one colour
 *  as a silhouette. Named here, beside the fills it belongs to, so the flat
 *  mark and the shaded one cannot drift apart. */
const CREAM = "#eaf1df";

const RISHI_PLANE =
  "M748 158 " +
  "C786 162 781 107 822 128 " +
  "C899 168 922 344 980 348 " +
  "C994 348 1008 352 1008 362 " +
  "C1008 377 985 390 958 390 " +
  "L680 390 " +
  "C692 288 718 202 748 158 Z";

/**
 * The three planes as raw path data, so a preview room can paint them in
 * colours this component does not offer without copying the geometry and
 * letting the two drift. PeaksMark itself is still the only thing the app
 * renders; this is for /lab/icon-colours and anything like it.
 */
export const PEAK_PLANES = {
  silhouette: SILHOUETTE,
  middle: MIDDLE_PLANE,
  rishi: RISHI_PLANE,
  /** The bare ridge, no baseline bar. Only an outline treatment wants this. */
  ridge: RIDGE,
} as const;

export function PeaksMark({
  size = 18,
  className = "",
  variant = "solid",
}: {
  /** Height. A number is px; a CSS length string (e.g. "1.15em") scales with
   * font-size, with width left to the viewBox aspect ratio. */
  size?: number | string;
  className?: string;
  variant?: "two-plane" | "light" | "outline" | "solid" | "cream";
}) {
  const w =
    typeof size === "number"
      ? Math.round((size * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT)
      : undefined;
  return (
    <svg
      width={w}
      height={size}
      viewBox={`${VIEWBOX_X} 40 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      className={className}
      aria-hidden
    >
      {variant === "two-plane" ? (
        <>
          <path d={SILHOUETTE} fill={CREAM} />
          <path d={MIDDLE_PLANE} fill="#8ca383" opacity="0.72" />
          <path d={RISHI_PLANE} fill="#173f35" opacity="0.37" />
        </>
      ) : variant === "light" ? (
        <>
          <path d={SILHOUETTE} fill="#cbd8c1" />
          <path d={MIDDLE_PLANE} fill="#7f9a82" />
          <path d={RISHI_PLANE} fill="#235c49" />
        </>
      ) : variant === "cream" ? (
        <path d={SILHOUETTE} fill={CREAM} />
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

/**
 * The mark paired with "Rishi Valley", used everywhere the two appear
 * together (sidebar, landing nav/hero/footer, /login, /signup). Centralized
 * here so the one hairline optical correction - the pairing sits a couple
 * px left and the wordmark's baseline sits a touch high of where they read
 * best - only ever needs tuning in this one place. Both nudges are
 * transforms (paint-only), so they never reflow layout or disturb a
 * surrounding flex row's other children.
 */
export function Wordmark({
  size = WORDMARK_LOGO_SIZE,
  fontSize = WORDMARK_FONT_SIZE,
  variant = "solid",
  markClassName = "",
  textClassName = "",
  className = "",
}: {
  size?: number;
  fontSize?: number;
  variant?: "two-plane" | "light" | "outline" | "solid" | "cream";
  markClassName?: string;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      style={{ transform: "translateX(3px)" }}
    >
      <PeaksMark size={size} variant={variant} className={markClassName} />
      <span
        className={`font-heading font-bold tracking-tight ${textClassName}`}
        style={{ fontSize, lineHeight: 1, transform: "translateY(2px)" }}
      >
        Rishi Valley
      </span>
    </span>
  );
}
