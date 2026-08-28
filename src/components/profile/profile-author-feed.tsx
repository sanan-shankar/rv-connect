"use client";

import { useEffect, useState, useRef } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { appendUnseen } from "@/lib/append-page";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { loadPosts } from "@/app/(main)/feed/actions";
import { Button } from "@/components/ui/button";

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
  expectedCount,
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
   * How many posts this scope holds, counted on the server in the same request
   * that rendered the page. The tab pill beside this feed is ALREADY printing
   * it, so the skeleton is not a guess we have to make -- and a three-card
   * skeleton under a pill reading "0" contradicts something the reader can see.
   *
   * Two jobs. At zero it skips the skeleton entirely and opens on the empty
   * state, which is what the fetch is about to confirm; the fetch still runs,
   * so a count made stale by a post written since the page loaded corrects
   * itself. Above zero it sizes the skeleton, capped at three, so one post is
   * one placeholder rather than three.
   */
  expectedCount?: number;
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
  /** The same flag, readable in the same tick. See handleLoadMore. */
  const loadingMoreRef = useRef(false);
  const [animateRef] = useAutoAnimate();

  // `loading` starts true and is only ever turned OFF here, from the fetch's
  // own callback. It is deliberately not re-armed synchronously at the top of
  // this effect: that is a cascading render, and callers that switch scope
  // (the profile's segmented switcher) remount this with a fresh `key`, which
  // restores the skeleton properly rather than flashing the previous scope's
  // posts under a new heading.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // callAction: a rejected fetch (deploy skew, dropped network, expired
      // session) used to leave `loading` true forever, so the tab stuck on
      // its skeleton with no way out (audit B-042).
      const data = await callAction(() => loadPosts({ authorId, kind }));
      if (cancelled) return;
      if ("error" in data) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authorId, kind]);

  async function handleLoadMore() {
    // Synchronous guard and an id-dedupe, the same pair PostFeed carries and
    // for the same reason (audit C-180): `disabled={loadingMore}` binds on the
    // next render, so a double tap appends the same page twice. The dedupe
    // half is now `appendUnseen`, shared with the feed and the Collection.
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await callAction(() => loadPosts({ authorId, kind, cursor }));
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setPosts((prev) => appendUnseen(prev, data.posts));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // "Load more" disabled for the rest of the session (audit B-042).
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  const asCards = layout === "cards";

  /* Falling through to the empty state below rather than returning one here:
     the two must not drift, and the fetch may still overrule the count. */
  if (loading && expectedCount !== 0) {
    return (
      <div
        className={
          asCards
            ? "space-y-2.5"
            : "card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
        }
      >
        {Array.from({ length: Math.min(expectedCount ?? 3, 3) }, (_, i) => (
          <div
            key={i}
            className={
              asCards
                ? "card-elevated rounded-[var(--radius)] border border-border bg-card p-4"
                : "border-b border-border px-5 py-4 last:border-0"
            }
          >
            <div className="flex items-center gap-3">
              <div className="skeleton-warm h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <div className="skeleton-warm h-4 w-32 rounded-md" />
                <div className="skeleton-warm h-3 w-20 rounded-md" />
              </div>
            </div>
            <div className="skeleton-warm mt-4 h-14 w-full rounded-md" />
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
          <PostCard
            key={post.id}
            post={post}
            variant={asCards ? "card" : "sheet"}
            column="centered"
          />
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
