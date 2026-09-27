/**
 * Screen-space clustering for the directory map (src/components/directory/alumni-map.tsx).
 *
 * WHY THIS EXISTS (the New Delhi / Gurgaon bug, 2026-08)
 * -----------------------------------------------------
 * The map used to cluster with supercluster, whose grouping radius is expressed
 * in web-mercator tile pixels at an integer tile zoom. Three things then fought
 * each other:
 *   1. the map's own d3-zoom scaleExtent capped k at 12, and the tile zoom was
 *      derived as round(log2(k) + 1), so supercluster was never asked for a
 *      zoom above 5. At zoom 5 its 50px radius is ~2.6 base map units, while
 *      New Delhi and Gurgaon are 0.53 units apart, so no amount of zooming
 *      could ever split them;
 *   2. even with an unlimited tile zoom, k <= 12 put those two cities 6 screen
 *      units apart while each pin is ~24 units wide, so they physically could
 *      not both be shown;
 *   3. mercator tile pixels are not the projection the map draws in
 *      (geoNaturalEarth1), so "do these two pins overlap" was being decided in
 *      the wrong space anyway.
 *
 * The rule the product actually wants is a screen-space one: two pins merge if
 * and only if their HIT DISCS would overlap at the current zoom, where a hit
 * disc is never smaller than the 44px touch target. So we cluster directly in
 * that space, in the same projection the map paints. That makes both product
 * requirements structural rather than lucky:
 *   - `maxUsefulZoom` is the zoom at which every pair in the data set clears
 *     the other's hit disc, so at max zoom there is nothing left to cluster;
 *   - `buildGroups` never emits two pins whose hit discs overlap.
 *
 * Cost: O(n^2) per merge pass, where n is the number of CITY pins (not people)
 * and passes stop as soon as one changes nothing. The directory has ~13 city
 * pins today and would be a few hundred at full alumni scale, so this is tens
 * of microseconds; a spatial index would be premature. Recomputed only when
 * the zoom SCALE changes, never on pan.
 */

/** A city pin reduced to what clustering needs: projected position + weight. */
export type PinGeom = { x: number; y: number; count: number };

export type MarkerSizing = {
  /** Largest single-pin count, the normaliser for sqrtRadius. */
  maxCount: number;
  /** Marker counter-scale (1 on desktop, ~2.6 on a phone, below 1 in desktop
   *  full screen). See alumni-map. */
  pinBoost: number;
  /** CSS px that one viewBox unit currently occupies. See alumni-map. */
  pxPerUnit: number;
  /** Touch: every pin claims a full 44px disc whatever its drawn size. */
  coarsePointer: boolean;
};

export type MapGroup = {
  /** Stable across renders while membership is unchanged; also the React key. */
  key: string;
  /** Base (unzoomed) projection units. Ring offset already applied. */
  x: number;
  y: number;
  /** People in this group. */
  count: number;
  /** Pin indices, ascending. Length 1 means a real city pin. */
  members: number[];
  /** Hit radius in SCREEN viewBox units at the zoom this group was built for. */
  hitU: number;
};

/** Minimum tap target on coarse pointers (directory spec 4.1, WCAG 2.5.8). */
export const TAP_MIN_PX = 44;

/** Clear air between two hit discs, so resolved neighbours never kiss. */
const PIN_GAP_PX = 3;

/** Halo padding around the drawn disc: clusters carry a slightly fatter ring. */
const CITY_HALO_PAD = 3;
const CLUSTER_HALO_PAD = 8;

/**
 * Never let the max zoom fall below the map's historical ceiling, even for a
 * data set so sparse that everything separates at k=2: the zoom control has to
 * stay useful for reading a crowded region.
 */
const ZOOM_FLOOR = 12;

/**
 * Hard ceiling on zoom. 4096 puts ~10km across the viewport, which is already
 * past the precision of city-level coordinates, and keeps SVG path numbers in a
 * range the renderer is exact in. Two cities that still collide here get the
 * deterministic ring instead (see `spread`).
 */
const ZOOM_CEILING = 4096;

