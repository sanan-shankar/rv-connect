"use client";

/* ------------------------------------------------------------------ *
 *  Then: one place, two years, and the dust between them.
 *
 *  Two photographs of the same spot. The earlier one lifts off the frame
 *  as grains of its own colour, each grain leaving from where it sat,
 *  drifting on a wind, and settling back in the same place carrying the
 *  later photograph's colour instead. Drag the year and the picture is
 *  held wherever your finger is, half dust and half bench; let go and it
 *  settles to the nearer year.
 *
 *  Why grains and not a crossfade: a crossfade shows two half-pictures
 *  on top of each other, which is a blur. Here every grain is always
 *  whole, and what is in the air is a cloud the colour of the place, so
 *  the middle of the transition is a design and not a smear.
 *
 *  How it is drawn:
 *   - Each photograph is fitted over the frame (cover). A grid of points,
 *     one per few screen pixels, is the frame's own pixels.
 *   - In the vertex shader each point reads its colour from both
 *     photographs at its own place in the frame, mixes by its own local
 *     progress, and is displaced by a curl field (the wind) scaled by a
 *     bell over that progress, so nothing moves at either end. Its local
 *     progress lags the global one by a phase that rises with height, so
 *     the ground leaves first and lands first: the new picture prints in
 *     from the bottom.
 *   - A per-grain depth makes some grains nearer (larger, brighter,
 *     shifting more with the pointer) and some further, which is what
 *     makes it a cloud and not a screen of confetti.
 *   - At either end the photograph itself is drawn as one quad under the
 *     grains, so the rest state is a photograph, pixel-sharp.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";

export type ThenPhoto = { id: string; url: string; thumb: string; w: number; h: number; year: number; caption: string | null };
export type ThenPair = { key: string; title: string; a: ThenPhoto; b: ThenPhoto };

/* ---- shaders ---------------------------------------------------------- */

const NOISE = `
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 7.1) + 0.15 * vnoise(p * 4.11 + 3.7); }
vec2 curl(vec2 p){
  float e = 0.02;
  float dx = fbm(p + vec2(e, 0)) - fbm(p - vec2(e, 0));
  float dy = fbm(p + vec2(0, e)) - fbm(p - vec2(0, e));
  return vec2(dy, -dx) / (2.0 * e);
}`;

/* the wave: where in the frame leaves when. Shared by the grains and the
   photograph quads so the picture fades out exactly where its grains lift. */
const WAVE = `
float localT(float uT, float y, float jitter){
  /* departure order: the ground first, the top last, with a little jitter;
     normalised so the first grain leaves at 0 and the last lands at 1 */
  float phase = ((1.0 - y) * 0.42 + jitter * 0.16) / 0.58;
  float span = 0.5;
  return clamp((uT - phase * (1.0 - span)) / span, 0.0, 1.0);
}`;

const VS = `#version 300 es
precision highp float;
in vec2 aUv;        /* the grain's place in the frame, 0..1 */
in vec3 aSeed;      /* phase jitter, depth (-1..1), size jitter */
uniform float uT;   /* global progress 0..1 */
uniform vec2 uView; /* frame size, css px */
uniform float uCell;/* grain spacing, css px */
uniform float uDpr;
uniform vec4 uFitA; uniform vec4 uFitB; /* uv transform per photograph: uv * xy + zw */
uniform sampler2D uA; uniform sampler2D uB;
uniform vec2 uTilt; /* pointer offset, -1..1 */
uniform float uTime;
out vec4 vColor; out float vAir;
${NOISE}
${WAVE}
void main(){
  /* local progress: the ground leaves first, with a little jitter, so the
     new picture prints in from the bottom */
  float tl = localT(uT, aUv.y, aSeed.x);
  float ease = tl * tl * (3.0 - 2.0 * tl);
  float air = sin(3.14159 * ease);          /* 0 at rest, 1 mid-flight */
  air = pow(air, 0.8);

  vec3 ca = texture(uA, aUv * uFitA.xy + uFitA.zw).rgb;
  vec3 cb = texture(uB, aUv * uFitB.xy + uFitB.zw).rgb;
  vec3 c = mix(ca, cb, smoothstep(0.3, 0.7, ease));

  /* the wind: a curl field the grain rides while it is in the air, plus a
     lift upward, both scaled by how airborne it is */
  vec2 p = aUv * vec2(uView.x / uView.y, 1.0) * 2.2 + vec2(uTime * 0.05, ease * 0.9);
  vec2 wind = curl(p) * 0.08;
  float depth = aSeed.y;
  vec2 disp = (wind + vec2(0.0, 0.10 + 0.06 * depth)) * air;
  /* the pointer tilts the cloud: nearer grains move more */
  disp += uTilt * 0.035 * (0.5 + depth) * air;

  vec2 uv = aUv + disp;
  vec2 ndc = uv * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

  /* nearer grains are bigger and catch a little light; further ones
     smaller and dimmer. Small, so a bright sky does not clip to white. */
  float size = uCell * uDpr * (1.05 + air * (0.9 + 0.7 * depth) + aSeed.z * 0.2);
  gl_PointSize = size;
  float lit = 1.0 + air * (0.04 + 0.10 * depth);
  vColor = vec4(c * lit, 1.0);
  vAir = air;
}`;

