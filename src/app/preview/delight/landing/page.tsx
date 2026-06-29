"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DelightShell, SpringPress, FadeRise, Stagger, staggerChild, motion, PeaksMark, useValleyMotion } from "../_kit";

/* ------------------------------------------------------------------ *
 *  Living-valley landing demo: a hand-rolled leaf canvas the cursor
 *  parts, scroll-speed breeze, parallax ridges, sunlight, a settling
 *  headline, and a bird that hops the screenshots. All ambient motion
 *  freezes under reduced motion and pauses on a hidden tab.
 * ------------------------------------------------------------------ */

const LEAF_COLORS = ["#4F9E6B", "#6E8B6B", "#7Fae84", "#C26B39", "#C89B5A"];

type Leaf = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; sway: number; swaySpeed: number; phase: number; color: string; held: number };

function LeafCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { reduced } = useValleyMotion();
  const pointer = useRef({ x: -9999, y: -9999, sx: -9999, sy: -9999, active: false });
  const scrollVel = useRef(0);
  const lastScroll = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement as HTMLElement;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const leaves: Leaf[] = [];

    function resize() {
      w = host.clientWidth; h = host.clientHeight;
      canvas!.width = w * dpr; canvas!.height = h * dpr;
      canvas!.style.width = w + "px"; canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const COUNT = Math.max(16, Math.min(34, Math.round(w / 42)));
    const spawn = (atTop: boolean): Leaf => ({
      x: Math.random() * w,
      y: atTop ? -20 - Math.random() * h : Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: 0.35 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.02,
      size: 7 + Math.random() * 8,
      sway: 14 + Math.random() * 20,
      swaySpeed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      color: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
      held: 0,
    });
    for (let i = 0; i < COUNT; i++) leaves.push(spawn(false));

    function drawLeaf(l: Leaf) {
      ctx!.save();
      ctx!.translate(l.x, l.y);
      ctx!.rotate(l.rot);
      ctx!.globalAlpha = 0.82;
      ctx!.fillStyle = l.color;
      ctx!.beginPath();
      ctx!.moveTo(0, -l.size);
      ctx!.quadraticCurveTo(l.size * 0.75, -l.size * 0.15, 0, l.size);
      ctx!.quadraticCurveTo(-l.size * 0.75, -l.size * 0.15, 0, -l.size);
      ctx!.fill();
      ctx!.globalAlpha = 0.5;
      ctx!.strokeStyle = "rgba(30,40,30,0.25)";
      ctx!.lineWidth = 0.8;
      ctx!.beginPath(); ctx!.moveTo(0, -l.size * 0.8); ctx!.lineTo(0, l.size * 0.8); ctx!.stroke();
      ctx!.restore();
    }

    // reduced motion: one calm static frame, no loop
    if (reduced) {
      ctx.clearRect(0, 0, w, h);
      for (const l of leaves) drawLeaf(l);
      return () => ro.disconnect();
    }

    let raf = 0;
    let t = 0;
    function frame() {
      t += 1 / 60;
      // lerp the pointer so wild moves never jitter the field
      const p = pointer.current;
      p.sx += (p.x - p.sx) * 0.12;
      p.sy += (p.y - p.sy) * 0.12;
      scrollVel.current *= 0.9; // breeze decays

      ctx!.clearRect(0, 0, w, h);
      for (const l of leaves) {
        // drift + sway + breeze
        l.x += l.vx + Math.sin(t * l.swaySpeed + l.phase) * (l.sway / 120) + scrollVel.current * 0.04;
        l.y += l.vy;
        l.rot += l.vr + scrollVel.current * 0.0008;
        // cursor parts the leaves (inverse-square falloff on the smoothed pointer)
        if (p.active) {
          const dx = l.x - p.sx, dy = l.y - p.sy;
          const d2 = dx * dx + dy * dy;
          const R = 110;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R);
            l.x += (dx / d) * f * f * 9;
            l.y += (dy / d) * f * f * 9;
          }
        }
        if (l.held > 0) { l.held -= 1 / 60; l.x += l.vx * 6; l.y += l.vy * 6; l.vy += 0.15; }
        // wrap
        if (l.y > h + 24) Object.assign(l, spawn(true));
        if (l.x < -30) l.x = w + 28; else if (l.x > w + 30) l.x = -28;
        drawLeaf(l);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onMove = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left;
      pointer.current.y = e.clientY - r.top;
      pointer.current.active = true;
    };
    const onLeave = () => { pointer.current.active = false; };
    const onDown = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      // flick: eject the nearest leaf
      let best: Leaf | null = null, bd = 1e9;
      for (const l of leaves) { const dx = l.x - px, dy = l.y - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = l; } }
      if (best && bd < 60 * 60) { best.vx = (best.x - px) * 0.06 + (Math.random() - 0.5); best.vy = -3 - Math.random() * 2; best.held = 0.7; }
    };
    const onScroll = () => {
      const y = window.scrollY;
      scrollVel.current = Math.max(-30, Math.min(30, scrollVel.current + (y - lastScroll.current)));
      lastScroll.current = y;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  return <canvas ref={ref} className="dll-canvas" aria-hidden />;
}

