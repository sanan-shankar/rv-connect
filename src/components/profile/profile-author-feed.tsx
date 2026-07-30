"use client";

import { useEffect, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { loadPosts } from "@/app/(main)/feed/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The Posts tab on a profile. Reuses the same loadPosts query and the shared
 * PostCard in the same ruled-sheet card the main feed uses; the only difference
 * is the authorId scope (one person's posts).
 */
export function ProfileAuthorFeed({
  authorId,
  firstName,
  isOwnProfile,
  kind,
  emptyTitle,
  emptyBody,
  layout = "sheet",
}: {
  authorId: string;
  firstName: string;
  isOwnProfile: boolean;
  /** Filter to one register; unset loads both posts and letters. */
  kind?: "post" | "letter";
  emptyTitle?: string;
  emptyBody?: string;
  /**
   * "sheet" stacks the posts inside one bordered card, divider-separated.
   * "cards" lets each post stand free on the page as its own card, exactly as
   * the feed draws it. The letterhead profile uses "cards": its masthead is
   * already a bordered sheet, and nesting bordered cards inside another
   * bordered box is the box-in-a-box the design system rules out.
   */
  layout?: "sheet" | "cards";
}) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [animateRef] = useAutoAnimate();

  // `loading` starts true and is only ever turned OFF here, from the fetch's
  // own callback. It is deliberately not re-armed synchronously at the top of
  // this effect: that is a cascading render, and callers that switch scope
  // (the profile's segmented switcher) remount this with a fresh `key`, which
  // restores the skeleton properly rather than flashing the previous scope's
  // posts under a new heading.
  useEffect(() => {
    let cancelled = false;
    loadPosts({ authorId, kind }).then((data) => {
      if (cancelled) return;
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authorId, kind]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const data = await loadPosts({ authorId, kind, cursor });
    setPosts((prev) => [...prev, ...data.posts]);
    setCursor(data.nextCursor);
    setHasMore(data.hasMore);
    setLoadingMore(false);
  }

  const asCards = layout === "cards";

  if (loading) {
    return (
      <div
        className={
          asCards
            ? "space-y-2.5"
            : "card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
        }
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={
              asCards
                ? "card-elevated rounded-[var(--radius)] border border-border bg-card p-4"
                : "border-b border-border px-5 py-4 last:border-0"
            }
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-4 h-14 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
        <p className="font-heading text-lg tracking-tight text-foreground">
          {emptyTitle ??
            (isOwnProfile ? "You haven't posted yet." : `No posts yet from ${firstName}.`)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {emptyBody ??
            (isOwnProfile
              ? "Share your first memory, a sighting, or a note for the valley."
              : "When they share something, it will show up here.")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={animateRef}
        className={
          asCards
            ? "space-y-2.5"
            : "card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
        }
      >
        {posts.map((post) => (
          <PostCard key={post.id} post={post} variant={asCards ? "card" : "sheet"} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-full"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
}
