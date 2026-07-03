"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionGovernor } from "@/components/common/motion";

/* ------------------------------------------------------------------ *
 *  AmbientLeaves — a fixed, full-viewport layer of sparse falling
 *  leaves that lives across the whole lower page (below the hero,
 *  through every screenshot, down to the footer).
 *
 *  Design notes:
 *  - Cheap by construction: a small pool of DOM sprites driven by ONE
 *    rAF loop that mutates `transform`/`opacity` imperatively via refs
 *    (no per-frame React re-render). Only transform + opacity animate.
 *  - Sparse: staggered per-leaf rest gaps keep only a few on screen.
 *  - Tappable: the layer is pointer-events:none so it never blocks the
 *    page; only the leaf sprites themselves take pointer events. A tap
 *    gives a little puff (scale pulse) + spin, then the leaf drifts on.
 *  - Fades in only once the hero is scrolled past, so the photo hero
 *    stays pristine, and pauses entirely when off-range or tab hidden.
 *  - Footer drift: while the footer is in view, a shallow, capped pile
 *    of leaves settles along the bottom edge (oldest fade when capped).
 *  - Motion always plays (design system): no prefers-reduced-motion.
 *  - SSR-safe: the pool size is a stable desktop default on the server
 *    and first client render; the phone-lighter density only takes over
 *    after mount (no hydration mismatch).
 * ------------------------------------------------------------------ */

const LEAF_TINTS = [
  "var(--color-leaf)",
  "var(--color-cinnamon)",
  "var(--color-canopy)",
  "#C79318", // marigold, a warm autumn note
];

/** One drifting leaf's live physics state (viewport px unless noted). */
type Leaf = {
  el: HTMLSpanElement | null;
  baseX: number; // horizontal anchor (px)
  y: number; // vertical position (px), starts above the top
  fall: number; // fall speed (px/s)
  swayAmp: number; // horizontal sway amplitude (px)
  swayFreq: number; // sway angular speed
  phase: number; // sway phase offset
  rot: number; // current rotation (deg)
  rotSpeed: number; // deg/s
  size: number;
  wait: number; // seconds still to wait above the viewport before falling
  poof: number; // remaining tap-puff progress (seconds), 0 = none
  kick: number; // decaying horizontal impulse from a tap (px/s)
  landed: boolean; // captured into the footer pile
};

/** A settled leaf in the footer pile. */
type Piled = { el: HTMLSpanElement | null };

const SETTLE_PILE = true; // the "leaves collect at the bottom" flourish

