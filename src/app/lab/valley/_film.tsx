"use client";

/* ------------------------------------------------------------------ *
 *  The valley film, as the landing page would play it.
 *
 *  The whole screen is the flight (_flight.ts) over the real valley
 *  (_film-gl.ts). It holds on the three hills while a line traces their
 *  real ridge and settles into the mark, which flies to the corner where
 *  the landing page keeps its wordmark. Then the camera drops onto the
 *  Big Banyan and the landing page's own photograph comes up through the
 *  canopy, with its headline and buttons: the page as it is today.
 *
 *  For review: ?t=12.4 holds one moment; ?clean=1 hides the lab strip;
 *  ?sunaz=222&sunel=18 moves the sun; ?exp=, ?mie=, ?vib= tune the light,
 *  the haze and the colour. The strip's scrubber drags through the film.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PEAK_PLANES, Wordmark } from "@/components/layout/peaks-mark";
import { HERO_IMAGE_BLUR, HERO_IMAGE_SRC } from "@/components/landing/hero-photo";
import { cameraAt, PEAKS, toWorld, type Shot } from "./_geo";
import { FLIGHT, DURATION } from "./_flight";
import { ValleyRenderer, loadDem, type DemRect, type Look } from "./_film-gl";

const BASE = "/lab/valley/film";

/* The ending, in film seconds after the camera comes to rest at DURATION:
   a line traces the three hills' outline from foot to foot; the shape it
   closes fills as frosted glass; it lifts off to the corner, shrinking,
   and becomes the drawn mark on the way, landing as the wordmark's own;
   the hill-shaped hole it leaves shows the landing page's photograph,
   which opens until we are through it; the words arrive. */
const H = DURATION;
const TRACE = [H + 0.25, H + 1.65] as const;
const FILL = [H + 1.5, H + 1.9] as const;
const LIFT = [H + 2.0, H + 3.3] as const;
/* the photograph shows in the hole only once the glass has lifted clear
   of it; under the glass it would blur into a green blot */
const HOLE = [H + 2.3, H + 2.7] as const;
const ENTER = [H + 2.75, H + 4.05] as const;
const NAME = [H + 3.0, H + 3.5] as const;
const WORDS = [H + 3.85, H + 4.85] as const;
export const END = H + 4.95;
/** The outline is of the ground this near, which is the three hills and
 *  the foothills at their feet but not the ridges behind them (Bodikonda,
 *  the farthest, is 6.6 km off). */
const OUTLINE_M = 7000;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
const easeOut = (v: number) => 1 - Math.pow(1 - v, 3);

function lookFromQuery(q: URLSearchParams): Look {
  const num = (k: string, d: number) => (q.get(k) !== null && !Number.isNaN(Number(q.get(k))) ? Number(q.get(k)) : d);
  const az = (num("sunaz", 222) * Math.PI) / 180;
  const el = (num("sunel", 18) * Math.PI) / 180;
  return {
    sun: [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)],
    mie: num("mie", 1.6e-5),
    mieH: num("mieh", 1400),
    exposure: num("exp", 30),
    delight: num("delight", 0.6),
    vibrance: num("vib", 0.1),
    ms: num("ms", 0.03),
    power: num("pow", 1.15),
    sat: num("sat", 1.1),
    debug: num("debug", 0),
    bump: num("bump", 5),
    grain: num("grain", 0.03),
  };
}

/** The mark's silhouette, sampled once from the same geometry PeaksMark
 *  draws, in three runs: the left end of its base bar, the ridge, and the
 *  right end with the bar's underside. Only the ridge is ever reshaped. */
