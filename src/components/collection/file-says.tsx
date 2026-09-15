"use client";

/* ------------------------------------------------------------------ *
 *  WHAT THE FILE SAYS, offered and never applied.
 *
 *  One strip, in two rooms: the contribute pop-up, where a member has just
 *  dropped the photograph, and the review room, where an admin is dating
 *  one already in. It moved here from the review room on 2026-09-15 so
 *  both say it the same way.
 *
 *  The date it is handed has already been JUDGED (src/lib/taken-date.ts):
 *  anything a scanner wrote, a save date, a never-set clock or a name
 *  that contradicts the camera never reaches this component. Even so, the
 *  wording stays "The file says" rather than "Taken in", because a phone
 *  photographing an old print looks exactly like a phone photographing
 *  the valley, and only a person looking at the picture can tell. So it
 *  is offered, never applied, and it names its source out loud.
 *
 *  It keeps offering after a year has been typed, because the second most
 *  useful moment for it is when the year in the box is WRONG. It GOES
 *  once the box holds what it would put there, pressed or typed: a strip
 *  reading "Used" is an offer with nothing left in it (owner, 2026-09-15:
 *  "when the date and month is what that says make it disappear").
 * ------------------------------------------------------------------ */

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTHS } from "@/lib/collection";
import type { ExifDate } from "@/lib/taken-date";
import { cn } from "@/lib/utils";
import type { PhotoAnswers } from "./photo-questions";

/** Whether the answers already hold the file's date, so there is nothing
 *  to offer. Exported so a caller can animate the strip out, not just lose it. */
export function fileSaysUsed(date: ExifDate, answers: PhotoAnswers): boolean {
  const month = date.month ? MONTHS[date.month - 1] : "";
  return answers.year === String(date.year) && answers.month === month;
}

export function FileSays({
  date,
  answers,
  onAnswer,
  className,
}: {
  date: ExifDate | null | undefined;
  answers: PhotoAnswers;
  onAnswer: (patch: Partial<PhotoAnswers>) => void;
  className?: string;
}) {
  if (!date || fileSaysUsed(date, answers)) return null;

  const month = date.month ? MONTHS[date.month - 1] : "";
  const said = month ? `${month} ${date.year}` : String(date.year);

  return (
    /* No fill. It sat on `bg-mist`, and on the pop-up's white that warm
       tint read as a brown stain (owner, 2026-09-15: "I don't really like
       the brown background it has"), the same yellowing he threw out of the
       bucket tiles. The sparkle and the button already mark it as an offer. */
    <div className={cn("flex items-center gap-2 px-3 py-2", className)}>
      <Sparkles className="size-3.5 shrink-0 text-cinnamon" strokeWidth={2} aria-hidden />
      {/* 14px, up from the review room's 12.5: in the contribute pop-up this
          sits beside questions set at 15px on the owner's own accessibility
          call ("we have to make sure we don't use fonts that are too small
          on mobile"). */}
      <p className="min-w-0 flex-1 text-[14px] text-muted-foreground">
        The file says <span className="font-medium text-foreground">{said}</span>
      </p>
      <Button
        size="xs"
        variant="outline"
        onClick={() => onAnswer({ year: String(date.year), month })}
      >
        Use it
      </Button>
    </div>
  );
}
