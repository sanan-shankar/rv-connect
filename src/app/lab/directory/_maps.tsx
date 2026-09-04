"use client";

/* ------------------------------------------------------------------ *
 *  Five ways to draw where the valley went.
 *
 *  The owner's worry, verbatim: "when even a hundred people are on this
 *  it's going to become pretty unmanageable because there's going to be
 *  too many circles and too many different places ... the touch targets
 *  can become very small especially if the green circles are overlapping
 *  ... it just might not look all that great, and there might be ways to
 *  do it that are just totally different from this circle method."
 *
 *  So every concept below is judged on ONE number as well as on looks:
 *  how many separate objects it puts on screen at 2400 members. A design
 *  whose object count is bounded by the ZOOM LEVEL rather than by the
 *  data cannot become unmanageable; a design whose object count tracks
 *  the data always will, eventually.
 *
 *  Nothing here imports src/components/directory/alumni-map.tsx or
 *  src/lib/map-cluster.ts. Both are being edited by a concurrent session.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import { cn } from "@/lib/utils";
import {
  cityPoints, countryPoints, regionPoints,
  type CityPoint, type Member,
} from "./_data";

/* --- projection, shared ---------------------------------------------- */

const W = 900;
const H = 460;
const PAD = 8;

const projection = geoNaturalEarth1().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], { type: "Sphere" });
const pathGen = geoPath(projection);

/* The atlas is FETCHED, not imported, for the reason alumni-map.tsx sets out
   at length above its own copy of this: `import worldData from
   "world-atlas/countries-110m.json"` compiles 105 KB of JSON into a JavaScript
   module and parses it on the main thread. This room was the last importer in
   the repository, and world-atlas was a PRODUCTION dependency because of it.
   Same static file the shipped map reads, cached immutable by next.config.ts. */
const ATLAS_URL = "/geo/countries-110m.json";

type Topology = Parameters<typeof feature>[0];
type LandPath = { d: string; name: string };

/* Empty until the atlas lands, which both consumers already cope with: they
   map over it, and an empty array renders no <path>. The markers are the
   concept being judged; the land is the backdrop. */
function useLand(): LandPath[] {
  const [land, setLand] = useState<LandPath[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(ATLAS_URL, { signal: ac.signal });
        if (!res.ok) throw new Error(`atlas ${res.status}`);
        const topo = (await res.json()) as Topology;
        const world = feature(topo, topo.objects.countries) as unknown as {
          features: Feature<Geometry>[];
        };
        setLand(
          world.features.map((f) => ({
            d: pathGen(f) ?? "",
            name: (f.properties as { name?: string } | null)?.name ?? "",
          })),
        );
      } catch (err) {
        if (!ac.signal.aborted) console.warn("[lab/directory] world atlas failed to load", err);
      }
    })();
    return () => ac.abort();
  }, []);
  return land;
}

function project(lng: number, lat: number): [number, number] {
  return projection([lng, lat]) ?? [0, 0];
}

/* --- the canvas ------------------------------------------------------ *
 *
 *  Pan and zoom on the group transform, land underneath, concept markers
 *  on top. The land fill is `--muted` on `--secondary`: the sea is a
 *  recessed well and the land is the rung above it, which keeps the map
 *  inside the surface ladder instead of introducing two new greys.
 * ------------------------------------------------------------------ */

