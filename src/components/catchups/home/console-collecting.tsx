"use client";

/* ------------------------------------------------------------------ *
 *  <ConsoleCollecting> - the left console while a Round is collecting
 *  questions (spec 3.3 + 3.3.1).
 *
 *  Status card (Round number, countdown ring on questionsCloseAt,
 *  member roster) + the question-submission panel + the growing list
 *  of submitted questions ("in this Round" / "waiting for the Keeper").
 *  When nobody has asked anything yet, the submission panel becomes
 *  the hero (spec: "the submission panel is the hero with a 'Be the
 *  first to ask something' prompt").
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowUp, ArrowDown, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { FadeRise } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { curatePrompt, submitPrompt } from "@/app/(main)/catchups/actions";
import type { PromptCategory } from "@/lib/catchups-types";
import { LibraryPickerDialog } from "./library-picker-dialog";
import { MemberStrip } from "./member-strip";
import { ProgressRing } from "./progress-ring";
import {
  MAX_ACCEPTED_PROMPTS_PER_EDITION,
  MAX_PENDING_PROMPTS_PER_MEMBER,
  type CatchupHomeData,
  type HomeEditionView,
  type HomePromptView,
} from "./types";

export function ConsoleCollecting({
  data,
  edition,
  onChanged,
}: {
  data: CatchupHomeData;
  edition: HomeEditionView;
  onChanged: () => void;
}) {
  const { viewer, members } = data;
  const accepted = edition.prompts.filter((p) => p.accepted);
  const pending = edition.prompts.filter((p) => !p.accepted);
  const isEmpty = edition.prompts.length === 0;

  return (
    <div className="space-y-5">
      <FadeRise>
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">
              Round {edition.number} &middot; Collecting
            </p>
            <MemberStrip members={members} />
          </div>
          <div className="mt-4">
            <ProgressRing
              ratio={edition.ringRatio}
              label={edition.statusLabel}
              sublabel="Question window"
              tone="leaf"
            />
          </div>
        </div>
      </FadeRise>

      <SubmissionPanel
        editionId={edition.id}
        viewerName={viewer.name}
        promptLibrary={data.promptLibrary}
        hero={isEmpty}
        onSubmitted={onChanged}
      />

      {!isEmpty && (
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
  hero,
  onSubmitted,
}: {
  editionId: string;
  viewerName: string;
  promptLibrary: CatchupHomeData["promptLibrary"];
  hero: boolean;
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
      toast.error("Ask something for the group first.");
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
    toast.success(accepted ? "Added to the Round." : "Sent to the Keeper.");
    setText("");
    setCategory(null);
    setShowAsker(true);
    onSubmitted();
  }

  return (
    <FadeRise delay={hero ? 0 : 0.03}>
      <div
        className={cn(
          "card-elevated rounded-[var(--radius)] border border-border bg-card p-6",
          hero && "border-leaf/25"
        )}
      >
        {hero ? (
          <div className="mb-4 flex items-center gap-2 text-leaf">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-semibold">Be the first to ask something.</p>
          </div>
        ) : (
          <p className="font-heading text-[1.05rem] font-bold tracking-[-0.01em] text-foreground">
            Ask everyone something
          </p>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask everyone something..."
          rows={3}
          maxLength={300}
          className="mt-3 bg-background/60"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
                  "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs leading-snug text-muted-foreground">
            Up to {MAX_PENDING_PROMPTS_PER_MEMBER} questions waiting on the Keeper at a time.
          </p>
          <Button variant="primary" onClick={handleSubmit} disabled={busy || !text.trim()}>
            {busy ? "Asking..." : "Ask the group"}
          </Button>
        </div>
      </div>
    </FadeRise>
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
    <FadeRise delay={0.06}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
        {accepted.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              In this Round &middot; {accepted.length} of {MAX_ACCEPTED_PROMPTS_PER_EDITION}
            </p>
            <div ref={listRef} className="mt-3 space-y-2">
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
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={i === accepted.length - 1}
                          onClick={() => handleMove(i, 1)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          onClick={() => handleRemove(p.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
          <div className={cn(accepted.length > 0 && "mt-5 border-t border-border pt-5")}>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {isKeeper ? "Waiting for you to curate" : "Waiting for the Keeper"}
            </p>
            <div className="mt-3 space-y-2">
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
                          aria-label="Accept question"
                          onClick={() => handleAccept(p.id)}
                          className="rounded-md p-1.5 text-leaf transition-colors duration-150 hover:bg-leaf/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          onClick={() => handleRemove(p.id)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        Waiting for the Keeper
                      </span>
                    )
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
        "flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-3",
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
