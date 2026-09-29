"use client";

/* ------------------------------------------------------------------ *
 *  Concept: The Living Valley — atmosphere-led.
 *
 *  A fixed, full-viewport terrain (sky wash + three ridgeline bands,
 *  echoing PeaksMark) sits behind the entire page and drifts a slow
 *  parallax as you scroll; a cool morning sky cross-fades into a warm
 *  dusk one by the time you reach the footer, so the valley itself
 *  seems to live through a day as you travel through its story. Leaves
 *  drift in a layer BEHIND the content (z below every section), so they
 *  show only in the open ground between sections and vanish under a
 *  card's own surface — exactly the "behind content" rule. The five
 *  features hang off one trail rail, each a numbered waypoint; their
 *  screenshots sit in a carved two-tone "vista" frame with a mossy
 *  leaf sprig in the corner and, on a few, a small perched bird.
 *
 *  Every string comes from ./_shared (HERO, INTRO, FEATURES, TRUST,
 *  FOOTER, NAV). SectionReveal, PeaksMark/Wordmark and BirdAvatar are
 *  imported read-only; the terrain, leaf-drift and bird glyphs are
 *  self-contained here.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import Link from "@/components/common/link";
import { useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { PeaksMark, Wordmark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { SectionReveal } from "@/components/landing/section-reveal";
import { SHOTS, NAV, HERO, INTRO, FEATURES, TRUST, FOOTER, HERO_IMAGE_SRC, HERO_IMAGE_BLUR, type Accent } from "./_shared";

/* ------------------------------------------------------------------ *
 *  Terrain — fixed background world. Two full sky scenes (cool morning,
 *  warm dusk) are stacked; the dusk one fades in by scroll fraction of
 *  the whole document. Three ridgeline bands drift at different rates
 *  (translateY, small clamped ranges) for depth; their edges are run
 *  through an SVG feTurbulence displacement so the ridgeline reads as
 *  an uneven, weathered edge rather than a smooth vector bezier, and a
 *  real valley photograph sits beneath them at low opacity + multiply
 *  blend so the fill picks up actual foliage grain instead of a flat
 *  poster-paint green. A faint SVG-turbulence grain sits on top for
 *  texture. transform + opacity only.
 * ------------------------------------------------------------------ */
