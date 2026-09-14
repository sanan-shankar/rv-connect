"use client";

/* ------------------------------------------------------------------ *
 *  Sound for the room: a stand-in voice, its shape, and one player
 *  hook every drawing shares.
 *
 *  There is no recorded answer in the database to play (phase 12 has
 *  stored nothing), and a real member's voice is not a fixture. So the
 *  stand-ins are synthesised here, in the browser, as a hum shaped like
 *  somebody talking: syllables, pauses, a pitch that wanders. The room
 *  says so. Record something and your own recording replaces them.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import { VOICE_MAX_SECONDS } from "@/lib/voice-answer-rule";

export const CAP = VOICE_MAX_SECONDS;

/** 1:07, never 67s. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Deterministic, so a screenshot of the room is the same screenshot twice. */
function random(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100_000) / 100_000;
  };
}

const RATE = 16_000;

function synthesise(seconds: number, seed: number): Float32Array {
  const n = Math.round(seconds * RATE);
  const pcm = new Float32Array(n);
  const r = random(seed);
  let i = 0;
  while (i < n) {
    // A breath between phrases, or the gap between two syllables.
    i += Math.round((r() < 0.16 ? 0.3 + r() * 0.55 : 0.03 + r() * 0.07) * RATE);
    const length = Math.round((0.1 + r() * 0.2) * RATE);
    const pitch = 105 + r() * 75;
    const loud = 0.35 + r() * 0.65;
    for (let k = 0; k < length && i + k < n; k++) {
      const t = k / length;
      const envelope = Math.pow(Math.sin(Math.PI * t), 1.6) * loud;
      const phase = ((i + k) / RATE) * 2 * Math.PI * pitch * (1 + 0.06 * Math.sin(t * 4));
      pcm[i + k] =
        0.22 *
        envelope *
        (0.6 * Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase) + 0.05 * Math.sin(5 * phase));
    }
    i += length;
  }
  return pcm;
}

function wav(pcm: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const text = (at: number, s: string) => [...s].forEach((c, j) => view.setUint8(at + j, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let j = 0; j < pcm.length; j++) {
    view.setInt16(44 + j * 2, Math.max(-1, Math.min(1, pcm[j])) * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** How loud each of `bars` slices is on average, 0 to 1. Average, not the
 *  loudest sample: one syllable in every slice made the peaks a flat comb. */
export function peaksOf(pcm: Float32Array, bars: number): number[] {
  const size = Math.max(1, Math.floor(pcm.length / bars));
  const out: number[] = [];
  for (let b = 0; b < bars; b++) {
    let sum = 0;
    let n = 0;
    for (let j = b * size; j < Math.min(pcm.length, (b + 1) * size); j += 4) {
      sum += pcm[j] * pcm[j];
      n++;
    }
    out.push(Math.sqrt(sum / Math.max(1, n)));
  }
  const top = Math.max(...out, 1e-6);
  return out.map((p) => Math.max(0.12, p / top));
}

export const BARS = 36;

export type Clip = { url: string; seconds: number; peaks: number[] };

/** A stand-in voice of `seconds`, made once per mount. */
export function useStandIn(seconds: number, seed: number): Clip | null {
  const [clip, setClip] = useState<Clip | null>(null);
  useEffect(() => {
    const pcm = synthesise(seconds, seed);
    const url = URL.createObjectURL(wav(pcm));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The clip is a blob URL, a browser resource made and revoked with this effect; the server has no Blob to render it from.
    setClip({ url, seconds, peaks: peaksOf(pcm, BARS) });
    return () => URL.revokeObjectURL(url);
  }, [seconds, seed]);
  return clip;
}

/** The shape of a real recording, read back out of its own bytes. A WebM from
 *  Chrome and an MP4 from Safari both decode here. */
export async function peaksOfRecording(url: string): Promise<number[]> {
  try {
    const bytes = await (await fetch(url)).arrayBuffer();
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(bytes);
    void ctx.close();
    return peaksOf(decoded.getChannelData(0), BARS);
  } catch {
    return Array.from({ length: BARS }, () => 0.5);
  }
}

/** One recording at a time, the way every player on a phone behaves. */
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
    const length = () => (Number.isFinite(a.duration) && a.duration > 0 ? a.duration : seconds);
    const tick = () => {
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
    const onTime = () => setAt(a.currentTime);
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
      const length = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : seconds;
      a.currentTime = Math.max(0, Math.min(1, fraction)) * length;
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
