"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, X, MapPin } from "lucide-react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { feature } from "topojson-client";
import Supercluster from "supercluster";
import worldData from "world-atlas/countries-110m.json";
import type { Feature, Geometry } from "geojson";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PinPerson = {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl?: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
};

export type CityPin = {
  city: string;
  lng: number;
  lat: number;
  count: number;
  people: PinPerson[];
};

const W = 900;
const H = 460;
const PAD = 8;
const projection = geoNaturalEarth1().fitExtent(
  [
    [PAD, PAD],
    [W - PAD, H - PAD],
  ],
  { type: "Sphere" }
);
const pathGen = geoPath(projection);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const land = feature(worldData as any, (worldData as any).objects.countries) as unknown as {
  features: Feature<Geometry>[];
};
const landPaths = land.features.map((f) => pathGen(f) ?? "");

// A clustered leaf, after supercluster: either a single city or a merged group.
type Leaf =
  | { kind: "city"; x: number; y: number; pin: CityPin }
  | { kind: "cluster"; x: number; y: number; count: number; cities: number; clusterId: number };

const MIN_Z = 1;
const MAX_Z = 8;

function sqrtRadius(count: number, max: number) {
  // Area proportional to count, so a 200-count city is not 200x the diameter.
  return 9 + Math.sqrt(count / Math.max(1, max)) * 22;
}

/**
 * AlumniMap - the warm SVG world map.
 *
 * One pin per city, sqrt-scaled and counted. Cities that overlap at the current
 * zoom collapse into supercluster super-pins (click a super-pin to zoom in).
 * Pan and zoom via d3-zoom on the SVG group transform. Clicking a city pin opens
 * a drilldown panel listing that city's people (IdentityRow linking
 * to profiles). Renders inline by default and full-screen on demand.
 */
