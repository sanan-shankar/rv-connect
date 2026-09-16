"use client";

/* ------------------------------------------------------------------ *
 *  The weave: everyone who was here, as thread.
 *
 *  The school's years as a length of hand-loom cloth on a dark table.
 *  Every year is a warp thread, undyed, running top to bottom. Every
 *  member is a weft thread woven across the years they were here, over
 *  and under the warp, dyed each year by the house they were in: the
 *  junior-school colour, the middle-school colour, the senior-school
 *  colour. Teachers are dyed the school's own green. A year nobody has
 *  filled in is undyed.
 *
 *  Drag along it and a shuttle line follows, naming the year and who was
 *  here. Pinch in and the threads part into people, with names at their
 *  left ends and houses along them. Your own thread is lit.
 *
 *  How it is drawn: one full-screen quad and one fragment shader. Each
 *  pixel works out which warp column and which weft row it is in, reads
 *  the dye for that (row, year) from a small data texture, decides which
 *  thread is on top from the weave's parity, and shades that thread as a
 *  lit cylinder with a twist of fibre along it and a shadow where the
 *  other thread passes under. The light moves with the pointer, which is
 *  what puts a sheen on it. No geometry, no library.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";

export type Thread = {
  id: string;
  name: string;
  batch: number | null;
  teacher: boolean;
  from: number;
  to: number; /* inclusive, the last academic year's starting calendar year */
  years: { year: number; stage: number; house: string | null }[];
};

/* ---- the shader ------------------------------------------------------- */

const VS = `#version 300 es
precision highp float;
in vec2 aCorner;
out vec2 vScr;
uniform vec2 uView;
void main(){ vec2 ndc = aCorner * 2.0 - 1.0; gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0); vScr = aCorner * uView; }`;

