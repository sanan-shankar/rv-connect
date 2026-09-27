import { memo } from "react";
import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { batchLine, metaLine } from "@/lib/utils";
import { shortPlaceLabel } from "@/lib/normalize";
import type { DirectoryPerson } from "@/app/(main)/directory/select";

/* ------------------------------------------------------------------ *
 *  How a person renders in a result set.
 *
 *  Owner: "when you click on a certain batch it shows everyone's cards a
 *  bit too big, there's too much white space in these cards ... maybe we
 *  can show it with like the bird and then the name on the right of the
 *  bird instead of everything stacked under it. Vertical space is at a
 *  premium here."
 *
 *  This is the pick from /lab/directory, where four densities were
 *  measured against the same twelve people rather than argued about.
 *  What the numbers said, in people per 1000px of column:
 *
 *                     at 1440   at 390
 *    Shipped card       15         5
 *    Compact card       41        13
 *    Row, no box        18        18
 *    Ruled list         16        16
 *
 *  So the answer is BOTH, and the room says so: compact card in the grid
 *  on desktop, row on a phone. The compact card wins on a wide screen not
 *  by being short but by keeping the three-up grid, because density
 *  across 1112px is a horizontal problem; a single-column list throws
 *  away two thirds of that column however short its rows get. On a phone
 *  that inverts, the grid collapses to one column, and the row is the
 *  only one of the four whose cost does not change with width at all.
 *
 *  They are the same lockup with and without a box around it, which is
 *  why this is ONE component and a breakpoint rather than two components
 *  that have to be kept in step.
 *
 *  What went, in both: the 64px avatar (a profile-header size doing list
 *  work) and the centring. Centring guaranteed the name, the batch and
 *  the city each started at a different x, so a column of them could not
 *  be scanned downward at all. Bird left, text beside it, one left edge.
 * ------------------------------------------------------------------ */

interface ProfileCardProps {
  /** Every column `PERSON_SELECT` fetches, and the card reads all of them. */
  user: DirectoryPerson;
  /** The list is filtered to this person's city, so saying it again on every
   *  row is noise (owner, 2026-09-27: "now I'm in people filtering with
   *  Bengaluru [...] and then everyone says Bengaluru. But, like, obviously,
   *  because I am filtering by that"). A row whose city is a DIFFERENT one,
   *  someone who lists Bengaluru second, keeps it: that is news. */
  hideCity?: boolean;
}

