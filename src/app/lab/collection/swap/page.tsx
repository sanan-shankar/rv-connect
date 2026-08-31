"use client";

/* ------------------------------------------------------------------ *
 *  The swap between the Collection's two halves.
 *
 *  ROUND THREE, and this one is the owner's own design rather than mine.
 *
 *  Round one was a cross-fade, a dissolve and a slide. Round two moved
 *  the photographs around in three more ambitious ways, and preloaded
 *  both halves so nothing would ever populate -- which he spotted
 *  immediately as a cheat: *"in these all the photos are just fully
 *  loaded so we can't see how loading new photos would be handled so
 *  this isn't accurate."* He is right. A swap that never waits is not
 *  the swap; the wait IS the thing being designed.
 *
 *  And the ambitious ones were too much: *"advance is the closest thing
 *  but idk it's still a bit amateurish and too much motion."*
 *
 *  His shape, verbatim: *"how about something clean move in the title
 *  and somehow a cute loading that people won't even mind for a second
 *  until everything else comes and then it transitions to the photos.
 *  see now we're immediately showing the pictures and it's haphazardly
 *  loading. but we could just have a tiny loading or something."*
 *
 *  So, three beats and a rule.
 *
 *    1. THE TITLE MOVES. The whole line rolls out upward and the new one
 *       rolls up from below. One element, one transform, so there is no
 *       second copy of the text crossing under the first -- which is
 *       what "a weird glitching near the Valley/Class word" was.
 *    2. A MARK HOLDS THE PLACE. Small, quiet, and never less than half a
 *       second on screen so it can never flash. Three to choose from.
 *    3. THE PHOTOGRAPHS ARRIVE WHOLE. Not one tile at a time: nothing is
 *       rendered until every thumbnail in the page has been decoded, and
 *       then the grid comes up as one.
 *
 *  The rule underneath: NOTHING IS SHOWN UNTIL EVERYTHING IS READY. That
 *  is the opposite of what ships, which holds the old photographs greyed
 *  for half a second and then swaps in the new ones as they land.
 *
 *  The wait is REAL here, not skipped. `--latency` stands in for the
 *  server action (measured at 466ms on the live page) and the decode
 *  after it is genuine: `warmThumbs`, the same function the Collection
 *  already uses, run over the whole page rather than its first twelve.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Button } from "@/components/ui/button";
import { SearchPill } from "@/components/layout/search-pill";
import { RiverControls } from "@/components/collection/river-controls";
import { PhotoRiver, warmThumbs } from "@/components/collection/photo-river";
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

/** ONE PAGE of the valley: `PAGE_SIZE` in `collection/actions.ts` is 48
 *  and the rest arrives on scroll. */
const VALLEY_ARCHIVE: PhotoData[] = LAB_ARCHIVE.slice(0, 48);

/** A class archive is small and recent. */
const CLASS_ARCHIVE: PhotoData[] = LAB_ARCHIVE.filter(
  (p) => p.era === "2010s" || p.era === "2020s"
)
  .slice(0, 14)
  .map((p, i) => ({ ...p, id: `class-${i}`, scope: "class" as const }));

/* ------------------------------------------------------------------ *
 *  The beats
 * ------------------------------------------------------------------ */

/** The title turns over in two halves rather than crossing itself. The
 *  old line goes, and only once it is gone does the new one arrive: two
 *  lines of 30px serif dissolving through each other in the same place is
 *  exactly the "weird glitching" the one-word roll was. The way back in
 *  takes 180ms and lives in the stylesheet: nothing here waits on it, so
 *  a second copy of the number here would only be a thing to get wrong. */
const TITLE_OUT_MS = 140;
/** How long the old photographs take to go. Short, and no travel at all:
 *  they are not the event, the title is. */
const LEAVE_MS = 180;
/** How long the new ones take to come up, all together. */
const ARRIVE_MS = 320;
/** The mark's floor, measured from when it appears. A loading state that
 *  shows for 90ms and vanishes is worse than none: it reads as a flicker
 *  rather than as a wait. This is also the owner asking for it -- "a cute
 *  loading that people won't even mind for a second" -- so on a fast
 *  connection the mark is deliberately held rather than skipped. */
const MARK_FLOOR_MS = 420;

const WAITS = [
  { ms: 250, label: "Fast" },
  { ms: 600, label: "Typical" },
  { ms: 1500, label: "Slow" },
];

type Mark = "bird" | "peaks" | "frame";
const MARKS: { v: Mark; label: string; note: string }[] = [
  { v: "bird", label: "A bird", note: "One of the fifty, hopping where the photographs will be." },
  { v: "peaks", label: "The peaks", note: "The mark from the sidebar, breathing." },
  { v: "frame", label: "One warm frame", note: "A single photograph-shaped box with the house shimmer in it." },
];

