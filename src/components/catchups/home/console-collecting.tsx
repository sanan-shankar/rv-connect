"use client";

/* ------------------------------------------------------------------ *
 *  <ConsoleCollecting> - the console while an Edition is collecting
 *  questions (spec 3.3 + 3.3.1).
 *
 *  Two things, in the order they matter: the box for writing a question
 *  and the list of what the group has asked so far. The live countdown is
 *  carried beside the Catch-up name in the page heading.
 *
 *  No status tile, no countdown ring, no roster cluster and no separate
 *  controls box: all four were removed in the owner review of
 *  2026-07-25 as chrome that carried no information.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowUp, ArrowDown, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FadeRise } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { curatePrompt, openAnswering, submitPrompt } from "@/app/(main)/catchups/actions";
import type { PromptCategory } from "@/lib/catchups-types";
import { LibraryPickerDialog } from "./library-picker-dialog";
import type { CatchupHomeData, HomeEditionView, HomePromptView } from "./types";
import { QuestionRow } from "./question-row";

/** One tile shape for this screen: symmetric padding on all four sides,
 *  one LiftKit token (owner review 2026-07-25), matching the feed's cards. */
const TILE = "card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]";

export function ConsoleCollecting({
  data,
  edition,
  onChanged,
}: {
  data: CatchupHomeData;
  edition: HomeEditionView;
  onChanged: () => void;
}) {
  const { viewer } = data;
  // Every question is in the Edition the moment it is asked (2026-08-05), so
  // there is one list, not an accepted one and a queue behind it.
  const accepted = edition.prompts.filter((p) => p.accepted);

  return (
    <div className="space-y-[var(--space-m)]">
      <SubmissionPanel
        editionId={edition.id}
        viewerName={viewer.name}
        promptLibrary={data.promptLibrary}
        firstAsk={edition.prompts.length === 0}
        onSubmitted={onChanged}
      />

      {edition.prompts.length > 0 && (
        <QuestionsList
          editionId={edition.id}
          accepted={accepted}
          isKeeper={viewer.isKeeper}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function SubmissionPanel({
  editionId,
  viewerName,
  promptLibrary,
  firstAsk,
  onSubmitted,
}: {
  editionId: string;
  viewerName: string;
  promptLibrary: CatchupHomeData["promptLibrary"];
  /** True while the Edition has nothing in it yet: the heading changes, the copy does not multiply. */
  firstAsk: boolean;
  onSubmitted: () => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<PromptCategory | null>(null);
  const [showAsker, setShowAsker] = useState(true);
  const [busy, setBusy] = useState(false);
  const firstName = viewerName.split(" ")[0] || viewerName;
  // The unconfirmed-email refusal opens the one shared confirm-email card,
  // same as posting and commenting, instead of a toast reciting the rule.
  const emailGate = useEmailGate();

  function handlePick(pickedText: string, pickedCategory: string) {
    setText(pickedText);
    setCategory(pickedCategory as PromptCategory);
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Write a question first.");
      return;
    }
    setBusy(true);
    try {
      const result = await callAction(() =>
        submitPrompt({ editionId, text: trimmed, category, showAsker })
      );
      if (result && "error" in result) {
        if (!emailGate.handled(result.error)) toast.error(result.error);
        return;
      }
      // Always "added": since 2026-08-05 nothing waits on a Keeper.
      toast.success("Added to the Edition.");
      setText("");
      setCategory(null);
      setShowAsker(true);
      onSubmitted();
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // "Ask the group" disabled for the rest of the session (audit B-042).
      setBusy(false);
    }
  }

  return (
    <FadeRise>
      <div className={cn(TILE, firstAsk && "border-leaf/30")}>
        <p className="font-heading text-[1.05rem] font-bold tracking-[-0.01em] text-foreground">
          {firstAsk ? "Be the first to ask something" : "Ask everyone something"}
        </p>

        {/* Auto-growing: `field-sizing-content` on the shared Textarea sizes it
            to what has been typed; min/max keep it a real writing surface
            without ever running away down the page. */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Your question for the group"
          maxLength={300}
          className="mt-[var(--space-s)] max-h-64 min-h-[6.5rem] bg-background/60"
        />

        <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-[var(--space-s)]">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background/60 p-1">
            {[
              { value: true, label: `Ask as ${firstName}` },
              { value: false, label: "Ask anonymously" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                aria-pressed={showAsker === opt.value}
                onClick={() => setShowAsker(opt.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  showAsker === opt.value
                    ? "bg-canopy text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <LibraryPickerDialog sets={promptLibrary} onPick={handlePick} />

          <Button
            variant="primary"
            className="ml-auto"
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
          >
            {busy ? "Asking..." : "Ask the group"}
          </Button>
        </div>
      </div>
    </FadeRise>
  );
}

/** The Keeper's one transition out of collecting, rendered in the right rail. */
export function OpenAnsweringButton({
  editionId,
  onChanged,
}: {
  editionId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const result = await callAction(() => openAnswering(editionId));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Answering is open.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="primary"
      size="sm"
      className="w-full justify-center"
      onClick={handleClick}
      disabled={busy}
    >
      {busy ? "Opening..." : "Open answering"}
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

function QuestionsList({
  editionId,
  accepted,
  isKeeper,
  onChanged,
}: {
  editionId: string;
  accepted: HomePromptView[];
  isKeeper: boolean;
  onChanged: () => void;
}) {
  const [listRef] = useAutoAnimate();

  /* The list the Keeper is looking at, which is not the same thing as the list
     the server last sent (audit M67).
     
     Both handlers used to compute from the `accepted` PROP, and `onChanged` is
     `router.refresh()` -- fire-and-forget, landing whenever the round trip
     lands. So a Keeper moving a question up twice in quick succession had the
     second click read the pre-first-click order and send it: the first move was
     silently undone, with no error and nothing on screen to say so. Removing
     two questions quickly had the same shape.
     
     Holding the order locally makes the row move the instant it is clicked and
     makes every later action compute from what is actually on screen. */
  const [order, setOrder] = useState(accepted);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  /* Props win, but only when they really changed. `accepted` is a fresh array
     on every parent render, so syncing on identity alone would throw away an
     optimistic move a fraction of a second after it was made and flick the row
     back. Comparing the id sequence is the honest test of "the server has a
     different list now". */
  const syncedRef = useRef(accepted.map((p) => p.id).join(","));
  useEffect(() => {
    const key = accepted.map((p) => p.id).join(",");
    if (key === syncedRef.current) return;
    syncedRef.current = key;
    setOrder(accepted);
  }, [accepted]);

  /** One action at a time, and the optimistic list reverted if it fails. */
  async function curate(next: HomePromptView[], run: () => Promise<unknown>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const before = order;
    setOrder(next);
    try {
      const result = await callAction(run as () => Promise<{ error?: string }>);
      if (result && "error" in result && result.error) {
        setOrder(before);
        toast.error(result.error);
        return;
      }
      syncedRef.current = next.map((p) => p.id).join(",");
      onChanged();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleRemove(promptId: string) {
    await curate(
      order.filter((p) => p.id !== promptId),
      () => curatePrompt({ action: "remove", promptId })
    );
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const reordered = [...order];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await curate(reordered, () =>
      curatePrompt({
        action: "reorder",
        editionId,
        orderedPromptIds: reordered.map((p) => p.id),
      })
    );
  }

  return (
    <FadeRise delay={0.04}>
      <div className={TILE}>
        {order.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground">
              {order.length} {order.length === 1 ? "question" : "questions"} in this Edition
            </p>
            <div ref={listRef} className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
              {order.map((p, i) => (
                <QuestionRow
                  key={p.id}
                  prompt={p}
                  actions={
                    isKeeper ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={busy || i === 0}
                          onClick={() => handleMove(i, -1)}
                          // state-layer carries the background half of the
                          // hover; bg-accent was only +2.06 dL* over this tile,
                          // at the just-noticeable threshold. transition-colors
                          // stays for the text colour, which still animates.
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 state-layer hover:text-foreground active:scale-95 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={busy || i === order.length - 1}
                          onClick={() => handleMove(i, 1)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 state-layer hover:text-foreground active:scale-95 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          disabled={busy}
                          onClick={() => handleRemove(p.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </FadeRise>
  );
}

