"use client";

/* ------------------------------------------------------------------ *
 *  Concept: The Prospectus.
 *
 *  Confident magazine/prospectus typography: oversized serif statements,
 *  a strict baseline grid, full-width screenshot plates with generous
 *  (verbatim-alt-text) captions, thin canopy/cinnamon rules, and the
 *  ghost-numeral chapter markers already proven in the live site's
 *  feature-section.tsx, pushed further as the page's organizing device
 *  (a "00" cover mark through "05", the closing colophon reading like a
 *  book's last page). Reads like a well-printed school publication that
 *  happens to be interactive.
 *
 *  Every string of substance is pulled verbatim from ./_shared. The only
 *  invented text here is structural/functional chrome a real prospectus
 *  would carry anyway: "Contents", "Fig. 0N", "Chapter 0N of 05".
 *
 *  Ambient life (a few sprigs of leaves, two perched birds) is scoped
 *  per-section with a low z-index behind the copy — never a page-wide
 *  layer riding on top of content — and animates only transform/opacity
 *  on a slow, calm cadence. No decorative arrows anywhere; direction is
 *  carried by dotted TOC leaders and rules instead.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import Image from "next/image";
import { PeaksMark, Wordmark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { SectionReveal } from "@/components/landing/section-reveal";
import {
  HERO,
  INTRO,
  FEATURES,
  TRUST,
  FOOTER,
  NAV,
  SHOTS,
  HERO_IMAGE_SRC,
  HERO_IMAGE_BLUR,
  type Accent,
} from "./_shared";

/* ------------------------------------------------------------------ *
 *  Accent lookup tables. Full literal class strings (Tailwind's static
 *  scanner can't see a computed `text-${accent}`) — same discipline as
 *  the live feature-section.tsx.
 * ------------------------------------------------------------------ */
const ACCENT_TEXT: Record<Accent, string> = {
  leaf: "text-leaf",
  blue: "text-sky",
  cinnamon: "text-cinnamon",
};
const ACCENT_BORDER: Record<Accent, string> = {
  leaf: "border-leaf/30",
  blue: "border-sky/30",
  cinnamon: "border-cinnamon/30",
};
const ACCENT_GHOST: Record<Accent, string> = {
  leaf: "text-leaf/[0.08]",
  blue: "text-sky/[0.08]",
  cinnamon: "text-cinnamon/[0.08]",
};
const ACCENT_DOT: Record<Accent, string> = {
  leaf: "bg-leaf",
  blue: "bg-sky",
  cinnamon: "bg-cinnamon",
};
const ACCENT_RING: Record<Accent, string> = {
  leaf: "focus-visible:ring-leaf/45",
  blue: "focus-visible:ring-sky/45",
  cinnamon: "focus-visible:ring-cinnamon/45",
};

const VOUCHED = [
  { id: "trust-a", name: "Ananya Krishnan" },
  { id: "trust-b", name: "Rohan Mehta" },
  { id: "trust-c", name: "Meera Iyer" },
  { id: "trust-d", name: "Arjun Reddy" },
  { id: "trust-e", name: "Fatima Sheikh" },
];

