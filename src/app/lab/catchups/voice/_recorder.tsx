"use client";

/* ------------------------------------------------------------------ *
 *  The recorder, in the answering composer, drawn two ways.
 *
 *  Both drawings are the same machine underneath: `useRecorder` is a
 *  real MediaRecorder, a real level meter off the microphone, and the
 *  browser's own SpeechRecognition where there is one. Nothing uploads:
 *  the upload path is built (`/api/upload/audio`) and switched off until
 *  he picks, so a recording here lives in this tab and nowhere else.
 *
 *  Every state a member can land in is also drawn still, off a fixture,
 *  so the ones a dev machine cannot produce on demand (a blocked
 *  microphone, no microphone, a phone call cutting in, Firefox) are on
 *  screen rather than described.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  m,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowCounterClockwise, ImageSquare, Microphone, Pause, Play, Stop, Trash } from "@phosphor-icons/react";
import { SPRINGS } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { FIELD_FOCUS_WITHIN } from "@/components/ui/field-focus";
import { cn } from "@/lib/utils";
import { CAP, clock, usePlayer } from "./_clip";

/* ── the states ────────────────────────────────────────────────────── */

export type Ended = "stopped" | "cap" | "interrupted";

export type RecState =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "denied" }
  | { kind: "nomic" }
  | { kind: "unsupported" }
  | { kind: "short" }
  | { kind: "recording"; seconds: number; transcript: string; interim: string; hears: boolean }
  | {
      kind: "done";
      url: string | null;
      seconds: number;
      transcript: string;
      transcribed: boolean;
      ended: Ended;
      saving?: "saving" | "failed";
    }
  | { kind: "removed"; transcript: string };

export type Handlers = {
  start: () => void;
  stop: () => void;
  remove: () => void;
  write: (text: string) => void;
};

const TEN_SECONDS_LEFT = CAP - 10;