const FS = `#version 300 es
precision highp float;
in vec4 vColor; in float vAir;
out vec4 o;
void main(){
  /* a grain at rest is not drawn: the photograph itself is there */
  if (vAir < 0.02) discard;
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  /* square-ish as it leaves so the grid tiles without gaps, a soft disc in the air */
  float rest = 1.0 - smoothstep(0.42, 0.5, max(abs(q.x), abs(q.y)));
  float disc = 1.0 - smoothstep(0.28, 0.5, d);
  float a = mix(rest, disc, min(1.0, vAir * 2.5));
  if (a < 0.01) discard;
  o = vec4(vColor.rgb * a, a);
}`;

/* the photograph itself: the earlier one fades out where its grains have
   lifted, the later one fades in where they have landed, pixel by pixel
   along the same wave the grains ride */
const VSQ = `#version 300 es
precision highp float;
in vec2 aCorner;
uniform vec4 uFit;
out vec2 vUv; out vec2 vFrame;
void main(){ vec2 ndc = aCorner * 2.0 - 1.0; gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0); vUv = aCorner * uFit.xy + uFit.zw; vFrame = aCorner; }`;
const FSQ = `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vFrame; uniform sampler2D uTex; uniform float uT; uniform float uSide;
out vec4 o;
${WAVE}
void main(){
  float tl = localT(uT, vFrame.y, 0.5);
  /* the earlier photograph (side 0) is gone once its grains are in the
     air; the later one (side 1) is there once they have landed */
  float a = uSide < 0.5 ? 1.0 - smoothstep(0.0, 0.14, tl) : smoothstep(0.86, 1.0, tl);
  if (a < 0.003) discard;
  o = vec4(texture(uTex, vUv).rgb * a, a);
}`;

/* ---- helpers ------------------------------------------------------------ */

/** uv transform that fits a w x h photograph over a W x H frame (cover). */
function coverFit(w: number, h: number, W: number, H: number): [number, number, number, number] {
  const fr = W / H, pr = w / h;
  if (pr > fr) { const sx = fr / pr; return [sx, 1, (1 - sx) / 2, 0]; }
  const sy = pr / fr; return [1, sy, 0, (1 - sy) / 2];
}

