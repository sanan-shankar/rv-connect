import { IdentityRowSkeleton } from "@/components/common/identity-row";
import { cn } from "@/lib/utils";

/**
 * A feed post before it arrives, drawn on PostCard's own measurements.
 *
 * ONE placeholder for both waits the feed has, and that is the point of the
 * file. /feed loads in two steps: `feed/loading.tsx` stands in for the page
 * while the server renders it, and then PostFeed stands in for the posts while
 * it fetches them from the client. Each step used to draw its own card -- p-6
 * with a divider in one, p-5 with no action row in the other, neither of them
 * PostCard's p-4 -- so the column changed shape twice on its way to the posts.
 * Both steps now draw this, and the handover between them moves nothing.
 *
 * Every number is PostCard's (post-card.tsx) and IdentityRow's, measured at
 * 1440 and 390: the 40px bird, the name's 14px line and the batch line's
 * 10.5px one 5px apart and centred on it, the body's 25.5px line boxes (15px
 * at leading 1.7) 10px under the header, and the 32px action row pulled out
 * by the same -mx-2.5 and back up by the same -mb-[9px]. So the card is the
 * height a post of `lines` lines really is: 164px for two.
 *
 * Bars sit inside their line boxes rather than standing in for them, which is
 * what keeps the heights honest when the bar is thinner than the type.
 */
export function PostCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card p-4">
      <IdentityRowSkeleton />

      <div className="mt-2.5">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex h-[25.5px] items-center">
            <div
              className={cn(
                "skeleton-warm h-3 rounded-md",
                i === lines - 1 && lines > 1 ? "w-3/5" : "w-full"
              )}
            />
          </div>
        ))}
      </div>

      {/* The heart and the comments at the left, each an icon and its count;
          the bookmark and the share at the right. Placed where the glyphs
          land inside their buttons' own padding, not where the buttons
          start. */}
      <div className="mt-1.5 -mx-2.5 -mb-[9px] flex h-8 items-center gap-1">
        <div className="px-2.5">
          <div className="skeleton-warm h-[18px] w-[38px] rounded-full" />
        </div>
        <div className="px-2.5">
          <div className="skeleton-warm h-[18px] w-[31px] rounded-full" />
        </div>
        <div className="ml-auto grid h-[30px] w-[33px] place-items-center">
          <div className="skeleton-warm size-[18px] rounded-full" />
        </div>
        <div className="grid h-[30px] w-[38px] place-items-center">
          <div className="skeleton-warm size-[18px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** The three cards a feed opens on. Different lengths, because three
 *  identical cards read as a table rather than as people writing. */
export function PostListSkeleton() {
  return (
    <div className="space-y-2.5">
      <PostCardSkeleton lines={2} />
      <PostCardSkeleton lines={1} />
      <PostCardSkeleton lines={3} />
    </div>
  );
}