function FreeBird({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M6 19 L1.5 16.5 L3.5 21.5 Z" fill="#2C2A28" opacity="0.92" />
      <path d="M5.5 19 C5.5 13.5 10 10 16 10 C22 10 26 13.3 26 18.3 C26 23 21.8 25.6 16 25.6 C10 25.6 5.5 23.5 5.5 19 Z" fill="#2C2A28" />
      <path d="M15.5 10 L14.5 4 L17 8 L18.5 3 L20 8 L21.5 5 L21 10 Z" fill="#2C2A28" />
      <path d="M25 16.4 L30.5 17.6 L25 19.4 Z" fill="#2C2A28" />
      <circle cx="20.3" cy="16" r="1.4" fill="#F6F2E8" />
    </svg>
  );
}

function HoppingBird() {
  const { reduced } = useValleyMotion();
  const wrap = useRef<HTMLDivElement | null>(null);
  const [perch, setPerch] = useState(0);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    if (reduced) return () => ro.disconnect();
    const iv = setInterval(() => setPerch((p) => (p + 1) % 3), 2400);
    return () => { ro.disconnect(); clearInterval(iv); };
  }, [reduced]);
  const fracs = [0.12, 0.5, 0.84];
  const x = fracs[perch] * width;
  const dir = fracs[perch] >= fracs[(perch + 2) % 3] ? 1 : -1;
  return (
    <div className="dll-perchrow" ref={wrap}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="dll-shot">
          <div className="dll-shot-bar" />
          <div className="dll-shot-body" />
        </div>
      ))}
      <motion.div
        className="dll-bird"
        animate={{ x, y: [0, -22, 0], scaleX: dir }}
        transition={{ x: { type: "spring", stiffness: 120, damping: 16 }, y: { duration: 0.65, ease: "easeOut" }, scaleX: { duration: 0.2 } }}
      >
        <FreeBird />
      </motion.div>
    </div>
  );
}

