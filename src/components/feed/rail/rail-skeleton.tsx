import { Fragment } from "react";
import { IdentityRowSkeleton } from "@/components/common/identity-row";

/**
 * The feed's right rail before it arrives.
 *
 * Two modules, not four. FeedRail's modules each hide themselves when they
 * have nothing real to show, and these are the two nearly every member gets:
 * "From the Collection" (hidden only while the archive holds no landscape
 * photograph) and "New in the directory" (hidden only from an unconfirmed
 * account). "This week in Letters" needs a letter in the last week, so a
 * placeholder for it would promise a card that usually never comes.
 *
 * RailCard's own shell (rail-card.tsx) and each module's own numbers: the
 * microhead's 10.5px type on the body's leading, 6px over the content; the
 * photograph's 150px frame; seven 40px rows at py-2.5 with the last one's
 * bottom padding dropped and a hairline from the name's edge between each.
 * Measured against the real rail at 1440: 206px and 472px, 16px apart.
 */
export function FeedRailSkeleton() {
  return (
    <div className="sticky top-7 space-y-4">
      <RailCardSkeleton labelWidth="w-32">
        <div className="skeleton-warm h-[150px] w-full rounded-[var(--radius-md)]" />
      </RailCardSkeleton>
      <RailCardSkeleton labelWidth="w-36">
        {NAME_WIDTHS.map((nameWidth, i) => (
          <Fragment key={i}>
            {i > 0 && <div aria-hidden className="ml-[52px] h-px bg-border" />}
            <IdentityRowSkeleton
              nameSize={13.5}
              nameWidth={nameWidth}
              metaWidth="w-16"
              className={i < NAME_WIDTHS.length - 1 ? "py-2.5" : "pt-2.5"}
            />
          </Fragment>
        ))}
      </RailCardSkeleton>
    </div>
  );
}

/* One per row of DirectoryModule's `take: 7`. Names are different lengths;
   seven equal bars read as a table. */
const NAME_WIDTHS = ["w-28", "w-24", "w-32", "w-28", "w-36", "w-24", "w-32"];

function RailCardSkeleton({ labelWidth, children }: { labelWidth: string; children: React.ReactNode }) {
  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="mb-1.5 flex h-[15.75px] items-center">
        <div className={`skeleton-warm h-2 rounded-md ${labelWidth}`} />
      </div>
      {children}
    </section>
  );
}
