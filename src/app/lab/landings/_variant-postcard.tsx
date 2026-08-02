"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Postcard Home — photo-led cinema, then a pinboard of
 *  postcards from the valley. The hero photo runs full-bleed under a
 *  warm dusk grade with a slow, barely-there Ken Burns drift; the
 *  headline sits over it like the line written across the front of a
 *  postcard. Below the fold the five features are laid out as postcards
 *  pinned to a corked, stippled board — washi tape, a tiny dashed-edge
 *  stamp, a handwritten-feel caption — threaded together by a dashed
 *  mail route that a little parcel travels down as you scroll. The
 *  trust card wears an envelope flap and the invite badge is sealed
 *  onto a wax-seal-style ring. The closing CTA is a return-address
 *  postmark, echoing the one on the hero — the whole page is one
 *  postcard, sent and then answered.
 *
 *  All marketing copy is pulled verbatim from ./_shared; only tiny
 *  functional/decorative labels (the postmark micro-text, the caption
 *  under each postcard, which is just that feature's own eyebrow) are
 *  original to this file.
 * ------------------------------------------------------------------ */

import { useId, useRef } from "react";
import type { RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { ChevronDown, Mail } from "lucide-react";
import { PeaksMark, Wordmark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { SectionReveal } from "@/components/landing/section-reveal";
import { AmbientLeaves } from "@/components/landing/ambient-leaves";
import { PerchingBirds } from "@/components/landing/perching-birds";
import { LandingNav } from "@/components/landing/landing-nav";
import {
  SHOTS,
  HERO_IMAGE_SRC,
  HERO_IMAGE_BLUR,
  NAV,
  HERO,
  INTRO,
  FEATURES,
  TRUST,
  FOOTER,
  type Accent,
  type FeatureCopy,
} from "./_shared";

/* ------------------------------------------------------------------ *
 *  Accent lookups — full literal class strings so Tailwind's static
 *  scanner can see them (a template-built class like `${x}/10` is
 *  invisible to the JIT scanner; see the same note in showcase-shot.tsx
 *  and feature-section.tsx).
 * ------------------------------------------------------------------ */
const ACCENT_VAR: Record<Accent, string> = {
  leaf: "var(--color-leaf)",
  blue: "var(--color-sky)",
  cinnamon: "var(--color-cinnamon)",
};
const ACCENT_TEXT: Record<Accent, string> = {
  leaf: "text-leaf",
  blue: "text-sky",
  cinnamon: "text-cinnamon",
};
const ACCENT_BORDER_DASHED: Record<Accent, string> = {
  leaf: "border-leaf/45",
  blue: "border-sky/45",
  cinnamon: "border-cinnamon/45",
};
const ACCENT_BORDER_FAINT: Record<Accent, string> = {
  leaf: "border-leaf/20",
  blue: "border-sky/20",
  cinnamon: "border-cinnamon/20",
};
const ACCENT_GHOST: Record<Accent, string> = {
  leaf: "text-leaf/[0.1]",
  blue: "text-sky/[0.1]",
  cinnamon: "text-cinnamon/[0.1]",
};

/* ------------------------------------------------------------------ *
 *  Mobile-only crop — at 390px the full app screenshots shrink past
 *  the point of legibility (a whole directory grid or a stack of feed
 *  posts becomes pure texture). Below `sm` every postcard photo is
 *  cropped to a single landscape "snapshot" aspect (in keeping with the
 *  postcard conceit — a photo, not a screenshot) and repositioned per
 *  shot so the crop lands on one legible thing: the top rows of the
 *  directory grid, the one Letters card, the centred Catch-ups card,
 *  the first Collection photo. The feed is the densest of the five (three
 *  stacked posts' worth of body copy) so it gets an extra punch-in on
 *  top of the crop — scaled up around its first post, sidebar cropped
 *  off — rather than just a wider frame around the same tiny text.
 *  Reverts to the natural full-frame aspect (and, for the feed, the
 *  unscaled image) at `sm` and up, where there is room to show the
 *  whole screenshot.
 * ------------------------------------------------------------------ */
const MOBILE_CROP_POSITION: Record<string, string> = {
  directory: "object-[50%_0%]",
  feed: "object-[0%_0%] scale-[1.35] origin-[0%_0%] sm:scale-100 sm:origin-center",
  letters: "object-[49%_50%]",
  catchups: "object-[50%_50%]",
  collection: "object-[50%_0%]",
};

// The four CTAs all used to grow 2% under the cursor. Hover never resizes a
// control, so each one now changes colour instead: the canopy fill brightens
// (1.14, the shared Button's step), and the neutral and white pills take the
// state layer, which is the one tint that stays visible on both.
const CTA_CANOPY =
  "inline-flex items-center justify-center rounded-full bg-canopy px-8 py-3.5 font-semibold text-white shadow-[0_10px_24px_-14px_var(--color-canopy)] transition-[filter,transform] duration-200 hover:brightness-[1.14] active:brightness-100 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy";
const CTA_GHOST_LIGHT =
  "state-layer inline-flex items-center justify-center rounded-full border border-border bg-card px-8 py-3.5 font-semibold text-foreground transition-[transform,border-color] duration-200 hover:border-leaf/50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";
const CTA_WHITE_ON_PHOTO =
  "state-layer inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-[15px] font-semibold text-[#23241E] shadow-md transition-transform duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const CTA_GHOST_ON_PHOTO =
  "inline-flex items-center justify-center rounded-full border border-white/55 bg-white/10 px-6 py-2.5 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/* ------------------------------------------------------------------ *
 *  Postmark — a cancellation-stamp SVG: dashed outer ring, a plain
 *  inner ring, two "cancellation wave" strokes, and curved micro-copy
 *  along the top and bottom arcs via textPath. Coloured by currentColor
 *  so callers just set a text-* class. Reused as a bookend: once on the
 *  hero (arriving mail) and once on the closing band (mail home again).
 * ------------------------------------------------------------------ */
function Postmark({
  size = 120,
  label = "RISHI VALLEY",
  sub = "ALUMNI POST",
  className,
}: {
  size?: number;
  label?: string;
  sub?: string;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <path id={`pm-top-${uid}`} d="M 16 62 A 44 44 0 0 1 104 62" fill="none" />
        <path id={`pm-bot-${uid}`} d="M 22 68 A 38 38 0 0 0 98 68" fill="none" />
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4.5" opacity="0.55" />
      <circle cx="60" cy="60" r="43" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.8" />
      <path d="M8 42 q9 -11 18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.45" />
      <path d="M8 80 q9 -11 18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.45" />
      <text fontSize="9" fontWeight="700" fill="currentColor">
        <textPath href={`#pm-top-${uid}`} startOffset="50%" textAnchor="middle" letterSpacing="2">
          {label}
        </textPath>
      </text>
      <text fontSize="7" fontWeight="600" fill="currentColor" opacity="0.85">
        <textPath href={`#pm-bot-${uid}`} startOffset="50%" textAnchor="middle" letterSpacing="3">
          {sub}
        </textPath>
      </text>
    </svg>
  );
}

/* A dashed-edge corner "stamp" that perches on a postcard's top corner —
   the corner nearest the ghost numeral/label, so the reading gutter between
   the two always has a decorative anchor instead of going bare. Mirrors
   with `reverse` (same reasoning as WashiTape's outer-edge placement, just
   the opposite corner): on a non-reversed row the label sits to the right
   of the postcard, so the stamp perches top-right; on a reversed row the
   label is to the left, so the stamp flips to top-left. */
function MiniStamp({ accent, reverse }: { accent: Accent; reverse: boolean }) {
  return (
    <div
      aria-hidden
      className={`absolute -top-3 z-20 flex h-11 w-9 flex-col items-center justify-center gap-0.5 rounded-[3px] border-2 border-dashed bg-card/95 shadow-[0_3px_8px_-4px_rgba(30,28,22,0.35)] ${
        reverse ? "-left-3 -rotate-[7deg]" : "-right-3 rotate-[7deg]"
      } ${ACCENT_BORDER_DASHED[accent]}`}
    >
      <PeaksMark size={13} className={ACCENT_TEXT[accent]} />
      <span className={`text-[5px] font-bold uppercase tracking-[0.08em] ${ACCENT_TEXT[accent]} opacity-80`}>post</span>
    </div>
  );
}

/* A strip of washi tape, tinted per feature accent, taping a postcard to the board. */
function WashiTape({ accent, className }: { accent: Accent; className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute z-20 h-6 w-20 rounded-[2px] ${className ?? ""}`}
      style={{
        background: `repeating-linear-gradient(45deg, color-mix(in srgb, ${ACCENT_VAR[accent]} 55%, transparent) 0 6px, color-mix(in srgb, ${ACCENT_VAR[accent]} 32%, transparent) 6px 12px)`,
        boxShadow: "0 2px 4px rgba(20,16,8,0.18)",
        opacity: 0.92,
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 *  HERO
 * ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-ink">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: 1.07 }}
        transition={{ duration: 28, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{ transformOrigin: "50% 42%" }}
      >
        <Image
          src={HERO_IMAGE_SRC}
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL={HERO_IMAGE_BLUR}
          className="object-cover"
          sizes="100vw"
          draggable={false}
        />
      </motion.div>

      {/* Warm dusk grade */}
      <div aria-hidden className="absolute inset-0" style={{ backgroundColor: "#C2622F", mixBlendMode: "multiply", opacity: 0.16 }} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(20,14,8,0.42) 0%, rgba(20,14,8,0.06) 32%, rgba(15,10,6,0.1) 55%, rgba(13,9,5,0.78) 100%)",
        }}
      />

      {/* Nav row */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 lg:px-14 lg:pt-8">
        <Link
          href="/"
          className="rounded-md outline-none transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ filter: "drop-shadow(0 1px 6px rgba(20,14,8,0.55))" }}
        >
          <Wordmark markClassName="text-white" textClassName="text-white" />
        </Link>
        <Link href="/login" className={`hidden text-[13px] sm:inline-flex ${CTA_GHOST_ON_PHOTO} !px-4 !py-1.5`}>
          {NAV.signIn}
        </Link>
      </div>

      {/* Corner stamp — the postcard's own postage */}
      <div className="pointer-events-none absolute right-6 top-20 z-10 hidden sm:block lg:right-16 lg:top-24">
        <div className="rotate-[9deg] rounded-[3px] border-2 border-dashed border-white/55 bg-white/10 px-3.5 py-3 backdrop-blur-[2px]">
          <PeaksMark size={28} variant="two-plane" />
          <p className="mt-1.5 text-center text-[8px] font-bold uppercase tracking-[0.14em] text-white/85">valley post</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center">
        <div className="w-full px-6 lg:px-14">
          <div className="flex items-end gap-5 sm:gap-7">
            <Postmark size={100} className="hidden shrink-0 text-white/65 sm:block lg:h-[120px] lg:w-[120px]" />
            <div className="relative">
              {/* Local scrim — the global dusk gradient is lightest through the
                  vertical middle of the hero (where this text sits), and the
                  headline/subhead can land over bright grass or the pale plinth
                  there, which starves the white text of contrast. This soft,
                  text-shaped patch darkens just behind the words regardless of
                  what the photo is doing underneath. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 -inset-y-10 -z-10 sm:-inset-x-16 sm:-inset-y-14"
                style={{
                  background:
                    "radial-gradient(ellipse at 38% 42%, rgba(11,9,5,0.6) 0%, rgba(11,9,5,0.34) 38%, rgba(11,9,5,0) 68%)",
                }}
              />
              <h1 className="font-heading text-4xl font-bold tracking-[-0.03em] text-[#FBF3E4] drop-shadow-lg sm:text-5xl lg:text-6xl">
                {HERO.headline}
              </h1>
              <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-white/90 drop-shadow-md sm:text-lg">
                {HERO.sub}
              </p>
            </div>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup" className={CTA_WHITE_ON_PHOTO}>
              {HERO.ctaPrimary}
            </Link>
            <Link href="/login" className={CTA_GHOST_ON_PHOTO}>
              {HERO.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 pb-7 text-white/80">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{HERO.scrollCue}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>
    </section>
  );
}

/* Torn/deckle edge: a thin mist-coloured strip with a zigzag bottom edge,
   the seam between the plain intro band and the pinboard beneath it. */
const ZIGZAG_CLIP = (() => {
  const teeth = 30;
  const depth = 7;
  const pts: string[] = ["0% 0%", "100% 0%"];
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? depth : 0;
    pts.push(`${x}% ${y}px`);
  }
  return `polygon(${pts.join(",")})`;
})();

function TornEdge() {
  return <div aria-hidden className="relative z-0 h-3.5 w-full bg-mist" style={{ clipPath: ZIGZAG_CLIP }} />;
}

function IntroBand() {
  return (
    <>
      <SectionReveal>
        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-[var(--space-l)] pt-[var(--space-xl)] text-center lg:pt-[var(--space-xxl)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">{INTRO.eyebrow}</p>
          <h2 className="mx-auto mt-3 max-w-[24ch] font-heading text-3xl font-bold leading-[1.3] tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem]">
            {INTRO.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-[1.7] text-muted-foreground text-balance">
            {INTRO.body}
          </p>
        </section>
      </SectionReveal>
      <TornEdge />
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  MAIL ROUTE — a dashed line threading down through the pinboard, with
 *  a small parcel travelling along it as the visitor scrolls the whole
 *  feature sequence. Two renders (centred desktop / left-aligned
 *  mobile) share the same scroll-linked position.
 * ------------------------------------------------------------------ */
function MailRoute({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start center", "end center"] });
  const top = useTransform(scrollYProgress, [0, 1], ["1%", "99%"]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-y-0 left-1/2 hidden w-0 -translate-x-1/2 border-l-2 border-dashed border-cinnamon/25 lg:block" />
      <motion.div style={{ top }} className="absolute left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
        <TravelIcon />
      </motion.div>
      <div className="absolute inset-y-0 left-3 w-0 border-l-2 border-dashed border-cinnamon/25 lg:hidden" />
      <motion.div style={{ top }} className="absolute left-3 z-10 -translate-x-1/2 -translate-y-1/2 lg:hidden">
        <TravelIcon />
      </motion.div>
    </div>
  );
}

function TravelIcon() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cinnamon text-white shadow-[0_5px_12px_-4px_var(--color-cinnamon)]">
      <Mail className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  Postcard frame — the photo, papered and pinned like a real postcard
 *  set down on the board: a slight rotation, washi tape, a dashed-edge
 *  stamp, and a handwritten-feel caption underneath.
 * ------------------------------------------------------------------ */
function PostcardFrame({ feature, reverse }: { feature: FeatureCopy; reverse: boolean }) {
  const s = SHOTS[feature.shot.name];
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [14, -14]);
  const rotate = reverse ? 1.4 : -1.4;

  return (
    <div ref={ref} className="relative">
      <WashiTape accent={feature.accent} className={reverse ? "-top-3 right-9 rotate-[7deg]" : "-top-3 left-9 -rotate-[7deg]"} />
      <motion.div
        data-shot
        style={{ rotate, y }}
        className="card-elevated relative rounded-[10px] border border-border bg-card p-2.5 pb-9 sm:p-3 sm:pb-10"
      >
        <div className="overflow-hidden rounded-[4px] border border-border/70">
          <Image
            src={s.src}
            alt={feature.shot.alt}
            width={s.w}
            height={s.h}
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 560px"
            placeholder="blur"
            blurDataURL={s.blur}
            className={`aspect-[16/9] h-auto w-full object-cover sm:aspect-auto ${MOBILE_CROP_POSITION[feature.shot.name]}`}
          />
        </div>
        <p
          className={`mt-2.5 text-center font-heading text-[14px] italic ${ACCENT_TEXT[feature.accent]}`}
          style={{ transform: "rotate(-1deg)" }}
        >
          {feature.eyebrow}
        </p>
        <MiniStamp accent={feature.accent} reverse={reverse} />
      </motion.div>
    </div>
  );
}

function GhostNumeral({ feature, reverse }: { feature: FeatureCopy; reverse: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -top-9 z-0 hidden select-none items-center justify-center rounded-full border border-dashed lg:flex ${ACCENT_BORDER_FAINT[feature.accent]} ${
        reverse ? "right-0" : "left-0"
      }`}
      style={{ height: "7.2rem", width: "7.2rem" }}
    >
      <span className={`font-heading text-[5.2rem] font-bold leading-none ${ACCENT_GHOST[feature.accent]}`}>
        {String(feature.index).padStart(2, "0")}
      </span>
    </span>
  );
}

function FeatureRow({ feature, reverse }: { feature: FeatureCopy; reverse: boolean }) {
  return (
    <SectionReveal>
      <div
        className={`relative z-10 grid items-center gap-10 lg:gap-16 ${
          reverse ? "lg:grid-cols-[1.05fr_1fr]" : "lg:grid-cols-[1fr_1.05fr]"
        }`}
      >
        <div className={`relative z-10 ${reverse ? "lg:order-2" : ""}`}>
          <PostcardFrame feature={feature} reverse={reverse} />
        </div>
        <div className={`relative z-10 ${reverse ? "lg:order-1" : ""}`}>
          <GhostNumeral feature={feature} reverse={reverse} />
          <p className={`relative text-[11px] font-bold uppercase tracking-[0.16em] ${ACCENT_TEXT[feature.accent]}`}>
            {feature.eyebrow}
          </p>
          <h3 className="relative mt-3 max-w-[20ch] font-heading text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-foreground text-balance sm:text-4xl">
            {feature.title}
          </h3>
          <p className="relative mt-4 max-w-[52ch] text-[15.5px] leading-[1.7] text-muted-foreground">{feature.body}</p>
          {feature.bullets && feature.bullets.length > 0 && (
            <ul className="relative mt-5 space-y-2">
              {feature.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-foreground">
                  <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-current ${ACCENT_TEXT[feature.accent]}`} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionReveal>
  );
}

/* The corked, stippled board holding all five postcards + the mail route. */
function Board() {
  const boardRef = useRef<HTMLDivElement>(null);
  return (
    <div
      className="relative bg-mist"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(35,36,30,0.055) 1px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        ref={boardRef}
        className="relative mx-auto max-w-6xl space-y-20 px-6 py-[var(--space-xl)] lg:space-y-28 lg:px-8 lg:py-[var(--space-xxl)]"
      >
        <MailRoute targetRef={boardRef} />
        {FEATURES.map((feature, i) => (
          <FeatureRow key={feature.index} feature={feature} reverse={i % 2 === 1} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  TRUST — an envelope-flap card with a wax-seal-style vouched badge.
 * ------------------------------------------------------------------ */
const VOUCHED = [
  { id: "trust-a", name: "Ananya Krishnan" },
  { id: "trust-b", name: "Rohan Mehta" },
  { id: "trust-c", name: "Meera Iyer" },
  { id: "trust-d", name: "Arjun Reddy" },
  { id: "trust-e", name: "Fatima Sheikh" },
];

function SealBadge() {
  return (
    <div className="relative flex h-52 w-52 flex-col items-center justify-center rounded-full border-2 border-dashed border-cinnamon/40 bg-cinnamon/[0.05] px-6 text-center sm:h-56 sm:w-56">
      <div className="flex -space-x-3">
        {VOUCHED.map((u) => (
          <span key={u.id} className="rounded-full ring-2 ring-card">
            <BirdAvatar user={u} size="sm" />
          </span>
        ))}
      </div>
      <p className="mt-4 max-w-[24ch] text-[12.5px] leading-relaxed text-muted-foreground">{TRUST.vouchedNote}</p>
      <span
        className="absolute -bottom-3 rotate-[-3deg] whitespace-nowrap rounded-full bg-cinnamon px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_8px_18px_-8px_var(--color-cinnamon)]"
      >
        {TRUST.vouchedBadge}
      </span>
    </div>
  );
}

function Trust() {
  return (
    <SectionReveal>
      <div className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-border bg-card px-7 pb-12 pt-16 sm:px-14 sm:pb-16 sm:pt-20">
        {/* Envelope flap */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-16 sm:h-20">
          <div
            className="absolute inset-x-0 top-0 h-16 bg-cinnamon/[0.08] sm:h-20"
            style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
          />
          <div
            className="absolute inset-x-0 top-0 h-16 sm:h-20"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              boxShadow: "inset 0 -1px 0 rgba(194,98,47,0.25)",
            }}
          />
        </div>
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">{TRUST.eyebrow}</p>
            <h3 className="mt-3 max-w-[20ch] font-heading text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-foreground text-balance sm:text-4xl">
              {TRUST.heading}
            </h3>
            <p className="mt-4 max-w-[52ch] text-[15.5px] leading-[1.7] text-muted-foreground">{TRUST.body1}</p>
            <p className="mt-5 max-w-[52ch] text-[15.5px] font-medium leading-[1.7] text-foreground">{TRUST.body2}</p>
          </div>
          <div className="flex flex-col items-center">
            <SealBadge />
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}

/* ------------------------------------------------------------------ *
 *  CLOSING — the return-address postmark, bookending the hero's.
 * ------------------------------------------------------------------ */
function ClosingCTA() {
  return (
    <footer className="relative border-t border-border bg-leaf/[0.06]">
      <div id="closing-cta" className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-20">
        <Postmark size={92} className="mx-auto text-cinnamon/65" label="RETURN TO" sub="THE VALLEY" />
        <h2 className="mt-6 font-heading text-3xl font-bold tracking-[-0.03em] text-foreground text-balance sm:text-[2.6rem] sm:leading-[1.08]">
          {FOOTER.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-[1.7] text-muted-foreground text-balance">{FOOTER.body}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={CTA_CANOPY}>
            {FOOTER.ctaPrimary}
          </Link>
          <Link href="/login" className={CTA_GHOST_LIGHT}>
            {FOOTER.ctaSecondary}
          </Link>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-5 text-[13px] text-muted-foreground sm:flex-row">
          <Wordmark variant="light" textClassName="text-foreground" />
          <p>{FOOTER.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

export default function PostcardVariant() {
  return (
    <div className="relative bg-background">
      <AmbientLeaves />
      <PerchingBirds />
      <LandingNav />

      <Hero />
      <IntroBand />
      <Board />

      <div className="mx-auto max-w-6xl px-6 pb-[var(--space-l)] pt-[var(--space-xl)] lg:px-8 lg:pb-[var(--space-xl)] lg:pt-[var(--space-xxl)]">
        <Trust />
      </div>

      <ClosingCTA />
    </div>
  );
}
