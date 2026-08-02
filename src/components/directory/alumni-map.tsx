"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { batchLine, cn, metaLine } from "@/lib/utils";
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
  birdOverride?: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
  /** This person's OTHER mapped cities, if any -- they plot in every pin
   *  they have a resolvable city for (owner override). Kept for matching
   *  only; the drilldown no longer displays an "Also in ..." line (owner
   *  call, 2026-07). */
  otherCities?: string[];
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
// Cities are only located at city-level precision, so this stays a "close
// enough" cap rather than street-level zoom. Bumped from 8 -> 12 (~one more
// +/- step) so two nearby cities (e.g. Chennai and Bangalore) can pull apart
// instead of crowding at the old ceiling.
const MAX_Z = 12;

/**
 * How small one viewBox unit is allowed to get, in CSS pixels.
 *
 * The marker layer is authored in viewBox units, but the <svg> lays out with
 * the default preserveAspectRatio ("xMidYMid meet"), so one unit actually
 * renders at `min(boxWidth / W, boxHeight / H)` CSS px. In a phone-portrait
 * column that ratio is pinned by WIDTH and collapses to ~0.39 (a 348px box over
 * 900 units), against ~1.14 on a 1440px desktop. That single number, not any
 * constant in this file, is why the pins and their counts were about a third of
 * their desktop size on a phone, and why turning the phone landscape (a wider
 * box, ~0.60) made the numbers "kinda visible" but still small.
 *
 * So we measure the live ratio and counter-scale the markers by
 * `MIN_PX_PER_UNIT / ratio` whenever the ratio drops below the floor. Desktop
 * sits above the floor at every width down to ~1320px, where the factor is
 * exactly 1 and the rendered markers are byte-identical to before.
 */
const MIN_PX_PER_UNIT = 1;

/** Minimum tap target on coarse pointers (directory spec 4.1, WCAG 2.5.8). */
const TAP_MIN_PX = 44;

/** Every marker is a button: hover, focus-visible and active all read. Opacity
 *  only, per the motion rule (the group's transform is doing map work). */
const MARKER_CLASS =
  "group cursor-pointer outline-none transition-opacity duration-150 active:opacity-70";
const RING_CLASS =
  "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100";
/** `all` rather than the default `visiblePainted` so the transparent tap disc
 *  reliably takes the touch even where nothing is painted. */
