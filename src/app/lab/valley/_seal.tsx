"use client";

/* ------------------------------------------------------------------ *
 *  The seal.
 *
 *  A member's own bird pressed into wax. No image, no canvas: the bird
 *  glyph's alpha is the height map, an SVG lighting filter raises it, and
 *  the light comes from wherever the valley's sun is (or from the pointer,
 *  when there is one). Press and hold to seal; let go early and the wax
 *  springs back. Built for the Catch-ups time capsule, which is sealed
 *  once a year, so a thing this rich stays rare.
 *
 *  The chain, for the next person: the drawing's luminance (the wax disc
 *  is a mid grey, the bird its own colours) blurred is the bump; diffuse and
 *  specular lighting read it; the diffuse result is multiplied by the wax
 *  colour, the specular is added; and the whole thing is cut back to the
 *  wax's own outline by a hard-thresholded copy of the alpha.
 * ------------------------------------------------------------------ */

import { useEffect, useId, useRef, useState } from "react";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { sunPosition } from "./_sun";

const WAX = "#9E4426";
/* the wax at rest still has a rim; the press adds the bird's relief on top */
const REST = 1.3;
const DEPTH = 5.2;

function svgAzimuthFromBearing(bearing: number): number {
  /* light arriving FROM compass bearing b: east is +x, north is -y on the page */
  const b = (bearing * Math.PI) / 180;
  return (Math.atan2(-Math.cos(b), Math.sin(b)) * 180) / Math.PI;
}

/* the wax is not a circle: a blob with a gentle wobble, seeded */
function blobPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + 0.035 * Math.sin(a * 3 + 0.6) + 0.025 * Math.sin(a * 5 + 2.1) + 0.015 * Math.sin(a * 8 + 1.3));
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

export function Seal({ seed, species, size = 240, now, interactive = true }: { seed: string; species?: number | null; size?: number; now: number; interactive?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [depth, setDepth] = useState(interactive ? REST : DEPTH);
  const [sealed, setSealed] = useState(!interactive);
  const [light, setLight] = useState<{ az: number; el: number } | null>(null);
  const anim = useRef<{ raf: number; from: number; to: number; t0: number; ms: number } | null>(null);
  const holding = useRef(false);

  const sun = sunPosition(new Date(now));
  const sunAz = svgAzimuthFromBearing(sun.azimuth);
  const sunEl = sun.elevation > 0 ? Math.max(14, Math.min(62, sun.elevation)) : 28;
  /* rounded, because the server and the browser disagree on the last digit
     of a trig result and React reads that as a hydration mismatch */
  const az = Math.round((light ? light.az : sunAz) * 100) / 100;
  const el = Math.round((light ? light.el : sunEl) * 100) / 100;

  const tween = (to: number, ms: number, done?: () => void) => {
    if (anim.current) cancelAnimationFrame(anim.current.raf);
    const from = depth;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setDepth(from + (to - from) * e);
      if (k < 1) anim.current = { raf: requestAnimationFrame(step), from, to, t0, ms };
      else { anim.current = null; done?.(); }
    };
    anim.current = { raf: requestAnimationFrame(step), from, to, t0, ms };
  };
  useEffect(() => () => { if (anim.current) cancelAnimationFrame(anim.current.raf); }, []);

  const press = () => {
    if (!interactive) return;
    holding.current = true;
    tween(DEPTH, 720, () => { if (holding.current) setSealed(true); });
  };
  const release = () => {
    if (!interactive) return;
    holding.current = false;
    if (!sealed && depth < DEPTH - 0.05) tween(REST, 260);
  };

  const R = size / 2;
  const birdPx = size * 0.56;
  const pressed = Math.max(0, Math.min(1, (depth - REST) / (DEPTH - REST)));
  return (
    <div
      className={`vs${sealed ? " sealed" : ""}${interactive ? " live" : ""}`}
      style={{ width: size, height: size }}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={(e) => { release(); if (e.pointerType !== "touch") setLight(null); }}
      onPointerMove={(e) => {
        if (e.pointerType === "touch" || !interactive) return;
        const r = e.currentTarget.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) / (r.width / 2);
        setLight({ az: (Math.atan2(dy, dx) * 180) / Math.PI, el: Math.max(16, 70 - d * 48) });
      }}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? (sealed ? "Sealed with your bird" : "Press and hold to seal with your bird") : "A wax seal"}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); press(); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") release(); }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="vs-svg" aria-hidden>
        <defs>
          <filter id={`${id}-emboss`} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            {/* the height map is the drawing's brightness, not its outline: the disc
                is a mid grey, so a pale belly rises above the wax and a dark eye
                sinks into it, and the bird reads as a bird rather than a ring */}
            <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum" />
            <feComponentTransfer in="lum" result="lumc">
              <feFuncA type="linear" slope={1.7} intercept={-0.32} />
            </feComponentTransfer>
            <feGaussianBlur in="lumc" stdDeviation={Math.max(0.6, size / 140)} result="bump" />
            <feDiffuseLighting in="bump" surfaceScale={depth} diffuseConstant={1.05} lightingColor="#fff" result="diff">
              <feDistantLight azimuth={az} elevation={el} />
            </feDiffuseLighting>
            <feSpecularLighting in="bump" surfaceScale={depth} specularConstant={0.5} specularExponent={24} lightingColor="#fff" result="spec">
              <feDistantLight azimuth={az} elevation={el} />
            </feSpecularLighting>
            <feFlood floodColor={WAX} result="wax" />
            <feComposite in="diff" in2="wax" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="lit" />
            <feComposite in="lit" in2="spec" operator="arithmetic" k1={0} k2={1} k3={0.9} k4={0} result="shiny" />
            <feComponentTransfer in="SourceAlpha" result="mask">
              <feFuncA type="linear" slope={40} intercept={-2} />
            </feComponentTransfer>
            <feComposite in="shiny" in2="mask" operator="in" />
          </filter>
          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={size / 40} />
          </filter>
        </defs>
        {/* the wax sits on the paper and casts a little shade */}
        <path d={blobPath(R, R + size * 0.03, R * 0.86)} fill="#000" opacity={0.16 + 0.1 * pressed} filter={`url(#${id}-shadow)`} />
        <g filter={`url(#${id}-emboss)`} style={{ transform: `scale(${1 - 0.03 * pressed})`, transformOrigin: "50% 50%" }}>
          <path d={blobPath(R, R, R * 0.86)} fill="#8c8c8c" />
          {/* the bird arrives with the die: its relief is the press itself */}
          <svg x={R - birdPx / 2} y={R - birdPx / 2} width={birdPx} height={birdPx} viewBox="0 0 100 100" opacity={pressed}>
            <BirdGlyphV2 seed={seed} px={100} speciesOverride={species ?? undefined} />
          </svg>
        </g>
      </svg>
    </div>
  );
}

export const SEAL_CSS = `
.vs { position:relative; display:inline-block; border-radius:50%; }
.vs.live { cursor:pointer; touch-action:none; -webkit-user-select:none; user-select:none; }
.vs.live:focus-visible { outline:2px solid #1F8A4C; outline-offset:6px; }
.vs-svg { display:block; }
`;
