"use client";

/* ------------------------------------------------------------------ *
 *  usePinchZoom - the gesture layer under the full-screen ImageViewer.
 *
 *  The viewer could show a photograph edge to edge but never let you
 *  get closer to it, which is the one thing an archive of scanned
 *  1970s prints is for: reading a face in the back row, a name on a
 *  hand-painted board. Every other photo surface in the world zooms;
 *  this one silently did not.
 *
 *  ONE state machine owns every pointer, and that is the whole design.
 *  The version before this handed horizontal swiping to Motion's
 *  `drag="x"`, which knows about exactly one finger: a second finger
 *  landing on the photograph did not start a pinch, it kept dragging.
 *  There is no way to bolt a two-finger gesture onto a one-finger
 *  library without the two fighting over the same pointer, so the
 *  swipe moved in here alongside the pinch. Its numbers are carried
 *  over unchanged and deliberately -- 14% elastic follow, a 70px or
 *  420px/s release, no overshoot on the way back -- because that feel
 *  was settled with the owner and this is a gesture rewrite, not a
 *  re-tuning.
 *
 *  What each input does:
 *
 *    two fingers   pinch, anchored on the midpoint you started with,
 *                  panning as that midpoint travels
 *    one finger    pans when zoomed in, steps photographs when not
 *    double tap    2.5x on the point you hit, and back to fit again
 *    trackpad      a pinch arrives as a wheel event with ctrlKey set,
 *                  which is the only way a browser reports it
 *    wheel         zooms about the cursor, since a mouse has no pinch
 *    + - 0         the keyboard's way in
 *
 *  Two decisions worth stating, because both look wrong until you know
 *  what they are for:
 *
 *  1. A SINGLE TAP ON THE PHOTOGRAPH IS HELD FOR 240ms. It has to be:
 *     the first tap of a double tap is indistinguishable from a single
 *     one until the window closes, and firing the chrome toggle
 *     immediately would flash the chrome in and out under every zoom.
 *     Only the tap that lands ON the photograph waits. A tap on the
 *     backdrop closes the viewer with no delay at all, because closing
 *     is the one thing that must never feel hesitant, and a double tap
 *     out there means nothing anyway.
 *  2. HOW FAR IN YOU CAN GO IS THE FILE'S OWN LIMIT, not a constant.
 *     The owner has twice objected to seeing photographs upscaled into
 *     grain, so the ceiling is where the file's own pixels land 1:1 on
 *     the screen -- a 6000px scan on a 1350px stage goes to 4.4x and
 *     stops with real detail still arriving. The floor of 4x is for
 *     small files, where SOME magnification is worth more than a
 *     promise about sharpness; the cap of 8x is so a thumbnail-sized
 *     file cannot be pushed to absurdity.
 *
 *  Panning is clamped continuously rather than rubber-banded back on
 *  release: the photograph's edge simply stops at the screen's edge, so
 *  you can never lose it off-screen and have to hunt for it.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { animate, useMotionValue } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Zoom floor and ceiling around the file's own 1:1 point. See note 2 above. */
const MIN_CEILING = 4;
const MAX_CEILING = 8;
/** Where a double tap lands. Enough to read a face, little enough that one
 *  more double tap (back to fit) is never a long way home. */
const DOUBLE_TAP_SCALE = 2.5;
/** One standard 100px wheel notch multiplies by e^0.2 (~1.22x) -- the same
 *  rate the avatar cropper uses, so the two zooms feel like one product. */
const WHEEL_RATE = 0.002;
/** A trackpad pinch arrives as ctrl+wheel in deltas of a few units, so it
 *  needs a much larger multiplier to travel the same distance. */
const PINCH_WHEEL_RATE = 0.01;

/* The swipe, carried over verbatim from the Motion drag it replaces:
   dragConstraints of {0,0} with dragElastic 0.14 meant the photograph only
   ever followed 14% of the finger, while the 70px / 420px-per-second release
   test read the FINGER's travel, not the photograph's. */
const SWIPE_FOLLOW = 0.14;
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 420;

/** Past this much travel a press is a gesture and can no longer become a tap. */
const TAP_SLOP = 10;
/** And past this long it is a hold, not a tap. */
const TAP_MS = 320;
/** The double-tap window, and so also how long a single tap on the
 *  photograph is held before it counts. */
const DOUBLE_TAP_MS = 240;
/** Two taps further apart than this are two taps, however fast. */
const DOUBLE_TAP_SLOP = 40;

/** Everything that settles -- a double tap, a keyboard step, the swipe
 *  returning to rest -- lands on the same curve, which has no overshoot in
 *  it (DESIGN-SYSTEM sec. 7: a photograph must not wobble). */
