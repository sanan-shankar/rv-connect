"use client";

/* ------------------------------------------------------------------ *
 *  The swap between the Collection's two halves.
 *
 *  ROUND TWO. The first three ideas in this room were a cross-fade, a
 *  dissolve and a slide, and the owner was right about all of them:
 *  *"these are so mid ... I didn't mean just cross dissolve wipe etc.
 *  think bigger and more creative these are so boring."* He also named
 *  the two things that made even the good bits feel cheap. *"I still see
 *  them being populated in, it looks weird"* and *"why are the pictures
 *  moving and enlarging in some of them."*
 *
 *  So this version starts from a rule rather than from an animation.
 *
 *  BOTH ARCHIVES ARE ALREADY ON THE PAGE. Not fetched on the press, not
 *  mounted on the press: built and decoded at load, stacked in the same
 *  box, one of them hidden. *"once we have the basic page loaded, we can
 *  show it. the next photos can load quietly in the background."* So
 *  nothing is ever arriving, and there is nothing to populate.
 *
 *  From that rule everything else follows. The half you are LEAVING is
 *  the only thing that moves; the half you are going to does not fade,
 *  does not scale, does not travel, because it was there all along. No
 *  opacity on a photograph anywhere in this file. No scale on one either.
 *
 *  Three ways for the top half to get out of the way, different in kind
 *  rather than in flavour:
 *
 *    The parting  rows slide out sideways, alternating, top to bottom,
 *                 each with a degree of tilt, like prints sliding off a
 *                 table.
 *    The gather   every photograph flies to the caret and is swallowed
 *                 by it. The caret stops being a chevron and becomes a
 *                 door.
 *    The advance  the two halves are two frames of one film strip and
 *                 the caret advances the film. One rigid move, a carry
 *                 and a seat, nothing per-tile.
 *
 *  "Today" is still here, reproduced beat for beat off the shipped page
 *  including its 460ms of grey, because the only way to judge a
 *  replacement is against the thing itself.
 *
 *  NO RAIL. `decade-rail.tsx` was being replaced by `year-rail.tsx` in
 *  this same tree while this was written, and a transition designed
 *  against a component somebody is deleting is work thrown away twice.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { Button } from "@/components/ui/button";
import { SearchPill } from "@/components/layout/search-pill";
import { RiverControls } from "@/components/collection/river-controls";
import { PhotoRiver } from "@/components/collection/photo-river";
import { ScopeCaret } from "@/components/collection/scope-caret";
import { ImageViewer, type ViewerImage } from "@/components/common/image-viewer";
import { bucketLabel } from "@/lib/collection";
import type { PhotoScope } from "@/lib/photo-visibility-rule";
import type { PhotoData, RiverOrder } from "@/app/(main)/collection/actions";
import { cn } from "@/lib/utils";
import { LAB_ARCHIVE } from "../_archive";

/* ------------------------------------------------------------------ *
 *  The two archives
 * ------------------------------------------------------------------ */

/** ONE PAGE of the valley, not all 240: `PAGE_SIZE` in
 *  `collection/actions.ts` is 48 and the rest arrives on scroll. */
const VALLEY_ARCHIVE: PhotoData[] = LAB_ARCHIVE.slice(0, 48);

/** A class archive is small and recent. Fourteen, off the same fixture, so
 *  both halves are the same photographs seen twice and nothing here can be
 *  an artefact of one set looking nicer than the other. */
const CLASS_ARCHIVE: PhotoData[] = LAB_ARCHIVE.filter(
  (p) => p.era === "2010s" || p.era === "2020s"
)
  .slice(0, 14)
  .map((p, i) => ({ ...p, id: `class-${i}`, scope: "class" as const }));

/* ------------------------------------------------------------------ *
 *  What the caret does
 * ------------------------------------------------------------------ */

type Variant = "today" | "parting" | "gather" | "advance";

/** How long the leaving half takes to be gone, in milliseconds, matching
 *  the CSS below. Kept here only to release the press guard: nothing is
 *  SEQUENCED off a timer any more, because a setTimeout started at the
 *  click runs on a different clock from a CSS animation started at the
 *  commit, and the gap between them is however long React took. */
const SPENT: Record<Variant, number> = {
  today: 900,
  parting: 620,
  gather: 620,
  advance: 620,
};

