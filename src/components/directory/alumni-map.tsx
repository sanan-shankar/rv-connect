"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import worldData from "world-atlas/countries-110m.json";
import type { Feature, Geometry } from "geojson";

export type CityPin = { city: string; lng: number; lat: number; count: number };

const W = 900;
const H = 450;
const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  { type: "Sphere" }
);
const pathGen = geoPath(projection);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const land = feature(worldData as any, (worldData as any).objects.countries) as unknown as {
  features: Feature<Geometry>[];
};

export function AlumniMap({
  pins,
  unmapped,
}: {
  pins: CityPin[];
  unmapped: number;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<{ pin: CityPin; x: number; y: number } | null>(null);

  const max = Math.max(1, ...pins.map((p) => p.count));
  const radius = (c: number) => 4 + Math.sqrt(c / max) * 15;

  return (
    <div className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border" style={{ background: "#E9E6DD" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Map of where alumni live">
        {land.features.map((f, i) => (
          <path key={i} d={pathGen(f) ?? ""} fill="#CFD9CB" stroke="#BCC7B7" strokeWidth={0.4} />
        ))}
        {pins.map((p) => {
          const xy = projection([p.lng, p.lat]);
          if (!xy) return null;
          const r = radius(p.count);
          return (
            <g
              key={p.city}
              transform={`translate(${xy[0]},${xy[1]})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover({ pin: p, x: xy[0], y: xy[1] })}
              onMouseLeave={() => setHover(null)}
              onClick={() => router.push(`/directory?city=${encodeURIComponent(p.city)}`)}
            >
              <circle r={r + 2} fill="#1F8A4C" opacity={0.18} />
              <circle r={r} fill="#1F8A4C" opacity={0.85} stroke="#fff" strokeWidth={1} />
              {p.count >= 3 && r > 10 && (
                <text textAnchor="middle" dy="0.34em" fontSize={9} fontWeight={700} fill="#fff">
                  {p.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-[12px] font-medium text-background shadow"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          {hover.pin.city} · {hover.pin.count}
        </div>
      )}

      {unmapped > 0 && (
        <div className="absolute bottom-3 left-3 rounded-full border border-border bg-card/90 px-3 py-1 text-[12px] text-muted-foreground backdrop-blur">
          {unmapped} alumni in places not yet on the map
        </div>
      )}
    </div>
  );
}
