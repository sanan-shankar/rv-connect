import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { headingTextWidth } from "@/lib/text-width";
import { batchLine, metaLine } from "@/lib/utils";
import { RailCard } from "./rail-card";

/**
 * The caption's line, and the type set on it. The rail is a fixed 318px
 * column (src/components/layout/rail-grid.ts), so this never changes with the
 * viewport: 318 less the card's two borders and its p-4, less the caption
 * block's own p-3, is 260px. The 14px and the -0.01em are the classes on the
 * <p> below, and they have to stay in step with it -- which is why they are
 * named here rather than guessed at.
 */
const CAPTION_LINE_PX = 260;
const CAPTION_SIZE_PX = 14;
const CAPTION_TRACKING_EM = -0.01;

/**
 * Two pixels of the line are not spent. Measured against the browser over
 * every caption in the archive, headingTextWidth runs 0.1px to 3.8px WIDE and
 * never more than a rounding error narrow ("Games Field", 0.04px), so this
 * covers the one direction that would show: a caption that lands within a
 * pixel of the edge and hints its way over it.
 */
const CAPTION_SLACK_PX = 2;

/**
 * How far back to look for one that fits. 24 is more than the whole approved
 * archive today, and the card wants a RECENT photograph, so a deeper search
 * would be answering a different question -- if the last two dozen
 * contributions all carry an essay for a caption, an empty rail slot is the
 * honest outcome and the same one an empty archive already produces.
 */
const CANDIDATES = 24;

/**
 * "From the Collection": the most recently approved, visible landscape photo
 * from the Valley Collection archive whose caption fits on one line. Hides
 * entirely while the archive has no approved photo yet (it currently has
 * none) rather than shipping a dark placeholder tile.
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
  const candidates = await prisma.photo.findMany({
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
    take: CANDIDATES,
    select: {
      id: true,
      thumbUrl: true,
      caption: true,
      uploader: { select: { name: true, accountType: true, batchType: true, batchYear: true } },
    },
  });

  /* WHOLE CAPTIONS ONLY. The caption gets one line and the browser cuts a
     long one off with an ellipsis, which is a card advertising that it is
     too small for what it holds (owner, 2026-09-01: "I don't want any ... in
     the from the collection. only pick photos for whom that wouldn't
     occur"). So the fit is decided here, where the photograph is chosen,
     rather than in CSS where the only move left is to truncate.

     Not a character count: 36 characters of "Senior hostel boys tunnel ball
     relay" fit with 8px to spare while 30 of "Class 12 vs Staff - Tug of
     War" nearly do not. headingTextWidth adds up the letters. It reads a
     touch WIDE (no kerning), so it errs towards passing over a photograph
     rather than towards the ellipsis, which is the direction to err in.

     A photograph with no caption at all has nothing to truncate and stays
     eligible; the card falls back to the uploader's line, as it always has. */
  const photo = candidates.find(
    (p) =>
      !p.caption ||
      headingTextWidth(p.caption, CAPTION_SIZE_PX, CAPTION_TRACKING_EM) <=
        CAPTION_LINE_PX - CAPTION_SLACK_PX
  );

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
