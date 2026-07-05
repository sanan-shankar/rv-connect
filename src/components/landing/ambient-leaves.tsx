"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionGovernor } from "@/components/common/motion";

/* ------------------------------------------------------------------ *
 *  AmbientLeaves — a fixed, full-viewport layer of falling leaves that
 *  lives across the whole lower page (below the hero, through every
 *  screenshot, down to the footer).
 *
 *  Design notes:
 *  - Cheap by construction: a pool of DOM sprites driven by ONE rAF
 *    loop that mutates `transform`/`opacity` imperatively via refs (no
 *    per-frame React re-render). Only transform + opacity animate.
 *  - Full, not sparse: a bigger pool than the original pass, kept from
 *    reading as a storm by the SAME staggered per-leaf rest-gap cadence
 *    (see COUNT/wait tuning below) — the cadence logic is untouched,
 *    only the pool size, sizing and palette were dialed up.
 *  - Three glyph "species" (a broad blade, a round leaf, a slim willow
 *    leaf) plus a wider size range and a warmer, brighter, more
 *    yellow-leaning palette read as real variety, not a repeated sprite.
 *  - Clearly interactive: cursor affordance while the layer is live, a
 *    hover brighten-and-lift (mouse), and a tap puff + spin (touch or
 *    click) — all transform/opacity, smoothed per-frame, no CSS
 *    transition/filter animation.
 *  - Fades in only once the hero is scrolled past, so the photo hero
 *    stays pristine, and pauses entirely when off-range or tab hidden.
 *  - Footer drift: while the footer is in view, a fuller, capped pile
 *    of leaves settles along the bottom edge (oldest fade when capped).
 *  - Motion always plays (design system): no prefers-reduced-motion.
 *  - SSR-safe: the pool size is a stable desktop default on the server
 *    and first client render; the phone-lighter density only takes over
 *    after mount (no hydration mismatch).
 * ------------------------------------------------------------------ */

// Brightened + more saturated pass: canopy's near-black green disappeared
// against the warm #EDE7DA/#F6F2E8 background, so it's dropped in favour of
// doubled weight on lit leaf-green and a punchier cinnamon, keeping the golds
// for variety. Still natural, autumn-leaf hues — no saturated primaries.
const LEAF_TINTS = [
  "var(--color-leaf-light)", // vivid lit green, the highest-contrast pop
  "var(--color-leaf-light)",
  "var(--color-leaf)",
  "#E0672A", // bright cinnamon-orange, more saturated than the base accent
  "#E0672A",
  "var(--color-cinnamon)",
  "#C79318", // marigold
  "#EDB730", // bright gold
  "#EDB730", // bright gold (extra weight)
  "#F2C94C", // lemon-gold pop
  "#DB8A2A", // warm amber-orange
];

