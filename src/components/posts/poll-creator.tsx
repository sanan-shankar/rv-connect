"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

/**
 * The poll editor inside the composer.
 *
 * The QUESTION is the post body itself, not a field in here: the composer's
 * textarea sits directly above this block, relabels itself to "Ask a question"
 * while a poll is attached, and the feed already prints that text above the
 * options. So a poll reads as question-then-choices on both sides without a
 * second text field that would duplicate the post body (and without a schema
 * column for something `Post.content` already stores). `create-post-form`
 * enforces that the body is non-empty before a poll can be posted, so a poll
 * can never ship without its question.
 *
 * Surface: a plain hairline block, no filled background. It previously used
 * `bg-muted/50`, and on this warm palette `--muted` (#EEE8DA) read as a flat
 * yellow panel sitting inside the card. Radius is one step below the
 * composer card's 16px, per the design-system rule that a nested box never
 * shares its container's radius.
 */
export function PollCreator({
  options,
  onChange,
  onRemove,
}: {
  options: string[];
  onChange: (options: string[]) => void;
  onRemove: () => void;
}) {
  function updateOption(index: number, value: string) {
    onChange(options.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) onChange([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length > MIN_OPTIONS) onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-border p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold tracking-[0.02em] text-foreground">
          Choices
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove poll"
          className="rounded-full p-1 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-4 shrink-0 text-center text-[12.5px] font-semibold tabular-nums text-muted-foreground"
            >
              {i + 1}
            </span>
            <Input
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              maxLength={200}
              aria-label={`Poll option ${i + 1}`}
              className="h-9 rounded-[var(--radius-sm)] text-sm"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= MIN_OPTIONS}
              aria-label={`Remove option ${i + 1}`}
              className="rounded-full p-1 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 disabled:pointer-events-none disabled:opacity-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS && (
        <Button type="button" variant="ghost" size="sm" onClick={addOption} className="mt-2">
          <Plus className="h-3 w-3" />
          Add option
        </Button>
      )}
    </div>
  );
}
