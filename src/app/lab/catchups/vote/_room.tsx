"use client";

/* ------------------------------------------------------------------ *
 *  The room: a question the group votes on.
 *
 *  Three things, top to bottom, in the order a member meets them: asking
 *  a vote on the home, casting one while answering, and the result in the
 *  published Edition. The first two are drawn once each with their
 *  states; the third is the design half and is drawn three ways against
 *  eight votes.
 *
 *  Nothing is scaled (campaign finding F34): the phone is a real 390
 *  and the laptop is this window. The room's own chrome scrolls
 *  sideways rather than pushing the page wider (F44).
 * ------------------------------------------------------------------ */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatCircle } from "@phosphor-icons/react";
import { m } from "motion/react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import { SpringPress, SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { PhoneBar, PhoneShell, DesktopShell } from "../sketches/_shell";
import { CASES, caseOf } from "./_cases";
import { ASK_PRESETS, AskVote, type AskPreset } from "./_ask";
import { BALLOT_PRESETS, Ballot, type BallotPreset } from "./_ballot";
import { VoteResult, type ResultKey } from "./_results";

const GUTTER = 20;
const READING = 856;

const RESULTS: Array<{ key: ResultKey; label: string; says: string[] }> = [
  {
    key: "flocks",
    label: "Flocks",
    says: [
      "Each choice is a heading with the birds of everyone who picked it gathered underneath, then their names.",
      "A landslide is a crowd and a tie is two crowds the same size. You can see it without a number.",
      "Anything people wrote sits under their flock. A bare pick has nothing to heart, so hearts would go on the lines.",
    ],
  },
  {
    key: "piles",
    label: "Piles",
    says: [
      "Every choice is a pile of birds on one ground line, so the biggest pile is the answer before you read anything.",
      "Tap a pile to see who is in it. Six choices run sideways off the edge, like the photo run.",
      "It is the nearest of the three to a chart. A long choice gets squeezed to three lines under a narrow pile.",
    ],
  },
  {
    key: "roll",
    label: "Roll call",
    says: [
      "One row per person: their bird, their name and what they picked, with anything they wrote underneath.",
      "It reads most like the rest of the Edition, a list of people. Forty votes is forty rows, so it folds after eight.",
      "The pick has to fit in a chip, so a long choice is cut short. Choices nobody picked are named at the end.",
    ],
  },
];

const ASK_SAYS = [
  "The list mark beside the eye makes the question a vote. Two choice boxes open under it, and you can add up to six.",
  "Nothing extra sits on the box until you press it, the same as asking anonymously.",
  "Under the questions so far, a vote shows its choices, so everyone can see what they will be picking from.",
];

const BALLOT_SAYS = [
  "The choices are the answer. Tap one and it fills green. Tap another to change your mind.",
  "Once you have picked, a box opens for a line if you want one. Nobody has to write anything.",
  "Nobody sees how the vote is going until the Edition is out. Then everyone sees who picked what, and the line under the choices says so.",
];

const PILL =
  "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ON = "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]";
const OFF = "border-border bg-card text-muted-foreground transition-colors duration-150 hover:text-foreground";
const CINNAMON_ON = "border-transparent bg-cinnamon text-white shadow-[0_5px_13px_-12px_var(--color-cinnamon)]";

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
      {lines.map((line) => (
        <p key={line} className="mt-3 text-[14.5px] leading-[1.62] text-foreground/85">
          {line}
        </p>
      ))}
    </div>
  );
}

/** A question heading as the reader draws one. */
function Heading({ text, asker }: { text: string; asker: string }) {
  return (
    <>
      <span aria-hidden className="block h-[2px] w-8 rounded-full bg-cinnamon" />
      <h3 className="mt-3 break-words font-heading text-[24px] leading-[1.2] tracking-[-0.015em] text-foreground [overflow-wrap:anywhere]">
        {text}
      </h3>
      <p className="mt-2 text-[13.5px] text-muted-foreground">Asked by {asker}</p>
    </>
  );
}

/** The next question's answer, as the reader's tile, so the result is seen
 *  beside the thing it sits between. */