function TerrainField() {
  const duskRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const t = Math.min(1, Math.max(0, window.scrollY / max));
      if (duskRef.current) duskRef.current.style.opacity = String(t);
      if (farRef.current) farRef.current.style.transform = `translateY(${t * 16}px)`;
      if (midRef.current) midRef.current.style.transform = `translateY(${t * 30}px)`;
      if (nearRef.current) nearRef.current.style.transform = `translateY(${t * 46}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden">
      {/* base: cool morning valley */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #DCEEE0 0%, #E7E7D6 34%, #EDE7D8 58%, var(--color-paper) 82%, var(--color-paper) 100%)",
        }}
      />
      {/* dusk overlay: fades in as the page scrolls, so the valley's light
          warms as the visitor travels further into the story */}
      <div
        ref={duskRef}
        className="absolute inset-0 opacity-0"
        style={{
          background:
            "linear-gradient(180deg, #F6DFC2 0%, #F0D3AC 28%, #E9DCC0 55%, var(--color-paper) 85%, var(--color-paper) 100%)",
        }}
      />
      {/* real valley photograph, desaturated and pushed toward the sage
          family, sitting under the ridge fills so their color picks up
          actual foliage grain rather than a flat vector tone. Faded out
          before the paper ground so it never reads as a literal photo. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[52%] overflow-hidden opacity-[0.3] mix-blend-multiply"
        style={{
          maskImage: "linear-gradient(180deg, black 0%, black 55%, transparent 96%)",
          WebkitMaskImage: "linear-gradient(180deg, black 0%, black 55%, transparent 96%)",
        }}
      >
        <Image
          src={HERO_IMAGE_SRC}
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL={HERO_IMAGE_BLUR}
          sizes="100vw"
          className="object-cover scale-[1.35]"
          style={{
            objectPosition: "12% 88%",
            filter: "blur(3px) grayscale(0.45) sepia(0.3) hue-rotate(52deg) saturate(1.7) brightness(1.16) contrast(0.9)",
          }}
        />
      </div>
      <div ref={farRef} className="absolute inset-x-0 top-[4%] will-change-transform">
        <RidgeBand tint="#CCD8C2" tintDeep="#B9CBB0" opacity={0.58} amplitude={0.5} seed={2} />
      </div>
      <div ref={midRef} className="absolute inset-x-0 top-[13%] will-change-transform">
        <RidgeBand tint="#9DAD8F" tintDeep="#87A17E" opacity={0.5} amplitude={0.75} seed={7} />
      </div>
      <div ref={nearRef} className="absolute inset-x-0 top-[23%] will-change-transform">
        <RidgeBand tint="#4B6350" tintDeep="#3C5642" opacity={0.36} amplitude={1} seed={13} />
      </div>
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-multiply" aria-hidden>
        <filter id="lv-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#lv-grain)" />
      </svg>
      {/* soft vignette so content stays legible against the brightest sky band */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 50% 0%, transparent 45%, rgba(35,36,30,0.05) 100%)" }}
      />
    </div>
  );
}

function RidgeBand({
  tint,
  tintDeep,
  opacity,
  amplitude,
  seed,
}: {
  tint: string;
  tintDeep: string;
  opacity: number;
  amplitude: number;
  seed: number;
}) {
  const h = 220;
  const p = 40 * amplitude;
  const d = `M0 ${h} L0 ${h - 54} C 130 ${h - 54 - p} 230 ${h - 18} 350 ${h - 62 - p * 0.6} C 470 ${h - 96 - p} 570 ${h - 26} 690 ${h - 70 - p} C 810 ${h - 112 - p * 1.1} 910 ${h - 34} 1030 ${h - 78 - p * 0.8} C 1150 ${h - 122 - p} 1270 ${h - 42} 1440 ${h - 78 - p} L1440 ${h} Z`;
  const filterId = `lv-organic-${seed}`;
  const gradId = `lv-grad-${seed}`;
  return (
    <svg
      viewBox={`0 0 1440 ${h}`}
      preserveAspectRatio="none"
      className="h-[24vh] max-h-[300px] min-h-[130px] w-full"
      aria-hidden
    >
      <defs>
        {/* wobbles the ridgeline's own path so its silhouette reads as an
            uneven, weathered edge instead of a mathematically smooth
            vector bezier — the "flat illustration" tell. */}
        <filter id={filterId} x="-10%" y="-60%" width="120%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.05" numOctaves="2" seed={seed} result="lv-noise" />
          <feDisplacementMap in="SourceGraphic" in2="lv-noise" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* two-tone diagonal wash rather than one flat fill, so the band
            reads as dappled light across a slope, not a poster color. */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor={tint} />
          <stop offset="48%" stopColor={tintDeep} />
          <stop offset="100%" stopColor={tint} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${gradId})`} opacity={opacity} filter={`url(#${filterId})`} />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 *  Leaf drift — a fixed layer BEHIND every section (z below the main
 *  content wrapper), so a leaf reads as passing behind a clearing's own
 *  surface and only shows in the open ground between sections. Pure CSS
 *  keyframe animation (transform only): an outer span falls top to
 *  bottom, an inner span sways side to side, so the two transforms never
 *  fight over one property. Config is a fixed, hand-placed array (no
 *  Math.random) so server and client render identically.
 * ------------------------------------------------------------------ */
type LeafShape = "round" | "slim" | "blade";
const LEAVES: { left: number; size: number; duration: number; delay: number; sway: number; swayDur: number; shape: LeafShape; tint: string }[] = [
  { left: 3, size: 20, duration: 30, delay: -4, sway: 12, swayDur: 4.6, shape: "round", tint: "var(--color-leaf-light)" },
  { left: 11, size: 15, duration: 38, delay: -22, sway: 9, swayDur: 5.4, shape: "slim", tint: "var(--color-cinnamon)" },
  { left: 19, size: 24, duration: 26, delay: -11, sway: 16, swayDur: 4.1, shape: "blade", tint: "#EDB730" },
  { left: 27, size: 17, duration: 34, delay: -29, sway: 10, swayDur: 5.9, shape: "round", tint: "var(--color-leaf)" },
  { left: 37, size: 21, duration: 29, delay: -6, sway: 14, swayDur: 4.9, shape: "slim", tint: "#DB8A2A" },
  { left: 46, size: 16, duration: 40, delay: -33, sway: 8, swayDur: 6.3, shape: "round", tint: "var(--color-leaf-light)" },
  { left: 55, size: 22, duration: 27, delay: -14, sway: 15, swayDur: 4.3, shape: "blade", tint: "var(--color-cinnamon)" },
  { left: 63, size: 18, duration: 33, delay: -2, sway: 11, swayDur: 5.6, shape: "slim", tint: "#F2C94C" },
  { left: 71, size: 25, duration: 24, delay: -18, sway: 17, swayDur: 3.9, shape: "round", tint: "var(--color-leaf)" },
  { left: 79, size: 15, duration: 37, delay: -26, sway: 9, swayDur: 5.2, shape: "blade", tint: "#E0672A" },
  { left: 87, size: 20, duration: 31, delay: -9, sway: 13, swayDur: 4.7, shape: "slim", tint: "var(--color-leaf-light)" },
  { left: 94, size: 17, duration: 35, delay: -37, sway: 10, swayDur: 5.8, shape: "round", tint: "#EDB730" },
];

