"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  Living-valley leaf field for the real landing. A hand-rolled
 *  canvas2D drift the cursor parts (smoothed pointer + inverse-square
 *  falloff, robust to wild motion), a scroll-velocity breeze,
 *  click-to-flick, and leaves that settle when the tab is hidden.
 *
 *  Owner FINAL tweak: every leaf is a FULL-BODIED leaf silhouette (a
 *  solid blade with a midrib and a few veins, slight curl and
 *  asymmetry). No abstract pinnate/fishbone sprigs. Variety comes from
 *  full-leaf SHAPES: peepal (heart with a long drip-tip), banyan (broad
 *  thick oval), a lance/mango shape, and a round one. The palette stays
 *  warm and INCLUDES a clearly yellow turning leaf, plus greens, amber,
 *  and cinnamon. Calm count by design.
 *
 *  Palette is keyed to the real app tokens (leaf #1F8A4C,
 *  cinnamon #C2622F) rather than the lab .delight vars.
 * ------------------------------------------------------------------ */

type Species = "peepal" | "banyan" | "lance" | "round";

// Warm valley palette. Two fills per swatch (lit face + shaded underside)
// so each leaf reads as a real curled surface, not a flat blob. One clearly
// yellow turning leaf, never two near-identical greens.
type Swatch = { lit: string; shade: string; vein: string };
const PALETTE: Swatch[] = [
  { lit: "#2E9E59", shade: "#1F8A4C", vein: "#176B3A" }, // leaf green (token)
  { lit: "#6FA86A", shade: "#54864F", vein: "#3C6A3A" }, // sage green
  { lit: "#E6B53C", shade: "#C8902A", vein: "#9C6E1E" }, // turning yellow
  { lit: "#D7873B", shade: "#B96A2A", vein: "#8E4E1E" }, // amber
  { lit: "#C2622F", shade: "#A24E24", vein: "#7C3A1A" }, // cinnamon (token)
];

const SPECIES: Species[] = ["peepal", "banyan", "lance", "round"];

export type Leaf = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  /** signed flatten of the silhouette, simulates the leaf turning edge-on */
  flutter: number;
  flutterSpeed: number;
  /** static curl of the blade (asymmetry), constant per leaf */
  curl: number;
  /** which way the asymmetric tip leans */
  lean: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  species: Species;
  sw: Swatch;
  /** seconds of flicked free-fall remaining */
  held: number;
  /** 0..1 settle factor: 1 = fully drifting, ~0.22 = parked on handoff */
  settle: number;
};

/* ---- silhouette painters (unit space, blade points up the -y axis) ---- *
 * Each draws ONE full leaf shape into the current transform at scale s,
 * with a midrib and a few lateral veins. `curl` skews one side so no leaf
 * is a perfect mirror. */

function midribAndVeins(
  ctx: CanvasRenderingContext2D,
  s: number,
  sw: Swatch,
  pairs: { t: number; spread: number; drop: number }[]
) {
  ctx.strokeStyle = sw.vein;
  ctx.globalAlpha *= 0.7;
  // midrib
  ctx.lineWidth = Math.max(0.6, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(0, s * 0.9);
  ctx.stroke();
  // lateral veins, angled toward the tip
  ctx.lineWidth = Math.max(0.4, s * 0.03);
  for (const p of pairs) {
    const y = -s + s * 1.9 * p.t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s * p.spread, y + s * p.drop);
    ctx.moveTo(0, y);
    ctx.lineTo(-s * p.spread, y + s * p.drop);
    ctx.stroke();
  }
  ctx.globalAlpha /= 0.7;
}

