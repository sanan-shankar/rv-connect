/* ------------------------------------------------------------------ *
 *  Direction 03, "Everyone under the question" (conversation).
 *
 *  Drawn from docs/planning/catchups-rework/directions/03-conversation.md
 *  section 3, "The reader, precisely", which is the only thing this file
 *  implements. Its numbers are followed to the pixel where it gives them;
 *  every place it is silent is marked JUDGMENT.
 *
 *  The bet, so a reader of this file can see it without the document: the
 *  unit of a Round is the QUESTION, not the answer. One paper card per
 *  question, and every one of the thirteen answers is a LINE inside it
 *  that begins with a name in semibold and a class year in the byline's
 *  small caps. No card around an answer, no rule between answers, no
 *  action row: the heart and the reply link float onto the last line as a
 *  magazine's end mark. On a phone the app's own green bar grows from 56
 *  to 76px and prints the Catch-up's name and the question you are in, so
 *  the question is named at every scroll depth in the app's own green.
 *
 *  Static, as the cull asks (../_types.ts). What S4 has to make real is
 *  the bar's question swapping as each heading passes under it, the sheet
 *  rising from the bar, the heart, one reply thread opening in place, the
 *  carousel and the viewer, and the rail's marker following the scroll
 *  (section 6). MidScroll and NavigatorOpen are the two states either
 *  side of the sheet.
 *
 *  SPACING: every --space-* token is em-based, so it only resolves to the
 *  direction's numbers (xs 6, s 10, m 16, l 26, xl 42) on an element
 *  whose own font-size is 16px. Tokens therefore go on containers that
 *  inherit the 16px base, never on a sized heading or on the 15px answer
 *  paragraph. Every card sets text-[16px] to guarantee it.
 * ------------------------------------------------------------------ */

import { ArrowUpRight, ChevronDown, Link2, Menu } from "lucide-react";
import { Heart, MusicNotes } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import { DesktopShell } from "../_shell";
import type {
  SketchDirection,
  SketchEntry,
  SketchPerson,
  SketchProps,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "../_types";

/* ---------- constants the direction names ------------------------- */

/** One promise for both measures: 288px of a phone column, 592px at 1512. */
const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** The byline register, character for character the string IdentityRow uses
 *  (identity-row.tsx, META_CLASS). "the byline's small caps (10.5px semibold
 *  at 0.07em, muted)" in the direction is this and nothing else. */
const CAPS = "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

/** Break 2: the phone bar grows from 56 to 76px and carries page content. */
const BAR_H = 76;

/** The page gutter on a phone. Not stated as a number, but forced by one that
 *  is: the direction fixes the answer's text column at 288px, and 288 = 390
 *  less two 16px gutters, less the card's own --space-m padding on each side,
 *  less the 28px bird column and its 10px gap. */
const PHONE_GUTTER = 16;

/** The reader column and the rail, and the 48px between them (section 3,
 *  "The desktop plan"). The pair is centred in what the sidebar leaves.
 *  JUDGMENT: the direction says "centred as a pair" and then gives x
 *  coordinates (column 300-980, rail 1028-1268) that are not centred against
 *  a 248px sidebar. The sentence wins over the illustration. */
const COLUMN_W = 680;
const RAIL_W = 240;

/** Deep in question 5, and where the mid-scroll screen picks the card up.
 *  MID_FROM is an index into that question's answers; MID_CUT is how much of
 *  the card sits above the top of the screen.
 *
 *  300 is chosen from what is actually in this Round rather than by taste:
 *  the ninth answer to question 5 carries an 864x1920 photograph, which the
 *  single-photograph rule draws at 288x384, and 300 lands the cut inside that
 *  384px block from any starting line count. So the screen opens on the lower
 *  half of a photograph, as a scrolled page does, and no estimate of where a
 *  paragraph breaks has to be right for it to. */
const MID_INDEX = 4;
const MID_FROM = 8;
const MID_CUT = 300;

/** The navigator's medium detent: 60% of 844 (section 3, "The green bar,
 *  open"). Eleven two-line rows come to more than this, so the sheet clips
 *  and scrolls, which is what the detent means. */
