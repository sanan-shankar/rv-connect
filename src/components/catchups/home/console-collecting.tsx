"use client";

/* ------------------------------------------------------------------ *
 *  <ConsoleCollecting> - the console while a Round is collecting
 *  questions (spec 3.3 + 3.3.1).
 *
 *  Three things, in the order they matter: one plain line saying which
 *  window is open and how long is left, the box for writing a question,
 *  and the list of what the group has asked so far. The Keeper's one
 *  transition ("Open answering") sits with that list, because the list
 *  is what they are reading when they decide to use it.
 *
 *  No status tile, no countdown ring, no roster cluster and no separate
 *  controls box: all four were removed in the owner review of
 *  2026-07-25 as chrome that carried no information.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowUp, ArrowDown, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { FadeRise } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { curatePrompt, openAnswering, submitPrompt } from "@/app/(main)/catchups/actions";
import type { PromptCategory } from "@/lib/catchups-types";
import { LibraryPickerDialog } from "./library-picker-dialog";
import type { CatchupHomeData, HomeEditionView, HomePromptView } from "./types";

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
  const accepted = edition.prompts.filter((p) => p.accepted);
  const pending = edition.prompts.filter((p) => !p.accepted);

  return (
    <div className="space-y-[var(--space-m)]">
      <p className="text-sm font-medium text-muted-foreground">{edition.statusLabel}</p>

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
          pending={pending}
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
  /** True while the Round has nothing in it yet: the heading changes, the copy does not multiply. */
  firstAsk: boolean;
  onSubmitted: () => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<PromptCategory | null>(null);
  const [showAsker, setShowAsker] = useState(true);
  const [busy, setBusy] = useState(false);
  const firstName = viewerName.split(" ")[0] || viewerName;

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
    const result = await submitPrompt({ editionId, text: trimmed, category, showAsker });
    setBusy(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    const accepted = result && "accepted" in result && result.accepted;
    toast.success(accepted ? "Added to the round." : "Sent to the Keeper.");
    setText("");
    setCategory(null);
    setShowAsker(true);
    onSubmitted();
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
                  "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]",
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

/** The Keeper's one transition out of collecting, kept beside the questions. */
function OpenAnsweringButton({
  editionId,
  onChanged,
}: {
  editionId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const result = await openAnswering(editionId);
    setBusy(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Answering is open.");
    onChanged();
  }

  return (
    <Button variant="primary" size="sm" onClick={handleClick} disabled={busy}>
      {busy ? "Opening..." : "Open answering"}
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

function QuestionsList({
  editionId,
  accepted,
  pending,
  isKeeper,
  onChanged,
}: {
  editionId: string;
  accepted: HomePromptView[];
  pending: HomePromptView[];
  isKeeper: boolean;
  onChanged: () => void;
}) {
  const [listRef] = useAutoAnimate();

  async function handleAccept(promptId: string) {
    const result = await curatePrompt({ action: "accept", promptId });
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function handleRemove(promptId: string) {
    const result = await curatePrompt({ action: "remove", promptId });
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= accepted.length) return;
    const reordered = [...accepted];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const result = await curatePrompt({
      action: "reorder",
      editionId,
      orderedPromptIds: reordered.map((p) => p.id),
    });
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  return (
    <FadeRise delay={0.04}>
      <div className={TILE}>
        {accepted.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-s)]">
              <p className="text-sm font-semibold text-foreground">
                {accepted.length} {accepted.length === 1 ? "question" : "questions"} in this round
              </p>
              {isKeeper && <OpenAnsweringButton editionId={editionId} onChanged={onChanged} />}
            </div>
            <div ref={listRef} className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
              {accepted.map((p, i) => (
                <QuestionRow
                  key={p.id}
                  prompt={p}
                  actions={
                    isKeeper ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={i === 0}
                          onClick={() => handleMove(i, -1)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={i === accepted.length - 1}
                          onClick={() => handleMove(i, 1)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          onClick={() => handleRemove(p.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
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

        {pending.length > 0 && (
          <div
            className={cn(
              accepted.length > 0 && "mt-[var(--space-m)] border-t border-border pt-[var(--space-m)]"
            )}
          >
            {/* Says what the row's own state is. The Keeper's two buttons say
                what to do about it, so no second line repeats them. */}
            <p className="text-sm font-semibold text-foreground">Not in the round yet</p>
            <div className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
              {pending.map((p) => (
                <QuestionRow
                  key={p.id}
                  prompt={p}
                  muted
                  actions={
                    isKeeper ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="Add to the round"
                          onClick={() => handleAccept(p.id)}
                          className="rounded-md p-1.5 text-leaf transition-colors duration-150 hover:bg-leaf/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          onClick={() => handleRemove(p.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
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

function QuestionRow({
  prompt,
  actions,
  muted,
}: {
  prompt: HomePromptView;
  actions?: React.ReactNode;
  muted?: boolean;
}) {
  const askerLabel = prompt.isOwn
    ? prompt.showAsker
      ? "You"
      : "You (anonymous)"
    : prompt.author
      ? prompt.author.name
      : "Someone in the group";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-[var(--space-s)] rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-[var(--space-s)]",
        muted && "border-dashed"
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {prompt.author ? (
          <BirdAvatar user={prompt.author} size={28} />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            ?
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm leading-snug text-foreground">{prompt.text}</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{askerLabel}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}
