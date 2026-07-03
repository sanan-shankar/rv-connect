"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionGovernor } from "@/components/common/motion";

/* ------------------------------------------------------------------ *
 *  PerchingBirds — small birds that live on the top edges of the
 *  showcase screenshot frames and move with believable hop physics.
 *
 *  Behaviour (replaces the old "zipping" bird):
 *  - A bird perches on a frame's top edge and rides it as you scroll.
 *  - From a perch it hops a few steps (parabolic arc + subtle
 *    squash-stretch), pauses, and occasionally pecks/forages.
 *  - When two frames are on screen at once it will now and then
 *    hop-flit from one frame to a neighbouring one.
 *  - Never more than 2 birds (1 on phones); they only exist near the
 *    frames, and fade out when no frame's top edge is on screen.
 *
 *  Cheap: ONE rAF loop, all frame rects read up front (no read/write
 *  thrash), transforms written imperatively via refs. Gated on tab
 *  visibility + at least one frame in view. transform/opacity only.
 *  Motion always plays (design system): no prefers-reduced-motion.
 * ------------------------------------------------------------------ */

type State = "perch" | "hop" | "peck" | "flit";

type Bird = {
  el: HTMLSpanElement | null;
  size: number;
  shot: number; // index into the shot list, -1 = unassigned/hidden
  frac: number; // 0..1 position along the frame's top edge
  facing: 1 | -1;
  state: State;
  t: number; // elapsed in current state (s)
  dur: number; // duration of the current timed state (s)
  fromFrac: number;
  toFrac: number;
  fromShot: number; // flit source
  toShot: number; // flit target
  toFrac2: number; // flit target frac
  hopsLeft: number;
  bob: number; // idle breathing phase
  opacity: number; // eased visibility
  visible: boolean; // target visibility
};

const HOP_H = 26; // hop arc height (px)
const FLIT_H = 46; // flit arc height (px)

