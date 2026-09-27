/* ------------------------------------------------------------------ *
 *  The valley's geography, shared by the film room and by
 *  scripts/dev/valley-film.mjs, which fetches the imagery the film's
 *  camera will ask for. One file so the two can never disagree about
 *  where a tile is or when the camera wants it.
 *
 *  No imports and only erasable TypeScript, so Node loads it as it is.
 *
 *  The world: metres, origin on the school, x east, y up (metres above
 *  sea level, so the school stands at 712), z south. It is Web Mercator
 *  scaled to true metres at the school's latitude, which is also the
 *  projection both tile sets arrive in, so a tile is a square here and
 *  nothing is reprojected. Mercator is conformal: over the 76 km this
 *  covers, bearings from the school are true and distances are off by
 *  at most 0.3%.
 * ------------------------------------------------------------------ */

export const ORIGIN = { lat: 13.634, lon: 78.454 };

const RAD = Math.PI / 180;
/** The Web Mercator sphere, which is what the tile servers use. */
const EARTH = 6378137;
/** Metres per Mercator unit (the whole map is 0..1) at the school. */
export const MERC_M = 2 * Math.PI * EARTH * Math.cos(ORIGIN.lat * RAD);
/** Earth's radius as the eye sees it over land by day: refraction bends
 *  sight lines round about a seventh of the way, so far hills sink less
 *  than geometry alone would say. Bodikonda, 6.5 km off, sinks 3 m. */
export const R_SIGHT = 6371000 / (1 - 0.13);

export const mercX = (lon: number) => (lon + 180) / 360;
export const mercY = (lat: number) => {
  const r = lat * RAD;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};
const OX = mercX(ORIGIN.lon);
const OY = mercY(ORIGIN.lat);

/** World x (east) and z (south), metres from the school. */
export function toWorld(lat: number, lon: number): [number, number] {
  return [(mercX(lon) - OX) * MERC_M, (mercY(lat) - OY) * MERC_M];
}

/** A Web Mercator tile as a world square: its north-west corner and side. */
export function tileRect(z: number, x: number, y: number) {
  const n = 2 ** z;
  return { x0: (x / n - OX) * MERC_M, z0: (y / n - OY) * MERC_M, size: MERC_M / n };
}

/** An elevation mosaic: a square of `px` by `px` heights in metres,
 *  covering world [x0, x0+size] by [z0, z0+size]. */
export type Mosaic = { rect: { x0: number; z0: number; size: number; px: number }; h: ArrayLike<number> };

/** Ground height at world (x, z), bilinear, from the finest mosaic that
 *  reaches it; 700 m (the plateau) past all of them. */
export function demGround(mosaics: Mosaic[], x: number, z: number): number {
  for (const m of mosaics) {
    const { x0, z0, size, px } = m.rect;
    const u = ((x - x0) / size) * px - 0.5, v = ((z - z0) / size) * px - 0.5;
    if (u < 1 || v < 1 || u > px - 2 || v > px - 2) continue;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const h = m.h;
    return (h[j * px + i] * (1 - fu) + h[j * px + i + 1] * fu) * (1 - fv) + (h[(j + 1) * px + i] * (1 - fu) + h[(j + 1) * px + i + 1] * fu) * fv;
  }
  return 700;
}

/** A tile's lowest and highest ground, from a 9 x 9 sample, padded 20 m
 *  for what falls between the samples; cached per tile. The room culls
 *  with it and the script decides what to fetch with it, so the two use
 *  this one function and cannot disagree. */
export function tileHeightRange(ground: (x: number, z: number) => number, cache: Map<string, [number, number]>, z: number, x: number, y: number): [number, number] {
  const k = `${z}/${x}/${y}`;
  let r = cache.get(k);
  if (!r) {
    const t = tileRect(z, x, y);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j <= 8; j++) for (let i = 0; i <= 8; i++) {
      const h = ground(t.x0 + (t.size * i) / 8, t.z0 + (t.size * j) / 8);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    r = [lo - 20, hi + 20];
    cache.set(k, r);
  }
  return r;
}

