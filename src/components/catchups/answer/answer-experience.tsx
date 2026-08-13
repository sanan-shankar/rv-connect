"use client";

/* ------------------------------------------------------------------ *
 *  <AnswerExperience> — the answering screen's shell: a sticky left
 *  progress rail + one question at a time on desktop, a slim sticky bar +
 *  one question per screen on mobile. Owns the per-prompt draft state and
 *  the autosave calls; each child (AnswerCard, and through it
 *  PhotoAttachments / SongNameField) is a dumb controlled view.
 *
 *  Motion: transform/opacity only, EASE_SPRING (no layout prop, no CSS
 *  gap animation, no hand-typed cubic-bezier), per the repo's known traps.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { EASE_SPRING } from "@/components/common/motion";
import { submitEntry } from "@/app/(main)/catchups/actions";
import { AnswerCard } from "./answer-card";
import { CompletionCard } from "./completion-card";
import { MobileProgressBar, ProgressRail } from "./progress-rail";
import { isMeaningfulEntry, type AnswerEntryDraft, type AnswerPromptData } from "./types";

type SaveStatus = "idle" | "saving" | "saved";

export function AnswerExperience({
  catchupId,
  groupName,
  prompts,
  othersAnsweredCount,
  clusterPeople,
}: {
  catchupId: string;
  groupName: string;
  prompts: AnswerPromptData[];
  othersAnsweredCount: number;
  clusterPeople: AvatarUser[];
}) {
  const [entries, setEntries] = useState<Record<string, AnswerEntryDraft>>(() =>
    Object.fromEntries(prompts.map((p) => [p.id, p.entry]))
  );
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const total = prompts.length;
  const current = index < total ? prompts[index] : null;

  const answeredIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of prompts) if (isMeaningfulEntry(entries[p.id])) s.add(p.id);
    return s;
  }, [entries, prompts]);

  function goTo(next: number, dir: number) {
    setDirection(dir);
    setIndex(Math.max(0, Math.min(total, next)));
  }

  /**
   * The Next/Share/Skip advance. Linear until the LAST prompt; leaving that
   * one sweeps back to the first prompt still unanswered instead of the
   * completion card, because people answer out of order (owner, 2026-08-13:
   * finishing question three of four jumped him to "back to the Catch-up"
   * with question one still blank). Only when nothing is left does the
   * completion card show — which is also what the spec always said
   * ("a soft completion moment when the last prompt is answered").
   *
   * The current prompt is excluded from the sweep rather than trusted:
   * its just-flushed body reaches this component's state one render late,
   * so answeredIds cannot say yet whether it was answered or skipped —
   * and either way, forward is the honest direction for it.
   */
  function advance() {
    if (index === total - 1) {
      const firstUnanswered = prompts.findIndex(
        (p, i) => i !== index && !answeredIds.has(p.id)
      );
      if (firstUnanswered !== -1) {
        goTo(firstUnanswered, -1);
        return;
      }
    }
    goTo(index + 1, 1);
  }

  function updateEntry(promptId: string, patch: Partial<AnswerEntryDraft>) {
    setEntries((prev) => ({ ...prev, [promptId]: { ...prev[promptId], ...patch } }));
  }

  async function persist(promptId: string, patch: { body?: string; images?: string[] }) {
    setSaveStatus((s) => ({ ...s, [promptId]: "saving" }));
    const result = await submitEntry({ promptId, ...patch });
    if (result && "error" in result) {
      toast.error(result.error);
      setSaveStatus((s) => ({ ...s, [promptId]: "idle" }));
      return;
    }
    setSaveStatus((s) => ({ ...s, [promptId]: "saved" }));
  }

  function handleBodyBlur(promptId: string, body: string) {
    updateEntry(promptId, { body });
    void persist(promptId, { body });
  }

  function handleImagesChange(promptId: string, images: string[]) {
    updateEntry(promptId, { images });
    void persist(promptId, { images });
  }

  const hasAnsweredAny = answeredIds.size > 0;

  return (
    <div>
      <p className="mb-[var(--space-l)] flex flex-wrap items-center gap-2 text-left text-sm text-muted-foreground">
        {othersAnsweredCount > 0 && clusterPeople.length > 0 && (
          <span className="mr-0.5 flex -space-x-2">
            {clusterPeople.map((p) => (
              <BirdAvatar key={p.id} user={p} size={22} className="ring-2 ring-card" />
            ))}
          </span>
        )}
        {othersAnsweredCount === 0
          ? hasAnsweredAny
            ? "You are the first to answer."
            : "Nobody has answered yet."
          : hasAnsweredAny
            ? `You and ${othersAnsweredCount} other${othersAnsweredCount === 1 ? "" : "s"} have answered so far.`
            : `${othersAnsweredCount} ${othersAnsweredCount === 1 ? "person has" : "people have"} answered so far.`}
      </p>

      {/* Unwrapped, outside the grid, on purpose: a sticky box cannot leave
          its parent, so inside the grid (or inside a wrapper of its own
          height) it would never actually stick. Here its parent is the whole
          experience and it rides the scroll. */}
      <MobileProgressBar
        prompts={prompts}
        answeredIds={answeredIds}
        currentIndex={index}
        onJump={(i) => goTo(i, i > index ? 1 : -1)}
        className="mb-[var(--space-m)] lg:hidden"
      />

      <div className="grid grid-cols-1 gap-[var(--space-xl)] lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <ProgressRail
            prompts={prompts}
            answeredIds={answeredIds}
            currentIndex={index}
            onJump={(i) => goTo(i, i > index ? 1 : -1)}
          />
        </aside>

        <div className="min-w-0">
          <AnimatePresence mode="wait" custom={direction}>
            {current ? (
              <motion.div
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
                transition={{ duration: 0.3, ease: EASE_SPRING }}
              >
                <AnswerCard
                  prompt={current}
                  entry={entries[current.id]}
                  position={index + 1}
                  isLast={index === total - 1}
                  saveStatus={saveStatus[current.id] ?? "idle"}
                  onBodyBlur={(body) => handleBodyBlur(current.id, body)}
                  onImagesChange={(images) => handleImagesChange(current.id, images)}
                  onBack={() => goTo(index - 1, -1)}
                  onAdvance={advance}
                />
              </motion.div>
            ) : (
              <motion.div
                key="completion"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: EASE_SPRING }}
              >
                <CompletionCard catchupId={catchupId} groupName={groupName} answeredCount={answeredIds.size} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
