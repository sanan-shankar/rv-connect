"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
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

export function PostFeed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      return loadPosts({
        page: pageNum,
        search: search || undefined,
        sortBy,
        timeFilter,
      });
    },
    [search, sortBy, timeFilter]
  );

  // Reset and reload when filters change
  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchPage(0).then((data) => {
      setPosts(data.posts);
      setHasMore(data.hasMore);
      setLoading(false);
    });
  }, [fetchPage]);

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    const data = await fetchPage(nextPage);
    setPosts((prev) => [...prev, ...data.posts]);
    setHasMore(data.hasMore);
    setPage(nextPage);
    setLoadingMore(false);
  }

  return (
    <div className="space-y-4">
      {/* Search + Sort controls */}
      <div className="glass rounded-xl p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortBy)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="liked">Most Liked</SelectItem>
              <SelectItem value="commented">Most Commented</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={timeFilter}
            onValueChange={(v) => setTimeFilter(v as TimeFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
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
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="font-heading text-lg text-foreground">
            {search
              ? "No posts match your search."
              : "No stories yet — be the first to share a memory!"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {search
              ? "Try different keywords or clear your search."
              : "Write about your time at Rishi Valley, share a life update, or post a photo."}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {hasMore && (
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
        </>
      )}
    </div>
  );
}