function LeafGlyph({ shape, size, tint }: { shape: LeafShape; size: number; tint: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: tint }} className="block opacity-80">
      {shape === "round" && <path d="M12 3c5.5 0 8.5 3.8 8.5 9s-3 9-8.5 9-8.5-3.8-8.5-9 3-9 8.5-9Z" fill="currentColor" />}
      {shape === "slim" && <path d="M12 2c3.4 4 3.4 16 0 20-3.4-4-3.4-16 0-20Z" fill="currentColor" />}
      {shape === "blade" && <path d="M20 4C10 4 4 10 4 20c0 0 6-1 10-5s6-11 6-11Z" fill="currentColor" />}
    </svg>
  );
}

function LeafDrift() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[4] overflow-hidden">
      <style>{`
        @keyframes lv-fall { 0% { transform: translateY(-14vh); } 100% { transform: translateY(116vh); } }
        @keyframes lv-sway {
          0%, 100% { transform: translateX(calc(var(--sway, 10px) * -1)) rotate(-9deg); }
          50% { transform: translateX(var(--sway, 10px)) rotate(11deg); }
        }
        @keyframes lv-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
      {LEAVES.map((leaf, i) => (
        <span
          key={i}
          className="absolute top-0 will-change-transform"
          style={{ left: `${leaf.left}%`, animation: `lv-fall ${leaf.duration}s linear ${leaf.delay}s infinite` }}
        >
          <span
            className="block will-change-transform"
            style={{ ["--sway" as string]: `${leaf.sway}px`, animation: `lv-sway ${leaf.swayDur}s ease-in-out infinite` } as React.CSSProperties}
          >
            <LeafGlyph shape={leaf.shape} size={leaf.size} tint={leaf.tint} />
          </span>
        </span>
      ))}
    </div>
  );
}

function LeafSprig({ className }: { className?: string }) {
  return (
    <span aria-hidden className={`pointer-events-none block ${className ?? ""}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path d="M4 26C4 14 14 4 26 4C24 14 16 22 4 26Z" fill="var(--color-leaf)" opacity="0.85" />
        <path d="M2 24C2 16 9 9 17 7C15 15 9 21 2 24Z" fill="var(--color-cinnamon)" opacity="0.68" />
      </svg>
    </span>
  );
}

/* Small perched-bird glyph, static pose (no physics) with a calm CSS bob.
   Species are real 2-3 tone plumages so the valley's life reads truthfully,
   never a flat silhouette. */
type Species = "bulbul" | "kingfisher" | "myna" | "parakeet";
const PLUMAGE: Record<Species, { body: string; wing: string; breast: string; head: string; bill: string }> = {
  bulbul: { body: "#3A332C", wing: "#221D18", breast: "#F3EFE3", head: "#221D18", bill: "#1C1712" },
  kingfisher: { body: "var(--color-sky)", wing: "#2C5C7C", breast: "#8B4A2B", head: "#8B4A2B", bill: "#A6301F" },
  myna: { body: "#7A5233", wing: "#4A3423", breast: "#E3D3B8", head: "#2B231C", bill: "#E8B23D" },
  parakeet: { body: "var(--color-leaf)", wing: "#136B38", breast: "#D9EFB0", head: "var(--color-leaf)", bill: "var(--color-cinnamon)" },
};

