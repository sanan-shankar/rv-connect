/* ------------------------------------------------------------------ *
 *  Direction 05, "Covers that draw themselves" (shelf).
 *
 *  Drawn from docs/planning/catchups-rework/directions/05-shelf.md
 *  section 3, "The reader, precisely", which is the only part of that
 *  document this file implements. Section 2's opening ("The cover, once")
 *  is implemented too, but only as far as the colophon needs it: one
 *  cover, at 120 by 160, drawn both ways.
 *
 *  The three bets, so a reader of this file does not have to open the
 *  document: a Round's picture is DERIVED (its most-hearted photograph
 *  that survives a 3:4 crop, or the birds of everyone who wrote in); the
 *  reader is a SHEET OF PAPER with no card around any answer, because the
 *  magazine has to print from the same grammar; and the phone's whole
 *  navigation is a FOLIO at the foot of the screen, the way a printed
 *  page carries its own page number, the question and the way up.
 *
 *  Static, as the cull asks (../_types.ts). What the S4 room has to make
 *  real: the folio fading in past the masthead and following the scroll,
 *  the contents sheet at its two detents, the scrub along the tick strip,
 *  "and 9 others" opening in place, and comments opening in place. What
 *  is drawn here are the resting states either side of those.
 *
 *  SPACING. The --space-* tokens are em-based, so they only land on the
 *  direction's ladder (xxs 4, xs 6, s 10, m 16, l 26, xl 42, xxl 68,
 *  3xl 110) on an element whose own font-size is 16px. Half the things
 *  here set their own size (a 13px muted line, a 24px heading), so the
 *  token goes on containers that inherit 16px and the SPACE table below
 *  is used everywhere else. Same ladder, same numbers, no drift.
 *
 *  SQUARE CORNERS are not an oversight: section 4, break 1. Everything
 *  printed is square (the plates, the sheet on desktop, the photographs,
 *  the song card's art); everything pressed stays a pill.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react/dist/ssr";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { MetaDots } from "@/components/common/meta-dots";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows, PhotoStream } from "@/components/common/photo-rows";
import { renderRichText } from "@/lib/rich-text";
import { cn, formatDisplayDateLong, metaLine, VALLEY_TIME_ZONE } from "@/lib/utils";
import { framePhoto, type StoredPhoto } from "@/lib/photo-layout";
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

/* ---------- the ladders the direction names ----------------------- */

/** Section 2's space ladder at a 16px root, in pixels. See the header. */
const SPACE = { xxs: 4, xs: 6, s: 10, m: 16, l: 26, xl: 42, xxl: 68, xxxl: 110 } as const;

/** "Label type" throughout the direction: 12px uppercase at 0.08em.
 *  JUDGMENT: the weight is not given. Semibold, because at 12px on paper a
 *  regular capital line reads as body text that happened to shout. */
const LABEL = "text-[12px] font-semibold uppercase tracking-[0.08em]";

/** "The byline line": the app's existing 10.5px capitals under a name,
 *  character for character the string IdentityRow uses. */
const CAPS = "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground";

/** The measure is 350px on a phone and 624px on the desktop sheet; one
 *  promise covers both, and PhotoRows folds each photograph's own cap in. */
const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

/** Square, per section 4's first break. 2px rather than 0 is the
 *  direction's own number: a printed edge, not a knife edge. */
const SQUARE = "rounded-[2px]";

/** An answer shorter than this, with no photograph and no link, prints on
 *  the byline's own line (section 3, "The short form"): 24 characters on a
 *  phone, 60 on desktop. */
const SHORT_MAX = { phone: 24, laptop: 60 } as const;

/** The short form is refused for a name over this, because the name alone
 *  then takes the row (section 7, "A 78-character name"). */
const SHORT_NAME_MAX = 32;

/** A photograph counts as surviving a 3:4 crop when it is portrait or
 *  square. JUDGMENT: 3:4 is 0.75 and a square is 1.0, so the test is
 *  "ratio at most 1", with 2 percent of slack for a 1004x1000 file that
 *  is a square everywhere except in its metadata. */
const PLATE_RATIO_MAX = 1.02;

/* ---------- small derivations ------------------------------------- */

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** "15 September", on the valley's clock like every other date in the app. */
function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "long",
  });
}

/** Two names then "and N others", so the line is always the same shape
 *  (section 2, "The label"). */
function wroteIn(contributors: SketchPerson[]): string {
  const [a, b] = contributors;
  if (!a) return "Nobody wrote in";
  if (!b) return a.name;
  if (contributors.length === 2) return `${a.name} and ${b.name}`;
  return `${a.name}, ${b.name} and ${contributors.length - 2} others`;
}

/** The colophon's sentence. A Round nobody wrote in says so instead. */
function wroteInSentence(contributors: SketchPerson[]): string {
  return contributors.length === 0
    ? "Nobody wrote in for this Round."
    : `${wroteIn(contributors)} wrote in.`;
}

/** The one line that says what is next, in the colophon and in the rail.
 *  JUDGMENT: a Catch-up whose next date has not been set gets the sentence
 *  without a date rather than a row that is not there. */