const SHEET_H = 506;

/* ---------- derivations ------------------------------------- */

/** "'23". Break 3: the batch sits INLINE after the name, shortened from
 *  "BATCH OF '23" to the alumni convention, so a one-word answer is one line.
 *  A member with no batch year prints the name alone. */
function batchTag(person: SketchPerson): string | null {
  return person.batchYear ? `’${String(person.batchYear).slice(-2)}` : null;
}

/** The one line under a question's heading. `asker` arrives null when the
 *  question was asked anonymously and you are not the asker (askerVisible,
 *  catchups-core.ts), so the four cases fall out of two fields.
 *  JUDGMENT: the fourth case, an asker who has since left the site, has no
 *  wording in the direction. It prints no line at all rather than claiming
 *  anonymity nobody chose. */
function askerLine(question: SketchQuestion): string | null {
  if (question.asker && question.showAsker) return `asked by ${question.asker.name}`;
  if (question.asker) return "asked by you, anonymously";
  if (!question.showAsker) return "asked anonymously";
  return null;
}

/** The end mark's second half. "a comment on what somebody said is a reply"
 *  (section 1, the departure from the architecture's RECOMMENDED wording). */
function replyLabel(count: number): string {
  if (count === 0) return "Reply";
  return count === 1 ? "1 reply" : `${count} replies`;
}

/** "That's all thirteen." The direction spells the number out, so this does.
 *  Past twenty it prints the digits; a Catch-up that big is not this one. */
const NUMBER_WORDS = [
  "none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
];
function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** The "what is next" line, at the end of the Round and at the foot of the
 *  rail (L-d, closed).
 *  JUDGMENT: this Catch-up's `nextOpensAt` is null on the live database, so
 *  the direction's "Round 2 opens 15 September" has no date behind it. Saying
 *  so beats printing an invented month under a real Round. */
function nextRoundLine(round: SketchRound): string {
  const next = round.number + 1;
  return round.nextOpensAt
    ? `Round ${next} opens ${new Date(round.nextOpensAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`
    : `Round ${next} does not have a date yet.`;
}

/* ---------- a member's words -------------------------------------- */

/** renderRichText does not linkify a bare url, so the raw body is split
 *  around one and only the non-url runs go through the sanitiser. A regex
 *  over its OUTPUT would be a second parser of HTML, which is the thing
 *  rich-text.ts exists to avoid; the url itself goes through React, which
 *  escapes it. */
const URL_SPLIT = /(https?:\/\/[^\s]+)/g;

/** Which pasted links become our own card. Everything else is a chip. */
function mediaSource(url: string): { label: string; wide: boolean } | null {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host === "open.spotify.com") return { label: "Spotify", wide: false };
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be")
    return { label: "YouTube", wide: true };
  if (host === "music.apple.com") return { label: "Apple Music", wide: false };
  return null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Every link in an answer, in order, and the first one we can draw a card
 *  from. "the first music or video link in it, and every later link in the
 *  same answer is a chip" (2.10). */
function linksIn(body: string): { all: string[]; card: string | null } {
  const all = body.match(URL_SPLIT) ?? [];
  return { all, card: all.find((u) => mediaSource(u)) ?? null };
}

/** Up to three emoji and nothing else print at 24px on the name line, "as
 *  Messages does" (section 3, "How they pack"). The variation selector and
 *  the zero-width joiner are written as escapes on purpose: both are
 *  invisible in a source file, and a regex whose behaviour depends on a
 *  character nobody can see in the diff is a trap. */
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u;
function emojiOnly(body: string): boolean {
  if (!body || !EMOJI_ONLY.test(body)) return false;
  return [...body.matchAll(/\p{Extended_Pictographic}/gu)].length <= 3;
}

/* ---------- the end mark ------------------------------------------ */