export function AlumniMap({
  pins,
  unmapped,
  unmappedPeople = [],
}: {
  pins: CityPin[];
  unmapped: number;
  unmappedPeople?: PinPerson[];
}) {
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [drill, setDrill] = useState<{ title: string; people: PinPerson[] } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomBehavior = useRef<any>(null);

  const max = Math.max(1, ...pins.map((p) => p.count));

  // One supercluster index over the real geographic points. Supercluster does
  // its tiling in lng/lat space; we project each returned cluster centroid to
  // screen coords ourselves, so this stays independent of the SVG renderer.
  const index = useMemo(() => {
    const sc = new Supercluster<{ pinIndex: number }, { count: number }>({
      radius: 50,
      maxZoom: MAX_Z + 2,
      map: (props) => ({ count: pins[props.pinIndex].count }),
      reduce: (acc, props) => {
        acc.count += props.count;
      },
    });
    sc.load(
      pins.map((p, i) => ({
        type: "Feature" as const,
        properties: { pinIndex: i },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      }))
    );
    return sc;
  }, [pins]);

  // Cluster at the current zoom level: more zoom splits super-pins apart.
  const leaves: Leaf[] = useMemo(() => {
    const z = Math.round(Math.log2(Math.max(1, transform.k)) + 1);
    const clusters = index.getClusters([-180, -85, 180, 85], z);
    return clusters
      .map((c): Leaf | null => {
        const xy = projection(c.geometry.coordinates as [number, number]);
        if (!xy) return null;
        const [x, y] = xy;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = c.properties as any;
        if (props.cluster) {
          return {
            kind: "cluster",
            x,
            y,
            count: props.count as number,
            cities: props.point_count as number,
            clusterId: props.cluster_id as number,
          };
        }
        return { kind: "city", x, y, pin: pins[props.pinIndex] };
      })
      .filter(Boolean) as Leaf[];
  }, [index, transform.k, pins]);

  // Wire d3-zoom to the svg so wheel + drag pan/zoom the group.
  useEffect(() => {
    if (!svgRef.current) return;
    const sel = select(svgRef.current);
    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_Z, MAX_Z])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (e) => setTransform(e.transform));
    zoomBehavior.current = zb;
    sel.call(zb);
    // No double-click zoom (it competes with pin clicks).
    sel.on("dblclick.zoom", null);
    return () => {
      sel.on(".zoom", null);
    };
  }, [fullscreen]);

  function zoomTo(x: number, y: number, k: number) {
    if (!svgRef.current || !zoomBehavior.current) return;
    const t = zoomIdentity.translate(W / 2 - x * k, H / 2 - y * k).scale(k);
    select(svgRef.current).call(zoomBehavior.current.transform, t);
  }

  function onClusterClick(c: Extract<Leaf, { kind: "cluster" }>) {
    const expansionZoom = Math.min(MAX_Z, index.getClusterExpansionZoom(c.clusterId));
    const k = Math.min(MAX_Z, Math.pow(2, expansionZoom - MIN_Z));
    zoomTo(c.x, c.y, Math.max(transform.k + 1, k));
  }

  const mapBody = (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--surface-2, #EEE8DA)" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-full w-full touch-none select-none"
        style={{ cursor: "grab" }}
        role="img"
        aria-label="World map of where members live"
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {landPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="#CFD9CB"
              stroke="#BCC7B7"
              strokeWidth={0.5 / transform.k}
            />
          ))}

          {leaves.map((leaf, i) => {
            if (leaf.kind === "cluster") {
              const r = sqrtRadius(leaf.count, max) + 4;
              return (
                <g
                  key={`c${leaf.clusterId}-${i}`}
                  transform={`translate(${leaf.x},${leaf.y}) scale(${1 / transform.k})`}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setHover({
                      x: leaf.x * transform.k + transform.x,
                      y: leaf.y * transform.k + transform.y,
                      label: `${leaf.count} members across ${leaf.cities} cities`,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onClusterClick(leaf)}
                >
                  <circle r={r + 4} fill="#3F7CA6" opacity={0.18} />
                  <circle r={r} fill="#3F7CA6" opacity={0.92} stroke="#fff" strokeWidth={1.5} />
                  <text
                    textAnchor="middle"
                    dy="0.34em"
                    fontSize={11}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {leaf.count}
                  </text>
                </g>
              );
            }
            const r = sqrtRadius(leaf.pin.count, max);
            return (
              <g
                key={`p${leaf.pin.city}-${i}`}
                transform={`translate(${leaf.x},${leaf.y}) scale(${1 / transform.k})`}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHover({
                    x: leaf.x * transform.k + transform.x,
                    y: leaf.y * transform.k + transform.y,
                    label: `${leaf.pin.city} - ${leaf.pin.count} ${
                      leaf.pin.count === 1 ? "member" : "members"
                    }`,
                  })
                }
                onMouseLeave={() => setHover(null)}
                onClick={() =>
                  setDrill({
                    title: `${leaf.pin.city} - ${leaf.pin.count} ${
                      leaf.pin.count === 1 ? "member" : "members"
                    }`,
                    people: leaf.pin.people,
                  })
                }
              >
                <circle r={r + 3} fill="#1F8A4C" opacity={0.18} />
                <circle r={r} fill="#1F8A4C" opacity={0.9} stroke="#fff" strokeWidth={1.25} />
                {leaf.pin.count >= 2 && r > 11 && (
                  <text
                    textAnchor="middle"
                    dy="0.34em"
                    fontSize={10}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {leaf.pin.count}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[12px] font-medium text-background shadow-lg"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
        >
          {hover.label}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomTo(W / 2, H / 2, Math.min(MAX_Z, transform.k * 1.6))}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-lg font-semibold text-foreground shadow-sm backdrop-blur transition-transform hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomTo(W / 2, H / 2, Math.max(MIN_Z, transform.k / 1.6))}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-lg font-semibold text-foreground shadow-sm backdrop-blur transition-transform hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        >
          &minus;
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFullscreen((v) => !v)}
        aria-label={fullscreen ? "Exit full screen" : "View full screen"}
        className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/95 py-1.5 pl-2.5 pr-3 text-[12px] font-semibold text-foreground shadow-sm backdrop-blur transition-transform hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
      >
        {fullscreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        {fullscreen ? "Close" : "Full screen"}
      </button>

      {unmapped > 0 && (
        <button
          type="button"
          onClick={() =>
            setDrill({
              title: `${unmapped} ${unmapped === 1 ? "person" : "people"} not yet on the map`,
              people: unmappedPeople,
            })
          }
          className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/90 py-1 pl-2.5 pr-3 text-[12px] text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <MapPin className="h-3 w-3" />
          {unmapped} not yet on the map
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Inline map */}
      <div
        className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border"
        style={{ height: "min(72vh, 640px)" }}
      >
        {!fullscreen && mapBody}
      </div>

      {/* Full-screen overlay reuses the same body */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          {mapBody}
        </div>
      )}

      {/* City drilldown: a bottom sheet, the same on every viewport. */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl tracking-tight">
              {drill?.title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1 px-4 pb-8">
            {drill?.people.length === 0 ? (
              <p className="px-1 py-6 text-sm text-muted-foreground">
                No one to show here yet.
              </p>
            ) : (
              drill?.people.map((p) => (
                <Link
                  key={p.id}
                  href={`/profile/${p.id}`}
                  className="group block rounded-[var(--radius-md)] px-2 py-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
                >
                  <IdentityRow
                    user={{ id: p.id, name: p.name, photoUrl: p.photoUrl }}
                    textClassName="flex-1"
                    name={p.name}
                    nameClassName="truncate text-[15px] font-semibold leading-none text-foreground group-hover:underline"
                    meta={[batchLine(p), p.jobTitle].filter(Boolean).join(" · ")}
                    metaClassName="truncate leading-none"
                  />
                </Link>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