/** The tile at zoom z holding world point (wx, wz). */
export function tileAt(z: number, wx: number, wz: number): [number, number] {
  const n = 2 ** z;
  return [Math.floor((wx / MERC_M + OX) * n), Math.floor((wz / MERC_M + OY) * n)];
}

/* ---- the three hills (brief ¶5) ------------------------------------ *
   Left to right as seen from the school, and nearest is darkest in the
   mark, so its three planes are the haze between them. Summits found in
   the elevation data along the bearings of the round-one view he
   recognised; the names are his, unconfirmed hill by hill. */
export const PEAKS = [
  { name: "Bodikonda", lat: 13.6124, lon: 78.3982 },
  { name: "Middle Peak", lat: 13.6228, lon: 78.4092 },
  { name: "Rishikonda", lat: 13.6264, lon: 78.416 },
] as const;

/* ---- the camera ------------------------------------------------------ */

export type V3 = [number, number, number];

/** A moment on the flight: where the camera is, what it looks at, how
 *  wide it sees (vertical field of view in degrees, for a 16:9 frame)
 *  and how far it banks. Times in seconds. */
export type Key = {
  t: number;
  eye: V3;
  look: V3;
  fov: number;
  roll?: number;
  /** the camera comes to rest on this key instead of passing through it */
  settle?: boolean;
};

/**
 * Barry and Goldman's form of the Catmull-Rom spline, with the keys'
 * own times as its knots, so the camera's speed follows the timing of
 * the keys rather than their spacing and never jerks at a key.
 */
function spline(ts: number[], ps: number[][], t: number): number[] {
  const n = ts.length;
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]) i++;
  const i0 = Math.max(0, i - 1), i1 = i, i2 = i + 1, i3 = Math.min(n - 1, i + 2);
  /* the ends are extended by reflecting the neighbouring key, so the
     first and last spans start and stop moving in a straight line */
  const t1 = ts[i1], t2 = ts[i2];
  const t0 = i0 === i1 ? t1 - (t2 - t1) : ts[i0];
  const t3 = i3 === i2 ? t2 + (t2 - t1) : ts[i3];
  const p1 = ps[i1], p2 = ps[i2];
  const p0 = i0 === i1 ? p1.map((v, k) => 2 * v - p2[k]) : ps[i0];
  const p3 = i3 === i2 ? p2.map((v, k) => 2 * v - p1[k]) : ps[i3];
  const tt = Math.min(t2, Math.max(t1, t));
  const lerp = (a: number[], b: number[], ta: number, tb: number) =>
    a.map((v, k) => (tb === ta ? v : v + ((b[k] - v) * (tt - ta)) / (tb - ta)));
  const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

export type Shot = { eye: V3; look: V3; fovY: number; roll: number };

const keyTimes = new WeakMap<Key[], number[]>();

export function cameraAt(keys: Key[], t: number): Shot {
  let ts = keyTimes.get(keys);
  if (!ts) { ts = keys.map((k) => k.t); keyTimes.set(keys, ts); }
  /* Settling into the last key: time runs through that span on
     s + s^2 - s^3, which leaves at the spline's own speed and arrives at
     none, so the move lands like a drone braking rather than a cut. */
  const n = keys.length;
  if (n > 1 && keys[n - 1].settle && t > ts[n - 2]) {
    const s = Math.min(1, (t - ts[n - 2]) / (ts[n - 1] - ts[n - 2]));
    t = ts[n - 2] + (ts[n - 1] - ts[n - 2]) * (s + s * s - s * s * s);
  }
  const eye = spline(ts, keys.map((k) => k.eye), t) as V3;
  const look = spline(ts, keys.map((k) => k.look), t) as V3;
  const [fov, roll] = spline(ts, keys.map((k) => [k.fov, k.roll ?? 0]), t);
  return { eye, look, fovY: fov, roll };
}