const SETTLE_MS = 1700;
const PLAY_MS = 2600;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function Then({ pair, autoplay = true }: { pair: ThenPair; autoplay?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const yearA = useRef<HTMLSpanElement>(null);
  const yearB = useRef<HTMLSpanElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const cv = canvas.current!;
    const box = wrap.current!;
    const gl = cv.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) { setFailed("This browser has no WebGL2, so the dust cannot be drawn here."); return; }
    let disposed = false;
    let raf = 0;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
      return sh;
    };
    const program = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
      return p;
    };
    let progP: WebGLProgram, progQ: WebGLProgram;
    try { progP = program(VS, FS); progQ = program(VSQ, FSQ); } catch (e) { setFailed(`Shader: ${(e as Error).message}`); return; }
    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const uP = { t: U(progP, "uT"), view: U(progP, "uView"), cell: U(progP, "uCell"), dpr: U(progP, "uDpr"), fitA: U(progP, "uFitA"), fitB: U(progP, "uFitB"), a: U(progP, "uA"), b: U(progP, "uB"), tilt: U(progP, "uTilt"), time: U(progP, "uTime") };
    const uQ = { fit: U(progQ, "uFit"), tex: U(progQ, "uTex"), t: U(progQ, "uT"), side: U(progQ, "uSide") };

    /* the quad */
    const vaoQ = gl.createVertexArray()!;
    gl.bindVertexArray(vaoQ);
    const qb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const qc = gl.getAttribLocation(progQ, "aCorner");
    gl.enableVertexAttribArray(qc); gl.vertexAttribPointer(qc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    /* the grains: rebuilt on resize */
    const vaoP = gl.createVertexArray()!;
    const pb = gl.createBuffer()!;
    let count = 0;
    let size = { w: 1, h: 1 };
    let cell = 3;
    let dpr = 1;
    const buildGrains = () => {
      const cols = Math.ceil(size.w / cell), rows = Math.ceil(size.h / cell);
      count = cols * rows;
      const data = new Float32Array(count * 5);
      let k = 0;
      let seed = 1234567;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        data[k++] = (i + 0.5) / cols; data[k++] = (j + 0.5) / rows;
        data[k++] = rnd(); data[k++] = rnd() * 2 - 1; data[k++] = rnd();
      }
      gl.bindVertexArray(vaoP);
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const lu = gl.getAttribLocation(progP, "aUv"), ls = gl.getAttribLocation(progP, "aSeed");
      gl.enableVertexAttribArray(lu); gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(ls); gl.vertexAttribPointer(ls, 3, gl.FLOAT, false, 20, 8);
      gl.bindVertexArray(null);
    };
    const resize = () => {
      const r = box.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      size = { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
      /* about 90k grains on a laptop, fewer on a phone's smaller frame */
      cell = size.w > 900 ? 3 : 2.6;
      cv.width = Math.round(size.w * dpr); cv.height = Math.round(size.h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      buildGrains();
      dirty = true;
    };

    /* textures: the thumbnail first, the full picture over it */
    const makeTex = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 36, 30, 255]));
      return t;
    };
    const texA = makeTex(), texB = makeTex();
    const upload = async (tex: WebGLTexture, src: string) => {
      const res = await fetch(src, { mode: "cors" });
      const bmp = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
      if (disposed) { bmp.close(); return; }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      bmp.close();
      dirty = true;
    };

    /* ---- state ---- */
    let t = 0, target = 0;
    let dirty = true;
    let tween: null | { from: number; to: number; t0: number; ms: number } = null;
    let dragging = false, dragX0 = 0, dragT0 = 0, dragged = false, lastX = 0, lastMoveT = 0, vel = 0;
    const tilt = { x: 0, y: 0 };
    const tiltTarget = { x: 0, y: 0 };
    const t0 = performance.now();

    const placeChrome = () => {
      const k = knob.current;
      if (k) k.style.left = `${(t * 100).toFixed(2)}%`;
      const a = yearA.current, b = yearB.current;
      if (a) a.style.opacity = String(0.45 + 0.55 * (1 - t));
      if (b) b.style.opacity = String(0.45 + 0.55 * t);
    };

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / tween.ms);
        t = tween.from + (tween.to - tween.from) * easeInOut(k);
        if (k >= 1) tween = null;
        dirty = true;
      } else if (dragging) {
        t = target;
        dirty = true;
      }
      /* the tilt follows the pointer softly */
      tilt.x += (tiltTarget.x - tilt.x) * 0.08; tilt.y += (tiltTarget.y - tilt.y) * 0.08;
      const airborne = t > 0.002 && t < 0.998;
      if (airborne) dirty = true;
      if (!dirty) return;
      dirty = false;

      const fitA = coverFit(pair.a.w, pair.a.h, size.w, size.h);
      const fitB = coverFit(pair.b.w, pair.b.h, size.w, size.h);
      gl.clearColor(0.118, 0.106, 0.09, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      /* the photographs, each present where its grains are at rest */
      gl.useProgram(progQ);
      gl.bindVertexArray(vaoQ);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(uQ.tex, 0);
      gl.uniform1f(uQ.t, t);
      if (t < 1) { gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform4f(uQ.fit, ...fitA); gl.uniform1f(uQ.side, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
      if (t > 0) { gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform4f(uQ.fit, ...fitB); gl.uniform1f(uQ.side, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

      /* the grains */
      gl.useProgram(progP);
      gl.bindVertexArray(vaoP);
      gl.uniform1f(uP.t, t);
      gl.uniform2f(uP.view, size.w, size.h);
      gl.uniform1f(uP.cell, cell);
      gl.uniform1f(uP.dpr, dpr);
      gl.uniform4f(uP.fitA, ...fitA);
      gl.uniform4f(uP.fitB, ...fitB);
      gl.uniform2f(uP.tilt, tilt.x, tilt.y);
      gl.uniform1f(uP.time, (now - t0) / 1000);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(uP.a, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(uP.b, 1);
      gl.drawArrays(gl.POINTS, 0, count);
      placeChrome();
    };

    const settle = (to: number, ms = SETTLE_MS) => { tween = { from: t, to, t0: performance.now(), ms: ms * Math.max(0.35, Math.abs(to - t)) }; };
    const play = () => { tween = { from: t, to: t < 0.5 ? 1 : 0, t0: performance.now(), ms: PLAY_MS }; };

    /* ---- pointers: drag sets the year, a press plays it through ---- */
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      dragging = true; dragged = false; dragX0 = e.clientX; dragT0 = t; target = t; lastX = e.clientX; lastMoveT = performance.now(); vel = 0;
      tween = null;
      setHint(false);
    };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      tiltTarget.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      tiltTarget.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!dragging) return;
      const dx = e.clientX - dragX0;
      if (Math.abs(dx) > 6) dragged = true;
      target = Math.min(1, Math.max(0, dragT0 + dx / (r.width * 0.7)));
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveT);
      vel = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastMoveT = now;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (!dragged) { play(); return; }
      /* settle to the nearer year, leaning the way the finger was going */
      const lean = Math.max(-0.25, Math.min(0.25, vel * 0.4));
      settle(t + lean < 0.5 ? 0 : 1);
    };
    const onLeave = () => { tiltTarget.x = 0; tiltTarget.y = 0; };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", onLeave);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); play(); }
      if (e.key === "ArrowLeft") settle(0);
      if (e.key === "ArrowRight") settle(1);
    };
    cv.addEventListener("keydown", onKey);

    const ro = new ResizeObserver(() => resize());
    ro.observe(box);
    resize();

    (async () => {
      try {
        await Promise.all([upload(texA, pair.a.thumb), upload(texB, pair.b.thumb)]);
        if (disposed) return;
        setReady(true);
        /* ?t=0.5 holds a moment still, for a scripted shot */
        const q = new URLSearchParams(window.location.search);
        const still = q.get("t");
        if (still !== null && !Number.isNaN(Number(still))) { t = Math.min(1, Math.max(0, Number(still))); target = t; dirty = true; }
        else if (autoplay) window.setTimeout(() => { if (!disposed && !dragging && t === 0) play(); }, 900);
        raf = requestAnimationFrame(frame);
        await Promise.all([upload(texA, pair.a.url), upload(texB, pair.b.url)]);
      } catch (e) {
        setFailed(`The photographs could not be loaded: ${(e as Error).message}`);
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
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("keydown", onKey);
      gl.deleteTexture(texA); gl.deleteTexture(texB);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one GL life per pair; the room keys this component on the pair
  }, [pair.key]);

  return (
    <div ref={wrap} className="th-wrap">
      <canvas ref={canvas} className="th-canvas" tabIndex={0} aria-label={`${pair.title}, ${pair.a.year} and ${pair.b.year}. Drag to move between the years; press to play.`} />
      <div className="th-rail" aria-hidden>
        <span ref={yearA} className="th-year">{pair.a.year}</span>
        <div className="th-track"><div ref={knob} className="th-knob" /></div>
        <span ref={yearB} className="th-year">{pair.b.year}</span>
      </div>
      {hint && ready && <div className="th-hint" aria-hidden>Drag the year</div>}
      {!ready && !failed && <div className="th-msg">Loading the photographs</div>}
      {failed && <div className="th-msg">{failed}</div>}
    </div>
  );
}

