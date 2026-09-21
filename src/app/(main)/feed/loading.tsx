import { PageHeader } from "@/components/layout/page-header";
import { RAIL_ASIDE, RAIL_GRID } from "@/components/layout/rail-grid";
import { PostListSkeleton } from "@/components/posts/post-card-skeleton";
import { FeedRailSkeleton } from "@/components/feed/rail/rail-skeleton";

/**
 * The feed before it arrives: page.tsx's own two grids, with its header, its
 * posts and its rail each where they land.
 *
 * It used to be three p-6 cards with a divider and nothing else -- no title,
 * no search, bell or New post, no rail -- so the column started 62px higher
 * than the posts that replaced it and a 318px rail appeared out of nowhere
 * (owner, 2026-09-21: "for feed it's totally wrong").
 *
 * The title is the real one, through the real PageHeader. It needs no data,
 * so there is nothing to wait for, and it is the one thing on the screen that
 * says where the click went. Everything that is pressed or that loads is a
 * placeholder at its own size: the three 40px circles (search from sm, bell
 * from md, the New post badge always, exactly the header's own breakpoints),
 * the posts through PostFeed's own skeleton so the page arriving does not
 * move them, and the rail's two usual modules.
 */
export default function FeedLoading() {
  return (
    <>
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          <PageHeader
            title="Feed"
            search={<Control />}
            actions={
              <>
                <div className="hidden md:block">
                  <Control />
                </div>
                <Control />
              </>
            }
          />
        </div>
      </div>
      <div className={RAIL_GRID}>
        <div className="min-w-0">
          <PostListSkeleton />
        </div>
        <aside className={RAIL_ASIDE}>
          <FeedRailSkeleton />
        </aside>
      </div>
    </>
  );
}

/* A header control: the search glass, the bell and the New post badge are all
   40px circles at rest. */
function Control() {
  return <div className="skeleton-warm size-10 rounded-full" />;
}
