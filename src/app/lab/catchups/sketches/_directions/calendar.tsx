/* ------------------------------------------------------------------ *
 *  "The calendar keeps it", drawn for the cull.
 *
 *  Source: docs/planning/catchups-rework/directions/02-calendar.md,
 *  section 3 ("The reader, precisely"). Every number below that looks
 *  arbitrary is from that section: the 56px bar with the name in it, the
 *  masthead's y=76/118/148/204, the 58px navigator with a track whose
 *  segments are proportional to each question's height, the 32x2 cinnamon
 *  dash over every heading, the two answer densities, and the end block
 *  with the next date circled by a drawn pen stroke.
 *
 *  What the direction breaks on purpose (its section 4, and D36 allows
 *  it): the sheet runs edge to edge on a phone with no radius, margin or
 *  shadow; the green bar prints a page title; an answer has no box.
 *
 *  Three departures this file made on its own, all reported:
 *   - no `vw` anywhere. The display size is 31px on the phone and 41.6px
 *     on the laptop, hard-coded, because a clamp() with 5vw inside a
 *     ScaledFrame answers to the real window and would print the phone
 *     drawing at the laptop's size.
 *   - the identity row keeps the shipped IdentityRow's 10.5px byline
 *     rather than the direction's 0.6875rem, a 0.5px difference against a
 *     primitive whose own comment forbids re-deriving that number.
 *   - `position: absolute` for everything the direction calls fixed,
 *     which is the contract in _types.ts.
 *
 *  Members' words come from the live Round and stay on this admin page.
 *  Nothing here writes anything.
 * ------------------------------------------------------------------ */

import { ChevronUp, Heart, Menu, Music, Play } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { IdentityRow } from "@/components/common/identity-row";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows, PhotoStream } from "@/components/common/photo-rows";
import { renderRichText } from "@/lib/rich-text";
import { formatDisplayDateLong, metaLine, VALLEY_TIME_ZONE } from "@/lib/utils";
import type { StoredPhoto } from "@/lib/photo-layout";
import { DesktopShell } from "../_shell";
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

/* ---------------------------------------------------------------- *
 *  Numbers the direction gives, in one place.
 * ---------------------------------------------------------------- */

const BAR_H = 56; // the green bar
const NAV_H = 58; // the navigator, resting
const PHONE_W = 390;
const PHONE_PAD = 20; // so the measure is 350
const DESK_PAD = 40; // so the measure is 600
const SHEET_W = 680;
const LEFT_RAIL = 232;
const RIGHT_RAIL = 200;
const GUTTER = 36;

const SPACE = {
  xs: "var(--space-xs)",
  s: "var(--space-s)",
  m: "var(--space-m)",
  l: "var(--space-l)",
  xl: "var(--space-xl)",
  xxl: "var(--space-xxl)",
} as const;

const PHOTO_SIZES = "(max-width: 640px) 100vw, 640px";

const LEAF_BUTTON =
  "rounded-[3px] text-[0.875rem] font-semibold text-leaf hover:underline active:opacity-70 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const CANOPY_PILL =
  "state-layer inline-flex h-11 items-center rounded-full bg-canopy px-5 text-[0.9375rem] font-semibold text-white active:scale-[0.98] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/* ---------------------------------------------------------------- *
 *  Dates, names, cadence.
 * ---------------------------------------------------------------- */

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const dayOf = (d: string) =>
  Number(new Date(d).toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, day: "numeric" }));

const monthYearLabel = (d: string) =>
  new Date(d)
    .toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, month: "long", year: "numeric" })
    .toUpperCase();

const monthLabel = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, month: "long" }).toUpperCase();

const weekdayOf = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, weekday: "long" });

/** "6 October", for the navigator sheet's last row. */
const dayMonth = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, day: "numeric", month: "long" });

function cadencePhrase(cadence: string): string {
  const c = cadence.toLowerCase();
  if (c.includes("fortnight") || c.includes("biweek") || c.includes("two")) return "Every two weeks";
  if (c.includes("term")) return "Every term";
  if (c.includes("quarter")) return "Every term";
  if (c.includes("week")) return "Every week";
  return "Every month";
}

/** The batch year as the line-density row wants it: "'11", or nothing. */
const shortBatch = (p: SketchPerson) => (p.batchYear ? `'${String(p.batchYear).slice(2)}` : "");

/**
 * The next date, and whether it is real.
 *
 * `nextOpensAt` is null on this Round, so the sketch invents one: 52 days
 * after publication, which on a Round that came out on 15 August lands on
 * 6 October, the date the direction itself prints throughout section 3.
 * The drawing says so in its note at the foot rather than pretending.
 */
function nextDate(round: SketchRound): { iso: string; invented: boolean } {
  if (round.nextOpensAt) return { iso: round.nextOpensAt, invented: false };
  const d = new Date(round.publishedAt);
  d.setDate(d.getDate() + 52);
  return { iso: d.toISOString(), invented: true };
}

