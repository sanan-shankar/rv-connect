/* ------------------------------------------------------------------ *
 *  "Every question is a page" (directions/08-whole-app.md), for the cull.
 *
 *  The bet: the reader is the product and the rest of the app is a door
 *  into it. So the shell LEAVES -- no green bar, no sidebar -- and the
 *  issue takes the whole screen behind one glass bar that prints two
 *  things, the Catch-up's name at the left and where you are at the
 *  right, with a spine of eleven segments along its bottom edge. The
 *  cover page is the masthead; every question after it is its own page.
 *
 *  Nothing here is wired, so the four things the direction can only prove
 *  live are drawn at rest instead:
 *   - the swipe becomes a labelled gap between two pages stacked in the
 *     tall Reader, one page drawn in full each time;
 *   - the spine's fill and the counter are drawn at the value they take
 *     on the page they sit on;
 *   - the sheet is drawn open over the page it opened from, unmoved;
 *   - the running head's 160ms fade is drawn at opacity 1 on every
 *     question page (see RUNNING_HEAD_NOTE).
 *
 *  Positioning: the bar is `fixed` on a real phone. In the two 844px
 *  screens it is `absolute` inside the frame, because ScaledFrame scales
 *  with a transform and `fixed` would escape it; in the tall Reader it is
 *  simply the first thing on each page, which is where it would first
 *  appear. Nothing branches on a Tailwind breakpoint: every size comes
 *  from the `viewport` prop, resolved by hand (display type 30px at 390,
 *  42px at 1512).
 *
 *  Data: the live Round. Two things it does not have, marked at the point
 *  of use -- no answer carries a RESOLVED song (the four music answers
 *  under question 5 hold a pasted link that nothing ever resolved, so a
 *  title and an artist are invented), and comment text does not exist at
 *  all, so the tile draws the glyph and its invented count and no words.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { ArrowRight, ChevronsLeft, Heart, MessageCircle, Play } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PhotoBed, PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows, PhotoStream } from "@/components/common/photo-rows";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import type {
  SketchDirection,
  SketchEntry,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "../_types";

/* ------------------------------------------------------------------ *
 *  The rungs the direction names, once each
 * ------------------------------------------------------------------ */

/** The label rung: 12px, uppercase, tracked. Uppercased in CSS, never in
 *  the data -- "in the loop" is typed lowercase and stays that way. */
const CAPS = "text-[12px] font-semibold uppercase tracking-[0.08em]";
/** The byline under a name in the identity row: 11px caps, muted. */
const BATCH = "text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";
/** Baskerville, tight, which is every heading, numeral and question here. */
const HEAD = "font-heading tracking-[-0.025em] text-foreground";

const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** The bar: 56px on the cover, 76px on a question page (a 20px second row
 *  for the running head). The spine sits ON the bottom edge of either. */
const BAR_COVER = 56;
const BAR_QUESTION = 76;

/** A tile's width and padding at each viewport (direction, "The answer
 *  tile"): 358/12 at 390, 440/16 at 1512. */
const TILE = {
  phone: { width: 358, pad: 12, inner: 334 },
  laptop: { width: 440, pad: 16, inner: 408 },
} as const;

/** The two column measures at 1512: a question page runs 904 (two 440s
 *  with 24 between), the cover and the end page run 680. */
const COLUMN = { question: 904, cover: 680 } as const;
const RAIL_WIDTH = 280;

/** The tall Reader draws every question page with its running head at
 *  opacity 1. On the real thing it is at 0 until the page's own heading
 *  scrolls under the bar, and fades in over 160ms; the bar's height never
 *  changes either way. Drawn visible here because an invisible element
 *  teaches the cull nothing, and MidScroll is where it is honest. */
const RUNNING_HEAD_NOTE = true;

/* ------------------------------------------------------------------ *
 *  Reading the Round
 * ------------------------------------------------------------------ */

const MUSIC_LINK =
  /https?:\/\/(?:open\.spotify\.com|spotify\.link|(?:www\.)?youtube\.com|youtu\.be|music\.apple\.com)\/\S+/i;

function musicLinkIn(body: string | null): string | null {
  return body ? (body.match(MUSIC_LINK)?.[0] ?? null) : null;
}

function hasMusic(entry: SketchEntry): boolean {
  return Boolean(entry.song) || musicLinkIn(entry.body) !== null;
}

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** INVENTED, and the only invented words on this page. Four answers under
 *  question 5 are a pasted music link that nothing ever resolved, so the
 *  Round holds a URL and no title; the direction's card needs a title and
 *  an artist. The first two are the direction's own samples. */
