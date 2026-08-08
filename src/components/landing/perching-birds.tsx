"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionGovernor } from "@/components/common/motion";

/* ------------------------------------------------------------------ *
 *  PerchingBirds — small multicoloured birds that live on and around
 *  the showcase screenshot frames and move with believable hop physics.
 *
 *  Behaviour, per in-view frame:
 *  - A "top" bird perches on the frame's top edge (feet on the border,
 *    not floating above it) and rides it as you scroll.
 *  - A second "corner" bird stands just below the frame's bottom-left
 *    corner (clear of the screenshot itself, same as the top bird never
 *    overlapping it), so a frame with a bird on screen reads as a small
 *    flock (~2 birds) rather than one lonely speck.
 *  - A third "gap" bird hops in the open whitespace between two
 *    consecutive frames, when that gap is itself on screen — the
 *    valley's birds don't only sit on furniture.
 *  - From any perch a bird hops a few steps (parabolic arc +
 *    squash-stretch) within its own patch, pauses, and occasionally
 *    pecks/forages.
 *  - Top-edge birds, when two frames are on screen at once, will now
 *    and then travel from one to the other: a real chained-hop flight
 *    (the undulating up-down pattern small birds actually fly in),
 *    each leg a launch-arc that decelerates into its landing, arc
 *    height easing down leg over leg, ending in a spring-damped settle
 *    bounce. Never a straight-line teleport. Corner/gap birds stay
 *    local — they don't fly cross-page.
 *  - Never more than 5 birds (3 on phones); they only exist near the
 *    frames, and fade out when nothing relevant is on screen.
 *
 *  Cheap: ONE rAF loop, all frame rects read up front (no read/write
 *  thrash), transforms written imperatively via refs. Plumage is pushed
 *  as CSS custom properties on each bird's wrapper (no React re-render
 *  needed to change a bird's colouring on respawn). Gated on tab
 *  visibility + at least one frame in view. transform/opacity only.
 *  Motion always plays (design system): no prefers-reduced-motion.
 * ------------------------------------------------------------------ */

type State = "perch" | "hop" | "peck" | "travel" | "settle";

/** Where a bird's feet are anchored. "top"/"corner" ride a single
 *  frame's top or bottom border; "gap" hops in the open whitespace
 *  between two adjacent frames (shot + shot2). */
type Kind = "top" | "corner" | "gap";

type Bird = {
  el: HTMLSpanElement | null;
  size: number;
  colorIdx: number;
  kind: Kind;
  shot: number; // primary frame index, -1 = unassigned/hidden
  shot2: number; // second frame index for "gap" pairs, else -1
  fracMin: number; // hoppable range along this bird's own perch line
  fracMax: number;
  frac: number; // 0..1 position within [fracMin, fracMax]
  facing: 1 | -1;
  state: State;
  t: number; // elapsed in current state/leg (s)
  dur: number; // duration of the current timed state/leg (s)
  fromFrac: number;
  toFrac: number;
  fromShot: number; // travel source (top-kind only)
  toShot: number; // travel target
  toFrac2: number; // travel target frac
  hopsLeft: number;
  legIdx: number; // current leg within a multi-hop travel
  legsTotal: number;
  legH: [number, number, number]; // per-leg arc height (px)
  legDur: [number, number, number]; // per-leg duration (s)
  bob: number; // idle breathing phase
  opacity: number; // eased visibility
  visible: boolean; // target visibility
};

const HOP_H = 26; // on-frame hop arc height (px)
const TRAVEL_ARC_H = 42; // first travel-leg arc height (px), desktop
const TRAVEL_LEG_PX = 420; // ~px of travel distance before another leg is added
const SETTLE_DUR = 0.26; // spring-damped landing settle after the final leg (s)

