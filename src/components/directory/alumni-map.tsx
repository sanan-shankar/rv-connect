"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Maximize2, X, MapPin, Globe } from "lucide-react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine, cn, metaLine } from "@/lib/utils";
import {
  buildGroups,
  maxUsefulZoom,
  separatingZoom,
  sqrtRadius,
  type MapGroup,
  type MarkerSizing,
  type PinGeom,
} from "@/lib/map-cluster";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PinPerson = {
  id: string;
  name: string;
  photoUrl?: string | null;
  birdOverride?: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
};

export type CityPin = {
  /** The pin's name: the first city resolved into its grid cell. */
  city: string;
  /**
   * Every distinct city string in the cell, `city` included.
   *
   * A pin is a 0.1-degree cell, roughly 11km, and two genuinely different
   * towns can share one -- Hyderabad and Secunderabad do. The COUNT already
   * aggregated all of them; the escape link named only the first, so "See all
   * N" opened a page showing a fraction of N (audit C-098).
   */
  cities: string[];
  lng: number;
  lat: number;
  count: number;
  people: PinPerson[];
};

/** The directory link that lists everybody a pin counted, not just its name. */
function pinHref(pin: CityPin): string {
  return `/directory?${pin.cities.map((c) => `city=${encodeURIComponent(c)}`).join("&")}`;
}

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

/* The world atlas is FETCHED, not imported.
 *
 * `import worldData from "world-atlas/countries-110m.json"` compiled 105 KB
 * of JSON into a JavaScript module and put it in the first load of the
 * heaviest route in the app -- parsed on the main thread before /directory
 * could become interactive, and re-downloaded on every deploy because the
 * chunk hash moves with the build even though the coastlines do not.
 *
 * As a static file it is fetched in parallel with hydration, cached hard by
 * the header in next.config.ts, and costs the JS graph nothing. The map
 * draws its pins on the first frame and the land a moment later, which it
 * already coped with: `landPaths` was always mapped over, and an empty
 * array simply renders no <path>. The pins are the data; the land is the
 * backdrop.
 *
 * To update the atlas, replace public/geo/countries-110m.json AND rename it
 * -- the cache header is immutable, so a same-named replacement would be
 * invisible to anyone who had already loaded it. */
const ATLAS_URL = "/geo/countries-110m.json";

type Topology = Parameters<typeof feature>[0];

async function loadLandPaths(): Promise<string[]> {
  const res = await fetch(ATLAS_URL);
  if (!res.ok) throw new Error(`atlas ${res.status}`);
  const topo = (await res.json()) as Topology;
  const land = feature(topo, topo.objects.countries) as unknown as {
    features: Feature<Geometry>[];
  };
  return land.features.map((f) => pathGen(f) ?? "");
}

/* THE ATLAS IS ASKED FOR WHEN THIS MODULE ARRIVES, NOT WHEN THE MAP MOUNTS.
 *
 * It used to start in the mount effect below, which put it AFTER the view
 * crossfade: measured on a production build, pressing Map fetched the chunks
 * at 63ms, drew the empty card at 155ms, and only requested the atlas at
 * 464ms, once the map had mounted. So the land arrived last, behind a beat
 * nobody was waiting on for a good reason.
 *
 * directory-client warms this module on a hover over the Map segment, so
 * starting the request here means the coastlines are already in flight while
 * the pointer is still on the word. Memoised, so a remount (fullscreen, a
 * filter change) reuses the one promise rather than re-parsing 105 KB.
 *
 * Browser-only: `ssr: false` means this never renders on the server, but a
 * relative fetch evaluated in a server bundle would throw for want of a base
 * URL, and that is not a risk worth leaving to the module graph.
 *
 * No AbortController any more. There is nothing useful to abort: the response
 * is a static file behind an immutable cache header, a second mount wants the
 * same promise rather than a second request, and an unmount mid-flight now
 * simply drops the result instead of cancelling work that is already paid
 * for. */
