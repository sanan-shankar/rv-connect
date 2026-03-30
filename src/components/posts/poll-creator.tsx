"use client";

import { Plus, X, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PollCreatorProps {
  options: string[];
  onChange: (options: string[]) => void;
  onRemove: () => void;
}

export function PollCreator({ options, onChange, onRemove }: PollCreatorProps) {
  function updateOption(index: number, value: string) {
    const updated = [...options];
    updated[index] = value;
    onChange(updated);
  }

  function addOption() {
    if (options.length < 4) {
      onChange([...options, ""]);
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      onChange(options.filter((_, i) => i !== index));
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Poll Options
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 transition-transform duration-150"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              maxLength={200}
              className="text-sm"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="rounded-md p-1 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 transition-transform duration-150"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 4 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addOption}
          className="mt-2"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add option
        </Button>
      )}
    </div>
  );
}
