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
    <motion.div
      ref={ref}
      style={reduce || !mounted ? undefined : { y }}
      className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
      data-shot
    >
      {/* Faux in-app top bar */}
      <div className="flex items-center gap-2.5 border-b border-border bg-card px-4 py-2.5">
        <PeaksMark size={13} variant="light" />
        <div className="flex h-6 flex-1 items-center gap-2 rounded-full border border-border bg-muted px-3 text-[11px] text-muted-foreground">
          <Search className="h-3 w-3" aria-hidden />
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
  );
}
