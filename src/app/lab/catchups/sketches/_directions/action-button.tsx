/* ------------------------------------------------------------------ *
 *  Direction 09, "The bar is the question" (action-button).
 *
 *  Drawn from docs/planning/catchups-rework/directions/09-action-button.md
 *  section 3, "The reader, precisely", which is the only part of that
 *  document this file implements. Where the direction gives a number it is
 *  followed to the pixel; where it is silent the choice is marked JUDGMENT.
 *
 *  The bet, in one paragraph so a reader of this file does not need the
 *  document: the 56px green bar at the top of every phone page grows into
 *  a Canopy PLATE that carries the Round's masthead, and when the plate
 *  leaves upward its 56px foot stays behind holding the question you are
 *  reading, with eleven ticks along its bottom edge. Every question after
 *  the first is another plate, so the bar is always a question's foot. The
 *  answers run on paper under it with no cards and no boxes.
 *
 *  Static, as the cull asks (../_types.ts). The three things that must be
 *  live to be judged -- the foot's cross-fade as the masthead leaves, the
 *  horizontal drag between questions, and the bar growing into the
 *  contents -- are drawn here as the states either side of the move:
 *  Reader is the plate at full size, MidScroll is the bar resting, and
 *  NavigatorOpen is the bar already grown to the whole screen.
 *
 *  TWO TRAPS THIS FILE WORKS AROUND, both structural:
 *
 *  1. SPACING. Every --space-* token is em-based, so it only lands on the
 *     direction's numbers (xxs 4, xs 6, s 10, m 16, l 26, xl 42, xxl 68)
 *     on a box whose own font-size is 16px. A token on a 30px heading is
 *     nearly twice the gap it names. So every gap in this file goes on a
 *     <Gap>, which resets to 16px and holds the sized child inside it.
 *
 *  2. THE FRAME. The harness scales the drawing with a CSS transform, so
 *     `vw` units and Tailwind's sm:/lg: prefixes both answer to the real
 *     window rather than to the 390 or 1512 being drawn. Every size here
 *     is resolved by hand and branched on the `viewport` prop, including
 *     the display rung, which is clamp(1.9rem, 5vw, 2.6rem) = 30px at 390
 *     and 41.6px at 1512.
 * ------------------------------------------------------------------ */