function nextRoundLine(round: SketchRound): string {
  return round.nextOpensAt
    ? `Round ${round.number + 1} opens ${dayMonth(round.nextOpensAt)}.`
    : `Round ${round.number + 1} does not have a date yet.`;
}

/** "asked by X · 13 answers". The shipped reader's three cases, kept:
 *  a visible asker, an asker only its own author can see, and no asker at
 *  all (a question from the library, or one whose author is gone). */
function askedLine(q: SketchQuestion): string {
  const who = q.asker
    ? q.showAsker
      ? `asked by ${q.asker.name}`
      : "asked by you, anonymously"
    : "asked anonymously";
  const n = q.entries.length;
  return metaLine(who, `${n} ${n === 1 ? "answer" : "answers"}`);
}

const URL_RE = /https?:\/\/[^\s<]+/;

/** An answer's body split around its first link, so the link can be a real
 *  link and the sentence either side of it can still go through the
 *  composer's renderer. renderRichText does not linkify a bare URL. */
function splitAroundLink(body: string): { before: string; url: string; after: string } | null {
  const m = URL_RE.exec(body);
  if (!m) return null;
  return { before: body.slice(0, m.index), url: m[0], after: body.slice(m.index + m[0].length) };
}

/** The mark at the end of a song card. */
function sourceOf(url: string): { label: string; wide: boolean } {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.endsWith("spotify.com")) return { label: "Spotify", wide: false };
    if (host.endsWith("youtube.com") || host === "youtu.be") return { label: "YouTube", wide: true };
    return { label: host, wide: false };
  } catch {
    return { label: "Link", wide: false };
  }
}

/* INVENTED, and the only invented words in this file besides the two
   comments in the well below. Four answers in question 5 carry a pasted
   music link in their body, and nothing has ever resolved one of them:
   `entry.song` is null on every one, so the card the direction describes
   has no title, no artist and no art to print. These stand in for them,
   picked by a stable hash of the entry's id so a card does not change
   between renders. The LINK under each card is the member's own; only the
   title, the artist and the art are made up. The first two are the
   direction's own samples (section 3, "With a song link"). */
const INVENTED_SONGS = [
  { title: "Straight Line Was A Lie", artist: "Alex G" },
  { title: "Pasoori", artist: "Ali Sethi, Shae Gill" },
  { title: "The Night We Met", artist: "Lord Huron" },
  { title: "Aaoge Jab Tum", artist: "Ustad Rashid Khan" },
  { title: "Motion Sickness", artist: "Phoebe Bridgers" },
  { title: "Kabhi Kabhie Mere Dil Mein", artist: "Lata Mangeshkar" },
] as const;

/* INVENTED, and labelled here for the same reason. Comments do not exist
   yet (D7), so the one open well in this sketch needs words to hold. They
   are deliberately about nothing: nothing here can be read as something a
   member actually said about what they wrote. */
const INVENTED_COMMENTS = [
  { text: "Been meaning to ask you about this one.", when: "yesterday" },
  { text: "Same here, more or less.", when: "3 days ago" },
] as const;

/* ---------- the derived cover ------------------------------------- */

type CoverPick = { src: string; photo: StoredPhoto | null };

/**
 * The Round's picture, chosen the way section 2 chooses it: the
 * most-hearted photograph that survives a 3:4 crop, then the most-hearted
 * of any shape. Hearts are counted on the ANSWER, which is the only count
 * the data has; the direction speaks of a photograph's hearts, and until a
 * photograph carries its own the answer's is the honest stand-in.
 *
 * Ties keep the order they appear in the Round, because Array.sort is
 * stable, so this Round's cover is the same cover on every render.
 */
function coverPhoto(round: SketchRound): CoverPick | null {
  const all: { src: string; photo: StoredPhoto | null; loveCount: number }[] = [];
  for (const q of round.questions) {
    for (const e of q.entries) {
      e.images.forEach((src, i) => all.push({ src, photo: e.photos[i] ?? null, loveCount: e.loveCount }));
    }
  }
  if (all.length === 0) return null;
  const byHearts = [...all].sort((a, b) => b.loveCount - a.loveCount);
  const upright = byHearts.find((p) => p.photo && p.photo.width / p.photo.height <= PLATE_RATIO_MAX);
  return upright ?? byHearts[0];
}

/**
 * The flock's grid. The direction's ladder (40px in two columns up to six
 * writers, 32px in four up to fifteen, 26px in five past that, stopping at
 * thirty) is given for a list plate 171px wide.
 *
 * JUDGMENT: the only flock this sketch draws stands on a 120px colophon
 * cover, where four 32px birds do not fit across 104px of paper. What is
 * kept is the ladder's RATIO to the plate, not its pixel value, so the
 * plate looks the same at every size it is drawn at.
 */
function flockPlan(count: number, plateWidth: number): { size: number; gap: number } {
  const base = count <= 6 ? 40 : count <= 15 ? 32 : 26;
  const k = plateWidth / 171;
  return { size: Math.max(14, Math.round(base * k)), gap: Math.max(3, Math.round(6 * k)) };
}

