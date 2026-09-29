"use client";

/* ------------------------------------------------------------------ *
 *  The room: an answer you can hear.
 *
 *  Two things to pick, one under the other. The recorder, in the
 *  answering composer, two ways. The player, in the reader, three ways.
 *  Record something in the first and it becomes the top answer in the
 *  second, so every player can be heard playing your own voice.
 *
 *  Nothing is scaled (campaign finding F34): the phone is a real 390
 *  and the laptop is this window. The room's own chrome scrolls
 *  sideways rather than pushing the page wider (F44).
 * ------------------------------------------------------------------ */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "@/components/common/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMotionValue } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { PhoneBar, PhoneShell, DesktopShell } from "../sketches/_shell";
import { CAP, peaksOfRecording, useStandIn } from "./_clip";
import {
  InTheBox,
  SayItInstead,
  STILLS,
  useRecorder,
  useStillLevel,
  type Handlers,
  type RecState,
  type StillKey,
} from "./_recorder";
import { AnswerTile, type PlayerKey, type VoiceAnswer } from "./_players";

const GUTTER = 20;
const READING = 856;

type RecorderKey = "box" | "instead";

const RECORDERS: Array<{ key: RecorderKey; label: string; says: string[] }> = [
  {
    key: "box",
    label: "A mic in the box",
    says: [
      "The microphone sits in the corner of the box you type in. Press it and your words appear in the box as you say them.",
      "The thin line along the top is the two minutes running out. It is the reader's reading line, doing a second job.",
      "When you stop, the recording sits above the box and the words stay editable. The browser will get names wrong, so they have to be.",
    ],
  },
  {
    key: "instead",
    label: "Say it instead",
    says: [
      "Answering out loud is a button beside Add a photo. Press it and the box becomes one big button that swells as you talk.",
      "Plainer about what is happening and hard to set off by accident. While you talk you can't see what you had typed.",
      "When you stop, you are back in the box with the words in it.",
    ],
  },
];

const PLAYERS: Array<{ key: PlayerKey; label: string; says: string[] }> = [
  {
    key: "bird",
    label: "The bird speaks",
    says: [
      "Your bird is the play button. It bobs while it talks, and a line under the name fills as it plays.",
      "The tile keeps its shape and gains one line. With no words under it, that line is not much of an answer.",
    ],
  },
  {
    key: "line",
    label: "A line of voice",
    says: [
      "A pill with the shape of the voice in it, the way a voice note looks in a messaging app. Everybody already knows how to use it.",
      "The shape is 36 numbers per answer. That is a new column, or every recording on the page downloaded before the page can draw.",
      "It is also the one that looks most like something else.",
    ],
  },
  {
    key: "tape",
    label: "The tape",
    says: [
      "How long the tape is, is how long they talked, against the two-minute limit. A quick answer is a short pill and a story runs nearly the width.",
      "You can see who spoke for how long before pressing anything. It needs only the length, which is already stored.",
    ],
  },
];

const PILL =
  "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ON = "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]";
const OFF = "border-border bg-card text-muted-foreground transition-colors duration-150 hover:text-foreground";
const CINNAMON_ON = "border-transparent bg-cinnamon text-white shadow-[0_5px_13px_-12px_var(--color-cinnamon)]";

const STILL_KEYS = Object.keys(STILLS) as StillKey[];

function Pills<K extends string>({
  label,
  items,
  value,
  onPick,
  on = ON,
}: {
  label: string;
  items: Array<{ key: K; label: string }>;
  value: K;
  onPick: (k: K) => void;
  on?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <SpringPress
          key={item.key}
          as="button"
          onClick={() => onPick(item.key)}
          aria-pressed={value === item.key}
          className={`${PILL} ${value === item.key ? on : OFF}`}
        >
          {item.label}
        </SpringPress>
      ))}
    </div>
  );
}

function Frame({ phone, children }: { phone: boolean; children: React.ReactNode }) {
  return phone ? (
    <div className="mx-auto w-full max-w-[430px]">
      <PhoneShell>
        <PhoneBar title="In the loop" position="sticky" />
        <div className="pb-14 pt-7" style={{ paddingLeft: GUTTER, paddingRight: GUTTER }}>
          {children}
        </div>
      </PhoneShell>
    </div>
  ) : (
    <DesktopShell>
      <div className="pb-16" style={{ width: READING, maxWidth: "100%" }}>
        {children}
      </div>
    </DesktopShell>
  );
}

