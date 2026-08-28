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
  align = "start",
}: {
  children: ReactNode;
  label?: string;
  /** Which edge the note hangs from, and it should follow where the icon
   *  IS. An icon inline in a sentence wants "start"; an icon parked in the
   *  right corner of a box wants "end", because "start" there sends a 288px
   *  panel off the right of a phone and the positioner shoves it back by
   *  however much it overflowed. That shove is why the owner saw it as
   *  "misplaced" and moving: its position was decided by collision rather
   *  than by intent, so it landed somewhere different at every width. */
  align?: "start" | "end";
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
        <PopoverPositioner side={side} sideOffset={6} align={align}>
          <PopoverContent
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            /* 288px and balanced, and both numbers were measured rather than
               picked. At 256px the contribute room's hint broke 189/218/91 --
               a 127px spread and a runt last line, which the owner read as
               "unevenly wrapped, it looks wonky". `text-wrap: balance` evens
               any hint that lands here (the same sentence becomes 177/154/168
               at every width from 208 to 272), and at 288 it needs only two
               lines, 258/243, a 15px spread. Two even lines is the tidiest
               shape this text has.

               14px, not 13: this is a paragraph a member reads, and the small
               type across this flow is what the owner called out. */
            className="w-72 p-3 text-[14px] leading-relaxed text-balance text-foreground"
          >
            {children}
          </PopoverContent>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