/* ── the live machine ──────────────────────────────────────────────── */

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function speechRecognition(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The formats, best first. Chrome takes the first, Safari the second, Firefox the third. */
const FORMATS = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

export function useRecorder(): { state: RecState; level: MotionValue<number>; clockFraction: MotionValue<number>; on: Handlers } {
  const [state, setState] = useState<RecState>({ kind: "idle" });
  const level = useMotionValue(0);
  const clockFraction = useMotionValue(0);
  const live = useRef<{
    stream?: MediaStream;
    recorder?: MediaRecorder;
    recognition?: Recognition | null;
    context?: AudioContext;
    frame?: number;
    started: number;
    chunks: Blob[];
    heard: string;
    interim: string;
    ended: Ended;
    recording: boolean;
    edited: boolean;
    url?: string;
  }>({ started: 0, chunks: [], heard: "", interim: "", ended: "stopped", recording: false, edited: false });

  const teardown = useCallback(() => {
    const l = live.current;
    l.recording = false;
    if (l.frame) cancelAnimationFrame(l.frame);
    l.recognition?.stop();
    l.stream?.getTracks().forEach((t) => t.stop());
    void l.context?.close().catch(() => {});
    level.set(0);
  }, [level]);

  const stop = useCallback(
    (ended: Ended = "stopped") => {
      const l = live.current;
      if (!l.recording) return;
      l.ended = ended;
      if (l.recorder && l.recorder.state !== "inactive") l.recorder.stop();
      teardown();
    },
    [teardown]
  );

  const start = useCallback(async () => {
    const l = live.current;
    if (l.recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState({ kind: "unsupported" });
      return;
    }
    setState({ kind: "asking" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      const name = (error as DOMException)?.name;
      setState({ kind: name === "NotFoundError" || name === "OverconstrainedError" ? "nomic" : "denied" });
      return;
    }

    if (l.url) URL.revokeObjectURL(l.url);
    const mimeType = FORMATS.find((t) => MediaRecorder.isTypeSupported(t));
    // 64 kbps: two minutes of a voice in about a megabyte. The server's
    // ceiling is five times this (voice-answer-rule.ts).
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64_000 });
    Object.assign(l, { stream, recorder, chunks: [], heard: "", interim: "", ended: "stopped", recording: true, edited: false });

    recorder.ondataavailable = (e) => {
      if (e.data.size) l.chunks.push(e.data);
    };
    recorder.onstop = () => {
      const elapsed = (performance.now() - l.started) / 1000;
      if (elapsed < 1) {
        setState({ kind: "short" });
        return;
      }
      const url = URL.createObjectURL(new Blob(l.chunks, { type: recorder.mimeType }));
      l.url = url;
      // What was still being heard when you stopped is folded in: the
      // recogniser often has the last few words pending.
      const transcript = `${l.heard} ${l.interim}`.trim();
      setState({
        kind: "done",
        url,
        seconds: Math.min(CAP, Math.max(1, Math.round(elapsed))),
        transcript,
        transcribed: transcript.length > 0,
        ended: l.ended,
      });
    };
    recorder.start(250);
    l.started = performance.now();

    // The level meter: loudness off the microphone, smoothed, 0 to 1.
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new Ctx();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    l.context = context;
    const samples = new Uint8Array(analyser.fftSize);
    let shown = -1;
    const tick = () => {
      if (!l.recording) return;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / samples.length);
      level.set(level.get() * 0.72 + Math.min(1, rms * 5) * 0.28);
      const elapsed = (performance.now() - l.started) / 1000;
      clockFraction.set(Math.min(1, elapsed / CAP));
      if (elapsed >= CAP) {
        stop("cap");
        return;
      }
      const whole = Math.floor(elapsed);
      if (whole !== shown) {
        shown = whole;
        setState((p) => (p.kind === "recording" ? { ...p, seconds: whole } : p));
      }
      l.frame = requestAnimationFrame(tick);
    };
    l.frame = requestAnimationFrame(tick);

    // The words, where the browser can hear them.
    const SR = speechRecognition();
    l.recognition = null;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-IN";
      r.onresult = (e) => {
        let heard = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) heard += result[0].transcript;
          else interim += result[0].transcript;
        }
        l.heard = heard.trim();
        l.interim = interim.trim();
        setState((p) => {
          if (p.kind === "recording") return { ...p, transcript: l.heard, interim: l.interim };
          // A last result arriving after Done, before anyone has typed.
          if (p.kind === "done" && !l.edited && l.heard.length >= p.transcript.length) {
            return { ...p, transcript: l.heard, transcribed: l.heard.length > 0 };
          }
          return p;
        });
      };
      r.onerror = () => {};
      // Chrome ends a recognition after a silence. While we are still
      // recording, start it again.
      r.onend = () => {
        if (l.recording) {
          try {
            r.start();
          } catch {
            /* already starting */
          }
        }
      };
      try {
        r.start();
        l.recognition = r;
      } catch {
        l.recognition = null;
      }
    }

    // A phone call takes the microphone; a tab switch hides the page. Either
    // way, what was said so far is kept.
    stream.getAudioTracks()[0]?.addEventListener("ended", () => stop("interrupted"));

    setState({ kind: "recording", seconds: 0, transcript: "", interim: "", hears: Boolean(l.recognition) });
  }, [clockFraction, level, stop]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") stop("interrupted");
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      teardown();
    };
  }, [stop, teardown]);

  const remove = useCallback(() => {
    setState((p) => {
      if (p.kind !== "done") return p;
      if (p.url) URL.revokeObjectURL(p.url);
      live.current.url = undefined;
      return { kind: "removed", transcript: p.transcript };
    });
  }, []);

  const write = useCallback((text: string) => {
    live.current.edited = true;
    setState((p) => (p.kind === "done" || p.kind === "removed" ? { ...p, transcript: text } : p));
  }, []);

  return { state, level, clockFraction, on: { start: () => void start(), stop: () => stop("stopped"), remove, write } };
}

/* ── the still states ──────────────────────────────────────────────── */

const SAID =
  "We drove up for my niece's graduation and stopped at the valley on the way back. The banyan is still there. So is the bell.";