function jumpTo(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

/* ------------------------------------------------------------------ *
 *  Ambient ornament: a handful of slow, calm leaves and two static
 *  perched birds. Deterministic (no Math.random at render — hydration
 *  safe), scoped inside a `relative overflow-hidden` section with a
 *  negative z-index against the copy's z-10, so it genuinely sits
 *  BEHIND content rather than riding a page-wide layer on top of it.
 *  transform/opacity only, via the rv-ed-sway / rv-ed-bob keyframes
 *  declared once in <ProspectusStyles>.
 * ------------------------------------------------------------------ */
type LeafSpot = { top: string; left: string; size: number; rotate: number; delay: number; duration: number; shape: "round" | "slim" | "blade"; tint: string };

const LEAF_CLUSTERS: Record<"hero" | "foreword" | "closing", LeafSpot[]> = {
  hero: [
    { top: "10%", left: "4%", size: 30, rotate: -12, delay: 0, duration: 8.5, shape: "round", tint: "var(--color-leaf)" },
    { top: "62%", left: "2%", size: 22, rotate: 18, delay: 1.4, duration: 7.2, shape: "slim", tint: "var(--color-cinnamon)" },
    { top: "22%", left: "94%", size: 26, rotate: 8, delay: 0.7, duration: 9.4, shape: "blade", tint: "var(--color-leaf)" },
    { top: "78%", left: "90%", size: 20, rotate: -20, delay: 2.1, duration: 8, shape: "round", tint: "var(--color-cinnamon)" },
  ],
  foreword: [
    { top: "12%", left: "10%", size: 24, rotate: 10, delay: 0.3, duration: 8.8, shape: "slim", tint: "var(--color-leaf)" },
    { top: "70%", left: "92%", size: 28, rotate: -14, delay: 1.8, duration: 7.6, shape: "round", tint: "var(--color-cinnamon)" },
    { top: "40%", left: "3%", size: 18, rotate: 22, delay: 0.9, duration: 9, shape: "blade", tint: "var(--color-leaf)" },
  ],
  closing: [
    { top: "8%", left: "8%", size: 26, rotate: -16, delay: 0.5, duration: 8.2, shape: "round", tint: "var(--color-cinnamon)" },
    { top: "75%", left: "6%", size: 20, rotate: 12, delay: 1.6, duration: 7.4, shape: "slim", tint: "var(--color-leaf)" },
    { top: "18%", left: "93%", size: 24, rotate: -8, delay: 1.1, duration: 8.9, shape: "blade", tint: "var(--color-cinnamon)" },
    { top: "68%", left: "90%", size: 18, rotate: 20, delay: 0.2, duration: 7.9, shape: "round", tint: "var(--color-leaf)" },
  ],
};

function LeafGlyph({ shape }: { shape: LeafSpot["shape"] }) {
  // A pale center vein on every shape — without it a filled blob reads as a
  // plain dot at small sizes, exactly the "not leaf-shaped" complaint the
  // owner has flagged before. Matches the real ambient-leaves.tsx recipe.
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden className="block">
      {shape === "blade" && (
        <>
          <path d="M20 4C10 4 4 10 4 20c0 0 6-1 10-5s6-11 6-11Z" fill="currentColor" opacity="0.88" />
          <path d="M17 7C12 9 8 13 6 18" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
        </>
      )}
      {shape === "round" && (
        <>
          <path d="M12 3c5.5 0 8.5 3.8 8.5 9s-3 9-8.5 9-8.5-3.8-8.5-9 3-9 8.5-9Z" fill="currentColor" opacity="0.88" />
          <path d="M12 5v14" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
        </>
      )}
      {shape === "slim" && (
        <>
          <path d="M12 2c3.4 4 3.4 16 0 20-3.4-4-3.4-16 0-20Z" fill="currentColor" opacity="0.88" />
          <path d="M12 4v16" stroke="var(--color-paper)" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
        </>
      )}
    </svg>
  );
}

function AmbientLeaves({ cluster }: { cluster: keyof typeof LEAF_CLUSTERS }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {LEAF_CLUSTERS[cluster].map((l, i) => (
        <span
          key={i}
          className="rv-ed-leaf absolute block"
          style={
            {
              top: l.top,
              left: l.left,
              width: l.size,
              height: l.size,
              color: l.tint,
              animationDelay: `${l.delay}s`,
              animationDuration: `${l.duration}s`,
              "--rv-r": `${l.rotate}deg`,
            } as React.CSSProperties
          }
        >
          <LeafGlyph shape={l.shape} />
        </span>
      ))}
    </div>
  );
}

/** A single small perched bird, static but for a slow idle bob — a quiet
 * signature rather than the full hop-physics flock used elsewhere. */
