/* ------------------------------------------------------------------ *
 *  "A question is a page" (directions/04-paged.md), drawn for the cull.
 *
 *  The bet: a Round is eleven pages, a cover and a back page, not one
 *  55-screen scroll. Nothing here is wired, so the three things the
 *  direction says can only be judged live -- the swipe, the line filling
 *  as you read, the sheet rising -- are drawn at rest instead.
 *
 *  What that costs and how it is paid:
 *   - The tall phone Reader is FOUR pages stacked with a labelled gap
 *     between them, each with its own green bar, its own turn row and its
 *     own folio, so the owner can see what one page is and what its
 *     neighbours are without a gesture.
 *   - The folio is `static` at the foot of each page there and `absolute`
 *     inside the two 844px screens. On a real phone it is fixed. The
 *     frame scales with a transform, so `fixed` would escape it.
 *   - Every measurement the direction gives is used as given: 60px folio,
 *     2px line in 11 pieces with 3px gaps (33px each at 390), 14px side
 *     padding, rows at y+12 and y+32, 56px sheet rows at a 8.8px radius
 *     concentric with the sheet's 20.8px corner, 280 + 40 + 864 on the
 *     laptop.
 *
 *  Data: the live Round. Two things it does not have, and what stands in
 *  for each, both marked at the point of use -- no answer in this Round
 *  has a RESOLVED song (four answers under question 5 carry a music link
 *  in the text that nothing ever resolved), and `nextOpensAt` is null.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Heart, Play } from "lucide-react";
import { MusicNotes, SpotifyLogo, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { IdentityRow } from "@/components/common/identity-row";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import { DesktopShell, PhoneBar } from "../_shell";
import type {
  SketchDirection,
  SketchEntry,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "../_types";

/* The label rung: 12px, 0.08em, semibold, uppercased in CSS so the data
   keeps its own casing ("in the loop" is typed lowercase). */
const CAPS = "text-[12px] font-semibold uppercase tracking-[0.08em]";
/* The identity row's own byline rung, borrowed by the answer line so a
   batch inside a run of text matches the batch under a name in a card. */
const BATCH = "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";
/** An answer longer than this folds with "Read the rest" (1.9). Nothing in
 *  the real Round trips it; the rule is here so the page states it. */
const FOLD_AT = 2400;
/** A line, not a card: 120 characters, no break, no photograph, no link. */
const LINE_MAX = 120;
/** What the line's current piece reads on arrival at a page: one screen of
 *  a page that runs several. The direction's own first screen at 390 says
 *  "about a fifth full", and every page in the tall Reader is drawn at the
 *  moment you land on it. */
const ARRIVAL_FILL = 0.2;

/* ------------------------------------------------------------------ *
 *  Reading the Round
 * ------------------------------------------------------------------ */

const MUSIC_LINK =
  /https?:\/\/(?:open\.spotify\.com|spotify\.link|(?:www\.)?youtube\.com|youtu\.be|music\.apple\.com)\/\S+/i;

function musicLinkIn(body: string): string | null {
  return body.match(MUSIC_LINK)?.[0] ?? null;
}

/** INVENTED, and the only invented words on the page. Four answers under
 *  question 5 are a pasted music link, but nothing ever resolved them, so
 *  the Round holds a URL and no title. The direction's card needs a title
 *  and an artist, so these stand in; the sample is the direction's own. */
