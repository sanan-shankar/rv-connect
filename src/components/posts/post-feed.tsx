"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
import { PostCard, type PostData } from "./post-card";
import { loadPosts, markFeedSeen } from "@/app/(main)/feed/actions";
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
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { appendUnseen } from "@/lib/append-page";

type SortBy = "recent" | "liked" | "commented";
type TimeFilter = "all" | "today" | "week" | "month" | "year";

export function PostFeed({
  showControls = true,
  reloadKey = 0,
  initialSearch,
  lastSeenAt,
}: {
  showControls?: boolean;
  reloadKey?: number;
  /** Seeds the search query (e.g. from the header search pill's `?q=`) even
   *  when `showControls` hides the inline search box. */
  initialSearch?: string;
  /** ISO createdAt of the newest post this member has already been shown,
   *  read off their account by the server component above. Null = no marker
   *  yet, and the divider stays hidden. */
  lastSeenAt?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [posts, setPosts] = useState<PostData[]>([]);
  /* Bumped whenever the query behind this list changes, so a "Load more" that
     was already in the air can tell that its page no longer belongs to what is
     on screen. See handleLoadMore (audit Low 75). */
  const listGeneration = useRef(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  /** The same flag, readable in the same tick. See handleLoadMore. */
  const loadingMoreRef = useRef(false);

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

  /* "New since you were last here": the newest post we had shown this member
   * as of their last visit, ON ANY DEVICE. It arrives from the server already
   * resolved, and is captured in state ONCE so the divider cannot move under
   * the reader while they are looking at it -- the same load that draws the
   * divider also advances the stored marker past it. */
  const [lastSeen] = useState<number | null>(() =>
    lastSeenAt ? new Date(lastSeenAt).getTime() : null
  );

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
        search: search || undefined,
        sortBy,
        timeFilter,
      }),
    [search, sortBy, timeFilter]
  );

  // First page whenever filters or an external reload trigger change.
  useEffect(() => {
    let cancelled = false;
    listGeneration.current += 1;
    // Re-arms the skeleton whenever the filters, group or reload trigger change, so a filter change never leaves the old posts on screen.
    setLoading(true);
    (async () => {
      // callAction, not a bare .then: a rejected fetch (deploy skew, dropped
      // network, expired session) used to leave `loading` true forever and
      // the feed stuck on skeletons with no way out (audit B-042).
      const data = await callAction(() => fetchPosts(null));
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
      /* Stamp the newest post we just showed as the marker for next visit.
       * On the ACCOUNT, not this browser, so the divider is not re-announced
       * on every other device the member is signed in on. Fire-and-forget:
       * the divider is already drawn from the value captured at mount, so
       * nothing on screen is waiting for this to come back. Only the
       * unfiltered recent feed may stamp -- a search or a "this month" filter
       * shows a slice, and letting a slice advance the marker would silently
       * bury everything the member had not actually been shown. Routed
       * through callAction too, purely so a rejection lands in the console
       * instead of surfacing as an unhandled promise rejection. */
      if (data.posts.length > 0 && sortBy === "recent" && !search && timeFilter === "all") {
        const newest = Math.max(
          ...data.posts.map((p) => new Date(p.createdAt).getTime())
        );
        void callAction(() => markFeedSeen(new Date(newest).toISOString()));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPosts, reloadKey, sortBy, search, timeFilter]);

  /* The post a notification sent them to.
   *
   * `/feed#<id>` is what every like and comment notification on a plain post
   * links to, and nothing read the fragment. PostFeed fetches its posts after
   * mount, so at the moment the router commits there is no element with that
   * id for the browser to scroll to, and the member landed at the top of the
   * feed with no idea which post was meant (bug-report-2 C-052; the repo's
   * own lab audit had already written it down, feed-2).
   *
   * An effect on `posts`, not a callback beside setPosts: React has not
   * committed the cards at the moment the state is set, so anything that
   * looks the element up before this point finds nothing. That is exactly how
   * the first attempt failed, silently, which is how the bug read too.
   *
   * Only reaches posts that are on the page. Fetching one post by id from
   * here would duplicate the letter route's whole guarded read; anything
   * older than the loaded pages still lands on a working feed, which is what
   * happened for every case before this.
   */
  const scrolledToHash = useRef<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const goToHash = useCallback(() => {
    const id = window.location.hash.slice(1);
    if (!id || scrolledToHash.current === id) return;
    const el = document.getElementById(id);
    if (!el) return;
    scrolledToHash.current = id;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("deeplink-flash");
    // Taken off once the ring has finished fading, so coming back to the same
    // post later plays it again rather than doing nothing.
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => el.classList.remove("deeplink-flash"), 2100);
  }, []);

  // Landing on /feed#<id> from somewhere else: the cards arrive after mount.
  useEffect(() => {
    if (posts.length > 0) goToHash();
  }, [posts, goToHash]);

  /* Already ON the feed when the notification is tapped. The bell navigates
     with router.push, and a push that changes only the fragment is a
     SAME-DOCUMENT navigation: nothing remounts, no effect re-runs, and the
     first version of this fix did nothing at all in the commonest case --
     which is how the bug behaved too, so it looked like it was working. */
  useEffect(() => {
    const onHash = () => {
      scrolledToHash.current = null;
      goToHash();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [goToHash]);

  // Index of the first post that is NOT newer than last-seen: the divider goes above it.
  // Only meaningful on the default recent sort and when there is genuinely new content.
  const dividerIndex =
    lastSeen !== null && sortBy === "recent" && !search
      ? posts.findIndex((p) => new Date(p.createdAt).getTime() <= lastSeen)
      : -1;
  const showDivider = dividerIndex > 0; // at least one new post above older ones

  async function handleLoadMore() {
    /* The generation this page belongs to. Change the filter, the sort or the
       search while a "Load more" is in the air and the page that comes back
       belongs to the PREVIOUS query -- it used to be appended anyway, under a
       list the member had already replaced, and its cursor adopted, so every
       later page continued the wrong query (audit Low 75). Dropping the stale
       page is the whole fix; the effect above has already loaded the new first
       page. Same shape the directory carries for M36. */
    /* A SYNCHRONOUS re-entry guard, not `disabled={loadingMore}` alone (audit
       C-180). `setLoadingMore(true)` binds on the next render, so a double tap
       -- or Enter held on a focused button -- reaches this function twice with
       the same cursor and appends the same page twice. The same reasoning M35
       records for the composer's in-flight ref. */
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const generation = listGeneration.current;
    setLoadingMore(true);
    try {
      const data = await callAction(() => fetchPosts(cursor));
      if (generation !== listGeneration.current) return;
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      /* Deduped by id on append. The guard above closes the double tap; this
         closes everything else that can hand back a row already on screen --
         a cursor row deleted between pages, a retried request that did land.
         Cheap, and the alternative is a duplicate key warning and a post the
         member sees twice. `appendUnseen` (audit C-071) is where that rule
         lives, including which copy of a repeated row to keep. */
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
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-canopy hover:text-canopy/80 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              className={`state-layer flex h-10 shrink-0 items-center gap-2 rounded-full border border-border pl-3 pr-4 text-sm font-medium transition-colors duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
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
              : "No stories yet. Be the first to share a memory."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {search
              ? "Try different keywords or clear your search."
              : "Write about your time in the valley, share an update, or post a photo."}
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