import { Fragment, type ReactNode } from "react";
import {
  ChevronLeft,
  Feather,
  Heart,
  Images,
  Info,
  MessagesSquare,
  Newspaper,
  Notebook,
  Play,
  X,
} from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows, PhotoStream } from "@/components/common/photo-rows";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import type {
  SketchDirection,
  SketchEntry,
  SketchPerson,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "../_types";

/* ---------- the numbers the direction names ----------------------- */

/** One promise for both measures: 390 full-bleed on the phone, 680 in the
 *  desktop column. */
const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** "label 12px uppercase with 0.1em tracking, which this document calls
 *  label caps". The weight is not given; semibold is what carries 12px
 *  white at 70% on Canopy without dissolving. JUDGMENT. */
const LABEL = "text-[12px] font-semibold uppercase tracking-[0.1em]";

/** The display rung resolved by hand (see trap 2 at the top). */
const DISPLAY = { phone: 30, laptop: 41.6 } as const;

/** Eight names, then "and N others" (section 2.6, "In each"). The desktop
 *  first-screen paragraph draws all thirteen "in two lines" instead, and
 *  both readings are right for their own measure: eight names fill three
 *  lines at 390 and thirteen fit two or three in the 680 column. So the cap
 *  is the phone's and the laptop prints everyone. JUDGMENT, resolving a
 *  conflict inside the direction. */
const NAMES_SHOWN = { phone: 8, laptop: Number.MAX_SAFE_INTEGER } as const;

/** Under this, an answer with no photograph and no link is set in
 *  Baskerville h3 rather than body (break 5). */
const SHORT_ANSWER_CHARS = 48;

/** The direction's own line counts: "about 47 characters a line" in the
 *  358px phone measure, and 2,000 characters over 24 lines in the 680
 *  column. Used only to guess where the last line ends; see END_MARK. */
const CHARS_PER_LINE = { phone: 47, laptop: 83 } as const;

/** The end mark needs "140px free at its right". At the phone's ~7.6px a
 *  character that is 19; the wider column spends ~8.2px a character, so
 *  the same 140px is 17. */
const END_MARK_CHARS = { phone: 19, laptop: 17 } as const;

/** Tailwind reads class names as literal text, so a token gap cannot be
 *  built from a template string. One literal per rung. */
const GAP = {
  xxs: "mt-[var(--space-xxs)]",
  xs: "mt-[var(--space-xs)]",
  s: "mt-[var(--space-s)]",
  m: "mt-[var(--space-m)]",
  l: "mt-[var(--space-l)]",
  xl: "mt-[var(--space-xl)]",
  xxl: "mt-[var(--space-xxl)]",
} as const;

/** A gap that ignores its child's font size (trap 1 at the top). */
function Gap({
  size,
  className,
  children,
}: {
  size: keyof typeof GAP;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(GAP[size], "text-[16px]", className)}>{children}</div>;
}

/* ---------- links, and the record a card is drawn from ------------- */

const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const URL_FIND = /https?:\/\/[^\s]+/g;

const MUSIC_HOSTS: Record<string, string> = {
  "open.spotify.com": "Spotify",
  "spotify.link": "Spotify",
  "music.apple.com": "Apple Music",
  "youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "soundcloud.com": "SoundCloud",
  "music.youtube.com": "YouTube Music",
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "open.spotify.com/track/4uL…": the host and the first characters of the
 *  path, which is how every pasted link prints (section 7, the 123-character
 *  link). The whole URL rides along in a title, since nothing here navigates. */
function linkLabel(url: string): string {
  const host = hostOf(url);
  if (!host) return url;
  let rest = "";
  try {
    const u = new URL(url);
    rest = `${u.pathname}${u.search}`;
  } catch {
    rest = "";
  }
  if (rest === "/") rest = "";
  return rest.length > 11 ? `${host}${rest.slice(0, 10)}…` : `${host}${rest}`;
}

function linksIn(body: string): string[] {
  return body.match(URL_FIND) ?? [];
}

type CardSong = { source: string; title: string; artist: string; art: string | null };

/** INVENTED, every word. `entry.song` is null on every answer in this Round
 *  -- nobody used the song control, the links are pasted into the words --
 *  so a card has no title or artist to draw from. These four are the
 *  direction's own worked example plus three more in its shape, picked by a
 *  hash of the answer's id so two cards on one screen are not the same
 *  record. Nothing here comes from a member. */
const INVENTED_RECORDS = [
  { title: "Pasoori", artist: "Ali Sethi, Shae Gill" },
  { title: "Aaoge Tum Kabhi", artist: "The Local Train" },
  { title: "Kesariya", artist: "Arijit Singh" },
  { title: "Bandeya", artist: "Prateek Kuhad" },
] as const;

function inventedRecord(id: string): (typeof INVENTED_RECORDS)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return INVENTED_RECORDS[h % INVENTED_RECORDS.length];
}

/** The card is made from the first music or video link in the answer
 *  (section 2.10). A link nothing recognises gets no card and stays in the
 *  sentence as the member typed it. */
function songCardOf(entry: SketchEntry): { url: string; card: CardSong } | null {
  const links = linksIn(entry.body ?? "");
  const url = links.find((u) => {
    const h = hostOf(u);
    return h ? h in MUSIC_HOSTS : false;
  });
  if (!url) return null;
  const source = MUSIC_HOSTS[hostOf(url) ?? ""] ?? "";
  const invented = inventedRecord(entry.id);
  return {
    url,
    card: {
      source,
      title: entry.song?.title ?? invented.title,
      artist: entry.song?.title ? "" : invented.artist,
      art: entry.song?.art ?? null,
    },
  };
}

/** "A second link in the same answer becomes a chip." JUDGMENT: the first
 *  link is never a chip (it is in the sentence, and it is usually the card);
 *  every later link that is not the card is, whether or not a card exists.
 *  The direction only writes the case where a card is there. */
function chipLinks(entry: SketchEntry, cardUrl: string | null): string[] {
  const links = linksIn(entry.body ?? "");
  return links.slice(1).filter((u) => u !== cardUrl);
}

/* ---------- small derivations ------------------------------------- */

function photoCount(question: SketchQuestion): number {
  return question.entries.filter((e) => e.images.length > 0).length;
}

/** "13 ANSWERS · 4 WITH PHOTOS · ASKED BY NIKHIL BOSE", CSS-uppercased.
 *  The asker is dropped when the question was asked anonymously, and the
 *  wall segment appears only where a wall is actually drawn. */
function answersLine(question: SketchQuestion): string {
  const n = question.entries.length;
  const answers = n === 0 ? "No answers" : `${n} answer${n === 1 ? "" : "s"}`;
  const photos = photoCount(question);
  return metaLine(
    answers,
    question.kind === "photo" ? "a photo wall" : photos > 0 ? `${photos} with photos` : null,
    question.showAsker && question.asker ? `asked by ${question.asker.name}` : null
  );
}

function counter(index: number, total: number): string {
  return `${index + 1} of ${total}`;
}

function totalsOf(round: SketchRound): { answers: number; hearts: number } {
  let answers = 0;
  let hearts = 0;
  for (const q of round.questions) {
    for (const e of q.entries) {
      answers += 1;
      hearts += e.loveCount;
    }
  }
  return { answers, hearts };
}

/** ES2017 is the target, so \p{Extended_Pictographic} is not available: a
 *  codepoint floor instead. Everything a keyboard types sits below U+2000. */
function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  for (const ch of t) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x2000 && !/\s/.test(ch)) return false;
  }
  return true;
}

/** JUDGMENT, and the one number in this file nothing can know statically:
 *  whether the answer's LAST line has 140px free at its right. Nothing that
 *  has not been laid out can say where a line breaks, so this estimates it
 *  from the direction's own characters-per-line and only CHOOSES between the
 *  two layouts. The placement itself is left to the browser: the end mark is
 *  a right float at the end of the paragraph, so when the estimate is wrong
 *  the mark drops to its own line and right-aligns rather than landing on
 *  top of a word. */
function lastLineHasRoom(body: string, viewport: SketchViewport): boolean {
  const cpl = CHARS_PER_LINE[viewport];
  const lastParagraph = body.split(/\n+/).pop() ?? body;
  const remainder = lastParagraph.length % cpl;
  return remainder > 0 && remainder <= cpl - END_MARK_CHARS[viewport];
}

/* ---------- the plate's furniture --------------------------------- */