/* Perch line geometry, shared by every anchor kind: the legs
   (`M13 23 L13 26 M17 23 L17 26`, stroke-width 1.1, round cap) are the
   lowest visual pixels in the glyph's own viewBox (0 0 32 32), bottoming
   out at y=26.55 local units — 32.97% of the box height below its
   vertical center (16). The glyph is drawn centered on (x, y) (drawX/
   drawY below subtract size/2), so to put its feet on a target line we
   place the icon's center FOOT_OFFSET*size ABOVE that line. FOOT_NUDGE
   then sinks the feet a couple of px past the line so they visibly bite
   into the frame's border stroke instead of floating a hair above it. */
const FOOT_OFFSET = 0.33;
const FOOT_NUDGE = 3;

/* Plumage set: six common Rishi Valley birds, each a real 2-3 tone
   combination (body, folded wing, breast/belly, head, bill) instead of a
   single flat silhouette colour. Where a species' body colour overlaps
   the brand palette we reuse the token (leaf, sky, cinnamon); the rest
   are literal tones picked to read clearly at ~24-28px against the warm
   paper background. */
type Plumage = { body: string; wing: string; breast: string; head: string; bill: string };

const SPECIES: Plumage[] = [
  // Purple Sunbird — glossy blackish body, mustard breast flash
  { body: "#33283F", wing: "#211A2B", breast: "#D9A73B", head: "#33283F", bill: "#1C1712" },
  // Rose-ringed Parakeet — natural grass green (dialed back from the flat
  // brand `--color-leaf` swatch, which read as plastic), deeper olive wing
  { body: "#6E9143", wing: "#4C6B2E", breast: "#D9EFB0", head: "#6E9143", bill: "var(--color-cinnamon)" },
  // White-throated Kingfisher — sky-blue back, chestnut head and breast
  { body: "var(--color-sky)", wing: "#2C5C7C", breast: "#8B4A2B", head: "#8B4A2B", bill: "#A6301F" },
  // Indian Grey Hornbill — soft grey body, cream breast, ochre bill
  { body: "#8B8378", wing: "#5C564B", breast: "#EDE6D6", head: "#8B8378", bill: "#D9A73B" },
  // Red-vented Bulbul — sooty body and head, white breast
  { body: "#3A332C", wing: "#221D18", breast: "#F3EFE3", head: "#221D18", bill: "#1C1712" },
  // Common Myna — warm brown body, black head, amber bill
  { body: "#7A5233", wing: "#4A3423", breast: "#E3D3B8", head: "#2B231C", bill: "#E8B23D" },
];

/** A single hop/perch/gap anchor: a horizontal line segment (x0..x0+width)
 *  at a fixed y, expressed in viewport pixels for this tick. */
type Anchor = { x0: number; width: number; y: number };

