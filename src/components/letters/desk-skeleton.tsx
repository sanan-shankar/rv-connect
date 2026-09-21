import { ButtonSkeleton } from "@/components/common/skeleton";
import { cn } from "@/lib/utils";

/**
 * The letter desk, before it arrives: the back-link line, then the paper
 * sheet with its title, its body and the row of controls along the bottom.
 *
 * Writing and editing a letter are the same desk, so they share this file,
 * and differ in exactly one thing: what is written on the sheet. A new letter
 * is blank, so its bars sit where the two placeholders will ("Title your
 * letter", and "Write your letter to the valley. Take your time.", which is
 * one line on a laptop and two on a phone); a draft has its own words, so it
 * gets a title and a few lines of body.
 *
 * Every measurement is letter-desk.tsx's and CreatePostForm's immersive one:
 * the 760px desk (w-full, or a flex item with auto margins shrink-wraps and
 * every percentage bar inside collapses); the 20px back link 20px over the
 * sheet; px-5 py-8 opening to px-14 py-12 from sm; the title's line at
 * leading-tight (32.5px of 26px type on a phone, 37.5px of 30px from sm) 8px
 * over the body; the body on the editor's own 55vh floor in its 28.8px line
 * boxes; and the control row 8px under it -- two 36px icon controls pulled
 * 9px left, then "Save as draft" and "Publish letter" as the real Buttons'
 * boxes, the second at the 0.97 it rests at while a blank letter cannot be
 * published. The row wraps where the real one wraps: on a phone the two
 * buttons drop to a line of their own. Two icons, because the "+" shows for
 * anybody with a city to address a letter to, which is nearly everybody.
 * Measured against the real desk at 1440 and 390, it lands within a pixel.
 */
export function LetterDeskSkeleton({ blank = false }: { blank?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="mb-5 flex h-5 items-center">
        <div className="skeleton-warm h-3 w-[78px] rounded-md" />
      </div>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-5 py-8 sm:px-14 sm:py-12">
        <div className="mb-2 flex h-[32.5px] items-center sm:h-[37.5px]">
          <div
            className={cn(
              "skeleton-warm h-5 rounded-md sm:h-6",
              blank ? "w-[204px] sm:w-[236px]" : "w-2/3"
            )}
          />
        </div>
        <div className="min-h-[55vh]">
          {(blank ? BLANK : DRAFT).map((width, i) => (
            <div key={i} className={cn("flex h-[28.8px] items-center", i > 0 && blank && "sm:hidden")}>
              <div className={cn("skeleton-warm h-3 rounded-md", width)} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="-ml-[9px] flex items-center gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="grid size-9 place-items-center">
                <div className="skeleton-warm size-[18px] rounded-full" />
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ButtonSkeleton label="Save as draft" />
            <ButtonSkeleton label="Publish letter" className={cn("px-6", blank && "scale-[0.97]")} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* The two placeholders' own widths, measured in the real desk: the title's
   204px at 26px and 236px at 30px, and the body's sentence, 375px on one line
   from sm and broken at 286 and 85 by a phone's 308px column. */
const BLANK = ["w-[286px] max-w-full sm:w-[375px]", "w-[85px]"];
const DRAFT = ["w-full", "w-full", "w-11/12", "w-full", "w-3/4"];
