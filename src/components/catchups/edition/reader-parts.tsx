"use client";

/* ------------------------------------------------------------------ *
 *  The pieces of an answer, once.
 *
 *  Transplanted from `/lab/catchups/sketches/_parts.tsx`, which is the
 *  front runner he reviewed twice and signed off (front-runner.md, "What
 *  was built"). Every rule here is one of his, with his sentence beside
 *  it:
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
 *  - "Why do I need to know that she's written this at 6:09 PM?" (R10)
 *    No timestamps on an answer.
 *  - "Just delete it. If it's empty, just delete it." (R21) `said()`.
 *  - "Why aren't we saying 'asked by' this?" (R29)
 *  - "We can just have the title, and the person, and the thumbnail. And
 *    small." (R6)
 *  - "You've made the pictures edge to edge, which is a nice touch."
 *    (2026-09-07) And "the margins between the photos are so thin" (R16).
 *
 *  TWO THINGS THE DRAWING DID NOT HAVE, and they are the difference
 *  between the lab and the app:
 *
 *  1. RICH TEXT. The lab printed `entry.text` as a plain string. A real
 *     answer carries the composer's own emphasis markers, and the same
 *     field rendering two ways in one Edition is bugs.md #19. So the body
 *     goes through `renderRichText`, with `break-words` beside it --
 *     which `rich-text-wrapping.test.mjs` requires and F18 is the reason
 *     for: one pasted Spotify link is 369px of unbreakable text in a
 *     316px column, and it laid the whole document out wider than the
 *     phone.
 *  2. THE REAL HEART. `EntryLoveButton`, wired to `toggleEntryLove`, not
 *     the lab's local `useState`. The replies control beside it is build
 *     phase 9; there is nothing to open yet, so nothing is drawn.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MusicNotes, Play } from "@phosphor-icons/react";
import { FlushAvatar } from "@/components/common/flush-avatar";
import { EntryLoveButton } from "@/components/catchups/edition/entry-love-button";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";
import { renderRichText } from "@/lib/rich-text";
import { MAX_IMAGES } from "@/lib/upload-ownership-rule";
import { cn } from "@/lib/utils";
import type { CatchupPersonRef, CatchupSongView } from "@/lib/catchups-types";
import type { EditionEntry } from "@/lib/catchups-edition-view";
import type { ReaderAsker } from "./reader-types";

/* ── The byline ────────────────────────────────────────────────────── *
 *  The feed's 40px bird beside one line of 17px medium. With no batch
 *  line the type carries the identity alone, so it is one size up from
 *  the body and one weight up, and no more than that. */