/** Eleven segments 16px wide and 3px tall, 4px apart, left-aligned, the ones
 *  up to and including the current question white and the rest white at 25%.
 *  Eleven of them measure 216px, which is why they can sit inside the phone's
 *  16px padding and still read as a whole Round. */
function Ticks({ current, total, className }: { current: number; total: number; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-[3px] w-4 rounded-[1px]", i <= current ? "bg-white" : "bg-white/25")} />
      ))}
    </div>
  );
}

/** The foot: 56px of green, the last thing on every plate, and the thing
 *  that stays behind as the bar when the plate leaves. */
function PlateFoot({ line, current, total }: { line: string; current: number; total: number }) {
  return (
    <div className="relative mt-[var(--space-xs)] h-14">
      <span className={cn(LABEL, "absolute left-0 top-[9px] leading-[14px] text-white/70")}>{line}</span>
      <Ticks current={current} total={total} className="absolute inset-x-0 bottom-0" />
    </div>
  );
}

/** The way home, printed on every plate: "‹ IN THE LOOP", one target. */
function WayHome({ round, withRound = false }: { round: SketchRound; withRound?: boolean }) {
  return (
    <span className={cn(LABEL, "inline-flex items-center gap-0.5 text-white/70")}>
      <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      {withRound ? metaLine(round.catchupName, `Round ${round.number}`) : round.catchupName}
    </span>
  );
}

/** The navigator at rest. Everything the direction puts on it is printed at
 *  a stated y: the eyebrow 9 to 23, the question 27 to 47, the ticks 53 to
 *  56, so it is drawn by absolute position rather than by a stack. */
function RestingBar({ round, index, className }: { round: SketchRound; index: number; className?: string }) {
  const question = round.questions[index];
  return (
    <div className={cn("h-14 bg-canopy px-4 text-[16px] text-white", className)}>
      <div className="relative h-full">
        <span className={cn(LABEL, "absolute left-0 top-[9px] leading-[14px] text-white/70")}>
          {metaLine(round.catchupName, `Round ${round.number}`)}
        </span>
        <span className={cn(LABEL, "absolute right-0 top-[9px] leading-[14px] tabular-nums text-white/70")}>
          {counter(index, round.questions.length)}
        </span>
        {/* "cut by word with an ellipsis" wants a measurement; CSS cuts by
            character instead, which at one line reads the same. JUDGMENT. */}
        <span className="absolute inset-x-0 top-[27px] block truncate text-[15px] font-medium leading-5">
          {question.text}
        </span>
        <Ticks current={index} total={round.questions.length} className="absolute inset-x-0 bottom-0" />
      </div>
    </div>
  );
}

/** Who wrote in, run on like a sentence and wrapped, every name carrying its
 *  bird. Eight, then "and N others" -- never a bird alone (section 2.6). */
function Writers({
  people,
  viewport,
  size = 20,
  className,
}: {
  people: SketchPerson[];
  viewport: SketchViewport;
  size?: number;
  className?: string;
}) {
  const shown = people.slice(0, NAMES_SHOWN[viewport]);
  const rest = people.length - shown.length;
  return (
    <p className={cn("text-[15px] leading-[1.75]", className)}>
      {shown.map((person, i) => {
        const isLast = i === shown.length - 1;
        return (
          <Fragment key={person.id}>
            {i > 0 ? (isLast && rest === 0 ? " and " : " ") : null}
            {/* The name and its bird never split across a line; the space
                that allows a break sits outside this span. */}
            <span className="whitespace-nowrap">
              {/* -6px, not `align-middle`: it drops a 20px bird's baseline
                  6px under the 15px line's, which centres the glyph on the
                  words instead of hanging it off their tops. */}
              <span className="mr-1.5 inline-block" style={{ verticalAlign: "-6px" }}>
                <BirdAvatar user={person} size={size} />
              </span>
              {person.name}
              {isLast || (rest === 0 && i === shown.length - 2) ? "" : ","}
            </span>
          </Fragment>
        );
      })}
      {rest > 0 ? ` and ${rest} others` : null}
    </p>
  );
}

/* ---------- the plates -------------------------------------------- */

/** The masthead: the cover at full size, green from the top edge of the
 *  phone. 44 + 10 + 35 + 4 + 20 + 16 + names + 26 + question + 6 + 56 is
 *  the direction's "about 350px tall". */