const FS = `#version 300 es
precision highp float;
in vec2 vScr;
out vec4 o;
uniform vec2 uView;
uniform vec2 uCenter;   /* cloth coords (year, row) at the screen centre */
uniform float uZoom;    /* px per year */
uniform float uRowPx;   /* px per row */
uniform float uYears;   /* warp count */
uniform float uRows;    /* weft count */
uniform sampler2D uDye; /* rows x years, R = stage code / 8 */
uniform vec2 uLight;    /* light direction in screen xy, from the pointer */
uniform float uMe;      /* row of the viewer's thread, or -1 */
uniform float uHover;   /* row under the pointer, or -1 */
uniform float uShuttle; /* year under the pointer (float), or -1 */
uniform float uTime;

const vec3 TABLE = vec3(0.118, 0.106, 0.09);
const vec3 LINEN = vec3(0.86, 0.80, 0.68);
const vec3 JUNIOR = vec3(0.22, 0.57, 0.33);
const vec3 MIDDLE = vec3(0.79, 0.42, 0.20);
const vec3 SENIOR = vec3(0.30, 0.50, 0.66);
const vec3 TEACHER = vec3(0.17, 0.38, 0.30);
const vec3 UNDYED = vec3(0.80, 0.74, 0.62);

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

vec3 dyeOf(float s){
  if (s < 0.5) return vec3(-1.0);       /* no thread here */
  if (s < 1.5) return JUNIOR;
  if (s < 2.5) return MIDDLE;
  if (s < 3.5) return SENIOR;
  if (s < 4.5) return TEACHER;
  return UNDYED;
}

/* a lit cylinder: d is the signed distance across the thread in radii,
   along is the coordinate along it for the fibre twist */
vec3 shadeThread(vec3 dye, float d, float along, float twistScale, vec2 axis){
  float n = sqrt(max(0.0, 1.0 - d * d));
  /* normal in screen space: across the thread by d, out of the screen by n */
  vec3 N = normalize(vec3(axis * d, n));
  vec3 L = normalize(vec3(uLight, 1.4));
  float diff = 0.35 + 0.65 * max(0.0, dot(N, L));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(0.0, dot(N, H)), 10.0) * 0.16;
  /* fibre twist: a helix of slight light and dark along the thread */
  float twist = 0.93 + 0.07 * sin(along * twistScale + d * 2.2);
  return dye * diff * twist + spec;
}

void main(){
  /* screen px -> cloth coords */
  float x = (vScr.x - uView.x * 0.5) / uZoom + uCenter.x;   /* years */
  float y = (vScr.y - uView.y * 0.5) / uRowPx + uCenter.y;  /* rows */
  float c = floor(x), r = floor(y);
  float fx = x - c, fy = y - r;                             /* 0..1 within cell */
  vec3 col = TABLE;

  bool inWarp = c >= 0.0 && c < uYears;
  bool inRows = r >= 0.0 && r < uRows;

  /* what thread, if any, runs through this cell */
  float stage = 0.0;
  if (inWarp && inRows) stage = texture(uDye, vec2((c + 0.5) / uYears, (r + 0.5) / uRows)).r * 8.0;
  vec3 dye = dyeOf(stage);
  bool hasWeft = dye.x >= 0.0;

  /* thread geometry, in cell units. The weft fills most of its row; the warp
     is thinner, as on a loom. Antialiased by the pixel size in each axis. */
  float weftR = 0.40, warpR = 0.24;
  float aaY = 1.0 / uRowPx, aaX = 1.0 / uZoom;
  float dWeft = (fy - 0.5) / weftR;          /* signed, in radii */
  float dWarp = (fx - 0.5) / warpR;
  float weftCov = hasWeft ? 1.0 - smoothstep(1.0 - aaY / weftR, 1.0 + aaY / weftR, abs(dWeft)) : 0.0;
  float warpCov = inWarp ? 1.0 - smoothstep(1.0 - aaX / warpR, 1.0 + aaX / warpR, abs(dWarp)) : 0.0;

  /* plain weave: the weft is over the warp where row + year is even */
  bool weftOver = mod(c + r, 2.0) < 0.5;

  /* the viewer's own thread and the hovered thread are lifted a little */
  float lift = 0.0;
  if (uMe >= 0.0 && abs(r - uMe) < 0.5) lift = 1.0;
  if (uHover >= 0.0 && abs(r - uHover) < 0.5) lift = max(lift, 0.7);
  if (lift > 0.0) weftOver = true;

  /* shadow the under thread near the over thread's edge */
  float shadowW = 1.0 - smoothstep(1.0, 1.55, abs(dWarp));
  float shadowF = 1.0 - smoothstep(1.0, 1.55, abs(dWeft));

  /* the unwoven warp is there but quiet, so the woven part is the object */
  vec3 linen = LINEN * (0.9 + 0.2 * hash(vec2(c, 0.0))) * (hasWeft ? 1.0 : 0.58);
  vec3 weftCol = hasWeft ? shadeThread(dye * (1.0 + 0.18 * lift), dWeft, x * 6.2832 * 7.0, 1.0, vec2(0.0, 1.0)) : TABLE;
  vec3 warpCol = shadeThread(linen, dWarp, y * 6.2832 * 5.0, 1.0, vec2(1.0, 0.0));

  if (weftOver) {
    /* warp first, darkened where the weft will cross it, then the weft */
    vec3 under = warpCol * (1.0 - 0.45 * shadowF * float(hasWeft));
    col = mix(col, under, warpCov);
    col = mix(col, weftCol, weftCov);
  } else {
    vec3 under = weftCol * (1.0 - 0.45 * shadowW * float(inWarp));
    col = mix(col, under, weftCov);
    col = mix(col, warpCol, warpCov);
  }

  /* above and below the cloth the warp runs on into the dark */
  if (!inRows && inWarp) col = mix(TABLE, col, 0.7);

  /* the shuttle: a soft bright line at the pointer's year */
  if (uShuttle >= 0.0) {
    float dx = abs(x - uShuttle) * uZoom;
    col += vec3(0.95, 0.9, 0.8) * (1.0 - smoothstep(0.0, 1.6, dx)) * 0.55;
    col += vec3(0.95, 0.9, 0.8) * (1.0 - smoothstep(0.0, 26.0, dx)) * 0.06;
  }

  o = vec4(col, 1.0);
}`;

