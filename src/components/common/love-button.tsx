"use client";

import { useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { m } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

// Tiny flecks that drift up when a heart is liked, in the valley palette. Timing/scale ported from
// the /lab feedback lab so they drift slowly (0.9s) instead of snapping.
const LEAF_FLECKS = [
  { x: -14, y: -34, c: "#1F8A4C" },
  { x: 13, y: -40, c: "#C2622F" },
  { x: 2, y: -44, c: "#235C49" },
];

/**
 * ONE heart, TWO sizes, both owned here. The history, because it has swung
 * both ways: an early free-for-all `sm` (12px) spread to every surface and
 * the owner killed it ("what's this sudden habit of all the heart icons being
 * half the size it should be?") — the answer then was one 18px heart
 * everywhere. Then the comments row, a 12px-text meta line, wore that 18px
 * heart for a month and the owner called that too ("the size of the heart in
 * the comments section is too big. it looks off. it's totally out of place",
 * 2026-08-13). Both complaints are the same principle: the heart is sized to
 * the ROW it lives in, and the sizes live HERE as named variants, never as a
 * caller's className hack. `md` (18px) is for post/photo action rows set in
 * text-sm; `sm` (14px) is for dense text-xs meta lines — comments today.
 * 14 not 12: the icon stays a whisker taller than the 12px type beside it,
 * which is how the big platforms set a comment heart, and it never reads as
 * "half" of the post heart the way 12 did.
 */
const HEART = {
  md: { icon: 18, gap: "gap-1.5", padding: "px-2.5 py-1.5", text: "text-sm" },
  // py-0.5, not py-1: the 14px icon plus 2px+2px of padding makes an 18px
  // button, which sits INSIDE the comments' 20px (h-5) meta row. At py-1 the
  // button measured 22px and its hover pill bled past the row again — the
  // exact overflow the md variant's history warns about.
  sm: { icon: 14, gap: "gap-1", padding: "px-1.5 py-0.5", text: "text-xs" },
} as const;

/**
 * One shared love/like button for the whole app (feed posts, comments, the Collection,
 * group posts). Captures the feed's exact "never flashes black" interaction:
 * - The heart is hardcoded to #E03A33 and painted on the first frame with `transition: none`,
 *   so it can never tween through the inherited/dark colour.
 * - Only `transform` animates: a smooth multi-keyframe pop (tween, EASE_POP, never a spring).
 * - Three leaf flecks drift outward and fade on like.
 *
 * Per DESIGN-SYSTEM sec. 7 / PUNCHLIST: extract once, reuse everywhere. Do not fork this again.
 */
export function LoveButton({
  liked,
  count,
  onToggle,
  showCount = true,
  className = "",
  label,
  size = "md",
  onDark = false,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  /** Hide the count entirely (e.g. comment hearts already hide count at 0 via the caller). */
  showCount?: boolean;
  className?: string;
  label?: string;
  /** Floating over a photograph rather than sitting on a warm surface. The
   *  full-screen viewer is the one region in the app whose background does not
   *  follow the theme: `state-layer` paints an INK tint, which has nothing
   *  left to darken on a near-black wash, and `hover:text-foreground` would
   *  send the label to dark ink over the picture. Same button, same heart,
   *  two hovers. */
  onDark?: boolean;
  /** Named variants only (see HEART above): `md` for post rows, `sm` for dense meta lines. */
  size?: keyof typeof HEART;
}) {
  const [animate, setAnimate] = useState(false);
  const { icon, gap, padding, text } = HEART[size];

  function handleClick() {
    if (!liked) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 900);
    }
    onToggle();
  }

  return (
    <m.button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={label}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      // state-layer, not hover:bg-accent. This button's home is a post card,
      // where --accent measured +2.06 dL* against the paper under it: at the
      // ~2 just-noticeable threshold, so the app's most-pressed control had a
      // hover nobody could see. The ink tint lands at -4.50 there, and at the
      // same weight in the photo viewer and the Collection, which sit on
      // different surfaces. It paints a background-IMAGE, so it composites
      // over the card instead of replacing it, and it cannot touch the heart.
      className={`inline-flex items-center ${gap} rounded-full ${padding} ${text} focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onDark
          ? "text-white/85 transition-colors duration-150 hover:bg-white/12 focus-visible:outline-white"
          : "state-layer focus-visible:outline-ring"
      } ${
        liked ? "text-heart" : onDark ? "hover:text-white" : "hover:text-foreground"
      } ${className}`}
    >
      <span className="relative inline-flex">
        {/* Heart is ALWAYS red, painted on the first frame. transition:none stops it
            tweening through the dark inherited colour, so it can never flash black.
            Only transform animates: a smooth multi-keyframe pop (tween, never a spring). */}
        <m.span
          className="inline-flex will-change-transform"
          animate={animate ? { scale: [1, 0.86, 1.28, 0.97, 1] } : { scale: 1 }}
          transition={
            animate
              ? { duration: 0.5, ease: EASE_POP, times: [0, 0.18, 0.5, 0.74, 1] }
              : { duration: 0 }
          }
        >
          <Heart
            size={icon}
            weight={liked ? "fill" : "duotone"}
            color="#E03A33"
            style={{
              /* 0.45 is a resting weight tuned against a warm PAPER card,
                 where a heart at full strength shouts. Over a photograph it
                 disappeared -- the owner, in the viewer: "the heart is not
                 really visible. the hearted heart is visible but the other
                 one no one will see it." There is no surface to sit quietly
                 against there, so on dark the unliked heart is drawn at full
                 strength and the fill/outline weight above carries the state
                 instead of the opacity. */
              opacity: liked || onDark ? 1 : 0.45,
              /* And a photograph can be any colour, including a red one. The
                 shadow is what keeps the glyph readable over a bright sky,
                 the same job the scrims do for the words beside it. */
              filter: onDark ? "drop-shadow(0 1px 2px rgba(0,0,0,0.55))" : undefined,
              transition: "none",
            }}
          />
        </m.span>
        {animate && (
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
            {LEAF_FLECKS.map((f, i) => (
              <m.span
                key={i}
                className="absolute block rounded-full"
                style={{ width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, background: f.c }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.5, rotate: 0 }}
                animate={{
                  opacity: [0, 0.95, 0.95, 0],
                  x: f.x,
                  y: f.y,
                  scale: [0.5, 1, 1, 0.9],
                  rotate: f.x > 0 ? 40 : -40,
                }}
                transition={{ duration: 0.9, ease: EASE_POP, times: [0, 0.18, 0.7, 1] }}
              />
            ))}
          </span>
        )}
      </span>
      {showCount && <span>{count}</span>}
    </m.button>
  );
}
