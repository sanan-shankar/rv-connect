"use client";

/* ------------------------------------------------------------------ *
 *  The player, in the reader, drawn three ways.
 *
 *  Each one sits in the reader's own answer tile (card stock, the feed's
 *  radius, a 40px bird, the name at 17px medium, the heart and the
 *  replies control underneath) because the question is not what a
 *  player looks like on its own. It is what it looks like between an
 *  answer somebody typed and an answer with no words at all.
 *
 *  THE ANSWER WITH NO WORDS IS DRAWN FIRST, on every one of the three.
 *  Firefox records but cannot transcribe, so a recording and nothing
 *  else has to read as a whole answer (spec 3.10).
 * ------------------------------------------------------------------ */

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { m, useTransform, type MotionValue } from "motion/react";
import { ChatCircle, Pause, Play } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { BARS, CAP, clock, usePlayer, type Player } from "./_clip";

export type PlayerKey = "bird" | "line" | "tape";

export type VoiceAnswer = {
  id: string;
  name: string;
  words: string | null;
  transcribed: boolean;
  url: string | null;
  seconds: number | null;
  peaks: number[] | null;
  loves: number;
  replies: number;
};

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function seekFrom(e: PointerEvent<HTMLElement>, player: Player) {
  const box = e.currentTarget.getBoundingClientRect();
  player.seek((e.clientX - box.left) / box.width);
}

function keys(e: KeyboardEvent<HTMLElement>, player: Player) {
  if (e.key === "ArrowRight") player.nudge(5);
  else if (e.key === "ArrowLeft") player.nudge(-5);
  else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    player.toggle();
  } else return;
  e.preventDefault();
}

function PlayGlyph({ playing, size }: { playing: boolean; size: number }) {
  return playing ? <Pause size={size} weight="fill" /> : <Play size={size} weight="fill" className="translate-x-[1px]" />;
}

/* ── 1. the bird speaks ─────────────────────────────────────────────── */

function BirdSpeaks({ answer, player }: { answer: VoiceAnswer; player: Player }) {
  const seconds = answer.seconds ?? 0;
  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <m.button
          type="button"
          onClick={player.toggle}
          aria-label={player.playing ? `Pause ${answer.name}` : `Play ${answer.name}'s answer`}
          whileTap={{ scale: 0.93 }}
          transition={SPRINGS.snappy}
          className={cn("group relative shrink-0 rounded-full", RING)}
        >
          {/* It bobs while it talks. Only while playing, never on hover. */}
          <m.span
            className="block"
            animate={player.playing ? { y: [0, -2.5, 0] } : { y: 0 }}
            transition={player.playing ? { duration: 0.42, repeat: Infinity, ease: "easeInOut" } : SPRINGS.snappy}
          >
            <BirdAvatar user={{ id: answer.id, name: answer.name, photoUrl: null }} size={40} />
          </m.span>
          {/* The New post badge's idea, a canopy disc on the member's own
              bird, saying what pressing the bird does. */}
          <span className="absolute -bottom-0.5 -right-1 grid h-5 w-5 place-items-center rounded-full bg-canopy text-white ring-2 ring-card group-hover:bg-canopy/85 group-active:bg-canopy/75">
            <PlayGlyph playing={player.playing} size={10} />
          </span>
        </m.button>
        <span className="descender-room min-w-0 flex-1 truncate text-[17px] font-medium leading-none text-foreground">
          {answer.name}
        </span>
        <span className="shrink-0 text-[13.5px] tabular-nums text-muted-foreground">
          {clock(player.playing || player.at > 0 ? player.at : seconds)}
        </span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${answer.name}'s recording`}
        aria-valuemin={0}
        aria-valuemax={seconds}
        aria-valuenow={Math.round(player.at)}
        onPointerDown={(e) => seekFrom(e, player)}
        onKeyDown={(e) => keys(e, player)}
        className={cn("group relative mt-2 h-5 cursor-pointer rounded-full", RING)}
      >
        <span aria-hidden className="absolute inset-x-0 top-[9px] h-[2px] rounded-full bg-border group-hover:bg-foreground/15" />
        <m.span
          aria-hidden
          className="absolute inset-x-0 top-[9px] h-[2px] origin-left rounded-full bg-cinnamon"
          style={{ scaleX: player.progress }}
        />
      </div>
    </>
  );
}

/* ── 2. a line of voice ─────────────────────────────────────────────── */

function Bar({ i, height, progress }: { i: number; height: number; progress: MotionValue<number> }) {
  const lit = useTransform(progress, (p) => (p * BARS > i ? 1 : 0));
  return (
    <span className="relative block h-full w-[3px] shrink-0">
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-foreground/20"
        style={{ height: `${Math.round(height * 100)}%` }}
      />
      <m.span
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-canopy"
        style={{ height: `${Math.round(height * 100)}%`, opacity: lit }}
      />
    </span>
  );
}

