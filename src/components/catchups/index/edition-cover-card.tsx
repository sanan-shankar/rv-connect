/* ------------------------------------------------------------------ *
 *  An Edition's cover, filling a spare slot on /catchups (spec 5).
 *
 *  Decided by him on 2026-09-07, and drawn here for the first time:
 *
 *    "regarding the one catch up page let's just show the latest
 *    editions in a preview like we're doing but on that page! I think
 *    that would work well. let's do it so it maxes at 4. that is if they
 *    have one catch up then max latest 3 editions. if they have 2 catch
 *    ups the the latest two editions whichever one they're from. if they
 *    have four catch up, no need to show editions there. we'd have to
 *    show the date and from which catch up it is if there's more than
 *    one catch up. and just so it's obvious that they're different types
 *    of elements maybe include the fact that it's the latest editon
 *    somewhere on the card in a pretty way."
 *
 *  DRAW THE COVER, NOT THE TEASER. This is close to "Fresh off the
 *  press", which he had deleted, and the difference matters: what made
 *  that one wrong was a rail of quoted first sentences with a curved
 *  divider and a padding-less hover, not the idea of showing what is
 *  new. So an Edition here is what an Edition is everywhere else in this
 *  rework -- its photographs (architecture.md section 1) -- and it
 *  carries no quoted answer, no count, and no Edition number.
 *
 *  ── "obvious they're different types of elements", the second attempt ──
 *
 *  The first version wrote the date onto the photograph exactly the way
 *  a Catch-up card writes its name, and was drawn and looked at at 1440.
 *  It failed his test outright: three of the five published Editions on
 *  this database have no photograph in them at all, so the cover fell
 *  back to its Catch-up's own picture and came out as a slightly paler
 *  copy of the card two inches to its left, same picture, same words in
 *  the same corner. A 2px mark was carrying the whole distinction and
 *  could not be seen.
 *
 *  So the cover has a FOOT: the picture stops short and the date is set
 *  on the card's own paper under it. That is one glance rather than a
 *  detail -- a card with a caption bar is a different object from a
 *  photograph with words on it, at any size and whatever the picture
 *  turns out to be -- and it is also the shape the home's Earlier
 *  Editions covers already have, so this is not a second way of drawing
 *  an Edition.
 *
 *  It keeps the Catch-up card's OUTLINE, though: the same 5:2 on a
 *  laptop and 16:9 on a phone, with the picture taking whatever the foot
 *  leaves. Same rectangle, different construction -- so the shelf has no
 *  ragged row in it and the difference is in the object rather than in
 *  its size.
 *
 *  THE MEASURE beside the date is the read mark, and it is the whole of
 *  it: cinnamon while the Edition is unread, the page's own hairline
 *  once it has been opened. A yes or a no, never "read by 9 of 23"
 *  (R32). Cinnamon is the app's own "there is something here" -- it is
 *  what the bell wears for an unread notification -- and the 2px rounded
 *  rule is the reader's own measure, seen small.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import { COVER_SHOTS, coverTiles } from "@/lib/catchup-pictures";
import { cn, formatDisplayDateLong } from "@/lib/utils";
import { CARD_FRAME, CARD_IMAGE_SIZES, PictureDoor } from "./picture-door";

export type ListEdition = {
  editionId: string;
  publishedAt: Date | string;
  /** Up to three photographs from inside it, in the order they appear. */
  photos: string[];
  /** The Catch-up it came from. Printed only when the member has more than
   *  one -- with one, saying so is the same fact twice. */
  fromName: string | null;
  /** Its Catch-up's own picture, for an Edition nobody photographed. */
  fallback: { src: string; focus: string };
  read: boolean;
};

export function EditionCoverCard({ e }: { e: ListEdition }) {
  const shots = e.photos.slice(0, COVER_SHOTS);
  const date = formatDisplayDateLong(e.publishedAt);
  return (
    <PictureDoor href={`/catchups/edition/${e.editionId}`} label={`Read the Edition from ${date}`}>
      {/* The Catch-up card's outline, with the picture given whatever the foot
          leaves rather than a ratio of its own. That is what keeps two
          differently built cards the same height in one grid. */}
      <span className={cn("flex w-full flex-col", CARD_FRAME)}>
        <span className="relative block min-h-0 flex-1 overflow-hidden bg-muted">
          {shots.length > 0 ? (
            <span className={cn("grid h-full w-full gap-[3px] bg-border", coverTiles(shots.length))}>
              {shots.map((src, i) => (
                <span
                  /* By position: an Edition's first photographs can repeat one
                     url, and a duplicate React key is a child React may
                     silently drop. */
                  key={`${i}-${src}`}
                  className={cn(
                    "relative block overflow-hidden bg-muted",
                    // The lead, so an Edition reads as having a picture rather
                    // than as a contact sheet.
                    shots.length > 2 && i === 0 && "col-span-2 row-span-2"
                  )}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(min-width: 1180px) 366px, (min-width: 768px) 508px, 68vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </span>
              ))}
            </span>
          ) : (
            /* Nobody photographed this one. The Catch-up's own picture stands
               in, so the shape never changes and a cover is never empty
               (architecture.md section 5). Three of the five published
               Editions on this database are in that state today, so it is the
               common case rather than the edge -- which is exactly why the
               foot below has to do the distinguishing and a mark on the
               picture cannot.

               AT FULL STRENGTH, unlike the home's version of the same
               fallback. There it stands in for a back number and being
               quietened is right; here it is the newest thing the member has,
               and a 70% photograph beside two at 100% reads as faded rather
               than as calm -- looked at, at 1440, before it was changed. */
            <Image
              src={e.fallback.src}
              alt=""
              fill
              sizes={CARD_IMAGE_SIZES}
              style={{ objectPosition: e.fallback.focus }}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          )}
        </span>
        {/* THE TYPE RULE: the date is the Edition's NAME, so it is the heading
            face; where it came from is the app talking, so it is sans and
            quiet. Fixed heights rather than padding, because this bar is what
            the picture above it is sized against. */}
        <span className="flex h-[38px] shrink-0 items-center gap-2.5 border-t border-border bg-card px-4 min-[500px]:h-[42px] min-[500px]:px-5">
          <span
            aria-hidden
            className={cn(
              "h-[17px] w-[2px] shrink-0 rounded-full",
              e.read ? "bg-border" : "bg-cinnamon"
            )}
          />
          <span className="truncate font-heading text-[15px] tracking-[-0.01em] text-foreground min-[500px]:text-[16px]">
            {date}
          </span>
          {e.fromName && (
            <span className="ml-auto min-w-0 truncate font-sans text-[12.5px] text-muted-foreground">
              {e.fromName}
            </span>
          )}
        </span>
        {/* The measure is a colour, so it says nothing to a screen reader.
            This does, once, where a reader is already listening. */}
        {!e.read && <span className="sr-only">Not read yet.</span>}
      </span>
    </PictureDoor>
  );
}
