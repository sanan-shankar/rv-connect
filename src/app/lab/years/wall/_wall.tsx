"use client";

/* ------------------------------------------------------------------ *
 *  The wall: every photograph at once, by year.
 *
 *  One world, one camera. Every photograph has a fixed place on a wall
 *  laid out in justified rows by year, newest at the top, each year's
 *  block as tall as the year was full. What you look at is a camera
 *  over that wall: pinch out and the photograph you were on shrinks
 *  into its row among its neighbours, pinch further and the whole
 *  archive is one picture with the years down its left edge; pinch in
 *  on any one and it comes back up to fill the frame. Nothing ever
 *  jumps, because nothing ever moves except the camera.
 *
 *  How it is drawn:
 *   - One instanced draw of every quad, textured from the atlas that
 *     scripts/dev/wall-atlas.mjs packs (64px tiles, two 2048px sheets).
 *     That is the far level, and it is the whole archive in one call.
 *   - Any photograph taller than about 90 screen pixels is promoted: its
 *     480px thumbnail is fetched and drawn over its tile, fading in so
 *     the hand-off is never a pop; past about 640px the full picture
 *     takes over the same way. Textures come and go with the camera, a
 *     hundred and sixty at most.
 *   - Year labels are HTML, placed from the camera each frame in the
 *     margin left of the wall, and pinned to the screen's edge when the
 *     wall's edge has gone off it.
 *
 *  Raw WebGL2, no library; the same choice the hills made.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";

export type WallPhoto = { id: string; t: string; u: string; w: number; h: number; y: string; c: string | null };

type Atlas = { tile: number; sheet: number; sheets: number; tiles: Record<string, { s: number; x: number; y: number; w: number; h: number }> };

/* ---- the layout ----------------------------------------------------- */

/** Target row height and gutter in world units. The wall's width is chosen
 *  so the whole thing has roughly the viewport's shape when it is all on
 *  screen, which is what makes "pinch all the way out" land on a wall and
 *  not a ribbon. */
const ROW = 40;
const GAP = 4;
const BLOCK_GAP = 34;

type Block = { year: string; y0: number; y1: number; x1: number; count: number; first: number };
type Layout = { W: number; H: number; rects: Float32Array; blocks: Block[] };

function layoutWall(photos: WallPhoto[], aspect: number): Layout {
  /* area of every photograph at ROW height, plus gutters, gives the wall's
     area; the wall's width follows from the aspect it should have. Block
     gaps and short last rows make the first guess too tall, so it is laid
     out twice and the width corrected from the measured shape. */
  let area = 0;
  for (const p of photos) area += (ROW * (p.w / p.h) + GAP) * (ROW + GAP);
  const want = Math.max(0.35, aspect);
  let W = Math.max(600, Math.round(Math.sqrt(area * want)));
  const first = layoutAt(photos, W);
  W = Math.max(600, Math.round(W * Math.sqrt(want / (first.W / first.H))));
  return layoutAt(photos, W);
}

function layoutAt(photos: WallPhoto[], W: number): Layout {

  const rects = new Float32Array(photos.length * 4);
  const blocks: Block[] = [];
  let y = 0;
  let i = 0;
  while (i < photos.length) {
    const year = photos[i].y;
    const first = i;
    const y0 = y;
    let count = 0;
    let x1 = 0;
    /* one block: rows of this year only */
    while (i < photos.length && photos[i].y === year) {
      /* fill a row */
      let sumA = 0;
      const start = i;
      while (i < photos.length && photos[i].y === year) {
        const a = photos[i].w / photos[i].h;
        if (sumA > 0 && (sumA + a) * ROW + GAP * (i - start) > W) break;
        sumA += a;
        i++;
      }
      const n = i - start;
      let h = (W - GAP * (n - 1)) / sumA;
      const last = i >= photos.length || photos[i].y !== year;
      if (last && h > ROW * 1.45) h = ROW; /* a short final row stays left-aligned at the usual height */
      let x = 0;
      for (let k = start; k < i; k++) {
        const w = h * (photos[k].w / photos[k].h);
        rects.set([x, y, w, h], k * 4);
        x += w + GAP;
      }
      x1 = Math.max(x1, x - GAP);
      y += h + GAP;
      count += n;
    }
    blocks.push({ year, y0, y1: y - GAP, x1, count, first });
    y += BLOCK_GAP;
  }
  return { W, H: y - BLOCK_GAP, rects, blocks };
}

