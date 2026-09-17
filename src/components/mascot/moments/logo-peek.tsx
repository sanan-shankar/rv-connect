"use client";

/* ------------------------------------------------------------------ *
 *  <LogoPeek> — the app icon, life-size.
 *
 *  Three fast clicks on the sidebar logo, and the hoopoe from the app icon
 *  rises over the bottom edge of the whole screen, the way it peeks over
 *  the bottom of its tile: slowly, over six seconds, so for a while it is
 *  only a crest coming up and you are not sure what is happening. At the
 *  top it blinks, snaps its crest open, looks at the logo you clicked and
 *  then follows your pointer. Then it ducks back down, fast, like it has
 *  been caught. Any click or key while it is up makes it duck early.
 *
 *  Owner, 2026-09-17: "have the hoopoe slowly rise from fully hidden under
 *  to that peeking height slowly maybe in 6 seconds and have it basically
 *  fill the width of the screen and then maybe a quick crest flick or
 *  something then it goes down."
 *
 *  THE ARTWORK IS THE ICON'S, not the rig. `peekParts()` is the geometry the
 *  icon is built from, split into crest, head and eyes so each can move, and
 *  Apple's edge light (`edgeLightFilter`) is the same filter the Android icon
 *  bakes in. The rig would have been a different bird: nine feathers, not
 *  eleven, and a body.
 *
 *  The parts move by writing SVG `transform` ATTRIBUTES with explicit pivots
 *  (`rotate(a 60 37)`), not CSS transforms. A CSS transform-origin on an SVG
 *  child is resolved differently by Chrome and WebKit (hoopoe.tsx's RIG_CSS
 *  note), and an attribute pivot is not.
 * ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { animate, useAnimate, useMotionValue, useSpring } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";
import { PEEK_VIEW, PEEK_VIEW_BOX, peekParts, primsToSvg } from "@/lib/hoopoe-geometry";
import { edgeLightFilter } from "@/lib/edge-light";

// The owner's number. Long enough that the first second or two is only
// feather tips, which is where the "what is that" comes from.
const RISE_S = 6;
// The duck. Nearly ten times faster than the rise: the joke is that it took
// its time coming up and leaves the instant it is noticed.
const DUCK_S = 0.5;
// How long it stays up, looking about, after the crest snap.
const HOLD_MS = 1800;

// The artwork's own extent inside PEEK_VIEW, in the rig's 120 space: the
// crest's outermost tips span x 26..94 (68 wide), its top tip sits near y 0,
// and the window's bottom edge (y 59) cuts across the eyes, which is the peek.
const ART_WIDTH = 68;
const ART_TOP = 0;
const PEEK_BOTTOM = PEEK_VIEW.y + PEEK_VIEW.size;
// On a laptop, filling the width would make the bird taller than the screen
// and push the crest off the top, which loses the silhouette that makes it
// the icon. So it fills the width until the peek would stand taller than this
// share of the screen, and stops there.
const MAX_HEIGHT_SHARE = 0.78;

// How far the pupils travel when it looks at something, in the rig's units.
// The eye is 7.7 across; more than a unit and a half and the dark of the eye
// slides off its own highlight.
const GAZE_UNITS = 1.5;

// One unit of the 78-unit window at the weight /lab/glass-edges chose for the
// icon. Shadow off: there is no tile under this bird to cast onto.
const EDGE_ID = "logo-peek-edge";
const EDGE = edgeLightFilter({ id: EDGE_ID, u: 0.85, shadow: 0 });

const PARTS = peekParts();
const CREST = primsToSvg(PARTS.crest);
const HEAD = primsToSvg(PARTS.head);
const EYES = primsToSvg(PARTS.eyes);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function LogoPeek({
  lookFirstAt,
  onDone,
}: {
  /** Where it looks first once it is up: the logo that summoned it. */
  lookFirstAt: { x: number; y: number } | null;
  onDone: () => void;
}) {
  const [scope, animateBox] = useAnimate<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const crestRef = useRef<SVGGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  const gazeX = useMotionValue(0);
  const gazeY = useMotionValue(0);
  const eyeX = useSpring(gazeX, SPRINGS.gentle);
  const eyeY = useSpring(gazeY, SPRINGS.gentle);
  const blink = useRef(1);

  /* Sized once, at the click. The bird is on screen for under ten seconds;
     following a resize mid-rise would buy nothing anyone could see. */
  const size = useRef<number | null>(null);
  if (size.current === null && typeof window !== "undefined") {
    const perUnit = Math.min(
      window.innerWidth / ART_WIDTH,
      (window.innerHeight * MAX_HEIGHT_SHARE) / (PEEK_BOTTOM - ART_TOP)
    );
    size.current = PEEK_VIEW.size * perUnit;
  }
  const px = size.current ?? 0;
  // How far down it has to be to be out of sight: the crest's top tip to the
  // bottom edge, plus a sliver. Hiding it by its whole box instead spent the
  // first second and a half of the rise moving nothing but empty window.
  const hidden = (px * (PEEK_BOTTOM - ART_TOP)) / PEEK_VIEW.size + 4;

  useEffect(() => {
    const eyes = eyesRef.current;
    const crest = crestRef.current;
    const box = scope.current;
    const svg = svgRef.current;
    if (!eyes || !crest || !box || !svg) return;

    const setBlink = (v: number) => {
      blink.current = v;
      drawEyes();
    };
    const drawEyes = () => {
      const k = blink.current;
      eyes.setAttribute(
        "transform",
        `translate(${eyeX.get()} ${eyeY.get()}) translate(0 61) scale(1 ${k}) translate(0 -61)`
      );
    };
    const offX = eyeX.on("change", drawEyes);
    const offY = eyeY.on("change", drawEyes);

    /** Point the pupils at a screen point, clamped to the eye. */
    const lookAt = (x: number, y: number) => {
      const r = svg.getBoundingClientRect();
      // The face's centre on screen: x 60, y 56 in the rig's space.
      const fx = r.left + ((60 - PEEK_VIEW.x) / PEEK_VIEW.size) * r.width;
      const fy = r.top + ((56 - PEEK_VIEW.y) / PEEK_VIEW.size) * r.height;
      const dx = x - fx;
      const dy = y - fy;
      const d = Math.hypot(dx, dy) || 1;
      gazeX.set((dx / d) * GAZE_UNITS);
      gazeY.set((dy / d) * GAZE_UNITS);
    };

    let ducking = false;
    let cancelled = false;
    const duckEarly = () => void duck();
    const onMove = (e: PointerEvent) => lookAt(e.clientX, e.clientY);

    const duck = async () => {
      if (ducking) return;
      ducking = true;
      window.removeEventListener("pointermove", onMove);
      await animateBox(box, { y: hidden }, { duration: DUCK_S, ease: "easeIn" });
      if (!cancelled) onDone();
    };

    const play = async () => {
      window.addEventListener("pointerdown", duckEarly);
      window.addEventListener("keydown", duckEarly);

      // Comes up with the crest half folded, so the fan opening at the top
      // is an event and not just the end of the rise.
      crest.setAttribute("transform", "translate(60 37) scale(0.72 1) translate(-60 -37)");
      await animateBox(box, { y: [hidden, 0] }, { duration: RISE_S, ease: "easeInOut" });
      if (ducking || cancelled) return;

      // Blink, the way anything does when it gets somewhere.
      await animate(1, 0.06, { duration: 0.09, ease: "easeIn", onUpdate: setBlink });
      await animate(0.06, 1, { duration: 0.12, ease: "easeOut", onUpdate: setBlink });
      if (ducking || cancelled) return;

      // The crest snaps open past full and flicks back, then looks at the logo.
      if (lookFirstAt) lookAt(lookFirstAt.x, lookFirstAt.y);
      await animate(0, 1, {
        duration: 0.55,
        ease: EASE_POP,
        onUpdate: (t) => {
          const spread = 0.72 + 0.28 * t;
          const tilt = Math.sin(t * Math.PI * 2) * -5 * (1 - t * 0.6);
          const lift = 1 + Math.sin(t * Math.PI) * 0.08;
          crest.setAttribute(
            "transform",
            `translate(60 37) rotate(${tilt}) scale(${spread} ${lift}) translate(-60 -37)`
          );
        },
      });
      if (ducking || cancelled) return;

      window.addEventListener("pointermove", onMove);
      await sleep(HOLD_MS);
      if (!cancelled) await duck();
    };

    void play();
    return () => {
      cancelled = true;
      offX();
      offY();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", duckEarly);
      window.removeEventListener("keydown", duckEarly);
    };
    // Runs once per summon; everything it reads is fixed at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Portalled to <body>: it is mounted from inside the sidebar, and a fixed
     layer under any ancestor with a transform or a backdrop filter is fixed
     to THAT ancestor instead of the screen. */
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <div
        ref={scope}
        className="absolute bottom-0 left-1/2 will-change-transform"
        style={{ width: px, height: px, marginLeft: -px / 2, transform: `translateY(${hidden}px)` }}
      >
        {/* `hoopoe-mascot` so the one-hoopoe guard sees it: nothing else should
            glide in (the sidebar sleeper) while the whole screen is this bird. */}
        <svg ref={svgRef} viewBox={PEEK_VIEW_BOX} width={px} height={px} className="hoopoe-mascot block">
          <defs dangerouslySetInnerHTML={{ __html: EDGE }} />
          <g filter={`url(#${EDGE_ID})`}>
            <g ref={crestRef} dangerouslySetInnerHTML={{ __html: CREST }} />
            <g dangerouslySetInnerHTML={{ __html: HEAD }} />
            <g ref={eyesRef} dangerouslySetInnerHTML={{ __html: EYES }} />
          </g>
        </svg>
      </div>
    </div>,
    document.body
  );
}
