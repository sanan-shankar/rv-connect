import Link from "next/link";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { batchLine, metaLine } from "@/lib/utils";
import { shortPlaceLabel } from "@/lib/normalize";

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
  user: {
    id: string;
    name: string;
    photoUrl?: string | null;
    birdOverride?: string | null;
    accountType?: string | null;
    verifyState?: string | null;
    batchType: string | null;
    batchYear: number | null;
    currentCity: string | null;
    jobTitle: string | null;
  };
}

export function ProfileCard({ user }: ProfileCardProps) {
  /* One meta line, not two rows of icon+label. The MapPin and Briefcase
     glyphs were 3 of the card's ~12 words' worth of ink and said nothing the
     values did not: nobody reads "Chennai" and wonders whether it is a city.
     metaLine drops the dot with an absent segment, so a member with no city
     and no job leaves no stray punctuation. */
  const meta = metaLine(
    batchLine(user),
    user.jobTitle,
    user.currentCity ? shortPlaceLabel(user.currentCity) : null
  );

  return (
    // The ring goes on the Link (the focusable node) at the card's own radius,
    // so keyboard focus outlines the card and not a shrink-wrapped inline box.
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
      <div className="state-layer flex items-center gap-3 rounded-[var(--radius)] px-2.5 py-2 transition-colors duration-200 sm:border sm:border-border sm:bg-card sm:p-3.5 sm:pt-2.5 sm:shadow-[0_1px_2px_rgb(var(--shadow-ink)/0.04),0_18px_40px_-28px_rgb(var(--shadow-ink)/0.5)] sm:group-hover:border-canopy/40">
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