type Phase = "rest" | "leaving" | "waiting" | "arriving";

/* ------------------------------------------------------------------ *
 *  The room
 * ------------------------------------------------------------------ */

export default function SwapRoom() {
  const [today, setToday] = useState(false);
  const [mark, setMark] = useState<Mark>("bird");
  const [wait, setWait] = useState(600);
  const [classEmpty, setClassEmpty] = useState(false);

  /* THREE FACTS, THREE MOMENTS, and the separation is the design.
     `going` is where you are headed and it changes in the frame you press:
     the caret rotates, the bucket line starts to go. `titled` is the words,
     which turn over a beat later. `shown` is the photographs, which do not
     change until every one of them is decoded and ready. */
  const [going, setGoing] = useState<PhotoScope>("valley");
  const [titled, setTitled] = useState<PhotoScope>("valley");
  const [shown, setShown] = useState<PhotoScope>("valley");
  const [phase, setPhase] = useState<Phase>("rest");
  const [titleGone, setTitleGone] = useState(false);
  /* Which way the title turns. Down to the class, up to the valley. */
  const [dir, setDir] = useState<"down" | "up">("down");

  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
    },
    []
  );
  const after = (ms: number) =>
    new Promise<void>((r) => timers.current.push(setTimeout(r, ms)));

  const [bucket, setBucket] = useState("");
  const [order, setOrder] = useState<RiverOrder>("newest");
  const [search, setSearch] = useState("");
  const [at, setAt] = useState<number | null>(null);

  const photosOf = useCallback(
    (s: PhotoScope) => {
      const all = s === "class" ? (classEmpty ? [] : CLASS_ARCHIVE) : VALLEY_ARCHIVE;
      const kept = bucket && s === "valley" ? all.filter((p) => p.subject.includes(bucket)) : all;
      if (order === "oldest") return [...kept].reverse();
      if (order === "loved") return [...kept].sort((a, b) => b.loveCount - a.loveCount);
      return kept;
    },
    [classEmpty, bucket, order]
  );

  const chooseScope = useCallback(
    async (next: PhotoScope) => {
      if (busy.current) return;
      busy.current = true;
      setDir(next === "class" ? "down" : "up");
      /* The caret answers in the frame it was pressed, always. A control
         that sits still for a fifth of a second is most of what "jittery"
         means, and it is the one thing every version of this has agreed on. */
      setGoing(next);

      if (today) {
        setTitled(next);
        setPhase("waiting");
        await after(wait);
        setShown(next);
        setPhase("rest");
        busy.current = false;
        return;
      }

      /* THE FETCH STARTS NOW, not after the animation. Everything below
         happens over the top of it, so the round trip is spent rather than
         added: the title turning over and the photographs leaving cost no
         wall clock at all. */
      const ready = (async () => {
        await after(wait);
        /* THE WHOLE PAGE, not `warmThumbs`'s default first twelve. The
           owner: "until everything else comes and then it transitions to
           the photos." Everything means everything. */
        await warmThumbs(photosOf(next), 999);
      })();

      /* 1. The title turns over, and the old photographs go. */
      setTitleGone(true);
      setPhase("leaving");
      await after(TITLE_OUT_MS);
      setTitled(next);
      setTitleGone(false);
      await after(LEAVE_MS - TITLE_OUT_MS);

      /* 2. The mark holds the place. The floor runs from HERE, not from
            the press, so it is a promise about how long the mark is seen
            rather than about how long the swap takes. */
      setPhase("waiting");
      await Promise.all([ready, after(MARK_FLOOR_MS)]);

      /* 3. And the photographs arrive whole. */
      setShown(next);
      setPhase("arriving");
      await after(ARRIVE_MS);
      setPhase("rest");
      busy.current = false;
    },
    [today, wait, photosOf]
  );

  const photos = useMemo(() => photosOf(shown), [photosOf, shown]);

  /* THE RIVER AS A STABLE ELEMENT, and it is worth the line.
     `<PhotoRiver>` is re-created on every render, so React re-renders all
     forty-eight tiles every time anything on this page changes -- and the
     press changes four things. Measured: 152ms of blocked main thread
     between the click and the first painted frame, which is a fifth of a
     second in which the caret does not answer. Holding the element itself
     lets React bail out when nothing it depends on moved. The real page
     has the same problem and the same fix, one `memo()` on PhotoRiver. */
  const river = useMemo(
    () => <PhotoRiver photos={photos} order={order} onOpen={setAt} />,
    [photos, order]
  );

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

  /* The mark is up only while there is genuinely nothing to show. Not
     during the leave, when the old photographs are still fading. */
  const waiting = phase === "waiting" && !today;

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
          <Row label="The caret">
            <Pill on={today} onClick={() => setToday(true)}>
              Today
            </Pill>
            <Pill on={!today} onClick={() => setToday(false)}>
              Nothing until everything
            </Pill>
          </Row>

          <Row label="The mark">
            {MARKS.map((m) => (
              <Pill key={m.v} on={!today && mark === m.v} onClick={() => setMark(m.v)} dim={today}>
                {m.label}
              </Pill>
            ))}
          </Row>

          <Row label="The wait">
            {WAITS.map((w) => (
              <Pill key={w.ms} on={wait === w.ms} onClick={() => setWait(w.ms)}>
                {w.label} <span className="opacity-60">{w.ms}ms</span>
              </Pill>
            ))}
          </Row>

          <p className="mt-4 max-w-2xl border-t border-border pt-3 text-[13px] leading-relaxed text-muted-foreground">
            {today
              ? "What ships. The title cuts the instant you press, the old photographs sit there greyed for the whole round trip, and the new ones replace them the moment they land."
              : `The title rolls, ${MARKS.find((m) => m.v === mark)?.note.toLowerCase()} And nothing is drawn until every thumbnail on the page has decoded, so the grid comes up whole rather than filling in.`}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <Switch
              on={classEmpty}
              onToggle={() => setClassEmpty((v) => !v)}
              label="Show the class side with no photographs in it, which is what yours has"
            />
          </div>

          <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            The wait is real: the fetch is stood in for by the number above, and
            the decode after it is the Collection&apos;s own `warmThumbs` run over
            the whole page. The live page measured 466ms, which is the Typical
            button.
          </p>
        </div>

        {/* ---------------- the specimen ---------------- */}
        <div className="mt-10">
          <header className="group/header mb-6 flex flex-nowrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
                {/* THE WHOLE LINE ROLLS, not the one word inside it.
                    Rolling "Valley" into "Class" while the rest of the
                    line glided across the width difference was tried, and
                    it is where subpixel text rendering goes to die: two
                    absolutely positioned words crossing under a transform.
                    One element carrying one text node cannot do that. It
                    also takes the caret with it, which is how the mark
                    gets from the end of a nineteen-character title to the
                    end of an eighteen-character one without being seen to
                    move. */}
                <span
                  key={titled}
                  className={cn(
                    "swap-title",
                    !today && (titleGone ? `out-${dir}` : `in-${dir}`)
                  )}
                >
                  {titled === "class" ? "The Class Collection" : "The Valley Collection"}
                </span>
                {/* OUTSIDE the roll, so the mark you pressed stays under
                    your finger and only rotates. Its 12px shift lands in
                    the beat where the words beside it are not there. */}
                <ScopeCaret scope={going} onScope={chooseScope} canSeeClass />
              </h1>
            </div>
            <div className="mt-px flex flex-nowrap items-center justify-end gap-2.5 shrink-0">
              <SearchPill
                value={search}
                onChange={setSearch}
                placeholder={going === "class" ? "Search your class" : "Search the Collection"}
                label="Search photographs by caption, place or contributor"
                restLabel={going === "class" ? "Search your class" : "Search the Collection"}
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

          {/* The bucket line keeps its box. On the class side <RiverControls>
              renders nothing where the six words were, and the row is
              `justify-between`: with one child left, "Newest" walks from the
              right edge of the page to the left, and on a phone the row
              un-wraps and pulls the river up 38px. Two jumps nobody asked
              for. So the words go and the space they were in does not.
              Anything shipping this owes the keyboard the same courtesy the
              mouse gets here: `inert` on the nav, not just pointer-events. */}
          <div
            className={today ? undefined : "swap-chrome"}
            data-buckets={!today && going === "class" ? "off" : "on"}
          >
            <RiverControls
              scope={today ? going : "valley"}
              bucket={bucket}
              onBucket={setBucket}
              order={order}
              onOrder={setOrder}
              markerId="swap-bucket"
            />
          </div>

          <div className="relative mt-4 min-w-0">
            {waiting && <Holding mark={mark} />}

            <div
              key={`${shown}-${phase === "arriving" ? "in" : "at"}`}
              className={cn(
                phase === "arriving" && "swap-arrive",
                /* `swap-leave` and `hidden` are mutually exclusive and were
                   not: a display:none element runs no animation, so the
                   photographs skipped their exit entirely and simply
                   blinked out. The grid is only taken out of the layout
                   once it has finished leaving. */
                phase === "leaving" && "swap-leave",
                waiting && "hidden",
                today && phase === "waiting" && "swap-dim"
              )}
            >
              {shown === "class" && photos.length === 0 ? <ClassEmpty /> : river}
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

