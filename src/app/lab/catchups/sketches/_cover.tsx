"use client";

/* ------------------------------------------------------------------ *
 *  A Round's cover, and the rule that a card is a door.
 *
 *  ONE OBJECT, TWO DEPTHS (architecture.md section 1). The questions of a
 *  Round, hung off a vertical measure, is a single component. It is the
 *  cover on a Catch-up's home -- in Now when the newest Round is out, and
 *  once per Round under Earlier Rounds -- and it is the navigator inside
 *  the reader. Same file, same face, same measure. What changes with
 *  depth is what the measure is DOING: faint or warm on a cover, filling
 *  as you read in the reader.
 *
 *  It was on the LIST too, until he saw it there on 2026-09-07: "I'm not
 *  too happy with having questions ... there's just too much text going
 *  on for something that should just be a navigation for all your
 *  catch-ups." So the list carries the Catch-up's picture instead (see
 *  _list.tsx) and the questions stay where you are choosing what to read
 *  rather than which Catch-up to open.
 *
 *  That retires the thing he has complained about longest. A published
 *  Round is drawn ten ways on four surfaces today, with two teaser
 *  lengths, two typefaces and two hovers for one object (recon section 5;
 *  his para 13 and para 39: "this preview of this Round 1 tile is the
 *  kind of thing that is done in 15 different ways and 15 different
 *  places"). After this it is drawn once.
 *
 *  And it never carries a quoted answer. Para 9: "It's like you're
 *  showing the first sentence of a book ... I'm just not gonna see this
 *  sentence again and again and again." A cover carries its headlines,
 *  which change every Round and are the actual reason to open it.
 *
 *  A CARD IS A DOOR. On the list and on the home, a bordered card means
 *  "this opens something" and the WHOLE card is the target. Everything
 *  else is set on the page's own paper. That one rule retires the dead
 *  "Round 1 is out" tile (para 35: "the rest of the tile is just dead,
 *  which is so dumb"), the View button that existed because the tile
 *  around it was not clickable (para 3), the "open it on its own page"
 *  link printed inside a tile already on that page, and the hover that
 *  darkened a shape nobody could name (para 9) -- a door highlights as
 *  one rectangle because it is one rectangle.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { QuestionList } from "./_navigator";
import { shortDate, type ShelfRound } from "./_shelf";

/* ── A door ────────────────────────────────────────────────────────── *
 *  A card whose whole area navigates. The target is one absolutely
 *  positioned button behind the content rather than a wrapper around it,
 *  so a control that has its OWN destination (Answer, Ask something) can
 *  sit on top of it and win the tap. That is the pattern the index card
 *  already uses and the home's published tile did not (recon section 5).
 *
 *  It highlights with `state-layer`, the app's own, painted over the
 *  card's full box and clipped to its radius: the whole rectangle
 *  darkens, and no text touches the edge of the tint. */
export function Door({
  label,
  onOpen,
  children,
  className,
}: {
  label: string;
  onOpen?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "state-layer card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card",
        className,
      )}
    >
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
        />
      )}
      {/* `pointer-events-none` so the whole card really is the target and
          not just the gaps between its words; anything that needs its own
          tap turns them back on. */}
      <div className="pointer-events-none relative z-10">{children}</div>
    </article>
  );
}

/** Something inside a door that has its own destination. */
export function Own({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("pointer-events-auto relative z-20", className)}>{children}</div>;
}

/* ── The contents ──────────────────────────────────────────────────── */

/** How many questions a cover prints before it stops. Eleven is the real
 *  Round and it fits; forty is the pressure corpus and it would turn the
 *  list into a document. What stops it is a fade, not a count and not an
 *  "and 6 more": "you're trying so hard to include useless information"
 *  (R32), and he rejected "and 8 others" for people on the same grounds
 *  (R2). A fade says there is more, and the whole card is already the way
 *  to see it. */
const COVER_CAP = 8;

export function Contents({
  round,
  className,
}: {
  round: ShelfRound;
  className?: string;
}) {
  const over = round.questions.length > COVER_CAP;
  const fade = {
    maskImage: "linear-gradient(to bottom, black calc(100% - 42px), transparent 100%)",
    WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 42px), transparent 100%)",
  } as const;
  return (
    <div className={className} style={over ? fade : undefined}>
      <QuestionList
        questions={over ? round.questions.slice(0, COVER_CAP) : round.questions}
        size="cover"
        spine={round.read ? "read" : "unread"}
      />
    </div>
  );
}

/* ── "Round 3 · 12 May" ────────────────────────────────────────────── *
 *  The one line on which a Round's number and date are printed, and it is
 *  printed once per screen. "in the loop is said twice, Round 1 is said
 *  twice, the date is said twice. It's just so much horrible." (R13) */
export function RoundLine({
  number,
  at,
  className,
}: {
  number: number;
  at: string;
  className?: string;
}) {
  return (
    <p className={cn("flex items-center gap-2 text-[13.5px]", className)}>
      <span className="font-medium text-cinnamon">Round {number}</span>
      <span className="dotsep" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground">{shortDate(at)}</span>
    </p>
  );
}

