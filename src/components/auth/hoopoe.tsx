"use client";

import { useEffect, useState } from "react";

/**
 * The hoopoe: a login delight. Its eyes mirror the password field exactly: while
 * the password is hidden (the default), the wings stay closed over the eyes; the
 * moment you reveal the password, the wings open like little curtains and the eyes
 * watch. covered => eyes hidden.
 *
 * On mount it runs a one-shot intro so the interaction gets noticed: the wings
 * open, the eyes blink twice, then the wings close over the eyes and the bird
 * hands control back to the `covered` prop. After the intro it simply reacts to
 * show/hide. Animation is driven by inline styles + transform/opacity only so it
 * never depends on global CSS timing.
 */
const WING_T = "transform 0.5s cubic-bezier(0.34, 1.5, 0.64, 1)";
const EYE_T = "opacity 0.22s ease, transform 0.18s ease";

export function Hoopoe({ covered, size = 120 }: { covered: boolean; size?: number }) {
  // Crest: rounded-tip cinnamon spokes (matches the preview/v2 hoopoe).
  const crest = [-32, -16, 0, 16, 32];

  // One-shot intro choreography, regardless of the password state: settle in,
  // wings held open, blink twice, then the intro ends and the wings close over
  // the eyes (the default, since the password is hidden). Two blinks make the
  // little animation register before it tucks away.
  const [blink, setBlink] = useState(false);
  const [settled, setSettled] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  useEffect(() => {
    const timers = [
      setTimeout(() => setSettled(true), 120),
      setTimeout(() => setBlink(true), 480),
      setTimeout(() => setBlink(false), 600),
      setTimeout(() => setBlink(true), 780),
      setTimeout(() => setBlink(false), 900),
      setTimeout(() => setIntroActive(false), 1150),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // During the intro the wings are held open and the eyes are out; afterwards the
  // bird follows the real password state.
  const effectiveCovered = introActive ? false : covered;

  const eyeStyle = {
    opacity: effectiveCovered ? 0 : 1,
    transformBox: "fill-box",
    transformOrigin: "50% 50%",
    transform: blink ? "scaleY(0.12)" : "scaleY(1)",
    transition: EYE_T,
  } as const;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden
      style={{
        transformBox: "fill-box",
        transformOrigin: "50% 100%",
        transform: settled ? "translateY(0)" : "translateY(-3px)",
        opacity: settled ? 1 : 0.92,
        transition: "transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.4s ease",
      }}
    >
      {/* Crest: a fan of black-tipped cinnamon spokes with rounded tips */}
      {crest.map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 40 33)`}>
          <rect x="37.4" y="3" width="5.2" height="25" rx="2.6" fill="#C2622F" />
          <circle cx="40" cy="4.6" r="3.2" fill="#2C2A28" />
        </g>
      ))}

      {/* Body + head (rounded body, no tail) */}
      <ellipse cx="40" cy="58" rx="18" ry="17" fill="#D9A36F" />
      <ellipse cx="40" cy="40" rx="15" ry="14" fill="#E2B68B" />

      {/* Short decurved beak */}
      <path d="M40 44 Q38.4 51 37 55.5 Q36.6 55.9 36.2 55.6 Q38 50 38.5 44 Z" fill="#3A3330" />

      {/* Eyes (fade out when covered, blink on intro) */}
      <circle cx="33.8" cy="41" r="2.8" fill="#2C2A28" style={eyeStyle} />
      <circle cx="46.2" cy="41" r="2.8" fill="#2C2A28" style={eyeStyle} />

      {/* Wings: at rest they cover the eyes; they swing open outward when uncovered */}
      <path
        d="M40 32 Q24 34 23 49 Q32 54 40 48 Z"
        fill="#B06C39"
        style={{
          transformBox: "fill-box",
          transformOrigin: "100% 100%",
          transform: effectiveCovered ? "rotate(0deg)" : "rotate(-84deg)",
          transition: WING_T,
        }}
      />
      <path
        d="M40 32 Q56 34 57 49 Q48 54 40 48 Z"
        fill="#B06C39"
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 100%",
          transform: effectiveCovered ? "rotate(0deg)" : "rotate(84deg)",
          transition: WING_T,
        }}
      />
    </svg>
  );
}
