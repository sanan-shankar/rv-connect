/* ------------------------------------------------------------------ *
 *  Direction 01, "You land in the Round" (front-door).
 *
 *  Drawn from docs/planning/catchups-rework/directions/01-front-door.md
 *  section 3, "The reader, precisely", which is the only thing this file
 *  implements. Its numbers are followed to the pixel where it gives
 *  them; every place it is silent is marked JUDGMENT below.
 *
 *  The three bets, so a reader of this file can see them without the
 *  document: the Round is ONE SHEET of paper with no answer cards on it;
 *  the masthead folds up into the app's own 56px green bar, which then
 *  carries the Catch-up's name, the question you are in and a notch per
 *  question; and the name is the way up, printed at the top of the
 *  sheet, at the top of the contents, and again at the end.
 *
 *  Static, as the cull asks (../_types.ts): the cross-fade from masthead
 *  to spine, the notch that moves and the contents sheet that rises are
 *  what the S4 room has to make real. What is drawn here is the two
 *  states either side of that fade -- MidScroll is the bar carrying the
 *  spine, NavigatorOpen is the sheet already up.
 *
 *  SPACING: every --space-* token is em-based, so it only lands on the
 *  direction's numbers (xs 6, s 10, m 16, l 26, xl 42, xxl 68) on an
 *  element whose own font-size is 16px. Tokens therefore go on
 *  containers that inherit the 16px base, never on a sized heading. The
 *  sheet's root sets text-[16px] to guarantee it.
 * ------------------------------------------------------------------ */

import { ChevronDown, ChevronRight, Heart, Menu, Play } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { IdentityRow } from "@/components/common/identity-row";
import { MetaDots } from "@/components/common/meta-dots";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows, PhotoStream } from "@/components/common/photo-rows";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine, VALLEY_TIME_ZONE } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import { DesktopShell, PhoneBar } from "../_shell";
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

/* ---------- constants the direction names ------------------------- */

/** The measure is 350px on a phone and 616px on a laptop; one promise
 *  covers both, per the brief handed to this sketch. */
const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** The byline register, character for character the same string
 *  IdentityRow uses (identity-row.tsx, META_CLASS). "the 10.5px capitals
 *  byline style" in the direction is this and nothing else. */
const CAPS = "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

/** A run, not a piece: no photographs, no card, 160 characters or fewer. */
const RUN_MAX_CHARS = 160;

/** JUDGMENT. The direction puts the heart "in the same line as the text
 *  when the text is one line, at the right, or on its own row beneath
 *  when it is two". Nothing static can know where a line breaks, so this
 *  is the count that fits the narrower of the two measures at 16px: a
 *  300px laptop run column takes about 40 characters of Source Sans 3.
 *  A run between 40 and 160 characters gets the heart on its own row,
 *  which is the direction's second case. */
const INLINE_HEART_MAX_CHARS = 40;

/** Over this, a heading "drops to 20px and reads as the paragraph it is". */
const LONG_QUESTION_CHARS = 120;

/** The bar's comb caps at fourteen and becomes a fraction past it. Eleven
 *  questions never reach it; kept because a Round that does would draw a
 *  200px comb into the notch slot otherwise. */
const MAX_NOTCHES = 14;

const CADENCE_LABEL: Record<string, string> = {
  biweekly: "Every two weeks",
  monthly: "Every month",
  quarterly: "Every three months",
};

/* ---------- small derivations ------------------------------------- */

function firstName(person: SketchPerson): string {
  return person.name.trim().split(/\s+/)[0] ?? person.name;
}

/** "15 September". The masthead's state line names a day and a month and
 *  no year, where the byline under the name spells the year out; both
 *  read the valley's own clock, the way every other date in the app
 *  does (utils.ts, VALLEY_TIME_ZONE). */
function dayMonth(iso: string, month: "long" | "short" = "long"): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month,
  });
}

/** The one line that says what is next, on the masthead and again at the
 *  end. The other six forms in the direction belong to states this Round
 *  is not in (it is published and waiting), so only that form is drawn.
 *  JUDGMENT: a Catch-up whose next date has not been set yet gets the
 *  sentence without a date rather than an empty row. */
