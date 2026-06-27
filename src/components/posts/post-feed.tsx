"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { PostCard, type PostData } from "./post-card";
import { loadPosts } from "@/app/(main)/feed/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type SortBy = "recent" | "liked" | "commented";
type TimeFilter = "all" | "today" | "week" | "month" | "year";

export function PostFeed({
  groupId,
  showControls = true,
  reloadKey = 0,
  emptyTitle,
  emptyHint,
}: {
  groupId?: string;
  showControls?: boolean;
  reloadKey?: number;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchPosts = useCallback(
    (next: string | null) =>
      loadPosts({
        cursor: next,
        groupId,
        search: search || undefined,
        sortBy,
        timeFilter,
      }),
    [groupId, search, sortBy, timeFilter]
  );

  // First page whenever filters, group, or an external reload trigger change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPosts(null).then((data) => {
      if (cancelled) return;
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPosts, reloadKey]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const data = await fetchPosts(cursor);
    setPosts((prev) => [...prev, ...data.posts]);
    setCursor(data.nextCursor);
    setHasMore(data.hasMore);
    setLoadingMore(false);
  }

  const [animateRef] = useAutoAnimate();

  return (
    <div className="space-y-4">
      {showControls && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <MagnifyingGlass
              weight="regular"
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search the valley..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 rounded-full border-border bg-card pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-10 w-[150px] rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="liked">Most liked</SelectItem>
              <SelectItem value="commented">Most discussed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="h-10 w-[130px] rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Posts as a ruled sheet */}
      {loading ? (
        <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-border px-5 py-4 last:border-0">
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
      ) : posts.length === 0 ? (
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
          <p className="font-heading text-lg tracking-tight text-foreground">
            {search
              ? "No posts match your search."
              : emptyTitle || "No stories yet. Be the first to share a memory."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {search
              ? "Try different keywords or clear your search."
              : emptyHint ||
                "Write about your time in the valley, share an update, or post a photo."}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={animateRef}
            className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
          >
            {posts.map((post) => (
              <PostCard key={post.id} post={post} variant="sheet" />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
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
      )}
    </div>
  );
}
