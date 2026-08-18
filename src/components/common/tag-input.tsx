"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SpringPress } from "@/components/common/motion";

/**
 * <TagInput> -- a plain type-to-chip field for short free-text lists
 * (a teacher's subjects, for now). Type a word, press enter (or comma, or
 * just tap away) and it commits to a chip; the field stays focused, ready
 * for the next one. Backspace in the empty box removes the last chip.
 *
 * Deliberately the same two-part layout and chip material as
 * <LocationPicker mode="multi"> -- chips in a wrap row above, the input box
 * below -- so the "your picks become pills" language reads identically on
 * every field that uses it. The difference is only that this one has no
 * search behind it: what you type is what you get.
 *
 * Commit-on-blur matters more than it looks: on a phone nobody presses
 * return, they type "Physics" and tap the next field or the save button,
 * and that text must not silently vanish.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState("");

  // Commas split so a pasted "Physics, Astronomy Club" lands as two chips.
  // Dedupe is case-insensitive: "physics" after "Physics" adds nothing.
  function commit(text: string) {
    const incoming = text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...value];
    for (const tag of incoming) {
      if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
        next.push(tag);
      }
    }
    setDraft("");
    if (next.length !== value.length) onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      // Enter is this field's commit, never the form's submit.
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <li key={tag.toLowerCase()}>
              {/* The sky chip from the protocol's trio, byte-for-byte the same
                  classes as the location picker's city chips. */}
              <span className="inline-flex max-w-72 items-center gap-1.5 rounded-full border border-sky/35 bg-sky/[0.10] py-1 pr-1.5 pl-3 text-sm font-medium text-sky">
                <span className="truncate">{tag}</span>
                <SpringPress
                  as="button"
                  onClick={() => removeTag(index)}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-canopy/70 outline-none transition-colors duration-150 hover:bg-canopy/20 hover:text-canopy active:bg-canopy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                  {...({ type: "button", "aria-label": `Remove ${tag}` } as object)}
                >
                  <XIcon className="size-3" strokeWidth={2.5} />
                </SpringPress>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={60}
        autoComplete="off"
      />
    </div>
  );
}
