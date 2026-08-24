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

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { EASE_SPRING } from "@/components/common/motion";
import { submitEntry } from "@/app/(main)/catchups/actions";
import { AnswerCard } from "./answer-card";
import { CompletionCard } from "./completion-card";
import { MobileProgressBar, ProgressRail } from "./progress-rail";
import { isMeaningfulEntry, type AnswerEntryDraft, type AnswerPromptData } from "./types";

/**
 * "failed" is the one that was missing (audit M11). A save that did not land
 * used to drop back to "idle", which renders nothing, so the only trace was a
 * toast that scrolls away -- and because "have they answered?" is derived from
 * the text on screen rather than from what reached the database, the prompt
 * still counted as answered: a tick on the progress rail, a place in "N of M
 * have written in", and the completion card congratulating somebody whose
 * answer was never saved.
 */
type SaveStatus = "idle" | "saving" | "saved" | "failed";

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

  /* Answered means SAVED, not typed (audit M11). The text stays on screen
     either way -- nobody's writing is ever thrown away over a network blip --
     but a prompt whose last save failed does not count towards the progress
     rail, the "N of M have written in" line, or the completion card. Only
     "failed" disqualifies: a save still in flight is optimistically counted,
     because it usually lands and because a tick that flickers off on every
     blur would be worse than one that is briefly generous. */
  const answeredIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of prompts) {
      if (isMeaningfulEntry(entries[p.id]) && saveStatus[p.id] !== "failed") s.add(p.id);
    }
    return s;
  }, [entries, prompts, saveStatus]);

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

  /* One queue per prompt, so this prompt's saves happen in the order they were
     made (audit Low 37). Blur, edit, blur again quickly and two saves used to
     race: whichever the server finished last won, which could be the OLDER
     body, landing on top of the newer one under a card that had just said
     "Saved". Chaining is enough here because the ordering only has to hold per
     prompt, and two prompts cannot overwrite each other. */
  const saveQueues = useRef<Record<string, Promise<void>>>({});

  /* The row version each answer was last seen at, sent with every save so
     this device cannot silently replace what another one wrote (audit C-125).
     A ref, not state: it changes on every save and nothing renders from it,
     and the queue above means the read and the write cannot interleave. */
  const versions = useRef<Record<string, string | null>>(
    Object.fromEntries(prompts.map((p) => [p.id, p.entryUpdatedAt]))
  );

  function persist(promptId: string, patch: { body?: string; images?: string[] }) {
    const run = async () => {
      setSaveStatus((s) => ({ ...s, [promptId]: "saving" }));
      // callAction: a rejected save (deploy skew, dropped network, expired
      // session) used to leave this prompt's status stuck on "saving" forever,
      // since neither branch below ever ran (audit B-042).
      const result = await callAction(() =>
        submitEntry({ promptId, ...patch, baseUpdatedAt: versions.current[promptId] ?? undefined })
      );
      if (result && "error" in result) {
        toast.error(result.error);
        // "failed", not "idle": idle renders nothing, and this prompt must
        // stop counting as answered until a save actually lands (audit M11).
        setSaveStatus((s) => ({ ...s, [promptId]: "failed" }));
        return;
      }
      // Hold the version this save produced; without it every save after the
      // first would look stale to the guard.
      versions.current[promptId] = "updatedAt" in result ? result.updatedAt : null;
      setSaveStatus((s) => ({ ...s, [promptId]: "saved" }));
    };
    const queued = (saveQueues.current[promptId] ?? Promise.resolve()).then(run, run);
    saveQueues.current[promptId] = queued;
    return queued;
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
              // rounded-full is load-bearing: the ring is a box-shadow drawn
              // on the avatar's border box, and the avatar root is not
              // itself rounded, so without it each bird sat in a square
              // card-coloured frame (owner, 2026-08-13: "white boxes around
              // the birds").
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                aria-label={p.name ?? "Member profile"}
                className="rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <BirdAvatar user={p} size={22} className="rounded-full ring-2 ring-card" />
              </Link>
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