/** Break 6. The heart and the reply link are the mark that says the answer is
 *  over, not an action row: `LoveButton` at `sm` (14px glyph, the count
 *  beside it), eight pixels later "Reply" at 12px semibold muted.
 *
 *  Drawn, not wired: the real LoveButton needs a server action, and the cull
 *  is static. Everything else about it is copied off love-button.tsx's `sm`
 *  variant rather than approximated, because the whole point of the mark is
 *  that it is the app's one heart in an unfamiliar place: the Phosphor glyph
 *  at 14px, `fill` when loved and `duotone` at 0.45 when not, hardcoded to
 *  #E03A33 so it is painted on the first frame and can never tween through
 *  black, gap-1, px-1.5 py-0.5, the count at 12px, red when loved.
 *
 *  20px tall to the eye, 44px to a thumb: the padding that buys the touch
 *  target is cancelled by an equal negative margin, so the float's own box
 *  stays 20px and the line it lands on does not grow. */
function EndMark({ entry }: { entry: SketchEntry }) {
  const loved = entry.lovedByViewer;
  return (
    <span className="inline-flex items-center" style={{ height: 20, lineHeight: "20px" }}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] tabular-nums",
          loved ? "text-heart" : "text-muted-foreground"
        )}
        style={{ paddingTop: 15, paddingBottom: 15, marginTop: -15, marginBottom: -15 }}
      >
        <Heart size={14} weight={loved ? "fill" : "duotone"} color="#E03A33" style={{ opacity: loved ? 1 : 0.45 }} />
        {entry.loveCount}
      </span>
      <span className="ml-2 text-[12px] font-semibold text-muted-foreground">
        {replyLabel(entry.commentCount)}
      </span>
    </span>
  );
}

/** The mark on the last line of the text. A float placed AFTER the text in
 *  source order is laid out on the line box it occurs in, which is the last
 *  one, and drops to a line of its own when that line has no room for it --
 *  which is the direction's rule, expressed by the layout rather than by a
 *  character count guessing where a line breaks. */
function FloatedEndMark({ entry }: { entry: SketchEntry }) {
  return (
    <span style={{ float: "right", marginLeft: 12 }}>
      <EndMark entry={entry} />
    </span>
  );
}

/** The mark under a photograph or a card: its own line, right-aligned, 8px
 *  below (section 3, "With one photograph"). */
function BlockEndMark({ entry }: { entry: SketchEntry }) {
  return (
    <div className="mt-2 flex justify-end">
      <EndMark entry={entry} />
    </div>
  );
}

/* ---------- the song card ----------------------------------------- */

/* INVENTED, and the only invented content in this file besides the reply
   COUNTS the contract already supplies. Four answers to question 5 carry a
   pasted Spotify or YouTube link whose resolver has never run: `entry.song`
   is null on every one of them, so there is no title and no artist in the
   data to print. The card the direction draws needs both, so a fixed pair is
   taken from this list by hashing the entry id, which keeps it stable between
   renders. None of these is a song any member named. The LINK under it is
   theirs and is untouched. */
const INVENTED_SONGS = [
  { title: "Slow Hill Road", artist: "Anandi Ram" },
  { title: "Second Monsoon", artist: "The Rock Ledge" },
  { title: "Paper Kites at Noon", artist: "Vivan Suri" },
  { title: "Nothing Rhymes With August", artist: "Bela Nandy" },
  { title: "Two Weeks in Coorg", artist: "Mira Sethi" },
];
function inventedSong(id: string): { title: string; artist: string } {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return INVENTED_SONGS[h % INVENTED_SONGS.length];
}

/** "the text column's width up to 440px, 76px tall, 12px radius, hairline
 *  border on the card's own paper (no fill, so a card with four songs in it
 *  still has no wells)". A video takes a 100 by 56 frame instead of the 56px
 *  square, and the provider's mark sits at the right end with an up-right
 *  arrow. Never the provider's iframe.
 *
 *  JUDGMENT: the direction is silent on the card's padding and inner gap.
 *  76 less the 56px art leaves 20, so 10px all round; 12px between the art
 *  and the text, which is the gap the answer grid uses at 1512. */