export const THEN_CSS = `
.th-wrap { position:relative; width:100%; height:100%; background:#1E1B17; border-radius:18px; overflow:hidden; user-select:none; -webkit-user-select:none; }
.th-canvas { display:block; width:100%; height:100%; touch-action:pan-y; cursor:ew-resize; outline:none; }
.th-rail { position:absolute; left:0; right:0; bottom:0; padding:40px 18px 14px; display:flex; align-items:center; gap:14px; pointer-events:none;
  background:linear-gradient(to top, rgba(30,27,23,.85), rgba(30,27,23,0)); }
.th-year { font-family:var(--font-display),Georgia,serif; font-size:22px; color:#F3EDDF; min-width:3ch; text-align:center; text-shadow:0 1px 8px rgba(0,0,0,.6); }
.th-track { position:relative; flex:1; height:2px; background:rgba(243,237,223,.28); border-radius:2px; }
.th-knob { position:absolute; top:50%; left:0; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; background:#F3EDDF; box-shadow:0 0 0 3px rgba(30,27,23,.6); }
.th-hint { position:absolute; left:50%; top:16px; transform:translateX(-50%); padding:7px 13px; border-radius:999px; font-size:12.5px; font-weight:600;
  color:#1E1B17; background:#F3EDDF; box-shadow:0 6px 18px -8px rgba(0,0,0,.7); animation:th-breathe 2.4s ease-in-out infinite; pointer-events:none; }
@keyframes th-breathe { 0%,100% { opacity:.92; } 50% { opacity:.55; } }
.th-msg { position:absolute; inset:0; display:grid; place-items:center; color:#E9E2D3; font-size:14px; text-align:center; padding:24px; }
`;
