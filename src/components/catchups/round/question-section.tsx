/* ------------------------------------------------------------------ *
 *  <QuestionSection> - one section per question (spec 3.6, BINDING).
 *
 *  The question is an editorial header and, when the prompt shows its
 *  asker, carries a small "asked by {name}" line. It used to hang into the
 *  outer margin (`lg:-ml-6 xl:-ml-10`), which at xl ate the whole page
 *  gutter and pushed the heading up against the sidebar; that indent is
 *  gone (owner review 2026-07-25).
 *
 *  How the answers print is driven by `promptKind(prompt.category)`:
 *   - `photo`  -> a WALL. Everyone adds one picture, so the Round prints
 *     the pictures as one grid (fix brief section 4), not as N elevated
 *     cards each wrapping a single letterboxed image.
 *   - `songs` / `text` -> the answer-card stack.
 *  An entry that does not fit the wall (no picture, or a legacy row with
 *  several) falls back to a normal card so nothing is ever dropped.
 *
 *  An unanswered question still gets its section with a "No one took this
 *  one" line (never hidden - the app's "everyone is still here" ethos,
 *  spec 3.6 empty state).
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { IdentityRow } from "@/components/common/identity-row";
import { AnswerCard, type RoundEntry } from "@/components/catchups/round/answer-card";
import { EntryLoveButton } from "@/components/catchups/round/entry-love-button";
import { promptKind, type CatchupPromptView } from "@/lib/catchups-types";

function PhotoWall({ entries }: { entries: RoundEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-[var(--space-m)] sm:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.id} id={`entry-${entry.id}`} className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.images[0]}
            alt={`Added by ${entry.author.name}`}
            loading="lazy"
            className="aspect-square w-full rounded-[var(--radius-md)] border border-border object-cover"
          />
          {entry.body?.trim() && (
            <p className="mt-[var(--space-xs)] whitespace-pre-wrap text-[13.5px] leading-[1.55] text-foreground">
              {entry.body}
            </p>
          )}
          <div className="mt-[var(--space-xs)] flex items-center justify-between gap-1">
            <Link
              href={`/profile/${entry.author.id}`}
              className="min-w-0 truncate rounded-md text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
            >
              {entry.author.name}
            </Link>
            {/* Cancels the LoveButton's own px-2.5 so the heart sits flush
                with the picture's right edge. */}
            <div className="-mr-2.5 shrink-0">
              <EntryLoveButton
                entryId={entry.id}
                initialLoved={entry.lovedByViewer}
                initialCount={entry.loveCount}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function QuestionSection({
  id,
  index,
  prompt,
  entries,
}: {
  id: string;
  index: number;
  prompt: CatchupPromptView;
  entries: RoundEntry[];
}) {
  const kind = promptKind(prompt.category);
  const isWall = kind === "photo";
  const wallEntries = isWall ? entries.filter((e) => e.images.length === 1) : [];
  const cardEntries = isWall ? entries.filter((e) => e.images.length !== 1) : entries;

  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-[11px] font-bold tracking-[0.1em] text-leaf">Q{index + 1}</p>
      <h2 className="mt-[var(--space-xxs)] font-heading text-[1.5rem] leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[1.7rem]">
        {prompt.text}
      </h2>
      {prompt.asker && (
        <IdentityRow
          user={prompt.asker}
          avatarSize="xs"
          className="mt-[var(--space-s)]"
          name={<span className="text-[13px] text-muted-foreground">asked by {prompt.asker.name}</span>}
        />
      )}

      <div className="mt-[var(--space-l)] flex flex-col gap-[var(--space-l)]">
        {entries.length === 0 ? (
          // Plain line, no dashed box: it was the page's only dashed rule and
          // it framed four words (owner review 2026-07-25).
          <p className="text-sm italic text-muted-foreground">No one took this one.</p>
        ) : (
          <>
            {wallEntries.length > 0 && <PhotoWall entries={wallEntries} />}
            {cardEntries.map((entry) => (
              <AnswerCard key={entry.id} entry={entry} kind={kind} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
