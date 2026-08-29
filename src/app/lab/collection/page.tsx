"use client";

/* ------------------------------------------------------------------ *
 *  Delight room: the Collection, with an archive in it.
 *
 *  Every component on this page is the REAL one -- <RiverControls>,
 *  <DecadeRail>, <PhotoRiver>, <ImageViewer>. Only the archive is made
 *  up, because the real one holds two photographs and both say "asdf",
 *  so nothing about this surface can be judged on /collection itself
 *  (handover F26, F33).
 *
 *  What is worth pressing: a bucket, and watch the underline glide and
 *  the river cross-fade; "Chronological" in the order menu, which turns
 *  the decades into headings you scroll past and brings up the rail;
 *  a decade on it, which SEEKS -- the grid does not empty out, it jumps
 *  to that stretch of one continuous river and scrolling either way
 *  keeps going, with nothing shifting under your eye as it does.
 *
 *  The seek and the bidirectional load are reimplemented here rather
 *  than shared with `<CollectionClient>`, and deliberately: there is no
 *  server to page against, so what stands in for it is array slicing
 *  over the 240 made-up records rather than the real opaque cursor.
 *  What is NOT reimplemented is the FEEL -- the scroll-anchored prepend
 *  and the scrollspy that lights the rail are the same shapes
 *  `collection-client.tsx` uses, because that feel is the thing this
 *  room exists to let the owner judge.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { RiverControls } from "@/components/collection/river-controls";
import { DecadeRail } from "@/components/collection/decade-rail";
import { PhotoRiver, warmThumbs } from "@/components/collection/photo-river";
import { ImageViewer, type ViewerImage } from "@/components/common/image-viewer";
import { bucketLabel } from "@/lib/collection";
import type { RiverOrder } from "@/app/(main)/collection/actions";
import { LAB_ARCHIVE, takenKeyOf } from "./_archive";

/** The real river's own page size (`PAGE_SIZE` in `collection/actions.ts`),
 *  so a scroll here takes the same number of pulls to reach the bottom. */
const PAGE_SIZE = 48;