let atlas: Promise<string[]> | null = null;
function getAtlas(): Promise<string[]> {
  atlas ??= loadLandPaths();
  return atlas;
}
if (typeof window !== "undefined") void getAtlas().catch(() => {});

const MIN_Z = 1;

/**
 * The view the map opens on.
 *
 * The map used to open on the whole sphere, so a third of the card was empty
 * Pacific either side of the antimeridian and the world sat small in the middle
 * of its own frame (owner, 2026-08-28: "make the default map view like this
 * instead of the zoomed out version").
 *
 * These three numbers are not derived from anything. The owner dragged the real
 * map to the framing he wanted and sent the screenshot: "I finetuned the
 * position. exactly this." They were read back off that image by solving for
 * the transform that puts the pins where it shows them, and they mean: the top
 * of the sphere at the top of the frame, the dead half of the Pacific off the
 * left edge, and the south polar ocean below Antarctica cropped away. What is
 * in frame runs 156W to 179E, and down to 65S.
 *
 * It is a ZOOM, not a viewBox, and that distinction is the whole point: an
 * earlier pass reframed the world by shrinking the viewBox, which changed how
 * many CSS pixels one map unit occupies, and since the marker layer
 * counter-scales against exactly that number, every pin ballooned and the work
 * was reverted (owner: "I want the circles ... exactly as it is now"). Markers
 * already carry `1 / transform.k`, so they hold their size through any zoom:
 * opening at k > 1 moves the land and leaves every pin measuring what it
 * measured before. Measured, both ways: 48.10 / 43.17 px.
 *
 * MIN_Z stays 1, so the whole sphere is still one press of minus away -- the
 * default is a starting point, not a floor.
 */
const DEFAULT_K = 1.133;
const DEFAULT_VIEW = zoomIdentity.translate(-91, 0).scale(DEFAULT_K);

/** Is this the view the map opens on? Decides whether the reset button has
 *  anything to say. Half a unit of slack: d3 hands back floats. */
function isDefaultView(t: ZoomTransform): boolean {
  return (
    Math.abs(t.k - DEFAULT_K) < 1e-6 &&
    Math.abs(t.x - DEFAULT_VIEW.x) < 0.5 &&
    Math.abs(t.y - DEFAULT_VIEW.y) < 0.5
  );
}

// The MAXIMUM zoom is no longer a constant. It is derived per data set by
// maxUsefulZoom() so that the tightest pair of real cities always comes apart:
// New Delhi and Gurgaon sit 0.53 base units apart, which needs k ~ 100 on a
// desktop and ~275 on a phone (where every pin claims a 44px tap disc), while
// the old fixed ceiling was 12. That fixed 12, together with the tile zoom the
// map handed supercluster, is exactly why the NCR super-pin never resolved.
// See src/lib/map-cluster.ts for the whole derivation.

/** One press of +/-. The zoom range now spans ~1..300 rather than 1..12, so a
 *  1.6x step would take a dozen presses to cross it; 2x crosses it in eight
 *  and still reads as one comfortable step. */
const ZOOM_STEP = 2;

/** Clicking a super-pin fits its members' bounds into the viewBox. 0.72 leaves
 *  the outermost pin about a pin's width clear of the edge instead of sitting
 *  half off it. */
const FIT_PAD = 0.72;

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

/* The inline card runs to the bottom of the window rather than stopping at
   `min(72vh, 640px)`, which left a dead band of page under it (owner,
   2026-08-28: "the map window now doesn't fill the screen there's a gap at the
   bottom can you make it extend").

   It is `flex-1` in a column that runs the height of the shell, and used to be
   a pixel height measured from window.innerHeight. The measurement was correct
   and still wrong: the server has no window, so it rendered a 360px card that
   grew to 700px the instant hydration ran, and that jump is the "weird glitch
   for a few milliseconds" the owner reported. Layout the browser can do on the
   first pass has no such frame. Every ancestor between here and <main> carries
   `flex min-h-0 flex-1 flex-col` for this. */
