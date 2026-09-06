/* ------------------------------------------------------------------ *
 *  "Roll call" - direction 06 room, drawn for the cull.
 *
 *  The whole bet is that thirteen people you went to school with are more
 *  interesting than eleven questions, so every surface answers WHO before
 *  it answers WHAT: the masthead is a sentence of names with a bird in
 *  front of each, the phone's plate carries the bird of whoever is
 *  talking, and the desktop rail keeps the roll on the wall the whole way
 *  down. Source: docs/planning/catchups-rework/directions/06-room.md,
 *  section 3 ("The reader, precisely"), followed to its numbers.
 *
 *  Static, per _types.ts: nothing here scroll-spies, drags or toggles.
 *  Anything the direction calls `fixed` is `absolute` inside the two
 *  844px screens and simply sits at the foot of the tall Reader page.
 *
 *  Two things on screen are invented, both marked at their definitions:
 *  the two comment lines in the one open comment well (comments do not
 *  exist in the database yet, D7), and the second sidebar row, which the
 *  direction needs so the cinnamon dot has a Catch-up to sit on. Every
 *  name, word, photograph, song and heart count is the real Round.
 * ------------------------------------------------------------------ */

import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronUp,
  Feather,
  Heart,
  Images,
  Info,
  MessagesSquare,
  Music,
  Newspaper,
  Notebook,
  Play,
} from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import { PhoneBar } from "../_shell";
import type {
  SketchDirection,
  SketchEntry,
  SketchPerson,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchSong,
  SketchViewport,
} from "../_types";

/* The LiftKit tokens are `em`, so `var(--space-xl)` on a 2rem heading is 84px,
   not the 42px the direction quotes. The direction's numbers are the tokens
   resolved at 16px, so anything hung off a heading, a 13px meta line or a
   15px roll is written as the resolved pixel value and the token is used only
   where the element really is at 16px (a tile's padding, a section's box). */
const SP = { xs: 6, s: 10, m: 16, l: 26, xl: 42, xxl: 68 } as const;

/** The byline register, 10.5px, same as IdentityRow's (see its comment). */
const CAPS = "text-[10.5px] font-semibold uppercase tracking-[0.07em]";

/** The direction's "faded by a 24px mask rather than cut with three dots". */
const FADE_RIGHT: CSSProperties = {
  maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
  WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
};

const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** An answer with no photograph, no link, no line break, at most 80
 *  characters. Section 3, "The answer tile, four states". */
const REMARK_MAX = 80;

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Two people with the same first name in one Round get a surname initial." */
type RollName = { person: SketchPerson; label: string };
function rollNames(people: SketchPerson[]): RollName[] {
  const counts = new Map<string, number>();
  for (const p of people) {
    const f = firstWord(p.name);
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return people.map((person) => {
    const parts = person.name.trim().split(/\s+/);
    const f = parts[0] || person.name;
    const surname = parts[1];
    const clash = (counts.get(f) ?? 0) > 1 && Boolean(surname);
    return { person, label: clash ? `${f} ${surname[0]}.` : f };
  });
}

function isRemark(entry: SketchEntry): boolean {
  const body = entry.body?.trim() ?? "";
  if (!body || entry.images.length > 0 || entry.song) return false;
  if (body.includes("\n")) return false;
  if (/https?:\/\//i.test(body)) return false;
  return body.length <= REMARK_MAX;
}

/** The resolver stores the URL as the title when oembed fails, and the
 *  direction is explicit about that case: "A link that does not resolve is
 *  left as the underlined link and nothing else." So no card. */
function resolvedSong(entry: SketchEntry): SketchSong | null {
  const song = entry.song;
  if (!song?.title) return null;
  return /^https?:\/\//i.test(song.title.trim()) ? null : song;
}

/** renderRichText handles emphasis and mentions but leaves a bare URL as
 *  text; the direction prints the sentence as it was written with the URL
 *  underlined and breaking at any character. */
function bodyHtml(text: string): string {
  return renderRichText(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noreferrer" class="underline underline-offset-2 [overflow-wrap:anywhere] hover:text-canopy">$1</a>'
  );
}

/* ── the pieces ─────────────────────────────────────────────────────── */

/** A drawing of the shared LoveButton: #E03A33 when loved, its count beside
 *  it. Not the real control, which needs a server action. */
function StaticHeart({
  count,
  loved,
  size,
  className,
}: {
  count?: number | null;
  loved: boolean;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center",
        size >= 18 ? "gap-1.5" : "gap-1",
        loved ? "text-heart" : "text-muted-foreground",
        className
      )}
    >
      <Heart size={size} strokeWidth={1.8} fill={loved ? "currentColor" : "none"} />
      {count != null && (
        <span className="tabular-nums" style={{ fontSize: size >= 18 ? 14 : 12 }}>
          {count}
        </span>
      )}
    </span>
  );
}

