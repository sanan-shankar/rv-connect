/* ------------------------------------------------------------------ *
 *  <QuestionSection> - one section per question (spec 3.6, BINDING).
 *
 *  The question is an editorial header offset toward the outer margin
 *  (a negative indent on large screens, so it visually "hangs" left of the
 *  answer-card stack rather than sitting dead-centre above it) and, when
 *  the prompt shows its asker, carries a small "asked by {name}" line.
 *
 *  An unanswered question still gets its section with a soft "No one took
 *  this one" line (never hidden - the app's "everyone is still here" ethos,
 *  spec 3.6 empty state).
 * ------------------------------------------------------------------ */

import { IdentityRow } from "@/components/common/identity-row";
import { AnswerCard, type RoundEntry } from "@/components/catchups/round/answer-card";
import type { CatchupPromptView } from "@/lib/catchups-types";

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
  return (
    <section id={id} className="scroll-mt-24">
      <div className="lg:-ml-6 xl:-ml-10">
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
      </div>

      <div className="mt-[var(--space-l)] flex flex-col gap-[var(--space-l)]">
        {entries.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border/80 bg-card/40 px-[var(--space-m)] py-[var(--space-s)] text-sm italic text-muted-foreground">
            No one took this one.
          </p>
        ) : (
          entries.map((entry, i) => <AnswerCard key={entry.id} entry={entry} index={i} />)
        )}
      </div>
    </section>
  );
}
