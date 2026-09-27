"use client";

/* ------------------------------------------------------------------ *
 *  <GuideCover> — the first page of the first-run tour: the valley
 *  photograph the sign-in page opens on, filling the whole window,
 *  with its title and the way back to it set over its foot.
 *
 *  The owner, 2026-09-27, asked for this page "on its own beautiful
 *  window", said its two points are "this is a how to use and you can
 *  tap the title to get back to it", and turned down two drafts: one
 *  that summarised every chapter, and one that set two lines in a
 *  mostly empty column ("different fonts alignments and a fucking
 *  metric ton of uneven distasteful whitespace"). So there is no
 *  column here to leave empty: the photograph is the page.
 *
 *  The one line under the title is the way back; the owner cut the line
 *  that said what the tour was ("delete this"). Nothing is new to the eye
 *  but the photograph. The title and the line are the chapters' own face,
 *  size and measure; the dots and
 *  Next stand exactly where the chapters' footer puts them, and the X
 *  exactly where the header puts it, so when Next fades the cover away
 *  the controls do not move and the first chapter is already in place
 *  beneath it (guide-overlay.tsx).
 *
 *  Over a photograph: white text on a fade to black that rises from the
 *  foot of the picture, as the Feed rail's Collection card sets its
 *  caption; the dots take StepDots' photo tone and Next is a pill in
 *  the card's paper, because canopy on a darkened photograph is green on
 *  near-black.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import { ArrowRight, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODAL_CLOSE } from "@/components/ui/dialog";
import { StepDots } from "@/components/common/step-dots";
import { cn } from "@/lib/utils";
import type { GuidePhoto } from "./guide-photos";
import { DoorHint } from "./tap";

const PAPER = "text-white/90";

export function GuideCover({
  photo,
  title,
  steps,
  nextShort,
  onNext,
  close,
}: {
  photo: GuidePhoto;
  title: string;
  steps: number;
  nextShort: string;
  onNext: () => void;
  close: () => void;
}) {
  return (
    <div className="relative size-full" style={{ backgroundColor: photo.tint }}>
      {/* Both cuts, and CSS picks one at the same breakpoint as the rest of
          the sheet, so a window dragged across it never shows the wrong one
          for a frame. Lazy, so the one that is display:none never loads. */}
      <Image
        src={photo.tall}
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="object-cover lg:hidden"
        style={{ objectPosition: photo.focus }}
      />
      <Image
        src={photo.wide}
        alt=""
        fill
        unoptimized
        sizes="1120px"
        className="hidden object-cover lg:block"
        style={{ objectPosition: photo.focus }}
      />
      {/* The shade the words stand on, rising from the foot to a little past
          half height, and a faint one at the head for the X on bright sky. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 from-0% via-black/45 via-34% to-transparent to-62%"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/40 to-transparent"
      />

      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className={cn(
          MODAL_CLOSE,
          PAPER,
          "absolute top-5 right-[18px] hover:text-white lg:top-10 lg:right-[42px] drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]",
        )}
      >
        <XIcon aria-hidden="true" />
      </button>

      <div className="absolute inset-x-0 bottom-0">
        <div className="px-6 lg:px-12">
          <h2 className="font-heading text-[1.75rem] font-bold leading-[1.15] tracking-[-0.028em] text-white lg:text-[2rem]">
            {title}
          </h2>
          <p className={cn("mt-3 max-w-[34rem] text-base leading-[1.65] text-pretty", PAPER)}>
            To come back to it later, <DoorHint />.
          </p>
        </div>
        {/* The chapters' footer, to the pixel: same insets, same bottom. */}
        <div
          className="mt-8 flex items-center gap-3 px-6 pt-3 lg:px-12"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <StepDots
            tone="photo"
            count={steps}
            current={0}
            onPick={() => {}}
            labelFor={(i) => `Step ${i + 1}`}
          />
          <Button
            className="ml-auto bg-card text-canopy"
            onClick={onNext}
          >
            Next: {nextShort}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
