"use client";

/* ------------------------------------------------------------------ *
 *  <CaptionField> -- the description box, where people can be tagged.
 *
 *  The owner, 2026-10-27: "can you tag people in photo descriptions?" A
 *  tag here is the post's own: type "@" and a name, or tap a first name
 *  the box has underlined, and it becomes the person, stored as
 *  `@[Name](id)` in the caption and drawn as a link to their profile in
 *  the viewer. Every piece of that is the composer's (lib/mention-editing,
 *  lib/rich-text-editing, posts/mention-dropdown), so a tag behaves the
 *  same in a photograph as in a post, wave included.
 *
 *  A contentEditable, because a tag has to be ONE thing the caret steps
 *  over rather than thirty characters of brackets in a textarea. It took the
 *  place of FloatArea (float-field.tsx, removed with this) and keeps its
 *  dress exactly: the label inside the box that floats up, 56px empty,
 *  growing as it fills, in a grouped card where a row two pixels off is the
 *  first thing that gets noticed. The owner on that box (2026-08-28): "it
 *  should clearly expand when people are typing" -- a box drawn at its
 *  maximum asks for an essay before a word is typed.
 *
 *  THE LIST OPENS BELOW THE CARD, NOT IN IT. The card this sits in clips
 *  its rows to its radius (`overflow-hidden`), which would cut the list off
 *  at the box's bottom edge. So the list is portalled into `listHost`, an
 *  empty strip the caller places just under the card.
 *
 *  Uncontrolled between keystrokes, like RichTextArea: the DOM holds the
 *  text, the parent holds the markdown mirror. But `value` can change from
 *  outside -- the contribute room shows another photograph's answers, the
 *  review room moves to the next one -- so a value that is not the one this
 *  box last sent out is drawn in again.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { mentionsAsNames, renderRichText } from "@/lib/rich-text";
import {
  candidateAtCaret,
  findNameCandidates,
  insertMentionToken,
  markMentionTokens,
  memberFirstNames,
  paintNameCandidates,
  waveMention,
} from "@/lib/mention-editing";
import {
  computeMentionRange,
  insertPlainTextPaste,
  serializeEditableToMarkdown,
} from "@/lib/rich-text-editing";

const MentionDropdown = dynamic(
  () => import("@/components/posts/mention-dropdown").then((m) => m.MentionDropdown),
  { ssr: false }
);
/* The (i) is built on the base-ui Popover, and a static import put that whole
   floating stack into the first load of every page drawing the box (16.4 KB
   off /admin/review, measured 2026-09-05). `ssr: false` costs nothing: the
   contribute and edit rooms are dialogs that open after hydration. */
const InfoTooltip = dynamic(
  () => import("@/components/common/info-tooltip").then((m) => m.InfoTooltip),
  { ssr: false }
);