/**
 * 2% headroom on the derived max zoom. `need / dist * dist` is not exactly
 * `need` in floating point, and d3 clamps k to the extent exactly, so without
 * this the very last pair could re-merge at max zoom by one ulp.
 */
const ZOOM_HEADROOM = 1.02;

/**
 * Merge passes are capped only as a runaway guard: each pass that changes
 * anything strictly reduces the group count, so a real map converges in three
 * or four. 16 is far past any shape a world map can take.
 */
const MAX_MERGE_PASSES = 16;

/** Drawn disc radius, in the marker's own local units. Area tracks count. */
export function sqrtRadius(count: number, maxCount: number) {
  // Area proportional to count, so a 200-count city is not 200x the diameter.
  // Clamped at 1: maxCount is the biggest SINGLE city, and a super-pin holding
  // several of them would otherwise draw larger than any real pin ever can -- on
  // a phone the world view became one blue disc over half of Asia. Past the
  // ceiling the number printed inside carries the magnitude.
  return 9 + Math.sqrt(Math.min(1, count / Math.max(1, maxCount))) * 22;
}

/**
 * Radius of the pin's clickable disc, in SCREEN viewBox units (i.e. already
 * multiplied by the marker counter-scale, so it can be compared directly with
 * `k * distanceBetweenPinsInBaseUnits`).
 */
export function hitRadiusU(count: number, isCluster: boolean, s: MarkerSizing) {
  const halo = sqrtRadius(count, s.maxCount) + (isCluster ? CLUSTER_HALO_PAD : CITY_HALO_PAD);
  // (TAP_MIN_PX / 2) CSS px expressed in the marker's local units.
  const tap = s.coarsePointer ? TAP_MIN_PX / 2 / (s.pinBoost * s.pxPerUnit) : 0;
  return Math.max(halo, tap) * s.pinBoost;
}

/** Screen-unit distance two pins must clear to both be shown. One definition, */
/** used by the merge test AND by the max-zoom derivation, so they can't drift. */
function separationU(a: { count: number; cities: number }, b: { count: number; cities: number }, s: MarkerSizing) {
  return (
    hitRadiusU(a.count, a.cities > 1, s) +
    hitRadiusU(b.count, b.cities > 1, s) +
    PIN_GAP_PX / s.pxPerUnit
  );
}

