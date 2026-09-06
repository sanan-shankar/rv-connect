/* ------------------------------------------------------------------ *
 *  "Signed at the foot" - direction 10 letter, drawn for the cull.
 *
 *  A Round is one letter that thirteen people wrote. An answer is not a
 *  card with a header on top: it is a passage of prose, and the writer's
 *  bird and name sit at its FOOT, where a signature goes. You read the
 *  words, then you learn who said them. Source:
 *  docs/planning/catchups-rework/directions/10-letter.md, section 3
 *  ("The reader, precisely"), followed to its numbers.
 *
 *  Static, per _types.ts: nothing here scroll-spies, jumps or toggles.
 *  What the direction calls fixed (the running head) is `absolute` inside
 *  the two 844px screens, and the tall Reader page simply does not draw
 *  it, because on a real phone it is hidden until the masthead has gone.
 *
 *  Everything on screen is the real Round except two things, both marked
 *  at their definitions: the words on the two song cards in the
 *  mid-scroll screen (INVENTED_CARDS below - the four answers in question
 *  5 that carry a pasted music link have `song: null`, so there is no
 *  real title to print), and `entry.commentCount`, which _data.ts invents
 *  so the affordance has a believable spread. No comment TEXT is drawn.
 * ------------------------------------------------------------------ */