type MarkPts = { cap0: [number, number][]; ridge: [number, number][]; cap1: [number, number][]; tops: [number, number][] };
function sampleMark(): MarkPts {
  const run = (d: string, n: number) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    const total = el.getTotalLength();
    return Array.from({ length: n + 1 }, (_, i) => {
      const p = el.getPointAtLength((total * i) / n);
      return [p.x, p.y] as [number, number];
    });
  };
  const cap0 = run("M-48 390 C-75 390 -98 377 -98 362 C-98 352 -84 348 -70 348", 16);
  const ridge = run(PEAK_PLANES.ridge, 360);
  const cap1 = run("M980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 L-48 390", 24);
  /* the three summits, left to right: the highest point in each third */
  const tops = [[100, 450], [500, 720], [760, 900]].map(([a, b]) => {
    let best: [number, number] = [0, Infinity];
    for (const p of ridge) if (p[0] >= a && p[0] <= b && p[1] < best[1]) best = p;
    return best;
  });
  return { cap0, ridge, cap1, tops };
}

const pathOf = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";

function inside(pts: [number, number][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** A Gaussian blur of a row of numbers, NaN-free in and out. */
function smooth(v: Float64Array, sigma: number): Float64Array {
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  return v.map((_, i) => {
    let s = 0, n = 0;
    for (let j = -r; j <= r; j++) {
      const x = Math.min(v.length - 1, Math.max(0, i + j));
      s += v[x] * k[j + r]; n += k[j + r];
    }
    return s / n;
  });
}

/** Linear interpolation along a polyline sampled at x = 0.5, 1.5, ... */
const at = (v: Float64Array, x: number) => {
  const f = Math.min(v.length - 1, Math.max(0, x - 0.5));
  const i = Math.min(v.length - 2, Math.floor(f));
  return v[i] + (v[i + 1] - v[i]) * (f - i);
};

type Phase = "loading" | "failed" | "playing" | "paused";

export function ValleyFilm() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const markSvg = useRef<SVGSVGElement>(null);
  const markLine = useRef<SVGPolylineElement>(null);
  const markTip = useRef<SVGCircleElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const rim = useRef<SVGPathElement>(null);
  const rimSvg = useRef<SVGSVGElement>(null);
  const markFill = useRef<SVGPathElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const brand = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const renderer = useRef<ValleyRenderer | null>(null);
  const clock = useRef({ t: 0, last: 0, playing: false, hold: null as number | null, dirty: true });
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const rangeEl = useRef<HTMLInputElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const [clean, setClean] = useState(false);
  const [stats, setStats] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setClean(q.get("clean") === "1");
    const dprCap = Number(q.get("dpr")) || 1.25;
    const hold = q.get("t");
    if (hold !== null && !Number.isNaN(Number(hold))) clock.current.hold = Math.max(0, Math.min(END, Number(hold)));
    let disposed = false;
    let raf = 0;
    const mark = sampleMark();
    /* The ending's geometry, worked out once when the camera has come to
       rest: the hills' outline as the frame draws it, the shape it closes
       matched point for point to the mark's own, and how far the hole
       must open to clear the frame. */
    type Geo = {
      w: number; h: number;
      /** the outline, foot to foot, CSS pixels */
      line: [number, number][];
      /** the closed shape on the hills, point for point with the mark's
       *  outline (cap0, ridge, cap1), and both in their own frames: centred
       *  on their boxes and divided by their widths, so one can become the
       *  other while the frame flies */
      real: [number, number][];
      realN: [number, number][];
      markN: [number, number][];
      /** the real shape's centre and width on screen */
      frame: [number, number, number];
      anchor: [number, number];
      open: number;
      /** the wordmark's own mark: centre, and pixels per mark width, x and y */
      target: [number, number, number, number] | null;
    };
    let geo: Geo | null = null;
    const markPts = [...mark.cap0, ...mark.ridge, ...mark.cap1];
    const MARK_W = 1106; // the silhouette spans x -98 to 1008 (PEAK_SPAN)
    const markBox = (() => {
      const ys = markPts.map((p) => p[1]);
      return [455, (Math.min(...ys) + Math.max(...ys)) / 2] as [number, number];
    })();
    const measure = (r: ValleyRenderer, shot: Shot, w: number, h: number): Geo => {
      /* the outline, one value per CSS pixel column, blurred by two pixels:
         smooth, and still on the ridge to within a pixel */
      const raw = r.outline(shot, OUTLINE_M);
      const dpr = raw.length / w;
      const ys = new Float64Array(w);
      for (let x = 0; x < w; x++) {
        let sum = 0, n = 0;
        for (let c = Math.floor(x * dpr); c < Math.max(Math.floor(x * dpr) + 1, Math.floor((x + 1) * dpr)); c++) {
          const v = raw[Math.min(raw.length - 1, c)];
          if (Number.isFinite(v)) { sum += v; n++; }
        }
        ys[x] = n ? sum / n / dpr : NaN;
      }
      for (let x = 1; x < w; x++) if (!Number.isFinite(ys[x])) ys[x] = ys[x - 1];
      for (let x = w - 2; x >= 0; x--) if (!Number.isFinite(ys[x])) ys[x] = ys[x + 1];
      const sm = smooth(ys, 2);
      /* the three summits: the outline's highest point near where each
         hill's top projects */
      const tops = PEAKS.map((p) => {
        const [x, z] = toWorld(p.lat, p.lon);
        const px = Math.round(ValleyRenderer.project(shot, w, h, [x, r.ground(x, z), z])[0]);
        const R = Math.round(w * 0.04);
        let best = Math.min(w - 1, Math.max(0, px));
        for (let i = Math.max(0, px - R); i <= Math.min(w - 1, px + R); i++) if (sm[i] < sm[best]) best = i;
        return best;
      }).sort((a, b) => a - b);
      /* The feet: walking out from the outer summits, the last point where
         the outline was still falling faster than one pixel in twelve;
         past it is the plain, or the next hill rising. */
      const foot = (from: number, dir: number) => {
        let low = from;
        for (let i = from + dir; i >= 0 && i < w; i += dir) {
          if (sm[i] > sm[low] + 0.08 * Math.abs(i - low)) low = i;
          else if (sm[low] - sm[i] > h * 0.025) break;
        }
        return low;
      };
      const left = foot(tops[0], -1), right = foot(tops[2], 1);
      const line: [number, number][] = [];
      for (let x = left; x <= right; x++) line.push([x + 0.5, sm[x]]);
      const base = (x: number) => sm[left] + ((sm[right] - sm[left]) * (x - left - 0.5)) / Math.max(1, right - left);
      /* the mark's outline carried onto the real one: its ends to the feet,
         its three summits to the real three, and in between by x */
      const mk = [-70, mark.tops[0][0], mark.tops[1][0], mark.tops[2][0], 980];
      const rk = [left + 0.5, tops[0] + 0.5, tops[1] + 0.5, tops[2] + 0.5, right + 0.5];
      const mapX = (mx: number) => {
        if (mx <= mk[0]) return rk[0];
        if (mx >= mk[4]) return rk[4];
        let k = 0;
        while (k < 3 && mx > mk[k + 1]) k++;
        return rk[k] + ((rk[k + 1] - rk[k]) * (mx - mk[k])) / (mk[k + 1] - mk[k]);
      };
      const real: [number, number][] = [
        ...mark.cap0.map(() => [rk[0], sm[left]] as [number, number]),
        ...mark.ridge.map(([mx]) => { const x = mapX(mx); return [x, at(sm, x)] as [number, number]; }),
        ...mark.cap1.map(([mx, my]) => {
          if (my < 389) return [rk[4], sm[right]] as [number, number];
          const x = mapX(mx);
          return [x, base(x)] as [number, number];
        }),
      ];
      const top = Math.min(...real.map((p) => p[1])), bottom = Math.max(...real.map((p) => p[1]));
      const frame: Geo["frame"] = [(rk[0] + rk[4]) / 2, (top + bottom) / 2, rk[4] - rk[0]];
      const realN = real.map(([x, y]) => [(x - frame[0]) / frame[2], (y - frame[1]) / frame[2]] as [number, number]);
      const markN = markPts.map(([x, y]) => [(x - markBox[0]) / MARK_W, (y - markBox[1]) / MARK_W] as [number, number]);
      const brandMark = brand.current?.querySelector("svg") as SVGSVGElement | null;
      let target: Geo["target"] = null;
      if (brandMark) {
        const rect = brandMark.getBoundingClientRect(), vb = brandMark.viewBox.baseVal;
        const tax = rect.width / vb.width, tay = rect.height / vb.height;
        target = [rect.left + (markBox[0] - vb.x) * tax, rect.top + (markBox[1] - vb.y) * tay, MARK_W * tax, MARK_W * tay];
      }
      /* the way in opens about the middle of the hills: halfway between
         Middle Peak's summit and the line between the feet */
      const mx = tops[1] + 0.5;
      const anchor: [number, number] = [mx, (sm[tops[1]] + base(mx)) / 2];
      const probes: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]];
      let open = 1;
      while (open < 400 && !probes.every(([x, y]) => inside(real, anchor[0] + (x - anchor[0]) / open, anchor[1] + (y - anchor[1]) / open))) open *= 1.04;
      return { w, h, line, real, realN, markN, frame, anchor, open: open * 1.05, target };
    };
    /** The shape at a point of its flight: u = 0 on the hills, 1 in the corner. */
    const flying = (g: Geo, u: number): [number, number][] => {
      if (u <= 0 || !g.target) return g.real;
      /* It peels off quickly, easing in over the first tenth only, so it
         is clear of the hole before the photograph shows through, and
         lands gently. It becomes the mark as it shrinks, so it is the
         mark, and small, well before it lands. */
      const s = (u < 0.1 ? 5 * u * u : u - 0.05) / 0.95;
      const fly = 1 - Math.pow(1 - s, 3);
      const m = Math.min(1, Math.max(0, (fly - 0.05) / 0.8));
      const morph = m * m * (3 - 2 * m);
      const [tx, ty, tsx, tsy] = g.target;
      const cx = g.frame[0] + (tx - g.frame[0]) * fly, cy = g.frame[1] + (ty - g.frame[1]) * fly;
      const sx = Math.exp(Math.log(g.frame[2]) + (Math.log(tsx) - Math.log(g.frame[2])) * fly);
      const sy = Math.exp(Math.log(g.frame[2]) + (Math.log(tsy) - Math.log(g.frame[2])) * fly);
      return g.realN.map(([rx, ry], i) => {
        const [mx, my] = g.markN[i];
        return [cx + sx * (rx + (mx - rx) * morph), cy + sy * (ry + (my - ry) * morph)] as [number, number];
      });
    };

    const overlay = (r: ValleyRenderer, time: number, shot: Shot) => {
      const w = window.innerWidth, h = window.innerHeight;
      const svg = markSvg.current!, line = markLine.current!, tip = markTip.current!, logo = markFill.current!;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      if (time >= TRACE[0] && (!geo || geo.w !== w || geo.h !== h)) geo = measure(r, shot, w, h);
      if (time < TRACE[0]) geo = null;
      const brandMark = brand.current?.querySelector("svg") as SVGSVGElement | null;
      const nameEl = brand.current?.querySelector("span > span") as HTMLElement | null;
      const lifted = span(time, LIFT);
      if (brand.current) brand.current.style.opacity = time >= LIFT[0] ? "1" : "0";
      if (brandMark) brandMark.style.opacity = lifted >= 1 ? "1" : "0";
      if (nameEl) nameEl.style.opacity = String(easeOut(span(time, NAME)));
      const p = photo.current!, st = stage.current!;
      if (!geo) {
        svg.style.opacity = "0";
        p.style.opacity = "0";
        p.style.clipPath = "none";
        st.style.transform = "none";
      } else {
        const g = geo;
        /* the trace: the hills' outline, drawn from the left foot to the
           right, a bright point at the pen */
        const traced = easeInOut(span(time, TRACE));
        let len = 0;
        const acc = [0];
        for (let i = 1; i < g.line.length; i++) acc.push((len += Math.hypot(g.line[i][0] - g.line[i - 1][0], g.line[i][1] - g.line[i - 1][1])));
        line.setAttribute("points", g.line.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(2)}`).join(" "));
        line.style.strokeDasharray = `${len}`;
        line.style.strokeDashoffset = `${len * (1 - traced)}`;
        const filled = span(time, FILL);
        line.style.opacity = String(1 - filled);
        const at_ = len * traced;
        let k = 1;
        while (k < acc.length - 1 && acc[k] < at_) k++;
        const f = acc[k] > acc[k - 1] ? (at_ - acc[k - 1]) / (acc[k] - acc[k - 1]) : 0;
        tip.setAttribute("cx", (g.line[k - 1][0] + (g.line[k][0] - g.line[k - 1][0]) * f).toFixed(1));
        tip.setAttribute("cy", (g.line[k - 1][1] + (g.line[k][1] - g.line[k - 1][1]) * f).toFixed(2));
        tip.style.opacity = time > TRACE[0] && time < TRACE[1] ? String(Math.min(1, span(time, TRACE) * 8, (1 - span(time, TRACE)) * 8)) : "0";
        /* the shape, frosted glass on the hills, then flying to the corner,
           shrinking and becoming the mark */
        const d = pathOf(flying(g, lifted));
        const gl = glass.current!;
        gl.style.clipPath = `path('${d}')`;
        gl.style.opacity = lifted >= 1 ? "0" : String(filled);
        gl.style.backgroundColor = `rgba(255,255,255,${(0.07 + 0.93 * easeInOut(Math.min(1, lifted * 1.4))).toFixed(3)})`;
        /* a fine bright rim, so it reads as a made thing and not as mist */
        rimSvg.current!.setAttribute("viewBox", `0 0 ${w} ${h}`);
        rim.current!.setAttribute("d", d);
        rim.current!.style.opacity = lifted >= 1 ? "0" : String(filled * (1 - lifted));
        logo.setAttribute("d", d);
        logo.style.opacity = lifted > 0 && lifted < 1 ? String(0.28 * Math.sin(Math.PI * lifted)) : "0";
        svg.style.opacity = "1";
        /* the hole it leaves, with the photograph behind it, then the way in */
        const holed = span(time, HOLE);
        const entering = span(time, ENTER);
        const sc = Math.exp(easeInOut(entering) * Math.log(g.open));
        const [cx, cy] = g.anchor;
        p.style.opacity = String(easeOut(holed));
        p.style.clipPath = entering >= 1 ? "none" : `path('${pathOf(g.real.map(([x, y]) => [cx + (x - cx) * sc, cy + (y - cy) * sc]))}')`;
        st.style.transformOrigin = `${cx}px ${cy}px`;
        st.style.transform = entering > 0 ? `scale(${sc})` : "none";
        st.style.opacity = entering >= 1 ? "0" : "1";
      }
      p.style.filter = "none";
      p.style.transform = "none";
      const wd = easeOut(span(time, WORDS));
      const wEl = words.current!;
      wEl.style.opacity = String(wd);
      wEl.style.transform = `translateY(${(1 - wd) * 16}px)`;
    };

    (async () => {
      try {
        const meta = (await (await fetch(`${BASE}/dem.json`)).json()) as { inner: DemRect; outer: DemRect };
        const index = (await (await fetch(`${BASE}/imagery.json`)).json()) as { tiles: string[] };
        const [inner, outer, trees] = await Promise.all([
          loadDem(`${BASE}/dem-inner.png`, meta.inner),
          loadDem(`${BASE}/dem-outer.png`, meta.outer),
          fetch(`${BASE}/trees.bin`).then((res) => (res.ok ? res.arrayBuffer() : new ArrayBuffer(0))).then((b) => new Float32Array(b)),
        ]);
        if (disposed || !canvas.current) return;
        const r = new ValleyRenderer(canvas.current, inner, outer, index.tiles, BASE, lookFromQuery(q), q.get("trees") === "0" ? undefined : trees);
        if (q.get("clouds") === "0") r.clouds.coverage = 0;
        renderer.current = r;
        /* a gap in the cloud wherever the flight passes through the layer,
           so the camera comes down through clear air between clouds */
        const gaps: [number, number, number, number][] = [];
        for (let tt = 0; tt <= DURATION && gaps.length < 6; tt += 0.25) {
          const e = cameraAt(FLIGHT, tt).eye;
          if (e[1] < r.clouds.base - 200 || e[1] > r.clouds.top + 300) continue;
          if (gaps.every(([x, z]) => Math.hypot(e[0] - x, e[2] - z) > 900)) gaps.push([e[0], e[2], 1300, 1]);
        }
        r.setClearings(gaps);
        await r.prefetch((done, total) => setProgress(done / total));
        if (disposed) return;
        const c = clock.current;
        c.t = c.hold ?? 0;
        const start = performance.now();
        const size = () => {
          const el = canvas.current!;
          /* 1.25 device pixels per CSS pixel, with 4x multisampling: past
             that the frame rate halves and nobody can see the difference
             in a moving film. ?dpr=2 for stills. */
          const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
          const w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr);
          if (el.width !== w || el.height !== h) { el.width = w; el.height = h; c.dirty = true; }
          return w / h;
        };
        const ahead = (tt: number) => [0.5, 1.2, 2.2].map((d) => cameraAt(FLIGHT, Math.min(DURATION, tt + d)));
        /* hold the first frame until everything it shows is on the GPU, so
           the film never opens on a blur */
        const settle = () => {
          if (disposed) return;
          const aspect = size();
          const shot = cameraAt(FLIGHT, c.t);
          r.time = c.t;
          r.render(shot, ahead(c.t));
          if (r.settled(shot, aspect) || performance.now() - start > 20000) {
            r.render(shot, []);
            overlay(r, c.t, shot);
            document.documentElement.dataset.filmReady = "1";
            if (c.hold === null) { c.playing = true; setPhase("playing"); } else setPhase("paused");
            c.last = performance.now();
            raf = requestAnimationFrame(loop);
          } else raf = requestAnimationFrame(settle);
        };
        let frames = 0, fpsT = performance.now();
        let held = false, lastOverlay = "";
        const loop = (now: number) => {
          if (disposed) return;
          const dt = Math.min(0.1, (now - c.last) / 1000);
          c.last = now;
          if (c.playing) {
            c.t = Math.min(END, c.t + dt);
            if (c.t >= END) { c.playing = false; setPhase("paused"); setEnded(true); }
            c.dirty = true;
          }
          const aspect = size();
          const shot = cameraAt(FLIGHT, c.t);
          r.time = c.t;
          /* The camera is at rest from DURATION on. Its frame is drawn until
             every tile in it has arrived, then held, and the GPU is left to
             the ending's glass and window. */
          const atRest = c.t >= DURATION;
          if (!atRest) held = false;
          if (c.dirty && !held) {
            const info = r.render(shot, ahead(c.t));
            if (atRest && info.inflight === 0 && r.settled(shot, aspect)) held = true;
            c.dirty = atRest ? !held : c.playing || info.inflight > 0;
            frames++;
            if (now - fpsT > 1000) {
              setStats(`${Math.round((frames * 1000) / (now - fpsT))} fps, ${info.tiles} tiles`);
              frames = 0; fpsT = now;
            }
          }
          const key = `${c.t}|${window.innerWidth}|${window.innerHeight}`;
          if (key !== lastOverlay) { overlay(r, c.t, shot); lastOverlay = key; }
          /* the strip's clock, written straight to the page: a React render
             sixty times a second for one number is not worth it */
          if (rangeEl.current) rangeEl.current.value = String(c.t);
          if (timeEl.current) timeEl.current.textContent = `${c.t.toFixed(1)}s`;
          raf = requestAnimationFrame(loop);
        };
        /* ?record=1: no clock at all. A script asks for each frame by time
           and gets it back only when every tile in it has arrived, which is
           how scripts/dev/valley-film-video.mjs renders the film to video.
           With samples > 1 the frame is that many moments across `shutter`
           seconds, averaged (ValleyRenderer.renderAveraged). */
        if (q.get("record") === "1") {
          const w = window as unknown as { filmFrame?: (tt: number, samples?: number, shutter?: number) => Promise<void>; filmEnd?: number };
          w.filmEnd = END;
          w.filmFrame = async (tt: number, samples = 1, shutter = 0) => {
            c.t = tt;
            c.playing = false;
            const aspect = size();
            const shot = cameraAt(FLIGHT, tt);
            const moments = Array.from({ length: samples }, (_, i) => {
              const ts = Math.min(END, Math.max(0, tt + ((i + 0.5) / samples - 0.5) * shutter));
              return { shot: cameraAt(FLIGHT, ts), time: ts };
            });
            r.time = tt;
            for (let i = 0; i < 900; i++) {
              const info = r.render(shot, [...moments.map((m) => m.shot), ...ahead(tt)]);
              if (info.inflight === 0 && moments.every((m) => r.settled(m.shot, aspect))) break;
              await new Promise((ok) => requestAnimationFrame(ok));
            }
            if (samples > 1) r.renderAveraged(moments);
            overlay(r, tt, shot);
            await new Promise((ok) => requestAnimationFrame(ok));
          };
          document.documentElement.dataset.filmReady = "1";
          setPhase("paused");
          return;
        }
        raf = requestAnimationFrame(settle);
      } catch (e) {
        if (disposed) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("failed");
      }
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.current?.dispose();
      renderer.current = null;
      delete document.documentElement.dataset.filmReady;
    };
  }, []);

  const replay = useCallback(() => {
    const c = clock.current;
    c.t = 0; c.playing = true; c.dirty = true; c.last = performance.now();
    setPhase("playing");
    setEnded(false);
  }, []);
  const toggle = useCallback(() => {
    const c = clock.current;
    if (c.t >= END) { replay(); return; }
    c.playing = !c.playing; c.dirty = true; c.last = performance.now();
    setPhase(c.playing ? "playing" : "paused");
  }, [replay]);
  const scrub = useCallback((v: number) => {
    const c = clock.current;
    c.t = v; c.playing = false; c.dirty = true;
    setPhase("paused");
    setEnded(v >= END);
  }, []);

  return (
    <div className="vf-root">
      <div ref={stage} className="vf-stage">
        <canvas ref={canvas} className="vf-canvas" />
      </div>

      {/* The landing page, laid out with the hero's own classes
          (src/components/landing/landing-hero.tsx) so the last frame is
          the page as it ships. */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden" style={{ pointerEvents: "none" }}>
        <div ref={photo} className="absolute inset-0 z-0" style={{ opacity: 0 }}>
          <Image src={HERO_IMAGE_SRC} alt="" fill priority placeholder="blur" blurDataURL={HERO_IMAGE_BLUR} className="object-cover" sizes="100vw" draggable={false} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-40" style={{ backgroundImage: "linear-gradient(180deg, rgba(20,30,22,0.34), rgba(20,30,22,0.16) 45%, transparent)" }} />
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "linear-gradient(180deg, transparent 54%, rgba(20,30,22,0.36))" }} />
        </div>
        <div ref={brand} className="relative z-10 px-8 pt-7 lg:px-16" style={{ opacity: 0, filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}>
          <Wordmark markClassName="text-white" textClassName="block text-white" />
        </div>
        <div className="relative z-10 flex flex-1 items-center">
          <div className="w-full -translate-y-[20px] px-8 sm:-translate-y-[26px] lg:-translate-y-[33px] lg:px-16">
            <div className="lg:grid lg:grid-cols-[88px_1fr] lg:gap-x-2.5">
              <div ref={words} className="lg:col-start-2" style={{ opacity: 0 }}>
                <h1 className="font-heading text-4xl font-bold tracking-[-0.03em] text-white drop-shadow-lg sm:text-5xl lg:text-6xl lg:whitespace-nowrap">
                  Welcome back to the valley.
                </h1>
                <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-white/90 drop-shadow-md sm:text-lg lg:max-w-none lg:whitespace-nowrap">
                  A space for the Rishi Valley community to stay connected.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-[15px] font-semibold text-[#23241E] shadow-md">
                    Join the community
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full border border-white/55 bg-white/10 px-6 py-2.5 text-[15px] font-semibold text-white backdrop-blur-sm">
                    Sign in
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* the mark, traced off the real ridge and flown to the corner */}
      <div ref={glass} className="vf-glass" aria-hidden />
      <svg ref={rimSvg} className="vf-rim" aria-hidden>
        <path ref={rim} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth={1.4} strokeLinejoin="round" style={{ opacity: 0 }} />
      </svg>
      <svg ref={markSvg} className="vf-mark" aria-hidden>
        <polyline ref={markLine} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.6))" }} />
        <circle ref={markTip} r={3.2} fill="#fff" style={{ opacity: 0, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.95)) drop-shadow(0 0 14px rgba(255,255,255,0.6))" }} />
        <path ref={markFill} fill="#0c120e" style={{ opacity: 0, filter: "blur(10px)", transform: "translateY(7px)" }} />
      </svg>

      {phase === "loading" && (
        <div className="vf-loading">
          <span>Fetching the valley</span>
          <span className="vf-bar"><span style={{ transform: `scaleX(${progress})` }} /></span>
        </div>
      )}
      {phase === "failed" && (
        <div className="vf-loading">
          <span>{error.includes("404") || error.includes("JSON") ? "The valley's ground is not on this machine yet. Run: node scripts/dev/valley-film.mjs" : error}</span>
        </div>
      )}

      {!clean && (
        <div className="vf-strip">
          <button type="button" onClick={toggle} className="vf-btn">{phase === "playing" ? "Pause" : ended ? "Play again" : "Play"}</button>
          <input ref={rangeEl} type="range" min={0} max={END} step={0.01} defaultValue={0} onChange={(e) => scrub(Number(e.target.value))} aria-label="Scrub the film" />
          <span ref={timeEl} className="vf-time">0.0s</span>
          <span className="vf-stats">{stats}</span>
          <Link href="/lab" className="vf-btn">Lab</Link>
        </div>
      )}
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.vf-root { position:fixed; inset:0; background:#0c0f0d; overflow:hidden; }
.vf-stage { position:absolute; inset:0; will-change:transform; }
.vf-canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.vf-mark { position:absolute; inset:0; width:100%; height:100%; z-index:5; pointer-events:none; }
.vf-glass { position:absolute; inset:0; z-index:6; pointer-events:none; opacity:0; -webkit-backdrop-filter:blur(12px) brightness(1.14) saturate(1.2); backdrop-filter:blur(12px) brightness(1.14) saturate(1.2); }
.vf-rim { position:absolute; inset:0; width:100%; height:100%; z-index:7; pointer-events:none; }
.vf-loading { position:absolute; inset:0; z-index:6; display:grid; place-content:center; justify-items:center; gap:14px; color:rgba(240,236,226,.78); font-size:14px; letter-spacing:.02em; text-align:center; padding:24px; background:#0c0f0d; }
.vf-bar { width:180px; height:2px; background:rgba(240,236,226,.16); border-radius:2px; overflow:hidden; }
.vf-bar > span { display:block; height:100%; background:rgba(240,236,226,.8); transform-origin:left; transition:transform .2s linear; }
.vf-strip { position:absolute; left:50%; bottom:18px; transform:translateX(-50%); z-index:7; display:flex; align-items:center; gap:12px; padding:8px 12px; border-radius:999px;
  background:rgba(14,18,16,.55); backdrop-filter:blur(10px); color:rgba(240,236,226,.9); font-size:12.5px; width:min(620px, calc(100vw - 24px)); }
.vf-strip input { flex:1; accent-color:#eaf1df; min-width:60px; }
.vf-btn { border:0; background:rgba(240,236,226,.12); color:inherit; border-radius:999px; padding:6px 12px; font:inherit; cursor:pointer; text-decoration:none; transition:background-color .15s; }
.vf-btn:hover { background:rgba(240,236,226,.22); }
.vf-btn:focus-visible { outline:2px solid #eaf1df; outline-offset:2px; }
.vf-btn:active { transform:scale(.97); }
.vf-time { font-variant-numeric:tabular-nums; width:40px; }
.vf-stats { opacity:.55; white-space:nowrap; }
@media (max-width:640px) { .vf-stats { display:none; } }
`;