function nextRoundLine(round: SketchRound): string {
  const next = round.number + 1;
  return round.nextOpensAt
    ? `Round ${next} opens on ${dayMonth(round.nextOpensAt)}.`
    : `Round ${next} does not have a date yet.`;
}

/** The song a card is drawn from. A `songs` question is answered with the
 *  song's NAME and the answering control stores that name in `body`, so
 *  the reader prints it as a row rather than as a bare sentence, the same
 *  rule the shipped AnswerCard follows. */
function songOf(entry: SketchEntry, kind: SketchQuestion["kind"]): SketchSong | null {
  const body = entry.body?.trim() ?? "";
  if (entry.song) return entry.song;
  if (kind === "songs" && body) return { url: "", title: body, art: null };
  return null;
}

/** The 10.5px mark at the end of a card, and whether the source offers a
 *  preview to put a play glyph on. A YouTube link takes the wide file. */
function sourceOf(url: string): { label: string; wide: boolean; play: boolean } | null {
  if (!url) return null;
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host === "open.spotify.com") return { label: "Spotify", wide: false, play: true };
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be")
    return { label: "YouTube", wide: true, play: false };
  if (host === "music.apple.com") return { label: "Apple Music", wide: false, play: true };
  return { label: host, wide: false, play: false };
}

function isRun(entry: SketchEntry, kind: SketchQuestion["kind"]): boolean {
  const body = entry.body?.trim() ?? "";
  if (!body) return false;
  if (entry.images.length > 0) return false;
  if (songOf(entry, kind)) return false;
  return body.length <= RUN_MAX_CHARS;
}

/** "13 wrote in · asked by Agastya Lewin", CSS-uppercased. The four asker
 *  cases are the shipped reader's (question-section.tsx): a named asker, an
 *  asker looking at their own anonymous question, an anonymous question
 *  with no name to show, and a library question, which claims nothing. */
function questionLabel(question: SketchQuestion): string {
  const wrote = `${question.entries.length} wrote in`;
  if (question.asker && question.showAsker) return metaLine(wrote, `asked by ${question.asker.name}`);
  if (question.asker) return metaLine(wrote, "asked by you, anonymously");
  if (!question.showAsker) return metaLine(wrote, "asked anonymously");
  return wrote;
}

/* ---------- the member's words ------------------------------------ */

/** A pasted link prints in leaf and breaks at the measure, so the page can
 *  never pan (section 7). Splitting the RAW text on the URL and rendering
 *  only the non-URL runs through renderRichText keeps the one sanitiser
 *  between a member's typing and dangerouslySetInnerHTML doing exactly the
 *  job it was written for; the URL itself goes through React, which escapes
 *  it. A regex over renderRichText's OUTPUT would have been a second
 *  parser of HTML, which is the thing rich-text.ts exists to avoid. */
const URL_SPLIT = /(https?:\/\/[^\s]+)/g;

function AnswerText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_SPLIT);
  return (
    <p className={cn("whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground", className)}>
      {parts.map((part, i) =>
        // String.split with one capture group alternates: odd indices are the links.
        i % 2 === 1 ? (
          <span key={i} className="text-leaf underline underline-offset-2">
            {part}
          </span>
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderRichText(part) }} />
        )
      )}
    </p>
  );
}

/* ---------- the heart row ----------------------------------------- */

/** 32px tall, the heart at the left and one text button after it. The real
 *  LoveButton needs a server action, so this is its drawing: 18px, the one
 *  red, filled when the viewer has already loved it, the count at 14px.
 *  JUDGMENT: no middle dot between the heart and the comment button. The
 *  direction writes the pair as "♥ 12 · 3 comments" in prose but calls them
 *  two controls, and a dot between two pressable things reads as a third. */
function HeartRow({ entry, className }: { entry: SketchEntry; className?: string }) {
  const comments =
    entry.commentCount === 0
      ? "Comment"
      : `${entry.commentCount} comment${entry.commentCount === 1 ? "" : "s"}`;
  return (
    <div className={cn("flex h-8 items-center gap-3", className)}>
      <span className="inline-flex items-center gap-1.5">
        <Heart
          className={cn("h-[18px] w-[18px] text-heart", entry.lovedByViewer ? "fill-current" : "fill-none")}
          strokeWidth={2}
          aria-hidden
        />
        <span className="text-[14px] tabular-nums text-muted-foreground">{entry.loveCount}</span>
      </span>
      <span className="text-[14px] text-muted-foreground">{comments}</span>
    </div>
  );
}

