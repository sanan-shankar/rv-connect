"use client";

/* ------------------------------------------------------------------ *
 *  A sealed Edition, drawn three ways.
 *
 *  Each drawing is a FACE: what fills the picture half of a cover, the
 *  home's Edition tile and a deep link, while the thing is sealed and at
 *  the moment it opens. Everything around the face (the cover's foot, the
 *  tile, the page) is the app's own shape, so the three differ only where
 *  the idea differs.
 *
 *  Under every face sits the Edition as it will be, its photographs, and
 *  opening is the face going away. Only opacity and transform animate.
 *
 *  Sizes follow `wide` rather than the window, because the room draws a
 *  phone inside a laptop window and a breakpoint would draw the laptop.
 *
 *  Nothing in any face comes from inside the Edition. That is his 34b.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import { m } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { EASE_IN_OUT_SCENE, EASE_OUT_SMOOTH } from "@/components/common/motion";
import { coverTiles } from "@/lib/catchup-pictures";
import { cn, formatDisplayDateLong } from "@/lib/utils";
import { INSIDE, OPENS_AT, SEALED_AT, leftWords, progressOf, type CapsuleCase } from "./_cases";

export type DrawingKey = "line" | "asleep" | "morning";
export type Size = "cover" | "tile";

type FaceProps = {
  c: CapsuleCase;
  size: Size;
  wide: boolean;
  /** Play the opening. False draws the case as it stands. */
  opening: boolean;
};

const OPENS = formatDisplayDateLong(OPENS_AT);

const isDone = (c: CapsuleCase, opening: boolean) => opening || c.key === "opened";

