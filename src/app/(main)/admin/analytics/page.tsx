import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Analytics",
};

/* The questions this room will answer, and where each answer already lives.
   Written down now so the room is not designed from scratch later, and so it
   is obvious which ones are cheap and which need a schema change first. */
const PLANNED: { question: string; source: string; ready: boolean }[] = [
  {
    question: "How many people have joined, and when",
    source: "Every account carries the day it was made.",
    ready: true,
  },
  {
    question: "Who they are: alumni, teachers, which batches",
    source: "Already on the account, and already how the directory groups people.",
    ready: true,
  },
  {
    question: "Where in the world they are",
    source: "Cities carry real coordinates, which is what already draws the map.",
    ready: true,
  },
  {
    question: "What gets written, and what gets read",
    source: "Posts, letters, comments, hearts, poll votes, saved things, photo hearts.",
    ready: true,
  },
  {
    question: "Whether Catch-ups are actually being answered",
    source: "Answers per Round against how many people are in the group.",
    ready: true,
  },
  {
    question: "What has been given, and how",
    source: "The contributions ledger, real payments only.",
    ready: true,
  },
  {
    question: "Whether email is reaching people",
    source: "The send queue already records every attempt and every failure.",
    ready: true,
  },
  {
    question: "Who is still using this",
    source:
      "Nothing records when somebody was last here. This is the one question the database cannot answer today, and the column has to exist before it can start collecting.",
    ready: false,
  },
];

/**
 * A room with a reserved place and nothing in it yet.
 *
 * The owner is building this separately. The job here was to hold the slot in
 * the rail, so that when it arrives it is a section of the panel rather than
 * something bolted onto the side of it, and to write down the one thing that
 * has to be decided BEFORE it is built rather than after.
 *
 * No stats block: the house rule for a room with no numbers is not to open
 * with a scoreboard it cannot fill (docs/spec/lab-voice.md, and the same
 * instinct applies here).
 */
export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Analytics" />

      <p className="max-w-2xl text-[14px] leading-relaxed text-foreground">
        Not built yet. This is the reserved place for it, so it arrives as part of the panel
        rather than beside it. Below is what the site can already answer, and the one thing it
        cannot.
      </p>

      <ul className="flex max-w-2xl flex-col gap-2">
        {PLANNED.map((p) => (
          <li
            key={p.question}
            className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-card p-3.5"
          >
            <p className="text-[13.5px] font-semibold text-foreground">{p.question}</p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{p.source}</p>
          </li>
        ))}
      </ul>

      {/* The one thing worth acting on before the build, not after: a column
          that does not exist collects nothing retroactively. */}
      <div className="max-w-2xl rounded-[var(--radius)] border border-cinnamon/30 bg-cinnamon/[0.07] p-3.5">
        <p className="text-[13.5px] font-semibold text-cinnamon">Worth deciding first</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">
          Nothing currently records when a member was last here. Adding that is cheap today and
          impossible to fill in later, because there is no history to recover. Every other
          question on this list can wait until the room is built; this one starts collecting the
          day it is added.
        </p>
      </div>
    </div>
  );
}
