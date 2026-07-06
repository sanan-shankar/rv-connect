"use client";

/* ------------------------------------------------------------------ *
 *  <AnswerExperience> — the answering screen's shell (spec 3.4, BINDING
 *  shape): a sticky left progress rail + one-prompt-at-a-time main pane on
 *  desktop, a slim sticky progress bar + one-prompt-per-screen stack on
 *  mobile. Owns the per-prompt draft state and the autosave calls; each
 *  child component (AnswerCard / PhotoAttachments / SongAttachment) is
 *  either a dumb controlled view or (song) self-contained.
 *
 *  Motion: transform/opacity only, EASE_SPRING (no layout prop, no CSS
 *  gap animation, no hand-typed cubic-bezier), per the repo's known traps.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { EASE_SPRING, SpringPress } from "@/components/common/motion";
import { submitEntry } from "@/app/(main)/catchups/actions";
import { AnswerCard } from "./answer-card";
import { CompletionCard } from "./completion-card";
import { MobileProgressBar, ProgressRail } from "./progress-rail";
import { isMeaningfulEntry, type AnswerEntryDraft, type AnswerPromptData, type SongState } from "./types";

type SaveStatus = "idle" | "saving" | "saved";

export function AnswerExperience({
  catchupId,
  groupName,
  prompts,
  currentUser,
  othersAnsweredCount,
  clusterPeople,
}: {
  catchupId: string;
  groupName: string;
  prompts: AnswerPromptData[];
  currentUser: AvatarUser;
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

  function handleSongChange(promptId: string, song: SongState) {
    updateEntry(promptId, { song });
    setSaveStatus((s) => ({ ...s, [promptId]: "saved" }));
  }

  const hasAnsweredAny = answeredIds.size > 0;
  const upcoming = current ? prompts.slice(index + 1, index + 4) : [];

  return (
    <div>
      <p className="mb-[var(--space-l)] flex flex-wrap items-center gap-2 text-left text-sm text-muted-foreground">
        {hasAnsweredAny ? (
          <>
            {clusterPeople.length > 0 && (
              <span className="mr-0.5 flex -space-x-2">
                {clusterPeople.map((p) => (
                  <BirdAvatar key={p.id} user={p} size={22} className="ring-2 ring-card" />
                ))}
              </span>
            )}
            You have shared with {othersAnsweredCount} other{othersAnsweredCount === 1 ? "" : "s"} so far.
          </>
        ) : othersAnsweredCount > 0 ? (
          <>
            {othersAnsweredCount} {othersAnsweredCount === 1 ? "person has" : "people have"} already shared.
            Add your voice whenever you are ready.
          </>
        ) : (
          <>Be the first to share in this Round.</>
        )}
      </p>

      <div className="grid grid-cols-1 gap-[var(--space-xl)] lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <ProgressRail
            prompts={prompts}
            answeredIds={answeredIds}
            currentIndex={index}
            onJump={(i) => goTo(i, i > index ? 1 : -1)}
          />
        </aside>

        <div className="lg:hidden">
          <MobileProgressBar done={answeredIds.size} total={total} currentIndex={index} />
        </div>

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
                  currentUser={currentUser}
                  position={index + 1}
                  total={total}
                  isLast={index === total - 1}
                  saveStatus={saveStatus[current.id] ?? "idle"}
                  onBodyBlur={(body) => handleBodyBlur(current.id, body)}
                  onImagesChange={(images) => handleImagesChange(current.id, images)}
                  onSongChange={(song) => handleSongChange(current.id, song)}
                  onBack={() => goTo(index - 1, -1)}
                  onAdvance={() => goTo(index + 1, 1)}
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

          {/* quiet filmstrip of upcoming prompts (spec 3.4), desktop only */}
          {upcoming.length > 0 && (
            <div className="mt-[var(--space-l)] hidden gap-3 overflow-x-auto pb-1 sm:flex">
              {upcoming.map((p, offset) => (
                <SpringPress
                  key={p.id}
                  as="button"
                  onClick={() => goTo(index + 1 + offset, 1)}
                  whileTap={{ scale: 0.98 }}
                  className="line-clamp-3 w-52 shrink-0 rounded-[var(--radius-md)] border border-border/70 bg-card/70 p-3 text-left text-xs text-muted-foreground hover:border-leaf/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  {...({ type: "button" } as object)}
                >
                  {p.text}
                </SpringPress>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
