"use client";

/* ------------------------------------------------------------------ *
 *  What we do to a photograph.
 *
 *  Not a decision room any more -- the rules are chosen and shipped.
 *  This is the room for LOOKING at what they do, because the numbers in
 *  a commit message are unreadable and a portrait that has been cropped
 *  a little still looks like a portrait. So every shape a member can
 *  post is here twice: the photograph as it arrived, with the part we
 *  remove shaded out, and the post as it actually renders.
 *
 *  The owner, 2026-08-28: "please tell me what the original picture is
 *  and what we're rendering it as cause if you zoom in a bit on a
 *  portrait it'll still look like a portrait to me so I won't know what
 *  we're dealing with or what the original is. and chill with the pixel
 *  counts idk how to comprehend that."
 *
 *  So: no pixel counts. Shapes have names, cuts are a share of the
 *  frame, and the height of a post is measured in laptop screens.
 *
 *  Throwaway. Delete this room, public/lab/crop/ and its registry row
 *  once the rules are settled -- it is on the close-out list in
 *  docs/planning/collection-rework/handover.md.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { DelightShell, DemoCard, Seg } from "../_kit";
import { SPECIMENS, WIDTHS, type Specimen, type WidthKey } from "./_specimens";
import { PhotoRows } from "@/components/common/photo-rows";
import { PostCard } from "@/components/posts/post-card";
import { drawnSize, framePhoto } from "@/lib/photo-layout";

/** A laptop window, for saying how much of the screen a post takes. The one
 *  number in the room, and it is here so nothing else has to be a number. */
const SCREEN = 900;

const facts = (s: Specimen) => ({
  width: s.w,
  height: s.h,
  focalX: s.focal.x,
  focalY: s.focal.y,
  blurDataUrl: null,
});

/** Everything the room says about one photograph in one column. */
function read(s: Specimen, column: number) {
  const frame = framePhoto(facts(s));
  const drawn = drawnSize(frame, column);
  const came = s.w / s.h;
  const shown = drawn.width / drawn.height;
  const kept = Math.min(came, shown) / Math.max(came, shown);
  const [x, y] = frame.objectPosition.split(" ").map((v) => parseFloat(v) / 100);
  return {
    came,
    shown,
    kept,
    /** Which way the photograph is trimmed, and how the surviving window sits
     *  in the original -- which is what the shading below draws. */
    axis: shown > came ? ("y" as const) : shown < came ? ("x" as const) : ("none" as const),
    at: shown > came ? y : x,
    /** How much card is left over either side, as a share of the card. */
    bed: Math.max(0, (column - drawn.width) / column),
    height: drawn.height,
  };
}

/** "a tenth", "a fifth" -- a share of a photograph, in words. */
function share(lost: number): string {
  if (lost < 0.03) return "a sliver";
  const denom = Math.round(1 / lost);
  const words: Record<number, string> = {
    2: "half", 3: "a third", 4: "a quarter", 5: "a fifth", 6: "a sixth",
    7: "a seventh", 8: "an eighth", 9: "a ninth", 10: "a tenth",
    11: "a tenth", 12: "a twelfth", 20: "a twentieth",
  };
  return words[denom] ?? `${Math.round(lost * 100)}%`;
}

/** The whole photograph, small, with the part we remove shaded out. */
function Original({ s, column }: { s: Specimen; column: number }) {
  const { came, kept, axis, at } = read(s, column);
  const box = 208;
  const w = came >= 1 ? box : box * came;
  const h = came >= 1 ? box / came : box;
  const gone = 1 - kept;
  const before = at * gone;

  return (
    <figure className="cr-orig-wrap">
      <div className="cr-orig" style={{ width: w, height: h }}>
        <img src={s.src} alt="" />
      {axis !== "none" && (
        <>
          <span
            className="cr-gone"
            style={
              axis === "y"
                ? { left: 0, right: 0, top: 0, height: `${before * 100}%` }
                : { top: 0, bottom: 0, left: 0, width: `${before * 100}%` }
            }
          />
          <span
            className="cr-gone"
            style={
              axis === "y"
                ? { left: 0, right: 0, bottom: 0, height: `${(gone - before) * 100}%` }
                : { top: 0, bottom: 0, right: 0, width: `${(gone - before) * 100}%` }
            }
          />
          {/* The window that survives, outlined, so the shading is read as a
              crop rather than as a shadow on the photograph. */}
          <span
            className="cr-keep"
            style={
              axis === "y"
                ? { left: 0, right: 0, top: `${before * 100}%`, height: `${kept * 100}%` }
                : { top: 0, bottom: 0, left: `${before * 100}%`, width: `${kept * 100}%` }
            }
          />
        </>
      )}
      </div>
      <figcaption>
        {s.label} as it arrived
        {axis !== "none" && <> &middot; the shaded part goes</>}
      </figcaption>
    </figure>
  );
}