function isPlottable(p: PinGeom) {
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

function makeGroup(members: number[], pins: PinGeom[], s: MarkerSizing): MapGroup {
  const sorted = [...members].sort((a, b) => a - b);
  let count = 0;
  let sx = 0;
  let sy = 0;
  for (const i of sorted) {
    count += pins[i].count;
    // Count-weighted centroid: the super-pin sits over the people, not over the
    // geometric middle of a big city and a hamlet.
    sx += pins[i].x * pins[i].count;
    sy += pins[i].y * pins[i].count;
  }
  return {
    // min member + shape. Membership-derived, so a tooltip bound to this key
    // dies the instant its cluster splits or is rebuilt.
    key: `g${sorted[0]}-${sorted.length}-${count}`,
    x: sx / count,
    y: sy / count,
    count,
    members: sorted,
    hitU: hitRadiusU(count, sorted.length > 1, s),
  };
}

/**
 * One leader pass: biggest group first, absorbing every smaller neighbour whose
 * hit disc it overlaps. Leader-based (not chained union) for the same reason
 * supercluster does it that way: a chain of just-touching pins across a
 * continent must not collapse into one pin.
 */
function mergePass(groups: MapGroup[], pins: PinGeom[], k: number, s: MarkerSizing) {
  const order = [...groups].sort(
    // Deterministic: weight, then position, then identity. No tie can flip
    // between renders.
    (a, b) => b.count - a.count || a.x - b.x || a.members[0] - b.members[0]
  );
  const taken = new Array<boolean>(order.length).fill(false);
  const out: MapGroup[] = [];
  for (let i = 0; i < order.length; i++) {
    if (taken[i]) continue;
    taken[i] = true;
    const leader = order[i];
    const members = [...leader.members];
    for (let j = i + 1; j < order.length; j++) {
      if (taken[j]) continue;
      const other = order[j];
      const gap = Math.hypot(leader.x - other.x, leader.y - other.y) * k;
      const need = separationU(
        { count: leader.count, cities: leader.members.length },
        { count: other.count, cities: other.members.length },
        s
      );
      if (gap < need) {
        taken[j] = true;
        members.push(...other.members);
      }
    }
    // Rebuilding only when something was absorbed keeps object identity stable
    // for untouched pins, so React reuses their nodes across passes.
    out.push(members.length === leader.members.length ? leader : makeGroup(members, pins, s));
  }
  return out;
}

/**
 * Explode a group that the zoom ceiling cannot pull apart onto a fixed ring
 * around its centroid, so every city still gets its own full-size target. This
 * only ever fires for pins closer than ~10km, which the 0.1-degree pin grid
 * upstream already makes rare. n points on a circle of radius R sit
 * 2R*sin(pi/n) apart, so R is solved from the biggest member's hit disc.
 */
function ringOut(g: MapGroup, pins: PinGeom[], k: number, s: MarkerSizing): MapGroup[] {
  const n = g.members.length;
  if (n === 1) return [g];
  const members = [...g.members].sort((a, b) => pins[b].count - pins[a].count || a - b);
  const maxHit = Math.max(...members.map((i) => hitRadiusU(pins[i].count, false, s)));
  const radiusU = (maxHit + PIN_GAP_PX / s.pxPerUnit / 2) / Math.sin(Math.PI / n);
  return members.map((i, idx) => {
    // First member straight up, then clockwise. Fixed, so the layout is the
    // same every render: no jitter, nothing to animate.
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / n;
    const single = makeGroup([i], pins, s);
    return {
      ...single,
      x: g.x + (Math.cos(angle) * radiusU) / k,
      y: g.y + (Math.sin(angle) * radiusU) / k,
    };
  });
}

/**
 * Cluster the pins for one zoom scale.
 *
 * @param k      d3-zoom scale of the map group.
 * @param spread Explode the leftovers onto a ring (pass true only at the zoom
 *               ceiling, where zooming further is no longer an option).
 */
export function buildGroups(
  pins: PinGeom[],
  k: number,
  s: MarkerSizing,
  spread = false
): MapGroup[] {
  let groups = pins
    .map((p, i) => (isPlottable(p) ? makeGroup([i], pins, s) : null))
    .filter((g): g is MapGroup => g !== null);
  for (let pass = 0; pass < MAX_MERGE_PASSES; pass++) {
    const next = mergePass(groups, pins, k, s);
    if (next.length === groups.length) break;
    groups = next;
  }
  return spread ? groups.flatMap((g) => ringOut(g, pins, k, s)) : groups;
}

/** The zoom at which every pair in `members` clears every other's hit disc. */
export function separatingZoom(pins: PinGeom[], members: number[], s: MarkerSizing) {
  const live = members.filter((i) => isPlottable(pins[i]));
  let need = 1;
  for (let a = 0; a < live.length; a++) {
    for (let b = a + 1; b < live.length; b++) {
      const p = pins[live[a]];
      const q = pins[live[b]];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      const sep = separationU({ count: p.count, cities: 1 }, { count: q.count, cities: 1 }, s);
      // dist === 0 gives Infinity, which the ceiling clamps: that pair is a
      // ring case, not a zoom case.
      need = Math.max(need, sep / dist);
    }
  }
  return Math.min(ZOOM_CEILING, need * ZOOM_HEADROOM);
}

/**
 * The map's max zoom for this data set: far enough in that EVERY cluster has
 * resolved into individual, non-overlapping city pins. This is the fix for
 * "New Delhi and Gurgaon never come apart" - the ceiling is now derived from
 * the data instead of being a fixed 12 that the tightest pair needed 45 (or,
 * with 44px touch discs on a phone, ~210) to clear.
 */
export function maxUsefulZoom(pins: PinGeom[], s: MarkerSizing) {
  return Math.max(
    ZOOM_FLOOR,
    separatingZoom(
      pins,
      pins.map((_, i) => i),
      s
    )
  );
}
