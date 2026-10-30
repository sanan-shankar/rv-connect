"use client";

/* ------------------------------------------------------------------ *
 *  A microphone in the box — the recorder he picked, 2026-10-09.
 *
 *    "The mic in the box and um, is fine all of that is fine"
 *
 *  Transplanted from `/lab/catchups/voice/_recorder.tsx`, drawing A. The
 *  machine underneath is the room's `useRecorder` with four changes, each one
 *  something a lab room does not have to do:
 *
 *  1. THE TRANSCRIPT IS STITCHED, not concatenated. The room did
 *     `heard += result[0].transcript`, which is both of his transcription
 *     complaints in one line -- no space between phrases, and a capital in
 *     the middle of every sentence. `@/lib/voice-transcript` is the rule and
 *     `voice-transcript.test.mjs` pins it.
 *  2. IT UPLOADS. The room's recording lived in the tab; this one goes
 *     through `/api/upload/audio` and `/finalize` and comes back as a url an
 *     answer may carry.
 *  3. THE WORDS ARE NOT ITS OWN. The room owned a plain `<textarea>`; the
 *     composer's writing surface is `RichTextArea`, with the member's own
 *     emphasis in it. So this component renders the box AROUND whatever
 *     writing surface it is handed, and a finished transcript is handed BACK
 *     to the card to add to the body. Nothing anybody typed is replaced.
 *  4. IT SAYS WHEN A RECORDING CAME OUT SILENT. See `QUIET_RMS`.
 *
 *  Motion, which is half his note -- "make sure none of it is sudden it's all
 *  smoothly neatly animated... it shouldn't like snap it should just be
 *  intentional". Everything that arrives or leaves is on an AnimatePresence
 *  with transform and opacity only, on the app's own springs: the chip, the
 *  swap between the writing surface and the live words, every control in the
 *  bar, the status line and the clock. The box's HEIGHT never moves, which is
 *  the one thing a spring cannot fix -- see `HEARD_HEIGHT`.
 *
 *  Motion is not gated on `prefers-reduced-motion` and must not be
 *  (DESIGN-SYSTEM section 7: "reduce motion shouldn't be considered
 *  anywhere").
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, type MotionValue, useMotionValue } from "motion/react";
import { ArrowCounterClockwise, Microphone, Pause, Play, Stop, Trash } from "@phosphor-icons/react";
import { SPRINGS, EASE_OUT_SMOOTH } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { CAP, clock, usePlayer } from "@/components/catchups/voice-clip";
import { continueFrom, joinHeard } from "@/lib/voice-transcript";
import { uploadRecording, type StoredRecording } from "@/lib/voice-upload-client";
import { cn } from "@/lib/utils";
import { FIELD_FOCUS_WITHIN } from "@/components/ui/field-focus";
import { startTakes, takeStep, type TakeEffect, type TakeEvent, type TakeState } from "./voice-takes";

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
      /** A blob URL for the bytes in this tab, so playback works the instant
       *  it stops rather than after a round trip to Mumbai. */
      url: string | null;
      seconds: number;
      transcribed: boolean;
      ended: Ended;
      /** The loudest moment of the whole recording never cleared `QUIET_RMS`. */
      quiet: boolean;
      saving?: "saving" | "failed";
    }
  | { kind: "removed" };

export type VoiceHandlers = {
  start: () => void;
  stop: () => void;
  remove: () => void;
  /** Retry the upload of the recording still held in this tab. */
  retry: () => void;
};

export type VoiceRecorder = {
  state: RecState;
  clockFraction: MotionValue<number>;
  on: VoiceHandlers;
  /** Resolves once no upload is in flight, so the advance pill can wait for a
   *  recording instead of leaving the page with it half sent. */
  settle: () => Promise<void>;
};

const TEN_SECONDS_LEFT = CAP - 10;

