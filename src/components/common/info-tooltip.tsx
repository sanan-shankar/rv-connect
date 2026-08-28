"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * A small (i) info-icon affordance that reveals a short explanation on hover
 * (desktop) or tap (mobile, no hover to rely on). Built on the shared Popover
 * primitive rather than a hover-only tooltip so tap genuinely opens and closes
 * it on touch devices, not just desktop pointers.
 *
 * Use this where a paragraph of explanation would otherwise sit inline and
 * crowd the form (e.g. settings' batch-year note); keep the copy identical to
 * whatever it replaced.
 */
export function InfoTooltip({
  children,
  label = "More info",
  side = "top",
}: {
  children: ReactNode;
  label?: string;
  /** Which way the note opens. "top" is right for an icon on a row of text
   *  with a page below it; "bottom" is right for an icon in the top corner
   *  of a tall box, where opening upward means leaving the panel entirely
   *  and landing on whatever is above it (in the contribute pop-up, that
   *  was the dialog's own close button). */
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-transform duration-150 hover:text-cinnamon active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Info className="h-[15px] w-[15px]" aria-hidden />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side={side} sideOffset={6} align="start">
          <PopoverContent
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className="w-64 p-3 text-[13px] leading-relaxed text-foreground"
          >
            {children}
          </PopoverContent>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
