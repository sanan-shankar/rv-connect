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
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { cn } from "@/lib/utils";
import { EASE_SPRING } from "@/components/common/motion";
import { submitEntry } from "@/app/(main)/catchups/actions";
import type { StoredRecording } from "@/lib/voice-upload-client";
import { AnswerCard } from "./answer-card";
import { CompletionCard } from "./completion-card";
import { nextIndex, saveLanded, type SaveStatus } from "./answer-flow";
import { isMeaningfulEntry, type AnswerEntryDraft, type AnswerPromptData } from "./types";

/* "failed" is the status that was missing (audit M11). A save that did not
   land used to drop back to "idle", which renders nothing, so the only trace
   was a toast that scrolls away -- and because "have they answered?" is
   derived from the text on screen rather than from what reached the
   database, the prompt still counted as answered: a tick on the progress
   rail, a place in "N of M have written in", and the completion card
   congratulating somebody whose answer was never saved. "refused" is its
   other half (bug audit 3, T3-04): a no from the server that sending again
   cannot change. Both are in answer-flow.ts. */

/** What one save sends, beside the question it is for. */
type EntryPatch = { body?: string; images?: string[]; audio?: StoredRecording | null };

/* The "N people have answered so far" line and its row of birds are GONE
   from this surface. Answering is now a region on the Catch-up's own home
   (architecture.md section 5), where the head, the people door and the state
   line already say who is here and where the cycle is; the same fact stated a
   third time, above the box you are writing in, is the app narrating itself.
   Who has written is read from the roster behind the People door. */
export function AnswerExperience({
  groupName,
  prompts,
}: {
  groupName: string;
  prompts: AnswerPromptData[];
}) {
  const [entries, setEntries] = useState<Record<string, AnswerEntryDraft>>(() =>
    Object.fromEntries(prompts.map((p) => [p.id, p.entry]))
  );
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  /** The server's own sentence for a refused save, which is the line under
   *  the box: it says what to do, and a toast scrolls away. */
  const [refusal, setRefusal] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  /** Whether Share has already swept back to a blank question once (T3-18). */
  const [swept, setSwept] = useState(false);

  const total = prompts.length;
  const current = index < total ? prompts[index] : null;

  /* Answered means SAVED, not typed (audit M11). The text stays on screen
     either way -- nobody's writing is ever thrown away over a network blip --
     but a prompt whose last save did not land does not count towards the
     progress rail, the "N of M have written in" line, or the completion card.
     A save still in flight is optimistically counted (`saveLanded`). */
  const answeredIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of prompts) {
      if (isMeaningfulEntry(entries[p.id]) && saveLanded(saveStatus[p.id])) s.add(p.id);
    }
    return s;
  }, [entries, prompts, saveStatus]);

  function goTo(next: number, dir: number) {
    setDirection(dir);
    setIndex(Math.max(0, Math.min(total, next)));
  }

  /** The Next/Share advance: forward, and from the last question to the
   *  completion card, sweeping back to a blank question once on the way
   *  (`nextIndex`, which says why once and not every time). */
  function advance() {
    const next = nextIndex(index, total, prompts.map((p) => answeredIds.has(p.id)), swept);
    setSwept(next.swept);
    goTo(next.index, next.index > index ? 1 : -1);
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

  /* What a failed save was carrying, per prompt, so the retry sends it again
     along with whatever is new (bug audit 3, T3-04). The retry is a blur or a
     Next, which send the words; without this, a photograph or a recording
     whose save failed would never be re-sent, and a retry that landed only
     the words would say "Saved" over a photograph that never arrived. Read
     and cleared inside the queued run, so it sees every failure queued
     before it. */
  const unsent = useRef<Record<string, EntryPatch>>({});

  function persist(promptId: string, patch: EntryPatch) {
    const run = async () => {
      const send = { ...unsent.current[promptId], ...patch };
      delete unsent.current[promptId];
      setSaveStatus((s) => ({ ...s, [promptId]: "saving" }));
      // callAction: a rejected save (deploy skew, dropped network, expired
      // session) used to leave this prompt's status stuck on "saving" forever,
      // since neither branch below ever ran (audit B-042).
      const result = await callAction(() =>
        submitEntry({ promptId, ...send, baseUpdatedAt: versions.current[promptId] ?? undefined })
      );
      if (result && "error" in result) {
        toast.error(result.error);
        /* Not "idle": idle renders nothing, and this prompt must stop
           counting as answered until a save actually lands (audit M11).
           `final` is the server's word that the same save would be refused
           again (closed, stale, over the cap); anything else, a call that
           never landed included, is worth sending again. */
        const final = "final" in result && result.final === true;
        if (final) setRefusal((r) => ({ ...r, [promptId]: result.error }));
        else unsent.current[promptId] = send;
        setSaveStatus((s) => ({ ...s, [promptId]: final ? "refused" : "failed" }));
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

  /* The recording, once it is really in the bucket (or null when it is taken
     off). The words it was written down from are saved by the body path, on
     its own queue entry, so a failure of one never silently drops the other. */
  function handleAudioChange(promptId: string, audio: StoredRecording | null) {
    updateEntry(promptId, { audio });
    void persist(promptId, { audio });
  }

  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
      {/* THE MARKS ARE THE NAVIGATOR, and they are inside the card with the
          question rather than in a 272px rail beside it. They were a
          read-only progress bar and he could not get past them: "I can't
          really navigate between questions while answering them." So every
          mark is a button to its own question, the one you are on is wide,
          and the ones you have answered are filled.

          No "4 of 11" anywhere near them: "How does it matter whether it's 15
          or 16?"

          Tighter, top and bottom, at his word: "the padding above and below
          the orange progress bar while answering is too big. too much space
          above and too much below. seems imbalanced." */}
      <ol
        className="-mt-1 mb-2.5 flex flex-wrap items-center gap-1.5"
        aria-label="The questions in this Edition"
      >
        {prompts.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => goTo(i, i > index ? 1 : -1)}
              aria-label={p.text}
              aria-current={i === index ? "step" : undefined}
              title={p.text}
              className="group grid h-3.5 place-items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  /* The two properties by name rather than `transition-all`,
                     which the design system bans outright: a mark changes
                     WIDTH when it becomes the one you are on, and colour when
                     its question gets an answer. */
                  "block h-[3px] rounded-full transition-[width,background-color] duration-300 ease-out",
                  i === index
                    ? "w-7 bg-cinnamon"
                    : answeredIds.has(p.id)
                      ? "w-3 bg-cinnamon/45 group-hover:bg-cinnamon/70"
                      : "w-3 bg-border group-hover:bg-muted-foreground/50",
                )}
              />
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" custom={direction}>
            {current ? (
              <m.div
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
                  refusal={refusal[current.id]}
                  onBodyBlur={(body) => handleBodyBlur(current.id, body)}
                  onImagesChange={(images) => handleImagesChange(current.id, images)}
                  onAudioChange={(audio) => handleAudioChange(current.id, audio)}
                  onBack={() => goTo(index - 1, -1)}
                  onAdvance={advance}
                />
              </m.div>
            ) : (
              <m.div
                key="completion"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: EASE_SPRING }}
              >
                <CompletionCard
                  groupName={groupName}
                  answeredCount={answeredIds.size}
                  onBack={() => goTo(0, -1)}
                />
              </m.div>
            )}
      </AnimatePresence>
    </div>
  );
}
