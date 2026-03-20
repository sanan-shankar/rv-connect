"use client";

import { useState, useEffect } from "react";
import { PostCard, type PostData } from "./post-card";
import { loadPosts } from "@/app/(main)/feed/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PostFeed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadPosts().then((data) => {
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setLoading(false);
    });
  }, []);

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const data = await loadPosts(cursor);
    setPosts((prev) => [...prev, ...data.posts]);
    setCursor(data.nextCursor);
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="font-heading text-lg text-foreground">
          No stories yet — be the first to share a memory!
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Write about your time at Rishi Valley, share a life update, or post a
          photo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {cursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
