"use client";

/* ------------------------------------------------------------------ *
 *  <TourSpotlight> — the dimming overlay (walkthrough spec sec 3 + 9).
 *
 *  A single fixed full-viewport layer that darkens everything except a
 *  rounded-rect hole over the current stop's `data-tour` target, via the
 *  classic oversized box-shadow trick (a transparent box the size of the
 *  target, whose box-shadow spread covers the rest of the viewport) —
 *  simpler and cheaper than an SVG mask, and just as accurate since it
 *  reads the target's live rect. Warm ink at ~55% opacity (never pure
 *  black), with a soft leaf-tinted ring around the hole.
 *
 *  When the current stop has no target (Offer, Finish) it dims the whole
 *  page evenly behind the card: same layer, no hole.
 *
 *  Recomputes on resize, scroll (anywhere in the document, capture
 *  phase), and target resize (ResizeObserver) so a target that reflows
 *  mid-stop is never spotlighted at a stale position.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { getSpotlightEl } from "./tour-anchors";

interface HoleRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

const DIM = "0 0 0 9999px color-mix(in srgb, var(--color-ink) 55%, transparent)";

export function TourSpotlight({ active, spotlightKey }: { active: boolean; spotlightKey: string | null }) {
  const [hole, setHole] = useState<HoleRect | null>(null);

  useEffect(() => {
    if (!active || !spotlightKey) {
      setHole(null);
      return;
    }
    const el = getSpotlightEl(spotlightKey);
    if (!el) {
      setHole(null);
      return;
    }

    function measure() {
      const r = el!.getBoundingClientRect();
      // Pills (composer, Contribute button) read as fully round; the wider
      // Catch-ups explainer card keeps the app's own 16px card radius.
      const radius = r.height <= 0 ? 16 : Math.min(r.height / 2, 9999);
      setHole({ left: r.left, top: r.top, width: r.width, height: r.height, radius });
    }
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [active, spotlightKey]);

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={spotlightKey ?? "none"}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SPRINGS.gentle}
      >
        {hole ? (
          <div
            className="absolute rounded-[var(--radius)]"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.width,
              height: hole.height,
              borderRadius: hole.radius,
              boxShadow: DIM,
              outline: "2px solid color-mix(in srgb, var(--color-leaf) 55%, transparent)",
              outlineOffset: 4,
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--color-ink) 55%, transparent)" }} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
