"use client";

/* ------------------------------------------------------------------ *
 *  Small shared parts. Three takes need the same save indicator, the
 *  same contact icons and the same "add a way to reach me" menu, and
 *  the comparison is only honest if those are identical across them.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AtSign,
  Check,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CONTACT_KINDS, type ContactKind, type FieldState } from "./_data";

/* ------------------------------------------------------------------ *
 *  The save indicator.
 *
 *  This replaces the sticky "You have unsaved changes / Discard / Save"
 *  bar in all three takes (owner, 2026-08-06: "I don't like that
 *  behaviour"). A settings field has one correct value and you already
 *  typed it; asking again is the app refusing to believe you.
 *
 *  So: fields commit on blur, and the only feedback is this. It is one
 *  line, it never covers anything, and it says nothing at all when
 *  nothing is happening, which is most of the time.
 * ------------------------------------------------------------------ */
export function SaveMark({ states }: { states: Record<string, FieldState> }) {
  const values = Object.values(states);
  const state: FieldState = values.includes("saving")
    ? "saving"
    : values.includes("saved")
      ? "saved"
      : "idle";
  return (
    <div className="flex h-5 items-center justify-end" aria-live="polite">
      <AnimatePresence mode="wait">
        {state !== "idle" && (
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRINGS.gentle}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground"
          >
            {state === "saved" && <Check className="h-3.5 w-3.5 text-leaf" />}
            {state === "saved" ? "Saved" : "Saving"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Contacts
 * ------------------------------------------------------------------ */

export const CONTACT_ICON: Record<ContactKind, typeof Mail> = {
  email: Mail,
  phone: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  link: Globe,
};

/* The icon carries the kind, so no row needs a written label. That is the
   whole saving: the shipped page spends a 168px label column on the words
   "Instagram", "LinkedIn" and "Facebook" next to three empty boxes. */
export function ContactIcon({ kind }: { kind: ContactKind }) {
  const Icon = CONTACT_ICON[kind] ?? AtSign;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

/**
 * The one way anything gets added to the contact list.
 *
 * The shipped page keeps a permanently visible, permanently empty row for
 * Instagram, LinkedIn and Facebook whether or not you have them (owner:
 * "it should not show there ... they just have to scroll so much"). Here
 * nothing exists until you ask for it, and the menu is where the five
 * kinds live.
 */
export function AddContact({
  onAdd,
  label = "Add",
  className,
}: {
  onAdd: (kind: ContactKind) => void;
  label?: string;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={cn(
          "state-layer inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-[12.5px] font-semibold text-muted-foreground outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {label}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner sideOffset={6} align="start" side="bottom">
          <PopoverContent className="w-[196px] p-1.5">
            {CONTACT_KINDS.map((k) => {
              const Icon = CONTACT_ICON[k.kind];
              return (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => onAdd(k.kind)}
                  className="state-layer flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-left text-[13.5px] font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {k.label}
                </button>
              );
            })}
          </PopoverContent>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}

/* ------------------------------------------------------------------ *
 *  A textarea that is exactly as tall as what is in it.
 *
 *  The shipped About is a fixed five-row box: too tall while empty, too
 *  short once somebody actually writes. `field-sizing: content` would do
 *  this in one CSS line and is not in Safari yet, so it is measured.
 * ------------------------------------------------------------------ */
export function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

/* ------------------------------------------------------------------ *
 *  An input exactly as wide as what is in it.
 *
 *  "Student at Imperial College London" is a sentence, and a sentence
 *  with a fixed-width hole in it is not one: at a 152px job title,
 *  "Student" leaves 100px of nothing before the word "at", which is the
 *  shipped page's whole problem reproduced inside one line.
 *
 *  Two elements share one grid cell. An invisible copy of the text gives
 *  the cell its width; the real input stretches over it. No measuring,
 *  no ref, no resize listener. `field-sizing: content` will replace all
 *  of this the day Safari ships it.
 * ------------------------------------------------------------------ */
export function AutoInput({
  value,
  onChange,
  onBlur,
  placeholder,
  ariaLabel,
  fieldClass,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  ariaLabel: string;
  /** the shared field styling, applied to BOTH so they measure the same */
  fieldClass: string;
  /** type size and any width cap; goes on the wrapper so both inherit it */
  className?: string;
}) {
  return (
    <span className={cn("inline-grid max-w-full overflow-hidden align-middle", className)}>
      <span
        aria-hidden
        className={cn(fieldClass, "invisible col-start-1 row-start-1 whitespace-pre")}
      >
        {value || placeholder}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        // size={1} is load-bearing. An input's default intrinsic width is
        // about 20 characters, and in a grid cell that competes with the
        // mirror: the column comes out 168px wide no matter how short the
        // text is, which is the exact gap this was built to close.
        size={1}
        className={cn(fieldClass, "col-start-1 row-start-1 w-full min-w-0")}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  A name field that can wrap.
 *
 *  This is a textarea, and it has to be. An <input> is one line forever:
 *  at 390px, a display-size name longer than the column just runs off the
 *  end of it, and "Sanan Shankar" came out reading "Sanan Shankaı" under
 *  the bird. The heading it replaces is an <h1> that wraps to two lines,
 *  so the editable version has to wrap too or it is not the same object.
 *
 *  Enter is swallowed, because a name has no second paragraph.
 * ------------------------------------------------------------------ */
export function PenTitle({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  className?: string;
}) {
  const ref = useAutoGrow(value);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ""))}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      placeholder={placeholder}
      aria-label="Your name"
      spellCheck={false}
      className={cn("block w-full resize-none overflow-hidden", className)}
    />
  );
}

/* ------------------------------------------------------------------ *
 *  A section heading: the label, then a hairline out to the edge.
 *
 *  The shipped page draws 17 hairlines inside its form and 8 card
 *  outlines around them. A settings page has about four subjects in it.
 *  This is a line per subject, and the label sits ON the line instead of
 *  above a box, so naming a section costs no vertical space of its own.
 * ------------------------------------------------------------------ */
export function Subject({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <h2 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h2>
      <span className="h-px min-w-4 flex-1 bg-border" />
    </div>
  );
}
