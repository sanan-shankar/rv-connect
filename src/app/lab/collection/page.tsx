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
 *  the river cross-fade; a decade on the right-hand rail, whose marks
 *  are how many photographs each decade holds; "Chronological" in the
 *  order menu, which turns the decades into headings you scroll past.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { RiverControls } from "@/components/collection/river-controls";
import { DecadeRail, DecadeStrip } from "@/components/collection/decade-rail";
import { PhotoRiver } from "@/components/collection/photo-river";
import { ImageViewer, type ViewerImage } from "@/components/common/image-viewer";
import { bucketLabel } from "@/lib/collection";
import type { RiverOrder } from "@/app/(main)/collection/actions";
import { LAB_ARCHIVE, takenKeyOf } from "./_archive";

export default function CollectionRoom() {
  const [bucket, setBucket] = useState("");
  const [era, setEra] = useState("");
  const [order, setOrder] = useState<RiverOrder>("newest");
  const [at, setAt] = useState<number | null>(null);

  /* The same three filters and four orders the server applies, done here in
     memory. It is the one thing in this room that is a stand-in, and it is a
     stand-in for a `where` clause rather than for anything you can see. */
  const photos = useMemo(() => {
    const kept = LAB_ARCHIVE.filter(
      (p) => (!bucket || p.subject.includes(bucket)) && (!era || p.era === era)
    );
    const by = {
      newest: (a: (typeof kept)[number], b: (typeof kept)[number]) =>
        b.createdAt.localeCompare(a.createdAt),
      oldest: (a: (typeof kept)[number], b: (typeof kept)[number]) =>
        a.createdAt.localeCompare(b.createdAt),
      taken: (a: (typeof kept)[number], b: (typeof kept)[number]) =>
        takenKeyOf(b) - takenKeyOf(a) || b.createdAt.localeCompare(a.createdAt),
      loved: (a: (typeof kept)[number], b: (typeof kept)[number]) => b.loveCount - a.loveCount,
    }[order];
    return [...kept].sort(by);
  }, [bucket, era, order]);

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
          total={photos.length}
          markerId="lab-bucket"
        />
        <DecadeStrip decades={decades} value={era} onChange={setEra} className="mt-1" />

        <div className="mt-4 flex items-start gap-6 xl:gap-8">
          <div className="min-w-0 flex-1">
            <PhotoRiver photos={photos} order={order} onOpen={setAt} />
          </div>
          <DecadeRail decades={decades} value={era} onChange={setEra} />
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