import type { CSSProperties, ReactNode } from "react";
import { ChevronDown, Heart, Music, Play } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import { DesktopShell, PhoneBar } from "../_shell";
import type {
  SketchDirection,
  SketchEntry,
  SketchPerson,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "../_types";

/* The LiftKit tokens are `em`, so `var(--space-xl)` hung off a 32px title is
   84px rather than the 42px the direction quotes. Section 2 says the numbers
   ARE the steps resolved at the 16px base, so they are written here once, as
   those pixels, and used from a typographic context of any size. */
const SP = { xs: 6, s: 10, m: 16, l: 26, xl: 42, xxl: 68 } as const;

/** Section 3: "Small caps lines in Source Sans 3 at 12px, uppercase, tracked
 *  0.12em." Weight is not given; semibold is what every other caps line in
 *  the app is set in, and at 12px tracked on paper anything lighter goes
 *  grey. */
const CAPS = "text-[12px] font-semibold uppercase tracking-[0.12em]";

const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** The sheet, the cover and every photograph printed on one. 4px is on no
 *  rung of the radius ladder, and that is the point (section 4, break 1): a
 *  sheet of paper is cut square, a 16px corner reads as a control. */
const PRINT_CORNER = 4;

/** Passage type. 17px/1.6 at 390, 18px/1.6 at 1512, one step above the
 *  scale's body, because the letter is read continuously (break 2). */
function passageType(viewport: SketchViewport) {
  return viewport === "laptop"
    ? { fontSize: 18, lineHeight: "29px" }
    : { fontSize: 17, lineHeight: "27px" };
}

const WORDS = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];
/** A letter spells its small numbers. "and eight others", never "and 8". */
function spell(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

/** The signature's batch mark: '11, the way you would initial a letter. A
 *  member with no batch year signs with their line ("Teacher") unless that
 *  line is the "Member" filler, which says nothing and is left off. */
function batchMark(p: SketchPerson): string | null {
  if (p.batchYear) return `'${String(p.batchYear).slice(-2)}`;
  return p.batchLine && p.batchLine !== "Member" ? p.batchLine : null;
}

function commentLabel(n: number): string {
  return n === 0 ? "Comment" : `${n} comment${n === 1 ? "" : "s"}`;
}

/** Paragraphs, 10px apart, no first-line indent. A single newline stays
 *  inside its paragraph and is drawn by `whitespace-pre-wrap`; a blank line
 *  is what starts a new one. */
function paragraphsOf(body: string): string[] {
  return body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** renderRichText leaves a bare URL as text. Section 3: a link in a passage
 *  stays in the sentence where it was pasted, in leaf, with
 *  `overflow-wrap: anywhere` so a pasted address breaks inside itself rather
 *  than pushing the column. */
function bodyHtml(text: string): string {
  return renderRichText(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noreferrer" class="text-leaf underline decoration-leaf/40 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-leaf">$1</a>'
  );
}

function firstMusicLink(body: string): string | null {
  const match = body.match(/https?:\/\/[^\s]+/g);
  if (!match) return null;
  return match.find((u) => /spotify\.com|youtu\.?be/i.test(u)) ?? null;
}

/** "An answer with no photograph, no link, no line break and fewer than 90
 *  characters is set as one row." Eleven of those are one phone screen. */
function isOneRow(entry: SketchEntry): boolean {
  const body = entry.body?.trim() ?? "";
  if (!body || entry.images.length > 0 || entry.song) return false;
  if (body.includes("\n")) return false;
  if (/https?:\/\//i.test(body)) return false;
  return body.length < 90;
}

/* INVENTED, and the only invented words in the drawing.
   Four answers in question 5 carry a pasted music link in their body and
   `entry.song` is null for every one of them, so the card the direction
   prints under the text has no real title or artist to draw. These two are
   the direction's OWN sample cards (section 3, "With a song link" and the
   mid-scroll screen), used verbatim so the card can be judged at the size it
   was drawn at. They are printed only in MidScroll, where the direction's
   screen IS the song card; everywhere else an unresolved link gets no card,
   which is the direction's own rule and needs no invention. The link in the
   text above the card is the member's real one. */
const INVENTED_CARDS = {
  spotify: { title: "Chuttamalle", artist: "Anirudh Ravichander, Shilpa Rao" },
  youtube: { title: "Ilaiyaraaja, Live in Concert (2022)", artist: "Sony Music South" },
} as const;

type CardData = {
  title: string;
  artist: string | null;
  source: "Spotify" | "YouTube";
  art: string | null;
};

function cardFor(entry: SketchEntry, allowInvented: boolean): CardData | null {
  const song = entry.song;
  /* The resolver stores the URL as the title when oembed fails. "If the link
     does not resolve, no card: the link in the text is all there is." */
  if (song?.title && !/^https?:\/\//i.test(song.title.trim())) {
    return {
      title: song.title,
      artist: null,
      source: /youtu\.?be/i.test(song.url) ? "YouTube" : "Spotify",
      art: song.art,
    };
  }
  if (!allowInvented) return null;
  const url = firstMusicLink(entry.body ?? "");
  if (!url) return null;
  const yt = /youtu\.?be/i.test(url);
  const invented = yt ? INVENTED_CARDS.youtube : INVENTED_CARDS.spotify;
  return { title: invented.title, artist: invented.artist, source: yt ? "YouTube" : "Spotify", art: null };
}

/* ── the pieces ─────────────────────────────────────────────────────── */

/** A drawing of LoveButton: the red heart with its count, at the right end of
 *  every signature line. Not the real control, which needs a server action. */
function StaticHeart({ count, loved }: { count: number; loved: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1",
        loved ? "text-heart" : "text-muted-foreground hover:text-heart"
      )}
    >
      <Heart size={15} strokeWidth={1.8} fill={loved ? "currentColor" : "none"} />
      <span className="text-[14px] tabular-nums">{count}</span>
    </span>
  );
}

/** The return address, printed in every place the way home lives: the
 *  masthead, the running head, the end of the letter, the contents margin.
 *  Always the Catch-up's name, never a Back arrow. */
function ReturnAddress({ round, className }: { round: SketchRound; className?: string }) {
  return (
    <span className={cn(CAPS, "cursor-pointer text-leaf hover:underline", className)}>
      {round.catchupName}
    </span>
  );
}

/** Name-and-bird items that wrap: the from-line, the signatures at the end,
 *  the writers in the open panel. 28px bird, 10px gap, name at 15px, 12px
 *  between items, 32px line boxes. */
function Writers({
  people,
  className,
  style,
  leading,
  trailing,
}: {
  people: SketchPerson[];
  className?: string;
  style?: CSSProperties;
  /** The word the from-line opens on. It belongs INSIDE this flow: as its
   *  own flex item beside the list it would pin every wrapped line to a
   *  narrow column instead of letting the names run the measure. */
  leading?: string;
  trailing?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center", className)}
      style={{ columnGap: 12, rowGap: 0, lineHeight: "32px", ...style }}
    >
      {leading && (
        <span className="flex items-center text-[15px] text-foreground" style={{ height: 32 }}>
          {leading}
        </span>
      )}
      {people.map((p) => (
        <span
          key={p.id}
          className="flex cursor-pointer items-center text-[15px] text-foreground hover:underline"
          style={{ height: 32, gap: 10 }}
        >
          <BirdAvatar user={p} size={28} />
          {p.name}
        </span>
      ))}
      {trailing && (
        <span
          className="flex cursor-pointer items-center text-[15px] text-muted-foreground hover:underline"
          style={{ height: 32 }}
        >
          {trailing}
        </span>
      )}
    </div>
  );
}

/** It is the cover, drawn large, from the same four fields. No rule under it,
 *  no ornament, nothing derived from the answers. */
function Masthead({ round, viewport }: SketchProps) {
  const laptop = viewport === "laptop";
  const answers = round.questions.reduce((n, q) => n + q.entries.length, 0);
  const shown = laptop ? round.contributors : round.contributors.slice(0, 5);
  const rest = round.contributors.length - shown.length;

  return (
    <header>
      <div className="flex items-center justify-between" style={{ height: 14 }}>
        <ReturnAddress round={round} />
        <span className={cn(CAPS, "text-muted-foreground")}>
          {formatDisplayDateLong(round.publishedAt)}
        </span>
      </div>
      <h1
        className="font-heading tracking-[-0.025em] text-foreground"
        style={{
          marginTop: SP.s,
          fontSize: laptop ? 40 : 32,
          lineHeight: laptop ? "50px" : "40px",
        }}
      >
        Round {round.number}
      </h1>
      {/* At 1512 the writers stand in the right margin, so no from-line sits
          inside the sheet and the count line follows the title directly. */}
      {!laptop && (
        <Writers
          people={shown}
          leading="From"
          trailing={rest > 0 ? `and ${spell(rest)} others` : undefined}
          style={{ marginTop: SP.s }}
        />
      )}
      <p className="text-[15px] text-muted-foreground" style={{ marginTop: SP.s }}>
        {answers} answers to {round.questions.length} questions.
      </p>
    </header>
  );
}

/** 42px above, 16px below. The eyebrow only where the asker is known; the
 *  five anonymous questions stand alone. No number, no count, no rule. */
function QuestionHeading({ q, viewport }: { q: SketchQuestion; viewport: SketchViewport }) {
  return (
    <>
      {q.showAsker && q.asker && (
        <p className={cn(CAPS, "text-muted-foreground")} style={{ marginBottom: SP.xs }}>
          {q.asker.name} asked
        </p>
      )}
      <h2
        className="font-heading italic tracking-[-0.025em] text-foreground"
        style={{ fontSize: viewport === "laptop" ? 24 : 20, lineHeight: 1.3 }}
      >
        {q.text}
      </h2>
    </>
  );
}

/** Our own card, never the provider's player. Accent, a hairline, 12px
 *  corners, 12px padded, at most 400px wide. */
function SongCard({ card }: { card: CardData }) {
  const wide = card.source === "YouTube";
  const art = wide ? { width: 96, height: 54 } : { width: 56, height: 56 };
  return (
    <div
      className="state-layer flex max-w-[400px] cursor-pointer items-center gap-3 rounded-[12px] border border-border bg-accent p-3"
      style={{ marginTop: SP.s }}
    >
      {card.art ? (
        <img
          src={card.art}
          alt=""
          loading="lazy"
          className="shrink-0 object-cover"
          style={{ ...art, borderRadius: wide ? PRINT_CORNER : 8.8 }}
        />
      ) : (
        <span
          className="grid shrink-0 place-items-center bg-mist text-muted-foreground"
          style={{ ...art, borderRadius: wide ? PRINT_CORNER : 8.8 }}
        >
          {wide ? <Play size={18} fill="currentColor" strokeWidth={0} /> : <Music size={18} strokeWidth={1.8} />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-foreground">{card.title}</p>
        {card.artist && (
          <p className="mt-1 truncate text-[14px] leading-tight text-muted-foreground">{card.artist}</p>
        )}
      </div>
      <span className={cn(CAPS, "shrink-0 text-muted-foreground")}>{card.source}</span>
    </div>
  );
}

/** Photographs printed on the sheet: 4px corners, the app's own justified
 *  rows with 4px gutters, and the single-photograph rule for one. */
function Photographs({ entry }: { entry: SketchEntry; viewport: SketchViewport }) {
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
          className="cursor-pointer rounded-[4px]"
          fallbackClassName="aspect-[16/10] rounded-[4px]"
        />
      </div>
    );
  }

  if (!measured) {
    return (
      <div className="grid grid-cols-2 gap-1" style={{ marginTop: SP.s }}>
        {entry.images.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            className="aspect-square w-full cursor-pointer rounded-[4px] object-cover"
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: SP.s }}>
      <PhotoRows photos={measured} gap={4} columnSizes={PHOTO_SIZES} keyOf={(_p, i) => entry.images[i]}>
        {(_photo, i, cell) => (
          <img
            src={entry.images[i]}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full cursor-pointer rounded-[4px] object-cover"
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

/** The signature. Everywhere else in the app the bird and the name lead;
 *  here they sign, and the heart signs with them, so the moment you learn
 *  who wrote it is the moment you can thank them (break 3).
 *
 *  On desktop the bird hangs in the sheet's 72px left padding, at x 28 to 56
 *  inside the sheet, so a glance down the margin tells you who is in this
 *  question while the reading order stays words first. */
function SignatureLine({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  const laptop = viewport === "laptop";
  const mark = batchMark(entry.author);
  return (
    <div
      className="relative flex flex-wrap items-center"
      style={{ marginTop: SP.s, minHeight: 28, columnGap: 6, rowGap: 4 }}
    >
      {laptop ? (
        <span className="absolute" style={{ left: -44, top: 0 }}>
          <BirdAvatar user={entry.author} size={28} />
        </span>
      ) : (
        <span style={{ marginRight: 4 }}>
          <BirdAvatar user={entry.author} size={28} />
        </span>
      )}
      <span className="cursor-pointer font-heading text-[15px] italic text-foreground hover:underline">
        {entry.author.name}
      </span>
      {mark && <span className={cn(CAPS, "text-muted-foreground")}>{mark}</span>}
      <span className="ml-auto flex items-center gap-3">
        <span className="cursor-pointer text-[14px] text-muted-foreground hover:underline">
          {commentLabel(entry.commentCount)}
        </span>
        <StaticHeart count={entry.loveCount} loved={entry.lovedByViewer} />
      </span>
    </div>
  );
}

/** One answer, as a passage somebody signed: the text, any photographs, any
 *  song card, then the signature line. No box, no hairline, no header.
 *  Between one signature line and the next passage's first line, 26px. */
function Passage({
  entry,
  viewport,
  gapTop,
  clipBodyTo,
  allowInventedCard = false,
}: {
  entry: SketchEntry;
  viewport: SketchViewport;
  gapTop: number;
  /** Height in px for the body box when this passage is the one running off
   *  the top of a mid-scroll screen: the last lines show, the rest is cut. */
  clipBodyTo?: number;
  allowInventedCard?: boolean;
}) {
  const body = entry.body?.trim() ?? "";
  const type = passageType(viewport);
  const card = cardFor(entry, allowInventedCard);

  /* One row: the text, then the signature's contents inline, then the
     comments word and the heart at the row's right end. */
  if (isOneRow(entry) && !clipBodyTo) {
    const mark = batchMark(entry.author);
    return (
      <div
        className="flex flex-wrap items-center"
        style={{ marginTop: gapTop, columnGap: 10, rowGap: 4, minHeight: 28 }}
      >
        <span className="text-foreground" style={type}>
          {body}
        </span>
        <span className="flex items-center" style={{ gap: 6 }}>
          <BirdAvatar user={entry.author} size={28} />
          <span className="cursor-pointer font-heading text-[15px] italic text-foreground hover:underline">
            {entry.author.name}
          </span>
          {mark && <span className={cn(CAPS, "text-muted-foreground")}>{mark}</span>}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span className="cursor-pointer text-[14px] text-muted-foreground hover:underline">
            {commentLabel(entry.commentCount)}
          </span>
          <StaticHeart count={entry.loveCount} loved={entry.lovedByViewer} />
        </span>
      </div>
    );
  }

  const text = body && (
    <div className="flex flex-col" style={{ gap: SP.s }}>
      {paragraphsOf(body).map((p, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]"
          style={type}
          dangerouslySetInnerHTML={{ __html: bodyHtml(p) }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ marginTop: gapTop }}>
      {clipBodyTo ? (
        /* shrink-0 is load-bearing: a flex item in a column of definite height
           would otherwise squash to fit and show its TOP. This lets the
           paragraph overflow upward and be clipped, which is what having
           scrolled past it looks like. */
        <div className="flex flex-col justify-end overflow-hidden" style={{ height: clipBodyTo }}>
          <div className="shrink-0">{text}</div>
        </div>
      ) : (
        text
      )}
      {entry.images.length > 0 && <Photographs entry={entry} viewport={viewport} />}
      {card && <SongCard card={card} />}
      <SignatureLine entry={entry} viewport={viewport} />
    </div>
  );
}

/** A photo-wall question: one photograph from each writer as one justified
 *  grid above the passages, each wearing its writer's bird at its bottom left
 *  over a 4px inset. The photograph IS the answer here, so nothing is printed
 *  under it: the bird on the corner is the signature. */
function PhotoWall({ q }: { q: SketchQuestion }) {
  const cells = q.entries.flatMap((e) =>
    e.images.map((src, i) => ({ src, photo: e.photos[i] ?? null, author: e.author }))
  );
  const measured = cells.filter(
    (c): c is { src: string; photo: StoredPhoto; author: SketchPerson } => Boolean(c.photo)
  );
  if (cells.length === 0) return null;

  const bird = (author: SketchPerson) => (
    <span className="absolute" style={{ left: PRINT_CORNER, bottom: PRINT_CORNER }}>
      <BirdAvatar user={author} size={28} />
    </span>
  );

  if (measured.length !== cells.length) {
    return (
      <div className="grid grid-cols-2 gap-1" style={{ marginTop: SP.m }}>
        {cells.map((c) => (
          <figure key={c.src} className="relative">
            <img
              src={c.src}
              alt=""
              loading="lazy"
              className="aspect-square w-full cursor-pointer rounded-[4px] object-cover"
            />
            {bird(c.author)}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: SP.m }}>
      <PhotoRows
        photos={measured.map((c) => c.photo)}
        gap={4}
        columnSizes={PHOTO_SIZES}
        keyOf={(_p, i) => measured[i].src}
      >
        {(_photo, i, cell) => (
          <figure className="relative">
            <img
              src={measured[i].src}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full cursor-pointer rounded-[4px] object-cover"
              style={{
                aspectRatio: cell.aspectRatio,
                objectPosition: cell.objectPosition,
                maxHeight: cell.maxHeight,
              }}
            />
            {bird(measured[i].author)}
          </figure>
        )}
      </PhotoRows>
    </div>
  );
}

/** The heading, then the passages, in the one running order of voices. */
function QuestionBlock({ q, viewport }: { q: SketchQuestion; viewport: SketchViewport }) {
  return (
    <section style={{ marginTop: SP.xl }}>
      <QuestionHeading q={q} viewport={viewport} />
      {q.kind === "photo" ? (
        <PhotoWall q={q} />
      ) : (
        q.entries.map((e, i) => (
          <Passage key={e.id} entry={e} viewport={viewport} gapTop={i === 0 ? SP.m : SP.l} />
        ))
      )}
    </section>
  );
}

function nextLine(round: SketchRound): string {
  return round.nextOpensAt
    ? `Round ${round.number + 1} opens ${formatDisplayDateLong(round.nextOpensAt)}.`
    : `Round ${round.number + 1} has no date yet.`;
}

/** After the last passage: the signatures, the date of the next one, and the
 *  return address. A letter closes with who wrote it, which a blog never
 *  does. */
function EndOfRound({ round, viewport }: { round: SketchRound; viewport: SketchViewport }) {
  return (
    <footer
      style={{ marginTop: SP.xxl, paddingBottom: viewport === "laptop" ? 0 : SP.xxl }}
    >
      <p className={cn(CAPS, "text-muted-foreground")}>Written by</p>
      <Writers people={round.contributors} className="mt-1.5" />
      <p className="text-[15px] text-muted-foreground" style={{ marginTop: SP.l }}>
        {nextLine(round)}
      </p>
      <div style={{ marginTop: SP.l }}>
        <ReturnAddress round={round} />
      </div>
    </footer>
  );
}

/** A sketch artifact, not part of the direction: the cull draws three
 *  questions and then the end, so the page says which pages are missing. */
function OmittedNote({ round, drawn }: { round: SketchRound; drawn: number }) {
  if (round.questions.length <= drawn) return null;
  return (
    <p className="text-[13px] text-muted-foreground" style={{ marginTop: SP.xl }}>
      Questions {drawn + 1} to {round.questions.length} omitted from the sketch.
    </p>
  );
}

/* ── the navigator, on a phone ───────────────────────────────────────── */

/** The folio counts questions that have at least one answer, in the order
 *  they are printed. */
function folioOf(round: SketchRound, index: number) {
  const answered = round.questions.filter((q) => q.entries.length > 0);
  const q = round.questions[index];
  const at = q ? answered.indexOf(q) : -1;
  return { position: at >= 0 ? at + 1 : index + 1, total: answered.length || round.questions.length };
}

/** Resting: a 52px strip directly under the green bar, glass, no border, the
 *  low-opacity layered shadow so the paper reads as scrolling under it. Two
 *  lines: the way home and the folio, then the question you are inside. */
function RunningHead({ round, index }: { round: SketchRound; index: number }) {
  const q = round.questions[index];
  const folio = folioOf(round, index);
  return (
    <div
      className="glass absolute inset-x-0 z-30 flex flex-col justify-center"
      style={{
        top: 56,
        height: 52,
        paddingLeft: 16,
        paddingRight: 16,
        boxShadow:
          "0 1px 2px rgb(var(--shadow-ink) / 0.03), 0 12px 26px -20px rgb(var(--shadow-ink) / 0.35)",
      }}
    >
      <div className="flex items-center justify-between" style={{ height: 14 }}>
        <span className={cn(CAPS, "cursor-pointer text-leaf hover:underline")}>
          {metaLine(round.catchupName, `Round ${round.number}`)}
        </span>
        <span className={cn(CAPS, "flex items-center gap-1 text-muted-foreground")}>
          {folio.position} of {folio.total}
          <ChevronDown size={12} strokeWidth={2.2} />
        </span>
      </div>
      <p
        className="mt-[3px] truncate font-heading text-[15px] italic text-foreground"
        style={{ height: 20, lineHeight: "20px" }}
      >
        {q?.text}
      </p>
    </div>
  );
}

/** Open: the strip stays and the letter's own contents page slides down from
 *  behind it, set in the letter's own type. Float, 12px bottom corners, as
 *  tall as its contents up to 72% of the viewport. */
function ContentsPanel({ round, index }: { round: SketchRound; index: number }) {
  const answered = round.questions.filter((q) => q.entries.length > 0);
  const unanswered = round.questions.filter((q) => q.entries.length === 0);
  const current = round.questions[index];

  const row = (q: SketchQuestion, live: boolean) => (
    <div
      key={q.id}
      className={cn(
        "flex items-start gap-3 rounded-[8px] px-2",
        live ? "state-layer cursor-pointer" : ""
      )}
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: live && q.id === current?.id ? "color-mix(in srgb, var(--canopy) 12%, transparent)" : undefined,
      }}
    >
      <span
        className={cn(
          "min-w-0 flex-1 font-heading text-[15px]",
          live ? "text-foreground" : "text-muted-foreground"
        )}
        style={{
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {q.text}
      </span>
      {live && (
        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground" style={{ lineHeight: "21px" }}>
          {q.entries.length}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="absolute inset-x-0 z-20 overflow-hidden bg-float"
      style={{
        top: 108,
        maxHeight: 608,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        boxShadow: "0 1px 2px rgb(var(--shadow-ink) / 0.04), 0 22px 44px -26px rgb(var(--shadow-ink) / 0.5)",
      }}
    >
      <div style={{ padding: 20 }}>
        <p className={cn(CAPS, "text-muted-foreground")}>
          {metaLine(`Round ${round.number}`, `${round.questions.length} questions`)}
        </p>
        <div className="-mx-2" style={{ marginTop: SP.s }}>
          {answered.map((q) => row(q, true))}
        </div>
        {unanswered.length > 0 && (
          <>
            <p className={cn(CAPS, "text-muted-foreground")} style={{ marginTop: SP.m }}>
              Nobody answered
            </p>
            <div className="-mx-2 mt-1">{unanswered.map((q) => row(q, false))}</div>
          </>
        )}
        <p className={cn(CAPS, "text-muted-foreground")} style={{ marginTop: SP.m }}>
          Written by
        </p>
        <Writers people={round.contributors} className="mt-1.5" />
      </div>
    </div>
  );
}

/* ── the desktop margins ────────────────────────────────────────────── */

/** 232px, sticky at 32px. The way home, then the eleven questions in
 *  Baskerville, muted, the current one in ink with a 2px leaf bar outside the
 *  text, so the change is colour and a mark and never weight. */
function ContentsMargin({ round, index }: { round: SketchRound; index: number }) {
  return (
    <div className="sticky top-8 w-[232px] shrink-0 self-start">
      <ReturnAddress round={round} />
      <div className="flex flex-col" style={{ marginTop: SP.m, gap: 8 }}>
        {round.questions.map((q, i) => (
          <div key={q.id} className="relative cursor-pointer">
            {i === index && (
              <span
                aria-hidden
                className="absolute bg-leaf"
                style={{ left: -10, top: 1, width: 2, height: "calc(100% - 2px)" }}
              />
            )}
            <span
              className={cn(
                "block font-heading text-[14px]",
                i === index ? "text-foreground" : "text-muted-foreground"
              )}
              style={{
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {q.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 200px, sticky at the same 32px. The whole cast at once, level with the
 *  title, and the date of the next Round under them. */
function WritersMargin({ round }: { round: SketchRound }) {
  return (
    <div className="sticky top-8 w-[200px] shrink-0 self-start">
      <p className={cn(CAPS, "text-muted-foreground")}>Written by</p>
      <div className="flex flex-col" style={{ marginTop: SP.s, gap: 6 }}>
        {round.contributors.map((p) => (
          <span
            key={p.id}
            className="flex cursor-pointer items-start gap-2.5 text-[14px] text-foreground hover:underline"
          >
            <BirdAvatar user={p} size={28} />
            <span style={{ lineHeight: "28px" }}>{p.name}</span>
          </span>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground" style={{ marginTop: SP.m }}>
        {nextLine(round)}
      </p>
    </div>
  );
}

/* ── the three drawings ─────────────────────────────────────────────── */

const DRAWN = 3;

function Letter({ round, viewport }: SketchProps) {
  const drawn = round.questions.slice(0, DRAWN).filter((q) => q.entries.length > 0);
  return (
    <>
      <Masthead round={round} viewport={viewport} />
      {drawn.map((q) => (
        <QuestionBlock key={q.id} q={q} viewport={viewport} />
      ))}
      <OmittedNote round={round} drawn={DRAWN} />
      <EndOfRound round={round} viewport={viewport} />
    </>
  );
}

function Reader({ round, viewport }: SketchProps) {
  if (viewport === "laptop") {
    return (
      <DesktopShell>
        {/* DesktopShell's main carries a 40px gutter and 32px of top padding.
            The direction measures its three columns from the content area's
            own edge (20px of page either side, 32px from the top), so the
            gutter is cancelled here rather than the shell being forked. */}
        <div className="-mx-10 px-5">
          <div className="flex items-start gap-8">
            <ContentsMargin round={round} index={0} />
            <div
              className="card-elevated w-[720px] shrink-0 bg-card"
              style={{
                borderRadius: PRINT_CORNER,
                paddingTop: 56,
                paddingLeft: 72,
                paddingRight: 72,
                paddingBottom: 68,
              }}
            >
              <Letter round={round} viewport={viewport} />
            </div>
            <WritersMargin round={round} />
          </div>
        </div>
      </DesktopShell>
    );
  }

  /* At 390 the paper fills the screen under the green bar; the valley wash is
     not visible on this page, because the sheet covers it. 24px of side
     padding, so the measure is 342. No running head: it only fades in once
     the masthead has scrolled away. */
  return (
    <div className="bg-card">
      <PhoneBar position="sticky" />
      <div style={{ paddingTop: 26, paddingLeft: 24, paddingRight: 24 }}>
        <Letter round={round} viewport={viewport} />
      </div>
    </div>
  );
}

/** Deep in question 5, in the letter's own printed order. The run starts at
 *  the first answer carrying a pasted music link, so the screen opens on the
 *  tail of a passage and its card, the way the direction's mid-scroll screen
 *  does. If that run holds no one-row answer, the question's first one is
 *  drawn after the head: it is a real answer to this question, selected out
 *  of its place so the packing can be seen on one screen. */
const MID_INDEX = 4;
const TAIL_LINES = 81;

function midScrollRun(round: SketchRound) {
  const index = Math.min(MID_INDEX, round.questions.length - 1);
  const q = round.questions[index];
  if (!q || q.entries.length === 0) return null;
  const linkedAt = q.entries.findIndex((e) => Boolean(firstMusicLink(e.body ?? "")));
  const start = Math.max(0, linkedAt);
  const run = q.entries.slice(start, start + 5);
  if (!run.some(isOneRow)) {
    const short = q.entries.find(isOneRow);
    if (short && !run.includes(short)) run.splice(1, 0, short);
  }
  return { index, q, run };
}

/** The screen behind both phone drawings, so the pair reads as the running
 *  head and then the running head tapped. */
function DeepScreen({ round, dim, children }: { round: SketchRound; dim?: boolean; children: ReactNode }) {
  const pick = midScrollRun(round);
  const [head, ...rest] = pick?.run ?? [];
  return (
    <div className="relative h-full overflow-hidden bg-card">
      <div style={{ paddingTop: 108, paddingLeft: 24, paddingRight: 24 }}>
        {head && (
          <Passage
            entry={head}
            viewport="phone"
            gapTop={0}
            clipBodyTo={TAIL_LINES}
            allowInventedCard
          />
        )}
        {rest.map((e) => (
          <Passage key={e.id} entry={e} viewport="phone" gapTop={SP.l} allowInventedCard />
        ))}
      </div>
      {/* The letter dims under the dialog backdrop; the app's own bar and the
          navigator stay above it. */}
      {dim && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-[#241a12]/55 backdrop-blur-md" style={{ top: 56 }} />
      )}
      <PhoneBar position="absolute" />
      {children}
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const pick = midScrollRun(round);
  return (
    <DeepScreen round={round}>
      <RunningHead round={round} index={pick?.index ?? 0} />
    </DeepScreen>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  const pick = midScrollRun(round);
  const index = pick?.index ?? 0;
  return (
    <DeepScreen round={round} dim>
      <ContentsPanel round={round} index={index} />
      <RunningHead round={round} index={index} />
    </DeepScreen>
  );
}

export const letter: SketchDirection = {
  slug: "letter",
  name: "Signed at the foot",
  thesis:
    "A published Round is one letter that thirteen people wrote, so every answer is a passage of prose with the writer's bird and name at its foot, where a signature goes.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
