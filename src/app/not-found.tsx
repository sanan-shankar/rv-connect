"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/moment-hoopoe";

/* ------------------------------------------------------------------ *
 *  The 404 hoopoe: the main character of this page, sized up front and
 *  centre above the heading, a mild puzzled look, then a short local
 *  flit to one side or the other, on a gentle loop between three
 *  perches near its own resting spot.
 *
 *  Reworked per the owner twice now: first, the old point-at-the-button
 *  beat "had no point" and read too sad for a page whose copy + layout
 *  were already praised (bird behaviour only). Second, the bird itself
 *  read too small for a page it is meant to headline -- it now sits in
 *  normal flow, in its own reserved box ABOVE the "404" numeral, sized
 *  to dominate the composition, instead of a small 64px figure
 *  scattered to corners of the whole content block.
 *
 *  Because the bird now has its own dedicated box (rather than roaming
 *  the full page), its perches are short lateral hops around that box's
 *  own centre -- comfortably inside its reserved footprint at both
 *  390px and 1440px -- rather than the old page-spanning corner spots.
 *
 *  Uses the cross-screen flight primitives (takeOff/glide/perch) rather
 *  than the queued flyTo: flyTo moves the puppet WITHIN its own SVG, so
 *  its usable "stage" is only ever as big as the bird's own render size
 *  (fine for a bounded demo card, not for hopping around its box).
 *  takeOff/glide/perch drive only the puppet's pose and are deliberately
 *  NOT queued (queuing takeoff would wedge the controller's pump, since
 *  glide supersedes its animation and a superseded motion `.finished`
 *  never resolves) -- exactly the same primitives the button-to-perch
 *  login flight in mascot-flight-layer.tsx drives from the outside. Here
 *  the "outside" is just this page's own rAF tween, translating a local
 *  wrapper instead of a portaled one, since there's no route change to
 *  survive.
 *
 *  One-hoopoe rule: `notFound()` thrown from a nested `(main)` route keeps
 *  that layout mounted underneath (sidebar + its resident hoopoe included),
 *  so this page's own bird is gated on `useSoloHoopoe()` -- same guard the
 *  ambient moment companions (no-results-hoopoe.tsx, empty-group-hoopoe.tsx,
 *  no-saved-hoopoe.tsx) already use. Unlike those, the bird here is only
 *  PART of this component (the 404 heading/copy/button are the rest), so
 *  only the bird's own reserved box + driving effect are gated -- the
 *  page's actual content always renders regardless of another hoopoe on
 *  screen (it just loses its own header illustration that one time).
 * ------------------------------------------------------------------ */

// Rig size: clearly the biggest thing on the page (the numeral is the next
// largest, at a 60px font-size) -- this is the headline illustration, not a
// corner ornament. One fixed size at both 390px and 1440px, same "not
// responsive, only the margin changes" reasoning the old spots comment
// used: 168px comfortably clears a 390px viewport's side padding with room
// to flit either side of centre.
const BIRD_SIZE = 168;
// The puppet's drawn body-centre sits at viewBox (60, 101) inside a
// "0 -10 120 152" box (120 wide, 152 tall) -- so at BIRD_SIZE width its
// rendered height is BIRD_SIZE * 152/120.
const BIRD_HEIGHT = (BIRD_SIZE * 152) / 120;
const ANCHOR_X = BIRD_SIZE / 2; // viewBox x60 of 120, for horizontal centring