export function Byline({
  person,
  size = 40,
  className,
}: {
  person: CatchupPersonRef;
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

/* ── The answer's words ────────────────────────────────────────────── *
 *  One size. 15.5px on a phone, 16 on a laptop, and nothing promotes a
 *  short answer to display type: "random massive fonts and different
 *  fonts. Let's just stop that." (R38)
 *
 *  His precedent on photo captions (brief 32): "let's keep the More and
 *  Less button, but maybe increase it from 2 lines to 3 lines. Or 3 lines
 *  to 4 lines." So More survives and the threshold is generous. */
const CLAMP_OVER_CHARS = 600;
const CLAMP_LINES = 10;

export function Body({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_OVER_CHARS;

  /* The fold, hoisted out of the element so the class list and the render call
     stay next to each other. `rich-text-wrapping.test.mjs` reads the 600
     characters BEFORE a `renderRichText` render looking for a break rule, and
     with this inline the two were 700 apart -- which is the test doing exactly
     its job, because the rule and the thing it protects drifting apart is how
     one of them gets edited without the other.

     The paragraph fills its tile, and it is allowed to, because these are
     answers rather than an essay: the median one here is three lines. Capping
     it at a book's measure was tried and it put 280px of nothing down the
     right of every tile, which is the emptiness he objected to in the first
     place. */
  const fold =
    long && !open
      ? {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical" as const,
          WebkitLineClamp: CLAMP_LINES,
          overflow: "hidden",
        }
      : undefined;

  return (
    <>
      <p
        /* `break-words` is not cosmetic. This is the bug recon root-caused on
           the shipped reader (F18): a member's pasted Spotify link is a
           54-character run with no break opportunity, so without it the
           paragraph lays out wider than its tile and, on a phone, wider than
           the window -- which is the green bar he has been looking at since
           brief 11. 15.5px on a phone and 16 on a laptop, as classes rather
           than a prop, so the server's one render is right at both widths. */
        className={cn(
          "whitespace-pre-line break-words text-[15.5px] leading-[1.6] text-foreground [overflow-wrap:anywhere] md:text-[16px]",
          className,
        )}
        style={fold}
        dangerouslySetInnerHTML={{ __html: renderRichText(text) }}
      />
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
 *  Who may be named is decided in the loader, through `askerVisible`; this
 *  only prints what it is handed. "Asked by", never "Siddhant asked" (R29).
 *  A library question prints nothing: nobody asked it. */
export function AskedBy({ asker, className }: { asker: ReaderAsker; className?: string }) {
  if (!asker) return null;
  const line = cn("mt-2 text-[13.5px] text-muted-foreground", className);
  if (asker.kind === "named") {
    return (
      <p className={line}>
        Asked by{" "}
        <Link
          href={`/profile/${asker.id}`}
          className="rounded-sm transition-colors duration-150 hover:text-foreground hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {asker.name}
        </Link>
      </p>
    );
  }
  /* Your own name under your own anonymous question, with nothing to explain
     it, reads exactly like the anonymity having failed (M10). So it says the
     word. And a question with no attribution at all left a reader to guess
     whether the asker was hidden or gone, which is what the second line is
     for. */
  return (
    <p className={line}>
      {asker.kind === "you-anonymous" ? "Asked by you, anonymously" : "Asked anonymously"}
    </p>
  );
}

/* ── Photographs ───────────────────────────────────────────────────── *
 *  His question, 2026-09-07: "with 3 pictures, you're putting it just like
 *  that. What if there's 10 pictures? Are you just going to squeeze all of
 *  them into one line, or what's your logic for this?"
 *
 *  The logic, and the app's own cap is half of it. An answer may carry
 *  `MAX_IMAGES` photographs -- three (measured in recon F19) -- so a row is
 *  never asked to hold more than that:
 *
 *    one     edge to edge at its own proportions, height-capped, because a
 *            portrait at its true ratio is 470px of one answer and pushes
 *            everyone else off the screen.
 *    two or  one edge-to-edge row of equal squares, 4px apart. Not a
 *    three   hairline: "the margins between the photos are so thin" (R16).
 *    four +  a swipeable strip in the same frame. Only a row written before
 *            the cap can reach this, and there are such rows.
 *
 *  Every one of them opens the shared viewer on a tap, at the one you
 *  tapped, and swipes from there: "when you click on them, it should open
 *  the image viewer, and then you can swipe through them."
 */
export function Photographs({
  entry,
  className,
}: {
  entry: EditionEntry;
  /** Carries the height cap: `max-h-[460px] md:max-h-[560px]`. A portrait at
   *  its true ratio is 470px of one answer and pushes everyone else off the
   *  screen, so it is capped -- in CSS, so both widths are right on the
   *  server's single render. */
  className?: string;
}) {
  /* The app's one way into the viewer, and it has to be this one. Importing
     `ImageViewer` directly server-renders a component whose last line is
     `createPortal(..., document.body)` -- so every page holding a photograph
     threw "document is not defined" during SSR and React silently threw the
     server's whole render away and started again on the client. Recoverable,
     invisible, and on a long Edition it is the whole page rendered twice
     (F36). `image-viewer-import-rule.test.mjs` keeps it that way. */
  const viewer = useImageViewer();
  const images = entry.images;
  if (images.length === 0) return null;

  const shots = images.map((src) => ({
    src,
    alt: "",
    caption: entry.body,
    author: entry.author,
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
          }}
        >
          <Image
            src={images[0]}
            alt=""
            fill
            sizes="900px"
            className={inner}
            placeholder={entry.photos[0]?.blurDataUrl ? "blur" : "empty"}
            blurDataURL={entry.photos[0]?.blurDataUrl ?? undefined}
          />
        </button>
      ) : images.length <= MAX_IMAGES ? (
        <div
          className={cn("grid gap-1 overflow-hidden", className)}
          style={{ gridTemplateColumns: `repeat(${images.length}, minmax(0,1fr))` }}
        >
          {images.map((src, i) => (
            <button
              /* Keyed by POSITION, not by url: an answer carrying the same
                 photograph twice (a duplicate upload, which nothing stops)
                 gave React two children with the same key, which it is allowed
                 to omit or duplicate. The url is not an identity here; the
                 slot is. */
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
        <PhotoStrip images={images} onOpen={open} className={className} />
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
 *  photograph and a glimpse of the next, so it reads as "there is more this
 *  way" without a dot row saying so. */
function PhotoStrip({
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
        className,
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

/* ── A song ────────────────────────────────────────────────────────── *
 *  The whole card is the button; the URL is never printed. The still is
 *  small, 52px, the height of an album cover; a video keeps 16:9 at that
 *  height so it still reads as a frame from a film, and wears a play badge,
 *  which is all the platform name a reader needs (R31, R6).
 *
 *  WHAT THIS DOES NOT DO YET. A link pasted into the BODY of an answer is
 *  still printed as text: resolving one is build phase 10 (spec 3.8), which
 *  adds the `LinkPreview` table and the two hosts. Today `entry.song` is
 *  only ever written by the old per-question Spotify field, and F29/F30
 *  measured it as null on every row in the database -- so in practice this
 *  card draws for nothing yet and is here because the shape is settled and
 *  phase 10 fills it rather than inventing it. */
export function SongCard({
  song,
  className,
}: {
  song: CatchupSongView;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const linked = Boolean(song.url);
  const isVideo = /youtube\.com|youtu\.be/.test(song.url);

  const inner = (
    <>
      {song.art && !broken ? (
        <span className="relative shrink-0">
          {/* Plain <img>: these hosts are on the CSP img-src allowlist but
              deliberately NOT on next/image's remotePatterns. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={song.art}
            alt=""
            onError={() => setBroken(true)}
            className="h-[52px] rounded-[6px] object-cover"
            style={{ width: isVideo ? 92 : 52 }}
          />
          {isVideo && (
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
          {song.title}
        </span>
      </span>
    </>
  );

  const shell = cn(
    "flex items-center gap-3 rounded-[10px] border border-border bg-card p-2",
    className,
  );
  if (!linked) return <div className={shell}>{inner}</div>;
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        shell,
        "state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      {inner}
    </a>
  );
}

/* ── The heart ─────────────────────────────────────────────────────── *
 *  Bottom left, at the feed's sizes, in the same place on every tile
 *  (R31, R15, R26). The negative left margin is the feed's too: it pulls
 *  the heart's own padding outward so the GLYPH lines up with the text
 *  above it.
 *
 *  The replies control that sits beside it in the drawing is build phase 9
 *  (spec 3.7). Drawing a control that opens nothing would be the "dead
 *  tile" fault in miniature (D18), so it arrives with the comments. */
export function Reactions({ entry, className }: { entry: EditionEntry; className?: string }) {
  return (
    <div className={cn("-ml-2.5 flex items-center gap-1 text-muted-foreground", className)}>
      <EntryLoveButton
        entryId={entry.id}
        initialLoved={entry.lovedByViewer}
        initialCount={entry.loveCount}
      />
    </div>
  );
}

/** Everyone who actually said something. An answer that is only a
 *  photograph is not empty: the photograph is the answer. */
export function said(entries: EditionEntry[]): EditionEntry[] {
  return entries.filter(
    (e) => Boolean(e.body?.trim()) || e.images.length > 0 || Boolean(e.song),
  );
}