export function PerchingBirds() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const birdRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { paused } = useMotionGovernor();
  // Latest-value ref, written in an effect rather than during render. The rAF
  // loop below (and the scroll pump) read `pausedRef.current` from inside their
  // callbacks, never while rendering, so a value that lands one paint later is
  // invisible here: pausing is a frame-scale decision, not a layout one. It was
  // written during render until 2026-08-08, which React Compiler flags outright
  // (react-hooks/refs) because a render-phase ref write is not safe under
  // concurrent rendering.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // SSR-safe responsive count: desktop default until mount (no hydration mismatch).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // 2 birds per in-view showcase frame (top edge + bottom-left corner)
  // plus one that hops in the gap between frames.
  const COUNT = isMobile ? 3 : 5;
  const SIZE = isMobile ? 24 : 28;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const shots = () => Array.from(document.querySelectorAll<HTMLElement>("[data-shot]"));

    const birds: Bird[] = birdRefs.current.slice(0, COUNT).map((el, i) => ({
      el,
      size: SIZE,
      colorIdx: i % SPECIES.length,
      kind: "top",
      shot: -1,
      shot2: -1,
      fracMin: 0.08,
      fracMax: 0.92,
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
      legIdx: 0,
      legsTotal: 1,
      legH: [TRAVEL_ARC_H, TRAVEL_ARC_H * 0.62, TRAVEL_ARC_H * 0.4],
      legDur: [0.34, 0.42, 0.5],
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

    /** A frame's top-edge perch line, for both ordinary top perching and
     *  cross-frame travel (which only ever moves between top perches). */
    const topAnchorFor = (shot: number, size: number, rects: DOMRect[]): Anchor | null => {
      const r = rects[shot];
      if (!r) return null;
      return { x0: r.left, width: r.width, y: r.top - size * FOOT_OFFSET + FOOT_NUDGE };
    };

    /** Resolve any bird's current anchor line from live rects. */
    const anchorFor = (b: Bird, rects: DOMRect[]): Anchor | null => {
      if (b.kind === "gap") {
        const rA = rects[b.shot];
        const rB = rects[b.shot2];
        if (!rA || !rB) return null;
        const midY = (rA.bottom + rB.top) / 2;
        const cx = (rA.left + rA.right + rB.left + rB.right) / 4;
        const width = Math.max(60, Math.min(rA.width, rB.width) * 0.4);
        return { x0: cx - width / 2, width, y: midY - b.size * FOOT_OFFSET };
      }
      const r = rects[b.shot];
      if (!r) return null;
      if (b.kind === "corner") {
        // Stands just below the frame's bottom-left corner, in the same
        // whitespace gap a "gap" bird hops in — clear of the screenshot
        // itself (mirrors the top perch, which never overlaps the frame
        // either), tall enough to still read as tucked right against it.
        const groundGap = b.size * 0.62 + 2;
        return { x0: r.left, width: r.width, y: r.bottom + groundGap - b.size * FOOT_OFFSET };
      }
      return { x0: r.left, width: r.width, y: r.top - b.size * FOOT_OFFSET + FOOT_NUDGE };
    };

    const startHop = (b: Bird) => {
      // step a relative fraction of THIS bird's own hoppable range, so a
      // corner/gap bird's tighter patch still reads as normal-sized hops
      // rather than instantly slamming into its bounds.
      const range = b.fracMax - b.fracMin;
      const step = range * (0.14 + Math.random() * 0.16);
      let to = b.frac + b.facing * step;
      if (to > b.fracMax) {
        b.facing = -1;
        to = b.frac - step;
      } else if (to < b.fracMin) {
        b.facing = 1;
        to = b.frac + step;
      }
      b.fromFrac = b.frac;
      b.toFrac = Math.max(b.fracMin, Math.min(b.fracMax, to));
      b.state = "hop";
      b.t = 0;
      b.dur = 0.42;
    };

    // Chain a real hop-flight from the current top perch to another
    // in-view frame's top perch. Long distances get more (shorter, lower)
    // legs — the same undulating up-down pattern small birds actually use
    // to cover ground — instead of one giant swoop, ending in a
    // spring-damped settle on arrival.
    const startTravel = (b: Bird, toShot: number, toFrac2: number, rects: DOMRect[]) => {
      const aF = topAnchorFor(b.shot, b.size, rects);
      const aT = topAnchorFor(toShot, b.size, rects);
      if (!aF || !aT) return;
      const x0 = aF.x0 + b.frac * aF.width;
      const y0 = aF.y;
      const x1 = aT.x0 + toFrac2 * aT.width;
      const y1 = aT.y;
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const legs = (dist < TRAVEL_LEG_PX ? 1 : dist < TRAVEL_LEG_PX * 2 ? 2 : 3) as 1 | 2 | 3;

      b.fromShot = b.shot;
      b.toShot = toShot;
      b.toFrac2 = toFrac2;
      b.legsTotal = legs;
      b.legIdx = 0;
      b.legH = [TRAVEL_ARC_H, TRAVEL_ARC_H * 0.62, TRAVEL_ARC_H * 0.4];
      b.legDur = [0.34, 0.42, 0.5];
      b.facing = x1 >= x0 ? 1 : -1;
      b.state = "travel";
      b.t = 0;
      b.dur = b.legDur[0];
    };

    const decideFromPerch = (b: Bird, topFrames: number[], rects: DOMRect[]) => {
      if (b.kind === "top") {
        const roll = Math.random();
        // occasional flight to a different in-view frame's top perch,
        // skipping any frame another top bird already occupies
        const neighbours = topFrames.filter(
          (s) => s !== b.shot && !birds.some((o) => o !== b && o.visible && o.kind === "top" && o.shot === s),
        );
        if (roll < 0.2 && neighbours.length > 0) {
          const target = neighbours[Math.floor(Math.random() * neighbours.length)];
          const targetFrac = 0.3 + Math.random() * 0.4;
          startTravel(b, target, targetFrac, rects);
          return;
        }
        if (roll < 0.46) {
          b.state = "peck";
          b.t = 0;
          b.dur = 0.72;
          return;
        }
        if (Math.random() < 0.25) b.facing = (b.facing * -1) as 1 | -1;
        b.hopsLeft = 1 + Math.floor(Math.random() * 3);
        startHop(b);
        return;
      }
      // corner/gap birds stay local: hop or peck within their own patch,
      // never fly cross-page
      const roll = Math.random();
      if (roll < 0.5) {
        b.state = "peck";
        b.t = 0;
        b.dur = 0.72;
        return;
      }
      if (Math.random() < 0.25) b.facing = (b.facing * -1) as 1 | -1;
      b.hopsLeft = 1 + Math.floor(Math.random() * 2);
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
      const vh = window.innerHeight;
      const inView = inViewShots(rects);

      // up to 2 frames get the full "top perch + corner perch" treatment
      const topFrames = inView.slice(0, 2);

      // one hopping bird in the open whitespace between two consecutive
      // frames, only when that midpoint is itself on screen
      let gapSlot: { shot: number; shot2: number } | null = null;
      for (let i = 0; i < rects.length - 1; i++) {
        const ra = rects[i];
        const rb = rects[i + 1];
        if (ra.width === 0 || rb.width === 0) continue;
        if (rb.top <= ra.bottom) continue;
        const midY = (ra.bottom + rb.top) / 2;
        if (midY > 40 && midY < vh - 40) {
          gapSlot = { shot: i, shot2: i + 1 };
          break;
        }
      }

      type NeededSlot = { kind: Kind; shot: number; shot2: number; fracMin: number; fracMax: number };
      const needed: NeededSlot[] = [];
      for (const s of topFrames) {
        needed.push({ kind: "top", shot: s, shot2: -1, fracMin: 0.08, fracMax: 0.92 });
        needed.push({ kind: "corner", shot: s, shot2: -1, fracMin: 0.03, fracMax: 0.2 });
      }
      if (gapSlot) needed.push({ kind: "gap", shot: gapSlot.shot, shot2: gapSlot.shot2, fracMin: 0.15, fracMax: 0.85 });

      const key = (k: Kind, s: number, s2: number) => `${k}:${s}:${s2}`;
      const claimed = new Set<string>();

      // pass 1: birds already sitting on a slot that's still needed keep it
      for (const b of birds) {
        const k = key(b.kind, b.shot, b.shot2);
        if (needed.some((n) => key(n.kind, n.shot, n.shot2) === k) && !claimed.has(k)) {
          claimed.add(k);
          b.visible = true;
        } else {
          b.visible = false; // provisional: pass 2 may re-claim a fresh slot
        }
      }

      // pass 2: birds without a live slot take the first unclaimed one
      for (const b of birds) {
        if (b.visible) continue;
        const slot = needed.find((n) => !claimed.has(key(n.kind, n.shot, n.shot2)));
        if (!slot) continue; // fewer slots than birds this tick: stays hidden
        claimed.add(key(slot.kind, slot.shot, slot.shot2));
        b.kind = slot.kind;
        b.shot = slot.shot;
        b.shot2 = slot.shot2;
        b.fracMin = slot.fracMin;
        b.fracMax = slot.fracMax;
        b.frac = slot.fracMin + (0.2 + Math.random() * 0.6) * (slot.fracMax - slot.fracMin);
        b.facing = Math.random() < 0.5 ? 1 : -1;
        b.state = "perch";
        b.t = 0;
        b.dur = 0.6 + Math.random() * 1.2;
        b.opacity = 0; // fade in fresh
        b.visible = true;

        // freshly-spawned bird gets new plumage, avoiding a colour another
        // currently-visible bird is already wearing
        const taken = new Set(birds.filter((o) => o !== b && o.visible).map((o) => o.colorIdx));
        let idx = Math.floor(Math.random() * SPECIES.length);
        if (taken.size < SPECIES.length) {
          let tries = 0;
          while (taken.has(idx) && tries < 6) {
            idx = Math.floor(Math.random() * SPECIES.length);
            tries++;
          }
        }
        b.colorIdx = idx;
        if (b.el) {
          const c = SPECIES[idx];
          b.el.style.setProperty("--bird-body", c.body);
          b.el.style.setProperty("--bird-wing", c.wing);
          b.el.style.setProperty("--bird-breast", c.breast);
          b.el.style.setProperty("--bird-head", c.head);
          b.el.style.setProperty("--bird-bill", c.bill);
        }
      }

      // --- advance state machines + write transforms ---
      for (const b of birds) {
        if (!b.el) continue;
        // visibility ease
        b.opacity += ((b.visible ? 1 : 0) - b.opacity) * Math.min(1, dt * 8);
        const anchor = b.visible ? anchorFor(b, rects) : null;
        if (!anchor) {
          b.el.style.opacity = b.opacity < 0.02 ? "0" : String(b.opacity);
          continue;
        }

        b.t += dt;
        b.bob += dt * 2.4;

        let x = 0;
        let y = 0;
        let sx = 1;
        let sy = 1;
        let tilt = 0;

        if (b.state === "perch") {
          x = anchor.x0 + b.frac * anchor.width;
          y = anchor.y + Math.sin(b.bob) * 0.6; // faint breathing
          sy = 1 + Math.sin(b.bob) * 0.02;
          if (b.t >= b.dur) decideFromPerch(b, topFrames, rects);
        } else if (b.state === "hop") {
          const p = Math.min(1, b.t / b.dur);
          b.frac = b.fromFrac + (b.toFrac - b.fromFrac) * p;
          x = anchor.x0 + b.frac * anchor.width;
          y = anchor.y - HOP_H * 4 * p * (1 - p);
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
          x = anchor.x0 + b.frac * anchor.width;
          const p = Math.min(1, b.t / b.dur);
          const local = (p * 2) % 1; // two pecks
          const dip = Math.sin(local * Math.PI);
          y = anchor.y + dip * 2.5;
          tilt = b.facing * 20 * dip; // beak dips toward the edge
          sy = 1 - 0.04 * dip;
          if (p >= 1) {
            b.state = "perch";
            b.t = 0;
            b.dur = 0.7 + Math.random() * 1.4;
          }
        } else if (b.state === "travel") {
          // A chained hop-flight (top-kind birds only): the straight line
          // from launch point to landing point is cut into `legsTotal`
          // timed legs, each with its own arc height/duration (both ease
          // down leg over leg — the bird flies highest and fastest out of
          // the gate, then comes down and slows as it nears the
          // destination). Endpoints are re-measured from live rects every
          // tick, so scrolling mid-flight never causes a jump.
          const p = Math.min(1, b.t / b.dur);
          const legs = b.legsTotal;
          const aF = anchor; // b.kind is "top" here, so this IS the from-anchor
          const aT = topAnchorFor(b.toShot, b.size, rects) ?? aF;
          const x0 = aF.x0 + b.frac * aF.width;
          const y0 = aF.y;
          const x1 = aT.x0 + b.toFrac2 * aT.width;
          const y1 = aT.y;
          const legEase = p * p * (3 - 2 * p); // smoothstep
          const sStart = b.legIdx / legs;
          const sEnd = (b.legIdx + 1) / legs;
          const s = sStart + (sEnd - sStart) * legEase;
          x = x0 + (x1 - x0) * s;
          y = y0 + (y1 - y0) * s - b.legH[b.legIdx] * 4 * p * (1 - p);
          sy = 1 + 0.12 * Math.sin(p * Math.PI); // wingbeat per leg
          sx = 1 - 0.07 * Math.sin(p * Math.PI);
          tilt = b.facing * 10 * Math.sin(p * Math.PI);
          if (p >= 1) {
            b.legIdx += 1;
            if (b.legIdx < b.legsTotal) {
              b.t = 0;
              b.dur = b.legDur[b.legIdx];
            } else {
              b.shot = b.toShot;
              b.frac = b.toFrac2;
              b.state = "settle";
              b.t = 0;
              b.dur = SETTLE_DUR;
            }
          }
        } else if (b.state === "settle") {
          // Spring-damped landing: a quick decaying bounce that blends into
          // the ordinary perch breathing once it has died out.
          const p = Math.min(1, b.t / b.dur);
          const decay = Math.exp(-p * 7);
          const osc = Math.sin(p * Math.PI * 2.4) * decay;
          x = anchor.x0 + b.frac * anchor.width;
          y = anchor.y - osc * 3;
          sy = 1 + osc * 0.16;
          sx = 1 - osc * 0.1;
          if (p >= 1) {
            b.state = "perch";
            b.t = 0;
            b.dur = 0.7 + Math.random() * 1.6;
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
  }, [COUNT, SIZE]);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {Array.from({ length: COUNT }).map((_, i) => {
        const c = SPECIES[i % SPECIES.length];
        return (
          <span
            key={i}
            ref={(el) => {
              birdRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 block opacity-0 will-change-transform"
            style={
              {
                width: SIZE,
                height: SIZE,
                "--bird-body": c.body,
                "--bird-wing": c.wing,
                "--bird-breast": c.breast,
                "--bird-head": c.head,
                "--bird-bill": c.bill,
              } as React.CSSProperties
            }
          >
            <BirdGlyph />
          </span>
        );
      })}
    </div>
  );
}

/** A tiny perched bird: round body, head, bill, folded wing, breast patch,
    tail, two legs, and a soft contact shadow. Coloured entirely via the
    --bird-body/--bird-wing/--bird-breast/--bird-head/--bird-bill custom
    properties set on the wrapping span, so the physics loop can restyle a
    bird's plumage on respawn without a React re-render — each species
    reads as 2-3 real tones, not a flat silhouette. */
function BirdGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none" aria-hidden className="block">
      {/* soft contact shadow, drawn first so everything else sits on top */}
      <ellipse cx="15" cy="26.6" rx="6.5" ry="1.5" fill="#1A1408" opacity="0.14" />
      <ellipse cx="15" cy="26.6" rx="3.6" ry="0.9" fill="#1A1408" opacity="0.2" />
      {/* legs */}
      <path d="M13 23 L13 26 M17 23 L17 26" stroke="#5A4A38" strokeWidth="1.1" strokeLinecap="round" />
      {/* tail, a shade darker than the body */}
      <path d="M8 17 Q3 16 5 21 Q9 20 11 19 Z" fill="var(--bird-wing)" opacity="0.92" />
      {/* body */}
      <ellipse cx="15" cy="18" rx="8" ry="6" fill="var(--bird-body)" />
      {/* folded wing, a second tone over the body */}
      <path d="M10 16 Q15 15 19 18 Q15 20 11 19 Z" fill="var(--bird-wing)" opacity="0.9" />
      {/* breast/belly patch, a third contrasting tone */}
      <ellipse cx="18.4" cy="19.6" rx="3.6" ry="3" fill="var(--bird-breast)" />
      {/* head */}
      <circle cx="21" cy="12" r="4.6" fill="var(--bird-head)" />
      {/* bill */}
      <path d="M24.6 11.4 L29.2 10.4 L25 13.6 Z" fill="var(--bird-bill)" />
      {/* eye */}
      <circle cx="22" cy="11" r="0.95" fill="var(--color-paper)" />
      <circle cx="22.15" cy="11" r="0.38" fill="#1A1408" />
    </svg>
  );
}
