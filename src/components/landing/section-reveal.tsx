"use client";

import { useRef, useEffect, useState } from "react";

/**
 * The single scroll animation primitive: fade + small rise as a section enters.
 *
 * No-JS / pre-hydration safe: content renders visible by default and only
 * arms the hidden start state once mounted on the client, so a user without
 * JavaScript (or before hydration) never sees opacity-0 content. Plays
 * regardless of the OS reduced-motion setting (animations always play, per
 * the design system) — there is deliberately no reduce-motion branch here.
 */
export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Arm the hidden start state, then observe to reveal.
    setShown(false);
    setArmed(true);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        armed && !shown ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