/**
 * One cover: the plate and the label, section 2's "The cover, once".
 *
 * The plate is 3:4, paper, square-cornered, carrying the .card-elevated
 * shadow so it stands off the page, with the nameplate band in Libre
 * Baskerville across the top and the picture edge to edge beneath it.
 * Text on a plate is ink on paper and never white on a photograph, so no
 * scrim is drawn anywhere here.
 *
 * JUDGMENT: the direction gives plate SIZES but not the nameplate's type
 * size at each one. These are tuned at 120 wide (the colophon's size, the
 * only one drawn here) and scale from there, so the same component draws
 * the list's 171 and Now's 156 without re-deciding anything.
 */
function Cover({
  round,
  width,
  flock = false,
  note,
}: {
  round: SketchRound;
  width: number;
  /** Draw the birds instead of the photograph: what this Round's cover
   *  would be if nobody had posted a picture. */
  flock?: boolean;
  /** A line of the sketch's own, under the label, saying which of the two
   *  this is. Not part of the design. */
  note?: string;
}) {
  const height = Math.round((width * 4) / 3);
  const k = width / 120;
  const pad = Math.round(8 * k);
  const pick = flock ? null : coverPhoto(round);
  const writers = round.contributors.slice(0, 30);
  const plan = flockPlan(round.contributors.length, width);
  const frame = pick?.photo ? framePhoto(pick.photo) : null;
  const upright = pick?.photo ? pick.photo.width / pick.photo.height <= PLATE_RATIO_MAX : false;

  return (
    <div style={{ width }}>
      <div
        className={cn("card-elevated relative flex flex-col overflow-hidden bg-paper", SQUARE)}
        style={{ width, height }}
      >
        <div style={{ padding: pad, paddingBottom: Math.round(6 * k) }}>
          <p
            className="font-heading text-ink"
            style={{ fontSize: Math.round(14 * k), lineHeight: 1.1, letterSpacing: "-0.02em" }}
          >
            Round {round.number}
          </p>
          <p
            className="uppercase text-muted-foreground"
            style={{ fontSize: Math.max(7, 8.5 * k), letterSpacing: "0.08em", marginTop: 2 * k, fontWeight: 600 }}
          >
            {formatDisplayDateLong(round.publishedAt)}
          </p>
        </div>

        <div className="relative min-h-0 flex-1">
          {pick && upright ? (
            /* A portrait or a square: cropped to fill the plate's slot.
               JUDGMENT on the aim. framePhoto answers "one photograph, one
               column" and its slot is 3:4 only for a photograph TALLER than
               3:4, where its vertical aim is exactly right and is used. A
               photograph between 3:4 and square is being cut sideways here,
               which the app's own rule never does, so the stored focal x is
               used and braked into the middle band the way AIM_Y brakes the
               other axis: the worst a bad guess can do is a centre crop. */
            <img
              src={pick.src}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              style={{
                objectPosition:
                  pick.photo && pick.photo.width / pick.photo.height < 0.75
                    ? (frame?.objectPosition ?? "50% 50%")
                    : `${Math.round(Math.min(0.65, Math.max(0.35, pick.photo?.focalX ?? 0.5)) * 100)}% 50%`,
              }}
            />
          ) : pick ? (
            /* A landscape that won: tipped into the cover at its true shape,
               centred, paper above and below. Never cropped to the slot. */
            <div className="flex h-full items-center">
              <img
                src={pick.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full object-cover"
                style={{ aspectRatio: pick.photo ? `${pick.photo.width} / ${pick.photo.height}` : "4 / 3" }}
              />
            </div>
          ) : (
            /* The flock: the birds of everyone who wrote in, standing on the
               paper in rows, like a plate in a field guide. */
            <div
              className="flex h-full flex-wrap content-center items-center justify-center"
              style={{ gap: plan.gap, padding: pad }}
            >
              {writers.map((p) => (
                <BirdAvatar key={p.id} user={p} size={plan.size} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* The label: left-aligned to the plate's edge, never on the plate. */}
      <p className="mt-2 line-clamp-2 text-[13px] leading-[1.35] text-ink">{wroteIn(round.contributors)}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{round.questions.length} questions</p>
      {note && <p className="mt-1 text-[12px] italic leading-[1.35] text-muted-foreground">{note}</p>}
    </div>
  );
}

/* ---------- the pieces of an entry -------------------------------- */

/** The shared heart, drawn rather than wired: the red never changes, the
 *  count sits beside it, and the button's own padding is cancelled so the
 *  glyph sits on the measure's left edge (section 3, "The heart"). */
function HeartMark({ entry }: { entry: SketchEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Heart
        className="h-[18px] w-[18px]"
        style={{
          color: "#E03A33",
          fill: entry.lovedByViewer ? "#E03A33" : "none",
          /* The resting weight the LoveButton uses on a warm surface. */
          opacity: entry.lovedByViewer ? 1 : 0.45,
        }}
        aria-hidden
      />
      <span className="text-[14px] tabular-nums text-muted-foreground">{entry.loveCount}</span>
    </span>
  );
}

function commentsLabel(n: number): string {
  return `${n} ${n === 1 ? "comment" : "comments"}`;
}

/** The song card: art at the left, title, artist, source. No border and no
 *  fill; the art carries the shadow and the whole row is the link. */
function SongCard({ url, title, artist, art }: { url: string; title: string; artist: string | null; art: string | null }) {
  const source = sourceOf(url);
  const w = source.wide ? 100 : 56;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="state-layer -mx-1.5 mt-[10px] flex items-center gap-3 px-1.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {art ? (
        <img
          src={art}
          alt=""
          className={cn("shrink-0 object-cover shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]", SQUARE)}
          style={{ width: w, height: 56 }}
        />
      ) : (
        <span
          className={cn("grid shrink-0 place-items-center bg-mist text-leaf shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]", SQUARE)}
          style={{ width: w, height: 56 }}
        >
          <MusicNotes size={24} weight="duotone" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{title}</span>
        {artist && <span className="block truncate text-[13px] text-muted-foreground">{artist}</span>}
        <span className={cn("mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground", "font-semibold uppercase tracking-[0.08em]")}>
          {source.label}
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </span>
    </a>
  );
}

/** The comments, open in place: a mist well under the heart line, indented
 *  38px so it hangs under the text and not under the bird. It is the one
 *  recessed surface on the sheet and the one thing the magazine leaves out,
 *  and it looks like it. Drawn open on exactly one entry, so the cull can
 *  see the well; every other entry shows the collapsed count. */
function CommentWell({ entry, others }: { entry: SketchEntry; others: SketchPerson[] }) {
  return (
    <div
      className="ml-[38px] rounded-[var(--radius-md)] bg-mist"
      style={{ marginTop: SPACE.s, padding: SPACE.m }}
    >
      <div className="flex flex-col" style={{ gap: SPACE.s }}>
        {INVENTED_COMMENTS.slice(0, Math.max(1, Math.min(2, entry.commentCount))).map((c, i) => {
          const who = others[i] ?? others[0];
          if (!who) return null;
          return (
            <div key={c.text} className="flex items-start gap-2">
              <BirdAvatar user={who} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-[1.5] text-ink">
                  <span className="font-semibold">{who.name}</span> {c.text}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Heart className="h-[14px] w-[14px]" style={{ color: "#E03A33", fill: "none", opacity: 0.45 }} aria-hidden />
                  <span>{c.when}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {/* Bordered paper inside the well, so the one-mist-per-card rule holds:
          a pill in the same mist would be a second mist on a mist. */}
      <div className="mt-3 rounded-full border border-border bg-paper px-4 py-2 text-[14px] text-muted-foreground">
        Reply
      </div>
    </div>
  );
}

/** A photograph, or three. One is PhotoFrame's rule unchanged; several are
 *  justified rows at the direction's 8px gap, which on a 350px measure sets
 *  two portraits side by side at 171 by 228 and puts the landscape on its
 *  own row at 350 by 262, exactly as section 3 says it should. */
function Photos({ entry }: { entry: SketchEntry }) {
  if (entry.images.length === 0) return null;
  if (entry.images.length === 1) {
    return (
      <div style={{ marginTop: SPACE.s }}>
        <PhotoFrame
          src={entry.images[0]}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          className={SQUARE}
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
    /* Never measured, so there is no shape to solve a row from: the two-up
       the shipped reader falls back to, rather than a guess that would move
       the page once the bytes land. */
    return (
      <div className="grid grid-cols-2 gap-2" style={{ marginTop: SPACE.s }}>
        {entry.images.map((src) => (
          <img key={src} src={src} alt="" loading="lazy" className={cn("aspect-square w-full object-cover", SQUARE)} />
        ))}
      </div>
    );
  }
  return (
    <PhotoRows photos={measured} gap={8} columnSizes={PHOTO_SIZES} className="mt-[10px]">
      {(_photo, i, cell) => (
        <img
          src={entry.images[i]}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("h-full w-full object-cover", SQUARE)}
          style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition, maxHeight: cell.maxHeight }}
        />
      )}
    </PhotoRows>
  );
}

/** A photo wall: the block any question can carry, printed as justified
 *  rows across the sheet's full width, edge to edge on a phone, each
 *  photograph with its byline under it and a heart. Nothing is cropped. */
function PhotoWall({ entries, viewport }: { entries: SketchEntry[]; viewport: SketchViewport }) {
  const cells = entries
    .filter((e) => e.images.length > 0)
    .map((entry) => ({
      entry,
      shape: entry.photos[0] ?? { width: 4, height: 3, focalX: 0.5, focalY: 0.5, blurDataUrl: null },
    }));
  if (cells.length === 0) return null;
  return (
    <PhotoStream
      photos={cells.map((c) => c.shape)}
      gap={8}
      targetHeight={viewport === "phone" ? "160px" : "220px"}
      as="ul"
      className={viewport === "phone" ? "-mx-5" : "-mr-12"}
      keyOf={(_p, i) => cells[i].entry.id}
    >
      {(_photo, i, cell) => {
        const { entry } = cells[i];
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
            <span className="mt-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <BirdAvatar user={entry.author} size={28} />
                <span className="truncate text-[13px] text-ink">{entry.author.name}</span>
              </span>
              <HeartMark entry={entry} />
            </span>
          </>
        );
      }}
    </PhotoStream>
  );
}

/**
 * An entry: the tile's content without the tile. Bird, name, batch,
 * answer, heart, comment count, separated from its neighbours by 26px of
 * paper and by nothing else. The bird at the left edge of the measure is
 * the separator the eye uses.
 */
function Entry({
  entry,
  kind,
  viewport,
  openComments,
  others,
}: {
  entry: SketchEntry;
  kind: SketchQuestion["kind"];
  viewport: SketchViewport;
  /** The one entry in the sketch whose comments are drawn open. */
  openComments?: boolean;
  others: SketchPerson[];
}) {
  const body = entry.body?.trim() ?? "";
  const split = splitAroundLink(body);
  const song =
    entry.song ??
    (split
      ? {
          url: split.url,
          ...INVENTED_SONGS[hash(entry.id) % INVENTED_SONGS.length],
          art: null as string | null,
        }
      : kind === "songs" && body
        ? { url: "", title: body, artist: null as string | null, art: null as string | null }
        : null);
  const artist = song && "artist" in song ? (song.artist as string | null) : null;
  const nothing = !body && entry.images.length === 0 && !song;

  const short =
    body.length > 0 &&
    body.length <= SHORT_MAX[viewport] &&
    entry.images.length === 0 &&
    !split &&
    !entry.song &&
    kind !== "songs" &&
    entry.author.name.length <= SHORT_NAME_MAX;

  const name = (
    <Link
      href={`/profile/${entry.author.id}`}
      className="text-[15px] font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {entry.author.name}
    </Link>
  );

  if (short) {
    /* The short form. The whole answer is one line: bird, name, batch, the
       text, and the heart pushed to the right edge of the measure with the
       comment count folded into it. The tile that was three centimetres
       tall with 15 percent of it used is this. */
    return (
      <article className="flex items-baseline gap-2">
        <span className="shrink-0 self-center">
          <BirdAvatar user={entry.author} size={28} />
        </span>
        {name}
        <span className={cn(CAPS, "shrink-0")}>{entry.author.batchLine}</span>
        <span className="min-w-0 flex-1 text-[16px] leading-[1.65] text-ink [overflow-wrap:anywhere]">{body}</span>
        <span className="flex shrink-0 items-center gap-1 self-center">
          <HeartMark entry={entry} />
          {entry.commentCount > 0 && (
            <>
              <span className="dotsep" aria-hidden>
                ·
              </span>
              <span className="text-[13px] text-muted-foreground">{entry.commentCount}</span>
            </>
          )}
        </span>
      </article>
    );
  }

  return (
    <article className="text-[16px]">
      <div className="flex items-center">
        <BirdAvatar user={entry.author} size={28} />
        <span className="ml-[10px] flex min-w-0 items-baseline gap-2">
          {name}
          <span className={CAPS}>{entry.author.batchLine}</span>
        </span>
      </div>

      {nothing ? (
        <p className="text-[14.5px] italic leading-[1.65] text-muted-foreground" style={{ marginTop: SPACE.xs }}>
          Showed up for this Round without adding anything here.
        </p>
      ) : (
        <>
          {body && kind !== "songs" && (
            <p
              className="whitespace-pre-wrap text-[16px] leading-[1.65] text-ink [overflow-wrap:anywhere]"
              style={{ marginTop: SPACE.xs, maxWidth: viewport === "laptop" ? 590 : undefined }}
            >
              {split ? (
                <>
                  {/* The sentence is never rewritten: the link stays where the
                      member put it, leaf and underlined, breakable anywhere,
                      and the card sits under it. */}
                  <span dangerouslySetInnerHTML={{ __html: renderRichText(split.before) }} />
                  <a
                    href={split.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-leaf underline [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {split.url}
                  </a>
                  <span dangerouslySetInnerHTML={{ __html: renderRichText(split.after) }} />
                </>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: renderRichText(body) }} />
              )}
            </p>
          )}
          <Photos entry={entry} />
          {song && (
            <div style={{ maxWidth: viewport === "laptop" ? 590 : undefined }}>
              {song.url ? (
                <SongCard url={song.url} title={song.title} artist={artist} art={song.art} />
              ) : (
                /* A songs question, where people type a name and there is
                   nothing to open: the same row, no link, no source mark. */
                <div className="-mx-1.5 mt-[10px] flex items-center gap-3 px-1.5 py-1">
                  <span className={cn("grid h-14 w-14 shrink-0 place-items-center bg-mist text-leaf", SQUARE)}>
                    <MusicNotes size={24} weight="duotone" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{song.title}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-1.5" style={{ marginTop: SPACE.xs }}>
        <MetaDots
          parts={[
            <HeartMark key="heart" entry={entry} />,
            entry.commentCount > 0 ? (
              <span key="c" className="text-[13px] text-muted-foreground">
                {commentsLabel(entry.commentCount)}
              </span>
            ) : null,
          ]}
        />
      </div>

      {openComments && entry.commentCount > 0 && (
        <CommentWell entry={entry} others={others.filter((p) => p.id !== entry.author.id)} />
      )}
    </article>
  );
}

/** A question is a section, and it opens like one: 68px of paper above it
 *  on a phone, 110 on desktop, so each question reads as a fresh page
 *  without being one. No number, no "Q1", no eyebrow: the number lives in
 *  the folio, the rail and the contents, where it is navigation. */
function QuestionSection({
  question,
  viewport,
  openCommentsOn,
  others,
}: {
  question: SketchQuestion;
  viewport: SketchViewport;
  openCommentsOn?: string;
  others: SketchPerson[];
}) {
  const phone = viewport === "phone";
  return (
    <section style={{ marginTop: phone ? SPACE.xxl : SPACE.xxxl }}>
      <h2
        className="font-heading text-ink"
        style={{ fontSize: phone ? 24 : 27.2, lineHeight: 1.15, letterSpacing: "-0.02em" }}
      >
        {question.text}
      </h2>
      <p className="text-[13px] text-muted-foreground" style={{ marginTop: SPACE.xs }}>
        {askedLine(question)}
      </p>

      {question.entries.length === 0 ? (
        <p className="text-[14px] italic text-muted-foreground" style={{ marginTop: SPACE.l }}>
          Nobody answered this one.
        </p>
      ) : question.kind === "photo" ? (
        <div style={{ marginTop: SPACE.l }}>
          <PhotoWall entries={question.entries} viewport={viewport} />
        </div>
      ) : (
        <div className="flex flex-col text-[16px]" style={{ marginTop: SPACE.l, gap: SPACE.l }}>
          {question.entries.map((e) => (
            <Entry
              key={e.id}
              entry={e}
              kind={question.kind}
              viewport={viewport}
              openComments={e.id === openCommentsOn}
              others={others}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- the masthead and the colophon ------------------------- */

/** Printed from the cover's fields and nothing else. Nothing under it: no
 *  rule, no birds row, no chip row, no "13 of the group wrote in". */
function Masthead({ round, viewport }: { round: SketchRound; viewport: SketchViewport }) {
  const phone = viewport === "phone";
  const name = round.catchupName;
  /* 2.6rem, stepping down at 24 and 48 characters, so an 80-character name
     is three lines at 24px rather than seven at 42. */
  const size = name.length > 48 ? 24 : name.length > 24 ? 32 : 41.6;
  const shown = round.contributors.slice(0, phone ? 4 : 6);
  const rest = round.contributors.length - shown.length;
  const dateline = metaLine(
    `Round ${round.number}`,
    formatDisplayDateLong(round.publishedAt),
    `${round.questions.length} questions`
  );

  return (
    <header>
      {phone ? (
        <>
          <h1
            className="font-heading text-ink"
            style={{ fontSize: size, lineHeight: 1.05, letterSpacing: "-0.025em" }}
          >
            {name}
          </h1>
          <p className={cn(LABEL, "text-muted-foreground")} style={{ marginTop: SPACE.xs }}>
            {dateline}
          </p>
        </>
      ) : (
        /* On desktop the nameplate and the dateline share a baseline. */
        <div className="flex items-baseline justify-between gap-6">
          <h1
            className="font-heading text-ink"
            style={{ fontSize: size, lineHeight: 1.05, letterSpacing: "-0.025em" }}
          >
            {name}
          </h1>
          <p className={cn(LABEL, "shrink-0 text-muted-foreground")}>{dateline}</p>
        </div>
      )}

      {/* Who wrote in: an inline wrapped list, a 28px bird then the name,
          6px between them and 14px after each, so four names take two or
          three lines at 350px. */}
      <div className="flex flex-wrap items-center" style={{ marginTop: SPACE.m, rowGap: 8 }}>
        {shown.map((p) => (
          <Link
            key={p.id}
            href={`/profile/${p.id}`}
            className="mr-[14px] flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BirdAvatar user={p} size={28} />
            <span className="text-[15px] text-ink">{p.name}</span>
          </Link>
        ))}
        {rest > 0 && (
          /* A text control: tapping it opens the rest in place, same shape,
             auto-animated. Static here, which is what the cull asks for. */
          <span className="text-[15px] text-leaf">and {rest} others</span>
        )}
      </div>
    </header>
  );
}

/** The end of the Round: the one centred thing on the sheet. */
function Colophon({ round }: { round: SketchRound }) {
  return (
    <div className="text-center text-[16px]" style={{ marginTop: SPACE.xxxl }}>
      <Link
        href={`/catchups/${round.catchupId}`}
        className="font-heading text-[1.5rem] text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {round.catchupName}
      </Link>
      <p className={cn(LABEL, "text-muted-foreground")} style={{ marginTop: SPACE.xs }}>
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      <p className="text-[15px] text-ink" style={{ marginTop: SPACE.m }}>
        {wroteInSentence(round.contributors)}
      </p>
      <p className="text-[14px] text-muted-foreground" style={{ marginTop: SPACE.xxs }}>
        {nextRoundLine(round)}
      </p>

      <div style={{ marginTop: SPACE.xl }}>
        <p className={cn(LABEL, "text-muted-foreground")}>Also on the shelf</p>
        {/* The sketch's own note, not part of the design: this Catch-up has
            one Round, so the block would be absent here. The Round's own
            cover is drawn instead, both ways, so the cull can see what a
            derived cover looks like at all. */}
        <p className="mx-auto mt-1.5 max-w-[300px] text-[12px] italic leading-[1.4] text-muted-foreground">
          This Catch-up has one Round, so this block would be absent. Its own cover is drawn here instead, both ways.
        </p>
        <div className="mt-4 flex justify-center gap-5 text-left">
          <Cover round={round} width={120} note="Drawn from its photographs." />
          <Cover round={round} width={120} flock note="The same Round with no photographs in it." />
        </div>
      </div>
    </div>
  );
}

/* ---------- the navigator ----------------------------------------- */

/**
 * The folio: the bottom of a page, not a bar and not a pill.
 *
 * On a real phone this is fixed to the bottom of the screen with the
 * sheet's own paper fading in over the 20px above it, hidden while the
 * masthead is on screen and again on the colophon. Inside a 844px frame it
 * is `absolute`, because the frame is transformed and `fixed` would answer
 * to the window instead (../_frame.tsx).
 */
function Folio({ round, index, absolute }: { round: SketchRound; index: number; absolute?: boolean }) {
  const question = round.questions[index];
  return (
    <div className={cn("z-30", absolute && "absolute inset-x-0 bottom-0")}>
      {/* The paper fade, so the text behind the folio dims rather than stops. */}
      <div className="h-5 bg-gradient-to-b from-paper/0 to-paper" />
      <div className="bg-paper px-5 pb-3">
        {/* The tick strip: one tick per question, the current one 2px and
            full ink, the others at 30 percent. Eleven read as a thumb index
            down the edge of a book. */}
        <div className="flex items-end justify-between" style={{ height: 6 }}>
          {round.questions.map((q, i) => (
            <span
              key={q.id}
              style={{
                width: i === index ? 2 : 1,
                height: 6,
                background: "var(--ink)",
                opacity: i === index ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center" style={{ height: 22 }}>
          <span className={cn(LABEL, "shrink-0 text-ink")}>{round.catchupName}</span>
          <span className="mx-3 min-w-0 flex-1 truncate text-center font-heading text-[14px] italic text-ink">
            {question?.text}
          </span>
          <span className={cn(LABEL, "shrink-0 text-leaf")}>
            {index + 1} / {round.questions.length}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The contents: a nonmodal sheet at the medium detent, 439px of 844, with
 *  no scrim, so the page behind stays exactly as it was. */
function Contents({ round, index }: { round: SketchRound; index: number }) {
  /* The list opens scrolled so the current row sits second from the top: on
     question 5 you see rows 4 through 10 and the grabber invites the rest.
     Static, so the list simply starts at row 4 and the sheet clips. */
  const from = Math.max(0, index - 1);
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[20.8px] border border-border bg-float shadow-[0_-1px_2px_rgba(30,28,22,0.06),0_-24px_48px_-24px_rgba(30,28,22,0.45)]"
      style={{ height: 439 }}
    >
      <div className="flex justify-center pt-2.5">
        <span className="h-[5px] w-9 rounded-full bg-ink/20" />
      </div>
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <span className="font-heading text-[17px] text-ink">{round.catchupName}</span>
        <span className={cn(LABEL, "text-muted-foreground")}>
          {metaLine(`Round ${round.number}`, dayMonth(round.publishedAt))}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-5">
        {round.questions.slice(from).map((q, i) => {
          const n = from + i;
          const current = n === index;
          return (
            <div key={q.id} className="relative flex min-h-[52px] items-start gap-3 py-3">
              {current && (
                <span className="absolute -left-3 top-[22px] h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden />
              )}
              <span className={cn(LABEL, "w-6 shrink-0 pt-[3px] text-leaf")}>{n + 1}</span>
              {/* The current row is ink where the others are muted, weight
                  unchanged, so nothing reflows as you move through them. */}
              <span
                className={cn(
                  "line-clamp-2 min-w-0 flex-1 font-heading text-[15px] leading-[1.3]",
                  current ? "text-ink" : "text-muted-foreground"
                )}
              >
                {q.text}
              </span>
              <span className="shrink-0 pt-[3px] text-[13px] tabular-nums text-muted-foreground">
                {q.entries.length}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The rail on desktop: sticky at top 32, 240 wide, from x=1040 to 1280.
 *  It carries the way up at every depth, so no Back button exists. */
function Rail({ round, index }: { round: SketchRound; index: number }) {
  return (
    <aside className="sticky top-8 w-[240px] shrink-0 self-start text-[16px]">
      <Link
        href={`/catchups/${round.catchupId}`}
        className="font-heading text-[18px] text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {round.catchupName}
      </Link>
      <p className={cn(LABEL, "mt-1 text-muted-foreground")}>
        {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
      </p>
      <div className="flex flex-col" style={{ marginTop: SPACE.m }}>
        {round.questions.map((q, i) => {
          const current = i === index;
          return (
            <div key={q.id} className="relative flex items-start gap-2.5 py-2">
              {current && (
                <span className="absolute -left-3 top-[13px] h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden />
              )}
              <span className={cn(LABEL, "w-4 shrink-0 pt-[3px] text-leaf")}>{i + 1}</span>
              <span
                className={cn(
                  "line-clamp-2 min-w-0 flex-1 text-[14px] font-medium leading-[1.35]",
                  current ? "text-ink" : "text-muted-foreground"
                )}
              >
                {q.text}
              </span>
              <span className="shrink-0 pt-[3px] text-[13px] tabular-nums text-muted-foreground">
                {q.entries.length}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[13px] text-muted-foreground" style={{ marginTop: SPACE.l }}>
        {nextRoundLine(round)}
      </p>
    </aside>
  );
}

/* ---------- the three drawings ------------------------------------ */

/** Which entry gets its comments drawn open: the first one in the second
 *  question that has any, so the well is visible without being the first
 *  thing on the page. */
function firstCommented(round: SketchRound): string | undefined {
  const q = round.questions[1] ?? round.questions[0];
  return q?.entries.find((e) => e.commentCount >= 2)?.id;
}

function PhoneReader({ round }: { round: SketchRound }) {
  const questions = round.questions.slice(0, 3);
  const openOn = firstCommented(round);
  return (
    <div className="bg-paper text-[16px] text-ink">
      <PhoneBar position="sticky" />
      <div className="overflow-x-clip px-5 pt-6">
        <Masthead round={round} viewport="phone" />
        {questions.map((q) => (
          <QuestionSection
            key={q.id}
            question={q}
            viewport="phone"
            openCommentsOn={openOn}
            others={round.contributors}
          />
        ))}
        <p className="text-[13px] italic text-muted-foreground" style={{ marginTop: SPACE.xl }}>
          Questions 4 to {round.questions.length} are omitted from this sketch.
        </p>
        <Colophon round={round} />
        <div style={{ height: SPACE.xl }} />
      </div>
      {/* THE FOLIO IS NOT WHERE IT LIVES. On a phone it is fixed to the
          bottom of the screen at every depth between the first question and
          the colophon, which is what MidScroll draws. This tall page has no
          screen to fix it to, so it is printed once at the foot, naming the
          last question drawn, and that is the only reason it is here. */}
      <Folio round={round} index={2} />
    </div>
  );
}

function LaptopReader({ round }: { round: SketchRound }) {
  const questions = round.questions.slice(0, 3);
  const openOn = firstCommented(round);
  return (
    <DesktopShell>
      {/* 720 + 32 + 240 = 992 from x=288: the sheet from 288 to 1008, the
          rail from 1040 to 1280, and the last 232px is page. */}
      <div className="flex items-start gap-8">
        <div className={cn("card-elevated w-[720px] shrink-0 overflow-x-clip bg-paper text-[16px] text-ink", SQUARE)} style={{ padding: 48 }}>
          <Masthead round={round} viewport="laptop" />
          {questions.map((q) => (
            <QuestionSection
              key={q.id}
              question={q}
              viewport="laptop"
              openCommentsOn={openOn}
              others={round.contributors}
            />
          ))}
          <p className="text-[13px] italic text-muted-foreground" style={{ marginTop: SPACE.xl }}>
            Questions 4 to {round.questions.length} are omitted from this sketch.
          </p>
          <Colophon round={round} />
        </div>
        <Rail round={round} index={0} />
      </div>
    </DesktopShell>
  );
}

function Reader({ round, viewport }: SketchProps) {
  return viewport === "laptop" ? <LaptopReader round={round} /> : <PhoneReader round={round} />;
}

/** The page behind both phone screens: question 5, entered part way down,
 *  starting at the first answer that carries a pasted link so the four song
 *  cards are all in the flow. The offset cuts the top entry's byline off
 *  under the green bar, which is what being mid-question looks like. */
function DeepInQuestionFive({ round }: { round: SketchRound }) {
  const question = round.questions[4] ?? round.questions[round.questions.length - 1];
  const entries = question?.entries ?? [];
  const linked = entries.findIndex((e) => e.body && URL_RE.test(e.body));
  const from = linked >= 0 ? linked : 0;
  return (
    <div className="absolute inset-x-0 top-14 px-5 text-[16px]" style={{ marginTop: -72 }}>
      <div className="flex flex-col" style={{ gap: SPACE.l }}>
        {entries.slice(from, from + 12).map((e) => (
          <Entry key={e.id} entry={e} kind={question.kind} viewport="phone" others={round.contributors} />
        ))}
      </div>
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  return (
    <div className="relative h-[844px] w-[390px] overflow-hidden bg-paper text-ink">
      <DeepInQuestionFive round={round} />
      <PhoneBar position="absolute" />
      <Folio round={round} index={4} absolute />
    </div>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  return (
    <div className="relative h-[844px] w-[390px] overflow-hidden bg-paper text-ink">
      {/* The same page, unchanged and unscrimmed: the contents takes part of
          the screen and the rest of it stays where it was. The folio sits
          under the sheet at this detent, so it is not drawn twice. */}
      <DeepInQuestionFive round={round} />
      <PhoneBar position="absolute" />
      <Contents round={round} index={4} />
    </div>
  );
}

export const shelf: SketchDirection = {
  slug: "shelf",
  name: "Covers that draw themselves",
  thesis:
    "Every Round earns a cover from what is in it, the list and the home are shelves of those covers, and the reader is the first page of the thing that could be printed, so the web Round and the magazine share one grammar.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
