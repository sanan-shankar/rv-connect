"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/moment-hoopoe";
import { clamp, rand } from "@/components/mascot/hoopoe-kit";

/* ------------------------------------------------------------------ *
 *  The 404 page: a centred copy block (404 / heading / line / button),
 *  with the hoopoe already present, perched in the bottom-left corner.
 *  Left to itself the bird stays PUT and just emotes -- cycling cute
 *  expressions, flicking its crest, glancing about, preening -- it never
 *  wanders or hops off on its own. Click (or tap) anywhere and it flies
 *  to that spot, then settles and resumes emoting wherever it landed.
 *
 *  ---- one bird, one intent (the whole point of the file) ----
 *  Every behaviour here runs under a single "flight token". Starting a
 *  new intent (a click, a resize rescue) calls `claim()`, which cancels
 *  the outgoing token, stops the rig's own action queue, and mints a
 *  fresh token. Every await inside a routine is raced against its token
 *  (`until`/`hold`/`tween` all resolve FALSE the instant it's cancelled),
 *  so a cancelled routine unwinds at its next `if (!(await ...)) return`
 *  instead of hanging on a promise the cleared queue will never settle.
 *  Result: the bird can never be flying to two places at once, and a
 *  click during a flight simply redirects it from wherever it is.
 *
 *  ---- why only pose verbs, never the rig's travel verbs ----
 *  Position is owned entirely by this file: the puppet sits in a fixed
 *  wrapper translated in viewport coordinates, so it can reach any point
 *  on the page (the rig's own `flyTo`/`hop` translate WITHIN the bird's
 *  own SVG, whose stage is only as big as the bird). We drive the pose
 *  with the same not-queued primitives the cross-page login flight uses
 *  (`takeOff` / `glide` / `perch`), plus queued expression beats.
 *
 *  The idle beats are chosen to leave PARTS.root untouched (`express`,
 *  `crestFlick`, `preen`, `wave`, `blinkOnce`, `gaze`) -- deliberately
 *  never `hop`/`peck`/`celebrate`/`express("alert"|"surprise")`, which
 *  animate the root: a click interrupting one of those commits the root
 *  mid-value and would leave the puppet permanently offset inside its own
 *  SVG. The head/wing/crest poses they DO touch are all reset by the
 *  post-landing `express("content")`, so an interrupted idle beat heals.
 *
 *  One-hoopoe rule: `notFound()` thrown from a nested `(main)` route
 *  keeps that layout (and its resident sidebar hoopoe) mounted
 *  underneath, so the bird is gated on `useSoloHoopoe()`, the same guard
 *  the ambient moment companions use. The copy block always renders.
 * ------------------------------------------------------------------ */

// Rig size. One step at each breakpoint rather than a fluid scale: the
// puppet's charm lives in its line weights, which do not survive being
// scaled continuously.
const RIG_MOBILE = 116;
const RIG_DESKTOP = 168;

// The drawn puppet, in its own viewBox "0 -10 120 152" units: the shadow
// ellipse (its ground contact) is centred at (60, 137). Everything below
// converts that into "where the feet are" inside the rendered box, so a
// translate of (x, y) plants the bird's feet exactly on the page point
// (x, y).
const VB = { w: 120, h: 152, minY: -10, footX: 60, footY: 137 };

const EDGE = 14; // keep the bird's whole box this far inside the viewport

// `clamp` and `rand` are shared with the rig (hoopoe-kit.ts); the rest of the
// easing math below is deliberately page-local (see the header note on owning
// position ourselves).
const clamp01 = (t: number) => clamp(t, 0, 1);
// Quintic smoothstep: the same C2-smooth easing the rig's own cruise arc
// uses, so a wrapper-driven flight reads like an in-SVG one.
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// Cute, stationary expression flashes for the idle loop. None of these touch
// PARTS.root (that excludes "surprise"/"alert", whose startle recoil moves it).
const CUTE = ["curious", "happy", "love", "proud"] as const;

function rigMetrics(size: number) {
  const w = size;
  const h = (size * VB.h) / VB.w;
  return {
    w,
    h,
    footX: (w * VB.footX) / VB.w,
    footY: (h * (VB.footY - VB.minY)) / VB.h,
  };
}

/* ---- flight token: one live intent at a time ---- */
interface Token {
  cancelled: boolean;
  done: Promise<void>;
  cancel(): void;
}
function newToken(): Token {
  let release = () => {};
  const done = new Promise<void>((r) => (release = r));
  const t: Token = {
    cancelled: false,
    done,
    cancel() {
      if (t.cancelled) return;
      t.cancelled = true;
      release();
    },
  };
  return t;
}
// Await something, but give up the instant this token is cancelled. The rig's
// queued verbs never settle once `stop()` has cleared the queue, so every
// await in this file goes through here. Resolves TRUE if the awaited thing
// finished, FALSE if the token was cancelled first -- so a routine can guard
// its next step with a single `if (!(await until(...))) return;`.
const until = (p: Promise<unknown>, t: Token): Promise<boolean> =>
  Promise.race([p.then(() => true), t.done.then(() => false)]);
