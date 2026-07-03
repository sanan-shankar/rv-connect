"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";

/**
 * A screenshot framed as the product: a warm rounded panel with a faux in-app
 * top bar (peaks mark + search pill) so it reads as *this* app, plus a subtle
 * scroll-linked parallax drift. Transform/opacity only, GPU-composited,
 * reduced-motion safe. The image lazy-loads with a blur placeholder.
 */
export function ShowcaseShot({
  src,
  alt,
  width,
  height,
  blurDataURL,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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
    <div ref={ref} className="relative @container" data-shot>
      <motion.div
        style={reduce || !mounted ? undefined : { y }}
        className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
      >
        {/* Faux in-app top bar. Sized in em off a cqw-driven font-size so the bar
            stays a constant fraction of the shot at every width. That keeps the
            shot's internal proportions identical desktop-to-mobile, so the
            annotation arrows (positioned in %) land on the same spot at both. */}
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
            sizes="(max-width: 1024px) 100vw, 560px"
            placeholder={blurDataURL ? "blur" : "empty"}
            blurDataURL={blurDataURL}
            className="h-auto w-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
