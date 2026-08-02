"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
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
import { NoResultsHoopoe } from "@/components/mascot/moments/no-results-hoopoe";

type SortBy = "recent" | "liked" | "commented";
type TimeFilter = "all" | "today" | "week" | "month" | "year";

/** Which slice of posts to render. `author` is reserved for a later batch (needs loadPosts support). */
export type FeedScope = "all" | "author" | "group" | "letters";

const LAST_SEEN_KEY = "rv-feed-last-seen";

export function PostFeed({
  groupId,
  scope = "all",
  showControls = true,
  reloadKey = 0,
  emptyTitle,
  emptyHint,
  initialSearch,
}: {
  groupId?: string;
  scope?: FeedScope;
  showControls?: boolean;
  reloadKey?: number;
  emptyTitle?: string;
  emptyHint?: string;
  /** Seeds the search query (e.g. from the header search pill's `?q=`) even
   *  when `showControls` hides the inline search box. */
  initialSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState(initialSearch ?? "");
  const [search, setSearch] = useState(initialSearch ?? "");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The inline search input (above) covers same-mount edits; this covers a
  // fresh `?q=` arriving from the header search pill while already here (the
  // page doesn't remount, so state wouldn't otherwise pick up the new query).
  // Adjusted during render (React's documented pattern for "reset state when
  // a prop changes") rather than in an effect, so it applies in the same
  // commit instead of triggering an extra render.
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);
  if (initialSearch !== prevInitialSearch) {
    setPrevInitialSearch(initialSearch);
    if (initialSearch !== undefined) {
      setSearchInput(initialSearch);
      setSearch(initialSearch);
    }
  }

  // "New since you were last here": the timestamp of the most recent post we showed last visit.
  const [lastSeen, setLastSeen] = useState<number | null>(null);

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
        kind: scope === "letters" ? "letter" : undefined,
        search: search || undefined,
        sortBy,
        timeFilter,
      }),
    [groupId, scope, search, sortBy, timeFilter]
  );

  // Read (then refresh) the last-seen marker once on mount, per scope, so the
  // "new since last here" divider is stable for the session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${LAST_SEEN_KEY}:${groupId ?? scope}`;
    const stored = window.localStorage.getItem(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reads the last-seen timestamp out of localStorage, which has no server-side value.
    setLastSeen(stored ? Number(stored) : null);
  }, [groupId, scope]);

  // First page whenever filters, group, or an external reload trigger change.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Re-arms the skeleton whenever the filters, group or reload trigger change, so a filter change never leaves the old posts on screen.
    setLoading(true);
    fetchPosts(null).then((data) => {
      if (cancelled) return;
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
      // Stamp the newest post we just showed as the new marker for next visit.
      if (typeof window !== "undefined" && data.posts.length > 0) {
        const newest = Math.max(
          ...data.posts.map((p) => new Date(p.createdAt).getTime())
        );
        window.localStorage.setItem(`${LAST_SEEN_KEY}:${groupId ?? scope}`, String(newest));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPosts, reloadKey, groupId, scope]);

  // Index of the first post that is NOT newer than last-seen: the divider goes above it.
  // Only meaningful on the default recent sort and when there is genuinely new content.
  const dividerIndex =
    lastSeen !== null && sortBy === "recent" && !search
      ? posts.findIndex((p) => new Date(p.createdAt).getTime() <= lastSeen)
      : -1;
  const showDivider = dividerIndex > 0; // at least one new post above older ones

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
      {/* When the inline search row is hidden (the Feed page's own search now
          lives in the header pill), there's otherwise no visible way to see
          what's being searched or clear it. This small banner covers that. */}
      {!showControls && search && (
        <div className="flex items-center justify-between gap-3 rounded-full border border-border bg-card py-2 pl-4 pr-2 text-[13px]">
          <span className="min-w-0 truncate text-muted-foreground">
            Showing posts for <span className="font-semibold text-foreground">&quot;{search}&quot;</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearch("");
              router.replace(pathname);
            }}
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-canopy hover:text-canopy/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-95"
          >
            <X weight="bold" size={12} />
            Clear
          </button>
        </div>
      )}

      {showControls && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
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
            {/* Filters live behind a disclosure so the default feed stays calm. */}
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              /* state-layer sits on the base so the pill answers a cursor in
                 EITHER state: it tints whatever fill is already there rather
                 than replacing it, so the active-filter canopy wash survives its
                 own hover. Idle, the only hover used to be a text-colour shift
                 on a filled pill, which is not much of a target. */
              className={`state-layer flex h-10 shrink-0 items-center gap-2 rounded-full border border-border pl-3 pr-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] ${
                filtersOpen || sortBy !== "recent" || timeFilter !== "all"
                  ? "bg-canopy/10 text-canopy"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal weight="regular" size={16} />
              Filters
            </button>
          </div>
          {filtersOpen && (
            <div className="flex flex-wrap items-center gap-2">
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
        </div>
      )}

      {/* Posts as a ruled sheet */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
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
          {search && (
            <div className="mb-3 flex justify-center">
              <NoResultsHoopoe size={76} />
            </div>
          )}
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
          <div ref={animateRef} className="space-y-2.5">
            {posts.map((post, i) => (
              <div key={post.id} className="space-y-2.5">
                {showDivider && i === dividerIndex && (
                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                      New since you were last here
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <PostCard post={post} variant="card" />
              </div>
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
