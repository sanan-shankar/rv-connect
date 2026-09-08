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
 *   - `photo`  -> a WALL. Everyone adds one picture, so the Edition prints
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
import { AnswerCard, type EditionEntry } from "@/components/catchups/edition/answer-card";
import { PhotoWall } from "@/components/catchups/edition/photo-wall";
import { promptKind, type CatchupPromptView } from "@/lib/catchups-types";

export function QuestionSection({
  id,
  index,
  prompt,
  entries,
}: {
  id: string;
  index: number;
  prompt: CatchupPromptView;
  entries: EditionEntry[];
}) {
  const kind = promptKind(prompt.category);
  const isWall = kind === "photo";
  const wallEntries = isWall ? entries.filter((e) => e.images.length === 1) : [];
  const cardEntries = isWall ? entries.filter((e) => e.images.length !== 1) : entries;

  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-[11px] font-bold tracking-[0.1em] text-leaf">Q{index + 1}</p>
      <h2 className="mt-[var(--space-xxs)] break-words font-heading text-[1.5rem] leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[1.7rem]">
        {prompt.text}
      </h2>
      {prompt.asker && (
        <IdentityRow
          user={prompt.asker}
          avatarSize="xs"
          avatarHref={`/profile/${prompt.asker.id}`}
          className="mt-[var(--space-s)]"
          name={
            /* An asker on a question marked anonymous can only be the ASKER
               themselves looking at it: `askerVisible` reveals a hidden name
               to nobody else. So it reads "you", and it says the word,
               because this is the page the whole group reads -- your own name
               under a question you asked anonymously, with nothing to explain
               it, reads exactly like the anonymity having failed (M10). */
            !prompt.showAsker ? (
              <span className="text-[13px] text-muted-foreground">
                asked by you, anonymously
              </span>
            ) : (
              <span className="text-[13px] text-muted-foreground">
                asked by{" "}
                <Link
                  href={`/profile/${prompt.asker.id}`}
                  className="rounded-sm transition-colors duration-150 hover:text-foreground hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {prompt.asker.name}
                </Link>
              </span>
            )
          }
        />
      )}

      {/* Nobody's name, but the fact of the choice. A question with no
          attribution at all left the reader to guess whether the asker was
          hidden or simply gone; this is the cue the finding asked for. */}
      {!prompt.showAsker && !prompt.asker && (
        <p className="mt-[var(--space-s)] text-[13px] text-muted-foreground">asked anonymously</p>
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