function Masthead({ round, viewport }: SketchProps) {
  const question = round.questions[0];
  const total = round.questions.length;
  const date = formatDisplayDateLong(round.publishedAt);

  if (viewport === "laptop") {
    /* No eyebrow row, because the rail carries the name; the counter sits
       alone at the top right, and there is no foot, because the rail is the
       progress. 40 at the sides, 32 at the top, and the plate ends 32px
       under the answers line. */
    return (
      <header className="rounded-[var(--radius)] bg-canopy px-10 pb-8 pt-8 text-[16px] text-white">
        <div className="flex justify-end">
          <span className={cn(LABEL, "tabular-nums text-white/70")}>{counter(0, total)}</span>
        </div>
        <Gap size="s">
          <h1
            className="font-heading leading-[1.08] tracking-[-0.025em]"
            style={{ fontSize: DISPLAY.laptop }}
          >
            Round {round.number}
          </h1>
        </Gap>
        <Gap size="xxs">
          <p className="text-[14px] text-white/80">{date}</p>
        </Gap>
        <Gap size="m">
          <Writers people={round.contributors} viewport="laptop" />
        </Gap>
        <Gap size="l">
          <h2 className="font-heading text-[32px] leading-[1.25] tracking-[-0.02em]">{question.text}</h2>
        </Gap>
        <Gap size="xs">
          <p className={cn(LABEL, "text-white/70")}>{answersLine(question)}</p>
        </Gap>
      </header>
    );
  }

  return (
    <header className="bg-canopy px-4 text-[16px] text-white">
      <div className="flex h-11 items-center justify-between gap-3">
        <WayHome round={round} />
        <span className={cn(LABEL, "shrink-0 tabular-nums text-white/70")}>{counter(0, total)}</span>
      </div>
      <Gap size="s">
        <h1 className="font-heading leading-[1.08] tracking-[-0.025em]" style={{ fontSize: DISPLAY.phone }}>
          Round {round.number}
        </h1>
      </Gap>
      <Gap size="xxs">
        <p className="text-[14px] text-white/80">{date}</p>
      </Gap>
      <Gap size="m">
        <Writers people={round.contributors} viewport="phone" />
      </Gap>
      <Gap size="l">
        <h2 className="font-heading text-[24px] leading-[1.3] tracking-[-0.02em]">{question.text}</h2>
      </Gap>
      <PlateFoot line={answersLine(question)} current={0} total={total} />
    </header>
  );
}

/** Every question after the first begins with its own plate. On the phone
 *  20 + 44 + 10 + question + 6 + 56, which is the direction's "about 200px
 *  for a two-line question". */
function QuestionPlate({
  round,
  index,
  viewport,
}: {
  round: SketchRound;
  index: number;
  viewport: SketchViewport;
}) {
  const question = round.questions[index];
  const total = round.questions.length;

  if (viewport === "laptop") {
    /* No foot and no ticks: the rail is the progress. The counter stays,
       because "a number is printed on a plate only as the counter", and it
       is the one thing on the plate that says where in the Round you are
       when the rail has scrolled. JUDGMENT. */
    return (
      <section className="rounded-[var(--radius)] bg-canopy px-10 pb-8 pt-8 text-[16px] text-white">
        <div className="flex justify-end">
          <span className={cn(LABEL, "tabular-nums text-white/70")}>{counter(index, total)}</span>
        </div>
        <Gap size="s">
          <h2 className="font-heading text-[32px] leading-[1.25] tracking-[-0.02em]">{question.text}</h2>
        </Gap>
        <Gap size="xs">
          <p className={cn(LABEL, "text-white/70")}>{answersLine(question)}</p>
        </Gap>
      </section>
    );
  }

  return (
    <section className="bg-canopy px-4 pt-5 text-[16px] text-white">
      <div className="flex h-11 items-center justify-between gap-3">
        <WayHome round={round} withRound />
        <span className={cn(LABEL, "shrink-0 tabular-nums text-white/70")}>{counter(index, total)}</span>
      </div>
      <Gap size="s">
        <h2 className="font-heading text-[24px] leading-[1.3] tracking-[-0.02em]">{question.text}</h2>
      </Gap>
      <PlateFoot line={answersLine(question)} current={index} total={total} />
    </section>
  );
}

/** The end of the Round. The reader's one line of feeling, on a title. */
function EndPlate({ round, viewport }: SketchProps) {
  const { answers, hearts } = totalsOf(round);
  const date = formatDisplayDateLong(round.publishedAt);
  const laptop = viewport === "laptop";
  const nextLine = round.nextOpensAt
    ? `The next Round opens on ${formatDisplayDateLong(round.nextOpensAt)}.`
    : null; /* JUDGMENT: no date set, so the line is absent rather than empty. */

  return (
    <section
      className={cn(
        "bg-canopy text-[16px] text-white",
        laptop ? "rounded-[var(--radius)] px-10 pb-10 pt-8" : "px-4 pt-5"
      )}
    >
      <div className={cn("flex items-center", laptop ? "h-6" : "h-11")}>
        <span className={cn(LABEL, "text-white/70")}>{metaLine(`Round ${round.number}`, date)}</span>
      </div>
      <Gap size="s">
        <p
          className="font-heading leading-[1.08] tracking-[-0.025em]"
          style={{ fontSize: laptop ? DISPLAY.laptop : DISPLAY.phone }}
        >
          That’s everyone.
        </p>
      </Gap>
      <Gap size="xs">
        <p className="leading-[1.65] text-white/80">
          {round.contributors.length} wrote in. {answers} answers, {hearts} hearts.
        </p>
      </Gap>
      {nextLine && (
        <Gap size="m">
          <p className="leading-[1.65]">{nextLine}</p>
        </Gap>
      )}
      <Gap size="l">
        <div className="flex flex-wrap items-center gap-4">
          {/* The on-green pill, break 2: the same shape and the same two
              colours as a Canopy CTA, swapped. */}
          <span className="inline-flex h-10 items-center gap-0.5 rounded-full bg-card pl-3.5 pr-5 text-[15px] font-semibold text-canopy">
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            {round.catchupName}
          </span>
          <span className="text-[15px] text-white/80 underline underline-offset-4">Back to the top</span>
        </div>
      </Gap>
      {!laptop && <div className="h-[26px]" />}
    </section>
  );
}

/* ---------- the answer, which is not a tile ----------------------- */