export function AmbientLeaves() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pileWrapRef = useRef<HTMLDivElement>(null);
  const leafRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pileRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // SSR-safe responsive density: desktop default until mount, then phone-lighter.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Small pool + a moderate rest gap between falls keeps concurrent leaves in
  // the "a few, not a storm" 2-5 band (see density tuning notes below).
  const COUNT = isMobile ? 4 : 6;
  const PILE_CAP = isMobile ? 6 : 10;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const PILE_TARGET = isMobile ? 5 : 8;

    // Seed the falling pool with randomized physics, staggered above the top.
    // Two different rest-gap regimes: a short one for each leaf's very first
    // (pre-activation) spawn, so the pool cascades into view quickly once the
    // layer activates, and a longer steady-state one between subsequent falls
    // so the pool settles into a handful visible at once, not a downpour.
    const spawn = (l: Leaf, initial: boolean) => {
      l.size = 13 + Math.random() * 9;
      l.baseX = Math.random() * vw();
      l.y = -40 - Math.random() * (initial ? vh() * 0.4 : 120);
      l.fall = 24 + Math.random() * 26; // slow drift
      l.swayAmp = 14 + Math.random() * 26;
      l.swayFreq = 0.5 + Math.random() * 0.7;
      l.phase = Math.random() * Math.PI * 2;
      l.rot = Math.random() * 360;
      l.rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 34);
      l.wait = initial
        ? Math.random() * (isMobile ? 1.5 : 2) // brief cold-start stagger (activation seeding covers instant visibility)
        : isMobile
          ? 7 + Math.random() * 16 // steady-state rest gap between falls
          : 10 + Math.random() * 22;
      l.poof = 0;
      l.kick = 0;
      l.landed = false;
      if (l.el) {
        l.el.style.color = LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)];
        l.el.style.width = `${l.size}px`;
        l.el.style.height = `${l.size}px`;
      }
    };

    const leaves: Leaf[] = leafRefs.current.slice(0, COUNT).map((el) => {
      const l: Leaf = {
        el,
        baseX: 0,
        y: 0,
        fall: 0,
        swayAmp: 0,
        swayFreq: 0,
        phase: 0,
        rot: 0,
        rotSpeed: 0,
        size: 16,
        wait: 0,
        poof: 0,
        kick: 0,
        landed: false,
      };
      spawn(l, true);
      return l;
    });

    // Tap handling: a small puff + spin, then it keeps drifting. Bound on each
    // sprite (which owns pointer events) so the rest of the layer stays click-through.
    const onTap = (i: number) => (e: Event) => {
      e.stopPropagation();
      const l = leaves[i];
      if (!l || l.landed) return;
      l.poof = 0.5;
      l.kick = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 60);
      l.rotSpeed += (l.rotSpeed >= 0 ? 1 : -1) * 260;
    };
    const cleanups = leaves.map((l, i) => {
      if (!l.el) return () => {};
      const h = onTap(i);
      l.el.addEventListener("pointerdown", h);
      return () => l.el?.removeEventListener("pointerdown", h);
    });

    // Footer pile bookkeeping.
    const pile: Piled[] = pileRefs.current.slice(0, PILE_CAP).map((el) => ({ el }));
    let pileUsed = 0; // count currently settled (front of the pile array)
    let pileDrip = 0; // drip accumulator (s)
    const capturePileLeaf = (x: number, tint: string, size: number) => {
      // Reuse the oldest slot when full (it fades out and is replaced).
      const slot = pileUsed < PILE_CAP ? pileUsed++ : 0;
      const p = pile[slot];
      if (!p || !p.el) return;
      const px = Math.max(6, Math.min(vw() - size - 6, x));
      const rot = -30 + Math.random() * 60;
      p.el.style.color = tint;
      p.el.style.width = `${size}px`;
      p.el.style.height = `${size}px`;
      p.el.style.left = `${px}px`;
      p.el.style.transition = "none";
      p.el.style.transform = `translateY(6px) rotate(${rot}deg) scale(0.6)`;
      p.el.style.opacity = "0";
      // next frame: settle in
      requestAnimationFrame(() => {
        if (!p.el) return;
        p.el.style.transition = "transform 420ms ease-out, opacity 300ms ease-out";
        p.el.style.transform = `translateY(0) rotate(${rot}deg) scale(1)`;
        p.el.style.opacity = "0.6";
      });
    };

    // On first activation, drop a few leaves straight into the viewport at
    // varied heights/phases, as if their fall were already in progress —
    // otherwise every leaf starts above the fold and the first ones take
    // 15-40s to drift down, reading as an empty layer.
    let hasSeededView = false;
    const seedIntoView = () => {
      const n = Math.min(leaves.length, isMobile ? 2 : 3);
      const order = leaves.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (let k = 0; k < n; k++) {
        const l = leaves[order[k]];
        l.wait = 0;
        l.y = vh() * (0.08 + Math.random() * 0.74);
        l.phase = Math.random() * Math.PI * 2;
      }
    };

    // Scroll range gate: leaves are hidden over the hero, appear once scrolled
    // past ~55% of the first viewport, and stay through the footer.
    let active = false;
    let nearBottom = false;
    const recomputeRange = () => {
      const y = window.scrollY;
      const wasActive = active;
      active = y > vh() * 0.55;
      nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 140;
      if (wrap) wrap.style.opacity = active ? "1" : "0";
      const pileWrap = pileWrapRef.current;
      if (pileWrap && SETTLE_PILE) pileWrap.style.opacity = nearBottom ? "1" : "0";
      if (active && !hasSeededView) {
        hasSeededView = true;
        seedIntoView();
      }
      // Only let the (invisible) leaf sprites take taps while the layer is live,
      // so nothing hit-testable lingers over the hero when scrolled to the top.
      if (active !== wasActive) {
        for (const el of leafRefs.current) {
          if (el) el.style.pointerEvents = active ? "auto" : "none";
        }
      }
    };
    recomputeRange();
    window.addEventListener("scroll", recomputeRange, { passive: true });
    window.addEventListener("resize", recomputeRange, { passive: true });

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Pause work when the tab is hidden or the layer is out of range.
      if (pausedRef.current || !active) return;

      // Footer pile: gently build a shallow drift while the footer is in view
      // (slow leaves rarely complete a full fall, so we drip a few in), capped.
      if (SETTLE_PILE && nearBottom) {
        pileDrip += dt;
        if (pileDrip > 0.55 && pileUsed < PILE_TARGET) {
          pileDrip = 0;
          const size = 13 + Math.random() * 9;
          capturePileLeaf(Math.random() * vw(), LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)], size);
        }
      }

      const height = vh();
      for (const l of leaves) {
        if (!l.el || l.landed) continue;
        if (l.wait > 0) {
          l.wait -= dt;
          l.el.style.opacity = "0";
          continue;
        }
        // fall + sway + spin
        l.y += l.fall * dt;
        l.phase += l.swayFreq * dt;
        l.rot += l.rotSpeed * dt;
        if (l.kick !== 0) {
          l.baseX += l.kick * dt;
          l.kick *= Math.max(0, 1 - dt * 3); // decay the tap impulse
          if (Math.abs(l.kick) < 2) l.kick = 0;
        }
        let scale = 1;
        let op = 0.62;
        if (l.poof > 0) {
          l.poof = Math.max(0, l.poof - dt);
          const p = 1 - l.poof / 0.5; // 0..1
          scale = 1 + 0.42 * Math.sin(p * Math.PI);
          op = 0.62 + 0.3 * Math.sin(p * Math.PI);
        }
        const x = l.baseX + Math.sin(l.phase) * l.swayAmp;

        // Off the bottom: settle into the footer pile if near it, else respawn.
        if (l.y > height + 30) {
          if (SETTLE_PILE && nearBottom && pileUsed < PILE_CAP) {
            l.landed = true;
            capturePileLeaf(x, l.el.style.color, l.size);
            l.el.style.opacity = "0";
            window.setTimeout(() => spawn(l, false), 400); // recycle the faller
            continue;
          }
          spawn(l, false);
          continue;
        }
        l.el.style.opacity = String(op);
        l.el.style.transform = `translate3d(${x}px, ${l.y}px, 0) rotate(${l.rot}deg) scale(${scale})`;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", recomputeRange);
      window.removeEventListener("resize", recomputeRange);
      cleanups.forEach((c) => c());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COUNT, PILE_CAP, isMobile]);

  return (
    <>
      <div
        ref={wrapRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden opacity-0 transition-opacity duration-700 ease-out"
      >
        {Array.from({ length: COUNT }).map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              leafRefs.current[i] = el;
            }}
            className="pointer-events-none absolute left-0 top-0 block cursor-pointer opacity-0 will-change-transform"
            style={{ touchAction: "manipulation" }}
          >
            <LeafGlyph />
          </span>
        ))}
      </div>

      {SETTLE_PILE && (
        <div
          ref={pileWrapRef}
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-24 overflow-hidden opacity-0 transition-opacity duration-500 ease-out"
        >
          {Array.from({ length: PILE_CAP }).map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                pileRefs.current[i] = el;
              }}
              className="absolute bottom-1 left-0 block opacity-0 will-change-transform"
            >
              <LeafGlyph />
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/** A small leaf, echoing the brand's leaf vocabulary (a soft blade + a vein). */
function LeafGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden className="block">
      <path
        d="M20 4C10 4 4 10 4 20c0 0 6-1 10-5s6-11 6-11Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M17 7C12 9 8 13 6 18"
        stroke="var(--color-paper)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
