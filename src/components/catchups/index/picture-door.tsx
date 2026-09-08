/* ------------------------------------------------------------------ *
 *  The shelf on /catchups, and the two pieces every card on it is made
 *  of: a door, and the words written on a photograph (build phase 6).
 *
 *  A CARD IS A DOOR (architecture.md section 3). A bordered card means
 *  "this opens something" and the WHOLE rectangle is the target.
 *  Everything that is not a door sits on the page's own paper. That one
 *  rule retires five separate complaints at once: the dead "Round 1 is
 *  out" tile whose only live pixels were five words of link (brief 35,
 *  "the rest of the tile is just dead, which is so dumb"), the View
 *  button that existed because the tile around it was not clickable
 *  (brief 3), the "open it on its own page" link printed inside a tile
 *  already on that page, the three dots wedged in beside View (brief
 *  24), and the hover that darkened a shape nobody could name (brief 9)
 *  -- a door highlights as one rectangle because it is one rectangle.
 *
 *  The link is one stretched anchor BEHIND the content rather than a
 *  wrapper around it, so a control with its own job (the archive
 *  gesture's button) can sit on top and win the tap without nesting an
 *  interactive element inside a link.
 *
 *  Transplanted from `Door` in src/app/lab/catchups/sketches/_cover.tsx,
 *  which he approved, with one change forced by the move: the room's
 *  version takes an `onOpen` callback because a lab room has no routes.
 *  Here it takes an href and is a real anchor, so the browser's own
 *  middle-click, open-in-new-tab and status bar all work.
 * ------------------------------------------------------------------ */

import type { ReactNode } from "react";
import Link from "next/link";
import { PICTURE_SCRIM } from "@/lib/catchup-pictures";
import { cn } from "@/lib/utils";

/* ── the card's two forms, and the one number that switches them ─────
 *
 *  The drawing has a card at 5:2 on a laptop and 16:9 on a phone, and the lab
 *  room switched between them on a toggle it drew the whole page with. A
 *  shipped page needs a real breakpoint, and the app's own `sm` (640px) is the
 *  wrong one: at 639 the shelf is one column, so a card is 599px wide and 338
 *  tall, and at 640 it is 584 by 235. A 103px jump on one pixel of viewport,
 *  measured.
 *
 *  500px instead, and the reason is the CARD rather than the window: below it
 *  a card is at most 460px wide, and the widest phone in portrait is 430, so
 *  that is exactly the width past which a card has stopped being phone-shaped.
 *  The jump there is 74px and it lands where nothing is holding a phone.
 *
 *  Both card types import these, so the Catch-up card and the Edition cover
 *  can never drift into two shelves of different heights. */
export const CARD_FRAME = "aspect-[16/9] min-[500px]:aspect-[5/2]";

/* ── the shelf, and the one breakpoint it turns on ───────────────────
 *
 *  `rail-grid.ts` exists because this exact thing went wrong once: "This used
 *  to be hand-copied as a class literal across both pages and both loading
 *  skeletons; the numbers live here once so a rail tweak can never miss a
 *  file." The list has no rail any more, so it cannot use that module -- but
 *  it has the same two copies to keep in step, the page and its skeleton, and
 *  a third rule that has to agree with them.
 *
 *  1180px is the app's own two-column floor, the same number `rail-grid.ts`
 *  turns on, so the shelf goes wide exactly where the rest of the app does.
 *  Two up and no more: three Catch-ups are two and then one, with a
 *  card-sized gap beside the last, and that gap is his -- "if they have three
 *  catch ups let them just be quarter like it was. don't do this filling up
 *  the page thing." It also keeps every photograph at or under its own
 *  resolution: a card spanning 1,184px would ask a 1,280px source to fill
 *  2,368 device pixels, which is the "extremely pixellated" he does not want.
 *
 *  These two are a PAIR. The archived rows sit under the first column, so
 *  their width is the grid's own column arithmetic and it has to turn on at
 *  the same pixel. Tailwind needs a literal to see a class at all, so they
 *  cannot share the number -- they can at least sit next to each other. */
export const LIST_GRID = "grid grid-cols-1 gap-5 min-[1180px]:grid-cols-2";
export const LIST_FIRST_COLUMN = "min-[1180px]:max-w-[calc((100%-1.25rem)/2)]";