const VARIANTS: { v: Variant; label: string; note: string }[] = [
  {
    v: "today",
    label: "Today",
    note: "What ships. The header cuts at once, the photographs 660ms later, greyed in between.",
  },
  {
    v: "parting",
    label: "The parting",
    note: "The archive opens down its own middle. Every photograph leaves by the edge it is nearest, row by row from the top, each with a degree of tilt like a print sliding off a table. What is underneath was there the whole time.",
  },
  {
    v: "gather",
    label: "The gather",
    note: "The page is drawn upward into the header, row by row, each photograph leaning toward the caret as it goes. The caret stops being a chevron and becomes a door.",
  },
  {
    v: "advance",
    label: "The advance",
    note: "Two frames of one film strip. The caret advances the film: one rigid move, a carry and a seat, nothing per-tile at all.",
  },
];

/* ------------------------------------------------------------------ *
 *  Where every photograph is
 * ------------------------------------------------------------------ */

/** Give every photograph the row it sits on and which way that row leaves.
 *
 *  <PhotoStream> justifies with flex-wrap, so a row is not an element and
 *  there is nothing to select. The photographs are found by the label
 *  <Tile> puts on every one, then grouped by their offsetTop.
 *
 *  The obvious selector, the inline `flex-grow` PhotoStream writes on each
 *  cell, does not work: with grow, shrink and basis all set the browser
 *  serialises the style attribute as the `flex` shorthand, so
 *  `[style*="flex-grow"]` matches nothing. Cost an hour.
 *
 *  Runs once per layer per layout, not per swap: the answer only changes
 *  when the rows reflow. */
function useTileGeometry(root: React.RefObject<HTMLDivElement | null>, cap = 6) {
  useLayoutEffect(() => {
    for (const layer of root.current?.querySelectorAll<HTMLElement>("[data-layer]") ?? []) {
      const mid = layer.offsetWidth / 2;
      let row = -1;
      let lastTop: number | null = null;
      for (const tile of layer.querySelectorAll<HTMLElement>("button[aria-label]")) {
        const top = tile.offsetTop;
        // Not `Math.abs(top - lastTop) > 2` against a NaN seed: NaN fails
        // every comparison, so the first row silently stayed at -1.
        if (lastTop === null || Math.abs(top - lastTop) > 2) {
          row += 1;
          lastTop = top;
        }
        tile.style.setProperty("--row", String(Math.min(row, cap)));
        /* Which edge this photograph leaves by: the near one.
           Alternating whole rows left and right was tried first and it is
           noise -- a row travelling the full width passes over every
           photograph in the rows above and below it, and with a page this
           dense that reads as a shuffle rather than as a movement. Sending
           each one to the edge it is already closest to means nothing ever
           crosses the middle, and the grid opens down its own centre. */
        tile.style.setProperty("--side", tile.offsetLeft + tile.offsetWidth / 2 < mid ? "-1" : "1");
        tile.classList.add("swap-tile");
      }
    }
  });
}

/** Point every photograph in `layer` at the caret, as its own vector.
 *
 *  Read at the press rather than at layout, because it is a fact about
 *  where two things are on the SCREEN, and the caret is in the header
 *  while the photographs scroll under it. */
function aimAtTheDoor(layer: HTMLElement | null, door: HTMLElement | null) {
  if (!layer || !door) return;
  const d = door.getBoundingClientRect();
  const dx = d.left + d.width / 2;
  const dy = d.top + d.height / 2;
  for (const tile of layer.querySelectorAll<HTMLElement>(".swap-tile")) {
    const t = tile.getBoundingClientRect();
    tile.style.setProperty("--gx", `${Math.round(dx - (t.left + t.width / 2))}px`);
    tile.style.setProperty("--gy", `${Math.round(dy - (t.top + t.height / 2))}px`);
  }
}

/* ------------------------------------------------------------------ *
 *  The room
 * ------------------------------------------------------------------ */

