"use client";

/* ------------------------------------------------------------------ *
 *  Concept: The Notice Board.
 *
 *  The whole page is one long cork board. Every piece of content is a
 *  pinned artifact — a polaroid, an index card, an envelope, a bold
 *  tacked note — laid out on a real CSS grid so the "pinned chaos"
 *  reads as composed, not messy: each artifact sits in its grid cell,
 *  rotation is a small fixed offset (never enough to fight the grid),
 *  and the accent colour of a feature always matches its pin and any
 *  washi tape.
 *
 *  Signature moments:
 *   1. The board itself — a warm cork texture (layered radial dots +
 *      grain) that runs the full page height behind every section, so
 *      there is never a flat dead zone between artifacts.
 *   2. Pinned artifacts with real materiality: push-pins with a
 *      highlight + cast shadow, curling paper corners on the index
 *      cards, a torn-edge banner for the hero, an envelope with a
 *      letter peeking out for the Letters feature.
 *   3. Picking a card up on hover — it un-rotates slightly and lifts
 *      (shadow deepens), like a hand is about to take it off the
 *      board. Every pin, card and CTA note gets hover/focus/active.
 *
 *  Copy pulled verbatim from ./_shared. No new marketing prose.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import Image from "next/image";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { SectionReveal } from "@/components/landing/section-reveal";
import {
  NAV,
  HERO,
  INTRO,
  FEATURES,
  TRUST,
  FOOTER,
  SHOTS,
  HERO_IMAGE_SRC,
  HERO_IMAGE_BLUR,
  type Accent,
} from "./_shared";

/* ------------------------------------------------------------------ *
 *  Accent tokens — every pin, tape strip and eyebrow for a feature
 *  pulls from the same map, so colour-coding reads as a system.
 * ------------------------------------------------------------------ */
const ACCENT_HEX: Record<Accent, string> = {
  leaf: "#1F8A4C",
  blue: "#3F7CA6",
  cinnamon: "#C2622F",
};
const ACCENT_TEXT: Record<Accent, string> = {
  leaf: "text-leaf",
  blue: "text-sky",
  cinnamon: "text-cinnamon",
};
/* ------------------------------------------------------------------ *
 *  CorkBoard — the full-bleed textured background. Two tiled radial-
 *  gradient layers (fine grain + coarser fleck) over the warm paper
 *  base, plus a very soft vignette so the board reads as one material
 *  from hero to footer rather than a flat colour swap between
 *  sections. Pure CSS, no images, so it never blocks paint.
 * ------------------------------------------------------------------ */
function CorkBoard() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[#D3B98C]" />
      {/* natural mottling: irregular warm/cool patches so the board reads as
          real cork, not a flat tint */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 32% 22% at 12% 10%, rgba(166,131,84,0.5), transparent 60%)," +
            "radial-gradient(ellipse 28% 30% at 85% 6%, rgba(213,178,132,0.55), transparent 62%)," +
            "radial-gradient(ellipse 40% 26% at 22% 42%, rgba(150,116,72,0.4), transparent 60%)," +
            "radial-gradient(ellipse 34% 30% at 92% 38%, rgba(224,193,150,0.5), transparent 60%)," +
            "radial-gradient(ellipse 36% 24% at 8% 72%, rgba(224,193,150,0.45), transparent 60%)," +
            "radial-gradient(ellipse 30% 28% at 68% 66%, rgba(150,116,72,0.4), transparent 60%)," +
            "radial-gradient(ellipse 30% 24% at 40% 92%, rgba(213,178,132,0.5), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.65]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(82,55,22,0.22) 1px, transparent 0)",
          backgroundSize: "8px 8px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 3px 3px, rgba(60,38,14,0.2) 1.7px, transparent 0)",
          backgroundSize: "25px 21px",
          backgroundPosition: "12px 6px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 5px 5px, rgba(40,26,10,0.3) 2.4px, transparent 0)",
          backgroundSize: "71px 63px",
          backgroundPosition: "30px 40px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 140% 55% at 50% 0%, rgba(255,247,228,0.22), transparent 55%), radial-gradient(ellipse 120% 60% at 50% 100%, rgba(40,26,10,0.22), transparent 60%), radial-gradient(ellipse 90% 70% at 50% 45%, transparent 55%, rgba(40,26,10,0.08) 100%)",
        }}
      />
    </div>
  );
}