/** The way up, printed the same three times: masthead, sheet header, rail. */
function CatchupName({ round, className }: { round: SketchRound; className?: string }) {
  return (
    <span
      className={cn(
        "cursor-pointer font-heading text-[1.125rem] leading-none text-canopy hover:underline",
        className
      )}
    >
      {round.catchupName}
    </span>
  );
}

/** The door of the room: a wrapped run of birds and names, 20px bird, 4px
 *  gap, 10px between items, 24px line. Four lines at 390. */
function Roll({ people, className }: { people: SketchPerson[]; className?: string }) {
  const items = rollNames(people);
  if (items.length === 0) {
    return (
      <p className={cn("text-[15px] text-foreground", className)} style={{ lineHeight: "24px" }}>
        Nobody wrote in.
      </p>
    );
  }
  return (
    <div
      className={cn("flex flex-wrap items-center text-[15px] text-foreground", className)}
      style={{ columnGap: 10, rowGap: 0, lineHeight: "24px" }}
    >
      {items.map(({ person, label }, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={person.id}>
            {last && items.length > 1 && (
              <span className="flex items-center" style={{ height: 24 }}>
                and
              </span>
            )}
            <span
              className="flex cursor-pointer items-center hover:underline"
              style={{ gap: 4, height: 24 }}
            >
              <BirdAvatar user={person} size={20} />
              <span>
                {label}
                {last ? "" : ","}
              </span>
            </span>
          </Fragment>
        );
      })}
      <span className="flex items-center" style={{ height: 24 }}>
        wrote in.
      </span>
    </div>
  );
}

/** Three lines and nothing else: no rule, no eyebrow, no count. */
function Masthead({ round, viewport }: SketchProps) {
  return (
    <header>
      <div className="flex items-center gap-1.5" style={{ height: 24 }}>
        <CatchupName round={round} />
        <span className="dotsep" aria-hidden>
          ·
        </span>
        <span className="text-[14px] text-muted-foreground">
          {formatDisplayDateLong(round.publishedAt)}
        </span>
      </div>
      <h1
        className="font-heading tracking-[-0.025em] text-foreground"
        style={{
          marginTop: SP.xs,
          fontSize: viewport === "laptop" ? "2.3rem" : "2rem",
          lineHeight: 1.06,
        }}
      >
        Round {round.number}
      </h1>
      <Roll people={round.contributors} className="mt-[10px]" />
    </header>
  );
}

/** A three-word answer is one line with a bird, not a three-centimetre tile
 *  with a heart lost at the bottom. Section 8 owns the doubt about this. */
function Remark({ entry }: { entry: SketchEntry }) {
  return (
    <div
      className="inline-flex max-w-full items-center rounded-[var(--radius-md)] border border-border bg-card"
      style={{ padding: "6px 12px 6px 6px" }}
    >
      <BirdAvatar user={entry.author} size={28} />
      <span className="ml-1.5 shrink-0 text-[13px] font-semibold text-foreground">
        {firstWord(entry.author.name)}
      </span>
      <span className="ml-2 min-w-0 text-[15px] leading-[1.35] text-foreground">
        {entry.body?.trim()}
      </span>
      <StaticHeart className="ml-2" size={14} count={entry.loveCount} loved={entry.lovedByViewer} />
    </div>
  );
}

/** The direction's song row, which is not quite the shipped SpotifyCard:
 *  64px art, the title, the source at the right end, and the play circle.
 *  No artist line, because the stored song has a title and art and nothing
 *  else, and inventing an artist under a real member's real track would put
 *  words in the Round that nobody wrote. */
