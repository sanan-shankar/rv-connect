"use client";

/* ------------------------------------------------------------------ *
 *  MascotFlightLayer — the ONE hoopoe, mid-flight.
 *
 *  Mounted once in the root layout so it survives the client navigation
 *  between a public route (the landing) and an auth route (/login,
 *  /signup). When a landing CTA is pressed it flies the puppet from the
 *  button, across the viewport, and lands it exactly on the destination
 *  form's hoopoe rest rect, then hands off (the destination reveals its
 *  own, already-wired hoopoe at the identical spot + pose, so the swap is
 *  imperceptible and the password peek-a-boo just carries on).
 *
 *  Cost when idle: this renders `null` and adds NO listeners of its own —
 *  it holds only a single message-bus callback (see mascot-flight.ts).
 *  The rig, the portal, and the rAF driver all come into being only for
 *  the ~2s a flight is in the air, then tear down. The one-hoopoe rule is
 *  kept because the destination page keeps its own hoopoe hidden until the
 *  handoff, and the landing's scroll-companion hoopoe is out of view at the
 *  top of the page where the CTAs live.
 *
 *  House rules: transform + opacity only; no `transition-all`; the flight
 *  path is a real arc (eased chord + a sine arch + a flap-synced undulation
 *  + a bank), never a linear tween. The wingbeats come from the puppet
 *  (glide); this layer owns only the translation.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { HoopoeApi } from "./hoopoe-kit";
import type { HoopoeProps } from "./hoopoe";
import {
  onLaunch,
  awaitPerch,
  getLatestPerch,
  signalHandoff,
  normalizeFlightSpeed,
  type FlightLaunch,
  type FlightTarget,
  type PerchRect,
} from "./mascot-flight";

// Lazy-load the rig so it is NOT bundled into the root layout's shared chunk
// (which loads on every route, most of which never fly a hoopoe). It is fetched
// only when a flight launches; on the landing — the only place flights launch —
// the scroll companion has already loaded it, so the first flight has it cached.
const Hoopoe = dynamic<HoopoeProps>(() => import("./hoopoe").then((m) => m.Hoopoe), { ssr: false });

// The flyer's rig size per destination, matched to that page's own hoopoe so
// the handoff swap is same-size (and therefore seamless). Keep in sync with the
// `size` the /login and /signup pages pass to their <Hoopoe>.
const RIG_SIZE: Record<FlightTarget, number> = { login: 102, signup: 96 };

// SVG aspect: viewBox is 120 wide x 152 tall, so a rig of width `size` is this
// many px tall, and the drawn body-centre (viewBox 60,101 within origin y -10)
// sits at these fractions of the box.
const BOX_H = (size: number) => (size * 152) / 120;
const BODY_CX = (size: number) => size / 2; // viewBox x60 of 120
const BODY_CY = (size: number) => (size * 111) / 152; // viewBox y101 above origin y-10

// The destination pages' own hard-coded reveal fallback (see /login and
// /signup's `fallback = setTimeout(reveal, 4000)`). Referenced only in this
// comment, not imported — those pages don't depend on this module. At the
// default speed (1, every current call site) the failsafe below is 3600ms
// and the perch-timeout is 2500ms, both comfortably under that 4000ms, same
// as before `speed` existed.
//
// Both timers scale by the same 1/speed factor as every other duration in
// this flight (via `ms()` below), so a slower-than-default flight gets a
// proportionally longer safety net instead of a fixed-length one. An earlier
// version capped the failsafe at a hard-coded 3600ms ceiling meant to keep it
// under the destination's fallback for any speed; that silently defeated the
// scaling for speed < 1 (Math.min(ms(3600), 3600) is just 3600 whenever
// ms(3600) > 3600), so a slow flight's failsafe fired while the — correctly
// slowed-down — cruise animation was still mid-air, aborting it early and
// making the hoopoe vanish. No current caller passes speed !== 1, so this
// only matters for a future slow-flight caller; if one appears and needs the
// failsafe to also stay under the destination's fallback, that page's own
// timer should learn about `speed` too (out of this file's scope).

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// C2-smooth ease (gentle takeoff + landing), same family flyCore uses.
const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);

type Active = FlightLaunch & { id: number };

export function MascotFlightLayer() {
  const [active, setActive] = useState<Active | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const abortRef = useRef(false);
  const ranId = useRef(-1);

  // Subscribe to take-off requests. This is the ONLY thing alive while idle: a
  // single callback reference on the module bus (no DOM listeners).
  useEffect(() => {
    return onLaunch((launch) => setActive({ ...launch, id: Date.now() }));
  }, []);

  // Teardown safety: cancel rAF + drop the flight if the layer unmounts.
  useEffect(() => {
    return () => {
      abortRef.current = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!active || typeof document === "undefined") return null;

  const activeTarget = active.target;
  const size = RIG_SIZE[activeTarget];
  const boxH = BOX_H(size);

  function setTransform(topLeftX: number, topLeftY: number, rotDeg: number, scale: number, opacity: number) {
    const el = boxRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${topLeftX}px, ${topLeftY}px, 0) rotate(${rotDeg}deg) scale(${scale})`;
    el.style.opacity = String(opacity);
  }

  // rAF promise that ticks `onFrame(0..1, elapsedMs)` for `durMs`, then resolves.
  function tween(durMs: number, onFrame: (t: number, elapsed: number) => void): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        if (abortRef.current) return resolve();
        const el = now - start;
        const t = clamp(el / durMs, 0, 1);
        onFrame(t, el);
        if (t >= 1) return resolve();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    });
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // A provisional resting rect while the destination hasn't reported yet: the
  // form is centred in the right column (after the 58.3333% photo panel), and
  // its hoopoe sits near the top. Close enough to aim at; corrected the instant
  // the real rect is reported.
  function provisionalPerch(): PerchRect {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw * 0.7917; // centre of the right (form) column
    const cy = vh * (activeTarget === "signup" ? 0.3 : 0.34);
    return { left: cx - size / 2, top: cy - boxH / 2, width: size, height: boxH };
  }

  async function runFlight(api: HoopoeApi, flight: Active) {
    if (ranId.current === flight.id) return;
    ranId.current = flight.id;
    abortRef.current = false;

    // Speed multiplier: 1 (or anything missing/invalid) reproduces today's
    // pace exactly. 2x speed halves every duration below; `ms()` is the one
    // place that conversion happens so every timing stays proportional.
    const speed = normalizeFlightSpeed(flight.speed);
    const ms = (baseMs: number) => baseMs / speed;

    // Hard ceiling: never leave a flight (or a hidden destination hoopoe)
    // stranded if something stalls. Force the handoff + teardown after this.
    // At the default speed (1, every current call site) this is 3600ms —
    // comfortably below the destination pages' own fallback-reveal timer
    // (4000ms) so the flyer always hands off + tears down BEFORE a page would
    // reveal its own hoopoe on its own. Scaled by speed like every other
    // duration below, uncapped, so a slower flight's safety net stays
    // proportionally longer than the (also slower) real animation instead of
    // firing mid-flight — see the comment above for why an earlier
    // hard-coded ceiling here was a bug, not a feature.
    const failsafeMs = ms(3600);
    const failsafe = setTimeout(() => {
      abortRef.current = true;
      signalHandoff();
      cancelAnimationFrame(rafRef.current);
      setActive(null);
    }, failsafeMs);

    try {
      // Take-off top-left: place the drawn body-centre on the clicked CTA centre.
      const A = { x: flight.from.x - BODY_CX(size), y: flight.from.y - BODY_CY(size) };
      const prov = provisionalPerch();
      const dir: 1 | -1 = prov.left + prov.width / 2 >= flight.from.x ? 1 : -1;

      // Phase 0 — appear at the button and snap to the launch pose while the
      // container fades + scales in. take-off is a non-queued pose (see the
      // controller), so fire-and-forget: glide takes the wings over smoothly.
      setTransform(A.x, A.y, dir * 3, 0.74, 0);
      void api.takeOff();
      await tween(ms(240), (t) => {
        setTransform(A.x, A.y, dir * 3 * (1 - t), 0.74 + 0.26 * t, Math.min(1, t * 2));
      });
      if (abortRef.current) return;

      // Phase 1 — cruise. One continuous arc: eased chord + a sine arch + a
      // flap-synced undulation + a bank, retargeting smoothly onto the perch.
      api.glide(dir);
      // Kick the perch waiter; it resolves as soon as the destination reports.
      // 2500 < 3600, so dividing both sides by the same positive `speed`
      // preserves that inequality at every speed — perchTimeoutMs is
      // always < failsafeMs with no extra capping needed, leaving the
      // graceful hover fallback room to run before the hard abort fires.
      let perchReady = getLatestPerch() != null;
      const perchTimeoutMs = ms(2500);
      void awaitPerch(perchTimeoutMs).then(() => {
        perchReady = true;
      });

      const dist = Math.hypot(prov.left - A.x, prov.top - A.y);
      const flyMs = ms(clamp(820 + dist * 0.45, 820, 1120));
      const peak = clamp(70 + dist * 0.12, 70, 165);
      const flaps = 4;
      const undAmp = 5;
      // Smoothed target so a late/corrected perch report never snaps the path.
      const smoothT = { x: prov.left, y: prov.top };
      let sc = 1;

      await new Promise<void>((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
          if (abortRef.current) return resolve();
          const el = now - start;
          const target = getLatestPerch() ?? prov;
          // ease the target itself toward the newest report (kills retarget snap)
          smoothT.x += (target.left - smoothT.x) * 0.16;
          smoothT.y += (target.top - smoothT.y) * 0.16;
          sc += ((target.width / size || 1) - sc) * 0.16;

          const raw = el / flyMs;
          const t = Math.min(1, raw);
          const e = smoother(t);
          const arch = Math.sin(Math.PI * t);
          const x = A.x + (smoothT.x - A.x) * e;
          let y = A.y + (smoothT.y - A.y) * e;
          y -= peak * arch; // rise then fall over the chord
          y -= undAmp * Math.sin(2 * Math.PI * flaps * t) * arch; // wingbeat ripple
          const rot = dir * 9 * arch; // bank into the arc, level at both ends
          setTransform(x, y, rot, sc, 1);

          // Done only once we've reached the end AND know the real perch. If the
          // report is late, hold a gentle hover near the target until it lands.
          if (raw >= 1 && perchReady) return resolve();
          if (raw >= 1) {
            const hover = Math.sin(el / 210) * 4;
            setTransform(smoothT.x, smoothT.y - hover, dir * 2, sc, 1);
          }
          rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
      });
      if (abortRef.current) return;

      // Phase 2 — settle exactly onto the reported perch, then land.
      const finalPerch = getLatestPerch() ?? prov;
      const fs = finalPerch.width / size || 1;
      setTransform(finalPerch.left, finalPerch.top, 0, fs, 1);
      await api.perch(); // fold wings + cushion squash = the land/settle beat
      if (abortRef.current) return;

      // Phase 3 — hand off. The destination reveals its own hoopoe at the same
      // rest pose + rect; we crossfade out over it so the swap is unseen.
      signalHandoff();
      await tween(ms(150), (t) => {
        setTransform(finalPerch.left, finalPerch.top, 0, fs, 1 - t);
      });
      await sleep(ms(20));
    } finally {
      clearTimeout(failsafe);
      cancelAnimationFrame(rafRef.current);
      if (!abortRef.current) setActive(null);
    }
  }

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[70] will-change-transform"
      ref={boxRef}
      style={{ transformOrigin: "center center", opacity: 0 }}
    >
      <Hoopoe
        key={active.id}
        size={size}
        idle={false}
        onReady={(api) => {
          void runFlight(api, active);
        }}
      />
    </div>,
    document.body,
  );
}
