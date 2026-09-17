"use client";

/* ------------------------------------------------------------------ *
 *  <FlyAwayHoopoe> — a bird that takes off from a spot on the screen and
 *  flies up and out of the top of the viewport, then unmounts itself.
 *
 *  Made for the end of the contribute pop-up: "See them in the Collection"
 *  closes the pop-up, and the bird that was sitting in it leaves ahead of
 *  you instead of vanishing with the glass. The bird in the pop-up cannot
 *  do that itself -- it would be clipped by the pop-up's scroll box and
 *  unmounted with it 200ms later -- so the caller hides that one and mounts
 *  this in its place, from a component that outlives the pop-up.
 *
 *  Same pose primitives the 404 and the landing flight use (takeOff, glide):
 *  the rig flaps, this file owns the travel.
 * ------------------------------------------------------------------ */

import { useRef } from "react";
import { createPortal } from "react-dom";
import { useAnimate } from "motion/react";
import { EASE_IN_OUT_SCENE } from "@/components/common/motion";
import { Hoopoe } from "@/components/mascot/hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";

// How long the climb out takes. It is a scene-scale move (the bird crosses
// most of the screen), so it gets the scene curve and a duration the eye can
// follow, but it has to be gone before anyone has started looking at the page
// the pop-up revealed.
const FLIGHT_S = 1.2;
// How far right it drifts on the way up. A straight vertical climb reads as
// being yanked off the screen; a diagonal reads as flying somewhere.
const DRIFT_PX = 170;
// The wings go up and the body crouches before the flapping starts; without
// the beat the bird is flapping before it has left the ground.
const LAUNCH_CROUCH_MS = 90;
// About the time the climb takes to lift the feet clear of where they stood.
const SHADOW_FADE_S = 0.25;

export function FlyAwayHoopoe({
  from,
  size,
  onGone,
}: {
  /** The resting bird's rect, measured at the click, in viewport pixels. */
  from: { left: number; top: number; bottom: number };
  size: number;
  onGone: () => void;
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const started = useRef(false);

  function handleReady(api: HoopoeApi) {
    if (started.current) return;
    started.current = true;
    // Deferred one tick past mount, the same guard sidebar-hoopoe.tsx and the
    // logo egg carry: Strict Mode's simulated unmount in development stops
    // animations started synchronously inside onReady.
    setTimeout(async () => {
      const box = scope.current;
      if (!box) return onGone();
      void api.takeOff();
      // The crouch before the push, as the 404's flight does it.
      await new Promise((r) => setTimeout(r, LAUNCH_CROUCH_MS));
      api.glide(1);
      /* The ground shadow is drawn inside the rig, so left alone it rides up
         with the bird like a disc stuck to its feet. A bird that is leaving
         leaves its shadow behind: it fades as the feet come off the ground. */
      const shadow = box.querySelector('[data-part="shadow"]');
      if (shadow) void animate(shadow, { opacity: 0 }, { duration: SHADOW_FADE_S });
      // Two curves on two axes make the arc: the drift leads and eases off,
      // the climb starts slow and speeds up, so the path bends from "off to
      // the right" into "up and away" with no keyframe to hitch on. The drift
      // is a plain easeOut, not EASE_OUT_SMOOTH, which starts at full speed
      // and threw the bird sideways before it had visibly taken off.
      await Promise.all([
        animate(box, { x: DRIFT_PX }, { duration: FLIGHT_S, ease: "easeOut" }),
        // Clears its own height plus a margin past the top edge, wherever it started.
        animate(box, { y: -(from.bottom + 40) }, { duration: FLIGHT_S, ease: EASE_IN_OUT_SCENE }),
      ]);
      onGone();
    }, 0);
  }

  return createPortal(
    <div
      ref={scope}
      aria-hidden
      /* z-[70]: the same layer the landing's cross-page flight uses, above the
         dialog (z-50) it is leaving. */
      className="pointer-events-none fixed z-[70] will-change-transform"
      style={{ left: from.left, top: from.top }}
    >
      <Hoopoe size={size} idle={false} pokeable={false} onReady={handleReady} />
    </div>,
    document.body
  );
}
