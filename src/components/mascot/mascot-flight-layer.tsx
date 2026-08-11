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
import { createPortal, flushSync } from "react-dom";
import dynamic from "next/dynamic";
import type { HoopoeApi } from "./hoopoe-kit";
import type { HoopoeProps } from "./hoopoe";
import { LEGS_DOWN_AT } from "./hoopoe-kit";
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
// /signup's `fallback = setTimeout(reveal, 6000)`). Referenced only in this
// comment, not imported — those pages don't depend on this module. At the
// default speed (1, every current call site) the failsafe below is 5800ms
// and the perch-timeout is 2500ms, both under that 6000ms, same shape as
// before `speed` existed. All three moved together on 2026-08-04 when the
// cruise slowed down; if any one of them changes again, check the other two.
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

// The cruise chord's own progress curve.
//
// `smoother` is SYMMETRIC: it spends as much of the flight speeding up as
// slowing down. Over the old 1.1s cruise that read as the bird being fired
// across the screen and stopping dead (owner, 2026-08-04: "it just zips over,
// it's not at all smooth ... I'd like it if it slowed down towards the end").
// This blends that symmetric curve into a cubic ease-out, weighting toward the
// ease-out as the flight proceeds: the push-off stays soft, and nearly all of
// the slowing now happens across the last third, so the bird visibly runs out
// of speed onto the perch instead of arriving still at cruise pace.
//
// Monotonic by construction, which matters because a non-monotonic progress
// curve would track the bird backwards mid-air: both inputs rise 0->1, the
// ease-out leads the symmetric curve everywhere in between, and the weight
// only ever shifts from the slower one toward the faster one.
const cruiseEase = (u: number) => {
  const symmetric = smoother(u);
  const decelerate = 1 - (1 - u) ** 3;
  return symmetric * (1 - u) + decelerate * u;
};

// The final alight: the residual this tween ever has to cover is at most the
// 4px hover bob, a ~2° bank, and the last <1px of target drift. 180ms reads
// as the bird's final flare onto the perch; much shorter looks like a twitch,
// much longer like a second animation starting after the flight already ended.
const SETTLE_MS = 180;

/* ---- the flare (owner, 2026-08-11) --------------------------------------
 * "instead of plonking on the ground just as it's landing it slows down the
 * landing marginally as if a real bird. So it kind of just rests down."
 *
 * It plonked because the cruise ended ON the perch: measured at 1440x900 the
 * bird was covering ~12px/frame at the halfway mark and 0px/frame by 85%, so
 * it simply arrived at pace and stopped dead, then waited to be folded up.
 * There was no final beat at all.
 *
 * So the cruise now aims FLARE_LIFT_PX above the perch, and this last stretch
 * lowers it the rest of the way on a decelerating ease — the bird comes in
 * over the spot and sinks onto it. The lift is applied only to what is drawn,
 * never to `smoothT`, so the cruise's convergence test still compares the
 * real target with the real smoothed target and the landing stays pixel-exact.
 *
 * The wings are deliberately still flapping through all of this: `api.perch()`
 * (which is what stops the glide and folds them) is not called until the flare
 * has finished, so the bird brakes with its wings the way a real one does and
 * only tucks them once it is down. That was the owner's pick of the three
 * options put to them.
 *
 * 300ms over 16px is about 53px/s at the start of the flare easing to nothing:
 * slow enough to read as settling, short enough that it is part of the landing
 * rather than a separate animation after it. */
const FLARE_LIFT_PX = 16;
const FLARE_MS = 300;
// Decelerating: fast in, nothing at the end, so the weight lands softly.
const easeOutCubic = (u: number) => 1 - (1 - u) ** 3;

/* Keep the arch inside the window (owner, 2026-08-11: "sign in hoopoe goes a
 * bit too high. The flight path of join hoopoe is better").
 *
 * Both CTAs sit on the same row of the hero, so the two flights differ only in
 * where they are going — and /login's bird perches 69px higher than /signup's
 * (measured tops 200.6 vs 269.8 at 1440x900). The same generous arch therefore
 * put /login's apex at -35px, i.e. 35px ABOVE the top of the screen, while
 * /signup's peaked at +21px and read fine. So this is a ceiling, not a smaller
 * arc everywhere: /signup's path is already what the owner wants and must not
 * change. 12px leaves the bird visibly clear of the edge without flattening it. */