/** The Edition as it will read: its first photographs, the list's tiling. */
function Inside() {
  const shots = INSIDE.slice(0, 3);
  return (
    <span className={cn("absolute inset-0 grid gap-[3px] bg-border", coverTiles(shots.length))}>
      {shots.map((src, i) => (
        <span key={src} className={cn("relative block overflow-hidden bg-muted", i === 0 && "col-span-2 row-span-2")}>
          <Image src={src} alt="" fill sizes="540px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}

/** The face over the photographs, and how it leaves. */
function Lid({ gone, delay, duration = 0.9, children }: { gone: boolean; delay: number; duration?: number; children: React.ReactNode }) {
  return (
    <m.span
      className="absolute inset-0 block"
      initial={false}
      animate={{ opacity: gone ? 0 : 1 }}
      transition={{ duration: gone ? duration : 0, delay: gone ? delay : 0, ease: EASE_IN_OUT_SCENE }}
    >
      {children}
    </m.span>
  );
}

/* ── one: the year line ───────────────────────────────────────────── *
 *  The reader's cinnamon reading line, stretched to a year, with a tick
 *  for every month on it and a dot on today. Twelve months to go reads as
 *  a calendar rather than as an empty card. The date is the name the
 *  Edition will have. */
const MONTHS = Array.from({ length: 13 }, (_, i) =>
  new Date(Date.UTC(2026, 8 + i, 1)).toLocaleString("en-GB", { month: "narrow", timeZone: "UTC" })
);

function YearLine({ c, size, wide, opening }: FaceProps) {
  const done = isDone(c, opening);
  const progress = done ? 1 : progressOf(c);
  const tile = size === "tile";
  const pad = tile ? (wide ? "px-7 py-7" : "px-5 py-5") : wide ? "px-5 py-4" : "px-4 py-3.5";
  return (
    <>
      <Inside />
      <Lid gone={done} delay={opening ? 1.1 : 0}>
        <span className={cn("flex h-full w-full flex-col justify-between bg-card", pad)}>
          {/* Side by side on a laptop; stacked on a phone, where the words
              beside it squeezed the date onto three lines (round two). */}
          <span className={cn("flex items-start", wide ? "justify-between gap-3" : "flex-col gap-1")}>
            <span className="min-w-0">
              <span className={cn("block font-sans text-muted-foreground", wide ? "text-[13.5px]" : "text-[12.5px]")}>Opens</span>
              <span
                className={cn(
                  "mt-0.5 block font-heading leading-[1.15] tracking-[-0.02em] text-foreground",
                  tile ? (wide ? "text-[38px]" : "text-[27px]") : wide ? "text-[23px]" : "text-[20px]"
                )}
              >
                {OPENS}
              </span>
            </span>
            {tile && (
              <span className={cn("shrink-0 font-sans text-muted-foreground", wide ? "pt-[3px] text-right text-[13.5px]" : "text-[12.5px]")}>
                {leftWords(c)}
              </span>
            )}
          </span>
          <span className="block">
            <span className="relative block h-[9px]">
              <span className="absolute inset-x-0 top-[4px] h-px bg-border" />
              {MONTHS.map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute top-[1px] h-[7px] w-px bg-border"
                  style={{ left: `${(i / 12) * 100}%` }}
                />
              ))}
              <m.span
                className="absolute left-0 top-[3.5px] h-[2px] w-full origin-left rounded-full bg-cinnamon"
                initial={false}
                animate={{ scaleX: progress }}
                transition={{ duration: opening ? 1 : 0, ease: EASE_OUT_SMOOTH }}
              />
              {/* The dot rides a full-width track by transform, so nothing but
                  a transform animates. */}
              <m.span
                className="absolute inset-x-0 top-[1px] block"
                initial={false}
                animate={{ x: `${progress * 100}%` }}
                transition={{ duration: opening ? 1 : 0, ease: EASE_OUT_SMOOTH }}
              >
                <span className="block size-[7px] -translate-x-1/2 rounded-full bg-cinnamon" />
              </m.span>
            </span>
            {tile ? (
              <span className="relative mt-2 block h-[15px]">
                {MONTHS.map((letter, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute top-0 -translate-x-1/2 font-sans text-[11px] text-muted-foreground"
                    style={{ left: `${(i / 12) * 100}%` }}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            ) : (
              <span className="mt-2 block font-sans text-[12.5px] text-muted-foreground">{leftWords(c)}</span>
            )}
          </span>
        </span>
      </Lid>
    </>
  );
}

/* ── two: asleep ──────────────────────────────────────────────────── *
 *  Who wrote in, as their birds, asleep. They wake when it opens. It is
 *  the only drawing that shows WHO is inside: not a word of what they
 *  wrote, but more than the other two say. */
function Asleep({ c, size, wide, opening }: FaceProps) {
  const done = isDone(c, opening);
  const tile = size === "tile";
  const shown = tile ? (wide ? 22 : 12) : wide ? 10 : 7;
  const birds = c.writers.slice(0, shown);
  const more = c.writers.length - birds.length;
  const px = tile ? (wide ? 36 : 30) : 24;
  return (
    <>
      <Inside />
      <Lid gone={done} delay={opening ? 1.4 : 0}>
        <span className={cn("flex h-full w-full flex-col items-center justify-center bg-card", tile ? "gap-4 px-5" : "gap-2.5 px-4")}>
          {birds.length > 0 ? (
            <span className={cn("flex max-w-full flex-wrap items-end justify-center", tile ? "gap-x-2.5 gap-y-2" : "gap-1.5")}>
              {birds.map((p, i) => (
                <m.span
                  key={p.id}
                  className="block origin-bottom"
                  initial={false}
                  animate={
                    done
                      ? { scale: [0.92, 1.16, 1], opacity: 1, y: [0, -6, 0] }
                      : { scale: [1, 1.045, 1], opacity: 0.55, y: 0 }
                  }
                  transition={
                    done
                      ? { duration: 0.55, delay: opening ? i * 0.05 : 0, ease: EASE_OUT_SMOOTH }
                      : { duration: 3.6, delay: (i % 7) * 0.4, repeat: Infinity, ease: "easeInOut" }
                  }
                >
                  <BirdAvatar user={{ id: p.id, name: p.name, photoUrl: null }} size={px} />
                </m.span>
              ))}
              {more > 0 && (
                <span className="self-center pl-1 font-sans text-[12.5px] text-muted-foreground">and {more} more</span>
              )}
            </span>
          ) : (
            <span className="font-sans text-[13.5px] text-muted-foreground">Nobody wrote in this one</span>
          )}
          <span className="text-center">
            <span
              className={cn(
                "block font-heading leading-[1.15] tracking-[-0.015em] text-foreground",
                tile ? (wide ? "text-[26px]" : "text-[22px]") : "text-[17px]"
              )}
            >
              {OPENS}
            </span>
            {tile && <span className="mt-1 block font-sans text-[13.5px] text-muted-foreground">{leftWords(c)}</span>}
          </span>
        </span>
      </Lid>
    </>
  );
}

/* ── three: waiting for morning ───────────────────────────────────── *
 *  The Catch-up's own photograph, at night. The dark lifts a little as
 *  the year goes, and it opens at seven in the morning, so it opens into
 *  the day. Nothing from inside: the picture is the Catch-up's. */
function Morning({ c, size, wide, opening }: FaceProps) {
  const done = isDone(c, opening);
  const tile = size === "tile";
  /* Most of the way dark until the last months, and never lighter than
     about half: at one day left it had lifted so far that the cover on the
     list looked like the Catch-up card above it (round three), which is the
     "obvious they're different types of elements" test failed. */
  const night = 1 - progressOf(c) * 0.3;
  return (
    <>
      <Inside />
      <Lid gone={done} delay={0} duration={done && opening ? 2.2 : 0}>
        <Image src={c.picture.src} alt="" fill sizes="760px" style={{ objectPosition: c.picture.focus }} className="object-cover" />
        <span aria-hidden className="absolute inset-0 bg-black" style={{ opacity: 0.68 * night }} />
        <span
          className={cn("absolute inset-x-0 bottom-0 flex flex-col text-white", tile ? (wide ? "px-7 pb-7" : "px-5 pb-6") : wide ? "px-5 pb-4" : "px-4 pb-4")}
          style={{ textShadow: "0 1px 12px rgb(0 0 0 / 0.4)" }}
        >
          <span className={cn("font-sans text-white/75", wide ? "text-[13.5px]" : "text-[12.5px]")}>Opens</span>
          <span
            className={cn(
              "font-heading leading-[1.15] tracking-[-0.02em]",
              tile ? (wide ? "text-[36px]" : "text-[27px]") : wide ? "text-[22px]" : "text-[20px]"
            )}
          >
            {OPENS}
          </span>
          {tile && <span className="mt-1 font-sans text-[13.5px] text-white/75">{leftWords(c)}</span>}
        </span>
      </Lid>
    </>
  );
}

const FACES: Record<DrawingKey, (p: FaceProps) => React.ReactNode> = {
  line: YearLine,
  asleep: Asleep,
  morning: Morning,
};

function Face({ drawing, ...p }: FaceProps & { drawing: DrawingKey }) {
  const Drawn = FACES[drawing];
  return <Drawn {...p} />;
}

/** The foot every cover has. Sealed, it carries the day it was written;
 *  open, the day it came out, which is its name from then on. */
function Foot({ c, opening, size, wide }: { c: CapsuleCase; opening: boolean; size: Size; wide: boolean }) {
  const done = isDone(c, opening);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-2.5 border-t border-border bg-card",
        size === "tile" ? "h-[46px]" : wide ? "h-[42px]" : "h-[38px]",
        wide ? "px-5" : "px-4"
      )}
    >
      <span aria-hidden className="h-[17px] w-[2px] shrink-0 rounded-full bg-cinnamon" />
      <span className={cn("truncate font-heading tracking-[-0.01em] text-foreground", wide ? "text-[16px]" : "text-[15px]")}>
        {formatDisplayDateLong(done ? OPENS_AT : SEALED_AT)}
      </span>
      <span className="ml-auto shrink-0 font-sans text-[12.5px] text-muted-foreground">{done ? "A time capsule" : "Sealed"}</span>
    </span>
  );
}

type Drawn = { drawing: DrawingKey; c: CapsuleCase; opening: boolean; wide: boolean };

/** A cover on the list, or in the home's sidebar: the Edition cover's own
 *  outline, so the shelf stays one height. */
export function SealedCover({ drawing, c, opening, wide }: Drawn) {
  return (
    <article className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <span className={cn("flex w-full flex-col", wide ? "aspect-[5/2]" : "aspect-[16/9]")}>
        <span className="relative block min-h-0 flex-1 overflow-hidden bg-muted">
          <Face drawing={drawing} c={c} size="cover" wide={wide} opening={opening} />
        </span>
        <Foot c={c} opening={opening} size="cover" wide={wide} />
      </span>
    </article>
  );
}

/** The home's Edition region, when the sealed Edition is the latest. */
export function SealedTile({ drawing, c, opening, wide }: Drawn) {
  return (
    <article className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <span className={cn("relative block overflow-hidden bg-muted", wide ? "h-[300px]" : "h-[230px]")}>
        <Face drawing={drawing} c={c} size="tile" wide={wide} opening={opening} />
      </span>
      <Foot c={c} opening={opening} size="tile" wide={wide} />
    </article>
  );
}