/**
 * The loudest 512-sample window a recording must clear to count as audible.
 *
 * This is the owner's other 2026-10-09 complaint -- "every time when I played
 * the recording it was just quiet" -- answered where it can be answered, which
 * is while he is still talking. A microphone muted in the OS, a headset whose
 * boom is pointing the wrong way, or the wrong input device selected all
 * produce a recording that uploads perfectly and holds nothing, and the only
 * honest thing to do is say so before he walks away from it.
 *
 * The number is measured rather than chosen by taste. The level meter below
 * reads RMS over a 512-sample window; the room's own synthesised "somebody
 * talking" clip -- which a session tuned to sound like speech -- peaks at
 * 0.104 on exactly that window (-19.7 dBFS), and a full-scale sine reads
 * 0.707. 0.01 is -40 dBFS: twenty decibels below that voice and roughly at the
 * noise floor of a laptop microphone in a quiet room, so nothing with a person
 * in it lands under it.
 *
 * DELIBERATELY AT THE BOTTOM OF THE RANGE. A quiet talker read as silence
 * would be this feature crying wolf at the one person it was built for, and
 * the cost of a miss is only that a bad recording goes unflagged -- which is
 * today's behaviour. It never blocks the save either: what somebody said is
 * never thrown away by a threshold.
 */
const QUIET_RMS = 0.01;

/* ── the live machine ──────────────────────────────────────────────── */

/** One event through the take rules (voice-takes.ts), and what to do about it. */
function advance(takes: { current: TakeState }, e: TakeEvent): TakeEffect[] {
  const next = takeStep(takes.current, e);
  takes.current = next.state;
  return next.effects;
}

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
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The formats, best first. Chrome takes the first, Safari the second, Firefox the third. */
const FORMATS = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

/**
 * What a completed recording hands back to the composer.
 *
 * Two calls, not one, because they have different owners: the transcript
 * belongs to the body (the card adds it to whatever is in the writing
 * surface), and the stored url belongs to the entry's audio columns (the
 * experience autosaves it). They also happen at different times -- the words
 * the instant it stops, the url a round trip later.
 */