function PerchedBird({ tint, className = "" }: { tint: string; className?: string }) {
  return (
    <span aria-hidden className={`rv-ed-bird pointer-events-none block ${className}`} style={{ color: tint }}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <ellipse cx="15" cy="26.6" rx="5.5" ry="1.2" fill="#1A1408" opacity="0.12" />
        <path d="M13 23 L13 26 M17 23 L17 26" stroke="#5A4A38" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M8 17 Q3 16 5 21 Q9 20 11 19 Z" fill="currentColor" opacity="0.75" />
        <ellipse cx="15" cy="18" rx="8" ry="6" fill="currentColor" />
        <ellipse cx="18.4" cy="19.6" rx="3.4" ry="2.8" fill="var(--color-paper)" opacity="0.9" />
        <circle cx="21" cy="12" r="4.4" fill="currentColor" />
        <path d="M24.4 11.4 L28.6 10.5 L24.9 13.4 Z" fill="var(--color-cinnamon)" />
        <circle cx="22" cy="11" r="0.9" fill="var(--color-paper)" />
        <circle cx="22.15" cy="11" r="0.36" fill="#1A1408" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  Grain — a faint paper-grain wash (SVG feTurbulence), reused behind
 *  the Contents index and the foreword/closing bands so those flat
 *  tint sections read as the same warm interior page rather than
 *  plain, sparse colour. Opacity is kept low: texture, not noise. Each
 *  call site passes its own filter id (SVG ids are global; two Grains
 *  on the page would otherwise collide and both render the first
 *  filter defined).
 * ------------------------------------------------------------------ */
function Grain({ id, opacity = 0.05 }: { id: string; opacity?: number }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.13  0 0 0 0 0.08  0 0 0 0.7 0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/** A softened, sepia-tinted pass of the cover photo, pooled behind the
 * foreword pull-quote and faded to the section's own mist at the edges
 * so the intimacy of a real photograph sits behind the words without
 * ever fighting their legibility. */
function HeroWash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Image
        src={HERO_IMAGE_SRC}
        alt=""
        fill
        sizes="100vw"
        className="scale-110 object-cover opacity-[0.15] blur-[2px] grayscale-[0.3] sepia-[0.2]"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(58% 60% at 50% 38%, transparent 25%, var(--color-mist) 80%)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  DetailCrop — fills the half-column that would otherwise sit empty
 *  beside a mirrored (right-aligned) chapter's text: a small, slightly
 *  turned photo plate cropped from the same cover photograph, each
 *  chapter framed on a different corner of it, plus a ghost numeral
 *  that echoes the one already living inside the text column. Reads
 *  as a marginal figure a real prospectus would run there, not a
 *  patch over a bug — and it is the closing "detail" mirror of the
 *  Fig. 00 cover plate.
 * ------------------------------------------------------------------ */
const DETAIL_FOCUS: Record<number, string> = {
  2: "84% 38%",
  4: "10% 82%",
};

function DetailCrop({ feature }: { feature: (typeof FEATURES)[number] }) {
  const focus = DETAIL_FOCUS[feature.index] ?? "50% 50%";
  return (
    <div className="relative col-span-6 col-start-1 hidden self-center lg:block" aria-hidden>
      <span
        className={`pointer-events-none absolute -top-6 right-10 select-none font-heading text-[5.5rem] font-bold leading-none ${ACCENT_GHOST[feature.accent]}`}
      >
        {String(feature.index).padStart(2, "0")}
      </span>
      <div className="relative ml-2 w-[172px] -rotate-1">
        <div className={`relative rounded-[var(--radius-sm)] border bg-card p-1.5 card-elevated ${ACCENT_BORDER[feature.accent]}`}>
          <CornerTicks accent={feature.accent} />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[3px]">
            <Image
              src={HERO_IMAGE_SRC}
              alt=""
              fill
              sizes="172px"
              className="scale-[1.85] object-cover grayscale-[0.2] sepia-[0.12]"
              style={{ objectPosition: focus }}
            />
          </div>
        </div>
        <p className="mt-2 text-right text-[11px] italic leading-snug text-muted-foreground">The valley</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Plate — a screenshot framed as a printed figure: a flat bordered
 *  mount (no tilt, no faux app chrome — the strict grid this concept
 *  earns its keep on), corner registration ticks, and a caption row
 *  using the SAME alt copy the real site already carries.
 * ------------------------------------------------------------------ */
function CornerTicks({ accent }: { accent: Accent }) {
  const cls = `absolute h-3 w-3 ${ACCENT_TEXT[accent]}`;
  return (
    <>
      <svg aria-hidden className={`${cls} -left-[5px] -top-[5px]`} viewBox="0 0 12 12" fill="none">
        <path d="M1 11V1H11" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <svg aria-hidden className={`${cls} -right-[5px] -top-[5px]`} viewBox="0 0 12 12" fill="none" style={{ transform: "scaleX(-1)" }}>
        <path d="M1 11V1H11" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <svg aria-hidden className={`${cls} -bottom-[5px] -left-[5px]`} viewBox="0 0 12 12" fill="none" style={{ transform: "scaleY(-1)" }}>
        <path d="M1 11V1H11" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <svg aria-hidden className={`${cls} -bottom-[5px] -right-[5px]`} viewBox="0 0 12 12" fill="none" style={{ transform: "scale(-1,-1)" }}>
        <path d="M1 11V1H11" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </>
  );
}

function Plate({
  src,
  alt,
  width,
  height,
  blurDataURL,
  index,
  accent,
  priority = false,
  aspect,
  caption,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  index: number;
  accent: Accent;
  priority?: boolean;
  /** When set, the image is cropped to this fixed ratio (e.g. "4/5") via
   * object-cover instead of rendered at its true intrinsic size. Used only
   * for the single restrained hero accent photo — real product screenshots
   * always render at their true, uncropped aspect so no UI gets cut off. */
  aspect?: string;
  /** Override the caption line (defaults to the alt text). */
  caption?: string;
}) {
  return (
    <figure className="m-0">
      <div className={`relative rounded-[var(--radius-xl)] border bg-card p-2 card-elevated sm:p-3 ${ACCENT_BORDER[accent]}`}>
        <CornerTicks accent={accent} />
        <div className="overflow-hidden rounded-[var(--radius-sm)]" style={aspect ? { aspectRatio: aspect } : undefined}>
          {aspect ? (
            <div className="relative h-full w-full">
              <Image
                src={src}
                alt={alt}
                fill
                placeholder={blurDataURL ? "blur" : "empty"}
                blurDataURL={blurDataURL}
                priority={priority}
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          ) : (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              placeholder={blurDataURL ? "blur" : "empty"}
              blurDataURL={blurDataURL}
              loading={priority ? undefined : "lazy"}
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 1000px"
              className="h-auto w-full"
            />
          )}
        </div>
      </div>
      <figcaption className="mt-3 flex items-baseline gap-3 border-t border-border/70 pt-3">
        <span className={`shrink-0 font-heading text-[13px] font-bold ${ACCENT_TEXT[accent]}`}>
          Fig. {String(index).padStart(2, "0")}
        </span>
        {(caption ?? alt) && (
          <span className="text-[13.5px] italic leading-snug text-muted-foreground">{caption ?? alt}</span>
        )}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 *  One feature "spread": running head, ghost numeral + copy, then the
 *  full-width plate. Odd/even entries mirror the text column and
 *  numeral side left/right, and alternate a warm mist band — the
 *  "alternating" rhythm the concept calls for, without ever leaving a
 *  bare gap between spreads.
 * ------------------------------------------------------------------ */
function FeatureSpread({ feature }: { feature: (typeof FEATURES)[number] }) {
  const shot = SHOTS[feature.shot.name];
  const mirrored = feature.index % 2 === 0;

  return (
    <section id={`feature-${feature.index}`} className={`scroll-mt-20 border-t border-border ${mirrored ? "bg-mist" : ""}`}>
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="flex items-center justify-between py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className={ACCENT_TEXT[feature.accent]}>{feature.eyebrow}</span>
          <span>Chapter {String(feature.index).padStart(2, "0")} of {String(FEATURES.length).padStart(2, "0")}</span>
        </div>

        <SectionReveal>
          <div className="grid gap-8 pb-10 pt-3 lg:grid-cols-12 lg:gap-x-10 lg:pb-16 lg:pt-6">
            <div className={`relative lg:col-span-6 ${mirrored ? "lg:col-start-7 lg:text-right" : "lg:col-start-1"}`}>
              {/* Pulled up only slightly (not the full glyph-height offset
                  feature-section.tsx uses) — this column sits right under
                  the running-head bar above it, and a bigger pull would
                  drive the numeral straight into that label. A bottom fade
                  (mask, not a hard clip) keeps it from reading as a solid
                  blob behind the body copy on the shortest, one-line
                  titles — it dissolves into the page before it gets there. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -top-2 hidden select-none font-heading text-[7rem] font-bold leading-none lg:block ${ACCENT_GHOST[feature.accent]} ${
                  mirrored ? "-right-1" : "-left-1"
                }`}
                style={{
                  maskImage: "linear-gradient(to bottom, black 45%, transparent 82%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 45%, transparent 82%)",
                }}
              >
                {String(feature.index).padStart(2, "0")}
              </span>
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-heading text-[13px] font-bold lg:hidden ${ACCENT_BORDER[feature.accent]} ${ACCENT_TEXT[feature.accent]}`}
              >
                {String(feature.index).padStart(2, "0")}
              </span>
              <h3
                className={`relative z-10 mt-3 max-w-[20ch] font-heading text-[2rem] font-bold leading-[1.14] tracking-[-0.03em] text-foreground text-balance sm:text-[2.4rem] lg:mt-0 ${
                  mirrored ? "lg:ml-auto" : ""
                }`}
              >
                {feature.title}
              </h3>
              <p className={`relative z-10 mt-4 max-w-[54ch] text-[15.5px] leading-[1.7] text-muted-foreground ${mirrored ? "lg:ml-auto" : ""}`}>
                {feature.body}
              </p>
              {feature.bullets && feature.bullets.length > 0 && (
                <ul className={`relative z-10 mt-5 space-y-2 ${mirrored ? "lg:ml-auto lg:inline-block lg:text-left" : ""}`}>
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-foreground">
                      <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full ${ACCENT_DOT[feature.accent]}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {mirrored && <DetailCrop feature={feature} />}

            <div className="lg:col-span-12">
              <Plate
                src={shot.src}
                alt={feature.shot.alt}
                width={shot.w}
                height={shot.h}
                blurDataURL={shot.blur}
                index={feature.index}
                accent={feature.accent}
              />
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Root
 * ------------------------------------------------------------------ */
export default function EditorialVariant() {
  return (
    <div className="relative bg-background">
      <ProspectusStyles />

      {/* Book-spine margin mark — desktop-wide viewports only, tucked into
          the generous outer margin outside the max-w-6xl column so it never
          collides with content. Pure chrome, not a nav. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-2 z-[var(--z-elevated)] hidden w-6 items-center justify-center xl:flex"
      >
        <div className="flex h-[70vh] items-center">
          <span
            className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.32em] text-canopy/25"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Rishi Valley · The Prospectus
          </span>
        </div>
      </div>

      {/* Masthead. Deliberately NOT sticky: the harness above already carries
          its own sticky concept-switcher bar, and stacking a second
          position:sticky top-0 bar under it would fight it for the same
          pinned position (both compute "stuck" against the viewport, not
          against each other's height) and visibly overlap on every scroll.
          A magazine's own masthead scrolling away with the page reads true
          to the concept anyway — the hero and closing band each repeat the
          two affordances, so Join/Sign in are never more than a beat away. */}
      <header className="glass border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
          <Link
            href="/"
            className="rounded-md outline-none transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-canopy/45 active:translate-y-0"
          >
            <Wordmark variant="light" textClassName="text-foreground" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-[14px] font-semibold text-foreground outline-none transition-colors duration-150 hover:text-canopy focus-visible:ring-2 focus-visible:ring-canopy/40 active:scale-[0.98]"
            >
              {NAV.signIn}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-canopy px-5 py-2 text-[14px] font-semibold text-white shadow-sm outline-none transition-transform duration-150 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-canopy/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
            >
              {NAV.join}
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------- *
       *  Cover / hero
       * ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <AmbientLeaves cluster="hero" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="relative lg:col-span-7">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-10 -left-2 hidden select-none font-heading text-[8rem] font-bold leading-none text-canopy/[0.07] lg:block"
              >
                00
              </span>
              <p className="relative z-10 text-[11px] font-bold uppercase tracking-[0.2em] text-cinnamon">
                {FOOTER.tagline}
              </p>
              <h1 className="relative z-10 mt-4 max-w-[16ch] font-heading text-[2.75rem] font-bold leading-[1.05] tracking-[-0.035em] text-foreground text-balance sm:text-[3.5rem] lg:text-[4.25rem]">
                {HERO.headline}
              </h1>
              <p className="relative z-10 mt-5 max-w-[42ch] text-[16.5px] leading-[1.7] text-muted-foreground">
                {HERO.sub}
              </p>
              <div className="relative z-10 mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-canopy px-7 py-3 text-[15px] font-semibold text-white shadow-sm outline-none transition-transform duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-canopy/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                >
                  {HERO.ctaPrimary}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-7 py-3 text-[15px] font-semibold text-foreground outline-none transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-canopy/50 focus-visible:ring-2 focus-visible:ring-canopy/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                >
                  {HERO.ctaSecondary}
                </Link>
              </div>

              <a
                href="#contents"
                onClick={jumpTo("contents")}
                className="group relative z-10 mt-11 inline-flex items-center gap-3 rounded-sm text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground outline-none transition-colors duration-150 hover:text-canopy focus-visible:ring-2 focus-visible:ring-canopy/40"
              >
                <span aria-hidden className="rv-ed-cue h-6 w-px bg-current" />
                {HERO.scrollCue}
              </a>
            </div>

            <div className="lg:col-span-5">
              <Plate
                src={HERO_IMAGE_SRC}
                alt="Rishi Valley"
                aspect="4/5"
                blurDataURL={HERO_IMAGE_BLUR}
                index={0}
                accent="cinnamon"
                priority
                caption="The valley"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- *
       *  Contents — the signature moment: a real magazine index,
       *  clickable, that scrolls to each chapter below.
       * ---------------------------------------------------------- */}
      <section id="contents" className="relative scroll-mt-20 overflow-hidden border-b border-border bg-gradient-to-b from-background to-paper">
        <Grain id="ed-grain-contents" opacity={0.045} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: "radial-gradient(65% 90% at 50% 100%, rgba(194,98,47,0.07), transparent 70%)" }}
        />
        <SectionReveal>
          <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 lg:px-10 lg:py-16">
            <div className="flex items-baseline justify-between gap-4 border-b-2 border-foreground/80 pb-4">
              <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.24em] text-foreground">Contents</h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {FEATURES.length} features
              </span>
            </div>
            <ol>
              {FEATURES.map((f) => (
                <li key={f.index}>
                  <a
                    href={`#feature-${f.index}`}
                    onClick={jumpTo(`feature-${f.index}`)}
                    className={`group flex items-baseline gap-3 border-b border-border/70 py-5 outline-none transition-colors duration-150 hover:text-canopy focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm sm:gap-5 active:scale-[0.996] ${ACCENT_RING[f.accent]}`}
                  >
                    <span className={`w-7 shrink-0 font-heading text-lg font-bold ${ACCENT_TEXT[f.accent]}`}>
                      {String(f.index).padStart(2, "0")}
                    </span>
                    <span className="shrink-0 font-heading text-[1.05rem] font-bold tracking-[-0.01em] text-foreground transition-transform duration-200 group-hover:translate-x-1 sm:text-[1.2rem]">
                      {f.eyebrow}
                    </span>
                    <span aria-hidden className="mb-1.5 h-0 flex-1 self-end border-b-2 border-dotted border-border" />
                    <span className="hidden max-w-[32ch] shrink-0 text-right text-[13.5px] italic leading-snug text-muted-foreground md:block">
                      {f.title}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </SectionReveal>
      </section>

      {/* ---------------------------------------------------------- *
       *  Foreword (INTRO copy, as a pull-quote statement)
       * ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border bg-mist">
        <HeroWash />
        <Grain id="ed-grain-foreword" opacity={0.04} />
        <AmbientLeaves cluster="foreword" />
        <SectionReveal>
          <div className="relative z-10 mx-auto max-w-3xl px-6 py-11 text-center lg:py-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cinnamon">{INTRO.eyebrow}</p>
            <h2 className="mx-auto mt-5 max-w-[24ch] text-balance font-heading text-[1.85rem] font-bold italic leading-[1.32] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
              “{INTRO.heading}”
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-balance text-[15.5px] leading-[1.7] text-muted-foreground">
              {INTRO.body}
            </p>
          </div>
        </SectionReveal>
      </section>

      {/* ---------------------------------------------------------- *
       *  Five chapters
       * ---------------------------------------------------------- */}
      {FEATURES.map((f) => (
        <FeatureSpread key={f.index} feature={f} />
      ))}

      {/* ---------------------------------------------------------- *
       *  Trust — a wax-seal treatment of the invite-only note
       * ---------------------------------------------------------- */}
      <section className="border-b border-border bg-mist">
        <SectionReveal>
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
              <div className="lg:col-span-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">{TRUST.eyebrow}</p>
                <h3 className="mt-3 max-w-[18ch] text-balance font-heading text-[2rem] font-bold leading-[1.14] tracking-[-0.03em] text-foreground sm:text-4xl">
                  {TRUST.heading}
                </h3>
                <p className="mt-4 max-w-[58ch] text-[15.5px] leading-[1.7] text-muted-foreground">{TRUST.body1}</p>
                <p className="mt-4 max-w-[58ch] text-[15.5px] font-medium leading-[1.7] text-foreground">{TRUST.body2}</p>
              </div>

              <div className="flex justify-center lg:col-span-5">
                <div className="relative flex aspect-square w-full max-w-[280px] flex-col items-center justify-center gap-4 rounded-full border-2 border-canopy/30 bg-card p-9 text-center card-elevated">
                  <div aria-hidden className="absolute inset-3 rounded-full border border-dashed border-canopy/25" />
                  <div className="flex -space-x-3">
                    {VOUCHED.map((u) => (
                      <span key={u.id} className="rounded-full ring-2 ring-card">
                        <BirdAvatar user={u} size="sm" />
                      </span>
                    ))}
                  </div>
                  <p className="font-heading text-[15px] font-bold text-canopy">{TRUST.vouchedBadge}</p>
                  <p className="max-w-[24ch] text-[12.5px] leading-relaxed text-muted-foreground">{TRUST.vouchedNote}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* ---------------------------------------------------------- *
       *  Closing CTA + colophon
       * ---------------------------------------------------------- */}
      <footer className="relative overflow-hidden border-t border-border bg-mist">
        <AmbientLeaves cluster="closing" />
        <PerchedBird tint="var(--color-cinnamon)" className="absolute right-[12%] top-6 z-10 hidden sm:block" />
        <SectionReveal>
          <div id="closing-cta" className="relative z-10 mx-auto max-w-2xl scroll-mt-20 px-6 py-12 lg:py-16">
            {/* Seated on its own warm paper panel (bg-card, one notch lighter
                than the section's recessed mist) rather than floating text
                straight on the flat tint — the same base-to-elevated logic
                every card on the live site already uses. */}
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card px-7 py-10 text-center card-elevated sm:px-12 sm:py-12">
              <Grain id="ed-grain-closing" opacity={0.04} />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24"
                style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(31,138,76,0.08), transparent 70%)" }}
              />
              <div className="relative z-10">
                <PeaksMark size={22} variant="light" className="mx-auto" />
                <h2 className="mt-6 text-balance font-heading text-[2.15rem] font-bold tracking-[-0.03em] text-foreground sm:text-[2.75rem]">
                  {FOOTER.heading}
                </h2>
                <p className="mx-auto mt-4 max-w-md text-balance text-[15.5px] leading-[1.7] text-muted-foreground">
                  {FOOTER.body}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-canopy px-8 py-3.5 font-semibold text-white shadow-sm outline-none transition-transform duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-canopy/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                  >
                    {FOOTER.ctaPrimary}
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-border bg-mist px-8 py-3.5 font-semibold text-foreground outline-none transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-canopy/50 focus-visible:ring-2 focus-visible:ring-canopy/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                  >
                    {FOOTER.ctaSecondary}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>

        <div className="relative z-10 border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-[13px] text-muted-foreground sm:flex-row">
            <Wordmark variant="light" textClassName="text-foreground" />
            <p>{FOOTER.tagline}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Keyframes for the ambient leaves/bird and the scroll-cue tick, scoped
 * with an rv-ed- prefix so they never collide with another variant's
 * styles when several are mounted side by side in the harness. transform
 * + opacity only, per the motion rules. */
function ProspectusStyles() {
  return (
    <style>{`
      @keyframes rv-ed-sway {
        0%, 100% { transform: translateY(0) rotate(var(--rv-r, 0deg)); opacity: 0.5; }
        50% { transform: translateY(-9px) rotate(calc(var(--rv-r, 0deg) + 6deg)); opacity: 0.82; }
      }
      .rv-ed-leaf {
        animation-name: rv-ed-sway;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
        will-change: transform, opacity;
      }
      @keyframes rv-ed-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      .rv-ed-bird {
        animation: rv-ed-bob 3.6s ease-in-out infinite;
        will-change: transform;
      }
      @keyframes rv-ed-cue {
        0%, 100% { transform: scaleY(1); opacity: 0.55; }
        50% { transform: scaleY(1.6); opacity: 1; }
      }
      .rv-ed-cue {
        transform-origin: top;
        animation: rv-ed-cue 2.2s ease-in-out infinite;
      }
    `}</style>
  );
}
