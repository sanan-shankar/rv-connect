"use client";

/* ------------------------------------------------------------------ *
 *  <ScaledFrame> - a fixed-width drawing, scaled to fit where it sits.
 *
 *  A sketch is drawn at 390px or 1512px regardless of the window, and
 *  this shrinks it to the space available (never enlarges it), keeping
 *  the wrapper's height honest so the page below does not overlap. On
 *  his phone the 390 frames land at scale 1, which is the point: the
 *  phone drawing IS the page. On his laptop the 1512 frame fits at about
 *  0.9. `full` turns the scaling off, for pinching into the laptop
 *  drawing on a phone from its own link.
 *
 *  Transform, not zoom, so the drawing's own layout never reflows; the
 *  cost is that `position: fixed` inside it is relative to the frame
 *  (memory: the transform-box gotcha), which is why the contract in
 *  _types.ts says `absolute`.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScaledFrame({
  width,
  height,
  full = false,
  className = "",
  children,
}: {
  width: number;
  /** Fixed height for a phone screen; omit for a natural-height page. */
  height?: number;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(height ?? 0);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      setScale(full ? 1 : Math.min(1, o.clientWidth / width));
      setInnerHeight(height ?? i.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width, height, full]);

  return (
    <div
      ref={outer}
      className={className}
      style={{
        width: full ? width : "100%",
        height: Math.round(innerHeight * scale),
        overflow: full ? "visible" : "hidden",
      }}
    >
      <div
        ref={inner}
        style={{
          width,
          height: height ?? "auto",
          overflow: height ? "hidden" : "visible",
          position: "relative",
          isolation: "isolate",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