/* ---------- the song card ----------------------------------------- */

/** The direction's own card, not the shipped SpotifyCard: that one prints
 *  "Open in Spotify" under the title and has no source mark, where this
 *  wants the 10.5px capitals mark and a play glyph where a preview exists.
 *  The artist line the direction draws has no column behind it in the data,
 *  so it is left out rather than invented under a real person's answer. */
function SongCard({ song }: { song: SketchSong }) {
  const source = sourceOf(song.url);
  const artClass = source?.wide ? "h-[54px] w-24" : "h-14 w-14";
  return (
    <div className="mt-[var(--space-s)] flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-background/60 p-[var(--space-s)]">
      <span className={cn("relative shrink-0 overflow-hidden rounded-[var(--radius-sm)]", artClass)}>
        {song.art ? (
          <img src={song.art} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-leaf/10 text-leaf">
            <MusicNotes size={22} weight="duotone" />
          </span>
        )}
        {source?.play && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/55 text-white">
              <Play className="h-3 w-3 fill-current" aria-hidden />
            </span>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-semibold leading-[1.3] text-foreground">{song.title}</span>
        {source && <span className={cn("mt-1 block", CAPS)}>{source.label}</span>}
      </span>
    </div>
  );
}

/* ---------- photographs ------------------------------------------- */

/** One photograph is PhotoFrame's rule, unchanged. Two or more are
 *  justified rows at 4px, the direction's gap. Corners are 12px on the
 *  OUTER corners of the group only, which one rounded overflow-hidden
 *  wrapper gives for free. */
function Photos({ entry }: { entry: SketchEntry }) {
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
  const measured =
    entry.photos.length === entry.images.length && entry.photos.every(Boolean)
      ? (entry.photos as StoredPhoto[])
      : null;
  if (!measured) {
    /* Never measured: the same two-up the shipped reader falls back to,
       rather than a guessed shape that would move the page. */
    return (
      <div className="mt-[var(--space-s)] grid grid-cols-2 gap-1 overflow-hidden rounded-[var(--radius-md)]">
        {entry.images.map((src) => (
          <img key={src} src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ))}
      </div>
    );
  }
  return (
    <PhotoRows
      photos={measured}
      gap={4}
      columnSizes={PHOTO_SIZES}
      className="mt-[var(--space-s)] overflow-hidden rounded-[var(--radius-md)]"
    >
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

/** A photo wall: everyone's one photograph in justified rows across the
 *  sheet's full width, nothing cropped, with the bird and first name at the
 *  left of each and the heart at the right. An unmeasured photograph would
 *  have no shape to solve the row from, so it takes 4:3 and says so. */
function PhotoWall({ entries, viewport }: { entries: SketchEntry[]; viewport: SketchViewport }) {
  const cells = entries
    .filter((e) => e.images.length === 1)
    .map((entry) => ({
      entry,
      shape: entry.photos[0] ?? { width: 4, height: 3, focalX: 0.5, focalY: 0.5, blurDataUrl: null },
    }));
  if (cells.length === 0) return null;
  return (
    <PhotoStream
      photos={cells.map((c) => c.shape)}
      gap={4}
      targetHeight={viewport === "phone" ? "220px" : "240px"}
      as="ul"
      /* Full bleed on a phone (past the sheet's 20px edge), and out to the
         sheet's own 24px edge on a laptop (past the 72px text edge). */
      className={cn("mt-[var(--space-s)]", viewport === "phone" ? "-mx-5" : "-mr-12")}
      keyOf={(_p, i) => cells[i].entry.id}
    >
      {(_photo, i, cell) => {
        const { entry } = cells[i];
        const caption = entry.body?.trim() ?? "";
        return (
          <>
            <img
              src={entry.images[0]}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-auto w-full object-cover"
              style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition }}
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <BirdAvatar user={entry.author} size="xs" />
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {firstName(entry.author)}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <Heart
                  className={cn("h-[14px] w-[14px] text-heart", entry.lovedByViewer ? "fill-current" : "fill-none")}
                  aria-hidden
                />
                <span className="text-[12px] tabular-nums text-muted-foreground">{entry.loveCount}</span>
              </span>
            </div>
            {caption && <p className="mt-1 text-[13.5px] leading-[1.45] text-muted-foreground">{caption}</p>}
          </>
        );
      }}
    </PhotoStream>
  );
}

/* ---------- the answer, in its two packings ----------------------- */

/** The run: a bird, a name, the batch line inline after it, the words on
 *  the next line, and the heart beside them when they fit on one. */
function RunAnswer({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  const body = entry.body?.trim() ?? "";
  const inline = body.length <= INLINE_HEART_MAX_CHARS;
  const text = (
    <AnswerText
      text={body}
      className={cn(
        "min-w-0 flex-1",
        viewport === "phone" ? "text-[16px] leading-[1.6]" : "text-[17px] leading-[1.6]"
      )}
    />
  );
  return (
    <article>
      <div className="flex items-center gap-3">
        <BirdAvatar user={entry.author} size="xs" />
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="truncate text-[15px] font-semibold leading-none text-foreground">{entry.author.name}</span>
          {entry.author.batchLine && (
            <span className={cn("shrink-0 leading-none", CAPS)}>{entry.author.batchLine}</span>
          )}
        </span>
      </div>
      {inline ? (
        <div className="mt-1.5 flex items-start justify-between gap-3">
          {text}
          <HeartRow entry={entry} className="-mt-1 shrink-0" />
        </div>
      ) : (
        <>
          <div className="mt-1.5">{text}</div>
          <HeartRow entry={entry} className="mt-[var(--space-s)]" />
        </>
      )}
    </article>
  );
}

/** The piece: everything else. On a phone the bird sits in the identity
 *  row; on a laptop it hangs 40px out in the sheet's left edge and the
 *  name sits on its centre line, which is the margin portrait the
 *  direction says a forum thread never has. */
function PieceAnswer({
  entry,
  viewport,
  kind,
}: {
  entry: SketchEntry;
  viewport: SketchViewport;
  kind: SketchQuestion["kind"];
}) {
  const body = entry.body?.trim() ?? "";
  const song = songOf(entry, kind);
  const showBody = Boolean(body) && !(song && !entry.song);
  const empty = !body && entry.images.length === 0 && !song;

  const content = (
    <>
      {showBody && (
        <AnswerText
          text={body}
          className={cn(
            "mt-[var(--space-s)]",
            viewport === "phone" ? "text-[16px] leading-[1.6]" : "text-[17px] leading-[1.6]"
          )}
        />
      )}
      {empty && (
        <p className="mt-[var(--space-s)] text-[15px] italic leading-[1.6] text-muted-foreground">
          Showed up for this Round without adding anything here.
        </p>
      )}
      <Photos entry={entry} />
      {song && <SongCard song={song} />}
      <HeartRow entry={entry} className="mt-[var(--space-s)]" />
    </>
  );

  if (viewport === "phone") {
    return (
      <article>
        <IdentityRow
          user={entry.author}
          avatarSize="xs"
          name={<span className="text-[15px] font-semibold text-foreground">{entry.author.name}</span>}
          meta={entry.author.batchLine || undefined}
        />
        {content}
      </article>
    );
  }

  return (
    <article className="flex gap-2">
      {/* x 616 to 656: the gutter the bird hangs in. */}
      <div className="w-10 shrink-0">
        <BirdAvatar user={entry.author} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex h-10 flex-col justify-center gap-[5px]">
          <span className="text-[15px] font-semibold leading-none text-foreground">{entry.author.name}</span>
          {entry.author.batchLine && <span className={cn("leading-none", CAPS)}>{entry.author.batchLine}</span>}
        </div>
        {content}
      </div>
    </article>
  );
}

function Answer({
  entry,
  viewport,
  kind,
}: {
  entry: SketchEntry;
  viewport: SketchViewport;
  kind: SketchQuestion["kind"];
}) {
  if (isRun(entry, kind)) {
    /* A run inside a mixed question keeps its compact shape but sits in the
       piece column, so every answer on a laptop starts at the same x. */
    return viewport === "laptop" ? (
      <div className="pl-12">
        <RunAnswer entry={entry} viewport={viewport} />
      </div>
    ) : (
      <RunAnswer entry={entry} viewport={viewport} />
    );
  }
  return <PieceAnswer entry={entry} viewport={viewport} kind={kind} />;
}

/* ---------- a question ------------------------------------------- */

function QuestionHeading({ question, viewport }: { question: SketchQuestion; viewport: SketchViewport }) {
  const long = question.text.length > LONG_QUESTION_CHARS;
  const size = long ? "text-[20px]" : viewport === "phone" ? "text-[24px]" : "text-[28px]";
  return (
    <>
      <p className={CAPS}>{questionLabel(question)}</p>
      {/* 6px, which is --space-xs at the 16px base. Written in px because the
          token is em-based and this element's own font-size is 24 or 28. */}
      <h2
        className={cn("mt-[6px] font-heading leading-[1.15] tracking-[-0.02em] text-foreground", size)}
      >
        {question.text}
      </h2>
    </>
  );
}

function QuestionBlock({
  question,
  viewport,
  first = false,
}: {
  question: SketchQuestion;
  viewport: SketchViewport;
  first?: boolean;
}) {
  const wall = question.kind === "photo";
  const wallEntries = wall ? question.entries.filter((e) => e.images.length === 1) : [];
  const carded = wall ? question.entries.filter((e) => e.images.length !== 1) : question.entries;
  const allRuns =
    viewport === "laptop" && carded.length > 1 && carded.every((e) => isRun(e, question.kind));
  const gap = viewport === "phone" ? "var(--space-l)" : "var(--space-xl)";

  return (
    /* text-[16px] pins every --space-* below to the direction's numbers.
       --space-xxl above a heading is the 68px between questions; the first
       question sits --space-xl under the masthead's state line instead. */
    <section className={cn("text-[16px]", first ? "mt-[var(--space-xl)]" : "mt-[var(--space-xxl)]")}>
      <QuestionHeading question={question} viewport={viewport} />
      <div className="mt-[var(--space-l)]">
        {question.entries.length === 0 ? (
          <p className="text-[15px] italic text-muted-foreground">No one took this one.</p>
        ) : (
          <>
            {wallEntries.length > 0 && <PhotoWall entries={wallEntries} viewport={viewport} />}
            {allRuns ? (
              /* Two to a row, row-major, 300px columns with a 16px gap
                 inside the 616px measure. */
              <div className="grid grid-cols-2 pl-12" style={{ columnGap: 16, rowGap: 42 }}>
                {carded.map((entry) => (
                  <RunAnswer key={entry.id} entry={entry} viewport={viewport} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap }}>
                {carded.map((entry) => (
                  <Answer key={entry.id} entry={entry} viewport={viewport} kind={question.kind} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* ---------- the writers strip ------------------------------------- */

/** Four birds at a 64px pitch with the first name in capitals under each,
 *  and a mist disc reading "+9" with OTHERS under it. The one thing on
 *  screen that could only be this app. The cells are min-width rather than
 *  width so a long first name widens its own cell and the strip wraps,
 *  which is section 7's answer for "PADMANABHAN". */
function WritersStrip({ people }: { people: SketchPerson[] }) {
  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  return (
    <div className="flex flex-wrap">
      {shown.map((person) => (
        <span key={person.id} className="flex min-w-16 flex-col items-center px-1">
          <BirdAvatar user={person} size={28} />
          <span className={cn("mt-1 max-w-full truncate leading-none", CAPS)}>{firstName(person)}</span>
        </span>
      ))}
      {rest > 0 && (
        <span className="flex min-w-16 flex-col items-center px-1">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-mist text-[11px] font-semibold text-muted-foreground">
            +{rest}
          </span>
          <span className={cn("mt-1 leading-none", CAPS)}>Others</span>
        </span>
      )}
    </div>
  );
}

/* ---------- the masthead (phone) ---------------------------------- */

/** y 84 the name, y 130 the byline, y 166 the strip, y 228 the state line,
 *  measured from the top of the screen with the sheet beginning at y 56.
 *  It scrolls with the sheet, as text does; the bar takes over as it goes. */
function Masthead({ round }: { round: SketchRound }) {
  return (
    <header className="px-5 pt-7">
      <h1 className="font-heading text-[34px] leading-[1.05] tracking-[-0.025em] text-foreground">
        {round.catchupName}
      </h1>
      <p className="mt-[10px] text-[14px] leading-[1.4] text-muted-foreground">
        <MetaDots parts={[`Round ${round.number}`, formatDisplayDateLong(round.publishedAt)]} />
      </p>
      <div className="state-layer -mx-1 mt-4 rounded-[var(--radius-md)] px-1">
        <WritersStrip people={round.contributors} />
      </div>
      <p className="mt-5 text-[13px] leading-[1.4] text-muted-foreground">{nextRoundLine(round)}</p>
    </header>
  );
}

/* ---------- the rail (laptop) ------------------------------------- */

/** The masthead standing up beside the page and staying there: the way up
 *  at the top of it at every depth, the writers as a five-column grid, and
 *  the eleven questions with the current one marked in leaf. Weight never
 *  changes with the marker, only colour, so nothing under it moves. */
function Rail({ round, current }: { round: SketchRound; current: number }) {
  const cadence = CADENCE_LABEL[round.cadence] ?? round.cadence;
  return (
    <aside className="sticky top-10 w-[272px] shrink-0 self-start text-[16px]">
      <button
        type="button"
        className="block text-left font-heading text-[22px] leading-tight tracking-[-0.02em] text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {round.catchupName}
      </button>
      <p className="mt-1 flex items-center text-[13px] text-muted-foreground">
        {/* The count is the one control here: it opens the people sheet. */}
        <MetaDots
          parts={[
            cadence,
            <span key="people" className="underline decoration-border underline-offset-2">
              {round.members.length} people
            </span>,
          ]}
        />
      </p>

      {/* 26px on the CAPS rows below is --space-l at the 16px base, in px
          because the token is em-based and these elements are 10.5 and 13. */}
      <p className={cn("mt-[26px]", CAPS)}>
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      <div className="mt-3 grid w-[240px] grid-cols-5">
        {round.contributors.map((person) => (
          <span key={person.id} className="flex flex-col items-center py-1">
            <BirdAvatar user={person} size={28} />
            <span className={cn("mt-1 max-w-full truncate leading-none", CAPS)}>{firstName(person)}</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground underline decoration-border underline-offset-2">
        {round.contributors.length} wrote in
      </p>

      <p className={cn("mt-[26px]", CAPS)}>In this Round</p>
      <ul className="mt-2">
        {round.questions.map((question, i) => (
          <li key={question.id} className="relative">
            <button
              type="button"
              className="state-layer flex w-full items-start gap-2 rounded-[var(--radius-sm)] py-1.5 pl-3 pr-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {i === current && (
                <span className="absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-full bg-leaf" aria-hidden />
              )}
              <span
                className={cn(
                  "line-clamp-2 min-w-0 flex-1 text-[15px] leading-[1.35]",
                  i === current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {question.text}
              </span>
              <span className="shrink-0 pt-[3px] text-[12px] tabular-nums text-muted-foreground">
                {question.entries.length}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-[26px] text-[13px] text-muted-foreground">{nextRoundLine(round)}</p>
    </aside>
  );
}

/* ---------- the end of the Round ---------------------------------- */

function EndOfRound({ round }: { round: SketchRound }) {
  const answers = round.questions.reduce((n, q) => n + q.entries.length, 0);
  return (
    <footer className="mt-[var(--space-xxl)] text-[16px]">
      {/* 24px on both sizes: the direction gives the end one size, where it
          gives a question's heading two. */}
      <h2 className="font-heading text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground">
        The end of Round {round.number}.
      </h2>
      <p className="mt-[6px] text-[14px] text-muted-foreground">
        {answers} answers from {round.contributors.length} people.
      </p>
      <p className="mt-4 text-[14px] text-muted-foreground">{nextRoundLine(round)}</p>
      {/* "ROUNDS BEFORE" and its covers would print here. Round 1 has none,
          so nothing is printed, which is the direction's own instruction. */}
      <button
        type="button"
        className="state-layer mt-[var(--space-l)] flex w-full items-center justify-between rounded-[var(--radius-md)] py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="font-heading text-[20px] leading-tight text-foreground">{round.catchupName}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </footer>
  );
}

/** The sketch's own annotation, not the page's: three questions are drawn
 *  in full and the end follows them, because eleven would be forty screens. */
function OmissionNote({ round }: { round: SketchRound }) {
  return (
    /* 26px, so the note hangs under question three and the 68px before the
       end of the Round stays the direction's own gap. */
    <p className="mt-[26px] text-[12px] italic text-muted-foreground">
      Questions 4 to {round.questions.length} are omitted from this sketch.
    </p>
  );
}

/* ---------- the green bar, carrying the spine --------------------- */

/** Break 1, and the one the direction calls the point: the app's own 56px
 *  bar holds this route's content. Never taller, never moving. */
function SpineBar({
  round,
  current,
  progress,
}: {
  round: SketchRound;
  current: number;
  progress: number;
}) {
  const total = round.questions.length;
  const comb = total <= MAX_NOTCHES;
  return (
    <header className="absolute left-0 top-0 z-40 flex h-14 w-full items-center bg-sidebar text-white">
      <span className="ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-full">
        <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      {/* x 64 to 318 */}
      <span className="ml-4 flex min-w-0 flex-1 flex-col justify-center gap-[3px] pr-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          {metaLine(round.catchupName, `Round ${round.number}`)}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold leading-tight">
            {round.questions[current]?.text}
          </span>
          <ChevronDown
            className="h-3 w-3 shrink-0"
            style={{ color: "rgba(255,255,255,0.72)" }}
            aria-hidden
          />
        </span>
      </span>
      {/* x 326 to 378: eleven notches, the current one 20px against 14px. */}
      <span className="mr-3 flex shrink-0 items-end" style={{ height: 20, gap: 3 }}>
        {comb ? (
          round.questions.map((question, i) => (
            <span
              key={question.id}
              style={{
                width: 2,
                height: i === current ? 20 : 14,
                backgroundColor:
                  i === current
                    ? "#FFFFFF"
                    : i < current
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.4)",
              }}
            />
          ))
        ) : (
          <span className="text-[12px] tabular-nums leading-none">
            {current + 1} / {total}
          </span>
        )}
      </span>
      {/* The fill line: how far into THIS question you are, reset at the next. */}
      <span
        className="absolute bottom-0 left-0 h-[2px]"
        style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: "rgba(255,255,255,0.85)" }}
        aria-hidden
      />
    </header>
  );
}

/* ---------- the contents sheet ------------------------------------ */

function ContentsSheet({ round, current }: { round: SketchRound; current: number }) {
  const cadence = CADENCE_LABEL[round.cadence] ?? round.cadence;
  const next = round.nextOpensAt
    ? `Round ${round.number + 1} opens ${dayMonth(round.nextOpensAt, "short")}`
    : "";
  return (
    <div className="absolute inset-0 z-50">
      {/* The dialog material's warm-ink tint, at 55%, with the blur. */}
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ backgroundColor: "rgba(35,36,30,0.55)" }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[656px] flex-col rounded-t-[20.8px] bg-float p-4 text-[16px]">
        <span className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-foreground/20" aria-hidden />
        {/* The head row is the way up. */}
        <button
          type="button"
          className="state-layer -mx-2 flex h-14 shrink-0 items-center gap-3 rounded-[var(--radius-sm)] px-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading text-[20px] leading-tight text-foreground">
              {round.catchupName}
            </span>
            <span className="mt-1 block truncate text-[13px] text-muted-foreground">
              {metaLine(cadence, `${round.members.length} people`, next)}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        <ul className="mt-[var(--space-s)] min-h-0 flex-1 overflow-y-auto">
          {round.questions.map((question, i) => {
            const active = i === current;
            return (
              <li key={question.id} className="relative">
                <button
                  type="button"
                  className="state-layer flex min-h-[44px] w-full items-start gap-2 rounded-[var(--radius-sm)] py-2 pl-3 pr-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-leaf" aria-hidden />
                  )}
                  <span className="w-6 shrink-0 pt-[2px] text-[12px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[15px] leading-[1.35] text-foreground",
                        active ? "line-clamp-6 font-semibold" : "line-clamp-2"
                      )}
                    >
                      {question.text}
                    </span>
                    {active && question.entries.length >= 20 && (
                      <span className="mt-1 block text-[12px] text-muted-foreground">
                        you are at 9 of {question.entries.length}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 pt-[2px] text-[12px] tabular-nums text-muted-foreground">
                    {question.entries.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ---------- the two phone screens --------------------------------- */

/** Deep in question 5: the paper continuing under the bar, picked up part
 *  way down the question so the screen is answers rather than a heading. */
const DEEP_INDEX = 4;
const DEEP_FROM = 3;

function deepQuestion(round: SketchRound): { question: SketchQuestion | undefined; index: number } {
  const index = Math.max(0, Math.min(DEEP_INDEX, round.questions.length - 1));
  return { question: round.questions[index], index };
}

function DeepPage({ round }: { round: SketchRound }) {
  const { question } = deepQuestion(round);
  if (!question) return null;
  const from = Math.min(DEEP_FROM, Math.max(0, question.entries.length - 3));
  const shown = question.entries.slice(from, from + 6);
  return (
    <div className="absolute inset-0 bg-paper text-[16px]">
      {/* y 72: the first identity row, 16px under the bar. */}
      <div className="flex flex-col px-5 pt-[72px]" style={{ gap: "var(--space-l)" }}>
        {shown.map((entry) => (
          <Answer key={entry.id} entry={entry} viewport="phone" kind={question.kind} />
        ))}
      </div>
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const { question, index } = deepQuestion(round);
  const answers = question?.entries.length ?? 0;
  const from = Math.min(DEEP_FROM, Math.max(0, answers - 3));
  /* How far into THIS question, which is what the line under the bar says.
     About a third, which is where the direction draws it. */
  const progress = answers ? (from + 1) / answers : 0;
  return (
    <div className="relative h-full overflow-hidden bg-paper">
      <DeepPage round={round} />
      <SpineBar round={round} current={index} progress={progress} />
    </div>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  const { index } = deepQuestion(round);
  return (
    <div className="relative h-full overflow-hidden bg-paper">
      <DeepPage round={round} />
      <SpineBar round={round} current={index} progress={0.31} />
      <ContentsSheet round={round} current={index} />
    </div>
  );
}

/* ---------- the reader, from the top ------------------------------ */

function Reader({ round, viewport }: SketchProps) {
  const questions = round.questions.slice(0, 3);

  if (viewport === "laptop") {
    return (
      <DesktopShell>
        {/* The shell pads to y 32; the direction starts at y 40. */}
        <div className="flex gap-8 pt-2">
          <Rail round={round} current={0} />
          {/* The sheet: 760px of paper, 16px corners, a 24px left edge with
              the birds hanging in it and a 72px right edge, so the measure
              is 616px and the headings stand 48px out into the gutter. */}
          <div className="card-elevated w-[760px] shrink-0 rounded-[var(--radius)] bg-paper pb-[var(--space-xxl)] pl-6 pr-[72px] pt-12 text-[16px]">
            {questions.map((question, i) => (
              <QuestionBlock key={question.id} question={question} viewport="laptop" first={i === 0} />
            ))}
            <OmissionNote round={round} />
            <EndOfRound round={round} />
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="bg-paper">
      {/* The app's own bar, still holding only what it holds everywhere else.
          It fills with the spine as the masthead's name passes under it,
          which is MidScroll; a static page cannot draw the fade itself. */}
      <PhoneBar position="sticky" />
      {/* Full bleed: paper from edge to edge, no radius, no border, and the
          page background never shows on a phone. */}
      <div className="min-h-[788px] bg-paper pb-[var(--space-xxl)] text-[16px]">
        <Masthead round={round} />
        <div className="px-5">
          {questions.map((question, i) => (
            <QuestionBlock key={question.id} question={question} viewport="phone" first={i === 0} />
          ))}
          <OmissionNote round={round} />
          <EndOfRound round={round} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export const frontDoor: SketchDirection = {
  slug: "front-door",
  name: "You land in the Round",
  thesis:
    "A Catch-up opens on its newest Round, printed as one sheet of paper whose masthead folds up into the green bar, so the page you read is the page you navigate from, and the name at the top of it is the only way up.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