/** The mark that holds the place.
 *
 *  ON THE LEFT, not in the middle, and low rather than tall. Centred in a
 *  box the width of the page it is a speck in a void: the archive it
 *  replaced was two thousand pixels tall, so collapsing to a short box
 *  with something small in the middle of it reads as an accident. Sitting
 *  where the first photograph starts, on the page's own left spine, it
 *  reads as the first photograph being on its way. */
function Holding({ mark }: { mark: Mark }) {
  return (
    <div className="flex h-[132px] items-center" role="status" aria-label="Loading">
      {mark === "bird" && (
        <span className="swap-hop">
          <BirdAvatar user={{ id: "swap-hoopoe" }} size={32} />
        </span>
      )}
      {mark === "peaks" && (
        <span className="swap-breathe text-muted-foreground">
          <PeaksMark size={28} />
        </span>
      )}
      {mark === "frame" && (
        <span className="skeleton-warm block h-[104px] w-[138px] rounded-[var(--radius-md)]" />
      )}
    </div>
  );
}

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

/* ---- the room's own chrome ---- */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1.5">
      <span className="w-[74px] shrink-0 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Pill({
  on,
  dim,
  onClick,
  children,
}: {
  on: boolean;
  dim?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        on ? "bg-canopy text-white" : "bg-paper text-muted-foreground hover:text-foreground",
        dim && !on && "opacity-45"
      )}
    >
      {children}
    </button>
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
 *  Three beats, as CSS. Transform and opacity only.
 * ------------------------------------------------------------------ */
