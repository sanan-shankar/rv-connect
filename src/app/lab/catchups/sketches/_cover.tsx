"use client";

/* ------------------------------------------------------------------ *
 *  A Round's cover, and the rule that a card is a door.
 *
 *  ONE REPRESENTATION OF A PUBLISHED ROUND, and it is its photographs
 *  (architecture.md section 1). One component, used in the Round region of
 *  a Catch-up's home when the newest Round is out and once per Round under
 *  Earlier Rounds, and nowhere else. That retires the thing he has
 *  complained about longest: a published Round is drawn ten ways on four
 *  surfaces today, with two teaser lengths, two typefaces and two hovers
 *  for one object (recon section 5; para 13 and para 39, "this preview of
 *  this Round 1 tile is the kind of thing that is done in 15 different
 *  ways and 15 different places"). After this it is drawn once.
 *
 *  IT USED TO BE THE ROUND'S QUESTIONS, hung off a measure, and he
 *  rejected that on 2026-09-07 (N31): "the round is just this total
 *  enjoyable experience reading everyone's answers ... But the way that
 *  it's shown over here, it just looks like a bunch of questions and
 *  totally -- it looks like work, honestly. It's not like an appetizing,
 *  beautiful thing you want to click and find out." The questions survive
 *  in exactly one place, the reader's navigator, where they are how you
 *  move rather than a preview of somewhere else.
 *
 *  Two things went with them and are gone rather than parked: `Contents`,
 *  which drew that questions cover, and `Picture`, the small 3:2 mark
 *  beside a Catch-up's name -- "it's just this tiny hanging thing, not at
 *  all tied into the identity, it just exists." The picture is now the
 *  list's whole card (_list.tsx) and a banner on the home (_home.tsx).
 *  A cover never carries a quoted answer either (para 9): "It's like
 *  you're showing the first sentence of a book ... I'm just not gonna see
 *  this sentence again and again and again."
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

/* ── The cover of a published Round ───────────────────────────────── *
 *  Up to three photographs from inside it, tiled with a lead picture, and
 *  the date. On the real Round 32 of 141 answers carry a photograph, so
 *  this draws on what Catch-ups actually contains. A Round nobody
 *  photographed falls back to the Catch-up's own picture, dimmed, so the
 *  shape never changes and a cover is never empty.
 *
 *  No questions, no counts, no quoted answer, and no Round number: "Why do
 *  we need to have the round 4? It doesn't matter what round, it's going
 *  to be round 15." `RoundLine`, which printed "Round 3 · 12 May" here and
 *  which nothing ever called, is deleted with it -- along with its middle
 *  dot, which is separately his three times over (R4, R32, R44). */

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
              /* By position: a Round's first three photographs can repeat
                 one url, and a duplicate React key is a child it may
                 silently drop. Found by the pressure corpus. */
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
