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
 *  - Three glyph "species" (a broad blade, an ovate leaf, a slim willow
 *    leaf) plus a wider size range and a warmer, brighter, more
 *    yellow-leaning palette read as real variety, not a repeated sprite.
 *  - Clearly interactive: a smooth, eased dodge away from the cursor while
 *    it is nearby (mouse only — no persistent pointer on touch), and a tap
 *    puff + spin + flick (touch or click) — all transform/opacity, smoothed
 *    per-frame, no CSS transition/filter animation.
 *  - Sits BEHIND the page's real content (headings, copy, screenshot
 *    frames, CTAs) and above the plain section backgrounds — see the
 *    z-0 note on the layer below.
 *  - Fades in only once the hero is scrolled past, so the photo hero
 *    stays pristine, and pauses entirely when off-range or tab hidden.
 *  - Footer drift: while the footer is in view, a fuller, capped pile
 *    of leaves settles along the bottom edge (oldest fade when capped).
 *  - Motion always plays (design system): no prefers-reduced-motion.
 *  - SSR-safe: the pool size is a stable desktop default on the server
 *    and first client render; the phone-lighter density only takes over
 *    after mount (no hydration mismatch).
 * ------------------------------------------------------------------ */

// Retuned off real foliage, not app-UI green: the brand `--color-leaf` /
// `--color-leaf-light` tokens are saturated brand swatches (one is iOS's
// system green) that read as plastic against drifting leaves, so the green
// slots use literal, desaturated olive/sap/moss tones instead — three
// distinct natural greens rather than two copies of one bright one. The
// warm cinnamon/gold/yellow weight the owner asked for stays untouched.
const LEAF_TINTS = [
  "#7C8F4E", // sap green, lit — the highest-contrast green pop, still muted
  "#5E7A3D", // mid olive green
  "#47592E", // deep moss green
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
// one natural green pop for contrast) so the settled drift reads as a single
// autumn mass rather than the full mixed drift palette above.
const PILE_TINTS = [
  "#E0672A",
  "#E0672A",
  "var(--color-cinnamon)",
  "#EDB730",
  "#F2C94C",
  "#DB8A2A",
  "#5E7A3D",
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
  avoidX: number; // eased px offset dodging the cursor (desktop only)
  avoidY: number;
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
  // Last-known mouse position (viewport px), for the cursor-dodge below.
  // `sx`/`sy` are a lightly smoothed copy of `x`/`y` and `vx`/`vy` its
  // velocity (both maintained in the tick loop). The smoothing is only there
  // to take the stutter out of raw pointer samples, NOT to make the field
  // trail the cursor: it runs on a ~25ms time constant, and the velocity
  // feeds a small forward lead that pays that back, so the field sits under
  // the cursor instead of behind it. Do not lower the rate to "soften" the
  // effect — softness belongs in the falloff curve and the ease rates below,
  // and buying it here is what made the leaves react late.
  // Touch never sets `active` (no persistent pointer to dodge there — the
  // tap puff + flick is that platform's interactive affordance instead).
  const mouseRef = useRef({ x: -9999, y: -9999, sx: -9999, sy: -9999, vx: 0, vy: 0, active: false });

  // SSR-safe responsive density: desktop default until mount, then phone-lighter.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Trimmed a step back down from the previous (denser) pass — the SAME
  // staggered rest-gap cadence as before (unchanged below) keeps it full
  // without turning into a downpour.
  const COUNT = isMobile ? 16 : 33;
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
      l.avoidX = 0;
      l.avoidY = 0;
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
        avoidX: 0,
        avoidY: 0,
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
    const cleanups = leaves.map((l, i) => {
      if (!l.el) return () => {};
      const down = onTap(i);
      l.el.addEventListener("pointerdown", down);
      return () => {
        l.el?.removeEventListener("pointerdown", down);
      };
    });

    // Cursor dodge: track the live mouse position at the window level (fires
    // regardless of the layer's own pointer-events, which stay off except on
    // the sprites themselves) so every leaf can smoothly ease away from it in
    // the tick loop below. Touch never sets this — there is no persistent
    // pointer to dodge there, and the tap above already covers "interactive".
    const mouse = mouseRef.current;
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      // First sighting, or the pointer re-entering the window: drop the
      // smoothed point straight onto the cursor rather than easing across the
      // viewport from a stale position.
      if (!mouse.active) {
        mouse.sx = e.clientX;
        mouse.sy = e.clientY;
        mouse.vx = 0;
        mouse.vy = 0;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    // `pointerout` with no relatedTarget fires when the pointer leaves the
    // browser viewport entirely, so leaves stop dodging a stale last position.
    const onPointerOut = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !e.relatedTarget) mouse.active = false;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });

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

    /* ---- Cursor field tuning (desktop only: touch gets the tap-flick) -----
     * The target feel is a soft magnet, not a flinch. Three separate knobs,
     * each doing one job, so "gentler" can never again be bought by making
     * the whole thing lag:
     *   - RADIUS + the falloff curve set how EARLY and how BROADLY a leaf
     *     feels the cursor. A wide field with a saturating curve reads as
     *     magnetic; a narrow one reads as a collision.
     *   - PUSH sets how FAR a leaf travels. This is the "violence" dial.
     *   - ATTACK / RELEASE set the TIMING: leaves part promptly and drift
     *     home lazily.
     * None of it costs per-frame work. The two ease factors and the field
     * centre are computed once per frame, not once per leaf, and the falloff
     * is a squared-distance test with a single sqrt only for leaves actually
     * inside the field.
     */
    const AVOID_RADIUS = isMobile ? 0 : 150;
    const AVOID_R2 = AVOID_RADIUS * AVOID_RADIUS;
    const AVOID_PUSH = 15; // px of travel at the centre of the field (kept faint on purpose)
    const AVOID_ATTACK = 16; // 1/s, ~62ms to part
    const AVOID_RELEASE = 4; // 1/s, ~250ms to drift back home
    const POINTER_RATE = 40; // 1/s, ~25ms of de-stutter and not a frame more
    const POINTER_LEAD = 0.035; // s of velocity look-ahead, cancels the above
    const POINTER_LEAD_MAX = 56; // px, so a flick cannot fling the field away

    let raf = 0;
    let last = performance.now();
    let resumed = true; // the loop was idle last frame (hidden tab / out of range)
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Pause work when the tab is hidden or the layer is out of range.
      if (pausedRef.current || !active) {
        resumed = true;
        return;
      }
      // Back from a hidden tab or an out-of-range scroll: adopt the live
      // cursor instead of easing across wherever it wandered while we idled.
      if (resumed) {
        resumed = false;
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.vx = 0;
        mouse.vy = 0;
      }

      // Pointer smoothing, frame-rate independent and deliberately short: it
      // only de-stutters the raw samples. The velocity lead underneath then
      // pushes the field centre forward by roughly the distance the smoothing
      // costs, so leaves part around where the cursor IS, not where it was.
      const pe = 1 - Math.exp(-dt * POINTER_RATE);
      const prevSx = mouse.sx;
      const prevSy = mouse.sy;
      mouse.sx += (mouse.x - mouse.sx) * pe;
      mouse.sy += (mouse.y - mouse.sy) * pe;
      const ve = 1 - Math.exp(-dt * 18);
      mouse.vx += ((mouse.sx - prevSx) / dt - mouse.vx) * ve;
      mouse.vy += ((mouse.sy - prevSy) / dt - mouse.vy) * ve;
      let leadX = mouse.vx * POINTER_LEAD;
      let leadY = mouse.vy * POINTER_LEAD;
      const leadD2 = leadX * leadX + leadY * leadY;
      if (leadD2 > POINTER_LEAD_MAX * POINTER_LEAD_MAX) {
        const clampK = POINTER_LEAD_MAX / Math.sqrt(leadD2);
        leadX *= clampK;
        leadY *= clampK;
      }
      const fieldX = mouse.sx + leadX;
      const fieldY = mouse.sy + leadY;
      const fieldOn = AVOID_RADIUS > 0 && mouse.active;
      const attack = 1 - Math.exp(-dt * AVOID_ATTACK);
      const release = 1 - Math.exp(-dt * AVOID_RELEASE);

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

        // Part around the cursor: ease toward a push vector pointing away
        // from the field centre while inside it, ease back to zero once the
        // cursor moves off — never a jump-cut in either direction.
        //
        // Sampled from the leaf's CENTRE, not its top-left corner. The corner
        // sits up to 20px up-and-left of the glyph you can actually see, so
        // the old corner test meant the cursor had to overshoot a leaf before
        // it would budge, and the push came out skewed.
        //
        // The field is always read at the leaf's UNDISPLACED position, so a
        // leaf can never push itself further into or out of its own force
        // reading. That feedback loop is what turns a field like this into a
        // buzzing mess; keep it this way.
        let targetAvoidX = 0;
        let targetAvoidY = 0;
        if (fieldOn) {
          const half = l.size * 0.5;
          const dx = x + half - fieldX;
          const dy = l.y + half - fieldY;
          const d2 = dx * dx + dy * dy;
          if (d2 < AVOID_R2) {
            const dist = Math.sqrt(d2) || 1;
            const t = 1 - dist / AVOID_RADIUS;
            // Saturating falloff (1 - (1 - t)^2): real pull out at the rim so
            // leaves begin to part well before contact, topping out toward the
            // centre rather than spiking there. That shape is what reads as a
            // magnet; a linear ramp reads as a bump and an inverse-square
            // spike reads as a shove.
            const push = (t * (2 - t) * AVOID_PUSH) / dist;
            targetAvoidX = dx * push;
            targetAvoidY = dy * push;
          }
        }
        // Fast in, slow out: the parting is immediate, the drift home is lazy.
        const growing =
          targetAvoidX * targetAvoidX + targetAvoidY * targetAvoidY >=
          l.avoidX * l.avoidX + l.avoidY * l.avoidY;
        const ease = growing ? attack : release;
        l.avoidX += (targetAvoidX - l.avoidX) * ease;
        l.avoidY += (targetAvoidY - l.avoidY) * ease;
        const avoidMag = Math.min(
          1,
          Math.sqrt(l.avoidX * l.avoidX + l.avoidY * l.avoidY) / AVOID_PUSH
        );

        let scale = 1 + avoidMag * 0.1;
        let op = 0.82 + avoidMag * 0.16;
        if (l.poof > 0) {
          l.poof = Math.max(0, l.poof - dt);
          const p = 1 - l.poof / 0.5; // 0..1
          scale += 0.5 * Math.sin(p * Math.PI);
          op += 0.32 * Math.sin(p * Math.PI);
        }

        l.el.style.opacity = String(Math.min(1, op));
        l.el.style.transform = `translate3d(${x + l.avoidX}px, ${l.y + l.avoidY}px, 0) rotate(${l.rot}deg) scale(${scale})`;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", recomputeRange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", computeSeams);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      cleanups.forEach((c) => c());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COUNT, PILE_CAP, isMobile]);

  return (
    <>
      <div
        ref={wrapRef}
        aria-hidden
        // z-0: every SectionReveal-wrapped block below (intro copy, each
        // FeatureSection's heading + screenshot, the trust card) is its own
        // z-0 stacking context that comes LATER in the DOM, so it paints on
        // top of this one at the same level — leaves stay tucked behind the
        // page's real content while still painting above the plain section
        // backgrounds underneath (those are unpositioned, so they paint
        // first regardless of z-index). Do not raise this back up.
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-0 transition-opacity duration-700 ease-out"
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
          // Same z-0 reasoning as the falling layer above: behind the
          // footer's own content, above the plain background it settles on.
          className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-20 overflow-hidden opacity-0 transition-opacity duration-500 ease-out"
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
 * sprite — a broad blade, an ovate leaf with a pointed drip-tip (like a
 * peepal or fig leaf), and a slim willow leaf. All share the same soft,
 * single-vein construction so they still read as one family. */
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
          {/* Ovate leaf, wide but unmistakably a leaf: a pointed drip-tip at
              top, a rounded taper into the (unseen) stem at the base — not
              the symmetric near-circle this replaced. */}
          <path d="M12 2c5 4.5 6.5 10.5 3.5 16.5C14 21 12.7 22 12 22s-2-1-3.5-3.5C5.5 12.5 7 6.5 12 2Z" fill="currentColor" opacity="0.9" />
          <path d="M12 4.5v16" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
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
