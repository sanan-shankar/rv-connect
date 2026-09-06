"use client";

/* ------------------------------------------------------------------ *
 *  The pieces every sketch shares.
 *
 *  Written after the owner read the first ten directions (2026-09-06) and
 *  found the same faults in most of them. Ten builders each drew their own
 *  byline, their own heart, their own meta line, and the faults were
 *  therefore ten copies of one fault. They live here now, once, and a
 *  direction that wants a different answer overrides deliberately rather
 *  than by not knowing what the app already does.
 *
 *  His rules, each one a sentence he actually wrote, because the next
 *  session will be tempted to undo them:
 *
 *  - "There's a plethora of middle dots ... we can never have more than
 *    two items." A meta line carries at most two facts, and only facts a
 *    reader would act on. Not the number of questions, not the number of
 *    answers, not how many people wrote in.
 *  - "No need for batch number because you'd be close enough to people in
 *    a batch up to know their batch." A byline is a name. There is no
 *    second line under it, which is what lets the bird grow.
 *  - "Comments and hearts should use the same style as the feed. Right now
 *    we're writing comments instead of the icon. Why???" One component,
 *    the feed's own LoveButton and the feed's own ChatCircle, in the same
 *    corner of every answer in every direction.
 *  - "The comments shouldn't show by default. It should open upon tapping
 *    the icon."
 *  - "Let's not have answers in the same line as the name of the person.
 *    Let the answers be on the line below."
 *  - "I don't like having a dot to show status of something."
 *  - "I don't like names at the bottom."
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ChatCircle, MusicNotes, Play } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import { cn } from "@/lib/utils";
import type { SketchMedia } from "./_media";
import type { SketchEntry, SketchPerson } from "./_types";

/* ── The valley behind everything ──────────────────────────────────── *
 *  The bug this replaces, in his words: "The backgrounds in the desktop
 *  version of all the versions is broken. It's like 20x zoomed in on one
 *  part of the tree background."
 *
 *  He was reading the cause exactly right. The shipped app paints the
 *  photograph on a `fixed inset-0` layer (app-shell.tsx), so it is always
 *  one window tall and `bg-cover` crops it the way the photographer framed
 *  it. The sketch shell used `absolute inset-0`, which stretches to the
 *  whole SCROLL height instead: on a 9,000px reader, cover has to fill
 *  9,000px, so a 1680x1260 photograph is scaled to about seven times the
 *  page width and you are looking at forty square feet of one branch.
 *
 *  `fixed` cannot come back here, because a sketch is drawn inside a CSS
 *  transform (_frame.tsx) and a transform makes itself the containing
 *  block for fixed children, which lands us back on the scroll height. So
 *  the layer is given the height of ONE screen explicitly and faded out at
 *  its foot. The crop is then the real crop, and the rest of the page is
 *  the paper colour that a real fixed wash sits under anyway at 9% opacity.
 */
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
 *  A bird and a name on one line, and nothing else.
 *
 *  Losing the batch line is what makes this a design change rather than a
 *  deletion. In the feed a 40px bird is balanced against a two-line block
 *  (14px name over a 10.5px byline, about 34px), and every one of the ten
 *  directions kept that 40:34 relationship while removing one of the two
 *  lines, which is why he said "many of them had the bird too small": the
 *  bird was not small, the text beside it had halved.
 *
 *  With one line the type has to carry the identity alone, so the name
 *  goes UP to 17px medium and the bird comes down to 36. Cap height to
 *  bird is then about 1:3, which is the relationship the feed's own header
 *  has once you measure the ink rather than the box.
 */
export function Byline({
  person,
  size = 36,
  className,
  nameClassName,
  tone = "ink",
}: {
  person: SketchPerson;
  size?: number;
  className?: string;
  nameClassName?: string;
  /** `paper` for a byline sitting on the deep green plate. */
  tone?: "ink" | "paper";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BirdAvatar user={person} size={size} />
      <span
        className={cn(
          "min-w-0 truncate font-medium leading-none",
          tone === "paper" ? "text-white" : "text-foreground",
          nameClassName
        )}
        style={{ fontSize: 17 }}
      >
        {person.name}
      </span>
    </div>
  );
}