/** What happened, in a sentence a person can read. */
function Verdict({ s, column }: { s: Specimen; column: number }) {
  const { came, kept, axis, bed, height } = read(s, column);
  const lost = 1 - kept;
  const screens = Math.round((height / SCREEN) * 100);

  const cut =
    lost < 0.005
      ? "Nothing is cut."
      : came < 1
        ? `Brought to 3:4 -- ${share(lost)} comes off the ${axis === "y" ? "top and bottom" : "sides"}.`
        : `${share(lost)[0].toUpperCase()}${share(lost).slice(1)} comes off the ${axis === "y" ? "top and bottom" : "sides"}, so it can fill the card.`;

  const fill =
    bed < 0.01
      ? "It reaches both edges of the card."
      : `It still leaves a blurred band either side, about ${share(bed / 2)} of the card each.`;

  return (
    <div className="cr-verdict">
      <p className="cr-shape">
        <strong>Came in {s.label}.</strong> {s.note}
      </p>
      <p>{cut}</p>
      <p>{fill}</p>
      <p className="cr-screen">The photograph takes about {screens}% of a laptop screen.</p>
    </div>
  );
}

/** THE REAL CARD, not a look-alike.
 *
 *  `<PostCard demo>` exists for exactly this -- its own comment says so: "it
 *  exists so a preview can show the REAL card instead of a look-alike copy of
 *  it." Everything below therefore goes through the same component the feed
 *  renders, with the same photograph rule, the same justified rows and the
 *  same carousel. A hand-rolled card in a lab is worth nothing: it can be
 *  right about the photograph and wrong about everything around it, which is
 *  what makes a post feel long or short.
 *
 *  The card is wrapped at the column's width rather than given it as a prop,
 *  because that is how the app does it too -- ContentColumn sets the width and
 *  the card fills it. The `column` prop it does take chooses only the `sizes`
 *  promise. The 34px is the card's own padding and borders, so the PHOTOGRAPH
 *  inside lands at the width being simulated. */
function Post({
  column,
  pinned,
  photos,
  words = "The banyan, this morning.",
}: {
  column: number;
  /** False when the room is following the window, where the card should do
   *  what it does in the app: fill what it is given. */
  pinned: boolean;
  photos: Specimen[];
  words?: string;
}) {
  return (
    <div style={{ width: pinned ? column + 34 : "100%", maxWidth: "100%" }}>
      <PostCard
        demo
        variant="card"
        column={column > 900 ? "wide" : "centered"}
        post={{
          id: `crop-${photos.map((p) => p.key).join("-")}`,
          content: words,
          images: JSON.stringify(photos.map((p) => p.src)),
          photos: photos.map(facts),
          createdAt: new Date(2026, 7, 26).toISOString(),
          author: {
            id: "crop-demo",
            name: "Anita Rao",
            photoUrl: null,
            birdOverride: null,
            accountType: "alumnus",
            verifyState: "verified",
            batchType: "batch",
            batchYear: 1994,
          },
          commentCount: 3,
          likeCount: 12,
          liked: false,
          bookmarked: false,
          isOwn: false,
          poll: null,
        }}
      />
    </div>
  );
}

/** Several photographs in level rows, each at the shape the one-photograph
 *  rule gives it. What ships for two, and what shipped briefly for more. */