function Says({ lines }: { lines: string[] }) {
  return (
    <div className="mx-auto max-w-[74ch] px-4 pt-6 sm:px-6">
      {lines.map((line, i) => (
        <p key={i} className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          {line}
        </p>
      ))}
    </div>
  );
}

function Room() {
  const router = useRouter();
  const params = useSearchParams();

  const phone = params.get("w") !== "laptop";
  const recorderKey: RecorderKey = params.get("rec") === "instead" ? "instead" : "box";
  const stillParam = params.get("state");
  const still: StillKey | "live" = stillParam && stillParam in STILLS ? (stillParam as StillKey) : "live";
  const playerParam = params.get("player");
  const playerKey: PlayerKey = playerParam === "line" || playerParam === "tape" ? playerParam : "bird";

  const set = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, value);
    router.replace(`/lab/catchups/voice?${q.toString()}`, { scroll: false });
  };

  /* ── the recorder ── */
  const live = useRecorder();
  const stillState = still === "live" ? null : STILLS[still].state;
  const shown: RecState = stillState ?? live.state;
  const stillLevel = useStillLevel(stillState?.kind === "recording");
  const stillClock = useMotionValue(0);
  useEffect(() => {
    stillClock.set(stillState?.kind === "recording" ? stillState.seconds / CAP : 0);
  }, [stillState, stillClock]);

  /* Pressing anything in a still state goes live, so the room never has a
     button that does nothing. */
  const goLive: Handlers = {
    start: () => {
      set("state", "live");
      live.on.start();
    },
    stop: () => set("state", "live"),
    remove: () => set("state", "live"),
    write: () => {},
  };
  const handlers = stillState ? goLive : live.on;

  const standInShort = useStandIn(48, 7);
  const standInLong = useStandIn(117, 19);
  const standInFirefox = useStandIn(72, 3);

  /* ── your recording, heard in the Edition ── */
  const [mine, setMine] = useState<VoiceAnswer | null>(null);
  useEffect(() => {
    const s = live.state;
    if (s.kind !== "done" || !s.url) return;
    let cancelled = false;
    void peaksOfRecording(s.url).then((peaks) => {
      if (cancelled) return;
      setMine({
        id: "you",
        name: "You",
        words: s.transcript || null,
        transcribed: s.transcribed,
        url: s.url,
        seconds: s.seconds,
        peaks,
        loves: 0,
        replies: 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [live.state]);

  const answers: VoiceAnswer[] = useMemo(
    () => [
      ...(mine ? [mine] : []),
      {
        id: "leela-nair",
        name: "Leela Nair",
        words: null,
        transcribed: false,
        url: standInFirefox?.url ?? null,
        seconds: 72,
        peaks: standInFirefox?.peaks ?? null,
        loves: 4,
        replies: 1,
      },
      {
        id: "joseph-mathew",
        name: "Joseph Mathew",
        words:
          "Took the kids back to the valley in May. They were unimpressed by the rocks and very impressed by the dosa, which I think is the right order.",
        transcribed: true,
        url: standInShort?.url ?? null,
        seconds: 48,
        peaks: standInShort?.peaks ?? null,
        loves: 6,
        replies: 2,
      },
      {
        id: "meera-raghavan",
        name: "Meera Raghavan",
        words:
          "We did the Kudremukh trek in the monsoon, which everybody told us not to do. Leeches, fog, one wrong turn that added three hours, and the best view I have had in years once it cleared. My knees have not forgiven me. I would do it again next week.",
        transcribed: true,
        url: standInLong?.url ?? null,
        seconds: 117,
        peaks: standInLong?.peaks ?? null,
        loves: 9,
        replies: 0,
      },
      {
        id: "arjun-rao",
        name: "Arjun Rao",
        words: "Learnt to make appam properly. Three bad batches, then one good one, and that one was worth it.",
        transcribed: false,
        url: null,
        seconds: null,
        peaks: null,
        loves: 3,
        replies: 0,
      },
    ],
    [mine, standInFirefox, standInShort, standInLong]
  );

  const recorder = RECORDERS.find((r) => r.key === recorderKey) ?? RECORDERS[0];
  const player = PLAYERS.find((p) => p.key === playerKey) ?? PLAYERS[0];
  const drawnRecorder =
    recorderKey === "box" ? (
      <InTheBox
        state={shown}
        on={handlers}
        clockFraction={stillState ? stillClock : live.clockFraction}
        fallbackUrl={standInShort?.url ?? null}
      />
    ) : (
      <SayItInstead
        state={shown}
        on={handlers}
        level={stillState ? stillLevel : live.level}
        fallbackUrl={standInShort?.url ?? null}
      />
    );

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="border-b border-border py-3">
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          <Link
            href="/lab"
            className="state-layer inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PeaksMark size={16} />
            Lab
          </Link>
          <div className="flex shrink-0 gap-1.5" role="group" aria-label="Viewport">
            {(["phone", "laptop"] as const).map((v) => (
              <SpringPress
                key={v}
                as="button"
                onClick={() => set("w", v)}
                aria-pressed={phone === (v === "phone")}
                className={`${PILL} ${phone === (v === "phone") ? ON : OFF}`}
              >
                {v === "phone" ? "Phone" : "Laptop"}
              </SpringPress>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 sm:px-6">
        <h1 className="font-heading text-[1.15rem] leading-tight tracking-[-0.02em] sm:text-[1.35rem]">
          An answer you can hear
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground sm:text-[14px]">
          Pick a recorder and a player. Record something and it plays in all three.
        </p>
      </div>

      {/* ── answering ── */}
      <h2 className="mt-8 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">Answering</h2>
      <div className="mt-3">
        <Pills label="Recorder" items={RECORDERS} value={recorderKey} onPick={(k) => set("rec", k)} />
      </div>
      <div className="mt-2">
        <Pills
          label="State"
          on={CINNAMON_ON}
          items={[{ key: "live" as const, label: "Live" }, ...STILL_KEYS.map((k) => ({ key: k, label: STILLS[k].label }))]}
          value={still}
          onPick={(k) => set("state", k)}
        />
      </div>

      <div className="mt-5">
        <Frame phone={phone}>
          <div data-shot="composer" className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
            <h3 className="max-w-lg font-heading text-[1.35rem] font-bold leading-[1.25] tracking-[-0.02em] text-foreground sm:text-[1.55rem]">
              What is a fun thing you did this summer?
            </h3>
            <div className="mt-[var(--space-m)]">{drawnRecorder}</div>
            <div className="mt-[var(--space-m)] flex items-center justify-end gap-1.5">
              <Button type="button" variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="button" variant="primary" size="sm">
                Next
              </Button>
            </div>
          </div>
        </Frame>
      </div>
      <Says lines={recorder.says} />

      {/* ── in the Edition ── */}
      <h2 className="mt-12 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">In the Edition</h2>
      <div className="mt-3">
        <Pills label="Player" items={PLAYERS} value={playerKey} onPick={(k) => set("player", k)} />
      </div>

      <div className="mt-5">
        <Frame phone={phone}>
          <div data-shot="edition">
          <span aria-hidden className="block h-[2px] w-8 rounded-full bg-cinnamon" />
          <h3
            className="mt-3 font-heading text-foreground [overflow-wrap:anywhere]"
            style={{ fontSize: 24, lineHeight: 1.2, letterSpacing: "-0.015em" }}
          >
            What is a fun thing you did this summer?
          </h3>
          <p className="mt-2 text-[13.5px] text-muted-foreground">Asked by Priya Menon</p>
          <div className="mt-4 space-y-3">
            {answers.map((a) => (
              <AnswerTile key={a.id} answer={a} player={playerKey} phone={phone} />
            ))}
          </div>
          </div>
        </Frame>
      </div>
      <Says lines={player.says} />

      <div className="mx-auto max-w-[74ch] px-4 pb-16 pt-10 sm:px-6">
        <h2 className="font-heading text-[1.05rem] tracking-[-0.02em]">Worth knowing before you pick</h2>
        {[
          "Leela's answer is what Firefox gives you. It records but can't write down speech, so the recording is the whole answer.",
          "Chrome writes the words down by sending the audio to Google, and Safari by sending it to Apple. There is no key and no bill, but the audio does leave the phone.",
          "Some phones won't let the recorder and the speech recogniser use the microphone at the same time. Try it here on yours.",
          "The stand-in voices are a hum shaped like someone talking. Your own recording replaces nothing and saves nowhere.",
          "Underneath is built and switched off: the upload, the checks on it, and the two-minute limit.",
        ].map((line) => (
          <p key={line} className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** `useSearchParams` needs a Suspense boundary inside a client component. */
export function VoiceRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Room />
    </Suspense>
  );
}