export function useVoiceRecorder({
  initial,
  onTranscript,
  onStored,
}: {
  /** A recording already on this answer, from an earlier visit. */
  initial?: StoredRecording | null;
  /** The words, the moment the recording stops. `""` for a browser that heard
   *  nothing (Firefox), which is a complete answer and not a failure. */
  onTranscript: (transcript: string) => void;
  /** The stored recording, once it is really in the bucket, or null when the
   *  member takes it off. */
  onStored: (stored: StoredRecording | null) => void;
}): VoiceRecorder {
  /* A recording the member made on an earlier visit starts the box where
     they left it: a chip with a player, not an empty microphone that hides
     the thing they already said. `url` is the stored one rather than a blob,
     so it plays from the bucket. */
  const [state, setState] = useState<RecState>(
    initial
      ? { kind: "done", url: initial.url, seconds: initial.seconds, transcribed: initial.transcribed, ended: "stopped", quiet: false }
      : { kind: "idle" }
  );
  const clockFraction = useMotionValue(0);

  /* The callbacks, through a ref. They close over the card's `body` and are
     re-made every keystroke, and `start` must not be: a new `start` identity
     mid-recording would re-run the effect that tears the microphone down. */
  const hooks = useRef({ onTranscript, onStored });
  /* Written in an effect, never in render: React forbids touching a ref while
     rendering, and the value is only ever read later, from a callback. */
  useEffect(() => {
    hooks.current = { onTranscript, onStored };
  });

  /* `state` as of now, for `retry`: it used to call `send` inside a state
     updater, which React runs twice under Strict Mode, so Try again uploaded
     twice on localhost (bug audit 3, L7-09). */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  /* Which take the box is on, and so which late arrivals still count: a
     permission granted, a recorder stopping, an upload landing. Every one of
     them names its take, and a removed or superseded take's is ignored (bug
     audit 3, L7-09; voice-takes.ts has the rules). */
  const takes = useRef<TakeState>(startTakes(Boolean(initial)));
  /* False once the question is left. A take already running still saves what
     was said; a microphone granted after this is handed straight back. */
  const mounted = useRef(true);
  /** Every upload in flight, so the advance pill waits for all of them. */
  const uploads = useRef(new Set<Promise<void>>());

  const live = useRef<{
    stream?: MediaStream;
    recorder?: MediaRecorder;
    recognition?: Recognition | null;
    context?: AudioContext;
    frame?: number;
    started: number;
    chunks: Blob[];
    /** Every phrase the recogniser has SETTLED on, kept as a list because the
     *  stitching rule needs the boundaries that a joined string has lost. */
    finals: string[];
    interim: string;
    ended: Ended;
    recording: boolean;
    /** The loudest 512-sample RMS of this recording, raw and unsmoothed --
     *  the meter's own value is smoothed and clipped, so it cannot answer the
     *  quiet question. */
    loudest: number;
    url?: string;
    /** The bytes, kept after the stop so Try again can re-send them. */
    blob?: Blob;
  }>({ started: 0, chunks: [], finals: [], interim: "", ended: "stopped", recording: false, loudest: 0 });

  const teardown = useCallback(() => {
    const l = live.current;
    l.recording = false;
    if (l.frame) cancelAnimationFrame(l.frame);
    l.recognition?.stop();
    l.stream?.getTracks().forEach((t) => t.stop());
    void l.context?.close().catch(() => {});
  }, []);

  /** Send what is in `live.blob` as `take`, and tell the composer when it
   *  lands, unless the take was removed or recorded over by then. */
  const send = useCallback((take: number, seconds: number, transcribed: boolean) => {
    const blob = live.current.blob;
    if (!blob) return;
    setState((p) => (p.kind === "done" ? { ...p, saving: "saving" } : p));
    /* `wanted` stops an unwanted take before its bytes reach the bucket, or
       before they move to where an answer can point: staged bytes are what
       an abandoned upload leaves (voice-upload-client.ts). */
    const run = uploadRecording(blob, seconds, transcribed, () => takes.current.take === take)
      .then((stored) => {
        if (!advance(takes, { type: "uploaded", take }).includes("store")) return;
        hooks.current.onStored(stored);
        setState((p) => (p.kind === "done" ? { ...p, saving: undefined } : p));
      })
      .catch((err: unknown) => {
        // A take that was removed or recorded over stops quietly: nobody is waiting for it.
        if (takes.current.take !== take) return;
        /* Never swallowed. The words are still on screen and the bytes are
           still in this tab, so this is recoverable -- but a save that fails
           silently is the fault audit M11 was about, and it would be worse
           here because nothing else on the page would hint that the recording
           is gone. */
        console.error("[voice] the recording did not upload", err);
        setState((p) => (p.kind === "done" ? { ...p, saving: "failed" } : p));
      });
    const tracked = run.finally(() => uploads.current.delete(tracked));
    uploads.current.add(tracked);
  }, []);

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
    /* A second tap while the browser is still asking is nothing. It used to
       pass the old `recording` check, which was set only after the await, so
       two taps made two recorders writing into one file and left the first
       microphone open after Done for the life of the tab (L7-09). */
    if (!advance(takes, { type: "start" }).includes("ask")) return;
    const take = takes.current.take;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      advance(takes, { type: "refused", take });
      setState({ kind: "unsupported" });
      return;
    }
    setState({ kind: "asking" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          /* Asked for BY NAME rather than left to the browser's default,
             which is the other half of the quiet answer: automatic gain is
             what brings a voice two feet from a laptop up to a usable level,
             and Chrome applies it by default only for some device classes.
             A device that cannot do it ignores the constraint rather than
             refusing the stream, because this is not in `exact`. */
          autoGainControl: true,
        },
      });
    } catch (error) {
      advance(takes, { type: "refused", take });
      const name = (error as DOMException)?.name;
      setState({ kind: name === "NotFoundError" || name === "OverconstrainedError" ? "nomic" : "denied" });
      return;
    }

    /* Granted, but the take may be over: the question was left while the
       browser asked, which used to start a recording nobody could see and
       save it onto that answer. Hand the microphone straight back. */
    if (!advance(takes, { type: "granted", take, mounted: mounted.current }).includes("record")) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      // Whether the device took the constraint is a fact worth being able to
      // read, and `getSettings` is the only thing that knows.
      const settings = stream.getAudioTracks()[0]?.getSettings?.() ?? {};
      console.info("[voice] microphone settings", {
        autoGainControl: settings.autoGainControl,
        noiseSuppression: settings.noiseSuppression,
        echoCancellation: settings.echoCancellation,
        sampleRate: settings.sampleRate,
      });
    }

    if (l.url) URL.revokeObjectURL(l.url);
    const mimeType = FORMATS.find((t) => MediaRecorder.isTypeSupported(t));
    // 64 kbps: two minutes of a voice in about a megabyte. The server's
    // ceiling is five times this (voice-answer-rule.ts).
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 64_000,
    });
    Object.assign(l, {
      stream,
      recorder,
      chunks: [],
      finals: [],
      interim: "",
      ended: "stopped",
      recording: true,
      loudest: 0,
      blob: undefined,
      url: undefined,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size) l.chunks.push(e.data);
    };
    recorder.onstop = () => {
      const elapsed = (performance.now() - l.started) / 1000;
      const effects = advance(takes, { type: "stopped", take, long: elapsed >= 1 });
      /* Too short to keep after "Record again": the box stopped showing the
         earlier recording the moment this take began, so the answer lets it
         go too, instead of keeping one the box no longer shows (L7-09). */
      if (effects.includes("clear")) hooks.current.onStored(null);
      if (elapsed < 1) {
        if (takes.current.take === take) setState({ kind: "short" });
        return;
      }
      if (!effects.includes("upload")) return;
      const blob = new Blob(l.chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      l.blob = blob;
      l.url = url;
      /* What was still being heard when you stopped is folded in as one more
         phrase: the recogniser usually has the last few words pending, and
         throwing them away loses the end of every sentence. */
      const transcript = joinHeard([...l.finals, l.interim]);
      const seconds = Math.min(CAP, Math.max(1, Math.round(elapsed)));
      setState({
        kind: "done",
        url,
        seconds,
        transcribed: transcript.length > 0,
        ended: l.ended,
        quiet: l.loudest < QUIET_RMS,
      });
      hooks.current.onTranscript(transcript);
      send(take, seconds, transcript.length > 0);
    };
    recorder.start(250);
    l.started = performance.now();

    // The clock, and the loudness the quiet check reads.
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      if (rms > l.loudest) l.loudest = rms;
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
        const finals: string[] = [];
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) finals.push(result[0].transcript);
          else interim += result[0].transcript;
        }
        l.finals = finals;
        l.interim = interim;
        const heard = joinHeard(finals);
        setState((p) =>
          p.kind === "recording" ? { ...p, transcript: heard, interim: continueFrom(heard, interim) } : p
        );
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
  }, [clockFraction, send, stop]);

  useEffect(() => {
    mounted.current = true;
    const onHidden = () => {
      if (document.visibilityState === "hidden") stop("interrupted");
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onHidden);
      /* A recording still running when the question is left keeps what was
         said, as a hidden tab does. `stop` ends the recorder itself, so its
         last chunk and its `onstop` arrive on every browser rather than
         depending on ending the tracks to do it. */
      stop("interrupted");
      teardown();
    };
  }, [stop, teardown]);

  const remove = useCallback(() => {
    const l = live.current;
    if (l.url) URL.revokeObjectURL(l.url);
    l.url = undefined;
    l.blob = undefined;
    setState((p) => (p.kind === "done" ? { kind: "removed" } : p));
    /* `clear` comes back every time, even if this recording never finished
       uploading: the row may already point at an EARLIER recording from this
       session, and clearing it is what takes that one off the answer and
       purges its bytes. And the take moves on, so an upload still in flight
       is never handed over: a recording removed while it was saving used to
       land a moment later and go back on the answer (L7-09). The words stay
       where they are -- `bodyWithTranscript` is the card's business, and
       "Your words are still here" is the drawn promise. */
    if (advance(takes, { type: "remove" }).includes("clear")) hooks.current.onStored(null);
  }, []);

  const retry = useCallback(() => {
    const s = stateRef.current;
    if (s.kind === "done") send(takes.current.take, s.seconds, s.transcribed);
  }, [send]);

  /** Resolves once every upload in flight has finished, not only the newest. */
  const settle = useCallback(async () => {
    while (uploads.current.size > 0) await Promise.allSettled([...uploads.current]);
  }, []);

  return { state, clockFraction, on: { start: () => void start(), stop: () => stop("stopped"), remove, retry }, settle };
}