export function PerchingBirds() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const birdRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // SSR-safe responsive count: desktop default until mount (no hydration mismatch).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const COUNT = isMobile ? 1 : 2;
  const SIZE = isMobile ? 22 : 26;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const shots = () => Array.from(document.querySelectorAll<HTMLElement>("[data-shot]"));

    const birds: Bird[] = birdRefs.current.slice(0, COUNT).map((el) => ({
      el,
      size: SIZE,
      shot: -1,
      frac: 0.5,
      facing: 1,
      state: "perch",
      t: 0,
      dur: 1.2,
      fromFrac: 0.5,
      toFrac: 0.5,
      fromShot: -1,
      toShot: -1,
      toFrac2: 0.5,
      hopsLeft: 0,
      bob: Math.random() * Math.PI * 2,
      opacity: 0,
      visible: false,
    }));

    // Gate: run only when the tab is visible AND a frame is on screen.
    let anyInView = false;
    const els = shots();
    const io = new IntersectionObserver(
      () => {
        // recomputed precisely in the loop; this just wakes/sleeps the rAF
        const vh = window.innerHeight;
        anyInView = shots().some((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.top > 40 && r.top < vh - 40;
        });
        pump();
      },
      { threshold: [0, 0.01, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));

    // Perch line for a frame: y sits the bird's feet on the top border.
    const perchY = (r: DOMRect, b: Bird) => r.top - b.size * 0.82;
    const perchX = (r: DOMRect, frac: number) => r.left + frac * r.width;

    const inViewShots = (rects: DOMRect[]) => {
      const vh = window.innerHeight;
      const out: number[] = [];
      rects.forEach((r, i) => {
        if (r.width > 0 && r.top > 40 && r.top < vh - 40) out.push(i);
      });
      // most-centred first (top edge nearest the vertical middle)
      out.sort((a, b) => Math.abs(rects[a].top - vh / 2) - Math.abs(rects[b].top - vh / 2));
      return out;
    };

    const startHop = (b: Bird) => {
      // step ~10-18% of the frame width, flip at the edges
      const step = 0.1 + Math.random() * 0.08;
      let to = b.frac + b.facing * step;
      if (to > 0.9) {
        b.facing = -1;
        to = b.frac - step;
      } else if (to < 0.1) {
        b.facing = 1;
        to = b.frac + step;
      }
      b.fromFrac = b.frac;
      b.toFrac = Math.max(0.08, Math.min(0.92, to));
      b.state = "hop";
      b.t = 0;
      b.dur = 0.42;
    };

    const decideFromPerch = (b: Bird, inView: number[], otherShot: number) => {
      const roll = Math.random();
      // occasional flit to a different in-view frame (when one exists)
      const neighbours = inView.filter((s) => s !== b.shot && s !== otherShot);
      if (roll < 0.16 && neighbours.length > 0) {
        const target = neighbours[Math.floor(Math.random() * neighbours.length)];
        b.fromShot = b.shot;
        b.toShot = target;
        b.toFrac2 = 0.3 + Math.random() * 0.4;
        b.facing = target > b.shot ? 1 : -1;
        b.state = "flit";
        b.t = 0;
        b.dur = 0.72;
        return;
      }
      if (roll < 0.42) {
        // peck / forage
        b.state = "peck";
        b.t = 0;
        b.dur = 0.72;
        return;
      }
      // otherwise a little run of hops
      if (Math.random() < 0.25) b.facing = (b.facing * -1) as 1 | -1; // sometimes turn first
      b.hopsLeft = 1 + Math.floor(Math.random() * 3);
      startHop(b);
    };

    let raf = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current || !anyInView) {
        running = false;
        // ease all birds to hidden before we stop
        birds.forEach((b) => (b.visible = false));
        drawHidden();
        return;
      }
      raf = requestAnimationFrame(tick);

      // --- reads first (no interleaved writes) ---
      const els2 = shots();
      const rects = els2.map((el) => el.getBoundingClientRect());
      const inView = inViewShots(rects);

      // --- assignment: keep <=1 bird per in-view frame; hide extras ---
      for (let k = 0; k < birds.length; k++) {
        const b = birds[k];
        const other = birds[(k + 1) % birds.length];
        const otherShot = birds.length > 1 && other.visible ? other.shot : -1;

        if (inView.length === 0) {
          b.visible = false;
          continue;
        }
        // bird gets the k-th in-view frame (distinct where possible)
        const want = inView[Math.min(k, inView.length - 1)];
        const enoughFrames = inView.length > k;
        if (!enoughFrames && k > 0) {
          // fewer frames than birds: hide the surplus bird
          b.visible = false;
          continue;
        }
        if (b.shot === -1 || !inView.includes(b.shot)) {
          // (re)assign: its frame left view (or first spawn)
          const pick = inView.find((s) => s !== otherShot) ?? want;
          b.shot = pick;
          b.frac = 0.2 + Math.random() * 0.6;
          b.facing = Math.random() < 0.5 ? 1 : -1;
          b.state = "perch";
          b.t = 0;
          b.dur = 0.6 + Math.random() * 1.2;
          b.opacity = 0; // fade in fresh
        }
        b.visible = true;
      }

      // --- advance state machines + write transforms ---
      for (const b of birds) {
        if (!b.el) continue;
        // visibility ease
        b.opacity += ((b.visible ? 1 : 0) - b.opacity) * Math.min(1, dt * 8);
        if (!b.visible || b.shot < 0 || b.shot >= rects.length) {
          b.el.style.opacity = b.opacity < 0.02 ? "0" : String(b.opacity);
          continue;
        }

        b.t += dt;
        b.bob += dt * 2.4;
        const r = rects[b.shot];

        let x = 0;
        let y = 0;
        let sx = 1;
        let sy = 1;
        let tilt = 0;

        if (b.state === "perch") {
          b.frac = b.frac; // steady
          x = perchX(r, b.frac);
          y = perchY(r, b) + Math.sin(b.bob) * 0.6; // faint breathing
          sy = 1 + Math.sin(b.bob) * 0.02;
          if (b.t >= b.dur) decideFromPerch(b, inView, birds.length > 1 ? birds.find((o) => o !== b)?.shot ?? -1 : -1);
        } else if (b.state === "hop") {
          const p = Math.min(1, b.t / b.dur);
          b.frac = b.fromFrac + (b.toFrac - b.fromFrac) * p;
          x = perchX(r, b.frac);
          y = perchY(r, b) - HOP_H * 4 * p * (1 - p);
          // squash-stretch: crouch->launch, stretch mid-air, squash on landing
          if (p < 0.14) {
            const kk = p / 0.14;
            sy = 0.84 + 0.2 * kk;
            sx = 1.16 - 0.18 * kk;
          } else if (p > 0.86) {
            const kk = (p - 0.86) / 0.14;
            sy = 1.02 - 0.16 * kk;
            sx = 0.98 + 0.16 * kk;
          } else {
            const m = Math.sin(((p - 0.14) / 0.72) * Math.PI);
            sy = 1.04 + 0.1 * m;
            sx = 0.99 - 0.06 * m;
          }
          tilt = -b.facing * 5 * Math.sin(p * Math.PI);
          if (p >= 1) {
            b.frac = b.toFrac;
            if (--b.hopsLeft > 0) startHop(b);
            else {
              b.state = "perch";
              b.t = 0;
              b.dur = 0.7 + Math.random() * 1.6;
            }
          }
        } else if (b.state === "peck") {
          x = perchX(r, b.frac);
          const p = Math.min(1, b.t / b.dur);
          const local = (p * 2) % 1; // two pecks
          const dip = Math.sin(local * Math.PI);
          y = perchY(r, b) + dip * 2.5;
          tilt = b.facing * 20 * dip; // beak dips toward the edge
          sy = 1 - 0.04 * dip;
          if (p >= 1) {
            b.state = "perch";
            b.t = 0;
            b.dur = 0.7 + Math.random() * 1.4;
          }
        } else if (b.state === "flit") {
          const p = Math.min(1, b.t / b.dur);
          const ease = p * p * (3 - 2 * p); // smoothstep
          const rF = rects[b.fromShot] ?? r;
          const rT = rects[b.toShot] ?? r;
          const x0 = perchX(rF, b.frac);
          const y0 = perchY(rF, b);
          const x1 = perchX(rT, b.toFrac2);
          const y1 = perchY(rT, b);
          x = x0 + (x1 - x0) * ease;
          y = y0 + (y1 - y0) * ease - FLIT_H * 4 * p * (1 - p);
          sy = 1 + 0.12 * Math.sin(p * Math.PI * 6); // wing flap
          sx = 1 - 0.06 * Math.sin(p * Math.PI * 6);
          tilt = b.facing * 8 * Math.sin(p * Math.PI);
          if (p >= 1) {
            b.shot = b.toShot;
            b.frac = b.toFrac2;
            b.state = "perch";
            b.t = 0;
            b.dur = 0.6 + Math.random() * 1.2;
          }
        }

        const drawX = x - b.size / 2;
        const drawY = y - b.size / 2;
        b.el.style.opacity = String(b.opacity * 0.96);
        b.el.style.transform = `translate3d(${drawX}px, ${drawY}px, 0) rotate(${tilt}deg) scale(${b.facing * sx}, ${sy})`;
      }
    };

    const drawHidden = () => {
      birds.forEach((b) => {
        if (b.el) b.el.style.opacity = "0";
      });
    };

    const pump = () => {
      if (running || pausedRef.current || !anyInView) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // initial probe
    (() => {
      const vh = window.innerHeight;
      anyInView = shots().some((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.top > 40 && r.top < vh - 40;
      });
    })();
    const onScroll = () => pump();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    pump();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COUNT, SIZE]);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {Array.from({ length: COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            birdRefs.current[i] = el;
          }}
          className="absolute left-0 top-0 block opacity-0 will-change-transform"
          style={{ width: SIZE, height: SIZE }}
        >
          <BirdGlyph tint={i === 0 ? "var(--color-canopy)" : "#6E4326"} />
        </span>
      ))}
    </div>
  );
}

/** A tiny perched bird: round body, head, cinnamon bill, folded wing, two legs. */
function BirdGlyph({ tint }: { tint: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none" aria-hidden className="block" style={{ color: tint }}>
      {/* legs */}
      <path d="M13 23 L13 26 M17 23 L17 26" stroke="#5A4A38" strokeWidth="1.1" strokeLinecap="round" />
      {/* tail */}
      <path d="M8 17 Q3 16 5 21 Q9 20 11 19 Z" fill="currentColor" opacity="0.85" />
      {/* body */}
      <ellipse cx="15" cy="18" rx="8" ry="6" fill="currentColor" />
      {/* folded wing */}
      <path d="M10 16 Q15 15 19 18 Q15 20 11 19 Z" fill="#000" opacity="0.12" />
      {/* head */}
      <circle cx="21" cy="12" r="4.6" fill="currentColor" />
      {/* bill */}
      <path d="M24.6 11.4 L29.2 10.4 L25 13.6 Z" fill="var(--color-cinnamon)" />
      {/* eye */}
      <circle cx="22" cy="11" r="0.95" fill="var(--color-paper)" />
    </svg>
  );
}
