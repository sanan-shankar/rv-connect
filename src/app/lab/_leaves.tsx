"use client";

import { useEffect, useRef } from "react";
import { useValleyMotion } from "./_kit";

/* ------------------------------------------------------------------ *
 *  The living-valley leaf field. A hand-rolled canvas2D drift the
 *  cursor parts (smoothed pointer + inverse-square falloff), a
 *  scroll-velocity breeze, click-to-flick, and leaves that settle
 *  when the page hands off (tab hidden or reduced-motion toggle).
 *
 *  Leaves have real botanical character: a midrib plus lateral veins,
 *  per-leaf curl and asymmetry, gentle tumble, and five species
 *  silhouettes (neem pinnate, peepal heart-with-drip-tip, banyan broad
 *  oval, gulmohar feathery bipinnate, duranta small ovate) across a
 *  warm valley palette that INCLUDES a yellow turning leaf, not two
 *  greens. Calm and subtle by design.
 * ------------------------------------------------------------------ */

type Species = "neem" | "peepal" | "banyan" | "gulmohar" | "duranta";

// Warm valley palette. Two fills per swatch (lit face + shaded underside)
// so each leaf reads as a real curled surface, not a flat blob. One clearly
// yellow turning leaf, never two near-identical greens.
type Swatch = { lit: string; shade: string; vein: string };
const PALETTE: Swatch[] = [
  { lit: "#3F8F58", shade: "#2E6E43", vein: "#255A37" }, // leaf green
  { lit: "#6FA86A", shade: "#54864F", vein: "#3C6A3A" }, // sage green
  { lit: "#E6B53C", shade: "#C8902A", vein: "#9C6E1E" }, // turning yellow
  { lit: "#D7873B", shade: "#B96A2A", vein: "#8E4E1E" }, // amber
  { lit: "#C2622F", shade: "#A24E24", vein: "#7C3A1A" }, // cinnamon
];

const SPECIES: Species[] = ["neem", "peepal", "banyan", "gulmohar", "duranta"];

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
  /** 0..1 settle factor: 1 = fully drifting, 0 = parked on handoff */
  settle: number;
};

/* ---- silhouette painters (unit space, blade points up the -y axis) ---- *
 * Each draws ONE leaf shape into the current transform at scale s, with a
 * midrib and a few lateral veins. `curl` skews one side so no leaf is a
 * perfect mirror. All painters leave the path filled with `sw.lit` and the
 * shaded half overlaid, then stroke veins in `sw.vein`.                    */

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
    const y = -s + (s * 1.9) * p.t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s * p.spread, y + s * p.drop);
    ctx.moveTo(0, y);
    ctx.lineTo(-s * p.spread, y + s * p.drop);
    ctx.stroke();
  }
  ctx.globalAlpha /= 0.7;
}

function shadeHalf(ctx: CanvasRenderingContext2D, s: number, sw: Swatch, lean: number) {
  // overlay the shaded underside on the lean-side half so the blade looks curled
  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = sw.shade;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(0, s);
  ctx.lineTo(lean * s * 1.1, s);
  ctx.lineTo(lean * s * 1.1, -s);
  ctx.closePath();
  ctx.clip();
  ctx.fillRect(-s * 1.4, -s * 1.4, s * 2.8, s * 2.8);
  ctx.restore();
}

function paintSimpleBlade(
  ctx: CanvasRenderingContext2D,
  s: number,
  sw: Swatch,
  curl: number,
  lean: number,
  shape: (c: CanvasRenderingContext2D, s: number, curl: number) => void,
  veins: { t: number; spread: number; drop: number }[]
) {
  ctx.fillStyle = sw.lit;
  ctx.beginPath();
  shape(ctx, s, curl);
  ctx.fill();
  shadeHalf(ctx, s, sw, lean);
  // re-clip veins to the blade so they never spill outside the silhouette
  ctx.save();
  ctx.beginPath();
  shape(ctx, s, curl);
  ctx.clip();
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

// duranta: small slim ovate, pointed both ends
function shapeDuranta(ctx: CanvasRenderingContext2D, s: number, curl: number) {
  const w = s * (0.5 + curl * 0.1);
  ctx.moveTo(0, -s * 1.1);
  ctx.quadraticCurveTo(w, -s * 0.1, 0, s * 1.0);
  ctx.quadraticCurveTo(-w * (1 - curl * 0.2), -s * 0.1, 0, -s * 1.1);
}

// neem: pinnate, a rachis with many small curved leaflets in opposite pairs
function paintNeem(ctx: CanvasRenderingContext2D, s: number, sw: Swatch, lean: number) {
  ctx.strokeStyle = sw.vein;
  ctx.lineWidth = Math.max(0.6, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.15);
  ctx.lineTo(lean * s * 0.12, s * 0.95);
  ctx.stroke();
  const N = 5;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = -s * 1.0 + t * s * 1.85;
    const lx = lean * s * 0.12 * t;
    const lf = s * (0.42 - t * 0.16); // leaflets shrink toward the tip
    for (const dir of [1, -1]) {
      ctx.fillStyle = dir * lean > 0 ? sw.shade : sw.lit;
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.quadraticCurveTo(lx + dir * lf, y - lf * 0.25, lx + dir * lf * 1.15, y + lf * 0.55);
      ctx.quadraticCurveTo(lx + dir * lf * 0.4, y + lf * 0.5, lx, y);
      ctx.fill();
    }
  }
}