/* ── The cover of a published Round ───────────────────────────────── *
 *  ITS PHOTOGRAPHS, not its questions. His, 2026-09-07, on the version
 *  that printed the questions here: "the round is just this total
 *  enjoyable experience reading everyone's answers. This is fun, that is
 *  fun, all of that. But the way that it's shown over here, it just looks
 *  like a bunch of questions and totally -- it looks like work, honestly.
 *  It's not like an appetizing, beautiful thing you want to click and find
 *  out. Oh wow, what is this? It just seems very drab and unappealing."
 *
 *  He is right, and the questions were never the appetising part. What is
 *  inside a Round that anybody would want is the photographs: on the real
 *  Round, 32 of 141 answers carry one. So a cover is up to four of them,
 *  tiled, with the date. A Round with no photographs falls back to the
 *  Catch-up's own picture, dimmed, so the shape never changes and there is
 *  never an empty cover.
 *
 *  No questions, no counts, no quoted answer, no Round number: "Why do we
 *  need to have the round 4? It doesn't matter what round, it's going to
 *  be round 15." */

/** Three photographs at most, and the tiling is explicit for each count.
 *  Four was drawn first and is wrong: with the lead photograph spanning
 *  two columns and two rows, the fourth has nowhere to go but a third row
 *  of its own, beside an empty grey cell. Three is the number that tiles
 *  without a hole, and it is enough to say what a Round was like. */
const COVER_SHOTS = 3;

function tiles(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  return "grid-cols-3 grid-rows-2";
}

export function Cover({
  round,
  fallback,
  onOpen,
  className,
  compact = false,
}: {
  round: ShelfRound;
  /** The Catch-up's picture, for a Round nobody photographed. */
  fallback: string;
  onOpen?: () => void;
  className?: string;
  /** Under Earlier Rounds, where a cover is a row rather than the page's
   *  one object. */
  compact?: boolean;
}) {
  const shots = round.photos.slice(0, COVER_SHOTS);
  const has = shots.length > 0;
  return (
    <Door
      label={`Read the Round from ${shortDate(round.publishedAt ?? "")}`}
      onOpen={onOpen}
      className={cn("group", className)}
    >
      <div
        className={cn("relative grid gap-[3px] bg-border", has ? tiles(shots.length) : "grid-cols-1")}
        style={{ aspectRatio: compact ? "3 / 1" : "16 / 9" }}
      >
        {has ? (
          shots.map((src, i) => (
            <span
              /* By position: a Round's first photographs can repeat one url,
                 and a duplicate React key is a child React may silently
                 drop. */
              key={`${i}-${src}`}
              className={cn(
                "relative block overflow-hidden bg-muted",
                /* The first photograph is the big one, so a Round reads as
                   having a lead picture rather than as a contact sheet. */
                shots.length > 2 && i === 0 && "col-span-2 row-span-2",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="540px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            </span>
          ))
        ) : (
          <span className="relative block overflow-hidden bg-muted">
            <Image src={fallback} alt="" fill sizes="540px" className="object-cover opacity-70" />
          </span>
        )}
      </div>
      <div className={compact ? "px-4 py-3" : "px-5 py-4"}>
        <p
          className="font-heading text-foreground"
          style={{ fontSize: compact ? 16 : 18, letterSpacing: "-0.01em" }}
        >
          {shortDate(round.publishedAt ?? "")}
        </p>
      </div>
    </Door>
  );
}

/* ── The Catch-up's picture ────────────────────────────────────────── *
 *  His diagnosis, 2026-09-07, and it is the right one: "In feed, you have
 *  these images, you have the birds and everything ... Directory, you have
 *  the whole graphic of the map, and that's kind of single-handedly
 *  carrying that thing ... Collection, obviously there's so much graphics
 *  ... Catch-ups is the only one that has like nothing, no images, no
 *  media. It's just all text and organization and very functional and
 *  very corporate."
 *
 *  So a Catch-up has a picture, from the day it is made, and it is part of
 *  its identity rather than decoration on one screen: it is on the list
 *  and on the home, in the same shape, so you know which Catch-up you are
 *  looking at before you have read a word.
 *
 *  THREE TO TWO, always, and one corner radius. A circle was drawn first
 *  and is wrong here: a circle means a PERSON everywhere else in this app
 *  (BirdAvatar), and a Catch-up is not a person. A rounded rectangle is
 *  what iOS uses for exactly this distinction, an app against a contact.
 *
 *  NOT IN THE READER. The reader is the Round, not the Catch-up, and the
 *  green bar there already carries the name. A picture in it would be the
 *  same thing said twice, which is the fault this whole rework is about
 *  (R13: "in the loop is said twice, Round 1 is said twice, the date is
 *  said twice"). */
export function Picture({
  src,
  alt,
  width,
  fill = false,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  /** The laptop's: the picture is the card's left EDGE and takes whatever
   *  height the card turns out to be, so it can never leave a hole.
   *
   *  A fixed 3:2 block in the margin was drawn first and had the fault
   *  this page exists to remove, mirrored: a Catch-up with three
   *  questions had a 290px identity column beside a 100px body, and the
   *  190px of nothing was back on the other side. A strip that stretches
   *  has no such case, and it makes the picture part of the card's
   *  construction rather than something placed on it. */
  fill?: boolean;
  className?: string;
}) {
  if (fill) {
    return (
      <span className={cn("relative block shrink-0 self-stretch bg-muted", className)} style={{ width }}>
        <Image src={src} alt={alt} fill sizes={`${width * 2}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-[10px] bg-muted", className)}
      style={{ width, height: Math.round((width * 2) / 3) }}
    >
      <Image src={src} alt={alt} fill sizes={`${width * 2}px`} className="object-cover" />
    </span>
  );
}
