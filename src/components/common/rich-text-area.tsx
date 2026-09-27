"use client";

/* ------------------------------------------------------------------ *
 *  <RichTextArea> — the app's drop-in writing surface for everything
 *  that is not the full feed/letter composer (which keeps its own
 *  contentEditable for mentions, polls and the expand choreography, on
 *  the same primitives).
 *
 *  A contentEditable, not a textarea, so Bold/Italic/Underline render
 *  LIVE: Cmd/Ctrl+B/I/U (and the phone's native selection bar) apply a
 *  real <b>/<i>/<u> to the selection instead of leaving "**" on screen.
 *  The value in and out is markdown — renderRichText hydrates it once
 *  on mount and serializeEditableToMarkdown mirrors every input back —
 *  so anything already storing plain text keeps working unchanged and
 *  formatting rides along in the same column.
 *
 *  Uncontrolled by design: the DOM owns the text between events, the
 *  parent owns the markdown mirror. Paste is forced to plain text.
 * ------------------------------------------------------------------ */

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import { markMentionTokens } from "@/lib/mention-editing";
import {
  applyFormatShortcut,
  insertPlainTextPaste,
  serializeEditableToMarkdown,
} from "@/lib/rich-text-editing";

export function RichTextArea({
  initialValue,
  onChange,
  onBlur,
  ariaLabel,
  placeholder,
  className,
  minHeight,
}: {
  /** Markdown to hydrate with, once, on mount. Remount (key) to reset. */
  initialValue?: string;
  /** Fired with the serialized markdown after every input. */
  onChange?: (markdown: string) => void;
  /** Fired with the serialized markdown when focus leaves the field. */
  onBlur?: (markdown: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Callback ref, not an effect: hydration must happen exactly once, before
  // paint, on whatever element mounts (this component is routinely keyed and
  // remounted per item -- per catch-up prompt, per edited post).
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el;
      if (el && initialValue) {
        el.innerHTML = renderRichText(initialValue);
        // A saved post's tags come back as tags, not as links to edit around.
        markMentionTokens(el);
      }
      if (el) el.dataset.empty = el.textContent?.trim() ? "false" : "true";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial value only; later edits live in the DOM
    []
  );

  function mirror() {
    const el = ref.current;
    if (!el) return;
    el.dataset.empty = el.textContent?.trim() ? "false" : "true";
    onChange?.(serializeEditableToMarkdown(el));
  }

  return (
    <div
      ref={attach}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      onInput={mirror}
      onKeyDown={(e) => {
        if (applyFormatShortcut(e)) mirror();
      }}
      onPaste={(e) => {
        insertPlainTextPaste(e);
        mirror();
      }}
      onBlur={() => {
        const el = ref.current;
        if (el) onBlur?.(serializeEditableToMarkdown(el));
      }}
      style={minHeight ? { minHeight } : undefined}
      className={cn(
        // No focus-visible:outline-none here: this primitive takes its box
        // AND its focus edge from the caller's className (FIELD_FOCUS on a
        // bordered box, or FIELD_FOCUS_WITHIN on a framing wrapper), and a
        // hard outline-none would cancel the forced-colors fallback in it.
        "block w-full resize-none whitespace-pre-wrap break-words text-foreground outline-none",
        // Same native-highlight suppression as the composer: WebKit's
        // square-cornered tap flash reads as a broken ring on a rounded field.
        "[-webkit-tap-highlight-color:transparent]",
        "data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(data-placeholder)]",
        className
      )}
    />
  );
}
