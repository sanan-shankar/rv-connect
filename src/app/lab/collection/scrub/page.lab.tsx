"use client";

/* ------------------------------------------------------------------ *
 *  Delight room: four ways to say "hold this".
 *
 *  "People don't really intuit that you can drag on the normal looking
 *  one and it's hard to contact it at times. Google photos is a very
 *  obvious easy to use one. Something like that probably but more
 *  pretty" (owner, 2026-09-12).
 *
 *  So: the real river, 240 photographs deep, on a phone, with the
 *  scrubber's face swappable underneath your thumb. The diagnosis and
 *  what each face is arguing are in `_scrubbers.tsx`; this room is only
 *  the place to reach for them.
 *
 *  IT RENDERS THE WHOLE ARCHIVE AT ONCE, and that is the one honest
 *  difference from `/lab/collection` next door. That room reimplements
 *  paging so the seek and the scroll-anchored prepend can be judged;
 *  none of that is what a thumb is touching, and a river that grows
 *  under the reader would change the track's length mid-drag and make
 *  four faces impossible to compare. Every band heading is in the DOM
 *  from the first frame, so the scale is the archive and the seek is a
 *  scroll to a heading that is already there.
 * ------------------------------------------------------------------ */

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { PhotoRiver, landAt } from "@/components/collection/photo-river";
import { LazyImageViewer as ImageViewer } from "@/components/common/lazy-image-viewer";
import type { ViewerImage } from "@/components/common/image-viewer";
import { toViewerImage } from "@/lib/collection-viewer-image";
import { bandKeyOf } from "@/lib/collection";
import { cn } from "@/lib/utils";
import { LAB_ARCHIVE, takenKeyOf } from "../_archive";
import { FACE_NAMES, LabScrubber, type ScrubFace } from "./_scrubbers";

