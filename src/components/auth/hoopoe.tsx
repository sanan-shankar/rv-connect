"use client";

/**
 * The hoopoe: a login delight. Its wings cover its eyes while the password is
 * hidden, and open like little curtains when you reveal it. covered => eyes hidden.
 * Animation is driven by inline styles so it never depends on global CSS timing.
 */
const WING_T = "transform 0.5s cubic-bezier(0.34, 1.5, 0.64, 1)";
const EYE_T = "opacity 0.2s ease 0.1s";

export function Hoopoe({ covered, size = 120 }: { covered: boolean; size?: number }) {
  const crest = [-39, -26, -13, 0, 13, 26, 39];
  const eyeStyle = { opacity: covered ? 0 : 1, transition: EYE_T } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 80 88" fill="none" aria-hidden>
      {/* Crest: a fan of black-tipped cinnamon spokes */}
      {crest.map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 40 33)`}>
          <rect x="37.6" y="4" width="4.8" height="24" rx="2.4" fill="#C2622F" />
          <rect x="37.6" y="4" width="4.8" height="7" rx="2.4" fill="#2C2A28" />
        </g>
      ))}

      {/* Long banded tail behind the body */}
      <rect x="35.5" y="60" width="9" height="27" rx="1.5" fill="#2C2A28" />
      <rect x="35.5" y="75" width="9" height="6" fill="#F2EFE7" />

      {/* Body + head */}
      <ellipse cx="40" cy="58" rx="18" ry="17" fill="#D9A36F" />
      <ellipse cx="40" cy="40" rx="15" ry="14" fill="#E2B68B" />

      {/* Short decurved beak */}
      <path d="M40 44 Q38.4 51 37 55.5 Q36.6 55.9 36.2 55.6 Q38 50 38.5 44 Z" fill="#3A3330" />

      {/* Eyes (fade out when covered, also physically hidden by the wings) */}
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
