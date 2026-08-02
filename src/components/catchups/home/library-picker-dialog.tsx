"use client";

/* ------------------------------------------------------------------ *
 *  <LibraryPickerDialog> - "Add from the library" (spec 3.3.1 / 4).
 *  Lists the 5 built-in prompt sets; picking one hands its text back to
 *  the caller (the submission panel, or the Keeper rail's own quick
 *  add) and closes. Reused by both call sites so there is one place
 *  this list is rendered.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { Library } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { CatchupPromptSet } from "@/lib/catchups";

export function LibraryPickerDialog({
  sets,
  onPick,
  triggerLabel = "From the library",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  sets: CatchupPromptSet[];
  onPick: (text: string, category: string) => void;
  triggerLabel?: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
}) {
  const [open, setOpen] = useState(false);

  function pick(text: string, category: string) {
    onPick(text, category);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant={triggerVariant} size={triggerSize} />}>
        <Library className="h-3.5 w-3.5" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-tight">Ask something from the library</DialogTitle>
          <DialogDescription>
            Pick a question. You can still edit it before it goes to the group.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[26rem] space-y-5 overflow-y-auto pr-1">
          {sets.map((set) => (
            <div key={set.id}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-leaf">{set.label}</p>
              <div className="mt-2 space-y-1">
                {set.prompts.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => pick(text, set.id)}
                    // state-layer, not hover:bg-accent: this list sits on the
                    // dialog's Float white, where accent measures DARKER than
                    // the panel and the highlight disappeared. The layer is a
                    // translucent ink tint, so it reads the same here as on a
                    // card, and it carries the :active press too.
                    className="block w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-[13.5px] leading-snug text-foreground state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
