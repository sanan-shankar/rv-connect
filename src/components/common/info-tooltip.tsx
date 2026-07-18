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
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-transform duration-150 hover:text-cinnamon focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90"
      >
        <Info className="h-[15px] w-[15px]" aria-hidden />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="top" sideOffset={6} align="start">
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
