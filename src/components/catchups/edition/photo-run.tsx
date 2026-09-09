"use client";

/* ------------------------------------------------------------------ *
 *  A wall question's answers, as a RUN.
 *
 *  HE PICKED THIS, 2026-09-09, off `/lab/catchups/wall`, where it was
 *  drawn against a drift and a stack: "I pick 'a run'". Two rules came
 *  with the pick and both are in the code below -- NO CAPTIONS, because
 *  there is nowhere in a band to set a paragraph so anybody's words live
 *  in the viewer; and NO COUNT LINE, which was drawn once above the band
 *  and deleted on sight ("delete this random stat").
 *
 *  THE ASK, brief 16: "we definitely have to add a photo wall for
 *  questions where people can just, I don't know, add photos, but it needs
 *  to be modular and work with everything else." `photo-wall` has been a
 *  question kind since the feature was built and had never been drawn.
 *
 *  THE NUMBER THAT DECIDED IT, measured at 1512: at two hundred
 *  photographs a run is 353px of page, a stack 666px and a drift 33,469px.
 *  The run spends 64,735px sideways instead. A grid was never one of the
 *  three: two dozen photographs in a grid is a contact sheet, and a
 *  contact sheet says these are proofs, pick one.
 *
 *  THE THREE DECISIONS, each the difference between a strip of film and a
 *  row of thumbnails:
 *
 *  1. THE BAND HAS ONE HEIGHT AND EVERY WIDTH. Nothing is cropped to a
 *     common shape. The band's top and bottom edges are the only straight
 *     lines and they are what make it read as one object.
 *  2. IT BLEEDS OFF THE RIGHT EDGE, so the strip says there is more this
 *     way without a row of dots saying it. His, on the answer photographs:
 *     "You've made the pictures edge to edge, which is a nice touch."
 *  3. ONE PERSON'S PHOTOGRAPHS ARE ONE OBJECT. Frames inside a group sit
 *     3px apart and groups sit 10px apart, and the group carries a single
 *     name under it. Without that, three photographs from one person read
 *     as three people and the wall stops being about the group.
 *
 *  THE CAP IS THREE, which is his too: "cap photo wall also at 3 each",
 *  the same as any answer. So the answering half needed nothing built --
 *  the photo strip already in the composer is the whole of it -- and a
 *  batch of forty tops out at 120 photographs.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FlushAvatar } from "@/components/common/flush-avatar";
import { EntryLoveButton } from "@/components/catchups/edition/entry-love-button";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";
import { byContributor, groupStarts, shotsOf, type WallShot } from "@/lib/photo-wall";
import type { EditionEntry } from "@/lib/catchups-edition-view";

/** One photograph on the wall, carrying the answer it came from so the heart
 *  still belongs to the answer. The flattening and the grouping live in
 *  `lib/photo-wall.ts`, apart from the drawing, because no Edition has ever
 *  used a photo-wall question and a test is the only thing that can check
 *  them. */
type Shot = WallShot<EditionEntry>;

/** Bird, name, heart, on one line. Two decisions in it.
 *
 *  The name TRUNCATES rather than wraps: under a 200px portrait frame a
 *  wrapping name is three lines of type under a picture and the picture stops
 *  being the answer.
 *
 *  The heart sits NEXT TO the name and not at the far right of the frame.
 *  Right-aligned was the first cut and it was wrong the moment two people were
 *  side by side: under a 505px landscape the heart landed about 30px from the
 *  next person's bird, so it read as belonging to them. Bird, name, heart is
 *  one object; bird, name, gap, heart is two. */
function FootLine({ shot }: { shot: Shot }) {
  return (
    <div className="mt-2.5 flex min-w-0 items-center gap-2">
      <FlushAvatar person={shot.by} size={22} />
      <Link
        href={`/profile/${shot.by.id}`}
        className="min-w-0 shrink truncate rounded-sm text-[13px] font-medium leading-none text-foreground transition-opacity duration-150 hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {shot.by.name}
      </Link>
      <span className="-ml-1 shrink-0">
        <EntryLoveButton
          entryId={shot.entry.id}
          initialLoved={shot.entry.lovedByViewer}
          initialCount={shot.entry.loveCount}
        />
      </span>
    </div>
  );
}

