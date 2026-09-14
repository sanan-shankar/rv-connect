"use client";

/* ------------------------------------------------------------------ *
 *  The published result, drawn three ways, in the reader.
 *
 *  All three answer R32 the same way: who chose what, with their birds,
 *  and never a percentage ("you're trying so hard to include useless
 *  information"). None of them prints a count. What differs is the unit:
 *
 *    FLOCKS    a choice, with everyone who picked it gathered under it
 *    PILES     a choice, as a pile of birds on one ground line
 *    ROLL CALL a person, with what they picked beside their name
 *
 *  Each sits in the reader's own paper tile, at the reader's sizes, so it
 *  is judged beside the answer tiles around it.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { MetaDots } from "@/components/common/meta-dots";
import { SpringPress } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { Choice, VoteCase, Voter } from "./_cases";

export type ResultKey = "flocks" | "piles" | "roll";

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const TILE = "card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card";

/** Three names, then how many more, with a way to see them all. */
function Names({ voters }: { voters: Voter[] }) {
  const [all, setAll] = useState(false);
  const FIRST = 3;
  const names = voters.map((v) => v.person.name);
  const shown = all || names.length <= FIRST + 1 ? names : names.slice(0, FIRST);
  const more = names.length - shown.length;
  const joined =
    shown.length === 1
      ? shown[0]
      : more > 0
        ? `${shown.join(", ")} and ${more} more`
        : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return (
    <p className="mt-2 break-words text-[13.5px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
      {joined}
      {names.length > FIRST + 1 && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className={cn("rounded-sm font-medium text-canopy hover:underline active:opacity-70", RING)}
          >
            {all ? "Fewer" : "Everyone"}
          </button>
        </>
      )}
    </p>
  );
}

function Lines({ voters, className }: { voters: Voter[]; className?: string }) {
  const said = voters.filter((v) => v.line);
  if (said.length === 0) return null;
  return (
    <div className={cn("space-y-1.5", className)}>
      {said.map((v) => (
        <p
          key={v.person.id}
          className="break-words text-[15px] leading-[1.55] text-foreground [overflow-wrap:anywhere] md:text-[15.5px]"
        >
          <span className="font-medium">{v.person.name}</span>{" "}
          <span className="text-foreground/80">{v.line}</span>
        </p>
      ))}
    </div>
  );
}

/* ── 1. flocks ──────────────────────────────────────────────────────── */

