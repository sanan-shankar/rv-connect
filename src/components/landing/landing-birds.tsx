"use client";

import { useEffect, useRef, useState } from "react";

/** A small leaf glyph, echoing the brand's leaf vocabulary. */
function Leaf({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path
        d="M20 4C10 4 4 10 4 20c0 0 6-1 10-5s6-11 6-11Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path d="M17 7C12 9 8 13 6 18" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** A tiny perched bird glyph, decorative. */
function BirdGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <ellipse cx="15" cy="18" rx="8" ry="6" fill="currentColor" />
      <circle cx="21" cy="12" r="4.5" fill="currentColor" />
      <path d="M24.5 11.5 L29 10.5 L25 13.5 Z" fill="var(--color-cinnamon)" />
      <circle cx="22" cy="11" r="0.9" fill="var(--color-paper)" />
      <path d="M8 17 Q3 16 5 21 Q9 20 11 19 Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

/**
 * The hopping bird that perches on the top edge of a section frame and hops a
 * few times when it scrolls into view, then settles. Decorative, aria-hidden,
 * gated behind in-view + reduced motion so it never burns CPU off-screen.
 */
export function HoppingBird({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hop, setHop] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHop(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute text-canopy ${className} ${hop ? "lb-hop" : ""}`}
    >
      <BirdGlyph />
      <style>{`
        @keyframes lb-hop {
          0% { transform: translateY(0); }
          18% { transform: translateY(-12px); }
          36% { transform: translateY(0); }
          54% { transform: translateY(-8px); }
          72% { transform: translateY(0); }
          86% { transform: translateY(-3px) rotate(-4deg); }
          100% { transform: translateY(0) rotate(0); }
        }
        .lb-hop { animation: lb-hop 1.7s cubic-bezier(.34,1.56,.64,1) .15s 1 both; }
        @media (prefers-reduced-motion: reduce) { .lb-hop { animation: none; } }
      `}</style>
    </span>
  );
}

/**
 * A handful of slow drifting leaves behind a section, looping gently while in
 * view. Light enough that it never reads as snow. Gated behind in-view +
 * reduced motion. Transform/opacity only.
 */
export function DriftingLeaves() {
  const ref = useRef<HTMLDivElement>(null);
  const [drift, setDrift] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrift(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const leaves = [
    { left: "8%", delay: "0s", dur: "10s", size: 20, tint: "var(--color-leaf)" },
    { left: "22%", delay: "2.4s", dur: "12s", size: 15, tint: "var(--color-cinnamon)" },
    { left: "38%", delay: "4.1s", dur: "9.5s", size: 18, tint: "var(--color-canopy)" },
    { left: "54%", delay: "1.2s", dur: "11.5s", size: 16, tint: "var(--color-leaf)" },
    { left: "68%", delay: "3.3s", dur: "10.5s", size: 21, tint: "var(--color-cinnamon)" },
    { left: "82%", delay: "5s", dur: "9s", size: 17, tint: "var(--color-canopy)" },
    { left: "93%", delay: "2s", dur: "12.5s", size: 14, tint: "var(--color-leaf)" },
  ];

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {drift &&
        leaves.map((l, i) => (
          <span
            key={i}
            className="lb-drift absolute top-0"
            style={{
              left: l.left,
              animationDelay: l.delay,
              animationDuration: l.dur,
              color: l.tint,
            }}
          >
            <Leaf style={{ width: l.size, height: l.size }} />
          </span>
        ))}
      <style>{`
        @keyframes lb-drift {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          12% { opacity: 0.55; }
          88% { opacity: 0.55; }
          100% { transform: translateY(320px) rotate(220deg); opacity: 0; }
        }
        .lb-drift { animation-name: lb-drift; animation-timing-function: linear; animation-iteration-count: infinite; animation-fill-mode: both; }
        @media (prefers-reduced-motion: reduce) { .lb-drift { display: none; } }
      `}</style>
    </div>
  );
}