function Justified({ photos }: { photos: Specimen[] }) {
  return (
    <PhotoRows photos={photos.map(facts)}>
      {(_p, i, cell) => (
        <img
          src={photos[i].src}
          alt=""
          className="h-full w-full rounded-[10px] object-cover"
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

/** The two layouts that no longer exist in the app cannot go through the real
 *  card, because the real card no longer knows how to draw them. They get the
 *  card's own measure and chrome and nothing else -- the point of those two
 *  panels is the arrangement of the photographs, not the card around them. */
function RawCard({
  column,
  pinned,
  children,
}: {
  column: number;
  pinned: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4"
      style={{ width: pinned ? column + 34 : "100%", maxWidth: "100%" }}
    >
      <p className="mb-3 text-sm text-foreground">A few from the walk up Rishi Konda.</p>
      {children}
    </div>
  );
}

function OnePhoto({ s, column, pinned }: { s: Specimen; column: number; pinned: boolean }) {
  return (
    <div className="cr-case">
      <div className="cr-case-head">
        <Original s={s} column={column} />
        <Verdict s={s} column={column} />
      </div>
      <Post column={column} pinned={pinned} photos={[s]} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

const SETS: { label: string; keys: string[] }[] = [
  { label: "Two", keys: ["3x2", "9x16"] },
  { label: "Three", keys: ["16x9", "21x9", "9x16"] },
  { label: "Four", keys: ["4x3", "1x1", "2x3", "21x9"] },
  { label: "Five", keys: ["4x3", "9x16", "3x2", "1x1", "16x9"] },
];

/** How a post used to tile several photographs, before any of this: two
 *  columns, the first spanning both when there were exactly three, and a hard
 *  pixel cap on every cell. Every photograph `object-cover`, so every one of
 *  them cut to a box that had nothing to do with its shape -- which is where
 *  "sometimes the catch up just shows a bunch of shoulders" came from. Kept
 *  here only so the two can be looked at side by side; nothing in the app
 *  renders this any more.
 *
 *  The composer never allowed more than three, so four and five are what this
 *  rule WOULD have done rather than something anybody ever saw. */
function TiledAsBefore({ photos }: { photos: Specimen[] }) {
  return (
    <div className="cr-tiled" style={{ gridTemplateColumns: photos.length === 1 ? "1fr" : "1fr 1fr" }}>
      {photos.map((s, i) => {
        const wide = photos.length === 3 && i === 0;
        return (
          <img
            key={s.key}
            src={s.src}
            alt=""
            style={{
              gridColumn: wide ? "span 2" : undefined,
              maxHeight: photos.length === 1 ? 384 : wide ? 256 : 192,
            }}
          />
        );
      })}
    </div>
  );
}

export default function CropRoom() {
  const [widthKey, setWidthKey] = useState<WidthKey>("window");
  /* What the card is ACTUALLY as wide as, when it is following the window.
     The verdicts are arithmetic about a real width, so in window mode the room
     has to measure the one the browser settled on -- which is the one thing a
     lab may do and the app may not, because here the measurement is the
     subject rather than the layout. */
  const [live, setLive] = useState(0);
  const room = useRef<HTMLDivElement>(null);
  const [setKey, setSetKey] = useState("Three");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("w");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reads the URL query after mount, the same way DelightShell reads ?theme. During render it would disagree with the server's first paint.
    if (w && w in WIDTHS) setWidthKey(w as WidthKey);
    const n = q.get("n");
    if (SETS.some((s) => s.label === n)) setSetKey(n!);
  }, []);

  useEffect(() => {
    const el = room.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setLive(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 34px is the card's own padding and borders, so what is left is the width
     the PHOTOGRAPH gets -- which is what every number below is about. */
  const column = WIDTHS[widthKey].px || Math.max(0, Math.round(live) - 34);
  const pinned = WIDTHS[widthKey].px > 0;
  const set = SETS.find((s) => s.label === setKey) ?? SETS[1];
  const many = set.keys
    .map((k) => SPECIMENS.find((s) => s.key === k))
    .filter(Boolean) as Specimen[];

  return (
    <DelightShell
      title="What we do to a photograph"
      lede="Every shape somebody can post. On the left, the photograph as it arrived, with the part we remove shaded out. Below it, the post as it actually renders."
      css={CSS}
    >
      <div className="cr-screens" ref={room}>
        <Seg
          options={(Object.keys(WIDTHS) as WidthKey[]).map((k) => ({
            v: k,
            label: WIDTHS[k].label,
          }))}
          value={widthKey}
          onChange={setWidthKey}
        />
        <p>{WIDTHS[widthKey].note}</p>
      </div>

      <DemoCard
        title="One photograph"
        note="Tall ones are brought to one shape and sit on a blurred copy of themselves. Square-ish ones lose a little so they can fill the card. Wide ones are never cut at all."
        pad={false}
      >
        <div className="cr-cases">
          {SPECIMENS.map((s) => (
            <OnePhoto key={s.key} s={s} column={column} pinned={pinned} />
          ))}
        </div>
      </DemoCard>

      <DemoCard
        title="More than one"
        note="Two sit side by side. More than two is a carousel you swipe, and every photograph in it is drawn exactly as it would have been posted on its own. Underneath, the two things it replaced."
        pad={false}
      >
        <div className="cr-panel">
          <Seg
            options={SETS.map((s) => ({ v: s.label, label: s.label }))}
            value={setKey}
            onChange={setSetKey}
          />

          <div className="cr-many">
            <p className="cr-label">Now</p>
            <Post column={column} pinned={pinned} photos={many} words="A few from the walk up Rishi Konda." />

            {many.length > 2 && (
              <>
                <p className="cr-label">
                  Before the carousel &mdash; all of them at once, in rows
                </p>
                <p className="cr-label-note">
                  Level rows, nothing cut, but with five in a card each one is a stamp.
                  This is what a post did for about a day.
                </p>
                <RawCard column={column} pinned={pinned}>
                  <Justified photos={many} />
                </RawCard>
              </>
            )}

            <p className="cr-label">Before any of it &mdash; tiles</p>
            <p className="cr-label-note">
              Two columns and a hard height cap, every photograph cut to a box that had
              nothing to do with its shape. The upright ones are the ones to look at.
            </p>
            <RawCard column={column} pinned={pinned}>
              <TiledAsBefore photos={many} />
            </RawCard>
          </div>
        </div>
      </DemoCard>
    </DelightShell>
  );
}

const CSS = `
.cr-screens { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin: -4px 0 4px; width: 100%; }
.cr-screens p { margin: 0; font-size: 12.5px; color: var(--dl-ink-3); }
.cr-panel { padding: 20px; display: grid; gap: 18px; justify-items: start; width: 100%; }
.cr-cases { display: grid; gap: 0; width: 100%; }
.dl-demo-stage:has(.cr-cases), .dl-demo-stage:has(.cr-panel) { align-items: stretch; justify-content: flex-start; }
.cr-case { padding: 22px 20px; border-top: 1px solid var(--dl-line); }
.cr-case:first-child { border-top: 0; }
.cr-case-head { display: flex; gap: 22px; align-items: flex-start; margin-bottom: 16px; }

.cr-orig-wrap { flex: none; margin: 0; display: grid; gap: 7px; justify-items: center; }
.cr-orig-wrap figcaption { font-size: 11.5px; letter-spacing: 0.02em; color: var(--dl-ink-3); text-align: center; max-width: 22ch; }
.cr-orig { position: relative; border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 1px var(--dl-line); }
.cr-keep { position: absolute; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.9); border-radius: 2px; }
.cr-orig img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cr-gone { position: absolute; background: rgba(24,22,18,0.72); backdrop-filter: saturate(0.2); }

.cr-verdict { display: grid; gap: 4px; max-width: 46ch; }
.cr-verdict p { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--dl-ink-2); }
.cr-shape strong { color: var(--dl-ink); }
.cr-screen { color: var(--dl-ink-3); font-size: 12.5px; }

.cr-many { overflow-x: auto; display: grid; gap: 8px; justify-items: start; }
.cr-label { margin: 18px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--dl-ink-3); }
.cr-many > .cr-label:first-child { margin-top: 0; }
.cr-label-note { margin: 0; max-width: 52ch; font-size: 13px; line-height: 1.55; color: var(--dl-ink-2); }
.cr-tiled { display: grid; gap: 8px; }
.cr-tiled img { width: 100%; object-fit: cover; border-radius: 10px; display: block; }
`;
