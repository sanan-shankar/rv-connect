"use client";

/* ------------------------------------------------------------------ *
 *  The swap between the Collection's two halves, four ways.
 *
 *  What is wrong today, measured in the browser at 1440 with a warm
 *  cache. You press the caret. Nothing happens for 185ms. Then the
 *  title, the caret and the whole bucket line change in a single frame
 *  with no animation on any of them. Then the photographs fade to 40%
 *  and sit there for 466ms. Then they cut out in one frame and the new
 *  ones fade up. One second, four events, three of them hard cuts, and
 *  the header arrives 700ms before the pictures it is describing.
 *
 *  On a phone it is worse: dropping the bucket line un-wraps the
 *  controls row, so the river jumps up 37px the instant you press.
 *
 *  So this room is one Collection at full size with a real caret on it,
 *  and a picker for what that caret does. "Today" is the shipped
 *  behaviour reproduced beat for beat, including the 460ms wait, so the
 *  three proposals are judged against the thing itself rather than
 *  against a memory of it.
 *
 *  Every component under the picker is the real one: <ScopeCaret>,
 *  <RiverControls>, <PhotoRiver>, <SearchPill>. Only the archives are
 *  made up, for the reason /lab/collection already gives. The class half
 *  is fourteen photographs, or none, because his own class holds none and
 *  that is the arrival most members will get.
 *
 *  NO RAIL IN HERE, and it is not an oversight. A third idea belongs with
 *  these three: the rail restating the archive's own shape as the new
 *  half arrives, its marks growing in from the right. It is not built
 *  because `decade-rail.tsx` was being replaced by `year-rail.tsx` in
 *  this same working tree on 2026-08-31, and a transition designed
 *  against a component somebody is deleting is work thrown away twice.
 *  Bring it back once the year rail settles.
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

/** ONE PAGE of the valley, not all 240, because one page is what a swap
 *  actually swaps: `PAGE_SIZE` in `collection/actions.ts` is 48 and the
 *  rest arrives on scroll. Mounting 240 tiles blocked the main thread for
 *  190ms in this room's first draft, which invented a lag the real page
 *  does not have. */
const VALLEY_ARCHIVE: PhotoData[] = LAB_ARCHIVE.slice(0, 48);

/** A class archive is small and recent. Fourteen, off the same fixture, so
 *  both halves are the same photographs seen twice and nothing about the
 *  transition can be an artefact of one set looking nicer than the other. */
const CLASS_ARCHIVE: PhotoData[] = LAB_ARCHIVE.filter(
  (p) => p.era === "2010s" || p.era === "2020s"
)
  .slice(0, 14)
  .map((p, i) => ({ ...p, id: `class-${i}`, scope: "class" as const }));

/* ------------------------------------------------------------------ *
 *  What the caret does
 * ------------------------------------------------------------------ */

type Variant = "today" | "turn" | "dissolve" | "sheet";

/** One river on screen. `enter` is set on the half arriving, `exit` on the
 *  half leaving, and both are null on the one at rest. */
type Layer = {
  run: number;
  scope: PhotoScope;
  enter: { v: Variant; dir: "down" | "up" } | null;
  exit: { v: Variant; dir: "down" | "up" } | null;
};

/** Every number the four transitions run on, in one place, because the
 *  only way to judge two of these against each other is to know they are
 *  not secretly different lengths.
 *
 *  `today` is measured off the shipped page, not invented: 200ms down to
 *  40%, 466ms of nothing, a hard cut, 200ms back up. */
const TIMING: Record<Variant, { exit: number; enterAt: number; enter: number }> = {
  today: { exit: 200, enterAt: 660, enter: 200 },
  /* The exit and the entrance overlap by 50ms, which is what stops the
     page reading as two separate movements with a seam between them. */
  turn: { exit: 240, enterAt: 190, enter: 340 },
  dissolve: { exit: 380, enterAt: 0, enter: 380 },
  sheet: { exit: 300, enterAt: 0, enter: 420 },
};

