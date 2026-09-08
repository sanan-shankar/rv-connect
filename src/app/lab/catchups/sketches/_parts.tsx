"use client";

/* ------------------------------------------------------------------ *
 *  The pieces of an answer, once.
 *
 *  Everything here is a rule he gave, with his sentence beside it:
 *
 *  - "I think we should just go with tiles." (R40) Answers sit on card
 *    stock, at the feed's radius, on the feed's paper.
 *  - "The name should be the main focus and then the rest." (R15), and
 *    the names in one sketch were "a bit bolded though. It looks a bit
 *    too strong": 17px medium, not semibold.
 *  - "I feel like the birds could be bigger." (R23) The bird is the
 *    feed's own 40.
 *  - "No need for batch number because you'd be close enough to people
 *    in a batch up to know their batch." A byline is a bird and a name.
 *  - "I feel like the comment section can be done the same way that we do
 *    it in feed ... Showing just the bird doesn't make sense. Because
 *    people want to know who commented." (2026-09-07) So a reply is the
 *    feed's own row: bird, name inline, the words after it.
 *  - "The comment section has to animate opening and closing correctly."
 *  - "Why do I need to know that she's written this at 6:09 PM?" (R10)
 *    No timestamps on an answer. A reply keeps the feed's "2h", because
 *    a reply is a reply to a moment.
 *  - "Just delete it. If it's empty, just delete it." (R21) `said()`.
 *  - "Why aren't we saying 'asked by' this?" (R29)
 *  - "I think it should just not show the link at all. Let it just show
 *    the button." (R31) "We can just have the title, and the person, and
 *    the thumbnail. And small." (R6)
 *  - "You've made the pictures edge to edge, which is a nice touch."
 *    (2026-09-07) And "the margins between the photos are so thin" (R16).
 * ------------------------------------------------------------------ */