function IdentityRow({ person, className }: { person: SketchPerson; className?: string }) {
  return (
    <div className={cn("flex min-h-[28px] items-center gap-2.5", className)}>
      <BirdAvatar user={person} size="xs" />
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="text-[15px] font-medium text-foreground">{person.name}</span>
        {person.batchLine && (
          <span className={cn(LABEL, "shrink-0 text-muted-foreground")}>{person.batchLine}</span>
        )}
      </span>
    </div>
  );
}

/** The heart, drawn rather than wired: the real LoveButton needs an action.
 *  20px glyph, 14px tabular count, Heart red when it is yours. */
function HeartMark({ entry }: { entry: SketchEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Heart
        className={cn("h-5 w-5 text-heart", entry.lovedByViewer ? "fill-current" : "fill-none")}
        strokeWidth={2}
        aria-hidden
      />
      <span className="text-[14px] tabular-nums text-foreground/70">{entry.loveCount}</span>
    </span>
  );
}

function commentsLabel(entry: SketchEntry): string {
  if (entry.commentCount === 0) return "Comment";
  return `${entry.commentCount} comment${entry.commentCount === 1 ? "" : "s"}`;
}

/** The actions line on its own: comments at the left, the heart at the
 *  right, 28px tall. */
function ActionsRow({ entry }: { entry: SketchEntry }) {
  return (
    <div className="flex h-7 items-center justify-between gap-4">
      <span className="text-[15px] text-foreground/70">{commentsLabel(entry)}</span>
      <HeartMark entry={entry} />
    </div>
  );
}

/** The end mark: the same two things inside the answer's last line, right
 *  aligned, the way a magazine closes a piece. A right float placed after
 *  all the words, so the browser decides whether the line has room for it
 *  and drops it to its own line when it does not. */
function EndMark({ entry }: { entry: SketchEntry }) {
  return (
    <span className="float-right ml-4 inline-flex h-[26px] items-center gap-3">
      <span className="text-[15px] leading-none text-foreground/70">{commentsLabel(entry)}</span>
      <HeartMark entry={entry} />
    </span>
  );
}

/** The member's words. Splitting the raw text on the URL and sending only
 *  the non-URL runs through renderRichText keeps the one sanitiser between
 *  typing and dangerouslySetInnerHTML; the link itself goes through React,
 *  which escapes it. `flow-root` contains the end mark's float. */
function AnswerWords({
  text,
  className,
  endMark,
}: {
  text: string;
  className?: string;
  endMark?: ReactNode;
}) {
  const parts = text.split(URL_SPLIT);
  return (
    <p className={cn("flow-root whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground", className)}>
      {parts.map((part, i) =>
        // String.split with one capture group alternates: odd indices are links.
        i % 2 === 1 ? (
          <span
            key={i}
            title={part}
            className="text-leaf underline underline-offset-2 [overflow-wrap:anywhere]"
          >
            {linkLabel(part)}
          </span>
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderRichText(part) }} />
        )
      )}
      {endMark}
    </p>
  );
}

/** Full-bleed on the phone with no radius and no border (break 4); 680 wide
 *  at 12px in the desktop column. The gutters are the direction's own: 2px
 *  at 390, where two portraits come out 194 wide, and 6px at 680, where the
 *  same two come out 337. */
