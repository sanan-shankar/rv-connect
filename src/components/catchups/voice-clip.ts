"use client";

/* ------------------------------------------------------------------ *
 *  A recording's clock, and the one player hook everything shares.
 *
 *  Lifted out of `/lab/catchups/voice/_clip.ts` when the owner picked the
 *  recorder and the player on 2026-10-09, because three surfaces now play a
 *  recording and they must agree about every one of them: the composer's own
 *  chip ("here is what you just said"), the Edition reader's tape, and the lab
 *  room, which keeps its synthesised stand-ins and imports these.
 *
 *  Nothing about a stand-in voice came with it. That machinery is the room's
 *  and stays there.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import { VOICE_MAX_SECONDS, VOICE_PLAYBACK_LIMIT, playbackLength } from "@/lib/voice-answer-rule";

/** Two minutes, his (answer 32, 2026-09-14). One constant, so the recorder's
 *  countdown and the tape's length-against-the-dashes mean the same thing. */
export const CAP = VOICE_MAX_SECONDS;

/** 1:07, never 67s. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One recording at a time, the way every player on a phone behaves. Module
 *  scope on purpose: an Edition holds eleven questions and the answers under
 *  them mount a player each, and two playing at once is noise. */
let playingNow: HTMLAudioElement | null = null;

export type Player = {
  playing: boolean;
  /** Seconds in, updated a few times a second: for the label only. */
  at: number;
  /** 0 to 1, every frame: for transforms only. */
  progress: MotionValue<number>;
  toggle: () => void;
  seek: (fraction: number) => void;
  nudge: (seconds: number) => void;
};

/**
 * Plays `url`. The length comes from `seconds` first, because a WebM out of
 * Chrome's MediaRecorder reports its duration as Infinity until it has been
 * played through: which is the reason `audioSeconds` is a column at all.
 *
 * `url` may be a blob URL (the composer, playing back what was just recorded
 * before it has finished uploading) or a stored one. Nothing here cares which.
 */
export function usePlayer(url: string | null, seconds: number): Player {
  const audio = useRef<HTMLAudioElement | null>(null);
  const progress = useMotionValue(0);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    a.preload = "metadata";
    audio.current = a;
    let frame = 0;
    const length = () => playbackLength(a.duration, seconds);
    /* The two minutes, held where a recording is heard (bug audit 3, T2b-04):
       a file that runs on past the cap stops at it, on every surface. Checked
       every frame and on every timeupdate, because a hidden tab runs no
       frames and goes on playing. */
    const pastTheCap = () => {
      if (a.currentTime < VOICE_PLAYBACK_LIMIT) return false;
      a.pause();
      onEnded();
      return true;
    };
    const tick = () => {
      if (pastTheCap()) return;
      progress.set(Math.min(1, a.currentTime / length()));
      frame = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      if (playingNow && playingNow !== a) playingNow.pause();
      playingNow = a;
      setPlaying(true);
      frame = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame);
    };
    const onTime = () => {
      if (!pastTheCap()) setAt(a.currentTime);
    };
    const onEnded = () => {
      a.currentTime = 0;
      progress.set(0);
      setAt(0);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    return () => {
      a.pause();
      cancelAnimationFrame(frame);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      if (playingNow === a) playingNow = null;
      audio.current = null;
      progress.set(0);
      setAt(0);
      setPlaying(false);
    };
  }, [url, seconds, progress]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }, []);

  const seek = useCallback(
    (fraction: number) => {
      const a = audio.current;
      if (!a) return;
      a.currentTime = Math.max(0, Math.min(1, fraction)) * playbackLength(a.duration, seconds);
      progress.set(Math.max(0, Math.min(1, fraction)));
      setAt(a.currentTime);
    },
    [seconds, progress]
  );

  const nudge = useCallback(
    (by: number) => {
      const a = audio.current;
      if (!a) return;
      seek((a.currentTime + by) / seconds);
    },
    [seek, seconds]
  );

  return { playing, at, progress, toggle, seek, nudge };
}