// A cancellable sleep that clears its own timer the moment the token is
// cancelled (rather than leaving a pending no-op callback to fire up to a
// couple of seconds later). Same true/false contract as `until`.
const hold = (ms: number, t: Token): Promise<boolean> =>
  new Promise((resolve) => {
    const id = setTimeout(() => resolve(true), ms);
    void t.done.then(() => {
      clearTimeout(id);
      resolve(false);
    });
  });

export default function NotFound() {
  const { ref, ...h } = useHoopoe();
  const solo = useSoloHoopoe();

  const wrapRef = useRef<HTMLDivElement>(null);
  // Set by the director effect; the stage's pointer handler is the only
  // thing outside that effect allowed to start an intent.
  const flyRef = useRef<((x: number, y: number) => void) | null>(null);

  const [rig, setRig] = useState(RIG_DESKTOP);
  const M = useMemo(() => rigMetrics(rig), [rig]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setRig(mql.matches ? RIG_DESKTOP : RIG_MOBILE);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!solo) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let raf = 0;
    let token: Token | null = null;
    const pos = { x: 0, y: 0 };

    // The one thing that honours prefers-reduced-motion is the click FLIGHT
    // (the rig's own micro-delights are a locked always-on decision, see
    // hoopoe-kit.ts): with reduced motion the bird teleports to the click
    // instead of arcing, but still emotes in place either way.
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setPos = (x: number, y: number) => {
      pos.x = x;
      pos.y = y;
      wrap.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    };
    // The wrapper starts invisible: its first meaningful position is only
    // knowable once layout has run, and a frame of bird parked at (0, 0) in
    // the corner is exactly the kind of pop this page should not open with.
    const reveal = () => {
      wrap.style.opacity = "1";
    };

    const bounds = () => {
      const minX = EDGE + M.footX;
      const minY = EDGE + M.footY;
      return {
        minX,
        minY,
        maxX: Math.max(minX, window.innerWidth - EDGE - (M.w - M.footX)),
        maxY: Math.max(minY, window.innerHeight - EDGE - (M.h - M.footY)),
      };
    };
    const clampPt = (x: number, y: number) => {
      const b = bounds();
      return { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) };
    };

    // Home: the bottom-left corner, a touch in from the edge. Where the bird
    // starts and where a resize rescues it back to.
    const home = () => clampPt(EDGE + M.footX + 14, window.innerHeight);

    // Drive `onFrame(0..1)` across `ms` on rAF. Resolves TRUE if it ran to the
    // end, FALSE if the token was cancelled mid-tween -- the same guard contract
    // as `until`/`hold`, so a caller stops on `if (!(await tween(...))) return`.
    const tween = (ms: number, t: Token, onFrame: (u: number) => void): Promise<boolean> =>
      new Promise((resolve) => {
        const t0 = performance.now();
        const step = (now: number) => {
          if (t.cancelled) return resolve(false);
          const u = clamp01((now - t0) / ms);
          onFrame(u);
          if (u >= 1) return resolve(true);
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        void t.done.then(() => resolve(false));
      });

    /* ---- the one travel primitive (only ever runs on a click / rescue) ---- */
    async function flyTo(to: { x: number; y: number }, t: Token) {
      const from = { x: pos.x, y: pos.y };
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) return;
      if (calm) {
        setPos(to.x, to.y); // reduced motion: no arc, just be there
        return;
      }

      const dir: 1 | -1 = dx >= 0 ? 1 : -1;
      const ms = clamp(540 + dist * 1.05, 620, 1650);
      const lift = clamp(40 + dist * 0.2, 46, 160); // arch above the straight chord
      // `glide` flaps on a 0.44s cycle; matching the altitude ripple to it is
      // what makes the wingbeats look like they are doing the lifting.
      const beats = Math.max(2, Math.round(ms / 440));

      h.gaze(dir * 0.45);
      void h.takeOff();
      // A short crouch before the launch, then a wing-synced arc across.
      if (!(await hold(90, t))) return;
      h.glide(dir);
      const flew = await tween(ms, t, (u) => {
        const e = smoother(u);
        const arch = Math.sin(Math.PI * u);
        const bob = -6 * Math.cos(2 * Math.PI * beats * u) * arch;
        setPos(from.x + dx * e, from.y + dy * e - lift * arch - bob);
      });
      if (!flew) return;
      setPos(to.x, to.y);
      h.gaze(0);
      await until(h.perch(), t);
    }

    /* ---- stationary idle: emote in place, never move ---- */
    async function lookAround(t: Token): Promise<boolean> {
      const s = Math.random() < 0.5 ? -1 : 1;
      if (!(await until(h.express("curious", { hold: 240 }), t))) return false;
      h.gaze(s * 0.7);
      if (!(await hold(420, t))) return false;
      h.gaze(-s * 0.7);
      if (!(await hold(440, t))) return false;
      h.gaze(0);
      return until(h.express("content"), t);
    }

    async function idle(t: Token) {
      while (!t.cancelled) {
        if (!(await hold(rand(1200, 2600), t))) return;
        const roll = Math.random();
        if (roll < 0.3) {
          // a cute face, held, with a glance toward something
          const s = Math.random() < 0.5 ? -1 : 1;
          h.gaze(s * 0.5);
          const face = CUTE[Math.floor(Math.random() * CUTE.length)];
          if (!(await until(h.express(face, { hold: rand(550, 950) }), t))) return;
          h.gaze(0);
          if (!(await until(h.express("content"), t))) return;
        } else if (roll < 0.52) {
          if (!(await lookAround(t))) return;
        } else if (roll < 0.7) {
          if (!(await until(h.crestFlick(), t))) return; // moving its crest
        } else if (roll < 0.87) {
          if (!(await until(h.preen(), t))) return;
        } else {
          if (!(await until(h.blinkOnce(true), t))) return;
        }
      }
    }

    /* ---- intent arbitration: exactly one live token ---- */
    function claim(): Token {
      token?.cancel();
      cancelAnimationFrame(raf);
      // Clears the rig's queue, stops every live pose animation on its
      // current value, and kills the glide flap loop, so the incoming
      // flight never has to fight the outgoing one for a wing.
      h.stop();
      const t = newToken();
      token = t;
      return t;
    }

    async function userFlight(x: number, y: number) {
      const t = claim();
      await flyTo(clampPt(x, y), t);
      if (t.cancelled) return;
      if (!(await until(h.express("happy", { hold: 300 }), t))) return;
      if (!(await until(h.express("content"), t))) return;
      await idle(t); // resume emoting wherever it landed
    }
    flyRef.current = (x, y) => void userFlight(x, y);

    // Already on the page: appear at the corner (no fly-in), a small hello,
    // then settle into the stationary idle loop.
    async function settleIn(t: Token) {
      const hm = home();
      setPos(hm.x, hm.y);
      reveal();
      if (!(await until(h.express("curious", { hold: 520 }), t))) return;
      if (!(await until(h.express("content"), t))) return;
      await idle(t);
    }

    // A resize can strand the bird outside the new viewport (e.g. it was
    // clicked to a spot that's now off-screen). Only intervene when it is
    // actually out of bounds, flying it back to the corner.
    const onResize = () => {
      const b = bounds();
      if (pos.x < b.minX || pos.x > b.maxX || pos.y < b.minY || pos.y > b.maxY) {
        const t = claim();
        void (async () => {
          await flyTo(home(), t);
          if (!t.cancelled) await idle(t);
        })();
      }
    };
    window.addEventListener("resize", onResize);

    const first = newToken();
    token = first;
    void settleIn(first);

    return () => {
      token?.cancel();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      flyRef.current = null;
      h.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo, M]);

  // Anywhere on the stage sends the bird, except the things a visitor
  // clicks because they mean them (the link, and any future control).
  const onStageDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.closest("a,button,[role=button],input,textarea,select"))
      return;
    flyRef.current?.(e.clientX, e.clientY);
  }, []);

  return (
    <main
      onPointerDown={onStageDown}
      className="relative flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center"
    >
      <h1 className="font-heading text-[clamp(4.25rem,13vw,6.5rem)] font-bold leading-[0.85] tracking-[-0.03em] text-leaf">
        404
      </h1>
      <h2 className="mt-[var(--space-s)] font-heading text-2xl font-bold tracking-[-0.01em] text-foreground">
        Page not found
      </h2>
      <p className="mt-[var(--space-xs)] leading-[1.7] text-muted-foreground sm:whitespace-nowrap">
        Looks like you wandered off the path. This page doesn&apos;t exist.
      </p>
      <Link href="/" className="mt-[var(--space-l)] inline-block">
        <Button variant="primary">Back to home</Button>
      </Link>

      {solo && (
        <div
          ref={wrapRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-20 opacity-0 will-change-transform"
          style={{ marginLeft: -M.footX, marginTop: -M.footY }}
        >
          <Hoopoe ref={ref} size={rig} />
        </div>
      )}
    </main>
  );
}
