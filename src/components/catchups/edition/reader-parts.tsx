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

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ChatCircle, LinkSimple, MusicNotes, Play } from "@phosphor-icons/react";
import { SPRINGS } from "@/components/common/motion";
import { FlushAvatar } from "@/components/common/flush-avatar";
import { EntryLoveButton } from "@/components/catchups/edition/entry-love-button";
import { ENTRY_COMMENT_ACTIONS } from "@/components/catchups/edition/entry-comment-actions";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";
import { renderRichText } from "@/lib/rich-text";
import { linkRanges } from "@/lib/link-preview-core";
import { MAX_IMAGES } from "@/lib/upload-ownership-rule";
import { cn } from "@/lib/utils";
import type { CatchupLinkView, CatchupPersonRef } from "@/lib/catchups-types";
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
      <span className="descender-room min-w-0 truncate text-[17px] font-medium leading-none text-foreground">
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

  /* WHETHER "More" SHOWS IS MEASURED, not guessed. It used to be the
     character count alone, while the fold is a LINE count, and the two
     disagreed: he opened More on Mohini's answer and nothing more appeared
     (2026-09-10). Measured on her 805 characters -- 7 lines at 1512 and 8 at
     1440, so a 10-line fold hid 0px under a button that promised more; 18
     lines at 390, where it hid 198px and was right. The viewer's caption
     already learnt this and says why: the answer depends on the glyphs and on
     how wide the screen is (common/image-viewer.tsx).

     The character count stays as the cheap first pass, so an answer that
     cannot possibly fold never pays for a measurement. `folds` STARTS TRUE so
     the server's render and the first client render agree, which is what
     keeps the phone -- his own device, where long answers really do fold --
     from ever seeing the button arrive late and push the heart down. On a
     laptop a false button leaves in the layout effect instead. A
     ResizeObserver re-asks when the column changes width, because the
     answer changes with it. */
  const ref = useRef<HTMLParagraphElement>(null);
  const [folds, setFolds] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !long || open) return;
    const measure = () => setFolds(el.scrollHeight - el.clientHeight > 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [long, open, text]);

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
        ref={ref}
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
        /* `linkRanges`: a link still in the text is one that did NOT become a
           card, and it prints as an ordinary link rather than dead text (spec
           3.8). The same finder the loader stripped with, so the two agree. */
        dangerouslySetInnerHTML={{ __html: renderRichText(text, { linkRanges }) }}
      />
      {long && (folds || open) && (
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

/* ── A pasted link ─────────────────────────────────────────────────── *
 *  Transplanted from the lab's `Media` card (sketches/_parts.tsx), the
 *  shape he reviewed: the whole card is the button and the url is never
 *  printed. "We can just have the title, and the person, and the
 *  thumbnail. And small." (R6)
 *
 *  Three kinds, one card, and the difference is only the picture and the
 *  second line:
 *
 *    spotify  a 52px square, the height of an album cover. No second line:
 *             Spotify's keyless oembed has no artist, and the platform's
 *             name is not one (F33).
 *    youtube  the same 52px height at 92 wide, so it reads as a frame from a
 *             film, with a play badge; the channel under the title.
 *    link     any other page (his, 2026-09-14: "can't you show preview for
 *             any link even if they're not songs?"). Its preview image in
 *             the video's frame, and the site's own name -- or its address,
 *             when it gives none -- under the title, because with the url
 *             hidden that line is the only way to know where the card goes.
 *
 *  With no picture, or one that fails to load, a 52px tile holds a glyph:
 *  the music mark for a song, a link for a page. The images are ours
 *  (link-preview.ts re-hosts them), so a plain <img> needs no CSP entry;
 *  `next/image` is skipped because a 92px thumbnail gains nothing from the
 *  optimizer. */
function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkCard({ link, className }: { link: CatchupLinkView; className?: string }) {
  const [broken, setBroken] = useState(false);
  const square = link.kind === "spotify";
  const second = link.kind === "link" ? (link.subtitle ?? siteOf(link.url)) : link.subtitle;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "state-layer flex items-center gap-3 rounded-[10px] border border-border bg-card p-2 transition-[scale] duration-150 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {link.thumbUrl && !broken ? (
        <span className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="h-[52px] rounded-[6px] bg-muted object-cover"
            style={{ width: square ? 52 : 92 }}
          />
          {link.kind === "youtube" && (
            <span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
              <Play size={11} weight="fill" />
            </span>
          )}
        </span>
      ) : (
        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[6px] bg-muted text-muted-foreground">
          {link.kind === "link" ? (
            <LinkSimple size={22} weight="duotone" />
          ) : (
            <MusicNotes size={22} weight="duotone" />
          )}
        </span>
      )}
      <span className="min-w-0">
        {/* A page's title is the site's typing, not ours, and can be one long
            unbroken run; it breaks rather than widening the card past a
            390px phone. */}
        <span className="line-clamp-2 block break-words text-[14.5px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
          {link.title}
        </span>
        {second && (
          <span className="mt-1 block truncate text-[12.5px] text-muted-foreground">{second}</span>
        )}
      </span>
    </a>
  );
}

