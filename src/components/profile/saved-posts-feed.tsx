"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { BookmarkSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { loadSavedPosts } from "@/app/(main)/feed/actions";
import { parseJsonArray } from "@/lib/utils";
import { NoSavedHoopoe } from "@/components/mascot/moments/no-saved-hoopoe";

/**
 * The owner-only "Saved" tab on a profile. Reuses the shared PostCard so hearts,
 * comments, polls and the bookmark ribbon all keep working; the only new thing is
 * that un-saving a card here removes it from the collection (auto-animate plays the
 * exit). Saved posts are private and this list is only ever the viewer's own
 * bookmarks, so it is safe even though it renders inside another person's profile
 * shell (the tab itself is gated to the owner, and the query is session-scoped).
 *
 * Layout: a balanced two-column masonry on wide screens, one column when narrow.
 * Columns are container-width driven (not viewport), so it adapts to the profile's
 * main column rather than guessing from the window.
 */

// Rough rendered-height proxy so the greedy balancer keeps the two columns even.
function estimateWeight(p: PostData): number {
  if (p.kind === "letter") return 230;
  let w = 132; // header + action row chrome
  w += Math.min(p.content.length, 900) * 0.36;
  const imgs = parseJsonArray(p.images).length;
  if (imgs > 0) w += imgs === 1 ? 300 : 224;
  if (p.poll) w += 44 + p.poll.options.length * 34;
  return w;
}

// Greedy shortest-column packing. Deterministic given the same input order, so a
// later single-item removal never reshuffles the survivors between columns.
function balance(posts: PostData[], cols: number): PostData[][] {
  const columns: PostData[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);
  for (const p of posts) {
    let target = 0;
    for (let i = 1; i < cols; i++) if (heights[i] < heights[target]) target = i;
    columns[target].push(p);
    heights[target] += estimateWeight(p);
  }
  return columns;
}

function useContainerColumns(threshold = 560) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setCols(width >= threshold ? 2 : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [threshold]);
  return { ref, cols };
}

function MasonryColumn({
  posts,
  onUnsave,
}: {
  posts: PostData[];
  onUnsave: (id: string) => void;
}) {
  const [animateRef] = useAutoAnimate();
  return (
    <div ref={animateRef} className="flex flex-col gap-[var(--space-m)]">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          variant="card"
          onBookmarkChange={(saved) => {
            if (!saved) onUnsave(post.id);
          }}
        />
      ))}
    </div>
  );
}

function SavedSkeleton({ cols }: { cols: number }) {
  // Two staggered column heights to hint the masonry before content lands.
  const shapes = cols === 2 ? [[190, 132, 240], [270, 160, 132]] : [[190, 240, 150]];
  return (
    <div
      className={`grid items-start gap-[var(--space-m)] ${
        cols === 2 ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {shapes.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[var(--space-m)]">
          {col.map((h, i) => (
            <div
              key={i}
              className="skeleton-warm rounded-[var(--radius)]"
              style={{ height: h }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SavedPostsFeed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { ref, cols } = useContainerColumns();
  const bookmarkRef = useRef<HTMLDivElement>(null);

  // Mount-once fetch. `loading` already starts true, so re-arming it
  // synchronously here only bought a cascading render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // callAction: a rejected fetch (deploy skew, dropped network, expired
      // session) used to leave `loading` true forever, so the tab stuck on
      // its skeleton with no way out (audit B-042).
      const data = await callAction(() => loadSavedPosts());
      if (cancelled) return;
      if ("error" in data) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setPosts(data.posts as PostData[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Balance is computed from the stable loaded set; removed ids are filtered at
  // render so un-saving one card never reshuffles the others between columns.
  const columns = useMemo(() => balance(posts, cols), [posts, cols]);
  const visible = columns.map((col) => col.filter((p) => !removed.has(p.id)));
  const visibleCount = posts.length - posts.filter((p) => removed.has(p.id)).length;

  function handleUnsave(id: string) {
    setRemoved((prev) => new Set(prev).add(id));
    toast("Removed from saved");
  }

  if (loading) {
    return (
      <div ref={ref}>
        <SavedSkeleton cols={cols} />
      </div>
    );
  }

  if (visibleCount === 0) {
    return (
      <div ref={ref}>
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card px-6 py-12 text-center">
          <div className="mb-[var(--space-m)] flex items-end justify-center gap-1">
            <div
              ref={bookmarkRef}
              className="grid h-16 w-16 place-items-center rounded-full bg-cinnamon/10 text-cinnamon"
            >
              <BookmarkSimple size={30} weight="duotone" />
            </div>
            {/* The hoopoe sits by the empty bookmark: the quiet valley touch. */}
            <NoSavedHoopoe bookmarkRef={bookmarkRef} size={60} />
          </div>
          <p className="font-heading text-lg tracking-tight text-foreground">
            Nothing saved yet
          </p>
          <p className="mx-auto mt-[var(--space-xs)] max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            Tap the ribbon on any post to keep it here for later. Everything you save
            stays private to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-[var(--space-m)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          {visibleCount} {visibleCount === 1 ? "saved post" : "saved posts"}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cinnamon/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-cinnamon">
          <BookmarkSimple size={12} weight="fill" />
          Private to you
        </span>
      </div>

      <div
        className={`grid items-start gap-[var(--space-m)] ${
          cols === 2 ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {visible.map((col, i) => (
          <MasonryColumn key={i} posts={col} onUnsave={handleUnsave} />
        ))}
      </div>
    </div>
  );
}
