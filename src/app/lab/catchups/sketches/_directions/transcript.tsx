/* ------------------------------------------------------------------ *
 *  "As it arrived" - direction 07 transcript, drawn for the cull.
 *
 *  The bet: a Round reads in the order people wrote in. Not eleven
 *  sections but a transcript of arrivals, split into RUNS wherever the
 *  author changes, each answer carrying its question above it as a pin
 *  the way a chat quotes the message it answers. Source:
 *  docs/planning/catchups-rework/directions/07-transcript.md, section 3
 *  ("The reader, precisely"), followed to its numbers.
 *
 *  Everything the direction calls `fixed` or `sticky` is `absolute`
 *  inside the two 844px screens, per _types.ts, and simply sits at the
 *  foot of the tall Reader page. Nothing here scrolls, drags or toggles.
 *
 *  What the real Round does to the direction's prose, which was written
 *  against an invented five-day Round: this one ran EIGHT days (6 to 13
 *  August 2026), 133 answers, 13 people, and splits into 23 runs, not
 *  13, because four people came back later and two overlapped. Every
 *  number on screen is derived from the data at render time, so the page
 *  says eight days and 23 runs rather than the direction's five and 13.
 *
 *  Invented, and marked again at each definition: the song card's title
 *  and artist (every `entry.song` in this Round is null, so a card drawn
 *  under a music link has to invent the metadata a resolver would have
 *  fetched), and the comment counts, which come from the harness and are
 *  invented there. No comment TEXT is drawn anywhere. Every name, word,
 *  photograph, heart, link and hour is the real Round.
 * ------------------------------------------------------------------ */

import { ChevronDown, ChevronLeft, ChevronUp, Heart, Music } from "lucide-react";
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
  SketchPerson,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "../_types";

/* ── constants ──────────────────────────────────────────────────────── */

/** "Times are the valley's." The one sentence the masthead spends on this. */
const ZONE = "Asia/Kolkata";

/* The LiftKit tokens are `em`, so `var(--space-l)` hung off a 13px meta line
   is 21px and not the 26px the direction quotes. The direction's numbers are
   the tokens resolved at the 16px base, so they are written here as pixels
   and `var(--space-*)` is used only where the box really is at 16px. */
const SP = { xxs: 4, xs: 6, s: 10, m: 16, l: 26, xl: 42 } as const;

/** The 52px bar plus a home indicator's inset. The direction quotes 86px and
 *  the first-screen geometry (bar from y=758) depends on it, so it is a fixed
 *  number rather than `env(safe-area-inset-bottom)`: env() resolves to 0 in a
 *  screenshot and the bar would draw 34px short of its own spec. */
const BAR_H = 52;
const BAR_INSET = 34;
const BAR_TOTAL = BAR_H + BAR_INSET;

const HEART_RED = "#E03A33";
const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** The rail's and the label's register, 10.5px, as IdentityRow sets it. */
const RAIL_LABEL =
  "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const URL_RE = /(https?:\/\/[^\s<]+)/;
const MUSIC_RE = /(spotify\.|youtu\.be|youtube\.com|music\.apple|soundcloud)/i;
/** An answer that is only faces. The direction sets these at 1.75rem, which is
 *  its second break of the type scale. No answer in the first three runs or in
 *  the mid-scroll run is one, so this fires nowhere in these three drawings;
 *  it is here because the rule is the direction's, not the fixture's. */
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Component}\uFE0F\u200D\s]+$/u;

/* ── the valley's clock ─────────────────────────────────────────────── */

const at = (iso: string) => new Date(iso);