/* ---------------------------------------------------------------- *
 *  The pen circle.
 *
 *  An ellipse 1.2x the numeral's width and 1.1x its height, open at the
 *  top right where the pen lifted, drawn as one SVG path and scaled to
 *  whatever the numeral is set at. Never a border-radius: the direction
 *  is explicit that this is illustration, in the same standing as the
 *  bird glyphs, and a rounded box would read as a badge.
 * ---------------------------------------------------------------- */

function CircledDate({ day, size }: { day: number | string; size: number }) {
  const digits = String(day).length;
  /* Libre Baskerville's digit advance is about 0.62em and its cap height
     about 0.70em. Estimated rather than measured, because measuring would
     make this a client effect and the drawing is static. */
  const numeralW = digits * 0.62 * size;
  const numeralH = 0.7 * size;
  const rx = 0.6 * numeralW;
  const ry = 0.55 * numeralH;
  /* Scaled from the hero's 2.5px at 88px, with a floor: at the 40px the
     end-of-Round block uses, the true scale would be 1.1px and the stroke
     stops reading as a pen. */
  const stroke = Math.max(1.75, (2.5 * size) / 88);
  const pad = stroke + 3;
  const w = 2 * rx + 2 * pad;
  const h = 2 * ry + 2 * pad;
  const cx = w / 2;
  const cy = h / 2;
  const at = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [cx + rx * Math.cos(r), cy - ry * Math.sin(r)] as const;
  };
  const [sx, sy] = at(78); // the pen comes down just left of the top
  const [ex, ey] = at(18); // and lifts before it gets back there
  const d = `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`;

  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: w, height: h }}>
      <svg
        aria-hidden
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
        /* A few degrees off true, the way a circle drawn by hand round a
           date on a wall calendar sits. */
        style={{ transform: "rotate(-5deg)" }}
      >
        <path
          d={d}
          fill="none"
          stroke="var(--cinnamon)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative font-heading leading-none tracking-[-0.025em] text-foreground"
        style={{ fontSize: size, transform: `translateY(${(size * 0.035).toFixed(1)}px)` }}
      >
        {day}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- *
 *  The green bar, with the Catch-up's name in it.
 *
 *  Not <PhoneBar>: the whole of break 4 in the direction's section 4 is
 *  that this bar stops being the app's lockup and becomes the name of the
 *  thing you are inside, which is also the way up. Same 56px canopy
 *  geometry, same menu button, different contents.
 * ---------------------------------------------------------------- */

function GreenBar({ name, position = "static" }: { name: string; position?: "static" | "absolute" }) {
  return (
    <header
      className="z-40 flex w-full items-center gap-1 bg-sidebar px-3 text-sidebar-foreground"
      style={{ position, top: 0, left: 0, height: BAR_H }}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full">
        <Menu className="h-5 w-5" strokeWidth={2} />
      </span>
      <button
        type="button"
        className="state-layer inline-flex h-9 items-center rounded-full px-2 text-[1rem] font-semibold text-white focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {name}
      </button>
    </header>
  );
}

/* ---------------------------------------------------------------- *
 *  Who wrote in, as chips.
 * ---------------------------------------------------------------- */