/* ── what the box says under itself ─────────────────────────────────── */

/** A key as well as a sentence, so the status line can CROSSFADE between two
 *  messages rather than swapping the glyphs under the reader's eye. */
function statusFor(state: RecState): { key: string; text: string; tone: "muted" | "cinnamon" | "danger" } | null {
  switch (state.kind) {
    case "asking":
      return { key: "asking", text: "Allow the microphone to start.", tone: "muted" };
    case "denied":
      return {
        key: "denied",
        text: "The microphone is blocked for this site. Allow it in the browser's settings, or type.",
        tone: "muted",
      };
    case "nomic":
      return { key: "nomic", text: "No microphone found. You can type instead.", tone: "muted" };
    case "unsupported":
      return { key: "unsupported", text: "This browser can't record. You can type instead.", tone: "muted" };
    case "short":
      return { key: "short", text: "That was too short to keep.", tone: "muted" };
    case "removed":
      return { key: "removed", text: "Recording removed. Your words are still here.", tone: "muted" };
    case "recording":
      if (state.seconds >= TEN_SECONDS_LEFT) {
        return { key: "countdown", text: `${CAP - state.seconds} seconds left`, tone: "cinnamon" };
      }
      return null;
    case "done":
      if (state.saving === "saving") return { key: "saving", text: "Saving the recording.", tone: "muted" };
      if (state.saving === "failed") return { key: "failed", text: "The recording didn't save.", tone: "danger" };
      /* THE QUIET LINE COMES FIRST, above every other thing this box could
         say about a finished recording, because it is the only one that means
         the answer is not there. */
      if (state.quiet) {
        return {
          key: "quiet",
          text: "That came out almost silent. Check which microphone you're using, then record again.",
          tone: "danger",
        };
      }
      if (state.ended === "cap") {
        return { key: "cap", text: "Two minutes is the most, so it stopped there.", tone: "muted" };
      }
      if (state.ended === "interrupted") {
        return {
          key: "interrupted",
          text: `It stopped when you left the page. The first ${clock(state.seconds)} is kept.`,
          tone: "muted",
        };
      }
      if (!state.transcribed) {
        return {
          key: "nowords",
          text: "This browser can't write down speech, so the recording is the answer.",
          tone: "muted",
        };
      }
      return { key: "written", text: "Written down as you spoke. Fix anything it got wrong.", tone: "muted" };
    default:
      return null;
  }
}