function SongRow({ song }: { song: SketchSong }) {
  return (
    <div
      className="state-layer flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-background/60 p-[var(--space-s)]"
      style={{ marginTop: SP.s }}
    >
      {song.art ? (
        <img
          src={song.art}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-[var(--radius-sm)] object-cover shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
        />
      ) : (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-leaf/10 text-leaf">
          <Music size={22} strokeWidth={1.8} />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
        {song.title}
      </p>
      <span className={cn(CAPS, "flex shrink-0 items-center gap-1 text-muted-foreground")}>
        Spotify
        <ArrowUpRight className="h-3 w-3" />
      </span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canopy text-white">
        <Play size={13} fill="currentColor" strokeWidth={0} />
      </span>
    </div>
  );
}

function TilePhotos({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  const measured =
    entry.photos.length === entry.images.length && entry.photos.every(Boolean)
      ? (entry.photos as StoredPhoto[])
      : null;

  if (entry.images.length === 1) {
    return (
      <div style={{ marginTop: SP.s }}>
        <PhotoFrame
          src={entry.images[0]}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          className="rounded-[var(--radius-md)]"
          fallbackClassName="aspect-[16/10] rounded-[var(--radius-md)]"
        />
      </div>
    );
  }

  if (!measured) {
    return (
      <div className="grid grid-cols-2 gap-2" style={{ marginTop: SP.s }}>
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

  return (
    <div style={{ marginTop: SP.s }}>
      <PhotoRows photos={measured} gap={viewport === "laptop" ? 12 : 8} columnSizes={PHOTO_SIZES}>
        {(_photo, i, cell) => (
          <img
            src={entry.images[i]}
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
    </div>
  );
}

/* INVENTED, and the only invented words in the drawing. Comments are LOCKED
   in but do not exist in the database (D7, _types.ts), and the direction puts
   the thread inside the tile as its one mist well, so the well cannot be drawn
   without something in it. Two neutral lines, hung on real members so the
   birds and names in a comment row are the ones a member would actually see.
   `entry.commentCount` is _data.ts's invented stable count. */
const INVENTED_COMMENTS: string[] = [
  "I have thought about this one all week.",
  "Where was this?",
];

function CommentWell({
  entry,
  people,
  viewer,
}: {
  entry: SketchEntry;
  people: SketchPerson[];
  viewer: SketchPerson;
}) {
  const others = people.filter((p) => p.id !== entry.author.id);
  const rows = INVENTED_COMMENTS.slice(0, Math.min(2, Math.max(1, entry.commentCount)))
    .map((text, i) => ({ text, person: others[(i * 3 + 1) % Math.max(1, others.length)] }))
    .filter((row): row is { text: string; person: SketchPerson } => Boolean(row.person));

  return (
    <div
      className="rounded-[var(--radius-md)] bg-muted p-[var(--space-s)]"
      style={{ marginTop: SP.s }}
    >
      <div className="flex items-center justify-between">
        <p className={cn(CAPS, "text-muted-foreground")}>{entry.commentCount} comments</p>
        <button
          type="button"
          className="text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Hide
        </button>
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {rows.map(({ text, person }) => (
          <div key={person.id} className="flex items-start gap-2">
            <BirdAvatar user={person} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-none text-foreground">{person.name}</p>
              <p className="mt-1.5 text-[14px] leading-[1.45] text-foreground">{text}</p>
            </div>
            <StaticHeart size={14} loved={false} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
        <BirdAvatar user={viewer} size={20} />
        <span className="text-[13px] text-muted-foreground">Add a comment</span>
      </div>
    </div>
  );
}

function Tile({
  entry,
  viewport,
  people,
  viewer,
  openComments = false,
}: {
  entry: SketchEntry;
  viewport: SketchViewport;
  people: SketchPerson[];
  viewer: SketchPerson;
  openComments?: boolean;
}) {
  const body = entry.body?.trim() ?? "";
  const song = resolvedSong(entry);
  const sharedNothing = !body && entry.images.length === 0 && !song;
  /* "At 1,200 characters and beyond, the tile folds at the twenty-first line
     with Read the rest ... that is the only fold, and it is one tap." */
  const folded = body.length >= 1200;

  return (
    <article className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
      <div className="flex items-center gap-3">
        <BirdAvatar user={entry.author} size={40} />
        <div className="min-w-0">
          <p className="cursor-pointer text-[15px] font-semibold leading-none text-foreground hover:underline">
            {entry.author.name}
          </p>
          {entry.author.batchLine && (
            <p className={cn(CAPS, "mt-[5px] leading-none text-muted-foreground")}>
              {entry.author.batchLine}
            </p>
          )}
        </div>
      </div>

      {sharedNothing && (
        <p className="text-[15px] italic leading-[1.6] text-muted-foreground" style={{ marginTop: SP.s }}>
          Showed up for this Round without adding anything here.
        </p>
      )}

      {body && (
        <>
          <p
            className="whitespace-pre-wrap break-words text-[16px] leading-[1.6] text-foreground"
            style={{
              marginTop: SP.s,
              ...(folded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 21,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "clip",
                  }
                : null),
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml(body) }}
          />
          {folded && (
            <button
              type="button"
              className="mt-1.5 text-[13px] font-semibold text-canopy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Read the rest
            </button>
          )}
        </>
      )}

      {entry.images.length > 0 && <TilePhotos entry={entry} viewport={viewport} />}
      {song && <SongRow song={song} />}

      {/* 36px, and nothing at its right end, so the empty band under an answer
          is gone. */}
      <div className="flex items-center" style={{ marginTop: SP.xs, height: 36 }}>
        <StaticHeart size={18} count={entry.loveCount} loved={entry.lovedByViewer} />
        <button
          type="button"
          className="ml-4 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {entry.commentCount > 0
            ? `${entry.commentCount} comment${entry.commentCount === 1 ? "" : "s"}`
            : "Comment"}
        </button>
      </div>

      {openComments && entry.commentCount > 0 && (
        <CommentWell entry={entry} people={people} viewer={viewer} />
      )}
    </article>
  );
}

/** A photo-wall question: everybody's one photograph in justified rows, each
 *  with its bird and first name under it. */
function Wall({ q, viewport }: { q: SketchQuestion; viewport: SketchViewport }) {
  const cells = q.entries.flatMap((e) =>
    e.images.map((src, i) => ({ src, photo: e.photos[i] ?? null, author: e.author }))
  );
  const measured = cells.filter(
    (c): c is { src: string; photo: StoredPhoto; author: SketchPerson } => Boolean(c.photo)
  );

  const caption = (author: SketchPerson) => (
    <figcaption className="mt-1.5 flex items-center gap-1.5 text-[13px] text-foreground">
      <BirdAvatar user={author} size={20} />
      {firstWord(author.name)}
    </figcaption>
  );

  if (measured.length !== cells.length || cells.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2" style={{ marginTop: SP.m }}>
        {cells.map((c) => (
          <figure key={c.src}>
            <img
              src={c.src}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-[var(--radius-md)] object-cover"
            />
            {caption(c.author)}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: SP.m }}>
      <PhotoRows
        photos={measured.map((c) => c.photo)}
        gap={viewport === "laptop" ? 12 : 8}
        columnSizes={PHOTO_SIZES}
        keyOf={(_p, i) => measured[i].src}
      >
        {(_photo, i, cell) => (
          <figure className="h-full">
            <img
              src={measured[i].src}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full rounded-[var(--radius-md)] object-cover"
              style={{
                aspectRatio: cell.aspectRatio,
                objectPosition: cell.objectPosition,
                maxHeight: cell.maxHeight,
              }}
            />
            {caption(measured[i].author)}
          </figure>
        )}
      </PhotoRows>
    </div>
  );
}

/** A heading, its meta line, then the remarks as a cluster and the tiles
 *  under them. `--space-xl` above, no rule, no number. */
function QuestionBlock({
  round,
  q,
  viewport,
  openCommentsOn,
}: {
  round: SketchRound;
  q: SketchQuestion;
  viewport: SketchViewport;
  openCommentsOn?: string;
}) {
  const remarks = q.entries.filter(isRemark);
  const tiles = q.entries.filter((e) => !isRemark(e));

  return (
    <section style={{ marginTop: SP.xl }}>
      <h2
        className="font-heading tracking-[-0.02em] text-foreground"
        style={{ fontSize: viewport === "laptop" ? "1.7rem" : "1.5rem", lineHeight: 1.15 }}
      >
        {q.text}
      </h2>
      <div
        className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground"
        style={{ marginTop: SP.xs }}
      >
        {q.showAsker && q.asker ? (
          <>
            <span>Asked by</span>
            <BirdAvatar user={q.asker} size={20} />
            <span className="cursor-pointer text-foreground hover:underline">
              {firstWord(q.asker.name)}
            </span>
          </>
        ) : (
          <span>Asked anonymously</span>
        )}
        <span className="dotsep" aria-hidden>
          ·
        </span>
        <span>{q.entries.length} answered</span>
      </div>

      {q.entries.length === 0 && (
        <p className="text-[15px] italic text-muted-foreground" style={{ marginTop: SP.m }}>
          Nobody took this one.
        </p>
      )}

      {q.kind === "photo" ? (
        <Wall q={q} viewport={viewport} />
      ) : (
        <>
          {remarks.length > 0 && (
            <div className="flex flex-wrap" style={{ marginTop: SP.m, gap: "8px 6px" }}>
              {remarks.map((e) => (
                <Remark key={e.id} entry={e} />
              ))}
            </div>
          )}
          {tiles.length > 0 && (
            <div
              className="flex flex-col"
              style={{ marginTop: remarks.length > 0 ? 12 : SP.m, gap: 12 }}
            >
              {tiles.map((e) => (
                <Tile
                  key={e.id}
                  entry={e}
                  viewport={viewport}
                  people={round.members}
                  viewer={round.viewer}
                  openComments={e.id === openCommentsOn}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** After the last tile: no card, nothing about who wrote in repeated. */
function EndOfRound({ round }: { round: SketchRound }) {
  const next = round.nextOpensAt ? formatDisplayDateLong(round.nextOpensAt) : null;
  /* INVENTED, one clause: nobody has asked anything for the next Round in the
     data, and the direction's closing line names whoever has. */
  const asker = round.contributors[1] ?? round.contributors[0] ?? null;
  return (
    <div style={{ marginTop: SP.xxl }}>
      <p className="font-heading text-[1.25rem] leading-[1.2] text-foreground">
        That is Round {round.number}.
      </p>
      <p className="mt-2 text-[16px] leading-[1.55] text-foreground">
        {next
          ? `Round ${round.number + 1} opens ${next}.`
          : `Round ${round.number + 1} is not open yet.`}
        {asker ? ` ${firstWord(asker.name)} has already asked something.` : ""}
      </p>
      <CatchupName round={round} className="mt-3 inline-block" />
    </div>
  );
}

function OmittedNote({ round }: { round: SketchRound }) {
  if (round.questions.length <= 3) return null;
  return (
    <p
      className="border-t border-dashed border-border pt-3 text-[13px] text-muted-foreground"
      style={{ marginTop: SP.xl }}
    >
      Questions 4 to {round.questions.length} omitted from the sketch.
    </p>
  );
}

/* ── the navigator ──────────────────────────────────────────────────── */

/** The plate: the navigator's collapsed state, and the one thing on screen
 *  that could only be this app. Glass, 366px wide at 390, 56px tall, a leaf
 *  line along its top edge, and the bird of whoever is talking. */
function Plate({
  round,
  question,
  index,
  speaker,
  progress,
  className,
  style,
}: {
  round: SketchRound;
  question: SketchQuestion;
  index: number;
  speaker: SketchPerson;
  progress: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "glass card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border",
        className
      )}
      style={{ height: 56, ...style }}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 h-[2px] bg-leaf"
        style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
      />
      <div className="flex h-full items-center gap-2.5 px-3">
        <BirdAvatar user={speaker} size={28} />
        <div className="min-w-0 flex-1">
          <p className={cn(CAPS, "leading-none text-muted-foreground")}>
            {metaLine(round.catchupName, `Round ${round.number}`)}
          </p>
          <p
            className="mt-[5px] overflow-hidden whitespace-nowrap text-[14px] leading-none text-foreground"
            style={FADE_RIGHT}
          >
            {question.text}
          </p>
        </div>
        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
          {index + 1}/{round.questions.length}
        </span>
        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
      </div>
    </div>
  );
}

/** One question row. The sheet's is 44px with its answer count; the rail's is
 *  34px without one. Nothing changes weight, so nothing reflows. */
function QuestionRow({
  q,
  index,
  current,
  height,
  lineHeight,
  pad,
  showCount,
}: {
  q: SketchQuestion;
  index: number;
  current: boolean;
  height: number;
  lineHeight: number;
  pad: string;
  showCount: boolean;
}) {
  return (
    <div
      className={cn("state-layer relative flex cursor-pointer items-center gap-2.5", pad)}
      style={{ height }}
    >
      {current && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-leaf"
        />
      )}
      <span
        className={cn(
          "w-6 shrink-0 text-[12px] tabular-nums",
          current ? "text-leaf" : "text-muted-foreground"
        )}
      >
        {index + 1}
      </span>
      <span
        className="min-w-0 flex-1 text-[15px] text-foreground"
        style={{
          lineHeight: `${lineHeight}px`,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "clip",
          ...FADE_RIGHT,
        }}
      >
        {q.text}
      </span>
      {showCount && (
        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
          {q.entries.length}
        </span>
      )}
    </div>
  );
}

/** 36px pill, 28px bird, first name. The current speaker's carries a 2px leaf
 *  underline under the name, so the wall shows who is talking. */
function RollChips({
  people,
  speakerId,
  className,
}: {
  people: SketchPerson[];
  speakerId?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap", className)} style={{ gap: 6 }}>
      {rollNames(people).map(({ person, label }) => (
        <span
          key={person.id}
          className="state-layer inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-2.5 text-[13px] text-foreground"
        >
          <BirdAvatar user={person} size={28} />
          <span className={person.id === speakerId ? "border-b-2 border-leaf" : undefined}>
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}

function OthersLine({ round, className }: { round: SketchRound; className?: string }) {
  const others = round.members.length - round.contributors.length;
  if (others <= 0) return null;
  return (
    <p className={cn("cursor-pointer text-[13px] text-muted-foreground hover:underline", className)}>
      and {others} others in this Catch-up
    </p>
  );
}

/** The navigator at the medium detent: 460px, no backdrop, the page still
 *  visible behind it. Eleven rows at 44px do not fit, so the chips below them
 *  are past the fold, which is what medium looks like. */
function NavigatorSheet({ round, currentIndex }: { round: SketchRound; currentIndex: number }) {
  const speaker = round.questions[currentIndex]?.entries[0]?.author;
  return (
    <div
      className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-border bg-float"
      style={{
        height: 460,
        borderTopLeftRadius: 20.8,
        borderTopRightRadius: 20.8,
        boxShadow: "0 -14px 44px -20px rgb(30 28 22 / 0.4)",
      }}
    >
      <div
        aria-hidden
        className="mx-auto rounded-full bg-border"
        style={{ marginTop: 8, width: 36, height: 5 }}
      />
      <div className="flex items-baseline gap-2 px-5" style={{ marginTop: 14 }}>
        <CatchupName round={round} />
        <span className="text-[13px] text-muted-foreground">
          {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
        </span>
      </div>
      <div style={{ marginTop: 12 }}>
        {round.questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            q={q}
            index={i}
            current={i === currentIndex}
            height={44}
            lineHeight={18}
            pad="px-5"
            showCount
          />
        ))}
      </div>
      <div className="px-5" style={{ marginTop: SP.l }}>
        <p className={cn(CAPS, "text-leaf")}>Who wrote in</p>
        <RollChips people={round.contributors} speakerId={speaker?.id} className="mt-2.5" />
        <OthersLine round={round} className="mt-2.5" />
      </div>
    </div>
  );
}

/** The wall on desktop: the whole roll stays up while you read. */
function Rail({ round, currentIndex, speakerId }: { round: SketchRound; currentIndex: number; speakerId?: string }) {
  return (
    <div
      className="sticky w-[318px] shrink-0 self-start overflow-y-auto"
      style={{ top: 40, maxHeight: 902 }}
    >
      <CatchupName round={round} className="block" />
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      <div className="-mx-2" style={{ marginTop: SP.l }}>
        {round.questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            q={q}
            index={i}
            current={i === currentIndex}
            height={34}
            lineHeight={17}
            pad="px-2"
            showCount={false}
          />
        ))}
      </div>
      <div style={{ marginTop: SP.l }}>
        <p className={cn(CAPS, "text-leaf")}>Who wrote in</p>
        <RollChips people={round.contributors} speakerId={speakerId} className="mt-2.5" />
        <OthersLine round={round} className="mt-3" />
      </div>
    </div>
  );
}

/* ── the shell, with the sidebar this direction grows rows on ───────── */

const NAV = [
  { label: "Feed", icon: Newspaper },
  { label: "Directory", icon: Notebook },
  { label: "Collection", icon: Images },
  { label: "Letters", icon: Feather },
  { label: "Catch-ups", icon: MessagesSquare },
  { label: "About", icon: Info },
] as const;

/* INVENTED: the batch Catch-up's row. The database has one Catch-up, and the
   direction's third broken rule is the sidebar growing a row per room with one
   cinnamon dot for the one state that needs you. The dot cannot sit on the
   Round you are reading, which is published, so the second door is drawn from
   the viewer's own batch year, the way section 2.8 says it exists for
   everybody automatically. */
function batchDoorName(round: SketchRound): string | null {
  const year = round.viewer.batchYear ?? round.members.find((m) => m.batchYear)?.batchYear ?? null;
  return year ? `Batch of ${year}` : null;
}

/** DesktopShell's geometry, with the Catch-up rows under "Catch-ups". The
 *  active row uses `--sidebar-active`, which is what the shipped sidebar
 *  paints; the mock's `bg-canopy` is the rail's own colour and reads as no
 *  row at all. */
function LaptopShell({ round, children }: { round: SketchRound; children: ReactNode }) {
  const batchDoor = batchDoorName(round);
  return (
    <div className="relative flex min-h-[982px] bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-[0.11]"
        style={{ backgroundImage: "url(/images/landing.jpeg)" }}
      />
      <aside className="relative z-10 flex w-[248px] shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground">
        <div className="mb-8 flex items-center gap-2.5 px-2 font-heading text-[17px]">
          <PeaksMark size={22} /> Rishi Valley
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ label, icon: Icon }) => {
            const active = label === "Catch-ups";
            return (
              <div key={label}>
                <div
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-full px-3.5 text-[14.5px] font-medium",
                    active ? "bg-sidebar-active text-white" : "text-sidebar-foreground/75"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  {label}
                </div>
                {active && (
                  <div className="mt-1 flex flex-col gap-0.5 pl-3">
                    <div className="flex h-9 items-center rounded-full bg-sidebar-active px-3.5 text-[14px] font-medium text-white">
                      {round.catchupName}
                    </div>
                    {batchDoor && (
                      <div className="flex h-9 items-center rounded-full px-3.5 text-[14px] font-medium text-sidebar-foreground-idle">
                        <span className="flex-1">{batchDoor}</span>
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-cinnamon"
                          title="Answers are open and you have not written in"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <main
          className="mx-auto w-full max-w-[1280px] flex-1 px-10"
          style={{ paddingTop: 40, paddingBottom: 80 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── the three drawings ─────────────────────────────────────────────── */

/** Which answer the tile with an open comment well is: the first one in the
 *  drawn questions that has comments, so the affordance appears exactly once. */
function commentedEntryId(questions: SketchQuestion[]): string | undefined {
  for (const q of questions) {
    const tile = q.entries.find((e) => !isRemark(e) && e.commentCount > 0);
    if (tile) return tile.id;
  }
  return undefined;
}

function Reader({ round, viewport }: SketchProps) {
  const drawn = round.questions.slice(0, 3);
  const openId = commentedEntryId(drawn);
  const firstSpeaker = drawn[0]?.entries[0]?.author ?? round.contributors[0] ?? round.viewer;

  const column = (
    <>
      <Masthead round={round} viewport={viewport} />
      {drawn.map((q) => (
        <QuestionBlock
          key={q.id}
          round={round}
          q={q}
          viewport={viewport}
          openCommentsOn={openId}
        />
      ))}
      <OmittedNote round={round} />
      <EndOfRound round={round} />
    </>
  );

  if (viewport === "laptop") {
    return (
      <LaptopShell round={round}>
        {/* 660 + 30 + 318, centred as a pair in the 1184 the shell gives, so
            88px of margin each side and a measure that never widens. */}
        <div className="mx-auto flex w-[1008px] gap-[30px]">
          <div className="w-[660px] shrink-0">{column}</div>
          <Rail round={round} currentIndex={0} speakerId={firstSpeaker.id} />
        </div>
      </LaptopShell>
    );
  }

  const lastQuestion: SketchQuestion | undefined = drawn[drawn.length - 1];
  const lastSpeaker =
    lastQuestion?.entries[lastQuestion.entries.length - 1]?.author ?? firstSpeaker;

  return (
    <div className="relative bg-background">
      <PhoneBar position="sticky" />
      <div className="px-5" style={{ paddingTop: 20 }}>
        {column}
      </div>
      {/* On a real phone this is fixed at the bottom of every screen. Here it
          sits at the foot of the page, after the 96px of padding that keeps
          the last heart out from under it, naming the last question drawn. */}
      <div style={{ paddingTop: 96, paddingBottom: 12, paddingLeft: 12, paddingRight: 12 }}>
        {lastQuestion && (
          <Plate
            round={round}
            question={lastQuestion}
            index={Math.max(0, drawn.length - 1)}
            speaker={lastSpeaker}
            progress={1}
          />
        )}
      </div>
    </div>
  );
}

/** How much of the previous answer is still on screen at the top: enough for
 *  its card and its heart row, which is what a mid-scroll screen shows. */
const TAIL_H = 156;

function midScroll(round: SketchRound) {
  const index = Math.max(0, Math.min(4, round.questions.length - 1));
  const q: SketchQuestion | undefined = round.questions[index];
  if (!q) return null;
  const tiles = q.entries.filter((e) => !isRemark(e));
  const pool = tiles.length >= 3 ? tiles : q.entries;
  /* A real consecutive run from deep inside the question, started on an answer
     that carries something (a song, a photograph) where there is one, so the
     tail at the top of the screen is a tail and not a blank card edge. */
  const withMedia = pool.findIndex((e) => e.images.length > 0 || resolvedSong(e));
  const start = Math.max(0, Math.min(withMedia > 0 ? withMedia : 3, Math.max(0, pool.length - 5)));
  const shown = pool.slice(start, start + 6);
  const under = shown[1] ?? shown[0] ?? q.entries[0];
  const at = under ? q.entries.indexOf(under) : 0;
  return {
    q,
    index,
    shown,
    speaker: under?.author ?? round.contributors[0] ?? round.viewer,
    progress: q.entries.length > 0 ? (at + 1) / q.entries.length : 0,
  };
}

/** The screen behind both phone drawings: the same moment in question 5, so
 *  the pair reads as the plate and then the plate tapped. */
function DeepScreen({ round, children }: { round: SketchRound; children: ReactNode }) {
  const pick = midScroll(round);
  const [tail, ...rest] = pick?.shown ?? [];
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <div style={{ paddingTop: 56 }}>
        {/* justify-end inside a fixed box: the previous answer overflows
            upward and is clipped, which is what scrolling past it looks like. */}
        <div className="flex flex-col justify-end overflow-hidden px-5" style={{ height: TAIL_H }}>
          {tail && (
            /* shrink-0 is load-bearing: a flex item in a column with a definite
               height shrinks to fit by default, which would squash the answer
               into 156px and show its TOP. This lets it overflow upward and be
               clipped, which is what having scrolled past it looks like. */
            <div className="shrink-0">
              <Tile entry={tail} viewport="phone" people={round.members} viewer={round.viewer} />
            </div>
          )}
        </div>
        <div className="flex flex-col px-5" style={{ paddingTop: 12, gap: 12 }}>
          {rest.map((e) => (
            <Tile
              key={e.id}
              entry={e}
              viewport="phone"
              people={round.members}
              viewer={round.viewer}
            />
          ))}
        </div>
      </div>
      <PhoneBar position="absolute" />
      {children}
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const pick = midScroll(round);
  return (
    <DeepScreen round={round}>
      {pick && (
        <Plate
          round={round}
          question={pick.q}
          index={pick.index}
          speaker={pick.speaker}
          progress={pick.progress}
          className="absolute"
          style={{ left: 12, right: 12, bottom: 12 }}
        />
      )}
    </DeepScreen>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  const pick = midScroll(round);
  return (
    <DeepScreen round={round}>
      <NavigatorSheet round={round} currentIndex={pick?.index ?? 0} />
    </DeepScreen>
  );
}

export const room: SketchDirection = {
  slug: "room",
  name: "Roll call",
  thesis:
    "A Round is a room, so you read who is in it before you read a word of it, and the people stay on the wall the whole way down.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