function WriterChips({ people, show = 5 }: { people: SketchPerson[]; show?: number }) {
  const shown = people.slice(0, show);
  const rest = people.length - shown.length;
  return (
    <div className="flex flex-wrap items-center" style={{ columnGap: 12, rowGap: 0 }}>
      {shown.map((p) => (
        <button
          key={p.id}
          type="button"
          className="state-layer inline-flex h-7 items-center gap-1 rounded-full pr-1.5 text-[0.875rem] text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <BirdAvatar user={p} size={20} />
          {firstName(p.name)}
        </button>
      ))}
      {rest > 0 && (
        <button
          key="others"
          type="button"
          className="state-layer inline-flex h-7 items-center rounded-full px-1.5 text-[0.875rem] font-semibold text-leaf focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          and {rest} others
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  The action line: the heart, then 16px, then the comments.
 *
 *  A drawing of <LoveButton>, not the real one, which needs an action.
 *  The count of comments is `entry.commentCount`, invented upstream in
 *  _data.ts and stable per answer; no comment TEXT is drawn anywhere in
 *  this sketch, because comments are collapsed until tapped and tapping
 *  belongs to the room, not the cull.
 * ---------------------------------------------------------------- */

function ActionLine({ entry, inline = false }: { entry: SketchEntry; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-4 ${inline ? "shrink-0" : "h-8"}`}>
      <span className="inline-flex items-center gap-1.5">
        <Heart
          className={`h-5 w-5 ${entry.lovedByViewer ? "fill-heart text-heart" : "text-muted-foreground"}`}
          strokeWidth={1.9}
        />
        <span className="text-[0.875rem] text-muted-foreground">{entry.loveCount}</span>
      </span>
      <button type="button" className={LEAF_BUTTON}>
        {entry.commentCount === 0
          ? "Comment"
          : entry.commentCount === 1
            ? "1 comment"
            : `${entry.commentCount} comments`}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  A pasted link's card.
 *
 *  The direction's own card, not <SpotifyCard>: 80px tall, the full
 *  measure, a hairline and 12px radius because it is a different object
 *  from the text around it, art at the left, the source word at the far
 *  right. The artist line only prints where the data has one, which is
 *  never on this Round, so the title sits alone rather than under an
 *  invented name for a real member's real song.
 * ---------------------------------------------------------------- */

function sourceWord(url: string): string | null {
  if (!url) return null;
  if (url.includes("spotify")) return "Spotify";
  if (url.includes("youtu")) return "YouTube";
  if (url.includes("music.apple")) return "Apple Music";
  if (url.includes("soundcloud")) return "SoundCloud";
  return "Link";
}

/** Faded at the right, never an ellipsis and never a hard cut mid-word. */
const FADE_RIGHT = {
  maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
  WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
} as const;

/** The same, down the page: the third line of a long row in the sheet. */
const FADE_BOTTOM = {
  maskImage: "linear-gradient(to bottom, #000 calc(100% - 16px), transparent)",
  WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 16px), transparent)",
} as const;

function LinkCard({ song }: { song: SketchSong }) {
  const source = sourceWord(song.url);
  const video = source === "YouTube";
  const preview = source === "Spotify" || source === "Apple Music";
  const artW = video ? 96 : 64;
  const artH = video ? 54 : 64;

  const inner = (
    <>
      <span
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-mist"
        style={{ width: artW, height: artH }}
      >
        {song.art ? (
          <img src={song.art} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <Music className="h-6 w-6 text-muted-foreground" strokeWidth={1.6} />
        )}
        {preview && (
          <span className="absolute grid h-7 w-7 place-items-center rounded-full bg-[rgb(30_28_22/0.55)] text-white">
            <Play className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span
          className="block whitespace-nowrap text-[0.9375rem] font-semibold text-foreground"
          style={FADE_RIGHT}
        >
          {song.title}
        </span>
      </span>
      {source && (
        <span className="shrink-0 text-[0.75rem] uppercase tracking-[0.12em] text-muted-foreground">{source}</span>
      )}
    </>
  );

  const shell = "flex h-20 w-full items-center gap-3 rounded-[var(--radius-md)] border border-border px-3";
  if (!song.url) return <div className={shell}>{inner}</div>;
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${shell} state-layer active:scale-[0.995] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
    >
      {inner}
    </a>
  );
}

/* ---------------------------------------------------------------- *
 *  A member's words.
 *
 *  renderRichText is the app's one renderer for a member's typing, so it
 *  runs first and escapes everything; only then are bare links wrapped,
 *  which is safe because nothing raw survives that escape. Leaf and
 *  underlined, breaking anywhere, so a 123-character link cannot push the
 *  page sideways (section 7).
 * ---------------------------------------------------------------- */

const BARE_LINK = /(https?:\/\/[^\s<]+)/g;

function bodyHtml(text: string): string {
  return renderRichText(text).replace(
    BARE_LINK,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-leaf underline [overflow-wrap:anywhere]">$1</a>'
  );
}

/** A songs question stores the song's NAME in the body, as AnswerCard does. */
function songOf(question: SketchQuestion, entry: SketchEntry): SketchSong | null {
  const body = entry.body?.trim() ?? "";
  if (entry.song) return entry.song;
  if (question.kind === "songs" && body) return { url: "", title: body, art: null };
  return null;
}

function hasLink(entry: SketchEntry): boolean {
  BARE_LINK.lastIndex = 0;
  return BARE_LINK.test(entry.body ?? "");
}

/* ---------------------------------------------------------------- *
 *  Photographs on an answer.
 * ---------------------------------------------------------------- */

type Shot = StoredPhoto & { src: string };

function shots(entry: SketchEntry): Shot[] {
  return entry.images
    .map((src, i) => {
      const p = entry.photos[i];
      return p ? ({ ...p, src } as Shot) : null;
    })
    .filter((s): s is Shot => s !== null);
}

function AnswerPhotographs({ entry, viewport }: { entry: SketchEntry; viewport: SketchViewport }) {
  const radius = viewport === "phone" ? "rounded-[var(--radius-sm)]" : "rounded-[var(--radius-md)]";
  const measured = shots(entry);

  /* One photograph: the full measure, its true shape if it is square or
     wider, 3:4 on a bed of itself if it is taller. PhotoFrame's rule. */
  if (entry.images.length === 1) {
    return (
      <PhotoFrame
        src={entry.images[0]}
        photo={entry.photos[0] ?? null}
        sizes={PHOTO_SIZES}
        className={radius}
        fallbackClassName="max-h-[440px]"
      />
    );
  }

  /* Three on a phone are a carousel; drawn here as the first frame with
     its three dots, because the drag belongs to the room. On the laptop
     they are one justified row at the measure, 6px gaps. Two, which the
     direction does not rule on, take the justified row on both. */
  if (viewport === "phone" && entry.images.length > 2) {
    return (
      <div>
        <PhotoFrame
          src={entry.images[0]}
          photo={entry.photos[0] ?? null}
          sizes={PHOTO_SIZES}
          className={radius}
          fallbackClassName="max-h-[440px]"
        />
        <div className="mt-2.5 flex justify-center gap-1.5">
          {entry.images.map((src, i) => (
            <span
              key={src}
              className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (measured.length !== entry.images.length) {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {entry.images.map((src) => (
          <img key={src} src={src} alt="" loading="lazy" className={`aspect-square w-full object-cover ${radius}`} />
        ))}
      </div>
    );
  }

  return (
    <PhotoRows photos={measured} gap={6} columnSizes={PHOTO_SIZES} keyOf={(p) => p.src}>
      {(photo, _i, cell) => (
        <img
          src={photo.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover ${radius}`}
          style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition, maxHeight: cell.maxHeight }}
        />
      )}
    </PhotoRows>
  );
}