const INVENTED_SONGS = [
  { title: "Thendral Vanthu Theendum Pothu", artist: "Ilaiyaraaja" },
  { title: "Malargal Kaettaen, live at the Academy", artist: "A R Rahman" },
  { title: "Kabhi Kabhie Mere Dil Mein", artist: "Mukesh" },
  { title: "Aaromale", artist: "Alphons Joseph" },
] as const;

function sourceWord(url: string): string {
  if (/youtu/i.test(url)) return "YouTube";
  if (/music\.apple/i.test(url)) return "Apple Music";
  return "Spotify";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const photoCount = (q: SketchQuestion) => q.entries.reduce((n, e) => n + e.images.length, 0);

/** "13 answers · 4 photographs", the one line under every contents row,
 *  in the sheet, on the cover and in the rail. */
function countsLine(q: SketchQuestion): string {
  const shots = photoCount(q);
  return metaLine(plural(q.entries.length, "answer", "answers"), shots > 0 && plural(shots, "photograph", "photographs"));
}

/** The cover's picture: the Round's most-hearted photograph, and whose it
 *  is, for the credit line. Null when the Round has no photograph at all,
 *  which is where the flock of birds goes instead. */
function mostHearted(round: SketchRound): { src: string; photo: StoredPhoto | null; by: string } | null {
  let best: { src: string; photo: StoredPhoto | null; by: string; loveCount: number } | null = null;
  for (const q of round.questions) {
    for (const e of q.entries) {
      if (e.images.length === 0) continue;
      if (!best || e.loveCount > best.loveCount) {
        best = { src: e.images[0], photo: e.photos[0] ?? null, by: e.author.name, loveCount: e.loveCount };
      }
    }
  }
  return best;
}

/** A photograph we were never told the shape of. 4:3 is the guess, and it
 *  is only ever a guess -- `photos[i]` is null for anything uploaded
 *  before the Image table, so a drawing must not crash on it. */
const UNMEASURED: StoredPhoto = { width: 4, height: 3, focalX: 0.5, focalY: 0.5, blurDataUrl: null };

function shotsOf(entry: SketchEntry) {
  return entry.images.map((src, i) => ({ src, ...(entry.photos[i] ?? UNMEASURED) }));
}

/* ------------------------------------------------------------------ *
 *  The height packer, for the laptop's two columns
 *
 *  The direction: "packed by height so short answers sit beside long ones
 *  and the page ends level. Reading order is down the left column, then
 *  down the right." Those two together mean ONE cut through the sequence,
 *  at the point where the running height passes half -- not an
 *  interleave, which would scramble the order. It is an estimate, exactly
 *  as the direction says a server-side packer would be; the real one
 *  corrects on the client after fonts load.
 * ------------------------------------------------------------------ */

/** Source Sans 3 at 16px, measured across this Round's answers: about
 *  7.6px a character, so 408px of column takes about 54 of them. */
const CHARS_PER_LINE = 54;
const LINE_HEIGHT = 25.6; // 16px at 1.6

function photosHeight(entry: SketchEntry, width: number): number {
  const ratios = shotsOf(entry).map((p) => Math.max(0.75, p.width / p.height));
  if (ratios.length === 0) return 0;
  if (ratios.length === 1) return Math.min(500, width / ratios[0]);
  let total = 0;
  let row: number[] = [];
  const flush = () => {
    const sum = row.reduce((a, b) => a + b, 0);
    total += (width - 6 * (row.length - 1)) / sum + 6;
    row = [];
  };
  for (const r of ratios) {
    row.push(r);
    if (row.reduce((a, b) => a + b, 0) >= 1.8) flush();
  }
  if (row.length > 0) flush();
  return total;
}

function tileHeight(entry: SketchEntry, width: number): number {
  let h = TILE.laptop.pad * 2 + 40; // padding plus the identity row
  const body = entry.body?.trim() ?? "";
  if (body) {
    const lines = body
      .split("\n")
      .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
    h += 12 + lines * LINE_HEIGHT;
  }
  if (entry.images.length > 0) h += 12 + photosHeight(entry, width);
  if (hasMusic(entry)) h += 12 + 88;
  return h;
}

function packColumns(entries: SketchEntry[]): [SketchEntry[], SketchEntry[]] {
  if (entries.length < 2) return [entries, []];
  const heights = entries.map((e) => tileHeight(e, TILE.laptop.inner) + 10);
  const total = heights.reduce((a, b) => a + b, 0);
  let run = 0;
  let cut = entries.length;
  for (let i = 0; i < entries.length; i += 1) {
    run += heights[i];
    if (run >= total / 2) {
      cut = i + 1;
      break;
    }
  }
  return [entries.slice(0, cut), entries.slice(cut)];
}

/* ------------------------------------------------------------------ *
 *  The bar, and the spine along its bottom edge
 * ------------------------------------------------------------------ */

/** Eleven segments, 2px gaps, filled Canopy up to and including the page
 *  you are on. None filled on the cover; all filled on the end page. */
function Spine({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-[2px] gap-[2px]">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("flex-1", i < filled ? "bg-canopy" : "bg-border")} />
      ))}
    </div>
  );
}