function SongCard({ entry, url }: { entry: SketchEntry; url: string }) {
  const source = mediaSource(url);
  const resolved = entry.song;
  const invented = inventedSong(entry.id);
  const title = resolved?.title ?? invented.title;
  const artist = resolved ? hostOf(url) : invented.artist;
  const art = resolved?.art ?? null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="state-layer mt-2 flex h-[76px] w-full items-center rounded-[var(--radius-md)] border border-border p-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ maxWidth: 440 }}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-mist",
          source?.wide ? "h-14 w-[100px]" : "h-14 w-14"
        )}
      >
        {art ? (
          <img src={art} alt="" className="h-full w-full object-cover" />
        ) : (
          <MusicNotes size={22} weight="duotone" className="text-leaf" />
        )}
      </span>
      <span className="ml-3 min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">{title}</span>
        <span className="mt-1 block truncate text-[13px] leading-tight text-muted-foreground">{artist}</span>
      </span>
      <span className={cn("ml-3 inline-flex shrink-0 items-center gap-1", CAPS)}>
        {source?.label ?? hostOf(url)}
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </span>
    </a>
  );
}

/** A second link in the same answer: a pill with the page's mark and its host
 *  at 13px. JUDGMENT: the direction asks for a 16px favicon and the page
 *  title, and a static sketch has neither, so the link glyph and the host
 *  stand in for them. */
function LinkChip({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="state-layer mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[13px] text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Link2 className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{hostOf(url)}</span>
    </a>
  );
}

/* ---------- photographs ------------------------------------------- */

/** One photograph spans the text column at 12px, one rung under the card, and
 *  runs at its true shape through the single-photograph rule. Two or more go
 *  into the shared carousel at 390 (one photograph per flick, which is CSS
 *  scroll snapping and needs no script) and into one justified row at 1512. */
function Photos({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  if (entry.images.length === 0) return null;

  if (entry.images.length === 1) {
    return (
      <div className="mt-2 overflow-hidden rounded-[var(--radius-md)]">
        <PhotoFrame
          src={entry.images[0]}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          fallbackClassName="aspect-[4/3]"
        />
      </div>
    );
  }

  if (viewport === "phone") {
    return (
      <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entry.images.map((src, i) => (
          <div key={src} className="w-full shrink-0 snap-center overflow-hidden rounded-[var(--radius-md)]">
            <PhotoFrame src={src} photo={entry.photos[i] ?? null} sizes={PHOTO_SIZES} fallbackClassName="aspect-[4/3]" />
          </div>
        ))}
      </div>
    );
  }

  const measured =
    entry.photos.length === entry.images.length && entry.photos.every(Boolean)
      ? (entry.photos as StoredPhoto[])
      : null;
  if (!measured) {
    /* Never measured: a two-up rather than a guessed shape that would move the
       page as each file lands. */
    return (
      <div className="mt-2 grid grid-cols-2 gap-1 overflow-hidden rounded-[var(--radius-md)]">
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
      className="mt-2 overflow-hidden rounded-[var(--radius-md)]"
    >
      {(_photo, i, cell) => (
        <img
          src={entry.images[i]}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition, maxHeight: cell.maxHeight }}
        />
      )}
    </PhotoRows>
  );
}

/* ---------- the answer line --------------------------------------- */

/** Break 1, and the whole direction: an answer is not a card, it is a row of
 *  a grid. A 28px column for the bird, a 10px gap (12 at 1512), and a text
 *  column of 288px (592 at 1512) that is one paragraph flow beginning with
 *  the name. The text wraps under ITSELF, never under the bird, so the bird
 *  column stays a clean line of birds down the card.
 *
 *  Break 4: 15px/1.6 at 390 against the scale's 1rem, because the measure is
 *  288px and density is the bet. It returns to 16px at 1512. */