export default function SwapRoom() {
  const [variant, setVariant] = useState<Variant>("parting");
  const [classEmpty, setClassEmpty] = useState(false);

  /* Which half the page is on. It changes at the press, in every variant,
     because a control that does not answer in the first frame is most of
     what "jittery" means. */
  const [scope, setScope] = useState<PhotoScope>("valley");

  /* The half on its way out, and how. Null at rest. */
  const [leaving, setLeaving] = useState<{ scope: PhotoScope; v: Variant; dir: "down" | "up" } | null>(
    null
  );

  const [dim, setDim] = useState(false);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    []
  );

  const stage = useRef<HTMLDivElement>(null);
  const door = useRef<HTMLSpanElement>(null);
  useTileGeometry(stage);

  /* ---------------- the river's own state ---------------- */
  const [bucket, setBucket] = useState("");
  const [order, setOrder] = useState<RiverOrder>("newest");
  const [search, setSearch] = useState("");
  const [at, setAt] = useState<{ scope: PhotoScope; index: number } | null>(null);

  const archiveOf = useCallback(
    (s: PhotoScope) => (s === "class" ? (classEmpty ? [] : CLASS_ARCHIVE) : VALLEY_ARCHIVE),
    [classEmpty]
  );

  const photosOf = useCallback(
    (s: PhotoScope) => {
      const all = archiveOf(s);
      // Only the valley has buckets, which is why the class side has no
      // bucket line to press.
      const kept = bucket && s === "valley" ? all.filter((p) => p.subject.includes(bucket)) : all;
      if (order === "oldest") return [...kept].reverse();
      if (order === "loved") return [...kept].sort((a, b) => b.loveCount - a.loveCount);
      return kept;
    },
    [archiveOf, bucket, order]
  );

  /* ---------------- the press ---------------- */
  const chooseScope = useCallback(
    (next: PhotoScope) => {
      if (busy.current) return;
      busy.current = true;
      const from: PhotoScope = next === "class" ? "valley" : "class";
      const dir = next === "class" ? "down" : "up";
      const release = () => {
        timers.current.push(setTimeout(() => (busy.current = false), SPENT[variant]));
      };

      if (variant === "today") {
        /* Reproduced beat for beat, and it is the one thing here that is
           honestly on a timer: what it stands in for IS a wait for the
           network. Header first, photographs 660ms later, grey between. */
        setScope(next);
        setDim(true);
        timers.current.push(
          setTimeout(() => {
            setDim(false);
            busy.current = false;
          }, 660)
        );
        return;
      }

      if (variant === "gather") {
        aimAtTheDoor(
          stage.current?.querySelector<HTMLElement>(`[data-layer="${from}"]`) ?? null,
          door.current
        );
      }

      setScope(next);
      setLeaving({ scope: from, v: variant, dir });
      release();
    },
    [variant]
  );

  /* ---------------- how tall the box is ---------------- */
  /* Both halves are absolutely positioned in the same box, so the box has
     to be told its own height. It is the height of the half on screen --
     except while one is leaving, when it is the TALLER of the two.
     Shrinking to the arriving half at the press would clip the leaving
     one's lower rows out of existence in the same frame, which is the
     exact pop this whole version exists to avoid. */
  const [heights, setHeights] = useState<Record<PhotoScope, number>>({ valley: 0, class: 0 });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const read = () => {
      const next: Record<PhotoScope, number> = { valley: 0, class: 0 };
      for (const layer of el.querySelectorAll<HTMLElement>("[data-layer]")) {
        next[layer.dataset.layer as PhotoScope] = layer.offsetHeight;
      }
      setHeights((prev) =>
        prev.valley === next.valley && prev.class === next.class ? prev : next
      );
    };
    read();
    const ro = new ResizeObserver(read);
    for (const layer of el.querySelectorAll<HTMLElement>("[data-layer]")) ro.observe(layer);
    return () => ro.disconnect();
  }, [bucket, order, classEmpty]);

  const boxHeight = leaving
    ? Math.max(heights[scope], heights[leaving.scope])
    : heights[scope] || undefined;

  /* How far the film travels: the leaving frame's own height, plus the gap
     between frames. Only "the advance" reads it. */
  const filmTravel = leaving ? heights[leaving.scope] + 48 : 0;

  const viewerPhotos = photosOf(at?.scope ?? scope);
  const images: ViewerImage[] = useMemo(
    () =>
      viewerPhotos.map((p) => ({
        src: p.url,
        caption: p.caption,
        author: p.uploader,
        date: p.takenLabel,
        where: p.area,
        tags: p.subject.map(bucketLabel),
        href: `/collection/${p.id}`,
        loved: p.loved,
        loveCount: p.loveCount,
      })),
    [viewerPhotos]
  );

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <Link
        href="/lab"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <PeaksMark size={18} /> Lab
      </Link>

      <div className="mx-auto mt-5 w-full max-w-[1600px]">
        {/* ---------------- the picker ---------------- */}
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {VARIANTS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setVariant(o.v)}
                aria-pressed={variant === o.v}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  variant === o.v
                    ? "bg-canopy text-white"
                    : "bg-paper text-muted-foreground hover:text-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {VARIANTS.find((o) => o.v === variant)?.note}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-[13px]">
            <Switch
              on={classEmpty}
              onToggle={() => setClassEmpty((v) => !v)}
              label="Show the class side with no photographs in it, which is what yours has"
            />
          </div>

          <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Both halves are built and decoded when the page loads, so nothing is
            ever arriving. Only the half you are leaving moves. Press the caret
            beside the title, and press it again to come back.
          </p>
        </div>

        {/* ---------------- the specimen ---------------- */}
        <div className="mt-10">
          <header className="group/header mb-6 flex flex-nowrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
                {/* THE TITLE JUST CHANGES, with nothing animating it.
                    Two things were tried here and both were worse. Rolling
                    the changing word, with the rest of the line gliding
                    across the width difference, read to the owner as "a weird
                    glitching near the Valley/Class word": two absolutely
                    positioned words crossing under a transform is where
                    subpixel text rendering goes to die. Then a fixed-width
                    box holding the longer word, so the caret could never
                    move: it works, and it leaves a visible hole -- "The Class
                    [gap] Collection".

                    So the caret moves 12px, and that is fine. It was never
                    the 12px that was wrong. It was that the 12px was the only
                    thing happening for the next 600ms. Under a movement this
                    size nobody will ever see it. */}
                {scope === "class" ? "The Class Collection" : "The Valley Collection"}
                <span ref={door} className="inline-block align-baseline">
                  <ScopeCaret scope={scope} onScope={chooseScope} canSeeClass />
                </span>
              </h1>
            </div>
            <div className="mt-px flex flex-nowrap items-center justify-end gap-2.5 shrink-0">
              <SearchPill
                value={search}
                onChange={setSearch}
                placeholder={scope === "class" ? "Search your class" : "Search the Collection"}
                label="Search photographs by caption, place or contributor"
                restLabel={scope === "class" ? "Search your class" : "Search the Collection"}
              />
              <Button variant="primary" size="icon" className="sm:hidden" aria-label="Contribute">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="primary" className="hidden sm:inline-flex">
                <Plus className="h-4 w-4" />
                Contribute
              </Button>
            </div>
          </header>

          {/* THE BUCKET LINE KEEPS ITS BOX. On the class side <RiverControls>
              renders nothing where the six words were, and the row is
              `justify-between`: with one child left, "Newest" walks from the
              right edge of the page to the left, and on a phone the row
              un-wraps and pulls the river up 38px. Two jumps nobody asked
              for, both at the moment of the press. So the words go and the
              space they were in does not. Anything shipping this owes the
              keyboard the same courtesy the mouse gets here: `inert` on the
              nav, not just pointer-events. */}
          <div
            className={variant === "today" ? undefined : "swap-chrome"}
            data-buckets={variant !== "today" && scope === "class" ? "off" : "on"}
          >
            <RiverControls
              scope={variant === "today" ? scope : "valley"}
              bucket={bucket}
              onBucket={setBucket}
              order={order}
              onOrder={setOrder}
              markerId="swap-bucket"
            />
          </div>

          <div
            ref={stage}
            className="swap-stage relative mt-4 min-w-0"
            style={{ height: boxHeight }}
          >
            {(["valley", "class"] as PhotoScope[]).map((half) => {
              const isLeaving = leaving?.scope === half;
              const onScreen = scope === half || isLeaving;
              return (
                <div
                  key={half}
                  data-layer={half}
                  data-leave={isLeaving ? leaving.v : undefined}
                  data-dir={isLeaving ? leaving.dir : undefined}
                  /* The film strip is the one variant where BOTH halves move,
                     by the same distance, in the same direction, because that
                     is what makes it one rigid object rather than two things
                     passing each other. */
                  data-ride={
                    !isLeaving && leaving?.v === "advance" ? leaving.dir : undefined
                  }
                  aria-hidden={onScreen ? undefined : true}
                  onAnimationEnd={(e) => {
                    if (e.target !== e.currentTarget) return;
                    setLeaving(null);
                  }}
                  className={cn(
                    "absolute inset-x-0 top-0",
                    /* Hidden, NOT unmounted, and this is the whole design:
                       every photograph in both halves is decoded at load, so
                       there is never anything to populate. `invisible` still
                       lays out and still loads. */
                    !onScreen && "invisible",
                    isLeaving && "pointer-events-none z-10",
                    dim && scope !== half && "swap-dim"
                  )}
                >
                  <RiverOrEmpty
                    photos={photosOf(half)}
                    order={order}
                    scope={half}
                    onOpen={(index) => setAt({ scope: half, index })}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* The advance needs one number the stylesheet cannot work out. */}
      <style>{`.swap-stage { --film: ${filmTravel}px; }`}</style>

      <ImageViewer
        images={images}
        initialIndex={at?.index ?? 0}
        open={at !== null}
        onClose={() => setAt(null)}
        showCount={false}
      />
    </div>
  );
}

function RiverOrEmpty({
  photos,
  order,
  scope,
  onOpen,
}: {
  photos: PhotoData[];
  order: RiverOrder;
  scope: PhotoScope;
  onOpen: (index: number) => void;
}) {
  if (scope === "class" && photos.length === 0) return <ClassEmpty />;
  return <PhotoRiver photos={photos} order={order} onOpen={onOpen} />;
}

/** The real page's empty class, word for word, because for most members
 *  this IS the arrival and it has to be judged as one. */
function ClassEmpty() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-14 text-center">
      <p className="font-heading text-xl tracking-tight text-foreground">
        Nothing from your class yet.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Photographs added here stay with the class of 2023. Nobody else in the school can see
        them.
      </p>
      <Button variant="primary" className="mt-5 rounded-full">
        <Plus className="h-4 w-4" />
        Add the first one
      </Button>
    </div>
  );
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-sm)] py-1 transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-[14px] w-[14px] rounded-[4px] border transition-colors duration-150",
          on ? "border-canopy bg-canopy" : "border-foreground/30"
        )}
      />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  The three ways out, as CSS
 *
 *  Transform only. There is no opacity keyframe on a photograph anywhere
 *  in here, and no scale on one either: the owner asked why the pictures
 *  were moving and enlarging, and the honest answer was that they had no
 *  business doing it.
 *
 *  Every layer also runs `swapSpent`, an animation that changes nothing
 *  and exists to fire one `animationend` when the whole staggered
 *  sequence is over. Without it there is nothing to listen to, because
 *  the layer itself does not move in two of the three.
 * ------------------------------------------------------------------ */