function paintBlade(
  ctx: CanvasRenderingContext2D,
  s: number,
  sw: Swatch,
  curl: number,
  lean: number,
  shape: (c: CanvasRenderingContext2D, s: number, curl: number) => void,
  veins: { t: number; spread: number; drop: number }[]
) {
  // Clip ONCE to the blade silhouette, then paint the lit face, the shaded
  // underside, and the veins all INSIDE that clip. The old shadeHalf clipped to
  // a RECTANGLE and filled it, so the shade bled past the leaf edge and read as a
  // faded box sitting on half the leaf. Bounding everything to the blade fixes it.
  ctx.save();
  ctx.beginPath();
  shape(ctx, s, curl);
  ctx.clip();

  // lit face across the whole blade
  ctx.fillStyle = sw.lit;
  ctx.fillRect(-s * 1.8, -s * 1.8, s * 3.6, s * 3.6);

  // shaded underside on the lean-side half, still inside the blade clip so it
  // follows the leaf's own silhouette rather than showing a rectangle
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = sw.shade;
  if (lean >= 0) ctx.fillRect(0, -s * 1.8, s * 1.8, s * 3.6);
  else ctx.fillRect(-s * 1.8, -s * 1.8, s * 1.8, s * 3.6);
  ctx.restore();

  // midrib + lateral veins, bounded by the same blade clip
  midribAndVeins(ctx, s, sw, veins);
  ctx.restore();
}

// peepal: rounded heart that tapers to a long drip-tip
function shapePeepal(ctx: CanvasRenderingContext2D, s: number, curl: number) {
  const w = s * (0.78 + curl * 0.12);
  ctx.moveTo(0, -s * 1.35); // drip tip
  ctx.quadraticCurveTo(w * 0.5, -s * 0.55, w, -s * 0.05);
  ctx.quadraticCurveTo(w * 0.95, s * 0.7, 0, s * 0.95); // round base lobe
  ctx.quadraticCurveTo(-w * 0.95, s * 0.7, -w * (1 - curl * 0.18), -s * 0.05);
  ctx.quadraticCurveTo(-w * 0.5, -s * 0.55, 0, -s * 1.35);
}

// banyan: broad thick oval, blunt tip
function shapeBanyan(ctx: CanvasRenderingContext2D, s: number, curl: number) {
  const w = s * (0.82 + curl * 0.1);
  ctx.moveTo(0, -s * 1.02);
  ctx.quadraticCurveTo(w, -s * 0.5, w * 0.96, s * 0.1);
  ctx.quadraticCurveTo(w * 0.7, s * 0.95, 0, s * 0.98);
  ctx.quadraticCurveTo(-w * 0.7, s * 0.95, -w * (0.96 - curl * 0.14), s * 0.1);
  ctx.quadraticCurveTo(-w, -s * 0.5, 0, -s * 1.02);
}

// lance / mango: a long full blade, widest below the middle, pointed tip
function shapeLance(ctx: CanvasRenderingContext2D, s: number, curl: number) {
  const w = s * (0.6 + curl * 0.12);
  ctx.moveTo(0, -s * 1.25); // tip
  ctx.quadraticCurveTo(w * 0.85, -s * 0.2, w * (1 - curl * 0.1), s * 0.4);
  ctx.quadraticCurveTo(w * 0.6, s * 0.95, 0, s * 1.05); // rounded base
  ctx.quadraticCurveTo(-w * 0.6, s * 0.95, -w, s * 0.4);
  ctx.quadraticCurveTo(-w * 0.85, -s * 0.2, 0, -s * 1.25);
}

// round: a near-circular full blade with a short tip
function shapeRound(ctx: CanvasRenderingContext2D, s: number, curl: number) {
  const w = s * (0.92 + curl * 0.08);
  ctx.moveTo(0, -s * 1.0);
  ctx.quadraticCurveTo(w * 1.02, -s * 0.62, w, s * 0.0);
  ctx.quadraticCurveTo(w * 0.92, s * 0.85, 0, s * 0.96);
  ctx.quadraticCurveTo(-w * 0.92, s * 0.85, -w * (1 - curl * 0.14), s * 0.0);
  ctx.quadraticCurveTo(-w * 1.02, -s * 0.62, 0, -s * 1.0);
}