function AnswerLine({
  entry,
  viewport,
}: {
  entry: SketchEntry;
  viewport: SketchViewport;
}) {
  const body = entry.body?.trim() ?? "";
  const { all, card } = linksIn(body);
  /* "An answer that is nothing but a url prints the card and no url" -- only
     when there IS a card to print instead of it. A lone link to something we
     cannot draw stays a leaf link, which is section 7's answer for the dead
     Spotify id and the unknown host. */
  const bodyIsOnlyUrl = Boolean(card) && all.length === 1 && all[0] === body;
  /* Chips are the links AFTER the one that got the card. An answer with no
     card has no chips: its links have already printed inline. */
  const chips = card ? all.slice(all.indexOf(card) + 1) : [];
  const hasMedia = Boolean(card) || entry.images.length > 0 || chips.length > 0;
  const blank = !body && entry.images.length === 0;
  const emoji = emojiOnly(body);
  const tag = batchTag(entry.author);

  const parts = bodyIsOnlyUrl ? [] : body.split(URL_SPLIT);

  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 1fr)",
        columnGap: viewport === "phone" ? 10 : 12,
      }}
    >
      <span className="pt-[2px]">
        <BirdAvatar user={entry.author} size={28} />
      </span>
      {/* The text column. The paragraph holds only the words, and a
          photograph or a card is its SIBLING rather than its child: a block
          inside a <p> closes the <p> in the parser, which would take the
          float's containing block with it. */}
      <div className="min-w-0">
        {/* flow-root, so the end mark's float is contained by the paragraph it
            belongs to instead of leaking onto the next answer. Not overflow
            hidden, which would clip the mark on a line that only just fits. */}
        <p
          className={cn(
            "whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]",
            viewport === "phone" ? "text-[15px] leading-[1.6]" : "text-[16px] leading-[1.6]"
          )}
          style={{ display: "flow-root" }}
        >
          <span className="font-semibold">{entry.author.name}</span>
          {tag && (
            /* Five pixels after the name, on the same baseline. */
            <span className={CAPS} style={{ marginLeft: 5 }}>
              {tag}
            </span>
          )}
          {blank ? (
            <span className="text-muted-foreground" style={{ marginLeft: 6 }}>
              left this blank
            </span>
          ) : emoji ? (
            <span className="text-[24px] leading-[1]" style={{ marginLeft: 6 }}>
              {body}
            </span>
          ) : (
            /* Six pixels after the batch, then the answer's first word. */
            <span style={{ marginLeft: 6 }}>
              {parts.map((part, i) =>
                /* String.split with one capture group alternates: the odd
                   indices are the links. A pasted url prints in leaf and is
                   allowed to break anywhere, so a 123-character one wraps
                   inside the column instead of panning the page. */
                i % 2 === 1 ? (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noreferrer"
                    className="text-leaf underline underline-offset-2"
                  >
                    {part}
                  </a>
                ) : (
                  <span key={i} dangerouslySetInnerHTML={{ __html: renderRichText(part) }} />
                )
              )}
            </span>
          )}
          {/* The end mark sits on the last line of the text only when nothing
              follows the text. A photograph or a card pushes it to its own
              line beneath, right-aligned. */}
          {!hasMedia && <FloatedEndMark entry={entry} />}
        </p>
        {hasMedia && (
          <>
            <Photos entry={entry} viewport={viewport} />
            {card && <SongCard entry={entry} url={card} />}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((u) => (
                  <LinkChip key={u} url={u} />
                ))}
              </div>
            )}
            <BlockEndMark entry={entry} />
          </>
        )}
      </div>
    </article>
  );
}

/* ---------- a question's card ------------------------------------- */

function QuestionCard({
  question,
  viewport,
  from = 0,
  minHeight,
}: {
  question: SketchQuestion;
  viewport: SketchViewport;
  /** Where to pick the conversation up, for the mid-scroll screen. */
  from?: number;
  minHeight?: number;
}) {
  const asked = askerLine(question);
  const entries = question.entries.slice(from);
  return (
    <article
      className="card-elevated rounded-[var(--radius)] border border-border bg-card text-[16px]"
      style={{
        padding: viewport === "phone" ? "var(--space-m)" : "var(--space-l)",
        minHeight,
      }}
    >
      {/* No number in front of it, as many lines as it needs. */}
      <h2
        className={cn(
          "font-heading tracking-[-0.02em] text-foreground",
          viewport === "phone" ? "text-[1.5rem] leading-[1.15]" : "text-[1.7rem] leading-[1.15]"
        )}
      >
        {question.text}
      </h2>
      {asked && (
        /* Eight pixels under the heading. Written in px, not --space-xs,
           because this element's own font-size is 13 and the token is em. */
        <p className="text-[13px] text-muted-foreground" style={{ marginTop: 8 }}>
          {asked}
        </p>
      )}
      {/* Sixteen pixels under that, the conversation begins. No rule. */}
      <div
        className="flex flex-col"
        style={{
          marginTop: 16,
          gap: viewport === "phone" ? "var(--space-s)" : "var(--space-m)",
        }}
      >
        {entries.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">Nobody took this one.</p>
        ) : (
          entries.map((entry) => <AnswerLine key={entry.id} entry={entry} viewport={viewport} />)
        )}
      </div>
    </article>
  );
}