// gulmohar: feathery bipinnate, paired rows of tiny oval pinnules
function paintGulmohar(ctx: CanvasRenderingContext2D, s: number, sw: Swatch, lean: number) {
  ctx.strokeStyle = sw.vein;
  ctx.lineWidth = Math.max(0.5, s * 0.04);
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const ry = -s * 1.0 + (r / (rows - 1)) * s * 1.7;
    const rx = lean * s * 0.1 * (r / rows);
    const len = s * (0.66 - r * 0.06);
    for (const side of [1, -1]) {
      // pinna rachis
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + side * len, ry + len * 0.32);
      ctx.stroke();
      // tiny pinnules along it
      const P = 4;
      for (let p = 1; p <= P; p++) {
        const pt = p / P;
        const px = rx + side * len * pt;
        const py = ry + len * 0.32 * pt;
        const pr = s * 0.085;
        ctx.fillStyle = side * lean > 0 ? sw.shade : sw.lit;
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.4, pr * 0.8, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // central rachis on top
  ctx.strokeStyle = sw.vein;
  ctx.lineWidth = Math.max(0.6, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.1);
  ctx.lineTo(lean * s * 0.1, s * 0.9);
  ctx.stroke();
}

function drawLeaf(ctx: CanvasRenderingContext2D, l: Leaf) {
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
      paintSimpleBlade(ctx, s, l.sw, l.curl, l.lean, shapePeepal, [
        { t: 0.25, spread: 0.5, drop: 0.28 },
        { t: 0.45, spread: 0.62, drop: 0.26 },
        { t: 0.65, spread: 0.55, drop: 0.24 },
      ]);
      break;
    case "banyan":
      paintSimpleBlade(ctx, s, l.sw, l.curl, l.lean, shapeBanyan, [
        { t: 0.28, spread: 0.6, drop: 0.22 },
        { t: 0.5, spread: 0.66, drop: 0.2 },
        { t: 0.72, spread: 0.5, drop: 0.18 },
      ]);
      break;
    case "duranta":
      paintSimpleBlade(ctx, s, l.sw, l.curl, l.lean, shapeDuranta, [
        { t: 0.35, spread: 0.34, drop: 0.2 },
        { t: 0.6, spread: 0.3, drop: 0.18 },
      ]);
      break;
    case "neem":
      paintNeem(ctx, s, l.sw, l.lean);
      break;
    case "gulmohar":
      paintGulmohar(ctx, s, l.sw, l.lean);
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
    // compound species read smaller and lighter; broad species a touch bigger
    const base =
      species === "banyan" ? 11 : species === "neem" || species === "gulmohar" ? 9 : 8;
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

export function LeafCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { reduced, paused } = useValleyMotion();
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
      w = host.clientWidth;
      h = host.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // density scales with width, calm count
    const COUNT = Math.max(14, Math.min(30, Math.round(w / 46)));
    for (let i = 0; i < COUNT; i++) leaves.push(spawn(false));

    function paintAll() {
      ctx!.clearRect(0, 0, w, h);
      for (const l of leaves) drawLeaf(ctx!, l);
    }

    // reduced motion: one calm static frame settled in place, no loop
    if (reduced) {
      for (const l of leaves) l.settle = 0.6;
      paintAll();
      return () => ro.disconnect();
    }

    let raf = 0;
    let t = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // graceful settle glide toward target (1 drifting, ~0.25 parked)
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
          (l.vx + Math.sin(t * l.swaySpeed + l.phase) * (l.sway / 120) + scrollVel.current * 0.04) *
          mv;
        l.y += l.vy * mv;
        l.rot += (l.vr + scrollVel.current * 0.0007) * mv;
        l.flutter += l.flutterSpeed * dt * mv;
        // cursor parts the leaves (inverse-square falloff on the smoothed pointer).
        // The whole canvas receives this math now, so the side gutters react too,
        // not only the band above and below the content column.
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
      scrollVel.current = Math.max(-30, Math.min(30, scrollVel.current + (y - lastScroll.current)));
      lastScroll.current = y;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  // leaves settle on handoff: a hidden tab parks the field; returning lets it drift again.
  useEffect(() => {
    settleTarget.current = paused ? 0.22 : 1;
  }, [paused]);

  return <canvas ref={ref} className="dll-canvas" aria-hidden />;
}