const CSS = `
/* ---- 1. the title ---- */
/* The line rolls out of the way and the new one rolls up into its place,
   in the direction the caret points: down to the class, up to the valley.
   0.34em is a third of a line rather than a whole one, so it reads as the
   same title turning over and not as two titles passing. */
.swap-title { display: inline-block; }
/* Out then in, never both at once. 0.34em is a third of a line rather than
   a whole one, so it reads as the same title turning over and not as two
   titles passing each other. */
.swap-title.out-down { animation: swapTitleOutDown 140ms ease-in both; }
.swap-title.out-up { animation: swapTitleOutUp 140ms ease-in both; }
.swap-title.in-down { animation: swapTitleInDown 180ms var(--ease-out-smooth) both; }
.swap-title.in-up { animation: swapTitleInUp 180ms var(--ease-out-smooth) both; }
@keyframes swapTitleOutDown { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-0.34em); } }
@keyframes swapTitleOutUp { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(0.34em); } }
@keyframes swapTitleInDown { from { opacity: 0; transform: translateY(0.34em); } to { opacity: 1; transform: none; } }
@keyframes swapTitleInUp { from { opacity: 0; transform: translateY(-0.34em); } to { opacity: 1; transform: none; } }

/* ---- 2. the mark ---- */
/* A hop, not a spin. One beat a second, and it lands: a loader that never
   stops moving is a thing you watch, and this one is meant to be ignored. */
.swap-hop { display: inline-block; animation: swapHop 1s ease-in-out infinite; }
@keyframes swapHop {
  0%, 62%, 100% { transform: translateY(0); }
  30% { transform: translateY(-9px); }
  46% { transform: translateY(0); }
}
.swap-breathe { display: inline-block; animation: swapBreathe 2.2s ease-in-out infinite; }
@keyframes swapBreathe {
  0%, 100% { opacity: .45; }
  50% { opacity: 1; }
}

/* ---- 3. the photographs ---- */
/* Out is a fade with no travel at all: they are not the event. In is one
   movement for the whole grid, never per tile, because every thumbnail on
   the page has already decoded by the time this runs. */
.swap-leave { animation: swapPhotosOut 180ms ease-out both; }
@keyframes swapPhotosOut { from { opacity: 1; } to { opacity: 0; } }
.swap-arrive { animation: swapPhotosIn 320ms var(--ease-out-smooth) both; }
@keyframes swapPhotosIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
.swap-dim { opacity: .4; transition: opacity 200ms ease-out; }

/* ---- the controls line ---- */
.swap-chrome nav[aria-label^="Filter"] { transition: opacity 220ms ease-out; }
.swap-chrome[data-buckets="off"] nav[aria-label^="Filter"] { opacity: 0; pointer-events: none; }
`;