export const STILLS = {
  firefox: { label: "Firefox, talking", state: { kind: "recording", seconds: 23, transcript: "", interim: "", hears: false } },
  denied: { label: "Microphone blocked", state: { kind: "denied" } },
  nomic: { label: "No microphone", state: { kind: "nomic" } },
  recording: {
    label: "Talking",
    state: { kind: "recording", seconds: 34, transcript: SAID.slice(0, 80), interim: "The banyan is", hears: true },
  },
  ending: {
    label: "Ten seconds left",
    state: { kind: "recording", seconds: 112, transcript: SAID, interim: "and that was the", hears: true },
  },
  cap: {
    label: "Stopped at two minutes",
    state: { kind: "done", url: null, seconds: 120, transcript: SAID, transcribed: true, ended: "cap" },
  },
  interrupted: {
    label: "A call cut in",
    state: { kind: "done", url: null, seconds: 41, transcript: SAID.slice(0, 80), transcribed: true, ended: "interrupted" },
  },
  short: { label: "Too short", state: { kind: "short" } },
  done: {
    label: "Recorded",
    state: { kind: "done", url: null, seconds: 48, transcript: SAID, transcribed: true, ended: "stopped" },
  },
  doneFirefox: {
    label: "Recorded in Firefox",
    state: { kind: "done", url: null, seconds: 72, transcript: "", transcribed: false, ended: "stopped" },
  },
  saving: {
    label: "Saving",
    state: { kind: "done", url: null, seconds: 48, transcript: SAID, transcribed: true, ended: "stopped", saving: "saving" },
  },
  failed: {
    label: "Didn't save",
    state: { kind: "done", url: null, seconds: 48, transcript: SAID, transcribed: true, ended: "stopped", saving: "failed" },
  },
  removed: { label: "Recording removed", state: { kind: "removed", transcript: SAID } },
} satisfies Record<string, { label: string; state: RecState }>;

export type StillKey = keyof typeof STILLS;

/** A still recording state still needs a meter that moves, or it reads as
 *  frozen rather than listening. A slow made-up voice, off the frame clock. */
export function useStillLevel(active: boolean): MotionValue<number> {
  const level = useMotionValue(0);
  useAnimationFrame((t) => {
    if (!active) return;
    const s = t / 1000;
    level.set(Math.max(0, 0.35 + 0.3 * Math.sin(s * 5.1) * Math.sin(s * 1.7) + 0.15 * Math.sin(s * 11)));
  });
  return level;
}

/* ── what the box says under itself ─────────────────────────────────── */

function statusFor(state: RecState): { text: string; tone: "muted" | "cinnamon" | "danger" } | null {
  switch (state.kind) {
    case "asking":
      return { text: "Allow the microphone to start.", tone: "muted" };
    case "denied":
      return { text: "The microphone is blocked for this site. Allow it in the browser's settings, or type.", tone: "muted" };
    case "nomic":
      return { text: "No microphone found. You can type instead.", tone: "muted" };
    case "unsupported":
      return { text: "This browser can't record. You can type instead.", tone: "muted" };
    case "short":
      return { text: "That was too short to keep.", tone: "muted" };
    case "removed":
      return { text: "Recording removed. Your words are still here.", tone: "muted" };
    case "recording":
      if (state.seconds >= TEN_SECONDS_LEFT) return { text: `${CAP - state.seconds} seconds left`, tone: "cinnamon" };
      return null;
    case "done":
      if (state.saving === "saving") return { text: "Saving the recording.", tone: "muted" };
      if (state.saving === "failed") return { text: "The recording didn't save.", tone: "danger" };
      if (state.ended === "cap") return { text: "Two minutes is the most, so it stopped there.", tone: "muted" };
      if (state.ended === "interrupted") {
        return { text: `It stopped when you left the page. The first ${clock(state.seconds)} is kept.`, tone: "muted" };
      }
      if (!state.transcribed) {
        return { text: "This browser can't write down speech, so the recording is the answer.", tone: "muted" };
      }
      return { text: "Written down as you spoke. Fix anything it got wrong.", tone: "muted" };
    default:
      return null;
  }
}

function Status({ state, className }: { state: RecState; className?: string }) {
  const s = statusFor(state);
  if (!s) return <span className={className} />;
  return (
    <span
      className={cn(
        "text-[13px] leading-snug",
        s.tone === "cinnamon" && "font-medium text-cinnamon",
        s.tone === "muted" && "text-muted-foreground",
        s.tone === "danger" && "font-medium text-destructive",
        className
      )}
    >
      {s.text}
    </span>
  );
}

/* ── pieces both drawings share ────────────────────────────────────── */

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function RoundButton({
  label,
  onClick,
  children,
  tone = "quiet",
  size = 36,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "quiet" | "canopy";
  size?: number;
  disabled?: boolean;
}) {
  return (
    <m.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      style={{ width: size, height: size }}
      className={cn(
        "state-layer grid shrink-0 place-items-center rounded-full disabled:opacity-50",
        tone === "quiet" ? "text-muted-foreground hover:text-foreground" : "bg-canopy text-white",
        RING
      )}
    >
      {children}
    </m.button>
  );
}