/* ── The heart, and the replies ─────────────────────────────────────── *
 *  Bottom left, at the feed's sizes, in the same place on every tile
 *  (R31, R15, R26). The negative left margin is the feed's too: it pulls
 *  the heart's own padding outward so the GLYPH lines up with the text
 *  above it.
 *
 *  The replies control arrived with the comments (build phase 9), which is
 *  the order it was always going to arrive in: drawing a control that
 *  opens nothing would be the "dead tile" fault in miniature (D18). It is
 *  the feed's own control -- same ChatCircle at 18, same count beside it,
 *  same padding -- because that is precisely what he asked for. N1: "I
 *  feel like the comment section can be done the same way that we do it in
 *  feed. I don't know why we're trying to do it in a different way ... I
 *  think we can just copy that comment section."
 *
 *  THE PANEL IS THE FEED'S TOO, and it brings its own open/close timeline
 *  with it -- one height spring driven by a ResizeObserver over the real
 *  content, which is N4 ("the comment section has to animate opening and
 *  closing correctly") answered by reuse rather than by a second
 *  implementation. All this file supplies is the AnimatePresence around it,
 *  the same as the feed card.
 *
 *  Loaded on demand, and preloaded on hover and focus: an Edition holds
 *  eleven questions and every answer under them owns one of these, so
 *  shipping the 700-line surface to a reader who never opens a thread would
 *  be the whole panel eleven times over for nothing.
 *
 *  THE COUNT IS NOT OPTIMISTIC ABOUT THE THREAD IT HAS NOT LOADED. It moves
 *  on the two events this component can actually witness -- a comment
 *  written here, a comment removed here -- and `expectedCount` hands the
 *  panel the same number so its skeleton is the right height on the way in.
 */

const CommentsSection = dynamic(
  () => import("@/components/posts/comments-section").then((m) => m.CommentsSection),
  { ssr: false }
);
const preloadComments = () => void import("@/components/posts/comments-section");

export function Reactions({
  entry,
  viewerIsAdmin = false,
  className,
}: {
  entry: EditionEntry;
  /** Shows the moderation "Remove" on every comment, as on the feed. */
  viewerIsAdmin?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(entry.commentCount);

  return (
    <>
      <div className={cn("-ml-2.5 flex items-center gap-1 text-muted-foreground", className)}>
        <EntryLoveButton
          entryId={entry.id}
          initialLoved={entry.lovedByViewer}
          initialCount={entry.loveCount}
        />

        <m.button
          onClick={() => setOpen((v) => !v)}
          onPointerEnter={preloadComments}
          onFocus={preloadComments}
          aria-expanded={open}
          aria-controls={`comments-${entry.id}`}
          aria-label={open ? "Hide replies" : "Show replies"}
          whileTap={{ scale: 0.93 }}
          transition={SPRINGS.snappy}
          className="state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChatCircle size={18} weight="regular" />
          <span>{commentCount}</span>
        </m.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <CommentsSection
            key="comments"
            targetId={entry.id}
            actions={ENTRY_COMMENT_ACTIONS}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
            onCommentRemoved={() => setCommentCount((c) => Math.max(0, c - 1))}
            viewerIsAdmin={viewerIsAdmin}
            expectedCount={commentCount}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Everyone who actually said something. An answer that is only a
 *  photograph is not empty: the photograph is the answer. */
export function said(entries: EditionEntry[]): EditionEntry[] {
  return entries.filter(
    (e) => Boolean(e.body?.trim()) || e.images.length > 0 || e.links.length > 0,
  );
}