function NeighbourTile() {
  const [liked, setLiked] = useState(false);
  return (
    <article className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <div className="px-4 pt-3.5 md:px-5 md:pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <BirdAvatar user={{ id: "vote-meera-raghavan", name: "Meera Raghavan", photoUrl: null }} size={40} />
          <span className="descender-room min-w-0 truncate text-[17px] font-medium leading-none text-foreground">
            Meera Raghavan
          </span>
        </div>
        <p className="mt-2.5 break-words text-[15.5px] leading-[1.6] text-foreground md:text-[16px]">
          We did the Kudremukh trek in the monsoon, which everybody told us not to do. Leeches, fog, and the
          best view I have had in years once it cleared.
        </p>
      </div>
      <div className="px-4 pb-1.5 pt-1 md:px-5 md:pb-2 md:pt-1.5">
        <div className="-ml-2.5 flex items-center gap-1 text-muted-foreground">
          <LoveButton liked={liked} count={6 + (liked ? 1 : 0)} onToggle={() => setLiked((v) => !v)} label="Love this answer" />
          <m.button
            type="button"
            aria-label="Show replies"
            whileTap={{ scale: 0.93 }}
            transition={SPRINGS.snappy}
            className="state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChatCircle size={18} />
            <span>2</span>
          </m.button>
        </div>
      </div>
    </article>
  );
}

function Room() {
  const router = useRouter();
  const params = useSearchParams();

  const phone = params.get("w") !== "laptop";
  const askParam = params.get("ask");
  const ask: AskPreset = ASK_PRESETS.some((p) => p.key === askParam) ? (askParam as AskPreset) : "two";
  const ballotParam = params.get("ballot");
  const ballot: BallotPreset = BALLOT_PRESETS.some((p) => p.key === ballotParam)
    ? (ballotParam as BallotPreset)
    : "none";
  const resultParam = params.get("result");
  const result: ResultKey = RESULTS.some((r) => r.key === resultParam) ? (resultParam as ResultKey) : "flocks";
  const vc = caseOf(params.get("vote"));
  const ballotCase = caseOf(ballot === "six" ? "six" : "two");

  const set = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, value);
    router.replace(`/lab/catchups/vote?${q.toString()}`, { scroll: false });
  };

  const drawing = RESULTS.find((r) => r.key === result) ?? RESULTS[0];

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
          Who picked what
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground sm:text-[14px]">
          Ask a vote, cast one, and pick how the result reads in the Edition.
        </p>
      </div>

      {/* ── asking ── */}
      <h2 className="mt-8 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">Asking</h2>
      <div className="mt-3">
        <Pills label="Asking" on={CINNAMON_ON} items={ASK_PRESETS} value={ask} onPick={(k) => set("ask", k)} />
      </div>
      <div className="mt-5">
        <Frame phone={phone}>
          <div data-shot="ask">
            <AskVote key={ask} preset={ask} />
          </div>
        </Frame>
      </div>
      <Says lines={ASK_SAYS} />

      {/* ── answering ── */}
      <h2 className="mt-12 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">Answering</h2>
      <div className="mt-3">
        <Pills label="Answering" on={CINNAMON_ON} items={BALLOT_PRESETS} value={ballot} onPick={(k) => set("ballot", k)} />
      </div>
      <div className="mt-5">
        <Frame phone={phone}>
          <div data-shot="ballot">
            <Ballot key={ballot} vc={ballotCase} preset={ballot} />
          </div>
        </Frame>
      </div>
      <Says lines={BALLOT_SAYS} />

      {/* ── in the Edition ── */}
      <h2 className="mt-12 px-4 font-heading text-[1.05rem] tracking-[-0.02em] sm:px-6">In the Edition</h2>
      <div className="mt-3">
        <Pills label="Result" items={RESULTS} value={result} onPick={(k) => set("result", k)} />
      </div>
      <div className="mt-2">
        <Pills
          label="The vote"
          on={CINNAMON_ON}
          items={CASES.map((c) => ({ key: c.key, label: c.label }))}
          value={vc.key}
          onPick={(k) => set("vote", k)}
        />
      </div>
      <div className="mt-5">
        <Frame phone={phone}>
          <div data-shot="result">
            <Heading text={vc.question} asker={vc.asker} />
            <div className="mt-4">
              <VoteResult key={`${result}-${vc.key}`} vc={vc} kind={result} />
            </div>
            <div className={cn("mt-12")}>
              <Heading text="What is a fun thing you did this summer?" asker="Priya Menon" />
              <div className="mt-4">
                <NeighbourTile />
              </div>
            </div>
          </div>
        </Frame>
      </div>
      <Says lines={drawing.says} />

      <div className="mx-auto max-w-[74ch] px-4 pb-16 pt-10 sm:px-6">
        <h2 className="font-heading text-[1.05rem] tracking-[-0.02em]">Worth knowing before you pick</h2>
        {[
          "The asker writes the choices with the question, and nobody can change them once answering opens, because votes may already be cast.",
          "Nobody can add a choice of their own. That was your answer to 37.",
          "Taking a vote back takes the line with it, and you are out of the Edition for that question.",
          "The names are made up. The birds are the real ones.",
          "Underneath is built and switched off: the choices, the pick, the checks, and a result nobody can read before the Edition is out.",
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
export function VoteRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Room />
    </Suspense>
  );
}