function Photos({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  if (entry.images.length === 0) return null;
  const phone = viewport === "phone";
  const shell = cn("mt-[var(--space-s)] overflow-hidden", phone ? "-mx-4" : "rounded-[var(--radius-md)]");

  if (entry.images.length === 1) {
    return (
      <div className={shell}>
        <PhotoFrame
          src={entry.images[0]}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          fallbackClassName="aspect-[4/3]"
        />
      </div>
    );
  }

  const measured =
    entry.photos.length === entry.images.length && entry.photos.every(Boolean)
      ? (entry.photos as StoredPhoto[])
      : null;

  if (!measured) {
    /* Never measured, so there is no shape to solve a row from: the same
       two-up the shipped reader falls back to, rather than a guess that
       would move the page when the bytes land. */
    return (
      <div className={cn(shell, "grid grid-cols-2", phone ? "gap-[2px]" : "gap-1.5")}>
        {entry.images.map((src) => (
          <img key={src} src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ))}
      </div>
    );
  }

  return (
    <PhotoRows photos={measured} gap={phone ? 2 : 6} columnSizes={PHOTO_SIZES} className={shell}>
      {(_photo, i, cell) => (
        <img
          src={entry.images[i]}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
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

/** The card, section 2.10 and section 3: 12px radius, Accent fill with a
 *  hairline, padding 10, 84px tall, 64px of art at the thumbnail rung. */
function SongCard({ card }: { card: CardSong }) {
  return (
    <div className="mt-[var(--space-s)] flex h-[84px] items-center gap-3 rounded-[var(--radius-md)] border border-border bg-accent p-2.5">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-leaf/10 text-leaf">
        {card.art ? (
          <img src={card.art} alt="" className="h-full w-full object-cover" />
        ) : (
          <MusicNotes size={26} weight="duotone" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-foreground">{card.title}</span>
        {card.artist && (
          <span className="mt-0.5 block truncate text-[14px] text-muted-foreground">{card.artist}</span>
        )}
        {card.source && (
          <span className={cn(LABEL, "mt-1.5 flex items-center gap-1 text-foreground/60")}>
            <Play className="h-3 w-3 fill-current" aria-hidden />
            {card.source}
          </span>
        )}
      </span>
    </div>
  );
}

/** A later link: a pill on Secondary, 28px tall. The chip prints the host
 *  and an ellipsis only, where the sentence above already carries the path. */
function LinkChips({ links }: { links: string[] }) {
  return (
    <div className="mt-[var(--space-s)] flex flex-wrap gap-2">
      {links.map((url) => (
        <span
          key={url}
          title={url}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary px-3 text-[14px] text-foreground"
        >
          <Play className="h-3 w-3 fill-current" aria-hidden />
          {hostOf(url) ?? url}/…
        </span>
      ))}
    </div>
  );
}

/** A photo wall: the question's photographs as a block before its answers,
 *  full-bleed on the phone, nothing cropped, every photograph carrying its
 *  bird. The answers below it then run without their photographs, so the
 *  same picture is not printed twice. JUDGMENT: the direction describes the
 *  wall and the answers but never says which one owns the photograph. */
function PhotoWall({ question, viewport }: { question: SketchQuestion; viewport: SketchViewport }) {
  const cells = question.entries
    .filter((e) => e.images.length > 0)
    .map((entry) => ({
      entry,
      shape: entry.photos[0] ?? { width: 4, height: 3, focalX: 0.5, focalY: 0.5, blurDataUrl: null },
    }));
  if (cells.length === 0) return null;
  return (
    <PhotoStream
      photos={cells.map((c) => c.shape)}
      gap={2}
      targetHeight={viewport === "phone" ? "130px" : "200px"}
      as="ul"
      className={viewport === "phone" ? "-mx-4" : "overflow-hidden rounded-[var(--radius-md)]"}
      keyOf={(_p, i) => cells[i].entry.id}
    >
      {(_photo, i, cell) => (
        <span className="relative block">
          <img
            src={cells[i].entry.images[0]}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-auto w-full object-cover"
            style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition }}
          />
          <span className="absolute bottom-1.5 left-1.5">
            <BirdAvatar user={cells[i].entry.author} size={24} />
          </span>
        </span>
      )}
    </PhotoStream>
  );
}

/** One answer, as a run of things on the paper: the identity row, the
 *  words, the photographs, the card, and the actions line either inside the
 *  last line or under it. No card, no band, no box. */
function Answer({
  entry,
  viewport,
  suppressPhotos = false,
}: {
  entry: SketchEntry;
  viewport: SketchViewport;
  suppressPhotos?: boolean;
}) {
  const body = entry.body?.trim() ?? "";
  const song = songCardOf(entry);
  const chips = chipLinks(entry, song?.url ?? null);
  const photos = !suppressPhotos && entry.images.length > 0;
  const hasLink = linksIn(body).length > 0;

  /* Break 5: under 48 characters with no photograph and no link, the words
     are set in the heading face at h3, and an emoji-only answer at 28px. */
  const short = body.length > 0 && body.length < SHORT_ANSWER_CHARS && !photos && !hasLink;
  const emoji = short && isEmojiOnly(body);
  const wordsClass = emoji
    ? "font-heading text-[28px] leading-[1.2]"
    : short
      ? "font-heading text-[20px] leading-[1.3]"
      : "text-[16px] leading-[1.65]";

  /* The end mark only exists where the answer ENDS in words. */
  const endsInWords = body.length > 0 && !photos && !song && chips.length === 0;
  const inline = endsInWords && (short || lastLineHasRoom(body, viewport));

  return (
    <article>
      <IdentityRow person={entry.author} />
      {body && (
        <Gap size="xs">
          <AnswerWords
            text={body}
            className={wordsClass}
            endMark={inline ? <EndMark entry={entry} /> : undefined}
          />
        </Gap>
      )}
      {photos && <Photos entry={entry} viewport={viewport} />}
      {song && <SongCard card={song.card} />}
      {chips.length > 0 && <LinkChips links={chips} />}
      {!inline && (
        <Gap size="s">
          <ActionsRow entry={entry} />
        </Gap>
      )}
    </article>
  );
}

/** A question's answers: one run after another with a hairline between,
 *  --space-l above and below it, inset to the text edge. */
function Answers({
  question,
  viewport,
  className,
}: {
  question: SketchQuestion;
  viewport: SketchViewport;
  className?: string;
}) {
  const wall = question.kind === "photo" && photoCount(question) > 1;
  return (
    <div className={cn("text-[16px]", viewport === "phone" && "px-4", className)}>
      {wall && <PhotoWall question={question} viewport={viewport} />}
      {question.entries.length === 0 ? (
        <p className="text-[16px] leading-[1.65] text-muted-foreground">Nobody answered this one.</p>
      ) : (
        question.entries.map((entry, i) => (
          <Fragment key={entry.id}>
            {i > 0 && <div className="mt-[var(--space-l)] border-t border-border" />}
            <div className={cn(i > 0 && "mt-[var(--space-l)]", wall && i === 0 && "mt-[var(--space-l)]")}>
              <Answer entry={entry} viewport={viewport} suppressPhotos={wall} />
            </div>
          </Fragment>
        ))
      )}
    </div>
  );
}

/* ---------- the desktop shell ------------------------------------- */

const NAV = [
  { label: "Feed", icon: Newspaper },
  { label: "Directory", icon: Notebook },
  { label: "Collection", icon: Images },
  { label: "Letters", icon: Feather },
  { label: "Catch-ups", icon: MessagesSquare },
  { label: "About", icon: Info },
] as const;

/** The shell's sidebar with the valley photograph dropped: this direction's
 *  sheet is Paper edge to edge from the rail to the window, with nothing
 *  behind it. One departure from _shell.tsx's mock, on purpose: the active
 *  row there is bg-canopy on a canopy rail, which in light mode is the same
 *  hex and cannot be seen. The shipped Sidebar lights it with
 *  --sidebar-active and the cinnamon left edge, and this direction leans on
 *  that same cinnamon edge in its rail and its contents, so the drawing has
 *  to show where it comes from. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[982px] bg-card">
      <aside className="flex w-[248px] shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground">
        <div className="mb-8 flex items-center gap-2.5 px-2 font-heading text-[17px]">
          <PeaksMark size={22} /> Rishi Valley
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ label, icon: Icon }) => {
            const active = label === "Catch-ups";
            return (
              <div
                key={label}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-xl px-3.5 text-[14.5px]",
                  active
                    ? "bg-sidebar-active font-semibold text-sidebar-accent-foreground"
                    : "font-medium text-sidebar-foreground-idle"
                )}
              >
                {active && (
                  <span className="absolute bottom-1.5 left-[-8px] w-[3px] rounded-sm bg-cinnamon top-1.5" />
                )}
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                {label}
              </div>
            );
          })}
        </nav>
      </aside>
      {children}
    </div>
  );
}

/** The rail: 300 wide, padding 32, the way home at every depth, the eleven
 *  rows, and the end. Sticky on a real page; static here, because the tall
 *  Reader drawing has no scroll container of its own inside the frame. */
function Rail({ round, current }: { round: SketchRound; current: number }) {
  return (
    <aside className="w-[300px] shrink-0 p-8 text-[16px]">
      <p className="inline-flex items-center gap-0.5 text-[15px] font-medium text-canopy">
        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        {round.catchupName}
      </p>
      <Gap size="m">
        <h2 className="font-heading text-[24px] leading-[1.2] tracking-[-0.025em] text-foreground">
          Round {round.number}
        </h2>
      </Gap>
      <Gap size="xxs">
        <p className="text-[14px] text-muted-foreground">{formatDisplayDateLong(round.publishedAt)}</p>
      </Gap>
      <Gap size="xl">
        <ul className="flex flex-col gap-2">
          {round.questions.map((question, i) => {
            const on = i === current;
            return (
              <li
                key={question.id}
                title={question.text}
                className={cn(
                  "relative flex items-start gap-2 rounded-[var(--radius-md)] px-2.5 py-2",
                  on && "bg-canopy/[0.08]"
                )}
              >
                {/* The app's one selection state, the sidebar's own. */}
                {on && <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-sm bg-cinnamon" />}
                <span
                  className={cn(
                    LABEL,
                    "w-7 shrink-0 pt-[3px] tabular-nums",
                    on ? "text-canopy" : "text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                {/* Weight never changes between the rows, so nothing reflows
                    when the current row moves. */}
                <span
                  className={cn(
                    "line-clamp-2 min-w-0 flex-1 text-[14px] leading-[1.35]",
                    on ? "text-canopy" : "text-foreground/80"
                  )}
                >
                  {question.text}
                </span>
                <span
                  className={cn(
                    "shrink-0 pt-[3px] text-[12px] tabular-nums",
                    on ? "text-canopy" : "text-muted-foreground"
                  )}
                >
                  {question.entries.length}
                </span>
              </li>
            );
          })}
        </ul>
      </Gap>
      <Gap size="m">
        <div className="border-t border-border" />
      </Gap>
      <Gap size="m">
        <p className="text-[14px] text-muted-foreground">The end</p>
      </Gap>
    </aside>
  );
}

/* ---------- the three drawings ------------------------------------ */

/** Questions 4 to 11 are not drawn: the cull asks for the first three with
 *  every answer, and the end plate has to be seen. */
function OmittedNote({ round, viewport }: SketchProps) {
  return (
    <p
      className={cn(
        "text-[14px] leading-[1.5] text-muted-foreground",
        viewport === "phone" ? "px-4" : ""
      )}
    >
      Questions 4 to {round.questions.length} omitted from the sketch.
    </p>
  );
}

function Reader({ round, viewport }: SketchProps) {
  const drawn = round.questions.slice(0, 3);
  const laptop = viewport === "laptop";

  const body = (
    <>
      <Masthead round={round} viewport={viewport} />
      {drawn.map((question, i) => (
        <Fragment key={question.id}>
          {i > 0 && (
            <div className={laptop ? "mt-[var(--space-xxl)]" : "mt-[var(--space-xl)]"}>
              <QuestionPlate round={round} index={i} viewport={viewport} />
            </div>
          )}
          <Answers
            question={question}
            viewport={viewport}
            className={laptop ? "mt-[var(--space-xl)]" : "mt-[var(--space-l)]"}
          />
        </Fragment>
      ))}
      <div className="mt-[var(--space-xl)]">
        <OmittedNote round={round} viewport={viewport} />
      </div>
      <div className="mt-[var(--space-xl)]">
        <EndPlate round={round} viewport={viewport} />
      </div>
    </>
  );

  if (laptop) {
    return (
      <Shell>
        <Rail round={round} current={0} />
        {/* The column: 680, centred in what is left of the sheet, which puts
            it at x 690 and leaves plain paper either side. */}
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="w-[680px] py-8 text-[16px]">{body}</div>
        </div>
      </Shell>
    );
  }

  return <div className="bg-card text-[16px]">{body}</div>;
}

/** One phone screen deep in question 5, the navigator resting. The bar is
 *  absolute inside the frame, never fixed: the frame is transformed, so a
 *  fixed bar would answer to the real window (see _frame.tsx). */
function MidScroll({ round }: { round: SketchRound }) {
  const index = Math.min(4, round.questions.length - 1);
  const question = round.questions[index];

  /* Who is on screen, chosen from the data rather than named: the answer
     whose tail is under the bar wants two links, so it can show a chip; the
     one below it wants a music link, so it can show the card. */
  const withLinks = question.entries.filter((e) => linksIn(e.body ?? "").length > 0);
  const withMusic = question.entries.filter((e) => songCardOf(e) !== null);
  const carded = withMusic[1] ?? withMusic[0] ?? withLinks[0] ?? question.entries[1] ?? question.entries[0];
  const tail =
    withLinks.find((e) => e.id !== carded?.id && linksIn(e.body ?? "").length >= 2) ??
    withLinks.find((e) => e.id !== carded?.id) ??
    /* Never the same answer twice: a Round where only one person pasted a
       link would otherwise print it as both the tail and the card. */
    question.entries.find((e) => e.id !== carded?.id) ??
    question.entries[0];
  /* Whoever comes after them in the Round's own order, so the screen reads
     down the way the page does. Topped up from the front when the carded
     answer is near the end, because the frame still has to fill. */
  const below = question.entries.slice(carded ? question.entries.indexOf(carded) + 1 : 0);
  const spare = question.entries.filter((e) => !below.includes(e));
  const rest = [...below, ...spare]
    .filter((e) => e.id !== tail?.id && e.id !== carded?.id)
    .slice(0, 3);

  return (
    <div className="relative h-full overflow-hidden bg-card text-[16px]">
      <div className="absolute inset-x-0 top-14 px-4">
        {/* The tail of an answer whose head is above the fold. Bottom
            aligned inside 120px, so the hairline under it lands at y 176 --
            the direction's own number -- however long the answer is. */}
        <div className="flex h-[120px] flex-col justify-end overflow-hidden">
          <div className="pb-[var(--space-l)]">
            {tail && <Answer entry={tail} viewport="phone" />}
          </div>
        </div>
        <div className="border-t border-border" />
        <div className="mt-[var(--space-l)]">{carded && <Answer entry={carded} viewport="phone" />}</div>
        {rest.map((entry) => (
          <Fragment key={entry.id}>
            <div className="mt-[var(--space-l)] border-t border-border" />
            <div className="mt-[var(--space-l)]">
              <Answer entry={entry} viewport="phone" />
            </div>
          </Fragment>
        ))}
      </div>
      <RestingBar round={round} index={index} className="absolute inset-x-0 top-0 z-10" />
    </div>
  );
}

/** The bar, grown to the whole screen. Not the dialog material: no panel,
 *  no backdrop, no Cancel row (break 6). It is the same green, bigger. */
function NavigatorOpen({ round }: { round: SketchRound }) {
  const current = Math.min(4, round.questions.length - 1);
  return (
    <div className="flex h-full flex-col overflow-hidden bg-canopy text-[16px] text-white">
      <div className="shrink-0 px-4">
        <div className="flex h-11 items-center justify-between">
          <WayHome round={round} />
          <span className="-mr-3 grid h-11 w-11 place-items-center">
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
        </div>
        <Gap size="s">
          <p className={cn(LABEL, "text-white/70")}>
            {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
          </p>
        </Gap>
      </div>
      {/* The rows scroll inside the plate when the screen is shorter than
          they are; the top row stays. Here that is a clip. */}
      <div className="mt-[var(--space-l)] min-h-0 flex-1 overflow-hidden px-3">
        <ul className="flex flex-col gap-2">
          {round.questions.map((question, i) => {
            const on = i === current;
            return (
              <li
                key={question.id}
                className={cn(
                  "relative flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] px-3 py-[10px]",
                  on && "bg-white/[0.14]"
                )}
              >
                {on && <span className="absolute bottom-1 left-0 top-1 w-[3px] rounded-sm bg-cinnamon" />}
                <span className={cn(LABEL, "w-7 shrink-0 tabular-nums text-white/60")}>{i + 1}</span>
                {/* The current row shows its question in full however long
                    it is; every other row is cut at two lines. */}
                <span
                  className={cn("min-w-0 flex-1 text-[15px] leading-[1.35]", !on && "line-clamp-2")}
                >
                  {question.text}
                </span>
                <span className={cn(LABEL, "shrink-0 tabular-nums text-white/60")}>
                  {question.entries.length}
                </span>
              </li>
            );
          })}
        </ul>
        <Gap size="m">
          <div className="border-t border-white/15" />
        </Gap>
        <div className="flex min-h-[44px] items-center px-3 text-[15px] text-white/80">
          The end of Round {round.number}
        </div>
      </div>
    </div>
  );
}

export const actionButton: SketchDirection = {
  slug: "action-button",
  name: "The bar is the question",
  thesis:
    "The green bar every phone screen already carries becomes the whole reader: it grows into the plate that opens the Round, and its 56px foot stays behind holding the question you are in.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
