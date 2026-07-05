"use client";

/* ------------------------------------------------------------------ *
 *  <SeedQuestionsPicker> — step 3 of the create flow: the auto-suggested
 *  starter questions, each removable, plus "Add from the library" (the
 *  five prompt sets from spec section 4) and "Write your own" (spec
 *  3.2). Members will also add their own once the question window
 *  opens; that is made explicit in the helper copy here, not left
 *  implied.
 *
 *  `promptSets` is passed in from the server page (which reads
 *  `CATCHUP_PROMPT_SETS` from `@/lib/catchups`) rather than imported
 *  here directly: that module also pulls in the server-only Prisma
 *  `pg` driver, which cannot be bundled for the browser. The `type`
 *  import below is erased at compile time, so it carries none of that
 *  weight.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { X, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatchupPromptSet } from "@/lib/catchups";
import type { PromptCategory } from "@/lib/catchups-types";
import { cn } from "@/lib/utils";

export type SeedPrompt = { text: string; category: PromptCategory | null };

const MAX_SEED_PROMPTS = 12;

export function SeedQuestionsPicker({
  prompts,
  onChange,
  promptSets,
}: {
  prompts: SeedPrompt[];
  onChange: (next: SeedPrompt[]) => void;
  promptSets: CatchupPromptSet[];
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const atCap = prompts.length >= MAX_SEED_PROMPTS;

  function remove(index: number) {
    onChange(prompts.filter((_, i) => i !== index));
  }

  function addFromLibrary(text: string, category: PromptCategory) {
    if (atCap || prompts.some((p) => p.text === text)) return;
    onChange([...prompts, { text, category }]);
  }

  function addCustom() {
    const text = customText.trim();
    if (!text || atCap) return;
    onChange([...prompts, { text, category: null }]);
    setCustomText("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {prompts.map((p, i) => (
          <div
            key={`${p.text}-${i}`}
            className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-background/50 p-3"
          >
            <p className="flex-1 text-[13.5px] leading-relaxed text-foreground">{p.text}</p>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove "${p.text}"`}
              className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {prompts.length === 0 && (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border p-3 text-[13px] text-muted-foreground">
            No starter questions yet. Add one below, everyone else adds their own once the window
            opens.
          </p>
        )}
      </div>

      <p className="text-[12px] text-muted-foreground">
        {prompts.length} of {MAX_SEED_PROMPTS} questions. Members will also add their own during
        the question window.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <Input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Write your own question..."
            disabled={atCap}
            className="min-w-0 flex-1 sm:max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustom}
            disabled={!customText.trim() || atCap}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryOpen((o) => !o)}>
          <BookOpen className="h-3.5 w-3.5" />
          Add from the library
        </Button>
      </div>

      {libraryOpen && (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-muted/40 p-3.5">
          {promptSets.map((set) => (
            <div key={set.id}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {set.label}
              </p>
              <div className="mt-1.5 space-y-1.5">
                {set.prompts.map((text) => {
                  const already = prompts.some((p) => p.text === text);
                  return (
                    <button
                      key={text}
                      type="button"
                      disabled={already || atCap}
                      onClick={() => addFromLibrary(text, set.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-[var(--radius-md)] border border-transparent px-2.5 py-1.5 text-left text-[13px] leading-relaxed transition-colors duration-150 hover:border-border hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
                        already ? "text-leaf" : "text-foreground"
                      )}
                    >
                      <Plus className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
