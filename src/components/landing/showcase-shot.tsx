"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, m } from "motion/react";
import { Search } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";

export type Tint = "leaf" | "sky" | "cinnamon";
/** Which way the backing card leans. Sections alternate this (see page.tsx)
 * so consecutive frames zig-zag instead of all leaning the same direction —
 * the composed, not-stacked rhythm the vertical sequence needs. */
export type Tilt = "ccw" | "cw";

/** Backing-card tint per section accent. Full literal class strings (with the
 * opacity baked in) so Tailwind's static scanner can see them — building a
 * class like `${base}/50` at runtime would be invisible to the JIT scanner. */
const TINT_BG: Record<Tint, string> = {
  leaf: "bg-leaf/45",
  sky: "bg-sky/45",
  cinnamon: "bg-cinnamon/45",
};

const TILT_DEG: Record<Tilt, number> = { ccw: -2.5, cw: 2.5 };

/**
 * A screenshot framed as the product: a warm rounded panel with a faux in-app
 * top bar (peaks mark + search pill) so it reads as *this* app, plus a subtle
 * scroll-linked parallax drift. A softly rotated tint card sits behind it like
 * a photo set down a beat off-square, so the frame reads as an object with
 * real weight instead of a flat rectangle adrift in whitespace — `tilt` picks
 * which way it leans, so callers can alternate direction section to section
 * instead of every frame leaning the same way. Transform/opacity only,
 * GPU-composited, reduced-motion safe. The image lazy-loads with a blur
 * placeholder.
 */
export function ShowcaseShot({
  src,
  alt,
  width,
  height,
  blurDataURL,
  tint = "leaf",
  tilt = "ccw",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  tint?: Tint;
  tilt?: Tilt;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Only arm the scroll-linked parallax after mount so the server-rendered
  // HTML (no transform) matches the client's first render and never triggers
  // a hydration mismatch. Transform/opacity-only, reduced-motion safe.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [22, -22]);

  return (
    <div ref={ref} className="relative @container">
      {/* The tint card behind the frame: fixed rotation (no motion, no layout
          impact) so it reads as a still mat under the screenshot. */}
      <div
        aria-hidden
        className={`absolute -inset-2.5 rounded-[var(--radius-2xl)] sm:-inset-3.5 ${TINT_BG[tint]}`}
        style={{ transform: `rotate(${TILT_DEG[tilt]}deg)` }}
      />
      {/* data-shot sits on the bordered frame itself (not this wrapper) so that
          PerchingBirds reads getBoundingClientRect() including the scroll-linked
          parallax transform below — the birds' perch line then tracks the frame's
          true on-screen top edge, not a static layout box. */}
      <m.div
        data-shot
        style={!mounted ? undefined : { y }}
        className="card-elevated relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
      >
        {/* Faux in-app top bar. Sized in em off a cqw-driven font-size so the bar
            stays a constant fraction of the shot at every width, keeping the
            shot's internal proportions identical desktop-to-mobile. */}
        <div
          className="flex items-center gap-[0.7em] border-b border-border bg-card px-[1.1em] py-[0.72em]"
          style={{ fontSize: "clamp(7.5px, 2.35cqw, 11px)" }}
        >
          <PeaksMark size="1.15em" variant="light" />
          <div className="flex h-[1.95em] flex-1 items-center gap-[0.6em] rounded-full border border-border bg-muted px-[1em] text-[1em] text-muted-foreground">
            <Search className="h-[1.1em] w-[1.1em]" aria-hidden />
            <span>Search the valley</span>
          </div>
        </div>
        <div className="overflow-hidden">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 660px"
            placeholder={blurDataURL ? "blur" : "empty"}
            blurDataURL={blurDataURL}
            className="h-auto w-full"
          />
        </div>
      </m.div>
    </div>
  );
}