/* ---- the component ------------------------------------------------------ */

type Cam = { x: number; y: number; z: number };
const ROW_RATIO = 0.62; /* row pitch as a fraction of the year pitch, so zooming keeps the weave's shape */
const sceneEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function Weave({ threads, firstYear, lastYear, meId }: { threads: Thread[]; firstYear: number; lastYear: number; meId: string | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const yearsRef = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(true);
  /* the hint goes on the first gesture, or on its own after a while */
  useEffect(() => { const id = window.setTimeout(() => setHint(false), 6000); return () => window.clearTimeout(id); }, []);
  const years = lastYear - firstYear + 1;
  const meRow = meId ? threads.findIndex((t) => t.id === meId) : -1;

  useEffect(() => {
    const cv = canvas.current!;
    const box = wrap.current!;
    const gl = cv.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) { setFailed("This browser has no WebGL2, so the cloth cannot be drawn here."); return; }
    let disposed = false;
    let raf = 0;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
      return sh;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    } catch (e) { setFailed(`Shader: ${(e as Error).message}`); return; }
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { view: U("uView"), center: U("uCenter"), zoom: U("uZoom"), rowPx: U("uRowPx"), years: U("uYears"), rows: U("uRows"), dye: U("uDye"), light: U("uLight"), me: U("uMe"), hover: U("uHover"), shuttle: U("uShuttle"), time: U("uTime") };

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const qb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const ac = gl.getAttribLocation(prog, "aCorner");
    gl.enableVertexAttribArray(ac); gl.vertexAttribPointer(ac, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    /* the dye texture: rows x years, one byte each, stage * 32 */
    const rows = threads.length;
    const dye = new Uint8Array(years * rows);
    threads.forEach((t, r) => { for (const y of t.years) { const c = y.year - firstYear; if (c >= 0 && c < years) dye[r * years + c] = (y.stage || 6) * 32; } });
    /* stage 0 (at school, no house recorded) is drawn undyed too: code 6 -> 6*32/255*8 = 6.02 */
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, years, rows, 0, gl.RED, gl.UNSIGNED_BYTE, dye);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /* ---- state ---- */
    let size = { w: 1, h: 1 };
    const cam: Cam = { x: 0, y: 0, z: 12 };
    const target: Cam = { x: 0, y: 0, z: 12 };
    let fly: null | { from: Cam; to: Cam; t0: number; ms: number } = null;
    let zMin = 4, zMax = 160;
    let dirty = true;
    const light = { x: 0.3, y: -0.5 };
    const lightTarget = { x: 0.3, y: -0.5 };
    let hoverRow = -1, shuttleYear = -1;
    let pointerIn = false;
    const t0 = performance.now();

    const firstThreadYear = threads.length ? Math.min(...threads.map((t) => t.from)) : firstYear;
    const clampCam = (c: Cam) => {
      c.z = Math.min(zMax, Math.max(zMin, c.z));
      const halfW = size.w / 2 / c.z, halfH = size.h / 2 / (c.z * ROW_RATIO);
      c.x = Math.min(years - halfW * 0.5, Math.max(halfW * 0.5, c.x));
      c.y = Math.min(rows - halfH * 0.5 + 2, Math.max(halfH * 0.5 - 2, c.y));
    };
    /** From the first thread to now, all rows */
    const fitAll = (): Cam => {
      const span = years - (firstThreadYear - firstYear) + 2;
      const z = Math.min((size.w - 24) / span, (size.h - 60) / (rows * ROW_RATIO + 2));
      return { x: firstYear === firstThreadYear ? years / 2 : (firstThreadYear - firstYear) + span / 2 - 1, y: rows / 2, z: Math.max(zMin, z) };
    };
    const flyTo = (to: Cam, ms = 900) => { clampCam(to); fly = { from: { ...cam }, to, t0: performance.now(), ms }; Object.assign(target, to); dirty = true; };

    const resize = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size = { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
      cv.width = Math.round(size.w * dpr); cv.height = Math.round(size.h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      dirty = true;
    };

    /* ---- labels ---- */
    const placeChrome = () => {
      const rowPx = cam.z * ROW_RATIO;
      const sx = (yr: number) => (yr - firstYear - cam.x) * cam.z + size.w / 2;
      const sy = (row: number) => (row - cam.y) * rowPx + size.h / 2;
      const root = labels.current;
      if (root) {
        const showNames = rowPx >= 15;
        const showHouses = cam.z >= 54 && rowPx >= 15;
        for (const node of Array.from(root.children) as HTMLElement[]) {
          const r = Number(node.dataset.r);
          const t = threads[r];
          if (!t) continue;
          const y = sy(r + 0.5);
          const x0 = sx(t.from), x1 = sx(t.to + 1);
          /* not under the year band at the top or the readout at the foot */
          const on = showNames && y > 30 && y < size.h - 54 && x1 > 0 && x0 < size.w;
          node.style.opacity = on ? "1" : "0";
          if (!on) continue;
          /* the name sits just inside the thread's left end, or pinned at the
             screen edge when that end is off it; in the upper part of the
             thread when there is room for the houses under it */
          const nx = Math.max(8, x0 + 6);
          const ny = showHouses ? y - rowPx * 0.2 : y;
          node.style.transform = `translate(${nx}px, ${ny}px)`;
          node.style.fontSize = `${Math.min(13, Math.max(10, rowPx * 0.55))}px`;
          const houses = node.querySelector<HTMLElement>(".wv-houses");
          if (houses) {
            houses.style.display = showHouses ? "flex" : "none";
            if (showHouses) {
              for (const h of Array.from(houses.children) as HTMLElement[]) {
                const yr = Number(h.dataset.y);
                const hx0 = sx(yr), hx1 = sx(yr + 1);
                h.style.transform = `translate(${hx0 - nx + 3}px, 0)`;
                h.style.width = `${hx1 - hx0 - 6}px`;
              }
            }
          }
        }
      }
      const yr = yearsRef.current;
      if (yr) {
        const every = cam.z >= 40 ? 1 : cam.z >= 16 ? 5 : 10;
        for (const node of Array.from(yr.children) as HTMLElement[]) {
          const y = Number(node.dataset.y);
          const on = y % every === 0 || y === firstYear;
          const x = sx(y) + cam.z / 2;
          const vis = on && x > 6 && x < size.w - 6;
          node.style.opacity = vis ? "1" : "0";
          if (vis) node.style.transform = `translate(${x}px, 0) translateX(-50%)`;
        }
      }
      const ro = readout.current;
      if (ro) {
        if (shuttleYear >= 0) {
          const y = Math.floor(shuttleYear) + firstYear;
          const here = threads.filter((t) => y >= t.from && y <= t.to);
          const names = here.slice(0, 9).map((t) => t.name.split(" ")[0]);
          const more = here.length - names.length;
          ro.innerHTML = `<b>${y}</b><span>${here.length === 0 ? "nobody here is from this year yet" : `${here.length} here${names.length ? ": " + names.join(", ") + (more > 0 ? ` and ${more} more` : "") : ""}`}</span>`;
        } else if (hoverRow >= 0 && threads[hoverRow]) {
          const t = threads[hoverRow];
          ro.innerHTML = `<b>${t.name}</b><span>${t.teacher ? "taught" : "here"} ${t.from} to ${t.to + 1}${t.batch ? `, batch of ${t.batch}` : ""}</span>`;
        } else {
          ro.innerHTML = `<b>${rows} threads</b><span>${firstYear} to ${lastYear}. Drag along the years; pinch to come closer.</span>`;
        }
      }
    };

    /* ---- frame ---- */
    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (fly) {
        const k = Math.min(1, (now - fly.t0) / fly.ms), e = sceneEase(k);
        cam.z = Math.exp(Math.log(fly.from.z) + (Math.log(fly.to.z) - Math.log(fly.from.z)) * e);
        cam.x = fly.from.x + (fly.to.x - fly.from.x) * e; cam.y = fly.from.y + (fly.to.y - fly.from.y) * e;
        if (k >= 1) fly = null;
        dirty = true;
      } else {
        const f = 0.3;
        const dz = Math.log(target.z) - Math.log(cam.z), dx = target.x - cam.x, dy = target.y - cam.y;
        if (Math.abs(dz) > 1e-4 || Math.abs(dx) * cam.z > 0.05 || Math.abs(dy) * cam.z > 0.05) {
          cam.z = Math.exp(Math.log(cam.z) + dz * f); cam.x += dx * f; cam.y += dy * f; dirty = true;
        } else if (dirty) Object.assign(cam, target);
      }
      const lx = light.x, ly = light.y;
      light.x += (lightTarget.x - light.x) * 0.08; light.y += (lightTarget.y - light.y) * 0.08;
      if (Math.abs(lx - light.x) > 1e-3 || Math.abs(ly - light.y) > 1e-3) dirty = true;
      if (!dirty) return;
      dirty = false;

      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.view, size.w, size.h);
      gl.uniform2f(u.center, cam.x, cam.y);
      gl.uniform1f(u.zoom, cam.z);
      gl.uniform1f(u.rowPx, cam.z * ROW_RATIO);
      gl.uniform1f(u.years, years);
      gl.uniform1f(u.rows, rows);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.dye, 0);
      gl.uniform2f(u.light, light.x, light.y);
      gl.uniform1f(u.me, meRow);
      gl.uniform1f(u.hover, hoverRow);
      gl.uniform1f(u.shuttle, shuttleYear);
      gl.uniform1f(u.time, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      placeChrome();
    };

    /* ---- pointers: drag pans, pinch and wheel zoom, hover shuttles ---- */
    const pts = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, z0 = 1, downX = 0, downY = 0, moved = false, downAt = 0;
    const local = (e: PointerEvent | MouseEvent) => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    const toCloth = (sx: number, sy: number, c: Cam) => ({ x: (sx - size.w / 2) / c.z + c.x, y: (sy - size.h / 2) / (c.z * ROW_RATIO) + c.y });
    const zoomAbout = (sx: number, sy: number, factor: number) => {
      const w = toCloth(sx, sy, target);
      target.z = Math.min(zMax, Math.max(zMin, target.z * factor));
      target.x = w.x - (sx - size.w / 2) / target.z;
      target.y = w.y - (sy - size.h / 2) / (target.z * ROW_RATIO);
      clampCam(target); dirty = true;
      setHint(false);
    };
    const track = (p: { x: number; y: number }) => {
      lightTarget.x = (p.x / size.w - 0.5) * 1.6; lightTarget.y = (p.y / size.h - 0.5) * -1.6;
      const w = toCloth(p.x, p.y, cam);
      shuttleYear = w.x >= 0 && w.x < years ? w.x : -1;
      const r = Math.floor(w.y);
      hoverRow = r >= 0 && r < rows && Math.abs(w.y - r - 0.5) < 0.45 ? r : -1;
      dirty = true;
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      pts.set(e.pointerId, p);
      cv.setPointerCapture(e.pointerId);
      fly = null; Object.assign(target, cam);
      if (pts.size === 1) { downX = p.x; downY = p.y; moved = false; downAt = performance.now(); }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = target.z; }
      pointerIn = true;
      track(p);
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (!pts.has(e.pointerId)) { if (e.pointerType === "mouse") { pointerIn = true; track(p); } return; }
      const prev = pts.get(e.pointerId)!;
      if (pts.size === 1) {
        if (Math.hypot(p.x - downX, p.y - downY) > 8) moved = true;
        target.x -= (p.x - prev.x) / target.z;
        target.y -= (p.y - prev.y) / (target.z * ROW_RATIO);
        clampCam(target); dirty = true;
        setHint(false);
      } else if (pts.size === 2) {
        moved = true;
        pts.set(e.pointerId, p);
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const o = e.pointerId === [...pts.keys()][0] ? b : a;
        const pmx = (prev.x + o.x) / 2, pmy = (prev.y + o.y) / 2;
        const w = toCloth(pmx, pmy, target);
        target.z = Math.min(zMax, Math.max(zMin, z0 * (d / Math.max(1, pinch0))));
        target.x = w.x - (mx - size.w / 2) / target.z;
        target.y = w.y - (my - size.h / 2) / (target.z * ROW_RATIO);
        clampCam(target); dirty = true;
        setHint(false);
      }
      pts.set(e.pointerId, p);
      track(p);
    };
    const onUp = (e: PointerEvent) => {
      const p = local(e);
      const wasSingle = pts.size === 1;
      pts.delete(e.pointerId);
      if (pts.size === 1) { const [a] = [...pts.values()]; pinch0 = 0; downX = a.x; downY = a.y; moved = true; }
      if (e.pointerType !== "mouse") { shuttleYear = -1; hoverRow = -1; dirty = true; }
      if (!wasSingle || moved || performance.now() - downAt > 320) return;
      /* a tap: come in on that thread, or step back out if already close */
      const w = toCloth(p.x, p.y, cam);
      const r = Math.floor(w.y);
      if (cam.z >= 50) { flyTo(fitAll(), 1000); return; }
      if (r >= 0 && r < rows) {
        const t = threads[r];
        const span = t.to - t.from + 1 + 2;
        const z = Math.min(zMax, Math.max(60, (size.w - 40) / span));
        flyTo({ x: t.from - firstYear + span / 2 - 1, y: r + 0.5, z }, 900);
      }
    };
    const onLeave = () => { pointerIn = false; shuttleYear = -1; hoverRow = -1; lightTarget.x = 0.3; lightTarget.y = -0.5; dirty = true; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      fly = null;
      if (e.ctrlKey) zoomAbout(p.x, p.y, Math.exp(-e.deltaY * 0.012));
      else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { target.x += (e.deltaX || e.deltaY) / target.z; clampCam(target); dirty = true; }
      else zoomAbout(p.x, p.y, Math.exp(-e.deltaY * 0.0022));
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("wheel", onWheel, { passive: false });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") zoomAbout(size.w / 2, size.h / 2, 0.8);
      if (e.key === "=" || e.key === "+") zoomAbout(size.w / 2, size.h / 2, 1.25);
      if (e.key === "0") flyTo(fitAll(), 1000);
    };
    cv.addEventListener("keydown", onKey);

    const ro = new ResizeObserver(() => { resize(); const f = fitAll(); zMin = f.z * 0.9; });
    ro.observe(box);
    resize();
    const f = fitAll();
    zMin = f.z * 0.9;
    zMax = Math.max(160, size.h / (ROW_RATIO * 6));
    /* ?z=me opens on the viewer's thread, ?z=in on a close view, for a scripted shot */
    const want = new URLSearchParams(window.location.search).get("z");
    Object.assign(cam, f);
    if (want === "in" || (want === "me" && meRow >= 0)) {
      const r = want === "me" ? meRow : Math.floor(rows * 0.7);
      const t = threads[r];
      if (t) { const span = t.to - t.from + 3; cam.z = Math.min(zMax, Math.max(60, (size.w - 40) / span)); cam.x = t.from - firstYear + span / 2 - 1; cam.y = r + 0.5; }
    }
    clampCam(cam);
    Object.assign(target, cam);
    setReady(true);
    raf = requestAnimationFrame(frame);
    void pointerIn;

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("keydown", onKey);
      gl.deleteTexture(tex);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one GL life per mount; the threads are read at mount
  }, []);

  const yearMarks: number[] = [];
  for (let y = firstYear; y <= lastYear; y++) yearMarks.push(y);

  return (
    <div ref={wrap} className="wv-wrap">
      <canvas ref={canvas} className="wv-canvas" tabIndex={0} aria-label="Everyone who was at the school, as threads across the years. Drag along the years; pinch to come closer." />
      <div ref={yearsRef} className="wv-years" aria-hidden>
        {yearMarks.map((y) => (
          <span key={y} data-y={y} className="wv-yearmark">{y}</span>
        ))}
      </div>
      <div ref={labels} className="wv-labels" aria-hidden>
        {threads.map((t, r) => (
          <div key={t.id} data-r={r} className={`wv-name${t.id === meId ? " me" : ""}`}>
            <span className="wv-nm">{t.name}</span>
            <div className="wv-houses">
              {t.years.filter((y) => y.house).map((y) => (
                <span key={y.year} data-y={y.year} className="wv-house">{y.house}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="wv-chrome" aria-hidden>
        <div ref={readout} className="wv-readout" />
        <div className="wv-key">
          <i className="j" />junior <i className="m" />middle <i className="s" />senior <i className="t" />taught <i className="u" />not filled in
        </div>
      </div>
      {hint && ready && <div className="wv-hint" aria-hidden>Drag along the years</div>}
      {failed && <div className="wv-msg">{failed}</div>}
    </div>
  );
}

export const WEAVE_CSS = `
.wv-wrap { position:relative; width:100%; height:100%; background:#1E1B17; border-radius:18px; overflow:hidden; user-select:none; -webkit-user-select:none; }
.wv-canvas { display:block; width:100%; height:100%; touch-action:none; cursor:grab; outline:none; }
.wv-canvas:active { cursor:grabbing; }
.wv-years { position:absolute; left:0; right:0; top:0; height:34px; pointer-events:none; background:linear-gradient(to bottom, rgba(30,27,23,.9), rgba(30,27,23,0)); }
.wv-yearmark { position:absolute; left:0; top:9px; opacity:0; font-family:var(--font-display),Georgia,serif; font-size:11.5px; letter-spacing:.03em; color:rgba(233,226,211,.9); white-space:nowrap; }
.wv-labels { position:absolute; inset:0; pointer-events:none; }
.wv-name { position:absolute; left:0; top:0; opacity:0; transform:translate(-9999px,-9999px); will-change:transform; white-space:nowrap; color:#F3EDDF;
  font-family:var(--font-display),Georgia,serif; line-height:1; margin-top:-0.5em; text-shadow:0 0 6px rgba(30,27,23,.9), 0 1px 2px rgba(30,27,23,.9); }
.wv-name.me .wv-nm { font-weight:700; }
.wv-houses { position:absolute; left:0; top:1.45em; display:none; }
.wv-house { position:absolute; left:0; top:0; font-family:var(--font-body),system-ui,sans-serif; font-size:10.5px; letter-spacing:.02em; color:rgba(243,237,223,.85); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; }
.wv-chrome { position:absolute; left:0; right:0; bottom:0; padding:34px 14px 12px; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; pointer-events:none;
  background:linear-gradient(to top, rgba(30,27,23,.86), rgba(30,27,23,0)); }
.wv-readout { display:flex; flex-direction:column; gap:2px; min-width:0; }
.wv-readout b { font-family:var(--font-display),Georgia,serif; font-weight:400; font-size:16px; color:#F3EDDF; }
.wv-readout span { font-size:12.5px; color:rgba(233,226,211,.78); line-height:1.35; }
.wv-key { display:flex; align-items:center; gap:5px 6px; font-size:11.5px; color:rgba(233,226,211,.7); white-space:nowrap; flex-wrap:wrap; justify-content:flex-end; max-width:46%; }
.wv-key i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-left:6px; }
.wv-key i.j { background:#389154; } .wv-key i.m { background:#C96B33; } .wv-key i.s { background:#4D80A8; } .wv-key i.t { background:#2B614C; } .wv-key i.u { background:#CCBD9E; }
.wv-hint { position:absolute; left:50%; top:34px; transform:translateX(-50%); padding:7px 13px; border-radius:999px; font-size:12.5px; font-weight:600;
  color:#1E1B17; background:#F3EDDF; box-shadow:0 6px 18px -8px rgba(0,0,0,.7); animation:wv-breathe 2.4s ease-in-out infinite; pointer-events:none; }
@keyframes wv-breathe { 0%,100% { opacity:.92; } 50% { opacity:.55; } }
.wv-msg { position:absolute; inset:0; display:grid; place-items:center; color:#E9E2D3; font-size:14px; text-align:center; padding:24px; }
@media (max-width:640px) { .wv-key { display:none; } }
`;