function Card({ user, hideCity = false }: ProfileCardProps) {
  /* One meta line, not two rows of icon+label. The MapPin and Briefcase
     glyphs were 3 of the card's ~12 words' worth of ink and said nothing the
     values did not: nobody reads "Chennai" and wonders whether it is a city.
     metaLine drops the dot with an absent segment, so a member with no city
     and no job leaves no stray punctuation. */
  const meta = metaLine(
    batchLine(user),
    user.jobTitle,
    user.currentCity && !hideCity ? shortPlaceLabel(user.currentCity) : null
  );

  return (
    // The ring goes on the Link (the focusable node) at the card's own radius,
    // so keyboard focus outlines the card and not a shrink-wrapped inline box.
    /* `content-visibility: auto` is why a 60-card grid arrives in one
       frame. It lets the browser skip style, layout and paint for any
       card that is not near the window -- and on /directory that is
       most of them: the grid is 1624px tall in a 900px window on a
       desktop, 3360px in an 844px one on a phone. Entering People cost
       a 967ms frame before this pass and 1289ms of pure browser work
       (layout, style, paint -- no JavaScript at all) in a 3.8s profile
       at 4x throttle; skipping five sixths of it is the only way that
       number comes down, because no amount of React care makes the
       browser lay out 60 cards faster than it can.
       The size hint is the measured card at each breakpoint (66px in
       the sm grid, 56px as a phone row), and `auto` means it is only
       ever a first guess: once a card has been rendered the browser
       remembers its real height, so nothing jumps on the way back up.
       It rides on the lockup below rather than on this Link, and that
       is not cosmetic: `content-visibility` brings paint containment
       with it, which clips what DESCENDANTS paint outside the box. The
       elevation is a box-shadow on the lockup, spreading ~30px past its
       own edge -- put the property on this Link and the shadow becomes
       a descendant's and is clipped away, which is a card that has
       quietly lost its lift. An element's own shadow is never clipped
       by its own containment, so one level down it is safe. */
    <Link
      href={`/profile/${user.id}`}
      className="group block rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* Below sm this is the ROW: no border, no card surface, no shadow, so a
          phone shows a plain series of people. From sm up the same lockup gains
          the box and becomes the compact card in the grid.
          Padding is the optical-correction pair (14px sides and bottom, 10px
          top, i.e. 14 / 1.4 line-height), so the lockup does not sit low in its
          own box. */}
      {/* The elevation is written out rather than reusing `.card-elevated`:
          that lives in globals.css's @layer components, which is a plain class
          and not a registered utility, so `sm:card-elevated` generates nothing.
          Values are byte-identical to it, tint included. */}
      <div className="state-layer flex items-center gap-3 rounded-[var(--radius)] px-2.5 py-2 [content-visibility:auto] [contain-intrinsic-size:auto_56px] sm:[contain-intrinsic-size:auto_66px] transition-colors duration-200 sm:border sm:border-border sm:bg-card sm:p-3.5 sm:pt-2.5 sm:shadow-[0_1px_2px_rgb(var(--shadow-ink)/0.04),0_18px_40px_-28px_rgb(var(--shadow-ink)/0.5)] sm:group-hover:border-canopy/40">
        <BirdAvatar
          user={{ id: user.id, name: user.name, photoUrl: user.photoUrl, birdOverride: user.birdOverride }}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 truncate text-[14.5px] font-semibold leading-tight tracking-tight text-foreground group-hover:underline">
            <span className="truncate">{user.name}</span>
            <VerifiedMark user={user} />
          </h3>
          {meta && (
            <p className="mt-0.5 truncate text-[12.5px] leading-tight text-muted-foreground">
              {meta}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 *  Why this is memoised, when almost nothing else in the app is.
 *
 *  Every filter change on /directory is a navigation, so the server
 *  hands down a FRESH array of fresh objects -- including for the
 *  people who were already on screen and did not change. Without this,
 *  narrowing 84 people to 46 re-renders 46 cards that are pixel-identical
 *  to the ones already there, each one rebuilding a BirdAvatar's SVG
 *  glyph, and it does it in the same frame as the grid's re-form
 *  animation. Measured at 4x CPU throttle on 2026-09-16, that was the
 *  single largest remaining long task on the page.
 *
 *  The comparator walks EVERY key rather than naming the ones the card
 *  reads, and that is deliberate: a named list is a second copy of the
 *  card's data dependencies that rots the first time somebody adds a
 *  field. `DirectoryPerson` is derived from `PERSON_SELECT`, which is
 *  ten flat scalars with no nested objects, so key-by-key IS a complete
 *  comparison -- and a future column, being another scalar, is covered
 *  the moment it is added. If one ever arrives that is an array or an
 *  object (`places`, say, as PIN_SELECT already has), this returns
 *  false every time and the card simply renders as it does today.
 *
 *  `hideCity` is the one prop that is not the person, and is compared
 *  first: the same person moving in or out of a city filter has to
 *  re-render, or their row keeps the city it was drawn with.
 * ------------------------------------------------------------------ */
export const ProfileCard = memo(Card, (prev, next) => {
  if (prev.hideCity !== next.hideCity) return false;
  const a = prev.user as Record<string, unknown>;
  const b = next.user as Record<string, unknown>;
  for (const key in a) if (a[key] !== b[key]) return false;
  for (const key in b) if (!(key in a)) return false;
  return true;
});
ProfileCard.displayName = "ProfileCard";
