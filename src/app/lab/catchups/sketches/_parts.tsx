"use client";

/* ------------------------------------------------------------------ *
 *  The pieces of an answer, once.
 *
 *  Everything here is a rule he gave, with his sentence beside it, because
 *  every one of them was drawn some other way first and rejected
 *  (docs/planning/catchups-rework/review-2026-09-06.md, and the notes he
 *  sent while the second pass was being drawn):
 *
 *  - "I think we should just go with tiles." (R40) Answers sit on card
 *    stock, at the feed's radius, on the feed's paper.
 *  - "The name should be the main focus and then the rest." (R15) And the
 *    names in one sketch were "a bit bolded though. It looks a bit too
 *    strong." So: 17px medium, not semibold.
 *  - "I feel like the birds could be bigger." (R23) "The birds are
 *    literally the size of the heart icon." (R25) The bird is the feed's
 *    own 40.
 *  - "No need for batch number because you'd be close enough to people in
 *    a batch up to know their batch." A byline is a bird and a name.
 *  - "Let's not have answers in the same line as the name of the person.
 *    Let the answers be on the line below."
 *  - "Comments and hearts should use the same style as the feed." And
 *    "Now we've moved the heart button to the right. Which sucks." (R31)
 *    The feed's LoveButton and the feed's ChatCircle, bottom left, the
 *    same corner of every tile.
 *  - "The comments shouldn't show by default. It should open upon tapping
 *    the icon."
 *  - "Why do I need to know that she's written this at 6:09 PM?" (R10) No
 *    timestamps on answers.
 *  - "Just delete it. If it's empty, just delete it." (R21) `said()`.
 *  - "Why aren't we saying 'asked by' this?" (R29)
 *  - "I think it should just not show the link at all. Let it just show
 *    the button." (R31) "We can just have the title, and the person, and
 *    the thumbnail. And small." (R6)
 *  - "The margins between the photos are so thin." (R16) And photographs
 *    "going end to end, which is nice" (R32, R35).
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Image from "next/image";
import { ChatCircle, MusicNotes, Play } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import { cn } from "@/lib/utils";
import type { SketchMedia } from "./_media";
import type { SketchEntry, SketchPerson } from "./_types";

/* ── The valley behind everything ──────────────────────────────────── *
 *  The shipped app paints the photograph on a `fixed inset-0` layer, so it
 *  is always one window tall and `bg-cover` crops it the way the
 *  photographer framed it. `fixed` cannot be used here, because a sketch
 *  is drawn inside a CSS transform (_frame.tsx) and a transform makes
 *  itself the containing block for fixed children; so the layer is given
 *  the height of ONE screen and faded out at its foot. */
export function ValleyWash({ height }: { height: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 bg-cover bg-center opacity-[0.09]"
      style={{
        height,
        backgroundImage: "url(/images/landing.jpeg)",
        maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
      }}
    />
  );
}

/* ── The byline ────────────────────────────────────────────────────── *
 *  The feed's 40px bird beside one line of 17px medium. With no batch line
 *  the type has to carry the identity alone, so it is one size up from the
 *  body and one weight up, and no more than that. */
export function Byline({
  person,
  className,
}: {
  person: SketchPerson;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BirdAvatar user={person} size={40} />
      <span className="min-w-0 truncate text-[17px] font-medium leading-none text-foreground">
        {person.name}
      </span>
    </div>
  );
}

/** 15 August 2026. The Round has one date; an answer inside it has none. */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Hearts and replies ────────────────────────────────────────────── *
 *  The feed's own two controls, in the feed's own order, at the feed's own
 *  sizes. The negative left margin is the feed's too: it pulls the heart's
 *  padding outward so the GLYPH lines up with the text above it. */
export function Reactions({ entry, className }: { entry: SketchEntry; className?: string }) {
  const [liked, setLiked] = useState(entry.lovedByViewer);
  const [count, setCount] = useState(entry.loveCount);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("-ml-2.5 flex items-center gap-1 text-muted-foreground", className)}>
        <LoveButton
          liked={liked}
          count={count}
          onToggle={() => {
            setLiked((v) => !v);
            setCount((c) => (liked ? c - 1 : c + 1));
          }}
          label="Love this answer"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide replies" : "Show replies"}
          className="state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChatCircle size={18} weight="regular" />
          {entry.commentCount > 0 && <span>{entry.commentCount}</span>}
        </button>
      </div>
      {open && entry.commentCount > 0 && <Replies entry={entry} />}
    </>
  );
}

/* Invented, and it has to stay invented: replies do not exist in the
   database yet, and no member's words are ever written into this
   repository. Picked by a hash of the entry id so an answer always opens
   the same way. */
const INVENTED_REPLIES = [
  "This is the best thing I have read all week.",
  "Okay but you buried the lede here.",
  "Sending this to the group immediately.",
  "I was there for this and it was worse than described.",
  "Genuinely did not know this about you.",
  "Come back and tell us how it ends.",
];