function PerchedBird({ species, flip, className }: { species: Species; flip?: boolean; className?: string }) {
  const c = PLUMAGE[species];
  return (
    <span aria-hidden className={`pointer-events-none absolute z-20 block ${className ?? ""}`} style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <span className="block" style={{ animation: "lv-bob 3.4s ease-in-out infinite" }}>
        <svg width="32" height="28" viewBox="0 0 32 28" fill="none">
          <ellipse cx="15" cy="24.6" rx="6" ry="1.3" fill="#1A1408" opacity="0.16" />
          <path d="M13 21 L13 24 M17 21 L17 24" stroke="#5A4A38" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M8 15 Q3 14 5 19 Q9 18 11 17 Z" fill={c.wing} opacity="0.92" />
          <ellipse cx="15" cy="16" rx="8" ry="6" fill={c.body} />
          <path d="M10 14 Q15 13 19 16 Q15 18 11 17 Z" fill={c.wing} opacity="0.9" />
          <ellipse cx="18.4" cy="17.6" rx="3.6" ry="3" fill={c.breast} />
          <circle cx="21" cy="10" r="4.6" fill={c.head} />
          <path d="M24.6 9.4 L29.2 8.4 L25 11.6 Z" fill={c.bill} />
          <circle cx="22" cy="9" r="0.95" fill="#F6F2E8" />
          <circle cx="22.15" cy="9" r="0.38" fill="#1A1408" />
        </svg>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  VistaFrame — the screenshot treatment: a carved two-tone ring
 *  (leaf-to-accent gradient), a rotated mossy backing card, a leaf
 *  sprig tucked in the top corner, and an optional perched bird — a
 *  screenshot presented as a framed view OUT over the valley, not a
 *  plain browser card.
 * ------------------------------------------------------------------ */
const RING_GRADIENT: Record<Accent, string> = {
  leaf: "linear-gradient(135deg, var(--color-leaf), var(--color-leaf-light))",
  blue: "linear-gradient(135deg, var(--color-sky), var(--color-leaf))",
  cinnamon: "linear-gradient(135deg, var(--color-cinnamon), var(--color-leaf-light))",
};
const BACK_TINT: Record<Accent, string> = {
  leaf: "bg-leaf/20",
  blue: "bg-sky/20",
  cinnamon: "bg-cinnamon/20",
};

function VistaFrame({
  shot,
  alt,
  accent,
  tilt = "ccw",
  bird,
}: {
  shot: { src: string; w: number; h: number; blur: string };
  alt: string;
  accent: Accent;
  tilt?: "ccw" | "cw";
  bird?: { species: Species; flip?: boolean };
}) {
  const deg = tilt === "ccw" ? -2.5 : 2.5;
  return (
    <div className="relative @container">
      <div aria-hidden className={`absolute -inset-3 rounded-[28px] ${BACK_TINT[accent]}`} style={{ transform: `rotate(${deg}deg)` }} />
      <LeafSprig className={`absolute -top-3 z-20 ${tilt === "ccw" ? "-left-3 -rotate-[6deg]" : "-right-3 -rotate-[110deg] scale-x-[-1]"}`} />
      <div
        className="relative rounded-[22px] p-[2px] shadow-[0_1px_2px_rgba(30,28,22,0.06),0_26px_50px_-30px_rgba(30,28,22,0.55)]"
        style={{ background: RING_GRADIENT[accent] }}
      >
        <div className="overflow-hidden rounded-[20px] border border-white/50 bg-card">
          <div
            className="flex items-center gap-[0.7em] border-b border-border bg-card px-[1.1em] py-[0.7em]"
            style={{ fontSize: "clamp(7.5px, 2.2cqw, 11px)" }}
          >
            <PeaksMark size="1.15em" variant="light" />
            <div className="flex h-[1.9em] flex-1 items-center gap-[0.6em] rounded-full border border-border bg-muted px-[1em] text-[1em] text-muted-foreground">
              <Search className="h-[1.05em] w-[1.05em]" aria-hidden />
              <span>Search the valley</span>
            </div>
          </div>
          <div className="overflow-hidden">
            <Image
              src={shot.src}
              alt={alt}
              width={shot.w}
              height={shot.h}
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 620px"
              placeholder="blur"
              blurDataURL={shot.blur}
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
      {bird && <PerchedBird species={bird.species} flip={bird.flip} className={tilt === "ccw" ? "-top-4 right-8" : "-top-4 left-8"} />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Shared pill buttons — canopy fill primary, outline secondary. Every
 *  clickable state (hover/focus-visible/active) lives here once.
 * ------------------------------------------------------------------ */
function JoinPill({ className = "", size = "default" }: { className?: string; size?: "default" | "lg" }) {
  const pad = size === "lg" ? "px-8 py-3.5 text-base" : "px-6 py-2.5 text-[15px]";
  return (
    <Link
      href="/signup"
      className={`inline-flex items-center justify-center rounded-full bg-canopy font-semibold text-white shadow-[0_5px_13px_-8px_var(--color-canopy)] transition-[filter,transform] duration-200 ease-out hover:brightness-[1.14] active:brightness-100 active:scale-[0.97] ${pad} ${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy`}
    >
      {HERO.ctaPrimary}
    </Link>
  );
}

function SignInPill({ className = "", size = "default" }: { className?: string; size?: "default" | "lg" }) {
  const pad = size === "lg" ? "px-8 py-3.5 text-base" : "px-6 py-2.5 text-[15px]";
  return (
    <Link
      href="/login"
      className={`state-layer inline-flex items-center justify-center rounded-full border border-border bg-card font-semibold text-foreground transition-[transform,border-color] duration-200 ease-out hover:border-leaf/50 active:scale-[0.97] ${pad} ${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf`}
    >
      {HERO.ctaSecondary}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 *  Nav — a glass clearing at the very top of the terrain. In normal
 *  flow (not fixed/sticky) so it never fights the delight harness's own
 *  sticky concept-switcher bar above it; the real CTAs it repeats are
 *  reachable again in the hero and the closing band regardless.
 * ------------------------------------------------------------------ */
function Nav() {
  return (
    <header className="glass relative z-10 border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md outline-none transition-[opacity,transform] duration-150 hover:opacity-80 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <Wordmark variant="light" textClassName="text-foreground" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:text-leaf active:scale-[0.98] sm:inline-flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            {NAV.signIn}
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-canopy px-5 py-2 text-sm font-semibold text-white shadow-[0_5px_13px_-8px_var(--color-canopy)] transition-[filter,transform] duration-150 hover:brightness-[1.14] active:brightness-100 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
          >
            {NAV.join}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 *  Hero — a big open stretch of terrain with the headline set in a
 *  glass clearing, sprigs and a resting bird at the panel's edges so
 *  the opening moment reads as full and alive rather than empty sky.
 * ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative flex min-h-[82vh] flex-col justify-center px-6 pt-16 pb-10 lg:px-8">
      <div className="relative mx-auto w-full max-w-3xl">
        <div
          aria-hidden
          className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-[48px] blur-2xl"
          style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(31,138,76,0.14), transparent 70%)" }}
        />
        <LeafSprig className="absolute -top-4 -left-4 rotate-[-18deg] sm:-left-8" />
        <LeafSprig className="absolute -bottom-4 -right-4 rotate-[150deg] scale-x-[-1] sm:-right-8" />
        <div className="glass relative rounded-[var(--radius-3xl)] border border-border/70 px-7 py-10 text-center shadow-[0_1px_2px_rgba(30,28,22,0.05),0_30px_60px_-32px_rgba(30,28,22,0.4)] sm:px-14 sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">Rishi Valley, together again</p>
          <h1 className="mx-auto mt-4 max-w-[18ch] text-balance font-heading text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
            {HERO.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-[42ch] text-balance text-base leading-[1.7] text-muted-foreground sm:text-lg">
            {HERO.sub}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <JoinPill size="lg" />
            <SignInPill size="lg" />
          </div>
        </div>
        <PerchedBird species="parakeet" className="-bottom-3 left-10 hidden sm:block" />
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{HERO.scrollCue}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
      </div>

      {/* the open ground below the scroll cue — filled with intent (resting
          birds, a leaf cluster) instead of left as dead terrain while the
          hero's min-height settles the card in the middle of the viewport. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-28 sm:block">
        <PerchedBird species="myna" className="bottom-3 left-[14%]" />
        <PerchedBird species="kingfisher" flip className="bottom-6 right-[18%]" />
        <LeafSprig className="absolute bottom-8 left-[42%] rotate-[24deg]" />
        <LeafSprig className="absolute bottom-2 right-[38%] -rotate-[30deg] scale-x-[-1]" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Intro — the tone-setting band, a clearing of its own.
 * ------------------------------------------------------------------ */
function Intro() {
  return (
    <SectionReveal>
      <section className="mx-auto max-w-2xl px-6 pt-[var(--space-l)] pb-[var(--space-xl)] text-center lg:px-8">
        <div className="rounded-[var(--radius-3xl)] border border-border/70 bg-card/90 px-7 py-10 shadow-[0_1px_2px_rgba(30,28,22,0.04),0_24px_48px_-30px_rgba(30,28,22,0.35)] backdrop-blur-sm sm:px-12 sm:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">{INTRO.eyebrow}</p>
          <h2 className="mx-auto mt-3 max-w-[24ch] text-balance font-heading text-3xl font-bold leading-[1.3] tracking-[-0.03em] text-foreground sm:text-[2.6rem]">
            {INTRO.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[15.5px] leading-[1.7] text-muted-foreground">
            {INTRO.body}
          </p>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ------------------------------------------------------------------ *
 *  Feature trail — five waypoints down one rail, each a numbered stop
 *  with copy on one side and a vista frame on the other, alternating.
 * ------------------------------------------------------------------ */
const EYEBROW_TINT: Record<Accent, string> = { leaf: "text-leaf", blue: "text-sky", cinnamon: "text-cinnamon" };
const BULLET_TINT: Record<Accent, string> = { leaf: "bg-leaf", blue: "bg-sky", cinnamon: "bg-cinnamon" };
const WAYPOINT_TINT: Record<Accent, string> = {
  leaf: "border-leaf bg-leaf text-white",
  blue: "border-sky bg-sky text-white",
  cinnamon: "border-cinnamon bg-cinnamon text-white",
};

const FEATURE_BIRDS: (({ species: Species; flip?: boolean }) | undefined)[] = [
  undefined,
  { species: "bulbul" },
  undefined,
  { species: "kingfisher", flip: true },
  { species: "myna" },
];

function FeatureRow({ feature, reverse, bird }: { feature: (typeof FEATURES)[number]; reverse: boolean; bird?: { species: Species; flip?: boolean } }) {
  const shot = SHOTS[feature.shot.name];
  return (
    <SectionReveal>
      <div className="relative pl-14 sm:pl-[4.5rem]">
        <span
          className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 font-heading text-[15px] font-bold shadow-[0_6px_14px_-8px_rgba(30,28,22,0.5)] ${WAYPOINT_TINT[feature.accent]}`}
        >
          {String(feature.index).padStart(2, "0")}
        </span>
        <div className="rounded-[var(--radius-3xl)] border border-border/70 bg-card/92 p-5 shadow-[0_1px_2px_rgba(30,28,22,0.04),0_24px_48px_-30px_rgba(30,28,22,0.35)] backdrop-blur-sm sm:p-7 lg:p-8">
          <div className={`grid items-center gap-6 lg:gap-10 ${reverse ? "lg:grid-cols-[1.5fr_1fr]" : "lg:grid-cols-[1fr_1.5fr]"}`}>
            <div className={reverse ? "lg:order-2" : ""}>
              <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${EYEBROW_TINT[feature.accent]}`}>{feature.eyebrow}</p>
              <h3 className="mt-3 max-w-[20ch] text-balance font-heading text-[1.85rem] font-bold leading-[1.14] tracking-[-0.03em] text-foreground sm:text-4xl">
                {feature.title}
              </h3>
              <p className="mt-4 max-w-[50ch] text-[15.5px] leading-[1.7] text-muted-foreground">{feature.body}</p>
              {feature.bullets && feature.bullets.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-foreground">
                      <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full ${BULLET_TINT[feature.accent]}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={reverse ? "lg:order-1" : ""}>
              <VistaFrame shot={shot} alt={feature.shot.alt} accent={feature.accent} tilt={reverse ? "cw" : "ccw"} bird={bird} />
            </div>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}

function FeatureTrail() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-[var(--space-xl)] lg:px-8">
      <div
        aria-hidden
        className="absolute left-[38px] top-3 bottom-3 hidden w-px bg-gradient-to-b from-leaf/0 via-leaf/30 to-leaf/0 sm:block"
      />
      <div className="space-y-14 lg:space-y-20">
        {FEATURES.map((feature, i) => (
          <FeatureRow key={feature.index} feature={feature} reverse={i % 2 === 1} bird={FEATURE_BIRDS[i]} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Trust — a resting clearing along the trail.
 * ------------------------------------------------------------------ */
const VOUCHED = [
  { id: "trust-a", name: "Ananya Krishnan", photoUrl: null },
  { id: "trust-b", name: "Rohan Mehta", photoUrl: null },
  { id: "trust-c", name: "Meera Iyer", photoUrl: null },
  { id: "trust-d", name: "Arjun Reddy", photoUrl: null },
  { id: "trust-e", name: "Fatima Sheikh", photoUrl: null },
];

function Trust() {
  return (
    <SectionReveal>
      <section className="mx-auto max-w-6xl px-6 pb-[var(--space-l)] lg:px-8">
        <div className="overflow-hidden rounded-[var(--radius-3xl)] border border-border/70 bg-card/92 px-7 py-12 shadow-[0_1px_2px_rgba(30,28,22,0.04),0_24px_48px_-30px_rgba(30,28,22,0.35)] backdrop-blur-sm sm:px-14 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">{TRUST.eyebrow}</p>
              <h3 className="mt-3 max-w-[20ch] text-balance font-heading text-[1.85rem] font-bold leading-[1.14] tracking-[-0.03em] text-foreground sm:text-4xl">
                {TRUST.heading}
              </h3>
              <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.7] text-muted-foreground">{TRUST.body1}</p>
              <p className="mt-5 max-w-[52ch] text-[15.5px] font-medium leading-[1.7] text-foreground">{TRUST.body2}</p>
            </div>
            <div className="flex flex-col items-center gap-5 rounded-[var(--radius-2xl)] border border-border bg-leaf/[0.06] px-6 py-10">
              <div className="flex -space-x-2.5 sm:hidden">
                {VOUCHED.map((u) => (
                  <span key={u.id} className="rounded-full ring-2 ring-card">
                    <BirdAvatar user={u} size="sm" />
                  </span>
                ))}
              </div>
              <div className="hidden -space-x-3 sm:flex">
                {VOUCHED.map((u) => (
                  <span key={u.id} className="rounded-full ring-2 ring-card">
                    <BirdAvatar user={u} size="md" />
                  </span>
                ))}
              </div>
              <p className="rounded-full border border-leaf/25 bg-leaf/10 px-4 py-1.5 text-[13px] font-semibold text-leaf">
                {TRUST.vouchedBadge}
              </p>
              <p className="max-w-[28ch] text-center text-[13px] leading-relaxed text-muted-foreground">{TRUST.vouchedNote}</p>
            </div>
          </div>
        </div>
      </section>
    </SectionReveal>
  );
}

/* ------------------------------------------------------------------ *
 *  Closing CTA + footer — the trail's end, warmest point of the terrain.
 * ------------------------------------------------------------------ */
function ClosingAndFooter() {
  return (
    <footer className="relative">
      <SectionReveal>
        <div className="mx-auto max-w-3xl px-6 pt-[var(--space-l)] pb-12 lg:px-8">
          <div className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-border/70 bg-card/92 px-7 py-12 text-center shadow-[0_1px_2px_rgba(30,28,22,0.05),0_30px_60px_-32px_rgba(30,28,22,0.4)] backdrop-blur-sm sm:px-14 sm:py-16">
            <LeafSprig className="absolute -top-3 -left-3 -rotate-[6deg]" />
            <LeafSprig className="absolute -bottom-3 -right-3 rotate-[160deg] scale-x-[-1]" />
            <PeaksMark size={22} variant="light" className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-[20ch] text-balance font-heading text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-[2.6rem] sm:leading-[1.08]">
              {FOOTER.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-balance text-[15.5px] leading-[1.7] text-muted-foreground">{FOOTER.body}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <JoinPill size="lg" />
              <SignInPill size="lg" />
            </div>
          </div>
        </div>
      </SectionReveal>

      <div className="border-t border-border/70 bg-card/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-[13px] text-muted-foreground sm:flex-row lg:px-8">
          <Wordmark variant="light" textClassName="text-foreground" />
          <p>{FOOTER.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

export default function LivingValleyVariant() {
  return (
    <div className="relative isolate overflow-x-hidden bg-transparent text-foreground">
      <TerrainField />
      <LeafDrift />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Intro />
        <FeatureTrail />
        <Trust />
      </main>
      <div className="relative z-10">
        <ClosingAndFooter />
      </div>
    </div>
  );
}