const INVENTED_SONGS = [
  { title: "Straight Line Was A Lie", artist: "Sudan Archives" },
  { title: "Nikes", artist: "Frank Ocean" },
  { title: "Time Moves Slow", artist: "BADBADNOTGOOD" },
  { title: "Mohabbat", artist: "Arooj Aftab" },
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function songSource(url: string): { label: string; preview: boolean } {
  if (/spotify/i.test(url)) return { label: "Spotify", preview: true };
  if (/youtu/i.test(url)) return { label: "YouTube", preview: false };
  if (/music\.apple/i.test(url)) return { label: "Apple Music", preview: true };
  return { label: "Link", preview: false };
}

/** Which of the two sizes an answer gets (the direction's break 2). The
 *  order matters: anything with a photograph, a song or a link is a card
 *  whatever its length. An answer with nothing in it falls through to a
 *  line, which is where §7 puts it. */
function tileOf(entry: SketchEntry): "line" | "card" {
  const body = entry.body?.trim() ?? "";
  if (entry.images.length > 0 || entry.song || musicLinkIn(body)) return "card";
  if (body.length <= LINE_MAX && !body.includes("\n")) return "line";
  return "card";
}

type Block = { kind: "lines"; entries: SketchEntry[] } | { kind: "card"; entry: SketchEntry };

/** Consecutive lines pack into one run, so the hairline between them is
 *  inside a block and the gap between blocks never lands mid guest book.
 *  It is also what keeps a run whole when the laptop's two columns break. */
function pack(entries: SketchEntry[]): Block[] {
  const blocks: Block[] = [];
  for (const entry of entries) {
    const tile = tileOf(entry);
    if (tile === "card") {
      blocks.push({ kind: "card", entry });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "lines") last.entries.push(entry);
    else blocks.push({ kind: "lines", entries: [entry] });
  }
  return blocks;
}

const photoCount = (q: SketchQuestion) => q.entries.reduce((n, e) => n + e.images.length, 0);

/** The cover's picture band: the most-hearted photograph in the Round
 *  (1.4, and L-m closed by derivation). Absent when there are none. */
function mostHearted(round: SketchRound): { src: string; photo: StoredPhoto | null } | null {
  let best: { src: string; photo: StoredPhoto | null; loveCount: number } | null = null;
  for (const q of round.questions) {
    for (const e of q.entries) {
      if (e.images.length === 0) continue;
      if (!best || e.loveCount > best.loveCount) {
        best = { src: e.images[0], photo: e.photos[0] ?? null, loveCount: e.loveCount };
      }
    }
  }
  return best;
}

const firstName = (name: string) => name.split(" ")[0];
const shortBatch = (year: number | null, fallback: string) =>
  year ? `'${String(year).slice(2)}` : fallback;

/** L-d: the reader says when the next Round opens. This database has no
 *  date on it, so the page says that rather than printing a guess. */
function nextRoundLine(round: SketchRound): string {
  const next = round.number + 1;
  return round.nextOpensAt
    ? `Round ${next} opens on ${formatDisplayDateLong(round.nextOpensAt)}.`
    : `Round ${next} has not opened yet.`;
}

const roundLine = (round: SketchRound) =>
  metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt));

/* ------------------------------------------------------------------ *
 *  The line, and the folio it sits on
 * ------------------------------------------------------------------ */

/** The pieces-of-a-hairline progress element. One piece per question, 2px
 *  tall, 3px gaps, edge to edge: 33px a piece at eleven questions and 7px
 *  at the forty-question cap, still a row of pages. Only `transform` would
 *  animate the fill, which is why it is a `scaleX` from the left. */