const APEX_MIN_TOP_PX = 12;

type Active = FlightLaunch & { id: number };

export function MascotFlightLayer() {
  const [active, setActive] = useState<Active | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const abortRef = useRef(false);
  const ranId = useRef(-1);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Start the flight one tick after the rig says it is ready, never
   * synchronously inside `onReady`.
   *
   * THIS IS WHY THE FLIGHT LOOKED DIFFERENT ON LOCALHOST AND ON THE DEPLOYED
   * SITE (owner, 2026-08-04: on localhost "the wings are just tucked in and
   * flapping a very little bit from the side to inside instead of flapping
   * outwards"; deployed, they flap properly).
   *
   * React Strict Mode is dev-only and on by default. It mounts the rig, fires
   * this callback, immediately tears that mount down again — running
   * `<Hoopoe>`'s unmount cleanup, which calls `.stop()` on every live
   * animation — and then re-runs the mount effects. A flight started
   * synchronously from the first call therefore had its take-off pose killed
   * milliseconds later, and the old `ranId` guard swallowed the second,
   * post-dance call as a duplicate. So the whole flight ran with a puppet
   * whose animations had just been stopped: this layer's own `setTransform`
   * kept translating the box (it writes to the portal div, not the rig), so
   * the bird still crossed the screen, but `takeOff` / `glide` / `perch` never
   * took and the wings sat near their static rest markup. Production never had
   * the dance, so it never had the bug, and localhost could not be trusted to
   * review this animation at all.
   *
   * Deferring by one tick lets the dance finish first, so `ranId` then admits
   * exactly one run and it is against a live rig. `clearTimeout` keeps only
   * the newest ready signal, so the run is always the surviving mount's.
   * This is the same fix, for the same motion v12 reason, that
   * sidebar-hoopoe.tsx's `handleReady` already carries.
   */
  function queueFlight(api: HoopoeApi, flight: Active) {
    clearTimeout(startTimerRef.current);
    startTimerRef.current = setTimeout(() => void runFlight(api, flight), 0);
  }

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
      clearTimeout(startTimerRef.current);
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
    //
    // THIS NUMBER IS DERIVED, NOT PICKED, and it has to be re-derived whenever
    // the cruise gets longer. It is the longest GRACEFUL path: take-off (240)
    // + the full cruise (2050) + no report ever arriving, so the flyer hovers
    // out the whole perch timeout (2500) + the flare (300, was 180 before the
    // 2026-08-11 landing rework) + the perch fold (~450), which sums to ~5.5s.
    // 5800 still clears that, but only just; anything further added to the
    // landing needs this raised, and the destination pages' own 6000ms
    // fallback-reveal timers raised with it. 5800 clears that with room for a slow
    // machine. Set below the real path instead, this fires mid-air and the
    // bird is deleted in front of the viewer — the exact bug the sidebar
    // bird's own deadline hit on 2026-08-03. Raised from 3900 on 2026-08-04
    // alongside the slower cruise; the destination pages' own fallback-reveal
    // timers went 4000 -> 6000 in the same commit and must stay ABOVE this, so
    // the flyer always hands off before a page reveals its own hoopoe.
    //
    // Scaled by speed like every other duration below, uncapped, so a slower
    // flight's safety net stays proportionally longer than the (also slower)
    // real animation — see the comment above for why an earlier hard-coded
    // ceiling here was a bug, not a feature.
    const failsafeMs = ms(5800);
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
      // 2500 < 3900, so dividing both sides by the same positive `speed`
      // preserves that inequality at every speed — perchTimeoutMs is
      // always < failsafeMs with no extra capping needed, leaving the
      // graceful hover fallback room to run before the hard abort fires.
      let perchReady = getLatestPerch() != null;
      const perchTimeoutMs = ms(2500);
      void awaitPerch(perchTimeoutMs).then(() => {
        perchReady = true;
      });

      // The auth pages now report their perch at MOUNT (not only after their
      // entrance settles), so a real rect often exists before the cruise even
      // starts — aim there from the first frame when it does.
      const aim = getLatestPerch() ?? prov;
      const dist = Math.hypot(aim.left - A.x, aim.top - A.y);
      // Pace and arc, both raised on 2026-08-04. The hero CTA to the form is
      // ~900px, which under the old numbers bought a 1120ms cruise over a
      // 165px arch: a flat, ~0.8 screen-widths-per-second dash the eye cannot
      // track, which is most of why the flight read as dropping frames rather
      // than as being fast. 1960ms over a 280px arch at the same distance is
      // near enough half the speed and 1.7x the height, so there is an arc to
      // follow and time to follow it. The floors matter as much as the caps: a
      // short flight must not become a twitch.
      const flyMs = ms(clamp(1150 + dist * 0.9, 1150, 2050));
      const basePeak = clamp(95 + dist * 0.24, 95, 280);
      // The body's undulation is meant to be the wingbeat showing through the
      // flight path, so it is DERIVED from the cruise length against the
      // puppet's own 0.44s wing cycle (hoopoe.tsx, glide) rather than pinned at
      // a constant. Left at the old hard-coded 4 the two drifted apart the
      // moment the cruise got longer, and a ripple running slower than the
      // wings it is supposed to come from reads as a wobble.
      const flaps = Math.max(3, Math.round(flyMs / 440));
      const undAmp = 5;

      // The arch that actually gets flown, fitted to the target so the bird
      // never leaves the top of the window (see APEX_MIN_TOP_PX). Sample the
      // path, find its highest point, and drop the peak by exactly the
      // overshoot — the apex moves down about 1px per 1px of peak, so one pass
      // is enough and no iteration is needed. Floored at 60 so a clamped
      // flight still arcs instead of going flat.
      //
      // Recomputed per frame from the SMOOTHED target rather than once from
      // the provisional one, and that matters: the real perch only arrives
      // mid-cruise (the destination page has not mounted when the bird takes
      // off), and on /login it is 41px higher than the provisional guess, so a
      // peak fitted at take-off would be fitted to the wrong target. Driving
      // it off `smoothT` — which already eases toward each new report — means
      // the arch tightens as smoothly as the target does, with no kink.
      const fitPeak = (targetTop: number) => {
        let apexTop = Infinity;
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          const y =
            A.y +
            (targetTop - FLARE_LIFT_PX - A.y) * cruiseEase(u) -
            basePeak * Math.sin(Math.PI * u) -
            undAmp;
          if (y < apexTop) apexTop = y;
        }
        return apexTop < APEX_MIN_TOP_PX
          ? Math.max(60, basePeak - (APEX_MIN_TOP_PX - apexTop))
          : basePeak;
      };
      // Smoothed target so a late/corrected perch report never snaps the path.
      const smoothT = { x: aim.left, y: aim.top };
      let sc = 1;
      // The last pose actually written, so the settle in phase 2 starts from
      // exactly where the cruise left off (hover bob + residual bank included).
      const cur = { x: A.x, y: A.y, rot: 0 };
      // First hover instant, for the bob's fade-in ramp below.
      let hoverFrom = -1;
      let gearDown = false;

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
          // Landing gear down mid-descent: begin the leg unfold at 70% of the
          // cruise (LEGS_DOWN_AT, shared with arcAndLand) so the gentle spring
          // has the legs visibly extended by touchdown — unfolding only after
          // arrival left the bird legless for the first beat of every landing
          // ("the legs are cut off for a second and then appear").
          if (!gearDown && raw >= LEGS_DOWN_AT) {
            gearDown = true;
            api.legsDown();
          }

          if (raw < 1) {
            const e = cruiseEase(raw);
            const arch = Math.sin(Math.PI * raw);
            const peak = fitPeak(smoothT.y);
            cur.x = A.x + (smoothT.x - A.x) * e;
            // Aims FLARE_LIFT_PX above the perch: the cruise brings the bird
            // over the spot, and the flare below lowers it the rest of the
            // way. The lift rides `e`, so it is nothing at take-off and fully
            // applied by the end of the cruise.
            cur.y =
              A.y +
              (smoothT.y - FLARE_LIFT_PX - A.y) * e -
              peak * arch - // rise then fall over the chord
              undAmp * Math.sin(2 * Math.PI * flaps * raw) * arch; // wingbeat ripple
            cur.rot = dir * 9 * arch; // bank into the arc, level at both ends
            setTransform(cur.x, cur.y, cur.rot, sc, 1);
            rafRef.current = requestAnimationFrame(step);
            return;
          }

          // Cruise time is up. Finish only once the perch is known AND the
          // smoothed target has converged onto it to within a pixel, so phase 2
          // never has more than a whisker (plus the bob) to cover — this is
          // what killed the "lands low then corrects" snap: the old code
          // resolved on the first frame the report arrived and hard-wrote the
          // distant rect.
          if (perchReady && Math.hypot(target.left - smoothT.x, target.top - smoothT.y) < 1) {
            // write the exact end-of-arc frame (arch and ripple are zero at
            // t=1), still holding the flare lift for the descent below
            cur.x = smoothT.x;
            cur.y = smoothT.y - FLARE_LIFT_PX;
            setTransform(cur.x, cur.y, cur.rot, sc, 1);
            return resolve();
          }

          // Report still missing (or still converging): hold a gentle hover on
          // the best-known spot. The bob's amplitude fades in over 400ms so a
          // one-or-two-frame wait never visibly dips the bird below its perch,
          // and the residual bank EASES toward the hover's light 2° instead of
          // jumping to it from the cruise bank.
          if (hoverFrom < 0) hoverFrom = el;
          const hel = el - hoverFrom;
          const hover = Math.sin(hel / 210) * 4 * Math.min(1, hel / 400);
          cur.rot += (dir * 2 - cur.rot) * 0.16;
          cur.x = smoothT.x;
          // Hovers at the flare height too, so whether or not the bird had to
          // wait for a report it starts its descent from the same place.
          cur.y = smoothT.y - FLARE_LIFT_PX - hover;
          setTransform(cur.x, cur.y, cur.rot, sc, 1);
          rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
      });
      if (abortRef.current) return;

      // Phase 2 — the flare. The cruise leaves the bird hovering FLARE_LIFT_PX
      // over the perch (plus whatever bob and residual bank it had), so this is
      // a real, visible final beat rather than the sub-pixel correction it used
      // to be: it sinks the last stretch on a decelerating ease and comes to
      // rest, which is the "slows down ... so it kind of just rests down" the
      // owner asked for. The wings are still flapping the whole way through —
      // api.perch() below is what stops the glide — so the bird brakes with
      // them and only tucks once it is down.
      const finalPerch = getLatestPerch() ?? prov;
      const fs = finalPerch.width / size || 1;
      const from = { x: cur.x, y: cur.y, rot: cur.rot, sc };
      await tween(ms(FLARE_MS), (t) => {
        const e = easeOutCubic(t);
        setTransform(
          from.x + (finalPerch.left - from.x) * e,
          from.y + (finalPerch.top - from.y) * e,
          from.rot * (1 - e),
          from.sc + (fs - from.sc) * e,
          1,
        );
      });
      if (abortRef.current) return;
      // Land exactly, in case the ease left a sub-pixel behind.
      setTransform(finalPerch.left, finalPerch.top, 0, fs, 1);
      await api.perch(); // fold wings + cushion squash = the land/settle beat
      if (abortRef.current) return;

      // The perch fold takes about half a second; if the destination reflowed
      // meanwhile (a resize, a late font) its ResizeObserver/resize listeners
      // kept reporting, so glide onto the newest rect before the swap rather
      // than handing off across a gap.
      let restX = finalPerch.left;
      let restY = finalPerch.top;
      const moved = getLatestPerch();
      if (moved && Math.hypot(moved.left - restX, moved.top - restY) > 1) {
        const from = { x: restX, y: restY };
        await tween(ms(SETTLE_MS), (t) => {
          const e = smoother(t);
          setTransform(from.x + (moved.left - from.x) * e, from.y + (moved.top - from.y) * e, 0, fs, 1);
        });
        if (abortRef.current) return;
        restX = moved.left;
        restY = moved.top;
      }

      // Phase 3 — hand off to the destination's own hoopoe. Whenever a perch
      // was ever reported the flyer is now sitting on that exact rect (within
      // 1px), so the swap is a same-frame swap: signal the reveal (the pages
      // reveal instantly, with no fade), hold the flyer for two more frames so
      // the reveal's React commit is provably painted underneath, then vanish.
      // Two identical fully-opaque birds stacked on one rect are
      // indistinguishable from one bird, while the old 150ms CROSSFADE dipped
      // the stack's combined opacity mid-fade and read as the landed bird
      // "dissolving into a different hoopoe". If no report ever arrived there
      // is no known rect to be aligned with, so keep the legacy fade-out as
      // the graceful-degradation path (storage disabled, or a page that never
      // mounted).
      const aligned = getLatestPerch() != null;

      /* The shadow, and why this ordering is the whole fix.
       *
       * Stacking two identical birds is invisible only where the sprite is
       * OPAQUE. The ground shadow is not: it is a lone ellipse at opacity 0.18
       * drawn on transparency (hoopoe.tsx, data-part=shadow), so two composite
       * to 1 - (1 - 0.18)^2 = 0.33 for exactly the frames both are painted.
       * That was the owner's 2026-08-03 report, and dropping the flyer's
       * shadow was the right idea. Doing it BEFORE signalHandoff was not.
       *
       * signalHandoff sets React state on the destination page. Left to its
       * own scheduling that commit lands in a LATER frame than this style
       * write, so the darkened frame was simply traded for an empty one: the
       * flyer painted at least once with no shadow at all before its
       * replacement existed. A shadow that blinks out and comes back is what
       * the owner is still seeing as the ground "resetting" under the bird
       * (2026-08-04).
       *
       * flushSync makes the reveal land in this same tick, before the browser
       * paints, so the two writes are guaranteed to reach one frame together:
       * the destination arrives WITH its shadow in the same paint the flyer
       * loses its own. Never zero, never doubled, no frame in between. The
       * flyer's write goes straight to the node rather than through the
       * controller because the rig is at rest by now (api.perch() has already
       * resolved), so there is no animation left to fight.
       *
       * Not inside an event handler or a render, so flushSync is legal here;
       * it is a no-op when nothing is subscribed (a page that never mounted). */
      flushSync(() => {
        signalHandoff();
      });
      if (aligned) {
        boxRef.current
          ?.querySelectorAll<SVGElement>('[data-part="shadow"]')
          .forEach((el) => {
            el.style.opacity = "0";
          });
        // two rAFs, not a ms-timer: the overlap is frame-granular by nature
        // (one painted frame with both birds), so it should not scale by speed
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      } else {
        await tween(ms(150), (t) => {
          setTransform(restX, restY, 0, fs, 1 - t);
        });
        await sleep(ms(20));
      }
    } finally {
      clearTimeout(failsafe);
      cancelAnimationFrame(rafRef.current);
      if (!abortRef.current) setActive(null);
    }
  }

  return createPortal(
    <div
      aria-hidden
      // The data attribute is a QA hook (scripts/qa/hoopoe-landing-check.mjs
      // samples this element's transform every frame); nothing in the app
      // selects on it.
      data-mascot-flyer
      className="pointer-events-none fixed left-0 top-0 z-[70] will-change-transform"
      ref={boxRef}
      style={{ transformOrigin: "center center", opacity: 0 }}
    >
      <Hoopoe
        key={active.id}
        size={size}
        idle={false}
        onReady={(api) => {
          queueFlight(api, active);
        }}
      />
    </div>,
    document.body,
  );
}