const HIT_STYLE = { pointerEvents: "all" } as const;

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
  /** Cluster tooltip. Anchored in MAP units (mx/my), never in stale screen
   *  coords, so it can never be left behind by a pan, a zoom or a re-render. */
  const [tip, setTip] = useState<{
    id: number;
    mx: number;
    my: number;
    label: string;
  } | null>(null);
  const [drill, setDrill] = useState<{ title: string; people: PinPerson[] } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  /** Live geometry of the rendered <svg>: its CSS box plus `s`, the CSS px that
   *  one viewBox unit currently occupies. See MIN_PX_PER_UNIT. */
  const [box, setBox] = useState({ w: 0, h: 0, s: MIN_PX_PER_UNIT });
  const [coarsePointer, setCoarsePointer] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomBehavior = useRef<any>(null);

  const dismissTip = useCallback(() => setTip(null), []);

  const max = Math.max(1, ...pins.map((p) => p.count));

  // Counter-scale for the marker layer, on top of the existing 1/k that keeps
  // pins a constant size through map zoom. 1 on desktop, ~2.6 on a phone.
  const pinBoost = Math.max(1, MIN_PX_PER_UNIT / (box.s || MIN_PX_PER_UNIT));
  // One CSS pixel, expressed in the marker layer's own units.
  const unitsPerPx = 1 / (pinBoost * (box.s || MIN_PX_PER_UNIT));
  // Touch gets a transparent 44x44 hit disc behind the dot. Fine pointers keep
  // exactly today's hit area (the halo circle), so desktop clicking is untouched.
  const tapR = coarsePointer ? (TAP_MIN_PX / 2) * unitsPerPx : 0;

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

  // Measure the rendered svg so the marker layer can hold a real CSS-pixel size
  // no matter how the viewBox is letterboxed into the column. Layout effect so
  // the first painted frame on a phone is already the corrected size.
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      // preserveAspectRatio "xMidYMid meet": the smaller ratio wins.
      setBox({ w: b.width, h: b.height, s: Math.min(b.width / W, b.height / H) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Orientation changes resize the box, which ResizeObserver already catches.
    return () => ro.disconnect();
  }, [fullscreen]);

  // Coarse pointer => no hover, and tap targets need real size.
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
      .on("zoom", (e) => {
        setTransform(e.transform);
        // Any pan, wheel or pinch the USER drives dismisses the tooltip. d3
        // leaves sourceEvent null for programmatic transforms (our own zoom
        // buttons and cluster zoom), so those do not fight the pointer.
        if (e.sourceEvent) setTip(null);
      });
    zoomBehavior.current = zb;
    sel.call(zb);
    // No double-click zoom (it competes with pin clicks).
    sel.on("dblclick.zoom", null);
    return () => {
      sel.on(".zoom", null);
    };
  }, [fullscreen]);

  // Escape dismisses the tooltip.
  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTip(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tip]);

  // Hard orphan guard: the tooltip only exists while the exact super-pin it
  // describes is still on the map. Supercluster mints a fresh cluster_id per
  // zoom level, so this alone drops the label the moment its cluster splits,
  // is filtered away, or is rebuilt by a re-render. Derived rather than stored,
  // so there is no window where a stale label can paint.
  const liveTip =
    tip && leaves.some((l) => l.kind === "cluster" && l.clusterId === tip.id) ? tip : null;

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
      // The ocean is a recessed well, so it sits on --muted. (The old
      // var(--surface-2, #EEE8DA) referenced a token that never existed, so
      // the hardcoded fallback always won and froze the sea at pre-protocol
      // mist; --muted is 2 RGB steps cooler and follows theme flips.)
      style={{ background: "var(--muted)" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-full w-full touch-none select-none"
        style={{ cursor: "grab" }}
        // Not role="img": that would hide the markers below from assistive tech,
        // and they are real buttons.
        role="group"
        aria-label="World map of where members live"
        // Pressing anywhere on the map dismisses the tooltip. Markers set theirs
        // on click, which runs after pointerdown, so tapping one still works.
        onPointerDown={dismissTip}
        onPointerLeave={dismissTip}
        onPointerCancel={dismissTip}
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
              const halo = r + 4;
              const label = `${leaf.count} members across ${leaf.cities} cities`;
              return (
                <g
                  key={`c${leaf.clusterId}-${i}`}
                  transform={`translate(${leaf.x},${leaf.y}) scale(${pinBoost / transform.k})`}
                  className={MARKER_CLASS}
                  role="button"
                  tabIndex={0}
                  aria-label={`Zoom in to ${label}`}
                  // Hover only, and only for a real hovering pointer. A tap
                  // cannot "un-hover", so on touch this super-pin just zooms;
                  // its count is already printed inside the disc.
                  onPointerEnter={(e) =>
                    e.pointerType === "mouse" &&
                    setTip({ id: leaf.clusterId, mx: leaf.x, my: leaf.y, label })
                  }
                  onPointerLeave={dismissTip}
                  onClick={() => {
                    dismissTip();
                    onClusterClick(leaf);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      dismissTip();
                      onClusterClick(leaf);
                    }
                  }}
                >
                  <circle r={Math.max(halo, tapR)} fill="transparent" style={HIT_STYLE} />
                  <circle r={halo} fill="#3F7CA6" opacity={0.18} />
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
                  <circle r={halo} className={RING_CLASS} fill="none" stroke="#235C49" strokeWidth={2} />
                </g>
              );
            }
            const r = sqrtRadius(leaf.pin.count, max);
            const halo = r + 3;
            const title = `${leaf.pin.city} - ${leaf.pin.count} ${
              leaf.pin.count === 1 ? "member" : "members"
            }`;
            return (
              <g
                key={`p${leaf.pin.city}-${i}`}
                transform={`translate(${leaf.x},${leaf.y}) scale(${pinBoost / transform.k})`}
                className={MARKER_CLASS}
                role="button"
                tabIndex={0}
                aria-label={`${title}. Open the list.`}
                // Deliberately no tooltip: a city pin opens the side panel,
                // which already leads with this exact line, so the hover label
                // was pure duplication (owner call, 2026-07).
                onClick={() => {
                  dismissTip();
                  setDrill({ title, people: leaf.pin.people });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    dismissTip();
                    setDrill({ title, people: leaf.pin.people });
                  }
                }}
              >
                <circle r={Math.max(halo, tapR)} fill="transparent" style={HIT_STYLE} />
                <circle r={halo} fill="#1F8A4C" opacity={0.18} />
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
                <circle r={halo} className={RING_CLASS} fill="none" stroke="#235C49" strokeWidth={2} />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Cluster tooltip. Positioned from the CURRENT transform every render, so
          it tracks its super-pin instead of being stranded at the coordinates it
          happened to be opened at, and the box letterboxing is accounted for
          (the fitted map is far shorter than its container in a phone column,
          which used to put this label nowhere near its pin). */}
      {liveTip && box.w > 0 && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[12px] font-medium text-background shadow-lg"
          style={{
            left: (box.w - W * box.s) / 2 + (liveTip.mx * transform.k + transform.x) * box.s,
            top: (box.h - H * box.s) / 2 + (liveTip.my * transform.k + transform.y) * box.s,
          }}
        >
          {liveTip.label}
        </div>
      )}

      {/* Zoom controls. Fullscreen on mobile adds a dedicated exit pill in this
          same corner (below), so these drop down to clear it; sm: and up
          resets to the usual top-3 since that pill is mobile-only. */}
      <div
        className={cn(
          "absolute right-3 z-20 flex flex-col gap-1.5",
          fullscreen ? "top-16 sm:top-3" : "top-3"
        )}
      >
        {/* state-layer on all four map chrome controls. They used to hover from
            bg-card/95 to bg-card, a 5% opacity step over the map that measured
            near zero, and `transition-transform` never carried a colour anyway.
            The layer tints whatever the map paints behind the blur. */}
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomTo(W / 2, H / 2, Math.min(MAX_Z, transform.k * 1.6))}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-lg font-semibold text-foreground shadow-sm backdrop-blur transition-transform state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomTo(W / 2, H / 2, Math.max(MIN_Z, transform.k / 1.6))}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-lg font-semibold text-foreground shadow-sm backdrop-blur transition-transform state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        >
          &minus;
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          dismissTip();
          setFullscreen((v) => !v);
        }}
        aria-label={fullscreen ? "Exit full screen" : "View full screen"}
        className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/95 py-1.5 pl-2.5 pr-3 text-[12px] font-semibold text-foreground shadow-sm backdrop-blur transition-transform state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
      >
        {fullscreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        {fullscreen ? "Close" : "Full screen"}
      </button>

      {/* Dedicated mobile exit affordance. The top-left toggle above already
          closes fullscreen too, but on a phone it reads small next to the
          system chrome, so fullscreen mode gets its own unmistakable X pill
          in the top-right corner (sm: and up hides it, relying on the toggle
          above instead). Safe-area aware so it clears the notch / Dynamic
          Island in landscape or on devices with inset display cutouts. */}
      {fullscreen && (
        <button
          type="button"
          onClick={() => {
            dismissTip();
            setFullscreen(false);
          }}
          aria-label="Exit full screen"
          className="absolute z-30 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition-transform state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 sm:hidden"
          style={{
            top: "max(0.75rem, env(safe-area-inset-top))",
            right: "max(0.75rem, env(safe-area-inset-right))",
          }}
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>
      )}

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

      {/* Full-screen overlay reuses the same body. Portaled to document.body
          rather than rendered in place: the content column it would otherwise
          sit inside establishes its own stacking context (z-10, see
          app-shell.tsx), and the mobile header sits in a sibling context at
          z-40. No z-index inside that column - however high - can paint above
          a sibling stacking context, so without the portal this whole overlay
          (including its exit affordances) rendered UNDER the sticky mobile
          header and was invisible/unclickable. Escaping to body puts it in
          the root stacking context, where z-50 legitimately beats z-40. */}
      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-background">{mapBody}</div>,
          document.body
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
                  // state-layer: these rows sit on the sheet's own surface,
                  // where the accent swap was at or below the just-noticeable
                  // threshold. The layer reads the same on every surface.
                  className="group block rounded-[var(--radius-md)] px-2 py-2 state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
                >
                  <IdentityRow
                    user={{ id: p.id, name: p.name, photoUrl: p.photoUrl, birdOverride: p.birdOverride }}
                    textClassName="flex-1"
                    name={p.name}
                    nameClassName="truncate text-[15px] font-semibold leading-none text-foreground group-hover:underline"
                    meta={metaLine(batchLine(p), p.jobTitle)}
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
