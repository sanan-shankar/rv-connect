"use client";

/* ------------------------------------------------------------------ *
 *  Asking a vote, in the home's own ask box.
 *
 *  The box is the shipped `AskBox` (home/collecting.tsx), redrawn here
 *  rather than imported because the real one calls `submitPrompt`. Its
 *  rules are his and they carry over: one row of controls, nothing on the
 *  box at rest, and anonymity as a mark in the corner that expands one
 *  line when pressed. A vote is the same kind of thing, so it is the same
 *  kind of control: a second mark beside the eye.
 *
 *  The choices are checked with the server's own rule
 *  (`decideVoteChoices`), so the button and the refusal cannot disagree.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { m } from "motion/react";
import { Eye, Library, ListChecks, Plus, X } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  decideVoteChoices,
  VOTE_CHOICE_MAX,
  VOTE_MAX_CHOICES,
  VOTE_MIN_CHOICES,
} from "@/lib/vote-question-rule";

export type AskPreset = "rest" | "two" | "six" | "long" | "twice";

export const ASK_PRESETS: Array<{ key: AskPreset; label: string; text: string; vote: boolean; choices: string[] }> = [
  { key: "rest", label: "At rest", text: "", vote: false, choices: ["", ""] },
  {
    key: "two",
    label: "A vote of two",
    text: "Who believes Sanan made this website?",
    vote: true,
    choices: ["He made it", "Someone made it for him"],
  },
  {
    key: "six",
    label: "Six, the most",
    text: "Who is most likely to be famous by the next reunion?",
    vote: true,
    choices: ["Leela", "Joseph", "Kavya", "Rohan", "Meera", "Nobody, we peaked at school"],
  },
  {
    key: "long",
    label: "Near the limit",
    text: "Who would last longest if the trek bus broke down on the ghat road?",
    vote: true,
    choices: ["Whoever packed the Parle-G, the torch and the spare socks nobody else brought", "The driver", ""],
  },
  {
    key: "twice",
    label: "The same twice",
    text: "Rest hour: did you actually sleep?",
    vote: true,
    choices: ["Every single day", "every single day"],
  },
];

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
/** Past this many characters a choice shows how many are left. */
const COUNT_FROM = 64;