export function CaptionField({
  id,
  label,
  hint,
  max,
  value,
  onChange,
  listHost,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  /** Ceiling on the characters a reader sees; a tag counts as its name. */
  max: number;
  value: string;
  onChange: (markdown: string) => void;
  /** Where the people list opens: an empty, `relative` strip under the card. */
  listHost: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef<string | null>(null);
  const names = useRef<Set<string> | null>(null);
  const candidates = useRef<Range[]>([]);
  const queryRange = useRef<Range | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  const markEmpty = (el: HTMLElement) => {
    el.dataset.empty = el.textContent?.trim() ? "false" : "true";
  };
  /* What still fits, counted the way photoSchema counts: what a reader sees,
     a tag as its name. Read off the markdown this box last sent, which is the
     state before the keystroke being asked about, so no walk of the DOM. */
  const room = () => max - mentionsAsNames(sent.current).length;

  const refreshCandidates = useCallback(() => {
    const el = ref.current;
    if (!el || !names.current) return;
    candidates.current = findNameCandidates(el, names.current);
    paintNameCandidates(el, candidates.current);
  }, []);

  /* Drawn in on mount and whenever the value arrives from outside. The
     comparison is against what this box last SENT, so its own keystrokes
     coming back down as props never re-render the DOM under the caret. */
  useEffect(() => {
    const el = ref.current;
    if (!el || value === sent.current) return;
    sent.current = value;
    el.innerHTML = value ? renderRichText(value) : "";
    // A saved tag comes back as a tag, not as a link to edit around.
    markMentionTokens(el);
    markEmpty(el);
    refreshCandidates();
  }, [value, refreshCandidates]);

  // The underlines are the page's highlight, not this element's.
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) paintNameCandidates(el, []);
    };
  }, []);

  function emit() {
    const el = ref.current;
    if (!el) return;
    markEmpty(el);
    const markdown = serializeEditableToMarkdown(el);
    sent.current = markdown;
    onChange(markdown);
  }

  function handleInput() {
    emit();
    refreshCandidates();
    const found = computeMentionRange();
    setQuery(found ? found.query : null);
    queryRange.current = found ? found.range : null;
  }

  function handleSelect(user: { id: string; name: string }) {
    const range = queryRange.current;
    const el = ref.current;
    if (range && el) {
      const token = insertMentionToken(range, user);
      el.focus();
      waveMention(token);
      emit();
      refreshCandidates();
    }
    setQuery(null);
    queryRange.current = null;
  }

  /* THE CEILING, held at the keyboard. A textarea had `maxLength`; this box
     refuses the keystroke that would cross it instead, counting a tag as the
     name it shows. A selection being typed over replaces text rather than
     adding it, so it is let through. A NATIVE listener: React's
     `onBeforeInput` is the old keypress stand-in, which carries no
     `inputType` and never sees a phone keyboard's insertions at all. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hold = (e: InputEvent) => {
      if (!e.inputType.startsWith("insert") || e.inputType === "insertFromPaste") return;
      if (!window.getSelection()?.isCollapsed) return;
      if (room() <= 0) e.preventDefault();
    };
    el.addEventListener("beforeinput", hold);
    return () => el.removeEventListener("beforeinput", hold);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- room() reads refs only
  }, [max]);

  // Plain text only, as everywhere else, and cut to what still fits.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    insertPlainTextPaste(e, room());
    handleInput();
  }

  return (
    <div className="relative">
      <div
        id={id}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={`${id}-label`}
        data-empty="true"
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => {
          if (names.current) return;
          void memberFirstNames().then((set) => {
            names.current = set;
            refreshCandidates();
          });
        }}
        onClick={() => {
          /* A tap on an underlined first name opens the people search on it,
             as the composer does. */
          const hit = candidateAtCaret(candidates.current);
          if (!hit) return;
          queryRange.current = hit.cloneRange();
          setQuery(hit.toString());
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && query !== null) {
            // Closes the list, not the dialog the box is in.
            e.stopPropagation();
            setQuery(null);
          }
        }}
        onBlur={() => setQuery(null)}
        className={cn(
          /* 26 + 22 + 8 makes an empty one-line box exactly 56px, the
             height of the date row above it. The owner, when it was not:
             "why is the second box bigger than the first?" */
          "peer block min-h-14 w-full whitespace-pre-wrap break-words bg-transparent",
          "px-4 pb-2 pt-[1.625rem] text-base leading-snug text-foreground outline-none",
          // WebKit's square tap flash reads as a broken ring on a rounded card.
          "[-webkit-tap-highlight-color:transparent]",
          hint && "pr-10"
        )}
      />
      <span
        id={`${id}-label`}
        className={cn(
          "pointer-events-none absolute left-4 top-[1.0625rem] origin-left text-base text-muted-foreground",
          "transition-transform duration-200 ease-out",
          "peer-focus:translate-y-[-0.72rem] peer-focus:scale-[0.72]",
          "peer-data-[empty=false]:translate-y-[-0.72rem] peer-data-[empty=false]:scale-[0.72]"
        )}
      >
        {label}
      </span>
      {hint && (
        /* `top-[1.1875rem]` puts a 20px icon box's centre on the resting
           label's centre, so the (i) and "Add a description" sit on one
           line; `right-4` mirrors the text's own inset. Measured, because
           the owner said of the old corner placement: "it's not aligned to
           anything, just hanging". */
        <div className="absolute right-4 top-[1.1875rem] flex h-5 items-center">
          <InfoTooltip label="What to write" side="bottom" align="end">
            {hint}
          </InfoTooltip>
        </div>
      )}
      {query !== null &&
        listHost &&
        createPortal(<MentionDropdown query={query} onSelect={handleSelect} />, listHost)}
    </div>
  );
}