/* Push-pin: a round head with a highlight + a soft cast shadow onto the
 * board, colour keyed to a feature's accent (or ink/cinnamon for the
 * neutral chrome pins in the hero and footer). */
function Pin({
  color = "#8A3324",
  size = 15,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 block ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), ${color} 44%, ${color} 100%)`,
          boxShadow: `0 ${size * 0.32}px ${size * 0.36}px -${size * 0.16}px rgba(35,24,12,0.55), 0 1px 0 rgba(255,255,255,0.3) inset`,
        }}
      />
    </span>
  );
}

/* Small strip of washi tape, angled, low-opacity accent colour. */
function Tape({
  color,
  className = "",
  rotate = -4,
  width = 58,
}: {
  color: string;
  className?: string;
  rotate?: number;
  width?: number;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute block ${className}`}
      style={{
        width,
        height: width * 0.42,
        background: color,
        opacity: 0.55,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 1px 3px rgba(35,24,12,0.18)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 *  PinnedCard — the workhorse artifact: a slightly rotated card with a
 *  curled bottom-right corner and a pin at top, that un-rotates and
 *  lifts on hover/focus (picked up off the board). transform/opacity
 *  only, spring-driven.
 * ------------------------------------------------------------------ */
function PinnedCard({
  children,
  rotate = -1.6,
  pinColor = "#8A3324",
  pinSide = "center",
  className = "",
  paper = "lined",
  tabIndex,
  style,
  tag,
}: {
  children: ReactNode;
  rotate?: number;
  pinColor?: string;
  pinSide?: "left" | "center" | "right";
  className?: string;
  paper?: "lined" | "plain" | "kraft";
  tabIndex?: number;
  style?: CSSProperties;
  /** A batch-year tag clipped onto this card's own corner, never floating
   * free in the margins. */
  tag?: { label: string; color: string; rotate?: number; side?: "left" | "right" };
}) {
  const pinPos =
    pinSide === "left" ? "left-5" : pinSide === "right" ? "right-5" : "left-1/2 -translate-x-1/2";
  const paperBg =
    paper === "lined"
      ? {
          backgroundColor: "#FBF7EC",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 26px, rgba(63,124,166,0.12) 27px)",
          backgroundPosition: "0 14px",
        }
      : paper === "kraft"
        ? { backgroundColor: "#EADFC4" }
        : { backgroundColor: "#FBF7EC" };
  return (
    <motion.div
      tabIndex={tabIndex}
      initial={{ rotate }}
      whileHover={{ rotate: rotate * 0.25, y: -6, scale: 1.015 }}
      whileFocus={{ rotate: rotate * 0.25, y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985, y: -2 }}
      transition={SPRINGS.snappy}
      style={{ ...paperBg, ...style }}
      className={`group relative rounded-[3px] border border-black/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-canopy/50 ${className}`}
    >
      {/* curled corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-tl-[10px]"
        style={{
          background: "linear-gradient(135deg, transparent 50%, rgba(35,24,12,0.14) 50%)",
        }}
      />
      <Pin color={pinColor} className={`-top-[9px] ${pinPos}`} />
      {tag && (
        <BatchTag
          label={tag.label}
          color={tag.color}
          rotate={tag.rotate}
          className={`hidden sm:flex -top-3 ${tag.side === "left" ? "-left-3" : "-right-3"}`}
        />
      )}
      {children}
    </motion.div>
  );
}

/* Polaroid-style screenshot frame: white mat, caption strip, pinned. */
function Polaroid({
  shotKey,
  alt,
  rotate,
  pinColor,
  captionLabel,
}: {
  shotKey: keyof typeof SHOTS;
  alt: string;
  rotate: number;
  pinColor: string;
  captionLabel: string;
}) {
  const shot = SHOTS[shotKey];
  return (
    <motion.div
      initial={{ rotate }}
      whileHover={{ rotate: rotate * 0.2, y: -8, scale: 1.012 }}
      whileFocus={{ rotate: rotate * 0.2, y: -8, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      transition={SPRINGS.snappy}
      tabIndex={0}
      className="group relative w-full max-w-[420px] rounded-[4px] bg-[#FCFAF3] p-[10px] pb-[30px] shadow-[0_2px_3px_rgba(35,24,12,0.12),0_22px_38px_-24px_rgba(35,24,12,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-canopy/50 sm:p-3 sm:pb-9"
    >
      <Pin color={pinColor} size={17} className="-top-[10px] left-1/2 -translate-x-1/2" />
      <Tape color={pinColor} rotate={-10} width={44} className="-right-2.5 -top-2.5" />
      <div className="relative overflow-hidden rounded-[2px] border border-black/[0.08] bg-mist">
        <Image
          src={shot.src}
          alt={alt}
          width={shot.w}
          height={shot.h}
          loading="lazy"
          sizes="(max-width: 640px) 88vw, 420px"
          placeholder="blur"
          blurDataURL={shot.blur}
          className="h-auto w-full"
        />
      </div>
      <p
        className="mt-2 truncate text-center text-[12.5px] italic text-[#5B4A34] sm:mt-2.5"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {captionLabel}
      </p>
    </motion.div>
  );
}

/* Bold tacked note used for primary CTAs — reads like a hand-torn card
 * stapled to the board, canopy fill so it stays the one CTA colour. */
function TackedButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const primary = variant === "primary";
  return (
    <motion.div
      whileHover={{ y: -3, rotate: primary ? -1 : 1 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={SPRINGS.snappy}
      className={`relative inline-block ${className}`}
    >
      <Pin
        color={primary ? "#C2622F" : "#3F7CA6"}
        size={14}
        className="-top-[7px] left-1/2 -translate-x-1/2"
      />
      <Link
        href={href}
        className={`inline-flex items-center justify-center rounded-[3px] px-7 py-3.5 text-[15px] font-bold outline-none transition-[box-shadow,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#DCC9A3] ${
          primary
            ? "bg-canopy text-white shadow-[0_1px_1px_rgba(255,255,255,0.15)_inset,0_16px_28px_-16px_rgba(35,92,73,0.75)] hover:bg-canopy/95 focus-visible:ring-canopy/60"
            : "border-2 border-[#3F7CA6]/70 bg-[#FBF7EC] text-[#2A4E63] shadow-[0_10px_20px_-14px_rgba(35,24,12,0.5)] hover:bg-float focus-visible:ring-sky/50"
        }`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

/* Simple leaf glyph tucked under a pin — static/near-static decoration,
 * natural-toned, always kept behind or beside content, never a wall of
 * ambient motion. A hair of idle rotation only, so it reads alive but calm. */
function TuckedLeaf({ className = "", color = "#5B7A3A", rotate = -8, size = 30 }: { className?: string; color?: string; rotate?: number; size?: number }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`pointer-events-none absolute z-0 ${className}`}
      style={{ color }}
      initial={{ rotate: rotate - 3 }}
      animate={{ rotate: rotate + 3 }}
      transition={{ duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    >
      <path d="M20 4C10 4 4 10 4 20c0 0 6-1 10-5s6-11 6-11Z" fill="currentColor" opacity="0.85" />
      <path d="M17 7C12 9 8 13 6 18" stroke="#F6F2E8" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </motion.svg>
  );
}

/* Batch tag — a small die-cut label clipped directly onto the corner of a
 * pinned card, the concept's "batch-group" idea made literal without ever
 * floating free in open cork: it always overlaps the card it belongs to, so
 * it reads as one artifact (card + tag) rather than a second thing the eye
 * has to place on its own. Sized to sit half on, half off the card edge. */
function BatchTag({
  label,
  color,
  rotate = -8,
  className = "",
}: {
  label: string;
  color: string;
  rotate?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ rotate }}
      whileHover={{ rotate: rotate * 0.35, y: -3, scale: 1.08 }}
      whileFocus={{ rotate: rotate * 0.35, y: -3, scale: 1.08 }}
      transition={SPRINGS.snappy}
      tabIndex={0}
      className={`group absolute z-20 flex h-[32px] w-[54px] cursor-default items-center justify-center rounded-[3px] border border-black/10 text-center outline-none shadow-[0_8px_16px_-10px_rgba(35,24,12,0.6)] focus-visible:ring-2 focus-visible:ring-canopy/50 ${className}`}
      style={{ backgroundColor: "#EADFC4" }}
    >
      <span aria-hidden className="absolute left-1.5 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-[#D3B98C]" />
      <span className="font-heading text-[12px] font-bold leading-none" style={{ color }}>
        {label}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 *  Feature story — a polaroid + an index-card blurb, alternating sides
 *  on a two-column grid (stacked on mobile). Every field pulled from
 *  ./_shared FEATURES.
 * ------------------------------------------------------------------ */
function FeatureStory({ f, flip }: { f: (typeof FEATURES)[number]; flip: boolean }) {
  const hex = ACCENT_HEX[f.accent];
  const photoSide = (
    <div className="flex justify-center sm:justify-end">
      <Polaroid
        shotKey={f.shot.name}
        alt={f.shot.alt}
        rotate={flip ? 2.2 : -2.4}
        pinColor={hex}
        captionLabel={f.eyebrow}
      />
    </div>
  );
  const textSide = (
    <div className="relative flex justify-center sm:justify-start">
      <PinnedCard
        rotate={flip ? -1.4 : 1.6}
        pinColor={hex}
        pinSide={flip ? "left" : "right"}
        paper="lined"
        className="w-full max-w-[460px] px-7 py-8 shadow-[0_2px_3px_rgba(35,24,12,0.1),0_20px_34px_-22px_rgba(35,24,12,0.5)] sm:px-8 sm:py-9"
        tag={{
          label: f.index % 2 === 0 ? "'99" : "'14",
          color: hex,
          rotate: flip ? 10 : -10,
          side: flip ? "right" : "left",
        }}
      >
        <span
          aria-hidden
          className="absolute left-6 top-6 select-none font-heading text-[64px] font-bold leading-none opacity-[0.08] sm:text-[76px]"
          style={{ color: hex }}
        >
          {String(f.index).padStart(2, "0")}
        </span>
        <div className="relative">
          <p className={`text-[11.5px] font-bold uppercase tracking-[0.16em] ${ACCENT_TEXT[f.accent]}`}>
            {f.eyebrow}
          </p>
          <h3 className="mt-2.5 font-heading text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#2B2418] sm:text-[29px]">
            {f.title}
          </h3>
          <p className="mt-3.5 text-[15.5px] leading-[1.7] text-[#4A4436]">{f.body}</p>
          {f.bullets && (
            <ul className="mt-4 space-y-2">
              {f.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-[14px] leading-[1.6] text-[#5B5646]">
                  <span
                    aria-hidden
                    className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{ backgroundColor: hex }}
                  />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PinnedCard>
    </div>
  );
  return (
    <div className="relative mx-auto grid max-w-[840px] grid-cols-1 items-center gap-7 sm:grid-cols-2 sm:gap-4">
      {flip ? (
        <>
          {textSide}
          {photoSide}
        </>
      ) : (
        <>
          {photoSide}
          {textSide}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Sticky nav rail — reads as the board's top wooden rail: a slim strip
 *  in a deeper wood tone the pins and cards sit just under.
 * ------------------------------------------------------------------ */
function BoardNav() {
  return (
    <header className="sticky top-0 z-[var(--z-elevated)]">
      <div
        className="flex items-center justify-between gap-4 border-b-[3px] px-5 py-3.5 sm:px-9"
        style={{
          background: "linear-gradient(180deg, #F8F1DC 0%, #F1E6C9 100%)",
          borderColor: "#235C49",
          boxShadow: "0 6px 16px -10px rgba(35,24,12,0.3)",
        }}
      >
        <Link
          href="/preview/delight"
          className="rounded-md outline-none transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-canopy/60 active:translate-y-0"
        >
          <Wordmark size={22} fontSize={17} variant="light" textClassName="text-[#241E14]" />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-[14px] font-bold text-[#2F2A1C] outline-none transition-[color,transform] duration-150 hover:text-canopy focus-visible:ring-2 focus-visible:ring-canopy/50 active:scale-[0.97] sm:inline-flex"
          >
            {NAV.signIn}
          </Link>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} transition={SPRINGS.snappy}>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-canopy px-5 py-2 text-[14px] font-bold text-white shadow-[0_1px_1px_rgba(255,255,255,0.2)_inset,0_10px_22px_-10px_rgba(35,92,73,0.85)] outline-none transition-colors duration-150 hover:bg-canopy/95 focus-visible:ring-2 focus-visible:ring-canopy/60 focus-visible:ring-offset-2"
            >
              {NAV.join}
            </Link>
          </motion.div>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 *  Hero — a big torn-paper banner pinned front and center, the hero
 *  photo as a large tilted photograph beside it, string-tacked CTA
 *  notes below.
 * ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-visible px-5 pb-10 pt-12 sm:px-9 sm:pb-14 sm:pt-16">
      <TuckedLeaf className="left-[6%] top-[8%] hidden sm:block" rotate={-18} size={38} />
      <TuckedLeaf className="right-[9%] top-[46%] hidden sm:block" color="#B45A2B" rotate={14} size={30} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="relative">
          <motion.div
            initial={{ rotate: -1.4, opacity: 0, y: 14 }}
            animate={{ rotate: -1.4, opacity: 1, y: 0 }}
            transition={SPRINGS.gentle}
            className="relative rounded-[3px] border border-black/[0.06] bg-[#FBF7EC] px-7 py-9 shadow-[0_2px_4px_rgba(35,24,12,0.1),0_28px_50px_-28px_rgba(35,24,12,0.55)] sm:px-10 sm:py-12"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(63,124,166,0.1) 31px)",
            }}
          >
            <Pin color="#8A3324" size={19} className="-top-[10px] left-9" />
            <Pin color="#C2622F" size={19} className="-top-[10px] right-9" />
            <BatchTag label="'02" color="#3F7CA6" rotate={-9} className="hidden sm:flex -right-3 top-6" />
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-cinnamon">
              Rishi Valley, on one board
            </p>
            <h1 className="mt-4 max-w-lg font-heading text-[38px] font-bold leading-[1.08] tracking-[-0.03em] text-[#241E14] sm:text-[52px]">
              {HERO.headline}
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-[1.7] text-[#4A4436]">{HERO.sub}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-8">
              <TackedButton href="/signup" variant="primary">
                {HERO.ctaPrimary}
              </TackedButton>
              <TackedButton href="/login" variant="secondary">
                {HERO.ctaSecondary}
              </TackedButton>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ rotate: 3, opacity: 0, y: 18 }}
          animate={{ rotate: 3, opacity: 1, y: 0 }}
          whileHover={{ rotate: 1.2, y: -6 }}
          transition={SPRINGS.gentle}
          tabIndex={0}
          className="group relative mx-auto w-full max-w-[380px] rounded-[4px] bg-[#FCFAF3] p-3 pb-9 outline-none shadow-[0_2px_4px_rgba(35,24,12,0.14),0_30px_50px_-26px_rgba(35,24,12,0.6)] focus-visible:ring-2 focus-visible:ring-canopy/50 sm:p-3.5 sm:pb-11"
        >
          <Pin color="#3F7CA6" size={19} className="-top-[11px] left-1/2 -translate-x-1/2" />
          <BatchTag label="'11" color="#C2622F" rotate={9} className="hidden sm:flex -bottom-3 -left-3" />
          <div className="relative overflow-hidden rounded-[2px] border border-black/[0.08] bg-mist">
            <Image
              src={HERO_IMAGE_SRC}
              alt="The valley"
              width={760}
              height={950}
              priority
              placeholder="blur"
              blurDataURL={HERO_IMAGE_BLUR}
              sizes="(max-width: 640px) 84vw, 380px"
              className="h-auto w-full"
            />
          </div>
          <p
            className="mt-2.5 text-center text-[13px] italic text-[#5B4A34]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {HERO.scrollCue}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Intro band — a wide open "letter" on the board (no envelope yet,
 *  that's saved for the Letters feature below).
 * ------------------------------------------------------------------ */
function IntroBand() {
  return (
    <section className="relative px-5 pb-10 sm:px-9 sm:pb-14">
      <div className="relative mx-auto max-w-3xl">
        <TuckedLeaf className="-left-16 top-1/2 hidden xl:block" color="#8A9E5E" rotate={-30} size={26} />
        <SectionReveal>
          <PinnedCard
            rotate={-0.8}
            pinColor="#4A5A38"
            paper="plain"
            className="px-8 py-10 sm:px-12 sm:py-12"
            tag={{ label: "'93", color: "#1F8A4C", rotate: 7, side: "left" }}
          >
            <Tape color="#3F7CA6" rotate={-6} width={64} className="-top-3 right-10" />
            <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-leaf">{INTRO.eyebrow}</p>
            <h2 className="mt-3 font-heading text-[26px] font-bold leading-[1.28] tracking-[-0.02em] text-[#241E14] sm:text-[32px]">
              {INTRO.heading}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.75] text-[#4A4436]">{INTRO.body}</p>
          </PinnedCard>
        </SectionReveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Letters feature gets a bespoke envelope treatment layered behind
 *  its polaroid slot, per the concept brief ("a letter peeking out of
 *  an envelope"). Swapped in for FEATURES[2] (Letters).
 * ------------------------------------------------------------------ */
function EnvelopeArt({ alt, shotKey }: { alt: string; shotKey: keyof typeof SHOTS }) {
  const shot = SHOTS[shotKey];
  return (
    <div className="relative flex justify-center sm:justify-end">
      <motion.div
        initial={{ rotate: -2.2 }}
        whileHover={{ rotate: -0.6, y: -8 }}
        whileFocus={{ rotate: -0.6, y: -8 }}
        transition={SPRINGS.snappy}
        tabIndex={0}
        className="group relative w-full max-w-[380px] outline-none focus-visible:ring-2 focus-visible:ring-cinnamon/50"
      >
        {/* the letter, peeking up out of the envelope */}
        <div className="relative z-0 -mb-14 w-full rounded-t-[3px] bg-[#FCFAF3] px-6 pb-16 pt-6 shadow-[0_-2px_6px_-4px_rgba(35,24,12,0.2)]">
          <div className="overflow-hidden rounded-[2px] border border-black/[0.08] bg-mist">
            <Image
              src={shot.src}
              alt={alt}
              width={shot.w}
              height={shot.h}
              loading="lazy"
              sizes="(max-width: 640px) 84vw, 380px"
              placeholder="blur"
              blurDataURL={shot.blur}
              className="h-auto w-full"
            />
          </div>
        </div>
        {/* the envelope pocket, sitting in front of the letter's lower half */}
        <div className="relative z-10">
          <svg viewBox="0 0 380 220" className="block w-full drop-shadow-[0_22px_34px_rgba(35,24,12,0.4)]">
            <path d="M0 18C0 8 8 0 18 0h344c10 0 18 8 18 18v184c0 10-8 18-18 18H18C8 220 0 212 0 202Z" fill="#E4C9A0" />
            <path d="M0 18c0-10 8-18 18-18h344c10 0 18 8 18 18L190 138Z" fill="#EFDAB6" />
            <path d="M0 202 130 108" stroke="#C7A876" strokeWidth="2" opacity="0.6" />
            <path d="M380 202 250 108" stroke="#C7A876" strokeWidth="2" opacity="0.6" />
          </svg>
        </div>
        <Pin color="#C2622F" size={17} className="-top-[10px] left-1/2 -translate-x-1/2" />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Trust band — "invite only", styled as a small notice with a rubber-
 *  stamp badge for the vouched count.
 * ------------------------------------------------------------------ */
function TrustBand() {
  return (
    <section className="relative px-5 pb-8 sm:px-9 sm:pb-10">
      <SectionReveal className="relative mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-[1fr_auto] md:gap-14">
        <TuckedLeaf className="-right-14 bottom-0 hidden xl:block" color="#B45A2B" rotate={16} size={28} />
        <PinnedCard
          rotate={1.1}
          pinColor="#8A3324"
          paper="kraft"
          pinSide="left"
          className="px-8 py-9 sm:px-10 sm:py-10"
          tag={{ label: "'05", color: "#8A3324", rotate: -9, side: "right" }}
        >
          <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-cinnamon">{TRUST.eyebrow}</p>
          <h2 className="mt-3 font-heading text-[27px] font-bold leading-[1.2] tracking-[-0.02em] text-[#241E14] sm:text-[31px]">
            {TRUST.heading}
          </h2>
          <p className="mt-4 text-[15.5px] leading-[1.72] text-[#4A4436]">{TRUST.body1}</p>
          <p className="mt-3.5 text-[15.5px] leading-[1.72] text-[#4A4436]">{TRUST.body2}</p>
        </PinnedCard>

        <motion.div
          initial={{ rotate: -6 }}
          whileHover={{ rotate: -2, scale: 1.04 }}
          transition={SPRINGS.snappy}
          tabIndex={0}
          className="relative mx-auto flex h-[168px] w-[168px] shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-dashed border-canopy/60 bg-[#FBF7EC] px-4 text-center shadow-[0_18px_30px_-18px_rgba(35,24,12,0.5)] outline-none focus-visible:ring-2 focus-visible:ring-canopy/50 sm:h-[188px] sm:w-[188px]"
        >
          <span className="font-heading text-[26px] font-bold leading-none text-canopy sm:text-[30px]">10</span>
          <span className="mt-1.5 text-[11px] font-bold uppercase leading-[1.4] tracking-[0.1em] text-[#3B5648]">
            {TRUST.vouchedBadge.replace("10 ", "")}
          </span>
        </motion.div>
      </SectionReveal>
      <p className="relative mx-auto mt-6 max-w-5xl text-center text-[13.5px] italic leading-[1.6] text-[#5B5646] md:text-left">
        {TRUST.vouchedNote}
        <TuckedLeaf className="left-1/2 top-full mt-2 hidden -translate-x-1/2 sm:block" color="#8A9E5E" rotate={-20} size={22} />
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 *  Closing CTA — the biggest tacked note on the board.
 * ------------------------------------------------------------------ */
function ClosingCta() {
  return (
    <section id="closing-cta" className="relative px-5 pb-10 pt-6 sm:px-9 sm:pb-14 sm:pt-10">
      <SectionReveal className="mx-auto max-w-3xl">
        <motion.div
          initial={{ rotate: -0.6 }}
          whileHover={{ rotate: 0 }}
          transition={SPRINGS.gentle}
          className="relative rounded-[4px] px-8 py-12 text-center shadow-[0_2px_4px_rgba(255,255,255,0.06)_inset,0_30px_54px_-26px_rgba(20,40,32,0.6)] sm:px-14 sm:py-16"
          style={{ background: "linear-gradient(175deg, #2C6B54 0%, #1E4E3D 100%)" }}
        >
          <Pin color="#EDB730" size={20} className="-top-[11px] left-10" />
          <Pin color="#EDB730" size={20} className="-top-[11px] right-10" />
          <TuckedLeaf className="left-6 bottom-6 hidden sm:block" color="#7FBF8E" rotate={20} size={26} />
          <h2 className="font-heading text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-white sm:text-[36px]">
            {FOOTER.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-[1.72] text-[#DCEEE3]">{FOOTER.body}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-8">
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} transition={SPRINGS.snappy}>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-float px-7 py-3.5 text-[15px] font-bold text-canopy shadow-[0_16px_28px_-16px_rgba(0,0,0,0.5)] outline-none transition-colors duration-150 hover:bg-[#F6F2E8] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E4E3D] active:scale-[0.97]"
              >
                {FOOTER.ctaPrimary}
              </Link>
            </motion.div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/50 px-7 py-3.5 text-[15px] font-bold text-white outline-none transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E4E3D] active:translate-y-0 active:scale-[0.97]"
            >
              {FOOTER.ctaSecondary}
            </Link>
          </div>
        </motion.div>
      </SectionReveal>
    </section>
  );
}

/* Footer — the board's bottom wooden rail, mirroring BoardNav. */
function BoardFooter() {
  return (
    <footer
      className="relative border-t-[3px] px-5 py-8 sm:px-9"
      style={{ background: "linear-gradient(0deg, #1E4E3D 0%, #275E4A 100%)", borderColor: "#173B2E" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <Wordmark
          size={19}
          fontSize={15}
          variant="solid"
          markClassName="text-[#F3ECDA]"
          textClassName="text-[#F3ECDA]"
        />
        <p className="max-w-sm text-[13px] leading-[1.6] text-[#CFE3D8]">{FOOTER.tagline}</p>
      </div>
    </footer>
  );
}

export default function NoticeboardVariant() {
  const boardRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={boardRef} className="relative overflow-hidden">
      <CorkBoard />
      <BoardNav />
      <Hero />
      <IntroBand />

      <section className="relative flex flex-col gap-7 px-5 pb-10 sm:gap-9 sm:px-9 sm:pb-14">
        {FEATURES.map((f, i) => (
          <SectionReveal key={f.index} delay={i === 0 ? 0 : 40}>
            {f.eyebrow === "Letters" ? (
              <div className="relative mx-auto grid max-w-[840px] grid-cols-1 items-center gap-7 sm:grid-cols-2 sm:gap-4">
                <EnvelopeArt alt={f.shot.alt} shotKey={f.shot.name} />
                <div className="relative flex justify-center sm:justify-start">
                  <PinnedCard
                    rotate={1.4}
                    pinColor={ACCENT_HEX[f.accent]}
                    pinSide="left"
                    paper="lined"
                    className="w-full max-w-[460px] px-7 py-8 shadow-[0_2px_3px_rgba(35,24,12,0.1),0_20px_34px_-22px_rgba(35,24,12,0.5)] sm:px-8 sm:py-9"
                    tag={{ label: "'21", color: ACCENT_HEX[f.accent], rotate: -9, side: "right" }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-6 top-6 select-none font-heading text-[64px] font-bold leading-none opacity-[0.08] sm:text-[76px]"
                      style={{ color: ACCENT_HEX[f.accent] }}
                    >
                      {String(f.index).padStart(2, "0")}
                    </span>
                    <div className="relative">
                      <p className={`text-[11.5px] font-bold uppercase tracking-[0.16em] ${ACCENT_TEXT[f.accent]}`}>
                        {f.eyebrow}
                      </p>
                      <h3 className="mt-2.5 font-heading text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#2B2418] sm:text-[29px]">
                        {f.title}
                      </h3>
                      <p className="mt-3.5 text-[15.5px] leading-[1.7] text-[#4A4436]">{f.body}</p>
                    </div>
                  </PinnedCard>
                </div>
              </div>
            ) : (
              <FeatureStory f={f} flip={i % 2 === 1} />
            )}
          </SectionReveal>
        ))}
      </section>

      <TrustBand />
      <ClosingCta />
      <BoardFooter />
    </div>
  );
}