const CSS = `
/* The box clips, so a photograph on its way out leaves the page rather
   than stretching it. */
.swap-stage { overflow: hidden; }
.swap-dim { opacity: .4; transition: opacity 200ms ease-out; }

[data-leave] { animation: swapSpent 620ms linear both; }
@keyframes swapSpent { from { opacity: 1; } to { opacity: 1; } }

/* ---- the parting ---- */
[data-leave="parting"] .swap-tile {
  animation: swapPart 380ms ease-in both;
  animation-delay: calc(var(--row, 0) * 30ms);
}
@keyframes swapPart {
  from { transform: none; }
  to { transform: translateX(calc(var(--side, 1) * 55vw)) rotate(calc(var(--side, 1) * 1.5deg)); }
}

/* ---- the gather ---- */
/* Up and out under the header, leaning toward the caret rather than
   piling on it. Aiming all forty-eight straight AT the door was tried and
   it is a heap: they all pass through the same corridor and arrive on top
   of each other. At four tenths of the horizontal distance they keep the
   spread they had, so the page reads as being drawn upward into the
   header rather than swept into a corner. No shrinking on the way -- the
   box clips at the top of the river, so a photograph reaching the header
   is simply gone. */
[data-leave="gather"] .swap-tile {
  animation: swapGather 330ms ease-in both;
  animation-delay: calc(var(--row, 0) * 55ms);
}
@keyframes swapGather {
  from { transform: none; }
  to { transform: translate(calc(var(--gx, 0) * 0.4), var(--gy, 0)); }
}

/* ---- the advance ---- */
/* Both halves move by the same distance in the same direction, which is
   what makes it one strip rather than two things passing. The 3% overshoot
   at 86% is the seat: a film advance stops by catching, not by easing. */
[data-leave="advance"] { animation: swapFilmOut 520ms ease-out both; }
[data-ride] { animation: swapFilmIn 520ms ease-out both; }
[data-leave="advance"][data-dir="down"], [data-ride="down"] { --film-sign: -1; }
[data-leave="advance"][data-dir="up"], [data-ride="up"] { --film-sign: 1; }

@keyframes swapFilmOut {
  from { transform: none; }
  86% { transform: translateY(calc(var(--film-sign) * (var(--film) + 14px))); }
  to { transform: translateY(calc(var(--film-sign) * var(--film))); }
}
@keyframes swapFilmIn {
  from { transform: translateY(calc(var(--film-sign) * -1 * var(--film))); }
  86% { transform: translateY(calc(var(--film-sign) * 14px)); }
  to { transform: none; }
}

/* ---- the controls line ---- */
.swap-chrome nav[aria-label^="Filter"] { transition: opacity 220ms ease-out; }
.swap-chrome[data-buckets="off"] nav[aria-label^="Filter"] { opacity: 0; pointer-events: none; }
`;