// Three rest spots, expressed as a translate offset (px) from the box's own
// resting position (bottom-centre). Short lateral hops only -- the bird
// stays inside its own reserved box at both viewport widths, never
// wandering toward the heading/copy/button below it.
const SPOTS = [
  { x: 0, y: 0 }, // A: centred, at rest
  { x: 46, y: 0 }, // B: a short hop right
  { x: -46, y: 0 }, // C: a short hop left
] as const;

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
// Quintic smoothstep: the same easing family the cross-page flight layer
// uses for its cruise arc (gentle in/out, no snap at either end).
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function NotFound() {
  const { ref, ...h } = useHoopoe();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const solo = useSoloHoopoe();

  useEffect(() => {
    // Gate the whole loop on the one-hoopoe rule: if another bird is
    // already on screen (e.g. the sidebar's resident, sleeping in the
    // corner of the (main) layout this notFound() render sits inside),
    // this page's own bird never mounts, so there is nothing to drive.
    if (!solo) return;

    let cancelled = false;
    let spotIndex = 0;

    const setPos = (x: number, y: number) => {
      const el = wrapRef.current;
      if (el) el.style.transform = `translate(${x}px, ${y}px)`;
    };
    setPos(SPOTS[0].x, SPOTS[0].y);

    // Respect prefers-reduced-motion for this looping, page-spanning
    // flight specifically: land once at spot A and stop there. (The rig's
    // own subtle idle breathe/blink/sparkle keeps running regardless --
    // that governor is a locked, app-wide decision, see hoopoe-kit.ts --
    // it's the repeated hop-around-the-page loop that stops here.)
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const tween = (durMs: number, onFrame: (t: number) => void): Promise<void> =>
      new Promise((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
          if (cancelled) return resolve();
          const t = clamp01((now - start) / durMs);
          onFrame(t);
          if (t >= 1) return resolve();
          rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
      });

    async function flyToSpot(from: { x: number; y: number }, to: { x: number; y: number }) {
      const dir: 1 | -1 = to.x >= from.x ? 1 : -1;
      void h.takeOff();
      await sleep(120);
      if (cancelled) return;
      h.glide(dir);
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const peak = Math.min(50, 22 + dist * 0.16);
      const durMs = Math.min(760, 480 + dist * 0.9);
      await tween(durMs, (t) => {
        const e = smoother(t);
        const arch = Math.sin(Math.PI * t);
        setPos(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e - peak * arch);
      });
      if (cancelled) return;
      setPos(to.x, to.y);
      await h.perch();
    }

    async function loop() {
      await sleep(1000); // a beat, freshly perched
      while (!cancelled) {
        // A mild puzzled, searching look -- never the deep-sad chord.
        await h.express("curious", { hold: 260 });
        if (cancelled) return;
        h.gaze(-0.65);
        await sleep(380);
        if (cancelled) return;
        h.gaze(0.65);
        await sleep(380);
        if (cancelled) return;
        h.gaze(0);
        await h.express("content");
        if (cancelled) return;

        const from = SPOTS[spotIndex];
        spotIndex = (spotIndex + 1) % SPOTS.length;
        const to = SPOTS[spotIndex];
        await flyToSpot(from, to);
        if (cancelled) return;

        await h.express(Math.random() < 0.7 ? "happy" : "content", { hold: 200 });
        if (cancelled) return;
        await sleep(1700 + Math.random() * 900); // a beat, settled
      }
    }

    void loop();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex flex-col items-center">
        {/* The bird's own stage: reserved height clears its full rendered
            body plus the hop arc's peak, so it's never clipped and never
            crowds the heading below. Bottom-anchored (not centred) so the
            reserved space matches where the puppet's feet actually sit,
            instead of wasting half the box below them. */}
        {solo && (
          <div
            className="relative mb-[var(--space-m)] w-[260px]"
            style={{ height: BIRD_HEIGHT + 56 }}
          >
            <div
              ref={wrapRef}
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-1/2 will-change-transform"
              style={{
                marginLeft: -ANCHOR_X,
                transform: `translate(${SPOTS[0].x}px, ${SPOTS[0].y}px)`,
              }}
            >
              <Hoopoe ref={ref} size={BIRD_SIZE} />
            </div>
          </div>
        )}

        <h1 className="font-heading text-6xl font-bold text-leaf">404</h1>
        <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Looks like you wandered off the path. This page doesn&apos;t exist.
        </p>
        <Link href="/" className="mt-6">
          <Button variant="primary">
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