function Replies({ entry }: { entry: SketchEntry }) {
  const seed = entry.id.charCodeAt(entry.id.length - 1);
  return (
    <div className="mt-2 space-y-3 border-l-2 border-border pl-3.5">
      {Array.from({ length: Math.min(entry.commentCount, 2) }).map((_, i) => (
        <div key={i} className="flex gap-2.5">
          <BirdAvatar user={{ id: `c-${entry.id}-${i}`, name: "Reader" }} size={28} />
          <p className="min-w-0 pt-1 text-[13.5px] leading-snug text-foreground">
            {INVENTED_REPLIES[(seed + i * 3) % INVENTED_REPLIES.length]}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── The answer's words ────────────────────────────────────────────── *
 *  One size. 15.5px on a phone, 16 on a laptop, and nothing promotes a
 *  short answer to display type: "random massive fonts and different
 *  fonts. Let's just stop that." (R38)
 *
 *  Eight of this Round's 133 answers are over 600 characters and one is
 *  2,000. His precedent, on photo captions (para 32): "let's keep the More
 *  and Less button, but maybe increase it from 2 lines to 3 lines. Or 3
 *  lines to 4 lines." So: More survives, and the threshold is generous,
 *  ten lines, because four would cut the median answer to a question like
 *  "How has RV shaped your relationship with AI". */
const CLAMP_OVER_CHARS = 600;
const CLAMP_LINES = 10;

export function Body({
  text,
  phone,
  className,
}: {
  text: string;
  phone: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_OVER_CHARS;

  return (
    <>
      <p
        className={cn("whitespace-pre-line text-foreground", className)}
        style={{
          fontSize: phone ? 15.5 : 16,
          lineHeight: 1.6,
          ...(long && !open
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical" as const,
                WebkitLineClamp: CLAMP_LINES,
                overflow: "hidden",
              }
            : {}),
        }}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[14px] font-medium text-canopy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {open ? "Less" : "More"}
        </button>
      )}
    </>
  );
}

/* ── Who asked ─────────────────────────────────────────────────────── *
 *  Six of this Round's eleven questions were written by a MEMBER, not
 *  taken from the library. Who may be named is decided in the loader
 *  (_data.ts), through the one helper; this only prints what it is
 *  handed. "Asked by", never "Siddhant asked" (R29). */
export function AskedBy({ name, className }: { name: string | null; className?: string }) {
  if (!name) return null;
  return (
    <p className={cn("text-[13.5px] text-muted-foreground", className)}>Asked by {name}</p>
  );
}

/* ── Photographs ───────────────────────────────────────────────────── *
 *  Bled to the tile's own edges, so a picture is as wide as the card it
 *  sits on and not a smaller box inside a box. One photograph keeps its
 *  own proportions between 4:5 and 1.9:1 and is capped in height, because
 *  a portrait at its true ratio in a 350px column is 470px of one answer
 *  and pushes everyone else off the screen; the viewer shows the whole
 *  frame. Two or three go in a row of squares with a 4px gap, not a
 *  hairline: "the margins between the photos are so thin." (R16) */
export function Photographs({
  entry,
  className,
  maxHeight,
}: {
  entry: SketchEntry;
  className?: string;
  maxHeight: number;
}) {
  const images = entry.images;
  if (images.length === 0) return null;

  if (images.length === 1) {
    const shape = entry.photos[0];
    const ratio = shape?.width && shape?.height ? shape.width / shape.height : 4 / 3;
    return (
      <div
        className={cn("relative w-full overflow-hidden bg-muted", className)}
        style={{ aspectRatio: Math.max(0.8, Math.min(ratio, 1.9)), maxHeight }}
      >
        <Image src={images[0]} alt="" fill sizes="620px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${images.length === 2 ? 2 : 3}, minmax(0,1fr))` }}
    >
      {images.slice(0, 3).map((src, i) => (
        <div key={i} className="relative aspect-square overflow-hidden bg-muted">
          <Image src={src} alt="" fill sizes="300px" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

/* ── A pasted link ─────────────────────────────────────────────────── *
 *  The whole card is the button; the URL is never printed. Two rows: the
 *  title, and who made it. The still is small, 52px, the height of an
 *  album cover; a video keeps 16:9 at that height so it still reads as a
 *  frame from a film, and wears a play badge, which is all the platform
 *  name a reader needs. No "YouTube", no "Spotify", no middle dot. */
export function Media({ items, className }: { items: SketchMedia[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((m) => (
        <a
          key={m.url}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="state-layer flex items-center gap-3 rounded-[10px] border border-border bg-card p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {m.art ? (
            <span className="relative shrink-0">
              {/* Plain <img>, like the shipped SpotifyCard: these hosts are
                  on the CSP img-src allowlist but deliberately NOT on
                  next/image's remotePatterns. */}
              <img
                src={m.art}
                alt=""
                className="h-[52px] rounded-[6px] object-cover"
                style={{ width: m.platform === "youtube" ? 92 : 52 }}
              />
              {m.platform === "youtube" && (
                <span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
                  <Play size={11} weight="fill" />
                </span>
              )}
            </span>
          ) : (
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[6px] bg-muted text-muted-foreground">
              <MusicNotes size={22} weight="duotone" />
            </span>
          )}
          <span className="min-w-0">
            <span className="line-clamp-2 block text-[14.5px] font-semibold leading-tight text-foreground">
              {m.title}
            </span>
            {m.by && (
              <span className="mt-1 block truncate text-[12.5px] text-muted-foreground">{m.by}</span>
            )}
          </span>
        </a>
      ))}
    </div>
  );
}

/** Everyone who actually said something. An answer that is only a
 *  photograph is not empty: the photograph is the answer. */
export function said(entries: SketchEntry[]): SketchEntry[] {
  return entries.filter(
    (e) => Boolean(e.text || e.body?.trim()) || e.images.length > 0 || e.media.length > 0
  );
}