/**
 * The whole navigation, resting.
 *
 * @param index null on the cover page, otherwise the question's 0-based
 *              index, which decides the counter and the spine's fill.
 * @param position `absolute` inside an 844px screen; `static` (drawn
 *              relative, so the spine can hang off the bottom edge) at
 *              the head of a page in the tall Reader.
 */
function ReaderBar({
  round,
  index,
  position = "static",
  runningHead = false,
}: {
  round: SketchRound;
  index: number | null;
  position?: "static" | "absolute";
  runningHead?: boolean;
}) {
  const total = round.questions.length;
  const onQuestion = index !== null;
  return (
    <header
      className="glass z-40 w-full"
      style={{
        position: position === "absolute" ? "absolute" : "relative",
        top: 0,
        left: 0,
        height: onQuestion ? BAR_QUESTION : BAR_COVER,
      }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* The way home from any depth, at every scroll position: one tap
            and the shell is back. There is no other back control. */}
        <span className={cn(HEAD, "text-[16px] font-medium leading-none")}>{round.catchupName}</span>
        <span className={cn(CAPS, "text-leaf")}>{onQuestion ? `${index + 1} of ${total}` : "Contents"}</span>
      </div>
      {onQuestion && (
        <div className="h-5 px-4">
          <p
            className="truncate text-[14px] leading-5 text-foreground"
            style={{ opacity: runningHead ? 1 : 0 }}
          >
            {round.questions[index].text}
          </p>
        </div>
      )}
      <Spine total={total} filled={onQuestion ? index + 1 : 0} />
    </header>
  );
}

/* ------------------------------------------------------------------ *
 *  The answer tile
 *
 *  Break 3 of the direction: the heart and the comment glyph move up into
 *  the identity row and the card's bottom band goes, so a one-word answer
 *  is 102px of tile instead of three centimetres of white.
 * ------------------------------------------------------------------ */

/** The trailing cluster. Static: a real one is the shared LoveButton,
 *  which needs an action. Each glyph is a 44px target on the real thing;
 *  the extra 2px a side overhangs the card's own padding, so the row
 *  stays 40px tall and the drawing does not need to show it. */
function TileChrome({ entry }: { entry: SketchEntry }) {
  return (
    <div className="flex shrink-0 items-start gap-4">
      <span className="flex h-10 items-center gap-1.5">
        <Heart
          className={cn("h-5 w-5", entry.lovedByViewer ? "fill-heart text-heart" : "text-muted-foreground")}
          strokeWidth={1.9}
        />
        {entry.loveCount > 0 && (
          <span className="text-[14px] leading-none text-muted-foreground">{entry.loveCount}</span>
        )}
      </span>
      <span className="flex h-10 items-center gap-1.5">
        <MessageCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.9} />
        {/* INVENTED count (comments do not exist yet). The glyph stands
            alone when there are none, which is most of them. */}
        {entry.commentCount > 0 && (
          <span className="text-[14px] leading-none text-muted-foreground">{entry.commentCount}</span>
        )}
      </span>
    </div>
  );
}

/** The body, with a pasted music link left exactly as it was typed and
 *  drawn as a leaf link. renderRichText does not linkify a bare URL, so
 *  the text is split around it and each half rendered on its own; the
 *  link wraps at any character so it can never push the page sideways. */
function AnswerBody({ body, className }: { body: string; className: string }) {
  const link = musicLinkIn(body);
  if (!link) return <p className={className} dangerouslySetInnerHTML={{ __html: renderRichText(body) }} />;
  const at = body.indexOf(link);
  const before = body.slice(0, at);
  const after = body.slice(at + link.length);
  return (
    <p className={className}>
      {before && <span dangerouslySetInnerHTML={{ __html: renderRichText(before) }} />}
      <span className="text-leaf underline underline-offset-2 [overflow-wrap:anywhere]">{link}</span>
      {after && <span dangerouslySetInnerHTML={{ __html: renderRichText(after) }} />}
    </p>
  );
}

/** The tile's one well: a mist card at 12px radius, 88 tall, the art at
 *  64x64 (96x54 for video) at 8.8px, then the title, the artist and the
 *  source word. */