export default function ScrubRoom() {
  const [face, setFace] = useState<ScrubFace>("signpost");
  const [persist, setPersist] = useState(true);
  const [tapOpens, setTapOpens] = useState(true);
  const [inTime, setInTime] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [at, setAt] = useState<number | null>(null);
  const [activeBand, setActiveBand] = useState("");
  const tail = useRef<HTMLDivElement>(null);

  const photos = useMemo(() => {
    const all = [...LAB_ARCHIVE];
    return inTime
      ? all.sort((a, b) => takenKeyOf(b) - takenKeyOf(a) || b.createdAt.localeCompare(a.createdAt))
      : all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [inTime]);

  /* Read off the whole archive through the same `bandKeyOf` the river groups
     by, so a tick can never name a year the river has no heading for. */
  const bands = useMemo(() => [...new Set(LAB_ARCHIVE.map(bandKeyOf))], []);

  /* Every heading is already in the DOM, so a seek is a scroll and nothing
     else -- no fetch, no re-flow, nothing to land on afterwards. 24px above
     the heading, the same offset the river's own landing uses. */
  const seekTo = useCallback((key: string) => {
    const el = document.querySelector<HTMLElement>(`[data-band="${CSS.escape(key)}"]`);
    if (!el) return;
    const want = Math.round(el.getBoundingClientRect().top + window.scrollY) - 24;
    landAt(Math.max(0, want), tail.current);
  }, []);

  const images: ViewerImage[] = useMemo(() => photos.map((p) => toViewerImage(p, false)), [photos]);

  return (
    <div className="min-h-screen bg-background">
      {/* The app hides the native scroll bar under `has-scrubber`, but only
          below 1280px, because that is the only width where the shipped
          scrubber exists. This room's scrubber exists at every width, so
          above 1280 the browser drew its own bar straight through the face
          being judged. Same rule, unbounded, and it lives and dies with this
          page rather than touching globals.css. */}
      <style>{`html.has-scrubber{scrollbar-width:none}html.has-scrubber::-webkit-scrollbar{width:0;height:0}`}</style>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        {/* Sticky on a laptop: the river is twenty thousand pixels long and
            the caption is what tells you which face you are holding, so
            letting it scroll away leaves most of the room an empty field. */}
        <div className="px-5 pt-6 sm:px-8 lg:sticky lg:top-6 lg:max-w-[560px] lg:self-start">
          <Link
            href="/lab"
            className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <PeaksMark size={18} /> Lab
          </Link>

          <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
            Four ways to say hold this
          </h1>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
            Scroll and reach for the right edge. Swap the face at the bottom left.
          </p>
          {/* The caption under the thing, which is the only prose in the room
              that changes. Fixed height for two lines, so swapping a face
              never moves the river underneath it. */}
          <p className="mt-4 flex min-h-[42px] max-w-[44ch] items-start text-[13px] leading-relaxed text-foreground">
            {FACE_NAMES.find((f) => f.id === face)?.says}
          </p>
        </div>

        {/* THE RIVER IS PHONE-SHAPED AND FLUSH TO THE RIGHT EDGE AT EVERY
            WIDTH, and that is the whole reason this column exists. The
            scrubber is `fixed`, so it anchors to the VIEWPORT's right edge:
            left in the middle of a 1440 page the face ended up a thousand
            pixels from the photographs it indexes, which is not the thing
            being judged. Held here, the gutter between the last photograph
            and the face is the same 20px on a laptop as on a phone.
            Nothing is scaled: these are phone pixels at 1:1. */}
        <div className="w-full shrink-0 px-5 pt-5 pb-28 lg:w-[390px] lg:pt-6">
          <PhotoRiver
            photos={photos}
            order={inTime ? "taken" : "newest"}
            onOpen={setAt}
            onActiveBandChange={inTime ? setActiveBand : undefined}
          />
          <div ref={tail} aria-hidden />
        </div>
      </div>

      <LabScrubber
        bands={bands}
        active={activeBand}
        onSeek={seekTo}
        inTimeOrder={inTime}
        face={face}
        persist={persist}
        tapOpens={tapOpens}
        onDraggingChange={setDragging}
      />

      <Bench
        face={face}
        onFace={setFace}
        dragging={dragging}
        switches={[
          { label: "Stays put", on: persist, set: setPersist },
          { label: "Tap opens", on: tapOpens, set: setTapOpens },
          { label: "Years", on: inTime, set: setInTime },
        ]}
      />

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

/** The bench of tools, bottom left, which is the one corner the scrubber
 *  never reaches into. It steps back to a ghost while a face is being held,
 *  so nothing competes with the spectacle it is there to judge. */
function Bench({
  face,
  onFace,
  dragging,
  switches,
}: {
  face: ScrubFace;
  onFace: (f: ScrubFace) => void;
  dragging: boolean;
  switches: { label: string; on: boolean; set: (v: boolean) => void }[];
}) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 z-40 p-3 transition-opacity duration-300",
        dragging ? "pointer-events-none opacity-15" : "opacity-100"
      )}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="w-[168px] rounded-xl border border-border bg-accent/95 p-2 shadow-sm backdrop-blur-sm">
        {/* A radiogroup, not four loose buttons. `SegmentedPills` is the app's
            control for this and would have been the reuse, but it lays out as
            one row and this is a 2x2 in a 168px corner; the semantics are the
            part worth keeping either way. */}
        <div role="radiogroup" aria-label="Which face" className="grid grid-cols-2 gap-1">
          {FACE_NAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={face === f.id}
              onClick={() => onFace(f.id)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors state-layer",
                face === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-px border-t border-border pt-2">
          {switches.map((s) => (
            <button
              key={s.label}
              type="button"
              role="switch"
              aria-checked={s.on}
              onClick={() => s.set(!s.on)}
              className="state-layer flex w-full items-center justify-between rounded-md px-1 py-[5px] text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {s.label}
              <span
                className={cn(
                  "block h-[14px] w-[24px] rounded-full p-[2px] transition-colors",
                  s.on ? "bg-primary" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "block size-[10px] rounded-full bg-background transition-transform",
                    s.on && "translate-x-[10px]"
                  )}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