function drawLeaf(ctx: CanvasRenderingContext2D, l: Leaf) {
  // never feed a non-finite value into a canvas transform op. A leaf whose
  // x/y/rot/size somehow went NaN (e.g. measured against a zero-size host
  // mid-navigation) is skipped this frame rather than corrupting the context.
  if (
    !Number.isFinite(l.x) ||
    !Number.isFinite(l.y) ||
    !Number.isFinite(l.rot) ||
    !Number.isFinite(l.size) ||
    !Number.isFinite(l.flutter) ||
    !Number.isFinite(l.settle)
  ) {
    return;
  }
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.rot);
  // flutter flattens the silhouette horizontally as the leaf turns edge-on
  const flat = 0.45 + 0.55 * Math.abs(Math.cos(l.flutter));
  ctx.scale(flat, 1);
  ctx.globalAlpha = 0.9 * (0.5 + 0.5 * l.settle) * (0.55 + 0.45 * flat);
  const s = l.size;
  switch (l.species) {
    case "peepal":
      paintBlade(ctx, s, l.sw, l.curl, l.lean, shapePeepal, [
        { t: 0.25, spread: 0.5, drop: 0.28 },
        { t: 0.45, spread: 0.62, drop: 0.26 },
        { t: 0.65, spread: 0.55, drop: 0.24 },
      ]);
      break;
    case "banyan":
      paintBlade(ctx, s, l.sw, l.curl, l.lean, shapeBanyan, [
        { t: 0.28, spread: 0.6, drop: 0.22 },
        { t: 0.5, spread: 0.66, drop: 0.2 },
        { t: 0.72, spread: 0.5, drop: 0.18 },
      ]);
      break;
    case "lance":
      paintBlade(ctx, s, l.sw, l.curl, l.lean, shapeLance, [
        { t: 0.3, spread: 0.44, drop: 0.3 },
        { t: 0.5, spread: 0.5, drop: 0.28 },
        { t: 0.7, spread: 0.4, drop: 0.26 },
      ]);
      break;
    case "round":
      paintBlade(ctx, s, l.sw, l.curl, l.lean, shapeRound, [
        { t: 0.3, spread: 0.66, drop: 0.18 },
        { t: 0.55, spread: 0.72, drop: 0.14 },
        { t: 0.78, spread: 0.52, drop: 0.12 },
      ]);
      break;
  }
  ctx.restore();
}

function makeSpawn(getW: () => number, getH: () => number) {
  return function spawn(atTop: boolean): Leaf {
    const w = getW();
    const h = getH();
    const species = SPECIES[(Math.random() * SPECIES.length) | 0];
    const sw = PALETTE[(Math.random() * PALETTE.length) | 0];
    // broad species a touch bigger, slim lance a touch smaller
    const base = species === "banyan" || species === "round" ? 11 : species === "lance" ? 8 : 9;
    return {
      x: Math.random() * w,
      y: atTop ? -24 - Math.random() * h * 0.5 : Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: 0.3 + Math.random() * 0.4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.012,
      size: base + Math.random() * 6,
      flutter: Math.random() * Math.PI * 2,
      flutterSpeed: 0.5 + Math.random() * 0.8,
      curl: (Math.random() - 0.5) * 0.7,
      lean: Math.random() < 0.5 ? -1 : 1,
      sway: 12 + Math.random() * 18,
      swaySpeed: 0.35 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      species,
      sw,
      held: 0,
      settle: 1,
    };
  };
}

/* The leaf field. Fills its host element, listens for pointer, scroll and
   tab-visibility. pointer-events on the canvas itself are owned by the parent
   section so birds and content stay clickable (see valley-section.tsx). */