function VoiceLine({ answer, player }: { answer: VoiceAnswer; player: Player }) {
  const peaks = answer.peaks ?? Array.from({ length: BARS }, () => 0.4);
  return (
    <div className="mt-3 flex h-12 min-w-0 items-center gap-3 rounded-full bg-secondary pl-1.5 pr-4">
      <m.button
        type="button"
        onClick={player.toggle}
        aria-label={player.playing ? "Pause" : "Play"}
        whileTap={{ scale: 0.93 }}
        transition={SPRINGS.snappy}
        className={cn("state-layer grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canopy text-white", RING)}
      >
        <PlayGlyph playing={player.playing} size={15} />
      </m.button>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${answer.name}'s recording`}
        aria-valuemin={0}
        aria-valuemax={answer.seconds ?? 0}
        aria-valuenow={Math.round(player.at)}
        onPointerDown={(e) => seekFrom(e, player)}
        onKeyDown={(e) => keys(e, player)}
        className={cn("flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-between overflow-hidden rounded-sm", RING)}
      >
        {peaks.map((height, i) => (
          <Bar key={i} i={i} height={height} progress={player.progress} />
        ))}
      </div>
      <span className="shrink-0 text-[13.5px] font-medium tabular-nums text-foreground">
        {clock(player.playing || player.at > 0 ? player.at : (answer.seconds ?? 0))}
      </span>
    </div>
  );
}

/* ── 3. the tape ────────────────────────────────────────────────────── */

/** The shortest a tape may be and still hold a play button and a time. */
const TAPE_MIN = 104;

function Tape({ answer, player }: { answer: VoiceAnswer; player: Player }) {
  const seconds = answer.seconds ?? 0;
  const share = Math.min(1, seconds / CAP);
  return (
    <div className="relative mt-3 flex h-11 items-center">
      {/* The rest of the two minutes, which they did not use. The tape's
          length against this line is the whole idea: who talked for how
          long is on the page before anyone presses anything. */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
      <m.button
        type="button"
        onClick={player.toggle}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") keys(e, player);
        }}
        aria-label={player.playing ? `Pause ${answer.name}` : `Play ${answer.name}'s answer, ${clock(seconds)}`}
        whileTap={{ scale: 0.97 }}
        transition={SPRINGS.snappy}
        style={{ width: `max(${(share * 100).toFixed(2)}%, ${TAPE_MIN}px)` }}
        className={cn(
          "state-layer relative flex h-11 items-center gap-2 overflow-hidden rounded-full bg-secondary pl-1.5 pr-3.5",
          RING
        )}
      >
        <m.span aria-hidden className="absolute inset-0 origin-left bg-canopy/15" style={{ scaleX: player.progress }} />
        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canopy text-white">
          <PlayGlyph playing={player.playing} size={13} />
        </span>
        <span className="relative ml-auto text-[13.5px] font-medium tabular-nums text-foreground">
          {clock(player.playing || player.at > 0 ? player.at : seconds)}
        </span>
      </m.button>
    </div>
  );
}

/* ── the tile ───────────────────────────────────────────────────────── */

function Hearts({ count }: { count: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <LoveButton
      liked={liked}
      count={count + (liked ? 1 : 0)}
      onToggle={() => setLiked((v) => !v)}
      label="Love this answer"
    />
  );
}

export function AnswerTile({ answer, player: kind, phone }: { answer: VoiceAnswer; player: PlayerKey; phone: boolean }) {
  const player = usePlayer(answer.url, answer.seconds ?? 0);
  const hasVoice = answer.seconds !== null;

  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <div className={phone ? "px-4 pt-4" : "px-5 pt-5"}>
        {hasVoice && kind === "bird" ? (
          <BirdSpeaks answer={answer} player={player} />
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <BirdAvatar user={{ id: answer.id, name: answer.name, photoUrl: null }} size={40} />
            <span className="descender-room min-w-0 truncate text-[17px] font-medium leading-none text-foreground">
              {answer.name}
            </span>
          </div>
        )}
        {hasVoice && kind === "line" && <VoiceLine answer={answer} player={player} />}
        {hasVoice && kind === "tape" && <Tape answer={answer} player={player} />}

        {answer.words && (
          <p className="mt-3 whitespace-pre-line break-words text-[15.5px] leading-[1.6] text-foreground [overflow-wrap:anywhere] md:text-[16px]">
            {answer.words}
          </p>
        )}
        {answer.words && answer.transcribed && (
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">From the recording</p>
        )}
      </div>
      <div className={cn("-ml-2.5 flex items-center gap-1 text-muted-foreground", phone ? "px-4 pb-1.5 pt-1" : "px-5 pb-2 pt-1.5")}>
        <Hearts count={answer.loves} />
        <m.button
          type="button"
          aria-label="Show replies"
          whileTap={{ scale: 0.93 }}
          transition={SPRINGS.snappy}
          className={cn("state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:text-foreground", RING)}
        >
          <ChatCircle size={18} />
          <span>{answer.replies}</span>
        </m.button>
      </div>
    </article>
  );
}