/* ── The one meta line ─────────────────────────────────────────────── *
 *  At most two facts. The separator is the app's own `.dotsep`, and it
 *  only ever appears BETWEEN two survivors, so one fact prints alone.
 *
 *  What is allowed here: the Catch-up's name, and the date the Round came
 *  out. What is not, and had to be deleted from nine of the ten sketches:
 *  "13 ANSWERS", "4 WITH PHOTOS", "1 OF 11", "13 people wrote in". None of
 *  them changes anything a reader does next.
 */
export function MetaLine({
  parts,
  className,
}: {
  parts: (string | null | false | undefined)[];
  className?: string;
}) {
  const live = parts.filter((p): p is string => Boolean(p)).slice(0, 2);
  /* flex + gap-1.5, which is how every shipped caller sets this row. The
     `.dotsep` glyph carries NO margin of its own (globals.css): it is a
     0.23em box and the space around it comes from the row's gap. Set
     inline in a <p> instead, as the first draft did, it renders as
     "Round 1*15 August 2026" with the dot welded to both words. */
  return (
    <p className={cn("flex items-center gap-1.5 text-[13px] text-muted-foreground", className)}>
      {live.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span className="dotsep" aria-hidden>
              ·
            </span>
          )}
          {part}
        </span>
      ))}
    </p>
  );
}

/** 15 August 2026. The Round has one date; an answer inside it does not
 *  need its own, which is the whole argument for dropping the timestamps
 *  that were cluttering every byline. */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Hearts and comments ───────────────────────────────────────────── *
 *  The feed's own two controls, in the feed's own order, at the feed's own
 *  sizes, in the same corner of every answer. The negative left margin is
 *  the feed's too: it pulls the heart's padding outward so the GLYPH lines
 *  up with the text above it instead of sitting 10px inside the column.
 *
 *  Comments open on tap and are closed on arrival. The sketches are static
 *  in every other respect, but this one had to move: a drawing of the
 *  closed state alone cannot answer "does opening it wreck the page", and
 *  that is the question he is culling on.
 */
export function Reactions({
  entry,
  className,
  onDark = false,
}: {
  entry: SketchEntry;
  className?: string;
  onDark?: boolean;
}) {
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
          onDark={onDark}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide comments" : "Show comments"}
          className={cn(
            "state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            onDark ? "text-white/85 hover:bg-white/12" : "hover:text-foreground"
          )}
        >
          <ChatCircle size={18} weight="regular" />
          {entry.commentCount > 0 && <span>{entry.commentCount}</span>}
        </button>
      </div>
      {open && entry.commentCount > 0 && <Comments entry={entry} />}
    </>
  );
}

/* Invented, and it has to stay invented: comments do not exist in the
   database yet (they are locked in but unbuilt), and no member's words are
   ever written into this repository. Three lines, picked by a hash of the
   entry id so a given answer always opens the same way. */
const INVENTED_COMMENTS = [
  "This is the best thing I have read all week.",
  "Okay but you buried the lede here.",
  "Sending this to the group immediately.",
  "I was there for this and it was worse than described.",
  "Genuinely did not know this about you.",
  "Come back and tell us how it ends.",
];

