"use client";

import { useEffect, useState } from "react";

/**
 * The hoopoe: a login delight. Its wings cover its eyes while the password is
 * hidden, and open like little curtains when you reveal it. covered => eyes hidden.
 *
 * On mount it runs a one-shot intro: eyes open, a quick blink, then it settles
 * closed so the reveal interaction gets noticed. Animation is driven by inline
 * styles + transform/opacity only so it never depends on global CSS timing.
 */
const WING_T = "transform 0.5s cubic-bezier(0.34, 1.5, 0.64, 1)";
const EYE_T = "opacity 0.2s ease 0.1s, transform 0.18s ease";

export function Hoopoe({ covered, size = 120 }: { covered: boolean; size?: number }) {
  // Crest: rounded-tip cinnamon spokes (matches the preview/v2 hoopoe).
  const crest = [-32, -16, 0, 16, 32];

  // One-shot intro choreography: open -> blink -> settle. blink squashes the
  // eyes (scaleY), settle nudges the whole bird down a hair then back.
  const [blink, setBlink] = useState(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const b = setTimeout(() => setBlink(true), 620);
    const b2 = setTimeout(() => setBlink(false), 760);
    const s = setTimeout(() => setSettled(true), 900);
    return () => {
      clearTimeout(b);
      clearTimeout(b2);
      clearTimeout(s);
    };
  }, []);

  const eyeStyle = {
    opacity: covered ? 0 : 1,
    transformBox: "fill-box",
    transformOrigin: "50% 50%",
    transform: blink ? "scaleY(0.12)" : "scaleY(1)",
    transition: EYE_T,
  } as const;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 92"
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

      {/* Fanned, banded tail behind the body: three splayed feathers */}
      {[-13, 0, 13].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 40 62)`}>
          <rect x="37" y="60" width="6" height="28" rx="2.5" fill="#2C2A28" />
          <rect x="37" y="68" width="6" height="5" fill="#F2EFE7" />
          <rect x="37" y="79" width="6" height="5" fill="#F2EFE7" />
        </g>
      ))}

      {/* Body + head */}
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
          transform: covered ? "rotate(0deg)" : "rotate(-84deg)",
          transition: WING_T,
        }}
      />
      <path
        d="M40 32 Q56 34 57 49 Q48 54 40 48 Z"
        fill="#B06C39"
        style={{
          transformBox: "fill-box",
          transformOrigin: "0% 100%",
          transform: covered ? "rotate(0deg)" : "rotate(84deg)",
          transition: WING_T,
        }}
      />
    </svg>
  );
}
