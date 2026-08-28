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

import { useEffect, useState } from "react";
import { DelightShell, DemoCard, Seg } from "../_kit";
import { SPECIMENS, WIDTHS, type Specimen, type WidthKey } from "./_specimens";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { PhotoCarousel } from "@/components/common/photo-carousel";
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

/** A post, near enough: somebody's name, a line, the photograph, the actions.
 *  The photograph is the real component, not a copy of it. */
function Post({
  column,
  children,
  words = "The banyan, this morning.",
}: {
  column: number;
  children: React.ReactNode;
  words?: string;
}) {
  return (
    <article className="cr-card" style={{ width: column + 34 }}>
      <header>
        <span className="cr-dot" />
        <span className="cr-who">Anita Rao</span>
        <span className="cr-when">2 days ago</span>
      </header>
      <p className="cr-body">{words}</p>
      {children}
      <footer>
        <span>12 loves</span>
        <span>3 replies</span>
      </footer>
    </article>
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

function OnePhoto({ s, column }: { s: Specimen; column: number }) {
  return (
    <div className="cr-case">
      <div className="cr-case-head">
        <Original s={s} column={column} />
        <Verdict s={s} column={column} />
      </div>
      <Post column={column}>
        <PhotoFrame
          src={s.src}
          photo={facts(s)}
          sizes="100vw"
          className="rounded-[10px]"
        />
      </Post>
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
  const [widthKey, setWidthKey] = useState<WidthKey>("laptop");
  const [setKey, setSetKey] = useState("Three");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("w");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reads the URL query after mount, the same way DelightShell reads ?theme. During render it would disagree with the server's first paint.
    if (w && w in WIDTHS) setWidthKey(w as WidthKey);
    const n = q.get("n");
    if (SETS.some((s) => s.label === n)) setSetKey(n!);
  }, []);

  const column = WIDTHS[widthKey].px;
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
      <DemoCard title="Which screen" note={WIDTHS[widthKey].note} pad>
        <Seg
          options={(Object.keys(WIDTHS) as WidthKey[]).map((k) => ({
            v: k,
            label: WIDTHS[k].label,
          }))}
          value={widthKey}
          onChange={setWidthKey}
        />
      </DemoCard>

      <DemoCard
        title="One photograph"
        note="Tall ones are brought to one shape and sit on a blurred copy of themselves. Square-ish ones lose a little so they can fill the card. Wide ones are never cut at all."
        pad={false}
      >
        <div className="cr-cases">
          {SPECIMENS.map((s) => (
            <OnePhoto key={s.key} s={s} column={column} />
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
            <Post column={column} words="A few from the walk up Rishi Konda.">
              {many.length > 2 ? (
                <PhotoCarousel
                  photos={many.map((s) => ({ src: s.src, photo: facts(s) }))}
                  sizes="100vw"
                  onOpen={() => {}}
                  onPreload={() => {}}
                />
              ) : (
                <Justified photos={many} />
              )}
            </Post>

            {many.length > 2 && (
              <>
                <p className="cr-label">
                  Before the carousel &mdash; all of them at once, in rows
                </p>
                <p className="cr-label-note">
                  Level rows, nothing cut, but with five in a card each one is a stamp.
                  This is what a post did for about a day.
                </p>
                <Post column={column} words="A few from the walk up Rishi Konda.">
                  <Justified photos={many} />
                </Post>
              </>
            )}

            <p className="cr-label">Before any of it &mdash; tiles</p>
            <p className="cr-label-note">
              Two columns and a hard height cap, every photograph cut to a box that had
              nothing to do with its shape. The upright ones are the ones to look at.
            </p>
            <Post column={column} words="A few from the walk up Rishi Konda.">
              <TiledAsBefore photos={many} />
            </Post>
          </div>
        </div>
      </DemoCard>
    </DelightShell>
  );
}

const CSS = `
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

.cr-card { background: var(--dl-card); border: 1px solid var(--dl-line); border-radius: 14px; padding: 16px; max-width: 100%; }
.cr-card header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.cr-dot { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(140deg, #9db892, #5d7f63); }
.cr-who { font-weight: 650; font-size: 13.5px; color: var(--dl-ink); }
.cr-when { font-size: 12px; color: var(--dl-ink-3); }
.cr-body { margin: 0 0 10px; font-size: 14px; color: var(--dl-ink); }
.cr-card footer { display: flex; gap: 14px; margin-top: 10px; font-size: 12.5px; color: var(--dl-ink-3); }
.cr-many { overflow-x: auto; display: grid; gap: 8px; justify-items: start; }
.cr-label { margin: 18px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--dl-ink-3); }
.cr-many > .cr-label:first-child { margin-top: 0; }
.cr-label-note { margin: 0; max-width: 52ch; font-size: 13px; line-height: 1.55; color: var(--dl-ink-2); }
.cr-tiled { display: grid; gap: 8px; }
.cr-tiled img { width: 100%; object-fit: cover; border-radius: 10px; display: block; }
`;