/* ---------------------------------------------------------------- *
 *  The answer tile: full density, no box.
 * ---------------------------------------------------------------- */

function AnswerFull({
  entry,
  question,
  viewport,
}: {
  entry: SketchEntry;
  question: SketchQuestion;
  viewport: SketchViewport;
}) {
  const body = entry.body?.trim() ?? "";
  const song = songOf(question, entry);
  const named = Boolean(song) && !entry.song;
  const hasBody = Boolean(body) && !named;
  const photos = entry.images.length;
  /* Under 90 characters and nothing else in the tile: the action line
     joins the text's row instead of sitting under it, so the tile is
     28 + 6 + 27 = 61px and nothing under it is empty. */
  const oneLine = hasBody && !photos && !song && body.length < 90;
  /* A photograph's text is a caption, so it is clamped to four lines. */
  const caption = hasBody && photos > 0 && body.length > 210;

  const name = (
    <span className="text-[0.9375rem] font-semibold text-foreground">{entry.author.name}</span>
  );

  return (
    <article>
      <IdentityRow user={entry.author} avatarSize={28} name={name} meta={entry.author.batchLine} />

      {oneLine ? (
        <div className="flex items-start justify-between gap-4" style={{ marginTop: SPACE.xs }}>
          <p
            className="min-w-0 whitespace-pre-wrap text-[1rem] leading-[1.65] text-foreground [overflow-wrap:anywhere]"
            dangerouslySetInnerHTML={{ __html: bodyHtml(body) }}
          />
          <ActionLine entry={entry} inline />
        </div>
      ) : (
        <>
          {hasBody && (
            <div style={{ marginTop: SPACE.xs }}>
              <p
                className={`whitespace-pre-wrap text-[1rem] leading-[1.65] text-foreground [overflow-wrap:anywhere] ${
                  caption ? "line-clamp-4" : ""
                }`}
                dangerouslySetInnerHTML={{ __html: bodyHtml(body) }}
              />
              {caption && (
                <button type="button" className={LEAF_BUTTON}>
                  More
                </button>
              )}
            </div>
          )}
          {photos > 0 && (
            <div style={{ marginTop: SPACE.s }}>
              <AnswerPhotographs entry={entry} viewport={viewport} />
            </div>
          )}
          {song && (
            <div style={{ marginTop: SPACE.s }}>
              <LinkCard song={song} />
            </div>
          )}
          <div style={{ marginTop: SPACE.xs }}>
            <ActionLine entry={entry} />
          </div>
        </>
      )}
    </article>
  );
}

/* ---------------------------------------------------------------- *
 *  The answer row: line density.
 *
 *  Chosen per question, when at least seven in ten of its answers are
 *  under 90 characters and none carries a photograph or a link. Forty
 *  rows of three words are 1,440px instead of 4,000, and the question is
 *  still every answer, in order, with nothing folded away.
 *
 *  The floor of three is this file's, from the direction's own pressure
 *  fixture: one answer under a question is a full-density tile.
 * ---------------------------------------------------------------- */

function isLineDensity(q: SketchQuestion): boolean {
  if (q.kind !== "text") return false;
  if (q.entries.length < 3) return false;
  if (q.entries.some((e) => e.images.length > 0 || songOf(q, e) || hasLink(e))) return false;
  const short = q.entries.filter((e) => (e.body ?? "").trim().length < 90).length;
  return short / q.entries.length >= 0.7;
}