/* ---------- the masthead ------------------------------------------ */

/** The cover's fields, larger. It scrolls away and nothing sticks from it:
 *  the two facts that matter at depth, the name and the Round number, are
 *  carried by the green bar on a phone and by the rail at 1512. */
function Masthead({ round, viewport }: { round: SketchRound; viewport: SketchViewport }) {
  const phone = viewport === "phone";
  const cast = phone ? round.contributors.slice(0, 5) : round.contributors;
  const rest = round.contributors.length - cast.length;
  return (
    <header>
      <h1
        className={cn(
          "font-heading tracking-[-0.025em] text-foreground",
          phone ? "text-[30px] leading-[1.05]" : "text-[41px] leading-[1.02]"
        )}
      >
        {round.catchupName}
      </h1>
      {/* Eight pixels under the name. */}
      <p className="text-[14px] text-muted-foreground" style={{ marginTop: 8 }}>
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      {/* Sixteen under that. */}
      <p className={CAPS} style={{ marginTop: 16 }}>
        Wrote in
      </p>
      {/* Six under the label. Pairs, 12px apart across, 6px down. */}
      <div className="flex flex-wrap items-center" style={{ marginTop: 6, columnGap: 12, rowGap: 6 }}>
        {cast.map((person) => (
          <span key={person.id} className="inline-flex items-center" style={{ gap: 6 }}>
            <BirdAvatar user={person} size={28} />
            <span className="text-[14px] font-semibold text-foreground">{person.name}</span>
          </span>
        ))}
        {rest > 0 && (
          <span className="text-[13px] text-leaf underline underline-offset-2">and {rest} others</span>
        )}
      </div>
    </header>
  );
}

/* ---------- the green bar ----------------------------------------- */

/** Break 2, and the direction's Action Button moment: the shell's 56px bar
 *  grows to 76 and prints the Catch-up's name and the question you are in.
 *  Canopy geometry copied from PhoneBar (_shell.tsx); everything else is this
 *  page's.
 *
 *  Laid out with absolute offsets rather than flex because the direction
 *  gives the boxes by coordinate: the menu at the left, the two lines from
 *  x=56 to x=296, the counter from x=296 to x=382.
 *
 *  The hit zones are not drawn, because a static sketch cannot show them:
 *  line one is the way up (full bar width by 32px, to the home) and the
 *  question is the navigator (full width by 44px). */
function GreenBar({
  round,
  question,
  index,
}: {
  round: SketchRound;
  /** null above the first card, before any question has passed under it. */
  question: SketchQuestion | null;
  index: number;
}) {
  return (
    <header
      className="relative w-full bg-sidebar text-white"
      style={{ height: BAR_H }}
    >
      <span className="absolute grid h-9 w-9 place-items-center rounded-full" style={{ left: 12, top: 20 }}>
        <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>

      <span className="absolute" style={{ left: 56, top: 0, width: 240 }}>
        {/* y 8 to 32. The label register, white at 80%. */}
        <span
          className="flex items-center text-[10.5px] font-semibold uppercase tracking-[0.07em]"
          style={{ height: 24, marginTop: 8, color: "rgba(255,255,255,0.8)" }}
        >
          {metaLine(round.catchupName, `Round ${round.number}`)}
        </span>
        {/* y 32 to 76: the question, clamped to two lines. */}
        <span className="flex items-center" style={{ height: 44 }}>
          <span className="line-clamp-2 text-[13.5px] font-semibold leading-[17px] text-white">
            {question
              ? question.text
              : `${round.questions.length} questions · ${round.contributors.length} wrote in`}
          </span>
        </span>
      </span>

      {/* x 296 to 382, aligned with the question lines. Blank above the first
          card, which is why it is drawn only when a question is named. */}
      {question && (
        <span
          className="absolute flex items-center justify-end gap-1"
          style={{ left: 296, top: 32, width: 86, height: 44, color: "rgba(255,255,255,0.8)" }}
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em]">
            {index + 1} of {round.questions.length}
          </span>
          <ChevronDown className="h-[14px] w-[14px]" aria-hidden />
        </span>
      )}
    </header>
  );
}