/** The recording, once there is one: play it, see how long it is. Above the
 *  box in both drawings, because it belongs to the answer rather than to the
 *  typing. */
function RecordingChip({ state, fallbackUrl }: { state: Extract<RecState, { kind: "done" }>; fallbackUrl: string | null }) {
  const url = state.url ?? fallbackUrl;
  const player = usePlayer(state.saving ? null : url, state.seconds);
  const fill = player.progress;
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-3 rounded-full border border-border bg-card pl-1.5 pr-4",
        state.saving === "saving" && "opacity-70"
      )}
    >
      <RoundButton
        label={player.playing ? "Pause your recording" : "Play your recording"}
        onClick={player.toggle}
        tone="canopy"
        disabled={Boolean(state.saving === "saving")}
      >
        {player.playing ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" className="translate-x-px" />}
      </RoundButton>
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-border">
        <m.span aria-hidden className="absolute inset-0 origin-left rounded-full bg-cinnamon" style={{ scaleX: fill }} />
      </div>
      <span className="shrink-0 text-[13.5px] font-medium tabular-nums text-foreground">
        {clock(player.playing || player.at > 0 ? player.at : state.seconds)}
      </span>
    </div>
  );
}

function Words({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Your answer"
      className="block min-h-[168px] w-full resize-none bg-transparent px-4 py-3.5 font-heading text-[17px] leading-[1.7] text-foreground outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-muted-foreground"
    />
  );
}

/** What is being heard, as it is heard. The part the recogniser has not
 *  settled on yet is lighter, and it firms up in place. */
function Heard({ state }: { state: Extract<RecState, { kind: "recording" }> }) {
  if (!state.hears) {
    return (
      <p className="px-4 py-3.5 text-[15px] leading-[1.6] text-muted-foreground">
        This browser can&apos;t write down what you say. Keep talking: the recording is the answer.
      </p>
    );
  }
  if (!state.transcript && !state.interim) {
    return <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Listening</p>;
  }
  return (
    <p className="px-4 py-3.5 font-heading text-[17px] leading-[1.7] text-foreground [overflow-wrap:anywhere]">
      {state.transcript} <span className="text-muted-foreground">{state.interim}</span>
    </p>
  );
}

