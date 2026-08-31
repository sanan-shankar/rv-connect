import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { batchLine, metaLine } from "@/lib/utils";
import { RailCard } from "./rail-card";

/**
 * "From the Collection": the most recently approved, visible landscape photo
 * from the Valley Collection archive. Hides entirely while the archive has no
 * approved photo yet (it currently has none) rather than shipping a dark
 * placeholder tile.
 *
 * VALLEY ONLY, and pinned by src/lib/security-regressions.test.mjs. This card
 * is rendered into every member's feed rail with no reference to who is
 * reading it, so it is the one Collection query in the app that CANNOT be
 * made class-aware safely -- an unscoped `findFirst` here would put whichever
 * class most recently uploaded a photograph in front of the entire
 * membership. Showing a member their own class's newest photograph would be a
 * nice card; it is a different component with a session in it, not a where
 * clause on this one.
 */
export async function CollectionModule() {
  const photo = await prisma.photo.findFirst({
    /* LANDSCAPE ONLY. The tile below is a fixed 150px band across the rail,
       so it asks for a photograph around 2:1; a portrait one arrives as a
       centre-cropped sliver with its subject's head and feet outside the
       card. A field reference (width > height) rather than an aspect ratio,
       because the rule is "does this shape survive the crop", not a number:
       a square is cropped just as hard here and is excluded too. If the
       archive holds no landscape photograph yet the card hides, which is the
       same thing it already does when it holds none at all. */
    where: { scope: "valley", approved: true, isHidden: false, width: { gt: prisma.photo.fields.height } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      thumbUrl: true,
      caption: true,
      uploader: { select: { name: true, accountType: true, batchType: true, batchYear: true } },
    },
  });

  if (!photo) return null;

  return (
    <RailCard label="From the Collection">
      <Link
        href={`/collection/${photo.id}`}
        className="group relative block overflow-hidden rounded-[var(--radius-md)] transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative h-[150px] w-full overflow-hidden rounded-[var(--radius-md)] bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbUrl}
            alt={photo.caption ?? "A photo from the Valley Collection"}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            {photo.caption && (
              <p className="line-clamp-1 font-heading text-[14px] leading-snug tracking-[-0.01em] text-white">
                {photo.caption}
              </p>
            )}
            <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-white/85">
              {metaLine(photo.uploader.name, batchLine(photo.uploader))}
            </p>
          </div>
        </div>
      </Link>
    </RailCard>
  );
}