export function PhotoRun({
  entries,
  gutter,
}: {
  entries: EditionEntry[];
  /** The page gutter, so the band can bleed past it and back. */
  gutter: number;
}) {
  /* THE BAND IS A CUSTOM PROPERTY, not a prop, and that is the one departure
     from the room. A frame's width is the band times the photograph's own
     ratio, which the room worked out in JavaScript from a `phone` flag -- fine
     in a room, wrong on a page, where the server would then have to guess a
     width and the browser would repaint every frame after mount. `calc()`
     multiplies a length by a number, so the arithmetic moves into CSS and one
     server render is right at both widths.

     210 on a phone and 300 on a laptop. Nothing wider than the column itself,
     so one panorama can never take a whole screen sideways: at the app's
     widest photograph (1.684) a 210px band is 353px, which is why the phone
     number is the column rather than something rounder. */
  const viewer = useImageViewer();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const shots = shotsOf(entries);

  /* How far along the strip you are, read off the scroller rather than counted
     from an index, so it is honest about a 21:9 taking four times the travel
     of a 9:16. Null means the whole wall fits and there is nothing to say. */
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const travel = el.scrollWidth - el.clientWidth;
      setProgress(travel > 8 ? el.scrollLeft / travel : null);
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    ask();
    el.addEventListener("scroll", ask, { passive: true });
    const ro = new ResizeObserver(ask);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", ask);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [entries]);

  if (shots.length === 0) return null;

  const groups = byContributor(shots);
  const starts = groupStarts(groups);

  return (
    <>
      <div
        ref={scroller}
        className="flex gap-2.5 overflow-x-auto [--band:210px] [--max-frame:350px] [scrollbar-width:none] md:[--band:300px] md:[--max-frame:700px] [&::-webkit-scrollbar]:hidden"
        style={{
          marginLeft: -gutter,
          marginRight: -gutter,
          paddingLeft: gutter,
          paddingRight: gutter,
        }}
      >
        {groups.map((group, g) => {
          const start = starts[g];
          return (
            <div key={`${g}-${group[0].entry.id}`} className="shrink-0">
              <div className="flex gap-[3px]">
                {group.map((s, k) => {
                  const at = start + k;
                  return (
                    <button
                      /* Keyed by POSITION: two people can put up the same
                         photograph and a url is not an identity. */
                      key={`${k}-${s.src}`}
                      type="button"
                      onClick={() => viewer.open(at)}
                      onPointerEnter={preloadImageViewer}
                      onFocus={preloadImageViewer}
                      aria-label={`Open ${s.by.name}'s photograph, ${at + 1} of ${shots.length}`}
                      className="group relative block overflow-hidden rounded-[var(--radius-md)] bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      style={{
                        height: "var(--band)",
                        width: `calc(var(--band) * ${s.ratio})`,
                        maxWidth: "var(--max-frame)",
                      }}
                    >
                      <Image
                        src={s.src}
                        alt=""
                        fill
                        sizes="(max-width: 767px) 350px, 700px"
                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                      />
                    </button>
                  );
                })}
              </div>
              <FootLine shot={group[0]} />
            </div>
          );
        })}
      </div>

      {/* The only thing that says how long the strip is. A row of dots would
          be two hundred dots; a hairline is one object at any length. This is
          NOT the count line he deleted -- that one printed how many
          photographs there were, above the band.

          NOT CINNAMON, and that was a real collision rather than a preference:
          at 24 photographs the fill starts 33px wide, and the 2px cinnamon
          mark that opens every question section is 32px wide. Two identical
          cinnamon dashes, one above a question and one under a wall, and the
          eye reads the second as the start of a third question. The mark owns
          cinnamon here; a scroll position is neutral. */}
      {progress !== null && (
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-foreground/12">
          <div
            className="h-full rounded-full bg-foreground/45 transition-[width] duration-100 ease-out"
            style={{ width: `${Math.max(6, progress * 100)}%` }}
          />
        </div>
      )}

      {viewer.mounted && (
        <LazyImageViewer
          images={shots.map((s) => ({
            src: s.src,
            alt: "",
            /* The words live HERE, which is the price of the band: there is
               nowhere in a strip of film to set a paragraph. */
            caption: s.caption,
            author: s.by,
            date: null,
          }))}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}
