/* ------------------------------------------------------------------ *
 *  The two real Editions, as the magazine engine reads them.
 *
 *  Read-only, through the sketches' own loader, which goes through the
 *  shipped reader's `loadPublishedEditionView`: the same anonymity rule,
 *  the same measured photographs, the same resolved link cards. The
 *  owner approved real data in the rooms (handover, owner question 5);
 *  nothing here writes, and nothing here copies a member's words
 *  anywhere but this admin-only page.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { homonymLine } from "@/lib/magazine/from-export";
import type { MagazineSource } from "@/lib/magazine/types";
import { loadSketchEdition } from "../sketches/_data";
import type { SketchEdition } from "../sketches/_types";

export const LIVE_KEYS = ["live", "live-2024"] as const;
export type LiveKey = (typeof LIVE_KEYS)[number];

function sourceFromSketch(e: SketchEdition, picture: MagazineSource["picture"], sealedAt: string | null): MagazineSource {
  const line2 = homonymLine(e.questions.flatMap((q) => q.entries.map((en) => en.author)));
  return {
    catchupName: e.catchupName,
    publishedAt: e.publishedAt,
    picture,
    sealedAt,
    questions: e.questions.map((q) => ({
      id: q.id,
      text: q.text,
      kind: q.kind,
      askedBy: q.askedBy,
      anonymous: q.source === "member" && !q.showAsker,
      choices: [],
      answers: q.entries.map((en) => ({
        id: en.id,
        author: { id: en.author.id, name: en.author.name, photoUrl: en.author.photoUrl, birdOverride: en.author.birdOverride, line2: line2(en.author.id) },
        /* `text` is the body with the card links taken out, markdown kept. */
        body: en.text || null,
        photos: en.images.map((src, i) => {
          const f = en.photos[i];
          return { src, width: f?.width ?? null, height: f?.height ?? null, focalX: f?.focalX ?? 0.5, focalY: f?.focalY ?? 0.5, blurDataUrl: f?.blurDataUrl ?? null };
        }),
        links: en.media.map((m) => ({ kind: m.platform, url: m.url, title: m.title, subtitle: m.by, thumbUrl: m.art })),
        audio: null,
        pick: null,
        hearts: en.loveCount,
      })),
    })),
  };
}

/** `live` is the most-answered published Edition ("in the loop"); `live-2024`
 *  is the Batch of 2024's, the one-writer case. Null when this database
 *  does not hold it. */
export async function loadLiveSource(viewerId: string, key: LiveKey): Promise<{ title: string; source: MagazineSource } | null> {
  let editionId: string | undefined;
  if (key === "live-2024") {
    const e = await prisma.catchupEdition.findFirst({
      where: { status: "published", catchup: { group: { batchYear: 2024 } } },
      orderBy: { publishedAt: "desc" },
      select: { id: true },
    });
    if (!e) return null;
    editionId = e.id;
  }
  const sketch = await loadSketchEdition(viewerId, { editionId });
  if (!sketch) return null;
  const catchup = await prisma.catchup.findUnique({
    where: { id: sketch.catchupId },
    select: { pictureSrc: true, pictureFocus: true, editions: { where: { id: editionId ?? undefined, status: "published" }, select: { id: true, timeCapsule: true, sealedAt: true }, take: 1 } },
  });
  const ed = catchup?.editions[0];
  return {
    title: `${sketch.catchupName}, ${new Date(sketch.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}`,
    source: sourceFromSketch(
      sketch,
      catchup ? { src: catchup.pictureSrc, focus: catchup.pictureFocus } : null,
      ed?.timeCapsule && ed.sealedAt ? ed.sealedAt.toISOString() : null,
    ),
  };
}
