"use client";

/* ------------------------------------------------------------------ *
 *  Photographs added to the Collection.
 *
 *  A genuine moment of gladness, and one of the few the app has: somebody
 *  has just given the valley something it did not have. So the moment is
 *  ABOUT what they gave. The photographs themselves drop onto a little
 *  pile beside the bird, one after another, and it watches each one land.
 *  When the last is down it celebrates, hops over to the pile and pecks at
 *  it (the top print jolts), settles proud, and then carries on living
 *  for as long as the screen is up: glancing at the pile, at the buttons,
 *  preening. Press "See them in the Collection" and it flies off ahead of
 *  you as the pop-up closes.
 *
 *  It used to be the celebration alone -- about three seconds -- and then a
 *  statue under the thank-you (owner, 2026-09-17: "after uploading photos it
 *  just sits there. isn't that a great opportunity to do something fun!").
 *
 *  ONE appearance, never on the way in: it plays at the end of the
 *  contribute room and nowhere else. The pile still drops when another bird
 *  holds the screen and this one stands down, because the photographs are
 *  the point either way.
 * ------------------------------------------------------------------ */

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { m, useAnimate } from "motion/react";
import { SPRINGS, EASE_SPRING } from "@/components/common/motion";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { useHoopoeLife } from "@/components/mascot/use-hoopoe-life";
import { useMomentAutoplay } from "./moment-hoopoe";
import { useSoloHoopoe } from "./one-hoopoe-guard";
import { cn } from "@/lib/utils";

export type PilePhoto = { src: string; width: number; height: number };

export type ContributedHoopoeHandle = {
  /** Look at this (a button being hovered), or back ahead with null. */
  look(el: HTMLElement | null): void;
  /** Leave: hide this bird and hand its spot to the caller's flyer. */
  flyAway(): void;
};

/* The most prints the pile draws. Sixty photographs as sixty prints is a
   deck of cards, not a pile, and takes fourteen seconds to fall; five reads
   as "a stack of them" whatever the real count, which the line under the
   heading says anyway. The room hands over no more than this. */
export const PILE_MAX = 5;