/* ---------- the navigator ----------------------------------------- */

/** Break 5: a bottom sheet is new material. Float white, 20.8px top corners,
 *  the layered ink shadow, a 36 by 5px grabber, the medium detent at 506px,
 *  and the dialog's own backdrop behind it (#241a12 at 55%, blurred; only
 *  opacity animates, so there is nothing here a static drawing loses).
 *
 *  Eleven rows: the number in a 24px column, the question in Baskerville
 *  15px/1.3 clamped to two lines, the count of answers at the right. The
 *  current row carries a 2px leaf bar and full ink; the rest are ink at 70%.
 *  No weight changes, so nothing reflows when the current row moves. */
function NavigatorSheet({ round, current }: { round: SketchRound; current: number }) {
  return (
    <div className="absolute inset-0 z-50">
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ backgroundColor: "rgba(36,26,18,0.55)" }}
        aria-hidden
      />
      <div
        className="card-elevated absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[20.8px] bg-float text-[16px]"
        style={{ height: SHEET_H }}
      >
        <span className="mx-auto mt-2 block h-[5px] w-9 rounded-full bg-foreground/20" aria-hidden />
        <p className={cn("px-4", CAPS)} style={{ marginTop: 14 }}>
          {metaLine(`Round ${round.number}`, `${round.questions.length} questions`)}
        </p>
        <ul style={{ marginTop: 8 }}>
          {round.questions.map((question, i) => {
            const active = i === current;
            return (
              <li key={question.id} className="relative">
                <span className="state-layer flex min-h-[46px] items-start gap-1 px-4 py-3">
                  {active && (
                    <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-leaf" aria-hidden />
                  )}
                  <span className="w-6 shrink-0 pt-[2px] text-[12px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "line-clamp-2 min-w-0 flex-1 font-heading text-[15px] leading-[1.3]",
                      active ? "text-foreground" : "text-foreground/70"
                    )}
                  >
                    {question.text}
                  </span>
                  <span className="w-6 shrink-0 pt-[2px] text-right text-[12px] tabular-nums text-muted-foreground">
                    {question.entries.length}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ---------- the rail (1512) --------------------------------------- */

/** The way back at every depth, and the navigator standing open beside the
 *  page. Sticky 24px from the top. Weight never changes with the marker, only
 *  colour, so item 5 never wraps under the cursor. */
function Rail({ round, current }: { round: SketchRound; current: number }) {
  return (
    <aside className="sticky top-6 self-start text-[16px]" style={{ width: RAIL_W }}>
      <span className="block font-heading text-[18px] leading-tight tracking-[-0.02em] text-foreground">
        {round.catchupName}
      </span>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      <ul style={{ marginTop: 16 }}>
        {round.questions.map((question, i) => {
          const active = i === current;
          return (
            <li key={question.id} className="relative">
              <span className="state-layer flex items-start gap-1 rounded-[var(--radius-sm)] py-1.5 pl-3 pr-1">
                {active && (
                  <span className="absolute bottom-1.5 left-0 top-1.5 w-[2px] bg-leaf" aria-hidden />
                )}
                <span className="w-5 shrink-0 text-[13px] leading-[1.35] tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 min-w-0 flex-1 text-[13px] leading-[1.35]",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {question.text}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] text-muted-foreground">{nextRoundLine(round)}</p>
    </aside>
  );
}

/* ---------- the end of the Round ---------------------------------- */

/** Forty pixels under the last card, no card around it. The first line is the
 *  one line on this screen allowed to sound like a person, and it is spent on
 *  a title. */
function EndOfRound({ round }: { round: SketchRound }) {
  return (
    <footer style={{ marginTop: 40 }}>
      <p className="font-heading text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground">
        That&rsquo;s all {numberWord(round.contributors.length)}.
      </p>
      <p className="mt-2 text-[14px] text-muted-foreground">{nextRoundLine(round)}</p>
      <p className="mt-2 text-[14px] text-leaf underline underline-offset-2">{round.catchupName}</p>
    </footer>
  );
}

/** The sketch's own annotation, not the page's. */
function OmissionNote({ round }: { round: SketchRound }) {
  return (
    <p className="mt-4 text-[12px] italic text-muted-foreground">
      Questions 4 to {round.questions.length} are omitted from this sketch.
    </p>
  );
}

/* ---------- the two phone screens --------------------------------- */

/** Deep in question 5, picked up MID_CUT pixels below the top of its card, so
 *  the screen opens on the lower half of one answer's photograph exactly as a
 *  scrolled page does. The card is given a floor taller than the frame so its
 *  bottom edge can never appear: the drawing is a slice of a card that holds
 *  thirteen answers, not a card of five. */
function DeepPage({ round }: { round: SketchRound }) {
  const question = round.questions[MID_INDEX];
  if (!question) return null;
  return (
    <div
      className="absolute"
      style={{ top: -MID_CUT, left: PHONE_GUTTER, right: PHONE_GUTTER }}
    >
      <QuestionCard question={question} viewport="phone" from={MID_FROM} minHeight={MID_CUT + 900} />
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const question = round.questions[MID_INDEX] ?? null;
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <DeepPage round={round} />
      {/* Everything the direction calls fixed is absolute inside the frame:
          the frame is the containing block, and `fixed` would escape it. */}
      <div className="absolute inset-x-0 top-0 z-40">
        <GreenBar round={round} question={question} index={MID_INDEX} />
      </div>
    </div>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  const question = round.questions[MID_INDEX] ?? null;
  return (
    <div className="relative h-full overflow-hidden bg-background">
      <DeepPage round={round} />
      <div className="absolute inset-x-0 top-0 z-40">
        <GreenBar round={round} question={question} index={MID_INDEX} />
      </div>
      <NavigatorSheet round={round} current={MID_INDEX} />
    </div>
  );
}

/* ---------- the reader, from the top ------------------------------ */

function Reader({ round, viewport }: SketchProps) {
  const questions = round.questions.slice(0, 3);

  if (viewport === "laptop") {
    return (
      <DesktopShell>
        {/* The shell pads to y 32; the direction starts the masthead at 24. */}
        <div className="-mt-2 flex justify-center gap-12 text-[16px]">
          <div className="shrink-0" style={{ width: COLUMN_W }}>
            <Masthead round={round} viewport="laptop" />
            {/* 26px under the cast to the first card, and between cards. */}
            <div className="flex flex-col" style={{ marginTop: 26, gap: "var(--space-l)" }}>
              {questions.map((question) => (
                <QuestionCard key={question.id} question={question} viewport="laptop" />
              ))}
            </div>
            <OmissionNote round={round} />
            <EndOfRound round={round} />
          </div>
          <Rail round={round} current={0} />
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="bg-background">
      {/* The bar in its "above the first card" state. It is `sticky` on a real
          phone; in a natural-height drawing it simply sits where it would
          first appear, which is what the contract asks for. */}
      <GreenBar round={round} question={null} index={0} />
      <div className="pb-10 text-[16px]" style={{ paddingLeft: PHONE_GUTTER, paddingRight: PHONE_GUTTER }}>
        {/* y 100: 24px under the 76px bar. */}
        <div style={{ paddingTop: 24 }}>
          <Masthead round={round} viewport="phone" />
        </div>
        {/* y 320: 24px under the cast. */}
        <div className="flex flex-col" style={{ marginTop: 24, gap: "var(--space-l)" }}>
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} viewport="phone" />
          ))}
        </div>
        <OmissionNote round={round} />
        <EndOfRound round={round} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export const conversation: SketchDirection = {
  slug: "conversation",
  name: "Everyone under the question",
  thesis:
    "The question is the only card and every answer is a line inside it that begins with a name, so a Round reads as eleven conversations instead of 133 tiles, and a reply is one more line.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