/* ---- which tiles a camera wants ----------------------------------------- *
   One rule, used by the room to decide what to draw and by the script to
   decide what to fetch: a tile is split into its four children while one
   of its texels would cover more than MAX_TEXEL_PX screen pixels at the
   nearest point of its box. The screen is measured in CSS pixels on a
   900-pixel-tall frame whatever the canvas is, so the fetch list does not
   depend on the reviewer's window. */

const MAX_TEXEL_PX = 1.1;
const REF_HEIGHT_PX = 900;
/* Below this zoom a tile splits for the view whether or not there is
   imagery under it, so the hills keep their shape everywhere. A zoom-14
   tile's 32 x 32 grid is 75 m between vertices, fine enough for ground
   more than a few kilometres off; past it a tile splits only where there
   is imagery to show, near the flight, where the 18.6 m elevation mosaic
   has the detail to fill a finer grid. */
const GEOMETRY_FLOOR_ZOOM = 14;

export type View = {
  eye: V3;
  /** unit vectors */
  fwd: V3;
  right: V3;
  up: V3;
  fovY: number;
  aspect: number;
};

export function viewOf(shot: Shot, aspect: number): View {
  const f = norm(sub(shot.look, shot.eye));
  let r = norm(cross(f, [0, 1, 0]));
  let u = cross(r, f);
  if (shot.roll) {
    const c = Math.cos(shot.roll * RAD), s = Math.sin(shot.roll * RAD);
    const r2: V3 = [r[0] * c + u[0] * s, r[1] * c + u[1] * s, r[2] * c + u[2] * s];
    u = cross(r2, f);
    r = r2;
  }
  return { eye: shot.eye, fwd: f, right: r, up: u, fovY: fovFor(shot.fovY, aspect), aspect };
}

/** The keys give the field of view for a 16:9 frame. A portrait phone
 *  keeps the same vertical view, which would leave it a slot; so its
 *  width is held to a share of the landscape frame's, widening the
 *  height to match, which is what a cinematographer reframing for a
 *  phone does. The share is 62% for the wide shots, where the land fills
 *  any frame, and 88% for the telephoto hold, where the three hills must
 *  all be in it. */
const PHONE_TELE = { fov: 18, share: 0.88 }; // the hold on the three hills (_flight.ts, fov 17)
const PHONE_WIDE = { fov: 40, share: 0.62 }; // the flight's wide shots (fov 44 to 54)
export function fovFor(fov16x9: number, aspect: number): number {
  const hLand = 2 * Math.atan(Math.tan((fov16x9 * RAD) / 2) * (16 / 9));
  const k = Math.min(1, Math.max(0, (fov16x9 - PHONE_TELE.fov) / (PHONE_WIDE.fov - PHONE_TELE.fov)));
  const hMin = hLand * (PHONE_TELE.share + (PHONE_WIDE.share - PHONE_TELE.share) * k * k * (3 - 2 * k));
  const h = 2 * Math.atan(Math.tan((fov16x9 * RAD) / 2) * aspect);
  if (h >= hMin) return fov16x9;
  return (2 * Math.atan(Math.tan(hMin / 2) / aspect)) / RAD;
}