function ProgressLine({
  count,
  current,
  fill = 0,
  className,
}: {
  count: number;
  /** -1 on the cover page: nothing is lit, the whole Round is ahead. */
  current: number;
  fill?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-stretch", className)} style={{ gap: 3, height: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="relative flex-1 overflow-hidden"
          style={{
            backgroundColor:
              i < current ? "color-mix(in srgb, var(--canopy) 40%, transparent)" : "var(--border)",
          }}
        >
          {i === current && (
            <div
              className="absolute inset-0 origin-left bg-canopy"
              style={{ transform: `scaleX(${fill})` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** The one thing on screen that could only be this app: a strip of the
 *  app's paper, the Catch-up's name in the caps every identity row wears,
 *  the question in Baskerville at footnote size, and the line along its
 *  top edge. Break 3 (chrome pinned to the bottom of a phone) and break 1
 *  (Baskerville at 15px) both live here, and both are the point.
 *
 *  `--card` at 92% rather than the glass utility's 78%: the page has to
 *  pass under it faintly, not be read through it. */
function Folio({
  round,
  index,
  answerIndex,
  fill,
  position = "absolute",
}: {
  round: SketchRound;
  /** -1 is the cover page. */
  index: number;
  answerIndex?: number;
  fill?: number;
  position?: "absolute" | "static";
}) {
  const cover = index < 0;
  const q = cover ? null : round.questions[index];
  const answers = q?.entries.length ?? 0;
  const right = cover
    ? "Cover"
    : `Question ${index + 1} of ${round.questions.length}`;
  const counter = cover
    ? `${round.questions.length} questions`
    : answers === 0
      ? "No answers"
      : answers === 1
        ? "1 answer"
        : `Answer ${Math.min(answerIndex ?? 1, answers)} of ${answers}`;

  return (
    <div
      className="glass left-0 right-0 bottom-0 z-30"
      style={{
        position,
        height: 60,
        /* Safe-area on a real handset; 0 in a 390x844 emulation. */
        paddingBottom: "env(safe-area-inset-bottom)",
        backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
      }}
    >
      <ProgressLine count={round.questions.length} current={index} fill={fill ?? 0} />
      <div style={{ paddingTop: 10, paddingLeft: 14, paddingRight: 14 }}>
        <div className="flex items-center justify-between gap-3" style={{ height: 14 }}>
          {/* The way up, at every depth of every page. */}
          <span className={cn(CAPS, "text-canopy")}>{metaLine(round.catchupName, `Round ${round.number}`)}</span>
          <span className={cn(CAPS, "shrink-0 text-muted-foreground")}>{right}</span>
        </div>
        <div className="mt-[6px] flex items-baseline justify-between gap-3" style={{ height: 20 }}>
          {/* Truncated with a 24px fade rather than an ellipsis: nothing in
              this app ends in three periods. The right column is never cut. */}
          <span
            className="min-w-0 flex-1 overflow-hidden whitespace-nowrap font-heading text-[15px] leading-[20px] text-foreground"
            style={{
              maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
              WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
            }}
          >
            {cover ? `${round.contributors.length} wrote in` : q?.text}
          </span>
          <span className={cn(CAPS, "shrink-0 text-muted-foreground")}>{counter}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The contents row, shared by the sheet, the rail and the cover page
 * ------------------------------------------------------------------ */

/** Roughly where the question wraps past its clamp, at the two widths this
 *  row is drawn at. Used only to decide whether to hang the fade: a static
 *  drawing cannot measure, and a fade on a row that fits reads as a fault. */
const CLAMP_CHARS = { sheet: 54, rail: 78 } as const;

function ContentsRow({
  n,
  text,
  right,
  current = false,
  reached = false,
  variant,
}: {
  /** Absent on the back page, which has no number. */
  n?: number;
  text: string;
  right?: string;
  current?: boolean;
  reached?: boolean;
  variant: "sheet" | "rail";
}) {
  const sheet = variant === "sheet";
  const clipped = text.length > CLAMP_CHARS[variant];
  const lines = sheet ? 2 : 3;
  const lineHeight = sheet ? 1.3 : 1.35;
  return (
    <div
      className={cn(
        "state-layer relative flex items-start gap-3 rounded-[8.8px] px-3",
        sheet ? "min-h-[56px] py-3" : "min-h-[44px] py-2.5",
        current && "bg-canopy/10"
      )}
    >
      {current && (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-canopy" aria-hidden />
      )}
      <span
        className={cn(
          CAPS,
          "w-7 shrink-0 pt-[3px]",
          reached ? "text-canopy" : "text-muted-foreground"
        )}
      >
        {n === undefined ? "" : n}
      </span>
      <span
        className="min-w-0 flex-1 overflow-hidden font-heading text-foreground"
        style={{
          fontSize: sheet ? 15 : 14,
          lineHeight,
          maxHeight: `${lines * lineHeight}em`,
          maskImage: clipped
            ? "linear-gradient(to bottom, #000 calc(100% - 0.7em), transparent)"
            : undefined,
          WebkitMaskImage: clipped
            ? "linear-gradient(to bottom, #000 calc(100% - 0.7em), transparent)"
            : undefined,
        }}
      >
        {text}
      </span>
      {right && (
        <span className={cn(CAPS, "shrink-0 pt-[3px] text-muted-foreground")}>{right}</span>
      )}
    </div>
  );
}

/** The rows a sheet or a rail is made of: cover, every question, back page. */
function contentsRows(round: SketchRound, current: number) {
  const rows = [
    {
      key: "cover",
      n: 0,
      text: metaLine("Cover", `${round.contributors.length} wrote in`),
      right: undefined as string | undefined,
      current: current < 0,
      reached: true,
    },
    ...round.questions.map((q, i) => ({
      key: q.id,
      n: i + 1,
      text: q.text,
      right: metaLine(
        String(q.entries.length),
        photoCount(q) > 0 ? `${photoCount(q)} photos` : null
      ),
      current: i === current,
      reached: i <= current,
    })),
    {
      key: "back",
      n: undefined as number | undefined,
      text: metaLine(
        "Back page",
        `every photograph, and when Round ${round.number + 1} opens`
      ),
      right: undefined as string | undefined,
      current: false,
      reached: false,
    },
  ];
  return rows;
}

/* ------------------------------------------------------------------ *
 *  The two answer tiles
 * ------------------------------------------------------------------ */

/** A drawing of the shared LoveButton, at its md geometry. Static: the
 *  real one needs an action, and this page has none. */
function StaticHeart({ entry }: { entry: SketchEntry }) {
  return (
    <span
      className={cn(
        "state-layer inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm",
        entry.lovedByViewer ? "text-heart" : "text-muted-foreground"
      )}
    >
      <Heart size={18} strokeWidth={1.9} fill={entry.lovedByViewer ? "currentColor" : "none"} />
      <span>{entry.loveCount}</span>
    </span>
  );
}

/** The card's foot: one 34px row, the heart at the left and the comment
 *  count beside it. No band under it. */
function CardFoot({ entry }: { entry: SketchEntry }) {
  return (
    <div className="-mb-1.5 -ml-2.5 mt-[var(--space-s)] flex h-[34px] items-center gap-1">
      <StaticHeart entry={entry} />
      <span className="text-[13px] text-muted-foreground">
        {entry.commentCount === 0
          ? "Comment"
          : `${entry.commentCount} comment${entry.commentCount === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

/** The direction's own card, not the shipped SpotifyCard: 76px tall, a
 *  56px art square at the 8.8px rung, the title, the artist, the source in
 *  caps with its mark, and a 32px play ring only where a 30-second preview
 *  exists (Spotify and Apple, never YouTube). */
function SongCard({ url, id }: { url: string; id: string }) {
  const { label, preview } = songSource(url);
  const song = INVENTED_SONGS[hash(id) % INVENTED_SONGS.length];
  const Mark = /youtu/i.test(url) ? YoutubeLogo : SpotifyLogo;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="state-layer mt-[var(--space-s)] flex h-[76px] items-center gap-3 rounded-[var(--radius-md)] border border-border bg-background/60 p-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.995]"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-leaf/10 text-leaf">
        <MusicNotes size={24} weight="duotone" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{song.title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{song.artist}</span>
        <span className="mt-[3px] flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Mark size={12} weight="duotone" />
          {label}
        </span>
      </span>
      {preview && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-canopy">
          <Play size={12} fill="currentColor" strokeWidth={0} />
        </span>
      )}
    </a>
  );
}

type RowPhoto = StoredPhoto & { src: string };

function AnswerPhotographs({ entry }: { entry: SketchEntry }) {
  if (entry.images.length === 0) return null;
  if (entry.images.length === 1) {
    return (
      <div className="mt-[var(--space-s)] overflow-hidden rounded-[var(--radius-md)]">
        <PhotoFrame
          src={entry.images[0]}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          fallbackClassName="aspect-[4/3]"
        />
      </div>
    );
  }
  /* Justified rows, never a carousel (1.9). At 318px inside the card the
     real three-photograph answer under question 1 solves to two portraits
     at 156x208 on row one and the landscape at 318x238 on row two, which
     is the layout the direction quotes. Unmeasured photographs cannot be
     solved, so they fall back to the shipped grid rather than to half a
     row. */
  const shapes = entry.images.map((src, i) => {
    const photo = entry.photos[i];
    return photo ? ({ ...photo, src } as RowPhoto) : null;
  });
  if (shapes.every(Boolean)) {
    return (
      <PhotoRows
        photos={shapes as RowPhoto[]}
        gap={6}
        columnSizes={PHOTO_SIZES}
        className="mt-[var(--space-s)]"
        keyOf={(p) => p.src}
      >
        {(photo, _i, cell) => (
          <img
            src={photo.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full rounded-[var(--radius-md)] object-cover"
            style={{
              aspectRatio: cell.aspectRatio,
              objectPosition: cell.objectPosition,
              maxHeight: cell.maxHeight,
            }}
          />
        )}
      </PhotoRows>
    );
  }
  return (
    <div className="mt-[var(--space-s)] grid grid-cols-2 gap-1.5">
      {entry.images.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="aspect-square w-full rounded-[var(--radius-md)] object-cover"
        />
      ))}
    </div>
  );
}

/** The answer's words. The sentence is never rewritten and a pasted link
 *  stays a link where the member put it; the card prints under the text.
 *  When the answer IS the link, the URL is not printed at all. */
function AnswerBody({ entry }: { entry: SketchEntry }) {
  const body = entry.body?.trim() ?? "";
  const link = musicLinkIn(body);
  if (link && body === link) return null;
  const folded = body.length > FOLD_AT;
  const shown = folded ? body.slice(0, FOLD_AT) : body;
  const at = link ? shown.indexOf(link) : -1;

  return (
    <p className="mt-[var(--space-s)] whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-foreground">
      {at >= 0 ? (
        <>
          <span dangerouslySetInnerHTML={{ __html: renderRichText(shown.slice(0, at)) }} />
          <a
            href={link as string}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-semibold text-leaf hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {link}
          </a>
          <span
            dangerouslySetInnerHTML={{
              __html: renderRichText(shown.slice(at + (link as string).length)),
            }}
          />
        </>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: renderRichText(shown) }} />
      )}
      {folded && (
        <>
          {" "}
          <span className="font-semibold text-canopy">Read the rest</span>
        </>
      )}
    </p>
  );
}

function AnswerCardTile({ entry }: { entry: SketchEntry }) {
  const body = entry.body?.trim() ?? "";
  const link = musicLinkIn(body);
  return (
    <article className="card-elevated w-full rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
      <IdentityRow
        user={entry.author}
        avatarSize="sm"
        name={<span className="font-semibold leading-none text-foreground">{entry.author.name}</span>}
        meta={entry.author.batchLine}
      />
      <AnswerBody entry={entry} />
      <AnswerPhotographs entry={entry} />
      {link && <SongCard url={link} id={entry.id} />}
      <CardFoot entry={entry} />
    </article>
  );
}

/** The other size, and the direction's break 2: a five-word answer keeps
 *  every part of the tile (bird, name, batch, answer, heart) and drops the
 *  box, because a box must earn its border and a one-liner cannot. The
 *  text is one run indented 40px, so it wraps under itself. */
function AnswerLine({ entry }: { entry: SketchEntry }) {
  const body = entry.body?.trim() ?? "";
  return (
    <div className="relative py-2 pl-10 pr-14" style={{ minHeight: 50 }}>
      <span className="absolute left-0" style={{ top: 6 }}>
        <BirdAvatar user={entry.author} size={28} />
      </span>
      <p className="break-words text-[15px] leading-[1.5]">
        <span className="font-semibold text-foreground">{entry.author.name}</span>{" "}
        <span className={BATCH}>{shortBatch(entry.author.batchYear, entry.author.batchLine)}</span>{" "}
        {body ? (
          <span className="text-foreground">{body}</span>
        ) : (
          /* §7: an answer with nothing in it is still somebody turning up. */
          <span className="italic text-muted-foreground">
            showed up for this Round without writing anything.
          </span>
        )}
        {entry.commentCount > 0 && (
          <span className="text-[13px] text-muted-foreground">
            {" "}
            <span className="dotsep" aria-hidden>
              ·
            </span>{" "}
            {entry.commentCount} comment{entry.commentCount === 1 ? "" : "s"}
          </span>
        )}
      </p>
      <span className="absolute" style={{ right: -10, top: 4 }}>
        <StaticHeart entry={entry} />
      </span>
    </div>
  );
}

function Answers({ entries, columns }: { entries: SketchEntry[]; columns: boolean }) {
  const blocks = pack(entries);
  const rendered = blocks.map((block, i) =>
    block.kind === "card" ? (
      <AnswerCardTile key={block.entry.id} entry={block.entry} />
    ) : (
      /* A run of lines reads as a guest book: a hairline between
         consecutive rows, no paper under any of them. */
      <div key={`lines-${i}`} className="divide-y divide-border">
        {block.entries.map((entry) => (
          <AnswerLine key={entry.id} entry={entry} />
        ))}
      </div>
    )
  );

  if (!columns) return <div className="flex flex-col gap-[var(--space-m)]">{rendered}</div>;

  /* Break 5: two 416px columns with a 32px gap, filled column-first, so a
     page of parallel replies reads as a spread. A card breaks to the next
     column whole. */
  return (
    <div style={{ columnCount: 2, columnGap: 32 }}>
      {rendered.map((node, i) => (
        <div key={i} className="mb-[var(--space-m)] break-inside-avoid">
          {node}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  A page
 * ------------------------------------------------------------------ */

function QuestionHeading({ q, viewport }: { q: SketchQuestion; viewport: SketchViewport }) {
  const phone = viewport === "phone";
  return (
    <>
      {/* No "Question 5" over it: the number lives in the folio and the
          rail, where it is navigation rather than a label. */}
      <h2
        className="font-heading text-foreground"
        style={{
          fontSize: phone ? "1.5rem" : "2rem",
          lineHeight: phone ? 1.15 : 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {q.text}
      </h2>
      <div className="mt-[10px] flex items-center gap-2">
        {q.showAsker && q.asker ? (
          <>
            <BirdAvatar user={q.asker} size={28} />
            <span className="text-[13px] text-muted-foreground">
              asked by <span className="text-foreground">{q.asker.name}</span>
            </span>
          </>
        ) : (
          <span className={cn(CAPS, "text-muted-foreground")}>Asked anonymously</span>
        )}
      </div>
    </>
  );
}

/** Paging without a gesture, at the foot of every page on both viewports.
 *  Two cells, the previous question at the left and the next at the right;
 *  the first page's left cell is the cover and the last page's right cell
 *  is the back page. */
function TurnRow({ round, index }: { round: SketchRound; index: number }) {
  const prev = index === 0 ? "Cover" : round.questions[index - 1].text;
  const last = index === round.questions.length - 1;
  const next = last ? "Back page" : round.questions[index + 1].text;
  const cell =
    "state-layer flex min-h-[76px] flex-col justify-center rounded-[var(--radius-md)] border border-border px-4 py-3";
  return (
    <div className="mt-[var(--space-l)] grid grid-cols-2 gap-3">
      <div className={cell}>
        <span className={cn(CAPS, "text-muted-foreground")}>Previous</span>
        <span className="mt-1.5 line-clamp-2 font-heading text-[16px] leading-[1.25] text-foreground">
          {prev}
        </span>
      </div>
      <div className={cn(cell, "items-end text-right")}>
        <span className={cn(CAPS, "text-muted-foreground")}>Next</span>
        <span className="mt-1.5 line-clamp-2 font-heading text-[16px] leading-[1.25] text-foreground">
          {next}
        </span>
      </div>
    </div>
  );
}

/** One question, whole: the heading, its answers, the turn row. The folio
 *  is added by whichever screen this is drawn on. */
function QuestionPage({
  round,
  index,
  viewport,
}: {
  round: SketchRound;
  index: number;
  viewport: SketchViewport;
}) {
  const q = round.questions[index];
  return (
    <>
      <QuestionHeading q={q} viewport={viewport} />
      <div style={{ marginTop: "var(--space-l)" }}>
        {q.entries.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">No one took this one.</p>
        ) : (
          <Answers entries={q.entries} columns={viewport === "laptop"} />
        )}
      </div>
      <TurnRow round={round} index={index} />
    </>
  );
}

/** Page 0. The masthead in full, one swipe to the right of question 1: the
 *  picture band, the name at the display size (spent once, here), the
 *  caps line, every name that wrote in, then the contents. On the laptop
 *  the rail already holds the contents, so the page does not repeat them. */
function CoverPage({ round, viewport }: { round: SketchRound; viewport: SketchViewport }) {
  const picture = mostHearted(round);
  const phone = viewport === "phone";
  return (
    <>
      {picture && (
        <div
          className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-mist"
          style={{ aspectRatio: "3 / 2" }}
        >
          <img
            src={picture.src}
            alt=""
            className="h-full w-full object-cover"
            style={{
              objectPosition: picture.photo?.focalSet
                ? `${picture.photo.focalX * 100}% ${picture.photo.focalY * 100}%`
                : "50% 20%",
            }}
          />
        </div>
      )}
      {/* The display rung, resolved by hand at each viewport rather than
          left as `clamp(1.9rem, 5vw, 2.6rem)`: `vw` answers to the real
          window, and the frame is a scaled 390 or 1512 inside it. These
          are the two ends the clamp lands on at those widths. */}
      <h1
        className="mt-[var(--space-m)] font-heading tracking-[-0.025em] text-foreground"
        style={{ fontSize: phone ? "1.9rem" : "2.6rem", lineHeight: 1.08 }}
      >
        {round.catchupName}
      </h1>
      <p className={cn(CAPS, "mt-[var(--space-xs)] text-muted-foreground")}>{roundLine(round)}</p>

      <p className={cn(CAPS, "mt-[var(--space-l)] text-canopy")}>
        {round.contributors.length} wrote in
      </p>
      <div className="mt-[var(--space-s)] flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-foreground">
        {round.contributors.map((person) => (
          <span key={person.id} className="inline-flex items-center gap-1.5">
            <BirdAvatar user={person} size={20} />
            {person.name}
          </span>
        ))}
      </div>

      {phone && (
        <div className="mt-[var(--space-l)] -mx-3">
          {contentsRows(round, -1).map((row) => (
            <ContentsRow
              key={row.key}
              n={row.n}
              text={row.text}
              right={row.right}
              current={row.current}
              reached={row.reached}
              variant="sheet"
            />
          ))}
        </div>
      )}

      <p className="mt-[var(--space-l)] text-[16px] text-muted-foreground">{nextRoundLine(round)}</p>
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  The labelled gaps between pages
 *
 *  Lab annotation, not app chrome, and drawn so it cannot be mistaken for
 *  it: a dashed hairline, caps in muted ink, the arrow the thumb travels.
 * ------------------------------------------------------------------ */

function Gap({ text, direction }: { text: string; direction: "left" | "right" }) {
  return (
    <div className="flex items-center gap-3 bg-background px-5 py-6">
      <span className="h-px flex-1 border-t border-dashed border-border" />
      <span className={cn(CAPS, "flex shrink-0 items-center gap-1.5 text-muted-foreground")}>
        {direction === "right" ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
        {text}
      </span>
      <span className="h-px flex-1 border-t border-dashed border-border" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Reader: the phone
 * ------------------------------------------------------------------ */

function PhoneScreen({ children }: { children: ReactNode }) {
  return (
    <section className="bg-background">
      <PhoneBar />
      <div className="px-5 pt-5 pb-[var(--space-l)]">{children}</div>
    </section>
  );
}

function ReaderPhone({ round }: { round: SketchRound }) {
  return (
    <div className="bg-background">
      <PhoneScreen>
        <QuestionPage round={round} index={0} viewport="phone" />
      </PhoneScreen>
      <Folio round={round} index={0} answerIndex={1} fill={ARRIVAL_FILL} position="static" />

      <Gap text="one swipe to the right: the cover page" direction="right" />

      <PhoneScreen>
        <CoverPage round={round} viewport="phone" />
      </PhoneScreen>
      <Folio round={round} index={-1} position="static" />

      <Gap text="one swipe to the left: question 2" direction="left" />

      <PhoneScreen>
        <QuestionPage round={round} index={1} viewport="phone" />
      </PhoneScreen>
      <Folio round={round} index={1} answerIndex={1} fill={ARRIVAL_FILL} position="static" />

      <Gap text="one swipe to the left: question 3" direction="left" />

      <PhoneScreen>
        <QuestionPage round={round} index={2} viewport="phone" />
      </PhoneScreen>
      <Folio round={round} index={2} answerIndex={1} fill={ARRIVAL_FILL} position="static" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Reader: the laptop
 * ------------------------------------------------------------------ */

/** The rail is the masthead and the navigator at once, always open, which
 *  is what Wikipedia's testers preferred. No folio here. */
function Rail({ round, current }: { round: SketchRound; current: number }) {
  const named = round.contributors.slice(0, 3).map((p) => firstName(p.name));
  const rest = round.contributors.length - named.length;
  return (
    <aside className="sticky top-10 w-[280px] shrink-0 self-start">
      <p className="font-heading text-[1.375rem] leading-tight tracking-[-0.02em] text-foreground">
        {round.catchupName}
      </p>
      <p className={cn(CAPS, "mt-1.5 text-muted-foreground")}>{roundLine(round)}</p>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        {named.join(", ")}
        {rest > 0 ? ` and ${rest} others` : ""} wrote in
      </p>
      <div className="mt-[var(--space-m)] -mx-3">
        {contentsRows(round, current).map((row, i) => (
          <ContentsRow
            key={row.key}
            n={row.n}
            text={row.text}
            /* The current row's right column is live on a real page: it
               ticks as you scroll. Every other row reads its plain count. */
            right={
              row.current && i > 0
                ? `Answer 1 of ${round.questions[current].entries.length}`
                : row.right
            }
            current={row.current}
            reached={row.reached}
            variant="rail"
          />
        ))}
      </div>
    </aside>
  );
}

function ReaderLaptop({ round }: { round: SketchRound }) {
  return (
    <DesktopShell>
      {/* pt-2 on top of the shell's py-8, so the page starts at y=40. */}
      <div className="flex gap-10 pt-2">
        <Rail round={round} current={0} />
        <div className="w-[864px] shrink-0">
          <QuestionPage round={round} index={0} viewport="laptop" />

          <Gap text="the right arrow key, the rail, or NEXT: question 2" direction="left" />
          <QuestionPage round={round} index={1} viewport="laptop" />

          <Gap text="question 3" direction="left" />
          <QuestionPage round={round} index={2} viewport="laptop" />
        </div>
      </div>
    </DesktopShell>
  );
}

/* ------------------------------------------------------------------ *
 *  The two 390x844 screens
 * ------------------------------------------------------------------ */

/** Deep in question 5, composed rather than scrolled: the tail of one
 *  answer at the top edge, then the answers under it, clipped by the
 *  frame. The tail is bottom-aligned inside a 62px window, so the card
 *  above the fold is cut exactly where a scroll would cut it without
 *  anything having to know how tall it is. */
function QuestionFive({ round }: { round: SketchRound }) {
  const index = Math.min(4, round.questions.length - 1);
  const q = round.questions[index];
  /* Answer 8 is the one under the reading line, which is the folio's
     count. Short questions start far enough back to still fill a screen. */
  const at = Math.min(7, Math.max(0, q.entries.length - 4));
  const above = q.entries[at - 1];
  const below = q.entries.slice(at, at + 5);
  return (
    <>
      <div className="absolute inset-x-0 bottom-0" style={{ top: 56 }}>
        <div className="px-5">
          {above && (
            <div className="relative overflow-hidden" style={{ height: 62 }}>
              <div className="absolute inset-x-0 bottom-0">
                {tileOf(above) === "card" ? (
                  <AnswerCardTile entry={above} />
                ) : (
                  <AnswerLine entry={above} />
                )}
              </div>
            </div>
          )}
          <div className="mt-[var(--space-m)]">
            <Answers entries={below} columns={false} />
          </div>
        </div>
      </div>
      <Folio round={round} index={index} answerIndex={at + 1} fill={0.55} />
    </>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <QuestionFive round={round} />
      <PhoneBar position="absolute" />
    </div>
  );
}

/** One tap on the folio and the eleven questions rise as a sheet. The page
 *  behind has not moved: drag it down or tap the backdrop and you are
 *  where you were. It rises to the height of its rows, capped at 80% of
 *  the screen, and scrolls inside beyond that, which at thirteen rows it
 *  does, so the back page sits below the sheet's own fold. */
function NavigatorOpen({ round }: { round: SketchRound }) {
  const current = Math.min(4, round.questions.length - 1);
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <QuestionFive round={round} />
      <PhoneBar position="absolute" />
      <div className="absolute inset-0 z-40 bg-[#241a12]/55 backdrop-blur-md" />
      <div
        className="absolute inset-x-0 bottom-0 z-50 overflow-hidden bg-float"
        style={{ height: Math.round(844 * 0.8), borderRadius: "20.8px 20.8px 0 0" }}
      >
        <div className="flex justify-center pt-2.5">
          <span className="rounded-full bg-border" style={{ width: 36, height: 5 }} />
        </div>
        <div className="px-3 pt-3">
          <p className="font-heading text-[1.25rem] leading-tight tracking-[-0.02em] text-foreground">
            {round.catchupName}
          </p>
          <p className={cn(CAPS, "mt-1 text-muted-foreground")}>{roundLine(round)}</p>
        </div>
        <div className="mt-2 px-3">
          {contentsRows(round, current).map((row) => (
            <ContentsRow
              key={row.key}
              n={row.n}
              text={row.text}
              right={row.right}
              current={row.current}
              reached={row.reached}
              variant="sheet"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Reader({ round, viewport }: SketchProps) {
  return viewport === "laptop" ? <ReaderLaptop round={round} /> : <ReaderPhone round={round} />;
}

export const paged: SketchDirection = {
  slug: "paged",
  name: "A question is a page",
  thesis:
    "A Round is an issue you turn through with your thumb: every question is its own page with the browser's own vertical scroll inside it, a folio at the foot of the phone always says which question you are on and how far through it you are, and the 49,000-pixel scroll stops existing.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