/** "7:14 am". */
function clockTime(iso: string): string {
  return at(iso).toLocaleTimeString("en-IN", { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
}

/** "Thursday 6 August", the day marker's words. */
function longDay(iso: string): string {
  return at(iso).toLocaleDateString("en-GB", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" });
}

/** "6 August", for the close. */
function dayAndMonth(iso: string): string {
  return at(iso).toLocaleDateString("en-GB", { timeZone: ZONE, day: "numeric", month: "long" });
}

/** "Thursday". */
function weekday(iso: string): string {
  return at(iso).toLocaleDateString("en-GB", { timeZone: ZONE, weekday: "long" });
}

/** "Thu", the roll chip's prefix. */
function shortWeekday(iso: string): string {
  return at(iso).toLocaleDateString("en-GB", { timeZone: ZONE, weekday: "short" });
}

/** "Thu 6 Aug", the run header's stamp at 1512 where there is room for it. */
function shortStamp(iso: string): string {
  return at(iso).toLocaleDateString("en-GB", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short" });
}

/** "2026-08-06" in the valley's zone: what a day marker keys off. */
function dayKey(iso: string): string {
  return at(iso).toLocaleDateString("en-CA", { timeZone: ZONE });
}

function partOfDay(iso: string): string {
  const hour = Number(at(iso).toLocaleString("en-GB", { timeZone: ZONE, hour: "2-digit", hour12: false })) % 24;
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

const NUMBER_WORDS = [
  "no", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];
const spell = (n: number) => (n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n));
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/* ── the one derivation this direction needs ────────────────────────── */

type Pin = {
  entry: SketchEntry;
  question: SketchQuestion;
  /** 1-based place in the whole Round. This is what the bar counts. */
  position: number;
};

type Run = {
  author: SketchPerson;
  pins: Pin[];
  /** The day of the run's FIRST answer; a run that crosses midnight keeps it. */
  day: string;
  /** Somebody who already had a run, on an earlier day, and came back. */
  cameBack: boolean;
};

type Transcript = {
  pins: Pin[];
  runs: Run[];
  /** Contributors in the order of their first answer, with that answer's time. */
  roll: { person: SketchPerson; at: string }[];
  /** Distinct calendar days, in order. */
  days: string[];
};

/**
 * Flatten every entry, tag it with its question, sort by the hour it arrived,
 * split into runs wherever the author changes. Done once, at the top, because
 * every surface of this direction is a view of the same list: the runs are the
 * page, the roll is the masthead, the pins are the sheet, and the position is
 * the bar's "n of 133".
 */
function readTranscript(round: SketchRound): Transcript {
  const pins: Pin[] = round.questions
    .flatMap((question) => question.entries.map((entry) => ({ entry, question, position: 0 })))
    .sort((a, b) => Date.parse(a.entry.createdAt) - Date.parse(b.entry.createdAt))
    .map((pin, i) => ({ ...pin, position: i + 1 }));

  const runs: Run[] = [];
  const roll: { person: SketchPerson; at: string }[] = [];
  const lastDayOf = new Map<string, string>();

  for (const pin of pins) {
    const author = pin.entry.author;
    const day = dayKey(pin.entry.createdAt);
    const open = runs[runs.length - 1];
    if (open && open.author.id === author.id) {
      open.pins.push(pin);
      continue;
    }
    const previousDay = lastDayOf.get(author.id);
    runs.push({ author, pins: [pin], day, cameBack: previousDay !== undefined && previousDay !== day });
    lastDayOf.set(author.id, day);
    if (!roll.some((r) => r.person.id === author.id)) roll.push({ person: author, at: pin.entry.createdAt });
  }

  return { pins, runs, roll, days: [...new Set(pins.map((p) => dayKey(p.entry.createdAt)))] };
}

/** Where a day marker belongs: before the first run of each calendar day. */
function marksDay(runs: Run[], index: number): boolean {
  return index === 0 || runs[index - 1].day !== runs[index].day;
}

/* ── the answer's parts ─────────────────────────────────────────────── */

/**
 * renderRichText honours emphasis and mentions but leaves a bare URL as text,
 * and this direction needs the link inside the sentence, in leaf, because the
 * song card under it is a second thing and not a replacement. The substitution
 * runs on already-escaped HTML, so the URL cannot carry markup.
 */
function bodyHtml(text: string): string {
  return renderRichText(text).replace(
    new RegExp(URL_RE.source, "g"),
    '<a href="$1" target="_blank" rel="noreferrer" class="text-leaf underline underline-offset-2 [overflow-wrap:anywhere]">$1</a>'
  );
}

/**
 * A question, printed above each of its answers. Not a heading and not in the
 * heading face: the direction's first deliberate break of the type scale
 * (section 4), because a heading here would make thirteen sections of one
 * question. A pin is a quoted message, and it is built to be read past.
 */
function QuestionPin({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="state-layer relative block w-full rounded-[var(--radius-sm)] py-[2px] pl-[10px] text-left transition-colors duration-150 active:scale-[0.995] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[3px] rounded-[2px] bg-cinnamon" />
      {/* The thumb's 44px, grown around the pin rather than inside it, so a
          one-line pin keeps its 22px box in the layout (GuideDoor's trick). */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-11 -translate-y-1/2" />
      <span className="block text-[13.5px] font-semibold leading-[1.35] text-muted-foreground">{text}</span>
    </button>
  );
}

/** A drawing of the shared LoveButton at md, plus the comments control. The
 *  real one needs a server action, which a sketch has none of. */
function MetaRow({ entry }: { entry: SketchEntry }) {
  return (
    <div className="-ml-2.5 mt-[6px] flex items-center gap-3">
      <span className="state-layer inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5">
        <Heart
          className="h-[18px] w-[18px]"
          strokeWidth={1.9}
          style={entry.lovedByViewer ? { fill: HEART_RED, color: HEART_RED } : undefined}
        />
        {entry.loveCount > 0 && (
          <span className="text-[14px] tabular-nums text-muted-foreground">{entry.loveCount}</span>
        )}
      </span>
      <span className="text-[14px] text-muted-foreground">
        {entry.commentCount > 0
          ? `${entry.commentCount} ${entry.commentCount === 1 ? "comment" : "comments"}`
          : "Comment"}
      </span>
    </div>
  );
}

/* INVENTED. Every `entry.song` in this Round is null: nothing was ever
   resolved, so the four answers carrying a music link have no title, artist or
   art in the database. The card is the direction's (2.10) and its shape is
   real; this pair of strings, and the art square standing in for a cover, are
   made up. The source mark and the link itself are read from the URL. */
const INVENTED_SONG = { title: "Aanandha Yaazhai", artist: "Sean Roldan" };

function SongCard({ url }: { url: string }) {
  const source = /youtu/i.test(url) ? "YouTube" : "Spotify";
  return (
    <div className="mt-[10px] flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-background/60 p-2.5">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-mist">
        <Music className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-foreground">{INVENTED_SONG.title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{INVENTED_SONG.artist}</span>
        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {source} &#8599;
        </span>
      </span>
    </div>
  );
}

type Framed = StoredPhoto & { src: string };

/** One photograph on the single-photograph rule; two or three in justified
 *  rows. The direction asks for `PhotoCarousel` above two, which a static
 *  drawing cannot swipe, so `PhotoRows` stands in and every photograph is
 *  visible at once instead of one of three. */
function Photographs({ entry }: { entry: SketchEntry }) {
  if (entry.images.length === 0) return null;
  const cells = entry.images.map((src, i) => ({ src, photo: entry.photos[i] ?? null }));
  const measured = cells.filter((c): c is { src: string; photo: StoredPhoto } => c.photo !== null);

  if (cells.length > 1 && measured.length === cells.length) {
    const photos: Framed[] = measured.map((c) => ({ ...c.photo, src: c.src }));
    return (
      <div className="mt-[10px]">
        <PhotoRows photos={photos} gap={8} columnSizes={PHOTO_SIZES} keyOf={(p) => p.src}>
          {(photo, _i, cell) => (
            <img
              src={photo.src}
              alt=""
              loading="lazy"
              className="w-full rounded-[var(--radius-md)] object-cover"
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

  return (
    <div className="mt-[10px] flex flex-col gap-2">
      {cells.map((c) => (
        <PhotoFrame
          key={c.src}
          src={c.src}
          photo={c.photo}
          sizes={PHOTO_SIZES}
          className="rounded-[var(--radius-md)]"
        />
      ))}
    </div>
  );
}

/** Pin, body, whatever came with it, meta row. There is no answer tile: the
 *  run is the tile, and this is a block inside it. */
function Answer({ pin }: { pin: Pin }) {
  const { entry, question } = pin;
  const body = entry.body?.trim() ?? "";
  const link = body.match(URL_RE)?.[0] ?? null;
  const music = link && MUSIC_RE.test(link) ? link : null;
  const faces = body.length > 0 && EMOJI_ONLY.test(body);

  return (
    <div>
      <QuestionPin text={question.text} />
      {body && (
        <p
          className={cn(
            "mt-[8px] whitespace-pre-wrap break-words text-foreground",
            faces ? "text-[1.75rem] leading-[1.2]" : "text-[15px] leading-[1.7]"
          )}
          dangerouslySetInnerHTML={{ __html: bodyHtml(body) }}
        />
      )}
      <Photographs entry={entry} />
      {music && <SongCard url={music} />}
      <MetaRow entry={entry} />
    </div>
  );
}

/* ── the run, the day marker, the roll ──────────────────────────────── */

function RunCard({ run, viewport }: { run: Run; viewport: SketchViewport }) {
  const started = run.pins[0].entry.createdAt;
  const stamp = viewport === "phone" ? clockTime(started) : `${shortStamp(started)}, ${clockTime(started)}`;
  return (
    <article className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
      <div className="flex items-start justify-between gap-3">
        <IdentityRow
          user={run.author}
          avatarSize="sm"
          name={<span className="text-[16px] font-semibold leading-none text-foreground">{run.author.name}</span>}
          meta={run.author.batchLine}
          className="min-w-0"
        />
        <span className="shrink-0 pt-[4px] text-[12.5px] text-muted-foreground">
          {metaLine(stamp, run.cameBack && "came back")}
        </span>
      </div>
      <div className="mt-[16px] flex flex-col gap-[16px]">
        {run.pins.map((pin) => (
          <Answer key={pin.entry.id} pin={pin} />
        ))}
      </div>
    </article>
  );
}

/** A pill on the page, not a control. Mist, 24px tall, 12px side padding. */
function DayPill({ text, caps = true }: { text: string; caps?: boolean }) {
  return (
    <div className="flex justify-center">
      <span
        className={cn(
          "inline-flex h-6 items-center rounded-full bg-mist px-3 text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground",
          caps && "uppercase"
        )}
      >
        {text}
      </span>
    </div>
  );
}

function RollChip({ person, arrived }: { person: SketchPerson; arrived: string }) {
  return (
    <span className="mr-[14px] inline-flex items-center gap-[6px] align-middle">
      <BirdAvatar user={person} size={22} />
      <span className="text-[13.5px] font-semibold text-foreground">{person.name}</span>
      <span className="text-[11.5px] text-muted-foreground">
        {shortWeekday(arrived)} {clockTime(arrived)}
      </span>
    </span>
  );
}

function Masthead({ round, transcript, viewport }: { round: SketchRound; transcript: Transcript; viewport: SketchViewport }) {
  const { roll, days } = transcript;
  const shown = viewport === "phone" ? roll.slice(0, 4) : roll;
  const hidden = roll.length - shown.length;
  return (
    <header>
      <h1
        className={cn(
          "font-heading tracking-[-0.025em] text-foreground",
          viewport === "phone" ? "text-[1.9rem] leading-[1.05]" : "text-[2.3rem] leading-[1.05]"
        )}
      >
        {round.catchupName}
      </h1>
      <p className="mt-[10px] text-[14px] text-muted-foreground">
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      <p className="mt-[16px] leading-[28px]">
        <span className="mr-[14px] text-[13.5px] text-muted-foreground">
          {roll.length} wrote in over {spell(days.length)} days,
        </span>
        {shown.map((r) => (
          <RollChip key={r.person.id} person={r.person} arrived={r.at} />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            className="rounded-[var(--radius-sm)] text-[13.5px] font-semibold text-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            and {hidden} others
          </button>
        )}
      </p>
      <p className="mt-[10px] text-[12.5px] italic text-muted-foreground">Times are the valley&#39;s.</p>
    </header>
  );
}

/** The close: a pill, the one line of feeling this page spends, the arithmetic
 *  of who was first and last, and what happens next. */
function CloseOfTheRound({ round, transcript }: { round: SketchRound; transcript: Transcript }) {
  const { roll, pins, days } = transcript;
  const first = roll[0];
  const last = pins[pins.length - 1];
  const cadenceWord =
    round.cadence === "biweekly" ? "every fortnight" : round.cadence === "quarterly" ? "every quarter" : "every month";
  return (
    <div className="flex flex-col items-center text-center">
      <DayPill caps={false} text={`${longDay(round.publishedAt)}, ${clockTime(round.publishedAt)}`} />
      <h2 className="mt-[16px] font-heading text-[1.5rem] leading-[1.2] text-foreground">
        That was Round {round.number}.
      </h2>
      <p className="mt-[10px] max-w-[36ch] text-[14.5px] leading-[1.5] text-muted-foreground">
        {roll.length} wrote in over {spell(days.length)} days. {firstName(first.person.name)} was first, on{" "}
        {weekday(first.at)} {partOfDay(first.at)}. {firstName(last.entry.author.name)} was last, at{" "}
        {clockTime(last.entry.createdAt)} on {dayAndMonth(last.entry.createdAt)}.
      </p>
      <p className="mt-[16px] text-[14.5px] text-foreground">
        {round.nextOpensAt
          ? `Round ${round.number + 1} opens on ${formatDisplayDateLong(round.nextOpensAt)}.`
          : `Round ${round.number + 1} opens ${cadenceWord}.`}
      </p>
    </div>
  );
}

/* ── the navigator ──────────────────────────────────────────────────── */

/**
 * The bar along the bottom: the way up on the left, the way around on the
 * right. Break 3 of the design system (section 4), and the direction owns it:
 * nothing else in this app lives at the thumb, so it takes its material from
 * the system (glass, the hairline, the leaf marker in the sheet) and its
 * position from the Action Button argument.
 */
function Navigator({
  catchupName,
  question,
  author,
  position,
  total,
  open = false,
  className,
}: {
  catchupName: string;
  question: string;
  author: string;
  position: number;
  total: number;
  open?: boolean;
  className?: string;
}) {
  const Chevron = open ? ChevronDown : ChevronUp;
  return (
    <div
      className={cn("glass border-t border-border", className)}
      style={{ paddingBottom: BAR_INSET }}
    >
      <div className="flex items-stretch" style={{ height: BAR_H }}>
        <div className="state-layer flex w-[112px] shrink-0 items-center gap-1 px-3">
          <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={2.5} />
          <span className="truncate text-[13px] font-semibold text-foreground">{catchupName}</span>
        </div>
        <span aria-hidden className="my-auto h-5 w-px shrink-0 bg-border" />
        <div className="state-layer flex min-w-0 flex-1 items-center gap-1 pl-[14px] pr-1">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-[1.3] text-foreground">{question}</span>
            <span className="mt-[2px] block truncate text-[11.5px] leading-[1.3] text-muted-foreground">
              {metaLine(author, `${position} of ${total}`)}
            </span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <Chevron className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** The first line of an answer, which is what makes the sheet worth opening:
 *  for the one-liner questions it is the whole answer, so the sheet reads as
 *  the list of punchlines the transcript cannot give. */
function firstLine(entry: SketchEntry): string {
  const body = entry.body?.trim() ?? "";
  if (!body) return entry.images.length > 0 ? `${entry.images.length} photographs` : "";
  return body.split("\n")[0].trim();
}

/* ── the phone screen both 844px frames are cut from ────────────────── */

/**
 * The mid-scroll page, at 60% of the Round.
 *
 * ARITHMETIC, not taste: 0.6 x 133 = 79.8, and the answer to question 5
 * (`round.questions[4]`) nearest that place in the transcript is the 80th,
 * which falls in the fifteenth run. Everything on the screen follows from
 * that run and its neighbours.
 *
 * The run card's earlier answers, and its header, are above the top of the
 * screen. The answer before question 5's carried a photograph, so what the
 * screen opens on is the tail of that photograph cut by the screen edge, then
 * its meta row: exactly the state the direction's "mid-scroll screen at 390"
 * describes.
 */
function midScrollPlace(round: SketchRound, transcript: Transcript) {
  const target = 0.6 * transcript.pins.length;
  /* questions[4] is the prompt at position 4, since the view orders sections by
     position. A database without this Round (the demo's) may have fewer than
     five questions or none answered, so both fall back to the whole list. */
  const fifth = round.questions[4] ?? round.questions[0];
  const candidates = transcript.pins.filter((p) => p.question.id === fifth?.id);
  const anchor = (candidates.length > 0 ? candidates : transcript.pins).reduce((best, p) =>
    Math.abs(p.position - target) < Math.abs(best.position - target) ? p : best
  );
  const run = transcript.runs.find((r) => r.pins.some((p) => p.entry.id === anchor.entry.id));
  const pins = run ? run.pins : [anchor];
  const index = pins.findIndex((p) => p.entry.id === anchor.entry.id);
  return { anchor, run, before: index > 0 ? pins[index - 1] : null, after: pins.slice(index + 1) };
}

/** The height of the clipped photograph at the top of the screen. Chosen so
 *  the pin for question 5 lands at y=240 and the reading line (40% of 844,
 *  y=337) falls inside its body, which is what puts that question in the bar. */
const TAIL_H = 132;

function MidScrollPage({ round, transcript }: { round: SketchRound; transcript: Transcript }) {
  const { anchor, before, after } = midScrollPlace(round, transcript);
  const tail = before && before.entry.images.length > 0 ? before.entry.images[0] : null;
  return (
    <div className="absolute inset-x-0 bottom-0 top-14 overflow-hidden">
      <div className="px-5">
        <div className="rounded-b-[var(--radius)] border border-t-0 border-border bg-card px-[var(--space-m)] pb-[var(--space-m)]">
          {before && (
            <div>
              {tail ? (
                <div className="overflow-hidden rounded-b-[var(--radius-md)]" style={{ height: TAIL_H }}>
                  <img src={tail} alt="" className="h-full w-full object-cover object-bottom" />
                </div>
              ) : (
                <div className="flex flex-col justify-end overflow-hidden" style={{ height: TAIL_H }}>
                  <p
                    className="whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-foreground"
                    dangerouslySetInnerHTML={{ __html: bodyHtml(before.entry.body?.trim() ?? "") }}
                  />
                </div>
              )}
              <MetaRow entry={before.entry} />
            </div>
          )}
          <div className="mt-[16px] flex flex-col gap-[16px]">
            <Answer pin={anchor} />
            {after.map((pin) => (
              <Answer key={pin.entry.id} pin={pin} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── the three drawings ─────────────────────────────────────────────── */

function TranscriptColumn({
  round,
  transcript,
  viewport,
}: {
  round: SketchRound;
  transcript: Transcript;
  viewport: SketchViewport;
}) {
  const runs = transcript.runs.slice(0, 3);
  const omitted = transcript.runs.length - runs.length;
  return (
    <>
      <Masthead round={round} transcript={transcript} viewport={viewport} />
      {runs.map((run, i) => (
        <div key={run.pins[0].entry.id}>
          {marksDay(transcript.runs, i) && (
            <div style={{ paddingTop: SP.l, paddingBottom: SP.l }}>
              <DayPill text={longDay(run.pins[0].entry.createdAt)} />
            </div>
          )}
          <div style={{ marginTop: marksDay(transcript.runs, i) ? 0 : SP.l }}>
            <RunCard run={run} viewport={viewport} />
          </div>
        </div>
      ))}
      {omitted > 0 && (
        <p className="mt-[26px] text-center text-[12.5px] italic text-muted-foreground">
          The other {omitted} runs are not drawn in this sketch.
        </p>
      )}
      <div style={{ marginTop: SP.xl }}>
        <CloseOfTheRound round={round} transcript={transcript} />
      </div>
    </>
  );
}

/** The rail at 1512: the way up, the eleven questions with their counts and
 *  the leaf marker on the one at the reading line, and "Arrived", which is
 *  navigation by person and the thing only a transcript can offer. */
function Rail({ round, transcript }: { round: SketchRound; transcript: Transcript }) {
  const current = transcript.pins[0].question.id;
  const first = transcript.roll[0];
  const last = transcript.pins[transcript.pins.length - 1];
  return (
    <div>
      <p className="text-[15px] font-semibold text-foreground">{round.catchupName}</p>
      <p className="mt-[4px] text-[12.5px] text-muted-foreground">
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>

      <p className={cn(RAIL_LABEL, "mt-[26px]")}>In this Round</p>
      <ul className="mt-[10px]">
        {round.questions.map((question) => {
          const here = question.id === current;
          return (
            <li key={question.id} className="relative flex items-start gap-3 py-[6px] pl-[10px]">
              {here && (
                <span aria-hidden className="absolute bottom-[6px] left-0 top-[6px] w-[2px] rounded-full bg-leaf" />
              )}
              <span
                className={cn(
                  "line-clamp-2 min-w-0 flex-1 text-[13px] leading-[1.35]",
                  here ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {question.text}
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {question.entries.length}
              </span>
            </li>
          );
        })}
      </ul>

      <p className={cn(RAIL_LABEL, "mt-[26px]")}>Arrived</p>
      <button
        type="button"
        className="state-layer mt-[10px] w-full rounded-[var(--radius-sm)] py-[6px] pl-[10px] pr-2 text-left text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {transcript.roll.length}, {firstName(first.person.name)} first and{" "}
        {firstName(last.entry.author.name)} last &#8250;
      </button>
    </div>
  );
}

function Reader({ round, viewport }: SketchProps) {
  const transcript = readTranscript(round);

  if (viewport === "laptop") {
    return (
      <DesktopShell>
        <div className="mx-auto flex w-[1028px] items-start gap-[30px]">
          <div className="w-[680px] shrink-0">
            <TranscriptColumn round={round} transcript={transcript} viewport="laptop" />
          </div>
          {/* 6px, so the rail's 15px first line sits on the masthead's cap
              line rather than on its ascender. The direction's `top: 32px` is
              the main column's own py-8, which DesktopShell already gives. */}
          <div className="w-[318px] shrink-0 pt-[6px]">
            <Rail round={round} transcript={transcript} />
          </div>
        </div>
      </DesktopShell>
    );
  }

  /* The bar would be fixed on a real phone. On the tall page it is drawn once,
     at the foot, in the state it holds at the last answer this sketch draws:
     the thirteenth of 133, which is also how far in the three runs reach. */
  const drawn = transcript.runs.slice(0, 3);
  const lastRun = drawn[drawn.length - 1];
  const lastDrawn = lastRun.pins[lastRun.pins.length - 1];
  return (
    <div className="bg-background">
      <PhoneBar position="sticky" />
      <div className="px-5" style={{ paddingTop: SP.l, paddingBottom: SP.xl }}>
        <TranscriptColumn round={round} transcript={transcript} viewport="phone" />
      </div>
      <Navigator
        catchupName={round.catchupName}
        question={lastDrawn.question.text}
        author={lastDrawn.entry.author.name}
        position={lastDrawn.position}
        total={transcript.pins.length}
      />
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const transcript = readTranscript(round);
  const { anchor } = midScrollPlace(round, transcript);
  return (
    <div className="h-full bg-background">
      <PhoneBar position="absolute" />
      <MidScrollPage round={round} transcript={transcript} />
      <Navigator
        className="absolute inset-x-0 bottom-0"
        catchupName={round.catchupName}
        question={anchor.question.text}
        author={anchor.entry.author.name}
        position={anchor.position}
        total={transcript.pins.length}
      />
    </div>
  );
}

/** 70% of 844. The sheet is as tall as its list up to this, and the expanded
 *  question's thirteen pins are taller, so it stops here and scrolls inside. */
const SHEET_H = 590;

function NavigatorOpen({ round }: { round: SketchRound }) {
  const transcript = readTranscript(round);
  const { anchor } = midScrollPlace(round, transcript);
  const question = anchor.question;
  /* THE EXPANDED STATE. The sheet's resting state is the eleven questions with
     their counts; pressing one folds the others away above "All questions" and
     shows that question's pins, one per answer, in transcript order. This
     draws the expanded state, on question 5, because the resting list is a
     table of contents every direction has and this is the part only this one
     has: thirteen first lines under one question. */
  const pins = transcript.pins.filter((p) => p.question.id === question.id);
  return (
    <div className="h-full bg-background">
      <PhoneBar position="absolute" />
      <MidScrollPage round={round} transcript={transcript} />

      {/* Nonmodal: no backdrop, the page still shows above it and still
          scrolls under it. The bar stays below the sheet with its chevron
          turned down, which is one of the three ways out. */}
      <div
        className="card-elevated absolute inset-x-0 overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-float"
        style={{ bottom: BAR_TOTAL, height: SHEET_H }}
      >
        <div className="flex justify-center pt-2">
          <span aria-hidden className="h-[5px] w-9 rounded-full bg-muted-foreground/40" />
        </div>
        <div className="px-5 pb-5 pt-2">
          <h2 className="font-heading text-[1.25rem] leading-[1.2] text-foreground">
            {round.questions.length} questions
          </h2>
          <button
            type="button"
            className="mt-2 rounded-[var(--radius-sm)] text-[13px] font-semibold text-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            &#8249; All questions
          </button>

          <div className="relative mt-3 pl-[10px]">
            {/* The current question, marked the way the sidebar marks a row. */}
            <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[2px] rounded-full bg-leaf" />
            <p className="text-[15px] font-semibold leading-[1.35] text-foreground">{question.text}</p>
            {question.showAsker && question.asker && (
              <p className="mt-1 text-[11.5px] text-muted-foreground">asked by {firstName(question.asker.name)}</p>
            )}
          </div>

          <ul className="mt-2">
            {pins.map((pin) => (
              /* The row's tint reaches the sheet's padding edge, so it reads
                 as a row of the sheet rather than a chip inside it. */
              <li key={pin.entry.id} className="state-layer -mx-2 flex h-11 items-center gap-[10px] rounded-[var(--radius-sm)] px-2">
                <BirdAvatar user={pin.entry.author} size={28} />
                {/* Truncated at 40% of the row under pressure (section 7), so a
                    78-character name never eats the first line beside it. */}
                <span className="max-w-[40%] shrink-0 truncate text-[13px] font-semibold text-foreground">
                  {pin.entry.author.name}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                  {firstLine(pin.entry)}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {shortWeekday(pin.entry.createdAt)} {clockTime(pin.entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Navigator
        className="absolute inset-x-0 bottom-0"
        catchupName={round.catchupName}
        question={anchor.question.text}
        author={anchor.entry.author.name}
        position={anchor.position}
        total={transcript.pins.length}
        open
      />
    </div>
  );
}

export const transcript: SketchDirection = {
  slug: "transcript",
  name: "As it arrived",
  thesis:
    "A Round reads in the order people wrote in, as one transcript with each question pinned beside its answer, so the story of the fortnight carries the reading and the questions become the way to move rather than the way to read.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
