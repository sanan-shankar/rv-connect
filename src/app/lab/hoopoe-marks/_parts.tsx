/* ------------------------------------------------------------------ *
 *  The mascot's parts, for logo work: the React end of them.
 *
 *  The geometry itself lives in src/lib/hoopoe-geometry.ts, because the
 *  shipped app icon is built from it by a plain Node script and these
 *  rooms have to draw the identical thing. Anything about WHICH curve is
 *  drawn belongs there; this file only turns Prim[] into JSX and adds
 *  the one thing a static icon has no use for -- `pathFilter`, which
 *  hangs a filter on each path for the edge-light study.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import {
  bodyPrims,
  crestPrims,
  eyePrims,
  facePrims,
  featherPrims,
  billPrims,
  type CrestOptions,
  type FeatherOptions,
  type Prim,
} from "@/lib/hoopoe-geometry";

export { H, G } from "@/lib/hoopoe-geometry";

/** Prim[] to JSX. The mirror of primsToSvg, and the only reason both exist. */
function Draw({ prims, pathFilter }: { prims: Prim[]; pathFilter?: string }): ReactNode {
  const f = pathFilter ? `url(#${pathFilter})` : undefined;
  return (
    <>
      {prims.map((p, i) => {
        if (p.k === "g") {
          return (
            <g key={i} transform={p.transform}>
              <Draw prims={p.children} pathFilter={pathFilter} />
            </g>
          );
        }
        if (p.k === "path") {
          return (
            <path
              key={i}
              d={p.d}
              fill={p.fill}
              opacity={p.opacity}
              stroke={p.stroke}
              strokeWidth={p.strokeWidth}
              filter={f}
            />
          );
        }
        if (p.k === "ellipse") {
          return (
            <ellipse
              key={i}
              cx={p.cx}
              cy={p.cy}
              rx={p.rx}
              ry={p.ry}
              fill={p.fill}
              opacity={p.opacity}
              filter={f}
            />
          );
        }
        return <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} opacity={p.opacity} />;
      })}
    </>
  );
}

type WithFilter = { pathFilter?: string };

export function Feather({ pathFilter, ...o }: FeatherOptions & WithFilter) {
  return <Draw prims={[featherPrims(o)]} pathFilter={pathFilter} />;
}

export function Crest({ pathFilter, ...o }: CrestOptions & WithFilter) {
  return <Draw prims={crestPrims(o)} pathFilter={pathFilter} />;
}

export function Eye({
  pathFilter,
  ...o
}: { cx: number; cy: number; s?: number; flat?: string } & WithFilter) {
  return <Draw prims={eyePrims(o)} pathFilter={pathFilter} />;
}

export function Bill({
  pathFilter,
  ...o
}: { cx?: number; top?: number; len?: number; flat?: string } & WithFilter) {
  return <Draw prims={billPrims(o)} pathFilter={pathFilter} />;
}

export function Face({
  pathFilter,
  ...o
}: {
  headS?: number;
  eyeS?: number;
  eyeDX?: number;
  eyeY?: number;
  billL?: number;
  flat?: string;
} & WithFilter) {
  return <Draw prims={facePrims(o)} pathFilter={pathFilter} />;
}

export function Body({ flat }: { flat?: string }) {
  return <Draw prims={bodyPrims({ flat })} />;
}