function Comments({ entry }: { entry: SketchEntry }) {
  const seed = entry.id.charCodeAt(entry.id.length - 1);
  return (
    <div className="mt-3 space-y-3 border-l-2 border-border pl-3.5">
      {Array.from({ length: Math.min(entry.commentCount, 2) }).map((_, i) => (
        <div key={i} className="flex gap-2.5">
          <BirdAvatar user={{ id: `c-${entry.id}-${i}`, name: "Reader" }} size={28} />
          <div className="min-w-0">
            <p className="text-[13px] leading-snug text-foreground">
              {INVENTED_COMMENTS[(seed + i * 3) % INVENTED_COMMENTS.length]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── A long answer ─────────────────────────────────────────────────── *
 *  Eight of this Round's 133 answers are over 600 characters and one is
 *  2,000. Printed whole on a phone that last one is a screen and a half,
 *  and the twelve people underneath it are gone. The shipped reader has no
 *  truncation at all, so this is an addition rather than a restoration.
 *
 *  The precedent is his, on photo captions (para 32): "let's keep the More
 *  and Less button, but maybe increase it from 2 lines to 3 lines. Or 3
 *  lines to 4 lines." So: More survives, the threshold is generous. Ten
 *  lines here, not four, because four would cut the median answer to a
 *  question like "How has RV shaped your relationship with AI" (373
 *  characters) and truncating the typical answer is a different and worse
 *  fault than letting the longest one run.
 */
const CLAMP_OVER_CHARS = 600;
const CLAMP_LINES = 10;

export function Body({
  text,
  fontSize,
  lineHeight,
  className,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_OVER_CHARS;

  return (
    <>
      <p
        className={cn("whitespace-pre-line", className)}
        style={{
          fontSize,
          lineHeight,
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
 *  taken from the library and not set by the Keeper: Abhineet asked about
 *  AI, Siya asked about side quests, Prapti asked the creative one. None
 *  of the second-pass directions showed that, and it is the difference
 *  between a questionnaire and a group of people asking each other
 *  things, which is what para 47 says the whole feature is for: "This is
 *  the only place where I'm almost expressing myself and saying what I
 *  want people to do."
 *
 *  Only for `source === "member"`. A library question's "author" is
 *  whoever picked it off a list, and "asked by Siddhant" would be a lie
 *  about a prompt he chose rather than wrote. The anonymity gate is
 *  already applied upstream by `askerVisible`, so a null asker here means
 *  it must not be shown at all.
 */
export function AskedBy({
  question,
  tone = "ink",
  className,
}: {
  question: { source: string; asker: SketchPerson | null };
  tone?: "ink" | "paper";
  className?: string;
}) {
  if (question.source !== "member" || !question.asker) return null;
  return (
    <p
      className={cn(
        "text-[13px]",
        tone === "paper" ? "text-white/70" : "text-muted-foreground",
        className
      )}
    >
      {question.asker.name} asked this
    </p>
  );
}

/* ── The end of a Round ────────────────────────────────────────────── *
 *  Every second-pass direction ended on one muted sentence, which is not
 *  an ending. The first pass was better here: the foot of a Round is the
 *  one moment a reader is most likely to act, and the act is asking
 *  something for the next one. Para 15's complaint is that today you have
 *  to scroll to the bottom and find nothing worth having arrived at.
 */
export function RoundFoot({ nextOpens, className }: { nextOpens: string; className?: string }) {
  return (
    <footer className={cn("border-t border-border pt-7", className)}>
      <p className="font-heading text-[19px] text-foreground">Round 2 opens on {nextOpens}</p>
      <button
        type="button"
        className="mt-3 inline-flex items-center rounded-full bg-canopy px-4 py-2 text-[14px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Ask something for it
      </button>
    </footer>
  );
}

/* ── Photographs ───────────────────────────────────────────────────── *
 *  One, two or many. A single photograph keeps its own proportions up to
 *  a limit; more than one goes into an even grid, because a mixed grid of
 *  portrait and landscape at their true ratios is the thing that made
 *  three of the ten sketches look like a collapsed table.
 */
export function Photographs({
  entry,
  className,
  radius = 10,
  maxHeight = 520,
}: {
  entry: SketchEntry;
  className?: string;
  radius?: number;
  /** A ceiling on a single photograph's height.
   *  Para 21: "we don't have blown-out-of-proportion images or tons of
   *  white space". A portrait photograph at its true ratio in a 530px
   *  column is 855px tall, which is one answer taking a whole screen and
   *  pushing twelve other people off it. Capped, the box crops rather
   *  than towers, and the viewer still opens the whole frame. */
  maxHeight?: number;
}) {
  const images = entry.images;
  if (images.length === 0) return null;

  if (images.length === 1) {
    const shape = entry.photos[0];
    const ratio = shape?.width && shape?.height ? shape.width / shape.height : 4 / 3;
    return (
      <div
        className={cn("relative w-full overflow-hidden bg-muted", className)}
        style={{
          aspectRatio: Math.max(0.62, Math.min(ratio, 1.9)),
          maxHeight,
          borderRadius: radius,
        }}
      >
        <Image src={images[0]} alt="" fill sizes="620px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${images.length === 2 ? 2 : 3}, minmax(0,1fr))` }}
    >
      {images.slice(0, 6).map((src, i) => (
        <div
          key={i}
          className="relative aspect-square overflow-hidden bg-muted"
          style={{ borderRadius: radius }}
        >
          <Image src={src} alt="" fill sizes="220px" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

/* ── A pasted link ─────────────────────────────────────────────────── *
 *  His question, 2026-09-06: "Are thumbnails not possible for yt vids etc."
 *
 *  They are, and by exactly the mechanism already shipped for Spotify.
 *  `resolveSpotify` (catchups-core.ts) calls a KEYLESS oembed endpoint and
 *  keeps `thumbnail_url`; YouTube, Vimeo and SoundCloud all publish the
 *  same keyless oembed, and YouTube additionally serves a thumbnail at a
 *  guessable address from the video id alone. So the work is a sibling
 *  resolver plus one host on the img-src allowlist in next.config.ts, not
 *  an API key and not a scraper.
 *
 *  Which is why the video card below is drawn at full weight: the layout
 *  question ("does a 16:9 thumbnail wreck the rhythm of a text answer")
 *  is real and answerable now, and it is the only reason to draw it. The
 *  frame standing in for the still is one of this Round's own photographs,
 *  because the CSP allowlist is a security boundary and a lab sketch is
 *  not a reason to widen it.
 */
export function Media({ items, className }: { items: SketchMedia[]; className?: string }) {
  if (items.length === 0) return null;
  /* One row shape for both platforms, and a SMALL one.
     Owner, 2026-09-06: "Make sure the thumbnail and link stuff isn't some
     massive thing it can just a smaller part. Definitely not as important
     as a picture or something."
     The first draft printed a YouTube still full width at 16:9, which made
     a link to a song louder than a photograph somebody took. The still now
     sits at the same 56px height as an album cover, keeping its own 16:9
     so it is still legible as a frame from a video, and the row is the
     same object either way. */
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((m) => (
        <div
          key={m.url}
          className="flex items-center gap-3 rounded-[10px] border border-border bg-card p-2"
        >
          {m.art ? (
            <span className="relative shrink-0">
              {/* Plain <img>, like the shipped SpotifyCard: these hosts are
                  on the CSP img-src allowlist but deliberately NOT on
                  next/image's remotePatterns, which is the list an open
                  optimizer endpoint gets abused through. */}
              <img
                src={m.art}
                alt=""
                className="h-[56px] rounded-[6px] object-cover"
                style={{ width: m.platform === "youtube" ? 100 : 56 }}
              />
              {m.platform === "youtube" && (
                <span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
                  <Play size={11} weight="fill" />
                </span>
              )}
            </span>
          ) : (
            <span className="grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[6px] bg-muted text-muted-foreground">
              <MusicNotes size={22} weight="duotone" />
            </span>
          )}
          <div className="min-w-0">
            <p className="line-clamp-2 text-[14.5px] font-semibold leading-tight text-foreground">
              {m.title}
            </p>
            {m.by && <p className="mt-1 truncate text-[12.5px] text-muted-foreground">{m.by}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Everyone who actually said something.
 *
 *  One answer in this Round has an empty body, no photograph and no link:
 *  somebody opened the question and pressed send. Drawn like any other it
 *  is a name, two hearts and nothing else, which is para 31's complaint
 *  in its purest form ("only about 15% of the real estate is used") and
 *  it made three directions look broken at the same spot.
 *
 *  A blank answer is not a layout worth culling on, so the sketches leave
 *  it out. The rooms will have to decide what it really does - most
 *  likely the person is simply not printed, the way a magazine does not
 *  print a contributor who filed nothing. Note that an answer that is
 *  ONLY a photograph is not blank: the photograph is the answer. */
export function said(entries: SketchEntry[]): SketchEntry[] {
  return entries.filter(
    (e) => Boolean(e.text || e.body?.trim()) || e.images.length > 0 || e.media.length > 0
  );
}

/* ── A bar that stays at the foot of the screen ────────────────────── *
 *  Harder than it looks, and worth writing down because the obvious two
 *  answers both fail here.
 *
 *  `position: fixed` is the right CSS and cannot be used: a sketch is
 *  drawn inside a CSS transform (_frame.tsx), and a transform makes
 *  itself the containing block for every fixed descendant, so the bar
 *  would pin to the bottom of a 42,000px PAGE instead of the screen.
 *
 *  `position: sticky; bottom: 0` on a last child does nothing, which was
 *  the first attempt and was caught by looking rather than by reasoning:
 *  a sticky element only travels inside its containing block, and an
 *  element at the very end of its container has no distance to travel.
 *  Scrolled to 3,000px the bar was simply absent.
 *
 *  What works: a zero-height sticky box at the START of the tall page,
 *  offset from the TOP by one screen less the bar's height. It is pinned
 *  from the first frame, it travels the whole page, and `dvh` measures
 *  the real screen because that is a viewport unit rather than a
 *  containing-block one, so the transform cannot touch it.
 */
export function StickyFoot({
  children,
  offset = 0,
}: {
  children: ReactNode;
  /** Lift the bar off the bottom edge, for the laptop's floating one. */
  offset?: number;
}) {
  return (
    <div className="pointer-events-none sticky z-30" style={{ top: "100dvh", height: 0 }}>
      {/* Pinned at the screen's bottom edge, then lifted by its OWN height.
          Passing the height in as a number was the first version and it was
          wrong by four pixels, because the bar's height is the sum of a
          rule, two paddings and a line box rather than anything anybody
          typed. translateY(-100%) resolves against the element, so it is
          flush whatever the bar turns out to measure. */}
      <div
        className="pointer-events-auto"
        style={{ transform: `translateY(calc(-100% - ${offset}px))` }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── How long is this answer, and what should that change? ─────────── *
 *  The brief's sharpest unfixed complaint, and the one every direction so
 *  far walked straight past:
 *
 *    para 31: "If you see Cyan's answer, he's just Cyan Prasad, your mama,
 *    and these hearts. And that tile is ... on my phone it's maybe 3
 *    centimetres, and only about 15% of the real estate is used, and the
 *    rest is just white space."
 *
 *    para 30: "all the tiles now have this thick padding at the bottom
 *    with the heart at the bottom left, and then the rest of it is just
 *    empty."
 *
 *  The obvious fix is to shrink the box around a short answer, and one of
 *  the ten did exactly that. He rejected it on sight: "There was one where
 *  Sanan and Saayan's tile saying yo mama was made super small because the
 *  answer was short. Don't like that."
 *
 *  He is right both times, and the two together say what the answer has to
 *  be. The box must not move. The TYPE must. Three words set at reading
 *  size in a column built for paragraphs will always look like a scrap in
 *  a field; set at display size they look like the answer somebody meant
 *  to give. This is para 21's "layout rules that are very rapidly
 *  adjusting to the content it's receiving", at the smallest scale it can
 *  apply, and it costs one measurement.
 *
 *  Nothing here decides what a direction DOES about it. It only measures,
 *  so that ten directions cannot each invent a different threshold.
 */

/** Under 45 characters is one breath: "your mama", "cold, long, over". */
const TERSE_CHARS = 45;
/** Over 320 is a piece of writing rather than a reply. */
const ESSAY_CHARS = 320;

export type Length = "terse" | "brief" | "essay";

export function lengthOf(entry: SketchEntry): Length {
  const n = (entry.body ?? "").trim().length;
  if (entry.images.length > 0 || entry.song) return n > ESSAY_CHARS ? "essay" : "brief";
  if (n === 0) return "brief";
  if (n <= TERSE_CHARS) return "terse";
  if (n >= ESSAY_CHARS) return "essay";
  return "brief";
}

/** The temper of a whole question, from the median of its answers. A
 *  "Describe your month in 3 words" question is terse ELEVEN TIMES over,
 *  and a direction that sets it the same way it sets a travel story has
 *  reproduced para 31 down the entire page. */
export function temperOf(entries: SketchEntry[]): Length {
  if (entries.length === 0) return "brief";
  const lengths = entries
    .map((e) => (e.body ?? "").trim().length)
    .sort((a, b) => a - b);
  const median = lengths[Math.floor(lengths.length / 2)];
  const anyMedia = entries.some((e) => e.images.length > 0 || e.song);
  if (median <= TERSE_CHARS && !anyMedia) return "terse";
  if (median >= ESSAY_CHARS) return "essay";
  return "brief";
}

/** The type size an answer's body wants, given how much of it there is.
 *  Serif at display sizes, because a short answer promoted in the body
 *  sans just reads as a bigger scrap. */
export function bodyType(length: Length, phone: boolean) {
  if (length === "terse") {
    return {
      fontSize: phone ? 25 : 29,
      lineHeight: 1.25,
      className: "font-heading text-foreground",
    };
  }
  return {
    fontSize: phone ? 15.5 : 16,
    lineHeight: 1.62,
    className: "text-foreground",
  };
}