/* ---- the shaders ---------------------------------------------------- */

const VS = `#version 300 es
precision highp float;
in vec2 aCorner;
in vec4 aRect;
in vec4 aUv;
in float aSheet;
uniform vec2 uCenter; uniform float uZoom; uniform vec2 uView;
out vec2 vUv; flat out float vSheet; out float vPx;
void main(){
  vec2 world = aRect.xy + aCorner * aRect.zw;
  vec2 scr = (world - uCenter) * uZoom + uView * 0.5;
  vec2 ndc = scr / uView * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  vUv = mix(aUv.xy, aUv.zw, aCorner);
  vSheet = aSheet;
  vPx = min(aRect.z, aRect.w) * uZoom;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; flat in float vSheet; in float vPx;
uniform sampler2D uA0; uniform sampler2D uA1;
out vec4 o;
void main(){
  vec3 c = vSheet < 0.5 ? texture(uA0, vUv).rgb : texture(uA1, vUv).rgb;
  float a = clamp(vPx, 0.0, 1.0);
  o = vec4(c * a, a);
}`;

/* a single quad with its own texture, drawn over its tile */
const VS1 = `#version 300 es
precision highp float;
in vec2 aCorner;
uniform vec4 uRect; uniform vec2 uCenter; uniform float uZoom; uniform vec2 uView;
out vec2 vUv;
void main(){
  vec2 world = uRect.xy + aCorner * uRect.zw;
  vec2 scr = (world - uCenter) * uZoom + uView * 0.5;
  vec2 ndc = scr / uView * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  vUv = aCorner;
}`;
const FS1 = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex; uniform float uAlpha;
out vec4 o;
void main(){ vec3 c = texture(uTex, vUv).rgb; o = vec4(c * uAlpha, uAlpha); }`;

/* ---- the camera ----------------------------------------------------- */

type Cam = { x: number; y: number; z: number };
/** The viewport-scale curve (EASE_IN_OUT_SCENE's shape), used for a fly. */
const sceneEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* the margin the year labels live in, and the band the readout lives in,
   both in screen pixels; the whole-wall fit leaves them clear */
const GUTTER = 72;
const FOOT = 48;
const EDGE = 14;
/* the middle level a tap steps out to: rows at this many screen pixels are
   pictures you can read, not tiles */
const NEIGHBOUR_ROW = 104;

/* ---- promotion thresholds, in screen pixels of a photograph's height ---- */
const PROMOTE_THUMB = 90;
const PROMOTE_FULL = 640;
const MAX_TEXTURES = 160;

export function Wall({ photos, startId }: { photos: WallPhoto[]; startId?: string | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const outline = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "noatlas">("loading");
  const [hint, setHint] = useState(true);
  const [years, setYears] = useState<Block[]>([]);
  const [isTouch, setIsTouch] = useState(false);
  /* the labels are placed by the render loop, so a label that React renders
     after the last frame needs one more frame */
  const wake = useRef<() => void>(() => {});
  useEffect(() => { wake.current(); }, [years]);
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const cv = canvas.current!;
    const box = wrap.current!;
    const gl = cv.getContext("webgl2", { alpha: false, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) { setFailed("This browser has no WebGL2, so the wall cannot be drawn here."); return; }
    let disposed = false;
    let raf = 0;

    /* ---- state the frame reads (refs, never React) ---- */
    let layout: Layout | null = null;
    let fromIndex = 0;
    const cam: Cam = { x: 0, y: 0, z: 1 };
    const target: Cam = { x: 0, y: 0, z: 1 };
    let fly: null | { from: Cam; to: Cam; t0: number; ms: number } = null;
    let zMin = 0.01, zMax = 40;
    let size = { w: 1, h: 1 };
    let dirty = true;
    let zoomedOnce = false;
    wake.current = () => { dirty = true; };

    const clampCam = (c: Cam) => {
      if (!layout) return;
      c.z = Math.min(zMax, Math.max(zMin, c.z));
      /* keep the wall on screen: its centre may not leave the viewport by
         more than half the wall, so you can never lose it */
      const halfW = size.w / 2 / c.z, halfH = size.h / 2 / c.z;
      const slackX = Math.max(GUTTER / c.z, layout.W / 2 - halfW * 0.9), slackY = Math.max(FOOT / c.z, layout.H / 2 - halfH * 0.9);
      c.x = Math.min(layout.W / 2 + slackX, Math.max(layout.W / 2 - slackX, c.x));
      c.y = Math.min(layout.H / 2 + slackY, Math.max(layout.H / 2 - slackY, c.y));
    };

    const fitAll = (): Cam => {
      const l = layout!;
      const z = Math.min((size.w - GUTTER - EDGE) / l.W, (size.h - FOOT - EDGE) / l.H);
      /* centred in the space left of the gutter and above the foot */
      return { x: l.W / 2 - (GUTTER - EDGE) / 2 / z, y: l.H / 2 + (FOOT - EDGE) / 2 / z, z };
    };
    const fitNear = (i: number): Cam => {
      const r = layout!.rects;
      return { x: r[i * 4] + r[i * 4 + 2] / 2, y: r[i * 4 + 1] + r[i * 4 + 3] / 2, z: NEIGHBOUR_ROW / ROW };
    };
    const fitPhoto = (i: number): Cam => {
      const r = layout!.rects;
      const x = r[i * 4], y = r[i * 4 + 1], w = r[i * 4 + 2], h = r[i * 4 + 3];
      const z = Math.min((size.w * 0.92) / w, (size.h * 0.9) / h);
      return { x: x + w / 2, y: y + h / 2, z };
    };
    const blockOf = (i: number): Block => {
      const bl = layout!.blocks;
      return bl[Math.max(0, bl.findIndex((bb, k) => i >= bb.first && (k === bl.length - 1 || i < bl[k + 1].first)))];
    };
    const fitBlock = (b: Block): Cam => {
      const bh = b.y1 - b.y0;
      const z = Math.max(zMin, Math.min((size.w - GUTTER - EDGE) / Math.max(b.x1, 1), (size.h - FOOT - EDGE) / Math.max(bh, 1), zMax));
      return { x: b.x1 / 2 - (GUTTER - EDGE) / 2 / z, y: (b.y0 + b.y1) / 2 + (FOOT - EDGE) / 2 / z, z };
    };
    const flyTo = (to: Cam, ms = 900) => {
      clampCam(to);
      fly = { from: { ...cam }, to, t0: performance.now(), ms };
      Object.assign(target, to);
      dirty = true;
    };

    /* ---- GL setup ---- */
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
      return sh;
    };
    const program = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
      return p;
    };
    let progA: WebGLProgram, prog1: WebGLProgram;
    try { progA = program(VS, FS); prog1 = program(VS1, FS1); } catch (e) { setFailed(`Shader: ${(e as Error).message}`); return; }
    const uA = { center: gl.getUniformLocation(progA, "uCenter"), zoom: gl.getUniformLocation(progA, "uZoom"), view: gl.getUniformLocation(progA, "uView"), a0: gl.getUniformLocation(progA, "uA0"), a1: gl.getUniformLocation(progA, "uA1") };
    const u1 = { center: gl.getUniformLocation(prog1, "uCenter"), zoom: gl.getUniformLocation(prog1, "uZoom"), view: gl.getUniformLocation(prog1, "uView"), rect: gl.getUniformLocation(prog1, "uRect"), tex: gl.getUniformLocation(prog1, "uTex"), alpha: gl.getUniformLocation(prog1, "uAlpha") };

    const corner = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    const cornerBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, corner, gl.STATIC_DRAW);

    const vaoA = gl.createVertexArray()!;
    const instBuf = gl.createBuffer()!;
    const vao1 = gl.createVertexArray()!;
    gl.bindVertexArray(vao1);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
    const c1 = gl.getAttribLocation(prog1, "aCorner");
    gl.enableVertexAttribArray(c1);
    gl.vertexAttribPointer(c1, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const atlasTex: WebGLTexture[] = [];
    let instances = 0;

    /* own textures for promoted photographs */
    type Own = { tex: WebGLTexture | null; level: 1 | 2; loading: boolean; born: number; seen: number };
    const own = new Map<number, Own>();
    const loadOwn = (i: number, wanted: 1 | 2) => {
      const cur = own.get(i);
      if (cur) cur.seen = performance.now();
      if (cur && (cur.level >= wanted || cur.loading)) return;
      /* the thumbnail always comes first, even when the full picture is
         wanted: it is 35 KB against a few MB, so the photograph is sharp
         enough within a frame or two and the full one lands over it */
      const level: 1 | 2 = cur && cur.tex ? wanted : 1;
      const entry: Own = cur ?? { tex: null, level, loading: true, born: 0, seen: performance.now() };
      entry.loading = true; entry.level = level; entry.seen = performance.now();
      own.set(i, entry);
      const p = photos[i];
      const src = level === 1 ? p.t : p.u;
      (async () => {
        try {
          const res = await fetch(src, { mode: "cors" });
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
          if (disposed) { bmp.close(); return; }
          const tex = gl.createTexture()!;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          bmp.close();
          const e = own.get(i);
          if (!e) { gl.deleteTexture(tex); return; }
          if (e.tex) gl.deleteTexture(e.tex); else e.born = performance.now();
          e.tex = tex; e.loading = false;
          dirty = true;
        } catch {
          const e = own.get(i);
          if (e) e.loading = false;
        }
      })();
    };
    const evict = (now: number) => {
      if (own.size <= MAX_TEXTURES) return;
      const stale = [...own.entries()].filter(([, e]) => !e.loading && now - e.seen > 1500).sort((a, b) => a[1].seen - b[1].seen);
      for (const [i, e] of stale) {
        if (own.size <= MAX_TEXTURES * 0.75) break;
        if (e.tex) gl.deleteTexture(e.tex);
        own.delete(i);
      }
    };

    const resize = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size = { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
      cv.width = Math.round(size.w * dpr);
      cv.height = Math.round(size.h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      dirty = true;
    };

    /* ---- labels and readout, placed from the camera ---- */
    const placeChrome = () => {
      const l = layout; if (!l) return;
      const root = labels.current; if (!root) return;
      const leftEdge = (0 - cam.x) * cam.z + size.w / 2;
      const pinned = leftEdge < GUTTER - 8;
      const lx = pinned ? 10 : leftEdge - 12;
      /* far out, two labels can want the same 15px; the fuller year keeps it */
      let last: { node: HTMLElement; y: number; count: number } | null = null;
      let centreYear: Block | null = null;
      const cy = cam.y;
      for (const node of Array.from(root.children) as HTMLElement[]) {
        const b = l.blocks[Number(node.dataset.i)];
        if (!b) continue;
        const sy = (b.y0 - cam.y) * cam.z + size.h / 2;
        const ey = (b.y1 - cam.y) * cam.z + size.h / 2;
        let on = ey > 0 && sy < size.h;
        if (on && last && sy - last.y < 15) {
          if (b.count > last.count) last.node.style.opacity = "0"; else on = false;
        }
        node.style.opacity = on ? "1" : "0";
        if (on) { node.style.transform = `translate(${lx}px, ${sy}px)`; last = { node, y: sy, count: b.count }; }
        node.classList.toggle("pin", pinned);
        if (cy >= b.y0 - BLOCK_GAP / 2 && cy <= b.y1 + BLOCK_GAP / 2) centreYear = b;
      }
      const ro = readout.current;
      if (ro) {
        const b = centreYear;
        ro.textContent = b ? `${b.year === "unknown" ? "Undated" : b.year} · ${b.count.toLocaleString("en-IN")} photograph${b.count === 1 ? "" : "s"}` : "";
      }
      const ol = outline.current;
      if (ol) {
        const r = l.rects, i = fromIndex;
        const x = (r[i * 4] - cam.x) * cam.z + size.w / 2, y = (r[i * 4 + 1] - cam.y) * cam.z + size.h / 2;
        const w = r[i * 4 + 2] * cam.z, h = r[i * 4 + 3] * cam.z;
        const show = h < size.h * 0.8 && h > 3;
        ol.style.opacity = show ? "1" : "0";
        ol.style.transform = `translate(${x - 2}px, ${y - 2}px)`;
        ol.style.width = `${w + 4}px`; ol.style.height = `${h + 4}px`;
      }
    };

    /* ---- the frame ---- */
    const frame = (tNow: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!layout) return;
      /* camera: a fly, or a soft follow to the target */
      if (fly) {
        const t = Math.min(1, (tNow - fly.t0) / fly.ms);
        const e = sceneEase(t);
        cam.z = Math.exp(Math.log(fly.from.z) + (Math.log(fly.to.z) - Math.log(fly.from.z)) * e);
        cam.x = fly.from.x + (fly.to.x - fly.from.x) * e;
        cam.y = fly.from.y + (fly.to.y - fly.from.y) * e;
        if (t >= 1) fly = null;
        dirty = true;
      } else {
        const f = 0.32;
        const dz = Math.log(target.z) - Math.log(cam.z);
        const dx = target.x - cam.x, dy = target.y - cam.y;
        if (Math.abs(dz) > 1e-4 || Math.abs(dx) * cam.z > 0.05 || Math.abs(dy) * cam.z > 0.05) {
          cam.z = Math.exp(Math.log(cam.z) + dz * f);
          cam.x += dx * f; cam.y += dy * f;
          dirty = true;
        } else if (dirty) { Object.assign(cam, target); }
      }
      if (!dirty) return;
      dirty = false;

      gl.clearColor(0.118, 0.106, 0.09, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      /* the atlas pass: everything */
      gl.useProgram(progA);
      gl.bindVertexArray(vaoA);
      gl.uniform2f(uA.center, cam.x, cam.y);
      gl.uniform1f(uA.zoom, cam.z);
      gl.uniform2f(uA.view, size.w, size.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex[0]); gl.uniform1i(uA.a0, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlasTex[1] ?? atlasTex[0]); gl.uniform1i(uA.a1, 1);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instances);

      /* the promotion pass: what is big enough to deserve its own picture */
      const r = layout.rects;
      const halfW = size.w / 2 / cam.z, halfH = size.h / 2 / cam.z;
      const x0 = cam.x - halfW, x1 = cam.x + halfW, y0 = cam.y - halfH, y1 = cam.y + halfH;
      gl.useProgram(prog1);
      gl.bindVertexArray(vao1);
      gl.uniform2f(u1.center, cam.x, cam.y);
      gl.uniform1f(u1.zoom, cam.z);
      gl.uniform2f(u1.view, size.w, size.h);
      gl.activeTexture(gl.TEXTURE2);
      gl.uniform1i(u1.tex, 2);
      let anyLoading = false;
      for (let i = 0; i < photos.length; i++) {
        const h = r[i * 4 + 3] * cam.z;
        if (h < PROMOTE_THUMB) continue;
        const px = r[i * 4], py = r[i * 4 + 1], pw = r[i * 4 + 2], ph = r[i * 4 + 3];
        if (px + pw < x0 || px > x1 || py + ph < y0 || py > y1) continue;
        loadOwn(i, h > PROMOTE_FULL ? 2 : 1);
        const e = own.get(i);
        if (!e || !e.tex) { anyLoading = true; continue; }
        const a = Math.min(1, (tNow - e.born) / 260);
        if (a < 1) anyLoading = true;
        gl.bindTexture(gl.TEXTURE_2D, e.tex);
        gl.uniform4f(u1.rect, px, py, pw, ph);
        gl.uniform1f(u1.alpha, a);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (anyLoading) dirty = true;
      evict(tNow);
      placeChrome();
    };

    /* ---- pointers: one drags, two pinch, the wheel zooms, a tap flies ---- */
    const pts = new Map<number, { x: number; y: number }>();
    let downAt = 0, downX = 0, downY = 0, moved = false, lastTap = 0, lastTapX = 0, lastTapY = 0;
    let pinch0 = 0, z0 = 1;
    const local = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    const toWorld = (sx: number, sy: number, c: Cam) => ({ x: (sx - size.w / 2) / c.z + c.x, y: (sy - size.h / 2) / c.z + c.y });
    const zoomAbout = (sx: number, sy: number, factor: number) => {
      const w = toWorld(sx, sy, target);
      target.z = Math.min(zMax, Math.max(zMin, target.z * factor));
      target.x = w.x - (sx - size.w / 2) / target.z;
      target.y = w.y - (sy - size.h / 2) / target.z;
      clampCam(target);
      if (!zoomedOnce) { zoomedOnce = true; setHint(false); }
      dirty = true;
    };
    const photoAt = (sx: number, sy: number): number => {
      if (!layout) return -1;
      const w = toWorld(sx, sy, cam);
      const r = layout.rects;
      for (let i = 0; i < photos.length; i++) {
        if (w.x >= r[i * 4] && w.x <= r[i * 4] + r[i * 4 + 2] && w.y >= r[i * 4 + 1] && w.y <= r[i * 4 + 1] + r[i * 4 + 3]) return i;
      }
      return -1;
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      pts.set(e.pointerId, p);
      cv.setPointerCapture(e.pointerId);
      fly = null;
      Object.assign(target, cam);
      if (pts.size === 1) { downAt = performance.now(); downX = p.x; downY = p.y; moved = false; }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = target.z;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId)!;
      const p = local(e);
      if (pts.size === 1) {
        if (Math.hypot(p.x - downX, p.y - downY) > 8) moved = true;
        target.x -= (p.x - prev.x) / target.z;
        target.y -= (p.y - prev.y) / target.z;
        clampCam(target);
        dirty = true;
      } else if (pts.size === 2) {
        moved = true;
        pts.set(e.pointerId, p);
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        /* the midpoint before this move, from the other finger and this one's previous place */
        const o = e.pointerId === [...pts.keys()][0] ? b : a;
        const pmx = (prev.x + o.x) / 2, pmy = (prev.y + o.y) / 2;
        const w = toWorld(pmx, pmy, target);
        target.z = Math.min(zMax, Math.max(zMin, z0 * (d / Math.max(1, pinch0))));
        target.x = w.x - (mx - size.w / 2) / target.z;
        target.y = w.y - (my - size.h / 2) / target.z;
        clampCam(target);
        if (!zoomedOnce) { zoomedOnce = true; setHint(false); }
        dirty = true;
      }
      pts.set(e.pointerId, p);
    };
    const onUp = (e: PointerEvent) => {
      const p = local(e);
      const wasSingle = pts.size === 1;
      pts.delete(e.pointerId);
      if (pts.size === 1) { const [a] = [...pts.values()]; pinch0 = 0; downX = a.x; downY = a.y; moved = true; }
      if (!wasSingle || moved || performance.now() - downAt > 320) return;
      /* a tap */
      const now = performance.now();
      if (now - lastTap < 260 && Math.hypot(p.x - lastTapX, p.y - lastTapY) < 40) {
        lastTap = 0;
        flyTo(fitAll(), 1100);
        if (!zoomedOnce) { zoomedOnce = true; setHint(false); }
        return;
      }
      lastTap = now; lastTapX = p.x; lastTapY = p.y;
      const i = photoAt(p.x, p.y);
      if (i >= 0) {
        const to = fitPhoto(i);
        const near = fitNear(i);
        /* a tap steps: up to the photograph; from there out to its neighbours
           at a readable size; from there out to the whole wall */
        if (i === fromIndex && Math.abs(Math.log(to.z / cam.z)) < 0.05) flyTo(near, 800);
        else if (i === fromIndex && Math.abs(Math.log(near.z / cam.z)) < 0.05) flyTo(fitAll(), 1100);
        else { fromIndex = i; flyTo(to, 900); }
        if (!zoomedOnce) { zoomedOnce = true; setHint(false); }
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e as unknown as PointerEvent);
      fly = null;
      const rate = e.ctrlKey ? 0.012 : 0.0022;
      zoomAbout(p.x, p.y, Math.exp(-e.deltaY * rate));
    };
    const onDbl = (e: MouseEvent) => { e.preventDefault(); };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("dblclick", onDbl);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") { zoomAbout(size.w / 2, size.h / 2, 0.8); }
      if (e.key === "=" || e.key === "+") { zoomAbout(size.w / 2, size.h / 2, 1.25); }
      if (e.key === "0") flyTo(fitAll(), 1100);
    };
    cv.addEventListener("keydown", onKey);

    const ro = new ResizeObserver(() => {
      const before = { ...size };
      resize();
      if (layout && (Math.abs(before.w / before.h - size.w / size.h) > 0.08)) {
        /* the wall's shape follows the viewport's; keep the same photograph in frame */
        layout = layoutWall(photos, size.w / size.h);
        buildInstances();
        const f = fitAll(); zMin = f.z * 0.85; zMax = (size.h / ROW) * 3;
        Object.assign(cam, fitPhoto(fromIndex)); Object.assign(target, cam);
        clampCam(cam); clampCam(target);
        setYears(layout.blocks);
      }
    });
    ro.observe(box);

    /* ---- the atlas, then the instances ---- */
    let atlas: Atlas | null = null;
    const buildInstances = () => {
      const l = layout!, a = atlas!;
      const per = 9;
      const data = new Float32Array(photos.length * per);
      for (let i = 0; i < photos.length; i++) {
        const t = a.tiles[photos[i].id];
        const o = i * per;
        data[o] = l.rects[i * 4]; data[o + 1] = l.rects[i * 4 + 1]; data[o + 2] = l.rects[i * 4 + 2]; data[o + 3] = l.rects[i * 4 + 3];
        if (t) {
          data[o + 4] = t.x / a.sheet; data[o + 5] = t.y / a.sheet;
          data[o + 6] = (t.x + t.w) / a.sheet; data[o + 7] = (t.y + t.h) / a.sheet;
          data[o + 8] = t.s;
        } else { data[o + 4] = data[o + 5] = 0; data[o + 6] = data[o + 7] = 0.0005; data[o + 8] = 0; }
      }
      gl.bindVertexArray(vaoA);
      gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
      const cA = gl.getAttribLocation(progA, "aCorner");
      gl.enableVertexAttribArray(cA);
      gl.vertexAttribPointer(cA, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const stride = per * 4;
      const set = (name: string, n: number, off: number) => {
        const loc = gl.getAttribLocation(progA, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off * 4);
        gl.vertexAttribDivisor(loc, 1);
      };
      set("aRect", 4, 0); set("aUv", 4, 4); set("aSheet", 1, 8);
      gl.bindVertexArray(null);
      instances = photos.length;
      dirty = true;
    };

    (async () => {
      try {
        const res = await fetch("/lab/wall/atlas.json");
        if (!res.ok) { setStatus("noatlas"); return; }
        atlas = (await res.json()) as Atlas;
        const sheets = await Promise.all(
          Array.from({ length: atlas.sheets }, async (_, n) => {
            const b = await (await fetch(`/lab/wall/atlas-${n}.webp`)).blob();
            return createImageBitmap(b, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
          })
        );
        if (disposed) return;
        for (const bmp of sheets) {
          const tex = gl.createTexture()!;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          atlasTex.push(tex);
          bmp.close();
        }
        resize();
        layout = layoutWall(photos, size.w / size.h);
        buildInstances();
        setYears(layout.blocks);
        const start = startId ? photos.findIndex((p) => p.id === startId) : -1;
        fromIndex = start >= 0 ? start : Math.max(0, photos.findIndex((p) => /banyan/i.test(p.c ?? "")));
        const f = fitAll();
        zMin = f.z * 0.85;
        zMax = (size.h / ROW) * 3;
        Object.assign(cam, fitPhoto(fromIndex));
        /* ?z=all or ?z=year: a scripted screenshot picks its level */
        const want = new URLSearchParams(window.location.search).get("z");
        if (want === "all") Object.assign(cam, f);
        if (want === "year") { const b = blockOf(fromIndex); Object.assign(cam, fitBlock(b)); }
        clampCam(cam);
        Object.assign(target, cam);
        setStatus("ready");
        raf = requestAnimationFrame(frame);
      } catch (e) {
        setFailed(`The wall could not be loaded: ${(e as Error).message}`);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("dblclick", onDbl);
      cv.removeEventListener("keydown", onKey);
      for (const e of own.values()) if (e.tex) gl.deleteTexture(e.tex);
      for (const t of atlasTex) gl.deleteTexture(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the whole GL life runs once per mount; photos and startId are read at mount and a change would remount the room
  }, []);

  return (
    <div ref={wrap} className="wl-wrap">
      <canvas ref={canvas} className="wl-canvas" tabIndex={0} aria-label="Every photograph, by year. Pinch or scroll to zoom, drag to move, tap a photograph to open it." />
      <div ref={labels} className="wl-labels" aria-hidden>
        {years.map((b, i) => (
          <span key={b.year + i} data-i={i} className="wl-year">{b.year === "unknown" ? "Undated" : b.year}</span>
        ))}
      </div>
      <div ref={outline} className="wl-outline" aria-hidden />
      <div className="wl-chrome" aria-hidden>
        <div ref={readout} className="wl-readout" />
        <div className="wl-count">{photos.length.toLocaleString("en-IN")} photographs</div>
      </div>
      {hint && status === "ready" && (
        <div className="wl-hint" aria-hidden>{isTouch ? "Pinch out" : "Scroll out"}</div>
      )}
      {status === "loading" && !failed && <div className="wl-msg">Loading the wall</div>}
      {status === "noatlas" && (
        <div className="wl-msg">
          The atlas is not built on this machine. Run <code>node scripts/dev/wall-atlas.mjs</code> and reload.
        </div>
      )}
      {failed && <div className="wl-msg">{failed}</div>}
    </div>
  );
}

export const WALL_CSS = `
.wl-wrap { position:relative; width:100%; height:100%; background:#1E1B17; border-radius:18px; overflow:hidden; user-select:none; -webkit-user-select:none; }
.wl-canvas { display:block; width:100%; height:100%; touch-action:none; cursor:grab; outline:none; }
.wl-canvas:active { cursor:grabbing; }
.wl-labels { position:absolute; inset:0; pointer-events:none; }
.wl-year { position:absolute; left:0; top:0; transform:translate(-9999px,-9999px); opacity:0; will-change:transform;
  font-family:var(--font-display),Georgia,serif; font-size:12.5px; letter-spacing:.02em; color:#E9E2D3; line-height:1;
  margin-left:-100%; padding:0; white-space:nowrap; text-align:right; width:100%; }
.wl-year.pin { margin-left:0; text-align:left; width:auto; padding:3px 7px; background:rgba(30,27,23,.72); border-radius:6px; backdrop-filter:blur(6px); }
.wl-outline { position:absolute; left:0; top:0; pointer-events:none; border:1.5px solid rgba(255,244,222,.85); border-radius:2px; opacity:0; box-shadow:0 0 0 1px rgba(0,0,0,.35); }
.wl-chrome { position:absolute; left:0; right:0; bottom:0; padding:34px 14px 12px; display:flex; justify-content:space-between; align-items:flex-end; pointer-events:none; gap:12px;
  background:linear-gradient(to top, rgba(30,27,23,.82), rgba(30,27,23,0)); }
.wl-readout { font-family:var(--font-display),Georgia,serif; font-size:15px; color:#F3EDDF; text-shadow:0 1px 8px rgba(0,0,0,.5); }
.wl-count { font-size:12px; color:rgba(233,226,211,.7); white-space:nowrap; }
.wl-hint { position:absolute; left:50%; top:16px; transform:translateX(-50%); padding:7px 13px; border-radius:999px; font-size:12.5px; font-weight:600;
  color:#1E1B17; background:#F3EDDF; box-shadow:0 6px 18px -8px rgba(0,0,0,.7); animation:wl-breathe 2.4s ease-in-out infinite; pointer-events:none; }
@keyframes wl-breathe { 0%,100% { opacity:.92; } 50% { opacity:.55; } }
.wl-msg { position:absolute; inset:0; display:grid; place-items:center; color:#E9E2D3; font-size:14px; text-align:center; padding:24px; }
.wl-msg code { font-size:12.5px; background:rgba(255,255,255,.08); padding:2px 6px; border-radius:6px; }
`;
