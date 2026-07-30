import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { batchLine, metaLine } from "@/lib/utils";
import { RailCard } from "./rail-card";

/**
 * "From the Collection": the most recently approved, visible photo from the
 * Valley Collection archive. Hides entirely while the archive has no
 * approved photo yet (it currently has none) rather than shipping a dark
 * placeholder tile.
 */
export async function CollectionModule() {
  const photo = await prisma.photo.findFirst({
    where: { approved: true, isHidden: false },
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
        className="group relative block overflow-hidden rounded-[var(--radius-md)] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
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