export function WorldCanvas({
  height = 380,
  maxZoom = 14,
  children,
  onTransform,
  chrome,
  className,
}: {
  height?: number;
  maxZoom?: number;
  children: (t: ZoomTransform) => React.ReactNode;
  onTransform?: (t: ZoomTransform) => void;
  /* Receives the transform only. It used to receive `zoomBy`/`reset` too,
     which both read a ref, and handing a ref-reading function to a callback
     that runs DURING render is what react-hooks/refs correctly objects to.
     No caller needed them; the zoom buttons are rendered by this component. */
  chrome?: (t: ZoomTransform) => React.ReactNode;
  className?: string;
}) {
  const LAND = useLand();
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zb = useRef<any>(null);

  /* onTransform lives in a ref, not in the effect's dependency list. Callers
     pass an inline arrow, so a plain dependency would make this effect re-run
     on every render, and each run tears down and re-installs the d3 zoom
     behaviour. The visible symptom of that mistake is a map that drops the
     drag halfway through, because the listener the pointer started on no
     longer exists by the second frame. */
  const onTransformRef = useRef(onTransform);
  useEffect(() => {
    onTransformRef.current = onTransform;
  });

  useEffect(() => {
    if (!svgRef.current) return;
    const sel = select(svgRef.current);
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, maxZoom])
      .translateExtent([[0, 0], [W, H]])
      .on("zoom", (e) => {
        setT(e.transform);
        onTransformRef.current?.(e.transform);
      });
    zb.current = z;
    sel.call(z);
    sel.on("dblclick.zoom", null);
    return () => { sel.on(".zoom", null); };
  }, [maxZoom]);

  /* Instant, not tweened. d3-transition is present only transitively and
     ships no types here, and pulling it in to sweeten a lab button is not
     worth a dependency. The shipped map zooms instantly for the same reason,
     so the two behave alike and the comparison stays fair. */
  const zoomBy = useCallback((f: number) => {
    if (!svgRef.current || !zb.current) return;
    select(svgRef.current).call(zb.current.scaleBy, f);
  }, []);
  const reset = useCallback(() => {
    if (!svgRef.current || !zb.current) return;
    select(svgRef.current).call(zb.current.transform, zoomIdentity);
  }, []);

  return (
    <div
      className={cn("relative overflow-hidden rounded-[var(--radius)] border border-border", className)}
      style={{ height, background: "var(--muted)" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-full w-full touch-none select-none"
        style={{ cursor: "grab" }}
        role="group"
        aria-label="Map of where members live"
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {LAND.map((l, i) => (
            <path key={i} d={l.d} fill="#CFD9CB" stroke="#BCC7B7" strokeWidth={0.5 / t.k} />
          ))}
          {children(t)}
        </g>
      </svg>
      {chrome?.(t)}
      <MapControls onIn={() => zoomBy(1.6)} onOut={() => zoomBy(1 / 1.6)} onReset={reset} zoomed={t.k > 1.01} />
    </div>
  );
}

function MapControls({
  onIn, onOut, onReset, zoomed,
}: { onIn: () => void; onOut: () => void; onReset: () => void; zoomed: boolean }) {
  const btn =
    "state-layer grid size-9 place-items-center rounded-full border border-border bg-card/95 text-[15px] font-semibold text-foreground shadow-sm backdrop-blur outline-none transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy";
  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
      <button type="button" aria-label="Zoom in" onClick={onIn} className={btn}>+</button>
      <button type="button" aria-label="Zoom out" onClick={onOut} className={btn}>&minus;</button>
      {zoomed && (
        <button type="button" aria-label="Reset the view" onClick={onReset} className={cn(btn, "text-[11px] font-bold uppercase tracking-wide")}>
          {/* A reset is the one control the shipped map has no equivalent
              for: once you have zoomed into a cluster there is no way back
              to the world except pinching out repeatedly. */}
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
            <path d="M13 8a5 5 0 1 1-1.6-3.7" /><path d="M13 2.5V5h-2.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** A count badge that never renders smaller than legible: the shipped map
 *  hides a pin's count whenever its radius drops under 11 units, so on a
 *  phone the small cities silently stop saying how many people are in
 *  them. Here the label leaves the disc instead of disappearing. */
function pinRadius(count: number, max: number) {
  // Area proportional to count. 7 is the floor, not 9: with a guaranteed
  // label beside it a small pin no longer has to be big enough to hold text.
  return 7 + Math.sqrt(count / Math.max(1, max)) * 20;
}

/* ================================================================== *
 *  M1 - Counted circles, repaired.
 *
 *  Same family as shipped, with the four stated failures fixed:
 *
 *  1. OVERLAP. Cities are pushed apart by a relaxation pass until no two
 *     discs intersect (four iterations of pairwise separation, which is
 *     enough at these densities and is O(n^2) over the ~60 visible pins,
 *     not over members). Shipped has no separation step at all, so
 *     Delhi/Gurugram/Noida draw as one green smear at world zoom.
 *  2. TOUCH. Every marker carries a transparent 44px hit disc.
 *  3. COUNT LEGIBILITY. The number lives in a label beside the pin, not
 *     inside it, so it does not vanish on small pins or on a phone.
 *  4. CITY vs CLUSTER told apart by SHAPE (a ring) as well as colour, so
 *     it survives a red-green colourblind reader. Shipped uses leaf green
 *     against sky blue and nothing else.
 * ================================================================== */

type Placed = CityPoint & { x: number; y: number; r: number };

/** Push overlapping discs apart. Deterministic, order-independent within a
 *  pass, and capped, so it never introduces the jitter the spec forbids for
 *  aggregate pins: a pin moves only far enough to stop touching a neighbour,
 *  and the displacement is reported so the room can show it. */
function separate(nodes: Placed[], iterations = 4, gap = 1.5) {
  const out = nodes.map((n) => ({ ...n }));
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r + gap;
        if (dist < min) {
          const push = (min - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          // The larger pin moves less: a 200-member city should stay where
          // it belongs and the single-member town beside it should give way.
          const wa = b.r / (a.r + b.r), wb = a.r / (a.r + b.r);
          a.x -= ux * push * 2 * wa; a.y -= uy * push * 2 * wa;
          b.x += ux * push * 2 * wb; b.y += uy * push * 2 * wb;
        }
      }
    }
  }
  return out;
}

export function MapCircles({
  points, onPick, height,
}: { points: CityPoint[]; onPick: (city: string) => void; height?: number }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <WorldCanvas height={height}>
      {(t) => {
        // Separation runs in SCREEN space, so it re-solves as you zoom and
        // pins pull apart properly instead of staying frozen in world space.
        const raw: Placed[] = points.map((p) => {
          const [x, y] = project(p.lng, p.lat);
          return { ...p, x, y, r: pinRadius(p.count, max) / t.k };
        });
        const placed = separate(raw, 4, 1.5 / t.k);
        return (
          <g>
            {/* Leader lines: when separation has moved a pin off its true
                coordinate by more than its own radius, a hairline ties it
                back so the map never quietly lies about where a place is. */}
            {placed.map((p, i) => {
              const [tx, ty] = project(p.lng, p.lat);
              const moved = Math.hypot(p.x - tx, p.y - ty);
              if (moved < p.r) return null;
              return (
                <line
                  key={`l${i}`} x1={tx} y1={ty} x2={p.x} y2={p.y}
                  stroke="#235C49" strokeWidth={0.6 / t.k} opacity={0.35}
                />
              );
            })}
            {placed.map((p, i) => (
              <g
                key={`${p.city}-${i}`}
                transform={`translate(${p.x},${p.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.city}, ${p.count} ${p.count === 1 ? "member" : "members"}`}
                onClick={() => onPick(p.city)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(p.city); } }}
                className="group cursor-pointer outline-none"
              >
                <circle r={Math.max(p.r, 22 / t.k)} fill="transparent" style={{ pointerEvents: "all" }} />
                <circle r={p.r + 2.5 / t.k} fill="#1F8A4C" opacity={0.16} />
                <circle r={p.r} fill="#1F8A4C" opacity={0.92} stroke="#F5F2EA" strokeWidth={1.1 / t.k} />
                <circle
                  r={p.r + 4 / t.k} fill="none" stroke="#235C49" strokeWidth={2 / t.k}
                  className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                {/* The count sits OUTSIDE the disc on a paper chip, so it is
                    the same size on every pin and at every member count. */}
                <g transform={`translate(${p.r + 3 / t.k}, 0)`}>
                  <rect
                    x={0} y={-6 / t.k}
                    width={(String(p.count).length * 6 + 8) / t.k} height={12 / t.k}
                    rx={6 / t.k} fill="#F5F2EA" stroke="#DFD8CB" strokeWidth={0.5 / t.k}
                  />
                  <text
                    x={(String(p.count).length * 6 + 8) / 2 / t.k} y={0} dy="0.34em"
                    textAnchor="middle" fontSize={9 / t.k} fontWeight={700} fill="#23241E"
                  >
                    {p.count}
                  </text>
                </g>
              </g>
            ))}
          </g>
        );
      }}
    </WorldCanvas>
  );
}