// Footer-pile-only palette: a narrower, warmer band (mostly cinnamon/gold,
// one green pop for contrast) so the settled drift reads as a single autumn
// mass rather than the full mixed drift palette above.
const PILE_TINTS = [
  "#E0672A",
  "#E0672A",
  "var(--color-cinnamon)",
  "#EDB730",
  "#F2C94C",
  "#DB8A2A",
  "var(--color-leaf-light)",
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
  hoverOn: boolean; // pointer is currently over this leaf
  hoverT: number; // smoothed 0..1 hover boost (brighten + lift)
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
  // Doubled again this pass (previous pool still read as sparse singles) —
  // the SAME staggered rest-gap cadence as before (unchanged below) keeps it
  // full without turning into a downpour.
  const COUNT = isMobile ? 20 : 40;
  const PILE_CAP = isMobile ? 12 : 16;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    // A real footer pile, not a few floating singles.
    const PILE_TARGET = isMobile ? 10 : 14;
    // Raised again: leaves need to register as foliage, not specks — mobile
    // stays a touch smaller than desktop so taps stay easy.
    const sizeMin = isMobile ? 20 : 24;
    const sizeSpread = 16;

    // Seed the falling pool with randomized physics, staggered above the top.
    // Two different rest-gap regimes: a short one for each leaf's very first
    // (pre-activation) spawn, so the pool cascades into view quickly once the
    // layer activates, and a longer steady-state one between subsequent falls
    // so the pool settles into a full-but-not-a-downpour handful visible at once.
    const spawn = (l: Leaf, initial: boolean) => {
      l.size = sizeMin + Math.random() * sizeSpread;
      l.baseX = Math.random() * vw();
      l.y = -40 - Math.random() * (initial ? vh() * 0.4 : 120);
      l.fall = 22 + Math.random() * 28; // slow drift
      l.swayAmp = 14 + Math.random() * 32;
      l.swayFreq = 0.5 + Math.random() * 0.7;
      l.phase = Math.random() * Math.PI * 2;
      l.rot = Math.random() * 360;
      l.rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 38);
      l.wait = initial
        ? Math.random() * (isMobile ? 1.5 : 2) // brief cold-start stagger (activation seeding covers instant visibility)
        : isMobile
          ? 7 + Math.random() * 16 // steady-state rest gap between falls
          : 10 + Math.random() * 22;
      l.poof = 0;
      l.kick = 0;
      l.landed = false;
      l.hoverOn = false;
      l.hoverT = 0;
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
        hoverOn: false,
        hoverT: 0,
      };
      spawn(l, true);
      return l;
    });

    // Tap handling: a bigger puff + spin, then it keeps drifting. Bound on each
    // sprite (which owns pointer events) so the rest of the layer stays click-through.
    const onTap = (i: number) => (e: Event) => {
      e.stopPropagation();
      const l = leaves[i];
      if (!l || l.landed) return;
      l.poof = 0.5;
      l.kick = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 60);
      l.rotSpeed += (l.rotSpeed >= 0 ? 1 : -1) * 260;
    };
    // Hover: brighten + lift while the pointer is over a leaf (mouse only,
    // in practice — touch fires its own tap puff instead). Smoothed toward
    // its target in the tick loop below; still transform/opacity only.
    const onHoverOn = (i: number) => () => {
      const l = leaves[i];
      if (l && !l.landed) l.hoverOn = true;
    };
    const onHoverOff = (i: number) => () => {
      const l = leaves[i];
      if (l) l.hoverOn = false;
    };
    const cleanups = leaves.map((l, i) => {
      if (!l.el) return () => {};
      const down = onTap(i);
      const enter = onHoverOn(i);
      const leave = onHoverOff(i);
      l.el.addEventListener("pointerdown", down);
      l.el.addEventListener("pointerenter", enter);
      l.el.addEventListener("pointerleave", leave);
      return () => {
        l.el?.removeEventListener("pointerdown", down);
        l.el?.removeEventListener("pointerenter", enter);
        l.el?.removeEventListener("pointerleave", leave);
      };
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
      const rot = -45 + Math.random() * 90;
      // Deeper vertical scatter (not all pinned to one exact edge) so the
      // pile reads as an overlapping drift that collected, not a row of stickers.
      p.el.style.bottom = `${2 + Math.random() * 22}px`;
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
        p.el.style.opacity = "0.88";
      });
    };

    // Instant cluster: the moment the footer scrolls into view, drop a dense
    // overlapping pile straight away (the organic drip below keeps topping it
    // up as more leaves fall through), instead of the pile trickling in from a
    // few stray leaves over several seconds.
    const seedFooterPile = () => {
      const width = vw();
      const n = Math.min(PILE_TARGET, PILE_CAP);
      for (let i = 0; i < n; i++) {
        const seg = width / n;
        const x = seg * i + Math.random() * seg * 0.9;
        const size = sizeMin + Math.random() * sizeSpread;
        const tint = PILE_TINTS[Math.floor(Math.random() * PILE_TINTS.length)];
        window.setTimeout(() => capturePileLeaf(x, tint, size), i * 30);
      }
    };

    // Section-seam sparkle: 2-3 extra leaves burst into view right where a
    // Mist band meets the plain background (the ".bg-mist" full-bleed rows
    // from src/app/page.tsx's Band component), so alternating sections feel
    // alive at the handoff instead of static. Seams recomputed on resize
    // since reflow moves them.
    let seamYs: number[] = [];
    let seamSeeded: boolean[] = [];
    const computeSeams = () => {
      const els = document.querySelectorAll<HTMLElement>(".bg-mist");
      const ys = new Set<number>();
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        ys.add(Math.round(r.top + window.scrollY));
        ys.add(Math.round(r.bottom + window.scrollY));
      });
      seamYs = Array.from(ys).sort((a, b) => a - b);
      seamSeeded = seamYs.map(() => false);
    };
    const burstAtSeam = (viewportY: number) => {
      const pool = leaves.filter((l) => !l.landed);
      const n = Math.min(pool.length, 2 + Math.floor(Math.random() * 2)); // 2-3
      for (let k = 0; k < n; k++) {
        const idx = Math.floor(Math.random() * pool.length);
        const l = pool.splice(idx, 1)[0];
        l.wait = 0;
        l.y = viewportY + (Math.random() * 30 - 15);
        l.baseX = vw() * (0.12 + Math.random() * 0.76);
        l.phase = Math.random() * Math.PI * 2;
        if (l.el) l.el.style.color = LEAF_TINTS[Math.floor(Math.random() * LEAF_TINTS.length)];
      }
    };
    computeSeams();
    window.addEventListener("load", computeSeams);

    // On first activation, drop a handful of leaves straight into the viewport
    // at varied heights/phases, as if their fall were already in progress —
    // otherwise every leaf starts above the fold and the first ones take
    // 15-40s to drift down, reading as an empty layer.
    let hasSeededView = false;
    const seedIntoView = () => {
      const n = Math.min(leaves.length, isMobile ? 5 : 9);
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
    let hasSeededPile = false;
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
      if (SETTLE_PILE && nearBottom && !hasSeededPile) {
        hasSeededPile = true;
        seedFooterPile();
      }
      if (active) {
        const vTop = window.scrollY;
        const vBot = vTop + vh();
        seamYs.forEach((sy, i) => {
          if (!seamSeeded[i] && sy > vTop + 40 && sy < vBot - 40) {
            seamSeeded[i] = true;
            burstAtSeam(sy - vTop);
          }
        });
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
    const onResize = () => {
      computeSeams(); // reflow can move the band boundaries
      recomputeRange();
    };
    window.addEventListener("resize", onResize, { passive: true });

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
        if (pileDrip > 0.4 && pileUsed < PILE_TARGET) {
          pileDrip = 0;
          const size = sizeMin + Math.random() * sizeSpread;
          capturePileLeaf(Math.random() * vw(), PILE_TINTS[Math.floor(Math.random() * PILE_TINTS.length)], size);
        }
      }

      const height = vh();
      // Higher = a snappier hover response; still eased per-frame (never a jump-cut).
      const hoverRate = 12;
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
        // Smoothed hover boost toward its on/off target — brighten + lift on
        // mouseover, transform/opacity only, eased so it never snaps.
        l.hoverT += ((l.hoverOn ? 1 : 0) - l.hoverT) * Math.min(1, dt * hoverRate);

        let scale = 1 + l.hoverT * 0.2;
        let op = 0.82 + l.hoverT * 0.18;
        const lift = l.hoverT * 9; // px risen while hovered
        if (l.poof > 0) {
          l.poof = Math.max(0, l.poof - dt);
          const p = 1 - l.poof / 0.5; // 0..1
          scale += 0.5 * Math.sin(p * Math.PI);
          op += 0.32 * Math.sin(p * Math.PI);
        }
        const x = l.baseX + Math.sin(l.phase) * l.swayAmp;

        // Off the bottom: settle into the footer pile if near it, else respawn.
        if (l.y > height + 30) {
          if (SETTLE_PILE && nearBottom && pileUsed < PILE_CAP) {
            l.landed = true;
            // Re-tint to the warm pile palette on landing (a falling leaf may
            // have been green mid-flight) so the settled drift stays autumnal.
            capturePileLeaf(x, PILE_TINTS[Math.floor(Math.random() * PILE_TINTS.length)], l.size);
            l.el.style.opacity = "0";
            window.setTimeout(() => spawn(l, false), 400); // recycle the faller
            continue;
          }
          spawn(l, false);
          continue;
        }
        l.el.style.opacity = String(Math.min(1, op));
        l.el.style.transform = `translate3d(${x}px, ${l.y - lift}px, 0) rotate(${l.rot}deg) scale(${scale})`;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", recomputeRange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", computeSeams);
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
            <LeafGlyph shape={LEAF_SHAPES[i % LEAF_SHAPES.length]} />
          </span>
        ))}
      </div>

      {SETTLE_PILE && (
        <div
          ref={pileWrapRef}
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-20 overflow-hidden opacity-0 transition-opacity duration-500 ease-out"
        >
          {Array.from({ length: PILE_CAP }).map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                pileRefs.current[i] = el;
              }}
              className="absolute bottom-1 left-0 block opacity-0 will-change-transform"
            >
              <LeafGlyph shape={LEAF_SHAPES[i % LEAF_SHAPES.length]} />
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/** Three glyph species so the drift reads as varied leaves, not one repeated
 * sprite — a broad blade, a round leaf, and a slim willow leaf. All share the
 * same soft, single-vein construction so they still read as one family. */
const LEAF_SHAPES = ["blade", "round", "slim"] as const;
type LeafShape = (typeof LEAF_SHAPES)[number];

function LeafGlyph({ shape }: { shape: LeafShape }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden className="block">
      {shape === "blade" && (
        <>
          <path d="M20 4C10 4 4 10 4 20c0 0 6-1 10-5s6-11 6-11Z" fill="currentColor" opacity="0.9" />
          <path
            d="M17 7C12 9 8 13 6 18"
            stroke="var(--color-paper)"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      )}
      {shape === "round" && (
        <>
          <path d="M12 3c5.5 0 8.5 3.8 8.5 9s-3 9-8.5 9-8.5-3.8-8.5-9 3-9 8.5-9Z" fill="currentColor" opacity="0.9" />
          <path d="M12 5v14" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        </>
      )}
      {shape === "slim" && (
        <>
          <path d="M12 2c3.4 4 3.4 16 0 20-3.4-4-3.4-16 0-20Z" fill="currentColor" opacity="0.9" />
          <path d="M12 4v16" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        </>
      )}
    </svg>
  );
}