/* Mirrored, as a literal, by the `loading` box in directory-client.tsx: this
   component is loaded through next/dynamic there, so importing this constant
   would pull the module back into the route's first load and undo the point.
   If this number moves, move that one. */
const MAP_MIN_H = 360;

/** Every marker is a button: hover, focus-visible and active all read. Opacity
 *  only, per the motion rule (the group's transform is doing map work). */
const MARKER_CLASS =
  "group cursor-pointer outline-none transition-opacity duration-150 active:opacity-70";
const RING_CLASS =
  "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100";
/** `all` rather than the default `visiblePainted` so the transparent tap disc
 *  reliably takes the touch even where nothing is painted. */
const HIT_STYLE = { pointerEvents: "all" } as const;

/**
 * AlumniMap - the warm SVG world map.
 *
 * One pin per city, sqrt-scaled and counted. Cities whose hit discs would
 * overlap at the current zoom collapse into a super-pin (click it to zoom to
 * the level that splits it); the map's max zoom is derived from the data so
 * that every super-pin CAN be split. Clustering lives in src/lib/map-cluster.ts.
 * Pan and zoom via d3-zoom on the SVG group transform. Clicking a city pin opens
 * a drilldown panel listing that city's people (IdentityRow linking
 * to profiles). Renders inline by default and full-screen on demand.
 */
