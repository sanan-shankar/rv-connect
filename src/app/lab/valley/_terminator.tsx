"use client";

/* ------------------------------------------------------------------ *
 *  The world at this hour.
 *
 *  The directory's own projection (Natural Earth, the same fit), with the
 *  night drawn where it is: every point more than ninety degrees from
 *  the spot the sun is over is in the dark, and the six degrees either
 *  side of that line are twilight. The sun dot is the subsolar point.
 *  Members' cities are dots, lit or not, so the line is doing a job:
 *  who could take a call right now.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from "react";
import { geoCircle, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import { sunPosition, VALLEY } from "./_sun";

export type CityDot = { city: string; lat: number; lng: number };

const W = 900, H = 460, PAD = 8;
const projection = geoNaturalEarth1().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], { type: "Sphere" });
const pathGen = geoPath(projection);
const ATLAS_URL = "/geo/countries-110m.json";
type Topology = Parameters<typeof feature>[0];

export function Terminator({ cities, now }: { cities: CityDot[]; now: number }) {
  const [land, setLand] = useState<string[]>([]);
  useEffect(() => {
    let gone = false;
    (async () => {
      const res = await fetch(ATLAS_URL);
      if (!res.ok) return;
      const topo = (await res.json()) as Topology;
      const f = feature(topo, topo.objects.countries) as unknown as { features: Feature<Geometry>[] };
      if (!gone) setLand(f.features.map((x) => pathGen(x) ?? ""));
    })();
    return () => { gone = true; };
  }, []);

  const sun = useMemo(() => sunPosition(new Date(now)), [now]);
  const anti: [number, number] = [sun.subsolar.lon + 180, -sun.subsolar.lat];
  const ring = (r: number) => pathGen(geoCircle().center(anti).radius(r)()) ?? "";
  const r2 = (v: [number, number]): [number, number] => [Math.round(v[0] * 100) / 100, Math.round(v[1] * 100) / 100];
  const sunXY = r2(projection([sun.subsolar.lon, sun.subsolar.lat]) ?? [0, 0]);
  const valleyXY = r2(projection([VALLEY.lon, VALLEY.lat]) ?? [0, 0]);
  const dots = useMemo(
    () =>
      cities.map((c) => {
        const p = projection([c.lng, c.lat]) ?? [0, 0];
        const el = sunPosition(new Date(now), c.lat, c.lng).elevation;
        /* rounded so the server's and the browser's last float digit cannot differ */
        return { ...c, x: Math.round(p[0] * 100) / 100, y: Math.round(p[1] * 100) / 100, lit: el > 0, dusk: el <= 0 && el > -6 };
      }),
    [cities, now]
  );
  const litCount = dots.filter((d) => d.lit).length;

  return (
    <div className="vt">
      <svg viewBox={`0 0 ${W} ${H}`} className="vt-svg" role="img" aria-label="A world map with the night drawn where it is right now">
        <path d={pathGen({ type: "Sphere" }) ?? ""} fill="#F5F2EA" stroke="#DFD8CB" strokeWidth={1} />
        {land.map((d, i) => (
          <path key={i} d={d} fill="#E4E1D5" stroke="#D3CDBF" strokeWidth={0.5} />
        ))}
        <g style={{ mixBlendMode: "multiply" }}>
          <path d={ring(96)} fill="#2A3A3C" opacity={0.16} />
          <path d={ring(90)} fill="#243334" opacity={0.28} />
          <path d={ring(84)} fill="#1C2420" opacity={0.3} />
        </g>
        <circle cx={sunXY[0]} cy={sunXY[1]} r={14} fill="#FFD27A" opacity={0.25} />
        <circle cx={sunXY[0]} cy={sunXY[1]} r={5} fill="#FFC64F" stroke="#F5F2EA" strokeWidth={1.5} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={2.6} fill={d.lit ? "#C2622F" : d.dusk ? "#8E6E5C" : "#5F6359"} opacity={d.lit ? 0.95 : 0.7} stroke={d.lit ? "#F5F2EA" : "none"} strokeWidth={0.8}>
            <title>{`${d.city}: ${d.lit ? "daylight" : d.dusk ? "twilight" : "night"}`}</title>
          </circle>
        ))}
        <circle cx={valleyXY[0]} cy={valleyXY[1]} r={5} fill="#235C49" stroke="#F5F2EA" strokeWidth={2} />
      </svg>
      <p className="vt-line">
        {cities.length > 0
          ? `It is daylight in ${litCount} of the ${cities.length} cities members live in.`
          : "No cities to place yet."}
      </p>
    </div>
  );
}

export const TERMINATOR_CSS = `
.vt { width:100%; }
.vt-svg { width:100%; height:auto; display:block; border-radius:14px; }
.vt-line { margin:10px 2px 0; font-size:13.5px; color:var(--ink); }
`;
