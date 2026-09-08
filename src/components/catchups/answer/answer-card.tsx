"use client";

/* ------------------------------------------------------------------ *
 *  <AnswerCard> — one question and the control that answers it.
 *
 *  Which control appears is `prompt.kind`:
 *    text   -> the writing surface (photos may ride along, up to three)
 *    photo  -> exactly one picture, no writing surface
 *    songs  -> the song name field
 *
 *  Everything autosaves on blur; every field is optional and nothing here
 *  can block moving on. The count of where you are in the Edition lives in
 *  the progress rail, once, and is deliberately not repeated on the card.
 *
 *  Remounts fresh on every prompt change (the parent keys its wrapper on
 *  `prompt.id`), so local text state always starts from that prompt's own
 *  saved draft with no reset effects needed.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { FIELD_FOCUS_WITHIN } from "@/components/ui/field-focus";
import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RichTextArea } from "@/components/common/rich-text-area";
import { PhotoAttachments } from "./photo-attachments";
import { SongNameField } from "./song-attachment";
import type { AnswerEntryDraft, AnswerPromptData } from "./types";

const MIN_TEXTAREA_HEIGHT = 168;

export function AnswerCard({
  prompt,
  entry,
  position,
  isLast,
  saveStatus,
  onBodyBlur,
  onImagesChange,
  onBack,
  onAdvance,
}: {
  prompt: AnswerPromptData;
  entry: AnswerEntryDraft;
  position: number;
  isLast: boolean;
  saveStatus: "idle" | "saving" | "saved" | "failed";
  onBodyBlur: (body: string) => void;
  onImagesChange: (images: string[]) => void;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const [body, setBody] = useState(entry.body);
  const savedRef = useRef(entry.body);

  // `latest` covers the blur path, where the setBody from the same event has
  // not re-rendered yet; the advance buttons call it bare and use state.
  function flushBody(latest?: string) {
    const value = latest ?? body;
    if (value.trim() === savedRef.current.trim()) return;
    savedRef.current = value;
    onBodyBlur(value);
  }

  const hasContent =
    prompt.kind === "photo" ? entry.images.length > 0 : Boolean(body.trim() || entry.images.length);
  // The primary pill is always "Next"/"Share": the empty first frame should
  // invite an answer, not lead with an exit. It disables until there is
  // something to carry forward, and "Skip for now" stays beside it.
  const advanceLabel = isLast ? "Share" : "Next";

  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
      <h2 className="max-w-lg font-heading text-[1.35rem] font-bold leading-[1.25] tracking-[-0.02em] text-foreground sm:text-[1.55rem]">
        {prompt.text}
      </h2>

      {prompt.asker && (
        <div className="mt-[var(--space-s)] flex items-center gap-2">
          <Link
            href={`/profile/${prompt.asker.id}`}
            aria-label={prompt.asker.name}
            className="shrink-0 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BirdAvatar user={prompt.asker} size={22} />
          </Link>
          <span className="text-xs font-medium text-muted-foreground">
            asked by{" "}
            <Link
              href={`/profile/${prompt.asker.id}`}
              className="rounded-sm transition-colors duration-150 hover:text-foreground hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {prompt.asker.name}
            </Link>
          </span>
        </div>
      )}

      <div className="mt-[var(--space-m)] space-y-[var(--space-m)]">
        {prompt.kind === "text" && (
          <>
            <div className={`overflow-hidden rounded-[var(--radius-input)] border border-border hover:border-leaf/40 ${FIELD_FOCUS_WITHIN}`}>
              {/* The same writing surface as the composer (owner, 2026-08-13:
                  "bold italics etc in every text box... not just the feed"):
                  a contentEditable on the shared markdown primitives, so
                  Cmd/Ctrl+B/I/U and the phone's selection bar format live.
                  It grows with its content on its own; the old textarea
                  needed a measure-and-set effect for that. */}
              <RichTextArea
                key={prompt.id}
                initialValue={entry.body}
                ariaLabel={prompt.text}
                onChange={setBody}
                onBlur={(markdown) => {
                  setBody(markdown);
                  flushBody(markdown);
                }}
                className="bg-card px-4 py-3.5 font-heading text-[17px] leading-[1.7]"
                minHeight={MIN_TEXTAREA_HEIGHT}
              />
            </div>
            <PhotoAttachments images={entry.images} onChange={onImagesChange} />
          </>
        )}

        {prompt.kind === "photo" && (
          <PhotoAttachments images={entry.images} onChange={onImagesChange} max={1} />
        )}

        {prompt.kind === "songs" && (
          <SongNameField value={body} onChange={setBody} onCommit={flushBody} />
        )}
      </div>

      <div className="mt-[var(--space-m)] flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-[var(--space-m)]">
        <div className="flex items-center gap-3">
          {position > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          {saveStatus !== "idle" && (
            /* A failed save says so, in the destructive red, and stays said.
               It used to fall back to "idle", which renders nothing at all, so
               the only trace was a toast that scrolls away (audit M11). Same
               treatment the letter desk got for the same bug (B-043). The text
               is still on screen and blurring the field again retries, which
               is what "not saved" has to imply here. */
            <span
              className={cn(
                "text-xs font-medium",
                saveStatus === "failed" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "failed"
                  ? "Not saved. Click away and back to try again."
                  : "Saved"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!hasContent && (
            <button
              type="button"
              onClick={() => {
                flushBody();
                onAdvance();
              }}
              className="rounded-sm text-sm font-medium text-muted-foreground hover:text-foreground hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Skip for now
            </button>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={!hasContent}
            onClick={() => {
              flushBody();
              onAdvance();
            }}
          >
            {advanceLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