function SongCard({ entry }: { entry: SketchEntry }) {
  const url = entry.song?.url ?? musicLinkIn(entry.body) ?? "";
  const video = /youtu/i.test(url);
  // INVENTED title and artist: see INVENTED_SONGS.
  const invented = INVENTED_SONGS[hash(entry.id) % INVENTED_SONGS.length];
  const title = entry.song?.title ?? invented.title;
  const artist = entry.song ? null : invented.artist;
  const art = entry.song?.art ?? null;
  return (
    <div
      className="mt-3 flex items-center gap-3 overflow-hidden rounded-[var(--radius-md)] bg-mist p-3"
      style={{ height: 88 }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          className="shrink-0 rounded-[var(--radius-sm)] object-cover"
          style={{ width: video ? 96 : 64, height: video ? 54 : 64 }}
        />
      ) : (
        <span
          className="grid shrink-0 place-items-center rounded-[var(--radius-sm)] bg-leaf/10 text-leaf"
          style={{ width: video ? 96 : 64, height: video ? 54 : 64 }}
        >
          {video ? <Play className="h-6 w-6" strokeWidth={1.9} /> : <MusicNotes size={26} weight="duotone" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-foreground">{title}</p>
        {artist && <p className="mt-1 truncate text-[13px] text-muted-foreground">{artist}</p>}
        <p className={cn(CAPS, "mt-1.5 text-muted-foreground")}>{sourceWord(url)}</p>
      </div>
    </div>
  );
}

function AnswerTile({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  const t = TILE[viewport];
  const body = entry.body?.trim() ?? "";
  const shots = shotsOf(entry);
  return (
    <article
      className="card-elevated overflow-hidden rounded-[var(--radius)] bg-card"
      style={{ width: t.width, padding: t.pad }}
    >
      {/* The tile's chrome, all of it. There is no band at the bottom. */}
      <div className="flex items-start gap-3">
        <BirdAvatar user={entry.author} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-[1.25] text-foreground">{entry.author.name}</p>
          <p className={cn(BATCH, "mt-1")}>{entry.author.batchLine}</p>
        </div>
        <TileChrome entry={entry} />
      </div>

      {body && (
        <AnswerBody
          body={body}
          className="mt-3 whitespace-pre-wrap text-[16px] leading-[1.6] text-foreground"
        />
      )}

      {shots.length === 1 && (
        <PhotoFrame
          src={shots[0].src}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          className="mt-3 rounded-[var(--radius-md)]"
          fallbackClassName="max-h-[420px] rounded-[var(--radius-md)]"
        />
      )}
      {shots.length > 1 && (
        <PhotoRows photos={shots} gap={6} columnSizes={PHOTO_SIZES} className="mt-3" keyOf={(p) => p.src}>
          {(p, _i, cell) => (
            <img
              src={p.src}
              alt=""
              loading="lazy"
              className="w-full rounded-[var(--radius-md)] object-cover"
              style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition, maxHeight: cell.maxHeight }}
            />
          )}
        </PhotoRows>
      )}

      {hasMusic(entry) && <SongCard entry={entry} />}
    </article>
  );
}

/* ------------------------------------------------------------------ *
 *  A photo wall: a question whose answers ARE photographs, so its page
 *  has no tiles at all -- justified rows at 4px, 8.8px corners, and the
 *  names live in the viewer rather than under every thumbnail.
 * ------------------------------------------------------------------ */

function PhotoWall({ q }: { q: SketchQuestion }) {
  const shots = q.entries.flatMap((e) => shotsOf(e));
  return (
    <PhotoStream photos={shots} gap={4} as="ul" keyOf={(p) => p.src}>
      {(p, _i, cell) => (
        <img
          src={p.src}
          alt=""
          loading="lazy"
          className="w-full rounded-[var(--radius-sm)] object-cover"
          style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition }}
        />
      )}
    </PhotoStream>
  );
}

/* ------------------------------------------------------------------ *
 *  The Next block: what is waiting at the foot of every page
 * ------------------------------------------------------------------ */