/** What a card-wide photograph is actually drawn at, measured on the shipped
 *  page: 538px at 1440 (two up inside the 1096px shelf), the whole column
 *  between 768 and 1180 where the shelf is one card wide, and 350 at 390.
 *  One string, because both card types draw a card-wide photograph and a
 *  remeasurement must not have to find two copies. */
export const CARD_IMAGE_SIZES = "(min-width: 1180px) 548px, (min-width: 768px) 760px, 100vw";
const CARD_PAD = "px-4 pt-4 pb-[13px] min-[500px]:px-5 min-[500px]:pt-5 min-[500px]:pb-[17px]";
const CARD_TITLE = "text-[21px] min-[500px]:text-[24px]";

export function PictureDoor({
  href,
  label,
  children,
  className,
}: {
  href: string;
  /** What the anchor is called, since the card's own words are decorative
   *  ink on a photograph and a screen reader should hear a destination. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "state-layer card-elevated group relative overflow-hidden rounded-[var(--radius)] border border-border bg-card",
        className
      )}
    >
      <Link
        href={href}
        aria-label={label}
        /* offset-[-3px] rather than the usual +2: the outline is drawn INSIDE
           a card that is clipped to its own radius, so an outward offset is
           cut off by the overflow above and the card looks unfocused. */
        className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
      />
      {/* pointer-events-none so the whole card really is the target and not
          just the gaps between its words. Anything needing its own tap turns
          them back on. */}
      <div className="pointer-events-none relative z-10">{children}</div>
    </article>
  );
}

/** The fade under the words. One constant, shared with the home's head. */
export function CardScrim() {
  return <span aria-hidden className="absolute inset-0" style={{ background: PICTURE_SCRIM }} />;
}

/**
 * The words, written on the bottom-left of a photograph.
 *
 * THE INK, NOT THE BOX, is what the padding has to match. His, 2026-09-07:
 * "those two need to be moved a tiny bit down so that the padding on the
 * subtitle on the bottom is the same as to the left. right now the bottom
 * margin is a bit more."
 *
 * Measured in the room: with a uniform p-4 the left inset is 16 and the
 * subtitle's ink sits 19 above the card's foot, because the 3.4px of
 * half-leading a 13.5px line at 1.5 carries under its own baseline. So the
 * bottom padding comes down 3 and the whole block with it. 13 and 17 look
 * like odd numbers and are not: they are 16 and 20 minus the leading the eye
 * cannot see.
 *
 * THE TYPE RULE (architecture.md, "The type rule"): serif is a title or a
 * name -- a Catch-up's name, and the date that identifies an Edition. Sans is
 * the app talking -- a state line, a label. So `title` is always the heading
 * face and `line` is always sans, whatever each one happens to be saying.
 */
export function CardCaption({ title, line }: { title: string; line?: string }) {
  return (
    <span className={cn("absolute inset-x-0 bottom-0", CARD_PAD)}>
      {/* TWO LINES, AND IT IS A PRESSURE FINDING RATHER THAN a preference.
          `actions.ts` caps a Catch-up's name at 80 characters; drawn at 390
          with all 80, the name took four lines, covered the photograph from
          18px below the card's top to its foot, and put its first line above
          where the scrim has any ink in it at all -- so on a bright picture it
          would have been white on white. Two lines leaves the top 88px of the
          photograph showing at 390 and 92 at 1440, and a name that needs more
          than two lines at 21px was never going to be read off a shelf.
          The clamp is on this span rather than on the padded box around it:
          `overflow: hidden` clips at the PADDING box, so a clamp written one
          level up bleeds a band of the third line under the second (spec 4.3,
          proved on the reader's question rows). */}
      <span
        className={cn(
          /* No `block` beside it: `line-clamp-2` IS a display utility
             (-webkit-box), and Tailwind emits `display:block` after it, so the
             two together silently cancel the clamp. Measured: with both, an
             80-character name still drew four lines. */
          "line-clamp-2 font-heading leading-[1.2] tracking-[-0.015em] text-white",
          CARD_TITLE
        )}
        /* A photograph is not a background colour: a name over a sunlit patch
           of one has no contrast at all. The shadow is wide and weak rather
           than tight and dark, so it reads as the picture receding rather
           than as an outline around the letters. */
        style={{ textShadow: "0 1px 12px rgb(0 0 0 / 0.4)" }}
      >
        {title}
      </span>
      {line && <span className="mt-1 block font-sans text-[13.5px] text-white/80">{line}</span>}
    </span>
  );
}