function Flock({ choice }: { choice: Choice }) {
  const empty = choice.voters.length === 0;
  return (
    <section>
      <h4
        className={cn(
          "break-words font-heading text-[17px] leading-snug [overflow-wrap:anywhere]",
          empty ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {choice.text}
      </h4>
      {empty ? (
        <p className="mt-1 text-[13.5px] text-muted-foreground">Nobody picked this</p>
      ) : (
        <>
          <ul aria-label={`Who picked ${choice.text}`} className="mt-2.5 flex flex-wrap gap-1.5">
            {choice.voters.map((v) => (
              <li key={v.person.id} title={v.person.name}>
                <BirdAvatar user={v.person} size={30} />
              </li>
            ))}
          </ul>
          <Names voters={choice.voters} />
          <Lines voters={choice.voters} className="mt-2.5" />
        </>
      )}
    </section>
  );
}

function Flocks({ vc }: { vc: VoteCase }) {
  return (
    <article className={cn(TILE, "px-4 py-4 md:px-5 md:py-5")}>
      <div className="space-y-6">
        {vc.choices.map((c) => (
          <Flock key={c.id} choice={c} />
        ))}
      </div>
    </article>
  );
}

/* ── 2. piles ───────────────────────────────────────────────────────── */

/** A pile is four 24px birds wide: 4 x 24 + 3 x 4 = 108, plus its padding. */
const PILE = 116;

function Piles({ vc }: { vc: VoteCase }) {
  const firstPicked = vc.choices.findIndex((c) => c.voters.length > 0);
  const [open, setOpen] = useState(Math.max(0, firstPicked));
  const chosen = vc.choices[open];

  return (
    <article className={TILE}>
      {/* Sideways when the piles do not fit, like the photo run: the band
          scrolls and the tile does not get wider. */}
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Every pile is exactly PILE wide and never grows: a flex item that
            may grow sizes to its birds' max-content, and forty birds made one
            "pile" 610px wide with the second choice pushed out of the tile.
            Centred while they fit, sideways once they do not. */}
        <div className="flex w-max min-w-full items-end justify-center gap-2 px-3 pt-4 md:px-4 md:pt-5">
          {vc.choices.map((c, i) => {
            const on = i === open;
            return (
              <SpringPress
                key={c.id}
                as="button"
                onClick={() => setOpen(i)}
                aria-pressed={on}
                aria-label={`${c.text}, show who picked it`}
                className={cn(
                  "state-layer flex shrink-0 flex-col rounded-[var(--radius-md)] px-1 pb-2 pt-1.5",
                  RING
                )}
                style={{ width: PILE }}
              >
                <span className="flex flex-wrap-reverse content-start justify-center gap-1">
                  {c.voters.map((v) => (
                    <BirdAvatar key={v.person.id} user={v.person} size={24} />
                  ))}
                </span>
                <span
                  aria-hidden
                  className={cn("mt-2 block h-[2px] rounded-full", on ? "bg-cinnamon" : "bg-border")}
                />
                {/* Three lines, always the room for three, so every pile's
                    ground sits on one line whatever its label does. */}
                <span
                  className={cn(
                    "mt-2 line-clamp-3 h-[56px] break-words text-center text-[13.5px] font-medium leading-snug [overflow-wrap:anywhere]",
                    on ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {c.text}
                </span>
              </SpringPress>
            );
          })}
        </div>
      </div>
      <div className="px-4 pb-4 pt-1 md:px-5 md:pb-5">
        {chosen.voters.length === 0 ? (
          <p className="text-[13.5px] text-muted-foreground">Nobody picked {chosen.text}</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-3 gap-y-2">
              {chosen.voters.map((v) => (
                <li key={v.person.id} className="flex min-w-0 max-w-full items-center gap-1.5">
                  <BirdAvatar user={v.person} size={22} />
                  <span className="min-w-0 truncate text-[14px] text-foreground">{v.person.name}</span>
                </li>
              ))}
            </ul>
            <Lines voters={chosen.voters} className="mt-3" />
          </>
        )}
      </div>
    </article>
  );
}

/* ── 3. roll call ───────────────────────────────────────────────────── */

/* The approved tint trio (DESIGN-SYSTEM 2, rule 4), rotated so two choices
   side by side never share one. The leaf chip's text steps down to canopy
   to clear AA at 12.5px (rule 5). */
const TINTS = [
  "border-leaf/30 bg-leaf/[0.07] text-canopy",
  "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
  "border-sky/35 bg-sky/[0.10] text-sky",
];

/** Past this many rows the list folds, and says so. */
const FOLD_AT = 8;

function RollCall({ vc }: { vc: VoteCase }) {
  const [all, setAll] = useState(false);
  const rows = vc.choices.flatMap((c, i) => c.voters.map((v) => ({ ...v, choice: c, tint: TINTS[i % TINTS.length] })));
  const nobody = vc.choices.filter((c) => c.voters.length === 0).map((c) => c.text);
  const folds = rows.length > FOLD_AT + 2;
  const shown = all || !folds ? rows : rows.slice(0, FOLD_AT);

  return (
    <article className={cn(TILE, "px-4 py-2 md:px-5 md:py-3")}>
      <ul>
        {shown.map((r) => (
          <li key={r.person.id} className="flex min-w-0 items-start gap-3 py-2.5">
            <BirdAvatar user={r.person} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex min-h-8 min-w-0 items-center gap-2">
                <span className="descender-room min-w-0 truncate text-[15.5px] font-medium leading-none text-foreground">
                  {r.person.name}
                </span>
                <span
                  title={r.choice.text}
                  className={cn(
                    "ml-auto max-w-[55%] shrink-0 truncate rounded-full border px-2.5 py-1 text-[12.5px] font-semibold leading-none",
                    r.tint
                  )}
                >
                  {r.choice.text}
                </span>
              </div>
              {r.line && (
                <p className="mt-0.5 break-words text-[15px] leading-[1.55] text-foreground/85 [overflow-wrap:anywhere]">
                  {r.line}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {folds && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className={cn("mb-2 mt-1 rounded-sm text-[14px] font-medium text-canopy hover:underline active:opacity-70", RING)}
        >
          {all ? "Show fewer" : "Show everyone"}
        </button>
      )}
      {nobody.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-1.5 pb-2.5 pt-1 text-[13.5px] text-muted-foreground [overflow-wrap:anywhere]">
          <span>Nobody picked</span>
          <MetaDots parts={nobody} />
        </p>
      )}
    </article>
  );
}

export function VoteResult({ vc, kind }: { vc: VoteCase; kind: ResultKey }) {
  if (kind === "piles") return <Piles vc={vc} />;
  if (kind === "roll") return <RollCall vc={vc} />;
  return <Flocks vc={vc} />;
}