export default function LandingDemo() {
  const { reduced } = useValleyMotion();
  const [wash, setWash] = useState(false);
  return (
    <DelightShell
      title="The living valley"
      lede="The landing page should feel like the place: leaves drifting, the cursor parting them, the ridge breathing behind, a bird hopping the screenshots. Move your mouse over the hero, click a leaf to flick it, and scroll to feel the breeze."
      css={CSS}
    >
      {/* hero */}
      <section
        className="dll-hero"
        onMouseEnter={() => setWash(true)}
        onMouseLeave={() => setWash(false)}
      >
        <div className="dll-sky parallax" />
        <div className={`dll-shafts ambient${reduced ? " still" : ""}`} />
        {/* parallax ridges */}
        <div className="dll-ridges">
          <motion.div className="dll-ridge r3 parallax" style={{ color: "#cdd9c4" }} animate={reduced ? {} : { y: [0, -4, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>
            <PeaksMark size={150} variant="solid" />
          </motion.div>
          <motion.div className="dll-ridge r2 parallax" style={{ color: "#9bb59a" }} animate={reduced ? {} : { y: [0, -7, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
            <PeaksMark size={170} variant="solid" />
          </motion.div>
          <div className="dll-ridge r1" style={{ color: "#5b7e63" }}>
            <PeaksMark size={196} variant="solid" />
          </div>
        </div>

        <LeafCanvas />

        <div className={`dll-wash${wash ? " on" : ""}`} />

        <div className="dll-herocopy">
          <Stagger gap={0.08}>
            <motion.div variants={staggerChild}><span className="dll-eyebrow">Rishi Valley Alumni</span></motion.div>
            <motion.h2 variants={staggerChild} className="v2-display">Come back to the valley.</motion.h2>
            <motion.p variants={staggerChild}>Find the people you grew up under the same trees with. Share a sighting, write a letter, climb Rishi Konda again.</motion.p>
            <motion.div variants={staggerChild} className="dll-cta">
              <SpringPress className="v2-btn v2-btn-primary">Request an invite</SpringPress>
              <SpringPress className="v2-btn v2-btn-ghost">Sign in</SpringPress>
            </motion.div>
          </Stagger>
        </div>

        <motion.div className="dll-scrollcue" animate={reduced ? {} : { y: [0, 7, 0] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}>
          <ChevronDown size={22} />
        </motion.div>
      </section>

      {/* leaf divider */}
      <div className="dll-divider"><span /><FadeRise><em className="v2-display">A few of the things you can do</em></FadeRise><span /></div>

      {/* screenshots strip with the hopping bird */}
      <FadeRise>
        <section className="dll-strip v2-card">
          <HoppingBird />
          <p className="dll-stripnote">A bird hops between the screenshots while you read. In the real hero these are live shots of the feed, the directory, and a letter.</p>
        </section>
      </FadeRise>

      {/* spacer so the page scrolls and the breeze + parallax are felt */}
      <div className="dll-scrollspace">
        <FadeRise><p>Scroll back up and drag your cursor through the leaves. They part around you and settle again, and a quick scroll leans the whole field like a gust.</p></FadeRise>
      </div>
    </DelightShell>
  );
}

const CSS = `
.dll-hero { position:relative; height:560px; border-radius:var(--r-card); overflow:hidden; margin-bottom:30px;
  background:linear-gradient(180deg, #dfe7d6 0%, #eae3d4 64%, var(--bg) 100%); }
.delight.dark .dll-hero { background:linear-gradient(180deg, #12211c 0%, #101a18 60%, var(--bg) 100%); }
.dll-sky { position:absolute; inset:0; background:radial-gradient(80% 60% at 70% 8%, rgba(255,238,205,.5), transparent 60%); }
.delight.dark .dll-sky { background:radial-gradient(80% 60% at 70% 8%, rgba(120,150,130,.18), transparent 60%); }
.dll-shafts { position:absolute; inset:0; pointer-events:none; opacity:.5;
  background:linear-gradient(108deg, transparent 38%, rgba(255,244,214,.5) 42%, transparent 46%, transparent 60%, rgba(255,244,214,.36) 64%, transparent 68%);
  animation:dllshaft 9s ease-in-out infinite; }
.dll-shafts.still { animation:none; }
@keyframes dllshaft { 0%,100%{opacity:.32} 50%{opacity:.6} }
.dll-ridges { position:absolute; left:0; right:0; bottom:0; height:230px; pointer-events:none; }
.dll-ridge { position:absolute; bottom:-6px; left:50%; transform:translateX(-50%); display:flex; justify-content:center; }
.dll-ridge.r1 { bottom:-14px; } .dll-ridge.r2 { bottom:8px; opacity:.92; } .dll-ridge.r3 { bottom:26px; opacity:.8; }
.dll-canvas { position:absolute; inset:0; z-index:2; }
.dll-wash { position:absolute; inset:0; z-index:3; pointer-events:none; background:linear-gradient(180deg, rgba(20,30,22,0), rgba(20,30,22,.16)); opacity:0; transition:opacity .7s ease; }
.dll-wash.on { opacity:1; }
.dll-herocopy { position:absolute; z-index:4; left:0; right:0; top:78px; text-align:center; padding:0 24px; pointer-events:none; }
.dll-herocopy > div { pointer-events:auto; }
.dll-eyebrow { font-size:11px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--cinnamon); }
.dll-herocopy h2 { font-size:46px; margin:10px 0 12px; line-height:1.02; color:#1d2a20; }
.delight.dark .dll-herocopy h2 { color:#eaf2ec; }
.dll-herocopy p { max-width:46ch; margin:0 auto; font-size:15.5px; line-height:1.6; color:#2c3a2e; }
.delight.dark .dll-herocopy p { color:#c5d2c6; }
.dll-cta { display:flex; gap:10px; justify-content:center; margin-top:20px; }
.dll-scrollcue { position:absolute; z-index:4; bottom:18px; left:50%; transform:translateX(-50%); color:#3c5340; opacity:.8; }
.delight.dark .dll-scrollcue { color:#9db5a2; }

.dll-divider { display:flex; align-items:center; gap:16px; margin:8px 4px 22px; }
.dll-divider span { flex:1; height:1px; background:var(--border); }
.dll-divider em { font-style:italic; font-size:15px; color:var(--ink-soft); }

.dll-strip { position:relative; padding:26px 24px 22px; overflow:hidden; }
.dll-perchrow { position:relative; display:flex; gap:18px; justify-content:center; padding-top:14px; }
.dll-shot { width:30%; max-width:240px; height:150px; border-radius:14px; border:1px solid var(--border); background:var(--surface-2); overflow:hidden; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); }
.dll-shot-bar { height:34px; background:color-mix(in srgb, var(--sidebar) 88%, transparent); }
.dll-shot-body { height:calc(100% - 34px); background:repeating-linear-gradient(180deg, transparent 0 22px, var(--border) 22px 23px); opacity:.5; }
.dll-bird { position:absolute; top:6px; left:0; z-index:3; }
.dll-stripnote { margin:16px auto 0; max-width:60ch; text-align:center; font-size:12.5px; color:var(--ink-soft); }

.dll-scrollspace { padding:30px 6px 60px; text-align:center; }
.dll-scrollspace p { max-width:60ch; margin:0 auto; color:var(--ink-soft); font-size:14px; line-height:1.6; }

@media (max-width:760px){ .dll-herocopy h2{ font-size:34px;} .dll-hero{ height:480px;} }
`;