/** One sentence crossfading into the next. 160ms, which is under the 200 a
 *  reader notices as a transition and over the 0 that reads as a glitch. */
function Status({ state, className }: { state: RecState; className?: string }) {
  const s = statusFor(state);
  return (
    <span className={cn("relative min-w-0 flex-1", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {s && (
          <m.span
            key={s.key}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.16, ease: EASE_OUT_SMOOTH }}
            className={cn(
              "block text-[13px] leading-snug",
              s.tone === "cinnamon" && "font-medium text-cinnamon",
              s.tone === "muted" && "text-muted-foreground",
              s.tone === "danger" && "font-medium text-destructive"
            )}
          >
            {s.text}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ── pieces of the box ─────────────────────────────────────────────── */

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
 *  box, because it belongs to the answer rather than to the typing. */
function RecordingChip({ state }: { state: Extract<RecState, { kind: "done" }> }) {
  /* Nothing is handed to the player while the upload is in flight, so the
     control cannot be pressed into a half-written object; the blob URL would
     play, but a disabled button that does nothing and a live one that does are
     two different promises and only one of them is true. */
  const player = usePlayer(state.saving === "saving" ? null : state.url, state.seconds);
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
        disabled={state.saving === "saving"}
      >
        {player.playing ? (
          <Pause size={15} weight="fill" />
        ) : (
          <Play size={15} weight="fill" className="translate-x-px" />
        )}
      </RoundButton>
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-border">
        <m.span
          aria-hidden
          className="absolute inset-0 origin-left rounded-full bg-cinnamon"
          style={{ scaleX: player.progress }}
        />
      </div>
      <span className="shrink-0 text-[13.5px] font-medium tabular-nums text-foreground">
        {clock(player.playing || player.at > 0 ? player.at : state.seconds)}
      </span>
    </div>
  );
}

/**
 * The height the box holds, recording or not.
 *
 * THE ONE PIECE OF MOTION A SPRING CANNOT DO. He asked for nothing sudden, and
 * the suddenest thing a live transcript does is push the page down a line at a
 * time as the words arrive -- which the design system will not let us animate
 * away, because only `transform` and `opacity` may move. So the box does not
 * grow at all: the live words sit in a clipped region of exactly the writing
 * surface's own min-height, anchored to the BOTTOM, so the newest phrase is
 * always the one on screen and the earliest scroll quietly up out of sight.
 * The same number as `MIN_TEXTAREA_HEIGHT` in answer-card.tsx, so the swap
 * between the two is dead still.
 */
const HEARD_HEIGHT = 168;

/** What is being heard, as it is heard. The part the recogniser has not
 *  settled on yet is lighter, and it firms up in place. */
function Heard({ state }: { state: Extract<RecState, { kind: "recording" }> }) {
  const words = `${state.transcript} ${state.interim}`.trim();
  return (
    <div
      className="flex flex-col justify-end overflow-hidden px-4 py-3.5"
      style={{ height: HEARD_HEIGHT }}
      aria-live="polite"
    >
      {!state.hears ? (
        <p className="text-[15px] leading-[1.6] text-muted-foreground">
          This browser can&apos;t write down what you say. Keep talking: the recording is the answer.
        </p>
      ) : !words ? (
        <p className="text-[15px] text-muted-foreground">Listening</p>
      ) : (
        <p className="font-heading text-[17px] leading-[1.7] text-foreground [overflow-wrap:anywhere]">
          {state.transcript} <span className="text-muted-foreground">{state.interim}</span>
        </p>
      )}
    </div>
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

/** Every control in the bar arrives and leaves the same way: a short rise and
 *  a touch of scale on one spring, so a pill appearing beside the microphone
 *  reads as having been handed to you rather than having blinked into
 *  existence. His note, verbatim: "we suddenly add a pill to, for the
 *  recording all of that stuff make sure none of it is sudden". */
const CONTROL_IN = {
  initial: { opacity: 0, scale: 0.92, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 4 },
  transition: SPRINGS.snappy,
} as const;

/* ── the box ───────────────────────────────────────────────────────── */

/**
 * The writing surface, with a microphone in the bottom of its own box.
 *
 * `children` is the surface itself -- `RichTextArea`, from the card -- and it
 * is swapped for the live words while a recording is running, because nobody
 * types and talks at once and a textarea sitting there during a recording is a
 * control that does nothing.
 */
export function MicInTheBox({
  recorder,
  children,
}: {
  recorder: VoiceRecorder;
  children: React.ReactNode;
}) {
  const { state, on, clockFraction } = recorder;
  const recording = state.kind === "recording";

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
            <RecordingChip state={state} />
          </m.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-input)] border bg-card transition-colors duration-200",
          recording ? "border-cinnamon/45" : `border-border hover:border-leaf/40 ${FIELD_FOCUS_WITHIN}`
        )}
      >
        {/* The two minutes running out. It is the reader's own reading line
            along the strip's top edge, doing a second job. */}
        <AnimatePresence initial={false}>
          {recording && (
            <m.span
              key="clock"
              aria-hidden
              className="absolute inset-x-0 top-0 h-[2px] origin-left bg-cinnamon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT_SMOOTH }}
              style={{ scaleX: clockFraction }}
            />
          )}
        </AnimatePresence>

        {/* The swap. `mode="wait"` so the two never overlap and smear, and
            both halves are exactly HEARD_HEIGHT tall, so the box is still. */}
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={recording ? "heard" : "writing"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT_SMOOTH }}
          >
            {recording ? <Heard state={state} /> : children}
          </m.div>
        </AnimatePresence>

        <div className="flex min-h-12 items-center gap-2 px-3 pb-2.5">
          <AnimatePresence initial={false}>
            {recording && (
              <m.span key="elapsed" {...CONTROL_IN} className="flex items-center gap-2 pl-1">
                <LiveDot />
                <span className="text-[13.5px] font-medium tabular-nums text-foreground">
                  {clock(state.seconds)}
                </span>
              </m.span>
            )}
          </AnimatePresence>

          <Status state={state} className="pl-1" />

          <AnimatePresence mode="wait" initial={false}>
            {recording ? (
              <m.div key="stop" {...CONTROL_IN} className="shrink-0">
                <Button type="button" variant="primary" size="sm" onClick={on.stop}>
                  <Stop weight="fill" />
                  Done
                </Button>
              </m.div>
            ) : state.kind === "done" ? (
              <m.div key="again" {...CONTROL_IN} className="flex shrink-0 items-center gap-1">
                {state.saving === "failed" && (
                  <Button type="button" variant="ghost" size="sm" onClick={on.retry}>
                    Try again
                  </Button>
                )}
                <RoundButton label="Record again" onClick={on.start}>
                  <ArrowCounterClockwise size={18} />
                </RoundButton>
                <RoundButton label="Remove the recording" onClick={on.remove}>
                  <Trash size={18} />
                </RoundButton>
              </m.div>
            ) : (
              <m.div key="mic" {...CONTROL_IN} className="shrink-0">
                {/* Disabled while the browser asks: the prompt does not block
                    the page on a laptop, and a second press is the natural
                    reaction to a button that seemed to do nothing. */}
                <RoundButton
                  label="Answer out loud"
                  onClick={on.start}
                  size={40}
                  disabled={state.kind === "asking"}
                >
                  <Microphone size={20} weight={state.kind === "asking" ? "fill" : "regular"} />
                </RoundButton>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