const SETTLE = { duration: 0.28, ease: EASE_OUT_SMOOTH } as const;
const SWIPE_RETURN = { duration: 0.24, ease: EASE_OUT_SMOOTH } as const;

export function usePinchZoom({
  enabled,
  canSwipe,
  onStep,
  onTapPhoto,
  onTapBackdrop,
}: {
  /** The viewer is open. Nothing listens while it is not. */
  enabled: boolean;
  /** There is somewhere to swipe TO. A lone photograph must not follow the
   *  finger 14% of the way and spring back to nothing. */
  canSwipe: boolean;
  /** A swipe crossed its release test. The caller steps and resets. */
  onStep: (dir: 1 | -1) => void;
  /** A single tap that landed on the photograph itself. */
  onTapPhoto: () => void;
  /** A single tap on the wash beside it. */
  onTapBackdrop: () => void;
}) {
  /* Motion values, not state: a pinch runs at the rate of the fingers and
     must never re-render this component, let alone the viewer above it. */
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  /** The whole stage's horizontal follow during a swipe. Separate from `x`
   *  because it belongs to a different element: the photograph's own pan
   *  must survive a step, and the swipe must not. */
  const swipeX = useMotionValue(0);

  /* The ONE thing the outside needs to re-render on: whether we are zoomed.
     It changes twice a gesture at most, not sixty times a second. */
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => scale.on("change", (v) => setZoomed(v > 1.01)), [scale]);

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  /* A callback ref that ignores null. The viewer cross-dissolves two frames,
     so during a step the OUTGOING <img> unmounts after the incoming one has
     mounted; taking its null would leave us measuring nothing. */
  const setImage = useCallback((el: HTMLImageElement | null) => {
    if (el) imgRef.current = el;
  }, []);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const mode = useRef<"none" | "swipe" | "pan" | "pinch">("none");
  /* Everything a gesture needs to know about the moment it began. Anchoring
     to the START of a pinch rather than to the previous frame is what keeps
     it from drifting: float error cannot accumulate over a gesture that is
     recomputed from one fixed origin every move. */
  const from = useRef({
    px: 0, py: 0, // the finger, or the midpoint of two
    tx: 0, ty: 0, // the photograph's translation
    scale: 1,
    dist: 1, // finger separation
    cx: 0, cy: 0, // the photograph's untransformed centre, in screen px
    at: 0, // when
  });
  const trail = useRef({ px: 0, py: 0, at: 0, vx: 0 });
  const moved = useRef(false);
  const lastTap = useRef({ at: 0, px: 0, py: 0 });
  const pendingTap = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingTap = () => {
    if (pendingTap.current) clearTimeout(pendingTap.current);
    pendingTap.current = null;
  };

  /** The photograph's size at rest, computed rather than measured.
   *
   *  `max-w-full max-h-full` on an image with intrinsic dimensions is exactly
   *  "shrink to fit, never grow", so this is the browser's own arithmetic --
   *  and it is arithmetic rather than `offsetWidth` because offsetWidth is
   *  ROUNDED TO A WHOLE PIXEL. Half a pixel of rounding becomes four at 8x,
   *  which is a hairline of backdrop showing down the edge of a photograph
   *  panned hard against the side of the screen. Measured at 0.9px on a
   *  654.5px-wide photograph before this was arithmetic. */
  const fitted = useCallback(() => {
    const img = imgRef.current;
    const nw = img?.naturalWidth ?? 0;
    const nh = img?.naturalHeight ?? 0;
    if (!nw || !nh) return { w: img?.offsetWidth ?? 0, h: img?.offsetHeight ?? 0, fit: 1 };
    const fit = Math.min(1, window.innerWidth / nw, window.innerHeight / nh);
    return { w: nw * fit, h: nh * fit, fit };
  }, []);

  /** How far the photograph may travel before its own edge would come inside
   *  the screen's. Zero on an axis the photograph does not overflow: there is
   *  nothing to look around, so it stays centred. */
  const limits = useCallback(
    (s: number) => {
      const { w, h } = fitted();
      return {
        maxX: Math.max(0, (w * s - window.innerWidth) / 2),
        maxY: Math.max(0, (h * s - window.innerHeight) / 2),
      };
    },
    [fitted]
  );

  const ceiling = useCallback(() => {
    const img = imgRef.current;
    const { fit } = fitted();
    if (!img?.naturalWidth || !fit) return MIN_CEILING;
    /* 1/fit is the scale at which the file's own pixels land 1:1 on the
       screen. A photograph already shown at its natural size has fit === 1
       and so no headroom at all, which is what the floor is for. */
    return clamp(1 / fit, MIN_CEILING, MAX_CEILING);
  }, [fitted]);

  /** The photograph's centre as it would sit with no transform on it. Read
   *  by subtracting the transform back out of the live rect, so it is right
   *  whatever state the gesture is in. */
  const centre = useCallback(() => {
    const img = imgRef.current;
    if (!img) return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
    const r = img.getBoundingClientRect();
    return {
      cx: r.left + r.width / 2 - x.get() - swipeX.get(),
      cy: r.top + r.height / 2 - y.get(),
    };
  }, [x, y, swipeX]);

  /* Scale about a fixed screen point, keeping whatever is under it under it.
     With `translate(t) scale(s)` about the box's centre c, the content at
     screen point p sits at u = (p - c - t)/s; solving for the t' that keeps
     u under p at s' gives t' = (p - c)(1 - s'/s) + t*(s'/s). */
  const zoomAbout = useCallback(
    (px: number, py: number, next: number, settle: boolean) => {
      const s0 = scale.get();
      const s1 = clamp(next, 1, ceiling());
      const k = s1 / s0;
      const { cx, cy } = centre();
      const { maxX, maxY } = limits(s1);
      const nx = clamp((px - cx) * (1 - k) + x.get() * k, -maxX, maxX);
      const ny = clamp((py - cy) * (1 - k) + y.get() * k, -maxY, maxY);
      if (settle) {
        animate(scale, s1, SETTLE);
        animate(x, nx, SETTLE);
        animate(y, ny, SETTLE);
      } else {
        scale.set(s1);
        x.set(nx);
        y.set(ny);
      }
    },
    [scale, x, y, ceiling, centre, limits]
  );

  /** Back to fitting the screen, with no animation. The caller uses this on
   *  every step and every open, where a photograph must arrive already at
   *  rest rather than visibly unwinding the last one's zoom. */
  const reset = useCallback(() => {
    for (const v of [scale, x, y, swipeX]) v.stop();
    scale.set(1);
    x.set(0);
    y.set(0);
    swipeX.set(0);
    cancelPendingTap();
    mode.current = "none";
  }, [scale, x, y, swipeX]);

  /** The keyboard's way in and out: about the middle of the screen, since
   *  there is no cursor to anchor to. */
  const zoomByStep = useCallback(
    (factor: number) => {
      zoomAbout(window.innerWidth / 2, window.innerHeight / 2, scale.get() * factor, true);
    },
    [zoomAbout, scale]
  );

  /** Ease back to fitting the screen. Esc's first stop while zoomed. */
  const settleToFit = useCallback(() => {
    animate(scale, 1, SETTLE);
    animate(x, 0, SETTLE);
    animate(y, 0, SETTLE);
  }, [scale, x, y]);

  const beginDrag = useCallback(
    (p: { x: number; y: number }) => {
      const now = performance.now();
      mode.current = scale.get() > 1.01 ? "pan" : canSwipe ? "swipe" : "none";
      from.current = {
        ...from.current,
        px: p.x,
        py: p.y,
        tx: x.get(),
        ty: y.get(),
        scale: scale.get(),
        at: now,
      };
      trail.current = { px: p.x, py: p.y, at: now, vx: 0 };
    },
    [scale, x, y, canSwipe]
  );

  const beginPinch = useCallback(() => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    /* A swipe in progress is abandoned the instant a second finger lands:
       you are no longer going anywhere, you are looking closer. */
    swipeX.stop();
    swipeX.set(0);
    mode.current = "pinch";
    moved.current = true; // a pinch can never be mistaken for a tap
    const { cx, cy } = centre();
    from.current = {
      px: (a.x + b.x) / 2,
      py: (a.y + b.y) / 2,
      tx: x.get(),
      ty: y.get(),
      scale: scale.get(),
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      cx,
      cy,
      at: performance.now(),
    };
  }, [centre, scale, swipeX, x, y]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button > 0) return; // right and middle click are not gestures
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      moved.current = false;
      beginDrag({ x: e.clientX, y: e.clientY });
    } else if (pointers.current.size === 2) {
      beginPinch();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (mode.current === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const s1 = clamp((from.current.scale * dist) / from.current.dist, 1, ceiling());
      const k = s1 / from.current.scale;
      const { maxX, maxY } = limits(s1);
      /* Scale about where the fingers started, then carry the photograph
         along by however far their midpoint has since travelled -- so a
         pinch that also slides pans while it zooms, as every phone does. */
      const nx = (from.current.px - from.current.cx) * (1 - k) + from.current.tx * k + (midX - from.current.px);
      const ny = (from.current.py - from.current.cy) * (1 - k) + from.current.ty * k + (midY - from.current.py);
      scale.set(s1);
      x.set(clamp(nx, -maxX, maxX));
      y.set(clamp(ny, -maxY, maxY));
      return;
    }

    const dx = e.clientX - from.current.px;
    const dy = e.clientY - from.current.py;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) moved.current = true;

    if (mode.current === "pan") {
      const { maxX, maxY } = limits(scale.get());
      x.set(clamp(from.current.tx + dx, -maxX, maxX));
      y.set(clamp(from.current.ty + dy, -maxY, maxY));
    } else if (mode.current === "swipe") {
      swipeX.set(dx * SWIPE_FOLLOW);
    }

    const now = performance.now();
    const dt = now - trail.current.at;
    if (dt > 0) {
      trail.current = {
        px: e.clientX,
        py: e.clientY,
        at: now,
        vx: ((e.clientX - trail.current.px) / dt) * 1000,
      };
    }
  };

  const tap = useCallback(
    (px: number, py: number) => {
      const img = imgRef.current;
      const r = img?.getBoundingClientRect();
      const onPhoto = !!r && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
      if (!onPhoto) {
        cancelPendingTap();
        lastTap.current = { at: 0, px: 0, py: 0 };
        onTapBackdrop();
        return;
      }
      const now = performance.now();
      const isSecond =
        now - lastTap.current.at < DOUBLE_TAP_MS &&
        Math.hypot(px - lastTap.current.px, py - lastTap.current.py) < DOUBLE_TAP_SLOP;
      if (isSecond) {
        cancelPendingTap();
        lastTap.current = { at: 0, px: 0, py: 0 };
        if (scale.get() > 1.01) settleToFit();
        else zoomAbout(px, py, DOUBLE_TAP_SCALE, true);
        return;
      }
      lastTap.current = { at: now, px, py };
      pendingTap.current = setTimeout(() => {
        pendingTap.current = null;
        onTapPhoto();
      }, DOUBLE_TAP_MS);
    },
    [onTapBackdrop, onTapPhoto, scale, settleToFit, zoomAbout]
  );

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const was = mode.current;

    if (pointers.current.size >= 2) {
      beginPinch(); // a third finger left; re-anchor on the two still down
      return;
    }
    if (pointers.current.size === 1) {
      /* One of a pinch's two fingers lifted. The other one keeps going as a
         pan, from where it is now, rather than jumping to wherever the pinch
         midpoint was. */
      const [rest] = [...pointers.current.values()];
      beginDrag(rest);
      return;
    }

    mode.current = "none";
    if (was === "swipe") {
      const dx = e.clientX - from.current.px;
      const vx = trail.current.vx;
      if (dx < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY) onStep(1);
      else if (dx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY) onStep(-1);
      animate(swipeX, 0, SWIPE_RETURN);
    }
    /* Almost all the way out is all the way out: nobody means to leave a
       photograph at 1.02x, and the difference is a softened edge. Checked on
       every release, not just a pinch's, because a pinch that ends one
       finger at a time finishes as a pan. */
    const s = scale.get();
    if (s > 1 && s < 1.05) settleToFit();

    if (!moved.current && performance.now() - from.current.at < TAP_MS) {
      tap(e.clientX, e.clientY);
    }
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      mode.current = "none";
      animate(swipeX, 0, SWIPE_RETURN);
    }
  };

  /* Wheel needs a NATIVE non-passive listener: React registers wheel as
     passive, and a passive handler cannot preventDefault -- which here would
     let the browser zoom the whole page behind the overlay while a trackpad
     pinch zoomed the photograph, two zooms at once. */
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || !enabled) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rate = e.ctrlKey ? PINCH_WHEEL_RATE : WHEEL_RATE;
      zoomAbout(e.clientX, e.clientY, scale.get() * Math.exp(-e.deltaY * rate), false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, zoomAbout, scale]);

  /* A pending tap must not outlive the viewer: closing while one is in
     flight would toggle the chrome of a viewer that is no longer there. */
  useEffect(() => {
    if (enabled) return;
    pointers.current.clear();
    cancelPendingTap();
  }, [enabled]);
  useEffect(() => cancelPendingTap, []);

  return {
    scale,
    x,
    y,
    swipeX,
    zoomed,
    reset,
    settleToFit,
    zoomByStep,
    surfaceRef,
    setImage,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel,
    },
  };
}