import { useCallback, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { ChatCircle, MusicNotes, Play } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { SketchMedia } from "./_media";
import type { SketchEntry, SketchPerson } from "./_types";

/* ── The valley behind everything ──────────────────────────────────── *
 *  The shipped app paints the photograph on a `fixed inset-0` layer, so
 *  it is always one window tall and `bg-cover` crops it the way the
 *  photographer framed it. Here it is given the height of one screen
 *  explicitly and faded out at its foot, which comes to the same thing
 *  without a second fixed layer inside the drawing. */
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

/* ── An avatar whose LEFT EDGE is where you think it is ────────────── *
 *  His, 2026-09-07: "the people who've uploaded a profile photo, for
 *  them, their icon is correctly left-aligned to the left border, but
 *  many of the other people who have a bird, their bird is actually not
 *  left-aligned. It's displaced by a little bit."
 *
 *  Measured, because the cause is not the layout. Every avatar BOX in
 *  this column starts at the same x to the tenth of a pixel. What
 *  differs is the ink inside it: a photograph is clipped to a full
 *  circle and fills its 40px, while a bird is drawn inside r~45 of a
 *  0..100 viewBox (bird-avatar-v2.tsx says so at the top) and its drawn
 *  pixels span about 32px, starting 4px in. So a column of alternating
 *  photographs and birds has a ragged left edge, by 4px, every time.
 *
 *  It is not new here and it is not fixed in the feed either; the feed
 *  simply never stacks twelve of them in one column, which is why it has
 *  never been seen. The app-wide cure would be to normalise every glyph's
 *  ink box, which is a change to fifty drawings and his to call.
 *
 *  What this does instead, in one place: measure the glyph's real ink box
 *  and slide it left by its own inset, so every mark in the column starts
 *  on the same pixel. Sizes are untouched, because the glyphs are
 *  optically sized against each other on purpose and normalising WIDTH
 *  would shrink an eagle to a sparrow. The translate is layout-neutral,
 *  so the name beside it never moves.
 */
function FlushAvatar({ person, size }: { person: SketchPerson; size: number }) {
  /* Measured in the ref callback and written straight to the node. No
     state and no effect: this is one number read off the geometry the
     browser has already built, and React's own rule is that talking to
     the DOM like this belongs outside the render loop. */
  const measure = useCallback(
    (host: HTMLSpanElement | null) => {
      const inner = host?.firstElementChild as HTMLElement | null;
      if (!host || !inner) return;
      const svg = host.querySelector("svg");
      // A photograph already fills its circle; only a glyph needs this.
      if (!svg) {
        inner.style.transform = "";
        return;
      }
      /* getBBox on the <svg> root unions its children WITH their own
         transforms applied, which is what the per-species optical
         `adjust` is; calling it on the inner <g> would read the geometry
         from before that transform and slide the wrong birds. */
      const box = (svg as unknown as SVGGraphicsElement).getBBox();
      inner.style.transform = `translateX(${-(box.x * size) / 100}px)`;
    },
    [size]
  );

  return (
    <span
      key={person.id}
      ref={measure}
      className="block shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="block">
        <BirdAvatar user={person} size={size} />
      </span>
    </span>
  );
}

/* ── The byline ────────────────────────────────────────────────────── *
 *  The feed's 40px bird beside one line of 17px medium. With no batch
 *  line the type carries the identity alone, so it is one size up from
 *  the body and one weight up, and no more than that. */
export function Byline({
  person,
  size = 40,
  className,
}: {
  person: SketchPerson;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <FlushAvatar person={person} size={size} />
      <span className="min-w-0 truncate text-[17px] font-medium leading-none text-foreground">
        {person.name}
      </span>
    </div>
  );
}

/** 15 August 2026. The Edition has one date; an answer inside it has none. */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Hearts and replies ────────────────────────────────────────────── *
 *  The feed's own two controls, in the feed's own order, at the feed's
 *  own sizes. The negative left margin is the feed's too: it pulls the
 *  heart's padding outward so the GLYPH lines up with the text above it. */
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
      {/* Opening and closing are animated, which he asked for by name.
          Height and opacity only, and the exit is quicker than the enter
          so closing never lags behind the finger. */}
      <AnimatePresence initial={false}>
        {open && entry.commentCount > 0 && (
          <m.div
            key="replies"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.26, ease: EASE_OUT_SMOOTH },
              opacity: { duration: 0.18, ease: EASE_OUT_SMOOTH },
            }}
            className="overflow-hidden"
          >
            <Replies entry={entry} />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* Invented, and it has to stay invented: replies do not exist in the
   database yet, and no member's words are ever written into this
   repository. Picked by a hash of the entry id so an answer always opens
   the same way. */
const INVENTED_REPLIES = [
  { name: "Anjali Rao", text: "This is the best thing I have read all week." },
  { name: "Devika Menon", text: "Okay but you buried the lede here." },
  { name: "Rahul Iyer", text: "Sending this to the group immediately." },
  { name: "Nikhil Varma", text: "I was there for this and it was worse than described." },
  { name: "Meera Joshi", text: "Genuinely did not know this about you." },
  { name: "Arun Pillai", text: "Come back and tell us how it ends." },
];
const REPLY_AGO = ["2h", "5h", "1d"];

/** The feed's comment row, which is what he asked for: the bird, then the
 *  name in line with the words. A bird alone tells you nobody wrote it. */