function CornerMark({
  pressed,
  label,
  tone,
  onClick,
  children,
}: {
  pressed: boolean;
  label: string;
  tone: "canopy" | "cinnamon";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors duration-150 active:scale-95",
        RING,
        pressed
          ? tone === "canopy"
            ? "bg-canopy/[0.12] text-canopy"
            : "bg-cinnamon/[0.14] text-cinnamon"
          : "state-layer text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function AskVote({ preset }: { preset: AskPreset }) {
  const start = ASK_PRESETS.find((p) => p.key === preset) ?? ASK_PRESETS[0];
  const [text, setText] = useState(start.text);
  const [vote, setVote] = useState(start.vote);
  const [anon, setAnon] = useState(false);
  const [choices, setChoices] = useState(start.choices);

  const verdict = decideVoteChoices(vote ? "vote" : null, vote ? choices : []);
  const filled = choices.filter((c) => c.trim()).length;
  /* "At least two" is not an error while someone is still typing the
     second; every other refusal is worth saying the moment it is true. */
  const problem = vote && !verdict.ok && filled >= VOTE_MIN_CHOICES ? verdict.error : null;
  const ready = text.trim().length > 0 && verdict.ok;

  const setAt = (i: number, value: string) => setChoices((cs) => cs.map((c, k) => (k === i ? value : c)));

  return (
    <div>
      <div className="card-elevated relative rounded-[var(--radius)] border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="font-heading text-[17px] text-foreground">Ask everyone something</p>
          <div className="-my-1 -mr-1 flex items-center gap-0.5">
            <CornerMark pressed={vote} label={vote ? "Asking for a vote" : "Make it a vote"} tone="canopy" onClick={() => setVote((v) => !v)}>
              <ListChecks className="h-[17px] w-[17px]" strokeWidth={1.9} />
            </CornerMark>
            <CornerMark pressed={anon} label="Ask anonymously" tone="cinnamon" onClick={() => setAnon((v) => !v)}>
              <Eye className="h-[17px] w-[17px]" strokeWidth={1.9} />
            </CornerMark>
          </div>
        </div>

        {(vote || anon) && (
          <m.p
            key={`${vote}-${anon}`}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT_SMOOTH }}
            className="mt-1.5 text-[12.5px] font-medium leading-none"
          >
            {vote && <span className="text-canopy">Everyone picks one</span>}
            {vote && anon && <span className="text-muted-foreground">, </span>}
            {anon && <span className="text-cinnamon">{vote ? "asked anonymously" : "Ask anonymously"}</span>}
          </m.p>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Your question for the group"
          maxLength={300}
          className="mt-3 max-h-64 min-h-[5.5rem] bg-background/60 [overflow-wrap:anywhere]"
        />

        {vote && (
          <m.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
            className="mt-3"
          >
            <ul className="space-y-2" aria-label="Choices">
              {choices.map((c, i) => {
                const left = VOTE_CHOICE_MAX - c.length;
                return (
                  <li key={i} className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="h-4 w-4 shrink-0 rounded-full border-2 border-border" />
                    <div className="relative min-w-0 flex-1">
                      <Input
                        value={c}
                        onChange={(e) => setAt(i, e.target.value)}
                        maxLength={VOTE_CHOICE_MAX}
                        placeholder={`Choice ${i + 1}`}
                        aria-label={`Choice ${i + 1}`}
                        className={cn("bg-background/60", c.length >= COUNT_FROM && "pr-11")}
                      />
                      {c.length >= COUNT_FROM && (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] tabular-nums text-muted-foreground">
                          {left}
                        </span>
                      )}
                    </div>
                    {choices.length > VOTE_MIN_CHOICES ? (
                      <button
                        type="button"
                        aria-label={`Remove choice ${i + 1}`}
                        onClick={() => setChoices((cs) => cs.filter((_, k) => k !== i))}
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground active:scale-95 state-layer",
                          RING
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span aria-hidden className="w-8 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex min-h-8 items-center gap-3 pl-6">
              {choices.length < VOTE_MAX_CHOICES && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setChoices((cs) => [...cs, ""])}>
                  <Plus className="h-3.5 w-3.5" />
                  Add a choice
                </Button>
              )}
              {problem && <p className="text-[12.5px] font-medium text-destructive">{problem}</p>}
            </div>
          </m.div>
        )}

        <div className="mt-3 flex items-center gap-2.5">
          <Button type="button" variant="outline" size="sm">
            <Library className="h-3.5 w-3.5" />
            From the library
          </Button>
          <Button size="sm" className="ml-auto" disabled={!ready}>
            Ask the group
          </Button>
        </div>
      </div>

      {/* The questions so far, with a vote in it. The panel is the shipped
          AskedPanel's look; the one new thing is the choices under a vote. */}
      <div className="card-elevated mt-4 rounded-[var(--radius)] border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium text-muted-foreground">2 questions so far</p>
        <ul className="space-y-2">
          <AskedRow who="Joseph Mathew" text="What is a fun thing you did this summer?" />
          <AskedRow
            who="You, a vote"
            text={start.text || "Who believes Sanan made this website?"}
            choices={vote ? choices.map((c) => c.trim()).filter(Boolean) : undefined}
          />
        </ul>
      </div>
    </div>
  );
}

function AskedRow({ who, text, choices }: { who: string; text: string; choices?: string[] }) {
  return (
    <li className="flex min-w-0 items-start gap-2.5 rounded-[10px] border border-border/70 bg-background/40 px-3 py-2.5">
      <BirdAvatar user={{ id: `vote-asked-${who}`, name: who, photoUrl: null }} size={28} />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[15.5px] leading-snug text-foreground [overflow-wrap:anywhere]">{text}</p>
        {choices && (
          /* A short list, one hollow circle a choice (the ballot's own mark),
             not a dotted line: at 80 characters a choice wraps, and a wrapped
             middle-dot line strands a dot at the start of a line, which the
             dot rule forbids (DESIGN-SYSTEM 5). */
          <ul aria-label="Choices" className="mt-1.5 space-y-0.5">
            {choices.map((c) => (
              <li
                key={c}
                className="flex items-start gap-1.5 text-[12.5px] leading-snug text-foreground/80 [overflow-wrap:anywhere]"
              >
                <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full border border-canopy/60" />
                <span className="min-w-0">{c}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[11.5px] font-medium text-muted-foreground">{who.split(",")[0]}</p>
      </div>
    </li>
  );
}