function AnswerRow({ entry }: { entry: SketchEntry }) {
  const body = entry.body?.trim() ?? "";
  const batch = shortBatch(entry.author);
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">
        <BirdAvatar user={entry.author} size={28} />
      </span>
      {/* The answer runs on from the name and wraps under itself, not
          under the bird, and the heart trails the last word. */}
      <p className="min-w-0 flex-1 text-[1rem] leading-[1.65] text-foreground [overflow-wrap:anywhere]">
        <span className="text-[0.9375rem] font-semibold">{entry.author.name}</span>
        {batch && (
          <span className="ml-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
            {batch}
          </span>
        )}
        <span className="ml-2.5" dangerouslySetInnerHTML={{ __html: bodyHtml(body) }} />
        <span className="ml-2.5 inline-flex translate-y-[3px] items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Heart
              className={`h-4 w-4 ${entry.lovedByViewer ? "fill-heart text-heart" : "text-muted-foreground"}`}
              strokeWidth={1.9}
            />
            <span className="text-[0.8125rem] text-muted-foreground">{entry.loveCount}</span>
          </span>
          <button type="button" className={LEAF_BUTTON}>
            {entry.commentCount === 0 ? "Comment" : `${entry.commentCount}`}
          </button>
        </span>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  A photo wall: one photograph each, justified rows, attributed under.
 * ---------------------------------------------------------------- */

type WallShot = Shot & { author: SketchPerson };

function PhotoWall({ question, viewport }: { question: SketchQuestion; viewport: SketchViewport }) {
  const wall: WallShot[] = [];
  for (const e of question.entries) {
    const s = shots(e)[0];
    if (s) wall.push({ ...s, author: e.author });
  }
  return (
    <PhotoStream
      photos={wall}
      as="ul"
      gap={8}
      targetHeight={viewport === "phone" ? "150px" : "200px"}
      keyOf={(p) => p.src}
    >
      {(photo, _i, cell) => (
        <figure>
          <img
            src={photo.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full rounded-[var(--radius-sm)] object-cover"
            style={{ aspectRatio: cell.aspectRatio, objectPosition: cell.objectPosition }}
          />
          <figcaption className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
            <BirdAvatar user={photo.author} size={20} />
            {firstName(photo.author.name)}
          </figcaption>
        </figure>
      )}
    </PhotoStream>
  );
}

/* ---------------------------------------------------------------- *
 *  A question, heading and all.
 * ---------------------------------------------------------------- */

function QuestionBlock({
  question,
  viewport,
}: {
  question: SketchQuestion;
  viewport: SketchViewport;
}) {
  /* Over 120 characters the heading drops a step, so a 300-character
     question takes nine lines at 390 rather than eleven. */
  const long = question.text.length > 120;
  const dense = isLineDensity(question);
  const wall = question.kind === "photo" && question.entries.some((e) => shots(e).length > 0);

  return (
    <section>
      <span className="block h-[2px] w-8 bg-cinnamon" />
      <h2
        className={`font-heading tracking-[-0.025em] text-foreground ${
          long ? "text-[1.25rem] leading-[1.35]" : "text-[1.5rem] leading-[1.25]"
        }`}
        style={{ marginTop: SPACE.xs }}
      >
        {question.text}
      </h2>
      {question.showAsker && question.asker && (
        <p className="mt-1 text-[0.875rem] text-muted-foreground">{firstName(question.asker.name)} asked.</p>
      )}

      {wall ? (
        <div style={{ marginTop: SPACE.l }}>
          <PhotoWall question={question} viewport={viewport} />
        </div>
      ) : dense ? (
        <div className="flex flex-col" style={{ marginTop: SPACE.l, gap: SPACE.s }}>
          {question.entries.map((e) => (
            <AnswerRow key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ marginTop: SPACE.l, gap: SPACE.l }}>
          {question.entries.map((e) => (
            <AnswerFull key={e.id} entry={e} question={question} viewport={viewport} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- *
 *  The masthead: the cover's four fields, at display size.
 * ---------------------------------------------------------------- */

function Masthead({ round, viewport }: { round: SketchRound; viewport: SketchViewport }) {
  /* No clamp(), no vw: inside a scaled frame a viewport unit answers to
     the real window. 1.9rem is the direction's 31px at 390, 2.6rem its
     41.6px at 1512. */
  const display = viewport === "phone" ? "1.9rem" : "2.6rem";
  return (
    <header>
      <h1
        className="font-heading tracking-[-0.03em] text-foreground"
        style={{ fontSize: display, lineHeight: 1.05 }}
      >
        Round {round.number}
      </h1>
      <p className="mt-2.5 text-[0.875rem] text-muted-foreground">
        Came out on {weekdayOf(round.publishedAt)} {formatDisplayDateLong(round.publishedAt)}
      </p>
      <div className="mt-2.5">
        <WriterChips people={round.contributors} />
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- *
 *  The end of the Round: the next date, circled, and the way home.
 * ---------------------------------------------------------------- */

function EndOfRound({ round }: { round: SketchRound }) {
  const next = nextDate(round);
  const carried = round.questions.filter((q) => q.entries.length === 0);
  return (
    <footer>
      <h2 className="font-heading text-[1.5rem] leading-[1.25] tracking-[-0.025em] text-foreground">
        The end of Round {round.number}.
      </h2>

      {carried.length > 0 && (
        <p className="mt-2 text-[0.875rem] text-muted-foreground">
          Carried over to Round {round.number + 1}: {metaLine(...carried.map((q) => q.text))}
        </p>
      )}

      <div className="flex items-start gap-4" style={{ marginTop: SPACE.l }}>
        <CircledDate day={dayOf(next.iso)} size={40} />
        <div className="min-w-0 pt-1">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {monthYearLabel(next.iso)}
          </p>
          <p className="mt-1 font-heading text-[1.25rem] leading-[1.3] tracking-[-0.025em] text-foreground">
            Round {round.number + 1} opens.
          </p>
        </div>
      </div>
      <div style={{ marginTop: SPACE.m }}>
        <button type="button" className={CANOPY_PILL}>
          Ask something for Round {round.number + 1}
        </button>
      </div>

      <button
        type="button"
        className="state-layer -mx-2 block rounded-[var(--radius-md)] px-2 py-2 text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ marginTop: SPACE.xl }}
      >
        <span className="block font-heading text-[1.25rem] leading-[1.3] tracking-[-0.025em] text-foreground">
          {round.catchupName}
        </span>
        <span className="mt-1 block text-[0.875rem] text-muted-foreground">
          {metaLine(cadencePhrase(round.cadence), `${round.members.length} people`)}
        </span>
      </button>

      {/* The sketch saying what it invented, in the register the harness
          uses for its own notes rather than in the drawing's voice. */}
      <p className="mt-8 border-t border-border pt-3 text-[0.75rem] text-muted-foreground">
        Sketch note: questions 4 to {round.questions.length} are not drawn here, so the end follows question 3.
        {next.invented ? ` This Round has no next date on file, so ${dayMonth(next.iso)} is invented.` : ""}
      </p>
    </footer>
  );
}

/* ---------------------------------------------------------------- *
 *  The navigator, resting: the bar and its proportional track.
 *
 *  The track's segments are proportional to each question's height on the
 *  page, so question 3 is long and the one-liners are short and the bar
 *  is the shape of the Round. Nothing measures the DOM here, so each
 *  question's height is estimated from what is actually in it: the
 *  heading's lines, every answer's lines at the phone's 350px measure,
 *  and a photograph or a card where there is one.
 * ---------------------------------------------------------------- */

const CHARS_PER_LINE = 46; // Source Sans at 16px across a 350px measure

function estimateQuestionHeight(q: SketchQuestion): number {
  const headingLines = Math.max(1, Math.ceil(q.text.length / (q.text.length > 120 ? 40 : 30)));
  let h = 42 + headingLines * 30 + 26;
  const dense = isLineDensity(q);
  for (const e of q.entries) {
    const len = (e.body ?? "").trim().length;
    const lines = Math.max(1, Math.ceil(len / CHARS_PER_LINE));
    if (dense) {
      h += lines * 26 + 10;
      continue;
    }
    h += 28 + 6 + lines * 26.4 + 6 + 32 + 26;
    if (e.images.length > 0) h += 300;
    if (songOf(q, e)) h += 90;
  }
  return h;
}

function trackSegments(weights: number[], width: number, gap = 1, min = 8): number[] {
  const free = width - gap * Math.max(0, weights.length - 1);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / total) * free);
  let deficit = 0;
  let pool = 0;
  for (const v of raw) {
    if (v < min) deficit += min - v;
    else pool += v;
  }
  if (pool <= 0) return raw.map(() => free / raw.length);
  return raw.map((v) => (v < min ? min : v - (deficit * v) / pool));
}

function NavigatorTrack({
  round,
  current,
  progress,
  width,
}: {
  round: SketchRound;
  current: number | null;
  progress: number;
  width: number;
}) {
  const segs = trackSegments(round.questions.map(estimateQuestionHeight), width);
  return (
    <div className="absolute left-0 top-0 flex" style={{ height: 2, gap: 1 }}>
      {segs.map((w, i) => {
        const read = current !== null && i < current;
        const here = current !== null && i === current;
        return (
          <span
            key={round.questions[i].id}
            style={{
              width: w,
              height: 2,
              background: read ? "color-mix(in srgb, var(--ink) 60%, transparent)" : "var(--border)",
            }}
          >
            {here && (
              <span
                className="block"
                style={{ width: `${Math.round(progress * 100)}%`, height: 2, background: "var(--canopy)" }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

function NavigatorBar({
  round,
  current,
  progress = 0,
  position = "static",
}: {
  round: SketchRound;
  /** null while the masthead is on screen: the bar names the Round instead. */
  current: number | null;
  progress?: number;
  position?: "static" | "absolute";
}) {
  const q = current === null ? null : round.questions[current];
  const positionLabel = current === null ? `Round ${round.number}` : `${current + 1} / ${round.questions.length}`;
  return (
    <div
      className="glass z-30 w-full border-t border-border"
      style={{
        position,
        left: 0,
        bottom: 0,
        height: NAV_H,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <NavigatorTrack round={round} current={current} progress={progress} width={PHONE_W} />
      <button
        type="button"
        className="flex h-full w-full items-center gap-3 px-5 text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        <span className="w-11 shrink-0 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {positionLabel}
        </span>
        <span className="min-w-0 flex-1 overflow-hidden">
          <span
            className="block whitespace-nowrap font-heading text-[0.9375rem] leading-[1.4] tracking-[-0.02em] text-foreground"
            style={FADE_RIGHT}
          >
            {q ? q.text : `${round.questions.length} questions`}
          </span>
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center">
          <ChevronUp className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
        </span>
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  The navigator, open.
 * ---------------------------------------------------------------- */

function SheetRow({
  title,
  count,
  current = false,
  clamp = false,
}: {
  title: string;
  count: string;
  current?: boolean;
  clamp?: boolean;
}) {
  return (
    <div className="flex gap-2 py-2.5">
      <span className="mt-2 w-3 shrink-0">
        {current && <span className="block h-1.5 w-1.5 rounded-full bg-canopy" />}
      </span>
      <span className="min-w-0 flex-1">
        {/* Three lines at most, faded on the third; weight never changes
            between the current row and the rest, so nothing reflows when
            the current one moves. */}
        <span
          className={`block font-heading text-[1rem] leading-[1.45] tracking-[-0.02em] ${
            current ? "text-foreground" : "text-muted-foreground"
          }`}
          style={clamp ? { maxHeight: 70, overflow: "hidden", ...FADE_BOTTOM } : undefined}
        >
          {title}
        </span>
        <span className="mt-1 block text-[0.875rem] text-muted-foreground">{count}</span>
      </span>
    </div>
  );
}

function NavigatorSheet({ round, current, answerAt }: { round: SketchRound; current: number; answerAt: number }) {
  const next = nextDate(round);
  const height = Math.round(844 * 0.85); // its list, up to 85% of the screen
  return (
    <div
      className="absolute left-0 w-full overflow-hidden rounded-t-[20.8px] bg-popover"
      style={{
        bottom: 0,
        height,
        boxShadow: "0 -1px 2px rgb(var(--shadow-ink) / 0.04), 0 -18px 40px -28px rgb(var(--shadow-ink) / 0.5)",
      }}
    >
      <div className="flex justify-center pt-2.5">
        <span className="block h-1 w-9 rounded-full bg-border" />
      </div>

      <div className="px-5 pt-3" style={{ height: 64 }}>
        <button
          type="button"
          className="block rounded-[3px] text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="block font-heading text-[1.25rem] leading-[1.3] tracking-[-0.025em] text-foreground">
            {round.catchupName}
          </span>
        </button>
        <p className="mt-0.5 text-[0.875rem] text-muted-foreground">
          {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
        </p>
      </div>

      <div className="mt-3 px-5">
        <SheetRow title="The masthead" count={`${round.contributors.length} wrote in`} />
        {round.questions.map((q, i) => (
          <SheetRow
            key={q.id}
            title={q.text}
            count={
              i === current
                ? `answer ${answerAt} of ${q.entries.length}`
                : `${q.entries.length} ${q.entries.length === 1 ? "answer" : "answers"}`
            }
            current={i === current}
            clamp={q.text.length > 90}
          />
        ))}
        <SheetRow title="The end" count={`Round ${round.number + 1} opens ${dayMonth(next.iso)}`} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  The sheet's contents, shared by both viewports.
 * ---------------------------------------------------------------- */

function SheetBody({ round, viewport }: SketchProps) {
  const three = round.questions.slice(0, 3);
  return (
    <>
      <Masthead round={round} viewport={viewport} />
      <div className="flex flex-col" style={{ marginTop: SPACE.xl, gap: SPACE.xxl }}>
        {three.map((q) => (
          <QuestionBlock key={q.id} question={q} viewport={viewport} />
        ))}
      </div>
      <div style={{ marginTop: SPACE.xxl }}>
        <EndOfRound round={round} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- *
 *  The reader, from the top.
 * ---------------------------------------------------------------- */

function PhoneReader({ round }: { round: SketchRound }) {
  return (
    /* Edge to edge, no radius, no margin, no shadow, and the valley
       photograph is not visible behind it: the sheet IS the page. */
    <div className="bg-card">
      <GreenBar name={round.catchupName} />
      <div style={{ paddingLeft: PHONE_PAD, paddingRight: PHONE_PAD, paddingTop: PHONE_PAD, paddingBottom: 24 }}>
        <SheetBody round={round} viewport="phone" />
      </div>
      {/* Fixed on a real phone. At the foot of a tall drawing it stands
          still, in the state it holds while the masthead is on screen:
          the Round's name, its question count, and a track with no fill. */}
      <NavigatorBar round={round} current={null} />
    </div>
  );
}

function RailQuestionRow({
  question,
  index,
  current,
}: {
  question: SketchQuestion;
  index: number;
  current: number;
}) {
  const here = index === current;
  return (
    <button
      type="button"
      className="state-layer -mx-2 flex w-[calc(100%+16px)] items-start gap-2 rounded-[8px] px-2 py-2.5 text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ minHeight: 44 }}
    >
      <span className="mt-1.5 w-2.5 shrink-0">
        {here && <span className="block h-2.5 w-2.5 rounded-full bg-canopy" />}
      </span>
      <span
        className={`min-w-0 flex-1 font-heading text-[0.9375rem] leading-[1.45] tracking-[-0.02em] ${
          here ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {question.text}
      </span>
      <span className="shrink-0 pt-0.5 text-[0.875rem] text-muted-foreground">{question.entries.length}</span>
    </button>
  );
}

function DesktopReader({ round }: { round: SketchRound }) {
  const next = nextDate(round);
  return (
    <DesktopShell>
      {/* 232 + 36 + 680 + 36 + 200 = 1184, the content area beside the
          248px sidebar at 1512. Sticky on the real page; standing still
          in a drawing, which is what a composition can show. */}
      <div className="flex" style={{ gap: GUTTER, width: LEFT_RAIL + GUTTER + SHEET_W + GUTTER + RIGHT_RAIL }}>
        <nav className="shrink-0 pt-2" style={{ width: LEFT_RAIL }}>
          <button
            type="button"
            className="block rounded-[3px] text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="block font-heading text-[1.25rem] leading-[1.3] tracking-[-0.025em] text-foreground">
              {round.catchupName}
            </span>
          </button>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            {metaLine(`Round ${round.number}`, formatDisplayDateLong(round.publishedAt))}
          </p>
          <div className="mt-4">
            {round.questions.map((q, i) => (
              <RailQuestionRow key={q.id} question={q} index={i} current={0} />
            ))}
            <p className="mt-3 px-2 font-heading text-[0.9375rem] tracking-[-0.02em] text-muted-foreground">The end</p>
          </div>
        </nav>

        <div
          className="card-elevated shrink-0 rounded-[var(--radius)] bg-card"
          style={{ width: SHEET_W, padding: DESK_PAD }}
        >
          <SheetBody round={round} viewport="laptop" />
        </div>

        <aside className="shrink-0 pt-2" style={{ width: RIGHT_RAIL }}>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Wrote in</p>
          <div className="mt-3 flex flex-col gap-0.5">
            {round.contributors.map((p) => (
              <button
                key={p.id}
                type="button"
                className="state-layer -mx-2 flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-[0.875rem] text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <BirdAvatar user={p} size={28} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: SPACE.xl }}>
            <div className="flex items-start gap-3">
              <CircledDate day={dayOf(next.iso)} size={40} />
              <div className="min-w-0 pt-1">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {monthLabel(next.iso)}
                </p>
                <p className="mt-1 text-[0.875rem] text-foreground">Round {round.number + 1} opens.</p>
              </div>
            </div>
            <button type="button" className={`${LEAF_BUTTON} mt-2.5`}>
              Ask something for it
            </button>
          </div>
        </aside>
      </div>
    </DesktopShell>
  );
}

function Reader({ round, viewport }: SketchProps) {
  return viewport === "laptop" ? <DesktopReader round={round} /> : <PhoneReader round={round} />;
}

/* ---------------------------------------------------------------- *
 *  One phone screen, deep in question 5.
 *
 *  A composition, not a scrolled page: the answers that would be on
 *  screen at that depth, the first of them cut off at the top by the
 *  green bar and the last cut off at the bottom by the navigator.
 * ---------------------------------------------------------------- */

const MID_Q = 4; // question 5
const MID_FROM = 2; // the third answer in it is the one being left behind
const MID_ANSWER_AT = 4; // so the sheet's current row reads "answer 4 of n"
const MID_PROGRESS = 0.45; // the fifth segment, just under half full

function MidScrollPage({ round }: { round: SketchRound }) {
  const q = round.questions[MID_Q] ?? round.questions[round.questions.length - 1];
  const from = Math.max(0, Math.min(MID_FROM, q.entries.length - 4));
  const [tail, ...rest] = q.entries.slice(from);

  return (
    <div className="relative h-full overflow-hidden bg-card">
      <GreenBar name={round.catchupName} position="absolute" />
      <div
        className="absolute left-0 w-full overflow-hidden"
        style={{ top: BAR_H, bottom: NAV_H, paddingLeft: PHONE_PAD, paddingRight: PHONE_PAD }}
      >
        {/* The tail of the answer you are leaving: a fixed box whose
            contents are bottom-aligned, so whatever the answer's real
            height is, its last 92px are what shows. */}
        {tail && (
          <div className="flex flex-col justify-end overflow-hidden" style={{ height: 92 }}>
            <AnswerFull entry={tail} question={q} viewport="phone" />
          </div>
        )}
        <div className="flex flex-col" style={{ gap: SPACE.l, marginTop: SPACE.l }}>
          {rest.map((e) => (
            <AnswerFull key={e.id} entry={e} question={q} viewport="phone" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  return (
    <div className="relative h-full">
      <MidScrollPage round={round} />
      <NavigatorBar round={round} current={MID_Q} progress={MID_PROGRESS} position="absolute" />
    </div>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  return (
    <div className="relative h-full">
      <MidScrollPage round={round} />
      {/* The page behind stays where it was and is not dimmed. */}
      <NavigatorSheet round={round} current={MID_Q} answerAt={MID_ANSWER_AT} />
    </div>
  );
}

export const calendar: SketchDirection = {
  slug: "calendar",
  name: "The calendar keeps it",
  thesis:
    "A Catch-up is a run of dated Rounds on one spine, the next date is circled and does the work a Keeper used to do, and a batch runs on the site's three term dates with nobody in charge.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