function LiveDot() {
  return (
    <m.span
      aria-hidden
      className="block h-2 w-2 rounded-full bg-cinnamon"
      animate={{ opacity: [1, 0.25, 1] }}
      transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ── drawing A: a microphone in the box ─────────────────────────────── */

export function InTheBox({
  state,
  on,
  clockFraction,
  fallbackUrl,
}: {
  state: RecState;
  on: Handlers;
  clockFraction: MotionValue<number>;
  fallbackUrl: string | null;
}) {
  const recording = state.kind === "recording";
  const words = state.kind === "done" || state.kind === "removed" ? state.transcript : "";

  return (
    <div className="space-y-[var(--space-s)]">
      <AnimatePresence initial={false}>
        {state.kind === "done" && (
          <m.div
            key="chip"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRINGS.snappy}
          >
            <RecordingChip state={state} fallbackUrl={fallbackUrl} />
          </m.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-input)] border bg-card",
          recording ? "border-cinnamon/45" : `border-border hover:border-leaf/40 ${FIELD_FOCUS_WITHIN}`
        )}
      >
        {/* The two minutes running out. It is the reader's own reading line
            along the strip's top edge, doing a second job. */}
        {recording && (
          <m.span aria-hidden className="absolute inset-x-0 top-0 h-[2px] origin-left bg-cinnamon" style={{ scaleX: clockFraction }} />
        )}

        {recording ? (
          <div className="min-h-[168px]">
            <Heard state={state} />
          </div>
        ) : (
          <Words
            value={words}
            onChange={on.write}
            placeholder={
              state.kind === "done" && !state.transcribed
                ? "Add words if you like. The recording is an answer on its own."
                : "Type, or press the microphone and say it."
            }
          />
        )}

        <div className="flex min-h-12 items-center gap-2 px-3 pb-2.5">
          {recording ? (
            <span className="flex items-center gap-2 pl-1">
              <LiveDot />
              <span className="text-[13.5px] font-medium tabular-nums text-foreground">{clock(state.seconds)}</span>
            </span>
          ) : null}
          <Status state={state} className="min-w-0 flex-1 pl-1" />

          {recording ? (
            <Button type="button" variant="primary" size="sm" onClick={on.stop}>
              <Stop weight="fill" />
              Done
            </Button>
          ) : state.kind === "done" ? (
            <>
              {state.saving === "failed" && (
                <Button type="button" variant="ghost" size="sm">
                  Try again
                </Button>
              )}
              <RoundButton label="Record again" onClick={on.start}>
                <ArrowCounterClockwise size={18} />
              </RoundButton>
              <RoundButton label="Remove the recording" onClick={on.remove}>
                <Trash size={18} />
              </RoundButton>
            </>
          ) : (
            <RoundButton label="Answer out loud" onClick={on.start} size={40}>
              <Microphone size={20} weight={state.kind === "asking" ? "fill" : "regular"} />
            </RoundButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── drawing B: say it instead ──────────────────────────────────────── */

export function SayItInstead({
  state,
  on,
  level,
  fallbackUrl,
}: {
  state: RecState;
  on: Handlers;
  level: MotionValue<number>;
  fallbackUrl: string | null;
}) {
  const listening = state.kind === "recording" || state.kind === "asking";
  const halo = useTransform(level, [0, 1], [1, 1.85]);
  const haloOpacity = useTransform(level, [0, 1], [0.35, 0.9]);
  const words = state.kind === "done" || state.kind === "removed" ? state.transcript : "";

  return (
    <div className="space-y-[var(--space-s)]">
      {state.kind === "done" && <RecordingChip state={state} fallbackUrl={fallbackUrl} />}

      {listening ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius-input)] border border-border bg-card px-4 py-6">
          <div className="relative grid h-[76px] w-[76px] place-items-center">
            {/* Swells with your voice. The one thing on this page that moves
                because of you rather than because of a clock. */}
            <m.span aria-hidden className="absolute inset-0 rounded-full bg-cinnamon/25" style={{ scale: halo, opacity: haloOpacity }} />
            <m.button
              type="button"
              onClick={on.stop}
              aria-label="Done"
              disabled={state.kind === "asking"}
              whileTap={{ scale: 0.93 }}
              transition={SPRINGS.snappy}
              className={cn("state-layer relative grid h-[76px] w-[76px] place-items-center rounded-full bg-canopy text-white disabled:opacity-60", RING)}
            >
              {state.kind === "asking" ? <Microphone size={28} weight="fill" /> : <Stop size={24} weight="fill" />}
            </m.button>
          </div>
          {state.kind === "recording" ? (
            <>
              <p className="mt-4 text-[20px] font-medium tabular-nums leading-none text-foreground">{clock(state.seconds)}</p>
              <p
                className={cn(
                  "mt-2 text-[13px]",
                  state.seconds >= TEN_SECONDS_LEFT ? "font-medium text-cinnamon" : "text-muted-foreground"
                )}
              >
                {state.seconds >= TEN_SECONDS_LEFT ? `${CAP - state.seconds} seconds left` : `${clock(CAP - state.seconds)} left`}
              </p>
              <p className="mt-4 line-clamp-2 max-w-[34ch] text-center text-[15px] leading-[1.55] text-muted-foreground [overflow-wrap:anywhere]">
                {state.hears
                  ? `${state.transcript} ${state.interim}`.trim().split(" ").slice(-14).join(" ") || "Listening"
                  : "This browser can't write down what you say. The recording is the answer."}
              </p>
            </>
          ) : (
            <p className="mt-4 text-[13px] text-muted-foreground">Allow the microphone to start.</p>
          )}
        </div>
      ) : (
        <div className={`overflow-hidden rounded-[var(--radius-input)] border border-border hover:border-leaf/40 ${FIELD_FOCUS_WITHIN}`}>
          <Words
            value={words}
            onChange={on.write}
            placeholder={
              state.kind === "done" && !state.transcribed
                ? "Add words if you like. The recording is an answer on its own."
                : undefined
            }
          />
        </div>
      )}

      {!listening && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm">
            <ImageSquare />
            Add a photo
          </Button>
          {state.kind === "done" ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={on.start}>
                <ArrowCounterClockwise />
                Record again
              </Button>
              <RoundButton label="Remove the recording" onClick={on.remove}>
                <Trash size={18} />
              </RoundButton>
            </>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={on.start}>
              <Microphone />
              Answer out loud
            </Button>
          )}
          <Status state={state} className="basis-full pt-1" />
        </div>
      )}
    </div>
  );
}