const VARIANTS: { v: Variant; label: string; note: string }[] = [
  {
    v: "today",
    label: "Today",
    note: "What ships. Header cuts at once, photographs 660ms later, greyed in between.",
  },
  {
    v: "turn",
    label: "The Turn",
    note: "Travel that obeys the caret. Down to the class, up to the valley, and it reverses. Rows lean out of the way top to bottom.",
  },
  {
    v: "dissolve",
    label: "The Dissolve",
    note: "The film dissolve. The old archive grows a touch and fades, the new one settles in from slightly under size.",
  },
  {
    v: "sheet",
    label: "The Sheet",
    note: "The class half is a sheet laid over the valley, and coming back is dismissing it rather than a second arrival.",
  },
];

/* ------------------------------------------------------------------ *
 *  The row stagger
 * ------------------------------------------------------------------ */

/** Give every photograph in `root` the index of the row it sits on, as a
 *  CSS variable the stylesheet turns into a delay.
 *
 *  <PhotoStream> justifies with flex-wrap, so a row is not an element and
 *  there is nothing to select. The photographs are found by the label
 *  <Tile> puts on every one, then grouped by their offsetTop.
 *
 *  The obvious selector, the inline `flex-grow` PhotoStream writes on each
 *  cell, does not work: with grow, shrink and basis all set, the browser
 *  serialises the style attribute as the `flex` shorthand, so a
 *  `[style*="flex-grow"]` matches nothing. Cost an hour.
 *
 *  ONLY THE MOVEMENT IS STAGGERED, never the fade. A staggered opacity is
 *  precisely the "full reloading and things populate unevenly" the river
 *  already had to be fixed for once. The layer fades as one sheet; the
 *  rows lean at slightly different moments underneath it. */
function useRowIndex(root: React.RefObject<HTMLDivElement | null>, cap = 8) {
  useLayoutEffect(() => {
    for (const layer of root.current?.querySelectorAll<HTMLElement>("[data-layer]") ?? []) {
      let row = -1;
      let lastTop: number | null = null;
      for (const tile of layer.querySelectorAll<HTMLElement>("button[aria-label]")) {
        const top = tile.offsetTop;
        // Not `Math.abs(top - lastTop) > 2` against a NaN seed: NaN fails every
        // comparison, so the first row silently stayed at -1.
        if (lastTop === null || Math.abs(top - lastTop) > 2) {
          row += 1;
          lastTop = top;
        }
        tile.style.setProperty("--row", String(Math.min(row, cap)));
        tile.classList.add("swap-cell");
      }
    }
  });
}

/* ------------------------------------------------------------------ *
 *  The title that changes one word
 * ------------------------------------------------------------------ */

/** "The Valley Collection" and "The Class Collection" share three of their
 *  four words, and today the whole line is replaced anyway: the caret
 *  teleports 12px sideways because "Class" is narrower than "Valley".
 *
 *  So only the word that changed changes. It rolls, and everything after
 *  it glides across the difference in width. The glide is a translate off
 *  a measured number, not an animated width, so no layout moves. */