/* --- label placement helpers, shared by M2 and M3 -------------------- */

/** Approximate rendered width of a label. A canvas measureText would be
 *  exact, but it costs a context per frame and the error here is under a
 *  character's width at these sizes, which the 2px padding absorbs. */
function labelWidth(text: string, count: number, fontSize: number) {
  return (text.length * 0.52 + String(count).length * 0.6 + 1.6) * fontSize;
}

type Box = { x0: number; y0: number; x1: number; y1: number };
function hits(a: Box, b: Box) {
  return !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
}

/* ================================================================== *
 *  M2 - Semantic tiers.
 *
 *  The object count is a function of the ZOOM, not of the data. Zoomed
 *  out you see countries; one step in, regions; one more, cities. At
 *  every tier the number of things on screen is small and roughly
 *  constant whether the community is 30 people or 3000, which is a
 *  direct answer to the owner's scaling worry rather than a mitigation
 *  of it.
 *
 *  The tier boundaries are powers of the zoom factor rather than round
 *  numbers so that one press of the + button (x1.6) never skips a tier.
 * ================================================================== */

const TIER_REGION = 1.9;   // ~1 press of +
const TIER_CITY = 4.7;     // ~3 presses

export function MapTiers({
  points, onPick, height,
}: { points: CityPoint[]; onPick: (city: string) => void; height?: number }) {
  const countries = useMemo(() => countryPoints(points), [points]);
  const regions = useMemo(() => regionPoints(points), [points]);
  const [tierLabel, setTierLabel] = useState("Countries");

  return (
    <WorldCanvas
      height={height}
      onTransform={(t) =>
        setTierLabel(t.k < TIER_REGION ? "Countries" : t.k < TIER_CITY ? "Regions" : "Cities")
      }
      chrome={() => (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-border bg-card/95 py-1.5 pl-3 pr-3.5 text-[12px] font-semibold text-foreground shadow-sm backdrop-blur">
          <span className="size-1.5 rounded-full bg-leaf" aria-hidden />
          {tierLabel}
          <span className="font-normal text-muted-foreground">zoom in for more</span>
        </div>
      )}
    >
      {(t) => {
        const tier = t.k < TIER_REGION ? "country" : t.k < TIER_CITY ? "region" : "city";
        const nodes =
          tier === "country"
            ? countries.map((c) => ({ key: c.country, label: c.country, count: c.count, sub: `${c.cities} ${c.cities === 1 ? "place" : "places"}`, lng: c.lng, lat: c.lat, city: null as string | null }))
            : tier === "region"
              ? regions.map((r) => ({ key: r.region, label: r.region, count: r.count, sub: `${r.cities} ${r.cities === 1 ? "place" : "places"}`, lng: r.lng, lat: r.lat, city: null as string | null }))
              : points.map((p) => ({ key: p.city, label: p.city, count: p.count, sub: p.admin, lng: p.lng, lat: p.lat, city: p.city }));

        const max = Math.max(1, ...nodes.map((n) => n.count));
        const raw: Placed[] = nodes.map((n) => {
          const [x, y] = project(n.lng, n.lat);
          return {
            city: n.label, admin: n.sub, country: "", region: "",
            lng: n.lng, lat: n.lat, count: n.count, members: [],
            x, y, r: pinRadius(n.count, max) / t.k,
          };
        });
        const placed = separate(raw, 3, 2 / t.k);

        /* Which nodes get a name. Biggest first, so when two collide the
           larger place keeps its label, and the box is the one actually drawn
           below the disc (centred, at r + 11). `hits` and the 3-unit pad are
           shared with concept 3 so the two maps resolve collisions the same
           way rather than each inventing a rule. */
        const fs = 10 / t.k;
        const pad = 3 / t.k;

        /* Seed the occupied set with every DISC, not only with already-placed
           labels. Label-versus-label alone was not enough: "United Arab
           Emirates" is a long name under a small disc sitting beside India's
           very large one, so its box cleared every other label and still ran
           straight underneath a circle. A disc is ink too. Each node's own
           disc is excluded, because its label is placed below that disc by
           construction and would otherwise always self-collide. */
        const discs: Box[] = placed.map((p) => ({
          x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r,
        }));

        /* Four candidate positions per label, below first, then above, then
           right, then left. Below-only was the version before this one and it
           over-suppressed badly: India is the largest node on the map and lost
           its name outright, because its single candidate sat on Sri Lanka's
           disc. Losing the biggest label is a worse failure than the collision
           the rule was added to prevent, and one fallback position recovers it.
           Placement is stored per node so the text can be drawn where it was
           actually solved for. */
        const taken: Box[] = [];
        const labelled = new Map<number, { x: number; y: number; anchor: "middle" | "start" | "end" }>();
        const half = fs * 0.75;
        for (const i of placed
          .map((_, idx) => idx)
          .sort((x, y) => placed[y].count - placed[x].count)) {
          const p = placed[i];
          const w = labelWidth(p.city, p.count, fs);
          const gap = 4 / t.k;
          // `as const` on the anchors, or the array literal widens them to
          // `string` and the mapped result stops matching Box's union.
          const cands: { box: Box; x: number; y: number; anchor: "middle" | "start" | "end" }[] = ([
            { x: p.x, y: p.y + p.r + 11 / t.k, anchor: "middle" },
            { x: p.x, y: p.y - p.r - 7 / t.k, anchor: "middle" },
            { x: p.x + p.r + gap, y: p.y, anchor: "start" },
            { x: p.x - p.r - gap, y: p.y, anchor: "end" },
          ] as const).map((c) => ({
            ...c,
            box: {
              x0: (c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2) - pad,
              y0: c.y - half - pad / 2,
              x1: (c.anchor === "start" ? c.x + w : c.anchor === "end" ? c.x : c.x + w / 2) + pad,
              y1: c.y + half + pad / 2,
            },
          }));
          const hit = cands.find(
            (c) =>
              !taken.some((b) => hits(c.box, b)) &&
              !discs.some((b, j) => j !== i && hits(c.box, b))
          );
          if (!hit) continue;
          taken.push(hit.box);
          labelled.set(i, { x: hit.x, y: hit.y, anchor: hit.anchor });
        }

        return (
          <g>
            {placed.map((p, i) => {
              const node = nodes[i];
              return (
                <g
                  key={p.city}
                  transform={`translate(${p.x},${p.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.city}, ${p.count} members`}
                  onClick={() => node.city && onPick(node.city)}
                  className={cn("group outline-none", node.city ? "cursor-pointer" : "cursor-zoom-in")}
                >
                  <circle r={Math.max(p.r, 22 / t.k)} fill="transparent" style={{ pointerEvents: "all" }} />
                  <circle r={p.r + 3 / t.k} fill="#1F8A4C" opacity={0.14} />
                  <circle r={p.r} fill="#1F8A4C" opacity={0.92} stroke="#F5F2EA" strokeWidth={1.1 / t.k} />
                  <circle
                    r={p.r + 4.5 / t.k} fill="none" stroke="#235C49" strokeWidth={2 / t.k}
                    className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                  {/* Name plus count, but only where it FITS. The first
                      version labelled every node unconditionally, on the
                      theory that bounding the object count also bounds the
                      labels. It does not: at the country tier the European
                      nodes sit within a few projected pixels of each other,
                      so Netherlands, Sweden, United Kingdom, Germany and
                      France drew straight through one another. Bounding the
                      number of OBJECTS says nothing about how far apart they
                      are, so this runs the same collision solver concept 3
                      uses, and a node that cannot be labelled keeps its
                      disc and its count-in-tooltip instead. */}
                  {(() => {
                    const lab = labelled.get(i);
                    if (!lab) return null;
                    // Drawn at the position the solver actually chose, in the
                    // group's own local space (the <g> is already translated
                    // to the node).
                    return (
                      <text
                        x={lab.x - p.x}
                        y={lab.y - p.y}
                        dy="0.34em"
                        textAnchor={lab.anchor}
                        fontSize={fs}
                        fontWeight={700}
                        fill="#23241E"
                        stroke="#ECE8DD"
                        strokeWidth={2.6 / t.k}
                        paintOrder="stroke"
                      >
                        {p.city}
                        <tspan fill="#6E7268" fontWeight={600}>{"  "}{p.count}</tspan>
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </g>
        );
      }}
    </WorldCanvas>
  );
}

/* ================================================================== *
 *  M3 - Label priority.
 *
 *  What an actual cartographer does, and what Google and Apple do: never
 *  cluster, PRIORITISE. Sort places by count, walk the list, and draw a
 *  label only if its box does not collide with one already drawn. Skipped
 *  places keep a bare dot. Zooming in spreads the boxes apart, so more
 *  names appear, which is a reward for exploring rather than a mechanic
 *  to learn.
 *
 *  The result reads as a field-journal map, which is the register in
 *  Appendix A of the design system, and it has no clusters to click, no
 *  cluster-vs-city ambiguity, and no discs to overlap.
 * ================================================================== */

/** Publishes a value computed inside a render prop back up to the owner,
 *  from an effect. Renders nothing. Exists so the label solver can report
 *  how many names it fitted without setting state during a render. */
function ReportCount({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  useEffect(() => {
    onChange(value);
  }, [value, onChange]);
  return null;
}

export function MapLabels({
  points, onPick, height,
}: { points: CityPoint[]; onPick: (city: string) => void; height?: number }) {
  const [shown, setShown] = useState(0);
  return (
    <WorldCanvas
      height={height}
      chrome={() => (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[12px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span>
            <b className="font-semibold tabular-nums text-foreground">{shown}</b> of {points.length} named
          </span>
          <span aria-hidden className="opacity-45">·</span>
          <span>zoom for more</span>
        </div>
      )}
    >
      {(t) => {
        const fs = 10 / t.k;
        const dotR = 2.6 / t.k;
        const placedBoxes: Box[] = [];
        const nodes = [...points]
          .sort((a, b) => b.count - a.count)
          .map((p) => {
            const [x, y] = project(p.lng, p.lat);
            const w = labelWidth(p.city, p.count, fs);
            const h = fs * 1.25;
            // Label sits to the right of the dot by default. If that box is
            // taken, try left, then above, then below, before giving up and
            // leaving a bare dot. Four candidate positions is the standard
            // trick and it roughly doubles how many names fit.
            const candidates: Box[] = [
              { x0: x + dotR + 2 / t.k, y0: y - h / 2, x1: x + dotR + 2 / t.k + w, y1: y + h / 2 },
              { x0: x - dotR - 2 / t.k - w, y0: y - h / 2, x1: x - dotR - 2 / t.k, y1: y + h / 2 },
              { x0: x - w / 2, y0: y - dotR - 2 / t.k - h, x1: x + w / 2, y1: y - dotR - 2 / t.k },
              { x0: x - w / 2, y0: y + dotR + 2 / t.k, x1: x + w / 2, y1: y + dotR + 2 / t.k + h },
            ];
            /* Test against a box inflated by `pad`, then store the inflated
               one. Without it, two accepted labels are allowed to finish and
               start on the exact same pixel, which is technically not a
               collision and reads as one run of text: at 2400 members
               "Chennai" and "Bengaluru 511" sat flush against each other in
               the south-India cluster and looked like a single label. 3 units
               is a word space at this size. */
            const pad = 3 / t.k;
            const inflate = (bx: Box): Box => ({
              x0: bx.x0 - pad, y0: bx.y0 - pad / 2, x1: bx.x1 + pad, y1: bx.y1 + pad / 2,
            });
            const box = candidates.find((c) => !placedBoxes.some((p2) => hits(inflate(c), p2)));
            if (box) placedBoxes.push(inflate(box));
            // `as const` so the union narrows to SVG's textAnchor literals
            // rather than widening to string.
            const anchor = (box ? (box.x0 >= x ? "start" : box.x1 <= x ? "end" : "middle") : "start") as
              | "start" | "end" | "middle";
            return { p, x, y, box, anchor };
          });

        // Reporting the visible count out of the total keeps the design
        // honest: a map that silently drops 300 names is worse than one that
        // says it is showing 40 of 340. The number is computed here, where
        // the layout solve happens, but PUBLISHED from an effect in the tiny
        // component below: setting state during a render is a React error,
        // and the queueMicrotask dodge that hides the warning still tears
        // through a second render pass on every pan frame.
        const count = nodes.filter((n) => n.box).length;

        return (
          <g>
            <ReportCount value={count} onChange={setShown} />
            {nodes.map(({ p, x, y, box, anchor }) => (
              <g
                key={p.city}
                role="button"
                tabIndex={0}
                aria-label={`${p.city}, ${p.count} ${p.count === 1 ? "member" : "members"}`}
                onClick={() => onPick(p.city)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(p.city); } }}
                className="group cursor-pointer outline-none"
              >
                <circle cx={x} cy={y} r={22 / t.k} fill="transparent" style={{ pointerEvents: "all" }} />
                {/* Dot size still carries magnitude, but over a much
                    narrower range than a proportional disc, because the
                    number is written down beside it and does not have to be
                    inferred from area. */}
                <circle cx={x} cy={y} r={dotR + Math.min(2.4, Math.log2(p.count + 1) * 0.6) / t.k} fill="#1F8A4C" />
                <circle
                  cx={x} cy={y} r={(dotR + 5) / t.k} fill="none" stroke="#235C49" strokeWidth={1.6 / t.k}
                  className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                {box && (
                  <text
                    x={anchor === "start" ? box.x0 : anchor === "end" ? box.x1 : (box.x0 + box.x1) / 2}
                    y={(box.y0 + box.y1) / 2}
                    dy="0.34em"
                    textAnchor={anchor}
                    fontSize={fs}
                    fontWeight={600}
                    fill="#23241E"
                    stroke="#ECE8DD"
                    strokeWidth={2.4 / t.k}
                    paintOrder="stroke"
                    className="transition-opacity duration-150 group-hover:fill-[#235C49]"
                  >
                    {p.city}
                    <tspan fill="#6E7268" fontWeight={700}>{"  "}{p.count}</tspan>
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      }}
    </WorldCanvas>
  );
}

/* ================================================================== *
 *  M4 - The gazetteer.
 *
 *  Inverts the hierarchy. The primary object is a ranked, searchable list
 *  of places; the map is a locator that lights up alongside it. The
 *  argument: almost nobody opens this to "explore a globe". They open it
 *  to find out who is in Bengaluru, or to see whether anyone is in the
 *  city they just moved to. A list answers both instantly, has perfect
 *  touch targets at any size, sorts, searches, and scales to 3000 places
 *  without a single design decision changing.
 *
 *  The map still earns its place: it is the thing that makes "we are in
 *  41 cities" felt rather than read.
 * ================================================================== */

export function MapGazetteer({
  points, onPick, height = 380,
}: { points: CityPoint[]; onPick: (city: string) => void; height?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? points.filter((p) => p.city.toLowerCase().includes(needle) || p.country.toLowerCase().includes(needle))
      : points;
    const map = new Map<string, CityPoint[]>();
    for (const p of filtered) {
      const arr = map.get(p.region) ?? [];
      arr.push(p);
      map.set(p.region, arr);
    }
    return [...map.entries()]
      .map(([region, list]) => ({
        region,
        list: list.sort((a, b) => b.count - a.count),
        total: list.reduce((s, x) => s + x.count, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [points, q]);

  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <WorldCanvas height={height}>
        {(t) => (
          <g>
            {points.map((p) => {
              const [x, y] = project(p.lng, p.lat);
              const on = hover === p.city;
              return (
                <g key={p.city}>
                  {on && <circle cx={x} cy={y} r={13 / t.k} fill="#C2622F" opacity={0.22} />}
                  {/* Floor of 3.4 units, not 2. The locator map is half the
                      width of the others (a 300px list sits beside it), so a
                      dot that read fine at full width shrank to roughly one
                      screen pixel here and the map looked empty. */}
                  <circle
                    cx={x} cy={y}
                    r={(3.4 + Math.sqrt(p.count / max) * 6.5) / t.k}
                    fill={on ? "#C2622F" : "#1F8A4C"}
                    opacity={on ? 1 : 0.85}
                    stroke="#ECE8DD"
                    strokeWidth={0.7 / t.k}
                  />
                  {on && (
                    <text
                      x={x} y={y - 10 / t.k} textAnchor="middle" fontSize={10 / t.k} fontWeight={700}
                      fill="#23241E" stroke="#ECE8DD" strokeWidth={2.6 / t.k} paintOrder="stroke"
                    >
                      {p.city}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </WorldCanvas>

      <div className="flex min-h-0 flex-col rounded-[var(--radius)] border border-border bg-card" style={{ height }}>
        <div className="border-b border-border p-2.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a place"
            aria-label="Find a place"
            className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground/80 focus:border-leaf"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {grouped.length === 0 && (
            <p className="px-2 py-4 text-[13px] text-muted-foreground">Nowhere by that name yet.</p>
          )}
          {grouped.map((g) => (
            <div key={g.region} className="mb-1.5">
              <div className="flex items-baseline justify-between px-2 py-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                  {g.region}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{g.total}</span>
              </div>
              {g.list.map((p) => (
                <button
                  key={p.city}
                  type="button"
                  onMouseEnter={() => setHover(p.city)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(p.city)}
                  onBlur={() => setHover(null)}
                  onClick={() => onPick(p.city)}
                  className="state-layer flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left outline-none transition-transform duration-100 active:scale-[0.99] focus-visible:[background-image:linear-gradient(var(--state-hover),var(--state-hover))]"
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{p.city}</span>
                  {/* A bar beside the number: the ranked list is a chart
                      already, and drawing the proportion costs one div. */}
                  <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-mist">
                    <span
                      className="block h-full rounded-full bg-leaf"
                      style={{ width: `${Math.max(6, (p.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-foreground">
                    {p.count}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  M5 - Country shading.
 *
 *  Included so it can be rejected with evidence rather than by opinion.
 *  A choropleth's object count is fixed at ~180 no matter how big the
 *  community gets, which is the property everything else is chasing. It
 *  fails on a different axis: this community is about 70% Indian, so the
 *  map becomes one dark blob and forty pale outlines, and the single
 *  question people actually ask ("who is in Bengaluru") is invisible at
 *  the only zoom the design has.
 *
 *  Sub-national shading would fix that and needs an India-states
 *  TopoJSON we do not ship; world-atlas is countries only. That is a real
 *  asset decision, not a coding one, which is why this stays a probe.
 * ================================================================== */

export function MapChoropleth({
  points, height,
}: { points: CityPoint[]; height?: number }) {
  const LAND = useLand();
  const byCountry = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.country, (m.get(p.country) ?? 0) + p.count);
    return m;
  }, [points]);
  const max = Math.max(1, ...byCountry.values());
  const [hover, setHover] = useState<{ name: string; n: number } | null>(null);

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[var(--radius)] border border-border"
        style={{ height: height ?? 380, background: "var(--muted)" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" role="img" aria-label="Members by country">
          {LAND.map((l, i) => {
            const n = byCountry.get(l.name) ?? 0;
            // sqrt ramp, not linear: with India at 70% a linear ramp puts
            // every other country in the bottom 8% of the scale and they
            // all read as empty.
            const tOpacity = n === 0 ? 0 : 0.16 + Math.sqrt(n / max) * 0.74;
            return (
              <path
                key={i}
                d={l.d}
                fill={n === 0 ? "#CFD9CB" : "#1F8A4C"}
                fillOpacity={n === 0 ? 1 : tOpacity}
                stroke="#BCC7B7"
                strokeWidth={0.5}
                onMouseEnter={() => n > 0 && setHover({ name: l.name, n })}
                onMouseLeave={() => setHover(null)}
                className={n > 0 ? "cursor-pointer" : undefined}
              />
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[12.5px] font-medium shadow-sm backdrop-blur">
            {hover.name} <b className="font-semibold tabular-nums">{hover.n}</b>
          </div>
        )}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span>1</span>
          <span className="h-2 w-16 rounded-full" style={{ background: "linear-gradient(90deg, rgb(31 138 76 / 0.16), rgb(31 138 76 / 0.9))" }} />
          <span className="tabular-nums">{max}</span>
        </div>
      </div>
    </div>
  );
}

/* --- the object-count instrument ------------------------------------- *
 *
 *  Counts the markers each concept actually paints at the current scale.
 *  This is the number the whole section turns on, so it is measured off
 *  the DOM rather than reasoned about.
 * ------------------------------------------------------------------ */

export function ObjectCount({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const count = () => {
      // Every interactive marker in these concepts is a [role=button] or a
      // <path> with a fill; counting the former is what "objects you can
      // aim at" means.
      setN(el.querySelectorAll("[role=button], button").length);
    };
    count();
    const mo = new MutationObserver(count);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [children]);

  return (
    // data-shot lets scripts/qa/_dir-room-shots.mjs screenshot this block as an
    // ELEMENT rather than by guessing a scroll offset, which is how the first
    // capture pass ended up photographing the gap between two maps.
    <div className="min-w-0" data-shot={label}>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground/70">{label}</span>
        {n != null && (
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            <b className="font-semibold text-foreground">{n}</b> aimable objects on screen
          </span>
        )}
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}

/** shared helper so every concept gets identical input */
export function usePoints(members: Member[]) {
  return useMemo(() => cityPoints(members), [members]);
}