export function sub(a: V3, b: V3): V3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function norm(a: V3): V3 { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** How far the ground at horizontal distance d sinks below the eye's
 *  level plane, with refraction. */
export const sink = (d: number) => (d * d) / (2 * R_SIGHT);

export type TileKey = { z: number; x: number; y: number };

/**
 * Walks the tile tree from the roots and calls `take` for every tile that
 * should be drawn for this view: in the frustum and fine enough. The
 * geometry always splits as far as the view wants (to maxZoom); the
 * picture on each piece is the finest ancestor that is `ready`, so a
 * missing or still-decoding tile shows its parent's photograph, cropped,
 * rather than holding its neighbours back. `exists` says which tiles
 * there are at all (see GEOMETRY_FLOOR_ZOOM for where that matters).
 */
export function selectTiles(
  view: View,
  roots: TileKey[],
  range: (z: number, x: number, y: number) => [number, number],
  exists: (z: number, x: number, y: number) => boolean,
  ready: (z: number, x: number, y: number) => boolean,
  maxZoom: (z: number, x: number, y: number) => number,
  take: (t: TileKey, tex: TileKey | null) => void,
) {
  const pixelAngle = (2 * Math.tan((view.fovY * RAD) / 2)) / REF_HEIGHT_PX;
  const planes = frustumPlanes(view);
  const visit = (z: number, x: number, y: number, tex: TileKey | null) => {
    if (ready(z, x, y)) tex = { z, x, y };
    const r = tileRect(z, x, y);
    const [lo, hi] = range(z, x, y);
    /* nearest point of the box to the eye, horizontally, then in 3D */
    const cx = Math.min(Math.max(view.eye[0], r.x0), r.x0 + r.size);
    const cz = Math.min(Math.max(view.eye[2], r.z0), r.z0 + r.size);
    const dh = Math.hypot(cx - view.eye[0], cz - view.eye[2]);
    const fx = Math.abs(view.eye[0] - (r.x0 + r.size / 2)) + r.size / 2;
    const fz = Math.abs(view.eye[2] - (r.z0 + r.size / 2)) + r.size / 2;
    const far = Math.hypot(fx, fz);
    const yLo = lo - sink(far) - 5, yHi = hi - sink(dh) + 5;
    const cy = Math.min(Math.max(view.eye[1], yLo), yHi);
    const d = Math.hypot(dh, cy - view.eye[1]);
    if (!boxInFrustum(planes, view.eye, r.x0, r.x0 + r.size, yLo, yHi, r.z0, r.z0 + r.size)) return;
    const texel = r.size / 256;
    const texelPx = texel / (Math.max(d, 1) * pixelAngle);
    if (texelPx > MAX_TEXEL_PX && z < maxZoom(z, x, y)) {
      const kids: TileKey[] = [
        { z: z + 1, x: 2 * x, y: 2 * y }, { z: z + 1, x: 2 * x + 1, y: 2 * y },
        { z: z + 1, x: 2 * x, y: 2 * y + 1 }, { z: z + 1, x: 2 * x + 1, y: 2 * y + 1 },
      ];
      if (z < GEOMETRY_FLOOR_ZOOM || kids.some((k) => exists(k.z, k.x, k.y))) {
        for (const k of kids) visit(k.z, k.x, k.y, tex);
        return;
      }
    }
    take({ z, x, y }, tex);
  };
  for (const t of roots) if (exists(t.z, t.x, t.y)) visit(t.z, t.x, t.y, null);
}

/** The four side planes of the view's frustum, through the eye, as
 *  inward normals: each holds one edge of the frame and the axis along it. */
export function frustumPlanes(view: View): V3[] {
  const tanY = Math.tan((view.fovY * RAD) / 2);
  const tanX = tanY * view.aspect;
  const planes: V3[] = [];
  for (const [s, axis, other, tn] of [
    [1, view.right, view.up, tanX], [-1, view.right, view.up, tanX],
    [1, view.up, view.right, tanY], [-1, view.up, view.right, tanY],
  ] as [number, V3, V3, number][]) {
    const edge = add(view.fwd, scale(axis, s * tn));
    const nrm = norm(cross(edge, other));
    planes.push(dot(nrm, view.fwd) < 0 ? scale(nrm, -1) : nrm);
  }
  return planes;
}

/** A world box is out of view if all eight corners are outside one plane. */
export function boxInFrustum(planes: V3[], eye: V3, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): boolean {
  for (const p of planes) {
    let inside = false;
    for (let k = 0; k < 8 && !inside; k++) {
      const px = (k & 1 ? x1 : x0) - eye[0];
      const py = (k & 2 ? y1 : y0) - eye[1];
      const pz = (k & 4 ? z1 : z0) - eye[2];
      if (px * p[0] + py * p[1] + pz * p[2] >= 0) inside = true;
    }
    if (!inside) return false;
  }
  return true;
}

function add(a: V3, b: V3): V3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(a: V3, s: number): V3 { return [a[0] * s, a[1] * s, a[2] * s]; }
