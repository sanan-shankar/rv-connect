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

import { useEffect, useState } from "react";

/* The clock and the player hook moved to `@/components/catchups/voice-clip`
   when he picked the recorder and the tape (2026-10-09): the composer and the
   reader play recordings now, and all three surfaces have to agree. Re-exported
   under the room's own names so nothing in here changed. */
export { CAP, clock, usePlayer, type Player } from "@/components/catchups/voice-clip";

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
