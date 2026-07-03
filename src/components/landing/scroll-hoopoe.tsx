"use client";

import { useEffect, useRef, useState } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { useMotionGovernor } from "@/components/common/motion";

/* ------------------------------------------------------------------ *
 *  ScrollHoopoe — the ONE mascot, as a landing scroll companion.
 *
 *  It perches in the margin beside the showcase frame you are reading
 *  and rides along as you scroll, gliding to the next frame's margin as
 *  a new section takes over (a calm smoothed follow, so a fast scroll
 *  just relocates it with no theatrics). It gazes at what you are
 *  reading, gives the odd crest flick, and at two frames points at the
 *  screenshot annotation. It always sits in the outer margin, never over
 *  the text, and stays out of the hero and the closing band.
 *
 *  One character rule: only ever this instance is visible. The hero's
 *  slow-load loader hoopoe is gone before you can scroll here, and this
 *  one stays hidden until you are past the hero, so the two are never on
 *  screen together. Motion always plays (design system).
 * ------------------------------------------------------------------ */

// Frames whose annotation is worth a point (directory avatar note, collection
// contribute note). Both are right-column frames, so the bird points left.
const POINT_AT = new Set([0, 4]);

export function ScrollHoopoe() {
  const { ref, ...h } = useHoopoe();
  const layerRef = useRef<HTMLDivElement>(null);
  const perchRef = useRef<HTMLDivElement>(null);
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const [mounted, setMounted] = useState(false); // lazily render the Hoopoe once it first activates
  const mountedRef = useRef(false);

  // SSR-safe responsive size: desktop default until mount (no hydration mismatch).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // At phone widths the showcase frame sits in a 24px page gutter (px-6), so
  // there is only ~24px of true margin to perch in beside it. Trim the bird
  // and its clearances to fit that margin cleanly instead of clamping hard
  // against the viewport edge and lapping onto the frame.
  const SIZE = isMobile ? 26 : 78;
  const EDGE_GAP = isMobile ? 5 : 10; // clearance from the frame's own edge
  const EDGE_INSET = isMobile ? 5 : 6; // clearance from the true viewport edge

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const shots = () => Array.from(document.querySelectorAll<HTMLElement>("[data-shot]"));

    // Hide over the closing CTA band (the footer already carries the mascot's
    // family; a bird over the centred closing copy would read as blocking).
    let atClosing = false;
    const cta = document.getElementById("closing-cta");
    const io = cta
      ? new IntersectionObserver(([e]) => (atClosing = e.isIntersecting), { threshold: 0.2 })
      : null;
    if (cta && io) io.observe(cta);

    // eased position + opacity
    let curX = 0;
    let curY = 0;
    let curOp = 0;
    let placed = false;
    let activeIndex = -1;

    let gestureTimer: ReturnType<typeof setTimeout> | undefined;
    const runGesture = (index: number, sideRight: boolean) => {
      if (pausedRef.current) return;
      // gaze toward the frame we are perched beside
      h.cancel();
      h.gaze(sideRight ? -0.6 : 0.6);
      h.crestFlick();
      if (!isMobile && POINT_AT.has(index)) {
        // point back toward the frame's annotation
        void h.point(sideRight ? "left" : "right", { hold: 1100 }).then(() => h.gaze(0));
      }
    };
    const scheduleGesture = (index: number, sideRight: boolean) => {
      clearTimeout(gestureTimer);
      // settle window: rapid section changes (fast scroll) never fire theatrics
      gestureTimer = setTimeout(() => runGesture(index, sideRight), 480);
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pastHero = window.scrollY > vh * 0.55;

      // choose the active frame: in view, top edge on screen, centre nearest 45% vh
      const rects = shots().map((el) => el.getBoundingClientRect());
      let best = -1;
      let bestDist = Infinity;
      rects.forEach((r, i) => {
        const onScreen = r.width > 0 && r.bottom > vh * 0.12 && r.top < vh * 0.9;
        if (!onScreen) return;
        const d = Math.abs(r.top + r.height * 0.4 - vh * 0.45);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });

      const visible = pastHero && !atClosing && best >= 0;

      let targetX = curX;
      let targetY = curY;
      let sideRight = true;
      if (visible) {
        if (!mountedRef.current) {
          mountedRef.current = true;
          setMounted(true);
        }
        const r = rects[best];
        const shotCenterX = r.left + r.width / 2;
        sideRight = shotCenterX > vw / 2;
        targetX = sideRight
          ? Math.min(r.right + EDGE_GAP, vw - SIZE - EDGE_INSET)
          : Math.max(EDGE_INSET, r.left - SIZE - EDGE_GAP);
        targetX = Math.max(EDGE_INSET, Math.min(vw - SIZE - EDGE_INSET, targetX));
        targetY = Math.max(72, Math.min(vh - SIZE - 24, r.top + r.height * 0.3));

        if (best !== activeIndex) {
          activeIndex = best;
          scheduleGesture(best, sideRight);
        }
      } else if (best < 0) {
        activeIndex = -1;
        clearTimeout(gestureTimer);
      }

      // smoothed follow (a calm spring-like lag; fast scroll just relocates)
      if (!placed && visible) {
        curX = targetX;
        curY = targetY;
        placed = true;
      }
      const k = 1 - Math.exp(-dt * 9);
      curX += (targetX - curX) * k;
      curY += (targetY - curY) * k;
      curOp += ((visible ? 1 : 0) - curOp) * Math.min(1, dt * 6);
      if (curOp < 0.002 && !visible) placed = false;

      const p = perchRef.current;
      if (p) {
        p.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
        p.style.opacity = String(curOp);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      clearTimeout(gestureTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SIZE, isMobile]);

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <div
        ref={perchRef}
        data-hoopoe-perch
        className="absolute left-0 top-0 opacity-0 will-change-transform"
        style={{ width: SIZE, height: SIZE }}
      >
        {mounted && <Hoopoe ref={ref} size={SIZE} />}
      </div>
    </div>
  );
}