export function ValleyLeaves() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: -9999, y: -9999, sx: -9999, sy: -9999, active: false });
  const scrollVel = useRef(0);
  const lastScroll = useRef(0);
  // a settle target the loop lerps toward, so handoff is a graceful glide, not a snap
  const settleTarget = useRef(1);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement as HTMLElement;
    let w = 0,
      h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const leaves: Leaf[] = [];
    const spawn = makeSpawn(
      () => w,
      () => h
    );

    function resize() {
      // host can report 0 (or, while detaching during navigation away, junk)
      // dimensions. Clamp to a finite, non-negative size so neither the canvas
      // backing store nor any leaf spawned from w/h can carry a NaN.
      const cw = host.clientWidth;
      const ch = host.clientHeight;
      w = Number.isFinite(cw) && cw > 0 ? cw : 0;
      h = Number.isFinite(ch) && ch > 0 ? ch : 0;
      canvas!.width = Math.max(0, Math.round(w * dpr));
      canvas!.height = Math.max(0, Math.round(h * dpr));
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // density scales with width, calm count
    const COUNT = Math.max(12, Math.min(26, Math.round(w / 52)));
    for (let i = 0; i < COUNT; i++) leaves.push(spawn(false));

    let raf = 0;
    let t = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // graceful settle glide toward target (1 drifting, ~0.22 parked)
      const settleNow = settleTarget.current;

      // lerp the pointer so wild moves never jitter the field
      const p = pointer.current;
      p.sx += (p.x - p.sx) * 0.12;
      p.sy += (p.y - p.sy) * 0.12;
      scrollVel.current *= 0.9; // breeze decays

      ctx!.clearRect(0, 0, w, h);
      for (const l of leaves) {
        l.settle += (settleNow - l.settle) * 0.06;
        const mv = l.settle; // motion multiplier
        // drift + sway + breeze
        l.x +=
          (l.vx +
            Math.sin(t * l.swaySpeed + l.phase) * (l.sway / 120) +
            scrollVel.current * 0.04) *
          mv;
        l.y += l.vy * mv;
        l.rot += (l.vr + scrollVel.current * 0.0007) * mv;
        l.flutter += l.flutterSpeed * dt * mv;
        // cursor parts the leaves (inverse-square falloff on the smoothed pointer).
        // The whole canvas receives this math, so the side gutters react too.
        if (p.active) {
          const dx = l.x - p.sx,
            dy = l.y - p.sy;
          const d2 = dx * dx + dy * dy;
          const R = 116;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / R;
            l.x += (dx / d) * f * f * 9;
            l.y += (dy / d) * f * f * 9;
            l.rot += f * 0.03 * Math.sign(dx || 1);
          }
        }
        if (l.held > 0) {
          l.held -= dt;
          l.x += l.vx * 6;
          l.y += l.vy * 6;
          l.vy += 0.15;
          l.rot += l.vr * 5;
        }
        // wrap
        if (l.y > h + 28) Object.assign(l, spawn(true));
        if (l.x < -34) l.x = w + 30;
        else if (l.x > w + 34) l.x = -30;
        drawLeaf(ctx!, l);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onMove = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left;
      pointer.current.y = e.clientY - r.top;
      pointer.current.active = true;
    };
    const onLeave = () => {
      pointer.current.active = false;
    };
    const onDown = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      const px = e.clientX - r.left,
        py = e.clientY - r.top;
      // flick: eject the nearest leaf in a small arc
      let best: Leaf | null = null,
        bd = 1e9;
      for (const l of leaves) {
        const dx = l.x - px,
          dy = l.y - py,
          d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = l;
        }
      }
      if (best && bd < 64 * 64) {
        best.vx = (best.x - px) * 0.06 + (Math.random() - 0.5);
        best.vy = -3 - Math.random() * 2;
        best.vr = (Math.random() - 0.5) * 0.18;
        best.held = 0.7;
      }
    };
    const onScroll = () => {
      const y = window.scrollY;
      scrollVel.current = Math.max(
        -30,
        Math.min(30, scrollVel.current + (y - lastScroll.current))
      );
      lastScroll.current = y;
    };
    // leaves settle when the tab is hidden, drift again on return (tab-visibility
    // pause is fine; we deliberately do NOT gate on prefers-reduced-motion).
    const onVis = () => {
      settleTarget.current = document.hidden ? 0.22 : 1;
    };

    // the canvas listens through pointer-events on itself; the parent makes the
    // canvas the only pointer surface, while content/birds sit above it.
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="vl-canvas" aria-hidden />;
}