function NextBlock({ q, width, viewport }: { q: SketchQuestion; width: number; viewport: SketchViewport }) {
  return (
    <div
      className="card-elevated flex items-center gap-4 rounded-[var(--radius)] bg-card px-4 py-3"
      style={{ width, minHeight: 88 }}
    >
      <div className="min-w-0 flex-1">
        <p className={cn(CAPS, "text-muted-foreground")}>Next</p>
        <p className={cn(HEAD, "mt-1.5", viewport === "laptop" ? "text-[20px]" : "text-[17px]", "leading-[1.3]")}>
          {q.text}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.9} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The cover page: the masthead
 * ------------------------------------------------------------------ */

/** The writers, always by bird AND by name, never as a count. Bird 24,
 *  name 15px, 8px between the two, 12px between items, 8px between lines. */
function WritersFlow({ people }: { people: SketchRound["contributors"] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {people.map((p) => (
        <span key={p.id} className="flex items-center gap-2">
          <BirdAvatar user={p} size={24} />
          <span className="text-[15px] leading-none text-foreground">{p.name}</span>
        </span>
      ))}
    </div>
  );
}

/** The picture band. A 4:3 window with the photograph drawn at its own
 *  shape inside it on its own blurred bed, so a tall one is not cropped
 *  to a letterbox. PhotoFrame answers "one photograph, one column"; this
 *  is a fixed band, so it borrows PhotoBed and sets the window itself. */
function CoverPicture({
  picture,
  round,
  width,
  height,
  radius,
}: {
  picture: ReturnType<typeof mostHearted>;
  round: SketchRound;
  width: number;
  height: number;
  radius: number;
}) {
  if (!picture) {
    /* No photograph in the whole Round: the flock. The writers' own birds
       on paper, scattered, with their names printed under the band. Fifty
       valley birds that each belong to one person is the thing no other
       product has, and this is where it is spent. */
    return (
      <div
        className="flex flex-wrap content-center items-center justify-center gap-4 overflow-hidden bg-card px-6"
        style={{ width, height, borderRadius: radius }}
      >
        {round.contributors.map((p) => (
          <span key={p.id} style={{ transform: `translateY(${(hash(p.id) % 5) * 6 - 12}px)` }}>
            <BirdAvatar user={p} size={40} />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden bg-mist"
      style={{ width, height, borderRadius: radius }}
    >
      <PhotoBed src={picture.src} />
      <img
        src={picture.src}
        alt=""
        className="relative h-full w-auto max-w-full object-cover"
        style={{
          aspectRatio: picture.photo ? `${picture.photo.width} / ${picture.photo.height}` : "4 / 3",
        }}
      />
    </div>
  );
}

function CoverContentsRow({ q, n }: { q: SketchQuestion; n: number }) {
  return (
    <div className="flex">
      <span className={cn(HEAD, "w-6 shrink-0 text-[14px] leading-[1.4] text-muted-foreground")}>{n}</span>
      <div className="min-w-0 flex-1">
        <p className={cn(HEAD, "text-[17px] leading-[1.35]")}>{q.text}</p>
        <p className="mt-[3px] text-[13px] leading-tight text-muted-foreground">{countsLine(q)}</p>
      </div>
    </div>
  );
}

function CoverPage({ round, viewport }: SketchProps) {
  const picture = mostHearted(round);
  const phone = viewport === "phone";
  const writers =
    round.contributors.length === 1
      ? `${round.contributors[0].name} wrote in`
      : `${round.contributors.length} wrote in`;

  if (phone) {
    return (
      <section className="bg-background">
        <ReaderBar round={round} index={null} />
        {/* The direction's own first screen at 390, to the pixel: the date
            at 80, "Round 1" at 100, the picture 154 to 446, the credit at
            454, the writers 502 to 662, the contents from 708. */}
        <div className="pt-6 pb-[26px]">
          <p className={cn(CAPS, "px-4 text-leaf")}>{formatDisplayDateLong(round.publishedAt)}</p>
          <h1 className={cn(HEAD, "mt-[6px] px-4 text-[30px] leading-[1.25]")}>Round {round.number}</h1>
          {/* Break 2: the cover photograph bleeds to both edges with no
              radius. It is not inside a card; it is the cover of an issue. */}
          <div className="mt-4">
            <CoverPicture picture={picture} round={round} width={390} height={292} radius={0} />
          </div>
          {picture && (
            <p className="mt-2 px-4 text-right text-[12px] text-muted-foreground">Photograph by {picture.by}</p>
          )}
          <p className={cn(CAPS, "mt-[13px] px-4 text-cinnamon")}>{writers}</p>
          <div className="mt-[6px] px-4">
            <WritersFlow people={round.contributors} />
          </div>
          <p className={cn(CAPS, "mt-[26px] px-4 text-sky")}>{plural(round.questions.length, "question", "questions")}</p>
          <div className="mt-[6px] flex flex-col gap-3 px-4">
            {round.questions.map((q, i) => (
              <CoverContentsRow key={q.id} q={q} n={i + 1} />
            ))}
          </div>
          <div className="mt-[26px] px-4">
            <NextBlock q={round.questions[0]} width={358} viewport="phone" />
          </div>
        </div>
      </section>
    );
  }

  /* At 1512 the contents block is not drawn: the rail holds it. */
  return (
    <div className="relative flex bg-background">
      <Rail round={round} current={null} />
      <ValleyBase>
        <div className="relative mx-auto pb-[42px] pt-16" style={{ width: COLUMN.cover }}>
          <p className={cn(CAPS, "text-leaf")}>{formatDisplayDateLong(round.publishedAt)}</p>
          <h1 className={cn(HEAD, "mt-2 text-[42px] leading-[1.2]")}>Round {round.number}</h1>
          <div className="mt-3">
            <CoverPicture picture={picture} round={round} width={COLUMN.cover} height={510} radius={16} />
          </div>
          {picture && (
            <p className="mt-2 text-right text-[12px] text-muted-foreground">Photograph by {picture.by}</p>
          )}
          <p className={cn(CAPS, "mt-[15px] text-cinnamon")}>{writers}</p>
          <div className="mt-2">
            <WritersFlow people={round.contributors} />
          </div>
          <div className="mt-8">
            <NextBlock q={round.questions[0]} width={COLUMN.cover} viewport="laptop" />
          </div>
        </div>
      </ValleyBase>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  A question page
 * ------------------------------------------------------------------ */

function QuestionHeading({ q, viewport }: { q: SketchQuestion; viewport: SketchViewport }) {
  return (
    <>
      {/* No "Question 5", no numeral, no rule. The page's number is in the
          bar and in the rail, which is where numbers are navigation. */}
      <h2 className={cn(HEAD, viewport === "laptop" ? "text-[32px]" : "text-[24px]", "leading-[1.25]")}>{q.text}</h2>
      {q.showAsker && q.asker && (
        <p className="mt-[6px] text-[13px] text-muted-foreground">asked by {q.asker.name}</p>
      )}
    </>
  );
}

function QuestionPage({ round, index, viewport }: { round: SketchRound; index: number; viewport: SketchViewport }) {
  const q = round.questions[index];
  const next = round.questions[index + 1];
  const wall = q.kind === "photo";

  if (viewport === "phone") {
    return (
      <section className="bg-background">
        <ReaderBar round={round} index={index} runningHead={RUNNING_HEAD_NOTE} />
        <div className="px-4 pt-6 pb-[26px]">
          <QuestionHeading q={q} viewport="phone" />
          <div className="mt-4">
            {wall ? (
              <PhotoWall q={q} />
            ) : (
              <div className="flex flex-col gap-[10px]">
                {q.entries.map((e) => (
                  <AnswerTile key={e.id} entry={e} viewport="phone" />
                ))}
              </div>
            )}
          </div>
          {next && (
            <div className="mt-[26px]">
              <NextBlock q={next} width={358} viewport="phone" />
            </div>
          )}
        </div>
      </section>
    );
  }

  const [left, right] = packColumns(q.entries);
  return (
    <div className="relative flex bg-background">
      <Rail round={round} current={index} />
      <ValleyBase>
        <div className="relative mx-auto pb-[42px] pt-16" style={{ width: COLUMN.question }}>
          <QuestionHeading q={q} viewport="laptop" />
          <div className="mt-4">
            {wall ? (
              <PhotoWall q={q} />
            ) : (
              /* Break 5: two columns of 440 with 24 between, so a long
                 answer sits beside a one-liner and the page ends level. */
              <div className="flex gap-6">
                <div className="flex flex-col gap-[10px]" style={{ width: TILE.laptop.width }}>
                  {left.map((e) => (
                    <AnswerTile key={e.id} entry={e} viewport="laptop" />
                  ))}
                </div>
                {right.length > 0 && (
                  <div className="flex flex-col gap-[10px]" style={{ width: TILE.laptop.width }}>
                    {right.map((e) => (
                      <AnswerTile key={e.id} entry={e} viewport="laptop" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {next && (
            <div className="mt-[26px]">
              <NextBlock q={next} width={COLUMN.question} viewport="laptop" />
            </div>
          )}
        </div>
      </ValleyBase>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The desktop plan: the rail, and the page base beside it
 * ------------------------------------------------------------------ */

/** Everything outside the reading column is the page base with the valley
 *  photograph at its 11%, the same one the shell paints. It is the other
 *  half of the answer to "have I left my app?" -- the shell's rail is
 *  gone, but the ground under it has not changed. */
function ValleyBase({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0 flex-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-[0.11]"
        style={{ backgroundImage: "url(/images/landing.jpeg)" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function RailRow({
  n,
  text,
  right,
  current,
}: {
  n: string | null;
  text: string;
  right?: string;
  current: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-[var(--radius-sm)] px-2 py-[10px]",
        current ? "bg-canopy/10 text-canopy" : "text-foreground"
      )}
    >
      <span className={cn("w-5 shrink-0 text-[14px] leading-[1.4]", current ? "text-canopy" : "text-muted-foreground")}>
        {n}
      </span>
      {/* The one place this direction cuts a question short, and it says so:
          three lines in the rail, the full text one click away as the page's
          own heading. */}
      <span className="line-clamp-3 min-w-0 flex-1 text-[14px] leading-[1.4]">{text}</span>
      {right && (
        <span className={cn("shrink-0 text-[13px] leading-[1.5]", current ? "text-canopy" : "text-muted-foreground")}>
          {right}
        </span>
      )}
    </div>
  );
}

/** 280 wide, paper, a hairline right border, and the masthead's residue at
 *  its head: the mark for the app, the name for the home. */
function Rail({ round, current }: { round: SketchRound; current: number | null }) {
  return (
    <aside className="relative z-10 shrink-0 border-r border-border bg-card" style={{ width: RAIL_WIDTH }}>
      <div className="px-4 pt-6">
        <span className="flex items-center gap-2">
          <PeaksMark size={22} />
          <span className={cn(HEAD, "text-[16px] leading-none")}>Rishi Valley</span>
        </span>
        <p className={cn(HEAD, "mt-8 text-[20px] leading-none")}>{round.catchupName}</p>
        <p className="mt-2 text-[13px] leading-tight text-muted-foreground">
          {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
        </p>
        <div className="mt-6 -mx-2">
          <RailRow n={null} text="Cover" current={current === null} />
          <div className="mt-2">
            {round.questions.map((q, i) => (
              <RailRow
                key={q.id}
                n={String(i + 1)}
                text={q.text}
                right={String(q.entries.length)}
                current={current === i}
              />
            ))}
          </div>
          <RailRow n={null} text="The end" current={false} />
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 *  The labelled gaps between pages
 *
 *  Lab annotation, not app chrome: a dashed pill in the margin, set apart
 *  from anything the reader itself draws.
 * ------------------------------------------------------------------ */

function Gap({ text }: { text: string }) {
  return (
    <div className="bg-background px-4 py-[26px]">
      <span
        className={cn(
          CAPS,
          "inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-muted-foreground"
        )}
      >
        <ChevronsLeft size={13} />
        {text}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Reader
 * ------------------------------------------------------------------ */

function ReaderPhone({ round }: { round: SketchRound }) {
  return (
    <div className="bg-background">
      <CoverPage round={round} viewport="phone" />
      {round.questions.slice(0, 3).map((q, i) => (
        <div key={q.id}>
          <Gap text={`one swipe left: question ${i + 1}`} />
          <QuestionPage round={round} index={i} viewport="phone" />
        </div>
      ))}
    </div>
  );
}

function ReaderLaptop({ round }: { round: SketchRound }) {
  return (
    <div className="bg-background">
      <CoverPage round={round} viewport="laptop" />
      {round.questions.slice(0, 3).map((q, i) => (
        <div key={q.id}>
          <Gap
            text={
              i === 0
                ? "one page over: question 1, by the right arrow key, a rail row or NEXT"
                : `question ${i + 1}`
            }
          />
          <QuestionPage round={round} index={i} viewport="laptop" />
        </div>
      ))}
    </div>
  );
}

function Reader({ round, viewport }: SketchProps) {
  return viewport === "laptop" ? <ReaderLaptop round={round} /> : <ReaderPhone round={round} />;
}

/* ------------------------------------------------------------------ *
 *  The two 390x844 screens
 * ------------------------------------------------------------------ */

const bodyLength = (e: SketchEntry) => (e.body?.trim() ?? "").length;

/**
 * Deep in question 5, composed rather than scrolled.
 *
 * The direction's own mid-scroll screen: the tail of one tile cut by the
 * bar, then the music answers with their cards, then a one-line answer,
 * then the top of the next tile cut by the screen's edge. The order is
 * CHOSEN, not the Round's: it puts the four tile shapes the direction
 * names on one screen, which is what the screen is for. Everything in
 * them is the real answer.
 */
function questionFive(round: SketchRound) {
  const index = Math.min(4, round.questions.length - 1);
  const q = round.questions[index];
  const music = q.entries.filter(hasMusic).slice(0, 2);
  const rest = q.entries.filter((e) => !music.includes(e));
  const tail = rest[0] ?? q.entries[0];
  const others = rest.filter((e) => e !== tail);
  const byLength = [...others].sort((a, b) => bodyLength(a) - bodyLength(b));
  const shortest = byLength[0];
  const longest = byLength[byLength.length - 1];
  const below: SketchEntry[] = [];
  for (const e of [...music, shortest, longest]) if (e && !below.includes(e)) below.push(e);
  return { index, q, tail, below };
}

/** The tail of a tile, cut exactly where a scroll would cut it: a 52px
 *  window with the tile bottom-aligned inside it, so nothing has to know
 *  how tall the tile is. */
function TileTail({ entry }: { entry: SketchEntry }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 52 }}>
      <div className="absolute inset-x-0 bottom-0">
        <AnswerTile entry={entry} viewport="phone" />
      </div>
    </div>
  );
}

function QuestionFiveScreen({ round }: { round: SketchRound }) {
  const { index, tail, below } = questionFive(round);
  return (
    <>
      <div className="absolute inset-x-0 px-4" style={{ top: BAR_QUESTION }}>
        <TileTail entry={tail} />
        {below.map((e) => (
          <div key={e.id} className="mt-[10px]">
            <AnswerTile entry={e} viewport="phone" />
          </div>
        ))}
      </div>
      {/* Fixed on a real phone; absolute here, because the frame scales
          with a transform and fixed would escape it. */}
      <ReaderBar round={round} index={index} position="absolute" runningHead />
    </>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <QuestionFiveScreen round={round} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The contents sheet
 *
 *  It rises to 70% of the screen, 590px at 844, and scrolls inside. The
 *  eleven rows do not fit in 590, which is the honest finding: the sheet
 *  opens scrolled so the current row is in view, and "The end" is at the
 *  bottom of its own scroll. The offset below is estimated from the row
 *  heights for exactly that reason -- there is nothing to measure in a
 *  static drawing.
 * ------------------------------------------------------------------ */

const SHEET_HEIGHT = 590;
/** 590 less the handle, the label line and the pad for the home indicator. */
const SHEET_LIST_HEIGHT = 519;

/** 16px Source Sans at 302px of row: about 37 characters a line. */
const SHEET_CHARS_PER_LINE = 37;

function sheetRowHeight(q: SketchQuestion): number {
  return 20 + Math.max(1, Math.ceil(q.text.length / SHEET_CHARS_PER_LINE)) * 22 + 2 + 18;
}

function sheetOffset(round: SketchRound, current: number): number {
  const rows = round.questions.map(sheetRowHeight);
  const plain = 39; // "Cover" and "The end"
  const total = plain * 2 + rows.reduce((a, b) => a + b, 0);
  const top = plain + rows.slice(0, current).reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(Math.max(0, total - SHEET_LIST_HEIGHT), top - 24));
}

function SheetRow({
  n,
  title,
  sub,
  current,
}: {
  n: string | null;
  title: string;
  sub?: string;
  current: boolean;
}) {
  return (
    <div
      className={cn(
        "flex rounded-[var(--radius-sm)] px-2 py-[10px]",
        current ? "bg-canopy/10 text-canopy" : ""
      )}
    >
      <span
        className={cn(
          "w-6 shrink-0 text-[14px] leading-[1.35]",
          current ? "text-canopy" : "text-muted-foreground"
        )}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        {/* A question is 16px ink; "Cover" and "The end" are 14px muted,
            because they are the sheet's two ends rather than two more
            questions. */}
        <p
          className={cn(
            "leading-[1.35]",
            sub ? "text-[16px]" : "text-[14px]",
            current ? "text-canopy" : sub ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
        {sub && (
          <p className={cn("mt-[2px] text-[13px] leading-tight", current ? "text-canopy/80" : "text-muted-foreground")}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  const current = Math.min(4, round.questions.length - 1);
  const offset = sheetOffset(round, current);
  return (
    <div className="relative h-full overflow-hidden bg-background">
      {/* The page has not moved. Drop the sheet and you are where you were. */}
      <QuestionFiveScreen round={round} />
      <div className="absolute inset-0 z-40 bg-[#241a12]/55 backdrop-blur-md" />
      <div
        className="absolute inset-x-0 bottom-0 z-50 overflow-hidden bg-float"
        style={{ height: SHEET_HEIGHT, borderRadius: "20.8px 20.8px 0 0" }}
      >
        <div className="flex justify-center pt-[10px]">
          <span className="rounded-full bg-border" style={{ width: 36, height: 4 }} />
        </div>
        <div className="px-4 pt-3">
          <p className={cn(CAPS, "text-muted-foreground")}>
            {metaLine(`Round ${round.number}`, plural(round.questions.length, "question", "questions"))}
          </p>
        </div>
        <div className="relative mt-[10px] overflow-hidden px-4" style={{ height: SHEET_LIST_HEIGHT }}>
          <div style={{ marginTop: -offset }}>
            <SheetRow n={null} title="Cover" current={false} />
            {round.questions.map((q, i) => (
              <SheetRow key={q.id} n={String(i + 1)} title={q.text} sub={countsLine(q)} current={i === current} />
            ))}
            <SheetRow n={null} title="The end" current={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export const wholeApp: SketchDirection = {
  slug: "whole-app",
  name: "Every question is a page",
  thesis:
    "A Round is an issue you turn through one question at a time, and the app's chrome steps out of the way while you read it, so the question you are on is never off screen and the way home is always the name in the corner.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
