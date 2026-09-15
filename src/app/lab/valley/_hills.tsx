"use client";

/* ------------------------------------------------------------------ *
 *  The hills.
 *
 *  The ground under the school, as it is: real elevation (SRTM-class, via
 *  the public terrain tiles scripts/dev/valley-terrain.mjs fetched), drawn
 *  as a contour map that stands up into relief, lit by the sun where the
 *  sun actually is over the valley at this minute, under today's sky.
 *
 *  Nothing here is a picture of hills. It is the hills. The three peaks
 *  the mark is drawn from (Bodikonda, Middle Peak, Rishikonda, left to
 *  right from the school) are in the data at their real heights and real
 *  distances, and "From the school" is the view the mark was drawn from.
 *
 *  How it is built, for the next person:
 *   - Two heightmaps, both centred on the school: 16 km at ~31 m/px for
 *     the campus and the near hills, 64 km at ~125 m/px for the far ridge.
 *     One mesh covers the 64 km square with vertices packed towards the
 *     middle (x = a*t + (1-a)*t*|t|), so the campus gets 12 m spacing and
 *     the far edge 150 m, with no seam anywhere: each vertex reads its
 *     height from whichever map is finer where it stands, blended over the
 *     last kilometre of the fine one.
 *   - Contours are drawn in the fragment shader from the interpolated
 *     height (every 20 m, heavier every 100 m), one screen pixel wide at
 *     any zoom, the way a map viewer draws them rather than a scaled image.
 *   - Shadows are cast: each fragment marches a ray toward the sun through
 *     the heightmap. That is what makes the ridge's shadow sweep across
 *     the campus when the hour dial is dragged towards evening.
 *   - The sky is CSS behind a transparent canvas, and the model's edges
 *     fade so it sits on the page like a relief model on a table.
 *
 *  Raw WebGL2, no library: about four hundred lines is less than the
 *  library would weigh, and every line is ours to read.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  moonPhase,
  skyFor,
  sunPosition,
  sunTimes,
  sunVector,
  toCss,
  valleyClock,
  valleyDateAt,
  type Sky,
  type ValleyWeather,
} from "./_sun";

/* ---- the data ----------------------------------------------------- */

type Meta = {
  size: number;
  km: number;
  metresPerPx: number;
  min: number;
  max: number;
  schoolPx: { x: number; y: number };
  schoolHeight: number;
};
type Field = { meta: Meta; data: Float32Array };

async function loadField(km: number): Promise<Field> {
  const meta = (await (await fetch(`/lab/valley/height-${km}km.json`)).json()) as Meta;
  const img = new Image();
  img.src = `/lab/valley/height-${km}km.png`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = meta.size;
  c.height = meta.size;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, meta.size, meta.size).data;
  const data = new Float32Array(meta.size * meta.size);
  for (let i = 0; i < data.length; i++) data[i] = px[i * 4] * 256 + px[i * 4 + 1];
  return { meta, data };
}

/** Bilinear height at map coordinates u, v in 0..1 (west and north are 0). */
function sampleField(f: Field, u: number, v: number): number {
  const s = f.meta.size;
  const x = Math.min(s - 1.001, Math.max(0, u * (s - 1)));
  const y = Math.min(s - 1.001, Math.max(0, v * (s - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const d = f.data;
  const a = d[y0 * s + x0], b = d[y0 * s + x0 + 1], c = d[(y0 + 1) * s + x0], e = d[(y0 + 1) * s + x0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
}

/* ---- the world ---------------------------------------------------- */

/* Vertical exaggeration. A relief model in a museum runs 1.5 to 2; this is
   milder because the hills are the content and a lie would be noticed by
   the people who walked up them. */
const EXAG = 1.25;
const HALF = 32; // km, half the outer map
const INNER_HALF = 8; // km, half the inner map
const BLEND_FROM = 6.8; // km: where the fine map starts handing over to the coarse one
/* the vertex packing: x = HALF * (a*t + (1-a)*t*|t|) for t in -1..1 */
const PACK_A = 0.15;

/** World height (km, school at 0) at world x (east) and z (south). */
function worldHeight(inner: Field, outer: Field, x: number, z: number): number {
  const ho = sampleField(outer, x / (2 * HALF) + outer.meta.schoolPx.x / (outer.meta.size - 1), z / (2 * HALF) + outer.meta.schoolPx.y / (outer.meta.size - 1));
  const m = Math.max(Math.abs(x), Math.abs(z));
  let h = ho;
  if (m < INNER_HALF) {
    const hi = sampleField(inner, x / (2 * INNER_HALF) + inner.meta.schoolPx.x / (inner.meta.size - 1), z / (2 * INNER_HALF) + inner.meta.schoolPx.y / (inner.meta.size - 1));
    const w = m < BLEND_FROM ? 1 : 1 - (m - BLEND_FROM) / (INNER_HALF - BLEND_FROM);
    h = ho + (hi - ho) * w;
  }
  return ((h - inner.meta.schoolHeight) / 1000) * EXAG;
}

const pack = (t: number) => HALF * (PACK_A * t + (1 - PACK_A) * t * Math.abs(t));

function buildMesh(inner: Field, outer: Field, n: number) {
  const verts = (n + 1) * (n + 1);
  const pos = new Float32Array(verts * 3);
  const nor = new Float32Array(verts * 3);
  const xs = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) xs[i] = pack((2 * i) / n - 1);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const k = (j * (n + 1) + i) * 3;
      const x = xs[i], z = xs[j];
      pos[k] = x;
      pos[k + 1] = worldHeight(inner, outer, x, z);
      pos[k + 2] = z;
    }
  }
  const at = (i: number, j: number) => {
    const k = (Math.min(n, Math.max(0, j)) * (n + 1) + Math.min(n, Math.max(0, i))) * 3;
    return [pos[k], pos[k + 1], pos[k + 2]];
  };
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const a = at(i + 1, j), b = at(i - 1, j), c = at(i, j + 1), d = at(i, j - 1);
      const dx = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const dz = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
      /* dz x dx points up for a y-up world with z south */
      let nx = dz[1] * dx[2] - dz[2] * dx[1];
      let ny = dz[2] * dx[0] - dz[0] * dx[2];
      let nz = dz[0] * dx[1] - dz[1] * dx[0];
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1;
      const k = (j * (n + 1) + i) * 3;
      nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l;
    }
  }
  const idx = new Uint32Array(n * n * 6);
  let p = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx[p++] = a; idx[p++] = c; idx[p++] = b;
      idx[p++] = b; idx[p++] = c; idx[p++] = d;
    }
  }
  return { pos, nor, idx };
}