export default function CollectionRoom() {
  const [bucket, setBucket] = useState("");
  const [order, setOrder] = useState<RiverOrder>("newest");
  const [at, setAt] = useState<number | null>(null);
  const [activeEra, setActiveEra] = useState("");

  /* The full "taken" order, sorted once per bucket -- the array a real
     cursor would be walking. Everything below is a WINDOW onto it, by
     index rather than by opaque token, which is the one thing standing in
     for the server here. */
  const takenSorted = useMemo(() => {
    const kept = LAB_ARCHIVE.filter((p) => !bucket || p.subject.includes(bucket));
    return [...kept].sort(
      (a, b) => takenKeyOf(b) - takenKeyOf(a) || b.createdAt.localeCompare(a.createdAt)
    );
  }, [bucket]);

  /* [top, bottom) into `takenSorted`. Reset to the first page whenever the
     bucket changes underneath it, same as a fresh query on the real river. */
  const [top, setTop] = useState(0);
  const [bottom, setBottom] = useState(Math.min(PAGE_SIZE, takenSorted.length));
  // Adjust-during-render, the same pattern `collection-client.tsx` uses to
  // reseed from a changed prop: a ref read during render is exactly what
  // React's own compiler now refuses to allow, `useState` is not.
  const [seenBucket, setSeenBucket] = useState(bucket);
  if (bucket !== seenBucket) {
    setSeenBucket(bucket);
    setTop(0);
    setBottom(Math.min(PAGE_SIZE, takenSorted.length));
  }

  const takenWindow = useMemo(() => takenSorted.slice(top, bottom), [takenSorted, top, bottom]);

  /* What the rail lights, DERIVED rather than stored: the scrollspy's answer
     when it has one, else the decade the top photograph belongs to. The
     fallback earns its place -- when one decade fills the whole page the
     scrollspy sits out (`useActiveBand` has nothing to compare below two
     bands), so nothing would light the rail at all. */
  const railActive = order === "taken" ? activeEra || takenWindow[0]?.era || "" : "";

  /* Every other order shows the whole filtered set at once, exactly as this
     room always has -- pagination only matters where the rail's seek lives. */
  const photos = useMemo(() => {
    if (order === "taken") return takenWindow;
    const kept = LAB_ARCHIVE.filter((p) => !bucket || p.subject.includes(bucket));
    const by = {
      newest: (a: (typeof kept)[number], b: (typeof kept)[number]) =>
        b.createdAt.localeCompare(a.createdAt),
      oldest: (a: (typeof kept)[number], b: (typeof kept)[number]) =>
        a.createdAt.localeCompare(b.createdAt),
      loved: (a: (typeof kept)[number], b: (typeof kept)[number]) => b.loveCount - a.loveCount,
    }[order as "newest" | "oldest" | "loved"];
    return [...kept].sort(by);
  }, [bucket, order, takenWindow]);

  /* Pressing a decade: the newest photograph in it is the first occurrence
     in `takenSorted`, because it is already sorted newest-first -- the same
     fact the real seek boundary (`eraSeekBoundary`) exists to compute
     without a table scan.

     The two feel decisions ride along from `collection-client.tsx`, because
     this room is where the owner judges them: the first screenful decodes
     BEFORE the swap (no tile-by-tile pop-in), and the landing is the one
     scroll position where the sticky rail does not move -- its flow offset
     equal to its stuck offset, river top 24px (top-6) below the viewport
     edge. */
  const riverTop = useRef<HTMLDivElement>(null);
  const seekTo = useCallback(
    async (era: string) => {
      const at = takenSorted.findIndex((p) => p.era === era);
      if (at < 0) return;
      await warmThumbs(takenSorted.slice(at, at + 12));
      setTop(at);
      setBottom(Math.min(at + PAGE_SIZE, takenSorted.length));
      setActiveEra(era);
      // The rail turns the river to Chronological on a press, same as the
      // real one: a decade is a position, and only this order has a spine
      // for it to be a position along.
      setOrder("taken");
      const row = riverTop.current;
      const target = row
        ? Math.max(0, Math.round(row.getBoundingClientRect().top + window.scrollY) - 24)
        : 0;
      if (window.scrollY > target) window.scrollTo({ top: target });
    },
    [takenSorted]
  );

  const more = useCallback(() => {
    setBottom((b) => Math.min(b + PAGE_SIZE, takenSorted.length));
  }, [takenSorted.length]);

  /* Climbing back up. Scroll-anchored exactly the way `collection-client.tsx`
     anchors it: measured before the DOM grows, corrected in a layout effect
     before the browser paints, so the photograph under the reader's eye does
     not move. Half-pages upward, same as the real river's UP_PAGE_SIZE: a
     chunk landing above the reader is laid out while they watch. */
  const scrollAnchor = useRef<{ height: number; top: number } | null>(null);
  const loadNewer = useCallback(() => {
    if (top === 0) return;
    const scroller = document.scrollingElement;
    if (scroller) scrollAnchor.current = { height: scroller.scrollHeight, top: scroller.scrollTop };
    setTop((t) => Math.max(0, t - PAGE_SIZE / 2));
  }, [top]);

  useLayoutEffect(() => {
    if (!scrollAnchor.current) return;
    const { height, top: prevTop } = scrollAnchor.current;
    scrollAnchor.current = null;
    const scroller = document.scrollingElement;
    if (!scroller) return;
    scroller.scrollTop = prevTop + (scroller.scrollHeight - height);
  }, [photos]);

  const head = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = head.current;
    if (!el || order !== "taken" || top === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadNewer();
      },
      { rootMargin: "1200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [order, top, loadNewer]);

  const foot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = foot.current;
    if (!el || order !== "taken" || bottom >= takenSorted.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) more();
      },
      { rootMargin: "1200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [order, bottom, takenSorted.length, more]);

  /* The rail's marks, counted under whatever bucket is on -- exactly what the
     server's grouped query does, so pressing a decade can never return an
     empty river. */
  const decades = useMemo(() => {
    const held = new Map<string, number>();
    for (const p of LAB_ARCHIVE) {
      if (bucket && !p.subject.includes(bucket)) continue;
      held.set(p.era, (held.get(p.era) ?? 0) + 1);
    }
    return [...held].map(([e, count]) => ({ era: e, count }));
  }, [bucket]);

  const images: ViewerImage[] = useMemo(
    () =>
      photos.map((p) => ({
        src: p.url,
        caption: p.caption,
        author: p.uploader,
        date: p.takenLabel,
        where: p.area,
        tags: p.subject.map(bucketLabel),
        href: `/collection/${p.id}`,
        loved: p.loved,
        loveCount: p.loveCount,
      })),
    [photos]
  );

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8">
      <Link
        href="/lab"
        className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <PeaksMark size={18} /> Lab
      </Link>

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
            The Valley Collection
          </h1>
          <p className="text-[12.5px] text-muted-foreground">
            240 photographs that do not exist
          </p>
        </div>

        <RiverControls
          bucket={bucket}
          onBucket={setBucket}
          order={order}
          onOrder={setOrder}
          markerId="lab-bucket"
        />

        <div ref={riverTop} className="mt-4 flex items-start gap-6 xl:gap-8">
          <div className="min-w-0 flex-1">
            {/* `-mb-px` cancels its own height: a sentinel at the START of
                the river must add nothing to the layout. See the note on
                the same element in `collection-client.tsx`. */}
            {order === "taken" && <div ref={head} aria-hidden className="h-px -mb-px" />}
            <PhotoRiver
              photos={photos}
              order={order}
              onOpen={setAt}
              onActiveEraChange={order === "taken" ? setActiveEra : undefined}
            />
            {order === "taken" && <div ref={foot} aria-hidden className="h-px" />}
          </div>
          <DecadeRail decades={decades} active={railActive} onSeek={seekTo} />
        </div>
      </div>

      <ImageViewer
        images={images}
        initialIndex={at ?? 0}
        open={at !== null}
        onClose={() => setAt(null)}
        showCount={false}
      />
    </div>
  );
}
