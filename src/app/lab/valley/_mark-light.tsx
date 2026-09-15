"use client";

/* ------------------------------------------------------------------ *
 *  The mark, lit by the valley's sun.
 *
 *  The peaks mark is a ridge seen from the school, looking west. So the
 *  sun rises behind the viewer and lights the slopes in the morning, and
 *  sets behind the ridge in the evening, when the mark goes to a
 *  silhouette against the last of the light. Each plane carries a
 *  made-up but honest normal (east-facing, tilted south or north), and
 *  its fill is the brand fill scaled by how much sun that slope gets.
 *
 *  Two treatments. "cream" is the one-colour mark the sidebar actually
 *  draws at 19px: it warms towards dusk and dims to a moonlit cream at
 *  night, and nothing else changes. "planes" is the three-plane mark at a
 *  size where the shading can be seen, for the room to explain itself.
 * ------------------------------------------------------------------ */

import { PEAK_PLANES } from "@/components/layout/peaks-mark";
import { moonPhase, skyFor, sunPosition, sunVector, type RGB } from "./_sun";

/* PeaksMark's own window: the ridge spans -98..1008, centre 455, width 1140 */
const VIEWBOX = "-115 40 1140 350";

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const css = (c: RGB) => `rgb(${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(" ")})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const unit = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

/* east, up, south: the frame the hills use */
const NORMALS = {
  silhouette: unit([0.62, 0.72, 0.36]), // Bodikonda, on the left, faces a little south
  middle: unit([0.72, 0.69, 0.0]),
  rishi: unit([0.62, 0.72, -0.36]), // Rishikonda, on the right, faces a little north
};
const FILLS = { silhouette: hex("#cbd8c1"), middle: hex("#7f9a82"), rishi: hex("#235c49") };
const CREAM = hex("#eaf1df");
const DUSK = hex("#E8C6A0");
const NIGHT_CREAM = hex("#9FB1A6");
const INK_NIGHT = hex("#24362F");

export function markLight(when: Date) {
  const sun = sunPosition(when);
  const sky = skyFor(sun.elevation);
  const s = sunVector(sun);
  const lit = (n: number[]) => {
    const d = Math.max(0, n[0] * s[0] + n[1] * s[1] + n[2] * s[2]);
    return 0.58 + 0.62 * d * sky.strength;
  };
  return { sun, sky, lit, night: sky.night };
}

export function MarkLit({ when, size = 19, variant = "cream", className = "" }: { when: Date; size?: number; variant?: "cream" | "planes"; className?: string }) {
  const { lit, night, sun, sky } = markLight(when);
  const w = Math.round((size * 1140) / 350);
  /* the evening warmth: the sun low in the west behind the ridge */
  const dusk = sun.elevation < 12 && sun.elevation > -8 ? 1 - Math.abs(sun.elevation - 2) / 10 : 0;
  if (variant === "cream") {
    let c = mix(CREAM, DUSK, Math.max(0, dusk) * 0.55);
    c = mix(c, NIGHT_CREAM, night);
    return (
      <svg width={w} height={size} viewBox={VIEWBOX} fill="none" className={className} aria-hidden>
        <path d={PEAK_PLANES.silhouette} fill={css(c)} />
      </svg>
    );
  }
  const plane = (key: keyof typeof FILLS) => {
    let c = scale(FILLS[key], lit(NORMALS[key]));
    c = mix(c, mix(c, DUSK, 0.35), Math.max(0, dusk));
    c = mix(c, INK_NIGHT, night * 0.85);
    return css(c);
  };
  const moon = moonPhase(when);
  const showMoon = sun.elevation < -4;
  return (
    <svg width={w} height={size} viewBox={VIEWBOX} fill="none" className={className} aria-hidden>
      {showMoon && (
        <g opacity={Math.min(1, night)}>
          <circle cx={160} cy={110} r={30} fill={css(mix(hex("#F1EBDA"), sky.horizon, 0.15))} />
          <circle cx={160 + (0.5 - moon) * 70} cy={110} r={30} fill={css(mix(sky.zenith, INK_NIGHT, 0.5))} opacity={Math.abs(moon - 0.5) < 0.04 ? 0 : 1} />
        </g>
      )}
      <path d={PEAK_PLANES.silhouette} fill={plane("silhouette")} />
      <path d={PEAK_PLANES.middle} fill={plane("middle")} />
      <path d={PEAK_PLANES.rishi} fill={plane("rishi")} />
    </svg>
  );
}