/* ---- matrices (only what the camera needs) ------------------------- */

type Mat = Float32Array;
function perspective(fovDeg: number, aspect: number, near: number, far: number): Mat {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
}
function lookAt(eye: number[], target: number[], up: number[]): Mat {
  const z = norm([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = norm(cross(up, z));
  const y = cross(z, x);
  const m = new Float32Array(16);
  m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
  m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
  m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
  m[12] = -dot(x, eye); m[13] = -dot(y, eye); m[14] = -dot(z, eye); m[15] = 1;
  return m;
}
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: number[]) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function mul(a: Mat, b: Mat): Mat {
  const o = new Float32Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function project(m: Mat, p: number[]): { x: number; y: number; w: number } {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return { x: x / w, y: y / w, w };
}

/* ---- shaders -------------------------------------------------------- */

const VERT = `#version 300 es
in vec3 aPos;
in vec3 aNor;
uniform mat4 uVP;
out vec3 vPos;
out vec3 vNor;
void main() {
  vPos = aPos;
  vNor = aNor;
  gl_Position = uVP * vec4(aPos, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNor;
uniform sampler2D uInner;
uniform sampler2D uOuter;
uniform vec2 uInnerSchool;  // school in the inner map, 0..1
uniform vec2 uOuterSchool;
uniform float uSchoolH;     // metres
uniform vec3 uSun;          // unit vector toward the sun
uniform float uStrength;    // direct light, 0..1
uniform vec3 uLight;
uniform vec3 uAmbient;
uniform vec3 uHorizon;
uniform float uNight;       // 0 day .. 1 deep night
uniform float uCloud;       // 0..1
uniform float uFog;
uniform float uTime;
uniform vec3 uCam;
uniform float uReveal;      // contours are drawn below this height (metres)
uniform float uShadowSteps;
out vec4 o;

const float EXAG = ${EXAG.toFixed(3)};
const float HALF = ${HALF.toFixed(1)};
const float INNER_HALF = ${INNER_HALF.toFixed(1)};
const float BLEND_FROM = ${BLEND_FROM.toFixed(1)};

float metresAt(vec2 xz) {
  vec2 uvo = xz / (2.0 * HALF) + uOuterSchool;
  float ho = texture(uOuter, uvo).r;
  float m = max(abs(xz.x), abs(xz.y));
  if (m < INNER_HALF) {
    vec2 uvi = xz / (2.0 * INNER_HALF) + uInnerSchool;
    float hi = texture(uInner, uvi).r;
    float w = m < BLEND_FROM ? 1.0 : 1.0 - (m - BLEND_FROM) / (INNER_HALF - BLEND_FROM);
    return mix(ho, hi, w);
  }
  return ho;
}
float worldY(vec2 xz) { return (metresAt(xz) - uSchoolH) * 0.001 * EXAG; }

/* A ray toward the sun, sampled at growing steps. Soft at the edges: the
   closer the ray passes to the ground, the deeper the penumbra. */
float shadow(vec3 p) {
  if (uSun.y <= 0.015) return 1.0;
  float s = 1.0;
  float t = 0.04;
  for (int i = 0; i < 32; i++) {
    if (float(i) >= uShadowSteps) break;
    vec3 q = p + uSun * t;
    if (max(abs(q.x), abs(q.z)) > HALF) break;
    float d = q.y - worldY(q.xz);
    s = min(s, clamp(d * 14.0 / t, 0.0, 1.0));
    if (s <= 0.0) break;
    t += 0.04 + t * 0.14;
  }
  return 1.0 - s;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int k = 0; k < 4; k++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s;
}

void main() {
  float h = vPos.y / EXAG * 1000.0 + uSchoolH; // metres
  float t = clamp((h - 640.0) / 700.0, 0.0, 1.0);

  /* the ground: valley floor, sand, stone, the tops */
  vec3 floorC = vec3(0.79, 0.80, 0.68);
  vec3 midC   = vec3(0.85, 0.80, 0.67);
  vec3 highC  = vec3(0.79, 0.70, 0.58);
  vec3 topC   = vec3(0.70, 0.60, 0.53);
  vec3 base = t < 0.3 ? mix(floorC, midC, t / 0.3)
            : t < 0.65 ? mix(midC, highC, (t - 0.3) / 0.35)
            : mix(highC, topC, (t - 0.65) / 0.35);
  /* the campus is the green part of the floor */
  float campus = exp(-dot(vPos.xz, vPos.xz) * 4.5);
  base = mix(base, vec3(0.66, 0.74, 0.56), campus * 0.55);

  /* contours: one pixel wide at any zoom */
  float fw = max(fwidth(h), 0.02);
  float c20 = abs(fract(h / 20.0 + 0.5) - 0.5) * 20.0;
  float l20 = 1.0 - smoothstep(0.0, fw * 1.25, c20 - fw * 0.1);
  float c100 = abs(fract(h / 100.0 + 0.5) - 0.5) * 100.0;
  float l100 = 1.0 - smoothstep(0.0, fw * 1.7, c100 - fw * 0.35);
  float reveal = 1.0 - smoothstep(uReveal - 80.0, uReveal, h);
  float ink = max(l20 * 0.24, l100 * 0.44) * reveal;
  /* contours crowd on a cliff; let them thin out there */
  ink *= 1.0 - smoothstep(30.0, 120.0, fw) * 0.6;

  /* light */
  vec3 n = normalize(vNor);
  float ndl = max(dot(n, uSun), 0.0);
  float sh = shadow(vPos);
  vec2 cuv = vPos.xz * 0.09 + vec2(uTime * 0.006, uTime * 0.0035);
  float cloudShade = 1.0 - uCloud * 0.6 * smoothstep(0.35, 0.75, fbm(cuv));
  vec3 direct = uLight * ndl * (1.0 - sh) * uStrength * cloudShade;
  float skyView = 0.55 + 0.45 * n.y;
  vec3 ambient = uAmbient * skyView * (0.85 + 0.3 * (1.0 - sh));
  vec3 col = base * (ambient + direct);

  /* the ink sits on the lit ground */
  col = mix(col, vec3(0.20, 0.18, 0.15) * (0.4 + 0.6 * (ambient + direct)), ink);

  /* at night the school keeps its lamps on */
  float lamp = exp(-dot(vPos.xz, vPos.xz) * 420.0);
  col += vec3(1.0, 0.72, 0.42) * lamp * uNight * 0.55;

  /* distance haze into the horizon colour */
  float dist = length(vPos - uCam);
  float fog = 1.0 - exp(-dist * dist * uFog);
  col = mix(col, uHorizon, fog * 0.85);

  /* the model's edge fades away on the table */
  float m = max(abs(vPos.x), abs(vPos.z)) / HALF;
  float alpha = 1.0 - smoothstep(0.86, 1.0, m);
  o = vec4(col * alpha, alpha);
}`;

/* ---- easing ----------------------------------------------------------- */

/** cubic-bezier(0.55, 0, 0.25, 1): the app's scene curve, solved for t. */
function sceneEase(x: number): number {
  const ax = 0.55, bx = 0.25, ay = 0, by = 1;
  const cx = (t: number) => 3 * ax * t * (1 - t) * (1 - t) + 3 * bx * t * t * (1 - t) + t * t * t;
  const cy = (t: number) => 3 * ay * t * (1 - t) * (1 - t) + 3 * by * t * t * (1 - t) + t * t * t;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 24; i++) {
    const v = cx(t);
    if (Math.abs(v - x) < 1e-5) break;
    if (v < x) lo = t; else hi = t;
    t = (lo + hi) / 2;
  }
  return cy(t);
}

/* ---- the camera ------------------------------------------------------- */

type Mode = "orbit" | "stand";
type Cam = { mode: Mode; yaw: number; pitch: number; dist: number };

const VIEWS: Record<"above" | "east" | "school", Cam> = {
  above: { mode: "orbit", yaw: 0, pitch: 89, dist: 22 },
  east: { mode: "orbit", yaw: 96, pitch: 30, dist: 15 },
  /* standing on the campus, looking west: the view the mark was drawn from */
  school: { mode: "stand", yaw: 272, pitch: 4, dist: 0 },
};

function eyeAndTarget(c: Cam, groundAtSchool: number): { eye: number[]; target: number[] } {
  const yaw = (c.yaw * Math.PI) / 180;
  const pitch = (c.pitch * Math.PI) / 180;
  if (c.mode === "stand") {
    const eye = [0, groundAtSchool + 0.012, 0];
    const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    return { eye, target: [eye[0] + dir[0], eye[1] + dir[1], eye[2] + dir[2]] };
  }
  const target = [0, groundAtSchool, 0];
  const eye = [
    target[0] + c.dist * Math.cos(pitch) * Math.sin(yaw),
    target[1] + c.dist * Math.sin(pitch),
    target[2] + c.dist * Math.cos(pitch) * Math.cos(yaw),
  ];
  return { eye, target };
}

/* ---- the component ---------------------------------------------------- */

export type Peak = { x: number; z: number; y: number; metres: number; label: string };

export function Hills({ weather, serverNow }: { weather: ValleyWeather | null; serverNow: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rain = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [view, setView] = useState<keyof typeof VIEWS>("east");
  const [live, setLive] = useState(true);
  const [hour, setHour] = useState(() => valleyClock(new Date(serverNow)).hour);
  const [now, setNow] = useState(serverNow);
  const [peaks, setPeaks] = useState<Peak[]>([]);

  /* the state the render loop reads; refs so a frame never waits on React */
  const st = useRef({
    cam: { ...VIEWS.above } as Cam,
    target: { ...VIEWS.above } as Cam,
    tween: null as null | { from: Cam; to: Cam; t0: number; ms: number },
    reveal: 300,
    revealT0: 0,
    entered: false,
    dirty: true,
    hour: valleyClock(new Date(serverNow)).hour,
    live: true,
    now: serverNow,
    ground: 0,
    vp: null as null | Mat,
    size: { w: 1, h: 1 },
    sky: skyFor(30) as Sky,
    cloud: weather?.cloud ?? 0,
    raining: false,
    wanted: null as null | keyof typeof VIEWS,
    still: false,
  });

  const cloud = weather ? Math.max(weather.cloud, weather.precipitationMm > 0 ? 0.85 : 0) : 0;
  const raining = !!weather && (weather.precipitationMm > 0 || (weather.code >= 51 && weather.code <= 82) || weather.code >= 95);
  st.current.cloud = cloud;
  st.current.raining = raining;

  /* ?hour=17.8&view=school&still=1: a scripted screenshot picks its moment
     and skips the entrance, and the owner can deep-link one. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const h = q.get("hour");
    if (h !== null && !Number.isNaN(Number(h))) { setLive(false); setHour(Math.max(0, Math.min(24, Number(h)))); }
    const v = q.get("view");
    if (v === "above" || v === "east" || v === "school") { st.current.wanted = v; setView(v); }
    if (q.get("still") === "1") st.current.still = true;
  }, []);

  /* keep the clock honest while the dial is on "now" */
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setHour(valleyClock(new Date(t)).hour);
    }, 30000);
    return () => window.clearInterval(id);
  }, [live]);
  useEffect(() => { st.current.hour = hour; st.current.live = live; st.current.now = now; st.current.dirty = true; }, [hour, live, now]);
  /* the labels are placed by the render loop, so a label that arrives after the
     last frame needs one more */
  useEffect(() => { st.current.dirty = true; }, [peaks]);

  const goTo = useCallback((v: keyof typeof VIEWS) => {
    const s = st.current;
    s.tween = { from: { ...s.cam }, to: { ...VIEWS[v] }, t0: performance.now(), ms: 1500 };
    s.target = { ...VIEWS[v] };
    setView(v);
  }, []);

  /* the whole GL life, once */
  useEffect(() => {
    const cv = canvas.current!;
    const gl = cv.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) { setFailed("This browser has no WebGL2, so the hills cannot be drawn here."); return; }
    let disposed = false;
    let raf = 0;
    const s = st.current;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
    const N = isTouch ? 320 : 640;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
      return sh;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    } catch (e) {
      setFailed(`The shader did not compile: ${(e as Error).message}`);
      return;
    }
    const U = (name: string) => gl.getUniformLocation(prog, name);
    const u = {
      vp: U("uVP"), inner: U("uInner"), outer: U("uOuter"), innerSchool: U("uInnerSchool"), outerSchool: U("uOuterSchool"),
      schoolH: U("uSchoolH"), sun: U("uSun"), strength: U("uStrength"), light: U("uLight"), ambient: U("uAmbient"),
      horizon: U("uHorizon"), night: U("uNight"), cloud: U("uCloud"), fog: U("uFog"), time: U("uTime"), cam: U("uCam"),
      reveal: U("uReveal"), shadowSteps: U("uShadowSteps"),
    };
    const linear = !!gl.getExtension("OES_texture_float_linear");

    const makeTex = (f: Field, unit: number) => {
      const tex = gl.createTexture()!;
      textures.push(tex);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, f.meta.size, f.meta.size, 0, gl.RED, gl.FLOAT, f.data);
      const filt = linear ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };

    let count = 0;
    let vao: WebGLVertexArrayObject | null = null;
    const buffers: WebGLBuffer[] = [];
    const textures: WebGLTexture[] = [];
    let innerF: Field | null = null;
    let outerF: Field | null = null;

    const resize = () => {
      const r = wrap.current!.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      s.size = { w, h };
      cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
      if (rain.current) { rain.current.width = w; rain.current.height = h; }
      gl.viewport(0, 0, cv.width, cv.height);
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current!);

    /* rain, if it is raining at the valley */
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), l: 8 + Math.random() * 10, v: 0.9 + Math.random() * 0.7 }));
    const drawRain = (dtMs: number) => {
      const rc = rain.current; if (!rc) return;
      const g = rc.getContext("2d")!;
      g.clearRect(0, 0, rc.width, rc.height);
      if (!s.raining || !s.live) return;
      const wind = ((weather?.windDirDeg ?? 240) * Math.PI) / 180;
      const slant = Math.sin(wind) * 0.35;
      g.strokeStyle = "rgba(210, 222, 236, 0.45)";
      g.lineWidth = 1;
      g.beginPath();
      for (const d of drops) {
        d.y += (d.v * dtMs) / 900;
        d.x += (slant * dtMs) / 2200;
        if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
        if (d.x > 1.05) d.x -= 1.1; if (d.x < -0.05) d.x += 1.1;
        const px = d.x * rc.width, py = d.y * rc.height;
        g.moveTo(px, py); g.lineTo(px + slant * d.l, py + d.l);
      }
      g.stroke();
    };

    let last = performance.now();
    const frame = (tNow: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, tNow - last);
      last = tNow;
      if (!vao) return;

      /* camera: tween, then a soft follow of the drag target */
      let moving = false;
      if (s.tween) {
        const k = Math.min(1, (tNow - s.tween.t0) / s.tween.ms);
        const e = sceneEase(k);
        const f = s.tween.from, to = s.tween.to;
        /* yaw goes the short way round */
        const dy = ((to.yaw - f.yaw + 540) % 360) - 180;
        s.cam = { mode: k < 0.5 ? f.mode : to.mode, yaw: f.yaw + dy * e, pitch: f.pitch + (to.pitch - f.pitch) * e, dist: f.dist + (to.dist - f.dist) * e };
        if (f.mode !== to.mode) {
          /* a mode change swings the eye through the air: fake it with the orbit
             distance collapsing to the ground and the pitch handing over */
          s.cam.mode = to.mode === "stand" ? (k > 0.85 ? "stand" : "orbit") : (k < 0.15 ? "stand" : "orbit");
          if (to.mode === "stand" && s.cam.mode === "orbit") { s.cam.dist = f.dist * (1 - e) + 0.05; s.cam.pitch = f.pitch * (1 - e) + 6 * e; s.cam.yaw = f.yaw + (((to.yaw + 180) - f.yaw + 540) % 360 - 180) * e; }
          if (to.mode === "orbit" && s.cam.mode === "orbit") { const g0 = { dist: 0.05, pitch: 6, yaw: f.yaw + 180 }; s.cam.dist = g0.dist + (to.dist - g0.dist) * e; s.cam.pitch = g0.pitch + (to.pitch - g0.pitch) * e; s.cam.yaw = g0.yaw + (((to.yaw - g0.yaw + 540) % 360) - 180) * e; }
        }
        if (k >= 1) { s.cam = { ...to }; s.target = { ...to }; s.tween = null; }
        moving = true;
      } else {
        const c = s.cam, t = s.target;
        const dy = ((t.yaw - c.yaw + 540) % 360) - 180;
        if (Math.abs(dy) > 0.01 || Math.abs(t.pitch - c.pitch) > 0.01 || Math.abs(t.dist - c.dist) > 0.001) {
          c.yaw += dy * 0.22; c.pitch += (t.pitch - c.pitch) * 0.22; c.dist += (t.dist - c.dist) * 0.22; c.mode = t.mode;
          moving = true;
        }
      }
      /* the contours draw themselves in over the first second */
      if (s.revealT0 && s.reveal < 1500) { s.reveal = 300 + Math.min(1, (tNow - s.revealT0) / 1300) * 1250; moving = true; }
      const ambient = s.cloud > 0.12 && s.live;
      if (!moving && !s.dirty && !ambient && !s.raining) { drawRain(dt); return; }
      s.dirty = false;

      /* the sun for the hour on the dial, on the valley's calendar day */
      const when = s.live ? new Date(s.now) : valleyDateAt(new Date(s.now), s.hour);
      const sunP = sunPosition(when);
      const sky = skyFor(sunP.elevation, s.live ? s.cloud : 0);
      s.sky = sky;
      const sunV = sunVector(sunP);
      /* below the horizon the moon lights the hills faintly from high up */
      const lightV = sunP.elevation > 0 ? sunV : [0.3, 0.8, -0.5];

      const { w, h } = s.size;
      const { eye, target } = eyeAndTarget(s.cam, s.ground);
      const proj = perspective(s.cam.mode === "stand" ? 52 : 44, w / h, 0.02, 120);
      const viewM = lookAt(eye, target, [0, 1, 0]);
      const vp = mul(proj, viewM);
      s.vp = vp;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(u.vp, false, vp);
      gl.uniform1i(u.inner, 0);
      gl.uniform1i(u.outer, 1);
      gl.uniform2f(u.innerSchool, innerF!.meta.schoolPx.x / (innerF!.meta.size - 1), innerF!.meta.schoolPx.y / (innerF!.meta.size - 1));
      gl.uniform2f(u.outerSchool, outerF!.meta.schoolPx.x / (outerF!.meta.size - 1), outerF!.meta.schoolPx.y / (outerF!.meta.size - 1));
      gl.uniform1f(u.schoolH, innerF!.meta.schoolHeight);
      gl.uniform3f(u.sun, lightV[0], lightV[1], lightV[2]);
      gl.uniform1f(u.strength, sunP.elevation > 0 ? sky.strength : sky.strength * 0.6);
      gl.uniform3f(u.light, sky.light[0], sky.light[1], sky.light[2]);
      gl.uniform3f(u.ambient, sky.ambient[0], sky.ambient[1], sky.ambient[2]);
      gl.uniform3f(u.horizon, sky.horizon[0], sky.horizon[1], sky.horizon[2]);
      gl.uniform1f(u.night, sky.night);
      gl.uniform1f(u.cloud, s.live ? s.cloud : 0);
      const fogK = s.cam.mode === "stand" ? 0.0022 : 0.0009;
      gl.uniform1f(u.fog, fogK * (1 + (weather && weather.code >= 45 && weather.code <= 48 && s.live ? 6 : 0)));
      gl.uniform1f(u.time, tNow / 1000);
      gl.uniform3f(u.cam, eye[0], eye[1], eye[2]);
      gl.uniform1f(u.reveal, s.reveal);
      gl.uniform1f(u.shadowSteps, isTouch ? 18 : 30);
      gl.bindVertexArray(vao);
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);

      /* the sky behind, the stars, the labels */
      const el = wrap.current!;
      el.style.setProperty("--zenith", toCss(sky.zenith));
      el.style.setProperty("--horizon", toCss(sky.horizon));
      el.style.setProperty("--night", String(sky.night));
      placeLabels();
      drawRain(dt);
    };

    const placeLabels = () => {
      const root = labels.current; if (!root || !s.vp) return;
      const { w, h } = s.size;
      for (const node of Array.from(root.children) as HTMLElement[]) {
        const p = [Number(node.dataset.x), Number(node.dataset.y), Number(node.dataset.z)];
        const q = project(s.vp, p);
        const on = q.w > 0 && q.x > -1.1 && q.x < 1.1 && q.y > -1.1 && q.y < 1.1;
        node.style.opacity = on ? "1" : "0";
        if (on) node.style.transform = `translate(${((q.x + 1) / 2) * w}px, ${((1 - q.y) / 2) * h}px)`;
      }
    };

    (async () => {
      try {
        const [i, o] = await Promise.all([loadField(16), loadField(64)]);
        if (disposed) return;
        innerF = i; outerF = o;
        const mesh = buildMesh(i, o, N);
        count = mesh.idx.length;
        s.ground = worldHeight(i, o, 0, 0);
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const bind = (data: Float32Array, loc: number) => {
          const b = gl.createBuffer()!;
          buffers.push(b);
          gl.bindBuffer(gl.ARRAY_BUFFER, b);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
        };
        bind(mesh.pos, gl.getAttribLocation(prog, "aPos"));
        bind(mesh.nor, gl.getAttribLocation(prog, "aNor"));
        const ib = gl.createBuffer()!;
        buffers.push(ib);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        makeTex(i, 0);
        makeTex(o, 1);

        /* the peaks worth a label: the highest local maxima within the near
           map, kept a few kilometres apart */
        const found: Peak[] = [];
        const S = i.meta.size, step = 6;
        for (let y = step; y < S - step; y += 2) for (let x = step; x < S - step; x += 2) {
          const hh = i.data[y * S + x];
          let top = true;
          for (let dy = -step; dy <= step && top; dy += 2) for (let dx = -step; dx <= step; dx += 2) {
            if ((dx || dy) && i.data[(y + dy) * S + x + dx] > hh) { top = false; break; }
          }
          if (top && hh > i.meta.schoolHeight + 250) {
            const wx = ((x / (S - 1)) - i.meta.schoolPx.x / (S - 1)) * 2 * INNER_HALF;
            const wz = ((y / (S - 1)) - i.meta.schoolPx.y / (S - 1)) * 2 * INNER_HALF;
            found.push({ x: wx, z: wz, y: worldHeight(i, o, wx, wz), metres: Math.round(hh), label: `${Math.round(hh).toLocaleString("en-IN")} m` });
          }
        }
        found.sort((a, b) => b.metres - a.metres);
        const kept: Peak[] = [];
        for (const p of found) { if (kept.every((k) => Math.hypot(k.x - p.x, k.z - p.z) > 2.2)) kept.push(p); if (kept.length >= 4) break; }
        setPeaks(kept);

        resize();
        setReady(true);
        const home = s.wanted ?? "east";
        if (s.still) {
          s.reveal = 1500;
          s.cam = { ...VIEWS[home] }; s.target = { ...VIEWS[home] };
        } else {
          s.revealT0 = performance.now();
          s.cam = { ...VIEWS.above }; s.target = { ...VIEWS.above };
          window.setTimeout(() => { if (!disposed) { s.tween = { from: { ...VIEWS.above }, to: { ...VIEWS[home] }, t0: performance.now(), ms: 1700 }; s.target = { ...VIEWS[home] }; } }, 1150);
        }
        raf = requestAnimationFrame(frame);
      } catch (e) {
        setFailed(`The hills could not be loaded: ${(e as Error).message}`);
      }
    })();

    /* pointers: one finger turns, two pinch and tilt, the wheel zooms */
    const pts = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, pitch0 = 0, dist0 = 0, mid0 = 0;
    const onDown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cv.setPointerCapture(e.pointerId);
      s.tween = null;
      if (pts.size === 2) {
        const [a, b] = Array.from(pts.values());
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = s.target.dist; pitch0 = s.target.pitch; mid0 = (a.y + b.y) / 2;
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId); if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      if (pts.size === 1) {
        const dx = cur.x - prev.x, dy = cur.y - prev.y;
        const t = s.target;
        if (t.mode === "stand") { t.yaw = (t.yaw + dx * 0.16 + 360) % 360; t.pitch = Math.max(-8, Math.min(40, t.pitch - dy * 0.12)); }
        else { t.yaw = (t.yaw - dx * 0.32 + 360) % 360; if (e.pointerType !== "touch") t.pitch = Math.max(6, Math.min(89, t.pitch + dy * 0.22)); }
      }
      pts.set(e.pointerId, cur);
      if (pts.size === 2) {
        const [a, b] = Array.from(pts.values());
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const t = s.target;
        if (t.mode === "orbit") {
          t.dist = Math.max(0.6, Math.min(40, dist0 * (pinch0 / Math.max(1, d))));
          t.pitch = Math.max(6, Math.min(89, pitch0 + ((a.y + b.y) / 2 - mid0) * 0.2));
        }
      }
      s.dirty = true;
    };
    const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = s.target; if (t.mode !== "orbit") return;
      t.dist = Math.max(0.6, Math.min(40, t.dist * Math.exp(e.deltaY * 0.0012)));
      s.dirty = true;
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("wheel", onWheel);
      /* Free the GPU objects by hand rather than losing the context: a canvas
         hands back the SAME context object on the next getContext(), so under
         React's development double-mount a lost context came back dead and
         every shader "failed to compile" with an empty log. */
      for (const b of buffers) gl.deleteBuffer(b);
      for (const t of textures) gl.deleteTexture(t);
      if (vao) gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one GL life per mount; everything live is read through st.current
  }, []);

  /* the readout */
  const whenMs = live ? now : valleyDateAt(new Date(now), hour).getTime();
  const when = new Date(whenMs);
  const sun = useMemo(() => sunPosition(new Date(whenMs)), [whenMs]);
  const times = useMemo(() => sunTimes(new Date(now)), [now]);
  const clock = live ? valleyClock(new Date(now)).label : `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;
  const compass = (az: number) => ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(az / 45) % 8];
  const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  const sunLine =
    sun.elevation > 0
      ? `Sun ${Math.round(sun.elevation)}° up, in the ${compass(sun.azimuth)}`
      : sun.elevation > -6
        ? `Twilight; the sun set in the ${compass(sun.azimuth)}`
        : `Night. Sunrise at ${fmt(times.sunrise)}, sunset at ${fmt(times.sunset)}`;
  const moon = moonPhase(when);

  return (
    <div className="vh" ref={wrap} data-mode={st.current.cam.mode}>
      <div className="vh-sky" aria-hidden />
      <div className="vh-stars" aria-hidden style={{ opacity: `var(--night)` }} />
      <canvas ref={canvas} className="vh-gl" aria-label="The hills around Rishi Valley School, drawn from real elevation data" />
      <canvas ref={rain} className="vh-rain" aria-hidden />
      <div className="vh-labels" ref={labels} aria-hidden>
        <div className="vh-label vh-school" data-x="0" data-y={st.current.ground + 0.02} data-z="0">
          <span className="vh-ring" />
          <span className="vh-name">Rishi Valley School</span>
        </div>
        {peaks.map((p) => (
          <div key={`${p.x},${p.z}`} className="vh-label vh-peak" data-x={p.x} data-y={p.y + 0.01} data-z={p.z}>
            <span className="vh-tick" />
            <span className="vh-name">{p.label}</span>
          </div>
        ))}
      </div>

      {!ready && !failed && <div className="vh-wait">Reading the ground…</div>}
      {failed && <div className="vh-wait">{failed}</div>}

      <div className="vh-hud">
        <div className="vh-clock">
          <b>{clock}</b>
          <span>at the valley</span>
          {!live && (
            <button type="button" className="vh-now" onClick={() => { setLive(true); const t = Date.now(); setNow(t); setHour(valleyClock(new Date(t)).hour); }}>
              Now
            </button>
          )}
        </div>
        <div className="vh-sun">
          {sunLine}
          {weather && live && (
            <>
              {" · "}
              {Math.round(weather.temperatureC)}°C
              {weather.precipitationMm > 0 ? ", raining" : weather.cloud > 0.7 ? ", overcast" : weather.cloud > 0.3 ? ", some cloud" : ", clear"}
            </>
          )}
          {sun.elevation <= 0 && <span className="vh-moon" style={{ ["--phase" as string]: moon }} title="the moon's phase tonight" />}
        </div>
        <label className="vh-dial">
          <span className="vh-dial-track" style={{ ["--rise" as string]: `${(times.sunrise / 24) * 100}%`, ["--set" as string]: `${(times.sunset / 24) * 100}%` }} />
          <input
            type="range"
            min={0}
            max={24}
            step={0.02}
            value={hour}
            aria-label="Hour of the day at the valley"
            onChange={(e) => { setLive(false); setHour(Number(e.target.value)); }}
          />
        </label>
        <div className="vh-views" role="group" aria-label="Where to look from">
          {(["above", "east", "school"] as const).map((v) => (
            <button key={v} type="button" className={view === v ? "on" : ""} onClick={() => goTo(v)}>
              {v === "above" ? "From above" : v === "east" ? "From the east" : "From the school"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const HILLS_CSS = `