// The gap between one print landing and the next starting to fall. Short
// enough that five are down in about a second, long enough that each one is
// seen to land and the bird's eyes can go up and back down for it.
const DROP_GAP_MS = 240;
// The long edge of a print. About half the bird's height, so it is plainly a
// photograph and plainly smaller than the bird standing next to it.
const PRINT_LONG_PX = 60;
// Where each print comes to rest, so the pile looks dropped rather than
// stacked by a machine: a small turn and a small slide per print, fixed per
// position so the pile is the same shape on every render (no Math.random in
// render, no hydration drift).
const REST = [
  { rotate: -7, x: -3 },
  { rotate: 5, x: 4 },
  { rotate: -2, x: -1 },
  { rotate: 9, x: 3 },
  { rotate: -5, x: 0 },
];
// How far above its resting place a print starts falling from.
const DROP_FROM_PX = 64;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ContributedHoopoe({
  /* Bigger than the other moments', and deliberately: those are ambient
     companions inside an empty state, where the bird is secondary to the
     copy. This one IS the moment, and the owner asked for it (2026-08-29):
     "make the hoopoe on that page a bit bigger and have a big celebration
     reaction." */
  size = 104,
  photos,
  lookAt,
  onFlyAway,
  className = "",
  ref,
}: {
  size?: number;
  /** Up to PILE_MAX of the photographs just added, as local previews. */
  photos: PilePhoto[];
  /** Whatever else on the screen is worth a glance while it rests. */
  lookAt?: () => Array<HTMLElement | null | undefined>;
  /** Mount a flyer from this rect. Without one, flyAway() does nothing and
   *  the bird simply closes with the pop-up. */
  onFlyAway?: (from: DOMRect, size: number) => void;
  className?: string;
  ref?: Ref<ContributedHoopoeHandle>;
}) {
  const { ref: birdApi, ...h } = useHoopoe();
  const solo = useSoloHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const birdRef = useRef<HTMLDivElement>(null);
  const printRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [landed, setLanded] = useState(0);
  const [played, setPlayed] = useState(false);
  const [gone, setGone] = useState(false);
  const [, animate] = useAnimate();

  const pile = photos.slice(0, PILE_MAX);

  useImperativeHandle(ref, () => ({
    look: (el) => h.gaze(el ?? 0),
    flyAway: () => {
      const bird = birdRef.current;
      if (!onFlyAway || !bird || gone) return;
      onFlyAway(bird.getBoundingClientRect(), size);
      setGone(true);
    },
  }));

  /** The top print jolts as the bill reaches it. */
  function jolt() {
    const top = printRefs.current[pile.length - 1];
    if (top) animate(top, { rotate: [0, -8, 3, 0], y: [0, 2, 0, 0] }, { duration: 0.42, ease: EASE_SPRING });
  }

  useMomentAutoplay(stageRef, async () => {
    h.cancel();
    const pileEl = pileRef.current;

    // The prints fall; the bird watches each one come down.
    h.gaze(pileEl);
    await h.express("curious");
    for (let i = 0; i < pile.length; i++) {
      const r = pileEl?.getBoundingClientRect();
      if (r) h.gaze({ x: r.left + r.width / 2, y: r.top - DROP_FROM_PX });
      setLanded(i + 1);
      await sleep(DROP_GAP_MS / 2);
      h.gaze(pileEl);
      await sleep(DROP_GAP_MS / 2);
    }
    await sleep(260);

    /* Level 3, "everything at once": a 38px hop over 1.3s against level 2's
       24px over 0.85s. This is the one screen in the app that exists purely
       to be glad, so it gets the whole thing. */
    await h.celebrate(3);
    if (pile.length > 0) {
      // Over to the pile, a look, and a peck at the top print.
      await h.hop(1, "left");
      h.gaze(pileEl);
      const peck = h.peck();
      setTimeout(jolt, 140);
      await peck;
    }
    await h.express("proud", { hold: 900 });
    h.gaze(0);
    await h.express("content");
    setPlayed(true);
  });

  useHoopoeLife(h, solo && played && !gone, () => [pileRef.current, ...(lookAt?.() ?? [])]);

  return (
    <div ref={stageRef} aria-hidden className={cn("relative mx-auto", className)} style={{ width: size }}>
      {/* The pile sits at the bird's left foot, tucked into the empty side of
          its box (the drawn body only spans the middle ~40% of the rig's
          width), so the bird stays centred over the heading it sits above. */}
      <div
        ref={pileRef}
        className={cn(
          "bottom-1 h-[76px] w-[76px]",
          solo ? "absolute right-[calc(100%-26px)]" : "relative mx-auto"
        )}
      >
        {pile.slice(0, landed).map((p, i) => {
          const rest = REST[i];
          const ratio = Math.min(1.5, Math.max(0.67, p.width / Math.max(1, p.height)));
          const w = ratio >= 1 ? PRINT_LONG_PX : Math.round(PRINT_LONG_PX * ratio);
          const hgt = ratio >= 1 ? Math.round(PRINT_LONG_PX / ratio) : PRINT_LONG_PX;
          return (
            <m.div
              key={i}
              className="absolute bottom-0 left-1/2"
              style={{ marginLeft: -w / 2 - 3 }}
              initial={{ opacity: 0, y: -DROP_FROM_PX, rotate: rest.rotate + 16, x: rest.x }}
              animate={{ opacity: 1, y: 0, rotate: rest.rotate, x: rest.x }}
              transition={{ ...SPRINGS.snappy, opacity: { duration: 0.14 } }}
            >
              {/* A print, so a light border: the float surface the pop-up is
                  made of, one rung above anything nested in it, and a shadow
                  so it reads as lying ON the glass. */}
              <div
                ref={(el) => {
                  printRefs.current[i] = el;
                }}
                className="rounded-[var(--radius-sm)] bg-float p-[3px] shadow-[0_1px_2px_rgba(30,28,22,0.14),0_6px_14px_-6px_rgba(30,28,22,0.4)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL for a file that has not been served from anywhere yet; next/image cannot load it. */}
                <img
                  src={p.src}
                  alt=""
                  width={w}
                  height={hgt}
                  draggable={false}
                  className="block rounded-[calc(var(--radius-sm)-3px)] object-cover"
                  style={{ width: w, height: hgt }}
                />
              </div>
            </m.div>
          );
        })}
      </div>
      {solo && (
        <div ref={birdRef} className="relative" style={{ opacity: gone ? 0 : 1 }}>
          <Hoopoe ref={birdApi} size={size} />
        </div>
      )}
    </div>
  );
}