export function AlumniMap({
  pins,
  unmapped,
  unmappedPeople = [],
  namesLocked = false,
}: {
  pins: CityPin[];
  unmapped: number;
  unmappedPeople?: PinPerson[];
  /** Viewer is below Stage 1 (email unconfirmed): the pins carry counts but
   *  no people, so the drilldown explains the gate instead of reading "no one
   *  to show here yet" about a city with a number on it. */
  namesLocked?: boolean;
}) {
  const [transform, setTransform] = useState<ZoomTransform>(DEFAULT_VIEW);
  /* Empty until the atlas lands. Rendering no <path> is a frame the map has
     always been able to draw -- the pins carry the meaning and are painted
     from props on the first frame. See loadLandPaths above. */
  const [landPaths, setLandPaths] = useState<string[]>([]);
  /* The place and its headcount are kept APART rather than pre-joined into one
     string. The panel sets them at two different weights either side of a
     middle dot (owner, 2026-08-03: "maybe a middle dot instead of hyphen"),
     which a baked "London - 3 members" cannot be split back into. */
  const [drill, setDrill] = useState<
    { title: string; count: number | null; people: PinPerson[]; href?: string } | null
  >(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let live = true;
    getAtlas()
      .then((paths) => {
        if (live) setLandPaths(paths);
      })
      .catch((err) => {
        if (!live) return;
        /* The map still works without land: every pin, the clustering, the
           zoom and the drilldown are unaffected, so a failed atlas must not
           take the page down. Logged in development only -- a guard that
           hides its own breakage is worse than no guard, and in production
           this is a cosmetic degradation nobody should see an error page for. */
        if (process.env.NODE_ENV !== "production") {
          console.warn("[map] world atlas failed to load; drawing pins only", err);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  /** Live geometry of the rendered <svg>: its CSS box plus `s`, the CSS px that
   *  one viewBox unit currently occupies. See MIN_PX_PER_UNIT. */
  const [box, setBox] = useState({ w: 0, h: 0, s: MIN_PX_PER_UNIT });
  const [coarsePointer, setCoarsePointer] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomBehavior = useRef<any>(null);
  /** The live transform, readable from effects that must not re-run on zoom.
   *  Every change comes through the zoom handler, so this cannot drift. */
  const transformRef = useRef<ZoomTransform>(DEFAULT_VIEW);

  const max = Math.max(1, ...pins.map((p) => p.count));

  // Counter-scale for the marker layer, on top of the existing 1/k that keeps
  // pins a constant size through map zoom. 1 on desktop, ~2.6 on a phone.
  const pinBoost = Math.max(1, MIN_PX_PER_UNIT / (box.s || MIN_PX_PER_UNIT));

  // Every pin projected once. Clustering then works entirely in THIS space --
  // the space the map actually paints in -- rather than in web-mercator tiles.
  const geom = useMemo<PinGeom[]>(
    () =>
      pins.map((p) => {
        const xy = projection([p.lng, p.lat]);
        // NaN marks a point the projection rejects; map-cluster drops those
        // rather than plotting them at 0,0 in the Atlantic.
        return { x: xy?.[0] ?? NaN, y: xy?.[1] ?? NaN, count: p.count };
      }),
    [pins]
  );

  // Everything the pin geometry depends on. Touch gets a 44px hit disc behind
  // the dot; fine pointers keep exactly today's hit area (the halo circle), so
  // desktop clicking is untouched.
  const sizing = useMemo<MarkerSizing>(
    () => ({
      maxCount: max,
      pinBoost,
      pxPerUnit: box.s || MIN_PX_PER_UNIT,
      coarsePointer,
    }),
    [max, pinBoost, box.s, coarsePointer]
  );

  // How far in this data set has to be zoomable for every super-pin to resolve.
  const maxZoom = useMemo(() => maxUsefulZoom(geom, sizing), [geom, sizing]);

  // Cluster at the current zoom: more zoom splits super-pins apart, and by the
  // time k reaches maxZoom there is nothing left merged. `spread` only bites in
  // the pathological case where two cities are closer than the zoom ceiling can
  // separate, and lays those out on a fixed ring instead of clustering forever.
  const groups = useMemo(
    () => buildGroups(geom, transform.k, sizing, transform.k >= maxZoom * (1 - 1e-9)),
    [geom, transform.k, sizing, maxZoom]
  );

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
      // Kept in sync by the effect below: maxZoom is data-derived, so it moves
      // when the filters, the viewport or the pointer type change.
      .scaleExtent([MIN_Z, maxZoom])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (e) => {
        transformRef.current = e.transform;
        setTransform(e.transform);
        // Any pan, wheel or pinch the USER drives dismisses the tooltip. d3
        // leaves sourceEvent null for programmatic transforms (our own zoom
        // buttons and cluster zoom), so those do not fight the pointer.
      });
    zoomBehavior.current = zb;
    sel.call(zb);
    // Carry the live view across the full-screen swap. That toggle mounts a
    // BRAND NEW <svg>, whose d3 transform starts at identity, while React keeps
    // painting the zoom held in state: without this the next gesture snapped the
    // map back out to the whole world. On first mount it is what installs the
    // default view in d3, which React has already rendered.
    sel.call(zb.transform, transformRef.current);
    // No double-click zoom (it competes with pin clicks).
    sel.on("dblclick.zoom", null);
    return () => {
      sel.on(".zoom", null);
    };
    // maxZoom is deliberately NOT a dep: rebuilding the behaviour would drop
    // the in-flight gesture. The effect below keeps its extent current instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  // Keep the live zoom behaviour on the current data-derived ceiling.
  useEffect(() => {
    const zb = zoomBehavior.current;
    if (!zb || !svgRef.current) return;
    zb.scaleExtent([MIN_Z, maxZoom]);
    // Rotating a phone or leaving full screen can lower the ceiling under a
    // zoom the user already holds; pull them back down to the new one.
    if (transform.k > maxZoom) select(svgRef.current).call(zb.scaleTo, maxZoom);
  }, [maxZoom, transform.k]);

  /** Centre (x, y) at scale k. scaleTo + translateTo rather than a hand-built
   *  transform so d3 runs its own constraints (scaleExtent, translateExtent):
   *  a cluster near the edge of the world can no longer park the map off its
   *  own canvas. */
  function zoomTo(x: number, y: number, k: number) {
    const zb = zoomBehavior.current;
    if (!svgRef.current || !zb) return;
    const sel = select(svgRef.current);
    sel.call(zb.scaleTo, k);
    sel.call(zb.translateTo, x, y);
  }

  /** One press of the +/- buttons. scaleBy holds the CENTRE of the current view
   *  still; the old code re-centred on the map's own middle, which threw you
   *  back out to the Atlantic every time you pressed + while reading India. */
  function zoomStep(factor: number) {
    const zb = zoomBehavior.current;
    if (!svgRef.current || !zb) return;
    select(svgRef.current).call(zb.scaleBy, factor);
  }

  function onClusterClick(g: MapGroup) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const i of g.members) {
      minX = Math.min(minX, geom[i].x);
      maxX = Math.max(maxX, geom[i].x);
      minY = Math.min(minY, geom[i].y);
      maxY = Math.max(maxY, geom[i].y);
    }
    // Fit this cluster's own bounds, the usual "zoom to bounds" click: one
    // click on the world blob lands you on India, the next on the NCR, rather
    // than teleporting from the whole world to a 2km view of Gurgaon.
    const fit = Math.min(W / Math.max(maxX - minX, 1e-9), H / Math.max(maxY - minY, 1e-9)) * FIT_PAD;
    const target = Math.min(
      maxZoom,
      Math.max(
        // Never less than one +/- step, so a click always visibly does
        // something, and never deeper than the zoom that fully splits THIS
        // cluster, so a pair of neighbours does not overshoot into empty green.
        transform.k * ZOOM_STEP,
        Math.min(fit, separatingZoom(geom, g.members, sizing))
      )
    );
    zoomTo((minX + maxX) / 2, (minY + maxY) / 2, target);
  }

  const mapBody = (
    <div
      /* absolute inset-0, not h-full: the card's height now comes from
         `flex-1` rather than an inline pixel value, and a percentage height
         only resolves against a containing block that has a DEFINITE one.
         Below md the shell is a flex column sized by min-height, which is not
         definite, so `h-full` collapsed to the svg's own aspect ratio and the
         map became a 178px strip at the top of a 579px card. Insetting to the
         card's padding box sidesteps the question. */
      className="absolute inset-0 overflow-hidden"
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

          {groups.map((g) => {
            // The hit disc comes straight from the clustering maths, so what
            // the user can tap is exactly what the no-overlap rule reasoned
            // about. hitU is in screen units; the marker layer draws at
            // pinBoost, hence the divide.
            const hit = g.hitU / pinBoost;
            if (g.members.length > 1) {
              const r = sqrtRadius(g.count, max) + 4;
              const halo = r + 4;
              /* The hover tooltip that read "N members across M cities" is
                 gone (owner, 2026-08-03), and the whole tip rig with it: the
                 state, the Escape handler, the orphan guard and the three
                 pointer handlers that existed only to dismiss it. The disc
                 already prints its own count, and the cities behind it are
                 exactly what clicking gives you, so the label restated one
                 number and promised the other. The screen-reader name keeps
                 the count, because a screen reader cannot see the numeral
                 drawn inside the circle. */
              return (
                <g
                  key={g.key}
                  transform={`translate(${g.x},${g.y}) scale(${pinBoost / transform.k})`}
                  className={MARKER_CLASS}
                  role="button"
                  tabIndex={0}
                  aria-label={`Zoom in to ${g.count} ${g.count === 1 ? "member" : "members"}`}
                  onClick={() => {
                    onClusterClick(g);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClusterClick(g);
                    }
                  }}
                >
                  <circle r={hit} fill="transparent" style={HIT_STYLE} />
                  <circle r={halo} fill="#3F7CA6" opacity={0.18} />
                  <circle r={r} fill="#3F7CA6" opacity={0.92} stroke="#fff" strokeWidth={1.5} />
                  <text
                    textAnchor="middle"
                    dy="0.34em"
                    fontSize={11}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {g.count}
                  </text>
                  <circle r={halo} className={RING_CLASS} fill="none" stroke="#235C49" strokeWidth={2} />
                </g>
              );
            }
            const pin = pins[g.members[0]];
            const r = sqrtRadius(pin.count, max);
            const halo = r + 3;
            const title = `${pin.city} - ${pin.count} ${pin.count === 1 ? "member" : "members"}`;
            return (
              <g
                key={g.key}
                transform={`translate(${g.x},${g.y}) scale(${pinBoost / transform.k})`}
                className={MARKER_CLASS}
                role="button"
                tabIndex={0}
                aria-label={`${title}. Open the list.`}
                // Deliberately no tooltip: a city pin opens the side panel,
                // which already leads with this exact line, so the hover label
                // was pure duplication (owner call, 2026-07).
                onClick={() => {
                  setDrill({
                      title: pin.city,
                      count: pin.count,
                      people: pin.people,
                      href: pinHref(pin),
                    });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDrill({
                      title: pin.city,
                      count: pin.count,
                      people: pin.people,
                      href: pinHref(pin),
                    });
                  }
                }}
              >
                <circle r={hit} fill="transparent" style={HIT_STYLE} />
                <circle r={halo} fill="#1F8A4C" opacity={0.18} />
                <circle r={r} fill="#1F8A4C" opacity={0.9} stroke="#fff" strokeWidth={1.25} />
                {pin.count >= 2 && r > 11 && (
                  <text
                    textAnchor="middle"
                    dy="0.34em"
                    fontSize={10}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {pin.count}
                  </text>
                )}
                <circle r={halo} className={RING_CLASS} fill="none" stroke="#235C49" strokeWidth={2} />
              </g>
            );
          })}
        </g>
      </svg>

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
          onClick={() => zoomStep(ZOOM_STEP)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-lg font-semibold text-foreground shadow-sm backdrop-blur transition-transform state-layer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomStep(1 / ZOOM_STEP)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-lg font-semibold text-foreground shadow-sm backdrop-blur transition-transform state-layer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          &minus;
        </button>
        {/* Back to the opening view. Earned by the new zoom range: the ceiling
            is now whatever this data set needs to pull its tightest pair of
            cities apart (hundreds, not 12), so walking back out on the minus
            button alone would take ten presses. Hidden at rest, when it would
            say nothing the map is not already showing -- and "at rest" is the
            default framing now, not k = 1, since minus still walks out past it
            to the whole sphere. */}
        {!isDefaultView(transform) && (
          <button
            type="button"
            aria-label="Reset the view"
            onClick={() => {
              /* The transform itself, not scaleTo + translateTo: the opening
                 view is deliberately off-centre, and centring would land
                 somewhere the map never opens on. */
              if (svgRef.current && zoomBehavior.current) {
                select(svgRef.current).call(zoomBehavior.current.transform, DEFAULT_VIEW);
              }
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-transform state-layer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Globe className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setFullscreen((v) => !v);
        }}
        aria-label={fullscreen ? "Exit full screen" : "View full screen"}
        className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/95 py-1.5 pl-2.5 pr-3 text-[12px] font-semibold text-foreground shadow-sm backdrop-blur transition-transform state-layer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            setFullscreen(false);
          }}
          aria-label="Exit full screen"
          className="absolute z-30 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition-transform state-layer active:scale-95 sm:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              title: "Not yet on the map",
              count: unmapped,
              people: unmappedPeople,
            })
          }
          className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/90 py-1 pl-2.5 pr-3 text-[12px] text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <MapPin className="h-3 w-3" />
          {unmapped} not yet on the map
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Inline map. Fills the column, floors at MAP_MIN_H -- see there. */}
      <div
        className="card-elevated relative flex-1 overflow-hidden rounded-[var(--radius)] border border-border"
        style={{ minHeight: MAP_MIN_H }}
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

      {/* City drilldown: a side panel, the same on every viewport.
          It rides the shared Sheet's mechanics but NOT its Float-white
          surface. Float #FFFFFF is reserved for floating menus and dialogs
          (DESIGN-SYSTEM section 2); this is a content region attached to the
          map, the same kind of thing as the cards behind it, so it takes the
          normal card treatment: bg-card, hairline border, 16px radius.
          Owner, 2026-08-02: "when you click on a city in directory now it
          shows it against a white background. that doesn't look good ... in
          directory for example we want it to be on the sidebar showing who's
          in what city."
          rounded-l only: the right edge is pinned to the viewport, so a radius
          there would just leak slivers of the scrim. Same convention as the
          bottom sheets, which round their top edge alone (filter-sheet.tsx). */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent
          side="right"
          /* bg-background, not bg-card (owner, 2026-08-03: "a little warmer ...
             it's a bit too white"). Card is `--paper` #F5F2EA, the second
             lightest rung on the surface ladder, and with the scrim dimming
             everything behind it that rung reads as white. `--background`
             #E4E1D5 is the warmest surface the system has (warm cast R-B of 15
             against paper's 11) and is a real SURFACE token rather than a
             borrowed control one: `--mist` is spoken for as recessed wells and
             `--secondary` as quiet filled controls, so neither should become a
             panel. The separation from the dimmed page behind is carried by the
             hairline and the layered shadow, which is what they are for. */
          className="w-full overflow-y-auto rounded-l-[var(--radius)] bg-background sm:max-w-md"
        >
          {/* pb-1: the header's own p-4 plus the list's old mt-2 plus a row's
              py-2 stacked up to ~32px of structural air under the title, on top
              of the tall heading line box, which is the "weirdly big" gap the
              owner measured between the location and the first name. */}
          <SheetHeader className="pb-1">
            <SheetTitle className="font-heading text-xl tracking-tight">
              {drill?.title}
              {drill?.count != null && (
                <>
                  {/* The shared middle dot, replacing the hyphen. The count is
                      dropped to body size and muted ink in the same line: it is
                      a fact ABOUT the place, so it should not carry the same
                      weight as the place's name. */}
                  <span aria-hidden className="dotsep mx-1.5">
                    ·
                  </span>
                  <span className="text-[15px] font-normal tracking-normal text-muted-foreground">
                    {drill.count} {drill.count === 1 ? "member" : "members"}
                  </span>
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          {/* px-2 rather than px-4: each row carries its own px-2 for the hover
              state layer, so at px-4 the avatars started 24px in while the
              title started at 16px. Now both edges land on 16px. */}
          <div className="space-y-0.5 px-2 pb-8">
            {namesLocked ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                Confirm your email to see who&apos;s here. Tap the link we sent
                you and this list opens.
              </p>
            ) : drill?.people.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
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
                  className="group block rounded-[var(--radius-md)] px-2 py-2 state-layer active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            {/* Only the first handful of a pin's people travel to the browser
                (PIN_PEOPLE_CAP in the directory page): everything here is
                serialized into the payload of every directory load and every
                filter change, so a full list is a cost paid by every member for
                a sheet almost nobody opens. Past the cap the sheet hands over
                to the directory itself, which is paginated, searchable and a
                far better place to read two hundred names (bug audit B-092). */}
            {/* `drill.href` is required, not defaulted to /directory (audit
                C-098): the unmapped bucket has no destination that lists its
                people, and the fallback sent them to the browse map -- which
                shows none of them. A link that goes somewhere wrong is worse
                than no link, so that bucket says the number in words instead
                (below) and offers nothing to press. */}
            {!namesLocked && drill?.href && drill.count != null && drill.people.length < drill.count && (
              <Link
                href={drill.href}
                onClick={() => setDrill(null)}
                className="group mt-1 block rounded-[var(--radius-md)] px-2 py-3 text-[15px] font-medium text-canopy state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="group-hover:underline">
                  See all {drill.count} in the directory
                </span>
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