.vh { position:relative; width:100%; height:100%; min-height:420px; overflow:hidden; border-radius:18px; isolation:isolate;
  --zenith:#86AECE; --horizon:#E6E1D0; --night:0; background:var(--horizon); touch-action:pan-y; user-select:none; -webkit-user-select:none; }
.vh-sky { position:absolute; inset:0; background:linear-gradient(to bottom, var(--zenith) 0%, var(--horizon) 62%, var(--horizon) 100%); }
.vh-stars { position:absolute; inset:0; background-image:
  radial-gradient(1px 1px at 12% 18%, #fff 60%, transparent 62%), radial-gradient(1.2px 1.2px at 31% 9%, #fff 60%, transparent 62%),
  radial-gradient(1px 1px at 47% 22%, #fff 60%, transparent 62%), radial-gradient(1.4px 1.4px at 63% 12%, #fff 60%, transparent 62%),
  radial-gradient(1px 1px at 78% 26%, #fff 60%, transparent 62%), radial-gradient(1px 1px at 88% 8%, #fff 60%, transparent 62%),
  radial-gradient(1.1px 1.1px at 22% 33%, #fff 60%, transparent 62%), radial-gradient(1px 1px at 55% 31%, #fff 60%, transparent 62%),
  radial-gradient(1.3px 1.3px at 70% 4%, #fff 60%, transparent 62%), radial-gradient(1px 1px at 5% 6%, #fff 60%, transparent 62%),
  radial-gradient(1px 1px at 40% 3%, #fff 60%, transparent 62%), radial-gradient(1.2px 1.2px at 93% 30%, #fff 60%, transparent 62%),
  radial-gradient(1px 1px at 84% 17%, #fff 60%, transparent 62%), radial-gradient(1px 1px at 17% 27%, #fff 60%, transparent 62%),
  radial-gradient(1px 1px at 36% 16%, #fff 60%, transparent 62%), radial-gradient(1px 1px at 60% 20%, #fff 60%, transparent 62%);
  background-size:100% 100%; mix-blend-mode:screen; pointer-events:none; }
.vh-gl { position:absolute; inset:0; display:block; cursor:grab; }
.vh-gl:active { cursor:grabbing; }
.vh-rain { position:absolute; inset:0; pointer-events:none; }
.vh-labels { position:absolute; inset:0; pointer-events:none; }
.vh-label { position:absolute; top:0; left:0; opacity:0; will-change:transform; display:flex; align-items:center; gap:7px; white-space:nowrap; }
.vh-school .vh-ring { width:12px; height:12px; border-radius:50%; border:2px solid #235C49; background:rgba(245,242,234,.9); box-shadow:0 0 0 3px rgba(245,242,234,.55); margin-left:-6px; }
.vh-school .vh-name { font-family:var(--font-display),Georgia,serif; font-size:13px; color:#1E2A26; background:rgba(245,242,234,.86); padding:3px 8px; border-radius:999px; }
.vh-peak .vh-tick { width:1px; height:14px; background:rgba(35,36,30,.55); margin-top:-14px; }
.vh-peak .vh-name { font-size:11px; color:#3B3A33; background:rgba(245,242,234,.72); padding:1px 6px; border-radius:999px; margin-top:-14px; margin-left:-4px; }
.vh[data-mode="stand"] .vh-school { display:none; }
.vh-wait { position:absolute; inset:0; display:grid; place-items:center; font-size:13px; color:#3B3A33; background:rgba(230,225,208,.55); }
.vh-hud { position:absolute; left:14px; right:14px; bottom:14px; display:grid; grid-template-columns:1fr auto; grid-template-areas:"clock views" "sun views" "dial dial"; gap:6px 14px; align-items:end; pointer-events:none; }
.vh-hud > * { pointer-events:auto; }
.vh-clock { grid-area:clock; display:flex; align-items:baseline; gap:8px; }
.vh { --hud-ink: color-mix(in srgb, #1E2A26 calc((1 - var(--night)) * 100%), #E8EDE6); --hud-soft: color-mix(in srgb, #3B3A33 calc((1 - var(--night)) * 100%), #C3CCC7); }
.vh-clock b { font-family:var(--font-display),Georgia,serif; font-size:30px; line-height:1; color:var(--hud-ink); letter-spacing:-.01em; }
.vh-clock span { font-size:13px; color:var(--hud-soft); }
.vh-now { font:inherit; font-size:12px; font-weight:600; border:0; border-radius:999px; padding:4px 10px; background:#235C49; color:#fff; cursor:pointer; }
.vh-sun { grid-area:sun; font-size:13px; color:var(--hud-ink); display:flex; align-items:center; gap:8px; }
.vh-moon { display:inline-block; width:12px; height:12px; border-radius:50%; background:#F1EBDA;
  box-shadow: inset calc((0.5 - var(--phase)) * 14px) 0 0 0 #2A3A3C; }
.vh-dial { grid-area:dial; position:relative; display:block; height:30px; }
.vh-dial-track { position:absolute; left:0; right:0; top:12px; height:6px; border-radius:999px;
  background:linear-gradient(to right, #2A3A3C 0%, #2A3A3C var(--rise), #E5945B calc(var(--rise) + 3%), #F1E5C8 calc(var(--rise) + 14%), #F1E5C8 calc(var(--set) - 14%), #E5945B calc(var(--set) - 3%), #2A3A3C var(--set), #2A3A3C 100%); opacity:.9; }
.vh-dial input { position:absolute; inset:0; width:100%; margin:0; background:transparent; -webkit-appearance:none; appearance:none; cursor:ew-resize; }
.vh-dial input::-webkit-slider-runnable-track { height:30px; background:transparent; }
.vh-dial input::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:22px; height:22px; margin-top:4px; border-radius:50%; background:#F5F2EA; border:2px solid #235C49; box-shadow:0 1px 3px rgba(30,28,22,.35); }
.vh-dial input::-moz-range-track { height:30px; background:transparent; }
.vh-dial input::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:#F5F2EA; border:2px solid #235C49; box-shadow:0 1px 3px rgba(30,28,22,.35); }
.vh-views { grid-area:views; display:flex; gap:4px; background:rgba(245,242,234,.78); border-radius:999px; padding:3px; backdrop-filter:blur(8px); }
.vh-views button { font:inherit; font-size:12px; font-weight:600; border:0; border-radius:999px; padding:6px 11px; background:transparent; color:#3B3A33; cursor:pointer; }
.vh-views button.on { background:#235C49; color:#fff; }
@media (max-width:640px) {
  .vh { min-height:360px; border-radius:14px; }
  .vh-hud { left:10px; right:10px; bottom:10px; grid-template-columns:1fr; grid-template-areas:"clock" "sun" "dial" "views"; gap:5px; }
  .vh-clock b { font-size:24px; }
  .vh-views { justify-self:start; }
  .vh-views button { padding:6px 9px; font-size:11.5px; }
}
`;
