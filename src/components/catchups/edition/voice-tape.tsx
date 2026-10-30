"use client";

/* ------------------------------------------------------------------ *
 *  <VoiceTape> — a spoken answer, in the reader.
 *
 *  His pick of the three drawn at `/lab/catchups/voice` (2026-10-09), and
 *  the one that needs nothing stored but `audioSeconds`: a waveform would
 *  want 36 numbers a recording, and the bird is already in the byline two
 *  lines above, so playing from it would draw the same bird twice.
 *
 *  THE LENGTH IS THE POINT. The pill is as wide a share of the column as
 *  the recording is of the two minutes, against a dashed line for the rest,
 *  so who talked for twelve seconds and who talked for two minutes is on
 *  the page before anybody presses anything. `TAPE_MIN` keeps a four-second
 *  answer wide enough to hold its own button and clock.
 *
 *  Transplanted from `_players.tsx`, not re-derived.
 * ------------------------------------------------------------------ */

import { type KeyboardEvent } from "react";
import { m } from "motion/react";
import { Pause, Play } from "@phosphor-icons/react";
import { SPRINGS } from "@/components/common/motion";
import { CAP, clock, usePlayer } from "@/components/catchups/voice-clip";
import { cn } from "@/lib/utils";
import { NO_CAPTURE } from "@/lib/posthog-privacy";
import { whenPostHog } from "@/components/analytics/posthog-client";

/** Wide enough for the 32px button, the clock and the air between them. */
const TAPE_MIN = 104;

export function VoiceTape({
  url,
  seconds,
  name,
  className,
}: {
  url: string;
  seconds: number;
  /** Whose answer it is, for the label a screen reader announces. */
  name: string;
  className?: string;
}) {
  const player = usePlayer(url, seconds);
  const share = Math.min(1, seconds / CAP);

  return (
    <div className={cn("relative flex h-11 items-center", className)}>
      <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
      <m.button
        type="button"
        onClick={() => {
          // A play, without whose answer: NO_CAPTURE takes the autocaptured
          // click, and playing changes no address a pageview could count.
          if (!player.playing) whenPostHog((ph) => ph.capture("recording_played"));
          player.toggle();
        }}
        onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
          if (e.key === "ArrowRight") player.nudge(5);
          else if (e.key === "ArrowLeft") player.nudge(-5);
        }}
        aria-label={player.playing ? `Pause ${name}` : `Play ${name}'s answer, ${clock(seconds)}`}
        whileTap={{ scale: 0.97 }}
        transition={SPRINGS.snappy}
        style={{ width: `max(${(share * 100).toFixed(2)}%, ${TAPE_MIN}px)` }}
        /* NO_CAPTURE: the label names whose answer it is (bug audit 3,
           T7b-22's Catch-ups half). The play is still counted, by the named
           event in onClick above. */
        className={`${NO_CAPTURE} state-layer relative flex h-11 items-center gap-2 overflow-hidden rounded-full bg-secondary pl-1.5 pr-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
      >
        {/* How far through it is, as a fill rather than a bar: one transform,
            no layout, and it reads at a glance on a phone. */}
        <m.span aria-hidden className="absolute inset-0 origin-left bg-canopy/15" style={{ scaleX: player.progress }} />
        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canopy text-white">
          {player.playing ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" className="translate-x-[1px]" />}
        </span>
        <span className="relative ml-auto text-[13.5px] font-medium tabular-nums text-foreground">
          {clock(player.playing || player.at > 0 ? player.at : seconds)}
        </span>
      </m.button>
    </div>
  );
}