function Replies({ entry }: { entry: SketchEntry }) {
  const seed = entry.id.charCodeAt(entry.id.length - 1);
  const rows = Array.from({ length: Math.min(entry.commentCount, 3) }, (_, i) => ({
    ...INVENTED_REPLIES[(seed + i * 3) % INVENTED_REPLIES.length],
    ago: REPLY_AGO[i % REPLY_AGO.length],
    id: `${entry.id}-r${i}`,
  }));
  return (
    <div className="space-y-3 pt-3">
      {rows.map((r) => (
        <div key={r.id} className="flex gap-2.5">
          <BirdAvatar user={{ id: r.id, name: r.name }} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
              <span className="mr-1.5 font-semibold">{r.name}</span>
              {r.text}
            </p>
            <div className="-mt-0.5 flex h-5 items-center gap-3 text-xs text-muted-foreground">
              <span>{r.ago}</span>
              <button
                type="button"
                className="rounded-sm font-medium transition-opacity duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Reply
              </button>
              <LoveButton
                liked={false}
                count={0}
                onToggle={() => {}}
                showCount={false}
                label="Like this reply"
                size="sm"
                className="-ml-1 font-medium [&>span]:leading-[14px]"
              />
            </div>
          </div>
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
 *  His precedent on photo captions (brief para 32): "let's keep the More
 *  and Less button, but maybe increase it from 2 lines to 3 lines. Or 3
 *  lines to 4 lines." So More survives and the threshold is generous. */
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
        /* `overflow-wrap: anywhere`, and it is not cosmetic. This is the bug
           recon root-caused on the shipped reader (F18): a member's pasted
           Spotify link is a 54-character run with no break opportunity.
           Without this the paragraph lays out wider than its tile and the
           words are cut off; on a phone it is what makes the page wider than
           the window, which is the green bar he has been looking at since
           para 11. The feed's reply row already carries it; the answer body
           never did. */
        className={cn(
          "whitespace-pre-line text-foreground [overflow-wrap:anywhere]",
          className,
        )}
        style={{
          fontSize: phone ? 15.5 : 16,
          lineHeight: 1.6,
          /* The paragraph fills its tile, and it is allowed to, because
             these are answers rather than an essay: the median one here
             is three lines. Capping it at a book's measure was tried and
             it put 280px of nothing down the right of every tile, which
             is the emptiness he objected to in the first place. The
             shipped reader he praised the margins of runs to 118
             characters a line. */
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
 *  Who may be named is decided in the loader (_data.ts), through the one
 *  helper; this only prints what it is handed. "Asked by", never
 *  "Siddhant asked" (R29). */
export function AskedBy({ name, className }: { name: string | null; className?: string }) {
  if (!name) return null;
  return <p className={cn("text-[13.5px] text-muted-foreground", className)}>Asked by {name}</p>;
}

/* ── Photographs ───────────────────────────────────────────────────── *
 *  His question, 2026-09-07: "with 3 pictures, you're putting it just
 *  like that. What if there's 10 pictures? Are you just going to squeeze
 *  all of them into one line, or what's your logic for this?"
 *
 *  The logic, and the app's own cap is half of it. An answer may carry
 *  THREE photographs (actions.ts:148, measured in recon F19), so a row is
 *  never asked to hold more than three:
 *
 *    one     edge to edge at its own proportions, height-capped, because
 *            a portrait at its true ratio is 470px of one answer and
 *            pushes everyone else off the screen.
 *    two or  one edge-to-edge row of equal squares, 4px apart. Not a
 *    three   hairline: "the margins between the photos are so thin" (R16).
 *    four +  the app's own carousel, in the same edge-to-edge frame. Only
 *            a row that predates the cap can reach this, and the
 *            pressure fixture has one.
 *
 *  Every one of them opens the shared viewer on a tap, at the one you
 *  tapped, and swipes from there: "when you click on them, it should open
 *  the image viewer, and then you can swipe through them."
 */
export function Photographs({
  entry,
  className,
  maxHeight,
}: {
  entry: SketchEntry;
  className?: string;
  maxHeight: number;
}) {
  /* The app's own one way into the viewer, and it has to be this one.
     Importing `ImageViewer` directly, which this file used to do, server
     renders a component whose last line is `createPortal(..., document.body)`
     -- so every page holding a photograph threw "document is not defined"
     during SSR and React silently threw the server's whole render away and
     started again on the client. Recoverable, invisible, and on a long
     Edition it is the whole page rendered twice. `lazy-image-viewer.tsx` says
     at the top that every caller must come through it, and now this one
     does; `image-viewer-import-rule.test.mjs` is what keeps it that way.
     The latch and the pointer preload come with it, which is the reason it
     exists: "Oh, wow. This doesn't even load. What? I clicked on picture." */
  const viewer = useImageViewer();
  const images = entry.images;
  if (images.length === 0) return null;

  const shots = images.map((src) => ({
    src,
    alt: "",
    caption: entry.body,
    author: { id: entry.author.id, name: entry.author.name, photoUrl: entry.author.photoUrl, birdOverride: entry.author.birdOverride },
    date: null,
  }));

  const open = viewer.open;
  /* The pointer is on its way to the picture; the chunk should be too. */
  const warm = { onPointerEnter: preloadImageViewer, onFocus: preloadImageViewer };
  const frame =
    "group relative block w-full overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";
  /* The one motion the design system allows on a photograph: the picture
     scales inside a frame that does not itself move. */
  const inner = "object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]";

  return (
    <>
      {images.length === 1 ? (
        <button
          type="button"
          onClick={() => open(0)}
          {...warm}
          aria-label="Open the photograph"
          className={cn(frame, className)}
          style={{
            aspectRatio: (() => {
              const s = entry.photos[0];
              const r = s?.width && s?.height ? s.width / s.height : 4 / 3;
              return Math.max(0.8, Math.min(r, 1.9));
            })(),
            maxHeight,
          }}
        >
          <Image src={images[0]} alt="" fill sizes="900px" className={inner} />
        </button>
      ) : images.length <= 3 ? (
        <div
          className={cn("grid gap-1", className)}
          style={{ gridTemplateColumns: `repeat(${images.length}, minmax(0,1fr))` }}
        >
          {images.map((src, i) => (
            <button
              /* Keyed by POSITION, not by url: an answer carrying the same
                 photograph twice (a duplicate upload, which nothing stops)
                 gave React two children with the same key, which it is
                 allowed to omit or duplicate. The url is not an identity
                 here; the slot is. */
              key={`${i}-${src}`}
              type="button"
              onClick={() => open(i)}
              {...warm}
              aria-label={`Open photograph ${i + 1}`}
              className={cn(frame, "aspect-square")}
            >
              <Image src={src} alt="" fill sizes="300px" className={inner} />
            </button>
          ))}
        </div>
      ) : (
        <Strip images={images} onOpen={open} className={className} />
      )}
      {viewer.mounted && (
        <LazyImageViewer
          images={shots}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}

/** Four or more: a swipeable strip in the same edge-to-edge frame, one
 *  photograph and a glimpse of the next, so it reads as "there is more
 *  this way" without a dot row saying so. */
function Strip({
  images,
  onOpen,
  className,
}: {
  images: string[];
  onOpen: (i: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex snap-x snap-mandatory gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {images.map((src, i) => (
        <button
          key={`${i}-${src}`}
          type="button"
          onClick={() => onOpen(i)}
          onPointerEnter={preloadImageViewer}
          onFocus={preloadImageViewer}
          aria-label={`Open photograph ${i + 1} of ${images.length}`}
          className="group relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="320px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        </button>
      ))}
    </div>
  );
}

/* ── A pasted link ─────────────────────────────────────────────────── *
 *  The whole card is the button; the URL is never printed. The still is
 *  small, 52px, the height of an album cover; a video keeps 16:9 at that
 *  height so it still reads as a frame from a film, and wears a play
 *  badge, which is all the platform name a reader needs. */
export function Media({ items, className }: { items: SketchMedia[]; className?: string }) {
  /* Which stills turned out not to exist. A YouTube thumbnail is DERIVED from
     the video id rather than fetched (_media.ts), so nothing has checked that
     the video is real -- and the pressure corpus contains an invented id on
     purpose. It 404s, and a 404 in an <img> is a broken-image glyph sitting in
     the middle of a song card. So a failed still falls back to the same music
     mark a link with no artwork already uses, and the card looks deliberate
     either way. */
  const [broken, setBroken] = useState<Record<string, boolean>>({});
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
          {m.art && !broken[m.url] ? (
            <span className="relative shrink-0">
              {/* Plain <img>, like the shipped SpotifyCard: these hosts are
                  on the CSP img-src allowlist but deliberately NOT on
                  next/image's remotePatterns. */}
              <img
                src={m.art}
                alt=""
                onError={() => setBroken((b) => ({ ...b, [m.url]: true }))}
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
