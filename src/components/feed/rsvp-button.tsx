"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SpringPress, EASE_POP } from "@/components/common/motion";

/**
 * RsvpButton: the "Coming up" event action in the feed rail.
 *
 * The Events feature has not landed yet, so this carries no server backing.
 * It is a tasteful local toggle (RSVP to Going to RSVP), promoting the approved
 * RSVP-to-Going micro-interaction from the delight lab onto the real card:
 *  - the pill settles with a confident pop and turns solid leaf,
 *  - a check draws on (pathLength), and
 *  - two small flecks (leaf, then cinnamon) lift off.
 *
 * Real app tokens only; transform and opacity animate, plus a brief colour
 * crossfade on the pill. Flecks are painted on the first frame with literal
 * brand hex (matching the post-card pattern) so they never tween through an
 * inherited colour. When real RSVP logic arrives this stays the visual layer;
 * an onToggle hook is the only thing that needs wiring in.
 */

// Two flecks that lift off when RSVP settles into Going, in the valley palette.
// dx is the horizontal drift, c the brand hex (leaf first, then cinnamon).
const RSVP_FLECKS = [
  { dx: -12, c: "#1F8A4C" },
  { dx: 11, c: "#C2622F" },
];

export function RsvpButton() {
  const [going, setGoing] = useState(false);
  // Bumped on each settle so a fresh fleck batch keys in (lets you re-fire it).
  const [burst, setBurst] = useState(0);

  function toggle() {
    const next = !going;
    setGoing(next);
    // Fresh fleck batch keys in on each settle into Going (lets it re-fire).
    if (next) setBurst((b) => b + 1);
  }

  return (
    <motion.span
      className="mt-2.5 inline-flex"
      animate={going ? { scale: [1, 0.94, 1.05, 1] } : { scale: 1 }}
      transition={
        going
          ? { duration: 0.46, ease: EASE_POP, times: [0, 0.28, 0.6, 1] }
          : { duration: 0.2, ease: "easeOut" }
      }
    >
      <SpringPress
        onClick={toggle}
        aria-pressed={going}
        className={`relative inline-flex h-[34px] items-center justify-center gap-1.5 overflow-visible rounded-full px-4 text-[13px] font-semibold transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 ${
          going
            ? "bg-leaf text-white focus-visible:ring-leaf/50"
            : "bg-cinnamon/[0.14] text-cinnamon hover:bg-cinnamon/[0.22] focus-visible:ring-cinnamon/50"
        }`}
      >
        {/* Check draws on only when Going, so at rest the "RSVP" label sits centred
            with no orphan gap on the left. Painted white on the first frame so it never
            flashes through an inherited colour; only pathLength + opacity animate. */}
        {going && (
          <span className="grid h-[15px] w-[15px] place-items-center">
            <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden>
              <motion.path
                d="M3.5 9.5 L7.5 13 L14.5 5"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.3, ease: [0.65, 0, 0.35, 1], delay: 0.06 },
                  opacity: { duration: 0.12 },
                }}
              />
            </svg>
          </span>
        )}
        <span>{going ? "Going" : "RSVP"}</span>

        {/* Flecks lift off the moment it settles into Going. Painted on the first
            frame with brand hex (post-card pattern); transform + opacity only. */}
        {going && (
          <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1/2">
            {RSVP_FLECKS.map((f, i) => (
              <motion.span
                key={`${burst}-${i}`}
                className="absolute block"
                style={{
                  width: 6,
                  height: 6,
                  marginLeft: -3,
                  borderRadius: "2px 6px 2px 6px",
                  background: f.c,
                }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
                animate={{
                  opacity: [0, 0.95, 0],
                  x: f.dx,
                  y: -30,
                  scale: [0.4, 1, 0.85],
                  rotate: f.dx > 0 ? 36 : -36,
                }}
                transition={{
                  duration: 0.85,
                  ease: [0.22, 0.61, 0.36, 1],
                  times: [0, 0.2, 1],
                  delay: i * 0.05,
                }}
              />
            ))}
          </span>
        )}
      </SpringPress>
    </motion.span>
  );
}
