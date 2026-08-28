"use client";

/* ------------------------------------------------------------------ *
 *  <CarouselArrow> - the one back-and-forward button in the product.
 *
 *  It exists to hold a single rule in a single place. The owner, on the
 *  arrows the feed and catch-ups carousels had (2026-08-28):
 *
 *    "on laptop when you have it over them don't make them enlarge,
 *     just change the colouring, cause that's what we normally do. we
 *     change the colouring when we have it over and then it compresses
 *     when we press it. but on catch ups the arrows enlarge when you
 *     hover over them and then compress when you press them, so it's
 *     like a much more exaggerated compression because it's enlarged to
 *     start with."
 *
 *  That is the 2026-07-25 rule -- HOVER NEVER MOVES A CONTROL -- and the
 *  diagnosis of why breaking it costs more than the swell itself: a
 *  button hovered to 1.06 and pressed to 0.94 travels twelve percent, so
 *  the press reads as a collapse rather than as a press. Colour on
 *  hover, sink on press, and the sink is the only transform.
 *
 *  Colour, not fill: these sit ON a photograph, so the glass goes opaque
 *  and the caret turns canopy. A canopy FILL would be wrong -- green is
 *  the app's one selection state (DESIGN-SYSTEM sec. 2 rule 4), and
 *  nothing about hovering an arrow is a selection.
 * ------------------------------------------------------------------ */

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** Where the arrow is standing.
 *
 *  `glass` sits ON a photograph (the feed, catch-ups) and needs to be legible
 *  over whatever is under it, so it is a translucent paper disc with a shadow.
 *  `plain` sits on the surface beside one (the contribute room's counter row),
 *  where a shadowed disc floating on white would read as a mistake -- there it
 *  is a hairline ring instead. Both obey the same rule; only the colour that
 *  changes on hover differs, because what they are drawn against differs. */
const TONES = {
  glass: [
    "bg-paper/85 text-foreground shadow-[0_1px_6px_rgba(0,0,0,0.18)] backdrop-blur-sm",
    "hover:bg-paper hover:text-canopy",
  ].join(" "),
  plain: [
    "border border-border text-foreground",
    "hover:border-canopy hover:bg-canopy/[0.07] hover:text-canopy",
    "disabled:opacity-30",
  ].join(" "),
};

export function CarouselArrow({
  forward,
  onPress,
  disabled,
  className,
  tone = "glass",
  size = 16,
  /** Left to the caller: over a feed photograph they appear on hover, in
   *  the contribute room they are how you get to photograph two and are
   *  always there. */
  label,
  decorative = false,
}: {
  forward: boolean;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
  tone?: keyof typeof TONES;
  size?: number;
  label?: string;
  /** True where the track itself is already keyboard-reachable and named,
   *  so these are a mouse convenience rather than a second tab stop. */
  decorative?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      {...(decorative ? { tabIndex: -1, "aria-hidden": true } : { "aria-label": label })}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full",
        TONES[tone],
        /* Named properties, never `all`. Opacity is here because the glass
           callers fade these in and out; transform is here for the press. */
        "transition-[opacity,color,background-color,border-color,transform] duration-150 ease-out",
        "active:scale-[0.94]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none",
        className
      )}
    >
      {forward ? (
        <CaretRight size={size} weight="bold" />
      ) : (
        <CaretLeft size={size} weight="bold" />
      )}
    </button>
  );
}
