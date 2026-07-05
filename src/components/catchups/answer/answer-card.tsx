"use client";

/* ------------------------------------------------------------------ *
 *  <AnswerCard> — one prompt, spec 3.4: editorial heading (+ "asked by"),
 *  a generous ruled-sheet textarea autosaving on blur, photo + song
 *  attachments, a "Saved" indicator, and the per-card advance control that
 *  reads "Skip for now" until there is something to share. Every field is
 *  optional; nothing here can block moving on.
 *
 *  Remounts fresh on every prompt change (the parent keys its wrapper on
 *  `prompt.id`), so local text state always starts from that prompt's own
 *  saved draft with no reset effects needed.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { Button } from "@/components/ui/button";
import { PhotoAttachments } from "./photo-attachments";
import { SongAttachment } from "./song-attachment";
import type { AnswerEntryDraft, AnswerPromptData, SongState } from "./types";

// A quiet ruled-sheet texture behind the textarea (spec 3.4: "warm Paper,
// ruled-sheet lines behind the text area"). Decorative only; line spacing is
// generous enough that wrapped text never fights the rule.
const RULED_SHEET_BG =
  "repeating-linear-gradient(180deg, transparent 0 31px, color-mix(in srgb, var(--color-ink) 6%, transparent) 31px 32px)";

export function AnswerCard({
  prompt,
  entry,
  currentUser,
  position,
  total,
  isLast,
  saveStatus,
  onBodyBlur,
  onImagesChange,
  onSongChange,
  onBack,
  onAdvance,
}: {
  prompt: AnswerPromptData;
  entry: AnswerEntryDraft;
  currentUser: AvatarUser;
  position: number;
  total: number;
  isLast: boolean;
  saveStatus: "idle" | "saving" | "saved";
  onBodyBlur: (body: string) => void;
  onImagesChange: (images: string[]) => void;
  onSongChange: (song: SongState) => void;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const [body, setBody] = useState(entry.body);
  const savedRef = useRef(entry.body);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 168)}px`;
  }

  function flushBody() {
    if (body.trim() === savedRef.current.trim()) return;
    savedRef.current = body;
    onBodyBlur(body);
  }

  const hasContent = Boolean(body.trim() || entry.images.length || entry.song);
  const advanceLabel = isLast
    ? hasContent
      ? "Finish"
      : "Skip and finish"
    : hasContent
      ? "Next"
      : "Skip for now";

  return (
    <div className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-6 sm:p-8">
      {/* the member's own bird, perched in the corner (spec 3.4 intimacy detail) */}
      <div className="pointer-events-none absolute right-4 top-4 rotate-[6deg] opacity-90">
        <BirdAvatar user={currentUser} size={36} />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">
        Question {position} of {total}
      </p>

      <h2 className="mt-[var(--space-xs)] max-w-lg font-heading text-[1.4rem] font-bold leading-[1.25] tracking-[-0.02em] text-foreground sm:text-[1.65rem]">
        {prompt.text}
      </h2>

      {prompt.asker && (
        <div className="mt-[var(--space-s)] flex items-center gap-2">
          <BirdAvatar user={prompt.asker} size={22} />
          <span className="text-xs font-medium text-muted-foreground">asked by {prompt.asker.name}</span>
        </div>
      )}

      <div className="mt-[var(--space-l)] overflow-hidden rounded-[var(--radius-md)] border border-border/70">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            requestAnimationFrame(autoGrow);
          }}
          onBlur={flushBody}
          placeholder="Take your time..."
          className="block w-full resize-none bg-card px-4 py-4 text-[15.5px] leading-[32px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ backgroundImage: RULED_SHEET_BG, minHeight: 168 }}
        />
      </div>

      <div className="mt-[var(--space-l)] space-y-[var(--space-m)]">
        <PhotoAttachments images={entry.images} onChange={onImagesChange} />
        <SongAttachment promptId={prompt.id} song={entry.song} onChange={onSongChange} />
      </div>

      <div className="mt-[var(--space-l)] flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-[var(--space-m)]">
        <div className="flex items-center gap-3">
          {position > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          {saveStatus !== "idle" && (
            <span className="text-xs font-medium text-muted-foreground">
              {saveStatus === "saving" ? "Saving..." : "Saved"}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant={hasContent ? "primary" : "outline"}
          onClick={() => {
            flushBody();
            onAdvance();
          }}
        >
          {advanceLabel}
        </Button>
      </div>
    </div>
  );
}