function SwapTitle({
  scope,
  glide,
  caret,
}: {
  scope: PhotoScope;
  glide: boolean;
  caret: React.ReactNode;
}) {
  const valley = useRef<HTMLSpanElement>(null);
  const klass = useRef<HTMLSpanElement>(null);
  /* How much narrower "Class" is than "Valley", in the face actually
     rendering. Measured ONCE: the two words never change, so this costs a
     single extra render at mount and nothing per swap. */
  const [narrower, setNarrower] = useState(0);

  useLayoutEffect(() => {
    const a = valley.current?.offsetWidth ?? 0;
    const b = klass.current?.offsetWidth ?? 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The layout engine IS the external system here: the only way to know how wide Libre Baskerville sets two words is to render them and read them back.
    if (a && b) setNarrower(b - a);
  }, []);

  // The box is the wider word, so "Class" pulls the rest of the line left.
  const dx = scope === "class" ? narrower : 0;

  if (!glide) {
    return (
      <>
        {scope === "class" ? "The Class Collection" : "The Valley Collection"}
        {caret}
      </>
    );
  }

  return (
    <span className="swap-title">
      The{" "}
      <span className="swap-word">
        {/* An invisible copy of the wider word holds the box open, so the two
            real words can sit on top of each other and roll. */}
        <span className="invisible" aria-hidden>
          Valley
        </span>
        <span ref={valley} data-on={scope === "valley"} aria-hidden>
          Valley
        </span>
        <span ref={klass} data-on={scope === "class"} aria-hidden>
          Class
        </span>
      </span>
      {/* The space lives OUTSIDE the glide, because a leading space inside an
          inline-block is collapsed away and the title read "ValleyCollection".
          Out here it also stays put while the rest slides over it, which is
          what keeps the gap after the word exactly one space wide in both
          halves. */}{" "}
      <span className="swap-rest" style={{ transform: `translateX(${dx}px)` }}>
        Collection{caret}
      </span>
      <span className="sr-only">
        {scope === "class" ? "The Class Collection" : "The Valley Collection"}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  The room
 * ------------------------------------------------------------------ */

export default function SwapRoom() {
  const [variant, setVariant] = useState<Variant>("turn");
  const [glide, setGlide] = useState(true);
  const [classEmpty, setClassEmpty] = useState(false);

  /* What the header says. It changes the moment you press, in every
     variant, because the caret has to answer the press in the first frame
     -- 185ms of nothing is most of what "jittery" means. */
  const [scope, setScope] = useState<PhotoScope>("valley");

  /* The rivers on screen: one at rest, two mid-swap.
   *
   *  A LIST, and keyed, for one reason that turned out to matter more than
   *  anything else in this room. The first draft drew the leaving half as a
   *  separate "ghost" element, which meant React unmounted the old river and
   *  mounted a fresh copy of it in the same commit: 190ms of blocked main
   *  thread, no first frame, and an exit that was over before it painted.
   *  Here the leaving layer keeps the key it already had, so it keeps its
   *  DOM and its decoded images and does nothing but take a new class name.
   *  Only the arriving one is built. */
  const [layers, setLayers] = useState<Layer[]>([
    { run: 0, scope: "valley", enter: null, exit: null },
  ]);
  const runs = useRef(0);

  const [dim, setDim] = useState(false);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    []
  );

  const archiveOf = useCallback(
    (s: PhotoScope) => (s === "class" ? (classEmpty ? [] : CLASS_ARCHIVE) : VALLEY_ARCHIVE),
    [classEmpty]
  );

  /** The half the river is showing: the last layer in the list is always the
   *  one arriving, or the only one there is. */
  const live = layers[layers.length - 1];

  const chooseScope = useCallback(
    (next: PhotoScope) => {
      if (busy.current) return;
      busy.current = true;
      const dir = next === "class" ? "down" : "up";
      const t = TIMING[variant];
      /* Only "today" is on a timer, and rightly: what it is reproducing IS a
         wait for the network rather than an animation. */
      const after = (ms: number, fn: () => void) => {
        timers.current.push(setTimeout(fn, ms));
      };

      setScope(next);

      if (variant === "today") {
        /* Reproduced beat for beat. The header has already changed above;
           the photographs stay put, greyed, until the fetch lands, and then
           they are replaced without an entrance of any kind. */
        setDim(true);
        after(t.enterAt, () => {
          runs.current += 1;
          setLayers([{ run: runs.current, scope: next, enter: null, exit: null }]);
          setDim(false);
          busy.current = false;
        });
        return;
      }

      runs.current += 1;
      const arriving = runs.current;
      setLayers((prev) => [
        /* Same key, same DOM: this one is only being told to leave. Its
           `enter` is cleared in the same breath, or the element carries both
           attributes and the browser runs whichever selector wins on
           specificity: a river left the page by playing its own arrival
           backwards from the last swap. */
        { ...prev[prev.length - 1], enter: null, exit: { v: variant, dir } },
        { run: arriving, scope: next, enter: { v: variant, dir }, exit: null },
      ]);
      /* Nothing is timed from here. A setTimeout started at the click runs on
         a different clock from a CSS animation started at the commit, and the
         gap between them is however long React took: the leaving river was
         being deleted at 40% opacity, mid-fade, which is a hard cut wearing
         the costume of a transition. Both ends now listen for their own
         animationend instead. */
    },
    [variant]
  );

  /* ---------------- the river's own state ---------------- */
  const [bucket, setBucket] = useState("");
  const [order, setOrder] = useState<RiverOrder>("newest");
  const [search, setSearch] = useState("");
  const [at, setAt] = useState<number | null>(null);

  const photos = useMemo(() => {
    const all = archiveOf(live.scope);
    const kept = bucket ? all.filter((p) => p.subject.includes(bucket)) : all;
    if (order === "oldest") return [...kept].reverse();
    if (order === "loved") return [...kept].sort((a, b) => b.loveCount - a.loveCount);
    return kept;
  }, [archiveOf, live.scope, bucket, order]);


  const images: ViewerImage[] = useMemo(
    () =>
      photos.map((p) => ({
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
    [photos]
  );


  const stage = useRef<HTMLDivElement>(null);
  useRowIndex(stage);

  const holding = variant !== "today";

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
            <Switch on={glide} onToggle={() => setGlide((v) => !v)} label="Title changes one word" />
            <Switch
              on={classEmpty}
              onToggle={() => setClassEmpty((v) => !v)}
              label="Class holds nothing"
            />
          </div>

          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            The title switch rides on any of the three, so a pick can be a
            combination. Open this on a phone too: today the river jumps up 37px
            the moment the bucket line goes, and the other three hold that line
            open.
          </p>
        </div>

        {/* ---------------- the specimen ---------------- */}
        <div className="mt-10">
          <header className="group/header mb-6 flex flex-nowrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
                <SwapTitle
                  scope={scope}
                  glide={glide && variant !== "today"}
                  caret={<ScopeCaret scope={scope} onScope={chooseScope} canSeeClass />}
                />
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
              un-wraps and pulls the river up 37px. Two jumps nobody asked
              for, both at the moment of the press.

              So the words go, the space they were in does not. The nav is
              still there, faded out, holding the line open. Anything shipping
              this owes the keyboard the same courtesy the mouse gets here:
              `inert` on the nav, not just pointer-events. */}
          <div
            className={holding ? "swap-chrome" : undefined}
            data-buckets={holding && scope === "class" ? "off" : "on"}
          >
            <RiverControls
              scope={holding ? "valley" : scope}
              bucket={bucket}
              onBucket={setBucket}
              order={order}
              onOrder={setOrder}
              markerId="swap-bucket"
            />
          </div>

          <div className="mt-4 flex items-start gap-6 xl:gap-8">
            <div ref={stage} className="relative min-w-0 flex-1">
              {layers.map((layer) => (
                <div
                  key={layer.run}
                  data-layer
                  aria-hidden={layer.exit ? true : undefined}
                  data-enter={layer.enter?.v}
                  data-exit={layer.exit?.v}
                  data-dir={(layer.exit ?? layer.enter)?.dir}
                  onAnimationEnd={(e) => {
                    // The cells' own animations bubble through here too.
                    if (e.target !== e.currentTarget) return;
                    if (layer.exit) setLayers((prev) => prev.filter((l) => !l.exit));
                    else busy.current = false;
                  }}
                  className={cn(
                    "swap-live",
                    /* The half that is leaving comes out of the flow, so the
                       page is already the height of the one arriving and
                       nothing below has to move twice. */
                    layer.exit && "pointer-events-none absolute inset-x-0 top-0",
                    /* Which of the two is on top, and for the Sheet it is the
                       whole idea. Going down, the class is laid OVER the
                       valley, so the arriving half wins. Coming back up, the
                       sheet is being taken off, so the leaving half stays on
                       top all the way out -- which it does by default, an
                       absolutely positioned box painting above a static one.
                       Everything else reads better with the arrival in front. */
                    layer.enter &&
                      !(layer.enter.v === "sheet" && layer.enter.dir === "up") &&
                      "relative z-10",
                    dim && "swap-dim"
                  )}
                >
                  <RiverOrEmpty
                    photos={layer.run === live.run ? photos : archiveOf(layer.scope)}
                    order={order}
                    scope={layer.scope}
                    onOpen={layer.exit ? undefined : setAt}
                  />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      <ImageViewer
        images={images}
        initialIndex={at ?? 0}
        open={at !== null}
        onClose={() => setAt(null)}
        showCount={false}
      />
    </div>
  );
}

/** The leaving half. It has to be able to draw the empty class too, or
 *  coming back from an empty class has nothing to animate out. */
function RiverOrEmpty({
  photos,
  order,
  scope,
  onOpen,
}: {
  photos: PhotoData[];
  order: RiverOrder;
  scope: PhotoScope;
  onOpen?: (index: number) => void;
}) {
  if (scope === "class" && photos.length === 0) return <ClassEmpty />;
  return <PhotoRiver photos={photos} order={order} onOpen={onOpen ?? (() => {})} />;
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
 *  The four transitions, as CSS
 *
 *  Transform and opacity only, on the app's own ease tokens. The layer
 *  fades as one sheet; in "turn" the rows underneath it lean at 22ms
 *  intervals, which is the difference between a page moving and a page
 *  populating.
 * ------------------------------------------------------------------ */
const CSS = `
.swap-live, [data-exit] { will-change: transform, opacity; }

.swap-dim { opacity: .4; pointer-events: none; }
.swap-live { transition: opacity 200ms ease-out; }

/* ---- the turn: down to the class, up to the valley, and it reverses ---- */
[data-enter="turn"] { animation: swapFadeIn 340ms var(--ease-out-smooth) 190ms both; }
[data-enter="turn"] .swap-cell {
  animation: swapLean 340ms var(--ease-out-smooth) both;
  animation-delay: calc(190ms + var(--row, 0) * 22ms);
}
[data-exit="turn"] { animation: swapFadeOut 240ms ease-in both; }
[data-exit="turn"] .swap-cell {
  animation: swapLeanOut 240ms ease-in both;
  animation-delay: calc(var(--row, 0) * 18ms);
}
[data-dir="down"] { --dy: 14px; --dy-out: -12px; }
[data-dir="up"]   { --dy: -14px; --dy-out: 12px; }

@keyframes swapLean { from { transform: translateY(var(--dy)); } to { transform: none; } }
@keyframes swapLeanOut { from { transform: none; } to { transform: translateY(var(--dy-out)); } }

/* ---- the dissolve ---- */
[data-enter="dissolve"] { animation: swapDissolveIn 380ms var(--ease-out-smooth) both; }
[data-exit="dissolve"] { animation: swapDissolveOut 380ms ease-out both; }
@keyframes swapDissolveIn { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: none; } }
@keyframes swapDissolveOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(1.02); } }

/* ---- the sheet: presented on the way in, dismissed on the way out ---- */
[data-enter="sheet"][data-dir="down"] { animation: swapSheetIn 420ms var(--ease-out-smooth) both; }
[data-exit="sheet"][data-dir="down"] { animation: swapSheetUnder 300ms ease-out both; }
[data-enter="sheet"][data-dir="up"] { animation: swapSheetBack 420ms var(--ease-out-smooth) both; }
[data-exit="sheet"][data-dir="up"] { animation: swapSheetOff 300ms ease-in both; }

@keyframes swapSheetIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
@keyframes swapSheetUnder { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-6px) scale(.995); } }
@keyframes swapSheetBack { from { opacity: .4; transform: scale(.99); } to { opacity: 1; transform: none; } }
@keyframes swapSheetOff { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(34px); } }

@keyframes swapFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes swapFadeOut { from { opacity: 1; } to { opacity: 0; } }

/* ---- the controls line ---- */
.swap-chrome nav[aria-label^="Filter"] { transition: opacity 220ms ease-out; }
.swap-chrome[data-buckets="off"] nav[aria-label^="Filter"] { opacity: 0; pointer-events: none; }

/* ---- the title that changes one word ---- */
.swap-title { display: inline; }
.swap-word { position: relative; display: inline-block; }
.swap-word > span:not(.invisible) {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  transition: transform 260ms var(--ease-out-smooth), opacity 200ms ease-out;
}
.swap-word > span[data-on="false"] { opacity: 0; transform: translateY(-.36em); }
.swap-word > span[data-on="true"] { opacity: 1; transform: none; }
/* The word that is arriving comes up from below, the one leaving goes up. */
.swap-word > span[data-on="false"]:last-child { transform: translateY(.36em); }
.swap-rest { display: inline-block; transition: transform 260ms var(--ease-out-smooth); }

`;
