"use client";

/* ------------------------------------------------------------------ *
 *  The head of a Catch-up's home: the picture, the name written on it,
 *  and the two doors.
 *
 *  His, 2026-09-07: "the photo on top should not just be a photo. Let's
 *  have it fade to black and again have the name, and then let's have a
 *  People or some other word that conveys that sentiment, which is
 *  clearly clickable. And when you click it, we can pull up a dialog
 *  that lists the people." Then: "instead of people and settings keep
 *  the buttons in the same style but use the icons instead of text."
 *
 *  So the head is the list's own card at page width: picture, dark fade,
 *  words on it. "Again" is the operative word -- the two surfaces say a
 *  Catch-up's identity the same way, which is the whole point of the
 *  picture ("it's almost like a group chat photo").
 *
 *  A HEIGHT, NOT A RATIO, and that is the fix for two of his notes at
 *  once. A ratio ties the banner to the window: at 1512 a 4:1 banner is
 *  269px and at 1920 it is 350, so the wider the screen the more of the
 *  page it eats -- and a fixed 5:1 made the crop worse rather than the
 *  picture smaller ("the header photo looks so bad"). A fixed height
 *  does the opposite: a wider window shows MORE of the photograph, never
 *  a thinner slice of it.
 *
 *  240 on a laptop, and 172 on a phone -- a third taller than the 132 it
 *  was drawn at first, at his word: "on mobile you can make the header
 *  photo 30% taller." A phone column is about 350px wide, so 132 was a
 *  2.65:1 letterbox: the most severe crop anywhere in the drawing, on
 *  the smallest picture.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import { SlidersHorizontal, Users } from "lucide-react";
import { PICTURE_SCRIM } from "@/lib/catchup-pictures";
import { PictureDoor } from "@/components/catchups/settings/settings-surface";
import { cn } from "@/lib/utils";

export const HEAD_HEIGHT_PHONE = 172;
export const HEAD_HEIGHT = 240;

export function HomeHead({
  name,
  picture,
  onPeople,
  onSettings,
}: {
  name: string;
  picture: { src: string; focus: string };
  onPeople: () => void;
  onSettings: () => void;
}) {
  return (
    <header>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius)] bg-muted",
          "h-[172px] min-[500px]:h-[240px]",
        )}
      >
        <Image
          src={picture.src}
          alt=""
          fill
          sizes="(min-width: 1180px) 1180px, 100vw"
          /* Each photograph carries the band it should be cropped at. A
             centred window through most of the pool lands in the canopy and
             comes back as green texture; the horizon, the benches and the
             ground are all in the lower third. */
          style={{ objectPosition: picture.focus }}
          className="object-cover"
          priority
        />
        {/* The list card's fade, exactly: transparent for the top half, then
            away quickly, so the picture stays a picture and the words have
            ground. One gradient over 55% of a light photograph leaves the
            name on a grey wash halfway up, which reads as a bug. */}
        <span aria-hidden className="absolute inset-0" style={{ background: PICTURE_SCRIM }} />
        {/* ONE row along the foot: the name from the bottom left, the two
            doors hard right, at both widths. `items-end` and no wrapping,
            because a second row of chrome on a phone picture is the thing he
            told me not to do: "I don't want two rows of stuff for the picture
            on phone." */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 min-[500px]:p-5">
          <h1
            className="min-w-0 font-heading text-[24px] leading-[1.2] tracking-[-0.02em] text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.4)] min-[500px]:text-[30px]"
            /* Two lines at most. At the 80-character cap this took four on a
               phone and covered the whole photograph -- the same fault the
               list card hit in phase 6. `line-clamp-2` emits `display:block`
               after it, which cancels the clamp, so nothing else here may set
               a display. */
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {name}
          </h1>
          <span className="flex shrink-0 items-center gap-2">
            <PictureDoor label="People" icon={Users} onClick={onPeople} />
            <PictureDoor label="Settings" icon={SlidersHorizontal} onClick={onSettings} />
          </span>
        </div>
      </div>
    </header>
  );
}
